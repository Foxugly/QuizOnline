#!/usr/bin/env bash
#
# QuizOnline — fetch env vars from SSM Parameter Store into a tmpfs .env
#
# Invoked at boot by quizonline-env-fetch.service. Pulls every
# parameter under ``$PREFIX`` (default ``/quizonline/prod``) into a
# fresh ``$OUT_FILE`` (default ``/run/quizonline/.env``), then
# transfers ownership so the django service user can read it.
#
# /run is a tmpfs on systemd systems → the file disappears on
# reboot (re-fetched on the next boot) and never lands in an EBS
# snapshot. Backup tools generally skip /run by default.
#
# Atomic: writes to ``$OUT_FILE.tmp`` first, then ``mv -f`` over the
# target. A partial fetch never leaves a half-written .env behind.
#
# Auth: relies on the EC2 instance role (``foxugly-fleet-ec2``) having
# ssm:GetParametersByPath on the prefix. No credentials on disk.
#
# Exit codes (per systemd contract for Type=oneshot):
#   0  — file written, perms set, ready for downstream services
#   1+ — log to journald, downstream gunicorn/celery will fail to
#        start (Requires= dependency) so the box doesn't silently
#        serve traffic with stale config
set -euo pipefail

PREFIX="${QOL_SSM_PREFIX:-/quizonline/prod}"
REGION="${QOL_SSM_REGION:-eu-west-1}"
OUT_DIR="${QOL_ENV_DIR:-/run/quizonline}"
OUT_FILE="${QOL_ENV_FILE:-$OUT_DIR/.env}"
OWNER="${QOL_ENV_OWNER:-django:www-data}"

echo "[fetch-env] prefix=$PREFIX region=$REGION out=$OUT_FILE"

# Defensive: the tmpfs dir might not survive a manual cleanup, recreate.
mkdir -p "$OUT_DIR"
chmod 750 "$OUT_DIR"
chown root:www-data "$OUT_DIR"

TMP_FILE="$OUT_FILE.tmp"
: > "$TMP_FILE"
chmod 640 "$TMP_FILE"

# get-parameters-by-path returns up to 10 per page; the AWS CLI auto-
# paginates by default (when --max-results is unset), so a single
# call returns the merged ``Parameters`` array — no manual NextToken
# loop required.
OUT=$(aws ssm get-parameters-by-path \
  --region "$REGION" \
  --path "$PREFIX" \
  --recursive \
  --with-decryption \
  --output json)

# Inline Python emits KEY=VALUE lines and validates each value. We
# refuse values containing embedded newlines because neither systemd
# EnvironmentFile nor python-dotenv handle them cleanly without
# explicit quoting, and well-formed app secrets shouldn't have any.
python3 -c '
import json, sys
prefix, out_path, payload = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.loads(payload)
n = 0
with open(out_path, "a", encoding="utf-8") as f:
    for p in data.get("Parameters", []):
        name = p["Name"]
        key = name[len(prefix) + 1:] if name.startswith(prefix + "/") else name.rsplit("/", 1)[-1]
        value = p["Value"]
        if "\n" in value or "\r" in value:
            print(f"ERROR: value of {key} contains a newline character", file=sys.stderr)
            sys.exit(2)
        f.write(f"{key}={value}\n")
        n += 1
print(f"[fetch-env] wrote {n} entries to staging file", file=sys.stderr)
' "$PREFIX" "$TMP_FILE" "$OUT"

# Sanity-check: refuse to swap in an empty file (likely IAM regression
# or wrong prefix). Leave the previous .env intact so downstream
# services keep working with the last-known-good config.
COUNT=$(grep -c '=' "$TMP_FILE" || true)
if [ "$COUNT" -eq 0 ]; then
  echo "ERROR: no parameters found under $PREFIX — refusing to overwrite live .env" >&2
  rm -f "$TMP_FILE"
  exit 3
fi

chown "$OWNER" "$TMP_FILE"
chmod 640 "$TMP_FILE"
mv -f "$TMP_FILE" "$OUT_FILE"
echo "[fetch-env] $OUT_FILE ready ($COUNT entries, owner=$OWNER, mode=0640)"
