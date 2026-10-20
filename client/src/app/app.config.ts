import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { AppUpdate } from './core/app-update';
import { InstallPrompt } from './core/install-prompt';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    // Installed and offline play (spec: installable-app): production builds only, once the first screen is idle.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // From the start: the browser's install offer comes early, and updates are checked at launch.
    provideAppInitializer(() => {
      inject(InstallPrompt);
      inject(AppUpdate);
    }),
  ],
};
