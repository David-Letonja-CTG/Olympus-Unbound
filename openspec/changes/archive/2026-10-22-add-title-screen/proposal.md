# Proposal

## Why

The owner (2026-10-22), on v0.10.0 on a phone: no sound until the first button. Browsers allow no sound before the player's first touch, click or key, and no page can change that. So the game opens with a title screen whose tap lets the sound begin, the way many games do. The owner asked for it to be animated.

## What Changes

- **When it shows:** while the browser still holds sound back on opening, the game shows a title screen before anything else.
- **What it shows:**
  - the crest and the game's name rising out of the dark in a golden glow;
  - embers drifting up;
  - **Tap to enter** pulsing below (**Click or press any key** on a computer).
- **Entering:** any tap, click or key enters. A flash of light dissolves the screen into the menu, or whichever screen the link opened, as the Hall theme fades in.
- **When it's skipped:** where sound is already allowed it never shows: after any tap in this page (coming back from a run), or where the browser lets the site play sound at once.
- **The intro:** on first launch it waits for the tap and plays with its sound from the start.
- **Reduced motion:** with the device's "reduce motion" setting, the screen fades without movement.
- **Automated browsers** (`navigator.webdriver`) skip the title screen, so test and capture scripts keep starting where they expect. `?gate` in the address shows it in any browser, for tests and for review.

## Capabilities

### Modified Capabilities

- `run-setup`: the title screen before the main menu.

## Non-goals

- A title screen on every visit, or one where sound is already allowed.
- Settings for it.
