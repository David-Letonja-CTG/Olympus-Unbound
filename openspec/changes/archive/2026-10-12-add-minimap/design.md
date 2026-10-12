# Design

- **Phaser-free part (`engine/art/minimap.ts`):**
  - `minimapMarks(world, localId)` turns a `WorldFrame` into marks in drawing order (enemies, elites, gate, boss, fallen, other gods, the local god). Because it reads the `WorldFrame`, it works the same for the host and for guests (D16).
  - `minimapScale()` fits the arena into the square.
  - `paintMinimapBase()` paints the still picture once per realm: the ground canvas shrunk and darkened, obstacles as pale blocks, and the boss arena's ring.
- **Phaser part (`engine/phaser/minimap.ts`):**
  - A container that ignores scrolling, holding the frame, the picture (a canvas texture at 2× resolution, removed when the scene shuts down) and a graphics layer for the marks.
  - The marks are redrawn every 100 ms (the HUD's pace, D7).
  - The container's position and scale undo the camera zoom, like the boss pointer. Its depth is above the vignette, so the night never darkens it (D13).
- **Scene:** the arena scene creates the minimap with the world view and updates it each frame with the world and the local player's ID.
- No Angular change: the map is part of the game view, so no per-frame data crosses into Angular (D3).
- **Tests:** the marks (kinds, order, seats, departed players) and the scale.
