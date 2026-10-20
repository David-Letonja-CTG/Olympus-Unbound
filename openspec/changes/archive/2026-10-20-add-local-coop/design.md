# Design

## Seats, controls and the session

- `GameSessionOptions.local?: ControlScheme[]`: the controls of each local human in seat order, starting with seat 0. `ControlScheme = 'keyboard' | 'keys-left' | 'keys-right' | 'pad-1' … 'pad-4'`; a lone player uses `'keyboard'` (today's: WASD or arrows, any gamepad).
- `RunConfig.sharedScreen?: true` turns on the party leash. The party is `[player 1, other local players, bot allies]`, with names "Player 1", "Player 2" and so on.
- `InputReader` reads one `PlayerInput` per scheme. Keyboards are read by `KeyboardEvent.code` (so the left and right Shift differ) from window listeners, with taps latched as today. Gamepads are read by index. `RunDriver.advance` takes the inputs of every local seat. `LocalDriver` knows its local seats: it puts each input in its slot, passes on the choices of every local player, and accepts their answers.

## Camera and leash

- `ArenaScene` centres the camera on the living local players' midpoint and zooms out by `factor = clamp(min(view / needed), 0.7, 1)` (with a 150-unit margin around the spread), eased.
- The simulation keeps each living human of a shared-screen run within `(view half-extent / 0.7) − 150` of the living humans' midpoint on each axis (`sim/players.ts`, after movement). Bots are not leashed (they follow player 1). Spawns keep their base view, so monsters may enter at the edges when fully zoomed out.

## Choices and HUD

- `PlayScreen` keeps a queue of open local choices, shows the first and names its player (from the HUD's party). Any device answers the shown choice (keyboard numbers, mouse, any gamepad via `uiInputs`).
- `HudPartyMember` gains `stamina` (0–1) and `ability` (0–1, 1 = ready) for every member; the panel draws them for local players (`local: true`).
- Glory: humans = players − bots, so two or more local people count as co-op (no change to its rules).

## Risks

- Keyboard ghosting with two players on one keyboard: arrow keys plus the right-side keys are on separate matrix areas on most keyboards; a gamepad is the fallback.
