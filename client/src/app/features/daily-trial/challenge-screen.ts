import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Challenge, parseChallenge } from '../../core/challenge';
import { GAME_CONTENT } from '../../core/game-content';
import { RunSetup } from '../../core/run-setup';
import { TouchScreen } from '../../core/touch-screen';
import { ItemIcon } from '../../shared/item-icon';

/**
 * A challenge from a shared link (spec: daily-trial / challenge links): the same god, realm, seed, length and twist,
 * with the score to beat, and Accept. A broken link goes to the main menu.
 */
@Component({
  selector: 'app-challenge-screen',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (challenge(); as c) {
      <main class="screen">
        <h1 class="screen-title" data-testid="challenge-title">
          {{ c.from ? c.from + ' challenges you' : 'A challenge' }}
        </h1>
        <p class="screen-subtitle">
          {{ c.from ?? 'Someone' }} played this run and dares you to beat it.
        </p>

        <section class="panel challenge" aria-label="The challenge">
          <div class="who" data-testid="challenge-god">
            <app-item-icon [sprite]="god(c).visual.sprite" [size]="64" />
            <span>
              <strong>{{ god(c).name }}</strong>
              <em>in {{ realm(c).name }}{{ c.quick ? ' · quick run' : '' }}</em>
            </span>
          </div>
          @if (c.twist; as t) {
            <div class="twist" data-testid="challenge-twist">
              <span class="label">Twist</span>
              <strong>{{ t.name }}</strong>
              <p>{{ t.description }}</p>
            </div>
          }
          <p class="facts">
            Seed {{ c.seed }}
            @if (c.toBeat !== undefined) {
              · Score to beat <strong data-testid="challenge-to-beat">{{ fmt(c.toBeat) }}</strong>
            }
          </p>
        </section>

        <div class="actions sticky">
          <a class="btn" routerLink="/">Not now</a>
          <button class="btn btn-primary" data-testid="challenge-accept" (click)="accept(c)">
            Accept
          </button>
        </div>
      </main>
    }
  `,
  styles: `
    .challenge {
      width: min(620px, 100%);
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
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
      font-size: 1.4rem;
      color: var(--gold-2);
    }
    .who em,
    .twist p {
      color: var(--muted);
    }
    .twist {
      padding: 10px 14px;
      border-left: 3px solid var(--gold);
      background: linear-gradient(90deg, rgba(60, 40, 10, 0.55), transparent);
    }
    .twist strong {
      display: block;
      color: var(--gold-2);
    }
    .twist p,
    .facts {
      margin: 0;
    }
    .facts strong {
      color: var(--gold-2);
      font-size: 1.2rem;
    }
    .label {
      font-family: var(--display);
      font-size: 0.68rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
    }
  `,
})
export class ChallengeScreen {
  private readonly content = inject(GAME_CONTENT);
  private readonly setup = inject(RunSetup);
  private readonly router = inject(Router);
  private readonly touchScreen = inject(TouchScreen);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly challenge = computed(() => {
    const params = new URLSearchParams();
    for (const key of this.params.keys) params.set(key, this.params.get(key) ?? '');
    return parseChallenge(params, this.content);
  });

  constructor() {
    // A link with missing or unknown parts (spec: daily-trial / challenge links).
    if (!this.challenge()) void this.router.navigate(['/']);
  }

  protected god(c: Challenge) {
    return this.content.gods.find((g) => g.id === c.godId) ?? this.content.gods[0];
  }

  protected realm(c: Challenge) {
    return this.content.realms.find((r) => r.id === c.realmId) ?? this.content.realms[0];
  }

  protected fmt(n: number): string {
    return Math.floor(n).toLocaleString('en-US');
  }

  /** That exact run, solo (spec: daily-trial / challenge links). */
  protected accept(c: Challenge): void {
    this.setup.godId.set(c.godId);
    this.setup.realmId.set(c.realmId);
    this.setup.seed.set(c.seed);
    this.setup.special.set({ kind: 'challenge', challenge: c });
    this.touchScreen.enterFullscreen();
    void this.router.navigate(['/play']);
  }
}
