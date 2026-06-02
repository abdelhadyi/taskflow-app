FROM golang:1.22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o user-service ./cmd/main.go

FROM alpine:3.19
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/user-service .
COPY --from=builder /app/migrations ./migrations
RUN chown -R app:app /app
USER app
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8001/health || exit 1
CMD ["./user-service"]


