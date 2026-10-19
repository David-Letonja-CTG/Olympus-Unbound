import { ADMIN_PASSWORD_SHA256 } from '../features/admin/admin-password';

const KEY = 'olympus-unbound/admin';

/**
 * Admin mode (spec: run-statistics / admin mode): only at `/admin`, behind a password, for the rest of the browser
 * tab's session once unlocked. The game is static (D1), so the check runs in the browser against a SHA-256 hash in
 * the build: it keeps players out of the screen, it is not a security boundary, and the screen only reads this
 * browser's own save. Change the password with `node scripts/admin-password.mjs`.
 */
export function adminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Unlocks admin mode for this tab's session when the password is right. */
export async function unlockAdmin(
  password: string,
  hash = ADMIN_PASSWORD_SHA256,
): Promise<boolean> {
  if (!password || (await sha256Hex(password)) !== hash) return false;
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    // Storage blocked: unlocked until the screen is left.
  }
  return true;
}
