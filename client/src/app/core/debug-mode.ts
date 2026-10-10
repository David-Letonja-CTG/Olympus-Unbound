import { isDevMode } from '@angular/core';

const KEY = 'olympus-unbound/debug';

/**
 * Development-only test hooks (design §4): opening any page with `?debug` in a development build enables debug
 * commands for the rest of the browser tab's session. Production builds never enable them.
 */
export function debugEnabled(): boolean {
  if (!isDevMode()) return false;
  try {
    if (new URLSearchParams(globalThis.location?.search ?? '').has('debug'))
      sessionStorage.setItem(KEY, '1');
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
