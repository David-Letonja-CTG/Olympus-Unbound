import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AppUpdate } from '../../core/app-update';
import { InstallPrompt } from '../../core/install-prompt';
import { GAME_CONTENT } from '../../core/game-content';
import { GameServer } from '../../core/game-server';
import { roomsOffered } from '../../core/rooms/room-network';
import { nextGoal } from '../../core/next-goal';
import { Progression } from '../../core/progression';
import { RunSetup } from '../../core/run-setup';
import { SeasonalEvents } from '../../core/seasonal-events';
import { Difficulty } from '../../core/difficulty';
import { ItemIcon } from '../../shared/item-icon';

@Component({
  selector: 'app-main-menu',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen menu">
      <div class="crest" aria-hidden="true"><app-item-icon sprite="zeus" [size]="104" /></div>
      <h1 class="title">Olympus <span>Unbound</span></h1>
      <p class="tagline">Unleash the gods. Survive the divine war.</p>

      <nav class="panel menu-panel" aria-label="Main menu">
        <a class="btn btn-primary" routerLink="/gods">Play</a>
        <!-- The seasonal event while it is on: straight to its realm (spec: seasonal-events / in the menus). -->
        @if (events.active(); as e) {
          <button
            class="btn event"
            data-testid="menu-event"
            [style.--accent]="accent(e.accent)"
            [title]="e.tagline"
            (click)="playEvent()"
          >
            {{ e.name }}
            <span class="event-days">{{ daysText() }}</span>
          </button>
        }
        <!-- The same trial for everyone today (spec: daily-trial); a gold dot until played. -->
        <a
          class="btn daily-trial"
          routerLink="/daily"
          data-testid="menu-daily-trial"
          [attr.aria-label]="trial().playedToday ? 'Daily Trial' : 'Daily Trial, new today'"
        >
          Daily Trial
          @if (!trial().playedToday) {
            <span class="dot" aria-hidden="true"></span>
          }
        </a>
        <!-- Rooms need the game server; a build without one does not offer them (spec: game-server). -->
        @if (coopOffered) {
          <a class="btn" routerLink="/coop" data-testid="menu-coop">Co-op</a>
        }
        <a class="btn" routerLink="/progression">Progression</a>
        <a class="btn" routerLink="/glory" data-testid="menu-glory">Glory</a>
        <a class="btn" routerLink="/settings">Settings</a>
        <a class="btn" routerLink="/intro" data-testid="menu-intro">Intro</a>
      </nav>

      <!-- The nearest unfinished thing, so there is always a reason to press Play (spec: run-setup / main menu). -->
      @if (goal(); as g) {
        <a class="daily" [routerLink]="g.route" data-testid="next-goal">
          <span class="goal-label">Next</span>
          <span class="goal-text">{{ g.text }}</span>
          @if (g.detail) {
            <span class="goal-detail">{{ g.detail }}</span>
          }
        </a>
      }

      <p class="gold">
        <app-item-icon sprite="icon_gold" [size]="22" />
        <span class="gold-amount" data-testid="menu-gold">{{ progression.gold() }}</span> gold
      </p>
      <p class="hint touch-hint">
        Left thumb to move · Power, Dash and Sprint under the right thumb · turn your phone sideways
        to play
      </p>
      <p class="hint keys-hint">
        WASD / arrows or gamepad to move · Shift to sprint · E to dash · Space to unleash your
        ability · Tab for your build · Esc to pause
      </p>
      <!-- Installing and updating the game (spec: installable-app); never shown during a run. -->
      <div class="notices">
        @if (update.ready() || update.broken()) {
          <div class="notice" role="status" data-testid="update-ready">
            <span>{{
              update.broken()
                ? 'This version can no longer load its files.'
                : 'A new version is ready.'
            }}</span>
            <button class="btn btn-primary" (click)="update.reload()">Reload</button>
          </div>
        }
        @if (!install.installed() && !install.dismissed()) {
          @if (install.canPrompt()) {
            <div class="notice" data-testid="install-hint">
              <button class="btn" data-testid="install-game" (click)="install.install()">
                Install the game
              </button>
              <span>Full screen, and playable offline.</span>
              <button class="close" aria-label="Not now" (click)="install.dismissed.set(true)">
                ×
              </button>
            </div>
          } @else if (install.iosHint) {
            <div class="notice" data-testid="install-ios">
              <span
                >To play full screen and offline, tap <strong>Share</strong>, then
                <strong>Add to Home Screen</strong>. The installed game keeps its own saves.</span
              >
              <button class="close" aria-label="Not now" (click)="install.dismissed.set(true)">
                ×
              </button>
            </div>
          }
        }
      </div>
    </main>
  `,
  styles: `
    .menu {
      justify-content: center;
      min-height: 100vh;
      background: radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0, 0, 0, 0.65) 90%);
    }
    .crest {
      filter: drop-shadow(0 0 28px rgba(191, 216, 255, 0.35)) drop-shadow(0 6px 10px #000);
    }
    .title {
      font-size: clamp(2.6rem, 8.5vw, 5.4rem);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-align: center;
      line-height: 1;
      background: linear-gradient(180deg, #f6ebcc 0%, #d9b467 45%, #7a5520 55%, #c9a55a 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      filter: drop-shadow(0 3px 0 #000) drop-shadow(0 0 24px rgba(201, 165, 90, 0.3));
    }
    .title span {
      display: block;
      margin-top: 0.12em;
      font-size: 0.5em;
      letter-spacing: 0.5em;
      padding-left: 0.5em;
    }
    .tagline {
      margin: 0;
      color: var(--muted);
      font-family: var(--serif);
      font-style: italic;
      font-size: 1.1rem;
    }
    .menu-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 10px;
      width: min(320px, 100%);
    }
    .menu-panel .btn {
      text-align: center;
      text-decoration: none;
      font-size: 1.05rem;
    }
    .gold {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: var(--muted);
    }
    .daily {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: baseline;
      gap: 4px 10px;
      max-width: min(520px, 100%);
      padding: 6px 14px;
      color: var(--gold-2);
      font-size: 0.9rem;
      text-align: center;
      text-decoration: none;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      background: linear-gradient(90deg, transparent, rgba(60, 40, 10, 0.55), transparent);
    }
    .goal-label {
      font-family: var(--display);
      font-size: 0.7rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .goal-detail {
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .hint {
      color: var(--muted);
      font-size: 0.85rem;
      text-align: center;
      margin: 0;
    }
    /* Short windows: a smaller crest and title and tighter buttons, so the whole menu fits. */
    @media (max-height: 820px) {
      .menu {
        gap: 12px;
      }
      .crest {
        zoom: 0.62;
      }
      .title {
        font-size: clamp(2.2rem, min(9vh, 11vw), 4.4rem);
      }
      .menu-panel {
        gap: 8px;
      }
      .menu-panel .btn {
        padding-top: 8px;
        padding-bottom: 8px;
      }
    }
    .notices {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: min(560px, calc(100% - 24px));
    }
    .notices:empty {
      display: none;
    }
    .notice {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      font-size: 0.9rem;
      color: var(--text);
      background: rgba(12, 10, 14, 0.94);
      border: 1px solid var(--line);
      box-shadow:
        inset 0 0 0 1px rgba(201, 165, 90, 0.3),
        0 6px 18px rgba(0, 0, 0, 0.6);
    }
    .notice span {
      flex: 1;
    }
    .notice .btn {
      flex: none;
      padding: 6px 14px;
    }
    .close {
      flex: none;
      min-width: 36px;
      min-height: 36px;
      border: 0;
      background: transparent;
      color: var(--muted);
      font-size: 1.4rem;
      cursor: pointer;
    }
    .daily-trial {
      position: relative;
    }
    /* The seasonal event's button glows in its colour. */
    .btn.event {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      color: #fff2e0;
      border-color: var(--accent);
      background:
        radial-gradient(
          ellipse at 50% 0%,
          color-mix(in srgb, var(--accent) 45%, transparent),
          transparent 70%
        ),
        var(--panel);
      box-shadow:
        0 0 14px color-mix(in srgb, var(--accent) 55%, transparent),
        inset 0 0 0 1px color-mix(in srgb, var(--accent) 60%, transparent);
    }
    .event-days {
      font-size: 0.68rem;
      letter-spacing: 0.08em;
      opacity: 0.85;
    }
    .dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--gold-2);
      box-shadow: 0 0 10px rgba(236, 213, 154, 0.9);
    }
    .touch-hint {
      display: none;
    }
    /* Fingers (spec: phone-play): the touch controls, not the keys. */
    @media (pointer: coarse) {
      .touch-hint {
        display: block;
      }
      .keys-hint {
        display: none;
      }
    }
    /* A phone held sideways: the title on the left, the buttons on the right, all on one screen. */
    @media (max-height: 500px) and (min-width: 560px) {
      .menu {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        grid-template-areas:
          'crest nav'
          'title nav'
          'tagline nav'
          'daily nav'
          'gold nav';
        align-content: center;
        justify-items: center;
        column-gap: 24px;
        row-gap: 6px;
      }
      .crest {
        grid-area: crest;
        zoom: 0.45;
      }
      .title {
        grid-area: title;
        font-size: clamp(1.8rem, 11vh, 3rem);
      }
      .tagline {
        grid-area: tagline;
        font-size: 0.9rem;
        text-align: center;
      }
      .daily {
        grid-area: daily;
      }
      .gold {
        grid-area: gold;
      }
      .menu-panel {
        grid-area: nav;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;
        max-width: 380px;
        box-sizing: border-box;
      }
      .menu-panel .btn-primary {
        grid-column: 1 / -1;
      }
      .menu-panel .btn {
        font-size: 0.9rem;
        letter-spacing: 0.06em;
        padding-left: 6px;
        padding-right: 8px;
      }
      .hint {
        display: none;
      }
      .notices {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class MainMenu {
  protected readonly progression = inject(Progression);
  private readonly content = inject(GAME_CONTENT);
  protected readonly update = inject(AppUpdate);
  protected readonly install = inject(InstallPrompt);
  protected readonly coopOffered = roomsOffered(inject(GameServer));

  /** Recomputed whenever the save changes; the date is read then (quests change at local midnight). */
  protected readonly trial = computed(() => {
    this.progression.save();
    return this.progression.trialToday();
  });
  protected readonly events = inject(SeasonalEvents);
  private readonly setup = inject(RunSetup);
  private readonly router = inject(Router);

  constructor() {
    // The difficulty dial every run starts with, fresh from the game server (spec: difficulty-dial).
    void inject(Difficulty).refresh();
  }

  protected readonly daysText = computed(() => {
    const days = this.events.daysLeft();
    return days <= 1 ? 'last day' : `${days} days left`;
  });

  protected accent(color: number): string {
    return '#' + color.toString(16).padStart(6, '0');
  }

  /** The event's realm chosen, then the god (spec: seasonal-events / in the menus). */
  protected playEvent(): void {
    const realm = this.events.realms().find((r) => r.event === this.events.active()?.id);
    this.setup.special.set(undefined);
    if (realm) this.setup.realmId.set(realm.id);
    void this.router.navigate(['/gods']);
  }

  protected readonly goal = computed(() =>
    nextGoal(this.progression.save(), this.content, new Date(), this.trial()),
  );
}
