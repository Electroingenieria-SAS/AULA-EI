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
  errors="/tmp/aula-ei-smoke-${label}.log"
  passed=0
  # A transient Chrome failure gets retried; no DOM assertion is skipped.
  for attempt in 1 2 3; do
    profile_dir="$(mktemp -d "/tmp/aula-ei-chrome-${label}-XXXXXX")"
    if "$CHROME" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --disable-extensions --disable-background-networking --user-data-dir="$profile_dir" --window-size="$viewport" --virtual-time-budget=5000 --dump-dom "$BASE_URL" >"$dom" 2>"$errors" &&
      grep -q "Aula EI" "$dom" &&
      grep -q 'name="aula-ei-release"' "$dom" &&
      grep -Eq "Iniciar sesión|Acceso seguro|Correo" "$dom" &&
      grep -q 'auth-form-clean' "$dom" &&
      grep -q 'dev-auth-signature' "$dom" &&
      grep -q 'Juan E. Pérez' "$dom" &&
      ! grep -q "Aula EI encontró un error inesperado" "$dom"; then
      passed=1
    fi
    rm -rf "$profile_dir"
    if [ "$passed" -eq 1 ]; then break; fi
    echo "::warning::Smoke ${label} failed attempt ${attempt}/3."
    sleep 1
  done
  if [ "$passed" -ne 1 ]; then
    echo "::error::Smoke ${label} falló luego de 3 intentos; no se certifica login."
    tail -n 18 "$errors" || true
    exit 1
  fi
  echo "Smoke OK: ${label}"
done

# Also verify the optimized static developer assets shipped in the public build.
for image in juan-perez-primary-blue.webp juan-perez-secondary-blue.webp; do
  target="/tmp/aula-ei-${image}"
  curl --fail --silent --show-error --location \
    "http://127.0.0.1:${PORT}/AULA-EI/brand/developer/${image}" -o "$target"
  test "$(head -c 4 "$target")" = "RIFF"
  test "$(wc -c < "$target")" -gt 5000
done

echo "Browser smoke matrix passed: 8 viewports entre 320px y 1440px."
