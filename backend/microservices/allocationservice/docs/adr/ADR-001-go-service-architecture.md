# ADR-001: Go service for the Allocation domain

**Status**: accepted

Allocation is a high-throughput, concurrency-sensitive domain (optimistic
locking, races on shared resources). Go 1.27 + the standard library gives
small static binaries (43MB distroless image), first-class concurrency
primitives for the guarantees we test (exactly-one-winner transitions), and
no framework runtime. Dependencies are limited to what has a concrete job:
grpc/protobuf (API), pgx/sqlc (DB), goose (migrations), protovalidate
(boundary validation), OTel+prometheus (observability), google/uuid (v7 ids).
