/* Pairs: a memory matching game with glossy icon cards, 3D flips, a shuffle
   token that swaps the cards you have not found yet, sparkles on every match,
   a cheerful end screen with star ratings and best scores per board size. */
(function () {
  'use strict';
  const A = window.Aerium;
  const K = A.gameKit;
  const { h, clamp } = A.util;
  const ID = 'pairs';

  const SIZES = {
    small: { label: 'Small', cols: 5, rows: 3, note: '7 pairs' },
    medium: { label: 'Medium', cols: 5, rows: 5, note: '12 pairs' },
    large: { label: 'Large', cols: 7, rows: 5, note: '17 pairs' },
  };
  const SIZE_LIST = [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']];
  const ICONS = ['fish', 'flower', 'butterfly', 'dolphin', 'star', 'heart', 'sun', 'leaf', 'droplet', 'rainbow', 'moon', 'cloud', 'tree', 'music', 'globe', 'gift', 'bell', 'lightbulb', 'mountain', 'snow', 'camera', 'headphones', 'gamepad', 'disc'];
  const BACKS = [['aqua', 'Aqua bubbles'], ['meadow', 'Meadow'], ['sunset', 'Sunset'], ['aurora', 'Aurora']];
  const TABLES = [['auto', 'Match the theme'], ['sky', 'Sky'], ['garden', 'Garden'], ['pearl', 'Pearl'], ['night', 'Night']];
  const DEFAULTS = { size: 'medium', sound: true, animations: true, peek: true, token: true, back: 'aqua', table: 'auto' };

  const starSVG = (on, u) => `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${on ? '#fff6c2' : '#eef3f7'}"/><stop offset=".5" stop-color="${on ? '#ffd62e' : '#d6e0e9'}"/><stop offset="1" stop-color="${on ? '#f08a12' : '#a9b8c6'}"/></linearGradient></defs><path d="M32 5 L40 23 L59 25 L45 38 L49 57 L32 47 L15 57 L19 38 L5 25 L24 23 Z" fill="url(#${u})" stroke="${on ? '#c46a00' : '#8a9aaa'}" stroke-width="2" stroke-linejoin="round"/><path d="M22 26 Q32 14 42 26 Q32 22 22 26 Z" fill="#fff" opacity=".75"/></svg>`;

  A.apps.register({
    id: ID,
    name: 'Pairs',
    icon: 'icons/pairs',
    color: '#46b83a',
    category: 'games',
    description: 'Flip the cards and find every matching pair.',
    keywords: ['memory', 'match', 'concentration', 'cards', 'pairs', 'game'],
    window: { width: 640, height: 620, minWidth: 380, minHeight: 400 },
    tasks: SIZE_LIST.map(([k, label]) => ({ label: label + ' board', icon: 'icons/play', onClick: () => A.apps.launch(ID, { size: k }) })),
    launch(win, args) {
      let opts = K.options(ID, DEFAULTS);
      if (args && SIZES[args.size]) opts.size = args.size;

      // ---------------------------------------------------------- state
      let deck = [];            // [{ id, icon, token, el, slot, up, matched }]
      let slots = [];           // slot index -> card
      let cols = 5, rows = 5;
      let first = null, second = null, lock = false;
      let moves = 0, found = 0, pairs = 0, streak = 0;
      let started = false, finished = false, tokenUsed = false;
      let pending = [];
      let kf = -1;
      let cw = 80, chh = 104, gap = 10, ox = 0, oy = 0;

      const timer = new K.Timer((s) => { timeEl.textContent = K.fmt(s); });

      // ---------------------------------------------------------- DOM
      const board = h('div.prs-board', { role: 'grid', 'aria-label': 'Cards' });
      const scene = h('div.prs-scene', { 'aria-hidden': 'true' });
      const endLayer = h('div.prs-end-layer');
      const timeEl = h('span.prs-num', null, '0:00');
      const movesEl = h('span.prs-num', null, '0');
      const pairsEl = h('span.prs-num', null, '0/0');
      const hud = h('div.prs-hud', null,
        h('div.prs-pill', { 'data-tip': 'Time' }, A.img('icons/clock', { class: 'prs-pill-icon' }), timeEl),
        h('div.prs-pill', { 'data-tip': 'Moves' }, h('span.prs-pill-label', null, 'Moves'), movesEl),
        h('div.prs-pill', { 'data-tip': 'Pairs found' }, A.img('icons/heart', { class: 'prs-pill-icon' }), pairsEl));
      const stage = h('div.gk-stage.prs-stage', null, scene, h('div.prs-center', null, board), hud, endLayer);
      const menubar = K.menubar({
        name: 'Pairs',
        newGame: () => newGame(), stats: showStats, options: showOptions, appearance: showAppearance, help: showHelp,
        about: () => K.about(win, { name: 'Pairs', icon: 'icons/pairs', blurb: 'A game for people who never forget a face. Or a fish.' }),
        exit: () => win.close(),
        items: () => SIZE_LIST.map(([k, label]) => ({ label: label + ' board', radio: true, checked: opts.size === k, onClick: () => changeSize(k) })),
      });
      win.body.classList.add('gk-app', 'prs');
      win.body.append(menubar, stage);
      const fx = new K.Particles(stage);

      const snd = (name) => { if (opts.sound) A.sound.play(name); };
      const sfx = (name, arg, g) => { if (opts.sound) K.sfx(name, arg, g); };
      const anim = () => !!opts.animations && !K.reducedMotion();
      function later(fn, ms) { const t = setTimeout(() => { pending = pending.filter((x) => x !== t); if (!win.closed) fn(); }, ms); pending.push(t); return t; }
      function cancelPending() { pending.forEach(clearTimeout); pending = []; }

      // ---------------------------------------------------------- look
      function applyLook() {
        const theme = document.documentElement.dataset.theme || 'light';
        const table = opts.table === 'auto' ? (theme === 'dark' ? 'night' : theme === 'technozen' ? 'pearl' : 'sky') : opts.table;
        stage.dataset.table = table;
        board.dataset.back = opts.back;
      }

      // ---------------------------------------------------------- layout
      function layout() {
        const W = stage.clientWidth, H = stage.clientHeight;
        if (!W || !H) return;
        const hudH = hud.offsetHeight || 58;
        const availW = W - 40, availH = H - hudH - 34;
        gap = clamp(Math.round(Math.min(availW / cols, availH / rows) * 0.12), 6, 16);
        const byW = (availW - gap * (cols - 1)) / cols;
        const byH = ((availH - gap * (rows - 1)) / rows) * 0.78;
        cw = Math.floor(clamp(Math.min(byW, byH), 34, 170));
        chh = Math.round(cw / 0.78);
        board.style.width = (cols * cw + (cols - 1) * gap) + 'px';
        board.style.height = (rows * chh + (rows - 1) * gap) + 'px';
        board.style.setProperty('--cw', cw + 'px');
        board.style.setProperty('--ch', chh + 'px');
        deck.forEach(placeCard);
      }
      const slotXY = (i) => [(i % cols) * (cw + gap), Math.floor(i / cols) * (chh + gap)];
      function placeCard(card) {
        const [x, y] = slotXY(card.slot);
        card.el.style.transform = `translate(${x}px, ${y}px)`;
      }
      function center(card) {
        const r = card.el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
        return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
      }
      function fitWindow() {
        if (win.state !== 'normal' || win.snap) return;
        const sz = SIZES[opts.size] || SIZES.medium;
        const area = A.wm.layer || document.body;
        const card = sz.cols > 5 ? 86 : 92;
        let w = sz.cols * card + (sz.cols - 1) * 12 + 40 + 16;
        let hh = sz.rows * Math.round(card / 0.78) + (sz.rows - 1) * 12 + 58 + 34 + 30 + 23 + 9;
        w = Math.min(Math.max(380, w), area.clientWidth - 20);
        hh = Math.min(Math.max(400, hh), area.clientHeight - 16);
        win.resizeTo(w, hh);
        const r = win.rect;
        if (r.x + w > area.clientWidth - 4 || r.y + hh > area.clientHeight - 4) win.moveTo(Math.max(0, Math.min(r.x, area.clientWidth - w - 4)), Math.max(0, Math.min(r.y, area.clientHeight - hh - 4)));
      }

      // ---------------------------------------------------------- build
      function makeCard(d, id) {
        const front = d.token
          ? h('div.prs-face.prs-front.prs-token', null, h('span.prs-halo'), A.img('icons/sync', { class: 'prs-icon' }), h('span.prs-token-label', null, 'Shuffle'))
          : h('div.prs-face.prs-front', null, h('span.prs-halo'), A.img('icons/' + d.icon, { class: 'prs-icon' }));
        const el = h('div.prs-card', { role: 'gridcell', 'aria-label': 'Face-down card', dataset: { id } },
          h('div.prs-inner', null, h('div.prs-face.prs-back', null, h('span.prs-emblem')), front));
        const card = { id, icon: d.icon || null, token: !!d.token, el, slot: 0, up: false, matched: false };
        el.addEventListener('click', () => flip(card));
        return card;
      }

      function build() {
        cancelPending();
        fx.clear();
        endLayer.classList.remove('show');
        endLayer.innerHTML = '';
        const sz = SIZES[opts.size] || SIZES.medium;
        cols = sz.cols; rows = sz.rows;
        const n = cols * rows;
        const useToken = !!opts.token;
        pairs = Math.floor((n - 1) / 2);
        const list = [];
        A.util.shuffle(ICONS).slice(0, pairs).forEach((ic) => { list.push({ icon: ic }, { icon: ic }); });
        if (useToken) list.push({ token: true });
        const order = A.util.shuffle(list);
        board.innerHTML = '';
        deck = [];
        slots = new Array(n).fill(null);
        const skip = useToken ? -1 : Math.floor(n / 2);
        let k = 0;
        for (let i = 0; i < n; i++) {
          if (i === skip) continue;
          const card = makeCard(order[k++], deck.length);
          card.slot = i;
          slots[i] = card;
          deck.push(card);
          board.appendChild(card.el);
        }
        if (skip >= 0) {
          const hole = h('div.prs-hole', { 'aria-hidden': 'true' }, A.img('icons/pairs'));
          hole.style.gridArea = 'auto';
          board.appendChild(hole);
          deck.hole = hole;
        }
        first = second = null; lock = false; moves = 0; found = 0; streak = 0;
        started = false; finished = false; tokenUsed = false; kf = -1;
        timer.reset();
        timeEl.textContent = '0:00';
        updateHud();
        layout();
        placeHole();
        if (anim()) {
          deck.forEach((c, i) => { c.el.style.setProperty('--dd', i * 24 + 'ms'); c.el.classList.add('deal'); });
          later(() => deck.forEach((c) => c.el.classList.remove('deal')), 700 + deck.length * 24);
        }
        if (opts.peek) later(peek, anim() ? 750 + deck.length * 24 : 250);
      }
      function placeHole() {
        if (!deck.hole) return;
        const [x, y] = slotXY(Math.floor((cols * rows) / 2));
        deck.hole.style.transform = `translate(${x}px, ${y}px)`;
      }

      function updateHud() {
        movesEl.textContent = String(moves);
        pairsEl.textContent = found + '/' + pairs;
      }

      // ---------------------------------------------------------- play
      function setUp(card, up) {
        card.up = up;
        card.el.classList.toggle('up', up);
        card.el.setAttribute('aria-label', up ? (card.token ? 'Shuffle token' : card.icon) : 'Face-down card');
      }

      function flip(card) {
        if (lock || finished || card.up || card.matched) return;
        if (!started) { started = true; timer.start(); }
        setUp(card, true);
        snd('card');
        if (card.token) { moves++; updateHud(); useToken(card); return; }
        if (!first) { first = card; return; }
        second = card;
        moves++;
        updateHud();
        const a = first, b = second;
        first = second = null;
        if (a.icon === b.icon) {
          lock = true;
          later(() => { lock = false; match(a, b); }, 360);
        } else {
          lock = true;
          streak = 0;
          later(() => { a.el.classList.add('nope'); b.el.classList.add('nope'); sfx('miss'); }, 560);
          later(() => {
            setUp(a, false); setUp(b, false);
            a.el.classList.remove('nope'); b.el.classList.remove('nope');
            lock = false;
          }, 1050);
        }
      }

      function match(a, b) {
        a.matched = b.matched = true;
        found++;
        streak++;
        updateHud();
        [a, b].forEach((c) => { c.el.classList.add('matched'); c.el.setAttribute('aria-label', c.icon + ', matched'); });
        sfx('chime', Math.min(streak - 1, 11));
        if (anim()) {
          [a, b].forEach((c) => {
            const p = center(c);
            fx.burst(p.x, p.y, { count: 12, shape: 'star', colors: ['#ffffff', '#fff6c2', '#bfe9ff', '#d8ffc8'], speed: cw * 2.6, life: 0.85, size: Math.max(2.5, cw * 0.05) });
            fx.add({ x: p.x, y: p.y, shape: 'ring', size: cw * 0.2, grow: cw * 2.4, life: 0.45, color: 'rgba(255,255,255,.9)' });
          });
          if (streak >= 3) { const p = center(b); fx.text(p.x, p.y - chh * 0.45, streak + ' in a row!', { size: 15 + Math.min(9, streak), color: '#fff6c2' }); }
        }
        if (found === pairs) later(finish, 750);
      }

      // The shuffle token: every face-down card finds a new home.
      function useToken(tok) {
        lock = true;
        tokenUsed = true;
        const lone = first;
        first = null;
        later(() => {
          tok.el.classList.add('token-go');
          sfx('swap');
          if (lone) setUp(lone, false);
          if (anim()) {
            const p = center(tok);
            fx.burst(p.x, p.y, { count: 18, shape: 'bubble', colors: ['rgba(255,255,255,.95)', 'rgba(191,233,255,.95)'], speed: cw * 3.2, life: 1.1, size: Math.max(3, cw * 0.08), drag: 0.95 });
            fx.text(p.x, p.y - chh * 0.5, 'Shuffle!', { size: 18, color: '#ffffff' });
          }
        }, 480);
        later(() => {
          const free = deck.filter((c) => !c.matched && !c.token && !c.up);
          const freeSlots = A.util.shuffle(free.map((c) => c.slot));
          board.classList.add('shuffling');
          free.forEach((c, i) => {
            c.slot = freeSlots[i];
            slots[c.slot] = c;
            c.el.style.transitionDelay = (anim() ? Math.round(Math.random() * 160) : 0) + 'ms';
            placeCard(c);
          });
          later(() => {
            board.classList.remove('shuffling');
            free.forEach((c) => { c.el.style.transitionDelay = ''; });
            tok.matched = true;
            tok.el.classList.add('used');
            lock = false;
          }, anim() ? 950 : 50);
        }, 950);
      }

      // A quick look at every card before the game starts.
      function peek() {
        if (started || finished) return;
        lock = true;
        const a = anim();
        deck.forEach((c, i) => later(() => { if (!started) c.el.classList.add('up'); }, a ? i * 28 : 0));
        const hold = (a ? deck.length * 28 : 0) + 1600;
        later(() => deck.forEach((c, i) => later(() => { if (!c.up) c.el.classList.remove('up'); }, a ? i * 18 : 0)), hold);
        later(() => { lock = false; }, hold + (a ? deck.length * 18 : 0) + 380);
        sfx('whoosh', true);
      }

      // ---------------------------------------------------------- the end
      function finish() {
        if (finished) return;
        finished = true;
        timer.stop();
        const secs = Math.max(1, Math.floor(timer.seconds));
        const stars = moves <= Math.ceil(pairs * 1.45) ? 3 : moves <= Math.ceil(pairs * 2.1) ? 2 : 1;
        const prev = Object.assign({}, K.stats(ID, opts.size).extra || {});
        const res = K.record(ID, opts.size, {
          won: true, time: secs,
          update: (s) => {
            s.extra = s.extra || {};
            if (!s.extra.bestMoves || moves < s.extra.bestMoves) s.extra.bestMoves = moves;
            if (!s.extra.bestTime || secs < s.extra.bestTime) s.extra.bestTime = secs;
            s.extra.totalMoves = (s.extra.totalMoves || 0) + moves;
            s.extra.stars = Math.max(s.extra.stars || 0, stars);
          },
        });
        snd('win');
        showEnd(secs, stars, res.stats, !prev.bestMoves || moves < prev.bestMoves, !prev.bestTime || secs < prev.bestTime);
      }

      function showEnd(secs, stars, s, bestMoves, bestTime) {
        endLayer.innerHTML = '';
        const starEls = [0, 1, 2].map((i) => h('span.prs-star', { html: starSVG(i < stars, A.util.uid('pst')) }));
        const stat = (label, value, isBest) => h('div.prs-end-stat', null, h('span.prs-end-k', null, label), h('b', null, value), isBest ? h('span.prs-best', null, 'New best!') : null);
        const again = A.ui.button('Play again', { tone: 'aqua', size: 'lg', onClick: () => newGame(true) });
        const panel = h('div.prs-end', { role: 'dialog', 'aria-label': 'Game complete' },
          h('div.prs-end-bubbles', { 'aria-hidden': 'true' }, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => h('i', { style: { '--bx': (8 + i * 12) + '%', '--bd': (i * 0.45) + 's', '--bs': (10 + (i % 3) * 7) + 'px' } }))),
          h('div.prs-end-title', null, stars === 3 ? 'Perfect memory!' : stars === 2 ? 'Wonderful!' : 'You did it!'),
          h('div.prs-end-sub', null, 'You found all ' + pairs + ' pairs in ' + moves + ' moves.'),
          h('div.prs-stars', null, starEls),
          h('div.prs-end-stats', null,
            stat('Time', K.fmt(secs), bestTime),
            stat('Moves', String(moves), bestMoves),
            stat('Best (' + SIZES[opts.size].label + ')', String(s.extra.bestMoves) + ' moves')),
          h('div.prs-end-btns', null, again, A.ui.button('Change board size', { onClick: () => showOptions() })));
        endLayer.appendChild(panel);
        void endLayer.offsetWidth;
        endLayer.classList.add('show');
        starEls.forEach((el, i) => later(() => {
          el.classList.add('pop');
          if (i < stars) {
            sfx('chime', 5 + i * 2);
            const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
            if (anim()) fx.burst(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, { count: 12, shape: 'star', colors: ['#fff6c2', '#ffffff', '#ffd62e'], speed: 150, life: 0.9, size: 4 });
          }
        }, 450 + i * 330));
        later(() => again.focus(), 120);
      }

      // ---------------------------------------------------------- flow
      const inProgress = () => started && !finished;
      async function confirmAbandon() {
        if (!inProgress()) return true;
        const r = await K.choose(win, {
          title: 'Game in progress', icon: 'icons/pairs',
          instruction: 'Do you want to start a new game?',
          options: [
            { value: 'new', label: 'Start a new game', note: 'This game counts as unfinished in your statistics.' },
            { value: 'keep', label: 'Keep playing' },
          ],
        });
        if (r !== 'new') return false;
        K.record(ID, opts.size, { won: false });
        return true;
      }
      async function newGame(force) {
        if (!force && !(await confirmAbandon())) return;
        build();
        sfx('whoosh', true);
      }
      async function changeSize(k) {
        if (k === opts.size && !finished) return;
        if (!(await confirmAbandon())) return;
        opts.size = k;
        K.saveOptions(ID, opts);
        build();
        fitWindow();
      }

      // ---------------------------------------------------------- dialogs
      function showStats() {
        K.statsDialog(win, {
          name: 'Pairs', icon: 'icons/pairs', levels: SIZE_LIST, level: opts.size,
          onReset: () => K.resetStats(ID),
          render(lv) {
            const s = K.stats(ID, lv), x = s.extra || {};
            const avg = s.won ? Math.round((x.totalMoves || 0) / s.won) : 0;
            return h('div', null,
              h('div.gk-stats-h', null, SIZES[lv].label + ' board'),
              h('div.prs-stat-stars', { html: [0, 1, 2].map((i) => starSVG(i < (x.stars || 0), A.util.uid('sst'))).join('') }),
              K.statRows([
                ['Games started', String(s.played)], ['Games finished', String(s.won)],
                ['Fewest moves', x.bestMoves ? String(x.bestMoves) : 'None yet'],
                ['Fastest time', x.bestTime ? K.fmt(x.bestTime) : 'None yet'],
                ['Average moves', avg ? String(avg) : 'None yet'],
                ['Best rating', (x.stars || 0) + (x.stars === 1 ? ' star' : ' stars')],
              ]));
          },
        });
      }

      async function showOptions() {
        let size = opts.size;
        const rg = A.ui.radioGroup({ options: SIZE_LIST.map(([k, label]) => [k, label + ' (' + SIZES[k].cols + ' x ' + SIZES[k].rows + ', ' + SIZES[k].note + ')']), value: size, onChange: (v) => { size = v; } });
        const cb = (label, key) => { const c = A.ui.checkbox({ label, checked: !!opts[key] }); c.key = key; return c; };
        const checks = [cb('Play sounds', 'sound'), cb('Show animations', 'animations'), cb('Peek at the cards when a game starts', 'peek'), cb('Include the shuffle token', 'token')];
        const r = await K.optionsDialog(win, {
          title: 'Options', icon: 'icons/pairs',
          groups: [{ legend: 'Board size', content: rg }, { legend: 'Other', content: h('div.gk-options-checks', null, checks) }],
        });
        if (r !== 'ok') return;
        const tokenBefore = opts.token;
        checks.forEach((c) => { opts[c.key] = c.checked; });
        K.saveOptions(ID, opts);
        if (size !== opts.size || finished) { await changeSize(size); return; }
        if (tokenBefore !== opts.token && !started) build();
      }

      async function showAppearance() {
        let back = opts.back, table = opts.table;
        const backs = K.chooser({
          className: 'prs-backs', value: back, onChange: (v) => { back = v; },
          items: BACKS.map(([v, label]) => ({ value: v, label, preview: h('span.prs-mini', { dataset: { back: v } }, h('span.prs-face.prs-back', null, h('span.prs-emblem'))) })),
        });
        const tables = K.chooser({
          className: 'prs-tables', value: table, onChange: (v) => { table = v; },
          items: TABLES.map(([v, label]) => ({ value: v, label, preview: h('span.prs-table-swatch', { dataset: { table: v } }) })),
        });
        const r = await K.optionsDialog(win, { title: 'Change appearance', icon: 'icons/personalize', width: 500, groups: [{ legend: 'Card back', content: backs }, { legend: 'Table', content: tables }] });
        if (r !== 'ok') return;
        opts.back = back; opts.table = table;
        K.saveOptions(ID, opts);
        applyLook();
      }

      function showHelp() {
        K.helpDialog(win, {
          name: 'Pairs', icon: 'icons/pairs',
          intro: 'Find every matching pair of pictures in as few moves as you can.',
          sections: [
            ['How it works', ['Click a card to turn it over, then click another one.', 'If the two pictures match, they stay face up. If not, they turn back over, so try to remember where they were.', 'Each pair of flips counts as one move.']],
            ['The shuffle token', 'One card is a shuffle token. When you turn it over, every face-down card swaps places. Everything you memorized gets mixed up, so be ready.'],
            ['Stars', 'Finish with very few moves for three stars. Your best moves and times are saved for each board size.'],
            ['Keyboard', ['Arrow keys move between cards, Space or Enter turns one over.', 'F2 starts a new game, F4 shows statistics, F5 opens Options and F7 changes the card back.']],
          ],
        });
      }

      // ---------------------------------------------------------- keyboard
      function setKf(i) {
        if (kf >= 0 && slots[kf]) slots[kf].el.classList.remove('kfocus');
        kf = i;
        if (kf >= 0 && slots[kf]) slots[kf].el.classList.add('kfocus');
      }
      function keyPlay(e) {
        const dirs = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
        if (dirs[e.key] != null) {
          e.preventDefault();
          const n = cols * rows;
          let i = kf < 0 ? 0 : kf + dirs[e.key];
          if (i < 0 || i >= n) i = kf < 0 ? 0 : kf;
          if (!slots[i]) i = clamp(i + Math.sign(dirs[e.key]), 0, n - 1);
          setKf(i);
          return;
        }
        if ((e.key === 'Enter' || e.key === ' ') && kf >= 0 && slots[kf]) { e.preventDefault(); flip(slots[kf]); }
      }
      K.keys(win, { newGame: () => newGame(), stats: showStats, options: showOptions, appearance: showAppearance, help: showHelp, key: keyPlay });

      // ---------------------------------------------------------- life
      const offResize = K.observe(stage, () => { layout(); placeHole(); });
      const offTheme = A.bus.on('theme:change', applyLook);
      win.on('minimize', () => timer.pause('min'));
      win.on('restore', () => timer.resume('min'));

      applyLook();
      build();
      setTimeout(fitWindow, 0);

      // Test hook (harmless): finish instantly to see the end screen.
      K.debug = K.debug || {};
      K.debug.pairs = {
        solve() {
          cancelPending(); lock = false; if (!started) { started = true; timer.start(40); }
          const left = deck.filter((c) => !c.matched && !c.token);
          const byIcon = {};
          left.forEach((c) => { (byIcon[c.icon] = byIcon[c.icon] || []).push(c); });
          moves += Object.keys(byIcon).length;
          Object.values(byIcon).forEach(([a, b], i) => later(() => { setUp(a, true); setUp(b, true); match(a, b); }, i * 90));
        },
        token() { const t = deck.find((c) => c.token && !c.matched); if (t) { lock = false; flip(t); } },
        state: () => ({ cols, rows, pairs, found, moves, started, finished }),
      };

      return {
        onClose() {
          cancelPending();
          timer.destroy();
          fx.destroy();
          offResize();
          offTheme();
          if (K.debug && K.debug.pairs) delete K.debug.pairs;
        },
        onArgs(a) { if (a && SIZES[a.size]) changeSize(a.size); },
        keepAwake: () => inProgress() && win.state !== 'minimized',
      };
    },
  });
})();
