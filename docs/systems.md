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

A weapon with `gods` is only offered to those gods; without, to every god (`wieldableBy`, spec: run-progression / god arsenals). Content validation requires every god's starting weapon to be theirs and at least four weapons per god.

## Movement and stamina — `engine/sim/movement.ts`

`stepMovement` is shared by the host's players and a guest's prediction (D16). Walking: `moveSpeed`. Sprinting (held, moving): `moveSpeed × sprintMultiplier` while stamina > 0, draining `sprintDrain`/s; holding sprint while moving keeps stamina from refilling even when spent. Dash (held or tapped): needs `dashCost` stamina and no dash recovery left; moves `dashSpeed` for `dashDuration` along the stick (or the facing direction), colliding like walking; the player is invulnerable for `dashDuration + dashGrace` (the usual `invulnerable` timer, so the damage pipeline is unchanged); the next dash waits `dashDuration + dashRecovery`. Stamina refills at `regen`/s once nothing was spent for `regenDelay` s. All values in `balance.stamina` (max 100, regen 32, delay 0.7 s, sprint ×1.55 at 30/s, dash 35 for 0.18 s at 830/s, recovery 0.35 s, grace 0.05 s).

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

**Finding the way** (`enemies/navigation.ts`, spec: enemy-spawning / finding the way):
- **The field.** A flow field over the playable area in 32 px cells. A cell is blocked within an obstacle's or standing wall's radius + 16 px, which closes the seams between wall blocks and leaves breaches open. A shortest-path pass (costs 10 straight, 14 diagonal, no corner cutting; a bucket queue, linear time) from every living god's cell gives each cell its distance by path to the nearest god. It is refreshed at most every 6 steps, when a god changes cell, and at once when walls rise or sink (`WorldCollision.dynamicVersion`).
- **Walking.** A walker heads for the centre of its lowest open neighbour cell.
- **Sight.** A walker that *sees* its target walks straight instead. Sight is a line over the blocked cells, ≤ 900 px; a body wider than the clearance also tests two side lines. It is re-tested every 8 steps, staggered by id. With no way to any god, a walker goes straight.
- **Turning.** A walking enemy turns toward the heading it wants at 12 rad/s (an about-turn in about a quarter second) instead of snapping; a charger's wind-up and dash keep their line.
- **Bosses.** A boss uses its own field with clearance `max(16, 0.6 × radius)`, so it is not led through gaps its body cannot pass.

`chaser` (optional weave) · `ranged` (keeps 0.8–1.15 × preferred range, shoots on cooldown; arrows stop at obstacles; out of sight it comes round instead of holding its band) · `charger` (within trigger range of a target it sees: wind-up with a red lane, dash, recover, cooldown) · `summoner` (keeps distance, calls N minions on cooldown). Approaching uses the way; backing off and side-drift stay straight.

## Spawning — `engine/spawning/director.ts`

- The active phase is the last timeline phase whose `from` has passed. Regular enemies accumulate at `rate`/s (× `boss.spawnRateMultiplier` while the boss lives) and spawn while living regular enemies < `maxAlive`; packs (`groups`) arrive every `every` seconds.
- Spawn points lie on a rectangle `view + 70 px` around the players, inside the map, not in obstacles; up to 16 tries, else the spawn is skipped.
- Timed events (sorted): `horde` (a ring just outside the view) and `elite`. The boss spawns once in the boss arena at `boss.at`.
- Scaling at spawn: health × min(max, 1 + healthPerMinute × minutes), damage likewise. Elites: × health/damage/size/xp + gold.
- Regular enemies farther than 1700 from every player are moved back to the spawn ring once per second.
- Global caps: 400 enemies, 300 player projectiles, 120 enemy projectiles, 400 pickups (XP and gold beyond the cap merge into the nearest pickup of the same kind).

## The Director of Chaos — `engine/chaos/`

Values in `balance.director` (`content/chaos.ts`); encounters and boons are content (`ENCOUNTERS`, `BOONS`).

- **Observation** (`observe.ts`, every 0.5 s, reads only): factors, each 0–1 — *threat* = Σ weights of things within 460 of a living god (monster 1, elite or champion 5, boss 12, warned hazard 3, hostile missile 0.5) ÷ 70; *damage* = recent damage per second ÷ party maximum health (halved every 4 s) ÷ 0.06; *health* = 1 − party health share (fallen gods empty, gods who left ignored); *boss* = awake; *encounters* = 1 for an active major, 0.4 for any other active one.
```text
pressure = min(1, 0.45·threat + 0.35·damage + 0.3·health + 0.35·boss + 0.2·encounters)
```
  Also: kills per second over 30 s; *still* = every living god within 160 of one place for 20 s.
