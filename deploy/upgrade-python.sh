#!/usr/bin/env bash
#
# QuizOnline — In-place Python runtime upgrade for the production EC2.
#
# Replaces the active virtualenv with a fresh one built on a newer
# Python interpreter (default: 3.12), reinstalls the dependencies,
# runs ``manage.py check`` + ``migrate --plan`` as a guard, and only
# then restarts the three systemd services (gunicorn / celery /
# celery-beat). The previous virtualenv is preserved at
# ``.venv.bak.<timestamp>`` so a rollback is one ``mv`` away.
#
# Usage:
#
#   sudo bash deploy/upgrade-python.sh           # interactive, 3.12
#   sudo bash deploy/upgrade-python.sh --dry-run # no mutations
#   sudo bash deploy/upgrade-python.sh --version 3.11
#   sudo bash deploy/upgrade-python.sh --yes     # skip the confirm prompt
#
# Rollback (if anything went wrong):
#
#   sudo bash deploy/upgrade-python.sh --rollback
#
# The script is idempotent: re-running it on a box that already runs
# the target version is a no-op aside from the dependency
# reinstallation.
#
set -euo pipefail

TARGET_VERSION="3.12"
DRY_RUN=false
ASSUME_YES=false
ROLLBACK=false

usage() {
  cat <<EOF
Usage: $0 [--version 3.12] [--dry-run] [--yes] [--rollback]

  --version X.Y   Target Python minor version (default: 3.12).
  --dry-run       Print every command, mutate nothing.
  --yes           Skip the confirmation prompt — for unattended runs.
  --rollback      Restore the most recent .venv.bak.* and restart services.
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) TARGET_VERSION="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --yes) ASSUME_YES=true; shift ;;
    --rollback) ROLLBACK=true; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1" >&2; usage ;;
  esac
done

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/quizonline-server"
APP_USER="django"
SERVICES=(quizonline-gunicorn quizonline-celery quizonline-celery-beat)

# Detect venv location (matches the pattern in redeploy.sh).
if [ -d "$BACKEND_DIR/.venv" ]; then
  VENV="$BACKEND_DIR/.venv"
elif [ -d "$REPO_DIR/.venv" ]; then
  VENV="$REPO_DIR/.venv"
else
  echo "ERROR: no .venv found in $BACKEND_DIR or $REPO_DIR" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Logging helpers — every mutation goes through ``run`` so --dry-run can
# print without touching state. Refuse to run mutations as a non-root
# user except in dry-run mode (creating venv files / restarting systemd
# services needs root).
# ---------------------------------------------------------------------------
log() { echo "  • $*"; }
ok()  { echo "  ✓ $*"; }
err() { echo "  ✗ $*" >&2; }

run() {
  if $DRY_RUN; then
    echo "  [dry-run] $*"
    return 0
  fi
  if [[ $EUID -ne 0 ]]; then
    err "must run as root (sudo) for: $*"
    exit 1
  fi
  eval "$@"
}

