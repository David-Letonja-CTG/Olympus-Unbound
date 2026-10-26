import type {
  AchievementDefinition,
  BossAttack,
  BossDefinition,
  EnemyDefinition,
  EventDefinition,
  EventRewardDefinition,
  Modifier,
  RealmDefinition,
  RelicDefinition,
  SpawnEvent,
  SpawnPhase,
  WeaponDefinition,
} from '../../engine';

/**
 * One seasonal event in one place (spec: seasonal-events): its definition, realm, host, boss, items, shop and
 * achievements. `content/index.ts` merges the packs into the content lists.
 */
export interface EventPack {
  readonly event: EventDefinition;
  readonly realm: RealmDefinition;
  readonly boss: BossDefinition;
  readonly enemies: readonly EnemyDefinition[];
  readonly weapons: readonly WeaponDefinition[];
  readonly relics: readonly RelicDefinition[];
  readonly rewards: readonly EventRewardDefinition[];
  readonly achievements: readonly AchievementDefinition[];
}

// ---------------------------------------------------------------------------------------------------------------
// Boss attacks (spec: boss-encounter), shared with the realms' bosses.

export const slam = (id: string, windup: number, radius: number, damage: number): BossAttack => ({
  type: 'slam',
  id,
  windup,
  radius,
  damage,
});
export const boulders = (
  id: string,
  windup: number,
  radius: number,
  damage: number,
  count: number,
  spread: number,
): BossAttack => ({ type: 'boulder', id, windup, radius, damage, count, spread });
export const charge = (
  id: string,
  windup: number,
  length: number,
  width: number,
  damage: number,
  speed: number,
): BossAttack => ({ type: 'charge', id, windup, length, width, damage, speed });
export const sweep = (
  id: string,
  windup: number,
  radius: number,
  arc: number,
  damage: number,
  count: number,
  gap: number,
): BossAttack => ({ type: 'sweep', id, windup, radius, arc, damage, count, gap });
export const lash = (
  id: string,
  windup: number,
  length: number,
  width: number,
  damage: number,
): BossAttack => ({
  type: 'lash',
  id,
  windup,
  length,
  width,
  damage,
});
export const devour = (
  id: string,
  windup: number,
  pullRadius: number,
  pullSpeed: number,
  radius: number,
  damage: number,
): BossAttack => ({ type: 'devour', id, windup, pullRadius, pullSpeed, radius, damage });
export const summon = (id: string, enemy: string, count: number): BossAttack => ({
  type: 'summon',
  id,
  enemy,
  count,
});
export const walls = (
  id: string,
  windup: number,
  duration: number,
  damage: number,
  rings: readonly number[],
  segments: number,
  gapShare: number,
): BossAttack => ({ type: 'walls', id, windup, duration, damage, rings, segments, gapShare });

// ---------------------------------------------------------------------------------------------------------------
// Event realms

/** The frame every event realm shares: a 64-tile square, the boss arena far from the spawn, roads to the ruins. */
export const MAP_FRAME = {
  widthTiles: 64,
  heightTiles: 64,
  tileSize: 64,
  borderTiles: 3,
  spawnClearRadius: 260,
  bossArena: { radius: 320, minDistanceFromSpawn: 1300 },
  minObstacleGap: 46,
  maxObstacles: 260,
  roads: { width: 64, wander: 90 },
} as const;

/** An event's host by role: the many, the quick, the ones that shoot and the heavy. */
export interface Host {
  readonly fodder: string;
  readonly quick: string;
  readonly ranged: string;
  readonly heavy: string;
}

/**
 * The spawn timeline, hordes and elites of an event realm, the Night of Hecate's tuned numbers for any host of four:
 * the many alone at first, the quick from 40 s, the ranged from 90 s, the heavy from 150 s, the boss at 7 minutes.
 */
