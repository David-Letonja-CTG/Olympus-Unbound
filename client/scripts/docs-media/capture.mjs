// Regenerates the screenshots (JPEG) and GIFs in docs/images/ from the running game, so the docs stay current.
//
// Needs the client running with its debug hooks (npm start; the scenes open `?debug`). Every run starts from a fixed
// seed with god mode on, is powered up through level-ups, and is moved on with the debug clock (`skipTo`), so the
// pictures show a run in full swing in every realm and each boss without playing for half an hour.
//
//   cd client
//   node scripts/docs-media/capture.mjs                   # all scenes, against http://localhost:4200
//   node scripts/docs-media/capture.mjs tour bosses       # only some scenes (tour: hero.gif and realms.png)
//   DOCS_MEDIA_URL=http://localhost:4300 node scripts/docs-media/capture.mjs
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeGif } from './gif.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', '..', '..', 'docs', 'images');
const base = process.env.DOCS_MEDIA_URL ?? 'http://localhost:4200';
const VIEW = { width: 1280, height: 720 };
/** GIF frames: three quarters of the window, about as wide as a README on GitHub. */
const GIF = { width: 960, height: 540 };
/** At most this many GIF frames a second (keeps the files a few megabytes). */
const FPS = 12;
/** A finished run for the Hall of Glory's tables (score: kills + 2·seconds + 10·level + 1,000·realms). */
const entry = (i, godId, realmsCleared, timeSeconds, kills, level, players = 1) => ({
  runId: `docs-${i}`,
  endedAt: new Date(2026, 9, 10 + i, 20, 0).toISOString(),
  godId,
  realmId: 'mount_olympus',
  players,
  score: kills + 2 * timeSeconds + 10 * level + 1000 * realmsCleared,
  realmsCleared,
  timeSeconds,
  kills,
  level,
});
const SOLO = [
  entry(1, 'zeus', 3, 1810, 3120, 41),
  entry(2, 'athena', 2, 1290, 2410, 35),
  entry(3, 'hades', 2, 1180, 2205, 33),
  entry(4, 'poseidon', 1, 860, 1490, 27),
  entry(5, 'zeus', 1, 640, 1102, 24),
  entry(6, 'hades', 0, 390, 640, 16),
].sort((a, b) => b.score - a.score);
const COOP = [entry(7, 'athena', 4, 2240, 4890, 46, 3), entry(8, 'hades', 2, 1350, 2780, 36, 2)];
/** A save past the intro, at High quality, with some progress and glory to show. */
const SAVE = {
  version: 4,
  highScores: { solo: SOLO, coop: COOP },
  achievements: Object.fromEntries(
    [
      'first_gate',
      'deep_delver',
      'survivor_10',
      'survivor_20',
      'massacre',
      'slayer_1000',
      'slayer_10000',
      'ascendant',
      'storm_lord',
      'brothers_in_arms',
    ].map((id) => [id, SOLO[0].endedAt]),
  ),
  achievementProgress: { slayer_1000: 18420, slayer_10000: 18420, veteran: 23 },
  achievementGods: { pantheon: ['zeus', 'hades', 'athena'] },
  introSeen: true,
  gold: 1840,
  permanentUpgrades: { vitality: 2, might: 2, swiftness: 1, wisdom: 1 },
  discovered: {
    weapons: ['thunder_spear', 'war_hammer', 'divine_bow', 'trident', 'lightning_orb'],
    armour: ['aegis_of_olympus', 'tritons_shell'],
    relics: ['golden_fleece', 'zeus_eye'],
  },
  stats: { runs: 23, victories: 9, kills: 18420, bestTimeSeconds: 2410 },
  settings: { quality: 'high' },
};
const GOD_NAMES = { zeus: 'Zeus', hades: 'Hades', poseidon: 'Poseidon', athena: 'Athena' };

/** Every realm in the chain, the god shown in it, and its name on the realm screen. */
const REALMS = [
  { id: 'mount_olympus', name: 'Mount Olympus', god: 'zeus' },
  { id: 'the_underworld', name: 'The Underworld', god: 'hades' },
  { id: 'lernaean_marsh', name: 'Lernaean Marsh', god: 'poseidon' },
  { id: 'aegean_shore', name: 'Aegean Shore', god: 'athena' },
  { id: 'labyrinth_of_crete', name: 'Labyrinth of Crete', god: 'zeus' },
];

