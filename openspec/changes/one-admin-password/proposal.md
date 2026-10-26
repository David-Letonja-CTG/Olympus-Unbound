# Proposal

## Why

The owner (2026-10-26) set a new `ADMIN_TOKEN` in GitHub for the difficulty dial, then tried it on the `/admin` page and got "Wrong password". The page's lock checked a different password, a hash built into the game, so there were two admin passwords. The owner wants one: the `ADMIN_TOKEN` they set.

## What Changes

- **One admin password.** With a game server, `/admin` unlocks by asking the server whether the password is its `ADMIN_TOKEN` (`POST /api/admin/check`).
  - The page keeps the password for the tab's session and saves the difficulty dial with it. The dial's separate token field is gone.
  - The lock says why it would not open: wrong password, too many tries, no admin token on the server, or server unreachable.
- **Guessing is limited:** every admin request counts toward 60 tries per address an hour, and the token is compared in constant time.
- **No server:** a build without one (the release zip) keeps the built-in password hash, since there is no server to ask.

## Capabilities

### Modified Capabilities

- `run-statistics`: admin mode's password is the server's admin token.
- `difficulty-dial`: the admin page saves with that password.

## Non-goals

- Accounts or several admins.
- Keeping the admin password beyond the browser tab's session.
