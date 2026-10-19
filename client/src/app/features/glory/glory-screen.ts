import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AchievementDefinition, GameContent } from '../../../engine';
import { GAME_CONTENT } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { ScoreEntry } from '../../core/save/save-records';
import { formatTime, ItemIcon } from '../../shared/item-icon';

type Mode = 'solo' | 'coop';

interface AchievementView {
  readonly def: AchievementDefinition;
  readonly unlockedAt?: string;
  /** Progress toward an added-up or every-god goal, e.g. "9,800 / 10,000". */
  readonly progress?: string;
}

/**
 * The Hall of Glory (spec: glory / hall of glory): today's quests, the solo and co-op high scores with a filter per
 * god, and every achievement.
 */
@Component({
  selector: 'app-glory-screen',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen glory">
      <h1 class="screen-title">Hall of Glory</h1>

      <section class="panel quests" aria-labelledby="quests-title" data-testid="glory-quests">
        <div class="head">
          <h2 id="quests-title">Today's quests</h2>
          <span class="reset">New quests in {{ untilMidnight() }}</span>
        </div>
        <ul>
          @for (q of quests(); track q.def.id) {
            <li [class.done]="q.done" [attr.data-testid]="'quest-' + q.def.id">
              <span class="check" aria-hidden="true">{{ q.done ? '✔' : '◇' }}</span>
              <span class="what">{{ q.def.description }}</span>
              <span
                class="bar"
                role="progressbar"
                [attr.aria-label]="q.def.description"
                [attr.aria-valuenow]="q.progress"
                aria-valuemin="0"
                [attr.aria-valuemax]="q.def.goal.target"
                ><span [style.width.%]="(q.progress / q.def.goal.target) * 100"></span
              ></span>
              <span class="amount">{{ fmt(q.progress) }} / {{ fmt(q.def.goal.target) }}</span>
              <span class="reward"
                ><app-item-icon sprite="icon_gold" [size]="16" /><span class="gold-amount">{{
                  q.def.gold
                }}</span></span
              >
            </li>
          }
        </ul>
      </section>

      <div class="columns">
        <section class="panel scores" aria-labelledby="scores-title">
          <div class="head">
            <h2 id="scores-title">High scores</h2>
            <div class="tabs" role="tablist" aria-label="Mode">
              @for (m of modes; track m.id) {
                <button
                  role="tab"
                  class="tab"
                  [attr.aria-selected]="mode() === m.id"
                  [attr.data-testid]="'scores-' + m.id"
                  (click)="mode.set(m.id)"
                >
                  {{ m.label }}
                </button>
              }
            </div>
          </div>
          <div class="tabs gods" role="group" aria-label="God">
            <button
              class="tab"
              [attr.aria-selected]="!god()"
              data-testid="scores-god-all"
              (click)="god.set(undefined)"
            >
              All gods
            </button>
            @for (g of content.gods; track g.id) {
              <button
                class="tab"
                [attr.aria-selected]="god() === g.id"
                [attr.data-testid]="'scores-god-' + g.id"
                (click)="god.set(g.id)"
              >
                {{ g.name }}
              </button>
            }
          </div>
          <table class="data-table" data-testid="scores-table">
            <thead>
              <tr>
                <th>#</th>
                <th>God</th>
                <th>Realm</th>
                <th class="num">Realms</th>
                <th class="num">Time</th>
                <th class="num">Kills</th>
                <th class="num">Lv</th>
                <th class="num">Score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              @for (e of scores(); track e.runId; let i = $index) {
                <tr>
                  <td>{{ i + 1 }}</td>
                  <td class="god">
                    <app-item-icon [sprite]="godSprite(e.godId)" [size]="20" />
                    {{ godName(e.godId) }}
                    @if (e.players > 1) {
                      <span class="party">×{{ e.players }}</span>
                    }
                  </td>
                  <td>{{ realmName(e.realmId) }}</td>
                  <td class="num">{{ e.realmsCleared }}</td>
                  <td class="num">{{ time(e.timeSeconds) }}</td>
                  <td class="num">{{ fmt(e.kills) }}</td>
                  <td class="num">{{ e.level }}</td>
                  <td class="num score">{{ fmt(e.score) }}</td>
                  <td>{{ date(e.endedAt) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="empty">
                    No {{ mode() === 'coop' ? 'co-op ' : '' }}runs here yet. Glory awaits.
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <p class="hint">Score: kills + 2 per second + 10 per level + 1,000 per realm cleared.</p>
        </section>

        <section class="panel achievements" aria-labelledby="ach-title">
          <div class="head">
            <h2 id="ach-title">Achievements</h2>
            <span class="count" data-testid="achievement-count"
              >{{ unlockedCount() }} / {{ achievements().length }}</span
            >
          </div>
          <ul>
            @for (a of achievements(); track a.def.id) {
              <li
                [class.unlocked]="!!a.unlockedAt"
                [attr.data-testid]="'achievement-' + a.def.id"
                [attr.data-unlocked]="!!a.unlockedAt"
              >
                <app-item-icon [sprite]="a.def.sprite" [size]="36" />
                <span class="text">
                  <strong>{{ a.def.name }}</strong>
                  <span class="desc">{{ a.def.description }}</span>
                  @if (a.unlockedAt) {
                    <span class="when">Unlocked {{ date(a.unlockedAt) }}</span>
                  } @else if (a.progress) {
                    <span class="when">{{ a.progress }}</span>
                  }
                </span>
                <span class="reward"
                  ><app-item-icon sprite="icon_gold" [size]="14" /><span class="gold-amount">{{
                    a.def.gold
                  }}</span></span
                >
              </li>
            }
          </ul>
        </section>
      </div>

      <a class="btn" routerLink="/">Back</a>
    </main>
  `,
  styles: `
    .glory {
      gap: 16px;
      padding-top: 28px;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    h2 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--gold-2);
    }
    .reset,
    .count,
    .hint {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .hint {
      margin: 8px 0 0;
    }
    .quests {
      width: min(1180px, 100%);
    }
    .quests ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 6px;
    }
    .quests li {
      display: grid;
      grid-template-columns: 22px 1fr minmax(80px, 200px) 110px 70px;
      align-items: center;
      gap: 10px;
    }
    .quests li.done .what {
      color: var(--gold-2);
    }
    .check {
      color: var(--gold);
    }
    .bar {
      height: 8px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid var(--line);
    }
    .bar span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #9a7228, #e0b44e);
    }
    .amount {
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: var(--muted);
      font-size: 0.85rem;
    }
    .reward {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      justify-content: flex-end;
    }
    .columns {
      width: min(1180px, 100%);
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 16px;
      align-items: start;
    }
    .gods {
      margin-bottom: 8px;
    }
    .god {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .party {
      color: var(--muted);
      font-size: 0.75rem;
    }
    .score {
      color: var(--gold-2);
      font-weight: 700;
    }
    .achievements ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 6px;
      max-height: 56vh;
      overflow: auto;
    }
    .achievements li {
      display: grid;
      grid-template-columns: 36px 1fr auto;
      gap: 10px;
      align-items: center;
      padding: 6px 8px;
      border: 1px solid rgba(201, 165, 90, 0.12);
      background: rgba(0, 0, 0, 0.25);
      opacity: 0.6;
      filter: grayscale(0.8);
    }
    .achievements li.unlocked {
      opacity: 1;
      filter: none;
      border-color: var(--gold);
    }
    .text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .desc,
    .when {
      font-size: 0.8rem;
      color: var(--muted);
    }
    .when {
      font-style: italic;
    }
    @media (max-width: 860px) {
      .columns {
        grid-template-columns: 1fr;
      }
      .quests li {
        grid-template-columns: 22px 1fr 90px 60px;
      }
      .quests .bar {
        display: none;
      }
    }
  `,
})
export class GloryScreen {
  protected readonly progression = inject(Progression);
  protected readonly content: GameContent = inject(GAME_CONTENT);
  protected readonly modes: readonly { id: Mode; label: string }[] = [
    { id: 'solo', label: 'Solo' },
    { id: 'coop', label: 'Co-op' },
  ];
  protected readonly mode = signal<Mode>('solo');
  protected readonly god = signal<string | undefined>(undefined);
  /** Ticks every half minute so the quests and their countdown follow the clock. */
  private readonly now = signal(new Date());

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected readonly quests = computed(() => {
    this.progression.save();
    return this.progression.todayQuests(this.now());
  });

  protected readonly untilMidnight = computed(() => {
    const now = this.now();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const minutes = Math.max(0, Math.ceil((midnight.getTime() - now.getTime()) / 60_000));
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  });

  protected readonly scores = computed((): readonly ScoreEntry[] => {
    const table = this.progression.save().highScores[this.mode()];
    const god = this.god();
    return god ? table.filter((e) => e.godId === god) : table;
  });

  protected readonly achievements = computed((): AchievementView[] => {
    const save = this.progression.save();
    return this.content.achievements.map((def) => {
      const unlockedAt = save.achievements[def.id];
      let progress: string | undefined;
      if (!unlockedAt && def.goal.everyGod)
        progress = `${save.achievementGods[def.id]?.length ?? 0} / ${this.content.gods.length} gods`;
      else if (!unlockedAt && def.goal.over === 'total')
        progress = `${this.fmt(save.achievementProgress[def.id] ?? 0)} / ${this.fmt(def.goal.target)}`;
      return { def, unlockedAt, progress };
    });
  });

  protected readonly unlockedCount = computed(
    () => this.achievements().filter((a) => a.unlockedAt).length,
  );

  protected godName(id: string): string {
    return this.content.gods.find((g) => g.id === id)?.name ?? id;
  }

  protected godSprite(id: string): string {
    return this.content.gods.find((g) => g.id === id)?.visual.sprite ?? 'icon_gold';
  }

  protected realmName(id: string): string {
    return this.content.realms.find((r) => r.id === id)?.name ?? id;
  }

  protected time(seconds: number): string {
    return formatTime(seconds);
  }

  protected date(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }

  protected fmt(n: number): string {
    return Math.floor(n).toLocaleString('en-US');
  }
}
