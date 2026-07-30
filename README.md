# Asala Hub — Offline-First E-Learning PWA

Asala Hub is a Progressive Web Application (PWA) designed to provide continuous learning resilience in resource-constrained and low-connectivity environments. Educators author structured courses, manage cohorts, and grade submissions asynchronously, while students browse materials, complete assignments offline, and automatically synchronize changes when network connectivity is restored.

---

## Table of Contents

- [System Features](#-system-features)
- [Technology Stack](#-technology-stack)
- [Architecture Overview](#-architecture-overview)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Option 1 — Docker (Recommended)](#option-1--docker-recommended)
  - [Option 2 — Local Development (Without Docker)](#option-2--local-development-without-docker)
- [Environment Variables](#-environment-variables)
- [Database Migrations](#-database-migrations)
- [Seeding Demo Accounts](#-seeding-demo-accounts)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Production Deployment](#-production-deployment)
- [Backup & Restore](#-backup--restore)
- [Campus Mode](#-campus-mode)
- [SRS Traceability](#-srs-traceability)

---

## 🌟 System Features

### Offline-First Engine
- **Client-Side Database**: Dexie.js (IndexedDB) stores courses, modules, submissions, and transaction logs locally in the browser.
- **Transaction Log Queue**: Every offline mutation generates a timestamped, typed log entry for deterministic replay.
- **Auto Sync on Reconnect**: Network status listeners (`online`/`offline` events + heartbeats) trigger batch synchronisation automatically when connectivity is restored.
- **Conflict Resolution**: Last-Write-Wins (LWW) timestamp-based reconciliation on the FastAPI backend with duplicate detection and idempotent upserts.
- **Delta Compression**: Sync payloads are compressed via LZ-based lossless encoding before transmission to `/api/v1/sync`.

### Progressive Web App
- **Service Worker**: Workbox-powered precaching of the full app shell (JS, CSS, HTML, fonts, assets) via `next-pwa`.
- **Web App Manifest**: Installable as a native-like app on Android, iOS Safari, and desktop browsers.
- **Offline UI**: Dynamic network status banner and connectivity indicator dots; the app shell renders fully offline.

### Role-Based Portals
- **Student**: Course catalog and browser, module viewer, assignment workspace (drag-and-drop file attachments, 1.5s autosave, version snapshots, printable submission receipts), progress tracker with dynamic 4.0 GPA scale, sync queue monitor.
- **Educator**: Course builder, module studio with rich-text editor, assignment studio, gradebook with submission grading and feedback, cohort roster, performance dashboard with analytics (pass/completion rates, grade distributions).
- **Admin**: User management (create, edit, suspend, password reset, bulk CSV import), system health dashboard, audit logs, database metrics.

### Security
- **JWT Authentication**: HTTP-only cookie and bearer token dual-mode with configurable expiry.
- **AES-GCM Token Encryption**: Local tokens stored encrypted in the browser; re-authentication modal with PIN-based verification.
- **RBAC Guards**: Backend dependency injection guards enforce role-based access on every endpoint.
- **Security Headers**: GZip compression, request logging, and security header middleware.

### Internationalisation (i18n)
- **English / Arabic**: Full translation dictionary with dynamic LTR ↔ RTL layout switching in under 200ms.

---

## 🛠 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router, Turbopack), React 19, TypeScript 5.7, Tailwind CSS 4, Lucide Icons, Radix UI |
| **Offline Storage** | Dexie.js 4 (IndexedDB), Custom Transaction Log Queue |
| **PWA** | Workbox via `next-pwa`, Web App Manifest |
| **Backend** | FastAPI, Python 3.11, Uvicorn (async), SQLModel / SQLAlchemy |
| **Database** | PostgreSQL 16 (Alpine) |
| **Auth** | python-jose (JWT), Passlib + bcrypt, AES-GCM (client-side) |
| **Migrations** | Alembic (auto-run on container startup) |
| **Testing** | Pytest + HTTPX (backend), TypeScript compiler checks (frontend) |
| **Containers** | Docker + Docker Compose (dev & prod multi-stage) |
| **Backup** | Automated daily `pg_dump` cron with 14-day retention |

---

## 🏛 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (PWA)                            │
│  ┌─────────────┐  ┌──────────┐  ┌───────────┐  ┌─────────────┐ │
│  │ Service      │  │ Dexie.js │  │ Sync      │  │ Auth        │ │
│  │ Worker       │  │ IndexedDB│  │ Context   │  │ Context     │ │
│  │ (Workbox)    │  │ (db.ts)  │  │ (Sync.tsx)│  │ (Auth.tsx)  │ │
│  └──────┬───────┘  └────┬─────┘  └─────┬─────┘  └──────┬──────┘ │
│         │               │              │               │         │
│         └───────────────┴──────────────┴───────────────┘         │
│                              │ HTTP/REST                          │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Nginx / Next.js   │
                    │   :3000             │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   FastAPI Backend   │
                    │   :8000             │
                    │  ┌──────────────┐   │
                    │  │ Routers      │   │
                    │  │ auth, courses│   │
                    │  │ modules,     │   │
                    │  │ assignments, │   │
                    │  │ sync, admin  │   │
                    │  └──────┬───────┘   │
                    │  ┌──────▼───────┐   │
                    │  │ Services     │   │
                    │  │ sync_service │   │
                    │  │ auth_service │   │
                    │  │ media_service│   │
                    │  │ campus_sync  │   │
                    │  └──────┬───────┘   │
                    └─────────┼───────────┘
                              │
                    ┌─────────▼───────────┐
                    │  PostgreSQL 16      │
                    │  :5432              │
                    │  (+ daily backup)   │
                    └─────────────────────┘
```

---

## 🏗️ Project Structure

```
Asala_Hub/
├── docker-compose.yml          # Development stack (DB, Backend, Frontend, Backup)
├── docker-compose.prod.yml     # Production stack (optimised multi-stage builds)
├── .env.example                # Template environment variables
├── .env                        # Active environment config (git-ignored)
├── README.md
├── sprint_progress_report.md   # Sprint tracker & progress checklist
├── docs/
│   └── disaster-recovery.md    # Backup restore procedures
├── scripts/
│   ├── backup.sh               # Automated pg_dump backup script
│   └── restore.sh              # Point-in-time database restore script
│
├── backend/                    # FastAPI backend service
│   ├── Dockerfile              # Python 3.11-slim multi-purpose image
│   ├── entrypoint.sh           # DB wait → Alembic migrate → optional seed → start
│   ├── requirements.txt        # Python dependencies
│   ├── alembic.ini             # Alembic configuration
│   ├── alembic/                # Database migration versions
│   ├── tests/                  # Pytest test suite (43 tests)
│   │   ├── conftest.py         # Shared fixtures (test client, DB, auth helpers)
│   │   ├── test_auth.py        # Registration, login, JWT, session tests
│   │   ├── test_courses.py     # Course CRUD tests
│   │   ├── test_modules.py     # Module CRUD tests
│   │   ├── test_assignments.py # Assignment lifecycle tests
│   │   ├── test_sync.py        # Offline sync, delta, conflict resolution tests
│   │   ├── test_admin.py       # Admin endpoint tests
│   │   ├── test_admin_user_management.py  # User CRUD & role management
│   │   ├── test_media.py       # Media upload & serving tests
│   │   ├── test_backup_health.py # Backup status monitoring tests
│   │   └── test_campus_sync.py # Campus-mode sync loop tests
│   └── app/
│       ├── main.py             # FastAPI app, middleware, router registration
│       ├── core/
│       │   ├── config.py       # Pydantic Settings (env-driven configuration)
│       │   ├── database.py     # SQLModel engine & session factory
│       │   ├── security.py     # JWT creation, password hashing, verification
│       │   ├── dependencies.py # Auth guard dependency injection
│       │   ├── middleware.py   # CORS, security headers, GZip, logging
│       │   └── exceptions.py   # Custom domain exception classes
│       ├── models/
│       │   ├── user.py         # User entity (name, email, role, PIN hash)
│       │   ├── course.py       # Course entity (title, description, educator FK)
│       │   ├── module.py       # Module entity (title, content, order, media)
│       │   ├── assignment.py   # Assignment + Submission entities
│       │   ├── transaction.py  # TransactionLog for sync audit trail
│       │   ├── audit.py        # AuditLog for admin action tracking
│       │   └── base.py         # Base model with UUID + timestamp mixins
│       ├── routers/
│       │   ├── auth.py         # POST /register, /login, /logout, /me, /refresh
│       │   ├── courses.py      # CRUD /api/v1/courses
│       │   ├── modules.py      # CRUD /api/v1/courses/{id}/modules + media upload
│       │   ├── assignments.py  # CRUD /api/v1/assignments + submissions + grading
│       │   ├── sync.py         # POST /api/v1/sync (batch delta processor)
│       │   └── admin.py        # /api/v1/admin/* (users, stats, audit, health)
│       ├── crud/               # Database CRUD helper functions
│       ├── schemas/            # Pydantic request/response validation schemas
│       ├── services/
│       │   ├── sync_service.py       # Delta processing, conflict resolution engine
│       │   ├── auth_service.py       # Auth business logic layer
│       │   ├── media_service.py      # File upload & media processing
│       │   └── campus_sync_service.py# Background campus-to-campus sync loop
│       └── scripts/
│           └── seed_admin.py   # Database seeder (admin + demo educator/student)
│
└── frontend/                   # Next.js 15 PWA client
    ├── Dockerfile              # Multi-stage: base → deps → dev → builder → runner
    ├── package.json
    ├── next.config.ts          # Next.js + PWA (Workbox) configuration
    ├── tsconfig.json
    ├── public/                 # Static assets, icons, sw.js (generated)
    └── src/
        ├── app/                # Next.js App Router pages & layouts
        │   ├── layout.tsx      # Root HTML layout with providers
        │   ├── page.tsx        # Home redirect / landing
        │   ├── manifest.ts     # PWA Web App Manifest generator
        │   ├── login/          # Login page
        │   ├── register/       # Registration page
        │   └── admin/          # Admin panel route
        ├── components/
        │   ├── HomeContent.tsx  # Main dashboard router (role-based tab switching)
        │   ├── shell/          # App shell: Header, Sidebar, AppShell, SyncIndicator, Settings
        │   ├── auth/           # LoginForm, ReAuthModal
        │   ├── student/        # CourseBrowser, CourseDetail, ModuleViewerModal,
        │   │                   # AssignmentListView, AssignmentWorkspace,
        │   │                   # ProgressTracker, SyncQueueView, DashboardView
        │   ├── educator/       # CourseBuilder, ModuleStudio, ModuleEditor,
        │   │                   # AssignmentStudio, GradeBook, SubmissionGrader,
        │   │                   # CohortRoster, PerformanceDashboard
        │   ├── admin/          # AdminShell, AdminDashboardView, UserManagementView,
        │   │                   # UserDetailDrawer, CreateUserModal, BulkUserImportModal,
        │   │                   # PasswordResetModal, SuspendConfirmModal
        │   └── ui/             # StatusPill, Skeletons, InfoTooltip
        ├── context/            # React Context providers
        │   ├── AuthContext.tsx  # JWT auth state, login/logout, session keep-alive
        │   ├── SyncContext.tsx  # Offline sync engine, queue management, auto-sync
        │   ├── I18nContext.tsx  # English/Arabic i18n with RTL support
        │   ├── OverlayContext.tsx # Modal & drawer overlay management
        │   └── StorageContext.tsx # IndexedDB storage status & events
        ├── hooks/              # Custom React hooks
        │   ├── useAdminApi.ts   # Admin API operations
        │   ├── useDashboardData.ts # Dashboard data aggregation
        │   └── useStorageUpdateListener.ts # Cross-tab storage events
        ├── lib/                # Utility libraries
        │   ├── db.ts           # Dexie.js IndexedDB schema & operations
        │   ├── api.ts          # Axios HTTP client with interceptors
        │   ├── compress.ts     # LZ lossless compression for sync payloads
        │   ├── crypto.ts       # AES-GCM encrypt/decrypt for local tokens
        │   ├── rehydrate.ts    # Cache rehydration from API → IndexedDB
        │   ├── mappers.ts      # API ↔ local data type mappers
        │   ├── sanitize.ts     # DOMPurify HTML sanitisation
        │   ├── dictionary.ts   # i18n English/Arabic translation dictionary
        │   ├── messages.ts     # User-facing message constants
        │   ├── utils.ts        # Tailwind `cn()` merge utility
        │   ├── uuid.ts         # Client-side UUID generator
        │   └── view-transition.ts # View Transitions API wrapper
        └── types/              # TypeScript type definitions
            ├── api.ts          # API response/request types
            └── admin.ts        # Admin-specific types
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Required For |
| :--- | :--- | :--- |
| [Docker Desktop](https://www.docker.com/products/docker-desktop) | 20.10+ | Docker setup (recommended) |
| [Node.js](https://nodejs.org/) | 18+ (20 recommended) | Local frontend development |
| [Python](https://www.python.org/) | 3.9+ (3.11 recommended) | Local backend development |
| [PostgreSQL](https://www.postgresql.org/) | 16 | Local database (without Docker) |

---

### Option 1 — Docker (Recommended)

The fastest way to get the entire stack running. One command boots the database, backend, frontend, and automated backup sidecar.

**1. Clone and configure:**

```bash
git clone https://github.com/your-org/Asala_Hub.git
cd Asala_Hub
cp .env.example .env
```

**2. Start all services:**

```bash
docker compose up -d --build
```

This launches 4 containers:

| Container | Service | Port | Health Check |
| :--- | :--- | :--- | :--- |
| `asala_db` | PostgreSQL 16 | `5432` | `pg_isready` |
| `asala_backend` | FastAPI + Uvicorn | `8000` | `curl /healthz` |
| `asala_frontend` | Next.js 15 (dev) | `3000` | `curl /` |
| `asala_db_backup` | Daily `pg_dump` cron | — | — |

**3. Verify everything is running:**

```bash
docker compose ps
```

All containers should show `Up` and `healthy`.

**4. Access the application:**

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/healthz](http://localhost:8000/healthz)

**5. Seed demo accounts** (optional):

```bash
docker compose exec backend python -m app.scripts.seed_admin
```

Or set `AUTO_SEED=true` in `.env` before starting the containers to auto-seed on startup.

**6. View logs:**

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

**7. Stop and clean up:**

```bash
# Stop containers (preserve data)
docker compose down

# Stop containers and delete database volume
docker compose down -v
```

---

### Option 2 — Local Development (Without Docker)

For developers who prefer running services directly on their machine.

#### Step 1: Set Up PostgreSQL

Install and start PostgreSQL 16, then create the database:

```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Create the database
createdb asalahub
```

#### Step 2: Set Up the Backend

```bash
cd backend

# Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment — create a .env in the project root (or export variables)
# IMPORTANT: Change the DATABASE_URL host from "db" to "localhost"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/asalahub"
export JWT_SECRET_KEY="asala_hub_dev_secret_key_129384729384"
export ALLOWED_HOSTS="http://localhost:3000,http://127.0.0.1:3000"
export ENVIRONMENT="development"

# Run database migrations
alembic upgrade head

# (Optional) Seed demo accounts
python -m app.scripts.seed_admin

# Start the backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend is now live at [http://localhost:8000](http://localhost:8000).

#### Step 3: Set Up the Frontend

```bash
cd frontend

# Install Node.js dependencies
npm install

# Set the API URL (must point to backend)
export NEXT_PUBLIC_API_URL="http://localhost:8000"

# Start the development server (with Turbopack)
npm run dev
```

The frontend is now live at [http://localhost:3000](http://localhost:3000).

---

## 🔧 Environment Variables

All configuration is driven by the root `.env` file. Copy `.env.example` to `.env` and customise as needed.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `asalahub` | PostgreSQL database name |
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/asalahub` | Full SQLAlchemy connection string. Use `localhost` instead of `db` when running outside Docker. |
| `ENVIRONMENT` | `development` | `development` or `production` |
| `ALLOWED_HOSTS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated CORS allowed origins |
| `JWT_SECRET_KEY` | *(dev fallback)* | Secret key for JWT signing. **Change in production.** |
| `CAMPUS_MODE` | `false` | Enable campus-to-campus background sync loop |
| `AUTO_SEED` | `false` | Auto-seed admin and demo accounts on container startup |
| `RETENTION_DAYS` | `14` | Number of days to retain database backups |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL exposed to the browser. For LAN/campus deployment, set to the server's IP (e.g. `http://192.168.1.50:8000`). |

---

## 🗃 Database Migrations

Migrations are managed by [Alembic](https://alembic.sqlalchemy.org/) and run automatically on container startup via `backend/entrypoint.sh`.

```bash
# Apply all pending migrations
alembic upgrade head

# Generate a new migration after modifying SQLModel models
alembic revision --autogenerate -m "describe your changes"

# Rollback the last migration
alembic downgrade -1

# View migration history
alembic history
```

When running inside Docker:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "add new field"
```

---

## 👥 Seeding Demo Accounts

The seed script creates an admin account and optionally demo educator/student accounts:

```bash
# Inside Docker
docker compose exec backend python -m app.scripts.seed_admin

# Local development
cd backend && PYTHONPATH=. python -m app.scripts.seed_admin
```

Or set `AUTO_SEED=true` in your `.env` to seed automatically on every container start.

**Default admin credentials:**
- Email: `admin@asalahub.org`
- Password: `AdminPass123!`

---

## 📡 API Reference

The backend exposes a RESTful API. Full interactive documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI).

### Key Endpoint Groups

| Prefix | Router | Description |
| :--- | :--- | :--- |
| `POST /api/v1/auth/*` | `auth.py` | Register, login, logout, refresh, get current user |
| `GET/POST /api/v1/courses/*` | `courses.py` | Course CRUD (list, create, update, delete) |
| `GET/POST /api/v1/courses/{id}/modules/*` | `modules.py` | Module CRUD + media upload |
| `GET/POST /api/v1/assignments/*` | `assignments.py` | Assignment CRUD, submission, grading |
| `POST /api/v1/sync` | `sync.py` | Batch delta sync processor (offline → server) |
| `GET/POST /api/v1/admin/*` | `admin.py` | User management, system stats, audit logs |
| `GET /health` | `main.py` | Liveness check |
| `GET /healthz` | `main.py` | Readiness check (DB connection + backup freshness) |

---

## 🧪 Testing

### Backend Test Suite (43 tests)

```bash
cd backend

# Using the virtual environment
PYTHONPATH=. venv/bin/pytest

# With verbose output
PYTHONPATH=. venv/bin/pytest -v

# Run a specific test file
PYTHONPATH=. venv/bin/pytest tests/test_sync.py -v

# Inside Docker
docker compose exec backend pytest
```

**Test coverage breakdown:**

| Test File | Tests | Covers |
| :--- | :--- | :--- |
| `test_auth.py` | 9 | Registration, login, JWT, sessions, RBAC |
| `test_courses.py` | 4 | Course CRUD operations |
| `test_modules.py` | 1 | Module creation and retrieval |
| `test_assignments.py` | 1 | Assignment lifecycle |
| `test_sync.py` | 9 | Offline sync, delta payloads, conflict resolution |
| `test_admin.py` | 3 | Admin endpoints and permissions |
| `test_admin_user_management.py` | 7 | User CRUD, role management, suspension |
| `test_media.py` | 2 | Media upload and serving |
| `test_backup_health.py` | 3 | Backup status and staleness monitoring |
| `test_campus_sync.py` | 4 | Campus-mode background sync |

### Frontend Type Checking

```bash
cd frontend
npx tsc --noEmit
```

---

## 🚢 Production Deployment

Use the production Docker Compose file for optimised, multi-stage production builds:

```bash
# Build and start production stack
docker compose -f docker-compose.prod.yml up -d --build
```

**Production differences:**
- Frontend uses the `runner` stage (standalone Next.js output, ~50MB vs full dev image).
- Backend runs with `--workers 4` for multi-process concurrency.
- Database port (`5432`) is not exposed externally.
- Named Docker volumes for persistent data (`postgres_data_prod`, `backend_uploads_prod`, `backups_prod`).
- `NODE_ENV=production` and `ENVIRONMENT=production` are enforced.

> ⚠️ **Important**: Set a strong `JWT_SECRET_KEY` and change default database credentials before deploying to production.

---

## 💾 Backup & Restore

### Automated Backups

The `db-backup` sidecar container runs `pg_dump` daily at 02:00 UTC and retains backups for 14 days (configurable via `RETENTION_DAYS`).

Backups are stored in `./backups/` (dev) or a named volume (prod).

### Manual Backup

```bash
docker compose exec db pg_dump -U postgres asalahub > backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
# Using the restore script
./scripts/restore.sh backups/asalahub_20260730_020000.sql.gz
```

See [docs/disaster-recovery.md](docs/disaster-recovery.md) for full disaster recovery procedures.

---

## 🏫 Campus Mode

Set `CAMPUS_MODE=true` in `.env` to enable the background campus-to-campus sync loop. This allows multiple Asala Hub instances on a local network to synchronise course content and submissions between servers.

For LAN deployments, update `NEXT_PUBLIC_API_URL` and `ALLOWED_HOSTS` to the server's IP address:

```env
NEXT_PUBLIC_API_URL=http://192.168.1.50:8000
ALLOWED_HOSTS=http://192.168.1.50:3000,http://localhost:3000
```

---

## 📊 SRS Traceability

### Implementation Status (§4)

| Req ID | Requirement Title | Status | Key Components |
| :--- | :--- | :--- | :--- |
| **FR 1.1** | Local Static Asset Caching | ✅ 100% | Service Worker, Workbox precaching |
| **FR 1.2** | Offline Course Navigation | ✅ 100% | `CourseBrowser.tsx`, Dexie.js cache |
| **FR 2.1** | Local IndexedDB Write | ✅ 100% | `db.ts`, `AssignmentWorkspace.tsx` |
| **FR 2.2** | Transaction Log Queueing | ✅ 100% | `sync.ts`, `db.transactionLogs` |
| **FR 3.1** | Network Status Detection | ✅ 100% | `SyncContext.tsx`, online/offline events |
| **FR 3.2** | Delta Payload Transmission | ✅ 100% | `POST /api/v1/sync`, `compress.ts` |
| **FR 3.3** | Conflict State Resolution | ✅ 100% | `sync_service.py` (LWW) |
| **FR 4.1** | Automated Media Interception | ⚠️ Partial | `media_service.py`, module media upload |
| **FR 4.2** | Video-to-Audio Transcoding | ⚠️ Partial | `media_service.py` |
| **FR 5.1** | Offline Lesson Compiling | ✅ 100% | `ModuleStudio.tsx`, `ModuleEditor.tsx` |
| **FR 5.2** | Asynchronous Grade Updating | ✅ 100% | `GradeBook.tsx`, `SubmissionGrader.tsx` |
| **FR 6.1** | Portfolio Studio Creation | 📄 Deferred | Out of 3-week prototype scope |
| **FR 7** | Marketplace Checkout | 📄 Deferred | Out of 3-week prototype scope |

### Non-Functional Requirements

| Req ID | Requirement Title | Status | Verification |
| :--- | :--- | :--- | :--- |
| **NFR 1** | Local Offline Security | ✅ 100% | AES-GCM token encryption, ReAuthModal |
| **NFR 2** | Resource Constraints | ✅ 100% | Docker resource limits, lightweight containers |
| **NFR 3** | Bidirectional i18n | ✅ 100% | `I18nContext.tsx`, <200ms LTR/RTL toggle |
| **NFR 4** | Storage Footprint | ✅ 100% | PWA build <20MB |
| **NFR 5** | High-Concurrency Sync | ✅ 100% | FastAPI async uvicorn event loop |
| **NFR 6** | Fault-Tolerant Resiliency | ✅ 100% | Exponential backoff retry in `SyncContext.tsx` |
| **NFR 7** | Multi-Environment Docker | ✅ 100% | `docker-compose.yml` + `docker-compose.prod.yml` |

### Requirement Traceability Matrix (§9)

| Req ID | Backend API / Service | Frontend Component | Test File |
| :--- | :--- | :--- | :--- |
| **FR 1.1** | N/A | `ServiceWorkerRegister.tsx`, Workbox | Lighthouse PWA Audit |
| **FR 1.2** | `/api/v1/courses`, `/api/v1/modules` | `CourseBrowser.tsx`, `db.ts` | `test_courses.py` |
| **FR 2.1** | N/A | `db.ts`, `AssignmentWorkspace.tsx` | `test_assignments.py` |
| **FR 2.2** | N/A | `SyncContext.tsx`, `db.transactionLogs` | `test_sync.py` |
| **FR 3.1** | N/A | `SyncContext.tsx`, `SyncIndicator.tsx` | `test_sync.py` |
| **FR 3.2** | `POST /api/v1/sync` | `SyncContext.tsx`, `compress.ts` | `test_sync.py` |
| **FR 3.3** | `sync_service.py` | `ProgressTracker.tsx` | `test_sync.py` |
| **FR 4.1** | `POST /api/v1/modules/{id}/media` | `ModuleEditor.tsx` | `test_media.py` |
| **FR 4.2** | `media_service.py` | `ModuleViewerModal.tsx` | `test_media.py` |
| **FR 5.1** | `POST /api/v1/modules` | `ModuleStudio.tsx`, `ModuleEditor.tsx` | `test_modules.py` |
| **FR 5.2** | `POST /api/v1/assignments/{id}/grade` | `GradeBook.tsx`, `SubmissionGrader.tsx` | `test_assignments.py` |
| **NFR 1** | `security.py` | `ReAuthModal.tsx`, `crypto.ts` | `test_auth.py` |
| **NFR 5** | FastAPI async | `SyncContext.tsx` | `test_sync.py` |
| **NFR 7** | `Dockerfile`, `entrypoint.sh` | `Dockerfile` | Docker Compose boot |
