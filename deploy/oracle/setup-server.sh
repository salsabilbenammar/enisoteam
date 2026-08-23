#!/bin/bash
# Installation initiale sur Ubuntu (Oracle Cloud Always Free).
# Usage : bash deploy/oracle/setup-server.sh
set -euo pipefail

echo "=== ENISO Team — setup serveur Oracle Cloud ==="

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Relancez avec sudo : sudo bash deploy/oracle/setup-server.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Node.js 20 LTS
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

apt-get install -y git nginx mysql-server ufw certbot python3-certbot-nginx

npm install -g pm2

# Swap 2 Go (utile sur VM 1 Go RAM pour npm run build)
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Swap 2 Go activé."
fi

# MySQL : écoute locale uniquement
systemctl enable mysql
systemctl start mysql

# Pare-feu
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

mkdir -p /var/www/enisoteam
chown -R "${SUDO_USER:-ubuntu}:www-data" /var/www/enisoteam 2>/dev/null || true

echo ""
echo "=== Packages installés ==="
node -v
npm -v
nginx -v
mysql --version
pm2 -v
echo ""
echo "Prochaines étapes (voir deploy/oracle/README.md) :"
echo "  1. Ouvrir ports 22, 80, 443 dans Oracle Cloud → Security List"
echo "  2. Cloner le repo dans ~/enisoteam"
echo "  3. Configurer MySQL + backend/.env"
echo "  4. Importer la BDD + migrations"
echo "  5. bash deploy/oracle/deploy.sh"
echo "  6. Configurer Nginx + Certbot"
