import { InjectionToken } from '@angular/core';
import { CONTENT } from '../../content';
import { createGameSession, GameContent } from '../../engine';

/** All game content; a token so tests can provide small fixtures. */
export const GAME_CONTENT = new InjectionToken<GameContent>('GAME_CONTENT', {
  providedIn: 'root',
  factory: () => CONTENT,
});

/** Starts a game session; replaced by a stub in component tests. */
export const GAME_SESSION_FACTORY = new InjectionToken<typeof createGameSession>(
  'GAME_SESSION_FACTORY',
  {
    providedIn: 'root',
    factory: () => createGameSession,
  },
);
