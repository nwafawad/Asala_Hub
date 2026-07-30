#!/bin/sh
set -e

# PostgreSQL Database Backup Script for Asala Hub
# Generates compressed pg_dump backups, updates state metadata, and applies retention cleanup.

POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-asalahub}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
ISO_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BACKUP_FILENAME="asalahub_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILENAME}"
STATUS_FILE="${BACKUP_DIR}/last_backup_status.json"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting database backup for database '${POSTGRES_DB}' on host '${POSTGRES_HOST}'..."

if pg_dump -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"; then
    FILE_SIZE=$(wc -c < "${BACKUP_FILE}" | tr -d ' ')
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup created successfully: ${BACKUP_FILENAME} (${FILE_SIZE} bytes)"

    # Write status metadata JSON
    cat <<EOF > "${STATUS_FILE}"
{
  "status": "success",
  "timestamp": "${ISO_TIMESTAMP}",
  "file": "${BACKUP_FILENAME}",
  "size_bytes": ${FILE_SIZE}
}
EOF

    # Retention Policy Cleanup: Delete backups older than RETENTION_DAYS (14 days default)
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Applying retention policy: deleting backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "asalahub_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup process completed cleanly."
else
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup FAILED!"
    cat <<EOF > "${STATUS_FILE}"
{
  "status": "failed",
  "timestamp": "${ISO_TIMESTAMP}",
  "error": "pg_dump failed to complete"
}
EOF
    exit 1
fi
