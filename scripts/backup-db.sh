#!/usr/bin/env bash
# Skrip backup harian basis data PostgreSQL Kelo-ERP
# Contoh cron (tiap hari pukul 02:00 WIB):
# 0 2 * * * /path/to/keloria/scripts/backup-db.sh >> /var/log/kelo-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: Variabel DATABASE_URL belum disetel." >&2
  exit 1
fi

OUTPUT_FILE="${BACKUP_DIR}/kelo_erp_${TIMESTAMP}.sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$OUTPUT_FILE"

echo "[$(date -Iseconds)] Backup berhasil dibuat: $OUTPUT_FILE"
