import Phaser from 'phaser';
import { Rng } from '../core/rng';
import { GameContent, MapGenConfig } from '../data/types';
import { ArenaData } from '../maps/generate-arena';
import { registerCodeDrawn } from './assets';
import { ValueNoise } from '../maps/value-noise';

export const DETAIL_TEXTURE = 'terrain-detail';
export const LIGHT_TEXTURE = 'light';
export const LIGHT_TEXTURE_SIZE = 256;
export const SHADOW_TEXTURE = 'shadow';
export const FOG_TEXTURE = 'fog';
export const VIGNETTE_TEXTURE = 'vignette';

const toCss = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

export function shade(c: number, f: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
}

/** Registers code-drawn sprites (fallbacks for every content sprite key) and the effect textures. */
export function registerTextures(
  scene: Phaser.Scene,
  content: GameContent,
  maps: readonly MapGenConfig[],
): void {
  const textures = scene.textures;
  const add = (key: string, canvas: HTMLCanvasElement) => {
    if (!textures.exists(key)) textures.addCanvas(key, canvas);
  };
  registerCodeDrawn(scene, [
    ...content.enemies.map((e) => e.visual),
    ...content.bosses.map((b) => b.visual),
    ...content.gods.map((g) => g.visual),
    ...maps.flatMap((m) => [
      ...m.obstacles.map((o) => o.visual),
      ...m.decorations.map((d) => d.visual),
    ]),
  ]);
  add('spark', radial(32, 0xffffff));
  add('soft', radial(64, 0xffffff));
  add('ring', ring(128));
  add(DETAIL_TEXTURE, detail(256));
  add(LIGHT_TEXTURE, light(LIGHT_TEXTURE_SIZE));
  add(SHADOW_TEXTURE, shadow(64));
  add(FOG_TEXTURE, fog(512));
  add(VIGNETTE_TEXTURE, vignette(512));
}

function canvas2d(width: number, height = width): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d') as CanvasRenderingContext2D];
}

function radial(size: number, color: number): HTMLCanvasElement {
  const [canvas, g] = canvas2d(size);
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, toCss(color, 1));
  grad.addColorStop(0.4, toCss(color, 0.6));
  grad.addColorStop(1, toCss(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return canvas;
}

/** A light's falloff: bright core, long soft tail (approximately inverse-square). */
function light(size: number): HTMLCanvasElement {
  const [canvas, g] = canvas2d(size);
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    grad.addColorStop(t, `rgba(255,255,255,${Math.pow(1 - t, 2.2).toFixed(3)})`);
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return canvas;
}

function shadow(size: number): HTMLCanvasElement {
  const [canvas, g] = canvas2d(size, size / 2);
  const grad = g.createRadialGradient(size / 2, size / 4, 0, size / 2, size / 4, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.save();
  g.scale(1, 0.5);
  g.fillRect(0, 0, size, size);
  g.restore();
  return canvas;
}

/** Tileable soft fog: wrapped value noise, white with varying alpha (tinted per realm). */
function fog(size: number): HTMLCanvasElement {
  const [canvas, g] = canvas2d(size);
  const image = g.createImageData(size, size);
  const noise = new ValueNoise(new Rng('fog'), 8);
  const cells = 8;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Octaves at whole multiples of the lattice period, so the texture tiles seamlessly.
      const u = (x / size) * cells;
      const v = (y / size) * cells;
      const n = (noise.sample(u, v) * 2 + noise.sample(u * 2, v * 2)) / 3;
      const a = Math.max(0, Math.min(1, (n - 0.35) * 2.2));
      const i = (y * size + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(a * a * 255);
    }
  }
  g.putImageData(image, 0, 0);
  return canvas;
}

function vignette(size: number): HTMLCanvasElement {
  const [canvas, g] = canvas2d(size);
  const grad = g.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.28,
    size / 2,
    size / 2,
    size * 0.72,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.85)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return canvas;
}

function ring(size: number): HTMLCanvasElement {
  const [canvas, g] = canvas2d(size);
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 5;
  g.stroke();
  return canvas;
}

/** A tileable overlay of light and dark flecks that gives the smooth terrain colours some grain. */
function detail(size: number): HTMLCanvasElement {
  const [canvas, g] = canvas2d(size);
  const rng = new Rng('terrain-detail');
  for (let i = 0; i < 1400; i++) {
    const light = rng.chance(0.45);
    g.fillStyle = light ? 'rgba(255,250,235,0.06)' : 'rgba(0,0,0,0.12)';
    g.fillRect(rng.range(0, size), rng.range(0, size), rng.range(1, 4), rng.range(1, 3));
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(0,0,0,${rng.range(0.04, 0.09).toFixed(3)})`;
    g.beginPath();
    g.ellipse(
      rng.range(0, size),
      rng.range(0, size),
      rng.range(10, 46),
      rng.range(6, 26),
      rng.angle(),
      0,
      Math.PI * 2,
    );
    g.fill();
  }
  return canvas;
}

/**
 * The arena's ground as one small picture, one pixel per tile; drawn scaled up with smoothing so terrain bands
 * blend softly instead of showing a tile grid.
 */
export function terrainCanvas(arena: ArenaData, map: MapGenConfig): HTMLCanvasElement {
  const [canvas, g] = canvas2d(arena.widthTiles, arena.heightTiles);
  const image = g.createImageData(arena.widthTiles, arena.heightTiles);
  const colors = arena.terrainTypes.map(
    (id) => map.terrain.types.find((t) => t.id === id)?.color ?? 0x444444,
  );
  // The plaza terrain is drawn as round floors on top; underneath it uses the most common natural colour.
  const plaza = arena.terrainTypes.indexOf(map.terrain.plaza);
  const under =
    colors[
      arena.terrainTypes.indexOf(
        map.terrain.bands[Math.floor(map.terrain.bands.length / 2)].terrain,
      )
    ];
  for (let i = 0; i < arena.terrain.length; i++) {
    const c = arena.terrain[i] === plaza ? under : colors[arena.terrain[i]];
    const tx = i % arena.widthTiles;
    const ty = Math.floor(i / arena.widthTiles);
    const jitter = 0.92 + (((tx * 7349 + ty * 2671) % 97) / 97) * 0.14;
    image.data[i * 4] = Math.min(255, ((c >> 16) & 255) * jitter);
    image.data[i * 4 + 1] = Math.min(255, ((c >> 8) & 255) * jitter);
    image.data[i * 4 + 2] = Math.min(255, (c & 255) * jitter);
    image.data[i * 4 + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  return canvas;
}

export { toCss };