- **Pacing** (once a second): nothing within 20 s of the last start or end. Chance to start = min(1, (quiet − 20) ÷ 40) × (1 − 0.5·pressure), at least 5%, on the `chaos` stream. Pressure ≥ 0.72 for 10 s opens a 30 s **recovery**: no majors.
- **Eligibility** (each failure has a reason in the report): offered only by contracts; realm list; realm time ≥ max(`from`, 45); depth; cooldown (from its end); `perRealm`; not already under way; boss awake (only shrines); gate open; ≤ 2 running; majors: none running, not in recovery, 50 s after the last major ended, pressure ≤ 0.5; others ≤ 0.75 (relief: any); the encounter's own band; `requires` (corruption min/max, grudge, elites slain in the run).
- **Selection:** weight × 2.5 for the first tag whose signal holds (`relief`: recovery or health < 40%; `durable`: ≥ 4 kills/s with pressure < 0.4; `movement`: still), only if no adaptive boost decided a choice in the last 90 s; × 0.35 for the encounter chosen last.
- **Lifecycle:** `telegraph` (its warning) → `active` → `resolving` (2 s: the ending announced, its pieces cleared) → `completed` (a successful ending) or `failed`; `cancelled` from any of them. Other transitions are refused. The ending's reward and realm-state change apply once, on completing or failing. Passing a gate settles resolving encounters and cancels the rest; the boss's awakening cancels warnings (not shrines).
- **Rewards:** gold × (1 + 0.5·depth) as a gold pickup, a chest pickup, a boon for every living god, healing. A contract's bonus joins its encounter's successful ending.
- **Realm state:** corruption 0–100, grudge 0–2, clamped; +15 corruption entering each deeper realm.
- **Behaviors** (`behaviors.ts`, `ENCOUNTER_BEHAVIORS`): *invasion* — a rift beyond the view's corner (≥ 400 from the gods, clear of obstacles), stages of `count` × party room × depth room (≤ `maxCount`) from the current spawn phase around it, never within 170 of a god; the next stage when ≤ 25% of the current one lives or after `stageGap`; an elite of the realm last; `repelled` when all are dead, `overrun` at `timeLimit`. *eclipse* — darkness ramps in during the warning; while active `omen.enemySpeed` (walking speed, not the boss) and `omen.spawnRate`; the champion (an elite of the realm × `health`) after an arrival mark; `broken` when it dies, `endured` at the end (it escapes). *hunt* — one elite of the realm (those due by now, not summoners) × `health`, × `speed`, at its arrival mark (out of sight if a god stands there); attacks within 520 every `pause` s through `placeAttack` and stands still through each wind-up; `slain`, or `escaped` after `escapeAfter` s (removed: no kill, no drops); no room within 4 s cancels it. *shrine* — `distance` from a random living god (× 1.6 when still); the first living god inside blesses every living god (relief boons × 2.5 while struggling). *contract* — an altar; a living god inside accepts it (the offered encounter starts at once; if it cannot, the offer is withdrawn).
- **Boons:** modifiers through `collectModifiers`; receiving one held refreshes it; counted down by the step, removed with `refreshPlayer`.
- **Streams:** decisions, places, boon picks: `chaos`. Monsters it spawns also draw their first action timer from `spawn` (deterministic).

## Bosses — `engine/bosses/boss.ts`

- **Devour** (spec: boss-encounter / devour): two circle hazards at the boss, a warning-only pull ring (`pullRadius`) and the maw (`radius`, `damage`), both warned for `windup`. While the wind-up runs, every living god within the ring moves toward the boss at `pullSpeed` (never closer than half the maw); a dash (~900/s) outruns it. The maw strikes through the hazard as usual (perfect dodge applies).

