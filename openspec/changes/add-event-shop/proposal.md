# Proposal

## Why

The owner chose an event currency shop for seasonal events (2026-10-25): something to earn only while an event is on, spent on rewards that last.

## What Changes

- **Event currency:** each event names a currency.
  - The Night of Hecate's is **honey cakes**, the offering that calms Cerberus.
  - It drops only in runs of that event: from 2% of kills, 3 from every elite and 15 from the boss.
  - Cakes fly to the magnet like gold and are kept per event in the save. The run summary counts them.
- **Event shop:** on the Progression screen, under the Blessings of Olympus, while the event is on or cakes or rewards remain. Rewards are bought once and kept for good:
  - *Hecate's Blessing* (+5% XP);
  - *Ward of the Crossroads* (+1 armour);
  - *Keykeeper* and *Torchbearer*: the Key of Hecate or Hecate's Torches may then be offered in **every** run, all year (a room uses its host's).
- **Event table:** runs that started in an event realm get their own table in the Hall of Glory (this device only; the world boards have none and count them as before).
- **Save format 11:** currency, rewards and the event table; version 10 saves are migrated with none.

## Capabilities

### Modified Capabilities

- `seasonal-events`: event currency, event shop, event table.
- `meta-progression`: save format version 11.

## Non-goals

- Trading currency between events, or spending it on gold.
- An event board on the game server.
