#!/usr/bin/env bash
# Stop the brainstorm server and clean up
# Usage: stop-server.sh <session_dir>
#
# Kills the server process. Only deletes session directory if it's
# under /tmp (ephemeral). Persistent directories (.superpowers/) are
# kept so mockups can be reviewed later.

SESSION_DIR="$1"

if [[ -z "$SESSION_DIR" ]]; then
  echo '{"error": "Usage: stop-server.sh <session_dir>"}'
  exit 1
fi

STATE_DIR="${SESSION_DIR}/state"
PID_FILE="${STATE_DIR}/server.pid"

if [[ -f "$PID_FILE" ]]; then
  pid=$(cat "$PID_FILE")

  if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
    echo '{"error": "invalid pid in pid file"}'
    exit 1
  fi

  # Try to stop gracefully, fallback to force if still alive
  kill "$pid" 2>/dev/null || true

  # Wait for graceful shutdown (up to ~2s)
  for i in {1..20}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    sleep 0.1
  done

  # If still running, escalate to SIGKILL
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true

    # Give SIGKILL a moment to take effect
    sleep 0.1
  fi

  if kill -0 "$pid" 2>/dev/null; then
    echo '{"status": "failed", "error": "process still running"}'
    exit 1
  fi

  # Only delete ephemeral /tmp directories, and only after resolving symlinks
  # so a crafted SESSION_DIR can't rm -rf something outside /tmp. Resolved
  # BEFORE any rm so nothing is removed from an un-canonicalized path.
  REAL_SESSION_DIR="$(cd "$SESSION_DIR" 2>/dev/null && pwd -P || true)"

  rm -f "$PID_FILE" "${STATE_DIR}/server.log"

  if [[ "$REAL_SESSION_DIR" == /tmp/brainstorm-* ]]; then
    rm -rf "$REAL_SESSION_DIR"
  else
    echo '{"note": "session directory not deleted: not a canonical /tmp/brainstorm-* path"}'
  fi

  echo '{"status": "stopped"}'
else
  echo '{"status": "not_running"}'
fi
