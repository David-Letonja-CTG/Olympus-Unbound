# Design

Relies on D2 (rules in the simulation), D3 (HUD at ≤ 10 Hz through the session), D4 (content as typed data), D5 (seeded streams, `step(1/60)` only), D7 (HUD split), D13 (readable darkness), D16 (the host's simulation is the authority). Proposes D22 (the Director steers choices, never numbers).

## Content (D4)

`content/chaos.ts` holds `DIRECTOR` (`balance.director`), `ENCOUNTERS` and `BOONS` (`GameContent.encounters`, `GameContent.boons`).

```ts
interface BoonDefinition { id; name; description; seconds; modifiers: Modifier[]; relief?: boolean; visual }

type EncounterBehavior =
  | { type: 'invasion'; stages: { count; enemy? }[]; elite: boolean; stageGap; timeLimit; maxCount }
  | { type: 'eclipse'; seconds; enemySpeed; spawnRate; darkness; champion: { at; health } }
  | { type: 'hunt'; health; speed; escapeAfter; attacks: BossAttack[]; pause; titles: Record<Element, string> }
  | { type: 'shrine'; boons: string[]; seconds; radius; distance }
  | { type: 'contract'; offers: string; seconds; radius; risk; bonus: EncounterReward };

interface EncounterDefinition {
  id; name; objective; announce; behavior; major; telegraph; weight; cooldown; perRealm; from;
  minDepth?; realms?; pressure?: { min?; max? };
  requires?: { corruption?; maxCorruption?; grudge?; elitesSlain? };
  tags?: ('relief' | 'durable' | 'movement')[];
  offered?: boolean;                       // only through a contract
  outcomes: Record<string, { success; text; reward?: { gold?; chest?; boon?; heal? }; changes?: { corruption?; grudge? } }>;
}
```

Each behaviour names the outcome keys it ends with (`invasion`: repelled/overrun, `eclipse`: broken/endured, `hunt`: slain/escaped, `shrine`: received/faded, `contract`: accepted/declined); `validateContent` checks them, the references (enemies, boons, offered encounters, realms), weights, telegraphs of major encounters, pressure bands and the balance.

## State ownership

| State | Owner |
|---|---|
| Encounter definitions, boons, director balance | content |
| Pressure, observations, encounters under way, cooldowns, counts per realm, realm state, decisions and outcomes | `ChaosDirector` (simulation), one per run, created by `RunSimulation` |
| Realm modifiers (`omen`: enemy speed, spawn rate, darkness), world markers (`sites`), champion flag, damage and elite counters | `RunState` (read by the enemy system, the spawn director and the views) |
| Blessings on a god (`Player.boons`) | `RunState` players; modifiers through `collectModifiers` |
| Markers, darkness, pointers, sounds | Phaser layer, from `WorldFrame` and events |
| Encounter banner, blessings, report panel | Angular, from `HudSnapshot` (10 Hz) and debug `inspect()` |

## Simulation (`engine/chaos/`)

- `observe.ts`: `Observer.observe(dt, encounters)` reads the run (no writes to it), keeping only its own memory (recent damage, kills over a window, where each god stood), and returns `Observation { pressure, factors: { threat, damage, health, boss, encounters }, killRate, health, still }`; `dominantElement(state)` names the party's most damaging element. It runs every `balance.director.observe` seconds (0.5 s): one pass over the enemies, hazards and hostile projectiles near living gods. Damage taken comes from `state.damageTaken`, a counter in the one damage pipeline; kills from `state.kills`.
- `director.ts` (`ChaosDirector`): `update(dt, spawner)` per step: ticks boons, encounters under way (their behaviour handler), observes on its interval and thinks once per second: pacing gate → eligible encounters (`eligibility(def)` returns a reason or nothing) → weights (content × adaptive × novelty) → `chaosRng.weighted`. `report()` builds the debug report on demand only.
- Lifecycle: `Encounter { uid, def, phase, timer, elapsed, outcome?, settled, x?, y?, enemies, site?, bonus? }`. `transition(enc, to)` checks `NEXT = { telegraph: [active, cancelled], active: [resolving, cancelled], resolving: [completed, failed, cancelled] }`. `settle(enc)` applies the outcome's reward and realm-state change once (`settled`), then the behaviour's `cleanup`. Cancelling runs `cleanup` without settling.
- `behaviors.ts`: `ENCOUNTER_BEHAVIORS: { [type]: { begin, warn?, start, update, cleanup, hud } }`, one reusable rule per kind (like `WARE_RULES` and `ENEMY_BEHAVIORS`); a new kind is one entry plus its content type. The scheduler never switches on kinds.
- Spawning uses `SpawnDirector.spawnPosition` (now taking a stream) with the `chaos` stream for places, and `state.spawnEnemy` (scaling by time, depth, party and the run's rules as for every monster). Hunters' attacks go through `placeAttack` and the hazard system (warnings, perfect dodges, the one player-damage rule).
- Eclipse: `state.omen.enemySpeed` multiplies walking speed in the enemy system (not the boss), `state.omen.spawnRate` the spawn director's rate; `darkness` is only drawn. `cleanup` resets them; `enterRealm` resets them too.
- Boons: `Player.boons: { def, left }[]`; `collectModifiers` adds their modifiers; applying or expiring one calls `refreshPlayer`.
- Step order: … spawn director → **Director** → enemies … ; `travel` cancels every encounter before the new realm and then adds `corruptionPerRealm`.
- Random streams: `chaos` (new fork) for every decision and place. Hunter and invader creation also draws the `spawn` stream through `spawnEnemy` (their first action timer), which is deterministic.

## Rooms (D16)

The host alone runs the Director. `WorldFrame` gains `sites` and `darkness`, and enemies a `champion` flag; the snapshot carries them (`SNAPSHOT_FORMAT` 6, which changes the room version). The HUD snapshot carries `encounters` and `boons` per player; announcements and `encounter`/`boon` events go in the frames. Stepping into a shrine or altar is any living god's position on the host, so guests need no new message.

## Presentation

- Effects `marks`: rift (violet, turning, growing), arrival (red pulse with "!"), shrine (gold pillar of light), altar (violet with a turning ring); champions get a violet ring and light. Pointers at the screen's edge for rifts, arrivals, shrines, altars and champions. All above the light map (D13).
- `LightMap.setDarkness(d)` blends the ambient toward night violet, keeping at least 40% of the realm's ambient (D13: everything to react to is drawn above it anyway).
- Sounds reuse cues: warnings `elite`, outcomes `synergy` / `gate`, blessings `levelUp`, an escape `whoosh`.
- HUD: `encounters: HudEncounter[]` banner (name, objective, count, seconds, risk/reward), `boons: HudBoon[]` chips; announcements of kind `omen`.
- `?debug&director`: a panel polls `inspect().director` twice a second.

## Risks

- Encounters add monsters on top of the timeline: stages are capped (`maxCount`), invaders count against the global cap, and majors wait for low pressure.
- A weak party could meet a hunter it cannot kill: hunters escape on their own, so evasion is always a way out.
- Existing tests with full content now see encounters; the quiet fixture has none, and determinism tests still compare two equal runs.

## Decisions made while building

- **Markers count down their own time.** A marker's ring once mirrored its encounter's clock, which made an eclipse champion's arrival mark (4 s) read its eclipse's 50 s: each marker now keeps its own seconds.
- **A contract announces its acceptance before what it starts.** If the offered encounter finds no place, the contract is cancelled ("The offer is withdrawn"), with nothing given or taken.
- **An eclipse whose champion finds no room** (the monster cap) goes on without one and marks its arrival once.
- **Bundle budget.** The simulation already sat in an initial chunk (esbuild groups it with a symbol the main bundle imports); the Director adds about 28 kB to it, so the initial warning budget goes from 540 to 580 kB, as #54 did for the game server. The HUD's encounter list has its own component and stylesheet (`app-hud-omens`), so `hud.css` stays within its budget.
- **Debug starts** work in any phase but an ended run (a level-up round may be open when a test starts one).
