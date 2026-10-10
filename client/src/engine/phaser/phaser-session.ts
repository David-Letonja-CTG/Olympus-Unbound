import Phaser from 'phaser';
import { SoundPlayer } from '../audio/sound-player';
import { ContentIndex } from '../data/content-index';
import { GameCommand, GameEvent, GameSession, GameSessionOptions, GameSettings } from '../session';
import { RunSimulation } from '../sim/run-simulation';
import { ArenaScene } from './arena-scene';

/**
 * The Phaser implementation of `GameSession` (D3): owns the Phaser game, the simulation and the sound player,
 * applies commands from the application and forwards events to it.
 */
export function startPhaserSession(options: GameSessionOptions): GameSession {
  const index = new ContentIndex(options.content);
  const sim = new RunSimulation(options.run, index);
  const listeners = new Set<(event: GameEvent) => void>();
  let settings: GameSettings = options.settings;
  const sound = new SoundPlayer(settings.sfxVolume);
  const realm = index.realm(options.run.realmId);
  // Events produced before anyone subscribed (e.g. `ready`) are replayed to the first subscriber.
  const backlog: GameEvent[] = [];
  const emit = (event: GameEvent) => {
    if (listeners.size === 0) backlog.push(event);
    for (const listener of listeners) listener(event);
  };

  const scene = new ArenaScene({
    sim,
    settings: () => settings,
    emit,
    sound,
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

  let destroyed = false;
  return {
    send(command: GameCommand): void {
      if (destroyed) return;
      switch (command.type) {
        case 'pause':
          if (sim.pause()) emit({ type: 'paused' });
          return;
        case 'resume':
          if (sim.resume()) emit({ type: 'resumed' });
          return;
        case 'chooseUpgrade':
          sim.choose(command.index, command.choiceId);
          return;
        case 'abandon':
          sim.abandon();
          return;
        case 'updateSettings':
          settings = command.settings;
          sound.setVolume(settings.sfxVolume);
          scene.applySettings(settings);
          return;
        case 'debug':
          if (options.debug) sim.debug(command.action);
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
      const p = sim.state.players[0];
      return {
        phase: sim.phase,
        time: sim.state.time,
        player: { x: p.x, y: p.y, health: p.health },
        enemies: sim.state.enemies.length,
        bossAlive: !!sim.state.boss && !sim.state.boss.dead,
      };
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
      sound.destroy();
      game.destroy(true);
    },
  };
}
