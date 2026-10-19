import Phaser from 'phaser';
import { minimapMarks, minimapScale, paintMinimapBase, SEAT_COLORS } from '../art/minimap';
import { ArenaData } from '../maps/generate-arena';
import { WorldFrame } from '../sim/world-frame';
import { ATMOSPHERE_DEPTH } from './atmosphere';

/** On-screen size in CSS pixels and distance from the right edge. */
const SIZE = 172;
/** The minimap sits at the top right; the gold and kills plaque sits under it (hud.css). */
const TOP = 12;
const MARGIN = 16;
/** The picture is drawn at twice its on-screen size, for sharp high-density screens. */
const RESOLUTION = 2;
/** Marks are redrawn at most this often (milliseconds); the HUD's pace (D7). */
const REDRAW_MS = 100;
/** Above the vignette, which would otherwise darken the corner it sits in. */
const MINIMAP_DEPTH = ATMOSPHERE_DEPTH.vignette + 1000;

/**
 * The minimap in the top-right corner (spec: hud / minimap): the realm's ground and walls, every enemy as a dot
 * (elites larger), the boss and the open gate, every god in their seat's colour (the local one largest, the fallen
 * hollow), and the view's outline. A still picture painted once per realm, plus marks redrawn ten times a second.
 */
export class Minimap {
  private readonly container: Phaser.GameObjects.Container;
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly textureKey: string;
  private readonly k: number;
  private readonly ox: number;
  private readonly oy: number;
  private elapsed = REDRAW_MS;

  constructor(
    private readonly scene: Phaser.Scene,
    arena: ArenaData,
    ground: HTMLCanvasElement,
  ) {
    const px = SIZE * RESOLUTION;
    this.textureKey = `minimap:${arena.seed}:${arena.width}`;
    if (scene.textures.exists(this.textureKey)) scene.textures.remove(this.textureKey);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = px;
    const g = canvas.getContext('2d');
    if (g) paintMinimapBase(g, px, arena, ground);
    scene.textures.addCanvas(this.textureKey, canvas);
    ({ k: this.k, ox: this.ox, oy: this.oy } = minimapScale(arena, SIZE));

    const frame = scene.add.graphics();
    frame.fillStyle(0x000000, 0.55);
    frame.fillRect(-5, -5, SIZE + 10, SIZE + 10);
    frame.lineStyle(2, 0x6b5a3a, 1);
    frame.strokeRect(-4, -4, SIZE + 8, SIZE + 8);
    frame.lineStyle(1, 0xc9a55a, 0.8);
    frame.strokeRect(-1, -1, SIZE + 2, SIZE + 2);
    const picture = scene.add
      .image(0, 0, this.textureKey)
      .setOrigin(0, 0)
      .setScale(1 / RESOLUTION);
    this.marks = scene.add.graphics();
    this.container = scene.add
      .container(0, 0, [frame, picture, this.marks])
      .setScrollFactor(0)
      .setDepth(MINIMAP_DEPTH);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (scene.textures.exists(this.textureKey)) scene.textures.remove(this.textureKey);
    });
  }

  /** Places the minimap on screen and, ten times a second, redraws its marks. `dt` in milliseconds (real time). */
  update(
    world: WorldFrame,
    localId: number,
    camera: Phaser.Cameras.Scene2D.Camera,
    dt: number,
  ): void {
    // Objects that ignore scrolling are still zoomed around the screen's centre: undo it (like the boss pointer).
    const z = camera.zoom;
    // Smaller on narrow windows, so it stays clear of the boss's health bar.
    const fit = Math.max(0.7, Math.min(1, camera.width / 1280));
    const sx = camera.width - MARGIN - SIZE * fit;
    const sy = TOP;
    this.container.setPosition(
      camera.width / 2 + (sx - camera.width / 2) / z,
      camera.height / 2 + (sy - camera.height / 2) / z,
    );
    this.container.setScale(fit / z);

    this.elapsed += dt;
    if (this.elapsed < REDRAW_MS) return;
    this.elapsed = 0;
    const g = this.marks;
    g.clear();
    const at = (x: number, y: number): [number, number] => [
      this.ox + x * this.k,
      this.oy + y * this.k,
    ];

    // The view's outline.
    const v = camera.worldView;
    const [vx, vy] = at(v.x, v.y);
    g.lineStyle(1, 0xffffff, 0.35);
    g.strokeRect(vx, vy, v.width * this.k, v.height * this.k);

    for (const m of minimapMarks(world, localId)) {
      const [x, y] = at(m.x, m.y);
      const seat = SEAT_COLORS[(m.seat ?? 0) % SEAT_COLORS.length];
      switch (m.kind) {
        case 'enemy':
          g.fillStyle(0xff5a40, 1);
          g.fillRect(x - 1.25, y - 1.25, 2.5, 2.5);
          break;
        case 'elite':
          g.fillStyle(0xffcc33, 1);
          g.fillCircle(x, y, 3);
          break;
        case 'gate':
          g.lineStyle(2, 0x9fdcff, 1);
          g.strokeCircle(x, y, 5);
          break;
        case 'merchant':
          // A gold diamond: the Wandering Merchant (spec: hud / the merchant on the hud).
          g.fillStyle(0xffc870, 1);
          g.fillTriangle(x, y - 5, x + 4, y, x - 4, y);
          g.fillTriangle(x, y + 5, x + 4, y, x - 4, y);
          break;
        case 'boss':
          g.fillStyle(0xff3b1f, 1);
          g.fillCircle(x, y, 5);
          g.lineStyle(1.5, 0xffffff, 1);
          g.strokeCircle(x, y, 5);
          break;
        case 'fallen':
          g.lineStyle(1.5, seat, 0.9);
          g.strokeCircle(x, y, 3.5);
          break;
        case 'player':
          g.fillStyle(seat, 1);
          g.fillCircle(x, y, 3.5);
          g.lineStyle(1, 0x000000, 0.8);
          g.strokeCircle(x, y, 3.5);
          break;
        case 'self':
          g.fillStyle(seat, 1);
          g.fillCircle(x, y, 4.5);
          g.lineStyle(1.5, 0xffffff, 1);
          g.strokeCircle(x, y, 4.5);
          break;
      }
    }
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
