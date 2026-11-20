"""ConstructSafe AI - Photo Hazard Analysis & Verification Router
Implements Phase 5 static photograph analysis, YOLO-based inference,
human-in-the-loop inspector confirmation, and admin-notification workflow.
"""

import os
import re
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any, Annotated

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from pymongo import AsyncMongoClient, DESCENDING, ASCENDING
from pymongo.errors import DuplicateKeyError
from pymongo.asynchronous.database import AsyncDatabase

from app.core.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.mongodb import UserDocument
from app.schemas.hazard import (
    HazardAnalysisResponse,
    HazardReportCreate,
    HazardReportOut,
    HazardReportListResponse,
    HazardReportAuditOut,
    HazardReviewRequest,
    CorrectiveActionAssignPayload,
    AIAnalysisMetadataSchema,
    AISuggestedDetectionSchema
)
from app.core.notifications import (
    notify_hazard_approved,
    notify_hazard_rejected,
    notify_hazard_action_assigned,
    notify_corrective_action_assigned
)
from app.routers.corrective_actions import generate_action_number
from ai_engine.detector import HazardDetector, ALLOWED_FORMATS, MAX_IMAGE_SIZE_BYTES
from app.core.rate_limiter import rate_limit_ai_analysis

logger = logging.getLogger("constructsafe.hazards")

router = APIRouter(prefix="/hazards", tags=["Hazard Reporting & AI Analysis"])

# Dedicated evidence storage directory
BASE_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "storage" / "evidence"
BASE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Shared detector instance for inference
detector = HazardDetector()

def validate_object_id(id_str: str, entity_name: str = "Resource") -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {entity_name} ID format"
        )

async def generate_hazard_report_number(db: AsyncDatabase) -> str:
    year = datetime.now().year
    prefix = f"HAZ-{year}-"
    count = await db.hazard_reports.count_documents({"report_number": {"$regex": f"^{prefix}"}})
    return f"{prefix}{count + 1:04d}"

def get_role_scoped_hazard_filter(current_user: UserDocument) -> dict:
    role = current_user.role_name
    base = {"deleted_at": None}

    if role in ("admin", "super_admin"):
        return base

    assigned_oids = [
        ObjectId(str(p)) for p in getattr(current_user, "assigned_project_ids", [])
        if ObjectId.is_valid(str(p))
    ]

    if role in ("project_manager", "safety_inspector"):
        # Inspector/PM can see reports for their assigned projects OR reports they personally submitted
        return {
            **base,
            "$or": [
                {"project_id": {"$in": assigned_oids}},
                {"submitted_by": current_user.id}
            ]
        }
    elif role in ("client", "worker"):
        return {**base, "project_id": {"$in": assigned_oids}}

    return {**base, "_id": {"$in": []}}

