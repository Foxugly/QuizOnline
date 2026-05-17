#!/usr/bin/env bash
#
# Daily database backup for QuizOnline.
#
# Reads the live DATABASE_URL from the project's .env file, dumps the
# database to a timestamped file under $BACKUP_DIR, gzips it, then
# prunes anything older than $RETENTION_DAYS.
#
# Supports two URL schemes (matches what ``settings_prod.py`` accepts
# via ``env.db()``):
#   - sqlite:///absolute-or-relative/path.sqlite3
#   - postgres://user:pass@host:port/dbname
#
# Optional S3 mirror: set $S3_BUCKET (and the AWS CLI credentials in
# the environment) to also push the gzip to ``s3://$S3_BUCKET/$(basename)``.
#
# Wire as a systemd timer via deploy/backup-db.timer + .service for
# cron-style daily runs. Manually: ``sudo -u django bash deploy/backup-db.sh``.

set -euo pipefail

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

# Pull DATABASE_URL out of the .env without sourcing it (avoids accidental
# environment leaks if the .env has command substitutions).
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)
if [[ -z "$DATABASE_URL" ]]; then
    log "ERROR: DATABASE_URL not found in $ENV_FILE"
    exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TIMESTAMP=$(date -u +'%Y%m%dT%H%M%SZ')

case "$DATABASE_URL" in
    sqlite:///*)
        DB_PATH="${DATABASE_URL#sqlite:///}"
        # Resolve relative paths against PROJECT_DIR (Django's behaviour).
        if [[ "$DB_PATH" != /* ]]; then
            DB_PATH="${PROJECT_DIR}/${DB_PATH}"
        fi
        if [[ ! -f "$DB_PATH" ]]; then
            log "ERROR: sqlite file not found at $DB_PATH"
            exit 1
        fi
        OUT="${BACKUP_DIR}/quizonline-${TIMESTAMP}.sqlite3.gz"
        log "dumping sqlite $DB_PATH -> $OUT"
        # ``.backup`` honours WAL/journal in-flight writes, unlike a raw cp.
        sqlite3 "$DB_PATH" ".backup ${BACKUP_DIR}/quizonline-${TIMESTAMP}.sqlite3"
        gzip -9 "${BACKUP_DIR}/quizonline-${TIMESTAMP}.sqlite3"
        ;;
    postgres://*|postgresql://*)
        OUT="${BACKUP_DIR}/quizonline-${TIMESTAMP}.sql.gz"
        log "dumping postgres -> $OUT"
        # pg_dump reads the URL directly when given via --dbname. Use
        # --no-owner so the dump restores cleanly into a fresh DB owned
        # by a different role on the recovery host.
        pg_dump --dbname="$DATABASE_URL" --no-owner --format=plain \
            | gzip -9 > "$OUT"
        ;;
    *)
        log "ERROR: unsupported DATABASE_URL scheme: ${DATABASE_URL%%://*}"
        exit 1
        ;;
esac

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
