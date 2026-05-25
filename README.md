# Game of Roulette

A real-time, multiplayer roulette game built with a Go WebSocket server and a reactive React frontend.

[Live Demo](https://game-of-roulette.vercel.app) — server sleeps after 15 min of inactivity, may take 30–60s to wake.

## Architecture

- **Go server** manages game lifecycle (betting → spinning → result), broadcasts state to all clients over WebSocket, and resolves bets
- **React client** treats the WebSocket connection as an RxJS observable stream — game events compose into derived streams (e.g. winning number emits only after the spin animation settles)
- **Zustand** holds client-side game state; components subscribe to slices rather than the raw socket
- **TanStack Router** handles client-side routing

## Running Locally

Docker is the easiest path — handles both services together:

```bash
make docker-up
```

See [`client/README.md`](client/README.md) and [`server/README.md`](server/README.md) for running each service independently.

## Roadmap

- Mobile layout improvements
- Better ball landing animation on the winning number
- Provably fair spin verification
- Persistent bet history and player stats
