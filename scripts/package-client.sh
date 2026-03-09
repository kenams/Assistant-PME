#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TS="$(date +%Y%m%d_%H%M)"
STAGING="/tmp/assistant_pme_package_${TS}"
ZIP_PATH="${ROOT_DIR}/assistant_pme_package_${TS}.zip"

rm -rf "${STAGING}"
mkdir -p "${STAGING}"

rsync -a --exclude "node_modules" --exclude "data" --exclude "logs" "${ROOT_DIR}/app/" "${STAGING}/app/"
rsync -a --exclude "node_modules" --exclude "data" --exclude "logs" --exclude ".env" --exclude ".env.*" "${ROOT_DIR}/backend/" "${STAGING}/backend/"
rsync -a "${ROOT_DIR}/docs/" "${STAGING}/docs/"

cp "${ROOT_DIR}/README.md" "${STAGING}/README.md"
cp "${ROOT_DIR}/start-local.bat" "${STAGING}/start-local.bat"
cp "${ROOT_DIR}/start-local.ps1" "${STAGING}/start-local.ps1"
cp "${ROOT_DIR}/start-local.sh" "${STAGING}/start-local.sh"

cd "${STAGING}"
zip -r "${ZIP_PATH}" .

rm -rf "${STAGING}"
echo "Package created: ${ZIP_PATH}"
