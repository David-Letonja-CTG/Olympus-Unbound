# Proposal

## Why

The owner asked for better sound effects in play (2026-10-12): weapons, skills, damage and the rest. The first sounds were single synthesized blips: many weapons shared one sound, the gods' abilities had none of their own, and nothing told you where a sound came from.

## What Changes

- **A richer synthesizer** (still all Web Audio, no files to license, D9):
  - voices layer oscillators and filtered noise with attack and decay envelopes, filter sweeps, a little drive for weight and slight detuning;
  - a generated room reverb on a send;
  - a limiter on the master, so a big fight never clips;
  - each play varies its pitch slightly, so repeats do not sound mechanical.
- **Where it happens:** sounds from the world are panned left or right by where they happen on screen, and are quieter the farther off-screen they are. Interface sounds (level-up, choices) stay centred.
- **More distinct cues:**
  - every weapon and every god's divine ability has its own sound;
  - hits sound by element (physical thud, lightning crackle, fire sizzle, shadow hiss);
  - kills are punchier; an elite's or a boss's death is heavier;
  - the player's own hurt is clear and low;
  - each boss attack kind has its wind-up (slam, falling stones, rush, summon) and lines resolve with a whoosh;
  - reviving, the gate opening and entering a new realm have their own cues;
  - the pickups, level-up, synergy and run-end fanfares are fuller.
- Bursts stay limited (the existing rule), now also per category, so the horde never drowns the player's own weapons.

## Capabilities

### Modified Capabilities

- `hud`: sound feedback (distinct cues per weapon, ability, element and boss attack; position on screen; no clipping).

## Non-goals

- Music.
- Recorded sound files.
