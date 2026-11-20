from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class CorrectiveActionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150, description="Title of required remedial action")
    description: str = Field(..., min_length=5, description="Clear description of remediation steps")
    project_id: str = Field(..., description="Project ObjectId")
    source_type: str = Field(default="incident", description="violation, incident, inspection, hazard")
    source_id: str = Field(..., description="ObjectId of the source violation/incident/inspection")
    priority: str = Field(default="medium", description="low, medium, high, critical")
    assigned_to: str = Field(..., description="User ObjectId responsible for resolution")
    due_date: datetime = Field(..., description="Target completion deadline")

class CorrectiveActionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=150)
    description: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = Field(None, description="open, in_progress, pending_verification, completed, overdue, closed")
    resolution_notes: Optional[str] = None
    completion_evidence: Optional[List[str]] = None
    verification_notes: Optional[str] = None

class CorrectiveActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action_number: str
    project_id: str
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    source_type: str
    source_id: str
    title: str
    description: str
    priority: str
    assigned_to: str
    assigned_to_name: Optional[str] = None
    due_date: datetime
    completed_at: Optional[datetime] = None
    status: str
    resolution_notes: Optional[str] = None
    completion_evidence: List[str] = Field(default_factory=list)
    verified_by: Optional[str] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CorrectiveActionListResponse(BaseModel):
    items: List[CorrectiveActionOut]
    total: int
    page: int
    size: int
    pages: int
