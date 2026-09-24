/* Aerium Paint: a glossy ribbon, classic tools, era brushes (bubbles,
   rainbows, sparkles, glass gel), shapes that stay editable until you click
   away, stickers from the glossy icon set, selections, text, undo and the
   family-computer favorite: "Set as desktop background".
   Brush, texture and shape engines live in brushes.js (Aerium.paintBrushes). */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;
  const E = A.paintBrushes;
  const C = E.color;
  const TAU = Math.PI * 2;

  // ================================================================== constants
  const PALETTE = [
    ['#ffffff', 'Cloud white'], ['#ffc2d6', 'Blossom pink'], ['#ffd8a8', 'Peach'], ['#fff6a8', 'Butter yellow'], ['#c9f5a0', 'Spring green'], ['#bfeeff', 'Sky blue'], ['#e3ccff', 'Lavender'],
    ['#c3ccd6', 'Silver'], ['#ff6b9a', 'Bubblegum'], ['#ff9a2e', 'Tangerine'], ['#ffe135', 'Sunshine'], ['#7ed321', 'Lime'], ['#3ec6f0', 'Aqua'], ['#b57cff', 'Violet'],
    ['#6b7885', 'Slate'], ['#e8202a', 'Ruby red'], ['#c46a2a', 'Cinnamon'], ['#ffc20e', 'Gold'], ['#2eb82e', 'Grass green'], ['#1a7fe0', 'Ocean blue'], ['#7a3ccc', 'Grape'],
    ['#000000', 'Black'], ['#8a0f1c', 'Cherry'], ['#6b3a1a', 'Cocoa'], ['#a67c00', 'Honey'], ['#0f6b2a', 'Forest'], ['#0b3a8a', 'Navy'], ['#3f1a73', 'Plum'],
  ];
  const ZOOMS = [0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8];
  const SHAPE_SIZES = [1, 3, 5, 8, 12];
  const STICKERS = ['fish', 'dolphin', 'bubble', 'butterfly', 'flower', 'leaf', 'tree', 'sun', 'cloud', 'rainbow', 'moon', 'star',
    'heart', 'music', 'droplet', 'snow', 'rain', 'globe', 'gift', 'mountain', 'lightbulb', 'camera', 'gamepad', 'aquarium'];
  const STICKER_NAMES = { aquarium: 'Fishbowl', lightbulb: 'Light bulb', gamepad: 'Game pad' };
  const FONTS = ['Selawik', 'M PLUS Rounded 1c', 'Michroma', 'Georgia', 'Times New Roman', 'Arial', 'Verdana', 'Trebuchet MS', 'Comic Sans MS', 'Courier New', 'Impact'];
  const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96];
  const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'];
  const MAX_DIM = 4096;
  const PAD = 10;
  const DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const DIR_CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
  const FUN_BRUSHES = ['bubbles', 'rainbow', 'sparkle', 'gel'];

  // ================================================================== icons
  // Glossy glyphs drawn in the design system's recipe (lit from the top left,
  // darker rim, white shine, soft floor). Served as data: URL images so their
  // gradient ids never collide.
  const svgURL = (body, vb = 32) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" width="${vb}" height="${vb}">${body}</svg>`);
  const stops = (list) => list.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a == null ? '' : ` stop-opacity="${a}"`}/>`).join('');
  const lg = (id, list, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;
  const rg = (id, list, cx = 0.4, cy = 0.3, r = 0.8) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`;
  const FLOOR = (cx = 16, cy = 29.6, rx = 11) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="1.6" fill="#0b2a4a" opacity=".14"/>`;
  const METAL = lg('mt', [[0, '#ffffff'], [0.5, '#c9d3dd'], [1, '#8e9aa6']], 1, 0);
  const GEL = (id, c) => lg(id, [[0, C.lighten(c, 0.62)], [0.5, C.lighten(c, 0.25)], [0.5, c], [1, C.darken(c, 0.12)]]);
  const SKY = lg('sky', [[0, '#2f97ea'], [1, '#cfeeff']]) + lg('grass', [[0, '#8fe05a'], [1, '#2f9e35']]);
  const pic = (x, y, w, hh) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="1.2" fill="url(#sky)" stroke="#2f5f8c" stroke-width=".9"/><path d="M${x + 0.5} ${y + hh * 0.72}C${x + w * 0.3} ${y + hh * 0.52} ${x + w * 0.62} ${y + hh * 0.84} ${x + w - 0.5} ${y + hh * 0.6}V${y + hh - 0.5}H${x + 0.5}Z" fill="url(#grass)"/><circle cx="${x + w * 0.72}" cy="${y + hh * 0.3}" r="${Math.min(w, hh) * 0.12}" fill="#fff6c2"/>`;
  const CURSOR_ARROW = '<path d="M17 14V29L20.6 25.6L23.2 31L25.8 29.8L23.2 24.5L28 24.2Z" fill="#fff" stroke="#0b2a4a" stroke-width="1.1" stroke-linejoin="round"/>';
  const lens = (glyph) => `<defs>${rg('l', [[0, '#ffffff', 0.95], [0.6, '#d4f0ff', 0.8], [1, '#7cc8ff', 0.85]], 0.35, 0.3, 0.8)}${lg('hd', [[0, '#7cc8ff'], [0.5, '#1f8fe6'], [1, '#0b3d73']], 1, 1)}</defs><path d="M19 19L27.5 27.5" stroke="#0b3d73" stroke-width="6.2" stroke-linecap="round"/><path d="M19 19L27.5 27.5" stroke="url(#hd)" stroke-width="4" stroke-linecap="round"/><circle cx="13" cy="13" r="9.4" fill="url(#l)" stroke="#56626f" stroke-width="2.4"/><circle cx="13" cy="13" r="8.2" fill="none" stroke="#fff" stroke-width=".8" opacity=".8"/>${glyph || ''}<ellipse cx="10.2" cy="9.4" rx="4.4" ry="2.4" fill="#fff" opacity=".75" transform="rotate(-35 10.2 9.4)"/>`;
  const ICONS = {
    pencil: () => `<defs>${lg('b', [[0, '#fff6c2'], [0.45, '#ffd62e'], [1, '#e88a0c']], 1, 0)}${METAL}${lg('e', [[0, '#ffd0e0'], [1, '#ff6f9f']], 1, 0)}</defs>${FLOOR(12, 29.6, 8)}<g transform="rotate(45 16 16)"><path d="M12.5 8H19.5V23L16 30.5L12.5 23Z" fill="url(#b)" stroke="#9a5a00" stroke-width=".8" stroke-linejoin="round"/><path d="M12.5 23L16 30.5L19.5 23Z" fill="#f7dcb2" stroke="#a8773f" stroke-width=".7" stroke-linejoin="round"/><path d="M14.9 28.1L16 30.5L17.1 28.1Z" fill="#2b3440"/><rect x="12.5" y="4.6" width="7" height="3.6" fill="url(#mt)" stroke="#6b7b8b" stroke-width=".6"/><path d="M12.5 4.8V3.8A3.5 2.8 0 0 1 19.5 3.8V4.8Z" fill="url(#e)" stroke="#c2336f" stroke-width=".6"/><rect x="13.4" y="8.5" width="1.8" height="14" fill="#fff" opacity=".6"/></g>`,
    fill: (c) => `<defs>${lg('m', [[0, '#ffffff'], [0.5, '#d6e0e9'], [1, '#8e9aa6']], 1, 0)}${lg('p', [[0, C.lighten(c, 0.45)], [1, c]])}</defs>${FLOOR(15, 29.6, 11)}<g transform="rotate(-28 14 17)"><path d="M6 12L22 12L20.2 26.5Q14 29 7.8 26.5Z" fill="url(#m)" stroke="#56626f" stroke-width=".9" stroke-linejoin="round"/><ellipse cx="14" cy="12" rx="8" ry="2.7" fill="url(#p)" stroke="${C.darken(c, 0.35)}" stroke-width=".8"/><path d="M7 12C7 3 21 3 21 12" fill="none" stroke="#56626f" stroke-width="1.3"/><rect x="9" y="14.5" width="2" height="10" rx="1" fill="#fff" opacity=".75"/></g><path d="M26 14.5C27.6 18 29 20 29 22.3A3 3 0 0 1 23 22.3C23 20 24.4 18 26 14.5Z" fill="url(#p)" stroke="${C.darken(c, 0.35)}" stroke-width=".8"/><ellipse cx="25" cy="20.8" rx=".9" ry="1.4" fill="#fff" opacity=".8"/>`,
    text: () => `<defs>${lg('g', [[0, '#d4f0ff'], [0.5, '#5fb8f7'], [0.5, '#1f8fe6'], [1, '#0a6fd1']])}</defs>${FLOOR(16, 29.8, 11)}<path d="M4.5 28L13.4 4H18.6L27.5 28H22.2L20.3 22.5H11.7L9.8 28ZM13.2 18.2H18.8L16 10.1Z" fill="url(#g)" stroke="#0b3d73" stroke-width="1" stroke-linejoin="round" fill-rule="evenodd"/><path d="M14.2 5.2H17.8L19.2 9.2H12.8Z" fill="#fff" opacity=".6"/>`,
    eraser: () => `<defs>${lg('p', [[0, '#ffe0ea'], [0.5, '#ff9fbf'], [0.5, '#ff7aa8'], [1, '#e8568a']])}${lg('b', [[0, '#d4f0ff'], [0.5, '#7cc8ff'], [0.5, '#3aa6f5'], [1, '#1a7fe0']])}</defs>${FLOOR(16, 28.8, 12)}<g transform="rotate(-32 16 17)"><rect x="3" y="11" width="26" height="12" rx="3" fill="url(#p)" stroke="#b83268" stroke-width=".9"/><path d="M14 11H26A3 3 0 0 1 29 14V20A3 3 0 0 1 26 23H14Z" fill="url(#b)" stroke="#0a4f9c" stroke-width=".9"/><rect x="4.5" y="12.2" width="23" height="3.6" rx="1.8" fill="#fff" opacity=".55"/></g>`,
    picker: (c) => `<defs>${lg('bu', [[0, '#7cc8ff'], [1, '#0b3d73']], 1, 0)}${lg('gl', [[0, '#ffffff', 0.95], [1, '#cfe8fc', 0.7]], 1, 0)}</defs>${FLOOR(8, 29.4, 6)}<g transform="rotate(45 16 16)"><rect x="12.6" y=".8" width="6.8" height="9" rx="3.4" fill="url(#bu)" stroke="#0b3d73" stroke-width=".8"/><rect x="11.3" y="9.2" width="9.4" height="2.8" rx="1.2" fill="#c9d3dd" stroke="#6b7b8b" stroke-width=".6"/><path d="M13.3 12H18.7L18.2 25L16 30.5L13.8 25Z" fill="url(#gl)" stroke="#4f7fae" stroke-width=".8" stroke-linejoin="round"/><path d="M13.75 19H18.25L18.1 25L16 29.6L13.9 25Z" fill="${c}"/><rect x="14.2" y="12.6" width="1.3" height="11" rx=".6" fill="#fff" opacity=".85"/><ellipse cx="14.8" cy="3.6" rx="1.3" ry="2" fill="#fff" opacity=".55"/></g>`,
    zoom: () => lens(),
    zoomin: () => lens('<path d="M8.6 13H17.4M13 8.6V17.4" stroke="#0a6fd1" stroke-width="2.6" stroke-linecap="round"/>'),
    zoomout: () => lens('<path d="M8.6 13H17.4" stroke="#0a6fd1" stroke-width="2.6" stroke-linecap="round"/>'),
    zoom100: () => lens('<path d="M10.2 10.4L12.2 9V17M15 10.2H16.6M15 15.6H16.6" stroke="#0a6fd1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
    brush: (c) => `<defs>${lg('h', [[0, '#7cc8ff'], [0.5, '#1f8fe6'], [1, '#0b3d73']], 1, 0)}${METAL}${lg('t', [[0, C.lighten(c, 0.45)], [1, c]], 1, 0)}</defs>${FLOOR(10, 29.6, 7)}<g transform="rotate(40 16 16)"><rect x="13.6" y="0" width="4.8" height="16" rx="2.4" fill="url(#h)" stroke="#0b3d73" stroke-width=".7"/><rect x="14.4" y="1" width="1.4" height="13" rx=".7" fill="#fff" opacity=".6"/><path d="M12.8 15.4H19.2L18.8 21H13.2Z" fill="url(#mt)" stroke="#6b7b8b" stroke-width=".7"/><path d="M13.2 21C12.4 25 13.8 28.5 16 31.5C18.2 28.5 19.6 25 18.8 21Z" fill="url(#t)" stroke="${C.darken(c, 0.35)}" stroke-width=".7"/><path d="M14.4 22C14 25 14.8 27.4 15.8 29" fill="none" stroke="#fff" stroke-width=".9" opacity=".7"/></g>`,
    select: () => `<rect x="3.5" y="4.5" width="21" height="17" rx="1" fill="#dbeefe" fill-opacity=".75" stroke="#0a6fd1" stroke-width="1.6" stroke-dasharray="3 2.2"/>${CURSOR_ARROW}`,
    selectFree: () => `<path d="M6 10C4 5 12 3 16 5C21 3 28 6 25 12C23 16 27 20 21 22C15 24 9 23 7 19C5 16 8 13 6 10Z" fill="#dbeefe" fill-opacity=".75" stroke="#0a6fd1" stroke-width="1.6" stroke-dasharray="3 2.2"/>${CURSOR_ARROW}`,
    crop: () => `<defs>${SKY}</defs>${pic(9.5, 9.5, 13, 13)}<path d="M8 3V24H29" fill="none" stroke="#0b3d73" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 3V24H29" fill="none" stroke="#7cc8ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8H24V29" fill="none" stroke="#157a1f" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8H24V29" fill="none" stroke="#8fe05a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    resize: () => `<defs>${SKY}</defs><rect x="3.5" y="3.5" width="25" height="25" rx="1.5" fill="none" stroke="#5b89b4" stroke-width="1.2" stroke-dasharray="2.5 2"/>${pic(3.5, 14.5, 14, 14)}<path d="M18 14L27 5M21 5H27V11" fill="none" stroke="#0b3d73" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 14L27 5M21 5H27V11" fill="none" stroke="#35c93a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    rotate: () => `<defs>${SKY}</defs>${pic(4, 11, 16, 16)}<path d="M13 6.5C20 3 27 7 27.5 15" fill="none" stroke="#0b3d73" stroke-width="3.6" stroke-linecap="round"/><path d="M13 6.5C20 3 27 7 27.5 15" fill="none" stroke="#35c93a" stroke-width="1.8" stroke-linecap="round"/><path d="M23.4 13.6L27.6 18.8L31 13.2Z" fill="#35c93a" stroke="#0b3d73" stroke-width=".9" stroke-linejoin="round"/>`,
    flip: () => `<defs>${GEL('g', '#3aa6f5')}</defs><path d="M14 5L3 25H14Z" fill="url(#g)" stroke="#0b3d73" stroke-width="1" stroke-linejoin="round"/><path d="M18 5L29 25H18Z" fill="#eaf5ff" stroke="#5b89b4" stroke-width="1" stroke-dasharray="2 1.6" stroke-linejoin="round"/><path d="M16 2V29" stroke="#f08a12" stroke-width="1.4" stroke-dasharray="2.2 1.6"/>`,
    invert: () => `<defs>${rg('a', [[0, '#ffffff'], [1, '#c9d3dd']])}${rg('b', [[0, '#2f5f8c'], [1, '#04142b']], 0.6, 0.7, 0.8)}</defs>${FLOOR(16, 29.6, 10)}<circle cx="16" cy="15" r="12" fill="url(#a)" stroke="#2f5f8c" stroke-width="1"/><path d="M24.5 6.5A12 12 0 0 1 7.5 23.5Z" fill="url(#b)"/><circle cx="16" cy="15" r="12" fill="none" stroke="#2f5f8c" stroke-width="1"/><ellipse cx="12.5" cy="8.5" rx="6" ry="3" fill="#fff" opacity=".6" transform="rotate(-30 12.5 8.5)"/>`,
    clear: () => `<defs>${lg('pg', [[0, '#ffffff'], [1, '#e3f2fd']])}</defs><path d="M6 3H20L26 9V29H6Z" fill="url(#pg)" stroke="#5b89b4" stroke-width="1" stroke-linejoin="round"/><path d="M20 3V9H26" fill="#d4f0ff" stroke="#5b89b4" stroke-width="1" stroke-linejoin="round"/><path d="M15 12L16.4 16.6L21 18L16.4 19.4L15 24L13.6 19.4L9 18L13.6 16.6Z" fill="#ffd62e" stroke="#f08a12" stroke-width=".7" stroke-linejoin="round"/><circle cx="21.5" cy="12.5" r="1.3" fill="#7cc8ff"/>`,
    paste: () => `<defs>${lg('wd', [[0, '#ffd8a8'], [0.5, '#f0a050'], [0.5, '#d9822b'], [1, '#b8651a']])}${METAL}</defs>${FLOOR(16, 30, 10)}<rect x="5" y="5" width="21" height="24.5" rx="2.5" fill="url(#wd)" stroke="#8a4b12" stroke-width=".9"/><rect x="8.2" y="9" width="14.6" height="18" rx="1" fill="#fff" stroke="#9fb3c8" stroke-width=".7"/><path d="M10.8 14H20.2M10.8 17.5H20.2M10.8 21H17" stroke="#7cc8ff" stroke-width="1.3" stroke-linecap="round"/><rect x="10.5" y="2.4" width="10" height="5.2" rx="1.6" fill="url(#mt)" stroke="#6b7b8b" stroke-width=".7"/><rect x="6" y="6" width="2" height="21" rx="1" fill="#fff" opacity=".35"/>`,
    cut: () => `<defs>${METAL}${lg('r', [[0, '#ff9a8a'], [1, '#c8412a']])}${lg('b', [[0, '#7cc8ff'], [1, '#0a4f9c']])}</defs><path d="M16.3 16.8L26.5 3.5M16.3 16.8L5.5 3.5" stroke="#56626f" stroke-width="3.8" stroke-linecap="round"/><path d="M16.3 16.8L26.5 3.5M16.3 16.8L5.5 3.5" stroke="url(#mt)" stroke-width="2.2" stroke-linecap="round"/><path d="M16.3 16.8L11.2 22.6" stroke="#8a2412" stroke-width="2.8" stroke-linecap="round"/><circle cx="9" cy="25.4" r="3.7" fill="none" stroke="url(#r)" stroke-width="2.8"/><path d="M16.3 16.8L21.4 22.6" stroke="#0b3d73" stroke-width="2.8" stroke-linecap="round"/><circle cx="23.6" cy="25.4" r="3.7" fill="none" stroke="url(#b)" stroke-width="2.8"/><circle cx="16.3" cy="16.8" r="1.5" fill="#fff" stroke="#56626f" stroke-width=".8"/>`,
    copy: () => `<defs>${lg('pg', [[0, '#ffffff'], [1, '#dbeefe']])}</defs><path d="M4 3H15L19 7V22H4Z" fill="url(#pg)" stroke="#5b89b4" stroke-width=".9" stroke-linejoin="round"/><path d="M13 10H24L28 14V29H13Z" fill="url(#pg)" stroke="#2f5f8c" stroke-width=".9" stroke-linejoin="round"/><path d="M15.5 17H25M15.5 20.5H25M15.5 24H21.5" stroke="#3aa6f5" stroke-width="1.3" stroke-linecap="round"/><path d="M6.5 8H14M6.5 11.5H14" stroke="#9fb3c8" stroke-width="1.2" stroke-linecap="round"/>`,
    size: () => `<path d="M4 5.5H28" stroke="#2f5f8c" stroke-width="1.3" stroke-linecap="round"/><path d="M4 11H28" stroke="#1f4a78" stroke-width="2.5" stroke-linecap="round"/><path d="M4 17.5H28" stroke="#163c66" stroke-width="3.9" stroke-linecap="round"/><path d="M4 25.5H28" stroke="#0b2a4a" stroke-width="5.9" stroke-linecap="round"/><path d="M5.5 24.3H26.5" stroke="#7cc8ff" stroke-width="1.1" stroke-linecap="round" opacity=".75"/><path d="M5 16.6H27" stroke="#7cc8ff" stroke-width=".8" stroke-linecap="round" opacity=".6"/>`,
    outline: (c) => `<rect x="5" y="5" width="22" height="22" rx="4" fill="#fff" stroke="${c}" stroke-width="3.2"/><rect x="5" y="5" width="22" height="22" rx="4" fill="none" stroke="#0b2a4a" stroke-opacity=".35" stroke-width=".8"/>`,
    fillshape: (c) => `<defs>${GEL('g', c)}</defs><rect x="5" y="5" width="22" height="22" rx="4" fill="url(#g)" stroke="${C.darken(c, 0.4)}" stroke-width="1"/><path d="M7 7H25V14C19 16 13 16 7 14Z" fill="#fff" opacity=".35"/>`,
    colors: () => {
      let wedges = '';
      for (let i = 0; i < 12; i++) {
        const a1 = (i / 12) * TAU - Math.PI / 2, a2 = ((i + 1) / 12) * TAU - Math.PI / 2;
        wedges += `<path d="M16 15L${(16 + Math.cos(a1) * 13).toFixed(2)} ${(15 + Math.sin(a1) * 13).toFixed(2)}A13 13 0 0 1 ${(16 + Math.cos(a2) * 13).toFixed(2)} ${(15 + Math.sin(a2) * 13).toFixed(2)}Z" fill="${C.hsl(i * 30, 92, 55)}"/>`;
      }
      return `<defs>${rg('w', [[0, '#ffffff'], [0.25, '#ffffff', 0.85], [1, '#ffffff', 0]], 0.5, 0.5, 0.5)}</defs>${FLOOR(16, 30, 10)}${wedges}<circle cx="16" cy="15" r="13" fill="url(#w)"/><circle cx="16" cy="15" r="13" fill="none" stroke="#0b2a4a" stroke-opacity=".4" stroke-width="1"/><ellipse cx="13" cy="8" rx="8" ry="4" fill="#fff" opacity=".55" transform="rotate(-20 13 8)"/>`;
    },
    undo: () => `<defs>${GEL('g', '#3aa6f5')}</defs><path d="M12 4.5L3 12.5L12 20.5V16C18.5 15.5 23.5 17.5 27.5 25C27 14.5 21 9 12 9Z" fill="url(#g)" stroke="#0b3d73" stroke-width="1.1" stroke-linejoin="round"/><path d="M11 7.4L5.6 12.3L11 11.2C17 10.5 22 12 24.6 16.6C22 11.4 17.4 9.8 11 10.2Z" fill="#fff" opacity=".55"/>`,
    redo: () => `<defs>${GEL('g', '#35c93a')}</defs><g transform="translate(32 0) scale(-1 1)"><path d="M12 4.5L3 12.5L12 20.5V16C18.5 15.5 23.5 17.5 27.5 25C27 14.5 21 9 12 9Z" fill="url(#g)" stroke="#157a1f" stroke-width="1.1" stroke-linejoin="round"/><path d="M11 7.4L5.6 12.3L11 11.2C17 10.5 22 12 24.6 16.6C22 11.4 17.4 9.8 11 10.2Z" fill="#fff" opacity=".55"/></g>`,
    save: () => `<defs>${GEL('b', '#1f8fe6')}${METAL}</defs>${FLOOR(16, 30.2, 11)}<path d="M5.5 4H24L28 8V27A1.5 1.5 0 0 1 26.5 28.5H5.5A1.5 1.5 0 0 1 4 27V5.5A1.5 1.5 0 0 1 5.5 4Z" fill="url(#b)" stroke="#0b3d73" stroke-width="1"/><rect x="9" y="4" width="13" height="8" rx="1" fill="url(#mt)" stroke="#56626f" stroke-width=".7"/><rect x="17.4" y="5.4" width="2.8" height="5.2" rx=".5" fill="#56626f"/><rect x="8" y="16" width="16" height="11" rx="1" fill="#fff" stroke="#9fb3c8" stroke-width=".7"/><path d="M10.5 19.5H21.5M10.5 23H18" stroke="#7cc8ff" stroke-width="1.3" stroke-linecap="round"/>`,
    saveas: () => ICONS.save() + `<g transform="rotate(45 24 22)"><rect x="22" y="12" width="4" height="13" fill="#ffd62e" stroke="#9a5a00" stroke-width=".7"/><path d="M22 25L24 29L26 25Z" fill="#f7dcb2" stroke="#a8773f" stroke-width=".6"/><rect x="22" y="10" width="4" height="2.4" fill="#ff8fb3" stroke="#c2336f" stroke-width=".5"/></g>`,
    grid: () => `<rect x="4" y="4" width="24" height="24" rx="2" fill="#fff" stroke="#5b89b4" stroke-width="1.2"/><path d="M10 4V28M16 4V28M22 4V28M4 10H28M4 16H28M4 22H28" stroke="#7cc8ff" stroke-width="1"/><rect x="10" y="10" width="6" height="6" fill="#3aa6f5"/>`,
    statusbar: () => `<rect x="3.5" y="5.5" width="25" height="21" rx="2" fill="#fff" stroke="#5b89b4" stroke-width="1.2"/><rect x="4" y="21" width="24" height="5" fill="#dbeefe"/><path d="M4 21H28" stroke="#5b89b4"/><path d="M7 23.5H13M17 23.5H20" stroke="#0a6fd1" stroke-width="1.4" stroke-linecap="round"/>`,
    fit: () => `<rect x="7" y="8" width="18" height="16" rx="1.5" fill="#dbeefe" stroke="#5b89b4" stroke-width="1.2"/><path d="M3 9V3H9M23 3H29V9M29 23V29H23M9 29H3V23" fill="none" stroke="#0a6fd1" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    fullscreen: () => `<defs>${SKY}${lg('fr', [[0, '#5b6f84'], [1, '#1e2a35']])}</defs>${FLOOR(16, 30.2, 10)}<rect x="2.5" y="4" width="27" height="19" rx="2" fill="url(#fr)" stroke="#0b2a4a" stroke-width=".8"/>${pic(4.5, 6, 23, 15)}<path d="M13 23H19L20 27H12Z" fill="#8e9aa6"/><rect x="9" y="27" width="14" height="1.8" rx=".9" fill="#56626f"/>`,
    stPos: () => `<path d="M8 1.5V14.5M1.5 8H14.5" stroke="#3f5f7d" stroke-width="1.2"/><circle cx="8" cy="8" r="3.4" fill="#dbeefe" stroke="#0a6fd1" stroke-width="1.3"/>`,
    stSel: () => `<rect x="1.5" y="3.5" width="13" height="9" fill="#dbeefe" stroke="#0a6fd1" stroke-width="1.2" stroke-dasharray="2 1.5"/>`,
    stSize: () => `<path d="M2.5 1.5H10.5L13.5 4.5V14.5H2.5Z" fill="#fff" stroke="#5b89b4" stroke-width="1.1" stroke-linejoin="round"/><path d="M5 11L11 5M8 5H11V8" fill="none" stroke="#35c93a" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    stDisk: () => `<path d="M2.5 1.5H12L14.5 4V14.5H2.5Z" fill="#3aa6f5" stroke="#0b3d73" stroke-width="1" stroke-linejoin="round"/><rect x="5" y="1.5" width="6" height="4" fill="#e3edf5"/><rect x="4.5" y="8.5" width="8" height="5" fill="#fff"/>`,
    opaque: (c) => `<rect x="3" y="4" width="26" height="24" rx="3" fill="${c}" stroke="#5b89b4" stroke-width="1.2"/><path d="M8.5 24L14.4 8H17.6L23.5 24H20.4L19.1 20.2H12.9L11.6 24ZM13.8 17.4H18.2L16 11.1Z" fill="#0b3d73" fill-rule="evenodd"/>`,
    transparent: () => `<defs><pattern id="ck" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fff"/><rect width="3" height="3" fill="#cfe0ee"/><rect x="3" y="3" width="3" height="3" fill="#cfe0ee"/></pattern></defs><rect x="3" y="4" width="26" height="24" rx="3" fill="url(#ck)" stroke="#5b89b4" stroke-width="1.2" stroke-dasharray="3 2"/><path d="M8.5 24L14.4 8H17.6L23.5 24H20.4L19.1 20.2H12.9L11.6 24ZM13.8 17.4H18.2L16 11.1Z" fill="#0b3d73" fill-rule="evenodd"/>`,
    wallpaper: () => ICONS.fullscreen(),
  };
  const SMALL_ICONS = new Set(['stPos', 'stSel', 'stSize', 'stDisk']);
  const iconCache = new Map();
  function iconURL(name, arg) {
    const key = name + '|' + (arg || '');
    let url = iconCache.get(key);
    if (!url) {
      if (iconCache.size > 240) iconCache.clear();
      url = svgURL(ICONS[name](arg), SMALL_ICONS.has(name) ? 16 : 32);
      iconCache.set(key, url);
    }
    return url;
  }
  const ic = (name, arg, cls) => h('img', { src: iconURL(name, arg), alt: '', draggable: false, class: cls });
  function shapeIconURL(id) {
    const key = 'shape|' + id;
    if (iconCache.has(key)) return iconCache.get(key);
    const def = E.SHAPE[id];
    let sp = { id, x0: 2.5, y0: 3, x1: 17.5, y1: 17 };
    if (def.kind === 'line') sp = { id, pts: [{ x: 3, y: 17 }, { x: 17, y: 3 }] };
    if (def.kind === 'curve') sp = { id, pts: [{ x: 2.5, y: 15 }, { x: 5, y: -2 }, { x: 14, y: 22 }, { x: 17.5, y: 5 }] };
    if (def.kind === 'poly') sp = { id, pts: [{ x: 3, y: 9 }, { x: 10, y: 3 }, { x: 17, y: 7 }, { x: 15, y: 17 }, { x: 5, y: 15 }] };
    const d = E.shapeD(sp);
    const open = def.kind === 'line' || def.kind === 'curve';
    const body = `<defs>${lg('g', [[0, '#ffffff'], [0.5, '#e3f4ff'], [0.5, '#bfe3fb'], [1, '#d9f0ff']])}</defs><path d="${d}" fill="${open ? 'none' : 'url(#g)'}" stroke="#0b3d73" stroke-width="1.15" stroke-linejoin="round" stroke-linecap="round"/>`;
    const url = svgURL(body, 20);
    iconCache.set(key, url);
    return url;
  }
  const cursorURL = (body, hx, hy) => `url("${svgURL(body, 24)}") ${hx} ${hy}`;

  // ================================================================== register
  A.apps.register({
    id: 'paint',
    name: 'Paint',
    icon: 'icons/paint',
    color: '#ff5a3c',
    category: 'accessories',
    description: 'Draw and paint pictures with brushes, shapes, stickers and bubbles.',
    keywords: ['draw', 'paint', 'picture', 'image', 'brush', 'art', 'sticker', 'mspaint', 'bitmap'],
    window: { width: 1260, height: 720, minWidth: 560, minHeight: 400, glassBody: true },
    tasks: [{ label: 'New picture', icon: 'icons/paint', onClick() { A.apps.launch('paint'); } }],
    launch(win, args) { return createPaint(win, args || {}); },
  });

  // ================================================================== app
  function createPaint(win, args) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cleanups = [];

    // ---------------------------------------------------------------- state
    const shapeIds = E.SHAPES.map((s) => s.id);
    const store = (k, v) => A.store.set('paint.' + k, v);
    const pref = (k, fb) => A.store.get('paint.' + k, fb);
    const st = {
      tool: 'pencil',
      lastTool: 'pencil',
      brush: E.ORDER.includes(pref('brush')) ? pref('brush') : 'brush',
      shape: shapeIds.includes(pref('shape')) ? pref('shape') : 'rect',
      outline: pref('outline', 'solid'),
      fill: pref('fill', 'none'),
      levels: Object.assign({ pencil: 0, brush: 1, eraser: 1, shape: 1 }, pref('levels', {}) || {}),
      color1: '#000000',
      color2: '#ffffff',
      slot: 1,
      custom: (pref('custom', []) || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 14),
      zoom: 1,
      selMode: 'rect',
      transparent: false,
      sticker: STICKERS.includes(pref('sticker')) ? pref('sticker') : 'fish',
      stickerSize: clamp(Number(pref('stickerSize', 96)) || 96, 24, 256),
      stickerStyle: pref('stickerStyle', 'diecut') === 'plain' ? 'plain' : 'diecut',
      stickerTilt: pref('stickerTilt', true) !== false,
      text: Object.assign({ family: 'Selawik', size: 24, bold: false, italic: false, underline: false, strike: false, opaque: false }, pref('text', {}) || {}),
      grid: !!pref('grid', false),
      statusOn: pref('status', true) !== false,
    };
    let W = 800, H = 600;
    let path = null;
    let op = null;
    let sel = null;
    let pend = null;
    let tbox = null;
    let clip = null;
    let sysClipOk = false;
    let pageRect = null;
    let pasteExpected = false;
    let lastFlyClose = 0;
    let fly = null;
    let flyOwner = null;
    let menuOwner = null;
    let closed = false;

    // ---------------------------------------------------------------- canvases
    const mk = (cls) => { const c = E.canvas(W, H); c.className = cls; return c; };
    const doc = mk('pt-doc'), dctx = doc.getContext('2d');
    const layer = mk('pt-layer'), lctx = layer.getContext('2d');
    const over = mk('pt-over'), octx = over.getContext('2d');
    let shadow = E.canvas(W, H), sctx = shadow.getContext('2d');
    layer.hidden = true;
    dctx.fillStyle = '#ffffff';
    dctx.fillRect(0, 0, W, H);
    sctx.drawImage(doc, 0, 0);

    // ---------------------------------------------------------------- DOM: workspace
    const grid = h('div.pt-grid', { hidden: true });
    const docspace = h('div.pt-docspace');
    const selBox = h('div.pt-box', { hidden: true });
    const pendBox = h('div.pt-box', { hidden: true });
    const textFrame = h('div.pt-box', { hidden: true });
    const ring = h('div.pt-ring', { hidden: true });
    const page = h('div.pt-page', null, doc, layer, over, grid, docspace, selBox, pendBox, textFrame, ring);
    const ghostOutline = h('div.pt-ghost', { hidden: true });
    const cvh = { e: h('div.pt-cvh.pt-cvh-e'), s: h('div.pt-cvh.pt-cvh-s'), se: h('div.pt-cvh.pt-cvh-se') };
    const stage = h('div.pt-stage', null, page, cvh.e, cvh.s, cvh.se, ghostOutline);
    const loupe = h('div.pt-loupe', { hidden: true }, h('i'), h('span'));
    const ws = h('div.pt-ws', { tabIndex: 0, 'aria-label': 'Canvas', dataset: { cursor: 'pencil' } }, stage, loupe);

    // ---------------------------------------------------------------- DOM: status bar
    const stPos = h('span'), stSel = h('span'), stSize = h('span'), stFile = h('span');
    const zoomPct = h('span.pt-zoom-pct', null, '100%');
    const zoomSlider = A.ui.slider({ min: 0, max: 1000, value: 500, label: 'Zoom', onInput: (v) => setZoom(sliderToZoom(v)) });
    const zBtn = (dir) => h('button.pt-zbtn', { type: 'button', 'aria-label': dir > 0 ? 'Zoom in' : 'Zoom out', 'data-tip': dir > 0 ? 'Zoom in' : 'Zoom out', onclick: () => setZoom(stepZoom(st.zoom, dir)) },
      A.util.s('svg', { viewBox: '0 0 10 10' }, A.util.s('path', { d: dir > 0 ? 'M1 5H9M5 1V9' : 'M1 5H9', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' })));
    const status = h('div.ae-statusbar.pt-status', { hidden: !st.statusOn },
      h('span.pt-st', null, ic('stPos'), stPos),
      h('span.pt-st', null, ic('stSel'), stSel),
      h('span.pt-st', null, ic('stSize'), stSize),
      h('span.pt-st.pt-st-grow', null, ic('stDisk'), stFile),
      h('span.pt-zoom', null, zoomPct, zBtn(-1), zoomSlider, zBtn(1)));

    // ---------------------------------------------------------------- DOM: ribbon helpers
    function bigBtn(o) {
      const b = h('button.pt-big', { type: 'button', 'aria-label': o.label, 'data-tip': o.tip || null, 'data-tip-title': o.tipTitle || null, onclick: o.onClick },
        h('span.pt-big-ic', null, o.icon), h('span.pt-big-lbl', null, o.lines || o.label, o.menu ? h('i.pt-caret') : null));
      return b;
    }
    function splitBtn(o) {
      const top = h('button.pt-split-top', { type: 'button', 'aria-label': o.label, 'data-tip': o.tip || null, 'data-tip-title': o.tipTitle || null, onclick: o.onClick }, o.icon);
      const bot = h('button.pt-split-bot', { type: 'button', 'aria-label': o.label + ' options' }, o.label, h('i.pt-caret'));
      bot.addEventListener('click', () => o.onMenu(bot));
      const el = h('div.pt-split', null, top, bot);
      el.top = top;
      el.bot = bot;
      return el;
    }
    function smallBtn(o) {
      return h('button.pt-small', { type: 'button', 'aria-label': o.label, 'data-tip': o.tip || null, 'data-tip-title': o.tipTitle || null, onclick: o.onClick },
        o.icon, h('span.pt-sl', null, o.label), o.menu ? h('i.pt-caret') : null);
    }
    function toolBtn(tool, label, tip, icon) {
      const b = h('button.pt-tool', { type: 'button', 'aria-label': label, 'data-tip': tip, 'data-tip-title': label, dataset: { tool }, onclick: () => { A.sound.play('click'); setTool(tool); } }, icon);
      return b;
    }
    const groups = [];
    function group(id, label, iconFn, content) {
      const body = h('div.pt-gbody', null, content);
      const collapsedBtn = h('button.pt-big.pt-gcollapsed', { type: 'button', 'aria-label': label }, h('span.pt-big-ic', null, iconFn()), h('span.pt-big-lbl', null, label, h('i.pt-caret')));
      const main = h('div.pt-gmain', null, body, collapsedBtn);
      const g = h('div.pt-group', { dataset: { g: id } }, main, h('div.pt-glabel', null, label));
      g.body = body;
      g.main = main;
      collapsedBtn.addEventListener('click', () => {
        if (fly && flyOwner === collapsedBtn) { fly.close(); return; }
        const host = h('div.pt-flypanel.pt-flyhost');
        host.appendChild(body);
        openFly(collapsedBtn, host, () => { if (!closed) main.insertBefore(body, collapsedBtn); });
      });
      groups.push(g);
      return g;
    }
    function openFly(anchor, content, onClose, cls) {
      if (fly) fly.close();
      anchor.classList.add('open');
      flyOwner = anchor;
      const handle = A.ui.flyout(anchor, content, {
        placement: 'bottom', align: 'left', className: cls || 'pt-fly',
        onClose: () => {
          anchor.classList.remove('open');
          if (fly === handle) { fly = null; flyOwner = null; }
          lastFlyClose = Date.now();
          if (onClose) onClose();
        },
      });
      fly = handle;
      return handle;
    }
    function menuUnder(el, items) {
      if (menuOwner === el) { A.ui.closeMenus(); return; }
      const r = el.getBoundingClientRect();
      el.classList.add('open');
      menuOwner = el;
      A.ui.menu(items, r.left, r.bottom + 1, {
        owner: el,
        onClose: () => { el.classList.remove('open'); lastFlyClose = Date.now(); setTimeout(() => { if (menuOwner === el) menuOwner = null; }, 0); },
      });
    }

    // ---------------------------------------------------------------- Home tab
    const btnPaste = splitBtn({ label: 'Paste', icon: ic('paste'), tipTitle: 'Paste (Ctrl+V)', tip: 'Paste a picture from the clipboard.', onClick: () => paste(),
      onMenu: (el) => menuUnder(el, [{ label: 'Paste', shortcut: 'Ctrl+V', onClick: () => paste() }, { label: 'Paste from...', onClick: pasteFrom }]) });
    const btnCut = smallBtn({ label: 'Cut', icon: ic('cut'), tipTitle: 'Cut (Ctrl+X)', tip: 'Cut the selection and put it on the clipboard.', onClick: () => cut() });
    const btnCopy = smallBtn({ label: 'Copy', icon: ic('copy'), tipTitle: 'Copy (Ctrl+C)', tip: 'Copy the selection to the clipboard.', onClick: () => copy() });
    const gClipboard = group('clipboard', 'Clipboard', () => ic('paste'), [btnPaste, h('div.pt-col', null, btnCut, btnCopy)]);

    const btnSelect = splitBtn({ label: 'Select', icon: ic('select'), tipTitle: 'Select', tip: 'Select part of the picture to move, copy or crop it.', onClick: () => { A.sound.play('click'); setTool('select'); },
      onMenu: (el) => menuUnder(el, selectMenu()) });
    const btnCrop = smallBtn({ label: 'Crop', icon: ic('crop'), tipTitle: 'Crop (Ctrl+Shift+X)', tip: 'Keep only the selected part of the picture.', onClick: () => crop() });
    const btnResize = smallBtn({ label: 'Resize', icon: ic('resize'), tipTitle: 'Resize and skew (Ctrl+W)', tip: 'Make the picture or selection bigger, smaller or slanted.', onClick: () => resizeDialog() });
    const btnRotate = smallBtn({ label: 'Rotate', icon: ic('rotate'), menu: true, tipTitle: 'Rotate', tip: 'Turn the picture or selection.', onClick: () => menuUnder(btnRotate, [
      { label: 'Rotate right 90°', onClick: () => rotate(90) },
      { label: 'Rotate left 90°', onClick: () => rotate(-90) },
      { label: 'Rotate 180°', onClick: () => rotate(180) },
    ]) });
    const btnFlip = smallBtn({ label: 'Flip', icon: ic('flip'), menu: true, tipTitle: 'Flip', tip: 'Mirror the picture or selection.', onClick: () => menuUnder(btnFlip, [
      { label: 'Flip vertical', onClick: () => flip(false) },
      { label: 'Flip horizontal', onClick: () => flip(true) },
    ]) });
    const btnInvert = smallBtn({ label: 'Invert', icon: ic('invert'), tipTitle: 'Invert colors (Ctrl+Shift+I)', tip: 'Swap every color for its opposite, like a photo negative.', onClick: () => invertColors() });
    const btnClear = smallBtn({ label: 'Clear', icon: ic('clear'), tipTitle: 'Clear image (Ctrl+Shift+N)', tip: 'Start over with an empty canvas in Color 2.', onClick: () => clearImage() });
    const gImage = group('image', 'Image', () => ic('select'), [btnSelect, h('div.pt-col', null, btnCrop, btnResize, btnRotate), h('div.pt-col', null, btnFlip, btnInvert, btnClear)]);

    const toolBtns = {
      pencil: toolBtn('pencil', 'Pencil', 'Draw a free-form line one pixel at a time.', ic('pencil')),
      fill: toolBtn('fill', 'Fill with color', 'Click an area to fill it with Color 1. Right-click fills with Color 2.', ic('fill', st.color1)),
      text: toolBtn('text', 'Text', 'Click the picture to add words.', ic('text')),
      eraser: toolBtn('eraser', 'Eraser', 'Erase to Color 2. Right-drag to erase only Color 1.', ic('eraser')),
      picker: toolBtn('picker', 'Color picker', 'Pick up a color from the picture.', ic('picker', st.color1)),
      zoom: toolBtn('zoom', 'Magnifier', 'Click to zoom in, right-click to zoom out.', ic('zoom')),
    };
    const gTools = group('tools', 'Tools', () => ic('pencil'), [h('div.pt-tools', null, toolBtns.pencil, toolBtns.fill, toolBtns.text, toolBtns.eraser, toolBtns.picker, toolBtns.zoom)]);

    const btnBrushes = splitBtn({ label: 'Brushes', icon: ic('brush', st.color1), tipTitle: 'Brushes', tip: '', onClick: () => { A.sound.play('click'); setTool('brush'); }, onMenu: (el) => openBrushGallery(el) });
    const gBrushes = group('brushes', 'Brushes', () => ic('brush', '#3aa6f5'), [btnBrushes]);

    const shapeGrid = h('div.pt-gal-grid');
    const shapeBtns = {};
    E.SHAPES.forEach((s) => {
      const b = h('button.pt-shp', { type: 'button', 'aria-label': s.name, 'data-tip': s.name, onclick: () => pickShape(s.id) }, h('img', { src: shapeIconURL(s.id), alt: '', draggable: false }));
      shapeBtns[s.id] = b;
      shapeGrid.appendChild(b);
    });
    const btnMoreShapes = h('button.pt-gmore', { type: 'button', 'aria-label': 'More shapes', 'data-tip': 'All shapes' }, h('i.pt-caret'));
    btnMoreShapes.addEventListener('click', () => openAllShapes(btnMoreShapes));
    const btnOutline = smallBtn({ label: 'Outline', icon: ic('outline', st.color1), menu: true, tipTitle: 'Shape outline', tip: 'Choose how shape edges are drawn.', onClick: () => menuUnder(btnOutline, styleMenu('outline')) });
    const btnFill = smallBtn({ label: 'Fill', icon: ic('fillshape', st.color2), menu: true, tipTitle: 'Shape fill', tip: 'Choose how shapes are filled. Glass gel makes them glossy.', onClick: () => menuUnder(btnFill, styleMenu('fill')) });
    const gShapes = group('shapes', 'Shapes', () => h('img', { src: shapeIconURL('star5'), alt: '' }), [h('div.pt-shapes', null, h('div.pt-gal', null, shapeGrid, btnMoreShapes), h('div.pt-shapeopts', null, btnOutline, btnFill))]);

    const btnSize = bigBtn({ label: 'Size', icon: ic('size'), menu: true, tipTitle: 'Size', tip: 'Choose how wide the selected tool draws.', onClick: () => openSizes(btnSize) });
    const gSize = group('size', 'Size', () => ic('size'), [btnSize]);

    const colorViews = [];
    const gColors = group('colors', 'Colors', () => ic('colors'), [colorsBlock()]);

    const btnStickers = splitBtn({ label: 'Stickers', icon: h('img', { src: A.icon(st.sticker), alt: '', draggable: false }), tipTitle: 'Stickers', tip: 'Stamp glossy stickers on your picture. Drag to make a trail.', onClick: () => { A.sound.play('click'); setTool('sticker'); }, onMenu: (el) => openStickers(el) });
    const gStickers = group('stickers', 'Stickers', () => h('img', { src: A.icon('star'), alt: '' }), [btnStickers]);

    const homePanel = h('div.pt-panel', { dataset: { tab: 'home' } }, gClipboard, gImage, gTools, gBrushes, gShapes, gSize, gColors, gStickers);

    // ---------------------------------------------------------------- View tab
    const chkGrid = A.ui.checkbox({ label: 'Gridlines', checked: st.grid, onChange: (v) => setGrid(v) });
    chkGrid.setAttribute('data-tip', 'Show a pixel grid when you zoom to 400% or closer (Ctrl+G).');
    const chkStatus = A.ui.checkbox({ label: 'Status bar', checked: st.statusOn, onChange: (v) => setStatusBar(v) });
    const gZoom = group('zoom', 'Zoom', () => ic('zoomin'), [
      bigBtn({ label: 'Zoom in', lines: ['Zoom', h('br'), 'in'], icon: ic('zoomin'), tipTitle: 'Zoom in (Ctrl+Page Up)', tip: 'Get a closer look.', onClick: () => setZoom(stepZoom(st.zoom, 1)) }),
      bigBtn({ label: 'Zoom out', lines: ['Zoom', h('br'), 'out'], icon: ic('zoomout'), tipTitle: 'Zoom out (Ctrl+Page Down)', tip: 'See more of the picture.', onClick: () => setZoom(stepZoom(st.zoom, -1)) }),
      bigBtn({ label: '100%', icon: ic('zoom100'), tipTitle: '100%', tip: 'Show the picture at its real size.', onClick: () => setZoom(1) }),
      bigBtn({ label: 'Fit to window', lines: ['Fit to', h('br'), 'window'], icon: ic('fit'), tipTitle: 'Fit to window', tip: 'Make the whole picture fit in the window.', onClick: () => fitToWindow(true) }),
    ]);
    const gShow = group('show', 'Show or hide', () => ic('grid'), [h('div.pt-col', { style: { gap: '8px', padding: '0 6px' } }, chkGrid, chkStatus)]);
    const gDisplay = group('display', 'Display', () => ic('fullscreen'), [
      bigBtn({ label: 'Full screen', lines: ['Full', h('br'), 'screen'], icon: ic('fullscreen'), tipTitle: 'Full screen (F11)', tip: 'Show off your picture on a glossy stage.', onClick: () => fullScreen() }),
    ]);
    const viewPanel = h('div.pt-panel', { dataset: { tab: 'view' }, hidden: true }, gZoom, gShow, gDisplay);

    // ---------------------------------------------------------------- Text tab (contextual)
    const fontSel = A.ui.select({ options: FONTS.map((f) => [f, f]), value: FONTS.includes(st.text.family) ? st.text.family : 'Selawik', label: 'Font family', onChange: (v) => setTextOpt('family', v) });
    fontSel.classList.add('pt-font-family');
    Array.from(fontSel.options).forEach((o) => (o.style.fontFamily = `"${o.value}", Selawik, sans-serif`));
    const sizeSel = A.ui.select({ options: FONT_SIZES.map((s) => [s, String(s)]), value: st.text.size, label: 'Font size', onChange: (v) => setTextOpt('size', Number(v)) });
    sizeSel.classList.add('pt-font-size');
    if (!FONT_SIZES.includes(st.text.size)) { st.text.size = 24; sizeSel.value = '24'; }
    const fmtBtn = (key, glyph, label, keyTip) => h('button.pt-small.pt-fmt', { type: 'button', 'aria-label': label, 'data-tip': label + (keyTip ? ' (' + keyTip + ')' : ''), dataset: { fmt: key }, onclick: () => setTextOpt(key, !st.text[key]) }, glyph);
    const fmtBtns = [fmtBtn('bold', h('b', null, 'B'), 'Bold', 'Ctrl+B'), fmtBtn('italic', h('i', null, 'I'), 'Italic', 'Ctrl+I'), fmtBtn('underline', h('u', null, 'U'), 'Underline', 'Ctrl+U'), fmtBtn('strike', h('s', null, 'S'), 'Strikethrough')];
    const gFont = group('font', 'Font', () => ic('text'), [h('div.pt-textcol', null, h('div.pt-fontrow', null, fontSel, sizeSel), h('div.pt-fontrow', null, fmtBtns))]);
    const btnOpaque = smallBtn({ label: 'Opaque', icon: ic('opaque', '#ffffff'), tipTitle: 'Opaque', tip: 'Put Color 2 behind the text.', onClick: () => setTextOpt('opaque', true) });
    const btnTransparent = smallBtn({ label: 'Transparent', icon: ic('transparent'), tipTitle: 'Transparent', tip: 'Let the picture show through behind the text.', onClick: () => setTextOpt('opaque', false) });
    const gBack = group('background', 'Background', () => ic('transparent'), [h('div.pt-col', null, btnOpaque, btnTransparent)]);
    const gTextColors = group('tcolors', 'Colors', () => ic('colors'), [colorsBlock()]);
    const textPanel = h('div.pt-panel', { dataset: { tab: 'text' }, hidden: true }, gFont, gBack, gTextColors);

    // ---------------------------------------------------------------- tab strip
    const fileBtn = h('button.pt-filebtn', { type: 'button', 'aria-label': 'File menu', 'aria-haspopup': 'true', 'data-tip': 'New, open, save, set as desktop background and more.', 'data-tip-title': 'File' },
      A.img('icons/paint'), h('span', null, 'File'), h('i.pt-caret'));
    fileBtn.addEventListener('click', () => openFileMenu());
    const tabBtn = (id, label) => h('button.pt-tab', { type: 'button', role: 'tab', dataset: { tab: id }, onclick: () => selectTab(id) }, label);
    const tabs = { home: tabBtn('home', 'Home'), view: tabBtn('view', 'View'), text: tabBtn('text', 'Text') };
    tabs.text.classList.add('pt-tab-ctx');
    tabs.text.hidden = true;
    const qUndo = h('button.pt-qbtn', { type: 'button', 'aria-label': 'Undo', 'data-tip': 'Undo (Ctrl+Z)', onclick: () => undo() }, ic('undo'));
    const qRedo = h('button.pt-qbtn', { type: 'button', 'aria-label': 'Redo', 'data-tip': 'Redo (Ctrl+Y)', onclick: () => redo() }, ic('redo'));
    const qSave = h('button.pt-qbtn', { type: 'button', 'aria-label': 'Save', 'data-tip': 'Save (Ctrl+S)', onclick: () => save() }, ic('save'));
    const tabbar = h('div.pt-tabbar', { role: 'tablist' }, fileBtn, h('div.pt-tabs', null, tabs.home, tabs.view, tabs.text), h('div.pt-qat', null, qSave, h('span.pt-qsep'), qUndo, qRedo));
    const ribbon = h('div.pt-ribbon', null, homePanel, viewPanel, textPanel);
    const frame = h('div.pt-frame', null, ribbon, ws, status);
    const root = h('div.pt', null, tabbar, frame);
    win.body.appendChild(root);
    root.style.setProperty('--pt-cur-pencil', cursorURL(`<g transform="translate(-3 -3) scale(.85)">${ICONS.pencil().replace(/<ellipse[^>]*opacity="\.14"\/>/, '')}</g>`, 1, 21));
    root.style.setProperty('--pt-cur-fill', cursorURL(`<g transform="scale(.75)">${ICONS.fill('#3aa6f5').replace(/<ellipse[^>]*opacity="\.14"\/>/, '')}</g>`, 20, 20));
    root.style.setProperty('--pt-cur-picker', cursorURL(`<g transform="translate(-2 -2) scale(.8)">${ICONS.picker('#3aa6f5').replace(/<ellipse[^>]*opacity="\.14"\/>/, '')}</g>`, 2, 21));
    root.style.setProperty('--pt-cur-zoom', cursorURL(`<g transform="scale(.75)">${ICONS.zoomin()}</g>`, 10, 10));

    // ================================================================ colors block (instantiable)
    function colorsBlock() {
      const slot = (n) => h('button.pt-cslot', { type: 'button', dataset: { slot: n }, 'aria-label': 'Color ' + n, 'data-tip-title': 'Color ' + n, 'data-tip': n === 1 ? 'Color 1 (foreground). Pick a color, then draw with the left mouse button.' : 'Color 2 (background). Draw with the right mouse button. The eraser and new canvas areas use it too.', onclick: () => setSlot(n) },
        h('span.pt-cswatch'), h('span.pt-big-lbl', null, 'Color', h('br'), String(n)));
      const s1 = slot(1), s2 = slot(2);
      const pal = h('div.pt-palette', { role: 'listbox', 'aria-label': 'Palette' });
      PALETTE.forEach(([c, name]) => pal.appendChild(chip(c, name)));
      const cust = h('div.pt-custom', { 'aria-label': 'Custom colors' });
      const edit = bigBtn({ label: 'Edit colors', lines: ['Edit', h('br'), 'colors'], icon: ic('colors'), tipTitle: 'Edit colors', tip: 'Mix any color you like. Your mixes are remembered here.', onClick: () => editColors() });
      const el = h('div.pt-colors', null, s1, s2, pal, cust, edit);
      const view = {
        refresh() {
          s1.querySelector('.pt-cswatch').style.setProperty('--c', st.color1);
          s2.querySelector('.pt-cswatch').style.setProperty('--c', st.color2);
          s1.classList.toggle('pt-on', st.slot === 1);
          s2.classList.toggle('pt-on', st.slot === 2);
          cust.innerHTML = '';
          for (let i = 0; i < 8; i++) {
            const c = st.custom[i];
            cust.appendChild(c ? chip(c, 'Custom color') : h('span.pt-chip.empty', { 'aria-hidden': 'true' }));
          }
        },
      };
      colorViews.push(view);
      view.refresh();
      return el;
    }
    function chip(c, name) {
      const b = h('button.pt-chip', { type: 'button', style: { '--c': c }, 'aria-label': name + ' ' + c, 'data-tip': name + '  ' + c.toUpperCase() });
      b.addEventListener('pointerdown', (e) => {
        if (e.button === 2) { e.preventDefault(); setColor(2, c); A.sound.play('click'); }
      });
      b.addEventListener('click', () => { setColor(st.slot, c); A.sound.play('click'); });
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      return b;
    }
    function setSlot(n) {
      st.slot = n;
      A.sound.play('click');
      colorViews.forEach((v) => v.refresh());
    }
    function setColor(n, c, quiet) {
      c = C.hex(C.parse(c).r, C.parse(c).g, C.parse(c).b);
      if (n === 2) st.color2 = c; else st.color1 = c;
      colorViews.forEach((v) => v.refresh());
      refreshColorIcons();
      if (pend) renderPend();
      if (tbox) applyTextStyle();
      if (!quiet && st.tool === 'text' && tbox) tbox.ta.focus();
    }
    function refreshColorIcons() {
      toolBtns.fill.firstChild.src = iconURL('fill', st.color1);
      toolBtns.picker.firstChild.src = iconURL('picker', st.color1);
      btnBrushes.top.firstChild.src = iconURL('brush', st.color1);
      btnOutline.firstChild.src = iconURL('outline', st.color1);
      btnFill.firstChild.src = iconURL('fillshape', st.color2);
      btnOpaque.firstChild.src = iconURL('opaque', st.color2);
    }
    function addCustom(c) {
      c = c.toLowerCase();
      if (PALETTE.some(([p]) => p === c)) return;
      st.custom = [c].concat(st.custom.filter((x) => x !== c)).slice(0, 14);
      store('custom', st.custom);
      colorViews.forEach((v) => v.refresh());
    }

    // ================================================================ tabs and ribbon fitting
    let activeTab = 'home';
    function selectTab(id) {
      activeTab = id;
      Object.keys(tabs).forEach((k) => { tabs[k].classList.toggle('active', k === id); tabs[k].setAttribute('aria-selected', String(k === id)); });
      homePanel.hidden = id !== 'home';
      viewPanel.hidden = id !== 'view';
      textPanel.hidden = id !== 'text';
      fitRibbon();
    }
    function showTextTab(on) {
      tabs.text.hidden = !on;
      if (on) selectTab('text');
      else if (activeTab === 'text') selectTab('home');
    }
    const LEVELS = [
      (p) => p.classList.add('pt-c1'),
      (p) => p.classList.add('pt-c2'),
      () => gImage.classList.add('collapsed'),
      () => gClipboard.classList.add('collapsed'),
      () => gShapes.classList.add('collapsed'),
      () => gColors.classList.add('collapsed'),
      () => gTools.classList.add('collapsed'),
    ];
    function fitRibbon() {
      if (closed) return;
      if (fly && flyOwner && flyOwner.classList.contains('pt-gcollapsed')) fly.close();
      homePanel.classList.remove('pt-c1', 'pt-c2');
      groups.forEach((g) => g.classList.remove('collapsed'));
      if (!homePanel.hidden) {
        let i = 0;
        while (homePanel.scrollWidth > homePanel.clientWidth + 1 && i < LEVELS.length) LEVELS[i++](homePanel);
      }
      if (!textPanel.hidden && textPanel.scrollWidth > textPanel.clientWidth + 1) gTextColors.classList.add('collapsed');
    }
    const ro = new ResizeObserver(() => requestAnimationFrame(fitRibbon));
    ro.observe(ribbon);
    cleanups.push(() => ro.disconnect());

    // ================================================================ tools
    function setTool(t) {
      if (t !== st.tool) {
        commitTransient();
        if (st.tool !== 'picker') st.lastTool = st.tool;
        st.tool = t;
        clearGhost();
        hideLoupe();
      }
      Object.keys(toolBtns).forEach((k) => toolBtns[k].classList.toggle('pt-on', st.tool === k));
      btnSelect.classList.toggle('pt-on', st.tool === 'select');
      btnBrushes.classList.toggle('pt-on', st.tool === 'brush');
      btnStickers.classList.toggle('pt-on', st.tool === 'sticker');
      Object.keys(shapeBtns).forEach((k) => shapeBtns[k].classList.toggle('pt-on', st.tool === 'shape' && st.shape === k));
      btnSize.disabled = !sizeFamily();
      btnBrushes.top.setAttribute('data-tip', E.BRUSHES[st.brush].name + '. Click the arrow for more brushes.');
      btnSelect.top.firstChild.src = iconURL(st.selMode === 'free' ? 'selectFree' : 'select');
      showTextTab(t === 'text');
      updateCursor();
      updateButtons();
    }
    function sizeFamily() {
      if (st.tool === 'pencil') return 'pencil';
      if (st.tool === 'eraser') return 'eraser';
      if (st.tool === 'brush') return 'brush';
      if (st.tool === 'shape') return 'shape';
      return null;
    }
    function familySizes(f) {
      if (f === 'pencil') return E.BRUSHES.pixel.sizes;
      if (f === 'eraser') return E.BRUSHES.eraser.sizes;
      if (f === 'brush') return E.BRUSHES[st.brush].sizes;
      return SHAPE_SIZES;
    }
    const levelOf = (f) => clamp(st.levels[f] | 0, 0, 4);
    const sizeOf = (f) => familySizes(f)[levelOf(f)];
    function setLevel(f, lv) {
      st.levels[f] = clamp(lv, 0, 4);
      store('levels', st.levels);
      if (pend) renderPend();
      updateCursor();
    }
    function pickShape(id) {
      A.sound.play('click');
      if (st.tool !== 'shape') setTool('shape');
      else if (pend && pend.id !== id) commitPending();
      st.shape = id;
      store('shape', id);
      setTool('shape');
    }
    function pickBrush(id) {
      st.brush = id;
      store('brush', id);
      setTool('brush');
    }

    // ================================================================ document size, zoom, layout
    function setDims(w, hh) {
      W = w; H = hh;
      [doc, layer, over].forEach((c) => { c.width = W; c.height = H; });
      pendDirty = null;
      ghostBox = null;
    }
    function layout() {
      const z = st.zoom;
      const pw = W * z, ph = H * z;
      page.style.width = pw + 'px';
      page.style.height = ph + 'px';
      stage.style.width = Math.ceil(pw + PAD + 48) + 'px';
      stage.style.height = Math.ceil(ph + PAD + 48) + 'px';
      cvh.e.style.left = (PAD + pw + 1) + 'px';
      cvh.e.style.top = (PAD + ph / 2 - 3) + 'px';
      cvh.s.style.left = (PAD + pw / 2 - 3) + 'px';
      cvh.s.style.top = (PAD + ph + 1) + 'px';
      cvh.se.style.left = (PAD + pw + 1) + 'px';
      cvh.se.style.top = (PAD + ph + 1) + 'px';
      docspace.style.width = W + 'px';
      docspace.style.height = H + 'px';
      docspace.style.transform = `scale(${z})`;
      page.classList.toggle('pt-px', z >= 2);
      grid.hidden = !(st.grid && z >= 4);
      grid.style.backgroundSize = `${z}px ${z}px`;
      renderSel();
      positionPendBox();
      positionText();
      updateStatus();
    }
    const sliderToZoom = (v) => {
      let z = Math.pow(2, ((v - 500) / 500) * 3);
      if (Math.abs(z - 1) < 0.07) z = 1;
      return z;
    };
    const zoomToSlider = (z) => 500 + (Math.log2(z) / 3) * 500;
    function stepZoom(z, dir) {
      if (dir > 0) return ZOOMS.find((v) => v > z + 1e-6) || ZOOMS[ZOOMS.length - 1];
      const lower = ZOOMS.filter((v) => v < z - 1e-6);
      return lower.length ? lower[lower.length - 1] : ZOOMS[0];
    }
    function setZoom(z, anchor) {
      z = clamp(z, 0.125, 8);
      if (Math.abs(z - st.zoom) < 1e-4) { updateZoomUI(); return; }
      const wr = ws.getBoundingClientRect();
      const ax = anchor ? anchor.clientX - wr.left : ws.clientWidth / 2;
      const ay = anchor ? anchor.clientY - wr.top : ws.clientHeight / 2;
      const dx = (ws.scrollLeft + ax - PAD) / st.zoom, dy = (ws.scrollTop + ay - PAD) / st.zoom;
      st.zoom = z;
      layout();
      ws.scrollLeft = dx * z + PAD - ax;
      ws.scrollTop = dy * z + PAD - ay;
      updateZoomUI();
      updateCursor();
      clearGhost();
    }
    function updateZoomUI() {
      zoomPct.textContent = (st.zoom < 1 ? Math.round(st.zoom * 1000) / 10 : Math.round(st.zoom * 100)) + '%';
      if (document.activeElement !== zoomSlider) zoomSlider.setValue(zoomToSlider(st.zoom));
    }
    function fitToWindow(allowUp) {
      const aw = ws.clientWidth - PAD - 30, ah = ws.clientHeight - PAD - 30;
      if (aw <= 0 || ah <= 0) return;
      let z = Math.min(aw / W, ah / H);
      if (!allowUp) z = Math.min(1, z);
      setZoom(clamp(z, 0.125, 8));
      ws.scrollLeft = 0;
      ws.scrollTop = 0;
    }

    // ================================================================ history
    // Region entries hold only the pixels that changed; full entries hold a
    // whole canvas (size changes, flips). Each entry keeps one canvas and
    // swaps it with the document on undo/redo.
    const hist = { undo: [], redo: [], seq: 0 };
    let savedId = 0;
    const stateId = () => (hist.undo.length ? hist.undo[hist.undo.length - 1].id : 0);
    const dirty = () => stateId() !== savedId;
    const release = (e) => { if (e && e.data) { e.data.width = 0; e.data.height = 0; e.data = null; } };
    function pushEntry(e) {
      e.id = ++hist.seq;
      hist.undo.push(e);
      hist.redo.forEach(release);
      hist.redo = [];
      let total = hist.undo.reduce((s, x) => s + x.data.width * x.data.height, 0);
      while ((hist.undo.length > 60 || total > 44e6) && hist.undo.length > 1) {
        const old = hist.undo.shift();
        total -= old.data.width * old.data.height;
        release(old);
      }
      afterChange();
    }
    function clipRect(b) {
      if (!b) return null;
      const x0 = clamp(Math.floor(b.x0), 0, W), y0 = clamp(Math.floor(b.y0), 0, H);
      const x1 = clamp(Math.ceil(b.x1), 0, W), y1 = clamp(Math.ceil(b.y1), 0, H);
      if (x1 <= x0 || y1 <= y0) return null;
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    const union = (a, b) => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
    function commitRegion(b) {
      const r = clipRect(b);
      if (!r) return;
      const data = E.canvas(r.w, r.h);
      data.getContext('2d').drawImage(shadow, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      sctx.clearRect(r.x, r.y, r.w, r.h);
      sctx.drawImage(doc, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);
      pushEntry({ kind: 'region', x: r.x, y: r.y, w: r.w, h: r.h, data });
    }
    function restoreRegion(b) {
      const r = clipRect(b);
      if (!r) return;
      dctx.clearRect(r.x, r.y, r.w, r.h);
      dctx.drawImage(shadow, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);
    }
    // Makes canvas c the document and records the old one for undo.
    function applyFull(c) {
      const before = shadow;
      setDims(c.width, c.height);
      dctx.drawImage(c, 0, 0);
      shadow = E.canvas(W, H);
      sctx = shadow.getContext('2d');
      sctx.drawImage(doc, 0, 0);
      pushEntry({ kind: 'full', data: before });
      layout();
    }
    function swap(e) {
      if (e.kind === 'region') {
        const cur = E.canvas(e.w, e.h);
        cur.getContext('2d').drawImage(doc, e.x, e.y, e.w, e.h, 0, 0, e.w, e.h);
        dctx.clearRect(e.x, e.y, e.w, e.h);
        dctx.drawImage(e.data, e.x, e.y);
        sctx.clearRect(e.x, e.y, e.w, e.h);
        sctx.drawImage(e.data, e.x, e.y);
        release(e);
        e.data = cur;
      } else {
        const cur = E.canvas(W, H);
        cur.getContext('2d').drawImage(doc, 0, 0);
        const next = e.data;
        setDims(next.width, next.height);
        dctx.drawImage(next, 0, 0);
        shadow = next;
        sctx = shadow.getContext('2d');
        e.data = cur;
        layout();
      }
    }
    function undo() {
      if (op) return;
      if (cancelTransient()) { afterChange(); return; }
      const e = hist.undo.pop();
      if (!e) return;
      swap(e);
      hist.redo.push(e);
      afterChange();
    }
    function redo() {
      if (op || pend || tbox || (sel && sel.float)) return;
      sel = null;
      renderSel();
      const e = hist.redo.pop();
      if (!e) return;
      swap(e);
      hist.undo.push(e);
      afterChange();
    }
    function resetHistory() {
      hist.undo.forEach(release);
      hist.redo.forEach(release);
      hist.undo = [];
      hist.redo = [];
      savedId = 0;
    }
    function afterChange() {
      updateTitle();
      updateButtons();
      updateStatus();
    }

    // ================================================================ transient state (pending shape, selection, text)
    function commitTransient() {
      commitPending();
      commitSelection();
      commitText();
    }
    // Used by undo: backs out whatever is still floating. Returns true when
    // something was undone this way.
    function cancelTransient() {
      if (pend) { dropPend(); return true; }
      if (tbox) { removeText(); return true; }
      if (sel && sel.float) {
        if (sel.dirty) restoreRegion(sel.dirty);
        sel = null;
        renderSel();
        return true;
      }
      if (sel) { sel = null; renderSel(); }
      return false;
    }

    // ================================================================ pointer input
    const touches = new Map();
    let gesture = null;
    let pan = null;
    function toDoc(e) {
      const r = pageRect || page.getBoundingClientRect();
      return { x: (e.clientX - r.left) / st.zoom, y: (e.clientY - r.top) / st.zoom };
    }
    function onDown(e) {
      if (closed) return;
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      const wr = ws.getBoundingClientRect();
      if (e.clientX - wr.left >= ws.clientWidth || e.clientY - wr.top >= ws.clientHeight) return;
      if (e.target.closest('.pt-hdl, .pt-edge, .pt-cvh, .pt-textbox')) return;
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) { beginGesture(); return; }
        if (touches.size > 2) return;
      }
      e.preventDefault();
      ws.focus({ preventScroll: true });
      if (e.button === 1) { beginPan(e); return; }
      if (op) return;
      pageRect = page.getBoundingClientRect();
      const p = toDoc(e);
      const btn = e.button === 2 ? 2 : 0;
      const o = startOp(p, btn, e);
      if (o) {
        op = o;
        op.pid = e.pointerId;
        try { ws.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
      }
      hover(e);
    }
    function onMove(e) {
      if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (gesture) { moveGesture(); return; }
      }
      if (pan && e.pointerId === pan.pid) {
        ws.scrollLeft = pan.sl - (e.clientX - pan.x);
        ws.scrollTop = pan.st - (e.clientY - pan.y);
        return;
      }
      if (op && e.pointerId === op.pid) {
        const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
        const evs = list && list.length ? list : [e];
        for (const ce of evs) { if (!op) break; op.move(toDoc(ce), ce); }
      }
      hover(e);
    }
    function onUp(e) {
      touches.delete(e.pointerId);
      if (gesture) { if (touches.size < 2) gesture = null; return; }
      if (pan && e.pointerId === pan.pid) { pan = null; updateCursor(); return; }
      if (!op || e.pointerId !== op.pid) return;
      const o = op;
      op = null;
      o.up(toDoc(e), e);
      pageRect = null;
      updateButtons();
    }
    function onCancel(e) {
      touches.delete(e.pointerId);
      if (pan && e.pointerId === pan.pid) pan = null;
      if (op && e.pointerId === op.pid) cancelOp();
    }
    function cancelOp() {
      if (!op) return;
      const o = op;
      op = null;
      pageRect = null;
      if (o.cancel) o.cancel();
      updateButtons();
    }
    function beginPan(e) {
      pan = { pid: e.pointerId, x: e.clientX, y: e.clientY, sl: ws.scrollLeft, st: ws.scrollTop };
      ws.dataset.cursor = 'grab';
      try { ws.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
    }
    function gesturePts() { return Array.from(touches.values()).slice(0, 2); }
    function beginGesture() {
      cancelOp();
      const [a, b] = gesturePts();
      gesture = { d: Math.hypot(b.x - a.x, b.y - a.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, z: st.zoom };
    }
    function moveGesture() {
      const [a, b] = gesturePts();
      if (!a || !b) return;
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ws.scrollLeft -= mx - gesture.mx;
      ws.scrollTop -= my - gesture.my;
      gesture.mx = mx;
      gesture.my = my;
      const z = clamp(gesture.z * (d / gesture.d), 0.125, 8);
      if (Math.abs(z - st.zoom) / st.zoom > 0.02) setZoom(z, { clientX: mx, clientY: my });
    }
    ws.addEventListener('pointerdown', onDown);
    ws.addEventListener('pointermove', onMove);
    ws.addEventListener('pointerup', onUp);
    ws.addEventListener('pointercancel', onCancel);
    ws.addEventListener('pointerleave', () => { if (!op) { ring.hidden = true; clearGhost(); hideLoupe(); stPos.textContent = ''; } });
    ws.addEventListener('contextmenu', (e) => { if (!e.target.closest('.pt-textbox')) e.preventDefault(); });
    ws.addEventListener('scroll', () => { pageRect = op ? page.getBoundingClientRect() : null; }, { passive: true });
    ws.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const f = Math.exp(-clamp(e.deltaY, -120, 120) * 0.0022);
      let z = clamp(st.zoom * f, 0.125, 8);
      if ((st.zoom - 1) * (z - 1) < 0) z = 1;
      setZoom(z, e);
    }, { passive: false });

    function startOp(p, btn, e) {
      if (tbox) { commitText(); return null; }
      switch (st.tool) {
        case 'pencil': case 'eraser': case 'brush': return strokeOp(p, btn);
        case 'fill': doFill(p, btn); return null;
        case 'picker': return pickerOp(p, btn);
        case 'text': return textCreateOp(p);
        case 'zoom': setZoom(stepZoom(st.zoom, btn === 2 ? -1 : 1), e); return null;
        case 'select': return selectOp(p, btn, e);
        case 'shape': return shapeOp(p, btn, e);
        case 'sticker': return stickerOp(p);
        default: return null;
      }
    }

    // ---------------------------------------------------------------- hover feedback
    let ghostBox = null;
    function hover(e) {
      const r = page.getBoundingClientRect();
      const x = (e.clientX - r.left) / st.zoom, y = (e.clientY - r.top) / st.zoom;
      const inside = x >= 0 && y >= 0 && x < W && y < H;
      stPos.textContent = inside ? `${Math.floor(x)}, ${Math.floor(y)}px` : '';
      const f = sizeFamily();
      const size = f && f !== 'shape' ? sizeOf(f) : 0;
      const px = size * st.zoom;
      if (size && px >= 5 && !(st.tool === 'pencil' && size <= 1) && e.pointerType !== 'touch') {
        const square = st.tool === 'eraser' || st.tool === 'pencil';
        const off = square ? Math.floor(size / 2) : size / 2;
        const cx = square ? Math.floor(x) : x, cy = square ? Math.floor(y) : y;
        ring.hidden = false;
        ring.classList.toggle('sq', square);
        ring.style.left = (cx - off) * st.zoom + 'px';
        ring.style.top = (cy - off) * st.zoom + 'px';
        ring.style.width = px + 'px';
        ring.style.height = px + 'px';
        if (ws.dataset.cursor !== 'none') ws.dataset.cursor = 'none';
      } else {
        ring.hidden = true;
        if (ws.dataset.cursor === 'none' && st.tool !== 'sticker') ws.dataset.cursor = toolCursor();
      }
      if (st.tool === 'sticker' && !op) drawGhost(x, y);
      if (st.tool === 'picker') showLoupe(e, x, y, inside);
      if (!op) {
        if (st.tool === 'select') ws.dataset.cursor = sel && inSel({ x, y }) ? 'move' : 'cross';
        if (st.tool === 'shape') {
          if (pend && pend.building === 'poly') { pend.cursor = snap({ x, y }); renderPend(); ws.dataset.cursor = 'cross'; }
          else ws.dataset.cursor = pend && !pend.building && hitPend({ x, y }) ? 'move' : 'cross';
        }
      }
    }
    function toolCursor() {
      const map = { pencil: 'pencil', fill: 'fill', picker: 'picker', zoom: 'zoom', text: 'text', select: 'cross', shape: 'cross', sticker: 'none', brush: 'cross', eraser: 'cross' };
      return map[st.tool] || 'cross';
    }
    function updateCursor() {
      ws.dataset.cursor = toolCursor();
      if (st.tool !== 'sticker') clearGhost();
      ring.hidden = true;
    }
    function drawGhost(x, y) {
      clearGhost();
      const img = stickerImgs[st.sticker];
      if (!img) return;
      const spr = E.stickerSprite(img, st.sticker, st.stickerSize, st.stickerStyle, hasFloor(st.sticker));
      const gx = x - spr.width / 2, gy = y - spr.height / 2;
      octx.save();
      octx.globalAlpha = 0.55;
      octx.drawImage(spr, gx, gy);
      octx.restore();
      ghostBox = { x0: gx - 2, y0: gy - 2, x1: gx + spr.width + 2, y1: gy + spr.height + 2 };
    }
    function clearGhost() {
      if (!ghostBox) return;
      const r = clipRect(ghostBox);
      if (r) octx.clearRect(r.x, r.y, r.w, r.h);
      ghostBox = null;
      if (pend) renderPend();
    }
    function showLoupe(e, x, y, inside) {
      if (!inside) { hideLoupe(); return; }
      const c = pixelAt(Math.floor(x), Math.floor(y));
      const wr = ws.getBoundingClientRect();
      loupe.hidden = false;
      loupe.firstChild.style.setProperty('--c', c);
      loupe.lastChild.textContent = c.toUpperCase();
      loupe.style.left = (e.clientX - wr.left + ws.scrollLeft + 16) + 'px';
      loupe.style.top = (e.clientY - wr.top + ws.scrollTop + 18) + 'px';
    }
    function hideLoupe() { loupe.hidden = true; }
    function pixelAt(x, y) {
      const d = E.readback(doc, x, y, 1, 1, 'probe').data;
      return C.hex(d[0], d[1], d[2]);
    }

    // ================================================================ brush strokes
    let lastBubble = 0, lastTwinkle = 0;
    function brushSound(name) {
      const t = performance.now();
      if (name === 'bubble') {
        if (t - lastBubble > 150) { lastBubble = t; A.sound.play('bubble'); }
      } else if (name === 'twinkle') {
        if (t - lastTwinkle > 240) {
          lastTwinkle = t;
          const S = A.sound;
          if (S.ctx && A.store.get('sound.enabled')) S.bell(A.util.pick(['E6', 'G#6', 'B6', 'C#7', 'E7']), null, { vel: 0.022, dur: 0.7, ratio: 2, index: 0.7, rev: 0.45 });
        }
      }
    }
    function strokeOp(p, btn) {
      let id, color, color2;
      if (st.tool === 'pencil') { id = 'pixel'; color = btn === 2 ? st.color2 : st.color1; }
      else if (st.tool === 'eraser') {
        if (btn === 2) { id = 'recolor'; color = st.color1; color2 = st.color2; } else { id = 'eraser'; color = st.color2; }
      } else { id = st.brush; color = btn === 2 ? st.color2 : st.color1; }
      const def = E.BRUSHES[id];
      const lay = def.layered;
      const fam = sizeFamily();
      if (lay) {
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(0, 0, W, H);
        layer.style.opacity = lay.live != null ? lay.live : lay.alpha;
        layer.style.mixBlendMode = lay.composite === 'multiply' ? 'multiply' : 'normal';
        layer.hidden = false;
      }
      const s = E.start(id, { target: dctx, layer: lctx, color, color2, size: sizeOf(fam), sound: brushSound });
      s.add(p.x, p.y);
      let raf = 0, last = performance.now();
      if (def.continuous) {
        const loop = (t) => { s.tick(t - last); last = t; raf = requestAnimationFrame(loop); };
        raf = requestAnimationFrame(loop);
      }
      const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
      cleanups.push(stopLoop);
      return {
        move: (q) => s.add(q.x, q.y),
        up() {
          stopLoop();
          s.end();
          if (lay && s.bounds) {
            const r = clipRect(s.bounds);
            if (r) {
              dctx.save();
              dctx.globalAlpha = lay.alpha;
              dctx.globalCompositeOperation = lay.composite || 'source-over';
              dctx.drawImage(layer, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);
              dctx.restore();
            }
          }
          layer.hidden = true;
          if (s.bounds) commitRegion(s.bounds);
        },
        cancel() {
          stopLoop();
          layer.hidden = true;
          if (s.bounds) restoreRegion(s.bounds);
        },
      };
    }

    // ================================================================ fill, picker, stickers
    function doFill(p, btn) {
      const x = Math.floor(p.x), y = Math.floor(p.y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const color = btn === 2 ? st.color2 : st.color1;
      const img = E.readback(doc, 0, 0, W, H, 'fill');
      const box = E.floodFill(img, x, y, color, 40);
      if (!box) return;
      dctx.putImageData(img, 0, 0, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
      commitRegion(box);
      A.sound.play('plop');
      burst(p, color, false);
    }
    function pickerOp(p, btn) {
      const n = btn === 2 ? 2 : 1;
      const pick = (q) => {
        const x = Math.floor(q.x), y = Math.floor(q.y);
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        setColor(n, pixelAt(x, y), true);
      };
      pick(p);
      return {
        move: pick,
        up() {
          A.sound.play('click');
          hideLoupe();
          const back = st.lastTool && st.lastTool !== 'picker' ? st.lastTool : 'pencil';
          setTool(back);
        },
        cancel() {},
      };
    }
    const stickerImgs = {};
    STICKERS.forEach((id) => {
      A.util.loadImage('icons/' + id).then((img) => { stickerImgs[id] = img; }).catch(() => {});
    });
    const hasFloor = (id) => { const svg = A.ASSET_SVG && A.ASSET_SVG['icons/' + id]; return !!svg && svg.indexOf('url(#floor)') >= 0; };
    function stickerOp(p) {
      const img = stickerImgs[st.sticker];
      if (!img) return null;
      clearGhost();
      let bounds = null, last = p;
      const spr = () => E.stickerSprite(img, st.sticker, st.stickerSize, st.stickerStyle, hasFloor(st.sticker));
      const stamp = (q) => {
        const s = spr();
        const ang = st.stickerTilt ? (Math.random() - 0.5) * 0.5 : 0;
        dctx.save();
        dctx.translate(q.x, q.y);
        dctx.rotate(ang);
        dctx.drawImage(s, -s.width / 2, -s.height / 2);
        dctx.restore();
        const R = Math.hypot(s.width, s.height) / 2 + 2;
        bounds = union(bounds, { x0: q.x - R, y0: q.y - R, x1: q.x + R, y1: q.y + R });
        A.sound.play('pop', { minGap: 90 });
        burst(q, '#7cc8ff', true);
      };
      stamp(p);
      const spacing = Math.max(12, st.stickerSize * 0.95);
      return {
        move(q) { if (Math.hypot(q.x - last.x, q.y - last.y) >= spacing) { stamp(q); last = q; } },
        up() { if (bounds) commitRegion(bounds); },
        cancel() { if (bounds) restoreRegion(bounds); },
      };
    }
    function burst(p, color, big) {
      const el = h('div.pt-burst', { style: { left: p.x * st.zoom + 'px', top: p.y * st.zoom + 'px', '--c': color } });
      el.appendChild(h('b', { style: { '--s': big ? 4.2 : 2.6 } }));
      const n = big ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + Math.random() * 0.6, d = (big ? 26 : 16) + Math.random() * 16;
        el.appendChild(h('i', { style: { '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', animationDelay: Math.round(Math.random() * 60) + 'ms' } }));
      }
      page.appendChild(el);
      setTimeout(() => el.remove(), 750);
    }

    // ================================================================ selection
    function polyPath(pts, sx, sy, ox, oy) {
      const p = new Path2D();
      pts.forEach(([x, y], i) => (i ? p.lineTo(ox + x * sx, oy + y * sy) : p.moveTo(ox + x * sx, oy + y * sy)));
      p.closePath();
      return p;
    }
    function inSel(p) { return !!sel && p.x >= sel.x && p.y >= sel.y && p.x < sel.x + sel.w && p.y < sel.y + sel.h; }
    function selectOp(p, btn, e) {
      if (btn === 2) return { move() {}, up: (q, ev) => showSelMenu(ev), cancel() {} };
      if (sel && inSel(p)) return moveSelOp(p, e);
      commitSelection();
      return st.selMode === 'free' ? lassoOp(p) : marqueeOp(p);
    }
    function marqueeOp(p0) {
      const sx = clamp(Math.round(p0.x), 0, W), sy = clamp(Math.round(p0.y), 0, H);
      return {
        move(q, ev) {
          let x = clamp(Math.round(q.x), 0, W), y = clamp(Math.round(q.y), 0, H);
          if (ev.shiftKey) {
            const d = Math.min(Math.abs(x - sx), Math.abs(y - sy));
            x = sx + Math.sign(x - sx) * d;
            y = sy + Math.sign(y - sy) * d;
          }
          const r = { x: Math.min(sx, x), y: Math.min(sy, y), w: Math.abs(x - sx), h: Math.abs(y - sy) };
          sel = r.w >= 1 && r.h >= 1 ? Object.assign(r, { poly: null, float: null }) : null;
          renderSel();
        },
        up() { renderSel(); updateButtons(); },
        cancel() { sel = null; renderSel(); },
      };
    }
    function lassoOp(p0) {
      const pts = [[clamp(p0.x, 0, W), clamp(p0.y, 0, H)]];
      return {
        move(q) {
          const last = pts[pts.length - 1];
          const pt = [clamp(q.x, 0, W), clamp(q.y, 0, H)];
          if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < 1) return;
          pts.push(pt);
          drawAnts(selBox, pts.map(([x, y]) => [x * st.zoom, y * st.zoom]), false, 0, 0);
          placeHandles(selHandles, 0, 0, false);
          selBox.hidden = false;
          selBox.style.left = '0px';
          selBox.style.top = '0px';
          selBox.style.width = '0px';
          selBox.style.height = '0px';
        },
        up() {
          if (pts.length < 3) { sel = null; renderSel(); return; }
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
          pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
          x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
          if (x1 - x0 < 2 || y1 - y0 < 2) { sel = null; renderSel(); return; }
          sel = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, poly: pts.map(([x, y]) => [x - x0, y - y0]), pw: x1 - x0, ph: y1 - y0, float: null };
          renderSel();
          updateButtons();
        },
        cancel() { sel = null; renderSel(); },
      };
    }
    function selPolyScaled() {
      if (!sel || !sel.poly) return null;
      const kx = sel.w / (sel.pw || sel.w), ky = sel.h / (sel.ph || sel.h);
      return sel.poly.map(([x, y]) => [x * kx, y * ky]);
    }
    function liftSelection(copyOnly) {
      const { x, y, w } = sel, hh = sel.h;
      const f = E.canvas(w, hh), fx = f.getContext('2d');
      fx.drawImage(doc, x, y, w, hh, 0, 0, w, hh);
      if (sel.poly) {
        fx.globalCompositeOperation = 'destination-in';
        fx.fill(polyPath(selPolyScaled(), 1, 1, 0, 0));
        fx.globalCompositeOperation = 'source-over';
      }
      sel.orig = f;
      sel.float = st.transparent ? keyedCopy(f) : f;
      sel.pw = w;
      sel.ph = hh;
      sel.dirty = null;
      if (!copyOnly) {
        dctx.save();
        dctx.fillStyle = st.color2;
        if (sel.poly) dctx.fill(polyPath(sel.poly, 1, 1, x, y)); else dctx.fillRect(x, y, w, hh);
        dctx.restore();
        sel.dirty = { x0: x - 1, y0: y - 1, x1: x + w + 1, y1: y + hh + 1 };
      }
      renderSel();
    }
    function keyedCopy(c) {
      const k = E.canvas(c.width, c.height);
      k.getContext('2d').drawImage(c, 0, 0);
      E.keyOut(k, st.color2, 24);
      return k;
    }
    function stampFloat() {
      if (!sel || !sel.float) return;
      dctx.save();
      dctx.imageSmoothingQuality = 'high';
      dctx.drawImage(sel.float, sel.x, sel.y, sel.w, sel.h);
      dctx.restore();
      sel.dirty = union(sel.dirty, { x0: sel.x - 1, y0: sel.y - 1, x1: sel.x + sel.w + 1, y1: sel.y + sel.h + 1 });
    }
    function commitSelection() {
      if (!sel) return;
      if (sel.float) {
        stampFloat();
        if (sel.dirty) commitRegion(sel.dirty);
      }
      sel = null;
      renderSel();
      updateButtons();
    }
    function moveSelOp(p0, e) {
      if (!sel.float) liftSelection(e.ctrlKey || e.metaKey);
      else if (e.ctrlKey || e.metaKey) stampFloat();
      const ox = sel.x, oy = sel.y;
      return {
        move(q, ev) {
          sel.x = Math.round(ox + q.x - p0.x);
          sel.y = Math.round(oy + q.y - p0.y);
          if (ev.shiftKey) stampFloat();
          renderSel();
        },
        up() { updateButtons(); },
        cancel() { sel.x = ox; sel.y = oy; renderSel(); },
      };
    }
    function selectionCanvas() {
      if (!sel) return null;
      const c = E.canvas(sel.w, sel.h), x = c.getContext('2d');
      if (sel.float) {
        x.imageSmoothingQuality = 'high';
        x.drawImage(sel.float, 0, 0, sel.w, sel.h);
      } else {
        x.drawImage(doc, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h);
        if (sel.poly) {
          x.globalCompositeOperation = 'destination-in';
          x.fill(polyPath(selPolyScaled(), 1, 1, 0, 0));
        }
      }
      return c;
    }
    function selectAll() {
      setTool('select');
      commitTransient();
      sel = { x: 0, y: 0, w: W, h: H, poly: null, float: null };
      renderSel();
      updateButtons();
    }
    function deleteSelection() {
      if (!sel) return;
      if (sel.float) {
        if (sel.dirty) commitRegion(sel.dirty);
      } else {
        dctx.save();
        dctx.fillStyle = st.color2;
        if (sel.poly) dctx.fill(polyPath(selPolyScaled(), 1, 1, sel.x, sel.y)); else dctx.fillRect(sel.x, sel.y, sel.w, sel.h);
        dctx.restore();
        commitRegion({ x0: sel.x - 1, y0: sel.y - 1, x1: sel.x + sel.w + 1, y1: sel.y + sel.h + 1 });
      }
      sel = null;
      renderSel();
      updateButtons();
    }
    function setTransparent(on) {
      st.transparent = on;
      if (sel && sel.float && sel.orig) {
        sel.float = on ? keyedCopy(sel.orig) : sel.orig;
        renderSel();
      }
    }
    function setSelMode(m) {
      st.selMode = m;
      setTool('select');
    }
    // Applies fn(canvas) -> canvas to the selection pixels, keeping its center.
    function transformSel(fn) {
      if (!sel.float) liftSelection(false);
      const cx = sel.x + sel.w / 2, cy = sel.y + sel.h / 2;
      const bake = (src) => {
        const c = E.canvas(sel.w, sel.h), x = c.getContext('2d');
        x.imageSmoothingQuality = 'high';
        x.drawImage(src, 0, 0, sel.w, sel.h);
        return fn(c);
      };
      sel.orig = bake(sel.orig || sel.float);
      sel.float = st.transparent ? keyedCopy(sel.orig) : sel.orig;
      sel.w = sel.orig.width;
      sel.h = sel.orig.height;
      sel.pw = sel.w;
      sel.ph = sel.h;
      sel.x = Math.round(cx - sel.w / 2);
      sel.y = Math.round(cy - sel.h / 2);
      sel.poly = null;
      renderSel();
      updateButtons();
    }
    let floatEl = null;
    const selHandles = makeHandles(selBox, {
      start() {
        if (!sel.float) liftSelection(false);
        return { x: sel.x, y: sel.y, w: sel.w, h: sel.h };
      },
      move(r) {
        sel.x = Math.round(r.x); sel.y = Math.round(r.y);
        sel.w = Math.max(1, Math.round(r.w)); sel.h = Math.max(1, Math.round(r.h));
        renderSel();
      },
    });
    function renderSel() {
      if (!sel) {
        selBox.hidden = true;
        if (floatEl) { floatEl.remove(); floatEl = null; }
        updateStatus();
        return;
      }
      const z = st.zoom;
      selBox.hidden = false;
      Object.assign(selBox.style, { left: sel.x * z + 'px', top: sel.y * z + 'px', width: sel.w * z + 'px', height: sel.h * z + 'px' });
      const poly = selPolyScaled();
      if (poly) drawAnts(selBox, poly.map(([x, y]) => [x * z, y * z]), true, 0, 0);
      else drawAnts(selBox, [[0, 0], [sel.w * z, 0], [sel.w * z, sel.h * z], [0, sel.h * z]], true, 0, 0);
      placeHandles(selHandles, sel.w * z, sel.h * z, true);
      if (sel.float) {
        if (!floatEl || floatEl.src !== sel.float) {
          if (floatEl) floatEl.remove();
          floatEl = sel.float;
          floatEl.className = 'pt-float';
          floatEl.src = sel.float;
          page.insertBefore(floatEl, over);
        }
        Object.assign(floatEl.style, { left: sel.x * z + 'px', top: sel.y * z + 'px', width: sel.w * z + 'px', height: sel.h * z + 'px' });
      } else if (floatEl) { floatEl.remove(); floatEl = null; }
      updateStatus();
    }
    function drawAnts(box, pts, closedPath, ox, oy) {
      let svg = box.querySelector('svg');
      if (!svg) {
        svg = A.util.s('svg', { class: 'pt-ants' }, A.util.s('path', { class: 'pt-ants-a' }), A.util.s('path', { class: 'pt-ants-b' }));
        box.insertBefore(svg, box.firstChild);
      }
      let x1 = 0, y1 = 0;
      const d = pts.map(([x, y], i) => { x1 = Math.max(x1, x); y1 = Math.max(y1, y); return (i ? 'L' : 'M') + (x + ox + 1.5).toFixed(1) + ' ' + (y + oy + 1.5).toFixed(1); }).join(' ') + (closedPath ? ' Z' : '');
      svg.setAttribute('width', Math.ceil(x1 + 3));
      svg.setAttribute('height', Math.ceil(y1 + 3));
      svg.childNodes.forEach((p) => p.setAttribute('d', d));
    }
    function showSelMenu(e) {
      const has = !!sel;
      A.ui.menu([
        { label: 'Cut', shortcut: 'Ctrl+X', disabled: !has, onClick: cut },
        { label: 'Copy', shortcut: 'Ctrl+C', disabled: !has, onClick: copy },
        { label: 'Paste', shortcut: 'Ctrl+V', onClick: () => paste() },
        { separator: true },
        { label: 'Select all', shortcut: 'Ctrl+A', onClick: selectAll },
        { label: 'Delete', shortcut: 'Del', disabled: !has, onClick: deleteSelection },
        { label: 'Crop', shortcut: 'Ctrl+Shift+X', disabled: !has, onClick: crop },
        { separator: true },
        { label: 'Rotate', submenu: [{ label: 'Rotate right 90°', onClick: () => rotate(90) }, { label: 'Rotate left 90°', onClick: () => rotate(-90) }, { label: 'Rotate 180°', onClick: () => rotate(180) }] },
        { label: 'Flip', submenu: [{ label: 'Flip vertical', onClick: () => flip(false) }, { label: 'Flip horizontal', onClick: () => flip(true) }] },
        { label: 'Resize and skew...', shortcut: 'Ctrl+W', onClick: resizeDialog },
        { label: 'Invert color', shortcut: 'Ctrl+Shift+I', onClick: invertColors },
        { separator: true },
        { label: 'Transparent selection', checked: st.transparent, onClick: () => setTransparent(!st.transparent) },
      ], e.clientX, e.clientY);
    }
    function selectMenu() {
      return [
        { header: 'Selection shapes' },
        { label: 'Rectangular selection', checked: st.selMode === 'rect', radio: true, icon: iconURL('select'), onClick: () => setSelMode('rect') },
        { label: 'Free-form selection', checked: st.selMode === 'free', radio: true, icon: iconURL('selectFree'), onClick: () => setSelMode('free') },
        { header: 'Selection options' },
        { label: 'Select all', shortcut: 'Ctrl+A', onClick: selectAll },
        { label: 'Delete', shortcut: 'Del', disabled: !sel, onClick: deleteSelection },
        { label: 'Transparent selection', checked: st.transparent, onClick: () => setTransparent(!st.transparent) },
      ];
    }

    // ---------------------------------------------------------------- handles (shared)
    function makeHandles(box, o) {
      const els = {};
      DIRS.forEach((d) => {
        const el = h('div.pt-hdl', { style: { cursor: DIR_CURSOR[d] }, dataset: { dir: d } });
        el.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          if (op) return;
          const start = o.start(d);
          if (!start) return;
          const sx = e.clientX, sy = e.clientY;
          try { el.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
          const mv = (ev) => o.move(resizeRect(start, d, (ev.clientX - sx) / st.zoom, (ev.clientY - sy) / st.zoom, ev.shiftKey), ev);
          const up = () => {
            el.removeEventListener('pointermove', mv);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('pointercancel', up);
            if (o.end) o.end();
            updateButtons();
          };
          el.addEventListener('pointermove', mv);
          el.addEventListener('pointerup', up);
          el.addEventListener('pointercancel', up);
        });
        box.appendChild(el);
        els[d] = el;
      });
      return els;
    }
    function placeHandles(els, w, hh, show) {
      const pos = { nw: [0, 0], n: [w / 2, 0], ne: [w, 0], e: [w, hh / 2], se: [w, hh], s: [w / 2, hh], sw: [0, hh], w: [0, hh / 2] };
      const small = w < 22 || hh < 22;
      for (const d in els) {
        els[d].hidden = !show || (small && d.length === 1);
        els[d].style.left = pos[d][0] + 'px';
        els[d].style.top = pos[d][1] + 'px';
      }
    }
    function resizeRect(r, d, dx, dy, keep) {
      let x = r.x, y = r.y, w = r.w, hh = r.h;
      if (d.includes('e')) w = r.w + dx;
      if (d.includes('s')) hh = r.h + dy;
      if (d.includes('w')) { w = r.w - dx; x = r.x + dx; }
      if (d.includes('n')) { hh = r.h - dy; y = r.y + dy; }
      if (keep && d.length === 2 && r.w > 0 && r.h > 0) {
        const k = Math.max(w / r.w, hh / r.h);
        const nw = r.w * k, nh = r.h * k;
        if (d.includes('w')) x = r.x + r.w - nw;
        if (d.includes('n')) y = r.y + r.h - nh;
        w = nw; hh = nh;
      }
      if (w < 1) { if (d.includes('w')) x = r.x + r.w - 1; w = 1; }
      if (hh < 1) { if (d.includes('n')) y = r.y + r.h - 1; hh = 1; }
      return { x, y, w, h: hh };
    }

    // ================================================================ shapes
    let pendDirty = null;
    const snap = (p) => ({ x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5 });
    function snap45(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      return { x: Math.round(a.x + Math.cos(ang) * len - 0.5) + 0.5, y: Math.round(a.y + Math.sin(ang) * len - 0.5) + 0.5 };
    }
    const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
    function distToSeg(p, a, b) {
      const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      if (!l2) return dist(p, a);
      const t = clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2, 0, 1);
      return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
    function pendSpec() {
      const c1 = pend.swap ? st.color2 : st.color1, c2 = pend.swap ? st.color1 : st.color2;
      const spec = { id: pend.id, outline: st.outline, fill: st.fill, strokeColor: c1, fillColor: c2, width: sizeOf('shape') };
      if (pend.pts) {
        spec.pts = pend.pts;
        if (pend.building === 'poly') {
          spec.pts = pend.cursor ? pend.pts.concat([pend.cursor]) : pend.pts;
          spec.open = true;
        }
      } else Object.assign(spec, { x0: pend.x0, y0: pend.y0, x1: pend.x1, y1: pend.y1 });
      return spec;
    }
    function pendBBox() {
      if (!pend) return null;
      if (pend.pts) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        pend.pts.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
        return { x0, y0, x1, y1 };
      }
      return { x0: Math.min(pend.x0, pend.x1), y0: Math.min(pend.y0, pend.y1), x1: Math.max(pend.x0, pend.x1), y1: Math.max(pend.y0, pend.y1) };
    }
    function renderPend() {
      if (pendDirty) {
        const r = clipRect(pendDirty);
        if (r) octx.clearRect(r.x, r.y, r.w, r.h);
        pendDirty = null;
      }
      if (pend) {
        const spec = pendSpec();
        if (spec.pts && spec.pts.length === 1) spec.pts = [spec.pts[0], { x: spec.pts[0].x + 0.01, y: spec.pts[0].y }];
        pendDirty = E.renderShape(octx, spec);
      }
      positionPendBox();
      updateStatus();
    }
    function dropPend() {
      pend = null;
      renderPend();
    }
    function hitPend(p) {
      if (!pend) return false;
      const lw = sizeOf('shape') / 2;
      const m = Math.max(4 / st.zoom, lw + 2 / st.zoom);
      if (pend.kind === 'line') return distToSeg(p, pend.pts[0], pend.pts[1]) <= m + 2 / st.zoom;
      const b = pendBBox();
      return p.x >= b.x0 - m && p.x <= b.x1 + m && p.y >= b.y0 - m && p.y <= b.y1 + m;
    }
    function shapeOp(p, btn) {
      const def = E.SHAPE[st.shape];
      const q = snap(p);
      if (pend && pend.building === 'poly') return polyAddOp(q);
      if (pend && (pend.building === 'bend1' || pend.building === 'bend2')) return bendOp(q);
      if (pend && !pend.building && hitPend(p)) return movePendOp(p);
      commitPending();
      pend = { id: def.id, kind: def.kind, swap: btn === 2, building: 'drag' };
      if (def.kind === 'box') {
        Object.assign(pend, { x0: q.x, y0: q.y, x1: q.x, y1: q.y });
        return {
          move(r, ev) {
            let t = snap(r);
            if (ev.shiftKey) {
              const dx = t.x - pend.x0, dy = t.y - pend.y0, d = Math.max(Math.abs(dx), Math.abs(dy));
              t = { x: pend.x0 + (dx < 0 ? -d : d), y: pend.y0 + (dy < 0 ? -d : d) };
            }
            pend.x1 = t.x;
            pend.y1 = t.y;
            renderPend();
          },
          up() {
            if (!pend) return;
            pend.building = null;
            if (Math.abs(pend.x1 - pend.x0) < 2 && Math.abs(pend.y1 - pend.y0) < 2) { dropPend(); return; }
            renderPend();
          },
          cancel() { dropPend(); },
        };
      }
      pend.pts = [q, { x: q.x, y: q.y }];
      return {
        move(r, ev) {
          let t = snap(r);
          if (ev.shiftKey) t = snap45(pend.pts[0], t);
          pend.pts[1] = t;
          renderPend();
        },
        up() {
          if (!pend) return;
          const [a, b] = pend.pts;
          const tiny = dist(a, b) < 2;
          if (def.kind === 'line') {
            if (tiny) { dropPend(); return; }
            pend.building = null;
          } else if (def.kind === 'curve') {
            if (tiny) { dropPend(); return; }
            pend.pts = [a, { x: a.x, y: a.y }, { x: b.x, y: b.y }, b];
            pend.building = 'bend1';
          } else {
            if (tiny) pend.pts = [a];
            pend.building = 'poly';
            pend.lastClick = performance.now();
          }
          renderPend();
        },
        cancel() { dropPend(); },
      };
    }
    function polyAddOp(q) {
      const pts = pend.pts;
      const now = performance.now();
      const closeDist = 6 / st.zoom;
      const lastPt = pts[pts.length - 1];
      if ((now - (pend.lastClick || 0) < 420 && dist(q, lastPt) < closeDist * 1.6) || (pts.length >= 3 && dist(q, pts[0]) < closeDist)) {
        finishPoly();
        return null;
      }
      pts.push(q);
      pend.lastClick = now;
      pend.cursor = null;
      renderPend();
      return {
        move(r, ev) {
          let t = snap(r);
          if (ev.shiftKey) t = snap45(pts[pts.length - 2], t);
          pts[pts.length - 1] = t;
          renderPend();
        },
        up() {
          const n = pts.length;
          if (n >= 4 && dist(pts[n - 1], pts[0]) < closeDist) { pts.pop(); finishPoly(); return; }
          pend.lastClick = performance.now();
        },
        cancel() { pts.pop(); renderPend(); },
      };
    }
    function finishPoly() {
      if (!pend) return;
      const pts = pend.pts;
      while (pts.length > 1 && dist(pts[pts.length - 1], pts[pts.length - 2]) < 1.5) pts.pop();
      if (pts.length < 3) { dropPend(); return; }
      pend.open = false;
      pend.building = null;
      pend.cursor = null;
      renderPend();
    }
    function bendOp(q) {
      const stage = pend.building;
      const apply = (t) => {
        if (stage === 'bend1') { pend.pts[1] = t; pend.pts[2] = { x: t.x, y: t.y }; } else pend.pts[2] = t;
        renderPend();
      };
      apply(q);
      return {
        move(r) { apply(snap(r)); },
        up() { if (pend) { pend.building = stage === 'bend1' ? 'bend2' : null; renderPend(); } },
        cancel() {},
      };
    }
    const clonePend = (p) => JSON.parse(JSON.stringify(p));
    function movePendOp(p0) {
      const base = clonePend(pend);
      const shift = (dx, dy) => {
        if (base.pts) pend.pts = base.pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        else { pend.x0 = base.x0 + dx; pend.y0 = base.y0 + dy; pend.x1 = base.x1 + dx; pend.y1 = base.y1 + dy; }
        renderPend();
      };
      return {
        move(q) { shift(Math.round(q.x - p0.x), Math.round(q.y - p0.y)); },
        up() {},
        cancel() { shift(0, 0); },
      };
    }
    function commitPending() {
      if (!pend) return;
      if (pend.building === 'poly') { finishPoly(); if (!pend) return; }
      if (pend.building === 'drag') return;
      const spec = pendSpec();
      pend = null;
      renderPend();
      const d = E.renderShape(dctx, spec);
      if (d) commitRegion(d);
    }
    // Box handles and point handles for the pending shape.
    const pendFrame = h('div.pt-box-frame');
    pendBox.appendChild(pendFrame);
    const pendHandles = makeHandles(pendBox, {
      start() {
        if (!pend || pend.building) return null;
        const b = pendBBox();
        pendBox._base = clonePend(pend);
        pendBox._box = b;
        return { x: b.x0, y: b.y0, w: Math.max(1, b.x1 - b.x0), h: Math.max(1, b.y1 - b.y0) };
      },
      move(r) {
        const base = pendBox._base, b = pendBox._box;
        if (base.pts) {
          const kx = r.w / Math.max(1, b.x1 - b.x0), ky = r.h / Math.max(1, b.y1 - b.y0);
          pend.pts = base.pts.map((p) => ({ x: r.x + (p.x - b.x0) * kx, y: r.y + (p.y - b.y0) * ky }));
        } else {
          if (base.x1 >= base.x0) { pend.x0 = r.x; pend.x1 = r.x + r.w; } else { pend.x1 = r.x; pend.x0 = r.x + r.w; }
          if (base.y1 >= base.y0) { pend.y0 = r.y; pend.y1 = r.y + r.h; } else { pend.y1 = r.y; pend.y0 = r.y + r.h; }
        }
        renderPend();
      },
    });
    const pointHandles = [0, 1, 2, 3].map((i) => {
      const el = h('div.pt-hdl.pt-pt', { style: { cursor: 'move' }, hidden: true });
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !pend || !pend.pts || pend.building) return;
        e.preventDefault();
        e.stopPropagation();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
        const mv = (ev) => {
          pageRect = page.getBoundingClientRect();
          let t = snap(toDoc(ev));
          if (ev.shiftKey && pend.kind === 'line') t = snap45(pend.pts[1 - i], t);
          pend.pts[i] = t;
          pageRect = null;
          renderPend();
        };
        const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
        el.addEventListener('pointermove', mv);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      });
      pendBox.appendChild(el);
      return el;
    });
    function positionPendBox() {
      if (!pend || pend.building) { pendBox.hidden = true; return; }
      const z = st.zoom, b = pendBBox();
      const pointMode = pend.kind === 'line' || pend.kind === 'curve';
      pendBox.hidden = false;
      Object.assign(pendBox.style, { left: b.x0 * z + 'px', top: b.y0 * z + 'px', width: Math.max(1, (b.x1 - b.x0) * z) + 'px', height: Math.max(1, (b.y1 - b.y0) * z) + 'px' });
      pendFrame.hidden = pointMode;
      placeHandles(pendHandles, (b.x1 - b.x0) * z, (b.y1 - b.y0) * z, !pointMode);
      pointHandles.forEach((el, i) => {
        const p = pointMode && pend.pts[i];
        el.hidden = !p;
        if (p) { el.style.left = (p.x - b.x0) * z + 'px'; el.style.top = (p.y - b.y0) * z + 'px'; }
      });
    }

    // ================================================================ text
    function textFont() {
      const t = st.text;
      return `${t.italic ? 'italic ' : ''}${t.bold ? 700 : 400} ${t.size}px "${t.family}", Selawik, sans-serif`;
    }
    function textCreateOp(p0) {
      const x0 = Math.floor(clamp(p0.x, 0, W - 1)), y0 = Math.floor(clamp(p0.y, 0, H - 1));
      let r = null;
      const band = h('div.pt-box', null, h('div.pt-box-frame'));
      page.appendChild(band);
      const show = () => {
        const z = st.zoom;
        if (!r) { band.hidden = true; return; }
        band.hidden = false;
        Object.assign(band.style, { left: r.x * z + 'px', top: r.y * z + 'px', width: r.w * z + 'px', height: r.h * z + 'px' });
      };
      show();
      return {
        move(q) {
          const x = Math.round(clamp(q.x, 0, W)), y = Math.round(clamp(q.y, 0, H));
          r = { x: Math.min(x0, x), y: Math.min(y0, y), w: Math.abs(x - x0), h: Math.abs(y - y0) };
          show();
        },
        up() {
          band.remove();
          const lh = Math.ceil(st.text.size * 1.2) + 6;
          const box = r && r.w > 16 && r.h > 12 ? r : { x: x0, y: y0, w: Math.max(120, Math.min(W - x0, st.text.size * 9)), h: lh };
          box.h = Math.max(box.h, lh);
          createText(box);
        },
        cancel() { band.remove(); },
      };
    }
    function createText(box) {
      const ta = h('textarea', { spellcheck: false, 'aria-label': 'Text', rows: 1 });
      const el = h('div.pt-textbox', null, ta);
      docspace.appendChild(el);
      tbox = { x: box.x, y: box.y, w: box.w, h: box.h, minH: box.h, el, ta };
      ta.addEventListener('input', autoGrow);
      ta.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && (k === 'b' || k === 'i' || k === 'u')) {
          e.preventDefault();
          setTextOpt(k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline', !st.text[k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline']);
        }
      });
      applyTextStyle();
      positionText();
      setTimeout(() => ta.focus(), 0);
      updateButtons();
    }
    function autoGrow() {
      if (!tbox) return;
      const ta = tbox.ta;
      ta.style.height = 'auto';
      const need = Math.max(tbox.minH, Math.ceil(ta.scrollHeight));
      ta.style.height = '';
      if (need !== tbox.h) { tbox.h = need; positionText(); }
    }
    function applyTextStyle() {
      fontSel.value = st.text.family;
      sizeSel.value = String(st.text.size);
      fmtBtns.forEach((b) => b.classList.toggle('pt-on', !!st.text[b.dataset.fmt]));
      btnOpaque.classList.toggle('pt-on', st.text.opaque);
      btnTransparent.classList.toggle('pt-on', !st.text.opaque);
      if (!tbox) return;
      const t = st.text, s = tbox.ta.style;
      s.font = textFont();
      s.lineHeight = '1.2';
      s.color = st.color1;
      s.background = t.opaque ? st.color2 : 'transparent';
      s.textDecoration = [t.underline && 'underline', t.strike && 'line-through'].filter(Boolean).join(' ') || 'none';
      autoGrow();
    }
    function setTextOpt(k, v) {
      st.text[k] = v;
      store('text', st.text);
      if (k === 'family' && document.fonts && document.fonts.load) document.fonts.load(textFont()).catch(() => {});
      applyTextStyle();
      if (tbox) setTimeout(() => tbox && tbox.ta.focus(), 0);
    }
    const textHandles = makeHandles(textFrame, {
      start() { return tbox ? { x: tbox.x, y: tbox.y, w: tbox.w, h: tbox.h } : null; },
      move(r) {
        tbox.x = Math.round(r.x); tbox.y = Math.round(r.y);
        tbox.w = Math.max(24, Math.round(r.w));
        tbox.minH = Math.max(Math.ceil(st.text.size * 1.2) + 4, Math.round(r.h));
        tbox.h = tbox.minH;
        positionText();
        autoGrow();
      },
      end() { if (tbox) tbox.ta.focus(); },
    });
    const textEdges = ['t', 'r', 'b', 'l'].map((side) => {
      const el = h('div.pt-edge', { dataset: { side } });
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !tbox) return;
        e.preventDefault();
        e.stopPropagation();
        const sx = e.clientX, sy = e.clientY, ox = tbox.x, oy = tbox.y;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
        const mv = (ev) => { tbox.x = Math.round(ox + (ev.clientX - sx) / st.zoom); tbox.y = Math.round(oy + (ev.clientY - sy) / st.zoom); positionText(); };
        const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); if (tbox) tbox.ta.focus(); };
        el.addEventListener('pointermove', mv);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      });
      textFrame.appendChild(el);
      return el;
    });
    textFrame.appendChild(h('div.pt-box-frame'));
    function positionText() {
      updateStatus();
      if (!tbox) { textFrame.hidden = true; return; }
      const z = st.zoom;
      Object.assign(tbox.el.style, { left: tbox.x + 'px', top: tbox.y + 'px', width: tbox.w + 'px', height: tbox.h + 'px' });
      textFrame.hidden = false;
      const w = tbox.w * z, hh = tbox.h * z;
      Object.assign(textFrame.style, { left: tbox.x * z + 'px', top: tbox.y * z + 'px', width: w + 'px', height: hh + 'px' });
      placeHandles(textHandles, w, hh, true);
      const E4 = 5;
      Object.assign(textEdges[0].style, { left: '0px', top: -E4 + 'px', width: w + 'px', height: E4 + 'px' });
      Object.assign(textEdges[1].style, { left: w + 'px', top: '0px', width: E4 + 'px', height: hh + 'px' });
      Object.assign(textEdges[2].style, { left: '0px', top: hh + 'px', width: w + 'px', height: E4 + 'px' });
      Object.assign(textEdges[3].style, { left: -E4 + 'px', top: '0px', width: E4 + 'px', height: hh + 'px' });
    }
    function wrapText(ctx, text, maxW) {
      const out = [];
      const fits = (s) => ctx.measureText(s).width <= maxW;
      text.split('\n').forEach((para) => {
        let line = '';
        const tokens = para.match(/\s+|\S+/g) || [];
        tokens.forEach((tok) => {
          if (/^\s+$/.test(tok)) { line += tok; return; }
          if (fits(line + tok)) { line += tok; return; }
          if (line.trim()) { out.push(line.replace(/\s+$/, '')); line = ''; }
          else line = '';
          let word = tok;
          while (word && !fits(word)) {
            let n = word.length - 1;
            while (n > 1 && !fits(word.slice(0, n))) n--;
            out.push(word.slice(0, n));
            word = word.slice(n);
          }
          line = word;
        });
        out.push(line.replace(/\s+$/, ''));
      });
      return out;
    }
    function commitText() {
      if (!tbox) return;
      const tb = tbox;
      const text = tb.ta.value;
      if (text.replace(/\s/g, '') || st.text.opaque) {
        const t = st.text;
        dctx.save();
        if (t.opaque) { dctx.fillStyle = st.color2; dctx.fillRect(tb.x, tb.y, tb.w, tb.h); }
        dctx.font = textFont();
        dctx.fillStyle = st.color1;
        dctx.strokeStyle = st.color1;
        dctx.textBaseline = 'alphabetic';
        const lh = t.size * 1.2;
        const m = dctx.measureText('Hg');
        const asc = m.fontBoundingBoxAscent != null ? m.fontBoundingBoxAscent : t.size * 0.8;
        const desc = m.fontBoundingBoxDescent != null ? m.fontBoundingBoxDescent : t.size * 0.22;
        const base = (lh - (asc + desc)) / 2 + asc;
        const lines = wrapText(dctx, text, Math.max(8, tb.w - 4));
        dctx.lineWidth = Math.max(1, t.size / 16);
        lines.forEach((ln, i) => {
          const y = tb.y + 2 + i * lh + base;
          dctx.fillText(ln, tb.x + 2, y);
          const wdt = dctx.measureText(ln).width;
          if (t.underline && wdt) { dctx.beginPath(); dctx.moveTo(tb.x + 2, y + t.size * 0.12); dctx.lineTo(tb.x + 2 + wdt, y + t.size * 0.12); dctx.stroke(); }
          if (t.strike && wdt) { dctx.beginPath(); dctx.moveTo(tb.x + 2, y - t.size * 0.3); dctx.lineTo(tb.x + 2 + wdt, y - t.size * 0.3); dctx.stroke(); }
        });
        dctx.restore();
        const hh = Math.max(tb.h, lines.length * lh + 6);
        commitRegion({ x0: tb.x - 2, y0: tb.y - 2, x1: tb.x + tb.w + t.size, y1: tb.y + hh + t.size * 0.5 });
      }
      removeText();
    }
    function removeText() {
      if (!tbox) return;
      tbox.el.remove();
      tbox = null;
      positionText();
      updateButtons();
      updateStatus();
      if (document.activeElement === document.body || !root.contains(document.activeElement)) ws.focus({ preventScroll: true });
    }

    // ================================================================ canvas resize handles
    Object.keys(cvh).forEach((dir) => {
      const el = cvh[dir];
      el.setAttribute('data-tip', 'Drag to change the canvas size');
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        commitTransient();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
        const sx = e.clientX, sy = e.clientY;
        let nw = W, nh = H, cancelled = false;
        ghostOutline.hidden = false;
        const show = () => {
          ghostOutline.style.width = nw * st.zoom + 'px';
          ghostOutline.style.height = nh * st.zoom + 'px';
          stSize.textContent = `${nw} × ${nh}px`;
        };
        show();
        const mv = (ev) => {
          if (dir !== 's') nw = clamp(Math.round(W + (ev.clientX - sx) / st.zoom), 1, MAX_DIM);
          if (dir !== 'e') nh = clamp(Math.round(H + (ev.clientY - sy) / st.zoom), 1, MAX_DIM);
          show();
        };
        const esc = (ev) => { if (ev.key === 'Escape') { cancelled = true; up(); } };
        const up = () => {
          el.removeEventListener('pointermove', mv);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', cancel);
          window.removeEventListener('keydown', esc, true);
          ghostOutline.hidden = true;
          if (!cancelled && (nw !== W || nh !== H)) resizeCanvas(nw, nh);
          else updateStatus();
        };
        const cancel = () => { cancelled = true; up(); };
        el.addEventListener('pointermove', mv);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', cancel);
        window.addEventListener('keydown', esc, true);
      });
    });
    function resizeCanvas(nw, nh) {
      commitTransient();
      nw = clamp(Math.round(nw), 1, MAX_DIM);
      nh = clamp(Math.round(nh), 1, MAX_DIM);
      const c = E.canvas(nw, nh), x = c.getContext('2d');
      x.fillStyle = st.color2;
      x.fillRect(0, 0, nw, nh);
      x.drawImage(doc, 0, 0);
      applyFull(c);
    }

    // ================================================================ image operations
    function rotateCanvas(src, deg) {
      const w = src.width, hh = src.height;
      const c = deg === 180 ? E.canvas(w, hh) : E.canvas(hh, w), x = c.getContext('2d');
      x.translate(c.width / 2, c.height / 2);
      x.rotate((deg * Math.PI) / 180);
      x.drawImage(src, -w / 2, -hh / 2);
      return c;
    }
    function flipCanvas(src, horiz) {
      const c = E.canvas(src.width, src.height), x = c.getContext('2d');
      x.translate(horiz ? c.width : 0, horiz ? 0 : c.height);
      x.scale(horiz ? -1 : 1, horiz ? 1 : -1);
      x.drawImage(src, 0, 0);
      return c;
    }
    function copyCanvas(src) {
      const c = E.canvas(src.width, src.height);
      c.getContext('2d').drawImage(src, 0, 0);
      return c;
    }
    function rotate(deg) {
      commitPending();
      commitText();
      if (sel) { transformSel((c) => rotateCanvas(c, deg)); A.sound.play('click'); return; }
      applyFull(rotateCanvas(doc, deg));
      A.sound.play('click');
    }
    function flip(horiz) {
      commitPending();
      commitText();
      if (sel) { transformSel((c) => flipCanvas(c, horiz)); A.sound.play('click'); return; }
      applyFull(flipCanvas(doc, horiz));
      A.sound.play('click');
    }
    function invertColors() {
      commitPending();
      commitText();
      if (sel) { transformSel((c) => { E.invert(c); return c; }); return; }
      const c = copyCanvas(doc);
      E.invert(c);
      applyFull(c);
    }
    function clearImage() {
      commitPending();
      removeText();
      if (sel && sel.float) { if (sel.dirty) restoreRegion(sel.dirty); }
      sel = null;
      renderSel();
      const c = E.canvas(W, H), x = c.getContext('2d');
      x.fillStyle = st.color2;
      x.fillRect(0, 0, W, H);
      applyFull(c);
      A.sound.play('recycle');
    }
    function crop() {
      if (!sel) return;
      commitPending();
      commitText();
      if (sel.float) stampFloat();
      const r = clipRect({ x0: sel.x, y0: sel.y, x1: sel.x + sel.w, y1: sel.y + sel.h });
      if (!r) { commitSelection(); return; }
      const poly = selPolyScaled();
      const c = E.canvas(r.w, r.h), x = c.getContext('2d');
      x.fillStyle = st.color2;
      x.fillRect(0, 0, r.w, r.h);
      if (poly && !sel.float) {
        x.save();
        x.clip(polyPath(poly, 1, 1, sel.x - r.x, sel.y - r.y));
        x.drawImage(doc, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
        x.restore();
      } else x.drawImage(doc, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      sel = null;
      renderSel();
      applyFull(c);
      A.sound.play('snap');
    }
    function resizeSkew(src, pw, ph, ax, ay, bg) {
      const nw = Math.max(1, Math.round(pw)), nh = Math.max(1, Math.round(ph));
      const tx = Math.tan((ax * Math.PI) / 180), ty = Math.tan((ay * Math.PI) / 180);
      const corners = [[0, 0], [nw, nw * ty], [nh * tx, nh], [nw + nh * tx, nh + nw * ty]];
      const xs = corners.map((p) => p[0]), ys = corners.map((p) => p[1]);
      const minX = Math.min(...xs), minY = Math.min(...ys);
      const cw = clamp(Math.round(Math.max(...xs) - minX), 1, MAX_DIM), chh = clamp(Math.round(Math.max(...ys) - minY), 1, MAX_DIM);
      const c = E.canvas(cw, chh), x = c.getContext('2d');
      if (bg) { x.fillStyle = bg; x.fillRect(0, 0, cw, chh); }
      x.setTransform(1, ty, tx, 1, -minX, -minY);
      x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, nw, nh);
      return c;
    }

    // ================================================================ clipboard
    function copy() {
      commitPending();
      commitText();
      const c = selectionCanvas();
      if (!c) return false;
      clip = { canvas: c, time: Date.now() };
      sysClipOk = false;
      try {
        if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
          const item = new ClipboardItem({ 'image/png': new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('no image'))), 'image/png')) });
          navigator.clipboard.write([item]).then(() => { sysClipOk = true; }, () => { sysClipOk = false; });
        }
      } catch (err) { sysClipOk = false; }
      updateButtons();
      return true;
    }
    function cut() {
      if (copy()) deleteSelection();
    }
    async function paste() {
      if (clip && !sysClipOk) { pasteCanvas(clip.canvas); return; }
      if (navigator.clipboard && navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const it of items) {
            const type = it.types.find((t) => t.startsWith('image/'));
            if (type) { pasteBlob(await it.getType(type)); return; }
          }
        } catch (err) { /* no clipboard permission: fall back to Paint's own clipboard */ }
      }
      if (clip) pasteCanvas(clip.canvas);
    }
    function pasteBlob(blob) {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      loadImg(url).then((img) => {
        URL.revokeObjectURL(url);
        const c = E.canvas(Math.min(MAX_DIM, img.naturalWidth || 1), Math.min(MAX_DIM, img.naturalHeight || 1));
        c.getContext('2d').drawImage(img, 0, 0);
        pasteCanvas(c);
      }).catch(() => URL.revokeObjectURL(url));
    }
    async function pasteCanvas(src) {
      if (closed) return;
      commitTransient();
      if (src.width > W || src.height > H) {
        const r = await A.ui.messageBox({
          parent: win, title: 'Paint', icon: 'question',
          instruction: 'The picture you are pasting is bigger than the canvas',
          message: 'Do you want the canvas enlarged so the whole picture fits?',
          buttons: [{ label: 'Enlarge canvas', default: true, value: 'yes' }, { label: "Don't enlarge", value: 'no' }, { label: 'Cancel', cancel: true, value: 'cancel' }],
        });
        if (r !== 'yes' && r !== 'no') return;
        if (r === 'yes') resizeCanvas(Math.max(W, src.width), Math.max(H, src.height));
      }
      if (st.tool !== 'select') setTool('select');
      const c = copyCanvas(src);
      const vx = clamp(Math.floor((ws.scrollLeft - PAD) / st.zoom), 0, Math.max(0, W - 1));
      const vy = clamp(Math.floor((ws.scrollTop - PAD) / st.zoom), 0, Math.max(0, H - 1));
      sel = { x: vx, y: vy, w: c.width, h: c.height, pw: c.width, ph: c.height, poly: null, orig: c, float: st.transparent ? keyedCopy(c) : c, dirty: null };
      renderSel();
      updateButtons();
      A.sound.play('click');
    }
    async function pasteFrom() {
      const p = await A.ui.fileDialog({ mode: 'open', parent: win, title: 'Paste From', folder: '/Pictures', exts: IMAGE_EXTS, filterLabel: 'All Picture Files' });
      if (!p) return;
      try {
        const c = await imageFromPath(p);
        pasteCanvas(c);
      } catch (err) {
        A.ui.messageBox({ parent: win, title: 'Paint', icon: 'error', instruction: 'Paint cannot read this file', message: 'This is not a picture Paint can open.' });
      }
    }
    win.el.addEventListener('paste', (e) => {
      if (closed || (tbox && e.target === tbox.ta) || A.util.isTyping(e)) return;
      pasteExpected = false;
      e.preventDefault();
      const items = e.clipboardData ? Array.from(e.clipboardData.items || []) : [];
      const imgItem = items.find((it) => it.kind === 'file' && it.type && it.type.startsWith('image/'));
      if (imgItem && !(clip && !sysClipOk)) pasteBlob(imgItem.getAsFile());
      else if (clip) pasteCanvas(clip.canvas);
      else if (imgItem) pasteBlob(imgItem.getAsFile());
    });

    // ================================================================ files
    function loadImg(src) {
      return new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error('image failed'));
        im.src = src;
      });
    }
    async function imageFromPath(p) {
      const url = A.fs.thumbFor(p);
      if (!url) throw new Error('not a picture');
      const raw = String(A.fs.read(p) || '');
      const img = raw.startsWith('asset:') ? await A.util.loadImage(url) : await loadImg(url);
      let w = img.naturalWidth || 800, hh = img.naturalHeight || 600;
      // Built-in pictures are vector art: open a family-computer-sized copy
      // that fits comfortably on the little disk.
      if (raw.startsWith('asset:') && w > 800) { hh = Math.round((hh * 800) / w); w = 800; }
      if (w > MAX_DIM || hh > MAX_DIM) { const k = MAX_DIM / Math.max(w, hh); w = Math.round(w * k); hh = Math.round(hh * k); }
      const c = E.canvas(w, hh), x = c.getContext('2d');
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, w, hh);
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, w, hh);
      return c;
    }
    function resetDocument(c, fit) {
      op = null;
      pend = null;
      pendDirty = null;
      if (tbox) { tbox.el.remove(); tbox = null; }
      sel = null;
      setDims(c.width, c.height);
      octx.clearRect(0, 0, W, H);
      dctx.drawImage(c, 0, 0);
      shadow = E.canvas(W, H);
      sctx = shadow.getContext('2d');
      sctx.drawImage(doc, 0, 0);
      resetHistory();
      st.zoom = 1;
      layout();
      renderPend();
      renderSel();
      positionText();
      ws.scrollLeft = 0;
      ws.scrollTop = 0;
      const aw = ws.clientWidth - PAD - 30, ah = ws.clientHeight - PAD - 30;
      if (fit && aw > 0 && ah > 0 && Math.min(aw / W, ah / H) < 0.75) fitToWindow(false);
      updateZoomUI();
      afterChange();
    }
    function blankCanvas() {
      const c = E.canvas(800, 600), x = c.getContext('2d');
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, 800, 600);
      return c;
    }
    async function loadPath(p) {
      let c;
      try {
        if (!A.fs.exists(p)) throw new Error('missing');
        c = await imageFromPath(p);
      } catch (err) {
        A.ui.messageBox({ parent: win, title: 'Paint', icon: 'error', instruction: 'Paint cannot read this file', message: `${A.fs.basename(p)}\n\nThis is not a valid picture file, or its format is not currently supported.` });
        return false;
      }
      if (closed) return false;
      resetDocument(c, true);
      path = p;
      savedId = stateId();
      rememberRecent(p);
      A.apps.rememberRecentFile(p);
      afterChange();
      return true;
    }
    function rememberRecent(p) {
      const list = (pref('recent', []) || []).filter((x) => x !== p);
      list.unshift(p);
      store('recent', list.slice(0, 8));
    }
    const docName = () => (path ? A.fs.basename(path) : 'Untitled');
    function updateTitle() { win.setTitle(docName() + ' - Paint'); }
    async function confirmDiscard() {
      commitTransient();
      if (!dirty()) return true;
      const r = await A.ui.messageBox({
        parent: win, title: 'Paint', icon: 'question',
        instruction: `Do you want to save changes to ${docName()}?`,
        buttons: [{ label: 'Save', default: true, value: 'save' }, { label: "Don't Save", value: 'discard' }, { label: 'Cancel', cancel: true, value: 'cancel' }],
      });
      if (r === 'save') return save();
      return r === 'discard';
    }
    async function newImage() {
      if (!(await confirmDiscard())) return;
      resetDocument(blankCanvas());
      path = null;
      afterChange();
    }
    async function openImage() {
      if (!(await confirmDiscard())) return;
      const folder = path && A.fs.isDir(A.fs.dirname(path)) ? A.fs.dirname(path) : '/Pictures';
      const p = await A.ui.fileDialog({ mode: 'open', parent: win, folder, exts: IMAGE_EXTS, filterLabel: 'All Picture Files (*.png; *.jpg; *.gif; *.bmp)' });
      if (p) loadPath(p);
    }
    async function openRecent(p) {
      if (!A.fs.exists(p)) {
        A.ui.messageBox({ parent: win, title: 'Paint', icon: 'warning', instruction: 'This picture has moved', message: `Paint cannot find ${A.fs.basename(p)}. It may have been renamed, moved or deleted.` });
        store('recent', (pref('recent', []) || []).filter((x) => x !== p));
        return;
      }
      if (!(await confirmDiscard())) return;
      loadPath(p);
    }
    // Checks that a save of `data` to `p` fits in browser storage.
    function roomFor(p, data) {
      if (!A.store.persistent) return true;
      const old = A.fs.read(p);
      const extra = Math.max(0, data.length - (old ? String(old).length : 0)) + 4096;
      const key = 'aerium.v1.paint.__room';
      try {
        localStorage.setItem(key, 'x'.repeat(extra));
        localStorage.removeItem(key);
        return true;
      } catch (err) {
        try { localStorage.removeItem(key); } catch (e2) { /* ignore */ }
        return false;
      }
    }
    function writable(p) {
      if (!p || A.fs.ext(p) !== 'png') return false;
      const s = A.fs.stat(p);
      return !s || !s.readonly;
    }
    async function save(as) {
      commitTransient();
      let p = path;
      if (as || !writable(p)) {
        const dir = p && A.fs.isDir(A.fs.dirname(p)) && writable(p) ? A.fs.dirname(p) : '/Pictures';
        p = await A.ui.fileDialog({ mode: 'save', parent: win, title: 'Save As', folder: dir, filename: p ? A.fs.stem(p) + '.png' : 'Untitled.png', exts: ['png'], filterLabel: 'PNG (*.png)' });
        if (!p) return false;
      }
      const data = doc.toDataURL('image/png');
      if (!roomFor(p, data)) {
        const r = await A.ui.messageBox({
          parent: win, title: 'Paint', icon: 'warning',
          instruction: "There isn't enough room to save this picture",
          message: 'Aerium keeps your pictures inside this browser, and it only has a little space. Try making the picture smaller with Resize, or delete a few pictures you no longer need, then save again.',
          detail: `This picture needs about ${A.util.fmtBytes(Math.round(data.length * 0.75))}.`,
          buttons: [{ label: 'Download instead', value: 'download' }, { label: 'OK', default: true, cancel: true, value: 'ok' }],
        });
        if (r === 'download') download();
        return false;
      }
      const old = A.fs.read(p);
      const oldMime = A.fs.stat(p) ? A.fs.stat(p).mime : null;
      try {
        A.fs.write(p, data, { mime: 'image/png' });
      } catch (err) {
        A.ui.messageBox({ parent: win, title: 'Paint', icon: 'error', instruction: 'Paint could not save this picture', message: err && err.message ? err.message : 'Something went wrong while saving.' });
        return false;
      }
      // Storage writes are batched; if the batch fails, put things back.
      const off = A.bus.on('fs:full', () => {
        off();
        try {
          if (old != null) A.fs.write(p, old, { mime: oldMime || 'image/png' });
          else A.fs.remove(p, { permanent: true });
        } catch (err) { /* nothing more to undo */ }
        if (!closed) { savedId = -1; afterChange(); }
      });
      setTimeout(off, 1500);
      path = p;
      savedId = stateId();
      rememberRecent(p);
      A.apps.rememberRecentFile(p);
      afterChange();
      // Re-saving the picture that is already the wallpaper updates the desktop too.
      if (A.store.get('wallpaper') === 'file:' + p && A.theme.refreshWallpaper) A.theme.refreshWallpaper();
      return true;
    }
    function download() {
      commitTransient();
      const name = (path ? A.fs.stem(path) : 'Untitled') + '.png';
      doc.toBlob((b) => { if (b) A.util.downloadBlob(b, name); }, 'image/png');
    }
    function thumbURL(size) {
      const c = E.canvas(size, size), x = c.getContext('2d');
      const k = Math.min((size - 6) / W, (size - 6) / H);
      const w = Math.max(1, Math.round(W * k)), hh = Math.max(1, Math.round(H * k));
      const ox = Math.round((size - w) / 2), oy = Math.round((size - hh) / 2);
      x.fillStyle = 'rgba(11,42,74,0.25)';
      x.fillRect(ox - 1, oy, w + 2, hh + 2);
      x.fillStyle = '#ffffff';
      x.fillRect(ox - 2, oy - 2, w + 4, hh + 4);
      x.imageSmoothingQuality = 'high';
      x.drawImage(doc, ox, oy, w, hh);
      return c.toDataURL('image/png');
    }
    async function setAsBackground(fit) {
      commitTransient();
      if (!path || dirty() || !writable(path)) {
        const r = await A.ui.messageBox({
          parent: win, title: 'Paint', icon: 'question',
          instruction: 'Save your picture first',
          message: 'Before your picture can become the desktop background, Paint needs to save it.',
          buttons: [{ label: 'Save', default: true, value: 'save' }, { label: 'Cancel', cancel: true, value: 'cancel' }],
        });
        if (r !== 'save') return;
        if (!(await save())) return;
      }
      const id = 'file:' + path;
      const same = A.store.get('wallpaper') === id;
      A.theme.setWallpaper(id, fit || 'fill');
      if (same && A.theme.refreshWallpaper) A.theme.refreshWallpaper();
      A.notify({ title: 'Desktop background changed', text: `${docName()} is now your desktop background. Nice work!`, icon: thumbURL(64), timeout: 6000 });
    }
    function about() {
      A.ui.messageBox({ parent: win, title: 'About Paint', icon: 'icons/paint', instruction: 'Aerium Paint', message: 'Version 7.0 (Build 2009)\n\nNow with bubbles, rainbows, stickers and a little extra sparkle.\n\nThis product is licensed to:\n' + (A.store.get('user.name') || 'User'), sound: false });
    }

    // ================================================================ File menu
    function openFileMenu() {
      if (fly && flyOwner === fileBtn) { fly.close(); return; }
      const right = h('div.pt-am-right');
      const showRecent = () => {
        right.innerHTML = '';
        right.appendChild(h('div.pt-am-head', null, 'Recent pictures'));
        const list = (pref('recent', []) || []).filter((p) => A.fs.exists(p));
        if (!list.length) right.appendChild(h('div.pt-am-empty', null, 'Pictures you open or save will show up here.'));
        list.forEach((p, i) => {
          const t = A.fs.thumbFor(p);
          right.appendChild(h('button.pt-am-recent', { type: 'button', onclick: () => { fly && fly.close(); openRecent(p); } }, h('u', null, String(i + 1)), t ? h('img', { src: t, alt: '' }) : A.img('icons/photo'), h('span', null, A.fs.basename(p))));
        });
        right.appendChild(h('div.pt-am-foot', null, A.img('icons/lightbulb'), h('span', null, 'Tip: right-click a color to make it Color 2.')));
      };
      const showWallpaper = () => {
        right.innerHTML = '';
        right.appendChild(h('div.pt-am-head', null, 'Set as desktop background'));
        [['fill', 'Fill', 'Covers the whole screen.'], ['fit', 'Fit', 'Shows the whole picture.'], ['tile', 'Tile', 'Repeats the picture like wallpaper.'], ['center', 'Center', 'Puts it in the middle.']].forEach(([fit, label, desc]) => {
          right.appendChild(h('button.pt-am-sub', { type: 'button', onclick: () => { fly && fly.close(); setAsBackground(fit); } }, A.img('icons/personalize'), h('span', null, h('b', null, label), h('small', null, desc))));
        });
      };
      const item = (label, icon, fn, hoverFn) => {
        const b = h('button.pt-am-item', { type: 'button', onclick: () => { if (fn) { fly && fly.close(); fn(); } } }, A.img(icon), h('span', null, label), hoverFn ? h('i.pt-am-arrow') : null);
        b.addEventListener('pointerenter', () => { left.querySelectorAll('.hot').forEach((x) => x.classList.remove('hot')); if (hoverFn) { b.classList.add('hot'); hoverFn(); } else showRecent(); });
        b.addEventListener('focus', () => (hoverFn ? hoverFn() : showRecent()));
        return b;
      };
      const left = h('div.pt-am-left', null,
        item('New', 'icons/document', newImage),
        item('Open', 'icons/folder', openImage),
        item('Save', iconURL('save'), () => save()),
        item('Save as', iconURL('saveas'), () => save(true)),
        h('div.pt-am-sep'),
        item('Set as desktop background', 'icons/personalize', () => setAsBackground('fill'), showWallpaper),
        item('Download to my computer', 'icons/download', download),
        h('div.pt-am-sep'),
        item('Properties', 'icons/settings', properties),
        item('About Paint', 'icons/info', about),
        h('div.pt-am-sep'),
        item('Exit', 'icons/close', () => win.close()));
      showRecent();
      openFly(fileBtn, h('div.pt-am', null, left, right), null, 'pt-appmenu');
      setTimeout(() => { const f = left.querySelector('.pt-am-item'); if (f) f.focus({ preventScroll: true }); }, 30);
    }

    // ================================================================ galleries
    function openBrushGallery(anchor) {
      if (fly && flyOwner === anchor) { fly.close(); return; }
      // Near-black or near-white shows each brush in its own showcase color.
      const plain = C.luma(st.color1) > 0.86 || C.luma(st.color1) < 0.1;
      const SHOW = { brush: '#1a7fe0', calligraphy: '#0b3a8a', airbrush: '#2eb82e', oil: '#ff9a2e', crayon: '#7a3ccc', marker: '#ffc20e', pencil: '#6b7885', watercolor: '#3ec6f0', bubbles: '#3ec6f0', rainbow: '#e8202a', sparkle: '#b57cff', gel: '#ff6b9a' };
      const gridEl = h('div.pt-brushgrid');
      const tile = (id) => {
        const def = E.BRUSHES[id];
        const cv = h('canvas', { width: 96 * dpr, height: 44 * dpr });
        const b = h('button.pt-btile', { type: 'button', class: [st.tool === 'brush' && st.brush === id && 'pt-on', FUN_BRUSHES.includes(id) && 'pt-fun'], 'aria-label': def.name, onclick: () => { fly && fly.close(); A.sound.play('click'); pickBrush(id); } }, cv, h('span', null, def.name));
        requestAnimationFrame(() => { try { E.preview(cv, id, plain ? SHOW[id] : st.color1, Math.min(def.sizes[2], 18) * dpr); } catch (err) { /* preview is decorative */ } });
        return b;
      };
      gridEl.appendChild(h('div.pt-bsep', null, 'Brushes'));
      E.ORDER.filter((id) => !FUN_BRUSHES.includes(id)).forEach((id) => gridEl.appendChild(tile(id)));
      gridEl.appendChild(h('div.pt-bsep', null, 'Magic brushes'));
      FUN_BRUSHES.forEach((id) => gridEl.appendChild(tile(id)));
      openFly(anchor, h('div.pt-flypanel', null, gridEl));
    }
    function openAllShapes(anchor) {
      if (fly && flyOwner === anchor) { fly.close(); return; }
      const gridEl = h('div.pt-allshapes');
      E.SHAPES.forEach((s) => gridEl.appendChild(h('button.pt-shp', { type: 'button', class: st.tool === 'shape' && st.shape === s.id ? 'pt-on' : null, 'aria-label': s.name, 'data-tip': s.name, onclick: () => { fly && fly.close(); pickShape(s.id); } }, h('img', { src: shapeIconURL(s.id), alt: '' }))));
      openFly(anchor, h('div.pt-flypanel', null, h('div.pt-flytitle', null, 'Shapes'), gridEl));
    }
    function openSizes(anchor) {
      if (fly && flyOwner === anchor) { fly.close(); return; }
      const f = sizeFamily();
      if (!f) return;
      const list = h('div.pt-sizes');
      familySizes(f).forEach((s, i) => {
        const t = Math.max(1, Math.min(18, Math.round(s)));
        list.appendChild(h('button.pt-sizerow', { type: 'button', class: levelOf(f) === i ? 'pt-on' : null, 'aria-label': s + ' pixels', onclick: () => { fly && fly.close(); setLevel(f, i); A.sound.play('click'); } }, h('i', { style: { height: t + 'px' } }), h('span', null, (Math.round(s * 10) / 10) + 'px')));
      });
      openFly(anchor, h('div.pt-flypanel', null, list));
    }
    function openStickers(anchor) {
      if (fly && flyOwner === anchor) { fly.close(); return; }
      const gridEl = h('div.pt-stickers');
      STICKERS.forEach((id) => {
        const name = STICKER_NAMES[id] || id.charAt(0).toUpperCase() + id.slice(1);
        gridEl.appendChild(h('button.pt-stk', { type: 'button', class: st.sticker === id ? 'pt-on' : null, 'aria-label': name, 'data-tip': name, onclick: () => {
          st.sticker = id;
          store('sticker', id);
          btnStickers.top.firstChild.src = A.icon(id);
          fly && fly.close();
          A.sound.play('pop');
          setTool('sticker');
        } }, h('img', { src: A.icon(id), alt: '' })));
      });
      const sizeLbl = h('span.pt-stksize', null, st.stickerSize + 'px');
      const slider = A.ui.slider({ min: 24, max: 256, step: 4, value: st.stickerSize, label: 'Sticker size', onInput: (v) => { st.stickerSize = v; sizeLbl.textContent = v + 'px'; }, onChange: (v) => store('stickerSize', v) });
      const style = A.ui.radioGroup({ options: [['diecut', 'Die-cut sticker'], ['plain', 'Plain glossy']], value: st.stickerStyle, onChange: (v) => { st.stickerStyle = v; store('stickerStyle', v); } });
      style.style.flexDirection = 'row';
      style.style.gap = '12px';
      const tilt = A.ui.checkbox({ label: 'Tilt a little', checked: st.stickerTilt, onChange: (v) => { st.stickerTilt = v; store('stickerTilt', v); } });
      openFly(anchor, h('div.pt-flypanel', null, h('div.pt-flytitle', null, 'Stickers'), gridEl,
        h('div.pt-flyrow.pt-stkopts', null, h('label', null, h('span.ae-muted', null, 'Size'), slider, sizeLbl), style, tilt)));
    }
    function styleMenu(kind) {
      const cur = kind === 'outline' ? st.outline : st.fill;
      const opts = kind === 'outline'
        ? [['none', 'No outline'], ['solid', 'Solid color'], ['crayon', 'Crayon'], ['marker', 'Marker'], ['watercolor', 'Watercolor']]
        : [['none', 'No fill'], ['solid', 'Solid color'], ['glass', 'Glass gel'], ['crayon', 'Crayon'], ['marker', 'Marker'], ['watercolor', 'Watercolor']];
      return opts.map(([v, label]) => ({
        label, radio: true, checked: cur === v,
        onClick: () => {
          if (kind === 'outline') { st.outline = v; store('outline', v); } else { st.fill = v; store('fill', v); }
          if (pend) renderPend();
          if (st.tool !== 'shape') setTool('shape');
        },
      }));
    }

    // ================================================================ dialogs
    function numInput(value, min, max) {
      return h('input.ae-input', { type: 'number', value: String(value), min: String(min), max: String(max) });
    }
    async function resizeDialog() {
      commitPending();
      commitText();
      const target = sel ? { w: sel.w, h: sel.h } : { w: W, h: H };
      let mode = 'pct';
      const hIn = numInput(100, 1, 500), vIn = numInput(100, 1, 500);
      const keep = A.ui.checkbox({ label: 'Maintain aspect ratio', checked: true });
      const sxIn = numInput(0, -89, 89), syIn = numInput(0, -89, 89);
      const by = A.ui.radioGroup({ options: [['pct', 'Percentage'], ['px', 'Pixels']], value: 'pct', onChange: (v) => {
        const hv = Number(hIn.value) || 0, vv = Number(vIn.value) || 0;
        if (v === 'px' && mode === 'pct') { hIn.value = Math.round(target.w * hv / 100); vIn.value = Math.round(target.h * vv / 100); }
        if (v === 'pct' && mode === 'px') { hIn.value = Math.round(hv / target.w * 100); vIn.value = Math.round(vv / target.h * 100); }
        mode = v;
      } });
      by.style.flexDirection = 'row';
      by.style.gap = '14px';
      hIn.addEventListener('input', () => { if (keep.checked) vIn.value = mode === 'pct' ? hIn.value : Math.round((Number(hIn.value) || 0) * target.h / target.w); });
      vIn.addEventListener('input', () => { if (keep.checked) hIn.value = mode === 'pct' ? vIn.value : Math.round((Number(vIn.value) || 0) * target.w / target.h); });
      const row = (label, input, icon) => h('div.pt-dlg-row', null, h('span', null, label), icon ? h('img.pt-dlg-icon', { src: iconURL(icon), alt: '' }) : null, input);
      const content = h('div.pt-dlg', null,
        h('fieldset', null, h('legend', null, 'Resize'), h('div.pt-dlg-row', null, h('span', null, 'By:'), by), row('Horizontal:', hIn, 'resize'), row('Vertical:', vIn, 'resize'), keep),
        h('fieldset', null, h('legend', null, 'Skew (degrees)'), row('Horizontal:', sxIn, 'flip'), row('Vertical:', syIn, 'flip')),
        h('div.pt-dlg-note', null, sel ? `Changes apply to the selection (${target.w} × ${target.h}px).` : `Changes apply to the whole picture (${target.w} × ${target.h}px).`));
      const r = await A.ui.dialog({ parent: win, title: 'Resize and Skew', icon: iconURL('resize'), content, width: 340, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] });
      if (r !== 'ok' || closed) return;
      let pw, ph;
      if (mode === 'pct') { pw = target.w * clamp(Number(hIn.value) || 100, 1, 500) / 100; ph = target.h * clamp(Number(vIn.value) || 100, 1, 500) / 100; }
      else { pw = clamp(Number(hIn.value) || target.w, 1, MAX_DIM); ph = clamp(Number(vIn.value) || target.h, 1, MAX_DIM); }
      const ax = clamp(Number(sxIn.value) || 0, -89, 89), ay = clamp(Number(syIn.value) || 0, -89, 89);
      if (Math.round(pw) === target.w && Math.round(ph) === target.h && !ax && !ay) return;
      if (sel) transformSel((c) => resizeSkew(c, pw, ph, ax, ay, null));
      else applyFull(resizeSkew(doc, pw, ph, ax, ay, st.color2));
    }
    async function properties() {
      commitTransient();
      const s = path ? A.fs.stat(path) : null;
      let units = 'px';
      const conv = (px) => (units === 'px' ? Math.round(px) : units === 'in' ? Math.round((px / 96) * 100) / 100 : Math.round((px / 96) * 2.54 * 100) / 100);
      const back = (v) => (units === 'px' ? v : units === 'in' ? v * 96 : (v / 2.54) * 96);
      const wIn = h('input.ae-input', { type: 'number', value: String(W), min: '0.01', step: 'any' });
      const hIn = h('input.ae-input', { type: 'number', value: String(H), min: '0.01', step: 'any' });
      const unitGroup = A.ui.radioGroup({ options: [['in', 'Inches'], ['cm', 'Centimeters'], ['px', 'Pixels']], value: 'px', onChange: (v) => {
        const wp = back(Number(wIn.value) || W), hp = back(Number(hIn.value) || H);
        units = v;
        wIn.value = conv(wp);
        hIn.value = conv(hp);
      } });
      unitGroup.style.flexDirection = 'row';
      unitGroup.style.gap = '12px';
      const content = h('div.pt-dlg', null,
        h('fieldset', null, h('legend', null, 'File attributes'), h('table.pt-props', null,
          h('tr', null, h('td', null, 'Last saved:'), h('td', null, s && !dirty() ? A.util.fmtDateTime(s.modified) : 'Not available')),
          h('tr', null, h('td', null, 'Size on disk:'), h('td', null, s ? A.util.fmtBytes(s.size) : 'Not available')),
          h('tr', null, h('td', null, 'Resolution:'), h('td', null, '96 DPI')))),
        h('fieldset', null, h('legend', null, 'Units'), unitGroup),
        h('fieldset', null, h('legend', null, 'Canvas size'),
          h('div.pt-dlg-row', null, h('span', null, 'Width:'), wIn, h('span', null, 'Height:'), hIn),
          h('div.pt-dlg-row', null, A.ui.button('Default', { size: 'sm', onClick: () => { wIn.value = conv(800); hIn.value = conv(600); } }))));
      const r = await A.ui.dialog({ parent: win, title: 'Image Properties', icon: 'icons/paint', content, width: 390, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] });
      if (r !== 'ok' || closed) return;
      const nw = clamp(Math.round(back(Number(wIn.value) || W)), 1, MAX_DIM), nh = clamp(Math.round(back(Number(hIn.value) || H)), 1, MAX_DIM);
      if (nw !== W || nh !== H) resizeCanvas(nw, nh);
    }
    async function editColors(slot) {
      slot = slot || st.slot;
      const start = slot === 2 ? st.color2 : st.color1;
      let cur = C.toHsl(start), curHex = start;
      const FW = 224, FH = 160;
      const field = h('canvas', { width: FW * dpr, height: FH * dpr, style: { width: FW + 'px', height: FH + 'px' } });
      const lumC = h('canvas', { width: 18 * dpr, height: FH * dpr, style: { width: '18px', height: FH + 'px' } });
      const cross = h('div.pt-ec-cross'), arrow = h('div.pt-ec-arrow');
      const fieldWrap = h('div.pt-ec-fieldwrap', null, field, cross);
      const lumWrap = h('div.pt-ec-lumwrap', null, lumC, arrow);
      const swNew = h('i'), swOld = h('i', { style: { background: start } });
      const inp = {};
      [['h', 360], ['s', 100], ['l', 100], ['r', 255], ['g', 255], ['b', 255]].forEach(([k, max]) => (inp[k] = h('input.ae-input', { type: 'number', min: '0', max: String(max), 'aria-label': k })));
      const hexIn = h('input.ae-input', { type: 'text', maxLength: 7, spellcheck: false, 'aria-label': 'Hex' });
      const fctx = field.getContext('2d');
      const img = fctx.createImageData(field.width, field.height);
      for (let y = 0; y < field.height; y++) {
        for (let x = 0; x < field.width; x++) {
          const p = C.parse(C.hsl((x / field.width) * 360, 100 - (y / field.height) * 100, 50));
          const i = (y * field.width + x) * 4;
          img.data[i] = p.r; img.data[i + 1] = p.g; img.data[i + 2] = p.b; img.data[i + 3] = 255;
        }
      }
      fctx.putImageData(img, 0, 0);
      const lctx2 = lumC.getContext('2d');
      function drawLum() {
        const g = lctx2.createLinearGradient(0, 0, 0, lumC.height);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, C.hsl(cur.h, cur.s, 50));
        g.addColorStop(1, '#000000');
        lctx2.fillStyle = g;
        lctx2.fillRect(0, 0, lumC.width, lumC.height);
      }
      function update(from) {
        if (from !== 'rgb' && from !== 'hex') curHex = C.hsl(cur.h, cur.s, cur.l);
        const rgb = C.parse(curHex);
        if (from !== 'hsl') { inp.h.value = Math.round(cur.h); inp.s.value = Math.round(cur.s); inp.l.value = Math.round(cur.l); }
        if (from !== 'rgb') { inp.r.value = rgb.r; inp.g.value = rgb.g; inp.b.value = rgb.b; }
        if (from !== 'hex') hexIn.value = curHex.toUpperCase();
        cross.style.left = (cur.h / 360) * FW + 'px';
        cross.style.top = (1 - cur.s / 100) * FH + 'px';
        arrow.style.top = (1 - cur.l / 100) * FH + 'px';
        swNew.style.background = curHex;
        if (from !== 'lum') drawLum();
      }
      const dragOn = (el, fn) => {
        el.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          try { el.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
          fn(e);
          const mv = (ev) => fn(ev);
          const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
          el.addEventListener('pointermove', mv);
          el.addEventListener('pointerup', up);
          el.addEventListener('pointercancel', up);
        });
      };
      dragOn(fieldWrap, (e) => {
        const r = fieldWrap.getBoundingClientRect();
        cur.h = clamp((e.clientX - r.left) / FW, 0, 1) * 359.9;
        cur.s = (1 - clamp((e.clientY - r.top) / FH, 0, 1)) * 100;
        if (cur.l > 96 || cur.l < 4) cur.l = 50;
        update('field');
      });
      dragOn(lumWrap, (e) => {
        const r = lumWrap.getBoundingClientRect();
        cur.l = (1 - clamp((e.clientY - r.top) / FH, 0, 1)) * 100;
        update('lum');
      });
      ['h', 's', 'l'].forEach((k) => inp[k].addEventListener('input', () => {
        cur = { h: clamp(Number(inp.h.value) || 0, 0, 360), s: clamp(Number(inp.s.value) || 0, 0, 100), l: clamp(Number(inp.l.value) || 0, 0, 100) };
        update('hsl');
      }));
      ['r', 'g', 'b'].forEach((k) => inp[k].addEventListener('input', () => {
        curHex = C.hex(clamp(Number(inp.r.value) || 0, 0, 255), clamp(Number(inp.g.value) || 0, 0, 255), clamp(Number(inp.b.value) || 0, 0, 255));
        cur = C.toHsl(curHex);
        update('rgb');
      }));
      hexIn.addEventListener('input', () => {
        let v = hexIn.value.trim();
        if (!v.startsWith('#')) v = '#' + v;
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
          const p = C.parse(v);
          curHex = C.hex(p.r, p.g, p.b);
          cur = C.toHsl(curHex);
          update('hex');
        }
      });
      const pickChip = (c) => { const p = C.parse(c); curHex = C.hex(p.r, p.g, p.b); cur = C.toHsl(curHex); update('hex'); hexIn.value = curHex.toUpperCase(); };
      const basic = h('div.pt-palette');
      PALETTE.forEach(([c, name]) => basic.appendChild(h('button.pt-chip', { type: 'button', style: { '--c': c }, 'aria-label': name, 'data-tip': name, onclick: () => pickChip(c) })));
      const custGrid = h('div.pt-ec-cust');
      const renderCust = () => {
        custGrid.innerHTML = '';
        for (let i = 0; i < 14; i++) {
          const c = st.custom[i];
          custGrid.appendChild(c ? h('button.pt-chip', { type: 'button', style: { '--c': c }, 'aria-label': 'Custom color ' + c, onclick: () => pickChip(c) }) : h('span.pt-chip.empty'));
        }
      };
      renderCust();
      const addBtn = A.ui.button('Add to custom colors', { size: 'sm', onClick: () => { addCustom(curHex); renderCust(); A.sound.play('pop'); } });
      const content = h('div.pt-ec', null,
        h('div.pt-ec-left', null, h('div.pt-ec-label', null, 'Basic colors'), basic, h('div.pt-ec-label', null, 'Custom colors'), custGrid, h('div', { style: { marginTop: '6px' } }, addBtn)),
        h('div.pt-ec-right', null,
          h('div.pt-ec-pick', null, fieldWrap, lumWrap),
          h('div.pt-ec-bottom', null,
            h('div.pt-ec-preview', null, h('div.pt-ec-sw', null, swNew, swOld), h('span', null, 'New / Current')),
            h('div', null,
              h('div.pt-ec-nums', null, h('span', null, 'Hue:'), inp.h, h('span', null, 'Red:'), inp.r, h('span', null, 'Sat:'), inp.s, h('span', null, 'Green:'), inp.g, h('span', null, 'Lum:'), inp.l, h('span', null, 'Blue:'), inp.b),
              h('div.pt-ec-hex', { style: { marginTop: '8px' } }, h('span', null, 'Hex:'), hexIn)))));
      update('init');
      const r = await A.ui.dialog({ parent: win, title: 'Edit Colors', icon: iconURL('colors'), content, width: 560, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] });
      if (r !== 'ok' || closed) return;
      setColor(slot, curHex);
      addCustom(curHex);
    }
    function fullScreen() {
      commitTransient();
      const vw = window.innerWidth, vh = window.innerHeight;
      const k = Math.min(1, (vw - 80) / W, (vh * 0.66) / H);
      const w = Math.max(1, Math.round(W * k)), hh = Math.max(1, Math.round(H * k));
      const mkCopy = (cls) => { const c = E.canvas(W, H); c.getContext('2d').drawImage(doc, 0, 0); c.style.width = w + 'px'; c.style.height = hh + 'px'; if (cls) c.className = cls; return c; };
      const refl = h('div.pt-full-reflwrap', { style: { width: w + 'px', height: Math.round(hh * 0.3) + 'px' } }, mkCopy('pt-full-refl'));
      const el = h('div.pt-full', { role: 'dialog', 'aria-label': 'Full screen view', tabIndex: -1 }, h('div.pt-full-inner', null, mkCopy(), refl), h('div.pt-full-hint', null, 'Click anywhere or press any key to go back'));
      const close = () => { el.remove(); document.removeEventListener('keydown', key, true); A.sound.play('whooshOut'); ws.focus({ preventScroll: true }); };
      const key = (e) => { e.preventDefault(); e.stopPropagation(); close(); };
      el.addEventListener('pointerdown', close);
      document.addEventListener('keydown', key, true);
      cleanups.push(() => { if (el.isConnected) close(); });
      document.getElementById('ae-overlays').appendChild(el);
      A.sound.play('whooshIn');
    }
    function setGrid(on) {
      st.grid = !!on;
      chkGrid.checked = st.grid;
      store('grid', st.grid);
      layout();
    }
    function setStatusBar(on) {
      st.statusOn = !!on;
      chkStatus.checked = st.statusOn;
      status.hidden = !st.statusOn;
      store('status', st.statusOn);
    }

    // ================================================================ status and buttons
    function updateStatus() {
      stSize.textContent = `${W} × ${H}px`;
      if (sel) stSel.textContent = `${Math.round(sel.w)} × ${Math.round(sel.h)}px`;
      else if (pend) { const b = pendBBox(); stSel.textContent = `${Math.round(b.x1 - b.x0)} × ${Math.round(b.y1 - b.y0)}px`; }
      else if (tbox) stSel.textContent = `${tbox.w} × ${tbox.h}px`;
      else stSel.textContent = '';
      const s = path && A.fs.exists(path) ? A.fs.stat(path) : null;
      stFile.textContent = s ? 'Size: ' + A.util.fmtBytes(s.size) + (dirty() ? ' (unsaved changes)' : '') : '';
    }
    function updateButtons() {
      qUndo.disabled = !hist.undo.length && !pend && !tbox && !(sel && sel.float);
      qRedo.disabled = !hist.redo.length;
      btnCut.disabled = !sel;
      btnCopy.disabled = !sel;
      btnCrop.disabled = !sel;
    }

    // ================================================================ keyboard
    function escape() {
      if (op) { cancelOp(); return; }
      if (pend) { dropPend(); return; }
      if (tbox) { if (tbox.ta.value.trim()) commitText(); else removeText(); return; }
      if (sel) commitSelection();
    }
    function nudge(dx, dy) {
      if (!sel) return;
      if (!sel.float) liftSelection(false);
      sel.x += dx;
      sel.y += dy;
      renderSel();
    }
    win.el.addEventListener('keydown', (e) => {
      if (closed || e.defaultPrevented) return;
      const k = e.key, lk = k.length === 1 ? k.toLowerCase() : k, mod = e.ctrlKey || e.metaKey;
      if (tbox && e.target === tbox.ta) {
        if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); escape(); ws.focus({ preventScroll: true }); }
        return;
      }
      if (A.util.isTyping(e)) return;
      if (k === 'Escape' && Date.now() - lastFlyClose < 120) return;
      if (mod) {
        if (lk === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (lk === 'y' || (lk === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        else if (lk === 's') { e.preventDefault(); save(e.shiftKey); }
        else if (lk === 'o') { e.preventDefault(); openImage(); }
        else if (lk === 'n' && e.shiftKey) { e.preventDefault(); clearImage(); }
        else if (lk === 'n') { e.preventDefault(); newImage(); }
        else if (lk === 'a') { e.preventDefault(); selectAll(); }
        else if (lk === 'c') { e.preventDefault(); copy(); }
        else if (lk === 'x' && e.shiftKey) { e.preventDefault(); crop(); }
        else if (lk === 'x') { e.preventDefault(); cut(); }
        else if (lk === 'v') {
          pasteExpected = true;
          setTimeout(() => { if (pasteExpected) { pasteExpected = false; paste(); } }, 80);
        }
        else if (lk === 'e') { e.preventDefault(); properties(); }
        else if (lk === 'w') { e.preventDefault(); resizeDialog(); }
        else if (lk === 'i' && e.shiftKey) { e.preventDefault(); invertColors(); }
        else if (lk === 'g') { e.preventDefault(); setGrid(!st.grid); }
        else if (k === 'PageUp') { e.preventDefault(); setZoom(stepZoom(st.zoom, 1)); }
        else if (k === 'PageDown') { e.preventDefault(); setZoom(stepZoom(st.zoom, -1)); }
        else if (k === '+' || k === '=' || k === '-' || k === '_') {
          e.preventDefault();
          const f = sizeFamily();
          if (f) setLevel(f, levelOf(f) + (k === '-' || k === '_' ? -1 : 1));
        }
        return;
      }
      if (e.altKey) return;
      if (k === 'Delete') { e.preventDefault(); if (pend) dropPend(); else deleteSelection(); }
      else if (k === 'Escape') { e.preventDefault(); escape(); }
      else if (k === 'Enter') { if (pend || sel) { e.preventDefault(); commitPending(); commitSelection(); } }
      else if (k === 'F11') { e.preventDefault(); fullScreen(); }
      else if (k === 'F12') { e.preventDefault(); save(true); }
      else if (k.startsWith('Arrow') && sel) {
        e.preventDefault();
        const n = e.shiftKey ? 10 : 1;
        nudge(k === 'ArrowLeft' ? -n : k === 'ArrowRight' ? n : 0, k === 'ArrowUp' ? -n : k === 'ArrowDown' ? n : 0);
      } else if (k.startsWith('Arrow') && pend && !pend.building) {
        e.preventDefault();
        const n = e.shiftKey ? 10 : 1, dx = k === 'ArrowLeft' ? -n : k === 'ArrowRight' ? n : 0, dy = k === 'ArrowUp' ? -n : k === 'ArrowDown' ? n : 0;
        if (pend.pts) pend.pts = pend.pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        else { pend.x0 += dx; pend.x1 += dx; pend.y0 += dy; pend.y1 += dy; }
        renderPend();
      } else {
        const map = { p: 'pencil', b: 'brush', f: 'fill', e: 'eraser', i: 'picker', t: 'text', z: 'zoom', s: 'select', h: 'shape', k: 'sticker' };
        if (map[lk] && !e.shiftKey) { e.preventDefault(); setTool(map[lk]); }
      }
    });

    // ================================================================ start up
    selectTab('home');
    setTool('pencil');
    layout();
    updateZoomUI();
    afterChange();
    applyTextStyle();
    setTimeout(() => ws.focus({ preventScroll: true }), 60);
    if (args.path) loadPath(args.path);

    return {
      beforeClose: confirmDiscard,
      onResize() { requestAnimationFrame(fitRibbon); },
      onArgs(a) { if (a && a.path) confirmDiscard().then((ok) => ok && loadPath(a.path)); },
      onClose() {
        closed = true;
        if (fly) fly.close();
        A.ui.closeMenus();
        cleanups.forEach((fn) => { try { fn(); } catch (err) { /* keep closing */ } });
        resetHistory();
        [doc, layer, over, shadow].forEach((c) => { c.width = 0; c.height = 0; });
      },
    };
  }
})();
