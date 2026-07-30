#!/bin/sh
set -e

# Asala Hub Backend Entrypoint Script
# Waits for database readiness, executes Alembic migrations, optionally seeds initial data, and executes main command.

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@db:5432/asalahub}"

echo "[entrypoint] Waiting for database connection..."
python -c "
import time, sys, os, psycopg2
db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/asalahub')
retries = 30
while retries > 0:
    try:
        conn = psycopg2.connect(db_url)
        conn.close()
        print('[entrypoint] Database connection successful.')
        sys.exit(0)
    except Exception as err:
        retries -= 1
        time.sleep(1)
print('[entrypoint] ERROR: Could not connect to database after 30 seconds.')
sys.exit(1)
"

echo "[entrypoint] Running database migrations (alembic upgrade head)..."
alembic upgrade head

if [ "${AUTO_SEED:-false}" = "true" ]; then
    echo "[entrypoint] AUTO_SEED is enabled. Seeding admin user and mock accounts..."
    python -m app.scripts.seed_admin || echo "[entrypoint] WARNING: Auto-seeding failed or partially completed."
fi

echo "[entrypoint] Starting backend application..."
exec "$@"
