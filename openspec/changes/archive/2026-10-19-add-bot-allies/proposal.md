# Proposal

## Why

The owner asked (2026-10-19) for gods played by the machine in solo play: "similar to co-op, just the gods are played by machine", added one by one, with the co-op rules ("harder with more"). Choices made with the owner: allies are added before the run; a run with allies has its own high-score table and does not count as co-op; each ally has a selectable difficulty.

## What Changes

- **God selection** gets an *Allies* panel: "+ Add an ally" adds one god at a time (up to three, so a party of four), each with its own difficulty (*Easy*, *Normal*, *Hard*) and a remove button. Any god may be an ally, the player's own god too.
- The run is a party, like a co-op room on one machine: the same difficulty per player (enemy health, spawn rate, enemies alive, boss health), each god with their own level-up choices, reviving fallen gods by standing beside their spirit, the run going on while any god lives, and the gate taking everyone. The loading screen and the party health panel show the allies, marked as bots.
- **The bots** play by rules in the simulation (deterministic, D5): stay near the player, fight at a range that suits their weapons, step out of telegraphs, dash out of danger, use their ability when foes crowd in, gather what lies near, revive fallen gods, go to the open gate, and choose their own upgrades. They leave the merchant to the player. Difficulty sets how often they rethink (reaction), whether they dodge telegraphs and dash, how they use the ability and how well they build.
- **Glory:** a run with allies goes to a third table, *With allies*, in the Hall of Glory. It never counts as co-op (co-op achievements still need real players). Other achievements and daily quests count as usual. The run summary says "with allies". Save format 5 adds the table.
- Admin statistics count runs with allies apart from solo and co-op ones.
- **HUD (owner request, same day):** the minimap moves to the top-right corner and the gold and kills plaque sits under it (it was the other way around).

## Capabilities

### New Capabilities

- `bot-allies`: adding allies, how they play, and their difficulty.

### Modified Capabilities

- `glory`: the *With allies* table and what counts as co-op.
- `meta-progression`: save format 5.

## Non-goals

- Allies in co-op rooms, or added during a run.
- Bots that shop, talk, or control the camera when the player has fallen (the camera follows the living party as in co-op).
