#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "============================================================"
echo " AULA EI - VERIFICACION Y DESPLIEGUE"
echo "============================================================"

if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js 18+. Instálelo antes de continuar."
  exit 1
fi

node scripts/verify-static.mjs

echo
echo "Verificación correcta."
echo "Para servidor local: node scripts/serve-static.mjs"
echo "Para Vercel: npx vercel@latest --prod"
echo "Antes de desplegar, lea docs/ENTREGA_TECNICA_DOMINIO_SEGURIDAD.md"
