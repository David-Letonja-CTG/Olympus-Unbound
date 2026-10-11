import Phaser from 'phaser';
import { Element } from '../data/types';
import { RunState } from '../sim/run-state';
import { SimEvent } from '../sim/types';
import { LightMap } from './atmosphere';
import { DEPTH } from './world-view';

const ELEMENT_COLOR: Record<Element, number> = {
  lightning: 0xfff27a,
  fire: 0xff8a3d,
  physical: 0xf2efe6,
  shadow: 0xc49bff,
};

interface Transient {
  kind: 'nova' | 'sweep' | 'chain' | 'strike' | 'impact' | 'burst';
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

/**
 * Everything that is feedback rather than state (D7, spec: hud / combat readability): attack visuals, telegraphs,
 * damage numbers, particles, health bars over elites and the boss, and the off-screen boss pointer.
 */
export class Effects {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly pointer: Phaser.GameObjects.Graphics;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly puffs: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly transients: Transient[] = [];
  private readonly numbers: FloatingNumber[] = [];
  private readonly freeNumbers: Phaser.GameObjects.Text[] = [];
  private seed = 1;
  damageNumbers = true;
  /** Multiplier for burst particle counts (graphics quality). */
  particleScale = 1;

  constructor(private readonly scene: Phaser.Scene) {
    this.ground = scene.add.graphics().setDepth(DEPTH.telegraph);
    this.fx = scene.add.graphics().setDepth(DEPTH.effects).setBlendMode(Phaser.BlendModes.ADD);
    this.bars = scene.add.graphics().setDepth(DEPTH.bars);
    this.pointer = scene.add.graphics().setDepth(DEPTH.pointer).setScrollFactor(0);
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
    state: RunState | undefined,
    dt: number,
    camera: Phaser.Cameras.Scene2D.Camera,
    lights: LightMap,
  ): void {
    this.drawTransients(dt, lights);
    if (state) {
      this.drawTelegraphs(state);
      this.drawBars(state);
      this.drawPointer(state, camera);
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
      .setText(String(Math.max(1, Math.round(amount))))
      .setPosition(x + ((this.seed++ % 7) - 3) * 3, y)
      .setVisible(true)
      .setAlpha(1)
      .setScale(crit ? 1.45 : 1)
      .setColor(
        crit
          ? '#ffe14d'
          : element === 'fire'
            ? '#ffc29a'
            : element === 'shadow'
              ? '#e2ccff'
              : '#ffffff',
      );
    this.numbers.push({ text, vy: crit ? -95 : -70, life: crit ? 0.8 : 0.6 });
  }

  private drawTelegraphs(state: RunState): void {
    const g = this.ground;
    g.clear();
    for (const h of state.hazards) {
      const progress = 1 - Math.max(0, h.timer) / h.warn;
      if (h.shape === 'circle') {
        g.fillStyle(0xff2a1a, 0.16);
        g.fillCircle(h.x, h.y, h.radius);
        g.fillStyle(0xff4a2a, 0.35);
        g.fillCircle(h.x, h.y, h.radius * progress);
        g.lineStyle(3, 0xff5a3a, 0.9);
        g.strokeCircle(h.x, h.y, h.radius);
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
        g.lineStyle(3, 0xff5a3a, 0.9);
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

  private drawBars(state: RunState): void {
    const g = this.bars;
    g.clear();
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

  private drawPointer(state: RunState, camera: Phaser.Cameras.Scene2D.Camera): void {
    const g = this.pointer;
    g.clear();
    const boss = state.boss;
    if (!boss || boss.dead) return;
    const view = camera.worldView;
    if (view.contains(boss.x, boss.y)) return;
    const cx = view.centerX;
    const cy = view.centerY;
    const angle = Math.atan2(boss.y - cy, boss.x - cx);
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
    g.fillStyle(0xff3a1a, 0.95);
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
