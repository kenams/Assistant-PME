#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"

cd "$BACKEND"
if [ ! -d node_modules ]; then
  npm install
fi

npm run dev &
npm run frontend:watch &
sleep 2

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:3001/app/user/"
elif command -v open >/dev/null 2>&1; then
  open "http://localhost:3001/app/user/"
else
  echo "Ouvrez http://localhost:3001/app/user/"
fi
