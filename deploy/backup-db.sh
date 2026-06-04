#!/usr/bin/env bash
#
# Daily database backup for QuizOnline.
#
# Reads the DB config from the env file — the fleet DB_* 6-var convention
# (OPERATIONS.md §3.13), or a legacy DATABASE_URL as fallback — dumps the
# database to a timestamped file under $BACKUP_DIR, gzips it, then prunes
# anything older than $RETENTION_DAYS.
#
# Supports both PostgreSQL (DB_ENGINE=postgresql + DB_HOST/PORT/USER/NAME/PASSWORD,
# or a postgres:// URL) and sqlite (DB_ENGINE unset + DB_NAME=path, or sqlite:/// URL).
#
# Optional S3 mirror: set $S3_BUCKET (and the AWS CLI credentials in
# the environment) to also push the gzip to ``s3://$S3_BUCKET/$(basename)``.
#
# Wire as a systemd timer via deploy/backup-db.timer + .service for
# cron-style daily runs. Manually: ``sudo -u django bash deploy/backup-db.sh``.

set -euo pipefail

# Database dumps are never web-served and may contain PII — keep every
# intermediate file owner-only (the final dump is also explicitly chmod 600
# below; this also covers the transient .sqlite3 before gzip).
umask 077

PROJECT_DIR="${PROJECT_DIR:-/var/www/django_websites/QuizOnline/quizonline-server}"
ENV_FILE="${ENV_FILE:-${PROJECT_DIR}/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/quizonline}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
S3_BUCKET="${S3_BUCKET:-}"

log() {
    printf '[backup-db %(%Y-%m-%dT%H:%M:%S%z)T] %s\n' -1 "$*"
}

if [[ ! -f "$ENV_FILE" ]]; then
    log "ERROR: env file not found at $ENV_FILE"
    exit 1
fi

# Read the DB config from the .env without sourcing it (avoids env leaks if the
# .env has command substitutions). Prefer the fleet DB_* 6-var convention
# (OPERATIONS.md §3.13); fall back to a legacy DATABASE_URL if present.
_envget() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }
DB_ENGINE=$(_envget DB_ENGINE)
DATABASE_URL=$(_envget DATABASE_URL)
if [[ -z "$DB_ENGINE" && -z "$DATABASE_URL" ]]; then
    log "ERROR: neither DB_ENGINE nor DATABASE_URL in $ENV_FILE"
    exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TIMESTAMP=$(date -u +'%Y%m%dT%H%M%SZ')

backup_sqlite() {  # $1 = sqlite file path
    local db_path="$1"
    [[ "$db_path" = /* ]] || db_path="${PROJECT_DIR}/${db_path}"
    [[ -f "$db_path" ]] || { log "ERROR: sqlite file not found at $db_path"; exit 1; }
    OUT="${BACKUP_DIR}/quizonline-${TIMESTAMP}.sqlite3.gz"
    log "dumping sqlite $db_path -> $OUT"
    # ``.backup`` honours WAL/journal in-flight writes, unlike a raw cp.
    sqlite3 "$db_path" ".backup ${BACKUP_DIR}/quizonline-${TIMESTAMP}.sqlite3"
    gzip -9 "${BACKUP_DIR}/quizonline-${TIMESTAMP}.sqlite3"
}

if [[ -n "$DB_ENGINE" ]]; then
    case "$DB_ENGINE" in
        *postgres*|psql)
            OUT="${BACKUP_DIR}/quizonline-${TIMESTAMP}.sql.gz"
            log "dumping postgres (DB_*) -> $OUT"
            # --no-owner so the dump restores cleanly into a DB owned by a
            # different role on the recovery host.
            PGPASSWORD="$(_envget DB_PASSWORD)" pg_dump \
                -h "$(_envget DB_HOST)" -p "$(_envget DB_PORT)" -U "$(_envget DB_USER)" \
                --no-owner --format=plain "$(_envget DB_NAME)" | gzip -9 > "$OUT"
            ;;
        *)
            backup_sqlite "$(_envget DB_NAME)"
            ;;
    esac
else
    # Legacy DATABASE_URL fallback.
    case "$DATABASE_URL" in
        sqlite:///*)  backup_sqlite "${DATABASE_URL#sqlite:///}" ;;
        postgres://*|postgresql://*)
            OUT="${BACKUP_DIR}/quizonline-${TIMESTAMP}.sql.gz"
            log "dumping postgres -> $OUT"
            pg_dump --dbname="$DATABASE_URL" --no-owner --format=plain | gzip -9 > "$OUT" ;;
        *)  log "ERROR: unsupported DATABASE_URL scheme: ${DATABASE_URL%%://*}"; exit 1 ;;
    esac
fi

chmod 600 "$OUT"
log "wrote $OUT ($(du -h "$OUT" | cut -f1))"

if [[ -n "$S3_BUCKET" ]]; then
    log "mirroring to s3://${S3_BUCKET}/$(basename "$OUT")"
    aws s3 cp "$OUT" "s3://${S3_BUCKET}/$(basename "$OUT")" --no-progress
fi

# Prune local dumps older than $RETENTION_DAYS. S3-side lifecycle should
# handle retention on the remote copy.
PRUNED=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'quizonline-*' \
    -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
log "pruned ${PRUNED} old dump(s) older than ${RETENTION_DAYS} day(s)"

log "done"
