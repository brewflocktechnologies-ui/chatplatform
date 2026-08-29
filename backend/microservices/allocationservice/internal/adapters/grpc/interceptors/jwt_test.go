package interceptors

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const testIssuer = "http://localhost:8110"

// testKeys generates an RSA keypair and serves its public JWK set over an
// httptest server - a stand-in for authservice's /oauth2/jwks.
func testKeys(t *testing.T) (jwk.Key, *httptest.Server) {
	t.Helper()
	raw, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	private, err := jwk.FromRaw(raw)
	if err != nil {
		t.Fatalf("wrap key: %v", err)
	}
	if err := private.Set(jwk.KeyIDKey, "test-kid"); err != nil {
		t.Fatalf("set kid: %v", err)
	}
	// Deliberately NO alg on the published key - authservice's JWKS (like
	// many issuers) carries only kty/kid/n/e, so the verifier must infer.
	public, err := private.PublicKey()
	if err != nil {
		t.Fatalf("public key: %v", err)
	}
	set := jwk.NewSet()
	if err := set.AddKey(public); err != nil {
		t.Fatalf("add key: %v", err)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		buf, merr := json.Marshal(set)
		if merr != nil {
			http.Error(w, merr.Error(), http.StatusInternalServerError)
			return
		}
		_, _ = w.Write(buf)
	}))
	t.Cleanup(server.Close)
	return private, server
}

func signedToken(t *testing.T, key jwk.Key, mutate func(builder *jwt.Builder)) string {
	t.Helper()
	builder := jwt.NewBuilder().
		Issuer(testIssuer).
		Subject("dev-cli").
		Claim("tenant_id", "tenant-1").
		IssuedAt(time.Now()).
		Expiration(time.Now().Add(5 * time.Minute))
	if mutate != nil {
		mutate(builder)
	}
	token, err := builder.Build()
	if err != nil {
		t.Fatalf("build token: %v", err)
	}
	signed, err := jwt.Sign(token, jwt.WithKey(jwa.RS256, key))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return string(signed)
}

func invoke(t *testing.T, interceptor grpc.UnaryServerInterceptor, md metadata.MD) (string, error) {
	t.Helper()
	ctx := metadata.NewIncomingContext(context.Background(), md)
	var seenTenant string
	_, err := interceptor(ctx, nil,
		&grpc.UnaryServerInfo{FullMethod: "/allocation.v1.AllocationService/CreateAllocation"},
		func(ctx context.Context, req any) (any, error) {
			seenTenant = TenantFromContext(ctx)
			return "ok", nil
		})
	return seenTenant, err
}

func newTestVerifier(t *testing.T, jwksURL string) *JWKSVerifier {
	t.Helper()
	verifier, err := NewJWKSVerifier(context.Background(), testIssuer, jwksURL, 60*time.Second)
	if err != nil {
		t.Fatalf("verifier: %v", err)
	}
	return verifier
}

func TestJWTAuthValidTokenSetsTenant(t *testing.T) {
	key, server := testKeys(t)
	interceptor := JWTAuth(newTestVerifier(t, server.URL))

	tenant, err := invoke(t, interceptor,
		metadata.Pairs("authorization", "Bearer "+signedToken(t, key, nil)))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tenant != "tenant-1" {
		t.Fatalf("tenant = %q, want tenant-1", tenant)
	}
}

func TestJWTAuthMissingTokenIsNonFatal(t *testing.T) {
	_, server := testKeys(t)
	interceptor := JWTAuth(newTestVerifier(t, server.URL))

	tenant, err := invoke(t, interceptor, metadata.MD{})
	if err != nil {
		t.Fatalf("absence must stay non-fatal (handlers enforce): %v", err)
	}
	if tenant != "" {
		t.Fatalf("tenant = %q, want empty", tenant)
	}
}

func TestJWTAuthExpiredTokenRejected(t *testing.T) {
	key, server := testKeys(t)
	interceptor := JWTAuth(newTestVerifier(t, server.URL))

	expired := signedToken(t, key, func(b *jwt.Builder) {
		b.Expiration(time.Now().Add(-10 * time.Minute)).IssuedAt(time.Now().Add(-20 * time.Minute))
	})
	_, err := invoke(t, interceptor, metadata.Pairs("authorization", "Bearer "+expired))
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("code = %v, want Unauthenticated", status.Code(err))
	}
}

func TestJWTAuthWrongIssuerRejected(t *testing.T) {
	key, server := testKeys(t)
	interceptor := JWTAuth(newTestVerifier(t, server.URL))

	wrongIssuer := signedToken(t, key, func(b *jwt.Builder) { b.Issuer("http://evil.example") })
	_, err := invoke(t, interceptor, metadata.Pairs("authorization", "Bearer "+wrongIssuer))
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("code = %v, want Unauthenticated", status.Code(err))
	}
}

func TestJWTAuthNonBearerSchemeRejected(t *testing.T) {
	_, server := testKeys(t)
	interceptor := JWTAuth(newTestVerifier(t, server.URL))

	_, err := invoke(t, interceptor, metadata.Pairs("authorization", "Basic abc"))
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("code = %v, want Unauthenticated", status.Code(err))
	}
}

func TestJWTAuthTokenWithoutTenantClaimPassesWithoutTenant(t *testing.T) {
	key, server := testKeys(t)
	interceptor := JWTAuth(newTestVerifier(t, server.URL))

	bare, err := jwt.NewBuilder().
		Issuer(testIssuer).
		Subject("dev-cli").
		IssuedAt(time.Now()).
		Expiration(time.Now().Add(5 * time.Minute)).
		Build()
	if err != nil {
		t.Fatalf("build token: %v", err)
	}
	signed, err := jwt.Sign(bare, jwt.WithKey(jwa.RS256, key))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	noTenant := string(signed)
	tenant, err := invoke(t, interceptor, metadata.Pairs("authorization", "Bearer "+noTenant))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tenant != "" {
		t.Fatalf("tenant = %q, want empty (handlers enforce)", tenant)
	}
}
