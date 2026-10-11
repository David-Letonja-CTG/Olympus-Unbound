import { CutsceneCaption, CutsceneCue, CutsceneDefinition } from '../data/cutscene';

export interface CameraState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

type CameraCue = Extract<CutsceneCue, { type: 'camera' }>;
type FadeCue = Extract<CutsceneCue, { type: 'fade' }>;

const smooth = (t: number) => t * t * (3 - 2 * t);
const progress = (t: number, at: number, duration: number) =>
  duration <= 0 ? (t >= at ? 1 : 0) : Math.min(1, Math.max(0, (t - at) / duration));

/**
 * The pure timing of a cutscene (D14): which cues fire in a time window, and the camera, fade and captions at
 * any moment. Rendering lives in the Phaser layer; this stays testable without it.
 */
export class CutsceneTimeline {
  private readonly cues: readonly CutsceneCue[];
  private readonly cameras: readonly CameraCue[];
  private readonly fades: readonly FadeCue[];

  constructor(readonly definition: CutsceneDefinition) {
    this.cues = [...definition.cues].sort((a, b) => a.at - b.at);
    this.cameras = this.cues.filter((c): c is CameraCue => c.type === 'camera');
    this.fades = this.cues.filter((c): c is FadeCue => c.type === 'fade');
  }

  get duration(): number {
    return this.definition.duration;
  }

  /** Cues with `t0 < at ≤ t1`; pass `t0 < 0` to include cues at 0. */
  cuesBetween(t0: number, t1: number): CutsceneCue[] {
    return this.cues.filter((c) => c.at > t0 && c.at <= t1);
  }

  /** Camera centre and zoom at `t`: each camera cue eases from where the previous ones left the camera. */
  cameraAt(t: number): CameraState {
    let state: CameraState = this.cameras[0]
      ? { x: this.cameras[0].x, y: this.cameras[0].y, zoom: this.cameras[0].zoom ?? 1 }
      : { x: 0, y: 0, zoom: 1 };
    for (const cue of this.cameras) {
      if (cue.at > t) break;
      const k = smooth(progress(t, cue.at, cue.duration));
      const target = { x: cue.x, y: cue.y, zoom: cue.zoom ?? state.zoom };
      state = {
        x: state.x + (target.x - state.x) * k,
        y: state.y + (target.y - state.y) * k,
        zoom: state.zoom + (target.zoom - state.zoom) * k,
      };
    }
    return state;
  }

  /** Picture visibility at `t`: 0 = black, 1 = fully visible. Starts black when the first fade is at 0. */
  fadeAt(t: number): number {
    let value = this.fades[0]?.at === 0 ? 0 : 1;
    for (const cue of this.fades) {
      if (cue.at > t) break;
      value += (cue.to - value) * progress(t, cue.at, cue.duration);
    }
    return value;
  }

  captionsAt(t: number): CutsceneCaption[] {
    return this.definition.captions.filter((c) => t >= c.at && t < c.at + c.duration);
  }
}
