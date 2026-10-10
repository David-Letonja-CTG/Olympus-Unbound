import Phaser from 'phaser';
import { paintSprite, SPRITES } from '../art/sprites';
import { Rng } from '../core/rng';
import { GameContent, MapGenConfig } from '../data/types';
import { ArenaData } from '../maps/generate-arena';

export const DETAIL_TEXTURE = 'terrain-detail';

const toCss = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

export function shade(c: number, f: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
}

/** Registers every sprite, the terrain tileset and effect textures with the scene's texture manager. */
export function registerTextures(
  scene: Phaser.Scene,
  content: GameContent,
  map: MapGenConfig,
): void {
  const textures = scene.textures;
  const add = (key: string, canvas: HTMLCanvasElement) => {
    if (!textures.exists(key)) textures.addCanvas(key, canvas);
  };
  for (const key of Object.keys(SPRITES)) add(key, paintSprite(key));
  // Content may reference sprites without a painter: they get a coloured disc.
  const visuals = [
    ...content.enemies.map((e) => e.visual),
    ...content.bosses.map((b) => b.visual),
    ...content.gods.map((g) => g.visual),
    ...map.obstacles.map((o) => o.visual),
    ...map.decorations.map((d) => d.visual),
  ];
  for (const v of visuals) add(v.sprite, paintSprite(v.sprite, v.color));

  add('spark', radial(16, 0xffffff));
  add('soft', radial(64, 0xffffff));
  add('ring', ring(128));
  add(DETAIL_TEXTURE, detail(256));
}

function radial(size: number, color: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, toCss(color, 1));
  grad.addColorStop(0.4, toCss(color, 0.6));
  grad.addColorStop(1, toCss(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return canvas;
}

function ring(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 5;
  g.stroke();
  return canvas;
}

/** A tileable overlay of light and dark flecks that gives the smooth terrain colours some grain. */
function detail(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const rng = new Rng('terrain-detail');
  for (let i = 0; i < 900; i++) {
    const light = rng.chance(0.5);
    g.fillStyle = light ? 'rgba(255,255,240,0.07)' : 'rgba(0,0,0,0.09)';
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    const w = rng.range(1, 4);
    g.fillRect(x, y, w, rng.range(1, 3));
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(0,0,0,0.05)';
    g.beginPath();
    g.ellipse(
      rng.range(0, size),
      rng.range(0, size),
      rng.range(10, 40),
      rng.range(6, 24),
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
  const canvas = document.createElement('canvas');
  canvas.width = arena.widthTiles;
  canvas.height = arena.heightTiles;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
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
    const jitter = 0.94 + (((tx * 7349 + ty * 2671) % 97) / 97) * 0.12;
    image.data[i * 4] = Math.min(255, ((c >> 16) & 255) * jitter);
    image.data[i * 4 + 1] = Math.min(255, ((c >> 8) & 255) * jitter);
    image.data[i * 4 + 2] = Math.min(255, (c & 255) * jitter);
    image.data[i * 4 + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  return canvas;
}
