// JWT-verifying variant of the auth-context interceptor: the "verified token
// later" the AuthContext comments always promised. Selected via AUTH_MODE=jwt;
// AUTH_MODE=trusted-header keeps AuthContext() unchanged for safe rollout.
package interceptors

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jws"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const authorizationMetadataKey = "authorization"

// TokenVerifier validates a bearer token and returns the tenant id claim
// ("" when the token carries none). Implementations must be safe for
// concurrent use.
type TokenVerifier interface {
	VerifyTenant(ctx context.Context, token string) (string, error)
}

// JWKSVerifier validates platform JWTs against authservice's JWKS endpoint,
// with an auto-refreshing key cache so rotation needs no restart.
type JWKSVerifier struct {
	issuer string
	skew   time.Duration
	keys   jwk.Set
}

// NewJWKSVerifier wires the cached key set. ctx bounds the cache's background
// refreshes - pass the server's root context so refreshing stops on shutdown.
// The initial key fetch is lazy (first verification), so the service still
// boots while authservice is briefly down.
func NewJWKSVerifier(ctx context.Context, issuer, jwksURL string, skew time.Duration) (*JWKSVerifier, error) {
	cache := jwk.NewCache(ctx)
	if err := cache.Register(jwksURL, jwk.WithMinRefreshInterval(15*time.Minute)); err != nil {
		return nil, fmt.Errorf("register JWKS %s: %w", jwksURL, err)
	}
	return &JWKSVerifier{
		issuer: issuer,
		skew:   skew,
		keys:   jwk.NewCachedSet(cache, jwksURL),
	}, nil
}

// VerifyTenant parses and validates the token (signature via JWKS kid,
// issuer, expiry with skew) and extracts the tenant_id claim.
func (v *JWKSVerifier) VerifyTenant(ctx context.Context, token string) (string, error) {
	parsed, err := jwt.ParseString(token,
		jwt.WithContext(ctx),
		// The JWKS publishes kid but (like many issuers) no alg field, so the
		// algorithm must be inferred from the key type; the kid match still
		// pins the exact key.
		jwt.WithKeySet(v.keys, jws.WithInferAlgorithmFromKey(true), jws.WithRequireKid(true)),
		jwt.WithIssuer(v.issuer),
		jwt.WithAcceptableSkew(v.skew),
		jwt.WithValidate(true),
	)
	if err != nil {
		return "", err
	}
	tenant, _ := parsed.Get("tenant_id")
	tenantID, _ := tenant.(string)
	return tenantID, nil
}

// JWTAuth mirrors AuthContext() - same context keys, same non-fatal absence
// semantics (handlers enforce via requireTenant, so health/reflection stay
// open) - but tenant identity now comes from a VERIFIED platform JWT instead
// of the trusted x-tenant-id header. A PRESENT-but-invalid token is an active
// error and fails the RPC outright.
func JWTAuth(verifier TokenVerifier) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		md, _ := metadata.FromIncomingContext(ctx)

		if raw := first(md, authorizationMetadataKey); raw != "" {
			token, ok := strings.CutPrefix(raw, "Bearer ")
			if !ok {
				token, ok = strings.CutPrefix(raw, "bearer ")
			}
			if !ok {
				return nil, status.Error(codes.Unauthenticated, "authorization metadata is not a bearer token")
			}
			tenantID, err := verifier.VerifyTenant(ctx, strings.TrimSpace(token))
			if err != nil {
				return nil, status.Error(codes.Unauthenticated, "invalid token")
			}
			if tenantID != "" {
				ctx = context.WithValue(ctx, tenantKey, tenantID)
			}
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
