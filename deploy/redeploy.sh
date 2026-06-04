#!/usr/bin/env bash
#
# QuizOnline — Quick redeploy (pull latest + rebuild + restart + verify)
#
# Usage:
#   cd /var/www/django_websites/QuizOnline && bash deploy/redeploy.sh
#
set -euo pipefail

# Files created here (collectstatic output, compiled .mo catalogs, pip-installed
# venv) are group www-data, not world-accessible. nginx (www-data) still serves
# /static via the group; django's primary group is www-data so it owns them rw.
umask 027

SKIP_FRONTEND=false
for arg in "$@"; do
  case "$arg" in
    --skip-frontend) SKIP_FRONTEND=true ;;
  esac
done

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/quizonline-server"
FRONTEND_DIR="$REPO_DIR/quizonline-frontend"
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
echo "[1/6] Pulling latest code..."
cd "$REPO_DIR"
git pull --ff-only

# ── 2. Backend ───────────────────────────────────────────────────────────────
echo "[2/6] Updating backend..."

# Note: the legacy ``.env`` perms guard that used to live here is gone
# along with Option B (SSM Parameter Store + tmpfs ``/run/quizonline/
# .env`` populated at boot by quizonline-env-fetch.service). The
# runtime env file's perms are now controlled by the fetch script
# itself (it chmod 640 / chown django:www-data on every boot), so
# the guard was protecting an artefact that no longer drives the
# services. See deploy/SECRETS-ROTATION.md for the new rotation flow.

"$PIP" install -r "$BACKEND_DIR/requirements.txt" -q
cd "$BACKEND_DIR"

# Load the SSM-fetched env (DJANGO_ENV=prod, SECRET_KEY, DB_*, …) so manage.py
# runs against the SAME prod settings + PostgreSQL as the gunicorn unit. systemd
# injects this via EnvironmentFile for the services, but a manual command does
# NOT get it. Without it, DJANGO_ENV is unset -> config.settings falls back to
# the dev/sqlite base settings and migrate/collectstatic silently target a stray
# local db.sqlite3 instead of prod PostgreSQL. Parse literally (key=value), NOT
# `source` — values may contain shell-special chars (mirrors systemd parsing).
ENV_FILE="/run/quizonline/.env"
if [ -f "$ENV_FILE" ]; then
    echo "[2/6] Loading env from $ENV_FILE..."
    while IFS='=' read -r _k _v || [ -n "$_k" ]; do
        case "$_k" in ''|\#*) continue ;; esac
        export "$_k=$_v"
    done < "$ENV_FILE"
    unset _k _v
else
    echo "WARNING: $ENV_FILE missing — migrate/collectstatic may hit dev/sqlite settings." >&2
fi

"$PYTHON" manage.py migrate --noinput
"$PYTHON" manage.py collectstatic --noinput
# Compile gettext catalogs (FR/EN/NL/IT/ES) committed under quizonline-server/locale/.
# The .po sources are tracked, the .mo binaries are gitignored, so every deploy
# regenerates them. Requires GNU gettext (msgfmt) — installed alongside the
# other apt packages in deploy/README.md bootstrap.
"$PYTHON" manage.py compilemessages

# ── 3. Frontend ──────────────────────────────────────────────────────────────
if [ "$SKIP_FRONTEND" = true ]; then
  echo "[3/6] Skipping frontend build (--skip-frontend)"
else
  echo "[3/6] Rebuilding frontend..."
  cd "$FRONTEND_DIR"
  npm ci --silent
  export NODE_OPTIONS="--max-old-space-size=1024"
  npx ng build --configuration=production
fi

# ── 4. Restart services ─────────────────────────────────────────────────────
# NOTE: this script no longer installs the systemd unit files or runs
# ``daemon-reload``. The units are installed by ROOT, straight from the
# committed git blob (origin/main), in .github/workflows/deploy.yml — before
# this script runs — and root issues the ``daemon-reload`` there. That keeps
# a (hypothetically compromised) ``django`` from ever placing or altering a
# root-run unit, so the django sudoers grant is now restart + nginx only
# (see deploy/sudoers/quizonline-deploy). A purely-manual ``redeploy.sh``
# run therefore assumes the units on disk are already current.
echo "[4/6] Restarting services..."
# Invoke systemctl by its absolute /bin path so the sudoers Cmnd match is
# literal and independent of secure_path resolution (usrmerge: /bin ->
# /usr/bin). /bin/systemctl is the exact path whitelisted in
# deploy/sudoers/quizonline-deploy.
sudo /bin/systemctl restart quizonline-gunicorn quizonline-celery quizonline-celery-beat
if [ -n "$WEB_SERVER" ]; then
  sudo /bin/systemctl reload "$WEB_SERVER"
fi

# ── 5. Verify services ──────────────────────────────────────────────────────
echo "[5/6] Verifying..."

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

  # Config syntax test (use absolute paths so sudoers matches).
  # Trust the binary's own exit code rather than grepping a localised
  # success string, and surface the actual output when the check fails
  # so the next debug round doesn't need to SSH in.
  case "$WEB_SERVER" in
    nginx)
      WEB_TEST_OUTPUT=$(sudo /usr/sbin/nginx -t 2>&1)
      WEB_TEST_RC=$?
      if [ "$WEB_TEST_RC" -eq 0 ]; then
        ok "nginx config: syntax OK"
      else
        warn "nginx config: syntax error (exit=$WEB_TEST_RC)"
        echo "$WEB_TEST_OUTPUT" | sed 's/^/      /'
      fi
      ;;
    apache2)
      WEB_TEST_OUTPUT=$(sudo /usr/sbin/apachectl configtest 2>&1)
      WEB_TEST_RC=$?
      if [ "$WEB_TEST_RC" -eq 0 ]; then
        ok "apache2 config: Syntax OK"
      else
        warn "apache2 config: syntax error (exit=$WEB_TEST_RC)"
        echo "$WEB_TEST_OUTPUT" | sed 's/^/      /'
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

# SSL certificate — query the live TLS endpoint (works for wildcard /
# shared certs without needing filesystem access)
EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$EXPIRY" ]; then
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
  warn "Could not retrieve SSL certificate from $DOMAIN:443"
fi

# HTTPS reachable
if curl -sf "https://$DOMAIN/" > /dev/null 2>&1; then
  ok "HTTPS reachable: https://$DOMAIN/"
else
  warn "HTTPS not reachable: https://$DOMAIN/"
fi

# ── 6. Summary ───────────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "=== Redeploy complete — all checks passed ==="
else
  echo "=== Redeploy complete — $ERRORS warning(s) ==="
  echo "Check logs: sudo journalctl -u quizonline-gunicorn -n 50"
fi