The boss is an enemy with a `BossRuntime`: phases switch below health fractions (announced once). Between attacks it walks toward the nearest player, finding its way like other enemies, at `speed × phase.speedMultiplier` (an `anchored` boss stays within that distance of its arena's centre). Attacks rotate through the phase's list with `attackPause × phase.pauseMultiplier` between them: `slam` (circle around the boss), `boulder` (circles at and around the player, staggered), `charge` (marked lane, then a dash that hits on contact), `summon` (minions around the boss), `sweep` (`count` cones of `arc` toward the target, alternating ±arc/4, `gap` s apart), `lash` (a line from the attacker), `walls` (pillars of radius 24 every 40 units on each ring, `segments` arcs with `gapShare` open but every gap at least `2 × (boss radius + 24) + 24` between pillar centres; rings turned against each other unless the boss could not walk between two of them, then their gaps line up; standing walls sink as new ones rise). Hazards deal damage only to players inside them when the wind-up ends; walls become dynamic obstacles (`WorldCollision.setDynamic`) and push gods out. `phase.enraged` marks rage (drawn red).

**Parts** (`bosses/parts.ts`): each has its own attacks, `pause` (× the phase's multiplier) and `delay`, a place around the boss (turned with its facing) or around the arena's centre, and appears from `fromPhase`. Damageable parts (`health`) are monsters (`${boss}_${part}`, scaled like the boss, never capped) placed each step; a fallen part grows back after `regrow` s. Ordered parts: only the lowest living order takes damage (`guarded` → 0), it is `marked`. While a damageable part lives the boss takes `guard` × damage; with every damageable part down it is `exposed` for `seconds` (× `damageTaken`), then all grow back at once. A part's `zone` hurts gods inside `dps` (in 0.5 s ticks on the run clock) and slows them by `slow`. `chargeStun`: a charge touching a dynamic wall stops and the boss is `dazed` (no move or attack; ×1.5 damage taken). All multipliers live in `damageTakenMultiplier` (the one pipeline).

**Perfect dodge**: a boss hit (hazard resolving, charge contact) on a god whose dash cooldown is still above `dashRecovery − dashGrace` (dashing, or the grace right after) is a perfect dodge: no damage, `perfectDodge` event, the dash cost refunded, `surge = balance.perfectDodge.surge` (3 s) and +`damage` (30%) on every hit in `hitEnemy`; once per dash. Warnings flash in their last 0.25 s.

## XP, levels and offers — `engine/progression/`

```text
XP to next level (from L) = round(base + perLevel × (L − 1) + growth × (L − 1)²)     currently 5, 4, 0.3
```

Excess XP carries over; each threshold crossed queues one choice. Chests queue a choice without a level. Offers: every valid candidate (weapon level below max; new weapon if < 6 weapons; armour if none, else its next level; relic if < 4; skill below max and meeting its element/behavior requirement) gets a weight (`offerWeights`), × `affinity` (1.6) when its element matches the god's affinities or a held weapon. Instant blessings join the candidates with their own `weight` while their rule says they are worth it (`call_of_hermes`: ≥ `minLying` XP gems beyond every living god's magnet); taking one runs its rule and keeps nothing. Three distinct offers are drawn with the `offers` RNG stream; with no candidates the fallback is heal + gold.

Called pickups (`gather`) fly to the nearest living god at (520 + 2 × distance) units/s × a ramp from 1/6 to 1 over their first second, so they lift off visibly and gems across the realm still arrive in about 1–2 s.

Synergies are checked after every change; each activates once, is announced, and adds its modifiers.

Evolutions (spec: run-progression / weapon evolutions): a weapon at its top level, not yet evolved, with every requirement met, offers its evolution (weight `offerWeights.evolution`, 3.5). Taking it sets `WeaponInstance.evolution`: `resolveWeaponStats` adds its `upgrade` as one more level, the HUD shows its name and icon, and `hitSource` carries its `splash`. In `hitEnemy` a source with a splash strikes every other living enemy within the radius of the target (spatial hash) for `fraction` of the damage, with the same pipeline and no splash of its own, and emits `splash` once (bursts are drawn only while fewer than 90 effects live).

Fusions (`progression/tree.ts`, spec: run-progression / fusions): the first level of a fusion emits `fusionTaken` with its tier (a burst of 140 × tier; tier III: the `apotheosis` cue, a golden flash and a 900 ms shake). A fusion whose requirements all hold (`meetsRequirement`, which also knows `fusion` at a level) and whose level is below `maxLevel` is a candidate with weight `offerWeights.fusion` (3); taking it raises its level, and its modifiers stack per level. A god never sees a fusion or synergy needing a weapon it cannot wield (`comboReachable`, through fusions too). When fewer than `offerCount` candidates (instants not counted) remain, every ascension joins with weight `offerWeights.ascension` (1); ascensions have no top level. Every candidate carries `parts`: the locked reachable fusions and inactive synergies its item counts toward. `resultFor` lists the fusions held with their tiers (`loadout.fusions`); the save's codex discovers them (save v10), and glory goals measure `fusions` and `fusionTier`. `hud(playerId).build` holds skills, fusions, ascensions and the reachable tree with each requirement's have/need.

## Music — `engine/audio/music-*.ts`

Presentation only (no gameplay rule, D2). `musicIntensity` = 0.55 × min(1, realmTime / boss.at) + min(0.45, 0.15 × depth) + min(0.3, 0.3 × enemies within 420 of the local god / 40), capped below Titan; 1 while a boss is awake. `TierTracker` follows rises over ~1 s and falls over ~8 s; tier edges 0.2 / 0.4 / 0.62 / 0.95 with 0.06 hysteresis. Tiers (`music-score.ts`): Calm 88, Stirring 100, Battle 120, Fury 140, Titan 160 BPM, 4/4 over D minor – B♭ – C – A. `MusicPlayer` schedules each bar 150 ms ahead on the audio clock (the tier takes over at the bar), synthesizes kick, snare, hat, crash, frame drum, toms, bass, power-chord and palm-muted guitars (waveshaper + cabinet low-pass), lyre and choir, through a glue compressor and a limiter, with its own volume (`settings.musicVolume`, default 0.5). It ducks to 25% while paused and fades out over 2.5 s at the run's end; the session owns it, so it carries on when the scene restarts for a new realm.

**The Hall theme** (spec: music / the hall theme): `hallBarNotes` is a 16-bar loop at 76 BPM over D minor – B♭ – C – A – D minor – G minor – B♭ – A. It is a lyre melody over a softer lyre arpeggio and a choir pad; bars 8–15 add a frame drum and bass. `createMenuAudio` (`audio/menu-audio.ts`) plays it on its own `SoundPlayer`'s `AudioContext`, made on first use. `unlockOnGesture` (`audio/unlock.ts`, also used by every `SoundPlayer`) tries to resume a context on every key, pointer, mouse, touch-end or click until it runs: phones accept only the end of a touch, not its start. The same player gives the menus' controls their sounds (spec: hud / menu sounds): `menuSelect`, a soft pluck, and `menuConfirm`, two rising plucks for a `.btn-primary`. They play at `settings.sfxVolume`, never for a disabled control, and wait for the context to wake on the press that unlocks it. It fades in over 2 s and fades out with `end()`, then suspends. **Title screen** (spec: run-setup / title screen): `TitleGate` opens when the page has no user activation yet (`navigator.userActivation`) and a probe `AudioContext` would not run on its own. It stays closed under `navigator.webdriver`, and `?gate` forces it in any browser. `TitleScreen` shows above the router outlet until a pointerup, click or key (not Tab or Escape), then dissolves in 0.7 s. `IntroScreen` awaits `TitleGate.entered`. The app's `MenuSound` service plays it on every route but `/play` and `/intro`, at `settings.musicVolume`, and cues the controls from a capture-phase click listener.

## Bot allies — `engine/sim/bots.ts`

A `PartySeat` with `bot: { skill }` is played by `botInput` (its input replaces the slot's each step) and answers its choices at once with `botPick` (rounds wait only for players). Deterministic: it reads only the run's state (D5). Every `rethink` steps (Easy 24, Normal 12, Hard 4) a bot sums pulls: away from enemies within 210 (260/d² × size, bosses ×5), toward the nearest enemy within 700 when beyond its weapons' mean reach (140–420), back to the player beyond 260 (strongly beyond 520), out of warned hazards (Normal margin 10, Hard 40; Easy ignores them), toward pickups within 260 (heals only below 70%), toward fallen gods within 700, toward the open gate. Dash (Normal, Hard): an enemy in contact or a hazard landing within 0.45 s. Ability: Easy whenever foes are near; Normal with 3 within 220; Hard with 5, or below 40% health with any near. Picks: Easy the first offer; Normal new weapons then weapon levels; Hard scores offers (held weapons by level and damage share, affinities, synergy parts, healing when hurt). Bots never join the merchant's queue. Glory mode: `coop` when players − bots > 1, `allies` when bots > 0, else `solo`.

## Merchant and companions — `engine/sim/merchant.ts`, `companions.ts`

`balance.merchant`: arrivals at realm time 150 s and 330 s, stays 75 s, ring radius 60, appears 340 from a random living god (the `merchant` RNG stream; clamped into bounds, pushed out of obstacles). A god entering the ring joins `shopQueue`; when no level-up or chest round is due, a `shop` round opens for the first in the queue (`UpgradeChoice.source = 'shop'`, `gold`). Offers: per ware, one per target from `WARE_RULES[effect.type].targets` (companion: not owned and fewer than `maxCompanions` 3; weaponLevel: each weapon below max; heal: while hurt), price = round(price × (1 + 0.5 × depth)); then `leave`. Buying checks the gold now, applies the rule (whetstone = the level-up rule), and reopens the shop; Leave closes it. Passing a gate or the merchant leaving clears it and the queue.

Companions: follow at 46 behind their god (fanned by slot); hunt the nearest enemy within `hunt` of the god, stop at `reach` + its radius; fire `attack` through `WEAPON_BEHAVIORS` from a shallow copy of the god at the companion's position (stats resolved against the god's when firing; retry 0.1 s when nothing to hit); `heal` per second to the god; snap beside the god beyond 900; placed beside their god after travel; removed when their player leaves.

## Run phases — `engine/sim/run-simulation.ts`

`playing` → `choosing` (choice open) → `playing`; `pause()` from playing/choosing, `resume()` returns to the previous phase; `end(outcome)` once, from any phase (later calls are ignored). Choices carry an ID; answers for another ID or an invalid index are ignored. A run ends only in `defeat` (every god down) or `abandoned`; a boss that falls in the same step still counts (its gold, a realm cleared).

## Co-op — `engine/sim/` (D11)

A run's `party` lists 1–4 seats (god, name, the player's own permanent upgrades); each player has their own god, stats, ability, loadout and offers. XP and level are shared; a level-up or treasure opens a round with one choice per living player, and the run resumes when all have chosen. With `n` players, enemy health ×(1 + 0.65·(n−1)), spawn rate ×(1 + 0.5·(n−1)), enemies alive at once ×(1 + 0.5·(n−1)), boss health ×(1 + 0.9·(n−1)) (`balance.coop`). Spawns pick a random living player's view and reject any point inside any living player's view. `hud(playerId)` and `resultFor(playerId)` give each player's view; `hud().waitingFor` names the players a round still waits for. `leave(playerId)` takes a player out of the battle (not alive, never revived) and closes a round that only waited for them. A slot without input stands still.

