# ─────────────────────────────────────────
# Base: shared toolchain + cached module download
# ─────────────────────────────────────────
FROM golang:1.26-alpine AS base

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

# ─────────────────────────────────────────
# Dev: hot-reload via air, source mounted as a volume by docker-compose
# ─────────────────────────────────────────
FROM base AS dev

RUN go install github.com/air-verse/air@latest

COPY . .

EXPOSE 8080

CMD ["air", "-c", ".air.toml"]

# ─────────────────────────────────────────
# Builder: compiled production binary
# ─────────────────────────────────────────
FROM base AS builder

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bin/api .

# ─────────────────────────────────────────
# Production: minimal runtime image
# ─────────────────────────────────────────
FROM alpine:3.20 AS production

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/bin/api ./api

EXPOSE 8080

ENTRYPOINT ["./api"]
