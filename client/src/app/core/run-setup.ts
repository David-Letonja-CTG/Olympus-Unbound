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

export interface FinishedRun {
  readonly result: RunResult;
  readonly rewards: RunRewards;
}

/** What the player chose for the next run, and how the last run went. Kept in memory only. */
@Injectable({ providedIn: 'root' })
export class RunSetup {
  readonly godId = signal<string | undefined>(undefined);
  readonly realmId = signal<string | undefined>(undefined);
  readonly seed = signal<number>(randomSeed());
  readonly lastRun = signal<FinishedRun | undefined>(undefined);

  isComplete(): boolean {
    return !!this.godId() && !!this.realmId();
  }

  rerollSeed(): void {
    this.seed.set(randomSeed());
  }

  newRunId(): string {
    return globalThis.crypto.randomUUID();
  }
}
