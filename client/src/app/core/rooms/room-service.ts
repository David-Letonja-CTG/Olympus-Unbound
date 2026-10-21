import { computed, inject, Injectable, signal } from '@angular/core';
import { Modifier, PartySeat, PeerLink, RoomSeat, RunConfig, roomVersion } from '../../../engine';
import { GAME_CONTENT } from '../game-content';
import { Progression } from '../progression';
import { randomSeed } from '../run-setup';
import { RoomError, RoomListing, ROOM_NETWORK } from './room-network';

export const MAX_MEMBERS = 4;
/** Room codes avoid letters and digits that look alike (spec: rooms / creating a room). */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;
const MAX_NAME = 16;
const WELCOME_TIMEOUT_MS = 10_000;

/** A member of a room's lobby. `slot` is fixed while they stay; seats are numbered from it when the run starts. */
export interface LobbyMember {
  readonly slot: number;
  readonly name: string;
  readonly godId: string;
  readonly ready: boolean;
  readonly host: boolean;
}

/** A room's run, ready for the play screen. */
export interface RoomRun {
  readonly code: string;
  readonly config: RunConfig;
  readonly seat: RoomSeat;
  /** Everyone in seat order. */
  readonly members: readonly LobbyMember[];
  readonly localSeat: number;
}

export type RefusalReason = 'full' | 'started' | 'version';

/** Lobby messages (design: Protocol). Run messages are the engine's and travel on the same links. */
type GuestToHost =
  | {
      type: 'hello';
      version: string;
      name: string;
      godId: string;
      modifiers: readonly Modifier[];
    }
  | { type: 'update'; name?: string; godId?: string; ready?: boolean };

type HostToGuest =
  | { type: 'welcome'; slot: number }
  | { type: 'refused'; reason: RefusalReason }
  | { type: 'lobby'; members: readonly LobbyMember[]; realmId: string }
  | {
      type: 'start';
      seat: number;
      runId: string;
      realmId: string;
      seed: number;
      party: readonly { godId: string; name: string }[];
    };

const MESSAGES: Record<RefusalReason | RoomError['reason'] | 'closed' | 'timeout', string> = {
  full: 'That room is full.',
  started: "That room's run has already begun.",
  version: 'That room plays a different version of the game.',
  taken: 'Could not open a room. Try again.',
  'not-found': 'No room has that code.',
  unreachable: 'Could not connect to the room. Check the connection and try again.',
  unsupported: 'This browser cannot play in rooms.',
  closed: 'The host closed the room.',
  timeout: 'The room did not answer. Try again.',
};

interface Guest {
  readonly link: PeerLink;
  readonly modifiers: readonly Modifier[];
}

/**
 * Rooms (spec: rooms): creating and joining by code, the lobby (names, gods, ready, the realm) and starting the
 * same run for every member. The host's browser keeps the lobby; guests mirror it. Once the run starts, the play
 * screen hands the links to the engine (D16).
 */
