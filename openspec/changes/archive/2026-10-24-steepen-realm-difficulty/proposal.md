# Proposal

## Why

The owner reported (2026-10-23) that the second realm is far too easy: "on realm 2 I almost one hit all", bosses too. Headless runs with the bot confirm it:

- At the end of Mount Olympus the god takes about 3000–4000 damage a minute.
- In the second realm it takes almost none (0–150 a minute) for the first five minutes.
- A fresh enemy of the second realm has *less* health than one at the end of the first (32 against 250). Every realm restarts its clock, so its per-minute growth starts again at ×1, and the first realm's own growth (up to ×2.2) is more than the ×1.6 the second realm adds.
- The god arrives with a nearly finished build (level 40–50, most weapons at their top level). The second realm opens with its quiet first phase: 40 enemies and a trickle of spawns.

## What Changes

- **Compounding depth:** every realm cleared *multiplies* enemy health by 3 and enemy damage by 1.5, boss health by 2.4 and boss damage by 1.5, instead of adding a fixed fraction. Spawn rate and enemies alive rise by 25% per realm (was 12%).
- **Never weaker than before:** the health growth per realm is at least the most a realm's own per-minute growth reaches, so the first enemies of a new realm are never weaker than the last of the one before.
- **Head start:** every realm after the first opens 120 seconds into its spawn timeline (180 at most, from the third realm on). Its mid-game enemies, packs and spawn rate are there from the start. Its timed hordes, elites, boss time and merchant keep their own times.

The playable outcome: the second realm is a step up from the end of the first, the third is hard, and the run ends somewhere in the deep realms. That fits a run that lasts until death.

## Capabilities

### Modified Capabilities

- `endless-run`: difficulty by depth.

## Non-goals

- Changing the first realm's difficulty, the co-op scaling or the Director of Chaos.
- Scaling by the player's level or build: depth is a rule players can read and plan for. Measuring the build would punish good builds.
- New enemy types for deep realms.
