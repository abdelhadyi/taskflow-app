-- scripts/init-dbs.sql
-- Runs once when the postgres container starts for the first time.
-- Creates the 3 extra databases (users_db is already the default POSTGRES_DB).

SELECT 'CREATE DATABASE projects_db OWNER taskflow'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'projects_db')\gexec

SELECT 'CREATE DATABASE tasks_db OWNER taskflow'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tasks_db')\gexec

SELECT 'CREATE DATABASE notifications_db OWNER taskflow'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notifications_db')\gexec

-- ── users_db ──────────────────────────────────────────────────────────────────
\c users_db

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'member',
    avatar_url    TEXT         NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── projects_db ───────────────────────────────────────────────────────────────
\c projects_db

CREATE TABLE IF NOT EXISTS projects (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    color       VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
    status      VARCHAR(50)  NOT NULL DEFAULT 'active',
    owner_id    BIGINT       NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id  BIGINT      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     BIGINT      NOT NULL,
    role        VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── tasks_db ─────────────────────────────────────────────────────────────────
\c tasks_db

CREATE TABLE IF NOT EXISTS tasks (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT       NOT NULL,
    title       VARCHAR(500) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    status      VARCHAR(50)  NOT NULL DEFAULT 'todo',
    priority    VARCHAR(50)  NOT NULL DEFAULT 'medium',
    assignee_id BIGINT,
    creator_id  BIGINT       NOT NULL,
    due_date    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_comments (
    id         BIGSERIAL PRIMARY KEY,
    task_id    BIGINT      NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_project  ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_task  ON task_comments(task_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── notifications_db ─────────────────────────────────────────────────────────
\c notifications_db

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
