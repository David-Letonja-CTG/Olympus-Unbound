import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PeerLink } from '../../../engine';
import { routes } from '../../app.routes';
import { SAVE_KEY, SAVE_STORAGE } from '../save/save-store';
import {
  OpenRoom,
  PublicListing,
  RoomError,
  RoomListing,
  RoomNetwork,
  ROOM_NETWORK,
} from './room-network';
import { inviteLink, invitedCode } from './invite';
import { CODE_ALPHABET, isValidCode, RoomService } from './room-service';

/** Two connected links; messages arrive on the next task, like over a real channel. */
/** Messages sent on any fake link and not yet delivered. */
let inFlight = 0;

function linkPair(): [PeerLink, PeerLink] {
  const listeners = [new Set<(m: unknown) => void>(), new Set<(m: unknown) => void>()];
  const closers = [new Set<() => void>(), new Set<() => void>()];
  let open = true;
  const end = (me: 0 | 1): PeerLink => ({
    send(message) {
      if (!open) return;
      const copy = structuredClone(message);
      inFlight++;
      setTimeout(() => {
        if (open) for (const l of listeners[1 - me]) l(copy);
        inFlight--;
      });
    },
    onMessage(l) {
      listeners[me].add(l);
      return () => void listeners[me].delete(l);
    },
    onClose(l) {
      closers[me].add(l);
      return () => void closers[me].delete(l);
    },
    close() {
      if (!open) return;
      open = false;
      for (const side of closers) for (const c of side) c();
    },
  });
  return [end(0), end(1)];
}

class FakeNetwork implements RoomNetwork {
  readonly rooms = new Map<string, (link: PeerLink) => void>();
  /** Public listings by room code, as the server would keep them (spec: matchmaking). */
  readonly listings = new Map<string, { version: string; listing: PublicListing }>();
  async open(
    code: string,
    version: string,
    onGuest: (link: PeerLink) => void,
  ): Promise<RoomListing> {
    if (this.rooms.has(code)) throw new RoomError('taken');
    this.rooms.set(code, onGuest);
    return {
      publish: (listing) => {
        if (listing) this.listings.set(code, { version, listing });
        else this.listings.delete(code);
      },
      close: () => {
        this.rooms.delete(code);
        this.listings.delete(code);
      },
    };
  }
  async openRooms(version: string): Promise<readonly OpenRoom[]> {
    return [...this.listings]
      .filter(([, l]) => l.version === version && l.listing.players < l.listing.seats)
      .map(([code, l]) => ({ code, ...l.listing }))
      .sort((a, b) => b.players - a.players);
  }
  async join(code: string): Promise<PeerLink> {
    const onGuest = this.rooms.get(code);
    if (!onGuest) throw new RoomError('not-found');
    const [host, guest] = linkPair();
    onGuest(host);
    return guest;
  }
}

const tick = () => new Promise((r) => setTimeout(r, 5));

/** Waits until every message (and every reply to one) has been delivered, however slow the machine. */
async function settle(): Promise<void> {
  for (let i = 0; i < 400; i++) {
    await tick();
    if (inFlight === 0) {
      await tick();
      if (inFlight === 0) return;
    }
  }
}

function setup(save: object = { version: 2, introSeen: true }) {
  const network = new FakeNetwork();
  const data: Record<string, string> = { [SAVE_KEY]: JSON.stringify(save) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: ROOM_NETWORK, useValue: async () => network },
      {
        provide: SAVE_STORAGE,
        useValue: {
          getItem: (k: string) => data[k] ?? null,
          setItem: (k: string, v: string) => void (data[k] = v),
        },
      },
    ],
  });
  // Every player has their own service; here they share one test injector.
  const service = () => TestBed.runInInjectionContext(() => new RoomService());
  return { network, service, data };
}

