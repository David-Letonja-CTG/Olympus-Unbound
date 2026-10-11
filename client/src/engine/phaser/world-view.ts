import Phaser from 'phaser';
import { ArenaData } from '../maps/generate-arena';
import { Element, LightSource, MapGenConfig } from '../data/types';
import { RunState } from '../sim/run-state';
import { STEP } from '../sim/run-simulation';
import { applySprite, SpriteResolver } from './assets';
import { ATMOSPHERE_DEPTH, LightMap, QualityProfile } from './atmosphere';
import { DETAIL_TEXTURE, SHADOW_TEXTURE, shade } from './textures';

/**
 * Depth bands. The y-sorted world (obstacles, enemies) sits around 0–5000; fog and the light map cover it; the
 * readability layer above the darkness keeps threats and pickups clear (spec: visual-atmosphere / readability).
 */
export const DEPTH = {
  ground: -40000,
  decoration: -30000,
  shadow: -29000,
  aura: -28000,
  silhouette: 52000,
  telegraph: 53000,
  pickup: 54000,
  playerRing: 55000,
  player: 99000,
  projectile: 100000,
  hostile: 100001,
  effects: 110000,
  bars: 120000,
  numbers: 130000,
  pointer: 140000,
} as const;

const ELEMENT_LIGHT: Partial<Record<Element, number>> = {
  lightning: 0xbfe6ff,
  fire: 0xff8a3d,
  shadow: 0x9a6aff,
};

