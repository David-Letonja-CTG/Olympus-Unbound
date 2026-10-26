import { ADMIN_PASSWORD_SHA256 } from '../features/admin/admin-password';
import { ServerError } from './game-server';

const KEY = 'olympus-unbound/admin';
const TOKEN_KEY = 'olympus-unbound/admin-token';

/**
 * Admin mode (spec: run-statistics / admin mode): only at `/admin`, behind one password, for the rest of the browser
 * tab's session once unlocked. With a game server the password is the server's admin token (`ADMIN_TOKEN`): the
 * server checks it, and the page keeps it for the tab's session to set the difficulty dial (D23). A build without a
 * server checks a SHA-256 hash in the build instead (change it with `node scripts/admin-password.mjs`).
 */
export function adminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** The admin token this tab was unlocked with, for the server's admin routes; none without a server. */
export function adminToken(): string | undefined {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Why an unlock failed, or that it worked. */
export type UnlockResult = 'ok' | 'wrong' | 'too-many' | 'no-token' | 'unreachable';

/** The part of the game server admin mode needs. */
export interface AdminServer {
  readonly configured: boolean;
  post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>;
}

/** Unlocks admin mode for this tab's session when the password is right. */
export async function unlockAdmin(
  password: string,
  server?: AdminServer,
  hash = ADMIN_PASSWORD_SHA256,
): Promise<UnlockResult> {
  if (!password) return 'wrong';
  if (server?.configured) {
    try {
      await server.post('/api/admin/check', {}, { authorization: `Bearer ${password}` });
    } catch (e) {
      const status = e instanceof ServerError ? e.status : 0;
      if (status === 401) return 'wrong';
      if (status === 429) return 'too-many';
      if (status === 404) return 'no-token';
      return 'unreachable';
    }
    remember(password);
    return 'ok';
  }
  if ((await sha256Hex(password)) !== hash) return 'wrong';
  remember();
  return 'ok';
}

function remember(token?: string): void {
  try {
    sessionStorage.setItem(KEY, '1');
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked: unlocked until the screen is left.
  }
}
