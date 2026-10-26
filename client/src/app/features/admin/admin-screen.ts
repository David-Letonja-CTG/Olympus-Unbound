import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BalanceReport, BalanceRow, GameContent } from '../../../engine';
import { SeasonalEvents } from '../../core/seasonal-events';
import {
  DEFAULT_DIAL,
  Difficulty,
  DIAL_LIMITS,
  DifficultyDial,
  parseDial,
} from '../../core/difficulty';
import { GameServer, ServerError } from '../../core/game-server';
import { adminUnlocked, unlockAdmin } from '../../core/admin-mode';
import { GAME_CONTENT } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { formatTime, ItemIcon } from '../../shared/item-icon';
import { historyCsv, historyJson, runStatistics } from './run-statistics';

/** Simulation steps per slice of the balance report: small enough to keep the page responsive. */
const SLICE_STEPS = 900;
/** How many of the latest runs the score chart shows. */
const CHART_RUNS = 40;

/**
 * Admin mode's statistics screen (spec: run-statistics): this browser's runs as totals and tables, the latest scores
 * as a chart, exports, and a balance report played by the bot in slices. Reads only this browser's save (D1).
 */
@Component({
  selector: 'app-admin-screen',
  imports: [RouterLink, ItemIcon, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen admin">
      <h1 class="screen-title">Statistics</h1>
      <p class="screen-subtitle">Admin mode · the runs played in this browser</p>

      @if (!unlocked()) {
        <form class="panel lock" (submit)="unlock($event)" data-testid="admin-lock">
          <label for="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autocomplete="current-password"
            [(ngModel)]="password"
            name="password"
            data-testid="admin-password"
          />
          <button class="btn btn-primary" type="submit" data-testid="admin-unlock">Unlock</button>
          @if (wrong()) {
            <p class="wrong" role="alert" data-testid="admin-wrong">Wrong password.</p>
          }
        </form>
      } @else {
        @let s = stats();
        @if (s.totals.runs === 0) {
          <section class="panel wide">
            <p class="empty" data-testid="admin-empty">No runs to report yet. Play a run first.</p>
          </section>
        } @else {
          <section class="panel wide totals" aria-label="Totals" data-testid="admin-totals">
            <div>
              <span>Runs</span><strong>{{ s.totals.runs }}</strong>
            </div>
            <div>
              <span>Time played</span><strong>{{ hours(s.totals.seconds) }}</strong>
            </div>
            <div>
              <span>Kills</span><strong>{{ fmt(s.totals.kills) }}</strong>
            </div>
            <div>
              <span>Realms cleared</span><strong>{{ s.totals.realmsCleared }}</strong>
            </div>
            <div>
              <span>Solo / allies / co-op</span
              ><strong>{{ s.totals.solo }} / {{ s.totals.allies }} / {{ s.totals.coop }}</strong>
            </div>
            <div class="exports">
              <button class="btn" data-testid="export-json" (click)="exportJson()">JSON</button>
              <button class="btn" data-testid="export-csv" (click)="exportCsv()">CSV</button>
            </div>
          </section>

          <section class="panel wide">
            <h2>Gods</h2>
            <table class="data-table" data-testid="admin-gods">
              <thead>
                <tr>
                  <th>God</th>
                  <th class="num">Runs</th>
                  <th class="num">Avg realms</th>
                  <th class="num">Best realms</th>
                  <th class="num">Avg time</th>
                  <th class="num">Avg kills</th>
                  <th class="num">Avg level</th>
                  <th class="num">Best score</th>
                </tr>
              </thead>
              <tbody>
                @for (g of s.gods; track g.godId) {
                  <tr [attr.data-testid]="'admin-god-' + g.godId">
                    <td class="name">
                      <app-item-icon [sprite]="godSprite(g.godId)" [size]="20" />
                      {{ godName(g.godId) }}
                    </td>
                    <td class="num">{{ g.runs }}</td>
                    <td class="num">{{ g.avgRealms.toFixed(1) }}</td>
                    <td class="num">{{ g.bestRealms }}</td>
                    <td class="num">{{ time(g.avgSeconds) }}</td>
                    <td class="num">{{ fmt(g.avgKills) }}</td>
                    <td class="num">{{ g.avgLevel.toFixed(1) }}</td>
                    <td class="num">{{ fmt(g.bestScore) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>

          <section class="panel wide" aria-labelledby="chart-title">
            <h2 id="chart-title">Scores of the latest runs</h2>
            <svg
              class="chart"
              [attr.viewBox]="'0 0 ' + chart().width + ' 160'"
              role="img"
              [attr.aria-label]="'Scores of the last ' + chart().bars.length + ' runs'"
              data-testid="admin-chart"
            >
              <line x1="0" [attr.x2]="chart().width" y1="140" y2="140" class="axis" />
              <text x="0" y="12" class="tick">{{ fmt(chart().max) }}</text>
              @for (b of chart().bars; track $index) {
                <rect
                  class="bar"
                  [attr.x]="b.x"
                  [attr.y]="b.y"
                  [attr.width]="b.w"
                  [attr.height]="b.h"
                  rx="2"
                >
                  <title>{{ b.label }}</title>
                </rect>
              }
            </svg>
          </section>

          <div class="columns wide">
            <section class="panel">
              <h2>Where runs ended</h2>
              <table class="data-table" data-testid="admin-endings">
                <tbody>
                  @for (e of s.endings; track e.realmId) {
                    <tr>
                      <td>{{ realmName(e.realmId) }}</td>
                      <td class="num">{{ e.runs }}</td>
                      <td class="num">{{ pct(e.runs / s.totals.runs) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
            <section class="panel">
              <h2>Weapons</h2>
              <table class="data-table" data-testid="admin-weapons">
                <thead>
                  <tr>
                    <th>Weapon</th>
                    <th class="num">In builds</th>
                    <th class="num">Avg level</th>
                    <th class="num">Damage</th>
                  </tr>
                </thead>
                <tbody>
                  @for (w of s.weapons; track w.id) {
                    <tr>
                      <td>{{ weaponName(w.id) }}</td>
                      <td class="num">{{ pct(w.pickRate) }}</td>
                      <td class="num">{{ w.avgLevel.toFixed(1) }}</td>
                      <td class="num">{{ pct(w.damageShare) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
          </div>
        }

        <!-- Seasonal events on this device (spec: seasonal-events / admin switch). -->
        <section class="panel wide" aria-labelledby="events-title">
          <h2 id="events-title">Seasonal events</h2>
          <p class="hint">
            Events follow the calendar on every device. This switch only changes this browser: to
            test or show an event out of season, or to hide one.
          </p>
          <div class="tabs" role="group" aria-label="Event switch">
            <button
              class="tab"
              data-testid="event-auto"
              [attr.aria-pressed]="events.override().mode === 'auto'"
              (click)="events.setOverride({ mode: 'auto' })"
            >
              By the calendar
            </button>
            @for (e of content.events; track e.id) {
              <button
                class="tab"
                [attr.data-testid]="'event-on-' + e.id"
                [attr.aria-pressed]="eventForced(e.id)"
                (click)="events.setOverride({ mode: 'on', id: e.id })"
              >
                {{ e.name }} on
              </button>
            }
            <button
              class="tab"
              data-testid="event-off"
              [attr.aria-pressed]="events.override().mode === 'off'"
              (click)="events.setOverride({ mode: 'off' })"
            >
              All off
            </button>
          </div>
          <p class="hint" data-testid="event-now">Now: {{ events.active()?.name ?? 'no event' }}</p>
        </section>

        <!-- The difficulty dial on the game server: every player's next run (spec: difficulty-dial). -->
        <section
          class="panel wide"
          aria-labelledby="difficulty-title"
          data-testid="admin-difficulty"
        >
          <h2 id="difficulty-title">Difficulty for every player</h2>
          <p class="hint">
            Multipliers every player's game applies to the runs it starts, read from the game server
            whenever the main menu opens. 1 is the game as released. Realm growth adds that much
            again for every realm cleared: 1.2 makes the third realm 1.44 times tougher on top.
          </p>
          @if (!server.configured) {
            <p class="hint">This build has no game server, so the dial cannot be set from here.</p>
          } @else {
            <div class="controls">
              @for (f of dialFields; track f.key) {
                <label
                  >{{ f.label }}
                  <input
                    type="number"
                    step="0.05"
                    [min]="f.min"
                    [max]="f.max"
                    [(ngModel)]="dial[f.key]"
                    [attr.data-testid]="'dial-' + f.key"
                /></label>
              }
            </div>
            <div class="controls">
              <label
                >Server admin token
                <input
                  class="token"
                  type="password"
                  autocomplete="off"
                  [(ngModel)]="token"
                  data-testid="dial-token"
              /></label>
              <button
                class="btn btn-primary"
                [disabled]="saving() || !token"
                (click)="saveDial()"
                data-testid="dial-save"
              >
                Save for everyone
              </button>
              <button class="btn" (click)="resetDial()" data-testid="dial-reset">Back to 1</button>
            </div>
            <p class="hint" role="status" data-testid="dial-status">{{ dialStatus() }}</p>
          }
        </section>

        <section class="panel wide balance" aria-labelledby="balance-title">
          <h2 id="balance-title">Balance report</h2>
          <p class="hint">
            The bot plays each chosen god from a fresh start (no permanent upgrades), always taking
            new weapons first. The same choices always give the same report.
          </p>
          <div class="controls">
            <div class="tabs" role="group" aria-label="Gods">
              @for (g of content.gods; track g.id) {
                <button
                  class="tab"
                  [attr.aria-pressed]="chosen().includes(g.id)"
                  [attr.aria-selected]="chosen().includes(g.id)"
                  [attr.data-testid]="'balance-god-' + g.id"
                  (click)="toggle(g.id)"
                >
                  {{ g.name }}
                </button>
              }
            </div>
            <label
              >Runs each
              <input type="number" min="1" max="10" [(ngModel)]="runs" data-testid="balance-runs"
            /></label>
            <label
              >Minutes
              <input
                type="number"
                min="1"
                max="20"
                [(ngModel)]="minutes"
                data-testid="balance-minutes"
            /></label>
            <label
              >Realm
              <select [(ngModel)]="realmId" data-testid="balance-realm">
                @for (r of content.realms; track r.id) {
                  <option [value]="r.id">{{ r.name }}</option>
                }
              </select>
            </label>
            @if (running()) {
              <button class="btn" (click)="stop()" data-testid="balance-stop">Stop</button>
            } @else {
              <button
                class="btn btn-primary"
                [disabled]="!chosen().length"
                (click)="start()"
                data-testid="balance-run"
              >
                Run
              </button>
            }
          </div>
          @if (running()) {
            <div
              class="progress"
              role="progressbar"
              aria-label="Balance report"
              [attr.aria-valuenow]="round(progress() * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <span [style.width.%]="progress() * 100"></span>
            </div>
          }
          @if (rows().length) {
            <table class="data-table" data-testid="balance-table">
              <thead>
                <tr>
                  <th>God</th>
                  <th class="num">Runs</th>
                  <th class="num">Realms</th>
                  <th class="num">Level</th>
                  <th class="num">Kills</th>
                  <th class="num">Avg time</th>
                  <th class="num">Alive at end</th>
                  <th>Weapons (taken · damage)</th>
                </tr>
              </thead>
              <tbody>
                @for (r of rows(); track r.godId) {
                  <tr [attr.data-testid]="'balance-row-' + r.godId">
                    <td>{{ godName(r.godId) }}</td>
                    <td class="num">{{ r.runs }}</td>
                    <td class="num">{{ r.realmsCleared.toFixed(2) }}</td>
                    <td class="num">{{ r.level.toFixed(1) }}</td>
                    <td class="num">{{ fmt(r.kills) }}</td>
                    <td class="num">{{ time(r.timeSeconds) }}</td>
                    <td class="num">{{ pct(r.survived) }}</td>
                    <td class="weapons">
                      @for (w of r.weapons; track w.id) {
                        <span
                          >{{ weaponName(w.id) }} {{ pct(w.taken) }} ·
                          {{ pct(w.damageShare) }}</span
                        >
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }

      <a class="btn" routerLink="/">Back</a>
    </main>
  `,
  styles: `
    .lock {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .lock input {
      width: 16em;
    }
    .wrong {
      width: 100%;
      text-align: center;
      color: #ff8a70;
      margin: 0;
    }
    .admin {
      gap: 16px;
      padding-top: 28px;
    }
    .wide {
      width: min(1180px, 100%);
    }
    h2 {
      margin: 0 0 8px;
      font-size: 1.1rem;
      color: var(--gold-2);
    }
    .empty,
    .hint {
      color: var(--muted);
      margin: 0 0 10px;
    }
    .totals {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      align-items: center;
    }
    .totals div {
      display: flex;
      flex-direction: column;
    }
    .totals span {
      color: var(--muted);
      font-size: 0.8rem;
    }
    .totals strong {
      font-size: 1.4rem;
      font-variant-numeric: tabular-nums;
    }
    .totals .exports {
      flex-direction: row;
      gap: 8px;
    }
    .exports .btn {
      padding: 8px 14px;
    }
    .name {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .columns {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 16px;
      align-items: start;
    }
    .chart {
      width: 100%;
      height: 160px;
      display: block;
    }
    .chart .axis {
      stroke: var(--line);
      stroke-width: 1;
    }
    .chart .tick {
      fill: var(--muted);
      font-size: 11px;
    }
    .chart .bar {
      fill: var(--gold);
    }
    .chart .bar:hover {
      fill: var(--gold-2);
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
    label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--muted);
      font-size: 0.85rem;
    }
    input,
    select {
      font: inherit;
      color: var(--text);
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--line);
      padding: 4px 6px;
    }
    input {
      width: 4.5em;
    }
    input.token {
      width: 14em;
    }
    .progress {
      height: 8px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid var(--line);
      margin-bottom: 12px;
    }
    .progress span {
      display: block;
      height: 100%;
      background: var(--gold);
    }
    .weapons {
      display: flex;
      flex-wrap: wrap;
      gap: 2px 12px;
      font-size: 0.8rem;
      color: var(--muted);
    }
    @media (max-width: 860px) {
      .columns {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminScreen {
  private readonly progression = inject(Progression);
  protected readonly events = inject(SeasonalEvents);
  protected readonly unlocked = signal(adminUnlocked());
  protected readonly wrong = signal(false);
  protected password = '';

  // The difficulty dial (spec: difficulty-dial).
  protected readonly server = inject(GameServer);
  private readonly difficulty = inject(Difficulty);
  protected readonly dialFields = (
    [
      ['enemyHealth', 'Enemy health ×'],
      ['enemyDamage', 'Enemy damage ×'],
      ['spawnRate', 'Spawn rate ×'],
      ['realmGrowth', 'Realm growth ×'],
    ] as const
  ).map(([key, label]) => ({ key, label, min: DIAL_LIMITS[key][0], max: DIAL_LIMITS[key][1] }));
  protected dial: Record<keyof DifficultyDial, number> = { ...this.difficulty.current() };
  protected token = '';
  protected readonly saving = signal(false);
  protected readonly dialStatus = signal('');

  protected async loadDial(): Promise<void> {
    await this.difficulty.refresh();
    this.dial = { ...this.difficulty.current() };
    this.dialStatus.set(`Now: ${this.describe(this.difficulty.current())}`);
  }

  protected resetDial(): void {
    this.dial = { ...DEFAULT_DIAL };
  }

  protected async saveDial(): Promise<void> {
    const dial = parseDial(
      Object.fromEntries(Object.entries(this.dial).map(([k, v]) => [k, Number(v)])),
    );
    if (!dial) {
      this.dialStatus.set('Every value must be a number within its limits.');
      return;
    }
    this.saving.set(true);
    try {
      const saved = await this.difficulty.save(dial, this.token);
      this.dial = { ...saved };
      this.dialStatus.set(`Saved for everyone: ${this.describe(saved)}`);
    } catch (e) {
      this.dialStatus.set(
        e instanceof ServerError && e.status === 401
          ? 'The server refused the token.'
          : e instanceof ServerError && e.status === 404
            ? 'The server has no admin token set, so the dial cannot be changed.'
            : 'Could not reach the game server. Try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private describe(d: DifficultyDial): string {
    return `health ×${d.enemyHealth}, damage ×${d.enemyDamage}, spawns ×${d.spawnRate}, realm growth ×${d.realmGrowth}`;
  }

  protected eventForced(id: string): boolean {
    const o = this.events.override();
    return o.mode === 'on' && o.id === id;
  }

  protected async unlock(event: Event): Promise<void> {
    event.preventDefault();
    const ok = await unlockAdmin(this.password);
    this.password = '';
    this.wrong.set(!ok);
    this.unlocked.set(ok);
  }
  protected readonly content: GameContent = inject(GAME_CONTENT);

  protected readonly stats = computed(() => runStatistics(this.progression.save().history));

  /** The latest scores as thin bars on one baseline (single series: the title names it, no legend). */
  protected readonly chart = computed(() => {
    const runs = this.progression.save().history.slice(-CHART_RUNS);
    const width = 760;
    const max = Math.max(1, ...runs.map((r) => r.score));
    const slot = width / Math.max(runs.length, 1);
    const w = Math.max(2, Math.min(18, slot - 2));
    return {
      width,
      max,
      bars: runs.map((r, i) => {
        const h = Math.max(1, (r.score / max) * 120);
        return {
          x: i * slot + (slot - w) / 2,
          y: 140 - h,
          w,
          h,
          label: `${this.godName(r.godId)} · ${this.fmt(r.score)} · ${new Date(r.endedAt).toLocaleString()}`,
        };
      }),
    };
  });

  // Balance report (spec: run-statistics / balance report).
  protected readonly chosen = signal<string[]>(this.content.gods.map((g) => g.id));
  protected runs = 3;
  protected minutes = 8;
  protected realmId = this.content.realms[0]?.id ?? '';
  protected readonly running = signal(false);
  protected readonly progress = signal(0);
  protected readonly rows = signal<readonly BalanceRow[]>([]);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    void this.loadDial();
  }

  protected toggle(godId: string): void {
    this.chosen.update((ids) =>
      ids.includes(godId) ? ids.filter((id) => id !== godId) : [...ids, godId],
    );
  }

  protected start(): void {
    const clamp = (v: number, lo: number, hi: number) =>
      Math.min(hi, Math.max(lo, Math.round(Number(v) || lo)));
    const report = new BalanceReport(this.content, {
      // Kept in the content's order, whatever order they were picked in.
      gods: this.content.gods.map((g) => g.id).filter((id) => this.chosen().includes(id)),
      runsPerGod: clamp(this.runs, 1, 10),
      minutes: clamp(this.minutes, 1, 20),
      realmId: this.realmId,
    });
    this.rows.set([]);
    this.progress.set(0);
    this.running.set(true);
    const slice = () => {
      const more = report.advance(SLICE_STEPS);
      this.progress.set(report.progress);
      this.rows.set(report.rows().filter((r) => r.runs > 0));
      if (more) this.timer = setTimeout(slice, 0);
      else this.running.set(false);
    };
    this.timer = setTimeout(slice, 0);
  }

  protected stop(): void {
    clearTimeout(this.timer);
    this.running.set(false);
  }

  protected exportJson(): void {
    this.download(
      'olympus-runs.json',
      historyJson(this.progression.save().history),
      'application/json',
    );
  }

  protected exportCsv(): void {
    this.download('olympus-runs.csv', historyCsv(this.progression.save().history), 'text/csv');
  }

  /** Saves a file made in the browser; nothing is sent anywhere (D1). */
  private download(name: string, text: string, type: string): void {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  protected godName(id: string): string {
    return this.content.gods.find((g) => g.id === id)?.name ?? id;
  }

  protected godSprite(id: string): string {
    return this.content.gods.find((g) => g.id === id)?.visual.sprite ?? 'icon_gold';
  }

  protected realmName(id: string): string {
    return this.content.realms.find((r) => r.id === id)?.name ?? id;
  }

  protected weaponName(id: string): string {
    return this.content.weapons.find((w) => w.id === id)?.name ?? id;
  }

  protected time(seconds: number): string {
    return formatTime(seconds);
  }

  protected hours(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  }

  protected pct(share: number): string {
    return `${Math.round(share * 100)}%`;
  }

  protected fmt(n: number): string {
    return Math.round(n).toLocaleString('en-US');
  }

  protected round(n: number): number {
    return Math.round(n);
  }
}
