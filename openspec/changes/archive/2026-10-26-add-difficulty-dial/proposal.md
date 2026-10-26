# Proposal

## Why

The owner (2026-10-26) played a seasonal event in quick mode for 12 minutes and, after 10, could let the game play itself: later realms were far too easy for a full build. They asked for two things. Realms should get harder after each one cleared, and the admin page should hold a difficulty setting. They chose for the setting to apply to **every player, live**, knowing it makes the game server hand out game numbers, against D1's "the server only shares".

## What Changes

- **Steeper growth per realm by default.** The first realm stays as it is. Each realm cleared now multiplies:
  - enemy health ×3.5 (was ×3) and damage ×1.65 (was ×1.5);
  - boss health ×2.8 (was ×2.4) and damage ×1.65 (was ×1.5);
  - spawns +35% (was +25%) and room +30% (was +25%).
- **A difficulty dial for every player** (D23). The game server keeps four multipliers, all 1 until set:
  - enemy health;
  - enemy damage;
  - spawn rate;
  - realm growth, extra compounding growth per realm cleared.
- **How games use it:** every game reads the dial when its main menu opens, keeps the last one for offline play, and applies it to every run a solo player or room host starts.
- **Admin page:** shows the dial and saves it with the server's admin token (the existing `ADMIN_TOKEN`).

## Capabilities

### New Capabilities

- `difficulty-dial`: the dial on the server, in every run, and on the admin page.

### Modified Capabilities

- `game-server`: it also keeps and hands out the dial.
- `endless-run`: the dial's realm growth compounds on top of the growth by depth.

## Non-goals

- Dynamic difficulty that reacts to how a player plays (rejected by D22).
- Per-player difficulty choices in the menus.
- Separate world boards per dial setting: the boards keep comparing runs as before.
