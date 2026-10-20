import { DEAD_ZONE } from '../sim/movement';

/** What the thumbs ask for this step (spec: phone-play / touch controls). */
export interface TouchState {
  readonly moveX: number;
  readonly moveY: number;
  readonly ability: boolean;
  readonly dash: boolean;
  readonly sprint: boolean;
}

/** The stick's reach in CSS pixels: a full drag to the rim is full speed. */
export const STICK_RADIUS = 56;

/**
 * The stick's move for a thumb `dx, dy` from the base: the share of the radius, at most 1, and nothing inside the
 * simulation's dead zone (spec: phone-play / touch controls — half a drag is half speed).
 */
export function stickVector(dx: number, dy: number, radius: number): { x: number; y: number } {
  const length = Math.hypot(dx, dy);
  if (length === 0 || length < DEAD_ZONE * radius) return { x: 0, y: 0 };
  const scale = Math.min(1, length / radius) / length;
  return { x: dx * scale, y: dy * scale };
}

/** Where the base goes when the thumb is past the rim: dragged along behind it, so turning back is quick. */
export function followThumb(
  baseX: number,
  baseY: number,
  x: number,
  y: number,
  radius: number,
): { x: number; y: number } {
  const dx = x - baseX;
  const dy = y - baseY;
  const length = Math.hypot(dx, dy);
  if (length <= radius) return { x: baseX, y: baseY };
  const pull = (length - radius) / length;
  return { x: baseX + dx * pull, y: baseY + dy * pull };
}

type Button = 'ability' | 'dash' | 'sprint';
type Binding = { readonly kind: 'stick' } | { readonly kind: 'button'; readonly button: Button };

const ICONS: Record<Button, string> = {
  // A burst of divine power.
  ability:
    '<path d="M12 1.5l2.2 6.6 6.9-1.9-4.6 5.3 4.6 5.3-6.9-1.9L12 22.5l-2.2-6.6-6.9 1.9 4.6-5.3-4.6-5.3 6.9 1.9z"/>',
  // A swift side-step.
  dash: '<path d="M3 6l7 6-7 6zM11 6l7 6-7 6z"/><rect x="19" y="5" width="2.5" height="14" rx="1"/>',
  // A winged sandal's wing.
  sprint:
    '<path d="M2 17c4-1 8-1 12 0l7-9c-3 0-6 1-8 3 0-2 1-4 3-6-3 1-5 3-6 5 0-2 0-3 1-5-3 2-4 4-4 7-2 1-4 3-5 5z"/>',
};
const LABELS: Record<Button, string> = { ability: 'Power', dash: 'Dash', sprint: 'Sprint' };

/**
 * The touch controls of a run on a phone (spec: phone-play / touch controls; design: where touch is read): a stick that
 * appears under the left thumb and buttons on the right, as a DOM layer over the game's canvas. Each finger drives only
 * the control it first touched. Taps are latched until the simulation has stepped, like keys (`InputReader`).
 * Drawing follows the pointer events; nothing runs per frame. Imports no Phaser, so it is tested in jsdom.
 */
export class TouchControls {
  readonly element: HTMLElement;
  private readonly stick: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly buttons = new Map<Button, HTMLElement>();
  private readonly bindings = new Map<number, Binding>();
  /** The stick's base and the thumb, in the layer's pixels, while a thumb holds it. */
  private base = { x: 0, y: 0 };
  private move = { x: 0, y: 0 };
  private readonly held = new Set<Button>();
  private readonly tapped = new Set<Button>();
  private sprintOn = false;

