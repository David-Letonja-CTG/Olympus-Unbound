import { computeStats } from '../core/stats';
import { createWeapon, evaluateSynergies, refreshPlayer } from '../progression/loadout';
import { useAbility } from '../weapons/weapon-system';
import { zoneSlow } from '../bosses/parts';
import { stepMovement } from './movement';
import { RunState } from './run-state';
import { NO_INPUT, Player, PlayerInput } from './types';

export { DEAD_ZONE, normaliseMove } from './movement';

export function createPlayer(state: RunState, slot: number, x: number, y: number): Player {
  const seat = state.party[slot] ?? state.party[0];
  const god = state.index.god(seat.godId);
  const stats = computeStats(god.baseStats, []);
  const player: Player = {
    id: state.id(),
    slot,
    god,
    name: seat.name,
    bot: seat.bot?.skill,
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
    loadout: {
      weapons: [],
      relics: [],
      skills: new Map(),
      synergies: [],
      fusions: new Map(),
      ascensions: new Map(),
    },
    stamina: state.balance.stamina.max,
    staminaRest: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashX: 1,
    dashY: 0,
    surge: 0,
    dodged: false,
    boons: [],
  };
  player.loadout.weapons.push(createWeapon(state.index.weapon(god.startingWeapon), stats));
  refreshPlayer(state, player);
  player.health = player.stats.maxHealth;
  evaluateSynergies(state, player);
  return player;
}

export function updatePlayers(state: RunState, inputs: readonly PlayerInput[], dt: number): void {
  for (const player of state.players) {
    player.px = player.x;
    player.py = player.y;
    if (!player.alive) continue;
    // A slot without input stands still; it never copies another player's (D16).
    const input = inputs[player.slot] ?? NO_INPUT;
    const rules = state.balance.stamina;
    const x = player.x;
    const y = player.y;
    if (player.surge > 0) player.surge = Math.max(0, player.surge - dt);
    const speed = player.stats.moveSpeed * zoneSlow(state, player);
    if (stepMovement(player, input, speed, rules, state.collision, dt)) {
      player.dodged = false;
      // Untouchable for the dash (spec: player-control / dash through an attack); the one damage check is unchanged.
      player.invulnerable = Math.max(player.invulnerable, rules.dashDuration + rules.dashGrace);
      state.emit({ type: 'dash', playerId: player.id, x, y, dx: player.dashX, dy: player.dashY });
    }
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.hurtFlash > 0) player.hurtFlash -= dt;
    if (player.abilityTimer > 0) player.abilityTimer = Math.max(0, player.abilityTimer - dt);
    if (player.stats.regen > 0)
      player.health = Math.min(player.stats.maxHealth, player.health + player.stats.regen * dt);
    if (input?.ability) useAbility(state, player);
  }
}
