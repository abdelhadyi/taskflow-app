from fastapi import APIRouter, Depends, Header, HTTPException, status
from typing import Annotated
import asyncpg

from app.db.database import get_db
from app.models.project import Project, ProjectCreate, ProjectUpdate, Member, MemberCreate
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api/projects", tags=["projects"])


def get_user_id(x_user_id: Annotated[str, Header()]) -> int:
    try:
        return int(x_user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid user id header")


@router.post("/", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = ProjectService(conn)
    return await svc.create(user_id, data)


@router.get("/", response_model=list[Project])
async def list_projects(
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = ProjectService(conn)
    return await svc.list_for_user(user_id)


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: int,
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = ProjectService(conn)
    project = await svc.get(project_id, user_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    return project


@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = ProjectService(conn)
    project = await svc.update(project_id, user_id, data)
    if not project:
        raise HTTPException(status_code=403, detail="Forbidden or project not found")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = ProjectService(conn)
    if not await svc.delete(project_id, user_id):
        raise HTTPException(status_code=403, detail="Forbidden or project not found")


@router.get("/{project_id}/members", response_model=list[Member])
async def list_members(
    project_id: int,
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = ProjectService(conn)
    return await svc.list_members(project_id, user_id)


@router.post("/{project_id}/members", response_model=Member, status_code=status.HTTP_201_CREATED)
async def add_member(
    project_id: int,
    data: MemberCreate,
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = ProjectService(conn)
    member = await svc.add_member(project_id, user_id, data)
    if not member:
        raise HTTPException(status_code=403, detail="Forbidden")
    return member


@router.delete("/{project_id}/members/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    project_id: int,
    target_user_id: int,
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = ProjectService(conn)
    if not await svc.remove_member(project_id, user_id, target_user_id):
        raise HTTPException(status_code=403, detail="Forbidden")