async def populate_hazard_report(db: AsyncDatabase, doc: dict) -> HazardReportOut:
    """Enrich raw MongoDB hazard report document with project and inspector details."""
    project_name = doc.get("project_name")
    project_code = doc.get("project_code")
    
    if (not project_name or not project_code) and doc.get("project_id"):
        proj = await db.projects.find_one({"_id": doc["project_id"]})
        if proj:
            project_name = proj.get("name")
            project_code = proj.get("code")

    inspector_name = doc.get("inspector_name")
    if not inspector_name and doc.get("submitted_by"):
        u = await db.users.find_one({"_id": doc["submitted_by"]})
        if u:
            inspector_name = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()

    # Format audit trail
    audit_trail_out = []
    for a in doc.get("audit_trail", []):
        audit_trail_out.append(HazardReportAuditOut(
            action=a.get("action", ""),
            actor_id=str(a.get("actor_id", "")),
            actor_name=a.get("actor_name", ""),
            actor_role=a.get("actor_role", ""),
            timestamp=a.get("timestamp", datetime.now(timezone.utc)),
            details=a.get("details")
        ))

    # Format AI analysis metadata if present
    ai_meta = None
    raw_ai = doc.get("ai_analysis")
    if raw_ai:
        raw_detections = []
        for d in raw_ai.get("raw_detections", []):
            raw_detections.append(AISuggestedDetectionSchema(
                category=d.get("category", "unknown"),
                confidence=float(d.get("confidence", 0.0)),
                bbox=d.get("bbox", [0.0, 0.0, 0.0, 0.0]),
                normalized_bbox=d.get("normalized_bbox")
            ))
        ai_meta = AIAnalysisMetadataSchema(
            model_name=raw_ai.get("model_name", "YOLOv8 Hazard Detector"),
            model_version=raw_ai.get("model_version", "v1.0"),
            is_custom_hazard_model=bool(raw_ai.get("is_custom_hazard_model", False)),
            is_simulated=bool(raw_ai.get("is_simulated", False)),
            mode=raw_ai.get("mode", "standard_coco"),
            device=raw_ai.get("device", "cpu"),
            analyzed_at=raw_ai.get("analyzed_at", datetime.now(timezone.utc)),
            raw_detections=raw_detections,
            suggested_categories=raw_ai.get("suggested_categories", []),
            disclaimer=raw_ai.get("disclaimer")
        )

    # Format inspector confirmation
    raw_ic = doc.get("inspector_confirmation")
    ic_out = None
    if raw_ic:
        ic_out = {
            "confirmed_by": str(raw_ic.get("confirmed_by", "")),
            "inspector_name": raw_ic.get("inspector_name", ""),
            "confirmed_categories": raw_ic.get("confirmed_categories", []),
            "rejected_ai_categories": raw_ic.get("rejected_ai_categories", []),
            "inspector_comments": raw_ic.get("inspector_comments"),
            "confirmed_at": raw_ic.get("confirmed_at")
        }

    # Format admin review
    raw_ar = doc.get("admin_review")
    ar_out = None
    if raw_ar:
        ar_out = {
            "reviewed_by": str(raw_ar.get("reviewed_by", "")) if raw_ar.get("reviewed_by") else None,
            "admin_name": raw_ar.get("admin_name"),
            "action": raw_ar.get("action"),
            "review_comments": raw_ar.get("review_comments"),
            "reviewed_at": raw_ar.get("reviewed_at"),
            "corrective_action_id": str(raw_ar.get("corrective_action_id", "")) if raw_ar.get("corrective_action_id") else None,
            "corrective_action_number": raw_ar.get("corrective_action_number")
        }

    return HazardReportOut(
        id=str(doc["_id"]),
        report_number=doc.get("report_number", ""),
        project_id=str(doc.get("project_id", "")),
        project_code=project_code,
        project_name=project_name,
        submitted_by=str(doc.get("submitted_by", "")),
        inspector_name=inspector_name,
        location_details=doc.get("location_details", ""),
        category=doc.get("category", ""),
        severity=doc.get("severity", "medium"),
        description=doc.get("description", ""),
        notes=doc.get("notes"),
        photo_url=doc.get("photo_url", ""),
        thumbnail_url=doc.get("thumbnail_url"),
        image_metadata=doc.get("image_metadata", {}),
        ai_analysis=ai_meta,
        inspector_confirmation=ic_out,
        admin_review=ar_out,
        corrective_action_id=str(doc.get("corrective_action_id", "")) if doc.get("corrective_action_id") else None,
        corrective_action_number=doc.get("corrective_action_number"),
        status=doc.get("status", "pending_admin_review"),
        audit_trail=audit_trail_out,
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc))
    )

