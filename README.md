# TaskFlow — Microservices Project Management System

A full-stack, 3-tier microservices application for team project and task management.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Tier 1 – Presentation                                   │
│  React + TypeScript (nginx :80)                          │
└────────────────────┬────────────────────────────────────┘
                     │ /api/*
┌────────────────────▼────────────────────────────────────┐
│  Tier 2 – Application                                    │
│                                                          │
│  API Gateway (Node.js :3000)                             │
│    │          │           │              │               │
│  User      Project      Task       Notification          │
│  Service   Service     Service      Service              │
│  (Go:8001) (Py:8002)  (Go:8003)   (Py:8004)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Tier 3 – Data                                           │
│  PostgreSQL (4 logical databases)                        │
│  users_db · projects_db · tasks_db · notifications_db   │
└─────────────────────────────────────────────────────────┘
```

## Services

| Service | Language | Port | Responsibility |
|---|---|---|---|
| **Frontend** | React + TypeScript | 80 | UI – Dashboard, Kanban board, Notifications |
| **API Gateway** | Node.js (Express) | 3000 | Auth middleware, JWT validation, reverse proxy |
| **User Service** | Go (Gin) | 8001 | Registration, login, JWT issuance, profiles |
| **Project Service** | Python (FastAPI) | 8002 | Projects CRUD, membership management |
| **Task Service** | Go (Gin) | 8003 | Tasks CRUD, comments, status workflow |
| **Notification Service** | Python (FastAPI) | 8004 | Notifications, read/unread tracking |

## Quick Start

```bash
# 1. Clone & enter
git clone <repo> && cd taskflow

# 2. Configure environment
cp .env.example .env
# Edit .env if needed

# 3. Build and run all services
docker-compose up --build

# 4. Open in browser
open http://localhost
```

> First boot: PostgreSQL will run `scripts/init-dbs.sql` automatically to create
> all 4 databases and their schemas.

## Running Tests

Each service has its own test command:

```bash
# API Gateway (Node.js / Jest)
cd api-gateway && npm install && npm test

# User Service (Go)
cd user-service && go test ./tests/... -v

# Task Service (Go)
cd task-service && go test ./tests/... -v

# Project Service (Python / pytest)
cd project-service && pip install -r requirements.txt && pytest

# Notification Service (Python / pytest)
cd notification-service && pip install -r requirements.txt && pytest

# Frontend (Vitest)
cd frontend && npm install && npm test
```

## API Reference

All requests go through the gateway at `http://localhost:3000`.
Protected routes require: `Authorization: Bearer <token>`

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/users/register` | ❌ | Register new user |
| POST | `/api/users/login` | ❌ | Login, returns JWT |
| GET | `/api/users/me` | ✅ | Get own profile |
| PUT | `/api/users/me` | ✅ | Update profile |
| GET | `/api/users/` | ✅ | List all users |

### Projects
| Method | Path | Description |
|---|---|---|
| GET | `/api/projects/` | List my projects |
| POST | `/api/projects/` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/members` | List members |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Tasks
| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks/?project_id=X` | List tasks (filter by project) |
| POST | `/api/tasks/` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/tasks/:id/comments` | List comments |
| POST | `/api/tasks/:id/comments` | Add comment |

### Notifications
| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications/` | List notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

## Project Structure

```
taskflow/
├── api-gateway/          # Node.js reverse proxy + JWT auth
│   ├── src/index.js
│   ├── tests/
│   ├── package.json
│   └── Dockerfile
├── user-service/         # Go – users & auth
│   ├── cmd/main.go
│   ├── internal/
│   │   ├── model/
│   │   ├── repository/
│   │   ├── service/
│   │   └── handler/
│   ├── migrations/
│   ├── tests/
│   └── Dockerfile
├── project-service/      # Python/FastAPI – projects
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── services/
│   │   └── db/
│   ├── migrations/
│   ├── tests/
│   └── Dockerfile
├── task-service/         # Go – tasks & comments
│   ├── cmd/main.go
│   ├── internal/
│   ├── migrations/
│   ├── tests/
│   └── Dockerfile
├── notification-service/ # Python/FastAPI – notifications
│   ├── app/
│   ├── migrations/
│   ├── tests/
│   └── Dockerfile
├── frontend/             # React + TypeScript
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   ├── store/
│   │   └── types/
│   ├── nginx.conf
│   └── Dockerfile
├── scripts/
│   └── init-dbs.sql      # Creates all 4 DBs on first boot
├── docker-compose.yml
└── .env.example
```
