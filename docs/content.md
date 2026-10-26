# Content

All game content is typed TypeScript in `client/src/content/` (decision D4). The schema is `client/src/engine/data/types.ts`; `validateContent` (run by `run-simulation.spec.ts`) checks IDs and cross-references.

| File | Holds |
|---|---|
| `gods.ts` | gods with base stats, starting weapon, ability, passive, affinities |
| `weapons.ts` | weapons (behavior, element, base stats, per-level deltas, effects) |
| `items.ts` | armour, relics, skills, synergies, fusions, ascensions, instant blessings |
| `enemies.ts` | enemies and bosses |
| `events/` | seasonal events: one pack per event (realm, host, boss, items, shop, achievements) |
| `realms.ts` | realms: map generation, spawn timeline, events, scaling, elites, boss, rewards |
| `assets.ts` | external art manifest: files with licences, sprite key → frame/animation (D12) |
| `cutscenes/intro.ts` | the intro scene: actors, cues and captions (D14) |
| `chaos.ts` | the Director of Chaos: its balance, encounters and boons |
| `index.ts` | balance, permanent upgrades, and the assembled `CONTENT` |

## Conventions

- **IDs** are stable `snake_case` (`thunder_spear`). Saves, specs and tests use IDs, never display names. Never rename an ID that has shipped; add a save migration if one must go.
- **Display text** (`name`, `description`, level `text`) is English for now (D10).
- **Visuals** reference a sprite key; `engine/art/sprites.ts` draws it. A key without a painter falls back to a disc in `visual.color`. Icons for items are in the `ICONS` table there.
- **Balance numbers** live only here. Engine code holds no content-specific numbers.

## Checklists

**New weapon:** decide whose it is (`gods`: absent = every god; otherwise the IDs of the gods who may find it) → choose a behavior (`projectile`, `chain`, `orbit`, `nova`, `sweep`, `strike`) → add the definition with 5 level deltas, each with a `text` → add an icon (and a projectile sprite if it fires one) in `sprites.ts` → its sound: a cue in `engine/audio/sound-map.ts` (`ATTACK_SOUNDS`), made of recordings in `engine/audio/recorded.ts` (sound files listed in `content/assets.ts`) with a synthesized fallback in `sound-player.ts` → run the tests. A genuinely new way of attacking is a new behavior in `engine/weapons/behaviors.ts` with its own tests and an OpenSpec change.

**New enemy:** pick a behavior (`chaser` with optional `jitter`, `ranged`, `charger`, `summoner`) → add it to `enemies.ts` → add a painter in `sprites.ts` → add it to a realm's timeline or events.

**New instant blessing:** data with an `effect` (a new effect type is one rule in `INSTANT_RULES`), a `weight` and, for `gather`, `minLying`.

**New relic / armour / skill / synergy:** modifiers only (see the stat list in [systems.md](systems.md)); skills may require an element or behavior; synergies list requirements (`weapon`/`armour`/`skill` with optional `minLevel`, `relic`, or `element` with `count`).

**Co-op balance:** `balance.coop` in `content/index.ts` sets what each extra player adds (enemy health, spawn rate, enemies alive at once, boss health).

**New realm:** a `RealmDefinition` with `atmosphere` (ambient light ≥ 30% brightness, fog and particle colours), loading-screen `tips`, an optional `atmosphere.ambience` (`weather`, `lightning`, `clouds`, `glints` on water terrain, `smoke`, `wildlife`; view only, off on Low) and `sway` on tree and reed kinds, terrain types (each with an optional ground `texture`: `slabs`, `cobbles`, `cracks`, `ripples`, `ash`, `mud`, `grass`, `earth`, `moss`, with `size` and `strength`, and an optional `footing`: `speed` for every walker, `grip` for gods) and bands, obstacle kinds, `roads` (width, wander), points of interest (a `landmark`: one great obstacle kind on its own site, off the roads, with optional `ground` — its painter in `engine/art/landmarks.ts`; `ring` ruins, a `temple` landmark with column/fallen/altar/light kinds, `walls`, `cluster` groves, `plazaLights`, a `maze` of wall blocks — set `minObstacleGap` below a god's width, 28, so its walls block), `roads.thread` for a line along the road to the boss, scatter and decoration rules, `props` (breakable prop kinds, each `{ id, radius, visual }` with the shards' `color`, and `clusters`; painters in `engine/art/props.ts`; their drops are `balance.props`), `features` (hazards `vent`, `teetering` for an obstacle kind, `crusher` on the roads, and helpers `spring`, `brazier`; painters in `engine/art/features.ts`; at most 32 per arena), a timeline, events, scaling, elite multipliers, a boss and rewards → painters for its sprites → it appears in realm selection automatically.

