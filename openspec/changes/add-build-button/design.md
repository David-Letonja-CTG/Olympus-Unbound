# Design

- `Hud` gets an output `build`. In the single-player frieze, when the player does not play by touch, it shows a round hexagon button (`hud-build`) above the ability slot, with a "Tab" key label like the ability's "Space". It has its own `pointer-events: auto`, since the HUD layer ignores the pointer. Its position is in `hud.css`, its look in `hud-pieces.css` (which keeps `hud.css` inside its style budget). The compact layout (short windows) moves and shrinks it with the ability.
- `PlayScreen` binds `(build)` to its existing `toggleBuild()`, the same one Tab and the phone button use.
- Settings' controls list and the main menu's key hint gain the build panel's keys.
- Test: on a computer, the HUD button opens the panel and closes it again.
