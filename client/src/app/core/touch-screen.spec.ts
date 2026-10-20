import { TestBed } from '@angular/core/testing';
import { TouchScreen } from './touch-screen';

/** Media queries answered from a table, changeable later. */
function stubMedia(matches: Record<string, boolean>) {
  const lists = new Map<string, { listeners: ((e: { matches: boolean }) => void)[] }>();
  vi.stubGlobal('matchMedia', (query: string) => {
    const entry = { listeners: [] as ((e: { matches: boolean }) => void)[] };
    lists.set(query, entry);
    return {
      matches: !!matches[query],
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) =>
        entry.listeners.push(fn),
      removeEventListener: () => undefined,
    };
  });
  return (query: string, value: boolean) =>
    lists.get(query)?.listeners.forEach((fn) => fn({ matches: value }));
}

describe('TouchScreen (spec: phone-play)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('knows a phone: touch, touch only, held upright', () => {
    const change = stubMedia({ '(pointer: coarse)': true, '(orientation: portrait)': true });
    const screen = TestBed.inject(TouchScreen);
    expect(screen.touch()).toBe(true);
    expect(screen.touchOnly()).toBe(true);
    expect(screen.portrait()).toBe(true);
    change('(orientation: portrait)', false);
    expect(screen.portrait()).toBe(false);
  });

  it('knows a touch laptop with a trackpad is not touch only', () => {
    stubMedia({ '(pointer: coarse)': true, '(any-pointer: fine)': true });
    expect(TestBed.inject(TouchScreen).touchOnly()).toBe(false);
  });

  it('knows a computer', () => {
    stubMedia({ '(any-pointer: fine)': true });
    const screen = TestBed.inject(TouchScreen);
    expect(screen.touch()).toBe(false);
    expect(screen.touchOnly()).toBe(false);
  });

  it('asks for fullscreen only on a touch device, and survives a refusal', async () => {
    const request = vi.fn(() => Promise.reject(new Error('denied')));
    document.documentElement.requestFullscreen = request;
    stubMedia({});
    TestBed.inject(TouchScreen).enterFullscreen();
    expect(request).not.toHaveBeenCalled();
    TestBed.resetTestingModule();
    stubMedia({ '(pointer: coarse)': true });
    TestBed.inject(TouchScreen).enterFullscreen();
    expect(request).toHaveBeenCalled();
    await Promise.resolve();
  });
});
