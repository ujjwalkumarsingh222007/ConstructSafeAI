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
from app.core.notifications import notify_inspection_assigned
from app.models.mongodb import UserDocument
from app.schemas.inspection import (
    InspectionCreate,
    InspectionUpdate,
    InspectionOut,
    InspectionListResponse,
    InspectionItemSchema,
)

router = APIRouter(prefix="/inspections", tags=["Safety Inspections"])

def validate_object_id(id_str: str, entity_name: str = "Resource") -> ObjectId:
    if not id_str or not ObjectId.is_valid(id_str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {entity_name} ID format: '{id_str}'"
        )
    return ObjectId(id_str)

async def generate_inspection_number(db: AsyncDatabase) -> str:
    year = datetime.now().year
    prefix = f"INS-{year}-"
    count = await db.inspections.count_documents({"inspection_number": {"$regex": f"^{prefix}"}})
    return f"{prefix}{count + 1:04d}"

def calculate_score(items: List[dict]) -> Optional[float]:
    scorable = [it for it in items if it.get("status") in ("pass", "fail")]
    if not scorable:
        return None
    passed = sum(1 for it in scorable if it.get("status") == "pass")
    return round((passed / len(scorable)) * 100.0, 1)

async def populate_inspection(db: AsyncDatabase, doc: dict) -> InspectionOut:
    project_name = None
    project_code = None
    if doc.get("project_id"):
        proj = await db.projects.find_one({"_id": doc["project_id"]})
        if proj:
            project_name = proj.get("name")
            project_code = proj.get("code")

    inspector_name = None
    if doc.get("inspector_id"):
        u = await db.users.find_one({"_id": doc["inspector_id"]})
        if u:
            inspector_name = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()

    items = [
        InspectionItemSchema(
            item_id=it.get("item_id", ""),
            category=it.get("category", ""),
            description=it.get("description", ""),
            status=it.get("status", "pass"),
            notes=it.get("notes"),
            photos=it.get("photos", [])
        )
        for it in doc.get("checklist_items", [])
    ]

    return InspectionOut(
        id=str(doc["_id"]),
        inspection_number=doc.get("inspection_number", ""),
        title=doc.get("title", ""),
        project_id=str(doc["project_id"]),
        project_name=project_name,
        project_code=project_code,
        inspector_id=str(doc["inspector_id"]),
        inspector_name=inspector_name,
        scheduled_date=doc.get("scheduled_date", datetime.now(timezone.utc)),
        completed_at=doc.get("completed_at"),
        status=doc.get("status", "scheduled"),
        checklist_items=items,
        overall_score=doc.get("overall_score"),
        notes=doc.get("notes"),
        photographs=doc.get("photographs", []),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc))
    )

def get_role_scoped_inspection_filter(current_user: UserDocument) -> dict:
    role = current_user.role_name
    base = {"deleted_at": None}

    if role == "admin":
        return base

    assigned_oids = [ObjectId(str(p)) for p in current_user.assigned_project_ids if ObjectId.is_valid(str(p))]

    if role == "project_manager":
        return {**base, "project_id": {"$in": assigned_oids}}
    elif role == "safety_inspector":
        return {
            **base,
            "$or": [
                {"project_id": {"$in": assigned_oids}},
                {"inspector_id": current_user.id}
            ]
        }
    elif role == "client":
        return {**base, "project_id": {"$in": assigned_oids}}
    elif role == "worker":
        # Workers can only view completed inspections on their site
        return {**base, "project_id": {"$in": assigned_oids}, "status": "completed"}
    return {**base, "_id": {"$in": []}}

