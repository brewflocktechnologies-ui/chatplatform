# ADR-006: Cursor (keyset) pagination

**Status**: accepted

`ListAllocations` pages by `(created_at, id) < (cursor)` ordered
`created_at DESC, id DESC` - O(page) regardless of depth, stable under
concurrent inserts (no row skipping/duplication as offsets shift), backed
exactly by the `(tenant_id, created_at DESC, id DESC)` index. Tokens are
opaque versioned base64 (`v1:<nanos>:<uuid>`), validated on decode.
Defaults: page size 50, hard max 200. UUIDv7 ids make the tie-breaker
time-consistent.
