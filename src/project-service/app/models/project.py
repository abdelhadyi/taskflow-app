from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None


class Project(ProjectBase):
    id: int
    owner_id: int
    status: str = "active"
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MemberBase(BaseModel):
    user_id: int
    role: str = "member"   # owner | admin | member | viewer


class MemberCreate(MemberBase):
    pass


class Member(MemberBase):
    project_id: int
    joined_at: datetime

    model_config = {"from_attributes": True}
