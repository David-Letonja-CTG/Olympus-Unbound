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

## Bosses — `engine/bosses/boss.ts`

The boss is an enemy with a `BossRuntime`: phases switch below health fractions (announced once). Between attacks it walks toward the nearest player, finding its way like other enemies, at `speed × phase.speedMultiplier` (an `anchored` boss stays within that distance of its arena's centre). Attacks rotate through the phase's list with `attackPause × phase.pauseMultiplier` between them: `slam` (circle around the boss), `boulder` (circles at and around the player, staggered), `charge` (marked lane, then a dash that hits on contact), `summon` (minions around the boss), `sweep` (`count` cones of `arc` toward the target, alternating ±arc/4, `gap` s apart), `lash` (a line from the attacker), `walls` (pillars of radius 24 every 40 units on each ring, `segments` arcs with `gapShare` open but every gap at least `2 × (boss radius + 24) + 24` between pillar centres; rings turned against each other unless the boss could not walk between two of them, then their gaps line up; standing walls sink as new ones rise). Hazards deal damage only to players inside them when the wind-up ends; walls become dynamic obstacles (`WorldCollision.setDynamic`) and push gods out. `phase.enraged` marks rage (drawn red).

**Parts** (`bosses/parts.ts`): each has its own attacks, `pause` (× the phase's multiplier) and `delay`, a place around the boss (turned with its facing) or around the arena's centre, and appears from `fromPhase`. Damageable parts (`health`) are monsters (`${boss}_${part}`, scaled like the boss, never capped) placed each step; a fallen part grows back after `regrow` s. Ordered parts: only the lowest living order takes damage (`guarded` → 0), it is `marked`. While a damageable part lives the boss takes `guard` × damage; with every damageable part down it is `exposed` for `seconds` (× `damageTaken`), then all grow back at once. A part's `zone` hurts gods inside `dps` (in 0.5 s ticks on the run clock) and slows them by `slow`. `chargeStun`: a charge touching a dynamic wall stops and the boss is `dazed` (no move or attack; ×1.5 damage taken). All multipliers live in `damageTakenMultiplier` (the one pipeline).

**Perfect dodge**: a boss hit (hazard resolving, charge contact) on a god whose dash cooldown is still above `dashRecovery − dashGrace` (dashing, or the grace right after) is a perfect dodge: no damage, `perfectDodge` event, the dash cost refunded, `surge = balance.perfectDodge.surge` (3 s) and +`damage` (30%) on every hit in `hitEnemy`; once per dash. Warnings flash in their last 0.25 s.

## XP, levels and offers — `engine/progression/`

```text
XP to next level (from L) = round(base + perLevel × (L − 1) + growth × (L − 1)²)     currently 5, 4, 0.3
```

Excess XP carries over; each threshold crossed queues one choice. Chests queue a choice without a level. Offers: every valid candidate (weapon level below max; new weapon if < 6 weapons; armour if none, else its next level; relic if < 4; skill below max and meeting its element/behavior requirement) gets a weight (`offerWeights`), × `affinity` (1.6) when its element matches the god's affinities or a held weapon. Three distinct offers are drawn with the `offers` RNG stream; with no candidates the fallback is heal + gold.

Synergies are checked after every change; each activates once, is announced, and adds its modifiers.

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

## Endless runs — `engine/sim/realms.ts`, `run-simulation.ts`

| Rule | Value |
|---|---|
| Realm order | content order from the starting realm, wrapping (`realmAt`) |
| Arena seed | the run's seed in the first realm, then `realmSeed(seed, depth)` |
| Realm time | timeline, events, boss time and per-minute scaling restart in every realm; the run clock (`time`) does not |
| Boss defeated | `realm.rewards.bossGold` added to the run's gold; a gate opens where the boss fell |
| Gate | radius 70; travels after a living god has stood in it for 2 s in a row, or 60 s after opening |
| Travel | pickups gathered (quietly), enemies/projectiles/hazards cleared, fallen gods (not left) raised at 50%, party placed on the plaza, new director |
| Depth `d` (realms cleared) | enemy health ×(1 + 0.6·d), damage ×(1 + 0.25·d), spawn rate and enemies alive ×(1 + 0.12·d), boss health ×(1 + 0.7·d), boss attack damage ×(1 + 0.25·d) (`balance.endless`) |

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
