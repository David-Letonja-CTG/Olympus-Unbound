import Phaser from 'phaser';
import { ControlScheme, UiInput } from '../session';
import { PlayerInput } from '../sim/types';
import { TouchControls } from './touch-controls';

const STICK_UI_THRESHOLD = 0.6;

/** The keys of one keyboard scheme, by `KeyboardEvent.code` (so the left and right Shift differ). */
interface KeyMap {
  readonly up: readonly string[];
  readonly down: readonly string[];
  readonly left: readonly string[];
  readonly right: readonly string[];
  readonly ability: readonly string[];
  readonly sprint: readonly string[];
  readonly dash: readonly string[];
}

/** Spec: player-control / controls per local player. */
const KEYS_LEFT: KeyMap = {
  up: ['KeyW'],
  down: ['KeyS'],
  left: ['KeyA'],
  right: ['KeyD'],
  ability: ['Space'],
  sprint: ['ShiftLeft'],
  dash: ['KeyE'],
};
const KEYS_RIGHT: KeyMap = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  ability: ['Enter', 'NumpadEnter', 'Numpad0'],
  sprint: ['ShiftRight'],
  dash: ['ControlRight', 'Numpad1'],
};
/** A player alone: both sides of the keyboard, as before local co-op. */
const KEYS_ALL: KeyMap = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  ability: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  dash: ['KeyE'],
};

const PADS: Partial<Record<ControlScheme, number>> = {
  'pad-1': 0,
  'pad-2': 1,
  'pad-3': 2,
  'pad-4': 3,
};

/**
 * Reads keyboard and gamepads into device-independent intents: one `PlayerInput` per local player's controls for
 * gameplay, and `UiInput` edges for menus (gamepads only — Angular handles the keyboard in its own dialogs, design §4).
 * Keys are read from window events by code; nothing is captured, so arrows, Space and Enter keep working in the
 * Angular dialogs over the game.
 */
export class InputReader {
  private readonly held = new Set<string>();
  /** Pressed since the last step: a tap shorter than a frame still counts (it may be, at low fps). */
  private readonly tapped = new Set<string>();
  private readonly previous = new Map<string, boolean>();
  private pauseRequested = false;
  /** The thumbs' controls of a run on a touch device (spec: phone-play / touch controls). */
  private readonly touch: TouchControls | undefined;
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!event.repeat) this.tapped.add(event.code);
    this.held.add(event.code);
    // Angular marks the event when an open menu already handled it (e.g. Escape closing the pause menu).
    if ((event.code === 'Escape' || event.code === 'KeyP') && !event.defaultPrevented)
      this.pauseRequested = true;
  };
  private readonly onKeyUp = (event: KeyboardEvent) => this.held.delete(event.code);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly controls: readonly ControlScheme[] = ['keyboard'],
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    const parent = scene.game.canvas?.parentElement;
    if (controls.includes('touch') && parent) this.touch = new TouchControls(parent);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** The current gameplay intent of every local player, in seat order. */
  players(): PlayerInput[] {
    return this.controls.map((scheme) => this.read(scheme));
  }

  private read(scheme: ControlScheme): PlayerInput {
    if (scheme in PADS) return fromPad(this.pads()[PADS[scheme] ?? 0]);
    const keys =
      scheme === 'keys-left' ? KEYS_LEFT : scheme === 'keys-right' ? KEYS_RIGHT : KEYS_ALL;
    const down = (codes: readonly string[]) => codes.some((c) => this.held.has(c));
    const pressed = (codes: readonly string[]) =>
      codes.some((c) => this.held.has(c) || this.tapped.has(c));
    let x = (down(keys.right) ? 1 : 0) - (down(keys.left) ? 1 : 0);
    let y = (down(keys.down) ? 1 : 0) - (down(keys.up) ? 1 : 0);
    let ability = pressed(keys.ability);
    let sprint = down(keys.sprint);
    let dash = pressed(keys.dash);
    // A player alone also has the first gamepad, and on a touch device the touch controls.
    const alone = scheme === 'keyboard' || scheme === 'touch';
    const pad = alone ? this.pads()[0] : undefined;
    const others = [pad && fromPad(pad), scheme === 'touch' ? this.touch?.read() : undefined];
    for (const p of others) {
      if (!p) continue;
      if (Math.hypot(p.moveX, p.moveY) > Math.hypot(x, y) * 0.5) {
        x = p.moveX;
        y = p.moveY;
      }
      ability ||= p.ability;
      sprint ||= !!p.sprint;
      dash ||= !!p.dash;
    }
    return { moveX: x, moveY: y, ability, sprint, dash };
  }

  /** What the touch buttons show of the HUD: the ability's cooldown and whether a dash is affordable. */
  showHud(abilityRemaining: number, abilityCooldown: number, dashReady: boolean): void {
    this.touch?.showHud(abilityRemaining, abilityCooldown, dashReady);
  }

  /** The simulation has stepped with the current input: latched taps are used up. */
  consumeTaps(): void {
    this.tapped.clear();
    this.touch?.consumeTaps();
  }

  /** True once per key/button press of pause (Escape, P, any gamepad's Start). */
  takePauseRequest(): boolean {
    const start = this.pads().some((pad, i) => this.edge(`pause${i}`, !!pad.buttons[9]?.pressed));
    const requested = this.pauseRequested || start;
    this.pauseRequested = false;
    return requested;
  }

  /** Menu inputs from any gamepad pressed since the last call (any player may answer the shown menu). */
  uiInputs(): UiInput[] {
    const result: UiInput[] = [];
    this.pads().forEach((pad, i) => {
      const check = (input: UiInput, down: boolean) => {
        if (this.edge(`${input}${i}`, down) && !result.includes(input)) result.push(input);
      };
      check('up', pad.up || pad.leftStick.y < -STICK_UI_THRESHOLD);
      check('down', pad.down || pad.leftStick.y > STICK_UI_THRESHOLD);
      check('left', pad.left || pad.leftStick.x < -STICK_UI_THRESHOLD);
      check('right', pad.right || pad.leftStick.x > STICK_UI_THRESHOLD);
      check('confirm', pad.A);
      check('back', pad.B);
    });
    return result;
  }

  /** Forget held keys (e.g. after the window lost focus). */
  reset(): void {
    this.held.clear();
    this.tapped.clear();
    this.pauseRequested = false;
    this.touch?.reset();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.touch?.destroy();
  }

  /** Connected gamepads in the order the browser numbers them. */
  private pads(): Phaser.Input.Gamepad.Gamepad[] {
    const plugin = this.scene.input.gamepad;
    if (!plugin || plugin.total === 0) return [];
    return plugin.getAll().filter((p) => p?.connected);
  }

  private edge(key: string, down: boolean): boolean {
    const was = this.previous.get(key) ?? false;
    this.previous.set(key, down);
    return down && !was;
  }
}

function fromPad(pad: Phaser.Input.Gamepad.Gamepad | undefined): PlayerInput {
  if (!pad) return { moveX: 0, moveY: 0, ability: false, sprint: false, dash: false };
  let x = pad.leftStick.x;
  let y = pad.leftStick.y;
  if (pad.left) x = -1;
  if (pad.right) x = 1;
  if (pad.up) y = -1;
  if (pad.down) y = 1;
  return {
    moveX: x,
    moveY: y,
    ability: pad.A || pad.R2 > 0.5,
    sprint: pad.L1 > 0.5 || pad.L2 > 0.5,
    dash: pad.B,
  };
}
