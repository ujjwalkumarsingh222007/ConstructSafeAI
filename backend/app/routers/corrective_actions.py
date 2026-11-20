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
from app.core.notifications import notify_corrective_action_assigned, notify_action_resolved
from app.models.mongodb import UserDocument
from app.schemas.corrective_action import (
    CorrectiveActionCreate,
    CorrectiveActionUpdate,
    CorrectiveActionOut,
    CorrectiveActionListResponse,
)

router = APIRouter(prefix="/corrective-actions", tags=["Corrective Actions"])

def validate_object_id(id_str: str, entity_name: str = "Resource") -> ObjectId:
    if not id_str or not ObjectId.is_valid(id_str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {entity_name} ID format: '{id_str}'"
        )
    return ObjectId(id_str)

async def generate_action_number(db: AsyncDatabase) -> str:
    year = datetime.now().year
    prefix = f"ACT-{year}-"
    count = await db.corrective_actions.count_documents({"action_number": {"$regex": f"^{prefix}"}})
    return f"{prefix}{count + 1:04d}"

async def populate_action(db: AsyncDatabase, doc: dict) -> CorrectiveActionOut:
    project_name = None
    project_code = None
    if doc.get("project_id"):
        proj = await db.projects.find_one({"_id": doc["project_id"]})
        if proj:
            project_name = proj.get("name")
            project_code = proj.get("code")

    assigned_to_name = None
    if doc.get("assigned_to"):
        u = await db.users.find_one({"_id": doc["assigned_to"]})
        if u:
            assigned_to_name = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()

    verified_by_name = None
    if doc.get("verified_by"):
        v = await db.users.find_one({"_id": doc["verified_by"]})
        if v:
            verified_by_name = f"{v.get('first_name', '')} {v.get('last_name', '')}".strip()

    # Check if overdue
    curr_status = doc.get("status", "open")
    due_date = doc.get("due_date")
    now = datetime.now(timezone.utc)
    if due_date and curr_status in ("open", "in_progress") and due_date.tzinfo is not None and due_date < now:
        curr_status = "overdue"

    return CorrectiveActionOut(
        id=str(doc["_id"]),
        action_number=doc.get("action_number", ""),
        project_id=str(doc["project_id"]),
        project_name=project_name,
        project_code=project_code,
        source_type=doc.get("source_type", "incident"),
        source_id=str(doc["source_id"]),
        title=doc.get("title", ""),
        description=doc.get("description", ""),
        priority=doc.get("priority", "medium"),
        assigned_to=str(doc["assigned_to"]),
        assigned_to_name=assigned_to_name,
        due_date=due_date or now,
        completed_at=doc.get("completed_at"),
        status=curr_status,
        resolution_notes=doc.get("resolution_notes"),
        completion_evidence=doc.get("completion_evidence", []),
        verified_by=str(doc["verified_by"]) if doc.get("verified_by") else None,
        verified_by_name=verified_by_name,
        verified_at=doc.get("verified_at"),
        verification_notes=doc.get("verification_notes"),
        created_at=doc.get("created_at", now),
        updated_at=doc.get("updated_at", now)
    )

def get_role_scoped_action_filter(current_user: UserDocument) -> dict:
    role = current_user.role_name
    base = {"deleted_at": None}

    if role == "admin":
        return base

    assigned_oids = [ObjectId(str(p)) for p in current_user.assigned_project_ids if ObjectId.is_valid(str(p))]

    if role in ("project_manager", "safety_inspector"):
        return {
            **base,
            "$or": [
                {"project_id": {"$in": assigned_oids}},
                {"assigned_to": current_user.id}
            ]
        }
    elif role == "client":
        return {**base, "project_id": {"$in": assigned_oids}}
    elif role == "worker":
        # Workers can see actions assigned directly to them
        return {**base, "assigned_to": current_user.id}
    return {**base, "_id": {"$in": []}}

