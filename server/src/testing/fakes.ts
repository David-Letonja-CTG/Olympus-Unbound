import type { Clock } from '../application/ports.js';
import type { RelaySocket } from '../application/room-relay.js';

/** A clock the test moves by hand. */
export class FakeClock implements Clock {
  constructor(private at = Date.parse('2026-10-22T12:00:00Z')) {}
  now(): Date {
    return new Date(this.at);
  }
  advance(ms: number): void {
    this.at += ms;
  }
}

/** A socket that records what the relay sent it. */
export class FakeSocket implements RelaySocket {
  readonly texts: Record<string, unknown>[] = [];
  readonly binaries: Uint8Array[] = [];
  closed: { code: number; reason: string } | undefined;

  constructor(readonly address = '203.0.113.7') {}

  sendText(text: string): void {
    this.texts.push(JSON.parse(text) as Record<string, unknown>);
  }
  sendBinary(data: Uint8Array): void {
    this.binaries.push(new Uint8Array(data));
  }
  close(code: number, reason: string): void {
    this.closed ??= { code, reason };
  }
  last(): Record<string, unknown> | undefined {
    return this.texts.at(-1);
  }
}

/** `[u32 guest][payload]`, as a host sends and receives room messages. */
export function framed(guest: number, payload: number[]): Uint8Array {
  const out = new Uint8Array(4 + payload.length);
  new DataView(out.buffer).setUint32(0, guest, true);
  out.set(payload, 4);
  return out;
}
