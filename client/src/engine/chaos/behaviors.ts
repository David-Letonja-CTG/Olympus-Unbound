import { placeAttack } from '../bosses/boss';
import { Rng } from '../core/rng';
import { EncounterBehavior, EncounterReward, EnemyDefinition } from '../data/types';
import { RunState } from '../sim/run-state';
import { Enemy } from '../sim/types';
import { grantBoon } from './boons';
import { Encounter, EncounterContext, EncounterView } from './encounter';
import { dominantElement } from './observe';

/** Invaders and arrivals never appear closer than this to a living god (spec: director-of-chaos / fairness). */
const SAFE_DISTANCE = 170;
/** How far invaders spread around their rift. */
const RIFT_SPREAD = 110;
const RIFT_RADIUS = 70;
const ARRIVAL_RADIUS = 56;
/** A stage is mostly defeated when this share of it is left. */
const STAGE_LEFT = 0.25;
/** A hunter attacks only gods this close. */
const HUNTER_REACH = 520;
/** Seconds a hunter or champion may wait for room to appear before its encounter gives up. */
const SPAWN_PATIENCE = 4;

/**
 * One reusable rule per encounter behavior (spec: director-of-chaos): the Director runs the lifecycle and calls these;
 * it never asks which kind an encounter is. A new kind is one more entry here and its content type.
 */
export interface EncounterRule<T extends EncounterBehavior['type']> {
  /** Chooses places and names when selected; false: it cannot happen now (nothing changed). */
  begin(ctx: EncounterContext, enc: Encounter, b: Extract<EncounterBehavior, { type: T }>): boolean;
  /** Each step of the warning; `progress` goes from 0 to 1. */
  warn?(
    ctx: EncounterContext,
    enc: Encounter,
    b: Extract<EncounterBehavior, { type: T }>,
    progress: number,
  ): void;
  /** The warning is over: it becomes dangerous. */
  start(ctx: EncounterContext, enc: Encounter, b: Extract<EncounterBehavior, { type: T }>): void;
  /** Each active step; ends with `ctx.finish`. */
  update(
    ctx: EncounterContext,
    enc: Encounter,
    b: Extract<EncounterBehavior, { type: T }>,
    dt: number,
  ): void;
  /** Takes back what it placed (markers, modifiers, its hunter); once, when it resolves or is cancelled. */
  cleanup(ctx: EncounterContext, enc: Encounter, b: Extract<EncounterBehavior, { type: T }>): void;
  hud(state: RunState, enc: Encounter, b: Extract<EncounterBehavior, { type: T }>): EncounterView;
}

type Rules = { [T in EncounterBehavior['type']]: EncounterRule<T> };

