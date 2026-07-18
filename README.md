# Asala Hub — Day 1 Scaffold

An offline-first e-learning PWA. This is the Day 1 prototype skeleton featuring a Next.js frontend, a FastAPI backend with SQLModel, and a PostgreSQL database containerized via Docker.

## Project Structure

```
asala-hub/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   └── app/
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── app/
```

## Getting Started

### Prerequisites

Ensure you have the following installed:
- [Docker](https://www.docker.com/products/docker-desktop) and Docker Compose.
- [Node.js](https://nodejs.org/) (optional, for local development outside containers).
- [Python 3.11+](https://www.python.org/) (optional, for local backend development).

### Setup and Running

1. **Clone/open the repository**:
   Navigate to the root directory `Asala_Hub/`.

2. **Set up Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(A pre-configured `.env` has already been generated in the root during setup)*.

3. **Start the containers**:
   Run the following command to build and run all services:
   ```bash
   docker compose up --build
   ```

4. **Verify connection**:
   - Frontend is running at: [http://localhost:3000](http://localhost:3000)
   - Backend is running at: [http://localhost:8000](http://localhost:8000)
   - Database is accessible via container port `5432`

### Running Alembic Migrations

To apply database migrations:

1. **Generate the migration script** (already initialized):
   ```bash
   docker compose exec backend alembic revision --autogenerate -m "Initial schema"
   ```

2. **Apply the migrations to PostgreSQL**:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

3. **Verify table structure inside the database**:
   ```bash
   docker compose exec db psql -U postgres -d asalahub -c "\dt"
   ```
