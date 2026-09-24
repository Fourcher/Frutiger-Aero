// Builds a copy of Aerium for hosting as a single web page (a claude.ai
// Artifact): the page wrapper is supplied by the host, so index.html loses
// its <html>/<head>/<body> tags; fonts are inlined; and the theme attribute
// is renamed so the host's own light/dark stamp on <html> can't clash.
//
//   node tools/build-artifact.mjs            writes dist/artifact/
//
// Output: dist/artifact/index.html plus every stylesheet and script it
// references (same relative paths), a _preview.html that wraps the page
// the way the host does for local testing, and files.json listing the
// published files.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'artifact');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const html = readFileSync(join(root, 'index.html'), 'utf8');
const title = (html.match(/<title>([^<]*)<\/title>/) || [, 'Aerium'])[1];
const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const body = html
  .slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))
  .replace(/<script src="[^"]+"><\/script>\s*/g, '')
  .replace(/<!--[\s\S]*?-->\s*/g, '')
  .trim();

// data-theme belongs to the host page; Aerium's own themes use data-ae-theme.
function renameTheme(text) {
  return text
    .replace(/data-theme/g, 'data-ae-theme')
    .replace(/dataset\.theme\b/g, 'dataset.aeTheme')
    .replace(/dataset:\s*\{\s*theme:/g, 'dataset: { aeTheme:');
}

function inlineFonts(css, base) {
  return css.replace(/url\("([^"]+\.(ttf|woff2))"\)/g, (m, file, ext) => {
    const data = readFileSync(join(root, base, file)).toString('base64');
    return `url("data:font/${ext};base64,${data}")`;
  });
}

const files = [];
for (const rel of [...styles, ...scripts]) {
  let text = readFileSync(join(root, rel), 'utf8');
  if (rel.endsWith('fonts.css')) text = inlineFonts(text, dirname(rel));
  text = renameTheme(text);
  mkdirSync(join(out, dirname(rel)), { recursive: true });
  writeFileSync(join(out, rel), text);
  files.push(rel);
}

const page = [
  `<title>${title}</title>`,
  // The host adds img { max-width: 100% }; Aerium sizes its own images.
  '<style>img { max-width: none; } html, body { height: 100%; background: #000; }</style>',
  ...styles.map((s) => `<link rel="stylesheet" href="${s}">`),
  renameTheme(body),
  ...scripts.map((s) => `<script src="${s}"></script>`),
].join('\n');
writeFileSync(join(out, 'index.html'), page + '\n');

// Local stand-in for the host wrapper, including a host theme stamp.
writeFileSync(join(out, '_preview.html'), `<!doctype html>
<html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#f7f7f5}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
${page}
</body></html>
`);

writeFileSync(join(out, 'files.json'), JSON.stringify(Object.fromEntries(files.map((f) => [f, 'dist/artifact/' + f])), null, 2));
console.log(`wrote ${files.length + 1} files to dist/artifact (${styles.length} stylesheets, ${scripts.length} scripts)`);
