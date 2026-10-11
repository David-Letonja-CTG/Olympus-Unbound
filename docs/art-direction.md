# Art Direction

How OLYMPUS UNBOUND should look and feel. Applies to code-drawn art (`client/src/engine/art/`), external packs (`client/src/content/assets.ts`), effects and UI. Decisions D9, D12–D15 in [decisions.md](decisions.md).

## Mood

**Mythology at night, after the fall.** Sacred places overrun, lit by fire, moonlight and lightning. Grim and weighty rather than cute; heroic light against cold darkness. We take inspiration from the *mood* of gothic action-RPGs and classical myth — never from any specific game's layouts, icons, fonts or assets (see "Originality").

## Light and colour

| Element | Rule |
|---|---|
| Ambient | Cold moonlight (realm `atmosphere.ambient`), never darker than 30% brightness |
| Hero light | Warm white, the brightest thing on screen; Zeus carries it |
| Fire | Braziers, burning, gate fires: orange `#ff9a4a`, flickering |
| Lightning | Cold white-blue `#dcefff`, the only thing that may flash the whole view |
| Corruption | Sickly green `#9cff6a` in the eyes and cracks of corrupted creatures; beasts have ember-red eyes |
| Palette | Desaturated earth, moss and stone; gold reserved for the divine and for rewards; blood red for health and danger |

Darkness is a light map multiplied over the world; anything that must be read in combat (telegraphs, enemy arrows, pickups, the player marker, enemy figures) is drawn **above** it. Bloom only catches what is already bright.

## Forms and materials

- **Top-down with a 3/4 tilt**, light from the upper left, figures facing right (the view flips them).
- **Silhouettes first**: every creature must read at 32 px by outline alone. Dark outline (`rgba(8,6,10,.85)`), a thin cold rim light on the lit edge.
- **Materials**: weathered marble, oxidised bronze, dark iron, bone, worn cloth, matted fur. Avoid clean, saturated plastic colours.
- **Scale**: swarm < common < tank < elite (×1.5) < boss. Bosses own the screen.
- **Motion** (code-drawn): a small bob and lean while moving; packs supply idle/walk/attack/death animations.

## UI

Carved night stone panels in forged iron frames with worn gold-leaf inlays (`public/ui/frame.svg`, `divider.svg`, `stone.svg`); gold lettering in an inscriptional serif; blood-red only for health, danger and destructive actions. Health is an **amphora** that fills with blood-red liquid; the ability lives in an iron slot with a cooldown sweep; the boss in a banner. Text keeps ≥ 4.5:1 contrast (tested via `src/app/shared/ui-palette.ts`). The HUD stays at the edges; the centre belongs to the fight.

## Typography

Display: an inscriptional serif — Cinzel (SIL Open Font License, bundled in `client/public/fonts/cinzel/`, see [content.md](content.md)); fallback stack `Trajan Pro, Palatino Linotype, Book Antiqua, Georgia, serif`. Narration and flavour: italic serif. Numbers and body: system sans.

## Packs: what fits

- **One source and render setup for all characters** (D15): new characters are rendered in `art/blender/` from the Flare models with Flare's camera and sun, so they match the cast. Monsters come from Greek myth; gods must read as gods (attributes, gold, light), not as generic warriors.
- Top-down or 3/4 (isometric pre-rendered sprites in 8 directions also work; the right-facing frames are used).
- Dark fantasy palette, readable silhouettes, idle/walk/attack/death animations, ideally ≥ 64 px per character.
- Licence on the allow-list (CC0, CC-BY, CC-BY-SA, OFL, or a commercial licence with a receipt). No "non-commercial" or unclear-licence art, no AI-generated art of unknown provenance.

## Originality

Allowed references: the genre's mood, lighting, palettes and material language; classical mythology and its iconography. Not allowed: copying or closely imitating any game's UI layouts, icons, fonts, character designs, sprites, textures, sounds or music. When in doubt, design it differently.
