#!/usr/bin/env bash
# One command to bring the whole platform up: Postgres, SonarQube, the
# observability stack, and the three microservices - all as containers in the
# single compose project defined by localrun/docker-compose.yml. Idempotent,
# safe to re-run. Run from anywhere.
set -uo pipefail
cd "$(dirname "$0")/.."

# The infra containers carry fixed container_names. If they were last created
# by their standalone compose projects (infrastructure/, code-quality/,
# observability/) instead of this aggregate one, compose can't adopt them -
# remove the container (data lives in named volumes, which both projects
# share) and let this project recreate it.
for c in chatplatform-postgres chatplatform-sonarqube chatplatform-sonar-db chatplatform-otel-lgtm; do
  proj="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$c" 2>/dev/null || true)"
  if [ -n "$proj" ] && [ "$proj" != "chatplatform" ]; then
    echo "== adopting $c (was compose project '$proj'; volumes are shared, no data loss) =="
    docker stop "$c" >/dev/null 2>&1  # graceful (SIGTERM) - matters for Postgres
    docker rm "$c" >/dev/null
  fi
done

# Host-JVM leftovers (the pre-container way of running the services) would
# clash on the published ports - warn instead of silently failing mid-up.
for port in 8080 8090 8100 8110 9095; do
  if netstat -ano 2>/dev/null | grep ":$port " | grep -q LISTENING; then
    if ! docker ps --format '{{.Ports}}' | grep -q ":$port->"; then
      echo "WARNING: something non-Docker is already listening on :$port (a host-run service?)." >&2
      echo "         Stop it first (bash localrun/stop.sh kills host-run services too)." >&2
      exit 1
    fi
  fi
done

echo "== platform up (build changed images if needed) =="
docker compose -f localrun/docker-compose.yml up -d --build

echo "== waiting for health (up to 5 min) =="
for name in chatplatform-postgres chatplatform-otel-lgtm chatplatform-sonarqube \
            chatplatform-authservice-1 chatplatform-chatservice-1 chatplatform-accountservice-1 chatplatform-chatdashboardbff-1; do
  status="starting"
  for i in $(seq 1 60); do
    status="$(docker inspect "$name" --format '{{.State.Health.Status}}' 2>/dev/null || echo missing)"
    [ "$status" = "healthy" ] && break
    sleep 5
  done
  echo "  $name: $status"
done

cat <<'EOF'

Platform is up:
  authservice OIDC         http://localhost:8110/.well-known/openid-configuration
  chatservice API          http://localhost:8080/api/v1/tenants (Bearer token required)
  chatservice Swagger      http://localhost:8080/swagger-ui.html
  accountservice gRPC      localhost:9095 (grpcurl -plaintext, see localrun/README.md)
  chatdashboardbff API     http://localhost:8100/api/v1/tenants
  chatdashboardbff Swagger http://localhost:8100/swagger-ui.html
  Grafana (observability)  http://localhost:3000
  SonarQube                http://localhost:9000

Actuators (loopback-only on the host): 8081 / 8091 / 8101.
See localrun/README.md to verify each piece. localrun/stop.sh shuts everything down.
EOF