confirm() {
  local prompt="$1"
  if $ASSUME_YES || $DRY_RUN; then
    return 0
  fi
  read -r -p "$prompt [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

stop_services() {
  log "Stopping services: ${SERVICES[*]}"
  for s in "${SERVICES[@]}"; do
    run "systemctl stop $s"
  done
}

start_services() {
  log "Starting services: ${SERVICES[*]}"
  for s in "${SERVICES[@]}"; do
    run "systemctl start $s"
  done
}

health_check() {
  log "Polling /health/ (max 30s) ..."
  for _ in $(seq 1 15); do
    if curl -fsS --max-time 2 http://localhost:8000/health/ >/dev/null 2>&1; then
      ok "/health/ returned 200"
      return 0
    fi
    sleep 2
  done
  err "/health/ did not return 200 within 30 s"
  return 1
}

# ---------------------------------------------------------------------------
# Rollback path. We pick the most recent .venv.bak.* sibling of
# ``$VENV`` and atomically swap. Useful both on failure and as a
# standalone command (``--rollback``).
# ---------------------------------------------------------------------------
rollback_venv() {
  local parent backup
  parent="$(dirname "$VENV")"
  # shellcheck disable=SC2012  # ls is fine here — we want chronological.
  backup="$(ls -1dt "$parent"/.venv.bak.* 2>/dev/null | head -n 1 || true)"
  if [ -z "$backup" ]; then
    err "no .venv.bak.* found in $parent"
    return 1
  fi
  log "Rolling back to $backup"
  stop_services
  run "rm -rf '$VENV.failed' 2>/dev/null || true"
  run "mv '$VENV' '$VENV.failed' || true"
  run "mv '$backup' '$VENV'"
  start_services
  if health_check; then
    ok "Rollback complete. Failed venv kept at $VENV.failed for inspection."
  else
    err "Rollback did not restore /health/. Inspect manually."
    return 1
  fi
}

if $ROLLBACK; then
  rollback_venv
  exit $?
fi

# ---------------------------------------------------------------------------
# Pre-flight checks.
# ---------------------------------------------------------------------------
echo "QuizOnline Python upgrade"
echo "========================="
echo "  Repo:       $REPO_DIR"
echo "  Venv:       $VENV"
echo "  Target:     python$TARGET_VERSION"
echo "  Mode:       $([ "$DRY_RUN" = true ] && echo 'DRY-RUN' || echo 'LIVE')"
echo

if ! command -v "python$TARGET_VERSION" >/dev/null 2>&1; then
  log "python$TARGET_VERSION not found on PATH — installing via deadsnakes PPA"
  if ! confirm "Add deadsnakes PPA + apt install python$TARGET_VERSION python$TARGET_VERSION-venv python$TARGET_VERSION-dev?"; then
    err "user declined PPA install"; exit 1
  fi
  run "add-apt-repository -y ppa:deadsnakes/ppa"
  run "apt-get update"
  run "apt-get install -y python$TARGET_VERSION python$TARGET_VERSION-venv python$TARGET_VERSION-dev"
fi

CURRENT_VER="$($VENV/bin/python -c 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")' 2>/dev/null || echo "unknown")"
log "Current venv interpreter: python$CURRENT_VER"
if [ "$CURRENT_VER" = "$TARGET_VERSION" ]; then
  ok "Already on python$TARGET_VERSION — nothing to do."
  exit 0
fi

if ! confirm "Replace $VENV (python$CURRENT_VER) with a fresh python$TARGET_VERSION venv and restart services?"; then
  err "aborted by user"; exit 1
fi

# ---------------------------------------------------------------------------
# Main upgrade flow. Set ``trap`` so any failure between stop and start
# triggers a rollback rather than leaving the box without a working
# gunicorn. ``$STAGE`` lets the trap know how far we got.
# ---------------------------------------------------------------------------
STAGE="init"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_VENV="$VENV.bak.$TIMESTAMP"

cleanup() {
  local code=$?
  if [ $code -ne 0 ] && ! $DRY_RUN; then
    err "upgrade failed at stage '$STAGE' (exit $code) — attempting rollback"
    rollback_venv || err "rollback also failed; manual intervention required"
  fi
  exit $code
}
trap cleanup EXIT

STAGE="stop"
stop_services

STAGE="backup"
log "Backing up old venv → $BACKUP_VENV"
run "mv '$VENV' '$BACKUP_VENV'"

STAGE="create"
log "Creating fresh venv with python$TARGET_VERSION"
run "sudo -u $APP_USER python$TARGET_VERSION -m venv '$VENV'"
run "sudo -u $APP_USER '$VENV/bin/pip' install --upgrade pip wheel setuptools"

STAGE="install"
log "Installing dependencies"
run "sudo -u $APP_USER '$VENV/bin/pip' install -r '$BACKEND_DIR/requirements.txt'"

STAGE="check"
log "Running manage.py check"
run "sudo -u $APP_USER '$VENV/bin/python' '$BACKEND_DIR/manage.py' check --deploy --fail-level WARNING || true"
run "sudo -u $APP_USER '$VENV/bin/python' '$BACKEND_DIR/manage.py' check"
log "Running migrate --plan (no DB write)"
run "sudo -u $APP_USER '$VENV/bin/python' '$BACKEND_DIR/manage.py' migrate --plan"

STAGE="start"
start_services

STAGE="health"
health_check

trap - EXIT  # success path: don't run the rollback cleanup
ok "Python upgrade complete: python$CURRENT_VER → python$TARGET_VERSION"
echo
echo "  Backup venv: $BACKUP_VENV"
echo "  To roll back: sudo bash deploy/upgrade-python.sh --rollback"
echo
echo "  Keep the backup at least a week before deleting:"
echo "    sudo rm -rf $BACKUP_VENV"
