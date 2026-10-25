# Proposal

## Why

The owner asked (2026-10-25) for gameplay events "like Halloween": a special map, monsters and items for a season. They chose:
- a full Halloween event;
- fixed dates plus a switch on the admin page;
- an event currency shop. The shop comes in a second change.

Halloween is six days away.

## What Changes

- **Seasonal events** as data: an event has a name, a tagline, a colour and a yearly date window. It is on when the device's date is inside the window, unless the hidden admin page switched events on or off for that browser.
- While an event is on:
  - The main menu shows its button with the days left. The button leads straight to choosing a god for the event's realm.
  - The event's realm leads the realm lists (solo, co-op rooms). Event realms stand outside the chain of realms: a run may start in one, then goes on from Mount Olympus.
  - Its items may be offered in every run. A run carries the event that was on when it began, so a room plays its host's event.
- The Daily Trial never picks an event realm, so it stays the same run for everyone.
- **The Night of Hecate** (October 24 – November 7), the first event:
  - **Realm:** the *Crossroads of Hecate*, a moonlit graveyard where three roads meet, lit by carved gourd lanterns (a new code-drawn prop).
  - **Host:** the Restless Dead, the Empusae, the Lampades of Hecate (throwing her fire) and the Hounds of Hecate. All are existing sheets, recoloured as for Mount Othrys.
  - **Hecate, Queen of the Crossroads:** her three torches, carried by Lampades, guard her. While one burns she takes a third of the damage. Quenched torches relight after 18 s. Ghost fire falls, the dead and her hounds answer her call, and below half health "the three roads close": rings of stone with three ways out.
  - **Event items:** *Hecate's Torches* (fire, circling torches that burn) and the *Key of Hecate* (relic), offered only during the event.
  - **Achievements:** *Queen of the Crossroads* (defeat Hecate) and *Walker of the Night* (survive 10 minutes from her crossroads). Goals may now count only runs that started in a given realm.

## Capabilities

### New Capabilities

- `seasonal-events`: events, their dates and switch, their realm, items and achievements, and the Night of Hecate.

### Modified Capabilities

- `endless-run`: event realms stand outside the chain.

## Non-goals

- The event currency, its shop and an event high-score table: the next change.
- Events chosen by the game server: events stay in the browser (D1).
- New renders: the cast is recoloured from the existing sheets (D15).
