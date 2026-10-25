# Design

## Content and engine

- **`EventDefinition`:** `id`, `name`, `tagline`, `window: { from, to }` (`MM-DD`), `accent`; held in `GameContent.events`.
- **`event?: id`** on realms, weapons and relics.
- **`content/events.ts`** keeps each event in one place (definition, realm, host, boss, items); `content/index.ts` merges them into the lists, event realms last.
- **`RunConfig.eventId`** is echoed in `RunResult.eventId` (for the event table in the next change).
- `offerCandidates` skips new weapons and relics of another event. The god-arsenal check counts weapons without `event`.
- `realmAt` builds the chain from realms without `event`. When the start realm is an event's, depth 0 is that realm and depth `d` is `chain[(d − 1) % n]`.
- **Validation:** month-day format, known event ids, at least one realm outside events, known `Goal.realm`.

## App

- **`SeasonalEvents`** (`app/core/seasonal-events.ts`):
  - `active` comes from the local date (application code; the simulation never reads a clock, D5), or from the override in `localStorage` (`olympus-unbound/event-override`: `off` or `on:<id>`);
  - `daysLeft`;
  - `realms` lists the active event's realm first, then the chain.
- **Run configs:** solo and local co-op set `eventId` from `active`. The Daily Trial and challenges keep none. A room's `start` message carries the host's `eventId`.
- **Realm lists:** realm selection, room realms, and the host's `setRealm` check use `SeasonalEvents.realms`. The Daily Trial picks only realms without `event`.
- **Main menu:** an event button in the event's accent colour, with the days left. It clears any special run, sets the realm and opens god selection.
- **Admin page:** the switch: *By the calendar*, *<event> on*, *All off*.
- **Glory:** `Goal.realm` counts only runs that started there.

## The Night of Hecate

- **Sheets** (recoloured): `restless_dead` (shade), `empusa` (lamia), `lampad_of_hecate` (lampad), `hound_of_hecate` (orthrus), `hecate` (snake priestess ×2.3), `hecate_torch_bearer` (lampad ×0.85).
- **Code-drawn:** the `gourd_lantern` obstacle with an orange light; the `hecate_fire` and `torch_flame` projectiles; icons for the items.
- **Hecate:** 14000 health, guard 0.35. Three torch parts (1600 health, regrow 18 s), each lashing on its own rhythm.
  - Phase 1: ghost fire (5 boulders), the dead (5), a slam.
  - Phase 2, below 50%: walls with 3 segments and 30% gaps, more ghost fire, 3 hounds.
- **Hecate's Torches:** orbit, fire, 2 torches, burn 35%; five levels; a new `torches` sound.
- **Key of Hecate:** +20% fire and shadow damage, +10% XP.

## Tests

- Windows: inside, outside, wrapping the new year. Halloween on; the end date.
- The admin switch, and the realm lists with the event on and off.
- Event items offered only in event runs.
- The chain from an event realm, and that no gate reaches one.
- Content validation, and the per-weapon sound test.
- e2e: the event button from the admin switch, and a run at the crossroads.
