import Phaser from 'phaser';
import { ArenaData, ArenaFeature } from '../maps/generate-arena';
import { Element, FeatureRule, LightSource, MapGenConfig } from '../data/types';
import { crusherReach } from '../sim/features';
import { STEP } from '../sim/run-state';
import { MAX_MOTES, playerLook, skinnedSprite } from '../sim/look';
import { FramePlayer, WorldFrame } from '../sim/world-frame';
import { AnimationName } from '../data/assets';
import { WalkHold } from './walk-hold';
import { applySprite, ResolvedSprite, SpriteResolver } from './assets';
import { ATMOSPHERE_DEPTH, LightMap, QualityProfile } from './atmosphere';
import { DETAIL_TEXTURE, SHADOW_TEXTURE, shade } from './textures';

/**
 * Depth bands. The y-sorted world (obstacles, enemies) sits around 0–5000; fog and the light map cover it; the
 * readability layer above the darkness keeps threats and pickups clear (spec: visual-atmosphere / readability).
 */
/** The merchant is the intro's smith, a friendly figure of the cast, a little warmed (D15). */
const MERCHANT_SPRITE = 'ally_smith';
const MERCHANT_TINT = 0xfff2dc;
/** Pool key of the merchant: entity IDs start at 1. */
const MERCHANT_ID = -1;
/** Shifting walls are the Labyrinth's wall blocks; seconds they take to rise or sink. */
const WALL_SPRITE = 'labyrinth_wall';
const WALL_RISE = 0.3;

/** The god's body language (spec: player-control / the god's body language): dash lean, its easing per frame,
 * and the push of a blow in px at its start (`hurtFlash` starts at HURT_FLASH, combat/damage.ts). */
const DASH_LEAN = 0.18;
const LEAN_EASE = 0.25;
const KNOCKBACK = 5;
const HURT_FLASH = 0.25;
/** Frames in an evolved weapon's trail, and how long the column of light of a better look lasts (ms). */
const TRAIL = 2;
/** A crown's width as a share of the figure's frame. */
const CROWN_SIZE = 0.16;
const COLUMN_MS = 800;
/** Embers a boss in its last phase sheds at once. */
const FINAL_EMBERS = 8;

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
      // Forget it, so the next figure given this sprite starts its animation even if it is the same one.
      sprite.anims.currentAnim = null;
      this.active.delete(id);
      this.free.push(sprite);
    }
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * World units beyond the camera's view (plus a few radii of the figure) within which enemies are drawn. Enemies further
 * out get no sprites at all: a full horde is mostly off screen, and three sprites each cost a phone dearly (spec:
 * phone-play / phone performance). The margin covers a frame's camera movement and the party's zoom-out.
 */
const CULL_MARGIN = 220;

/** Enemies drawn above the darkness (Low) are dimmed by this multiply tint, about the night's light on a figure. */
const NIGHT_TINT = 0xb8b4c4;

interface StaticLight {
  readonly x: number;
  readonly y: number;
  readonly light: LightSource;
  readonly seed: number;
  /** A feature's light is off while its brazier is cold or its spring dry. */
  on?: boolean;
}

