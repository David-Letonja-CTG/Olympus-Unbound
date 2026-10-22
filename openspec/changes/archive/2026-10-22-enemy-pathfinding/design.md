# Design

## A flow field toward the gods

`engine/enemies/navigation.ts` gets a new class, `NavField`. It is owned by `RunState` beside `collision`, and replaced with it on `enterRealm`.

**The grid**
- The playable bounds are cut into 32 px cells: 116 × 116 in a 64-tile realm.
- A cell is *blocked* when its centre lies within an obstacle's radius plus 16 px, so the 19 px seams between maze blocks close while a missing block (a breach) stays open.
- Static obstacles are stamped once.
- Shifting walls are stamped over them whenever `WorldCollision`'s dynamic obstacles change. `setDynamic` bumps a `dynamicVersion` that the field compares, so the three existing callers stay as they are.

**The distances**
- A Dijkstra pass with octile costs (1, √2; no corner cutting) runs from the cells of all living gods, so each cell learns its distance to the god nearest *by path*. The gods' own cells are seeds even when blocked (a god hugging a wall).
- It uses preallocated typed arrays and a binary heap with lazy deletion, so a refresh allocates nothing.
- The pass is rerun at most every 6 steps (10 Hz), and only when a god has changed cell or the walls have changed. This happens in `updateEnemies` before steering.

**Which way to walk**
- `NavField.toward(x, y)` looks at the 8 neighbours of the walker's cell: open, no corner cutting. It returns the unit direction from the walker's actual position to the centre of the neighbour with the lowest distance, if that is lower than its own cell's.
- A walker in a blocked cell (pressed against a wall) steps to its best open neighbour.
- An unreachable cell gives no direction, and the caller walks straight.
- Aiming at a neighbour's centre, rather than along a fixed cell direction, keeps paths continuous and away from wall faces.

**Sight**
- Walking the field turns only in 45° steps, so a walker that can see its target walks straight at it instead.
- Sight is a grid line test over blocked cells from the walker to its target, up to 900 px. A body wider than the clearance also tests two side lines, so a big walker does not "see" through a gap it would wedge in. It is refreshed per enemy every 8 steps, staggered by `id`, and kept on the enemy (`Enemy.sight`).
- At 400 enemies that is about 50 short line tests per step.

## Behaviors

- A new helper, `approach(state, enemy, target)`, gives the straight direction when the enemy has sight (or the field has none), else the field's direction.
- `chaser`, the approach half of `keepRange` (`ranged`, `summoner`) and the walking mode of `charger` use it.
- Retreating and side-drifting stay straight, as before.
- `charger` winds up only with sight (spec: enemy-spawning / no charge through a wall). Its dash stays a straight line.
- The boss's walk (`updateBoss`) uses `approach` too. Its charges stay straight, so a rush into a wall still dazes it.

## A boss's own field

Asterion is 100 px wide; the small-body field would lead him through seams and between his rings where he wedges (found in testing). `RunState.navFor(enemy)` gives a boss its own `NavField` with clearance `max(16, round(0.6 × radius))`, made on its first walk and refreshed with the main one; it is dropped with the realm.

## Gaps that fit the boss

In `startWalls`, each ring's gap angle becomes the larger of two values:

- `gapShare` of the sector;
- the angle that leaves `2 × (boss radius + PILLAR) + 24` px between the pillar centres either side of the gap.

Each arc is centred between its gaps. The number of pillars per arc follows the remaining span. Rings stay turned against each other only when the boss can walk between every two of them (ring spacing ≥ the opening); otherwise (all of today's content: 100–120 px apart) their gaps line up, so the way out is straight through. This is a rule over data (the attack's origin radius), with no Asterion-specific branch: `AttackOrigin` gains `radius`. A part's walls use its boss's radius, since the boss is the one who walks.

## Network and determinism

- Guests do not steer enemies (D16), so `NavField` lives only in the host's `RunState`.
- Everything is fixed-step, integer-indexed and seeded by state alone. The heap's tie order is deterministic.

## Tests

- `navigation.spec.ts`: blocking and seams; distances around a wall; `toward` leads round a wall's end; unreachable gives none; walls changing triggers a refresh; nearest-by-path with two gods.
- Enemies: a chaser behind a wall reaches the god within N seconds (it fails today). A charger behind a wall does not wind up.
- Walls: every ring's gap fits the boss for all three of Asterion's phases. Asterion, surrounded by his rings, gets out toward a god within N seconds.
- Labyrinth: an autopilot-free headless check that, after 60 s in a maze seed, most enemies have moved closer to the god (by path distance) than where they spawned.
- Performance: the field refresh is timed in a spec log (not asserted) and with `scripts/perf/phone.mjs`.

## Measured (2026-10-21)

- Labyrinth, seed 4, god waiting in a corridor for 60 s (4 places): enemies standing still far from the god went from 16–27 of 75 (straight walking) to 2–5.
- Asterion crossing the Labyrinth to a waiting god, seeds 1–6: straight, he stuck for good on seed 3 (1255 px away) and at a wall on seed 1. With the way, he reaches the god on all six.
- Cost: about 0.03 ms per step more in the Labyrinth (Node).
