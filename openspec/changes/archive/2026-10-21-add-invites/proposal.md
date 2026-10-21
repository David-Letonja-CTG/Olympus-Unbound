# Proposal

## Why

The owner wants friends to be easier to bring in (2026-10-21):

- Joining a co-op room means typing a five-letter code by hand. A link with the code in it should open the room's join screen ready to go.
- The share picture should carry a message from the player: who played the run and a dare to beat it.

## What Changes

- **Invite links:**
  - The lobby gets an **Invite** button. It shares a link with the room's code (the share sheet on phones) or copies it.
  - Opening the link shows Co-op with the code filled in and **Join room CODE** in front. The game does not join by itself: the player may change their name first, and a link opened by mistake does nothing.
  - A code that is not valid is ignored.
- **Your name:**
  - The name entered for co-op is remembered between visits, and Settings can change it (save v9).
  - It goes on the share picture and in challenge links.
- **A richer share picture:**
  - A headline with the challenger's name ("Ada challenges you").
  - The trial or quick-run line, the god in front of the realm's boss in silhouette, the numbers, and the score as **Score to beat**.
  - A closing dare with where to play.
- **Named challenges:** a challenge link may carry the sender's name, and the challenge screen then says "Ada challenges you".

## Capabilities

### Modified Capabilities

- `rooms`: joining by invite link.
- `daily-trial`: the share picture's message and named challenges.
- `meta-progression`: the player's name in settings and in the save (version 9).

## Non-goals

- Joining automatically, or links that start a room's run.
- Pictures in other sizes, QR codes.
