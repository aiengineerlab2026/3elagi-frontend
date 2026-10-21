#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node_major() {
  "$1" -p "Number(process.versions.node.split('.')[0])"
}

find_node20() {
  if command -v node >/dev/null 2>&1; then
    local node_bin
    node_bin="$(command -v node)"
    if [ "$(node_major "$node_bin")" -ge 20 ]; then
      echo "$node_bin"
      return 0
    fi
  fi

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    unset npm_config_prefix 2>/dev/null || true
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    if [ -f .nvmrc ]; then
      nvm install >/dev/null 2>&1 || nvm install
      nvm use >/dev/null 2>&1
    else
      nvm install 20 >/dev/null 2>&1 || nvm install 20
      nvm use 20 >/dev/null 2>&1
    fi
    if command -v node >/dev/null 2>&1 && [ "$(node_major "$(command -v node)")" -ge 20 ]; then
      command -v node
      return 0
    fi
  fi

  local candidate
  for candidate in "$NVM_DIR/versions/node"/v20.*/bin/node; do
    if [ -x "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

NODE_BIN="$(find_node20 || true)"
if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "Error: Node 20+ is required for Expo 54 / Metro 0.83." >&2
  echo "Install with: nvm install 20 && nvm use 20" >&2
  exit 1
fi

"$NODE_BIN" scripts/ensure-node.js

# Stop stale Expo dev servers on the default ports for this project.
for port in 8081 8082; do
  pids="$(lsof -ti:"$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    while IFS= read -r pid; do
      [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
    done <<< "$pids"
  fi
done

export PATH="$(dirname "$NODE_BIN"):$PATH"
exec "$NODE_BIN" "$ROOT/node_modules/expo/bin/cli" start --web "$@"
