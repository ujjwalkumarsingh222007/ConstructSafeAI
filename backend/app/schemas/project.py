from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class ProjectLocationSchema(BaseModel):
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "US"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserSummary(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    role_name: str

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120, description="Project Name")
    code: str = Field(..., min_length=2, max_length=50, description="Unique Project Code, e.g. PRJ-HUDSON-01")
    client_name: str = Field(..., min_length=2, max_length=120, description="Client or Contracting Organization")
    client_id: Optional[str] = None
    description: Optional[str] = None
    location: Optional[ProjectLocationSchema] = Field(default_factory=ProjectLocationSchema)
    status: str = Field(default="active", description="planning, active, paused, completed, archived")
    start_date: Optional[datetime] = None
    expected_completion_date: Optional[datetime] = None
    manager_ids: List[str] = Field(default_factory=list, description="List of user ObjectIds for Project Managers")
    inspector_ids: List[str] = Field(default_factory=list, description="List of user ObjectIds for Safety Inspectors")
    safety_target_rate: float = Field(default=95.0, ge=0.0, le=100.0, description="Target PPE compliance percentage")

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    client_name: Optional[str] = Field(None, min_length=2, max_length=120)
    client_id: Optional[str] = None
    description: Optional[str] = None
    location: Optional[ProjectLocationSchema] = None
    status: Optional[str] = Field(None, description="planning, active, paused, completed, archived")
    start_date: Optional[datetime] = None
    expected_completion_date: Optional[datetime] = None
    manager_ids: Optional[List[str]] = None
    inspector_ids: Optional[List[str]] = None
    safety_target_rate: Optional[float] = Field(None, ge=0.0, le=100.0)

class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    client_name: str
    client_id: Optional[str] = None
    description: Optional[str] = None
    location: ProjectLocationSchema = Field(default_factory=ProjectLocationSchema)
    status: str
    start_date: Optional[datetime] = None
    expected_completion_date: Optional[datetime] = None
    manager_ids: List[str] = Field(default_factory=list)
    inspector_ids: List[str] = Field(default_factory=list)
    managers: List[UserSummary] = Field(default_factory=list)
    inspectors: List[UserSummary] = Field(default_factory=list)
    worker_count: int = 0
    safety_target_rate: float = 95.0
    created_at: datetime
    updated_at: datetime

class ProjectListResponse(BaseModel):
    items: List[ProjectOut]
    total: int
    page: int
    size: int
    pages: int
