import { CONTENT } from '../testing/content';
import { AssetManifest, codeDrawnKey, manifestPaths, walkRate } from './assets';
import { validateManifest } from './content-index';

const licence = {
  name: 'CC0-1.0' as const,
  author: 'Someone',
  title: 'Pack',
  source: 'https://example.org/pack',
};

describe('asset manifest validation', () => {
  it('accepts a licensed pack whose sprites use its files', () => {
    const manifest: AssetManifest = {
      files: [
        {
          id: 'undead',
          type: 'atlas',
          url: 'assets/undead/undead.png',
          data: 'assets/undead/undead.json',
          licence,
        },
      ],
      sprites: {
        corrupted_hoplite: {
          file: 'undead',
          frame: 'skeleton_0',
          animations: { walk: { frames: ['skeleton_1', 'skeleton_2'], fps: 8 } },
        },
      },
    };
    expect(validateManifest(manifest)).toEqual([]);
    expect(manifestPaths(manifest)).toEqual([
      'assets/undead/undead.png',
      'assets/undead/undead.json',
    ]);
  });

  it('reports unknown files, missing atlas data and receipts, and disallowed licences', () => {
    const errors = validateManifest({
      files: [
        { id: 'a', type: 'atlas', url: 'assets/a.png', licence },
        {
          id: 'b',
          type: 'image',
          url: 'assets/b.png',
          licence: { ...licence, name: 'commercial' },
        },
        {
          id: 'c',
          type: 'image',
          url: 'assets/c.png',
          licence: { ...licence, name: 'CC-BY-NC-4.0' as never },
        },
      ],
      sprites: { satyr: { file: 'missing' } },
    });
    expect(errors).toEqual([
      'Asset "a" is an atlas without its JSON data file.',
      'Asset "b" uses a commercial licence without a receipt reference in notes.',
      'Asset "c" has a licence that is not allowed: CC-BY-NC-4.0.',
      'Sprite "satyr" uses unknown asset file "missing".',
    ]);
  });
});

describe('walk rate', () => {
  it('plays one walk cycle per stride of movement', () => {
    // A 0.8 s cycle covering 80 px: at 100 px/s the cycle must take 0.8 s, at 200 px/s 0.4 s.
    expect(walkRate(0.8, 80, 1, 100)).toBeCloseTo(1);
    expect(walkRate(0.8, 80, 1, 200)).toBeCloseTo(2);
    // A figure drawn 1.5× larger takes longer strides.
    expect(walkRate(0.8, 80, 1.5, 150)).toBeCloseTo(1);
  });

  it('stays within limits and defaults to the sheet timing', () => {
    expect(walkRate(0.8, 80, 1, 2000)).toBe(3);
    expect(walkRate(0.8, 80, 1, 1)).toBe(0.2);
    expect(walkRate(0.8, undefined, 1, 100)).toBe(1);
    expect(walkRate(0.8, 80, 1, undefined)).toBe(1);
  });
});

describe('code-drawn fallbacks', () => {
  // spec: asset-pipeline / character sheets load with the run: a sheet loaded later must find its key free.
  it('keep apart from the sheet a sprite is named after', () => {
    const fileIds = new Set(CONTENT.assets.files.map((f) => f.id));
    const sheetNamed = CONTENT.enemies.map((e) => e.visual.sprite).filter((k) => fileIds.has(k));
    expect(sheetNamed).toContain('satyr');
    for (const key of sheetNamed)
      expect(fileIds.has(codeDrawnKey(CONTENT.assets, key))).toBe(false);
  });

  it('keep the sprite key when no sheet has that name', () => {
    expect(codeDrawnKey(CONTENT.assets, 'crown_laurel')).toBe('crown_laurel');
  });
});
