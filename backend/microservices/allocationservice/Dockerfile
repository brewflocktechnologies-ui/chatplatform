# Build stage: reproducible, cache-friendly. Generated code (gen/, sqlc
# output) is committed, so the image build needs only the Go toolchain - no
# buf/sqlc/protoc in the build environment.
FROM golang:1.27 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
# CGO off => static binary; trimpath for reproducibility.
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /allocationservice ./cmd/allocationservice

# Runtime: distroless static - no shell, no package manager, non-root.
# Migrations are embedded in the binary (`allocationservice migrate`), so
# nothing else ships.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /allocationservice /allocationservice
# 9096 gRPC, 9097 HTTP (/metrics /healthz /readyz)
EXPOSE 9096 9097
USER nonroot
ENTRYPOINT ["/allocationservice"]
