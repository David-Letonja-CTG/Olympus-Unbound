import type {
  AssetManifest,
  EventRewardDefinition,
  GodDefinition,
  SkinDefinition,
} from '../engine';
import { GODS } from './gods';
import { HEADS } from './heads';

/**
 * The gods' skins (spec: god-appearance / skins): a recolour of the god's figure and portrait, unlocked by the god's
 * own achievement or bought in an event shop. Skins never change the rules.
 */
const GOD_SKINS: readonly SkinDefinition[] = [
  {
    id: 'zeus_tempest',
    god: 'zeus',
    name: 'Tempest',
    recolor: 0x9db8e8,
    unlock: { achievement: 'storm_lord' },
  },
  {
    id: 'hades_ash',
    god: 'hades',
    name: 'Ash of Tartarus',
    recolor: 0xa8a2a6,
    unlock: { achievement: 'lord_of_the_dead' },
  },
  {
    id: 'poseidon_deep',
    god: 'poseidon',
    name: 'The Deep',
    recolor: 0x6fb3c8,
    unlock: { achievement: 'earth_shaker' },
  },
  {
    id: 'athena_owl',
    god: 'athena',
    name: 'Owl of Athens',
    recolor: 0xc8b8a0,
    unlock: { achievement: 'grey_eyed' },
  },
];

/** Each seasonal event's skin, sold in its shop (spec: seasonal-events / skins in event shops): three per god. */
const EVENT_SKINS: readonly (Omit<SkinDefinition, 'unlock'> & { readonly event: string })[] = [
  {
    id: 'athena_starlit',
    god: 'athena',
    name: 'Starlit Aegis',
    recolor: 0xa8b8ff,
    event: 'longest_night',
  },
  {
    id: 'zeus_frost',
    god: 'zeus',
    name: 'Frostbound',
    recolor: 0xc8e8ff,
    event: 'winds_of_boreas',
  },
  {
    id: 'athena_rose',
    god: 'athena',
    name: 'Rose of Eros',
    recolor: 0xffb4c4,
    event: 'festival_of_eros',
  },
  {
    id: 'poseidon_golden',
    god: 'poseidon',
    name: 'Hesperid Gold',
    recolor: 0xf0d080,
    event: 'apples_of_hesperides',
  },
  {
    id: 'zeus_verdant',
    god: 'zeus',
    name: 'Verdant Revel',
    recolor: 0xa8d890,
    event: 'revels_of_pan',
  },
  {
    id: 'athena_moonlit',
    god: 'athena',
    name: 'Moonlit Huntress',
    recolor: 0xd0e0ff,
    event: 'hunt_of_artemis',
  },
  {
    id: 'zeus_sunlit',
    god: 'zeus',
    name: 'Sunlit',
    recolor: 0xffe08a,
    event: 'midsummer_of_apollo',
  },
  {
    id: 'hades_ember',
    god: 'hades',
    name: 'Ember of Prometheus',
    recolor: 0xff9a6a,
    event: 'theft_of_fire',
  },
  {
    id: 'poseidon_starfall',
    god: 'poseidon',
    name: 'Starfall',
    recolor: 0x9aa8f0,
    event: 'stars_of_perseus',
  },
  {
    id: 'hades_wine',
    god: 'hades',
    name: 'Wine-Dark',
    recolor: 0xc07090,
    event: 'vintage_of_dionysus',
  },
  {
    id: 'hades_shroud',
    god: 'hades',
    name: 'Shroud of Hecate',
    recolor: 0xb08ae0,
    event: 'night_of_hecate',
  },
  {
    id: 'poseidon_harvest',
    god: 'poseidon',
    name: 'Harvest',
    recolor: 0xd8b070,
    event: 'hunger_of_erysichthon',
  },
];

/** What a skin costs in its event's currency. */
const SKIN_COST = 100;

export const SKINS: readonly SkinDefinition[] = [
  ...GOD_SKINS,
  ...EVENT_SKINS.map(({ event: _, ...skin }) => ({ ...skin, unlock: { eventReward: skin.id } })),
];

/** The event shops' skin rewards, one per event; the shop pictures the god in the skin. */
export const SKIN_REWARDS: readonly EventRewardDefinition[] = EVENT_SKINS.map((s) => ({
  id: s.id,
  event: s.event,
  name: s.name,
  description: `${GODS.find((g) => g.id === s.god)?.name ?? s.god} in the ${s.name}, for good: a skin.`,
  cost: SKIN_COST,
  effect: { type: 'skin', skin: s.id },
  sprite: `${s.god}@${s.id}`,
}));

/**
 * The manifest with the gods' head positions on their run figures (for crowns, content/heads.ts) and every skin's
 * sprites: each god's run figure and armed sheet, recoloured.
 */
export function withSkins(
  assets: AssetManifest,
  gods: readonly GodDefinition[],
  skins: readonly SkinDefinition[],
): AssetManifest {
  const sprites = { ...assets.sprites };
  for (const [key, heads] of Object.entries(HEADS))
    if (sprites[key]) sprites[key] = { ...sprites[key], heads };
  for (const skin of skins) {
    const god = gods.find((g) => g.id === skin.god);
    for (const key of [god?.visual.sprite, god?.figure?.sprite]) {
      const base = key ? sprites[key] : undefined;
      // The key the engine asks for (skinnedSprite).
      if (key && base) sprites[`${key}@${skin.id}`] = { ...base, recolor: skin.recolor };
    }
  }
  return { ...assets, sprites };
}