export const ENCOUNTER_BEHAVIORS: Rules = {
  invasion: {
    begin(ctx, enc) {
      const at = riftPlace(ctx.state, ctx.rng);
      if (!at) return false;
      enc.x = at.x;
      enc.y = at.y;
      enc.label = at.where;
      ctx.site(enc, 'rift', at.x, at.y, RIFT_RADIUS, enc.def.telegraph);
      return true;
    },
    start(ctx, enc, b) {
      enc.timer = b.timeLimit;
      enc.stage = 0;
      enc.stageTime = 0;
      ctx.site(enc, 'rift', enc.x, enc.y, RIFT_RADIUS, b.timeLimit);
      spawnStage(ctx, enc, b);
    },
    update(ctx, enc, b, dt) {
      enc.timer -= dt;
      enc.stageTime += dt;
      let alive = 0;
      let last: Enemy | undefined;
      for (const e of enc.enemies) {
        if (!e.dead) alive++;
        else last = e;
      }
      const more = enc.stage < b.stages.length - 1;
      if (more) {
        const spawned = enc.enemies.length - enc.stageStart;
        if (enc.stageTime >= b.stageGap || alive <= spawned * STAGE_LEFT) {
          enc.stage++;
          enc.stageTime = 0;
          spawnStage(ctx, enc, b);
        }
        if (enc.timer <= 0) ctx.finish(enc, 'overrun');
        return;
      }
      if (alive === 0) {
        if (last) {
          enc.x = last.x;
          enc.y = last.y;
        }
        ctx.finish(enc, 'repelled');
      } else if (enc.timer <= 0) ctx.finish(enc, 'overrun');
    },
    cleanup(ctx, enc) {
      // The rift closes; invaders still alive stay as ordinary monsters.
      dropSite(ctx.state, enc);
    },
    hud(state, enc, b) {
      if (enc.phase === 'telegraph')
        return { objective: `Invaders come ${enc.label}`, seconds: enc.timer };
      let left = 0;
      for (const e of enc.enemies) if (!e.dead) left++;
      for (let s = enc.stage + 1; s < b.stages.length; s++)
        left += stageSize(state, b, s) + (b.elite && s === b.stages.length - 1 ? 1 : 0);
      return { left, seconds: Math.max(0, enc.timer) };
    },
  },

  eclipse: {
    begin(ctx, enc) {
      const focus = ctx.state.focus();
      enc.x = focus.x;
      enc.y = focus.y;
      return true;
    },
    warn(ctx, _enc, b, progress) {
      // The light fades in as a warning (spec: director-of-chaos / eclipse of olympus).
      ctx.state.omen.darkness = b.darkness * progress;
    },
    start(ctx, enc, b) {
      const omen = ctx.state.omen;
      omen.darkness = b.darkness;
      omen.enemySpeed = b.enemySpeed;
      omen.spawnRate = b.spawnRate;
      enc.timer = b.seconds;
    },
    update(ctx, enc, b, dt) {
      enc.timer -= dt;
      const champion = enc.enemies[0];
      if (champion?.dead) {
        enc.x = champion.x;
        enc.y = champion.y;
        ctx.finish(enc, 'broken');
        return;
      }
      // `stage` 1: no room was found for the champion, and the eclipse goes on without one.
      if (!champion && enc.stage === 0) {
        if (enc.age >= b.champion.at - b.champion.warn && !enc.monster) {
          enc.monster = realmElite(ctx.state, ctx.rng).id;
          const at = ctx.spawner.spawnPosition(ARRIVAL_RADIUS, ctx.rng);
          if (at) ctx.site(enc, 'arrival', at.x, at.y, ARRIVAL_RADIUS, b.champion.warn);
        }
        if (enc.age >= b.champion.at && enc.monster) {
          const def = ctx.state.index.enemy(enc.monster);
          if (arrive(ctx, enc, def, b.champion.health, 1)) {
            enc.label = def.name;
            ctx.state.emit({
              type: 'announcement',
              text: `A ${def.name} rises as the eclipse's champion!`,
              kind: 'omen',
            });
          } else if (enc.age >= b.champion.at + SPAWN_PATIENCE) {
            enc.stage = 1;
            dropSite(ctx.state, enc);
          }
        }
      }
      if (enc.timer <= 0) ctx.finish(enc, 'endured');
    },
    cleanup(ctx, enc) {
      const omen = ctx.state.omen;
      omen.darkness = 0;
      omen.enemySpeed = 1;
      omen.spawnRate = 1;
      dropSite(ctx.state, enc);
      // A champion still standing withdraws with the eclipse.
      for (const e of enc.enemies) escape(ctx.state, e);
    },
    hud(_state, enc) {
      if (enc.phase === 'telegraph')
        return { objective: 'The light is failing', seconds: enc.timer };
      const champion = enc.enemies[0];
      return {
        seconds: Math.max(0, enc.timer),
        left: champion && !champion.dead ? 1 : undefined,
      };
    },
  },

  hunt: {
    begin(ctx, enc, b) {
      const at = ctx.spawner.spawnPosition(ARRIVAL_RADIUS, ctx.rng);
      if (!at) return false;
      const def = realmElite(ctx.state, ctx.rng);
      enc.x = at.x;
      enc.y = at.y;
      // Named after the party's strongest element: it answers the party's power in words only.
      enc.label = `${b.titles[dominantElement(ctx.state)]} the ${def.name}`;
      // Kept for the arrival: the same monster that was announced.
      enc.monster = def.id;
      ctx.site(enc, 'arrival', at.x, at.y, ARRIVAL_RADIUS, enc.def.telegraph);
      return true;
    },
    start(ctx, enc, b) {
      enc.timer = b.escapeAfter;
      enc.attackTimer = b.pause;
      enc.attackIndex = 0;
    },
    update(ctx, enc, b, dt) {
      const state = ctx.state;
      const hunter = enc.enemies[0];
      if (!hunter) {
        // Exactly one hunter per encounter: it arrives once, at its mark or (if a god stands there) out of sight.
        const def = state.index.enemy(enc.monster);
        if (!arrive(ctx, enc, def, b.health, b.speed) && enc.age >= SPAWN_PATIENCE)
          ctx.cancel(enc, 'no room for the hunter');
        return;
      }
      if (hunter.dead) {
        enc.x = hunter.x;
        enc.y = hunter.y;
        ctx.finish(enc, 'slain');
        return;
      }
      enc.timer -= dt;
      enc.x = hunter.x;
      enc.y = hunter.y;
      if (enc.timer <= 0) {
        ctx.finish(enc, 'escaped');
        return;
      }
      // Readable attacks on a rhythm: it stands still while its warning fills (spec: director-of-chaos / hunter).
      enc.attackTimer -= dt;
      if (enc.attackTimer > 0) {
        if (hunter.speed === 0 && enc.attackTimer < b.pause - busyOf(b, enc))
          hunter.speed = enc.speed;
        return;
      }
      const target = state.nearestPlayer(hunter.x, hunter.y);
      if (!target || (target.x - hunter.x) ** 2 + (target.y - hunter.y) ** 2 > HUNTER_REACH ** 2) {
        enc.attackTimer = 0.5;
        return;
      }
      const attack = b.attacks[enc.attackIndex % b.attacks.length];
      enc.attackIndex++;
      state.emit({ type: 'bossAttack', attack: attack.id, kind: attack.type });
      placeAttack(state, hunter, attack, target);
      hunter.speed = 0;
      enc.attackTimer = b.pause;
    },
    cleanup(ctx, enc) {
      dropSite(ctx.state, enc);
      for (const e of enc.enemies) escape(ctx.state, e);
    },
    hud(_state, enc) {
      if (enc.phase === 'telegraph')
        return { objective: `${enc.label} is coming`, seconds: enc.timer };
      return { seconds: Math.max(0, enc.timer), left: enc.enemies[0] ? 1 : undefined };
    },
  },

  shrine: {
    begin(ctx, enc, b) {
      const at = nearGod(ctx, b.distance * (ctx.observation.still ? 1.6 : 1), b.radius);
      if (!at) return false;
      enc.x = at.x;
      enc.y = at.y;
      ctx.site(enc, 'shrine', at.x, at.y, b.radius, enc.def.telegraph);
      return true;
    },
    start(ctx, enc, b) {
      enc.timer = b.seconds;
      ctx.site(enc, 'shrine', enc.x, enc.y, b.radius, b.seconds);
    },
    update(ctx, enc, b, dt) {
      enc.timer -= dt;
      const state = ctx.state;
      if (anyGodWithin(state, enc.x, enc.y, b.radius)) {
        // Defensive boons are likelier while the party struggles (spec: director-of-chaos / divine blessings).
        const boost = state.balance.director.adapt.boost;
        const id = ctx.rng.weighted(b.boons, (id) =>
          ctx.struggling && state.index.boons.get(id)?.relief ? boost : 1,
        );
        const boon = id ? state.index.boons.get(id) : undefined;
        if (boon) {
          for (const p of state.players) if (p.alive) grantBoon(state, p, boon);
          enc.label = boon.name;
        }
        ctx.finish(enc, 'received');
      } else if (enc.timer <= 0) ctx.finish(enc, 'faded');
    },
    cleanup(ctx, enc) {
      dropSite(ctx.state, enc);
    },
    hud(_state, enc) {
      return { seconds: Math.max(0, enc.timer) };
    },
  },

  contract: {
    begin(ctx, enc, b) {
      const at = nearGod(ctx, b.distance, b.radius);
      if (!at) return false;
      enc.x = at.x;
      enc.y = at.y;
      ctx.site(enc, 'altar', at.x, at.y, b.radius, enc.def.telegraph);
      return true;
    },
    start(ctx, enc, b) {
      enc.timer = b.seconds;
      ctx.site(enc, 'altar', enc.x, enc.y, b.radius, b.seconds);
    },
    update(ctx, enc, b, dt) {
      enc.timer -= dt;
      if (anyGodWithin(ctx.state, enc.x, enc.y, b.radius)) {
        // Accepted for the party, then the offered encounter announces itself. If it cannot be kept now (no place for
        // it), the offer is withdrawn with nothing given or taken.
        ctx.finish(enc, 'accepted');
        if (!ctx.offer(b.offers, b.bonus, enc.x, enc.y)) {
          ctx.cancel(enc, 'offer could not be kept');
          ctx.state.emit({ type: 'announcement', text: 'The offer is withdrawn.', kind: 'omen' });
        }
      } else if (enc.timer <= 0) ctx.finish(enc, 'declined');
    },
    cleanup(ctx, enc) {
      dropSite(ctx.state, enc);
    },
    hud(state, enc, b) {
      const offered = state.index.encounters.get(b.offers);
      const win = offered && Object.values(offered.outcomes).find((o) => o.success);
      return {
        seconds: Math.max(0, enc.timer),
        risk: b.risk,
        reward: describeReward(state, mergeRewards(win?.reward, b.bonus)),
      };
    },
  },
};

