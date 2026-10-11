import { PeerLink } from '../net/link';

/** One end of an in-memory link pair; `flush` delivers what was sent so far. */
export interface MemoryLink extends PeerLink {
  readonly sent: unknown[];
}

/**
 * Two connected in-memory `PeerLink`s for tests. Messages are cloned like over a real channel and wait until
 * `flush()`, so tests control when they arrive.
 */
export function memoryLinkPair(): { a: MemoryLink; b: MemoryLink; flush(): void } {
  const queues: [unknown[], unknown[]] = [[], []];
  const listeners: [Set<(m: unknown) => void>, Set<(m: unknown) => void>] = [new Set(), new Set()];
  const closers: [Set<() => void>, Set<() => void>] = [new Set(), new Set()];
  let open = true;

  const end = (me: 0 | 1): MemoryLink => {
    const other = (1 - me) as 0 | 1;
    const sent: unknown[] = [];
    return {
      sent,
      send(message) {
        if (!open) return;
        const copy = structuredClone(message);
        sent.push(copy);
        queues[other].push(copy);
      },
      onMessage(listener) {
        listeners[me].add(listener);
        return () => listeners[me].delete(listener);
      },
      onClose(listener) {
        closers[me].add(listener);
        return () => closers[me].delete(listener);
      },
      close() {
        if (!open) return;
        open = false;
        for (const side of [0, 1] as const) for (const c of closers[side]) c();
      },
    };
  };

  return {
    a: end(0),
    b: end(1),
    flush() {
      for (let side = 0; side < 2; side++) {
        const queue = queues[side];
        while (queue.length) {
          const m = queue.shift();
          for (const l of listeners[side]) l(m);
        }
      }
    },
  };
}
