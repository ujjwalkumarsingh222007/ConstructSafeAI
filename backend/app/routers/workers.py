import re
import math
from datetime import datetime, timezone
from typing import Annotated, Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.mongodb import UserDocument
from app.schemas.worker import (
    WorkerCreate,
    WorkerUpdate,
    WorkerOut,
    WorkerListResponse,
    ProjectMiniOut,
    EmergencyContactSchema,
)

router = APIRouter(prefix="/workers", tags=["Workers"])

def validate_object_id(id_str: str, entity_name: str = "Resource") -> ObjectId:
    if not id_str or not ObjectId.is_valid(id_str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {entity_name} ID format: '{id_str}'"
        )
    return ObjectId(id_str)

async def populate_worker_details(db: AsyncDatabase, doc: dict) -> WorkerOut:
    all_proj_ids = set()
    if doc.get("current_project_id") and ObjectId.is_valid(str(doc["current_project_id"])):
        all_proj_ids.add(ObjectId(str(doc["current_project_id"])))
    for p in doc.get("assigned_project_ids", []):
        if ObjectId.is_valid(str(p)):
            all_proj_ids.add(ObjectId(str(p)))

    assigned_projects: List[ProjectMiniOut] = []
    if all_proj_ids:
        cursor = db.projects.find({"_id": {"$in": list(all_proj_ids)}, "deleted_at": None})
        async for p in cursor:
            assigned_projects.append(ProjectMiniOut(
                id=str(p["_id"]),
                name=p.get("name", ""),
                code=p.get("code", "")
            ))

    em_data = doc.get("emergency_contact") or {}
    em_schema = EmergencyContactSchema(
        name=em_data.get("name"),
        relation=em_data.get("relation") or em_data.get("relationship"),
        phone=em_data.get("phone")
    ) if em_data else None

    first = doc.get("first_name", "")
    last = doc.get("last_name", "")

    return WorkerOut(
        id=str(doc["_id"]),
        employee_id=doc.get("employee_id", ""),
        user_id=str(doc["user_id"]) if doc.get("user_id") else None,
        first_name=first,
        last_name=last,
        full_name=f"{first} {last}".strip(),
        email=doc.get("email"),
        phone=doc.get("phone"),
        profile_photo=doc.get("profile_photo"),
        designation=doc.get("designation") or doc.get("trade", "General Labor"),
        trade=doc.get("trade", "General Labor"),
        contractor_company=doc.get("contractor_company", "ConstructSafe Direct"),
        current_project_id=str(doc["current_project_id"]) if doc.get("current_project_id") else None,
        assigned_project_ids=[str(p) for p in doc.get("assigned_project_ids", [])],
        assigned_projects=assigned_projects,
        joining_date=doc.get("joining_date"),
        emergency_contact=em_schema,
        status=doc.get("status", "active"),
        training_status=doc.get("training_status", "certified"),
        training_records=doc.get("training_records", []),
        safety_induction_completed=doc.get("safety_induction_completed", True),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc))
    )

def get_role_scoped_worker_filter(current_user: UserDocument) -> dict:
    role = current_user.role_name
    base = {"deleted_at": None}

    if role == "admin":
        return base

    if role in ("project_manager", "safety_inspector"):
        assigned_oids = [ObjectId(str(p)) for p in current_user.assigned_project_ids if ObjectId.is_valid(str(p))]
        return {
            **base,
            "$or": [
                {"current_project_id": {"$in": assigned_oids}},
                {"assigned_project_ids": {"$in": assigned_oids}}
            ]
        }

    # Worker and Client cannot browse workers directory
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Access denied: Role '{role}' is not authorized to browse the worker directory"
    )

