import { killEnemy } from '../combat/damage';
import { ContentIndex } from '../data/content-index';
import { GameContent } from '../data/types';
import { updateEnemies } from '../enemies/enemy-system';
import { updateHazards } from '../bosses/boss';
import { ArenaData, generateArena } from '../maps/generate-arena';
import { applyOffer } from '../progression/loadout';
import { generateOffers } from '../progression/offers';
import { SpawnDirector } from '../spawning/director';
import {
  updateHostileProjectiles,
  updateProjectiles,
  updateWeapons,
} from '../weapons/weapon-system';
import { updatePickups } from './pickups';
import { createPlayer, updatePlayers } from './players';
import { RunConfig, RunState } from './run-state';
import {
  HudSnapshot,
  HudItem,
  PlayerInput,
  RunOutcome,
  RunPhase,
  RunResult,
  SimEvent,
  UpgradeChoice,
} from './types';

export { STEP } from './run-state';

/** Development and test shortcuts; only reachable when a session is created with `debug: true`. */
export type DebugAction =
  | { type: 'grantXp'; amount: number }
  | { type: 'skipTo'; seconds: number }
  | { type: 'damageBoss'; fraction: number }
  | { type: 'killPlayer' }
  | { type: 'godMode'; enabled: boolean }
  | { type: 'spawnStress'; count: number };

/**
 * One run of the game, independent of rendering (D2). Owns the run phase and calls the systems in a fixed order;
 * the systems hold the rules. Drive it with `step(STEP, inputs)` and drain `events()` after each frame.
 */
export class RunSimulation {
  readonly state: RunState;
  readonly arena: ArenaData;
  private readonly director: SpawnDirector;
  private currentPhase: RunPhase = 'playing';
  private pausedFrom: RunPhase = 'playing';
  /** The open choices of the current round, one per living player (spec: co-op / own upgrades). */
  private readonly choices = new Map<number, UpgradeChoice>();
  private choiceCount = 0;
  private outcome: RunResult | undefined;
  private endedAs: RunOutcome | undefined;

  constructor(config: RunConfig, content: GameContent | ContentIndex, arena?: ArenaData) {
    const index = content instanceof ContentIndex ? content : new ContentIndex(content);
    const realm = index.realm(config.realmId);
    this.arena = arena ?? generateArena(realm.map, config.seed);
    this.state = new RunState(config, index, this.arena);
    // Every player of the party, side by side on the spawn plaza (D11).
    const seats = this.state.party.length;
    for (let slot = 0; slot < seats; slot++) {
      const a = (slot / seats) * Math.PI * 2;
      const r = seats > 1 ? 48 : 0;
      const { x, y } = this.arena.spawn;
      this.state.players.push(
        createPlayer(this.state, slot, x + Math.cos(a) * r, y + Math.sin(a) * r),
      );
    }
    this.director = new SpawnDirector(this.state);
  }

  get phase(): RunPhase {
    return this.currentPhase;
  }

  get result(): RunResult | undefined {
    return this.outcome;
  }

  /** The first player's open choice (the local player on the host). */
  get currentChoice(): UpgradeChoice | undefined {
    return this.choiceFor(this.state.players[0].id);
  }

  /** A player's open choice, if a round of choices is open and they have not answered. */
  choiceFor(playerId: number): UpgradeChoice | undefined {
    return this.choices.get(playerId);
  }

  /** Returns and clears the events produced since the last call. */
  events(): SimEvent[] {
    return this.state.events.splice(0, this.state.events.length);
  }

  setView(halfWidth: number, halfHeight: number): void {
    this.state.view = { halfWidth, halfHeight };
  }

  /** Advances the run by `dt` seconds while playing; does nothing in any other phase. */
  step(dt: number, inputs: readonly PlayerInput[]): void {
    if (this.currentPhase !== 'playing') return;
    const state = this.state;
    state.time += dt;

    updatePlayers(state, inputs, dt);
    this.director.update(dt);
    updateEnemies(state, dt);
    updateWeapons(state, dt);
    updateProjectiles(state, dt);
    updateHostileProjectiles(state, dt);
    updateHazards(state, dt);
    updatePickups(state, dt);
    this.removeDead();

    // Victory wins over a simultaneous death (spec: run-outcome / run endings).
    if (state.bossDefeated) this.end('victory');
    else if (state.players.every((p) => !p.alive)) this.end('defeat');
    else this.openChoiceIfPending();
  }

