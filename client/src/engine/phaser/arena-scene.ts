import Phaser from 'phaser';
import { SoundPlayer } from '../audio/sound-player';
import { ATTACK_SOUNDS, BOSS_ATTACK_SOUNDS, HIT_SOUNDS } from '../audio/sound-map';
import { GameEvent, GameSettings } from '../session';
import { RunDriver } from '../net/driver';
import { NO_INPUT, SimEvent } from '../sim/types';
import { queueAssets, SpriteResolver } from './assets';
import { Atmosphere, LightMap, QUALITY, viewAround } from './atmosphere';
import { Effects } from './effects';
import { GroundBuilder } from './ground-canvas';
import { InputReader } from './input';
import { Minimap } from './minimap';
import { registerTextures } from './textures';
import { WorldView } from './world-view';

/** The world area the camera shows, whatever the window size (spec: player-control / camera). */
const VIEW_WIDTH = 1440;
const VIEW_HEIGHT = 840;
/** Longest real time simulated in one frame; longer hitches are dropped, not caught up. */
const MAX_FRAME_SECONDS = 0.25;
const HUD_INTERVAL_MS = 100;
/** Time per frame spent painting the ground while loading, so the loading screen stays smooth. */
const GROUND_BUDGET_MS = 10;

export interface SceneHost {
  /** Where the run comes from: the local simulation, or a room's host (D16). */
  readonly driver: RunDriver;
  readonly settings: () => GameSettings;
  readonly emit: (event: GameEvent) => void;
  readonly sound: SoundPlayer;
  readonly backgroundColor: number;
}

/**
 * Runs a game from a `RunDriver` (D2, D16): reads input, advances the driver (the simulation in fixed steps, or a
 * room's host's world), draws the result and turns events into feedback and session events. Gameplay rules live in
 * the simulation, not here.
 */
export class ArenaScene extends Phaser.Scene {
  private input$!: InputReader;
  private view!: WorldView;
  private effects!: Effects;
  private minimap!: Minimap;
  private lightMap!: LightMap;
  private atmosphere!: Atmosphere;
  private failedAssets = new Set<string>();
  private resolver!: SpriteResolver;
  private ground!: GroundBuilder;
  /** Loading: painting the ground, building the scene, then (rooms) waiting for the party; the run waits. */
  private loading: 'realm' | 'scene' | 'party' | 'ready' = 'realm';
  private hudTimer = 0;
  private readonly onBlur = () => this.autoPause();
  private readonly onVisibility = () => {
    if (document.hidden) this.autoPause();
  };

  constructor(private readonly host: SceneHost) {
    super('arena');
  }

  preload(): void {
    // External art first (spec: asset-pipeline / loading with progress); failures fall back to code-drawn art.
    const content = this.host.driver.index.content;
    this.failedAssets = queueAssets(this, content.assets, (progress) =>
      this.host.emit({ type: 'loadProgress', progress, stage: 'art' }),
    );
  }

