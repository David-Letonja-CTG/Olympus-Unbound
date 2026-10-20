import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** A live media query as a signal; false where media queries are missing (unit tests in jsdom). */
function mediaSignal(query: string, destroyRef: DestroyRef) {
  const list = typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined;
  const value = signal(!!list?.matches);
  if (list) {
    const update = (event: MediaQueryListEvent) => value.set(event.matches);
    list.addEventListener?.('change', update);
    destroyRef.onDestroy(() => list.removeEventListener?.('change', update));
  }
  return value.asReadonly();
}

/**
 * What kind of screen the game is on (spec: phone-play): a touch device (its main pointer is a finger), one with only
 * touch (no mouse or trackpad at all), and whether it is held upright. Also asks for fullscreen in landscape when a
 * run starts, where the browser allows it.
 */
@Injectable({ providedIn: 'root' })
export class TouchScreen {
  private readonly destroyRef = inject(DestroyRef);
  /** The main pointer is coarse: touch controls are shown in a run. */
  readonly touch = mediaSignal('(pointer: coarse)', this.destroyRef);
  private readonly fine = mediaSignal('(any-pointer: fine)', this.destroyRef);
  readonly portrait = mediaSignal('(orientation: portrait)', this.destroyRef);

  /** No mouse or trackpad: local co-op on one screen is not offered (spec: phone-play / co-op on a phone). */
  touchOnly(): boolean {
    return this.touch() && !this.fine();
  }

  /**
   * Fullscreen and landscape for a run on a touch device (spec: phone-play / the phone screen). Must be called from a
   * tap. A browser that refuses (iPhone Safari has no element fullscreen) leaves the page as it is; never throws.
   */
  enterFullscreen(): void {
    if (!this.touch() || typeof document === 'undefined' || document.fullscreenElement) return;
    const root = document.documentElement;
    try {
      void root
        .requestFullscreen?.({ navigationUI: 'hide' })
        ?.then(() => lockLandscape())
        .catch(() => undefined);
    } catch {
      // Not allowed here: the run starts in the window.
    }
  }
}

function lockLandscape(): void {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
  };
  try {
    void orientation?.lock?.('landscape')?.catch(() => undefined);
  } catch {
    // Orientation lock is not supported: the rotate overlay asks instead.
  }
}
