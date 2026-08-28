package allocation

import (
	"context"
	"errors"
	"sort"
	"sync"
	"testing"
	"time"

	domain "github.com/chatplatform/allocationservice/internal/domain/allocation"
	"github.com/chatplatform/allocationservice/internal/ports"
)

var testNow = time.Date(2026, 8, 29, 12, 0, 0, 0, time.UTC)

// fakeRepo is an in-memory, mutex-guarded AllocationRepository honoring the
// same contracts the Postgres adapter must honor (uniqueness, tenant
// scoping, version-guarded updates) so application logic is tested against
// the port's semantics, not an implementation detail.
type fakeRepo struct {
	mu    sync.Mutex
	rows  map[string]domain.Allocation // key: tenant|id
	byReq map[string]string            // key: tenant|request_id -> id
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{rows: map[string]domain.Allocation{}, byReq: map[string]string{}}
}

func rowKey(t domain.TenantID, id domain.ID) string        { return string(t) + "|" + string(id) }
func reqKey(t domain.TenantID, r domain.RequestID) string  { return string(t) + "|" + string(r) }

func (f *fakeRepo) Create(_ context.Context, a domain.Allocation) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, dup := f.byReq[reqKey(a.TenantID, a.RequestID)]; dup {
		return domain.ErrAlreadyExists
	}
	f.rows[rowKey(a.TenantID, a.ID)] = a
	f.byReq[reqKey(a.TenantID, a.RequestID)] = string(a.ID)
	return nil
}

func (f *fakeRepo) Get(_ context.Context, tenantID domain.TenantID, id domain.ID) (domain.Allocation, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.rows[rowKey(tenantID, id)]
	if !ok {
		return domain.Allocation{}, domain.ErrNotFound
	}
	return a, nil
}

func (f *fakeRepo) GetByRequestID(_ context.Context, tenantID domain.TenantID, requestID domain.RequestID) (domain.Allocation, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	id, ok := f.byReq[reqKey(tenantID, requestID)]
	if !ok {
		return domain.Allocation{}, domain.ErrNotFound
	}
	return f.rows[rowKey(tenantID, domain.ID(id))], nil
}

func (f *fakeRepo) List(_ context.Context, tenantID domain.TenantID, q ports.ListQuery) (ports.Page, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var all []domain.Allocation
	for _, a := range f.rows {
		if a.TenantID != tenantID {
			continue
		}
		if q.Status != "" && a.Status != q.Status {
			continue
		}
		all = append(all, a)
	}
	sort.Slice(all, func(i, j int) bool {
		if !all[i].CreatedAt.Equal(all[j].CreatedAt) {
			return all[i].CreatedAt.After(all[j].CreatedAt)
		}
		return all[i].ID > all[j].ID
	})
	if !q.After.IsZero() {
		start := 0
		for i, a := range all {
			if a.CreatedAt.Before(q.After.CreatedAt) ||
				(a.CreatedAt.Equal(q.After.CreatedAt) && a.ID < q.After.ID) {
				start = i
				break
			}
			start = len(all)
		}
		all = all[start:]
	}
	page := ports.Page{}
	limit := int(q.PageSize)
	if len(all) > limit {
		page.Items = all[:limit]
		page.HasMore = true
		last := page.Items[len(page.Items)-1]
		page.Next = ports.Cursor{CreatedAt: last.CreatedAt, ID: last.ID}
	} else {
		page.Items = all
	}
	return page, nil
}

func (f *fakeRepo) Update(_ context.Context, a domain.Allocation, expectedVersion int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	key := rowKey(a.TenantID, a.ID)
	current, ok := f.rows[key]
	if !ok {
		return domain.ErrNotFound
	}
	if current.Version != expectedVersion {
		return domain.ErrVersionConflict
	}
	f.rows[key] = a
	return nil
}

type nopTx struct{}

func (nopTx) WithinTx(ctx context.Context, fn func(context.Context) error) error { return fn(ctx) }

type countingMetrics struct {
	created, allocated, released, completed, conflicts, replays int
}

func (m *countingMetrics) IncCreated()           { m.created++ }
func (m *countingMetrics) IncAllocated()         { m.allocated++ }
func (m *countingMetrics) IncReleased()          { m.released++ }
func (m *countingMetrics) IncCompleted()         { m.completed++ }
func (m *countingMetrics) IncConflict()          { m.conflicts++ }
func (m *countingMetrics) IncIdempotencyReplay() { m.replays++ }

func newTestService() (*Service, *fakeRepo, *countingMetrics) {
	repo := newFakeRepo()
	metrics := &countingMetrics{}
	svc := NewService(repo, nopTx{}, ports.ClockFunc(func() time.Time { return testNow }), metrics)
	n := 0
	svc.newID = func() string { n++; return time.Now().Format("150405.000000000") + "-" + string(rune('a'+n)) }
	return svc, repo, metrics
}

