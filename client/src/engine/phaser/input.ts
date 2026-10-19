import Phaser from 'phaser';
import { UiInput } from '../session';
import { PlayerInput } from '../sim/types';

const STICK_UI_THRESHOLD = 0.6;

/**
 * Reads keyboard and gamepad into device-independent intents: `PlayerInput` for gameplay and `UiInput` edges for
 * menus (gamepad only — Angular handles the keyboard in its own dialogs, design §4).
 */
export class InputReader {
  private readonly keys: Record<
    'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space' | 'shift' | 'e',
    Phaser.Input.Keyboard.Key
  >;
  private readonly previous = new Map<UiInput, boolean>();
  private pauseRequested = false;
  /** A tap of the ability key between two frames still counts (it may be shorter than a frame at low fps). */
  private abilityTapped = false;
  private dashTapped = false;

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
    const K = Phaser.Input.Keyboard.KeyCodes;
    // No capture: arrows, Space and Enter keep working in the Angular dialogs over the game.
    const add = (code: number) => keyboard.addKey(code, false);
    this.keys = {
      up: add(K.UP),
      down: add(K.DOWN),
      left: add(K.LEFT),
      right: add(K.RIGHT),
      w: add(K.W),
      a: add(K.A),
      s: add(K.S),
      d: add(K.D),
      space: add(K.SPACE),
      shift: add(K.SHIFT),
      e: add(K.E),
    };
    keyboard.clearCaptures();
    const requestPause = (event: KeyboardEvent) => {
      // Angular marks the event when an open menu already handled it (e.g. Escape closing the pause menu).
      if (!event.defaultPrevented) this.pauseRequested = true;
    };
    // Shift sprints and E dashes (spec: player-control / stamina, sprint and dash); Space is the ability alone.
    keyboard.on('keydown-SPACE', () => (this.abilityTapped = true));
    keyboard.on('keydown-E', () => (this.dashTapped = true));
    keyboard.on('keydown-ESC', requestPause);
    keyboard.on('keydown-P', requestPause);
  }

  /** The current gameplay intent of player 1 (keyboard and the first gamepad combined). */
  player(): PlayerInput {
    const k = this.keys;
    let x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    let y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    let ability = k.space.isDown || this.abilityTapped;
    let sprint = k.shift.isDown;
    let dash = k.e.isDown || this.dashTapped;
    const pad = this.pad();
    if (pad) {
      const stickX = pad.leftStick.x;
      const stickY = pad.leftStick.y;
      if (Math.hypot(stickX, stickY) > Math.hypot(x, y) * 0.5) {
        x = stickX;
        y = stickY;
      }
      if (pad.left) x = -1;
      if (pad.right) x = 1;
      if (pad.up) y = -1;
      if (pad.down) y = 1;
      ability ||= pad.A || pad.R2 > 0.5;
      sprint ||= pad.L1 > 0.5 || pad.L2 > 0.5;
      dash ||= pad.B;
    }
    return { moveX: x, moveY: y, ability, sprint, dash };
  }

  /** The simulation has stepped with the current input: latched taps are used up. */
  consumeTaps(): void {
    this.abilityTapped = false;
    this.dashTapped = false;
  }

  /** True once per key/button press of pause (Escape, P, gamepad Start). */
  takePauseRequest(): boolean {
    const start = this.edge('pause', !!this.pad()?.buttons[9]?.pressed);
    const requested = this.pauseRequested || start;
    this.pauseRequested = false;
    return requested;
  }

  /** Gamepad menu inputs pressed since the last call. */
  uiInputs(): UiInput[] {
    const pad = this.pad();
    if (!pad) return [];
    const result: UiInput[] = [];
    const check = (input: UiInput, down: boolean) => {
      if (this.edge(input, down)) result.push(input);
    };
    check('up', pad.up || pad.leftStick.y < -STICK_UI_THRESHOLD);
    check('down', pad.down || pad.leftStick.y > STICK_UI_THRESHOLD);
    check('left', pad.left || pad.leftStick.x < -STICK_UI_THRESHOLD);
    check('right', pad.right || pad.leftStick.x > STICK_UI_THRESHOLD);
    check('confirm', pad.A);
    check('back', pad.B);
    return result;
  }

  /** Forget held keys (e.g. after the window lost focus). */
  reset(): void {
    for (const key of Object.values(this.keys)) key.reset();
    this.pauseRequested = false;
    this.abilityTapped = false;
    this.dashTapped = false;
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | undefined {
    const plugin = this.scene.input.gamepad;
    if (!plugin || plugin.total === 0) return undefined;
    return plugin.getAll().find((p) => p.connected);
  }

  private edge(input: UiInput, down: boolean): boolean {
    const was = this.previous.get(input) ?? false;
    this.previous.set(input, down);
    return down && !was;
  }
}
