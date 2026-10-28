import type { AssetManifest, GodDefinition, SkinDefinition } from '../engine';
import { HEADS } from './heads';

/**
 * The gods' skins (spec: god-appearance / skins): a recolour of the god's figure and portrait, unlocked by the god's
 * own achievement or bought in an event shop. Skins never change the rules.
 */
export const SKINS: readonly SkinDefinition[] = [
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
  {
    id: 'hades_shroud',
    god: 'hades',
    name: 'Shroud of Hecate',
    recolor: 0xb08ae0,
    unlock: { eventReward: 'hades_shroud' },
  },
];

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
