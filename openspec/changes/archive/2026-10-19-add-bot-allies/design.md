# Design

## Seats and the run

- `PartySeat` gains `bot?: { skill: 'easy' | 'normal' | 'hard' }`. A solo run with allies is a `RunConfig` with `party` = the player, then the allies (names "Hades (bot)"). Everything co-op already does by party size applies unchanged: `partyScale`, spawn points per living god, revives, the gate, the run ending when every god has fallen.
- `RunSimulation.step` replaces the input of every bot seat with `botInput(state, player, brain)` before `updatePlayers`. Bots are part of the simulation, so solo runs, tests and the balance report all play them the same way (D5); a room's host would too, but rooms do not offer allies yet.
- `openChoiceIfPending` answers bot seats' choices at once with `botPick(state, player, choice, skill)`; the round then waits only for humans. Bots never join the merchant's shop queue.
- `RunResult` gains `bots` (bot seats in the party). `HudPartyMember` gains `bot`.

## The brain — `engine/sim/bots.ts`

Per bot a small `BotBrain { skill, next, move, dash, ability }` held by the simulation (not in `Player`, so snapshots are untouched). Every `rethink` steps (Easy 24, Normal 12, Hard 4) it recomputes the move from the state; between thinks it repeats it. The move is a sum of weighted pulls, the autopilot's approach extended:

1. away from enemies inside `danger` (scaled by their size; bosses count more);
2. toward the nearest enemy when none is inside the weapon range (`preferred` = the mean range of its weapons, at least 140);
3. toward the player when farther than the leash (260), strongly beyond 520;
4. out of hazards whose warning has started (Normal, Hard; Hard reacts to the whole warned area plus a margin);
5. toward nearby pickups (heal only when hurt);
6. toward a fallen god's spirit within 700 (revive), toward the open gate.

Dash (Normal, Hard): when an enemy is within contact distance or the bot stands in a hazard about to resolve, and stamina allows, toward the move. Ability: Easy whenever ready; Normal with three enemies within 220; Hard with five, or when below 40% health and any enemy is close.

`botPick`: Easy the first offer; Normal new weapons then weapon levels (`armsFirst`); Hard scores offers: level of a held weapon by its level and damage share, new weapons of its affinities, skills and relics that complete a synergy, heal when hurt.

## App

- `RunSetup.allies: signal<{ godId, skill }[]>`; `PlayScreen` builds `party` from it for solo runs. The Allies panel lives in god selection (add, choose god, choose difficulty, remove; at most three).
- Glory: `modeOf(players, bots)` → `coop` when humans > 1, `allies` when bots > 0, else `solo`. `HighScores.allies`; `ScoreEntry.bots` and `RunRecord.bots` (default 0). Save v5. The Hall gets a third tab; the run summary a line.
- Admin statistics: solo / with allies / co-op counts.

## Risks

- Bot quality: tuned with headless runs (the balance report can take allies later). The bot only needs to be a fair helper, not optimal.
- Cost: four gods' worth of weapons and enemies, as in co-op; bots think at most every 4 steps.
