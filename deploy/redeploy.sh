#!/usr/bin/env bash
#
# QuizOnline — Quick redeploy (pull latest + rebuild + restart + verify)
#
# Usage:
#   cd /var/www/django_websites/QuizOnline && bash deploy/redeploy.sh
#
set -euo pipefail

SKIP_FRONTEND=false
for arg in "$@"; do
  case "$arg" in
    --skip-frontend) SKIP_FRONTEND=true ;;
  esac
done

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/quizonline-server"
FRONTEND_DIR="$REPO_DIR/quizonline-frontend"
DEPLOY_DIR="$REPO_DIR/deploy"
DOMAIN="quizonline.foxugly.com"

# Detect venv
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
ERRORS=0

ok()   { echo "  ✓ $1"; }
warn() { echo "  ✗ $1"; ERRORS=$((ERRORS + 1)); }

echo "=== QuizOnline redeploy ==="
echo "  Repo:    $REPO_DIR"
echo "  Backend: $BACKEND_DIR"
echo "  Venv:    $VENV"
echo ""

# ── 1. Pull ──────────────────────────────────────────────────────────────────
echo "[1/7] Pulling latest code..."
cd "$REPO_DIR"
git pull --ff-only

# ── 2. Backend ───────────────────────────────────────────────────────────────
echo "[2/7] Updating backend..."
"$PIP" install -r "$BACKEND_DIR/requirements.txt" -q
cd "$BACKEND_DIR"
"$PYTHON" manage.py migrate --noinput
"$PYTHON" manage.py collectstatic --noinput

# ── 3. Frontend ──────────────────────────────────────────────────────────────
if [ "$SKIP_FRONTEND" = true ]; then
  echo "[3/7] Skipping frontend build (--skip-frontend)"
else
  echo "[3/7] Rebuilding frontend..."
  cd "$FRONTEND_DIR"
  npm ci --silent
  export NODE_OPTIONS="--max-old-space-size=1024"
  npx ng build --configuration=production
fi

# ── 4. Sync service files ────────────────────────────────────────────────────
echo "[4/7] Syncing systemd service files..."
for svc in quizonline-gunicorn quizonline-celery quizonline-celery-beat; do
  SRC="$DEPLOY_DIR/$svc.service"
  DST="/etc/systemd/system/$svc.service"
  if [ -f "$SRC" ]; then
    if ! diff -q "$SRC" "$DST" > /dev/null 2>&1; then
      sudo cp "$SRC" "$DST"
      echo "  Updated: $svc.service"
    else
      echo "  OK: $svc.service (no change)"
    fi
  fi
done

# ── 5. Restart services ─────────────────────────────────────────────────────
echo "[5/7] Restarting services..."
sudo systemctl daemon-reload
sudo systemctl restart quizonline-gunicorn quizonline-celery quizonline-celery-beat
sudo systemctl reload apache2

# ── 6. Verify services ──────────────────────────────────────────────────────
echo "[6/7] Verifying..."

# Gunicorn
if systemctl is-active --quiet quizonline-gunicorn; then
  ok "quizonline-gunicorn is running"
else
  warn "quizonline-gunicorn is NOT running"
fi

# Celery worker
if systemctl is-active --quiet quizonline-celery; then
  ok "quizonline-celery is running"
else
  warn "quizonline-celery is NOT running"
fi

# Celery beat
if systemctl is-active --quiet quizonline-celery-beat; then
  ok "quizonline-celery-beat is running"
else
  warn "quizonline-celery-beat is NOT running"
fi

# Apache
if systemctl is-active --quiet apache2; then
  ok "apache2 is running"
else
  warn "apache2 is NOT running"
fi

# Apache config syntax
if sudo apachectl configtest 2>&1 | grep -q "Syntax OK"; then
  ok "Apache config: Syntax OK"
else
  warn "Apache config: syntax error"
fi

# Backend health (local)
sleep 2
if curl -sf http://127.0.0.1:8000/api/schema/ > /dev/null 2>&1; then
  ok "Backend API responds on :8000"
else
  warn "Backend API not responding on :8000"
fi

# SSL certificate
CERT_FILE="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
if [ -f "$CERT_FILE" ]; then
  EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo 0)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  if [ "$DAYS_LEFT" -gt 7 ]; then
    ok "SSL certificate valid ($DAYS_LEFT days left)"
  elif [ "$DAYS_LEFT" -gt 0 ]; then
    warn "SSL certificate expires in $DAYS_LEFT days! Run: sudo certbot renew"
  else
    warn "SSL certificate EXPIRED! Run: sudo certbot renew"
  fi
else
  warn "SSL certificate not found at $CERT_FILE"
fi

# HTTPS reachable
if curl -sf "https://$DOMAIN/" > /dev/null 2>&1; then
  ok "HTTPS reachable: https://$DOMAIN/"
else
  warn "HTTPS not reachable: https://$DOMAIN/"
fi

# ── 7. Summary ───────────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "=== Redeploy complete — all checks passed ==="
else
  echo "=== Redeploy complete — $ERRORS warning(s) ==="
  echo "Check logs: sudo journalctl -u quizonline-gunicorn -n 50"
fi
