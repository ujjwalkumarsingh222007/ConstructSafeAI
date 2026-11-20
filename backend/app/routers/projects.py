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
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectOut,
    ProjectListResponse,
    UserSummary,
    ProjectLocationSchema,
)

router = APIRouter(prefix="/projects", tags=["Projects"])

def validate_object_id(id_str: str, entity_name: str = "Resource") -> ObjectId:
    if not id_str or not ObjectId.is_valid(id_str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {entity_name} ID format: '{id_str}'"
        )
    return ObjectId(id_str)

def get_role_scoped_project_filter(current_user: UserDocument) -> dict:
    base = {"deleted_at": None}
    role = current_user.role_name

    if role == "admin":
        return base

    user_oid = current_user.id
    assigned_oids = [ObjectId(str(p)) for p in current_user.assigned_project_ids if ObjectId.is_valid(str(p))]

    if role == "project_manager":
        return {
            **base,
            "$or": [
                {"_id": {"$in": assigned_oids}},
                {"manager_ids": user_oid}
            ]
        }
    elif role == "safety_inspector":
        return {
            **base,
            "$or": [
                {"_id": {"$in": assigned_oids}},
                {"inspector_ids": user_oid}
            ]
        }
    elif role == "client":
        return {
            **base,
            "$or": [
                {"_id": {"$in": assigned_oids}},
                {"client_id": user_oid}
            ]
        }
    elif role == "worker":
        return {
            **base,
            "_id": {"$in": assigned_oids}
        }
    return {**base, "_id": {"$in": []}}

async def populate_project_details(db: AsyncDatabase, doc: dict) -> ProjectOut:
    manager_oids = [ObjectId(str(m)) for m in doc.get("manager_ids", []) if ObjectId.is_valid(str(m))]
    inspector_oids = [ObjectId(str(i)) for i in doc.get("inspector_ids", []) if ObjectId.is_valid(str(i))]

    managers = []
    if manager_oids:
        cursor = db.users.find({"_id": {"$in": manager_oids}, "deleted_at": None})
        async for u in cursor:
            managers.append(UserSummary(
                id=str(u["_id"]),
                first_name=u.get("first_name", ""),
                last_name=u.get("last_name", ""),
                email=u.get("email", ""),
                role_name=u.get("role_name", "")
            ))

    inspectors = []
    if inspector_oids:
        cursor = db.users.find({"_id": {"$in": inspector_oids}, "deleted_at": None})
        async for u in cursor:
            inspectors.append(UserSummary(
                id=str(u["_id"]),
                first_name=u.get("first_name", ""),
                last_name=u.get("last_name", ""),
                email=u.get("email", ""),
                role_name=u.get("role_name", "")
            ))

    # Count active workers assigned to this project
    worker_count = await db.workers.count_documents({
        "deleted_at": None,
        "$or": [
            {"current_project_id": doc["_id"]},
            {"assigned_project_ids": doc["_id"]}
        ]
    })

    loc = doc.get("location") or {}
    location_schema = ProjectLocationSchema(
        address=loc.get("address"),
        city=loc.get("city"),
        state=loc.get("state"),
        country=loc.get("country", "US"),
        latitude=loc.get("latitude"),
        longitude=loc.get("longitude")
    )

    return ProjectOut(
        id=str(doc["_id"]),
        code=doc.get("code", ""),
        name=doc.get("name", ""),
        client_name=doc.get("client_name", ""),
        client_id=str(doc["client_id"]) if doc.get("client_id") else None,
        description=doc.get("description"),
        location=location_schema,
        status=doc.get("status", "active"),
        start_date=doc.get("start_date"),
        expected_completion_date=doc.get("expected_completion_date") or doc.get("estimated_end_date"),
        manager_ids=[str(m) for m in manager_oids],
        inspector_ids=[str(i) for i in inspector_oids],
        managers=managers,
        inspectors=inspectors,
        worker_count=worker_count,
        safety_target_rate=doc.get("safety_target_rate", 95.0),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc))
    )

