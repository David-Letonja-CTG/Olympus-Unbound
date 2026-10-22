/** Room codes avoid letters and digits that look alike (spec: rooms / creating a room); the game uses the same. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

export function isRoomCode(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === CODE_LENGTH &&
    [...value].every((c) => CODE_ALPHABET.includes(c))
  );
}