/** A hazard's or helper's sprites (spec: arena-generation / map hazards, map helpers). */
interface FeatureView {
  readonly feature: ArenaFeature;
  readonly rule: FeatureRule;
  readonly main?: Phaser.GameObjects.Sprite;
  readonly shaft?: Phaser.GameObjects.Sprite;
  readonly slabs?: readonly [Phaser.GameObjects.Sprite, Phaser.GameObjects.Sprite];
  readonly light?: StaticLight;
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
    | 'pickup'
    | 'companion'
    | 'npc'
    | 'wall'
    | 'glow'
    | 'ember'
    | 'armour'
    | 'weapon'
    | 'weaponGlow'
    | 'trail'
    | 'mote'
    | 'column'
    | 'crown',
    SpritePool
  >;
  /** Per god: the ability casts last seen and when the swing they started ends (spec: player-control / the god's body language). */
  private readonly swings = new Map<
    number,
    { casts: number; until: number; pose: AnimationName }
  >();
  /** Per god: the look last drawn, when its column of light rose, and the weapon's last frames (its trail). */
  private readonly looks = new Map<number, number>();
  private readonly columns = new Map<number, number>();
  private readonly trails = new Map<number, string[]>();
  /** The dash lean, eased in and out, per god. */
  private readonly leans = new Map<number, number>();
  private readonly staticLights: StaticLight[] = [];
  /** One static sprite per breakable prop, hidden once broken (spec: arena-generation / breakable props). */
  private readonly props: Phaser.GameObjects.Sprite[] = [];
  private shownBroken = 0;
  /** Trees and reeds rocking in the wind on High (spec: visual-atmosphere / ambient life). */
  private readonly swaying: { sprite: Phaser.GameObjects.Sprite; amp: number; seed: number }[] = [];
  private readonly features: FeatureView[] = [];
  private shownFeatures = -1;
  /** Half a crusher's line, where its slabs stand. */
  private crusherHalf = 0;
  /** Which enemies are drawn walking (no restart of their walk on every short stop). */
  private readonly walk = new WalkHold();
  private walkPruned = 0;
  private profile!: QualityProfile;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly resolver: SpriteResolver,
    arena: ArenaData,
    config: MapGenConfig,
    ground: HTMLCanvasElement,
    /** The run's event currency picture (spec: seasonal-events / event currency). */
    private readonly tokenSprite = 'token',
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
      companion: pool(),
      npc: pool(),
      wall: pool(),
      glow: pool(),
      ember: pool('spark'),
      armour: pool(),
      weapon: pool(),
      weaponGlow: pool(),
      trail: pool(),
      mote: pool('spark'),
      column: pool('soft'),
      crown: pool(),
    };
  }

  /**
   * Whether the god is in the swing its ability started: a new cast (re)starts it from its first frame, and it
   * lasts one play of the sheet's attack (spec: player-control / the god's body language).
   */
  private swing(
    pl: FramePlayer,
    r: ResolvedSprite,
    sprite: Phaser.GameObjects.Sprite,
    time: number,
  ): AnimationName | undefined {
    const seen = this.swings.get(pl.id);
    if (!seen) {
      this.swings.set(pl.id, { casts: pl.casts, until: 0, pose: 'attack' });
      return undefined;
    }
    if (seen.casts !== pl.casts) {
      seen.casts = pl.casts;
      this.pose(seen, 'attack', r, sprite, time);
    }
    return time < seen.until ? seen.pose : undefined;
  }

  /** Starts a one-shot pose (the swing, the cast) from its first frame, when the sheet has it. */
  private pose(
    seen: { until: number; pose: AnimationName },
    pose: AnimationName,
    r: ResolvedSprite,
    sprite: Phaser.GameObjects.Sprite,
    time: number,
  ): void {
    const key = r.animations[pose];
    if (!key) return;
    const anim = sprite.scene.anims.get(key);
    seen.until = time + (anim ? anim.duration : 0);
    seen.pose = pose;
    if (sprite.anims.currentAnim?.key === key) sprite.anims.restart();
  }

  /**
   * The god's gear over its empty-handed figure (spec: god-appearance): the armour look tinted in the armour's
   * colour, the strongest weapon (glowing and trailing once evolved), relic motes, and a column of light with the
   * cast pose when the look rises. Layers take the figure's frame, so they move with it on every frame.
   */
  private gear(
    pl: FramePlayer,
    body: string,
    r: ResolvedSprite,
    sprite: Phaser.GameObjects.Sprite,
    swinging: boolean,
    time: number,
    lights: LightMap,
  ): void {
    const g = pl.gear ?? (pl.loadout ? playerLook(pl.loadout) : undefined);
    if (!g) return;
    const p = this.pools;
    const seen = this.looks.get(pl.id);
    if (seen !== undefined && g.look > seen) {
      this.columns.set(pl.id, time);
      const swing = this.swings.get(pl.id);
      if (swing) this.pose(swing, 'cast', r, sprite, time);
    }
    this.looks.set(pl.id, g.look);
    if (g.look > 0)
      this.layer(p.armour.get(pl.id), `armour_${body}_${g.look}`, sprite, 0.1)
        ?.setTint(g.armourColor ?? 0xffffff)
        .setTintMode(Phaser.TintModes.MULTIPLY);
    const trail = this.trails.get(pl.id) ?? [];
    this.trails.set(pl.id, trail);
    if (g.weapon) {
      const key = `weapon_${body}_${g.weapon}`;
      const weapon = this.layer(p.weapon.get(pl.id), key, sprite, 0.2);
      const glow = g.evolutionColor;
      if (weapon && glow !== undefined) {
        const pulse = 0.45 + 0.2 * Math.sin(time / 160 + pl.id);
        this.layer(p.weaponGlow.get(pl.id), key, sprite, 0.3)
          ?.setTint(glow)
          .setTintMode(Phaser.TintModes.MULTIPLY)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(pulse);
        // A short trail of the last frames while the god swings.
        if (swinging)
          trail.forEach((frame, k) =>
            this.layer(p.trail.get(pl.id * TRAIL + k), key, sprite, 0.15)
              ?.setFrame(frame)
              .setTint(glow)
              .setTintMode(Phaser.TintModes.MULTIPLY)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setAlpha(0.2 + 0.15 * k),
          );
        lights.add(sprite.x, sprite.y - 20, 70, glow, 0.4, 2);
      }
    }
    trail.push(String(sprite.frame.name));
    if (trail.length > TRAIL) trail.shift();
    // Relic motes on a flat orbit, behind the god on its far side.
    const n = g.relicColors.length;
    for (let i = 0; i < n; i++) {
      const a = time / 700 + (i * Math.PI * 2) / n + pl.id;
      p.mote
        .get(pl.id * MAX_MOTES + i)
        .setPosition(sprite.x + Math.cos(a) * 20, sprite.y - 16 + Math.sin(a) * 7)
        .setDepth(DEPTH.player + (Math.sin(a) > 0 ? 1 : -1))
        .setScale(0.22)
        .setTint(g.relicColors[i])
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.9);
    }
    const since = time - (this.columns.get(pl.id) ?? -Infinity);
    if (since < COLUMN_MS) {
      const t = since / COLUMN_MS;
      p.column
        .get(pl.id)
        .setPosition(sprite.x, sprite.y - 30)
        .setDepth(DEPTH.player + 2)
        .setScale(0.5 * (1 - t * 0.5), 3)
        .setTint(0xffe9a8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(1 - t);
      lights.add(sprite.x, sprite.y, 200, 0xffe9a8, 1 - t, 4);
    }
  }

  /** A god's sprite in a skin; a skin this game does not know is drawn as the default (spec: co-op). */
  private skinned(sprite: string, skin: string | undefined): ResolvedSprite {
    const r = this.resolver.resolve(skinnedSprite(sprite, skin));
    return r.codeDrawn && skin ? this.resolver.resolve(sprite) : r;
  }

  /** The god's crown on the top of its head in this frame (spec: god-appearance / boss trophies). */
  private crown(
    id: number,
    crown: string,
    r: ResolvedSprite,
    sprite: Phaser.GameObjects.Sprite,
  ): void {
    const head = r.heads?.[Number(sprite.frame.name)];
    if (!head) return;
    const w = sprite.displayWidth;
    const h = sprite.displayHeight;
    const hx = sprite.flipX ? 1 - head[0] : head[0];
    const size = w * CROWN_SIZE;
    this.pools.crown
      .get(id)
      .setTexture(`crown_${crown}`)
      .setOrigin(0.5, 0.7)
      .setDisplaySize(size, size)
      .setFlipX(sprite.flipX)
      .setPosition(sprite.x + (hx - sprite.originX) * w, sprite.y + (head[1] - sprite.originY) * h)
      .setDepth(sprite.depth + 0.4)
      .setAlpha(sprite.alpha);
  }

  /** A gear layer drawn over `sprite` on its frame, or nothing while its sheet is not loaded. */
  private layer(
    target: Phaser.GameObjects.Sprite,
    key: string,
    sprite: Phaser.GameObjects.Sprite,
    above: number,
  ): Phaser.GameObjects.Sprite | undefined {
    const r = this.resolver.resolve(key);
    if (r.codeDrawn) {
      target.setVisible(false);
      return undefined;
    }
    return target
      .setVisible(true)
      .setTexture(r.texture, sprite.frame.name)
      .setOrigin(sprite.originX, sprite.originY)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setFlipX(sprite.flipX)
      .setRotation(sprite.rotation)
      .setPosition(sprite.x, sprite.y)
      .setDepth(sprite.depth + above)
      .setAlpha(sprite.alpha)
      .clearTint()
      .setBlendMode(Phaser.BlendModes.NORMAL);
  }

  /** Eases a god's lean towards `target` (radians). */
  private lean(id: number, target: number): number {
    const lean = (this.leans.get(id) ?? 0) * (1 - LEAN_EASE) + target * LEAN_EASE;
    this.leans.set(id, lean);
    return lean;
  }

  /**
   * A boss in its last phase (spec: boss-encounter / the final phase shows): its figure glows through in embers as
   * if cracked, its eyes burn and it sheds embers. Drawn over the figure, under the telegraphs' layer.
   */
  private finalPhase(
    id: number,
    sprite: Phaser.GameObjects.Sprite,
    x: number,
    y: number,
    radius: number,
    time: number,
    lights: LightMap,
  ): void {
    const p = this.pools;
    const pulse = 0.35 + 0.2 * Math.sin(time / 140 + id);
    p.glow
      .get(id)
      .setTexture(sprite.texture.key, sprite.frame.name)
      .setOrigin(sprite.originX, sprite.originY)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setFlipX(sprite.flipX)
      .setRotation(sprite.rotation)
      .setPosition(sprite.x, sprite.y)
      .setDepth(sprite.depth + 0.5)
      .setTint(0xff5a1e)
      .setTintMode(Phaser.TintModes.MULTIPLY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(pulse);
    // The eyes: a hot light at the top of the figure.
    const top = sprite.y - sprite.displayHeight * sprite.originY * 0.62;
    lights.add(sprite.x, top, 90, 0xff6a2a, 0.9, 3);
    for (let i = 0; i < FINAL_EMBERS; i++) {
      const life = (((time / 1400 + i / FINAL_EMBERS + (id % 7) * 0.13) % 1) + 1) % 1;
      const angle = i * 2.4 + id;
      p.ember
        .get(id * FINAL_EMBERS + i)
        .setPosition(
          x + Math.cos(angle) * radius * (0.4 + life * 0.5),
          y - radius * 0.6 - life * radius * 1.8,
        )
        .setDepth(sprite.depth + 1)
        .setScale(0.35 * (1 - life))
        .setTint(life < 0.5 ? 0xffb050 : 0xff5a1e)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(1 - life);
    }
  }

  setQuality(profile: QualityProfile): void {
    this.profile = profile;
    if (!profile.sway) for (const t of this.swaying) t.sprite.setRotation(0);
  }

  /** The fires among the static lights (they flicker; soul lights hardly do), lit ones only: smoke rises from them. */
  fireLights(): readonly { x: number; y: number }[] {
    return this.staticLights.filter((l) => l.on !== false && (l.light.flicker ?? 0) >= 0.25);
  }

  /** Static lights of the arena (braziers), with flicker. */
  addArenaLights(lights: LightMap, time: number): void {
    for (const l of this.staticLights) {
      if (l.on === false) continue;
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

  sync(state: WorldFrame, alpha: number, time: number, lights: LightMap): void {
    if (state.brokenProps !== this.shownBroken) {
      this.shownBroken = state.brokenProps;
      for (let i = 0; i < this.props.length; i++)
        this.props[i].setVisible(!((state.brokenProps >>> i) & 1));
    }
    if (state.features !== this.shownFeatures) this.showFeatures(state.features);
    if (this.profile.sway)
      for (const t of this.swaying)
        t.sprite.setRotation(
          t.amp * (Math.sin(time / 1100 + t.seed) * 0.7 + Math.sin(time / 430 + t.seed * 3) * 0.3),
        );
    if (this.crusherHalf > 0) this.moveSlabs(state);
    if (time - this.walkPruned > 1000) {
      this.walk.prune(time);
      this.walkPruned = time;
    }
    // Movement per step, whatever the gap between the previous and current positions (a guest's snapshots, D16).
    const perStep = STEP / state.span;
    const flash = Phaser.TintModes.FILL;
    const multiply = Phaser.TintModes.MULTIPLY;
    const p = this.pools;
    for (const pool of Object.values(p)) pool.begin();

    for (const pl of state.players) {
      if (!pl.alive) {
        // A fallen ally's spirit waits where they fell (spec: co-op / reviving allies); Effects draws its ring.
        if (!pl.left && state.players.length > 1) this.spirit(pl, time, lights);
        continue;
      }
      const x = lerp(pl.px, pl.x, alpha);
      const y = lerp(pl.py, pl.y, alpha);
      const moving = pl.moving;
      // The empty-handed figure with its gear once its sheet is in, else the god's armed sheet.
      const figure = pl.god.figure;
      // In the player's skin (spec: god-appearance / skins): the same sheet recoloured.
      const bare = figure && this.skinned(figure.sprite, pl.skin);
      const r = bare && !bare.codeDrawn ? bare : this.skinned(pl.god.visual.sprite, pl.skin);
      const sprite = p.player.get(pl.id);
      const speed = Math.hypot(pl.x - pl.px, pl.y - pl.py) / state.span;
      const pose = this.swing(pl, r, sprite, time);
      applySprite(sprite, r, 1.15, pl.facingX < 0, pose ?? (moving ? 'walk' : 'idle'), speed);
      const bob = r.codeDrawn && moving ? Math.sin(time / 70) * 1.5 : 0;
      // Drawing only: a lean into the dash and a push away from the last blow; the god's position is the rules'.
      const lean = this.lean(pl.id, pl.dashTime > 0 ? pl.facingX * DASH_LEAN : 0);
      const push = (pl.hurtFlash / HURT_FLASH) * KNOCKBACK;
      sprite
        .setPosition(x + pl.hurtX * push, y - 6 + bob + pl.hurtY * push)
        .setDepth(DEPTH.player)
        .setRotation((r.codeDrawn && moving ? pl.facingX * 0.05 : 0) + lean);
      sprite.setAlpha(pl.invulnerable > 0.4 && Math.floor(time / 80) % 2 === 0 ? 0.45 : 1);
      if (pl.hurtFlash > 0) sprite.setTint(0xff5555).setTintMode(multiply);
      else sprite.clearTint();
      if (figure && r === bare)
        this.gear(pl, figure.body, r, sprite, pose === 'attack', time, lights);
      if (pl.crown) this.crown(pl.id, pl.crown, r, sprite);
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

    // Last frame's view: the camera is placed after the world is synced; the margin covers the difference.
    const view = this.scene.cameras.main.worldView;
    const cull = view.width > 0;
    for (const e of state.enemies) {
      const x = lerp(e.px, e.x, alpha);
      const y = lerp(e.py, e.y, alpha);
      const reach = CULL_MARGIN + e.radius * 3;
      if (
        cull &&
        (x < view.x - reach ||
          x > view.right + reach ||
          y < view.y - reach ||
          y > view.bottom + reach)
      ) {
        // Off screen: no sprites, but its light still reaches into the view.
        if (e.elite || e.boss)
          lights.add(
            x,
            y,
            e.boss ? 280 : 150,
            e.boss ? 0xff5a2a : 0xffcc66,
            e.boss ? 0.75 : 0.55,
            e.boss ? 8 : 5,
          );
        continue;
      }
      const vx = (e.x - e.px) * perStep;
      const vy = (e.y - e.py) * perStep;
      const moving = this.walk.walking(e.id, vx * vx + vy * vy > 0.01, time);
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
      // Low (phones): the figure itself above the darkness, still in y order, instead of a lit figure and a copy.
      const aboveDark = this.profile.enemiesAboveDark;
      sprite
        .setPosition(x, y + bob)
        .setDepth(aboveDark ? DEPTH.silhouette + y / 10 : y)
        .setRotation(lean);
      const s = e.status;
      if (e.hitFlash > 0) sprite.setTint(0xffffff).setTintMode(flash);
      else if (e.mode === 'windup') sprite.setTint(0xff6040).setTintMode(multiply);
      else if (s.stun > 0) sprite.setTint(0xfff27a).setTintMode(multiply);
      else if (s.burn > 0) sprite.setTint(0xffa060).setTintMode(multiply);
      else if (s.shock > 0) sprite.setTint(0xa8e6ff).setTintMode(multiply);
      else if (s.slow > 0) sprite.setTint(0xc8a8ff).setTintMode(multiply);
      // Boss mechanics (spec: boss-encounter / attack warnings): shielded parts in stone grey, a raging boss red.
      else if (e.guarded) sprite.setTint(0x8a8a8a).setTintMode(multiply);
      else if (e.boss?.enraged) sprite.setTint(0xff7a60).setTintMode(multiply);
      // Above the darkness, a night tint keeps it in the scene; elites and bosses are lit by their own glow.
      else if (aboveDark && !e.elite && !e.boss) sprite.setTint(NIGHT_TINT).setTintMode(multiply);
      else sprite.clearTint();

      // The same figure again above the darkness, partly transparent: every enemy stays readable in the dark
      // and keeps its own colours (spec: visual-atmosphere / readability guarantees).
      const sil = aboveDark ? undefined : p.silhouette.get(e.id);
      sil
        ?.setTexture(sprite.texture.key, sprite.frame.name)
        .setOrigin(sprite.originX, sprite.originY)
        .setScale(sprite.scaleX, sprite.scaleY)
        .setFlipX(sprite.flipX)
        .setRotation(sprite.rotation)
        .setPosition(sprite.x, sprite.y)
        .setDepth(DEPTH.silhouette)
        .setAlpha(Math.min(1, this.profile.silhouette * (e.elite || e.boss ? 1.5 : 1)));
      if (sprite.isTinted) sil?.setTint(sprite.tintTopLeft).setTintMode(sprite.tintMode);
      else sil?.clearTint();
      if (this.profile.enemyShadows || e.elite || e.boss)
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
      if (e.boss?.final && !e.dead) this.finalPhase(e.id, sprite, x, y, e.radius, time, lights);
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
      const key =
        pk.kind === 'xp'
          ? pk.value >= 5
            ? 'xp_large'
            : 'xp_small'
          : pk.kind === 'token'
            ? this.tokenSprite
            : pk.kind;
      const bob = pk.kind === 'chest' || pk.kind === 'heal' ? Math.sin(time / 250 + pk.id) * 3 : 0;
      const sprite = p.pickup.get(pk.id);
      applySprite(sprite, this.resolver.resolve(key), 1, false);
      sprite.setPosition(pk.x, pk.y + bob).setDepth(DEPTH.pickup);
      if (pk.kind === 'chest') lights.add(pk.x, pk.y, 120, 0xffd27a, 0.7, 3);
    }

    // Companions: an existing sheet in a warm tint, so they read as allies (spec: merchant / companions, D15).
    for (const c of state.companions) {
      const x = lerp(c.px, c.x, alpha);
      const y = lerp(c.py, c.y, alpha);
      const r = this.resolver.resolve(c.def.visual.sprite);
      const sprite = p.companion.get(c.id);
      const speed = Math.hypot(c.x - c.px, c.y - c.py) / state.span;
      applySprite(sprite, r, c.def.visual.scale, c.facingX < 0, c.moving ? 'walk' : 'idle', speed);
      sprite
        .setPosition(x, y)
        .setDepth(y)
        .setRotation(0)
        .setTint(c.def.visual.tint)
        .setTintMode(multiply);
      p.shadow
        .get(c.id)
        .setPosition(x, y + c.def.radius * 0.7)
        .setDepth(DEPTH.shadow)
        .setScale((c.def.radius * 2.6) / 64);
      lights.add(x, y, 90, c.def.visual.color, 0.45, 2);
    }

    // Shifting walls: the Labyrinth's blocks rising from the floor and sinking back (spec: boss-encounter).
    for (const w of state.walls) {
      const r = this.resolver.resolve(WALL_SPRITE);
      const sprite = p.wall.get(w.id);
      applySprite(sprite, r, 1, false, 'idle', 0);
      const rise = Math.min(1, w.age / WALL_RISE, w.left / WALL_RISE);
      sprite
        .setPosition(w.x, w.y + (1 - rise) * 18)
        .setDepth(w.y + w.radius * 0.4)
        .setRotation(0)
        .setAlpha(0.35 + 0.65 * rise)
        .clearTint();
      sprite.setScale(r.scale, r.scale * (0.3 + 0.7 * rise));
    }

    // The Wandering Merchant: lit by its own lantern so it stays readable at night (D13).
    const m = state.merchant;
    if (m) {
      const r = this.resolver.resolve(MERCHANT_SPRITE);
      const sprite = p.npc.get(MERCHANT_ID);
      applySprite(sprite, r, 1.1, true, 'idle', 0);
      sprite
        .setPosition(m.x, m.y - 4)
        .setDepth(m.y)
        .setRotation(0)
        .setTint(MERCHANT_TINT)
        .setTintMode(multiply);
      p.shadow
        .get(MERCHANT_ID)
        .setPosition(m.x, m.y + 18)
        .setDepth(DEPTH.shadow)
        .setScale(1);
      const flicker = 0.9 + Math.sin(time / 130) * 0.06 + Math.sin(time / 47) * 0.04;
      lights.add(m.x, m.y, 240 * flicker, 0xffc870, 0.95, 8);
    }

    for (const pool of Object.values(p)) pool.end();
  }

  private sprite(id: string, x: number, y: number, depth: number): Phaser.GameObjects.Sprite {
    const r = this.resolver.resolve(id);
    return this.scene.add
      .sprite(x, y, r.texture, r.frame)
      .setOrigin(r.originX, r.originY)
      .setScale(r.scale)
      .setDepth(depth);
  }

  /** One view per feature; a teetering column is its obstacle's own sprite, leaning toward its fall. */
  private drawFeatures(
    arena: ArenaData,
    config: MapGenConfig,
    obstacleSprites: readonly Phaser.GameObjects.Sprite[],
  ): void {
    const rules = config.features ?? [];
    for (const f of arena.features) {
      const rule = rules[f.rule];
      const seed = f.id * 2.11;
      if (rule.type === 'vent' || rule.type === 'spring') {
        const main = this.sprite(rule.visual.sprite, f.x, f.y, DEPTH.decoration + 2);
        const light = rule.light && { x: f.x, y: f.y + 10, light: rule.light, seed };
        if (light) this.staticLights.push(light);
        this.features.push({ feature: f, rule, main, light });
      } else if (rule.type === 'teetering') {
        const o = arena.obstacles.find((ob) => ob.x === f.x && ob.y === f.y);
        const main = o && obstacleSprites[o.id];
        if (!main) continue;
        main.setRotation(Math.cos(f.angle) >= 0 ? 0.12 : -0.12);
        const mx = f.x + Math.cos(f.angle) * rule.length * 0.5;
        const my = f.y + Math.sin(f.angle) * rule.length * 0.5;
        const shaft = this.sprite(rule.shaft, mx, my, my).setRotation(f.angle).setVisible(false);
        this.features.push({ feature: f, rule, main, shaft });
      } else if (rule.type === 'crusher') {
        this.crusherHalf = crusherReach(arena);
        const slab = (flip: boolean) =>
          this.sprite(rule.visual.sprite, f.x, f.y, f.y).setRotation(f.angle).setFlipX(flip);
        this.features.push({ feature: f, rule, slabs: [slab(false), slab(true)] });
      } else {
        const main = this.sprite(rule.visual.sprite, f.x, f.y, f.y + 6);
        const light: StaticLight = { x: f.x, y: f.y, light: rule.light, seed, on: false };
        this.staticLights.push(light);
        this.features.push({ feature: f, rule, main, light });
      }
    }
  }

  /** Fallen columns, lit braziers and dry springs, as the mask says. */
  private showFeatures(mask: number): void {
    this.shownFeatures = mask;
    for (const v of this.features) {
      const on = ((mask >>> v.feature.id) & 1) === 1;
      const rule = v.rule;
      if (rule.type === 'teetering' && on && v.main && v.shaft && !v.shaft.visible) {
        const r = this.resolver.resolve(rule.stump);
        v.main.setTexture(r.texture, r.frame).setOrigin(r.originX, r.originY).setScale(r.scale);
        v.main.setRotation(0);
        v.shaft.setVisible(true);
      } else if (rule.type === 'spring') {
        v.main?.setAlpha(on ? 0.35 : 1);
        if (v.light) v.light.on = !on;
      } else if (rule.type === 'brazier') {
        const r = this.resolver.resolve(on ? rule.lit.sprite : rule.visual.sprite);
        v.main?.setTexture(r.texture, r.frame).setOrigin(r.originX, r.originY).setScale(r.scale);
        if (v.light) v.light.on = on;
      }
    }
  }

  /** A crusher's slabs close in as its telegraph runs out, and stand apart again. */
  private moveSlabs(state: WorldFrame): void {
    for (const v of this.features) {
      if (!v.slabs) continue;
      const f = v.feature;
      let close = 0;
      for (const h of state.hazards) {
        if (h.shape !== 'line' || Math.abs((h.x + h.x2) / 2 - f.x) > 1) continue;
        if (Math.abs((h.y + h.y2) / 2 - f.y) > 1) continue;
        close = h.warn > 0 ? Math.max(0, 1 - h.timer / h.warn) ** 3 : 0;
      }
      const reach = this.crusherHalf * (1 - close * 0.85);
      const dx = Math.cos(f.angle) * reach;
      const dy = Math.sin(f.angle) * reach;
      v.slabs[0].setPosition(f.x - dx, f.y - dy).setDepth(f.y - dy);
      v.slabs[1].setPosition(f.x + dx, f.y + dy).setDepth(f.y + dy);
    }
  }

  /** A fallen god as a pale, floating spirit above the darkness, glowing brighter as it is revived. */
  private spirit(pl: FramePlayer, time: number, lights: LightMap): void {
    const p = this.pools;
    const r = this.resolver.resolve(pl.god.visual.sprite);
    const sprite = p.player.get(pl.id);
    applySprite(sprite, r, 1.15, pl.facingX < 0, 'idle', 0);
    const float = Math.sin(time / 420 + pl.id) * 4;
    sprite
      .setPosition(pl.x, pl.y - 14 + float)
      .setDepth(DEPTH.player)
      .setRotation(0)
      .setAlpha(0.38 + 0.3 * pl.revive + Math.sin(time / 300) * 0.06)
      .setTint(0x9fdcff)
      .setTintMode(Phaser.TintModes.MULTIPLY);
    p.ring
      .get(pl.id)
      .setPosition(pl.x, pl.y + 6)
      .setDepth(DEPTH.playerRing)
      .setScale(0.6, 0.36)
      .setTint(0x9fdcff)
      .setAlpha(0.45);
    lights.add(pl.x, pl.y, 150 + 120 * pl.revive, 0x9fdcff, 0.55 + 0.4 * pl.revive, 6);
  }

  /**
   * Draws `paint` (world coordinates inside the box) once into a canvas texture and places it as an image. A
   * Graphics is triangulated again every frame; static floors cost one sprite this way (spec: phone-play / phone
   * performance). Canvas textures survive a lost WebGL context. Keys start with `arena-ground-`, so the scene drops
   * them with the ground when the realm changes.
   */
  private bake(
    key: string,
    x: number,
    y: number,
    width: number,
    height: number,
    paint: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    const scene = this.scene;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const g = scene.make.graphics({}, false);
    g.translateCanvas(-x, -y);
    paint(g);
    g.generateTexture(key, Math.ceil(width), Math.ceil(height));
    g.destroy();
    scene.add
      .image(x, y, key)
      .setOrigin(0)
      .setDepth(DEPTH.ground + 1000);
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
    // Drawn once into textures: a Graphics is re-triangulated every frame, and these never change (performance).
    let piece = 0;
    for (const pz of arena.plazas) {
      const reach = pz.radius + 16;
      this.bake(
        `${groundKey}-floor-${piece++}`,
        pz.x - reach,
        pz.y - reach,
        reach * 2,
        reach * 2,
        (floors) => {
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
        },
      );
    }

    // Temples: a stylobate of three worn steps, a floor of slabs, cracks across it.
    for (const t of arena.temples) {
      // The steps reach 30 beyond the floor and the cracks wander up to 120 past it.
      const mx = t.width / 2 + 130;
      const my = t.depth / 2 + 130;
      this.bake(`${groundKey}-floor-${piece++}`, t.x - mx, t.y - my, mx * 2, my * 2, (floors) => {
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
      });
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
      const sway = kinds.get(d.kind)?.sway;
      if (sway) this.swaying.push({ sprite, amp: sway, seed: d.x * 0.013 + d.y * 0.007 });
    }
    const obstacleSprites: Phaser.GameObjects.Sprite[] = [];
    for (const o of arena.obstacles) {
      const kind = config.obstacles.find((k) => k.id === o.kind);
      const r = this.resolver.resolve(kind?.visual.sprite ?? o.kind);
      obstacleSprites[o.id] = scene.add
        .sprite(o.x, o.y, r.texture, r.frame)
        .setOrigin(r.originX, r.originY)
        .setScale(r.scale)
        .setDepth(o.y + o.radius * 0.4);
      if (kind?.sway)
        this.swaying.push({ sprite: obstacleSprites[o.id], amp: kind.sway, seed: o.id * 0.77 });
      if (kind?.light)
        this.staticLights.push({ x: o.x, y: o.y, light: kind.light, seed: o.id * 1.37 });
    }
    const propKinds = new Map((config.props?.kinds ?? []).map((k) => [k.id, k]));
    for (const p of arena.props) {
      const r = this.resolver.resolve(propKinds.get(p.kind)?.visual.sprite ?? p.kind);
      this.props.push(
        scene.add
          .sprite(p.x, p.y, r.texture, r.frame)
          .setOrigin(r.originX, r.originY)
          .setScale(r.scale)
          .setDepth(p.y + p.radius * 0.4),
      );
    }
    this.drawFeatures(arena, config, obstacleSprites);
    // The boss arena: a ritual circle of dried blood on the plaza.
    const ring = scene.add.graphics().setDepth(DEPTH.decoration + 1);
    ring.lineStyle(6, 0x5a1414, 0.55);
    ring.strokeCircle(arena.bossArena.x, arena.bossArena.y, arena.bossArena.radius - 24);
    ring.lineStyle(2, 0x5a1414, 0.45);
    ring.strokeCircle(arena.bossArena.x, arena.bossArena.y, arena.bossArena.radius - 46);
  }
}

export { ATMOSPHERE_DEPTH };
