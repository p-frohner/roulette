FROM golang:1.25-alpine AS dev

RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

RUN go install github.com/air-verse/air@latest

COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main ./cmd/api/main.go

CMD ["air", "-c", ".air.toml"]