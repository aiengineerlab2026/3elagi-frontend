#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib-node20.sh"

NODE_BIN="$(ensure_node20)"
"$NODE_BIN" scripts/ensure-node.js

export PATH="$(dirname "$NODE_BIN"):$PATH"

# Stale Metro (e.g. from `npm run web`) makes `run:android` skip the dev server.
# The phone then often cannot load JS and stays on the splash screen.
kill_expo_ports

# Forward Metro to the phone over USB before the native app launches.
export JAVA_HOME="${JAVA_HOME:-$HOME/.local/jdk-17/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ROOT/node_modules/.bin:$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

ensure_android_device || exit 1
adb_reverse_metro 8081

exec bash "$ROOT/scripts/android-env.sh" \
  "$NODE_BIN" "$ROOT/node_modules/expo/bin/cli" run:android \
  --app-id com.threelagi.mobile \
  "$@"
