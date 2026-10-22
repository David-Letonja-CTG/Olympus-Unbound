## Context

The game server (D21) ran on the VM while the game was on GitHub Pages, built with the server's address. The owner chose to put everything on the VM.

## Decisions

- **One image, one container.** The image builds the game (`OLYMPUS_SERVER='same-origin'`, entry pages) and the server, and the server serves the build from `CLIENT_DIR` with `@fastify/static`. A second web container would add a hop and a deploy for no gain: the host's Caddy already does TLS and compression.
- **Routing.** API routes and `/rooms` come first. Files are served as they are; `/<name>` serves `<name>.html` if the build has it (shared addresses, so link previews see 200), else the game; a missing file with an extension is a 404, so an old bundle never gets HTML.
- **Caching.** Content-hashed bundles are immutable; everything else is `no-cache`, so the service worker sees a new `ngsw.json` at once.
- **Origins.** `ALLOWED_ORIGINS` is the game's own address. A socket with no Origin (no browser) is let in: browsers always send one, so other sites stay refused.
- **No forwarder.** Nobody plays on the former address yet, so Pages is switched off instead of forwarding; saves there are not migrated.
- **Neutral host.** The host stack's directory, compose project and database superuser are GitHub variables (`HOST_DIR`, `HOST_PROJECT`, `HOST_DB_USER`); the stand-in for tests is a generic `host` stack.

## Risks

- **A new address** loses the former site's saves and installs: accepted, nobody plays yet.
- **The link preview's address** is written in `index.html`; a new address must change it (docs/hosting.md).
