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
  UiInput,
  UpgradeChoice,
} from '../../../engine';
import { debugEnabled } from '../../core/debug-mode';
import { GAME_CONTENT, GAME_SESSION_FACTORY } from '../../core/game-content';
import { Progression } from '../../core/progression';
import { RoomService } from '../../core/rooms/room-service';
import { RunSetup } from '../../core/run-setup';
import { Announcement, Hud } from './hud';
import { LevelUpDialog } from './level-up-dialog';
import { PauseMenu } from './pause-menu';
import { PartyMember, RunLoading } from './run-loading';

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
  template: `
    <div class="game-host" #host data-testid="game-host"></div>
    @if (showLoading()) {
      <app-run-loading
        data-testid="run-loading"
        [realm]="realm()"
        [party]="party()"
        [bossSprite]="bossSprite()"
        [seed]="seed()"
        [roomCode]="room?.code"
        [stage]="loadStage()"
        [stageProgress]="loadProgress()"
        [done]="loaded()"
      />
    }
    @if (hud(); as h) {
      <app-hud [hud]="h" [announcements]="announcements()" />
    }
    @if (choice(); as c) {
      <app-level-up-dialog [choice]="c" (chosen)="choose(c, $event)" />
    } @else if (waitingFor(); as names) {
      <p class="waiting" role="status" data-testid="waiting-for">
        Waiting for {{ names }} to choose…
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
      <div class="ending" [class.victory]="outcome === 'victory'" role="status">
        {{
          outcome === 'victory'
            ? 'Victory'
            : outcome === 'abandoned'
              ? 'Run abandoned'
              : 'You have fallen'
        }}
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
    }
    .game-host {
      position: absolute;
      inset: 0;
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
    .ending.victory {
      color: var(--gold-2);
      background: radial-gradient(ellipse at center, rgba(80, 60, 0, 0.3), rgba(0, 0, 0, 0.7));
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
  private readonly router = inject(Router);
  /** A room's run (spec: rooms), fixed for this screen; absent for a solo run. */
  protected readonly room = this.rooms.run();
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly levelUp = viewChild(LevelUpDialog);
  private readonly pauseMenu = viewChild(PauseMenu);

  protected readonly hud = signal<HudSnapshot | undefined>(undefined);
  protected readonly choice = signal<UpgradeChoice | undefined>(undefined);
  protected readonly paused = signal(false);
  protected readonly ended = signal<'victory' | 'defeat' | 'abandoned' | undefined>(undefined);
  protected readonly announcements = signal<readonly Announcement[]>([]);
  protected readonly error = signal<string | undefined>(undefined);
  /** Loading (spec: run-loading): the stage and its progress, until the arena is ready. */
  protected readonly loadStage = signal<LoadStage | undefined>(undefined);
  protected readonly loadProgress = signal(0);
  protected readonly loaded = signal(false);
  /** The loading screen stays while it fades out. */
  protected readonly showLoading = signal(true);
  protected readonly realm = computed(() => {
    const id = this.room?.config.realmId ?? this.setup.realmId();
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
    return god ? [{ name: 'You', godName: god.name, sprite: god.visual.sprite }] : [];
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

  protected leave(): void {
    void this.router.navigate(['/']);
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
        run: this.room?.config ?? {
          runId: this.setup.newRunId(),
          godId: godId ?? '',
          realmId: realmId ?? '',
          seed: this.setup.seed(),
          modifiers: this.progression.runModifiers(),
        },
        settings: this.progression.settings(),
        debug,
        room: this.room?.seat,
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

  private onEvent(event: GameEvent): void {
    switch (event.type) {
      case 'hud':
        this.hud.set(event.hud);
        return;
      case 'choice':
        this.choice.set(event.choice);
        return;
      case 'choiceResolved':
        this.choice.set(undefined);
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
        this.choice.set(undefined);
        this.ended.set(event.result.outcome);
        const rewards = this.progression.recordRun(event.result);
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
      case 'ready':
        this.loaded.set(true);
        this.later(() => this.showLoading.set(false), LOADING_FADE_MS);
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
