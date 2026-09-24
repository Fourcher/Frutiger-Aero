/* Tile Lagoon: a relaxing mahjong-style tile matching game with glossy glass
   tiles that show Aerium's icons. Every deal is solvable. Three layouts,
   hints, undo, shuffle, a lagoon of backgrounds and best times per layout. */
(function () {
  'use strict';
  const A = window.Aerium;
  const K = A.gameKit;
  const { h, clamp } = A.util;
  const ID = 'tilelagoon';

  const ICON = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f3fbfa"/><stop offset="1" stop-color="#dcefeb"/></linearGradient><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fe6d8"/><stop offset="1" stop-color="#0f7470"/></linearGradient><linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#ff8f24"/><stop offset="1" stop-color="#d9520a"/></linearGradient><radialGradient id="g" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#bff6ee" stop-opacity=".9"/><stop offset="1" stop-color="#bff6ee" stop-opacity="0"/></radialGradient></defs><ellipse cx="33" cy="59" rx="23" ry="3.6" fill="#0b2a4a" opacity=".25"/><rect x="22" y="8" width="30" height="38" rx="5.5" fill="url(#s)"/><rect x="18.5" y="4.5" width="30" height="38" rx="5.5" fill="url(#f)" stroke="#5aa9a2" stroke-width="1.2"/><path d="M26 20 C30 12 38 12 42 20 C38 18 30 18 26 20 Z" fill="#35c6ff" opacity=".7"/><rect x="15" y="21" width="30" height="38" rx="5.5" fill="url(#s)"/><rect x="11.5" y="17.5" width="30" height="38" rx="5.5" fill="url(#f)" stroke="#5aa9a2" stroke-width="1.2"/><rect x="11.5" y="40" width="30" height="15.5" rx="5.5" fill="url(#g)"/><path d="M16 36.5 C12 31 10.5 33 11.5 36.5 C10.5 40 12 42 16 36.5 Z" fill="url(#o)"/><ellipse cx="25" cy="36.5" rx="10" ry="6.6" fill="url(#o)"/><path d="M21 30.6 C24 26.5 29 27 31 31 Z" fill="url(#o)"/><circle cx="30" cy="35" r="1.9" fill="#fff"/><circle cx="30.5" cy="35" r="1" fill="#10202e"/><path d="M13 20 H40 V28 Q26.5 32 13 28 Z" fill="#fff" opacity=".6"/></svg>`);

  // Tile symbols: glossy icons that are easy to tell apart.
  const SYMBOLS = ['fish', 'flower', 'butterfly', 'dolphin', 'star', 'heart', 'sun', 'leaf', 'droplet', 'rainbow', 'moon', 'cloud', 'tree', 'music', 'globe', 'gift', 'bell', 'lightbulb', 'mountain', 'camera', 'headphones', 'gamepad', 'disc', 'key', 'lock', 'mail', 'phone', 'chat', 'home', 'clock', 'calendar', 'photo', 'pin', 'cart', 'speaker', 'shield'];

  // Layouts in half-tile units: a tile covers [x, x+2) x [y, y+2) on layer z.
  function block(z, x0, x1, y0, y1, out) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push({ x: x * 2, y: y * 2, z }); }
  function row(z, y, x0, x1, out) { for (let x = x0; x <= x1; x++) out.push({ x: x * 2, y: y * 2, z }); }
  const LAYOUTS = {
    turtle: {
      label: 'Turtle', note: '144 tiles',
      build() {
        const p = [];
        [[0, 1, 12], [1, 3, 10], [2, 2, 11], [3, 1, 12], [4, 1, 12], [5, 2, 11], [6, 3, 10], [7, 1, 12]].forEach(([y, a, b]) => row(0, y, a, b, p));
        p.push({ x: 0, y: 7, z: 0 }, { x: 26, y: 7, z: 0 }, { x: 28, y: 7, z: 0 });
        block(1, 4, 9, 1, 6, p);
        block(2, 5, 8, 2, 5, p);
        block(3, 6, 7, 3, 4, p);
        p.push({ x: 13, y: 7, z: 4 });
        return p;
      },
    },
    butterfly: {
      label: 'Butterfly', note: '104 tiles',
      build() {
        const p = [];
        for (let y = 1; y <= 6; y++) p.push({ x: 12, y: y * 2, z: 0 });
        [[0, 1, 4, 8, 11], [1, 0, 4, 8, 12], [2, 0, 5, 7, 12], [3, 1, 5, 7, 11], [4, 2, 5, 7, 10], [5, 1, 4, 8, 11], [6, 2, 4, 8, 10], [7, 3, 4, 8, 9]].forEach(([y, a, b, c, d]) => { row(0, y, a, b, p); row(0, y, c, d, p); });
        for (let y = 2; y <= 5; y++) p.push({ x: 12, y: y * 2, z: 1 });
        [[1, 2, 3, 9, 10], [2, 1, 4, 8, 11], [3, 2, 4, 8, 10], [5, 2, 3, 9, 10]].forEach(([y, a, b, c, d]) => { row(1, y, a, b, p); row(1, y, c, d, p); });
        p.push({ x: 12, y: 6, z: 2 }, { x: 12, y: 8, z: 2 });
        row(2, 2, 2, 3, p); row(2, 2, 9, 10, p);
        return p;
      },
    },
    pyramid: {
      label: 'Pyramid', note: '84 tiles',
      build() {
        const p = [];
        block(0, 0, 7, 0, 5, p);
        p.push({ x: -2, y: 5, z: 0 }, { x: 16, y: 5, z: 0 });
        block(1, 1, 6, 1, 4, p);
        block(2, 2, 5, 2, 3, p);
        p.push({ x: 6, y: 5, z: 3 }, { x: 8, y: 5, z: 3 });
        return p;
      },
    },
  };
  const LAYOUT_LIST = Object.keys(LAYOUTS).map((k) => [k, LAYOUTS[k].label]);
  const STYLES = [['glass', 'Lagoon glass'], ['ivory', 'Ivory'], ['night', 'Night glass']];
  const SCENES = [['lagoon', 'Lagoon'], ['sky', 'Sky'], ['night', 'Night']];
  const DEFAULTS = { layout: 'turtle', sound: true, animations: true, dimBlocked: false, style: 'glass', scene: 'lagoon' };

  // ---------------------------------------------------------------- rules
  // A tile is free when nothing lies on top of it and its left or right side is open.
  function isFree(tiles, i, present) {
    const t = tiles[i];
    let left = false, right = false;
    for (const j of present) {
      if (j === i) continue;
      const o = tiles[j];
      if (o.z === t.z + 1 && Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2) return false;
      if (o.z === t.z && Math.abs(o.y - t.y) < 2) {
        if (o.x === t.x - 2) left = true;
        else if (o.x === t.x + 2) right = true;
      }
    }
    return !(left && right);
  }

  // Deal symbols by playing the layout ahead of time: repeatedly take away two
  // free tiles and give them the same picture. Replaying those removals in
  // the same order always clears the board, so every deal can be won.
  function deal(tiles, indices, symbolPairs, rnd = Math.random) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const present = new Set(indices);
      const out = new Map();
      const order = [];
      const pairs = A.util.shuffle(symbolPairs, rnd);
      let ok = true;
      for (let k = 0; k < pairs.length; k++) {
        const free = [];
        for (const i of present) if (isFree(tiles, i, present)) free.push(i);
        if (free.length < 2) { ok = false; break; }
        // prefer the tallest tiles so stacks do not get stranded
        free.sort((a, b) => tiles[b].z - tiles[a].z + (rnd() - 0.5) * 1.6);
        const a = free[0];
        const rest = free.slice(1);
        const b = rest[Math.floor(rnd() * Math.min(rest.length, 6))];
        out.set(a, pairs[k]); out.set(b, pairs[k]);
        order.push([a, b]);
        present.delete(a); present.delete(b);
      }
      if (ok) { out.order = order; return out; }
    }
    const out = new Map();
    const flat = A.util.shuffle(symbolPairs.flatMap((s) => [s, s]));
    indices.forEach((i, k) => out.set(i, flat[k]));
    return out;
  }

  const SIDES = { glass: ['#9ff0e4', '#1b8783'], ivory: ['#eadbb0', '#a48f55'], night: ['#4f86c6', '#0b2548'] };
  function mix(a, b, t) {
    const [r1, g1, b1] = A.util.hexToRgb(a), [r2, g2, b2] = A.util.hexToRgb(b);
    return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
  }
  // The tile's thickness: a stack of 1px offset copies fading from light to dark.
  function sideShadow(e, style) {
    const [c1, c2] = SIDES[style] || SIDES.glass;
    const parts = [];
    for (let i = 1; i <= e; i++) parts.push(`${i}px ${i}px 0 ${mix(c1, c2, i / e)}`);
    parts.push(`${e + 1}px ${e + 3}px 6px rgba(0,20,40,.38)`);
    return parts.join(', ');
  }

  // ================================================================ app
  A.apps.register({
    id: ID,
    name: 'Tile Lagoon',
    icon: ICON,
    color: '#1fb4a8',
    category: 'games',
    description: 'Match pairs of free glass tiles until the lagoon is clear.',
    keywords: ['mahjong', 'tiles', 'tile matching', 'solitaire', 'lagoon', 'game'],
    window: { width: 880, height: 640, minWidth: 480, minHeight: 380 },
    tasks: LAYOUT_LIST.map(([k, label]) => ({ label: label + ' layout', icon: 'icons/play', onClick: () => A.apps.launch(ID, { layout: k }) })),
    launch(win, args) {
      let opts = K.options(ID, DEFAULTS);
      if (args && LAYOUTS[args.layout]) opts.layout = args.layout;

      // ---------------------------------------------------------- state
      let tiles = [];
      let present = new Set();
      let sel = -1, history = [], started = false, over = false, busy = false;
      let hintList = [], hintIdx = 0, hintT = 0, streak = 0, streakT = 0;
      let solution = [];
      let pending = [];
      let geo = null;
      const timer = new K.Timer((s) => { timeEl.textContent = K.fmt(s); });

      // ---------------------------------------------------------- DOM
      const board = h('div.tlg-board', { role: 'grid', 'aria-label': 'Tiles' });
      const scene = h('div.tlg-scene', { 'aria-hidden': 'true' }, h('div.tlg-light'));
      const stage = h('div.gk-stage.tlg-stage', null, scene, board);
      const leftEl = h('span', null, '0'), movesEl = h('span', null, '0'), timeEl = h('span', null, '0:00');
      const status = h('div.ae-statusbar.tlg-status', null,
        h('span.tlg-status-tip', null, 'Match two free tiles with the same picture. A tile is free when nothing covers it and its left or right side is open.'),
        h('span.ae-status-cell', null, 'Tiles left: ', leftEl),
        h('span.ae-status-cell', null, 'Matches available: ', movesEl),
        h('span.ae-status-cell', null, 'Time: ', timeEl));
      const menubar = K.menubar({
        name: 'Tile Lagoon',
        newGame: () => newGame(), stats: showStats, options: showOptions, appearance: showAppearance, help: showHelp,
        about: () => K.about(win, { name: 'Tile Lagoon', icon: ICON, blurb: 'Calm water, clear mind. Match the tiles and breathe.' }),
        exit: () => win.close(),
        items: () => [
          { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !history.length || busy || over, onClick: undo },
          { label: 'Hint', shortcut: 'H', disabled: busy || over, onClick: hint },
          { label: 'Shuffle tiles', disabled: busy || over || present.size < 2, onClick: shuffle },
          { separator: true },
          ...LAYOUT_LIST.map(([k, label]) => ({ label: label + ' layout', radio: true, checked: opts.layout === k, onClick: () => changeLayout(k) })),
        ],
      });
      win.body.classList.add('gk-app', 'tlg');
      win.body.append(menubar, stage, status);
      const fx = new K.Particles(stage);

      const snd = (name) => { if (opts.sound) A.sound.play(name); };
      const sfx = (name, arg, g) => { if (opts.sound) K.sfx(name, arg, g); };
      const anim = () => !!opts.animations && !K.reducedMotion();
      function later(fn, ms) { const tm = setTimeout(() => { pending = pending.filter((x) => x !== tm); if (!win.closed) fn(); }, ms); pending.push(tm); return tm; }
      function cancelPending() { pending.forEach(clearTimeout); pending = []; }

      function applyLook() {
        stage.dataset.scene = opts.scene;
        board.dataset.style = opts.style;
        board.classList.toggle('tlg-dim', !!opts.dimBlocked);
        if (geo) board.style.setProperty('--side', sideShadow(geo.e, opts.style));
      }

      // ---------------------------------------------------------- build
      function makeTile(t, i) {
        const el = h('div.tlg-tile', { dataset: { i }, role: 'gridcell', 'aria-label': t.sym },
          h('div.tlg-face', null, A.img('icons/' + t.sym, { class: 'tlg-icon' })));
        el.style.zIndex = String(t.z * 1000 + t.y * 20 + t.x + 60);
        return el;
      }

      function build() {
        cancelPending();
        fx.clear();
        clearHint();
        const L = LAYOUTS[opts.layout] || LAYOUTS.turtle;
        tiles = L.build().map((p) => ({ x: p.x, y: p.y, z: p.z, sym: null, sym0: null, el: null, gone: false }));
        const idx = tiles.map((t, i) => i);
        const syms = A.util.shuffle(SYMBOLS).slice(0, Math.ceil(tiles.length / 4));
        const pairs = [];
        syms.forEach((s) => pairs.push(s, s));
        pairs.length = tiles.length / 2;
        const map = deal(tiles, idx, pairs);
        solution = map.order || [];
        map.forEach((sym, i) => { tiles[i].sym = tiles[i].sym0 = sym; });
        board.innerHTML = '';
        const frag = document.createDocumentFragment();
        tiles.forEach((t, i) => { t.el = makeTile(t, i); frag.appendChild(t.el); });
        board.appendChild(frag);
        present = new Set(idx);
        sel = -1; history = []; started = false; over = false; busy = false; streak = 0; hintIdx = 0;
        timer.reset();
        timeEl.textContent = '0:00';
        layout();
        refresh();
        if (anim()) {
          busy = true;
          tiles.forEach((t) => { t.el.style.setProperty('--dd', Math.round(t.z * 160 + Math.random() * 360) + 'ms'); t.el.classList.add('drop'); });
          later(() => { tiles.forEach((t) => t.el.classList.remove('drop')); busy = false; }, 1400);
          sfx('whoosh', false);
          later(() => sfx('sparkle', 4), 700);
        }
      }

      function layout() {
        const W = stage.clientWidth, H = stage.clientHeight;
        if (!W || !H || !tiles.length) return;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxZ = 0;
        tiles.forEach((t) => { minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x); minY = Math.min(minY, t.y); maxY = Math.max(maxY, t.y); maxZ = Math.max(maxZ, t.z); });
        const wu = (maxX - minX + 2) / 2, hu = (maxY - minY + 2) / 2;
        const E = 0.12, R = 1.3, pad = 22;
        const tw = Math.floor(Math.min((W - pad * 2) / (wu + E * (maxZ + 1)), (H - pad * 2) / (hu * R + E * (maxZ + 1))));
        const TW = clamp(tw, 16, 88), TH = Math.round(TW * R), e = Math.max(2, Math.round(TW * E));
        const bw = wu * TW + e * (maxZ + 1), bh = hu * TH + e * (maxZ + 1);
        geo = { TW, TH, e, minX, minY, ox: Math.round((W - bw) / 2) + e * maxZ, oy: Math.round((H - bh) / 2) + e * maxZ };
        board.style.setProperty('--tw', TW + 'px');
        board.style.setProperty('--th', TH + 'px');
        board.style.setProperty('--side', sideShadow(e, opts.style));
        tiles.forEach(place);
      }
      function place(t) {
        const x = geo.ox + ((t.x - geo.minX) / 2) * geo.TW - t.z * geo.e;
        const y = geo.oy + ((t.y - geo.minY) / 2) * geo.TH - t.z * geo.e;
        t.el.style.transform = `translate(${x}px, ${y}px)`;
        t.px = x; t.py = y;
      }
      function center(t) { return { x: t.px + geo.TW / 2, y: t.py + geo.TH / 2 }; }

      function fitWindow() {
        if (win.state !== 'normal' || win.snap) return;
        const area = A.wm.layer || document.body;
        const target = opts.layout === 'turtle' ? [900, 650] : opts.layout === 'butterfly' ? [860, 640] : [760, 620];
        const w = Math.min(target[0], area.clientWidth - 20), hh = Math.min(target[1], area.clientHeight - 16);
        win.resizeTo(w, hh);
        const r = win.rect;
        if (r.x + w > area.clientWidth - 4 || r.y + hh > area.clientHeight - 4) win.moveTo(Math.max(0, Math.min(r.x, area.clientWidth - w - 4)), Math.max(0, Math.min(r.y, area.clientHeight - hh - 4)));
      }

      // ---------------------------------------------------------- state of play
      function refresh() {
        const free = new Set();
        present.forEach((i) => { if (isFree(tiles, i, present)) free.add(i); });
        tiles.forEach((t, i) => {
          if (t.gone) return;
          const f = free.has(i);
          t.el.classList.toggle('free', f);
          t.el.classList.toggle('blocked', !f);
        });
        const bySym = {};
        free.forEach((i) => { (bySym[tiles[i].sym] = bySym[tiles[i].sym] || []).push(i); });
        hintList = [];
        Object.values(bySym).forEach((list) => { for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) hintList.push([list[a], list[b]]); });
        leftEl.textContent = String(present.size);
        movesEl.textContent = String(hintList.length);
      }

      function setSel(i) {
        if (sel >= 0 && tiles[sel]) tiles[sel].el.classList.remove('sel');
        sel = i;
        if (sel >= 0) tiles[sel].el.classList.add('sel');
      }

      board.addEventListener('click', (e) => {
        const el = e.target.closest('.tlg-tile');
        if (!el || busy || over) return;
        const i = Number(el.dataset.i), t = tiles[i];
        if (!t || t.gone) return;
        if (!isFree(tiles, i, present)) {
          el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny');
          sfx('deny');
          return;
        }
        if (!started) { started = true; timer.start(); }
        clearHint();
        if (sel === i) { setSel(-1); sfx('tap'); return; }
        if (sel >= 0 && tiles[sel].sym === t.sym) { matchPair(sel, i); return; }
        setSel(i);
        sfx('select');
      });

      function matchPair(a, b) {
        history.push([a, b]);
        setSel(-1);
        const ta = tiles[a], tb = tiles[b];
        ta.gone = tb.gone = true;
        present.delete(a); present.delete(b);
        const now = performance.now();
        streak = now - streakT < 4500 ? streak + 1 : 0;
        streakT = now;
        sfx('chime', Math.min(streak, 11));
        [ta, tb].forEach((t) => {
          t.el.classList.remove('free', 'blocked');
          t.el.classList.add('gone');
          if (anim()) {
            const p = center(t);
            fx.burst(p.x, p.y, { count: 10, shape: 'star', colors: ['#ffffff', '#d8fff6', '#fff6c2'], speed: geo.TW * 2.2, life: 0.75, size: Math.max(2.5, geo.TW * 0.06) });
            fx.add({ x: p.x, y: p.y, shape: 'ring', size: geo.TW * 0.3, grow: geo.TW * 2.6, life: 0.4, color: 'rgba(255,255,255,.9)' });
          }
        });
        const cheer = { 3: '3 in a row!', 5: '5 in a row!', 8: 'On a roll!', 12: 'Unstoppable!', 20: 'Lagoon master!' }[streak + 1];
        if (cheer && anim()) { const p = center(tb); fx.text(p.x, p.y - geo.TH * 0.6, cheer, { size: 17 + Math.min(6, streak / 2), color: '#fff6c2' }); }
        later(() => { if (ta.gone) ta.el.hidden = true; if (tb.gone) tb.el.hidden = true; }, 430);
        refresh();
        if (!present.size) { later(winGame, 520); return; }
        if (!hintList.length) later(stuck, 700);
      }

      function undo() {
        if (!history.length || busy || over) return;
        const [a, b] = history.pop();
        [a, b].forEach((i) => { const t = tiles[i]; t.gone = false; present.add(i); t.el.hidden = false; t.el.classList.remove('gone'); });
        setSel(-1);
        clearHint();
        refresh();
        sfx('whoosh', false);
      }

      function clearHint() {
        clearTimeout(hintT);
        board.querySelectorAll('.hint').forEach((el) => el.classList.remove('hint'));
      }
      function hint() {
        if (busy || over) return;
        clearHint();
        if (!hintList.length) { stuck(); return; }
        const [a, b] = hintList[hintIdx++ % hintList.length];
        tiles[a].el.classList.add('hint');
        tiles[b].el.classList.add('hint');
        sfx('select');
        hintT = setTimeout(clearHint, 1700);
      }

      // Mix the pictures of the tiles that are left, keeping the game winnable.
      function shuffle() {
        if (busy || over || present.size < 2) return;
        busy = true;
        clearHint();
        setSel(-1);
        const idx = [...present];
        const count = {};
        idx.forEach((i) => { count[tiles[i].sym] = (count[tiles[i].sym] || 0) + 1; });
        const pairs = [];
        Object.keys(count).forEach((s) => { for (let k = 0; k < Math.floor(count[s] / 2); k++) pairs.push(s); });
        const map = deal(tiles, idx, pairs);
        solution = map.order || [];
        idx.forEach((i) => tiles[i].el.classList.add('flip-out'));
        sfx('swap');
        later(() => {
          map.forEach((sym, i) => { tiles[i].sym = sym; tiles[i].el.querySelector('.tlg-icon').src = A.asset('icons/' + sym); tiles[i].el.setAttribute('aria-label', sym); });
          idx.forEach((i) => { tiles[i].el.classList.remove('flip-out'); tiles[i].el.classList.add('flip-in'); });
          later(() => idx.forEach((i) => tiles[i].el.classList.remove('flip-in')), 360);
          history = [];
          busy = false;
          refresh();
        }, anim() ? 320 : 10);
      }

      async function stuck() {
        if (over || busy || !present.size || hintList.length) return;
        const r = await K.choose(win, {
          title: 'Tile Lagoon', icon: ICON,
          instruction: 'There are no more matches',
          message: 'None of the free tiles can be paired right now.',
          options: [
            { value: 'shuffle', label: 'Shuffle the remaining tiles', note: 'The tiles stay where they are and their pictures are mixed. You can still win.' },
            { value: 'undo', label: 'Undo the last match' },
            { value: 'new', label: 'Start a new game', note: 'This counts as a loss in your statistics.' },
          ],
        });
        if (r === 'shuffle') shuffle();
        else if (r === 'undo') undo();
        else if (r === 'new') { K.record(ID, opts.layout, { won: false }); build(); }
      }

      function winGame() {
        if (over) return;
        over = true;
        timer.stop();
        const secs = Math.max(1, Math.floor(timer.seconds));
        const res = K.record(ID, opts.layout, { won: true, time: secs });
        snd('win');
        if (anim()) {
          const W = stage.clientWidth, H = stage.clientHeight;
          for (let i = 0; i < 9; i++) {
            later(() => {
              fx.burst(W * (0.25 + Math.random() * 0.5), H * (0.3 + Math.random() * 0.35), { count: 16, shape: 'star', colors: ['#ffffff', '#fff6c2', '#bff6ee', '#bfe9ff'], speed: 240, life: 1.1, size: 4 });
              fx.burst(W * (0.2 + Math.random() * 0.6), H * 0.95, { count: 6, shape: 'bubble', colors: ['rgba(255,255,255,.9)'], speed: 120, gravity: -260, drag: 0.97, life: 2, size: 6, spread: 1, angle: -Math.PI / 2 });
            }, i * 170);
          }
        }
        later(async () => {
          const s = res.stats;
          const r = await K.resultDialog(win, {
            won: true, title: 'Game won', icon: ICON,
            instruction: 'The lagoon is clear!',
            message: 'You matched every tile on the ' + LAYOUTS[opts.layout].label + ' layout.',
            badge: res.timeRank === 0 ? 'New best time!' : null,
            rows: [['Time', K.fmt(secs)], ['Best time', K.fmt(s.times.length ? s.times[0].t : secs)], ['Games played', String(s.played)], ['Games won', String(s.won)], ['Win percentage', K.pct(s)]],
            buttons: [{ label: 'Exit', value: 'exit' }, { label: 'Play again', value: 'again', default: true }],
            cancelValue: 'again',
          });
          if (r === 'exit') win.close(true); else build();
        }, anim() ? 1500 : 300);
      }

      // ---------------------------------------------------------- flow
      const inProgress = () => started && !over;
      function restart() {
        cancelPending();
        clearHint();
        tiles.forEach((t) => {
          t.gone = false; t.sym = t.sym0;
          t.el.hidden = false; t.el.classList.remove('gone', 'sel', 'hint');
          t.el.querySelector('.tlg-icon').src = A.asset('icons/' + t.sym);
        });
        present = new Set(tiles.map((t, i) => i));
        sel = -1; history = []; started = false; over = false; busy = false; streak = 0;
        timer.reset();
        timeEl.textContent = '0:00';
        refresh();
        sfx('whoosh', true);
      }
      async function confirmAbandon() {
        if (!inProgress()) return 'new';
        const r = await K.choose(win, {
          title: 'Game in progress', icon: ICON,
          instruction: 'What do you want to do with the game in progress?',
          options: [
            { value: 'new', label: 'Quit and start a new game', note: 'This counts as a loss in your statistics.' },
            { value: 'restart', label: 'Restart this game', note: 'The same tiles from the beginning. This counts as a loss.' },
            { value: 'keep', label: 'Keep playing' },
          ],
        });
        if (r === 'new' || r === 'restart') K.record(ID, opts.layout, { won: false });
        return r || 'keep';
      }
      async function newGame(force) {
        if (!force) {
          const r = await confirmAbandon();
          if (r === 'keep') return;
          if (r === 'restart') { restart(); return; }
        }
        build();
      }
      async function changeLayout(k) {
        if (!LAYOUTS[k]) return;
        const r = await confirmAbandon();
        if (r === 'keep') return;
        opts.layout = k;
        K.saveOptions(ID, opts);
        build();
        fitWindow();
      }

      // ---------------------------------------------------------- dialogs
      function showStats() {
        K.statsDialog(win, {
          name: 'Tile Lagoon', icon: ICON, levels: LAYOUT_LIST, level: opts.layout,
          onReset: () => K.resetStats(ID),
          render(lv) {
            const s = K.stats(ID, lv);
            return h('div', null,
              h('div.gk-stats-h', null, LAYOUTS[lv].label + ' layout'),
              h('div.gk-stats-sub', null, 'Best times'),
              s.times.length ? h('ol.gk-best-list', null, s.times.map((e, i) => h('li', null, h('span', null, (i + 1) + '.'), h('span', null, A.util.fmtDate(new Date(e.d))), h('span', null, K.fmt(e.t))))) : h('div.gk-best-empty', null, 'Clear the lagoon to set your first best time.'),
              h('div.gk-stats-sub', null, 'Games'),
              K.statRows([
                ['Games played', String(s.played)], ['Games won', String(s.won)], ['Win percentage', K.pct(s)],
                ['Longest winning streak', String(s.bestWin)], ['Current streak', K.streakText(s)],
              ]));
          },
        });
      }
      async function showOptions() {
        let layoutPick = opts.layout;
        const rg = A.ui.radioGroup({ options: LAYOUT_LIST.map(([k, label]) => [k, label + ' (' + LAYOUTS[k].note + ')']), value: layoutPick, onChange: (v) => { layoutPick = v; } });
        const cb = (label, key) => { const c = A.ui.checkbox({ label, checked: !!opts[key] }); c.key = key; return c; };
        const checks = [cb('Play sounds', 'sound'), cb('Show animations', 'animations'), cb('Dim tiles that are not free', 'dimBlocked')];
        const r = await K.optionsDialog(win, {
          title: 'Options', icon: ICON,
          groups: [{ legend: 'Layout', content: rg }, { legend: 'Other', content: h('div.gk-options-checks', null, checks) }],
        });
        if (r !== 'ok') return;
        checks.forEach((c) => { opts[c.key] = c.checked; });
        K.saveOptions(ID, opts);
        applyLook();
        if (layoutPick !== opts.layout) changeLayout(layoutPick);
      }
      async function showAppearance() {
        let style = opts.style, sc = opts.scene;
        const styles = K.chooser({
          className: 'tlg-styles', value: style, onChange: (v) => { style = v; },
          items: STYLES.map(([v, label]) => ({ value: v, label, preview: h('span.tlg-mini', { dataset: { style: v } }, h('span.tlg-tile.free', { style: { '--tw': '44px', '--th': '57px', '--side': sideShadow(5, v) } }, h('span.tlg-face', null, A.img('icons/fish', { class: 'tlg-icon' })))) })),
        });
        const scenes = K.chooser({
          className: 'tlg-scenes', value: sc, onChange: (v) => { sc = v; },
          items: SCENES.map(([v, label]) => ({ value: v, label, preview: h('span.tlg-scene-swatch', { dataset: { scene: v } }) })),
        });
        const r = await K.optionsDialog(win, { title: 'Change appearance', icon: 'icons/personalize', width: 460, groups: [{ legend: 'Tiles', content: styles }, { legend: 'Background', content: scenes }] });
        if (r !== 'ok') return;
        opts.style = style; opts.scene = sc;
        K.saveOptions(ID, opts);
        applyLook();
      }
      function showHelp() {
        K.helpDialog(win, {
          name: 'Tile Lagoon', icon: ICON,
          intro: 'Clear every tile from the lagoon by matching pairs.',
          sections: [
            ['Matching', ['Click a free tile, then click another free tile with the same picture. Both float away.', 'Click a selected tile again to put it down.']],
            ['Free tiles', 'A tile is free when no tile sits on top of it and at least one of its long sides, left or right, is open. Tiles that are not free cannot be picked up.'],
            ['Every deal can be won', 'Tile Lagoon only deals games that can be solved. If you get stuck, use Undo, or shuffle the pictures of the tiles that are left.'],
            ['Shortcuts', ['H shows a hint, Ctrl+Z undoes a match.', 'F2 starts a new game, F4 shows statistics, F5 opens Options and F7 changes the tiles and the background.']],
            ['Layouts', 'Turtle is the classic 144-tile stack. Butterfly and Pyramid are a little quicker. Each layout keeps its own best times.'],
          ],
        });
      }

      // ---------------------------------------------------------- keys & life
      K.keys(win, {
        newGame: () => newGame(), stats: showStats, options: showOptions, appearance: showAppearance, help: showHelp,
        key: (e) => {
          const k = e.key.toLowerCase();
          if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); }
          else if (k === 'h' && !e.ctrlKey) { e.preventDefault(); hint(); }
          else if (k === 'escape' && sel >= 0) { e.preventDefault(); setSel(-1); }
        },
      });
      const offResize = K.observe(stage, layout);
      win.on('minimize', () => timer.pause('min'));
      win.on('restore', () => timer.resume('min'));

      applyLook();
      build();
      setTimeout(fitWindow, 0);

      // Test hook (harmless): play the guaranteed solution quickly.
      K.debug = K.debug || {};
      K.debug.tilelagoon = {
        solve(leave = 0) {
          busy = false;
          if (!started) { started = true; timer.start(120); }
          const steps = solution.filter(([a, b]) => present.has(a) && present.has(b));
          steps.slice(0, Math.max(0, steps.length - leave)).forEach(([a, b], k) => later(() => { if (present.has(a) && present.has(b)) matchPair(a, b); }, k * 40));
        },
        state: () => ({ tiles: tiles.length, left: present.size, matches: hintList.length, over }),
      };

      return {
        onClose() {
          cancelPending();
          clearHint();
          timer.destroy();
          fx.destroy();
          offResize();
          if (K.debug && K.debug.tilelagoon) delete K.debug.tilelagoon;
        },
        onArgs(a) { if (a && LAYOUTS[a.layout] && a.layout !== opts.layout) changeLayout(a.layout); },
        keepAwake: () => inProgress() && win.state !== 'minimized',
      };
    },
  });
})();
