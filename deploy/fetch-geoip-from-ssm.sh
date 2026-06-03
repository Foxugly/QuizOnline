#!/usr/bin/env bash
#
# QuizOnline — fetch the MaxMind GeoLite2-City database.
#
# Reads its inputs from the runtime env file written by quizonline-env-fetch
# (NOT by calling SSM directly): GEOIP_PATH, MAXMIND_ACCOUNT_ID,
# MAXMIND_LICENSE_KEY. Why not SSM here: the box's default `aws` identity is
# the ``certbot-route53`` IAM user (used for the wildcard cert), which is
# granted ``ssm:GetParametersByPath`` (so env-fetch works) but NOT
# ``ssm:GetParameter`` — a direct lookup here would AccessDenied. env-fetch is
# the single SSM reader; everything else (this script included) reads its
# already-decrypted output at /run/quizonline/.env.
#
# Writes ``$GEOIP_PATH/GeoLite2-City.mmdb`` (0644 django:www-data) — the path
# Django's ``GeoIP2(GEOIP_PATH)`` reads in connectionlog/geoip.py.
#
# GRACEFUL: a missing key / failed download leaves any existing .mmdb in place
# (the download lands in a temp dir first), so connection-log geolocation just
# keeps using the last-known DB — or stays empty if there never was one.
#
# MaxMind serves downloads via R2 pre-signed URLs, so curl follows redirects
# (-L) to ``mm-prod-geoip-databases.*.r2.cloudflarestorage.com``.
#
# Invoked at install + weekly by quizonline-geoip-fetch.service/.timer (ordered
# After=quizonline-env-fetch.service so /run/quizonline/.env exists first).
set -euo pipefail

ENV_FILE="${QOL_ENV_FILE:-/run/quizonline/.env}"

# Pull a single KEY=VALUE from the env file without ``source`` (the file holds
# secrets with shell-special characters that sourcing would mangle).
val() { { grep -m1 "^$1=" "$ENV_FILE" 2>/dev/null || true; } | cut -d= -f2-; }

if [ ! -r "$ENV_FILE" ]; then
  echo "[geoip] $ENV_FILE not readable — is quizonline-env-fetch up? skipping"
  exit 0
fi

DEST_DIR="$(val GEOIP_PATH)"; DEST_DIR="${DEST_DIR:-/var/lib/geoip}"
ACCOUNT="$(val MAXMIND_ACCOUNT_ID)"
KEY="$(val MAXMIND_LICENSE_KEY)"

if [ -z "$KEY" ]; then
  echo "[geoip] no MAXMIND_LICENSE_KEY in $ENV_FILE — skipping (geolocation stays disabled)"
  exit 0
fi

mkdir -p "$DEST_DIR"
OUT="$DEST_DIR/GeoLite2-City.mmdb"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "[geoip] downloading GeoLite2-City → $OUT"
if [ -n "$ACCOUNT" ]; then
  # Current endpoint: HTTP Basic Auth (account id + license key).
  curl -fsSL -u "$ACCOUNT:$KEY" \
    "https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz" \
    -o "$TMP/db.tar.gz"
else
  # Legacy permalink (license key only) — still works, redirects to R2.
  curl -fsSL \
    "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=$KEY&suffix=tar.gz" \
    -o "$TMP/db.tar.gz"
fi

tar -xzf "$TMP/db.tar.gz" -C "$TMP" --strip-components=1 --wildcards "*/GeoLite2-City.mmdb"
install -m 0644 -o django -g www-data "$TMP/GeoLite2-City.mmdb" "$OUT"
echo "[geoip] $OUT ready ($(du -h "$OUT" | cut -f1))"
