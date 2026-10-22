import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  DebugAction,
  DebugSnapshot,
  GameEvent,
  GameSession,
  HudSnapshot,
  LoadStage,
  RunConfig,
  RunOutcome,
  roomVersion,
  ControlScheme,
  UiInput,
  UpgradeChoice,
} from '../../../engine';
import { debugEnabled } from '../../core/debug-mode';
import { GAME_CONTENT, GAME_SESSION_FACTORY } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { RoomService } from '../../core/rooms/room-service';
import { WorldScores } from '../../core/world-scores';
import { ALLY_SKILLS, RunSetup } from '../../core/run-setup';
import { TouchScreen } from '../../core/touch-screen';
import { challengeRun, QUICK_RULES } from '../../core/challenge';
import { trialRun } from '../../core/daily-trial';
import { Announcement, Hud } from './hud/hud';
import { LevelUpDialog } from './level-up-dialog';
import { PauseMenu } from './pause-menu';
import { PartyMember, RunLoading } from './run-loading';

/** What makes a run quick (spec: quick-runs): the realm's clock at double speed, double experience. */
const QUICK_RUN: Pick<RunConfig, 'rules' | 'variant'> = {
  rules: QUICK_RULES,
  variant: { kind: 'quick' },
};

/** How long the final moment of a run stays on screen before the summary. */
const END_DELAY_MS = 1600;
const ANNOUNCEMENT_MS = 3200;
/** How long the loading screen takes to fade out once the arena is ready. */
const LOADING_FADE_MS = 750;

declare global {
  interface Window {
    /** Development-only hooks for end-to-end tests (`?debug`). */
    olympusDebug?: {
      send(action: DebugAction): void;
      hud(): HudSnapshot | undefined;
      inspect(): DebugSnapshot | undefined;
    };
  }
}

/**
 * Owns the game session for one run (D3): starts it, turns its events into signals for the overlays, sends the
 * player's choices back, records the result and moves on to the summary. Nothing else in Angular sees the session.
 */
