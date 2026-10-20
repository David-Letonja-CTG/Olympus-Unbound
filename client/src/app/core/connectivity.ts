import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Whether the device has a network (spec: installable-app / rooms need a connection). Only rooms need one: the
 * installed game plays everything else offline.
 */
@Injectable({ providedIn: 'root' })
export class Connectivity {
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine !== false);

  constructor() {
    if (typeof window === 'undefined') return;
    const update = () => this.online.set(navigator.onLine !== false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    });
  }
}
