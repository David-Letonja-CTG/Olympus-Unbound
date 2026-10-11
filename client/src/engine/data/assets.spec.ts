import { AssetManifest, manifestPaths } from './assets';
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
