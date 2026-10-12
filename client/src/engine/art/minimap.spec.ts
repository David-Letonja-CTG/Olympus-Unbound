import { WorldFrame } from '../sim/world-frame';
import { minimapMarks, minimapScale } from './minimap';

const player = (id: number, x: number, alive = true, left = false) => ({
  id,
  x,
  y: 100,
  alive,
  left,
});
const enemy = (id: number, x: number, extra: object = {}) => ({
  id,
  x,
  y: 50,
  dead: false,
  elite: false,
  ...extra,
});

function frame(parts: Partial<Record<keyof WorldFrame, unknown>>): WorldFrame {
  return {
    players: [],
    enemies: [],
    boss: undefined,
    gate: undefined,
    ...parts,
  } as unknown as WorldFrame;
}

describe('minimap marks (spec: hud / minimap)', () => {
  it('marks enemies, elites, the boss and the gate', () => {
    const marks = minimapMarks(
      frame({
        enemies: [
          enemy(1, 10),
          enemy(2, 20, { elite: true }),
          enemy(3, 30, { dead: true }),
          enemy(4, 40, { boss: {} }),
        ],
        boss: { x: 40, y: 50, dead: false },
        gate: { x: 70, y: 70, radius: 70, standing: 0 },
      }),
      0,
    );
    expect(marks.map((m) => m.kind)).toEqual(['enemy', 'elite', 'gate', 'boss']);
  });

  it('marks every god in their seat, the local one last, the fallen hollow and the departed not at all', () => {
    const marks = minimapMarks(
      frame({
        players: [player(7, 1), player(8, 2, false), player(9, 3), player(10, 4, true, true)],
      }),
      9,
    );
    expect(marks).toEqual([
      { kind: 'fallen', x: 2, y: 100, seat: 1 },
      { kind: 'player', x: 1, y: 100, seat: 0 },
      { kind: 'self', x: 3, y: 100, seat: 2 },
    ]);
  });

  it('fits the whole arena in the minimap, centred', () => {
    expect(minimapScale({ width: 4096, height: 4096 }, 172)).toEqual({
      k: 172 / 4096,
      ox: 0,
      oy: 0,
    });
    const wide = minimapScale({ width: 4000, height: 2000 }, 200);
    expect(wide.k).toBe(0.05);
    expect(wide.oy).toBe(50);
  });
});
