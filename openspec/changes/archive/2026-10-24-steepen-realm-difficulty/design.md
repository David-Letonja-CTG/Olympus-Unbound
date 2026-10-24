# Design

## Balance

`balance.endless` becomes growth factors, fractions and the head start:

| Key | Value | Was |
|---|---|---|
| `enemyHealthGrowth` | 3 | +0.6 per realm |
| `enemyDamageGrowth` | 1.5 | +0.25 |
| `bossHealthGrowth` | 2.4 | +0.7 |
| `bossDamageGrowth` | 1.5 | +0.25 |
| `spawnRatePerRealm` | 0.25 | 0.12 |
| `maxAlivePerRealm` | 0.25 | 0.12 |
| `headStartPerRealm` | 120 s | — |
| `maxHeadStart` | 180 s | — |

`RunState.depthScale()` returns `growth^depth` for health and damage, `1 + fraction × depth` for spawn rate and room. Every caller (enemy spawn, boss spawn, boss attacks and zones, the Director's invasions) already goes through it.

`RunState.headStart()` = `min(maxHeadStart, headStartPerRealm × depth)`. `SpawnDirector.currentPhase()` reads the timeline at `realmTime + headStart()`. The Director's invasions draw from that phase too. Timed events, the boss time, the merchant and the per-minute scaling keep reading `realmTime`.

Content validation: `enemyHealthGrowth` ≥ every realm's `scaling.max`, so a new realm never starts weaker (the spec's "never weaker on arrival").

## Expected curve (regular enemies, health × in-realm growth)

| Realm | On arrival | After 7 min |
|---|---|---|
| 1 | ×1 | ×1.84 |
| 2 | ×3 | ×5.5 |
| 3 | ×9 | ×16.6 |
| 4 | ×27 | ×50 |

## Tests

- The second realm: health × 3 at the same realm time; damage after two realms × 1.5²; bosses after two realms × 2.4².
- The head start: the second realm spawns the phase due at 120 s within its first second.
- Content validation of the growth against realm scaling.
- The headless probe (bot with god mode) before and after: damage taken per minute in realm 2 no longer drops to ~0.

## Measured (headless bot with god mode, Zeus and Hades, seed 1)

| | Damage taken per minute, realm 2 | Realm 3 |
|---|---|---|
| Before | 0–150 | 0–200 |
| ×2.4 / 1.4, 90 s head start | 0–300 | 100–7900 |
| ×3 / 1.5, 120 s head start (chosen) | 30–1000 | 150–6500 |

The first realm ends at 3000–4000 a minute for this bot. A player who dodges takes far less, so realm 2 now plays as a step up and realm 3 as hard.
