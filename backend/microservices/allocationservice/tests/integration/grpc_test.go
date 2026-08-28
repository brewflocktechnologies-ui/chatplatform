package integration

import (
	"context"
	"sync"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	allocationv1 "github.com/chatplatform/allocationservice/gen/proto/allocation/v1"
)

func createOne(t *testing.T, client allocationv1.AllocationServiceClient, tenant, reqID string) *allocationv1.Allocation {
	t.Helper()
	resp, err := client.CreateAllocation(tenantCtx(tenant), &allocationv1.CreateAllocationRequest{
		RequestId:  reqID,
		ResourceId: "res-1",
		Priority:   10,
	})
	if err != nil {
		t.Fatal(err)
	}
	return resp.GetAllocation()
}

func TestGRPCCreateGetLifecycle(t *testing.T) {
	requireDB(t)
	client := newGRPCClient(t)

	created := createOne(t, client, "t1", "req-1")
	if created.GetStatus() != allocationv1.AllocationStatus_ALLOCATION_STATUS_PENDING || created.GetVersion() != 1 {
		t.Fatalf("created: %+v", created)
	}

	got, err := client.GetAllocation(tenantCtx("t1"), &allocationv1.GetAllocationRequest{AllocationId: created.GetId()})
	if err != nil {
		t.Fatal(err)
	}
	if got.GetAllocation().GetRequestId() != "req-1" {
		t.Fatalf("get: %+v", got.GetAllocation())
	}

	allocated, err := client.Allocate(tenantCtx("t1"), &allocationv1.AllocateRequest{AllocationId: created.GetId(), Version: 1})
	if err != nil {
		t.Fatal(err)
	}
	if allocated.GetAllocation().GetStatus() != allocationv1.AllocationStatus_ALLOCATION_STATUS_ALLOCATED {
		t.Fatalf("allocate: %+v", allocated.GetAllocation())
	}

	completed, err := client.CompleteAllocation(tenantCtx("t1"), &allocationv1.CompleteAllocationRequest{AllocationId: created.GetId(), Version: 2})
	if err != nil {
		t.Fatal(err)
	}
	if completed.GetAllocation().GetStatus() != allocationv1.AllocationStatus_ALLOCATION_STATUS_COMPLETED ||
		completed.GetAllocation().GetVersion() != 3 {
		t.Fatalf("complete: %+v", completed.GetAllocation())
	}
}

func TestGRPCIdempotentCreateReplay(t *testing.T) {
	requireDB(t)
	client := newGRPCClient(t)

	first := createOne(t, client, "t1", "same-req")
	resp, err := client.CreateAllocation(tenantCtx("t1"), &allocationv1.CreateAllocationRequest{
		RequestId: "same-req", ResourceId: "res-1", Priority: 10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !resp.GetReplayed() || resp.GetAllocation().GetId() != first.GetId() {
		t.Fatalf("replay: replayed=%v id=%s want id=%s", resp.GetReplayed(), resp.GetAllocation().GetId(), first.GetId())
	}
}

func TestGRPCErrorMapping(t *testing.T) {
	requireDB(t)
	client := newGRPCClient(t)
	existing := createOne(t, client, "t1", "req-err")

	tests := []struct {
		name string
		call func() error
		want codes.Code
	}{
		{"validation: empty request_id", func() error {
			_, err := client.CreateAllocation(tenantCtx("t1"), &allocationv1.CreateAllocationRequest{ResourceId: "r"})
			return err
		}, codes.InvalidArgument},
		{"validation: malformed uuid", func() error {
			_, err := client.GetAllocation(tenantCtx("t1"), &allocationv1.GetAllocationRequest{AllocationId: "not-a-uuid"})
			return err
		}, codes.InvalidArgument},
		{"validation: page size above max", func() error {
			_, err := client.ListAllocations(tenantCtx("t1"), &allocationv1.ListAllocationsRequest{PageSize: 999})
			return err
		}, codes.InvalidArgument},
		{"bad page token", func() error {
			_, err := client.ListAllocations(tenantCtx("t1"), &allocationv1.ListAllocationsRequest{PageToken: "garbage!!"})
			return err
		}, codes.InvalidArgument},
		{"not found", func() error {
			_, err := client.GetAllocation(tenantCtx("t1"), &allocationv1.GetAllocationRequest{AllocationId: "00000000-0000-0000-0000-000000000000"})
			return err
		}, codes.NotFound},
		{"cross-tenant is not found, never leaked", func() error {
			_, err := client.GetAllocation(tenantCtx("t2"), &allocationv1.GetAllocationRequest{AllocationId: existing.GetId()})
			return err
		}, codes.NotFound},
		{"missing tenant metadata", func() error {
			_, err := client.GetAllocation(context.Background(), &allocationv1.GetAllocationRequest{AllocationId: existing.GetId()})
			return err
		}, codes.Unauthenticated},
		{"stale version is aborted", func() error {
			_, err := client.Allocate(tenantCtx("t1"), &allocationv1.AllocateRequest{AllocationId: existing.GetId(), Version: 99})
			return err
		}, codes.Aborted},
		{"invalid transition is failed precondition", func() error {
			// Complete straight from PENDING.
			_, err := client.CompleteAllocation(tenantCtx("t1"), &allocationv1.CompleteAllocationRequest{AllocationId: existing.GetId(), Version: 1})
			return err
		}, codes.FailedPrecondition},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.call()
			if status.Code(err) != tt.want {
				t.Fatalf("code = %s (%v), want %s", status.Code(err), err, tt.want)
			}
		})
	}
}