/** Reuses sprites by entity id: `begin()`, `get(id)` for every visible entity, `end()` hides the rest. */
class SpritePool {
  private readonly active = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly free: Phaser.GameObjects.Sprite[] = [];
  private readonly seen = new Set<number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly texture: string,
  ) {}

  begin(): void {
    this.seen.clear();
  }

  get(id: number): Phaser.GameObjects.Sprite {
    this.seen.add(id);
    let sprite = this.active.get(id);
    if (!sprite) {
      sprite = this.free.pop() ?? this.scene.add.sprite(0, 0, this.texture);
      sprite.setVisible(true).setAlpha(1).setRotation(0).setScale(1).setFlipX(false).clearTint();
      this.active.set(id, sprite);
    }
    return sprite;
  }

  end(): void {
    for (const [id, sprite] of this.active) {
      if (this.seen.has(id)) continue;
      sprite.setVisible(false);
      sprite.anims.stop();
      this.active.delete(id);
      this.free.push(sprite);
    }
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface StaticLight {
  readonly x: number;
  readonly y: number;
  readonly light: LightSource;
  readonly seed: number;
}

/** Draws the arena and keeps one sprite per simulation entity in sync with its (interpolated) position. */
export class WorldView {
  private readonly pools: Record<
    | 'player'
    | 'ring'
    | 'enemy'
    | 'silhouette'
    | 'shadow'
    | 'aura'
    | 'projectile'
    | 'hostile'
    | 'pickup',
    SpritePool
  >;
  private readonly staticLights: StaticLight[] = [];
  private profile!: QualityProfile;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly resolver: SpriteResolver,
    arena: ArenaData,
    config: MapGenConfig,
    ground: HTMLCanvasElement,
  ) {
    this.drawArena(arena, config, ground);
    const pool = (texture = '__DEFAULT') => new SpritePool(scene, texture);
    this.pools = {
      player: pool(),
      ring: pool('ring'),
      enemy: pool(),
      silhouette: pool(),
      shadow: pool(SHADOW_TEXTURE),
      aura: pool('soft'),
      projectile: pool(),
      hostile: pool(),
      pickup: pool(),
    };
  }

  setQuality(profile: QualityProfile): void {
    this.profile = profile;
  }

  /** Static lights of the arena (braziers), with flicker. */
  addArenaLights(lights: LightMap, time: number): void {
    for (const l of this.staticLights) {
      const flicker = l.light.flicker
        ? 1 -
          l.light.flicker *
            0.5 *
            (1 + Math.sin(time / 90 + l.seed) * Math.sin(time / 37 + l.seed * 2)) *
            0.5
        : 1;
      lights.add(
        l.x,
        l.y - 10,
        l.light.radius * (0.92 + 0.08 * flicker),
        l.light.color,
        l.light.intensity * flicker,
        2,
      );
    }
  }

  sync(state: RunState, alpha: number, time: number, lights: LightMap): void {
    const flash = Phaser.TintModes.FILL;
    const multiply = Phaser.TintModes.MULTIPLY;
    const p = this.pools;
    for (const pool of Object.values(p)) pool.begin();

    for (const pl of state.players) {
      if (!pl.alive) continue;
      const x = lerp(pl.px, pl.x, alpha);
      const y = lerp(pl.py, pl.y, alpha);
      const moving = pl.moving;
      const r = this.resolver.resolve(pl.god.visual.sprite);
      const sprite = p.player.get(pl.id);
      const speed = Math.hypot(pl.x - pl.px, pl.y - pl.py) / STEP;
      applySprite(sprite, r, 1.15, pl.facingX < 0, moving ? 'walk' : 'idle', speed);
      const bob = r.codeDrawn && moving ? Math.sin(time / 70) * 1.5 : 0;
      sprite
        .setPosition(x, y - 6 + bob)
        .setDepth(DEPTH.player)
        .setRotation(r.codeDrawn && moving ? pl.facingX * 0.05 : 0);
      sprite.setAlpha(pl.invulnerable > 0.4 && Math.floor(time / 80) % 2 === 0 ? 0.45 : 1);
      if (pl.hurtFlash > 0) sprite.setTint(0xff5555).setTintMode(multiply);
      else sprite.clearTint();
      p.ring
        .get(pl.id)
        .setPosition(x, y + 6)
        .setDepth(DEPTH.playerRing)
        .setScale(0.42, 0.26)
        .setTint(0xffd27a)
        .setAlpha(0.55);
      p.shadow
        .get(pl.id)
        .setPosition(x, y + pl.radius * 0.7)
        .setDepth(DEPTH.shadow)
        .setScale((pl.radius * 2.6) / 64);
      lights.add(x, y, 360, 0xffe9c8, 0.95, 10);
    }

    for (const e of state.enemies) {
      const x = lerp(e.px, e.x, alpha);
      const y = lerp(e.py, e.y, alpha);
      const vx = e.x - e.px;
      const vy = e.y - e.py;
      const moving = vx * vx + vy * vy > 0.01;
      const r = this.resolver.resolve(e.def.visual.sprite);
      const scale = e.radius / e.def.radius;
      const sprite = p.enemy.get(e.id);
      const speed = Math.sqrt(vx * vx + vy * vy) / STEP;
      applySprite(
        sprite,
        r,
        scale,
        e.facing < 0,
        e.dead ? 'death' : moving ? 'walk' : 'idle',
        speed,
      );
      const bob = r.codeDrawn && moving ? Math.sin(time / 80 + e.id) * e.radius * 0.07 : 0;
      const lean = r.codeDrawn && moving ? Math.max(-1, Math.min(1, vx)) * 0.07 : 0;
      sprite
        .setPosition(x, y + bob)
        .setDepth(y)
        .setRotation(lean);
      const s = e.status;
      if (e.hitFlash > 0) sprite.setTint(0xffffff).setTintMode(flash);
      else if (e.mode === 'windup') sprite.setTint(0xff6040).setTintMode(multiply);
      else if (s.stun > 0) sprite.setTint(0xfff27a).setTintMode(multiply);
      else if (s.burn > 0) sprite.setTint(0xffa060).setTintMode(multiply);
      else if (s.shock > 0) sprite.setTint(0xa8e6ff).setTintMode(multiply);
      else if (s.slow > 0) sprite.setTint(0xc8a8ff).setTintMode(multiply);
      else sprite.clearTint();

      // The same figure again above the darkness, partly transparent: every enemy stays readable in the dark
      // and keeps its own colours (spec: visual-atmosphere / readability guarantees).
      const sil = p.silhouette.get(e.id);
      sil
        .setTexture(sprite.texture.key, sprite.frame.name)
        .setOrigin(sprite.originX, sprite.originY)
        .setScale(sprite.scaleX, sprite.scaleY)
        .setFlipX(sprite.flipX)
        .setRotation(sprite.rotation)
        .setPosition(sprite.x, sprite.y)
        .setDepth(DEPTH.silhouette)
        .setAlpha(Math.min(1, this.profile.silhouette * (e.elite || e.boss ? 1.5 : 1)));
      if (sprite.isTinted) sil.setTint(sprite.tintTopLeft).setTintMode(sprite.tintMode);
      else sil.clearTint();
      p.shadow
        .get(e.id)
        .setPosition(x, y + e.radius * 0.75)
        .setDepth(DEPTH.shadow)
        .setScale((e.radius * 2.6) / 64);

      if (e.elite || e.boss) {
        const pulse = 1 + Math.sin(time / 180 + e.id) * 0.08;
        p.aura
          .get(e.id)
          .setPosition(x, y + e.radius * 0.3)
          .setDepth(DEPTH.aura)
          .setScale(((e.radius * 2.6) / 64) * pulse)
          .setTint(e.boss ? 0xff4422 : 0xffcc33)
          .setAlpha(0.55)
          .setBlendMode(Phaser.BlendModes.ADD);
        lights.add(
          x,
          y,
          e.boss ? 280 : 150,
          e.boss ? 0xff5a2a : 0xffcc66,
          e.boss ? 0.75 : 0.55,
          e.boss ? 8 : 5,
        );
      }
      if (s.burn > 0) lights.add(x, y, 70, 0xff8a3d, 0.45, 1);
    }

    for (const pr of state.projectiles) {
      const x = lerp(pr.px, pr.x, alpha);
      const y = lerp(pr.py, pr.y, alpha);
      const sprite = p.projectile.get(pr.id);
      applySprite(sprite, this.resolver.resolve(pr.sprite), 1, false);
      sprite
        .setPosition(x, y)
        .setDepth(DEPTH.projectile)
        .setRotation(pr.orbit ? time / 150 : Math.atan2(pr.vy, pr.vx));
      const color = ELEMENT_LIGHT[pr.source.element];
      if (color) lights.add(x, y, pr.orbit ? 120 : 95, color, 0.7, 1);
    }

    for (const h of state.hostileProjectiles) {
      const x = lerp(h.px, h.x, alpha);
      const y = lerp(h.py, h.y, alpha);
      const sprite = p.hostile.get(h.id);
      applySprite(sprite, this.resolver.resolve(h.sprite), 1, false);
      sprite.setPosition(x, y).setRotation(Math.atan2(h.vy, h.vx)).setDepth(DEPTH.hostile);
      lights.add(x, y, 55, 0xff5a2a, 0.45, 0);
    }

    for (const pk of state.pickups) {
      const key = pk.kind === 'xp' ? (pk.value >= 5 ? 'xp_large' : 'xp_small') : pk.kind;
      const bob = pk.kind === 'chest' || pk.kind === 'heal' ? Math.sin(time / 250 + pk.id) * 3 : 0;
      const sprite = p.pickup.get(pk.id);
      applySprite(sprite, this.resolver.resolve(key), 1, false);
      sprite.setPosition(pk.x, pk.y + bob).setDepth(DEPTH.pickup);
      if (pk.kind === 'chest') lights.add(pk.x, pk.y, 120, 0xffd27a, 0.7, 3);
    }

    for (const pool of Object.values(p)) pool.end();
  }

  private drawArena(arena: ArenaData, config: MapGenConfig, ground: HTMLCanvasElement): void {
    const scene = this.scene;
    // Ground: painted for this run behind the loading screen (ground-canvas.ts), plus a tiled grain overlay.
    const groundKey = `arena-ground-${arena.seed}-${ground.width}`;
    if (scene.textures.exists(groundKey)) scene.textures.remove(groundKey);
    scene.textures.addCanvas(groundKey, ground);
    scene.add
      .image(0, 0, groundKey)
      .setOrigin(0)
      .setDisplaySize(arena.width, arena.height)
      .setDepth(DEPTH.ground);
    scene.add
      .tileSprite(0, 0, arena.width, arena.height, DETAIL_TEXTURE)
      .setOrigin(0)
      .setDepth(DEPTH.ground + 1);

    // Marble floors: concentric courses of worn slabs.
    const marble =
      config.terrain.types.find((t) => t.id === config.terrain.plaza)?.color ?? 0xcccccc;
    const floors = scene.add.graphics().setDepth(DEPTH.ground + 1000);
    for (const pz of arena.plazas) {
      floors.fillStyle(0x000000, 0.28);
      floors.fillCircle(pz.x + 5, pz.y + 7, pz.radius + 8);
      floors.fillStyle(shade(marble, 0.78), 1);
      floors.fillCircle(pz.x, pz.y, pz.radius + 4);
      floors.fillStyle(marble, 1);
      floors.fillCircle(pz.x, pz.y, pz.radius - 4);
      const rings = Math.max(2, Math.floor(pz.radius / 48));
      for (let r = 1; r <= rings; r++) {
        const radius = (pz.radius / (rings + 1)) * r;
        floors.lineStyle(2, shade(marble, 0.7), 0.85);
        floors.strokeCircle(pz.x, pz.y, radius);
        const slabs = 6 * r;
        for (let i = 0; i < slabs; i++) {
          const a = (i / slabs) * Math.PI * 2 + r * 0.3;
          const inner = (pz.radius / (rings + 1)) * (r - 1);
          floors.lineBetween(
            pz.x + Math.cos(a) * inner,
            pz.y + Math.sin(a) * inner,
            pz.x + Math.cos(a) * radius,
            pz.y + Math.sin(a) * radius,
          );
        }
      }
      floors.lineStyle(4, shade(marble, 0.55), 0.95);
      floors.strokeCircle(pz.x, pz.y, pz.radius - 4);
    }

    // Temples: a stylobate of three worn steps, a floor of slabs, cracks across it.
    for (const t of arena.temples) {
      for (let step = 3; step >= 1; step--) {
        const m = step * 10;
        floors.fillStyle(shade(marble, 0.62 + 0.08 * (3 - step)), 1);
        floors.fillRect(
          t.x - t.width / 2 - m,
          t.y - t.depth / 2 - m,
          t.width + 2 * m,
          t.depth + 2 * m,
        );
        floors.lineStyle(2, shade(marble, 0.5), 0.9);
        floors.strokeRect(
          t.x - t.width / 2 - m,
          t.y - t.depth / 2 - m,
          t.width + 2 * m,
          t.depth + 2 * m,
        );
      }
      floors.fillStyle(marble, 1);
      floors.fillRect(t.x - t.width / 2, t.y - t.depth / 2, t.width, t.depth);
      floors.lineStyle(1.5, shade(marble, 0.72), 0.8);
      const slab = 56;
      for (let x = t.x - t.width / 2 + slab; x < t.x + t.width / 2; x += slab)
        floors.lineBetween(x, t.y - t.depth / 2, x, t.y + t.depth / 2);
      for (let y = t.y - t.depth / 2 + slab / 2; y < t.y + t.depth / 2; y += slab / 2)
        floors.lineBetween(t.x - t.width / 2, y, t.x + t.width / 2, y);
      // A few cracks, from the arena's seed so the same temple always breaks the same way.
      floors.lineStyle(2, shade(marble, 0.45), 0.7);
      let h = (arena.seed * 2654435761) >>> 0;
      const next = () => (h = (Math.imul(h ^ (h >>> 15), 2246822519) + 1) >>> 0) / 4294967296;
      for (let c = 0; c < 5; c++) {
        let x = t.x + (next() - 0.5) * t.width * 0.9;
        let y = t.y + (next() - 0.5) * t.depth * 0.9;
        for (let k = 0; k < 4; k++) {
          const nx = x + (next() - 0.5) * 60;
          const ny = y + (next() - 0.5) * 60;
          floors.lineBetween(x, y, nx, ny);
          [x, y] = [nx, ny];
        }
      }
    }

    // Cliffs: a deep shadow just inside the playable edge.
    const b = arena.bounds;
    const edge = scene.add.graphics().setDepth(DEPTH.ground + 2000);
    for (let i = 0; i < 6; i++) {
      edge.lineStyle(18 - i * 3, 0x000000, 0.12 + i * 0.06);
      edge.strokeRect(
        b.minX - 8 + i * 3,
        b.minY - 8 + i * 3,
        b.maxX - b.minX + 16 - i * 6,
        b.maxY - b.minY + 16 - i * 6,
      );
    }

    const kinds = new Map([...config.obstacles, ...config.decorations].map((k) => [k.id, k]));
    for (const d of arena.decorations) {
      const r = this.resolver.resolve(kinds.get(d.kind)?.visual.sprite ?? d.kind);
      const sprite = scene.add
        .sprite(d.x, d.y, r.texture, r.frame)
        .setDepth(DEPTH.decoration)
        .setAlpha(0.9);
      sprite.setOrigin(r.originX, r.originY).setScale(r.scale);
    }
    for (const o of arena.obstacles) {
      const kind = config.obstacles.find((k) => k.id === o.kind);
      const r = this.resolver.resolve(kind?.visual.sprite ?? o.kind);
      scene.add
        .sprite(o.x, o.y, r.texture, r.frame)
        .setOrigin(r.originX, r.originY)
        .setScale(r.scale)
        .setDepth(o.y + o.radius * 0.4);
      if (kind?.light)
        this.staticLights.push({ x: o.x, y: o.y, light: kind.light, seed: o.id * 1.37 });
    }
    // The boss arena: a ritual circle of dried blood on the plaza.
    const ring = scene.add.graphics().setDepth(DEPTH.decoration + 1);
    ring.lineStyle(6, 0x5a1414, 0.55);
    ring.strokeCircle(arena.bossArena.x, arena.bossArena.y, arena.bossArena.radius - 24);
    ring.lineStyle(2, 0x5a1414, 0.45);
    ring.strokeCircle(arena.bossArena.x, arena.bossArena.y, arena.bossArena.radius - 46);
  }
}

export { ATMOSPHERE_DEPTH };
