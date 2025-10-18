#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

# Colors
cyan() { printf "\033[36m%s\033[0m\n" "$*"; }

echo ""
cyan "==> Installing frontend dependencies"
if [ -f package-lock.json ] || [ -f package.json ]; then
  npm ci || npm i
fi

# Install server deps if present
if [ -d server ]; then
  cyan "==> Installing server dependencies"
  (cd server && (npm ci || npm i))
fi

# Start backend if present
if [ -d server ]; then
  cyan "==> Starting backend (port 4000)"
  (
    cd server
    # Prefer npm start; fallback to node index.js/server.js
    if npm run -s start >/dev/null 2>&1; then
      npm start &
    elif [ -f index.js ]; then
      node index.js &
    elif [ -f server.js ]; then
      node server.js &
    else
      echo "No start script or entry file found in server/. Skipping backend." >&2
    fi
  )
  BACKEND_PID=$!
  sleep 2
fi

# Start frontend
cyan "==> Starting frontend (Vite dev server)"
if npm run -s dev >/dev/null 2>&1; then
  npm run dev &
else
  echo "No dev script in package.json" >&2
  exit 1
fi
FRONTEND_PID=$!

# Open browser if xdg-open/open available
URL="http://localhost:5173"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" || true
elif command -v open >/dev/null 2>&1; then
  open "$URL" || true
fi

cyan "==> Running. Press Ctrl+C to stop."
trap 'echo; cyan "==> Stopping..."; kill ${BACKEND_PID:-} ${FRONTEND_PID:-} 2>/dev/null || true; exit 0' INT
wait
