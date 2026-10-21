import { isValidCode, normaliseCode } from './room-service';

/**
 * Parameters a development session carries into the links it makes, so an invite opened in another tab of an
 * end-to-end test still uses the same test network (`?debug&net=local`). Absent in production links.
 */
const KEPT_PARAMS = ['debug', 'net'] as const;

/**
 * The link that opens Co-op with a room's code filled in (spec: rooms / joining a room), relative to the app's base
 * URL: `coop?join=CODE`.
 */
export function inviteLink(base: string, code: string, current?: URLSearchParams): string {
  const params = new URLSearchParams({ join: code });
  for (const key of KEPT_PARAMS) {
    const value = current?.get(key);
    if (value !== null && value !== undefined) params.set(key, value);
  }
  return `${base.replace(/\/?$/, '/')}coop?${params}`.replace(/=(&|$)/g, '$1');
}

/** The room code an invite carries, or undefined when it is missing or not a valid code. */
export function invitedCode(param: string | null | undefined): string | undefined {
  if (!param) return undefined;
  const code = normaliseCode(param);
  return isValidCode(code) ? code : undefined;
}
