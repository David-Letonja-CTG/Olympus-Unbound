# Design

## Where touch is read (D2, D3)

- `ControlScheme` gains `'touch'`: touch controls, plus the whole keyboard and the first gamepad, as `'keyboard'` has. It is not one of the co-op `CONTROL_SCHEMES`. Local co-op is not offered on touch-only devices, so a touch run always has one local player.
- `PlayScreen` passes `local: ['touch']` to `createGameSession` for a solo or room run when the device's main pointer is touch. The session and the drivers treat it as one local seat, as they do `['keyboard']`.
- The touch controls live in the Phaser layer, next to the keyboard and gamepads. They do not use Phaser's input plugin, so its config keeps `touch: false`.
  - `TouchControls` (`engine/phaser/touch-controls.ts`, imports no Phaser) builds a DOM layer inside the game's parent element. The layer has the stick's base and knob and the three buttons, styled in bronze and gold.
  - It reads pointer events on that layer only. The layer has `touch-action: none`.
  - Each pointer ID is bound to the control it first touched: the stick (left half), a button, or nothing.
  - It answers `read(): { moveX, moveY, ability, dash, sprint }`, with taps latched until `consumeTaps()`, like keys.
  - Drawing is event-driven (pointer moves set a CSS transform); nothing runs per frame and Angular is not involved.
- The pure stick maths, `stickVector(dx, dy, radius)`, is the offset divided by the radius and clamped to length 1. It returns zero below the simulation's `DEAD_ZONE`. When the thumb is past the rim, the base follows the thumb. This is unit-tested, with `TouchControls` tested in jsdom through synthetic pointer events.
- `InputReader` creates `TouchControls` when its schemes include `'touch'` and merges it like the first gamepad: the larger move wins, and the buttons are OR-ed.
- The Angular HUD and dialogs sit above the game host. The HUD has `pointer-events: none`, so touches reach the layer, while dialogs take their own touches.

### Sprint: a toggle button (decision)

Sprint is a button that switches sprint on and off; it lights up while on. The simulation already walks when stamina runs out, so a toggle left on does no harm.

_Alternative rejected:_ "push the stick far to sprint". On a small stick it is easy to do by accident, so stamina would drain unasked. It would also take the outer ring away from analog walking speed.

## The phone screen (Angular)

- `TouchScreen` (`app/core/touch-screen.ts`) reads media queries and keeps signals:
  - `touch`: `(pointer: coarse)`.
  - `touchOnly`: coarse and no `(any-pointer: fine)`.
  - `portrait`: `(orientation: portrait)`.
  - `enterFullscreen()` calls `requestFullscreen` and then `screen.orientation.lock('landscape')`. Errors are swallowed: iPhone Safari has no element fullscreen. All of this is safe in jsdom.
- Fullscreen is asked for by the actions that start a run: Begin in realm selection and Play again in the summary. As a fallback, `PlayScreen` asks on the first touch of a run. This covers a room's guests, whose run starts from the host.
- `PlayScreen` on touch:
  - It shows a pause button in the top-left corner, inside the safe area, that sends `pause` (the timer plaque holds the top centre; the HUD's left column moves below the button).
  - It shows the rotate overlay in portrait and sends `pause` when portrait begins. In a room this only opens the menu, as the pause key does.
  - Its host gets `touch-action: none`, `overscroll-behavior: none` and `-webkit-touch-callout: none`, and it prevents `contextmenu` and Safari's `gesturestart`.
- Global page rules:
  - `index.html` gets `viewport-fit=cover`, so `env(safe-area-inset-*)` reports the notch.
  - `html, body` get `overscroll-behavior: none` against pull to refresh.
  - Menus keep pinch zoom (accessibility); only the play screen blocks gestures.
- The touch layer places the stick zone and the buttons with `env(safe-area-inset-*)`.
- Dialog targets: `@media (pointer: coarse)` rules give the level-up offers and the pause menu's buttons a minimum height of 44 px. A short-height rule (`max-height: 500px`) makes the level-up offers a compact row, so a choice fits a landscape phone.
- `SoundPlayer`'s unlock also listens to `touchend`: iOS Safari unlocks Web Audio only from a touch end.
- God selection hides the Players panel when `touchOnly`. Bot allies stay.

## Phone HUD and menus (step 2)

- The HUD scales with `container-type: size` and `cqh`/`cqw`. A phone-landscape rule (`max-height: 500px`) applies:
  - The frieze and orbs shrink, and the orbs move up to sit above the thumbs' zones' bottom corners.
  - The stick zone is the lower-left quarter; the buttons sit in the lower-right corner.
  - The loadout and experience bar stay in the bottom centre.
  - Plaques, medallions, the boss banner, gate and merchant notices, and announcements get smaller sizes and offsets.
  - The minimap (drawn by Phaser, `phaser/minimap.ts`) takes its size from the window. It is sized down below 500 px of height.
- On touch, the HUD gets the touch scheme and hides keyboard hints (`keysFor('touch')`).
- Menus: every screen is checked at 375×667 and 430×932 (portrait) and at 844×390 and 932×430 (landscape). Fixes are CSS only: wrapping, single columns, scroll inside the screen, pinned actions, and safe-area padding.

## Performance (step 3)

- Measure first. A Playwright script (`client/scripts/perf/phone.mjs`) runs a debug run under phone emulation: a Pixel-class viewport, `deviceScaleFactor` 2.75, touch, and CDP `Emulation.setCPUThrottlingRate` 4. It plays at Low with about 300 enemies (`skipTo` late in the realm, god mode) and records frame times from `requestAnimationFrame`. Results go into `docs/architecture.md#performance`.
- Candidate tunings, applied only where the numbers show a cost:
  - Light-map resolution and light count on Low.
  - The readability copies of enemies.
  - Particle counts.
  - Damage-number limits.
  - The canvas resolution: Phaser renders at CSS pixels (device pixel ratio 1), which stays.
- Enemy caps and every simulation rule stay as they are. Rooms mix phones and computers, and the host's simulation must be the same run as a solo one (D5, D16).
- The default quality is Low when `(pointer: coarse)` matches (`detectQuality`).

## Testing

- **Unit:** `stickVector` (dead zone, half drag, clamping, the base following the thumb); `TouchControls` with synthetic pointer events (multi-touch binding, latched taps, sprint toggle, lifting); `TouchScreen` with stubbed `matchMedia`; god selection hides Players when touch-only; the play screen's pause button and rotate overlay; `detectQuality` on coarse pointers.
- **E2E:** a `phone` Playwright project (Chromium with a Pixel 7-like landscape viewport, `hasTouch`, `isMobile`). It starts a run by tapping, drags the stick with CDP touch events and checks that the god moved. It taps dash and checks that stamina fell, and taps pause and checks that the menu opens.
- **Playtest:** the browser pane with the mobile preset, screenshots at Low and High (D13).

## Risks

- Real phones differ from emulation: iOS Safari has no fullscreen API on iPhone, its safe areas, and audio unlock rules. These follow the platform rules but are untested on a real device unless the owner tries one.
- A thumb resting on the HUD's orbs: the HUD has no pointer events, so this cannot block the stick.
