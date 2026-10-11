import { TestBed } from '@angular/core/testing';
import { HudSnapshot } from '../../../engine';
import { contrastRatio, UI_PALETTE } from '../../shared/ui-palette';
import { Hud } from './hud';

const base: HudSnapshot = {
  time: 61,
  phase: 'playing',
  health: 60,
  maxHealth: 120,
  level: 3,
  xp: 2,
  xpToNext: 8,
  gold: 5,
  kills: 9,
  ability: { name: 'Wrath of Olympus', sprite: 'wrath_of_olympus', cooldown: 25, remaining: 10 },
  weapons: [],
  relics: [],
  synergies: [],
  boss: {
    name: 'The Cyclops',
    title: 'Forge-Giant of the Mountain',
    health: 12000,
    maxHealth: 12000,
  },
  enemies: 0,
  waitingFor: [],
  realm: { name: 'Mount Olympus', number: 1 },
};

function render(hud: HudSnapshot) {
  const fixture = TestBed.createComponent(Hud);
  fixture.componentRef.setInput('hud', hud);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Hud', () => {
  it('fills the health amphora to the health fraction and shows the numbers', () => {
    const el = render(base);
    expect(el.querySelector('[data-testid=hud-health]')?.textContent).toContain('60 / 120');
    // The vessel spans y 30–130: half health puts the liquid's surface at 80.
    expect(el.querySelector('[data-testid=health-fill]')?.getAttribute('y')).toBe('80');
  });

  it('darkens 40% of the ability slot with 10 of 25 seconds left', () => {
    const el = render(base);
    const sweep = el.querySelector<HTMLElement>('[data-testid=ability-sweep]');
    expect(sweep?.style.getPropertyValue('--share')).toBe('40.0%');
    expect(el.querySelector('[data-testid=ability-seconds]')?.textContent).toBe('10');
    const ready = render({ ...base, ability: { ...base.ability, remaining: 0 } });
    expect(ready.querySelector('[data-testid=ability-sweep]')).toBeNull();
  });

  it('shows the boss banner with a full bar on arrival', () => {
    const el = render(base);
    expect(el.querySelector('[data-testid=boss-bar]')?.textContent).toContain('The Cyclops');
    expect(
      el.querySelector('[data-testid=boss-bar] [role=progressbar]')?.getAttribute('aria-valuenow'),
    ).toBe('100');
  });
});

describe('UI palette', () => {
  it('keeps text and numbers at a contrast of at least 4.5:1 on their backgrounds', () => {
    const p = UI_PALETTE;
    for (const [fg, bg] of [
      [p.text, p.bg],
      [p.text, p.panel],
      [p.muted, p.panel],
      [p.gold2, p.plaque],
      [p.text, p.plaque],
      [p.buttonText, p.goldButton],
    ]) {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
