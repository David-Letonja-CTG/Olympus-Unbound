import { EnemyDefinition, SpawnEvent, SpawnPhase } from '../data/types';
import { spawnBoss } from '../bosses/boss';
import { RunState } from '../sim/run-state';

/** Distance beyond the visible edge at which enemies appear. */
const SPAWN_MARGIN = 70;
/** Regular enemies farther than this from every player are moved back near the action. */
const LEASH = 1700;

/**
 * Runs the current realm's spawn timeline, by time in that realm (spec: enemy-spawning, endless-run): continuous
 * spawning by phase, packs, timed hordes and elites, and the boss. All balance numbers come from the realm definition;
 * every realm cleared adds spawn rate and room for more enemies.
 */
export class SpawnDirector {
  private accumulator = 0;
  private readonly groupTimers = new Map<string, number>();
  private readonly events: readonly SpawnEvent[];
  private eventIndex = 0;
  private leashTimer = 0;

  constructor(private readonly state: RunState) {
    this.events = [...state.realm.events].sort((a, b) => a.at - b.at);
  }

  currentPhase(): SpawnPhase {
    const timeline = this.state.realm.timeline;
    let phase = timeline[0];
    for (const p of timeline) if (p.from <= this.state.realmTime) phase = p;
    return phase;
  }

  update(dt: number): void {
    const state = this.state;
    const phase = this.currentPhase();
    const bossActive = !!state.boss && !state.boss.dead;
    const depth = state.depthScale();
    const rate =
      phase.rate *
      (bossActive ? state.realm.boss.spawnRateMultiplier : 1) *
      state.partyScale.spawnRate *
      depth.spawnRate;
    const maxAlive = Math.round(phase.maxAlive * state.partyScale.maxAlive * depth.maxAlive);

    this.accumulator += rate * dt;
    while (this.accumulator >= 1) {
      this.accumulator -= 1;
      if (this.regularCount() >= maxAlive) continue;
      const pick = state.spawnRng.weighted(phase.enemies, (e) => e.weight);
      if (pick) this.spawnAtEdge(state.index.enemy(pick.id));
    }

    for (const group of phase.groups ?? []) {
      const key = `${phase.from}:${group.id}`;
      const t =
        (this.groupTimers.get(key) ?? 0) +
        dt * (bossActive ? state.realm.boss.spawnRateMultiplier : 1);
      if (t >= group.every) {
        this.groupTimers.set(key, t - group.every);
        if (this.regularCount() < maxAlive)
          this.spawnPack(
            state.index.enemy(group.id),
            state.spawnRng.int(group.size[0], group.size[1]),
          );
      } else {
        this.groupTimers.set(key, t);
      }
    }

    while (
      this.eventIndex < this.events.length &&
      this.events[this.eventIndex].at <= state.realmTime
    ) {
      this.fire(this.events[this.eventIndex++]);
    }

    if (!state.boss && state.realmTime >= state.realm.boss.at) spawnBoss(state);

    this.leashTimer += dt;
    if (this.leashTimer >= 1) {
      this.leashTimer = 0;
      this.leash();
    }
  }

  /** Debug: jump the timeline without firing the events that were skipped. */
  skipTo(time: number): void {
    while (this.eventIndex < this.events.length && this.events[this.eventIndex].at < time)
      this.eventIndex++;
  }

