import { Injectable, signal } from '@angular/core';
import { RunResult } from '../../engine';
import { RunRewards } from './save/rewards';

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

/** Bot allies a solo run may bring (spec: bot-allies / adding allies): a party of four at most. */
export const MAX_ALLIES = 3;
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
  /** Bot allies for the next solo run, in the order added. */
  readonly allies = signal<readonly Ally[]>([]);
  readonly lastRun = signal<FinishedRun | undefined>(undefined);

  isComplete(): boolean {
    return !!this.godId() && !!this.realmId();
  }

  addAlly(godId: string, skill: AllySkill = 'normal'): void {
    this.allies.update((list) => (list.length < MAX_ALLIES ? [...list, { godId, skill }] : list));
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
