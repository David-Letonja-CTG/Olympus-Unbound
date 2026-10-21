/** What the share card shows of a run (spec: daily-trial / sharing a run). */
export interface ShareCard {
  /** The player's name for the headline; empty for a nameless dare. */
  readonly player: string;
  readonly god: string;
  /** The god's picture (a data or asset URL); left out if it cannot be loaded. */
  readonly godImage?: string;
  /** The realm's boss, drawn as a silhouette behind the god. */
  readonly bossImage?: string;
  readonly realm: string;
  /** "Daily Trial · 21 October · Swift Foes", "Quick run", or empty. */
  readonly kind: string;
  readonly time: string;
  readonly kills: number;
  readonly level: number;
  readonly realmsCleared: number;
  readonly score: number;
  /** Where to play, shown at the bottom (the site's address). */
  readonly site: string;
}

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const GOLD = '#ecd59a';
const BRONZE = '#c9a55a';
const TEXT = '#f3e7cc';
const MUTED = '#a89c86';

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');

function loadImage(src: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = src;
  });
}

/** Shrinks a font until the text fits `width`; returns the size used. */
function fitText(
  g: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  size: number,
  width: number,
): number {
  for (; size > 12; size -= 2) {
    g.font = font(size);
    if (g.measureText(text).width <= width) break;
  }
  return size;
}

/**
 * The boss as a black figure (the loading screen's look, docs/art-direction.md). Only the figure's solid pixels
 * count: the portrait's soft halo would otherwise turn into a dark smudge.
 */
function silhouette(image: HTMLImageElement, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return c;
  g.drawImage(image, 0, 0, size, size);
  const pixels = g.getImageData(0, 0, size, size);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    const solid = data[i + 3] > 140;
    data[i] = 6;
    data[i + 1] = 4;
    data[i + 2] = 6;
    data[i + 3] = solid ? 255 : 0;
  }
  g.putImageData(pixels, 0, 0);
  return c;
}

/**
 * Draws the dare (spec: daily-trial / sharing a run), 1200 × 630, the size link previews and social sites use:
 * - a headline naming the player ("ADA CHALLENGES YOU") over the trial or quick-run line;
 * - the realm's boss in silhouette with an ember glow, and the god in front of it;
 * - the god and realm, the numbers, and the score as "Score to beat" on a gold plate;
 * - a closing ribbon with the dare and where to play.
 * In the UI's fonts and colours: night sky, bronze and gold.
 */
