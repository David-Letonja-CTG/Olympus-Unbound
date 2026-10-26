import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameContent, PermanentUpgradeDefinition } from '../../../engine';
import { GAME_CONTENT } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { SeasonalEvents } from '../../core/seasonal-events';
import { formatTime, ItemIcon } from '../../shared/item-icon';

interface CodexItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly sprite: string;
  readonly known: boolean;
  /** A fusion's tier (spec: meta-progression / codex and statistics). */
  readonly tier?: string;
}

interface CodexGroup {
  readonly title: string;
  readonly items: readonly CodexItem[];
  readonly found: number;
}

/**
 * Permanent upgrades, codex and statistics (spec: meta-progression), on one screen without scrolling: the blessings
 * on the left, the codex as an icon grid with a tab per kind on the right, and the statistics in the header.
 */
@Component({
  selector: 'app-progression-screen',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen progression">
      <header class="top">
        <h1 class="screen-title">Progression</h1>
        <div class="summary">
          <p class="gold">
            <app-item-icon sprite="icon_gold" [size]="22" />
            <span class="gold-amount" data-testid="progression-gold">{{ progression.gold() }}</span>
            gold
          </p>
          @let s = progression.save().stats;
          <dl class="stats" aria-label="Statistics">
            <div>
              <dt>Runs</dt>
              <dd>{{ s.runs }}</dd>
            </div>
            <div>
              <dt>Realms cleared</dt>
              <dd>{{ s.victories }}</dd>
            </div>
            <div>
              <dt>Total kills</dt>
              <dd>{{ s.kills }}</dd>
            </div>
            <div>
              <dt>Best time</dt>
              <dd>{{ best() }}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div class="columns">
        <section class="panel blessings" aria-labelledby="blessings-title">
          <h2 id="blessings-title">Blessings of Olympus</h2>
          <p class="hint">Permanent upgrades apply to every run.</p>
          <ul class="upgrades">
            @for (u of upgrades; track u.id) {
              @let level = progression.level(u);
              @let cost = progression.nextCost(u);
              <li [attr.data-testid]="'upgrade-' + u.id">
                <div class="info">
                  <span class="name-row">
                    <strong>{{ u.name }}</strong>
                    <span
                      class="pips"
                      [attr.aria-label]="'Level ' + level + ' of ' + u.costs.length"
                    >
                      @for (c of u.costs; track $index) {
                        <span class="pip" [class.on]="$index < level"></span>
                      }
                    </span>
                  </span>
                  <span class="desc">{{ u.description }}</span>
                </div>
                @if (cost !== undefined) {
                  <button
                    class="btn buy"
                    [disabled]="!progression.canBuy(u)"
                    (click)="progression.buy(u)"
                    [attr.data-testid]="'buy-' + u.id"
                  >
                    <app-item-icon sprite="icon_gold" [size]="16" />
                    <span class="gold-amount">{{ cost }}</span>
                  </button>
                } @else {
                  <span class="tag">Max</span>
                }
              </li>
            }
          </ul>
          <!-- Each event's shop while it is on or its cakes remain (spec: seasonal-events / event shop). -->
          @for (shop of shops(); track shop.event.id) {
            <div class="event-shop" [attr.data-testid]="'event-shop-' + shop.event.id">
              <h3>
                {{ shop.event.name }}
                <span class="tokens" [attr.data-testid]="'event-tokens-' + shop.event.id">
                  <app-item-icon [sprite]="shop.event.currency.sprite" [size]="16" />
                  {{ progression.tokens(shop.event.id) }}
                  {{ shop.event.currency.name.toLowerCase() }}
                </span>
              </h3>
              <ul class="upgrades">
                @for (r of shop.rewards; track r.id) {
                  <li [attr.data-testid]="'reward-' + r.id">
                    <div class="info">
                      <span class="name-row"
                        ><strong>{{ r.name }}</strong></span
                      >
                      <span class="desc">{{ r.description }}</span>
                    </div>
                    @if (progression.owns(r)) {
                      <span class="tag">Owned</span>
                    } @else {
                      <button
                        class="btn buy"
                        [disabled]="!progression.canBuyReward(r)"
                        (click)="progression.buyReward(r)"
                        [attr.data-testid]="'buy-' + r.id"
                      >
                        <app-item-icon [sprite]="shop.event.currency.sprite" [size]="16" />
                        <span>{{ r.cost }}</span>
                      </button>
                    }
                  </li>
                }
              </ul>
            </div>
          }
        </section>

        <section class="panel codex-panel" aria-labelledby="codex-title">
          <div class="codex-head">
            <h2 id="codex-title">Codex</h2>
            <div class="tabs" role="tablist" aria-label="Codex">
              @for (g of codex(); track g.title; let i = $index) {
                <button
                  role="tab"
                  class="tab"
                  [attr.aria-selected]="tab() === i"
                  [attr.data-testid]="'codex-tab-' + g.title.toLowerCase()"
                  (click)="selectTab(i)"
                >
                  {{ g.title }} <span class="count">{{ g.found }}/{{ g.items.length }}</span>
                </button>
              }
            </div>
          </div>
          @if (group(); as g) {
            <ul class="codex" role="tabpanel" [attr.aria-label]="g.title">
              @for (item of g.items; track item.id) {
                <li>
                  <button
                    class="tile"
                    [class.unknown]="!item.known"
                    [class.selected]="selected()?.id === item.id"
                    [attr.data-testid]="'codex-' + item.id"
                    [attr.data-known]="item.known"
                    [attr.aria-label]="item.known ? item.name : 'Undiscovered'"
                    [attr.title]="item.known ? item.name : 'Undiscovered'"
                    (click)="selectedId.set(item.id)"
                    (mouseenter)="selectedId.set(item.id)"
                    (focus)="selectedId.set(item.id)"
                  >
                    @if (item.known) {
                      <app-item-icon [sprite]="item.sprite" [size]="48" />
                    } @else {
                      <span class="mystery" aria-hidden="true">?</span>
                    }
                  </button>
                </li>
              }
            </ul>
            <div class="detail" aria-live="polite" data-testid="codex-detail">
              @if (selected(); as item) {
                @if (item.known) {
                  <app-item-icon [sprite]="item.sprite" [size]="56" />
                  <div>
                    <strong>{{ item.name }}</strong>
                    @if (item.tier) {
                      <span class="tier">Fusion · Tier {{ item.tier }}</span>
                    }
                    <p class="desc">{{ item.description }}</p>
                  </div>
                } @else {
                  <span class="mystery big" aria-hidden="true">?</span>
                  <div>
                    <strong>Undiscovered</strong>
                    <p class="desc">Hold it at the end of a run to add it to the codex.</p>
                  </div>
                }
              } @else {
                <p class="desc">Point at an item to read about it.</p>
              }
            </div>
          }
        </section>
      </div>

      <a class="btn" routerLink="/">Back</a>
    </main>
  `,
  styles: `
    /* One screen, no scrolling (wide enough windows); narrow or short windows fall back to a scrolling column. */
    .progression {
      height: 100vh;
      min-height: 0;
      padding: 24px 24px 20px;
      gap: 14px;
      overflow: hidden;
      justify-content: center;
    }
    .top {
      width: min(1180px, 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .top .screen-title {
      text-align: left;
      margin: 0;
    }
    .top .screen-title::after {
      margin-left: 0;
    }
    .summary {
      display: flex;
      align-items: center;
      gap: 28px;
    }
    .gold {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 0;
      font-size: 1.3rem;
    }
    .stats {
      display: flex;
      gap: 22px;
      margin: 0;
    }
    dt {
      color: var(--muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    dd {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
    }
    .columns {
      flex: 1;
      min-height: 0;
      /* Tall windows: the panels stay compact and the page centres. */
      max-height: 600px;
      width: min(1180px, 100%);
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
      gap: 18px;
    }
    .panel {
      min-height: 0;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
    }
    h2 {
      color: var(--gold);
      font-size: 1.15rem;
      margin: 0;
    }
    /* With an event shop the blessings outgrow their panel: it scrolls within the page. */
    .blessings {
      overflow-y: auto;
    }
    .event-shop {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 138, 42, 0.45);
    }
    .event-shop h3 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin: 0 0 6px;
      font-size: 0.9rem;
      color: #ffb070;
    }
    .event-shop .tokens {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      color: var(--gold-2);
    }
    .tier {
      display: block;
      color: var(--gold);
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .count,
    .hint,
    .desc {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .hint {
      margin: 2px 0 10px;
    }
    .upgrades {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 8px;
      flex: 1;
      align-content: start;
    }
    .upgrades li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 12px;
      border: 1px solid var(--line);
      background: var(--bg-2);
    }
    .info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .name-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pips {
      display: flex;
      gap: 3px;
    }
    .pip {
      width: 12px;
      height: 5px;
      border-radius: 3px;
      background: #3a3448;
    }
    .pip.on {
      background: var(--gold);
    }
    .buy {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      min-width: 86px;
      justify-content: center;
    }
    .codex-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .tabs {
      display: flex;
      gap: 4px;
    }
    .codex {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
      gap: 8px;
      align-content: start;
      flex: 1;
      min-height: 0;
    }
    .tile {
      width: 100%;
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      padding: 0;
      background: var(--bg-2);
      border: 1px solid var(--line);
      cursor: pointer;
    }
    .tile.unknown {
      opacity: 0.55;
    }
    .tile.selected,
    .tile:focus-visible {
      border-color: var(--gold);
      box-shadow: 0 0 0 1px var(--gold);
      outline: none;
    }
    .mystery {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      border: 1px dashed var(--line);
      font-family: var(--serif);
      font-size: 1.3rem;
      color: var(--muted);
    }
    .mystery.big {
      width: 56px;
      height: 56px;
      flex: none;
    }
    .detail {
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: 84px;
      margin-top: 12px;
      padding: 10px 12px;
      border-top: 1px solid var(--line);
    }
    .detail p {
      margin: 4px 0 0;
    }
    @media (max-width: 900px), (max-height: 620px) {
      .progression {
        height: auto;
        min-height: 100%;
        overflow: visible;
      }
      .top {
        flex-direction: column;
      }
      .top .screen-title {
        text-align: center;
      }
      .top .screen-title::after {
        margin-left: auto;
      }
      .summary {
        flex-wrap: wrap;
        justify-content: center;
      }
      .columns {
        grid-template-columns: 1fr;
        max-height: none;
      }
    }
  `,
})
export class ProgressionScreen {
  private readonly content: GameContent = inject(GAME_CONTENT);
  protected readonly progression = inject(Progression);
  protected readonly upgrades: readonly PermanentUpgradeDefinition[] =
    this.content.permanentUpgrades;
  protected readonly best = computed(() =>
    formatTime(this.progression.save().stats.bestTimeSeconds),
  );
  protected readonly tab = signal(0);
  private readonly events = inject(SeasonalEvents);

  /** The event shops to show: the event on now, and any whose currency or rewards the player holds. */
  protected readonly shops = computed(() => {
    const save = this.progression.save();
    const active = this.events.active()?.id;
    return this.content.events
      .map((event) => ({
        event,
        rewards: this.content.eventRewards.filter((r) => r.event === event.id),
      }))
      .filter(
        ({ event, rewards }) =>
          rewards.length > 0 &&
          (event.id === active ||
            (save.eventTokens[event.id] ?? 0) > 0 ||
            rewards.some((r) => save.eventRewards.includes(r.id))),
      );
  });
  protected readonly selectedId = signal<string | undefined>(undefined);

  protected readonly codex = computed<readonly CodexGroup[]>(() => {
    const d = this.progression.save().discovered;
    const group = (
      title: string,
      items: readonly {
        id: string;
        name: string;
        description: string;
        visual: { sprite: string };
        tier?: number;
      }[],
      known: readonly string[],
    ): CodexGroup => {
      const list = items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        sprite: i.visual.sprite,
        known: known.includes(i.id),
        tier: i.tier ? ['I', 'II', 'III'][i.tier - 1] : undefined,
      }));
      return { title, items: list, found: list.filter((i) => i.known).length };
    };
    return [
      group('Weapons', this.content.weapons, d.weapons),
      group('Armour', this.content.armour, d.armour),
      group('Relics', this.content.relics, d.relics),
      group('Fusions', this.content.fusions, d.fusions),
    ];
  });
  protected readonly group = computed(() => this.codex()[this.tab()]);
  protected readonly selected = computed(() =>
    this.group()?.items.find((i) => i.id === this.selectedId()),
  );

  protected selectTab(index: number): void {
    this.tab.set(index);
    this.selectedId.set(undefined);
  }
}
