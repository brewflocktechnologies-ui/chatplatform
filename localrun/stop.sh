#!/usr/bin/env bash
# Shuts down everything start.sh brought up: docker compose stop (not
# down/rm - containers, volumes and images survive, so the next start.sh is a
# fast restart, not a rebuild). Also kills any host-JVM service instances
# left over from running services the pre-container way. Run from anywhere.
set -uo pipefail
cd "$(dirname "$0")/.."

echo "== host-run service leftovers =="
stopped_any=""
for port in 8080 8090 8100; do
  pid="$(netstat -ano 2>/dev/null | grep ":$port " | grep LISTENING | awk '{print $NF}' | sort -u | head -1)"
  if [ -n "${pid:-}" ] && ! docker ps --format '{{.Ports}}' | grep -q ":$port->"; then
    taskkill //PID "$pid" //F //T >/dev/null 2>&1 && echo "  killed host JVM on :$port (pid $pid)"
    stopped_any=1
  fi
done
[ -z "$stopped_any" ] && echo "  none"
rm -f localrun/.chatservice.pid localrun/.accountservice.pid localrun/.chatdashboardbff.pid

echo "== platform =="
docker compose -f localrun/docker-compose.yml stop

echo
echo "Platform stopped. Data preserved. Run localrun/start.sh to bring it back up."
