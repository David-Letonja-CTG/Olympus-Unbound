import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HALL_MUSIC, MenuMusic } from './menu-music';
import { Progression } from './progression';

@Component({ template: '' })
class Blank {}

/** A theme that records what it was told. */
function fakeMusic() {
  const calls: string[] = [];
  const made: number[] = [];
  const factory = (volume: number) => {
    made.push(volume);
    return {
      play: () => calls.push('play'),
      stop: () => calls.push('stop'),
      setVolume: (v: number) => calls.push(`volume ${v}`),
    };
  };
  return { calls, made, factory };
}

describe('MenuMusic (spec: music / the hall theme)', () => {
  beforeEach(() => localStorage.clear());

  function setUp() {
    const music = fakeMusic();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          ['', 'gods', 'summary', 'play', 'intro'].map((path) => ({ path, component: Blank })),
        ),
        { provide: HALL_MUSIC, useValue: music.factory },
      ],
    });
    TestBed.inject(MenuMusic);
    return { music, router: TestBed.inject(Router) };
  }

  it('plays on the menus, stops for a run and the intro, and comes back after', async () => {
    const { music, router } = setUp();
    await router.navigateByUrl('/');
    expect(music.calls.at(-1)).toBe('play');
    await router.navigateByUrl('/gods');
    expect(music.calls.at(-1)).toBe('play');
    await router.navigateByUrl('/play');
    expect(music.calls.at(-1)).toBe('stop');
    await router.navigateByUrl('/summary');
    expect(music.calls.at(-1)).toBe('play');
    await router.navigateByUrl('/intro');
    expect(music.calls.at(-1)).toBe('stop');
  });

  it('follows the Music volume', () => {
    const { music } = setUp();
    const progression = TestBed.inject(Progression);
    expect(music.made).toEqual([progression.settings().musicVolume]);
    progression.updateSettings({ musicVolume: 0 });
    TestBed.tick();
    expect(music.calls).toContain('volume 0');
  });
});
