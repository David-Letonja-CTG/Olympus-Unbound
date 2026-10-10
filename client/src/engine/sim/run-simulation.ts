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

/** The fixed simulation step: 60 steps per simulated second (D5). */
export const STEP = 1 / 60;

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
  private choice: UpgradeChoice | undefined;
  private choiceCount = 0;
  private outcome: RunResult | undefined;

  constructor(config: RunConfig, content: GameContent | ContentIndex, arena?: ArenaData) {
    const index = content instanceof ContentIndex ? content : new ContentIndex(content);
    const realm = index.realm(config.realmId);
    this.arena = arena ?? generateArena(realm.map, config.seed);
    this.state = new RunState(config, index, this.arena);
    this.state.players.push(createPlayer(this.state, 0, this.arena.spawn.x, this.arena.spawn.y));
    this.director = new SpawnDirector(this.state);
  }

  get phase(): RunPhase {
    return this.currentPhase;
  }

  get result(): RunResult | undefined {
    return this.outcome;
  }

  get currentChoice(): UpgradeChoice | undefined {
    return this.choice;
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

  /** Applies offer `index` of the open choice. Stale or invalid answers are ignored. */
  choose(index: number, choiceId = this.choice?.id): boolean {
    const choice = this.choice;
    if (this.currentPhase !== 'choosing' || !choice || choice.id !== choiceId) return false;
    const offer = choice.offers[index];
    if (!offer) return false;
    const player = this.state.players[0];
    applyOffer(this.state, player, offer);
    if (choice.source === 'level') this.state.pendingLevels--;
    else this.state.pendingChests--;
    this.choice = undefined;
    this.state.emit({ type: 'choiceResolved', offer });
    this.currentPhase = 'playing';
    this.openChoiceIfPending();
    return true;
  }

  abandon(): boolean {
    return this.end('abandoned');
  }

  /** Ends the run once; later calls change nothing (spec: run-outcome / ending twice). */
  end(outcome: RunOutcome): boolean {
    if (this.currentPhase === 'ended') return false;
    this.currentPhase = 'ended';
    this.choice = undefined;
    const state = this.state;
    const player = state.players[0];
    const loadout = player.loadout;
    this.outcome = {
      runId: state.config.runId,
      godId: state.config.godId,
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
    state.emit({ type: 'runEnded', result: this.outcome });
    return true;
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

  hud(): HudSnapshot {
    const state = this.state;
    const player = state.players[0];
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
    };
  }

  private openChoiceIfPending(): void {
    const state = this.state;
    if (this.choice || (state.pendingLevels <= 0 && state.pendingChests <= 0)) return;
    const player = state.players[0];
    if (!player.alive) return;
    this.choice = {
      id: ++this.choiceCount,
      source: state.pendingLevels > 0 ? 'level' : 'chest',
      // With several level-ups queued, each choice names the level it was earned at.
      level: state.level - Math.max(0, state.pendingLevels - 1),
      offers: generateOffers(state, player, state.offerRng),
    };
    this.currentPhase = 'choosing';
    state.emit({ type: 'choice', choice: this.choice });
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