# =============================================================================
# 1. POST /api/v1/hazards/analyze - Image Upload & YOLO Inference
# =============================================================================
@router.post(
    "/analyze",
    response_model=HazardAnalysisResponse,
    dependencies=[Depends(rate_limit_ai_analysis)]
)
async def analyze_hazard_photo(
    file: UploadFile = File(...),
    force_demo: bool = Form(False),
    current_user: UserDocument = Depends(get_current_user)
):
    """
    Upload a construction site photograph and execute YOLO-based hazard analysis.
    Validates file format, enforces 10MB limit, writes evidence to local storage,
    and returns detected categories with bounding boxes and advisory disclaimer.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename."
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP."
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Image size exceeds the maximum limit of {MAX_IMAGE_SIZE_BYTES // (1024*1024)}MB."
        )

    # Validate image data with Pillow
    try:
        pil_img = HazardDetector.validate_image_bytes(contents)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )

    # Save to evidence storage
    safe_filename = f"hazard_{uuid.uuid4().hex}{ext}"
    dest_path = BASE_STORAGE_DIR / safe_filename
    with open(dest_path, "wb") as f:
        f.write(contents)

    photo_url = f"/api/v1/storage/files/{safe_filename}"

    # Execute AI detection
    try:
        active_detector = HazardDetector(force_demo_mode=force_demo) if force_demo else detector
        raw_result = active_detector.analyze_image(pil_img)
    except Exception as e:
        logger.error(f"Inference execution error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI inference failed: {str(e)}"
        )

    # Build schema
    raw_detections = [
        AISuggestedDetectionSchema(
            category=d["category"],
            confidence=d["confidence"],
            bbox=d["bbox"],
            normalized_bbox=d.get("normalized_bbox")
        ) for d in raw_result["detections"]
    ]

    ai_meta_schema = AIAnalysisMetadataSchema(
        model_name=raw_result["model_name"],
        model_version=raw_result["model_version"],
        is_custom_hazard_model=raw_result["is_custom_hazard_model"],
        is_simulated=raw_result["is_simulated"],
        mode=raw_result["mode"],
        device=raw_result["device"],
        analyzed_at=datetime.fromisoformat(raw_result["analyzed_at"]),
        raw_detections=raw_detections,
        suggested_categories=raw_result["suggested_categories"],
        disclaimer=raw_result["disclaimer"]
    )

    return HazardAnalysisResponse(
        photo_url=photo_url,
        file_name=file.filename,
        file_size_bytes=len(contents),
        mime_type=file.content_type or f"image/{ext.lstrip('.')}",
        width=raw_result["image_width"],
        height=raw_result["image_height"],
        ai_analysis=ai_meta_schema
    )

# =============================================================================
# 1B. POST /api/v1/hazards/analyze-demo - Public Landing Page Interactive Inference
# =============================================================================
@router.post(
    "/analyze-demo",
    response_model=HazardAnalysisResponse,
    dependencies=[Depends(rate_limit_ai_analysis)]
)
async def analyze_hazard_photo_demo(
    file: UploadFile = File(...),
    force_demo: bool = Form(False)
):
    """
    Public demo endpoint for landing page visitors to test real-time YOLO hazard inference.
    Executes real inference, enforces 10MB limit and valid image formats.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename."
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP."
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Image size exceeds the maximum limit of {MAX_IMAGE_SIZE_BYTES // (1024*1024)}MB."
        )

    try:
        pil_img = HazardDetector.validate_image_bytes(contents)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )

    safe_filename = f"demo_{uuid.uuid4().hex}{ext}"
    dest_path = BASE_STORAGE_DIR / safe_filename
    with open(dest_path, "wb") as f:
        f.write(contents)

    photo_url = f"/api/v1/storage/files/{safe_filename}"

    try:
        active_detector = HazardDetector(force_demo_mode=force_demo) if force_demo else detector
        raw_result = active_detector.analyze_image(pil_img)
    except Exception as e:
        logger.error(f"Demo inference execution error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI inference failed: {str(e)}"
        )

    raw_detections = [
        AISuggestedDetectionSchema(
            category=d["category"],
            confidence=d["confidence"],
            bbox=d["bbox"],
            normalized_bbox=d.get("normalized_bbox")
        ) for d in raw_result["detections"]
    ]

    ai_meta_schema = AIAnalysisMetadataSchema(
        model_name=raw_result["model_name"],
        model_version=raw_result["model_version"],
        is_custom_hazard_model=raw_result["is_custom_hazard_model"],
        is_simulated=raw_result["is_simulated"],
        mode=raw_result["mode"],
        device=raw_result["device"],
        analyzed_at=datetime.fromisoformat(raw_result["analyzed_at"]),
        raw_detections=raw_detections,
        suggested_categories=raw_result["suggested_categories"],
        disclaimer=raw_result["disclaimer"]
    )

    return HazardAnalysisResponse(
        photo_url=photo_url,
        file_name=file.filename,
        file_size_bytes=len(contents),
        mime_type=file.content_type or f"image/{ext.lstrip('.')}",
        width=raw_result["image_width"],
        height=raw_result["image_height"],
        ai_analysis=ai_meta_schema
    )

