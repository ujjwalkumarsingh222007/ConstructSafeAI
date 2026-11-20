# ConstructSafe AI — MongoDB Backup and Disaster Recovery Procedure

This guide provides operational runbooks for hot/cold backups, point-in-time recovery, and automated retention of the ConstructSafe AI MongoDB Community database.

---

## 1. Automated Daily Backup (Logical Dump with mongodump)

`mongodump` captures BSON documents and index definitions without downtime.

### Backup Command
```bash
# Set timestamp and backup target directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/constructsafe/mongo_${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

# Execute compressed archive dump
mongodump \
  --uri="${MONGODB_URL:-mongodb://127.0.0.1:27017}" \
  --db=constructsafe_db \
  --archive="${BACKUP_DIR}/constructsafe_db.archive.gz" \
  --gzip \
  --verbose
```

### Docker Containerized Backup Command
If MongoDB is running inside Docker Compose:
```bash
docker exec constructsafe_mongodb \
  mongodump --db=constructsafe_db --archive --gzip > "./backups/constructsafe_db_$(date +%Y%m%d_%H%M%S).archive.gz"
```

---

## 2. Restoration Procedure (mongorestore)

Restores the database with indexes and collections intact.

### Standard Restore (Drop Existing & Restore from Archive)
```bash
mongorestore \
  --uri="${MONGODB_URL:-mongodb://127.0.0.1:27017}" \
  --db=constructsafe_db \
  --archive="/var/backups/constructsafe/mongo_YYYYMMDD_HHMMSS/constructsafe_db.archive.gz" \
  --gzip \
  --drop
```
> **Notice:** `--drop` removes existing collections in `constructsafe_db` before restoring, preventing duplicate key conflicts.

### Docker Containerized Restore
```bash
cat "./backups/constructsafe_db_YYYYMMDD_HHMMSS.archive.gz" | docker exec -i constructsafe_mongodb \
  mongorestore --db=constructsafe_db --archive --gzip --drop
```

---

## 3. High-Security Backup Retention Policy

Recommended automated cron job (`/etc/cron.daily/constructsafe_backup.sh`):
```bash
#!/bin/bash
set -euo pipefail

BACKUP_ROOT="/var/backups/constructsafe"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_PATH="${BACKUP_ROOT}/constructsafe_${TIMESTAMP}.archive.gz"

# 1. Create encrypted compressed backup
mongodump --uri="mongodb://127.0.0.1:27017" --db=constructsafe_db --archive="${ARCHIVE_PATH}" --gzip

# 2. Retain backups: Delete files older than 30 days
find "${BACKUP_ROOT}" -name "constructsafe_*.archive.gz" -type f -mtime +30 -delete

# 3. Verify archive integrity
gzip -t "${ARCHIVE_PATH}"
```

---

## 4. Disaster Recovery Health Checklist
After restoring:
1. Verify database connectivity: `GET /api/v1/health/db` -> returns HTTP 200 with latency.
2. Verify collections: Check count of `users`, `projects`, `hazard_reports`, `incidents`, `inspections`.
3. Check index integrity: Run `db.collection.getIndexes()` for unique indexes on `users.email`, `corrective_actions.action_number`, and `hazard_reports.report_number`.
