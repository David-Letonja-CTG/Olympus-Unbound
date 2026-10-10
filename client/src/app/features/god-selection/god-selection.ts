import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContentIndex, GameContent, GodDefinition, computeStats } from '../../../engine';
import { GAME_CONTENT } from '../../core/game-content';
import { RunSetup } from '../../core/run-setup';
import { ItemIcon } from '../../shared/item-icon';

@Component({
  selector: 'app-god-selection',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen">
      <h1 class="screen-title">Choose your god</h1>
      <p class="screen-subtitle">Each god fights differently. More will answer the call.</p>

      <div class="gods" role="radiogroup" aria-label="Gods">
        @for (god of gods; track god.id) {
          <button
            class="panel god-card"
            role="radio"
            [attr.aria-checked]="selected() === god.id"
            [class.selected]="selected() === god.id"
            [attr.data-testid]="'god-' + god.id"
            (click)="selected.set(god.id)"
          >
            <app-item-icon [sprite]="god.visual.sprite" [size]="88" />
            <span class="name">{{ god.name }}</span>
            <span class="title">{{ god.title }}</span>
          </button>
        }
      </div>

      @if (details(); as d) {
        <section class="panel details" aria-live="polite">
          <p class="description">{{ d.god.description }}</p>
          <div class="facts">
            <div class="fact">
              <app-item-icon [sprite]="d.weapon.visual.sprite" [size]="44" />
              <div>
                <h3>{{ d.weapon.name }} <span class="tag">starting weapon</span></h3>
                <p>{{ d.weapon.description }}</p>
              </div>
            </div>
            <div class="fact">
              <app-item-icon [sprite]="d.god.ability.visual.sprite" [size]="44" />
              <div>
                <h3>{{ d.god.ability.name }} <span class="tag">ability · Space</span></h3>
                <p>{{ d.god.ability.description }}</p>
              </div>
            </div>
            <div class="fact">
              <app-item-icon sprite="skill_storm" [size]="44" />
              <div>
                <h3>{{ d.god.passive.name }} <span class="tag">passive</span></h3>
                <p>{{ d.god.passive.description }}</p>
              </div>
            </div>
          </div>
          <dl class="stats">
            <div>
              <dt>Health</dt>
              <dd>{{ d.stats.maxHealth }}</dd>
            </div>
            <div>
              <dt>Speed</dt>
              <dd>{{ d.stats.moveSpeed }}</dd>
            </div>
            <div>
              <dt>Critical chance</dt>
              <dd>{{ d.crit }}%</dd>
            </div>
          </dl>
        </section>
      }

      <div class="actions">
        <a class="btn" routerLink="/">Back</a>
        <button class="btn btn-primary" [disabled]="!selected()" (click)="continue()">
          Continue
        </button>
      </div>
    </main>
  `,
  styles: `
    .gods {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .god-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 18px 28px;
      cursor: pointer;
      color: var(--text);
      min-width: 200px;
    }
    .god-card.selected {
      border-color: var(--gold);
      box-shadow:
        0 0 0 2px var(--gold),
        0 18px 50px rgba(232, 194, 90, 0.2);
    }
    .name {
      font-family: var(--serif);
      font-size: 1.6rem;
      color: var(--gold-2);
    }
    .title {
      color: var(--muted);
      font-style: italic;
    }
    .details {
      width: min(760px, 100%);
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .description {
      margin: 0;
      line-height: 1.5;
    }
    .facts {
      display: grid;
      gap: 12px;
    }
    .fact {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .fact h3 {
      font-size: 1.05rem;
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .fact p {
      margin: 4px 0 0;
      color: var(--muted);
    }
    .stats {
      display: flex;
      gap: 24px;
      margin: 0;
      flex-wrap: wrap;
    }
    .stats dt {
      color: var(--muted);
      font-size: 0.8rem;
    }
    .stats dd {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
    }
  `,
})
export class GodSelection {
  private readonly content: GameContent = inject(GAME_CONTENT);
  private readonly setup = inject(RunSetup);
  private readonly router = inject(Router);
  private readonly index = new ContentIndex(this.content);

  protected readonly gods: readonly GodDefinition[] = this.content.gods;
  protected readonly selected = signal<string | undefined>(
    this.setup.godId() ?? this.content.gods[0]?.id,
  );
  protected readonly details = computed(() => {
    const id = this.selected();
    if (!id) return undefined;
    const god = this.index.god(id);
    const stats = computeStats(god.baseStats, god.passive.modifiers);
    return {
      god,
      weapon: this.index.weapon(god.startingWeapon),
      stats,
      crit: Math.round(stats.critChance * 100),
    };
  });

  protected continue(): void {
    const id = this.selected();
    if (!id) return;
    this.setup.godId.set(id);
    void this.router.navigate(['/realms']);
  }
}
