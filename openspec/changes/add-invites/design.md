# Design

## The player's name (save v9)

- `GameSettings` belongs to the engine and is sent to the session, so the name stays out of it. It goes in the save instead: `SaveData.playerName: string` (≤ 16 characters, trimmed, empty when none), with the migration 8 → 9 adding `''`.
- `Progression` has three parts for it:
  - `playerName` (computed);
  - `setPlayerName(name)`, which clips the name and writes the save;
  - the Settings screen's "Your name" field.
- `RoomService.playerName` starts from the save. The Co-op screen's name field writes through `Progression.setPlayerName` as well as the room's signal. An empty name still shows as "Hero" in rooms, as today.

## Invite links

- The link is `inviteLink(base, code)` = `<base>coop?join=<CODE>`, built from `document.baseURI`, so it works under any base href.
- The lobby's **Invite** button calls `shareLink(url, text)`, a small helper beside `shareRun`:
  - `navigator.share({ title, text, url })` where it exists; cancelling is not an error;
  - otherwise the clipboard;
  - the button then says "Link copied" or "Invite sent" for a moment.
- The Co-op screen reads `join` from the query string once:
  - When it holds a valid code (`normaliseCode` + `isValidCode`) and no room is open, the code field is filled.
  - An "Invited to room CODE" line shows above the join form.
  - The Join button reads "Join room CODE" and gets focus.

  Nothing joins without a tap.

## Share picture v2

`drawShareCard` gets `player?: string` and `bossImage?: string`. The layout, 1200 × 630:

- **Top band:** the game's name small, then the headline in large gold capitals: "ADA CHALLENGES YOU", or "A CHALLENGE FROM OLYMPUS" without a name. Under it, the trial or quick-run line.
- **Left:** the realm's boss as a dark silhouette with an ember rim (like the loading screen), and the god's portrait in front of it with a halo.
- **Right:** the god and realm, the stats row, then "SCORE TO BEAT" and the score in a gold-framed plate.
- **Bottom ribbon:** "Can you beat it? Play the same run free in your browser" and the site address.

The summary waits for both pictures, as for the god's today, and passes the player's name.

## Named challenges

- `challengeLink(base, result, name?)` adds `n=<name>`, clipped to 16 characters.
- `parseChallenge` reads `n` the same way and keeps it as `from`.
- The challenge screen's title reads "{from} challenges you" (else "A challenge"), and the subtitle says "{from} played this run and dares you to beat it".
- The text sent with a share starts with the name.

## Testing

- **Unit:**
  - The invite link and its parsing (valid, broken).
  - The Co-op screen with `?join=` (filled, the Join label, no join until tapped, a broken code ignored).
  - Invite on the lobby (copies with no share API).
  - The name: persisted (v8 → v9 migration, clipped, invalid), Settings field, Co-op field writes it.
  - Named challenge links and screen, and the share card's inputs.
- **E2E:**
  - The co-op test opens the guest from the host's invite link instead of typing the code. Clipboard permission is granted; with `net=local` and `debug` the link keeps those parameters.
  - The daily test checks the named challenge screen.