async function newPage(browser, viewport = VIEW) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(
    (save) => localStorage.setItem('olympus-unbound/save', JSON.stringify(save)),
    SAVE,
  );
  return page;
}

const send = (page, action) => page.evaluate((a) => window.olympusDebug?.send(a), action);
const inspect = (page) => page.evaluate(() => window.olympusDebug?.inspect());

/** Answers any open level-up with its first choice, until none is open. */
async function pickUpgrades(page) {
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    if (!(await page.getByRole('dialog').count())) return;
    await page.keyboard.press('1');
  }
}

/**
 * Starts a run of `god` in `realm` (seed 4242), with more `players` at the same screen and bot `allies`, and waits
 * until its loading screen is gone.
 */
async function startRun(browser, { god, realm, players = [], allies = [] }) {
  const page = await newPage(browser);
  await page.goto(`${base}/?debug`);
  await page.getByRole('link', { name: 'Play' }).click();
  await page.getByTestId(`god-${god}`).click();
  for (const other of players) {
    await page.getByTestId('add-player').click();
    await page.getByTestId(`add-player-${other}`).click();
  }
  for (const ally of allies) {
    await page.getByTestId('add-ally').click();
    await page.getByTestId(`add-ally-${ally}`).click();
  }
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL(/realms/);
  await page.getByTestId(`realm-${realm.id}`).click();
  await page.getByTestId('seed-input').fill('4242');
  await page.getByTestId('begin').click();
  await page.waitForFunction(() => (window.olympusDebug?.inspect()?.time ?? 0) > 0.3, null, {
    timeout: 120000,
  });
  await page.getByTestId('run-loading').waitFor({ state: 'detached', timeout: 120000 });
  await send(page, { type: 'godMode', enabled: true });
  return page;
}

/** Levels the god up several times (first choice each time), so the run shows a fuller build. */
async function powerUp(page) {
  for (let i = 0; i < 6; i++) {
    await send(page, { type: 'grantXp', amount: 150 });
    await pickUpgrades(page);
  }
}

/** Holds `keys` for `ms` milliseconds. */
async function walk(page, keys, ms) {
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  for (const key of keys) await page.keyboard.up(key);
}

/** Screenshots the page for `ms` milliseconds; returns the frames (RGBA at GIF size) and their delays. */
async function record(page, decoder, ms) {
  const shots = [];
  const start = Date.now();
  while (Date.now() - start < ms) {
    const at = Date.now();
    shots.push({ at, jpeg: await page.screenshot({ type: 'jpeg', quality: 92 }) });
    const rest = 1000 / FPS - (Date.now() - at);
    if (rest > 0) await page.waitForTimeout(rest);
  }
  const frames = [];
  for (const shot of shots) {
    const b64 = await decoder.evaluate(
      async ([src, w, h]) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = new OffscreenCanvas(w, h);
        const g = canvas.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(image, 0, 0, w, h);
        let s = '';
        for (const byte of g.getImageData(0, 0, w, h).data) s += String.fromCharCode(byte);
        return btoa(s);
      },
      [`data:image/jpeg;base64,${shot.jpeg.toString('base64')}`, GIF.width, GIF.height],
    );
    frames.push(new Uint8Array(Buffer.from(b64, 'base64')));
  }
  const delays = shots.map((s, i) => (i + 1 < shots.length ? shots[i + 1].at - s.at : 100));
  return { frames, delays };
}

/** `steps` frames blending `frame` towards black (`out`) or from it (`in`). */
function fade(frame, steps, direction) {
  return Array.from({ length: steps }, (_, i) => {
    const t = direction === 'out' ? (i + 1) / (steps + 1) : (steps - i) / (steps + 1);
    const blended = new Uint8Array(frame.length);
    for (let p = 0; p < frame.length; p += 4) {
      for (let c = 0; c < 3; c++) blended[p + c] = Math.round(frame[p + c] * (1 - t));
      blended[p + 3] = 255;
    }
    return blended;
  });
}

/** Clips joined by a short fade through black. */
function joinClips(clips) {
  const frames = [];
  const delays = [];
  clips.forEach((clip, i) => {
    if (i > 0) {
      frames.push(...fade(clip.frames[0], 3, 'in'));
      delays.push(60, 60, 60);
    }
    frames.push(...clip.frames);
    delays.push(...clip.delays);
    if (i < clips.length - 1) {
      frames.push(...fade(clip.frames.at(-1), 3, 'out'));
      delays.push(60, 60, 60);
    }
  });
  return { frames, delays };
}

