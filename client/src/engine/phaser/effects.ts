import Phaser from 'phaser';
import { Element } from '../data/types';
import { FrameSite, WorldFrame } from '../sim/world-frame';
import { SimEvent } from '../sim/types';
import { LightMap } from './atmosphere';
import { GATE_STAND_SECONDS } from '../sim/realms';
import { DEPTH } from './world-view';

const ELEMENT_COLOR: Record<Element, number> = {
  lightning: 0xfff27a,
  fire: 0xff8a3d,
  physical: 0xf2efe6,
  shadow: 0xc49bff,
};

interface Transient {
  kind: 'nova' | 'sweep' | 'chain' | 'strike' | 'impact' | 'burst' | 'streak';
  x: number;
  y: number;
  radius: number;
  angle: number;
  arc: number;
  color: number;
  points?: readonly number[];
  age: number;
  ttl: number;
  /** Fixed jitter for chain lightning, so a bolt does not flicker between frames. */
  seed: number;
}

interface FloatingNumber {
  text: Phaser.GameObjects.Text;
  vy: number;
  life: number;
}

const MAX_NUMBERS = 60;
/** The Director's colours (spec: director-of-chaos): violet for threats, pale gold for blessings. */
const OMEN = 0xb07cff;
const BLESSING = 0xfff0c0;
const SITE_COLOR: Record<FrameSite['kind'], number> = {
  rift: OMEN,
  arrival: 0xff6a8a,
  shrine: BLESSING,
  altar: 0xd9b8ff,
};
/** A warning flashes in its last quarter-second (spec: boss-encounter / the moment to dash). */
const FLASH_SECONDS = 0.25;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
/** Length of the dash streak: about a dash's reach. */
const DASH_STREAK = 150;

/**
 * Everything that is feedback rather than state (D7, spec: hud / combat readability): attack visuals, telegraphs,
 * damage numbers, particles, health bars over elites and the boss, and the off-screen boss pointer.
 */
export class Effects {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly pointer: Phaser.GameObjects.Graphics;
  /** The gate and fallen allies' revival rings, above the darkness (spec: endless-run, co-op). */
  private readonly marks: Phaser.GameObjects.Graphics;
  private clock = 0;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly puffs: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly transients: Transient[] = [];
  private readonly numbers: FloatingNumber[] = [];
  private readonly freeNumbers: Phaser.GameObjects.Text[] = [];
  private seed = 1;
  /** The number over the next part to cut. */
  private readonly markLabel: Phaser.GameObjects.Text;
  damageNumbers = true;
  enemyHealthBars = true;
  /** Multiplier for burst particle counts (graphics quality). */
  particleScale = 1;