@router.get("", response_model=WorkerListResponse)
async def list_workers(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    trade: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    project_id: Optional[str] = Query(default=None)
):
    """List workers with filters, search, and strict RBAC project boundary enforcement."""
    query = get_role_scoped_worker_filter(current_user)

    if trade and trade.strip():
        query["trade"] = {"$regex": f"^{re.escape(trade.strip())}$", "$options": "i"}

    if status_filter and status_filter.strip():
        query["status"] = status_filter.strip().lower()

    if project_id and project_id.strip():
        p_oid = validate_object_id(project_id.strip(), "Project")
        proj_filter = {
            "$or": [
                {"current_project_id": p_oid},
                {"assigned_project_ids": p_oid}
            ]
        }
        if "$or" in query:
            query = {"$and": [query, proj_filter]}
        else:
            query.update(proj_filter)

    if search and search.strip():
        escaped = re.escape(search.strip())
        pattern = {"$regex": escaped, "$options": "i"}
        search_filter = {
            "$or": [
                {"first_name": pattern},
                {"last_name": pattern},
                {"employee_id": pattern},
                {"trade": pattern},
                {"contractor_company": pattern},
                {"phone": pattern}
            ]
        }
        if "$and" in query:
            query["$and"].append(search_filter)
        elif "$or" in query:
            query = {"$and": [query, search_filter]}
        else:
            query.update(search_filter)

    total = await db.workers.count_documents(query)
    pages = math.ceil(total / size) if total > 0 else 1
    skip = (page - 1) * size

    cursor = db.workers.find(query).sort("created_at", -1).skip(skip).limit(size)
    items: List[WorkerOut] = []
    async for doc in cursor:
        items.append(await populate_worker_details(db, doc))

    return WorkerListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/me", response_model=WorkerOut)
async def get_my_worker_profile(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Retrieve personal worker profile for the authenticated worker."""
    doc = await db.workers.find_one({
        "$or": [
            {"user_id": current_user.id},
            {"email": current_user.email}
        ],
        "deleted_at": None
    })

    if not doc:
        # Check if worker exists with matching name
        doc = await db.workers.find_one({
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "deleted_at": None
        })

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No worker profile found associated with your user account"
        )

    return await populate_worker_details(db, doc)

@router.post("", response_model=WorkerOut, status_code=status.HTTP_201_CREATED)
async def create_worker(
    worker_in: WorkerCreate,
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "project_manager"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Add a new worker into the directory (Admin or Project Manager)."""
    clean_emp_id = worker_in.employee_id.strip().upper()

    # Check unique badge ID
    existing = await db.workers.find_one({"employee_id": clean_emp_id, "deleted_at": None})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Worker with Employee ID '{clean_emp_id}' already exists"
        )

    # Process project associations
    curr_proj_oid = validate_object_id(worker_in.current_project_id, "Current Project") if worker_in.current_project_id else None
    assigned_oids = [validate_object_id(p, "Assigned Project") for p in worker_in.assigned_project_ids]
    if curr_proj_oid and curr_proj_oid not in assigned_oids:
        assigned_oids.append(curr_proj_oid)

    # If PM, verify PM is assigned to these projects
    if current_user.role_name == "project_manager":
        pm_projects = {str(p) for p in current_user.assigned_project_ids}
        for p_oid in assigned_oids:
            if str(p_oid) not in pm_projects:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: You may only assign workers to projects you manage"
                )

    user_oid = validate_object_id(worker_in.user_id, "User") if worker_in.user_id else None

    now = datetime.now(timezone.utc)
    new_worker_id = ObjectId()

    doc = {
        "_id": new_worker_id,
        "employee_id": clean_emp_id,
        "user_id": user_oid,
        "first_name": worker_in.first_name.strip(),
        "last_name": worker_in.last_name.strip(),
        "email": worker_in.email.strip().lower() if worker_in.email else None,
        "phone": worker_in.phone.strip() if worker_in.phone else None,
        "profile_photo": worker_in.profile_photo,
        "designation": worker_in.designation or worker_in.trade,
        "trade": worker_in.trade.strip(),
        "contractor_company": worker_in.contractor_company or "ConstructSafe Direct",
        "current_project_id": curr_proj_oid,
        "assigned_project_ids": assigned_oids,
        "joining_date": worker_in.joining_date or now,
        "emergency_contact": worker_in.emergency_contact.model_dump() if worker_in.emergency_contact else None,
        "status": worker_in.status.lower(),
        "training_status": worker_in.training_status.lower(),
        "training_records": worker_in.training_records or [],
        "safety_induction_completed": worker_in.safety_induction_completed,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None
    }

    try:
        await db.workers.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Worker with Employee ID '{clean_emp_id}' already exists"
        )

    # Create project assignments
    for p_oid in assigned_oids:
        await db.project_assignments.insert_one({
            "_id": ObjectId(),
            "project_id": p_oid,
            "worker_id": new_worker_id,
            "user_id": None,
            "role_in_project": "worker",
            "assigned_at": now,
            "assigned_by": current_user.id,
            "is_active": True
        })

    created = await db.workers.find_one({"_id": new_worker_id})
    return await populate_worker_details(db, created)

