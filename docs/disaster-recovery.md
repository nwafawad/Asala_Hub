# Asala Hub — Disaster Recovery & Backup Operating Procedures

## 1. Executive Summary & NFR-16 Compliance Objectives

This document establishes the official Disaster Recovery (DR) standard operating procedures for **Asala Hub**. The system architecture is designed to meet strict non-functional recovery requirements (**NFR-16**) across both Cloud and On-Campus edge deployments.

### Service Level Objectives (SLOs) & Targets

| Target Metric | Cloud Deployment (NFR-16) | Campus Edge Deployment (NFR-16) |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **24 Hours** | **24 Hours** |
| **Recovery Time Objective (RTO)** | **4 Hours** | **24 Hours** |
| **Backup Frequency** | Daily (02:00 UTC sidecar cron) | Daily (02:00 UTC sidecar cron) |
| **Retention Policy** | 14 Daily Backups (Automated) | 14 Daily Backups (Automated) |
| **Primary Data Store** | PostgreSQL 16 (Volume-backed) | PostgreSQL 16 (Local volume-backed) |
| **Edge Reconciliation** | Real-time / Scheduled Sync Client | Server-to-Server `/sync` Client |

---

## 2. Backup Architecture & Sidecar Container

Backups are handled by a dedicated Docker sidecar container (`asala_db_backup`) running `postgres:16-alpine`.

### Key System Characteristics:
1. **Cron Automation**: Executes `/scripts/backup.sh` daily at `02:00 UTC`.
2. **Gzip Compression**: Compresses raw PostgreSQL database dumps to `/backups/asalahub_backup_YYYYMMDD_HHMMSS.sql.gz`.
3. **Retention Policy Enforcement**: Automatically purges backups older than **14 days** using POSIX file modification time (`find /backups -name "asalahub_backup_*.sql.gz" -mtime +14 -delete`).
4. **Metadata State Tracking**: Writes backup metadata to `/backups/last_backup_status.json` containing ISO 8601 timestamps, file paths, size in bytes, and execution status (`"success"` or `"failed"`).
5. **Shared Mount**: The `./backups` host volume is mounted read-only inside the `asala_backend` container to enable real-time backup health monitoring via the `GET /healthz` endpoint.

---

## 3. Disaster Recovery Scenarios & Playbooks

### Scenario A: Cloud Deployment Recovery (RTO 4h, RPO 24h)

#### Trigger Conditions:
* Catastrophic cloud infrastructure failure, primary node volume corruption, or region outage.

#### Recovery Procedure:
1. **Provision Fresh Cloud Instance**:
   ```bash
   git clone https://github.com/asalahub/Asala_Hub.git /opt/asala_hub
   cd /opt/asala_hub
   ```
2. **Retrieve Latest Backup**:
   Fetch the most recent valid backup file (`asalahub_backup_YYYYMMDD_HHMMSS.sql.gz`) from cloud cold storage / volume snapshots to `/opt/asala_hub/backups/`.
3. **Spin Up Core Database Container**:
   ```bash
   docker compose up -d db
   ```
4. **Execute Restoration Playbook**:
   ```bash
   ./scripts/restore.sh ./backups/asalahub_backup_YYYYMMDD_HHMMSS.sql.gz
   ```
5. **Start Full Application Stack & Verify Health**:
   ```bash
   docker compose up -d
   curl -f http://localhost:8000/healthz
   ```

---

### Scenario B: Campus Edge Deployment Recovery (RTO 24h, RPO 24h)

#### Trigger Conditions:
* Edge server hardware replacement or local database corruption at an on-campus node.

#### Recovery Procedure:
1. **Deploy Replacement Campus Hardware**:
   Install Docker & Docker Compose on the replacement server.
2. **Clone Codebase & Mount Local Storage**:
   ```bash
   git clone https://github.com/asalahub/Asala_Hub.git /opt/asala_hub
   cd /opt/asala_hub
   ```
3. **Restore Last Daily Local Backup**:
   If local backups are intact on external storage:
   ```bash
   docker compose up -d db
   ./scripts/restore.sh ./backups/asalahub_backup_latest.sql.gz
   ```
4. **Resynchronize Pending Transactions from Cloud**:
   If local storage was completely wiped, start the campus node in `CAMPUS_MODE=True`. The campus sync service will automatically reconcile missing data from the central cloud deployment upon establishing connectivity.
5. **Verify Edge Health**:
   ```bash
   curl -f http://localhost:8000/healthz
   ```

---

## 4. Manual Operations & Verification Playbook

### Triggering a Manual Backup
To create an immediate ad-hoc database backup:
```bash
docker exec -it asala_db_backup /scripts/backup.sh
```

### Listing Available Backups & Retention Status
```bash
ls -lh ./backups/asalahub_backup_*.sql.gz
cat ./backups/last_backup_status.json
```

### Restoring to a Fresh Database Instance
```bash
./scripts/restore.sh ./backups/asalahub_backup_20260728_170000.sql.gz
```

---

## 5. Health Monitoring & Stale Backup Alerts

The FastAPI backend exposes the `/healthz` endpoint. In addition to database connection pool readiness, it monitors backup freshness:

* **Fresh Backup (< 24h)**: Returns HTTP 200 OK with `"last_backup": {"status": "ok", "age_hours": X.X}`.
* **Stale Backup (> 24h or missing)**: Emits a high-priority log alert (`HEALTH ALERT: Database backup is stale or missing`) and sets `"last_backup": {"status": "stale", "stale": true}`.

### Troubleshooting Stale Backup Alerts:
1. Inspect backup container logs: `docker logs asala_db_backup`.
2. Verify disk space on `./backups` volume: `df -h ./backups`.
3. Manually execute `/scripts/backup.sh` and inspect error outputs.
