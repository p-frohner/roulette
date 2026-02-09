# Game Of Roulette

Demo:

https://roulette-six-rho.vercel.app/

The server stops after 15 mins of inactivity, needs 30-60 secs to spin up on a cold start.


## Using Docker
The easiest way to get started. This handles the Database and the Go server together. From the root directory:

```
make docker-up
```

## Local Development
The project is structured as a monorepo. To learn more about the specific setup, API contracts, or frontend configuration for each part, please refer to their respective documentation:

[Server README.MD](server/README.md)

[Client README.MD](client/README.md)


## TODO
 - Make it acceptable for mobile
 - Improve sad animation of ball landing on the winning number
 - Look into "Provably Fair"
 - UI improvements, display bets, history