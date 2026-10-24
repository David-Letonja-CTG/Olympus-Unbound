import { TestBed } from '@angular/core/testing';
import { HudCombo, HudSnapshot } from '../../../engine';
import { BuildPanel } from './build-panel';

const forge = (extra: Partial<HudCombo> = {}): HudCombo => ({
  id: 'forge_of_hephaestus',
  name: 'Forge of Hephaestus',
  description: '+15% fire and physical damage and +5% area per level.',
  kind: 'fusion',
  tier: 1,
  level: 0,
  maxLevel: 3,
  state: 'locked',
  sprite: 'fusion_forge',
  needs: [
    { name: 'Flaming Sword', sprite: 'flaming_sword', have: 6, need: 6, met: true },
    { name: 'War Hammer', sprite: 'war_hammer', have: 4, need: 6, met: false },
  ],
  ...extra,
});

function render(tree: HudCombo[]): HTMLElement {
  const hud = {
    weapons: [],
    relics: [],
    build: { skills: [], fusions: [], ascensions: [], tree },
  } as unknown as HudSnapshot;
  const fixture = TestBed.createComponent(BuildPanel);
  fixture.componentRef.setInput('hud', hud);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('BuildPanel (spec: hud / the build panel)', () => {
  it('shows a locked fusion with what is met and the level still needed', () => {
    const el = render([forge()]);
    const entry = el.querySelector('[data-testid=combo-forge_of_hephaestus]');
    expect(entry?.textContent).toContain('Forge of Hephaestus');
    expect(
      el.querySelector('[data-testid=combo-state-forge_of_hephaestus]')?.textContent,
    ).toContain('Locked');
    const needs = [...(entry?.querySelectorAll('.needs li') ?? [])];
    expect(needs[0].classList.contains('met')).toBe(true);
    expect(needs[1].classList.contains('met')).toBe(false);
    expect(needs[1].textContent).toContain('4/6');
  });

  it('shows ready and active fusions by tier, synergies apart', () => {
    const el = render([
      forge({ state: 'ready' }),
      forge({ id: 'wrath_of_the_twelve', tier: 2, state: 'active', level: 1, maxLevel: 2 }),
      forge({ id: 'storm', kind: 'synergy', state: 'locked' }),
    ]);
    expect(
      el.querySelector('[data-testid=combo-state-forge_of_hephaestus]')?.textContent,
    ).toContain('Ready');
    expect(
      el.querySelector('[data-testid=combo-state-wrath_of_the_twelve]')?.textContent,
    ).toContain('Lv 1/2');
    const titles = [...el.querySelectorAll('h3')].map((h) => h.textContent?.trim());
    expect(titles).toEqual([
      'Fusions · Tier I',
      'Fusions · Tier II',
      'Synergies · activate on their own',
    ]);
  });
});
