#!/usr/bin/env bash
#
# QuizOnline — Quick redeploy (pull latest + rebuild + restart)
#
# Usage: ssh into EC2, then:
#   cd /path/to/QuizOnline && bash deploy/redeploy.sh
#
set -euo pipefail

APP_DIR="/opt/quizonline"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== QuizOnline redeploy ==="

# --- Pull latest ---
echo "[1/5] Pulling latest code..."
cd "$REPO_DIR"
git pull --ff-only

# --- Backend ---
echo "[2/5] Updating backend..."
rsync -a --delete "$REPO_DIR/quizonline-server/" "$APP_DIR/backend/"
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt" -q
cd "$APP_DIR/backend"
"$APP_DIR/venv/bin/python" manage.py migrate --noinput
"$APP_DIR/venv/bin/python" manage.py collectstatic --noinput

# --- Frontend ---
echo "[3/5] Rebuilding frontend..."
cd "$REPO_DIR/quizonline-frontend"
npm ci --silent
npx ng build --configuration=production
rsync -a --delete dist/quizonline-frontend/browser/ "$APP_DIR/frontend/"

# --- Restart ---
echo "[4/5] Restarting gunicorn..."
sudo systemctl restart quizonline

# --- Verify ---
echo "[5/5] Checking health..."
sleep 2
if curl -sf http://127.0.0.1:8000/health/ > /dev/null; then
    echo "  Backend: OK"
else
    echo "  Backend: FAILED — check logs: sudo journalctl -u quizonline -n 50"
fi

echo ""
echo "=== Redeploy complete ==="