@router.get("", response_model=CorrectiveActionListResponse)
async def list_corrective_actions(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    priority: Optional[str] = Query(default=None),
    project_id: Optional[str] = Query(default=None),
    assigned_to: Optional[str] = Query(default=None)
):
    """List corrective actions with search, filters, and role-boundary validation."""
    query = get_role_scoped_action_filter(current_user)

    if status_filter and status_filter.strip():
        query["status"] = status_filter.strip().lower()

    if priority and priority.strip():
        query["priority"] = priority.strip().lower()

    if project_id and project_id.strip():
        p_oid = validate_object_id(project_id.strip(), "Project")
        query["project_id"] = p_oid

    if assigned_to and assigned_to.strip():
        u_oid = validate_object_id(assigned_to.strip(), "Assigned User")
        query["assigned_to"] = u_oid

    if search and search.strip():
        escaped = re.escape(search.strip())
        query["$or"] = [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"action_number": {"$regex": escaped, "$options": "i"}},
            {"description": {"$regex": escaped, "$options": "i"}}
        ]

    total = await db.corrective_actions.count_documents(query)
    pages = math.ceil(total / size) if total > 0 else 1
    skip = (page - 1) * size

    cursor = db.corrective_actions.find(query).sort("created_at", -1).skip(skip).limit(size)
    items: List[CorrectiveActionOut] = []
    async for doc in cursor:
        items.append(await populate_action(db, doc))

    return CorrectiveActionListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=CorrectiveActionOut, status_code=status.HTTP_201_CREATED)
