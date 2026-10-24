# Design

## Art

- **Manifest:** `SpriteAsset.recolor?: number`.
- **Shared helper:** `recolorCanvas(image, color)` in `engine/art/canvas.ts`. It draws the image, multiplies by the colour, then keeps the image's alpha (`destination-in`). Exported for the app.
- **Phaser:** `SpriteResolver.fromAsset` uses `${file}~${hex}` as the texture key when `recolor` is set. If that texture does not exist yet, it is made from the source image with `textures.addCanvas`, and every frame of the source is copied with the same name and rectangle. Animations reference the recoloured key.
- **Menus:** `portrait()` in `item-icon.ts` recolours the cut frame when the sprite has `recolor`.

| Key | Sheet | Recolour | Scale |
|---|---|---|---|
| `titan_soldier` | bronze_guardian | 0x8a5a44 | 1.3 |
| `gigas` | cyclops | 0x7a7488 | 1.25 |
| `ker` | fury | 0xff5a5a | 0.95 |
| `kampe_scorpion` | giant_crab | 0xc0402a | 1.15 |
| `kronos` | marble_sentinel | 0xd8a84a | 2.9 |

## Realm

`MOUNT_OTHRYS` in `content/realms.ts`, after the Labyrinth. It reuses existing obstacles and decorations, with its own terrain colours (basalt, ember ground, bronze plaza) and atmosphere (deep red ambient, ash fog, ember particles). Its timeline follows the Aegean's shape with its four enemies, its events are hordes and elites, and its boss `kronos` comes at 420 s. Bounty 380.

## Devour (`engine/bosses/boss.ts`)

```ts
{ type: 'devour'; id; windup; pullRadius; pullSpeed; radius; damage }
```

- `placeAttack` adds two circle hazards at the boss: a warning-only pull ring (damage 0) and the maw (`radius`, `damage`), both warned for `windup`.
- While a boss's current attack is a devour and its wind-up runs, every living god within `pullRadius` moves toward the boss by `pullSpeed × dt`, never past the maw's edge.
- Collision is resolved by the next movement step.
- A dash (about 900 units/s) beats a pull of about 260.
- The maw's hit goes through the hazard as usual, so a perfect dodge applies.
- Parts can also use it, through `placeAttack`; the pull only runs for a boss's own attack.

## Kronos

Health 15000, radius 52, speed 72, contact 34, gold 380.

| Phase | Below | Attacks |
|---|---|---|
| 1 | — | sickle sweep (2 cuts), swaddled stone (4 boulders), slam |
| 2 | 60% | devour (pull 420, maw 150), summon 4 `titan_soldier`, walls (two rings), sickle sweep |
| 3 | 25% | ×1.35 speed, pause ×0.6; devour twice per cycle, sweep, stone, charge |

## Tests

- Realm chain order and validation of all content.
- Every new sprite resolves to a sheet with idle, walk and death; the assets check passes.
- Devour pulls a god in the ring and not one outside; a dashing god escapes; the maw hits at the end.
- Kronos's phases and announcements.
- The recolour is checked visually (jsdom has no canvas): Kronos, the host and the loading screen portrait in the running game.
