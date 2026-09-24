/* Aerium Games: the Games folder (a 2007-style game explorer with glossy box
   art, ratings and your statistics) plus the small shared kit every game uses:
   stats, menus, keyboard shortcuts, dialogs, timers, particles and sounds.
   This file loads first; the games themselves live in the files next to it. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;
  const K = (A.gameKit = {});

  // ================================================================ storage
  const skey = (id, k) => 'games.' + id + '.' + k;
  K.get = (id, k, fb) => A.store.get(skey(id, k), fb);
  K.set = (id, k, v) => A.store.set(skey(id, k), v);
  K.options = (id, defaults) => Object.assign({}, defaults, K.get(id, 'options', null) || {});
  K.saveOptions = (id, o) => K.set(id, 'options', o);

  // Stats live per level: games.<id>.stats = { [level]: { played, won, ... } }
  const LEVEL0 = () => ({ played: 0, won: 0, streak: 0, bestWin: 0, bestLose: 0, times: [], scores: [], last: 0, extra: {} });
  K.allStats = (id) => {
    const all = K.get(id, 'stats', null);
    return all && typeof all === 'object' ? all : {};
  };
  K.stats = (id, level) => Object.assign(LEVEL0(), K.allStats(id)[level || 'all'] || {});
  K.record = function (id, level, r) {
    level = level || 'all';
    const all = K.allStats(id);
    const s = Object.assign(LEVEL0(), all[level] || {});
    s.played++;
    s.last = Date.now();
    if (r.won) { s.won++; s.streak = s.streak > 0 ? s.streak + 1 : 1; s.bestWin = Math.max(s.bestWin, s.streak); }
    else { s.streak = s.streak < 0 ? s.streak - 1 : -1; s.bestLose = Math.max(s.bestLose, -s.streak); }
    let timeRank = -1, scoreRank = -1;
    if (r.won && r.time != null) {
      const e = { t: Math.round(r.time * 10) / 10, d: Date.now() };
      s.times = (s.times || []).concat(e).sort((a, b) => a.t - b.t || a.d - b.d).slice(0, 5);
      timeRank = s.times.indexOf(e);
    }
    if (r.score != null) {
      const e = Object.assign({ s: r.score, d: Date.now() }, r.entry || {});
      s.scores = (s.scores || []).concat(e).sort((a, b) => b.s - a.s || a.d - b.d).slice(0, 10);
      scoreRank = s.scores.indexOf(e);
    }
    if (r.update) r.update(s);
    all[level] = s;
    K.set(id, 'stats', all);
    return { stats: s, timeRank, scoreRank };
  };
  K.resetStats = (id) => K.set(id, 'stats', {});
  K.pct = (s) => (s.played ? Math.round((s.won / s.played) * 100) : 0) + '%';
  K.fmt = (sec) => A.util.fmtDuration(sec);
  K.streakText = (s) => (s.streak > 0 ? s.streak + (s.streak === 1 ? ' win' : ' wins') : s.streak < 0 ? -s.streak + (s.streak === -1 ? ' loss' : ' losses') : '0');
  // Adds up every level of a game (for the Games folder).
  K.summary = function (id) {
    const all = K.allStats(id);
    const out = { played: 0, won: 0, last: 0, levels: all };
    Object.keys(all).forEach((k) => {
      const s = all[k];
      if (!s || typeof s !== 'object') return;
      out.played += s.played || 0;
      out.won += s.won || 0;
      out.last = Math.max(out.last, s.last || 0);
    });
    return out;
  };

  // ================================================================ menus & keys
  // Standard Game and Help menus. o: { name, newGame, stats, options, appearance,
  // help, about, exit, items (extra Game items), menus (extra menus) }
  K.menubar = function (o) {
    const extra = () => (typeof o.items === 'function' ? o.items() : o.items || []);
    const game = () => {
      const ex = extra();
      return [
        { label: 'New game', shortcut: 'F2', onClick: o.newGame },
        ...(ex.length ? [{ separator: true }, ...ex] : []),
        { separator: true },
        { label: 'Statistics', shortcut: 'F4', onClick: o.stats },
        { label: 'Options', shortcut: 'F5', onClick: o.options },
        { label: 'Change appearance', shortcut: 'F7', onClick: o.appearance },
        { separator: true },
        { label: 'More games', icon: 'icons/folder-games', onClick: () => A.apps.launch('games') },
        { separator: true },
        { label: 'Exit', onClick: o.exit },
      ];
    };
    const help = () => [
      { label: 'How to play', shortcut: 'F1', icon: 'icons/help', onClick: o.help },
      { separator: true },
      { label: 'About ' + o.name, onClick: o.about },
    ];
    return A.ui.menubar([{ label: 'Game', items: game }].concat(o.menus || [], [{ label: 'Help', items: help }]));
  };

  // F1 help, F2 new game, F4 statistics, F5 options, F7 appearance, Ctrl+N new game.
  K.keys = function (win, o) {
    win.el.addEventListener('keydown', (e) => {
      if (win.closed || (win.modalChild && !win.modalChild.closed)) return;
      if (A.util.isTyping(e)) return;
      const map = { F1: o.help, F2: o.newGame, F4: o.stats, F5: o.options, F7: o.appearance };
      if (map[e.key] && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        map[e.key]();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); o.newGame && o.newGame(); return; }
      if (o.key) o.key(e);
    });
  };

  // True while a dialog is open over this window.
  K.blocked = (win) => !!(win.modalChild && !win.modalChild.closed);

  // ================================================================ dialogs
  K.statRows = (rows) => h('table.gk-stat-table', null, h('tbody', null, rows.filter(Boolean).map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v)))));

  K.about = (win, o) => A.ui.messageBox({
    parent: win, title: 'About ' + o.name, icon: o.icon, instruction: 'Aerium ' + o.name,
    message: 'Version ' + (o.version || '7.0') + ' (Build 2007)\n\n' + o.blurb + '\n\nThis game is licensed to:\n' + (A.store.get('user.name') || 'User'),
    sound: false,
  });

  // o: { name, icon, intro, sections: [[heading, text | [lines]]] }
  K.helpDialog = function (win, o) {
    const content = h('div.gk-help', null,
      h('div.gk-help-head', null, A.img(o.icon, { class: 'gk-help-icon' }),
        h('div', null, h('div.gk-help-title', null, 'How to play ' + o.name), h('div.gk-help-intro', null, o.intro))),
      h('div.gk-help-body', null, o.sections.map(([hd, body]) => h('section.gk-help-sec', null,
        h('h3', null, hd),
        Array.isArray(body) ? h('ul', null, body.map((l) => h('li', null, l))) : h('p', null, body)))));
    return A.ui.dialog({ parent: win, title: o.name + ' Help', icon: 'icons/help', width: 500, content, buttons: [{ label: 'Got it', default: true, cancel: true }] });
  };

  // Vista-style command links. Resolves with the chosen value (or null).
  // o: { title, icon, instruction, message, options: [{ value, label, note }], cancelLabel }
  K.choose = function (win, o) {
    return new Promise((resolve) => {
      let chosen = null, dwin = null;
      const links = o.options.map((op) => h('button.gk-cmdlink', {
        type: 'button',
        onclick: () => { chosen = op.value; if (dwin) dwin.close(true); },
      }, h('span.gk-cmd-arrow', { 'aria-hidden': 'true' }), h('span.gk-cmd-text', null, h('span.gk-cmd-label', null, op.label), op.note ? h('span.gk-cmd-note', null, op.note) : null)));
      const content = h('div.ae-taskdialog.gk-choose', null,
        o.icon ? A.img(o.icon, { class: 'ae-td-icon' }) : null,
        h('div.ae-td-text', null,
          h('div.ae-td-instruction', null, o.instruction),
          o.message ? h('div.ae-td-message', null, o.message) : null,
          h('div.gk-cmdlinks', null, links)));
      if (o.sound !== false) A.sound.play('question');
      A.ui.dialog({
        parent: win, title: o.title, icon: o.icon || 'icons/help', width: o.width || 470, content,
        buttons: o.cancelLabel ? [{ label: o.cancelLabel, cancel: true, value: null }] : [],
        noButtons: !o.cancelLabel, cancelValue: null,
        onOpen: (w) => { dwin = w; setTimeout(() => links[0] && links[0].focus(), 90); },
      }).then(() => resolve(chosen));
    });
  };

  // Win / lose summary. o: { won, title, instruction, message, rows, badge, buttons, icon }
  K.resultDialog = function (win, o) {
    const content = h('div.gk-result', { class: o.won ? 'won' : 'lost' },
      h('div.gk-result-art', { html: o.won ? trophySVG() : '' }, o.won ? null : A.img(o.icon || 'icons/info', { class: 'gk-result-icon' })),
      h('div.gk-result-text', null,
        h('div.gk-result-title', null, o.instruction),
        o.message ? h('div.gk-result-msg', null, o.message) : null,
        o.rows ? K.statRows(o.rows) : null),
      o.badge ? h('div.gk-result-badge', null, A.ui.badge(o.badge, 'sun', 'burst')) : null);
    return A.ui.dialog({ parent: win, title: o.title, icon: o.icon, width: o.width || 460, content, buttons: o.buttons, cancelValue: o.cancelValue !== undefined ? o.cancelValue : null });
  };

  // Statistics window with an optional level list on the left.
  // o: { name, icon, levels: [[key, label]], level, render(level) -> element, onReset }
  K.statsDialog = function (win, o) {
    let level = o.level || (o.levels ? o.levels[0][0] : 'all');
    let dwin = null;
    const body = h('div.gk-stats-body');
    const draw = () => { body.innerHTML = ''; body.appendChild(o.render(level)); };
    const side = o.levels ? h('div.gk-stats-levels', { role: 'tablist' }) : null;
    if (side) {
      o.levels.forEach(([k, label]) => {
        const b = h('button.gk-level', { type: 'button', role: 'tab', class: k === level && 'active' }, label);
        b.addEventListener('click', () => {
          level = k;
          side.querySelectorAll('.gk-level').forEach((x) => x.classList.toggle('active', x === b));
          draw();
        });
        side.appendChild(b);
      });
    }
    draw();
    return A.ui.dialog({
      parent: win, title: o.name + ' Statistics', icon: o.icon, width: side ? 540 : 420,
      content: h('div.gk-stats', { class: side && 'with-levels' }, side, body),
      buttons: [
        { label: 'Reset', onClick: async () => {
          const ok = await A.ui.confirm('Do you want to reset your statistics? Your best times and scores will be cleared too.', { title: o.name + ' Statistics', icon: 'warning', parent: dwin });
          if (ok) { o.onReset(); draw(); }
          return false;
        } },
        { label: 'Close', default: true, cancel: true },
      ],
      onOpen: (w) => { dwin = w; },
    });
  };

  // Options dialog: o: { title, icon, groups: [{ legend, content }] } -> 'ok' | null
  K.optionsDialog = function (win, o) {
    const content = h('div.gk-options', null, o.groups.filter(Boolean).map((g) => h('fieldset.gk-fieldset', { class: g.className }, h('legend', null, g.legend), g.content)));
    return A.ui.dialog({
      parent: win, title: o.title || 'Options', icon: o.icon, width: o.width || 420, content,
      buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }],
      cancelValue: null,
    });
  };

  // A grid of big selectable previews (card backs, skins).
  // o: { items: [{ value, label, preview: element }], value, onChange, className }
  K.chooser = function (o) {
    let value = o.value;
    const el = h('div.gk-chooser', { class: o.className, role: 'listbox' });
    const btns = o.items.map((it) => {
      const b = h('button.gk-choice', { type: 'button', role: 'option', class: it.value === value && 'selected', 'aria-selected': String(it.value === value), 'data-tip': it.tip || null },
        h('span.gk-choice-art', null, it.preview), h('span.gk-choice-label', null, it.label));
      b.addEventListener('click', () => {
        value = it.value;
        btns.forEach((x) => { x.classList.toggle('selected', x === b); x.setAttribute('aria-selected', String(x === b)); });
        A.sound.play('select');
        o.onChange && o.onChange(value);
      });
      b.addEventListener('dblclick', () => { const d = b.closest('.win'); const def = d && d.querySelector('.ae-dialog-footer .ae-default'); if (def) def.click(); });
      el.appendChild(b);
      return b;
    });
    Object.defineProperty(el, 'value', { get: () => value });
    return el;
  };

  // A labeled number field for custom sizes.
  K.numberField = function (label, value, min, max) {
    const input = h('input.ae-input.gk-num', { type: 'number', value, min, max, step: 1 });
    const el = h('label.gk-numfield', null, h('span', null, label), input);
    Object.defineProperty(el, 'value', { get: () => clamp(Math.round(Number(input.value) || min), min, max) });
    el.input = input;
    return el;
  };

  function trophySVG() {
    const u = A.util.uid('tr');
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, b = a + 0.12;
      rays += `<path d="M60 60 L${(60 + 70 * Math.cos(a)).toFixed(1)} ${(60 + 70 * Math.sin(a)).toFixed(1)} L${(60 + 70 * Math.cos(b)).toFixed(1)} ${(60 + 70 * Math.sin(b)).toFixed(1)} Z"/>`;
    }
    const star = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 15 : 34; star.push((60 + r * Math.cos(a)).toFixed(1) + ',' + (62 + r * Math.sin(a)).toFixed(1)); }
    return `<svg viewBox="0 0 120 120" class="gk-trophy" aria-hidden="true"><defs>
      <radialGradient id="${u}g"><stop offset="0" stop-color="#fffbe0"/><stop offset=".55" stop-color="#ffe06a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd62e" stop-opacity="0"/></radialGradient>
      <linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c2"/><stop offset=".48" stop-color="#ffd62e"/><stop offset=".52" stop-color="#ffc400"/><stop offset="1" stop-color="#f08a12"/></linearGradient>
      <linearGradient id="${u}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <g class="gk-rays" fill="#ffe680" opacity=".45">${rays}</g>
      <circle cx="60" cy="60" r="48" fill="url(#${u}g)"/>
      <polygon points="${star.join(' ')}" fill="url(#${u}s)" stroke="#c46a00" stroke-width="2" stroke-linejoin="round"/>
      <path d="M40 50 Q60 30 80 50 Q60 44 40 50 Z" fill="url(#${u}h)"/>
      <g fill="#fff" class="gk-twinkles"><path class="gk-tw" d="M20 26 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"/><path class="gk-tw" d="M98 20 l1.5 4.5 4.5 1.5 -4.5 1.5 -1.5 4.5 -1.5 -4.5 -4.5 -1.5 4.5 -1.5z"/><path class="gk-tw" d="M100 92 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"/></g></svg>`;
  }
  K.trophySVG = trophySVG;

  // ================================================================ timer
  // Counts up while running; pause(reason)/resume(reason) stack reasons such as
  // 'min' (window minimized) so nothing resumes too early.
  K.Timer = class {
    constructor(onTick) {
      this.onTick = onTick;
      this.acc = 0; this.t0 = 0; this.running = false; this.reasons = new Set(); this.iv = null; this.last = -1;
    }
    get paused() { return this.reasons.size > 0; }
    get seconds() { return this.acc + (this.running && !this.paused ? (performance.now() - this.t0) / 1000 : 0); }
    start(from = 0) {
      this.acc = from; this.running = true; this.t0 = performance.now(); this.last = -1;
      clearInterval(this.iv);
      this.iv = setInterval(() => this.tick(), 200);
      this.tick();
    }
    tick() { const s = Math.floor(this.seconds); if (s !== this.last) { this.last = s; this.onTick && this.onTick(s); } }
    pause(r = 'user') {
      if (this.reasons.has(r)) return;
      if (this.running && !this.paused) this.acc += (performance.now() - this.t0) / 1000;
      this.reasons.add(r);
    }
    resume(r = 'user') {
      if (!this.reasons.delete(r)) return;
      if (!this.paused) this.t0 = performance.now();
    }
    stop() {
      if (this.running && !this.paused) this.acc += (performance.now() - this.t0) / 1000;
      this.running = false;
      clearInterval(this.iv); this.iv = null;
      this.tick();
    }
    reset() { this.stop(); this.acc = 0; this.last = -1; this.tick(); }
    destroy() { clearInterval(this.iv); this.iv = null; this.running = false; }
  };

  // ================================================================ particles
  const spriteCache = new Map();
  function glowSprite(color) {
    if (spriteCache.has(color)) return spriteCache.get(color);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color); g.addColorStop(0.35, color); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.globalAlpha = 1;
    x.fillRect(0, 0, 64, 64);
    // soften the core
    const g2 = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g2.addColorStop(0, 'rgba(255,255,255,.9)'); g2.addColorStop(0.25, 'rgba(255,255,255,0)');
    x.fillStyle = g2; x.fillRect(0, 0, 64, 64);
    spriteCache.set(color, c);
    return c;
  }

  // A canvas overlay that runs its own animation loop only while particles live.
  K.Particles = class {
    constructor(host, o = {}) {
      this.host = host;
      this.cv = h('canvas.gk-fx', { 'aria-hidden': 'true' });
      if (o.className) this.cv.classList.add(o.className);
      host.appendChild(this.cv);
      this.ctx = this.cv.getContext('2d');
      this.list = [];
      this.raf = 0;
      this.w = 1; this.h = 1; this.dpr = 1;
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(host);
      this.resize();
    }
    resize() {
      const w = this.host.clientWidth, hh = this.host.clientHeight;
      if (!w || !hh) return;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = w; this.h = hh;
      this.cv.width = Math.round(w * this.dpr);
      this.cv.height = Math.round(hh * this.dpr);
    }
    add(p) {
      this.list.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0.985, life: 1, age: 0, size: 3, color: '#ffffff', shape: 'dot', rot: 0, vr: 0, grow: 0, alpha: 1, delay: 0 }, p));
      if (this.list.length > 900) this.list.splice(0, this.list.length - 900);
      if (!this.raf) { this.t = performance.now(); this.raf = requestAnimationFrame((t) => this.frame(t)); }
    }
    burst(x, y, o = {}) {
      const n = o.count || 16;
      for (let i = 0; i < n; i++) {
        const a = o.spread != null ? (o.angle || 0) + (Math.random() - 0.5) * o.spread : Math.random() * Math.PI * 2;
        const sp = (o.speed || 200) * (0.3 + Math.random() * 0.7);
        this.add({
          x: x + (o.jitter ? (Math.random() - 0.5) * o.jitter : 0), y: y + (o.jitter ? (Math.random() - 0.5) * o.jitter : 0),
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.gravity || 0, drag: o.drag || 0.94,
          life: (o.life || 0.8) * (0.6 + Math.random() * 0.6), size: (o.size || 3) * (0.6 + Math.random() * 0.8),
          color: Array.isArray(o.colors) ? o.colors[Math.floor(Math.random() * o.colors.length)] : o.color || '#ffffff',
          shape: o.shape || 'dot', rot: Math.random() * 6.283, vr: (Math.random() - 0.5) * (o.spin || 8), grow: o.grow || 0,
          alpha: o.alpha || 1, delay: o.stagger ? Math.random() * o.stagger : 0,
        });
      }
    }
    text(x, y, str, o = {}) {
      this.add({ x, y, vy: o.vy || -60, drag: 0.97, life: o.life || 1.1, size: o.size || 18, color: o.color || '#ffffff', shape: 'text', text: str, stroke: o.stroke || 'rgba(11,42,74,.55)' });
    }
    frame(t) {
      const dt = Math.min(0.05, (t - this.t) / 1000);
      this.t = t;
      const c = this.ctx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.w, this.h);
      const keep = [];
      for (const p of this.list) {
        if (p.delay > 0) { p.delay -= dt; keep.push(p); continue; }
        p.age += dt;
        if (p.age >= p.life) continue;
        keep.push(p);
        const k = Math.pow(p.drag, dt * 60);
        p.vx *= k; p.vy *= k; p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt; p.size = Math.max(0.1, p.size + p.grow * dt);
        const f = 1 - p.age / p.life;
        c.globalAlpha = Math.max(0, Math.min(1, p.alpha * (p.shape === 'text' ? Math.min(1, f * 2.5) : f)));
        this.draw(c, p, f);
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      this.list = keep;
      this.raf = keep.length ? requestAnimationFrame((tt) => this.frame(tt)) : 0;
      if (!this.raf) c.clearRect(0, 0, this.w, this.h);
    }
    draw(c, p, f) {
      switch (p.shape) {
        case 'glow': {
          c.globalCompositeOperation = 'lighter';
          const s = p.size * 2;
          c.drawImage(glowSprite(p.color), p.x - s, p.y - s, s * 2, s * 2);
          c.globalCompositeOperation = 'source-over';
          break;
        }
        case 'spark': {
          c.strokeStyle = p.color; c.lineWidth = Math.max(0.5, p.size * f); c.lineCap = 'round';
          c.beginPath(); c.moveTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); c.lineTo(p.x, p.y); c.stroke();
          break;
        }
        case 'star': {
          const s = p.size * (0.6 + 0.4 * Math.sin(p.age * 18 + p.rot));
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot * 0.2);
          c.fillStyle = p.color;
          c.beginPath();
          c.moveTo(0, -s * 2); c.quadraticCurveTo(0, 0, s * 2, 0); c.quadraticCurveTo(0, 0, 0, s * 2); c.quadraticCurveTo(0, 0, -s * 2, 0); c.quadraticCurveTo(0, 0, 0, -s * 2);
          c.fill();
          c.globalCompositeOperation = 'lighter';
          c.drawImage(glowSprite(p.color), -s * 1.4, -s * 1.4, s * 2.8, s * 2.8);
          c.restore();
          break;
        }
        case 'petal': {
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
          c.fillStyle = p.color;
          c.beginPath(); c.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = 'rgba(255,255,255,.45)';
          c.beginPath(); c.ellipse(-p.size * 0.2, -p.size * 0.12, p.size * 0.5, p.size * 0.18, 0, 0, Math.PI * 2); c.fill();
          c.restore();
          break;
        }
        case 'bubble': {
          c.strokeStyle = p.color; c.lineWidth = Math.max(0.6, p.size * 0.14);
          c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.stroke();
          c.fillStyle = 'rgba(255,255,255,.75)';
          c.beginPath(); c.arc(p.x - p.size * 0.35, p.y - p.size * 0.38, p.size * 0.22, 0, Math.PI * 2); c.fill();
          break;
        }
        case 'ring': {
          c.strokeStyle = p.color; c.lineWidth = Math.max(0.5, 3 * f);
          c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.stroke();
          break;
        }
        case 'smoke': {
          const s = p.size;
          c.drawImage(glowSprite(p.color), p.x - s, p.y - s, s * 2, s * 2);
          break;
        }
        case 'chip': {
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
          c.fillStyle = p.color; c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          c.restore();
          break;
        }
        case 'text': {
          c.font = '600 ' + p.size + 'px ' + getComputedStyle(this.host).fontFamily;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineWidth = 3; c.strokeStyle = p.stroke; c.lineJoin = 'round';
          c.strokeText(p.text, p.x, p.y);
          c.fillStyle = p.color; c.fillText(p.text, p.x, p.y);
          break;
        }
        default: {
          c.fillStyle = p.color;
          c.beginPath(); c.arc(p.x, p.y, Math.max(0.2, p.size * (0.4 + 0.6 * f)), 0, Math.PI * 2); c.fill();
        }
      }
    }
    get busy() { return this.list.length > 0; }
    clear() { this.list = []; }
    destroy() { cancelAnimationFrame(this.raf); this.raf = 0; this.ro.disconnect(); this.cv.remove(); this.list = []; }
  };

  K.observe = function (el, fn) {
    const ro = new ResizeObserver(() => fn());
    ro.observe(el);
    return () => ro.disconnect();
  };
  K.dpr = () => Math.min(2, window.devicePixelRatio || 1);
  K.reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ================================================================ sounds
  // Built-in sounds go through Aerium.sound.play; these extra game sounds are
  // synthesized here from the engine's primitives and routed to the sfx bus.
  const lastSfx = {};
  const SFX = {
    boom(t, big, S) {
      S.noise(t, { dur: big ? 0.9 : 0.42, vel: big ? 0.32 : 0.14, type: 'lowpass', f1: big ? 1100 : 1600, f2: 80, q: 0.7, rev: 0.25 });
      S.blip(big ? 120 : 180, 38, t, { dur: big ? 0.6 : 0.28, vel: big ? 0.26 : 0.12, glide: big ? 0.45 : 0.22, rev: 0.1 });
    },
    bloom(t, i, S) {
      const notes = ['E6', 'G6', 'A6', 'C7', 'D7', 'B6'];
      S.bell(notes[(i || 0) % notes.length], t, { vel: 0.05, dur: 0.7, ratio: 2, index: 0.7, rev: 0.45 });
      S.noise(t, { dur: 0.05, vel: 0.05, type: 'highpass', f1: 3200, rev: 0.05 });
    },
    ripple(t, n, S) {
      S.noise(t, { dur: 0.3 + Math.min(0.5, (n || 1) * 0.01), vel: 0.045, f1: 1500, f2: 5200, q: 0.8, shape: 'swell', rev: 0.35 });
      S.bell('A6', t + 0.02, { vel: 0.025, dur: 0.5, ratio: 2, index: 0.5, rev: 0.5 });
    },
    tap(t, _, S) {
      S.noise(t, { dur: 0.018, vel: 0.08, type: 'highpass', f1: 2400, rev: 0 });
      S.blip(1600, 1100, t, { dur: 0.03, vel: 0.025, type: 'triangle', rev: 0 });
    },
    chime(t, n, S) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
      const m = 74 + scale[Math.min(n || 0, scale.length - 1)];
      S.bell(S.midiToFreq(m), t, { vel: 0.09, dur: 1.1, ratio: 2, index: 0.9, rev: 0.4 });
      S.bell(S.midiToFreq(m + 7), t + 0.07, { vel: 0.06, dur: 1.2, ratio: 2, index: 0.8, rev: 0.45 });
    },
    miss(t, _, S) {
      S.blip(392, 330, t, { dur: 0.11, vel: 0.05, type: 'triangle', rev: 0.05 });
      S.blip(311, 262, t + 0.1, { dur: 0.14, vel: 0.05, type: 'triangle', rev: 0.05 });
    },
    sparkle(t, n, S) {
      for (let i = 0; i < (n || 5); i++) S.bell(S.midiToFreq(91 + Math.floor(Math.random() * 14)), t + i * 0.055, { vel: 0.022, dur: 0.6, ratio: 2, index: 0.5, rev: 0.6 });
    },
    bubble(t, pitch, S) {
      const f = 420 + (pitch == null ? Math.random() : pitch) * 900;
      S.blip(f, f * 2.7, t, { dur: 0.065, vel: 0.16, glide: 0.035, rev: 0.12 });
      S.noise(t, { dur: 0.008, vel: 0.07, type: 'highpass', f1: 3500, rev: 0 });
    },
    combo(t, n, S) {
      const notes = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'];
      const k = Math.min(notes.length, 2 + Math.min(5, n || 0));
      for (let i = 0; i < k; i++) S.pluck(notes[i], t + i * 0.045, { vel: 0.12, dur: 0.35, rev: 0.25 });
    },
    zap(t, _, S) {
      S.blip(260, 70, t, { dur: 0.32, vel: 0.1, type: 'sawtooth', glide: 0.28, rev: 0.1 });
      S.noise(t, { dur: 0.25, vel: 0.08, f1: 700, q: 5, rev: 0.05 });
    },
    levelup(t, _, S) {
      ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => S.pluck(n, t + i * 0.07, { vel: 0.13, dur: 0.5, rev: 0.3 }));
      S.bell('G6', t + 0.36, { vel: 0.06, dur: 1.4, ratio: 2, index: 0.8, rev: 0.5 });
    },
    thud(t, v, S) {
      S.noise(t, { dur: 0.05, vel: 0.06 * (v || 1), type: 'lowpass', f1: 800, rev: 0 });
      S.blip(180, 110, t, { dur: 0.05, vel: 0.03 * (v || 1), rev: 0 });
    },
    tick(t, _, S) { S.bell(2600, t, { vel: 0.02, dur: 0.05, ratio: 2.7, index: 0.6, rev: 0 }); },
    whoosh(t, up, S) { S.noise(t, { dur: 0.4, vel: 0.07, f1: up ? 400 : 3000, f2: up ? 3200 : 380, q: 1.1, shape: 'swell', rev: 0.3 }); },
    swap(t, _, S) {
      S.noise(t, { dur: 0.5, vel: 0.05, f1: 600, f2: 4000, q: 1.4, shape: 'swell', rev: 0.4 });
      ['G5', 'D6', 'B5', 'G6'].forEach((n, i) => S.bell(n, t + 0.08 + i * 0.07, { vel: 0.04, dur: 0.6, ratio: 2, index: 0.6, rev: 0.5 }));
    },
    select(t, _, S) { S.bell('E6', t, { vel: 0.045, dur: 0.25, ratio: 2, index: 0.6, rev: 0.1 }); },
    deny(t, _, S) { S.blip(220, 180, t, { dur: 0.08, vel: 0.06, type: 'square', rev: 0 }); },
  };
  K.sfx = function (name, arg, gap) {
    const S = A.sound;
    if (!S.ctx || !A.store.get('sound.enabled') || !SFX[name]) return;
    const n = performance.now();
    if (lastSfx[name] && n - lastSfx[name] < (gap == null ? 28 : gap)) return;
    lastSfx[name] = n;
    if (S.ctx.state === 'suspended') S.ctx.resume().catch(() => {});
    try { SFX[name](S.ctx.currentTime + 0.012, arg, S); } catch (e) { /* audio is best effort */ }
  };

  // ================================================================ card suits
  // Shared glossy suit shapes (100x100 boxes). Solitaire and the box art use them.
  K.SUITS = {
    S: { name: 'spades', red: false, path: 'M50 4 C58 22 94 38 94 62 C94 78 82 86 70 86 C62 86 56 82 53 76 C54 85 58 92 67 96 L33 96 C42 92 46 85 47 76 C44 82 38 86 30 86 C18 86 6 78 6 62 C6 38 42 22 50 4 Z' },
    H: { name: 'hearts', red: true, path: 'M50 92 C22 70 5 52 5 31 C5 15 17 5 31 5 C40 5 47 11 50 20 C53 11 60 5 69 5 C83 5 95 15 95 31 C95 52 78 70 50 92 Z' },
    D: { name: 'diamonds', red: true, path: 'M50 3 C60 20 74 36 90 50 C74 64 60 80 50 97 C40 80 26 64 10 50 C26 36 40 20 50 3 Z' },
    C: { name: 'clubs', red: false, path: 'M50 6 C63 6 72 16 72 28 C72 35 69 40 65 44 C68 43 71 42 74 42 C86 42 95 52 95 64 C95 76 86 86 74 86 C64 86 57 81 53 74 C54 84 58 91 67 96 L33 96 C42 91 46 84 47 74 C43 81 36 86 26 86 C14 86 5 76 5 64 C5 52 14 42 26 42 C29 42 32 43 35 44 C31 40 28 35 28 28 C28 16 37 6 50 6 Z' },
  };

  // ================================================================ box art
  const esc = A.util.escapeHTML;
  function frame(u, title, bgStops, scene, o = {}) {
    const stops = bgStops.map(([off, col]) => `<stop offset="${off}" stop-color="${col}"/>`).join('');
    return `<svg viewBox="0 0 150 200" class="gx-art-svg" aria-hidden="true"><defs>
      <linearGradient id="${u}bg" x1="0" y1="0" x2="${o.diag ? 1 : 0}" y2="1">${stops}</linearGradient>
      <linearGradient id="${u}band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".96"/><stop offset=".5" stop-color="#eef6fc" stop-opacity=".96"/><stop offset=".5" stop-color="#dcebf7" stop-opacity=".96"/><stop offset="1" stop-color="#f4f9fd" stop-opacity=".98"/></linearGradient>
      <linearGradient id="${u}shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="${u}top" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b3d73" stop-opacity=".75"/><stop offset="1" stop-color="#0b3d73" stop-opacity=".2"/></linearGradient>
      <clipPath id="${u}clip"><rect x="1" y="1" width="148" height="198" rx="12"/></clipPath>
      ${o.defs || ''}</defs>
      <g clip-path="url(#${u}clip)">
        <rect width="150" height="200" fill="url(#${u}bg)"/>
        ${scene}
        <rect x="0" y="0" width="150" height="17" fill="url(#${u}top)"/>
        <text x="9" y="11.6" class="gx-art-brand">AERIUM GAMES</text>
        <rect x="0" y="152" width="150" height="48" fill="url(#${u}band)"/>
        <rect x="8" y="160" width="17" height="24" rx="2.5" fill="#fff" stroke="#0b2a4a" stroke-width="1.2"/>
        <text x="16.5" y="177" class="gx-art-rate">A</text>
        <text x="${o.titleX || 86}" y="181" class="gx-art-title" style="font-size:${o.titleSize || 16}px">${esc(title)}</text>
        <path d="M1 1 H149 V78 Q75 96 1 78 Z" fill="url(#${u}shine)" opacity=".7"/>
      </g>
      <rect x="1" y="1" width="148" height="198" rx="12" fill="none" stroke="rgba(11,42,74,.45)" stroke-width="1.2"/>
      <rect x="2.2" y="2.2" width="145.6" height="195.6" rx="11" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1"/>
    </svg>`;
  }
  function glossBubble(cx, cy, r, col, u, i) {
    return `<radialGradient id="${u}b${i}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="${col}" stop-opacity=".55"/><stop offset=".85" stop-color="${col}" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></radialGradient>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${u}b${i})"/><ellipse cx="${cx - r * 0.3}" cy="${cy - r * 0.42}" rx="${r * 0.42}" ry="${r * 0.22}" fill="#fff" opacity=".85"/>`;
  }
  function miniCard(x, y, rot, rank, suit) {
    const sd = K.SUITS[suit];
    const col = sd.red ? '#d42a1e' : '#1a2230';
    return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-22" y="-31" width="44" height="62" rx="5" fill="#fff" stroke="#6b7c8c" stroke-width=".8"/>
      <rect x="-22" y="-31" width="44" height="30" rx="5" fill="#fff" opacity=".6"/>
      <text x="-16" y="-17" class="gx-art-rank" fill="${col}">${rank}</text>
      <path d="${sd.path}" fill="${col}" transform="translate(-11 -8) scale(.22)"/>
      <path d="${sd.path}" fill="${col}" transform="translate(-19.5 -14.5) scale(.07)"/></g>`;
  }
  const ART = {
    minesweeper(u) {
      const tile = (x, y, kind, n) => {
        if (kind === 'open') {
          const cols = { 1: '#1a5fd0', 2: '#1d8a2a', 3: '#d0342c' };
          return `<rect x="${x}" y="${y}" width="27" height="27" rx="4" fill="#e6f2fb" stroke="#9fc1dd" stroke-width=".8"/>` + (n ? `<text x="${x + 13.5}" y="${y + 20}" class="gx-art-num" fill="${cols[n]}">${n}</text>` : '');
        }
        return `<rect x="${x}" y="${y}" width="27" height="27" rx="4" fill="url(#${u}tile)" stroke="#0b4f9c" stroke-width=".8"/><rect x="${x + 2}" y="${y + 1.5}" width="23" height="11" rx="3" fill="#fff" opacity=".55"/>` +
          (kind === 'flag' ? `<path d="M${x + 10} ${y + 21} V${y + 6}" stroke="#1a2230" stroke-width="1.6"/><path d="M${x + 10.5} ${y + 6} L${x + 21} ${y + 10} L${x + 10.5} ${y + 14} Z" fill="#e8402a"/>` : '');
      };
      const grid = [['c', 'o1', 'o2', 'c'], ['o1', 'o', 'o1', 'f'], ['c', 'o1', 'c', 'c'], ['c', 'o2', 'o3', 'c']];
      let tiles = '';
      grid.forEach((row, r) => row.forEach((k, c) => {
        const x = 15 + c * 30, y = 30 + r * 30;
        tiles += k === 'c' ? tile(x, y) : k === 'f' ? tile(x, y, 'flag') : tile(x, y, 'open', Number(k.slice(1)) || 0);
      }));
      return frame(u, 'Minesweeper', [[0, '#0b3d73'], [0.55, '#1f7fd6'], [1, '#8fd3ff']],
        `<path d="M0 0 L60 0 L0 120 Z" fill="#fff" opacity=".08"/>${tiles}
         <circle cx="112" cy="46" r="30" fill="#bfe9ff" opacity=".35"/>
         <image href="${A.asset('icons/mine')}" x="80" y="16" width="64" height="64"/>`,
        { defs: `<linearGradient id="${u}tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9ecff"/><stop offset=".5" stop-color="#5cb4f2"/><stop offset=".5" stop-color="#2f8fe0"/><stop offset="1" stop-color="#6fd0ff"/></linearGradient>` });
    },
    solitaire(u) {
      return frame(u, 'Solitaire', [[0, '#3db048'], [0.6, '#1f8a2c'], [1, '#0f5a1c']],
        `<circle cx="35" cy="40" r="70" fill="#fff" opacity=".12"/>
         ${miniCard(52, 96, -20, 'K', 'H')}${miniCard(75, 88, 0, 'A', 'S')}${miniCard(98, 96, 20, 'Q', 'D')}
         <image href="${A.asset('icons/cards')}" x="98" y="22" width="44" height="44" opacity=".95"/>`, { diag: true });
    },
    pairs(u) {
      const back = (x, y) => `<rect x="${x}" y="${y}" width="44" height="54" rx="7" fill="url(#${u}cb)" stroke="#0a6fa8" stroke-width="1"/><rect x="${x + 3}" y="${y + 3}" width="38" height="22" rx="5" fill="#fff" opacity=".45"/><circle cx="${x + 22}" cy="${y + 30}" r="9" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>`;
      const face = (x, y, ic) => `<rect x="${x}" y="${y}" width="44" height="54" rx="7" fill="#fff" stroke="#6aa6d6" stroke-width="1"/><image href="${A.asset('icons/' + ic)}" x="${x + 5}" y="${y + 9}" width="34" height="34"/>`;
      return frame(u, 'Pairs', [[0, '#1f8fe6'], [0.6, '#7cc8ff'], [1, '#e6f7ff']],
        `<ellipse cx="30" cy="40" rx="30" ry="12" fill="#fff" opacity=".7"/><ellipse cx="118" cy="30" rx="26" ry="9" fill="#fff" opacity=".6"/>
         ${face(20, 40, 'star')}${back(84, 40)}${back(20, 98)}${face(84, 98, 'star')}
         <path d="M76 36 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5z" fill="#fff"/><path d="M70 142 l1.8 5 5 1.8 -5 1.8 -1.8 5 -1.8 -5 -5 -1.8 5 -1.8z" fill="#fff"/>`,
        { defs: `<linearGradient id="${u}cb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ff0ff"/><stop offset=".5" stop-color="#2cc6ea"/><stop offset="1" stop-color="#0e86c2"/></linearGradient>` });
    },
    bubblepop(u) {
      let bubbles = '';
      [[40, 120, 20, '#ff6fb1'], [100, 104, 26, '#6fe05a'], [62, 66, 16, '#4db3ff'], [112, 50, 14, '#ffd84a'], [30, 44, 10, '#b58cff'], [80, 140, 9, '#2cc6ea']].forEach(([x, y, r, c], i) => { bubbles += glossBubble(x, y, r, c, u, i); });
      return frame(u, 'Bubble Pop', [[0, '#7fe6ff'], [0.45, '#1fb4d8'], [1, '#063a6b']],
        `<path d="M20 0 L50 0 L90 160 L40 160 Z" fill="#fff" opacity=".1"/><path d="M80 0 L100 0 L130 160 L100 160 Z" fill="#fff" opacity=".08"/>
         <path d="M0 160 Q10 120 4 100 Q14 125 12 160 Z M130 160 Q140 118 134 96 Q148 124 144 160 Z" fill="#0a5a3c" opacity=".6"/>
         ${bubbles}`, { titleSize: 15.5 });
    },
    tilelagoon(u) {
      const tile = (x, y, ic) => `<g transform="translate(${x} ${y})"><path d="M4 4 H40 V52 H4 Z" fill="#0e6b6b" opacity=".35" transform="translate(3 3)"/><rect x="0" y="0" width="36" height="46" rx="5" fill="#d8c79a"/><rect x="-3" y="-3" width="36" height="46" rx="5" fill="url(#${u}tf)" stroke="#9c8a5a" stroke-width=".8"/><rect x="0" y="-1" width="30" height="18" rx="4" fill="#fff" opacity=".55"/><image href="${A.asset('icons/' + ic)}" x="1" y="5" width="28" height="28"/></g>`;
      return frame(u, 'Tile Lagoon', [[0, '#0e86c2'], [0.5, '#2acebe'], [1, '#b8f5e6']],
        `<ellipse cx="110" cy="36" rx="40" ry="16" fill="#fff" opacity=".18"/>
         ${tile(22, 100, 'fish')}${tile(58, 100, 'flower')}${tile(94, 100, 'leaf')}${tile(40, 58, 'droplet')}${tile(76, 58, 'butterfly')}${tile(58, 22, 'dolphin')}`,
        { titleSize: 15.5, defs: `<linearGradient id="${u}tf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#fbf6e8"/><stop offset="1" stop-color="#efe4c6"/></linearGradient>` });
    },
    more(u) {
      return frame(u, 'More games', [[0, '#ffffff'], [0.5, '#eef3f7'], [1, '#d6e0e9']],
        `<circle cx="75" cy="82" r="44" fill="#fff3a8" opacity=".6"/><image href="${A.asset('icons/gift')}" x="37" y="42" width="76" height="76"/>
         <path d="M28 40 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5z" fill="#ffd62e"/><path d="M122 108 l2 5.5 5.5 2 -5.5 2 -2 5.5 -2 -5.5 -5.5 -2 5.5 -2z" fill="#3aa6f5"/>`, { titleSize: 14.5 });
    },
  };
  K.boxArt = (id) => (ART[id] ? ART[id](A.util.uid('bx')) : '');

  // ================================================================ catalog
  const lvlBest = (sum, levels) => {
    for (const [k, label] of levels) {
      const s = sum.levels[k];
      if (s && s.times && s.times.length) return [['Best time (' + label + ')', K.fmt(s.times[0].t)]];
    }
    return [['Best time', 'None yet']];
  };
  const bestScore = (sum, label = 'High score') => {
    let best = 0;
    Object.values(sum.levels).forEach((s) => { (s.scores || []).forEach((e) => { best = Math.max(best, e.s); }); });
    return [[label, best ? best.toLocaleString() : 'None yet']];
  };
  K.catalog = [
    {
      id: 'minesweeper', name: 'Minesweeper', genre: 'Puzzle', rating: 'Mild cartoon explosions', perf: [1.0, 2.0],
      desc: 'Clear the field without setting off a mine. Every number tells you how many mines touch that square. Try the Flower Garden look for a gentler afternoon.',
      best: (sum) => lvlBest(sum, [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['expert', 'Expert']]),
    },
    {
      id: 'solitaire', name: 'Solitaire', genre: 'Card', rating: 'Bouncing cards', perf: [1.0, 2.0],
      desc: 'The card game everyone plays. Build four foundations from Ace to King, one suit each. Win, and watch the cards bounce all the way home.',
      best: (sum) => bestScore(sum).concat(lvlBest(sum, [['one', 'Draw one'], ['three', 'Draw three']])),
    },
    {
      id: 'pairs', name: 'Pairs', genre: 'Memory', rating: 'Mild sparkles', perf: [1.0, 1.5],
      desc: 'Flip two cards at a time and find every matching pair. Watch out for the shuffle token: it swaps the cards you have not found yet.',
      best: (sum) => {
        for (const k of ['small', 'medium', 'large']) {
          const s = sum.levels[k];
          if (s && s.extra && s.extra.bestMoves) return [['Fewest moves (' + k[0].toUpperCase() + k.slice(1) + ')', String(s.extra.bestMoves)]];
        }
        return [['Fewest moves', 'None yet']];
      },
    },
    {
      id: 'bubblepop', name: 'Bubble Pop', genre: 'Arcade', rating: 'Bubble popping', perf: [2.0, 3.0],
      desc: 'Pop glossy bubbles before they float away. Pop the same color in a row for a combo, grab golden bubbles for extra time, and steer clear of spiky urchins.',
      best: (sum) => bestScore(sum),
    },
    {
      id: 'tilelagoon', name: 'Tile Lagoon', genre: 'Tile matching', rating: 'Calm water', perf: [1.5, 2.5],
      desc: 'A relaxing tile matching game. Pair up free glass tiles with the same picture until the lagoon is clear. A tile is free when nothing covers it and one side is open.',
      best: (sum) => lvlBest(sum, [['turtle', 'Turtle'], ['pyramid', 'Pyramid'], ['butterfly', 'Butterfly']]),
    },
  ];

  // ================================================================ Games folder
  A.apps.register({
    id: 'games',
    name: 'Games',
    icon: 'icons/folder-games',
    color: '#f2b233',
    category: 'games',
    description: 'Play the games that come with Aerium and see your statistics.',
    keywords: ['games', 'play', 'fun', 'explorer', 'folder'],
    single: true,
    window: { width: 880, height: 580, minWidth: 560, minHeight: 400 },
    launch(win) {
      const items = K.catalog.filter((c) => A.apps.get(c.id)).concat([{ id: 'more', name: 'More games', genre: 'Coming soon', more: true }]);
      let selected = null;
      const offs = [];

      const tool = (label, icon, fn, tip) => h('button.ae-tool', { type: 'button', onclick: fn, 'data-tip': tip || null }, icon ? A.img(icon) : null, label);
      const playTool = tool('Play', 'icons/play', () => play(), 'Play the selected game');
      const statsTool = tool('Statistics', 'icons/star', () => showStats(), 'See your statistics for the selected game');
      const toolbar = h('div.ae-toolbar.gx-toolbar', null,
        playTool, h('span.ae-tool-sep'),
        statsTool,
        tool('Options', 'icons/settings', () => folderOptions(), 'Games folder options'),
        tool('Parental Controls', 'icons/shield', () => parental()),
        h('span.gx-spacer'),
        tool('More games', 'icons/gift', () => moreGames()));

      const grid = h('div.gx-grid', { role: 'listbox', 'aria-label': 'Games', tabIndex: 0 });
      const tiles = items.map((it) => {
        const tile = h('button.gx-tile', { type: 'button', role: 'option', dataset: { id: it.id }, class: it.more && 'gx-more', tabIndex: -1 },
          h('span.gx-box', { html: K.boxArt(it.id) }),
          h('span.gx-name', null, it.name));
        tile.addEventListener('click', () => select(it.id));
        tile.addEventListener('dblclick', () => play(it.id));
        tile.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          select(it.id);
          A.ui.menu(it.more ? [{ label: 'Open', bold: true, onClick: () => moreGames() }] : [
            { label: 'Play', bold: true, onClick: () => play(it.id) },
            { label: 'Statistics', onClick: () => showStats() },
            { separator: true },
            { label: 'Create shortcut on the desktop', onClick: () => shortcut(it) },
          ], e.clientX, e.clientY);
        });
        grid.appendChild(tile);
        return tile;
      });
      grid.addEventListener('click', (e) => { if (e.target === grid) select(null); });

      const preview = h('div.gx-preview');
      const strip = h('div.gx-strip');
      const stage = h('div.gx-stage', null, h('div.gx-sky'), grid);
      win.body.classList.add('gx');
      win.body.append(toolbar, h('div.gx-main', null, stage, preview), strip);

      function info(id) { return items.find((i) => i.id === id) || null; }

      function select(id) {
        selected = id;
        tiles.forEach((t) => { const on = t.dataset.id === id; t.classList.toggle('selected', on); t.setAttribute('aria-selected', String(on)); });
        const t = tiles.find((x) => x.dataset.id === id);
        if (t) t.scrollIntoView({ block: 'nearest' });
        render();
      }

      function render() {
        const it = info(selected);
        playTool.disabled = !it || it.more;
        statsTool.disabled = !it || it.more;
        preview.innerHTML = '';
        strip.innerHTML = '';
        if (!it) {
          preview.append(h('div.gx-pv-empty', null, A.img('icons/folder-games', { class: 'gx-pv-folder' }), h('div.gx-pv-hint', null, 'Select a game to see its rating and details.')));
          const total = K.catalog.reduce((n, c) => n + K.summary(c.id).played, 0);
          strip.append(A.img('icons/folder-games', { class: 'gx-strip-icon' }),
            h('div.gx-strip-main', null, h('div.gx-strip-name', null, (items.length - 1) + ' games'),
              h('div.gx-strip-desc', null, total ? 'You have played ' + total + (total === 1 ? ' game' : ' games') + ' on this computer. Homework can wait five more minutes.' : 'Pick a game and have fun. Homework can wait five more minutes.')));
          return;
        }
        if (it.more) {
          preview.append(h('div.gx-pv-art', { html: K.boxArt('more') }), h('div.gx-pv-hint', null, 'New games are on their way. Check back after dinner.'));
          strip.append(A.img('icons/gift', { class: 'gx-strip-icon' }), h('div.gx-strip-main', null, h('div.gx-strip-name', null, 'More games'), h('div.gx-strip-desc', null, 'Aerium Game Corner is getting ready. For now, try beating your best times.')));
          return;
        }
        const app = A.apps.get(it.id);
        const sum = K.summary(it.id);
        preview.append(
          h('div.gx-pv-art', { html: K.boxArt(it.id) }),
          h('div.gx-rating', null,
            h('div.gx-rating-mark', { 'aria-hidden': 'true' }, h('span.gx-rating-a', null, 'A'), h('span.gx-rating-sub', null, 'AERIUM')),
            h('div.gx-rating-text', null,
              h('div.gx-rating-title', null, 'Everyone'),
              h('div.gx-rating-line', null, 'A for Aerium: everyone'),
              h('div.gx-rating-desc', null, it.rating))),
          h('div.gx-perf', null,
            h('div.gx-perf-title', null, 'Performance'),
            h('div.gx-perf-row', null, h('span', null, 'Recommended rating'), h('b', null, it.perf[1].toFixed(1))),
            h('div.gx-perf-row', null, h('span', null, 'Required rating'), h('b', null, it.perf[0].toFixed(1))),
            h('div.gx-perf-row.gx-perf-you', null, A.img('icons/check'), h('span', null, 'Your system'), h('b', null, '5.9'))));
        const rows = [
          ['Games played', String(sum.played)],
          ['Games won', sum.played ? sum.won + ' (' + K.pct(sum) + ')' : '0'],
        ].concat(it.best(sum), [['Last played', sum.last ? A.util.fmtDate(new Date(sum.last)) : 'Never']]);
        strip.append(
          A.img(app.icon, { class: 'gx-strip-icon' }),
          h('div.gx-strip-main', null,
            h('div.gx-strip-name', null, it.name),
            h('div.gx-strip-meta', null, it.genre + ' game  ·  Aerium Games  ·  Version 7.0'),
            h('div.gx-strip-desc', null, it.desc)),
          h('div.gx-strip-stats', null, rows.map(([k, v]) => h('div.gx-kv', null, h('span', null, k + ':'), h('b', null, v)))),
          A.ui.button('Play', { tone: 'aqua', icon: 'icons/play', onClick: () => play(it.id), className: 'gx-play' }));
      }

      function play(id) {
        id = id || selected;
        const it = info(id);
        if (!it) return;
        if (it.more) { moreGames(); return; }
        A.sound.play('select');
        A.apps.launch(id);
      }

      function showStats() {
        const it = info(selected);
        if (!it || it.more) return;
        const sum = K.summary(it.id);
        const rows = [['Games played', String(sum.played)], ['Games won', String(sum.won)], ['Win percentage', K.pct(sum)]].concat(it.best(sum));
        A.ui.dialog({
          parent: win, title: it.name + ' Statistics', icon: A.apps.get(it.id).icon, width: 380,
          content: h('div.gx-stats', null, h('div.gx-stats-head', null, A.img(A.apps.get(it.id).icon), h('div', null, h('div.gx-stats-name', null, it.name), h('div.ae-muted', null, 'Open the game and press F4 for every detail.'))), K.statRows(rows)),
          buttons: [{ label: 'Close', default: true, cancel: true }],
        });
      }

      async function folderOptions() {
        const big = A.ui.radioGroup({ options: [['large', 'Large tiles'], ['xl', 'Extra large tiles']], value: A.store.get('games.folder.tiles', 'large') });
        const refl = A.ui.checkbox({ label: 'Show glossy reflections under the games', checked: A.store.get('games.folder.reflect', true) });
        const r = await K.optionsDialog(win, { title: 'Games folder options', icon: 'icons/folder-games', groups: [{ legend: 'Tile size', content: big }, { legend: 'Looks', content: refl }] });
        if (r !== 'ok') return;
        A.store.set('games.folder.tiles', big.value);
        A.store.set('games.folder.reflect', refl.checked);
        applyLook();
      }
      function applyLook() {
        win.body.classList.toggle('gx-xl', A.store.get('games.folder.tiles', 'large') === 'xl');
        win.body.classList.toggle('gx-noreflect', !A.store.get('games.folder.reflect', true));
      }

      function parental() {
        A.ui.messageBox({
          parent: win, title: 'Parental Controls', icon: 'shield',
          instruction: 'All games are allowed on this account',
          message: 'Every game here is rated A for Aerium: everyone.\n\nHouse rules: finish your homework first, take a break every hour, and let your little brother have a turn.',
          buttons: ['OK'],
        });
      }
      function moreGames() {
        A.ui.messageBox({
          parent: win, title: 'More games', icon: 'icons/gift',
          instruction: 'More games are on their way',
          message: 'Aerium Game Corner opens soon. In the meantime, see if you can beat your best time on Expert.',
          buttons: ['OK'],
        });
      }
      function shortcut(it) {
        try {
          const name = A.fs.uniqueName('/Desktop', it.name + '.lnk');
          A.fs.write(A.fs.join('/Desktop', name), 'app:' + it.id, { mime: 'application/x-aerium-link' });
          A.sound.play('snap');
        } catch (e) {
          A.ui.messageBox({ parent: win, title: 'Games', icon: 'error', message: e.message });
        }
      }

      grid.addEventListener('keydown', (e) => {
        const ids = items.map((i) => i.id);
        let i = ids.indexOf(selected);
        const cols = Math.max(1, Math.round(grid.clientWidth / (tiles[0].offsetWidth + 18)));
        if (e.key === 'Enter') { e.preventDefault(); play(); return; }
        const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
        if (!d) return;
        e.preventDefault();
        i = i < 0 ? 0 : clamp(i + d, 0, ids.length - 1);
        select(ids[i]);
        A.sound.play('hover');
      });

      // Keep the numbers fresh when a game finishes in another window.
      K.catalog.forEach((c) => offs.push(A.store.on(skey(c.id, 'stats'), () => { if (selected === c.id || !selected) render(); })));
      win.on('focus', () => render());

      applyLook();
      select(null);
      setTimeout(() => grid.focus({ preventScroll: true }), 60);

      return {
        onClose() { offs.forEach((off) => off()); },
      };
    },
  });
})();
