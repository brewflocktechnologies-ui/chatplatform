-- sqlc schema input. Mirrors migrations/00001_create_allocations.sql
-- (sqlc cannot parse goose annotations; keep the two in sync when the
-- schema evolves - the integration tests run the real migrations, so drift
-- fails loudly there).
CREATE TABLE allocations (
    id          uuid PRIMARY KEY,
    tenant_id   text        NOT NULL,
    request_id  text        NOT NULL,
    resource_id text        NOT NULL,
    status      text        NOT NULL,
    priority    integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL,
    updated_at  timestamptz NOT NULL,
    expires_at  timestamptz,
    version     bigint      NOT NULL DEFAULT 1
);
