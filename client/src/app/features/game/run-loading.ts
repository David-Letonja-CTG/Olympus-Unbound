import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { LoadStage, RealmDefinition } from '../../../engine';
import { ItemIcon } from '../../shared/item-icon';

/** A player taking part in the run (spec: run-loading / party). */
export interface PartyMember {
  readonly name: string;
  readonly godName: string;
  readonly sprite: string;
}

const STAGE_LABEL: Record<LoadStage, string> = {
  art: 'Summoning the gods',
  realm: 'Shaping the realm',
  scene: 'The horde gathers',
};

/** Where each stage sits on the overall bar: art first, the realm next, the scene last. */
const STAGE_SPAN: Record<LoadStage, readonly [number, number]> = {
  art: [0, 0.6],
  realm: [0.6, 0.95],
  scene: [0.95, 1],
};

const TIP_SECONDS = 6;

/** Fixed ember positions (no randomness: the same screen every time). */
const EMBERS = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i * 1.7) % 9,
  duration: 7 + ((i * 13) % 6),
  size: 2 + (i % 3),
}));

/**
 * The loading screen of a run (spec: run-loading): the realm at night with its ruins and the boss's shadow, the
 * party, the stage and progress of the loading, and a line of lore. Shown by the play screen from the start of
 * the run until the arena is ready; nothing on it pretends to work — rooms appear only when a run has one.
 */
