# Tasks

## 1. Render pipeline

- [x] 1.1 `art/blender/flare_render.py`: open a Flare source, run a character script, convert materials, render row 4 with the file's camera, a crisp sun and a shadow catcher
- [x] 1.2 `flare_lib.py` helpers and `measure_grip.py`; check a plain re-render matches Flare's original sheet
- [x] 1.3 `render-all.mjs` and `pack-sheet.mjs --frames`; `art/blender/README.md` with sources, licences and steps

## 2. Characters

- [x] 2.1 Zeus, satyr, harpy, fallen oracle, marble sentinel, intro defenders (hero and heroine based)
- [x] 2.2 Cyclops (troll), centaur archer (horse + rider), Stymphalian bird (modelled)
- [x] 2.3 Manifest entries with animations, scale, origin and stride; credits; remove replaced downloaded sheets

## 3. Content and code

- [x] 3.1 Original roster IDs back; `bronze_bull` → `minotaur` (same numbers)
- [x] 3.2 Walk rate follows movement speed in runs and cutscenes; enemy facing hysteresis
- [x] 3.3 Menu portraits from sheets (god selection, main menu, realm boss, codex)

## 4. Checks, validation and playtest

- [x] 4.1 Unit tests: character art coverage, walk rate; `assets:check` frame bounds (verified failing on an out-of-range frame)
- [x] 4.2 `npm run check`, `npm run e2e` (also `E2E_NO_GPU=1`)
- [x] 4.3 Play to the boss at High and Low, watch the intro, open god selection: every character animated, readable, sized to its role, walking without sliding
- [x] 4.4 Docs: content.md, gameplay.md, art-direction.md, decisions.md (D15), README, product-vision