@router.get("", response_model=InspectionListResponse)
async def list_inspections(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    project_id: Optional[str] = Query(default=None),
    inspector_id: Optional[str] = Query(default=None)
):
    """List safety inspections accessible to the authenticated role."""
    query = get_role_scoped_inspection_filter(current_user)

    if status_filter and status_filter.strip():
        query["status"] = status_filter.strip().lower()

    if project_id and project_id.strip():
        p_oid = validate_object_id(project_id.strip(), "Project")
        query["project_id"] = p_oid

    if inspector_id and inspector_id.strip():
        i_oid = validate_object_id(inspector_id.strip(), "Inspector")
        query["inspector_id"] = i_oid

    if search and search.strip():
        escaped = re.escape(search.strip())
        query["$or"] = [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"inspection_number": {"$regex": escaped, "$options": "i"}}
        ]

    total = await db.inspections.count_documents(query)
    pages = math.ceil(total / size) if total > 0 else 1
    skip = (page - 1) * size

    cursor = db.inspections.find(query).sort("created_at", -1).skip(skip).limit(size)
    items: List[InspectionOut] = []
    async for doc in cursor:
        items.append(await populate_inspection(db, doc))

    return InspectionListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=InspectionOut, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    inspection_in: InspectionCreate,
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "safety_inspector", "project_manager"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Schedule or record a site safety audit inspection."""
    p_oid = validate_object_id(inspection_in.project_id, "Project")
    proj = await db.projects.find_one({"_id": p_oid, "deleted_at": None})
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{inspection_in.project_id}' was not found"
        )

    # Check role boundaries
    if current_user.role_name != "admin":
        user_projs = {str(p) for p in current_user.assigned_project_ids}
        is_assigned = (
            str(p_oid) in user_projs
            or any(str(m) == str(current_user.id) for m in proj.get("manager_ids", []))
            or any(str(i) == str(current_user.id) for i in proj.get("inspector_ids", []))
        )
        if not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You may only schedule inspections for projects in your authorized scope"
            )

    if inspection_in.inspector_id:
        insp_oid = validate_object_id(inspection_in.inspector_id, "Inspector")
    elif current_user.role_name == "safety_inspector":
        insp_oid = current_user.id
    else:
        # Default to first inspector on project or current user
        insp_oid = proj.get("inspector_ids", [current_user.id])[0] if proj.get("inspector_ids") else current_user.id

    now = datetime.now(timezone.utc)
    new_id = ObjectId()
    insp_number = await generate_inspection_number(db)

    checklist_raw = [it.model_dump() for it in inspection_in.checklist_items]
    score = calculate_score(checklist_raw)

    doc = {
        "_id": new_id,
        "inspection_number": insp_number,
        "title": inspection_in.title.strip(),
        "project_id": p_oid,
        "inspector_id": insp_oid,
        "scheduled_date": inspection_in.scheduled_date or now,
        "completed_at": None,
        "status": "scheduled",
        "checklist_items": checklist_raw,
        "overall_score": score,
        "notes": inspection_in.notes,
        "photographs": inspection_in.photographs,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None
    }

    try:
        await db.inspections.insert_one(doc)
    except DuplicateKeyError:
        doc["inspection_number"] = f"{insp_number}-{now.strftime('%H%M%S')}"
        await db.inspections.insert_one(doc)

    # Notify inspector
    if insp_oid != current_user.id:
        await notify_inspection_assigned(db, insp_oid, p_oid, doc["inspection_number"], doc["title"])

    created = await db.inspections.find_one({"_id": new_id})
    return await populate_inspection(db, created)

@router.get("/{inspection_id}", response_model=InspectionOut)
async def get_inspection(
    inspection_id: str,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Retrieve details for a specific safety inspection (supports ObjectId or inspection_number)."""
    query = {"deleted_at": None}
    if ObjectId.is_valid(inspection_id):
        query["$or"] = [{"_id": ObjectId(inspection_id)}, {"inspection_number": inspection_id}]
    else:
        query["inspection_number"] = inspection_id

    doc = await db.inspections.find_one(query)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection with ID or number '{inspection_id}' was not found"
        )

    # Scoping check
    role = current_user.role_name
    if role != "admin":
        user_projs = {str(p) for p in current_user.assigned_project_ids}
        is_assigned = (
            str(doc["project_id"]) in user_projs
            or doc.get("inspector_id") == current_user.id
        )
        if not is_assigned:
            proj = await db.projects.find_one({"_id": doc["project_id"], "deleted_at": None})
            if proj:
                is_assigned = (
                    any(str(m) == str(current_user.id) for m in proj.get("manager_ids", []))
                    or any(str(i) == str(current_user.id) for i in proj.get("inspector_ids", []))
                    or (role == "client" and str(proj.get("client_id", "")) == str(current_user.id))
                )
        if not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Not authorized for this inspection"
            )

    return await populate_inspection(db, doc)

@router.patch("/{inspection_id}", response_model=InspectionOut)
async def update_inspection(
    inspection_id: str,
    inspection_in: InspectionUpdate,
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "safety_inspector", "project_manager"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Update checklist items, notes, status, and recalculate audit score."""
    i_oid = validate_object_id(inspection_id, "Inspection")

    doc = await db.inspections.find_one({"_id": i_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection with ID '{inspection_id}' was not found"
        )

    # Verify authorization
    if current_user.role_name != "admin":
        user_projs = {str(p) for p in current_user.assigned_project_ids}
        is_assigned = (
            str(doc["project_id"]) in user_projs
            or doc.get("inspector_id") == current_user.id
        )
        if not is_assigned:
            proj = await db.projects.find_one({"_id": doc["project_id"], "deleted_at": None})
            if proj:
                is_assigned = (
                    any(str(m) == str(current_user.id) for m in proj.get("manager_ids", []))
                    or any(str(i) == str(current_user.id) for i in proj.get("inspector_ids", []))
                )
        if not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You may only modify inspections for projects under your supervision"
            )

    update_fields = {}
    now = datetime.now(timezone.utc)

    if inspection_in.title is not None:
        update_fields["title"] = inspection_in.title.strip()
    if inspection_in.scheduled_date is not None:
        update_fields["scheduled_date"] = inspection_in.scheduled_date
    if inspection_in.inspector_id is not None:
        update_fields["inspector_id"] = validate_object_id(inspection_in.inspector_id, "Inspector")
    if inspection_in.notes is not None:
        update_fields["notes"] = inspection_in.notes
    if inspection_in.photographs is not None:
        update_fields["photographs"] = inspection_in.photographs

    if inspection_in.checklist_items is not None:
        checklist_raw = [it.model_dump() for it in inspection_in.checklist_items]
        update_fields["checklist_items"] = checklist_raw
        update_fields["overall_score"] = calculate_score(checklist_raw)

    if inspection_in.status is not None:
        new_status = inspection_in.status.lower()
        update_fields["status"] = new_status
        if new_status in ("completed", "failed") and not doc.get("completed_at"):
            update_fields["completed_at"] = now

    if update_fields:
        update_fields["updated_at"] = now
        await db.inspections.update_one({"_id": i_oid}, {"$set": update_fields})

    updated = await db.inspections.find_one({"_id": i_oid})
    return await populate_inspection(db, updated)

@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inspection(
    inspection_id: str,
    current_user: Annotated[UserDocument, Depends(require_roles("admin"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Soft-delete an inspection (Admin only)."""
    i_oid = validate_object_id(inspection_id, "Inspection")

    doc = await db.inspections.find_one({"_id": i_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection with ID '{inspection_id}' was not found"
        )

    now = datetime.now(timezone.utc)
    await db.inspections.update_one({"_id": i_oid}, {"$set": {"deleted_at": now, "status": "archived", "updated_at": now}})
    return None