describe('rooms (spec: rooms)', () => {
  it('creates a room with a five-character code and the creator as host', async () => {
    const { service } = setup();
    const host = service();
    await host.create('zeus');
    expect(host.status()).toBe('lobby');
    expect(isValidCode(host.code() ?? '')).toBe(true);
    expect([...(host.code() ?? '')].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    expect(host.members()).toEqual([
      { slot: 0, name: 'Hero', godId: 'zeus', ready: true, host: true },
    ]);
  });

  it('lets a player join by code, get ready, and start the same run for both', async () => {
    const { service } = setup({
      version: 2,
      introSeen: true,
      permanentUpgrades: { vitality: 1 },
    });
    const host = service();
    const guest = service();
    host.playerName.set('Ada');
    guest.playerName.set('Bo');
    await host.create('zeus');
    await guest.join(` ${host.code()?.toLowerCase()} `, 'zeus');
    await settle();
    expect(guest.status()).toBe('lobby');
    expect(host.members().map((m) => m.name)).toEqual(['Ada', 'Bo']);
    expect(guest.members().map((m) => m.name)).toEqual(['Ada', 'Bo']);

    guest.setGod('hades');
    await settle();
    expect(host.canStart()).toBe(false);
    guest.setReady(true);
    await settle();
    expect(host.members()[1]).toMatchObject({ godId: 'hades', ready: true });
    expect(host.canStart()).toBe(true);

    host.start();
    await settle();
    const a = host.run();
    const b = guest.run();
    expect(a?.config.party?.map((s) => [s.godId, s.name])).toEqual([
      ['zeus', 'Ada'],
      ['hades', 'Bo'],
    ]);
    // Each player's own permanent upgrades travel with their seat.
    expect(a?.config.party?.[1].modifiers.length).toBeGreaterThan(0);
    expect(a?.seat.role).toBe('host');
    expect(b?.seat).toMatchObject({ role: 'guest', slot: 1 });
    expect(b?.config).toMatchObject({
      runId: a?.config.runId,
      seed: a?.config.seed,
      realmId: a?.config.realmId,
    });
    expect(b?.code).toBe(host.code());
  });

  it('refuses a fifth player and a different version', async () => {
    const { service, network } = setup();
    const host = service();
    await host.create('zeus');
    const code = host.code() ?? '';
    for (let i = 0; i < 3; i++) await service().join(code, 'zeus');
    await settle();
    expect(host.members()).toHaveLength(4);
    const late = service();
    await late.join(code, 'zeus');
    await settle();
    expect(late.status()).toBe('idle');
    expect(late.error()).toBe('That room is full.');

    const old = await network.join(code);
    const answers: unknown[] = [];
    old.onMessage((m) => answers.push(m));
    old.send({ type: 'hello', version: 'old', name: 'X', godId: 'zeus', modifiers: [] });
    await settle();
    expect(answers).toEqual([{ type: 'refused', reason: 'version' }]);
  });

  it('reports an unknown code', async () => {
    const { service } = setup();
    const guest = service();
    await guest.join('ZZZZZ', 'zeus');
    expect(guest.error()).toBe('No room has that code.');
  });

  it('frees the seat when a guest leaves and tells guests when the host leaves', async () => {
    const { service } = setup();
    const host = service();
    const a = service();
    const b = service();
    await host.create('zeus');
    await a.join(host.code() ?? '', 'zeus');
    await b.join(host.code() ?? '', 'hades');
    await settle();
    a.leave();
    await settle();
    expect(host.members().map((m) => m.slot)).toEqual([0, 2]);
    expect(b.members()).toHaveLength(2);
    host.leave();
    await settle();
    expect(b.status()).toBe('idle');
    expect(b.error()).toBe('The host closed the room.');
  });

  it('refuses joining once the run has begun', async () => {
    const { service } = setup();
    const host = service();
    const guest = service();
    await host.create('zeus');
    await guest.join(host.code() ?? '', 'zeus');
    await settle();
    guest.setReady(true);
    await settle();
    host.start();
    const late = service();
    await late.join(host.code() ?? '', 'zeus');
    await settle();
    expect(late.error()).toBe("That room's run has already begun.");
  });
});

describe('co-op screen', () => {
  it('creates a room and shows its code and members; joining needs a valid code', async () => {
    setup();
    const harness = await RouterTestingHarness.create('/coop');
    const el = harness.routeNativeElement as HTMLElement;
    const join = el.querySelector<HTMLButtonElement>('[data-testid=join-room]');
    expect(join?.disabled).toBe(true);
    const input = el.querySelector<HTMLInputElement>('[data-testid=room-code-input]');
    if (!input) throw new Error('no code input');
    input.value = 'abc2d';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(join?.disabled).toBe(false);

    el.querySelector<HTMLButtonElement>('[data-testid=create-room]')?.click();
    await settle();
    harness.detectChanges();
    expect(el.querySelector('[data-testid=room-code]')?.textContent?.trim()).toMatch(
      /^[A-Z2-9]{5}$/,
    );
    expect(el.querySelector('[data-testid=member-0]')?.textContent).toContain('Host');
    expect(el.querySelector<HTMLButtonElement>('[data-testid=start-room]')?.disabled).toBe(true);
    expect(el.textContent).toContain('Waiting for players to join');
  });
});

describe('invites (spec: rooms / joining a room)', () => {
  it('links to Co-op with the code, keeping only the test network parameters', () => {
    expect(inviteLink('https://example.com/Olympus-Unbound/', 'ABC2D')).toBe(
      'https://example.com/Olympus-Unbound/coop?join=ABC2D',
    );
    expect(
      inviteLink('http://localhost:4200', 'ABC2D', new URLSearchParams('debug&net=local&x=1')),
    ).toBe('http://localhost:4200/coop?join=ABC2D&debug&net=local');
    expect(invitedCode(' abc2d ')).toBe('ABC2D');
    expect(invitedCode('ab1')).toBeUndefined();
    expect(invitedCode(null)).toBeUndefined();
  });

  it('fills in the invited code and offers to join it, without joining by itself', async () => {
    const { network, service } = setup();
    const host = service();
    await host.create('zeus');
    const code = host.code() ?? '';
    const harness = await RouterTestingHarness.create(`/coop?join=${code.toLowerCase()}`);
    const el = harness.routeNativeElement as HTMLElement;
    await settle();
    harness.detectChanges();
    expect(el.querySelector('[data-testid=invited]')?.textContent).toContain(code);
    expect(el.querySelector<HTMLInputElement>('[data-testid=room-code-input]')?.value).toBe(code);
    const join = el.querySelector<HTMLButtonElement>('[data-testid=join-room]');
    expect(join?.textContent).toContain(`Join room ${code}`);
    expect(join?.disabled).toBe(false);
    expect(host.members()).toHaveLength(1);
    expect(network.rooms.size).toBe(1);
  });

  it('ignores a broken invite', async () => {
    setup();
    const harness = await RouterTestingHarness.create('/coop?join=zz');
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('[data-testid=invited]')).toBeNull();
    expect(el.querySelector<HTMLInputElement>('[data-testid=room-code-input]')?.value).toBe('');
    expect(el.querySelector<HTMLButtonElement>('[data-testid=join-room]')?.disabled).toBe(true);
  });

  it("copies the room's invite link where the browser cannot share", async () => {
    setup();
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void (copied = text) },
    });
    try {
      const harness = await RouterTestingHarness.create('/coop');
      const el = harness.routeNativeElement as HTMLElement;
      el.querySelector<HTMLButtonElement>('[data-testid=create-room]')?.click();
      await settle();
      harness.detectChanges();
      const code = el.querySelector('[data-testid=room-code]')?.textContent?.trim() ?? '';
      el.querySelector<HTMLButtonElement>('[data-testid=invite]')?.click();
      await settle();
      harness.detectChanges();
      expect(copied).toContain(`/coop?join=${code}`);
      expect(el.querySelector('[data-testid=invite]')?.textContent).toContain('Link copied');
    } finally {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('remembers the name typed for co-op in the save', async () => {
    const { data } = setup();
    const harness = await RouterTestingHarness.create('/coop');
    const el = harness.routeNativeElement as HTMLElement;
    const name = el.querySelector<HTMLInputElement>('[data-testid=player-name]');
    if (!name) throw new Error('no name input');
    name.value = 'Ada';
    name.dispatchEvent(new Event('input'));
    expect(JSON.parse(data[SAVE_KEY]).playerName).toBe('Ada');
  });
});

