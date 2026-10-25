import Phaser from 'phaser';
import { GraphicsQuality } from '../session';
import { FOG_TEXTURE, LIGHT_TEXTURE, LIGHT_TEXTURE_SIZE, VIGNETTE_TEXTURE } from './textures';

/** What each graphics quality level draws (D13, spec: visual-atmosphere / graphics quality levels). */
export interface QualityProfile {
  /** Most lights drawn per frame (nearest to the view win). */
  readonly lights: number;
  /** Light map resolution as a fraction of the screen. */
  readonly lightResolution: number;
  /** Fog opacity (0 = off). */
  readonly fog: number;
  /** Floating embers per second (0 = off). */
  readonly embers: number;
  readonly bloom: boolean;
  readonly grade: boolean;
  /** Opacity of the enemy copies drawn above the darkness (readability; never off). */
  readonly silhouette: number;
  /** Multiplier for burst particle counts. */
  readonly particles: number;
  /** Ground shadows under ordinary enemies (gods, elites and bosses keep theirs). Off on Low for phones. */
  readonly enemyShadows: boolean;
  /**
   * Draw each enemy once, above the darkness with a night tint, instead of lit below it plus a copy above (D13):
   * half the sprites of a horde, for phones on Low (spec: phone-play / phone performance).
   */
  readonly enemiesAboveDark: boolean;
  /** How much ambient life is drawn, 0–1: weather, smoke, glints, wildlife, lightning (spec: visual-atmosphere / ambient life). */
  readonly ambience: number;
  /** Cloud shadows and swaying trees. */
  readonly clouds: boolean;
  readonly sway: boolean;
}

export const QUALITY: Record<GraphicsQuality, QualityProfile> = {
  low: {
    lights: 16,
    lightResolution: 0.25,
    fog: 0,
    embers: 0,
    bloom: false,
    grade: false,
    silhouette: 0.5,
    particles: 0.5,
    enemyShadows: false,
    enemiesAboveDark: true,
    ambience: 0,
    clouds: false,
    sway: false,
  },
  medium: {
    lights: 48,
    lightResolution: 0.35,
    fog: 0.2,
    embers: 8,
    bloom: true,
    grade: true,
    silhouette: 0.42,
    particles: 0.8,
    enemyShadows: true,
    enemiesAboveDark: false,
    ambience: 0.5,
    clouds: false,
    sway: false,
  },
  high: {
    lights: 96,
    lightResolution: 0.5,
    fog: 0.3,
    embers: 18,
    bloom: true,
    grade: true,
    silhouette: 0.36,
    particles: 1,
    enemyShadows: true,
    enemiesAboveDark: false,
    ambience: 1,
    clouds: true,
    sway: true,
  },
};

/** Depths of the atmosphere layers relative to the y-sorted world (≈ 0–5000). */
export const ATMOSPHERE_DEPTH = {
  shadow: -35000,
  fog: 40000,
  lightMap: 50000,
  embers: 51000,
  vignette: 150000,
} as const;

/** A world-space rectangle (what the camera shows). */
export interface ViewRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The world rectangle the camera will show this frame when centred on (cx, cy) and clamped to the world bounds.
 * Computed directly because `camera.worldView` only updates while rendering, a frame late for the light map.
 */
export function viewAround(
  camera: Phaser.Cameras.Scene2D.Camera,
  cx: number,
  cy: number,
  worldWidth: number,
  worldHeight: number,
): ViewRect {
  const width = camera.width / camera.zoom;
  const height = camera.height / camera.zoom;
  const clamp = (v: number, size: number, world: number) =>
    size >= world ? (world - size) / 2 : Math.min(Math.max(v, 0), world - size);
  return {
    x: clamp(cx - width / 2, width, worldWidth),
    y: clamp(cy - height / 2, height, worldHeight),
    width,
    height,
  };
}

interface Light {
  x: number;
  y: number;
  radius: number;
  color: number;
  intensity: number;
  priority: number;
}

/**
 * Darkness with holes of light (D13): a screen-sized texture cleared to the ambient colour each frame, every light
 * added on top as a soft radial stamp, then laid over the world with MULTIPLY. Cheap per light, so lightning,
 * fire, braziers and glowing projectiles can all light the night.
 */