export async function drawShareCard(card: ShareCard): Promise<Blob | undefined> {
  if (typeof document === 'undefined') return undefined;
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const g = canvas.getContext('2d');
  if (!g) return undefined;
  const [W, H] = [CARD_WIDTH, CARD_HEIGHT];
  const css = getComputedStyle(document.documentElement);
  const font = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const display = font('--display', 'Georgia, serif');
  const serif = font('--serif', 'Georgia, serif');
  const sans = font('--sans', 'system-ui, sans-serif');
  const [god, boss] = await Promise.all([
    card.godImage ? loadImage(card.godImage) : undefined,
    card.bossImage ? loadImage(card.bossImage) : undefined,
  ]);

  // Night: a deep gradient, an ember glow rising behind the figures, and stars.
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0b0a12');
  sky.addColorStop(1, '#1c1112');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const ember = g.createRadialGradient(290, 560, 0, 290, 560, 420);
  ember.addColorStop(0, 'rgba(190, 70, 25, 0.55)');
  ember.addColorStop(1, 'rgba(190, 70, 25, 0)');
  g.fillStyle = ember;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(236, 225, 200, 0.5)';
  for (let i = 0; i < 90; i++) {
    const big = i % 9 === 0;
    g.fillRect((i * 197 + 31) % W, (i * 89) % (H * 0.6), big ? 2 : 1, big ? 2 : 1);
  }

  // The frame.
  g.strokeStyle = BRONZE;
  g.lineWidth = 4;
  g.strokeRect(18, 18, W - 36, H - 36);
  g.strokeStyle = 'rgba(201, 165, 90, 0.4)';
  g.lineWidth = 1.5;
  g.strokeRect(30, 30, W - 60, H - 60);

  // The headline: who dares whom.
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = MUTED;
  g.font = `600 22px ${display}`;
  g.fillText('O L Y M P U S   U N B O U N D', W / 2, 74);
  const headline = (
    card.player ? `${card.player} challenges you` : 'A challenge from Olympus'
  ).toUpperCase();
  const size = fitText(g, headline, (s) => `700 ${s}px ${display}`, 58, W - 140);
  g.fillStyle = GOLD;
  g.shadowColor = 'rgba(236, 213, 154, 0.45)';
  g.shadowBlur = 24;
  g.fillText(headline, W / 2, 74 + 14 + size);
  g.shadowBlur = 0;
  if (card.kind) {
    g.fillStyle = '#d9c9a4';
    g.font = `italic 26px ${serif}`;
    g.fillText(card.kind, W / 2, 74 + 14 + size + 40);
  }
  const top = 74 + 14 + size + (card.kind ? 62 : 30);

  // The figures: the boss looming behind, the god in front, both standing on the ribbon.
  const floor = H - 78;
  if (boss) {
    const b = Math.min(430, floor - top + 70);
    g.save();
    g.shadowColor = 'rgba(255, 90, 40, 0.8)';
    g.shadowBlur = 28;
    g.drawImage(silhouette(boss, b), 345 - b / 2, floor - b + 6, b, b);
    g.restore();
  }
  const halo = g.createRadialGradient(195, floor - 120, 10, 195, floor - 120, 190);
  halo.addColorStop(0, 'rgba(236, 213, 154, 0.3)');
  halo.addColorStop(1, 'rgba(236, 213, 154, 0)');
  g.fillStyle = halo;
  g.fillRect(30, top - 20, 460, floor - top + 20);
  if (god) {
    g.imageSmoothingQuality = 'high';
    const s = Math.min(280, floor - top - 20);
    g.drawImage(god, 195 - s / 2, floor - s + 4, s, s);
  }

  // The run, centred in the space beside the figures: god and realm, the numbers, the score to beat.
  const x = 560;
  const plateH = 104;
  const y = top + Math.max(0, (floor - top - (66 + 98 + 22 + plateH)) / 2) + 30;
  g.textAlign = 'left';
  g.fillStyle = TEXT;
  g.font = `700 40px ${serif}`;
  g.fillText(card.god, x, y);
  g.fillStyle = '#c8bca4';
  g.font = `26px ${sans}`;
  g.fillText(`in ${card.realm}`, x, y + 36);
  const stats: [string, string][] = [
    ['Time', card.time],
    ['Kills', fmt(card.kills)],
    ['Level', String(card.level)],
    ['Realms', String(card.realmsCleared)],
  ];
  stats.forEach(([label, value], i) => {
    const sx = x + i * 140;
    g.fillStyle = '#8f8572';
    g.font = `20px ${sans}`;
    g.fillText(label, sx, y + 82);
    g.fillStyle = TEXT;
    g.font = `700 34px ${sans}`;
    g.fillText(value, sx, y + 120);
  });
  const plateY = y + 142;
  const plateW = W - 60 - x;
  const plate = g.createLinearGradient(0, plateY, 0, plateY + plateH);
  plate.addColorStop(0, 'rgba(70, 50, 20, 0.9)');
  plate.addColorStop(1, 'rgba(25, 18, 10, 0.9)');
  g.fillStyle = plate;
  g.fillRect(x - 16, plateY, plateW, plateH);
  g.strokeStyle = BRONZE;
  g.lineWidth = 2;
  g.strokeRect(x - 16, plateY, plateW, plateH);
  g.textBaseline = 'middle';
  g.fillStyle = MUTED;
  g.font = `22px ${display}`;
  g.fillText('SCORE', x + 8, plateY + plateH / 2 - 14);
  g.fillText('TO BEAT', x + 8, plateY + plateH / 2 + 14);
  const score = fmt(card.score);
  const scoreSize = fitText(g, score, (n) => `700 ${n}px ${display}`, 68, plateW - 190);
  g.fillStyle = GOLD;
  g.textAlign = 'right';
  g.font = `700 ${scoreSize}px ${display}`;
  g.fillText(score, x - 16 + plateW - 24, plateY + plateH / 2 + 4);
  g.textBaseline = 'alphabetic';

  // The dare.
  g.fillStyle = 'rgba(8, 6, 8, 0.82)';
  g.fillRect(30, H - 78, W - 60, 48);
  g.textAlign = 'center';
  g.fillStyle = TEXT;
  g.font = `600 22px ${sans}`;
  g.fillText(
    `Can you beat it? Play the same run free in your browser · ${card.site}`,
    W / 2,
    H - 46,
  );

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? undefined), 'image/png'));
}

/**
 * Shares the card alone (spec: daily-trial / sharing a run): the share sheet where the browser can share files,
 * otherwise the picture is saved. No text or link goes with it: apps such as Messenger keep the text of a share and
 * drop its picture, so the link has its own button (`shareLink`).
 */
export async function sharePicture(blob: Blob): Promise<'shared' | 'cancelled' | 'saved'> {
  const file = new File([blob], 'olympus-unbound.png', { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Any other refusal: fall back to saving.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}

/**
 * Shares a link (a room invite, spec: rooms / joining a room; a challenge, spec: daily-trial / sharing a run): the
 * share sheet where the browser has one, else the clipboard. Cancelling the share sheet is not an error.
 */
export async function shareLink(
  url: string,
  title: string,
  text: string,
): Promise<'shared' | 'cancelled' | 'copied' | 'failed'> {
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title, text, url });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copy(`${text} ${url}`)) ? 'copied' : 'failed';
}

/** Copies text to the clipboard; false where the browser refuses. */
async function copy(text: string): Promise<boolean> {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
