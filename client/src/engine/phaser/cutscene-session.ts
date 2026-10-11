import Phaser from 'phaser';
import { SoundPlayer } from '../audio/sound-player';
import { CutsceneEvent, CutsceneSession, CutsceneSessionOptions } from '../session';
import { CutsceneScene } from './cutscene-scene';

/** The Phaser implementation of `CutsceneSession` (D14). */
export function startCutsceneSession(options: CutsceneSessionOptions): CutsceneSession {
  const definition = options.content.cutscenes.find((c) => c.id === options.cutsceneId);
  if (!definition) throw new Error(`Unknown cutscene "${options.cutsceneId}".`);
  const realm = options.content.realms.find((r) => r.id === definition.realmId);
  const listeners = new Set<(event: CutsceneEvent) => void>();
  const backlog: CutsceneEvent[] = [];
  const emit = (event: CutsceneEvent) => {
    if (listeners.size === 0) backlog.push(event);
    for (const listener of listeners) listener(event);
  };
  const sound = new SoundPlayer(options.settings.sfxVolume);
  const scene = new CutsceneScene({
    definition,
    content: options.content,
    settings: () => options.settings,
    emit,
    sound,
  });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    backgroundColor: realm?.backgroundColor ?? 0x000000,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    input: { keyboard: true, gamepad: true, mouse: false, touch: false },
    audio: { noAudio: true },
    banner: false,
    disableContextMenu: true,
    scene,
  });

  let destroyed = false;
  return {
    subscribe(listener) {
      listeners.add(listener);
      for (const event of backlog.splice(0)) listener(event);
      return () => listeners.delete(listener);
    },
    skip(): void {
      if (!destroyed) scene.finish();
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
