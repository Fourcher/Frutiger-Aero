/* Aerium Control Panel: the settings home with category and classic views,
   search and a glass breadcrumb bar, plus Network and Sharing, Power
   Options, Date and Time, Security Center, Aerium Defender and Update,
   Programs and Features, User Accounts and Ease of Access.
   This file also owns the shared settings frame (Aerium.cpKit) that
   Personalization and System build their pages on. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, s, clamp } = A.util;
  const K = (A.cpKit = A.cpKit || {});

  // ============================================================ glossy icons
  // A few extra objects drawn in the icon recipe: lit from the top left,
  // darker rim, clipped shine, caustic base and a soft floor shadow.
  const DEFS =
    '<radialGradient id="floor" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b2a4a" stop-opacity=".3"/><stop offset="1" stop-color="#0b2a4a" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".92"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient>' +
    '<radialGradient id="caustic" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="pearl" cx=".36" cy=".26" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#dfe7ee"/><stop offset="1" stop-color="#8795a3"/></radialGradient>' +
    '<linearGradient id="aqua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4f0ff"/><stop offset=".5" stop-color="#7cc8ff"/><stop offset=".5" stop-color="#3aa6f5"/><stop offset="1" stop-color="#0a6fd1"/></linearGradient>' +
    '<radialGradient id="orb" cx=".5" cy="1.08" r="1"><stop offset="0" stop-color="#bff4ff"/><stop offset=".45" stop-color="#2cb6ea"/><stop offset="1" stop-color="#0b3d73"/></radialGradient>';
  const svgIcon = (body, defs = '') => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${DEFS}${defs}</defs><ellipse cx="32" cy="60.5" rx="19" ry="2.8" fill="url(#floor)"/>${body}</svg>`);
  const grad = (id, a, b, c, d) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient>`;
  const chip = (rot, x, y, g, rim, front) => `<g transform="rotate(${rot} ${x + 14} ${y + 14})"><rect x="${x}" y="${y}" width="28" height="28" rx="7" fill="url(#${g})" stroke="${rim}" stroke-opacity=".7"/><rect x="${x + 3}" y="${y + 2}" width="22" height="11" rx="5" fill="url(#shine)"/>${front ? `<ellipse cx="${x + 14}" cy="${y + 27}" rx="10" ry="3.5" fill="url(#caustic)"/>` : ''}</g>`;
  const MOUSE = 'M32 9C19 9 15 21 15 33c0 15 7 23 17 23s17-8 17-23C49 21 45 9 32 9z';

  K.icons = {
    mouse: svgIcon(
      '<path d="M32 9C32 5 35 2.5 40 2.5" fill="none" stroke="#7b8896" stroke-width="2" stroke-linecap="round"/>' +
      `<path d="${MOUSE}" fill="url(#pearl)"/>` +
      '<g clip-path="url(#mc)"><path d="M15 29.5Q32 33.5 49 29.5M32 9V31" fill="none" stroke="#8795a3" stroke-width="1.2"/><ellipse cx="32" cy="56" rx="15" ry="5" fill="url(#caustic)"/><ellipse cx="27" cy="16" rx="14" ry="9" fill="url(#shine)"/></g>' +
      '<rect x="29" y="13.5" width="6" height="11" rx="3" fill="url(#aqua)" stroke="#0b3d73" stroke-opacity=".6" stroke-width=".8"/>' +
      `<path d="${MOUSE}" fill="none" stroke="#4b5a69" stroke-opacity=".55"/>`,
      `<clipPath id="mc"><path d="${MOUSE}"/></clipPath>`),
    palette: svgIcon(
      chip(-14, 4, 16, 'g1', '#157a1f') + chip(10, 30, 9, 'g2', '#b86a00') + chip(0, 17, 26, 'g3', '#0b3d73', true),
      grad('g1', '#e9ffe0', '#8fe05a', '#35c93a', '#1f9e2a') + grad('g2', '#fff6c8', '#ffd26a', '#ffa22e', '#f07a12') + grad('g3', '#e6f7ff', '#7cc8ff', '#3aa6f5', '#0a6fd1')),
    taskbar: svgIcon(
      '<rect x="8" y="6" width="30" height="33" rx="3" fill="#fbfdff" stroke="#2f5f8c" stroke-opacity=".55"/>' +
      '<rect x="28" y="8" width="8" height="29" rx="1.5" fill="url(#aqua)" opacity=".9"/>' +
      '<g fill="#7cc8ff"><rect x="11" y="10" width="14" height="3" rx="1.5"/><rect x="11" y="16" width="11" height="3" rx="1.5"/><rect x="11" y="22" width="13" height="3" rx="1.5"/><rect x="11" y="28" width="9" height="3" rx="1.5"/></g>' +
      '<rect x="3" y="39" width="58" height="16" rx="3.5" fill="url(#tbg)" stroke="#021a4a" stroke-opacity=".75"/>' +
      '<rect x="4.5" y="40" width="55" height="6.5" rx="2.5" fill="#fff" opacity=".28"/>' +
      '<rect x="21" y="42" width="10" height="10" rx="2" fill="#fff" opacity=".38"/><rect x="33" y="42" width="10" height="10" rx="2" fill="#fff" opacity=".2"/>' +
      '<circle cx="51" cy="47" r="1.4" fill="#bff4ff"/><circle cx="55.5" cy="47" r="1.4" fill="#bff4ff"/>' +
      '<circle cx="12" cy="47" r="7" fill="url(#orb)" stroke="#0b3d73" stroke-opacity=".6"/><ellipse cx="12" cy="44.2" rx="4.6" ry="2.6" fill="#fff" opacity=".75"/>',
      '<linearGradient id="tbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f6f9f"/><stop offset=".5" stop-color="#16406e"/><stop offset=".5" stop-color="#0b2a55"/><stop offset="1" stop-color="#1b4a7c"/></linearGradient>'),
    access: svgIcon(
      '<circle cx="32" cy="31" r="25" fill="url(#orb)" stroke="#0b3d73" stroke-opacity=".6"/>' +
      '<ellipse cx="32" cy="52" rx="16" ry="5" fill="url(#caustic)"/>' +
      '<circle cx="32" cy="17" r="4.2" fill="#fff"/>' +
      '<path d="M19 25h26M32 25v12M32 37l-7 11M32 37l7 11" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<ellipse cx="32" cy="17" rx="18" ry="10" fill="url(#shine)" opacity=".7"/>'),
    printer: svgIcon(
      '<rect x="18" y="5" width="28" height="22" rx="1.5" fill="#fff" stroke="#8e9aa6"/>' +
      '<path d="M22 11h20M22 15h15M22 19h18" stroke="#7cc8ff" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="6" y="22" width="52" height="24" rx="6" fill="url(#pearl)" stroke="#4b5a69" stroke-opacity=".6"/>' +
      '<rect x="9" y="23.5" width="46" height="9" rx="4.5" fill="url(#shine)"/>' +
      '<rect x="15" y="38" width="34" height="4" rx="2" fill="#0b2a4a" opacity=".55"/>' +
      '<rect x="17" y="40" width="30" height="16" rx="1" fill="#fff" stroke="#8e9aa6"/>' +
      '<path d="M21 46h22M21 50h15" stroke="#8fe05a" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="50" cy="29" r="3.6" fill="#45d64a" opacity=".3"/><circle cx="50" cy="29" r="2" fill="#45d64a"/>'),
    flip: svgIcon(
      [[27, 5, 0.5], [18, 13, 0.75], [9, 21, 1]].map(([x, y, o], i) => `<g transform="translate(${x} ${y}) skewY(12)" opacity="${o}"><rect width="30" height="25" rx="3" fill="url(#aqua)" stroke="#0b3d73" stroke-opacity=".65"/>${i === 2 ? '<rect x="3" y="6.5" width="24" height="15.5" rx="1" fill="#fff"/><rect x="5" y="9" width="14" height="2" rx="1" fill="#7cc8ff"/><rect x="5" y="13" width="18" height="2" rx="1" fill="#bfe6ff"/>' : ''}<rect x="2" y="1.2" width="26" height="6" rx="2.5" fill="url(#shine)"/></g>`).join('')),
    keyboard: svgIcon(
      '<rect x="4" y="19" width="56" height="31" rx="6" fill="url(#pearl)" stroke="#4b5a69" stroke-opacity=".6"/>' +
      [0, 1, 2].map((r) => Array.from({ length: 7 }, (_, i) => `<rect x="${(9 + i * 6.9 + (r === 1 ? 1.5 : 0)).toFixed(1)}" y="${24 + r * 7}" width="5.4" height="5" rx="1.3" fill="#fff" stroke="#aab4be" stroke-width=".8"/>`).join('')).join('') +
      '<rect x="17" y="44" width="30" height="3.4" rx="1.6" fill="#fff" stroke="#aab4be" stroke-width=".8"/>' +
      '<rect x="7" y="20.5" width="50" height="11" rx="5" fill="url(#shine)" opacity=".6"/>'),
    gauge: svgIcon(
      '<circle cx="32" cy="33" r="25" fill="url(#pearl)" stroke="#4b5a69" stroke-opacity=".6"/>' +
      '<circle cx="32" cy="33" r="20" fill="#fff" opacity=".85"/>' +
      '<path d="M16 40A17 17 0 0 1 48 40" fill="none" stroke="url(#arc)" stroke-width="5.5" stroke-linecap="round"/>' +
      '<path d="M32 38L44 25" stroke="#0b2a4a" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="32" cy="38" r="4.2" fill="url(#orb)"/>' +
      '<ellipse cx="32" cy="18" rx="18" ry="9" fill="url(#shine)" opacity=".8"/>',
      '<linearGradient id="arc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#35c93a"/><stop offset=".55" stop-color="#ffd62e"/><stop offset="1" stop-color="#e0301e"/></linearGradient>'),
    firewall: svgIcon(
      [0, 1, 2, 3].map((r) => {
        const y = 13 + r * 10.5, off = r % 2 ? -8 : 0;
        return [0, 1, 2, 3, 4].map((i) => {
          const x = 6 + off + i * 16, x0 = Math.max(6, x), x1 = Math.min(58, x + 15);
          return x1 - x0 > 4 ? `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="9" rx="2.2" fill="url(#brick)" stroke="#7a2f12" stroke-opacity=".55"/>` : '';
        }).join('');
      }).join('') + '<rect x="7" y="14" width="50" height="14" rx="4" fill="url(#shine)" opacity=".55"/>',
      '<linearGradient id="brick" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd3a8"/><stop offset=".5" stop-color="#f08a5d"/><stop offset=".5" stop-color="#d9532f"/><stop offset="1" stop-color="#b8421f"/></linearGradient>'),
    router: svgIcon(
      '<path d="M26 12q6-5 12 0M22.5 8.5q9.5-8 19 0" fill="none" stroke="#3aa6f5" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>' +
      '<path d="M17 28L13 10M47 28L51 10" stroke="#5b6b7b" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="13" cy="9.5" r="2.2" fill="#8e9aa6"/><circle cx="51" cy="9.5" r="2.2" fill="#8e9aa6"/>' +
      '<rect x="5" y="27" width="54" height="22" rx="7" fill="url(#rb)" stroke="#0b1a2a" stroke-opacity=".7"/>' +
      '<rect x="8" y="28.5" width="48" height="8.5" rx="4" fill="url(#shine)" opacity=".55"/>' +
      [15, 23, 31, 39].map((x, i) => `<circle cx="${x}" cy="41" r="3.6" fill="${i === 3 ? '#3aa6f5' : '#45d64a'}" opacity=".3"/><circle cx="${x}" cy="41" r="1.9" fill="${i === 3 ? '#8fd3ff' : '#9ceb66'}"/>`).join('') +
      '<rect x="45" y="39" width="8" height="4" rx="2" fill="#0b1a2a" opacity=".6"/>',
      '<linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a7c8e"/><stop offset=".5" stop-color="#34475a"/><stop offset=".5" stop-color="#1c2b3a"/><stop offset="1" stop-color="#2d4052"/></linearGradient>'),
  };
  K.ic = (key) => (key && K.icons[key]) || key || 'icons/settings';

  // ============================================================ system facts
  K.sys = {
    edition: 'Aerium Home Premium',
    version: '7.0',
    build: '2007',
    servicePack: 'Service Pack 1',
    processor: 'AeroCore Duo CPU 2.40GHz',
    memory: '2.00 GB',
    type: '32-bit Operating System',
    graphics: 'AquaGlass 256 MB',
    productId: '00426-FISH-2007-BLUBB',
    get computerName() { return A.store.get('system.computerName', 'AERIUM-PC'); },
    get workgroup() { return A.store.get('system.workgroup', 'BUBBLEGROUP'); },
    get userName() { return A.store.get('user.name') || 'User'; },
    get avatar() { return A.store.get('user.avatar') || 'avatars/avatar-fish'; },
    get wei() {
      const w = A.store.get('system.wei', null);
      if (w && w.sub) return w;
      const sub = { cpu: 5.9, mem: 6.2, gfx: 6.4, game: 6.1, disk: 5.9, bubbles: 7.2 };
      return { base: 5.9, sub, date: null };
    },
  };

  // ============================================================ small helpers
  const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
  K.clone = clone;
  K.obj = (key, defaults) => Object.assign({}, defaults, A.store.get(key, null) || {});
  K.fmtMinutes = (m) => (!m ? 'Never' : m < 60 ? m + (m === 1 ? ' minute' : ' minutes') : (m / 60) + (m === 60 ? ' hour' : ' hours'));
  K.when = (ts) => {
    if (!ts) return 'Never';
    const d = new Date(ts), now = new Date();
    const same = d.toDateString() === now.toDateString();
    return (same ? 'Today' : A.util.fmtDate(d)) + ' at ' + A.util.fmtTime(d);
  };
  K.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  K.head = (title, lead, extra) => h('header.cp-head', null,
    h('div.cp-head-text', null, h('h1.cp-title', null, title), lead ? h('p.cp-lead', null, lead) : null), extra || null);
  K.section = (title, ...kids) => h('section.cp-section', null, title ? h('h2.cp-section-title', null, title) : null, ...kids);
  K.link = (label, onClick, o = {}) => h('button.ae-link.cp-link', { type: 'button', onclick: onClick, class: o.className, 'data-tip': o.tip }, o.icon ? A.img(K.ic(o.icon), { class: 'cp-link-icon' }) : null, label);
  K.note = (text, tone = 'info', icon) => h('div.cp-note', { class: 'cp-note-' + tone }, A.img(K.ic(icon || { info: 'icons/info', success: 'icons/check', warning: 'icons/warning', danger: 'icons/error' }[tone]), { class: 'cp-note-icon' }), h('div.cp-note-text', null, text));
  K.kv = (rows) => h('dl.cp-kv', null, rows.filter(Boolean).map(([k, v]) => [h('dt', null, k), h('dd', null, v)]));
  K.item = (o) => h('div.cp-item', { class: o.className },
    h('button.cp-item-icon', { type: 'button', tabIndex: -1, 'aria-hidden': 'true', onclick: o.onClick }, A.img(K.ic(o.icon))),
    h('div.cp-item-body', null,
      h('button.cp-item-title', { type: 'button', onclick: o.onClick }, o.title),
      o.desc ? h('div.cp-item-desc', null, o.desc) : null,
      o.links && o.links.length ? h('div.cp-item-links', null, o.links.map(([label, fn]) => h('button.ae-link.cp-item-link', { type: 'button', onclick: fn }, label))) : null));
  K.footer = (...kids) => h('div.cp-footer', null, ...kids);

  K.joke = (win, o) => A.ui.messageBox(Object.assign({ parent: win, title: 'Aerium', icon: 'info' }, o));

  // Launches an app, or explains kindly when that program isn't installed yet.
  K.launch = function (id, args, parent) {
    const app = A.apps.get(id);
    if (!app) {
      A.ui.messageBox({ parent, title: 'Aerium', icon: 'info', instruction: 'This program is still on its way', message: 'It will appear here as soon as it is installed. Check back soon.' });
      return null;
    }
    return A.apps.launch(id, args || {});
  };
  const appForPage = (id) => (id.startsWith('pz:') ? 'personalize' : id.startsWith('sy:') ? 'system' : 'controlpanel');
  // Runs a link target: a page id, an app to launch, or a function.
  K.open = function (t, ctx) {
    if (!t) return;
    if (typeof t === 'function') { t(ctx); return; }
    if (typeof t === 'string') {
      if (ctx && ctx.go) ctx.go(t);
      else A.apps.launch(appForPage(t), { page: t });
      return;
    }
    if (t.app) K.launch(t.app, t.args, ctx && ctx.win);
  };

  // A glossy LCD monitor with a stand; .screen hosts previews.
  K.monitor = function (o = {}) {
    const host = h('div.cp-mon-host');
    const screen = h('div.cp-mon-screen', null, host, h('div.cp-mon-glare'));
    const el = h('div.cp-monitor', { class: o.className, style: o.width ? { '--mon-w': o.width + 'px' } : null },
      h('div.cp-mon-bezel', null, screen, h('span.cp-mon-led')),
      h('div.cp-mon-neck'), h('div.cp-mon-base'));
    el.screen = screen;
    el.host = host;
    return el;
  };

  // A live-updating analog clock face (SVG); call .set(h, m, s).
  K.clockFace = function (size = 170) {
    const id = A.util.uid('clk');
    const ticks = [];
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      ticks.push(s('line', { x1: 100, y1: 22, x2: 100, y2: major ? 33 : 27, stroke: major ? '#35526e' : '#8aa2b8', 'stroke-width': major ? 3 : 1.2, 'stroke-linecap': 'round', transform: `rotate(${i * 6} 100 100)` }));
    }
    const nums = [[12, 100, 51], [3, 151, 107], [6, 100, 162], [9, 49, 107]].map(([n, x, y]) => s('text', { x, y, 'text-anchor': 'middle', class: 'cp-clock-num' }, String(n)));
    const hh = s('line', { x1: 100, y1: 108, x2: 100, y2: 58, stroke: '#1d2d3c', 'stroke-width': 7, 'stroke-linecap': 'round' });
    const mm = s('line', { x1: 100, y1: 112, x2: 100, y2: 36, stroke: '#1d2d3c', 'stroke-width': 4.5, 'stroke-linecap': 'round' });
    const ss = s('g', null, s('line', { x1: 100, y1: 120, x2: 100, y2: 30, stroke: '#e0301e', 'stroke-width': 1.8, 'stroke-linecap': 'round' }), s('circle', { cx: 100, cy: 100, r: 4.5, fill: '#e0301e' }));
    const svg = s('svg', { viewBox: '0 0 200 200', width: size, height: size, class: 'cp-clock', role: 'img', 'aria-label': 'Clock' },
      s('defs', null,
        s('linearGradient', { id: id + 'b', x1: 0, y1: 0, x2: 0, y2: 1 }, s('stop', { offset: 0, 'stop-color': '#ffffff' }), s('stop', { offset: 0.5, 'stop-color': '#c3ced8' }), s('stop', { offset: 1, 'stop-color': '#eef3f7' })),
        s('radialGradient', { id: id + 'f', cx: 0.45, cy: 0.35, r: 0.75 }, s('stop', { offset: 0, 'stop-color': '#ffffff' }), s('stop', { offset: 0.7, 'stop-color': '#eaf3fa' }), s('stop', { offset: 1, 'stop-color': '#b9cfe2' })),
        s('linearGradient', { id: id + 's', x1: 0, y1: 0, x2: 0, y2: 1 }, s('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.85 }), s('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }))),
      s('ellipse', { cx: 100, cy: 194, rx: 62, ry: 5, fill: 'rgba(11,42,74,.18)' }),
      s('circle', { cx: 100, cy: 100, r: 95, fill: `url(#${id}b)`, stroke: 'rgba(11,42,74,.45)', 'stroke-width': 1.5 }),
      s('circle', { cx: 100, cy: 100, r: 84, fill: `url(#${id}f)`, stroke: 'rgba(11,42,74,.35)', 'stroke-width': 1 }),
      ...ticks, ...nums, hh, mm, ss,
      s('circle', { cx: 100, cy: 100, r: 7, fill: '#1d2d3c' }), s('circle', { cx: 100, cy: 100, r: 2.6, fill: '#e0301e' }),
      s('path', { d: 'M28 92 C 34 44, 166 44, 172 92 C 140 76, 60 76, 28 92 Z', fill: `url(#${id}s)` }));
    svg.set = (H, M, S) => {
      hh.setAttribute('transform', `rotate(${((H % 12) + M / 60) * 30} 100 100)`);
      mm.setAttribute('transform', `rotate(${(M + S / 60) * 6} 100 100)`);
      ss.setAttribute('transform', `rotate(${S * 6} 100 100)`);
    };
    const d = new Date();
    svg.set(d.getHours(), d.getMinutes(), d.getSeconds());
    return svg;
  };

  // A small month calendar with navigation.
  K.calendar = function () {
    const today = new Date();
    let view = new Date(today.getFullYear(), today.getMonth(), 1);
    const title = h('div.cp-cal-title');
    const grid = h('div.cp-cal-grid');
    const el = h('div.cp-cal', null,
      h('div.cp-cal-head', null,
        h('button.cp-cal-nav', { type: 'button', 'aria-label': 'Previous month', onclick: () => move(-1) }, chev(-1)),
        title,
        h('button.cp-cal-nav', { type: 'button', 'aria-label': 'Next month', onclick: () => move(1) }, chev(1))),
      grid);
    function chev(dir) { return s('svg', { viewBox: '0 0 8 8', width: 8, height: 8, 'aria-hidden': 'true' }, s('path', { d: dir < 0 ? 'M5.5 1L2 4l3.5 3' : 'M2.5 1L6 4 2.5 7', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 })); }
    function move(dm) { view = new Date(view.getFullYear(), view.getMonth() + dm, 1); render(); A.sound.play('click'); }
    function render() {
      title.textContent = A.util.MONTHS[view.getMonth()] + ' ' + view.getFullYear();
      grid.innerHTML = '';
      ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach((x) => grid.appendChild(h('span.cp-cal-dow', null, x)));
      const first = view.getDay();
      const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      const prev = new Date(view.getFullYear(), view.getMonth(), 0).getDate();
      for (let i = 0; i < 42; i++) {
        const n = i - first + 1;
        let label = n, cls = '';
        if (n < 1) { label = prev + n; cls = 'other'; } else if (n > days) { label = n - days; cls = 'other'; } else if (n === today.getDate() && view.getMonth() === today.getMonth() && view.getFullYear() === today.getFullYear()) cls = 'today';
        grid.appendChild(h('span.cp-cal-day', { class: cls }, label));
      }
    }
    render();
    return el;
  };

  // Progress task dialog: runs steps one by one. Resolves true when done,
  // false when the person cancels.
  K.progress = function (o) {
    return new Promise((resolve) => {
      const status = h('div.cp-pd-status', null, o.steps[0] ? o.steps[0].text : '');
      const bar = A.ui.progress({ value: 0, tone: o.tone || 'grass', label: o.instruction });
      const log = h('ul.cp-pd-log');
      const content = h('div.cp-pd', null,
        h('div.cp-pd-top', null,
          o.icon ? A.img(K.ic(o.icon), { class: 'cp-pd-icon' }) : null,
          h('div.cp-pd-text', null, h('div.ae-td-instruction', null, o.instruction), status)),
        bar,
        o.log === false ? null : log);
      let finished = false, dlg = null;
      A.ui.dialog({
        parent: o.parent, title: o.title || 'Aerium', icon: K.ic(o.icon || 'icons/aerium'), content, width: o.width || 470,
        buttons: [{ label: o.cancelLabel || 'Cancel', cancel: true, value: 'cancel' }],
        onOpen: (w) => { dlg = w; run(); },
      }).then(() => { if (!finished) { finished = true; resolve(false); } });
      async function run() {
        const total = o.steps.reduce((a, st) => a + (st.ms || 900), 0) || 1;
        let t = 0;
        for (const st of o.steps) {
          if (finished) return;
          status.textContent = st.text;
          const li = h('li.cp-pd-item.running', null, h('span.cp-pd-dot'), h('span', null, st.text));
          if (st.log !== false) { log.appendChild(li); log.scrollTop = log.scrollHeight; }
          const ms = st.ms || 900;
          const n = Math.max(1, Math.round(ms / 140));
          for (let i = 1; i <= n; i++) {
            await K.sleep(ms / n);
            if (finished) return;
            bar.set(((t + (ms * i) / n) / total) * 100);
          }
          t += ms;
          li.classList.remove('running');
          li.classList.add('done');
          if (st.run) { try { await st.run(status); } catch (e) { console.error(e); } }
        }
        if (finished) return;
        finished = true;
        await K.sleep(300);
        if (dlg) dlg.close(true);
        resolve(true);
      }
    });
  };

  // OK / Cancel / Apply for settings pages. Every change previews live; Apply
  // and OK keep it, Cancel puts back exactly what was there when the page opened.
  K.settingsFooter = function (ctx, o) {
    let snap = take();
    function take() { const m = {}; o.keys.forEach((k) => { m[k] = clone(A.store.get(k)); }); return m; }
    const dirty = () => o.keys.some((k) => JSON.stringify(A.store.get(k)) !== JSON.stringify(snap[k]));
    const restore = () => {
      if (!dirty()) return;
      o.keys.forEach((k) => A.store.set(k, clone(snap[k])));
      if (o.restore) o.restore(snap);
    };
    const commit = () => { snap = take(); if (o.onApply) o.onApply(); upd(); };
    const okBtn = A.ui.button(o.okLabel || 'OK', { tone: 'aqua', onClick: () => { commit(); A.sound.play('select'); if (o.onOk) o.onOk(); else ctx.up(); } });
    const cancelBtn = A.ui.button('Cancel', { onClick: () => { restore(); if (o.onCancel) o.onCancel(); else ctx.up(); } });
    const applyBtn = A.ui.button('Apply', { onClick: () => { commit(); A.sound.play('select'); } });
    [okBtn, cancelBtn, applyBtn].forEach((b) => { b.style.minWidth = '84px'; });
    okBtn.classList.add('ae-default');
    function upd() { applyBtn.disabled = !dirty(); }
    o.keys.forEach((k) => ctx.bus('store:' + k, upd));
    upd();
    const el = h('div.cp-footer', null, o.extra || null, h('span.cp-footer-space'), okBtn, cancelBtn, o.noApply ? null : applyBtn);
    el.restore = restore;
    el.commit = commit;
    el.dirty = dirty;
    el.refresh = upd;
    return el;
  };

  // ============================================================ page registry
  K.pages = K.pages || new Map();
  K.dialogs = K.dialogs || {};
  K.page = function (id, def) { K.pages.set(id, Object.assign({ id }, def)); return def; };
  // Resolves a page id, following aliases (a page shown under another parent).
  K.resolve = function (id) {
    const def = K.pages.get(id);
    if (!def) return null;
    if (!def.alias) return def;
    const target = K.pages.get(def.alias);
    if (!target) return null;
    return Object.assign({}, target, def, { build: target.build, side: def.side !== undefined ? def.side : target.side, id });
  };
  function childPages(id) {
    const def = K.resolve(id);
    if (def && def.menu) return def.menu();
    return Array.from(K.pages.values())
      .filter((d) => d.parent === id && !d.hidden && K.resolve(d.id))
      .sort((a, b) => (a.order || 50) - (b.order || 50) || (K.resolve(a.id).title || '').localeCompare(K.resolve(b.id).title || ''))
      .map((d) => { const r = K.resolve(d.id); return { label: r.crumb || r.title, icon: r.icon, target: d.id }; });
  }
  K.chain = function (id) {
    const out = [];
    for (let p = id, guard = 0; p && guard < 12; guard++) {
      const d = K.resolve(p);
      if (!d) break;
      out.unshift(p);
      p = d.parent;
    }
    return out;
  };

  // ============================================================ the frame
  function arrowSVG(dir) {
    return s('svg', { viewBox: '0 0 16 16', width: 15, height: 15, 'aria-hidden': 'true' },
      s('path', { d: dir < 0 ? 'M9 3L4 8l5 5M4.6 8H13' : 'M7 3l5 5-5 5M11.4 8H3', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }
  function chevronSVG(down) {
    return s('svg', { viewBox: '0 0 8 8', width: 7, height: 7, 'aria-hidden': 'true' }, s('path', { d: down ? 'M1 2.5h6L4 6z' : 'M2.5 1v6L6 4z', fill: 'currentColor' }));
  }
  function refreshSVG() {
    return s('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': 'true' },
      s('path', { d: 'M13 8a5 5 0 1 1-1.5-3.6', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
      s('path', { d: 'M12.6 1.8v3.4H9.2', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }

  K.frame = function (win, opts = {}) {
    const backBtn = h('button.cp-nav-btn.cp-back', { type: 'button', 'aria-label': 'Back', 'data-tip': 'Back (Alt+Left)' }, arrowSVG(-1));
    const fwdBtn = h('button.cp-nav-btn.cp-fwd', { type: 'button', 'aria-label': 'Forward', 'data-tip': 'Forward (Alt+Right)' }, arrowSVG(1));
    const histBtn = h('button.cp-nav-hist', { type: 'button', 'aria-label': 'Recent pages', 'data-tip': 'Recent pages' }, chevronSVG(true));
    const crumbIcon = h('img.cp-crumb-icon', { alt: '' });
    const crumbs = h('div.cp-crumbs');
    const refreshBtn = h('button.cp-refresh', { type: 'button', 'aria-label': 'Refresh', 'data-tip': 'Refresh' }, refreshSVG());
    const address = h('div.cp-address', null, crumbIcon, crumbs, refreshBtn);
    const search = h('input.cp-search-input', { type: 'search', placeholder: 'Search', 'aria-label': 'Search Control Panel', spellcheck: false, autocomplete: 'off' });
    const searchBox = h('div.cp-search', null, search, h('span.cp-search-glyph'));
    const nav = h('div.cp-nav', null, h('div.cp-navbtns', null, backBtn, fwdBtn, histBtn), address, searchBox);
    const side = h('nav.cp-side', { 'aria-label': 'Tasks' });
    const content = h('div.cp-content');
    const main = h('div.cp-main', null, side, content);
    win.body.classList.add('cp-frame');
    win.body.append(nav, main);

    const hist = [];
    let pos = -1;
    let cur = null; // { entry, ctx, res }

    function go(id, params, o = {}) {
      if (!K.resolve(id)) {
        A.ui.messageBox({ parent: win, title: 'Control Panel', icon: 'info', instruction: 'This page isn\'t available yet', message: 'The part of Aerium that shows it is still being installed. Try again in a little while.' });
        return;
      }
      const entry = { id, params: params || {}, scroll: 0 };
      if (o.replace && pos >= 0) hist[pos] = entry;
      else {
        if (cur && hist[pos]) hist[pos].scroll = content.scrollTop;
        hist.splice(pos + 1);
        hist.push(entry);
        if (hist.length > 60) hist.shift();
        pos = hist.length - 1;
      }
      if (!o.silent) A.sound.play('navigate');
      show();
    }
    function back() { if (pos > 0) { hist[pos].scroll = content.scrollTop; pos--; A.sound.play('navigate'); show(true); } }
    function forward() { if (pos < hist.length - 1) { hist[pos].scroll = content.scrollTop; pos++; A.sound.play('navigate'); show(true); } }

    function leave() {
      if (!cur) return;
      const c = cur;
      cur = null;
      try { c.res && c.res.onLeave && c.res.onLeave(); } catch (e) { console.error(e); }
      c.ctx._cleanup();
    }

    function makeCtx(entry, def) {
      const cleanups = [];
      let pending = false;
      const ctx = {
        win, def, id: entry.id, params: entry.params, alive: true, content,
        go: (id, p) => go(id, p),
        back, forward,
        up: () => { if (def.parent) go(def.parent); },
        refresh: () => { if (ctx.alive) show(true, true); },
        invalidate: () => { if (pending || !ctx.alive) return; pending = true; requestAnimationFrame(() => { pending = false; ctx.refresh(); }); },
        timeout(fn, ms) { const t = setTimeout(() => { if (ctx.alive) fn(); }, ms); cleanups.push(() => clearTimeout(t)); return t; },
        interval(fn, ms) { const t = setInterval(() => { if (ctx.alive) fn(); }, ms); cleanups.push(() => clearInterval(t)); return t; },
        loop(fn) {
          let raf = 0, last = performance.now();
          const step = (ts) => { if (!ctx.alive) return; const dt = Math.min(0.05, (ts - last) / 1000); last = ts; fn(ts, dt); raf = requestAnimationFrame(step); };
          raf = requestAnimationFrame(step);
          cleanups.push(() => cancelAnimationFrame(raf));
        },
        sleep: (ms) => new Promise((res) => ctx.timeout(res, ms)),
        cleanup(fn) { cleanups.push(fn); },
        bus(ev, fn) { cleanups.push(A.bus.on(ev, (...a) => { if (ctx.alive) fn(...a); })); },
        listen(target, ev, fn, o) { target.addEventListener(ev, fn, o); cleanups.push(() => target.removeEventListener(ev, fn, o)); },
      };
      ctx._cleanup = () => { ctx.alive = false; cleanups.splice(0).reverse().forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); };
      return ctx;
    }

    function show(restoreScroll, keepScroll) {
      const entry = hist[pos];
      const keep = keepScroll ? content.scrollTop : null;
      leave();
      const def = K.resolve(entry.id);
      const ctx = makeCtx(entry, def);
      let res;
      try { res = def.build(ctx); } catch (e) {
        console.error('[Aerium] settings page failed', entry.id, e);
        res = h('div', null, K.head('Something went wrong'), K.note('This page ran into a problem: ' + (e && e.message), 'warning'));
      }
      if (res instanceof Node) res = { el: res };
      cur = { entry, ctx, res };
      const page = h('div.cp-page', { class: def.pageClass }, res.el);
      content.innerHTML = '';
      content.dataset.page = entry.id;
      content.appendChild(page);
      content.scrollTop = keep != null ? keep : restoreScroll ? entry.scroll || 0 : 0;
      win.setTitle(def.title);
      win.setIcon(K.ic(def.icon));
      crumbIcon.src = A.asset(K.ic(def.icon));
      renderCrumbs(entry.id);
      renderSide(def, ctx);
      backBtn.disabled = pos <= 0;
      fwdBtn.disabled = pos >= hist.length - 1;
      histBtn.disabled = hist.length < 2;
      if (entry.id !== 'cp:search' && search.value && document.activeElement !== search) search.value = '';
      if (res.onShow) requestAnimationFrame(() => { if (ctx.alive) res.onShow(); });
      if (opts.onShow) opts.onShow(entry.id);
      rememberRecent(entry.id);
    }

    function renderCrumbs(id) {
      crumbs.innerHTML = '';
      const chain = K.chain(id);
      chain.forEach((pid, i) => {
        const d = K.resolve(pid);
        const last = i === chain.length - 1;
        crumbs.appendChild(h('button.cp-crumb', { type: 'button', class: last && 'current', onclick: () => { if (!last) go(pid); } }, d.crumb || d.title));
        const kids = childPages(pid);
        if (!kids.length) return;
        const arrow = h('button.cp-crumb-arrow', { type: 'button', 'aria-label': 'Pages in ' + (d.crumb || d.title) }, chevronSVG());
        arrow.addEventListener('click', () => {
          const r = arrow.getBoundingClientRect();
          arrow.classList.add('open');
          const next = chain[i + 1];
          A.ui.menu(kids.map((k) => ({ label: k.label, icon: K.ic(k.icon), bold: k.target === next, onClick: () => K.open(k.target, cur && cur.ctx) })), r.left - 6, r.bottom + 2, { onClose: () => arrow.classList.remove('open') });
        });
        crumbs.appendChild(arrow);
      });
      requestAnimationFrame(() => { crumbs.scrollLeft = crumbs.scrollWidth; });
    }

    function renderSide(def, ctx) {
      side.innerHTML = '';
      let spec = typeof def.side === 'function' ? def.side(ctx) : def.side;
      if (spec === false) { side.hidden = true; main.classList.add('cp-no-side'); return; }
      side.hidden = false;
      main.classList.remove('cp-no-side');
      if (!spec) spec = K.defaultSide(ctx);
      spec.filter(Boolean).forEach((g) => {
        const box = h('div.cp-side-group');
        if (g.title) box.appendChild(h('div.cp-side-title', null, g.title));
        (g.links || []).filter(Boolean).forEach((l) => {
          if (l.current) { box.appendChild(h('div.cp-side-link.current', { class: l.bold && 'bold' }, l.label)); return; }
          box.appendChild(h('button.cp-side-link', { type: 'button', class: [l.bold && 'bold', l.icon && 'has-icon'], onclick: () => K.open(l.target, ctx) }, l.icon ? A.img(K.ic(l.icon), { class: 'cp-side-icon' }) : null, h('span', null, l.label)));
        });
        if (g.el) box.appendChild(g.el);
        side.appendChild(box);
      });
    }

    function rememberRecent(id) {
      const d = K.resolve(id);
      if (!d || d.noRecent || id === 'cp:home' || id.startsWith('cat:')) return;
      const list = (A.store.get('cp.recent', []) || []).filter((x) => x !== id);
      list.unshift(id);
      A.store.set('cp.recent', list.slice(0, 5));
    }

    // ---- chrome events
    backBtn.addEventListener('click', back);
    fwdBtn.addEventListener('click', forward);
    refreshBtn.addEventListener('click', () => { A.sound.play('navigate'); refreshBtn.classList.remove('spin'); void refreshBtn.offsetWidth; refreshBtn.classList.add('spin'); show(false, true); });
    histBtn.addEventListener('click', () => {
      const r = histBtn.getBoundingClientRect();
      const items = hist.map((e, i) => {
        const d = K.resolve(e.id);
        return d ? { label: e.id === 'cp:search' ? 'Search Results for "' + (e.params.q || '') + '"' : d.title, icon: K.ic(d.icon), checked: i === pos, radio: true, onClick: () => { hist[pos].scroll = content.scrollTop; pos = i; show(true); } } : null;
      }).filter(Boolean).reverse().slice(0, 12);
      A.ui.menu(items, r.left, r.bottom + 2);
    });
    let searchT = null;
    search.addEventListener('input', () => {
      clearTimeout(searchT);
      searchT = setTimeout(() => runSearch(search.value), 260);
    });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchT); runSearch(search.value); }
      if (e.key === 'Escape' && search.value) { e.preventDefault(); e.stopPropagation(); search.value = ''; runSearch(''); }
    });
    function runSearch(q) {
      q = q.trim();
      const onSearch = hist[pos] && hist[pos].id === 'cp:search';
      if (!q) { if (onSearch && pos > 0) back(); return; }
      go('cp:search', { q }, { replace: onSearch, silent: onSearch });
    }
    win.el.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); back(); }
      else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); forward(); }
      else if (e.key === 'Backspace' && !A.util.isTyping(e)) { e.preventDefault(); back(); }
      else if ((e.ctrlKey && e.key.toLowerCase() === 'f') || e.key === 'F3') { e.preventDefault(); search.focus(); search.select(); }
    });
    win.el.addEventListener('mouseup', (e) => {
      if (e.button === 3) { e.preventDefault(); back(); }
      if (e.button === 4) { e.preventDefault(); forward(); }
    });

    const api = {
      go, back, forward, leave,
      refresh: () => show(false, true),
      get current() { return hist[pos] ? hist[pos].id : null; },
      destroy() { leave(); },
      el: win.body,
    };
    win.on('close', () => leave());
    go(opts.start || 'cp:home', opts.params, { silent: true });
    return api;
  };

  // ============================================================ Control Panel data
  const JOKES = {
    printers: (ctx) => K.joke(ctx.win, { title: 'Printers', icon: K.icons.printer, instruction: 'No printers are installed', message: 'Before you can print, you need to install a printer. Honestly, the fish recommend taking a screenshot.' }),
    autoplay: (ctx) => K.joke(ctx.win, { title: 'AutoPlay', icon: 'icons/disc', instruction: 'Insert a disc to get started', message: 'AutoPlay will ask what to do with it. Audio CDs play in Aerium Media Player. Blank CDs make everyone nervous.' }),
    parental: (ctx) => K.joke(ctx.win, { title: 'Parental Controls', icon: 'icons/heart', instruction: 'Computer time limits: off at 8:00 PM on school nights', message: 'Just kidding. Probably. Aerium has no time limits, but the fish do go to sleep when the lights go out.' }),
    language: (ctx) => K.joke(ctx.win, { title: 'Regional and Language Options', icon: 'icons/globe', instruction: 'Current location: a sunny hill', message: 'Formats: English (United States)\nKeyboard: US\nDisplay language: Calm, warm and hopeful\n\nAerium speaks one language fluently. It is working on Dolphin.' }),
    keyboards: (ctx) => K.joke(ctx.win, { title: 'Text Services and Input Languages', icon: K.icons.keyboard, instruction: 'Default input language: English (United States) - US', message: 'Your keyboard works great. Try the Konami code somewhere safe.' }),
    speech: (ctx) => K.joke(ctx.win, { title: 'Speech Recognition', icon: 'icons/chat', instruction: 'Say "Start listening"', message: 'Aerium is listening very hard, but it only understands clicks. It nods politely at everything else.' }),
    accounts: (ctx) => K.joke(ctx.win, { title: 'User Accounts', icon: 'icons/users', instruction: 'Guest account is off', message: 'The guest said they would rather watch the fish. You are the only account on this computer, and that makes you the boss.' }),
    uac: (ctx) => K.joke(ctx.win, { title: 'User Account Control', icon: 'icons/shield', instruction: 'User Account Control is on', message: 'It will ask "Are you sure?" at the least convenient moments. That is its whole personality, and we love it anyway.' }),
    remote: (ctx) => K.joke(ctx.win, { title: 'Remote Assistance', icon: 'icons/users', instruction: 'Invite someone you trust to help you', message: 'Your friends are busy playing Bubble Pop right now. Try Bubble Messenger instead.' }),
    getPrograms: (ctx) => A.ui.messageBox({ parent: ctx.win, title: 'Get Programs Online', icon: 'icons/search', instruction: 'Would you like to install Search Toolbar?', message: 'It\'s free, it\'s helpful, and it adds a second search box to your search box.', buttons: [{ label: 'No thanks', value: 0, default: true }, { label: 'Absolutely not', value: 1, cancel: true }] }),
  };

  const CATS = [
    { id: 'system', name: 'System and Maintenance', icon: 'icons/computer', lead: 'Keep your computer healthy, check how fast it is and choose how it saves power.', tasks: [['Get started with Aerium', { app: 'welcome' }], ['View basic information about your computer', 'cp:system'], ['Rate this computer', 'sy:wei']] },
    { id: 'security', name: 'Security', icon: 'icons/shield', lead: 'Check your security status, get updates and keep the fish safe.', tasks: [['Check for updates', 'cp:update'], ['Check this computer\'s security status', 'cp:security'], ['Scan for unwanted software', 'cp:defender']] },
    { id: 'network', name: 'Network and Internet', icon: 'icons/globe', lead: 'See how you\'re connected and share things with your home network.', tasks: [['View network status and tasks', 'cp:network'], ['Set up file sharing', 'cp:network'], ['Connect to a network', (ctx) => openNetworkFlyout(ctx)]] },
    { id: 'hardware', name: 'Hardware and Sound', icon: 'icons/speaker', lead: 'Adjust sounds, pointers, power and the things plugged into your computer.', tasks: [['Change system sounds', 'cp:sound'], ['Mouse', 'cp:mouse'], ['Change power-saving settings', 'cp:power']] },
    { id: 'programs', name: 'Programs', icon: 'icons/disc', lead: 'Uninstall programs, choose what opens your files and what starts with Aerium.', tasks: [['Uninstall a program', 'cp:programs'], ['Change startup programs', (ctx) => startupPrograms(ctx)]] },
    { id: 'users', name: 'User Accounts', icon: 'icons/users', lead: 'Change your picture, your name and other account settings.', tasks: [['Change your account picture', 'cp:users-picture'], ['Change your account name', 'cp:users-name']] },
    { id: 'appearance', name: 'Appearance and Personalization', icon: 'icons/personalize', lead: 'Make Aerium yours: glass colors, backgrounds, screen savers and more.', tasks: [['Change desktop background', 'pz:background'], ['Customize colors', 'pz:color'], ['Adjust screen resolution', 'pz:display']] },
    { id: 'clock', name: 'Clock, Language, and Region', icon: 'icons/clock', lead: 'Check the time here and anywhere else in the world.', tasks: [['Change the time zone', 'cp:datetime'], ['Change display language', JOKES.language]] },
    { id: 'access', name: 'Ease of Access', icon: 'access', lead: 'Make your computer easier to see, hear and use.', tasks: [['Let Aerium suggest settings', 'cp:access'], ['Optimize visual display', 'cp:access']] },
  ];

  const deviceManager = (ctx) => (K.dialogs.deviceManager ? K.dialogs.deviceManager(ctx.win) : JOKES.printers(ctx));
  const visualEffects = (ctx) => (K.dialogs.performance ? K.dialogs.performance(ctx.win) : ctx.go('sy:wei'));

  const APPLETS = {
    welcome: { name: 'Welcome Center', icon: 'icons/welcome', open: { app: 'welcome' }, cats: ['system'], desc: 'Get started with Aerium.', tasks: [['Get started with Aerium', { app: 'welcome' }]] },
    system: { name: 'System', icon: 'icons/computer', open: 'cp:system', cats: ['system'], desc: 'See basic information about your computer.', tasks: [['View amount of RAM and processor speed', 'cp:system'], ['Check your Aerium Experience Index base score', 'sy:wei'], ['See the name of this computer', 'cp:system'], ['Device Manager', deviceManager]] },
    power: { name: 'Power Options', icon: 'icons/battery', open: 'cp:power', cats: ['system', 'hardware'], desc: 'Choose a power plan and when the computer sleeps.', tasks: [['Choose a power plan', 'cp:power'], ['Change when the computer sleeps', 'cp:power-plan'], ['Adjust screen brightness', 'cp:power-plan']] },
    update: { name: 'Aerium Update', icon: 'icons/sync', open: 'cp:update', cats: ['system', 'security'], desc: 'Get the latest updates for Aerium.', tasks: [['Check for updates', 'cp:update'], ['Turn automatic updating on or off', 'cp:update'], ['View installed updates', 'cp:updates-installed']] },
    performance: { name: 'Performance Information and Tools', icon: 'gauge', open: 'sy:wei', cats: ['system'], desc: 'Rate this computer and adjust visual effects.', tasks: [['Rate this computer', 'sy:wei'], ['Adjust visual effects', visualEffects]] },
    security: { name: 'Security Center', icon: 'icons/shield', open: 'cp:security', cats: ['security'], desc: 'Check the security essentials.', tasks: [['Check this computer\'s security status', 'cp:security'], ['Turn automatic updating on or off', 'cp:update']] },
    firewall: { name: 'Aerium Firewall', icon: 'firewall', open: 'cp:security', cats: ['security', 'network'], desc: 'Turn the firewall on or off.', tasks: [['Turn Aerium Firewall on or off', 'cp:security']] },
    defender: { name: 'Aerium Defender', icon: 'icons/defender', open: 'cp:defender', cats: ['security'], desc: 'Scan for unwanted software.', tasks: [['Scan for unwanted software', 'cp:defender']] },
    parental: { name: 'Parental Controls', icon: 'icons/heart', open: JOKES.parental, cats: ['security', 'users'], desc: 'Set limits for younger users.', tasks: [['Set up parental controls for any user', JOKES.parental]] },
    network: { name: 'Network and Sharing Center', icon: 'icons/network', open: 'cp:network', cats: ['network'], desc: 'Check your network status and change settings.', tasks: [['View network status and tasks', 'cp:network'], ['Connect to a network', (ctx) => openNetworkFlyout(ctx)], ['Diagnose and repair', (ctx) => diagnose(ctx)]] },
    internet: { name: 'Internet Options', icon: 'icons/globe', open: { app: 'browser' }, cats: ['network'], desc: 'Open Horizon Browser.', tasks: [['Change your home page', { app: 'browser' }]] },
    sound: { name: 'Sound', icon: 'icons/speaker', open: 'cp:sound', cats: ['hardware'], desc: 'Change system sounds and the volume.', tasks: [['Adjust system volume', 'cp:sound'], ['Change system sounds', 'cp:sound']] },
    mouse: { name: 'Mouse', icon: 'mouse', open: 'cp:mouse', cats: ['hardware'], desc: 'Change pointers, trails and double-click speed.', tasks: [['Change mouse pointers', 'cp:mouse'], ['Turn on mouse trails', 'cp:mouse'], ['Test your double-click speed', 'cp:mouse']] },
    display: { name: 'Display Settings', icon: 'icons/monitor', open: 'pz:display', cats: ['hardware', 'appearance'], desc: 'Adjust the resolution and text size.', tasks: [['Adjust screen resolution', 'pz:display'], ['Make text larger or smaller', 'pz:display']] },
    printers: { name: 'Printers', icon: 'printer', open: JOKES.printers, cats: ['hardware'], desc: 'Add a printer.', tasks: [['Add a printer', JOKES.printers]] },
    autoplay: { name: 'AutoPlay', icon: 'icons/disc', open: JOKES.autoplay, cats: ['hardware'], desc: 'Choose what happens when you insert a disc.', tasks: [['Play CDs or other media automatically', JOKES.autoplay]] },
    programs: { name: 'Programs and Features', icon: 'icons/disc', open: 'cp:programs', cats: ['programs'], desc: 'Uninstall or change programs.', tasks: [['Uninstall a program', 'cp:programs'], ['View installed updates', 'cp:updates-installed'], ['Turn Aerium features on or off', (ctx) => featuresDialog(ctx)]] },
    defaults: { name: 'Default Programs', icon: 'icons/check', open: 'cp:defaults', cats: ['programs'], desc: 'See which program opens each kind of file.', tasks: [['Make a file type always open in a specific program', 'cp:defaults'], ['Change startup programs', (ctx) => startupPrograms(ctx)]] },
    gadgets: { name: 'Aerium Sidebar Properties', icon: 'icons/gadgets', open: (ctx) => openGadgets(ctx), cats: ['programs', 'appearance'], desc: 'Add gadgets to your desktop.', tasks: [['Add gadgets to Sidebar', (ctx) => openGadgets(ctx)]] },
    users: { name: 'User Accounts', icon: 'icons/users', open: 'cp:users', cats: ['users'], desc: 'Change your picture, name and more.', tasks: [['Change your account picture', 'cp:users-picture'], ['Change your account name', 'cp:users-name'], ['Create a password', 'cp:users-password'], ['Add or remove user accounts', JOKES.accounts]] },
    personalization: { name: 'Personalization', icon: 'icons/personalize', open: 'pz:home', cats: ['appearance'], desc: 'Change the glass color, background, screen saver and sounds.', tasks: [['Change desktop background', 'pz:background'], ['Customize colors', 'pz:color'], ['Change screen saver', 'pz:screensaver'], ['Change sound effects', 'pz:sounds'], ['Change mouse pointers', 'pz:mouse'], ['Change the theme', 'pz:theme'], ['Adjust screen resolution', 'pz:display']] },
    taskbar: { name: 'Taskbar and Start Menu', icon: 'taskbar', open: 'pz:taskbar', cats: ['appearance'], desc: 'Show or hide the clock and customize the taskbar.', tasks: [['Customize the taskbar', 'pz:taskbar'], ['Show or hide the clock', 'pz:taskbar'], ['Change the picture on the Start menu', 'cp:users-picture']] },
    access: { name: 'Ease of Access Center', icon: 'access', open: 'cp:access', cats: ['appearance', 'access'], desc: 'Make your computer easier to use.', tasks: [['Make text larger', 'cp:access'], ['Make the focus rectangle thicker', 'cp:access'], ['Turn Magnifier on or off', 'cp:access']] },
    datetime: { name: 'Date and Time', icon: 'icons/clock', open: 'cp:datetime', cats: ['clock'], desc: 'Check the time and add clocks for other time zones.', tasks: [['Set the time and date', 'cp:datetime'], ['Change the time zone', 'cp:datetime'], ['Add clocks for different time zones', 'cp:datetime']] },
    region: { name: 'Regional and Language Options', icon: 'icons/globe', open: JOKES.language, cats: ['clock'], desc: 'Change your location and formats.', tasks: [['Change location', JOKES.language], ['Change keyboards or other input methods', JOKES.keyboards]] },
    speech: { name: 'Speech Recognition Options', icon: 'icons/chat', open: JOKES.speech, cats: ['access'], desc: 'Talk to your computer.', tasks: [['Start speech recognition', JOKES.speech]] },
    help: { name: 'Help and Support', icon: 'icons/help', open: { app: 'help' }, cats: [], desc: 'Find answers and things to try.' },
  };
  K.APPLETS = APPLETS;
  K.CATS = CATS;
  const appletsIn = (cat) => Object.values(APPLETS).filter((a) => a.cats.includes(cat));

  const view = () => A.store.get('cp.view', 'category');
  const recentGroup = () => {
    const list = (A.store.get('cp.recent', []) || []).filter((id) => K.resolve(id)).slice(0, 4);
    return list.length ? { title: 'Recent Tasks', links: list.map((id) => ({ label: K.resolve(id).title, target: id })) } : null;
  };
  const seeAlso = { title: 'See also', links: [{ label: 'Help and Support', target: { app: 'help' } }, { label: 'Welcome Center', target: { app: 'welcome' } }] };
  K.defaultSide = () => [{ links: [{ label: 'Control Panel Home', target: 'cp:home', bold: true }, { label: 'Classic View', target: (ctx) => { A.store.set('cp.view', 'classic'); ctx.go('cp:home'); } }] }, seeAlso];
  function catSide(ctx, current) {
    return [
      { links: [{ label: 'Control Panel Home', target: 'cp:home', bold: true }] },
      { links: CATS.map((c) => (c.id === current ? { label: c.name, current: true, bold: true } : { label: c.name, target: 'cat:' + c.id })) },
      recentGroup(),
      { links: [{ label: 'Classic View', target: () => { A.store.set('cp.view', 'classic'); ctx.go('cp:home'); } }] },
    ];
  }

  // ------------------------------------------------------------ home
  K.page('cp:home', {
    title: 'Control Panel', icon: 'icons/settings', parent: null,
    menu: () => CATS.map((c) => ({ label: c.name, icon: c.icon, target: 'cat:' + c.id })),
    side: (ctx) => [
      { links: [{ label: 'Control Panel Home', current: true, bold: true }, view() === 'classic'
        ? { label: 'Category View', target: () => { A.store.set('cp.view', 'category'); ctx.refresh(); } }
        : { label: 'Classic View', target: () => { A.store.set('cp.view', 'classic'); ctx.refresh(); } }] },
      recentGroup(),
      seeAlso,
    ],
    build(ctx) {
      const viewSel = A.ui.select({ options: [['category', 'Category'], ['classic', 'Large icons']], value: view(), label: 'View by', onChange: (v) => { A.store.set('cp.view', v); ctx.refresh(); } });
      const head = K.head('Adjust your computer\'s settings', null, h('label.cp-viewby', null, h('span', null, 'View by:'), viewSel));
      if (view() === 'classic') {
        const grid = h('div.cp-classic');
        Object.values(APPLETS).sort((a, b) => a.name.localeCompare(b.name)).forEach((a) => {
          grid.appendChild(h('button.cp-applet', { type: 'button', 'data-tip': a.desc || '', onclick: () => K.open(a.open, ctx) }, A.img(K.ic(a.icon)), h('span', null, a.name)));
        });
        return h('div.cp-home', null, head, grid);
      }
      const grid = h('div.cp-cats');
      CATS.forEach((c) => {
        const open = () => ctx.go('cat:' + c.id);
        grid.appendChild(h('div.cp-cat', null,
          h('button.cp-cat-icon', { type: 'button', tabIndex: -1, 'aria-hidden': 'true', onclick: open }, A.img(K.ic(c.icon))),
          h('div.cp-cat-body', null,
            h('button.cp-cat-title', { type: 'button', onclick: open }, c.name),
            c.tasks.map(([label, t]) => h('button.cp-cat-link', { type: 'button', onclick: () => K.open(t, ctx) }, label)))));
      });
      return h('div.cp-home', null, head, grid);
    },
  });

  // ------------------------------------------------------------ categories
  CATS.forEach((c, i) => K.page('cat:' + c.id, {
    title: c.name, icon: c.icon, parent: 'cp:home', order: i,
    keywords: [c.name],
    menu: () => appletsIn(c.id).map((a) => ({ label: a.name, icon: a.icon, target: a.open })),
    side: (ctx) => catSide(ctx, c.id),
    build(ctx) {
      const list = h('div.cp-applets');
      appletsIn(c.id).forEach((a) => list.appendChild(K.item({
        icon: a.icon, title: a.name, className: 'cp-applet-row',
        onClick: () => K.open(a.open, ctx),
        links: (a.tasks || []).map(([label, t]) => [label, () => K.open(t, ctx)]),
      })));
      return h('div', null, K.head(c.name, c.lead), list);
    },
  }));

  // ------------------------------------------------------------ search
  function searchIndex() {
    const out = [];
    Object.values(APPLETS).forEach((a) => {
      out.push({ applet: a, label: a.name, target: a.open, hay: (a.name + ' ' + (a.desc || '')).toLowerCase() });
      (a.tasks || []).forEach(([label, t]) => out.push({ applet: a, label, target: t, hay: (label + ' ' + a.name).toLowerCase() }));
    });
    K.pages.forEach((d, id) => {
      const r = K.resolve(id);
      if (!r || r.hidden || id.startsWith('cat:') || id === 'cp:home') return;
      out.push({ page: r, label: r.title, target: id, hay: (r.title + ' ' + (r.keywords || []).join(' ')).toLowerCase() });
    });
    return out;
  }
  K.page('cp:search', {
    title: 'Search Results', icon: 'icons/search', parent: 'cp:home', hidden: true, noRecent: true,
    build(ctx) {
      const q = String(ctx.params.q || '').trim();
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = searchIndex().filter((it) => words.every((w) => it.hay.includes(w)));
      const groups = new Map();
      hits.forEach((it) => {
        const key = it.applet ? 'a:' + it.applet.name : 'p:' + it.target;
        if (!groups.has(key)) groups.set(key, { title: it.applet ? it.applet.name : it.label, icon: it.applet ? it.applet.icon : it.page.icon, open: it.applet ? it.applet.open : it.target, tasks: [] });
        if (it.applet && it.label !== it.applet.name) groups.get(key).tasks.push([it.label, it.target]);
      });
      const list = h('div.cp-applets');
      groups.forEach((g) => list.appendChild(K.item({ icon: g.icon, title: g.title, className: 'cp-applet-row', onClick: () => K.open(g.open, ctx), links: g.tasks.map(([l, t]) => [l, () => K.open(t, ctx)]) })));
      const empty = !groups.size;
      return h('div', null,
        K.head(empty ? 'No results for "' + q + '"' : 'Search results for "' + q + '"', empty ? 'Try a different word, like "glass", "sound", "fish" or "clock".' : groups.size + (groups.size === 1 ? ' match' : ' matches') + ' in Control Panel'),
        empty ? K.note('Aerium looked everywhere, even behind the aquarium, but found nothing with that name.', 'info', 'icons/search') : list,
        h('div.cp-search-help', null, K.link('Search Help and Support for "' + q + '"', () => K.launch('help', { q }, ctx.win), { icon: 'icons/help' })));
    },
  });

  // ------------------------------------------------------------ shared actions (filled in below)
  function openNetworkFlyout(ctx) {
    const tray = A.taskbar && A.taskbar.tray && A.taskbar.tray.get('network');
    if (tray && tray.el && tray.el.isConnected && !tray.el.hidden) { setTimeout(() => tray.el.click(), 30); return; }
    if (ctx && ctx.go) ctx.go('cp:network');
  }
  function openGadgets(ctx) {
    if (A.gadgets && A.gadgets.gallery) { A.gadgets.gallery(); return; }
    K.joke(ctx.win, { title: 'Aerium Sidebar', icon: 'icons/gadgets', instruction: 'Gadgets are getting ready', message: 'The gadget gallery will open here once the gadgets finish unpacking.' });
  }
  function diagnose(ctx) { return K.diagnose(ctx); }
  function startupPrograms(ctx) { return K.startupPrograms(ctx); }
  function featuresDialog(ctx) { return K.featuresDialog(ctx); }
  const homeLink = { label: 'Control Panel Home', target: 'cp:home', bold: true };
  const storeCheck = (key, label, fallback, after) => A.ui.checkbox({ label, checked: !!A.store.get(key, fallback), onChange: (v) => { A.store.set(key, v); A.sound.play('click'); if (after) after(v); } });
  K.storeCheck = storeCheck;
  function bars(n, total = 4) {
    return h('span.cp-bars', { 'aria-label': n + ' of ' + total + ' bars' }, Array.from({ length: total }, (_, i) => h('i', { class: i < n ? 'lit' : '', style: { height: 5 + i * 3 + 'px' } })));
  }
  function expander(label, body, open) {
    const btn = h('button.cp-expander', { type: 'button', class: open && 'open', 'aria-expanded': String(!!open), 'aria-label': (open ? 'Hide' : 'Show') + ' details for ' + label }, chevronSVG(true));
    body.hidden = !open;
    const toggle = () => {
      body.hidden = !body.hidden;
      btn.classList.toggle('open', !body.hidden);
      btn.setAttribute('aria-expanded', String(!body.hidden));
      A.sound.play('click');
    };
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    btn.toggle = toggle;
    return btn;
  }

  // ============================================================ Network and Sharing Center
  const NET_SHARE = { discovery: true, files: true, public: false, media: true, password: true };
  const netState = () => ({
    name: A.store.get('net.connected', 'Aerium Home Network'),
    offline: !!A.store.get('net.offline', false),
    type: A.store.get('net.type', 'private'),
    share: K.obj('net.share', NET_SHARE),
  });
  function setOffline(v) {
    A.store.set('net.offline', !!v);
    A.sound.play(v ? 'disconnect' : 'connect');
    A.notify({ title: v ? 'Working offline' : 'Connected to the Internet', text: v ? 'Aerium is still on your home network, but it stopped talking to the Internet.' : 'Access: Local and Internet', icon: 'icons/network', sound: false });
  }
  function netMap(st) {
    const node = (icon, title, sub, cls) => h('div.cp-net-node', { class: cls },
      h('div.cp-net-orb', null, A.img(K.ic(icon))),
      h('div.cp-net-label', null, h('b', null, title), sub ? h('span', null, sub) : null));
    const line = (broken) => h('div.cp-net-line', { class: broken && 'broken' }, h('i.cp-net-flow'), broken ? h('span.cp-net-x', { role: 'img', 'aria-label': 'Not connected' }) : null);
    return h('div.cp-net-map', { role: 'img', 'aria-label': 'Network map' },
      node('icons/computer', K.sys.computerName, '(This computer)'),
      line(false),
      node('router', st.name, st.type === 'public' ? 'Public network' : 'Private network'),
      line(st.offline),
      node('icons/globe', 'Internet', st.offline ? 'Not connected' : null, st.offline && 'dim'));
  }
  function sharingPanel(st) {
    const rows = [
      ['discovery', 'Network discovery', 'Other computers on your network can see this one, and it waves back.'],
      ['files', 'File sharing', 'People on your network can open the files you choose to share.'],
      ['public', 'Public folder sharing', 'Anyone on the network can open and add files in the Public folder.'],
      ['printer', 'Printer sharing', 'No printers are installed. The fish looked everywhere.', true],
      ['password', 'Password protected sharing', 'Only people with an account on this computer can open shared files.'],
      ['media', 'Media sharing', 'Other computers can play your music and pictures. The fish prefer bossa nova.'],
    ];
    const panel = h('div.cp-panel.cp-share', null, h('div.cp-panel-title', null, 'Sharing and Discovery'));
    rows.forEach(([key, label, desc, disabled]) => {
      const on = !disabled && !!st.share[key];
      const state = h('span.cp-share-state', { class: on ? 'on' : 'off' }, h('i'), disabled ? 'Off' : on ? 'On' : 'Off');
      const body = h('div.cp-share-body', null, h('p', null, desc));
      if (!disabled) {
        body.appendChild(A.ui.toggle({
          label: 'Turn on ' + label.toLowerCase(), checked: on,
          onChange: (v) => {
            const sh = K.obj('net.share', NET_SHARE);
            sh[key] = v;
            A.store.set('net.share', sh);
            state.className = 'cp-share-state ' + (v ? 'on' : 'off');
            state.lastChild.textContent = v ? 'On' : 'Off';
          },
        }));
      }
      const exp = expander(label, body);
      panel.appendChild(h('div.cp-share-row', null, h('div.cp-share-head', { onclick: () => exp.toggle() }, h('span.cp-share-label', null, label), state, exp), body));
    });
    panel.appendChild(h('p.cp-fine', null, 'Nothing here ever leaves this browser. These switches are just for fun.'));
    return panel;
  }
  function netStatusDialog(ctx) {
    const st = netState();
    const dur = h('span'), sent = h('b'), recv = h('b');
    let s1 = 182044 + Math.floor(Math.random() * 90000), r1 = 931337 + Math.floor(Math.random() * 400000);
    const fmt = (n) => n.toLocaleString('en-US');
    const tick = () => {
      const t = Math.floor(performance.now() / 1000);
      dur.textContent = [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60].map((x) => String(x).padStart(2, '0')).join(':');
      if (!st.offline) { s1 += Math.floor(Math.random() * 900); r1 += Math.floor(Math.random() * 4200); }
      sent.textContent = fmt(s1);
      recv.textContent = fmt(r1);
    };
    tick();
    const timer = setInterval(tick, 500);
    const content = h('div.cp-dlg.cp-netstat', null,
      h('div.cp-netstat-title', null, 'Connection'),
      K.kv([['IPv4 Connectivity', st.offline ? 'Local' : 'Internet'], ['Media State', 'Enabled'], ['SSID', st.name], ['Duration', dur], ['Speed', '54.0 Mbps'], ['Signal Quality', bars(4)]]),
      h('div.cp-netstat-title', null, 'Activity'),
      h('div.cp-netstat-act', null,
        h('div', null, h('span.cp-muted', null, 'Sent'), sent),
        h('div.cp-netstat-pcs', null, A.img('icons/computer'), h('i.cp-netstat-blink', { class: st.offline ? '' : 'on' }), A.img(K.icons.router)),
        h('div', null, h('span.cp-muted', null, 'Received'), recv)),
      h('div.cp-muted.cp-center', null, 'Bytes'));
    A.ui.dialog({
      parent: ctx.win, title: 'Wireless Network Connection Status', icon: 'icons/wifi', content, width: 380,
      buttons: [{ label: 'Diagnose', value: 'diag' }, { label: st.offline ? 'Connect' : 'Work offline', value: 'toggle' }, { label: 'Close', default: true, cancel: true, value: 'close' }],
    }).then((v) => {
      clearInterval(timer);
      if (v === 'diag') K.diagnose(ctx);
      if (v === 'toggle') setOffline(!st.offline);
    });
  }
  function devicesDialog(ctx) {
    const st = netState();
    const dev = (icon, name, sub) => h('div.cp-dev', null, A.img(K.ic(icon)), h('b', null, name), h('span', null, sub));
    const content = h('div.cp-dlg', null,
      h('p', null, 'These computers and devices are on ' + st.name + ':'),
      h('div.cp-devs', null,
        dev('icons/computer', K.sys.computerName, 'This computer'),
        dev('router', 'AQUALINK-WR2007', 'Wireless router'),
        dev('icons/laptop', 'DADS-LAPTOP', 'Asleep, as usual'),
        dev('icons/gamepad', 'BUBBLE-STATION', 'Game console'),
        dev('icons/phone', 'GLOSSY-PHONE', 'Phone, charging'),
        dev('icons/camera', 'FISHTANK-CAM', 'Watching the fish'),
        dev('icons/globe', 'Internet', st.offline ? 'Not connected' : 'Connected')));
    A.ui.dialog({ parent: ctx.win, title: 'Network Map', icon: 'icons/network', content, width: 520, buttons: [{ label: 'Close', default: true, cancel: true }] });
  }
  function customizeNetwork(ctx) {
    const st = netState();
    const name = A.ui.textField({ label: 'Network name', value: st.name, maxLength: 32 });
    let type = st.type;
    const content = h('div.cp-dlg', null, name,
      h('p', { style: 'margin-top: 12px' }, 'Location type:'),
      A.ui.radioGroup({ value: type, options: [['private', 'Private: for home or work, where you know and trust the people and devices.'], ['public', 'Public: for coffee shops and airports. The fish keep their fins to themselves.']], onChange: (v) => { type = v; } }));
    A.ui.dialog({ parent: ctx.win, title: 'Set Network Location', icon: 'icons/network', content, width: 460, buttons: [{ label: 'Save', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] }).then((v) => {
      if (v !== 'ok') return;
      const nm = name.input.value.trim();
      if (nm) A.store.set('net.connected', nm);
      A.store.set('net.type', type);
      A.sound.play('select');
    });
  }
  K.diagnose = async function (ctx) {
    const st = netState();
    const steps = st.offline ? [
      { text: 'Identifying the problem...', ms: 1100 },
      { text: 'Checking the wireless adapter...', ms: 900 },
      { text: 'Asking the router how it feels...', ms: 1200 },
      { text: 'Turning the Internet off and on again...', ms: 1500 },
      { text: 'Reconnecting to ' + st.name + '...', ms: 1200, run: () => { A.store.set('net.offline', false); A.sound.play('connect'); } },
    ] : [
      { text: 'Identifying the problem...', ms: 1100 },
      { text: 'Saying hello to the Internet...', ms: 900 },
      { text: 'Checking that the tubes are clear...', ms: 1100 },
      { text: 'Asking the dolphins for directions...', ms: 1300 },
    ];
    const ok = await K.progress({ parent: ctx.win, title: 'Aerium Network Diagnostics', icon: 'icons/network', instruction: 'Aerium is looking for problems', steps, tone: 'aqua' });
    if (!ok) return;
    A.sound.play(st.offline ? 'win' : 'notify');
    A.ui.messageBox({
      parent: ctx.win, title: 'Aerium Network Diagnostics', icon: 'success', sound: false,
      instruction: st.offline ? 'Aerium fixed the problem' : 'Aerium didn\'t find any problems',
      message: st.offline ? 'The connection was just taking a little nap. You\'re back on the Internet.' : 'Your connection to ' + st.name + ' is working perfectly. The dolphins say hi.',
    });
  };

  K.page('cp:network', {
    title: 'Network and Sharing Center', icon: 'icons/network', parent: 'cat:network',
    keywords: ['network', 'internet', 'wifi', 'wireless', 'sharing', 'connection', 'diagnose', 'repair', 'router', 'offline'],
    side: (ctx) => [
      { links: [homeLink] },
      { title: 'Tasks', links: [
        { label: 'View computers and devices', target: () => devicesDialog(ctx) },
        { label: 'Connect to a network', target: () => openNetworkFlyout(ctx) },
        { label: 'Manage network connections', target: () => netStatusDialog(ctx) },
        { label: 'Diagnose and repair', target: () => K.diagnose(ctx) },
      ] },
      { title: 'See also', links: [{ label: 'Aerium Firewall', target: 'cp:security' }, { label: 'Internet Options', target: { app: 'browser' } }] },
    ],
    build(ctx) {
      const st = netState();
      ['net.connected', 'net.offline', 'net.type'].forEach((k) => ctx.bus('store:' + k, ctx.invalidate));
      ctx.bus('store:system.computerName', ctx.invalidate);
      const details = h('div.cp-panel.cp-net-details', null,
        h('div.cp-net-dhead', null, A.img(K.icons.router), h('div', null, h('b', null, st.name), h('span.cp-muted', null, st.type === 'public' ? ' (Public network)' : ' (Private network)')), h('span.cp-spacer'), K.link('Customize', () => customizeNetwork(ctx))),
        K.kv([
          ['Access', st.offline ? 'Local only' : 'Local and Internet'],
          ['Connection', h('span', null, 'Wireless Network Connection (' + st.name + ')  ', K.link('View status', () => netStatusDialog(ctx)))],
          ['Signal strength', h('span.cp-row', null, bars(4), 'Excellent')],
        ]),
        h('div.cp-row.cp-net-actions', null,
          st.offline ? A.ui.button('Connect to the Internet', { tone: 'grass', size: 'sm', onClick: () => setOffline(false) }) : A.ui.button('Work offline', { size: 'sm', onClick: () => setOffline(true) }),
          A.ui.button('Diagnose and repair', { size: 'sm', icon: 'icons/network', onClick: () => K.diagnose(ctx) })));
      return h('div', null,
        K.head('Network and Sharing Center', null, K.link('View full map', () => devicesDialog(ctx))),
        netMap(st),
        details,
        sharingPanel(st),
        h('div.cp-net-foot', null,
          K.link('Show me all the files and folders I am sharing', () => K.launch('explorer', { path: '/Documents' }, ctx.win)),
          K.link('Show me all the shared network folders on this computer', () => K.joke(ctx.win, { title: 'Shared Folders', icon: 'icons/folder', instruction: 'Users, Public and one folder called "stuff"', message: 'Nobody remembers making "stuff". It is full of screensavers.' }))));
    },
  });

  // ============================================================ Power Options
  const PLAN_DEFAULTS = {
    balanced: { display: 20, sleep: 60, brightness: 100 },
    saver: { display: 5, sleep: 15, brightness: 85 },
    high: { display: 15, sleep: 0, brightness: 100 },
  };
  const PLANS = [
    ['balanced', 'Balanced', 'Balances speed and energy use, resting when you step away for a while.', 3, 3],
    ['saver', 'Power saver', 'Saves energy by dimming the screen a little and resting sooner.', 5, 2],
    ['high', 'High performance', 'Keeps everything awake and bright. Great for long games of Solitaire.', 2, 5],
  ];
  const currentPlan = () => { const p = A.store.get('power.plan', 'balanced'); return PLAN_DEFAULTS[p] ? p : 'balanced'; };
  const planSettings = (id) => Object.assign({}, PLAN_DEFAULTS[id] || PLAN_DEFAULTS.balanced, (A.store.get('power.plans', null) || {})[id] || {});
  const planName = (id) => (PLANS.find((p) => p[0] === id) || PLANS[0])[1];
  const batteryPct = () => 100 - Math.floor(((Date.now() / 60000) % 60) / 6);
  function meter(label, n) {
    return h('span.cp-meter', { 'aria-label': label + ': ' + n + ' of 5' }, h('span.cp-muted', null, label), h('span.cp-meter-dots', null, Array.from({ length: 5 }, (_, i) => h('i', { class: i < n ? 'lit' : '' }))));
  }
  function batteryGauge() {
    const pct = batteryPct();
    return h('div.cp-battery', null,
      h('div.cp-battery-cell', null, h('div.cp-battery-fill', { style: { width: pct + '%' } }), h('span', null, pct + '%')),
      h('div.cp-battery-text', null, h('b', null, pct + '% available'), h('span.cp-muted', null, 'Plugged in, charging')));
  }
  K.page('cp:power', {
    title: 'Power Options', icon: 'icons/battery', parent: 'cat:system',
    keywords: ['power', 'battery', 'sleep', 'plan', 'energy', 'brightness', 'display', 'saver'],
    side: (ctx) => [
      { links: [homeLink,
        { label: 'Require a password on wakeup', target: () => ctx.go('pz:screensaver') },
        { label: 'Choose what the power button does', target: () => K.joke(ctx.win, { title: 'Power Options', icon: 'icons/battery', instruction: 'When you press the power button: Shut down', message: 'The Shut down button on the Start menu always says goodbye properly. It even plays a little tune.' }) },
        { label: 'Choose when to turn off the display', target: () => ctx.go('cp:power-plan', { plan: currentPlan() }) },
        { label: 'Change when the computer sleeps', target: () => ctx.go('cp:power-plan', { plan: currentPlan() }) }] },
      { title: 'See also', links: [{ label: 'Personalization', target: 'pz:home' }, { label: 'Screen saver', target: 'pz:screensaver' }] },
    ],
    build(ctx) {
      const cur = currentPlan();
      ctx.bus('store:power.plan', ctx.invalidate);
      const name = A.util.uid('plan');
      const list = h('div.cp-plans', { role: 'radiogroup', 'aria-label': 'Power plans' });
      PLANS.forEach(([id, label, desc, life, perf]) => {
        const st = planSettings(id);
        list.appendChild(h('div.cp-plan', { class: id === cur && 'on' },
          h('div.cp-plan-main', null,
            A.ui.radio({ name, value: id, label: h('b', null, label + (id === 'balanced' ? ' (recommended)' : '')), checked: id === cur, onChange: () => { A.store.set('power.plan', id); A.sound.play('select'); } }),
            h('div.cp-plan-desc', null, desc),
            h('div.cp-plan-meta', null, meter('Battery life', life), meter('Performance', perf),
              h('span.cp-muted', null, 'Display off: ' + K.fmtMinutes(st.display) + ' · Sleep: ' + K.fmtMinutes(st.sleep) + ' · Brightness: ' + st.brightness + '%'))),
          K.link('Change plan settings', () => ctx.go('cp:power-plan', { plan: id }))));
      });
      return h('div', null,
        K.head('Select a power plan', 'Power plans decide how quickly your computer rests and how bright the screen is. Pick one to make it active. You can also choose from the battery icon on the taskbar.', batteryGauge()),
        list,
        h('p.cp-fine', null, 'These plans really work: when Aerium sits idle long enough it turns the display off, then goes to sleep. Move the mouse to wake it up.'));
    },
  });

  const STEPS = [1, 2, 3, 5, 10, 15, 20, 25, 30, 45, 60, 120, 180, 300, 0];
  K.page('cp:power-plan', {
    title: 'Edit Plan Settings', icon: 'icons/battery', parent: 'cp:power', side: false,
    keywords: ['sleep', 'turn off display', 'brightness', 'dim'],
    build(ctx) {
      const id = PLAN_DEFAULTS[ctx.params.plan] ? ctx.params.plan : currentPlan();
      const st = planSettings(id);
      let saved = false;
      const idx = (m) => { const i = STEPS.indexOf(m); return i < 0 ? STEPS.length - 1 : i; };
      const row = (icon, label, control, value) => h('div.cp-pset-row', null, A.img(K.ic(icon), { class: 'cp-pset-icon' }), h('span.cp-pset-label', null, label), control, value);
      const dispVal = h('span.cp-pset-val', null, K.fmtMinutes(st.display));
      const sleepVal = h('span.cp-pset-val', null, K.fmtMinutes(st.sleep));
      const brightVal = h('span.cp-pset-val', null, st.brightness + '%');
      const disp = A.ui.slider({ min: 0, max: STEPS.length - 1, value: idx(st.display), label: 'Turn off the display', onInput: (v) => { st.display = STEPS[v]; dispVal.textContent = K.fmtMinutes(st.display); } });
      const sleep = A.ui.slider({ min: 0, max: STEPS.length - 1, value: idx(st.sleep), label: 'Put the computer to sleep', onInput: (v) => { st.sleep = STEPS[v]; sleepVal.textContent = K.fmtMinutes(st.sleep); } });
      const bright = A.ui.slider({ min: 40, max: 100, step: 5, value: st.brightness, label: 'Screen brightness', onInput: (v) => { st.brightness = v; brightVal.textContent = v + '%'; if (id === currentPlan()) setBrightness(v); } });
      const sync = () => { disp.setValue(idx(st.display)); sleep.setValue(idx(st.sleep)); bright.setValue(st.brightness); dispVal.textContent = K.fmtMinutes(st.display); sleepVal.textContent = K.fmtMinutes(st.sleep); brightVal.textContent = st.brightness + '%'; if (id === currentPlan()) setBrightness(st.brightness); };
      const save = () => {
        const all = A.store.get('power.plans', null) || {};
        all[id] = { display: st.display, sleep: st.sleep, brightness: st.brightness };
        saved = true;
        A.store.set('power.plans', all);
        A.sound.play('select');
        ctx.up();
      };
      return {
        el: h('div', null,
          K.head('Change settings for the plan: ' + planName(id), 'Choose when the display turns off, when the computer sleeps and how bright the screen is.'),
          h('div.cp-pset', null,
            row('icons/monitor', 'Turn off the display:', disp, dispVal),
            row('icons/moon', 'Put the computer to sleep:', sleep, sleepVal),
            row('icons/sun', 'Adjust plan brightness:', bright, brightVal)),
          h('div.cp-link-list', null,
            K.link('Restore default settings for this plan', () => { Object.assign(st, PLAN_DEFAULTS[id]); sync(); A.sound.play('click'); }),
            K.link('Change advanced power settings', () => K.joke(ctx.win, { title: 'Advanced Settings', icon: 'icons/battery', instruction: 'Advanced settings for ' + planName(id), message: 'Aquarium lights: On\nBubble generator: Adaptive\nGlass shine: Maximum\nFish nap schedule: Whenever they like\n\nThe fish handle the rest.' }))),
          K.footer(h('span.cp-footer-space'), A.ui.button('Save changes', { tone: 'aqua', onClick: save }), A.ui.button('Cancel', { onClick: () => ctx.up() }))),
        onLeave() { if (!saved) applyBrightness(); },
      };
    },
  });

  // ============================================================ Date and Time
  const ZONES = [
    ['Pacific/Honolulu', 'Hawaii'], ['America/Anchorage', 'Alaska'], ['America/Los_Angeles', 'Pacific Time (US & Canada)'],
    ['America/Denver', 'Mountain Time (US & Canada)'], ['America/Chicago', 'Central Time (US & Canada)'], ['America/New_York', 'Eastern Time (US & Canada)'],
    ['America/Halifax', 'Atlantic Time (Canada)'], ['America/Sao_Paulo', 'Brasilia'], ['Atlantic/Reykjavik', 'Reykjavik'],
    ['Etc/UTC', 'Coordinated Universal Time'], ['Europe/London', 'Dublin, Edinburgh, Lisbon, London'], ['Europe/Paris', 'Brussels, Copenhagen, Madrid, Paris'],
    ['Europe/Berlin', 'Amsterdam, Berlin, Rome, Stockholm'], ['Europe/Athens', 'Athens, Bucharest, Helsinki'], ['Africa/Cairo', 'Cairo'],
    ['Africa/Nairobi', 'Nairobi'], ['Europe/Moscow', 'Moscow, St. Petersburg'], ['Asia/Dubai', 'Abu Dhabi, Muscat'],
    ['Asia/Karachi', 'Islamabad, Karachi'], ['Asia/Kolkata', 'Chennai, Kolkata, Mumbai, New Delhi'], ['Asia/Bangkok', 'Bangkok, Hanoi, Jakarta'],
    ['Asia/Shanghai', 'Beijing, Hong Kong, Taipei'], ['Asia/Singapore', 'Kuala Lumpur, Singapore'], ['Asia/Tokyo', 'Osaka, Sapporo, Tokyo'],
    ['Asia/Seoul', 'Seoul'], ['Australia/Sydney', 'Canberra, Melbourne, Sydney'], ['Pacific/Auckland', 'Auckland, Wellington'],
  ];
  const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC'; } catch (e) { return 'Etc/UTC'; } };
  function zoneParts(zone, d = new Date()) {
    try {
      const p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23', weekday: 'long', month: 'long', day: 'numeric' }).formatToParts(d).forEach((x) => { p[x.type] = x.value; });
      return { h: (+p.hour) % 24, m: +p.minute, s: +p.second, day: p.weekday + ', ' + p.month + ' ' + p.day };
    } catch (e) { return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), day: A.util.fmtLongDate(d) }; }
  }
  function zoneOffset(zone, d = new Date()) {
    try {
      const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(d).find((x) => x.type === 'timeZoneName');
      const m = /GMT([+-])(\d+)(?::(\d+))?/.exec(part ? part.value : '');
      return m ? '(UTC' + m[1] + m[2].padStart(2, '0') + ':' + (m[3] || '00') + ')' : '(UTC)';
    } catch (e) { return ''; }
  }
  const zoneName = (zone) => { const z = ZONES.find((x) => x[0] === zone); return z ? z[1] : zone.replace(/_/g, ' ').replace(/\//g, ' / '); };
  const zoneLabel = (zone) => zoneOffset(zone) + ' ' + zoneName(zone);
  function zoneOptions(extra) {
    const list = ZONES.slice();
    if (extra && !list.some((z) => z[0] === extra)) list.push([extra, zoneName(extra)]);
    return list.map(([id]) => [id, zoneLabel(id)]);
  }
  function dstNote() {
    const now = new Date();
    const off = now.getTimezoneOffset();
    let day = null;
    for (let i = 1; i <= 370; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
      if (d.getTimezoneOffset() !== off) { day = d; break; }
    }
    if (!day) return h('p.cp-fine', null, 'This time zone does not observe daylight saving time, so the clock never jumps.');
    const later = day.getTimezoneOffset() > off;
    return h('p.cp-fine', null, 'Daylight saving time ' + (later ? 'ends' : 'begins') + ' on ' + A.util.fmtLongDate(day) + '. The clock goes ' + (later ? 'back' : 'forward') + ' one hour, and Aerium follows along automatically.');
  }
  const DEFAULT_CLOCKS = [{ on: true, zone: 'Asia/Tokyo', name: 'Tokyo' }, { on: false, zone: 'Europe/London', name: 'London' }];
  K.page('cp:datetime', {
    title: 'Date and Time', icon: 'icons/clock', parent: 'cat:clock',
    keywords: ['clock', 'time', 'date', 'calendar', 'time zone', 'timezone', 'internet time', 'sync'],
    side: [{ links: [homeLink] }, { title: 'See also', links: [{ label: 'Regional and Language Options', target: JOKES.language }] }],
    build(ctx) {
      let tabs = null;
      const face = K.clockFace(168);
      const dateEl = h('div.cp-dt-big'), timeEl = h('div.cp-dt-big');
      const extra = [];
      const tick = () => {
        const d = new Date();
        face.set(d.getHours(), d.getMinutes(), d.getSeconds());
        dateEl.textContent = A.util.fmtLongDate(d);
        timeEl.textContent = A.util.fmtTime(d, true);
        extra.forEach((f) => f());
      };
      ctx.interval(tick, 1000);
      const zone = deviceZone();
      const dtTab = () => h('div.cp-dt', null,
        h('div.cp-dt-row', null,
          h('div.cp-dt-clock', null, face),
          h('div.cp-dt-info', null,
            h('div.cp-muted', null, 'Date:'), dateEl,
            h('div.cp-muted', null, 'Time:'), timeEl,
            A.ui.button('Change date and time...', { size: 'sm', onClick: () => K.joke(ctx.win, { title: 'Date and Time Settings', icon: 'icons/clock', instruction: 'Your clock is already right', message: 'Aerium borrows the time from your device, so it never drifts. We wouldn\'t dream of changing it.' }) })),
          K.calendar()),
        h('div.cp-dt-zone', null,
          h('div', null, h('div.cp-muted', null, 'Time zone'), h('div', null, zoneLabel(zone))),
          A.ui.button('Change time zone...', { size: 'sm', onClick: () => A.ui.messageBox({ parent: ctx.win, title: 'Time Zone Settings', icon: 'icons/globe', instruction: 'Aerium follows your device', message: 'Your time zone is ' + zoneLabel(zone) + '. To see the time somewhere else, add a clock for another time zone.', buttons: [{ label: 'Add a clock', value: 'add', default: true }, { label: 'Close', value: 'close', cancel: true }] }).then((v) => { if (v === 'add' && tabs) tabs.select('clocks'); }) })),
        dstNote());
      const clocksTab = () => {
        const clocks = (A.store.get('datetime.clocks', null) || DEFAULT_CLOCKS).map((c, i) => Object.assign({}, DEFAULT_CLOCKS[i], c));
        const wrap = h('div.cp-clocks');
        const save = () => A.store.set('datetime.clocks', clocks);
        clocks.forEach((c, i) => {
          const mini = K.clockFace(110);
          const label = h('div.cp-clock-name');
          const day = h('div.cp-muted');
          const upd = () => { const p = zoneParts(c.zone); mini.set(p.h, p.m, p.s); label.textContent = c.name || zoneName(c.zone); day.textContent = p.day + ', ' + A.util.fmtTime(new Date(2000, 0, 1, p.h, p.m)); };
          extra.push(upd);
          upd();
          const face2 = h('div.cp-clock-card', { class: !c.on && 'off' }, mini, label, day);
          const zoneSel = A.ui.select({ options: zoneOptions(c.zone), value: c.zone, label: 'Time zone', onChange: (v) => { c.zone = v; if (!nameIn.input.value.trim() || nameIn.input.value === zoneName(ZONES.find((z) => z[0] === v) ? v : v)) { /* keep typed names */ } save(); upd(); } });
          const nameIn = A.ui.textField({ label: 'Display name', value: c.name, maxLength: 24, onInput: (v) => { c.name = v; save(); upd(); } });
          const show = A.ui.checkbox({ label: 'Show this clock', checked: c.on, onChange: (v) => { c.on = v; face2.classList.toggle('off', !v); save(); } });
          wrap.appendChild(h('div.cp-clock-slot', null, face2, h('div.cp-clock-form', null, show, h('label.cp-field', null, h('span', null, 'Select time zone:'), zoneSel), nameIn)));
        });
        return h('div', null, h('p.cp-lead', null, 'Keep an eye on the time somewhere far away. Handy for calling Grandma, or knowing when your pen pal is awake.'), wrap);
      };
      const syncTab = () => {
        const status = h('p', null, A.store.get('datetime.lastSync', null) ? 'The clock was successfully synchronized with time.aerium.example on ' + K.when(A.store.get('datetime.lastSync')) + '.' : 'This computer is set to automatically synchronize with time.aerium.example.');
        const spin = A.ui.spinner({ size: 22 });
        spin.hidden = true;
        const btn = A.ui.button('Update now', { tone: 'aqua', size: 'sm', onClick: async () => {
          btn.disabled = true;
          spin.hidden = false;
          status.textContent = 'Please wait while Aerium synchronizes with time.aerium.example...';
          await ctx.sleep(2200);
          const now = Date.now();
          A.store.set('datetime.lastSync', now);
          spin.hidden = true;
          btn.disabled = false;
          status.textContent = 'The clock was successfully synchronized with time.aerium.example on ' + K.when(now) + '. It was only ' + (Math.random() * 0.0009 + 0.0001).toFixed(4) + ' seconds off. The fish were right on time.';
          A.sound.play('ding');
        } });
        return h('div.cp-sync', null, A.img('icons/globe', { class: 'cp-sync-icon' }), h('div', null, status, h('p.cp-muted', null, 'Next synchronization: tomorrow, when the fish wake up.'), h('div.cp-row', null, btn, spin)));
      };
      tabs = A.ui.tabs({ className: 'cp-tabs', value: ctx.params.tab || 'dt', tabs: [
        { id: 'dt', label: 'Date and Time', content: dtTab },
        { id: 'clocks', label: 'Additional Clocks', content: clocksTab },
        { id: 'sync', label: 'Internet Time', content: syncTab },
      ] });
      tick();
      return h('div', null, K.head('Date and Time', 'Check the time here, add clocks for faraway places, or set the clock straight with the Internet.'), tabs);
    },
  });

  // ============================================================ Security
  const UPDATES = [
    { kb: 'KB2007101', name: 'Update for Aerium Glass (KB2007101)', desc: 'Makes bubbles 4% rounder and the glass a tiny bit shinier.', size: '2.1 MB' },
    { kb: 'KB2007102', name: 'Security Update for Bubble Messenger (KB2007102)', desc: 'Nudges are now 12% nudgier. Winks stay winky.', size: '5.8 MB' },
    { kb: 'KB2007103', name: 'Aquarium Definition Update 1.21.2007 (KB2007103)', desc: 'Teaches the fish two new tricks and straightens a bubble that went sideways.', size: '0.9 MB' },
  ];
  const updState = () => K.obj('security.updates', { installed: [], lastCheck: null, pending: null, lastInstall: null });
  const setUpd = (patch) => A.store.set('security.updates', Object.assign(updState(), patch));
  const notInstalled = () => { const done = updState().installed.map((x) => x.kb); return UPDATES.filter((u) => !done.includes(u.kb)); };
  let nagTimer = null;
  function scheduleNag(ms) {
    clearTimeout(nagTimer);
    nagTimer = setTimeout(() => {
      nagTimer = null;
      if (updState().pending !== 'restart' || !A.shellReady) return;
      A.notify({ title: 'Restart your computer to finish installing important updates', text: 'Aerium can\'t update files that are in use. Click here to restart now, or keep playing.', icon: 'icons/sync', timeout: 12000, onClick: () => A.apps.launch('controlpanel', { page: 'update' }) });
    }, ms);
  }
  function firewallBalloon() {
    A.notify({
      title: 'Your computer might be at risk', text: 'Aerium Firewall is turned off. Click this balloon to turn it back on.', icon: 'icons/shield', sound: 'exclamation',
      onClick: () => { A.store.set('security.firewall', true); A.notify({ title: 'Aerium Firewall is on', text: 'Your computer is protected again. The fish relax.', icon: 'icons/shield' }); },
    });
  }
  function secStatus() {
    const fw = A.store.get('security.firewall', true);
    const auto = A.store.get('security.autoUpdate', true);
    const u = updState();
    return {
      firewall: fw ? ['good', 'On'] : ['bad', 'Off'],
      updates: u.pending === 'restart' ? ['warn', 'Restart required'] : !auto ? ['warn', 'Off'] : ['good', 'On'],
      malware: ['good', 'On'],
      other: ['good', 'OK'],
    };
  }
  K.page('cp:security', {
    title: 'Security Center', icon: 'icons/shield', parent: 'cat:security',
    keywords: ['security', 'firewall', 'virus', 'malware', 'defender', 'updates', 'protection', 'safe', 'risk'],
    side: (ctx) => [
      { links: [homeLink] },
      { links: [
        { label: 'Aerium Update', target: 'cp:update', icon: 'icons/sync' },
        { label: 'Aerium Firewall', target: () => { const el = ctx.content.querySelector('[data-ess="firewall"] .cp-expander'); if (el && !el.classList.contains('open')) el.click(); }, icon: 'firewall' },
        { label: 'Aerium Defender', target: 'cp:defender', icon: 'icons/defender' },
        { label: 'Internet Options', target: { app: 'browser' }, icon: 'icons/globe' },
      ] },
      { title: 'See also', links: [{ label: 'Backup and Restore', target: () => K.joke(ctx.win, { title: 'Backup and Restore', icon: 'icons/upload', instruction: 'Your files live in this browser', message: 'Aerium keeps everything in this browser\'s storage. To keep a picture forever, open it and save a copy to your real computer.' }) }] },
    ],
    build(ctx) {
      ['security.firewall', 'security.autoUpdate', 'security.updates', 'security.lastScan'].forEach((k) => ctx.bus('store:' + k, ctx.invalidate));
      const st = secStatus();
      const allGood = Object.values(st).every((x) => x[0] === 'good');
      const lastScan = A.store.get('security.lastScan', null);
      const ess = (key, title, [tone, word], body, open) => {
        const bodyEl = h('div.cp-ess-body', null, body);
        const exp = expander(title, bodyEl, open);
        return h('div.cp-ess', { class: 'cp-ess-' + tone, dataset: { ess: key } },
          h('div.cp-ess-head', { onclick: () => exp.toggle() }, h('span.cp-ess-title', null, title), h('span.cp-ess-state', null, word), exp), bodyEl);
      };
      const fwOn = A.store.get('security.firewall', true);
      const fwToggle = A.ui.toggle({ label: fwOn ? 'Aerium Firewall is on' : 'Aerium Firewall is off', checked: fwOn, onChange: (v) => {
        A.store.set('security.firewall', v);
        if (!v) setTimeout(firewallBalloon, 700);
        else A.notify({ title: 'Aerium Firewall is on', text: 'Your computer is protected again.', icon: 'icons/shield', sound: false });
      } });
      const autoOn = A.store.get('security.autoUpdate', true);
      return h('div', null,
        h('div.cp-sec-hero', { class: allGood ? 'good' : 'warn' },
          A.img(allGood ? 'icons/shield' : 'icons/warning', { class: 'cp-sec-shield' }),
          h('div', null, h('div.cp-title', null, 'Security essentials'), h('p.cp-lead', null, allGood ? 'Your computer is protected. Everything below is On or OK, and the fish are safe.' : 'Your computer might be at risk. Look for anything marked in yellow or red below.'))),
        h('div.cp-ess-list', null,
          ess('firewall', 'Firewall', st.firewall, [h('p', null, fwOn ? 'Aerium Firewall is helping to keep strangers out of your computer.' : 'Aerium Firewall is off. Anyone could wander in, even the neighbor\'s cat.'), fwToggle], !fwOn),
          ess('updates', 'Automatic updating', st.updates, [
            h('p', null, updState().pending === 'restart' ? 'Updates were installed, but your computer needs to restart to finish.' : autoOn ? 'Aerium checks for updates and installs them for you.' : 'Automatic updating is off. Aerium won\'t check for updates on its own.'),
            h('div.cp-row', null, A.ui.button(updState().pending === 'restart' ? 'Restart options' : 'Check for updates', { size: 'sm', onClick: () => ctx.go('cp:update') }),
              autoOn ? null : A.ui.button('Turn on automatic updating', { size: 'sm', tone: 'grass', onClick: () => A.store.set('security.autoUpdate', true) }))], st.updates[0] !== 'good'),
          ess('malware', 'Malware protection', st.malware, [
            h('p', null, 'Aerium Defender is watching for unwanted software. Last scan: ' + (lastScan ? K.when(lastScan.ts) : 'not yet') + '.'),
            A.ui.button('Scan now', { size: 'sm', icon: 'icons/defender', onClick: () => ctx.go('cp:defender', { autostart: true }) })]),
          ess('other', 'Other security settings', st.other, [
            h('p', null, 'Internet security settings: OK. User Account Control: On, and a little nosy.'),
            K.link('Change User Account Control settings', () => JOKES.uac(ctx))])),
        h('p.cp-fine', null, 'Aerium is a playground, so nothing here can actually get in. It is fun to keep things green anyway.'));
    },
  });

  // ---- Defender
  function scanTargets(full) {
    const out = ['Memory: Aerium Shell', 'Memory: Desktop Window Manager', 'Memory: Bubble Messenger', 'Startup: Welcome Center', 'Registry: HKEY_FISH_TANK\\Bubbles', 'Registry: HKEY_GLASS\\Transparency', 'Cookies: Horizon Browser'];
    const sys = ['glass.sys', 'bubbles.dll', 'shine32.dll', 'aqua.drv', 'reflect.dll', 'sparkle.ocx', 'gradient.dll', 'wobble.sys', 'chime.wav', 'swoosh.wav', 'selawik.ttf', 'fishfood.dat'];
    sys.forEach((f) => out.push('/Aerium/System/' + f));
    const walk = (dir, depth) => {
      if (depth > 6) return;
      A.fs.list(dir).forEach((it) => { out.push(it.type === 'folder' ? it.path + '/' : it.path); if (it.type === 'folder') walk(it.path, depth + 1); });
    };
    walk('/', 0);
    if (full) ['Aquarium', 'Wallpapers', 'Sounds', 'Fonts', 'Gadgets', 'Screensavers'].forEach((d) => sys.forEach((f) => out.push('/Aerium/' + d + '/' + f)));
    return out;
  }
  const programInstalled = (id) => !(A.store.get('programs.removed', []) || []).includes(id);
  K.page('cp:defender', {
    title: 'Aerium Defender', icon: 'icons/defender', parent: 'cat:security',
    keywords: ['defender', 'scan', 'virus', 'spyware', 'malware', 'threats', 'protection'],
    side: (ctx) => [
      { links: [homeLink] },
      { title: 'Tools', links: [
        { label: 'Quarantined items', target: () => K.joke(ctx.win, { title: 'Quarantine', icon: 'icons/defender', instruction: 'There are no quarantined items', message: 'Just a few old bubbles that floated in by mistake. They are harmless.' }) },
        { label: 'Check for new definitions', target: () => ctx.go('cp:update') },
        { label: 'Security Center', target: 'cp:security' },
      ] },
    ],
    build(ctx) {
      const last = A.store.get('security.lastScan', null);
      let scanning = false;
      const statusBox = h('div.cp-def-status');
      const scanBox = h('div.cp-def-scan');
      const setStatus = (ok, title, text) => {
        statusBox.innerHTML = '';
        statusBox.className = 'cp-def-status ' + (ok ? 'good' : 'busy');
        statusBox.append(A.img(ok ? 'icons/check' : 'icons/search', { class: 'cp-def-status-icon' }), h('div', null, h('b', null, title), h('span', null, text)));
      };
      setStatus(true, 'No unwanted or harmful software detected.', 'Your computer is running normally.');
      const info = K.kv([
        ['Last scan:', last ? K.when(last.ts) + ' (' + (last.type === 'full' ? 'Full' : 'Quick') + ' scan)' : 'Never'],
        ['Scan schedule:', 'Daily around 2:00 AM (Quick scan)'],
        ['Real-time protection:', 'On'],
        ['Definition version:', '1.21.2007, created ' + A.util.fmtDate(new Date()) + ' at 6:00 AM'],
      ]);
      async function scan(type) {
        if (scanning) return;
        scanning = true;
        const full = type === 'full';
        const targets = scanTargets(full);
        const total = full ? 11000 : 6200;
        const bar = A.ui.progress({ value: 0, tone: 'grass', label: 'Scan progress' });
        const cur = h('div.cp-def-file');
        const count = h('b', null, '0');
        const time = h('b', null, '0:00:00');
        let stop = false;
        scanBox.innerHTML = '';
        scanBox.append(h('div.cp-def-scanning', null,
          h('div.cp-def-scanhead', null, A.ui.spinner({ size: 26 }), h('b', null, full ? 'Full scan' : 'Quick scan'), h('span.cp-spacer'), A.ui.button('Stop scan', { size: 'sm', onClick: () => { stop = true; } })),
          bar, h('div.cp-def-meta', null, h('span', null, 'Scanning: '), cur),
          h('div.cp-def-meta', null, h('span', null, 'Objects scanned: '), count, h('span', { style: 'margin-left: 18px' }, 'Time elapsed: '), time)));
        setStatus(false, 'Scanning your computer...', 'This might take a little while. Feel free to keep playing.');
        A.sound.play('zap');
        const t0 = performance.now();
        let objects = 0;
        while (!stop) {
          await ctx.sleep(70);
          const k = Math.min(1, (performance.now() - t0) / total);
          bar.set(k * 100);
          objects += 3 + Math.floor(Math.random() * (full ? 40 : 18));
          count.textContent = objects.toLocaleString('en-US');
          cur.textContent = targets[Math.min(targets.length - 1, Math.floor(k * targets.length))];
          const sec = Math.floor((performance.now() - t0) / 1000);
          time.textContent = '0:00:' + String(sec).padStart(2, '0');
          if (k >= 1) break;
        }
        scanning = false;
        if (stop) {
          scanBox.innerHTML = '';
          scanBox.appendChild(K.note('The scan was stopped. Nothing was harmed, including the fish.', 'info'));
          setStatus(true, 'No unwanted or harmful software detected.', 'Your computer is running normally.');
          return;
        }
        A.store.set('security.lastScan', { ts: Date.now(), type: full ? 'full' : 'quick', objects });
        A.sound.play('notify');
        setStatus(true, 'No threats found. Your fish are safe.', objects.toLocaleString('en-US') + ' objects scanned in ' + time.textContent.slice(2) + '.');
        scanBox.innerHTML = '';
        scanBox.appendChild(h('div.cp-def-done', null,
          h('div.cp-def-bubbles', { 'aria-hidden': 'true' }, Array.from({ length: 9 }, (_, i) => h('i', { style: { left: 8 + i * 10.5 + '%', animationDelay: (i * 0.23).toFixed(2) + 's' } }))),
          A.img('icons/check', { class: 'cp-def-done-icon' }),
          h('div', null, h('div.cp-def-done-title', null, 'No threats found. Your fish are safe.'), h('div.cp-muted', null, 'Aerium Defender checked ' + objects.toLocaleString('en-US') + ' files, folders and bubbles.'))));
        if (programInstalled('toolbar')) {
          scanBox.appendChild(h('div.cp-def-foot', null, K.note(h('span', null, 'One thing did look a little suspicious: Search Toolbar. It isn\'t harmful, just rude. ', K.link('Remove it in Programs and Features', () => ctx.go('cp:programs', { select: 'toolbar' }))), 'warning')));
        }
      }
      const scanBtn = A.ui.button('Scan now', { tone: 'aqua', icon: 'icons/defender', onClick: () => scan('quick') });
      const more = h('button.cp-split', { type: 'button', 'aria-label': 'Scan options', 'data-tip': 'Scan options' }, chevronSVG(true));
      more.addEventListener('click', () => { const r = more.getBoundingClientRect(); A.ui.menu([{ label: 'Quick scan', bold: true, onClick: () => scan('quick') }, { label: 'Full scan', onClick: () => scan('full') }], r.left, r.bottom + 2); });
      if (ctx.params.autostart) ctx.timeout(() => scan('quick'), 500);
      return h('div', null,
        h('div.cp-def-head', null, A.img('icons/defender', { class: 'cp-def-logo' }), h('div', null, h('div.cp-title', null, 'Aerium Defender'), h('p.cp-lead', null, 'Protection against unwanted software, and the occasional grumpy toolbar.')), h('span.cp-spacer'), h('div.cp-def-actions', null, scanBtn, more)),
        statusBox, scanBox,
        h('div.cp-panel', null, h('div.cp-panel-title', null, 'Status'), info));
    },
  });

  // ---- Update
  K.page('cp:update', {
    title: 'Aerium Update', icon: 'icons/sync', parent: 'cat:security',
    keywords: ['update', 'updates', 'patch', 'restart', 'install', 'kb'],
    side: (ctx) => [
      { links: [homeLink,
        { label: 'Check for updates', target: () => ctx.go('cp:update', { check: Date.now() }) },
        { label: 'Change settings', target: () => updateSettings(ctx) },
        { label: 'View update history', target: 'cp:updates-installed' },
        { label: 'Restore hidden updates', target: () => K.joke(ctx.win, { title: 'Aerium Update', icon: 'icons/sync', instruction: 'There are no hidden updates', message: 'The fish checked under the gravel. Nothing there but a very old sock.' }) }] },
      { title: 'See also', links: [{ label: 'Installed Updates', target: 'cp:updates-installed' }, { label: 'Security Center', target: 'cp:security' }] },
    ],
    build(ctx) {
      const panel = h('div.cp-upd');
      const info = h('div.cp-upd-info');
      const renderInfo = () => {
        const u = updState();
        info.innerHTML = '';
        info.appendChild(K.kv([
          ['Most recent check for updates:', K.when(u.lastCheck)],
          ['Updates were installed:', K.when(u.lastInstall)],
          ['You receive updates:', 'For Aerium, Bubble Messenger and the fish'],
        ]));
      };
      const stateBox = (tone, icon, title, text, actions, extra) => {
        panel.innerHTML = '';
        panel.className = 'cp-upd cp-upd-' + tone;
        panel.append(h('div.cp-upd-stripe'), h('div.cp-upd-main', null,
          h('div.cp-upd-top', null, A.img(K.ic(icon), { class: 'cp-upd-icon' }), h('div.cp-upd-text', null, h('div.cp-upd-title', null, title), text ? h('p', null, text) : null), h('div.cp-upd-actions', null, actions || [])),
          extra || null));
      };
      async function check() {
        stateBox('busy', 'icons/sync', 'Checking for updates...', 'Aerium is asking the update server what\'s new.', [A.ui.spinner({ size: 28 })]);
        panel.querySelector('.cp-upd-icon').classList.add('spin');
        await ctx.sleep(2600);
        setUpd({ lastCheck: Date.now() });
        renderInfo();
        render();
      }
      async function install(list) {
        const bar = A.ui.progress({ value: 0, tone: 'grass', label: 'Installing updates' });
        const each = A.ui.progress({ value: 0, tone: 'aqua', label: 'Current update' });
        const line = h('div.cp-muted');
        stateBox('busy', 'icons/sync', 'Installing updates...', null, [], h('div.cp-upd-install', null, line, each, bar));
        const titleEl = panel.querySelector('.cp-upd-title');
        for (let i = 0; i < list.length; i++) {
          titleEl.textContent = 'Installing updates (' + (i + 1) + ' of ' + list.length + ')...';
          line.textContent = list[i].name;
          for (let k = 1; k <= 16; k++) {
            await ctx.sleep(110 + Math.random() * 90);
            each.set((k / 16) * 100);
            bar.set(((i + k / 16) / list.length) * 100);
          }
        }
        setUpd({ pending: 'restart' });
        A.sound.play('notify');
        render();
      }
      function render() {
        renderInfo();
        const u = updState();
        const todo = notInstalled();
        if (u.pending === 'restart' || u.pending === 'restarting') {
          const postpone = A.ui.button('Postpone', { onClick: () => {
            const r = postpone.getBoundingClientRect();
            A.ui.menu([
              { header: 'Remind me in:' },
              ['10 minutes', 10], ['1 hour', 60], ['4 hours', 240],
            ].map((x) => (Array.isArray(x) ? { label: x[0], onClick: () => { scheduleNag(x[1] * 60000); A.notify({ title: 'Aerium Update', text: 'Okay! Aerium will remind you in ' + x[0] + '.', icon: 'icons/sync', sound: false }); } } : x)), r.left, r.bottom + 2);
          } });
          stateBox('warn', 'icons/sync', 'Your computer needs to restart to finish installing updates', 'Save your work first. Aerium will put everything back when it wakes up.', [
            A.ui.button('Restart now', { tone: 'aqua', onClick: () => { setUpd({ pending: 'restarting' }); A.boot.shutdown(true); } }), postpone]);
        } else if (!todo.length) {
          stateBox('good', 'icons/check', 'Aerium is up to date', 'There are no new updates available for your computer.', [A.ui.button('Check for updates', { size: 'sm', onClick: check })]);
        } else if (!u.lastCheck) {
          stateBox('warn', 'icons/sync', 'Check for updates for your computer', 'Always install the latest updates to keep the glass shiny and the fish safe.', [A.ui.button('Check for updates', { tone: 'aqua', onClick: check })]);
        } else {
          const picks = new Set(todo.map((x) => x.kb));
          const list = h('div.cp-upd-list', null, todo.map((x) => h('div.cp-upd-item', null,
            A.ui.checkbox({ label: x.name, checked: true, onChange: (v) => { v ? picks.add(x.kb) : picks.delete(x.kb); go.disabled = !picks.size; } }),
            h('div.cp-upd-desc', null, x.desc + ' Download size: ' + x.size + '.'))));
          const go = A.ui.button('Install updates', { tone: 'aqua', icon: 'icons/download', onClick: () => install(todo.filter((x) => picks.has(x.kb))) });
          stateBox('warn', 'icons/download', todo.length + ' important update' + (todo.length === 1 ? ' is' : 's are') + ' available', 'Install them now to get the newest bubbles.', [go], list);
        }
      }
      ctx.bus('store:security.updates', () => { if (!panel.classList.contains('cp-upd-busy')) render(); });
      render();
      if (ctx.params.check) ctx.timeout(check, 200);
      return h('div', null, K.head('Aerium Update', null), panel, info);
    },
  });
  function updateSettings(ctx) {
    let v = A.store.get('security.autoUpdate', true) ? 'auto' : 'never';
    const content = h('div.cp-dlg', null,
      h('p', null, 'Choose how Aerium can install updates:'),
      A.ui.radioGroup({ value: v, options: [['auto', 'Install updates automatically (recommended)'], ['never', 'Never check for updates (not recommended, and a little sad)']], onChange: (x) => { v = x; } }));
    A.ui.dialog({ parent: ctx.win, title: 'Change Settings', icon: 'icons/sync', content, width: 440, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] }).then((r) => {
      if (r === 'ok') A.store.set('security.autoUpdate', v === 'auto');
    });
  }
  K.page('cp:updates-installed', {
    title: 'Installed Updates', icon: 'icons/sync', parent: 'cp:programs',
    keywords: ['installed updates', 'update history', 'kb'],
    build(ctx) {
      const base = [
        { name: 'Aerium 7.0 Service Pack 1 (KB2007000)', program: 'Aerium', date: new Date(2007, 0, 30).getTime() },
        { name: 'Update for Aerium Media Player (KB2007010)', program: 'Aerium Media Player', date: new Date(2007, 2, 14).getTime() },
        { name: 'Security Update for Horizon Browser (KB2007020)', program: 'Horizon Browser', date: new Date(2007, 4, 8).getTime() },
        { name: 'Glossy Font Smoothing Update (KB2007030)', program: 'Aerium', date: new Date(2007, 6, 1).getTime() },
      ];
      const mine = updState().installed.map((x) => ({ name: x.name, program: 'Aerium', date: x.date }));
      const rows = mine.concat(base).sort((a, b) => b.date - a.date);
      return h('div', null,
        K.head('Uninstall an update', 'These updates keep Aerium shiny. Uninstalling them would make the fish sad, so the button is taking a nap.'),
        h('div.cp-table', { role: 'table' },
          h('div.cp-trow.cp-thead', { role: 'row' }, h('span', null, 'Name'), h('span', null, 'Program'), h('span', null, 'Installed On')),
          rows.map((r) => h('div.cp-trow', { role: 'row' }, h('span.cp-tname', null, A.img('icons/sync'), r.name), h('span', null, r.program), h('span', null, A.util.fmtDate(new Date(r.date)))))));
    },
  });

  // ============================================================ Programs and Features
  const PROGRAMS = [
    { id: 'mediaplayer', name: 'Aerium Media Player 11', publisher: 'Aerium Playground', date: '2007-01-30', size: 12.4, version: '11.0.2007', icon: 'icons/mediaplayer', system: true },
    { id: 'messenger', name: 'Bubble Messenger 2009', publisher: 'Aerium Playground', date: '2007-01-30', size: 28.1, version: '14.0.8050', icon: 'icons/chat', system: true },
    { id: 'browser', name: 'Horizon Browser 7', publisher: 'Aerium Playground', date: '2007-01-30', size: 19.6, version: '7.0.5730', icon: 'icons/globe', system: true },
    { id: 'aquarium', name: 'Aquarium Living Desktop', publisher: 'Glassfish Studios', date: '2007-01-30', size: 18.2, version: '2.1', icon: 'icons/aquarium', system: true, systemNote: 'The fish live here. Asking them to leave would be rude.' },
    { id: 'aquaglass', name: 'AquaGlass 256 MB Graphics Driver', publisher: 'AquaGlass Graphics', date: '2007-02-02', size: 46.0, version: '7.15.11.2007', icon: 'icons/monitor', system: true, systemNote: 'You need this to see the glass.' },
    { id: 'toolbar', name: 'Search Toolbar (installed without asking)', publisher: 'Toolbar Friends Inc.', date: '2007-06-13', size: 4.2, version: '6.6.6', icon: 'icons/search', kind: 'toolbar', note: 'It came bundled with a free screensaver. Nobody asked for it.' },
    { id: 'sparkle', name: 'Sparkle Cursors 2007 (Trial)', publisher: 'GlitterSoft', date: '2007-03-03', size: 3.1, version: '1.0 trial', icon: 'icons/star', note: 'The trial expired a very, very long time ago.' },
    { id: 'cleaner', name: 'Speedy PC Cleaner Pro', publisher: 'FastFix Labs', date: '2007-08-21', size: 15.9, version: '3.1', icon: 'icons/lightbulb', kind: 'cleaner', note: 'Claims to have found 1,337 problems. Every single time.' },
    { id: 'codec', name: 'Codec Pack Ultimate Mega Edition', publisher: 'Codec Heroes', date: '2007-05-17', size: 88.8, version: '9.99', icon: 'icons/video', note: 'Installed to play that one video. It worked!' },
    { id: 'weather', name: 'Dolphin Weather Buddy', publisher: 'Friendly Desktop Pets', date: '2007-04-01', size: 9.7, version: '2.0', icon: 'icons/dolphin', note: 'Tells the weather with a little dance.' },
    { id: 'fonts', name: 'Glossy Font Pack Deluxe (500 fonts)', publisher: 'FontCity', date: '2007-07-04', size: 120.5, version: '5.0', icon: 'icons/document', note: 'Includes 212 slightly different handwriting fonts.' },
    { id: 'burner', name: 'CD Burner Express 2', publisher: 'ShinyDisc Software', date: '2007-02-14', size: 21.3, version: '2.4', icon: 'icons/disc', note: 'Burns mix CDs. Please label them.' },
    { id: 'typing', name: 'Typing Tutor Deluxe', publisher: 'KeyQuest', date: '2007-09-01', size: 14.2, version: '4.2', icon: 'keyboard', note: 'You now type 12 words per minute. Nice.' },
    { id: 'encyclopedia', name: 'Encyclopedia Stellaris 2006 (disc 1 of 4)', publisher: 'Starlight Media', date: '2006-12-25', size: 640, version: '2006', icon: 'icons/globe', note: 'Please insert disc 2.' },
    { id: 'photoframe', name: 'Photo Frame Screen Saver Maker', publisher: 'Memory Lane Software', date: '2007-10-10', size: 6.4, version: '1.5', icon: 'icons/photo', note: 'Makes screensavers out of vacation photos.' },
  ];
  const fmtMB = (n) => (n >= 1000 ? (n / 1024).toFixed(2) + ' GB' : n.toFixed(n >= 100 ? 0 : 1) + ' MB');
  const isoDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  function celebrate(win, text) {
    const layer = h('div.cp-celebrate', { 'aria-hidden': 'true' });
    for (let i = 0; i < 28; i++) {
      layer.appendChild(h('span.cp-cbubble', { style: { left: (Math.random() * 96).toFixed(1) + '%', '--sz': (14 + Math.random() * 36).toFixed(0) + 'px', '--dur': (1.6 + Math.random() * 1.8).toFixed(2) + 's', '--dx': ((Math.random() - 0.5) * 80).toFixed(0) + 'px', animationDelay: (Math.random() * 0.9).toFixed(2) + 's' } }));
    }
    layer.appendChild(h('div.cp-celebrate-text', null, text || 'Hooray!'));
    win.body.appendChild(layer);
    A.sound.play('win');
    setTimeout(() => layer.remove(), 4200);
  }
  K.celebrate = celebrate;
  K.page('cp:programs', {
    title: 'Programs and Features', icon: 'icons/disc', parent: 'cat:programs',
    keywords: ['uninstall', 'remove', 'programs', 'software', 'toolbar', 'install', 'features', 'applications'],
    side: (ctx) => [
      { links: [homeLink] },
      { title: 'Tasks', links: [
        { label: 'View installed updates', target: 'cp:updates-installed' },
        { label: 'Turn Aerium features on or off', target: () => K.featuresDialog(ctx), icon: 'icons/shield' },
        { label: 'Get new programs online', target: JOKES.getPrograms }] },
      { title: 'See also', links: [{ label: 'Default Programs', target: 'cp:defaults' }, { label: 'Aerium Update', target: 'cp:update' }] },
    ],
    build(ctx) {
      let sortKey = 'name', sortDir = 1;
      let sel = ctx.params.select && programInstalled(ctx.params.select) ? ctx.params.select : null;
      let mode = A.store.get('programs.view', 'details');
      const listEl = h('div.cp-prog-list', { role: 'listbox', tabIndex: 0, 'aria-label': 'Installed programs' });
      const detailsEl = h('div.cp-prog-details');
      const tools = h('div.ae-toolbar.cp-prog-tools');
      const items = () => {
        const gone = A.store.get('programs.removed', []) || [];
        return PROGRAMS.filter((p) => !gone.includes(p.id)).sort((a, b) => {
          const va = a[sortKey], vb = b[sortKey];
          return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sortDir;
        });
      };
      function renderTools() {
        tools.innerHTML = '';
        const p = PROGRAMS.find((x) => x.id === sel);
        const tool = (label, fn, icon) => h('button.ae-tool', { type: 'button', onclick: fn }, icon ? A.img(K.ic(icon)) : null, label);
        tools.append(
          tool('Organize', (e) => { const r = e.currentTarget.getBoundingClientRect(); A.ui.menu([{ label: 'Sort by name', checked: sortKey === 'name', radio: true, onClick: () => sortBy('name') }, { label: 'Sort by publisher', checked: sortKey === 'publisher', radio: true, onClick: () => sortBy('publisher') }, { label: 'Sort by date', checked: sortKey === 'date', radio: true, onClick: () => sortBy('date') }, { label: 'Sort by size', checked: sortKey === 'size', radio: true, onClick: () => sortBy('size') }], r.left, r.bottom + 2); }),
          tool('Views', (e) => { const r = e.currentTarget.getBoundingClientRect(); A.ui.menu([{ label: 'Details', checked: mode === 'details', radio: true, onClick: () => setMode('details') }, { label: 'Tiles', checked: mode === 'tiles', radio: true, onClick: () => setMode('tiles') }], r.left, r.bottom + 2); }));
        if (p) {
          tools.append(h('span.ae-tool-sep'),
            tool(p.system ? 'Change' : 'Uninstall', () => (p.system ? repair(p, 'Change') : uninstall(p)), 'icons/disc'));
          if (!p.system) tools.append(tool('Change', () => repair(p, 'Change')));
          tools.append(tool('Repair', () => repair(p, 'Repair')));
        }
      }
      function renderList() {
        listEl.innerHTML = '';
        listEl.classList.toggle('tiles', mode === 'tiles');
        if (mode === 'details') {
          const head = (key, label) => h('button.cp-prog-hcell', { type: 'button', class: sortKey === key && (sortDir > 0 ? 'asc' : 'desc'), onclick: () => sortBy(key) }, label);
          listEl.appendChild(h('div.cp-prog-row.cp-prog-head', null, head('name', 'Name'), head('publisher', 'Publisher'), head('date', 'Installed On'), head('size', 'Size')));
        }
        items().forEach((p) => {
          const row = h('div.cp-prog-row', { role: 'option', 'aria-selected': String(p.id === sel), class: p.id === sel && 'selected', dataset: { id: p.id }, onclick: () => select(p.id), ondblclick: () => (p.system ? repair(p, 'Change') : uninstall(p)) },
            mode === 'details'
              ? [h('span.cp-prog-name', null, A.img(K.ic(p.icon)), h('span', null, p.name)), h('span', null, p.publisher), h('span', null, A.util.fmtDate(isoDate(p.date))), h('span.cp-num', null, fmtMB(p.size))]
              : [A.img(K.ic(p.icon), { class: 'cp-prog-tileicon' }), h('span.cp-prog-tiletext', null, h('b', null, p.name), h('span', null, p.publisher), h('span', null, fmtMB(p.size)))]);
          listEl.appendChild(row);
        });
      }
      function renderDetails() {
        detailsEl.innerHTML = '';
        const p = PROGRAMS.find((x) => x.id === sel);
        if (!p) {
          const all = items();
          detailsEl.append(A.img('icons/disc', { class: 'cp-prog-dicon' }), h('div', null, h('b', null, 'Currently installed programs'), h('div.cp-muted', null, all.length + ' programs installed, ' + fmtMB(all.reduce((a, x) => a + x.size, 0)) + ' total size')));
          return;
        }
        detailsEl.append(A.img(K.ic(p.icon), { class: 'cp-prog-dicon' }), h('div.cp-prog-dtext', null, h('b', null, p.name),
          h('div.cp-prog-dgrid', null, h('span.cp-muted', null, 'Publisher:'), h('span', null, p.publisher), h('span.cp-muted', null, 'Product version:'), h('span', null, p.version), h('span.cp-muted', null, 'Size:'), h('span', null, fmtMB(p.size)), h('span.cp-muted', null, 'Installed on:'), h('span', null, A.util.fmtDate(isoDate(p.date)))),
          p.note || p.systemNote ? h('div.cp-muted', null, p.note || p.systemNote) : null));
      }
      const renderAll = () => { renderTools(); renderList(); renderDetails(); };
      function select(id) { sel = id; renderAll(); }
      function sortBy(key) { if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; } A.sound.play('click'); renderList(); }
      function setMode(m) { mode = m; A.store.set('programs.view', m); renderList(); }
      async function repair(p, verb) {
        const ok = await K.progress({ parent: ctx.win, title: 'Programs and Features', icon: p.icon, instruction: (verb === 'Repair' ? 'Repairing ' : 'Configuring ') + p.name, steps: [{ text: 'Gathering required information...', ms: 900 }, { text: 'Checking every file twice...', ms: 1100 }, { text: 'Polishing the shiny parts...', ms: 900 }] });
        if (ok) A.ui.messageBox({ parent: ctx.win, title: 'Programs and Features', icon: 'success', instruction: p.name + ' was ' + (verb === 'Repair' ? 'repaired' : 'configured'), message: 'It works exactly as well as it did before. Maybe a tiny bit better.' });
      }
      async function remove(p, steps) {
        const ok = await K.progress({ parent: ctx.win, title: 'Programs and Features', icon: p.icon, instruction: 'Please wait while ' + p.name + ' is removed', steps });
        if (!ok) return false;
        const gone = A.store.get('programs.removed', []) || [];
        if (!gone.includes(p.id)) gone.push(p.id);
        A.store.set('programs.removed', gone);
        sel = null;
        if (ctx.alive) renderAll();
        return true;
      }
      async function uninstall(p) {
        if (p.system) {
          A.ui.messageBox({ parent: ctx.win, title: 'Programs and Features', icon: 'warning', instruction: p.name + ' can\'t be removed', message: 'It is part of Aerium. ' + (p.systemNote || 'It likes it here.') });
          return;
        }
        if (p.kind === 'toolbar') {
          const a = await A.ui.messageBox({ parent: ctx.win, title: 'Programs and Features', icon: 'question', instruction: 'Do you want to uninstall Search Toolbar?', message: 'Search Toolbar and all of its components will be removed from your computer.', buttons: [{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no', cancel: true }] });
          if (a !== 'yes') return;
          const b = await A.ui.messageBox({ parent: ctx.win, title: 'Search Toolbar', icon: 'icons/search', instruction: 'Wait! Are you sure you want to leave?', message: 'Search Toolbar makes searching up to 0% faster. You will miss out on exciting offers, such as more toolbars.', buttons: [{ label: 'Remove it', value: 'go', default: true }, { label: 'Keep Search Toolbar', value: 'keep', cancel: true }] });
          if (b !== 'go') { A.sound.play('ding'); return; }
          const done = await remove(p, [{ text: 'Removing the Search part...', ms: 1000 }, { text: 'Removing the Toolbar part...', ms: 1000 }, { text: 'Restoring your home page...', ms: 900 }, { text: 'Deleting 14 tracking cookies...', ms: 900 }, { text: 'Opening a window so it can\'t come back...', ms: 800 }]);
          if (!done) return;
          celebrate(ctx.win, 'Toolbar-free!');
          A.notify({ title: 'Search Toolbar was removed', text: 'Your browser can breathe again. Nice work!', icon: 'icons/check', sound: false });
          return;
        }
        if (p.kind === 'cleaner') {
          const a = await A.ui.messageBox({ parent: ctx.win, title: 'Speedy PC Cleaner Pro', icon: 'warning', instruction: 'WAIT! Speedy PC Cleaner Pro found 1,337 problems!', message: 'Uninstalling now could leave your computer slow, unprotected and a little bit sad!!!', buttons: [{ label: 'Uninstall anyway', value: 'go', default: true }, { label: 'Fix problems ($29.95)', value: 'fix' }, { label: 'Cancel', value: 'no', cancel: true }] });
          if (a === 'no' || a === -1) return;
          if (a === 'fix') await A.ui.messageBox({ parent: ctx.win, title: 'Programs and Features', icon: 'info', instruction: 'Nice try, Speedy PC Cleaner Pro', message: 'There were never any problems. Aerium will uninstall it now, free of charge.' });
          await remove(p, [{ text: 'Removing scary pop-ups...', ms: 1000 }, { text: 'Removing 1,337 imaginary problems...', ms: 1100 }, { text: 'Removing the fake progress bar...', ms: 900 }]);
          return;
        }
        const ok = await A.ui.messageBox({ parent: ctx.win, title: 'Programs and Features', icon: 'question', instruction: 'Are you sure you want to uninstall ' + p.name + '?', message: p.note || '', buttons: [{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no', cancel: true }] });
        if (ok !== 'yes') return;
        await remove(p, [{ text: 'Preparing to remove...', ms: 800 }, { text: 'Removing files...', ms: 1200 }, { text: 'Tidying up shortcuts...', ms: 700 }]);
      }
      listEl.addEventListener('keydown', (e) => {
        const list = items();
        const i = list.findIndex((p) => p.id === sel);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = list[clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, list.length - 1)]; if (n) select(n.id); }
        else if (e.key === 'Delete' && sel) { e.preventDefault(); uninstall(PROGRAMS.find((p) => p.id === sel)); }
        else if (e.key === 'Enter' && sel) { e.preventDefault(); const p = PROGRAMS.find((x) => x.id === sel); p.system ? repair(p, 'Change') : uninstall(p); }
      });
      renderAll();
      return {
        el: h('div', null, K.head('Uninstall or change a program', 'To uninstall a program, select it from the list and then click Uninstall, Change or Repair.'), h('div.cp-prog', null, tools, listEl, detailsEl)),
        onShow() { const s2 = listEl.querySelector('.selected'); if (s2) s2.scrollIntoView({ block: 'nearest' }); },
      };
    },
  });
  K.featuresDialog = function (ctx) {
    const feats = [
      ['Games', true], ['Aerium Aquarium', true], ['Bubble Messenger', true], ['Tablet PC Components', true], ['Indexing Service', false],
      ['Glass Transparency Accelerator', true], ['Telnet Client (just in case)', false], ['Screensaver Extravaganza Pack', true], ['Simple Bubble Services (echo, pop, etc.)', false],
    ];
    const content = h('div.cp-dlg', null,
      h('p', null, 'To turn a feature on, select its check box. To turn a feature off, clear its check box.'),
      h('div.cp-feature-list', null, feats.map(([n, on]) => A.ui.checkbox({ label: n, checked: on }))));
    A.ui.dialog({ parent: ctx.win, title: 'Aerium Features', icon: 'icons/shield', content, width: 420, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] }).then(async (r) => {
      if (r !== 'ok') return;
      const ok = await K.progress({ parent: ctx.win, title: 'Aerium Features', icon: 'icons/shield', instruction: 'Please wait while the features are configured', steps: [{ text: 'This might take several minutes...', ms: 1400 }, { text: 'Just kidding, it\'s almost done...', ms: 1200 }, { text: 'Finishing up...', ms: 800 }] });
      if (ok) A.ui.messageBox({ parent: ctx.win, title: 'Aerium Features', icon: 'success', instruction: 'The features were configured', message: 'Nothing actually changed, because Aerium keeps everything installed so nothing breaks. Doesn\'t it feel good, though?' });
    });
  };
  const STARTUP = [['messenger', 'Bubble Messenger', 'Signs you in so your friends see you right away.'], ['stickynotes', 'Sticky Notes', 'Puts your notes back on the desktop.'], ['mediaplayer', 'Aerium Media Player', 'Ready to play your favorite songs.']];
  K.startupPrograms = function (ctx) {
    const sel = K.obj('startup.apps', {});
    const content = h('div.cp-dlg', null,
      h('p', null, 'These programs start automatically when you log on to Aerium.'),
      h('div.cp-startup', null,
        A.ui.checkbox({ label: 'Welcome Center', checked: A.store.get('welcome.atStartup', true), onChange: (v) => A.store.set('welcome.atStartup', v) }),
        STARTUP.filter(([id]) => A.apps.get(id)).map(([id, name, desc]) => h('div', null, A.ui.checkbox({ label: name, checked: !!sel[id], onChange: (v) => { sel[id] = v; A.store.set('startup.apps', sel); } }), h('div.cp-fine', null, desc))),
        programInstalled('toolbar') ? h('div', null, A.ui.checkbox({ label: 'Search Toolbar Updater', checked: true, disabled: true }), h('div.cp-fine', null, 'Starts automatically, and nobody knows why. Uninstall Search Toolbar to get rid of it.')) : null));
    A.ui.dialog({ parent: ctx.win, title: 'Startup Programs', icon: 'icons/disc', content, width: 420, buttons: [{ label: 'Close', default: true, cancel: true }] });
  };

  // ============================================================ Default Programs
  const TYPES = [['txt', 'Text Document'], ['log', 'Log File'], ['ini', 'Configuration Settings'], ['md', 'Markdown Document'], ['png', 'PNG Image'], ['jpg', 'JPEG Image'], ['gif', 'GIF Image'], ['bmp', 'Bitmap Image'], ['svg', 'SVG Image'], ['mp3', 'MP3 Audio File'], ['wma', 'Aerium Media Audio File'], ['wav', 'Wave Sound'], ['wmv', 'Aerium Media Video File'], ['mp4', 'MP4 Video'], ['htm', 'HTML Document'], ['html', 'HTML Document'], ['url', 'Internet Shortcut']];
  K.page('cp:defaults', {
    title: 'Default Programs', icon: 'icons/check', parent: 'cat:programs',
    keywords: ['default programs', 'file types', 'associations', 'open with', 'extensions'],
    build(ctx) {
      const rows = TYPES.map(([ext, desc]) => {
        const id = A.apps.appForExt(ext);
        const app = id && A.apps.get(id);
        return h('div.cp-trow', { role: 'row', ondblclick: () => K.joke(ctx.win, { title: 'Set Associations', icon: app ? app.icon : 'icons/document', instruction: app ? app.name + ' opens .' + ext + ' files' : 'No program opens .' + ext + ' files yet', message: app ? 'They have been together for a long time. Aerium doesn\'t want to split them up.' : 'A program that understands these files will claim them when it is installed.' }) },
          h('span.cp-tname', null, A.img(app ? app.icon : 'icons/document'), '.' + ext), h('span', null, desc), h('span', null, app ? app.name : 'Unknown application'));
      });
      return h('div', null,
        K.head('Associate a file type with a program', 'These are the programs Aerium uses to open each kind of file. Double-click a file type to learn more.'),
        h('div.cp-table', { role: 'table' }, h('div.cp-trow.cp-thead', { role: 'row' }, h('span', null, 'Name'), h('span', null, 'Description'), h('span', null, 'Current Default')), rows));
    },
  });

  // ============================================================ User Accounts
  const AVATARS = ['fish', 'flower', 'butterfly', 'dolphin', 'sun', 'globe', 'leaf', 'music'].map((n) => 'avatars/avatar-' + n);
  const framedPic = (src, size = 96) => h('span.fa-avatar.fa-avatar-framed.cp-user-pic', { style: { '--size': size + 'px' } }, h('img', { src: A.asset(src), alt: '' }));
  K.framedPic = framedPic;
  K.AVATARS = AVATARS;
  // Turns a picture file into something small enough to keep as a user picture.
  async function pictureFromFile(path) {
    const data = String(A.fs.read(path) || '');
    if (data.startsWith('asset:')) return data.slice(6);
    const src = A.fs.thumbFor(path);
    if (!src) return null;
    try {
      const im = await A.util.loadImage(src);
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const g = c.getContext('2d');
      const side = Math.min(im.naturalWidth || im.width, im.naturalHeight || im.height);
      g.drawImage(im, ((im.naturalWidth || im.width) - side) / 2, ((im.naturalHeight || im.height) - side) / 2, side, side, 0, 0, 96, 96);
      return c.toDataURL('image/png');
    } catch (e) { return null; }
  }
  K.page('cp:users', {
    title: 'User Accounts', icon: 'icons/users', parent: 'cat:users',
    keywords: ['user', 'account', 'picture', 'name', 'password', 'avatar', 'profile', 'rename'],
    side: (ctx) => [
      { links: [homeLink] },
      { title: 'Tasks', links: [
        { label: 'Create a password reset disk', target: () => K.joke(ctx.win, { title: 'Forgotten Password Wizard', icon: 'icons/disc', instruction: 'You don\'t need one', message: 'Aerium has no password to forget. That\'s the easiest reset disk ever.' }) },
        { label: 'Manage your network passwords', target: () => K.joke(ctx.win, { title: 'Stored User Names and Passwords', icon: 'icons/key', instruction: 'No passwords are stored', message: 'Aerium keeps no passwords at all. The fish have terrible memories anyway.' }) }] },
      { title: 'See also', links: [{ label: 'Parental Controls', target: JOKES.parental }, { label: 'Welcome Center', target: { app: 'welcome' } }] },
    ],
    build(ctx) {
      ctx.bus('store:user.name', ctx.invalidate);
      ctx.bus('store:user.avatar', ctx.invalidate);
      const links = [
        ['Create a password for your account', 'cp:users-password', 'icons/key'],
        ['Change your picture', 'cp:users-picture', 'icons/photo'],
        ['Change your account name', 'cp:users-name', 'icons/user'],
        ['Change your account type', () => K.joke(ctx.win, { title: 'User Accounts', icon: 'icons/shield', instruction: 'You are an administrator', message: 'You are in charge of the glass color, the wallpaper, the fish, everything. Use your powers for good.' }), 'icons/shield'],
      ];
      return h('div', null,
        K.head('Make changes to your user account'),
        h('div.cp-user-card', null, framedPic(K.sys.avatar, 96), h('div.cp-user-info', null, h('div.cp-user-name', null, K.sys.userName), h('div.cp-muted', null, 'Administrator'), h('div.cp-muted', null, 'No password. The door is always open.'))),
        h('div.cp-link-list', null, links.map(([l, t, ic]) => K.link(l, () => K.open(t, ctx), { icon: ic }))),
        h('div.cp-section-gap'),
        K.section('Other accounts', h('div.cp-link-list', null,
          K.link('Manage another account', () => JOKES.accounts(ctx), { icon: 'icons/users' }),
          K.link('Change User Account Control settings', () => JOKES.uac(ctx), { icon: 'icons/shield' }))));
    },
  });
  K.page('cp:users-picture', {
    title: 'Change Your Picture', icon: 'icons/photo', parent: 'cp:users', side: false,
    keywords: ['picture', 'avatar', 'photo', 'user picture'],
    build(ctx) {
      let picked = K.sys.avatar;
      const preview = framedPic(picked, 96);
      const previewImg = preview.querySelector('img');
      const grid = h('div.cp-avatars', { role: 'listbox', 'aria-label': 'Pictures' });
      const pick = (src, btn) => {
        picked = src;
        grid.querySelectorAll('.cp-avatar').forEach((x) => { x.classList.toggle('picked', x === btn); x.setAttribute('aria-selected', String(x === btn)); });
        previewImg.src = A.asset(src);
        A.sound.play('hover');
      };
      const tile = (src, label) => {
        const b = h('button.cp-avatar', { type: 'button', role: 'option', class: src === picked && 'picked', 'aria-selected': String(src === picked), 'aria-label': label, 'data-tip': label }, h('img', { src: A.asset(src), alt: '' }));
        b.addEventListener('click', () => pick(src, b));
        b.addEventListener('dblclick', save);
        return b;
      };
      AVATARS.forEach((a) => grid.appendChild(tile(a, a.replace('avatars/avatar-', '').replace(/^./, (c) => c.toUpperCase()))));
      if (!AVATARS.includes(picked)) grid.appendChild(tile(picked, 'Your picture'));
      async function browse() {
        const p = await A.ui.fileDialog({ mode: 'open', parent: ctx.win, title: 'Open', folder: '/Pictures/Sample Pictures', exts: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'], filterLabel: 'Pictures (*.png; *.jpg; *.gif; *.bmp)' });
        if (!p || !ctx.alive) return;
        const src = await pictureFromFile(p);
        if (!src) { A.ui.messageBox({ parent: ctx.win, title: 'User Accounts', icon: 'warning', message: 'Aerium couldn\'t use that file as a picture.' }); return; }
        const b = tile(src, A.fs.basename(p));
        grid.appendChild(b);
        pick(src, b);
      }
      function save() { A.store.set('user.avatar', picked); A.sound.play('select'); ctx.up(); }
      return h('div', null,
        K.head('Choose a new picture for your account', 'Your picture appears on the Welcome screen, the Start menu and in the Welcome Center.'),
        h('div.cp-user-card', null, preview, h('div.cp-user-info', null, h('div.cp-user-name', null, K.sys.userName), h('div.cp-muted', null, 'Administrator'))),
        grid,
        h('div', null, K.link('Browse for more pictures...', browse, { icon: 'icons/folder-pictures' })),
        K.footer(h('span.cp-footer-space'), A.ui.button('Change Picture', { tone: 'aqua', onClick: save }), A.ui.button('Cancel', { onClick: () => ctx.up() })));
    },
  });
  K.page('cp:users-name', {
    title: 'Rename Account', icon: 'icons/user', parent: 'cp:users', side: false,
    keywords: ['rename', 'user name', 'account name'],
    build(ctx) {
      const hint = h('div.cp-field-hint');
      const field = A.ui.textField({ label: 'New account name', value: K.sys.userName, maxLength: 24, onEnter: () => save() });
      field.classList.add('cp-name-field');
      function save() {
        const v = field.input.value.trim();
        if (!v) { hint.textContent = 'Type a name first. Even "Captain Bubbles" works.'; A.sound.play('ding'); field.input.focus(); return; }
        A.store.set('user.name', v);
        A.sound.play('select');
        ctx.up();
      }
      return {
        el: h('div', null,
          K.head('Type a new account name for ' + K.sys.userName, 'This name will appear on the Welcome screen, the Start menu and the desktop.'),
          h('div.cp-user-card', null, framedPic(K.sys.avatar, 72), h('div.cp-user-info', null, field, hint)),
          K.footer(h('span.cp-footer-space'), A.ui.button('Change Name', { tone: 'aqua', onClick: save }), A.ui.button('Cancel', { onClick: () => ctx.up() }))),
        onShow() { field.input.focus(); field.input.select(); },
      };
    },
  });
  K.page('cp:users-password', {
    title: 'Create Your Password', icon: 'icons/key', parent: 'cp:users', side: false,
    keywords: ['password', 'security', 'lock'],
    build(ctx) {
      const p1 = A.ui.textField({ label: 'New password', type: 'password' });
      const p2 = A.ui.textField({ label: 'Confirm new password', type: 'password' });
      const hint = A.ui.textField({ label: 'Type a password hint', help: 'The password hint will be visible to everyone who uses this computer.' });
      [p1, p2].forEach((f) => f.input.setAttribute('autocomplete', 'new-password'));
      hint.input.setAttribute('autocomplete', 'off');
      const msg = h('div.cp-pw-msg');
      function create() {
        const a = p1.input.value, b = p2.input.value;
        [p1, p2, hint].forEach((f) => { f.input.value = ''; });
        msg.innerHTML = '';
        if (!a && !b) { msg.appendChild(K.note('Type a password first. Or don\'t! Aerium is happy either way.', 'info')); A.sound.play('ding'); return; }
        if (a !== b) { msg.appendChild(K.note('Those two didn\'t match. That\'s okay, Aerium wasn\'t going to keep it anyway.', 'warning')); A.sound.play('exclamation'); return; }
        msg.appendChild(K.note('Aerium didn\'t save your password, and it never will. This computer is a playground, so the door stays open and your secrets stay with the fish.', 'success', 'icons/lock'));
        A.sound.play('lock');
      }
      return {
        el: h('div', null,
          K.head('Create a password for your account', 'You are creating a password for ' + K.sys.userName + '.'),
          h('div.cp-user-card', null, framedPic(K.sys.avatar, 72), h('div.cp-pw-fields', null, p1, p2, hint)),
          msg,
          K.footer(h('span.cp-footer-space'), A.ui.button('Create password', { tone: 'aqua', onClick: create }), A.ui.button('Cancel', { onClick: () => { [p1, p2, hint].forEach((f) => { f.input.value = ''; }); ctx.up(); } }))),
        onShow() { p1.input.focus(); },
        onLeave() { [p1, p2, hint].forEach((f) => { f.input.value = ''; }); },
      };
    },
  });

  // ============================================================ Ease of Access
  function narrate(ctx, text) {
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) {
      K.joke(ctx.win, { title: 'Narrator', icon: 'icons/chat', instruction: 'Narrator needs a voice', message: 'This browser can\'t speak, so Narrator is reading quietly to itself instead.' });
      return;
    }
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1.05;
      synth.speak(u);
      ctx.cleanup(() => synth.cancel());
    } catch (e) { /* speech is a bonus */ }
  }
  function magnifierToy(ctx) {
    let zoom = 2;
    const sample = h('div.cp-mag-sample', null,
      h('div.cp-mag-title', null, 'Can you read the small print?'),
      h('p', null, 'Move your pointer over this panel and the glass lens makes everything bigger. Fish, clouds and tiny words all look better up close.'),
      h('div.cp-mag-icons', null, ['icons/fish', 'icons/bubble', 'icons/flower', 'icons/butterfly', 'icons/sun', 'icons/dolphin'].map((k) => A.img(k))),
      h('p.cp-mag-tiny', null, 'Psst. This sentence is very small on purpose. The fish wrote it. They say hello, and they would like more food.'));
    const inner = h('div.cp-mag-inner');
    const lens = h('div.cp-mag-lens', null, inner, h('i.cp-mag-shine'));
    const panel = h('div.cp-mag-panel', { 'aria-label': 'Magnifier practice area' }, sample, lens);
    let cloned = false;
    const L = 140;
    panel.addEventListener('pointermove', (e) => {
      if (!cloned) { inner.innerHTML = ''; const c = sample.cloneNode(true); c.style.width = sample.offsetWidth + 'px'; inner.appendChild(c); cloned = true; }
      const r = panel.getBoundingClientRect();
      const sr = sample.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const sx = e.clientX - sr.left, sy = e.clientY - sr.top;
      lens.classList.add('on');
      lens.style.transform = `translate(${x - L / 2}px, ${y - L / 2}px)`;
      inner.style.transform = `translate(${L / 2 - sx * zoom}px, ${L / 2 - sy * zoom}px) scale(${zoom})`;
    });
    panel.addEventListener('pointerleave', () => lens.classList.remove('on'));
    const zoomSel = A.ui.select({ options: [['1.5', '150%'], ['2', '200%'], ['3', '300%'], ['4', '400%']], value: '2', label: 'Zoom', onChange: (v) => { zoom = Number(v); } });
    const wrap = h('div.cp-mag', null, h('div.cp-row', null, h('span.cp-muted', null, 'Zoom:'), zoomSel, h('span.cp-fine', null, 'The lens follows your pointer inside the panel.')), panel);
    wrap.flash = () => { panel.classList.remove('cp-flash'); void panel.offsetWidth; panel.classList.add('cp-flash'); panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    return wrap;
  }
  function oskToy() {
    const box = h('textarea.ae-input.cp-osk-box', { rows: 2, placeholder: 'Click the keys to type here', spellcheck: false, 'aria-label': 'Practice text' });
    let shift = false;
    const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const keys = h('div.cp-osk-keys');
    const put = (ch) => { box.setRangeText(ch, box.selectionStart, box.selectionEnd, 'end'); A.sound.play('type'); };
    const key = (label, fn, cls) => h('button.cp-osk-key', { type: 'button', class: cls, onpointerdown: (e) => e.preventDefault(), onclick: fn }, label);
    const render = () => {
      keys.innerHTML = '';
      rows.forEach((r, i) => keys.appendChild(h('div.cp-osk-row', null,
        i === 2 ? key('Shift', () => { shift = !shift; render(); }, 'wide' + (shift ? ' on' : '')) : null,
        r.split('').map((c) => key(shift ? c.toUpperCase() : c, () => { put(shift ? c.toUpperCase() : c); if (shift) { shift = false; render(); } })),
        i === 0 ? key('Bksp', () => { const s0 = box.selectionStart; if (box.selectionEnd > s0) box.setRangeText('', s0, box.selectionEnd, 'end'); else if (s0 > 0) box.setRangeText('', s0 - 1, s0, 'end'); A.sound.play('type'); }, 'wide') : null)));
      keys.appendChild(h('div.cp-osk-row', null, key('Space', () => put(' '), 'space'), key('.', () => put('.'))));
    };
    render();
    return h('div.cp-osk', null, box, keys);
  }
  K.page('cp:access', {
    title: 'Ease of Access Center', icon: 'access', parent: 'cat:access',
    keywords: ['accessibility', 'ease of access', 'large text', 'magnifier', 'narrator', 'focus', 'contrast', 'motion', 'animations', 'bigger', 'keyboard'],
    side: (ctx) => [
      { links: [homeLink, { label: 'Change text size', target: 'pz:display' }, { label: 'Change mouse pointers', target: 'cp:mouse' }] },
      { title: 'See also', links: [{ label: 'Personalization', target: 'pz:home' }, { label: 'Help and Support', target: { app: 'help' } }] },
    ],
    build(ctx) {
      ['a11y.largeText', 'a11y.focus', 'a11y.motion', 'cursor.scheme', 'cursor.trails'].forEach((k) => ctx.bus('store:' + k, () => sync()));
      const mag = magnifierToy(ctx);
      const osk = oskToy();
      osk.hidden = true;
      const tool = (icon, label, fn) => h('button.cp-quick', { type: 'button', onclick: fn }, A.img(K.ic(icon)), h('span', null, label));
      const large = storeCheck('a11y.largeText', 'Turn on large text');
      const focus = storeCheck('a11y.focus', 'Make the focus rectangle thicker and brighter');
      const motion = storeCheck('a11y.motion', 'Turn off all unnecessary animations');
      const bigPointer = A.ui.checkbox({ label: 'Make the mouse pointer larger', checked: A.store.get('cursor.scheme') === 'aerium-large', onChange: (v) => { A.store.set('cursor.scheme', v ? 'aerium-large' : 'aerium'); A.theme.applyCursor(); A.sound.play('click'); } });
      const trails = storeCheck('cursor.trails', 'Display pointer trails');
      function sync() {
        large.checked = !!A.store.get('a11y.largeText', false);
        focus.checked = !!A.store.get('a11y.focus', false);
        motion.checked = !!A.store.get('a11y.motion', false);
        bigPointer.checked = A.store.get('cursor.scheme') === 'aerium-large';
        trails.checked = !!A.store.get('cursor.trails');
      }
      const quick = h('div.cp-quickbox', null,
        h('div.cp-quick-title', null, 'Quick access to common tools'),
        h('div.cp-quick-sub', null, 'Try one of these tools to get started.'),
        h('div.cp-quick-grid', null,
          tool('icons/search', 'Start Magnifier', () => { mag.flash(); A.sound.play('select'); }),
          tool('icons/chat', 'Start Narrator', () => narrate(ctx, 'Narrator is on. You are in the Ease of Access Center. Here you can turn on large text, thicker focus rectangles and pointer trails, or try the magnifier. The fish say hello.')),
          tool('keyboard', 'Start On-Screen Keyboard', () => { osk.hidden = !osk.hidden; A.sound.play(osk.hidden ? 'back' : 'select'); if (!osk.hidden) osk.scrollIntoView({ behavior: 'smooth', block: 'center' }); }),
          tool('icons/moon', 'Set up High Contrast', () => A.ui.messageBox({ parent: ctx.win, title: 'High Contrast', icon: 'icons/moon', instruction: 'Would you like a darker look?', message: 'Aerium Night uses smoked glass and navy skies, which many people find easier on the eyes.', buttons: [{ label: 'Switch to Aerium Night', value: 'dark', default: true }, { label: 'Not now', value: 'no', cancel: true }] }).then((v) => { if (v === 'dark') A.theme.set('dark'); }))),
        osk);
      return h('div', null,
        K.head('Make your computer easier to use', 'Turn on the options you like. Each one works right away and is remembered for next time.'),
        quick,
        K.section('Make the computer easier to see', h('div.cp-checks', null, large, focus, motion)),
        K.section('Make the mouse easier to use', h('div.cp-checks', null, bigPointer, trails, K.link('More mouse settings', () => ctx.go('cp:mouse')))),
        K.section('Toy magnifier', mag));
    },
  });

  // ============================================================ aliases into other apps' pages
  K.page('cp:sound', { alias: 'pz:sounds', parent: 'cat:hardware', title: 'Sound' });
  K.page('cp:mouse', { alias: 'pz:mouse', parent: 'cat:hardware', title: 'Mouse' });
  K.page('cp:system', { alias: 'sy:system', parent: 'cat:system' });

  // ============================================================ always-on behaviors
  // Accessibility classes on the document element.
  function applyA11y() {
    const root = document.documentElement;
    root.classList.toggle('ae-large-text', !!A.store.get('a11y.largeText', false));
    root.classList.toggle('cp-high-focus', !!A.store.get('a11y.focus', false));
    root.classList.toggle('cp-reduce-motion', !!A.store.get('a11y.motion', false));
  }
  applyA11y();
  ['a11y.largeText', 'a11y.focus', 'a11y.motion'].forEach((k) => A.store.on(k, applyA11y));

  // Screen brightness (a soft dimming layer) follows the power plan.
  let dimEl = null;
  function setBrightness(pct) {
    pct = clamp(Math.round(Number(pct) || 100), 30, 100);
    if (pct >= 100) { if (dimEl) { dimEl.remove(); dimEl = null; } return; }
    if (!dimEl) { dimEl = h('div.cp-dim', { 'aria-hidden': 'true' }); document.body.appendChild(dimEl); }
    dimEl.style.opacity = (((100 - pct) / 100) * 0.9).toFixed(3);
  }
  const applyBrightness = () => setBrightness(planSettings(currentPlan()).brightness);
  applyBrightness();
  A.store.on('power.plan', applyBrightness);
  A.store.on('power.plans', applyBrightness);

  // Power plans: turn the display off, then sleep, after the chosen idle time.
  (function idleWatcher() {
    let last = Date.now();
    let off = null;
    const poke = () => { last = Date.now(); };
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, poke, { passive: true, capture: true }));
    const WAKE = ['pointermove', 'pointerdown', 'keydown', 'wheel'];
    function wakeDisplay() {
      if (!off) return;
      const o = off;
      off = null;
      WAKE.forEach((ev) => window.removeEventListener(ev, o.wake, true));
      o.el.classList.remove('on');
      setTimeout(() => o.el.remove(), 450);
      if (!A.screensaver.active) A.theme.resume();
      last = Date.now();
    }
    function displayOff() {
      if (off) return;
      if (A.screensaver.active) A.screensaver.stop();
      const el = h('div.cp-display-off', { 'aria-hidden': 'true' });
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
      setTimeout(() => A.theme.pause(), 400);
      const started = performance.now();
      let origin = null;
      const wake = (e) => {
        if (performance.now() - started < 900) return;
        if (e.type === 'pointermove') {
          if (!origin) { origin = [e.clientX, e.clientY]; return; }
          if (Math.hypot(e.clientX - origin[0], e.clientY - origin[1]) < 10) return;
        }
        wakeDisplay();
      };
      off = { el, wake };
      WAKE.forEach((ev) => window.addEventListener(ev, wake, true));
    }
    setInterval(() => {
      if (!A.shellReady || (A.boot && A.boot.onScreen && A.boot.onScreen())) { last = Date.now(); return; }
      if (A.wm.windows.some((w) => w.ctrl && w.ctrl.keepAwake && w.ctrl.keepAwake())) { last = Date.now(); return; }
      const plan = planSettings(currentPlan());
      const idle = (Date.now() - last) / 60000;
      if (plan.sleep && idle >= plan.sleep) {
        wakeDisplay();
        if (A.screensaver.active) A.screensaver.stop();
        last = Date.now();
        A.boot.sleep();
      } else if (plan.display && idle >= plan.display) displayOff();
    }, 5000);
  })();

  // After logon: finish updates, remind about the firewall, start startup programs.
  A.bus.on('shell:start', () => {
    const u = updState();
    if (u.pending === 'restarting') {
      const now = Date.now();
      setUpd({ pending: null, lastInstall: now, installed: u.installed.concat(notInstalled().map((x) => ({ kb: x.kb, name: x.name, date: now }))) });
      setTimeout(() => A.notify({ title: 'Aerium Update', text: 'Your computer is up to date. The updates were installed successfully.', icon: 'icons/sync' }), 5000);
    } else if (u.pending === 'restart') scheduleNag(40000);
    if (!A.store.get('security.firewall', true)) setTimeout(firewallBalloon, 12000);
    const start = K.obj('startup.apps', {});
    let delay = 2400;
    STARTUP.forEach(([id]) => {
      if (!start[id] || !A.apps.get(id)) return;
      setTimeout(() => { if (A.shellReady && !A.wm.byApp(id).length) A.apps.launch(id); }, delay);
      delay += 700;
    });
  });

  // ============================================================ app
  const PAGE_MAP = {
    network: 'cp:network', power: 'cp:power', datetime: 'cp:datetime', security: 'cp:security', programs: 'cp:programs',
    users: 'cp:users', accessibility: 'cp:access', access: 'cp:access', sound: 'cp:sound', sounds: 'cp:sound', mouse: 'cp:mouse',
    system: 'cp:system', defender: 'cp:defender', update: 'cp:update', updates: 'cp:update', home: 'cp:home', defaults: 'cp:defaults',
    display: 'pz:display', personalize: 'pz:home', personalization: 'pz:home', performance: 'sy:wei',
  };
  const mapPage = (p) => (!p ? 'cp:home' : PAGE_MAP[p] || (K.pages.has(p) ? p : 'cp:home'));

  A.apps.register({
    id: 'controlpanel',
    name: 'Control Panel',
    icon: 'icons/settings',
    color: '#5aa9e6',
    category: 'settings',
    description: 'Change settings and customize how your computer looks and works.',
    keywords: ['settings', 'control', 'options', 'preferences', 'network', 'power', 'security', 'programs', 'uninstall', 'users', 'time', 'date', 'accessibility'],
    single: true,
    window: { width: 880, height: 610, minWidth: 560, minHeight: 380, glassBody: true },
    launch(win, args) {
      const frame = K.frame(win, { start: mapPage(args && args.page), params: args && args.q ? { q: args.q } : null });
      return {
        onArgs(a) { if (a && a.page) frame.go(mapPage(a.page)); },
        onClose() { frame.destroy(); },
      };
    },
  });
})();
