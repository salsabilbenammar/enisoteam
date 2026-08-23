#!/bin/bash
# Crée la base MySQL ENISO Team (à lancer une fois sur le serveur).
# Usage :
#   export DB_NAME=eniso_team DB_USER=eniso DB_PASS='mot_de_passe_fort'
#   sudo -E bash deploy/oracle/init-database.sh
set -euo pipefail

DB_NAME="${DB_NAME:-eniso_team}"
DB_USER="${DB_USER:-eniso}"
DB_PASS="${DB_PASS:-}"

if [[ -z "$DB_PASS" ]]; then
  echo "Définissez DB_PASS, ex. : export DB_PASS='VotreMotDePasse123!'"
  exit 1
fi

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "Base ${DB_NAME} et utilisateur ${DB_USER}@localhost créés."
