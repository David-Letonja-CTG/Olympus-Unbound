# Proposal

## Why

The owner chose a new realm with Kronos (2026-10-24). Runs now go deep and the deeper realms are harder. A sixth realm gives the chain a fitting summit: the Titans' fortress, where the father of the gods waits. The owner chose to build its cast from the existing rendered sheets, recoloured and rescaled (no new renders, no downloads).

## What Changes

- **Mount Othrys**, the sixth realm: the Titans' fortress mountain.
  - Black basalt and bronze ruins under a storm-red sky, embers on the wind, fallen statues, braziers of the old gods.
  - It follows the Labyrinth in the chain; after it comes Mount Olympus again. Runs can start there.
- **Its host**, all from Greek myth, each recoloured from an existing sheet:
  - *Titan Soldier*: a chaser, from the bronze guardian in dark ember bronze;
  - *Gigas*, an earth-born giant: slow and very tough, from the Cyclops body in slate;
  - *Ker*, a death spirit: keeps its distance and throws blood-fire, from the Fury in crimson;
  - *Scorpion of Kampe*: charges, from the giant crab in red.
- **Kronos, Lord of the Titans:** a towering armoured king in dark gold, from the marble sentinel at nearly three times its size. His fight:
  - sweeps of his sickle;
  - the swaddled stone falling on the gods (boulders);
  - the walls of Othrys rising round him;
  - Titan Soldiers called to his side.
- **His signature: Devour.** Kronos opens his maw and drags every god within a wide ring toward him for a moment, then his jaws snap shut on a smaller circle round him. Both circles are telegraphed; a dash outruns the pull. This is one new reusable boss attack, `devour`.
  - Below 60% he devours, calls Titans and raises walls.
  - Below 25% "Time itself bends to Kronos": he moves faster and devours more often.
- **Recoloured sheets** (the art pipeline): a sprite in the manifest may name a `recolor`. The game bakes a recoloured copy of its sheet once at load, so status tints still show on top. Menu portraits are recoloured the same way.

## Capabilities

### New Capabilities

- `realm-othrys`: the realm, its host and Kronos.

### Modified Capabilities

- `boss-encounter`: signature mechanics gain `devour`.
- `asset-pipeline`: character art may be a recoloured sheet.

## Non-goals

- New renders or new model downloads (the owner's choice).
- A cutscene for Kronos.
- New music: the realm uses the shared score.
