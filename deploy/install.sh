#!/usr/bin/env bash
# Installs or updates the game server on Slovion's VM (D21, docs/hosting.md#the-game-server). Run in the directory
# holding compose.yml, olympus.caddy and .env; the deploy workflow runs it as Slovion's deploy user, and CI runs it
# against a stand-in Slovion stack. Running it again is safe.
#
# .env (compose format) holds IMAGE_PREFIX, TAG, POSTGRES_PASSWORD, ALLOWED_ORIGINS, ADMIN_TOKEN and also:
#   OLYMPUS_ADDRESS   the site's name in Caddy (olympus.<ip>.sslip.io; ":80" in tests)
#   SLOVION_DIR       Slovion's stack directory (/opt/slovion), whose sites/ Caddy imports
#   SLOVION_PROJECT   Slovion's compose project (slovion): its containers are <project>-db-1 and <project>-web-1
#   SLOVION_DB_USER   Slovion's PostgreSQL superuser (slovion)
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

setting() { grep -E "^$1=" .env | head -n 1 | cut -d= -f2- || true; }
address="$(setting OLYMPUS_ADDRESS)"
password="$(setting POSTGRES_PASSWORD)"
slovion_dir="$(setting SLOVION_DIR)"; slovion_dir="${slovion_dir:-/opt/slovion}"
project="$(setting SLOVION_PROJECT)"; project="${project:-slovion}"
db_user="$(setting SLOVION_DB_USER)"; db_user="${db_user:-slovion}"
db="$project-db-1"
web="$project-web-1"

[ -n "$address" ] || { echo "OLYMPUS_ADDRESS is not set"; exit 1; }
# Letters and digits only: the password goes into SQL and a connection URL as it is.
[[ "$password" =~ ^[A-Za-z0-9]{12,}$ ]] || { echo "POSTGRES_PASSWORD must be 12+ letters and digits"; exit 1; }

echo "== database: the olympus role and database on Slovion's PostgreSQL"
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
mkdir -p "$slovion_dir/sites"
site="$(sed "s/^OLYMPUS_ADDRESS {/$address {/" olympus.caddy)"
if [ "$(cat "$slovion_dir/sites/olympus.caddy" 2>/dev/null || true)" != "$site" ]; then
  printf '%s\n' "$site" > "$slovion_dir/sites/olympus.caddy.next"
  mv "$slovion_dir/sites/olympus.caddy.next" "$slovion_dir/sites/olympus.caddy"
  # Through Caddy's admin endpoint inside its container: Slovion keeps serving while it reloads.
  docker exec "$web" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
  echo "reloaded Caddy"
else
  echo "unchanged"
fi
