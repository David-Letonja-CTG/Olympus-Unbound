import { detectQuality, isSoftwareRenderer } from './graphics-quality';

describe('detectQuality (spec: visual-atmosphere / graphics quality levels)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts a phone at Low (spec: phone-play / phone performance)', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      hardwareConcurrency: 8,
    });
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' }));
    expect(detectQuality()).toBe('low');
  });

  it('knows software renderers', () => {
    expect(isSoftwareRenderer('Google SwiftShader')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (NVIDIA GeForce GTX 1660)')).toBe(false);
  });
});
