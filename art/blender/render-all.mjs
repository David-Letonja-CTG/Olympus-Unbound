// Renders every character with Blender and packs each into the sheet the game loads
// (client/public/assets/olympus/<name>.png). See README.md for the sources and versions.
//
//   BLENDER=<blender.exe> FLARE_SOURCES=<folder> node art/blender/render-all.mjs [name ...]
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const client = resolve(here, "../../client");
const out = join(client, "public/assets/olympus");
const sources = process.env.FLARE_SOURCES;
const blender = process.env.BLENDER;
if (!sources || !blender) {
  console.error(
    "Set BLENDER (blender executable) and FLARE_SOURCES (downloaded sources, see README.md).",
  );
  process.exit(1);
}
const HERO = "isometric_hero_heroine_blend/isometric_hero_blender";
const HEROINE = "isometric_hero_heroine_blend/isometric_heroine_blender";

/** name -> [source .blend, character script, frame size in the packed sheet] */
const CHARACTERS = {
  zeus: [`${HERO}/clothes.blend`, "zeus.py", 128],
  hades: [`${HERO}/steel_armor.blend`, "hades.py", 128],
  poseidon: [`${HERO}/clothes.blend`, "poseidon.py", 128],
  athena: [`${HEROINE}/steel_armor.blend`, "athena.py", 128],
  satyr: [`${HERO}/clothes.blend`, "satyr.py", 128],
  harpy: [`${HEROINE}/clothes.blend`, "harpy.py", 128],
  stymphalian_bird: [`${HERO}/clothes.blend`, "stymphalian_bird.py", 128],
  centaur_archer: ["Horse.blend", "centaur.py", 128],
  fallen_oracle: [`${HEROINE}/clothes.blend`, "oracle.py", 128],
  marble_sentinel: [`${HERO}/steel_armor.blend`, "sentinel.py", 128],
  cyclops: ["Troll.blend", "cyclops.py", 256],
  ally_warrior: [`${HERO}/leather_armor.blend`, "ally_warrior.py", 128],
  ally_maiden: [`${HEROINE}/clothes.blend`, "ally_maiden.py", 128],
  ally_smith: [`${HERO}/clothes.blend`, "ally_smith.py", 128],
  // The Underworld.
  shade: [`${HERO}/clothes.blend`, "shade.py", 128],
  fury: [`${HEROINE}/clothes.blend`, "fury.py", 128],
  lampad: [`${HEROINE}/clothes.blend`, "lampad.py", 128],
  orthrus: [`${HERO}/clothes.blend`, "orthrus.py", 128],
  cerberus: ["Troll.blend", "cerberus.py", 256],
  // The Lernaean Marsh.
  swamp_serpent: [`${HERO}/clothes.blend`, "swamp_serpent.py", 128],
  giant_crab: [`${HERO}/clothes.blend`, "giant_crab.py", 128],
  lamia: [`${HEROINE}/clothes.blend`, "lamia.py", 128],
  naiad: [`${HEROINE}/clothes.blend`, "naiad.py", 128],
  hydra: ["Troll.blend", "hydra.py", 256],
  // The Aegean Shore.
  siren: [`${HEROINE}/clothes.blend`, "siren.py", 128],
  triton: [`${HERO}/clothes.blend`, "triton.py", 128],
  drowned_sailor: [`${HERO}/clothes.blend`, "drowned_sailor.py", 128],
  scylla: [`${HEROINE}/clothes.blend`, "scylla.py", 256],
  // The Labyrinth of Crete.
  curete: [`${HERO}/leather_armor.blend`, "curete.py", 128],
  bronze_guardian: [`${HERO}/steel_armor.blend`, "bronze_guardian.py", 128],
  snake_priestess: [`${HEROINE}/clothes.blend`, "snake_priestess.py", 128],
  asterion: ["Troll.blend", "asterion.py", 256],
};

mkdirSync(out, { recursive: true });
const wanted = process.argv.slice(2);
for (const [name, [blend, script, frame]] of Object.entries(CHARACTERS)) {
  if (wanted.length && !wanted.includes(name)) continue;
  const frames = join(tmpdir(), "olympus-render", name);
  rmSync(frames, { recursive: true, force: true });
  console.log(`rendering ${name}`);
  execFileSync(
    blender,
    [
      "-b",
      join(sources, blend),
      "--python",
      join(here, "flare_render.py"),
      "--",
      join(here, script),
      frames,
    ],
    {
      stdio: ["ignore", "ignore", "inherit"],
      env: { ...process.env, FLARE_SOURCES: sources },
    },
  );
  const files = readdirSync(frames)
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => join(frames, f));
  execFileSync(
    "node",
    [
      join(client, "scripts/pack-sheet.mjs"),
      "--frame",
      String(frame),
      "--frames",
      "--measure",
      "--out",
      join(out, `${name}.png`),
      ...files,
    ],
    {
      stdio: "inherit",
      cwd: client,
    },
  );
  // The top of the head per frame, for crowns and a boss's glowing eyes (spec: asset-pipeline / character art).
  mkdirSync(join(here, "anchors"), { recursive: true });
  copyFileSync(join(frames, "anchors.json"), join(here, "anchors", `${name}.json`));
}
