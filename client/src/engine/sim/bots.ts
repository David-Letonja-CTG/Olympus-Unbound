import { RunState } from './run-state';
import { NO_INPUT, Player, PlayerInput, UpgradeChoice, UpgradeOffer } from './types';

export type BotSkill = 'easy' | 'normal' | 'hard';

/** What difficulty changes (spec: bot-allies / how bots play). */
interface SkillRules {
  /** Steps between two decisions: the bot's reaction time. */
  readonly rethink: number;
  /** Steps out of warned areas; `hazardMargin` widens what it treats as warned. */
  readonly dodge: boolean;
  readonly hazardMargin: number;
  readonly dash: boolean;
  /** Foes within `abilityReach` before it uses its ability (0 = whenever ready). */
  readonly abilityCrowd: number;
  /** Also uses the ability when this hurt and any foe is close. */
  readonly abilityWhenHurt: number;
}

const SKILLS: Record<BotSkill, SkillRules> = {
  easy: {
    rethink: 24,
    dodge: false,
    hazardMargin: 0,
    dash: false,
    abilityCrowd: 0,
    abilityWhenHurt: 0,
  },
  normal: {
    rethink: 12,
    dodge: true,
    hazardMargin: 10,
    dash: true,
    abilityCrowd: 3,
    abilityWhenHurt: 0,
  },
  hard: {
    rethink: 4,
    dodge: true,
    hazardMargin: 40,
    dash: true,
    abilityCrowd: 5,
    abilityWhenHurt: 0.4,
  },
};

/** How far a bot strays from the player before it comes back, and when it hurries back. */
const LEASH = 260;
const FAR = 520;
const ABILITY_REACH = 220;
/** Fallen gods within this distance are worth going to. */
const REVIVE_REACH = 700;
const PICKUP_REACH = 260;

/** A bot's state between decisions; kept by the simulation, outside the player (snapshots are untouched). */
export interface BotBrain {
  readonly skill: BotSkill;
  /** Steps until the next decision. */
  wait: number;
  move: { x: number; y: number };
}

export function newBrain(skill: BotSkill, slot: number): BotBrain {
  // Bots decide on different steps, so a party of them does not move in lockstep.
  return { skill, wait: slot % SKILLS[skill].rethink, move: { x: 0, y: 0 } };
}

/**
 * One step of a bot's input, from the run's state alone (D5): the autopilot's weighted pulls (spec: bot-allies / how
 * bots play): away from danger, toward a fight at its weapons' range, back to the player, out of telegraphs, to
 * pickups, fallen gods and the open gate. Between decisions it keeps its last move.
 */
export function botInput(state: RunState, bot: Player, brain: BotBrain): PlayerInput {
  if (!bot.alive) return NO_INPUT;
  const rules = SKILLS[brain.skill];
  const decide = brain.wait <= 0;
  if (decide) {
    brain.wait = rules.rethink;
    brain.move = steer(state, bot, rules);
  }
  brain.wait--;
  const { x, y } = brain.move;
  const input: PlayerInput = { moveX: x, moveY: y, ability: false, sprint: false, dash: false };
  if (!decide) return input;

  // Dash out of contact or of a hazard about to land.
  if (rules.dash && (x !== 0 || y !== 0) && bot.stamina >= state.balance.stamina.dashCost) {
    const contact = state.nearestEnemy(bot.x, bot.y, bot.radius + 34);
    if (contact || inHazard(state, bot, rules.hazardMargin, 0.45)) input.dash = true;
  }
  // The ability: at once, or into a crowd, or when hurt and pressed.
  if (bot.abilityTimer <= 0) {
    const near = state.enemiesInRadius(bot.x, bot.y, ABILITY_REACH).length;
    const hurt = bot.health / bot.stats.maxHealth < rules.abilityWhenHurt && near > 0;
    if (rules.abilityCrowd === 0 ? near > 0 : near >= rules.abilityCrowd || hurt)
      input.ability = true;
  }
  return input;
}

function steer(state: RunState, bot: Player, rules: SkillRules): { x: number; y: number } {
  let mx = 0;
  let my = 0;
  const pull = (tx: number, ty: number, weight: number) => {
    const dx = tx - bot.x;
    const dy = ty - bot.y;
    const d = Math.hypot(dx, dy) || 1;
    mx += (dx / d) * weight;
    my += (dy / d) * weight;
  };

  // Away from foes too close; bosses count for more.
  const danger = 150;
  for (const e of state.enemiesInRadius(bot.x, bot.y, danger + 60)) {
    const dx = bot.x - e.x;
    const dy = bot.y - e.y;
    const d2 = Math.max(dx * dx + dy * dy, 1);
    const weight = (e.boss ? 5 : 1) * (e.radius / 15);
    mx += (dx / d2) * 260 * weight;
    my += (dy / d2) * 260 * weight;
  }

  // Toward a fight when nothing is within its weapons' reach.
  const range = weaponRange(bot);
  const target = state.nearestEnemy(bot.x, bot.y, 700);
  if (target) {
    const d = Math.hypot(target.x - bot.x, target.y - bot.y);
    if (d > range) pull(target.x, target.y, 0.7);
  }

  // Back to the player (the first seat).
  const leader = state.players[0];
  if (leader !== bot && leader.alive) {
    const d = Math.hypot(leader.x - bot.x, leader.y - bot.y);
    if (d > LEASH) pull(leader.x, leader.y, d > FAR ? 3 : 1.2);
  }

  // Out of warned areas.
  if (rules.dodge)
    for (const h of state.hazards) {
      if (h.timer <= 0) continue;
      const away = escape(h, bot, rules.hazardMargin);
      if (away) {
        mx += away.x * 6;
        my += away.y * 6;
      }
    }

  // What lies near: experience, gold, chests; healing only when hurt.
  const hurt = bot.health < bot.stats.maxHealth * 0.7;
  let pickup: { x: number; y: number } | undefined;
  let best = PICKUP_REACH * PICKUP_REACH;
  for (const p of state.pickups) {
    if (p.kind === 'heal' && !hurt) continue;
    const d = (p.x - bot.x) ** 2 + (p.y - bot.y) ** 2;
    if (d < best) {
      best = d;
      pickup = p;
    }
  }
  if (pickup) pull(pickup.x, pickup.y, 0.6);

  // A fallen god's spirit within reach: go and revive them.
  for (const p of state.players) {
    if (p.alive || p.left) continue;
    const d = Math.hypot(p.x - bot.x, p.y - bot.y);
    if (d < REVIVE_REACH && d > state.balance.revive.radius * 0.5) pull(p.x, p.y, 2.5);
  }

  // The open gate pulls everyone onward.
  if (state.gate) pull(state.gate.x, state.gate.y, 3);

  const length = Math.hypot(mx, my);
  return length > 0.05 ? { x: mx / length, y: my / length } : { x: 0, y: 0 };
}

