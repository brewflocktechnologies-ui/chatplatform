package ports

import "context"

// TxManager runs fn inside one database transaction. The transactional
// handle travels in the returned context; repository implementations pick it
// up transparently, so the application layer marks boundaries without
// knowing pgx exists. fn returning an error rolls back; nil commits.
type TxManager interface {
	WithinTx(ctx context.Context, fn func(ctx context.Context) error) error
}
