#!/bin/bash
# Build + redémarrage après git pull.
# Usage (depuis la racine du projet) : bash deploy/oracle/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "=== ENISO Team — déploiement ==="

if [[ ! -f backend/.env ]]; then
  echo "Créez backend/.env (copiez deploy/oracle/env.production.example)."
  exit 1
fi

git pull origin main

echo "→ Frontend build..."
cd frontend
npm ci
npm run build

echo "→ Backend install..."
cd ../backend
npm ci --omit=dev

echo "→ PM2..."
cd "$ROOT"
if pm2 describe eniso-api >/dev/null 2>&1; then
  pm2 reload "$ROOT/deploy/oracle/ecosystem.config.cjs" --update-env
else
  pm2 start "$ROOT/deploy/oracle/ecosystem.config.cjs"
fi
pm2 save

echo ""
echo "Déploiement terminé."
pm2 status
echo "Test : curl -s http://127.0.0.1:5000/api/health"
