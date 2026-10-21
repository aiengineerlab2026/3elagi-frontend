#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_HOME_DIR="${JAVA_HOME:-$HOME/.local/jdk-17/Contents/Home}"
ANDROID_HOME_DIR="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"

if [ ! -x "$JAVA_HOME_DIR/bin/java" ]; then
  echo "Installing portable JDK 17 to $HOME/.local/jdk-17 ..."
  mkdir -p "$HOME/.local"
  tmp="$(mktemp -d)"
  curl -fsSL "https://api.adoptium.net/v3/binary/latest/17/ga/mac/aarch64/jdk/hotspot/normal/eclipse?project=jdk" -o "$tmp/jdk17.tar.gz"
  tar -xzf "$tmp/jdk17.tar.gz" -C "$tmp"
  rm -rf "$HOME/.local/jdk-17"
  mv "$tmp"/jdk-17* "$HOME/.local/jdk-17"
  rm -rf "$tmp"
fi

if ! command -v sdkmanager >/dev/null 2>&1; then
  echo "Install Android command-line tools first:"
  echo "  brew install --cask android-commandlinetools"
  exit 1
fi

export JAVA_HOME="$JAVA_HOME_DIR"
export ANDROID_HOME="$ANDROID_HOME_DIR"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

yes | sdkmanager --licenses >/dev/null
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"

mkdir -p "$ROOT_DIR/android"
cat >"$ROOT_DIR/android/local.properties" <<EOF
sdk.dir=$ANDROID_HOME
EOF

DEFAULT_SDK="$HOME/Library/Android/sdk"
if [ ! -e "$DEFAULT_SDK" ] && [ -d "$ANDROID_HOME" ]; then
  mkdir -p "$(dirname "$DEFAULT_SDK")"
  ln -sf "$ANDROID_HOME" "$DEFAULT_SDK"
fi

ENV_FILE="$ROOT_DIR/.env"
touch "$ENV_FILE"
grep -v '^JAVA_HOME=' "$ENV_FILE" | grep -v '^ANDROID_HOME=' | grep -v '^ANDROID_SDK_ROOT=' >"$ENV_FILE.tmp" || true
mv "$ENV_FILE.tmp" "$ENV_FILE"
cat >>"$ENV_FILE" <<EOF
JAVA_HOME=$JAVA_HOME
ANDROID_HOME=$ANDROID_HOME
ANDROID_SDK_ROOT=$ANDROID_HOME
EOF

echo "Android toolchain ready."
echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"
echo "Updated $ENV_FILE and $DEFAULT_SDK symlink."
