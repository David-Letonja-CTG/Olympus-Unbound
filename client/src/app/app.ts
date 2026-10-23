import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { directorPanelEnabled } from './core/debug-mode';
import { MenuSound } from './core/menu-sound';
import { TitleGate } from './core/title-gate';
import { WorldScores } from './core/world-scores';
import { TitleScreen } from './shared/title-screen';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TitleScreen],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <!-- Until the first tap, click or key: browsers allow no sound before it (spec: run-setup / title screen). -->
    @if (gate.open()) {
      <app-title-screen />
    }
  `,
})
export class App {
  protected readonly gate = inject(TitleGate);

  constructor() {
    // Remember `?debug` (and `&director`) from the first page for the whole session (development builds only).
    directorPanelEnabled();
    // The Hall theme and the controls' sounds outside runs (spec: music / the hall theme; hud / menu sounds).
    inject(MenuSound);
    // Runs finished offline go to the world boards now (spec: world-leaderboards / submitting runs).
    void inject(WorldScores).flush();
    // No zoom anywhere (owner's choice, 2026-10-20): Safari pinches through its own gesture events, whatever the
    // viewport and touch-action say.
    if (typeof document !== 'undefined') {
      const block = (event: Event) => event.preventDefault();
      for (const type of ['gesturestart', 'gesturechange'])
        document.addEventListener(type, block, { passive: false });
    }
  }
}
