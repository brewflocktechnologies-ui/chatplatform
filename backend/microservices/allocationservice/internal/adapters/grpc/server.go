package grpc

import (
	"log/slog"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	allocationv1 "github.com/chatplatform/allocationservice/gen/proto/allocation/v1"
	"github.com/chatplatform/allocationservice/internal/adapters/grpc/interceptors"
	"github.com/chatplatform/allocationservice/internal/observability"
)

// NewServer assembles the gRPC server: OTel tracing stats handler, then the
// interceptor chain outermost-first (recovery guards everything, auth
// context before logging so logs carry identity), the allocation service,
// standard health service and reflection.
//
// Returned health server: main flips it SERVING/NOT_SERVING as readiness
// changes (dependencies checked there, not here).
// authInterceptor is either interceptors.AuthContext() (trusted-header mode)
// or interceptors.JWTAuth(...) (verified platform JWTs) - main picks by
// AUTH_MODE. Its position in the chain is unchanged and load-bearing.
func NewServer(handler *AllocationHandler, metrics *observability.Metrics, logger *slog.Logger, authInterceptor grpc.UnaryServerInterceptor) (*grpc.Server, *health.Server) {
	server := grpc.NewServer(
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
		grpc.ChainUnaryInterceptor(
			interceptors.Recovery(logger),
			authInterceptor,
			interceptors.Logging(logger),
			interceptors.Metrics(metrics),
		),
	)
	allocationv1.RegisterAllocationServiceServer(server, handler)

	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(server, healthServer)

	// Reflection makes grpcurl/grpcui work without local proto files.
	reflection.Register(server)
	return server, healthServer
}