@Component({
  selector: 'app-run-loading',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.done]': 'done()' },
  template: `
    <div class="sky" aria-hidden="true">
      <div class="moon"></div>
      <svg class="mountain" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice">
        <path
          class="far"
          d="M0 520 L180 380 L320 430 L520 250 L700 340 L820 300 L980 180 L1120 300 L1280 260 L1460 380 L1600 340 L1600 600 L0 600 Z"
        />
        <path
          class="near"
          d="M0 600 L0 500 L240 470 L420 360 L560 400 L700 330 L780 300 L860 300 L940 330 L1080 390 L1260 420 L1420 480 L1600 470 L1600 600 Z"
        />
        <!-- The temple on the summit: a stylobate, a broken colonnade, a fallen pediment. -->
        <g class="temple" transform="translate(724 252)">
          <rect x="-8" y="40" width="168" height="8" />
          <rect x="-2" y="34" width="156" height="7" />
          @for (c of columns; track c) {
            <rect [attr.x]="c * 19" y="0" width="7" [attr.height]="c === 5 ? 18 : 34" />
          }
          <path d="M-4 0 L74 -22 L118 -10 L112 -4 L74 -14 L-4 6 Z" />
        </g>
        @for (f of fires; track f.x) {
          <circle class="fire" [attr.cx]="f.x" [attr.cy]="f.y" r="3" />
        }
      </svg>
      <div class="mist"></div>
      <div class="boss">
        <app-item-icon [sprite]="bossSprite()" [size]="360" />
      </div>
      @for (e of embers; track $index) {
        <span
          class="ember"
          [style.left.%]="e.left"
          [style.width.px]="e.size"
          [style.height.px]="e.size"
          [style.animation-delay.s]="e.delay"
          [style.animation-duration.s]="e.duration"
        ></span>
      }
    </div>

    <div class="content">
      <header>
        <p class="kicker">Into the realm</p>
        <h1>{{ realm().name }}</h1>
        <div class="divider" aria-hidden="true"></div>
        <p class="description">{{ realm().description }}</p>
      </header>

      <section class="party" aria-label="Party">
        <h2>Party</h2>
        <ul>
          @for (m of party(); track $index) {
            <li data-testid="party-member">
              <app-item-icon [sprite]="m.sprite" [size]="84" />
              <span class="who">
                <span class="name">{{ m.name }}</span>
                <span class="god">{{ m.godName }}</span>
              </span>
            </li>
          }
        </ul>
      </section>

      <footer>
        <p class="tip">
          @if (tip(); as t) {
            <span class="tip-text" [attr.data-tip]="tipIndex()">{{ t }}</span>
          }
        </p>
        <div class="progress" role="status" aria-live="polite">
          <span class="stage" data-testid="load-stage">{{ stageLabel() }}</span>
          <div class="bar"><div class="fill" [style.width.%]="percent()"></div></div>
          <span class="percent">{{ percent() }}%</span>
        </div>
        <p class="seed">Seed {{ seed() }}</p>
      </footer>
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: block;
      overflow: hidden;
      color: var(--text);
      background: radial-gradient(ellipse at 50% 120%, #2a1c1a 0%, #120f17 55%, #08070b 100%);
      transition: opacity 0.7s ease;
    }
    :host(.done) {
      opacity: 0;
      pointer-events: none;
    }
    .sky {
      position: absolute;
      inset: 0;
    }
    .moon {
      position: absolute;
      top: 7%;
      left: 6%;
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: radial-gradient(circle at 40% 38%, #e9e6dc, #b9b4a6 60%, #8d887c);
      box-shadow:
        0 0 60px rgba(220, 225, 240, 0.35),
        0 0 160px rgba(160, 170, 210, 0.2);
    }
    .mountain {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 62%;
    }
    .far {
      fill: #1a1722;
    }
    .near {
      fill: #0e0c12;
    }
    .temple rect,
    .temple path {
      fill: #0e0c12;
    }
    .fire {
      fill: #ff9a4a;
      filter: drop-shadow(0 0 6px #ff7a2e) drop-shadow(0 0 14px rgba(255, 120, 40, 0.7));
      animation: flicker 1.8s ease-in-out infinite alternate;
    }
    .mist {
      position: absolute;
      left: -20%;
      right: -20%;
      bottom: 6%;
      height: 34%;
      background:
        radial-gradient(ellipse at 30% 60%, rgba(138, 147, 173, 0.18), transparent 60%),
        radial-gradient(ellipse at 75% 70%, rgba(138, 147, 173, 0.14), transparent 55%);
      animation: drift 26s ease-in-out infinite alternate;
    }
    .boss {
      position: absolute;
      right: 4%;
      bottom: 12%;
      opacity: 0.55;
      filter: brightness(0) drop-shadow(0 0 18px rgba(255, 90, 40, 0.45));
    }
    .ember {
      position: absolute;
      bottom: -10px;
      border-radius: 50%;
      background: #ffb36b;
      box-shadow: 0 0 6px #ff7a2e;
      animation-name: rise;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }
    .content {
      position: relative;
      height: 100%;
      display: grid;
      grid-template-rows: auto 1fr auto;
      padding: 7vh 6vw 5vh;
      gap: 24px;
    }
    header {
      text-align: center;
    }
    .kicker {
      font-family: var(--display);
      letter-spacing: 0.4em;
      text-transform: uppercase;
      color: var(--muted);
      font-size: 0.8rem;
    }
    h1 {
      font-family: var(--display);
      font-size: clamp(2.4rem, 5vw, 4.2rem);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--gold-2);
      text-shadow:
        0 3px 0 #000,
        0 0 40px rgba(236, 213, 154, 0.35);
      margin: 6px 0 10px;
    }
    .divider {
      height: 14px;
      margin: 0 auto 12px;
      width: min(420px, 70%);
      background: url('/ui/divider.svg') center / contain no-repeat;
    }
    .description {
      font-family: var(--serif);
      font-style: italic;
      color: #d6ccb8;
      max-width: 640px;
      margin: 0 auto;
    }
    .party {
      align-self: center;
      justify-self: start;
      padding: 14px 18px 16px;
      background: var(--stone), rgba(12, 10, 14, 0.72);
      background-blend-mode: soft-light, normal;
      border: 1px solid #050404;
      box-shadow:
        inset 0 0 0 1px rgba(201, 165, 90, 0.35),
        0 8px 24px rgba(0, 0, 0, 0.6);
      min-width: 220px;
    }
    .party h2 {
      font-family: var(--display);
      font-size: 0.78rem;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .party ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .party li {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .who {
      display: flex;
      flex-direction: column;
    }
    .name {
      font-family: var(--display);
      font-weight: 700;
      color: var(--gold-2);
      font-size: 1.1rem;
    }
    .god {
      color: #d6ccb8;
      font-size: 0.9rem;
    }
    footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .tip {
      min-height: 2.6em;
      max-width: 760px;
      text-align: center;
      font-family: var(--serif);
      font-style: italic;
      color: #e4dccb;
    }
    .tip-text {
      animation: fade-in 0.8s ease both;
    }
    .progress {
      display: grid;
      grid-template-columns: auto minmax(200px, 520px) 3.2em;
      align-items: center;
      gap: 14px;
      width: min(860px, 92vw);
    }
    .stage {
      font-family: var(--display);
      letter-spacing: 0.12em;
      color: var(--gold);
      white-space: nowrap;
    }
    .bar {
      height: 12px;
      border: 1px solid #050404;
      box-shadow:
        inset 0 0 0 1px rgba(201, 165, 90, 0.45),
        inset 0 2px 6px rgba(0, 0, 0, 0.8);
      background: rgba(0, 0, 0, 0.55);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      background: linear-gradient(90deg, #7a5320, #d9ae3c 60%, #f2d47a);
      box-shadow: 0 0 12px rgba(242, 212, 122, 0.55);
      transition: width 0.25s ease-out;
    }
    .percent {
      font-variant-numeric: tabular-nums;
      color: var(--muted);
      text-align: right;
    }
    .seed {
      font-size: 0.78rem;
      color: var(--muted);
      letter-spacing: 0.08em;
    }
    @keyframes rise {
      from {
        transform: translateY(0);
        opacity: 0;
      }
      10% {
        opacity: 0.9;
      }
      to {
        transform: translateY(-105vh) translateX(40px);
        opacity: 0;
      }
    }
    @keyframes flicker {
      from {
        opacity: 0.6;
      }
      to {
        opacity: 1;
      }
    }
    @keyframes drift {
      from {
        transform: translateX(-4%);
      }
      to {
        transform: translateX(4%);
      }
    }
    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ember,
      .mist,
      .fire {
        animation: none;
      }
    }
  `,
})
export class RunLoading {
  readonly realm = input.required<RealmDefinition>();
  readonly party = input.required<readonly PartyMember[]>();
  readonly bossSprite = input.required<string>();
  readonly seed = input.required<number>();
  readonly stage = input<LoadStage | undefined>(undefined);
  /** Progress of the current stage, 0–1. */
  readonly stageProgress = input(0);
  readonly done = input(false);

  protected readonly columns = [0, 1, 2, 3, 4, 5, 6];
  protected readonly fires = [
    { x: 700, y: 290 },
    { x: 902, y: 292 },
    { x: 330, y: 432 },
    { x: 1290, y: 268 },
  ];
  protected readonly embers = EMBERS;
  protected readonly tipIndex = signal(0);
  private best = 0;

  protected readonly stageLabel = computed(() => STAGE_LABEL[this.stage() ?? 'art']);
  protected readonly percent = computed(() => {
    const [from, to] = STAGE_SPAN[this.stage() ?? 'art'];
    const overall = this.done()
      ? 1
      : from + (to - from) * Math.min(1, Math.max(0, this.stageProgress()));
    // Never backwards (spec: run-loading / progress stages).
    this.best = Math.max(this.best, overall);
    return Math.round(this.best * 100);
  });
  protected readonly tip = computed(() => {
    const tips = this.realm().tips ?? [];
    return tips.length ? tips[(this.seed() + this.tipIndex()) % tips.length] : undefined;
  });

  constructor() {
    const timer = setInterval(() => this.tipIndex.update((i) => i + 1), TIP_SECONDS * 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
