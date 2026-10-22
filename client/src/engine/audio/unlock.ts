/** Inputs a browser may count as the gesture that allows sound; which ones count differs by browser and device. */
const GESTURES = ['keydown', 'pointerdown', 'pointerup', 'mousedown', 'touchend', 'click'] as const;

/**
 * Browsers keep a new audio context suspended until a user gesture. Tries to resume `ctx` on every gesture until it
 * runs, then stops listening (spec: music / the hall theme). A gesture the browser does not count (a finger
 * touching down: phones allow sound only when it lifts) no longer uses up the unlock. `wanted`: whether sound is
 * wanted now; while false, gestures leave the context as it is.
 */
export function unlockOnGesture(ctx: AudioContext, wanted: () => boolean = () => true): void {
  const done = () => {
    for (const type of GESTURES) window.removeEventListener(type, attempt, true);
  };
  function attempt(): void {
    if (ctx.state === 'running' || ctx.state === 'closed') return done();
    if (!wanted()) return;
    void ctx
      .resume()
      .then(() => {
        if (ctx.state === 'running') done();
      })
      .catch(() => undefined);
  }
  for (const type of GESTURES) window.addEventListener(type, attempt, true);
}
