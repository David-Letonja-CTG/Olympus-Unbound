# Proposal

## Why

The owner asked (2026-10-20) for battle music that starts easy-paced and gets more action-packed, then more metal, then harder still as a run goes on, controlled by the game's audio settings. Today a run has sound effects only. Choices made with the owner: the music is composed in code (original by construction, D9, no downloads or licences), and four things raise it: time in the realm, realms cleared, the fight around the player, and bosses.

## What Changes

- **Adaptive battle music during runs**, composed and played by the game itself (Web Audio): synthesized drums, bass, distorted guitars, a lyre and a choir pad, in a dark D minor with a Greek colour.
- **Five tiers**, each moving up only at the end of a bar, so changes land on the beat:
  1. **Calm**: lyre and a soft frame drum, 88 BPM.
  2. **Stirring**: war drums and bass, 100 BPM.
  3. **Battle**: rock beat and power chords, 120 BPM.
  4. **Fury**: driving metal with double kick and palm-muted riffs, 140 BPM.
  5. **Titan**: the boss tier, fastest and heaviest with a choir, 160 BPM.
- **What raises it:** the share of the realm's time toward its boss, every realm cleared (each realm starts a notch higher, up to Fury), foes crowding around the player's god, and a boss awake (Titan). It eases back down slowly when the fight calms. In a room, every player hears music from their own god's surroundings.
- The music **ducks while paused**, plays on during upgrade choices and the shop, **fades out when the run ends**, and continues across realms through the gate.
- **Settings:** a *Music* volume slider next to *Sound effects*, in Settings and in the pause menu. It applies at once and is saved (save format 6; older saves get the default).

## Capabilities

### New Capabilities

- `music`: the battle music, its tiers and what drives them.

### Modified Capabilities

- `meta-progression`: the music volume setting (save format 6).

## Non-goals

- Music in menus, the intro or the summary (later, as more tiers of the same composer).
- Recorded or licensed music; per-realm themes.