# =============================================================================
# 2. POST /api/v1/hazards - Submit Confirmed Hazard Report
# =============================================================================
@router.post("", response_model=HazardReportOut, status_code=status.HTTP_201_CREATED)
async def submit_hazard_report(
    payload: HazardReportCreate,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """
    Safety Inspector or Admin submits an official hazard report after verifying AI suggestions.
    Enforces Human-in-the-Loop confirmation, project scoping, sets status to pending_admin_review,
    logs audit trail, and generates an in-app notification for Admins.
    """
    # 1. RBAC check: Inspector or Admin only
    if current_user.role_name not in ("safety_inspector", "admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Safety Inspectors and Administrators can submit official hazard reports."
        )

    # 2. Validate project existence
    project_oid = validate_object_id(payload.project_id, "Project")
    project = await db.projects.find_one({"_id": project_oid, "deleted_at": None})
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or archived."
        )

    # 3. Project scoping check for inspectors
    if current_user.role_name == "safety_inspector":
        assigned_oids = [
            ObjectId(str(p)) for p in getattr(current_user, "assigned_project_ids", [])
            if ObjectId.is_valid(str(p))
        ]
        # Also check if inspector is listed directly in project.inspector_ids
        proj_inspector_oids = [
            ObjectId(str(i)) for i in project.get("inspector_ids", [])
            if ObjectId.is_valid(str(i))
        ]
        if project_oid not in assigned_oids and current_user.id not in proj_inspector_oids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not assigned as a Safety Inspector to this project."
            )

    # 4. Generate report number & prepare document
    now = datetime.now(timezone.utc)
    report_num = await generate_hazard_report_number(db)
    inspector_full_name = f"{current_user.first_name} {current_user.last_name}".strip()

    # Human-in-the-loop inspector confirmation record
    inspector_confirmation = {
        "confirmed_by": current_user.id,
        "inspector_name": inspector_full_name,
        "confirmed_categories": payload.confirmed_categories or [payload.category],
        "rejected_ai_categories": payload.rejected_ai_categories,
        "inspector_comments": payload.inspector_comments,
        "confirmed_at": now
    }

    # Initial audit trail entry
    audit_entry = {
        "action": "submitted_by_inspector",
        "actor_id": current_user.id,
        "actor_name": inspector_full_name,
        "actor_role": current_user.role_name,
        "timestamp": now,
        "details": f"Hazard report {report_num} submitted for admin review with primary category '{payload.category}'."
    }

    ai_analysis_dict = None
    if payload.ai_analysis:
        ai_analysis_dict = payload.ai_analysis.model_dump()

    new_report_doc = {
        "report_number": report_num,
        "project_id": project_oid,
        "project_code": project.get("code"),
        "project_name": project.get("name"),
        "submitted_by": current_user.id,
        "inspector_name": inspector_full_name,
        "location_details": payload.location_details,
        "category": payload.category,
        "severity": payload.severity,
        "description": payload.description,
        "notes": payload.notes,
        "photo_url": payload.photo_url,
        "thumbnail_url": None,
        "image_metadata": payload.image_metadata or {},
        "ai_analysis": ai_analysis_dict,
        "inspector_confirmation": inspector_confirmation,
        "admin_review": None,
        "status": "pending_admin_review",
        "audit_trail": [audit_entry],
        "created_at": now,
        "updated_at": now,
        "deleted_at": None
    }

    result = await db.hazard_reports.insert_one(new_report_doc)
    new_report_doc["_id"] = result.inserted_id

    # 5. Notify all Admin users
    admin_users_cursor = db.users.find({
        "role_name": {"$in": ["admin", "super_admin"]},
        "is_active": True,
        "deleted_at": None
    })
    admin_notifications = []
    async for admin in admin_users_cursor:
        admin_notifications.append({
            "recipient_id": admin["_id"],
            "project_id": project_oid,
            "title": f"Hazard Report Pending Review: {report_num}",
            "message": (
                f"Inspector {inspector_full_name} submitted hazard report {report_num} "
                f"at {payload.location_details} ({payload.category}, severity: {payload.severity})."
            ),
            "type": "hazard",
            "severity": "warning" if payload.severity in ("high", "critical") else "info",
            "is_read": False,
            "read_at": None,
            "link_url": f"/hazards/{str(result.inserted_id)}",
            "created_at": now
        })

    if admin_notifications:
        try:
            await db.notifications.insert_many(admin_notifications)
        except Exception as e:
            logger.warning(f"Failed to insert admin notifications: {e}")

    # 6. Record System Audit Log
    try:
        await db.audit_logs.insert_one({
            "actor_id": current_user.id,
            "actor_email": current_user.email,
            "action": "HAZARD_REPORT_SUBMITTED",
            "resource_type": "hazard_report",
            "resource_id": str(result.inserted_id),
            "changes": {
                "report_number": report_num,
                "project_id": str(project_oid),
                "category": payload.category,
                "severity": payload.severity,
                "status": "pending_admin_review"
            },
            "created_at": now
        })
    except Exception as e:
        logger.warning(f"Failed to record audit log: {e}")

    return await populate_hazard_report(db, new_report_doc)

