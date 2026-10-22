import { Injectable, InjectionToken, inject, signal } from '@angular/core';

/** How long the title screen takes to dissolve once entered. */
export const LEAVE_MS = 700;

/** What the gate reads from the browser; tests pass their own. */
export interface GateEnvironment {
  /** Whether the page has had a user gesture (`navigator.userActivation`); undefined where the browser cannot say. */
  readonly activated: boolean | undefined;
  /** A new audio context would play at once: the browser allows sound here already (e.g. a site it trusts). */
  readonly audible: boolean;
  /** A browser under automation (`navigator.webdriver`). */
  readonly automated: boolean;
  /** The page's address asks for the title screen whatever the browser (`?gate`). */
  readonly asked: boolean;
}

/** Whether the browser lets a new audio context run without a gesture; true without Web Audio (nothing to unlock). */
function audioAllowed(): boolean {
  if (typeof AudioContext === 'undefined') return true;
  try {
    const probe = new AudioContext();
    const running = probe.state === 'running';
    void probe.close().catch(() => undefined);
    return running;
  } catch {
    return false;
  }
}

function browserEnvironment(): GateEnvironment {
  if (typeof navigator === 'undefined' || typeof location === 'undefined')
    return { activated: true, audible: true, automated: false, asked: false };
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation;
  return {
    activated: activation?.hasBeenActive,
    audible: audioAllowed(),
    automated: navigator.webdriver === true,
    asked: new URLSearchParams(location.search).has('gate'),
  };
}

/** The browser the gate reads; tests give their own. */
export const GATE_ENVIRONMENT = new InjectionToken<GateEnvironment>('GATE_ENVIRONMENT', {
  providedIn: 'root',
  factory: browserEnvironment,
});

/** Whether the title screen shows when the page opens (spec: run-setup / title screen). */
export function gateNeeded(env: GateEnvironment): boolean {
  // `?gate` shows it anyway: for tests under automation, and for looking at it where sound is allowed.
  if (env.asked) return true;
  if (env.automated) return false;
  // Where the browser cannot say whether it was touched, it may still hold sound back: show it.
  return env.activated !== true && !env.audible;
}

/**
 * The title screen in front of the game until the player's first tap, click or key (spec: run-setup / title
 * screen): browsers allow no sound before one, so that gesture is what lets the Hall theme and the intro begin.
 */
@Injectable({ providedIn: 'root' })
export class TitleGate {
  /** The title screen is showing (also while it dissolves). */
  readonly open = signal(gateNeeded(inject(GATE_ENVIRONMENT)));
  /** It is dissolving into the game. */
  readonly leaving = signal(false);
  private release!: () => void;
  /** Resolves when the player has entered (at once when there is no title screen). */
  readonly entered = new Promise<void>((resolve) => (this.release = resolve));

  constructor() {
    if (!this.open()) this.release();
  }

  enter(): void {
    if (!this.open() || this.leaving()) return;
    this.leaving.set(true);
    this.release();
    setTimeout(() => this.open.set(false), LEAVE_MS);
  }
}