@router.get("/me", response_model=WorkerOut)
async def get_my_worker_profile(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """View the worker profile of the currently logged-in user."""
    doc = await db.workers.find_one({
        "$or": [{"user_id": current_user.id}, {"email": current_user.email.lower()}],
        "deleted_at": None
    })
    if not doc:
        now = datetime.now(timezone.utc)
        emp_code = f"EMP-{str(current_user.id)[-6:].upper()}"
        default_doc = {
            "_id": ObjectId(),
            "employee_id": emp_code,
            "user_id": current_user.id,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "email": current_user.email,
            "phone": current_user.phone or "+1-555-0100",
            "designation": current_user.role_name.replace('_', ' ').title(),
            "trade": "General Operations",
            "contractor_company": "ConstructSafe Enterprise",
            "current_project_id": current_user.assigned_project_ids[0] if current_user.assigned_project_ids else None,
            "assigned_project_ids": current_user.assigned_project_ids,
            "emergency_contact": {"name": "Site Emergency Contact", "relation": "Supervisor", "phone": "+1-555-0911"},
            "status": "active",
            "training_status": "certified",
            "training_records": [{"course_name": "Site Safety Induction", "completion_date": now.strftime("%Y-%m-%d"), "expiry_date": "2027-12-31", "certificate_number": "CERT-IND-01", "status": "valid"}],
            "safety_induction_completed": True,
            "created_at": now,
            "updated_at": now,
            "deleted_at": None
        }
        await db.workers.insert_one(default_doc)
        doc = default_doc

    return await populate_worker_details(db, doc)

@router.get("/{worker_id}", response_model=WorkerOut)
async def get_worker(
    worker_id: str,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """View detailed profile of a specific worker with authorization checking."""
    w_oid = validate_object_id(worker_id, "Worker")

    doc = await db.workers.find_one({"_id": w_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worker with ID '{worker_id}' was not found"
        )

    role = current_user.role_name
    if role == "admin":
        pass
    elif role == "worker":
        # Worker can only view self
        is_self = (doc.get("user_id") == current_user.id) or (doc.get("email") == current_user.email)
        if not is_self:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Workers may only view their own profile"
            )
    elif role in ("project_manager", "safety_inspector"):
        # PM or Inspector can view if worker shares an assigned project
        user_proj_set = {str(p) for p in current_user.assigned_project_ids}
        worker_proj_set = {str(p) for p in doc.get("assigned_project_ids", [])}
        if doc.get("current_project_id"):
            worker_proj_set.add(str(doc["current_project_id"]))

        if not user_proj_set.intersection(worker_proj_set):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Worker is not assigned to any projects under your supervision"
            )
    else:
        # Client cannot view worker profile
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{role}' is not authorized to view worker profiles"
        )

    return await populate_worker_details(db, doc)

