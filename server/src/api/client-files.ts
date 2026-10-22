import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { existsSync, readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';

/** Angular's content-hashed bundles never change: cached for good. Everything else is revalidated (D18 updates). */
const HASHED = /-[A-Za-z0-9_-]{8}\.(js|css)$/;

export interface ClientFilesOptions {
  /** The built game (client/dist/olympus-unbound/browser, with entry-pages.mjs run). */
  readonly dir: string;
}

/**
 * Serves the game itself (D21: the game and its server at one address). A shared address (\`/challenge\`, \`/coop\`, \`/daily\`) gets its own page with 200, so chat
 * apps show the preview (spec: daily-trial / link preview); any other unknown path loads the game, whose router takes
 * over. The API's routes are registered before this and take precedence.
 */
export async function serveClient(app: FastifyInstance, o: ClientFilesOptions): Promise<void> {
  const root = normalize(o.dir);
  const pages = new Map<string, string>();
  const page = (name: string): string | undefined => {
    if (!pages.has(name)) {
      const file = join(root, name);
      if (!existsSync(file)) return undefined;
      pages.set(name, readFileSync(file, 'utf8'));
    }
    return pages.get(name);
  };

  await app.register(fastifyStatic, {
    root,
    wildcard: true,
    index: false,
    // HTML is served below: shared addresses get their own page, other paths the game.
    allowedPath: (path) => !path.endsWith('.html'),
    cacheControl: false,
    setHeaders: (res, path) => {
      res.header(
        'Cache-Control',
        HASHED.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
    },
  });

  const servePage = (req: FastifyRequest, reply: FastifyReply) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method !== 'GET' || path.startsWith('/api/') || path === '/rooms')
      return reply.code(404).send({ code: 'not-found' });
    const name =
      /^\/[a-z0-9-]+$/.test(path) && page(`${path.slice(1)}.html`)
        ? `${path.slice(1)}.html`
        : 'index.html';
    // A missing file with an extension (an old bundle) is a real 404; the game would not help.
    if (/\.[a-z0-9]+$/i.test(path) && !path.endsWith('.html')) return reply.code(404).send();
    const html = page(name);
    if (!html) return reply.code(404).send();
    return reply.header('Cache-Control', 'no-cache').type('text/html; charset=utf-8').send(html);
  };
  // The site's root is a folder to the file server: the game's page instead.
  app.get('/', servePage);
  app.setNotFoundHandler(servePage);
}
