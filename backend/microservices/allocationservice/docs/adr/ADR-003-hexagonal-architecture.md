# ADR-003: Hexagonal architecture

**Status**: accepted

domain (pure Go, stdlib only) <- application (use-case orchestration) <-
transport/persistence adapters. Ports in `internal/ports` define what the
core needs; adapters implement them. Enforced consequences: the domain is
unit-testable with zero infrastructure, the fake repository in application
tests honors the same contract the Postgres adapter passes integration tests
against, and swapping transports or stores touches only adapters.