  pause(): boolean {
    if (this.currentPhase !== 'playing' && this.currentPhase !== 'choosing') return false;
    this.pausedFrom = this.currentPhase;
    this.currentPhase = 'paused';
    return true;
  }

  resume(): boolean {
    if (this.currentPhase !== 'paused') return false;
    this.currentPhase = this.pausedFrom;
    return true;
  }

  /**
   * Applies offer `index` of the open choice `choiceId` (default: the first player's) to the player it belongs
   * to. Stale or invalid answers are ignored. The run continues once every player of the round has chosen.
   */
  choose(index: number, choiceId = this.currentChoice?.id): boolean {
    if (this.currentPhase !== 'choosing') return false;
    const choice = [...this.choices.values()].find((c) => c.id === choiceId);
    const offer = choice?.offers[index];
    if (!choice || !offer) return false;
    const player = this.state.players.find((p) => p.id === choice.playerId);
    if (!player) return false;
    applyOffer(this.state, player, offer);
    this.choices.delete(choice.playerId);
    this.state.emit({ type: 'choiceResolved', offer, playerId: choice.playerId });
    if (this.choices.size === 0) this.closeRound(choice.source);
    return true;
  }

  /**
   * A player leaves a room's run (spec: rooms / leaving): their god leaves the battle, the others are told, and a
   * round of choices no longer waits for them.
   */
  leave(playerId: number): boolean {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player || player.left || this.currentPhase === 'ended') return false;
    player.left = true;
    player.alive = false;
    player.health = 0;
    this.state.emit({ type: 'announcement', text: `${player.name} left the battle`, kind: 'info' });
    const choice = this.choices.get(playerId);
    if (choice) {
      this.choices.delete(playerId);
      if (this.choices.size === 0 && this.currentPhase === 'choosing')
        this.closeRound(choice.source);
    }
    return true;
  }

  /** Every player of a round has chosen (or left): the run continues, or the next round opens. */
  private closeRound(source: UpgradeChoice['source']): void {
    if (source === 'level') this.state.pendingLevels--;
    else this.state.pendingChests--;
    this.currentPhase = 'playing';
    this.openChoiceIfPending();
  }

  abandon(): boolean {
    return this.end('abandoned');
  }

  /** Ends the run once; later calls change nothing (spec: run-outcome / ending twice). */
  end(outcome: RunOutcome): boolean {
    if (this.currentPhase === 'ended') return false;
    this.currentPhase = 'ended';
    this.choices.clear();
    this.endedAs = outcome;
    this.outcome = this.resultFor(this.state.players[0].id);
    this.state.emit({ type: 'runEnded', result: this.outcome });
    return true;
  }

  /** The run's result as one player sees it: the shared outcome and their own god and loadout. */
  resultFor(playerId: number): RunResult {
    const state = this.state;
    const player = state.players.find((p) => p.id === playerId) ?? state.players[0];
    const loadout = player.loadout;
    const outcome = this.endedAs ?? 'abandoned';
    return {
      runId: state.config.runId,
      godId: player.god.id,
      realmId: state.config.realmId,
      seed: state.config.seed,
      outcome,
      timeSeconds: Math.floor(state.time),
      level: state.level,
      kills: state.kills,
      gold: Math.floor(state.gold),
      bossDefeated: state.bossDefeated,
      loadout: {
        weapons: loadout.weapons.map((w) => ({
          id: w.def.id,
          level: w.level,
          damage: Math.round(w.damageDealt),
        })),
        armour: loadout.armour
          ? { id: loadout.armour.def.id, level: loadout.armour.level }
          : undefined,
        relics: loadout.relics.map((r) => r.id),
        skills: [...loadout.skills].map(([id, level]) => ({ id, level })),
        synergies: loadout.synergies.map((s) => s.id),
      },
    };
  }

  debug(action: DebugAction): void {
    const state = this.state;
    switch (action.type) {
      case 'grantXp':
        state.addXp(action.amount);
        if (this.currentPhase === 'playing') this.openChoiceIfPending();
        return;
      case 'skipTo':
        if (action.seconds > state.time) {
          state.time = action.seconds;
          this.director.skipTo(action.seconds);
        }
        return;
      case 'damageBoss': {
        const boss = state.boss;
        if (!boss || boss.dead) return;
        boss.health -= boss.maxHealth * action.fraction;
        if (boss.health <= 0) killEnemy(state, boss);
        return;
      }
      case 'killPlayer':
        for (const p of state.players) {
          p.revivalsUsed = Math.floor(p.stats.revivals);
          p.health = 0;
          p.alive = false;
        }
        return;
      case 'godMode':
        state.godMode = action.enabled;
        return;
      case 'spawnStress':
        for (let i = 0; i < action.count; i++) {
          const pos = this.director.spawnPosition(14);
          const def = state.realm.timeline[0].enemies[0];
          if (pos) state.spawnEnemy(state.index.enemy(def.id), pos.x, pos.y);
        }
        return;
    }
  }

  /** The HUD of one player (default: the first). */
  hud(playerId = this.state.players[0].id): HudSnapshot {
    const state = this.state;
    const player = state.players.find((p) => p.id === playerId) ?? state.players[0];
    const loadout = player.loadout;
    const boss = state.boss && !state.boss.dead ? state.boss : undefined;
    const weapons: HudItem[] = loadout.weapons.map((w) => ({
      id: w.def.id,
      name: w.def.name,
      level: w.level,
      maxLevel: w.def.levels.length + 1,
      sprite: w.def.visual.sprite,
      color: w.def.visual.color,
    }));
    const armour = loadout.armour;
    let enemies = 0;
    for (const e of state.enemies) if (!e.dead) enemies++;
    const waitingFor: string[] = [];
    for (const c of this.choices.values()) {
      const other = state.players.find((p) => p.id === c.playerId);
      if (other && other !== player) waitingFor.push(other.name);
    }
    return {
      time: state.time,
      phase: this.currentPhase,
      health: Math.max(0, player.health),
      maxHealth: player.stats.maxHealth,
      level: state.level,
      xp: state.xp,
      xpToNext: state.xpToNext(),
      gold: Math.floor(state.gold),
      kills: state.kills,
      ability: {
        name: player.ability.def.name,
        sprite: player.ability.def.visual.sprite,
        cooldown: player.ability.stats.cooldown,
        remaining: player.abilityTimer,
      },
      weapons,
      armour: armour
        ? {
            id: armour.def.id,
            name: armour.def.name,
            level: armour.level,
            maxLevel: armour.def.levels.length,
            sprite: armour.def.visual.sprite,
            color: armour.def.visual.color,
          }
        : undefined,
      relics: loadout.relics.map((r) => ({
        id: r.id,
        name: r.name,
        level: 1,
        maxLevel: 1,
        sprite: r.visual.sprite,
        color: r.visual.color,
      })),
      synergies: loadout.synergies.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
      })),
      boss: boss?.boss
        ? {
            name: boss.boss.def.name,
            title: boss.boss.def.title,
            health: Math.max(0, boss.health),
            maxHealth: boss.maxHealth,
          }
        : undefined,
      enemies,
      waitingFor,
    };
  }

  /** Opens a round of choices: one per living player, each with their own offers (spec: co-op). */
  private openChoiceIfPending(): void {
    const state = this.state;
    if (this.choices.size > 0 || (state.pendingLevels <= 0 && state.pendingChests <= 0)) return;
    const living = state.players.filter((p) => p.alive);
    if (living.length === 0) return;
    const source = state.pendingLevels > 0 ? 'level' : 'chest';
    // With several level-ups queued, each choice names the level it was earned at.
    const level = state.level - Math.max(0, state.pendingLevels - 1);
    for (const player of living) {
      const choice: UpgradeChoice = {
        id: ++this.choiceCount,
        playerId: player.id,
        source,
        level,
        offers: generateOffers(state, player, state.offerRng),
      };
      this.choices.set(player.id, choice);
      state.emit({ type: 'choice', choice });
    }
    this.currentPhase = 'choosing';
  }

  private removeDead(): void {
    const s = this.state;
    compact(s.enemies);
    compact(s.projectiles);
    compact(s.hostileProjectiles);
    compact(s.hazards);
    compact(s.pickups);
  }
}

/** Removes dead entries in place, keeping order (views rely on stable iteration only by id). */
function compact<T extends { dead: boolean }>(items: T[]): void {
  let w = 0;
  for (const item of items) if (!item.dead) items[w++] = item;
  items.length = w;
}