func TestCreateIsIdempotentOnRequestID(t *testing.T) {
	svc, _, metrics := newTestService()
	ctx := context.Background()
	cmd := CreateCommand{TenantID: "t1", RequestID: "req-1", ResourceID: "res-1", Priority: 5}

	first, err := svc.Create(ctx, cmd)
	if err != nil {
		t.Fatal(err)
	}
	if first.Replayed {
		t.Error("first create must not be a replay")
	}

	second, err := svc.Create(ctx, cmd) // client retry
	if err != nil {
		t.Fatal(err)
	}
	if !second.Replayed {
		t.Error("retry must be a replay")
	}
	if second.Allocation.ID != first.Allocation.ID {
		t.Error("retry must return the SAME allocation, not a duplicate")
	}
	if metrics.created != 1 || metrics.replays != 1 {
		t.Errorf("metrics created=%d replays=%d, want 1/1", metrics.created, metrics.replays)
	}
}

func TestCreateRejectsInvalidDomainValues(t *testing.T) {
	svc, _, _ := newTestService()
	_, err := svc.Create(context.Background(), CreateCommand{TenantID: "t1", RequestID: "r", ResourceID: "res", Priority: -1})
	if !errors.Is(err, domain.ErrInvalidArgument) {
		t.Fatalf("err = %v, want ErrInvalidArgument", err)
	}
}

func TestSameRequestIDDifferentTenantsCreatesBoth(t *testing.T) {
	svc, _, _ := newTestService()
	ctx := context.Background()
	a, err := svc.Create(ctx, CreateCommand{TenantID: "t1", RequestID: "shared", ResourceID: "res"})
	if err != nil {
		t.Fatal(err)
	}
	b, err := svc.Create(ctx, CreateCommand{TenantID: "t2", RequestID: "shared", ResourceID: "res"})
	if err != nil {
		t.Fatal(err)
	}
	if a.Replayed || b.Replayed || a.Allocation.ID == b.Allocation.ID {
		t.Error("request_id is tenant-scoped; both tenants must get their own allocation")
	}
}

func TestFullLifecycleAllocateComplete(t *testing.T) {
	svc, _, metrics := newTestService()
	ctx := context.Background()
	created, _ := svc.Create(ctx, CreateCommand{TenantID: "t1", RequestID: "r", ResourceID: "res"})

	allocated, err := svc.Allocate(ctx, TransitionCommand{TenantID: "t1", AllocationID: created.Allocation.ID, Version: 1})
	if err != nil {
		t.Fatal(err)
	}
	if allocated.Status != "ALLOCATED" || allocated.Version != 2 {
		t.Fatalf("after allocate: status=%s version=%d", allocated.Status, allocated.Version)
	}

	completed, err := svc.Complete(ctx, TransitionCommand{TenantID: "t1", AllocationID: created.Allocation.ID, Version: 2})
	if err != nil {
		t.Fatal(err)
	}
	if completed.Status != "COMPLETED" || completed.Version != 3 {
		t.Fatalf("after complete: status=%s version=%d", completed.Status, completed.Version)
	}
	if metrics.allocated != 1 || metrics.completed != 1 {
		t.Error("business metrics not incremented")
	}
}

func TestStaleVersionIsConflict(t *testing.T) {
	svc, _, metrics := newTestService()
	ctx := context.Background()
	created, _ := svc.Create(ctx, CreateCommand{TenantID: "t1", RequestID: "r", ResourceID: "res"})

	if _, err := svc.Allocate(ctx, TransitionCommand{TenantID: "t1", AllocationID: created.Allocation.ID, Version: 1}); err != nil {
		t.Fatal(err)
	}
	// Second caller still holds version 1.
	_, err := svc.Release(ctx, TransitionCommand{TenantID: "t1", AllocationID: created.Allocation.ID, Version: 1})
	if !errors.Is(err, domain.ErrVersionConflict) {
		t.Fatalf("err = %v, want ErrVersionConflict", err)
	}
	if metrics.conflicts != 1 {
		t.Error("conflict metric not incremented")
	}
}

func TestInvalidTransitionSurfacesDomainError(t *testing.T) {
	svc, _, _ := newTestService()
	ctx := context.Background()
	created, _ := svc.Create(ctx, CreateCommand{TenantID: "t1", RequestID: "r", ResourceID: "res"})
	// Complete straight from PENDING - domain forbids it.
	_, err := svc.Complete(ctx, TransitionCommand{TenantID: "t1", AllocationID: created.Allocation.ID, Version: 1})
	if !errors.Is(err, domain.ErrInvalidTransition) {
		t.Fatalf("err = %v, want ErrInvalidTransition", err)
	}
}

