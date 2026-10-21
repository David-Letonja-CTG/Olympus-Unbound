# Proposal

## Why

The owner shared a run over Messenger on an iPhone (2026-10-21):

- Messenger kept the text and the link from the share sheet and dropped the picture.
- The challenge link showed no preview card. `/challenge` (like `/coop`) is not a file on GitHub Pages, so Pages answers it with its 404 page. That page is the game, so it plays, but chat apps show no preview for a "not found" answer.

## What Changes

- **Share** on the run summary becomes two buttons:
  - **Share picture** shares the picture alone, which apps such as Messenger send as a photo; where files cannot be shared it saves the picture.
  - **Share link** shares the dare text and the challenge link; where there is no share sheet it copies them.
- **Shareable addresses answer as pages.** The build writes a real page for each address the game shares (`challenge`, `coop`, `daily`). They answer 200 OK, so their link preview shows the game's card.

Not possible without a server (D1): a preview that differs per run.

## Capabilities

### Modified Capabilities

- `daily-trial`: sharing a run (two buttons) and the link preview (shared addresses included).

## Impact

- `client/src/app/features/run-summary/run-summary.ts`, `client/src/app/core/share-card.ts`.
- A build step (`client/scripts/entry-pages.mjs`), run by the Deploy workflow for both builds.
- No save or engine change.
