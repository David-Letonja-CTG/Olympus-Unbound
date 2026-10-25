import { computed, inject, Injectable, signal } from '@angular/core';
import { EventDefinition, GameContent, RealmDefinition } from '../../engine';
import { GAME_CONTENT } from './game-content';

const OVERRIDE_KEY = 'olympus-unbound/event-override';

/** How the admin page set events on this device: by the calendar, all off, or one event forced on. */
export type EventOverride =
  | { readonly mode: 'auto' }
  | { readonly mode: 'off' }
  | { readonly mode: 'on'; readonly id: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** Whether `date`'s month-day falls in the window, inclusive; a window may wrap the new year. */
export function inWindow(window: EventDefinition['window'], date: Date): boolean {
  const day = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return window.from <= window.to
    ? day >= window.from && day <= window.to
    : day >= window.from || day <= window.to;
}

/** The event on at `date` by the calendar alone (the first in content order when several overlap). */
export function eventOn(content: GameContent, date: Date): EventDefinition | undefined {
  return content.events.find((e) => inWindow(e.window, date));
}

/** The last day of an event's window that is still to come from `date`, at its end. */
export function eventEnds(event: EventDefinition, date: Date): Date {
  const [month, day] = event.window.to.split('-').map(Number);
  let end = new Date(date.getFullYear(), month - 1, day, 23, 59, 59);
  if (end < date) end = new Date(date.getFullYear() + 1, month - 1, day, 23, 59, 59);
  return end;
}

function readOverride(): EventOverride {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY) ?? '';
    if (raw === 'off') return { mode: 'off' };
    if (raw.startsWith('on:')) return { mode: 'on', id: raw.slice(3) };
  } catch {
    // Storage blocked: the calendar decides.
  }
  return { mode: 'auto' };
}

/**
 * Which seasonal event is on (spec: seasonal-events): by the device's calendar, unless the admin page switched
 * events on or off for this device. Application code: the simulation only receives the event's id in the run config.
 */
@Injectable({ providedIn: 'root' })
export class SeasonalEvents {
  private readonly content: GameContent = inject(GAME_CONTENT);
  private readonly now = signal(new Date());
  readonly override = signal<EventOverride>(readOverride());

  readonly active = computed<EventDefinition | undefined>(() => {
    const o = this.override();
    if (o.mode === 'off') return undefined;
    if (o.mode === 'on') return this.content.events.find((e) => e.id === o.id);
    return eventOn(this.content, this.now());
  });

  /** Whole days left of the active event, counting today. */
  readonly daysLeft = computed(() => {
    const event = this.active();
    if (!event) return 0;
    const end = eventEnds(event, this.now());
    return Math.max(1, Math.ceil((end.getTime() - this.now().getTime()) / 86_400_000));
  });

  /** The realms a player may choose now: every realm outside events, and the active event's (shown first). */
  readonly realms = computed<readonly RealmDefinition[]>(() => {
    const id = this.active()?.id;
    const own = this.content.realms.filter((r) => r.event && r.event === id);
    return [...own, ...this.content.realms.filter((r) => !r.event)];
  });

  /** The admin page's switch for this device (spec: seasonal-events / admin switch). */
  setOverride(override: EventOverride): void {
    this.override.set(override);
    try {
      if (override.mode === 'auto') localStorage.removeItem(OVERRIDE_KEY);
      else
        localStorage.setItem(OVERRIDE_KEY, override.mode === 'off' ? 'off' : `on:${override.id}`);
    } catch {
      // Storage blocked: the switch lasts until the page reloads.
    }
  }
}
