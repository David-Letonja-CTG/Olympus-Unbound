// Gives every address the game shares a page of its own in the production build (spec: daily-trial / link preview).
// Chat apps show no preview for a "not found" answer. The game server (and static hosts such as GitHub Pages) serve
// `challenge.html` for `/challenge` (query kept) with 200 OK, so each shared address gets a copy of index.html.
// 404.html, also the game, catches the other deep links on static hosts that answer unknown paths with it.
//
//   cd client
//   npx ng build && node scripts/entry-pages.mjs
import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The routes behind links players send each other: challenge links, room invites, the Daily Trial. */
const SHARED = ['challenge', 'coop', 'daily'];

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'dist', 'olympus-unbound', 'browser');
const index = join(root, 'index.html');
for (const page of ['404', ...SHARED]) copyFileSync(index, join(root, `${page}.html`));
console.log(`entry pages: 404.html, ${SHARED.map((p) => `${p}.html`).join(', ')}`);
