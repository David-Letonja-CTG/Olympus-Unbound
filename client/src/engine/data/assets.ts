/**
 * Asset manifest schema (D12, spec: asset-pipeline). Content refers to sprite keys; the manifest decides whether a
 * key is drawn from an external file (a licensed pack) or by the code-drawn fallback in `engine/art`.
 */

/** Licences external files may use. "commercial" requires a receipt reference in `notes`. */
export type AssetLicenceName =
  | 'CC0-1.0'
  | 'CC-BY-3.0'
  | 'CC-BY-4.0'
  | 'CC-BY-SA-3.0'
  | 'CC-BY-SA-4.0'
  | 'OFL-1.1'
  | 'commercial';

export const ALLOWED_LICENCES: readonly AssetLicenceName[] = [
  'CC0-1.0',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'CC-BY-SA-3.0',
  'CC-BY-SA-4.0',
  'OFL-1.1',
  'commercial',
];

/** Licences whose terms require visible credit (shown on the Credits panel). */
export const ATTRIBUTION_LICENCES: readonly AssetLicenceName[] = [
  'CC-BY-3.0',
  'CC-BY-4.0',
  'CC-BY-SA-3.0',
  'CC-BY-SA-4.0',
];

export interface AssetLicence {
  readonly name: AssetLicenceName;
  readonly author: string;
  /** Where the file was obtained. */
  readonly source: string;
  /** Title of the work as the author names it (for attribution). */
  readonly title: string;
  /** Changes made (conversion, cropping) and, for commercial licences, the receipt reference. */
  readonly notes?: string;
}

/**
 * An external file under `client/public/`. `url` is relative to the site root (e.g. `assets/pack/skeleton.png`);
 * every path in `files` (url, data) must exist and be listed exactly once across the manifest.
 */
export interface AssetFile {
  readonly id: string;
  readonly type: 'image' | 'atlas' | 'spritesheet' | 'font';
  readonly url: string;
  /** Atlas JSON (Phaser/TexturePacker hash or array format), for `atlas`. */
  readonly data?: string;
  /** Frame size, for `spritesheet`. */
  readonly frameWidth?: number;
  readonly frameHeight?: number;
  readonly licence: AssetLicence;
}

export type AnimationName = 'idle' | 'walk' | 'attack' | 'death';

export interface SpriteAnimation {
  /** Frame names (atlas) or indices (sprite sheet). */
  readonly frames: readonly (string | number)[];
  readonly fps: number;
  readonly repeat?: boolean;
}

/** How one sprite key is drawn from a file. */
export interface SpriteAsset {
  readonly file: string;
  /** The still frame (atlas frame name or sheet index); the image itself when omitted. */
  readonly frame?: string | number;
  readonly animations?: Partial<Record<AnimationName, SpriteAnimation>>;
  /** Display scale relative to the file's pixels. */
  readonly scale?: number;
  /** Origin within the frame (0–1); feet should sit at the entity position. */
  readonly originX?: number;
  readonly originY?: number;
  /** Which way the art faces; the view flips it to face movement. Defaults to right. */
  readonly faces?: 'left' | 'right';
}

export interface AssetManifest {
  readonly files: readonly AssetFile[];
  /** Sprite key → external sprite. Keys not listed use the code-drawn art. */
  readonly sprites: Readonly<Record<string, SpriteAsset>>;
}

export const EMPTY_MANIFEST: AssetManifest = { files: [], sprites: {} };

/** Every file path a manifest refers to (for the licence check). */
export function manifestPaths(manifest: AssetManifest): string[] {
  const paths: string[] = [];
  for (const f of manifest.files) {
    paths.push(f.url);
    if (f.data) paths.push(f.data);
  }
  return paths;
}
