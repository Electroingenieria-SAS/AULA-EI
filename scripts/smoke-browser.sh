#!/usr/bin/env bash
set -euo pipefail

PORT=4173
BASE_URL="http://127.0.0.1:${PORT}/AULA-EI/#/login"
LOG_FILE="/tmp/aula-ei-preview.log"

./node_modules/.bin/vite preview --host 127.0.0.1 --port "$PORT" >"$LOG_FILE" 2>&1 &
PREVIEW_PID=$!
cleanup() {
  kill "$PREVIEW_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in {1..30}; do
  if curl --fail --silent "http://127.0.0.1:${PORT}/AULA-EI/" >/dev/null; then
    break
  fi
  sleep 1
done

CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
if [ -z "$CHROME" ]; then
  echo "::error::Chrome/Chromium no está disponible en el runner."
  exit 1
fi

VIEWPORTS=(
  "320,700"
  "360,800"
  "390,844"
  "430,932"
  "768,1024"
  "1024,768"
  "1280,800"
  "1440,900"
)

for viewport in "${VIEWPORTS[@]}"; do
  label="${viewport/,/x}"
  dom="/tmp/aula-ei-smoke-${label}.html"

  "$CHROME"     --headless=new     --no-sandbox     --disable-gpu     --disable-dev-shm-usage     --window-size="$viewport"     --virtual-time-budget=5000     --dump-dom     "$BASE_URL" >"$dom"

  grep -q "Aula EI" "$dom"
  grep -Eq "Iniciar sesión|Acceso seguro|Correo" "$dom"

  if grep -q "Aula EI encontró un error inesperado" "$dom"; then
    echo "::error::El ErrorBoundary se activó en viewport ${label}."
    exit 1
  fi

  echo "Smoke OK: ${label}"
done

echo "Browser smoke matrix passed: 8 viewports entre 320px y 1440px."
