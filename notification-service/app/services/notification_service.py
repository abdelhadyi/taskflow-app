from typing import Optional
import asyncpg

from app.models.notification import Notification, NotificationCreate


class NotificationService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create(self, data: NotificationCreate) -> Notification:
        row = await self.conn.fetchrow(
            """
            INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            data.user_id, data.type, data.title, data.body,
            data.reference_id, data.reference_type,
        )
        return Notification(**dict(row))

    async def list_for_user(self, user_id: int, unread_only: bool = False) -> list[Notification]:
        query = "SELECT * FROM notifications WHERE user_id=$1"
        if unread_only:
            query += " AND is_read=FALSE"
        query += " ORDER BY created_at DESC LIMIT 50"
        rows = await self.conn.fetch(query, user_id)
        return [Notification(**dict(r)) for r in rows]

    async def mark_read(self, notification_id: int, user_id: int) -> Optional[Notification]:
        row = await self.conn.fetchrow(
            """
            UPDATE notifications SET is_read=TRUE
            WHERE id=$1 AND user_id=$2
            RETURNING *
            """,
            notification_id, user_id,
        )
        return Notification(**dict(row)) if row else None

    async def mark_all_read(self, user_id: int) -> int:
        result = await self.conn.execute(
            "UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE",
            user_id,
        )
        # result is like "UPDATE 5"
        try:
            return int(result.split()[-1])
        except (ValueError, IndexError):
            return 0

    async def unread_count(self, user_id: int) -> int:
        row = await self.conn.fetchrow(
            "SELECT COUNT(*) as cnt FROM notifications WHERE user_id=$1 AND is_read=FALSE",
            user_id,
        )
        return row["cnt"] if row else 0

    async def delete(self, notification_id: int, user_id: int) -> bool:
        result = await self.conn.execute(
            "DELETE FROM notifications WHERE id=$1 AND user_id=$2",
            notification_id, user_id,
        )
        return result != "DELETE 0"
