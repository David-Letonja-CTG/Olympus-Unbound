import { CONTENT } from '../testing/content';
import { SPRITES } from './sprites';

describe('sprites (spec: asset-pipeline)', () => {
  it('draws every sprite the content names, from a sheet or code', () => {
    const keys = new Set<string>();
    const visual = (v: { sprite: string; projectile?: string } | undefined) => {
      if (!v) return;
      keys.add(v.sprite);
      if (v.projectile) keys.add(v.projectile);
    };
    for (const e of CONTENT.enemies) {
      visual(e.visual);
      if (e.behavior.type === 'ranged' && e.behavior.projectileSprite)
        keys.add(e.behavior.projectileSprite);
    }
    for (const b of CONTENT.bosses) {
      visual(b.visual);
      for (const p of b.parts ?? []) visual(p.visual);
    }
    for (const item of [...CONTENT.weapons, ...CONTENT.relics, ...CONTENT.armour])
      visual(item.visual);
    for (const realm of CONTENT.realms) {
      const map = realm.map;
      for (const o of map.obstacles) visual(o.visual);
      for (const d of map.decorations) visual(d.visual);
      for (const p of map.props?.kinds ?? []) visual(p.visual);
      for (const f of map.features ?? []) {
        if ('visual' in f) visual(f.visual);
        if (f.type === 'brazier') visual(f.lit);
      }
      const ambience = realm.atmosphere.ambience;
      if (ambience?.weather?.sprite) keys.add(ambience.weather.sprite);
      if (ambience?.wildlife) keys.add(ambience.wildlife.sprite);
    }
    for (const e of CONTENT.events) keys.add(e.currency.sprite);
    for (const r of CONTENT.eventRewards) keys.add(r.sprite);
    for (const a of CONTENT.achievements) keys.add(a.sprite);

    const missing = [...keys].filter((k) => !SPRITES[k] && !CONTENT.assets.sprites[k]);
    expect(missing).toEqual([]);
  });
});
