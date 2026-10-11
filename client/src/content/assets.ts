import type { AssetManifest } from '../engine';

/**
 * External art (D12). Files live under `client/public/assets/<pack>/`; every file needs an entry here with its
 * licence (checked by `npm run assets:check`). Sprite keys not listed in `sprites` use the code-drawn art.
 *
 * Example entry for a pack (atlas with animations):
 *
 *   files: [{
 *     id: 'undead', type: 'atlas', url: 'assets/undead/undead.png', data: 'assets/undead/undead.json',
 *     licence: { name: 'CC-BY-3.0', author: 'Artist Name', title: 'Undead pack', source: 'https://…' },
 *   }],
 *   sprites: {
 *     corrupted_hoplite: {
 *       file: 'undead', frame: 'skeleton_idle_0', scale: 0.5, originY: 0.85,
 *       animations: { walk: { frames: ['skeleton_walk_0', 'skeleton_walk_1', …], fps: 10, repeat: true } },
 *     },
 *   },
 */
export const ASSETS: AssetManifest = {
  files: [],
  sprites: {},
};
