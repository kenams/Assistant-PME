#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${ASSISTANT_BASE_URL:-http://localhost:3001}"

echo "Smoke test: $BASE_URL"

curl -fsS "$BASE_URL/health" >/dev/null
curl -fsS "$BASE_URL/debug/paths" >/dev/null

echo "Smoke test OK"
