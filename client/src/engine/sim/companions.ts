import { heal } from '../combat/damage';
import { CompanionDefinition } from '../data/types';
import { createWeapon } from '../progression/loadout';
import { WEAPON_BEHAVIORS } from '../weapons/behaviors';
import { resolveWeaponStats } from '../weapons/resolve';
import { RunState } from './run-state';
import { Companion, Player } from './types';

/** A weapon that found nothing to hit tries again this soon (as the god's own weapons do). */
const RETRY = 0.1;
/** How far behind its god a companion trots when there is nothing to hunt. */
const HEEL = 46;
/** Further than this from its god (a revival, a long dash) a companion catches up at once. */
const LEASH = 900;

/** A companion joins its god (spec: merchant / companions). */
export function addCompanion(
  state: RunState,
  owner: Player,
  def: CompanionDefinition | undefined,
): void {
  if (!def) return;
  const c: Companion = {
    id: state.id(),
    def,
    ownerId: owner.id,
    x: owner.x,
    y: owner.y,
    px: owner.x,
    py: owner.y,
    radius: def.radius,
    facingX: owner.facingX,
    moving: false,
    weapon: createWeapon(def.attack, owner.stats),
  };
  state.companions.push(c);
  placeBeside(state, c, owner);
}

/** Companions appear beside their gods, e.g. in a new realm (spec: merchant / through the gate). */
export function placeCompanions(state: RunState): void {
  for (const c of state.companions) {
    const owner = state.players.find((p) => p.id === c.ownerId);
    if (owner) placeBeside(state, c, owner);
  }
}

function slotOf(state: RunState, c: Companion): number {
  let slot = 0;
  for (const other of state.companions) {
    if (other === c) return slot;
    if (other.ownerId === c.ownerId) slot++;
  }
  return slot;
}

/** Where a companion heels: behind its god, fanned by its place among the god's companions. */
function heelPoint(state: RunState, c: Companion, owner: Player): { x: number; y: number } {
  const angle = Math.atan2(-owner.facingY, -owner.facingX) + (slotOf(state, c) - 1) * 0.9;
  return { x: owner.x + Math.cos(angle) * HEEL, y: owner.y + Math.sin(angle) * HEEL };
}

function placeBeside(state: RunState, c: Companion, owner: Player): void {
  const at = heelPoint(state, c, owner);
  c.x = c.px = at.x;
  c.y = c.py = at.y;
  state.collision.resolve(c);
  c.px = c.x;
  c.py = c.y;
}

/**
 * Every companion follows its god, hunts the nearest enemy within its range of the god, and attacks through the
 * weapon behaviors as if its god stood where it stands, so its hits go through the one damage pipeline with the
 * god's stats (rule 5). Companions of a player who left go with them; those of a fallen god wait.
 */
export function updateCompanions(state: RunState, dt: number): void {
  let removed = false;
  for (const c of state.companions) {
    c.px = c.x;
    c.py = c.y;
    const owner = state.players.find((p) => p.id === c.ownerId);
    if (!owner || owner.left) {
      removed = true;
      continue;
    }
    c.moving = false;
    if (!owner.alive) continue;
    if (c.def.heal) heal(state, owner, c.def.heal * dt);
    if ((c.x - owner.x) ** 2 + (c.y - owner.y) ** 2 > LEASH * LEASH) placeBeside(state, c, owner);

    const target = state.nearestEnemy(owner.x, owner.y, c.def.hunt);
    const goal = target ?? heelPoint(state, c, owner);
    const stop = target ? c.def.reach + target.radius : 6;
    const dx = goal.x - c.x;
    const dy = goal.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d > stop) {
      const step = Math.min(d - stop, c.def.speed * dt);
      c.x += (dx / d) * step;
      c.y += (dy / d) * step;
      c.moving = true;
      state.collision.resolve(c);
    }
    if (Math.abs(dx) > 1) c.facingX = Math.sign(dx);

    c.weapon.timer -= dt;
    if (target && c.weapon.timer <= 0)
      c.weapon.timer = attack(state, c, owner) ? c.weapon.stats.cooldown : RETRY;
  }
  if (removed) {
    const keep = state.companions.filter((c) =>
      state.players.some((p) => p.id === c.ownerId && !p.left),
    );
    state.companions.length = 0;
    state.companions.push(...keep);
  }
}

function attack(state: RunState, c: Companion, owner: Player): boolean {
  // Resolved against the god's current stats, like the god's own weapons.
  const resolved = resolveWeaponStats(c.weapon.def, 1, owner.stats);
  c.weapon.stats = resolved.stats;
  c.weapon.effects = resolved.effects;
  // The god's stand-in where the companion stands: the behaviors aim and hit from here, as the god.
  const stand: Player = { ...owner, x: c.x, y: c.y, facingX: c.facingX, facingY: 0 };
  return WEAPON_BEHAVIORS[c.weapon.def.behavior].fire({ state, player: stand, weapon: c.weapon });
}
