import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.project_service import ProjectService
from app.models.project import ProjectCreate, ProjectUpdate, MemberCreate


def make_conn():
    """Return a mock asyncpg connection."""
    conn = AsyncMock()
    return conn


def fake_row(data: dict):
    return data


PROJECT_ROW = {
    "id": 1, "name": "Alpha", "description": "desc", "color": "#fff",
    "status": "active", "owner_id": 42,
    "created_at": __import__("datetime").datetime(2024, 1, 1),
    "updated_at": __import__("datetime").datetime(2024, 1, 1),
}

MEMBER_ROW = {
    "project_id": 1, "user_id": 42, "role": "owner",
    "joined_at": __import__("datetime").datetime(2024, 1, 1),
}


@pytest.mark.asyncio
async def test_create_project():
    conn = make_conn()
    conn.fetchrow.return_value = fake_row(PROJECT_ROW)
    conn.execute = AsyncMock()

    svc = ProjectService(conn)
    result = await svc.create(42, ProjectCreate(name="Alpha", description="desc", color="#fff"))

    assert result.id == 1
    assert result.name == "Alpha"
    conn.execute.assert_called_once()  # member insert


@pytest.mark.asyncio
async def test_get_project_found():
    conn = make_conn()
    conn.fetchrow.return_value = fake_row(PROJECT_ROW)

    svc = ProjectService(conn)
    result = await svc.get(1, 42)

    assert result is not None
    assert result.owner_id == 42


@pytest.mark.asyncio
async def test_get_project_not_found():
    conn = make_conn()
    conn.fetchrow.return_value = None

    svc = ProjectService(conn)
    result = await svc.get(99, 42)

    assert result is None


@pytest.mark.asyncio
async def test_list_for_user():
    conn = make_conn()
    conn.fetch.return_value = [fake_row(PROJECT_ROW), fake_row({**PROJECT_ROW, "id": 2, "name": "Beta"})]

    svc = ProjectService(conn)
    results = await svc.list_for_user(42)

    assert len(results) == 2


@pytest.mark.asyncio
async def test_update_project_as_owner():
    conn = make_conn()
    owner_member_row = fake_row({"role": "owner"})
    updated_row = fake_row({**PROJECT_ROW, "name": "Updated"})
    conn.fetchrow.side_effect = [owner_member_row, updated_row]

    svc = ProjectService(conn)
    result = await svc.update(1, 42, ProjectUpdate(name="Updated"))

    assert result.name == "Updated"


@pytest.mark.asyncio
async def test_update_project_forbidden():
    conn = make_conn()
    conn.fetchrow.return_value = fake_row({"role": "viewer"})

    svc = ProjectService(conn)
    result = await svc.update(1, 99, ProjectUpdate(name="Hack"))

    assert result is None


@pytest.mark.asyncio
async def test_delete_project_as_owner():
    conn = make_conn()
    conn.fetchrow.return_value = fake_row({"role": "owner"})
    conn.execute = AsyncMock()

    svc = ProjectService(conn)
    result = await svc.delete(1, 42)

    assert result is True


@pytest.mark.asyncio
async def test_delete_project_not_owner():
    conn = make_conn()
    conn.fetchrow.return_value = fake_row({"role": "member"})

    svc = ProjectService(conn)
    result = await svc.delete(1, 99)

    assert result is False


@pytest.mark.asyncio
async def test_add_member_as_admin():
    conn = make_conn()
    conn.fetchrow.side_effect = [
        fake_row({"role": "admin"}),
        fake_row(MEMBER_ROW),
    ]

    svc = ProjectService(conn)
    result = await svc.add_member(1, 42, MemberCreate(user_id=7, role="member"))

    assert result is not None


@pytest.mark.asyncio
async def test_add_member_forbidden():
    conn = make_conn()
    conn.fetchrow.return_value = fake_row({"role": "viewer"})

    svc = ProjectService(conn)
    result = await svc.add_member(1, 99, MemberCreate(user_id=7, role="member"))

    assert result is None
