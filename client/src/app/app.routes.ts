import { inject, isDevMode } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Progression } from './core/progression';
import { RunSetup } from './core/run-setup';
import { GodSelection } from './features/god-selection/god-selection';
import { MainMenu } from './features/main-menu/main-menu';
import { ProgressionScreen } from './features/progression/progression-screen';
import { RealmSelection } from './features/realm-selection/realm-selection';
import { RunSummary } from './features/run-summary/run-summary';
import { SettingsScreen } from './features/settings/settings-screen';

/** A run needs a chosen god and realm; otherwise start at god selection (spec: run-setup). */
const runIsSetUp: CanActivateFn = () =>
  inject(RunSetup).isComplete() || inject(Router).createUrlTree(['/gods']);
const godIsChosen: CanActivateFn = () =>
  !!inject(RunSetup).godId() || inject(Router).createUrlTree(['/gods']);
/** The intro plays once on first launch, at most once per page load (spec: intro-cutscene). */
let introOffered = false;
const introOnFirstLaunch: CanActivateFn = () => {
  if (introOffered || inject(Progression).save().introSeen) return true;
  introOffered = true;
  return inject(Router).createUrlTree(['/intro']);
};
const runHasEnded: CanActivateFn = () =>
  !!inject(RunSetup).lastRun() || inject(Router).createUrlTree(['/']);

export const routes: Routes = [
  { path: '', component: MainMenu, canActivate: [introOnFirstLaunch], title: 'Olympus Unbound' },
  {
    path: 'intro',
    // Lazy like the game: the intro is rendered by the engine (Phaser).
    loadComponent: () => import('./features/intro/intro-screen').then((m) => m.IntroScreen),
    title: 'Olympus Unbound',
  },
  { path: 'gods', component: GodSelection, title: 'Choose your god · Olympus Unbound' },
  {
    path: 'realms',
    component: RealmSelection,
    canActivate: [godIsChosen],
    title: 'Choose a realm · Olympus Unbound',
  },
  {
    path: 'play',
    canActivate: [runIsSetUp],
    // Lazy: the game screen (and Phaser behind it) loads only when a run starts.
    loadComponent: () => import('./features/game/play-screen').then((m) => m.PlayScreen),
    title: 'Olympus Unbound',
  },
  {
    path: 'summary',
    component: RunSummary,
    canActivate: [runHasEnded],
    title: 'Run summary · Olympus Unbound',
  },
  { path: 'progression', component: ProgressionScreen, title: 'Progression · Olympus Unbound' },
  { path: 'settings', component: SettingsScreen, title: 'Settings · Olympus Unbound' },
  {
    // Development builds only: review the code-drawn art.
    path: 'dev/art',
    canMatch: [() => isDevMode()],
    loadComponent: () => import('./features/dev/art-gallery').then((m) => m.ArtGallery),
  },
  { path: '**', redirectTo: '' },
];
