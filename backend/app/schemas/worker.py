from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class EmergencyContactSchema(BaseModel):
    name: Optional[str] = None
    relation: Optional[str] = None
    phone: Optional[str] = None

class WorkerCreate(BaseModel):
    employee_id: str = Field(..., min_length=2, max_length=50, description="Worker badge ID, e.g. W-4821")
    user_id: Optional[str] = None
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    email: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    designation: Optional[str] = None
    trade: str = Field(default="General Labor", max_length=80)
    contractor_company: Optional[str] = "ConstructSafe Direct"
    current_project_id: Optional[str] = None
    assigned_project_ids: List[str] = Field(default_factory=list)
    joining_date: Optional[datetime] = None
    emergency_contact: Optional[EmergencyContactSchema] = None
    status: str = Field(default="active", description="active, on_leave, terminated")
    training_status: str = Field(default="certified", description="certified, pending_induction, expired")
    training_records: List[Dict[str, Any]] = Field(default_factory=list)
    safety_induction_completed: bool = True

class WorkerUpdate(BaseModel):
    employee_id: Optional[str] = Field(None, min_length=2, max_length=50)
    user_id: Optional[str] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=80)
    last_name: Optional[str] = Field(None, min_length=1, max_length=80)
    email: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    designation: Optional[str] = None
    trade: Optional[str] = None
    contractor_company: Optional[str] = None
    current_project_id: Optional[str] = None
    assigned_project_ids: Optional[List[str]] = None
    joining_date: Optional[datetime] = None
    emergency_contact: Optional[EmergencyContactSchema] = None
    status: Optional[str] = None
    training_status: Optional[str] = None
    training_records: Optional[List[Dict[str, Any]]] = None
    safety_induction_completed: Optional[bool] = None

class ProjectMiniOut(BaseModel):
    id: str
    name: str
    code: str

class WorkerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: str
    user_id: Optional[str] = None
    first_name: str
    last_name: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    designation: Optional[str] = None
    trade: str
    contractor_company: Optional[str] = None
    current_project_id: Optional[str] = None
    assigned_project_ids: List[str] = Field(default_factory=list)
    assigned_projects: List[ProjectMiniOut] = Field(default_factory=list)
    joining_date: Optional[datetime] = None
    emergency_contact: Optional[EmergencyContactSchema] = None
    status: str
    training_status: str
    training_records: List[Dict[str, Any]] = Field(default_factory=list)
    safety_induction_completed: bool = True
    created_at: datetime
    updated_at: datetime

class WorkerListResponse(BaseModel):
    items: List[WorkerOut]
    total: int
    page: int
    size: int
    pages: int
