import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RunSetup } from '../../core/run-setup';
import { GodSelection } from './god-selection';

describe('God selection allies (spec: bot-allies / adding allies)', () => {
  function render() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(GodSelection);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const click = (id: string) => {
      el.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)?.click();
      fixture.detectChanges();
    };
    return { el, click, setup: TestBed.inject(RunSetup) };
  }

  it('adds allies one by one with a difficulty, at most three, and removes them', () => {
    const { el, click, setup } = render();
    click('add-ally');
    click('add-ally-hades');
    click('ally-0-hard');
    click('add-ally');
    click('add-ally-athena');
    click('ally-1-easy');
    expect(setup.allies()).toEqual([
      { godId: 'hades', skill: 'hard' },
      { godId: 'athena', skill: 'easy' },
    ]);
    click('add-ally');
    click('add-ally-zeus');
    expect(setup.allies()).toHaveLength(3);
    expect(el.querySelector('[data-testid="add-ally"]')).toBeNull();
    click('ally-1-remove');
    expect(setup.allies().map((a) => a.godId)).toEqual(['hades', 'zeus']);
    expect(el.querySelector('[data-testid="add-ally"]')).not.toBeNull();
  });

  it('adds players with their own god and controls, sharing four seats with allies (spec: co-op / local co-op)', () => {
    const { el, click, setup } = render();
    expect(el.querySelector('[data-testid="player-0"]')).toBeNull();
    click('add-player');
    click('add-player-athena');
    expect(setup.players()).toEqual([{ godId: 'athena', controls: 'keys-right' }]);
    expect(setup.controls()).toEqual(['keys-left', 'keys-right']);
    expect(el.querySelector('[data-testid="player-0"]')?.textContent).toContain('Player 1');
    click('add-player');
    click('add-player-hades');
    expect(setup.players()[1].controls).toBe('pad-1');

    // Choosing controls another player has swaps them.
    const select = el.querySelector<HTMLSelectElement>('[data-testid="player-2-controls"]')!;
    select.value = 'keys-left';
    select.dispatchEvent(new Event('change'));
    expect(setup.controls()).toEqual(['pad-1', 'keys-right', 'keys-left']);

    click('add-ally');
    click('add-ally-zeus');
    expect(setup.seatsLeft()).toBe(0);
    expect(el.querySelector('[data-testid="add-player"]')).toBeNull();
    expect(el.querySelector('[data-testid="add-ally"]')).toBeNull();
    click('player-1-remove');
    expect(setup.players().map((p) => p.godId)).toEqual(['hades']);
    expect(el.querySelector('[data-testid="add-player"]')).not.toBeNull();
  });
});
