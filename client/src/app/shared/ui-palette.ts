/**
 * The UI colours that carry text, mirrored from the custom properties in `src/styles.css` so their contrast can be
 * checked by a unit test (spec: hud / themed, legible HUD). Change both together.
 */
export const UI_PALETTE = {
  bg: '#0b0a0c',
  panel: '#171417',
  plaque: '#1e1b1a',
  text: '#e8dfcc',
  muted: '#a39782',
  gold2: '#ecd59a',
  goldButton: '#9c7633',
  buttonText: '#1a0d08',
} as const;

function luminance(color: string): number {
  const n = parseInt(color.slice(1), 16);
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** WCAG contrast ratio between two `#rrggbb` colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
