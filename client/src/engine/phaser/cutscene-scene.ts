import Phaser from 'phaser';
import { SoundCue, SoundPlayer } from '../audio/sound-player';
import { mix } from '../art/canvas';
import { CutsceneTimeline } from '../cutscene/timeline';
import {
  CutsceneActor,
  CutsceneCaption,
  CutsceneCue,
  CutsceneDefinition,
  CutsceneLight,
} from '../data/cutscene';
import { GameContent } from '../data/types';
import { generateArena } from '../maps/generate-arena';
import { CutsceneEvent, GameSettings } from '../session';
import { applySprite, queueAssets, ResolvedSprite, SpriteResolver } from './assets';
import { Atmosphere, LightMap, QUALITY, viewAround } from './atmosphere';
import { Effects } from './effects';
import { InputReader } from './input';
import { SHADOW_TEXTURE, registerTextures } from './textures';
import { DEPTH, WorldView } from './world-view';

const VIEW_WIDTH = 1440;
const VIEW_HEIGHT = 840;
const MAX_FRAME_SECONDS = 0.25;

const SOUND_CUES: readonly SoundCue[] = [
  'strike',
  'impact',
  'bossRoar',
  'charge',
  'telegraph',
  'synergy',
  'victory',
  'defeat',
  'elite',
];

export interface CutsceneHost {
  readonly definition: CutsceneDefinition;
  readonly content: GameContent;
  readonly settings: () => GameSettings;
  readonly emit: (event: CutsceneEvent) => void;
  readonly sound: SoundPlayer;
}

interface Actor {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  readonly resolved: ResolvedSprite;
  readonly scale: number;
  readonly light?: CutsceneLight;
  readonly seed: number;
  moving: number;
  /** Where the sprite was last frame, for its walking speed. */
  lastX: number;
  lastY: number;
}

interface PersistentLight {
  readonly x: number;
  readonly y: number;
  readonly light: CutsceneLight;
  readonly until: number;
  readonly seed: number;
}

/**
 * Plays an in-engine cutscene (D14, spec: intro-cutscene): the realm's arena from the scene's seed, lit and fogged
 * like a run, with actors, hordes, lightning and lights driven by the data-defined timeline. No simulation runs.
 */
export class CutsceneScene extends Phaser.Scene {
  private timeline!: CutsceneTimeline;
  private resolver!: SpriteResolver;
  private view!: WorldView;
  private effects!: Effects;
  private lightMap!: LightMap;
  private atmosphere!: Atmosphere;
  private input$!: InputReader;
  private fade!: Phaser.GameObjects.Rectangle;
  private failedAssets = new Set<string>();
  private readonly actors = new Map<string, Actor>();
  private readonly horde: Actor[] = [];
  private readonly sceneLights = new Map<string, PersistentLight>();
  private origin = { x: 0, y: 0 };
  private worldSize = { width: 0, height: 0 };
  private t = -1e-6;
  private captionKey = '';
  private ended = false;
  private nextSeed = 1;

  constructor(private readonly host: CutsceneHost) {
    super('cutscene');
  }

  preload(): void {
    this.failedAssets = queueAssets(this, this.host.content.assets, (progress) =>
      this.host.emit({ type: 'loadProgress', progress }),
    );
  }

  create(): void {
    const { definition, content } = this.host;
    const realm = content.realms.find((r) => r.id === definition.realmId) ?? content.realms[0];
    this.timeline = new CutsceneTimeline(definition);
    registerTextures(this, content, [realm.map]);
    const arena = generateArena(realm.map, definition.seed);
    this.origin = arena.spawn;
    this.worldSize = { width: arena.width, height: arena.height };
    this.resolver = new SpriteResolver(this, content.assets, this.failedAssets);
    this.view = new WorldView(this, this.resolver, arena, realm.map);
    this.effects = new Effects(this);
    this.effects.damageNumbers = false;
    // The scene's own darkness: the realm's ambient light scaled to the cutscene's level.
    const ambient = mix(
      0x000000,
      realm.atmosphere.ambient,
      Math.min(1.4, definition.ambient / 0.38),
    );
    this.lightMap = new LightMap(this, ambient);
    this.atmosphere = new Atmosphere(this, arena.width, arena.height, realm.atmosphere);
    this.fade = this.add.rectangle(0, 0, 10, 10, 0x000000, 1).setOrigin(0).setDepth(160000);
    this.input$ = new InputReader(this);
    this.cameras.main
      .setBackgroundColor(realm.backgroundColor)
      .setBounds(0, 0, arena.width, arena.height);
    this.applySettings(this.host.settings());
    this.host.emit({ type: 'ready' });
  }

