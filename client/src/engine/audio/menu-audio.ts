import { MusicPlayer } from './music-player';
import { SoundPlayer } from './sound-player';

/** Seconds the Hall theme takes to fade in. */
const FADE_IN = 2;
/** After the fade-out (`MusicPlayer.end`, 2.5 s), the context is suspended: a run's audio has the device. */
const SUSPEND_AFTER_MS = 2700;

/** A menu control's sound: most controls, or a screen's main action (spec: hud / menu sounds). */
export type MenuCue = 'select' | 'confirm';

/** The menus' sound outside runs: the Hall theme (spec: music / the hall theme) and the controls' sounds. */
export interface MenuAudio {
  /** Fades the theme in, unless it is already playing; the menus' sounds may play. */
  play(): void;
  /** Fades the theme out and lets the audio sleep, unless it already does. */
  stop(): void;
  setMusicVolume(volume: number): void;
  setSfxVolume(volume: number): void;
  /** A control was pressed; on the press that first allows sound, it plays once the audio has woken. */
  cue(cue: MenuCue): void;
}

/**
 * Creates the menus' audio. One sound player (its own audio context, kept for the page's life) is made on the first
 * `play`; the Hall theme runs on its context. Browsers keep it silent until a gesture they count, which wakes it.
 * Without Web Audio (tests, old browsers) everything is silent and nothing throws.
 */
export function createMenuAudio(volumes: { musicVolume: number; sfxVolume: number }): MenuAudio {
  let { musicVolume, sfxVolume } = volumes;
  let sound: SoundPlayer | undefined;
  let music: MusicPlayer | undefined;
  let active = false;
  let suspend: ReturnType<typeof setTimeout> | undefined;

  const context = (): AudioContext | undefined => {
    sound ??= new SoundPlayer(sfxVolume, () => active);
    return sound.audioContext;
  };

  return {
    play() {
      if (active) return;
      active = true;
      const ctx = context();
      if (!ctx) return;
      if (suspend) clearTimeout(suspend);
      suspend = undefined;
      void ctx.resume().catch(() => undefined);
      music = new MusicPlayer(ctx, musicVolume, 'hall', FADE_IN);
    },
    stop() {
      if (!active) return;
      active = false;
      const fading = music;
      music = undefined;
      fading?.end();
      setTimeout(() => fading?.destroy(), SUSPEND_AFTER_MS);
      suspend = setTimeout(() => {
        if (!active) void sound?.audioContext?.suspend().catch(() => undefined);
      }, SUSPEND_AFTER_MS);
    },
    setMusicVolume(volume) {
      musicVolume = volume;
      music?.setVolume(volume);
    },
    setSfxVolume(volume) {
      sfxVolume = volume;
      sound?.setVolume(volume);
    },
    cue(cue) {
      const ctx = sound?.audioContext;
      if (!active || !sound || !ctx) return;
      const name = cue === 'confirm' ? 'menuConfirm' : 'menuSelect';
      if (ctx.state === 'running') return sound.play(name);
      void ctx
        .resume()
        .then(() => {
          if (active) sound?.play(name);
        })
        .catch(() => undefined);
    },
  };
}
