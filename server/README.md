# Game of Roulette — Go Server

Real-time WebSocket game server for a multiplayer roulette game. Manages game state, player sessions, and bet resolution across all connected clients.

## Tech Stack

- Language: Go 1.25
- Router: [chi](https://github.com/go-chi/chi)
- WebSocket: [coder/websocket](https://github.com/coder/websocket)
- Hot Reload: Air

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 8080) | No |

## Local Development

### Prerequisites

- Go (1.21+): [Install Go](https://go.dev/doc/install)
- Air for hot reload:

```bash
go install github.com/air-verse/air@latest
```

### Run with hot reload

```bash
air
```