  applySettings(settings: GameSettings): void {
    const profile = QUALITY[settings.quality];
    this.effects.particleScale = profile.particles;
    this.view.setQuality(profile);
    this.lightMap.setQuality(profile);
    this.atmosphere.setQuality(profile);
  }

  /** Ends the scene once, from the timeline or a skip. */
  finish(): void {
    if (this.ended) return;
    this.ended = true;
    this.host.emit({ type: 'captions', captions: [] });
    this.host.emit({ type: 'ended' });
  }

  override update(): void {
    if (this.ended) return;
    const dt = Math.min(this.game.loop.rawDelta / 1000, MAX_FRAME_SECONDS);
    const previous = this.t;
    this.t = Math.min(this.timeline.duration, this.t + dt);
    for (const cue of this.timeline.cuesBetween(previous, this.t)) this.run(cue);
    for (const ui of this.input$.uiInputs()) this.host.emit({ type: 'uiInput', input: ui });
    if (this.input$.takePauseRequest()) this.host.emit({ type: 'uiInput', input: 'pause' });

    const camera = this.cameras.main;
    const shot = this.timeline.cameraAt(this.t);
    const fit = Math.max(
      0.35,
      Math.min(this.scale.gameSize.width / VIEW_WIDTH, this.scale.gameSize.height / VIEW_HEIGHT),
    );
    camera.setZoom(fit * shot.zoom);
    const cx = this.origin.x + shot.x;
    const cy = this.origin.y + shot.y;
    camera.centerOn(cx, cy);
    const view = viewAround(camera, cx, cy, this.worldSize.width, this.worldSize.height);

    const time = this.time.now;
    this.view.addArenaLights(this.lightMap, time);
    this.animateActors(time);
    for (const [id, l] of this.sceneLights) {
      if (this.t > l.until) {
        this.sceneLights.delete(id);
        continue;
      }
      const flicker = l.light.flicker
        ? 1 - l.light.flicker * 0.5 * (1 + Math.sin(time / 80 + l.seed)) * 0.5
        : 1;
      this.lightMap.add(l.x, l.y, l.light.radius, l.light.color, l.light.intensity * flicker, 6);
    }
    this.effects.update(undefined, dt, camera, this.lightMap);
    this.atmosphere.update(camera, view, dt);
    this.lightMap.render(view);
    this.fade
      .setPosition(view.x, view.y)
      .setSize(view.width, view.height)
      .setAlpha(1 - this.timeline.fadeAt(this.t));

    const captions = this.timeline.captionsAt(this.t);
    const key = captions.map((c: CutsceneCaption) => c.text).join('|');
    if (key !== this.captionKey) {
      this.captionKey = key;
      this.host.emit({ type: 'captions', captions });
    }
    if (this.t >= this.timeline.duration) this.finish();
  }

