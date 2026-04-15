#!/usr/bin/env bash
#
# QuizOnline — EC2 deployment script (Ubuntu 22.04+)
#
# Usage: ssh into your EC2 instance, clone the repo, then run:
#   bash deploy/setup.sh YOUR_DOMAIN
#
# Prerequisites:
#   - EC2 instance with Ubuntu 22.04+ and at least 1 GB RAM
#   - Security group allows inbound 80 and 443
#   - A DNS A record pointing YOUR_DOMAIN to the EC2 public IP
#
set -euo pipefail

DOMAIN="${1:?Usage: $0 YOUR_DOMAIN}"
APP_DIR="/opt/quizonline"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== QuizOnline deployment for $DOMAIN ==="

# --- System packages ---
echo "[1/8] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq python3 python3-venv python3-pip apache2 certbot python3-certbot-apache nodejs npm git

# --- Node.js 22 (if not already installed) ---
NODE_MAJOR=$(node -v 2>/dev/null | grep -oP '(?<=v)\d+' || echo 0)
if [ "$NODE_MAJOR" -lt 20 ]; then
    echo "[1b] Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
fi

# --- Directory structure ---
echo "[2/8] Setting up directories..."
sudo mkdir -p "$APP_DIR"/{backend,frontend,venv}
sudo mkdir -p /var/log/quizonline
sudo chown -R ubuntu:www-data "$APP_DIR" /var/log/quizonline

# --- Backend ---
echo "[3/8] Deploying backend..."
rsync -a --delete "$REPO_DIR/quizonline-server/" "$APP_DIR/backend/"
python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt"
"$APP_DIR/venv/bin/pip" install gunicorn

# --- Backend .env ---
if [ ! -f "$APP_DIR/backend/.env" ]; then
    echo "[3b] Creating .env from template (EDIT THIS!)..."
    cp "$REPO_DIR/deploy/env.production.example" "$APP_DIR/backend/.env"
    sed -i "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/backend/.env"
    # Generate secrets
    SECRET_KEY=$("$APP_DIR/venv/bin/python" -c "import secrets; print(secrets.token_hex(32))")
    JWT_KEY=$("$APP_DIR/venv/bin/python" -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s/CHANGE_ME_generate_with_python_c_import_secrets_print_secrets_token_hex_32/$SECRET_KEY/" "$APP_DIR/backend/.env"
    sed -i "s/CHANGE_ME_different_from_SECRET_KEY/$JWT_KEY/" "$APP_DIR/backend/.env"
    echo "    >>> IMPORTANT: Edit $APP_DIR/backend/.env to set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD"
fi

# --- Django setup ---
echo "[4/8] Running Django migrations + collectstatic..."
cd "$APP_DIR/backend"
"$APP_DIR/venv/bin/python" manage.py migrate --noinput
"$APP_DIR/venv/bin/python" manage.py collectstatic --noinput

# --- Frontend build ---
echo "[5/8] Building Angular frontend..."
cd "$REPO_DIR/quizonline-frontend"
npm ci
npx ng build --configuration=production
rsync -a --delete dist/quizonline-frontend/browser/ "$APP_DIR/frontend/"

# --- Apache ---
echo "[6/8] Configuring Apache..."
sudo a2enmod rewrite proxy proxy_http ssl headers
sudo cp "$REPO_DIR/deploy/apache.conf" "/etc/apache2/sites-available/quizonline.conf"
sudo sed -i "s/YOUR_DOMAIN/$DOMAIN/g" "/etc/apache2/sites-available/quizonline.conf"
sudo a2dissite 000-default.conf 2>/dev/null || true
sudo a2ensite quizonline.conf
sudo apachectl configtest
sudo systemctl reload apache2

# --- Gunicorn systemd service ---
echo "[7/8] Setting up gunicorn service..."
sudo cp "$REPO_DIR/deploy/gunicorn.service" /etc/systemd/system/quizonline.service
sudo systemctl daemon-reload
sudo systemctl enable quizonline
sudo systemctl restart quizonline

# --- HTTPS (Let's Encrypt) ---
echo "[8/8] Setting up HTTPS with Let's Encrypt..."
echo "    Running certbot for $DOMAIN..."
sudo certbot --apache -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
    echo "    >>> Certbot failed. Run manually: sudo certbot --apache -d $DOMAIN"
}

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Backend:  https://$DOMAIN/api/docs/"
echo "Frontend: https://$DOMAIN/"
echo "Admin:    https://$DOMAIN/admin/"
echo ""
echo "Service commands:"
echo "  sudo systemctl status quizonline"
echo "  sudo systemctl restart quizonline"
echo "  sudo journalctl -u quizonline -f"
echo ""
echo "Create a superuser:"
echo "  cd $APP_DIR/backend && $APP_DIR/venv/bin/python manage.py createsuperuser"
echo ""
echo "IMPORTANT: Edit $APP_DIR/backend/.env to configure email settings!"