/** The rule for an encounter's behavior, typed loosely for the Director, which never looks inside. */
export function ruleOf(enc: Encounter): EncounterRule<EncounterBehavior['type']> {
  return ENCOUNTER_BEHAVIORS[enc.def.behavior.type] as EncounterRule<EncounterBehavior['type']>;
}

/** A reward in words for announcements and the HUD, e.g. "+40 gold · a treasure chest". */
export function describeReward(state: RunState, reward: EncounterReward | undefined): string {
  if (!reward) return '';
  const parts: string[] = [];
  if (reward.gold) parts.push(`+${goldOf(state, reward.gold)} gold`);
  if (reward.chest) parts.push('a treasure chest');
  if (reward.boon) parts.push(state.index.boons.get(reward.boon)?.name ?? reward.boon);
  if (reward.heal) parts.push(`healing ${Math.round(reward.heal * 100)}%`);
  return parts.join(' · ');
}

/** Gold rewards grow with the realms cleared, like the merchant's prices. */
export function goldOf(state: RunState, gold: number): number {
  return Math.round(gold * (1 + state.balance.director.goldPerRealm * state.depth));
}

export function mergeRewards(
  a: EncounterReward | undefined,
  b: EncounterReward | undefined,
): EncounterReward | undefined {
  if (!a || !b) return a ?? b;
  return {
    gold: (a.gold ?? 0) + (b.gold ?? 0) || undefined,
    chest: a.chest || b.chest || undefined,
    boon: b.boon ?? a.boon,
    heal: Math.min(1, (a.heal ?? 0) + (b.heal ?? 0)) || undefined,
  };
}