@Component({
  selector: 'app-play-screen',
  imports: [Hud, LevelUpDialog, PauseMenu, RunLoading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(contextmenu)': '$event.preventDefault()',
    '(pointerdown)': 'onPointerDown($event)',
  },
  template: `
    <div class="game-host" #host data-testid="game-host"></div>
    @if (showLoading()) {
      <app-run-loading
        data-testid="run-loading"
        [realm]="realm()"
        [party]="party()"
        [bossSprite]="bossSprite()"
        [seed]="seed()"
        [depth]="depth()"
        [roomCode]="room?.code"
        [twist]="twist()"
        [stage]="loadStage()"
        [stageProgress]="loadProgress()"
        [done]="loaded()"
      />
    }
    @if (hud(); as h) {
      <app-hud
        [hud]="h"
        [locals]="locals()"
        [controls]="controls"
        [announcements]="announcements()"
      />
      @if (touch() && !paused() && !ended() && !choice()) {
        <button
          class="touch-pause"
          data-testid="touch-pause"
          [attr.aria-label]="room ? 'Menu' : 'Pause'"
          (click)="send({ type: 'pause' })"
        >
          <span aria-hidden="true"></span><span aria-hidden="true"></span>
        </button>
      }
    }
    @if (choice(); as c) {
      <app-level-up-dialog [choice]="c" [player]="chooser()" (chosen)="choose(c, $event)" />
    } @else if (waitingFor(); as names) {
      <p class="waiting" role="status" data-testid="waiting-for">
        Waiting for {{ names }} to choose…
      </p>
    }
    @if (fallen(); as who) {
      <p class="waiting fallen" role="status" data-testid="fallen">
        @if (who === 'you') {
          You have fallen · an ally can revive you by standing beside your spirit
        } @else {
          {{ who }} fallen · stand beside the spirit to revive
        }
      </p>
    }
    @if (paused() && !ended()) {
      <app-pause-menu
        [room]="room ? (room.localSeat === 0 ? 'host' : 'guest') : undefined"
        (resumeRequested)="send({ type: 'resume' })"
        (abandonRequested)="send({ type: 'abandon' })"
      />
    }
    @if (ended(); as outcome) {
      <div class="ending" role="status">
        {{ outcome === 'abandoned' ? 'Run abandoned' : 'You have fallen' }}
      </div>
    }
    @if (touch() && portrait()) {
      <div class="rotate" role="alert" data-testid="rotate-phone">
        <div class="rotate-phone" aria-hidden="true"></div>
        <p>Turn your phone sideways to fight</p>
      </div>
    }
    @if (error()) {
      <div class="error" role="alert">
        <p>The game could not start: {{ error() }}</p>
        <button class="btn" (click)="leave()">Back to menu</button>
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: #000;
      user-select: none;
      -webkit-user-select: none;
      /* No zoom, scroll, pull to refresh or long-press menu during a run (spec: phone-play / the phone screen). */
      touch-action: none;
      overscroll-behavior: none;
      -webkit-touch-callout: none;
      -webkit-tap-highlight-color: transparent;
    }
    .touch-pause {
      position: absolute;
      top: calc(8px + env(safe-area-inset-top, 0px));
      left: calc(10px + env(safe-area-inset-left, 0px));
      width: 44px;
      height: 44px;
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 2px solid rgba(214, 170, 92, 0.85);
      background: radial-gradient(
        circle at 50% 35%,
        rgba(70, 48, 22, 0.85),
        rgba(14, 10, 8, 0.9) 70%
      );
      box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.45);
      cursor: pointer;
    }
    .touch-pause span {
      width: 5px;
      height: 16px;
      border-radius: 1px;
      background: var(--gold-2);
    }
    .rotate {
      position: absolute;
      inset: 0;
      /* Above the loading screen (z-index 20), which a run shows while it is held upright. */
      z-index: 30;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 24px;
      padding: 24px;
      text-align: center;
      background: var(--bg);
      color: var(--gold-2);
      font-family: var(--serif);
      font-size: 1.4rem;
    }
    .rotate p {
      margin: 0;
    }
    .rotate-phone {
      width: 56px;
      height: 96px;
      border: 3px solid var(--gold-2);
      border-radius: 10px;
      animation: turn 2.4s ease-in-out infinite;
    }
    @keyframes turn {
      30%,
      70% {
        transform: rotate(-90deg);
      }
    }
    .game-host {
      position: absolute;
      inset: 0;
      /* Its own stacking context: the touch controls inside stay under the HUD and the dialogs. */
      z-index: 0;
    }
    .ending {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-family: var(--serif);
      font-size: clamp(2.2rem, 7vw, 4.5rem);
      font-weight: 700;
      color: #ff8a70;
      background: radial-gradient(ellipse at center, rgba(40, 0, 0, 0.35), rgba(0, 0, 0, 0.75));
      text-shadow: 0 4px 30px rgba(0, 0, 0, 0.9);
      animation: fade 0.6s ease;
    }
    .waiting {
      position: absolute;
      left: 50%;
      top: 38%;
      transform: translateX(-50%);
      margin: 0;
      padding: 10px 22px;
      font-family: var(--serif);
      font-size: 1.2rem;
      color: var(--gold-2);
      background: rgba(8, 6, 10, 0.78);
      border: 1px solid var(--line);
      pointer-events: none;
    }
    .waiting.fallen {
      top: auto;
      bottom: 22%;
      color: #cfeaff;
    }
    .error {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      gap: 12px;
      text-align: center;
      background: var(--bg);
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
  `,
})
export class PlayScreen {
  private readonly content = inject(GAME_CONTENT);
  private readonly createSession = inject(GAME_SESSION_FACTORY);
  private readonly progression = inject(Progression);
  protected readonly setup = inject(RunSetup);
  private readonly rooms = inject(RoomService);
  private readonly worldScores = inject(WorldScores);
  private readonly router = inject(Router);
  /** A room's run (spec: rooms), fixed for this screen; absent for a solo run. */
  protected readonly room = this.rooms.run();
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly levelUp = viewChild(LevelUpDialog);
  private readonly pauseMenu = viewChild(PauseMenu);

