import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STICK_RADIUS, TouchControls, followThumb, stickVector } from './touch-controls';

describe('stickVector (spec: phone-play / touch controls)', () => {
  it('is full speed at the rim and beyond', () => {
    expect(stickVector(STICK_RADIUS, 0, STICK_RADIUS)).toEqual({ x: 1, y: 0 });
    const far = stickVector(0, -3 * STICK_RADIUS, STICK_RADIUS);
    expect(far.x).toBeCloseTo(0);
    expect(far.y).toBeCloseTo(-1);
  });

  it('is half speed half of the way to the rim', () => {
    const v = stickVector(STICK_RADIUS / 2, 0, STICK_RADIUS);
    expect(v.x).toBeCloseTo(0.5);
  });

  it('ignores a thumb inside the dead zone', () => {
    expect(stickVector(STICK_RADIUS * 0.1, STICK_RADIUS * 0.05, STICK_RADIUS)).toEqual({
      x: 0,
      y: 0,
    });
    expect(stickVector(0, 0, STICK_RADIUS)).toEqual({ x: 0, y: 0 });
  });

  it('keeps diagonals within full speed', () => {
    const v = stickVector(100, 100, STICK_RADIUS);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });
});

describe('followThumb', () => {
  it('stays put while the thumb is inside the rim', () => {
    expect(followThumb(10, 10, 30, 10, 56)).toEqual({ x: 10, y: 10 });
  });

  it('is pulled along to the rim behind a thumb past it', () => {
    const base = followThumb(0, 0, 100, 0, 56);
    expect(base.x).toBeCloseTo(44);
    expect(base.y).toBeCloseTo(0);
  });
});

describe('TouchControls', () => {
  let parent: HTMLElement;
  let controls: TouchControls;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.append(parent);
    controls = new TouchControls(parent);
    // jsdom lays nothing out: an 800 × 400 layer at the origin.
    Object.defineProperty(controls.element, 'clientWidth', { value: 800 });
    controls.element.getBoundingClientRect = () => new DOMRect(0, 0, 800, 400);
  });

  afterEach(() => {
    controls.destroy();
    parent.remove();
  });

  function pointer(
    type: string,
    id: number,
    x: number,
    y: number,
    target: Element = controls.element,
  ): void {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
    Object.defineProperty(event, 'pointerId', { value: id });
    target.dispatchEvent(event);
  }
  const button = (name: string) =>
    controls.element.querySelector(`[data-touch=${name}]`) as HTMLElement;

  it('places the stick where the thumb lands and moves by the drag', () => {
    pointer('pointerdown', 1, 120, 300);
    const stick = controls.element.querySelector('.ou-stick') as HTMLElement;
    expect(stick.classList.contains('active')).toBe(true);
    expect(stick.style.transform).toBe(
      `translate(${120 - STICK_RADIUS}px, ${300 - STICK_RADIUS}px)`,
    );
    expect(controls.read().moveX).toBe(0);
    pointer('pointermove', 1, 120 + STICK_RADIUS, 300);
    expect(controls.read().moveX).toBeCloseTo(1);
    expect(controls.read().moveY).toBeCloseTo(0);
  });

  it('stops and hides the stick when the thumb lifts', () => {
    pointer('pointerdown', 1, 120, 300);
    pointer('pointermove', 1, 120, 300 - STICK_RADIUS);
    expect(controls.read().moveY).toBeCloseTo(-1);
    pointer('pointerup', 1, 120, 300 - STICK_RADIUS);
    expect(controls.read()).toMatchObject({ moveX: 0, moveY: 0 });
    expect(controls.element.querySelector('.ou-stick.active')).toBeNull();
  });

  it('does not start the stick on the right half', () => {
    pointer('pointerdown', 1, 600, 200);
    pointer('pointermove', 1, 700, 200);
    expect(controls.read().moveX).toBe(0);
  });

  it('latches a quick tap of dash until the simulation has stepped', () => {
    pointer('pointerdown', 2, 700, 380, button('dash'));
    pointer('pointerup', 2, 700, 380, button('dash'));
    expect(controls.read().dash).toBe(true);
    controls.consumeTaps();
    expect(controls.read().dash).toBe(false);
  });

  it('holds the ability while the button is held', () => {
    pointer('pointerdown', 2, 760, 380, button('ability'));
    controls.consumeTaps();
    expect(controls.read().ability).toBe(true);
    pointer('pointerup', 2, 760, 380);
    expect(controls.read().ability).toBe(false);
  });

  it('toggles sprint and shows it', () => {
    pointer('pointerdown', 3, 760, 260, button('sprint'));
    pointer('pointerup', 3, 760, 260);
    expect(controls.read().sprint).toBe(true);
    expect(button('sprint').classList.contains('on')).toBe(true);
    pointer('pointerdown', 3, 760, 260, button('sprint'));
    pointer('pointerup', 3, 760, 260);
    expect(controls.read().sprint).toBe(false);
    expect(button('sprint').getAttribute('aria-pressed')).toBe('false');
  });

  it('lets each finger drive only its own control', () => {
    pointer('pointerdown', 1, 120, 300);
    pointer('pointermove', 1, 120 + STICK_RADIUS, 300);
    pointer('pointerdown', 2, 700, 380, button('dash'));
    // The dash finger slides; the stick does not follow it.
    pointer('pointermove', 2, 100, 100);
    expect(controls.read()).toMatchObject({ dash: true });
    expect(controls.read().moveX).toBeCloseTo(1);
    pointer('pointerup', 2, 100, 100);
    expect(controls.read().moveX).toBeCloseTo(1);
  });

  it('lets go of everything on reset, keeping sprint', () => {
    pointer('pointerdown', 3, 760, 260, button('sprint'));
    pointer('pointerup', 3, 760, 260);
    pointer('pointerdown', 1, 120, 300);
    pointer('pointermove', 1, 120 + STICK_RADIUS, 300);
    controls.reset();
    expect(controls.read()).toEqual({
      moveX: 0,
      moveY: 0,
      ability: false,
      dash: false,
      sprint: true,
    });
  });
});
