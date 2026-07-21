# Asala Hub — Sprint Progress Report

**Date of Report:** July 19, 2026
**Current Phase:** Sprint 1 Completed — Moving to Sprint 2 (Offline Sync Engine)

---

## Executive Summary
As of today (Sunday, July 19, 2026), **Sprint 1 (Foundation)** is 100% completed. The initial architectural foundation, Docker configuration, database schema, backend authentication system, courses CRUD, database seed script, and the Next.js frontend (including registration, login, and dashboard views) are fully completed.

Additionally, the entire frontend was redesigned to be **minimal, elegant, and optimized for low-power/old hardware interfaces**. It features:
*   A refined neutral warm-paper palette (`#FAF9F6`) with graphite charcoal text.
*   System default font stack rendering with zero-network font requests.
*   GPU-saving flat cards (no blurs, box-shadows, or transitions).
*   A single-column tabbed Educator workspace which cuts the active browser DOM nodes by ~50%.
*   Click-to-load video placeholders that lazy-load `<iframe>` players to prevent RAM exhaustion.
*   A type-safe Next.js manifest PWA setup registered client-side with workbox.

---

## 📋 Detailed Progress Checklist

### Sprint 1 — Foundation (Mon Jul 13 – Sun Jul 19)
- [x] **Mon 7/13**: Repo + `docker-compose.yml` (FastAPI, Postgres); SQLModel schema — User, Course, Module, Assignment, Submission, TransactionLog; first Alembic migration
  - [x] **Docker Setup:** Configured multi-container environment in [docker-compose.yml](file:///Users/nawafawad/Desktop/Asala_Hub/docker-compose.yml).
  - [x] **Database Schemas:** SQLModel database entities defined in [entities.py](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/models/entities.py).
  - [x] **Database Migrations:** Initial Alembic migration and indexing optimization migrations set up in [alembic/versions](file:///Users/nawafawad/Desktop/Asala_Hub/backend/alembic/versions).
- [x] **Tue 7/14**: Auth: JWT register/login, bcrypt hashing, role field (student/educator), RBAC dependency
  - [x] **Endpoints:** JWT registration, login, and `/auth/me` endpoints written in [auth.py](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/routers/auth.py).
  - [x] **Security & Hashing:** Password hashing with bcrypt configured in [security.py](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/security.py).
  - [x] **RBAC / Auth Guards:** User role checks and OAuth2 dependencies created in [dependencies.py](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/dependencies.py).
- [x] **Wed 7/15**: Course + Module CRUD (educator writes, both read); seed script — 1 educator, 1 student, 1 course, 3 modules
  - [x] **Base Router:** API router setup in [courses.py](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/routers/courses.py).
  - [x] **CRUD Logic:** Implemented Course & Module CRUD routes (including new `PUT` and `DELETE` hooks).
  - [x] **Seed Script:** Database population script for mock data.
- [x] **Thu 7/16**: Next.js scaffold (App Router + Tailwind); layout shell with placeholder Sync Status bar; login/register pages wired to API
  - [x] **Next.js Scaffold:** Configured in the [frontend/](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/) directory.
  - [x] **Responsive Shell:** Header layout, navigation structure, and status indicator built in [layout.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/app/layout.tsx).
  - [x] **Auth Pages:** Login/Register pages and API wiring implemented on the frontend.
- [x] **Fri 7/17**: Educator dashboard (create course/module) + student dashboard (browse/view), wired end to end
- [x] **Sat 7/18**: PWA manifest + Workbox service worker registration — app-shell precache only; mobile-responsive pass
  - [x] **Manifest Route:** Created type-safe Next.js manifest in [manifest.ts](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/app/manifest.ts) and generated icons.
  - [x] **Workbox SW & Precaching:** Integrated `@ducanh2912/next-pwa` in [next.config.ts](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/next.config.ts) and registered SW client-side in [ServiceWorkerRegister.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/ServiceWorkerRegister.tsx).
  - [x] **Offline shell UI:** Added connection status watchdog banner and sync alert indicators in [LayoutShell.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/LayoutShell.tsx).
  - [x] **Mobile Responsiveness:** Polished mobile views on layout, login/register pages, and dashboards.
- [x] **Sun 7/19**: Sprint Review & Online Demo Flow
  - [x] **Syllabus Outline Tree:** Drag-reorder and delete operations verified.
  - [x] **Classroom Viewer:** Responsive grid discovery, pre-fetching logic, and completion status indicator checks successfully passed.
  - [x] **Backend Modularization & Optimizations:** Refactored backend architecture into distinct packages (core, models, schemas, crud, routers), resolved login timing attacks, standardized JWT epoch expirations, and optimized module syllabus queries using SQLAlchemy deferral.


---

### Sprint 2 — Offline Sync Engine (Mon Jul 20 – Sun Jul 26)
- [x] **Mon 7/20**: Add Dexie.js; define local schema mirroring TransactionLog + a Course/Module cache table
  - [x] Created `frontend/lib/db.ts` with versioned stores (`courses`, `modules`, `assignments`, `submissions`, `transactionLogs`).
  - [x] Implemented `frontend/lib/offline-store.ts` for atomic offline writes and local cache management.
- [x] **Tue 7/21**: Extend Workbox to runtime-cache Course/Module API responses; verify cached content renders with DevTools offline mode on
  - [x] Extended `runtimeCaching` in `frontend/next.config.ts` with `NetworkFirst` strategy for API routes.
- [x] **Wed 7/22**: Offline-aware assignment submission: write straight to Dexie + create a timestamped TransactionLog entry regardless of connection state; "Saved — will sync when connected" UI
  - [x] Built reactive `AssignmentSubmission.tsx` form with Dexie `useLiveQuery` sync status badges.
- [x] **Thu 7/23**: Network status detection (online/offline events + heartbeats); trigger `syncNow()` on reconnect
  - [x] Connected real batch sync engine trigger in `frontend/lib/connectivity-context.tsx` with live pending transaction counter.
- [x] **Fri 7/24**: Build the delta payload from unsynced logs, batch into compressed JSON, POST to FastAPI `/sync` endpoint
  - [x] Created `backend/app/schemas/sync.py`, `backend/app/crud/sync.py`, and `backend/app/routers/sync.py` exposing `POST /sync` with idempotency guards.
- [x] **Sat 7/25**: Wire success/failure handling, status UI updates, retries
  - [x] Implemented batch synchronization manager in `frontend/lib/sync.ts` with retry limits and status updates.
- [x] **Sun 7/26**: Sprint Review (Demonstrate offline submission to Postgres sync)

### Sprint 3 — Grading Loop, Polish, Triage (Mon Jul 27 – Sun Aug 2)
- [ ] **Mon 7/27**: Educator: submissions list & grading UI
- [ ] **Tue 7/28**: Student: sync progress tracker
- [ ] **Wed 7/29**: Triage checkpoint
- [ ] **Thu 7/30**: Stretch item part 1
- [ ] **Fri 7/31**: Stretch item part 2 / buffer
- [ ] **Sat 8/1**: Bug bash & simulated packet-loss resilience testing
- [ ] **Sun 8/2**: Clean deploy validation & backup demo video

---

## 🛠️ Summary of Active Codebase References

### Backend Services
*   **Infrastructure (Core Config, DB Connection, Security):**
    *   Database Engine Setup: [database.py](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/core/database.py)
    *   System Configurations: [config.py](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/core/config.py)
    *   Security & JWT Cryptography: [security.py](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/core/security.py)
    *   Auth Guards & Dependencies: [dependencies.py](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/core/dependencies.py)
*   **Database Models Package:** [models/](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/models) (including `user.py`, `course.py`, `module.py`, `assignment.py`, `transaction.py`)
*   **API Router Controllers:** [routers/](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/routers) (including `auth.py`, `courses.py`, `modules.py`)
*   **Pydantic Validation Schemas:** [schemas/](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/schemas) (including `auth.py`, `courses.py`, `modules.py`)
*   **Database CRUD Services:** [crud/](file:///Users/nawafawad/Desktop/Asala_Hub/backend/app/crud) (including `user.py`, `courses.py`, `modules.py`)


### Frontend Client
*   **Root Layout:** [layout.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/app/layout.tsx)
*   **Layout Shell:** [LayoutShell.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/LayoutShell.tsx)
*   **Web App Manifest:** [manifest.ts](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/app/manifest.ts)
*   **SW Registration Component:** [ServiceWorkerRegister.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/ServiceWorkerRegister.tsx)
*   **Connectivity context:** [connectivity-context.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/lib/connectivity-context.tsx)
*   **API Client:** [api.ts](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/lib/api.ts)
*   **Auth Context:** [auth-context.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/lib/auth-context.tsx)
*   **Login Page:** [login/page.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/app/login/page.tsx)
*   **Register Page:** [register/page.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/app/register/page.tsx)
*   **Dashboard Router:** [dashboard/page.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/app/dashboard/page.tsx)
*   **Home Redirect View:** [page.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/app/page.tsx)
*   **Educator Dashboard:** [EducatorDashboard.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/EducatorDashboard.tsx)
    *   [CourseOutline.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/educator/CourseOutline.tsx)
    *   [ModuleEditor.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/educator/ModuleEditor.tsx)
    *   [CourseConfig.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/educator/CourseConfig.tsx)
    *   [ContentBlock.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/shared/ContentBlock.tsx)
*   **Student Dashboard:** [StudentDashboard.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/StudentDashboard.tsx)
    *   [CourseCatalog.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/student/CourseCatalog.tsx)
    *   [CourseViewer.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/student/CourseViewer.tsx)
    *   [LessonNav.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/student/LessonNav.tsx)
    *   [LessonContent.tsx](file:///Users/nawafawad/Desktop/Asala_Hub/frontend/components/student/LessonContent.tsx)
