import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GameContent, RealmDefinition } from '../../../engine';
import { GAME_CONTENT } from '../../core/game-content';
import { MAX_SEED, parseSeed, RunSetup } from '../../core/run-setup';
import { TouchScreen } from '../../core/touch-screen';
import { ItemIcon } from '../../shared/item-icon';

@Component({
  selector: 'app-realm-selection',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen realm-screen">
      <h1 class="screen-title">Choose a realm</h1>

      <div class="layout">
        <div class="panel realms" role="radiogroup" aria-label="Realms">
          @for (realm of realms; track realm.id) {
            <button
              class="realm"
              role="radio"
              [attr.aria-checked]="selected() === realm.id"
              [class.selected]="selected() === realm.id"
              [attr.data-testid]="'realm-' + realm.id"
              (click)="selected.set(realm.id)"
            >
              <app-item-icon [sprite]="bossSprite(realm)" [size]="40" />
              <span class="label">
                <span class="name">{{ realm.name }}</span>
                <span class="guard">Guarded by {{ bossName(realm) }}</span>
              </span>
            </button>
          }
        </div>

        <div class="side">
          @if (current(); as realm) {
            <section class="panel detail" aria-live="polite">
              <h2 class="name">{{ realm.name }}</h2>
              <p class="description">{{ realm.description }}</p>
              <p class="boss">
                <app-item-icon [sprite]="bossSprite(realm)" [size]="48" />
                Guarded by {{ bossName(realm) }}
              </p>
              <p class="next">Beyond its gate: {{ nextName(realm) }}</p>
            </section>
          }

          <!-- Run length (spec: run-setup / realm selection; quick-runs). -->
          <section class="panel length" aria-labelledby="length-title">
            <span id="length-title" class="length-title">Run length</span>
            <div class="segments" role="radiogroup" aria-labelledby="length-title">
              <button
                type="button"
                role="radio"
                data-testid="length-full"
                [attr.aria-checked]="!setup.quick()"
                [class.on]="!setup.quick()"
                (click)="setup.quick.set(false)"
              >
                Full <small>boss at {{ clock(bossAt()) }}</small>
              </button>
              <button
                type="button"
                role="radio"
                data-testid="length-quick"
                [attr.aria-checked]="setup.quick()"
                [class.on]="setup.quick()"
                (click)="setup.quick.set(true)"
              >
                Quick <small>boss at {{ clock(bossAt() / 2) }}</small>
              </button>
            </div>
          </section>

          <section class="panel seed">
            <label for="seed">Seed</label>
            <div class="seed-row">
              <input
                id="seed"
                data-testid="seed-input"
                inputmode="numeric"
                autocomplete="off"
                [value]="seedText()"
                (input)="seedText.set($any($event.target).value)"
                [attr.aria-invalid]="!validSeed()"
                aria-describedby="seed-help"
              />
              <button class="btn" type="button" (click)="reroll()">Randomize</button>
            </div>
            <p id="seed-help" class="help" [class.error]="!validSeed()">
              @if (validSeed()) {
                The same seed always builds the same arenas.
              } @else {
                The seed must be a whole number from 0 to {{ maxSeed }}.
              }
            </p>
          </section>
        </div>
      </div>

      <!-- Pinned on the window's bottom edge, centred, like every menu's (styles.css, .actions.sticky). -->
      <div class="actions sticky">
        <a class="btn" routerLink="/gods">Back</a>
        <button
          class="btn btn-primary"
          data-testid="begin"
          [disabled]="!canStart()"
          (click)="begin()"
        >
          Begin
        </button>
      </div>
    </main>
  `,
  styles: `
    /* The realms as a list beside the chosen one's details: every realm fits on one screen. */
    .realm-screen {
      padding-top: 28px;
      gap: 18px;
    }
    .layout {
      display: flex;
      gap: 20px;
      width: min(960px, 100%);
      align-items: flex-start;
    }
    .realms {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px;
      flex: 0 0 340px;
    }
    .realm {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      text-align: left;
      color: var(--text);
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      font: inherit;
    }
    .realm:hover {
      background: rgba(201, 193, 173, 0.06);
    }
    .realm.selected {
      border-color: var(--gold);
      background: rgba(201, 165, 90, 0.1);
    }
    .label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .realm .name {
      font-family: var(--serif);
      font-size: 1.15rem;
      color: var(--gold-2);
    }
    .guard {
      color: #ffb4a8;
      font-size: 0.82rem;
    }
    .side {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .detail {
      padding: 20px 26px;
    }
    .detail .name {
      margin: 0 0 8px;
      font-family: var(--serif);
      font-size: 1.7rem;
      color: var(--gold-2);
    }
    .description {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }
    .boss {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 14px 0 0;
      color: #ffb4a8;
    }
    .next {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 0.85rem;
      font-style: italic;
    }
    .seed {
      padding: 16px 20px;
    }
    .length {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px 14px;
      padding: 12px 20px;
    }
    .length-title {
      font-weight: 600;
    }
    .segments {
      display: flex;
      border: 1px solid var(--line);
      border-radius: 4px;
      overflow: hidden;
    }
    .segments button {
      appearance: none;
      border: 0;
      background: transparent;
      color: var(--muted);
      padding: 8px 14px;
      min-height: 44px;
      cursor: pointer;
      font: inherit;
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1.2;
    }
    .segments button + button {
      border-left: 1px solid var(--line);
    }
    .segments button.on {
      background: var(--accent-bg);
      color: var(--gold-2);
    }
    .segments small {
      font-size: 0.72rem;
      color: var(--muted);
    }
    label {
      font-weight: 600;
    }
    .seed-row {
      display: flex;
      gap: 10px;
      margin-top: 8px;
    }
    input {
      flex: 1;
      min-width: 0;
      background: var(--bg-2);
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--text);
      padding: 10px 12px;
      font: inherit;
      font-variant-numeric: tabular-nums;
    }
    input[aria-invalid='true'] {
      border-color: var(--danger);
    }
    .help {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 0.85rem;
    }
    .help.error {
      color: #ffb4a8;
    }
    @media (max-width: 760px) {
      .layout {
        flex-direction: column;
        align-items: stretch;
      }
      .realms {
        flex-basis: auto;
      }
    }
    /*
     * A phone held sideways (spec: phone-play / phone menus): the list beside the details again, compact, with Begin
     * kept at the bottom of the screen.
     */
    @media (max-height: 500px) and (min-width: 560px) {
      .layout {
        flex-direction: row;
        align-items: flex-start;
        gap: 12px;
      }
      .realms {
        padding: 8px;
        gap: 2px;
      }
      .realm {
        padding-top: 4px;
        padding-bottom: 4px;
      }
      .realm app-item-icon {
        zoom: 0.75;
      }
      .detail,
      .seed {
        padding: 10px 14px;
      }
      .detail .boss,
      .help {
        display: none;
      }
      .description {
        font-size: 0.85rem;
      }
    }
  `,
})
export class RealmSelection {
  private readonly content: GameContent = inject(GAME_CONTENT);
  protected readonly setup = inject(RunSetup);
  private readonly router = inject(Router);
  private readonly touchScreen = inject(TouchScreen);

  protected readonly maxSeed = MAX_SEED;
  protected readonly realms: readonly RealmDefinition[] = this.content.realms;
  protected readonly selected = signal<string | undefined>(
    this.setup.realmId() ?? this.content.realms[0]?.id,
  );
  protected readonly seedText = signal(String(this.setup.seed()));
  protected readonly validSeed = computed(() => parseSeed(this.seedText()) !== undefined);
  protected readonly canStart = computed(
    () => !!this.selected() && this.validSeed() && !!this.setup.godId(),
  );

  protected readonly current = computed(() => this.realms.find((r) => r.id === this.selected()));

  protected bossName(realm: RealmDefinition): string {
    return this.content.bosses.find((b) => b.id === realm.boss.id)?.name ?? realm.boss.id;
  }

  protected bossSprite(realm: RealmDefinition): string {
    return this.content.bosses.find((b) => b.id === realm.boss.id)?.visual.sprite ?? '';
  }

  /** The realm a party reaches through this one's gate (content order, wrapping; spec: endless-run). */
  protected nextName(realm: RealmDefinition): string {
    const i = this.realms.indexOf(realm);
    return this.realms[(i + 1) % this.realms.length].name;
  }

  /** When the selected realm's boss comes in a full run, in seconds. */
  protected readonly bossAt = computed(() => this.current()?.boss.at ?? 420);

  protected clock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
  }

  protected reroll(): void {
    this.setup.rerollSeed();
    this.seedText.set(String(this.setup.seed()));
  }

  protected begin(): void {
    const seed = parseSeed(this.seedText());
    const realm = this.selected();
    if (seed === undefined || !realm || !this.canStart()) return;
    this.setup.realmId.set(realm);
    this.setup.seed.set(seed);
    // A run of the player's own: no Daily Trial or challenge any more.
    this.setup.special.set(undefined);
    // Spec: phone-play / the phone screen — from the tap, as browsers require.
    this.touchScreen.enterFullscreen();
    void this.router.navigate(['/play']);
  }
}
