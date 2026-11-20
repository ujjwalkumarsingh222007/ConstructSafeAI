from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    recipient_id: str
    project_id: Optional[str] = None
    title: str
    message: str
    type: str
    severity: str
    is_read: bool
    read_at: Optional[datetime] = None
    link_url: Optional[str] = None
    created_at: datetime

class NotificationListResponse(BaseModel):
    items: List[NotificationOut]
    unread_count: int
    total: int
