import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Chrome's install event (not in TypeScript's DOM library). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

/** The game opened as an installed app: full screen or standalone, or from the iOS Home Screen. */
function runsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const query = '(display-mode: fullscreen), (display-mode: standalone)';
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios || !!window.matchMedia?.(query).matches;
}

/** iPhone and iPad Safari (an iPad may call itself a Mac with touch); not other browsers on iOS, which cannot install. */
function iosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/**
 * Installing the game (spec: installable-app / install hint): keeps the browser's install offer for the main menu's
 * button, knows when the game already runs installed, and when only Safari's Add to Home Screen will do.
 */
@Injectable({ providedIn: 'root' })
export class InstallPrompt {
  private deferred: BeforeInstallPromptEvent | undefined;
  /** The browser offers to install the game: the button can open its prompt. */
  readonly canPrompt = signal(false);
  /** The game runs as an installed app. */
  readonly installed = signal(runsInstalled());
  /** iPhone or iPad Safari outside the installed app: explain Add to Home Screen instead. */
  readonly iosHint = !this.installed() && iosSafari();
  /** The player closed the hint; for this visit only (nothing saved, D8). */
  readonly dismissed = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;
    const offer = (event: Event) => {
      // Keep the offer for the menu's button instead of the browser's own banner.
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
      this.canPrompt.set(true);
    };
    const installed = () => {
      this.deferred = undefined;
      this.canPrompt.set(false);
      this.installed.set(true);
    };
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', installed);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('beforeinstallprompt', offer);
      window.removeEventListener('appinstalled', installed);
    });
  }

  /** Opens the browser's install prompt; an offer can be used once. */
  async install(): Promise<void> {
    const event = this.deferred;
    if (!event) return;
    this.deferred = undefined;
    this.canPrompt.set(false);
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // The browser withdrew the offer; nothing to do.
    }
  }
}