export class LightMap {
  private readonly lights: Light[] = [];
  private texture!: Phaser.Textures.DynamicTexture;
  private readonly image: Phaser.GameObjects.Image;
  private width = 0;
  private height = 0;
  private budget = 16;
  private resolution = 0.25;
  /** How far an eclipse has dimmed the ambient light, eased toward the run's value (spec: director-of-chaos). */
  private darkness = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ambient: number,
  ) {
    this.image = scene.add
      .image(0, 0, '__DEFAULT')
      .setOrigin(0)
      .setDepth(ATMOSPHERE_DEPTH.lightMap)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  setQuality(profile: QualityProfile): void {
    this.budget = profile.lights;
    if (profile.lightResolution !== this.resolution || !this.texture) {
      this.resolution = profile.lightResolution;
      this.resize();
    }
  }

  resize(): void {
    const { width, height } = this.scene.scale.gameSize;
    const w = Math.max(32, Math.round(width * this.resolution));
    const h = Math.max(32, Math.round(height * this.resolution));
    if (this.texture && w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    const key = 'light-map';
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.texture = this.scene.textures.addDynamicTexture(
      key,
      w,
      h,
    ) as Phaser.Textures.DynamicTexture;
    this.image.setTexture(key);
  }

  /** Eases the darkness toward `target` (0–1) over about a second, so an eclipse falls and lifts smoothly. */
  setDarkness(target: number, dt: number): void {
    this.darkness += (target - this.darkness) * Math.min(1, dt * 1.5);
  }

  /** Adds a light for this frame. Higher `priority` survives the budget first (the player, the boss). */
  add(x: number, y: number, radius: number, color: number, intensity: number, priority = 0): void {
    this.lights.push({ x, y, radius, color, intensity, priority });
  }

  render(view: ViewRect): void {
    const cx = view.x + view.width / 2;
    const cy = view.y + view.height / 2;
    const right = view.x + view.width;
    const bottom = view.y + view.height;
    const visible = this.lights.filter(
      (l) =>
        l.x + l.radius > view.x &&
        l.x - l.radius < right &&
        l.y + l.radius > view.y &&
        l.y - l.radius < bottom,
    );
    visible.sort(
      (a, b) =>
        b.priority - a.priority ||
        (a.x - cx) ** 2 + (a.y - cy) ** 2 - ((b.x - cx) ** 2 + (b.y - cy) ** 2),
    );
    const sx = this.width / view.width;
    const sy = this.height / view.height;
    const t = this.texture;
    t.clear();
    t.fill(this.darkness > 0.001 ? dim(this.ambient, this.darkness) : this.ambient, 1);
    for (const l of visible.slice(0, this.budget)) {
      t.stamp(LIGHT_TEXTURE, undefined, (l.x - view.x) * sx, (l.y - view.y) * sy, {
        scaleX: (l.radius * 2 * sx) / LIGHT_TEXTURE_SIZE,
        scaleY: (l.radius * 2 * sy) / LIGHT_TEXTURE_SIZE,
        tint: l.color,
        alpha: Math.min(1, l.intensity),
        blendMode: Phaser.BlendModes.ADD,
      });
    }
    t.render();
    this.image.setPosition(view.x, view.y).setDisplaySize(view.width, view.height);
    this.lights.length = 0;
  }
}

/**
 * The night violet an eclipse dims toward. It keeps at least 40% of the realm's ambient light, so everything that must
 * be read stays readable (D13).
 */
const ECLIPSE_NIGHT = 0x1a1030;
const ECLIPSE_FLOOR = 0.4;

function dim(ambient: number, darkness: number): number {
  const k = Math.min(1 - ECLIPSE_FLOOR, darkness * (1 - ECLIPSE_FLOOR));
  const mix = (shift: number) => {
    const a = (ambient >> shift) & 0xff;
    const b = (ECLIPSE_NIGHT >> shift) & 0xff;
    return Math.round(a + (b - a) * k) << shift;
  };
  return mix(16) | mix(8) | mix(0);
}

/** Fog, embers, vignette, colour grading and bloom, switched by quality at any time (spec: visual-atmosphere). */
export class Atmosphere {
  private readonly fog: Phaser.GameObjects.TileSprite[];
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly emberArea = new Phaser.Geom.Rectangle(0, 0, 1, 1);
  private readonly vignette: Phaser.GameObjects.Image;
  private readonly grade: Phaser.Filters.ColorMatrix;
  private readonly bloom: Phaser.Types.Actions.AddEffectBloomReturn[];
  private profile: QualityProfile = QUALITY.low;

  constructor(
    private readonly scene: Phaser.Scene,
    width: number,
    height: number,
    colors: { fog: number; particles: number },
  ) {
    this.fog = [0.9, 0.6].map((scale, i) =>
      scene.add
        .tileSprite(0, 0, width, height, FOG_TEXTURE)
        .setOrigin(0)
        .setTileScale(scale * 2.2)
        .setTint(colors.fog)
        .setDepth(ATMOSPHERE_DEPTH.fog + i),
    );
    this.embers = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 3500, max: 6500 },
        speedX: { min: -12, max: 12 },
        speedY: { min: -45, max: -15 },
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: colors.particles,
        blendMode: 'ADD',
        frequency: -1,
      })
      .setDepth(ATMOSPHERE_DEPTH.embers);
    this.embers.addEmitZone({
      type: 'random',
      source: this.emberArea,
    } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData);
    this.vignette = scene.add
      .image(0, 0, VIGNETTE_TEXTURE)
      .setScrollFactor(0)
      .setDepth(ATMOSPHERE_DEPTH.vignette);

    const camera = scene.cameras.main;
    this.grade = camera.filters.internal.addColorMatrix();
    this.grade.colorMatrix.saturate(-0.22);
    this.grade.colorMatrix.contrast(0.12, true);
    this.bloom = Phaser.Actions.AddEffectBloom(camera, {
      threshold: 0.7,
      blurRadius: 3,
      blendAmount: 0.75,
    });
  }

  setQuality(profile: QualityProfile): void {
    this.profile = profile;
    for (const [i, f] of this.fog.entries())
      f.setVisible(profile.fog > 0).setAlpha(profile.fog * (i === 0 ? 1 : 0.7));
    this.embers.frequency = profile.embers > 0 ? 1000 / profile.embers : -1;
    this.grade.active = profile.grade;
    for (const b of this.bloom) b.parallelFilters.active = profile.bloom;
  }

  update(camera: Phaser.Cameras.Scene2D.Camera, view: ViewRect, dt: number): void {
    if (this.profile.fog > 0) {
      this.fog[0].tilePositionX += 7 * dt;
      this.fog[0].tilePositionY += 2 * dt;
      this.fog[1].tilePositionX -= 4 * dt;
      this.fog[1].tilePositionY += 3 * dt;
    }
    if (this.profile.embers > 0) {
      this.embers.setPosition(view.x, view.y + view.height * 0.2);
      this.emberArea.setSize(view.width, view.height);
    }
    // Objects that ignore scrolling are still zoomed around the screen centre; size the vignette to undo that.
    const { width, height } = camera;
    this.vignette
      .setPosition(width / 2, height / 2)
      .setDisplaySize(width / camera.zoom + 4, height / camera.zoom + 4);
  }
}
