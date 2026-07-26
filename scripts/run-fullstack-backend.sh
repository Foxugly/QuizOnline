#!/usr/bin/env bash
# POSIX counterpart of run-fullstack-backend.ps1 — boots the Django backend for
# the Playwright "fullstack" e2e suite (real DRF, not mocked). Used by CI on
# Linux; the .ps1 stays the entry point for local Windows dev. Kept behaviourally
# in lockstep with the .ps1 — change both together.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_ROOT="$REPO_ROOT/quizonline-server"

# Prefer the repo venv when present (local *nix dev); fall back to whatever
# ``python`` is on PATH (CI installs deps into the setup-python interpreter).
# Override with PYTHON=/path/to/python if needed.
PYTHON="${PYTHON:-}"
if [ -z "$PYTHON" ]; then
  if [ -x "$REPO_ROOT/.venv/bin/python" ]; then
    PYTHON="$REPO_ROOT/.venv/bin/python"
  else
    PYTHON="python"
  fi
fi

# Isolated sqlite DB + media dir so the e2e run never touches a dev DB. dev
# settings already default to locmem cache + eager Celery, so no Redis needed.
export DATABASE_URL="sqlite:///db.fullstack.sqlite3"
export MEDIA_ROOT_DIR="media-fullstack"
export PYTHONUNBUFFERED="1"
# Tests legitimately exceed the 5/min token_obtain rate (each test logs in via
# the SPA AND calls /api/token/ directly for a bearer); disable throttles so we
# don't hit 429. Mirrors the .ps1.
export DISABLE_THROTTLES="1"

rm -f "$BACKEND_ROOT/db.fullstack.sqlite3"
rm -rf "$BACKEND_ROOT/media-fullstack"

cd "$BACKEND_ROOT"
"$PYTHON" manage.py migrate --noinput
"$PYTHON" manage.py seed_fullstack_e2e
exec "$PYTHON" manage.py runserver 127.0.0.1:8001