  create(): void {
    const { driver } = this.host;
    // Also after a gate: start loading again, without the previous realm's ground.
    this.loading = 'realm';
    this.hudTimer = 0;
    for (const key of this.textures.getTextureKeys())
      if (key.startsWith('arena-ground-')) this.textures.remove(key);
    const realm = driver.realm;
    const content = driver.index.content;
    registerTextures(this, content, [realm.map]);
    this.cameras.main.setBackgroundColor(this.host.backgroundColor);
    this.resolver = new SpriteResolver(this, content.assets, this.failedAssets);
    // The ground is painted over the next frames (spec: run-loading / progress stages); the world follows.
    this.ground = new GroundBuilder(driver.arena, realm.map, this.host.settings().quality);
    this.input$ = new InputReader(this);

    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('blur', this.onBlur);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    });
  }

  /** One loading step per frame: paint more ground, then build the scene, then start (spec: run-loading). */
  private continueLoading(): void {
    const { driver } = this.host;
    if (this.loading === 'party') {
      // Rooms: every member loads before the run starts (spec: rooms / lobby). The room's messages keep flowing.
      const dt = Math.min(this.game.loop.rawDelta / 1000, MAX_FRAME_SECONDS);
      driver.advance(dt, NO_INPUT, () => undefined);
      this.host.emit({ type: 'loadProgress', progress: driver.partyProgress, stage: 'party' });
      if (driver.started) this.start();
      return;
    }
    if (this.loading === 'realm') {
      const done = this.ground.advance(GROUND_BUDGET_MS);
      this.host.emit({ type: 'loadProgress', progress: this.ground.progress, stage: 'realm' });
      if (done) {
        this.loading = 'scene';
        // Announce the stage now; the scene is built next frame, so the screen can show it first.
        this.host.emit({ type: 'loadProgress', progress: 0, stage: 'scene' });
      }
      return;
    }
    const realm = driver.realm;
    const arena = driver.arena;
    this.view = new WorldView(this, this.resolver, arena, realm.map, this.ground.canvas);
    this.effects = new Effects(this);
    this.minimap = new Minimap(this, arena, this.ground.canvas);
    this.lightMap = new LightMap(this, realm.atmosphere.ambient);
    this.atmosphere = new Atmosphere(this, arena.width, arena.height, realm.atmosphere);
    this.applySettings(this.host.settings());

    const camera = this.cameras.main;
    camera.setBounds(0, 0, arena.width, arena.height);
    camera.roundPixels = false;
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.host.emit({ type: 'loadProgress', progress: 1, stage: 'scene' });
    driver.markLoaded();
    if (driver.started) this.start();
    else this.loading = 'party';
  }

  private start(): void {
    const focus = this.host.driver.focus();
    this.cameras.main.centerOn(focus.x, focus.y);
    this.loading = 'ready';
    this.host.emit({ type: 'ready' });
    this.emitHud();
  }

  private emitHud(): void {
    const hud = this.host.driver.hud();
    if (hud) this.host.emit({ type: 'hud', hud });
  }

  /** Settings apply live, including graphics quality (spec: visual-atmosphere / graphics quality levels). */
  applySettings(settings: GameSettings): void {
    if (this.loading !== 'ready' && !this.view) return; // applied when the scene is built
    const profile = QUALITY[settings.quality];
    this.effects.damageNumbers = settings.damageNumbers;
    this.effects.enemyHealthBars = settings.enemyHealthBars;
    this.effects.particleScale = profile.particles;
    this.view.setQuality(profile);
    this.lightMap.setQuality(profile);
    this.atmosphere.setQuality(profile);
  }

  override update(): void {
    const { driver } = this.host;
    if (this.loading !== 'ready') {
      this.continueLoading();
      return;
    }
    // Real elapsed time, not Phaser's smoothed delta: Phaser clamps the delta to one 60 fps frame while the page
    // lacks focus and for its first frames, which would run the game in slow motion below 60 fps (D5: the
    // simulation must follow real time through fixed steps).
    const dt = Math.min(this.game.loop.rawDelta / 1000, MAX_FRAME_SECONDS);

    if (this.input$.takePauseRequest()) {
      if (driver.paused) {
        this.host.emit({ type: 'uiInput', input: 'pause' });
      } else if (driver.phase === 'playing' || driver.phase === 'choosing') {
        if (driver.pause()) this.host.emit({ type: 'paused' });
      }
    }

    driver.advance(dt, this.input$.player(), () => this.input$.consumeTaps());
    if (driver.paused || driver.phase !== 'playing')
      for (const ui of this.input$.uiInputs()) this.host.emit({ type: 'uiInput', input: ui });

    for (const event of driver.events()) this.handle(event);

    const alpha = driver.alpha;
    const camera = this.cameras.main;
    const time = this.time.now;
    const world = driver.world;
    this.view.sync(world, alpha, time, this.lightMap);
    this.view.addArenaLights(this.lightMap, time);
    const focus = driver.focus();
    camera.centerOn(focus.x, focus.y);
    // Sounds are heard from the view (spec: hud / sound feedback).
    this.host.sound.setListener(focus.x, focus.y, camera.worldView.width / 2);
    const { width, height } = driver.arena;
    const view = viewAround(camera, focus.x, focus.y, width, height);
    this.effects.update(world, driver.phase === 'playing' ? dt : 0, camera, this.lightMap);
    this.minimap.update(world, driver.localId, camera, this.game.loop.delta);
    this.atmosphere.update(camera, view, dt);
    this.lightMap.render(view);

    this.hudTimer += this.game.loop.rawDelta;
    if (this.hudTimer >= HUD_INTERVAL_MS) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  private handle(event: SimEvent): void {
    const { sound, emit, driver } = this.host;
    this.effects.handle(event);
    switch (event.type) {
      case 'hit':
        sound.play(event.crit ? 'crit' : HIT_SOUNDS[event.element], event);
        return;
      case 'kill':
        sound.play(event.boss ? 'killBoss' : event.elite ? 'killElite' : 'kill', event);
        if (event.boss) this.shake(600, 0.012);
        return;
      case 'playerHurt':
        // Only this player's own wounds hurt on this screen (spec: rooms).
        if (event.playerId !== driver.localId) return;
        sound.play('hurt');
        this.shake(120, 0.004);
        return;
      case 'playerRevived':
        sound.play('revive', event);
        return;
      case 'dash':
        sound.play('whoosh', event);
        return;
      case 'pickup':
        sound.play(event.kind === 'xp' ? 'xp' : event.kind, event);
        return;
      case 'attack': {
        const cue =
          ATTACK_SOUNDS[event.weaponId] ?? (event.behavior === 'strike' ? 'strike' : undefined);
        if (cue) sound.play(cue, event);
        if (event.behavior === 'strike') this.shake(100, 0.003);
        return;
      }
      case 'enemyShot':
        sound.play('enemyShot', event);
        return;
      case 'enemyCharge': {
        const enemy = driver.world.enemies.find((e) => e.id === event.enemyId);
        sound.play('charge', enemy);
        return;
      }
      case 'levelUp': {
        // The level is shared: every living god glows.
        for (const p of driver.world.players) if (p.alive) this.effects.levelUpBurst(p.x, p.y);
        sound.play('levelUp');
        return;
      }
      case 'choice':
        emit({ type: 'choice', choice: event.choice });
        return;
      case 'choiceResolved':
        sound.play('choose');
        emit({ type: 'choiceResolved', offer: event.offer, playerId: event.playerId });
        this.emitHud();
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
        sound.play(BOSS_ATTACK_SOUNDS[event.kind], driver.world.boss);
        return;
      case 'hazardResolved':
        if (event.shape === 'circle') {
          sound.play('impact', event);
          this.shake(180, 0.006);
        } else sound.play('whoosh', event);
        return;
      case 'gateOpened':
        sound.play('gate');
        return;
      case 'realmEntered':
        sound.play('realm');
        // A new realm: the scene builds it from scratch through the same loading stages (spec: endless-run).
        emit({ type: 'realmEntered', realmId: event.realmId, depth: event.depth });
        this.scene.restart();
        return;
      case 'runEnded':
        sound.play('defeat');
        this.emitHud();
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
    if (this.loading !== 'ready') return; // nothing to pause yet; the run starts when loading ends
    // A room's run goes on without this window (spec: rooms / pausing in a room).
    if (this.host.driver.shared) return;
    if (this.host.driver.pause()) this.host.emit({ type: 'paused' });
  }

  private fitCamera(): void {
    const camera = this.cameras.main;
    const { width, height } = this.scale.gameSize;
    const zoom = Math.max(0.35, Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT));
    camera.setZoom(zoom);
    this.lightMap?.resize();
    this.host.driver.setView(width / zoom / 2, height / zoom / 2);
  }
}
