# Character renders

Every character sheet in `client/public/assets/olympus/` is rendered here, in Blender, from models of the Flare
collection on OpenGameArt (decision D15 in `docs/decisions.md`): the same isometric camera, sun and frame layout
that Flare used, so the whole cast shares one look. The scripts turn those models into OLYMPUS UNBOUND's gods,
monsters and intro figures and render the right-facing direction; `client/scripts/pack-sheet.mjs` packs the
frames into the 8-column sheets the game loads (the game mirrors them for the other facing).

## Sources (download into one folder, `FLARE_SOURCES`)

| File                                                                          | Work, author, licence                                                                                                                                                                         | Used for                                                                                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isometric_hero_heroine_blend.zip` (unzip as `isometric_hero_heroine_blend/`) | [Isometric Hero and Heroine](https://opengameart.org/content/isometric-hero-and-heroine), Clint Bellanger, CC-BY 3.0                                                                          | Zeus, Hades, Poseidon, Athena, satyr, harpy, fallen oracle, marble sentinel, the centaur's rider, the intro's defenders; scene for the Stymphalian bird |
| `Troll.blend`                                                                 | [FLARE Model - Troll](https://opengameart.org/content/flare-model-troll), VWolfdog (on Clint Bellanger's base human mesh), CC-BY 3.0                                                          | the Cyclops, Asterion                                                                                                                                   |
| `Horse.blend`                                                                 | [FLARE Model - Horse](https://opengameart.org/content/flare-model-horse), VWolfdog, on [3D Horse](https://opengameart.org/content/3d-horse-rigged-laking-textures) by _canyon, both CC-BY 3.0 | the centaur's body                                                                                                                                      |
| `Animal Pack Vol.2 by @Quaternius.zip` (unzip as `quaternius-animals/`)       | [Animated Animals Low Poly](https://opengameart.org/content/animated-animales-low-poly), Quaternius, CC0                                                                                      | the wolf: Orthrus, Cerberus, Scylla's hound heads (`beasts.py`)                                                                                         |
| `snake.tar.gz` (unzip as `snake/`)                                            | [Snake low poly animated 3D model](https://opengameart.org/content/snake-low-poly-animated-3d-model), methodical pixel, CC0                                                                   | the swamp serpent, the Hydra's necks, Scylla's tentacles (`beasts.py`)                                                                                  |
| `crab.zip` (unzip as `crab/`)                                                 | [Crab low poly animated 3D model](https://opengameart.org/content/crab-low-poly-animated-3d-model), methodical pixel, CC0                                                                     | the giant crab (`beasts.py`)                                                                                                                            |

Blender 4.5 LTS (rendered with 4.5.14, Cycles). The 2009-era files open in it; `flare_render.py` converts their
Blender Internal materials, sets a crisp sun (the converted one is a 90° disc) and a shadow catcher.

## Render

```bash
BLENDER=/path/to/blender FLARE_SOURCES=/path/to/sources node art/blender/render-all.mjs            # everything
BLENDER=/path/to/blender FLARE_SOURCES=/path/to/sources node art/blender/render-all.mjs zeus harpy # some
```

Each character takes 2–6 minutes on a GPU. Then run `npm run assets:check` in `client/` and look at the result in
a run (`?debug`, see `docs/content.md`).

**In-between frames.** After every source frame the renderer adds a pose halfway to the next one: it blends the
evaluated bone and object transforms, so it works the same for Flare's keyed actions and the creatures' baked
constant-step poses. Source frame f lands at sheet frame 2f, and `run()` in `client/src/content/assets.ts` takes
source frames and doubles them. A loop's last in-between leads back to its first frame: the loops are
`LOOPS = [(1, 4), (5, 12)]` (idle, walk) unless a character script names its own (the Stymphalian bird has one
flapping cycle, `[(1, 8)]`). `INBETWEEN=0` renders the source frames only.

**Head anchors.** `anchors.json` (copied to `art/blender/anchors/<name>.json`) holds the top of the head per
sheet frame, 0–1 from the frame's top left. It comes from the `HEAD` bone (default `Head`), and is `null` for
models without one.

## Files

| File                                      | What it does                                                                                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flare_render.py`                         | Opens a source, runs a character script, renders the frames (row 4 of Flare's 8 directions)                                                                                                        |
| `flare_lib.py`                            | Helpers: append parts from other files, recolour, attach meshes to bones, hold weapons (and make a club a labrys), strip faces                                                                     |
| `beasts.py`                               | The CC0 beasts staged on a Flare file: hounds (extra heads, mane), serpents (thickened), crabs, the Hydra (snakes as necks), Scylla's hound heads and tentacles; poses baked from their own cycles |
| `measure_grip.py`                         | Measures how a weapon sits in the hand in its own file (the numbers in `flare_lib.py`)                                                                                                             |
| `zeus.py` and the other character scripts | One character each; the header says what it is and which source it starts from                                                                                                                     |
| `render-all.mjs`                          | Renders and packs every character                                                                                                                                                                  |

## Frame layouts (packed sheets)

| Sheets                                                               | Frames                                                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Hero-based characters, the Cyclops and Asterion (32)                 | stance 0–3, run 4–11, swing 12–15, block 16–17, hit and die 18–23, cast 24–27, shoot 28–31        |
| Centaur (24, the horse's frames)                                     | see `client/src/content/assets.ts`                                                                |
| Stymphalian bird (14)                                                | wingbeat 0–7, death 8–13                                                                          |
| Beasts (18): Orthrus, Cerberus, swamp serpent, giant crab, the Hydra | idle 0–3, walk 4–11, death 12–17                                                                  |
| Scylla (32, 256 px)                                                  | the heroine's layout (stance, run, swing, block, die, cast, shoot), tentacles writhing throughout |

Credit: all of the above are derivatives of the listed CC-BY 3.0 works, made by this project; the credits are in
`client/src/content/assets.ts`, shown in Settings → Credits and listed in `docs/content.md`.