@router.patch("/{worker_id}", response_model=WorkerOut)
async def update_worker(
    worker_id: str,
    worker_in: WorkerUpdate,
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "project_manager"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Edit worker details and assignment (Admin or Project Manager)."""
    w_oid = validate_object_id(worker_id, "Worker")

    existing = await db.workers.find_one({"_id": w_oid, "deleted_at": None})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worker with ID '{worker_id}' was not found"
        )

    # Check PM boundary
    if current_user.role_name == "project_manager":
        pm_projs = {str(p) for p in current_user.assigned_project_ids}
        worker_projs = {str(p) for p in existing.get("assigned_project_ids", [])}
        if existing.get("current_project_id"):
            worker_projs.add(str(existing["current_project_id"]))

        if not pm_projs.intersection(worker_projs):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You may only modify workers assigned to your projects"
            )

    update_fields = {}
    now = datetime.now(timezone.utc)

    if worker_in.employee_id is not None:
        clean_code = worker_in.employee_id.strip().upper()
        if clean_code != existing.get("employee_id"):
            dup = await db.workers.find_one({"employee_id": clean_code, "_id": {"$ne": w_oid}, "deleted_at": None})
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Employee ID '{clean_code}' is already assigned to another worker"
                )
            update_fields["employee_id"] = clean_code

    if worker_in.first_name is not None:
        update_fields["first_name"] = worker_in.first_name.strip()
    if worker_in.last_name is not None:
        update_fields["last_name"] = worker_in.last_name.strip()
    if worker_in.email is not None:
        update_fields["email"] = worker_in.email.strip().lower() if worker_in.email else None
    if worker_in.phone is not None:
        update_fields["phone"] = worker_in.phone.strip() if worker_in.phone else None
    if worker_in.profile_photo is not None:
        update_fields["profile_photo"] = worker_in.profile_photo
    if worker_in.designation is not None:
        update_fields["designation"] = worker_in.designation.strip()
    if worker_in.trade is not None:
        update_fields["trade"] = worker_in.trade.strip()
    if worker_in.contractor_company is not None:
        update_fields["contractor_company"] = worker_in.contractor_company.strip()
    if worker_in.current_project_id is not None:
        update_fields["current_project_id"] = validate_object_id(worker_in.current_project_id, "Current Project") if worker_in.current_project_id else None
    if worker_in.assigned_project_ids is not None:
        update_fields["assigned_project_ids"] = [validate_object_id(p, "Project") for p in worker_in.assigned_project_ids]
    if worker_in.joining_date is not None:
        update_fields["joining_date"] = worker_in.joining_date
    if worker_in.emergency_contact is not None:
        update_fields["emergency_contact"] = worker_in.emergency_contact.model_dump()
    if worker_in.status is not None:
        update_fields["status"] = worker_in.status.lower()
    if worker_in.training_status is not None:
        update_fields["training_status"] = worker_in.training_status.lower()
    if worker_in.training_records is not None:
        update_fields["training_records"] = worker_in.training_records
    if worker_in.safety_induction_completed is not None:
        update_fields["safety_induction_completed"] = worker_in.safety_induction_completed

    if update_fields:
        update_fields["updated_at"] = now
        await db.workers.update_one({"_id": w_oid}, {"$set": update_fields})

    updated = await db.workers.find_one({"_id": w_oid})
    return await populate_worker_details(db, updated)

@router.delete("/{worker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_worker(
    worker_id: str,
    current_user: Annotated[UserDocument, Depends(require_roles("admin"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Soft-delete worker from active workforce (Admin only)."""
    w_oid = validate_object_id(worker_id, "Worker")

    doc = await db.workers.find_one({"_id": w_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worker with ID '{worker_id}' was not found"
        )

    now = datetime.now(timezone.utc)
    await db.workers.update_one(
        {"_id": w_oid},
        {"$set": {"deleted_at": now, "status": "terminated", "updated_at": now}}
    )
    # Deactivate any assignments
    await db.project_assignments.update_many(
        {"worker_id": w_oid},
        {"$set": {"is_active": False}}
    )
    return None
