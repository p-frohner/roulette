# Service Tracker - Go Backend

This is the Go backend for the service tracker. It uses a contract-first and schema-first architecture to ensure the API and Database are always in sync.

## Tech Stack
 - Language: Go 1.21+
 - Hot Reload: Air

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 8080) | No |

## Local Development

### Prerequisites
To run this project locally, you need to install:

 - Go (1.21+): The programming language runtime. [Install Go](https://go.dev/doc/install)

```go
go install [github.com/air-verse/air@latest](https://github.com/air-verse/air@latest)
```

### Run the Application with hot reload

```
air
```
