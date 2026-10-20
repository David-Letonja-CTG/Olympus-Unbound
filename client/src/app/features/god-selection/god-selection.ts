import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  CONTROL_SCHEMES,
  ContentIndex,
  ControlScheme,
  Element,
  GameContent,
  GodDefinition,
  computeStats,
} from '../../../engine';
import { GAME_CONTENT } from '../../core/game-content';
import { ALLY_SKILLS, CONTROL_LABELS, RunSetup } from '../../core/run-setup';
import { ItemIcon } from '../../shared/item-icon';

/** The passive's emblem: the skill icon of the god's first affinity. */
const PASSIVE_ICON: Record<Element, string> = {
  lightning: 'skill_storm',
  shadow: 'skill_shadow',
  fire: 'skill_fire',
  physical: 'skill_strength',
};

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

      <!-- Wide windows: the god's details beside the party, so the screen fits without scrolling. -->
      <div class="columns">
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
                <app-item-icon [sprite]="d.passiveIcon" [size]="44" />
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

        <div class="party-col">
          <!-- Players at this screen (spec: co-op / local co-op on one screen). -->
          <section class="panel allies" aria-labelledby="players-title" data-testid="players">
            <div class="allies-head">
              <h2 id="players-title">Players</h2>
              <p class="hint">
                Friends on this machine play with you on one screen: one on the other side of the
                keyboard, more with gamepads.
              </p>
            </div>
            @if (players().length) {
              <ul class="ally-list">
                <li data-testid="player-0">
                  <app-item-icon [sprite]="godSprite(selected() ?? '')" [size]="40" />
                  <span class="ally-name">Player 1</span>
                  <span class="seat-god">{{ godName(selected() ?? '') }}</span>
                  <select
                    aria-label="Player 1 controls"
                    data-testid="player-0-controls"
                    (change)="setControls(0, $event)"
                  >
                    @for (c of schemes; track c) {
                      <option [value]="c" [selected]="c === setup.firstControls()">
                        {{ controlLabels[c] }}
                      </option>
                    }
                  </select>
                </li>
                @for (p of players(); track $index; let i = $index) {
                  <li [attr.data-testid]="'player-' + (i + 1)">
                    <app-item-icon [sprite]="godSprite(p.godId)" [size]="40" />
                    <span class="ally-name">Player {{ i + 2 }}</span>
                    <span class="seat-god">{{ godName(p.godId) }}</span>
                    <select
                      [attr.aria-label]="'Player ' + (i + 2) + ' controls'"
                      [attr.data-testid]="'player-' + (i + 1) + '-controls'"
                      (change)="setControls(i + 1, $event)"
                    >
                      @for (c of schemes; track c) {
                        <option [value]="c" [selected]="c === p.controls">
                          {{ controlLabels[c] }}
                        </option>
                      }
                    </select>
                    <button
                      class="remove"
                      [attr.aria-label]="'Remove player ' + (i + 2)"
                      [attr.data-testid]="'player-' + (i + 1) + '-remove'"
                      (click)="setup.removePlayer(i)"
                    >
                      ✕
                    </button>
                  </li>
                }
              </ul>
            }
            @if (setup.seatsLeft() > 0) {
              @if (picking() === 'player') {
                <div class="pick" role="group" aria-label="Choose the new player's god">
                  @for (god of gods; track god.id) {
                    <button
                      class="btn pick-god"
                      [attr.data-testid]="'add-player-' + god.id"
                      (click)="addPlayer(god.id)"
                    >
                      <app-item-icon [sprite]="god.visual.sprite" [size]="28" /> {{ god.name }}
                    </button>
                  }
                  <button class="btn" (click)="picking.set(undefined)">Cancel</button>
                </div>
              } @else {
                <button class="btn" data-testid="add-player" (click)="picking.set('player')">
                  + Add a player
                </button>
              }
            }
          </section>

          <!-- Bot allies for a run at this screen (spec: bot-allies / adding allies). -->
          <section class="panel allies" aria-labelledby="allies-title" data-testid="allies">
            <div class="allies-head">
              <h2 id="allies-title">Allies</h2>
              <p class="hint">
                Gods played by the machine fight beside you. The horde grows with every god, as in
                co-op.
              </p>
            </div>
            @if (allies().length) {
              <ul class="ally-list">
                @for (a of allies(); track $index; let i = $index) {
                  <li [attr.data-testid]="'ally-' + i">
                    <app-item-icon [sprite]="godSprite(a.godId)" [size]="40" />
                    <span class="ally-name">{{ godName(a.godId) }}</span>
                    <span
                      class="skills"
                      role="radiogroup"
                      [attr.aria-label]="godName(a.godId) + ' difficulty'"
                    >
                      @for (s of skills; track s.id) {
                        <button
                          class="tab"
                          role="radio"
                          [attr.aria-checked]="a.skill === s.id"
                          [attr.aria-selected]="a.skill === s.id"
                          [attr.data-testid]="'ally-' + i + '-' + s.id"
                          (click)="setup.setAllySkill(i, s.id)"
                        >
                          {{ s.label }}
                        </button>
                      }
                    </span>
                    <button
                      class="remove"
                      [attr.aria-label]="'Remove ' + godName(a.godId)"
                      [attr.data-testid]="'ally-' + i + '-remove'"
                      (click)="setup.removeAlly(i)"
                    >
                      ✕
                    </button>
                  </li>
                }
              </ul>
            }
            @if (setup.seatsLeft() > 0) {
              @if (picking() === 'ally') {
                <div class="pick" role="group" aria-label="Choose an ally">
                  @for (god of gods; track god.id) {
                    <button
                      class="btn pick-god"
                      [attr.data-testid]="'add-ally-' + god.id"
                      (click)="addAlly(god.id)"
                    >
                      <app-item-icon [sprite]="god.visual.sprite" [size]="28" /> {{ god.name }}
                    </button>
                  }
                  <button class="btn" (click)="picking.set(undefined)">Cancel</button>
                </div>
              } @else {
                <button class="btn" data-testid="add-ally" (click)="picking.set('ally')">
                  + Add an ally
                </button>
              }
            }
          </section>
        </div>
      </div>

      <div class="actions sticky">
        <a class="btn" routerLink="/">Back</a>
        <button class="btn btn-primary" [disabled]="!selected()" (click)="continue()">
          Continue
        </button>
      </div>
    </main>
  `,
  styles: `
    /* Every god's card the same size, however long their title. */
    .gods {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
      width: 100%;
    }
    .god-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 18px 16px;
      cursor: pointer;
      color: var(--text);
      text-align: center;
      width: 240px;
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
    .columns {
      display: grid;
      gap: 16px;
      width: min(760px, 100%);
      align-items: start;
    }
    .party-col {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }
    @media (min-width: 1100px) {
      .columns {
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
        width: min(1200px, 100%);
      }
    }
    /* Short windows: smaller god cards. */
    @media (max-height: 820px) {
      .god-card {
        padding: 10px 12px;
        gap: 2px;
      }
      .god-card app-item-icon {
        zoom: 0.7;
      }
      .name {
        font-size: 1.35rem;
      }
    }
    .details {
      min-width: 0;
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
    .allies {
      padding: 16px 22px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .allies-head h2 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--gold-2);
    }
    .allies .hint {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .ally-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }
    .ally-list li {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .ally-name {
      font-family: var(--serif);
      font-size: 1.15rem;
      color: var(--gold-2);
      min-width: 90px;
    }
    .skills {
      display: flex;
      gap: 6px;
    }
    .seat-god {
      color: var(--muted);
      min-width: 70px;
    }
    select {
      font: inherit;
      color: var(--text);
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--line);
      padding: 4px 8px;
    }
    .remove {
      margin-left: auto;
      background: none;
      border: 1px solid var(--line);
      color: var(--muted);
      font: inherit;
      padding: 2px 10px;
      cursor: pointer;
    }
    .remove:hover {
      color: var(--text);
    }
    .pick {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .pick-god {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
    }
  `,
})
export class GodSelection {
  private readonly content: GameContent = inject(GAME_CONTENT);
  protected readonly setup = inject(RunSetup);
  protected readonly allies = this.setup.allies;
  protected readonly players = this.setup.players;
  protected readonly skills = ALLY_SKILLS;
  protected readonly schemes = CONTROL_SCHEMES;
  protected readonly controlLabels = CONTROL_LABELS;
  /** Which god list is open: a new player's or a new ally's. */
  protected readonly picking = signal<'player' | 'ally' | undefined>(undefined);
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
      passiveIcon: PASSIVE_ICON[god.affinities[0] ?? 'lightning'],
    };
  });

  protected addAlly(godId: string): void {
    this.setup.addAlly(godId);
    this.picking.set(undefined);
  }

  protected addPlayer(godId: string): void {
    this.setup.addPlayer(godId);
    this.picking.set(undefined);
  }

  protected setControls(seat: number, event: Event): void {
    this.setup.setControls(seat, (event.target as HTMLSelectElement).value as ControlScheme);
  }

  protected godName(id: string): string {
    return this.content.gods.find((g) => g.id === id)?.name ?? id;
  }

  protected godSprite(id: string): string {
    return this.content.gods.find((g) => g.id === id)?.visual.sprite ?? id;
  }

  protected continue(): void {
    const id = this.selected();
    if (!id) return;
    this.setup.godId.set(id);
    void this.router.navigate(['/realms']);
  }
}
