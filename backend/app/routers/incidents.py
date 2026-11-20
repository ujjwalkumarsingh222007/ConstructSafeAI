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
from app.core.notifications import notify_incident_reported
from app.models.mongodb import UserDocument
from app.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentOut,
    IncidentListResponse,
    IncidentInvestigationSchema,
    WitnessStatementSchema,
)

router = APIRouter(prefix="/incidents", tags=["Incidents & Hazards"])

def validate_object_id(id_str: str, entity_name: str = "Resource") -> ObjectId:
    if not id_str or not ObjectId.is_valid(id_str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {entity_name} ID format: '{id_str}'"
        )
    return ObjectId(id_str)

async def generate_incident_number(db: AsyncDatabase) -> str:
    year = datetime.now().year
    prefix = f"INC-{year}-"
    count = await db.incidents.count_documents({"incident_number": {"$regex": f"^{prefix}"}})
    return f"{prefix}{count + 1:04d}"

async def populate_incident(db: AsyncDatabase, doc: dict, is_client: bool = False) -> IncidentOut:
    project_name = None
    project_code = None
    if doc.get("project_id"):
        proj = await db.projects.find_one({"_id": doc["project_id"]})
        if proj:
            project_name = proj.get("name")
            project_code = proj.get("code")

    reporter_name = None
    if doc.get("reported_by"):
        u = await db.users.find_one({"_id": doc["reported_by"]})
        if u:
            reporter_name = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()

    investigator_name = None
    if doc.get("assigned_investigator_id"):
        inv = await db.users.find_one({"_id": doc["assigned_investigator_id"]})
        if inv:
            investigator_name = f"{inv.get('first_name', '')} {inv.get('last_name', '')}".strip()

    inv_schema = None
    raw_inv = doc.get("investigation")
    if raw_inv:
        # If client, omit witness statements for confidentiality
        witnesses = []
        if not is_client:
            for w in raw_inv.get("witness_statements", []):
                witnesses.append(WitnessStatementSchema(
                    name=w.get("name", ""),
                    contact=w.get("contact"),
                    statement=w.get("statement", ""),
                    recorded_at=w.get("recorded_at")
                ))

        inv_schema = IncidentInvestigationSchema(
            lead_investigator_id=str(raw_inv["lead_investigator_id"]) if raw_inv.get("lead_investigator_id") else None,
            root_cause=raw_inv.get("root_cause"),
            findings=raw_inv.get("findings"),
            witness_statements=witnesses,
            completed_at=raw_inv.get("completed_at")
        )

    # For client users, strip confidential witness statements from main doc as well
    witness_details = [] if is_client else doc.get("witness_details", [])

    return IncidentOut(
        id=str(doc["_id"]),
        incident_number=doc.get("incident_number", ""),
        project_id=str(doc["project_id"]),
        project_name=project_name,
        project_code=project_code,
        reported_by=str(doc["reported_by"]),
        reporter_name=reporter_name,
        incident_category=doc.get("incident_category", "unsafe_working_condition"),
        severity=doc.get("severity", "minor_injury"),
        title=doc.get("title", ""),
        description=doc.get("description", ""),
        location_details=doc.get("location_details"),
        occurred_at=doc.get("occurred_at", datetime.now(timezone.utc)),
        evidence_photos=doc.get("evidence_photos", []),
        witness_details=witness_details,
        assigned_investigator_id=str(doc["assigned_investigator_id"]) if doc.get("assigned_investigator_id") else None,
        assigned_investigator_name=investigator_name,
        status=doc.get("status", "reported"),
        investigation=inv_schema,
        resolution_notes=doc.get("resolution_notes"),
        resolved_at=doc.get("resolved_at"),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc))
    )

