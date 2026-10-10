import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Progression } from '../../core/progression';
import { ItemIcon } from '../../shared/item-icon';

@Component({
  selector: 'app-main-menu',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen menu">
      <div class="crest" aria-hidden="true"><app-item-icon sprite="zeus" [size]="96" /></div>
      <h1 class="title">OLYMPUS <span>UNBOUND</span></h1>
      <p class="tagline">Unleash the gods. Survive the divine war.</p>

      <nav class="panel menu-panel" aria-label="Main menu">
        <a class="btn btn-primary" routerLink="/gods">Play</a>
        <a class="btn" routerLink="/progression">Progression</a>
        <a class="btn" routerLink="/settings">Settings</a>
      </nav>

      <p class="gold">
        <app-item-icon sprite="icon_gold" [size]="22" />
        <span class="gold-amount" data-testid="menu-gold">{{ progression.gold() }}</span> gold
      </p>
      <p class="hint">
        WASD / arrows or gamepad to move · Space to unleash your ability · Esc to pause
      </p>
    </main>
  `,
  styles: `
    .menu {
      justify-content: center;
      min-height: 100vh;
    }
    .crest {
      filter: drop-shadow(0 0 24px rgba(255, 222, 122, 0.45));
    }
    .title {
      font-size: clamp(2.4rem, 8vw, 5rem);
      letter-spacing: 0.08em;
      text-align: center;
      background: linear-gradient(180deg, #fff3c4 10%, #e8c25a 60%, #a8761c);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      line-height: 1.05;
    }
    .title span {
      display: block;
      font-size: 0.55em;
      letter-spacing: 0.4em;
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
      padding: 24px;
      width: min(320px, 100%);
    }
    .menu-panel .btn {
      text-align: center;
      text-decoration: none;
      font-size: 1.1rem;
    }
    .gold {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: var(--muted);
    }
    .hint {
      color: var(--muted);
      font-size: 0.85rem;
      text-align: center;
      margin: 0;
    }
  `,
})
export class MainMenu {
  protected readonly progression = inject(Progression);
}
