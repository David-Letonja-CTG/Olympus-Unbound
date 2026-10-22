import { DestroyRef, Injectable, InjectionToken, effect, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { createHallMusic, HallMusic } from '../../engine';
import { Progression } from './progression';

/** Makes the menus' music; tests give a fake. */
export const HALL_MUSIC = new InjectionToken<(volume: number) => HallMusic>('HALL_MUSIC', {
  providedIn: 'root',
  factory: () => createHallMusic,
});

/** Screens with sound of their own: a run has its battle music, the intro its own sound. */
const OWN_SOUND = /^\/(play|intro)(?:[/?#]|$)/;

/**
 * The Hall theme on every screen outside runs and the intro (spec: music / the hall theme): it fades out when a run
 * or the intro starts and back in afterwards, at the Music volume.
 */
@Injectable({ providedIn: 'root' })
export class MenuMusic {
  private readonly progression = inject(Progression);
  private readonly music = inject(HALL_MUSIC)(this.progression.settings().musicVolume);

  constructor() {
    const subscription = inject(Router).events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      if (OWN_SOUND.test(event.urlAfterRedirects)) this.music.stop();
      else this.music.play();
    });
    effect(() => this.music.setVolume(this.progression.settings().musicVolume));
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      this.music.stop();
    });
  }
}
