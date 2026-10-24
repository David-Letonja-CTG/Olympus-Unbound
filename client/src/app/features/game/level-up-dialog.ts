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
  instant: 'Blessing',
  fusion: 'Fusion',
  evolution: 'Evolution',
  ascension: 'Ascension',
  ware: 'For sale',
  leave: 'Leave',
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
          {{ title() }}
        </h2>
        @if (shop()) {
          <p class="subtitle" data-testid="shop-gold">
            The party's gold: <span class="gold-amount">{{ choice().gold ?? 0 }}</span>
          </p>
        } @else {
          <p class="subtitle">Choose a blessing</p>
        }
        <div class="offers" [class.shop]="shop()">
          @for (offer of choice().offers; track $index) {
            <button
              #option
              class="offer"
              [class.active]="$index === selected()"
              [class.leave]="offer.kind === 'leave'"
              [disabled]="!affordable(offer)"
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
                  @if (offer.maxLevel !== 1) {
                    <span class="level">{{
                      offer.kind === 'newWeapon' || offer.kind === 'armour'
                        ? 'new'
                        : 'Lv ' + offer.level
                    }}</span>
                  }
                </span>
                <span class="description">{{ offer.description }}</span>
                @if (offer.parts?.length) {
                  <span class="parts" data-testid="offer-parts"
                    >Toward {{ offer.parts?.join(', ') }}</span
                  >
                }
              </span>
              @if (offer.price !== undefined) {
                <span class="price"
                  ><app-item-icon sprite="icon_gold" [size]="18" /><span class="gold-amount">{{
                    offer.price
                  }}</span></span
                >
              }
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
    /* What the offer counts toward (spec: run-progression / level-up choice). */
    .parts {
      display: block;
      margin-top: 2px;
      color: var(--gold-2);
      font-family: var(--serif);
      font-style: italic;
      font-size: 0.82rem;
    }
    /* The merchant's shop (spec: merchant / the shop): more offers, so smaller, and scrolling if need be. */
    .offers.shop {
      max-height: min(66vh, 620px);
      overflow: auto;
      gap: 6px;
      padding: 2px 6px 2px 2px;
    }
    .offers.shop .offer {
      padding: 8px 14px;
    }
    .offer:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }
    .offer.leave .name {
      color: var(--text);
    }
    .price {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 700;
    }
    /* Fingers (spec: phone-play / touch menus during a run): no key numbers, and targets a thumb can hit. */
    @media (pointer: coarse) {
      .key {
        display: none;
      }
      .offer {
        min-height: 56px;
      }
    }
    /* A phone in landscape: the offers side by side, so a choice fits without scrolling the page. */
    @media (max-height: 500px) {
      .backdrop {
        padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 8px
          max(12px, env(safe-area-inset-left));
      }
      .dialog {
        width: min(920px, 100%);
        max-height: 100%;
        gap: 6px;
      }
      h2 {
        font-size: 1.3rem;
      }
      .subtitle {
        margin: -4px 0 2px;
        font-size: 0.85rem;
      }
      .offers:not(.shop) {
        flex-direction: row;
        min-height: 0;
      }
      .offers:not(.shop) .offer {
        flex: 1 1 0;
        min-width: 0;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 6px;
        padding: 10px;
      }
      .offers:not(.shop) .offer.active,
      .offers:not(.shop) .offer:hover {
        transform: translateY(-3px);
      }
      .offers:not(.shop) .text {
        align-items: center;
      }
      .offers:not(.shop) .name {
        flex-wrap: wrap;
        justify-content: center;
        font-size: 1rem;
      }
      .description {
        font-size: 0.8rem;
      }
      .offers.shop {
        max-height: calc(100dvh - 96px);
      }
      .offers:not(.shop) .price {
        margin-left: 0;
      }
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
  /** Whose choice it is, when several players share the screen (spec: co-op / local co-op on one screen). */
  readonly player = input<string>();
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

  protected shop(): boolean {
    return this.choice().source === 'shop';
  }

  protected title(): string {
    const choice = this.choice();
    const title =
      choice.source === 'shop'
        ? 'The Wandering Merchant'
        : choice.source === 'chest'
          ? 'Divine treasure'
          : `Level ${choice.level}!`;
    const player = this.player();
    return player ? `${player} · ${title}` : title;
  }

  /** A ware the party cannot pay for is shown but cannot be picked. */
  protected affordable(offer: UpgradeOffer): boolean {
    return offer.price === undefined || offer.price <= (this.choice().gold ?? 0);
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
    const offer = this.choice().offers[index];
    if (!offer || !this.affordable(offer)) return;
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
    // The shop's list may scroll: keep the selected ware in view.
    this.options()[next]?.nativeElement.focus({ preventScroll: !this.shop() });
  }
}