**New achievement or daily quest:** an entry in `content/achievements.ts` (`ACHIEVEMENTS` or `DAILY_QUESTS`) with a `Goal` (measure, target, `run` or `total`, optional `god`, `mode`, `everyGod` for achievements) and its gold; an achievement also names an icon sprite. Validation checks IDs, gods and targets; quests may not ask for every god, and there must be at least three.

**New ware or companion:** `content/merchant.ts`. A ware of an existing kind (`companion`, `weaponLevel`, `heal`) is data: name, description, price, effect, icon. A companion is an existing rendered sheet with a warm `tint` and `scale` (D15), an `icon`, speed, `hunt`, `reach` and an `attack` (a weapon-like definition of any behavior but `orbit`; give its id a voice in `ATTACK_SOUNDS`), optionally `heal`. A new kind of ware (an armour upgrade, a relic, a reroll…) is one entry in `WARE_RULES` (`sim/merchant.ts`: its targets and how it applies) plus its effect type, with tests.

**New boss mechanic:** a boss is data in `content/bosses.ts`: phases (attacks, `speedMultiplier`, `pauseMultiplier`, `enraged`), and optionally `parts` (heads, tentacles: place, attacks, pause, delay, health, order, regrow, zone, fromPhase), `guard`, `exposed`, `chargeStun`, `anchored`. Attacks: `slam`, `boulder`, `charge`, `summon`, `sweep`, `lash`, `walls` (parts may not charge, summon or raise walls). A genuinely new kind of attack is a new case in `placeAttack` (`bosses/boss.ts`) with its warning shape and tests.

