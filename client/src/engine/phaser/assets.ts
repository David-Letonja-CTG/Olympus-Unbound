import Phaser from 'phaser';
import { paintSprite, SPRITES } from '../art/sprites';
import { AnimationName, AssetManifest, SpriteAsset, walkRate } from '../data/assets';

/** Code-drawn sprites are painted at twice their display size and shown at half scale, for crisp edges. */
export const ART_SCALE = 0.5;

/** How to draw one sprite key: a texture (and frame), its display scale and origin, and its animations. */
export interface ResolvedSprite {
  readonly texture: string;
  readonly frame?: string | number;
  readonly scale: number;
  readonly originX: number;
  readonly originY: number;
  readonly faces: 'left' | 'right';
  /** Phaser animation keys by name (only for pack sprites that define them). */
  readonly animations: Partial<Record<AnimationName, string>>;
  /** True when drawn by `engine/art` (eligible for view-only bob and lean). */
  readonly codeDrawn: boolean;
  /** Ground covered per walk cycle and the cycle's length at its own frame rate (pack sprites with a stride). */
  readonly stride?: number;
  readonly walkCycle?: number;
}

/**
 * Queues every external file of the manifest (D12, spec: asset-pipeline). Progress goes to `onProgress`; files that
 * fail are collected in the returned set and logged once, so their sprites fall back to code-drawn art.
 */
export function queueAssets(
  scene: Phaser.Scene,
  manifest: AssetManifest,
  onProgress: (p: number) => void,
): Set<string> {
  const failed = new Set<string>();
  const load = scene.load;
  for (const file of manifest.files) {
    if (scene.textures.exists(file.id)) continue;
    if (file.type === 'image') load.image(file.id, file.url);
    else if (file.type === 'atlas' && file.data) load.atlas(file.id, file.url, file.data);
    else if (file.type === 'spritesheet') {
      load.spritesheet(file.id, file.url, {
        frameWidth: file.frameWidth ?? 0,
        frameHeight: file.frameHeight ?? 0,
      });
    }
  }
  load.on(Phaser.Loader.Events.PROGRESS, onProgress);
  load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
    if (failed.has(file.key)) return;
    failed.add(file.key);
    console.warn(
      `[assets] "${file.key}" failed to load (${file.src}); using the code-drawn art instead.`,
    );
  });
  return failed;
}

/** Registers a code-drawn texture for every sprite key the game may ask for (the fallbacks). */
export function registerCodeDrawn(
  scene: Phaser.Scene,
  keys: Iterable<{ sprite: string; color: number }>,
): void {
  const add = (key: string, color: number) => {
    if (scene.textures.exists(key)) return;
    const size = (SPRITES[key]?.size ?? 32) / ART_SCALE;
    scene.textures.addCanvas(key, paintSprite(key, color, size));
  };
  for (const key of Object.keys(SPRITES)) add(key, 0xcccccc);
  for (const { sprite, color } of keys) add(sprite, color);
}

/** Answers how to draw a sprite key: from the manifest when its file loaded, else the code-drawn texture. */
export class SpriteResolver {
  private readonly cache = new Map<string, ResolvedSprite>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly manifest: AssetManifest,
    private readonly failed: ReadonlySet<string>,
  ) {}

  resolve(key: string): ResolvedSprite {
    let resolved = this.cache.get(key);
    if (!resolved) {
      const asset = this.manifest.sprites[key];
      resolved = asset && this.usable(asset) ? this.fromAsset(key, asset) : this.codeDrawn(key);
      this.cache.set(key, resolved);
    }
    return resolved;
  }

  private usable(asset: SpriteAsset): boolean {
    if (this.failed.has(asset.file) || !this.scene.textures.exists(asset.file)) return false;
    return (
      asset.frame === undefined || this.scene.textures.get(asset.file).has(String(asset.frame))
    );
  }

  private fromAsset(key: string, asset: SpriteAsset): ResolvedSprite {
    const animations: Partial<Record<AnimationName, string>> = {};
    for (const name of Object.keys(asset.animations ?? {}) as AnimationName[]) {
      const anim = asset.animations?.[name];
      if (!anim) continue;
      const animKey = `${key}:${name}`;
      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: anim.frames.map((frame) => ({ key: asset.file, frame })),
          frameRate: anim.fps,
          repeat: anim.repeat === false ? 0 : -1,
        });
      }
      animations[name] = animKey;
    }
    return {
      texture: asset.file,
      frame: asset.frame,
      scale: asset.scale ?? 1,
      originX: asset.originX ?? 0.5,
      originY: asset.originY ?? 0.5,
      faces: asset.faces ?? 'right',
      animations,
      codeDrawn: false,
      stride: asset.stride,
      walkCycle: asset.animations?.walk
        ? asset.animations.walk.frames.length / asset.animations.walk.fps
        : undefined,
    };
  }

  private codeDrawn(key: string): ResolvedSprite {
    return {
      texture: key,
      scale: ART_SCALE,
      originX: 0.5,
      originY: 0.5,
      faces: 'right',
      animations: {},
      codeDrawn: true,
    };
  }
}

/**
 * Points a pooled sprite at a resolved sprite key, scaled by `scale` (gameplay size) and facing left or right;
 * plays `animation` when the pack provides it. `speed` (world px/s) times the walk to the movement when the
 * sprite has a stride.
 */
export function applySprite(
  sprite: Phaser.GameObjects.Sprite,
  r: ResolvedSprite,
  scale: number,
  faceLeft: boolean,
  animation?: AnimationName,
  speed?: number,
): void {
  const animKey = animation ? (r.animations[animation] ?? r.animations.idle) : undefined;
  if (animKey) {
    if (sprite.anims.currentAnim?.key !== animKey) sprite.play(animKey, true);
    sprite.anims.timeScale =
      animKey === r.animations.walk ? walkRate(r.walkCycle, r.stride, scale, speed) : 1;
  } else if (
    sprite.texture.key !== r.texture ||
    (r.frame !== undefined && sprite.frame.name !== String(r.frame))
  ) {
    sprite.setTexture(r.texture, r.frame);
  }
  sprite.setOrigin(r.originX, r.originY).setScale(r.scale * scale);
  sprite.setFlipX(r.faces === 'right' ? faceLeft : !faceLeft);
}
