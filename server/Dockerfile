# === Builder stage ===
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/api/main.go

# === Dev stage (used by docker-compose) ===
FROM golang:1.25-alpine AS dev

RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

RUN go install github.com/air-verse/air@latest

COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main ./cmd/api/main.go

CMD ["air", "-c", ".air.toml"]

# === Production stage (used by Render) ===
FROM alpine:3.21 AS production

RUN apk add --no-cache ca-certificates

COPY --from=builder /server /server

EXPOSE 8080

CMD ["/server"]
