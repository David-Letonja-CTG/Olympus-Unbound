# Systems

The rules of the simulation, where they live, and the formulas they use. Values come from `client/src/content/`.

## Stats and modifiers — `engine/core/stats.ts`

One `StatBlock` per player: `maxHealth, armor, regen, moveSpeed, might, area, cooldown, projectiles, pierce, chains, projectileSpeed, duration, critChance, critMultiplier, magnet, xpGain, goldGain, lifesteal, knockback, lightningDamage, fireDamage, physicalDamage, shadowDamage, revivals`.

Sources contribute `Modifier { stat, flat?, percent? }`: the god's base stats and passive, permanent upgrades, armour levels (cumulative), relics, skills × level, synergies.

```text
stat = max(minimum, (base + Σflat) × (1 + Σpercent))      minimums: cooldown 0.3, moveSpeed 40, area 0.25 …
```

Stats are recomputed only when the loadout changes (`refreshPlayer`), together with every weapon's effective numbers.

## Weapons — `engine/weapons/`

`resolveWeaponStats`: base + level deltas, then `cooldown × stats.cooldown`, `amount + stats.projectiles` (not for nova), `size × stats.area`, projectile `speed × stats.projectileSpeed`, `pierce + stats.pierce` (unless unlimited), `chains + stats.chains`, `duration × stats.duration`.

| Behavior | Targeting | Uses |
|---|---|---|
| `projectile` | nearest enemy in `range`, else facing | `amount` fanned over `arc`, `speed`, `size`, `pierce`, `duration`, `homing` |
| `chain` | nearest enemy in `range`, then nearest unhit within `size` | `amount` bolts, `chains` jumps |
| `orbit` | orbs circle at radius `range` | `amount` orbs, `size`, `speed` rad/s, `cooldown` = re-hit interval per enemy |
| `nova` | everything within `size`, only if something is there | knockback, effects |
| `sweep` | arc `arc` of reach `size` toward the nearest enemy; extra swings alternate | effects, lifesteal |
| `strike` | `amount` distinct random enemies within `range`, blast `size` | used by Zeus's ability |

A weapon with nothing to hit retries after 0.1 s instead of spending its cooldown. Abilities are weapon definitions fired on demand; `base.cooldown` is the ability cooldown.

## Damage — `engine/combat/damage.ts`

```text
damage = weapon damage × might × element bonus × (crit ? critMultiplier : 1) × (1 + shock potency if shocked)
crit   = combatRng.next() < weapon critChance + player critChance
player damage taken = max(1, hit − armour)
```

`hitEnemy` is the only entry point for player damage: it records weapon damage, applies lifesteal (`stats.lifesteal + weapon lifesteal`, capped at max health), knockback (`weapon knockback × stats.knockback × (1 − resistance)`, elites +0.5 resistance, bosses immune) and status effects. `killEnemy` runs once per enemy: one kill, XP gem, gold by chance (always for elites/boss), a treasure chest for elites, rare healing.

After a hit the player is invulnerable for 0.12 s; contact damage from each enemy repeats every 1 s. With revivals left (Phoenix Feather), a lethal hit revives with half health, 2.5 s invulnerability and a shockwave.

## Status effects — `engine/combat/status.ts`

| Effect | Potency | Stacking |
|---|---|---|
| burn | damage per second = hit damage × potency, ticks every 0.5 s | refresh: longest duration, strongest dps |
| shock | extra damage taken | refresh |
| stun | — (bosses take 20% of the duration) | longest |
| slow | speed reduction | refresh |

Durations scale with the player's `duration` stat.

## Enemies — `engine/enemies/`

Behaviors decide only movement and their special action; the enemy system applies status, speed, knockback (decays ×e^(−9t)), separation (≤ 4 neighbours), world collision and contact damage.

`chaser` (optional weave) · `ranged` (keeps 0.8–1.15 × preferred range, shoots on cooldown; arrows stop at obstacles) · `charger` (within trigger range: wind-up with a red lane, dash, recover, cooldown) · `summoner` (keeps distance, calls N minions on cooldown).

## Spawning — `engine/spawning/director.ts`

- The active phase is the last timeline phase whose `from` has passed. Regular enemies accumulate at `rate`/s (× `boss.spawnRateMultiplier` while the boss lives) and spawn while living regular enemies < `maxAlive`; packs (`groups`) arrive every `every` seconds.
- Spawn points lie on a rectangle `view + 70 px` around the players, inside the map, not in obstacles; up to 16 tries, else the spawn is skipped.
- Timed events (sorted): `horde` (a ring just outside the view) and `elite`. The boss spawns once in the boss arena at `boss.at`.
- Scaling at spawn: health × min(max, 1 + healthPerMinute × minutes), damage likewise. Elites: × health/damage/size/xp + gold.
- Regular enemies farther than 1700 from every player are moved back to the spawn ring once per second.
- Global caps: 400 enemies, 300 player projectiles, 120 enemy projectiles, 400 pickups (XP and gold beyond the cap merge into the nearest pickup of the same kind).

