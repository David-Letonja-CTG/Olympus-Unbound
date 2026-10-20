import { signal } from '@angular/core';
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
import { RoomRun, RoomService } from '../../core/rooms/room-service';
import { RunSetup } from '../../core/run-setup';
import { SAVE_STORAGE } from '../../core/save/save-store';
import { TouchScreen } from '../../core/touch-screen';
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
  realmTime: 95,
  surge: 0,
  phase: 'playing',
  health: 80,
  maxHealth: 120,
  level: 4,
  xp: 5,
  xpToNext: 10,
  gold: 12,
  kills: 34,
  ability: { name: 'Wrath of Olympus', sprite: 'wrath_of_olympus', cooldown: 25, remaining: 3 },
  stamina: { value: 100, max: 100, dashCost: 35, dashRemaining: 0, dashCooldown: 0.53 },
  companions: [],
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
  waitingFor: [],
  realm: { name: 'Mount Olympus', number: 1 },
  party: [],
};

const choice: UpgradeChoice = {
  id: 3,
  playerId: 1,
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

/** A phone: a touch screen, held sideways unless `portrait` (spec: phone-play). */
function phone(portrait = false) {
  return {
    touch: signal(true).asReadonly(),
    portrait: signal(portrait),
    touchOnly: () => true,
    enterFullscreen: vi.fn(),
  };
}

async function setup(
  room?: RoomRun,
  prepare?: (run: RunSetup) => void,
  screen?: ReturnType<typeof phone>,
) {
  const session = new StubSession();
  const data: Record<string, string> = {};
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      ...(screen ? [{ provide: TouchScreen, useValue: screen }] : []),
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
  if (room) TestBed.inject(RoomService).run.set(room);
  const run = TestBed.inject(RunSetup);
  run.godId.set('zeus');
  run.realmId.set('mount_olympus');
  run.seed.set(847291);
  prepare?.(run);
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
    await update({ type: 'choiceResolved', offer: choice.offers[1], playerId: 1, choiceId: 3 });
    expect(el.querySelector('[data-testid=offer-0]')).toBeNull();
  });

  it('keeps a next choice that came before word of the last answer (spec: rooms / choices in a room)', async () => {
    const { el, update } = await setup();
    await update({ type: 'hud', hud });
    await update({ type: 'choice', choice });
    // A room's guest: the next level's choice arrives at once, the answer to the last with the next frame.
    await update({ type: 'choice', choice: { ...choice, id: 4, level: 6 } });
    await update({ type: 'choiceResolved', offer: choice.offers[1], playerId: 1, choiceId: 3 });
    expect(el.querySelector('#levelup-title')?.textContent).toContain('Level 6!');
  });

  it('lets players at one screen choose in turn, each named (spec: co-op / local co-op on one screen)', async () => {
    const { el, update, session } = await setup(undefined, (run) => {
      run.addPlayer('athena');
      run.addAlly('hades');
    });
    expect(session.options?.local).toEqual(['keys-left', 'keys-right']);
    const party = session.options?.run.party ?? [];
    expect(party.map((p) => [p.name, p.godId, !!p.bot])).toEqual([
      ['Player 1', 'zeus', false],
      ['Player 2', 'athena', false],
      ['Hades', 'hades', true],
    ]);
    expect(session.options?.run.sharedScreen).toBe(true);
    const member = (id: number, name: string) => ({
      ...{ id, seat: id - 1, name, god: name, sprite: 'zeus', health: 80, maxHealth: 160 },
      ...{ alive: true, revive: 0, self: id === 1, local: true, stamina: 1, ability: 1 },
    });
    await update({
      type: 'hud',
      hud: { ...hud, party: [member(1, 'Player 1'), member(2, 'Player 2')] },
    });
    await update({ type: 'choice', choice });
    await update({ type: 'choice', choice: { ...choice, id: 4, playerId: 2 } });
    expect(el.querySelector('#levelup-title')?.textContent).toContain('Player 1 · Level 5!');
    await update({ type: 'choiceResolved', offer: choice.offers[0], playerId: 1, choiceId: 3 });
    expect(el.querySelector('#levelup-title')?.textContent).toContain('Player 2 · Level 5!');
    (el.querySelector('[data-testid=offer-2]') as HTMLButtonElement).click();
    expect(session.sent).toContainEqual({ type: 'chooseUpgrade', choiceId: 4, index: 2 });
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
        outcome: 'defeat',
        timeSeconds: 430,
        level: 18,
        kills: 700,
        gold: 350,
        realmsCleared: 1,
        realmReached: 'mount_olympus',
        players: 1,
        bots: 0,
        loadout: { weapons: [], relics: [], skills: [], synergies: [] },
      };
      await update({ type: 'runEnded', result });
      await update({ type: 'runEnded', result });
      expect(el.textContent).toContain('You have fallen');
      // The run's 350 gold and, once, what its achievements and quests pay (first_gate at least).
      const rewards = TestBed.inject(RunSetup).lastRun()?.rewards;
      expect(rewards?.glory.achievements.map((a) => a.id)).toContain('first_gate');
      expect(TestBed.inject(Progression).gold()).toBe(350 + (rewards?.glory.gold ?? 0));
      vi.advanceTimersByTime(2000);
      expect(navigate).toHaveBeenCalledWith(['/summary']);
      expect(rewards?.totalGold).toBe(350 + (rewards?.glory.gold ?? 0));
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

  it('plays a room run as a guest: party, room code, own pause menu, waiting line (spec: rooms)', async () => {
    const link = {
      send: () => undefined,
      onMessage: () => () => undefined,
      onClose: () => () => undefined,
      close: () => undefined,
    };
    const room: RoomRun = {
      code: 'K7QXP',
      config: {
        runId: 'r',
        godId: 'zeus',
        realmId: 'mount_olympus',
        seed: 99,
        modifiers: [],
        party: [
          { godId: 'zeus', name: 'Ada', modifiers: [] },
          { godId: 'hades', name: 'Bo', modifiers: [] },
        ],
      },
      seat: { role: 'guest', slot: 1, host: link },
      members: [
        { slot: 0, name: 'Ada', godId: 'zeus', ready: true, host: true },
        { slot: 1, name: 'Bo', godId: 'hades', ready: true, host: false },
      ],
      localSeat: 1,
    };
    const { session, el, update } = await setup(room);
    expect(session.options?.room).toBe(room.seat);
    expect(session.options?.run.seed).toBe(99);
    expect(el.querySelector('[data-testid=loading-room-code]')?.textContent).toContain('K7QXP');
    const members = [...el.querySelectorAll('[data-testid=party-member]')];
    expect(members).toHaveLength(2);
    expect(members[0].textContent).toMatch(/Ada\s*Host\s*Zeus/);
    expect(members[1].textContent).toMatch(/Bo\s*You\s*Hades/);

    await update({ type: 'hud', hud: { ...hud, phase: 'choosing', waitingFor: ['Ada'] } });
    expect(el.querySelector('[data-testid=waiting-for]')?.textContent).toContain('Waiting for Ada');

    await update({ type: 'paused' });
    expect(el.textContent).toContain('The fight goes on');
    expect(el.querySelector('[data-testid=abandon]')?.textContent).toContain('Leave room');
  });

  it('shows the loading screen again for the next realm past a gate (spec: run-loading / loading between realms)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      const { el, update } = await setup();
      await update({ type: 'ready' });
      vi.advanceTimersByTime(1000);
      await update();
      expect(el.querySelector('[data-testid=run-loading]')).toBeNull();
      await update({ type: 'realmEntered', realmId: 'mount_olympus', depth: 1 });
      expect(el.querySelector('[data-testid=loading-kicker]')?.textContent).toContain('Realm 2');
      await update({ type: 'ready' });
      vi.advanceTimersByTime(1000);
      await update();
      expect(el.querySelector('[data-testid=run-loading]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('PlayScreen on a phone (spec: phone-play)', () => {
  it('plays with the touch controls and pauses from the on-screen button', async () => {
    const { el, update, session } = await setup(undefined, undefined, phone());
    expect(session.options?.local).toEqual(['touch']);
    await update({ type: 'hud', hud });
    const pause = el.querySelector<HTMLButtonElement>('[data-testid=touch-pause]');
    expect(pause).toBeTruthy();
    // No keyboard hints on the HUD.
    expect(el.querySelector('.solo-ability .key')).toBeNull();
    pause?.click();
    expect(session.sent).toContainEqual({ type: 'pause' });
    await update({ type: 'paused' });
    expect(el.querySelector('[data-testid=touch-pause]')).toBeNull();
  });

  it('has no touch controls or pause button on a computer', async () => {
    const { el, update, session } = await setup();
    expect(session.options?.local).toBeUndefined();
    await update({ type: 'hud', hud });
    expect(el.querySelector('[data-testid=touch-pause]')).toBeNull();
    expect(el.querySelector('.solo-ability .key')?.textContent).toBe('Space');
  });

  it('asks to turn the phone and pauses while it is held upright', async () => {
    const screen = phone(true);
    const { el, update, session } = await setup(undefined, undefined, screen);
    await update({ type: 'ready' });
    expect(el.querySelector('[data-testid=rotate-phone]')?.textContent).toContain(
      'Turn your phone',
    );
    expect(session.sent).toContainEqual({ type: 'pause' });
    screen.portrait.set(false);
    await update();
    expect(el.querySelector('[data-testid=rotate-phone]')).toBeNull();
    session.sent.length = 0;
    screen.portrait.set(true);
    await update();
    expect(session.sent).toContainEqual({ type: 'pause' });
  });

  it('asks for fullscreen on the first touch of a run', async () => {
    const screen = phone();
    const { el } = await setup(undefined, undefined, screen);
    const touch = (type: string) => {
      const event = new MouseEvent('pointerdown', { bubbles: true });
      Object.defineProperty(event, 'pointerType', { value: type });
      el.dispatchEvent(event);
    };
    touch('mouse');
    expect(screen.enterFullscreen).not.toHaveBeenCalled();
    touch('touch');
    touch('touch');
    expect(screen.enterFullscreen).toHaveBeenCalledTimes(1);
  });
});
