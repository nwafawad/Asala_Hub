#!/bin/bash
set -e

# Database Restoration Script for Asala Hub
# Restores a specified pg_dump SQL or SQL.GZ backup into a PostgreSQL database instance.

if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_backup_file> [postgres_host] [postgres_port] [postgres_user] [postgres_db]"
    echo "Example: $0 ./backups/asalahub_backup_20260728_170000.sql.gz localhost 5432 postgres asalahub"
    exit 1
fi

BACKUP_FILE="$1"
POSTGRES_HOST="${2:-${POSTGRES_HOST:-localhost}}"
POSTGRES_PORT="${3:-${POSTGRES_PORT:-5432}}"
POSTGRES_USER="${4:-${POSTGRES_USER:-postgres}}"
POSTGRES_DB="${5:-${POSTGRES_DB:-asalahub}}"
export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' does not exist!"
    exit 1
fi

echo "=================================================================="
echo " Asala Hub Database Restoration Utility"
echo "=================================================================="
echo "Target Backup File: ${BACKUP_FILE}"
echo "PostgreSQL Host:    ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "PostgreSQL User:    ${POSTGRES_USER}"
echo "Target Database:    ${POSTGRES_DB}"
echo "=================================================================="

# Terminate existing connections to the target database
echo "[1/4] Terminating existing connections to database '${POSTGRES_DB}'..."
psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

# Drop and re-create fresh database instance
echo "[2/4] Resetting target database '${POSTGRES_DB}'..."
psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c \
    "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c \
    "CREATE DATABASE ${POSTGRES_DB};"

# Restore database contents
echo "[3/4] Restoring database schema and data from backup..."
if [[ "${BACKUP_FILE}" == *.gz ]]; then
    gzip -dc "${BACKUP_FILE}" | psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null
else
    psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${BACKUP_FILE}" > /dev/null
fi

# Verify restore
echo "[4/4] Verifying database connectivity and restore completion..."
TABLE_COUNT=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

echo "=================================================================="
echo " Restoration SUCCESSFUL!"
echo " Total public tables created: ${TABLE_COUNT}"
echo "=================================================================="