  private run(cue: CutsceneCue): void {
    const o = this.origin;
    switch (cue.type) {
      case 'spawn':
        this.actors.set(cue.actor.id, this.spawn(cue.actor));
        return;
      case 'move': {
        const actor = this.actors.get(cue.actor);
        if (!actor) return;
        actor.moving = cue.duration;
        actor.sprite.setFlipX(
          o.x + cue.x < actor.sprite.x
            ? actor.resolved.faces === 'right'
            : actor.resolved.faces === 'left',
        );
        this.tweens.add({
          targets: actor.sprite,
          x: o.x + cue.x,
          y: o.y + cue.y,
          duration: cue.duration * 1000,
          ease: 'Sine.inOut',
        });
        return;
      }
      case 'remove': {
        const actor = this.actors.get(cue.actor);
        if (!actor) return;
        this.actors.delete(cue.actor);
        this.fall(actor, cue.color ?? 0xffd27a);
        return;
      }
      case 'horde':
        for (let i = 0; i < cue.count; i++) {
          const jitter = () => (Math.random() - 0.5) * 2 * cue.spread;
          const actor = this.spawn({
            id: '',
            sprite: cue.sprite,
            x: cue.fromX + jitter(),
            y: cue.fromY + jitter(),
          });
          const travel = cue.duration * (0.75 + Math.random() * 0.5);
          actor.moving = travel;
          actor.sprite.setFlipX(
            cue.toX < cue.fromX
              ? actor.resolved.faces === 'right'
              : actor.resolved.faces === 'left',
          );
          this.tweens.add({
            targets: actor.sprite,
            x: o.x + cue.toX + jitter(),
            y: o.y + cue.toY + jitter(),
            duration: travel * 1000,
            delay: Math.random() * 1500,
          });
          this.horde.push(actor);
        }
        return;
      case 'strike': {
        const x = o.x + cue.x;
        const y = o.y + cue.y;
        const radius = cue.radius ?? 80;
        this.effects.handle({
          type: 'attack',
          behavior: 'strike',
          weaponId: '',
          element: 'lightning',
          color: 0xdcefff,
          x,
          y,
          radius,
          angle: 0,
          arc: 0,
        });
        this.host.sound.play('strike');
        // The storm smites the horde around the strike.
        for (let i = this.horde.length - 1; i >= 0; i--) {
          const h = this.horde[i];
          if ((h.sprite.x - x) ** 2 + (h.sprite.y - y) ** 2 <= (radius + 30) ** 2) {
            this.horde.splice(i, 1);
            this.fall(h, 0x9ad0ff);
          }
        }
        return;
      }
      case 'light':
        this.sceneLights.set(cue.id, {
          x: o.x + cue.x,
          y: o.y + cue.y,
          light: cue.light,
          until: cue.duration ? cue.at + cue.duration : Infinity,
          seed: this.nextSeed++,
        });
        return;
      case 'burst':
        this.effects.burstAt(o.x + cue.x, o.y + cue.y, cue.color, cue.count, true);
        return;
      case 'shake':
        if (this.host.settings().screenShake)
          this.cameras.main.shake(cue.duration * 1000, cue.intensity);
        return;
      case 'sound':
        if ((SOUND_CUES as readonly string[]).includes(cue.cue))
          this.host.sound.play(cue.cue as SoundCue);
        return;
      case 'camera':
      case 'fade':
        return; // Read continuously from the timeline.
    }
  }

  private spawn(a: CutsceneActor): Actor {
    const resolved = this.resolver.resolve(a.sprite);
    const sprite = this.add.sprite(
      this.origin.x + a.x,
      this.origin.y + a.y,
      resolved.texture,
      resolved.frame,
    );
    const scale = a.scale ?? 1;
    applySprite(sprite, resolved, scale, a.facing === 'left', 'idle');
    const shadow = this.add
      .image(sprite.x, sprite.y, SHADOW_TEXTURE)
      .setDepth(DEPTH.shadow)
      .setScale(0.8 * scale);
    return {
      sprite,
      shadow,
      resolved,
      scale,
      light: a.light,
      seed: this.nextSeed++,
      moving: 0,
      lastX: sprite.x,
      lastY: sprite.y,
    };
  }

  private fall(actor: Actor, color: number): void {
    this.effects.burstAt(actor.sprite.x, actor.sprite.y, color, 18, true);
    this.effects.burstAt(actor.sprite.x, actor.sprite.y, 0x5a5048, 10);
    this.tweens.add({
      targets: [actor.sprite, actor.shadow],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        actor.sprite.destroy();
        actor.shadow.destroy();
      },
    });
  }

  private animateActors(time: number): void {
    const dt = Math.min(this.game.loop.rawDelta / 1000, MAX_FRAME_SECONDS);
    for (const actor of [...this.actors.values(), ...this.horde]) {
      const { sprite } = actor;
      if (!sprite.active) continue;
      actor.moving = Math.max(0, actor.moving - dt);
      const moving = actor.moving > 0;
      const speed = dt > 0 ? Math.hypot(sprite.x - actor.lastX, sprite.y - actor.lastY) / dt : 0;
      actor.lastX = sprite.x;
      actor.lastY = sprite.y;
      if (actor.resolved.animations.walk || actor.resolved.animations.idle) {
        applySprite(
          sprite,
          actor.resolved,
          actor.scale,
          sprite.flipX === (actor.resolved.faces === 'right'),
          moving ? 'walk' : 'idle',
          speed,
        );
      }
      sprite
        .setDepth(sprite.y)
        .setRotation(
          actor.resolved.codeDrawn && moving ? Math.sin(time / 90 + actor.seed) * 0.06 : 0,
        );
      actor.shadow.setPosition(sprite.x, sprite.y + 14 * actor.scale);
      if (actor.light)
        this.lightMap.add(
          sprite.x,
          sprite.y,
          actor.light.radius,
          actor.light.color,
          actor.light.intensity,
          7,
        );
    }
  }
}
