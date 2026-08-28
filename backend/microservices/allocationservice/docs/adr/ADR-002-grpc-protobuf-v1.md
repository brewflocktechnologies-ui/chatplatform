# ADR-002: gRPC + Protobuf with a v1 package

**Status**: accepted

The platform's inter-service protocol is gRPC (accountservice set the
precedent). The API lives in `allocation.v1` so breaking changes become a
`v2` package instead of silent mutations; field numbers are append-only and
never reused. APIs are domain commands (Allocate/Release/Complete) rather
than generic CRUD - an UpdateAllocation would force every caller to know the
lifecycle rules the domain owns. Buf manages deps/lint/generation.
