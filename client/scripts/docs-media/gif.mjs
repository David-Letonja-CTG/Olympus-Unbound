// A small animated GIF encoder for the docs media, so they need no extra tools. The game is smoothly shaded and dark,
// so every frame gets its own palette (median cut over its colours, 255 entries) instead of one global palette. After
// the first frame, pixels that stayed within `tolerance` of what the GIF already shows are transparent, which keeps
// files small when the camera holds still. LZW compression, endless loop.
//   encodeGif(frames, { width, height, delays }); each frame is RGBA, width × height; `delays` in milliseconds.

/** Median cut over 5-bit colours: up to `size` boxes split along their widest channel, each the mean of its colours. */
function medianCut(frame, size) {
  const counts = new Map();
  for (let i = 0; i < frame.length; i += 4) {
    const key = ((frame[i] >> 3) << 10) | ((frame[i + 1] >> 3) << 5) | (frame[i + 2] >> 3);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const colours = [...counts.entries()].map(([k, n]) => [(k >> 10) & 31, (k >> 5) & 31, k & 31, n]);
  const boxes = [colours];
  while (boxes.length < size) {
    // Split the box with the most pixels that still holds more than one colour.
    let pick = -1;
    let most = 0;
    for (let b = 0; b < boxes.length; b++) {
      if (boxes[b].length < 2) continue;
      const n = boxes[b].reduce((s, c) => s + c[3], 0);
      if (n > most) [most, pick] = [n, b];
    }
    if (pick < 0) break;
    const box = boxes[pick];
    const range = [0, 1, 2].map((ch) => {
      let lo = 31;
      let hi = 0;
      for (const c of box) [lo, hi] = [Math.min(lo, c[ch]), Math.max(hi, c[ch])];
      return hi - lo;
    });
    const ch = range.indexOf(Math.max(...range));
    box.sort((a, b) => a[ch] - b[ch]);
    let half = most / 2;
    let cut = 1;
    for (; cut < box.length - 1; cut++) if ((half -= box[cut - 1][3]) <= 0) break;
    boxes.splice(pick, 1, box.slice(0, cut), box.slice(cut));
  }
  const palette = boxes.map((box) => {
    const n = box.reduce((s, c) => s + c[3], 0);
    return [0, 1, 2].map((ch) =>
      Math.round((box.reduce((s, c) => s + c[ch] * c[3], 0) / n) * 8.2258),
    );
  });
  while (palette.length < 256) palette.push([0, 0, 0]);
  return palette;
}

function indexer(palette) {
  const cache = new Map();
  return (r, g, b) => {
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    let best = cache.get(key);
    if (best !== undefined) return best;
    let bestD = Infinity;
    for (let i = 0; i < 255; i++) {
      const [pr, pg, pb] = palette[i];
      const d = (pr - r) ** 2 * 3 + (pg - g) ** 2 * 4 + (pb - b) ** 2 * 2;
      if (d < bestD) [bestD, best] = [d, i];
    }
    cache.set(key, best);
    return best;
  };
}

/** GIF LZW for 8-bit indices, emitted as data sub-blocks. */
function lzw(indices) {
  const minCode = 8;
  const clear = 1 << minCode;
  const eoi = clear + 1;
  const out = [];
  let bitBuf = 0;
  let bitLen = 0;
  let codeSize = minCode + 1;
  const emit = (code) => {
    bitBuf |= code << bitLen;
    bitLen += codeSize;
    while (bitLen >= 8) {
      out.push(bitBuf & 255);
      bitBuf >>>= 8;
      bitLen -= 8;
    }
  };
  let dict = new Map();
  let next = eoi + 1;
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 256 + k;
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    emit(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > 1 << codeSize && codeSize < 12) codeSize++;
    } else {
      emit(clear);
      dict = new Map();
      next = eoi + 1;
      codeSize = minCode + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bitLen > 0) out.push(bitBuf & 255);
  const blocks = [minCode];
  for (let i = 0; i < out.length; i += 255) {
    const chunk = out.slice(i, i + 255);
    blocks.push(chunk.length, ...chunk);
  }
  blocks.push(0);
  return blocks;
}

export function encodeGif(frames, { width, height, delays, tolerance = 10 }) {
  const bytes = [];
  const u16 = (v) => bytes.push(v & 255, (v >> 8) & 255);
  bytes.push(...Buffer.from('GIF89a'));
  u16(width);
  u16(height);
  bytes.push(0x70, 0, 0); // no global colour table (every frame has its own)
  bytes.push(0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0); // loop forever
  const TRANSPARENT = 255;
  // What the GIF shows so far, to decide which pixels may stay as they are.
  const shown = new Uint8Array(width * height * 3);
  frames.forEach((f, n) => {
    const palette = medianCut(f, 255);
    const toIndex = indexer(palette);
    const delay = Math.round((delays[n] ?? 100) / 10);
    // Disposal 1 (keep the frame), with a transparent index from the second frame on.
    bytes.push(0x21, 0xf9, 4, n > 0 ? 0x05 : 0x04, delay & 255, (delay >> 8) & 255, TRANSPARENT, 0);
    bytes.push(0x2c);
    u16(0);
    u16(0);
    u16(width);
    u16(height);
    bytes.push(0x87); // local colour table, 256 entries
    for (const [r, g, b] of palette) bytes.push(r, g, b);
    const indices = new Uint8Array(width * height);
    for (let p = 0; p < width * height; p++) {
      const [r, g, b] = [f[p * 4], f[p * 4 + 1], f[p * 4 + 2]];
      const s = p * 3;
      if (
        n > 0 &&
        Math.abs(shown[s] - r) <= tolerance &&
        Math.abs(shown[s + 1] - g) <= tolerance &&
        Math.abs(shown[s + 2] - b) <= tolerance
      ) {
        indices[p] = TRANSPARENT;
        continue;
      }
      const i = toIndex(r, g, b);
      indices[p] = i;
      [shown[s], shown[s + 1], shown[s + 2]] = palette[i];
    }
    for (const b of lzw(indices)) bytes.push(b);
  });
  bytes.push(0x3b);
  return Buffer.from(bytes);
}
