# Content

All game content is typed TypeScript in `client/src/content/` (decision D4). The schema is `client/src/engine/data/types.ts`; `validateContent` (run by `run-simulation.spec.ts`) checks IDs and cross-references.

| File | Holds |
|---|---|
| `gods.ts` | gods with base stats, starting weapon, ability, passive, affinities |
| `weapons.ts` | weapons (behavior, element, base stats, per-level deltas, effects) |
| `items.ts` | armour, relics, skills, synergies |
| `enemies.ts` | enemies and bosses |
| `realms.ts` | realms: map generation, spawn timeline, events, scaling, elites, boss, rewards |
| `assets.ts` | external art manifest: files with licences, sprite key → frame/animation (D12) |
| `cutscenes/intro.ts` | the intro scene: actors, cues and captions (D14) |
| `index.ts` | balance, permanent upgrades, and the assembled `CONTENT` |

## Conventions

- **IDs** are stable `snake_case` (`thunder_spear`). Saves, specs and tests use IDs, never display names. Never rename an ID that has shipped; add a save migration if one must go.
- **Display text** (`name`, `description`, level `text`) is English for now (D10).
- **Visuals** reference a sprite key; `engine/art/sprites.ts` draws it. A key without a painter falls back to a disc in `visual.color`. Icons for items are in the `ICONS` table there.
- **Balance numbers** live only here. Engine code holds no content-specific numbers.

## Checklists

**New weapon:** decide whose it is (`gods`: absent = every god; otherwise the IDs of the gods who may find it) → choose a behavior (`projectile`, `chain`, `orbit`, `nova`, `sweep`, `strike`) → add the definition with 5 level deltas, each with a `text` → add an icon (and a projectile sprite if it fires one) in `sprites.ts` → its sound: a cue in `engine/audio/sound-map.ts` (`ATTACK_SOUNDS`), made of recordings in `engine/audio/recorded.ts` (sound files listed in `content/assets.ts`) with a synthesized fallback in `sound-player.ts` → run the tests. A genuinely new way of attacking is a new behavior in `engine/weapons/behaviors.ts` with its own tests and an OpenSpec change.

**New enemy:** pick a behavior (`chaser` with optional `jitter`, `ranged`, `charger`, `summoner`) → add it to `enemies.ts` → add a painter in `sprites.ts` → add it to a realm's timeline or events.

**New relic / armour / skill / synergy:** modifiers only (see the stat list in [systems.md](systems.md)); skills may require an element or behavior; synergies list requirements (`weapon`/`armour`/`skill` with optional `minLevel`, `relic`, or `element` with `count`).

**Co-op balance:** `balance.coop` in `content/index.ts` sets what each extra player adds (enemy health, spawn rate, enemies alive at once, boss health).

