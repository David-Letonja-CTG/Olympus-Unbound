import type { IncomingMessage, Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { RoomRelay } from '../application/room-relay.js';

/** Every socket is pinged this often; one that has not answered the last ping is dropped. */
const HEARTBEAT_MS = 20_000;

export interface RoomsSocketOptions {
  readonly allowedOrigins: readonly string[] | '*';
  readonly trustProxy: boolean;
}

/** The client's address: from Caddy's `X-Forwarded-For` when behind it, else the socket's. Never stored. */
function addressOf(req: IncomingMessage, trustProxy: boolean): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return (trustProxy && first) || req.socket.remoteAddress || 'unknown';
}

/**
 * The rooms WebSocket at `/rooms` (design: Rooms over WebSocket): adapts each socket to the relay. Frames above the
 * relay's size limit are refused by `ws` itself. Returns a function that closes every socket.
 */
export function attachRoomsSocket(
  server: Server,
  relay: RoomRelay,
  o: RoomsSocketOptions,
): () => void {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: relay.limits.maxFrameBytes + 4,
    perMessageDeflate: false,
  });
  const alive = new WeakMap<WebSocket, boolean>();

  server.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    const origin = req.headers.origin;
    const allowed = o.allowedOrigins === '*' || (origin && o.allowedOrigins.includes(origin));
    if (path !== '/rooms' || !allowed) {
      socket.write(`HTTP/1.1 ${path !== '/rooms' ? 404 : 403} \r\n\r\n`);
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const session = relay.connect({
        address: addressOf(req, o.trustProxy),
        sendText: (text) => ws.readyState === ws.OPEN && ws.send(text),
        sendBinary: (data) => ws.readyState === ws.OPEN && ws.send(data, { binary: true }),
        close: (code, reason) => ws.close(code, reason),
      });
      if (!session) return;
      alive.set(ws, true);
      ws.on('pong', () => alive.set(ws, true));
      ws.on('message', (data, isBinary) => {
        const bytes = Array.isArray(data)
          ? new Uint8Array(Buffer.concat(data))
          : new Uint8Array(
              data instanceof ArrayBuffer
                ? data
                : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
            );
        if (isBinary) session.onBinary(bytes);
        else session.onText(Buffer.from(bytes).toString('utf8'));
      });
      ws.on('close', () => session.onClose());
      ws.on('error', () => ws.terminate());
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, HEARTBEAT_MS);

  return () => {
    clearInterval(heartbeat);
    for (const ws of wss.clients) ws.close(1001, 'server-stopping');
    wss.close();
  };
}
