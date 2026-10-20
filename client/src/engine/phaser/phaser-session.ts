import Phaser from 'phaser';
import { soundFiles } from '../audio/recorded';
import { MusicPlayer } from '../audio/music-player';
import { TierTracker } from '../audio/music-intensity';
import { SoundPlayer } from '../audio/sound-player';
import { ContentIndex } from '../data/content-index';
import { LocalDriver, RunDriver } from '../net/driver';
import { GuestDriver } from '../net/guest';
import { RoomHost } from '../net/host';
import { GameCommand, GameEvent, GameSession, GameSessionOptions, GameSettings } from '../session';
import { RunSimulation } from '../sim/run-simulation';
import { ArenaScene } from './arena-scene';

/**
 * The Phaser implementation of `GameSession` (D3): owns the Phaser game, the run's driver (the simulation, or a
 * room's host's world, D16) and the sound player, applies commands from the application and forwards events to it.
 */
export function startPhaserSession(options: GameSessionOptions): GameSession {
  const index = new ContentIndex(options.content);
  const driver = createDriver(options, index);
  const listeners = new Set<(event: GameEvent) => void>();
  let settings: GameSettings = options.settings;
  const sound = new SoundPlayer(settings.sfxVolume);
  sound.load(soundFiles(options.content.assets.files));
  // The battle music, on the same audio context with its own volume (spec: music / music volume).
  const music = {
    player: new MusicPlayer(sound.audioContext, settings.musicVolume),
    tracker: new TierTracker(),
  };
  const realm = driver.realm;
  // Events produced before anyone subscribed (e.g. `ready`) are replayed to the first subscriber.
  const backlog: GameEvent[] = [];
  const emit = (event: GameEvent) => {
    if (listeners.size === 0) backlog.push(event);
    for (const listener of listeners) listener(event);
  };

  const scene = new ArenaScene({
    driver,
    controls: options.local ?? ['keyboard'],
    settings: () => settings,
    emit,
    sound,
    music,
    backgroundColor: realm.backgroundColor,
  });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    backgroundColor: realm.backgroundColor,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    input: { keyboard: true, gamepad: true, mouse: false, touch: false },
    audio: { noAudio: true },
    banner: false,
    disableContextMenu: true,
    scene,
  });

  // Re-measure as soon as the game's box changes (an iPhone turned sideways, Safari's toolbars), rather than at
  // Phaser's next half-second check (spec: phone-play / the phone screen).
  const remeasure = () => {
    if (game.isBooted) game.scale.refresh();
  };
  const observer =
    typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(remeasure);
  observer?.observe(options.parent);
  window.visualViewport?.addEventListener('resize', remeasure);

  let destroyed = false;
  return {
    send(command: GameCommand): void {
      if (destroyed) return;
      switch (command.type) {
        case 'pause':
          if (driver.pause()) emit({ type: 'paused' });
          return;
        case 'resume':
          if (driver.resume()) emit({ type: 'resumed' });
          return;
        case 'chooseUpgrade':
          driver.choose(command.choiceId, command.index);
          return;
        case 'abandon':
          driver.abandon();
          return;
        case 'updateSettings':
          settings = command.settings;
          sound.setVolume(settings.sfxVolume);
          music.player.setVolume(settings.musicVolume);
          scene.applySettings(settings);
          return;
        case 'debug':
          if (options.debug) driver.debug(command.action);
          return;
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      for (const event of backlog.splice(0)) listener(event);
      return () => listeners.delete(listener);
    },
    inspect() {
      if (!options.debug) return undefined;
      const camera = game.isBooted ? scene.cameras?.main : undefined;
      return {
        ...driver.inspect(),
        musicTier: music.tracker.tier,
        view: camera && {
          canvas: [game.scale.gameSize.width, game.scale.gameSize.height],
          camera: [camera.width, camera.height],
        },
      };
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      window.visualViewport?.removeEventListener('resize', remeasure);
      listeners.clear();
      driver.destroy();
      music.player.destroy();
      sound.destroy();
      game.destroy(true);
    },
  };
}

/** A solo run, a room's host (who runs it for everyone) or a guest (who plays the host's run). */
function createDriver(options: GameSessionOptions, index: ContentIndex): RunDriver {
  const room = options.room;
  if (room?.role === 'guest') return new GuestDriver(index, options.run, room.slot, room.host);
  const sim = new RunSimulation(options.run, index);
  return new LocalDriver(
    sim,
    room ? new RoomHost(sim, room.guests) : undefined,
    options.local?.length ?? 1,
  );
}
