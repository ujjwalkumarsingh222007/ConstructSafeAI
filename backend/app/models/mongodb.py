from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.objectid import PyObjectId

class MongoBaseModel(BaseModel):
    """Base schema for MongoDB documents with ObjectId handling and serialization."""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str}
    )

# =============================================================================
# 1. Users Collection
# =============================================================================
class UserDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    email: str = Field(..., description="User corporate email, unique")
    hashed_password: str = Field(...)
    first_name: str = Field(...)
    last_name: str = Field(...)
    phone: Optional[str] = None
    role_id: PyObjectId = Field(..., description="Reference to roles._id")
    role_name: str = Field(..., description="Denormalized role name for fast auth checks")
    assigned_project_ids: List[PyObjectId] = Field(default_factory=list)
    is_active: bool = True
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

# =============================================================================
# 2. Roles Collection
# =============================================================================
class RoleDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., description="Unique role identifier: super_admin, admin, project_manager, safety_inspector, worker, client")
    display_name: str = Field(...)
    description: Optional[str] = None
    permission_names: List[str] = Field(default_factory=list, description="Embedded list of granted permission tokens")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# =============================================================================
# 3. Permissions Collection
# =============================================================================
class PermissionDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., description="Granular permission code: e.g. 'incidents:write'")
    module: str = Field(..., description="Module grouping: projects, workers, cameras, etc.")
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# =============================================================================
# 4. Projects Collection
# =============================================================================
class ProjectLocation(MongoBaseModel):
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "US"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ProjectDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    code: str = Field(..., description="Project code, e.g. PRJ-HUDSON-01")
    name: str = Field(...)
    client_name: str = Field(...)
    client_id: Optional[PyObjectId] = None
    description: Optional[str] = None
    location: ProjectLocation = Field(default_factory=ProjectLocation)
    status: str = Field(default="active", description="planning, active, paused, completed, archived")
    start_date: Optional[datetime] = None
    expected_completion_date: Optional[datetime] = None
    estimated_end_date: Optional[datetime] = None
    manager_ids: List[PyObjectId] = Field(default_factory=list)
    inspector_ids: List[PyObjectId] = Field(default_factory=list)
    worker_count: int = Field(default=0)
    safety_target_rate: float = Field(default=95.0, description="Minimum PPE compliance target %")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

# =============================================================================
# 5. Project Assignments Collection
# =============================================================================
class ProjectAssignmentDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    project_id: PyObjectId = Field(..., description="Reference to projects._id")
    user_id: Optional[PyObjectId] = Field(default=None, description="Reference to users._id")
    worker_id: Optional[PyObjectId] = Field(default=None, description="Reference to workers._id")
    role_in_project: str = Field(..., description="worker, project_manager, safety_inspector, client")
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assigned_by: Optional[PyObjectId] = None
    is_active: bool = True

# =============================================================================
# 6. Workers Collection
# =============================================================================
class EmergencyContact(MongoBaseModel):
    name: Optional[str] = None
    relation: Optional[str] = None
    phone: Optional[str] = None

class WorkerDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    employee_id: str = Field(..., description="Worker badge ID, e.g. W-4821")
    user_id: Optional[PyObjectId] = Field(default=None, description="Optional link to users._id")
    first_name: str = Field(...)
    last_name: str = Field(...)
    email: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    designation: Optional[str] = None
    trade: str = Field(default="General Labor", description="Craft/Trade: Electrician, Steelworker, Rigger, etc.")
    contractor_company: Optional[str] = "ConstructSafe Direct"
    current_project_id: Optional[PyObjectId] = None
    assigned_project_ids: List[PyObjectId] = Field(default_factory=list)
    joining_date: Optional[datetime] = None
    emergency_contact: Optional[EmergencyContact] = None
    status: str = Field(default="active", description="active, on_leave, terminated")
    training_status: str = Field(default="certified", description="certified, pending_induction, expired")
    training_records: List[Dict[str, Any]] = Field(default_factory=list)
    safety_induction_completed: bool = True
    induction_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

# =============================================================================
# 7. Cameras Collection
# =============================================================================
class CameraDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    project_id: PyObjectId = Field(..., description="Reference to projects._id")
    name: str = Field(...)
    stream_url: str = Field(..., description="RTSP or live stream endpoint")
    zone: str = Field(..., description="Specific site zone, e.g. Zone 4 - Framing Deck")
    location_description: Optional[str] = None
    status: str = Field(default="online", description="online, offline, degraded")
    fps: int = 15
    resolution: str = "1920x1080"
    ai_enabled: bool = True
    monitored_classes: List[str] = Field(
        default=["helmet", "vest", "gloves", "boots", "goggles"]
    )
    last_heartbeat_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

# =============================================================================
# 8. PPE Detections Collection
# =============================================================================
class DetectionBox(MongoBaseModel):
    class_name: str
    confidence: float
    box: List[float] = Field(..., description="[x1, y1, x2, y2] normalized coordinates")

class PPEDetectionDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    camera_id: PyObjectId = Field(..., description="Reference to cameras._id")
    project_id: PyObjectId = Field(..., description="Reference to projects._id")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    frame_snapshot_path: Optional[str] = None
    detected_persons_count: int = 0
    has_violation: bool = False
    detections: List[DetectionBox] = Field(default_factory=list)
    missing_items: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# =============================================================================
# 9. Safety Violations Collection
# =============================================================================
class SafetyViolationDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    violation_code: str = Field(..., description="Code e.g. VIO-2026-089")
    detection_id: Optional[PyObjectId] = None
    camera_id: Optional[PyObjectId] = None
    project_id: PyObjectId = Field(...)
    worker_id: Optional[PyObjectId] = None
    severity: str = Field(default="moderate", description="critical, moderate, minor")
    violation_type: str = Field(...)
    snapshot_url: Optional[str] = None
    status: str = Field(default="pending_review", description="pending_review, confirmed, dismissed, resolved")
    reviewed_by: Optional[PyObjectId] = None
    reviewed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# =============================================================================
# 10. Incidents Collection
# =============================================================================
class WitnessStatement(MongoBaseModel):
    name: str
    contact: Optional[str] = None
    statement: str
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncidentInvestigation(MongoBaseModel):
    lead_investigator_id: Optional[PyObjectId] = None
    root_cause: Optional[str] = None
    findings: Optional[str] = None
    witness_statements: List[WitnessStatement] = Field(default_factory=list)
    completed_at: Optional[datetime] = None

class IncidentDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    incident_number: str = Field(..., description="Unique code e.g. INC-2026-001")
    project_id: PyObjectId = Field(...)
    reported_by: PyObjectId = Field(...)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    incident_category: str = Field(
        default="unsafe_working_condition",
        description="worker_injury, equipment_accident, fire_hazard, electrical_hazard, falling_object, near_miss, unsafe_working_condition, other"
    )
    severity: str = Field(..., description="near_miss, minor_injury, major_injury, fatality, property_damage")
    title: str = Field(...)
    description: str = Field(...)
    location_details: Optional[str] = Field(None, description="Specific location/zone, e.g. Framing Deck Level 14")
    evidence_photos: List[str] = Field(default_factory=list)
    witness_details: List[Dict[str, Any]] = Field(default_factory=list)
    assigned_investigator_id: Optional[PyObjectId] = None
    status: str = Field(
        default="reported",
        description="reported, under_investigation, corrective_action_assigned, resolved, closed"
    )
    investigation: Optional[IncidentInvestigation] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

# =============================================================================
# 11. Inspections Collection
# =============================================================================
class InspectionItem(MongoBaseModel):
    item_id: str
    category: str
    description: str
    status: str = Field(default="pass", description="pass, fail, na")
    passed: bool = True
    notes: Optional[str] = None
    photos: List[str] = Field(default_factory=list)

class InspectionDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    inspection_number: str = Field(..., description="Unique code e.g. INS-2026-042")
    project_id: PyObjectId = Field(...)
    inspector_id: PyObjectId = Field(...)
    title: str = Field(...)
    scheduled_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    status: str = Field(default="scheduled", description="scheduled, in_progress, completed, failed")
    checklist_items: List[InspectionItem] = Field(default_factory=list)
    overall_score: Optional[float] = None
    notes: Optional[str] = None
    photographs: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

# =============================================================================
# 12. Corrective Actions Collection
# =============================================================================
class CorrectiveActionDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    action_number: str = Field(..., description="Unique code e.g. ACT-2026-001")
    project_id: PyObjectId = Field(...)
    source_type: str = Field(description="violation, incident, inspection, hazard")
    source_id: PyObjectId = Field(...)
    title: str = Field(...)
    description: str = Field(...)
    priority: str = Field(default="medium", description="low, medium, high, critical")
    assigned_to: PyObjectId = Field(...)
    due_date: datetime = Field(...)
    completed_at: Optional[datetime] = None
    status: str = Field(default="open", description="open, in_progress, pending_verification, completed, overdue, closed")
    resolution_notes: Optional[str] = None
    completion_evidence: List[str] = Field(default_factory=list)
    verified_by: Optional[PyObjectId] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

# =============================================================================
# 13. Training Records Collection
# =============================================================================
class TrainingRecordDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    worker_id: PyObjectId = Field(...)
    module_title: str = Field(...)
    completion_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expiry_date: Optional[datetime] = None
    certificate_number: Optional[str] = None
    passed: bool = True
    score: Optional[float] = None
    verified_by: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# =============================================================================
# 14. Notifications Collection
# =============================================================================
class NotificationDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    recipient_id: PyObjectId = Field(...)
    project_id: Optional[PyObjectId] = None
    title: str = Field(...)
    message: str = Field(...)
    type: str = Field(default="alert", description="alert, violation, inspection, assignment, system")
    severity: str = Field(default="info", description="critical, warning, info")
    is_read: bool = False
    read_at: Optional[datetime] = None
    link_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# =============================================================================