def get_role_scoped_incident_filter(current_user: UserDocument) -> dict:
    role = current_user.role_name
    base = {"deleted_at": None}

    if role == "admin":
        return base

    assigned_oids = [ObjectId(str(p)) for p in current_user.assigned_project_ids if ObjectId.is_valid(str(p))]

    if role in ("project_manager", "safety_inspector"):
        return {**base, "project_id": {"$in": assigned_oids}}
    elif role == "client":
        return {**base, "project_id": {"$in": assigned_oids}}
    elif role == "worker":
        # Workers can view incidents they reported
        return {**base, "reported_by": current_user.id}
    return {**base, "_id": {"$in": []}}

@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    project_id: Optional[str] = Query(default=None)
):
    """List safety incidents and worker hazard observations with RBAC boundary enforcement."""
    query = get_role_scoped_incident_filter(current_user)

    if category and category.strip():
        query["incident_category"] = category.strip().lower()

    if severity and severity.strip():
        query["severity"] = severity.strip().lower()

    if status_filter and status_filter.strip():
        query["status"] = status_filter.strip().lower()

    if project_id and project_id.strip():
        p_oid = validate_object_id(project_id.strip(), "Project")
        query["project_id"] = p_oid

    if search and search.strip():
        escaped = re.escape(search.strip())
        query["$or"] = [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"incident_number": {"$regex": escaped, "$options": "i"}},
            {"description": {"$regex": escaped, "$options": "i"}}
        ]

    total = await db.incidents.count_documents(query)
    pages = math.ceil(total / size) if total > 0 else 1
    skip = (page - 1) * size

    cursor = db.incidents.find(query).sort("created_at", -1).skip(skip).limit(size)
    items: List[IncidentOut] = []
    is_client = current_user.role_name == "client"
    async for doc in cursor:
        items.append(await populate_incident(db, doc, is_client=is_client))

    return IncidentListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
async def create_incident(
    incident_in: IncidentCreate,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """File a safety incident or submit an on-site hazard observation (All authenticated roles)."""
    p_oid = validate_object_id(incident_in.project_id, "Project")
    proj = await db.projects.find_one({"_id": p_oid, "deleted_at": None})
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{incident_in.project_id}' was not found"
        )

    # Check project authorization
    if current_user.role_name != "admin":
        user_projs = {str(p) for p in current_user.assigned_project_ids}
        is_assigned = (
            str(p_oid) in user_projs
            or any(str(m) == str(current_user.id) for m in proj.get("manager_ids", []))
            or any(str(i) == str(current_user.id) for i in proj.get("inspector_ids", []))
            or (current_user.role_name == "client" and str(proj.get("client_id", "")) == str(current_user.id))
        )
        if not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You may only report incidents for construction sites to which you are assigned"
            )

    now = datetime.now(timezone.utc)
    new_id = ObjectId()
    inc_number = await generate_incident_number(db)

    doc = {
        "_id": new_id,
        "incident_number": inc_number,
        "project_id": p_oid,
        "reported_by": current_user.id,
        "occurred_at": incident_in.occurred_at or now,
        "incident_category": incident_in.incident_category.lower(),
        "severity": incident_in.severity.lower(),
        "title": incident_in.title.strip(),
        "description": incident_in.description.strip(),
        "location_details": incident_in.location_details,
        "evidence_photos": incident_in.evidence_photos,
        "witness_details": incident_in.witness_details,
        "assigned_investigator_id": None,
        "status": "reported",
        "investigation": None,
        "resolved_at": None,
        "resolution_notes": None,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None
    }

    try:
        await db.incidents.insert_one(doc)
    except DuplicateKeyError:
        doc["incident_number"] = f"{inc_number}-{now.strftime('%H%M%S')}"
        await db.incidents.insert_one(doc)

    # Notify PMs and Inspectors
    await notify_incident_reported(
        db=db,
        project_id=p_oid,
        incident_number=doc["incident_number"],
        title=doc["title"],
        severity=doc["severity"]
    )

    created = await db.incidents.find_one({"_id": new_id})
    return await populate_incident(db, created)