export function hostRealm(
  host: Host,
  boss: string,
): Pick<RealmDefinition, 'timeline' | 'events' | 'scaling' | 'elite' | 'boss' | 'rewards'> {
  const { fodder, quick, ranged, heavy } = host;
  const mix = (f: number, q: number, r: number, h: number) =>
    [
      { id: fodder, weight: f },
      { id: quick, weight: q },
      { id: ranged, weight: r },
      { id: heavy, weight: h },
    ].filter((e) => e.weight > 0);
  const timeline: SpawnPhase[] = [
    { from: 0, rate: 1.4, maxAlive: 45, enemies: mix(1, 0, 0, 0) },
    {
      from: 40,
      rate: 2,
      maxAlive: 75,
      enemies: mix(3, 1, 0, 0),
      groups: [{ id: fodder, size: [6, 10], every: 18 }],
    },
    {
      from: 90,
      rate: 2.6,
      maxAlive: 105,
      enemies: mix(3, 1.5, 1, 0),
      groups: [{ id: fodder, size: [8, 12], every: 16 }],
    },
    { from: 150, rate: 3.1, maxAlive: 140, enemies: mix(2.5, 2, 1.5, 0.8) },
    {
      from: 210,
      rate: 3.7,
      maxAlive: 175,
      enemies: mix(2, 2, 2, 1.2),
      groups: [{ id: fodder, size: [10, 14], every: 15 }],
    },
    { from: 270, rate: 4.3, maxAlive: 215, enemies: mix(2, 2, 2, 1.6) },
    { from: 330, rate: 5, maxAlive: 255, enemies: mix(1.5, 2, 2, 2) },
    { from: 390, rate: 5.6, maxAlive: 290, enemies: mix(1.5, 2, 2, 2) },
  ];
  const events: SpawnEvent[] = [
    { at: 60, type: 'horde', enemy: fodder, count: 34 },
    { at: 120, type: 'elite', enemy: quick },
    { at: 180, type: 'horde', enemy: quick, count: 18 },
    { at: 240, type: 'elite', enemy: heavy },
    { at: 300, type: 'horde', enemy: fodder, count: 44 },
    { at: 330, type: 'elite', enemy: ranged },
    { at: 375, type: 'elite', enemy: heavy },
  ];
  return {
    timeline,
    events,
    scaling: { healthPerMinute: 0.12, damagePerMinute: 0.05, max: 2.2 },
    elite: { health: 12, damage: 1.6, size: 1.5, gold: 15, xp: 10 },
    boss: { id: boss, at: 420, spawnRateMultiplier: 0.45 },
    rewards: { bossGold: 400 },
  };
}

/** The two achievements every event has (spec: seasonal-events): clear its realm, and last 10 minutes from it. */
export function eventAchievements(
  realm: string,
  clear: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly sprite: string;
  },
  last: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly sprite: string;
  },
): AchievementDefinition[] {
  return [
    { ...clear, goal: { measure: 'realmsCleared', target: 1, over: 'run', realm }, gold: 400 },
    { ...last, goal: { measure: 'timeSeconds', target: 600, over: 'run', realm }, gold: 250 },
  ];
}

/**
 * An event's shop (spec: seasonal-events / event shop): a blessing for every run (40), then its relic (60) and its
 * weapon (80), offered in every run all year.
 */
export function eventShop(
  event: string,
  blessing: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly modifiers: readonly Modifier[];
    readonly sprite: string;
  },
  relic: { readonly id: string; readonly name: string; readonly item: RelicDefinition },
  weapon: { readonly id: string; readonly name: string; readonly item: WeaponDefinition },
): EventRewardDefinition[] {
  const unlock = (
    r: {
      readonly id: string;
      readonly name: string;
      readonly item: RelicDefinition | WeaponDefinition;
    },
    cost: number,
  ): EventRewardDefinition => ({
    id: r.id,
    event,
    name: r.name,
    description: `${r.item.name} may be offered in every run, all year.`,
    cost,
    effect: { type: 'unlock', item: r.item.id },
    sprite: r.item.visual.sprite,
  });
  const { modifiers, ...rest } = blessing;
  return [
    { ...rest, event, cost: 40, effect: { type: 'modifiers', modifiers } },
    unlock(relic, 60),
    unlock(weapon, 80),
  ];
}
