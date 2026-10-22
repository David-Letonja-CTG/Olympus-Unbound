#!/usr/bin/env bash
# Daily database backup (docs/hosting.md): dumps PostgreSQL in custom format next to this script, uploads the dump
# to OCI Object Storage through the pre-authenticated write URL in .env (BACKUP_URL, ending in /o/), and keeps the
# newest 3 dumps locally. Run by the olympus-backup systemd timer; safe to run by hand.
set -euo pipefail

# Dumps hold the world boards; only the deploy user may read them.
umask 077
cd "$(dirname "$(readlink -f "$0")")"
mkdir -p backups
chmod 700 backups

name="olympus-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T db pg_dump -U olympus -d olympus -Fc > "backups/$name.partial"
mv "backups/$name.partial" "backups/$name"
echo "dumped backups/$name ($(stat -c %s "backups/$name") bytes)"

# Read only BACKUP_URL from .env; the file is in compose format, not shell syntax.
backup_url="$(grep -E '^BACKUP_URL=' .env 2>/dev/null | head -n 1 | cut -d= -f2- || true)"
if [ -n "$backup_url" ]; then
  curl -fsS --retry 3 --upload-file "backups/$name" "${backup_url%/}/$name"
  echo "uploaded $name"
else
  echo "BACKUP_URL is not set; the dump is kept on this machine only"
fi

# Keep the newest 3 local dumps.
ls -1t backups/olympus-*.dump | tail -n +4 | xargs -r rm --
