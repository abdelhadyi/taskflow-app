from typing import Optional
import asyncpg

from app.models.project import ProjectCreate, ProjectUpdate, Project, MemberCreate, Member


class ProjectService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create(self, owner_id: int, data: ProjectCreate) -> Project:
        row = await self.conn.fetchrow(
            """
            INSERT INTO projects (name, description, color, owner_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            data.name, data.description, data.color, owner_id,
        )
        # Also add owner as a member
        await self.conn.execute(
            "INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'owner')",
            row["id"], owner_id,
        )
        return Project(**row)

    async def get(self, project_id: int, user_id: int) -> Optional[Project]:
        row = await self.conn.fetchrow(
            """
            SELECT p.* FROM projects p
            JOIN project_members pm ON pm.project_id = p.id
            WHERE p.id = $1 AND pm.user_id = $2
            """,
            project_id, user_id,
        )
        return Project(**row) if row else None

    async def list_for_user(self, user_id: int) -> list[Project]:
        rows = await self.conn.fetch(
            """
            SELECT p.* FROM projects p
            JOIN project_members pm ON pm.project_id = p.id
            WHERE pm.user_id = $1
            ORDER BY p.created_at DESC
            """,
            user_id,
        )
        return [Project(**r) for r in rows]

    async def update(self, project_id: int, user_id: int, data: ProjectUpdate) -> Optional[Project]:
        # Only owner/admin can update
        member = await self.conn.fetchrow(
            "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
            project_id, user_id,
        )
        if not member or member["role"] not in ("owner", "admin"):
            return None

        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if not updates:
            return await self.get(project_id, user_id)

        set_clause = ", ".join(f"{k}=${i+2}" for i, k in enumerate(updates))
        values = list(updates.values())
        row = await self.conn.fetchrow(
            f"UPDATE projects SET {set_clause}, updated_at=NOW() WHERE id=$1 RETURNING *",
            project_id, *values,
        )
        return Project(**row) if row else None

    async def delete(self, project_id: int, user_id: int) -> bool:
        member = await self.conn.fetchrow(
            "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
            project_id, user_id,
        )
        if not member or member["role"] != "owner":
            return False
        await self.conn.execute("DELETE FROM projects WHERE id=$1", project_id)
        return True

    async def add_member(self, project_id: int, requester_id: int, data: MemberCreate) -> Optional[Member]:
        member = await self.conn.fetchrow(
            "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
            project_id, requester_id,
        )
        if not member or member["role"] not in ("owner", "admin"):
            return None
        row = await self.conn.fetchrow(
            """
            INSERT INTO project_members (project_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (project_id, user_id) DO UPDATE SET role=EXCLUDED.role
            RETURNING *
            """,
            project_id, data.user_id, data.role,
        )
        return Member(**row) if row else None

    async def list_members(self, project_id: int, user_id: int) -> list[Member]:
        # must be a member to view members
        rows = await self.conn.fetch(
            """
            SELECT pm.* FROM project_members pm
            WHERE pm.project_id=$1
              AND EXISTS (SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2)
            ORDER BY pm.joined_at
            """,
            project_id, user_id,
        )
        return [Member(**r) for r in rows]

    async def remove_member(self, project_id: int, requester_id: int, target_user_id: int) -> bool:
        member = await self.conn.fetchrow(
            "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
            project_id, requester_id,
        )
        if not member or member["role"] not in ("owner", "admin"):
            return False
        result = await self.conn.execute(
            "DELETE FROM project_members WHERE project_id=$1 AND user_id=$2 AND role != 'owner'",
            project_id, target_user_id,
        )
        return result != "DELETE 0"
