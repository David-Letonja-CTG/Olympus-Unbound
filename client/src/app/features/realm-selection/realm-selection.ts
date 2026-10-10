import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GameContent, RealmDefinition } from '../../../engine';
import { GAME_CONTENT } from '../../core/game-content';
import { MAX_SEED, parseSeed, RunSetup } from '../../core/run-setup';
import { ItemIcon } from '../../shared/item-icon';

@Component({
  selector: 'app-realm-selection',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen">
      <h1 class="screen-title">Choose a realm</h1>

      <div class="realms" role="radiogroup" aria-label="Realms">
        @for (realm of realms; track realm.id) {
          <button
            class="panel realm-card"
            role="radio"
            [attr.aria-checked]="selected() === realm.id"
            [class.selected]="selected() === realm.id"
            [attr.data-testid]="'realm-' + realm.id"
            (click)="selected.set(realm.id)"
          >
            <span class="name">{{ realm.name }}</span>
            <span class="description">{{ realm.description }}</span>
            <span class="boss">
              <app-item-icon [sprite]="bossSprite(realm)" [size]="40" />
              Guarded by {{ bossName(realm) }}
            </span>
          </button>
        }
      </div>

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
            The same seed always builds the same arena.
          } @else {
            The seed must be a whole number from 0 to {{ maxSeed }}.
          }
        </p>
      </section>

      <div class="actions">
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
    .realms {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .realm-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 22px 26px;
      width: min(440px, 100%);
      text-align: left;
      color: var(--text);
      cursor: pointer;
      background: linear-gradient(180deg, rgba(201, 193, 173, 0.08), transparent 60%), var(--panel);
    }
    .realm-card.selected {
      border-color: var(--gold);
      box-shadow: 0 0 0 2px var(--gold);
    }
    .name {
      font-family: var(--serif);
      font-size: 1.6rem;
      color: var(--gold-2);
    }
    .description {
      color: var(--muted);
      line-height: 1.45;
    }
    .boss {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #ffb4a8;
      font-size: 0.9rem;
    }
    .seed {
      padding: 16px 20px;
      width: min(440px, 100%);
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
  `,
})
export class RealmSelection {
  private readonly content: GameContent = inject(GAME_CONTENT);
  private readonly setup = inject(RunSetup);
  private readonly router = inject(Router);

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

  protected bossName(realm: RealmDefinition): string {
    return this.content.bosses.find((b) => b.id === realm.boss.id)?.name ?? realm.boss.id;
  }

  protected bossSprite(realm: RealmDefinition): string {
    return this.content.bosses.find((b) => b.id === realm.boss.id)?.visual.sprite ?? '';
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
    void this.router.navigate(['/play']);
  }
}
