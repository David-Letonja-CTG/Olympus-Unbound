import { CutsceneCaption } from './data/cutscene';
import { GameContent } from './data/types';
import { PeerLink } from './net/link';
import { DebugAction } from './sim/run-simulation';
import { RunConfig } from './sim/run-state';
import { AnnouncementKind, HudSnapshot, RunResult, UpgradeChoice, UpgradeOffer } from './sim/types';

/** Graphics quality (spec: visual-atmosphere): lights, fog, bloom, shading and particle density. */
export type GraphicsQuality = 'low' | 'medium' | 'high';

/**
 * What a run is loading (spec: run-loading / progress stages): the art, the realm (map and ground), the scene, and in
 * a room the other members (spec: rooms / lobby).
 */
export type LoadStage = 'art' | 'realm' | 'scene' | 'party';
export const GRAPHICS_QUALITIES: readonly GraphicsQuality[] = ['low', 'medium', 'high'];

/** Player-adjustable settings that affect a running game. */
export interface GameSettings {
  /** 0–1. */
  readonly sfxVolume: number;
  readonly screenShake: boolean;
  readonly damageNumbers: boolean;
  /** Health bars over hurt monsters (spec: hud / enemy health bars). */
  readonly enemyHealthBars: boolean;
  readonly quality: GraphicsQuality;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sfxVolume: 0.6,
  screenShake: true,
  damageNumbers: true,
  enemyHealthBars: true,
  quality: 'medium',
};

export interface GameSessionOptions {
  /** Element the game canvas is placed in; the game fills it. */
  readonly parent: HTMLElement;
  readonly content: GameContent;
  readonly run: RunConfig;
  readonly settings: GameSettings;
  /** Accept `debug` commands (development and end-to-end tests only). */
  readonly debug?: boolean;
  /** A room's run (D16): the host runs it for everyone; a guest plays the host's run. Absent: a solo run. */
  readonly room?: RoomSeat;
}

/**
 * This browser's part in a room's run (D16). The host has a link to every guest by seat (`run.party` order, the host
 * in seat 0); a guest has a link to the host and knows its seat.
 */
export type RoomSeat =
  | { readonly role: 'host'; readonly guests: ReadonlyMap<number, PeerLink> }
  | { readonly role: 'guest'; readonly slot: number; readonly host: PeerLink };

/** What the application may ask of a running game (D3). */
export type GameCommand =
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }
  | { readonly type: 'chooseUpgrade'; readonly choiceId: number; readonly index: number }
  | { readonly type: 'abandon' }
  | { readonly type: 'updateSettings'; readonly settings: GameSettings }
  | { readonly type: 'debug'; readonly action: DebugAction };

/** Menu navigation from a gamepad, forwarded while a choice or the pause menu is open. */
export type UiInput = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause';

/** What a running game tells the application (D3). Frequent state arrives only as throttled `hud` snapshots. */
export type GameEvent =
  | { readonly type: 'loadProgress'; readonly progress: number; readonly stage?: LoadStage }
  | { readonly type: 'ready' }
  | { readonly type: 'hud'; readonly hud: HudSnapshot }
  | { readonly type: 'choice'; readonly choice: UpgradeChoice }
  | { readonly type: 'choiceResolved'; readonly offer: UpgradeOffer; readonly playerId: number }
  | { readonly type: 'paused' }
  | { readonly type: 'resumed' }
  | { readonly type: 'announcement'; readonly text: string; readonly kind: AnnouncementKind }
  | { readonly type: 'uiInput'; readonly input: UiInput }
  /** The party passed a gate: the next realm is being built (spec: endless-run, run-loading). */
  | { readonly type: 'realmEntered'; readonly realmId: string; readonly depth: number }
  | { readonly type: 'runEnded'; readonly result: RunResult };

export type Unsubscribe = () => void;

/** Positions and counters for end-to-end tests; only available in debug sessions. */
export interface DebugSnapshot {
  readonly phase: string;
  readonly time: number;
  readonly player: { readonly x: number; readonly y: number; readonly health: number };
  readonly enemies: number;
  readonly bossAlive: boolean;
  /** Where the living boss is (solo runs and a room's host), for scripts that wait for it to come into view. */
  readonly boss?: { readonly x: number; readonly y: number };
  /** Where the merchant stands while it is in the realm (spec: merchant). */
  readonly merchant?: { readonly x: number; readonly y: number };
  /** Players still in the run (not left). */
  readonly players: number;
  /** Every player's position, in seat order. */
  readonly party: readonly { readonly x: number; readonly y: number; readonly alive: boolean }[];
  /** Realms cleared. */
  readonly depth: number;
}

/** A running game. Created by `createGameSession`; the only handle the application has on gameplay. */
export interface GameSession {
  send(command: GameCommand): void;
  subscribe(listener: (event: GameEvent) => void): Unsubscribe;
  /** Debug sessions only: a snapshot for tests (undefined otherwise). */
  inspect(): DebugSnapshot | undefined;
  /** Stops the game and frees its canvas, textures and audio. */
  destroy(): void;
}

/**
 * Starts a game in `options.parent`. Phaser is loaded on demand, so it never weighs on the menus (design §4).
 */
export async function createGameSession(options: GameSessionOptions): Promise<GameSession> {
  const { startPhaserSession } = await import('./phaser/phaser-session');
  return startPhaserSession(options);
}

export interface CutsceneSessionOptions {
  readonly parent: HTMLElement;
  readonly content: GameContent;
  readonly cutsceneId: string;
  readonly settings: GameSettings;
}

/** What a playing cutscene tells the application (D14). Captions are rendered by Angular. */
export type CutsceneEvent =
  | { readonly type: 'loadProgress'; readonly progress: number }
  | { readonly type: 'ready' }
  | { readonly type: 'captions'; readonly captions: readonly CutsceneCaption[] }
  | { readonly type: 'uiInput'; readonly input: UiInput }
  | { readonly type: 'ended' };

/** A playing in-engine cutscene (spec: intro-cutscene). */
export interface CutsceneSession {
  subscribe(listener: (event: CutsceneEvent) => void): Unsubscribe;
  /** Ends the scene at once; `ended` follows. */
  skip(): void;
  destroy(): void;
}

/** Plays a cutscene from content in `options.parent`; Phaser is loaded on demand like for a run. */
export async function createCutsceneSession(
  options: CutsceneSessionOptions,
): Promise<CutsceneSession> {
  const { startCutsceneSession } = await import('./phaser/cutscene-session');
  return startCutsceneSession(options);
}
