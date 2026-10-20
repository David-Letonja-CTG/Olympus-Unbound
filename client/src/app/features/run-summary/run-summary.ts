import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContentIndex, GameContent, RunResult } from '../../../engine';
import { challengeLink } from '../../core/challenge';
import { scoreOf } from '../../core/save/glory';
import { drawShareCard, shareRun } from '../../core/share-card';
import { GAME_CONTENT } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { RunSetup } from '../../core/run-setup';
import { TouchScreen } from '../../core/touch-screen';
import { formatTime, ItemIcon, spriteImageUrl } from '../../shared/item-icon';

const TITLES = { defeat: 'You have fallen', abandoned: 'Run abandoned' } as const;

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
          [class.defeat]="v.result.outcome === 'defeat'"
          data-testid="summary-outcome"
        >
          {{ v.title }}
        </h1>
        @if (v.kind) {
          <p class="kind" data-testid="summary-kind">{{ v.kind }}</p>
        }
        <p class="screen-subtitle">
          {{ v.god }} from {{ v.realm }} to {{ v.reached }} · seed {{ v.result.seed }}
          @if (v.result.bots) {
            <span data-testid="summary-allies"
              >· with {{ v.result.bots }} {{ v.result.bots === 1 ? 'ally' : 'allies' }}</span
            >
          }
        </p>

        <section class="panel stats">
          <div>
            <span>Time</span><strong>{{ v.time }}</strong>
          </div>
          <div>
            <span>Realms cleared</span
            ><strong data-testid="summary-realms">{{ v.result.realmsCleared }}</strong>
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

        @if (!v.rewards.alreadyProcessed) {
          <section class="panel glory" data-testid="summary-glory">
            <h2>Glory</h2>
            <p class="score">
              Score <strong data-testid="summary-score">{{ fmt(v.rewards.glory.score) }}</strong>
              @if (v.rewards.glory.highScore; as hs) {
                <span class="record" data-testid="summary-high-score"
                  >New {{ hs.mode === 'coop' ? 'co-op ' : hs.mode === 'quick' ? 'quick ' : '' }}high
                  score{{ hs.mode === 'allies' ? ' with allies' : '' }} · #{{ hs.rank }}</span
                >
              }
            </p>
            <!-- The day's trial and challenges (spec: daily-trial). -->
            @if (v.rewards.glory.trial; as t) {
              <p class="trial" data-testid="summary-trial">
                @if (t.newBest) {
                  <span class="record">New best today</span>
                } @else {
                  Best today <strong>{{ fmt(t.best) }}</strong>
                }
                · attempt {{ t.attempts }}
              </p>
            }
            @if (toBeat(); as target) {
              <p class="trial" data-testid="summary-to-beat">
                Score to beat {{ fmt(target) }} ·
                @if (v.rewards.glory.score > target) {
                  <span class="record">Beaten!</span>
                } @else {
                  not this time
                }
              </p>
            }
            @if (v.rewards.glory.achievements.length) {
              <h3>Achievements unlocked</h3>
              <ul class="items">
                @for (a of v.rewards.glory.achievements; track a.id) {
                  <li [attr.data-testid]="'summary-achievement-' + a.id">
                    <app-item-icon [sprite]="a.sprite" [size]="32" />
                    <span
                      ><strong>{{ a.name }}</strong> · {{ a.description }}</span
                    >
                    <span class="damage">+{{ a.gold }} gold</span>
                  </li>
                }
              </ul>
            }
            @if (v.rewards.glory.quests.length) {
              <h3>Daily quests completed</h3>
              <ul class="items">
                @for (q of v.rewards.glory.quests; track q.id) {
                  <li [attr.data-testid]="'summary-quest-' + q.id">
                    <span class="check" aria-hidden="true">✔</span>
                    <span>{{ q.description }}</span>
                    <span class="damage">+{{ q.gold }} gold</span>
                  </li>
                }
              </ul>
            }
          </section>
        }

        <section class="panel rewards">
          <h2>Rewards</h2>
          <p>
            Gold kept: <span class="gold-amount">{{ v.rewards.runGold }}</span>
            @if (v.result.outcome === 'abandoned') {
              <span class="note">(half, run abandoned)</span>
            }
          </p>
          @if (v.rewards.glory.gold) {
            <p>
              Glory: <span class="gold-amount">{{ v.rewards.glory.gold }}</span>
              <span class="note">(achievements and quests)</span>
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

        <div class="actions sticky">
          <a class="btn" routerLink="/" data-testid="to-menu">Main menu</a>
          <button class="btn" data-testid="share" [disabled]="sharing()" (click)="share()">
            Share
          </button>
          @if (inRoom()) {
            <a class="btn btn-primary" routerLink="/coop" data-testid="to-coop">Co-op</a>
          } @else {
            <button class="btn btn-primary" data-testid="play-again" (click)="playAgain()">
              Play again
            </button>
          }
        </div>
      </main>
      @if (shareStatus(); as status) {
        <p class="share-status" role="status" data-testid="share-status">{{ status }}</p>
      }
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
    .kind {
      margin: -6px 0 0;
      font-family: var(--display);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--gold-2);
    }
    .trial {
      margin: 6px 0 0;
    }
    .share-status {
      position: fixed;
      left: 50%;
      bottom: calc(96px + env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      z-index: 6;
      margin: 0;
      padding: 8px 16px;
      max-width: calc(100% - 32px);
      text-align: center;
      background: rgba(12, 10, 14, 0.94);
      border: 1px solid var(--line);
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
    .score {
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }
    .score strong {
      font-size: 1.6rem;
      color: var(--gold-2);
      font-variant-numeric: tabular-nums;
    }
    .record {
      color: var(--ok);
      font-family: var(--display);
      letter-spacing: 0.08em;
    }
    .check {
      color: var(--gold);
      width: 32px;
      text-align: center;
    }
  `,
})
export class RunSummary {
  private readonly content: GameContent = inject(GAME_CONTENT);
  private readonly index = new ContentIndex(this.content);
  private readonly setup = inject(RunSetup);
  private readonly router = inject(Router);
  private readonly touchScreen = inject(TouchScreen);
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
      reached: idx.realms.get(result.realmReached)?.name ?? result.realmReached,
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
      kind: this.kindOf(result),
    };
  });

  /** The challenge's score to beat, when this run was one (spec: daily-trial / challenge links). */
  protected readonly toBeat = computed(() => {
    const special = this.setup.special();
    const kind = this.setup.lastRun()?.result.variant?.kind;
    return kind === 'challenge' && special?.kind === 'challenge'
      ? special.challenge.toBeat
      : undefined;
  });
  protected readonly sharing = signal(false);
  protected readonly shareStatus = signal<string | undefined>(undefined);

  protected readonly inRoom = computed(() => !!this.setup.lastRun()?.inRoom);

  protected fmt(n: number): string {
    return Math.floor(n).toLocaleString('en-US');
  }

  /** "Daily Trial · Tuesday 21 October · Swift Foes", "Quick run", "Challenge · …", or nothing. */
  private kindOf(result: RunResult): string {
    const v = result.variant;
    const twist = (id?: string) => this.content.twists.find((t) => t.id === id)?.name;
    if (v?.kind === 'quick') return 'Quick run';
    if (v?.kind === 'daily') {
      const [y, m, d] = v.date.split('-').map(Number);
      const date = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      return ['Daily Trial', date, twist(v.twistId)].filter(Boolean).join(' · ');
    }
    if (v?.kind === 'challenge')
      return ['Challenge', v.quick ? 'quick run' : '', twist(v.twistId)]
        .filter(Boolean)
        .join(' · ');
    return '';
  }

  /**
   * Shares a picture of the run and a challenge link (spec: daily-trial / sharing a run): the share sheet where the
   * browser can share files, otherwise the picture is saved and the link copied.
   */
  protected async share(): Promise<void> {
    const v = this.view();
    if (!v || this.sharing()) return;
    this.sharing.set(true);
    this.shareStatus.set(undefined);
    try {
      const god = this.index.gods.get(v.result.godId);
      const site = new URL(document.baseURI);
      const blob = await drawShareCard({
        god: v.god,
        godImage: god
          ? await spriteImageUrl(this.content.assets, god.visual.sprite, 360)
          : undefined,
        realm: v.realm,
        kind: v.kind,
        time: v.time,
        kills: v.result.kills,
        level: v.result.level,
        realmsCleared: v.result.realmsCleared,
        score: scoreOf(v.result),
        site: (site.host + site.pathname).replace(/\/$/, ''),
      });
      if (!blob) throw new Error('no picture');
      const link = challengeLink(document.baseURI, v.result);
      const text = `I scored ${this.fmt(scoreOf(v.result))} as ${v.god} in Olympus Unbound. Can you beat it?`;
      const { outcome, copied } = await shareRun(blob, link, text);
      this.shareStatus.set(
        outcome === 'shared'
          ? 'Shared.'
          : outcome === 'cancelled'
            ? undefined
            : copied
              ? 'Picture saved, and the challenge link copied.'
              : 'Picture saved. Challenge link: ' + link,
      );
    } catch {
      this.shareStatus.set('Sharing is not available here.');
    } finally {
      this.sharing.set(false);
    }
  }

  protected playAgain(): void {
    this.setup.rerollSeed();
    this.touchScreen.enterFullscreen();
    void this.router.navigate(['/play']);
  }
}
