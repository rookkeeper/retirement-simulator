#!/usr/bin/env bash

# Restart the local Next.js development server and keep it attached to this shell.
# Next.js watches the project and applies/rebuilds changes automatically.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="${TMPDIR:-/tmp}"
PID_FILE="$TMP_DIR/historical-retirement-lab-dev.pid"
LEGACY_PID_FILE="$TMP_DIR/retirement-simulator-next.pid"
PORT="${PORT:-7665}"
NEXT_PATTERN="$ROOT_DIR/node_modules/.bin/next dev"

stop_tree() {
  local pid="$1"
  local child

  [[ "$pid" =~ ^[0-9]+$ ]] || return 0
  [[ "$pid" -gt 1 && "$pid" -ne $$ ]] || return 0
  kill -0 "$pid" 2>/dev/null || return 0

  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    stop_tree "$child"
  done

  kill -TERM "$pid" 2>/dev/null || true
  for _ in {1..20}; do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.1
  done
  kill -KILL "$pid" 2>/dev/null || true
}

stop_from_pid_file() {
  local pid_file="$1"
  local pid

  [[ -f "$pid_file" ]] || return 0
  pid="$(<"$pid_file")"
  stop_tree "$pid"
  rm -f "$pid_file"
}

echo "Stopping any existing Historical Retirement Lab dev server..."
stop_from_pid_file "$PID_FILE"
stop_from_pid_file "$LEGACY_PID_FILE"

# Also catch a server started manually without a PID file, but only when its
# executable belongs to this checkout.
for pid in $(pgrep -f "$NEXT_PATTERN" 2>/dev/null || true); do
  stop_tree "$pid"
done

cd "$ROOT_DIR"
echo "Starting Next.js dev server on http://localhost:$PORT"

npm run dev -- --port "$PORT" &
server_pid=$!
printf '%s\n' "$server_pid" > "$PID_FILE"

cleanup() {
  local status=$?
  rm -f "$PID_FILE"
  exit "$status"
}

forward_signal() {
  stop_tree "$server_pid"
  wait "$server_pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  exit 0
}

trap cleanup EXIT
trap forward_signal INT TERM

wait "$server_pid"