describe('matchmaking (spec: matchmaking)', () => {
  it('lists a public lobby with its host, god, realm and seats, and withdraws it on start', async () => {
    const { service, network } = setup();
    const host = service();
    await host.create('hades');
    expect(network.listings.size).toBe(0);
    host.setPublic(true);
    const code = host.code() as string;
    expect(network.listings.get(code)?.listing).toEqual({
      name: 'Hero',
      godId: 'hades',
      realmId: host.realmId(),
      players: 1,
      seats: 4,
    });
    const guest = service();
    expect(await guest.join(code, 'zeus')).toBe(true);
    await settle();
    expect(network.listings.get(code)?.listing.players).toBe(2);
    guest.setReady(true);
    await settle();
    host.start();
    expect(network.listings.has(code)).toBe(false);
  });

  it('withdraws the listing when the host turns Public off or leaves', async () => {
    const { service, network } = setup();
    const host = service();
    await host.create('zeus');
    host.setPublic(true);
    host.setPublic(false);
    expect(network.listings.size).toBe(0);
    host.setPublic(true);
    host.leave();
    expect(network.listings.size).toBe(0);
  });

  it('Quick Play joins the fullest open room', async () => {
    const { service } = setup();
    const small = service();
    await small.create('zeus');
    small.setPublic(true);
    const big = service();
    await big.create('hades');
    big.setPublic(true);
    const friend = service();
    await friend.join(big.code() as string, 'athena');
    await settle();
    const player = service();
    await player.quickPlay('poseidon');
    await settle();
    expect(player.status()).toBe('lobby');
    expect(player.code()).toBe(big.code());
    expect(big.members()).toHaveLength(3);
  });

  it('Quick Play opens a public room when none is waiting', async () => {
    const { service, network } = setup();
    const player = service();
    await player.quickPlay('zeus');
    expect(player.role()).toBe('host');
    expect(player.isPublic()).toBe(true);
    expect(network.listings.has(player.code() as string)).toBe(true);
  });

  it('Quick Play moves on when a room refuses (it filled meanwhile)', async () => {
    const { service, network } = setup();
    const open = service();
    await open.create('zeus');
    open.setPublic(true);
    // A room listed as open whose host has already started: it refuses.
    const started = service();
    await started.create('hades');
    started.setPublic(true);
    const code = started.code() as string;
    const listing = network.listings.get(code)!;
    const seat = service();
    await seat.join(code, 'athena');
    await settle();
    seat.setReady(true);
    await settle();
    started.start();
    network.listings.set(code, { ...listing, listing: { ...listing.listing, players: 3 } });
    const player = service();
    await player.quickPlay('poseidon');
    await settle();
    expect(player.status()).toBe('lobby');
    expect(player.code()).toBe(open.code());
    expect(player.error()).toBeUndefined();
  });
});
