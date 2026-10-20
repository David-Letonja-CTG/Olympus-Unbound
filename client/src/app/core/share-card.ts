/** What the share card shows of a run (spec: daily-trial / sharing a run). */
export interface ShareCard {
  readonly god: string;
  /** The god's picture (a data or asset URL); left out if it cannot be loaded. */
  readonly godImage?: string;
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

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');

function loadImage(src: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = src;
  });
}

/**
 * Draws the card: night sky, a gold frame, the god, the realm, the numbers and the score, in the UI's fonts
 * (docs/art-direction.md). 1200 × 630, the size link previews and social sites use.
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

  // Night: a deep gradient, an ember glow below and a few stars.
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0d0c14');
  sky.addColorStop(1, '#1a1214');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.3, H * 1.1, 0, W * 0.3, H * 1.1, W * 0.6);
  glow.addColorStop(0, 'rgba(160, 50, 20, 0.45)');
  glow.addColorStop(1, 'rgba(160, 50, 20, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(236, 225, 200, 0.55)';
  for (let i = 0; i < 70; i++) {
    const x = (i * 197) % W;
    const y = (i * 89) % (H * 0.55);
    g.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }

  // The gold frame.
  g.strokeStyle = '#c9a55a';
  g.lineWidth = 4;
  g.strokeRect(22, 22, W - 44, H - 44);
  g.strokeStyle = 'rgba(201, 165, 90, 0.45)';
  g.lineWidth = 1.5;
  g.strokeRect(34, 34, W - 68, H - 68);

  // The god, large, on the left, with a halo.
  const portrait = card.godImage ? await loadImage(card.godImage) : undefined;
  const halo = g.createRadialGradient(250, 330, 10, 250, 330, 230);
  halo.addColorStop(0, 'rgba(236, 213, 154, 0.35)');
  halo.addColorStop(1, 'rgba(236, 213, 154, 0)');
  g.fillStyle = halo;
  g.fillRect(20, 80, 460, 500);
  if (portrait) {
    g.imageSmoothingQuality = 'high';
    g.drawImage(portrait, 70, 150, 360, 360);
  }

  // The words on the right.
  const x = 480;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#ecd59a';
  g.font = `700 54px ${display}`;
  g.fillText('OLYMPUS UNBOUND', x, 120);
  g.fillStyle = '#a89c86';
  g.font = `italic 26px ${serif}`;
  g.fillText(card.kind || 'Unleash the gods. Survive the divine war.', x, 162);

  g.fillStyle = '#f3e7cc';
  g.font = `700 44px ${serif}`;
  g.fillText(card.god, x, 240);
  g.fillStyle = '#c8bca4';
  g.font = `28px ${sans}`;
  g.fillText(`in ${card.realm}`, x, 282);

  const stats: [string, string][] = [
    ['Time', card.time],
    ['Kills', fmt(card.kills)],
    ['Level', String(card.level)],
    ['Realms', String(card.realmsCleared)],
  ];
  stats.forEach(([label, value], i) => {
    const sx = x + i * 170;
    g.fillStyle = '#8f8572';
    g.font = `22px ${sans}`;
    g.fillText(label, sx, 350);
    g.fillStyle = '#f3e7cc';
    g.font = `700 40px ${sans}`;
    g.fillText(value, sx, 395);
  });

  g.fillStyle = '#8f8572';
  g.font = `24px ${display}`;
  g.fillText('SCORE', x, 465);
  g.fillStyle = '#ecd59a';
  g.font = `700 76px ${display}`;
  g.fillText(fmt(card.score), x, 540);

  g.fillStyle = '#a89c86';
  g.font = `22px ${sans}`;
  g.textAlign = 'right';
  g.fillText(card.site, W - 60, H - 56);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? undefined), 'image/png'));
}

/** How the run was shared, for the summary to say. */
export type ShareOutcome = 'shared' | 'cancelled' | 'saved';

/**
 * Shares a card and its challenge link (spec: daily-trial / sharing a run): the share sheet where the browser can
 * share files, otherwise the picture is saved and the link copied.
 */
export async function shareRun(
  blob: Blob,
  link: string,
  text: string,
): Promise<{ outcome: ShareOutcome; copied: boolean }> {
  const file = new File([blob], 'olympus-unbound.png', { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: `${text} ${link}`, url: link });
      return { outcome: 'shared', copied: false };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError')
        return { outcome: 'cancelled', copied: false };
      // Any other refusal: fall back to saving and copying.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { outcome: 'saved', copied: await copy(`${text} ${link}`) };
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
