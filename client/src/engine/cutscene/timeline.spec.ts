import { CONTENT } from '../testing/content';
import { CutsceneDefinition } from '../data/cutscene';
import { validateContent } from '../data/content-index';
import { CutsceneTimeline } from './timeline';

const scene: CutsceneDefinition = {
  id: 'test',
  realmId: 'mount_olympus',
  seed: 1,
  duration: 20,
  ambient: 0.5,
  captions: [{ at: 2, duration: 3, text: 'Hello' }],
  cues: [
    { at: 0, type: 'camera', x: 0, y: 0, zoom: 1, duration: 0 },
    { at: 0, type: 'fade', to: 1, duration: 2 },
    { at: 4, type: 'camera', x: 100, y: -50, zoom: 2, duration: 2 },
    { at: 4, type: 'strike', x: 0, y: 0 },
    { at: 10, type: 'fade', to: 0, duration: 4 },
  ],
};

describe('CutsceneTimeline', () => {
  const timeline = new CutsceneTimeline(scene);

  it('returns the cues inside a time window, including those at 0 for the first window', () => {
    expect(timeline.cuesBetween(-1, 0).map((c) => c.type)).toEqual(['camera', 'fade']);
    expect(timeline.cuesBetween(3.9, 4).map((c) => c.type)).toEqual(['camera', 'strike']);
    expect(timeline.cuesBetween(4, 9)).toEqual([]);
  });

  it('eases the camera between cues', () => {
    expect(timeline.cameraAt(3)).toEqual({ x: 0, y: 0, zoom: 1 });
    const mid = timeline.cameraAt(5);
    expect(mid.x).toBeCloseTo(50);
    expect(mid.zoom).toBeCloseTo(1.5);
    expect(timeline.cameraAt(7)).toEqual({ x: 100, y: -50, zoom: 2 });
  });

  it('fades in from black and out again', () => {
    expect(timeline.fadeAt(0)).toBe(0);
    expect(timeline.fadeAt(1)).toBeCloseTo(0.5);
    expect(timeline.fadeAt(5)).toBe(1);
    expect(timeline.fadeAt(12)).toBeCloseTo(0.5);
    expect(timeline.fadeAt(14)).toBe(0);
  });

  it('shows captions only during their time', () => {
    expect(timeline.captionsAt(1.9)).toEqual([]);
    expect(timeline.captionsAt(2).map((c) => c.text)).toEqual(['Hello']);
    expect(timeline.captionsAt(5)).toEqual([]);
  });
});

describe('the intro', () => {
  const intro = CONTENT.cutscenes.find((c) => c.id === 'intro') as CutsceneDefinition;

  it('lasts 45–60 seconds, covers the story beats, and is valid content', () => {
    expect(intro.duration).toBeGreaterThanOrEqual(45);
    expect(intro.duration).toBeLessThanOrEqual(60);
    const text = intro.captions.map((c) => c.text).join(' ');
    for (const beat of ['gods', 'Olympus', 'fell', 'Thunderer', 'Zeus'])
      expect(text).toContain(beat);
    expect(intro.cues.some((c) => c.type === 'horde')).toBe(true);
    expect(intro.cues.filter((c) => c.type === 'remove')).toHaveLength(3);
    expect(validateContent(CONTENT)).toEqual([]);
  });

  it('reports actors used before they appear', () => {
    const broken = {
      ...CONTENT,
      cutscenes: [{ ...scene, cues: [{ at: 1, type: 'remove' as const, actor: 'ghost' }] }],
    };
    expect(validateContent(broken)).toContain(
      'Cutscene "test" uses actor "ghost" before spawning it.',
    );
  });
});
