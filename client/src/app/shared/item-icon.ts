import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { AssetManifest, spriteDataUrl } from '../../engine';
import { GAME_CONTENT } from '../core/game-content';

/**
 * An item, god or enemy picture. Characters with a sprite sheet in the asset manifest (D12, D15) show a portrait
 * cut from their first frame; everything else, and any sheet still loading or failing, uses the engine's
 * code-drawn art. Decorative unless given a label.
 */
@Component({
  selector: 'app-item-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (url()) {
      <img [src]="url()" [alt]="label()" [width]="size()" [height]="size()" draggable="false" />
    } @else {
      <span
        class="fallback"
        [style.width.px]="size()"
        [style.height.px]="size()"
        [attr.aria-label]="label() || null"
      ></span>
    }`,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
    img {
      image-rendering: auto;
    }
    .fallback {
      display: inline-block;
      border-radius: 6px;
      background: var(--panel-2);
    }
  `,
})
export class ItemIcon {
  readonly sprite = input.required<string>();
  readonly size = input(40);
  readonly label = input('');
  private readonly assets = inject(GAME_CONTENT).assets;
  protected readonly url = computed(() => {
    const px = Math.round(this.size() * 2);
    return portrait(this.assets, this.sprite(), px)() ?? spriteDataUrl(this.sprite(), px);
  });
}

/**
 * A sprite's picture as a URL: the character's portrait, waiting up to `waitMs` for its sheet to load, else its
 * code-drawn art (the share card, spec: daily-trial / sharing a run).
 */
export async function spriteImageUrl(
  manifest: AssetManifest,
  key: string,
  px: number,
  waitMs = 3000,
): Promise<string | undefined> {
  // The character's sheet may still be loading (nothing on screen has asked for it yet).
  const picture = portrait(manifest, key, px);
  for (let waited = 0; picture !== NONE && !picture() && waited < waitMs; waited += 50)
    await new Promise((resolve) => setTimeout(resolve, 50));
  return picture() ?? spriteDataUrl(key, px);
}

const NONE: Signal<string | undefined> = signal(undefined);
const portraits = new Map<string, WritableSignal<string | undefined>>();

/**
 * The first frame of a character's sheet, trimmed to the figure (its soft drop shadow left out) and fitted into a
 * `px` square with the feet at the bottom. Undefined until the sheet has loaded, and for non-sheet sprites.
 */
function portrait(manifest: AssetManifest, key: string, px: number): Signal<string | undefined> {
  const asset = manifest.sprites[key];
  const file = asset && manifest.files.find((f) => f.id === asset.file);
  if (!asset || file?.type !== 'spritesheet' || !file.frameWidth || !file.frameHeight) return NONE;
  const id = `${key}@${px}`;
  let result = portraits.get(id);
  if (result) return result;
  result = signal<string | undefined>(undefined);
  portraits.set(id, result);
  const [fw, fh] = [file.frameWidth, file.frameHeight];
  const frame = Number(asset.portrait ?? asset.frame ?? 0);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = fw;
    canvas.height = fh;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    if (!g) return;
    const columns = Math.max(1, Math.floor(image.width / fw));
    g.drawImage(
      image,
      (frame % columns) * fw,
      Math.floor(frame / columns) * fh,
      fw,
      fh,
      0,
      0,
      fw,
      fh,
    );
    const { data } = g.getImageData(0, 0, fw, fh);
    let [left, top, right, bottom] = [fw, fh, -1, -1];
    for (let y = 0; y < fh; y++)
      for (let x = 0; x < fw; x++)
        if (data[(y * fw + x) * 4 + 3] > 160) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    if (right < left) return;
    const [w, h] = [right - left + 1, bottom - top + 1];
    const out = document.createElement('canvas');
    out.width = out.height = px;
    const scale = (px * 0.92) / Math.max(w, h);
    const og = out.getContext('2d');
    if (!og) return;
    // A soft light behind the figure, so dark characters (Hades) stand out on dark panels.
    const halo = og.createRadialGradient(px / 2, px * 0.62, 0, px / 2, px * 0.62, px * 0.5);
    halo.addColorStop(0, 'rgba(236, 213, 154, 0.28)');
    halo.addColorStop(1, 'rgba(236, 213, 154, 0)');
    og.fillStyle = halo;
    og.fillRect(0, 0, px, px);
    og.imageSmoothingQuality = 'high';
    og.drawImage(
      canvas,
      left,
      top,
      w,
      h,
      (px - w * scale) / 2,
      px - h * scale - px * 0.04,
      w * scale,
      h * scale,
    );
    result.set(out.toDataURL('image/png'));
  };
  image.src = file.url;
  return result;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
