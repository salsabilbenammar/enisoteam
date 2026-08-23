#!/bin/bash
# Vérifie que l'API, la BDD et le frontend dist sont prêts.
# Usage : bash deploy/oracle/healthcheck.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OK=0
FAIL=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "OK  — $name"
    OK=$((OK + 1))
  else
    echo "FAIL — $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== ENISO Team — healthcheck ==="

check "backend/.env" test -f "$ROOT/backend/.env"
check "frontend/dist/index.html" test -f "$ROOT/frontend/dist/index.html"
check "Node écoute :5000" bash -c 'ss -ltn 2>/dev/null | grep -q ":5000" || netstat -ltn 2>/dev/null | grep -q ":5000"'
check "API /api/health" bash -c 'curl -sf http://127.0.0.1:5000/api/health | grep -q "\"status\":\"ok\""'
check "PM2 eniso-api" bash -c 'pm2 describe eniso-api >/dev/null 2>&1'

echo ""
echo "Résultat : $OK OK, $FAIL échec(s)"
[[ "$FAIL" -eq 0 ]]