// ---------------------------------------------------------------------------------------------------------------

/** How many invaders stage `s` brings: more with the party and depth, never more than the cap. */
function stageSize(
  state: RunState,
  b: Extract<EncounterBehavior, { type: 'invasion' }>,
  s: number,
): number {
  const scale = state.partyScale.maxAlive * state.depthScale().maxAlive;
  return Math.min(b.maxCount, Math.round(b.stages[s].count * scale));
}

/** A stage of invaders around the rift, away from every god; the last stage may bring an elite of the realm. */
function spawnStage(
  ctx: EncounterContext,
  enc: Encounter,
  b: Extract<EncounterBehavior, { type: 'invasion' }>,
): void {
  const state = ctx.state;
  const stage = b.stages[enc.stage];
  const count = stageSize(state, b, enc.stage);
  // Where this stage starts, so "mostly defeated" counts this stage alone.
  enc.stageStart = enc.enemies.length;
  const fixed = stage.enemy ? state.index.enemy(stage.enemy) : undefined;
  for (let i = 0; i < count; i++) {
    const pick = ctx.rng.weighted(ctx.spawner.currentPhase().enemies, (e) => e.weight);
    const def = fixed ?? (pick ? state.index.enemy(pick.id) : undefined);
    if (!def) continue;
    const at = aroundRift(ctx, enc, def.radius);
    const enemy = at && state.spawnEnemy(def, at.x, at.y);
    if (enemy) enc.enemies.push(enemy);
  }
  if (b.elite && enc.stage === b.stages.length - 1) {
    const def = realmElite(state, ctx.rng);
    const at = aroundRift(ctx, enc, def.radius * state.realm.elite.size);
    const elite = at && state.spawnEnemy(def, at.x, at.y, { elite: true });
    if (elite) enc.enemies.push(elite);
  }
}

