# best-flight-game-20261126-0057

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/arifferdiana/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/arifferdiana/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Nusa Seaplane: Island Medicine Run — a 3D seaplane flight game over an Indonesian archipelago at dawn. Take off from the water, fly the golden rings, and land gently at clinic docks to deliver medicine to three islands. Fuel, hull damage, and low-flying bonuses turn every sortie into decisions: thread the rock gap low for +250, land silky for +150, or run dry and wait for the fishing boat.

## Run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome — no build step, no network
```

## How to fly

- **W / S** — throttle up / down
- **↑ / ↓** — climb / descend
- **← / →** — bank and turn
- **A / D** — rudder
- **Space** — water brake
- **R** — back to the last dock · **P** — pause · **M** — sound on/off

Three deliveries (Pulau Karang, Pulau Bunga, Pulau Senja), each a chain of three golden rings from the last dock to the next clinic. Land on the water inside the dock zone, slow, to deliver — the clinic refuels you and patches the hull. Fly into an island and the run ends; run out of fuel over open water and the run ends too.

Built with Three.js (vendored as `game/vendor/three.module.min.js`), no other dependencies, no network requests, all sound synthesized live with WebAudio.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
