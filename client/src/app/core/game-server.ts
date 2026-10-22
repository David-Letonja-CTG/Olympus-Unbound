import { Injectable, InjectionToken, inject } from '@angular/core';

/**
 * Set at build time (angular.json `define`): an address, `'same-origin'` when the game server also serves the game
 * (its image, D21), or `''` for none. Absent in unit tests.
 */
declare const OLYMPUS_SERVER: string | undefined;

/** The server's address from the build's setting: `'same-origin'` is wherever the game was loaded from. */
export function serverUrlOf(setting: string | undefined, origin: string | undefined): string {
  const value = typeof setting === 'string' ? setting : '';
  if (value === 'same-origin') return origin ?? '';
  return value.replace(/\/+$/, '');
}

/** How long a request to the game server may take before it counts as unreachable. */
const TIMEOUT_MS = 8000;

/**
 * The game server's address (D21, spec: game-server): `''` when this build has none, and then co-op's online features
 * and the world boards are not offered.
 */
export const GAME_SERVER_URL = new InjectionToken<string>('GAME_SERVER_URL', {
  providedIn: 'root',
  factory: () =>
    serverUrlOf(
      typeof OLYMPUS_SERVER === 'string' ? OLYMPUS_SERVER : undefined,
      typeof location === 'undefined' ? undefined : location.origin,
    ),
});

/** A request the game server refused or could not answer. */
export class ServerError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(code ?? `HTTP ${status}`);
  }
}

/** The game server (D21): its address, and JSON requests to it with a timeout. */
@Injectable({ providedIn: 'root' })
export class GameServer {
  readonly url = inject(GAME_SERVER_URL);
  /** This build knows a server. Whether it can be reached shows only when asked. */
  readonly configured = this.url !== '';

  /** The rooms WebSocket's address (`ws:` or `wss:` like the server's). */
  roomsUrl(): string {
    return `${this.url.replace(/^http/, 'ws')}/rooms`;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    if (!this.configured) throw new ServerError(0, 'not-configured');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${this.url}${path}`, { ...init, signal: controller.signal });
    } catch {
      throw new ServerError(0, 'unreachable');
    } finally {
      clearTimeout(timer);
    }
    const data = (await response.json().catch(() => ({}))) as T & { code?: string };
    if (!response.ok) throw new ServerError(response.status, data?.code);
    return data;
  }
}