**Local co-op** (`sharedScreen`): the human seats come first, then bots. After movement, `holdParty` (`sim/shared-screen.ts`) keeps each living local god within `maxSpread` of the others on each axis: the view's size ÷ 0.7 less a 150-unit margin on each side. Only movement outward that step is held back (to the god's previous position or the limit, whichever is further out), so nobody is dragged; bots and fallen gods are not held. The camera zooms to `min(1, view ÷ (spread + 2·150))`, never below 0.7, out at once and back in gently. Spawns keep the usual view, so with the camera fully out monsters may enter at the screen's edges.

**Reviving** (`sim/revive.ts`, `balance.revive`): a fallen god's `revive` grows by `dt / 3 s` while a living ally stands within 70 of the spirit, and drains at the same rate otherwise. At 1 the god rises with 50% health and 2 s of invulnerability. Players who left are never revived. Solo runs have no spirits.

## Seasonal events — `app/core/seasonal-events.ts` (spec: seasonal-events)

- An `EventDefinition` has a yearly `window` (`MM-DD` to `MM-DD`, inclusive, may wrap the new year). `SeasonalEvents.active` is the first event whose window holds the device's local date, unless the admin page's switch (`localStorage` `olympus-unbound/event-override`: `off` or `on:<id>`) says otherwise for that browser.
- Solo and local runs carry `RunConfig.eventId` (echoed in `RunResult.eventId`); a room's `start` message carries the host's. The Daily Trial and challenges carry none, and the Daily Trial never picks a realm with `event`.
- Weapons and relics with `event` are offered only when it equals the run's `eventId`; they do not count toward a god's arsenal. Realm lists show the active event's realm first and hide other event realms.
- `realmAt` chains only realms without `event`; from an event realm, depth `d` is `chain[(d − 1) % n]`.
- Goals may name a `realm`: only runs that started there count.
- **Currency** (`EventDefinition.currency`): in a run with `eventId`, every kill drops a `token` pickup by `chance` on the loot stream, elites `elite`, the boss `boss`; tokens are magnetic and add to `RunState.tokens` (`RunResult.tokens`). `applyRunResult` adds them to `save.eventTokens[eventId]` once. **Shop** (`eventRewards`): `modifiers` rewards join `permanentModifiers`; `unlock` rewards put their item in `RunConfig.unlocked` (a room uses its host's), so it may be offered in any run. **Event table:** `tableOf(r, content)` sends runs that started in an event realm to `highScores.event` (save v11); world boards count them by mode.

## Endless runs — `engine/sim/realms.ts`, `run-simulation.ts`

| Rule | Value |
|---|---|
| Realm order | content order from the starting realm, wrapping (`realmAt`) |
| Arena seed | the run's seed in the first realm, then `realmSeed(seed, depth)` |
| Realm time | timeline, events, boss time and per-minute scaling restart in every realm (spawn phases with the head start); the run clock (`time`) does not |
| Boss defeated | `realm.rewards.bossGold` added to the run's gold; a gate opens where the boss fell |
| Gate | radius 70; travels after a living god has stood in it for 2 s in a row, or 60 s after opening |
| Travel | pickups gathered (quietly), enemies/projectiles/hazards cleared, fallen gods (not left) raised at 50%, party placed on the plaza, new director |
| Depth `d` (realms cleared) | enemy health ×3^d, damage ×1.5^d, spawn rate and enemies alive ×(1 + 0.25·d), boss health ×2.4^d, boss attack damage ×1.5^d (`balance.endless`) |
| Head start | spawn phases are read at realm time + min(180, 120·d) s; events, the boss time, the merchant and per-minute scaling keep realm time |

## Rooms — `engine/net/` (D16)

| Parameter | Value |
|---|---|
| Frames (snapshot + events) | 20 Hz of real time, every guest |
| HUD | 10 Hz; every 10th also carries the guest's result so far |
| Guest input | every guest step (60 Hz); the host applies one per step, in order; more than 6 queued → the oldest are dropped down to 3 |
| Interpolation | drawn at newest − 100 ms; eased toward it, jumps when more than 250 ms off |
| Prediction | own god only, walking, sprinting and dashing by the host's rule (`stepMovement`); position and stamina corrected by the host's error at the acknowledged input; corrections eased (15% per frame kept), jumps beyond 64 px |
| Snapshot | positions i16 at ¼ px, IDs u32, flags and health ratio in bytes; under 20 bytes per entity (test) |
| Loading | the host starts when every guest has loaded, at most 60 s |
| Room code | 5 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; up to 4 members |

## Lighting and atmosphere — `engine/phaser/atmosphere.ts` (D13)

Each frame: clear the light map to the realm's `atmosphere.ambient`; add lights (priority: player 10, boss 8, strikes 6, elites 5, effects 3–4, braziers 2, projectiles 1); keep those overlapping the view, sorted by priority then distance to the view centre, up to the quality budget; stamp each as a radial falloff (≈ (1 − r)^2.2) tinted by its colour, additively; multiply the result over the world. Brazier flicker is two slow sines per brazier. Enemy copies above the darkness use the quality's `silhouette` opacity (Low 0.5, Medium 0.42, High 0.36; ×1.5 for elites and the boss).

## Cutscene timing — `engine/cutscene/timeline.ts` (D14)

Cues fire when `previous < at ≤ now` (the first frame includes `at = 0`). The camera eases (smoothstep) from where earlier camera cues left it to each cue's target over its duration; fades work the same way on visibility (0 black, 1 clear; a fade at 0 starts black). Captions are active for `at ≤ t < at + duration`. Positions are relative to the arena's central plaza.

## Landmarks — `generate-arena.ts`

After the roads, a `landmark` rule places its obstacle kind on `rng.fork('landmark')` (up to 120 tries): clear of the spawn, the boss arena and the sites (radius + 40), and of every road (radius + 12); `ground` is stamped round it without making a plaza; the site keeps walls and groves away.

## Breakable props — `generate-arena.ts`, `sim/props.ts`

Last in generation, on `rng.fork('props')`: `clusters` clusters of 1–3 props of one kind, each clear of obstacles, the spawn, the boss arena, road middles (a quarter of the width) and the other props, at most `MAX_PROPS` (32). They do not collide. Each step after movement, a living god within prop radius + god radius of a standing prop breaks it: bit `i` of `RunState.brokenProps` (reset each realm), a `propBroken` event (shards in the kind's `visual.color`, the `shatter` cue), and the drops of `balance.props` rolled on the run's `props` stream: gold 60% (4), XP 50% (3), heal 10% (20). Enemies never break props. The snapshot carries the mask as 32 bits (format 7).

## Footing — `maps/footing.ts`, `sim/movement.ts`

A terrain's `footing.speed` multiplies the walking speed of gods (`updatePlayers`, the guest's prediction) and walking monsters (`updateEnemies`; bosses and parts excepted) on its tile. `footing.grip` < 1 eases a god's walking velocity toward stick × speed by `1 − (1 − grip)^(60·dt)` a step, kept in `driftX/driftY` from the real displacement (a wall stops a slide; under 1 px/s it stops). A dash ignores footing and leaves the god drifting along it. Grip 1 is the plain walk. Content: Marsh `bog` speed 0.8; Aegean `shallows` speed 0.8; Underworld `cocytus_ice` grip 0.06.

## Map hazards and helpers — `generate-arena.ts`, `sim/features.ts`

Placed after the obstacles, before the props, on `rng.fork('features')` (at most 32, 90 px apart): vents, springs and braziers on open ground (vents on their `terrain`); teetering columns among the rule's obstacle kind (`chance`, a fall `angle` that stays in the arena); crushers across a road, square to it, clear of the spawn and the boss arena. Each step after the hazards, `updateFeatures`:

- **vent / crusher:** while a god is within 900 px, count down; then a circle (vent, fire) or a line across the road (half the widest road + 34 px each side) hazard, `windup` warning, `damage × scaling().damage` to gods (a perfect dodge avoids it) and `monsters × max health` to non-boss monsters (`Hazard.monsters`, through `dealDamage`); next in `every` (+ windup) on the run's `features` stream.
- **teetering:** the first god within `trigger` sets its bit (fallen) and raises a line hazard `length` long along the fall; `featureSprung` (rumble, dust).
- **spring:** a wounded god inside heals `heal`/s from a `pool` (as regen, no event); empty, its bit (dry) is set for `refill` s, then the pool is full again.
- **brazier:** a god within 20 px sets its bit (lit, `featureSprung`, sparks); every `every` s a lit one burns monsters within `radius` (bosses and parts spared) for `burn × max health` per second, 3 s.

The bits are `RunState.features`, reset each realm; the snapshot carries them (format 8). The view leans a teetering column 0.12 rad, then shows its `stump` and `shaft`; dims a dry spring and its light; swaps a cold brazier for its `lit` sprite and light; closes a crusher's slabs as its telegraph runs out.

## Ambient life — `phaser/ambience.ts`, `phaser/wildlife.ts`

View only; the simulation never sees it and its randomness is cosmetic. `QualityProfile.ambience` scales it (Low 0: nothing is created; Medium 0.5; High 1); cloud shadows and sway are High only.

- **Weather:** one emitter over the view at `rate × ambience` per second, drifting on `wind`.
- **Lightning:** `Storm` flashes every `every` s: a view-wide light (priority 3) for 0.12 s, then 0.1 s, and the `rumble` cue 0.5–1.2 s later.
- **Clouds:** a fog tile sprite over the ground, MULTIPLY at `clouds`.
- **Glints:** 40/s × ambience tries at random view points, kept on `glints.terrain`.
- **Smoke:** 12/s × ambience from the fire lights in view (flicker ≥ 0.25, lit).
- **Wildlife:** a `Flock` of `count × ambience`, placed 260–520 px from the focus off obstacles; within 140 px of a god it flees for 1.4 s (birds and bats up the view) and is placed again 1–3 s later.
- **Sway:** `sway` radians on obstacle and decoration kinds.

## Painted ground — `engine/maps/ground.ts`

- Painted once per realm behind the loading screen (`GroundBuilder`), at 0.25/0.375/0.5 pixels per world unit (Low/Medium/High), then drawn as one image: no per-frame cost.
- Per pixel: the terrain band colour (blended over 0.035 of the noise at band edges), patches and grain, the terrain's pattern (`TerrainType.texture`, fading out across the blend; a detail noise at 26 units drives cracks, ripples, ash, mud and clumps), and the cliff face beyond the bounds. Roads, the thread and soft shadows are drawn on top.
- Measure with `node scripts/perf/phone.mjs` (`PERF_REALM`, `PERF_QUALITY`): it reports loading seconds and frame times.

## Arena generation — `engine/maps/generate-arena.ts`

Deterministic from `(map config, seed)`: terrain bands from two-octave value noise; a cliff border; marble plazas (spawn, boss arena ≥ `minDistanceFromSpawn` away, temple rings); obstacles via rejection sampling with `minObstacleGap`, clear zones and `maxObstacles`; decorations only on their terrain and never on obstacles; `plazaLights` rules then place light-bearing obstacles (braziers) evenly around every plaza, outside the spawn and boss-arena clear zones. Rendering (`engine/phaser/world-view.ts`) draws the terrain as one smoothed picture (one pixel per tile), round marble floors and y-sorted obstacles.

## Saves and rewards — `client/src/app/core/save/`

`SaveData v3 { version, gold, permanentUpgrades, discovered { weapons, armour, relics }, stats { runs, victories, kills, bestTimeSeconds }, settings { sfxVolume, screenShake, damageNumbers, enemyHealthBars, quality }, processedRunIds, introSeen }` (v3 added `enemyHealthBars`, migrated as on) under `localStorage['olympus-unbound/save']`. `parseSave` validates each field, clamps upgrade levels, drops unknown IDs, migrates older versions (`MIGRATIONS`), and refuses newer ones (fresh save). `applyRunResult` grants gold (half when abandoned; bosses' gold is already in the run's gold), discoveries and statistics once per run ID. `stats.victories` counts realms cleared (a victory of the old 7-minute runs was one realm cleared, so old saves stay right without a migration).

Migrations: v0 (unversioned) → v1 renames nothing; v1 → v2 adds `introSeen: false`; a missing or invalid `quality` takes the detected default (`detectQuality`: software renderer → Low, ≥ 8 cores → High, else Medium).

To change the save format: bump `SAVE_VERSION`, add `MIGRATIONS[oldVersion]`, extend `parseSave`, add tests for the old shape.

**v6** adds `settings.musicVolume` (default 0.5). **v5** adds `highScores.allies` and `bots` in score entries and run records (0 for older ones). **v4** (spec: meta-progression / save format version 4) adds `history` (last 100 `RunRecord`s), `highScores { solo, coop }` (10 each, best first), `achievements` (id → ISO date), `achievementProgress` (added-up goals), `achievementGods` (every-god goals) and `daily { date, progress, done }`; v3 → v4 adds them empty. Records are validated entry by entry (`save-records.ts`).

## Glory — `client/src/app/core/save/glory.ts`

`applyRunResult` applies `applyGlory` once per run ID. Score = kills + 2·seconds + 10·level + 1000·realms. Mode = co-op when `result.players > 1`. A `Goal { measure, target, over: run|total, god?, mode?, everyGod? }` reads `kills`, `timeSeconds`, `level`, `realmsCleared`, `gold`, `synergies` (count) or `runs` (1) from a `RunResult`; a run of another god or mode does not count. Achievements: `run` = this run's value ≥ target; `total` = lifetime sum; `everyGod` = every god has had such a run. Daily quests: `questsFor(date)` shuffles the pool with an LCG seeded by FNV-1a of the local date and takes the first three, skipping a second god-specific quest; `run` keeps the day's best, `total` adds the day's runs; another date starts empty. Gold from both is added to the save and to the run's total.

## Balance report — `engine/analysis/`

`BalanceReport(content, { gods, runsPerGod, minutes, realmId })` queues runs (god × seeds 1…n, no modifiers); `advance(steps)` plays them with `autopilot` and `armsFirst` choices; `rows()` averages realms cleared, level, kills, time, alive-at-end share and per-weapon taken share and damage share. The admin screen calls `advance(900)` per `setTimeout`.

## Game server — `server/` (D21)

- **Rooms:** messages are relayed unread (design: Rooms over WebSocket), and a room ends with its host.
- **Limits:** frames ≤ 256 KiB, ≤ 600 frames per 5 s per socket, ≤ 16 sockets per address, ≤ 8 guests per room. Seats stay the host's (4), and runs are limited to 30 per address per hour.
- **Open rooms:** public, unstarted rooms with a free seat and the same game version, fullest first, at most 50. Quick Play tries them in order, then opens a public room.
- **World boards:** the score is recomputed by the server (kills + 2/s + 10/level + 1,000/realm). Each run counts once (run ID).
- **Refused runs:** non-whole or negative figures; level 0 or above 400; more than 6 h; more than 60 kills/s; more than one realm per 90 s; 1–4 players with fewer bots than players (co-op needs 2 humans); names of 1–16 characters; snake_case ids; a daily date within a day of the server's.
- **Sending:** runs that enter a Hall table go to that board, and Daily Trial runs go to that day's board. Twisted challenges are not sent. Co-op runs are sent by the host.
- **Offline queue:** runs that could not be sent wait in `localStorage` (20 at most) and are sent at the next start. Refused ones (400) are dropped; unreachable, busy (429) and failed (5xx) ones are kept.