# =============================================================================
# 3. GET /api/v1/hazards - List Hazard Reports with Role Scoping
# =============================================================================
@router.get("", response_model=HazardReportListResponse)
async def list_hazard_reports(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    project_id: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None)
):
    """
    List hazard reports with strict project and role scoping.
    Admins see all; Project Managers and Inspectors see their assigned projects.
    """
    query = get_role_scoped_hazard_filter(current_user)

    if status_filter and status_filter.strip():
        query["status"] = status_filter.strip().lower()

    if category and category.strip():
        query["category"] = category.strip().lower()

    if severity and severity.strip():
        query["severity"] = severity.strip().lower()

    if project_id and project_id.strip():
        p_oid = validate_object_id(project_id.strip(), "Project")
        query["project_id"] = p_oid

    if search and search.strip():
        escaped = re.escape(search.strip())
        query["$or"] = [
            {"report_number": {"$regex": escaped, "$options": "i"}},
            {"location_details": {"$regex": escaped, "$options": "i"}},
            {"description": {"$regex": escaped, "$options": "i"}},
            {"category": {"$regex": escaped, "$options": "i"}}
        ]

    total = await db.hazard_reports.count_documents(query)
    pages = (total + size - 1) // size if total > 0 else 1
    skip = (page - 1) * size

    cursor = db.hazard_reports.find(query).sort("created_at", DESCENDING).skip(skip).limit(size)
    items = []
    async for doc in cursor:
        items.append(await populate_hazard_report(db, doc))

    return HazardReportListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

# =============================================================================
# 4. GET /api/v1/hazards/{id} - Get Hazard Report Detail
# =============================================================================
@router.get("/{id}", response_model=HazardReportOut)
async def get_hazard_report(
    id: str,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """
    Get detailed hazard report including photo evidence, AI analysis predictions,
    inspector confirmation findings, and audit trail.
    """
    query = {"deleted_at": None}
    if ObjectId.is_valid(id):
        query["$or"] = [{"_id": ObjectId(id)}, {"report_number": id}]
    else:
        query["report_number"] = id

    report = await db.hazard_reports.find_one(query)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hazard report not found"
        )

    report_oid = report["_id"]

    # Scoping check
    role = current_user.role_name
    if role not in ("admin", "super_admin"):
        assigned_oids = [
            ObjectId(str(p)) for p in getattr(current_user, "assigned_project_ids", [])
            if ObjectId.is_valid(str(p))
        ]
        is_submitter = str(report.get("submitted_by")) == str(current_user.id)
        is_assigned_project = report.get("project_id") in assigned_oids

        if not (is_submitter or is_assigned_project):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view this hazard report."
            )

    return await populate_hazard_report(db, report)

