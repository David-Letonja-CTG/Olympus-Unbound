import { CONTENT } from '../testing/content';
import { ATTACK_SOUNDS, HIT_SOUNDS } from './sound-map';
import { CUES, placement, SoundPlayer } from './sound-player';

describe('sound cues (spec: hud / sound feedback)', () => {
  it('gives every weapon and every god’s ability its own sound', () => {
    const weapons = CONTENT.weapons.map((w) => w.id);
    const abilities = CONTENT.gods.map((g) => g.ability.id);
    for (const id of [...weapons, ...abilities]) expect(ATTACK_SOUNDS[id], id).toBeDefined();
    const weaponCues = weapons.map((id) => ATTACK_SOUNDS[id]);
    expect(new Set(weaponCues).size).toBe(weaponCues.length);
  });

  it('sounds a hit by its element', () => {
    expect(new Set(Object.values(HIT_SOUNDS)).size).toBe(4);
  });

  it('has voices for every cue', () => {
    for (const [cue, def] of Object.entries(CUES)) {
      expect(def.voices.length, cue).toBeGreaterThan(0);
      for (const v of def.voices) {
        expect(v.duration, cue).toBeGreaterThan(0);
        expect(v.gain, cue).toBeLessThanOrEqual(0.4);
      }
    }
  });
});

describe('placement', () => {
  const listener = { x: 1000, y: 1000, halfWidth: 500 };

  it('pans a sound at the right edge of the view to the right, and keeps it loud', () => {
    const right = placement(1500, 1000, listener);
    expect(right.pan).toBeGreaterThan(0.5);
    expect(right.gain).toBe(1);
    expect(placement(500, 1000, listener).pan).toBeLessThan(-0.5);
    expect(placement(1000, 1000, listener).pan).toBe(0);
  });

  it('fades sounds outside the view and silences them far away', () => {
    expect(placement(2000, 1000, listener).gain).toBeLessThan(1);
    expect(placement(2000, 1000, listener).gain).toBeGreaterThan(0);
    expect(placement(4000, 1000, listener).gain).toBe(0);
  });

  it('stays silent without audio (tests, old browsers)', () => {
    const player = new SoundPlayer(1);
    expect(() => player.play('hit', { x: 0, y: 0 })).not.toThrow();
    player.destroy();
  });
});
