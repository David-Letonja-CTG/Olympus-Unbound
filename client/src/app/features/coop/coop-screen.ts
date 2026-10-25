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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { invitedCode, inviteLink } from '../../core/rooms/invite';
import { shareLink } from '../../core/share-card';
import { GAME_CONTENT } from '../../core/game-content';
import { SeasonalEvents } from '../../core/seasonal-events';
import {
  isValidCode,
  MAX_MEMBERS,
  normaliseCode,
  RoomService,
} from '../../core/rooms/room-service';
import { Connectivity } from '../../core/connectivity';
import { RunSetup } from '../../core/run-setup';
import { TouchScreen } from '../../core/touch-screen';
import { ItemIcon } from '../../shared/item-icon';

/** What the Invite button says after sharing; nothing when the share sheet was cancelled. */
const INVITE_LABELS = {
  shared: 'Invite sent',
  copied: 'Link copied',
  failed: 'Copy failed',
  cancelled: undefined,
} as const;

/**
 * Co-op (spec: rooms, matchmaking): Quick Play, the open rooms, creating a room or joining one by code, then the
 * lobby — everyone's name, god and readiness, the realm, whether it is public, and the host's start. The room's run
 * opens on the play screen.
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
            <!-- A link that opens Co-op with this code filled in (spec: rooms / joining a room). -->
            <button class="btn btn-small btn-primary" data-testid="invite" (click)="invite()">
              {{ inviteStatus() ?? 'Invite' }}
            </button>
          </div>
          <p class="hint">
            Send friends the invite link, or the code: they join from <em>Co-op → Join a room</em>.
          </p>

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
          @if (rooms.role() === 'host') {
            <!-- Listed for others to find (spec: matchmaking / public rooms). -->
            <label class="public-switch">
              <input
                type="checkbox"
                data-testid="public-room"
                [checked]="rooms.isPublic()"
                (change)="rooms.setPublic($any($event.target).checked)"
              />
              <span>
                <strong>Public room</strong>
                <span class="hint"
                  >Anyone can find it under Open rooms and join with Quick Play.</span
                >
              </span>
            </label>
          }

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
      } @else if (!rooms.available) {
        <!-- Rooms need the game server, and this build has none (spec: game-server). -->
        <section class="panel start">
          <p class="error" role="status" data-testid="no-server">
            Co-op needs the game server, which this version of the game does not have. Solo runs and
            bot allies play as usual.
          </p>
        </section>
        <div class="actions sticky">
          <a class="btn" routerLink="/">Back</a>
        </div>
      } @else {
        <section class="panel start">
          @if (!online()) {
            <!-- Spec: installable-app / rooms need a connection. -->
            <p class="error" role="status" data-testid="offline">
              Rooms need an internet connection. Solo runs and bot allies play offline.
            </p>
          }
          <label class="field name-field">
            <span>Your name</span>
            <input
              data-testid="player-name"
              maxlength="16"
              [value]="rooms.playerName()"
              (input)="rooms.rememberName($any($event.target).value)"
            />
          </label>
          <div class="ways">
            <!-- Spec: matchmaking / quick play. -->
            <div class="way">
              <h2>Quick Play</h2>
              <p>Join a game that is waiting for players, or open one for others.</p>
              <button
                class="btn btn-primary"
                data-testid="quick-play"
                [disabled]="busy() || rooms.searching() || !online()"
                (click)="quickPlay()"
              >
                {{ rooms.searching() ? 'Looking for a game…' : 'Quick Play' }}
              </button>
            </div>
            <div class="way">
              <h2>Create a room</h2>
              <p>Get a code to share with your friends.</p>
              <button
                class="btn btn-primary"
                data-testid="create-room"
                [disabled]="busy() || !online()"
                (click)="create()"
              >
                Create room
              </button>
            </div>
            <div class="way" [class.invited]="!!invited()">
              <h2>Join a room</h2>
              @if (invited(); as code) {
                <p class="invite-note" data-testid="invited">
                  You were invited to room <strong>{{ code }}</strong
                  >.
                </p>
              } @else {
                <p>Type the code a friend gave you.</p>
              }
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
                #joinButton
                class="btn btn-primary"
                data-testid="join-room"
                [disabled]="busy() || !codeValid() || !online()"
                (click)="join()"
              >
                {{ invited() && codeValid() ? 'Join room ' + normalised() : 'Join' }}
              </button>
            </div>
          </div>
          <!-- Spec: matchmaking / open rooms. -->
          <div class="open-rooms" data-testid="open-rooms">
            <div class="open-head">
              <h2>Open rooms</h2>
              <button
                class="btn btn-small"
                data-testid="refresh-rooms"
                [disabled]="!online()"
                (click)="refreshRooms()"
              >
                Refresh
              </button>
            </div>
            @if (rooms.openRoomsError(); as e) {
              <p class="hint">{{ e }}</p>
            } @else if (rooms.openRooms(); as list) {
              @if (list.length === 0) {
                <p class="hint" data-testid="no-open-rooms">
                  No open rooms right now. Quick Play opens one for others to join.
                </p>
              } @else {
                <ul class="room-list">
                  @for (r of openRoomViews(); track r.code) {
                    <li [attr.data-testid]="'open-room-' + r.code">
                      <app-item-icon [sprite]="r.sprite" [size]="40" />
                      <span class="who">
                        <span class="name">{{ r.name }}</span>
                        <span class="god-name">{{ r.godName }} · {{ r.realmName }}</span>
                      </span>
                      <span class="seats">{{ r.players }} / {{ r.seats }}</span>
                      <button
                        class="btn btn-small"
                        [attr.data-testid]="'join-open-' + r.code"
                        [disabled]="busy() || !online()"
                        (click)="joinOpen(r.code)"
                      >
                        Join
                      </button>
                    </li>
                  }
                </ul>
              }
            } @else {
              <p class="hint">Looking for open rooms…</p>
            }
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
    .invited {
      border: 1px solid var(--gold);
      box-shadow: 0 0 18px rgba(201, 165, 90, 0.25);
    }
    .invite-note strong {
      color: var(--gold-2);
      letter-spacing: 0.2em;
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
    .public-switch {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
    }
    .public-switch input {
      margin-top: 4px;
      width: 18px;
      height: 18px;
      accent-color: var(--gold);
    }
    .public-switch .hint {
      display: block;
      font-size: 0.9rem;
    }
    .open-rooms {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .open-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .room-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .room-list li {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: 12px;
      padding: 6px 10px;
      border: 1px solid var(--line);
      background: rgba(0, 0, 0, 0.25);
    }
    .room-list .who {
      display: flex;
      flex-direction: column;
    }
    .room-list .god-name,
    .room-list .seats {
      color: var(--muted);
      font-size: 0.9rem;
    }
  `,
})
export class CoopScreen {
  protected readonly rooms = inject(RoomService);
  private readonly content = inject(GAME_CONTENT);
  private readonly setup = inject(RunSetup);
  private readonly router = inject(Router);
  private readonly touchScreen = inject(TouchScreen);
  protected readonly online = inject(Connectivity).online;

  protected readonly maxMembers = MAX_MEMBERS;
  protected readonly gods = this.content.gods;
  protected readonly realms = inject(SeasonalEvents).realms();
  /** The code an invite link carried, filled in until the player joins (spec: rooms / joining a room). */
  protected readonly invited = signal<string | undefined>(
    invitedCode(inject(ActivatedRoute).snapshot.queryParamMap.get('join')),
  );
  protected readonly codeText = signal(this.invited() ?? '');
  protected readonly normalised = computed(() => normaliseCode(this.codeText()));
  protected readonly inviteStatus = signal<string | undefined>(undefined);
  private readonly joinButton = viewChild<ElementRef<HTMLButtonElement>>('joinButton');
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
  /** The open rooms with their god's and realm's names and pictures. */
  protected readonly openRoomViews = computed(() =>
    (this.rooms.openRooms() ?? []).map((r) => {
      const god = this.content.gods.find((g) => g.id === r.godId);
      return {
        ...r,
        godName: god?.name ?? r.godId,
        sprite: god?.visual.sprite ?? r.godId,
        realmName: this.content.realms.find((x) => x.id === r.realmId)?.name ?? r.realmId,
      };
    }),
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
    // Invited: the Join button is ready for one tap; nothing joins without it.
    afterNextRender(() => {
      if (this.invited()) this.joinButton()?.nativeElement.focus();
      if (this.rooms.available && this.online() && this.rooms.status() === 'idle')
        void this.rooms.refreshOpenRooms();
    });
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

  protected quickPlay(): void {
    void this.rooms.quickPlay(this.startingGod());
  }

  protected refreshRooms(): void {
    void this.rooms.refreshOpenRooms();
  }

  protected joinOpen(code: string): void {
    if (this.busy()) return;
    void this.rooms.join(code, this.startingGod());
  }

  protected copyCode(): void {
    const code = this.rooms.code();
    if (!code) return;
    void navigator.clipboard?.writeText(code).then(() => this.copied.set(true));
  }

  /** Shares or copies the room's invite link (spec: rooms / joining a room). */
  protected async invite(): Promise<void> {
    const code = this.rooms.code();
    if (!code) return;
    const link = inviteLink(document.baseURI, code, new URLSearchParams(location.search));
    const outcome = await shareLink(
      link,
      'Olympus Unbound',
      `Join my co-op room ${code} in Olympus Unbound:`,
    );
    const label = INVITE_LABELS[outcome];
    this.inviteStatus.set(label);
    if (label) setTimeout(() => this.inviteStatus.set(undefined), 2500);
  }

  /** The god last chosen for a run, else the first. */
  private startingGod(): string {
    return this.setup.godId() ?? this.content.gods[0].id;
  }
}
