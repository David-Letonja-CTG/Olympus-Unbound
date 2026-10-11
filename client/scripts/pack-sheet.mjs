// Converts an 8-direction sprite sheet (one row per direction, as in the Flare packs) into the sheet the game
// loads: one direction row, re-packed into a grid, optionally with several layer sheets stacked first (the hero
// packs ship armour, head and weapons as separate sheets). The game flips the art for the other facing, so one
// row is enough, and the grid keeps every texture well under WebGL size limits (D12, docs/content.md).
//
//   node scripts/pack-sheet.mjs --frame 128 --row 4 [--columns 8] [--measure] --out <out.png> <layer.png> ...
//   node scripts/pack-sheet.mjs --frame 128 --frames [--columns 8] [--measure] --out <out.png> <frame.png> ...
//
// With `--frames`, each input is one frame (e.g. a 512 px Blender render from art/blender/), scaled down to the
// frame size in halving steps for clean edges. Layers are drawn in the order given. `--measure` also prints the opaque bounds of the first frame, which helps
// pick `scale` and `originY` in src/content/assets.ts. Uses the Chromium that Playwright installs (a dev tool).
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    frame: { type: 'string' },
    row: { type: 'string' },
    columns: { type: 'string', default: '8' },
    out: { type: 'string' },
    measure: { type: 'boolean', default: false },
    frames: { type: 'boolean', default: false },
  },
});
if (!values.frame || (!values.row && !values.frames) || !values.out || positionals.length === 0) {
  console.error(
    'Usage: node scripts/pack-sheet.mjs --frame <px> (--row <n> | --frames) [--columns 8] [--measure] --out <out.png> <png> ...',
  );
  process.exit(1);
}

const layers = positionals.map(
  (path) => `data:image/png;base64,${readFileSync(path).toString('base64')}`,
);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ layers, frame, row, columns, framesMode }) => {
      const images = await Promise.all(
        layers.map(
          (src) =>
            new Promise((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = () => reject(new Error('Not a readable image'));
              image.src = src;
            }),
        ),
      );
      /** A frame image halved step by step down to the frame size (one big step blurs and aliases). */
      const shrink = (image) => {
        let source = image;
        let size = image.width;
        while (size / 2 >= frame) {
          size /= 2;
          const step = document.createElement('canvas');
          step.width = step.height = size;
          const sg = step.getContext('2d');
          sg.imageSmoothingQuality = 'high';
          sg.drawImage(source, 0, 0, size, size);
          source = step;
        }
        return source;
      };
      const count = framesMode ? images.length : images[0].width / frame;
      const rows = Math.ceil(count / columns);
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(count, columns) * frame;
      canvas.height = rows * frame;
      const g = canvas.getContext('2d');
      g.imageSmoothingQuality = 'high';
      for (let i = 0; i < count; i++) {
        const x = (i % columns) * frame;
        const y = Math.floor(i / columns) * frame;
        if (framesMode) g.drawImage(shrink(images[i]), x, y, frame, frame);
        else
          for (const image of images)
            g.drawImage(image, i * frame, row * frame, frame, frame, x, y, frame, frame);
      }
      // Opaque bounds of frame 0 (alpha > 200 leaves out the soft drop shadow).
      const pixels = g.getImageData(0, 0, frame, frame).data;
      let [left, top, right, bottom] = [frame, frame, -1, -1];
      for (let y = 0; y < frame; y++)
        for (let x = 0; x < frame; x++)
          if (pixels[(y * frame + x) * 4 + 3] > 200) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      return {
        png: canvas.toDataURL('image/png'),
        count,
        rows,
        bounds: { left, top, right, bottom },
      };
    },
    {
      layers,
      frame: Number(values.frame),
      row: Number(values.row ?? 0),
      columns: Number(values.columns),
      framesMode: values.frames,
    },
  );
  writeFileSync(values.out, Buffer.from(result.png.split(',')[1], 'base64'));
  console.log(
    `${values.out}: ${result.count} frames in ${result.rows} row(s) of ${values.columns}`,
  );
  if (values.measure) console.log('frame 0 opaque bounds', result.bounds);
} finally {
  await browser.close();
}
