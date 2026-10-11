import { Injectable, InjectionToken, inject } from '@angular/core';
import { GameContent, GraphicsQuality } from '../../../engine';
import { GAME_CONTENT } from '../game-content';
import { detectQuality } from '../graphics-quality';
import { parseSave, SaveData } from './save-data';

export const SAVE_KEY = 'olympus-unbound/save';

/** Browser storage behind a token so tests can supply their own (or a broken one). */
export const SAVE_STORAGE = new InjectionToken<Pick<Storage, 'getItem' | 'setItem'> | null>(
  'SAVE_STORAGE',
  {
    providedIn: 'root',
    factory: () => {
      try {
        return globalThis.localStorage ?? null;
      } catch {
        return null;
      }
    },
  },
);

/**
 * Loads and writes the single save record (D8). When storage is unavailable or throws, progress is kept in
 * memory for the session (spec: meta-progression / robust loading).
 */
@Injectable({ providedIn: 'root' })
export class SaveStore {
  private readonly storage = inject(SAVE_STORAGE);
  private readonly content: GameContent = inject(GAME_CONTENT);
  private memory: string | null = null;
  private detected: GraphicsQuality | undefined;

  load(): SaveData {
    let raw: string | null = this.memory;
    try {
      raw = this.storage?.getItem(SAVE_KEY) ?? this.memory;
    } catch {
      // Storage blocked: fall back to what this session wrote.
    }
    return parseSave(raw, this.content, this.defaultQuality());
  }

  write(save: SaveData): void {
    const raw = JSON.stringify(save);
    this.memory = raw;
    try {
      this.storage?.setItem(SAVE_KEY, raw);
    } catch {
      // Storage full or blocked: the in-memory copy keeps the session going.
    }
  }

  /** Detected once per session, only when a save has no quality yet. */
  private defaultQuality(): GraphicsQuality {
    this.detected ??= detectQuality();
    return this.detected;
  }
}
