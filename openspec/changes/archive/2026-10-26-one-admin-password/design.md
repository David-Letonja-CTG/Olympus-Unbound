# Design

## Server

- **`POST /api/admin/check`:** 204 for the right `Authorization: Bearer <ADMIN_TOKEN>`, 401 otherwise. Like the other admin routes, it does not exist without `ADMIN_TOKEN`.
- **One `admin()` guard** for every admin route (check, hide, dial):
  - an optional `adminLimiter` (`main.ts`: 60 per address per hour) answers 429 when spent;
  - the header is compared with `timingSafeEqual`.

## Client

- **`unlockAdmin(password, server?)`** returns `ok | wrong | too-many | no-token | unreachable`.
  - With a configured server it posts the check. On 204 it stores the unlock flag and the password (`olympus-unbound/admin-token`) in `sessionStorage`.
  - Without one it checks the build's hash as before.
- **`adminToken()`** reads the session's password. `AdminScreen.saveDial` uses it, and the dial's token field is removed.
- The lock shows the reason for each refusal.

## Tests

- **Server:** check route answers 204 or 401; the limiter turns the fourth try into 429.
- **Client:** unlock by server, each refusal, the token kept for the session, and the hash only without a server.
- **e2e:**
  - the test server runs with `ADMIN_TOKEN=e2e-admin-token`;
  - the admin test unlocks for real (no session stand-in);
  - it saves the dial and resets it.
