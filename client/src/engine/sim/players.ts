import { computeStats } from '../core/stats';
import { clampLength } from '../core/vector';
import { createWeapon, evaluateSynergies, refreshPlayer } from '../progression/loadout';
import { useAbility } from '../weapons/weapon-system';
import { RunState } from './run-state';
import { NO_INPUT, Player, PlayerInput } from './types';

/** Stick input shorter than this is ignored (spec: player-control / movement input). */
export const DEAD_ZONE = 0.2;

export function createPlayer(state: RunState, slot: number, x: number, y: number): Player {
  const seat = state.party[slot] ?? state.party[0];
  const god = state.index.god(seat.godId);
  const stats = computeStats(god.baseStats, []);
  const player: Player = {
    id: state.id(),
    slot,
    god,
    name: seat.name,
    x,
    y,
    px: x,
    py: y,
    radius: state.balance.player.radius,
    health: 0,
    stats,
    facingX: 1,
    facingY: 0,
    moving: false,
    invulnerable: 1,
    hurtFlash: 0,
    alive: true,
    revive: 0,
    revivalsUsed: 0,
    abilityTimer: 0,
    ability: createWeapon(god.ability, stats),
    loadout: { weapons: [], relics: [], skills: new Map(), synergies: [] },
  };
  player.loadout.weapons.push(createWeapon(state.index.weapon(god.startingWeapon), stats));
  refreshPlayer(state, player);
  player.health = player.stats.maxHealth;
  evaluateSynergies(state, player);
  return player;
}

/** Normalises raw input: dead zone, and diagonal movement no faster than straight movement. */
export function normaliseMove(input: PlayerInput): { x: number; y: number } {
  const length = Math.hypot(input.moveX, input.moveY);
  if (length < DEAD_ZONE) return { x: 0, y: 0 };
  return clampLength(input.moveX, input.moveY, 1);
}

export function updatePlayers(state: RunState, inputs: readonly PlayerInput[], dt: number): void {
  for (const player of state.players) {
    player.px = player.x;
    player.py = player.y;
    if (!player.alive) continue;
    // A slot without input stands still; it never copies another player's (D16).
    const input = inputs[player.slot] ?? NO_INPUT;
    const move = input ? normaliseMove(input) : { x: 0, y: 0 };
    player.moving = move.x !== 0 || move.y !== 0;
    if (player.moving) {
      const length = Math.hypot(move.x, move.y);
      player.facingX = move.x / length;
      player.facingY = move.y / length;
      player.x += move.x * player.stats.moveSpeed * dt;
      player.y += move.y * player.stats.moveSpeed * dt;
      state.collision.resolve(player);
    }
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.hurtFlash > 0) player.hurtFlash -= dt;
    if (player.abilityTimer > 0) player.abilityTimer = Math.max(0, player.abilityTimer - dt);
    if (player.stats.regen > 0)
      player.health = Math.min(player.stats.maxHealth, player.health + player.stats.regen * dt);
    if (input?.ability) useAbility(state, player);
  }
}
