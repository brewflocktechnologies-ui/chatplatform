-- name: CreateAllocation :exec
INSERT INTO allocations (
    id, tenant_id, request_id, resource_id, status, priority,
    created_at, updated_at, expires_at, version
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
);

-- name: GetAllocation :one
SELECT * FROM allocations
WHERE tenant_id = $1 AND id = $2;

-- name: GetAllocationByRequestID :one
SELECT * FROM allocations
WHERE tenant_id = $1 AND request_id = $2;

-- name: ListAllocationsFirstPage :many
SELECT * FROM allocations
WHERE tenant_id = $1
ORDER BY created_at DESC, id DESC
LIMIT $2;

-- name: ListAllocationsAfter :many
SELECT * FROM allocations
WHERE tenant_id = sqlc.arg(tenant_id)
  AND (created_at, id) < (sqlc.arg(after_created_at)::timestamptz, sqlc.arg(after_id)::uuid)
ORDER BY created_at DESC, id DESC
LIMIT sqlc.arg(page_limit);

-- name: ListAllocationsByStatusFirstPage :many
SELECT * FROM allocations
WHERE tenant_id = $1 AND status = $2
ORDER BY created_at DESC, id DESC
LIMIT $3;

-- name: ListAllocationsByStatusAfter :many
SELECT * FROM allocations
WHERE tenant_id = sqlc.arg(tenant_id) AND status = sqlc.arg(status)
  AND (created_at, id) < (sqlc.arg(after_created_at)::timestamptz, sqlc.arg(after_id)::uuid)
ORDER BY created_at DESC, id DESC
LIMIT sqlc.arg(page_limit);

-- name: UpdateAllocationGuarded :execrows
-- Optimistic concurrency: writes only where version matches. Zero rows
-- means stale version (or not visible to this tenant); the adapter
-- distinguishes the two.
UPDATE allocations
SET status = $1, updated_at = $2, version = $3
WHERE tenant_id = $4 AND id = $5 AND version = $6;
