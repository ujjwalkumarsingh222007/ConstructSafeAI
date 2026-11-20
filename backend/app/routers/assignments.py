from datetime import datetime, timezone
from typing import Annotated, Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.asynchronous.database import AsyncDatabase

from app.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.mongodb import UserDocument
from app.schemas.assignment import AssignmentCreate, AssignmentOut, AssignmentListResponse

router = APIRouter(prefix="/assignments", tags=["Assignments"])

def validate_object_id(id_str: str, entity_name: str = "Resource") -> ObjectId:
    if not id_str or not ObjectId.is_valid(id_str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {entity_name} ID format: '{id_str}'"
        )
    return ObjectId(id_str)

async def populate_assignment(db: AsyncDatabase, doc: dict) -> AssignmentOut:
    project_name = None
    project_code = None
    if doc.get("project_id"):
        proj = await db.projects.find_one({"_id": doc["project_id"]})
        if proj:
            project_name = proj.get("name")
            project_code = proj.get("code")

    worker_name = None
    if doc.get("worker_id"):
        w = await db.workers.find_one({"_id": doc["worker_id"]})
        if w:
            worker_name = f"{w.get('first_name', '')} {w.get('last_name', '')}".strip()

    user_name = None
    if doc.get("user_id"):
        u = await db.users.find_one({"_id": doc["user_id"]})
        if u:
            user_name = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()

    return AssignmentOut(
        id=str(doc["_id"]),
        project_id=str(doc["project_id"]),
        project_name=project_name,
        project_code=project_code,
        worker_id=str(doc["worker_id"]) if doc.get("worker_id") else None,
        worker_name=worker_name,
        user_id=str(doc["user_id"]) if doc.get("user_id") else None,
        user_name=user_name,
        role_in_project=doc.get("role_in_project", "worker"),
        assigned_at=doc.get("assigned_at", datetime.now(timezone.utc)),
        assigned_by=str(doc["assigned_by"]) if doc.get("assigned_by") else None,
        is_active=doc.get("is_active", True)
    )

@router.get("", response_model=AssignmentListResponse)
async def list_assignments(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    project_id: Optional[str] = Query(default=None),
    worker_id: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None)
):
    """List active project assignments filtered by project, worker, or user."""
    query: dict = {"is_active": True}

    role = current_user.role_name
    if role != "admin":
        user_projs = [ObjectId(str(p)) for p in current_user.assigned_project_ids if ObjectId.is_valid(str(p))]
        if role in ("project_manager", "safety_inspector"):
            query["project_id"] = {"$in": user_projs}
        elif role == "client":
            query["project_id"] = {"$in": user_projs}
            # Clients can only see staff assignments, not granular workers
            query["role_in_project"] = {"$in": ["project_manager", "safety_inspector", "client"]}
        elif role == "worker":
            query["$or"] = [
                {"user_id": current_user.id},
                {"project_id": {"$in": user_projs}}
            ]

    if project_id and project_id.strip():
        p_oid = validate_object_id(project_id.strip(), "Project")
        query["project_id"] = p_oid

    if worker_id and worker_id.strip():
        w_oid = validate_object_id(worker_id.strip(), "Worker")
        query["worker_id"] = w_oid

    if user_id and user_id.strip():
        u_oid = validate_object_id(user_id.strip(), "User")
        query["user_id"] = u_oid

    cursor = db.project_assignments.find(query).sort("assigned_at", -1)
    items: List[AssignmentOut] = []
    async for doc in cursor:
        items.append(await populate_assignment(db, doc))

    return AssignmentListResponse(items=items, total=len(items))

@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    assignment_in: AssignmentCreate,
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "project_manager"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Assign a worker or user to a construction project."""
    p_oid = validate_object_id(assignment_in.project_id, "Project")
    proj = await db.projects.find_one({"_id": p_oid, "deleted_at": None})
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{assignment_in.project_id}' was not found"
        )

    # Check PM boundary
    if current_user.role_name == "project_manager":
        pm_projs = {str(p) for p in current_user.assigned_project_ids}
        if str(p_oid) not in pm_projs and current_user.id not in proj.get("manager_ids", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only assign members to projects you manage"
            )

    w_oid = validate_object_id(assignment_in.worker_id, "Worker") if assignment_in.worker_id else None
    u_oid = validate_object_id(assignment_in.user_id, "User") if assignment_in.user_id else None

    if not w_oid and not u_oid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either worker_id or user_id for assignment"
        )

    now = datetime.now(timezone.utc)

    # If worker assignment
    if w_oid:
        worker = await db.workers.find_one({"_id": w_oid, "deleted_at": None})
        if not worker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Worker with ID '{assignment_in.worker_id}' was not found"
            )
        # Update worker record
        await db.workers.update_one(
            {"_id": w_oid},
            {"$addToSet": {"assigned_project_ids": p_oid}, "$set": {"current_project_id": p_oid, "updated_at": now}}
        )

    # If user assignment (PM / Inspector / Client)
    if u_oid:
        target_user = await db.users.find_one({"_id": u_oid, "deleted_at": None})
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID '{assignment_in.user_id}' was not found"
            )
        # Add to user's assigned_project_ids
        await db.users.update_one(
            {"_id": u_oid},
            {"$addToSet": {"assigned_project_ids": p_oid}}
        )
        if assignment_in.role_in_project == "project_manager":
            await db.projects.update_one({"_id": p_oid}, {"$addToSet": {"manager_ids": u_oid}})
        elif assignment_in.role_in_project == "safety_inspector":
            await db.projects.update_one({"_id": p_oid}, {"$addToSet": {"inspector_ids": u_oid}})

    # Create assignment record
    assign_id = ObjectId()
    doc = {
        "_id": assign_id,
        "project_id": p_oid,
        "worker_id": w_oid,
        "user_id": u_oid,
        "role_in_project": assignment_in.role_in_project,
        "assigned_at": now,
        "assigned_by": current_user.id,
        "is_active": True
    }
    await db.project_assignments.insert_one(doc)

    created = await db.project_assignments.find_one({"_id": assign_id})
    return await populate_assignment(db, created)

@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: str,
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "project_manager"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Deactivate or remove a project assignment."""
    a_oid = validate_object_id(assignment_id, "Assignment")

    doc = await db.project_assignments.find_one({"_id": a_oid})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with ID '{assignment_id}' was not found"
        )

    # If PM, check boundary
    if current_user.role_name == "project_manager":
        pm_projs = {str(p) for p in current_user.assigned_project_ids}
        if str(doc["project_id"]) not in pm_projs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You may only remove assignments for projects you manage"
            )

    await db.project_assignments.update_one(
        {"_id": a_oid},
        {"$set": {"is_active": False}}
    )

    # If worker assignment, pull project from worker
    if doc.get("worker_id"):
        await db.workers.update_one(
            {"_id": doc["worker_id"]},
            {"$pull": {"assigned_project_ids": doc["project_id"]}}
        )

    # If user assignment, pull project from user
    if doc.get("user_id"):
        await db.users.update_one(
            {"_id": doc["user_id"]},
            {"$pull": {"assigned_project_ids": doc["project_id"]}}
        )

    return None
