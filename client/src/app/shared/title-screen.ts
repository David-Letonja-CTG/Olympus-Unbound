import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { TitleGate } from '../core/title-gate';
import { TouchScreen } from '../core/touch-screen';
import { ItemIcon } from './item-icon';

/** Keys that do not enter: moving focus, modifiers, and Escape (browsers do not count it as a gesture for sound). */
const IGNORED_KEYS = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape']);

/** Embers rising behind the title: fixed places, sizes and timings (presentation only, no randomness needed). */
const EMBERS = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  delay: (i * 0.83) % 7,
  duration: 6 + ((i * 1.7) % 5),
  size: 2 + ((i * 7) % 4),
  drift: ((i % 5) - 2) * 14,
}));

/**
 * The title screen (spec: run-setup / title screen): the crest and the name rise into a golden glow among drifting
 * embers until the player's first tap, click or key, which lets sound begin; then a flash dissolves it into the game.
 */
@Component({
  selector: 'app-title-screen',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #root
      class="gate"
      [class.leaving]="gate.leaving()"
      role="button"
      tabindex="0"
      aria-label="Enter the game"
      data-testid="title-gate"
      (pointerup)="gate.enter()"
      (click)="gate.enter()"
      (keydown)="onKey($event)"
    >
      <div class="embers" aria-hidden="true">
        @for (e of embers; track $index) {
          <span
            [style.left.%]="e.x"
            [style.width.px]="e.size"
            [style.height.px]="e.size"
            [style.animation-delay.s]="e.delay"
            [style.animation-duration.s]="e.duration"
            [style.--drift]="e.drift + 'px'"
          ></span>
        }
      </div>
      <div class="halo" aria-hidden="true"></div>
      <div class="content">
        <div class="crest" aria-hidden="true"><app-item-icon sprite="zeus" [size]="120" /></div>
        <div class="title" aria-hidden="true">Olympus <span>Unbound</span></div>
        <p class="tagline" aria-hidden="true">Unleash the gods. Survive the divine war.</p>
        <p class="prompt" data-testid="title-prompt">
          {{ touchOnly ? 'Tap to enter' : 'Click or press any key' }}
        </p>
      </div>
      <div class="flash" aria-hidden="true"></div>
    </div>
  `,
  styles: `
    .gate {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
      padding: 16px;
      overflow: hidden;
      cursor: pointer;
      outline: none;
      background:
        radial-gradient(ellipse at 50% 42%, transparent 25%, rgba(0, 0, 0, 0.7) 90%),
        radial-gradient(ellipse at 50% 115%, rgba(160, 40, 20, 0.28), transparent 55%),
        radial-gradient(ellipse at 50% -20%, rgba(120, 130, 170, 0.14), transparent 60%),
        var(--stone), var(--bg);
      transition: opacity 0.45s ease 0.25s;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .gate.leaving {
      opacity: 0;
    }

    .content {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: inherit;
    }
    /* The crest and the name rise out of the dark. */
    .crest {
      position: relative;
      filter: drop-shadow(0 0 30px rgba(191, 216, 255, 0.4)) drop-shadow(0 6px 10px #000);
      animation: rise 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) both;
    }
    .halo {
      position: absolute;
      top: 50%;
      left: 50%;
      width: min(90vw, 620px);
      aspect-ratio: 1;
      transform: translate(-50%, -58%);
      background: radial-gradient(circle, rgba(236, 213, 154, 0.2), transparent 60%);
      animation:
        appear 2s ease 0.4s both,
        breathe 5s ease-in-out 2.4s infinite;
      pointer-events: none;
    }
    .title {
      position: relative;
      font-family: var(--display);
      font-size: clamp(2.6rem, 8.5vw, 5.4rem);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-align: center;
      line-height: 1;
      background: linear-gradient(180deg, #f6ebcc 0%, #d9b467 45%, #7a5520 55%, #c9a55a 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: reveal 1.8s cubic-bezier(0.2, 0.7, 0.2, 1) 0.3s both;
    }
    .title span {
      display: block;
      margin-top: 0.12em;
      font-size: 0.5em;
      letter-spacing: 0.5em;
      padding-left: 0.5em;
    }
    .tagline {
      position: relative;
      margin: 0;
      color: var(--muted);
      font-family: var(--serif);
      font-style: italic;
      font-size: 1.1rem;
      text-align: center;
      animation: appear 1.2s ease 1.3s both;
    }
    .prompt {
      position: relative;
      margin: 28px 0 0;
      font-family: var(--display);
      font-size: 1rem;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: var(--gold-2);
      text-shadow: 0 0 14px rgba(236, 213, 154, 0.55);
      animation:
        appear 1s ease 2s both,
        pulse 2.4s ease-in-out 3s infinite;
    }

    /* Embers drift up through the dark. */
    .embers span {
      position: absolute;
      bottom: -12px;
      border-radius: 50%;
      background: #ffd27a;
      box-shadow:
        0 0 6px 2px rgba(255, 170, 70, 0.75),
        0 0 14px 4px rgba(255, 120, 40, 0.25);
      opacity: 0;
      animation-name: ember;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }

    /* Entering: a flash of light, and the name swells as the screen dissolves. */
    .flash {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 160vmax;
      aspect-ratio: 1;
      transform: translate(-50%, -50%) scale(0.1);
      background: radial-gradient(
        circle,
        rgba(255, 244, 214, 0.95) 0%,
        rgba(236, 213, 154, 0.5) 18%,
        transparent 45%
      );
      opacity: 0;
      pointer-events: none;
    }
    .leaving .flash {
      animation: flash 0.7s ease-out forwards;
    }
    /* The words go first, into the light, so the menu does not show through a second title. */
    .leaving .content,
    .leaving .embers {
      opacity: 0;
      transform: scale(1.06);
      transition:
        opacity 0.25s ease-in,
        transform 0.7s ease-out;
    }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(28px) scale(0.9);
      }
    }
    @keyframes reveal {
      from {
        opacity: 0;
        letter-spacing: 0.45em;
        filter: blur(8px);
      }
      to {
        filter: drop-shadow(0 3px 0 #000) drop-shadow(0 0 26px rgba(201, 165, 90, 0.4));
      }
    }
    @keyframes appear {
      from {
        opacity: 0;
      }
    }
    @keyframes breathe {
      50% {
        opacity: 0.55;
        transform: translate(-50%, -58%) scale(1.06);
      }
    }
    @keyframes pulse {
      50% {
        opacity: 0.45;
      }
    }
    @keyframes ember {
      0% {
        opacity: 0;
        transform: translate(0, 0);
      }
      12% {
        opacity: 0.9;
      }
      80% {
        opacity: 0.6;
      }
      100% {
        opacity: 0;
        transform: translate(var(--drift, 0px), -105vh);
      }
    }
    @keyframes flash {
      25% {
        opacity: 1;
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(1.4);
      }
    }

    /* Short screens (a phone held sideways): a smaller crest and name, so the prompt stays on screen. */
    @media (max-height: 560px) {
      .gate {
        gap: 8px;
      }
      .crest {
        zoom: 0.55;
      }
      .title {
        font-size: clamp(2rem, min(13vh, 9vw), 3.6rem);
      }
      .tagline {
        font-size: 0.95rem;
      }
      .prompt {
        margin-top: 14px;
      }
    }

    /* Reduced motion: it appears and leaves by fading only. */
    @media (prefers-reduced-motion: reduce) {
      .crest,
      .title,
      .tagline,
      .prompt,
      .halo {
        animation: appear 0.8s ease both;
      }
      .embers {
        display: none;
      }
      .leaving .flash {
        animation: none;
      }
      .leaving .content {
        transform: none;
      }
    }
  `,
})
export class TitleScreen {
  protected readonly gate = inject(TitleGate);
  protected readonly embers = EMBERS;
  protected readonly touchOnly = inject(TouchScreen).touchOnly();
  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');

  constructor() {
    afterNextRender(() => this.root().nativeElement.focus());
    // The page under it does not scroll (no scrollbar beside it, no swipe moving the menu on a phone).
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      const before = html.style.overflow;
      html.style.overflow = 'hidden';
      inject(DestroyRef).onDestroy(() => (html.style.overflow = before));
    }
  }

  protected onKey(event: KeyboardEvent): void {
    if (IGNORED_KEYS.has(event.key) || event.repeat) return;
    event.preventDefault();
    this.gate.enter();
  }
}
