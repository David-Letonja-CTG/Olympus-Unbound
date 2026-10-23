# Proposal

## Why

The owner asked (2026-10-23) for a way to collect experience left lying on the floor. In a long fight, gems pile up away from the god: beyond the magnet, behind the horde, where the god fled from a boss. Walking back for them is slow and dangerous, so the experience is lost.

## What Changes

- **Call of Hermes**, a new kind of level-up offer: an *instant* blessing. Taking it calls every experience gem in the realm to the gods. The gems stream in from every side, fast from far away and slowing as they arrive, and are collected on contact as usual.
- It is used once, when taken, and takes no slot. It can be offered and taken again at later level-ups.
- It is only offered when enough experience lies beyond the gods' magnets to be worth a level-up.
- Instant blessings are data: a definition with an effect and a condition. This change adds the one effect it needs, gathering pickups of given kinds.

The playable outcome: after a hard stretch, the player takes Call of Hermes and watches a flood of experience pour in, often for another level at once.

## Capabilities

### Modified Capabilities

- `run-progression`: instant blessings among the level-up offers.

## Non-goals

- Gathering gold, healing or chests. Gold may join later as data (the effect takes pickup kinds).
- A permanent pickup-range upgrade: Magnetism already does that.
- New art beyond an icon and a burst where the god stands.
