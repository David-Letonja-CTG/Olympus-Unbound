import Phaser from 'phaser';
import { ArenaData } from '../maps/generate-arena';
import { MapGenConfig } from '../data/types';
import { RunState } from '../sim/run-state';
import { DETAIL_TEXTURE, shade, terrainCanvas } from './textures';

/** Depth bands: ground < decorations < telegraphs < pickups < y-sorted world < projectiles < overlays. */
export const DEPTH = {
  decoration: -30000,
  telegraph: -25000,
  pickup: -20000,
  aura: -19000,
  /** The player is never hidden by the horde or by trees (spec: hud / combat readability). */
  player: 99000,
  projectile: 100000,
  hostile: 100001,
  effects: 110000,
  bars: 120000,
  numbers: 130000,
  pointer: 140000,
} as const;

/**
 * Reuses images by id: `begin()`, then `get(id, texture)` for every visible entity, then `end()` hides the rest.
 * Images are recycled per texture, so hundreds of short-lived entities do not create garbage every frame.
 */
class ImagePool {
  private readonly active = new Map<number, Phaser.GameObjects.Image>();
  private readonly free = new Map<string, Phaser.GameObjects.Image[]>();
  private readonly seen = new Set<number>();

  constructor(private readonly scene: Phaser.Scene) {}

  begin(): void {
    this.seen.clear();
  }

  get(id: number, texture: string): Phaser.GameObjects.Image {
    this.seen.add(id);
    let image = this.active.get(id);
    if (image && image.texture.key !== texture) {
      this.release(id, image);
      image = undefined;
    }
    if (!image) {
      image = this.free.get(texture)?.pop() ?? this.scene.add.image(0, 0, texture);
      image.setVisible(true).setAlpha(1).setRotation(0).setScale(1).setFlipX(false).clearTint();
      this.active.set(id, image);
    }
    return image;
  }

  end(): void {
    for (const [id, image] of this.active) if (!this.seen.has(id)) this.release(id, image);
  }

