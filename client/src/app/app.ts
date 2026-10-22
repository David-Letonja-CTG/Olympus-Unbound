import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { debugEnabled } from './core/debug-mode';
import { MenuSound } from './core/menu-sound';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<router-outlet />',
})
export class App {
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
