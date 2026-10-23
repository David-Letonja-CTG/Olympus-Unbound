import { Rng } from '../core/rng';
import { EncounterDefinition, EncounterReward } from '../data/types';
import { RunState } from '../sim/run-state';
import { ChaosSite, EncounterPhase, Enemy, SiteKind } from '../sim/types';
import { SpawnDirector } from '../spawning/director';
import { Observation } from './observe';

/** One encounter under way (spec: director-of-chaos / encounter lifecycle). Runtime state, never content. */
export interface Encounter {
  readonly uid: number;
  readonly def: EncounterDefinition;
  phase: EncounterPhase;
  /** Seconds left of the warning, of the resolving, or of the behavior's own clock while active. */
  timer: number;
  /** Seconds since it became active. */
  age: number;
  /** The ending it reached (an `outcomes` key), once resolving. */
  outcome?: string;
  /** Its reward and realm-state change have been applied: never twice. */
  settled: boolean;
  /** Where it happens; rewards appear here. */
  x: number;
  y: number;
  /** Monsters it brought: invaders, its hunter, its champion. */
  readonly enemies: Enemy[];
  /** Its marker in the world, if it has one now. */
  site?: ChaosSite;
  /** A contract's bonus, added to a successful ending. */
  bonus?: EncounterReward;
  /** Words for its announcements: a direction, a hunter's name, a boon's name. */
  label: string;
  /** The kind of its hunter or champion, chosen when it is announced. */
  monster: string;
  /** Behavior scratch: invasion stages, their clock and where the current one starts in `enemies`. */
  stage: number;
  stageTime: number;
  stageStart: number;
  /** A hunter's attack rhythm and walking speed. */
  attackTimer: number;
  attackIndex: number;
  speed: number;
}

/** What a behavior may do besides changing its own encounter. */
export interface EncounterContext {
  readonly state: RunState;
  readonly spawner: SpawnDirector;
  /** The Director's own stream (D5). */
  readonly rng: Rng;
  readonly observation: Observation;
  /** The party struggles: a recovery window, or low health. */
  readonly struggling: boolean;
  /** Places (or moves) the encounter's marker. */
  site(enc: Encounter, kind: SiteKind, x: number, y: number, radius: number, seconds: number): void;
  /** Ends the active phase with an ending of its behavior. */
  finish(enc: Encounter, outcome: string): void;
  /** Ends it with nothing given (no place to stand, nothing to spawn). */
  cancel(enc: Encounter, reason: string): void;
  /** A contract was accepted: starts the encounter it offers now, with a bonus. */
  offer(id: string, bonus: EncounterReward, x: number, y: number): boolean;
}

/** What the HUD shows of an encounter besides its name and phase. */
export interface EncounterView {
  readonly objective?: string;
  readonly left?: number;
  readonly seconds?: number;
  readonly risk?: string;
  readonly reward?: string;
}
