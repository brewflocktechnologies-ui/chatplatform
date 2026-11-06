# Centrifugo (chat widget <-> dashboard)

Dev config, no auth (`client.insecure`). Clients connect to
`ws://localhost:8000/connection/websocket` and share the channel
`chat:<tenantId>`. Health: `http://localhost:8000/health`.

Two ways to run it, same `config.json` either way:

## Docker (also what production uses)

Defined as the `centrifugo` service in `infrastructure/docker-compose.yml`
(pinned image `centrifugo/centrifugo:v6.10.2`, config mounted read-only), so
`bash localrun/start.sh` brings it up with the rest of the platform. Alone:

```bash
docker compose -f infrastructure/docker-compose.yml up -d centrifugo
```

Per-environment overrides are environment variables, no config edit needed:

| Variable | Default | Production |
| --- | --- | --- |
| `CENTRIFUGO_ALLOWED_ORIGINS` | `*` | space-separated widget + dashboard origins |
| `CENTRIFUGO_INSECURE` | `true` | `false` (then clients need JWTs signed with `CENTRIFUGO_CLIENT_TOKEN_HMAC_SECRET_KEY`) |

The checked-in config and defaults are dev-only: `insecure` lets any client
connect, subscribe and publish. The widget and dashboard do not send tokens
yet, so turning it off requires adding token issuance first.

## Standalone binary, no Docker

```bash
centrifugo --config=localrun/centrifugo/config.json
```

## E2E tests

Playwright starts the binary itself (`CENTRIFUGO_BIN` if it is not on PATH)
unless something already answers on `:8000/health`, so a running container
is reused. Stop one before the other: both bind port 8000.
