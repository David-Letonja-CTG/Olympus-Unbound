# Proposal

## Why

The dark-fantasy presentation made the asset pipeline pluggable, and the first pack (the Flare Skeleton Warrior as the Corrupted Hoplite) showed how much pre-rendered art lifts the game above the code-drawn figures. The owner wants every character drawn that way, from **one collection** so the cast looks consistent, with **monsters from Greek mythology** and **gods that look like gods**. No collection, free or paid, has our Greek roster or a Zeus in a dark pre-rendered style. The Flare collection on OpenGameArt does publish its Blender sources (heroes, a troll, a horse) under CC-BY 3.0, rendered with one camera and light setup. So this change builds the cast ourselves in Blender from those sources, in Flare's exact render setup: one look, our own designs, every creature from Greek myth.

The owner also noticed characters "lagging" while walking: the walk cycles play at a fixed rate, so a fast figure's feet slide (Zeus moves ~200 px/s on a cycle timed for half that).

## What Changes

- **A rendered Greek cast.** Blender scripts in `art/blender/` turn Flare's models into: **Zeus** (white chiton, gold, silver beard and laurel, storm sceptre), **Satyr** (horns, goat legs, thyrsus), **Harpy** (feathered wings, talons), **Stymphalian Bird** (bronze feathers and beak, modelled from scratch), **Centaur Archer** (Flare's horse with the hero's torso and longbow), **Fallen Oracle** (corrupted priestess of Delphi), **Marble Sentinel** (a living temple statue), **the Cyclops** (Flare's troll with one great eye), and the intro's three defenders. The Corrupted Hoplite (Flare's Skeleton Warrior) and the **Minotaur** (Flare's Minotaur) stay as Flare sheets; the Minotaur takes the charger role of the Bronze Bull (`bronze_bull` → `minotaur`, same numbers).
- **Reproducible art:** `art/blender/README.md` lists the sources and licences; `render-all.mjs` renders every character with Blender 4.5 and packs it with `client/scripts/pack-sheet.mjs` into `client/public/assets/olympus/`. Downloaded sprite sheets that a render replaces are removed.
- **Portraits:** menus (god selection, main-menu crest, realm boss, codex icons) show a character's sheet art instead of the code-drawn picture.
- **Walking that keeps pace:** each character's sheet has a stride (ground covered per walk cycle); the walk animation plays as fast as the figure actually moves, in runs and in cutscenes. Enemies turn to face only on a clear sideways heading, so they no longer flicker left and right.
- **Checks:** a unit test requires idle, walk and death animations for every character; `npm run assets:check` verifies that sheets tile into their frame size and that every animation frame exists.

**Playable outcome:** the intro and a run on Mount Olympus where Zeus fights satyrs, harpies, flocks of Stymphalian birds, skeletal hoplites, centaur archers, minotaurs, fallen oracles and marble sentinels, then the Cyclops, all pre-rendered in one style, animated, and walking without sliding.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `enemy-spawning`: the charger scenario names the Minotaur.
- `asset-pipeline`: scenarios use current sprite keys; characters must have animated sheet art, menus show it, and walks follow movement speed.

## Non-goals

- Balance changes, new behaviours, new enemies, gods or realms (Hades and other gods follow in later changes).
- Rendering the Minotaur and Skeleton Warrior ourselves (their Flare sheets already fit; a later change can).
- Using the other seven directions (the game only faces left and right).
- Share-alike (CC-BY-SA) sources.
