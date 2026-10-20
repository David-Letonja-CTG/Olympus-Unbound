import { killEnemy } from '../combat/damage';
import { ContentIndex } from '../data/content-index';
import { GameContent } from '../data/types';
import { updateEnemies } from '../enemies/enemy-system';
import { updateHazards } from '../bosses/boss';
import { clearBoss } from '../bosses/parts';
import { updateWalls } from '../bosses/walls';
import { ArenaData, generateArena } from '../maps/generate-arena';
import { applyOffer } from '../progression/loadout';
import { generateOffers } from '../progression/offers';
import { SpawnDirector } from '../spawning/director';
import { WEAPON_BEHAVIORS } from '../weapons/behaviors';
import {
  updateHostileProjectiles,
  updateProjectiles,
  updateWeapons,
} from '../weapons/weapon-system';
import { BotBrain, botInput, botPick, newBrain } from './bots';
import { placeCompanions, updateCompanions } from './companions';
import { arriveMerchant, buyWare, shopOffers, updateMerchant } from './merchant';
import { collect, updatePickups } from './pickups';
import { createPlayer, updatePlayers } from './players';
import { GATE_OPEN_SECONDS, GATE_RADIUS, GATE_STAND_SECONDS, realmAt, realmSeed } from './realms';
import { updateRevives } from './revive';
import { RunConfig, RunState } from './run-state';
import { holdParty } from './shared-screen';
import {
  HudSnapshot,
  NO_INPUT,
  HudItem,
  Player,
  PlayerInput,
  RunOutcome,
  RunPhase,
  RunResult,
  SimEvent,
  UpgradeChoice,
  UpgradeOffer,
} from './types';

export { STEP } from './run-state';

/** Development and test shortcuts; only reachable when a session is created with `debug: true`. */
export type DebugAction =
  | { type: 'grantXp'; amount: number }
  | { type: 'skipTo'; seconds: number }
  | { type: 'damageBoss'; fraction: number }
  /** Fells every player, or only the one in `slot`. */
  | { type: 'killPlayer'; slot?: number }
  | { type: 'godMode'; enabled: boolean }
  | { type: 'spawnStress'; count: number }
  /** The merchant arrives now (spec: merchant). */
  | { type: 'summonMerchant' }
  | { type: 'grantGold'; amount: number }
  | { type: 'travel' };

/**
 * One run of the game, independent of rendering (D2). Owns the run phase and calls the systems in a fixed order;
 * the systems hold the rules. Drive it with `step(STEP, inputs)` and drain `events()` after each frame.
 */
export class RunSimulation {
  readonly state: RunState;
  private director: SpawnDirector;
  private currentPhase: RunPhase = 'playing';
  private pausedFrom: RunPhase = 'playing';
  /** The open choices of the current round, one per living player (spec: co-op / own upgrades). */
  private readonly choices = new Map<number, UpgradeChoice>();
  private choiceCount = 0;
  private outcome: RunResult | undefined;
  private endedAs: RunOutcome | undefined;
  /** The bots' brains by player ID (spec: bot-allies), and the step's inputs with theirs filled in. */
  private readonly brains = new Map<number, BotBrain>();
  private readonly stepInputs: PlayerInput[] = [];

  constructor(config: RunConfig, content: GameContent | ContentIndex, arena?: ArenaData) {
    const index = content instanceof ContentIndex ? content : new ContentIndex(content);
    const realm = index.realm(config.realmId);
    this.state = new RunState(config, index, arena ?? generateArena(realm.map, config.seed));
    for (let slot = 0; slot < this.state.party.length; slot++)
      this.state.players.push(createPlayer(this.state, slot, 0, 0));
    this.placeParty();
    this.director = new SpawnDirector(this.state);
    for (const p of this.state.players) if (p.bot) this.brains.set(p.id, newBrain(p.bot, p.slot));
  }

  /** The current realm's arena; a new one after every gate (spec: endless-run). */
  get arena(): ArenaData {
    return this.state.arena;
  }

  /** Every player of the party, side by side on the spawn plaza (D11). */
  private placeParty(): void {
    const players = this.state.players;
    const { x, y } = this.state.arena.spawn;
    players.forEach((p, slot) => {
      const a = (slot / players.length) * Math.PI * 2;
      const r = players.length > 1 ? 48 : 0;
      p.x = p.px = x + Math.cos(a) * r;
      p.y = p.py = y + Math.sin(a) * r;
    });
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
    // A quick run's realm clock runs ahead of the run's (spec: quick-runs / quick pace).
    state.realmTime += dt * state.pace;

    updatePlayers(state, this.withBots(inputs), dt);
    holdParty(state);
    updateRevives(state, dt);
    this.director.update(dt);
    updateEnemies(state, dt);
    updateWeapons(state, dt);
    updateCompanions(state, dt);
    updateProjectiles(state, dt);
    updateHostileProjectiles(state, dt);
    updateHazards(state, dt);
    updateWalls(state, dt);
    // The boss has fallen: its parts, walls and zones go with it.
    if (
      state.bossDefeated &&
      (state.walls.length > 0 ||
        state.zones.length > 0 ||
        state.enemies.some((e) => e.part && !e.dead))
    )
      clearBoss(state);
    updatePickups(state, dt);
    updateMerchant(state, dt);
    this.removeDead();

    // The boss's gold counts even if the party falls in the same step (spec: run-outcome / run endings).
    if (state.bossDefeated && !state.gate) this.openGate();
    if (state.players.every((p) => !p.alive)) {
      this.end('defeat');
      return;
    }
    if (state.gate) this.updateGate(dt);
    this.openChoiceIfPending();
  }

