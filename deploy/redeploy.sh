#!/usr/bin/env bash
#
# QuizOnline — Quick redeploy (pull latest + rebuild + restart)
#
# Usage:
#   cd /var/www/django_websites/QuizOnline && bash deploy/redeploy.sh
#
# The script auto-detects paths from the repo root.
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/quizonline-server"
FRONTEND_DIR="$REPO_DIR/quizonline-frontend"

# Detect venv (local .venv in backend, or repo-level .venv)
if [ -d "$BACKEND_DIR/.venv" ]; then
  VENV="$BACKEND_DIR/.venv"
elif [ -d "$REPO_DIR/.venv" ]; then
  VENV="$REPO_DIR/.venv"
else
  echo "ERROR: no .venv found in $BACKEND_DIR or $REPO_DIR"
  exit 1
fi

PYTHON="$VENV/bin/python"
PIP="$VENV/bin/pip"

echo "=== QuizOnline redeploy ==="
echo "  Repo:    $REPO_DIR"
echo "  Backend: $BACKEND_DIR"
echo "  Venv:    $VENV"
echo ""

# --- Pull latest ---
echo "[1/6] Pulling latest code..."
cd "$REPO_DIR"
git pull --ff-only

# --- Backend dependencies + migrations ---
echo "[2/6] Updating backend..."
"$PIP" install -r "$BACKEND_DIR/requirements.txt" -q
cd "$BACKEND_DIR"
"$PYTHON" manage.py migrate --noinput
"$PYTHON" manage.py collectstatic --noinput

# --- Frontend build ---
echo "[3/6] Rebuilding frontend..."
cd "$FRONTEND_DIR"
npm ci --silent
npx ng build --configuration=production

# --- Restart services ---
echo "[4/6] Restarting services..."
sudo systemctl restart quizonline 2>/dev/null || true
sudo systemctl restart quizonline-celery 2>/dev/null || true
sudo systemctl restart quizonline-celery-beat 2>/dev/null || true
sudo systemctl reload apache2 2>/dev/null || sudo systemctl reload nginx 2>/dev/null || true

# --- Verify ---
echo "[5/6] Checking health..."
sleep 2
HEALTH_URL="http://127.0.0.1:8000/api/schema/"
if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
  echo "  Backend: OK"
else
  echo "  Backend: WARN — could not reach $HEALTH_URL"
  echo "  Check logs: sudo journalctl -u quizonline -n 50"
fi

# --- Summary ---
echo ""
echo "[6/6] Done."
echo "=== Redeploy complete ==="
