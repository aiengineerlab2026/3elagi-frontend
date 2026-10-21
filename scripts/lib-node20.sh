#!/usr/bin/env bash
# Shared helpers: resolve Node 20+ for Expo 54 / Metro 0.83.

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

ensure_node20() {
  local node_bin
  node_bin="$(find_node20 || true)"
  if [ -z "$node_bin" ] || [ ! -x "$node_bin" ]; then
    echo "Error: Node 20+ is required for Expo 54 / Metro 0.83." >&2
    echo "Install with: nvm install 20 && nvm use 20" >&2
    return 1
  fi
  echo "$node_bin"
}

resolve_adb() {
  local sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  if [ -n "$sdk" ] && [ -x "$sdk/platform-tools/adb" ]; then
    echo "$sdk/platform-tools/adb"
    return 0
  fi
  if command -v adb >/dev/null 2>&1; then
    command -v adb
    return 0
  fi
  return 1
}

count_authorized_devices() {
  local adb_bin="$1"
  "$adb_bin" devices 2>/dev/null | awk 'NR>1 && $2=="device" { count++ } END { print count + 0 }'
}

print_device_status() {
  local adb_bin="$1"
  "$adb_bin" devices 2>/dev/null | awk 'NR>1 && NF>=2 { printf "  - %s (%s)\n", $1, $2 }' >&2
}

ensure_android_device() {
  local adb_bin
  adb_bin="$(resolve_adb)" || {
    echo "Error: adb not found. Run: npm run android:setup" >&2
    return 1
  }

  local tries=0
  local max_tries=30

  while [ "$tries" -lt "$max_tries" ]; do
    "$adb_bin" start-server >/dev/null 2>&1 || true
    if [ "$(count_authorized_devices "$adb_bin")" -gt 0 ]; then
      echo "› Android device ready"
      return 0
    fi

    if [ "$tries" -eq 0 ]; then
      # Stale ADB daemons often list zero devices until restarted.
      "$adb_bin" kill-server >/dev/null 2>&1 || true
      sleep 1
      "$adb_bin" start-server >/dev/null 2>&1 || true
    elif [ "$tries" -eq 5 ]; then
      echo "› Waiting for Android device (USB debugging on, accept RSA prompt on phone)..."
    fi

    tries=$((tries + 1))
    sleep 1
  done

  echo "Error: No authorized Android device found." >&2
  print_device_status "$adb_bin"
  echo "Tips: unlock the phone, use a data USB cable, re-plug USB, then run: adb devices" >&2
  return 1
}

kill_expo_ports() {
  for port in 8081 8082; do
    local pids
    pids="$(lsof -ti:"$port" 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      while IFS= read -r pid; do
        [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
      done <<< "$pids"
    fi
  done
}

adb_reverse_metro() {
  local port="${1:-8081}"
  local adb_bin
  adb_bin="$(resolve_adb)" || return 0
  local serial
  while IFS= read -r serial; do
    [ -z "$serial" ] && continue
    "$adb_bin" -s "$serial" reverse "tcp:${port}" "tcp:${port}" 2>/dev/null || true
  done < <("$adb_bin" devices 2>/dev/null | awk 'NR>1 && $2=="device" { print $1 }')
}

wait_for_metro() {
  local port="${1:-8081}"
  local tries=0
  while [ "$tries" -lt 60 ]; do
    if curl -sf "http://localhost:${port}/status" >/dev/null 2>&1; then
      return 0
    fi
    tries=$((tries + 1))
    sleep 0.5
  done
  echo "Warning: Metro did not respond on port ${port} in time." >&2
  return 1
}
