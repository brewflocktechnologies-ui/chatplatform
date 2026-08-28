# All targets verified on Windows git-bash and Linux. Tools: go, buf, sqlc,
# goose, golangci-lint on PATH (see README "Local development").

BINARY := allocationservice
TEST_DATABASE_URL ?= postgres://chatuser:chatpass@localhost:5432/allocation_test?sslmode=disable

.PHONY: build run test test-unit test-integration lint generate proto sqlc migrate docker-build docker-run

build:
	go build -o bin/$(BINARY) ./cmd/allocationservice

run:
	go run ./cmd/allocationservice

test:
	TEST_DATABASE_URL=$(TEST_DATABASE_URL) go test ./...

test-unit:
	go test ./internal/...

test-integration:
	TEST_DATABASE_URL=$(TEST_DATABASE_URL) go test ./tests/integration/...

lint:
	go vet ./...
	golangci-lint run

generate: proto sqlc

proto:
	buf lint
	buf generate

sqlc:
	sqlc generate

# Applies embedded migrations via the service binary (same code path
# production uses). DATABASE_URL must be set.
migrate:
	go run ./cmd/allocationservice migrate

docker-build:
	docker build -t allocationservice:local .

docker-run:
	docker compose up -d --build