**New realm:** a `RealmDefinition` with `atmosphere` (ambient light ≥ 30% brightness, fog and particle colours), loading-screen `tips`, terrain types and bands, obstacle kinds, `roads` (width, wander), points of interest (`ring` ruins, a `temple` landmark with column/fallen/altar/light kinds, `walls`, `cluster` groves, `plazaLights`, a `maze` of wall blocks — set `minObstacleGap` below a god's width, 28, so its walls block), `roads.thread` for a line along the road to the boss, scatter and decoration rules, a timeline, events, scaling, elite multipliers, a boss and rewards → painters for its sprites → it appears in realm selection automatically.

**New achievement or daily quest:** an entry in `content/achievements.ts` (`ACHIEVEMENTS` or `DAILY_QUESTS`) with a `Goal` (measure, target, `run` or `total`, optional `god`, `mode`, `everyGod` for achievements) and its gold; an achievement also names an icon sprite. Validation checks IDs, gods and targets; quests may not ask for every god, and there must be at least three.

**New god:** a `GodDefinition` (base stats, starting weapon, ability as a weapon-like definition, passive modifiers, affinities, sprite) → it appears in god selection automatically.

## Adding an asset pack

1. Check the licence is on the allow-list (CC0, CC-BY 3.0/4.0, CC-BY-SA 3.0/4.0, OFL, or a commercial licence you hold — keep the receipt reference) and that it fits [art-direction.md](art-direction.md).
2. Put the files in `client/public/assets/<pack>/`. Convert other formats to a PNG plus a Phaser/TexturePacker JSON atlas, or a uniform sprite sheet; record conversions in `notes`.
3. Add each file to `files` in `content/assets.ts` with `id`, `type`, `url` (and `data` for atlases, `frameWidth/frameHeight` for sheets) and its `licence` (name, author, title, source, notes).
4. Map sprite keys in `sprites`: `file`, the still `frame`, optional `animations` (`idle`, `walk`, `attack`, `death`: frames + fps), `scale` (so the figure matches the enemy's gameplay radius), `originY` (feet at the entity position, ≈ 0.85) and `faces`.
5. Run `npm run assets:check`, `npm test` (manifest validation) and look at the result in a run and in `/dev/art` (code-drawn fallbacks) — unmapped keys keep the code-drawn art. CC-BY credits appear on Settings → Credits.

## Authoring a cutscene

A `CutsceneDefinition` names its realm, arena seed, duration (the intro is 45–60 s), ambient light and lists `captions` (`at`, `duration`, `text`, `style` title/narration) and `cues`: `camera`, `fade`, `shake`, `spawn` (an actor with sprite key, position, scale, optional light), `move`, `remove`, `horde` (N actors from a point to a point), `strike` (lightning that also fells horde actors in its radius), `light`, `burst`, `sound`. Positions are relative to the arena's central plaza. `validateContent` reports unknown realms, cues or captions outside the duration, and actors used before they are spawned.

## The vertical slice's content

### Weapons

| ID | Gods | Behavior | Element | Notes |
|---|---|---|---|---|
| `thunder_spear` | Zeus, Poseidon, Athena | projectile | lightning | Zeus's start; pierces, may shock |
| `divine_bow` | all | projectile | physical | volleys, homing, high crit |
| `trident` | Poseidon | projectile | physical | Poseidon's start; 3-prong fan, pierce, heavy knockback |
| `lightning_orb` | Zeus, Athena | orbit | lightning | circling orbs, shock |
| `war_hammer` | all | nova | physical | shockwave when enemies are close, stun |
| `flaming_sword` | all | sweep | fire | arc toward the nearest foe, burn |
| `thunderbolt` | Zeus | chain | lightning | jumps between enemies, shock |
| `soul_scythe` | Hades | sweep (360°) | shadow | slow, 3% lifesteal |
| `bident` | Hades | sweep (narrow thrust) | shadow | Hades's start; long reach, slow, 3% lifesteal |
| `spear_of_athena` | Athena | projectile | physical | Athena's start; piercing javelin, high crit |

### Synergies

| ID | Requires | Grants |
|---|---|---|
| `storm` | 2 lightning weapons + `zeus_eye` | +25% lightning damage, +1 chain |
| `tempest` | `thunder_spear` + `trident` | +25% projectile speed, +1 pierce |
| `inferno` | `flaming_sword` lv 3 + `fury_of_flames` lv 2 | +30% fire damage, +10% area |
| `soul_reaper` | `soul_scythe` + `soul_lantern` | +4% lifesteal, +25% shadow damage |
| `divine_bulwark` | `aegis_of_olympus` lv 3 + `bulwark` | +3 armour, +40 max health |
| `wrath_of_the_sky` | `thunderbolt` lv 3 + `lightning_orb` lv 3 | attacks 10% faster, +40% crit damage |
| `earthshaker` | `war_hammer` lv 3 + `titans_strength` lv 2 | +20% area, +50% knockback |

### Enemies of Mount Olympus

| ID | Role (behavior) |
|---|---|
| `satyr` | basic chaser |
| `harpy` | fast, weaving chaser |
| `stymphalian_bird` | swarm unit (flocks; summoned by oracles) |
| `corrupted_hoplite` | tank chaser |
| `centaur_archer` | ranged |
| `minotaur` | charger |
| `fallen_oracle` | summoner |
| `marble_sentinel` | heavy tank |

Boss: `cyclops` (two phases; `ground_slam`, `boulder_throw`, `rampage_charge`, `call_the_legion`).

## Assets and licences

| Asset | Source | Licence |
|---|---|---|
| All sprites, tiles, icons except the characters below | Drawn in code (`engine/art/sprites.ts`, `engine/phaser/textures.ts`) | Original, project-owned |
| Synthesized sound effects (interface chimes, fanfares, wind-ups, and every cue until its recordings load) | Synthesized in code (`engine/audio/sound-player.ts`) | Original, project-owned |
| `client/public/assets/sounds/kenney/*.ogg` (impacts, stone, metal, punches, slices, coins, latch) | [Impact Sounds](https://kenney.nl/assets/impact-sounds) and [RPG Audio](https://kenney.nl/assets/rpg-audio) by Kenney, unmodified, a selection | CC0 (`LICENSE-kenney.txt` alongside) |
| `client/public/assets/sounds/spells/*.wav` (lightning, fire, ice, water) | [Basic Spell Impacts](https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx) by lentikula; cut, faded, normalized, 22 kHz mono | CC0 |
| `client/public/assets/sounds/thunder/*.wav` (thunderclap, thunder roll) | [Rain + Long Thunder](https://opengameart.org/content/rain-long-thunder) by WuxiaScrub; the thunder cut out, faded, normalized, 22 kHz mono | CC0 |
| `client/public/favicon.svg` | Drawn by hand (SVG) | Original, project-owned |
| `client/public/ui/*.svg` (frame, divider, stone grain) | Drawn by hand (SVG) | Original, project-owned |
| `client/public/assets/olympus/*.png` (Zeus, Hades, satyr, harpy, Stymphalian bird, centaur archer, fallen oracle, marble sentinel, Cyclops, intro defenders) | Rendered by this project in Blender (`art/blender/`) from [Isometric Hero and Heroine](https://opengameart.org/content/isometric-hero-and-heroine) by Clint Bellanger, [FLARE Model - Troll](https://opengameart.org/content/flare-model-troll) by VWolfdog, [FLARE Model - Horse](https://opengameart.org/content/flare-model-horse) by VWolfdog on [3D Horse](https://opengameart.org/content/3d-horse-rigged-laking-textures) by _canyon | Derivatives of CC-BY 3.0 works — credited in Settings → Credits |
| `client/public/assets/flare/skeleton.png` (`corrupted_hoplite`) | "Skeleton Warrior" by Clint Bellanger, [OpenGameArt](https://opengameart.org/node/3102); right-facing row re-packed | CC-BY 3.0 |
| `client/public/assets/flare/minotaur.png` (`minotaur`) | "Minotaur" by Clint Bellanger, [OpenGameArt](https://opengameart.org/content/minotaur); right-facing row re-packed | CC-BY 3.0 |
| `client/public/fonts/cinzel/Cinzel-wght.ttf` (display font) | Cinzel by Natanael Gama and The Cinzel Project Authors, [GitHub](https://github.com/NDISCOVER/Cinzel), unmodified | SIL OFL 1.1 (`OFL.txt` alongside) |

Characters come from one source and render setup (D15): `art/blender/README.md` lists the source models and how to re-render; `client/scripts/pack-sheet.mjs` packs renders (`--frames`) or a Flare sheet's row (`--row`) into the 8-column sheets the game loads. Per-file credits are in `content/assets.ts` and `client/public/assets/*/CREDITS.txt`. The code-drawn sprites remain as fallbacks.

Add a row for every external asset before it is committed. Never copy sprites, sounds, music or UI from other games.

## Balance notes (2026-10-10)

Tuned with headless autopilot runs (a kiting bot, no permanent upgrades, 6 seeds): the bot reaches level ~16 at 04:00 and wins about half its runs; deaths cluster around 04:00–05:00 when bulls (the bronze bull, now the minotaur with the same numbers), centaurs and hoplite hordes overlap; boss fights take 1.5–2.5 minutes including the Cyclops's walk from its arena. Victory runs earn ~1,200–1,450 gold, defeats ~150–200. Changes made: satyr/harpy damage 7/6 → 5/5, contact interval 0.8 → 1 s, XP curve per-level 5 → 4 and growth 0.35 → 0.3, bull damage 16 → 14, damage scaling 0.06 → 0.05/min, Cyclops health 20,000 → 12,000.

## Balance notes (2026-10-11, Hades)

First pass with the plain autopilot (always takes the first offer, 6 seeds, 9 minutes): Zeus dies at 02:50–03:45 in all six runs; Hades started stronger (lifesteal snowballed: two runs reached 09:00), so his lifesteal was trimmed — bident 4% → 3%, Gates of Tartarus 6% → 5%, passive 2% → 1.5%. Now five of six runs end at 02:50–03:35 and one survives, close to Zeus.

## Balance notes (2026-10-11, Poseidon)

Same autopilot probe: Poseidon first ended runs earlier than Zeus (two at 02:11), so he gained 10 health (135 → 145) and 1 armour. His runs now end at 02:12–04:10, mean 193 s against Zeus's 192 s.

## Balance notes (2026-10-11, Athena)

Autopilot probe (6 seeds; adding her spear to the pool changes everyone's first offers, so gods are compared within one probe): Athena first ended runs earlier than Zeus (mean 173 s vs 217 s), so she gained 10 health (125 → 135) and her spear 4 damage (22 → 26); now mean 185 s, median ≈187 s against Zeus's median ≈172 s.

## Balance notes (2026-10-11, endless runs)

`balance.endless`, per realm cleared:

| Factor | Value |
|---|---|
| Enemy health | +60% |
| Enemy damage | +25% |
| Spawn rate | +12% |
| Enemies alive at once | +12% |
| Boss health | +70% |
| Boss attack damage | +25% |

`balance.revive`: reach 70, 3 s, 50% health, 2 s invulnerable. Mount Olympus's `rewards.bossGold` is the old victory bonus, 250.

Headless checks (autopilot):
- **Strong build** (`might` +6, `maxHealth` +3,000, `armor` +8, `regen` +20): survives 60 minutes and reaches realm 8 on two seeds, so the gate and travel loop holds up over many realms.
- **No permanent upgrades:** the kiting bot falls around 01:30–03:00. It is a weak player, so these numbers set a floor, not the real pacing.

Tune with playtests once the new realms exist. Each realm adds its own timeline and scaling on top of these factors.

## Balance notes (2026-10-12, the Labyrinth)

The maze: cells of 5 blocks × 67 (335 units, about a quarter of the screen's width), 35% of the inner walls knocked down, 8% of blocks missing; `minObstacleGap` 18 so wall blocks (radius 24) leave 19 units, less than a god's 28. Enemies walk straight and slide along walls: wider corridors and more loops keep the horde coming; fewer make the realm easier to kite. Asterion: 18,000 health, 380 gold, phases at 60% and 25%.
