/**
 * In-engine cutscenes as data (D14, spec: intro-cutscene). Positions are world units relative to the centre of
 * the realm's arena (its spawn plaza), so a scene does not depend on the map size.
 */

export interface CutsceneLight {
  readonly radius: number;
  readonly color: number;
  /** 0–1. */
  readonly intensity: number;
  /** Flicker amount 0–1 (fire). */
  readonly flicker?: number;
}

export interface CutsceneActor {
  readonly id: string;
  readonly sprite: string;
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly facing?: 'left' | 'right';
  readonly light?: CutsceneLight;
}

export type CutsceneCue =
  /** Moves the camera centre (and optionally zoom) to a point over `duration` seconds. */
  | {
      readonly at: number;
      readonly type: 'camera';
      readonly x: number;
      readonly y: number;
      readonly zoom?: number;
      readonly duration: number;
    }
  | {
      readonly at: number;
      readonly type: 'shake';
      readonly duration: number;
      readonly intensity: number;
    }
  /** Fades the picture: `to` 0 = black, 1 = fully visible. */
  | { readonly at: number; readonly type: 'fade'; readonly to: number; readonly duration: number }
  | { readonly at: number; readonly type: 'spawn'; readonly actor: CutsceneActor }
  | {
      readonly at: number;
      readonly type: 'move';
      readonly actor: string;
      readonly x: number;
      readonly y: number;
      readonly duration: number;
    }
  /** Removes an actor with a burst (a fallen god, a slain monster). */
  | {
      readonly at: number;
      readonly type: 'remove';
      readonly actor: string;
      readonly color?: number;
    }
  /** `count` actors walking from around (fromX, fromY) to around (toX, toY). */
  | {
      readonly at: number;
      readonly type: 'horde';
      readonly sprite: string;
      readonly count: number;
      readonly fromX: number;
      readonly fromY: number;
      readonly toX: number;
      readonly toY: number;
      readonly spread: number;
      readonly duration: number;
    }
  /** A lightning strike with its flash of light. */
  | {
      readonly at: number;
      readonly type: 'strike';
      readonly x: number;
      readonly y: number;
      readonly radius?: number;
    }
  /** A light (fire, divine glow) that stays until removed or until `duration` ends. */
  | {
      readonly at: number;
      readonly type: 'light';
      readonly id: string;
      readonly x: number;
      readonly y: number;
      readonly light: CutsceneLight;
      readonly duration?: number;
    }
  | {
      readonly at: number;
      readonly type: 'burst';
      readonly x: number;
      readonly y: number;
      readonly color: number;
      readonly count: number;
    }
  | { readonly at: number; readonly type: 'sound'; readonly cue: string };

export interface CutsceneCaption {
  readonly at: number;
  readonly duration: number;
  readonly text: string;
  /** `title` is large and centred; `narration` sits low on the screen. */
  readonly style?: 'title' | 'narration';
}

export interface CutsceneDefinition {
  readonly id: string;
  readonly realmId: string;
  /** Seed for the arena the scene is set in. */
  readonly seed: number;
  /** Seconds. */
  readonly duration: number;
  /** Ambient light level 0–1 for the scene. */
  readonly ambient: number;
  readonly cues: readonly CutsceneCue[];
  readonly captions: readonly CutsceneCaption[];
}
