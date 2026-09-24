// Dev helper: opens Aerium in headless Chromium, runs optional steps and
// saves a screenshot while reporting console errors.
//
//   node tools/shoot.mjs --query "boot=skip&open=paint" --out /tmp/paint.png
//   node tools/shoot.mjs --query "boot=skip" --eval "Aerium.apps.launch('calculator')" --wait 1200
//   node tools/shoot.mjs --query "boot=skip&open=notepad" --click ".ae-menubar-item" --out /tmp/menu.png
//
// Options: --query  URL query (default "boot=skip")
//          --out    screenshot path (default ./shot.png)
//          --size   WIDTHxHEIGHT (default 1366x768)
//          --wait   ms to wait after load and after each step (default 1200)
//          --eval   JS to run in the page (repeatable)
//          --click  CSS selector to click (repeatable, runs in order with --eval steps)
//          --keep   keep localStorage between runs (default: fresh profile each run)
//          --theme  light | dark | technozen
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = { query: 'boot=skip', out: 'shot.png', size: '1366x768', wait: 1200, steps: [], keep: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const v = args[i + 1];
  if (a === '--query') { opt.query = v; i++; }
  else if (a === '--out') { opt.out = v; i++; }
  else if (a === '--size') { opt.size = v; i++; }
  else if (a === '--wait') { opt.wait = Number(v); i++; }
  else if (a === '--eval') { opt.steps.push({ eval: v }); i++; }
  else if (a === '--click') { opt.steps.push({ click: v }); i++; }
  else if (a === '--theme') { opt.query += '&theme=' + v; i++; }
  else if (a === '--keep') opt.keep = true;
}
const [w, h] = opt.size.split('x').map(Number);
const launchArgs = ['--autoplay-policy=no-user-gesture-required'];
// --keep reuses one profile, so localStorage (files, settings) carries over between runs.
const browser = opt.keep
  ? await playwright.chromium.launchPersistentContext(join(tmpdir(), 'aerium-shoot-profile'), { args: launchArgs, viewport: { width: w, height: h } })
  : await playwright.chromium.launch({ args: launchArgs });
const page = opt.keep ? (browser.pages()[0] || await browser.newPage()) : await browser.newPage({ viewport: { width: w, height: h } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + (e.stack || e.message)));
const url = pathToFileURL(join(root, 'index.html')).href + '?' + opt.query;
await page.goto(url);
await page.waitForTimeout(opt.wait);
for (const s of opt.steps) {
  try {
    if (s.eval) await page.evaluate(s.eval);
    if (s.click) await page.click(s.click, { timeout: 3000 });
  } catch (e) { errors.push('[step] ' + e.message.split('\n')[0]); }
  await page.waitForTimeout(opt.wait);
}
await page.screenshot({ path: resolve(opt.out) });
console.log('screenshot:', resolve(opt.out));
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