@router.get("", response_model=ProjectListResponse)
async def list_projects(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status")
):
    """List projects accessible to the current authenticated role with search, filters, and pagination."""
    query = get_role_scoped_project_filter(current_user)

    if status_filter and status_filter.strip():
        query["status"] = status_filter.strip().lower()

    if search and search.strip():
        escaped = re.escape(search.strip())
        pattern = {"$regex": escaped, "$options": "i"}
        search_condition = {"$or": [
            {"name": pattern},
            {"code": pattern},
            {"client_name": pattern},
            {"location.city": pattern}
        ]}
        if "$or" in query:
            query = {"$and": [query, search_condition]}
        else:
            query.update(search_condition)

    total = await db.projects.count_documents(query)
    pages = math.ceil(total / size) if total > 0 else 1
    skip = (page - 1) * size

    cursor = db.projects.find(query).sort("created_at", -1).skip(skip).limit(size)
    items: List[ProjectOut] = []
    async for doc in cursor:
        items.append(await populate_project_details(db, doc))

    return ProjectListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    current_user: Annotated[UserDocument, Depends(require_roles("admin"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Create a new construction project (Admin only)."""
    clean_code = project_in.code.strip().upper()

    # Check unique code
    existing = await db.projects.find_one({"code": clean_code, "deleted_at": None})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project with code '{clean_code}' already exists"
        )

    # Validate manager and inspector ObjectIds
    manager_oids = [validate_object_id(m, "Manager") for m in project_in.manager_ids]
    inspector_oids = [validate_object_id(i, "Inspector") for i in project_in.inspector_ids]
    client_oid = validate_object_id(project_in.client_id, "Client") if project_in.client_id else None

    now = datetime.now(timezone.utc)
    new_project_id = ObjectId()

    doc = {
        "_id": new_project_id,
        "code": clean_code,
        "name": project_in.name.strip(),
        "client_name": project_in.client_name.strip(),
        "client_id": client_oid,
        "description": project_in.description,
        "location": project_in.location.model_dump() if project_in.location else {},
        "status": project_in.status.lower(),
        "start_date": project_in.start_date,
        "expected_completion_date": project_in.expected_completion_date,
        "estimated_end_date": project_in.expected_completion_date,
        "manager_ids": manager_oids,
        "inspector_ids": inspector_oids,
        "safety_target_rate": project_in.safety_target_rate,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None
    }

    try:
        await db.projects.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project with code '{clean_code}' already exists"
        )

    # Update assigned users' assigned_project_ids and create assignments
    all_assigned_users = [(m, "project_manager") for m in manager_oids] + [(i, "safety_inspector") for i in inspector_oids]
    if client_oid:
        all_assigned_users.append((client_oid, "client"))

    for u_oid, role_in_proj in all_assigned_users:
        await db.users.update_one(
            {"_id": u_oid},
            {"$addToSet": {"assigned_project_ids": new_project_id}}
        )
        await db.project_assignments.insert_one({
            "_id": ObjectId(),
            "project_id": new_project_id,
            "user_id": u_oid,
            "worker_id": None,
            "role_in_project": role_in_proj,
            "assigned_at": now,
            "assigned_by": current_user.id,
            "is_active": True
        })

    created = await db.projects.find_one({"_id": new_project_id})
    return await populate_project_details(db, created)

@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Retrieve details for a specific project with RBAC boundary enforcement."""
    p_oid = validate_object_id(project_id, "Project")

    doc = await db.projects.find_one({"_id": p_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found"
        )

    # Check permission boundary for non-admin
    role = current_user.role_name
    if role != "admin":
        user_assigned = [str(p) for p in current_user.assigned_project_ids]
        is_manager = current_user.id in doc.get("manager_ids", [])
        is_inspector = current_user.id in doc.get("inspector_ids", [])
        is_client = doc.get("client_id") == current_user.id or current_user.email == doc.get("client_name")

        if project_id not in user_assigned and not is_manager and not is_inspector and not is_client:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view this project"
            )

    return await populate_project_details(db, doc)

@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "project_manager"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Update project details (Admin or assigned Project Manager)."""
    p_oid = validate_object_id(project_id, "Project")

    existing = await db.projects.find_one({"_id": p_oid, "deleted_at": None})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found"
        )

    # If PM, ensure PM is assigned to this project
    if current_user.role_name == "project_manager":
        assigned_strs = [str(p) for p in current_user.assigned_project_ids]
        is_manager = current_user.id in existing.get("manager_ids", [])
        if project_id not in assigned_strs and not is_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Project Managers may only modify projects to which they are assigned"
            )

    update_fields = {}
    now = datetime.now(timezone.utc)

    if project_in.name is not None:
        update_fields["name"] = project_in.name.strip()
    if project_in.code is not None:
        clean_code = project_in.code.strip().upper()
        if clean_code != existing.get("code"):
            dup = await db.projects.find_one({"code": clean_code, "_id": {"$ne": p_oid}, "deleted_at": None})
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Project code '{clean_code}' is already used by another project"
                )
            update_fields["code"] = clean_code
    if project_in.client_name is not None:
        update_fields["client_name"] = project_in.client_name.strip()
    if project_in.client_id is not None:
        update_fields["client_id"] = validate_object_id(project_in.client_id, "Client") if project_in.client_id else None
    if project_in.description is not None:
        update_fields["description"] = project_in.description
    if project_in.location is not None:
        update_fields["location"] = project_in.location.model_dump()
    if project_in.status is not None:
        update_fields["status"] = project_in.status.lower()
    if project_in.start_date is not None:
        update_fields["start_date"] = project_in.start_date
    if project_in.expected_completion_date is not None:
        update_fields["expected_completion_date"] = project_in.expected_completion_date
        update_fields["estimated_end_date"] = project_in.expected_completion_date
    if project_in.safety_target_rate is not None:
        update_fields["safety_target_rate"] = project_in.safety_target_rate

    # Role reassignment restricted to Admin
    if project_in.manager_ids is not None:
        if current_user.role_name != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Administrators may reassign Project Managers"
            )
        mgr_oids = [validate_object_id(m, "Manager") for m in project_in.manager_ids]
        update_fields["manager_ids"] = mgr_oids
        for m in mgr_oids:
            await db.users.update_one({"_id": m}, {"$addToSet": {"assigned_project_ids": p_oid}})

    if project_in.inspector_ids is not None:
        if current_user.role_name != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Administrators may reassign Safety Inspectors"
            )
        insp_oids = [validate_object_id(i, "Inspector") for i in project_in.inspector_ids]
        update_fields["inspector_ids"] = insp_oids
        for i in insp_oids:
            await db.users.update_one({"_id": i}, {"$addToSet": {"assigned_project_ids": p_oid}})

    if update_fields:
        update_fields["updated_at"] = now
        await db.projects.update_one({"_id": p_oid}, {"$set": update_fields})

    updated = await db.projects.find_one({"_id": p_oid})
    return await populate_project_details(db, updated)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: Annotated[UserDocument, Depends(require_roles("admin"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Archive (soft-delete) a project (Admin only)."""
    p_oid = validate_object_id(project_id, "Project")

    doc = await db.projects.find_one({"_id": p_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found"
        )

    now = datetime.now(timezone.utc)
    await db.projects.update_one(
        {"_id": p_oid},
        {"$set": {"deleted_at": now, "status": "archived", "updated_at": now}}
    )
    return None