function writeGif(name, { frames, delays }) {
  const gif = encodeGif(frames, { ...GIF, delays });
  writeFileSync(join(out, name), gif);
  console.log(`${name}: ${frames.length} frames, ${(gif.length / 1e6).toFixed(1)} MB`);
}

/** A grid of captioned pictures (PNG buffers), `columns` wide, saved as `name`. */
async function montage(browser, name, pictures, columns, width = 600) {
  const height = Math.round((width * 9) / 16);
  const page = await browser.newPage({
    viewport: { width: columns * (width + 8) + 8, height: 400 },
  });
  await page.setContent(`<body style="margin:0;padding:4px;background:#0d0b0a;font:600 17px Georgia,serif;color:#e8d9b4">
    <div style="display:grid;grid-template-columns:repeat(${columns},${width}px);gap:8px">
    ${pictures
      .map(
        ([caption, png]) =>
          `<figure style="margin:0"><img src="data:image/png;base64,${png.toString('base64')}" width="${width}" height="${height}" style="display:block"><figcaption style="padding:5px 2px 2px">${caption}</figcaption></figure>`,
      )
      .join('')}
    </div></body>`);
  await page.screenshot({ path: join(out, name), fullPage: true, quality: 88 });
  await page.close();
}

/** Waits until the boss is within `reach` of the god (it walks to them), at most `ms` milliseconds. */
async function awaitBoss(page, reach = 280, ms = 40000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const s = await inspect(page);
    if (s?.boss && Math.hypot(s.boss.x - s.player.x, s.boss.y - s.player.y) < reach) return;
    await page.waitForTimeout(300);
  }
}

