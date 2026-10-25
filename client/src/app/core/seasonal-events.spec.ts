import { TestBed } from '@angular/core/testing';
import { CONTENT } from '../../content';
import { eventEnds, eventOn, inWindow, SeasonalEvents } from './seasonal-events';

describe('seasonal events (spec: seasonal-events)', () => {
  it('is on inside its window, every year, and off outside it', () => {
    const window = { from: '10-24', to: '11-07' };
    expect(inWindow(window, new Date(2026, 9, 24))).toBe(true);
    expect(inWindow(window, new Date(2027, 10, 7))).toBe(true);
    expect(inWindow(window, new Date(2026, 9, 23))).toBe(false);
    expect(inWindow(window, new Date(2026, 10, 8))).toBe(false);
  });

  it('wraps the new year', () => {
    const winter = { from: '12-20', to: '01-05' };
    expect(inWindow(winter, new Date(2026, 11, 31))).toBe(true);
    expect(inWindow(winter, new Date(2027, 0, 3))).toBe(true);
    expect(inWindow(winter, new Date(2027, 0, 6))).toBe(false);
  });

  it('puts the Night of Hecate on at Halloween, and ends it on November 7', () => {
    expect(eventOn(CONTENT, new Date(2026, 9, 31))?.id).toBe('night_of_hecate');
    expect(eventOn(CONTENT, new Date(2026, 6, 1))).toBeUndefined();
    expect(eventEnds(CONTENT.events[0], new Date(2026, 9, 31)).getDate()).toBe(7);
  });

  it('obeys the admin switch, and offers the event realm first only while on', () => {
    localStorage.removeItem('olympus-unbound/event-override');
    const events = TestBed.inject(SeasonalEvents);
    events.setOverride({ mode: 'on', id: 'night_of_hecate' });
    expect(events.active()?.id).toBe('night_of_hecate');
    expect(events.realms()[0].id).toBe('crossroads_of_hecate');
    events.setOverride({ mode: 'off' });
    expect(events.active()).toBeUndefined();
    expect(events.realms().some((r) => r.event)).toBe(false);
    expect(localStorage.getItem('olympus-unbound/event-override')).toBe('off');
    events.setOverride({ mode: 'auto' });
    expect(localStorage.getItem('olympus-unbound/event-override')).toBeNull();
  });
});
