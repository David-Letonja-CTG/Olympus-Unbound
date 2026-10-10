import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  GameCommand,
  GameEvent,
  GameSession,
  GameSessionOptions,
  HudSnapshot,
  RunResult,
  UpgradeChoice,
} from '../../../engine';
import { GAME_SESSION_FACTORY } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { RunSetup } from '../../core/run-setup';
import { SAVE_STORAGE } from '../../core/save/save-store';
import { PlayScreen } from './play-screen';

class StubSession implements GameSession {
  readonly sent: GameCommand[] = [];
  options: GameSessionOptions | undefined;
  destroyed = false;
  private listener: ((e: GameEvent) => void) | undefined;
  send(command: GameCommand): void {
    this.sent.push(command);
  }
  subscribe(listener: (e: GameEvent) => void) {
    this.listener = listener;
    return () => (this.listener = undefined);
  }
  inspect() {
    return undefined;
  }
  destroy(): void {
    this.destroyed = true;
  }
  emit(event: GameEvent): void {
    this.listener?.(event);
  }
}

const hud: HudSnapshot = {
  time: 95,
  phase: 'playing',
  health: 80,
  maxHealth: 120,
  level: 4,
  xp: 5,
  xpToNext: 10,
  gold: 12,
  kills: 34,
  ability: { name: 'Wrath of Olympus', sprite: 'wrath_of_olympus', cooldown: 25, remaining: 3 },
  weapons: [
    {
      id: 'thunder_spear',
      name: 'Thunder Spear',
      level: 2,
      maxLevel: 6,
      sprite: 'thunder_spear',
      color: 0,
    },
  ],
  relics: [],
  synergies: [{ id: 'storm', name: 'Storm', description: '' }],
  enemies: 10,
};

const choice: UpgradeChoice = {
  id: 3,
  source: 'level',
  level: 5,
  offers: [
    {
      kind: 'weaponLevel',
      itemId: 'thunder_spear',
      name: 'Thunder Spear',
      description: '+6 damage.',
      level: 3,
      maxLevel: 6,
      sprite: 'thunder_spear',
      color: 0,
    },
    {
      kind: 'newWeapon',
      itemId: 'war_hammer',
      name: 'War Hammer',
      description: 'Slams.',
      level: 1,
      maxLevel: 6,
      sprite: 'war_hammer',
      color: 0,
    },
    {
      kind: 'skill',
      itemId: 'might',
      name: 'Might',
      description: '+10% damage.',
      level: 1,
      maxLevel: 5,
      sprite: 'skill_might',
      color: 0,
    },
  ],
};

async function setup() {
  const session = new StubSession();
  const data: Record<string, string> = {};
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: SAVE_STORAGE,
        useValue: {
          getItem: (k: string) => data[k] ?? null,
          setItem: (k: string, v: string) => void (data[k] = v),
        },
      },
      {
        provide: GAME_SESSION_FACTORY,
        useValue: async (options: GameSessionOptions) => {
          session.options = options;
          return session;
        },
      },
    ],
  });
  const run = TestBed.inject(RunSetup);
  run.godId.set('zeus');
  run.realmId.set('mount_olympus');
  run.seed.set(847291);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PlayScreen);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const update = async (event?: GameEvent) => {
    if (event) session.emit(event);
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { session, fixture, el, update, navigate };
}

describe('PlayScreen', () => {
  it('starts a session with the chosen god, realm, seed and permanent upgrades', async () => {
    const { session } = await setup();
    expect(session.options?.run).toMatchObject({
      godId: 'zeus',
      realmId: 'mount_olympus',
      seed: 847291,
      modifiers: [],
    });
    expect(session.options?.debug).toBe(false);
  });

  it('shows the HUD from snapshots', async () => {
    const { el, update } = await setup();
    await update({ type: 'hud', hud });
    expect(el.querySelector('[data-testid=hud-time]')?.textContent).toBe('01:35');
    expect(el.querySelector('[data-testid=hud-health]')?.textContent).toContain('80 / 120');
    expect(el.querySelector('[data-testid=hud-level]')?.textContent).toContain('4');
    expect(el.querySelector('[data-testid=hud-weapon-thunder_spear]')).toBeTruthy();
    expect(el.textContent).toContain('Storm');
  });

  it('shows a level-up choice and sends the pick', async () => {
    const { el, update, session } = await setup();
    await update({ type: 'hud', hud });
    await update({ type: 'choice', choice });
    expect(el.textContent).toContain('Level 5!');
    (el.querySelector('[data-testid=offer-1]') as HTMLButtonElement).click();
    expect(session.sent).toContainEqual({ type: 'chooseUpgrade', choiceId: 3, index: 1 });
    await update({ type: 'choiceResolved', offer: choice.offers[1] });
    expect(el.querySelector('[data-testid=offer-0]')).toBeNull();
  });

  it('picks with the gamepad through forwarded menu input', async () => {
    const { update, session } = await setup();
    await update({ type: 'choice', choice });
    await new Promise((r) => setTimeout(r, 320));
    await update({ type: 'uiInput', input: 'down' });
    await update({ type: 'uiInput', input: 'confirm' });
    expect(session.sent).toContainEqual({ type: 'chooseUpgrade', choiceId: 3, index: 1 });
  });

  it('pauses, resumes, and abandons only after confirming', async () => {
    const { el, update, session } = await setup();
    await update({ type: 'paused' });
    (el.querySelector('[data-testid=resume]') as HTMLButtonElement).click();
    expect(session.sent).toContainEqual({ type: 'resume' });
    (el.querySelector('[data-testid=abandon]') as HTMLButtonElement).click();
    await update();
    expect(session.sent).not.toContainEqual({ type: 'abandon' });
    (el.querySelector('[data-testid=abandon-confirm]') as HTMLButtonElement).click();
    expect(session.sent).toContainEqual({ type: 'abandon' });
  });

  it('records the result once and moves to the summary', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      const { el, update, navigate } = await setup();
      const result: RunResult = {
        runId: 'r1',
        godId: 'zeus',
        realmId: 'mount_olympus',
        seed: 1,
        outcome: 'victory',
        timeSeconds: 430,
        level: 18,
        kills: 700,
        gold: 100,
        bossDefeated: true,
        loadout: { weapons: [], relics: [], skills: [], synergies: [] },
      };
      await update({ type: 'runEnded', result });
      await update({ type: 'runEnded', result });
      expect(el.textContent).toContain('Victory');
      expect(TestBed.inject(Progression).gold()).toBe(350);
      vi.advanceTimersByTime(2000);
      expect(navigate).toHaveBeenCalledWith(['/summary']);
      expect(TestBed.inject(RunSetup).lastRun()?.rewards.totalGold).toBe(350);
    } finally {
      vi.useRealTimers();
    }
  });

  it('applies settings changes to the running game and destroys the session on leave', async () => {
    const { session, fixture, update } = await setup();
    TestBed.inject(Progression).updateSettings({ damageNumbers: false });
    await update();
    expect(session.sent).toContainEqual({
      type: 'updateSettings',
      settings: expect.objectContaining({ damageNumbers: false }),
    });
    fixture.destroy();
    expect(session.destroyed).toBe(true);
  });
});
