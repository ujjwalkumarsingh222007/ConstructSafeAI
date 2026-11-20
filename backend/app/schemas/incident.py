from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class WitnessStatementSchema(BaseModel):
    name: str
    contact: Optional[str] = None
    statement: str
    recorded_at: Optional[datetime] = None

class IncidentInvestigationSchema(BaseModel):
    lead_investigator_id: Optional[str] = None
    root_cause: Optional[str] = None
    findings: Optional[str] = None
    witness_statements: List[WitnessStatementSchema] = Field(default_factory=list)
    completed_at: Optional[datetime] = None

class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150, description="Brief summary of incident or hazard")
    project_id: str = Field(..., description="Project ObjectId")
    incident_category: str = Field(
        default="unsafe_working_condition",
        description="worker_injury, equipment_accident, fire_hazard, electrical_hazard, falling_object, near_miss, unsafe_working_condition, other"
    )
    severity: str = Field(
        default="minor_injury",
        description="near_miss, minor_injury, major_injury, critical, property_damage"
    )
    description: str = Field(..., min_length=5, description="Detailed account of incident or observed hazard")
    location_details: Optional[str] = Field(None, description="Site zone, level, or coordinate")
    occurred_at: Optional[datetime] = None
    evidence_photos: List[str] = Field(default_factory=list, description="Array of storage URLs for uploaded photos")
    witness_details: List[Dict[str, Any]] = Field(default_factory=list)

class IncidentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=150)
    incident_category: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    location_details: Optional[str] = None
    evidence_photos: Optional[List[str]] = None
    witness_details: Optional[List[Dict[str, Any]]] = None
    assigned_investigator_id: Optional[str] = None
    status: Optional[str] = Field(None, description="reported, under_investigation, corrective_action_assigned, resolved, closed")
    investigation: Optional[IncidentInvestigationSchema] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None

class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_number: str
    project_id: str
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    reported_by: str
    reporter_name: Optional[str] = None
    incident_category: str
    severity: str
    title: str
    description: str
    location_details: Optional[str] = None
    occurred_at: datetime
    evidence_photos: List[str] = Field(default_factory=list)
    witness_details: List[Dict[str, Any]] = Field(default_factory=list)
    assigned_investigator_id: Optional[str] = None
    assigned_investigator_name: Optional[str] = None
    status: str
    investigation: Optional[IncidentInvestigationSchema] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class IncidentListResponse(BaseModel):
    items: List[IncidentOut]
    total: int
    page: int
    size: int
    pages: int