  /** The step's inputs: every bot seat's from its brain, the others as given (spec: bot-allies). */
  private withBots(inputs: readonly PlayerInput[]): readonly PlayerInput[] {
    if (this.brains.size === 0) return inputs;
    const out = this.stepInputs;
    out.length = 0;
    for (const p of this.state.players) {
      const brain = this.brains.get(p.id);
      out[p.slot] = brain ? botInput(this.state, p, brain) : (inputs[p.slot] ?? NO_INPUT);
    }
    return out;
  }

  /** The boss has fallen: its gold, and the gate to the next realm where it stood (spec: endless-run / the gate). */
  private openGate(): void {
    const state = this.state;
    const to = realmAt(state.index.content.realms, state.config.realmId, state.depth + 1);
    const at = state.boss ?? state.arena.bossArena;
    const bonus = state.realm.rewards.bossGold;
    state.gold += bonus;
    state.gate = {
      x: at.x,
      y: at.y,
      radius: GATE_RADIUS,
      to,
      standing: 0,
      closesIn: GATE_OPEN_SECONDS,
    };
    state.emit({ type: 'gateOpened', to: to.id, x: at.x, y: at.y });
    state.emit({
      type: 'announcement',
      text: `+${bonus} gold · The gate to ${to.name} is open!`,
      kind: 'boss',
    });
  }

  private updateGate(dt: number): void {
    const state = this.state;
    const gate = state.gate;
    if (!gate) return;
    const r2 = gate.radius * gate.radius;
    const inside = state.players.some(
      (p) => p.alive && (p.x - gate.x) ** 2 + (p.y - gate.y) ** 2 <= r2,
    );
    gate.standing = inside ? gate.standing + dt : 0;
    gate.closesIn -= dt;
    if (gate.standing >= GATE_STAND_SECONDS || gate.closesIn <= 0) this.travel();
  }

  /**
   * The party passes the gate (spec: endless-run / travelling): spoils gathered, fallen gods raised, a new arena from
   * the run's seed and depth, the party on its plaza, and the new realm's timeline from its start.
   */
  private travel(): void {
    const state = this.state;
    const gatherer = state.players.find((p) => p.alive) ?? state.players[0];
    for (const pickup of state.pickups) collect(state, gatherer, pickup, true);
    const depth = state.depth + 1;
    const realm =
      state.gate?.to ?? realmAt(state.index.content.realms, state.config.realmId, depth);
    state.depth = depth;
    state.enterRealm(realm, generateArena(realm.map, realmSeed(state.config.seed, depth)));
    for (const p of state.players) {
      if (p.left) continue;
      if (!p.alive) {
        p.alive = true;
        p.health = p.stats.maxHealth / 2;
      }
      p.revive = 0;
      p.invulnerable = Math.max(p.invulnerable, state.balance.revive.invulnerable);
    }
    this.placeParty();
    placeCompanions(state);
    this.director = new SpawnDirector(state);
    state.emit({ type: 'realmEntered', realmId: realm.id, depth });
    state.emit({
      type: 'announcement',
      text: `Realm ${depth + 1}: ${realm.name}`,
      kind: 'boss',
    });
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
    if (choice.source === 'shop') return this.shop(choice, player, offer);
    applyOffer(this.state, player, offer);
    this.choices.delete(choice.playerId);
    this.state.emit({
      type: 'choiceResolved',
      offer,
      playerId: choice.playerId,
      choiceId: choice.id,
    });
    if (this.choices.size === 0) this.closeRound(choice.source);
    return true;
  }

  /**
   * An answer in the shop (spec: merchant / the shop): Leave closes it; a ware is bought only if the party can
   * afford it, and the shop is shown again.
   */
  private shop(choice: UpgradeChoice, player: Player, offer: UpgradeOffer): boolean {
    if (offer.kind !== 'leave' && !buyWare(this.state, player, offer)) return false;
    this.choices.delete(choice.playerId);
    this.state.emit({
      type: 'choiceResolved',
      offer,
      playerId: choice.playerId,
      choiceId: choice.id,
    });
    if (offer.kind === 'leave' || !this.state.merchant) this.closeRound('shop');
    else this.openShop(player);
    return true;
  }

