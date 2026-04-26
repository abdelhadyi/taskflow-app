import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from app.services.notification_service import NotificationService
from app.models.notification import NotificationCreate


def make_conn():
    return AsyncMock()


def fake_row(data: dict):
    return data

BASE = {
    "id": 1, "user_id": 42, "type": "task_assigned",
    "title": "New task", "body": "You have a new task",
    "is_read": False, "reference_id": 5, "reference_type": "task",
    "created_at": datetime(2024, 1, 1),
}


@pytest.mark.asyncio
async def test_create_notification():
    conn = make_conn()
    conn.fetchrow.return_value = fake_row(BASE)
    svc = NotificationService(conn)

    data = NotificationCreate(
        user_id=42, type="task_assigned",
        title="New task", body="You have a new task",
        reference_id=5, reference_type="task",
    )
    result = await svc.create(data)
    assert result.user_id == 42
    assert result.type == "task_assigned"
    assert result.is_read is False


@pytest.mark.asyncio
async def test_list_for_user_all():
    conn = make_conn()
    conn.fetch.return_value = [fake_row(BASE), fake_row({**BASE, "id": 2})]
    svc = NotificationService(conn)

    results = await svc.list_for_user(42, unread_only=False)
    assert len(results) == 2


@pytest.mark.asyncio
async def test_list_for_user_unread_only():
    conn = make_conn()
    conn.fetch.return_value = [fake_row(BASE)]
    svc = NotificationService(conn)

    results = await svc.list_for_user(42, unread_only=True)
    # query should include AND is_read=FALSE
    call_args = conn.fetch.call_args[0][0]
    assert "is_read=FALSE" in call_args
    assert len(results) == 1


@pytest.mark.asyncio
async def test_mark_read_success():
    conn = make_conn()
    conn.fetchrow.return_value = fake_row({**BASE, "is_read": True})
    svc = NotificationService(conn)

    result = await svc.mark_read(1, 42)
    assert result is not None
    assert result.is_read is True


@pytest.mark.asyncio
async def test_mark_read_not_found():
    conn = make_conn()
    conn.fetchrow.return_value = None
    svc = NotificationService(conn)

    result = await svc.mark_read(999, 42)
    assert result is None


@pytest.mark.asyncio
async def test_mark_all_read():
    conn = make_conn()
    conn.execute = AsyncMock(return_value="UPDATE 3")
    svc = NotificationService(conn)

    count = await svc.mark_all_read(42)
    assert count == 3


@pytest.mark.asyncio
async def test_unread_count():
    conn = make_conn()
    conn.fetchrow.return_value = fake_row({"cnt": 7})
    svc = NotificationService(conn)

    count = await svc.unread_count(42)
    assert count == 7


@pytest.mark.asyncio
async def test_delete_success():
    conn = make_conn()
    conn.execute = AsyncMock(return_value="DELETE 1")
    svc = NotificationService(conn)

    result = await svc.delete(1, 42)
    assert result is True


@pytest.mark.asyncio
async def test_delete_not_found():
    conn = make_conn()
    conn.execute = AsyncMock(return_value="DELETE 0")
    svc = NotificationService(conn)

    result = await svc.delete(999, 42)
    assert result is False
