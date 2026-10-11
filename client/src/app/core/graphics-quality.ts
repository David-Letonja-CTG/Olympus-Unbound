import { GraphicsQuality } from '../../engine';

/** Renderer names that mean WebGL runs on the CPU. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software|basic render|softpipe|mesa offscreen/i;

/**
 * The graphics quality to start with (spec: visual-atmosphere / graphics quality levels): Low on software
 * rendering, High on a hardware renderer with plenty of cores, Medium otherwise. Never throws.
 */
export function detectQuality(): GraphicsQuality {
  // jsdom (unit tests) has no WebGL.
  if (typeof navigator === 'undefined' || navigator.userAgent.includes('jsdom')) return 'medium';
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'low';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    );
    if (SOFTWARE_RENDERER.test(renderer)) return 'low';
    return (navigator.hardwareConcurrency ?? 4) >= 8 ? 'high' : 'medium';
  } catch {
    return 'medium';
  }
}

export function isSoftwareRenderer(renderer: string): boolean {
  return SOFTWARE_RENDERER.test(renderer);
}
