import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MenuCue } from '../../engine';
import { MENU_AUDIO, MenuSound } from './menu-sound';
import { Progression } from './progression';

@Component({ template: '' })
class Blank {}

/** Menu audio that records what it was told; like the real one, it cues only while playing. */
function fakeAudio() {
  const calls: string[] = [];
  const made: { musicVolume: number; sfxVolume: number }[] = [];
  let active = false;
  const factory = (volumes: { musicVolume: number; sfxVolume: number }) => {
    made.push(volumes);
    return {
      play: () => {
        active = true;
        calls.push('play');
      },
      stop: () => {
        active = false;
        calls.push('stop');
      },
      setMusicVolume: (v: number) => calls.push(`music ${v}`),
      setSfxVolume: (v: number) => calls.push(`sfx ${v}`),
      cue: (cue: MenuCue) => {
        if (active) calls.push(`cue ${cue}`);
      },
    };
  };
  return { calls, made, factory };
}

describe('MenuSound (spec: music / the hall theme; hud / menu sounds)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => document.body.replaceChildren());

  function setUp() {
    const audio = fakeAudio();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          ['', 'gods', 'summary', 'play', 'intro'].map((path) => ({ path, component: Blank })),
        ),
        { provide: MENU_AUDIO, useValue: audio.factory },
      ],
    });
    TestBed.inject(MenuSound);
    return { audio, router: TestBed.inject(Router) };
  }

  /** Adds `html` to the page and clicks its first element (or the element matching `pick`). */
  function click(html: string, pick?: string): void {
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.append(host);
    const target = (pick ? host.querySelector(pick) : host.firstElementChild) as HTMLElement;
    target.click();
  }

  it('plays on the menus, stops for a run and the intro, and comes back after', async () => {
    const { audio, router } = setUp();
    await router.navigateByUrl('/');
    expect(audio.calls.at(-1)).toBe('play');
    await router.navigateByUrl('/gods');
    expect(audio.calls.at(-1)).toBe('play');
    await router.navigateByUrl('/play');
    expect(audio.calls.at(-1)).toBe('stop');
    await router.navigateByUrl('/summary');
    expect(audio.calls.at(-1)).toBe('play');
    await router.navigateByUrl('/intro');
    expect(audio.calls.at(-1)).toBe('stop');
  });

  it('follows the Music and Sound effects volumes', () => {
    const { audio } = setUp();
    const progression = TestBed.inject(Progression);
    const s = progression.settings();
    expect(audio.made).toEqual([{ musicVolume: s.musicVolume, sfxVolume: s.sfxVolume }]);
    progression.updateSettings({ musicVolume: 0, sfxVolume: 0.3 });
    TestBed.tick();
    expect(audio.calls).toContain('music 0');
    expect(audio.calls).toContain('sfx 0.3');
  });

  it('sounds a pressed control: a chime for the main action, a pluck for the rest', async () => {
    const { audio, router } = setUp();
    await router.navigateByUrl('/');
    click('<button class="btn btn-primary">Begin</button>');
    expect(audio.calls.at(-1)).toBe('cue confirm');
    click('<button class="btn">Back</button>');
    expect(audio.calls.at(-1)).toBe('cue select');
    // A press on something inside a control counts for the control.
    click('<a href="/gods"><span>Play</span></a>', 'span');
    expect(audio.calls.at(-1)).toBe('cue select');
    click('<div role="radio" tabindex="0">Zeus</div>');
    expect(audio.calls.at(-1)).toBe('cue select');
  });

  it('is silent for disabled controls, plain text, and during a run', async () => {
    const { audio, router } = setUp();
    await router.navigateByUrl('/');
    click('<button class="btn btn-primary" disabled>Begin</button>');
    click('<button aria-disabled="true">Join</button>');
    click('<p>Some words</p>');
    expect(audio.calls.filter((c) => c.startsWith('cue'))).toEqual([]);
    await router.navigateByUrl('/play');
    click('<button class="btn">Resume</button>');
    expect(audio.calls.filter((c) => c.startsWith('cue'))).toEqual([]);
  });
});
