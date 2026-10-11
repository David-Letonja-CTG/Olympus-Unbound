import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  input,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { UiInput, UpgradeChoice, UpgradeOffer } from '../../../engine';
import { ItemIcon } from '../../shared/item-icon';

const KIND_LABEL: Record<UpgradeOffer['kind'], string> = {
  newWeapon: 'New weapon',
  weaponLevel: 'Weapon',
  armour: 'New armour',
  armourLevel: 'Armour',
  relic: 'Relic',
  skill: 'Skill',
  heal: 'Blessing',
  gold: 'Blessing',
};

/**
 * The level-up (or treasure) choice (spec: run-progression / level-up choice). Mouse, number keys 1–3, arrow
 * keys with Enter, and gamepad (via `handle`) all select an offer.
 */
@Component({
  selector: 'app-level-up-dialog',
  imports: [ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <div class="backdrop">
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="levelup-title">
        <h2 id="levelup-title">
          {{ choice().source === 'chest' ? 'Divine treasure' : 'Level ' + choice().level + '!' }}
        </h2>
        <p class="subtitle">Choose a blessing</p>
        <div class="offers">
          @for (offer of choice().offers; track $index) {
            <button
              #option
              class="offer"
              [class.active]="$index === selected()"
              [attr.data-testid]="'offer-' + $index"
              (click)="pick($index)"
              (focus)="selected.set($index)"
            >
              <span class="key" aria-hidden="true">{{ $index + 1 }}</span>
              <app-item-icon [sprite]="offer.sprite" [size]="56" />
              <span class="text">
                <span class="kind">{{ kindLabel(offer) }}</span>
                <span class="name">
                  {{ offer.name }}
                  @if (offer.maxLevel > 1) {
                    <span class="level">{{
                      offer.kind === 'newWeapon' || offer.kind === 'armour'
                        ? 'new'
                        : 'Lv ' + offer.level
                    }}</span>
                  }
                </span>
                <span class="description">{{ offer.description }}</span>
              </span>
            </button>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .backdrop {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      background: radial-gradient(ellipse at center, rgba(12, 8, 6, 0.55), rgba(0, 0, 0, 0.88));
      padding: 16px;
    }
    .dialog {
      width: min(580px, 100%);
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: rise 0.2s ease-out;
    }
    h2 {
      text-align: center;
      font-size: 2.1rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--gold-2);
      text-shadow:
        0 2px 0 #000,
        0 0 28px rgba(236, 213, 154, 0.45);
    }
    .subtitle {
      text-align: center;
      color: var(--muted);
      font-family: var(--serif);
      font-style: italic;
      margin: -6px 0 6px;
    }
    .offers {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .offer {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      text-align: left;
      color: var(--text);
      background: var(--stone), var(--panel);
      background-blend-mode: soft-light, normal;
      border: 1px solid #050404;
      box-shadow:
        inset 0 0 0 1px rgba(201, 165, 90, 0.3),
        inset 0 0 30px rgba(0, 0, 0, 0.6),
        0 6px 18px rgba(0, 0, 0, 0.6);
      border-radius: 2px;
      cursor: pointer;
      transition:
        transform 0.08s ease,
        box-shadow 0.12s ease;
    }
    .offer.active,
    .offer:hover {
      box-shadow:
        inset 0 0 0 1px rgba(236, 213, 154, 0.85),
        inset 0 0 30px rgba(0, 0, 0, 0.5),
        0 0 26px rgba(201, 165, 90, 0.3),
        0 6px 18px rgba(0, 0, 0, 0.6);
      transform: translateX(4px);
    }
    .key {
      width: 26px;
      height: 26px;
      flex: none;
      display: grid;
      place-items: center;
      border: 1px solid var(--line);
      color: var(--gold);
      font-family: var(--display);
      font-weight: 700;
    }
    .text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .kind {
      font-family: var(--display);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--muted);
    }
    .name {
      font-family: var(--display);
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--gold-2);
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .level {
      font-family: var(--sans);
      font-size: 0.7rem;
      letter-spacing: 0.06em;
      color: var(--text);
      border: 1px solid var(--gold);
      border-radius: 2px;
      padding: 0 6px;
    }
    .description {
      color: #d6ccb8;
      font-size: 0.92rem;
    }
    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
    }
  `,
})
export class LevelUpDialog {
  readonly choice = input.required<UpgradeChoice>();
  readonly chosen = output<number>();

  protected readonly selected = signal(0);
  private readonly options = viewChildren<ElementRef<HTMLButtonElement>>('option');
  private answered = -1;
  /** Keys and buttons held from gameplay must not pick an offer the moment the dialog opens. */
  private openedAt = 0;

  constructor() {
    // A new choice: select the first offer and focus it for keyboard users.
    afterRenderEffect(() => {
      const choice = this.choice();
      untracked(() => {
        this.selected.set(0);
        this.answered = -1;
        this.openedAt = performance.now();
        this.options()[0]?.nativeElement.focus({ preventScroll: true });
        void choice;
      });
    });
  }

  protected kindLabel(offer: UpgradeOffer): string {
    return KIND_LABEL[offer.kind];
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.repeat) return;
    const count = this.choice().offers.length;
    if (/^Digit[1-9]$/.test(event.code) || /^Numpad[1-9]$/.test(event.code)) {
      const index = Number(event.code.at(-1)) - 1;
      if (index < count) {
        event.preventDefault();
        if (this.settled()) this.pick(index);
      }
      return;
    }
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        event.preventDefault();
        this.move(-1);
        return;
      case 'ArrowDown':
      case 'KeyS':
        event.preventDefault();
        this.move(1);
        return;
      case 'Enter':
      case 'Space':
        event.preventDefault();
        if (this.settled()) this.pick(this.selected());
        return;
    }
  }

  /** Gamepad navigation forwarded by the play screen. */
  handle(input: UiInput): void {
    if (input === 'up' || input === 'left') this.move(-1);
    else if (input === 'down' || input === 'right') this.move(1);
    else if (input === 'confirm' && this.settled()) this.pick(this.selected());
  }

  protected pick(index: number): void {
    // One answer per choice, even if a click and a key arrive together.
    if (this.answered === this.choice().id) return;
    this.answered = this.choice().id;
    this.chosen.emit(index);
  }

  private settled(): boolean {
    return performance.now() - this.openedAt > 300;
  }

  private move(delta: number): void {
    const count = this.choice().offers.length;
    const next = (this.selected() + delta + count) % count;
    this.selected.set(next);
    this.options()[next]?.nativeElement.focus({ preventScroll: true });
  }
}
