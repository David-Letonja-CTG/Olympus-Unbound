import { Loadout } from './types';

/** A god's sprite in a skin: `<sprite>@<skin>`, its sheet recoloured (content/skins.ts, spec: god-appearance / skins). */
export function skinnedSprite(sprite: string, skin: string | undefined): string {
  return skin ? `${sprite}@${skin}` : sprite;
}

/** Relic motes circling a god, at most (spec: god-appearance / relic motes). */
export const MAX_MOTES = 6;

/**
 * How a god looks in a run (spec: god-appearance): its armour look 0–3 and the armour's colour, the weapon in its
 * hand with its evolution's colour, and a mote colour per relic. Derived from the loadout for drawing and for
 * rooms' snapshots; the rules never read it.
 */
export interface PlayerLook {
  readonly look: number;
  readonly armourColor?: number;
  readonly weapon?: string;
  readonly evolutionColor?: number;
  readonly relicColors: readonly number[];
}

export function playerLook(loadout: Pick<Loadout, 'weapons' | 'armour' | 'relics'>): PlayerLook {
  const armour = loadout.armour;
  // Look 1 at level 1, look 2 from level 2, look 3 at the armour's last level.
  const look = !armour
    ? 0
    : armour.level >= armour.def.levels.length
      ? 3
      : Math.min(armour.level, 2);
  // The strongest weapon: the highest level, the one taken first on a tie (loadout order).
  let held = loadout.weapons[0];
  for (const w of loadout.weapons) if (w.level > held.level) held = w;
  return {
    look,
    armourColor: armour?.def.visual.color,
    weapon: held?.def.id,
    evolutionColor: held?.evolution?.visual.color,
    relicColors: loadout.relics.slice(0, MAX_MOTES).map((r) => r.visual.color),
  };
}