async def create_corrective_action(
    action_in: CorrectiveActionCreate,
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "project_manager", "safety_inspector"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Issue a formal corrective action item to remediate a violation, hazard, or inspection defect."""
    p_oid = validate_object_id(action_in.project_id, "Project")
    proj = await db.projects.find_one({"_id": p_oid, "deleted_at": None})
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{action_in.project_id}' was not found"
        )

    # Check project scoping for non-admin
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
                detail="Access denied: You may only issue corrective actions for supervised projects"
            )

    src_oid = validate_object_id(action_in.source_id, "Source")
    target_user_oid = validate_object_id(action_in.assigned_to, "Assigned User")

    now = datetime.now(timezone.utc)
    new_id = ObjectId()
    act_number = await generate_action_number(db)

    doc = {
        "_id": new_id,
        "action_number": act_number,
        "project_id": p_oid,
        "source_type": action_in.source_type.lower(),
        "source_id": src_oid,
        "title": action_in.title.strip(),
        "description": action_in.description.strip(),
        "priority": action_in.priority.lower(),
        "assigned_to": target_user_oid,
        "due_date": action_in.due_date,
        "completed_at": None,
        "status": "open",
        "resolution_notes": None,
        "completion_evidence": [],
        "verified_by": None,
        "verified_at": None,
        "verification_notes": None,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None
    }

    try:
        await db.corrective_actions.insert_one(doc)
    except DuplicateKeyError:
        doc["action_number"] = f"{act_number}-{now.strftime('%H%M%S')}"
        await db.corrective_actions.insert_one(doc)

    # Notify assignee
    await notify_corrective_action_assigned(
        db=db,
        assigned_to=target_user_oid,
        project_id=p_oid,
        action_number=doc["action_number"],
        title=doc["title"],
        due_date_str=action_in.due_date.strftime("%Y-%m-%d")
    )

    created = await db.corrective_actions.find_one({"_id": new_id})
    return await populate_action(db, created)

@router.get("/{action_id}", response_model=CorrectiveActionOut)
async def get_corrective_action(
    action_id: str,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """View details of a specific corrective action item."""
    act_oid = validate_object_id(action_id, "Corrective Action")

    doc = await db.corrective_actions.find_one({"_id": act_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corrective action with ID '{action_id}' was not found"
        )

    # Scoping check
    role = current_user.role_name
    if role == "admin":
        pass
    elif role == "worker":
        if doc.get("assigned_to") != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You may only view actions assigned directly to you"
            )
    else:
        user_projs = {str(p) for p in current_user.assigned_project_ids}
        is_auth = str(doc["project_id"]) in user_projs or doc.get("assigned_to") == current_user.id
        if not is_auth:
            proj = await db.projects.find_one({"_id": doc["project_id"], "deleted_at": None})
            if proj:
                is_auth = (
                    any(str(m) == str(current_user.id) for m in proj.get("manager_ids", []))
                    or any(str(i) == str(current_user.id) for i in proj.get("inspector_ids", []))
                    or (role == "client" and str(proj.get("client_id", "")) == str(current_user.id))
                )
        if not is_auth:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view this action"
            )

    return await populate_action(db, doc)

@router.patch("/{action_id}", response_model=CorrectiveActionOut)
async def update_corrective_action(
    action_id: str,
    action_in: CorrectiveActionUpdate,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Update action progress, record resolution notes, and submit or verify completion."""
    act_oid = validate_object_id(action_id, "Corrective Action")

    doc = await db.corrective_actions.find_one({"_id": act_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corrective action with ID '{action_id}' was not found"
        )

    # Scoping check
    role = current_user.role_name
    is_assignee = doc.get("assigned_to") == current_user.id
    if role != "admin":
        user_projs = {str(p) for p in current_user.assigned_project_ids}
        is_auth = str(doc["project_id"]) in user_projs or is_assignee
        if not is_auth:
            proj = await db.projects.find_one({"_id": doc["project_id"], "deleted_at": None})
            if proj:
                is_auth = (
                    any(str(m) == str(current_user.id) for m in proj.get("manager_ids", []))
                    or any(str(i) == str(current_user.id) for i in proj.get("inspector_ids", []))
                )
        if not is_auth:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to modify this corrective action"
            )

    update_fields = {}
    now = datetime.now(timezone.utc)

    if action_in.title is not None:
        update_fields["title"] = action_in.title.strip()
    if action_in.description is not None:
        update_fields["description"] = action_in.description.strip()
    if action_in.priority is not None:
        update_fields["priority"] = action_in.priority.lower()
    if action_in.assigned_to is not None:
        update_fields["assigned_to"] = validate_object_id(action_in.assigned_to, "Assigned User")
    if action_in.due_date is not None:
        update_fields["due_date"] = action_in.due_date
    if action_in.resolution_notes is not None:
        update_fields["resolution_notes"] = action_in.resolution_notes
    if action_in.completion_evidence is not None:
        update_fields["completion_evidence"] = action_in.completion_evidence

    if action_in.status is not None:
        new_status = action_in.status.lower()
        # Closing/Verifying actions requires inspector or admin clearance
        if new_status in ("completed", "closed"):
            if role not in ("admin", "safety_inspector", "project_manager"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Closing or verifying a corrective action requires Inspector, PM, or Admin clearance"
                )
            update_fields["verified_by"] = current_user.id
            update_fields["verified_at"] = now
            if not doc.get("completed_at"):
                update_fields["completed_at"] = now

        if new_status == "pending_verification":
            update_fields["completed_at"] = now
            await notify_action_resolved(db, doc["project_id"], doc["action_number"], doc["title"])

        update_fields["status"] = new_status

    if action_in.verification_notes is not None:
        update_fields["verification_notes"] = action_in.verification_notes

    if update_fields:
        update_fields["updated_at"] = now
        await db.corrective_actions.update_one({"_id": act_oid}, {"$set": update_fields})

    updated = await db.corrective_actions.find_one({"_id": act_oid})
    return await populate_action(db, updated)

@router.delete("/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_corrective_action(
    action_id: str,
    current_user: Annotated[UserDocument, Depends(require_roles("admin"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Soft-delete a corrective action record (Admin only)."""
    act_oid = validate_object_id(action_id, "Corrective Action")

    doc = await db.corrective_actions.find_one({"_id": act_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corrective action with ID '{action_id}' was not found"
        )

    now = datetime.now(timezone.utc)
    await db.corrective_actions.update_one(
        {"_id": act_oid},
        {"$set": {"deleted_at": now, "status": "closed", "updated_at": now}}
    )
    return None