  constructor(parent: HTMLElement) {
    ensureStyles(parent.ownerDocument);
    const doc = parent.ownerDocument;
    this.element = doc.createElement('div');
    this.element.className = 'ou-touch';
    this.element.dataset['testid'] = 'touch-controls';
    this.hint = doc.createElement('div');
    this.hint.className = 'ou-stick-hint';
    this.hint.setAttribute('aria-hidden', 'true');
    this.stick = doc.createElement('div');
    this.stick.className = 'ou-stick';
    this.stick.dataset['testid'] = 'touch-stick';
    this.knob = doc.createElement('div');
    this.knob.className = 'ou-knob';
    this.stick.append(this.knob);
    this.element.append(this.hint, this.stick);
    for (const button of ['sprint', 'dash', 'ability'] as const) {
      const el = doc.createElement('div');
      el.className = `ou-btn ou-${button}`;
      el.dataset['touch'] = button;
      el.dataset['testid'] = `touch-${button}`;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', LABELS[button]);
      el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[button]}</svg><span>${LABELS[button]}</span>`;
      this.buttons.set(button, el);
      this.element.append(el);
    }
    this.element.addEventListener('pointerdown', this.onDown);
    this.element.addEventListener('pointermove', this.onMove);
    this.element.addEventListener('pointerup', this.onUp);
    this.element.addEventListener('pointercancel', this.onUp);
    this.element.addEventListener('lostpointercapture', this.onUp);
    parent.append(this.element);
  }

  read(): TouchState {
    return {
      moveX: this.move.x,
      moveY: this.move.y,
      ability: this.held.has('ability') || this.tapped.has('ability'),
      dash: this.held.has('dash') || this.tapped.has('dash'),
      sprint: this.sprintOn,
    };
  }

  /** The simulation has stepped with the current input: latched taps are used up. */
  consumeTaps(): void {
    this.tapped.clear();
  }

  /** Let go of everything (the window lost focus); sprint stays as the player set it. */
  reset(): void {
    for (const id of [...this.bindings.keys()]) this.release(id);
    this.tapped.clear();
  }

  destroy(): void {
    this.element.remove();
  }

  private readonly onDown = (event: PointerEvent) => {
    event.preventDefault();
    const local = this.local(event);
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-touch]');
    const button = target?.dataset['touch'] as Button | undefined;
    if (button) {
      this.bind(event, { kind: 'button', button });
      target?.classList.add('pressed');
      if (button === 'sprint') {
        this.sprintOn = !this.sprintOn;
        target?.classList.toggle('on', this.sprintOn);
        target?.setAttribute('aria-pressed', String(this.sprintOn));
      } else {
        this.held.add(button);
        this.tapped.add(button);
      }
      return;
    }
    // The stick: one thumb on the left half; a second thumb there is ignored.
    if (local.x > this.element.clientWidth / 2 && this.element.clientWidth > 0) return;
    if ([...this.bindings.values()].some((b) => b.kind === 'stick')) return;
    this.bind(event, { kind: 'stick' });
    this.base = local;
    this.move = { x: 0, y: 0 };
    this.element.classList.add('ou-used');
    this.stick.classList.add('active');
    this.draw(local);
  };

  private readonly onMove = (event: PointerEvent) => {
    if (this.bindings.get(event.pointerId)?.kind !== 'stick') return;
    event.preventDefault();
    const thumb = this.local(event);
    this.base = followThumb(this.base.x, this.base.y, thumb.x, thumb.y, STICK_RADIUS);
    this.move = stickVector(thumb.x - this.base.x, thumb.y - this.base.y, STICK_RADIUS);
    this.draw(thumb);
  };

  private readonly onUp = (event: PointerEvent) => this.release(event.pointerId);

  private bind(event: PointerEvent, binding: Binding): void {
    this.bindings.set(event.pointerId, binding);
    try {
      this.element.setPointerCapture(event.pointerId);
    } catch {
      // A synthetic or already-ended pointer cannot be captured; its events still reach the layer.
    }
  }

  private release(pointerId: number): void {
    const binding = this.bindings.get(pointerId);
    if (!binding) return;
    this.bindings.delete(pointerId);
    if (binding.kind === 'stick') {
      this.move = { x: 0, y: 0 };
      this.stick.classList.remove('active');
      return;
    }
    this.held.delete(binding.button);
    this.buttons.get(binding.button)?.classList.remove('pressed');
  }

  private local(event: PointerEvent): { x: number; y: number } {
    const rect = this.element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private draw(thumb: { x: number; y: number }): void {
    this.stick.style.transform = `translate(${this.base.x - STICK_RADIUS}px, ${this.base.y - STICK_RADIUS}px)`;
    const dx = thumb.x - this.base.x;
    const dy = thumb.y - this.base.y;
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
}

/** The controls' look: bronze rings and gold glyphs, like the HUD (docs/art-direction.md). Added once per page. */
function ensureStyles(doc: Document): void {
  if (doc.getElementById('ou-touch-style')) return;
  const style = doc.createElement('style');
  style.id = 'ou-touch-style';
  style.textContent = `
.ou-touch {
  position: absolute; inset: 0; z-index: 1; touch-action: none; user-select: none;
  -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
  --ou-right: calc(18px + env(safe-area-inset-right, 0px));
  --ou-bottom: calc(18px + env(safe-area-inset-bottom, 0px));
}
.ou-stick, .ou-stick-hint {
  position: absolute; left: 0; top: 0; width: ${STICK_RADIUS * 2}px; height: ${STICK_RADIUS * 2}px;
  border-radius: 50%; pointer-events: none; box-sizing: border-box;
  border: 2px solid rgba(214, 170, 92, 0.75);
  background: radial-gradient(circle, rgba(20, 14, 8, 0.15) 40%, rgba(20, 14, 8, 0.45) 100%);
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.35), inset 0 0 18px rgba(255, 210, 120, 0.18);
}
.ou-stick { display: none; }
.ou-stick.active { display: block; }
.ou-stick-hint {
  left: calc(48px + env(safe-area-inset-left, 0px)); top: auto;
  bottom: calc(48px + env(safe-area-inset-bottom, 0px)); opacity: 0.35;
}
.ou-touch.ou-used .ou-stick-hint { display: none; }
.ou-knob {
  position: absolute; left: ${STICK_RADIUS - 24}px; top: ${STICK_RADIUS - 24}px; width: 48px; height: 48px;
  border-radius: 50%; border: 2px solid #f0cf86;
  background: radial-gradient(circle at 35% 30%, #f6dc9a, #a8742c 55%, #4a2f12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}
.ou-btn {
  position: absolute; display: grid; place-items: center; align-content: center; gap: 0;
  border-radius: 50%; box-sizing: border-box; color: #f3d892;
  border: 2px solid rgba(214, 170, 92, 0.85);
  background: radial-gradient(circle at 50% 35%, rgba(70, 48, 22, 0.8), rgba(14, 10, 8, 0.82) 70%);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(0, 0, 0, 0.6);
  font: 600 10px/1 var(--serif, Georgia, serif); letter-spacing: 0.08em; text-transform: uppercase;
  text-shadow: 0 1px 0 #000;
}
.ou-btn svg { width: 46%; height: 46%; fill: currentColor; filter: drop-shadow(0 1px 1px #000); }
.ou-btn span { margin-top: 2px; }
.ou-btn.pressed { transform: scale(0.94); background: radial-gradient(circle, rgba(140, 100, 40, 0.9), rgba(30, 20, 10, 0.9)); }
.ou-ability { width: 84px; height: 84px; right: var(--ou-right); bottom: var(--ou-bottom); }
.ou-dash { width: 64px; height: 64px; right: calc(var(--ou-right) + 98px); bottom: var(--ou-bottom); }
.ou-sprint { width: 56px; height: 56px; right: calc(var(--ou-right) + 14px); bottom: calc(var(--ou-bottom) + 98px); }
.ou-sprint.on { color: #1b1206; background: radial-gradient(circle at 50% 35%, #ffe7a6, #c99434 70%); border-color: #fff1c4; }
`;
  doc.head.append(style);
}
