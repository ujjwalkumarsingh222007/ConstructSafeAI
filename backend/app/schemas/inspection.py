from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class InspectionItemSchema(BaseModel):
    item_id: str
    category: str
    description: str
    status: str = Field(default="pass", description="pass, fail, na")
    notes: Optional[str] = None
    photos: List[str] = Field(default_factory=list)

class InspectionCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150, description="Inspection Title, e.g. Daily Scaffolding & Fall Protection Audit")
    project_id: str = Field(..., description="Project ObjectId")
    inspector_id: Optional[str] = Field(None, description="Assigned Safety Inspector user ObjectId")
    scheduled_date: Optional[datetime] = None
    checklist_items: List[InspectionItemSchema] = Field(default_factory=list)
    notes: Optional[str] = None
    photographs: List[str] = Field(default_factory=list)

class InspectionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    inspector_id: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    status: Optional[str] = Field(None, description="scheduled, in_progress, completed, failed")
    checklist_items: Optional[List[InspectionItemSchema]] = None
    overall_score: Optional[float] = None
    notes: Optional[str] = None
    photographs: Optional[List[str]] = None
    completed_at: Optional[datetime] = None

class InspectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    inspection_number: str
    title: str
    project_id: str
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    inspector_id: str
    inspector_name: Optional[str] = None
    scheduled_date: datetime
    completed_at: Optional[datetime] = None
    status: str
    checklist_items: List[InspectionItemSchema] = Field(default_factory=list)
    overall_score: Optional[float] = None
    notes: Optional[str] = None
    photographs: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

class InspectionListResponse(BaseModel):
    items: List[InspectionOut]
    total: int
    page: int
    size: int
    pages: int
