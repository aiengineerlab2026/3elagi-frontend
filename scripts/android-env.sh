#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

export JAVA_HOME="${JAVA_HOME:-$HOME/.local/jdk-17/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ROOT_DIR/node_modules/.bin:$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

# Expo CLI looks for ~/Library/Android/sdk by default when ANDROID_HOME is unset.
DEFAULT_SDK="$HOME/Library/Android/sdk"
if [ ! -e "$DEFAULT_SDK" ] && [ -d "$ANDROID_HOME" ]; then
  mkdir -p "$(dirname "$DEFAULT_SDK")"
  ln -sf "$ANDROID_HOME" "$DEFAULT_SDK" 2>/dev/null || true
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi
