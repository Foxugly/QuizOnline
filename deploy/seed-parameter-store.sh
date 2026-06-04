#!/usr/bin/env bash
#
# QuizOnline — seed AWS SSM Parameter Store from a local .env
#
# Reads <env-file> line by line and creates/updates a parameter at
# ``<prefix>/<KEY>`` for each ``KEY=VALUE`` line. Keys listed in
# ``SECRET_KEYS`` below are stored as ``SecureString`` (KMS-encrypted
# with the default ``aws/ssm`` managed key); everything else is
# ``String``.
#
# Idempotent — uses ``put-parameter --overwrite``. Skips blank lines,
# comment lines starting with ``#`` and malformed lines (with a warn).
#
# Usage:
#     bash deploy/seed-parameter-store.sh [options] <env-file>
#
# Options:
#     --prefix PATH    SSM parameter prefix (default: /quizonline/prod)
#     --region REGION  AWS region (default: eu-west-1)
#     --dry-run        Print intended operations, do not call AWS
#
# Examples:
#     # Review what would be uploaded
#     bash deploy/seed-parameter-store.sh --dry-run ./prod.env
#
#     # Actually upload (requires AWS creds with ssm:PutParameter)
#     bash deploy/seed-parameter-store.sh ./prod.env
#
#     # Seed a staging environment under a different prefix
#     bash deploy/seed-parameter-store.sh --prefix /quizonline/staging ./staging.env
#
# Requirements:
#     - AWS CLI v2
#     - Credentials with ssm:PutParameter on the target prefix. On a
#       fresh AWS account this typically means an IAM user with
#       AmazonSSMFullAccess for the bootstrap; in a hardened setup
#       a scoped role is preferable.
#
# Notes:
#     - Overwriting an existing parameter does NOT change its Type.
#       If you ever need to promote a String to SecureString (or
#       vice-versa), delete the old parameter first:
#           aws ssm delete-parameter --name /quizonline/prod/KEY
#       then re-run this script.
#     - Values may not contain embedded newlines; the script doesn't
#       try to escape them.
set -euo pipefail

# Keys that MUST be SecureString. Anything not listed here is treated
# as a plain (String) configuration value. Erring on the side of
# encrypting more rather than less is fine — there's no cost
# difference between String and SecureString.
SECRET_KEYS=(
  SECRET_KEY
  JWT_SIGNING_KEY
  DB_PASSWORD
  EMAIL_HOST_PASSWORD
  MS_GRAPH_CLIENT_SECRET
  DEEPL_AUTH_KEY
  SENTRY_DSN
  SENTRY_FRONTEND_DSN
)

PREFIX="/quizonline/prod"
REGION="eu-west-1"
DRY_RUN=false
ENV_FILE=""

usage() {
  cat >&2 <<EOF
Usage: $0 [--prefix /quizonline/prod] [--region eu-west-1] [--dry-run] <env-file>
EOF
  exit 64
}

while [ $# -gt 0 ]; do
  case "$1" in
    --prefix)  PREFIX="$2"; shift 2 ;;
    --region)  REGION="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage ;;
    -*)        echo "Unknown option: $1" >&2; usage ;;
    *)         ENV_FILE="$1"; shift ;;
  esac
done

if [ -z "$ENV_FILE" ]; then
  usage
fi
if [ ! -r "$ENV_FILE" ]; then
  echo "ERROR: env file '$ENV_FILE' not readable" >&2
  exit 66
fi

is_secret() {
  local key="$1"
  for s in "${SECRET_KEYS[@]}"; do
    [ "$s" = "$key" ] && return 0
  done
  return 1
}

echo "=== Seeding $PREFIX/* from $ENV_FILE (region=$REGION, dry-run=$DRY_RUN) ==="
count=0
skipped=0

while IFS='' read -r line || [ -n "$line" ]; do
  # Trim leading/trailing whitespace
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"

  # Skip blanks and full-line comments
  case "$line" in
    ""|\#*) continue ;;
  esac

  if [[ "$line" != *=* ]]; then
    echo "  WARN: skipping malformed line: $line" >&2
    skipped=$((skipped + 1))
    continue
  fi

  KEY="${line%%=*}"
  VALUE="${line#*=}"

  # Strip surrounding double or single quotes if present
  if [[ "$VALUE" =~ ^\"(.*)\"$ ]]; then
    VALUE="${BASH_REMATCH[1]}"
  elif [[ "$VALUE" =~ ^\'(.*)\'$ ]]; then
    VALUE="${BASH_REMATCH[1]}"
  fi

  TYPE="String"
  if is_secret "$KEY"; then
    TYPE="SecureString"
  fi

  NAME="$PREFIX/$KEY"

  if [ "$DRY_RUN" = true ]; then
    if [ "$TYPE" = "SecureString" ]; then
      echo "  DRY: $NAME → $TYPE (value redacted)"
    else
      echo "  DRY: $NAME → $TYPE = $VALUE"
    fi
  else
    aws ssm put-parameter \
      --region "$REGION" \
      --name "$NAME" \
      --value "$VALUE" \
      --type "$TYPE" \
      --overwrite \
      --output text >/dev/null
    echo "  OK : $NAME ($TYPE)"
  fi
  count=$((count + 1))
done < "$ENV_FILE"

echo ""
echo "Done — $count parameter(s) processed, $skipped skipped."