@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly loadNetwork = inject(ROOM_NETWORK);
  private readonly content = inject(GAME_CONTENT);
  private readonly progression = inject(Progression);
  private readonly version = roomVersion(this.content);

  readonly status = signal<'idle' | 'connecting' | 'lobby' | 'playing'>('idle');
  readonly role = signal<'host' | 'guest' | undefined>(undefined);
  readonly code = signal<string | undefined>(undefined);
  readonly members = signal<readonly LobbyMember[]>([]);
  readonly localSlot = signal(0);
  readonly realmId = signal(this.content.realms[0].id);
  readonly error = signal<string | undefined>(undefined);
  readonly run = signal<RoomRun | undefined>(undefined);
  /** The name this player goes by in rooms, from the save ("Hero" when none was given). */
  readonly playerName = signal(this.progression.playerName() || 'Hero');

  readonly me = computed(() => this.members().find((m) => m.slot === this.localSlot()));
  readonly canStart = computed(
    () =>
      this.role() === 'host' &&
      this.status() === 'lobby' &&
      this.members().length >= 2 &&
      this.members().every((m) => m.host || m.ready),
  );

  private listing: RoomListing | undefined;
  private readonly guests = new Map<number, Guest>();
  private hostLink: PeerLink | undefined;
  /** Bumped on leaving; late callbacks of an old room are ignored. */
  private generation = 0;

  /** Opens a room with this player as host (spec: rooms / creating a room). */
  async create(godId: string): Promise<void> {
    const generation = this.reset();
    this.status.set('connecting');
    try {
      const network = await this.loadNetwork();
      let listing: RoomListing | undefined;
      let code = '';
      for (let attempt = 0; attempt < 3 && !listing; attempt++) {
        code = randomCode();
        try {
          listing = await network.open(code, (link) => this.welcome(generation, link));
        } catch (e) {
          if (!(e instanceof RoomError && e.reason === 'taken')) throw e;
        }
      }
      if (!listing) throw new RoomError('taken');
      if (generation !== this.generation) return listing.close();
      this.listing = listing;
      this.role.set('host');
      this.code.set(code);
      this.localSlot.set(0);
      this.members.set([{ slot: 0, name: this.name(), godId, ready: true, host: true }]);
      this.status.set('lobby');
    } catch (e) {
      this.fail(generation, e);
    }
  }

  /** Joins the room `code` (spec: rooms / joining a room). */
  async join(code: string, godId: string): Promise<void> {
    const generation = this.reset();
    this.status.set('connecting');
    try {
      const network = await this.loadNetwork();
      const link = await network.join(normaliseCode(code));
      if (generation !== this.generation) return link.close();
      this.hostLink = link;
      this.role.set('guest');
      this.code.set(normaliseCode(code));
      const timer = setTimeout(() => {
        if (generation === this.generation && this.status() === 'connecting')
          this.fail(generation, 'timeout');
      }, WELCOME_TIMEOUT_MS);
      link.onMessage((m) => {
        if (generation === this.generation) this.fromHost(m as HostToGuest, link, timer);
      });
      link.onClose(() => {
        if (generation !== this.generation || this.status() === 'playing') return;
        this.fail(generation, this.status() === 'lobby' ? 'closed' : 'unreachable');
      });
      this.send(link, {
        type: 'hello',
        version: this.version,
        name: this.name(),
        godId,
        modifiers: this.progression.runModifiers(),
      });
    } catch (e) {
      this.fail(generation, e);
    }
  }

  setName(name: string): void {
    this.rememberName(name);
    this.change({ name: this.name() });
  }

  /** A new name, kept in the save for the next visit and the share picture (spec: save format version 9). */
  rememberName(name: string): void {
    this.playerName.set(name.slice(0, MAX_NAME));
    this.progression.setPlayerName(name);
  }

  setGod(godId: string): void {
    if (this.content.gods.some((g) => g.id === godId)) this.change({ godId });
  }

  setReady(ready: boolean): void {
    if (this.role() === 'guest') this.change({ ready });
  }

  setRealm(realmId: string): void {
    if (this.role() !== 'host' || !this.content.realms.some((r) => r.id === realmId)) return;
    this.realmId.set(realmId);
    this.broadcastLobby();
  }

  /** The host starts the same run for everyone (spec: rooms / lobby). */
  start(): void {
    if (!this.canStart()) return;
    const code = this.code() ?? '';
    const ordered = [...this.members()].sort((a, b) => a.slot - b.slot);
    const runId = globalThis.crypto.randomUUID();
    const realmId = this.realmId();
    const seed = randomSeed();
    const party: PartySeat[] = ordered.map((m) => ({
      godId: m.godId,
      name: m.name,
      modifiers: m.host
        ? this.progression.runModifiers()
        : (this.guests.get(m.slot)?.modifiers ?? []),
    }));
    const links = new Map<number, PeerLink>();
    ordered.forEach((m, seat) => {
      const guest = this.guests.get(m.slot);
      if (!guest) return;
      links.set(seat, bufferedLink(guest.link));
      this.send(guest.link, {
        type: 'start',
        seat,
        runId,
        realmId,
        seed,
        party: party.map(({ godId, name }) => ({ godId, name })),
      });
    });
    this.status.set('playing');
    this.run.set({
      code,
      config: {
        runId,
        godId: party[0].godId,
        realmId,
        seed,
        modifiers: party[0].modifiers,
        party,
      },
      seat: { role: 'host', guests: links },
      members: ordered,
      localSeat: 0,
    });
  }

  /** Leaves the room, or closes it for everyone as its host. */
  leave(): void {
    this.reset();
  }

  private reset(): number {
    this.listing?.close();
    this.listing = undefined;
    for (const g of this.guests.values()) g.link.close();
    this.guests.clear();
    this.hostLink?.close();
    this.hostLink = undefined;
    this.status.set('idle');
    this.role.set(undefined);
    this.code.set(undefined);
    this.members.set([]);
    this.localSlot.set(0);
    this.run.set(undefined);
    this.error.set(undefined);
    return ++this.generation;
  }

  private fail(generation: number, reason: unknown): void {
    if (generation !== this.generation) return;
    const key =
      reason instanceof RoomError
        ? reason.reason
        : typeof reason === 'string' && reason in MESSAGES
          ? (reason as keyof typeof MESSAGES)
          : 'unreachable';
    this.reset();
    this.error.set(MESSAGES[key]);
  }

  private name(): string {
    return this.playerName().trim().slice(0, MAX_NAME) || 'Hero';
  }

  private send(link: PeerLink, message: GuestToHost | HostToGuest): void {
    link.send(message);
  }

  /** A guest's own change goes to the host; the host changes its own entry and tells everyone. */
  private change(update: { name?: string; godId?: string; ready?: boolean }): void {
    if (this.status() !== 'lobby') return;
    if (this.role() === 'guest' && this.hostLink) {
      this.send(this.hostLink, { type: 'update', ...update });
      this.updateMember(this.localSlot(), update);
    } else if (this.role() === 'host') {
      this.updateMember(0, { ...update, ready: true });
      this.broadcastLobby();
    }
  }

  private updateMember(slot: number, update: { name?: string; godId?: string; ready?: boolean }) {
    this.members.update((list) => list.map((m) => (m.slot === slot ? { ...m, ...update } : m)));
  }

  // -- Host --------------------------------------------------------------------------------------------------

  private welcome(generation: number, link: PeerLink): void {
    let slot = -1;
    link.onMessage((raw) => {
      if (generation !== this.generation) return;
      const m = raw as GuestToHost;
      if (m?.type === 'hello' && slot < 0) {
        const refusal: RefusalReason | undefined =
          m.version !== this.version
            ? 'version'
            : this.status() !== 'lobby'
              ? 'started'
              : this.members().length >= MAX_MEMBERS
                ? 'full'
                : undefined;
        if (refusal) {
          this.send(link, { type: 'refused', reason: refusal });
          return;
        }
        slot = freeSlot(this.members());
        const godId = this.content.gods.some((g) => g.id === m.godId)
          ? m.godId
          : this.content.gods[0].id;
        this.guests.set(slot, { link, modifiers: Array.isArray(m.modifiers) ? m.modifiers : [] });
        this.members.update((list) => [
          ...list,
          { slot, name: cleanName(m.name), godId, ready: false, host: false },
        ]);
        this.send(link, { type: 'welcome', slot });
        this.broadcastLobby();
      } else if (m?.type === 'update' && slot >= 0 && this.status() === 'lobby') {
        const update: { name?: string; godId?: string; ready?: boolean } = {};
        if (typeof m.name === 'string') update.name = cleanName(m.name);
        if (typeof m.godId === 'string' && this.content.gods.some((g) => g.id === m.godId))
          update.godId = m.godId;
        if (typeof m.ready === 'boolean') update.ready = m.ready;
        this.updateMember(slot, update);
        this.broadcastLobby();
      }
    });
    link.onClose(() => {
      if (generation !== this.generation || slot < 0) return;
      this.guests.delete(slot);
      this.members.update((list) => list.filter((m) => m.slot !== slot));
      if (this.status() === 'lobby') this.broadcastLobby();
    });
  }

  private broadcastLobby(): void {
    const message: HostToGuest = {
      type: 'lobby',
      members: this.members(),
      realmId: this.realmId(),
    };
    for (const g of this.guests.values()) this.send(g.link, message);
  }

  // -- Guest -------------------------------------------------------------------------------------------------

  private fromHost(m: HostToGuest, link: PeerLink, timer: ReturnType<typeof setTimeout>): void {
    switch (m?.type) {
      case 'welcome':
        clearTimeout(timer);
        this.localSlot.set(m.slot);
        this.status.set('lobby');
        return;
      case 'refused':
        clearTimeout(timer);
        this.fail(this.generation, m.reason);
        return;
      case 'lobby':
        if (this.status() !== 'lobby') return;
        this.members.set(m.members);
        this.realmId.set(m.realmId);
        return;
      case 'start': {
        if (this.status() !== 'lobby') return;
        const party: PartySeat[] = m.party.map((p) => ({ ...p, modifiers: [] }));
        const members = [...this.members()].sort((a, b) => a.slot - b.slot);
        this.status.set('playing');
        this.run.set({
          code: this.code() ?? '',
          // Guests run no simulation: the host applies everyone's upgrades (D16).
          config: {
            runId: m.runId,
            godId: party[0].godId,
            realmId: m.realmId,
            seed: m.seed,
            modifiers: [],
            party,
          },
          seat: { role: 'guest', slot: m.seat, host: bufferedLink(link) },
          members,
          localSeat: m.seat,
        });
        return;
      }
    }
  }
}

