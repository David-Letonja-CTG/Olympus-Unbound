# Design

## The gate (app/core/title-gate.ts)

`TitleGate` is a root service:
- **`open`** is a signal. It is true when the browser reports no user activation yet (`navigator.userActivation.hasBeenActive === false`, or the API is missing) and a probe `AudioContext` does not start running on its own (a site the browser already trusts with sound skips it).
- **Automation:** `navigator.webdriver` closes it. A URL with `gate` opens it in any browser.
- **`entered`** is a Promise that is already resolved when the gate is closed.
- **`enter()`** marks it leaving (for the dissolve), resolves `entered`, and closes it after 700 ms.

## The screen (app/shared/title-screen.ts)

`TitleScreen` is a standalone `OnPush` component that `App` shows over the router outlet while the gate is open.
- **Look:** the menu's backdrop and title styles. The crest and title rise and sharpen in, and the tagline and prompt follow.
- **Embers:** 16 spans with fixed positions, sizes and delays (no randomness), rising on CSS keyframes.
- **Input:** a `pointerup`, `click` or `keydown` anywhere on it calls `enter()`. The `pointerdown` would come too early for the browser's sound rule.
  - It runs during the browser's own gesture handling, so `MenuSound`'s unlock, which listens to the same gesture, wakes the audio. Its first cue is skipped: the screen itself is not a control.
- **Leaving:** a golden radial flash scales out while the screen fades.
- **Reduced motion:** all of it collapses to plain fades.
- **Accessibility:** `role="button"`, `tabindex="0"`, focused on show, and an aria-label of "Enter the game".

## The intro

`IntroScreen.start()` first awaits `TitleGate.entered`. Its skip prompt timer starts after that too.

## Tests

- **Gate:** activation states, webdriver with and without `gate`, and `enter()` resolving `entered`.
- **Screen:** it renders the prompt for touch or desktop, and a key, a click or a pointerup enters.
- **Intro:** it does not start before entering.
- **E2E:** `/?gate`: the title screen shows, a click enters it, the menu is reachable, and nothing errors.
- **Browser:** watched at phone and desktop sizes.
