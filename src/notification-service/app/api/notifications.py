from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from typing import Annotated
import asyncpg

from app.db.database import get_db
from app.models.notification import Notification, NotificationCreate
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def get_user_id(x_user_id: Annotated[str, Header()]) -> int:
    try:
        return int(x_user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid user id header")


@router.post("/", response_model=Notification, status_code=status.HTTP_201_CREATED)
async def create_notification(
    data: NotificationCreate,
    conn: asyncpg.Connection = Depends(get_db),
):
    """Internal endpoint — called by other services to push notifications."""
    svc = NotificationService(conn)
    return await svc.create(data)


@router.get("/", response_model=list[Notification])
async def list_notifications(
    unread_only: bool = Query(False),
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = NotificationService(conn)
    return await svc.list_for_user(user_id, unread_only)


@router.get("/unread-count")
async def unread_count(
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = NotificationService(conn)
    count = await svc.unread_count(user_id)
    return {"unread_count": count}


@router.put("/{notification_id}/read", response_model=Notification)
async def mark_read(
    notification_id: int,
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = NotificationService(conn)
    n = await svc.mark_read(notification_id, user_id)
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    return n


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_read(
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = NotificationService(conn)
    updated = await svc.mark_all_read(user_id)
    return {"updated": updated}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    user_id: int = Depends(get_user_id),
    conn: asyncpg.Connection = Depends(get_db),
):
    svc = NotificationService(conn)
    if not await svc.delete(notification_id, user_id):
        raise HTTPException(status_code=404, detail="Notification not found")
