// Licence check for external assets (D12, spec: asset-pipeline / licence registry).
// Every file under public/assets and public/fonts must be listed in src/content/assets.ts with an allowed
// licence, every listed file must exist, and sprite-sheet frames must lie inside their sheet. Run with
// `npm run assets:check` (part of `npm run check`).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(root, 'public');
const ALLOWED = [
  'CC0-1.0',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'CC-BY-SA-3.0',
  'CC-BY-SA-4.0',
  'OFL-1.1',
  'commercial',
];
// Files that document a pack rather than being used by the game.
const IGNORED = /(^|\/)(LICEN[CS]E[^/]*|OFL[^/]*|README[^/]*|CREDITS[^/]*|\.gitkeep)$/i;

/** Node strips the TypeScript types of the manifest module (it imports only types). */
const { ASSETS } = await import(pathToFileURL(join(root, 'src', 'content', 'assets.ts')).href);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? walk(path)
      : [relative(publicDir, path).split(sep).join('/')];
  });
}

const errors = [];
const listed = new Map();
for (const file of ASSETS.files) {
  for (const path of [file.url, file.data].filter(Boolean)) listed.set(path, file);
  if (!ALLOWED.includes(file.licence?.name))
    errors.push(`${file.id}: licence "${file.licence?.name}" is not allowed.`);
  if (file.licence?.name === 'commercial' && !file.licence.notes)
    errors.push(`${file.id}: commercial licence needs a receipt reference in notes.`);
}
const onDisk = [...walk(join(publicDir, 'assets')), ...walk(join(publicDir, 'fonts'))].filter(
  (p) => !IGNORED.test(p),
);
for (const path of onDisk)
  if (!listed.has(path)) errors.push(`${path}: no licence entry in src/content/assets.ts.`);
for (const [path, file] of listed)
  if (!existsSync(join(publicDir, path)))
    errors.push(`${file.id}: listed file "${path}" does not exist.`);

// Sprite sheets: the frame size must tile the PNG, and every frame a sprite uses must exist in it.
const frameCounts = new Map();
for (const file of ASSETS.files) {
  const path = join(publicDir, file.url);
  if (file.type !== 'spritesheet' || !existsSync(path)) continue;
  const png = readFileSync(path);
  if (png.toString('latin1', 12, 16) !== 'IHDR') {
    errors.push(`${file.id}: "${file.url}" is not a PNG.`);
    continue;
  }
  const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  if (width % file.frameWidth || height % file.frameHeight)
    errors.push(
      `${file.id}: ${width}x${height} is not a grid of ${file.frameWidth}x${file.frameHeight} frames.`,
    );
  frameCounts.set(file.id, (width / file.frameWidth) * (height / file.frameHeight));
}
for (const [key, sprite] of Object.entries(ASSETS.sprites)) {
  const count = frameCounts.get(sprite.file);
  if (count === undefined) continue;
  const frames = [
    sprite.frame,
    sprite.portrait,
    ...Object.values(sprite.animations ?? {}).flatMap((a) => a.frames),
  ];
  const outside = frames.filter((f) => typeof f === 'number' && (f < 0 || f >= Math.floor(count)));
  if (outside.length)
    errors.push(
      `${key}: frames ${outside.join(', ')} are outside "${sprite.file}" (${count} frames).`,
    );
}

if (errors.length) {
  console.error(`Asset check failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`Asset check passed: ${onDisk.length} external file(s), all licensed.`);
