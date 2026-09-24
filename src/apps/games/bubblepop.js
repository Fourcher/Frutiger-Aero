/* Bubble Pop: an underwater arcade game. Glossy soap bubbles rise and wobble;
   pop them before they float away. Same colors in a row build a combo,
   golden bubbles add time, spiky urchins break your combo. Levels speed up,
   high scores are saved, and the game pauses when you look away. */
(function () {
  'use strict';
  const A = window.Aerium;
  const K = A.gameKit;
  const { h, clamp } = A.util;
  const ID = 'bubblepop';

  const COLORS = [
    { name: 'rose', c: '#ff5fa8', hi: '#ffd6ea', lo: '#c01d6c' },
    { name: 'lime', c: '#7ee04a', hi: '#e6ffd6', lo: '#2c8a18' },
    { name: 'aqua', c: '#35c6ff', hi: '#dcf7ff', lo: '#0a6cb6' },
    { name: 'violet', c: '#b07cff', hi: '#f0e6ff', lo: '#6a2cc8' },
    { name: 'orange', c: '#ffa53a', hi: '#fff1d6', lo: '#cf5c08' },
  ];
  const GOLD = { name: 'gold', c: '#ffd23a', hi: '#fffbe0', lo: '#d08a06' };
  const SCENES = [['lagoon', 'Tropical lagoon'], ['deep', 'Deep sea'], ['reef', 'Sunset reef']];
  const DIFFS = {
    relaxed: { label: 'Relaxed', time: 75, spawn: 1.3, speed: 0.82, urchin: 0.6 },
    normal: { label: 'Normal', time: 60, spawn: 1, speed: 1, urchin: 1 },
    frantic: { label: 'Frantic', time: 45, spawn: 0.78, speed: 1.28, urchin: 1.45 },
  };
  const DEFAULTS = { sound: true, effects: true, difficulty: 'normal', pauseOnBlur: true, scene: 'lagoon' };
  const POPS_PER_LEVEL = 18;

  // ---------------------------------------------------------------- sprites
  const SPR = 64;
  const rgba = (hex, a) => { const [r, g, b] = A.util.hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  function bubbleSprite(col, gold) {
    const pad = 8, size = (SPR + pad) * 2;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const cx = size / 2, cy = size / 2, r = SPR;
    const g = c.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.08, cx, cy, r);
    g.addColorStop(0, rgba(col.hi, gold ? 0.8 : 0.5));
    g.addColorStop(0.5, rgba(col.c, gold ? 0.66 : 0.46));
    g.addColorStop(0.86, rgba(col.c, gold ? 0.92 : 0.82));
    g.addColorStop(1, rgba(col.lo, 0.95));
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    if (c.createConicGradient) {
      const cg = c.createConicGradient(0.6, cx, cy);
      cg.addColorStop(0, 'rgba(255,120,200,.38)'); cg.addColorStop(0.25, 'rgba(255,240,120,.32)');
      cg.addColorStop(0.5, 'rgba(120,255,220,.38)'); cg.addColorStop(0.75, 'rgba(140,160,255,.32)'); cg.addColorStop(1, 'rgba(255,120,200,.38)');
      c.strokeStyle = cg; c.lineWidth = r * 0.12;
      c.beginPath(); c.arc(cx, cy, r * 0.92, 0, Math.PI * 2); c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(cx, cy, r - 1.5, 0, Math.PI * 2); c.stroke();
    const b = c.createRadialGradient(cx, cy + r * 0.78, 0, cx, cy + r * 0.78, r * 0.72);
    b.addColorStop(0, 'rgba(255,255,255,.6)'); b.addColorStop(1, 'rgba(255,255,255,0)');
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
    c.fillStyle = b; c.fillRect(0, 0, size, size);
    c.restore();
    c.save();
    c.translate(cx - r * 0.3, cy - r * 0.42); c.rotate(-0.6);
    const hg = c.createLinearGradient(0, -r * 0.22, 0, r * 0.22);
    hg.addColorStop(0, 'rgba(255,255,255,.96)'); hg.addColorStop(1, 'rgba(255,255,255,.18)');
    c.fillStyle = hg;
    c.beginPath(); c.ellipse(0, 0, r * 0.38, r * 0.2, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.arc(cx + r * 0.42, cy + r * 0.4, r * 0.08, 0, Math.PI * 2); c.fill();
    if (gold) {
      c.fillStyle = '#ffffff';
      const star = (x, y, s) => { c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); };
      star(cx + r * 0.1, cy + r * 0.05, r * 0.34);
      star(cx - r * 0.45, cy + r * 0.35, r * 0.12);
    }
    return cv;
  }
  function urchinSprite() {
    const r = SPR * 0.78, reach = SPR * 1.42, pad = 6, size = Math.ceil((reach + pad) * 2);
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const rnd = A.util.seeded(21);
    c.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + rnd() * 0.12, len = reach * (0.86 + rnd() * 0.14);
      const x2 = cx + Math.cos(a) * len, y2 = cy + Math.sin(a) * len;
      const g = c.createLinearGradient(cx, cy, x2, y2);
      g.addColorStop(0, '#2a0d4d'); g.addColorStop(0.7, '#6a2fb0'); g.addColorStop(1, '#d6b8ff');
      c.strokeStyle = g; c.lineWidth = SPR * 0.075;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(x2, y2); c.stroke();
    }
    const body = c.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    body.addColorStop(0, '#b27cff'); body.addColorStop(0.45, '#4a1a86'); body.addColorStop(1, '#16052e');
    c.fillStyle = body;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(214,184,255,.55)';
    for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI * 2, d = rnd() * r * 0.8; c.beginPath(); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.06, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.ellipse(cx - r * 0.3, cy - r * 0.42, r * 0.34, r * 0.17, -0.5, 0, Math.PI * 2); c.fill();
    return cv;
  }
  function glowSprite(col, strength) {
    const size = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2);
    g.addColorStop(0, rgba(col.c, strength)); g.addColorStop(0.55, rgba(col.c, strength * 0.35)); g.addColorStop(1, rgba(col.c, 0));
    c.fillStyle = g; c.fillRect(0, 0, size, size);
    return cv;
  }
  let SPRITES = null;
  function sprites() {
    if (SPRITES) return SPRITES;
    SPRITES = {
      colors: COLORS.map((col) => bubbleSprite(col, false)), gold: bubbleSprite(GOLD, true), urchin: urchinSprite(),
      glows: COLORS.map((col) => glowSprite(col, 0.5)), goldGlow: glowSprite(GOLD, 0.75),
    };
    return SPRITES;
  }

  // ================================================================ app
  A.apps.register({
    id: ID,
    name: 'Bubble Pop',
    icon: 'icons/bubble',
    color: '#39c3ee',
    category: 'games',
    description: 'Pop the glossy bubbles before they float away.',
    keywords: ['bubbles', 'arcade', 'pop', 'underwater', 'game'],
    window: { width: 760, height: 580, minWidth: 420, minHeight: 360 },
    tasks: [{ label: 'Play', icon: 'icons/play', onClick: () => A.apps.launch(ID, { play: true }) }],
    launch(win, args) {
      let opts = K.options(ID, DEFAULTS);

      // ---------------------------------------------------------- state
      let state = 'title';      // title | play | paused | over
      let W = 1, H = 1, dpr = 1;
      let bubbles = [], motes = [], weeds = [];
      let t = 0, raf = 0, last = 0;
      let score = 0, timeLeft = 60, level = 1, pops = 0, combo = 0, bestCombo = 0, lastColor = -1;
      let spawnAcc = 0, levelFlash = 0, shake = 0, redFlash = 0, goldFlash = 0, fish = null, fishT = 8;
      let lastTick = -1;
      let causticPat = null;
      let bg = null;
      let pending = [];
      let pointer = null;

      // ---------------------------------------------------------- DOM
      const cv = h('canvas.bbp-canvas', { 'aria-label': 'Bubble Pop playfield' });
      const ctx = cv.getContext('2d');
      const scoreNum = h('span.bbp-score-num', null, '0');
      const timeFill = h('div.bbp-timefill');
      const timeNum = h('span.bbp-time', null, '60');
      const comboEl = h('div.bbp-combo', null, 'Combo ', h('b', null, 'x1'));
      const levelEl = h('div.bbp-level', null, 'Level 1');
      const pauseBtn = h('button.bbp-pausebtn', { type: 'button', 'aria-label': 'Pause', 'data-tip': 'Pause (P)', onclick: () => (state === 'play' ? pause() : state === 'paused' ? resume() : null) },
        A.img('icons/pause'));
      const hud = h('div.bbp-hud', null,
        h('div.bbp-score', null, h('span.bbp-score-label', null, 'Score'), scoreNum),
        h('div.bbp-timebox', null, h('div.bbp-timebar', null, timeFill), timeNum),
        h('div.bbp-right', null, comboEl, levelEl, pauseBtn));
      const screen = h('div.bbp-screen-layer');
      const stage = h('div.gk-stage.bbp-stage', null, cv, hud, screen);
      const menubar = K.menubar({
        name: 'Bubble Pop',
        newGame: () => newGame(), stats: showStats, options: showOptions, appearance: showAppearance, help: showHelp,
        about: () => K.about(win, { name: 'Bubble Pop', icon: 'icons/bubble', blurb: 'No bubbles were harmed in the making of this game. Well, a few.' }),
        exit: () => win.close(),
        items: () => [
          { label: state === 'paused' ? 'Resume' : 'Pause', shortcut: 'P', disabled: state !== 'play' && state !== 'paused', onClick: () => (state === 'play' ? pause() : resume()) },
          { label: 'High scores', onClick: () => showScores() },
        ],
      });
      win.body.classList.add('gk-app', 'bbp');
      win.body.append(menubar, stage);
      const fx = new K.Particles(stage, { className: 'bbp-fx' });

      const snd = (name) => { if (opts.sound) A.sound.play(name); };
      const sfx = (name, arg, g) => { if (opts.sound) K.sfx(name, arg, g); };
      const diff = () => DIFFS[opts.difficulty] || DIFFS.normal;
      function later(fn, ms) { const tm = setTimeout(() => { pending = pending.filter((x) => x !== tm); if (!win.closed) fn(); }, ms); pending.push(tm); return tm; }
      function cancelPending() { pending.forEach(clearTimeout); pending = []; }
      let causticImg = null;
      A.util.loadImage('textures/caustics').then((img) => { if (!win.closed) { causticImg = img; buildCaustics(); } }).catch(() => {});
      // The shimmer near the surface, pre-masked so it fades out softly with depth.
      function buildCaustics() {
        if (!causticImg || W < 2) return;
        const tile = 256, sw = Math.ceil(W + tile), sh = Math.max(2, Math.ceil(H * 0.62));
        const c = document.createElement('canvas');
        c.width = sw; c.height = sh;
        const x = c.getContext('2d');
        x.fillStyle = x.createPattern(causticImg, 'repeat');
        x.fillRect(0, 0, sw, sh);
        x.globalCompositeOperation = 'destination-in';
        const g = x.createLinearGradient(0, 0, 0, sh);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, sw, sh);
        causticPat = { c, tile };
      }

      // ---------------------------------------------------------- scene
      const PALETTES = {
        lagoon: { water: ['#9ff4ff', '#27bde0', '#0a5d9e', '#053a70'], sand: ['#f6e7bf', '#d9bd84'], weeds: ['#39c46a', '#138045'], ray: 'rgba(255,255,255,', fish: 'rgba(6,40,80,.22)', rock: '#0a4f7a' },
        deep: { water: ['#2a86cc', '#0d3f86', '#061f52', '#020a24'], sand: ['#35466a', '#18223e'], weeds: ['#127a80', '#07404a'], ray: 'rgba(150,230,255,', fish: 'rgba(0,10,30,.35)', rock: '#061a3a', glow: true },
        reef: { water: ['#ffd8a4', '#ff9a8e', '#2f8fd4', '#0b3b7c'], sand: ['#ffe2b4', '#e0a86e'], weeds: ['#ff6f9e', '#d04a2a'], ray: 'rgba(255,240,210,', fish: 'rgba(60,20,60,.2)', rock: '#6a2f5a' },
      };
      const pal = () => PALETTES[opts.scene] || PALETTES.lagoon;

      function resize() {
        const w = stage.clientWidth, hh = stage.clientHeight;
        if (!w || !hh) return;
        dpr = K.dpr();
        W = w; H = hh;
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        buildBackground();
        buildCaustics();
        weeds = [];
        const n = Math.max(5, Math.round(W / 64));
        for (let i = 0; i < n; i++) weeds.push({ x: (i + 0.3 + Math.random() * 0.4) * (W / n), h: H * (0.12 + Math.random() * 0.16), w: 6 + Math.random() * 6, ph: Math.random() * 6.28, c: i % 2 });
        if (!motes.length) for (let i = 0; i < 40; i++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2.4, v: 12 + Math.random() * 30 });
        bubbles.forEach((b) => { b.x0 = clamp(b.x0, b.r, W - b.r); });
        if (!raf) draw();
      }

      function buildBackground() {
        const p = pal();
        bg = document.createElement('canvas');
        bg.width = cv.width; bg.height = cv.height;
        const c = bg.getContext('2d');
        c.scale(dpr, dpr);
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, p.water[0]); g.addColorStop(0.3, p.water[1]); g.addColorStop(0.72, p.water[2]); g.addColorStop(1, p.water[3]);
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        const glow = c.createRadialGradient(W * 0.3, -H * 0.1, 10, W * 0.3, -H * 0.1, H * 0.9);
        glow.addColorStop(0, 'rgba(255,255,255,.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = glow; c.fillRect(0, 0, W, H);
        // far rocks
        c.fillStyle = p.rock; c.globalAlpha = 0.35;
        c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W; x += W / 8) c.lineTo(x, H * (0.86 - 0.08 * Math.abs(Math.sin(x * 0.013 + 1))));
        c.lineTo(W, H); c.fill();
        c.globalAlpha = 1;
        // sand
        const sg = c.createLinearGradient(0, H * 0.92, 0, H);
        sg.addColorStop(0, p.sand[0]); sg.addColorStop(1, p.sand[1]);
        c.fillStyle = sg;
        c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, H * 0.935 + Math.sin(x * 0.02) * 4);
        c.lineTo(W, H); c.fill();
        const rnd = A.util.seeded(5);
        for (let i = 0; i < W / 14; i++) { c.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.25})`; c.beginPath(); c.arc(rnd() * W, H * (0.95 + rnd() * 0.05), 0.8 + rnd() * 1.8, 0, Math.PI * 2); c.fill(); }
      }

      function drawScene() {
        const p = pal();
        ctx.drawImage(bg, 0, 0, W, H);
        // light rays
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
          const x = W * (0.12 + i * 0.2) + Math.sin(t * 0.25 + i * 1.7) * W * 0.04;
          const wTop = W * 0.05, wBot = W * 0.16;
          const g = ctx.createLinearGradient(0, 0, 0, H * 0.85);
          const a = 0.07 + 0.04 * Math.sin(t * 0.6 + i);
          g.addColorStop(0, p.ray + a + ')'); g.addColorStop(1, p.ray + '0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(x - wTop, 0); ctx.lineTo(x + wTop, 0); ctx.lineTo(x + wBot + W * 0.08, H * 0.85); ctx.lineTo(x - wBot + W * 0.08, H * 0.85); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        // caustics shimmer near the surface
        if (causticPat) {
          ctx.save();
          ctx.globalAlpha = (opts.scene === 'deep' ? 0.1 : 0.16) + 0.03 * Math.sin(t * 0.8);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(causticPat.c, -((t * 11) % causticPat.tile), Math.sin(t * 0.45) * 5 - 5);
          ctx.restore();
        }
        // a fish passing far away
        if (fish) {
          ctx.save();
          ctx.fillStyle = p.fish;
          ctx.translate(fish.x, fish.y + Math.sin(t * 1.4) * 6);
          ctx.scale(fish.dir, 1);
          ctx.beginPath(); ctx.ellipse(0, 0, fish.s, fish.s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-fish.s * 0.8, 0); ctx.lineTo(-fish.s * 1.5, -fish.s * 0.45 * (1 + 0.2 * Math.sin(t * 8))); ctx.lineTo(-fish.s * 1.5, fish.s * 0.45); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        // drifting specks
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        motes.forEach((m) => { ctx.beginPath(); ctx.arc(m.x + Math.sin(t + m.v) * 3, m.y, m.r, 0, Math.PI * 2); ctx.fill(); });
        // seaweed
        weeds.forEach((wd) => {
          const sway = Math.sin(t * 1.1 + wd.ph) * wd.h * 0.14;
          const pt = (u) => {
            const a = 1 - u;
            const x = a * a * wd.x + 2 * a * u * (wd.x - sway * 0.5) + u * u * (wd.x + sway);
            const y = a * a * (H + 6) + 2 * a * u * (H - wd.h * 0.5) + u * u * (H - wd.h);
            return [x + Math.sin(u * 6 + t * 1.6 + wd.ph) * wd.w * 0.35 * u, y];
          };
          const left = [], right = [];
          for (let i = 0; i <= 10; i++) {
            const u = i / 10, [x, y] = pt(u), w = wd.w * (1 - u * 0.85);
            left.push([x - w / 2, y]); right.push([x + w / 2, y]);
          }
          const g = ctx.createLinearGradient(wd.x - wd.w, 0, wd.x + wd.w, 0);
          g.addColorStop(0, p.weeds[1]); g.addColorStop(0.45, p.weeds[0]); g.addColorStop(1, p.weeds[1]);
          ctx.fillStyle = g;
          ctx.beginPath();
          left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = Math.max(1, wd.w * 0.18);
          ctx.beginPath();
          for (let i = 0; i <= 9; i++) { const [x, y] = pt(i / 10); if (i) ctx.lineTo(x - wd.w * 0.12, y); else ctx.moveTo(x - wd.w * 0.12, y); }
          ctx.stroke();
        });
      }

      function drawBubbles() {
        const S = sprites();
        const glow = !!pal().glow;
        bubbles.forEach((b) => {
          const wob = 0.045 * Math.sin(t * 5 + b.ph);
          ctx.save();
          ctx.translate(b.x, b.y);
          if (b.kind === 'urchin') {
            ctx.rotate(b.rot);
            const sc = (b.r * 0.82) / (SPR * 0.78);
            const D = S.urchin.width * sc;
            ctx.drawImage(S.urchin, -D / 2, -D / 2, D, D);
          } else {
            ctx.scale(1 + wob, 1 - wob);
            const spr = b.kind === 'gold' ? S.gold : S.colors[b.color];
            const D = spr.width * (b.r / SPR);
            if (glow || b.kind === 'gold') {
              const gs = b.kind === 'gold' ? S.goldGlow : S.glows[b.color];
              ctx.globalAlpha = b.kind === 'gold' ? 0.75 + 0.25 * Math.sin(t * 6 + b.ph) : 0.7;
              ctx.drawImage(gs, -D * 0.95, -D * 0.95, D * 1.9, D * 1.9);
              ctx.globalAlpha = 1;
            }
            ctx.drawImage(spr, -D / 2, -D / 2, D, D);
          }
          ctx.restore();
        });
      }

      function draw() {
        if (!bg) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.save();
        if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 16, (Math.random() - 0.5) * shake * 16);
        drawScene();
        drawBubbles();
        ctx.restore();
        const flash = (a, col) => { if (a > 0) { ctx.fillStyle = col.replace('A', (a * 0.35).toFixed(3)); ctx.fillRect(0, 0, W, H); } };
        flash(redFlash, 'rgba(255,60,90,A)');
        flash(goldFlash, 'rgba(255,220,90,A)');
        flash(levelFlash, 'rgba(255,255,255,A)');
        if (pointer && state === 'play') {
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 11 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // ---------------------------------------------------------- simulation
      const radii = () => { const m = Math.min(W, H); const rMin = Math.max(17, m * 0.036); return { rMin, rMax: Math.max(rMin + 12, m * 0.078) }; };
      function spawn(ambient) {
        const d = diff();
        const { rMin, rMax } = radii();
        const r = rMin + Math.random() * (rMax - rMin);
        let kind = 'bubble', color = Math.floor(Math.random() * COLORS.length);
        if (!ambient) {
          const urchinP = Math.min(0.2, (0.035 + level * 0.012) * d.urchin);
          const roll = Math.random();
          if (roll < urchinP) kind = 'urchin';
          else if (roll < urchinP + 0.05) kind = 'gold';
          if (kind === 'bubble' && lastColor >= 0 && Math.random() < 0.3) color = lastColor;
        }
        const sizeF = 1.15 - ((r - rMin) / (rMax - rMin)) * 0.3;
        const speed = ambient ? H * 0.08 + 20 : (H * (0.15 + level * 0.024) + 30) * d.speed * (0.8 + Math.random() * 0.4) * sizeF * (kind === 'urchin' ? 0.85 : 1);
        const rr = kind === 'urchin' ? r * 0.9 : kind === 'gold' ? r * 0.82 : r;
        bubbles.push({ kind, color, r: rr, x0: rr + Math.random() * Math.max(1, W - 2 * rr), x: 0, y: H + rr + 12, vy: -speed, ph: Math.random() * 6.28, amp: 6 + Math.random() * 18, fq: 0.7 + Math.random() * 1.2, rot: Math.random() * 6.28 });
      }

      function update(dt) {
        t += dt;
        if (state === 'play') {
          timeLeft -= dt;
          const sec = Math.ceil(timeLeft);
          if (timeLeft <= 10 && sec !== lastTick && timeLeft > 0) { lastTick = sec; sfx('tick'); }
          if (timeLeft <= 0) { timeLeft = 0; gameOver(); }
          const iv = Math.max(0.19, 0.66 - level * 0.05) * diff().spawn;
          spawnAcc += dt;
          while (spawnAcc > iv) { spawnAcc -= iv; spawn(false); }
        } else if (state === 'title' || state === 'over') {
          spawnAcc += dt;
          if (spawnAcc > 0.9) { spawnAcc = 0; if (bubbles.length < 14) spawn(true); }
        }
        bubbles.forEach((b) => { b.y += b.vy * dt; b.x = b.x0 + Math.sin(t * b.fq + b.ph) * b.amp; b.rot += dt * 0.7; });
        bubbles = bubbles.filter((b) => b.y > -b.r * 2.2 - 20);
        motes.forEach((m) => { m.y -= m.v * dt; if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; } });
        fishT -= dt;
        if (!fish && fishT <= 0) { const dir = Math.random() < 0.5 ? 1 : -1; fish = { dir, x: dir > 0 ? -60 : W + 60, y: H * (0.25 + Math.random() * 0.4), s: 18 + Math.random() * 16, v: 26 + Math.random() * 20 }; }
        if (fish) { fish.x += fish.dir * fish.v * dt; if (fish.x < -80 || fish.x > W + 80) { fish = null; fishT = 14 + Math.random() * 12; } }
        shake = Math.max(0, shake - dt * 2);
        redFlash = Math.max(0, redFlash - dt * 2.5);
        goldFlash = Math.max(0, goldFlash - dt * 2.5);
        levelFlash = Math.max(0, levelFlash - dt * 2);
        updateHud();
      }

      function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        update(dt);
        draw();
        raf = state !== 'paused' && win.state !== 'minimized' && !win.closed ? requestAnimationFrame(frame) : 0;
      }
      function startLoop() { if (!raf && !win.closed) { last = performance.now(); raf = requestAnimationFrame(frame); } }
      function stopLoop() { cancelAnimationFrame(raf); raf = 0; }

      // ---------------------------------------------------------- popping
      function hitTest(x, y) {
        for (let i = bubbles.length - 1; i >= 0; i--) {
          const b = bubbles[i], dx = x - b.x, dy = y - b.y;
          if (dx * dx + dy * dy <= (b.r * 1.1) * (b.r * 1.1)) return i;
        }
        return -1;
      }

      function pop(i) {
        const b = bubbles[i];
        bubbles.splice(i, 1);
        const playing = state === 'play';
        const fxOn = !!opts.effects;
        if (b.kind === 'urchin') {
          if (playing) { combo = 0; lastColor = -1; timeLeft = Math.max(0, timeLeft - 3); }
          shake = 0.6; redFlash = 1;
          sfx('zap');
          if (fxOn) fx.burst(b.x, b.y, { count: 14, shape: 'spark', colors: ['#d6b8ff', '#6a2fb0', '#ffffff'], speed: 320, drag: 0.9, life: 0.5, size: 2.4 });
          fx.text(b.x, b.y - b.r, playing ? 'Ouch! -3s' : 'Ouch!', { size: 18, color: '#ffd6f0', stroke: 'rgba(60,10,60,.6)' });
          comboEl.classList.add('broken');
          later(() => comboEl.classList.remove('broken'), 500);
          return;
        }
        if (b.kind === 'gold') {
          if (playing) { timeLeft += 3; score += 50 * Math.max(1, combo); pops++; }
          goldFlash = 1;
          snd('coin');
          if (fxOn) {
            fx.burst(b.x, b.y, { count: 16, shape: 'star', colors: ['#fff6c2', '#ffd23a', '#ffffff'], speed: 220, life: 0.9, size: 4 });
            fx.add({ x: b.x, y: b.y, shape: 'ring', size: b.r, grow: b.r * 5, life: 0.4, color: 'rgba(255,230,140,.95)' });
          }
          fx.text(b.x, b.y - b.r, playing ? '+3s' : 'Shiny!', { size: 20, color: '#fff3a8', stroke: 'rgba(120,70,0,.55)' });
          if (playing) checkLevel();
          return;
        }
        const col = COLORS[b.color];
        let pts = 0;
        if (playing) {
          combo = b.color === lastColor ? Math.min(combo + 1, 8) : 1;
          lastColor = b.color;
          bestCombo = Math.max(bestCombo, combo);
          const { rMin, rMax } = radii();
          const f = (b.r - rMin) / (rMax - rMin);
          pts = (f < 0.33 ? 25 : f < 0.66 ? 15 : 10) * combo;
          score += pts;
          pops++;
        }
        sfx('bubble', clamp(0.15 + combo * 0.09 + Math.random() * 0.1, 0, 1.3), 10);
        if (playing && combo >= 2) {
          sfx('combo', combo - 1, 50);
          comboEl.classList.remove('pulse'); void comboEl.offsetWidth; comboEl.classList.add('pulse');
        }
        if (fxOn) {
          fx.burst(b.x, b.y, { count: 12, shape: 'dot', colors: [col.c, col.hi, '#ffffff'], speed: b.r * 7, gravity: 340, drag: 0.93, life: 0.7, size: Math.max(2, b.r * 0.1) });
          fx.burst(b.x, b.y, { count: 5, shape: 'bubble', colors: ['rgba(255,255,255,.85)'], speed: b.r * 3, gravity: -60, drag: 0.94, life: 0.9, size: Math.max(2, b.r * 0.14) });
          fx.add({ x: b.x, y: b.y, shape: 'ring', size: b.r * 0.9, grow: b.r * 4, life: 0.3, color: 'rgba(255,255,255,.9)' });
        }
        if (playing) fx.text(b.x, b.y - b.r * 0.4, '+' + pts + (combo > 1 ? '  x' + combo : ''), { size: combo > 1 ? 18 + combo : 16, color: combo > 1 ? '#fff6c2' : '#ffffff' });
        if (playing) checkLevel();
      }

      function checkLevel() {
        const lv = 1 + Math.floor(pops / POPS_PER_LEVEL);
        if (lv <= level) return;
        level = lv;
        timeLeft += 5;
        levelFlash = 1;
        sfx('levelup');
        banner('Level ' + level, 'Faster bubbles, 5 bonus seconds');
      }

      function banner(title, sub) {
        const el = h('div.bbp-banner', null, h('div.bbp-banner-title', null, title), sub ? h('div.bbp-banner-sub', null, sub) : null);
        stage.appendChild(el);
        later(() => el.remove(), 1900);
      }

      function updateHud() {
        scoreNum.textContent = score.toLocaleString();
        const max = diff().time;
        timeFill.style.width = clamp((timeLeft / max) * 100, 0, 100) + '%';
        timeNum.textContent = String(Math.max(0, Math.ceil(timeLeft)));
        hud.classList.toggle('low', state === 'play' && timeLeft <= 10);
        comboEl.lastChild.textContent = 'x' + Math.max(1, combo);
        comboEl.classList.toggle('hot', combo >= 3);
        levelEl.textContent = 'Level ' + level;
      }

      cv.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const r = cv.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        if (state === 'paused') { resume(); return; }
        if (state === 'over') return;
        const i = hitTest(x, y);
        if (i >= 0) pop(i);
        else if (opts.effects) fx.add({ x, y, shape: 'ring', size: 4, grow: 60, life: 0.35, color: 'rgba(255,255,255,.6)' });
      });
      cv.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; });
      cv.addEventListener('pointerleave', () => { pointer = null; });
      cv.addEventListener('contextmenu', (e) => e.preventDefault());

      // ---------------------------------------------------------- screens
      function showScreen(el) {
        screen.innerHTML = '';
        if (!el) { screen.classList.remove('show'); return; }
        screen.appendChild(el);
        void screen.offsetWidth;
        screen.classList.add('show');
      }
      let iconURLs = null;
      function legendIcons() {
        if (iconURLs) return iconURLs;
        const S = sprites();
        iconURLs = { rose: S.colors[0].toDataURL(), gold: S.gold.toDataURL(), urchin: S.urchin.toDataURL() };
        return iconURLs;
      }
      function scoreTable(highlight) {
        const s = K.stats(ID, 'all');
        if (!s.scores.length) return h('div.bbp-empty', null, 'No high scores yet. Be the first!');
        return h('table.bbp-table', null,
          h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, 'Name'), h('th', null, 'Level'), h('th', null, 'Score'))),
          h('tbody', null, s.scores.map((e, i) => h('tr', { class: e.d === highlight && 'me' },
            h('td', null, String(i + 1)), h('td', null, e.n || 'Player'), h('td', null, String(e.l || 1)), h('td', null, e.s.toLocaleString())))));
      }
      function renameScore(d, name) {
        const all = K.allStats(ID);
        const s = all.all;
        const e = s && (s.scores || []).find((x) => x.d === d);
        if (!e) return;
        e.n = name;
        K.set(ID, 'stats', all);
      }

      function titleScreen() {
        cancelPending();
        state = 'title';
        hud.classList.remove('on', 'low');
        pauseBtn.classList.remove('on');
        const best = K.stats(ID, 'all').scores[0];
        const ic = legendIcons();
        const icon = (src) => h('img.bbp-legend-icon', { src, alt: '' });
        const play = A.ui.button('Play', { tone: 'aqua', size: 'lg', icon: 'icons/play', onClick: () => newGame(true) });
        showScreen(h('div.bbp-screen.bbp-title', null,
          h('div.bbp-logo', null, h('span.bbp-logo-a', null, 'Bubble'), h('span.bbp-logo-b', null, 'Pop')),
          h('div.bbp-tagline', null, 'Pop them before they float away!'),
          h('div.bbp-legend', null,
            h('div', null, h('span.bbp-legend-pics', null, icon(ic.rose), icon(ic.rose)), h('span', null, 'The same color in a row builds a combo')),
            h('div', null, h('span.bbp-legend-pics', null, icon(ic.gold)), h('span', null, 'Golden bubbles add 3 seconds')),
            h('div', null, h('span.bbp-legend-pics', null, icon(ic.urchin)), h('span', null, 'Spiky urchins break your combo'))),
          h('div.bbp-btns', null, play, A.ui.button('High scores', { onClick: showScores })),
          best ? h('div.bbp-best', null, 'Best so far: ' + best.s.toLocaleString() + (best.n ? ' by ' + best.n : '')) : null));
        later(() => play.focus(), 80);
        startLoop();
      }

      async function newGame(force) {
        if (!force && state === 'play') {
          pause();
          const r = await K.choose(win, {
            title: 'Bubble Pop', icon: 'icons/bubble', instruction: 'Start over?',
            options: [{ value: 'new', label: 'Start a new game', note: 'The score from this round will not be saved.' }, { value: 'keep', label: 'Keep popping' }],
          });
          if (r !== 'new') return;
        }
        cancelPending();
        showScreen(null);
        bubbles = [];
        fx.clear();
        score = 0; timeLeft = diff().time; level = 1; pops = 0; combo = 0; bestCombo = 0; lastColor = -1; spawnAcc = 0.6; lastTick = -1;
        state = 'play';
        hud.classList.add('on');
        pauseBtn.classList.remove('on');
        updateHud();
        // a few bubbles already on their way up, so the water is never empty
        for (let i = 0; i < 5; i++) { spawn(false); const b = bubbles[bubbles.length - 1]; if (b.kind === 'urchin') { bubbles.pop(); continue; } b.y = H * (0.45 + i * 0.12); }
        banner('Go!', diff().label + ' mode, ' + diff().time + ' seconds');
        sfx('whoosh', true);
        startLoop();
        win.el.focus({ preventScroll: true });
      }

      function pause() {
        if (state !== 'play') return;
        state = 'paused';
        stopLoop();
        draw();
        pauseBtn.classList.add('on');
        const resumeBtn = A.ui.button('Resume', { tone: 'aqua', size: 'lg', icon: 'icons/play', onClick: resume });
        showScreen(h('div.bbp-screen.bbp-pause', null,
          h('div.bbp-screen-title', null, 'Paused'),
          h('div.bbp-screen-sub', null, 'Take a breather. The bubbles will wait for you.'),
          h('div.bbp-btns', null, resumeBtn, A.ui.button('Quit to title', { onClick: titleScreen }))));
        later(() => resumeBtn.focus(), 60);
      }
      function resume() {
        if (state !== 'paused' || K.blocked(win)) return;
        state = 'play';
        showScreen(null);
        pauseBtn.classList.remove('on');
        startLoop();
        win.el.focus({ preventScroll: true });
      }

      function gameOver() {
        state = 'over';
        hud.classList.remove('low');
        const name = A.store.get('user.name') || 'Player';
        const res = K.record(ID, 'all', {
          won: score > 0, score, entry: { n: name, l: level, c: bestCombo },
          update: (s) => {
            s.extra = s.extra || {};
            s.extra.bestLevel = Math.max(s.extra.bestLevel || 0, level);
            s.extra.bestCombo = Math.max(s.extra.bestCombo || 0, bestCombo);
            s.extra.totalPops = (s.extra.totalPops || 0) + pops;
          },
        });
        const entry = score > 0 && res.scoreRank >= 0 ? res.stats.scores[res.scoreRank] : null;
        const isBest = entry && res.scoreRank === 0;
        if (isBest) snd('win'); else snd('balloon');
        let table = scoreTable(entry && entry.d);
        let saveBtn = null, nameField = null;
        const save = () => {
          if (!entry || !saveBtn || saveBtn.disabled) return;
          const n = (nameField.input.value || '').trim().slice(0, 16) || 'Player';
          renameScore(entry.d, n);
          const t2 = scoreTable(entry.d);
          table.replaceWith(t2);
          table = t2;
          saveBtn.disabled = true;
          saveBtn.lastChild.textContent = 'Saved';
          sfx('select');
        };
        if (entry) {
          nameField = A.ui.textField({ value: name, maxLength: 16, onEnter: save });
          nameField.classList.add('bbp-namefield');
          saveBtn = A.ui.button('Save name', { tone: 'grass', size: 'sm', onClick: save });
        }
        const again = A.ui.button('Play again', { tone: 'aqua', size: 'lg', onClick: () => newGame(true) });
        showScreen(h('div.bbp-screen.bbp-over', null,
          h('div.bbp-screen-title', null, "Time's up!"),
          h('div.bbp-final', null, score.toLocaleString()),
          h('div.bbp-screen-sub', null, 'Level ' + level + '  ·  Best combo x' + Math.max(1, bestCombo) + '  ·  ' + pops + ' pops'),
          entry ? h('div.bbp-newhs', null, A.ui.badge(isBest ? 'New high score!' : 'You made the high score table!', isBest ? 'sun' : 'aqua'), h('div.bbp-name', null, h('span', null, 'Your name:'), nameField, saveBtn)) : null,
          table,
          h('div.bbp-btns', null, again, A.ui.button('Main menu', { onClick: titleScreen }))));
        if (isBest && opts.effects) {
          for (let i = 0; i < 5; i++) later(() => fx.burst(W * (0.2 + Math.random() * 0.6), H * (0.2 + Math.random() * 0.3), { count: 14, shape: 'star', colors: ['#fff6c2', '#ffffff', '#bfe9ff'], speed: 200, life: 1, size: 4 }), i * 260);
        }
        later(() => (nameField ? nameField.input.select() : again.focus()), 120);
      }

      // ---------------------------------------------------------- dialogs
      function showScores() {
        A.ui.dialog({
          parent: win, title: 'Bubble Pop High Scores', icon: 'icons/bubble', width: 420,
          content: h('div.bbp-scores-dlg', null, h('div.gk-stats-h', null, 'High scores'), scoreTable()),
          buttons: [{ label: 'Close', default: true, cancel: true }],
        });
      }
      function showStats() {
        K.statsDialog(win, {
          name: 'Bubble Pop', icon: 'icons/bubble',
          onReset: () => K.resetStats(ID),
          render() {
            const s = K.stats(ID, 'all'), x = s.extra || {};
            return h('div', null,
              h('div.gk-stats-h', null, 'Your bubble record'),
              K.statRows([
                ['Games played', String(s.played)],
                ['High score', s.scores.length ? s.scores[0].s.toLocaleString() : 'None yet'],
                ['Best level', x.bestLevel ? String(x.bestLevel) : 'None yet'],
                ['Best combo', x.bestCombo ? 'x' + x.bestCombo : 'None yet'],
                ['Bubbles popped', (x.totalPops || 0).toLocaleString()],
              ]),
              h('div.gk-stats-sub', null, 'High scores'),
              scoreTable());
          },
        });
      }
      async function showOptions() {
        const rg = A.ui.radioGroup({ options: Object.keys(DIFFS).map((k) => [k, DIFFS[k].label + ' (' + DIFFS[k].time + ' seconds to start)']), value: opts.difficulty });
        const cb = (label, key) => { const c = A.ui.checkbox({ label, checked: !!opts[key] }); c.key = key; return c; };
        const checks = [cb('Play sounds', 'sound'), cb('Show pop effects', 'effects'), cb('Pause when the window is in the background', 'pauseOnBlur')];
        const r = await K.optionsDialog(win, {
          title: 'Options', icon: 'icons/bubble',
          groups: [
            { legend: 'Difficulty', content: h('div', null, rg, h('div.gk-note', { style: { marginTop: '6px' } }, 'A new difficulty starts with your next game.')) },
            { legend: 'Other', content: h('div.gk-options-checks', null, checks) },
          ],
        });
        if (r !== 'ok') return;
        opts.difficulty = rg.value;
        checks.forEach((c) => { opts[c.key] = c.checked; });
        K.saveOptions(ID, opts);
        updateHud();
      }
      async function showAppearance() {
        let scene = opts.scene;
        const chooser = K.chooser({
          className: 'bbp-scenes', value: scene, onChange: (v) => { scene = v; },
          items: SCENES.map(([v, label]) => ({ value: v, label, preview: h('span.bbp-scene-swatch', { dataset: { scene: v } }) })),
        });
        const r = await K.optionsDialog(win, { title: 'Change appearance', icon: 'icons/personalize', width: 420, groups: [{ legend: 'Underwater scene', content: chooser }] });
        if (r !== 'ok') return;
        opts.scene = scene;
        K.saveOptions(ID, opts);
        buildBackground();
        draw();
      }
      function showHelp() {
        K.helpDialog(win, {
          name: 'Bubble Pop', icon: 'icons/bubble',
          intro: 'Pop as many bubbles as you can before the clock runs out.',
          sections: [
            ['Popping', ['Click a bubble to pop it. Small bubbles are worth more than big ones.', 'Bubbles you miss just float away. No harm done.']],
            ['Combos', 'Pop bubbles of the same color one after another to raise your combo, up to x8. Every point is multiplied by your combo. A different color starts it over at x1.'],
            ['Special bubbles', ['Golden bubbles add 3 seconds to the clock and keep your combo going.', 'Spiky urchins break your combo and take 3 seconds away. Leave them alone!']],
            ['Levels', 'Every 18 pops you reach a new level. Bubbles rise faster and you get 5 bonus seconds.'],
            ['Keyboard', ['P or Esc pauses, Space resumes.', 'F2 starts a new game, F4 shows statistics, F5 opens Options and F7 changes the scene.']],
          ],
        });
      }

      // ---------------------------------------------------------- keys & life
      K.keys(win, {
        newGame: () => newGame(), stats: showStats, options: showOptions, appearance: showAppearance, help: showHelp,
        key: (e) => {
          const k = e.key.toLowerCase();
          if (k === 'p' || k === 'escape') { e.preventDefault(); if (state === 'play') pause(); else if (state === 'paused') resume(); }
          else if (k === ' ' && state === 'paused') { e.preventDefault(); resume(); }
          else if ((k === ' ' || k === 'enter') && state === 'title' && e.target === win.el) { e.preventDefault(); newGame(true); }
        },
      });
      const offResize = K.observe(stage, resize);
      const onVis = () => { if (document.hidden) pause(); };
      document.addEventListener('visibilitychange', onVis);
      win.on('blur', () => { if (opts.pauseOnBlur) pause(); });
      win.on('minimize', () => { pause(); stopLoop(); });
      win.on('restore', () => { if (state !== 'paused') startLoop(); });

      resize();
      if (args && args.play) newGame(true); else titleScreen();

      // Test hook (harmless).
      K.debug = K.debug || {};
      K.debug.bubblepop = {
        start: () => newGame(true),
        end: () => { if (state === 'play') { timeLeft = 0.01; } },
        score: (n) => { score = n; },
        popAll: () => { for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].kind === 'bubble' && bubbles[i].y < H - 10) pop(i); },
        state: () => ({ state, score, level, combo, bestCombo, pops, timeLeft: Math.round(timeLeft), bubbles: bubbles.length }),
        list: () => { const r = cv.getBoundingClientRect(); return bubbles.map((b) => ({ x: r.left + b.x, y: r.top + b.y, r: b.r, kind: b.kind, color: b.color })); },
      };

      return {
        onClose() {
          stopLoop();
          cancelPending();
          fx.destroy();
          offResize();
          document.removeEventListener('visibilitychange', onVis);
          if (K.debug && K.debug.bubblepop) delete K.debug.bubblepop;
        },
        onArgs(a) { if (a && a.play && state !== 'play') newGame(true); },
        keepAwake: () => state === 'play' && win.state !== 'minimized',
      };
    },
  });
})();
