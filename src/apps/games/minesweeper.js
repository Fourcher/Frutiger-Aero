/* Minesweeper: glossy glass tiles or the Flower Garden, rippling openings,
   chain explosions (or blooming flowers), a sparkle sweep when you win,
   chording, question marks, saved games and per-level statistics. */
(function () {
  'use strict';
  const A = window.Aerium;
  const K = A.gameKit;
  const { h, clamp } = A.util;
  const ID = 'minesweeper';

  const LEVELS = {
    beginner: { label: 'Beginner', rows: 9, cols: 9, mines: 10, cell: 34 },
    intermediate: { label: 'Intermediate', rows: 16, cols: 16, mines: 40, cell: 29 },
    expert: { label: 'Expert', rows: 16, cols: 30, mines: 99, cell: 26 },
  };
  const LEVEL_LIST = [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['expert', 'Expert'], ['custom', 'Custom']];
  const DEFAULTS = { level: 'beginner', custom: { rows: 20, cols: 24, mines: 90 }, sound: true, animations: true, marks: true, skin: 'glass', autoSave: false, autoContinue: false };

  // ------------------------------------------------------------ glyphs
  const svgURL = (s) => 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s) + '")';
  const MINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="b" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#9bb3cc"/><stop offset=".42" stop-color="#2d3c52"/><stop offset="1" stop-color="#070b12"/></radialGradient><radialGradient id="c" cx=".5" cy="1" r=".62"><stop offset="0" stop-color="#8ff0ff" stop-opacity=".75"/><stop offset="1" stop-color="#8ff0ff" stop-opacity="0"/></radialGradient></defs><g stroke="#1b2636" stroke-width="5" stroke-linecap="round"><path d="M32 7V57M7 32H57M14.3 14.3L49.7 49.7M49.7 14.3L14.3 49.7"/></g><g fill="#2c3a4e"><circle cx="32" cy="7" r="3.4"/><circle cx="32" cy="57" r="3.4"/><circle cx="7" cy="32" r="3.4"/><circle cx="57" cy="32" r="3.4"/></g><circle cx="32" cy="32" r="18" fill="url(#b)" stroke="#04070b" stroke-width="1.4"/><circle cx="32" cy="32" r="18" fill="url(#c)"/><ellipse cx="25.5" cy="24" rx="8" ry="4.6" fill="#fff" opacity=".8" transform="rotate(-32 25.5 24)"/></svg>`;
  const flowerSVG = (p1, p2, p3) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="p" cx=".5" cy=".25" r=".85"><stop offset="0" stop-color="${p1}"/><stop offset=".6" stop-color="${p2}"/><stop offset="1" stop-color="${p3}"/></radialGradient><radialGradient id="y" cx=".38" cy=".32" r=".72"><stop offset="0" stop-color="#fff8c8"/><stop offset=".6" stop-color="#ffd12e"/><stop offset="1" stop-color="#e98a10"/></radialGradient></defs><g stroke="${p3}" stroke-width="1" stroke-opacity=".6">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="32" cy="17" rx="9.5" ry="13.5" fill="url(#p)" transform="rotate(${a} 32 32)"/>`).join('')}</g><circle cx="32" cy="32" r="8.5" fill="url(#y)" stroke="#c46a00" stroke-width=".8"/><ellipse cx="29.5" cy="28.8" rx="4" ry="2.4" fill="#fff" opacity=".75"/></svg>`;
  const FLOWERS = [flowerSVG('#fff0f7', '#ff82c4', '#d63a86'), flowerSVG('#fffbe0', '#ffd84a', '#e8970c'), flowerSVG('#f4fbff', '#9fd6ff', '#3a8fe0'), flowerSVG('#fff4ff', '#e2a2ff', '#9a4ad6')];
  const FLAG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb09a"/><stop offset=".5" stop-color="#f2482c"/><stop offset=".52" stop-color="#df3a20"/><stop offset="1" stop-color="#ff7a5a"/></linearGradient></defs><ellipse cx="29" cy="55" rx="13" ry="3.6" fill="#0b2a4a" opacity=".3"/><path d="M27 11V55" stroke="#26303d" stroke-width="4.2" stroke-linecap="round"/><path d="M29 10 C37 12 44 8 53 14 C47 19 40 22 29 31 Z" fill="url(#f)" stroke="#a31d10" stroke-width="1.3" stroke-linejoin="round"/><path d="M31 13 C38 14.5 42 12.5 47 15 C41 17 36 19.5 31 22.5 Z" fill="#fff" opacity=".5"/></svg>`;
  const STAKE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c98a4a"/><stop offset="1" stop-color="#8a5424"/></linearGradient><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6b0"/><stop offset=".5" stop-color="#ffc21a"/><stop offset="1" stop-color="#f08a12"/></linearGradient></defs><ellipse cx="29" cy="56" rx="12" ry="3.4" fill="#2a4a10" opacity=".35"/><rect x="25" y="10" width="5" height="47" rx="2" fill="url(#w)"/><path d="M30 11 H52 L47 19 L52 27 H30 Z" fill="url(#f)" stroke="#b86a00" stroke-width="1.2" stroke-linejoin="round"/><path d="M32 13 H47 L44.5 17 H32 Z" fill="#fff" opacity=".55"/></svg>`;
  const CROSS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M14 14L50 50M50 14L14 50" stroke="#fff" stroke-width="11" stroke-linecap="round"/><path d="M14 14L50 50M50 14L14 50" stroke="#e0301e" stroke-width="6.5" stroke-linecap="round"/></svg>`;
  const DAISY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="10" cy="5.4" rx="2.3" ry="4" fill="#fff" transform="rotate(${a} 10 10)"/>`).join('')}<circle cx="10" cy="10" r="2.6" fill="#ffd12e"/></svg>`;
  const CLOVER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 11 Q11 15 13 18.5" stroke="#2f7a1f" stroke-width="1.3" fill="none"/><g fill="#b9f78a" stroke="#3d8f22" stroke-width=".8"><circle cx="10" cy="6" r="3.5"/><circle cx="6.1" cy="11" r="3.5"/><circle cx="13.9" cy="11" r="3.5"/></g><g fill="#fff" opacity=".7"><circle cx="9" cy="5" r="1.1"/><circle cx="5.2" cy="10" r="1.1"/><circle cx="13" cy="10" r="1.1"/></g></svg>`;

  const ORB_GLYPH = {
    ready: '<path d="M24 9 C25 19 29 23 39 24 C29 25 25 29 24 39 C23 29 19 25 9 24 C19 23 23 19 24 9 Z" fill="#fff"/><circle cx="35" cy="14" r="2.2" fill="#fff" opacity=".85"/>',
    garden: `<g fill="#fff">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="24" cy="15.5" rx="4.6" ry="7" transform="rotate(${a} 24 24)"/>`).join('')}</g><circle cx="24" cy="24" r="4.2" fill="#ffe36a" stroke="#fff" stroke-width="1"/>`,
    gasp: '<circle cx="24" cy="24" r="9" fill="none" stroke="#fff" stroke-width="4.5"/>',
    won: '<path d="M13 25 L21 33 L36 15" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>',
    lost: '<path d="M15 15 L33 33 M33 15 L15 33" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>',
  };

  // ------------------------------------------------------------ app
  A.apps.register({
    id: ID,
    name: 'Minesweeper',
    icon: 'icons/mine',
    color: '#3f86e0',
    category: 'games',
    description: 'Clear the field without setting off a mine.',
    keywords: ['mines', 'minesweeper', 'winmine', 'puzzle', 'flower garden', 'game'],
    window: { width: 380, height: 500, minWidth: 300, minHeight: 360 },
    tasks: [
      { label: 'Beginner', icon: 'icons/play', onClick: () => A.apps.launch(ID, { level: 'beginner' }) },
      { label: 'Intermediate', icon: 'icons/play', onClick: () => A.apps.launch(ID, { level: 'intermediate' }) },
      { label: 'Expert', icon: 'icons/play', onClick: () => A.apps.launch(ID, { level: 'expert' }) },
    ],
    launch(win, args) {
      let opts = K.options(ID, DEFAULTS);
      if (args && LEVELS[args.level]) opts.level = args.level;

      // game state
      let rows = 9, cols = 9, mines = 10, n = 81;
      let mine, count, open, mark, els = [], nbCache = [];
      let started = false, over = false, placed = false, opened = 0, flags = 0, moves = 0;
      let press = null, kf = -1, cs = 30;
      let pendingTimers = [];
      let sweepIv = 0;
      let butterflyT = 0;

      const timer = new K.Timer((s) => { timeEl.textContent = String(Math.min(999, s)); });

      // ---------------------------------------------------------- DOM
      const orb = h('button.mnw-orb', { type: 'button', 'aria-label': 'New game', 'data-tip': 'New game (F2)', onclick: () => newGame() });
      const timeEl = h('span.mnw-num', null, '0');
      const mineEl = h('span.mnw-num', null, '10');
      const mineIcon = A.img('icons/mine', { class: 'mnw-pill-icon' });
      const hud = h('div.mnw-hud', null,
        h('div.mnw-pill', { 'data-tip': 'Time' }, A.img('icons/clock', { class: 'mnw-pill-icon' }), timeEl),
        orb,
        h('div.mnw-pill', { 'data-tip': 'Mines left' }, mineEl, mineIcon));
      const board = h('div.mnw-board', { role: 'grid', 'aria-label': 'Minefield' });
      const sweep = h('div.mnw-sweep', { 'aria-hidden': 'true' });
      const frame = h('div.mnw-frame', null, board, sweep);
      const scene = h('div.mnw-scene', { 'aria-hidden': 'true' });
      const butterfly = h('div.mnw-butterfly', { 'aria-hidden': 'true', html: butterflySVG() });
      const stage = h('div.gk-stage.mnw-stage', null, scene, h('div.mnw-center', null, frame), hud, butterfly);
      const menubar = K.menubar({
        name: 'Minesweeper',
        newGame: () => newGame(), stats: showStats, options: showOptions, appearance: showAppearance,
        help: showHelp, about: () => K.about(win, { name: 'Minesweeper', icon: 'icons/mine', blurb: 'Watch your step. Or your flowers.' }),
        exit: () => win.close(),
        items: () => [
          ...LEVEL_LIST.map(([k, label]) => ({ label, radio: true, checked: opts.level === k, onClick: () => changeLevel(k) })),
        ],
      });
      win.body.classList.add('gk-app', 'mnw');
      win.body.append(menubar, stage);
      const fx = new K.Particles(stage);

      board.style.setProperty('--mnw-mine', svgURL(MINE));
      board.style.setProperty('--mnw-flag', svgURL(FLAG));
      board.style.setProperty('--mnw-stake', svgURL(STAKE));
      board.style.setProperty('--mnw-cross', svgURL(CROSS));
      board.style.setProperty('--mnw-daisy', svgURL(DAISY));
      board.style.setProperty('--mnw-clover', svgURL(CLOVER));
      FLOWERS.forEach((f, i) => board.style.setProperty('--mnw-flower' + i, svgURL(f)));

      // ---------------------------------------------------------- setup
      function dims() {
        if (opts.level === 'custom') {
          const c = opts.custom;
          const r = clamp(c.rows, 9, 24), co = clamp(c.cols, 9, 30);
          return { rows: r, cols: co, mines: clamp(c.mines, 10, (r - 1) * (co - 1)), cell: 26 };
        }
        return LEVELS[opts.level] || LEVELS.beginner;
      }

      function build(keepMines) {
        cancelPending();
        fx.clear();
        const d = dims();
        if (!keepMines) { rows = d.rows; cols = d.cols; mines = d.mines; }
        n = rows * cols;
        if (!keepMines) { mine = new Uint8Array(n); placed = false; }
        count = count && keepMines ? count : new Uint8Array(n);
        open = new Uint8Array(n);
        mark = new Uint8Array(n);
        started = false; over = false; opened = 0; flags = 0; moves = 0; press = null;
        nbCache = [];
        board.innerHTML = '';
        board.classList.remove('mnw-over');
        board.style.gridTemplateColumns = `repeat(${cols}, var(--cs))`;
        els = new Array(n);
        const frag = document.createDocumentFragment();
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / cols), c = i % cols;
          const el = h('div.mnw-cell', { role: 'gridcell', dataset: { i } }, h('span.mnw-n'));
          if ((r + c) % 2) el.classList.add('alt');
          const deco = Math.random();
          if (deco < 0.05) el.classList.add('deco1'); else if (deco < 0.09) el.classList.add('deco2');
          els[i] = el;
          frag.appendChild(el);
        }
        board.appendChild(frag);
        timer.reset();
        timeEl.textContent = '0';
        updateCounter();
        setOrb('ready');
        kf = -1;
        sweep.classList.remove('run');
        layout();
      }

      function neighbors(i) {
        if (nbCache[i]) return nbCache[i];
        const r = Math.floor(i / cols), c = i % cols, out = [];
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
        }
        return (nbCache[i] = out);
      }

      function placeMines(safe) {
        const ban = new Set([safe]);
        if (n - mines >= 9) neighbors(safe).forEach((x) => ban.add(x));
        const pool = [];
        for (let i = 0; i < n; i++) if (!ban.has(i)) pool.push(i);
        A.util.shuffle(pool).slice(0, mines).forEach((i) => { mine[i] = 1; });
        computeCounts();
        placed = true;
      }
      function computeCounts() {
        count = new Uint8Array(n);
        for (let i = 0; i < n; i++) if (!mine[i]) count[i] = neighbors(i).reduce((s, x) => s + mine[x], 0);
      }

      function layout() {
        const W = stage.clientWidth, H = stage.clientHeight;
        if (!W || !H) return;
        const hudH = hud.offsetHeight || 56;
        const availW = W - 32 - 20, availH = H - hudH - 26 - 20;
        cs = clamp(Math.floor(Math.min(availW / cols, availH / rows)), 12, 64);
        board.style.setProperty('--cs', cs + 'px');
        stage.style.setProperty('--cs', cs + 'px');
      }

      // Size the window to suit the level (not when maximized or snapped).
      function fitWindow() {
        if (win.state !== 'normal' || win.snap) return;
        const d = dims();
        const area = A.wm.layer || document.body;
        const maxW = area.clientWidth - 20, maxH = area.clientHeight - 20;
        let cell = d.cell;
        const chromeW = 16 + 52, chromeH = 30 + 9 + 23 + 58 + 46;
        cell = Math.min(cell, Math.floor((maxW - chromeW) / d.cols), Math.floor((maxH - chromeH) / d.rows));
        cell = Math.max(14, cell);
        const w = Math.max(300, d.cols * cell + chromeW), hh = Math.max(360, d.rows * cell + chromeH);
        win.resizeTo(w, hh);
        const r = win.rect;
        if (r.x + w > area.clientWidth - 4 || r.y + hh > area.clientHeight - 4) win.moveTo(Math.max(0, Math.min(r.x, area.clientWidth - w - 4)), Math.max(0, Math.min(r.y, area.clientHeight - hh - 4)));
      }

      // ---------------------------------------------------------- appearance
      function applySkin() {
        const garden = opts.skin === 'garden';
        win.body.classList.toggle('mnw-garden', garden);
        win.body.classList.toggle('mnw-glass', !garden);
        board.classList.toggle('mnw-anim', !!opts.animations && !K.reducedMotion());
        mineIcon.src = A.asset(garden ? 'icons/flower' : 'icons/mine');
        const theme = document.documentElement.dataset.theme || 'light';
        const img = garden ? 'imagery/meadow' : theme === 'dark' ? 'imagery/aurora' : theme === 'technozen' ? 'imagery/technozen' : 'imagery/clear-sky';
        scene.style.backgroundImage = `url("${A.asset(img)}")`;
        setOrb(orbState);
        scheduleButterfly();
      }

      let orbState = 'ready';
      function setOrb(state) {
        orbState = state;
        const glyph = state === 'ready' && opts.skin === 'garden' ? ORB_GLYPH.garden : ORB_GLYPH[state];
        orb.className = 'mnw-orb is-' + state;
        orb.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">${glyph}</svg>`;
      }

      function updateCounter() { mineEl.textContent = String(mines - flags); }

      // ---------------------------------------------------------- play
      const anim = () => !!opts.animations && !K.reducedMotion();
      const sfx = (name, arg, gap) => { if (opts.sound) K.sfx(name, arg, gap); };
      const snd = (name) => { if (opts.sound) A.sound.play(name); };

      function startIfNeeded(i) {
        if (!placed) placeMines(i);
        if (!started) { started = true; timer.start(); }
      }

      function reveal(i) {
        if (over || open[i] || mark[i] === 1) return;
        startIfNeeded(i);
        moves++;
        if (mine[i]) { lose(i); return; }
        openFrom([i]);
        checkWin();
      }

      function openFrom(origins) {
        const list = [];
        const q = [];
        origins.forEach((o) => { if (!open[o] && mark[o] !== 1 && !mine[o]) { open[o] = 1; q.push(o); } });
        for (let head = 0; head < q.length; head++) {
          const c = q[head];
          list.push(c);
          if (count[c] === 0) {
            for (const nb of neighbors(c)) {
              if (!open[nb] && mark[nb] !== 1 && !mine[nb]) { open[nb] = 1; q.push(nb); }
            }
          }
        }
        const o = origins[0], or = Math.floor(o / cols), oc = o % cols;
        const doAnim = anim();
        list.forEach((c) => {
          const r = Math.floor(c / cols), cc = c % cols;
          const d = doAnim ? Math.min(1200, Math.hypot(r - or, cc - oc) * 36) : 0;
          paintOpen(c, d);
        });
        opened += list.length;
        if (list.length > 10) sfx('ripple', list.length); else if (list.length) sfx('tap');
      }

      function paintOpen(c, delay) {
        const el = els[c];
        el.style.setProperty('--d', Math.round(delay) + 'ms');
        if (mark[c] === 2) { mark[c] = 0; el.classList.remove('q'); }
        el.classList.add('open');
        if (count[c]) { el.firstChild.textContent = count[c]; el.classList.add('n' + count[c]); }
      }

      function toggleMark(i) {
        if (over || open[i]) return;
        const prev = mark[i];
        const next = prev === 0 ? 1 : prev === 1 ? (opts.marks ? 2 : 0) : 0;
        mark[i] = next;
        if (prev === 1) flags--;
        if (next === 1) flags++;
        const el = els[i];
        el.classList.toggle('flag', next === 1);
        el.classList.toggle('q', next === 2);
        if (next === 1) { el.classList.remove('flag-in'); void el.offsetWidth; el.classList.add('flag-in'); snd('flag'); }
        else sfx('tap');
        updateCounter();
      }

      function chord(i) {
        if (over || !open[i] || !count[i]) return;
        const nbs = neighbors(i);
        const f = nbs.filter((x) => mark[x] === 1).length;
        const hidden = nbs.filter((x) => !open[x] && mark[x] !== 1);
        if (!hidden.length) return;
        if (f !== count[i]) {
          hidden.forEach((x) => { const el = els[x]; el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny'); });
          sfx('deny');
          return;
        }
        moves++;
        const bad = hidden.find((x) => mine[x]);
        if (bad != null) { lose(bad); return; }
        openFrom(hidden);
        checkWin();
      }

      function checkWin() {
        if (!over && opened === n - mines) winGame();
      }

      function cellCenter(i) {
        const sr = stage.getBoundingClientRect(), r = els[i].getBoundingClientRect();
        return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
      }

      function later(fn, ms) { const t = setTimeout(() => { pendingTimers = pendingTimers.filter((x) => x !== t); fn(); }, ms); pendingTimers.push(t); return t; }
      function cancelPending() { pendingTimers.forEach(clearTimeout); pendingTimers = []; clearInterval(sweepIv); sweepIv = 0; }

      // ---------------------------------------------------------- lose
      function lose(hit) {
        over = true;
        timer.stop();
        setOrb('lost');
        board.classList.add('mnw-over');
        const hr = Math.floor(hit / cols), hc = hit % cols;
        const list = [];
        for (let i = 0; i < n; i++) if (mine[i] && mark[i] !== 1) list.push(i);
        list.sort((a, b) => Math.hypot(Math.floor(a / cols) - hr, (a % cols) - hc) - Math.hypot(Math.floor(b / cols) - hr, (b % cols) - hc));
        const garden = opts.skin === 'garden';
        snd('lose');
        const doAnim = anim();
        let t = 0;
        list.forEach((i, k) => {
          const fn = () => detonate(i, k, garden, doAnim);
          if (!doAnim) fn();
          else { later(fn, t); t += Math.max(22, 170 * Math.pow(0.9, k)); }
        });
        const wrongAt = doAnim ? t + 150 : 0;
        const markWrong = () => { for (let i = 0; i < n; i++) if (mark[i] === 1 && !mine[i]) els[i].classList.add('wrong'); };
        if (doAnim) later(markWrong, wrongAt); else markWrong();
        const res = K.record(ID, opts.level, { won: false });
        K.set(ID, 'saved', null);
        later(() => loseDialog(res.stats), (doAnim ? wrongAt : 0) + 700);
      }

      function detonate(i, k, garden, doAnim) {
        const el = els[i];
        el.style.setProperty('--d', '0ms');
        el.classList.add('open', 'mine');
        if (garden) el.classList.add('fl' + (i % 4));
        el.classList.add(k === 0 ? 'hit' : 'chain');
        if (!doAnim) return;
        const p = cellCenter(i);
        if (garden) {
          const cols4 = [['#ff9ccf', '#ffd1e8', '#fff'], ['#ffe066', '#fff3b0', '#fff'], ['#9fd6ff', '#d7eeff', '#fff'], ['#dca0ff', '#f0d6ff', '#fff']][i % 4];
          fx.burst(p.x, p.y, { count: 1, shape: 'glow', color: cols4[0], size: cs * 0.9, life: 0.4, speed: 1 });
          fx.burst(p.x, p.y, { count: 9, shape: 'petal', colors: cols4, speed: cs * 5, gravity: 160, drag: 0.93, life: 1.1, size: cs * 0.2, spin: 9 });
          fx.burst(p.x, p.y, { count: 3, shape: 'star', color: '#fffbe0', speed: cs * 3, life: 0.7, size: cs * 0.08 });
          sfx('bloom', k, 30);
        } else {
          fx.burst(p.x, p.y, { count: 1, shape: 'glow', color: '#ffb347', size: cs * (k ? 1.1 : 1.8), life: 0.35, speed: 1 });
          fx.burst(p.x, p.y, { count: k ? 9 : 16, shape: 'spark', colors: ['#fff6c2', '#ffc14d', '#ff7a2a'], speed: cs * 11, drag: 0.9, life: 0.45, size: 2.4 });
          fx.burst(p.x, p.y, { count: 5, shape: 'chip', colors: ['#d4efff', '#78c2f4', '#ffffff'], speed: cs * 7, gravity: 1100, drag: 0.97, life: 0.9, size: cs * 0.2, spin: 16 });
          fx.burst(p.x, p.y, { count: 3, shape: 'smoke', colors: ['rgba(70,90,110,.5)', 'rgba(110,130,150,.45)'], speed: cs * 0.8, gravity: -40, drag: 0.97, life: 1.3, size: cs * 0.45, grow: cs * 0.9 });
          fx.add({ x: p.x, y: p.y, shape: 'ring', size: cs * 0.3, grow: cs * 7, life: 0.32, color: 'rgba(255,225,170,.95)' });
          sfx('boom', k === 0, 30);
          if (k === 0) { frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake'); }
        }
      }

      async function loseDialog(s) {
        if (win.closed) return;
        const r = await K.resultDialog(win, {
          won: false, title: 'Game lost', icon: opts.skin === 'garden' ? 'icons/flower' : 'icons/mine',
          instruction: 'Sorry, you lost this game. Better luck next time!',
          rows: [
            ['Time', Math.floor(timer.seconds) + ' seconds'],
            ['Best time', s.times.length ? s.times[0].t + ' seconds' : 'None yet'],
            ['Games played', String(s.played)], ['Games won', String(s.won)], ['Win percentage', K.pct(s)],
          ],
          buttons: [{ label: 'Exit', value: 'exit' }, { label: 'Restart this game', value: 'restart' }, { label: 'Play again', value: 'again', default: true }],
          cancelValue: 'none',
        });
        if (r === 'exit') win.close(true);
        else if (r === 'restart') restartSame();
        else if (r === 'again') newGame(true);
      }

      // ---------------------------------------------------------- win
      function winGame() {
        over = true;
        timer.stop();
        const time = Math.max(1, Math.floor(timer.seconds));
        timeEl.textContent = String(Math.min(999, time));
        setOrb('won');
        board.classList.add('mnw-over');
        const doAnim = anim();
        let k = 0;
        for (let i = 0; i < n; i++) {
          if (mine[i] && mark[i] !== 1) {
            mark[i] = 1; flags++;
            const el = els[i];
            if (doAnim) later(() => { el.classList.add('flag', 'flag-in'); }, 80 + k * 26); else el.classList.add('flag');
            k++;
          }
        }
        updateCounter();
        snd('win');
        if (doAnim) runSweep();
        const res = K.record(ID, opts.level, { won: true, time });
        K.set(ID, 'saved', null);
        later(() => winDialog(time, res), doAnim ? 1600 : 200);
      }

      function runSweep() {
        sweep.classList.remove('run');
        void sweep.offsetWidth;
        sweep.classList.add('run');
        const dur = 1150;
        for (let c = 0; c < cols; c++) {
          later(() => {
            for (let r = 0; r < rows; r++) {
              const el = els[r * cols + c];
              el.classList.remove('shine'); void el.offsetWidth; el.classList.add('shine');
            }
          }, (c / cols) * dur * 0.8 + 80);
        }
        const t0 = performance.now();
        clearInterval(sweepIv);
        sweepIv = setInterval(() => {
          const f = (performance.now() - t0) / dur;
          if (f > 1) { clearInterval(sweepIv); sweepIv = 0; return; }
          const c = clamp(Math.floor(f * cols), 0, cols - 1);
          for (let j = 0; j < 2; j++) {
            const i = Math.floor(Math.random() * rows) * cols + c;
            const p = cellCenter(i);
            fx.burst(p.x, p.y, { count: 1, shape: 'star', colors: ['#ffffff', '#d4f4ff', '#fff6c2'], speed: 30, life: 0.8, size: cs * 0.11 });
          }
        }, 40);
        sfx('sparkle', 7);
      }

      async function winDialog(time, res) {
        if (win.closed) return;
        const s = res.stats;
        const best = s.times.length ? s.times[0].t : time;
        const r = await K.resultDialog(win, {
          won: true, title: 'Game won', icon: 'icons/mine',
          instruction: 'Congratulations, you won the game!',
          badge: res.timeRank === 0 ? 'New best time!' : null,
          rows: [
            ['Time', time + ' seconds'], ['Best time', best + ' seconds'], ['Date', A.util.fmtDate()],
            ['Games played', String(s.played)], ['Games won', String(s.won)], ['Win percentage', K.pct(s)],
          ],
          buttons: [{ label: 'Exit', value: 'exit' }, { label: 'Play again', value: 'again', default: true }],
          cancelValue: 'none',
        });
        if (r === 'exit') win.close(true);
        else if (r === 'again') newGame(true);
      }

      // ---------------------------------------------------------- game flow
      const inProgress = () => started && !over;

      // Vista's famous question when you leave a game half played.
      async function confirmAbandon() {
        if (!inProgress()) return 'new';
        const r = await K.choose(win, {
          title: 'Game in progress', icon: 'icons/mine',
          instruction: 'What do you want to do with the game in progress?',
          options: [
            { value: 'new', label: 'Quit and start a new game', note: 'This counts as a loss in your statistics.' },
            { value: 'restart', label: 'Restart this game', note: 'This counts as a loss in your statistics.' },
            { value: 'keep', label: 'Keep playing' },
          ],
        });
        if (r === 'new' || r === 'restart') K.record(ID, opts.level, { won: false });
        return r || 'keep';
      }

      async function newGame(force) {
        if (!force) {
          const r = await confirmAbandon();
          if (r === 'keep') return;
          if (r === 'restart') { restartSame(); return; }
        }
        K.set(ID, 'saved', null);
        build(false);
        sfx('whoosh', true);
      }

      function restartSame() {
        if (!placed) { build(false); return; }
        const keep = mine;
        build(true);
        mine = keep; placed = true;
        computeCounts();
        K.set(ID, 'saved', null);
      }

      async function changeLevel(level) {
        if (level === 'custom') { showOptions('custom'); return; }
        const r = await confirmAbandon();
        if (r === 'keep') return;
        opts.level = level;
        K.saveOptions(ID, opts);
        K.set(ID, 'saved', null);
        build(false);
        fitWindow();
      }

      // ---------------------------------------------------------- save / resume
      function snapshot() {
        const marks = {}, opens = [];
        for (let i = 0; i < n; i++) { if (mark[i]) marks[i] = mark[i]; if (open[i]) opens.push(i); }
        const mi = [];
        for (let i = 0; i < n; i++) if (mine[i]) mi.push(i);
        return { level: opts.level, rows, cols, mines, mine: mi, open: opens, marks, time: timer.seconds, moves };
      }
      function resume(st) {
        rows = st.rows; cols = st.cols; mines = st.mines;
        n = rows * cols;
        mine = new Uint8Array(n);
        st.mine.forEach((i) => { mine[i] = 1; });
        build(true);
        mine = new Uint8Array(n);
        st.mine.forEach((i) => { mine[i] = 1; });
        placed = true;
        computeCounts();
        st.open.forEach((i) => { open[i] = 1; paintOpen(i, 0); });
        opened = st.open.length;
        Object.keys(st.marks).forEach((k) => {
          const i = Number(k), v = st.marks[k];
          mark[i] = v;
          if (v === 1) { flags++; els[i].classList.add('flag'); } else els[i].classList.add('q');
        });
        moves = st.moves || 0;
        updateCounter();
        started = true;
        timer.start(st.time || 0);
      }

      // ---------------------------------------------------------- input
      function cellOf(t) { const el = t && t.closest && t.closest('.mnw-cell'); return el && board.contains(el) ? Number(el.dataset.i) : -1; }

      function paintPress() {
        board.querySelectorAll('.pressed').forEach((el) => el.classList.remove('pressed'));
        if (!press || press.cell < 0) return;
        const i = press.cell;
        const list = press.mode === 'chord' ? [i].concat(neighbors(i)) : [i];
        list.forEach((x) => { if (!open[x] && mark[x] !== 1) els[x].classList.add('pressed'); });
      }

      function onMove(e) {
        if (!press) return;
        const i = cellOf(e.target);
        if (i !== press.cell) { press.cell = i; paintPress(); }
      }
      function onUp(e) {
        if (!press) return;
        const p = press;
        if (p.mode === 'chord') {
          press = null;
          if (p.cell >= 0) { if (open[p.cell]) chord(p.cell); }
        } else if (e.button === 0) {
          press = null;
          if (p.cell >= 0) reveal(p.cell);
        } else return;
        paintPress();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (!over) setOrb('ready');
      }
      board.addEventListener('mousedown', (e) => {
        if (over) return;
        const i = cellOf(e.target);
        if (i < 0) return;
        const both = (e.buttons & 3) === 3;
        if (e.button === 1 || both) {
          e.preventDefault();
          press = { mode: 'chord', cell: i };
        } else if (e.button === 0) {
          press = { mode: 'reveal', cell: i };
        } else if (e.button === 2) {
          if (!press) toggleMark(i);
          return;
        } else return;
        setOrb('gasp');
        paintPress();
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
      board.addEventListener('contextmenu', (e) => e.preventDefault());
      board.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });

      // Touch: tap reveals (mouse emulation), long press flags.
      let touchT = 0, touchCell = -1;
      board.addEventListener('touchstart', (e) => {
        touchCell = cellOf(e.target);
        clearTimeout(touchT);
        touchT = setTimeout(() => { if (touchCell >= 0) { toggleMark(touchCell); touchCell = -2; } }, 480);
      }, { passive: true });
      board.addEventListener('touchend', (e) => { clearTimeout(touchT); if (touchCell === -2) e.preventDefault(); }, { passive: false });
      board.addEventListener('touchmove', () => clearTimeout(touchT), { passive: true });

      // Keyboard play: arrows move, Space/Enter opens (or chords), F flags.
      function setKf(i) {
        if (kf >= 0 && els[kf]) els[kf].classList.remove('kfocus');
        kf = i;
        if (kf >= 0) els[kf].classList.add('kfocus');
      }
      function keyPlay(e) {
        const dirs = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
        if (dirs[e.key]) {
          e.preventDefault();
          if (kf < 0) { setKf(Math.floor(rows / 2) * cols + Math.floor(cols / 2)); return; }
          const r = clamp(Math.floor(kf / cols) + dirs[e.key][0], 0, rows - 1), c = clamp((kf % cols) + dirs[e.key][1], 0, cols - 1);
          setKf(r * cols + c);
          return;
        }
        if (kf < 0) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (open[kf]) chord(kf); else reveal(kf); }
        else if (e.key === 'f' || e.key === 'F' || e.key === '?') { e.preventDefault(); toggleMark(kf); }
      }

      K.keys(win, { newGame: () => newGame(), stats: showStats, options: () => showOptions(), appearance: showAppearance, help: showHelp, key: keyPlay });

      // ---------------------------------------------------------- dialogs
      function showStats() {
        K.statsDialog(win, {
          name: 'Minesweeper', icon: 'icons/mine', levels: LEVEL_LIST, level: opts.level,
          onReset: () => K.resetStats(ID),
          render(level) {
            const s = K.stats(ID, level);
            const label = LEVEL_LIST.find((l) => l[0] === level)[1];
            return h('div', null,
              h('div.gk-stats-h', null, label),
              h('div.gk-stats-sub', null, 'Best times'),
              s.times.length ? h('ol.gk-best-list', null, s.times.map((e, i) => h('li', null, h('span', null, (i + 1) + '.'), h('span', null, A.util.fmtDate(new Date(e.d))), h('span', null, e.t + ' s')))) : h('div.gk-best-empty', null, 'No wins yet. You can do it!'),
              h('div.gk-stats-sub', null, 'Games'),
              K.statRows([
                ['Games played', String(s.played)], ['Games won', String(s.won)], ['Win percentage', K.pct(s)],
                ['Longest winning streak', String(s.bestWin)], ['Longest losing streak', String(s.bestLose)], ['Current streak', K.streakText(s)],
              ]));
          },
        });
      }

      async function showOptions(focus) {
        let level = focus === 'custom' ? 'custom' : opts.level;
        const hField = K.numberField('Height (9-24):', opts.custom.rows, 9, 24);
        const wField = K.numberField('Width (9-30):', opts.custom.cols, 9, 30);
        const mField = K.numberField('Mines (10-667):', opts.custom.mines, 10, 667);
        const customBox = h('div.mnw-custom', null, hField, wField, mField);
        const setCustomEnabled = () => { [hField, wField, mField].forEach((f) => { f.input.disabled = level !== 'custom'; }); customBox.classList.toggle('off', level !== 'custom'); };
        const rg = A.ui.radioGroup({
          options: [['beginner', 'Beginner (10 mines, 9 x 9 tiles)'], ['intermediate', 'Intermediate (40 mines, 16 x 16 tiles)'], ['expert', 'Expert (99 mines, 16 x 30 tiles)'], ['custom', 'Custom']],
          value: level, onChange: (v) => { level = v; setCustomEnabled(); },
        });
        setCustomEnabled();
        const cb = (label, key) => { const c = A.ui.checkbox({ label, checked: !!opts[key] }); c.key = key; return c; };
        const checks = [cb('Play sounds', 'sound'), cb('Display animations', 'animations'), cb('Allow question marks (right-click twice)', 'marks'), cb('Always save a game in progress when you exit', 'autoSave'), cb('Always continue saved games', 'autoContinue')];
        const r = await K.optionsDialog(win, {
          title: 'Options', icon: 'icons/mine', width: 440,
          groups: [
            { legend: 'Difficulty', content: h('div.mnw-diff', null, rg, customBox) },
            { legend: 'Other', content: h('div.gk-options-checks', null, checks) },
          ],
        });
        if (r !== 'ok') return;
        const custom = { rows: hField.value, cols: wField.value, mines: Math.min(mField.value, (hField.value - 1) * (wField.value - 1)) };
        checks.forEach((c) => { opts[c.key] = c.checked; });
        const sizeChanged = level !== opts.level || (level === 'custom' && JSON.stringify(custom) !== JSON.stringify(opts.custom));
        if (sizeChanged) {
          const choice = await confirmAbandon();
          if (choice !== 'keep') {
            opts.level = level; opts.custom = custom;
            K.saveOptions(ID, opts);
            applySkin();
            K.set(ID, 'saved', null);
            build(false);
            fitWindow();
            return;
          }
        }
        opts.custom = custom;
        K.saveOptions(ID, opts);
        applySkin();
      }

      async function showAppearance() {
        let skin = opts.skin;
        const chooser = K.chooser({
          className: 'mnw-skins', value: skin, onChange: (v) => { skin = v; },
          items: [
            { value: 'glass', label: 'Classic glass', preview: skinPreview('glass') },
            { value: 'garden', label: 'Flower Garden', preview: skinPreview('garden') },
          ],
        });
        const r = await K.optionsDialog(win, { title: 'Change appearance', icon: 'icons/personalize', width: 400, groups: [{ legend: 'Choose a look', content: chooser }] });
        if (r !== 'ok') return;
        opts.skin = skin;
        K.saveOptions(ID, opts);
        applySkin();
      }

      function skinPreview(skin) {
        const g = h('div.mnw-preview', { class: skin === 'garden' ? 'mnw-garden' : 'mnw-glass' });
        const cells = ['c', 'o1', 'o', 'c', 'o2', 'o1', 'f', 'c', 'm'];
        const b = h('div.mnw-board.mnw-mini');
        ['--mnw-mine', '--mnw-flag', '--mnw-stake', '--mnw-flower0', '--mnw-daisy'].forEach((k) => b.style.setProperty(k, board.style.getPropertyValue(k)));
        b.style.setProperty('--cs', '30px');
        b.style.gridTemplateColumns = 'repeat(3, 30px)';
        cells.forEach((k, i) => {
          const el = h('div.mnw-cell', null, h('span.mnw-n'));
          if (i % 2) el.classList.add('alt');
          if (k.startsWith('o')) { el.classList.add('open'); if (k[1]) { el.classList.add('n' + k[1]); el.firstChild.textContent = k[1]; } }
          if (k === 'f') el.classList.add('flag');
          if (k === 'm') el.classList.add('open', 'mine', 'fl0');
          if (skin === 'garden' && k === 'c' && i === 3) el.classList.add('deco1');
          b.appendChild(el);
        });
        g.appendChild(b);
        return g;
      }

      function showHelp() {
        K.helpDialog(win, {
          name: 'Minesweeper', icon: 'icons/mine',
          intro: 'Find every safe square without setting off a mine.',
          sections: [
            ['The goal', 'Open all the squares that do not hide a mine. Your first click is always safe.'],
            ['Reading the numbers', 'A number tells you how many mines touch that square, including diagonals. A blank square has no mines around it, so its neighbors open automatically in a ripple.'],
            ['Mouse controls', ['Left-click a square to open it.', 'Right-click to plant a flag where you think a mine is. Right-click again for a question mark, and once more to clear it.', 'Chording: when a number already has the right amount of flags around it, click it with both buttons (or the middle button) to open all its other neighbors at once.']],
            ['Keyboard', ['Arrow keys move around the field.', 'Space or Enter opens a square (or chords on a number).', 'F plants or removes a flag.', 'F2 starts a new game, F4 shows your statistics, F5 opens Options and F7 changes the look.']],
            ['Tips', ['Start in the corners and along the edges.', 'A 1 touching only one hidden square means that square is a mine.', 'Try the Flower Garden look in Change appearance. The mines turn into flowers.']],
          ],
        });
      }

      // ---------------------------------------------------------- Flower Garden butterfly
      function scheduleButterfly() {
        clearTimeout(butterflyT);
        if (opts.skin !== 'garden' || !anim()) return;
        butterflyT = setTimeout(() => {
          if (win.closed) return;
          if (win.state !== 'minimized') {
            butterfly.classList.remove('fly');
            butterfly.style.setProperty('--by', Math.round(10 + Math.random() * 50) + '%');
            void butterfly.offsetWidth;
            butterfly.classList.add('fly');
          }
          scheduleButterfly();
        }, 14000 + Math.random() * 16000);
      }

      // ---------------------------------------------------------- window life
      const offResize = K.observe(stage, layout);
      win.on('minimize', () => timer.pause('min'));
      win.on('restore', () => timer.resume('min'));
      const offTheme = A.bus.on('theme:change', applySkin);

      applySkin();
      build(false);
      setTimeout(fitWindow, 0);

      // Offer to continue a saved game.
      const saved = K.get(ID, 'saved', null);
      if (saved && saved.mine && saved.rows) {
        if (opts.autoContinue) resumeSaved(saved);
        else {
          setTimeout(async () => {
            const r = await K.choose(win, {
              title: 'Saved game', icon: 'icons/mine', sound: false,
              instruction: 'Do you want to continue your saved game?',
              options: [
                { value: 'yes', label: 'Continue the saved game', note: saved.level === 'custom' ? 'Custom field' : LEVELS[saved.level] ? LEVELS[saved.level].label : '' },
                { value: 'no', label: 'Start a new game', note: 'The saved game counts as a loss in your statistics.' },
              ],
            });
            if (r === 'yes') resumeSaved(saved);
            else if (r === 'no') { K.record(ID, saved.level, { won: false }); K.set(ID, 'saved', null); }
          }, 350);
        }
      }
      function resumeSaved(st) {
        opts.level = st.level;
        resume(st);
        K.set(ID, 'saved', null);
        fitWindow();
      }

      // Test hook (harmless): lets the screenshot helper win or lose on demand.
      K.debug = K.debug || {};
      K.debug.minesweeper = {
        win: () => { if (!placed) placeMines(0); started = true; timer.start(3 + Math.random() * 30); const safe = []; for (let i = 0; i < n; i++) if (!mine[i] && !open[i]) safe.push(i); openFrom(safe); checkWin(); },
        lose: () => { if (!placed) placeMines(0); started = true; timer.start(); const m = mine.indexOf(1); lose(m); },
        open: (i) => reveal(i == null ? Math.floor(n / 2) : i),
        state: () => ({ rows, cols, mines, opened, over, started }),
      };

      return {
        async beforeClose() {
          if (!inProgress()) return true;
          if (opts.autoSave) { K.set(ID, 'saved', snapshot()); return true; }
          const r = await K.choose(win, {
            title: 'Exit game', icon: 'icons/mine',
            instruction: 'Do you want to save this game?',
            message: 'You can pick up right where you left off next time.',
            options: [
              { value: 'save', label: 'Save', note: 'Continue this game next time you open Minesweeper.' },
              { value: 'nosave', label: "Don't save", note: 'This counts as a loss in your statistics.' },
            ],
            cancelLabel: 'Cancel',
          });
          if (r === 'save') { K.set(ID, 'saved', snapshot()); return true; }
          if (r === 'nosave') { K.record(ID, opts.level, { won: false }); K.set(ID, 'saved', null); return true; }
          return false;
        },
        onClose() {
          cancelPending();
          clearTimeout(butterflyT);
          clearTimeout(touchT);
          timer.destroy();
          fx.destroy();
          offResize();
          offTheme();
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          if (K.debug && K.debug.minesweeper) delete K.debug.minesweeper;
        },
        onArgs(a) { if (a && LEVELS[a.level] && a.level !== opts.level) changeLevel(a.level); },
        keepAwake: () => inProgress() && win.state !== 'minimized',
      };
    },
  });

  function butterflySVG() {
    return `<svg viewBox="0 0 40 32" aria-hidden="true"><defs><radialGradient id="mnwbw" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#e8f8ff"/><stop offset=".55" stop-color="#5cc6ff"/><stop offset="1" stop-color="#1a6fd0"/></radialGradient></defs>
      <g class="mnw-wing-l"><path d="M19 16 C10 2 2 4 3 11 C4 16 10 17 19 16 Z M19 17 C11 18 6 24 9 28 C12 31 17 25 19 17 Z" fill="url(#mnwbw)" stroke="#0b3d73" stroke-width=".8"/></g>
      <g class="mnw-wing-r"><path d="M21 16 C30 2 38 4 37 11 C36 16 30 17 21 16 Z M21 17 C29 18 34 24 31 28 C28 31 23 25 21 17 Z" fill="url(#mnwbw)" stroke="#0b3d73" stroke-width=".8"/></g>
      <path d="M20 9 V26" stroke="#0b2a4a" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  }
})();
