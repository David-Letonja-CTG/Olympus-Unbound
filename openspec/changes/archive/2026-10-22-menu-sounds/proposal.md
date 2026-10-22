# Proposal

## Why

The owner (2026-10-22) found two things in v0.9.0:

- **No sound on opening.** The Hall theme didn't play when the game opened. It only played after a run.
  - **Cause:** the menus and the run's sound player tried to start their audio on the player's first input event only, then stopped listening.
  - On a phone that first event is the finger going down. Browsers allow audio to start only when the finger lifts, so the one attempt failed. A run's sounds escaped this, because by then the player had interacted with the page.
- **Silent buttons.** The menus' buttons should make a sound when pressed.

## What Changes

- **Unlocking audio:** the game keeps trying to start its audio on every tap, click and key press until it is running. This applies to the menus and to runs.
- **Menu sounds:** pressing a button, a link or an option on a menu plays a soft lyre pluck. The main action buttons (Play, Begin, Continue and the like) play a brighter two-note chime. Disabled buttons are silent. They play at the Sound effects volume.

## Capabilities

### Modified Capabilities

- `music`: the Hall theme starts on the first tap on a phone too.
- `hud`: sound feedback on the menus.

## Non-goals

- Hover sounds (they are noisy, and phones have no hover).
- Sounds for sliders while they are dragged.
