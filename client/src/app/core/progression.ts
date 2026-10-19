import { Injectable, computed, inject, signal } from '@angular/core';
import {
  GameContent,
  GameSettings,
  Modifier,
  PermanentUpgradeDefinition,
  QuestDefinition,
  RunResult,
} from '../../engine';
import { GAME_CONTENT } from './game-content';
import { dailyOf, questsFor } from './save/glory';
import { applyRunResult, RunRewards } from './save/rewards';
import { permanentModifiers, SaveData } from './save/save-data';
import { SaveStore } from './save/save-store';

export interface DailyQuestView {
  readonly def: QuestDefinition;
  readonly progress: number;
  readonly done: boolean;
}

/** Persistent progression (gold, permanent upgrades, codex, statistics, settings) as signals over the save. */
@Injectable({ providedIn: 'root' })
export class Progression {
  private readonly store = inject(SaveStore);
  private readonly content: GameContent = inject(GAME_CONTENT);
  private readonly state = signal<SaveData>(this.store.load());

  readonly save = this.state.asReadonly();
  readonly gold = computed(() => this.state().gold);
  readonly settings = computed(() => this.state().settings);

  level(upgrade: PermanentUpgradeDefinition): number {
    return this.state().permanentUpgrades[upgrade.id] ?? 0;
  }

  /** Cost of the next level, or undefined at the maximum level. */
  nextCost(upgrade: PermanentUpgradeDefinition): number | undefined {
    return upgrade.costs[this.level(upgrade)];
  }

  canBuy(upgrade: PermanentUpgradeDefinition): boolean {
    const cost = this.nextCost(upgrade);
    return cost !== undefined && this.gold() >= cost;
  }

  /** Buys the next level; returns false (and changes nothing) when it is maxed or too expensive. */
  buy(upgrade: PermanentUpgradeDefinition): boolean {
    if (!this.canBuy(upgrade)) return false;
    const save = this.state();
    const cost = this.nextCost(upgrade) as number;
    this.commit({
      ...save,
      gold: save.gold - cost,
      permanentUpgrades: { ...save.permanentUpgrades, [upgrade.id]: this.level(upgrade) + 1 },
    });
    return true;
  }

  /** Grants a finished run's rewards once (spec: run-outcome / rewards granted once). */
  recordRun(result: RunResult, now = new Date()): RunRewards {
    const { save, rewards } = applyRunResult(this.state(), result, this.content, now);
    if (!rewards.alreadyProcessed) this.commit(save);
    return rewards;
  }

  updateSettings(changes: Partial<GameSettings>): void {
    const save = this.state();
    this.commit({ ...save, settings: { ...save.settings, ...changes } });
  }

  /** Records that the intro finished or was skipped, so it no longer plays on launch. */
  markIntroSeen(): void {
    const save = this.state();
    if (!save.introSeen) this.commit({ ...save, introSeen: true });
  }

  /** Today's three quests with their progress (spec: glory / daily quests). */
  todayQuests(now = new Date()): DailyQuestView[] {
    const day = dailyOf(this.state(), now);
    return questsFor(day.date, this.content.dailyQuests).map((def) => ({
      def,
      progress: Math.min(def.goal.target, day.progress[def.id] ?? 0),
      done: day.done.includes(def.id),
    }));
  }

  /** Modifiers from permanent upgrades, for the next run. */
  runModifiers(): Modifier[] {
    return permanentModifiers(this.state(), this.content);
  }

  private commit(save: SaveData): void {
    this.state.set(save);
    this.store.write(save);
  }
}