  constructor(private readonly scene: Phaser.Scene) {
    this.ground = scene.add.graphics().setDepth(DEPTH.telegraph);
    this.fx = scene.add.graphics().setDepth(DEPTH.effects).setBlendMode(Phaser.BlendModes.ADD);
    this.bars = scene.add.graphics().setDepth(DEPTH.bars);
    this.pointer = scene.add.graphics().setDepth(DEPTH.pointer).setScrollFactor(0);
    this.marks = scene.add.graphics().setDepth(DEPTH.telegraph + 1);
    this.markLabel = scene.add
      .text(0, 0, '', {
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
        fontSize: '22px',
        color: '#ffd34d',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.numbers)
      .setVisible(false);
    this.sparks = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 320,
        speed: { min: 70, max: 230 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(DEPTH.effects);
    this.puffs = scene.add
      .particles(0, 0, 'soft', {
        lifespan: 480,
        speed: { min: 20, max: 110 },
        scale: { start: 0.45, end: 0.05 },
        alpha: { start: 0.75, end: 0 },
        emitting: false,
      })
      .setDepth(DEPTH.effects - 1);
  }

  /** Turns simulation events into visuals. */
  handle(event: SimEvent): void {
    switch (event.type) {
      case 'hit':
        if (this.damageNumbers)
          this.number(event.x, event.y, event.amount, event.crit, event.element);
        if (event.crit) this.burst(this.sparks, event.x, event.y, 4, ELEMENT_COLOR[event.element]);
        return;
      case 'propBroken':
        // Shards and dust in the prop's colour (spec: arena-generation / breakable props).
        this.burst(this.puffs, event.x, event.y, 8, event.color);
        this.burst(this.sparks, event.x, event.y, 6, event.color);
        return;
      case 'kill':
        this.burst(
          this.puffs,
          event.x,
          event.y,
          event.boss ? 40 : event.elite ? 18 : 6,
          event.color,
        );
        if (event.elite || event.boss) this.burst(this.sparks, event.x, event.y, 30, 0xffd34d);
        return;
      case 'attack':
        this.attack(event);
        return;
      case 'levelUp':
        return;
      case 'gateOpened':
        this.add({
          kind: 'burst',
          x: event.x,
          y: event.y,
          radius: 220,
          angle: 0,
          arc: 0,
          color: 0xffd27a,
          ttl: 0.8,
        });
        this.burst(this.sparks, event.x, event.y, 50, 0xffd27a);
        return;
      case 'splash':
        // An evolved weapon's burst round its target (spec: combat / splash on hit). Bursts come with nearly every
        // hit, so they never crowd out the other effects.
        if (this.transients.length >= 90) return;
        this.add({
          kind: 'burst',
          x: event.x,
          y: event.y,
          radius: event.radius,
          angle: 0,
          arc: 0,
          color: event.color,
          ttl: 0.3,
        });
        return;
      case 'fusionTaken':
        // A burst that grows with the fusion's tier (spec: run-progression / fusion crests and fanfare).
        this.add({
          kind: 'burst',
          x: event.x,
          y: event.y,
          radius: 140 * event.tier,
          angle: 0,
          arc: 0,
          color: 0xffd98a,
          ttl: 0.6 + 0.25 * event.tier,
        });
        this.burst(this.sparks, event.x, event.y, 30 * event.tier, 0xffe9a0);
        return;
      case 'gathered':
        // Call of Hermes: a ring of wind round the god as the gems are called in (spec: instant blessings).
        this.add({
          kind: 'burst',
          x: event.x,
          y: event.y,
          radius: 320,
          angle: 0,
          arc: 0,
          color: 0x7fe8d0,
          ttl: 0.9,
        });
        this.burst(this.sparks, event.x, event.y, 36, 0x7fe8d0);
        return;
      case 'playerRevived':
        this.add({
          kind: 'burst',
          x: event.x,
          y: event.y,
          radius: 260,
          angle: 0,
          arc: 0,
          color: 0xff8a3d,
          ttl: 0.6,
        });
        this.burst(this.sparks, event.x, event.y, 40, 0xff8a3d);
        return;
      case 'merchantArrived':
        this.add({
          kind: 'burst',
          x: event.x,
          y: event.y,
          radius: 120,
          angle: 0,
          arc: 0,
          color: 0xffc870,
          ttl: 0.7,
        });
        this.burst(this.sparks, event.x, event.y, 30, 0xffc870);
        return;
      case 'dash':
        // A pale streak along the dash and dust where it began (spec: player-control / stamina, sprint and dash).
        this.add({
          kind: 'streak',
          x: event.x,
          y: event.y,
          radius: DASH_STREAK,
          angle: Math.atan2(event.dy, event.dx),
          arc: 0,
          color: 0xe8dcb4,
          ttl: 0.32,
        });
        this.burst(this.puffs, event.x, event.y, 8, 0xb9ab92);
        return;
      case 'perfectDodge':
        // The reward for dashing through a boss attack as it lands (spec: boss-encounter / perfect dodge).
        this.label(event.x, event.y - 46, 'Perfect dodge!', '#ffe680', 1.5, 1.2, -45);
        this.add({
          kind: 'burst',
          x: event.x,
          y: event.y,
          radius: 150,
          angle: 0,
          arc: 0,
          color: 0xfff0a0,
          ttl: 0.5,
        });
        this.burst(this.sparks, event.x, event.y, 26, 0xffe680);
        return;
      case 'partFell':
        this.add({
          kind: 'impact',
          x: event.x,
          y: event.y,
          radius: 60,
          angle: 0,
          arc: 0,
          color: 0xffd27a,
          ttl: 0.4,
        });
        this.burst(this.puffs, event.x, event.y, 20, 0x5a7a4a);
        return;
      case 'partGrew':
        this.burst(this.puffs, event.x, event.y, 14, 0x3a5a3a);
        return;
      case 'wallsRose':
        this.burst(this.puffs, event.x, event.y, 30, 0x9a8a6a);
        return;
      case 'hazardResolved':
        if (event.shape === 'circle') {
          this.add({
            kind: 'impact',
            x: event.x,
            y: event.y,
            radius: event.radius,
            angle: 0,
            arc: 0,
            color: 0xffb070,
            ttl: 0.35,
          });
          this.burst(this.puffs, event.x, event.y, 14, 0x9e8f7e);
        }
        return;
      case 'pickup':
        if (event.kind === 'chest') this.burst(this.sparks, event.x, event.y, 24, 0xffd34d);
        return;
      case 'encounter':
        // A warning flares where it will happen (spec: director-of-chaos / fairness).
        if (event.phase === 'telegraph' && (event.x || event.y)) {
          this.add({
            kind: 'burst',
            x: event.x,
            y: event.y,
            radius: 160,
            angle: 0,
            arc: 0,
            color: OMEN,
            ttl: 0.7,
          });
          this.burst(this.sparks, event.x, event.y, 24, OMEN);
        }
        return;
      case 'escaped':
        this.label(event.x, event.y - 40, 'Escaped', '#d9b8ff', 1.3, 1.2, -40);
        this.burst(this.puffs, event.x, event.y, 30, OMEN);
        return;
      case 'blessed':
        this.add({
          kind: 'burst',
          x: event.x,
          y: event.y,
          radius: 130,
          angle: 0,
          arc: 0,
          color: BLESSING,
          ttl: 0.6,
        });
        this.burst(this.sparks, event.x, event.y, 26, BLESSING);
        return;
      default:
        return;
    }
  }

  levelUpBurst(x: number, y: number): void {
    this.add({ kind: 'burst', x, y, radius: 140, angle: 0, arc: 0, color: 0x8fe8ff, ttl: 0.5 });
    this.burst(this.sparks, x, y, 20, 0x8fe8ff);
  }

  /** Redraws telegraphs, transient effects, bars, numbers and the boss pointer. `dt` in seconds (real time). */
  /** `state` is absent in cutscenes: only transient effects, particles and numbers are drawn then. */
  update(
    state: WorldFrame | undefined,
    dt: number,
    camera: Phaser.Cameras.Scene2D.Camera,
    lights: LightMap,
  ): void {
    this.clock += dt;
    this.drawTransients(dt, lights);
    if (state) {
      this.drawTelegraphs(state);
      this.drawBars(state);
      this.drawMarks(state, lights);
      this.pointer.clear();
      const boss = state.boss;
      if (boss && !boss.dead) this.drawPointer(boss, 0xff3a1a, camera);
      if (state.gate) this.drawPointer(state.gate, 0xffd27a, camera);
      if (state.merchant) this.drawPointer(state.merchant, 0xffb347, camera);
      for (const site of state.sites) this.drawPointer(site, SITE_COLOR[site.kind], camera);
      for (const e of state.enemies) if (e.champion && !e.dead) this.drawPointer(e, OMEN, camera);
    }
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.life -= dt;
      n.text.y += n.vy * dt;
      n.vy *= 0.92;
      n.text.setAlpha(Math.min(1, n.life / 0.25));
      if (n.life <= 0) {
        n.text.setVisible(false);
        this.freeNumbers.push(n.text);
        this.numbers.splice(i, 1);
      }
    }
  }

  private attack(e: Extract<SimEvent, { type: 'attack' }>): void {
    const base = { x: e.x, y: e.y, radius: e.radius, angle: e.angle, arc: e.arc, color: e.color };
    switch (e.behavior) {
      case 'nova':
        this.add({ ...base, kind: 'nova', ttl: 0.35 });
        this.burst(this.puffs, e.x, e.y, 10, 0xc9b28a);
        return;
      case 'sweep':
        this.add({ ...base, kind: 'sweep', ttl: 0.22 });
        return;
      case 'chain':
        this.add({ ...base, kind: 'chain', points: e.points, ttl: 0.18 });
        if (e.points)
          for (let i = 2; i < e.points.length; i += 2)
            this.burst(this.sparks, e.points[i], e.points[i + 1], 5, e.color);
        return;
      case 'strike':
        this.add({ ...base, kind: 'strike', ttl: 0.3 });
        this.burst(this.sparks, e.x, e.y, 10, e.color);
        return;
      default:
        return;
    }
  }

  private add(t: Omit<Transient, 'age' | 'seed'>): void {
    if (this.transients.length > 120) this.transients.shift();
    this.transients.push({ ...t, age: 0, seed: this.seed++ });
  }

  /** Sparks (`glow`) or smoke-like puffs at a point, e.g. a fallen god in the intro. */
  burstAt(x: number, y: number, color: number, count: number, glow = false): void {
    this.burst(glow ? this.sparks : this.puffs, x, y, count, color);
  }

  private burst(
    emitter: Phaser.GameObjects.Particles.ParticleEmitter,
    x: number,
    y: number,
    count: number,
    color: number,
  ): void {
    emitter.setParticleTint(color);
    emitter.explode(Math.max(1, Math.round(count * this.particleScale)), x, y);
  }

  private number(x: number, y: number, amount: number, crit: boolean, element: Element): void {
    // A shielded part takes no damage: it says so (spec: boss-encounter / the hydra's heads in order).
    if (amount <= 0) {
      this.label(x, y, 'shielded', '#b8b8b8', 0.8, 0.5);
      return;
    }
    const color = crit
      ? '#ffe14d'
      : element === 'fire'
        ? '#ffc29a'
        : element === 'shadow'
          ? '#e2ccff'
          : '#ffffff';
    this.label(
      x,
      y,
      String(Math.max(1, Math.round(amount))),
      color,
      crit ? 1.45 : 1,
      crit ? 0.8 : 0.6,
      crit ? -95 : -70,
    );
  }

  /** A floating word or number from the shared pool. */
  private label(
    x: number,
    y: number,
    words: string,
    color: string,
    scale: number,
    life: number,
    vy = -70,
  ): void {
    let text = this.freeNumbers.pop();
    if (!text) {
      if (this.numbers.length >= MAX_NUMBERS) {
        const oldest = this.numbers.shift() as FloatingNumber;
        text = oldest.text;
      } else {
        text = this.scene.add
          .text(0, 0, '', {
            fontFamily: 'Georgia, serif',
            fontStyle: 'bold',
            fontSize: '15px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.numbers);
      }
    }
    text
      .setText(words)
      .setPosition(x + ((this.seed++ % 7) - 3) * 3, y)
      .setVisible(true)
      .setAlpha(1)
      .setScale(scale)
      .setColor(color);
    this.numbers.push({ text, vy, life });
  }

  private drawTelegraphs(state: WorldFrame): void {
    const g = this.ground;
    g.clear();
    for (const h of state.hazards) {
      const progress = 1 - Math.max(0, h.timer) / h.warn;
      // Its last quarter-second flashes: the moment to dash (spec: boss-encounter / attack warnings).
      const flash = h.timer <= FLASH_SECONDS && Math.floor(this.clock * 20) % 2 === 0;
      const edge = flash ? 0xffffff : 0xff5a3a;
      const edgeWidth = flash ? 5 : 3;
      if (h.wall !== undefined) {
        // Where a wall will rise: a stone outline filling up.
        g.fillStyle(0x8a7e6a, 0.18 + 0.4 * progress);
        g.fillCircle(h.x, h.y, h.radius * (0.4 + 0.6 * progress));
        g.lineStyle(flash ? 4 : 2, flash ? 0xffffff : 0xd8ccb0, 0.9);
        g.strokeCircle(h.x, h.y, h.radius);
      } else if (h.shape === 'circle') {
        g.fillStyle(0xff2a1a, 0.16);
        g.fillCircle(h.x, h.y, h.radius);
        g.fillStyle(0xff4a2a, 0.35);
        g.fillCircle(h.x, h.y, h.radius * progress);
        g.lineStyle(edgeWidth, edge, 0.9);
        g.strokeCircle(h.x, h.y, h.radius);
      } else if (h.shape === 'cone') {
        const wedge = (r: number) => {
          const a = h.angle ?? 0;
          const half = (h.arc ?? 0) / 2;
          const pts = [new Phaser.Math.Vector2(h.x, h.y)];
          for (let i = 0; i <= 12; i++) {
            const t = a - half + ((2 * half) / 12) * i;
            pts.push(new Phaser.Math.Vector2(h.x + Math.cos(t) * r, h.y + Math.sin(t) * r));
          }
          return pts;
        };
        g.fillStyle(0xff2a1a, 0.16);
        g.fillPoints(wedge(h.radius), true);
        g.fillStyle(0xff4a2a, 0.35);
        g.fillPoints(wedge(h.radius * progress), true);
        g.lineStyle(edgeWidth, edge, 0.9);
        g.strokePoints(wedge(h.radius), true);
      } else {
        const angle = Math.atan2(h.y2 - h.y, h.x2 - h.x);
        const length = Math.hypot(h.x2 - h.x, h.y2 - h.y);
        const nx = Math.cos(angle + Math.PI / 2) * (h.width / 2);
        const ny = Math.sin(angle + Math.PI / 2) * (h.width / 2);
        const pts = (l: number) => [
          new Phaser.Math.Vector2(h.x + nx, h.y + ny),
          new Phaser.Math.Vector2(h.x + Math.cos(angle) * l + nx, h.y + Math.sin(angle) * l + ny),
          new Phaser.Math.Vector2(h.x + Math.cos(angle) * l - nx, h.y + Math.sin(angle) * l - ny),
          new Phaser.Math.Vector2(h.x - nx, h.y - ny),
        ];
        g.fillStyle(0xff2a1a, 0.16);
        g.fillPoints(pts(length), true);
        g.fillStyle(0xff4a2a, 0.35);
        g.fillPoints(pts(length * progress), true);
        g.lineStyle(edgeWidth, edge, 0.9);
        g.strokePoints(pts(length), true);
      }
    }
    // Chargers show where they will dash while they wind up.
    for (const e of state.enemies) {
      if (e.mode !== 'windup' || e.def.behavior.type !== 'charger') continue;
      const reach = e.def.behavior.dashSpeed * e.def.behavior.dashDuration;
      g.lineStyle(e.radius * 1.6, 0xff3a1a, 0.22);
      g.lineBetween(e.x, e.y, e.x + e.dirX * reach, e.y + e.dirY * reach);
    }
  }

  /** Attacks light the night as they happen (spec: visual-atmosphere / dynamic lighting). */
  private light(t: Transient, fade: number, lights: LightMap): void {
    switch (t.kind) {
      case 'strike':
        lights.add(t.x, t.y, Math.max(260, t.radius * 3.5), 0xdcefff, fade * 1.2, 6);
        return;
      case 'chain':
        if (t.points)
          for (let i = 2; i < t.points.length; i += 2)
            lights.add(t.points[i], t.points[i + 1], 150, t.color, fade, 4);
        return;
      case 'nova':
      case 'burst':
        lights.add(t.x, t.y, t.radius * 1.5, t.color, fade * 0.8, 4);
        return;
      case 'sweep':
        lights.add(
          t.x + Math.cos(t.angle) * t.radius * 0.6,
          t.y + Math.sin(t.angle) * t.radius * 0.6,
          t.radius * 1.3,
          t.color,
          fade * 0.7,
          3,
        );
        return;
      case 'impact':
        lights.add(t.x, t.y, t.radius * 1.6, 0xff9a4a, fade, 4);
        return;
    }
  }

  private drawTransients(dt: number, lights: LightMap): void {
    const g = this.fx;
    g.clear();
    for (let i = this.transients.length - 1; i >= 0; i--) {
      const t = this.transients[i];
      t.age += dt;
      if (t.age >= t.ttl) {
        this.transients.splice(i, 1);
        continue;
      }
      const k = t.age / t.ttl;
      const fade = 1 - k;
      this.light(t, fade, lights);
      switch (t.kind) {
        case 'nova':
        case 'burst':
          g.lineStyle(10 * fade + 2, t.color, 0.8 * fade);
          g.strokeCircle(t.x, t.y, t.radius * (0.3 + 0.7 * Math.sqrt(k)));
          break;
        case 'impact':
          g.fillStyle(t.color, 0.35 * fade);
          g.fillCircle(t.x, t.y, t.radius);
          g.lineStyle(6 * fade + 1, 0xffffff, 0.6 * fade);
          g.strokeCircle(t.x, t.y, t.radius * (0.8 + 0.3 * k));
          break;
        case 'sweep': {
          const sweepK = Math.min(1, k * 2.2);
          const start = t.angle - t.arc / 2;
          const end = start + t.arc * sweepK;
          g.lineStyle(14 * fade + 2, t.color, 0.75 * fade);
          g.beginPath();
          g.arc(t.x, t.y, t.radius * 0.85, start, end, false);
          g.strokePath();
          g.lineStyle(4, 0xffffff, 0.6 * fade);
          g.beginPath();
          g.arc(t.x, t.y, t.radius * 0.95, start, end, false);
          g.strokePath();
          break;
        }
        case 'streak': {
          // Tapered: wide and bright at the god's end, fading toward where the dash began.
          const dx = Math.cos(t.angle);
          const dy = Math.sin(t.angle);
          const reach = t.radius * Math.min(1, k * 4);
          for (let s = 0; s < 4; s++) {
            const a = s / 4;
            const b = (s + 1) / 4;
            g.lineStyle(4 + 14 * b * fade, t.color, 0.12 + 0.4 * b * fade);
            g.lineBetween(
              t.x + dx * reach * a,
              t.y + dy * reach * a,
              t.x + dx * reach * b,
              t.y + dy * reach * b,
            );
          }
          break;
        }
        case 'chain':
          if (t.points) this.lightning(g, t.points, t.color, fade, t.seed);
          break;
        case 'strike': {
          g.lineStyle(6 * fade + 2, t.color, fade);
          this.lightning(g, [t.x + 20, t.y - 420, t.x, t.y], t.color, fade, t.seed);
          g.fillStyle(t.color, 0.35 * fade);
          g.fillCircle(t.x, t.y, t.radius * (0.6 + 0.4 * k));
          break;
        }
      }
    }
  }

  private lightning(
    g: Phaser.GameObjects.Graphics,
    points: readonly number[],
    color: number,
    alpha: number,
    seed: number,
  ): void {
    for (const [width, c, a] of [
      [7, color, 0.45 * alpha],
      [2.5, 0xffffff, alpha],
    ] as const) {
      g.lineStyle(width, c, a);
      g.beginPath();
      g.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) {
        const x0 = points[i - 2];
        const y0 = points[i - 1];
        const x1 = points[i];
        const y1 = points[i + 1];
        const segments = 5;
        for (let s = 1; s <= segments; s++) {
          const f = s / segments;
          const j =
            s === segments
              ? 0
              : (((seed * 9301 + i * 49297 + s * 233) % 233280) / 233280 - 0.5) * 26;
          g.lineTo(x0 + (x1 - x0) * f + j, y0 + (y1 - y0) * f - j * 0.6);
        }
      }
      g.strokePath();
    }
  }

  private drawBars(state: WorldFrame): void {
    const g = this.bars;
    g.clear();
    // Common monsters, once hurt: a thin red bar (spec: hud / enemy health bars; hidden in Settings).
    if (this.enemyHealthBars)
      for (const e of state.enemies) {
        if (e.elite || e.boss || e.dead || e.health >= e.maxHealth) continue;
        const w = Math.max(18, e.radius * 1.8);
        const x = e.x - w / 2;
        const y = e.y - e.radius - 12;
        g.fillStyle(0x000000, 0.65);
        g.fillRect(x - 1, y - 1, w + 2, 5);
        g.fillStyle(0xe0453a, 1);
        g.fillRect(x, y, w * Math.max(0, e.health / e.maxHealth), 3);
      }
    for (const e of state.enemies) {
      if (!e.elite || e.dead) continue;
      const w = e.radius * 2.2;
      const x = e.x - w / 2;
      const y = e.y - e.radius - 16;
      g.fillStyle(0x000000, 0.7);
      g.fillRect(x - 1, y - 1, w + 2, 7);
      g.fillStyle(0xffcc33, 1);
      g.fillRect(x, y, w * Math.max(0, e.health / e.maxHealth), 5);
    }
  }

  /**
   * The open gate (a turning ring of light that fills as a god stands in it) and the ring around every fallen
   * ally's spirit that fills as they are revived.
   */
  private drawMarks(state: WorldFrame, lights: LightMap): void {
    const g = this.marks;
    g.clear();
    const gate = state.gate;
    if (gate) {
      const t = this.clock;
      const r = gate.radius;
      g.fillStyle(0xffe6a8, 0.12);
      g.fillCircle(gate.x, gate.y, r);
      g.lineStyle(4, 0xffd27a, 0.9);
      g.strokeCircle(gate.x, gate.y, r);
      for (let i = 0; i < 3; i++) {
        const a = t * (1.6 + i * 0.5) + (i * Math.PI * 2) / 3;
        const ring = r * (0.45 + i * 0.17);
        g.lineStyle(3, i === 1 ? 0xfff4d6 : 0xffc85a, 0.75);
        g.beginPath();
        g.arc(gate.x, gate.y, ring, a, a + Math.PI * 1.1);
        g.strokePath();
      }
      const progress = Math.min(1, gate.standing / GATE_STAND_SECONDS);
      if (progress > 0) {
        g.lineStyle(7, 0xffffff, 0.95);
        g.beginPath();
        g.arc(gate.x, gate.y, r + 9, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        g.strokePath();
      }
      lights.add(gate.x, gate.y, 320 + Math.sin(t * 3) * 20, 0xffe0a0, 1, 9);
    }
    // The merchant's ring, above the darkness (spec: merchant / the shop, D13): a slow golden pulse.
    const m = state.merchant;
    if (m) {
      const pulse = 0.55 + Math.sin(this.clock * 2.4) * 0.2;
      g.fillStyle(0xffc870, 0.08);
      g.fillCircle(m.x, m.y, m.radius);
      g.lineStyle(3, 0xffc870, pulse + 0.2);
      g.strokeCircle(m.x, m.y, m.radius);
      g.lineStyle(1.5, 0xfff0c8, pulse);
      g.strokeCircle(m.x, m.y, m.radius - 7);
    }
    this.drawBossMarks(state, lights);
    this.drawSites(state, lights);
    if (state.players.length < 2) return;
    for (const p of state.players) {
      if (p.alive || p.left) continue;
      g.lineStyle(3, 0x9fdcff, 0.35);
      g.strokeCircle(p.x, p.y, 34);
      if (p.revive > 0) {
        g.lineStyle(5, 0xd8f2ff, 0.95);
        g.beginPath();
        g.arc(p.x, p.y, 34, -Math.PI / 2, -Math.PI / 2 + p.revive * Math.PI * 2);
        g.strokePath();
      }
    }
  }

  /**
   * Boss mechanics, above the darkness (spec: boss-encounter / attack warnings): zones parts hold, shielded parts in
   * grey, the next part to cut in gold with its number, an exposed boss pulsing white, a dazed one with circling stars.
   */
  private drawBossMarks(state: WorldFrame, lights: LightMap): void {
    const g = this.marks;
    const t = this.clock;
    for (const z of state.zones) {
      g.fillStyle(0x1e6a6c, 0.16);
      g.fillCircle(z.x, z.y, z.radius);
      g.lineStyle(3, 0x4ad0c8, 0.55 + Math.sin(t * 3) * 0.15);
      g.strokeCircle(z.x, z.y, z.radius);
      lights.add(z.x, z.y, z.radius * 1.2, 0x4ad0c8, 0.35, 2);
    }
    let marked = false;
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (e.guarded) {
        g.lineStyle(3, 0xb8b8b8, 0.8);
        g.strokeCircle(e.x, e.y, e.radius + 8);
      }
      if (e.marked !== undefined) {
        marked = true;
        const pulse = 1 + Math.sin(t * 6) * 0.08;
        g.lineStyle(4, 0xffd34d, 0.95);
        g.strokeCircle(e.x, e.y, (e.radius + 10) * pulse);
        lights.add(e.x, e.y, 120, 0xffd34d, 0.7, 3);
        this.markLabel
          .setText(ROMAN[e.marked - 1] ?? String(e.marked))
          .setPosition(e.x, e.y - e.radius - 26)
          .setVisible(true);
      }
      if (e.boss && (e.boss.exposed ?? 0) > 0) {
        g.lineStyle(6, 0xffffff, 0.5 + Math.sin(t * 8) * 0.3);
        g.strokeCircle(e.x, e.y, e.radius + 16 + Math.sin(t * 8) * 4);
        lights.add(e.x, e.y, 220, 0xffffff, 0.8, 4);
      }
      if ((e.dazed ?? 0) > 0) {
        for (let i = 0; i < 3; i++) {
          const a = t * 4 + (i * Math.PI * 2) / 3;
          g.fillStyle(0xfff27a, 0.95);
          g.fillCircle(e.x + Math.cos(a) * 30, e.y - e.radius - 14 + Math.sin(a) * 8, 5);
        }
      }
    }
    if (!marked) this.markLabel.setVisible(false);
  }

  /**
   * The Director's markers and champions, above the darkness (spec: director-of-chaos, D13): a turning violet rift, a
   * pulsing arrival mark that fills as the arrival nears, a shrine's pillar of pale gold, an altar's turning ring. Each
   * shows the time it has left as an arc.
   */
  private drawSites(state: WorldFrame, lights: LightMap): void {
    const g = this.marks;
    const t = this.clock;
    for (const s of state.sites) {
      const color = SITE_COLOR[s.kind];
      const r = s.radius;
      const pulse = 0.5 + Math.sin(t * 5) * 0.5;
      switch (s.kind) {
        case 'rift':
          g.fillStyle(0x2a0f4a, 0.45);
          g.fillCircle(s.x, s.y, r);
          for (let i = 0; i < 3; i++) {
            const a = -t * (2.2 + i * 0.6) + (i * Math.PI * 2) / 3;
            g.lineStyle(4 - i, i === 0 ? 0xe8d4ff : color, 0.85);
            g.beginPath();
            g.arc(s.x, s.y, r * (0.35 + i * 0.22), a, a + Math.PI * 1.2);
            g.strokePath();
          }
          lights.add(s.x, s.y, r * 2.6, color, 0.7, 6);
          break;
        case 'arrival': {
          const fill = s.total > 0 ? Math.min(1, Math.max(0, 1 - s.left / s.total)) : 1;
          g.fillStyle(color, 0.12 + 0.25 * fill);
          g.fillCircle(s.x, s.y, r * fill);
          g.lineStyle(3, color, 0.6 + 0.35 * pulse);
          g.strokeCircle(s.x, s.y, r);
          // An exclamation mark: a bar and a dot.
          g.fillStyle(0xffffff, 0.9);
          g.fillRect(s.x - 3, s.y - 20, 6, 22);
          g.fillCircle(s.x, s.y + 10, 3.5);
          lights.add(s.x, s.y, r * 2.2, color, 0.6, 6);
          break;
        }
        case 'shrine':
          g.fillStyle(color, 0.1 + 0.08 * pulse);
          g.fillCircle(s.x, s.y, r);
          g.lineStyle(3, color, 0.9);
          g.strokeCircle(s.x, s.y, r);
          g.lineStyle(2, 0xffffff, 0.35 + 0.4 * pulse);
          g.strokeCircle(s.x, s.y, r * (0.4 + 0.25 * pulse));
          g.fillStyle(0xffffff, 0.22);
          g.fillRect(s.x - 7, s.y - 90, 14, 90);
          lights.add(s.x, s.y, 260, color, 0.95, 8);
          break;
        case 'altar':
          g.fillStyle(0x3a1f5a, 0.25);
          g.fillCircle(s.x, s.y, r);
          g.lineStyle(3, color, 0.9);
          g.strokeCircle(s.x, s.y, r);
          for (let i = 0; i < 4; i++) {
            const a = t * 1.4 + (i * Math.PI) / 2;
            g.fillStyle(0xffd27a, 0.9);
            g.fillCircle(s.x + Math.cos(a) * r * 0.6, s.y + Math.sin(a) * r * 0.6, 4);
          }
          lights.add(s.x, s.y, 220, color, 0.85, 8);
          break;
      }
      // The time it has left.
      if (s.total > 0 && s.kind !== 'arrival') {
        g.lineStyle(4, 0xffffff, 0.75);
        g.beginPath();
        g.arc(
          s.x,
          s.y,
          r + 9,
          -Math.PI / 2,
          -Math.PI / 2 + Math.min(1, s.left / s.total) * Math.PI * 2,
        );
        g.strokePath();
      }
    }
    for (const e of state.enemies) {
      if (!e.champion || e.dead) continue;
      g.lineStyle(4, OMEN, 0.55 + Math.sin(t * 4) * 0.25);
      g.strokeCircle(e.x, e.y, e.radius + 14);
      lights.add(e.x, e.y, 200, OMEN, 0.7, 5);
    }
  }

  /** An arrow on the screen's edge toward something off-screen: the boss, or the open gate. */
  private drawPointer(
    target: { readonly x: number; readonly y: number },
    color: number,
    camera: Phaser.Cameras.Scene2D.Camera,
  ): void {
    const g = this.pointer;
    const view = camera.worldView;
    if (view.contains(target.x, target.y)) return;
    const cx = view.centerX;
    const cy = view.centerY;
    const angle = Math.atan2(target.y - cy, target.x - cx);
    // Position on the screen edge (screen coordinates, the pointer ignores scrolling).
    const w = camera.width;
    const h = camera.height;
    const margin = 36;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const scale = Math.min(
      (w / 2 - margin) / Math.abs(dx || 1e-6),
      (h / 2 - margin) / Math.abs(dy || 1e-6),
    );
    // Zoom also scales objects that ignore scrolling (around the screen centre), so undo it.
    const z = camera.zoom;
    const px = w / 2 + (dx * scale) / z;
    const py = h / 2 + (dy * scale) / z;
    const size = 18 / z;
    g.fillStyle(color, 0.95);
    g.lineStyle(2, 0xffffff, 0.9);
    const tri = [
      new Phaser.Math.Vector2(px + dx * size, py + dy * size),
      new Phaser.Math.Vector2(
        px - dy * size * 0.6 - dx * size * 0.4,
        py + dx * size * 0.6 - dy * size * 0.4,
      ),
      new Phaser.Math.Vector2(
        px + dy * size * 0.6 - dx * size * 0.4,
        py - dx * size * 0.6 - dy * size * 0.4,
      ),
    ];
    g.fillPoints(tri, true);
    g.strokePoints(tri, true);
  }
}