  private release(id: number, image: Phaser.GameObjects.Image): void {
    image.setVisible(false);
    this.active.delete(id);
    const list = this.free.get(image.texture.key) ?? [];
    list.push(image);
    this.free.set(image.texture.key, list);
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Draws the arena and keeps one image per simulation entity in sync with its (interpolated) position. */
export class WorldView {
  private readonly players: ImagePool;
  private readonly playerRings: ImagePool;
  private readonly enemies: ImagePool;
  private readonly auras: ImagePool;
  private readonly projectiles: ImagePool;
  private readonly hostile: ImagePool;
  private readonly pickups: ImagePool;

  constructor(
    private readonly scene: Phaser.Scene,
    arena: ArenaData,
    config: MapGenConfig,
  ) {
    this.drawArena(arena, config);
    this.players = new ImagePool(scene);
    this.playerRings = new ImagePool(scene);
    this.enemies = new ImagePool(scene);
    this.auras = new ImagePool(scene);
    this.projectiles = new ImagePool(scene);
    this.hostile = new ImagePool(scene);
    this.pickups = new ImagePool(scene);
  }

  sync(state: RunState, alpha: number, time: number): void {
    const flash = Phaser.TintModes.FILL;
    const multiply = Phaser.TintModes.MULTIPLY;

    this.players.begin();
    this.playerRings.begin();
    for (const p of state.players) {
      if (!p.alive) continue;
      const image = this.players.get(p.id, state.god.visual.sprite);
      const x = lerp(p.px, p.x, alpha);
      const y = lerp(p.py, p.y, alpha);
      this.playerRings
        .get(p.id, 'ring')
        .setPosition(x, y + 4)
        .setDepth(DEPTH.aura)
        .setScale(0.42, 0.26)
        .setTint(0xffe066)
        .setAlpha(0.75);
      image
        .setPosition(x, y - 6)
        .setDepth(DEPTH.player)
        .setScale(1.15)
        .setFlipX(p.facingX < 0);
      image.setAlpha(p.invulnerable > 0.4 && Math.floor(time / 80) % 2 === 0 ? 0.45 : 1);
      if (p.hurtFlash > 0) image.setTint(0xff5555).setTintMode(multiply);
      else image.clearTint();
    }
    this.players.end();
    this.playerRings.end();

    this.enemies.begin();
    this.auras.begin();
    for (const e of state.enemies) {
      const image = this.enemies.get(e.id, e.def.visual.sprite);
      const x = lerp(e.px, e.x, alpha);
      const y = lerp(e.py, e.y, alpha);
      image
        .setPosition(x, y)
        .setDepth(y)
        .setScale(e.radius / e.def.radius)
        .setFlipX(e.facing < 0);
      const s = e.status;
      if (e.hitFlash > 0) image.setTint(0xffffff).setTintMode(flash);
      else if (s.stun > 0) image.setTint(0xfff27a).setTintMode(multiply);
      else if (s.burn > 0) image.setTint(0xffa060).setTintMode(multiply);
      else if (s.shock > 0) image.setTint(0xa8e6ff).setTintMode(multiply);
      else if (s.slow > 0) image.setTint(0xc8a8ff).setTintMode(multiply);
      else image.clearTint();
      if (e.mode === 'windup') image.setTint(0xff6040).setTintMode(multiply);
      if (e.elite || e.boss) {
        const aura = this.auras.get(e.id, 'soft');
        const pulse = 1 + Math.sin(time / 180 + e.id) * 0.08;
        aura
          .setPosition(x, y + e.radius * 0.3)
          .setDepth(DEPTH.aura)
          .setScale(((e.radius * 2.6) / 64) * pulse)
          .setTint(e.boss ? 0xff4422 : 0xffcc33)
          .setAlpha(0.55)
          .setBlendMode(Phaser.BlendModes.ADD);
      }
    }
    this.enemies.end();
    this.auras.end();

    this.projectiles.begin();
    for (const p of state.projectiles) {
      const image = this.projectiles.get(p.id, p.sprite);
      image.setPosition(lerp(p.px, p.x, alpha), lerp(p.py, p.y, alpha)).setDepth(DEPTH.projectile);
      if (p.orbit) image.setRotation(time / 150);
      else image.setRotation(Math.atan2(p.vy, p.vx));
    }
    this.projectiles.end();

    this.hostile.begin();
    for (const p of state.hostileProjectiles) {
      this.hostile
        .get(p.id, p.sprite)
        .setPosition(lerp(p.px, p.x, alpha), lerp(p.py, p.y, alpha))
        .setRotation(Math.atan2(p.vy, p.vx))
        .setDepth(DEPTH.hostile);
    }
    this.hostile.end();

    this.pickups.begin();
    for (const p of state.pickups) {
      const texture = p.kind === 'xp' ? (p.value >= 5 ? 'xp_large' : 'xp_small') : p.kind;
      const bob = p.kind === 'chest' || p.kind === 'heal' ? Math.sin(time / 250 + p.id) * 3 : 0;
      this.pickups
        .get(p.id, texture)
        .setPosition(p.x, p.y + bob)
        .setDepth(DEPTH.pickup);
    }
    this.pickups.end();
  }

  private drawArena(arena: ArenaData, config: MapGenConfig): void {
    const scene = this.scene;
    // Ground: one pixel per tile, smoothed when scaled up, plus a tiled grain overlay.
    if (!scene.textures.exists('arena-ground'))
      scene.textures.addCanvas('arena-ground', terrainCanvas(arena, config));
    scene.add
      .image(0, 0, 'arena-ground')
      .setOrigin(0)
      .setDisplaySize(arena.width, arena.height)
      .setDepth(-40000);
    scene.add
      .tileSprite(0, 0, arena.width, arena.height, DETAIL_TEXTURE)
      .setOrigin(0)
      .setDepth(-39999);

    // Marble floors: concentric courses of slabs.
    const marble =
      config.terrain.types.find((t) => t.id === config.terrain.plaza)?.color ?? 0xcccccc;
    const floors = scene.add.graphics().setDepth(-39000);
    for (const p of arena.plazas) {
      floors.fillStyle(0x000000, 0.18);
      floors.fillCircle(p.x + 4, p.y + 6, p.radius + 6);
      floors.fillStyle(shade(marble, 0.9), 1);
      floors.fillCircle(p.x, p.y, p.radius + 4);
      floors.fillStyle(marble, 1);
      floors.fillCircle(p.x, p.y, p.radius - 4);
      const rings = Math.max(2, Math.floor(p.radius / 48));
      for (let r = 1; r <= rings; r++) {
        const radius = (p.radius / (rings + 1)) * r;
        floors.lineStyle(2, shade(marble, 0.82), 0.8);
        floors.strokeCircle(p.x, p.y, radius);
        const slabs = 6 * r;
        for (let i = 0; i < slabs; i++) {
          const a = (i / slabs) * Math.PI * 2 + r * 0.3;
          const inner = (p.radius / (rings + 1)) * (r - 1);
          floors.lineBetween(
            p.x + Math.cos(a) * inner,
            p.y + Math.sin(a) * inner,
            p.x + Math.cos(a) * radius,
            p.y + Math.sin(a) * radius,
          );
        }
      }
      floors.lineStyle(3, shade(marble, 0.75), 0.9);
      floors.strokeCircle(p.x, p.y, p.radius - 4);
    }

    // Cliffs: a dark shadow just inside the playable edge.
    const b = arena.bounds;
    const edge = scene.add.graphics().setDepth(-38000);
    for (let i = 0; i < 4; i++) {
      edge.lineStyle(14 - i * 3, 0x000000, 0.12 + i * 0.05);
      edge.strokeRect(
        b.minX - 6 + i * 3,
        b.minY - 6 + i * 3,
        b.maxX - b.minX + 12 - i * 6,
        b.maxY - b.minY + 12 - i * 6,
      );
    }

    const sprites = new Map(
      [...config.obstacles, ...config.decorations].map((k) => [k.id, k.visual.sprite]),
    );
    for (const d of arena.decorations) {
      scene.add
        .image(d.x, d.y, sprites.get(d.kind) ?? d.kind)
        .setDepth(DEPTH.decoration)
        .setAlpha(0.9);
    }
    for (const o of arena.obstacles) {
      scene.add.image(o.x, o.y, sprites.get(o.kind) ?? o.kind).setDepth(o.y + o.radius * 0.4);
    }
    // The boss arena: a faint ritual circle on the plaza.
    const ring = scene.add.graphics().setDepth(DEPTH.decoration + 1);
    ring.lineStyle(5, 0x8b2e2e, 0.4);
    ring.strokeCircle(arena.bossArena.x, arena.bossArena.y, arena.bossArena.radius - 24);
    ring.lineStyle(2, 0x8b2e2e, 0.3);
    ring.strokeCircle(arena.bossArena.x, arena.bossArena.y, arena.bossArena.radius - 44);
  }
}