@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(
    incident_id: str,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """View details of a specific incident or hazard report (supports ObjectId or incident_number)."""
    query = {"deleted_at": None}
    if ObjectId.is_valid(incident_id):
        query["$or"] = [{"_id": ObjectId(incident_id)}, {"incident_number": incident_id}]
    else:
        query["incident_number"] = incident_id

    doc = await db.incidents.find_one(query)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID or number '{incident_id}' was not found"
        )

    # Scoping check
    role = current_user.role_name
    if role == "admin":
        pass
    elif role == "worker":
        if doc.get("reported_by") != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Workers may only inspect reports they submitted"
            )
    else:
        user_projs = {str(p) for p in current_user.assigned_project_ids}
        if str(doc["project_id"]) not in user_projs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to inspect this project's incident reports"
            )

    is_client = role == "client"
    return await populate_incident(db, doc, is_client=is_client)

@router.patch("/{incident_id}", response_model=IncidentOut)
async def update_incident(
    incident_id: str,
    incident_in: IncidentUpdate,
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "project_manager", "safety_inspector"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Update incident investigation findings, assign investigator, and update status."""
    inc_oid = validate_object_id(incident_id, "Incident")

    doc = await db.incidents.find_one({"_id": inc_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' was not found"
        )

    # Verify authorization for non-admin
    if current_user.role_name != "admin":
        user_projs = {str(p) for p in current_user.assigned_project_ids}
        if str(doc["project_id"]) not in user_projs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You may only modify incidents on projects you supervise"
            )

    update_fields = {}
    now = datetime.now(timezone.utc)

    if incident_in.title is not None:
        update_fields["title"] = incident_in.title.strip()
    if incident_in.incident_category is not None:
        update_fields["incident_category"] = incident_in.incident_category.lower()
    if incident_in.severity is not None:
        update_fields["severity"] = incident_in.severity.lower()
    if incident_in.description is not None:
        update_fields["description"] = incident_in.description.strip()
    if incident_in.location_details is not None:
        update_fields["location_details"] = incident_in.location_details
    if incident_in.evidence_photos is not None:
        update_fields["evidence_photos"] = incident_in.evidence_photos
    if incident_in.witness_details is not None:
        update_fields["witness_details"] = incident_in.witness_details
    if incident_in.assigned_investigator_id is not None:
        update_fields["assigned_investigator_id"] = validate_object_id(incident_in.assigned_investigator_id, "Investigator")
    if incident_in.resolution_notes is not None:
        update_fields["resolution_notes"] = incident_in.resolution_notes

    if incident_in.investigation is not None:
        inv_data = incident_in.investigation.model_dump()
        if inv_data.get("lead_investigator_id"):
            inv_data["lead_investigator_id"] = validate_object_id(inv_data["lead_investigator_id"], "Lead Investigator")
        update_fields["investigation"] = inv_data

    if incident_in.status is not None:
        new_status = incident_in.status.lower()
        update_fields["status"] = new_status
        if new_status in ("resolved", "closed") and not doc.get("resolved_at"):
            update_fields["resolved_at"] = now

    if update_fields:
        update_fields["updated_at"] = now
        await db.incidents.update_one({"_id": inc_oid}, {"$set": update_fields})

    updated = await db.incidents.find_one({"_id": inc_oid})
    return await populate_incident(db, updated)

@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(
    incident_id: str,
    current_user: Annotated[UserDocument, Depends(require_roles("admin"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Soft-delete an incident record (Admin only)."""
    inc_oid = validate_object_id(incident_id, "Incident")

    doc = await db.incidents.find_one({"_id": inc_oid, "deleted_at": None})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' was not found"
        )

    now = datetime.now(timezone.utc)
    await db.incidents.update_one(
        {"_id": inc_oid},
        {"$set": {"deleted_at": now, "status": "closed", "updated_at": now}}
    )
    return None
