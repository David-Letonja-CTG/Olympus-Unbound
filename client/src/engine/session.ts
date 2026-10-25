import { CutsceneCaption } from './data/cutscene';
import { GameContent } from './data/types';
import type { DirectorReport } from './chaos/director';
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
  /** 0–1 (spec: music / music volume). */
  readonly musicVolume: number;
  readonly screenShake: boolean;
  readonly damageNumbers: boolean;
  /** Health bars over hurt monsters (spec: hud / enemy health bars). */
  readonly enemyHealthBars: boolean;
  readonly quality: GraphicsQuality;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sfxVolume: 0.6,
  musicVolume: 0.5,
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
  /**
   * The controls of each player at this screen, from seat 0 (spec: co-op / local co-op on one screen). Absent: one
   * player with the whole keyboard and the first gamepad.
   */
  readonly local?: readonly ControlScheme[];
}

/**
 * One local player's controls (spec: player-control / controls per local player): the whole keyboard (a player
 * alone), its left side (WASD) or its right side (arrows), or one gamepad; or, on a touch device, the touch controls
 * with the whole keyboard and the first gamepad (spec: phone-play / touch controls). `touch` is never a co-op seat's.
 */
export type ControlScheme =
  'keyboard' | 'touch' | 'keys-left' | 'keys-right' | 'pad-1' | 'pad-2' | 'pad-3' | 'pad-4';

export const CONTROL_SCHEMES: readonly ControlScheme[] = [
  'keys-left',
  'keys-right',
  'pad-1',
  'pad-2',
  'pad-3',
  'pad-4',
];

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
export type UiInput =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'confirm'
  | 'back'
  | 'pause'
  /** Opens or closes the build panel, also during play (a gamepad's Back/Select). */
  | 'build';

/** What a running game tells the application (D3). Frequent state arrives only as throttled `hud` snapshots. */
export type GameEvent =
  | { readonly type: 'loadProgress'; readonly progress: number; readonly stage?: LoadStage }
  | { readonly type: 'ready' }
  /** Player 1's HUD; on a shared screen also every local player's, in seat order (spec: hud). */
  | { readonly type: 'hud'; readonly hud: HudSnapshot; readonly locals?: readonly HudSnapshot[] }
  | { readonly type: 'choice'; readonly choice: UpgradeChoice }
  | {
      readonly type: 'choiceResolved';
      readonly offer: UpgradeOffer;
      readonly playerId: number;
      readonly choiceId: number;
    }
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
  /** Where the realm's landmark stands (scripts that film it). */
  readonly landmark?: { readonly x: number; readonly y: number };
  /** The kind of attack the boss is winding up, e.g. 'devour' (scripts that capture an attack). */
  readonly bossAttack?: string;
  /** The battle music's tier, 0 (Calm) to 4 (Titan) (spec: music). */
  readonly musicTier?: number;
  /** The canvas and the camera drawing it, in CSS pixels: they must match (spec: phone-play / the phone screen). */
  readonly view?: { readonly canvas: readonly number[]; readonly camera: readonly number[] };
  /** Where the merchant stands while it is in the realm (spec: merchant). */
  readonly merchant?: { readonly x: number; readonly y: number };
  /** Players still in the run (not left). */
  readonly players: number;
  /** Every player's position, in seat order. */
  readonly party: readonly { readonly x: number; readonly y: number; readonly alive: boolean }[];
  /** Realms cleared. */
  readonly depth: number;
  /** What the Director of Chaos knows (solo runs and a room's host; spec: director-of-chaos / debugging). */
  readonly director?: DirectorReport;
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
