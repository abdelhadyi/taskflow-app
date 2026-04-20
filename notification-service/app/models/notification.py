from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationCreate(BaseModel):
    user_id: int
    type: str          # task_assigned | task_updated | comment_added | project_invite
    title: str
    body: str
    reference_id: Optional[int] = None    # task_id or project_id
    reference_type: Optional[str] = None  # task | project


class Notification(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    body: str
    is_read: bool
    reference_id: Optional[int]
    reference_type: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
