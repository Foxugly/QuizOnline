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

# Detect active reverse proxy (nginx preferred, fallback apache2)
if systemctl is-active --quiet nginx; then
  WEB_SERVER="nginx"
elif systemctl is-active --quiet apache2; then
  WEB_SERVER="apache2"
else
  WEB_SERVER=""
fi

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
SVC_UPDATED=0
for svc in quizonline-gunicorn quizonline-celery quizonline-celery-beat; do
  SRC="$DEPLOY_DIR/$svc.service"
  DST="/etc/systemd/system/$svc.service"

  if [ ! -f "$SRC" ]; then
    echo "  WARN: $svc.service missing in deploy/, skipping"
    continue
  fi

  if [ -f "$DST" ] && cmp -s "$SRC" "$DST"; then
    echo "  OK: $svc.service (no change)"
  else
    sudo cp "$SRC" "$DST"
    SVC_UPDATED=$((SVC_UPDATED + 1))
    echo "  Updated: $svc.service"
  fi
done

# ── 5. Restart services ─────────────────────────────────────────────────────
echo "[5/7] Restarting services..."
if [ "$SVC_UPDATED" -gt 0 ]; then
  sudo systemctl daemon-reload
fi
sudo systemctl restart quizonline-gunicorn quizonline-celery quizonline-celery-beat
if [ -n "$WEB_SERVER" ]; then
  sudo systemctl reload "$WEB_SERVER"
fi

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

# Reverse proxy (nginx or apache2)
if [ -z "$WEB_SERVER" ]; then
  warn "No reverse proxy detected (neither nginx nor apache2 is active)"
elif systemctl is-active --quiet "$WEB_SERVER"; then
  ok "$WEB_SERVER is running"

  # Config syntax test
  case "$WEB_SERVER" in
    nginx)
      if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
        ok "nginx config: syntax OK"
      else
        warn "nginx config: syntax error"
      fi
      ;;
    apache2)
      if sudo apachectl configtest 2>&1 | grep -q "Syntax OK"; then
        ok "apache2 config: Syntax OK"
      else
        warn "apache2 config: syntax error"
      fi
      ;;
  esac
else
  warn "$WEB_SERVER is NOT running"
fi

# Backend health (local) — pass the public Host header so Django doesn't reject
sleep 2
if curl -sf -H "Host: $DOMAIN" http://127.0.0.1:8000/api/schema/ > /dev/null 2>&1; then
  ok "Backend API responds on :8000"
else
  warn "Backend API not responding on :8000"
fi

# SSL certificate — try domain-specific path, then parent domain (shared cert)
CERT_FILE=""
for candidate in \
    "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
    "/etc/letsencrypt/live/${DOMAIN#*.}/fullchain.pem"; do
  if [ -f "$candidate" ]; then
    CERT_FILE="$candidate"
    break
  fi
done

if [ -n "$CERT_FILE" ]; then
  EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo 0)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  if [ "$DAYS_LEFT" -gt 7 ]; then
    ok "SSL certificate valid ($DAYS_LEFT days left) — $CERT_FILE"
  elif [ "$DAYS_LEFT" -gt 0 ]; then
    warn "SSL certificate expires in $DAYS_LEFT days! Run: sudo certbot renew"
  else
    warn "SSL certificate EXPIRED! Run: sudo certbot renew"
  fi
else
  warn "SSL certificate not found for $DOMAIN (looked in /etc/letsencrypt/live/)"
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
