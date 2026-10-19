import { inject, isDevMode } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Progression } from './core/progression';
import { RoomService } from './core/rooms/room-service';
import { RunSetup } from './core/run-setup';

import { CoopScreen } from './features/coop/coop-screen';

import { GodSelection } from './features/god-selection/god-selection';
import { MainMenu } from './features/main-menu/main-menu';
import { ProgressionScreen } from './features/progression/progression-screen';
import { RealmSelection } from './features/realm-selection/realm-selection';
import { RunSummary } from './features/run-summary/run-summary';
import { SettingsScreen } from './features/settings/settings-screen';

/** A run needs a chosen god and realm, or a room's started run; otherwise start at god selection (spec: run-setup). */
const runIsSetUp: CanActivateFn = () =>
  inject(RunSetup).isComplete() ||
  !!inject(RoomService).run() ||
  inject(Router).createUrlTree(['/gods']);
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
  { path: 'coop', component: CoopScreen, title: 'Co-op · Olympus Unbound' },
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
  {
    path: 'glory',
    loadComponent: () => import('./features/glory/glory-screen').then((m) => m.GloryScreen),
    title: 'Hall of Glory · Olympus Unbound',
  },
  {
    // Reached only by its address and behind a password (spec: run-statistics / admin mode); lazy, for the owner.
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-screen').then((m) => m.AdminScreen),
    title: 'Statistics · Olympus Unbound',
  },
  { path: 'settings', component: SettingsScreen, title: 'Settings · Olympus Unbound' },
  {
    // Development builds only: review the code-drawn art.
    path: 'dev/art',
    canMatch: [() => isDevMode()],
    loadComponent: () => import('./features/dev/art-gallery').then((m) => m.ArtGallery),
  },
  { path: '**', redirectTo: '' },
];
