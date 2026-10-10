import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContentIndex, GameContent } from '../../../engine';
import { GAME_CONTENT } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { RunSetup } from '../../core/run-setup';
import { formatTime, ItemIcon } from '../../shared/item-icon';

const TITLES = { victory: 'Victory', defeat: 'Defeat', abandoned: 'Run abandoned' } as const;

/** What happened in the last run and what it earned (spec: run-outcome / run summary). */
@Component({
  selector: 'app-run-summary',
  imports: [ItemIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view(); as v) {
      <main class="screen">
        <h1
          class="screen-title"
          [class.defeat]="v.result.outcome !== 'victory'"
          data-testid="summary-outcome"
        >
          {{ v.title }}
        </h1>
        <p class="screen-subtitle">{{ v.god }} in {{ v.realm }} · seed {{ v.result.seed }}</p>

        <section class="panel stats">
          <div>
            <span>Time</span><strong>{{ v.time }}</strong>
          </div>
          <div>
            <span>Level</span><strong>{{ v.result.level }}</strong>
          </div>
          <div>
            <span>Kills</span><strong>{{ v.result.kills }}</strong>
          </div>
          <div>
            <span>Gold collected</span><strong>{{ v.result.gold }}</strong>
          </div>
        </section>

        <section class="panel rewards">
          <h2>Rewards</h2>
          <p>
            Gold kept: <span class="gold-amount">{{ v.rewards.runGold }}</span>
            @if (v.result.outcome === 'abandoned') {
              <span class="note">(half, run abandoned)</span>
            }
          </p>
          @if (v.rewards.victoryBonus) {
            <p>
              Victory bonus: <span class="gold-amount">{{ v.rewards.victoryBonus }}</span>
            </p>
          }
          <p class="total">
            <app-item-icon sprite="icon_gold" [size]="24" /> +<span
              class="gold-amount"
              data-testid="summary-gold"
              >{{ v.rewards.totalGold }}</span
            >
            gold · total <span class="gold-amount">{{ progression.gold() }}</span>
          </p>
          @if (v.rewards.newBestTime) {
            <p class="best">New best survival time!</p>
          }
          @if (v.discovered.length) {
            <h3>Discovered</h3>
            <ul class="items">
              @for (item of v.discovered; track item.id) {
                <li><app-item-icon [sprite]="item.sprite" [size]="36" /> {{ item.name }}</li>
              }
            </ul>
          }
        </section>

        <section class="panel build">
          <h2>Final build</h2>
          <ul class="items">
            @for (w of v.weapons; track w.id) {
              <li>
                <app-item-icon [sprite]="w.sprite" [size]="36" />
                <span
                  >{{ w.name }} <span class="tag">Lv {{ w.level }}</span></span
                >
                <span class="damage">{{ w.damage }} dmg</span>
              </li>
            }
            @for (i of v.others; track i.id) {
              <li>
                <app-item-icon [sprite]="i.sprite" [size]="36" /> <span>{{ i.name }}</span>
              </li>
            }
          </ul>
          @if (v.synergies.length) {
            <p class="synergies">Synergies: {{ v.synergies.join(', ') }}</p>
          }
        </section>

        <div class="actions">
          <a class="btn" routerLink="/" data-testid="to-menu">Main menu</a>
          <button class="btn btn-primary" data-testid="play-again" (click)="playAgain()">
            Play again
          </button>
        </div>
      </main>
    } @else {
      <main class="screen">
        <p>No run to show.</p>
        <a class="btn" routerLink="/">Main menu</a>
      </main>
    }
  `,
  styles: `
    .screen-title.defeat {
      color: #ff8a70;
    }
    .panel {
      width: min(640px, 100%);
      padding: 18px 22px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
    }
    .stats div {
      display: flex;
      flex-direction: column;
    }
    .stats span {
      color: var(--muted);
      font-size: 0.8rem;
    }
    .stats strong {
      font-size: 1.5rem;
      font-variant-numeric: tabular-nums;
    }
    h2 {
      font-size: 1.2rem;
      color: var(--gold);
      margin-bottom: 10px;
    }
    h3 {
      font-size: 1rem;
      margin: 12px 0 8px;
    }
    p {
      margin: 4px 0;
    }
    .total {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      font-size: 1.1rem;
    }
    .note {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .best {
      color: var(--ok);
    }
    .items {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }
    .items li {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .damage {
      margin-left: auto;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }
    .synergies {
      margin-top: 12px;
      color: var(--gold-2);
    }
  `,
})
export class RunSummary {
  private readonly content: GameContent = inject(GAME_CONTENT);
  private readonly index = new ContentIndex(this.content);
  private readonly setup = inject(RunSetup);
  private readonly router = inject(Router);
  protected readonly progression = inject(Progression);

  protected readonly view = computed(() => {
    const run = this.setup.lastRun();
    if (!run) return undefined;
    const { result, rewards } = run;
    const idx = this.index;
    const item = (kind: 'weapons' | 'armour' | 'relics', id: string) => {
      const def =
        kind === 'weapons'
          ? idx.weapons.get(id)
          : kind === 'armour'
            ? idx.armour.get(id)
            : idx.relics.get(id);
      return { id, name: def?.name ?? id, sprite: def?.visual.sprite ?? id };
    };
    return {
      result,
      rewards,
      title: TITLES[result.outcome],
      time: formatTime(result.timeSeconds),
      god: idx.gods.get(result.godId)?.name ?? result.godId,
      realm: idx.realms.get(result.realmId)?.name ?? result.realmId,
      weapons: result.loadout.weapons.map((w) => ({
        ...item('weapons', w.id),
        level: w.level,
        damage: w.damage,
      })),
      others: [
        ...(result.loadout.armour ? [item('armour', result.loadout.armour.id)] : []),
        ...result.loadout.relics.map((id) => item('relics', id)),
      ],
      synergies: result.loadout.synergies.map(
        (id) => this.content.synergies.find((s) => s.id === id)?.name ?? id,
      ),
      discovered: rewards.newlyDiscovered.map((d) => item(d.kind, d.id)),
    };
  });

  protected playAgain(): void {
    this.setup.rerollSeed();
    void this.router.navigate(['/play']);
  }
}
