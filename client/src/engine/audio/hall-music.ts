import { MusicPlayer } from './music-player';

/** Seconds the Hall theme takes to fade in. */
const FADE_IN = 2;
/** After the fade-out (`MusicPlayer.end`, 2.5 s), the context is suspended: a run's audio has the device. */
const SUSPEND_AFTER_MS = 2700;

/** The Hall theme outside runs (spec: music / the hall theme), for the menus. */
export interface HallMusic {
  /** Fades the theme in, unless it is already playing. */
  play(): void;
  /** Fades the theme out, unless it is already stopped. */
  stop(): void;
  setVolume(volume: number): void;
}

/**
 * Creates the menus' music. Its audio context is made on the first `play` and kept for the page's life; browsers
 * keep it silent until the player's first key press, click or touch, which resume it. Without Web Audio (tests, old
 * browsers) it stays silent and never throws.
 */
export function createHallMusic(volume: number): HallMusic {
  let ctx: AudioContext | undefined;
  let player: MusicPlayer | undefined;
  let suspend: ReturnType<typeof setTimeout> | undefined;

  const context = (): AudioContext | undefined => {
    if (ctx) return ctx;
    try {
      ctx = new AudioContext();
    } catch {
      return undefined;
    }
    const unlock = () => {
      if (player) void ctx?.resume().catch(() => undefined);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchend', unlock);
    };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('touchend', unlock);
    return ctx;
  };

  return {
    play() {
      if (player) return;
      const audio = context();
      if (!audio) return;
      if (suspend) clearTimeout(suspend);
      suspend = undefined;
      void audio.resume().catch(() => undefined);
      player = new MusicPlayer(audio, volume, 'hall', FADE_IN);
    },
    stop() {
      if (!player) return;
      const fading = player;
      player = undefined;
      fading.end();
      setTimeout(() => fading.destroy(), SUSPEND_AFTER_MS);
      suspend = setTimeout(() => {
        if (!player) void ctx?.suspend().catch(() => undefined);
      }, SUSPEND_AFTER_MS);
    },
    setVolume(next: number) {
      volume = next;
      player?.setVolume(next);
    },
  };
}