func TestGRPCDeadlineAndCancellation(t *testing.T) {
	requireDB(t)
	client := newGRPCClient(t)

	expired, cancel := context.WithDeadline(tenantCtx("t1"), time.Now().Add(-time.Second))
	defer cancel()
	_, err := client.ListAllocations(expired, &allocationv1.ListAllocationsRequest{})
	if status.Code(err) != codes.DeadlineExceeded {
		t.Fatalf("deadline: code = %s", status.Code(err))
	}

	canceled, cancelNow := context.WithCancel(tenantCtx("t1"))
	cancelNow()
	_, err = client.ListAllocations(canceled, &allocationv1.ListAllocationsRequest{})
	if status.Code(err) != codes.Canceled {
		t.Fatalf("cancellation: code = %s", status.Code(err))
	}
}

func TestGRPCPagination(t *testing.T) {
	requireDB(t)
	client := newGRPCClient(t)
	for i := 0; i < 5; i++ {
		createOne(t, client, "t1", "req-page-"+string(rune('a'+i)))
	}

	var token string
	total := 0
	pages := 0
	for {
		resp, err := client.ListAllocations(tenantCtx("t1"), &allocationv1.ListAllocationsRequest{PageSize: 2, PageToken: token})
		if err != nil {
			t.Fatal(err)
		}
		total += len(resp.GetAllocations())
		pages++
		if resp.GetNextPageToken() == "" {
			break
		}
		token = resp.GetNextPageToken()
	}
	if total != 5 || pages != 3 {
		t.Fatalf("total=%d pages=%d, want 5 over 3", total, pages)
	}
}

func TestGRPCConcurrentAllocateExactlyOneWins(t *testing.T) {
	requireDB(t)
	client := newGRPCClient(t)
	created := createOne(t, client, "t1", "req-race")

	const workers = 10
	var wg sync.WaitGroup
	results := make(chan codes.Code, workers)
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := client.Allocate(tenantCtx("t1"), &allocationv1.AllocateRequest{AllocationId: created.GetId(), Version: 1})
			results <- status.Code(err)
		}()
	}
	wg.Wait()
	close(results)
	ok, aborted, other := 0, 0, 0
	for code := range results {
		switch code {
		case codes.OK:
			ok++
		case codes.Aborted:
			aborted++
		default:
			other++
		}
	}
	if ok != 1 || other != 0 {
		t.Fatalf("ok=%d aborted=%d other=%d, want exactly 1 OK and rest Aborted", ok, aborted, other)
	}
}

func TestGRPCConcurrentCreatesSameRequestID(t *testing.T) {
	requireDB(t)
	client := newGRPCClient(t)

	const workers = 10
	var wg sync.WaitGroup
	ids := make(chan string, workers)
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp, err := client.CreateAllocation(tenantCtx("t1"), &allocationv1.CreateAllocationRequest{
				RequestId: "same-race", ResourceId: "res-1",
			})
			if err != nil {
				t.Error(err)
				return
			}
			ids <- resp.GetAllocation().GetId()
		}()
	}
	wg.Wait()
	close(ids)
	distinct := map[string]bool{}
	for id := range ids {
		distinct[id] = true
	}
	if len(distinct) != 1 {
		t.Fatalf("concurrent creates yielded %d distinct allocations, want 1", len(distinct))
	}
}