**New encounter for the Director of Chaos:** an `EncounterDefinition` in `content/chaos.ts` using one of the behaviors — `invasion` (stages, elite, stage gap, time limit, stage cap; enemies default to the realm's current spawn phase), `eclipse` (seconds, enemy speed and spawn-rate multipliers, darkness, champion), `hunt` (health and speed multipliers, escape time, slam/boulder/lash attacks, pause, titles by element), `shrine` (boons, seconds, radius, distance), `contract` (the encounter it offers, which must be `offered: true`, risk text, bonus). Give it `name`, `objective` and `announce` (`{where}` and `{hunter}` are filled in), `major` (big threats warn at least 1 s), `telegraph`, `weight`, `cooldown`, `perRealm`, `from`, optional `realms`, `minDepth`, `pressure` band, `requires` (corruption, max corruption, grudge, elites slain) and `tags` (`relief`, `durable`, `movement` for the adaptive rules), and every ending its behavior reaches (`ENCOUNTER_ENDINGS`: text with `{boon}`, `success`, optional reward — gold, chest, boon, heal — and realm-state changes). `validateContent` checks all of it. A genuinely new kind of encounter is one entry in `ENCOUNTER_BEHAVIORS` (`engine/chaos/behaviors.ts`: begin, warn, start, update, cleanup, hud) plus its content type and endings, with tests; the Director itself does not change. **New boon:** id, name, description, seconds, modifiers, `relief` for defensive ones, an icon in `ICONS` (`boon_*`), and a shrine or reward that grants it.

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

### Fusions

Offered once every requirement is met; modifiers stack per level. Tier II needs tier I at its top, tier III all of tier II.

| ID | Tier | Requires | Per level | Levels |
|---|---|---|---|---|
| `hunters_volley` | I | `divine_bow` 6 + `multishot` 2 | +1 pierce, +10% projectile speed, +10% physical | 3 |
| `forge_of_hephaestus` | I | `flaming_sword` 6 + `war_hammer` 6 | +15% fire, +15% physical, +5% area | 3 |
| `titans_hide` | I | `vitality` 4 + `bulwark` 3 | +25 health, +1 armour, +0.3 regen | 3 |
| `sandals_of_hermes` | I | `swiftness` 3 + `magnetism` 3 | +5% speed, +20% magnet, +5% XP | 3 |
| `oracle_of_delphi` | I | `wisdom` 3 + `precision` 3 | +4% crit chance, +15% crit damage | 3 |
| `grace_of_chronos` | I | `haste` 4 + `persistence` 3 | −4% cooldown, +10% duration | 3 |
| `sky_father` (Zeus) | I | `thunderbolt` 6 + `storm_caller` 4 | +20% lightning, −3% cooldown | 3 |
| `lord_of_the_dead` (Hades) | I | `soul_scythe` 6 + `bident` 6 | +20% shadow, +1% lifesteal | 3 |
| `wrath_of_the_deep` (Poseidon) | I | `trident` 6 + `thunder_spear` 6 | +12% physical, +12% lightning, +1 pierce | 3 |
| `strategos` (Athena) | I | `spear_of_athena` 6 + `lightning_orb` 6 | +12% physical, +8% area, +1 armour | 3 |
| `wrath_of_the_twelve` | II | `forge_of_hephaestus` 3 + `hunters_volley` 3 | +12% damage, +20% crit damage | 2 |
| `ichor_of_the_immortals` | II | `titans_hide` 3 + `grace_of_chronos` 3 | +40 health, +0.8 regen | 2 |
| `eyes_of_olympus` | II | `oracle_of_delphi` 3 + `sandals_of_hermes` 3 | +10% damage, +10% XP, +5% crit chance | 2 |
| `apotheosis` | III | all three tier II at 2 | +25% damage, −5% cooldown, +10% area, +50 health | 1 |

**New fusion:** data plus a crest in `FUSION_CRESTS` (`engine/art/sprites.ts`: its glyphs, tier and colour): requirements (synergy types plus `fusion` with `minLevel`), a tier one above its highest fusion requirement, per-level modifiers. Validation checks ids, top levels and tiers.

### Evolutions

A weapon at level 6 with the relic below evolves once (weight 3.5): one more step of numbers, a gilded icon, and a **splash**: every hit also strikes the foes within the radius of its target for the given share of the weapon's damage (through the damage pipeline; the burst's own strikes never splash).

| Evolution | Weapon + relic | Step | Splash |
|---|---|---|---|
| `spear_of_olympus` | `thunder_spear` + `zeus_eye` | +10 damage, +1 pierce | 70, 50% |
| `keraunos` | `thunderbolt` + `zeus_eye` | +14 damage, +2 jumps | 80, 45% |
| `orbs_of_the_aether` | `lightning_orb` + `eye_of_horus` | +2 orbs, +6 damage | 55, 40% |
| `bow_of_apollo` | `divine_bow` + `trident_fragment` | +2 arrows, +8 damage, homing 2 | 60, 45% |
| `trident_of_the_abyss` | `trident` + `trident_fragment` | +12 damage, +2 pierce | 75, 50% |
| `hammer_of_hephaestus` | `war_hammer` + `golden_fleece` | +20 damage, +40 quake | 60, 35% |
| `phoenix_blade` | `flaming_sword` + `phoenix_feather` | +14 damage, +0.6 arc | 65, 50% |
| `scythe_of_thanatos` | `soul_scythe` + `soul_lantern` | +12 damage, +30 reach | 60, 45% |
| `bident_of_tartarus` | `bident` + `soul_lantern` | +16 damage, +40 reach | 70, 50% |
| `spear_of_pallas` | `spear_of_athena` + `eye_of_horus` | +12 damage, +2 pierce | 70, 50% |

**New evolution:** data in `content/weapons.ts` (`EVOLUTIONS`: weapon, requirements, `upgrade` like a level, `splash`) plus an `evolved_*` crest (tier 0) in `FUSION_CRESTS`. One per weapon.

