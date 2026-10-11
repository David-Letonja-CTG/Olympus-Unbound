# Product Vision

**OLYMPUS UNBOUND** — *Unleash the gods. Survive the divine war.* (working title and tagline)

A mythological horde-survival roguelite. The player is a god thrown into hostile mythological realms; ever-larger hordes attack; the god levels up, combines weapons, armour, relics and skills into synergies, faces elites and a realm boss, and earns rewards that unlock lasting progress. Every run builds differently. The goal is the thought *"one more run."*

## Pillars

1. **Immediate fun** — moving and fighting feel good within seconds.
2. **Divine power fantasy** — from powerful to absurdly powerful within one run.
3. **Meaningful choices** — level-ups and combinations change how a run plays.
4. **Readable chaos** — hundreds of enemies and effects stay understandable.
5. **Replayability** — seeded arenas, varied builds, gods, enemies and rewards.
6. **Mythological identity** — each god and realm is distinctive.
7. **Maintainable architecture** — new content does not need core rewrites.
8. **Play together** — co-op rooms for up to four friends, joined by code, browser to browser (D16); couch co-op later.

## Audience and platform

Desktop browsers with keyboard or gamepad first; the game is a static web build (decision D1). Mobile/touch is a later consideration with its own controls, not a shrunk desktop UI.

## Long-term shape

```text
Choose a god (Zeus, Hades, …) → choose a realm (Olympus, Atlantis, Egyptian Underworld, Nordic realm)
→ procedural arena → horde combat → XP + gold → level-up choices → weapons / armour / relics → synergies
→ elites → boss → the gate to the next, harder realm → … until the party falls → rewards → meta progression → new builds → new runs
```

## Roadmap

| Phase | Content | Status |
|---|---|---|
| 0–5 Vertical slice | Zeus, Mount Olympus, 8 weapons, 4 armour, 6 relics, 16 skills, 7 synergies, 8 enemies, elites, the Cyclops, run summary, permanent upgrades, codex, settings | **Done** (`add-vertical-slice`) |
| 6 Content and polish | More weapons/relics, music, richer effects and animation, UI refinement, balance passes | Next |
| 6b Gods, realm and co-op | Hades, Poseidon, Athena; a painted realm and loading screen; co-op parties (difficulty per player) and online rooms by code | **Done** (`add-hades` … `add-coop-rooms`) |
| 7 Expansion | Atlantis and further realms and bosses; unlockable gods/realms; achievements; controller refinement; reviving allies, host migration; local co-op; mobile controls if prioritized | Later |

Each step is an OpenSpec change (see `CLAUDE.md`).
