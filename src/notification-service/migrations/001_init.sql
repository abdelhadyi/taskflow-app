-- migrations/001_init.sql

CREATE TABLE IF NOT EXISTS notifications (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL,
    type           VARCHAR(100) NOT NULL,
    title          VARCHAR(300) NOT NULL,
    body           TEXT         NOT NULL DEFAULT '',
    is_read        BOOLEAN      NOT NULL DEFAULT FALSE,
    reference_id   BIGINT,
    reference_type VARCHAR(50),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user       ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id) WHERE is_read = FALSE;
