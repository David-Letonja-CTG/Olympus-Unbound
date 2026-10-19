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
  stamina: { value: 40, max: 100, dashCost: 35, dashRemaining: 0, dashCooldown: 0.53 },
  weapons: [],
  companions: [],
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
  party: [],
};

function render(hud: HudSnapshot) {
  const fixture = TestBed.createComponent(Hud);
  fixture.componentRef.setInput('hud', hud);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Hud', () => {
  it('shows every god’s health on the left in co-op, and a fallen god’s revive (spec: hud / party health)', () => {
    const member = (id: number, name: string, extra: object = {}) => ({
      id,
      seat: id,
      name,
      god: 'Zeus',
      sprite: 'zeus',
      health: 80,
      maxHealth: 160,
      alive: true,
      revive: 0,
      self: false,
      ...extra,
    });
    expect(render(base).querySelector('[data-testid=hud-party]')).toBeNull();
    expect(
      render({ ...base, party: [member(0, 'Ana', { self: true })] }).querySelector(
        '[data-testid=hud-party]',
      ),
    ).toBeNull();
    const el = render({
      ...base,
      party: [
        member(0, 'Ana', { self: true }),
        member(1, 'Bo', { alive: false, health: 0, revive: 0.5 }),
      ],
    });
    const rows = el.querySelectorAll('[data-testid=hud-party] li');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Ana');
    expect(rows[0].textContent).toContain('80 / 160');
    expect(rows[0].querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('80');
    expect(rows[1].textContent).toContain('Fallen');
  });

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
    expect(
      ready
        .querySelector<HTMLElement>('[data-testid=ability-sweep]')
        ?.style.getPropertyValue('--share'),
    ).toBe('0.0%');
    expect(ready.querySelector('[data-testid=ability-seconds]')).toBeNull();
    expect(ready.querySelector('.ability')?.classList).toContain('ready');
  });

  it('fills the stamina bar to the stamina share (spec: hud / cooldowns and stamina)', () => {
    const el = render(base);
    expect(el.querySelector<HTMLElement>('[data-testid=stamina-fill]')?.style.width).toBe('40%');
    expect(el.querySelector('[data-testid=dash-pip]')?.classList).toContain('ready');
    const tired = render({ ...base, stamina: { ...base.stamina, value: 20 } });
    expect(tired.querySelector('[data-testid=dash-pip]')?.classList).toContain('tired');
  });

  it('sweeps a weapon slot by the share of its cooldown still to run', () => {
    const el = render({
      ...base,
      weapons: [
        {
          id: 'thunder_spear',
          name: 'Thunder Spear',
          level: 1,
          maxLevel: 8,
          sprite: 'thunder_spear',
          color: 0,
          cooldown: 2,
          remaining: 1.5,
        },
        {
          id: 'lightning_orb',
          name: 'Lightning Orbs',
          level: 1,
          maxLevel: 8,
          sprite: 'lightning_orb',
          color: 0,
        },
      ],
    });
    const sweep = el.querySelector<HTMLElement>('[data-testid=weapon-sweep-thunder_spear]');
    expect(sweep?.style.getPropertyValue('--share')).toBe('75.0%');
    // Orbs are always at work: no sweep.
    expect(el.querySelector('[data-testid=weapon-sweep-lightning_orb]')).toBeNull();
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