### Ascensions

No top level; offered only when fewer than three other upgrades remain (weight 1 each): `ascend_might` +5% damage, `ascend_vigour` +15 health and +0.2 regen, `ascend_celerity` −2% cooldown and +2% speed, `ascend_fortune` +5% gold and XP.

### Seasonal events

`content/events/` keeps each event in one file exporting an `EventPack`: its `EventDefinition` (id, name, tagline, `window` `MM-DD`, accent colour, `currency` with its picture `sprite`), its realm (`event` set: outside the chain), its host and boss, its weapons and relics (`event` set: offered only in its runs), its shop rewards and its achievements (`goal.realm`). `content/events/index.ts` lists the packs in calendar order; `content/index.ts` merges them into the lists, event realms last. `content/events/shared.ts` has the boss attack builders, the event realm `MAP_FRAME`, `hostRealm` (the eight-phase timeline, hordes and elites from four monster ids: fodder, quick, ranged, heavy; the boss at 7 minutes), `eventShop` (a blessing at 40, the relic at 60, the weapon at 80) and `eventAchievements` (clear the realm, 400 gold; last 10 minutes from it, 250). Validation checks the dates, the event ids and that a realm outside events remains; tests check that no two windows overlap and that every month has an event.

| Event | Window | Realm | Host | Boss | Items |
|---|---|---|---|---|---|
| `longest_night` | 12-15 – 01-05 | `starlit_wood` | `oneiros` (shade), `nightmare` (fury), `star_bearer` (lampad, ranged), `wolf_of_night` (orthrus, charger) | `nyx` (siren ×2.3, 0x8c84ff): guard 0.35 while `hypnos` (slowing zone 150, no damage) or `thanatos` (1,700 health, regrow 20 s) lives | `stars_of_nyx` (orbit, shadow, slow), `veil_of_nyx` |
| `winds_of_boreas` | 01-10 – 01-31 | `peaks_of_thrace` | `frozen_warrior` (curete), `snow_harpy` (harpy), `hyperborean_archer` (centaur, ranged), `frost_gigas` (cyclops, heavy) | `boreas` (Zeus ×2.3, 0xd0ecff): charges, `chargeStun` 2 | `breath_of_boreas` (projectile, physical, pierce, slow), `cloak_of_boreas` |
| `festival_of_eros` | 02-07 – 02-21 | `garden_of_aphrodite` | `lovestruck_satyr` (satyr), `erote` (siren ×0.8), `siren_of_paphos` (siren, ranged), `phobos` (minotaur, charger) | `eros` (siren ×2.2, 0xffd8e4): guard 0.25 while `golden_arrow` or `leaden_arrow` (1,500, regrow 16 s) lives; exposed 6 s ×1.8 | `arrows_of_eros` (chain, physical, stun), `girdle_of_aphrodite` |
| `apples_of_hesperides` | 03-10 – 03-24 | `garden_of_hesperides` | `golden_serpent` (serpent), `hesperian_harpy` (harpy), `hesperid` (naiad, ranged), `garden_colossus` (sentinel, heavy) | `ladon` (hydra ×1.75, 0xe0d860): `anchored` 170, five attack-only heads (two from phase 2) | `apple_of_discord` (strike, physical), `burden_of_atlas` |
| `revels_of_pan` | 04-01 – 04-14 | `woods_of_arcadia` | `revelling_satyr` (satyr), `paniskos` (satyr ×0.85), `dryad` (naiad, ranged), `silenus` (satyr ×1.6, heavy) | `pan` (satyr ×2.4, 0xd8a070): four attack-only echoes `from: 'arena'` | `pipes_of_pan` (sweep, shadow, knockback), `reeds_of_syrinx` |
| `hunt_of_artemis` | 05-01 – 05-14 | `forest_of_calydon` | `curete_raider` (curete), `hunting_hound` (orthrus ×0.85), `nymph_of_artemis` (lampad, ranged), `wild_centaur` (centaur, charger) | `calydonian_boar` (orthrus ×2.6, 0x7a5a48): charges, `chargeStun` 3 | `moonbow_of_artemis` (projectile, physical, crit), `hide_of_the_boar` |
| `midsummer_of_apollo` | 06-15 – 06-28 | `slopes_of_delphi` | `python_spawn` (serpent), `sunbird` (Stymphalian bird), `mad_pythia` (fallen oracle, ranged), `tripod_guardian` (bronze guardian, heavy) | `python` (serpent ×4, 0xa0b050): `devour` coils | `rays_of_apollo` (projectile, fire, burn), `lyre_of_apollo` |
| `theft_of_fire` | 07-01 – 07-14 | `peaks_of_caucasus` | `ash_shade` (shade), `cinder_harpy` (harpy), `kabeiros` (ally smith, ranged), `forge_cyclops` (cyclops, heavy) | `caucasian_eagle` (Stymphalian bird ×2.6, 0xd8a060): guard 0.4 while any of three stolen fires (`from: 'arena'`, 1,400, regrow 22 s, zone dps 10, slow 0.25) burns | `stolen_fire` (chain, fire, burn), `fennel_stalk` |
| `stars_of_perseus` | 08-06 – 08-19 | `isle_of_gorgons` | `gorgon_brood` (serpent), `stone_lamia` (lamia), `graea` (fallen oracle, ranged), `petrified_hero` (sentinel, heavy) | `medusa` (lamia ×2.4, 0x9ae0a0): guard 0.2 while `stheno` or `euryale` (ordered, 1,600, regrow 18 s) lives; exposed 7 s ×1.6 | `shield_of_perseus` (nova, physical, stun), `winged_sandals` |
| `vintage_of_dionysus` | 09-15 – 09-28 | `vineyards_of_naxos` | `tyrrhenian_pirate` (drowned sailor), `panther_of_dionysus` (orthrus ×0.9), `bacchant` (siren, ranged), `drunken_centaur` (centaur, charger) | `dionysus` (Hades ×2.3, 0xd8a0f0): guard 0.3 while either panther (2,600, no regrow) lives | `thyrsus` (orbit, physical, slow), `cup_of_dionysus` |
| `night_of_hecate` | 10-24 – 11-07 | `crossroads_of_hecate` | `restless_dead` (shade, 0xa8ffc8), `empusa` (lamia, 0xff8ad0), `lampad_of_hecate` (lampad, 0xffb060, ranged), `hound_of_hecate` (orthrus, 0x7a9a8a, charger) | `hecate` (snake priestess ×2.3, 0xd0c0ff): guard 0.35 while any of three torch parts (1,600 health, regrow 18 s) lives | `hecates_torches` (orbit, fire, burn), `key_of_hecate` |
| `hunger_of_erysichthon` | 11-16 – 11-30 | `grove_of_demeter` | `famished_shade` (shade), `famine_crow` (Stymphalian bird), `priestess_of_demeter` (snake priestess, ranged), `famished_giant` (cyclops, heavy) | `erysichthon` (ally warrior ×2.5, 0xe0c898): charges (`chargeStun` 1.5); phase 2 `devour` | `sickle_of_demeter` (sweep, physical, life steal), `cornucopia` |

