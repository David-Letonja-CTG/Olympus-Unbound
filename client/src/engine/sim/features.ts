import { applyStatus } from '../combat/status';
import { FeatureRule, StatusApplication } from '../data/types';
import { ArenaFeature } from '../maps/generate-arena';
import { RunState } from './run-state';

/** Vents and crushers act only this near a god: nothing erupts unseen (spec: arena-generation / map hazards). */
const ACTIVE_RANGE = 900;
/** How close a god comes to touch a brazier. */
const TOUCH = 20;

const BURN: StatusApplication = { effect: 'burn', chance: 1, duration: 3, potency: 1 };

const has = (state: RunState, f: ArenaFeature) => ((state.features >>> f.id) & 1) === 1;
const set = (state: RunState, f: ArenaFeature, on: boolean) => {
  state.features = on
    ? (state.features | (1 << f.id)) >>> 0
    : (state.features & ~(1 << f.id)) >>> 0;
};

/**
 * Fills each feature's number for a new arena: a vent's or crusher's first countdown, a spring's full pool, a lit
 * brazier's pulse (spec: arena-generation / map hazards, map helpers).
 */
export function initFeatures(state: RunState): void {
  const rules = state.realm.map.features ?? [];
  state.features = 0;
  state.featureValues = new Float64Array(state.arena.features.length);
  for (const f of state.arena.features) {
    const rule = rules[f.rule];
    if (rule.type === 'vent' || rule.type === 'crusher')
      state.featureValues[f.id] = state.featureRng.range(rule.every[0], rule.every[1]);
    else if (rule.type === 'spring') state.featureValues[f.id] = rule.pool;
  }
}

/** One step of every hazard and helper. */
export function updateFeatures(state: RunState, dt: number): void {
  const rules = state.realm.map.features;
  if (!rules) return;
  for (const f of state.arena.features) {
    const rule = rules[f.rule];
    switch (rule.type) {
      case 'vent':
      case 'crusher':
        repeat(state, f, rule, dt);
        break;
      case 'teetering':
        teeter(state, f, rule);
        break;
      case 'spring':
        spring(state, f, rule, dt);
        break;
      case 'brazier':
        brazier(state, f, rule, dt);
        break;
    }
  }
}

function nearGod(state: RunState, x: number, y: number, range: number): boolean {
  for (const p of state.players)
    if (p.alive && (p.x - x) ** 2 + (p.y - y) ** 2 <= (range + p.radius) ** 2) return true;
  return false;
}

/** A vent erupts, a crusher slams: again and again while a god is near. */
function repeat(
  state: RunState,
  f: ArenaFeature,
  rule: Extract<FeatureRule, { type: 'vent' | 'crusher' }>,
  dt: number,
): void {
  if (!nearGod(state, f.x, f.y, ACTIVE_RANGE)) return;
  const t = (state.featureValues[f.id] -= dt);
  if (t > 0) return;
  state.featureValues[f.id] = rule.windup + state.featureRng.range(rule.every[0], rule.every[1]);
  const damage = rule.damage * state.scaling().damage;
  if (rule.type === 'vent') {
    state.addHazard({
      kind: 'vent',
      shape: 'circle',
      x: f.x,
      y: f.y,
      radius: rule.radius,
      x2: f.x,
      y2: f.y,
      width: 0,
      warn: rule.windup,
      damage,
      monsters: rule.monsters,
      element: 'fire',
      sourceId: 0,
    });
    return;
  }
  // Across the road: half the road's width and the slabs' reach on each side.
  const half = crusherReach(state.arena);
  const dx = Math.cos(f.angle) * half;
  const dy = Math.sin(f.angle) * half;
  state.addHazard({
    kind: 'crusher',
    shape: 'line',
    x: f.x - dx,
    y: f.y - dy,
    radius: 0,
    x2: f.x + dx,
    y2: f.y + dy,
    width: rule.width,
    warn: rule.windup,
    damage,
    monsters: rule.monsters,
    sourceId: 0,
  });
}

/** Half a crusher's line: the widest road's half plus room for the slabs (the view draws them there). */
export function crusherReach(arena: {
  readonly roads: readonly { readonly width: number }[];
}): number {
  let width = 0;
  for (const r of arena.roads) width = Math.max(width, r.width);
  return width / 2 + 34;
}

/** A leaning column falls once, along its line, when a god first comes near. */
function teeter(
  state: RunState,
  f: ArenaFeature,
  rule: Extract<FeatureRule, { type: 'teetering' }>,
): void {
  if (has(state, f) || !nearGod(state, f.x, f.y, rule.trigger)) return;
  set(state, f, true);
  state.addHazard({
    kind: 'column',
    shape: 'line',
    x: f.x,
    y: f.y,
    radius: 0,
    x2: f.x + Math.cos(f.angle) * rule.length,
    y2: f.y + Math.sin(f.angle) * rule.length,
    width: rule.width,
    warn: rule.windup,
    damage: rule.damage * state.scaling().damage,
    monsters: rule.monsters,
    sourceId: 0,
  });
  state.emit({ type: 'featureSprung', kind: 'column', index: f.id, x: f.x, y: f.y });
}

/** A god in a spring heals out of its pool, as regen does; spent, it lies dry until it refills. */
function spring(
  state: RunState,
  f: ArenaFeature,
  rule: Extract<FeatureRule, { type: 'spring' }>,
  dt: number,
): void {
  if (has(state, f)) {
    if ((state.featureValues[f.id] -= dt) > 0) return;
    state.featureValues[f.id] = rule.pool;
    set(state, f, false);
    return;
  }
  for (const p of state.players) {
    if (!p.alive || p.health >= p.stats.maxHealth) continue;
    if ((p.x - f.x) ** 2 + (p.y - f.y) ** 2 > rule.radius ** 2) continue;
    const amount = Math.min(
      rule.heal * dt,
      state.featureValues[f.id],
      p.stats.maxHealth - p.health,
    );
    p.health += amount;
    state.featureValues[f.id] -= amount;
    if (state.featureValues[f.id] <= 0) {
      set(state, f, true);
      state.featureValues[f.id] = rule.refill;
      return;
    }
  }
}

/** A god's touch lights a cold brazier for the realm; lit, it sets the monsters round it burning. */
function brazier(
  state: RunState,
  f: ArenaFeature,
  rule: Extract<FeatureRule, { type: 'brazier' }>,
  dt: number,
): void {
  if (!has(state, f)) {
    if (!nearGod(state, f.x, f.y, TOUCH)) return;
    set(state, f, true);
    state.emit({ type: 'featureSprung', kind: 'brazier', index: f.id, x: f.x, y: f.y });
    return;
  }
  if ((state.featureValues[f.id] -= dt) > 0) return;
  state.featureValues[f.id] = rule.every;
  for (const e of state.enemiesInRadius(f.x, f.y, rule.radius)) {
    if (e.dead || e.boss || e.part) continue;
    applyStatus(e, BURN, e.maxHealth * rule.burn);
  }
}
