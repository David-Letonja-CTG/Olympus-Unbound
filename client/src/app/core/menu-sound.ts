import { DestroyRef, Injectable, InjectionToken, effect, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { createMenuAudio, MenuAudio } from '../../engine';
import { Progression } from './progression';

/** Makes the menus' audio; tests give a fake. */
export const MENU_AUDIO = new InjectionToken<typeof createMenuAudio>('MENU_AUDIO', {
  providedIn: 'root',
  factory: () => createMenuAudio,
});

/** Screens with sound of their own: a run has its battle music and interface sounds, the intro its own sound. */
const OWN_SOUND = /^\/(play|intro)(?:[/?#]|$)/;
/** Controls that sound when pressed (spec: hud / menu sounds). */
const CONTROL = 'button, a[href], [role="radio"], [role="tab"], [role="checkbox"]';

/**
 * The menus' sound outside runs and the intro: the Hall theme (spec: music / the hall theme), fading out when a run
 * or the intro starts and back in afterwards, and a sound for every control pressed (spec: hud / menu sounds).
 */
@Injectable({ providedIn: 'root' })
export class MenuSound {
  private readonly progression = inject(Progression);
  private readonly audio: MenuAudio;

  constructor() {
    const settings = this.progression.settings();
    this.audio = inject(MENU_AUDIO)({
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
    });
    const subscription = inject(Router).events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      if (OWN_SOUND.test(event.urlAfterRedirects)) this.audio.stop();
      else this.audio.play();
    });
    effect(() => {
      const s = this.progression.settings();
      this.audio.setMusicVolume(s.musicVolume);
      this.audio.setSfxVolume(s.sfxVolume);
    });
    const onClick = (event: Event) => this.pressed(event.target);
    if (typeof document !== 'undefined') document.addEventListener('click', onClick, true);
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      if (typeof document !== 'undefined') document.removeEventListener('click', onClick, true);
      this.audio.stop();
    });
  }

  private pressed(target: EventTarget | null): void {
    if (!(target instanceof Element)) return;
    const control = target.closest(CONTROL);
    if (!control) return;
    if (control.matches(':disabled') || control.getAttribute('aria-disabled') === 'true') return;
    this.audio.cue(control.matches('.btn-primary') ? 'confirm' : 'select');
  }
}
