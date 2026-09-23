// Draws the extra glossy icons Aerium needs that the Frutiger Aero design
// system does not ship (calculator, notepad, palette, console...). Every icon
// follows the design system's icon recipe: a 64x64 lit object with a body
// gradient from the top left, a darker rim, a white shine clipped to the upper
// half, a caustic glow at the base and a soft floor shadow.
// Run: node tools/build-icons.mjs  (writes src/icons/*.svg)
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src/icons');
mkdirSync(out, { recursive: true });

const COMMON = `<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".92"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient><radialGradient id="caustic" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><radialGradient id="floor" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b2a4a" stop-opacity=".3"/><stop offset="1" stop-color="#0b2a4a" stop-opacity="0"/></radialGradient>`;

const radial = (id, a, b, c, cx = 0.36, cy = 0.28) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r=".8"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
const linear = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`)
    .join('')}</linearGradient>`;

function icon({ defs = '', shape, fill = 'url(#body)', rim, inner = '', over = '', under = '', shineEl, causticEl, floor = true }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${COMMON}${defs}<clipPath id="clip">${shape.replace('/>', ' fill="#000"/>')}</clipPath></defs>${
    floor ? '<ellipse cx="32" cy="60.5" rx="19" ry="2.8" fill="url(#floor)"/>' : ''
  }${under}${shape.replace('/>', ` fill="${fill}"/>`)}<g clip-path="url(#clip)">${inner}${causticEl || ''}${shineEl || ''}</g>${shape.replace(
    '/>',
    ` fill="none" stroke="${rim}" stroke-opacity=".55" stroke-width="1"/>`
  )}${over}</svg>`;
}

const icons = {};

// Aerium mark: a glass sphere carrying a white wind ribbon and a green leaf ribbon.
icons.aerium = icon({
  defs: `<radialGradient id="body" cx=".5" cy="1.05" r="1"><stop offset="0" stop-color="#bff4ff"/><stop offset=".45" stop-color="#2cb6ea"/><stop offset="1" stop-color="#0b3d73"/></radialGradient>${linear('rib', [[0, '#ffffff', 0], [0.35, '#ffffff', 0.95], [1, '#ffffff', 0.2]], 1, 0)}${linear('leafr', [[0, '#dcffd0', 0.2], [0.5, '#8fe05a'], [1, '#35c93a', 0.4]], 1, 0)}`,
  shape: '<circle cx="32" cy="31" r="25"/>',
  rim: '#073a6c',
  inner:
    '<path d="M4 40 C 16 24, 34 50, 60 22" stroke="url(#rib)" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<path d="M8 49 C 22 37, 38 56, 58 35" stroke="url(#leafr)" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="45" cy="42" r="2.2" fill="#fff" fill-opacity=".7"/><circle cx="41" cy="48" r="1.3" fill="#fff" fill-opacity=".6"/>',
  causticEl: '<ellipse cx="32" cy="54" rx="17" ry="8" fill="url(#caustic)"/>',
  shineEl: '<ellipse cx="30" cy="17" rx="18" ry="10" fill="url(#shine)"/>',
});

// Calculator: pearl body, aqua LCD, gel keys.
{
  let keys = '';
  const cols = [21, 28.5, 36, 43.5];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = cols[c] - 2.9, y = 28 + r * 6.8;
      const orange = c === 3;
      const eq = c === 3 && r === 3;
      const fillc = eq ? 'url(#keyA)' : orange ? 'url(#keyO)' : 'url(#keyP)';
      keys += `<rect x="${x}" y="${y}" width="5.8" height="5" rx="1.6" fill="${fillc}" stroke="${eq ? '#0a6fd1' : orange ? '#c86a0a' : '#7d94ab'}" stroke-opacity=".7" stroke-width=".6"/>`;
    }
  }
  icons.calculator = icon({
    defs:
      radial('body', '#ffffff', '#dfe8f1', '#8ea3b8') +
      linear('lcd', [[0, '#e3f7ff'], [0.5, '#9fdcff'], [0.5, '#7ccbf5'], [1, '#bfe9ff']]) +
      linear('keyP', [[0, '#ffffff'], [0.5, '#f1f5f9'], [0.5, '#dde5ec'], [1, '#f4f7fa']]) +
      linear('keyO', [[0, '#fff1c2'], [0.5, '#ffc04d'], [0.5, '#f5a023'], [1, '#ffcf6b']]) +
      linear('keyA', [[0, '#d4f0ff'], [0.5, '#7cc8ff'], [0.5, '#3aa6f5'], [1, '#8fd3ff']]),
    shape: '<rect x="14" y="5" width="36" height="52" rx="6"/>',
    rim: '#4b5a69',
    inner:
      '<rect x="18" y="10" width="28" height="13" rx="2.2" fill="url(#lcd)" stroke="#2f6f9c" stroke-opacity=".6" stroke-width=".7"/>' +
      '<path d="M33 13.5 h3.4 v7 M39 13.5 h3.6 v3.5 h-3.6 v3.5 h3.6" stroke="#0b3d73" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      keys,
    causticEl: '<ellipse cx="32" cy="58" rx="16" ry="4" fill="url(#caustic)"/>',
    shineEl: '<ellipse cx="28" cy="10" rx="17" ry="9" fill="url(#shine)" opacity=".8"/>',
  });
}

// Notepad: spiral pad with a blue cover strip and a yellow pencil.
{
  let rings = '';
  for (let i = 0; i < 6; i++) rings += `<rect x="${17 + i * 6}" y="4" width="2.4" height="9" rx="1.2" fill="url(#ring)" stroke="#6b7b8b" stroke-opacity=".6" stroke-width=".5"/>`;
  let lines = '';
  for (let y = 24; y <= 52; y += 5.6) lines += `<path d="M14 ${y} H50" stroke="#8cc2ec" stroke-width=".9"/>`;
  icons.notepad = icon({
    defs:
      linear('body', [[0, '#ffffff'], [0.6, '#fbfbf2'], [1, '#e8e6cf']]) +
      linear('cover', [[0, '#d4f0ff'], [0.5, '#6cc4ff'], [0.5, '#2f97e8'], [1, '#0a6fd1']]) +
      linear('ring', [[0, '#ffffff'], [0.5, '#c9d3dd'], [1, '#8e9aa6']], 1, 0) +
      linear('pen', [[0, '#fff3a8'], [0.5, '#ffd62e'], [1, '#f08a12']], 0, 1),
    shape: '<rect x="11" y="8" width="42" height="50" rx="3"/>',
    rim: '#5b89b4',
    inner:
      '<rect x="11" y="8" width="42" height="9" fill="url(#cover)"/>' +
      lines +
      '<path d="M20 17 V58" stroke="#f08a80" stroke-width=".9"/>',
    over:
      rings +
      '<g transform="rotate(40 46 42)"><rect x="42" y="22" width="7" height="26" rx="1.5" fill="url(#pen)" stroke="#c86a0a" stroke-opacity=".6" stroke-width=".6"/><rect x="42" y="20" width="7" height="4" rx="1.2" fill="#f5a3b5"/><rect x="42" y="23.5" width="7" height="2" fill="#c9d3dd"/><path d="M42 48 L45.5 55 L49 48 Z" fill="#f6dcb5"/><path d="M44.4 52.8 L45.5 55 L46.6 52.8 Z" fill="#1e2a35"/><rect x="43" y="24" width="2" height="23" rx="1" fill="#fff" fill-opacity=".5"/></g>',
    causticEl: '<ellipse cx="32" cy="58" rx="20" ry="4" fill="url(#caustic)"/>',
    shineEl: '<ellipse cx="28" cy="14" rx="20" ry="10" fill="url(#shine)" opacity=".85"/>',
  });
}

// Paint palette with gel paint blobs and a brush.
icons.paint = icon({
  defs:
    radial('body', '#ffffff', '#eef3f7', '#aebdcc', 0.4, 0.25) +
    radial('red', '#ffd6cc', '#ff5a3c', '#b8260f', 0.35, 0.3) +
    radial('yel', '#fffbd6', '#ffd62e', '#e08a0a', 0.35, 0.3) +
    radial('grn', '#e2ffd0', '#45c93a', '#157a1f', 0.35, 0.3) +
    radial('blu', '#d4f0ff', '#3aa6f5', '#0a4f9c', 0.35, 0.3) +
    radial('pnk', '#ffe0f0', '#ff7ab8', '#c2336f', 0.35, 0.3) +
    linear('handle', [[0, '#7cc8ff'], [0.5, '#1f8fe6'], [1, '#0b3d73']], 1, 0),
  shape: '<path d="M32 8 C 50 8 60 20 58 33 C 56 44 46 42 42 46 C 38 50 44 56 34 57 C 18 58 6 48 6 32 C 6 18 17 8 32 8 Z"/>',
  rim: '#5b6f84',
  inner:
    '<circle cx="18" cy="42" r="5" fill="#dbe4ec" stroke="#8ea3b8" stroke-opacity=".6"/>' +
    '<circle cx="19" cy="24" r="5.2" fill="url(#red)"/><circle cx="31" cy="17" r="5.2" fill="url(#yel)"/>' +
    '<circle cx="44" cy="20" r="5.2" fill="url(#grn)"/><circle cx="50" cy="32" r="4.8" fill="url(#blu)"/>' +
    '<circle cx="30" cy="30" r="4.2" fill="url(#pnk)"/>' +
    '<g fill="#fff" fill-opacity=".85"><ellipse cx="17.6" cy="22.2" rx="2" ry="1.2"/><ellipse cx="29.6" cy="15.2" rx="2" ry="1.2"/><ellipse cx="42.6" cy="18.2" rx="2" ry="1.2"/><ellipse cx="48.8" cy="30.4" rx="1.8" ry="1.1"/><ellipse cx="28.9" cy="28.5" rx="1.6" ry="1"/></g>',
  causticEl: '<ellipse cx="30" cy="57" rx="18" ry="6" fill="url(#caustic)"/>',
  shineEl: '<ellipse cx="30" cy="14" rx="22" ry="9" fill="url(#shine)" opacity=".6"/>',
  over:
    '<g transform="rotate(-38 40 44)"><rect x="37" y="34" width="6" height="26" rx="3" fill="url(#handle)" stroke="#0b3d73" stroke-opacity=".5" stroke-width=".6"/><rect x="37.6" y="28" width="4.8" height="7" rx="1" fill="#c9d3dd" stroke="#6b7b8b" stroke-opacity=".6" stroke-width=".5"/><path d="M37.8 28 C 37.8 22, 40 19, 40 16 C 40 19, 42.2 22, 42.2 28 Z" fill="#ff5a3c" stroke="#b8260f" stroke-opacity=".6" stroke-width=".5"/><rect x="38.4" y="36" width="1.6" height="22" rx=".8" fill="#fff" fill-opacity=".45"/></g>',
});

// Command console.
icons.cmd = icon({
  defs:
    radial('body', '#ffffff', '#d5dde5', '#7b8896') +
    linear('bar', [[0, '#d4f0ff'], [0.5, '#6cc4ff'], [0.5, '#2f97e8'], [1, '#0a6fd1']]) +
    linear('scr', [[0, '#1b2632'], [1, '#05080c']]),
  shape: '<rect x="5" y="9" width="54" height="44" rx="4"/>',
  rim: '#33414f',
  inner:
    '<rect x="5" y="9" width="54" height="9" fill="url(#bar)"/>' +
    '<rect x="8" y="18" width="48" height="32" rx="1" fill="url(#scr)"/>' +
    '<path d="M13 26 L19 30.5 L13 35" stroke="#e6edf3" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="22" y="33" width="9" height="2.6" rx=".8" fill="#e6edf3"/>' +
    '<rect x="13" y="40" width="22" height="1.8" rx=".9" fill="#7c8a98"/><rect x="13" y="44" width="30" height="1.8" rx=".9" fill="#56626f"/>' +
    '<circle cx="51" cy="13.5" r="2" fill="#ff7a62" stroke="#fff" stroke-opacity=".7" stroke-width=".5"/>',
  causticEl: '<ellipse cx="32" cy="53" rx="20" ry="4" fill="url(#caustic)" opacity=".6"/>',
  shineEl: '<ellipse cx="32" cy="10" rx="30" ry="9" fill="url(#shine)" opacity=".75"/>',
});

// Task Manager: console window with a live green graph.
icons.taskmgr = icon({
  defs:
    radial('body', '#ffffff', '#d5dde5', '#7b8896') +
    linear('bar', [[0, '#e2ffd0'], [0.5, '#8fe05a'], [0.5, '#45c93a'], [1, '#157a1f']]) +
    linear('scr', [[0, '#0e1f14'], [1, '#040a06']]),
  shape: '<rect x="5" y="9" width="54" height="44" rx="4"/>',
  rim: '#33414f',
  inner:
    '<rect x="5" y="9" width="54" height="9" fill="url(#bar)"/>' +
    '<rect x="8" y="18" width="48" height="32" rx="1" fill="url(#scr)"/>' +
    '<path d="M8 26 H56 M8 34 H56 M8 42 H56 M20 18 V50 M32 18 V50 M44 18 V50" stroke="#1d7a33" stroke-opacity=".55" stroke-width=".6"/>' +
    '<path d="M8 44 L14 40 L19 42 L24 30 L29 36 L34 24 L39 33 L44 28 L49 35 L56 22" stroke="#6dff7a" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<path d="M8 44 L14 40 L19 42 L24 30 L29 36 L34 24 L39 33 L44 28 L49 35 L56 22 L56 50 L8 50 Z" fill="#45c93a" fill-opacity=".18"/>',
  causticEl: '<ellipse cx="32" cy="53" rx="20" ry="4" fill="url(#caustic)" opacity=".6"/>',
  shineEl: '<ellipse cx="32" cy="10" rx="30" ry="9" fill="url(#shine)" opacity=".75"/>',
});

// Playing cards (Solitaire).
icons.cards = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${COMMON}${linear('back', [[0, '#8fd3ff'], [0.5, '#3aa6f5'], [0.5, '#1f8fe6'], [1, '#0a6fd1']])}${linear('face', [[0, '#ffffff'], [1, '#e9f1f8']])}<pattern id="pt" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" fill="#fff" fill-opacity=".35"/></pattern></defs><ellipse cx="32" cy="60.5" rx="19" ry="2.8" fill="url(#floor)"/><g transform="rotate(-14 24 34)"><rect x="9" y="12" width="28" height="40" rx="3.5" fill="url(#back)" stroke="#0b3d73" stroke-opacity=".6"/><rect x="12" y="15" width="22" height="34" rx="2" fill="url(#pt)" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/><ellipse cx="20" cy="18" rx="10" ry="5" fill="url(#shine)" opacity=".7"/></g><g transform="rotate(10 40 34)"><rect x="26" y="10" width="28" height="40" rx="3.5" fill="url(#face)" stroke="#5b89b4" stroke-opacity=".7"/><path d="M40 38 C 30 31, 33 22, 40 27 C 47 22, 50 31, 40 38 Z" fill="#e0301e"/><path d="M36.5 26.5 C 35 27, 34.6 29, 35.6 30.2" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" fill="none" stroke-linecap="round"/><text x="29" y="18.5" font-family="Segoe UI, Selawik, sans-serif" font-size="7" font-weight="700" fill="#e0301e">A</text><ellipse cx="38" cy="14" rx="12" ry="5" fill="url(#shine)" opacity=".6"/></g></svg>`;

// Minesweeper: a glossy mine with a red flag.
{
  let spikes = '';
  for (let i = 0; i < 8; i++) spikes += `<rect x="29" y="15" width="4" height="36" rx="2" fill="#23364d" transform="rotate(${i * 22.5} 31 33)"/>`;
  icons.mine = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${COMMON}${radial('body', '#b9c9da', '#2e4c73', '#0b1a2e', 0.35, 0.3)}${linear('flag', [[0, '#ffb3a3'], [0.5, '#ff5a3c'], [1, '#c8412a']])}</defs><ellipse cx="32" cy="60.5" rx="19" ry="2.8" fill="url(#floor)"/>${spikes}<circle cx="31" cy="33" r="14" fill="url(#body)" stroke="#07111f" stroke-opacity=".6"/><ellipse cx="26.5" cy="27" rx="6.5" ry="4" fill="url(#shine)" transform="rotate(-25 26.5 27)"/><circle cx="36" cy="40" r="2" fill="#fff" fill-opacity=".35"/><path d="M44 8 V30" stroke="#5f6f80" stroke-width="2" stroke-linecap="round"/><path d="M45 8 L58 13 L45 19 Z" fill="url(#flag)" stroke="#8a2412" stroke-opacity=".5" stroke-width=".6"/><path d="M46 10 L53 12.5" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}

// Memory pairs: two tiles, one face-down with a question mark, one with a star.
icons.pairs = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${COMMON}${linear('a', [[0, '#e2ffd0'], [0.5, '#8fe05a'], [0.5, '#45c93a'], [1, '#157a1f']])}${linear('b', [[0, '#ffffff'], [0.5, '#f1f5f9'], [0.5, '#dde5ec'], [1, '#f4f7fa']])}${radial('star', '#fffbd6', '#ffd62e', '#f08a12', 0.4, 0.3)}</defs><ellipse cx="32" cy="60.5" rx="19" ry="2.8" fill="url(#floor)"/><g transform="rotate(-10 22 32)"><rect x="6" y="14" width="30" height="34" rx="5" fill="url(#a)" stroke="#146b18" stroke-opacity=".6"/><text x="21" y="40" text-anchor="middle" font-family="Segoe UI, Selawik, sans-serif" font-size="22" font-weight="700" fill="#fff" stroke="#146b18" stroke-opacity=".3" stroke-width=".8">?</text><ellipse cx="18" cy="18" rx="12" ry="5" fill="url(#shine)" opacity=".75"/></g><g transform="rotate(8 42 32)"><rect x="28" y="12" width="30" height="34" rx="5" fill="url(#b)" stroke="#5b89b4" stroke-opacity=".7"/><path d="M43 18 L46.5 25.5 L54.5 26.3 L48.5 31.6 L50.3 39.5 L43 35.4 L35.7 39.5 L37.5 31.6 L31.5 26.3 L39.5 25.5 Z" fill="url(#star)" stroke="#c86a0a" stroke-opacity=".6" stroke-width=".7" stroke-linejoin="round"/><ellipse cx="41" cy="16" rx="12" ry="5" fill="url(#shine)" opacity=".7"/></g></svg>`;

// Sticky note.
icons.sticky = icon({
  defs: linear('body', [[0, '#fffbd0'], [0.55, '#fff08a'], [1, '#ffd84a']]) + linear('fold', [[0, '#fff6b0'], [1, '#e8c02a']], 1, 1),
  shape: '<path d="M9 8 H55 V44 L43 56 H9 Z"/>',
  rim: '#b8900a',
  inner:
    '<path d="M15 20 H49 M15 27 H49 M15 34 H45 M15 41 H38" stroke="#d9b21a" stroke-opacity=".55" stroke-width="1.1"/>' +
    '<path d="M16 19 C 22 17, 27 21, 33 18.5" stroke="#0a6fd1" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M16 26 C 21 24.5, 29 27.5, 38 25.5" stroke="#0a6fd1" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  over: '<path d="M43 56 L43 46 Q43 44 45 44 L55 44 Z" fill="url(#fold)" stroke="#b8900a" stroke-opacity=".55" stroke-width=".8"/>',
  causticEl: '<ellipse cx="30" cy="56" rx="18" ry="4" fill="url(#caustic)" opacity=".7"/>',
  shineEl: '<ellipse cx="30" cy="12" rx="24" ry="9" fill="url(#shine)" opacity=".8"/>',
});

// Desktop gadgets: a glass sidebar carrying a clock and a meter.
icons.gadgets = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${COMMON}${linear('glass', [[0, '#bfe9ff', 0.85], [1, '#3aa6f5', 0.55]])}${radial('face', '#ffffff', '#eef5fb', '#9fb6cc', 0.4, 0.3)}${radial('meter', '#1b2a3a', '#0b1622', '#000', 0.5, 0.4)}</defs><ellipse cx="32" cy="60.5" rx="19" ry="2.8" fill="url(#floor)"/><rect x="14" y="4" width="36" height="54" rx="6" fill="url(#glass)" stroke="#0a5a8a" stroke-opacity=".55"/><circle cx="32" cy="19" r="10.5" fill="url(#face)" stroke="#5b89b4" stroke-opacity=".7"/><path d="M32 19 V12.5 M32 19 L37 21.5" stroke="#1e2a35" stroke-width="1.6" stroke-linecap="round"/><circle cx="32" cy="19" r="1.2" fill="#e0301e"/><circle cx="32" cy="42" r="10" fill="url(#meter)" stroke="#8e9aa6" stroke-width="1.2"/><path d="M25 45 A 7.5 7.5 0 0 1 39 45" stroke="#45c93a" stroke-width="2" fill="none"/><path d="M32 44 L36 37.5" stroke="#ff5a3c" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="30" cy="9" rx="15" ry="5" fill="url(#shine)" opacity=".8"/></svg>`;

// Full recycle bin: the design system's bin with crumpled paper spilling over the lid.
{
  const bin = readFileSync(join(root, 'design-system/assets/icons/trash.svg'), 'utf8');
  const paper =
    '<g><path d="M17 12 C 14 6, 21 1.5, 26 4.5 C 29 0.5, 37 2, 36.5 7.5 C 40.5 8.5, 40 14, 35.5 14 L 19 14 C 15.5 14, 14.5 13, 17 12 Z" fill="#ffffff" stroke="#8ea3b8" stroke-width=".8"/>' +
    '<path d="M21 7 L24.5 10 L27.5 6 M29.5 5 L31.5 10 L34.5 8" stroke="#b9c9da" stroke-width=".8" fill="none"/>' +
    '<path d="M34 12.5 C 35 6.5, 44 5, 46.5 10 C 49 12.5, 47 15.5, 43 15 L 36 15 Z" fill="#fff8d6" stroke="#b8a060" stroke-width=".8"/>' +
    '<path d="M38.5 9 L41 12 L44 9.5" stroke="#d8c690" stroke-width=".8" fill="none"/></g>';
  icons['trash-full'] = bin.replace(/<\/svg>\s*$/, paper + '</svg>');
}

// Run: a small glass window with an arrow entering it.
icons.run = icon({
  defs: radial('body', '#ffffff', '#e3eef8', '#9fb6cc') + linear('bar', [[0, '#d4f0ff'], [0.5, '#7cc8ff'], [0.5, '#3aa6f5'], [1, '#1f8fe6']]) + linear('arr', [[0, '#e2ffd0'], [0.5, '#45c93a'], [1, '#157a1f']]),
  shape: '<rect x="14" y="10" width="44" height="40" rx="4"/>',
  rim: '#4b5a69',
  inner: '<rect x="14" y="10" width="44" height="8" fill="url(#bar)"/><rect x="18" y="22" width="36" height="24" rx="1" fill="#f7fbff" stroke="#b9c9da" stroke-width=".6"/>',
  causticEl: '<ellipse cx="36" cy="50" rx="18" ry="4" fill="url(#caustic)"/>',
  shineEl: '<ellipse cx="34" cy="12" rx="22" ry="8" fill="url(#shine)" opacity=".75"/>',
  over: '<path d="M4 34 H26 V27 L40 37 L26 47 V40 H4 Z" fill="url(#arr)" stroke="#146b18" stroke-opacity=".6" stroke-width=".8" stroke-linejoin="round"/><path d="M6 36 H27" stroke="#fff" stroke-opacity=".6" stroke-width="1.2" stroke-linecap="round"/>',
});

// Channels: Technozen tile grid.
icons.channels = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${COMMON}${linear('tile', [[0, '#ffffff'], [1, '#e6edf3']])}${radial('o1', '#d4f0ff', '#3aa6f5', '#0a6fd1', 0.4, 0.3)}${radial('o2', '#e2ffd0', '#45c93a', '#157a1f', 0.4, 0.3)}${radial('o3', '#fffbd6', '#ffd62e', '#f08a12', 0.4, 0.3)}${radial('o4', '#ffe6f2', '#ff8fc4', '#d14a8a', 0.4, 0.3)}</defs><ellipse cx="32" cy="60.5" rx="19" ry="2.8" fill="url(#floor)"/><rect x="5" y="8" width="54" height="46" rx="8" fill="#eef2f6" stroke="#7d8e9d" stroke-opacity=".6"/>${[
  [9, 12, 'o1'], [33, 12, 'o2'], [9, 33, 'o3'], [33, 33, 'o4'],
].map(([x, y, o]) => `<rect x="${x}" y="${y}" width="22" height="17" rx="4" fill="url(#tile)" stroke="#9aa9b7" stroke-width=".8"/><circle cx="${x + 11}" cy="${y + 8.5}" r="5" fill="url(#${o})"/><ellipse cx="${x + 10}" cy="${y + 6.5}" rx="3" ry="1.6" fill="#fff" fill-opacity=".8"/>`).join('')}<ellipse cx="32" cy="12" rx="26" ry="6" fill="url(#shine)" opacity=".6"/></svg>`;

// Personalization: monitor showing a meadow with a paint swatch fan.
icons.personalize = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${COMMON}${radial('body', '#ffffff', '#d5dde5', '#7b8896')}${linear('scr', [[0, '#1f8fe6'], [0.62, '#bfe6ff'], [0.62, '#45c93a'], [1, '#157a1f']])}</defs><ellipse cx="32" cy="60.5" rx="19" ry="2.8" fill="url(#floor)"/><path d="M24 44 L36 44 L38 51 L22 51 Z" fill="#8e9aa6"/><rect x="16" y="50" width="28" height="4" rx="2" fill="#aab4be"/><rect x="4" y="8" width="50" height="36" rx="4" fill="url(#body)" stroke="#4b5a69" stroke-opacity=".55"/><rect x="7" y="11" width="44" height="30" rx="1.5" fill="url(#scr)"/><circle cx="42" cy="17" r="3.5" fill="#fff6c2"/><ellipse cx="29" cy="12" rx="24" ry="6" fill="url(#shine)" opacity=".75"/>${[
  ['#ff5a3c', -34], ['#ffd62e', -18], ['#45c93a', -2], ['#3aa6f5', 14], ['#ff7ab8', 30],
].map(([c, a]) => `<rect x="47" y="26" width="7" height="26" rx="3.5" fill="${c}" stroke="#fff" stroke-width="1" transform="rotate(${a} 50.5 50)"/>`).join('')}<circle cx="50.5" cy="50" r="2.4" fill="#fff" stroke="#8e9aa6"/></svg>`;

for (const [name, svg] of Object.entries(icons)) writeFileSync(join(out, name + '.svg'), svg);
console.log('icons written:', Object.keys(icons).join(', '));