const scenes = {
  /** A run in full swing in every realm: hero.gif joins them, realms.png shows a still of each. */
  async tour(browser) {
    const decoder = await browser.newPage();
    const clips = [];
    const stills = [];
    for (const realm of REALMS) {
      const page = await startRun(browser, { god: realm.god, realm });
      await powerUp(page);
      await send(page, { type: 'skipTo', seconds: 230 });
      // Off the spawn plaza, into the realm's own ground.
      await walk(page, ['KeyD', 'KeyS'], 2200);
      await page.waitForTimeout(3500);
      await pickUpgrades(page);
      clips.push(await record(page, decoder, 2600));
      stills.push([
        `${realm.name} · ${GOD_NAMES[realm.god]}`,
        await page.screenshot({ type: 'png' }),
      ]);
      await page.close();
    }
    await decoder.close();
    writeGif('hero.gif', joinClips(clips));
    await montage(browser, 'realms.jpg', stills, 3, 420);
  },

  /** Every realm's boss (bosses.png) and a fight with Asterion (boss.gif). */
  async bosses(browser) {
    const decoder = await browser.newPage();
    const BOSSES = ['The Cyclops', 'Cerberus', 'The Hydra', 'Scylla', 'Asterion'];
    const stills = [];
    for (const [i, realm] of REALMS.entries()) {
      const page = await startRun(browser, { god: realm.god, realm });
      await powerUp(page);
      await send(page, { type: 'skipTo', seconds: 419 });
      await page.getByTestId('boss-bar').waitFor({ timeout: 30000 });
      await awaitBoss(page);
      await page.waitForTimeout(1200);
      await pickUpgrades(page);
      stills.push([`${BOSSES[i]} · ${realm.name}`, await page.screenshot({ type: 'png' })]);
      if (realm.id === 'labyrinth_of_crete')
        writeGif('boss.gif', await record(page, decoder, 3500));
      await page.close();
    }
    await decoder.close();
    await montage(browser, 'bosses.jpg', stills, 3, 420);
  },

  /** The menus: the main menu, choosing a god and a realm, progression. */
  async menus(browser) {
    const page = await newPage(browser);
    await page.goto(base);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(out, 'menu.jpg'), quality: 88 });
    await page.getByRole('link', { name: 'Play' }).click();
    await page.getByTestId('god-zeus').click();
    // A second player at this screen (spec: co-op / local co-op) and two allies played by the machine.
    await page.getByTestId('add-player').click();
    await page.getByTestId('add-player-poseidon').click();
    for (const god of ['hades', 'athena']) {
      await page.getByTestId('add-ally').click();
      await page.getByTestId(`add-ally-${god}`).click();
    }
    await page.getByTestId('ally-0-hard').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(out, 'gods.jpg'), quality: 88, fullPage: true });
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByTestId('realm-labyrinth_of_crete').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(out, 'realm-select.jpg'), quality: 88 });
    await page.goto(`${base}/progression`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(out, 'progression.jpg'), quality: 88 });
    await page.close();
  },

  /** The Hall of Glory: today's quests, the high scores and the achievements (glory.jpg). */
  async glory(browser) {
    const page = await newPage(browser);
    await page.goto(`${base}/glory`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(out, 'glory.jpg'), quality: 88 });
    await page.close();
  },

  /**
   * The Wandering Merchant (shop.jpg) and the companions bought from it fighting beside their god, with a dash
   * (merchant.gif).
   */
  async merchant(browser) {
    const decoder = await browser.newPage();
    const page = await startRun(browser, { god: 'athena', realm: REALMS[0] });
    await powerUp(page);
    await send(page, { type: 'skipTo', seconds: 140 });
    await page.waitForTimeout(1500);
    await pickUpgrades(page);
    await send(page, { type: 'grantGold', amount: 700 });
    await send(page, { type: 'summonMerchant' });
    await page.waitForTimeout(800);
    // Walk into the merchant's ring.
    const at = await inspect(page);
    const dx = at.merchant.x - at.player.x;
    const dy = at.merchant.y - at.player.y;
    const keys = [
      ...(Math.abs(dx) > 30 ? [dx > 0 ? 'KeyD' : 'KeyA'] : []),
      ...(Math.abs(dy) > 30 ? [dy > 0 ? 'KeyS' : 'KeyW'] : []),
    ];
    for (const key of keys) await page.keyboard.down(key);
    const shop = page.getByRole('dialog', { name: 'The Wandering Merchant' });
    await shop.waitFor({ timeout: 30000 });
    for (const key of keys) await page.keyboard.up(key);
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(out, 'shop.jpg'), quality: 88 });
    for (const name of [/Hound of the Underworld/, /Eagle of Zeus/, /Temple Serpent/]) {
      await page.getByRole('button', { name }).click();
      await page.waitForTimeout(400);
    }
    await page.getByRole('button', { name: /Leave/ }).click();
    // Out among the foes, with a dash on the way.
    await walk(
      page,
      keys.map((k) => ({ KeyD: 'KeyA', KeyA: 'KeyD', KeyS: 'KeyW', KeyW: 'KeyS' })[k]),
      900,
    );
    await send(page, { type: 'skipTo', seconds: 230 });
    await page.waitForTimeout(2500);
    await pickUpgrades(page);
    const clipA = await record(page, decoder, 1500);
    await page.keyboard.down('KeyD');
    await page.keyboard.press('KeyE');
    const clipB = await record(page, decoder, 1500);
    await page.keyboard.up('KeyD');
    const clipC = await record(page, decoder, 1500);
    writeGif('merchant.gif', {
      frames: [...clipA.frames, ...clipB.frames, ...clipC.frames],
      delays: [...clipA.delays, ...clipB.delays, ...clipC.delays],
    });
    await page.close();
    await decoder.close();
  },

  /**
   * Local co-op: two players on one keyboard and a bot, the camera zooming out as they spread apart (together.gif),
   * a still of the split frieze (together.jpg), and four players with a plaque in every corner (together-four.jpg).
   */
  async together(browser) {
    const decoder = await browser.newPage();
    const page = await startRun(browser, {
      god: 'zeus',
      realm: REALMS[0],
      players: ['athena'],
      allies: ['hades'],
    });
    await powerUp(page);
    await send(page, { type: 'skipTo', seconds: 150 });
    await page.waitForTimeout(3000);
    await pickUpgrades(page);
    await page.screenshot({ path: join(out, 'together.jpg'), quality: 88 });
    const clipA = await record(page, decoder, 1200);
    // Player 1 walks left on WASD, player 2 right on the arrows: the camera zooms out to keep both.
    await page.keyboard.down('KeyA');
    await page.keyboard.down('ArrowRight');
    const clipB = await record(page, decoder, 3200);
    await page.keyboard.up('KeyA');
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('KeyD');
    await page.keyboard.down('ArrowLeft');
    const clipC = await record(page, decoder, 2400);
    await page.keyboard.up('KeyD');
    await page.keyboard.up('ArrowLeft');
    writeGif('together.gif', {
      frames: [...clipA.frames, ...clipB.frames, ...clipC.frames],
      delays: [...clipA.delays, ...clipB.delays, ...clipC.delays],
    });
    await page.close();
    await decoder.close();

    // Four players: a plaque in every corner, the minimap below player 2's (together-four.jpg).
    const four = await startRun(browser, {
      god: 'zeus',
      realm: REALMS[0],
      players: ['athena', 'hades', 'poseidon'],
    });
    await powerUp(four);
    await send(four, { type: 'skipTo', seconds: 150 });
    await four.waitForTimeout(3000);
    await pickUpgrades(four);
    await four.screenshot({ path: join(out, 'together-four.jpg'), quality: 88 });
    await four.close();
  },

  /**
   * An online room seen by its host (room.jpg): the host's own frieze, and the guest as a medallion on the left. Two
   * tabs of one browser joined over `net=local`, as in the end-to-end test.
   */
  async room(browser) {
    const context = await browser.newContext({ viewport: VIEW });
    await context.addInitScript(
      (save) => localStorage.setItem('olympus-unbound/save', JSON.stringify(save)),
      SAVE,
    );
    const open = async (name) => {
      const page = await context.newPage();
      await page.goto(`${base}/coop?debug&net=local`);
      await page.getByTestId('player-name').fill(name);
      return page;
    };
    const host = await open('Ada');
    await host.getByTestId('create-room').click();
    const code = (await host.getByTestId('room-code').textContent())?.trim() ?? '';
    const guest = await open('Bo');
    await guest.getByTestId('room-code-input').fill(code);
    await guest.getByTestId('join-room').click();
    await guest.getByTestId('lobby-god-hades').click();
    await guest.getByTestId('ready').click();
    await host.getByTestId('start-room').click();
    for (const p of [host, guest])
      await p.getByTestId('run-loading').waitFor({ state: 'detached', timeout: 150000 });
    await host.waitForFunction(() => (window.olympusDebug?.inspect()?.time ?? 0) > 0.3);
    await send(host, { type: 'godMode', enabled: true });
    /** Both answer every open choice until the run goes on. */
    const answerAll = async () => {
      for (let i = 0; i < 30; i++) {
        for (const p of [host, guest]) await pickUpgrades(p);
        if ((await inspect(host))?.phase === 'playing') return;
      }
    };
    for (let i = 0; i < 4; i++) {
      await send(host, { type: 'grantXp', amount: 150 });
      await host.waitForTimeout(600);
      await answerAll();
    }
    await send(host, { type: 'skipTo', seconds: 140 });
    await guest.keyboard.down('KeyD');
    await host.waitForTimeout(3000);
    await guest.keyboard.up('KeyD');
    await answerAll();
    // The guest's god takes a few blows, so their ring shows it.
    await send(host, { type: 'godMode', enabled: false });
    await host.waitForTimeout(2500);
    await send(host, { type: 'godMode', enabled: true });
    await answerAll();
    await host.bringToFront();
    await host.waitForTimeout(1500);
    await host.screenshot({ path: join(out, 'room.jpg'), quality: 88 });
    await context.close();
  },

  /** In a run: a level-up choice, the gate after a boss, and the summary at the end. */
  async run(browser) {
    const realm = REALMS[0];
    const page = await startRun(browser, { god: 'athena', realm });
    await powerUp(page);
    await send(page, { type: 'skipTo', seconds: 150 });
    await page.waitForTimeout(4000);
    await pickUpgrades(page);
    await send(page, { type: 'grantXp', amount: 600 });
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(out, 'level-up.jpg'), quality: 88 });
    await pickUpgrades(page);
    await send(page, { type: 'skipTo', seconds: 419 });
    await page.getByTestId('boss-bar').waitFor({ timeout: 30000 });
    // Felled near the god, so the gate opens on screen.
    await awaitBoss(page, 200);
    await send(page, { type: 'damageBoss', fraction: 1 });
    await page.waitForTimeout(4000);
    await pickUpgrades(page);
    await page.screenshot({ path: join(out, 'gate.jpg'), quality: 88 });
    await send(page, { type: 'godMode', enabled: false });
    await send(page, { type: 'killPlayer' });
    await page.waitForURL(/summary/, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(out, 'summary.jpg'), quality: 88 });
    await page.close();
  },
};

const wanted = process.argv.slice(2);
const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
try {
  for (const [name, scene] of Object.entries(scenes)) {
    if (wanted.length && !wanted.includes(name)) continue;
    await scene(browser);
    console.log(`${name} done`);
  }
} finally {
  await browser.close();
}
