# Centrifugo (chat widget <-> dashboard)

Dev-only config, no auth (`client.insecure`). Run the standalone binary, no Docker:

```bash
centrifugo --config=localrun/centrifugo/config.json
```

Clients connect to `ws://localhost:8000/connection/websocket` and share the
channel `chat:<tenantId>`.
