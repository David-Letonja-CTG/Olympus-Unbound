#!/usr/bin/env bash
# Checks a running game server from the outside (D21): the game, its API and its rooms at one address.
# Usage: deploy/smoke-test.sh http://localhost:8080
# Used by CI and by every deploy. It adds a world board entry named "Smoke Test" on the solo board; with ADMIN_TOKEN
# set (deploys), it hides that entry again at the end.
set -euo pipefail

base="${1:?usage: smoke-test.sh <base URL>}"
failures=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "ok   $name"
  else
    echo "FAIL $name"
    failures=$((failures + 1))
  fi
}

# Waits up to 3 minutes for the API (through Caddy) to report healthy.
for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null "$base/health"; then break; fi
  sleep 2
done

run_id="smoke-$(date -u +%Y%m%d%H%M%S)-$RANDOM"
score_body="{\"runId\":\"$run_id\",\"board\":\"solo\",\"names\":[\"Smoke Test\"],\"godId\":\"zeus\",\"realmId\":\"mount_olympus\",\"players\":1,\"bots\":0,\"realmsCleared\":0,\"timeSeconds\":120,\"kills\":50,\"level\":3,\"version\":\"smoke\"}"

check "/health answers 200" curl -fsS -o /dev/null "$base/health"
check "security headers are set" bash -c "curl -fsS -o /dev/null -D - '$base/health' | tr -d '\r' | grep -qi '^x-content-type-options: nosniff'"
check "POST /api/scores takes a run" bash -c "curl -fsS -H 'content-type: application/json' -d '$score_body' '$base/api/scores' | grep -q '\"added\"'"
check "the same run counts once" bash -c "curl -fsS -H 'content-type: application/json' -d '$score_body' '$base/api/scores' | grep -q '\"duplicate\"'"
check "the solo board lists it" bash -c "curl -fsS '$base/api/leaderboards/solo?limit=50' | grep -q 'Smoke Test'"
check "an impossible run is refused" bash -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' -H 'content-type: application/json' -d '{\"board\":\"solo\"}' '$base/api/scores')\" = 400 ]"
check "/api/rooms answers" bash -c "curl -fsS '$base/api/rooms?version=smoke' | grep -q '\"rooms\"'"
check "/api/difficulty hands out the dial" bash -c "curl -fsS '$base/api/difficulty' | grep -q '\"realmGrowth\"'"
check "/ serves the game" bash -c "curl -fsS '$base/' | grep -q '<app-root'"
check "/play (deep link) serves the game" bash -c "curl -fsS '$base/play' | grep -q '<app-root'"
check "a challenge link has its own page" bash -c "curl -fsS '$base/challenge?g=zeus' | grep -q '<app-root'"
check "hashed bundles are immutable" bash -c "js=\$(curl -fsS '$base/' | grep -o 'main-[A-Za-z0-9_-]\{8\}\.js' | head -n 1); [ -n \"\$js\" ] && curl -fsS -o /dev/null -D - '$base/'\"\$js\" | tr -d '\r' | grep -qi 'immutable'"
check "the installed app's file list is served" curl -fsS -o /dev/null "$base/ngsw.json"
check "unknown API paths are 404" bash -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' '$base/api/nope')\" = 404 ]"
check "missing files are 404" bash -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' '$base/main-MISSING0.js')\" = 404 ]"
# A host and a guest meet on the rooms WebSocket and pass a message (Node's own WebSocket).
check "a room pairs a host and a guest" node -e "
  const url = process.argv[1].replace(/^http/, 'ws') + '/rooms';
  const code = 'Z' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, 'Z').padEnd(4, 'Z');
  const fail = (why) => { console.error(why); process.exit(1); };
  setTimeout(() => fail('timed out'), 15000);
  const host = new WebSocket(url);
  host.binaryType = 'arraybuffer';
  host.onopen = () => host.send(JSON.stringify({ t: 'host', code, version: 'smoke' }));
  host.onmessage = (e) => {
    if (typeof e.data !== 'string') {
      const b = new Uint8Array(e.data);
      if (b[4] === 42) process.exit(0);
      return;
    }
    const m = JSON.parse(e.data);
    if (m.t === 'error') fail('host: ' + m.reason);
    if (m.t !== 'hosting') return;
    const guest = new WebSocket(url);
    guest.onopen = () => guest.send(JSON.stringify({ t: 'join', code }));
    guest.onmessage = (g) => { if (JSON.parse(g.data).t === 'joined') guest.send(new Uint8Array([42])); };
  };
" "$base"

# With ADMIN_TOKEN (deploys), the test's own entries are hidden again, so players never see them.
if [ -n "${ADMIN_TOKEN:-}" ]; then
  for id in $(curl -fsS "$base/api/leaderboards/solo?limit=50" | node -e "
    let s = ''; process.stdin.on('data', (d) => (s += d)).on('end', () => {
      for (const e of JSON.parse(s).entries) if (e.names.includes('Smoke Test')) console.log(e.id);
    });"); do
    check "the test's entry $id is hidden" curl -fsS -o /dev/null -X POST -H "Authorization: Bearer $ADMIN_TOKEN" "$base/api/admin/scores/$id/hide"
  done
fi

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "all checks passed"
