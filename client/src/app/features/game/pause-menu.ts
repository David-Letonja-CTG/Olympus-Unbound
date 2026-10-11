import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { UiInput } from '../../../engine';
import { SettingsControls } from '../../shared/settings-controls';

/** Pause menu: resume, settings, and abandoning the run after a confirmation (spec: player-control / pausing). */
@Component({
  selector: 'app-pause-menu',
  imports: [SettingsControls],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <div class="backdrop">
      <section class="panel menu" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        @if (!confirming()) {
          <h2 id="pause-title">Paused</h2>
          <button
            #action
            class="btn btn-primary"
            data-testid="resume"
            (click)="resumeRequested.emit()"
          >
            Resume
          </button>
          <app-settings-controls />
          <button
            #action
            class="btn btn-danger"
            data-testid="abandon"
            (click)="confirming.set(true)"
          >
            Abandon run
          </button>
        } @else {
          <h2 id="pause-title">Abandon this run?</h2>
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
              Abandon
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
  `,
})
export class PauseMenu {
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
