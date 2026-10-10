import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameContent, PermanentUpgradeDefinition } from '../../../engine';
import { GAME_CONTENT } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { formatTime, ItemIcon } from '../../shared/item-icon';

/** Permanent upgrades, codex and statistics (spec: meta-progression). */
@Component({
  selector: 'app-progression-screen',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen">
      <h1 class="screen-title">Progression</h1>
      <p class="gold">
        <app-item-icon sprite="icon_gold" [size]="22" />
        <span class="gold-amount" data-testid="progression-gold">{{ progression.gold() }}</span>
        gold
      </p>

      <section class="panel">
        <h2>Blessings of Olympus</h2>
        <p class="hint">Permanent upgrades apply to every run.</p>
        <ul class="upgrades">
          @for (u of upgrades; track u.id) {
            @let level = progression.level(u);
            @let cost = progression.nextCost(u);
            <li [attr.data-testid]="'upgrade-' + u.id">
              <div class="info">
                <strong>{{ u.name }}</strong>
                <span class="desc">{{ u.description }}</span>
                <span class="pips" [attr.aria-label]="'Level ' + level + ' of ' + u.costs.length">
                  @for (c of u.costs; track $index) {
                    <span class="pip" [class.on]="$index < level"></span>
                  }
                </span>
              </div>
              @if (cost !== undefined) {
                <button
                  class="btn"
                  [disabled]="!progression.canBuy(u)"
                  (click)="progression.buy(u)"
                  [attr.data-testid]="'buy-' + u.id"
                >
                  Buy · <span class="gold-amount">{{ cost }}</span>
                </button>
              } @else {
                <span class="tag">Max</span>
              }
            </li>
          }
        </ul>
      </section>

      <section class="panel">
        <h2>Codex</h2>
        @for (group of codex(); track group.title) {
          <h3>
            {{ group.title }}
            <span class="count">{{ group.found }} / {{ group.items.length }}</span>
          </h3>
          <ul class="codex">
            @for (item of group.items; track item.id) {
              <li
                [class.unknown]="!item.known"
                [attr.data-testid]="'codex-' + item.id"
                [attr.data-known]="item.known"
              >
                @if (item.known) {
                  <app-item-icon [sprite]="item.sprite" [size]="40" />
                  <span
                    ><strong>{{ item.name }}</strong
                    ><br /><span class="desc">{{ item.description }}</span></span
                  >
                } @else {
                  <span class="mystery" aria-hidden="true">?</span>
                  <span class="desc">Undiscovered</span>
                }
              </li>
            }
          </ul>
        }
      </section>

      <section class="panel">
        <h2>Statistics</h2>
        @let s = progression.save().stats;
        <dl class="stats">
          <div>
            <dt>Runs</dt>
            <dd>{{ s.runs }}</dd>
          </div>
          <div>
            <dt>Victories</dt>
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
      </section>

      <a class="btn" routerLink="/">Back</a>
    </main>
  `,
  styles: `
    .panel {
      width: min(760px, 100%);
      padding: 18px 22px;
    }
    h2 {
      color: var(--gold);
      font-size: 1.25rem;
    }
    h3 {
      font-size: 1rem;
      margin: 16px 0 8px;
      display: flex;
      gap: 8px;
      align-items: baseline;
    }
    .count,
    .hint,
    .desc {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .hint {
      margin: 4px 0 12px;
    }
    .gold {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: -8px 0 0;
      font-size: 1.2rem;
    }
    .upgrades {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 10px;
    }
    .upgrades li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--bg-2);
    }
    .info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .pips {
      display: flex;
      gap: 4px;
    }
    .pip {
      width: 14px;
      height: 6px;
      border-radius: 3px;
      background: #3a3448;
    }
    .pip.on {
      background: var(--gold);
    }
    .codex {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 8px;
    }
    .codex li {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 8px;
      border-radius: 10px;
      background: var(--bg-2);
    }
    .codex li.unknown {
      opacity: 0.55;
    }
    .mystery {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      border: 1px dashed var(--line);
      font-family: var(--serif);
      font-size: 1.3rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin: 12px 0 0;
    }
    dt {
      color: var(--muted);
      font-size: 0.8rem;
    }
    dd {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
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

  protected readonly codex = computed(() => {
    const d = this.progression.save().discovered;
    const group = (
      title: string,
      items: readonly {
        id: string;
        name: string;
        description: string;
        visual: { sprite: string };
      }[],
      known: readonly string[],
    ) => {
      const list = items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        sprite: i.visual.sprite,
        known: known.includes(i.id),
      }));
      return { title, items: list, found: list.filter((i) => i.known).length };
    };
    return [
      group('Weapons', this.content.weapons, d.weapons),
      group('Armour', this.content.armour, d.armour),
      group('Relics', this.content.relics, d.relics),
    ];
  });
}