  private openShop(player: Player): void {
    const state = this.state;
    const choice: UpgradeChoice = {
      id: ++this.choiceCount,
      playerId: player.id,
      source: 'shop',
      level: state.level,
      offers: shopOffers(state, player),
      gold: Math.floor(state.gold),
    };
    this.choices.set(player.id, choice);
    state.emit({ type: 'choice', choice });
    this.currentPhase = 'choosing';
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
    else if (source === 'chest') this.state.pendingChests--;
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
    // A boss that fell in this realm counts even before the party passes its gate.
    const realmsCleared = state.depth + (state.bossDefeated ? 1 : 0);
    return {
      runId: state.config.runId,
      godId: player.god.id,
      realmId: state.config.realmId,
      seed: state.config.seed,
      variant: state.config.variant,
      outcome,
      timeSeconds: Math.floor(state.time),
      level: state.level,
      kills: state.kills,
      gold: Math.floor(state.gold),
      realmsCleared,
      realmReached: state.realm.id,
      players: state.party.length,
      bots: state.party.filter((s) => s.bot).length,
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
        // Realm time: the current realm's timeline jumps; the run's clock moves by as much.
        if (action.seconds > state.realmTime) {
          state.time += (action.seconds - state.realmTime) / state.pace;
          state.realmTime = action.seconds;
          this.director.skipTo(action.seconds);
        }
        return;
      case 'travel':
        // Through the gate at once (opening it if the boss still lives).
        if (this.currentPhase !== 'playing') return;
        if (!state.gate) this.openGate();
        this.travel();
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
          if (action.slot !== undefined && p.slot !== action.slot) continue;
          p.revivalsUsed = Math.floor(p.stats.revivals);
          p.health = 0;
          p.alive = false;
        }
        // Also while a round of choices holds the steps: the run ends now (spec: run-outcome / run endings).
        if (state.players.every((p) => !p.alive)) this.end('defeat');
        return;
      case 'godMode':
        state.godMode = action.enabled;
        return;
      case 'grantGold':
        state.gold += action.amount;
        return;
      case 'summonMerchant':
        if (!state.merchant) arriveMerchant(state);
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
      ...(WEAPON_BEHAVIORS[w.def.behavior].continuous
        ? {}
        : { cooldown: w.stats.cooldown, remaining: Math.max(0, w.timer) }),
    }));
    const stamina = state.balance.stamina;
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
      realmTime: state.realmTime,
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
      surge: player.surge,
      stamina: {
        value: player.stamina,
        max: stamina.max,
        dashCost: stamina.dashCost,
        dashRemaining: player.dashCooldown,
        dashCooldown: stamina.dashDuration + stamina.dashRecovery,
      },
      weapons,
      companions: state.companions
        .filter((c) => c.ownerId === player.id)
        .map((c) => ({
          id: c.def.id,
          name: c.def.name,
          level: 1,
          maxLevel: 1,
          sprite: c.def.icon,
          color: c.def.visual.color,
        })),
      merchant: state.merchant ? { leavesIn: Math.max(0, state.merchant.leavesIn) } : undefined,
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
      realm: { name: state.realm.name, number: state.depth + 1 },
      gate: state.gate
        ? { to: state.gate.to.name, closesIn: Math.max(0, state.gate.closesIn) }
        : undefined,
      party: state.players
        .filter((p) => !p.left)
        .map((p) => ({
          id: p.id,
          seat: p.slot,
          name: p.name,
          god: p.god.name,
          sprite: p.god.visual.sprite,
          health: Math.max(0, Math.ceil(p.health)),
          maxHealth: p.stats.maxHealth,
          alive: p.alive,
          revive: p.revive,
          self: p === player,
          bot: !!p.bot || undefined,
          local: (state.config.sharedScreen && !p.bot) || undefined,
          stamina: p.stamina / stamina.max,
          ability: p.ability.stats.cooldown > 0 ? 1 - p.abilityTimer / p.ability.stats.cooldown : 1,
        })),
    };
  }

  /** Opens a round of choices: one per living player, each with their own offers (spec: co-op). */
  private openChoiceIfPending(): void {
    const state = this.state;
    if (this.choices.size > 0) return;
    if (state.pendingLevels <= 0 && state.pendingChests <= 0) {
      // Level-ups and treasure come first; then whoever stepped into the merchant's ring.
      while (state.shopQueue.length > 0 && state.merchant) {
        const shopper = state.players.find((p) => p.id === state.shopQueue[0] && p.alive);
        state.shopQueue.shift();
        if (shopper) return this.openShop(shopper);
      }
      return;
    }
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
    // Bots answer at once; the round waits only for the players (spec: bot-allies / allies choose at once).
    for (const player of living) {
      const choice = this.choices.get(player.id);
      if (player.bot && choice && this.currentPhase === 'choosing')
        this.choose(botPick(state, player, choice, player.bot), choice.id);
    }
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
