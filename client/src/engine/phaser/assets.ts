import Phaser from 'phaser';
import { recolorCanvas } from '../art/canvas';
import { paintSprite, SPRITES } from '../art/sprites';
import { AnimationName, AssetFile, AssetManifest, SpriteAsset, walkRate } from '../data/assets';

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
  /** Top of the head per frame (a god's figure, for its crown). */
  readonly heads?: SpriteAsset['heads'];
}

/**
 * Queues every external file of the manifest (D12, spec: asset-pipeline). Progress goes to `onProgress`; files that
 * fail are collected in the returned set and logged once, so their sprites fall back to code-drawn art.
 */
export function queueAssets(
  scene: Phaser.Scene,
  manifest: AssetManifest,
  onProgress: (p: number) => void,
  wanted: (file: AssetFile) => boolean = () => true,
): Set<string> {
  const failed = new Set<string>();
  const load = scene.load;
  // A restarted scene (a new realm) keeps its loader: drop the previous run of listeners.
  load.off(Phaser.Loader.Events.PROGRESS);
  load.off(Phaser.Loader.Events.FILE_LOAD_ERROR);
  for (const file of manifest.files)
    if (!scene.textures.exists(file.id) && wanted(file)) queueFile(load, file);
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

function queueFile(load: Phaser.Loader.LoaderPlugin, file: AssetFile): void {
  if (file.type === 'image') load.image(file.id, file.url);
  else if (file.type === 'atlas' && file.data) load.atlas(file.id, file.url, file.data);
  else if (file.type === 'spritesheet') {
    load.spritesheet(file.id, file.url, {
      frameWidth: file.frameWidth ?? 0,
      frameHeight: file.frameHeight ?? 0,
    });
  }
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
      // A sheet the run did not load up front: load it now and draw in code until it is in (runFiles).
      if (asset && !this.failed.has(asset.file) && !this.scene.textures.exists(asset.file)) {
        this.request(asset.file);
        return this.codeDrawn(key);
      }
      resolved = asset && this.usable(asset) ? this.fromAsset(key, asset) : this.codeDrawn(key);
      this.cache.set(key, resolved);
    }
    return resolved;
  }

  private readonly requested = new Set<string>();

  private request(id: string): void {
    if (this.requested.has(id)) return;
    this.requested.add(id);
    const file = this.manifest.files.find((f) => f.id === id);
    if (!file) return;
    const load = this.scene.load;
    // The run is on: no loading progress to report any more.
    load.off(Phaser.Loader.Events.PROGRESS);
    queueFile(load, file);
    if (!load.isLoading()) load.start();
  }

  private usable(asset: SpriteAsset): boolean {
    if (this.failed.has(asset.file) || !this.scene.textures.exists(asset.file)) return false;
    return (
      asset.frame === undefined || this.scene.textures.get(asset.file).has(String(asset.frame))
    );
  }

  /**
   * The texture a sprite draws from: its sheet, or a copy multiplied by its `recolor`, made once with the same frames
   * (spec: asset-pipeline / recoloured sheets), so status tints still show on top.
   */
  private textureOf(asset: SpriteAsset): string {
    if (asset.recolor === undefined) return asset.file;
    const key = `${asset.file}~${asset.recolor.toString(16)}`;
    const textures = this.scene.textures;
    if (textures.exists(key)) return key;
    const source = textures.get(asset.file);
    const image = source.getSourceImage() as HTMLImageElement;
    const copy = textures.addCanvas(
      key,
      recolorCanvas(image, image.width, image.height, asset.recolor),
    );
    if (!copy) return asset.file;
    for (const name of source.getFrameNames()) {
      const f = source.get(name);
      copy.add(name, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
    }
    return key;
  }

  private fromAsset(key: string, asset: SpriteAsset): ResolvedSprite {
    const texture = this.textureOf(asset);
    const animations: Partial<Record<AnimationName, string>> = {};
    for (const name of Object.keys(asset.animations ?? {}) as AnimationName[]) {
      const anim = asset.animations?.[name];
      if (!anim) continue;
      const animKey = `${key}:${name}`;
      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: anim.frames.map((frame) => ({ key: texture, frame })),
          frameRate: anim.fps,
          repeat: anim.repeat === false ? 0 : -1,
        });
      }
      animations[name] = animKey;
    }
    return {
      texture,
      frame: asset.frame,
      scale: asset.scale ?? 1,
      originX: asset.originX ?? 0.5,
      originY: asset.originY ?? 0.5,
      faces: asset.faces ?? 'right',
      animations,
      codeDrawn: false,
      stride: asset.stride,
      heads: asset.heads,
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
