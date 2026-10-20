// Renders the installed app's icons (spec: installable-app / installing the game) from the game's own crest: the
// lightning bolt of the favicon on its dark disc with a gold rim. Writes PNGs to public/icons/.
//
//   cd client
//   node scripts/pwa-icons.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'icons');
mkdirSync(out, { recursive: true });

const BG = '#0f0e15';
/** The crest in a 64 × 64 box (as favicon.svg), with a warm glow behind the bolt. */
const crest = `
  <defs>
    <radialGradient id="glow" cx="50%" cy="45%" r="50%">
      <stop offset="0" stop-color="#5a4320" />
      <stop offset="1" stop-color="#17151f" />
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#glow)" stroke="#e8c25a" stroke-width="3" />
  <circle cx="32" cy="32" r="25.5" fill="none" stroke="#8a6a3a" stroke-width="1" />
  <path d="M36 8 L18 36 H30 L26 56 L46 26 H34 Z" fill="#fff27a" stroke="#ffffff" stroke-width="2"
    stroke-linejoin="round" />`;

/**
 * `any`: the crest fills the square on a transparent ground. `maskable`: a full-bleed background, the crest inside
 * the central 80% safe zone. `apple`: iOS rounds the corners itself and wants no transparency.
 */
const svg = (kind) => {
  if (kind === 'any')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${crest}</svg>`;
  const scale = kind === 'maskable' ? 0.72 : 0.86;
  const offset = (64 - 64 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" fill="${BG}" />
    <g transform="translate(${offset} ${offset}) scale(${scale})">${crest}</g>
  </svg>`;
};

const icons = [
  { file: 'icon-192.png', size: 192, kind: 'any' },
  { file: 'icon-512.png', size: 512, kind: 'any' },
  { file: 'icon-maskable-512.png', size: 512, kind: 'maskable' },
  { file: 'apple-touch-icon.png', size: 180, kind: 'apple' },
];

const browser = await chromium.launch();
try {
  for (const { file, size, kind } of icons) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg(kind).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
    );
    await page.screenshot({ path: join(out, file), omitBackground: kind === 'any' });
    await page.close();
    console.log(file);
  }
} finally {
  await browser.close();
}
