## 1. Setup

- [x] 1.1 Check that Blender runs headless and that `FLARE_SOURCES` has every file listed in `art/blender/README.md`; stop and report if not

## 2. PR 1: in-between frames and body language

- [x] 2.1 `flare_render.py`: in-betweens blended from neighbouring poses; loops blend back to their first frame (`LOOPS`); one-shots use `2n − 1` frames
- [x] 2.2 Export head anchors per frame into `art/blender/anchors/`
- [x] 2.3 Re-render the whole cast with `render-all.mjs`, then check every sheet and the loop seams in `/dev/art`
- [x] 2.4 `assets.ts`: doubled ranges and fps through `run()`, portraits through `still()`
- [x] 2.5 Simulation: `hurtX/hurtY` from the blow's source, the `casts` counter, the boss's `final` flag; all in the snapshot (unit tests)
- [x] 2.6 World view: the swing on the ability, dash lean, walk start, knockback offset
- [x] 2.7 Boss last phase: glowing cracks, eyes at the anchor, embers; single-phase bosses under 25%
- [x] 2.8 Measure phone frame time and texture memory (`scripts/perf/phone.mjs`) against main; apply the Low fallback if needed
- [ ] 2.9 Validate (group 5), PR, release notes

## 3. PR 2: gear on the god

- [x] 3.1 Gear kit (`gear.py`: flared shoulder plates, crested helm, cuirass and strips, cape; ten weapons); god scripts render empty-handed with `EMPTY_HANDED`
- [x] 3.2 Armour layers for looks 1–3 and weapon layers for the 10 weapons, per base body; render and pack
- [x] 3.3 Content: base body per god; look, trim and weapon sprite keys; credits and licence entries; the assets check fails on layers out of step and missing looks (unit tests)
- [x] 3.4 Engine `playerLook()` with unit tests: look thresholds, strongest weapon and ties, evolution, 7 relics → 6 colours, no armour, no weapon
- [x] 3.5 World view: three layers on one frame, armour tinted by its colour, evolution glow and trail, relic motes, the column of light when the look rises (only on a rise)
- [x] 3.6 Snapshot: each god's derived look (format 10); round-trip test
- [x] 3.7 A run loads its gods' gear and its realm's monsters up front, the rest on first use; the codex's Gods tab shows the four looks
- [ ] 3.8 Playtest at Low and High: readability above the light map (D13), the layers on every frame, both facings, co-op with two browsers
- [ ] 3.9 Validate (group 5), PR, release notes

## 4. PR 3: skins and crowns

- [ ] 4.1 Content `skins.ts`: `zeus_tempest`, `hades_ash`, `poseidon_deep`, `athena_owl`, `hades_shroud`; event reward effect `skin`; the Hecate shop sells `hades_shroud`
- [ ] 4.2 Save v12: `skins`, `crowns`; migration from v11; unknown gods and skins dropped; crowns idempotent per run ID; tests
- [ ] 4.3 Crowns granted from the run outcome (laurel for any boss, gold for `kronos`); code-drawn crowns at the head anchor
- [ ] 4.4 God selection: skins with locked ones showing their achievement or reward; the choice is saved; the portrait shows the skin and crown (component tests)
- [ ] 4.5 Player profile `{ skin, crown }` through `createGameSession`, the join message and the roster; unknown skin → default (tests)
- [ ] 4.6 Docs: `docs/gameplay.md`, `docs/content.md` (how to add a skin, armour or weapon layer), `art/blender/README.md`, `docs/art-direction.md`
- [ ] 4.7 Validate (group 5), PR, release notes

## 5. Validation (each PR)

- [ ] 5.1 `npm run check` in `client` (format, lint, assets check, unit tests, build)
- [ ] 5.2 `npm run e2e`
- [ ] 5.3 Playtest in the browser (`npm start`): play the changed behaviour, solo and in a room
- [ ] 5.4 Review the changed files against the spec scenarios and the hard rules; `openspec validate dressed-gods --strict`
