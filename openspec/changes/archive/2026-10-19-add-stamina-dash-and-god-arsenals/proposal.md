# Proposal

## Why

The owner asked (2026-10-19) for a dash and a sprint that cost stamina, a stamina bar under health that refills with time, a cooldown animation on every skill, and skills that belong to their god ("thunderbolt is Zeus's only"). Today a god can only walk, the ability's cooldown jumps ten times a second, the weapons show no cooldown at all, and every god is offered every weapon, so Hades ends up throwing Zeus's lightning.

## What Changes

- **Stamina:** every god has a stamina bar (100) that refills after a short pause once it was last spent.
- **Sprint:** hold Shift (gamepad: left bumper or left trigger) to run 55% faster while stamina lasts.
- **Dash:** press E (gamepad: B / Circle) to dash a short distance in the direction of movement (or facing), passing through attacks unharmed for the dash's duration. A dash costs 35 stamina and needs a brief recovery before the next one.
- **The ability moves off Shift:** Space (gamepad: A, right trigger) stays the divine ability.
- **Cooldowns on the HUD:** a stamina bar under the health vessel; the ability slot's sweep turns smoothly and flashes when ready; every weapon slot shows its own cooldown sweep; a dash pip shows the dash's recovery.
- **God arsenals:** a weapon may belong to some gods only. Thunderbolt is Zeus's; the Lightning Orbs are Zeus's and Athena's; the Soul Scythe and Bident are Hades's; the Trident is Poseidon's; the Spear of Athena is Athena's; the Thunder Spear is Zeus's, Poseidon's and Athena's. The Divine Bow, War Hammer and Flaming Sword stay common to all.
- Co-op: dash and sprint go to the host with the input; a guest predicts them so its own god responds at once.

## Capabilities

### Modified Capabilities

- `player-control`: stamina, sprint and dash; the ability no longer on Shift.
- `hud`: stamina bar, smooth cooldowns on ability, weapons and dash.
- `run-progression`: weapons that belong to some gods only.

## Non-goals

- Stamina upgrades in the shop or as relics (later, as data).
- Dashing through walls; a dash slides along obstacles like walking.
