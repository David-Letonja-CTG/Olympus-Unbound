import { TestBed } from '@angular/core/testing';
import { ControlScheme, HudPartyMember, HudSnapshot } from '../../../../engine';
import { contrastRatio, UI_PALETTE } from '../../../shared/ui-palette';
import { Hud } from './hud';

const base: HudSnapshot = {
  time: 61,
  realmTime: 61,
  surge: 0,
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
  encounters: [],
  boons: [],
  build: { skills: [], fusions: [], ascensions: [], tree: [] },
};

function render(
  hud: HudSnapshot,
  locals: readonly HudSnapshot[] = [],
  controls?: readonly ControlScheme[],
) {
  const fixture = TestBed.createComponent(Hud);
  fixture.componentRef.setInput('hud', hud);
  fixture.componentRef.setInput('locals', locals);
  fixture.componentRef.setInput('controls', controls);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const member = (id: number, name: string, extra: Partial<HudPartyMember> = {}): HudPartyMember => ({
  id,
  seat: id - 1,
  name,
  god: 'Zeus',
  sprite: 'zeus',
  health: 80,
  maxHealth: 160,
  alive: true,
  revive: 0,
  self: false,
  stamina: 1,
  ability: 1,
  ...extra,
});

/** Player `n`'s own HUD in a party of `count` at one screen. */
const seatHud = (n: number, count: number, extra: Partial<HudSnapshot> = {}): HudSnapshot => ({
  ...base,
  party: Array.from({ length: count }, (_, i) =>
    member(i + 1, `Player ${i + 1}`, { self: i + 1 === n, local: true }),
  ),
  ...extra,
});

describe('Hud', () => {
  it('shows gods not played here as medallions, never the player twice (spec: hud / party health)', () => {
    expect(render(base).querySelector('[data-testid=hud-party]')).toBeNull();
    // Solo with a bot: only the bot.
    const withBot = render({
      ...base,
      party: [member(1, 'You', { self: true }), member(2, 'Hades', { bot: true })],
    });
    expect(withBot.querySelectorAll('[data-testid=hud-party] li').length).toBe(1);
    expect(withBot.querySelector('[data-testid=medallion-1]')?.textContent).toContain('bot');
    expect(withBot.querySelector('[data-testid=medallion-ability-1]')).toBeNull();

    // A room: the friend's health ring a fifth full, then fallen with the revive half done.
    const friend = render({
      ...base,
      party: [member(1, 'Ana', { self: true }), member(2, 'Bo', { health: 32, ability: 0.4 })],
    });
    expect(friend.querySelector('[data-testid=medallion-ring-1]')?.getAttribute('data-share')).toBe(
      '20',
    );
    expect(friend.querySelector('[data-testid=medallion-ability-1]')?.classList).not.toContain(
      'ready',
    );
    const fallen = render({
      ...base,
      party: [
        member(1, 'Ana', { self: true }),
        member(2, 'Bo', { alive: false, health: 0, revive: 0.5 }),
      ],
    });
    expect(fallen.querySelector('[data-testid=medallion-1]')?.classList).toContain('fallen');
    expect(fallen.querySelector('[data-testid=medallion-ring-1]')?.getAttribute('data-share')).toBe(
      '50',
    );
  });

  it('splits the frieze between two players at one screen, each with their own keys (spec: hud / local players)', () => {
    const one = seatHud(1, 2);
    const two = seatHud(2, 2, {
      health: 30,
      ability: { ...base.ability, remaining: 5 },
      stamina: { ...base.stamina, value: 40 },
    });
    const el = render(one, [one, two], ['keys-left', 'keys-right']);
    expect(el.classList).toContain('duo');
    expect(el.querySelector('app-god-plaque.left [data-testid=plaque-0]')).not.toBeNull();
    expect(el.querySelector('app-god-plaque.right [data-testid=plaque-1]')).not.toBeNull();
    expect(el.querySelector('[data-testid=hud-health-p2]')?.textContent).toContain('30 / 120');
    // Player 2's stamina rings their orb; their ability shows its sweep and their key.
    expect(el.querySelector('[data-testid=stamina-ring-p2]')?.getAttribute('data-share')).toBe(
      '40',
    );
    expect(
      el
        .querySelector<HTMLElement>('[data-testid=ability-sweep-p2]')
        ?.style.getPropertyValue('--share'),
    ).toBe('20.0%');
    expect(el.querySelector('[data-testid=plaque-1]')?.textContent).toContain('Enter');
    expect(el.querySelector('[data-testid=plaque-0]')?.textContent).toContain('Space');
    // Nobody twice: no medallions, no frieze-only ichor orb.
    expect(el.querySelector('[data-testid=hud-party]')).toBeNull();
    expect(el.querySelector('[data-testid=stamina-fill]')).toBeNull();
    expect(el.querySelectorAll('[data-testid=hud-level]').length).toBe(1);
  });

  it('gives three or four players a plaque in every corner, and greys a fallen one', () => {
    const huds = [1, 2, 3, 4].map((n) => seatHud(n, 4));
    const party = huds[0].party.map((m) => (m.id === 4 ? { ...m, alive: false, revive: 0.25 } : m));
    const fourth = { ...huds[3], health: 0, party: party.map((m) => ({ ...m, self: m.id === 4 })) };
    const el = render(
      { ...huds[0], party },
      [huds[0], huds[1], huds[2], fourth],
      ['keys-left', 'keys-right', 'pad-1', 'pad-2'],
    );
    expect(el.classList).toContain('corners');
    for (let i = 0; i < 4; i++)
      expect(
        el.querySelector(`app-god-plaque.corner-${i} [data-testid=plaque-${i}]`),
      ).not.toBeNull();
    expect(el.querySelector('[data-testid=plaque-2]')?.textContent).toContain('A');
    expect(el.querySelector('[data-testid=plaque-3]')?.classList).toContain('fallen');
    expect(el.querySelector('[data-testid=hud-health-p4]')?.textContent).toContain('Fallen · 25%');
    expect(el.querySelector('.frieze')).toBeNull();
  });

  it('fills the orb of blood to the health fraction and shows the numbers', () => {
    const el = render(base);
    expect(el.querySelector('[data-testid=hud-health]')?.textContent).toContain('60 / 120');
    // The orb spans y 50–174: half health puts the blood's surface at its centre, 112.
    expect(el.querySelector('[data-testid=health-fill]')?.getAttribute('y')).toBe('112');
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

  it('fills the orb of ichor to the stamina share (spec: hud / cooldowns and stamina)', () => {
    const el = render(base);
    expect(el.classList).toContain('frieze');
    expect(el.querySelector('[data-testid=stamina-fill]')?.getAttribute('data-share')).toBe('40');
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

  it('by touch, leaves the ability to the Power button and drops key hints (spec: phone-play / phone HUD)', () => {
    const el = render(base, [], ['touch']);
    expect(el.classList.contains('touch')).toBe(true);
    expect(el.querySelector('.solo-ability')).toBeNull();
    expect(el.querySelector('.dash-key')).toBeNull();
    expect(el.querySelector('[data-testid=hud-health]')).toBeTruthy();
    expect(el.querySelector('[data-testid=hud-level]')).toBeTruthy();
  });

  it("shows the Director's encounters, a contract's terms and blessings (spec: hud / encounters on the hud)", () => {
    expect(render(base).querySelector('[data-testid=hud-encounters]')).toBeNull();
    expect(render(base).querySelector('[data-testid=hud-boons]')).toBeNull();
    const el = render({
      ...base,
      encounters: [
        {
          uid: 1,
          id: 'monster_invasion',
          name: 'Monster Invasion',
          phase: 'active',
          objective: 'Repel the invaders',
          left: 12,
          seconds: 39.2,
          major: true,
        },
        {
          uid: 2,
          id: 'champion_contract',
          name: "Champion's Challenge",
          phase: 'active',
          objective: 'Step into the altar to call a champion',
          seconds: 14.5,
          risk: 'A champion hunts you for 90 s',
          reward: '+120 gold · a treasure chest',
          major: true,
        },
      ],
      boons: [
        {
          id: 'swiftness_of_hermes',
          name: 'Swiftness of Hermes',
          description: '+25% movement speed.',
          sprite: 'boon_swiftness',
          color: 0x7ee0a1,
          left: 11.4,
          seconds: 30,
        },
      ],
    });
    const items = el.querySelectorAll('[data-testid=hud-encounters] li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Monster Invasion');
    expect(items[0].textContent).toContain('Repel the invaders');
    expect(items[0].textContent).toContain('12 left · 40 s');
    expect(items[1].textContent).toContain('Risk: A champion hunts you for 90 s');
    expect(items[1].textContent).toContain('Reward: +120 gold · a treasure chest');
    expect(items[1].textContent).toContain('15 s');
    expect(el.querySelector('[data-testid=hud-boons]')?.textContent).toContain(
      'Swiftness of Hermes · 12 s',
    );
  });

  it('gives Director announcements their own style', () => {
    const fixture = TestBed.createComponent(Hud);
    fixture.componentRef.setInput('hud', base);
    fixture.componentRef.setInput('announcements', [
      { id: 1, text: 'An eclipse falls', kind: 'omen' },
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.announcement.kind-omen')?.textContent).toContain('An eclipse falls');
  });
});
