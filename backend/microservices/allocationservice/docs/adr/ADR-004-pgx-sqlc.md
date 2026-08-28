# ADR-004: pgx + sqlc, no ORM

**Status**: accepted

Explicit SQL keeps query plans predictable (keyset pagination, guarded
updates); sqlc compiles the checked-in SQL to typed Go at build time - typos
and type mismatches fail generation, not production. pgxpool provides
configurable pooling with exposed stats. An ORM would obscure the exact
queries the indexes were designed for. Generated code stays in
internal/adapters/postgres/generated and never crosses the port boundary.
