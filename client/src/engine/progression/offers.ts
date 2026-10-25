import { Rng } from '../core/rng';
import { wieldableBy } from '../data/content-index';
import { Element } from '../data/types';
import { RunState } from '../sim/run-state';
import { Player, UpgradeOffer } from '../sim/types';
import { instantValid } from './instants';
import { meetsRequirement } from './loadout';
import { comboParts } from './tree';

interface Candidate {
  readonly offer: UpgradeOffer;
  readonly weight: number;
}

/** An event's item: in its event's runs, or any run once bought in the event shop (spec: seasonal-events). */
function eventItemAllowed(state: RunState, def: { id: string; event?: string }): boolean {
  return (
    !def.event || def.event === state.config.eventId || !!state.config.unlocked?.includes(def.id)
  );
}

/** Elements the build leans toward: the god's affinities plus the elements of held weapons. */
function buildElements(state: RunState, player: Player): Set<Element> {
  const elements = new Set<Element>(player.god.affinities);
  for (const w of player.loadout.weapons) elements.add(w.def.element);
  return elements;
}

/**
 * Every upgrade that is valid for the player's current loadout, with build-aware weights
 * (spec: run-progression / level-up choice, build-aware offers).
 */
export function offerCandidates(state: RunState, player: Player): Candidate[] {
  const { balance, index } = state;
  const w = balance.offerWeights;
  const loadout = player.loadout;
  const elements = buildElements(state, player);
  const affinity = (element?: Element) => (element && elements.has(element) ? w.affinity : 1);
  const candidates: Candidate[] = [];

  for (const weapon of loadout.weapons) {
    const max = weapon.def.levels.length + 1;
    if (weapon.level >= max) continue;
    const next = weapon.def.levels[weapon.level - 1];
    candidates.push({
      weight: w.weaponLevel,
      offer: {
        kind: 'weaponLevel',
        itemId: weapon.def.id,
        name: weapon.def.name,
        description: next.text,
        level: weapon.level + 1,
        maxLevel: max,
        element: weapon.def.element,
        sprite: weapon.def.visual.sprite,
        color: weapon.def.visual.color,
      },
    });
  }

  if (loadout.weapons.length < balance.maxWeapons) {
    for (const def of index.content.weapons) {
      if (!wieldableBy(def, player.god.id)) continue;
      if (!eventItemAllowed(state, def)) continue;
      if (loadout.weapons.some((held) => held.def.id === def.id)) continue;
      candidates.push({
        weight: w.newWeapon * affinity(def.element),
        offer: {
          kind: 'newWeapon',
          itemId: def.id,
          name: def.name,
          description: def.description,
          level: 1,
          maxLevel: def.levels.length + 1,
          element: def.element,
          sprite: def.visual.sprite,
          color: def.visual.color,
        },
      });
    }
  }

  if (!loadout.armour) {
    for (const def of index.content.armour) {
      candidates.push({
        weight: w.armour,
        offer: {
          kind: 'armour',
          itemId: def.id,
          name: def.name,
          description: `${def.description} ${def.levels[0].text}`,
          level: 1,
          maxLevel: def.levels.length,
          sprite: def.visual.sprite,
          color: def.visual.color,
        },
      });
    }
  } else if (loadout.armour.level < loadout.armour.def.levels.length) {
    const def = loadout.armour.def;
    candidates.push({
      weight: w.armourLevel,
      offer: {
        kind: 'armourLevel',
        itemId: def.id,
        name: def.name,
        description: def.levels[loadout.armour.level].text,
        level: loadout.armour.level + 1,
        maxLevel: def.levels.length,
        sprite: def.visual.sprite,
        color: def.visual.color,
      },
    });
  }

  if (loadout.relics.length < balance.maxRelics) {
    for (const def of index.content.relics) {
      if (loadout.relics.includes(def)) continue;
      if (!eventItemAllowed(state, def)) continue;
      candidates.push({
        weight: w.relic * affinity(def.element),
        offer: {
          kind: 'relic',
          itemId: def.id,
          name: def.name,
          description: def.description,
          level: 1,
          maxLevel: 1,
          element: def.element,
          sprite: def.visual.sprite,
          color: def.visual.color,
        },
      });
    }
  }

  for (const def of index.content.skills) {
    const level = loadout.skills.get(def.id) ?? 0;
    if (level >= def.maxLevel) continue;
    if (
      def.requiresElement &&
      !loadout.weapons.some((wpn) => wpn.def.element === def.requiresElement)
    )
      continue;
    if (
      def.requiresBehavior &&
      !loadout.weapons.some((wpn) => def.requiresBehavior?.includes(wpn.def.behavior))
    )
      continue;
    candidates.push({
      weight: w.skill * affinity(def.requiresElement),
      offer: {
        kind: 'skill',
        itemId: def.id,
        name: def.name,
        description: def.description,
        level: level + 1,
        maxLevel: def.maxLevel,
        element: def.requiresElement,
        sprite: def.visual.sprite,
        color: def.visual.color,
      },
    });
  }
  // A weapon's evolution: at its top level, once, with every requirement met (spec: weapon evolutions).
  for (const def of index.content.evolutions) {
    const weapon = loadout.weapons.find((wpn) => wpn.def.id === def.weapon);
    if (!weapon || weapon.evolution || weapon.level < weapon.def.levels.length + 1) continue;
    if (!def.requirements.every((r) => meetsRequirement(loadout, r))) continue;
    candidates.push({
      weight: w.evolution,
      offer: {
        kind: 'evolution',
        itemId: def.id,
        name: def.name,
        description: `${def.description} ${def.upgrade.text}.`,
        level: 1,
        maxLevel: 1,
        element: weapon.def.element,
        sprite: def.visual.sprite,
        color: def.visual.color,
      },
    });
  }

  // Fusions once every requirement is met, up to their top level (spec: run-progression / fusions).
  for (const def of index.content.fusions) {
    const level = loadout.fusions.get(def.id) ?? 0;
    if (level >= def.maxLevel) continue;
    if (!def.requirements.every((r) => meetsRequirement(loadout, r))) continue;
    candidates.push({
      weight: w.fusion,
      offer: {
        kind: 'fusion',
        itemId: def.id,
        name: def.name,
        description: def.description,
        level: level + 1,
        maxLevel: def.maxLevel,
        sprite: def.visual.sprite,
        color: def.visual.color,
      },
    });
  }

  // Ascensions fill the choice when few other upgrades are left, so level-ups never run out (spec: ascensions).
  if (candidates.length < balance.offerCount) {
    for (const def of index.content.ascensions) {
      const level = loadout.ascensions.get(def.id) ?? 0;
      candidates.push({
        weight: w.ascension,
        offer: {
          kind: 'ascension',
          itemId: def.id,
          name: def.name,
          description: def.description,
          level: level + 1,
          maxLevel: 0,
          sprite: def.visual.sprite,
          color: def.visual.color,
        },
      });
    }
  }

  // What each lasting upgrade counts toward, for the hint under the offer (spec: level-up choice).
  for (const [i, c] of candidates.entries()) {
    const parts = comboParts(state, player, c.offer.itemId);
    if (parts.length) candidates[i] = { ...c, offer: { ...c.offer, parts } };
  }

  // Instant blessings: used at once, offered again whenever they are worth it (spec: instant blessings).
  for (const def of index.content.instants) {
    if (!instantValid(state, def)) continue;
    candidates.push({
      weight: def.weight,
      offer: {
        kind: 'instant',
        itemId: def.id,
        name: def.name,
        description: def.description,
        level: 1,
        maxLevel: 1,
        sprite: def.visual.sprite,
        color: def.visual.color,
      },
    });
  }
  return candidates;
}

/** Picks up to `offerCount` different offers by weight; when nothing is valid, offers healing and gold. */
export function generateOffers(state: RunState, player: Player, rng: Rng): UpgradeOffer[] {
  const pool = offerCandidates(state, player);
  const offers: UpgradeOffer[] = [];
  while (offers.length < state.balance.offerCount && pool.length > 0) {
    const pick = rng.weighted(pool, (c) => c.weight);
    if (!pick) break;
    offers.push(pick.offer);
    pool.splice(pool.indexOf(pick), 1);
  }
  if (offers.length > 0) return offers;
  const { healFraction, gold } = state.balance.fallback;
  return [
    {
      kind: 'heal',
      itemId: '',
      name: 'Ambrosia',
      description: `Restore ${Math.round(healFraction * 100)}% of your health.`,
      level: 1,
      maxLevel: 1,
      sprite: 'ambrosia',
      color: 0xff7a9a,
    },
    {
      kind: 'gold',
      itemId: '',
      name: 'Tribute',
      description: `Gain ${gold} gold.`,
      level: 1,
      maxLevel: 1,
      sprite: 'icon_gold',
      color: 0xffd34d,
    },
  ];
}
