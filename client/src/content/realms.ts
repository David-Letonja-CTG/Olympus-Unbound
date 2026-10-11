import type { RealmDefinition } from '../engine';

/**
 * Mount Olympus: marble ruins on grassy slopes ringed by cliffs. Times are in seconds; the boss arrives at 07:00.
 */
export const MOUNT_OLYMPUS: RealmDefinition = {
  id: 'mount_olympus',
  name: 'Mount Olympus',
  description:
    'Sacred slopes of marble ruins and olive groves, overrun by corrupted servants of the old gods.',
  backgroundColor: 0x16141c,
  // Moonlit night: cold ambient light, pale fog, embers drifting from the burning temples.
  atmosphere: { ambient: 0x5a6282, fog: 0x8a93ad, particles: 0xff9a4a },
  map: {
    widthTiles: 64,
    heightTiles: 64,
    tileSize: 64,
    borderTiles: 3,
    terrain: {
      types: [
        { id: 'grass', color: 0x46573a },
        { id: 'meadow', color: 0x58613f },
        { id: 'earth', color: 0x625142 },
        { id: 'marble', color: 0xaea697 },
        { id: 'cliff', color: 0x26232d },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.32, terrain: 'earth' },
        { below: 0.66, terrain: 'grass' },
        { below: 1.01, terrain: 'meadow' },
      ],
      plaza: 'marble',
      border: 'cliff',
    },
    spawnClearRadius: 260,
    bossArena: { radius: 300, minDistanceFromSpawn: 1300 },
    minObstacleGap: 46,
    maxObstacles: 260,
    obstacles: [
      { id: 'column', radius: 16, visual: { sprite: 'column', color: 0xe8e2d4 } },
      { id: 'broken_column', radius: 18, visual: { sprite: 'broken_column', color: 0xd8d0bf } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xdcd6c8 } },
      { id: 'olive_tree', radius: 24, visual: { sprite: 'olive_tree', color: 0x6b8e3d } },
      { id: 'rock', radius: 18, visual: { sprite: 'rock', color: 0x8a8580 } },
      {
        id: 'brazier',
        radius: 14,
        visual: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 260, color: 0xff9a4a, intensity: 0.95, flicker: 0.3 },
      },
    ],
    pointsOfInterest: [
      {
        type: 'ring',
        kind: 'column',
        count: [3, 5],
        radius: [130, 190],
        pieces: 10,
        missingChance: 0.3,
        plazaTerrain: 'marble',
      },
      { type: 'cluster', kind: 'olive_tree', count: [5, 8], size: [4, 7], spread: 170 },
      // After the rings: their plazas get braziers too.
      { type: 'plazaLights', kind: 'brazier', count: 4, offset: 18 },
    ],
    scatter: [
      { kind: 'statue', density: 0.9 },
      { kind: 'rock', density: 6 },
      { kind: 'olive_tree', density: 5, terrain: ['grass', 'meadow'] },
      { kind: 'broken_column', density: 3, terrain: ['earth', 'marble'] },
    ],
    decorations: [
      {
        id: 'grass_tuft',
        terrain: ['grass', 'meadow'],
        density: 120,
        visual: { sprite: 'grass_tuft', color: 0x5f8a3e },
      },
      {
        id: 'flowers',
        terrain: ['meadow'],
        density: 70,
        visual: { sprite: 'flowers', color: 0xcfc7a0 },
      },
      {
        id: 'pebbles',
        terrain: ['earth'],
        density: 60,
        visual: { sprite: 'pebbles', color: 0x9c8a73 },
      },
      {
        id: 'marble_shards',
        terrain: ['marble'],
        density: 90,
        visual: { sprite: 'marble_shards', color: 0xeae4d6 },
      },
    ],
  },
  timeline: [
    { from: 0, rate: 1.2, maxAlive: 40, enemies: [{ id: 'satyr', weight: 1 }] },
    {
      from: 40,
      rate: 1.8,
      maxAlive: 70,
      enemies: [
        { id: 'satyr', weight: 3 },
        { id: 'harpy', weight: 2 },
      ],
      groups: [{ id: 'stymphalian_bird', size: [5, 8], every: 20 }],
    },
    {
      from: 90,
      rate: 2.4,
      maxAlive: 100,
      enemies: [
        { id: 'satyr', weight: 2 },
        { id: 'harpy', weight: 2 },
        { id: 'corrupted_hoplite', weight: 1 },
      ],
      groups: [{ id: 'stymphalian_bird', size: [6, 10], every: 15 }],
    },
    {
      from: 150,
      rate: 3,
      maxAlive: 140,
      enemies: [
        { id: 'satyr', weight: 2 },
        { id: 'harpy', weight: 2 },
        { id: 'corrupted_hoplite', weight: 2 },
        { id: 'centaur_archer', weight: 1.5 },
      ],
      groups: [{ id: 'stymphalian_bird', size: [6, 10], every: 14 }],
    },
    {
      from: 210,
      rate: 3.6,
      maxAlive: 170,
      enemies: [
        { id: 'satyr', weight: 1 },
        { id: 'harpy', weight: 2 },
        { id: 'corrupted_hoplite', weight: 2 },
        { id: 'centaur_archer', weight: 2 },
        { id: 'bronze_bull', weight: 1 },
      ],
    },
    {
      from: 270,
      rate: 4.2,
      maxAlive: 210,
      enemies: [
        { id: 'harpy', weight: 2 },
        { id: 'corrupted_hoplite', weight: 2 },
        { id: 'centaur_archer', weight: 2 },
        { id: 'bronze_bull', weight: 1.5 },
        { id: 'fallen_oracle', weight: 0.8 },
      ],
      groups: [{ id: 'stymphalian_bird', size: [8, 12], every: 12 }],
    },
    {
      from: 330,
      rate: 5,
      maxAlive: 250,
      enemies: [
        { id: 'harpy', weight: 2 },
        { id: 'corrupted_hoplite', weight: 2 },
        { id: 'centaur_archer', weight: 2 },
        { id: 'bronze_bull', weight: 2 },
        { id: 'fallen_oracle', weight: 1 },
        { id: 'marble_sentinel', weight: 0.6 },
      ],
    },
    {
      from: 390,
      rate: 5.6,
      maxAlive: 290,
      enemies: [
        { id: 'harpy', weight: 2 },
        { id: 'corrupted_hoplite', weight: 2 },
        { id: 'centaur_archer', weight: 2 },
        { id: 'bronze_bull', weight: 2 },
        { id: 'fallen_oracle', weight: 1 },
        { id: 'marble_sentinel', weight: 1.2 },
      ],
    },
  ],
  events: [
    { at: 60, type: 'horde', enemy: 'satyr', count: 24 },
    { at: 120, type: 'elite', enemy: 'corrupted_hoplite' },
    { at: 180, type: 'horde', enemy: 'harpy', count: 30 },
    { at: 240, type: 'elite', enemy: 'bronze_bull' },
    { at: 300, type: 'horde', enemy: 'corrupted_hoplite', count: 18 },
    { at: 330, type: 'elite', enemy: 'centaur_archer' },
    { at: 375, type: 'elite', enemy: 'marble_sentinel' },
  ],
  scaling: { healthPerMinute: 0.12, damagePerMinute: 0.05, max: 2.2 },
  elite: { health: 12, damage: 1.6, size: 1.5, gold: 15, xp: 10 },
  boss: { id: 'cyclops', at: 420, spawnRateMultiplier: 0.45 },
  rewards: { victoryGold: 250 },
};

export const REALMS: readonly RealmDefinition[] = [MOUNT_OLYMPUS];
