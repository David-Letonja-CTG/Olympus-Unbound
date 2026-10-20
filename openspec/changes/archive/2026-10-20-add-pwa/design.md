# Design

## Service worker (D1)

- Uses `@angular/service-worker`, Angular's own package.
- `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`. The worker is registered once the first screen is idle, so it never competes with the first load.
- `ngsw-config.json` sets up the caches. `angular.json` turns the service worker on for production builds only.
  - **`app`** (`installMode: prefetch`): `index.html`, the manifest, the favicon, every `*.js` and `*.css`. This includes the lazy Phaser chunk and the PeerJS chunk.
  - **`assets`** (`installMode: prefetch`, `updateMode: prefetch`): `assets/**`, `fonts/**`, `ui/**`, `icons/**`.
  - Everything is cached up front (about 11 MB), so that every realm, sound and font works offline, and not only what was already seen.
- Navigation requests (deep links such as `/play`) are answered with the cached `index.html`, which is the Angular worker's default. The worker's paths are relative to its own location, so the build works under any `--base-href`.
- The signalling service of rooms is on another origin, which the worker never caches.

## Manifest and icons

- `public/manifest.webmanifest` holds:
  - name, short name and description;
  - `start_url` and `scope` set to `"./"`, relative to the manifest, so the game installs under any base href;
  - `display: fullscreen`, with `display_override: ["fullscreen", "standalone"]`;
  - `orientation: landscape`;
  - background and theme colours `#0f0e15`.
- The icons are the game's own lightning crest, drawn from the favicon's design on its dark disc. `client/scripts/pwa-icons.mjs` renders them to PNG with Playwright (Chromium) from one SVG:
  - 192 and 512 px (`purpose: any`);
  - 512 px maskable (the crest inside the 80% safe zone on a full-bleed background);
  - 180 px `apple-touch-icon`.
- `index.html` links the manifest and the Apple touch icon. It sets `mobile-web-app-capable`, `apple-mobile-web-app-capable`, the iOS app title and a `black-translucent` status bar. iOS ignores the manifest's orientation, so the rotate overlay of `add-phone-play` still applies there.

## Updates (`AppUpdate`, `app/core/app-update.ts`)

- It wraps `SwUpdate`. When the worker is enabled, it checks for an update at startup and every 30 minutes.
  - `ready` is set on `VERSION_READY`.
  - `broken` is set on `unrecoverable`.
- `reload()` activates the new version and reloads the page.
- The main menu shows the banner ("A new version is ready · Reload", or "This version can no longer load its files · Reload"). The play screen never shows it, so a run is never interrupted.

## Install hint (`InstallPrompt`, `app/core/install-prompt.ts`)

- It listens to `beforeinstallprompt` from app start: it prevents the browser's default and keeps the event.
  - `canPrompt` is set while an event is kept.
  - `install()` calls `prompt()` and drops the event.
  - `appinstalled` clears it.
- `installed` is the display mode: `(display-mode: standalone)` or `(display-mode: fullscreen)` matches, or iOS `navigator.standalone`.
- `iosHint` is on for iPhone and iPad Safari outside the installed app. An iPad that reports itself as a Mac is detected as macOS with touch points.
- `dismissed` is a signal for the visit. It is not saved, so the save format is unchanged (D8).
- The main menu shows, unless dismissed or installed:
  - an "Install the game" button (`canPrompt`);
  - or the iOS hint: "Add to Home Screen from Safari's Share menu to play full screen. The installed game keeps its own saves."
- `TouchScreen.enterFullscreen()` does nothing when `InstallPrompt.installed` is true.

## Rooms offline

- `Connectivity` (`app/core/connectivity.ts`) holds an `online` signal from `navigator.onLine` and the `online`/`offline` events.
- The Co-op screen shows "Rooms need an internet connection" and disables Create and Join while offline.
- A room in progress is not changed: links that drop are handled as today (D16).

## Testing

- **Unit:**
  - `AppUpdate` with a stub `SwUpdate` (ready, unrecoverable, reload, disabled).
  - `InstallPrompt`: a deferred event, `install()`, `appinstalled`, the iOS detection, installed display mode.
  - The main menu's banner and hints.
  - The Co-op screen offline.
  - The manifest's fields and icons exist.
- **E2E:** the manifest is linked, its fields are right and its icons are served (in the `pwa` test, against the production build).
- **E2E, new `pwa` project:**
  - `scripts/serve-dist.mjs` serves a production build with an SPA fallback, on its own port, started by Playwright's `webServer`.
  - The test loads the game and waits until the worker is active and holds every file of `ngsw.json`. Then the server drops every connection (`--test`, `/__test/network`; the browser's offline emulation does not cover service workers), and the context is set offline.
  - Offline, it reloads a deep link (`/gods`), starts a solo run and sees its loading screen end.
  - There are no debug hooks in production, so it checks the screens only.
  - The `pwa` project's `webServer` builds the production app first (`npm run build`), which adds about a minute to `npm run e2e`.

## Risks

- **A stale cache:** a player can keep an old version until they reload. The banner tells them, and the files are content-hashed, so no version mixes files of another.
- **11 MB** are downloaded in the background on the first visit, which is acceptable for a game. Later updates fetch only changed files (hashes).
- **iOS:** the Home Screen app has its own storage; the hint says so. There is no `beforeinstallprompt`, hence the instructions instead.
