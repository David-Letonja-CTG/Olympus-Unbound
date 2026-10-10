import { GameContent } from './data/types';
import { DebugAction } from './sim/run-simulation';
import { RunConfig } from './sim/run-state';
import { AnnouncementKind, HudSnapshot, RunResult, UpgradeChoice, UpgradeOffer } from './sim/types';

/** Player-adjustable settings that affect a running game. */
export interface GameSettings {
  /** 0–1. */
  readonly sfxVolume: number;
  readonly screenShake: boolean;
  readonly damageNumbers: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sfxVolume: 0.6,
  screenShake: true,
  damageNumbers: true,
};

export interface GameSessionOptions {
  /** Element the game canvas is placed in; the game fills it. */
  readonly parent: HTMLElement;
  readonly content: GameContent;
  readonly run: RunConfig;
  readonly settings: GameSettings;
  /** Accept `debug` commands (development and end-to-end tests only). */
  readonly debug?: boolean;
}

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
  | { readonly type: 'ready' }
  | { readonly type: 'hud'; readonly hud: HudSnapshot }
  | { readonly type: 'choice'; readonly choice: UpgradeChoice }
  | { readonly type: 'choiceResolved'; readonly offer: UpgradeOffer }
  | { readonly type: 'paused' }
  | { readonly type: 'resumed' }
  | { readonly type: 'announcement'; readonly text: string; readonly kind: AnnouncementKind }
  | { readonly type: 'uiInput'; readonly input: UiInput }
  | { readonly type: 'runEnded'; readonly result: RunResult };

export type Unsubscribe = () => void;

/** Positions and counters for end-to-end tests; only available in debug sessions. */
export interface DebugSnapshot {
  readonly phase: string;
  readonly time: number;
  readonly player: { readonly x: number; readonly y: number; readonly health: number };
  readonly enemies: number;
  readonly bossAlive: boolean;
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
