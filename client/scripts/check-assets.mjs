// Licence check for external assets (D12, spec: asset-pipeline / licence registry).
// Every file under public/assets and public/fonts must be listed in src/content/assets.ts with an allowed
// licence, and every listed file must exist. Run with `npm run assets:check` (part of `npm run check`).
import { readdirSync, statSync, existsSync } from 'node:fs';
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
const IGNORED = /(^|\/)(LICEN[CS]E[^/]*|README[^/]*|CREDITS[^/]*|\.gitkeep)$/i;

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

if (errors.length) {
  console.error(`Asset check failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`Asset check passed: ${onDisk.length} external file(s), all licensed.`);
