/**
 * Room messages on the wire (design: Rooms over WebSocket). A `PeerLink` carries structured values whose snapshots are
 * `ArrayBuffer`s (D16); the server passes the bytes on unread. Layout: `[u32 json length][json]` then, for each buffer
 * the JSON refers to as `{"$b": index}`, `[u32 length][bytes]`. Everything is little-endian.
 */
export function encodeMessage(value: unknown): Uint8Array<ArrayBuffer> {
  const buffers: ArrayBuffer[] = [];
  const json = JSON.stringify(value, (_key, v: unknown) => {
    if (v instanceof ArrayBuffer) {
      buffers.push(v);
      return { $b: buffers.length - 1 };
    }
    return v;
  });
  const text = new TextEncoder().encode(json);
  let size = 4 + text.length;
  for (const b of buffers) size += 4 + b.byteLength;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, text.length, true);
  out.set(text, 4);
  let at = 4 + text.length;
  for (const b of buffers) {
    view.setUint32(at, b.byteLength, true);
    out.set(new Uint8Array(b), at + 4);
    at += 4 + b.byteLength;
  }
  return out;
}

/** The value `encodeMessage` wrote; throws on bytes it did not write. */
export function decodeMessage(bytes: Uint8Array): unknown {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(0, true);
  const json = new TextDecoder().decode(bytes.subarray(4, 4 + length));
  const buffers: ArrayBuffer[] = [];
  let at = 4 + length;
  while (at < bytes.length) {
    const size = view.getUint32(at, true);
    if (at + 4 + size > bytes.length) throw new Error('truncated message');
    buffers.push(bytes.slice(at + 4, at + 4 + size).buffer);
    at += 4 + size;
  }
  return JSON.parse(json, (_key, v: unknown) => {
    if (typeof v === 'object' && v !== null && '$b' in v) {
      const buffer = buffers[(v as { $b: number }).$b];
      if (!buffer) throw new Error('missing buffer');
      return buffer;
    }
    return v;
  });
}
