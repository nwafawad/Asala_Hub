# Asala Hub — Offline-First E-Learning PWA

Asala Hub is a Progressive Web Application (PWA) designed to provide continuous learning resilience. It allows educators to create structured courses and modules, and students to browse materials, work offline, and automatically synchronize submissions when connectivity is restored.

## System Features

- **Containerized Stack**: Multi-container environment running PostgreSQL, FastAPI, and Next.js (App Router + Tailwind CSS).
- **Secure Authentication**: JWT-based user registration and login with Role-Based Access Control (Educators vs. Students) and HttpOnly cookies / bearer tokens.
- **Course & Module Management**: Full CRUD capabilities for courses, modules, and assignment content.
- **Offline Sync Engine (Sprint 2)**: Client-side Dexie IndexedDB queue for offline action staging, conflict-resilient batch synchronization API (`/api/v1/sync/`), and transactional mutation processing.
- **Web App Manifest & Precaching**: Natively integrated PWA Manifest and Workbox service worker precaching of the app shell (JS, CSS, HTML, fonts, and assets).
- **Graceful Offline UI**: Dynamic network status listeners (`navigator.onLine` + browser events) with connection indicator dots and warning banners when offline.
- **Mobile-Responsive Sizing**: Fully optimized layouts across common smartphone screen widths (375px – 428px).

---

## Project Structure

```
Asala_Hub/
├── docker-compose.yml       # DB, Backend, and Frontend containers (Development)
├── docker-compose.prod.yml  # Production multi-container composition
├── .env.example             # Template environment variables
├── README.md                # System documentation
├── sprint_progress_report.md# Sprint tracker checklist
├── backend/                 # FastAPI + SQLModel backend service
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini          # Alembic migrations configuration
│   ├── alembic/             # Migration history versions
│   └── app/                 # FastAPI routers, schemas, CRUD, and models
│       ├── core/            # Config, security, and auth dependencies
│       ├── crud/            # CRUD helper controllers & sync processors
│       ├── models/          # SQLModel database schemas
│       ├── routers/         # REST API endpoints
│       └── schemas/         # Pydantic request/response schemas
└── frontend/                # Next.js App Router client app
    ├── Dockerfile
    ├── package.json
    ├── next.config.ts       # next-pwa compiler configurations
    ├── app/                 # Main page routes & layouts (with manifest.ts)
    ├── components/          # Shell, dashboard, and editor views
    └── lib/                 # IndexedDB client database & sync worker (`sync.ts`)
```

---

## Getting Started

### Prerequisites

Ensure you have the following installed:
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Compose)
- [Node.js](https://nodejs.org/) (optional, for local development/build testing outside containers)

### Docker Environment Setup

1. **Set up Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(A pre-configured `.env` has already been generated in the root during setup)*.

2. **Start the Docker Stack**:
   Build and start the PostgreSQL database, FastAPI backend, and Next.js frontend services:
   ```bash
   docker compose up -d --build
   ```
   *(Use `-V` / `--renew-anon-volumes` if you've added new dependencies to refresh container node_modules volumes: `docker compose up -d -V --build`)*.

3. **Verify running containers**:
   - Next.js Frontend: [http://localhost:3000](http://localhost:3000)
   - FastAPI Backend: [http://localhost:8000](http://localhost:8000)
   - FastAPI API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

4. **Initialize Database Tables (Migrations)**:
   Apply migration head to configure database schemas:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

5. **Seed Initial Mock Data**:
   Populate initial mock data (creates 1 educator, 1 student, 1 course, and 3 modules):
   ```bash
   docker compose exec backend python -m app.scripts.seed
   ```

---

## Running PWA Local Production Build

To test service worker caching, installability, and full offline capabilities, run the Next.js production build:

1. **Install dependencies and compile**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   *(This triggers `next build --webpack` to generate the custom service worker `/sw.js` and Workbox caching scripts in the `public/` folder)*.

2. **Start the production server**:
   ```bash
   npm run start
   ```

3. **Test Offline Rendering**:
   - Open browser to `http://localhost:3000`.
   - Open DevTools > Network tab, and check the **Offline** checkbox.
   - Reload the page. The app shell will continue to render.
   - The layout banner will notify you: *You're offline — some data may not be available*.