function aroundRift(
  ctx: EncounterContext,
  enc: Encounter,
  radius: number,
): { x: number; y: number } | undefined {
  const state = ctx.state;
  for (let attempt = 0; attempt < 6; attempt++) {
    const a = ctx.rng.angle();
    const d = ctx.rng.range(0, RIFT_SPREAD);
    const x = enc.x + Math.cos(a) * d;
    const y = enc.y + Math.sin(a) * d;
    if (state.collision.isBlocked(x, y, radius) || !inBounds(state, x, y, radius)) continue;
    if (anyGodWithin(state, x, y, SAFE_DISTANCE)) continue;
    return { x, y };
  }
  return undefined;
}

/**
 * A rift just beyond the view in a random direction, inside the realm and clear of obstacles, with the direction in
 * words for the warning.
 */
function riftPlace(state: RunState, rng: Rng): { x: number; y: number; where: string } | undefined {
  const focus = state.focus();
  // Just beyond the view's corners, and never within twice the safe distance of a god.
  const distance = Math.max(
    Math.hypot(state.view.halfWidth, state.view.halfHeight) * 0.85,
    SAFE_DISTANCE * 2 + 60,
  );
  const start = rng.angle();
  for (let i = 0; i < 12; i++) {
    const a = start + (i * Math.PI * 2) / 12;
    const b = state.arena.bounds;
    const margin = RIFT_RADIUS * 2;
    const x = Math.min(
      b.maxX - margin,
      Math.max(b.minX + margin, focus.x + Math.cos(a) * distance),
    );
    const y = Math.min(
      b.maxY - margin,
      Math.max(b.minY + margin, focus.y + Math.sin(a) * distance),
    );
    if (state.collision.isBlocked(x, y, RIFT_RADIUS * 0.6)) continue;
    if (anyGodWithin(state, x, y, SAFE_DISTANCE * 2)) continue;
    return { x, y, where: compass(x - focus.x, y - focus.y) };
  }
  return undefined;
}

/** "to the north", "to the south-east"… from a direction in world space (y grows southward). */
function compass(dx: number, dy: number): string {
  const names = [
    'east',
    'south-east',
    'south',
    'south-west',
    'west',
    'north-west',
    'north',
    'north-east',
  ];
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return `to the ${names[(octant + 8) % 8]}`;
}