## Bosses — `engine/bosses/boss.ts`

The boss is an enemy with a `BossRuntime`: phases switch below health fractions (announced once). Between attacks it walks toward the nearest player at `speed × phase.speedMultiplier`. Attacks rotate through the phase's list with `attackPause` between them: `slam` (circle around the boss), `boulder` (circles at and around the player, staggered), `charge` (marked lane, then a dash that hits on contact), `summon` (minions around the boss). Hazards deal damage only to players inside them when the wind-up ends.

## XP, levels and offers — `engine/progression/`

```text
XP to next level (from L) = round(base + perLevel × (L − 1) + growth × (L − 1)²)     currently 5, 4, 0.3
```

Excess XP carries over; each threshold crossed queues one choice. Chests queue a choice without a level. Offers: every valid candidate (weapon level below max; new weapon if < 6 weapons; armour if none, else its next level; relic if < 4; skill below max and meeting its element/behavior requirement) gets a weight (`offerWeights`), × `affinity` (1.6) when its element matches the god's affinities or a held weapon. Three distinct offers are drawn with the `offers` RNG stream; with no candidates the fallback is heal + gold.

Synergies are checked after every change; each activates once, is announced, and adds its modifiers.

## Run phases — `engine/sim/run-simulation.ts`

`playing` → `choosing` (choice open) → `playing`; `pause()` from playing/choosing, `resume()` returns to the previous phase; `end(outcome)` once, from any phase (later calls are ignored). Choices carry an ID; answers for another ID or an invalid index are ignored. Victory is checked before defeat in the same step.

## Lighting and atmosphere — `engine/phaser/atmosphere.ts` (D13)

Each frame: clear the light map to the realm's `atmosphere.ambient`; add lights (priority: player 10, boss 8, strikes 6, elites 5, effects 3–4, braziers 2, projectiles 1); keep those overlapping the view, sorted by priority then distance to the view centre, up to the quality budget; stamp each as a radial falloff (≈ (1 − r)^2.2) tinted by its colour, additively; multiply the result over the world. Brazier flicker is two slow sines per brazier. Enemy copies above the darkness use the quality's `silhouette` opacity (Low 0.5, Medium 0.42, High 0.36; ×1.5 for elites and the boss).

## Cutscene timing — `engine/cutscene/timeline.ts` (D14)

Cues fire when `previous < at ≤ now` (the first frame includes `at = 0`). The camera eases (smoothstep) from where earlier camera cues left it to each cue's target over its duration; fades work the same way on visibility (0 black, 1 clear; a fade at 0 starts black). Captions are active for `at ≤ t < at + duration`. Positions are relative to the arena's central plaza.

## Arena generation — `engine/maps/generate-arena.ts`

Deterministic from `(map config, seed)`: terrain bands from two-octave value noise; a cliff border; marble plazas (spawn, boss arena ≥ `minDistanceFromSpawn` away, temple rings); obstacles via rejection sampling with `minObstacleGap`, clear zones and `maxObstacles`; decorations only on their terrain and never on obstacles; `plazaLights` rules then place light-bearing obstacles (braziers) evenly around every plaza, outside the spawn and boss-arena clear zones. Rendering (`engine/phaser/world-view.ts`) draws the terrain as one smoothed picture (one pixel per tile), round marble floors and y-sorted obstacles.

## Saves and rewards — `client/src/app/core/save/`

`SaveData v2 { version, gold, permanentUpgrades, discovered { weapons, armour, relics }, stats { runs, victories, kills, bestTimeSeconds }, settings { sfxVolume, screenShake, damageNumbers, quality }, processedRunIds, introSeen }` under `localStorage['olympus-unbound/save']`. `parseSave` validates each field, clamps upgrade levels, drops unknown IDs, migrates older versions (`MIGRATIONS`), and refuses newer ones (fresh save). `applyRunResult` grants gold (half when abandoned, + realm victory bonus), discoveries and statistics once per run ID.

Migrations: v0 (unversioned) → v1 renames nothing; v1 → v2 adds `introSeen: false`; a missing or invalid `quality` takes the detected default (`detectQuality`: software renderer → Low, ≥ 8 cores → High, else Medium).

To change the save format: bump `SAVE_VERSION`, add `MIGRATIONS[oldVersion]`, extend `parseSave`, add tests for the old shape.
