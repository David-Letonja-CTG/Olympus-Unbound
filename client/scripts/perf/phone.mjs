// Measures frame times of a run with a full horde under phone emulation (spec: phone-play / phone performance).
//
// Needs the client running with its debug hooks (npm start). Emulates a Pixel 7 held sideways (touch, 863 × 360 CSS
// pixels, device pixel ratio 2.625), slows the CPU through the DevTools protocol, starts Zeus on Mount Olympus with a
// fixed seed at the chosen quality, moves the clock on with god mode until the horde is large, then records every
// animation frame for a while and prints the median, the 95th percentile and the worst frame.
//
//   cd client
//   node scripts/perf/phone.mjs                                  # Low, CPU ×4, against http://localhost:4200
//   PERF_URL=http://localhost:4300 PERF_QUALITY=high PERF_CPU=6 node scripts/perf/phone.mjs
//   PERF_REALM=mount_othrys node scripts/perf/phone.mjs              # another realm
//
// Emulation is not a phone: the GPU is this machine's, so treat the numbers as a check of the CPU side (the
// simulation, the views, the light map's drawing calls), and try a real phone before trusting them.
import { chromium, devices } from '@playwright/test';

const base = process.env.PERF_URL ?? 'http://localhost:4200';
const quality = process.env.PERF_QUALITY ?? 'low';
/** PERF_REALM=mount_othrys: the realm to measure. */
const realm = process.env.PERF_REALM ?? 'mount_olympus';
const cpu = Number(process.env.PERF_CPU ?? 4);
/** Enemies to wait for before measuring, and the longest wait (real seconds). */
const HORDE = Number(process.env.PERF_HORDE ?? 280);
const HORDE_WAIT_S = 120;
const MEASURE_S = Number(process.env.PERF_SECONDS ?? 15);
const SAVE = {
  version: 4,
  introSeen: true,
  // PERF_SETTINGS='{"damageNumbers":false}': other settings to measure with.
  settings: { quality, ...JSON.parse(process.env.PERF_SETTINGS ?? '{}') },
};

const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu'] });
const context = await browser.newContext({ ...devices['Pixel 7 landscape'] });
await context.addInitScript(
  (save) => localStorage.setItem('olympus-unbound/save', JSON.stringify(save)),
  SAVE,
);
const page = await context.newPage();
const send = (action) => page.evaluate((a) => window.olympusDebug?.send(a), action);
const inspect = () => page.evaluate(() => window.olympusDebug?.inspect());

await page.goto(`${base}/?debug`);
const renderer = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl');
  const info = gl?.getExtension('WEBGL_debug_renderer_info');
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
await page.getByRole('link', { name: 'Play' }).tap();
await page.getByTestId('god-zeus').tap();
await page.getByRole('button', { name: 'Continue' }).tap();
await page.getByTestId(`realm-${realm}`).tap();
await page.getByTestId('seed-input').fill('4242');
await page.getByTestId('begin').tap();
// Loading: art, painting the realm's ground and building the scene (the cost of richer ground shows here).
const loadStart = Date.now();
await page.waitForFunction(() => (window.olympusDebug?.inspect()?.time ?? 0) > 0.3, null, {
  timeout: 180000,
});
await page.getByTestId('run-loading').waitFor({ state: 'detached', timeout: 180000 });
const loadSeconds = (Date.now() - loadStart) / 1000;

// The horde: god mode, and the clock late in the realm, before the boss.
await send({ type: 'godMode', enabled: true });
await send({ type: 'skipTo', seconds: 400 });
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
const waitStart = Date.now();
let enemies = 0;
while (Date.now() - waitStart < HORDE_WAIT_S * 1000) {
  // Level-ups would pause the run: take the first offer.
  if (await page.getByTestId('offer-0').count()) await page.getByTestId('offer-0').tap();
  const snap = await inspect();
  enemies = snap?.enemies ?? 0;
  if (enemies >= HORDE) break;
  await page.waitForTimeout(1000);
}

// Level-ups during the measurement are answered from inside the page, so the run keeps going.
await page.evaluate(() =>
  setInterval(() => document.querySelector('[data-testid=offer-0]')?.click(), 400),
);
// PERF_HIDE=selector: leave something out (e.g. app-hud), to see what it costs.
if (process.env.PERF_HIDE)
  await page.addStyleTag({ content: `${process.env.PERF_HIDE} { display: none !important; }` });
const before = await inspect();
const frames = await page.evaluate(
  (seconds) =>
    new Promise((resolve) => {
      const times = [];
      let last = performance.now();
      const end = last + seconds * 1000;
      const tick = (now) => {
        times.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(tick);
        else resolve(times);
      };
      requestAnimationFrame(tick);
    }),
  MEASURE_S,
);
const after = await inspect();
frames.sort((a, b) => a - b);
const at = (q) => frames[Math.min(frames.length - 1, Math.floor(q * frames.length))];
const report = {
  quality,
  cpuSlowdown: cpu,
  renderer,
  viewport: devices['Pixel 7 landscape'].viewport,
  enemies: [before?.enemies, after?.enemies],
  phase: after?.phase,
  frames: frames.length,
  realm,
  loadSeconds: +loadSeconds.toFixed(1),
  fps: +(frames.length / MEASURE_S).toFixed(1),
  medianMs: +at(0.5).toFixed(1),
  p95Ms: +at(0.95).toFixed(1),
  worstMs: +frames[frames.length - 1].toFixed(1),
  // Simulated seconds per real second: below 1 the game runs slower than real time.
  simulationSpeed: +(((after?.time ?? 0) - (before?.time ?? 0)) / MEASURE_S).toFixed(2),
};
console.log(JSON.stringify(report, null, 2));

// PERF_PROFILE=1: where the main thread's time goes (self time by function, top 30).
if (process.env.PERF_PROFILE) {
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  await cdp.send('Profiler.start');
  await page.waitForTimeout(8000);
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map();
  const dt = new Map();
  profile.samples.forEach((id, i) => dt.set(id, (dt.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)));
  let total = 0;
  for (const node of profile.nodes) {
    const t = dt.get(node.id) ?? 0;
    total += t;
    const f = node.callFrame;
    const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`;
    self.set(key, (self.get(key) ?? 0) + t);
  }
  const byFile = new Map();
  for (const [k, t] of self) {
    const file = k.split(' ').pop().split(':')[0].replace(/\?.*/, '') || '(native)';
    byFile.set(file, (byFile.get(file) ?? 0) + t);
  }
  for (const [f, t] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 8))
    console.log(`${((t / total) * 100).toFixed(1).padStart(5)}%  [file] ${f}`);
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 30);
  for (const [k, t] of top) console.log(((t / total) * 100).toFixed(1).padStart(5) + '%  ' + k);
}
await browser.close();
