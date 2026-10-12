# Design

- **Monster bars:** `Effects.drawBars` (Phaser) draws them for common monsters with `health < maxHealth`, from the `WorldFrame`, in the same graphics layer as the elites' bars, with no new objects per enemy. `Effects.enemyHealthBars` follows the setting.
- **Setting:** `GameSettings.enemyHealthBars` (default on). Save format v3: the migration from v2 adds the setting as on, `parseSave` validates it, and `SAVE_VERSION` is 3 (D8). Settings → *Enemy health bars* checkbox.
- **Party health:**
  - `HudSnapshot.party` comes from the simulation's `hud(playerId)`, so guests get theirs from the host's HUD messages (D16). Each member has its seat, name, god, sprite, health, max health, alive, revive and self.
  - The Angular HUD shows the list when there is more than one member, using the 10 Hz HUD updates (D7).
  - `SEAT_COLORS` moves out of the minimap art into the engine API, so the HUD and the minimap agree.
- **Tests:** the simulation's party HUD (self marking, fallen, revive), the HUD list (hidden alone, numbers, fallen), the v2 → v3 migration and the setting's persistence.
