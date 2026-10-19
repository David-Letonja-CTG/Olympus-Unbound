import { heal } from '../combat/damage';
import { WareDefinition, WareEffect } from '../data/types';
import { applyOffer } from '../progression/loadout';
import { addCompanion } from './companions';
import { RunState } from './run-state';
import { Player, UpgradeOffer } from './types';

/** Body size used to keep the merchant clear of obstacles. */
const MERCHANT_BODY = 28;

/**
 * What one kind of ware does (spec: merchant / wares): the targets it is offered for (one offer each; `''` when it has
 * no target, none when it is unavailable) and how a purchase applies. A new kind of ware is one more entry here.
 */
interface WareRule<T extends WareEffect['type']> {
  targets(state: RunState, player: Player, effect: Extract<WareEffect, { type: T }>): string[];
  /** A short note for the offer, e.g. the weapon and the level it reaches. */
  note?(state: RunState, player: Player, target: string): { name: string; level?: number };
  apply(
    state: RunState,
    player: Player,
    effect: Extract<WareEffect, { type: T }>,
    target: string,
  ): void;
}

const WARE_RULES: { [T in WareEffect['type']]: WareRule<T> } = {
  companion: {
    targets(state, player, effect) {
      const mine = state.companions.filter((c) => c.ownerId === player.id);
      if (mine.length >= state.balance.merchant.maxCompanions) return [];
      return mine.some((c) => c.def.id === effect.companion) ? [] : [''];
    },
    apply(state, player, effect) {
      addCompanion(
        state,
        player,
        state.index.content.companions.find((c) => c.id === effect.companion),
      );
    },
  },
  weaponLevel: {
    targets(_state, player) {
      return player.loadout.weapons
        .filter((w) => w.level < w.def.levels.length + 1)
        .map((w) => w.def.id);
    },
    note(_state, player, target) {
      const weapon = player.loadout.weapons.find((w) => w.def.id === target);
      return { name: weapon?.def.name ?? target, level: (weapon?.level ?? 0) + 1 };
    },
    apply(state, player, _effect, target) {
      // The level-up rule itself, so a whetstone levels a weapon exactly as a level-up does.
      applyOffer(state, player, {
        kind: 'weaponLevel',
        itemId: target,
        name: '',
        description: '',
        level: 0,
        maxLevel: 0,
        sprite: '',
        color: 0,
      });
    },
  },
  heal: {
    targets(_state, player) {
      return player.health < player.stats.maxHealth ? [''] : [];
    },
    apply(state, player, effect) {
      heal(state, player, player.stats.maxHealth * effect.fraction);
    },
  },
};

function rule(effect: WareEffect): WareRule<WareEffect['type']> {
  return WARE_RULES[effect.type] as WareRule<WareEffect['type']>;
}

/** A ware's price now: it grows with every realm cleared (spec: merchant / the shop). */
export function priceOf(state: RunState, ware: WareDefinition): number {
  return Math.round(ware.price * (1 + state.balance.merchant.priceGrowth * state.depth));
}

/** Arrivals, departures and stepping into the ring (spec: merchant / the merchant's visits, the shop). */
export function updateMerchant(state: RunState, dt: number): void {
  const rules = state.balance.merchant;
  const before = state.realmTime - dt;
  if (!state.merchant && rules.arrivals.some((t) => before < t && state.realmTime >= t))
    arriveMerchant(state);
  const merchant = state.merchant;
  if (!merchant) return;
  merchant.leavesIn -= dt;
  if (merchant.leavesIn <= 0) {
    state.merchant = undefined;
    state.shopQueue.length = 0;
    state.emit({ type: 'merchantLeft' });
    state.emit({ type: 'announcement', text: 'The merchant moves on', kind: 'info' });
    return;
  }
  const r2 = merchant.radius * merchant.radius;
  for (const p of state.players) {
    const inside = p.alive && (p.x - merchant.x) ** 2 + (p.y - merchant.y) ** 2 <= r2;
    if (inside && !merchant.inside.has(p.id)) {
      merchant.inside.add(p.id);
      // Bots leave the merchant to the player (spec: bot-allies / how bots play).
      if (!p.bot && !state.shopQueue.includes(p.id)) state.shopQueue.push(p.id);
    } else if (!inside) merchant.inside.delete(p.id);
  }
}

/** A short walk from a living god, clear of obstacles and inside the realm, by the run's seed (D5). */
export function arriveMerchant(state: RunState): void {
  const living = state.players.filter((p) => p.alive);
  if (living.length === 0) return;
  const rng = state.merchantRng;
  const near = living[rng.int(0, living.length - 1)];
  const angle = rng.range(0, Math.PI * 2);
  const { bounds } = state.arena;
  const margin = MERCHANT_BODY * 3;
  const body = {
    x: Math.min(
      bounds.maxX - margin,
      Math.max(bounds.minX + margin, near.x + Math.cos(angle) * state.balance.merchant.distance),
    ),
    y: Math.min(
      bounds.maxY - margin,
      Math.max(bounds.minY + margin, near.y + Math.sin(angle) * state.balance.merchant.distance),
    ),
    radius: MERCHANT_BODY,
  };
  state.collision.resolve(body);
  state.merchant = {
    x: body.x,
    y: body.y,
    radius: state.balance.merchant.radius,
    leavesIn: state.balance.merchant.stays,
    // Gods already standing there must step out and in again.
    inside: new Set(
      living
        .filter(
          (p) => (p.x - body.x) ** 2 + (p.y - body.y) ** 2 <= state.balance.merchant.radius ** 2,
        )
        .map((p) => p.id),
    ),
  };
  state.emit({ type: 'merchantArrived', x: body.x, y: body.y });
  state.emit({
    type: 'announcement',
    text: `A wandering merchant has arrived nearby`,
    kind: 'info',
  });
}

/** Every ware available to a player, with its price, then Leave (spec: merchant / wares). */
export function shopOffers(state: RunState, player: Player): UpgradeOffer[] {
  const offers: UpgradeOffer[] = [];
  for (const ware of state.index.content.wares) {
    const r = rule(ware.effect);
    for (const target of r.targets(state, player, ware.effect)) {
      const note = target ? r.note?.(state, player, target) : undefined;
      offers.push({
        kind: 'ware',
        itemId: ware.id,
        target: target || undefined,
        name: note ? `${ware.name}: ${note.name}` : ware.name,
        description: ware.description,
        level: note?.level ?? 1,
        maxLevel: note?.level !== undefined ? note.level : 1,
        sprite: ware.visual.sprite,
        color: ware.visual.color,
        price: priceOf(state, ware),
      });
    }
  }
  offers.push({
    kind: 'leave',
    itemId: '',
    name: 'Leave',
    description: 'Farewell, merchant.',
    level: 1,
    maxLevel: 1,
    sprite: 'merchant',
    color: 0xffd27a,
  });
  return offers;
}

/**
 * Buys a ware for a player from the party's gold (spec: merchant / the shop). Returns false (and changes nothing)
 * when it cannot be afforded or is no longer available.
 */
export function buyWare(state: RunState, player: Player, offer: UpgradeOffer): boolean {
  const ware = state.index.wares.get(offer.itemId);
  if (!ware) return false;
  const price = priceOf(state, ware);
  if (state.gold < price) return false;
  const target = offer.target ?? '';
  const r = rule(ware.effect);
  if (!r.targets(state, player, ware.effect).includes(target)) return false;
  state.gold -= price;
  r.apply(state, player, ware.effect, target);
  state.emit({ type: 'purchase', playerId: player.id, wareId: ware.id, price });
  return true;
}
