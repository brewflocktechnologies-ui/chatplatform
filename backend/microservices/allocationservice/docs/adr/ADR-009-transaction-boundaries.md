# ADR-009: Transaction boundaries in the application layer

**Status**: accepted

The application service marks the unit of work (`TxManager.WithinTx`);
repositories join the transaction transparently via context. The domain
never sees transactions; handlers never open them. Transactions wrap only
DB work - never network calls - and carry a configurable timeout
(DB_TX_TIMEOUT) plus per-query timeouts (DB_QUERY_TIMEOUT) under the RPC
context deadline. Create is deliberately non-transactional: single INSERT,
constraint-resolved.
