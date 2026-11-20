from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class AISuggestedDetectionSchema(BaseModel):
    category: str = Field(..., description="Detected category label")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    bbox: List[float] = Field(..., description="Absolute pixel bounding box [x1, y1, x2, y2]")
    normalized_bbox: Optional[List[float]] = Field(None, description="Normalized bounding box [ymin, xmin, ymax, xmax]")

class AIAnalysisMetadataSchema(BaseModel):
    model_name: str
    model_version: str
    is_custom_hazard_model: bool
    is_simulated: bool = False
    mode: Optional[str] = "standard_coco"
    device: str
    analyzed_at: datetime
    raw_detections: List[AISuggestedDetectionSchema] = Field(default_factory=list)
    suggested_categories: List[str] = Field(default_factory=list)
    disclaimer: Optional[str] = None

class HazardAnalysisResponse(BaseModel):
    photo_url: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    width: int
    height: int
    ai_analysis: AIAnalysisMetadataSchema

class HazardReportCreate(BaseModel):
    project_id: str = Field(..., description="Project ObjectId")
    location_details: str = Field(..., min_length=2, max_length=200, description="Site zone/level")
    category: str = Field(..., description="Primary confirmed hazard category")
    severity: str = Field(default="medium", description="Hazard severity: low, medium, high, critical")
    description: str = Field(..., min_length=5, description="Detailed hazard observation")
    notes: Optional[str] = None
    photo_url: str = Field(..., description="Uploaded evidence photograph storage path")
    image_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    ai_analysis: Optional[AIAnalysisMetadataSchema] = None
    confirmed_categories: List[str] = Field(default_factory=list, description="Human-confirmed categories")
    rejected_ai_categories: List[str] = Field(default_factory=list, description="AI categories rejected by inspector")
    inspector_comments: Optional[str] = None

class CorrectiveActionAssignPayload(BaseModel):
    title: str = Field(..., min_length=3, max_length=150, description="Title of corrective action")
    description: str = Field(..., min_length=5, description="Specific remediation steps required")
    priority: str = Field(default="medium", description="Priority level: low, medium, high, critical")
    assigned_to: str = Field(..., description="ObjectId of user/worker responsible for remediation")
    due_date: datetime = Field(..., description="Target completion deadline")

class HazardReviewRequest(BaseModel):
    action: str = Field(..., description="Decision action: 'approve', 'reject', or 'assign_action'")
    review_comments: Optional[str] = Field(None, description="Admin review comments or notes")
    rejection_reason: Optional[str] = Field(None, description="Mandatory rationale when rejecting report")
    capa: Optional[CorrectiveActionAssignPayload] = Field(None, description="CAPA details when action is 'assign_action'")

class HazardReportAuditOut(BaseModel):
    action: str
    actor_id: str
    actor_name: str
    actor_role: str
    timestamp: datetime
    details: Optional[str] = None

class HazardReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    report_number: str
    project_id: str
    project_code: Optional[str] = None
    project_name: Optional[str] = None
    submitted_by: str
    inspector_name: Optional[str] = None
    location_details: str
    category: str
    severity: str
    description: str
    notes: Optional[str] = None
    photo_url: str
    thumbnail_url: Optional[str] = None
    image_metadata: Dict[str, Any] = Field(default_factory=dict)
    ai_analysis: Optional[AIAnalysisMetadataSchema] = None
    inspector_confirmation: Optional[Dict[str, Any]] = None
    admin_review: Optional[Dict[str, Any]] = None
    corrective_action_id: Optional[str] = None
    corrective_action_number: Optional[str] = None
    status: str
    audit_trail: List[HazardReportAuditOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

class HazardReportListResponse(BaseModel):
    items: List[HazardReportOut]
    total: int
    page: int
    size: int
    pages: int
