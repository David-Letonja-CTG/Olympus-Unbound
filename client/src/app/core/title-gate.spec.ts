import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TitleScreen } from '../shared/title-screen';
import { GATE_ENVIRONMENT, GateEnvironment, gateNeeded, LEAVE_MS, TitleGate } from './title-gate';

const locked: GateEnvironment = {
  activated: false,
  audible: false,
  automated: false,
  asked: false,
};

describe('title screen (spec: run-setup / title screen)', () => {
  it('shows while the browser still holds sound back, and not where sound is allowed', () => {
    expect(gateNeeded(locked)).toBe(true);
    expect(gateNeeded({ ...locked, activated: undefined })).toBe(true);
    expect(gateNeeded({ ...locked, activated: true })).toBe(false);
    expect(gateNeeded({ ...locked, audible: true })).toBe(false);
  });

  it('is skipped under automation, and shown wherever the address asks for it', () => {
    expect(gateNeeded({ ...locked, automated: true })).toBe(false);
    expect(gateNeeded({ ...locked, automated: true, asked: true })).toBe(true);
    expect(gateNeeded({ ...locked, activated: true, audible: true, asked: true })).toBe(true);
  });

  function open(env: GateEnvironment = locked) {
    TestBed.configureTestingModule({ providers: [{ provide: GATE_ENVIRONMENT, useValue: env }] });
    return TestBed.inject(TitleGate);
  }

  it('lets the game in when entered, then closes after its dissolve', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      const gate = open();
      let entered = false;
      void gate.entered.then(() => (entered = true));
      expect(gate.open()).toBe(true);
      gate.enter();
      await Promise.resolve();
      expect(entered).toBe(true);
      expect(gate.leaving()).toBe(true);
      expect(gate.open()).toBe(true);
      vi.advanceTimersByTime(LEAVE_MS);
      expect(gate.open()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('is entered at once where there is no title screen', async () => {
    const gate = open({ ...locked, activated: true });
    expect(gate.open()).toBe(false);
    await expect(gate.entered).resolves.toBeUndefined();
  });

  it('enters on a key (not Escape or Tab), a click or a lifted touch', () => {
    for (const fire of [
      (el: HTMLElement) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })),
      (el: HTMLElement) => el.click(),
      (el: HTMLElement) => el.dispatchEvent(new Event('pointerup')),
    ]) {
      TestBed.resetTestingModule();
      const gate = open();
      const fixture = TestBed.createComponent(TitleScreen);
      fixture.detectChanges();
      const el = fixture.debugElement.query(By.css('[data-testid=title-gate]'))
        .nativeElement as HTMLElement;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(gate.leaving()).toBe(false);
      fire(el);
      expect(gate.leaving()).toBe(true);
    }
  });

  it('asks for a click or a key on a computer', () => {
    open();
    const fixture = TestBed.createComponent(TitleScreen);
    fixture.detectChanges();
    const prompt = fixture.nativeElement.querySelector('[data-testid=title-prompt]');
    expect(prompt.textContent).toContain('Click or press any key');
  });
});
