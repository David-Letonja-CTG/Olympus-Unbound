// Serves the production build (dist/olympus-unbound/browser) like a static host: files by path, index.html for any
// other page (deep links), no caching headers that would hide a new build. Used by the end-to-end test of the
// installed, offline game (spec: installable-app), which needs a production build for the service worker.
//
//   cd client
//   npm run build && node scripts/serve-dist.mjs 4322
//
// With --test, POST /__test/network?down=1 makes the server drop every connection until ?down=0: the network is gone
// for the page and its service worker alike (the browser's offline emulation does not cover service workers).
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'dist', 'olympus-unbound', 'browser');
const port = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 4322);
const testHooks = process.argv.includes('--test');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
let down = false;

if (!existsSync(join(root, 'index.html'))) {
  console.error(`No build in ${root}: run npm run build first.`);
  process.exit(1);
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  if (testHooks && url.pathname === '/__test/network') {
    down = url.searchParams.get('down') === '1';
    res.writeHead(200).end(down ? 'down' : 'up');
    return;
  }
  if (down) {
    req.socket.destroy();
    return;
  }
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  let file = join(root, path);
  if (!file.startsWith(root + sep) && file !== root) {
    res.writeHead(403).end();
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    // A page of the app (deep link) gets the app; a missing file is a 404.
    if (extname(path)) {
      res.writeHead(404).end();
      return;
    }
    file = join(root, 'index.html');
  }
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
