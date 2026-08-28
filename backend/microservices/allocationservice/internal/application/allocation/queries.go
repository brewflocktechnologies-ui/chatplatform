package allocation

// GetQuery fetches one allocation within a tenant.
type GetQuery struct {
	TenantID     string
	AllocationID string
}

// ListQuery is the cursor-paginated listing request. PageToken is the opaque
// cursor from a previous page ("" = first page); Status filters when set.
type ListQuery struct {
	TenantID  string
	PageSize  int32
	PageToken string
	Status    string
}

const (
	// DefaultPageSize applies when the request leaves page_size at 0.
	DefaultPageSize int32 = 50
	// MaxPageSize is the hard cap; larger requests are clamped.
	MaxPageSize int32 = 200
)