# =============================================================================
# 5. PATCH /api/v1/hazards/{id}/review - Admin Decision (Approve / Reject / Assign CAPA)
# =============================================================================
@router.patch("/{id}/review", response_model=HazardReportOut)
async def review_hazard_report(
    id: str,
    payload: HazardReviewRequest,
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "super_admin"))],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """
    Administrative decision endpoint for hazard reports.
    Restricted strictly to administrators.
    Supports:
      1. APPROVE: Sets status to approved, notifies inspector, preserves history.
      2. REJECT: Requires rejection reason, sets status to rejected, notifies inspector.
      3. ASSIGN_ACTION: Creates linked CAPA ticket in corrective_actions collection,
         assigns priority/due-date/assignee, sets status to action_assigned,
         prevents duplicate CAPA, and notifies inspector and project manager(s).
    """
    query = {"deleted_at": None}
    if ObjectId.is_valid(id):
        query["$or"] = [{"_id": ObjectId(id)}, {"report_number": id}]
    else:
        query["report_number"] = id

    report = await db.hazard_reports.find_one(query)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hazard report not found"
        )

    report_oid = report["_id"]

    action = payload.action.lower().strip()
    if action not in ("approve", "reject", "assign_action"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review action '{payload.action}'. Supported actions: approve, reject, assign_action"
        )

    now = datetime.now(timezone.utc)
    admin_full_name = f"{current_user.first_name} {current_user.last_name}".strip()
    report_num = report.get("report_number", "")
    project_oid = report["project_id"]
    inspector_oid = report.get("submitted_by")

    if action == "approve":
        new_status = "approved"
        review_data = {
            "reviewed_by": current_user.id,
            "admin_name": admin_full_name,
            "action": "approved",
            "review_comments": payload.review_comments,
            "reviewed_at": now,
            "corrective_action_id": report.get("corrective_action_id"),
            "corrective_action_number": report.get("corrective_action_number")
        }

        audit_entry = {
            "action": "admin_approved",
            "actor_id": current_user.id,
            "actor_name": admin_full_name,
            "actor_role": current_user.role_name,
            "timestamp": now,
            "details": f"Hazard report {report_num} approved by Administrator. {payload.review_comments or ''}".strip()
        }

        await db.hazard_reports.update_one(
            {"_id": report_oid},
            {
                "$set": {
                    "status": new_status,
                    "admin_review": review_data,
                    "updated_at": now
                },
                "$push": {"audit_trail": audit_entry}
            }
        )

        # Notify inspector
        if inspector_oid:
            try:
                await notify_hazard_approved(
                    db=db,
                    inspector_id=inspector_oid,
                    project_id=project_oid,
                    report_number=report_num,
                    hazard_id=str(report_oid),
                    category=report.get("category", "hazard")
                )
            except Exception as e:
                logger.warning(f"Failed to dispatch approval notification: {e}")

    elif action == "reject":
        rejection_reason = (payload.rejection_reason or payload.review_comments or "").strip()
        if not rejection_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid rejection reason is required when rejecting a hazard report."
            )

        new_status = "rejected"
        review_data = {
            "reviewed_by": current_user.id,
            "admin_name": admin_full_name,
            "action": "rejected",
            "review_comments": rejection_reason,
            "reviewed_at": now,
            "corrective_action_id": report.get("corrective_action_id"),
            "corrective_action_number": report.get("corrective_action_number")
        }

        audit_entry = {
            "action": "admin_rejected",
            "actor_id": current_user.id,
            "actor_name": admin_full_name,
            "actor_role": current_user.role_name,
            "timestamp": now,
            "details": f"Hazard report {report_num} rejected. Rationale: {rejection_reason}"
        }

        await db.hazard_reports.update_one(
            {"_id": report_oid},
            {
                "$set": {
                    "status": new_status,
                    "admin_review": review_data,
                    "updated_at": now
                },
                "$push": {"audit_trail": audit_entry}
            }
        )

        # Notify inspector
        if inspector_oid:
            try:
                await notify_hazard_rejected(
                    db=db,
                    inspector_id=inspector_oid,
                    project_id=project_oid,
                    report_number=report_num,
                    hazard_id=str(report_oid),
                    rejection_reason=rejection_reason
                )
            except Exception as e:
                logger.warning(f"Failed to dispatch rejection notification: {e}")

    elif action == "assign_action":
        # Duplicate CAPA prevention check
        if report.get("status") == "action_assigned" or report.get("corrective_action_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A corrective action (CAPA) has already been assigned to this hazard report."
            )

        if not payload.capa:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corrective action details (capa) are required when action is 'assign_action'."
            )

        # Validate responsible person existence
        target_user_oid = validate_object_id(payload.capa.assigned_to, "Assigned Responsible Person")
        assignee_user = await db.users.find_one({"_id": target_user_oid, "deleted_at": None})
        assignee_worker = None
        if not assignee_user:
            assignee_worker = await db.workers.find_one({"_id": target_user_oid, "deleted_at": None})
            if not assignee_worker:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Responsible user/worker with ID '{payload.capa.assigned_to}' was not found."
                )

        assignee_name = (
            f"{assignee_user.get('first_name', '')} {assignee_user.get('last_name', '')}".strip()
            if assignee_user else assignee_worker.get("name", "Assigned Personnel")
        )

        # Generate unique CAPA action number
        act_number = await generate_action_number(db)
        capa_oid = ObjectId()

        # Insert new CAPA into existing corrective_actions collection
        capa_doc = {
            "_id": capa_oid,
            "action_number": act_number,
            "project_id": project_oid,
            "source_type": "hazard",
            "source_id": report_oid,
            "title": payload.capa.title.strip(),
            "description": payload.capa.description.strip(),
            "priority": payload.capa.priority.lower(),
            "assigned_to": target_user_oid,
            "due_date": payload.capa.due_date,
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
            await db.corrective_actions.insert_one(capa_doc)
        except DuplicateKeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A corrective action (CAPA) has already been assigned to this hazard report."
            )

        new_status = "action_assigned"
        review_data = {
            "reviewed_by": current_user.id,
            "admin_name": admin_full_name,
            "action": "action_assigned",
            "review_comments": payload.review_comments or f"Corrective action {act_number} assigned to {assignee_name}.",
            "reviewed_at": now,
            "corrective_action_id": capa_oid,
            "corrective_action_number": act_number
        }

        audit_entry = {
            "action": "corrective_action_assigned",
            "actor_id": current_user.id,
            "actor_name": admin_full_name,
            "actor_role": current_user.role_name,
            "timestamp": now,
            "details": f"CAPA {act_number} issued with priority '{payload.capa.priority}' to {assignee_name}."
        }

        await db.hazard_reports.update_one(
            {"_id": report_oid},
            {
                "$set": {
                    "status": new_status,
                    "corrective_action_id": capa_oid,
                    "corrective_action_number": act_number,
                    "admin_review": review_data,
                    "updated_at": now
                },
                "$push": {"audit_trail": audit_entry}
            }
        )

        # 1. Notify responsible assignee
        try:
            due_str = payload.capa.due_date.strftime("%Y-%m-%d")
            await notify_corrective_action_assigned(
                db=db,
                assigned_to=target_user_oid,
                project_id=project_oid,
                action_number=act_number,
                title=payload.capa.title,
                due_date_str=due_str
            )
        except Exception as e:
            logger.warning(f"Failed to dispatch CAPA assignee notification: {e}")

        # 2. Notify inspector and Project Managers
        if inspector_oid:
            try:
                await notify_hazard_action_assigned(
                    db=db,
                    inspector_id=inspector_oid,
                    project_id=project_oid,
                    report_number=report_num,
                    hazard_id=str(report_oid),
                    action_number=act_number,
                    action_title=payload.capa.title,
                    priority=payload.capa.priority
                )
            except Exception as e:
                logger.warning(f"Failed to dispatch CAPA hazard notification: {e}")

    # Record System Audit Log in db.audit_logs
    try:
        await db.audit_logs.insert_one({
            "actor_id": current_user.id,
            "actor_email": current_user.email,
            "action": f"HAZARD_REPORT_{action.upper()}",
            "resource_type": "hazard_report",
            "resource_id": str(report_oid),
            "changes": {
                "previous_status": report.get("status"),
                "new_status": new_status,
                "action": action,
                "review_comments": payload.review_comments or payload.rejection_reason
            },
            "created_at": now
        })
    except Exception as e:
        logger.warning(f"Failed to record audit log: {e}")

    updated_report = await db.hazard_reports.find_one({"_id": report_oid})
    return await populate_hazard_report(db, updated_report)