  protected readonly hud = signal<HudSnapshot | undefined>(undefined);
  /** Every local player's HUD on a shared screen, in seat order (spec: hud / local players on the hud). */
  protected readonly locals = signal<readonly HudSnapshot[]>([]);
  /** The open choices of the players at this screen; the first is shown, then the next (spec: co-op / local co-op). */
  private readonly choices = signal<readonly UpgradeChoice[]>([]);
  protected readonly choice = computed<UpgradeChoice | undefined>(() => this.choices()[0]);
  /** Several players at this screen: their controls from seat 0 (spec: co-op / local co-op on one screen). */
  protected readonly local = this.room || this.setup.special() ? undefined : this.setup.controls();
  /** Whose choice is shown, when several players share the screen. */
  protected readonly chooser = computed(() => {
    const choice = this.choice();
    if (!choice || !this.local) return undefined;
    return this.hud()?.party.find((m) => m.id === choice.playerId)?.name;
  });
  private readonly touchScreen = inject(TouchScreen);
  /** A touch device: touch controls, the pause button and landscape (spec: phone-play). */
  protected readonly touch = this.touchScreen.touch;
  protected readonly portrait = this.touchScreen.portrait;
  /** The controls of the players at this screen: shared-screen seats, or the touch controls on a touch device. */
  protected readonly controls: readonly ControlScheme[] | undefined =
    this.local ?? (this.touch() ? ['touch'] : undefined);
  private askedFullscreen = false;
  /** The Daily Trial's or a challenge's twist, for the loading screen (spec: daily-trial / twists). */
  protected readonly twist = computed(() => {
    const special = this.room ? undefined : this.setup.special();
    return special?.kind === 'daily' ? special.trial.twist : special?.challenge.twist;
  });
  protected readonly paused = signal(false);
  protected readonly ended = signal<RunOutcome | undefined>(undefined);
  protected readonly announcements = signal<readonly Announcement[]>([]);
  protected readonly error = signal<string | undefined>(undefined);
  /** Loading (spec: run-loading): the stage and its progress, until the arena is ready. */
  protected readonly loadStage = signal<LoadStage | undefined>(undefined);
  protected readonly loadProgress = signal(0);
  protected readonly loaded = signal(false);
  /** The loading screen stays while it fades out. */
  protected readonly showLoading = signal(true);
  /** The realm the party is in: the starting realm, then each realm past a gate (spec: endless-run). */
  private readonly realmId = signal(this.room?.config.realmId ?? this.setup.realmId());
  /** Realms cleared so far. */
  protected readonly depth = signal(0);
  protected readonly realm = computed(() => {
    const id = this.realmId();
    return this.content.realms.find((r) => r.id === id) ?? this.content.realms[0];
  });
  protected readonly seed = computed(() => this.room?.config.seed ?? this.setup.seed());
  protected readonly bossSprite = computed(() => {
    const id = this.realm().boss.id;
    return this.content.bosses.find((b) => b.id === id)?.visual.sprite ?? id;
  });
  /** Everyone taking part: the local player, or a room's members in seat order (spec: run-loading / party). */
  protected readonly party = computed<readonly PartyMember[]>(() => {
    const godOf = (id: string) => this.content.gods.find((g) => g.id === id);
    if (this.room) {
      const room = this.room;
      return room.members.map((m, seat) => {
        const god = godOf(m.godId);
        return {
          name: m.name,
          godName: god?.name ?? m.godId,
          sprite: god?.visual.sprite ?? m.godId,
          you: seat === room.localSeat,
          host: m.host,
        };
      });
    }
    const god = godOf(this.setup.godId() ?? '');
    if (!god) return [];
    // The Daily Trial and challenges are solo (spec: daily-trial).
    const solo = !!this.setup.special();
    const players = (solo ? [] : this.setup.players()).map((p, i) => {
      const other = godOf(p.godId);
      return {
        name: `Player ${i + 2}`,
        godName: other?.name ?? p.godId,
        sprite: other?.visual.sprite ?? p.godId,
      };
    });
    const allies = (solo ? [] : this.setup.allies()).map((a) => {
      const ally = godOf(a.godId);
      return {
        name: ally?.name ?? a.godId,
        godName: ally?.name ?? a.godId,
        sprite: ally?.visual.sprite ?? a.godId,
        bot: ALLY_SKILLS.find((s) => s.id === a.skill)?.label ?? a.skill,
      };
    });
    return [
      players.length
        ? { name: 'Player 1', godName: god.name, sprite: god.visual.sprite }
        : { name: 'You', godName: god.name, sprite: god.visual.sprite, you: allies.length > 0 },
      ...players,
      ...allies,
    ];
  });
  /**
   * In a party, this player's god is down but the run goes on (spec: co-op / reviving allies): 'you', or on a shared
   * screen the names of its fallen players.
   */
  protected readonly fallen = computed(() => {
    const hud = this.hud();
    if (!hud || this.ended()) return undefined;
    if (this.local) {
      const names = hud.party.filter((m) => m.local && !m.alive).map((m) => m.name);
      if (!names.length) return undefined;
      return names.join(' and ') + (names.length > 1 ? ' have' : ' has');
    }
    const party = !!this.room || this.setup.allies().length > 0;
    return party && hud.health <= 0 ? 'you' : undefined;
  });
  /** In a room, who the open round of choices still waits for once this player has chosen. */
  protected readonly waitingFor = computed(() => {
    const hud = this.hud();
    if (!hud || hud.phase !== 'choosing' || this.ended() || !hud.waitingFor.length)
      return undefined;
    return hud.waitingFor.join(', ');
  });

