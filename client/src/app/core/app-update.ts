import { DestroyRef, Injectable, InjectionToken, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

/** Reloads the page (replaced in tests). */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => () => document.location.reload(),
});

/** How often a running game asks whether a new version has been published. */
const CHECK_MS = 30 * 60 * 1000;

/**
 * New versions of the installed or cached game (spec: installable-app / updates): the service worker downloads a
 * release in the background; the main menu offers to reload into it. Nothing here reloads by itself, so a run is
 * never interrupted. Inert where the worker is off (development builds, tests, browsers without service workers).
 */
@Injectable({ providedIn: 'root' })
export class AppUpdate {
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly reloadPage = inject(PAGE_RELOAD);
  /** A newer version is downloaded and waits for a reload. */
  readonly ready = signal(false);
  /** The cached version can no longer load its files: only a reload helps. */
  readonly broken = signal(false);

  constructor() {
    const updates = this.updates;
    if (!updates?.isEnabled) return;
    const versions = updates.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') this.ready.set(true);
    });
    const unrecoverable = updates.unrecoverable.subscribe(() => this.broken.set(true));
    const check = () => void updates.checkForUpdate().catch(() => undefined);
    check();
    const timer = setInterval(check, CHECK_MS);
    inject(DestroyRef).onDestroy(() => {
      versions.unsubscribe();
      unrecoverable.unsubscribe();
      clearInterval(timer);
    });
  }

  /** Into the new version (or a fresh copy of a broken one). */
  async reload(): Promise<void> {
    try {
      if (this.ready() && this.updates?.isEnabled) await this.updates.activateUpdate();
    } finally {
      this.reloadPage();
    }
  }
}