# 15. Audit Logs Collection
# =============================================================================
class AuditLogDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    actor_id: Optional[PyObjectId] = None
    actor_email: Optional[str] = None
    action: str = Field(..., description="USER_LOGIN, VIOLATION_REVIEWED, PROJECT_UPDATED")
    resource_type: str = Field(...)
    resource_id: Optional[str] = None
    changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# =============================================================================
# 16. Refresh Tokens Collection
# =============================================================================
class RefreshTokenDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId = Field(..., description="Reference to users._id")
    token_hash: str = Field(..., description="SHA-256 hashed refresh token string")
    family_id: str = Field(..., description="Token family UUID for rotation and reuse detection")
    expires_at: datetime = Field(..., description="Timestamp for MongoDB TTL expiration index")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_revoked: bool = False
    revoked_at: Optional[datetime] = None
    replaced_by: Optional[str] = Field(default=None, description="Hash of the token that replaced this one in rotation")

# =============================================================================
# 17. Hazard Reports Collection (AI-Assisted Photo Hazard Analysis)
# =============================================================================
class AISuggestedHazard(MongoBaseModel):
    category: str = Field(..., description="Detected category label, e.g. no_hard_hat, no_safety_vest, spill_hazard, person")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model prediction confidence score")
    bbox: List[float] = Field(..., description="Bounding box in pixel coordinates [x1, y1, x2, y2]")
    normalized_bbox: Optional[List[float]] = Field(None, description="Normalized coordinates [ymin, xmin, ymax, xmax] (0.0 to 1.0)")

class AIAnalysisMetadata(MongoBaseModel):
    model_name: str = Field(default="YOLOv8 Hazard Detector")
    model_version: str = Field(default="v1.0")
    is_custom_hazard_model: bool = Field(default=False)
    is_simulated: bool = Field(default=False)
    device: str = Field(default="cpu", description="Execution device: 'cuda' or 'cpu'")
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    raw_detections: List[AISuggestedHazard] = Field(default_factory=list)
    suggested_categories: List[str] = Field(default_factory=list)
    disclaimer: Optional[str] = Field(
        default="AI detections are advisory suggestions only and require human verification.",
        description="Explicit limitation notice to prevent unauthorized automatic decisions"
    )

class InspectorConfirmationData(MongoBaseModel):
    confirmed_by: PyObjectId = Field(...)
    inspector_name: str = Field(...)
    confirmed_categories: List[str] = Field(default_factory=list)
    rejected_ai_categories: List[str] = Field(default_factory=list)
    inspector_comments: Optional[str] = None
    confirmed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminReviewData(MongoBaseModel):
    reviewed_by: Optional[PyObjectId] = None
    admin_name: Optional[str] = None
    action: Optional[str] = Field(None, description="approved, rejected, action_assigned")
    review_comments: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    corrective_action_id: Optional[PyObjectId] = None
    corrective_action_number: Optional[str] = None

class HazardAuditEntry(MongoBaseModel):
    action: str = Field(..., description="e.g. submitted_by_inspector, updated_by_inspector, admin_reviewed")
    actor_id: PyObjectId = Field(...)
    actor_name: str = Field(...)
    actor_role: str = Field(...)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: Optional[str] = None

class HazardReportDocument(MongoBaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    report_number: str = Field(..., description="Unique human-readable identifier, e.g. HAZ-2026-0001")
    project_id: PyObjectId = Field(..., description="Associated construction project")
    project_code: Optional[str] = None
    project_name: Optional[str] = None
    submitted_by: PyObjectId = Field(..., description="Safety inspector or admin user id")
    inspector_name: Optional[str] = None
    location_details: str = Field(..., description="Specific site area or coordinates, e.g. Zone B Level 3 Scaffold")
    category: str = Field(..., description="Primary confirmed hazard category")
    severity: str = Field(default="medium", description="Hazard severity: low, medium, high, critical")
    description: str = Field(..., description="Detailed observation description")
    notes: Optional[str] = None
    photo_url: str = Field(..., description="Path or relative URL to the uploaded evidence photograph")
    thumbnail_url: Optional[str] = None
    image_metadata: Dict[str, Any] = Field(default_factory=dict, description="Dimensions, size, MIME type, SHA-256 hash")
    ai_analysis: Optional[AIAnalysisMetadata] = None
    inspector_confirmation: Optional[InspectorConfirmationData] = None
    admin_review: Optional[AdminReviewData] = None
    corrective_action_id: Optional[PyObjectId] = None
    corrective_action_number: Optional[str] = None
    status: str = Field(default="pending_admin_review", description="pending_admin_review, approved, rejected, action_assigned")
    audit_trail: List[HazardAuditEntry] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