  /** A valid position just outside the visible area, inside the map and not in an obstacle (or none). */
  spawnPosition(radius: number): { x: number; y: number } | undefined {
    const state = this.state;
    const rng = state.spawnRng;
    // Around one living player's view — a random one in co-op, so pressure follows everyone — and never
    // inside any player's view (spec: enemy-spawning / fair spawn positions).
    const living = state.players.filter((p) => p.alive);
    const focus =
      living.length > 1 ? living[Math.floor(rng.next() * living.length)] : state.focus();
    const hw = state.view.halfWidth + SPAWN_MARGIN + radius;
    const hh = state.view.halfHeight + SPAWN_MARGIN + radius;
    const b = state.arena.bounds;
    const seen = (x: number, y: number) =>
      living.some((p) => Math.abs(x - p.x) < hw - 1 && Math.abs(y - p.y) < hh - 1);
    for (let attempt = 0; attempt < 16; attempt++) {
      // A random point on the rectangle around the view, sides weighted by length.
      const along = rng.next() * (4 * hw + 4 * hh);
      let x: number;
      let y: number;
      if (along < 2 * hw) {
        x = focus.x - hw + along;
        y = focus.y - hh;
      } else if (along < 4 * hw) {
        x = focus.x - hw + (along - 2 * hw);
        y = focus.y + hh;
      } else if (along < 4 * hw + 2 * hh) {
        x = focus.x - hw;
        y = focus.y - hh + (along - 4 * hw);
      } else {
        x = focus.x + hw;
        y = focus.y - hh + (along - 4 * hw - 2 * hh);
      }
      if (x < b.minX + radius || x > b.maxX - radius || y < b.minY + radius || y > b.maxY - radius)
        continue;
      if (state.collision.isBlocked(x, y, radius)) continue;
      if (living.length > 1 && seen(x, y)) continue;
      return { x, y };
    }
    return undefined;
  }

  private regularCount(): number {
    let n = 0;
    for (const e of this.state.enemies) if (!e.dead && !e.elite && !e.boss) n++;
    return n;
  }

  private spawnAtEdge(def: EnemyDefinition, elite = false) {
    const p = this.spawnPosition(def.radius * (elite ? this.state.realm.elite.size : 1));
    return p ? this.state.spawnEnemy(def, p.x, p.y, { elite }) : undefined;
  }

  private spawnPack(def: EnemyDefinition, size: number): void {
    const p = this.spawnPosition(def.radius * 3);
    if (!p) return;
    for (let i = 0; i < size; i++) {
      const a = this.state.spawnRng.angle();
      const d = this.state.spawnRng.range(0, def.radius * 3);
      const x = p.x + Math.cos(a) * d;
      const y = p.y + Math.sin(a) * d;
      if (!this.state.collision.isBlocked(x, y, def.radius)) this.state.spawnEnemy(def, x, y);
    }
  }

  private fire(event: SpawnEvent): void {
    const state = this.state;
    const def = state.index.enemy(event.enemy);
    if (event.type === 'elite') {
      if (this.spawnAtEdge(def, true)) {
        state.emit({
          type: 'announcement',
          text: `An elite ${def.name} approaches!`,
          kind: 'elite',
        });
      }
      return;
    }
    // A horde closes in from all sides just outside the view.
    const focus = state.focus();
    const radius = Math.hypot(state.view.halfWidth, state.view.halfHeight) + SPAWN_MARGIN;
    for (let i = 0; i < event.count; i++) {
      const a = (i / event.count) * Math.PI * 2;
      const x = focus.x + Math.cos(a) * radius;
      const y = focus.y + Math.sin(a) * radius;
      if (!state.collision.isBlocked(x, y, def.radius)) state.spawnEnemy(def, x, y);
    }
    state.emit({
      type: 'announcement',
      text: `A horde of ${def.name}s surrounds you!`,
      kind: 'info',
    });
  }

  /** Regular enemies left far behind reappear near the players, so pressure follows the player. */
  private leash(): void {
    const state = this.state;
    for (const e of state.enemies) {
      if (e.dead || e.elite || e.boss) continue;
      const p = state.nearestPlayer(e.x, e.y);
      if (!p || (p.x - e.x) ** 2 + (p.y - e.y) ** 2 < LEASH * LEASH) continue;
      const pos = this.spawnPosition(e.radius);
      if (!pos) continue;
      e.x = e.px = pos.x;
      e.y = e.py = pos.y;
    }
  }
}
