## Why

The cast moves stiffly: walks are 8 frames at 10 fps, idles and swings 4 frames, and the god never swings or casts on screen. And a god at level 30 with gilded armour and an evolved Keraunos looks exactly like the god at level 1. In a horde game the build is the fantasy; it should be visible on the god, to the player and to the rest of the room.

## What Changes

- **Smoother animation.** Every character sheet is re-rendered with an in-between frame between each of the current ones: 16-frame walks, 8-frame idles, swings and falls, played at twice the rate, so timing is unchanged. The god plays its swing when its ability fires, leans into a dash, starts its walk on a step, and is knocked back slightly when struck.
- **Armour on the god.** Each god has four looks, from bare to fully armoured. The look grows with the level of the armour the god wears in the run, and the armour piece's colour edges it.
- **The weapon in the hand.** Gods are rendered empty-handed. The god holds its strongest weapon (the highest level, earliest taken on a tie), drawn as its own layer in step with the body. An evolved weapon glows and leaves a trail on a swing.
- **Relics shown.** Each relic adds a small code-drawn mote that circles the god (up to 6).
- **The moment of change.** When the look improves mid-run, a column of light and a short cast pose mark it.
- **Boss trophies.** A laurel crown for a god who has beaten any boss with that god, a gold crown for one who has beaten Kronos.
- **Skins.** Recoloured looks per god, unlocked by achievements and chosen on god selection. Event shops can sell skins as rewards.
- **Previews.** God selection shows the chosen skin, and the codex shows each god's four looks.
- **Co-op.** Every player sees every god's look, skin and trophy.
- **Bosses in their final phase** show cracks and glowing eyes, and shed embers.
- Save format version 12: the skin chosen for each god.

## Non-goals

- No new models, rigs or new body types. All looks are built from the existing Flare and CC0 bases and the current render setup (D15).
- No art style change. Lighting, camera and outline stay as they are.
- Skins never change stats. Gear on the god never changes its hitbox.
- No combinations rendered per god × armour × weapon. Looks are layers plus recolours.
- No skins for enemies. No dyes or skin editor. No skins for sale for money.

## Playable outcome

A player starts a run as Zeus, bare and empty-handed except for the thunder spear. They take Aegis of Olympus and watch it build up to a crested helm and a gilded cuirass edged in its gold. They see their Keraunos glow after it evolves, and they see the room's Hades in his Hecate shroud. Every character moves at twice the frame count.

## Capabilities

### New Capabilities
- `god-appearance`: what a god looks like in a run (armour looks, held weapon, evolution glow, relic motes, the change moment, trophies, skins, previews).

### Modified Capabilities
- `asset-pipeline`: character sheets with in-between frames, empty-handed god sheets, weapon layers, and per-frame head anchors.
- `player-control`: the swing, dash lean, walk start and knockback on the god.
- `co-op`: the room sees every player's look.
- `boss-encounter`: the final-phase look.
- `seasonal-events`: skins as event shop rewards.
- `meta-progression`: save format version 12 with the chosen skins.

## Impact

- `art/blender/`: the frame step in `flare_render.py`, empty-handed god scripts, weapon layer scripts, export of head anchors; one re-render of the cast. Needs Blender and the Flare sources (`FLARE_SOURCES`).
- `client/scripts/pack-sheet.mjs` and `client/src/content/assets.ts`: doubled frame ranges, look sheets, weapon layers.
- Engine: a pure function that derives a player's look; snapshot fields; the Phaser world view draws the layers. No change to the rules.
- App: skin choice on god selection, looks in the codex, save v12 with migration.
- Download size and texture memory grow. Sheets load only for the gods in the run (see design).
