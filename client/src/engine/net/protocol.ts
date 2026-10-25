import { GameContent } from '../data/types';
import { HudSnapshot, RunResult, SimEvent, UpgradeChoice } from '../sim/types';

/** Bumped whenever the messages below change; part of the room version (design: Protocol). */
export const NET_VERSION = 2;
/** Bumped whenever the binary snapshot layout (snapshot.ts) changes. */
export const SNAPSHOT_FORMAT = 8;

/** What a guest's game sends to the host during a run (D16). */
export type GuestMessage =
  /** The guest's scene is built; the host starts the run when every guest has loaded. */
  | { readonly type: 'loaded'; readonly depth: number }
  /** One step of the guest's input. `ability` and `dash` are true if held or tapped during the step. */
  | {
      readonly type: 'input';
      readonly seq: number;
      readonly x: number;
      readonly y: number;
      readonly ability: boolean;
      readonly sprint: boolean;
      readonly dash: boolean;
    }
  | { readonly type: 'choose'; readonly choiceId: number; readonly index: number };

/** What the host's game sends to a guest during a run (D16). */
export type HostMessage =
  /** The world (binary snapshot), the guest's last applied input and the events since the last frame. */
  | {
      readonly type: 'frame';
      readonly snapshot: ArrayBuffer;
      readonly ack: number;
      readonly events: readonly SimEvent[];
    }
  /** The guest's own HUD; now and then with their result so far (kept if the host vanishes). */
  | { readonly type: 'hud'; readonly hud: HudSnapshot; readonly result?: RunResult }
  | { readonly type: 'choice'; readonly choice: UpgradeChoice }
  | { readonly type: 'ended'; readonly result: RunResult };

const GUEST_TYPES = new Set(['loaded', 'input', 'choose']);
const HOST_TYPES = new Set(['frame', 'hud', 'choice', 'ended']);

const typed = (m: unknown): m is { type: string } =>
  typeof m === 'object' && m !== null && typeof (m as { type?: unknown }).type === 'string';

/** Guests are friends, but a malformed message must not break the host's run. */
export function isGuestMessage(m: unknown): m is GuestMessage {
  if (!typed(m) || !GUEST_TYPES.has(m.type)) return false;
  const v = m as Record<string, unknown>;
  if (m.type === 'input')
    return (
      Number.isFinite(v['seq']) &&
      Number.isFinite(v['x']) &&
      Number.isFinite(v['y']) &&
      typeof v['ability'] === 'boolean' &&
      typeof v['sprint'] === 'boolean' &&
      typeof v['dash'] === 'boolean'
    );
  if (m.type === 'choose') return Number.isInteger(v['choiceId']) && Number.isInteger(v['index']);
  if (m.type === 'loaded') return Number.isInteger(v['depth']);
  return true;
}

export function isHostMessage(m: unknown): m is HostMessage {
  if (!typed(m) || !HOST_TYPES.has(m.type)) return false;
  // Not `instanceof`: a buffer from a channel may come from another realm (a worker, a test's structured clone).
  if (m.type === 'frame')
    return (
      Object.prototype.toString.call((m as { snapshot?: unknown }).snapshot) ===
      '[object ArrayBuffer]'
    );
  return true;
}

/**
 * Identifies a build's game: the protocol, the snapshot format and the content. Rooms only join games with the same
 * version, so both ends resolve the same IDs and rules (spec: rooms / joining a room).
 */
export function roomVersion(content: GameContent): string {
  // FNV-1a over the content as data.
  const text = JSON.stringify(content);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${NET_VERSION}.${SNAPSHOT_FORMAT}.${hash.toString(16)}`;
}
