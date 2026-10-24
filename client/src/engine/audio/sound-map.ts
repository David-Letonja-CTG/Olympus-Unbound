import { BossAttack, Element } from '../data/types';
import { SoundCue } from './sound-player';

/** Every weapon's and every god's ability's own sound (spec: hud / sound feedback). */
export const ATTACK_SOUNDS: Record<string, SoundCue> = {
  thunder_spear: 'spear',
  divine_bow: 'bow',
  trident: 'trident',
  lightning_orb: 'orb',
  war_hammer: 'hammer',
  flaming_sword: 'sword',
  thunderbolt: 'bolt',
  soul_scythe: 'scythe',
  bident: 'bident',
  spear_of_athena: 'athenaSpear',
  wrath_of_olympus: 'strike',
  gates_of_tartarus: 'tartarus',
  tidal_wave: 'tidal',
  gorgons_gaze: 'gaze',
  // Companions (spec: merchant / companions) borrow the voices of their kind of attack.
  eagle_dive: 'strike',
  hound_bite: 'sword',
  serpent_venom: 'bow',
};

export const HIT_SOUNDS: Record<Element, SoundCue> = {
  physical: 'hit',
  lightning: 'hitLightning',
  fire: 'hitFire',
  shadow: 'hitShadow',
};

export const BOSS_ATTACK_SOUNDS: Record<BossAttack['type'], SoundCue> = {
  slam: 'telegraph',
  boulder: 'rumble',
  charge: 'bellow',
  summon: 'summon',
  // Boss mechanics (spec: boss-encounter / signature mechanics) borrow fitting voices.
  sweep: 'whoosh',
  lash: 'whoosh',
  walls: 'rumble',
  devour: 'bellow',
};
