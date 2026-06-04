#!/bin/zsh
set -euo pipefail

THRESHOLD_MS="${IDLE_THRESHOLD_MS:-600000}"
STATE_DIR="${HOME}/Library/Application Support/UrbanMistriiIdleMonitor"
STATE_FILE="${STATE_DIR}/state"
mkdir -p "${STATE_DIR}"

idle_ms="$(ioreg -c IOHIDSystem | awk '/HIDIdleTime/ { print int($NF/1000000); exit }')"
previous_state="active"

if [[ -f "${STATE_FILE}" ]]; then
  previous_state="$(<"${STATE_FILE}")"
fi

if (( idle_ms >= THRESHOLD_MS )); then
  if [[ "${previous_state}" != "alerted" ]]; then
    osascript -e 'display notification "This system has been idle for 10 minutes or more." with title "Urban Mistrii Idle Monitor"'
    printf 'alerted' > "${STATE_FILE}"
  fi
else
  if [[ "${previous_state}" != "active" ]]; then
    printf 'active' > "${STATE_FILE}"
  fi
fi
