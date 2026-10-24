import Phaser from 'phaser';
import { musicIntensity, NEAR, TierTracker } from '../audio/music-intensity';
import { MusicPlayer } from '../audio/music-player';
import { SoundPlayer } from '../audio/sound-player';
import { ATTACK_SOUNDS, BOSS_ATTACK_SOUNDS, HIT_SOUNDS } from '../audio/sound-map';
import { ControlScheme, GameEvent, GameSettings } from '../session';
import { RunDriver } from '../net/driver';
import { SHARED_MARGIN, SHARED_ZOOM_OUT } from '../sim/shared-screen';
import { HudSnapshot, SimEvent } from '../sim/types';
import { queueAssets, SpriteResolver } from './assets';
import { Atmosphere, LightMap, QUALITY, viewAround } from './atmosphere';
import { Effects } from './effects';
import { GroundBuilder } from './ground-canvas';
import { InputReader } from './input';
import { CORNER_MINIMAP_TOP, Minimap } from './minimap';
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
  /** The controls of each player at this screen, in seat order. */
  readonly controls: readonly ControlScheme[];
  readonly settings: () => GameSettings;
  readonly emit: (event: GameEvent) => void;
  readonly sound: SoundPlayer;
  /** The battle music and the tier it follows; kept by the session, so they carry on across realms (spec: music). */
  readonly music: { readonly player: MusicPlayer; readonly tracker: TierTracker };
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
  /** The usual zoom for the window, and the share of it a shared screen zooms out to. */
  private baseZoom = 1;
  private partyZoom = 1;
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
    this.input$ = new InputReader(this, this.host.controls);

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
      driver.advance(dt, [], () => undefined);
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
    // Three or four players at one screen have a plaque in every corner; the map moves below the top-right one.
    if (this.host.controls.length >= 3) this.minimap.top = CORNER_MINIMAP_TOP;
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

  /** Player 1's HUD, and every local player's on a shared screen (spec: hud / local players on the HUD). */
  private emitHud(): HudSnapshot | undefined {
    const huds = this.host.driver.huds();
    const hud = huds[0];
    if (hud) this.host.emit({ type: 'hud', hud, ...(huds.length > 1 ? { locals: huds } : {}) });
    return hud;
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
    const size = this.scale.gameSize;
    if (this.cameras.main.width !== size.width || this.cameras.main.height !== size.height)
      this.fitCamera();
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

    driver.advance(dt, this.input$.players(), () => this.input$.consumeTaps());
    if (driver.paused || driver.phase !== 'playing')
      for (const ui of this.input$.uiInputs()) this.host.emit({ type: 'uiInput', input: ui });
    if (this.input$.takeBuildRequest()) this.host.emit({ type: 'uiInput', input: 'build' });

    for (const event of driver.events()) this.handle(event);

    const alpha = driver.alpha;
    const camera = this.cameras.main;
    const time = this.time.now;
    const world = driver.world;
    this.view.sync(world, alpha, time, this.lightMap);
    this.view.addArenaLights(this.lightMap, time);
    const focus = driver.focus();
    this.frameParty(dt);
    camera.centerOn(focus.x, focus.y);
    // Sounds are heard from the view (spec: hud / sound feedback).
    this.host.sound.setListener(focus.x, focus.y, camera.worldView.width / 2);
    const { width, height } = driver.arena;
    const view = viewAround(camera, focus.x, focus.y, width, height);
    this.effects.update(world, driver.phase === 'playing' ? dt : 0, camera, this.lightMap);
    this.minimap.update(world, driver.localId, camera, this.game.loop.delta);
    this.atmosphere.update(camera, view, dt);
    this.lightMap.setDarkness(world.darkness, dt);
    this.lightMap.render(view);

    this.hudTimer += this.game.loop.rawDelta;
    if (this.hudTimer >= HUD_INTERVAL_MS) {
      this.hudTimer = 0;
      const hud = this.emitHud();
      this.updateMusic(hud, HUD_INTERVAL_MS / 1000);
      if (hud) {
        const { ability, stamina } = hud;
        this.input$.showHud(
          ability.remaining,
          ability.cooldown,
          stamina.value >= stamina.dashCost && stamina.dashRemaining <= 0,
        );
      }
    }
  }

  /**
   * The music follows the realm's time toward its boss, the realms cleared, the foes around this player's own god and
   * the boss (spec: music / what drives the music). It ducks while paused.
   */
  private updateMusic(hud: HudSnapshot | undefined, dt: number): void {
    const { driver, music } = this.host;
    music.player.setPaused(driver.paused);
    if (driver.phase === 'ended') return;
    const world = driver.world;
    const me = world.players.find((p) => p.id === driver.localId);
    const at = me?.alive ? me : driver.focus();
    let near = 0;
    for (const e of world.enemies)
      if (!e.dead && (e.x - at.x) ** 2 + (e.y - at.y) ** 2 <= NEAR * NEAR) near++;
    const intensity = musicIntensity({
      realmTime: hud?.realmTime ?? 0,
      bossAt: driver.realm.boss.at,
      depth: world.depth,
      enemiesNear: near,
      bossAwake: !!world.boss && !world.boss.dead,
    });
    music.player.setTier(music.tracker.update(intensity, dt));
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
        if (!driver.localIds.includes(event.playerId)) return;
        sound.play('hurt');
        this.shake(120, 0.004);
        return;
      case 'playerRevived':
        sound.play('revive', event);
        return;
      case 'dash':
        sound.play('whoosh', event);
        return;
      case 'perfectDodge':
        // Only this player's own perfect dodge rings out (spec: boss-encounter / perfect dodge).
        if (driver.localIds.includes(event.playerId)) sound.play('crit');
        return;
      case 'partFell':
        sound.play('killElite', event);
        return;
      case 'wallsRose':
        sound.play('impact', event);
        this.shake(220, 0.006);
        return;
      case 'merchantArrived':
        sound.play('gate', event);
        return;
      case 'purchase':
        sound.play('choose');
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
        emit({
          type: 'choiceResolved',
          offer: event.offer,
          playerId: event.playerId,
          choiceId: event.choiceId,
        });
        this.emitHud();
        return;
      case 'synergy':
        sound.play('synergy');
        return;
      case 'fusionTaken':
        // The crown of the tree gets its own fanfare, a golden flash and a heavy shake.
        if (event.tier >= 3) {
          sound.play('apotheosis');
          this.cameras.main.flash(500, 255, 228, 150);
          this.shake(900, 0.01);
        } else sound.play('synergy');
        return;
      case 'gathered':
        sound.play('gather');
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
      case 'encounter':
        // The Director's warnings, triumphs and failures (spec: director-of-chaos).
        if (event.phase === 'telegraph') sound.play(event.id.includes('shrine') ? 'gate' : 'elite');
        else if (event.phase === 'completed' && event.success) sound.play('synergy');
        else if (event.phase === 'failed') sound.play('rumble');
        return;
      case 'escaped':
        sound.play('whoosh', event);
        return;
      case 'blessed':
        if (driver.localIds.includes(event.playerId)) sound.play('levelUp');
        return;
      case 'realmEntered':
        sound.play('realm');
        // A new realm: the scene builds it from scratch through the same loading stages (spec: endless-run).
        emit({ type: 'realmEntered', realmId: event.realmId, depth: event.depth });
        this.scene.restart();
        return;
      case 'runEnded':
        sound.play('defeat');
        this.host.music.player.end();
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
    // Phaser resizes a camera only if it still had the previous size. Turning an iPhone sends several sizes in a row,
    // and one missed leaves the camera at the old size, its centre (the god) off screen (spec: phone-play).
    if (camera.width !== width || camera.height !== height) camera.setSize(width, height);
    this.baseZoom = Math.max(0.35, Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT));
    camera.setZoom(this.baseZoom * this.partyZoom);
    this.lightMap?.resize();
    // The simulation spawns outside, and holds a shared screen's party within, the usual view.
    this.host.driver.setView(width / this.baseZoom / 2, height / this.baseZoom / 2);
  }

  /**
   * A shared screen frames every living local god (spec: co-op / local co-op on one screen): the camera zooms out as
   * they spread, down to `SHARED_ZOOM_OUT`, where the simulation's soft edge holds them.
   */
  private frameParty(dt: number): void {
    const spread = this.host.driver.spread();
    const { width, height } = this.scale.gameSize;
    const viewWidth = width / this.baseZoom;
    const viewHeight = height / this.baseZoom;
    const want = Math.max(
      SHARED_ZOOM_OUT,
      Math.min(
        1,
        viewWidth / (spread.x + SHARED_MARGIN * 2),
        viewHeight / (spread.y + SHARED_MARGIN * 2),
      ),
    );
    // Out at once, so nobody leaves the screen; back in gently.
    this.partyZoom =
      want < this.partyZoom
        ? want
        : Math.min(want, this.partyZoom + (want - this.partyZoom) * dt * 2);
    const zoom = this.baseZoom * this.partyZoom;
    if (Math.abs(this.cameras.main.zoom - zoom) > 1e-4) this.cameras.main.setZoom(zoom);
  }
}
