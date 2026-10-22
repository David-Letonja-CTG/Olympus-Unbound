import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { debugEnabled } from './core/debug-mode';
import { MenuSound } from './core/menu-sound';
import { TitleGate } from './core/title-gate';
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
    // Remember `?debug` from the first page for the whole session (development builds only).
    debugEnabled();
    // The Hall theme and the controls' sounds outside runs (spec: music / the hall theme; hud / menu sounds).
    inject(MenuSound);
    // No zoom anywhere (owner's choice, 2026-10-20): Safari pinches through its own gesture events, whatever the
    // viewport and touch-action say.
    if (typeof document !== 'undefined') {
      const block = (event: Event) => event.preventDefault();
      for (const type of ['gesturestart', 'gesturechange'])
        document.addEventListener(type, block, { passive: false });
    }
  }
}