  private session: GameSession | undefined;
  private destroyed = false;
  private announcementId = 0;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => void this.start());
    // Held upright, a phone's run pauses under the rotate overlay (spec: phone-play / the phone screen).
    effect(() => {
      if (this.touch() && this.portrait()) this.session?.send({ type: 'pause' });
    });
    // Settings changed in the pause menu apply to the running game immediately.
    effect(() => {
      const settings = this.progression.settings();
      this.session?.send({ type: 'updateSettings', settings });
    });
    destroyRef.onDestroy(() => {
      this.destroyed = true;
      for (const t of this.timers) clearTimeout(t);
      this.session?.destroy();
      // A room lasts one run (design: rooms close when their run ends).
      if (this.room) this.rooms.leave();
      if (window.olympusDebug) delete window.olympusDebug;
    });
  }

  protected send(command: Parameters<GameSession['send']>[0]): void {
    this.session?.send(command);
  }

  protected choose(choice: UpgradeChoice, index: number): void {
    this.send({ type: 'chooseUpgrade', choiceId: choice.id, index });
  }

  /** A run started without a tap (a room's guest): fullscreen on its first touch instead. */
  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch' || this.askedFullscreen) return;
    this.askedFullscreen = true;
    this.touchScreen.enterFullscreen();
  }

  protected leave(): void {
    void this.router.navigate(['/']);
  }

  /**
   * A run at this screen: the player alone, or a party with the other players here and bot allies (spec: bot-allies,
   * co-op / local co-op on one screen). Everyone here shares this machine's save, so its blessings.
   */
  private soloRun(godId: string, realmId: string): RunConfig {
    const modifiers = this.progression.runModifiers();
    // Today's Daily Trial or a challenge: solo, with their own god, realm, seed and rules (spec: daily-trial).
    const special = this.setup.special();
    if (special) {
      const base = { runId: this.setup.newRunId(), modifiers };
      if (special.kind === 'daily') {
        const t = special.trial;
        return { ...base, godId: t.godId, realmId: t.realmId, seed: t.seed, ...trialRun(t) };
      }
      const c = special.challenge;
      return { ...base, godId: c.godId, realmId: c.realmId, seed: c.seed, ...challengeRun(c) };
    }
    const allies = this.setup.allies();
    const players = this.setup.players();
    return {
      runId: this.setup.newRunId(),
      godId,
      realmId,
      seed: this.setup.seed(),
      modifiers,
      sharedScreen: players.length > 0 || undefined,
      // Realms at twice the pace, double experience (spec: quick-runs / quick pace).
      ...(this.setup.quick() ? QUICK_RUN : {}),
      party:
        allies.length || players.length
          ? [
              { godId, name: players.length ? 'Player 1' : 'You', modifiers },
              ...players.map((p, i) => ({ godId: p.godId, name: `Player ${i + 2}`, modifiers })),
              ...allies.map((a) => ({
                godId: a.godId,
                name: this.content.gods.find((g) => g.id === a.godId)?.name ?? a.godId,
                modifiers: [],
                bot: { skill: a.skill },
              })),
            ]
          : undefined,
    };
  }

  private async start(): Promise<void> {
    const godId = this.setup.godId();
    const realmId = this.setup.realmId();
    if (!this.room && (!godId || !realmId)) {
      void this.router.navigate(['/gods']);
      return;
    }
    const debug = debugEnabled();
    try {
      const session = await this.createSession({
        parent: this.host().nativeElement,
        content: this.content,
        run: this.room?.config ?? this.soloRun(godId ?? '', realmId ?? ''),
        settings: this.progression.settings(),
        debug,
        room: this.room?.seat,
        local: this.controls,
      });
      if (this.destroyed) {
        session.destroy();
        return;
      }
      this.session = session;
      session.subscribe((event) => this.onEvent(event));
      if (debug) {
        window.olympusDebug = {
          send: (action) => session.send({ type: 'debug', action }),
          hud: () => this.hud(),
          inspect: () => session.inspect(),
        };
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    }
  }

  /** The players' names for the world boards: a room's members, or this device's players (bots are not players). */
  private humanNames(): string[] {
    if (this.room) return this.room.members.map((m) => m.name);
    const me = this.progression.playerName() || 'Hero';
    if (this.setup.special()) return [me];
    return [me, ...this.setup.players().map((_, i) => `Player ${i + 2}`)];
  }

  private onEvent(event: GameEvent): void {
    switch (event.type) {
      case 'hud':
        this.hud.set(event.hud);
        this.locals.set(event.locals ?? []);
        return;
      case 'choice': {
        // A player's newer choice (the shop again after buying) takes their old one's place.
        const choice = event.choice;
        this.choices.update((list) =>
          list.some((c) => c.playerId === choice.playerId)
            ? list.map((c) => (c.playerId === choice.playerId ? choice : c))
            : [...list, choice],
        );
        return;
      }
      case 'choiceResolved':
        // By ID: in a room the answer's word travels with the next frame, after the player's next choice may have
        // come (spec: rooms / choices in a room).
        this.choices.update((list) => list.filter((c) => c.id !== event.choiceId));
        return;
      case 'paused':
        this.paused.set(true);
        return;
      case 'resumed':
        this.paused.set(false);
        return;
      case 'announcement':
        this.announce(event.text, event.kind);
        return;
      case 'uiInput':
        this.onUiInput(event.input);
        return;
      case 'runEnded': {
        // A run ends once; a repeated report must not replace the rewards shown on the summary.
        if (this.ended()) return;
        this.choices.set([]);
        this.ended.set(event.result.outcome);
        const rewards = this.progression.recordRun(event.result);
        // The world boards too (spec: world-leaderboards); a room's run is the host's to send.
        this.worldScores.submit(
          event.result,
          this.humanNames(),
          roomVersion(this.content),
          !!this.room && this.room.localSeat !== 0,
        );
        this.setup.lastRun.set({ result: event.result, rewards, inRoom: !!this.room });
        this.later(() => void this.router.navigate(['/summary']), END_DELAY_MS);
        return;
      }
      case 'loadProgress':
        if (event.stage) {
          this.loadStage.set(event.stage);
          this.loadProgress.set(event.progress);
        }
        return;
      case 'ready': {
        this.loaded.set(true);
        if (this.touch() && this.portrait()) this.send({ type: 'pause' });
        const depth = this.depth();
        // A gate passed during the fade keeps its own loading screen.
        this.later(() => {
          if (this.depth() === depth) this.showLoading.set(false);
        }, LOADING_FADE_MS);
        return;
      }
      case 'realmEntered':
        // Through the gate: the loading screen shows the next realm while it is built (spec: run-loading).
        this.realmId.set(event.realmId);
        this.depth.set(event.depth);
        this.choices.set([]);
        this.loaded.set(false);
        this.loadStage.set(undefined);
        this.loadProgress.set(0);
        this.showLoading.set(true);
        return;
    }
  }

  private onUiInput(input: UiInput): void {
    if (this.paused()) this.pauseMenu()?.handle(input);
    else if (this.choice()) this.levelUp()?.handle(input);
  }

  private announce(text: string, kind: Announcement['kind']): void {
    const item: Announcement = { id: ++this.announcementId, text, kind };
    this.announcements.update((list) => [...list.slice(-2), item]);
    this.later(
      () => this.announcements.update((list) => list.filter((a) => a !== item)),
      ANNOUNCEMENT_MS,
    );
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }
}
