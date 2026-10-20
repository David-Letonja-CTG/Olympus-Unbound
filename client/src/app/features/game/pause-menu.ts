import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { UiInput } from '../../../engine';
import { SettingsControls } from '../../shared/settings-controls';

const LABELS = {
  solo: { button: 'Abandon run', question: 'Abandon this run?', confirm: 'Abandon' },
  host: {
    button: 'End run for everyone',
    question: 'End the run for everyone?',
    confirm: 'End run',
  },
  guest: { button: 'Leave room', question: 'Leave the room?', confirm: 'Leave' },
} as const;

/**
 * Pause menu: resume, settings, and abandoning the run after a confirmation (spec: player-control / pausing). In a
 * room the run goes on: the host can end it for everyone, a guest can leave (spec: rooms / pausing in a room).
 */
@Component({
  selector: 'app-pause-menu',
  imports: [SettingsControls],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <div class="backdrop">
      <section class="panel menu" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        @if (!confirming()) {
          <h2 id="pause-title">{{ room() ? 'Menu' : 'Paused' }}</h2>
          @if (room()) {
            <p data-testid="room-runs-on">The fight goes on while this menu is open.</p>
          }
          <button
            #action
            class="btn btn-primary"
            data-testid="resume"
            (click)="resumeRequested.emit()"
          >
            {{ room() ? 'Back to the fight' : 'Resume' }}
          </button>
          <app-settings-controls />
          <button
            #action
            class="btn btn-danger"
            data-testid="abandon"
            (click)="confirming.set(true)"
          >
            {{ text().button }}
          </button>
        } @else {
          <h2 id="pause-title">{{ text().question }}</h2>
          <p>You keep half of the gold collected in this run.</p>
          <div class="actions">
            <button
              #action
              class="btn"
              data-testid="abandon-cancel"
              (click)="confirming.set(false)"
            >
              Keep fighting
            </button>
            <button
              #action
              class="btn btn-danger"
              data-testid="abandon-confirm"
              (click)="abandonRequested.emit()"
            >
              {{ text().confirm }}
            </button>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .backdrop {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      background: rgba(5, 4, 10, 0.72);
      backdrop-filter: blur(2px);
      padding: 16px;
      overflow-y: auto;
    }
    .menu {
      width: min(460px, 100%);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    h2 {
      text-align: center;
      color: var(--gold-2);
      font-size: 1.8rem;
    }
    p {
      margin: 0;
      color: var(--muted);
      text-align: center;
    }
    /* Fingers (spec: phone-play / touch menus during a run). */
    @media (pointer: coarse) {
      .btn {
        min-height: 48px;
      }
    }
    /* A phone in landscape: tighter, scrolling inside the backdrop rather than the page. */
    @media (max-height: 500px) {
      .backdrop {
        place-items: start center;
        padding: max(8px, env(safe-area-inset-top)) 12px 8px;
      }
      .menu {
        padding: 14px 18px;
        gap: 10px;
      }
      h2 {
        font-size: 1.4rem;
      }
    }
  `,
})
export class PauseMenu {
  /** In a room's run: this player's role. */
  readonly room = input<'host' | 'guest' | undefined>(undefined);
  protected readonly text = computed(() => LABELS[this.room() ?? 'solo']);
  readonly resumeRequested = output<void>();
  readonly abandonRequested = output<void>();
  protected readonly confirming = signal(false);
  private readonly actions = viewChildren<ElementRef<HTMLButtonElement>>('action');

  constructor() {
    afterNextRender(() => this.actions()[0]?.nativeElement.focus());
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.code !== 'Escape' && event.code !== 'KeyP') return;
    // Tell the game this key was handled here, so it does not pause again.
    event.preventDefault();
    if (this.confirming()) this.confirming.set(false);
    else this.resumeRequested.emit();
  }

  /** Gamepad navigation forwarded by the play screen. */
  handle(input: UiInput): void {
    const buttons = this.actions().map((a) => a.nativeElement);
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (input === 'up' || input === 'left')
      buttons[(current - 1 + buttons.length) % buttons.length]?.focus();
    else if (input === 'down' || input === 'right')
      buttons[(current + 1) % buttons.length]?.focus();
    else if (input === 'confirm') (buttons[current] ?? buttons[0])?.click();
    else if (input === 'back' || input === 'pause') {
      if (this.confirming()) this.confirming.set(false);
      else this.resumeRequested.emit();
    }
  }
}
