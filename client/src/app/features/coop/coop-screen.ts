import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GAME_CONTENT } from '../../core/game-content';
import {
  isValidCode,
  MAX_MEMBERS,
  normaliseCode,
  RoomService,
} from '../../core/rooms/room-service';
import { RunSetup } from '../../core/run-setup';
import { TouchScreen } from '../../core/touch-screen';
import { ItemIcon } from '../../shared/item-icon';

/**
 * Co-op (spec: rooms): create a room or join one by code, then the lobby — everyone's name, god and readiness, the
 * realm, and the host's start. The room's run opens on the play screen.
 */
@Component({
  selector: 'app-coop-screen',
  imports: [RouterLink, ItemIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="screen">
      <h1 class="screen-title">Co-op</h1>
      <p class="screen-subtitle">
        Up to {{ maxMembers }} gods against one horde. Every god who joins brings more and tougher
        monsters.
      </p>

      @if (rooms.status() === 'lobby' || rooms.status() === 'playing') {
        <section class="panel lobby" aria-label="Room">
          <div class="code-row">
            <span class="label">Room code</span>
            <strong class="code" data-testid="room-code">{{ rooms.code() }}</strong>
            <button class="btn btn-small" data-testid="copy-code" (click)="copyCode()">
              {{ copied() ? 'Copied' : 'Copy' }}
            </button>
          </div>
          <p class="hint">Friends join from <em>Co-op → Join a room</em> with this code.</p>

          <ul class="members" aria-label="Members">
            @for (m of members(); track m.slot) {
              <li
                [attr.data-testid]="'member-' + m.slot"
                [class.you]="m.slot === rooms.localSlot()"
              >
                <app-item-icon [sprite]="m.sprite" [size]="56" />
                <span class="who">
                  <span class="name">
                    {{ m.name }}
                    @if (m.slot === rooms.localSlot()) {
                      <span class="tag you-tag">You</span>
                    }
                  </span>
                  <span class="god-name">{{ m.godName }}</span>
                </span>
                <span class="state" [class.ready]="m.ready">
                  {{ m.host ? 'Host' : m.ready ? 'Ready' : 'Choosing…' }}
                </span>
              </li>
            }
            @for (s of emptySeats(); track s) {
              <li class="empty">Open seat</li>
            }
          </ul>

          <div class="setup">
            <label class="field">
              <span>Your name</span>
              <input
                data-testid="lobby-name"
                maxlength="16"
                [value]="rooms.playerName()"
                (change)="rooms.setName($any($event.target).value)"
              />
            </label>
            @if (rooms.role() === 'host') {
              <label class="field">
                <span>Realm</span>
                <select
                  data-testid="realm-select"
                  (change)="rooms.setRealm($any($event.target).value)"
                >
                  @for (r of realms; track r.id) {
                    <option [value]="r.id" [selected]="r.id === rooms.realmId()">
                      {{ r.name }}
                    </option>
                  }
                </select>
              </label>
            } @else {
              <p class="field">
                <span>Realm</span>
                <span data-testid="lobby-realm">{{ realmName() }}</span>
              </p>
            }
          </div>

          <h2>Your god</h2>
          <div class="gods" role="radiogroup" aria-label="Your god">
            @for (god of gods; track god.id) {
              <button
                class="god-option"
                role="radio"
                [attr.aria-checked]="myGod() === god.id"
                [class.selected]="myGod() === god.id"
                [attr.data-testid]="'lobby-god-' + god.id"
                [disabled]="locked()"
                (click)="rooms.setGod(god.id)"
              >
                <app-item-icon [sprite]="god.visual.sprite" [size]="64" />
                <span>{{ god.name }}</span>
              </button>
            }
          </div>
        </section>

        <div class="actions sticky">
          <button class="btn" data-testid="leave-room" (click)="leave()">Leave room</button>
          @if (rooms.role() === 'host') {
            <button
              class="btn btn-primary"
              data-testid="start-room"
              [disabled]="!rooms.canStart()"
              (click)="startRun()"
            >
              Start the run
            </button>
          } @else {
            <button
              class="btn btn-primary"
              data-testid="ready"
              [attr.aria-pressed]="!!rooms.me()?.ready"
              (click)="rooms.setReady(!rooms.me()?.ready)"
            >
              {{ rooms.me()?.ready ? 'Not ready' : 'Ready' }}
            </button>
          }
        </div>
        <p class="waiting" role="status">{{ waiting() }}</p>
      } @else {
        <section class="panel start">
          <label class="field name-field">
            <span>Your name</span>
            <input
              data-testid="player-name"
              maxlength="16"
              [value]="rooms.playerName()"
              (input)="rooms.playerName.set($any($event.target).value)"
            />
          </label>
          <div class="ways">
            <div class="way">
              <h2>Create a room</h2>
              <p>Get a code to share with your friends.</p>
              <button
                class="btn btn-primary"
                data-testid="create-room"
                [disabled]="busy()"
                (click)="create()"
              >
                Create room
              </button>
            </div>
            <div class="way">
              <h2>Join a room</h2>
              <p>Type the code a friend gave you.</p>
              <input
                class="code-input"
                data-testid="room-code-input"
                aria-label="Room code"
                placeholder="ABCDE"
                maxlength="7"
                autocomplete="off"
                [value]="codeText()"
                (input)="codeText.set($any($event.target).value)"
                (keydown.enter)="join()"
              />
              <button
                class="btn btn-primary"
                data-testid="join-room"
                [disabled]="busy() || !codeValid()"
                (click)="join()"
              >
                Join
              </button>
            </div>
          </div>
          @if (busy()) {
            <p class="status" role="status">Connecting…</p>
          }
          @if (rooms.error(); as e) {
            <p class="error" role="alert" data-testid="room-error">{{ e }}</p>
          }
        </section>
        <div class="actions sticky">
          <a class="btn" routerLink="/">Back</a>
        </div>
      }
    </main>
  `,
  styles: `
    .start,
    .lobby {
      width: min(760px, 100%);
      padding: 22px 26px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    h2 {
      font-family: var(--display);
      font-size: 1.05rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--gold-2);
      margin: 0;
    }
    .ways {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }
    .way {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      border: 1px solid var(--line);
      background: rgba(0, 0, 0, 0.25);
    }
    .way p,
    .hint {
      margin: 0;
      color: var(--muted);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 0;
      color: var(--muted);
    }
    input,
    select {
      font: inherit;
      color: var(--text);
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--line);
      padding: 8px 10px;
    }
    .code-input {
      font-family: var(--display);
      font-size: 1.4rem;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      text-align: center;
    }
    .code-row {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .code-row .label {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 0.8rem;
    }
    .code {
      font-family: var(--display);
      font-size: 2rem;
      letter-spacing: 0.35em;
      color: var(--gold-2);
      text-shadow: 0 0 18px rgba(236, 213, 154, 0.35);
    }
    .btn-small {
      padding: 4px 12px;
      font-size: 0.85rem;
    }
    .members {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 10px;
    }
    .members li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border: 1px solid var(--line);
      background: rgba(0, 0, 0, 0.3);
      min-height: 72px;
    }
    .members li.you {
      border-color: var(--gold);
    }
    .members li.empty {
      justify-content: center;
      color: var(--muted);
      font-style: italic;
      border-style: dashed;
    }
    .who {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .name {
      font-family: var(--display);
      color: var(--gold-2);
    }
    .god-name {
      color: var(--muted);
      font-size: 0.9rem;
    }
    .tag {
      margin-left: 6px;
      padding: 1px 6px;
      font-size: 0.62rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #10141c;
      background: #8fb7e8;
    }
    .state {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .state.ready {
      color: var(--ok);
    }
    .setup {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .gods {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .god-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 14px;
      color: var(--text);
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--line);
      cursor: pointer;
      font: inherit;
    }
    .god-option.selected {
      border-color: var(--gold);
      box-shadow: 0 0 0 2px var(--gold);
    }
    .god-option:disabled {
      cursor: default;
      opacity: 0.6;
    }
    .status,
    .waiting {
      margin: 0;
      color: var(--muted);
      text-align: center;
    }
    .error {
      margin: 0;
      color: var(--danger);
    }
  `,
})
export class CoopScreen {
  protected readonly rooms = inject(RoomService);
  private readonly content = inject(GAME_CONTENT);
  private readonly setup = inject(RunSetup);
  private readonly router = inject(Router);
  private readonly touchScreen = inject(TouchScreen);

  protected readonly maxMembers = MAX_MEMBERS;
  protected readonly gods = this.content.gods;
  protected readonly realms = this.content.realms;
  protected readonly codeText = signal('');
  protected readonly copied = signal(false);
  protected readonly codeValid = computed(() => isValidCode(normaliseCode(this.codeText())));
  protected readonly busy = computed(() => this.rooms.status() === 'connecting');
  protected readonly myGod = computed(() => this.rooms.me()?.godId);
  /** A ready guest keeps their god; un-ready to change it. */
  protected readonly locked = computed(
    () => this.rooms.role() === 'guest' && !!this.rooms.me()?.ready,
  );
  protected readonly members = computed(() =>
    this.rooms.members().map((m) => {
      const god = this.content.gods.find((g) => g.id === m.godId);
      return { ...m, godName: god?.name ?? m.godId, sprite: god?.visual.sprite ?? m.godId };
    }),
  );
  protected readonly emptySeats = computed(() =>
    Array.from({ length: MAX_MEMBERS - this.rooms.members().length }, (_, i) => i),
  );
  protected readonly realmName = computed(
    () => this.content.realms.find((r) => r.id === this.rooms.realmId())?.name ?? '',
  );
  protected readonly waiting = computed(() => {
    if (this.rooms.role() !== 'host')
      return this.rooms.me()?.ready ? 'Waiting for the host to start…' : '';
    if (this.rooms.members().length < 2) return 'Waiting for players to join…';
    return this.rooms.canStart() ? '' : 'Waiting for everyone to be ready…';
  });

  constructor() {
    // The host started the run: everyone goes to it.
    effect(() => {
      if (this.rooms.run()) void this.router.navigate(['/play']);
    });
    inject(DestroyRef).onDestroy(() => {
      // Leaving the screen any other way than into the run leaves the room.
      if (this.rooms.status() !== 'playing') this.rooms.leave();
    });
  }

  /** The host starts everyone's run; fullscreen from the tap on a phone (spec: phone-play / the phone screen). */
  protected startRun(): void {
    this.touchScreen.enterFullscreen();
    this.rooms.start();
  }

  protected create(): void {
    void this.rooms.create(this.startingGod());
  }

  protected join(): void {
    if (!this.codeValid() || this.busy()) return;
    void this.rooms.join(this.codeText(), this.startingGod());
  }

  protected leave(): void {
    this.rooms.leave();
  }

  protected copyCode(): void {
    const code = this.rooms.code();
    if (!code) return;
    void navigator.clipboard?.writeText(code).then(() => this.copied.set(true));
  }

  /** The god last chosen for a run, else the first. */
  private startingGod(): string {
    return this.setup.godId() ?? this.content.gods[0].id;
  }
}