export function randomCode(): string {
  const values = new Uint32Array(CODE_LENGTH);
  globalThis.crypto.getRandomValues(values);
  return [...values].map((v) => CODE_ALPHABET[v % CODE_ALPHABET.length]).join('');
}

/** What a player types, as a code: upper case, without spaces or dashes. */
export function normaliseCode(text: string): string {
  return text.toUpperCase().replace(/[\s-]/g, '');
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

function cleanName(name: unknown): string {
  return (typeof name === 'string' ? name.trim().slice(0, MAX_NAME) : '') || 'Hero';
}

function freeSlot(members: readonly LobbyMember[]): number {
  let slot = 1;
  while (members.some((m) => m.slot === slot)) slot++;
  return slot;
}

/**
 * A run's link: messages that arrive before the game subscribes (it loads lazily) wait for it, so the host never
 * misses a guest's `loaded`.
 */
function bufferedLink(link: PeerLink): PeerLink {
  const queue: unknown[] = [];
  const listeners = new Set<(m: unknown) => void>();
  link.onMessage((m) => {
    if (listeners.size === 0) queue.push(m);
    for (const l of listeners) l(m);
  });
  return {
    send: (m) => link.send(m),
    onMessage(listener) {
      listeners.add(listener);
      for (const m of queue.splice(0)) listener(m);
      return () => void listeners.delete(listener);
    },
    onClose: (listener) => link.onClose(listener),
    close: () => link.close(),
  };
}
