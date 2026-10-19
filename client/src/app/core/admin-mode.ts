const KEY = 'olympus-unbound/admin';

/**
 * Admin mode (spec: run-statistics / admin mode): opening any page with `?admin` enables the statistics screen for
 * the rest of the browser tab's session. Unlike debug mode it works in production builds: it only reads this
 * browser's own save and sends nothing anywhere (D1).
 */
export function adminEnabled(): boolean {
  try {
    if (new URLSearchParams(globalThis.location?.search ?? '').has('admin'))
      sessionStorage.setItem(KEY, '1');
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
