# Proposal

## Why

The owner asked (2026-10-23) for **Director of Chaos 2.0**: a deterministic game master that watches a run, chooses encounters that fit it, runs them through clear phases and remembers what happened, so every run tells its own story. Today a realm's timeline is fixed: the same hordes and elites arrive at the same minutes whatever the party does, nothing reacts to how the battle goes, and nothing done in one minute changes the next.

## What Changes

- **The Director** runs inside the simulation (host-authoritative in rooms, D16). Twice a second it **observes** the run: the gods' health, damage taken lately, threats near them (monsters, elites, champions, the boss, hazards), the kill rate, whether the gods stand still, the encounters under way and the realm's state. From these it computes a **pressure** between 0 and 1, from named factors with configured weights.
- **Pacing**: once a second it may start an encounter. Encounters wait for a gap after the last one (longer after a major one), become likelier the longer the realm has been quiet, and are held back while the pressure is high. Pressure that stays high opens a **recovery window**: no major threat, and relief (a shrine) favoured. Only one major encounter runs at a time, at most two encounters in all, and none but blessings while the boss is awake.
- **Selection** is deterministic: the Director's own random stream (`chaos`) picks among the encounters that are eligible now (realm, realm time, depth, cooldown, times this realm, pressure band, realm state, conflicts), weighted by content and by the adaptive rules below.
- **Lifecycle**: every encounter goes *telegraph → active → resolving → completed / failed*, or *cancelled* (passing a gate, the boss's arrival during a warning). Rewards and consequences apply exactly once, when it completes or fails; a cancelled one gives neither and leaves nothing behind.
- **Realm state** for the run: **corruption** (0–100) and the **grudge** (escaped hunters, 0–2). Encounters change them and require them. Entering a deeper realm adds corruption.
- **Encounters** (content data, five reusable behaviours):
  - **Monster Invasion**: a rift is marked and announced; invaders of the realm's own kinds pour out of it in stages, an elite last. Repel them all in time for gold and a chest (corruption falls); fail and the survivors stay and corruption rises.
  - **Eclipse of Olympus** (needs corruption): the realm darkens; while it lasts monsters move faster and come more often; a champion arrives after a warning. Slay it to break the eclipse early (best reward), or endure it. Everything returns to normal when it ends.
  - **Roaming Elite / Hunter**: an arrival is marked; a hunter of the realm's elites, titled after the party's strongest element, pursues the gods with telegraphed slams. Slay it for gold, or outlast it until it escapes, which earns the party a grudge.
  - **The Vengeful Hunter** (the causal chain): eligible only with a grudge; stronger, better rewarded. Slaying it clears the grudge and the corruption it spread; letting it escape again spreads more corruption, which can bring an eclipse.
  - **Divine Shrine**: a shrine rises nearby; stepping in blesses every living god with a timed boon (Athena's aegis, Ares's fury, Hermes's swiftness, Apollo's radiance), shown with its time left.
  - **Divine Contracts** (optional): an altar offers a deal, with its objective, risk and reward on the HUD. Stepping in accepts it for the party; walking past declines it with no penalty. *Champion's Challenge* (after three elites slain) offers a champion hunt; *Purge the Corruption* (with high corruption) offers an invasion that cleanses the realm.
- **Adaptive rules**, occasional (at most once per 90 s), explainable and limited to selection weights: a party under sustained pressure is offered relief; a party clearing hordes very fast meets durable foes more often; a party standing still for 20 s meets encounters that make it move. Nothing changes damage, health or any stat of a fight in progress.
- **Presentation**: rifts, arrival marks, shrines, altars and champions are drawn above the darkness with pointers at the screen's edge; the eclipse darkens the light map within its readable floor (D13); the HUD shows each encounter's objective, count and timer, and the active blessings; outcomes are announced. Guests see all of it from the host's snapshot and HUD.
- **Debugging**: debug sessions can switch the Director off, start an encounter, and read a report (pressure and its factors, active encounters and phases, cooldowns, why each encounter is or is not eligible, realm state, recent outcomes, the stream). `?debug&director` shows the report on screen. `RunRules.director: false` turns it off for a run.

## Capabilities

### New Capabilities

- `director-of-chaos`: observation, pressure, pacing, selection, the encounter lifecycle, realm state, the five encounter behaviours, blessings, contracts, adaptive rules, debugging.

### Modified Capabilities

- `hud`: encounter objectives, blessings, encounter announcements.

## Non-goals

- Changing a fight's numbers to steer an outcome (no hidden damage or health changes), or countering a build's strongest weapon.
- A campaign or anything kept after the run; saves are unchanged.
- New character art: champions and hunters are the realm's own elites, marked.
- A new network message: guests learn everything from the snapshot, the HUD and events.