func TestTenantIsolationOnGetAndTransition(t *testing.T) {
	svc, _, _ := newTestService()
	ctx := context.Background()
	created, _ := svc.Create(ctx, CreateCommand{TenantID: "t1", RequestID: "r", ResourceID: "res"})

	if _, err := svc.Get(ctx, GetQuery{TenantID: "t2", AllocationID: created.Allocation.ID}); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("cross-tenant get: err = %v, want ErrNotFound", err)
	}
	_, err := svc.Allocate(ctx, TransitionCommand{TenantID: "t2", AllocationID: created.Allocation.ID, Version: 1})
	if !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("cross-tenant allocate: err = %v, want ErrNotFound", err)
	}
}

func TestListPaginatesWithStableCursor(t *testing.T) {
	svc, repo, _ := newTestService()
	ctx := context.Background()
	// Distinct created_at per row so ordering is meaningful.
	for i := 0; i < 5; i++ {
		a, err := domain.New(domain.ID(string(rune('a'+i))), "t1", domain.RequestID(string(rune('a'+i))), "res", 0, time.Time{}, testNow.Add(time.Duration(i)*time.Second))
		if err != nil {
			t.Fatal(err)
		}
		if err := repo.Create(ctx, a); err != nil {
			t.Fatal(err)
		}
	}

	page1, err := svc.List(ctx, ListQuery{TenantID: "t1", PageSize: 2})
	if err != nil {
		t.Fatal(err)
	}
	if len(page1.Items) != 2 || page1.NextPageToken == "" {
		t.Fatalf("page1: %d items, token=%q", len(page1.Items), page1.NextPageToken)
	}
	// Newest first.
	if !page1.Items[0].CreatedAt.After(page1.Items[1].CreatedAt) {
		t.Error("expected created_at DESC ordering")
	}

	page2, err := svc.List(ctx, ListQuery{TenantID: "t1", PageSize: 2, PageToken: page1.NextPageToken})
	if err != nil {
		t.Fatal(err)
	}
	page3, err := svc.List(ctx, ListQuery{TenantID: "t1", PageSize: 2, PageToken: page2.NextPageToken})
	if err != nil {
		t.Fatal(err)
	}
	if len(page3.Items) != 1 || page3.NextPageToken != "" {
		t.Fatalf("page3: %d items, token=%q - want final page of 1", len(page3.Items), page3.NextPageToken)
	}

	seen := map[string]bool{}
	for _, p := range [][]DTO{page1.Items, page2.Items, page3.Items} {
		for _, item := range p {
			if seen[item.ID] {
				t.Fatalf("item %s appeared on two pages", item.ID)
			}
			seen[item.ID] = true
		}
	}
	if len(seen) != 5 {
		t.Fatalf("saw %d distinct items across pages, want 5", len(seen))
	}
}

func TestListValidation(t *testing.T) {
	svc, _, _ := newTestService()
	ctx := context.Background()
	if _, err := svc.List(ctx, ListQuery{TenantID: "t1", PageToken: "not-base64!!"}); !errors.Is(err, domain.ErrInvalidArgument) {
		t.Errorf("bad token: err = %v, want ErrInvalidArgument", err)
	}
	if _, err := svc.List(ctx, ListQuery{TenantID: "t1", Status: "NONSENSE"}); !errors.Is(err, domain.ErrInvalidArgument) {
		t.Errorf("bad status: err = %v, want ErrInvalidArgument", err)
	}
}

func TestConcurrentTransitionsExactlyOneWins(t *testing.T) {
	svc, _, metrics := newTestService()
	ctx := context.Background()
	created, _ := svc.Create(ctx, CreateCommand{TenantID: "t1", RequestID: "r", ResourceID: "res"})

	const workers = 16
	var wg sync.WaitGroup
	var successes int32
	var mu sync.Mutex
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := svc.Allocate(ctx, TransitionCommand{TenantID: "t1", AllocationID: created.Allocation.ID, Version: 1})
			if err == nil {
				mu.Lock()
				successes++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if successes != 1 {
		t.Fatalf("%d concurrent allocates succeeded, want exactly 1", successes)
	}
	if metrics.allocated != 1 {
		t.Fatalf("allocated metric = %d, want 1", metrics.allocated)
	}
}

func TestConcurrentCreatesSameRequestIDNoDuplicates(t *testing.T) {
	svc, repo, _ := newTestService()
	ctx := context.Background()
	const workers = 16
	var wg sync.WaitGroup
	ids := make(chan string, workers)
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			res, err := svc.Create(ctx, CreateCommand{TenantID: "t1", RequestID: "same", ResourceID: "res"})
			if err != nil {
				t.Error(err)
				return
			}
			ids <- res.Allocation.ID
		}()
	}
	wg.Wait()
	close(ids)
	distinct := map[string]bool{}
	for id := range ids {
		distinct[id] = true
	}
	if len(distinct) != 1 {
		t.Fatalf("concurrent creates produced %d distinct allocations, want 1", len(distinct))
	}
	if len(repo.rows) != 1 {
		t.Fatalf("repo holds %d rows, want 1", len(repo.rows))
	}
}
