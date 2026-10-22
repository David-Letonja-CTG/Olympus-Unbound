#!/usr/bin/env bash
# Installs or updates the game server on a shared VM (D21, docs/hosting.md#the-game-server). Run in the directory
# holding compose.yml, olympus.caddy and .env; the deploy workflow runs it over SSH, and CI runs it against a stand-in
# host stack (deploy/test/). Running it again is safe.
#
# .env (compose format) holds IMAGE_PREFIX, TAG, POSTGRES_PASSWORD, ALLOWED_ORIGINS, ADMIN_TOKEN and:
#   OLYMPUS_ADDRESS   the site's name in Caddy (e.g. olympus.<ip>.sslip.io; ":80" in tests)
#   HOST_DIR          the host stack's directory, whose sites/ its Caddy imports
#   HOST_PROJECT      the host stack's compose project: its containers are <project>-db-1 and <project>-web-1
#   HOST_DB_USER      the host PostgreSQL's superuser
#   HOST_NETWORK      the host stack's network (<project>_default)
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

setting() { grep -E "^$1=" .env | head -n 1 | cut -d= -f2- || true; }
address="$(setting OLYMPUS_ADDRESS)"
password="$(setting POSTGRES_PASSWORD)"
host_dir="$(setting HOST_DIR)"
project="$(setting HOST_PROJECT)"
db_user="$(setting HOST_DB_USER)"
db="$project-db-1"
web="$project-web-1"

for name in OLYMPUS_ADDRESS HOST_DIR HOST_PROJECT HOST_DB_USER HOST_NETWORK; do
  [ -n "$(setting "$name")" ] || { echo "$name is not set in .env"; exit 1; }
done
# Letters and digits only: the password goes into SQL and a connection URL as it is.
[[ "$password" =~ ^[A-Za-z0-9]{12,}$ ]] || { echo "POSTGRES_PASSWORD must be 12+ letters and digits"; exit 1; }

echo "== database: the olympus role and database on the host's PostgreSQL"
docker exec -i "$db" psql -q -v ON_ERROR_STOP=1 -U "$db_user" -d postgres <<SQL
do \$\$
begin
  if exists (select from pg_roles where rolname = 'olympus') then
    alter role olympus login password '$password';
  else
    create role olympus login password '$password';
  end if;
end
\$\$;
SQL
if ! docker exec "$db" psql -U "$db_user" -d postgres -Atc "select 1 from pg_database where datname = 'olympus'" | grep -q 1; then
  docker exec "$db" psql -q -U "$db_user" -d postgres -c "create database olympus owner olympus"
fi

echo "== the server"
docker compose pull --quiet 2>/dev/null || true
docker compose up -d --remove-orphans --wait

echo "== Caddy: the site at $address"
mkdir -p "$host_dir/sites"
site="$(sed "s/^OLYMPUS_ADDRESS {/$address {/" olympus.caddy)"
if [ "$(cat "$host_dir/sites/olympus.caddy" 2>/dev/null || true)" != "$site" ]; then
  printf '%s\n' "$site" > "$host_dir/sites/olympus.caddy.next"
  mv "$host_dir/sites/olympus.caddy.next" "$host_dir/sites/olympus.caddy"
  # Through Caddy's admin endpoint inside its container: the host's own site keeps serving while it reloads.
  docker exec "$web" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
  echo "reloaded Caddy"
else
  echo "unchanged"
fi
