// Package migrations embeds the goose SQL migrations so the binary can
// migrate itself (compose/local via DB_MIGRATE_ON_START, CI/CD via the
// `migrate` subcommand) without shipping migration files separately.
package migrations

import "embed"

// FS holds the versioned goose migrations.
//
//go:embed *.sql
var FS embed.FS
