import Phaser from 'phaser';
import { Ambience as AmbienceConfig } from '../data/types';
import { ArenaData } from '../maps/generate-arena';
import { FramePlayer } from '../sim/world-frame';
import { SpriteResolver } from './assets';
import { ATMOSPHERE_DEPTH, LightMap, QualityProfile, QUALITY, ViewRect } from './atmosphere';
import { FOG_TEXTURE } from './textures';
import { Flock, Storm } from './wildlife';
import { DEPTH } from './world-view';

type Weather = NonNullable<AmbienceConfig['weather']>;

/** Smoke puffs and water glints per second at High; Medium draws half (spec: visual-atmosphere / ambient life). */
const SMOKE_RATE = 12;
const GLINT_RATE = 40;

/** Per kind of weather: its sprite (or the soft spark), fall, life, size and blend. */
function weatherConfig(w: Weather): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  const drift = { min: w.wind * 0.6, max: w.wind * 1.4 };
  switch (w.kind) {
    case 'leaves':
      return {
        lifespan: { min: 4000, max: 7000 },
        speedX: drift,
        speedY: { min: 18, max: 40 },
        rotate: { start: 0, end: 540 },
        scale: { min: 0.5, max: 0.9 },
        alpha: { start: 0.95, end: 0 },
      };
    case 'ash':
      return {
        lifespan: { min: 5000, max: 8000 },
        speedX: drift,
        speedY: { min: 12, max: 30 },
        scale: { start: 0.22, end: 0.12 },
        alpha: { start: 0.7, end: 0 },
        tint: w.color,
      };
    case 'fireflies':
      return {
        lifespan: { min: 2500, max: 4500 },
        speedX: { min: -14 + w.wind, max: 14 + w.wind },
        speedY: { min: -14, max: 14 },
        scale: { start: 0.28, end: 0.1 },
        alpha: { start: 1, end: 0 },
        tint: w.color,
        blendMode: 'ADD',
      };
    case 'spray':
      return {
        lifespan: { min: 900, max: 1600 },
        speedX: { min: w.wind * 1.5, max: w.wind * 3 },
        speedY: { min: -10, max: 10 },
        scaleX: { start: 0.5, end: 0.1 },
        scaleY: { start: 0.12, end: 0.05 },
        alpha: { start: 0.6, end: 0 },
        tint: w.color,
      };
    case 'dust':
      return {
        lifespan: { min: 4000, max: 7000 },
        speedX: drift,
        speedY: { min: -6, max: 6 },
        scale: { start: 0.16, end: 0.08 },
        alpha: { start: 0.5, end: 0 },
        tint: w.color,
        blendMode: 'ADD',
      };
  }
}

/**
 * The realms' ambient life (spec: visual-atmosphere / ambient life): weather, lightning, cloud shadows, glints on
 * water, smoke from fires, creatures that flee and (in `WorldView`) swaying trees. View only: the simulation never
 * sees it, nothing of it is created on Low, and Medium draws half.
 */
