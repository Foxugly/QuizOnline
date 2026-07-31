#!/usr/bin/env bash
#
# QuizOnline — SSM-invoked deploy wrapper.
#
# Called from the GitHub Actions deploy workflow via:
#   aws ssm send-command --document-name AWS-RunShellScript \
#     --parameters 'commands=["sudo -u django bash .../ssm-deploy.sh <SHA> <BUCKET>"]'
#
# Responsibilities:
#   1. Run the existing redeploy.sh (backend update + service restart),
#      with --skip-frontend because CI already built the bundle and we
#      pull it from S3 instead of rebuilding on the memory-limited box.
#   2. Download the SHA-tagged frontend bundle from S3 (instance role
#      provides s3:GetObject on s3://foxugly-deploy/builds/quizonline/*).
#   3. Atomically swap the dist/ directory and reload nginx.
#
# Idempotency / safety:
#   - Bundle is downloaded to a temp dir first, extracted there, then
#     promoted by renaming directories so a download/extract failure
#     never leaves the live dist/ in a half-state.
#   - The previous dist/ is kept as dist/quizonline-frontend/browser.bak
#     until the next successful deploy, so a manual rollback is one mv.
set -euo pipefail

# The extracted frontend bundle is group www-data, not world-accessible.
# nginx (www-data) serves it via the group (django's primary group is also
# www-data), so dropping world-read does not 403 static assets.
umask 027

if [ $# -lt 2 ]; then
  echo "Usage: $0 <SHA> <BUCKET>" >&2
  exit 64
fi

SHA="$1"
BUCKET="$2"
REPO_DIR=/var/www/django_websites/QuizOnline
FRONTEND_PARENT="$REPO_DIR/quizonline-frontend/dist/quizonline-frontend"
LIVE_DIR="$FRONTEND_PARENT/browser"
PREV_DIR="$FRONTEND_PARENT/browser.prev"
STAGING_DIR="$FRONTEND_PARENT/browser.staging.$SHA"
# Copies PURES du bundle livre (jamais fusionnees), qui servent de generation
# precedente au deploiement suivant. Snapshoter le docroot fusionne a la place
# ferait s'empiler les generations sans fin — constate sur foxugly, ou 135
# bundles s'etaient accumules depuis mai.
PURE_DIR="$FRONTEND_PARENT/browser.pure"
PURE_PREV_DIR="$FRONTEND_PARENT/browser.pure.prev"

echo "=== QuizOnline SSM deploy ==="
echo "  SHA:    $SHA"
echo "  Bucket: $BUCKET"
echo "  Repo:   $REPO_DIR"
echo ""

# ── 1. Backend update + service restart ──────────────────────────────────────
echo "[1/4] Running redeploy.sh --skip-frontend..."
cd "$REPO_DIR"
bash deploy/redeploy.sh --skip-frontend

# ── 2. Stage the new frontend bundle ─────────────────────────────────────────
echo "[2/4] Fetching frontend bundle from S3..."
TMP_TAR=$(mktemp -t "qol-build.XXXXXX.tar.gz")
trap 'rm -f "$TMP_TAR"' EXIT
aws s3 cp "s3://$BUCKET/builds/quizonline/$SHA.tar.gz" "$TMP_TAR" --region eu-west-1

echo "[3/4] Extracting to staging dir..."
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"
tar -xzf "$TMP_TAR" -C "$STAGING_DIR"

# ── 3. Atomic swap + nginx reload ────────────────────────────────────────────
echo "[4/4] Promoting bundle and reloading nginx..."
# Move the live dir aside (kept for one-step rollback), then promote
# the staging dir into place. ``mv`` is atomic on the same filesystem.
if [ -d "$LIVE_DIR" ]; then
  rm -rf "$PREV_DIR"
  mv "$LIVE_DIR" "$PREV_DIR"
fi
mv "$STAGING_DIR" "$LIVE_DIR"

# Les chunks portent une empreinte du contenu : un deploiement les renomme
# tous. Un onglet ouvert AVANT reclamerait un fichier disparu des que son
# proprietaire navigue vers une route pas encore visitee. On sert donc la
# generation courante UNION la precedente. ``--ignore-existing`` garantit que
# l'ancienne ne peut jamais ecraser la nouvelle (index.html en particulier).
rm -rf "$PURE_PREV_DIR"
if [ -d "$PURE_DIR" ]; then
  mv "$PURE_DIR" "$PURE_PREV_DIR"
fi
cp -a "$LIVE_DIR" "$PURE_DIR"
if [ -d "$PURE_PREV_DIR" ]; then
  rsync -a --ignore-existing "$PURE_PREV_DIR/" "$LIVE_DIR/"
  echo "  previous bundle merged (stale-chunk retention)"
fi

# Absolute /bin/systemctl so the sudoers Cmnd match is literal (usrmerge:
# /bin -> /usr/bin); /bin/systemctl reload nginx is the exact whitelisted
# command. nginx is the only reverse proxy on this host.
if systemctl is-active --quiet nginx; then
  sudo /bin/systemctl reload nginx
  echo "  nginx reloaded"
else
  echo "  no reverse proxy active, skipped reload" >&2
fi

echo ""
echo "=== Deploy $SHA complete ==="
echo "  Previous bundle preserved at: $PREV_DIR"
echo "  Rollback (if needed):"
echo "    sudo -u django bash -c 'rm -rf $LIVE_DIR && mv $PREV_DIR $LIVE_DIR && sudo /bin/systemctl reload nginx'"
