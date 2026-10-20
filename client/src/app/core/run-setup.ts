import { computed, Injectable, signal } from '@angular/core';
import { CONTROL_SCHEMES, ControlScheme, RunResult } from '../../engine';
import type { Challenge } from './challenge';
import type { DailyTrial } from './daily-trial';
import { RunRewards } from './save/rewards';

/**
 * A run set up by something other than the menus: today's Daily Trial or a challenge from a link (spec:
 * daily-trial). Always solo; it brings its own god, realm, seed and rules.
 */
export type SpecialRun =
  | { readonly kind: 'daily'; readonly trial: DailyTrial }
  | { readonly kind: 'challenge'; readonly challenge: Challenge };

export const MAX_SEED = 4294967295;

/** A new random seed. Application-level randomness: it only picks which arena is generated. */
export function randomSeed(): number {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0];
}

/** Parses a seed typed by the player: a whole number from 0 to 4294967295, else undefined. */
export function parseSeed(text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return value <= MAX_SEED ? value : undefined;
}

/** A run at one screen: its players and bot allies make a party of four at most (spec: bot-allies, co-op). */
export const MAX_PARTY = 4;
export type AllySkill = 'easy' | 'normal' | 'hard';
export const ALLY_SKILLS: readonly { readonly id: AllySkill; readonly label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Hard' },
];

/** A god played by the machine beside the player. */
export interface Ally {
  readonly godId: string;
  readonly skill: AllySkill;
}

/** Another player at this screen (spec: co-op / local co-op on one screen). */
export interface LocalPlayer {
  readonly godId: string;
  readonly controls: ControlScheme;
}

export const CONTROL_LABELS: Record<ControlScheme, string> = {
  keyboard: 'Keyboard',
  touch: 'Touch',
  'keys-left': 'Keyboard left · WASD',
  'keys-right': 'Keyboard right · arrows',
  'pad-1': 'Gamepad 1',
  'pad-2': 'Gamepad 2',
  'pad-3': 'Gamepad 3',
  'pad-4': 'Gamepad 4',
};

export interface FinishedRun {
  readonly result: RunResult;
  readonly rewards: RunRewards;
  /** Played in a room (spec: rooms): the summary offers co-op again instead of a solo run. */
  readonly inRoom?: boolean;
}

/** What the player chose for the next run, and how the last run went. Kept in memory only. */
@Injectable({ providedIn: 'root' })
export class RunSetup {
  readonly godId = signal<string | undefined>(undefined);
  readonly realmId = signal<string | undefined>(undefined);
  readonly seed = signal<number>(randomSeed());
  /** A quick run: realms at twice the pace (spec: quick-runs), remembered for the visit. */
  readonly quick = signal(false);
  /** The Daily Trial or a challenge, until the player sets up a run of their own again. */
  readonly special = signal<SpecialRun | undefined>(undefined);
  /** Bot allies for the next run at this screen, in the order added. */
  readonly allies = signal<readonly Ally[]>([]);
  /** Players 2–4 at this screen, in the order added. */
  readonly players = signal<readonly LocalPlayer[]>([]);
  /** Player 1's controls once others share the screen. */
  readonly firstControls = signal<ControlScheme>('keys-left');
  /** Seats still free in the party. */
  readonly seatsLeft = computed(() => MAX_PARTY - 1 - this.players().length - this.allies().length);
  /** Every player's controls from seat 0, or undefined for one player alone. */
  readonly controls = computed<readonly ControlScheme[] | undefined>(() =>
    this.players().length
      ? [this.firstControls(), ...this.players().map((p) => p.controls)]
      : undefined,
  );
  readonly lastRun = signal<FinishedRun | undefined>(undefined);

  isComplete(): boolean {
    return !!this.godId() && !!this.realmId();
  }

  addAlly(godId: string, skill: AllySkill = 'normal'): void {
    if (this.seatsLeft() > 0) this.allies.update((list) => [...list, { godId, skill }]);
  }

  /** Another player at this screen, on the first controls nobody uses yet. */
  addPlayer(godId: string): void {
    if (this.seatsLeft() <= 0) return;
    const used = [this.firstControls(), ...this.players().map((p) => p.controls)];
    const controls = CONTROL_SCHEMES.find((c) => !used.includes(c)) ?? 'pad-4';
    this.players.update((list) => [...list, { godId, controls }]);
  }

  removePlayer(index: number): void {
    this.players.update((list) => list.filter((_, i) => i !== index));
  }

  /** Seat 0 is player 1. Controls another player had are swapped to them, so no two share. */
  setControls(seat: number, controls: ControlScheme): void {
    const all = [this.firstControls(), ...this.players().map((p) => p.controls)];
    const other = all.indexOf(controls);
    if (other >= 0 && other !== seat) all[other] = all[seat];
    all[seat] = controls;
    this.firstControls.set(all[0]);
    this.players.update((list) => list.map((p, i) => ({ ...p, controls: all[i + 1] })));
  }

  setAllySkill(index: number, skill: AllySkill): void {
    this.allies.update((list) => list.map((a, i) => (i === index ? { ...a, skill } : a)));
  }

  removeAlly(index: number): void {
    this.allies.update((list) => list.filter((_, i) => i !== index));
  }

  rerollSeed(): void {
    this.seed.set(randomSeed());
  }

  newRunId(): string {
    return globalThis.crypto.randomUUID();
  }
}
