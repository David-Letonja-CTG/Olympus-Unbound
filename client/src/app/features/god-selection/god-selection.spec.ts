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
});
