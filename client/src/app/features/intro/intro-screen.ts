import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { CutsceneCaption, CutsceneEvent, CutsceneSession } from '../../../engine';
import { CUTSCENE_SESSION_FACTORY, GAME_CONTENT } from '../../core/game-content';
import { Progression } from '../../core/progression';

/** The skip prompt appears after this delay; keys held from the previous screen cannot skip before it. */
const PROMPT_DELAY_MS = 1000;
const SKIP_KEYS = new Set(['Escape', 'Enter', 'Space', 'NumpadEnter']);

/**
 * Plays the intro cutscene (spec: intro-cutscene): loading progress, captions, a skip prompt, and back to the
 * main menu at the end or on a skip. Marks the intro as seen so it does not play on launch again.
 */
@Component({
  selector: 'app-intro-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Keys anywhere skip; so does a click anywhere on the scene (the Skip button is the focusable control).
  host: { '(document:keydown)': 'onKey($event)', '(click)': 'skip()' },
  template: `
    <div class="scene" #host data-testid="intro-host"></div>
    @if (!ready()) {
      <div class="loading" role="status">
        <span>Summoning the gods…</span>
        <div class="bar"><div class="fill" [style.width.%]="progress() * 100"></div></div>
      </div>
    }
    <div class="captions" aria-live="polite">
      @for (c of captions(); track c.text) {
        <p [class]="c.style ?? 'narration'" data-testid="intro-caption">{{ c.text }}</p>
      }
    </div>
    @if (prompt()) {
      <button class="skip" type="button" data-testid="intro-skip" (click)="skip()">
        Skip <kbd>Esc</kbd>
      </button>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      background: #000;
      overflow: hidden;
      user-select: none;
    }
    .scene {
      position: absolute;
      inset: 0;
      cursor: pointer;
    }
    .loading {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      gap: 14px;
      text-align: center;
      font-family: var(--display);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      background: #000;
    }
    .bar {
      width: 240px;
      height: 4px;
      background: #1a1614;
    }
    .fill {
      height: 100%;
      background: var(--gold);
    }
    .captions {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .captions p {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      margin: 0;
      width: min(900px, 90vw);
      text-align: center;
      text-shadow:
        0 2px 0 #000,
        0 0 18px #000;
      animation: appear 1.2s ease;
    }
    .narration {
      bottom: 12%;
      font-family: var(--serif);
      font-style: italic;
      font-size: clamp(1.1rem, 2.2vw, 1.6rem);
      color: #efe6d2;
    }
    .title {
      top: 38%;
      font-family: var(--display);
      font-size: clamp(2rem, 6vw, 4.2rem);
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--gold-2);
    }
    .skip {
      position: absolute;
      right: 24px;
      bottom: 22px;
      background: rgba(10, 8, 8, 0.6);
      border: 1px solid var(--line);
      color: var(--muted);
      font-family: var(--display);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding: 8px 14px;
      cursor: pointer;
      animation: appear 0.6s ease;
    }
    kbd {
      border: 1px solid var(--line);
      padding: 0 6px;
      margin-left: 6px;
      font-family: var(--sans);
    }
    /* No keyboard on a phone (spec: phone-play): a tap skips. */
    @media (pointer: coarse) {
      kbd {
        display: none;
      }
    }
    @keyframes appear {
      from {
        opacity: 0;
      }
    }
  `,
})
export class IntroScreen {
  private readonly content = inject(GAME_CONTENT);
  private readonly createSession = inject(CUTSCENE_SESSION_FACTORY);
  private readonly progression = inject(Progression);
  private readonly router = inject(Router);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  protected readonly ready = signal(false);
  protected readonly progress = signal(0);
  protected readonly captions = signal<readonly CutsceneCaption[]>([]);
  protected readonly prompt = signal(false);

  private session: CutsceneSession | undefined;
  private destroyed = false;
  private left = false;
  private readonly timer: ReturnType<typeof setTimeout>;

  constructor() {
    this.timer = setTimeout(() => this.prompt.set(true), PROMPT_DELAY_MS);
    afterNextRender(() => void this.start());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      clearTimeout(this.timer);
      this.session?.destroy();
    });
  }

  protected onKey(event: KeyboardEvent): void {
    if (!SKIP_KEYS.has(event.code) || event.repeat) return;
    event.preventDefault();
    this.skip();
  }

  /** Skips to the main menu, once the prompt is showing. */
  protected skip(): void {
    if (!this.prompt()) return;
    if (this.session) this.session.skip();
    else this.leave();
  }

  private async start(): Promise<void> {
    try {
      const session = await this.createSession({
        parent: this.host().nativeElement,
        content: this.content,
        cutsceneId: 'intro',
        settings: this.progression.settings(),
      });
      if (this.destroyed) {
        session.destroy();
        return;
      }
      this.session = session;
      session.subscribe((event) => this.onEvent(event));
    } catch {
      // Without a renderer the intro cannot play; the menu still must.
      this.leave();
    }
  }

  private onEvent(event: CutsceneEvent): void {
    switch (event.type) {
      case 'loadProgress':
        this.progress.set(event.progress);
        return;
      case 'ready':
        this.ready.set(true);
        return;
      case 'captions':
        this.captions.set(event.captions);
        return;
      case 'uiInput':
        if (event.input === 'confirm' || event.input === 'back' || event.input === 'pause')
          this.skip();
        return;
      case 'ended':
        this.leave();
        return;
    }
  }

  private leave(): void {
    if (this.left) return;
    this.left = true;
    this.progression.markIntroSeen();
    void this.router.navigate(['/'], { replaceUrl: true });
  }
}
