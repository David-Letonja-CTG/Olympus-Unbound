import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CutsceneEvent, CutsceneSession } from '../../../engine';
import { routes } from '../../app.routes';
import { CUTSCENE_SESSION_FACTORY } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { SAVE_KEY, SAVE_STORAGE } from '../../core/save/save-store';
import { GATE_ENVIRONMENT, TitleGate } from '../../core/title-gate';
import { IntroScreen } from './intro-screen';

class StubCutscene implements CutsceneSession {
  skipped = 0;
  destroyed = false;
  private listener: ((e: CutsceneEvent) => void) | undefined;
  subscribe(listener: (e: CutsceneEvent) => void) {
    this.listener = listener;
    return () => (this.listener = undefined);
  }
  skip(): void {
    this.skipped++;
    this.emit({ type: 'ended' });
  }
  destroy(): void {
    this.destroyed = true;
  }
  emit(event: CutsceneEvent): void {
    this.listener?.(event);
  }
}

function setup(save?: object) {
  const data: Record<string, string> = save ? { [SAVE_KEY]: JSON.stringify(save) } : {};
  const session = new StubCutscene();
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      {
        provide: SAVE_STORAGE,
        useValue: {
          getItem: (k: string) => data[k] ?? null,
          setItem: (k: string, v: string) => void (data[k] = v),
        },
      },
      { provide: CUTSCENE_SESSION_FACTORY, useValue: async () => session },
    ],
  });
  return { session, data };
}

describe('intro on first launch', () => {
  it('plays before the main menu for a new player', async () => {
    setup();
    await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/intro');
  });

  it('is skipped for a returning player', async () => {
    setup({ version: 2, introSeen: true });
    await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/');
  });
});

describe('IntroScreen', () => {
  async function play() {
    const ctx = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(IntroScreen);
    await fixture.whenStable();
    const update = async (event?: CutsceneEvent) => {
      if (event) ctx.session.emit(event);
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { ...ctx, fixture, el: fixture.nativeElement as HTMLElement, update, navigate };
  }

  const escape = () =>
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));

  it('shows loading progress, then captions', async () => {
    const { el, update } = await play();
    await update({ type: 'loadProgress', progress: 0.5 });
    expect(el.textContent).toContain('Summoning the gods');
    await update({ type: 'ready' });
    await update({
      type: 'captions',
      captions: [{ at: 0, duration: 4, text: 'Only the Thunderer remained.' }],
    });
    expect(el.querySelector('[data-testid=intro-caption]')?.textContent).toContain(
      'Only the Thunderer remained.',
    );
  });

  it('ignores Escape before the skip prompt, then skips to the menu and remembers it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      const { session, navigate, update, data } = await play();
      escape();
      expect(session.skipped).toBe(0);
      vi.advanceTimersByTime(1100);
      await update();
      escape();
      expect(session.skipped).toBe(1);
      expect(navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
      expect(JSON.parse(data[SAVE_KEY]).introSeen).toBe(true);
      expect(TestBed.inject(Progression).save().introSeen).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns to the menu when the scene ends, and destroys the session on leave', async () => {
    const { navigate, update, fixture, session } = await play();
    await update({ type: 'ended' });
    expect(navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
    fixture.destroy();
    expect(session.destroyed).toBe(true);
  });

  it('can be replayed from the main menu', async () => {
    setup({ version: 2, introSeen: true });
    const harness = await RouterTestingHarness.create('/');
    const link = (harness.routeNativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '[data-testid=menu-intro]',
    );
    expect(link?.getAttribute('href')).toBe('/intro');
    await harness.navigateByUrl('/intro');
    expect(TestBed.inject(Router).url).toBe('/intro');
  });
});

describe('IntroScreen behind the title screen (spec: run-setup / title screen)', () => {
  it('starts only once the player has entered', async () => {
    const created: number[] = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: GATE_ENVIRONMENT,
          useValue: { activated: false, audible: false, automated: false, asked: false },
        },
        {
          provide: CUTSCENE_SESSION_FACTORY,
          useValue: async () => {
            created.push(1);
            return new StubCutscene();
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(IntroScreen);
    await fixture.whenStable();
    expect(created).toEqual([]);
    TestBed.inject(TitleGate).enter();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(created).toEqual([1]);
  });
});
