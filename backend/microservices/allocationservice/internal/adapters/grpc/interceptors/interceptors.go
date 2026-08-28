// Package interceptors holds the cross-cutting gRPC server middleware:
// recovery, auth/tenant context, request/correlation ids, logging, metrics.
// Nothing here knows about the allocation domain.
package interceptors

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/chatplatform/allocationservice/internal/observability"
)

type ctxKey int

const (
	tenantKey ctxKey = iota
	requestIDKey
	correlationIDKey
)

const (
	// TenantMetadataKey is where the platform (gateway/BFF/service mesh)
	// places the AUTHENTICATED tenant identity. Phase 1 trusts this hop;
	// swapping in token verification replaces only this interceptor.
	TenantMetadataKey      = "x-tenant-id"
	requestIDMetadataKey   = "x-request-id"
	correlationMetadataKey = "x-correlation-id"
)

// TenantFromContext returns the authenticated tenant id ("" when absent).
func TenantFromContext(ctx context.Context) string {
	v, _ := ctx.Value(tenantKey).(string)
	return v
}

// RequestIDFromContext returns the per-request id (always set server-side).
func RequestIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(requestIDKey).(string)
	return v
}

// CorrelationIDFromContext returns the cross-service correlation id.
func CorrelationIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(correlationIDKey).(string)
	return v
}

// AuthContext extracts tenant identity plus request/correlation ids from
// incoming metadata. It does NOT enforce presence - handlers decide which
// RPCs require a tenant (all of them, today) so health/reflection stay open.
func AuthContext() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		md, _ := metadata.FromIncomingContext(ctx)
		if v := first(md, TenantMetadataKey); v != "" {
			ctx = context.WithValue(ctx, tenantKey, v)
		}
		reqID := first(md, requestIDMetadataKey)
		if reqID == "" {
			reqID = uuid.NewString()
		}
		ctx = context.WithValue(ctx, requestIDKey, reqID)
		if v := first(md, correlationMetadataKey); v != "" {
			ctx = context.WithValue(ctx, correlationIDKey, v)
		}
		return handler(ctx, req)
	}
}

// Recovery converts panics into codes.Internal instead of killing the
// process, logging the panic with stack context for the operator.
func Recovery(logger *slog.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp any, err error) {
		defer func() {
			if r := recover(); r != nil {
				logger.ErrorContext(ctx, "panic recovered",
					slog.String("method", info.FullMethod),
					slog.Any("panic", r),
				)
				err = status.Error(codes.Internal, "internal error")
			}
		}()
		return handler(ctx, req)
	}
}

// Logging emits one structured record per RPC with ids, duration and
// outcome. Payloads are deliberately not logged (they may carry sensitive
// data); identity comes from the context fields.
func Logging(logger *slog.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		start := time.Now()
		resp, err := handler(ctx, req)
		code := status.Code(err)
		attrs := []slog.Attr{
			slog.String("operation", info.FullMethod),
			slog.String("grpc_code", code.String()),
			slog.Duration("duration", time.Since(start)),
			slog.String("request_id", RequestIDFromContext(ctx)),
		}
		if t := TenantFromContext(ctx); t != "" {
			attrs = append(attrs, slog.String("tenant_id", t))
		}
		if c := CorrelationIDFromContext(ctx); c != "" {
			attrs = append(attrs, slog.String("correlation_id", c))
		}
		level := slog.LevelInfo
		if err != nil {
			attrs = append(attrs, slog.String("error", err.Error()))
			if code == codes.Internal || code == codes.Unknown {
				level = slog.LevelError
			} else {
				level = slog.LevelWarn
			}
		}
		logger.LogAttrs(ctx, level, "rpc", attrs...)
		return resp, err
	}
}

// Metrics records grpc_requests_total and grpc_request_duration_seconds.
// Method names are a bounded set - safe as labels.
func Metrics(m *observability.Metrics) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		start := time.Now()
		resp, err := handler(ctx, req)
		m.GRPCRequests.WithLabelValues(info.FullMethod, status.Code(err).String()).Inc()
		m.GRPCDuration.WithLabelValues(info.FullMethod).Observe(time.Since(start).Seconds())
		return resp, err
	}
}

func first(md metadata.MD, key string) string {
	if vals := md.Get(key); len(vals) > 0 {
		return vals[0]
	}
	return ""
}
