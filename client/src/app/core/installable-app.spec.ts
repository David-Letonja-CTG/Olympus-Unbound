import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdate, PAGE_RELOAD } from './app-update';
import { Connectivity } from './connectivity';
import { InstallPrompt } from './install-prompt';

/** A service worker's updates, driven by the test. */
function fakeUpdates(enabled = true) {
  const versionUpdates = new Subject<VersionEvent>();
  const unrecoverable = new Subject<{ type: 'UNRECOVERABLE_STATE'; reason: string }>();
  return {
    isEnabled: enabled,
    versionUpdates,
    unrecoverable,
    checkForUpdate: vi.fn(async () => false),
    activateUpdate: vi.fn(async () => true),
  };
}

describe('AppUpdate (spec: installable-app / updates)', () => {
  afterEach(() => vi.useRealTimers());

  it('offers a downloaded version, and reloads only when asked', async () => {
    const updates = fakeUpdates();
    const reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: updates },
        { provide: PAGE_RELOAD, useValue: reload },
      ],
    });
    const app = TestBed.inject(AppUpdate);
    expect(updates.checkForUpdate).toHaveBeenCalled();
    expect(app.ready()).toBe(false);
    updates.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    expect(app.ready()).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    await app.reload();
    expect(updates.activateUpdate).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
  });

  it('asks for a reload when the cached version is broken', () => {
    const updates = fakeUpdates();
    TestBed.configureTestingModule({ providers: [{ provide: SwUpdate, useValue: updates }] });
    const app = TestBed.inject(AppUpdate);
    updates.unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'gone' });
    expect(app.broken()).toBe(true);
  });

  it('stays quiet without a service worker (development, tests)', () => {
    const updates = fakeUpdates(false);
    TestBed.configureTestingModule({ providers: [{ provide: SwUpdate, useValue: updates }] });
    const app = TestBed.inject(AppUpdate);
    expect(updates.checkForUpdate).not.toHaveBeenCalled();
    expect(app.ready()).toBe(false);
  });
});

describe('InstallPrompt (spec: installable-app / install hint)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the browser's install offer for the menu, and uses it once", async () => {
    const install = TestBed.inject(InstallPrompt);
    expect(install.canPrompt()).toBe(false);
    const prompt = vi.fn(async () => undefined);
    const offer = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(offer);
    expect(offer.defaultPrevented).toBe(true);
    expect(install.canPrompt()).toBe(true);
    await install.install();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(install.canPrompt()).toBe(false);
    await install.install();
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('knows when the game has been installed', () => {
    const install = TestBed.inject(InstallPrompt);
    expect(install.installed()).toBe(false);
    window.dispatchEvent(new Event('appinstalled'));
    expect(install.installed()).toBe(true);
  });

  it('knows it runs installed (full-screen display)', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('display-mode: fullscreen'),
    }));
    expect(TestBed.inject(InstallPrompt).installed()).toBe(true);
  });

  it('explains Add to Home Screen in iPhone Safari only', () => {
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    vi.stubGlobal('navigator', { userAgent: iphone, maxTouchPoints: 5 });
    expect(TestBed.inject(InstallPrompt).iosHint).toBe(true);
    TestBed.resetTestingModule();
    vi.stubGlobal('navigator', {
      userAgent: iphone.replace('Version/18.0', 'CriOS/140.0'),
      maxTouchPoints: 5,
    });
    expect(TestBed.inject(InstallPrompt).iosHint).toBe(false);
  });
});

describe('Connectivity (spec: installable-app / rooms need a connection)', () => {
  it('follows the online and offline events', () => {
    const net = TestBed.inject(Connectivity);
    expect(net.online()).toBe(true);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    expect(net.online()).toBe(false);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    expect(net.online()).toBe(true);
  });
});
