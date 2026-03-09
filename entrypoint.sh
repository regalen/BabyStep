#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Apply timezone
if [ -n "$TZ" ]; then
  ln -snf /usr/share/zoneinfo/"$TZ" /etc/localtime 2>/dev/null || true
  echo "$TZ" > /etc/timezone 2>/dev/null || true
fi

# Ensure /config exists and is owned by the target UID/GID
mkdir -p /config
chown -R "${PUID}:${PGID}" /config 2>/dev/null || true

# Drop privileges and run the Next.js standalone server
exec su-exec "${PUID}:${PGID}" node /app/server.js
