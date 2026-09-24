/* Aerium taskbar: the glass start orb, pinned and running app buttons with
   a color glow that follows the cursor, live window thumbnails, jump lists,
   the notification area, the clock and Show Desktop. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, s } = A.util;

  const taskbar = { buttons: new Map(), tray: new Map() };
  let bar, appsEl, trayEl, clockEl;

  // ------------------------------------------------------------ glyphs
  function glyph(name) {
    const paths = {
      volume: [s('path', { d: 'M3 7h3l4-3.5v11L6 11H3z', fill: 'currentColor' }), s('path', { d: 'M12.5 5.5c1.3 1.1 1.3 3.9 0 5M14.5 3.5c2.4 2.2 2.4 6.8 0 9', stroke: 'currentColor', 'stroke-width': 1.4, fill: 'none', 'stroke-linecap': 'round' })],
      mute: [s('path', { d: 'M3 7h3l4-3.5v11L6 11H3z', fill: 'currentColor' }), s('path', { d: 'M12 6l4 4M16 6l-4 4', stroke: '#ff6a55', 'stroke-width': 1.8, 'stroke-linecap': 'round' })],
      network: [0, 1, 2, 3].map((i) => s('rect', { x: 2 + i * 3.6, y: 12 - i * 3, width: 2.6, height: 3 + i * 3, rx: 0.6, fill: 'currentColor' })),
      battery: [s('rect', { x: 1.5, y: 5, width: 12, height: 7, rx: 1.4, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.3 }), s('rect', { x: 14, y: 7, width: 1.8, height: 3, rx: 0.5, fill: 'currentColor' }), s('rect', { x: 3, y: 6.5, width: 9, height: 4, rx: 0.6, fill: '#6ee06a' })],
      flag: [s('path', { d: 'M4 2v13', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round' }), s('path', { d: 'M4.5 3c3-1.4 5 1.4 9 0v6c-4 1.4-6-1.4-9 0z', fill: '#57c3ff', stroke: 'currentColor', 'stroke-width': 0.8 })],
      flip: [s('rect', { x: 6, y: 2, width: 9, height: 7, rx: 1, fill: 'currentColor', opacity: 0.45 }), s('rect', { x: 3.5, y: 4.5, width: 9, height: 7, rx: 1, fill: 'currentColor', opacity: 0.7 }), s('rect', { x: 1, y: 7, width: 9, height: 7, rx: 1, fill: 'currentColor' })],
      up: [s('path', { d: 'M4 10l4-4 4 4', stroke: 'currentColor', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })],
    };
    return s('svg', { viewBox: '0 0 17 16', width: 17, height: 16, class: 'tb-glyph', 'aria-hidden': 'true' }, paths[name] || []);
  }

  // ------------------------------------------------------------ app buttons
  function appIds() {
    const pinned = A.store.get('taskbar.pinned') || [];
    const running = [];
    A.wm.windows.forEach((w) => { if (w.taskbar && w.app && !pinned.includes(w.app) && !running.includes(w.app)) running.push(w.app); });
    return pinned.filter((id) => A.apps.get(id)).concat(running);
  }

  function renderButtons() {
    const ids = appIds();
    // Remove stale buttons
    for (const [id, b] of taskbar.buttons) if (!ids.includes(id)) { b.el.remove(); taskbar.buttons.delete(id); }
    ids.forEach((id, i) => {
      let b = taskbar.buttons.get(id);
      if (!b) { b = makeButton(id); taskbar.buttons.set(id, b); }
      if (appsEl.children[i] !== b.el) appsEl.insertBefore(b.el, appsEl.children[i] || null);
      const wins = A.wm.byApp(id).filter((w) => w.taskbar);
      b.el.classList.toggle('running', wins.length > 0);
      b.el.classList.toggle('multi', wins.length > 1);
      b.el.classList.toggle('active', wins.some((w) => w === A.wm.active && w.state !== 'minimized'));
      b.el.classList.toggle('flashing', wins.some((w) => w.flashing));
      const app = A.apps.get(id);
      b.el.setAttribute('data-tip', wins.length === 1 ? wins[0].title : app ? app.name : id);
    });
  }

  function makeButton(id) {
    const app = A.apps.get(id) || { name: id, icon: 'icons/aerium', color: '#3aa6f5' };
    const el = h('button.tb-app', { type: 'button', 'aria-label': app.name, style: { '--gc': app.color || '#3aa6f5' } }, A.img(app.icon), h('span.tb-app-glow'));
    const b = { el, id };
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--gx', (e.clientX - r.left) + 'px');
    });
    el.addEventListener('click', () => clickApp(id));
    el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); A.apps.launch(id); } });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); jumpList(id, el); });
    let hoverT = null;
    el.addEventListener('pointerenter', () => { hoverT = setTimeout(() => showThumbs(id, el), 420); });
    el.addEventListener('pointerleave', () => { clearTimeout(hoverT); scheduleHideThumbs(); });
    el.addEventListener('pointerdown', () => { clearTimeout(hoverT); hideThumbs(true); });
    return b;
  }

  function clickApp(id) {
    const wins = A.wm.byApp(id).filter((w) => w.taskbar);
    if (!wins.length) { A.apps.launch(id); return; }
    if (wins.length === 1) {
      const w = wins[0];
      if (w === A.wm.active && w.state !== 'minimized') w.minimize();
      else if (w.state === 'minimized') w.restore();
      else w.focus();
      return;
    }
    // Several windows: cycle through them
    const sorted = wins.slice().sort((a, b) => (parseInt(b.el.style.zIndex, 10) || 0) - (parseInt(a.el.style.zIndex, 10) || 0));
    const activeIdx = sorted.indexOf(A.wm.active);
    const next = activeIdx >= 0 ? sorted[(activeIdx + 1) % sorted.length] : sorted[0];
    next.state === 'minimized' ? next.restore() : next.focus();
  }

  function jumpList(id, el) {
    const app = A.apps.get(id);
    if (!app) return;
    const wins = A.wm.byApp(id).filter((w) => w.taskbar);
    const pinned = A.store.get('taskbar.pinned') || [];
    const items = [];
    const recent = (A.store.get('recent.files') || []).filter((p) => A.fs.exists(p) && (app.fileTypes || []).includes(A.fs.ext(p))).slice(0, 6);
    if (recent.length) {
      items.push({ header: 'Recent' });
      recent.forEach((p) => items.push({ label: A.fs.basename(p), icon: A.fs.iconFor(p), onClick: () => A.apps.launch(id, { path: p }) }));
      items.push({ separator: true });
    }
    if (app.tasks) { items.push({ header: 'Tasks' }); app.tasks.forEach((t) => items.push({ label: t.label, icon: t.icon, onClick: t.onClick })); items.push({ separator: true }); }
    items.push({ label: app.name, icon: app.icon, onClick: () => A.apps.launch(id) });
    items.push(pinned.includes(id)
      ? { label: 'Unpin this program from taskbar', onClick: () => { A.store.set('taskbar.pinned', pinned.filter((p) => p !== id)); renderButtons(); } }
      : { label: 'Pin this program to taskbar', onClick: () => { A.store.set('taskbar.pinned', pinned.concat(id)); renderButtons(); } });
    if (wins.length) items.push({ label: wins.length > 1 ? 'Close all windows' : 'Close window', onClick: () => wins.forEach((w) => w.close()) });
    const r = el.getBoundingClientRect();
    A.ui.menu(items, r.left, r.top, { anchorTop: r.top - 2, className: 'tb-jumplist' });
  }

  taskbar.buttonRect = function (win) {
    const b = taskbar.buttons.get(win.app);
    return b ? b.el.getBoundingClientRect() : null;
  };

  // ------------------------------------------------------------ thumbnails & peek
  let thumbs = null, thumbsFor = null, hideT = null;
  function makeThumb(w) {
    const box = h('div.tb-thumb-img');
    const src = w.el;
    const W = src.offsetWidth || w.rect.w, H = src.offsetHeight || w.rect.h;
    const scale = Math.min(190 / W, 110 / H);
    try {
      const clone = src.cloneNode(true);
      clone.classList.remove('active');
      clone.removeAttribute('data-win');
      Object.assign(clone.style, { left: '0', top: '0', transform: `scale(${scale})`, transformOrigin: '0 0', width: W + 'px', height: H + 'px', display: '', zIndex: 1, position: 'absolute', pointerEvents: 'none', animation: 'none' });
      clone.querySelectorAll('iframe, video, audio, script').forEach((n) => n.remove());
      const srcCanvases = src.querySelectorAll('canvas');
      clone.querySelectorAll('canvas').forEach((c, i) => {
        try { const ctx = c.getContext('2d'); if (ctx && srcCanvases[i]) ctx.drawImage(srcCanvases[i], 0, 0); } catch (e) { /* ignore */ }
      });
      box.style.width = Math.round(W * scale) + 'px';
      box.style.height = Math.round(H * scale) + 'px';
      box.appendChild(clone);
    } catch (e) {
      box.appendChild(A.img(w.icon));
    }
    return box;
  }
  function showThumbs(id, anchor) {
    const wins = A.wm.byApp(id).filter((w) => w.taskbar);
    if (!wins.length) return;
    hideThumbs(true);
    thumbsFor = id;
    thumbs = h('div.tb-thumbs');
    wins.forEach((w) => {
      const card = h('div.tb-thumb', null,
        h('div.tb-thumb-head', null, A.img(w.icon), h('span', null, w.title), h('button.tb-thumb-close', { type: 'button', 'aria-label': 'Close', onclick: (e) => { e.stopPropagation(); w.close(); card.remove(); if (!thumbs.children.length) hideThumbs(true); } }, '×')),
        makeThumb(w));
      card.addEventListener('click', () => { hideThumbs(true); peek(null); w.state === 'minimized' ? w.restore() : w.focus(); });
      card.addEventListener('pointerenter', () => { clearTimeout(card._pt); card._pt = setTimeout(() => peek(w), 500); });
      card.addEventListener('pointerleave', () => { clearTimeout(card._pt); peek(null); });
      thumbs.appendChild(card);
    });
    thumbs.addEventListener('pointerenter', () => clearTimeout(hideT));
    thumbs.addEventListener('pointerleave', scheduleHideThumbs);
    document.getElementById('ae-overlays').appendChild(thumbs);
    const r = anchor.getBoundingClientRect();
    const tw = thumbs.offsetWidth;
    thumbs.style.left = Math.max(4, Math.min(window.innerWidth - tw - 4, r.left + r.width / 2 - tw / 2)) + 'px';
    thumbs.style.bottom = (window.innerHeight - r.top + 6) + 'px';
    requestAnimationFrame(() => thumbs && thumbs.classList.add('open'));
  }
  function scheduleHideThumbs() { clearTimeout(hideT); hideT = setTimeout(() => hideThumbs(), 380); }
  function hideThumbs(now) {
    clearTimeout(hideT);
    if (!thumbs) return;
    const t = thumbs;
    thumbs = null; thumbsFor = null;
    peek(null);
    if (now) t.remove();
    else { t.classList.remove('open'); setTimeout(() => t.remove(), 180); }
  }

  // Aero Peek: everything turns into glass outlines except the target.
  function peek(target) {
    const root = document.documentElement;
    if (!target && target !== 'desktop') {
      root.classList.remove('peek');
      A.wm.windows.forEach((w) => w.el.classList.remove('peek-target'));
      return;
    }
    root.classList.add('peek');
    A.wm.windows.forEach((w) => w.el.classList.toggle('peek-target', w === target));
  }
  taskbar.peek = peek;

  // ------------------------------------------------------------ tray
  taskbar.addTrayIcon = function (o) {
    const el = h('button.tb-tray-btn', { type: 'button', 'data-tip': o.tip || '', 'aria-label': o.tip || o.id });
    const setIcon = (icon) => { el.innerHTML = ''; el.appendChild(typeof icon === 'string' ? (glyphNames.includes(icon) ? glyph(icon) : A.img(icon)) : icon); };
    setIcon(o.icon);
    el.addEventListener('click', (e) => o.onClick && o.onClick(el, e));
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); o.onContext && o.onContext(el, e); });
    trayEl.insertBefore(el, trayEl.firstChild);
    const handle = { el, setIcon, setTip: (t) => el.setAttribute('data-tip', t), remove: () => { el.remove(); taskbar.tray.delete(o.id); } };
    taskbar.tray.set(o.id, handle);
    return handle;
  };
  const glyphNames = ['volume', 'mute', 'network', 'battery', 'flag'];

  let openFly = null;
  function toggleFly(anchor, build, cls) {
    if (openFly && openFly.anchor === anchor) { openFly.close(); openFly = null; return; }
    if (openFly) openFly.close();
    const f = A.ui.flyout(anchor, build(), { className: 'tb-fly ' + (cls || ''), onClose: () => { if (openFly === f) openFly = null; } });
    f.anchor = anchor;
    openFly = f;
  }

  function volumeFly() {
    const pct = h('div.tbf-vol-pct', null, A.store.get('sound.volume'));
    const slider = A.ui.slider({ min: 0, max: 100, value: A.store.get('sound.volume'), vertical: true, label: 'Volume',
      onInput: (v) => { A.store.set('sound.volume', v); pct.textContent = v; if (!A.store.get('sound.enabled') && v > 0) A.store.set('sound.enabled', true); },
      onChange: () => A.sound.play('ding') });
    const muteBtn = h('button.tbf-mute', { type: 'button', 'data-tip': 'Mute', onclick: () => { A.store.set('sound.enabled', !A.store.get('sound.enabled')); muteBtn.innerHTML = ''; muteBtn.appendChild(glyph(A.store.get('sound.enabled') ? 'volume' : 'mute')); } }, glyph(A.store.get('sound.enabled') ? 'volume' : 'mute'));
    return h('div.tbf-volume', null,
      h('div.tbf-vol-col', null, A.img('icons/speaker', { class: 'tbf-vol-icon' }), h('div.tbf-vol-label', null, 'Speakers'), slider, pct, muteBtn),
      h('button.ae-link.tbf-mixer', { type: 'button', onclick: () => { openFly && openFly.close(); A.apps.launch('personalize', { page: 'sounds' }); } }, 'Mixer'));
  }

  const NETWORKS = [
    ['Aerium Home Network', 4, true], ['wireless', 3], ['HOME-2G-54', 3], ['WLAN_83F6', 2], ['Pretty Fly for a WiFi', 2], ['default', 1], ['FBI Surveillance Van', 1], ['Free Public WiFi', 1],
  ];
  function networkFly() {
    const connected = A.store.get('net.connected', 'Aerium Home Network');
    const list = h('div.tbf-net-list');
    NETWORKS.forEach(([name, bars]) => {
      const isOn = name === connected;
      const row = h('div.tbf-net', { class: isOn && 'on' },
        h('div.tbf-net-name', null, h('b', null, name), h('span', null, isOn ? 'Connected' : name === 'Free Public WiFi' || name === 'default' ? 'Unsecured network' : 'Security-enabled network')),
        h('div.tbf-bars', null, [0, 1, 2, 3].map((i) => h('i', { class: i < bars ? 'lit' : '', style: { height: 4 + i * 3 + 'px' } }))));
      row.addEventListener('click', () => {
        if (isOn) return;
        const status = row.querySelector('.tbf-net-name span');
        status.textContent = 'Connecting...';
        row.classList.add('connecting');
        setTimeout(() => {
          A.store.set('net.connected', name);
          A.sound.play('connect');
          openFly && openFly.close();
          A.notify({ title: 'Connected to ' + name, text: name === 'FBI Surveillance Van' ? 'Access: Local and Internet. They say hi.' : 'Access: Local and Internet', icon: 'icons/network' });
        }, 1400 + Math.random() * 900);
      });
      list.appendChild(row);
    });
    return h('div.tbf-network', null,
      h('div.tbf-title', null, 'Currently connected to:'),
      h('div.tbf-net-current', null, A.img('icons/network'), h('div', null, h('b', null, connected), h('span', null, 'Internet access'))),
      h('div.tbf-title', null, 'Wireless Network Connection'),
      list,
      h('div.tbf-foot', null, h('button.ae-link', { type: 'button', onclick: () => { openFly && openFly.close(); A.apps.launch('controlpanel', { page: 'network' }); } }, 'Open Network and Sharing Center')));
  }

  function batteryFly() {
    const plan = A.store.get('power.plan', 'balanced');
    const pct = 100 - Math.floor(((Date.now() / 60000) % 60) / 6);
    return h('div.tbf-battery', null,
      h('div.tbf-bat-row', null, A.img('icons/battery'), h('div', null, h('b', null, pct + '% available'), h('span', null, '(plugged in, charging)'))),
      h('div.tbf-title', null, 'Select a power plan:'),
      A.ui.radioGroup({ value: plan, options: [['balanced', 'Balanced'], ['saver', 'Power saver'], ['high', 'High performance']], onChange: (v) => A.store.set('power.plan', v) }),
      h('div.tbf-foot', null, h('button.ae-link', { type: 'button', onclick: () => { openFly && openFly.close(); A.apps.launch('controlpanel', { page: 'power' }); } }, 'More power options')));
  }

  function actionFly() {
    return h('div.tbf-action', null,
      h('div.tbf-bat-row', null, A.img('icons/defender'), h('div', null, h('b', null, 'Aerium Defender'), h('span', null, 'No threats detected. Your fish are safe.'))),
      h('div.tbf-foot', null, h('button.ae-link', { type: 'button', onclick: () => { openFly && openFly.close(); A.apps.launch('controlpanel', { page: 'security' }); } }, 'Open Security Center')));
  }

  // ------------------------------------------------------------ clock
  function clockFly() {
    const d = new Date();
    let view = new Date(d.getFullYear(), d.getMonth(), 1);
    const face = analogClock();
    const cal = h('div.tbf-cal');
    const title = h('div.tbf-cal-title');
    function renderCal() {
      cal.innerHTML = '';
      title.textContent = A.util.MONTHS[view.getMonth()] + ' ' + view.getFullYear();
      ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach((x) => cal.appendChild(h('span.dow', null, x)));
      const first = view.getDay();
      const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      const prevDays = new Date(view.getFullYear(), view.getMonth(), 0).getDate();
      for (let i = 0; i < 42; i++) {
        const n = i - first + 1;
        let label, cls = '';
        if (n < 1) { label = prevDays + n; cls = 'other'; }
        else if (n > days) { label = n - days; cls = 'other'; }
        else { label = n; if (n === d.getDate() && view.getMonth() === d.getMonth() && view.getFullYear() === d.getFullYear()) cls = 'today'; }
        cal.appendChild(h('span.day', { class: cls }, label));
      }
    }
    renderCal();
    const nav = (dm) => { view = new Date(view.getFullYear(), view.getMonth() + dm, 1); renderCal(); };
    return h('div.tbf-clock', null,
      h('div.tbf-clock-date', null, A.util.fmtLongDate(d)),
      h('div.tbf-clock-body', null,
        h('div.tbf-cal-wrap', null, h('div.tbf-cal-head', null, h('button', { type: 'button', onclick: () => nav(-1), 'aria-label': 'Previous month' }, '◀'), title, h('button', { type: 'button', onclick: () => nav(1), 'aria-label': 'Next month' }, '▶')), cal),
        h('div.tbf-face-wrap', null, face, h('div.tbf-face-time', null, A.util.fmtTime(d, true)))),
      h('div.tbf-foot', null, h('button.ae-link', { type: 'button', onclick: () => { openFly && openFly.close(); A.apps.launch('controlpanel', { page: 'datetime' }); } }, 'Change date and time settings...')));
  }

  function analogClock() {
    const svg = s('svg', { viewBox: '0 0 100 100', class: 'tbf-face' },
      s('defs', null, s('radialGradient', { id: 'tbfc', cx: '.4', cy: '.3', r: '.8' }, s('stop', { offset: '0', 'stop-color': '#ffffff' }), s('stop', { offset: '.7', 'stop-color': '#e8f2fb' }), s('stop', { offset: '1', 'stop-color': '#a9c4dc' }))),
      s('circle', { cx: 50, cy: 50, r: 47, fill: 'url(#tbfc)', stroke: '#5b89b4', 'stroke-width': 1.5 }),
      ...Array.from({ length: 12 }, (_, i) => s('line', { x1: 50, y1: 7, x2: 50, y2: i % 3 ? 11 : 14, stroke: '#3f5f7d', 'stroke-width': i % 3 ? 1.2 : 2.2, transform: `rotate(${i * 30} 50 50)` })),
      s('line', { class: 'hh', x1: 50, y1: 50, x2: 50, y2: 26, stroke: '#1e2a35', 'stroke-width': 3.4, 'stroke-linecap': 'round' }),
      s('line', { class: 'mm', x1: 50, y1: 50, x2: 50, y2: 15, stroke: '#1e2a35', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
      s('line', { class: 'ss', x1: 50, y1: 58, x2: 50, y2: 12, stroke: '#e0301e', 'stroke-width': 1 }),
      s('circle', { cx: 50, cy: 50, r: 2.6, fill: '#e0301e' }),
      s('ellipse', { cx: 46, cy: 27, rx: 30, ry: 16, fill: '#fff', opacity: 0.45 }));
    function tick() {
      if (!svg.isConnected && svg._started) return;
      svg._started = true;
      const d = new Date();
      const sec = d.getSeconds(), min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
      svg.querySelector('.hh').setAttribute('transform', `rotate(${hr * 30} 50 50)`);
      svg.querySelector('.mm').setAttribute('transform', `rotate(${min * 6} 50 50)`);
      svg.querySelector('.ss').setAttribute('transform', `rotate(${sec * 6} 50 50)`);
      const t = svg.parentNode && svg.parentNode.querySelector('.tbf-face-time');
      if (t) t.textContent = A.util.fmtTime(d, true);
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    }
    requestAnimationFrame(tick);
    return svg;
  }
  taskbar.analogClock = analogClock;

  function updateClock() {
    const d = new Date();
    clockEl.innerHTML = '';
    clockEl.append(h('span', null, A.util.fmtTime(d)), h('span', null, A.util.fmtDate(d)));
    clockEl.setAttribute('data-tip', A.util.fmtLongDate(d));
    setTimeout(updateClock, 60000 - (Date.now() % 60000) + 20);
  }

  // ------------------------------------------------------------ init
  taskbar.init = function () {
    bar = document.getElementById('ae-taskbar');
    const orb = h('button.tb-orb', { type: 'button', 'aria-label': 'Start', 'data-tip': 'Start' }, A.img('icons/aerium'), h('span.tb-orb-glow'));
    orb.addEventListener('click', () => A.startmenu.toggle());
    const flip = h('button.tb-quick', { type: 'button', 'data-tip': 'Switch between windows (Flip 3D)', 'aria-label': 'Flip 3D', onclick: () => A.effects.flip3d() }, glyph('flip'));
    appsEl = h('div.tb-apps');
    trayEl = h('div.tb-tray-icons');
    clockEl = h('button.tb-clock', { type: 'button', onclick: () => toggleFly(clockEl, clockFly, 'tbf-wide') });
    const showDesk = h('button.tb-showdesk', { type: 'button', 'data-tip': 'Show desktop', 'aria-label': 'Show desktop' });
    let peekT = null;
    showDesk.addEventListener('pointerenter', () => { peekT = setTimeout(() => peek('desktop'), 550); });
    showDesk.addEventListener('pointerleave', () => { clearTimeout(peekT); peek(null); });
    showDesk.addEventListener('click', () => { clearTimeout(peekT); peek(null); A.wm.toggleDesktop(); });
    const trayUp = h('button.tb-tray-up', { type: 'button', 'data-tip': 'Show hidden icons', 'aria-label': 'Show hidden icons' }, glyph('up'));
    trayUp.addEventListener('click', () => toggleFly(trayUp, () => h('div.tbf-hidden', null, h('div.tbf-title', null, 'Hidden icons'), h('div.tbf-hidden-grid', null,
      ...[['icons/defender', 'Aerium Defender'], ['icons/sync', 'Sync Center'], ['icons/bell', 'Notifications'], ['icons/aquarium', 'Aquarium']].map(([ic, tip]) => h('button.tb-tray-btn.big', { type: 'button', 'data-tip': tip, onclick: () => { openFly && openFly.close(); if (tip === 'Aquarium') A.apps.launch('aquarium'); else if (tip === 'Aerium Defender') A.apps.launch('controlpanel', { page: 'security' }); else A.notify({ title: tip, text: 'Everything is up to date.', icon: ic }); } }, A.img(ic)))))));

    bar.append(
      h('div.tb-start', null, orb),
      h('div.tb-quickbar', null, flip),
      appsEl,
      h('div.tb-tray', null, trayUp, trayEl, clockEl),
      showDesk);

    const vol = taskbar.addTrayIcon({ id: 'volume', icon: A.store.get('sound.enabled') ? 'volume' : 'mute', tip: 'Speakers: ' + A.store.get('sound.volume') + '%', onClick: (el) => toggleFly(el, volumeFly) });
    const updVol = () => { vol.setIcon(A.store.get('sound.enabled') && A.store.get('sound.volume') > 0 ? 'volume' : 'mute'); vol.setTip('Speakers: ' + A.store.get('sound.volume') + '%'); };
    A.bus.on('store:sound.enabled', updVol);
    A.bus.on('store:sound.volume', updVol);
    taskbar.addTrayIcon({ id: 'network', icon: 'network', tip: 'Aerium Home Network\nInternet access', onClick: (el) => toggleFly(el, networkFly) });
    taskbar.addTrayIcon({ id: 'battery', icon: 'battery', tip: 'Fully charged (100%)', onClick: (el) => toggleFly(el, batteryFly) });
    taskbar.addTrayIcon({ id: 'action', icon: 'flag', tip: 'Aerium Defender: No threats detected', onClick: (el) => toggleFly(el, actionFly) });

    bar.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.tb-app, .tb-tray-btn, .tb-orb')) return;
      e.preventDefault();
      A.ui.menu([
        { label: 'Toolbars', submenu: [{ label: 'Quick Launch', checked: true }, { label: 'Address', disabled: true }, { label: 'Links', disabled: true }] },
        { separator: true },
        { label: 'Cascade windows', onClick: () => A.wm.arrange('cascade') },
        { label: 'Show windows stacked', onClick: () => A.wm.arrange('stack') },
        { label: 'Show windows side by side', onClick: () => A.wm.arrange('side') },
        { label: 'Show the desktop', onClick: () => A.wm.toggleDesktop() },
        { separator: true },
        { label: 'Task Manager', onClick: () => A.apps.launch('taskmgr') },
        { separator: true },
        { label: 'Lock the taskbar', checked: true },
        { label: 'Properties', onClick: () => A.apps.launch('personalize', { page: 'taskbar' }) },
      ], e.clientX, e.clientY);
    });

    ['win:open', 'win:close', 'win:focus', 'win:blur', 'win:minimize', 'win:restore', 'win:title', 'win:flash', 'apps:change'].forEach((ev) => A.bus.on(ev, () => requestAnimationFrame(renderButtons)));
    renderButtons();
    updateClock();
  };

  taskbar.render = renderButtons;
  taskbar.closeFlyouts = () => { if (openFly) { openFly.close(); openFly = null; } };
  A.taskbar = taskbar;
})();
