# Proposal

## Why

After phone play shipped, the owner asked whether the game could be a PWA (an installable web app) and approved it (2026-10-20). Installing it from the browser gives the game an icon and lets it start full screen. This also covers iPhone Safari, the one place where `add-phone-play` could not get fullscreen. Solo runs need no network, so an installed game can be played offline. Everything stays static files (D1).

## What Changes

- **Installable:** the game gets a web manifest and its own icons (name, dark theme, full screen, landscape). It can be installed from Chrome, Edge and Android ("Install"), and from iPhone and iPad Safari (Share → Add to Home Screen).
- **Install hint:** the main menu offers "Install the game" where the browser supports it. On iPhone and iPad Safari it explains Add to Home Screen instead. It is never shown once the game is installed, and it can be dismissed.
- **Offline:** a service worker keeps the whole built game (about 11 MB: code, art, sounds, fonts) once it has loaded online. After that the menus, the intro and solo runs work without a network.
- **Rooms offline:** the Co-op screen says that rooms need a connection, and it disables creating and joining a room while the device is offline.
- **Updates:** a new release downloads in the background. The main menu then offers "A new version is ready · Reload". The game never reloads by itself, so a run is never interrupted.
- **Installed on a phone:** the installed game already fills the screen, so starting a run does not ask for fullscreen again.

## Capabilities

### New Capabilities

- `installable-app`: installing the game, playing offline, updates, the install hint.

## Non-goals

- App-store builds, push notifications, background sync.
- Moving saves between the browser and an installed app. On iPhone they are kept apart; the hint says so.
- Rooms offline (they need the signalling service and the peers).
