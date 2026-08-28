# accountservice API contract

The real, canonical contract is
[`../src/main/proto/tenant.proto`](../src/main/proto/tenant.proto) — **not**
a copy in this folder. That's a deliberate deviation from chatservice's
`contract/openapi.yaml` convention (see `AGENTS.md`'s "Contracts
(per-service)" section): protoc requires `.proto` sources to live under
`src/main/proto/` (wired by `io.github.ascopes:protobuf-maven-plugin`,
`pom.xml`) — unlike an OpenAPI YAML snapshot, which can be freely copied
anywhere after being generated, a `.proto` file *is* the build input, so
moving or duplicating it would either break the build or create two
sources of truth that can silently drift.

This `contract/` folder exists anyway, empty but for this file, so every
service has one at the same predictable path — a future tool or human
scanning `<service>/contract/` for "what's the contract here" finds a
pointer instead of nothing.

## Regenerating stubs / inspecting the contract

Stubs regenerate automatically on every build — no manual step, unlike
chatservice's `curl .../v3/api-docs.yaml`:

```bash
cd backend/microservices/accountservice
./mvnw.cmd compile
# generated Java under target/generated-sources/protobuf/
```

To inspect the service live instead of reading the `.proto` file, use
`grpcurl` against the reflection service (enabled by default,
`spring.grpc.server.reflection.enabled: true`) — no local `.proto` needed:

```bash
docker run --rm fullstorydev/grpcurl -plaintext host.docker.internal:9095 list
docker run --rm fullstorydev/grpcurl -plaintext host.docker.internal:9095 describe chatplatform.accountservice.v1.TenantService
```

The [BootUI](https://www.julien-dubois.com/boot-ui/) dev console at
`http://localhost:8090/bootui` is also available while the app is running,
same as chatservice.
