import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GAME_CONTENT } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { RunSetup } from '../../core/run-setup';
import { TouchScreen } from '../../core/touch-screen';
import { formatTime, ItemIcon } from '../../shared/item-icon';

/**
 * Today's Daily Trial (spec: daily-trial / the day's trial): the same god, realm, seed and twist for everyone today,
 * the player's best so far, and Begin.
 */
@Component({
  selector: 'app-daily-trial-screen',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let v = view();
    <main class="screen daily">
      <h1 class="screen-title">Daily Trial</h1>
      <p class="screen-subtitle" data-testid="trial-date">
        {{ longDate() }} · the same trial for everyone today
      </p>

      <section class="panel trial" aria-label="Today's trial">
        <div class="pair">
          <div class="who" data-testid="trial-god">
            <app-item-icon [sprite]="god().visual.sprite" [size]="72" />
            <span>
              <span class="label">God</span>
              <strong>{{ god().name }}</strong>
              <em>{{ god().title }}</em>
            </span>
          </div>
          <div class="who" data-testid="trial-realm">
            <app-item-icon [sprite]="bossSprite()" [size]="72" />
            <span>
              <span class="label">Realm</span>
              <strong>{{ realm().name }}</strong>
              <em>Guarded by {{ bossName() }}</em>
            </span>
          </div>
        </div>
        <div class="twist" data-testid="trial-twist">
          <span class="label">Today's twist</span>
          <h2>{{ v.trial.twist.name }}</h2>
          <p>{{ v.trial.twist.description }}</p>
        </div>
        <p class="best" data-testid="trial-best">
          @if (v.best; as b) {
            Best today <strong>{{ fmt(b.score) }}</strong>
            <span
              >· {{ time(b.timeSeconds) }} · {{ fmt(b.kills) }} kills · level {{ b.level }}</span
            >
            <span>· {{ v.attempts }} {{ v.attempts === 1 ? 'attempt' : 'attempts' }}</span>
          } @else {
            Not played yet today. Every attempt counts; your best is kept.
          }
        </p>
      </section>

      <div class="actions sticky">
        <a class="btn" routerLink="/">Back</a>
        <button class="btn btn-primary" data-testid="trial-begin" (click)="begin()">
          {{ v.playedToday ? 'Try again' : 'Begin' }}
        </button>
      </div>
    </main>
  `,
  styles: `
    .trial {
      width: min(720px, 100%);
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .pair {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .who {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .who > span {
      display: flex;
      flex-direction: column;
    }
    .who strong {
      font-family: var(--serif);
      font-size: 1.35rem;
      color: var(--gold-2);
    }
    .who em,
    .twist p {
      color: var(--muted);
    }
    .label {
      font-family: var(--display);
      font-size: 0.68rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .twist {
      padding: 12px 16px;
      border-left: 3px solid var(--gold);
      background: linear-gradient(90deg, rgba(60, 40, 10, 0.55), transparent);
    }
    .twist h2 {
      margin: 2px 0 4px;
      color: var(--gold-2);
    }
    .twist p,
    .best {
      margin: 0;
    }
    .best strong {
      font-size: 1.3rem;
      color: var(--gold-2);
    }
    .best span {
      color: var(--muted);
    }
  `,
})
export class DailyTrialScreen {
  private readonly content = inject(GAME_CONTENT);
  private readonly progression = inject(Progression);
  private readonly setup = inject(RunSetup);
  private readonly router = inject(Router);
  private readonly touchScreen = inject(TouchScreen);

  protected readonly view = computed(() => {
    this.progression.save();
    return this.progression.trialToday();
  });
  protected readonly god = computed(
    () => this.content.gods.find((g) => g.id === this.view().trial.godId) ?? this.content.gods[0],
  );
  protected readonly realm = computed(
    () =>
      this.content.realms.find((r) => r.id === this.view().trial.realmId) ?? this.content.realms[0],
  );
  private readonly boss = computed(() =>
    this.content.bosses.find((b) => b.id === this.realm().boss.id),
  );
  protected readonly bossName = computed(() => this.boss()?.name ?? '');
  protected readonly bossSprite = computed(() => this.boss()?.visual.sprite ?? '');
  protected readonly longDate = computed(() => {
    const [y, m, d] = this.view().trial.date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  });

  protected fmt(n: number): string {
    return Math.floor(n).toLocaleString('en-US');
  }

  protected time(seconds: number): string {
    return formatTime(seconds);
  }

  /** The trial is solo, at its own pace, with its own seed (spec: daily-trial). */
  protected begin(): void {
    const trial = this.view().trial;
    this.setup.godId.set(trial.godId);
    this.setup.realmId.set(trial.realmId);
    this.setup.seed.set(trial.seed);
    this.setup.special.set({ kind: 'daily', trial });
    this.touchScreen.enterFullscreen();
    void this.router.navigate(['/play']);
  }
}
