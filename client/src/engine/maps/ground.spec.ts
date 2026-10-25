import { CONTENT } from '../testing/content';
import { MapGenConfig } from '../data/types';
import { generateArena } from './generate-arena';
import { GROUND_SCALE, GroundPainter } from './ground';

/** FNV-1a over the bytes: comparing 4 million values with toEqual is far too slow. */
function checksum(data: Uint8ClampedArray): string {
  let h = 0x811c9dc5;
  for (const byte of data) h = Math.imul(h ^ byte, 0x01000193);
  return `${data.length}:${h >>> 0}`;
}

const olympus = CONTENT.realms.find((r) => r.id === 'mount_olympus')?.map as MapGenConfig;

describe('painted ground (spec: visual-atmosphere / painted ground)', () => {
  const arena = generateArena(olympus, 847291);

  it('paints the same arena identically, in any slicing', () => {
    const a = new GroundPainter(arena, olympus, GROUND_SCALE.low);
    const whole = a.paintRows(0, a.height);
    const b = new GroundPainter(arena, olympus, GROUND_SCALE.low);
    const sliced = new Uint8ClampedArray(whole.length);
    for (let row = 0; row < b.height; row += 37)
      sliced.set(b.paintRows(row, row + 37), row * b.width * 4);
    expect(checksum(sliced)).toBe(checksum(whole));
  });

  it('paints at a lower resolution at low quality', () => {
    const low = new GroundPainter(arena, olympus, GROUND_SCALE.low);
    const high = new GroundPainter(arena, olympus, GROUND_SCALE.high);
    expect(low.width).toBeLessThan(high.width);
    expect(high.width).toBe(Math.ceil(arena.width * GROUND_SCALE.high));
  });

  it('turns dark beyond the cliff edge', () => {
    const p = new GroundPainter(arena, olympus, GROUND_SCALE.low);
    const row = p.paintRows(Math.floor(p.height / 2), Math.floor(p.height / 2) + 1);
    const brightness = (x: number) => row[x * 4] + row[x * 4 + 1] + row[x * 4 + 2];
    expect(brightness(2)).toBeLessThan(brightness(Math.floor(p.width / 2)));
  });
});

describe('ground patterns (spec: visual-atmosphere / painted ground)', () => {
  /** A one-band ground of a single terrain, with or without a pattern. */
  const flat = (texture?: { kind: 'slabs' | 'ripples' }): MapGenConfig => ({
    ...olympus,
    terrain: {
      ...olympus.terrain,
      types: [...olympus.terrain.types, { id: 'test_floor', color: 0x808080, texture }],
      bands: [{ below: 1.01, terrain: 'test_floor' }],
    },
  });
  const spread = (texture?: { kind: 'slabs' | 'ripples' }) => {
    const map = flat(texture);
    const p = new GroundPainter(generateArena(map, 5), map, GROUND_SCALE.low);
    const mid = Math.floor(p.height / 2);
    const row = p.paintRows(mid, mid + 1);
    const values: number[] = [];
    for (let x = Math.floor(p.width / 3); x < Math.floor((2 * p.width) / 3); x++)
      values.push(row[x * 4]);
    return Math.max(...values) - Math.min(...values);
  };

  it('a slab floor has dark grout lines a plain floor does not', () => {
    expect(spread({ kind: 'slabs' })).toBeGreaterThan(spread() + 15);
  });

  it('sand ripples vary the light across the ground', () => {
    expect(spread({ kind: 'ripples' })).toBeGreaterThan(spread());
  });
});
