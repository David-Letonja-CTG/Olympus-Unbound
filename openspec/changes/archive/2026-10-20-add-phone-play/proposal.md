# Proposal

## Why

The owner asked how hard playing on a phone would be and approved building it (2026-10-20). Today the game needs a keyboard or a gamepad: on a phone nothing moves the god, the page zooms and scrolls under the thumbs, and the HUD and menus are laid out for a desktop window. The roadmap (phase 7) lists "mobile controls if prioritized"; the owner has prioritized it. The product vision asks for touch to be its own controls, not a shrunk desktop UI.

## What Changes

Delivered in three steps (three pull requests):

1. **Touch controls, landscape, fullscreen.**
   - A floating stick appears wherever the left thumb lands on the left side of the screen and moves the god; buttons on the right fire the ability, dash, and switch sprint on and off.
   - An on-screen pause button; the level-up, treasure, shop and pause dialogs have touch-sized targets.
   - Runs are played in landscape. In portrait a "turn your phone" overlay covers the run and pauses a solo run.
   - Play asks for fullscreen where the browser allows it.
   - During a run the page does not zoom, scroll, pull to refresh or open the long-press menu, and controls stay clear of the notch (safe areas).
   - Sound unlocks on the first touch.
   - Touch controls appear only on touch devices.
   - Local co-op on one screen (the Players panel) is hidden on touch-only devices; online rooms work by touch.
2. **Phone HUD and menus.** The ornate HUD (frieze, orbs on tripods, plaques, medallions) is scaled for phone landscape (about 390–430 px tall) and kept clear of the thumbs; the minimap and banners shrink. Every menu screen works at phone widths in portrait and at short landscape heights.
3. **Performance on phones.** Frame time is measured with a full horde under phone emulation (CPU throttling, Low quality), and the presentation is tuned where the measurements show it is needed. Gameplay rules and determinism stay unchanged. Touch devices start at Low quality.

## Capabilities

### New Capabilities

- `phone-play`: touch controls, the phone screen (landscape, fullscreen, gestures, safe areas), the phone HUD and menus, phone performance.

### Modified Capabilities

- `visual-atmosphere`: the default graphics quality is Low on touch devices.

## Non-goals

- Portrait play during a run; tablets get the same touch controls but no layout of their own.
- Local co-op on a touch-only device (several people on one phone).
- Remappable or movable touch buttons, aim by touch (weapons aim themselves), haptics.
- An installable app (PWA manifest, offline cache) or app-store builds.
- Different enemy caps or rules on phones: the simulation is the same everywhere (D5, D16).
