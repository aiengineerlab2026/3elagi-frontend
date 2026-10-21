#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib-node20.sh"

NODE_BIN="$(ensure_node20)"

echo "Building static web app → assets/web/"
rm -rf dist-local assets/web
"$NODE_BIN" "$ROOT/node_modules/expo/bin/cli" export --platform web --output-dir dist-local

mkdir -p assets/web
cp -R dist-local/. assets/web/
rm -rf dist-local

FILE_COUNT="$(find assets/web -type f | wc -l | tr -d ' ')"
echo "Done. Bundled $FILE_COUNT files into assets/web/"

if [ -d "$ROOT/android/app/src/main/assets" ]; then
  bash "$ROOT/scripts/copy-web-to-android.sh"
fi