export class Ambience {
  private profile: QualityProfile = QUALITY.low;
  private weather?: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly weatherArea = new Phaser.Geom.Rectangle(0, 0, 1, 1);
  private readonly storm?: Storm;
  private clouds?: Phaser.GameObjects.TileSprite;
  private glints?: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke?: Phaser.GameObjects.Particles.ParticleEmitter;
  private flock?: Flock;
  private creatures: Phaser.GameObjects.Sprite[] = [];
  /** Terrain indexes of the water that glints. */
  private readonly water = new Set<number>();
  private glintDue = 0;
  private smokeDue = 0;
  private fires: readonly { x: number; y: number }[] = [];
  private firesAt = -Infinity;
  private time = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly resolver: SpriteResolver,
    private readonly config: AmbienceConfig | undefined,
    private readonly arena: ArenaData,
    private readonly fireLights: () => readonly { x: number; y: number }[],
    private readonly thunder: () => void,
  ) {
    if (config?.lightning) this.storm = new Storm(config.lightning.every);
    for (const id of config?.glints?.terrain ?? []) {
      const i = arena.terrainTypes.indexOf(id);
      if (i >= 0) this.water.add(i);
    }
  }

  /** Builds what the quality allows, once; lowering the quality hides it again. */
  setQuality(profile: QualityProfile): void {
    this.profile = profile;
    const on = profile.ambience > 0;
    const c = this.config;
    if (on && c) this.build(c);
    this.weather?.setVisible(on);
    if (this.weather)
      this.weather.frequency = on ? 1000 / ((c?.weather?.rate ?? 1) * profile.ambience) : -1;
    this.clouds?.setVisible(profile.clouds);
    this.glints?.setVisible(on);
    this.smoke?.setVisible(on);
    const count = Math.round((c?.wildlife?.count ?? 0) * profile.ambience);
    this.creatures.forEach((s, i) => s.setVisible(on && i < count).setActive(i < count));
  }

  update(
    dt: number,
    view: ViewRect,
    focus: { x: number; y: number },
    players: readonly FramePlayer[],
    lights: LightMap,
  ): void {
    if (this.profile.ambience <= 0 || !this.config) return;
    this.time += dt;
    const c = this.config;
    if (this.weather) {
      // Upwind of the view, so it drifts across it.
      this.weather.setPosition(view.x - (c.weather?.wind ?? 0), view.y - 20);
      this.weatherArea.setSize(view.width, view.height);
    }
    if (this.storm && c.lightning) {
      const { flash, thunder } = this.storm.update(dt);
      if (flash > 0) {
        const radius = Math.hypot(view.width, view.height);
        lights.add(
          view.x + view.width / 2,
          view.y + view.height / 2,
          radius,
          c.lightning.color,
          flash * 0.85,
          3,
        );
      }
      if (thunder) this.thunder();
    }
    if (this.clouds?.visible) {
      this.clouds.setPosition(view.x, view.y).setSize(view.width, view.height);
      this.clouds.tilePositionX = view.x / 3 + this.time * 6;
      this.clouds.tilePositionY = view.y / 3 + this.time * 2;
    }
    if (this.glints) this.emitGlints(dt, view);
    if (this.smoke) this.emitSmoke(dt, view);
    if (this.flock) this.moveCreatures(dt, view, focus, players);
  }

  private build(c: AmbienceConfig): void {
    const scene = this.scene;
    if (c.weather && !this.weather) {
      const leaf = c.weather.sprite ? this.resolver.resolve(c.weather.sprite) : undefined;
      this.weather = scene.add
        .particles(0, 0, leaf?.texture ?? 'spark', {
          ...(leaf?.frame !== undefined ? { frame: leaf.frame } : {}),
          ...weatherConfig(c.weather),
          frequency: -1,
        })
        .setDepth(
          c.weather.kind === 'fireflies' ? ATMOSPHERE_DEPTH.embers : ATMOSPHERE_DEPTH.fog - 2,
        );
      this.weather.addEmitZone({
        type: 'random',
        source: this.weatherArea,
      } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData);
    }
    if (c.clouds && !this.clouds) {
      this.clouds = scene.add
        .tileSprite(0, 0, 1, 1, FOG_TEXTURE)
        .setOrigin(0)
        .setTileScale(4)
        .setTint(0x303848)
        .setAlpha(c.clouds)
        .setBlendMode(Phaser.BlendModes.MULTIPLY)
        .setDepth(DEPTH.decoration + 8);
    }
    if (c.glints && this.water.size > 0 && !this.glints) {
      this.glints = scene.add
        .particles(0, 0, 'spark', {
          lifespan: { min: 400, max: 900 },
          scaleX: { start: 0.5, end: 0.1 },
          scaleY: { start: 0.14, end: 0.04 },
          alpha: { start: 0.8, end: 0 },
          tint: c.glints.color,
          blendMode: 'ADD',
          frequency: -1,
        })
        .setDepth(DEPTH.decoration + 6);
    }
    if (c.smoke !== undefined && !this.smoke) {
      this.smoke = scene.add
        .particles(0, 0, 'soft', {
          lifespan: { min: 2200, max: 3400 },
          speedX: { min: (c.weather?.wind ?? 0) * 0.4 - 6, max: (c.weather?.wind ?? 0) * 0.6 + 6 },
          speedY: { min: -36, max: -20 },
          scale: { start: 0.12, end: 0.5 },
          alpha: { start: 0.22, end: 0 },
          tint: c.smoke,
          frequency: -1,
        })
        .setDepth(ATMOSPHERE_DEPTH.fog - 1);
    }
    if (c.wildlife && !this.flock) {
      this.flock = new Flock(c.wildlife.count, c.wildlife.kind);
      const r = this.resolver.resolve(c.wildlife.sprite);
      this.creatures = this.flock.creatures.map(() =>
        scene.add
          .sprite(0, 0, r.texture, r.frame)
          .setOrigin(0.5)
          .setScale(r.scale)
          .setVisible(false),
      );
    }
  }

  private emitGlints(dt: number, view: ViewRect): void {
    const a = this.arena;
    this.glintDue += GLINT_RATE * this.profile.ambience * dt;
    // A few tries a glint: a random point of the view, kept only on water.
    for (let tries = 0; this.glintDue >= 1 && tries < 12; tries++) {
      const x = view.x + Math.random() * view.width;
      const y = view.y + Math.random() * view.height;
      const tx = Math.floor(x / a.tileSize);
      const ty = Math.floor(y / a.tileSize);
      if (tx < 0 || ty < 0 || tx >= a.widthTiles || ty >= a.heightTiles) continue;
      if (!this.water.has(a.terrain[ty * a.widthTiles + tx])) continue;
      this.glints!.emitParticleAt(x, y, 1);
      this.glintDue--;
    }
    this.glintDue = Math.min(this.glintDue, 2);
  }

  private emitSmoke(dt: number, view: ViewRect): void {
    if (this.time - this.firesAt > 1) {
      this.firesAt = this.time;
      this.fires = this.fireLights();
    }
    if (this.fires.length === 0) return;
    this.smokeDue += SMOKE_RATE * this.profile.ambience * dt;
    for (let tries = 0; this.smokeDue >= 1 && tries < 8; tries++) {
      const f = this.fires[Math.floor(Math.random() * this.fires.length)];
      if (f.x < view.x || f.y < view.y || f.x > view.x + view.width || f.y > view.y + view.height)
        continue;
      this.smoke!.emitParticleAt(f.x + (Math.random() - 0.5) * 8, f.y - 22, 1);
      this.smokeDue--;
    }
    this.smokeDue = Math.min(this.smokeDue, 2);
  }

  private moveCreatures(
    dt: number,
    view: ViewRect,
    focus: { x: number; y: number },
    players: readonly FramePlayer[],
  ): void {
    const flock = this.flock!;
    const gods = players.filter((p) => p.alive && !p.left);
    const count = Math.round((this.config?.wildlife?.count ?? 0) * this.profile.ambience);
    flock.update(dt, focus, gods, view, (x, y) => this.blocked(x, y));
    const base = this.resolver.resolve(this.config!.wildlife!.sprite).scale;
    for (let i = 0; i < this.creatures.length; i++) {
      const c = flock.creatures[i];
      const s = this.creatures[i];
      if (i >= count || c.state === 'gone') {
        s.setVisible(false);
        continue;
      }
      // Wings beat in flight; a sitting creature twitches now and then.
      const beat = flock.flies
        ? c.state === 'fleeing'
          ? 0.45 + 0.55 * Math.abs(Math.sin(this.time * 26 + c.seed))
          : 0.85 + 0.15 * Math.max(0, Math.sin(this.time * 2 + c.seed) * 3 - 2)
        : 1;
      s.setVisible(true)
        .setPosition(c.x, c.y)
        .setAlpha(flock.alpha(c))
        .setFlipX(c.left)
        .setScale(base, base * beat)
        .setDepth(c.state === 'fleeing' && flock.flies ? ATMOSPHERE_DEPTH.fog - 3 : c.y);
    }
  }

  /** On or beside an obstacle. */
  private blocked(x: number, y: number): boolean {
    for (const o of this.arena.obstacles)
      if ((o.x - x) ** 2 + (o.y - y) ** 2 < (o.radius + 16) ** 2) return true;
    return false;
  }
}
