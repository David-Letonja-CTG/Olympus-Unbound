import Phaser from 'phaser';
import { SoundCue, SoundPlayer } from '../audio/sound-player';
import { GameEvent, GameSettings } from '../session';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { SimEvent } from '../sim/types';
import { Effects } from './effects';
import { InputReader } from './input';
import { registerTextures } from './textures';
import { WorldView } from './world-view';

/** The world area the camera shows, whatever the window size (spec: player-control / camera). */
const VIEW_WIDTH = 1440;
const VIEW_HEIGHT = 840;
/** Longest real time simulated in one frame; longer hitches are dropped, not caught up. */
const MAX_FRAME_SECONDS = 0.25;
const HUD_INTERVAL_MS = 100;

const ATTACK_SOUNDS: Record<string, SoundCue> = {
  thunder_spear: 'spear',
  divine_bow: 'bow',
  trident: 'bow',
  war_hammer: 'hammer',
  flaming_sword: 'sword',
  thunderbolt: 'bolt',
  soul_scythe: 'scythe',
};

export interface SceneHost {
  readonly sim: RunSimulation;
  readonly settings: () => GameSettings;
  readonly emit: (event: GameEvent) => void;
  readonly sound: SoundPlayer;
  readonly backgroundColor: number;
}

/**
 * Hosts a `RunSimulation` (D2): reads input, advances the simulation in fixed steps, draws the result and turns
 * simulation events into feedback and session events. Gameplay rules live in the simulation, not here.
 */
export class ArenaScene extends Phaser.Scene {
  private input$!: InputReader;
  private view!: WorldView;
  private effects!: Effects;
  private accumulator = 0;
  private hudTimer = 0;
  private readonly onBlur = () => this.autoPause();
  private readonly onVisibility = () => {
    if (document.hidden) this.autoPause();
  };

  constructor(private readonly host: SceneHost) {
    super('arena');
  }

  create(): void {
    const { sim } = this.host;
    const realm = sim.state.realm;
    registerTextures(this, sim.state.index.content, realm.map);
    this.cameras.main.setBackgroundColor(this.host.backgroundColor);
    this.view = new WorldView(this, sim.arena, realm.map);
    this.effects = new Effects(this);
    this.effects.damageNumbers = this.host.settings().damageNumbers;
    this.input$ = new InputReader(this);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, sim.arena.width, sim.arena.height);
    camera.roundPixels = false;
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    const p = sim.state.players[0];
    camera.centerOn(p.x, p.y);

    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('blur', this.onBlur);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    });

    this.host.emit({ type: 'ready' });
    this.host.emit({ type: 'hud', hud: sim.hud() });
  }

  applySettings(settings: GameSettings): void {
    this.effects.damageNumbers = settings.damageNumbers;
  }

  override update(_time: number, deltaMs: number): void {
    const { sim } = this.host;
    const dt = Math.min(deltaMs / 1000, MAX_FRAME_SECONDS);

    if (this.input$.takePauseRequest()) {
      if (sim.phase === 'playing' || sim.phase === 'choosing') {
        if (sim.pause()) this.host.emit({ type: 'paused' });
      } else if (sim.phase === 'paused') {
        this.host.emit({ type: 'uiInput', input: 'pause' });
      }
    }

    if (sim.phase === 'playing') {
      const input = this.input$.player();
      this.accumulator += dt;
      while (this.accumulator >= STEP && sim.phase === 'playing') {
        sim.step(STEP, [input]);
        this.accumulator -= STEP;
      }
    } else {
      this.accumulator = 0;
      for (const ui of this.input$.uiInputs()) this.host.emit({ type: 'uiInput', input: ui });
    }

    for (const event of sim.events()) this.handle(event);

    const alpha = sim.phase === 'playing' ? this.accumulator / STEP : 1;
    this.view.sync(sim.state, alpha, this.time.now);
    const focus = sim.state.players[0];
    this.cameras.main.centerOn(
      focus.px + (focus.x - focus.px) * alpha,
      focus.py + (focus.y - focus.py) * alpha,
    );
    this.effects.update(sim.state, sim.phase === 'playing' ? dt : 0, this.cameras.main);

    this.hudTimer += deltaMs;
    if (this.hudTimer >= HUD_INTERVAL_MS) {
      this.hudTimer = 0;
      this.host.emit({ type: 'hud', hud: sim.hud() });
    }
  }

  private handle(event: SimEvent): void {
    const { sound, emit, sim } = this.host;
    this.effects.handle(event);
    switch (event.type) {
      case 'hit':
        sound.play(event.crit ? 'crit' : 'hit');
        return;
      case 'kill':
        sound.play('kill');
        if (event.boss) this.shake(600, 0.012);
        return;
      case 'playerHurt':
        sound.play('hurt');
        this.shake(120, 0.004);
        return;
      case 'playerRevived':
        sound.play('synergy');
        return;
      case 'pickup':
        sound.play(event.kind === 'xp' ? 'xp' : event.kind);
        return;
      case 'attack': {
        const cue = event.behavior === 'strike' ? 'strike' : ATTACK_SOUNDS[event.weaponId];
        if (cue) sound.play(cue);
        if (event.behavior === 'strike') this.shake(100, 0.003);
        return;
      }
      case 'enemyShot':
        sound.play('enemyShot');
        return;
      case 'enemyCharge':
        sound.play('charge');
        return;
      case 'levelUp': {
        const p = sim.state.players[0];
        this.effects.levelUpBurst(p.x, p.y);
        sound.play('levelUp');
        return;
      }
      case 'choice':
        emit({ type: 'choice', choice: event.choice });
        return;
      case 'choiceResolved':
        sound.play('choose');
        emit({ type: 'choiceResolved', offer: event.offer });
        emit({ type: 'hud', hud: sim.hud() });
        return;
      case 'synergy':
        sound.play('synergy');
        return;
      case 'announcement':
        if (event.kind === 'elite') sound.play('elite');
        emit({ type: 'announcement', text: event.text, kind: event.kind });
        return;
      case 'bossSpawned':
        sound.play('bossRoar');
        this.shake(700, 0.008);
        return;
      case 'bossAttack':
        sound.play(event.kind === 'charge' ? 'charge' : 'telegraph');
        return;
      case 'hazardResolved':
        if (event.shape === 'circle') {
          sound.play('impact');
          this.shake(180, 0.006);
        }
        return;
      case 'runEnded':
        sound.play(event.result.outcome === 'victory' ? 'victory' : 'defeat');
        emit({ type: 'hud', hud: sim.hud() });
        emit({ type: 'runEnded', result: event.result });
        return;
      default:
        return;
    }
  }

  private shake(duration: number, intensity: number): void {
    if (this.host.settings().screenShake) this.cameras.main.shake(duration, intensity);
  }

  private autoPause(): void {
    this.input$?.reset();
    if (this.host.sim.pause()) this.host.emit({ type: 'paused' });
  }

  private fitCamera(): void {
    const camera = this.cameras.main;
    const { width, height } = this.scale.gameSize;
    const zoom = Math.max(0.35, Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT));
    camera.setZoom(zoom);
    this.host.sim.setView(width / zoom / 2, height / zoom / 2);
  }
}
