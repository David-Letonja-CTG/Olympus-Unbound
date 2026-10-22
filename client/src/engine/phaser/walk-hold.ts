/** How long a figure keeps walking after it last moved (ms): short stops and jitter do not restart its walk. */
export const WALK_HOLD_MS = 150;

/**
 * Whether each figure is drawn walking. A figure that moved within the last `WALK_HOLD_MS` still walks, so one pushed
 * about in a crowd, or hovering at its range, keeps its stride instead of flicking between walk and idle; each
 * switch would start the walk over at its first frame and freeze the legs.
 */
export class WalkHold {
  private readonly lastMoved = new Map<number, number>();

  /** `movedNow`: it moved this frame; `time` in ms. */
  walking(id: number, movedNow: boolean, time: number): boolean {
    if (movedNow) {
      this.lastMoved.set(id, time);
      return true;
    }
    const last = this.lastMoved.get(id);
    return last !== undefined && time - last < WALK_HOLD_MS;
  }

  /** Forgets figures that have not moved for a while (call now and then). */
  prune(time: number): void {
    for (const [id, last] of this.lastMoved) if (time - last > 1000) this.lastMoved.delete(id);
  }
}
