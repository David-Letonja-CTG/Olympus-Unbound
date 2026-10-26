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
    const hecate = CONTENT.events.find((e) => e.id === 'night_of_hecate')!;
    expect(eventOn(CONTENT, new Date(2026, 9, 31))?.id).toBe('night_of_hecate');
    expect(eventOn(CONTENT, new Date(2026, 6, 20))).toBeUndefined();
    expect(eventEnds(hecate, new Date(2026, 9, 31)).getDate()).toBe(7);
  });

  it('puts the winter events on over their holidays (spec: seasonal-events / the winter events)', () => {
    const on = (month: number, day: number) => eventOn(CONTENT, new Date(2026, month - 1, day))?.id;
    expect(on(12, 25)).toBe('longest_night');
    expect(on(12, 31)).toBe('longest_night');
    expect(on(1, 1)).toBe('longest_night');
    expect(on(1, 20)).toBe('winds_of_boreas');
    expect(on(2, 14)).toBe('festival_of_eros');
    expect(on(3, 17)).toBe('apples_of_hesperides');
    expect(on(3, 25)).toBeUndefined();
  });

  it('puts the spring and summer events on over their holidays (spec: seasonal-events)', () => {
    const on = (month: number, day: number) => eventOn(CONTENT, new Date(2026, month - 1, day))?.id;
    expect(on(4, 1)).toBe('revels_of_pan');
    expect(on(5, 1)).toBe('hunt_of_artemis');
    expect(on(6, 21)).toBe('midsummer_of_apollo');
    expect(on(7, 4)).toBe('theft_of_fire');
    expect(on(7, 15)).toBeUndefined();
  });

  it('never runs two events on the same day', () => {
    for (let day = 0; day < 366; day++) {
      const date = new Date(2028, 0, 1 + day);
      const on = CONTENT.events.filter((e) => inWindow(e.window, date)).map((e) => e.id);
      expect(on.length, `${date.toDateString()}: ${on.join(', ')}`).toBeLessThanOrEqual(1);
    }
  });

  it('gives every event its own realm, currency picture and shop', () => {
    for (const event of CONTENT.events) {
      expect(CONTENT.realms.filter((r) => r.event === event.id).length, event.id).toBe(1);
      expect(event.currency.sprite, event.id).toBeTruthy();
      expect(CONTENT.eventRewards.filter((r) => r.event === event.id).length).toBeGreaterThan(2);
    }
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