/** A place a short walk from a living god (chosen by the stream), inside the realm and clear of obstacles. */
function nearGod(
  ctx: EncounterContext,
  distance: number,
  radius: number,
): { x: number; y: number } | undefined {
  const state = ctx.state;
  const living = state.players.filter((p) => p.alive);
  if (living.length === 0) return undefined;
  const god = living[ctx.rng.int(0, living.length - 1)];
  const a = ctx.rng.angle();
  const b = state.arena.bounds;
  const margin = radius * 2;
  const body = {
    x: Math.min(b.maxX - margin, Math.max(b.minX + margin, god.x + Math.cos(a) * distance)),
    y: Math.min(b.maxY - margin, Math.max(b.minY + margin, god.y + Math.sin(a) * distance)),
    radius: radius * 0.5,
  };
  state.collision.resolve(body);
  return { x: body.x, y: body.y };
}

/**
 * Brings a hunter or champion of `def` at the encounter's arrival mark, or out of sight if a god stands on the mark.
 * It is an elite of the realm, scaled like every monster, then by the encounter's own declared strength.
 */
function arrive(
  ctx: EncounterContext,
  enc: Encounter,
  def: EnemyDefinition,
  health: number,
  speed: number,
): Enemy | undefined {
  const state = ctx.state;
  const radius = def.radius * state.realm.elite.size;
  let at = enc.site ? { x: enc.site.x, y: enc.site.y } : undefined;
  if (!at || anyGodWithin(state, at.x, at.y, SAFE_DISTANCE))
    at = ctx.spawner.spawnPosition(radius, ctx.rng);
  if (!at) return undefined;
  const hunter = state.spawnEnemy(def, at.x, at.y, { elite: true });
  if (!hunter) return undefined;
  hunter.health *= health;
  hunter.maxHealth *= health;
  hunter.speed *= speed;
  hunter.champion = true;
  enc.speed = hunter.speed;
  enc.enemies.push(hunter);
  dropSite(state, enc);
  return hunter;
}

/**
 * The realm's own elites that have appeared by now in its timeline (the first one early on), preferring those that
 * pursue rather than summon: hunters keep the realm's identity.
 */
function realmElite(state: RunState, rng: Rng): EnemyDefinition {
  const elites = state.realm.events.filter((e) => e.type === 'elite');
  const due = elites.filter((e) => e.at <= state.realmTime);
  const pool = (due.length > 0 ? due : elites.slice(0, 1)).map((e) => state.index.enemy(e.enemy));
  const hunters = pool.filter((d) => d.behavior.type !== 'summoner');
  const from = hunters.length > 0 ? hunters : pool;
  if (from.length === 0) return state.index.enemy(state.realm.timeline[0].enemies[0].id);
  return from[rng.int(0, from.length - 1)];
}

/** How long the current attack holds the hunter in place: the warning of the attack it last made. */
function busyOf(b: Extract<EncounterBehavior, { type: 'hunt' }>, enc: Encounter): number {
  const last = b.attacks[(enc.attackIndex - 1 + b.attacks.length) % b.attacks.length];
  return 'windup' in last ? last.windup : 0;
}

/** A hunter or champion leaves alive: gone without a kill or drops. */
function escape(state: RunState, enemy: Enemy): void {
  if (enemy.dead) return;
  enemy.dead = true;
  state.emit({ type: 'escaped', x: enemy.x, y: enemy.y });
}

function dropSite(state: RunState, enc: Encounter): void {
  const site = enc.site;
  if (!site) return;
  const i = state.sites.indexOf(site);
  if (i >= 0) state.sites.splice(i, 1);
  enc.site = undefined;
}

function anyGodWithin(state: RunState, x: number, y: number, radius: number): boolean {
  const r2 = radius * radius;
  for (const p of state.players) if (p.alive && (p.x - x) ** 2 + (p.y - y) ** 2 <= r2) return true;
  return false;
}

function inBounds(state: RunState, x: number, y: number, radius: number): boolean {
  const b = state.arena.bounds;
  return (
    x >= b.minX + radius && x <= b.maxX - radius && y >= b.minY + radius && y <= b.maxY - radius
  );
}
