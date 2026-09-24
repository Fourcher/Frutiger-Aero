// Dev helper: launches every registered app in each theme, collects console
// errors per app and writes screenshots plus contact sheets.
//
//   node tools/smoke.mjs                       every app, all three themes
//   node tools/smoke.mjs --apps paint,games    only these apps
//   node tools/smoke.mjs --themes light --out /tmp/smoke
//
// Output: <out>/<theme>-<app>.png, <out>/sheet-<theme>-<n>.png, and a
// report printed to stdout (exit code 1 if any app logged an error).
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = { out: 'smoke', themes: ['light', 'dark', 'technozen'], apps: null, wait: 1100, sheets: true };
for (let i = 0; i < args.length; i++) {
  const a = args[i], v = args[i + 1];
  if (a === '--out') { opt.out = v; i++; }
  else if (a === '--themes') { opt.themes = v.split(','); i++; }
  else if (a === '--apps') { opt.apps = v.split(','); i++; }
  else if (a === '--wait') { opt.wait = Number(v); i++; }
  else if (a === '--no-sheets') opt.sheets = false;
}
const out = resolve(opt.out);
mkdirSync(out, { recursive: true });

const browser = await playwright.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const report = [];
let failed = 0;

for (const theme of opt.themes) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  let bucket = [];
  page.on('console', (m) => { if (m.type() === 'error') bucket.push('[error] ' + m.text()); });
  page.on('pageerror', (e) => bucket.push('[pageerror] ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  await page.goto(pathToFileURL(join(root, 'index.html')).href + '?boot=skip&reset&theme=' + theme);
  await page.waitForTimeout(1500);
  const boot = bucket.splice(0);
  if (boot.length) { report.push({ theme, app: '(boot)', errors: boot }); failed++; }

  const ids = opt.apps || await page.evaluate(() => Aerium.apps.list({ includeHidden: true }).map((a) => a.id));
  const shots = [];
  for (const id of ids) {
    bucket = [];
    let info = {};
    try {
      info = await page.evaluate((id) => {
        const w = Aerium.apps.launch(id);
        return { window: !!(w && w.el), title: w && w.title };
      }, id);
    } catch (e) { bucket.push('[launch] ' + e.message.split('\n')[0]); }
    await page.waitForTimeout(opt.wait);
    const file = join(out, `${theme}-${id}.png`);
    await page.screenshot({ path: file });
    shots.push({ id, file });
    try {
      await page.evaluate(() => {
        Aerium.wm.windows.slice().forEach((w) => { try { w.close(true); } catch (e) { console.error(e); } });
        try { Aerium.music && Aerium.music.stop && Aerium.music.stop(); } catch (e) { console.error(e); }
        try { Aerium.screensaver && Aerium.screensaver.stop && Aerium.screensaver.stop(); } catch (e) { console.error(e); }
        document.querySelectorAll('.ae-menu, .ae-flyout').forEach((n) => n.remove());
      });
    } catch (e) { bucket.push('[close] ' + e.message.split('\n')[0]); }
    await page.waitForTimeout(350);
    const errs = bucket.splice(0);
    if (errs.length) failed++;
    report.push({ theme, app: id, window: info.window, errors: errs });
  }

  if (opt.sheets) {
    const per = 12;
    for (let s = 0; s * per < shots.length; s++) {
      const group = shots.slice(s * per, s * per + per);
      const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(3,455px);gap:0;font:12px sans-serif;color:#fff">` +
        group.map((g) => `<div style="position:relative"><img src="${pathToFileURL(g.file).href}" style="width:455px;height:256px;display:block"><span style="position:absolute;left:4px;top:2px;background:#000a;padding:1px 5px">${g.id}</span></div>`).join('') + '</body>';
      const sheet = join(out, `sheet-${theme}-${s + 1}.html`);
      writeFileSync(sheet, html);
      const sp = await browser.newPage({ viewport: { width: 1365, height: Math.ceil(group.length / 3) * 256 } });
      await sp.goto(pathToFileURL(sheet).href);
      await sp.waitForTimeout(300);
      await sp.screenshot({ path: join(out, `sheet-${theme}-${s + 1}.png`) });
      await sp.close();
    }
  }
  await page.close();
}
await browser.close();

for (const r of report) {
  const status = r.errors.length ? 'FAIL' : 'ok  ';
  console.log(`${status} ${r.theme.padEnd(9)} ${r.app}${r.window === false ? ' (no window)' : ''}`);
  for (const e of r.errors) console.log('       ' + e.slice(0, 400));
}
console.log(failed ? `\n${failed} app run(s) logged errors` : '\nall clean');
process.exit(failed ? 1 : 0);
