import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DailyQuestView, Progression } from '../../core/progression';
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
        <a class="btn" routerLink="/coop" data-testid="menu-coop">Co-op</a>
        <a class="btn" routerLink="/progression">Progression</a>
        <a class="btn" routerLink="/glory" data-testid="menu-glory">Glory</a>
        <a class="btn" routerLink="/settings">Settings</a>
        <a class="btn" routerLink="/intro" data-testid="menu-intro">Intro</a>
      </nav>

      @let quests = progression.todayQuests();
      <a class="daily" routerLink="/glory" data-testid="menu-daily">
        Daily quests: {{ doneCount(quests) }} / {{ quests.length }} done
      </a>

      <p class="gold">
        <app-item-icon sprite="icon_gold" [size]="22" />
        <span class="gold-amount" data-testid="menu-gold">{{ progression.gold() }}</span> gold
      </p>
      <p class="hint">
        WASD / arrows or gamepad to move · Shift to sprint · E to dash · Space to unleash your
        ability · Esc to pause
      </p>
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
      color: var(--gold-2);
      font-size: 0.9rem;
      text-decoration: none;
      border-bottom: 1px dotted var(--gold);
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
        font-size: clamp(2.2rem, 9vh, 4.4rem);
      }
      .menu-panel {
        gap: 8px;
      }
      .menu-panel .btn {
        padding-top: 8px;
        padding-bottom: 8px;
      }
    }
  `,
})
export class MainMenu {
  protected readonly progression = inject(Progression);

  protected doneCount(quests: readonly DailyQuestView[]): number {
    return quests.filter((q) => q.done).length;
  }
}
