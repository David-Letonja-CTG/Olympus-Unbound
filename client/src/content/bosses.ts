import type { BossAttack, BossDefinition } from '../engine';

/**
 * Every realm's boss and its signature (spec: boss-encounter / signature mechanics): the Cyclops sweeps and rages,
 * Cerberus attacks with three heads, the Hydra's heads must be cut in order, Scylla's tentacles hold the strait, and
 * the Labyrinth's walls shift around Asterion.
 */

const slam = (id: string, windup: number, radius: number, damage: number): BossAttack => ({
  type: 'slam',
  id,
  windup,
  radius,
  damage,
});
const boulders = (
  id: string,
  windup: number,
  radius: number,
  damage: number,
  count: number,
  spread: number,
): BossAttack => ({ type: 'boulder', id, windup, radius, damage, count, spread });
const charge = (
  id: string,
  windup: number,
  length: number,
  width: number,
  damage: number,
  speed: number,
): BossAttack => ({ type: 'charge', id, windup, length, width, damage, speed });
const sweep = (
  id: string,
  windup: number,
  radius: number,
  arc: number,
  damage: number,
  count: number,
  gap: number,
): BossAttack => ({ type: 'sweep', id, windup, radius, arc, damage, count, gap });
const lash = (
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
const summon = (id: string, enemy: string, count: number): BossAttack => ({
  type: 'summon',
  id,
  enemy,
  count,
});

/** The Hydra's heads: cut in order (I, II, III; IV and V from her second phase), each grows back 14 s after it falls. */
const hydraHead = (order: number, angle: number, fromPhase = 0) => ({
  id: `head_${order}`,
  name: `Head ${['I', 'II', 'III', 'IV', 'V'][order - 1]}`,
  radius: 26,
  place: { from: 'boss' as const, angle, distance: 78 },
  attacks: [boulders('venom_spit', 1.1, 60, 18, 1, 0), lash('head_strike', 0.8, 340, 70, 22)],
  pause: 3.4 + order * 0.3,
  delay: 1.5 + order * 0.7,
  health: 1700,
  order,
  regrow: 14,
  fromPhase,
  visual: { sprite: 'swamp_serpent', color: 0x2e5a2e },
});

/** Scylla's tentacles: each holds a stretch of the strait and lashes at gods who come near; they grow back. */
const tentacle = (n: number, angle: number) => ({
  id: `tentacle_${n}`,
  name: 'A tentacle',
  radius: 28,
  place: { from: 'arena' as const, angle, distance: 300 },
  attacks: [lash('tentacle_lash', 0.9, 380, 80, 26)],
  pause: 3.2,
  delay: 2 + n * 0.8,
  health: 2200,
  regrow: 20,
  zone: { radius: 140, dps: 10, slow: 0.35 },
  visual: { sprite: 'swamp_serpent', color: 0x1e4a4c },
});

export const BOSSES: readonly BossDefinition[] = [
  {
    id: 'cyclops',
    name: 'The Cyclops',
    title: 'Forge-Giant of the Mountain',
    health: 12000,
    radius: 46,
    speed: 70,
    contactDamage: 30,
    xp: 0,
    gold: 200,
    attackPause: 1.4,
    phases: [
      {
        below: 1,
        speedMultiplier: 1,
        announcement: 'The Cyclops awakens!',
        attacks: [
          sweep('club_sweep', 1.0, 230, 1.7, 30, 2, 0.45),
          boulders('boulder_throw', 1.3, 75, 26, 3, 220),
          slam('ground_slam', 1.1, 170, 32),
        ],
      },
      {
        below: 0.5,
        speedMultiplier: 1.35,
        enraged: true,
        pauseMultiplier: 0.55,
        announcement: 'The Cyclops is enraged!',
        attacks: [
          sweep('club_sweep', 0.85, 250, 1.8, 34, 3, 0.35),
          charge('rampage_charge', 0.9, 620, 110, 38, 900),
          boulders('boulder_throw', 1.2, 75, 26, 5, 260),
          summon('call_the_legion', 'corrupted_hoplite', 4),
          slam('ground_slam', 1, 190, 36),
        ],
      },
    ],
    visual: { sprite: 'cyclops', color: 0x7a6352 },
  },
  {
    id: 'cerberus',
    name: 'Cerberus',
    title: 'Hound of Hades',
    health: 13000,
    radius: 50,
    speed: 82,
    contactDamage: 32,
    xp: 0,
    gold: 220,
    attackPause: 1.6,
    phases: [
      {
        below: 1,
        speedMultiplier: 1,
        announcement: 'Cerberus bares its three heads!',
        attacks: [charge('pounce', 0.8, 540, 104, 34, 1000), slam('triple_bite', 0.9, 160, 30)],
      },
      {
        below: 0.5,
        speedMultiplier: 1.3,
        pauseMultiplier: 0.7,
        announcement: 'Cerberus howls for the pack!',
        attacks: [
          summon('call_the_pack', 'orthrus', 3),
          charge('pounce', 0.75, 600, 110, 36, 1050),
          slam('triple_bite', 0.85, 190, 34),
        ],
      },
    ],
    // Three heads, each on its own rhythm: fire, bite, soul-fire.
    parts: [
      {
        id: 'fire_head',
        name: 'The fire head',
        radius: 20,
        place: { from: 'boss', angle: -0.6, distance: 44 },
        attacks: [sweep('hellfire_breath', 0.9, 260, 0.9, 26, 1, 0)],
        pause: 4.2,
        delay: 2.5,
        visual: { sprite: 'cerberus', color: 0xff6a2a },
      },
      {
        id: 'bite_head',
        name: 'The middle head',
        radius: 20,
        place: { from: 'boss', angle: 0, distance: 50 },
        attacks: [lash('lunging_bite', 0.7, 300, 80, 28)],
        pause: 3.4,
        delay: 1.5,
        visual: { sprite: 'cerberus', color: 0x8a2a2a },
      },
      {
        id: 'soul_head',
        name: 'The shadow head',
        radius: 20,
        place: { from: 'boss', angle: 0.6, distance: 44 },
        attacks: [boulders('soul_fire', 1.2, 70, 24, 4, 220)],
        pause: 5,
        delay: 3.5,
        visual: { sprite: 'cerberus', color: 0x8a5aff },
      },
    ],
    visual: { sprite: 'cerberus', color: 0x1e1818 },
  },
  {
    id: 'hydra',
    name: 'The Hydra',
    title: 'Many-Headed Serpent of Lerna',
    health: 15000,
    radius: 52,
    speed: 46,
    contactDamage: 30,
    xp: 0,
    gold: 240,
    attackPause: 1.6,
    phases: [
      {
        below: 1,
        speedMultiplier: 1,
        announcement: 'The Hydra rises from the marsh! Cut her heads in order!',
        attacks: [slam('many_heads', 1, 170, 30), summon('brood', 'swamp_serpent', 4)],
      },
      {
        below: 0.5,
        speedMultiplier: 1.2,
        pauseMultiplier: 0.8,
        announcement: 'Cut one head and two grow back!',
        attacks: [
          summon('brood', 'swamp_serpent', 5),
          boulders('venom_rain', 1.1, 72, 24, 7, 280),
          slam('many_heads', 0.9, 200, 34),
        ],
      },
    ],
    parts: [
      hydraHead(1, -1.1),
      hydraHead(2, 0),
      hydraHead(3, 1.1),
      hydraHead(4, -2.2, 1),
      hydraHead(5, 2.2, 1),
    ],
    // Only a tenth of the damage while a head lives; exposed with every head down.
    guard: 0.1,
    exposed: { seconds: 8, damageTaken: 1.6 },
    visual: { sprite: 'hydra', color: 0x1e3220 },
  },
  {
    id: 'scylla',
    name: 'Scylla',
    title: 'Terror of the Strait',
    health: 16000,
    radius: 54,
    speed: 60,
    contactDamage: 32,
    xp: 0,
    gold: 260,
    attackPause: 1.3,
    phases: [
      {
        below: 1,
        speedMultiplier: 1,
        announcement: 'Scylla rises from the strait! Her tentacles hold the shore!',
        attacks: [slam('six_hounds', 1, 180, 32), boulders('charybdis', 1.3, 80, 24, 4, 260)],
      },
      {
        below: 0.5,
        speedMultiplier: 1.3,
        pauseMultiplier: 0.8,
        announcement: 'The drowned answer Scylla’s call!',
        attacks: [
          summon('the_drowned_rise', 'drowned_sailor', 5),
          boulders('charybdis', 1.2, 82, 26, 7, 300),
          sweep('six_hounds_sweep', 1, 240, 2.2, 32, 2, 0.4),
          slam('six_hounds', 0.9, 210, 36),
        ],
      },
    ],
    parts: [
      tentacle(1, Math.PI / 4),
      tentacle(2, (3 * Math.PI) / 4),
      tentacle(3, (5 * Math.PI) / 4),
      tentacle(4, (7 * Math.PI) / 4),
    ],
    // Half damage while a tentacle lives; she holds her strait.
    guard: 0.5,
    anchored: 200,
    visual: { sprite: 'scylla', color: 0x1e3a3c },
  },
  {
    id: 'asterion',
    name: 'Asterion',
    title: 'King of the Labyrinth',
    health: 18000,
    radius: 50,
    speed: 66,
    contactDamage: 34,
    xp: 0,
    gold: 280,
    attackPause: 1.1,
    // Run him into a wall: dazed, he takes extra damage.
    chargeStun: 2.5,
    phases: [
      {
        below: 1,
        speedMultiplier: 1,
        announcement: 'Asterion charges from the heart of the Labyrinth! Lure him into the walls!',
        attacks: [
          {
            type: 'walls',
            id: 'the_maze_shifts',
            windup: 1.4,
            duration: 11,
            damage: 24,
            rings: [180, 300],
            segments: 3,
            gapShare: 0.35,
          },
          charge('bull_rush', 0.9, 620, 120, 38, 1050),
          slam('labrys_sweep', 1, 190, 34),
          charge('bull_rush', 0.9, 620, 120, 38, 1050),
          boulders('falling_stones', 1.3, 76, 26, 5, 280),
        ],
      },
      {
        below: 0.6,
        speedMultiplier: 1.2,
        announcement: 'The Labyrinth answers its king!',
        attacks: [
          {
            type: 'walls',
            id: 'the_maze_shifts',
            windup: 1.2,
            duration: 9,
            damage: 26,
            rings: [160, 260, 360],
            segments: 4,
            gapShare: 0.3,
          },
          summon('the_maze_answers', 'minotaur', 3),
          charge('bull_rush', 0.8, 660, 126, 40, 1100),
          boulders('falling_stones', 1.2, 78, 28, 7, 320),
          charge('bull_rush', 0.8, 660, 126, 40, 1100),
          slam('labrys_sweep', 0.9, 210, 36),
        ],
      },
      {
        below: 0.25,
        speedMultiplier: 1.45,
        enraged: true,
        pauseMultiplier: 0.75,
        announcement: 'Asterion goes berserk!',
        attacks: [
          {
            type: 'walls',
            id: 'the_maze_shifts',
            windup: 1,
            duration: 7,
            damage: 28,
            rings: [170, 290],
            segments: 5,
            gapShare: 0.3,
          },
          charge('bull_rush', 0.7, 700, 130, 42, 1150),
          slam('labrys_sweep', 0.8, 230, 38),
          charge('bull_rush', 0.7, 700, 130, 42, 1150),
          boulders('falling_stones', 1.1, 80, 30, 9, 360),
        ],
      },
    ],
    visual: { sprite: 'asterion', color: 0x5a3a26 },
  },
];
