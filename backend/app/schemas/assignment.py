from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class AssignmentCreate(BaseModel):
    project_id: str = Field(..., description="Project ObjectId")
    worker_id: Optional[str] = Field(None, description="Worker ObjectId (if assigning a worker)")
    user_id: Optional[str] = Field(None, description="User ObjectId (if assigning a PM, Inspector, or Client)")
    role_in_project: str = Field(default="worker", description="worker, project_manager, safety_inspector, client")

class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    worker_id: Optional[str] = None
    worker_name: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    role_in_project: str
    assigned_at: datetime
    assigned_by: Optional[str] = None
    is_active: bool = True

class AssignmentListResponse(BaseModel):
    items: List[AssignmentOut]
    total: int
