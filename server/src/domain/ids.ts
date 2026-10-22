/** Content IDs are stable snake_case (CLAUDE.md); the server does not know the content, only their shape. */
export function isContentId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(value);
}

/** A name a player chose (Settings): trimmed, 1–16 characters, no control characters. */
export function cleanName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.replace(/\p{Cc}/gu, '').trim();
  return name.length >= 1 && name.length <= 16 ? name : undefined;
}

/** The game's room version (`roomVersion`): opaque to the server, bounded in size. */
export function isVersion(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 64;
}