Currencies (2% of kills, 3 per elite, 15 from the boss): star shards, hailstones, roses, golden apples, painted eggs, silver arrowheads, laurel leaves, embers, meteor stones, grapes, honey cakes, wheat sheaves. Shops: `starlight` (+5% area), `north_wind` (+4% speed), `aphrodites_favour` (+10 health), `hesperides_gift` (+8% gold), `arcadian_spring` (+0.3 regen), `huntress_eye` (+3% crit), `midsummer_sun` (+3% damage), `forethought` (+15% pickup range), `starfall` (+10% critical damage), `good_vintage` (+1% life steal), `harvest_home` (+5% gold and XP), each 40, then each event's relic (60) and weapon (80); Hecate's: `hecates_blessing` (+5% XP, 40), `keykeeper` (60), `torchbearer` (80), `ward_of_the_crossroads` (+1 armour, 120). Lamps in the snow realms shine at about half strength, since the snow throws light back.

**New event:** a pack in `content/events/` (recoloured sheets in `assets.ts`, code-drawn trees, props, pickups and missiles in `engine/art/seasonal.ts`, a landmark in `engine/art/landmarks.ts`, D15) listed in `content/events/index.ts`, a window that overlaps no other, and a sound for its weapon in `ATTACK_SOUNDS`.

