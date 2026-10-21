#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/web"
DEST="$ROOT/android/app/src/main/assets/web"

if [ ! -f "$SRC/index.html" ]; then
  echo "No local web bundle at assets/web/. Run: npm run build:web-local" >&2
  exit 1
fi

mkdir -p "$DEST"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SRC/." "$DEST/"
echo "Copied web bundle → android/app/src/main/assets/web/ ($(find "$DEST" -type f | wc -l | tr -d ' ') files)"
