# Game Of Roulette

A real-time, multiplayer Roulette experience built to explore the synergy between a high-performance Go backend and a reactive React frontend.

[Demo](https://game-of-roulette.vercel.app)

The server stops after 15 mins of inactivity, may need 30-60 secs to start.

## Using Docker
The easiest way to get started. This handles the React and the Go server together. 

From the root directory:

```
make docker-up
```

## TODO
 - Make it nicer for mobile
 - Improve sad animation of ball landing on the winning number
 - Look into "Provably Fair"
 - UI improvements, display bets, history