### Instant blessings

Offered at a level-up or chest like any upgrade, used at once, never kept, offered again whenever valid. One rule per effect type in `progression/instants.ts` (`INSTANT_RULES`).

| ID | Effect | Offered when | Weight |
|---|---|---|---|
| `call_of_hermes` | `gather` `xp`: every XP gem flies to the nearest god | ≥ 40 XP gems beyond every god's magnet | 1.4 |

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

A sprite in the manifest may name a `recolor`: the game multiplies a copy of its sheet by that colour once at load (keeping transparency, so status tints still show) and recolours its menu portrait too. Mount Othrys's cast is built this way from existing sheets: `titan_soldier` (bronze guardian, 0x8a5a44), `gigas` (Cyclops, 0x8a849a), `ker` (Fury, 0xff5a5a), `kampe_scorpion` (giant crab, 0xc0402a) and `kronos` (marble sentinel ×2.9, 0xd8a84a).

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

## Balance notes (2026-10-23, endless runs)

`balance.endless`, per realm cleared (health and damage compound):

| Factor | Value |
|---|---|
| Enemy health | ×3 |
| Enemy damage | ×1.5 |
| Spawn rate | +25% |
| Enemies alive at once | +25% |
| Boss health | ×2.4 |
| Boss attack damage | ×1.5 |
| Spawn timeline head start | 120 s, at most 180 s |

The owner found realm 2 far too easy. With the old +60% a fresh realm-2 enemy had less health than the last of realm 1 (its own ×1.84 growth). The headless bot (god mode) took 3000–4000 damage a minute at the end of realm 1 and 0–150 in realm 2. With these values it takes 30–1000 in realm 2 and 150–6500 in realm 3. Health growth must stay ≥ every realm's `scaling.max` (content validation).

`balance.revive`: reach 70, 3 s, 50% health, 2 s invulnerable. Mount Olympus's `rewards.bossGold` is the old victory bonus, 250.

Headless checks (autopilot):
- **Strong build** (`might` +6, `maxHealth` +3,000, `armor` +8, `regen` +20): survives 60 minutes and reaches realm 8 on two seeds, so the gate and travel loop holds up over many realms.
- **No permanent upgrades:** the kiting bot falls around 01:30–03:00. It is a weak player, so these numbers set a floor, not the real pacing.

Tune with playtests once the new realms exist. Each realm adds its own timeline and scaling on top of these factors.

## Balance notes (2026-10-23, the Director of Chaos)

First encounter at 0:45 of a realm, then about one a minute: 20 s after any encounter, 50 s after a major one, with a 40 s ramp and the chance halved at full pressure. Majors only at pressure ≤ 0.5. Headless autopilot runs (Zeus, Hades, Poseidon, Athena, 1,000 s) saw 6–14 encounters, pressure averaging 0.3, and the Director's chests and gold let the (weak) autopilot survive as long or longer than with it off (Zeus 115–186 s against 125–175 s; Athena 182 s against 132 s). Invasion stages 10/14/10 (an elite last) in 75 s; hunters 1.6× (vengeful 2.6×, champions 3×) an elite's health, escaping after 60/75/90 s; eclipses ×1.18 speed and ×1.5 spawns for 50 s; blessings 30–40 s. Gold rewards grow by half per realm cleared, like the merchant's prices.

## Balance notes (2026-10-12, the Labyrinth)

The maze: cells of 5 blocks × 67 (335 units, about a quarter of the screen's width), 35% of the inner walls knocked down, 8% of blocks missing; `minObstacleGap` 18 so wall blocks (radius 24) leave 19 units, less than a god's 28. Enemies walk straight and slide along walls: wider corridors and more loops keep the horde coming; fewer make the realm easier to kite. Asterion: 18,000 health, 380 gold, phases at 60% and 25%.
