# Tasks

## 1. Generation

- [x] 1.1 Sites first (ruins, temple), roads to them (temple entrance), obstacles never on roads; temple and wall rules; content validation of temple kinds
- [x] 1.2 Mount Olympus: roads, temple, ruined walls, rubble, tips; code-drawn altar, wall and rubble
- [x] 1.3 Tests: roads reach every ruin, the temple and the boss arena with no obstacle on them; one temple with its altar and columns; braziers around plazas or at the temple

## 2. Ground

- [x] 2.1 `GroundPainter` (pure): blended terrain, texture, cliff face; tests: deterministic in any slicing, lower resolution at Low, dark beyond the cliff
- [x] 2.2 `GroundBuilder`: sliced painting within a frame budget; grass, roads, shadows; temple floors in `WorldView`

## 3. Loading

- [x] 3.1 Staged loading in `ArenaScene` (`art`, `realm`, `scene`); simulation starts after `ready`
- [x] 3.2 `RunLoading`: realm backdrop, party, stage and progress, tips, seed; fades out
- [x] 3.3 E2E: loading screen shows the realm and the party, then the arena at 00:00

## 4. Validate

- [x] 4.1 `npm run check`, `npm run e2e` (also `E2E_NO_GPU=1`)
- [x] 4.2 Look at the loading screen and walk the arena (roads, ruins, temple, walls) at High; docs updated