/** The mean reach of a god's weapons, at least close quarters. */
function weaponRange(bot: Player): number {
  const weapons = bot.loadout.weapons;
  if (weapons.length === 0) return 140;
  let sum = 0;
  for (const w of weapons) sum += Math.max(w.stats.range, w.stats.size);
  return Math.max(140, Math.min(420, (sum / weapons.length) * 0.8));
}

/** The way out of a warned area, or undefined when the bot is clear of it. */
function escape(
  h: RunState['hazards'][number],
  bot: Player,
  margin: number,
): { x: number; y: number } | undefined {
  if (h.shape === 'circle') {
    const dx = bot.x - h.x;
    const dy = bot.y - h.y;
    const d = Math.hypot(dx, dy);
    if (d > h.radius + bot.radius + margin) return undefined;
    return d > 0 ? { x: dx / d, y: dy / d } : { x: 1, y: 0 };
  }
  // A line: away from the closest point of the segment.
  const lx = h.x2 - h.x;
  const ly = h.y2 - h.y;
  const len2 = lx * lx + ly * ly || 1;
  const t = Math.max(0, Math.min(1, ((bot.x - h.x) * lx + (bot.y - h.y) * ly) / len2));
  const cx = h.x + lx * t;
  const cy = h.y + ly * t;
  const dx = bot.x - cx;
  const dy = bot.y - cy;
  const d = Math.hypot(dx, dy);
  if (d > h.width / 2 + bot.radius + margin) return undefined;
  if (d > 0) return { x: dx / d, y: dy / d };
  const n = Math.hypot(lx, ly) || 1;
  return { x: -ly / n, y: lx / n };
}

/** True when the bot stands in a warned area that lands within `soon` seconds. */
function inHazard(state: RunState, bot: Player, margin: number, soon: number): boolean {
  return state.hazards.some((h) => h.timer > 0 && h.timer <= soon && !!escape(h, bot, margin));
}

/** A bot's answer to its own choice of upgrades (spec: bot-allies / how bots play). */
export function botPick(
  state: RunState,
  bot: Player,
  choice: UpgradeChoice,
  skill: BotSkill,
): number {
  const offers = choice.offers;
  if (skill === 'easy') return 0;
  if (skill === 'normal') {
    const weapon = offers.findIndex((o) => o.kind === 'newWeapon');
    if (weapon >= 0) return weapon;
    return Math.max(
      0,
      offers.findIndex((o) => o.kind === 'weaponLevel'),
    );
  }
  let best = 0;
  let bestScore = -Infinity;
  offers.forEach((o, i) => {
    const score = scoreOffer(state, bot, o);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/** Hard bots build on their strongest weapons, their god's elements and synergies they are close to. */
function scoreOffer(state: RunState, bot: Player, o: UpgradeOffer): number {
  const affinity = o.element && bot.god.affinities.includes(o.element) ? 3 : 0;
  const synergy = state.index.content.synergies.some((s) =>
    s.requirements.some((r) => 'id' in r && r.id === o.itemId),
  )
    ? 4
    : 0;
  switch (o.kind) {
    case 'weaponLevel': {
      const w = bot.loadout.weapons.find((x) => x.def.id === o.itemId);
      const total = bot.loadout.weapons.reduce((s, x) => s + x.damageDealt, 0) || 1;
      const share = w ? w.damageDealt / total : 0;
      return 10 + 3 * (w?.level ?? 0) + 10 * share + synergy;
    }
    case 'newWeapon':
      return (bot.loadout.weapons.length < 4 ? 12 : 4) + affinity + synergy;
    case 'armour':
    case 'armourLevel':
      return 7 + synergy;
    case 'relic':
      return 6 + affinity + synergy;
    case 'skill':
      return 5 + affinity + synergy;
    case 'heal':
      return bot.health < bot.stats.maxHealth * 0.5 ? 20 : 1;
    case 'instant':
      // Only offered when it is worth it (many gems lying), and the XP is the whole party's.
      return 9;
    default:
      return 0;
  }
}
