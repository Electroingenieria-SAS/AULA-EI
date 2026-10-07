#!/usr/bin/env bash
set -euo pipefail

PORT=4173
BASE_URL="http://127.0.0.1:${PORT}/AULA-EI/#/login"
LOG_FILE="/tmp/aula-ei-preview.log"
DOM_FILE="/tmp/aula-ei-smoke-dom.html"

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

"$CHROME"   --headless=new   --no-sandbox   --disable-gpu   --disable-dev-shm-usage   --window-size=390,844   --virtual-time-budget=5000   --dump-dom   "$BASE_URL" >"$DOM_FILE"

grep -q "Aula EI" "$DOM_FILE"
grep -Eq "Iniciar sesión|Acceso seguro|Correo" "$DOM_FILE"

if grep -q "Aula EI encontró un error inesperado" "$DOM_FILE"; then
  echo "::error::El ErrorBoundary se activó durante el smoke test."
  exit 1
fi

echo "Browser smoke passed: login renderizado con JavaScript en 390x844."
