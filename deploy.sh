#!/usr/bin/env bash
# Pubblica Sottocosto da Cloud Shell. Uso:  ./deploy.sh [all|hosting|functions]
#   all        sito + regole + funzioni (predefinito)
#   hosting    solo sito e regole Firestore/Storage (più veloce)
#   functions  solo le funzioni Python
set -euo pipefail
cd "$(dirname "$0")"
TARGET="${1:-all}"
case "$TARGET" in all|hosting|functions) ;; *) echo "Uso: $0 [all|hosting|functions]"; exit 1 ;; esac

echo "▶ Scarico gli ultimi aggiornamenti…"
git pull --ff-only

if [ "$TARGET" != functions ]; then
  [ -f web/.env ] || { echo "✗ Manca web/.env (vedi README, sezione Setup)"; exit 1; }
  echo "▶ Compilo il sito…"
  (cd web && npm install --no-audit --no-fund --silent && npm run build)
fi

if [ "$TARGET" != hosting ]; then
  echo "▶ Preparo l'ambiente Python…"
  PY="$(command -v python3.12 || command -v python3)"
  [ -d functions/venv ] || "$PY" -m venv functions/venv
  functions/venv/bin/pip install -q -r functions/requirements.txt
  # shellcheck disable=SC1091
  . functions/venv/bin/activate
fi

echo "▶ Pubblico ($TARGET)…"
case "$TARGET" in
  all)       firebase deploy ;;
  hosting)   firebase deploy --only hosting,firestore,storage ;;
  functions) firebase deploy --only functions ;;
esac
echo "✔ Fatto."
