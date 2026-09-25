/* Aerium aquarium: the living fish-tank desktop. Clear water, swaying
   plants, caustic light on the sand, god rays, a bubbler, and a tank full of
   glossy fish that school, explore, eat the food you drop and come to say
   hello. Also the "Betta" wallpaper: one blue betta blowing seven bubbles. */
(function () {
  'use strict';
  const A = window.Aerium;
  const F = A.fish;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ------------------------------------------------------------ roster
  const NAMES = {
    betta: ['Captain Bubbles', 'Sir Swims-a-Lot', 'Blue Steel', 'Duchess'],
    goldfish: ['Goldie', 'Sunny', 'Mango', 'Biscuit', 'Nugget'],
    angelfish: ['Stripes', 'Pearl', 'Halo', 'Zebra'],
    guppy: ['Dot', 'Blue', 'Pepper', 'Skittle', 'Confetti'],
    cory: ['Whiskers', 'Scoots', 'Pebble', 'Dusty'],
    tetra: ['The Neon Crew', 'Glow Squad', 'Sparkle School'],
  };
  function defaultRoster() {
    return [
      { id: 'f1', species: 'betta', palette: 0, name: 'Captain Bubbles', hero: true },
      { id: 'f2', species: 'goldfish', palette: 0, name: 'Goldie' },
      { id: 'f3', species: 'goldfish', palette: 1, name: 'Sunny' },
      { id: 'f4', species: 'angelfish', palette: 0, name: 'Stripes' },
      { id: 'f5', species: 'angelfish', palette: 1, name: 'Pearl' },
      { id: 'f6', species: 'guppy', palette: 0, name: 'Dot' },
      { id: 'f7', species: 'guppy', palette: 1, name: 'Blue' },
      { id: 'f8', species: 'guppy', palette: 2, name: 'Pepper' },
      { id: 'f9', species: 'cory', palette: 0, name: 'Whiskers' },
      { id: 'f10', species: 'cory', palette: 0, name: 'Scoots' },
      { id: 'f11', species: 'tetra', palette: 0, name: 'The Neon Crew', count: 12 },
    ];
  }
  function roster() {
    const r = A.store.get('aquarium.fish');
    return Array.isArray(r) && r.length ? r : defaultRoster();
  }
  function setRoster(list) { A.store.set('aquarium.fish', list); }

  // ------------------------------------------------------------ palettes
  const DAY = {
    top: '#8fe4ff', mid: '#1fa9d9', deep: '#0a5a96', abyss: '#063a6e', fog: '#2aa3d6',
    haze: 'rgba(40,150,205,0.18)', sandA: '#f1dfb6', sandB: '#d9bf8a', sandC: '#b89a64',
    grains: ['#f4ead2', '#eadcb8', '#dcc79a', '#cdb07e', '#bc9a6a', '#a47f56', '#d8d2c6', '#bfb8ae', '#9c958c', '#fbf6ea', '#8c6c4a', '#c4a27a'],
    rock: ['#e4eaef', '#a9b5bf', '#6b7985', '#3e4a55'], moss: '#79c24e',
    wood: ['#c29466', '#865c38', '#4a3019', '#2a1a0c'],
    ray: 'rgba(255,255,255,', caustic: 0.34, plantA: '#11651c', plantB: '#3fae32', plantC: '#a6ec6c', stemRed: '#e0603c',
    silhouette: '#1b6f9e', glow: 0, light: 'rgba(255,255,230,0.35)', specks: 0.22,
  };
  const NIGHT = {
    top: '#1a4f8a', mid: '#0b2f63', deep: '#061a3c', abyss: '#030c22', fog: '#0c2c5c',
    haze: 'rgba(6,24,60,0.28)', sandA: '#5a6a84', sandB: '#3e4c66', sandC: '#2a3650',
    grains: ['#6c7a92', '#5e6c86', '#52607a', '#48546c', '#3e4a62', '#36405a', '#65708a', '#58627c', '#4a5470', '#7a869c', '#343c52', '#5a6680'],
    rock: ['#6a7a96', '#46546e', '#2c3649', '#171f2f'], moss: '#2f7a5a',
    wood: ['#5a4a5e', '#3e3044', '#281e2e', '#160f1a'],
    ray: 'rgba(170,210,255,', caustic: 0.12, plantA: '#0a3325', plantB: '#1a6446', plantC: '#3fa878', stemRed: '#8a4a5a',
    silhouette: '#0a2450', glow: 1, light: 'rgba(150,190,255,0.18)', specks: 0.12,
  };

  // ------------------------------------------------------------ photos
  // The gravel, stones, wood, plants and snail are photographs (A.PHOTOS
  // 'scene/...', see src/photos). They are decoded once, up front, and shared
  // by every tank. Until they are ready a tank waits; if they never load it
  // falls back to the painted scenery.
  const scenePhotos = {};
  let sceneReady = false, sceneFailed = false;
  (function loadScene() {
    const all = A.PHOTOS || {};
    const keys = Object.keys(all).filter((k) => k.indexOf('scene/') === 0);
    if (!keys.length) { sceneFailed = true; return; }
    let left = keys.length;
    keys.forEach((k) => {
      const img = new Image();
      img.onload = () => {
        scenePhotos[k.slice(6)] = { img, meta: all[k] };
        if (--left === 0) sceneReady = true;
      };
      img.onerror = () => { sceneFailed = true; };
      img.src = A.photoURL ? A.photoURL(k) : all[k].src;
    });
    // never keep a tank waiting for long
    setTimeout(() => { if (!sceneReady) sceneFailed = true; }, 4000);
  })();

  // ------------------------------------------------------------ tank
  function create(container, opts = {}) {
    const mode = opts.mode || 'tank';
    const preview = !!opts.preview;
    const canvas = document.createElement('canvas');
    canvas.className = 'aq-canvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let W = 0, H = 0, dpr = 1;
    let raf = null, running = false, destroyed = false;
    let last = 0, t = rand(0, 100);
    let lightsOverride = null;
    let P = DAY;
    let slowUntil = 0;

    const S = {
      fish: [], bubbles: [], food: [], particles: [], plants: [], ripples: [],
      bokeh: [], plankton: [],
      pointer: { x: -9999, y: -9999, inside: false, still: 0, lastMove: 0, vx: 0, vy: 0 },
      surfaceY: 0, sandY: 0,
      bubblers: [],
      nextPearl: 0,
      party: 0,
      snail: null,
    };
    let bg = null, sand = null, front = null, glass = null, caus = null, causCtx = null, causImg = null, causWall = null, causWallCtx = null, causWallImg = null;
    let rayTex = null, bubbleTex = null, shadowTex = null;

    function isNight() {
      if (lightsOverride === 'day') return false;
      if (lightsOverride === 'night') return true;
      const l = A.store.get('aquarium.lights', 'auto');
      if (l === 'day') return false;
      if (l === 'night') return true;
      return document.documentElement.dataset.theme === 'dark';
    }

    function resize() {
      const r = container.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      const cap = preview ? 1 : mode === 'betta' ? 1.5 : 1.25;
      dpr = Math.min(window.devicePixelRatio || 1, cap);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      S.surfaceY = Math.max(10, H * 0.045);
      S.fishScale = mode === 'betta' ? 1 : clamp(Math.min(W / 1280, H / 720), 0.55, 1.7) * (preview ? 0.9 : 1.18);
      S.decor = clamp(Math.min(W / 1280, H / 720), 0.42, 1.6);
      S.sandY = H * (mode === 'betta' ? 1.2 : 0.86);
      P = isNight() ? NIGHT : DAY;
      buildStatic();
      if (W < 60 || H < 60) return;
      if (!S.fish.length) populate();
      else S.fish.forEach((f) => { f.x = clamp(f.x, 0, W); f.y = clamp(f.y, S.surfaceY + 20, S.sandY - 10); });
    }

    // ---------------------------------------------------------- static layers
    function layer(w, h) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
      const x = c.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      return [c, x];
    }

    function buildStatic() {
      if (mode === 'betta') { buildBettaStatic(); buildSprites(); return; }
      // photo scenery when it's decoded; otherwise wait a moment (see tick)
      S.photo = sceneReady;
      S.photoWait = !sceneReady && !sceneFailed;
      S.bubblers = preview ? [{ x: W * 0.8 }] : [{ x: W * 0.78 }, { x: W * 0.17 }];
      buildWater();
      buildSand();
      buildFront(S.decor);
      buildGlass();
      buildSprites();

      // Caustics textures (computed live at low resolution)
      caus = document.createElement('canvas');
      caus.width = 120; caus.height = 48;
      causCtx = caus.getContext('2d');
      causImg = causCtx.createImageData(caus.width, caus.height);
      causWall = document.createElement('canvas');
      causWall.width = 120; causWall.height = 48;
      causWallCtx = causWall.getContext('2d');
      causWallImg = causWallCtx.createImageData(120, 48);

      buildPlants();
      if (!preview && !S.snail) S.snail = { x: W * 0.55, y: H * 0.62, dir: 1, hide: 0, ph: 0, v: 7 };
      S.rays = Array.from({ length: preview ? 4 : 7 }, (_, i) => ({ x: (i + 0.5) / (preview ? 4 : 7) + rand(-0.05, 0.05), w: rand(0.035, 0.08), ph: rand(0, TAU), a: rand(0.05, 0.1) }));
      S.bokeh = Array.from({ length: preview ? 3 : 6 }, () => ({ x: rand(0, W), y: rand(H * 0.1, H * 0.9), r: rand(20, 55), vy: rand(-6, -2), ph: rand(0, TAU) }));
      S.plankton = Array.from({ length: preview ? 24 : 90 }, () => ({ x: rand(0, W), y: rand(S.surfaceY, S.sandY), r: rand(0.8, 2), ph: rand(0, TAU), v: rand(2, 6) }));
    }

    // Smooth, repeatable 1D noise from a few seeded sine waves.
    function noise1(seed) {
      const r = A.util.seeded(seed);
      const k = [r() * TAU, r() * TAU, r() * TAU, r() * TAU];
      return (v) => Math.sin(v + k[0]) * 0.5 + Math.sin(v * 2.3 + k[1]) * 0.25 + Math.sin(v * 5.1 + k[2]) * 0.15 + Math.sin(v * 11.7 + k[3]) * 0.1;
    }
    function softShadow(x, cx, cy, rx, ry, a) {
      x.save();
      x.filter = `blur(${(Math.max(2, rx * 0.1) * dpr).toFixed(1)}px)`;
      x.fillStyle = `rgba(0,18,30,${a})`;
      x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, TAU); x.fill();
      x.restore();
    }

    // Water, a light from above, and a distant bank of plants and stones
    // that goes soft and blue with distance.
    function buildWater() {
      let x;
      [bg, x] = layer(W, H);
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, P.top); g.addColorStop(0.35, P.mid); g.addColorStop(0.8, P.deep); g.addColorStop(1, P.abyss);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      const lg = x.createRadialGradient(W * 0.3, -H * 0.1, 0, W * 0.3, -H * 0.1, H * 1.1);
      lg.addColorStop(0, P.light); lg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = lg; x.fillRect(0, 0, W, H);
      const sr = A.util.seeded(7);
      [[0.8, 8, 0.5, 26], [0.45, 3, 0.8, 38]].forEach(([fogK, blurPx, hK, step], li) => {
        if (li && S.photo) { photoBanks(x); return; }
        const [c, cx] = layer(W, H);
        cx.fillStyle = F.mix(P.silhouette, P.fog, fogK * 0.6);
        for (let i = 0; i < 6; i++) {
          cx.beginPath();
          cx.ellipse(sr() * W, S.sandY + 8, W * (0.07 + sr() * 0.1), H * (0.03 + sr() * 0.05), 0, Math.PI, TAU);
          cx.fill();
        }
        for (let i = 0; i < Math.ceil(W / step); i++) {
          const bx = i * step + sr() * 18, hgt = H * (0.1 + sr() * 0.32) * hK;
          if (sr() < 0.3) {
            for (let k = 0; k < 8; k++) { cx.beginPath(); cx.arc(bx + (sr() - 0.5) * 30, S.sandY - hgt * sr(), 5 + sr() * 11, 0, TAU); cx.fill(); }
          } else {
            cx.beginPath();
            cx.moveTo(bx - 4, S.sandY + 6);
            cx.quadraticCurveTo(bx + sr() * 30 - 15, S.sandY - hgt * 0.6, bx + sr() * 16 - 8, S.sandY - hgt);
            cx.quadraticCurveTo(bx + sr() * 30 - 5, S.sandY - hgt * 0.5, bx + 5, S.sandY + 6);
            cx.fill();
          }
        }
        x.save();
        x.setTransform(1, 0, 0, 1, 0, 0);
        x.filter = `blur(${(blurPx * dpr).toFixed(1)}px)`;
        x.globalAlpha = li ? 0.5 : 0.42;
        x.drawImage(c, 0, 0);
        x.restore();
      });
      // bright band just under the surface
      const sg = x.createLinearGradient(0, 0, 0, S.surfaceY + 40);
      sg.addColorStop(0, P === DAY ? 'rgba(230,252,255,0.95)' : 'rgba(120,170,230,0.6)');
      sg.addColorStop(S.surfaceY / (S.surfaceY + 40), P === DAY ? 'rgba(200,245,255,0.6)' : 'rgba(90,140,210,0.32)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = sg; x.fillRect(0, 0, W, S.surfaceY + 40);
    }

    // ---------------------------------------------------------- photo scenery
    // A photo drawn at w x h (CSS px) into a canvas of its own, hazed toward
    // the water color with distance (fog 0..1) and dimmed at night. Far
    // things are drawn at a lower resolution, which softens them like depth
    // of field.
    function photoCanvas(name, w, h, fog = 0, flip = false) {
      const ph = scenePhotos[name];
      const soft = fog > 0.3 ? 0.6 : 1;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * dpr * soft));
      c.height = Math.max(1, Math.round(h * dpr * soft));
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
      g.drawImage(ph.img, 0, 0, c.width, c.height);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      if (P === NIGHT) { g.fillStyle = 'rgba(3,12,34,0.52)'; g.fillRect(0, 0, c.width, c.height); }
      // everything under water takes on a little of its color
      g.globalAlpha = Math.min(0.9, (P === NIGHT ? 0.18 : 0.1) + fog);
      g.fillStyle = P.fog;
      g.fillRect(0, 0, c.width, c.height);
      return c;
    }
    const photoAspect = (name) => { const im = scenePhotos[name].img; return im.naturalHeight / im.naturalWidth; };

    // A far bank of real plants behind everything, lost in the blue.
    function photoBanks(x) {
      const hgt = H * 0.52;
      [['bank-left', -W * 0.03, 1], ['bank-right', W * 1.03, -1]].forEach(([name, ax, side]) => {
        const w = hgt / photoAspect(name);
        const c = photoCanvas(name, w, hgt, 0.5);
        const left = side > 0 ? ax : ax - w;
        x.save();
        x.globalAlpha = 0.85;
        x.drawImage(c, left, S.sandY + 10 - hgt, w, hgt);
        x.restore();
      });
    }

    // Mip levels of the gravel photo, so far-away rows are drawn from a copy
    // near their size instead of sparkling.
    let gravelMips = null;
    function gravelLevels() {
      if (gravelMips) return gravelMips;
      const img = scenePhotos.gravel.img;
      const base = document.createElement('canvas');
      base.width = img.naturalWidth; base.height = img.naturalHeight;
      base.getContext('2d').drawImage(img, 0, 0);
      gravelMips = [base];
      while (gravelMips[gravelMips.length - 1].width > 96) {
        const prev = gravelMips[gravelMips.length - 1];
        const c = document.createElement('canvas');
        c.width = prev.width >> 1; c.height = prev.height >> 1;
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(prev, 0, 0, c.width, c.height);
        gravelMips.push(c);
      }
      return gravelMips;
    }

    // Photo gravel laid in thin rows, smaller and flatter toward the back so
    // the bed recedes, then lit: hazy at the far edge, a little darker at the
    // front, tinted by the water.
    function photoGravel(x, bed) {
      const mips = gravelLevels();
      const T = mips[0].width;
      const big = Math.max(0.75, S.decor);
      const depth = Math.max(1, H - S.sandY);
      const step = preview ? 3 : 2;
      let v = 0;
      x.save();
      x.clip(bed);
      for (let y = S.sandY - 16; y < H + 12; y += step) {
        const u = clamp((y - S.sandY) / depth, 0, 1);
        const sc = lerp(0.2, 0.5, u) * big; // photo px -> CSS px across
        const sy = sc * lerp(0.42, 0.8, u); // ... and down: flatter far away
        const rows = step / sy;
        const tw = T * sc;
        let lvl = mips[0];
        for (const m of mips) { if (m.width >= tw * dpr * 1.2) lvl = m; else break; }
        const k = lvl.width / T;
        const v0 = v % T;
        const x0 = W / 2 - Math.ceil(W / 2 / tw) * tw; // tiles spread from the middle
        for (let xx = x0; xx < W; xx += tw) {
          if (v0 + rows <= T) {
            x.drawImage(lvl, 0, v0 * k, lvl.width, rows * k, xx, y, tw + 0.6, step + 0.6);
          } else {
            const r1 = T - v0, h1 = (step * r1) / rows;
            x.drawImage(lvl, 0, v0 * k, lvl.width, r1 * k, xx, y, tw + 0.6, h1 + 0.3);
            x.drawImage(lvl, 0, 0, lvl.width, (rows - r1) * k, xx, y + h1, tw + 0.6, step - h1 + 0.6);
          }
        }
        v += rows;
      }
      // light: dim at night, water-tinted, a soft shade toward the front
      if (P === NIGHT) { x.fillStyle = 'rgba(3,12,34,0.55)'; x.fillRect(0, S.sandY - 20, W, depth + 40); }
      x.fillStyle = F.rgba(P.fog, P === NIGHT ? 0.2 : 0.14);
      x.fillRect(0, S.sandY - 20, W, depth + 40);
      const fg = x.createLinearGradient(0, S.sandY - 16, 0, H);
      fg.addColorStop(0, F.rgba(P.fog, 0.78));
      fg.addColorStop(0.3, F.rgba(P.fog, 0.18));
      fg.addColorStop(0.6, 'rgba(0,20,40,0)');
      fg.addColorStop(1, 'rgba(0,16,32,0.3)');
      x.fillStyle = fg;
      x.fillRect(0, S.sandY - 16, W, depth + 28);
      x.restore();
    }

    // A photo stone or piece of wood standing on the gravel: a soft contact
    // shadow, the picture sunk a little into the bed, then a few pebbles
    // spilled over its foot.
    function photoProp(x, name, cx, by, w, fog = 0, flip = false) {
      const h = w * photoAspect(name);
      softShadow(x, cx + w * 0.06, by - h * 0.02, w * 0.58, Math.max(4, h * 0.09), P === NIGHT ? 0.3 : 0.45);
      const c = photoCanvas(name, w, h, fog, flip);
      // shade where it meets the gravel
      const g = c.getContext('2d');
      const ao = g.createLinearGradient(0, c.height * 0.72, 0, c.height);
      ao.addColorStop(0, 'rgba(0,15,25,0)'); ao.addColorStop(1, 'rgba(0,15,25,0.4)');
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = 1;
      g.fillStyle = ao;
      g.fillRect(0, 0, c.width, c.height);
      x.save();
      x.beginPath();
      x.rect(cx - w, 0, w * 2, by + 3); // the rest is under the gravel
      x.clip();
      x.drawImage(c, cx - w / 2, by - h * 0.95, w, h);
      x.restore();
      gravelSpill(x, cx, by, w * 0.92);
      return h;
    }

    // A drift of pebbles over the foot of a stone or log so it sits in the
    // bed rather than on it: a strip of the finished bed from just in front,
    // laid over the base with soft edges.
    function gravelSpill(x, cx, by, w) {
      const hh = Math.max(6, 11 * Math.max(0.75, S.decor));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(hh * dpr));
      const g = c.getContext('2d');
      const sy = (by + 3 - S.sandY + 30) * dpr;
      g.drawImage(sand, (cx - w / 2) * dpr, sy, c.width, c.height, 0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in';
      g.translate(c.width / 2, c.height);
      g.scale(c.width / 2, c.height);
      const m = g.createRadialGradient(0, 0.35, 0, 0, 0.35, 1.05);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.6, 'rgba(0,0,0,0.9)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m;
      g.fillRect(-1, -1.2, 2, 1.2);
      x.drawImage(c, cx - w / 2, by - hh + 4, w, hh);
    }

    function buildPhotoFront(dk) {
      let x;
      [front, x] = layer(W, H);
      const base = S.sandY + 12;
      // driftwood first: the stones sit in front of it
      const ww = 390 * dk;
      photoProp(x, 'wood', W * 0.36 + ww * 0.3, base + 4, ww);
      [[W * 0.08, 150, 'rock-a'], [W * 0.14, 84, 'rock-d'], [W * 0.62, 158, 'rock-e'], [W * 0.7, 104, 'rock-b'], [W * 0.93, 124, 'rock-c']].forEach(([rx, rw, name], i) => {
        photoProp(x, name, rx, base + (i % 2 ? 6 : 2), rw * dk, 0, i === 4);
      });
      // the bubbles rise from a small porous stone
      S.bubblers.forEach((b, i) => {
        const h = photoProp(x, 'rock-d', b.x, base + 6, 30 * dk, 0, i % 2 === 1);
        b.y = base + 6 - h * 0.78;
      });
    }

    // A gravel bed: thousands of small shaded grains, bigger toward the
    // front, with the far edge fading into the water.
    function buildSand() {
      let x;
      [sand, x] = layer(W, H - S.sandY + 40);
      x.translate(0, -S.sandY + 30);
      const dune = (px) => S.sandY + Math.sin(px * 0.006) * 8 + Math.sin(px * 0.017 + 1) * 4;
      const bed = new Path2D();
      bed.moveTo(0, dune(0));
      for (let px = 20; px <= W + 20; px += 20) bed.lineTo(px, dune(px));
      bed.lineTo(W + 20, H + 12); bed.lineTo(0, H + 12); bed.closePath();
      if (S.photo) {
        photoGravel(x, bed);
        crest(x, dune);
        return;
      }
      const g = x.createLinearGradient(0, S.sandY - 10, 0, H);
      g.addColorStop(0, P.sandA); g.addColorStop(0.4, P.sandB); g.addColorStop(1, P.sandC);
      x.fillStyle = g; x.fill(bed);
      x.save();
      x.clip(bed);
      const sr = A.util.seeded(11);
      const depth = H - S.sandY;
      const shade = P.grains.map((c) => [c, F.rgba(F.mix(c, '#000000', 0.5), 0.35), F.rgba(F.mix(c, '#ffffff', 0.6), 0.8)]);
      const count = Math.round(W * depth * (preview ? 0.02 : 0.06));
      const big = Math.max(0.7, S.decor);
      for (let i = 0; i < count; i++) {
        const u = sr();
        const y = S.sandY - 4 + depth * u;
        const gx = sr() * W;
        const r = lerp(0.45, 2.3, u) * (0.6 + sr() * 0.8) * big;
        const [c, dark, lite] = shade[Math.floor(sr() * shade.length)];
        if (r > 1.1) { x.fillStyle = dark; x.beginPath(); x.ellipse(gx + r * 0.22, y + r * 0.28, r, r * 0.7, 0, 0, TAU); x.fill(); }
        x.fillStyle = c; x.beginPath(); x.ellipse(gx, y, r, r * 0.7, 0, 0, TAU); x.fill();
        if (r > 0.9) { x.fillStyle = lite; x.beginPath(); x.ellipse(gx - r * 0.28, y - r * 0.26, r * 0.36, r * 0.22, -0.4, 0, TAU); x.fill(); }
      }
      // a few glossy pebbles
      for (let i = 0; i < W / 26; i++) {
        const u = 0.3 + sr() * 0.7;
        const px = sr() * W, py = S.sandY + 6 + (depth - 6) * u, r = (2.5 + sr() * 4.5) * big * (0.6 + u * 0.5);
        const hue = sr();
        const base = P === DAY ? (hue < 0.33 ? '#b9c4cf' : hue < 0.66 ? '#d8bf94' : '#a9b89f') : '#4a5670';
        x.fillStyle = 'rgba(0,15,25,0.3)';
        x.beginPath(); x.ellipse(px + r * 0.25, py + r * 0.4, r * 1.05, r * 0.55, 0, 0, TAU); x.fill();
        const pg = x.createRadialGradient(px - r * 0.3, py - r * 0.35, 0, px, py, r);
        pg.addColorStop(0, F.mix(base, '#ffffff', 0.7)); pg.addColorStop(0.4, base); pg.addColorStop(1, F.mix(base, '#000000', 0.45));
        x.fillStyle = pg;
        x.beginPath(); x.ellipse(px, py, r, r * 0.72, 0, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.7)';
        x.beginPath(); x.ellipse(px - r * 0.35, py - r * 0.32, r * 0.3, r * 0.14, -0.4, 0, TAU); x.fill();
      }
      // the far edge of the bed sinks into the blue
      const fg = x.createLinearGradient(0, S.sandY - 14, 0, S.sandY + 34);
      fg.addColorStop(0, F.rgba(P.fog, 0.55)); fg.addColorStop(1, F.rgba(P.fog, 0));
      x.fillStyle = fg; x.fillRect(0, S.sandY - 14, W, 48);
      x.restore();
      crest(x, dune);
    }
    // light catching the crest of the bed
    function crest(x, dune) {
      x.beginPath();
      x.moveTo(0, dune(0));
      for (let px = 20; px <= W + 20; px += 20) x.lineTo(px, dune(px));
      x.strokeStyle = P === DAY ? 'rgba(255,250,235,0.35)' : 'rgba(150,180,230,0.18)';
      x.lineWidth = 1.2;
      x.stroke();
    }

    // Stones, driftwood and the air stones the bubbles rise from.
    function buildFront(dk) {
      if (S.photo) { buildPhotoFront(dk); return; }
      let x;
      [front, x] = layer(W, H);
      const rocks = [[W * 0.08, 62, 50, '#9fb1c2'], [W * 0.135, 40, 30, '#c9b89a'], [W * 0.62, 72, 58, '#8fa0b0'], [W * 0.695, 46, 34, '#b8a88c'], [W * 0.93, 54, 44, '#a4b6a8']].map(([a, b, c, tint]) => [a, b * dk, c * dk, tint]);
      rocks.forEach(([rx, rw, rh]) => softShadow(x, rx + rw * 0.2, S.sandY + 13, rw * 1.25, rh * 0.18, 0.4));
      rocks.forEach(([rx, rw, rh, tint], i) => drawRock(x, rx, S.sandY + 12, rw, rh, 20 + i * 7, tint));
      drawWood(x, dk);
      S.bubblers.forEach((b) => { b.y = drawAirStone(x, b.x, dk); });
    }

    function drawRock(x, cx, by, rw, rh, seed, tint) {
      const n = noise1(seed);
      const path = new Path2D();
      const N = 64;
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const a = Math.PI + (i / N) * Math.PI;
        const k = 1 + n(a * 1.9) * 0.2 + n(a * 6.1 + 2) * 0.06;
        const px = cx + Math.cos(a) * rw * k, py = by + Math.sin(a) * rh * k * (1 + 0.18 * Math.cos(a * 2 + seed));
        pts.push([px, py]);
        i ? path.lineTo(px, py) : path.moveTo(px, py);
      }
      path.quadraticCurveTo(cx + rw * 0.5, by + rh * 0.12, cx, by + rh * 0.1);
      path.quadraticCurveTo(cx - rw * 0.5, by + rh * 0.1, pts[0][0], pts[0][1]);
      path.closePath();
      const tone = P === DAY ? 0.3 : 0.15;
      const [c0, c1, c2, c3] = P.rock.map((c) => F.mix(c, tint, tone));
      const g = x.createLinearGradient(0, by - rh * 1.2, 0, by + rh * 0.1);
      g.addColorStop(0, c0); g.addColorStop(0.3, c1); g.addColorStop(0.75, c2); g.addColorStop(1, c3);
      x.fillStyle = g;
      x.fill(path);
      x.save();
      x.clip(path);
      // lit from the upper left: a bright face on that side, the right in shade
      const sg = x.createLinearGradient(cx - rw, by - rh, cx + rw, by);
      sg.addColorStop(0, 'rgba(255,255,255,0.2)'); sg.addColorStop(0.45, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(0,12,24,0.38)');
      x.fillStyle = sg;
      x.fillRect(cx - rw * 1.3, by - rh * 1.5, rw * 2.6, rh * 1.8);
      // a few broad facets, like weathered stone
      const r = A.util.seeded(seed * 13 + 1);
      for (let i = 0; i < 3; i++) {
        const fx = cx + (r() - 0.6) * rw, fy = by - rh * (0.4 + r() * 0.6);
        x.beginPath();
        x.moveTo(fx, fy);
        x.lineTo(fx + rw * (0.3 + r() * 0.4), fy - rh * (0.1 + r() * 0.3));
        x.lineTo(fx + rw * (0.5 + r() * 0.4), fy + rh * (0.2 + r() * 0.3));
        x.lineTo(fx + rw * 0.1, fy + rh * (0.3 + r() * 0.3));
        x.closePath();
        x.fillStyle = i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,15,30,0.1)';
        x.fill();
      }
      for (let i = 0; i < rw * rh * 0.45; i++) {
        const px = cx + (r() - 0.5) * rw * 2, py = by - r() * rh * 1.3;
        x.fillStyle = r() < 0.5 ? `rgba(10,20,30,${(0.06 + r() * 0.14).toFixed(3)})` : `rgba(255,255,255,${(0.06 + r() * 0.16).toFixed(3)})`;
        x.fillRect(px, py, 0.6 + r() * 1.6, 0.6 + r() * 1.3);
      }
      x.lineWidth = 0.9;
      for (let i = 0; i < 4; i++) {
        x.strokeStyle = i % 2 ? 'rgba(255,255,255,0.22)' : 'rgba(10,20,35,0.26)';
        const sx = cx + (r() - 0.5) * rw * 1.4, sy = by - (0.3 + r() * 0.8) * rh;
        x.beginPath();
        x.moveTo(sx, sy);
        x.bezierCurveTo(sx + rw * 0.3 * (r() - 0.5), sy + rh * 0.25, sx + rw * 0.4 * (r() - 0.5), sy + rh * 0.5, sx + rw * 0.5 * (r() - 0.5), sy + rh * 0.85);
        x.stroke();
      }
      // algae on the lit top
      x.save();
      x.filter = `blur(${(2 * dpr).toFixed(1)}px)`;
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * (1.12 + r() * 0.76);
        x.fillStyle = F.rgba(P.moss, (0.2 + r() * 0.25).toFixed(3));
        x.beginPath(); x.ellipse(cx + Math.cos(a) * rw * 0.8, by + Math.sin(a) * rh * 0.95, rw * (0.1 + r() * 0.16), rh * 0.08, a + Math.PI / 2, 0, TAU); x.fill();
      }
      x.restore();
      // the wet shine: a soft glow up top and a crisp glint
      const shine = P === DAY ? 1 : 0.4;
      const hg = x.createRadialGradient(cx - rw * 0.35, by - rh * 0.78, 0, cx - rw * 0.35, by - rh * 0.78, rw * 0.62);
      hg.addColorStop(0, `rgba(255,255,255,${0.45 * shine})`); hg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = hg;
      x.fillRect(cx - rw * 1.1, by - rh * 1.5, rw * 1.5, rh * 1.2);
      x.fillStyle = `rgba(255,255,255,${0.55 * shine})`;
      x.beginPath(); x.ellipse(cx - rw * 0.3, by - rh * 0.86, rw * 0.2, rh * 0.05, -0.25, 0, TAU); x.fill();
      // shade where the stone meets the gravel
      const ao = x.createLinearGradient(0, by - rh * 0.3, 0, by + rh * 0.05);
      ao.addColorStop(0, 'rgba(0,15,25,0)'); ao.addColorStop(1, 'rgba(0,15,25,0.45)');
      x.fillStyle = ao;
      x.fillRect(cx - rw * 1.3, by - rh * 0.3, rw * 2.6, rh * 0.4);
      x.restore();
      scatterGrains(x, cx, by, rw * 1.05, seed);
    }

    // Loose gravel spilled over the foot of a stone or ornament.
    function scatterGrains(x, cx, by, w, seed) {
      const r = A.util.seeded(seed * 31 + 5);
      const big = Math.max(0.7, S.decor);
      for (let i = 0; i < w * 0.7; i++) {
        const gx = cx + (r() * 2 - 1) * w, gy = by - 3 + r() * 12;
        const rr = (0.6 + r() * 1.2) * big;
        const col = F.mix(P.grains[Math.floor(r() * P.grains.length)], P.sandB, 0.35);
        x.fillStyle = col;
        x.beginPath(); x.ellipse(gx, gy, rr, rr * 0.7, 0, 0, TAU); x.fill();
        x.fillStyle = F.rgba(F.mix(col, '#ffffff', 0.55), 0.6);
        x.beginPath(); x.ellipse(gx - rr * 0.28, gy - rr * 0.26, rr * 0.34, rr * 0.2, -0.4, 0, TAU); x.fill();
      }
    }

    function drawWood(x, dk) {
      const dx = W * 0.36, dy = S.sandY + 8;
      const branches = [[-60, 6, 0, 0, 22, 26], [0, 0, 170, -80, 28, 13], [70, -34, 118, -128, 14, 5], [128, -60, 214, -92, 11, 4], [40, -14, -30, -60, 12, 5], [150, -70, 176, -40, 7, 3]].map((b) => b.map((v) => v * dk));
      softShadow(x, dx + 60 * dk, dy + 5, 160 * dk, 10 * dk, 0.38);
      branches.forEach(([x0, y0, x1, y1, w0, w1], bi) => {
        const ax = dx + x0, ay = dy + y0, bx = dx + x1, by = dy + y1;
        const mx = (ax + bx) / 2 + 12 * dk, my = (ay + by) / 2 + 14 * dk;
        const n = noise1(40 + bi);
        const N = 28, left = [], right = [], mid = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N, v = 1 - u;
          const px = v * v * ax + 2 * v * u * mx + u * u * bx, py = v * v * ay + 2 * v * u * my + u * u * by;
          const tx = 2 * v * (mx - ax) + 2 * u * (bx - mx), ty = 2 * v * (my - ay) + 2 * u * (by - my);
          const tl = Math.hypot(tx, ty) || 1;
          const nx = -ty / tl, ny = tx / tl;
          const w = lerp(w0, w1, u) * 0.5 * (1 + n(u * 9) * 0.14);
          left.push([px + nx * w, py + ny * w]); right.push([px - nx * w, py - ny * w]); mid.push([px, py, nx, ny, w]);
        }
        const path = new Path2D();
        left.forEach((q, i) => (i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1])));
        const e = mid[N];
        path.quadraticCurveTo(e[0] + (e[0] - mid[N - 1][0]) * 1.5, e[1] + (e[1] - mid[N - 1][1]) * 1.5, right[N][0], right[N][1]);
        for (let i = N - 1; i >= 0; i--) path.lineTo(right[i][0], right[i][1]);
        path.closePath();
        const m = mid[N >> 1];
        const up = m[3] < 0 ? 1 : -1; // which side of the branch faces up
        const g = x.createLinearGradient(m[0] + m[2] * m[4] * up, m[1] + m[3] * m[4] * up, m[0] - m[2] * m[4] * up, m[1] - m[3] * m[4] * up);
        g.addColorStop(0, P.wood[0]); g.addColorStop(0.35, P.wood[1]); g.addColorStop(0.8, P.wood[2]); g.addColorStop(1, P.wood[3]);
        x.fillStyle = g;
        x.fill(path);
        x.save();
        x.clip(path);
        const r = A.util.seeded(60 + bi);
        for (let k = 0; k < 44; k++) {
          const off = (r() * 2 - 1) * 0.92, i0 = Math.floor(r() * N * 0.8), i1 = Math.min(N, i0 + 4 + Math.floor(r() * N * 0.5));
          x.beginPath();
          for (let i = i0; i <= i1; i++) {
            const q = mid[i];
            const px = q[0] + q[2] * q[4] * off, py = q[1] + q[3] * q[4] * off;
            i === i0 ? x.moveTo(px, py) : x.lineTo(px, py);
          }
          x.strokeStyle = r() < 0.6 ? `rgba(25,12,0,${(0.2 + r() * 0.26).toFixed(3)})` : `rgba(255,232,200,${(0.1 + r() * 0.14).toFixed(3)})`;
          x.lineWidth = (0.5 + r() * 1.1) * dk;
          x.stroke();
        }
        if (bi === 1 || bi === 2) {
          const q = mid[Math.floor(N * (bi === 1 ? 0.58 : 0.3))];
          const kr = q[4] * 0.55;
          const kg = x.createRadialGradient(q[0], q[1], 0, q[0], q[1], kr);
          kg.addColorStop(0, F.rgba(P.wood[3], 0.7)); kg.addColorStop(0.55, F.rgba(P.wood[2], 0.45)); kg.addColorStop(0.8, F.rgba(P.wood[0], 0.35)); kg.addColorStop(1, F.rgba(P.wood[1], 0));
          x.fillStyle = kg;
          x.beginPath(); x.ellipse(q[0], q[1], kr, kr * 0.62, Math.atan2(q[3], q[2]) + Math.PI / 2, 0, TAU); x.fill();
        }
        x.restore();
        // wet sheen along the top edge
        x.beginPath();
        (up > 0 ? left : right).forEach((q, i) => (i ? x.lineTo(q[0], q[1] + 1) : x.moveTo(q[0], q[1] + 1)));
        x.strokeStyle = P === DAY ? 'rgba(255,238,210,0.4)' : 'rgba(150,170,220,0.2)';
        x.lineWidth = Math.max(1, 1.4 * dk);
        x.stroke();
      });
      scatterGrains(x, dx - 30 * dk, dy + 4, 60 * dk, 77);
    }

    function drawAirStone(x, bx, dk) {
      const r = 11 * dk, by = S.sandY + 10;
      softShadow(x, bx + 3, by + 2, r * 1.4, 4 * dk, 0.4);
      const base = F.mix(P.rock[1], '#6d86a8', 0.5);
      const g = x.createRadialGradient(bx - r * 0.35, by - r * 0.6, 1, bx, by - r * 0.2, r * 1.15);
      g.addColorStop(0, F.mix(base, '#ffffff', 0.35)); g.addColorStop(0.55, base); g.addColorStop(1, F.mix(base, '#000000', 0.5));
      const dome = new Path2D();
      dome.ellipse(bx, by, r * 1.1, r * 0.95, 0, Math.PI, TAU);
      dome.quadraticCurveTo(bx + r, by + r * 0.22, bx, by + r * 0.18);
      dome.quadraticCurveTo(bx - r, by + r * 0.18, bx - r * 1.1, by);
      x.fillStyle = g;
      x.fill(dome);
      x.save();
      x.clip(dome);
      const rr = A.util.seeded(Math.round(bx) + 9);
      for (let i = 0; i < 90; i++) {
        const a = Math.PI + rr() * Math.PI, d = Math.sqrt(rr());
        const px = bx + Math.cos(a) * d * r, py = by + Math.sin(a) * d * r * 0.9;
        x.fillStyle = rr() < 0.7 ? `rgba(15,25,40,${(0.2 + rr() * 0.3).toFixed(3)})` : 'rgba(255,255,255,0.3)';
        x.beginPath(); x.arc(px, py, (0.35 + rr() * 0.6) * dk, 0, TAU); x.fill();
      }
      x.restore();
      scatterGrains(x, bx, by, r * 1.3, Math.round(bx));
      return by - r * 0.9;
    }

    function buildGlass() {
      let x;
      [glass, x] = layer(W, H);
      const rf = x.createLinearGradient(0, 0, W, H);
      rf.addColorStop(0, 'rgba(255,255,255,0.1)'); rf.addColorStop(0.28, 'rgba(255,255,255,0.02)');
      rf.addColorStop(0.3, 'rgba(255,255,255,0.07)'); rf.addColorStop(0.36, 'rgba(255,255,255,0)'); rf.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = rf; x.fillRect(0, 0, W, H);
      const vg = x.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.4, W / 2, H * 0.5, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,20,50,0)'); vg.addColorStop(1, P === DAY ? 'rgba(0,30,70,0.28)' : 'rgba(0,5,20,0.5)');
      x.fillStyle = vg; x.fillRect(0, 0, W, H);
    }

    // Small textures reused every frame: a soft light shaft that widens as it
    // falls, a glassy bubble and a soft round shadow.
    function buildSprites() {
      const tint = P === DAY ? [255, 252, 238] : [170, 210, 255];
      rayTex = document.createElement('canvas');
      rayTex.width = 96; rayTex.height = 192;
      const rx = rayTex.getContext('2d');
      const img = rx.createImageData(96, 192), d = img.data;
      for (let yy = 0; yy < 192; yy++) {
        const v = yy / 191;
        const half = lerp(0.2, 0.5, v) * 96;
        const fade = Math.pow(1 - v, 1.4) * (0.35 + 0.65 * Math.min(1, v * 8));
        for (let xx = 0; xx < 96; xx++) {
          const dx = (xx - 47.5) / half;
          const a = Math.exp(-dx * dx * 2.2) * fade;
          const o = (yy * 96 + xx) * 4;
          d[o] = tint[0]; d[o + 1] = tint[1]; d[o + 2] = tint[2]; d[o + 3] = Math.round(a * 255);
        }
      }
      rx.putImageData(img, 0, 0);
      if (!bubbleTex) {
        bubbleTex = document.createElement('canvas');
        bubbleTex.width = bubbleTex.height = 64;
        const b = bubbleTex.getContext('2d');
        const bg = b.createRadialGradient(32, 32, 0, 32, 32, 31);
        bg.addColorStop(0, 'rgba(210,245,255,0.05)'); bg.addColorStop(0.72, 'rgba(210,245,255,0.1)');
        bg.addColorStop(0.88, 'rgba(255,255,255,0.55)'); bg.addColorStop(0.96, 'rgba(255,255,255,0.9)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
        b.fillStyle = bg;
        b.beginPath(); b.arc(32, 32, 31, 0, TAU); b.fill();
        b.fillStyle = 'rgba(255,255,255,0.92)';
        b.beginPath(); b.ellipse(22, 20, 9, 5, -0.6, 0, TAU); b.fill();
        b.fillStyle = 'rgba(255,255,255,0.4)';
        b.beginPath(); b.ellipse(42, 45, 6, 3, -0.6, 0, TAU); b.fill();
      }
      if (!shadowTex) {
        shadowTex = document.createElement('canvas');
        shadowTex.width = 64; shadowTex.height = 32;
        const s2 = shadowTex.getContext('2d');
        s2.translate(32, 16); s2.scale(1, 0.5);
        const sg = s2.createRadialGradient(0, 0, 0, 0, 0, 30);
        sg.addColorStop(0, 'rgba(0,20,30,0.9)'); sg.addColorStop(0.6, 'rgba(0,20,30,0.35)'); sg.addColorStop(1, 'rgba(0,20,30,0)');
        s2.fillStyle = sg;
        s2.beginPath(); s2.arc(0, 0, 30, 0, TAU); s2.fill();
      }
    }

    function mossSprite(r) {
      const m = r + 4;
      const c = document.createElement('canvas');
      c.width = c.height = Math.ceil(m * 2 * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      const base = g.createRadialGradient(m - r * 0.3, m - r * 0.35, 1, m, m, r);
      base.addColorStop(0, P.plantC); base.addColorStop(0.55, P.plantB); base.addColorStop(1, P.plantA);
      g.fillStyle = base;
      g.beginPath(); g.arc(m, m, r, 0, TAU); g.fill();
      const sr = A.util.seeded(Math.round(r * 97));
      g.lineWidth = 0.6;
      g.lineCap = 'round';
      for (let i = 0; i < r * r * 3.5; i++) {
        const a = sr() * TAU, dd = Math.sqrt(sr()) * r * 1.02;
        const px = m + Math.cos(a) * dd, py = m + Math.sin(a) * dd;
        const la = dd > r * 0.8 ? a + (sr() - 0.5) * 1.2 : sr() * TAU, ll = 1 + sr() * 2.4;
        const lit = (m - py) / r;
        g.strokeStyle = sr() < 0.45 + lit * 0.3 ? F.rgba(P.plantC, 0.55) : F.rgba(P.plantA, 0.5);
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(la) * ll, py + Math.sin(la) * ll); g.stroke();
      }
      const hl = g.createRadialGradient(m - r * 0.35, m - r * 0.45, 0, m - r * 0.35, m - r * 0.45, r * 0.65);
      hl.addColorStop(0, 'rgba(255,255,255,0.3)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = hl;
      g.fillRect(0, 0, m * 2, m * 2);
      return c;
    }

    function buildPlants() {
      S.plants = [];
      const sr = A.util.seeded(3 + Math.round(W / 100));
      const sc = Math.max(0.6, S.decor);
      const addGrass = (cx, n, layerIdx, hmin, hmax) => {
        for (let i = 0; i < n; i++) {
          S.plants.push({ type: 'blade', x: cx + (sr() - 0.5) * 60 * S.decor, h: H * (hmin + sr() * (hmax - hmin)), w: (4 + sr() * 5) * sc, ph: sr() * TAU, lean: (sr() - 0.5) * 0.4, layer: layerIdx, tone: sr(), tw: sr() * TAU, tn: 0.6 + sr() * 1.4 });
        }
      };
      const addSword = (cx, layerIdx, size) => {
        const n = 9;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.1 + (sr() - 0.5) * 0.15;
          S.plants.push({ type: 'leaf', x: cx + (sr() - 0.5) * 6, a, len: H * size * (0.65 + sr() * 0.45), w: (14 + sr() * 10) * Math.max(0.55, S.decor), ph: sr() * TAU, layer: layerIdx, tone: sr(), bend: (sr() - 0.5) * 0.35 });
        }
      };
      const addStems = (cx, n, layerIdx, hmin, hmax, red) => {
        for (let i = 0; i < n; i++) {
          S.plants.push({ type: 'stem', x: cx + (sr() - 0.5) * 36 * S.decor, h: H * (hmin + sr() * (hmax - hmin)), pairs: 13 + Math.floor(sr() * 6), ph: sr() * TAU, lean: (sr() - 0.5) * 0.3, layer: layerIdx, red, size: (7 + sr() * 3) * sc });
        }
      };
      // Photo plants: a picture of a real plant, anchored where it grows out
      // of the gravel and swaying from there (see drawPhotoPlant).
      const addPhoto = (name, cx, h, layerIdx, o = {}) => {
        const meta = scenePhotos[name].meta;
        const w = h / photoAspect(name);
        S.plants.push({ type: 'photo', name, x: cx, base: S.sandY + (o.drop || 8), w, h, layer: layerIdx, anchor: meta.anchor || [0.5, 1], flip: !!o.flip, sway: (o.sway == null ? 6 : o.sway) * S.decor, ph: sr() * TAU, speed: 0.55 + sr() * 0.3 });
      };
      if (S.photo) {
        addGrass(W * 0.05, 9, 0, 0.3, 0.55);
        addGrass(W * 0.5, 8, 0, 0.35, 0.6);
        addGrass(W * 0.97, 6, 0, 0.3, 0.52);
        addPhoto('java-fern', W * 0.79, H * 0.3, 0, { sway: 4 });
        addPhoto('sword', W * 0.27, H * 0.32, 0, { sway: 7 });
        addPhoto('sword', W * 0.555, H * 0.24, 0, { flip: true, sway: 6 });
        addGrass(W * 0.84, 8, 1, 0.25, 0.46);
        addPhoto('java-fern', W * 0.2, H * 0.21, 1, { flip: true, sway: 4, drop: 10 });
        addPhoto('anubias-b', W * 0.66, H * 0.19, 1, { sway: 3, drop: 12 });
        addPhoto('sword', W * 0.885, H * 0.24, 1, { flip: true, sway: 6, drop: 12 });
        addPhoto('anubias-a', W * 0.035, H * 0.15, 2, { sway: 2, drop: 16 });
        if (!preview) addGrass(W * 0.72, 5, 2, 0.12, 0.24);
        [[W * 0.225, 48, 30], [W * 0.475, 36, 40], [W * 0.765, 44, 34]].forEach(([mx, d, drop], i) => addPhoto('moss', mx, d * S.decor, 2, { sway: 0, flip: i === 1, drop }));
      } else {
        addGrass(W * 0.05, 9, 0, 0.3, 0.55);
        addStems(W * 0.8, preview ? 3 : 5, 0, 0.26, 0.44, false);
        addGrass(W * 0.24, 7, 1, 0.2, 0.42);
        addSword(W * 0.3, 0, 0.2);
        addGrass(W * 0.5, 8, 0, 0.35, 0.6);
        addStems(W * 0.43, preview ? 3 : 5, 1, 0.2, 0.36, true);
        addSword(W * 0.57, 1, 0.16);
        addGrass(W * 0.84, 10, 1, 0.25, 0.5);
        addGrass(W * 0.97, 6, 0, 0.3, 0.52);
        addSword(W * 0.9, 0, 0.22);
        if (!preview) {
          addGrass(W * 0.72, 5, 2, 0.12, 0.24);
          addGrass(W * 0.12, 4, 2, 0.1, 0.2);
      }
        [[W * 0.2, 16], [W * 0.46, 11], [W * 0.76, 14]].forEach(([mx, r]) => S.plants.push({ type: 'moss', x: mx, r: r * S.decor, layer: 2 }));
      }
      if (!preview) {
        [0.04, 0.27, 0.41, 0.55, 0.86, 0.98].forEach((fx, i) => {
          const blades = [];
          const n = (S.photo ? 26 : 14) + Math.floor(sr() * 10);
          for (let k = 0; k < n; k++) blades.push([(sr() - 0.5) * 34 * sc, (14 + sr() * 26) * sc * (S.photo ? 0.8 : 1), (sr() - 0.5) * 0.7, sr() * TAU]);
          S.plants.push({ type: 'tuft', x: W * fx + (sr() - 0.5) * 30, y: S.sandY + (H - S.sandY) * (0.3 + sr() * 0.35), blades, layer: 2, ph: i });
        });
      }
      // Colors are fixed per plant (depth haze included), so work them out once.
      S.plants.forEach((p) => {
        const fogK = p.layer === 0 ? 0.42 : p.layer === 1 ? 0.16 : 0;
        const pa = F.mix(P.plantA, P.fog, fogK), pb = F.mix(P.plantB, P.fog, fogK), pc = F.mix(P.plantC, P.fog, fogK * 0.8);
        if (p.type === 'blade') {
          p.cols = [0, 1, 2, 3, 4].map((k) => {
            const u = k / 4;
            const twist = Math.abs(Math.cos(p.tw + u * p.tn * Math.PI));
            let c = u < 0.5 ? F.mix(pa, pb, u * 2) : F.mix(pb, pc, (u - 0.5) * 2);
            if (p.tone > 0.5) c = F.mix(c, pc, 0.15);
            return F.mix(c, pa, (1 - twist) * 0.45);
          });
        } else if (p.type === 'leaf') {
          p.cols = [pa, F.mix(pa, pb, 0.6), p.tone > 0.5 ? pb : F.mix(pb, pc, 0.35), pc];
        } else if (p.type === 'stem') {
          const top = p.red ? F.mix(P.stemRed, P.fog, fogK) : pc;
          p.cols = [F.mix(pa, '#000000', 0.1), F.mix(pa, pb, 0.5), pb, F.mix(pb, top, 0.55), top];
        } else if (p.type === 'moss') {
          p.tex = mossSprite(p.r);
        } else if (p.type === 'tuft') {
          p.cols = S.photo ? [F.mix(F.mix(P.plantA, P.plantB, 0.45), P.fog, 0.12), F.mix(F.mix(P.plantB, P.plantC, 0.25), P.fog, 0.08)] : [F.mix(P.plantA, P.plantB, 0.3), F.mix(P.plantB, P.plantC, 0.5)];
        } else if (p.type === 'photo') {
          p.tex = photoCanvas(p.name, p.w, p.h, p.layer === 0 ? 0.36 : p.layer === 1 ? 0.12 : 0, p.flip);
        }
      });
    }

    // A photo plant swaying in the current: drawn in horizontal bands, each
    // sheared so its top and bottom edges line up with its neighbors', the
    // sway growing from nothing at the roots to its most at the tips.
    function drawPhotoPlant(p) {
      const tex = p.tex, n = p.sway ? 10 : 1;
      const ax = p.flip ? 1 - p.anchor[0] : p.anchor[0];
      const x0 = p.x - p.w * ax, top = p.base - p.h * p.anchor[1];
      const off = (u) => (p.sway ? p.sway * Math.pow(u, 1.5) * Math.sin(t * p.speed + p.ph + u * 1.3) : 0);
      const bandH = p.h / n, texH = tex.height / n;
      let oTop = off(1);
      for (let i = 0; i < n; i++) {
        const ya = top + bandH * i;
        const ub = Math.max(0, (p.base - (ya + bandH)) / (p.h * p.anchor[1]));
        const oBot = off(ub);
        const c = (oBot - oTop) / bandH;
        const extra = i < n - 1 ? 0.8 : 0; // overlap the next band a little
        ctx.setTransform(dpr, 0, c * dpr, dpr, (oTop - c * ya) * dpr, 0);
        ctx.drawImage(tex, 0, texH * i, tex.width, texH + (extra * tex.height) / p.h, x0, ya, p.w, bandH + extra);
        oTop = oBot;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ---------------------------------------------------------- fish
    function zoneY(f) {
      const top = S.surfaceY + 24, bottom = S.sandY - 12;
      return [lerp(top, bottom, f.sp.zone[0]), lerp(top, bottom, f.sp.zone[1])];
    }
    function spawnFish(entry, count, fromEdge) {
      const out = [];
      for (let k = 0; k < (count || 1); k++) {
        const f = F.makeFish(entry.species, { palette: entry.palette });
        if (entry.hero) f.len *= 1.12;
        f.id = entry.id + (count > 1 ? '-' + k : '');
        f.rosterId = entry.id;
        f.name = entry.name;
        f.hero = !!entry.hero;
        f.z = entry.species === 'cory' ? rand(0.55, 0.9) : entry.hero ? 0.95 : rand(0.15, 1);
        if (entry.species === 'tetra') f.z = rand(0.45, 0.75);
        const [y0, y1] = zoneY(f);
        f.x = fromEdge ? (Math.random() < 0.5 ? -60 : W + 60) : rand(40, W - 40);
        f.y = rand(y0, y1);
        f.vx = rand(-1, 1) * f.sp.speed; f.vy = 0;
        f.facing = f.vx >= 0 ? 1 : -1;
        f.turn = f.facing;
        f.pitch = 0;
        f.mode = 'wander';
        f.target = { x: rand(40, W - 40), y: rand(y0, y1) };
        f.timer = rand(2, 8);
        f.happy = 0;
        f.fade = fromEdge ? 1 : 1;
        f.speedK = rand(0.85, 1.15);
        f.school = entry.species === 'tetra' ? entry.id : null;
        out.push(f);
      }
      return out;
    }
    function populate() {
      S.fish = [];
      if (mode === 'betta') {
        const f = F.makeFish('betta', { palette: 4 });
        f.len = 70;
        f.id = 'hero'; f.hero = true; f.z = 1;
        f.x = W * 0.42; f.y = H * 0.5; f.vx = 0; f.vy = 0; f.facing = 1; f.turn = 1; f.pitch = 0;
        f.mode = 'hover'; f.timer = 6; f.flare = 0; f.target = { x: f.x, y: f.y };
        S.fish.push(f);
        S.nextBubbles = 3;
        return;
      }
      const small = W < 900 || preview;
      roster().forEach((e) => {
        let n = e.count || 1;
        if (e.species === 'tetra' && small) n = Math.min(n, preview ? 6 : 8);
        S.fish.push(...spawnFish(e, n));
      });
      sortFish();
    }
    function sortFish() { S.fish.sort((a, b) => a.z - b.z); }

    function syncRoster() {
      if (mode === 'betta') return;
      const r = roster();
      const ids = new Set(r.map((e) => e.id));
      // fish removed from the roster swim away
      S.fish.forEach((f) => { if (f.rosterId && !ids.has(f.rosterId) && f.mode !== 'leave') { f.mode = 'leave'; f.target = { x: f.x < W / 2 ? -120 : W + 120, y: f.y }; } });
      r.forEach((e) => {
        const existing = S.fish.filter((f) => f.rosterId === e.id);
        if (!existing.length) S.fish.push(...spawnFish(e, e.count || 1, true));
        else existing.forEach((f) => { f.name = e.name; if (f.palette !== e.palette && e.palette != null) { const nf = F.makeFish(e.species, { palette: e.palette }); f.pal = nf.pal; f.palette = nf.palette; f._g = null; } });
      });
      sortFish();
    }
    const offRoster = A.bus.on('store:aquarium.fish', syncRoster);
    const offLights = A.bus.on('store:aquarium.lights', () => { P = isNight() ? NIGHT : DAY; buildStatic(); });
    const offTheme = A.bus.on('theme:change', () => { const np = isNight() ? NIGHT : DAY; if (np !== P) { P = np; buildStatic(); } });

    function nearestFood(f, maxD) {
      let best = null, bd = maxD * maxD;
      for (const p of S.food) {
        if (p.eaten) continue;
        if (f.sp.bottom && p.y < S.sandY - 40) continue;
        const dx = p.x - f.x, dy = p.y - f.y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }

    function updateFish(f, dt) {
      const sp = f.sp;
      const scale = (0.55 + 0.6 * f.z) * (S.fishScale || 1);
      let desired = sp.speed * f.speedK * Math.sqrt(S.fishScale || 1) * 1.15;
      const [y0, y1] = zoneY(f);
      f.timer -= dt;

      if (mode === 'betta') { updateHero(f, dt); return; }

      // decide behavior
      if (f.mode !== 'leave' && f.mode !== 'flee') {
        const food = S.food.length ? nearestFood(f, f.sp.bottom ? 260 : 420) : null;
        if (food) {
          f.mode = 'food';
          f.target.x = food.x; f.target.y = food.y;
          desired *= 2.1;
          const m = mouthWorld(f);
          if (Math.hypot(m[0] - food.x, m[1] - food.y) < 7 * scale + 3) eat(f, food);
        } else if (f.hero && S.pointer.inside && S.pointer.still > 1.1 && !preview) {
          f.mode = 'curious';
          const side = f.x < S.pointer.x ? -1 : 1;
          f.target.x = S.pointer.x + side * (f.len * scale * 0.9 + 26);
          f.target.y = clamp(S.pointer.y, y0, y1);
          desired *= 1.2;
        } else {
          if (f.mode === 'food' || f.mode === 'curious') { f.mode = 'wander'; f.timer = 0; }
          if (f.timer <= 0) {
            f.timer = sp.bottom ? rand(1.5, 5) : f.hero ? rand(4, 10) : rand(3, 9);
            f.target.x = rand(30, W - 30);
            f.target.y = rand(y0, y1);
            if (sp.bottom) f.target.y = rand(S.sandY - 22, S.sandY - 8);
            f.idle = Math.random() < (f.hero ? 0.45 : sp.bottom ? 0.4 : 0.2) ? rand(1.5, 4) : 0;
          }
        }
      }
      if (f.mode === 'flee') { desired = sp.speed * 5; if (f.timer <= 0) { f.mode = 'wander'; f.timer = 0; } }
      if (f.mode === 'leave') desired = sp.speed * 2.5;

      let tx = f.target.x - f.x, ty = f.target.y - f.y;
      const dist = Math.hypot(tx, ty) || 1;
      if (f.idle > 0 && f.mode === 'wander') { f.idle -= dt; desired *= 0.12; }
      if (f.mode === 'curious' && dist < 20) desired *= dist / 20;
      if (dist < 30 && f.mode === 'wander' && f.idle <= 0) f.timer = Math.min(f.timer, 0.5);
      let ax = (tx / dist) * desired - f.vx, ay = (ty / dist) * desired * 0.7 - f.vy;

      // schooling
      if (f.school) {
        let cx = 0, cy = 0, avx = 0, avy = 0, sx = 0, sy = 0, n = 0;
        for (const o of S.fish) {
          if (o === f || o.school !== f.school) continue;
          const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy);
          if (d > 120) continue;
          n++; cx += o.x; cy += o.y; avx += o.vx; avy += o.vy;
          const sepD = 16 * (S.fishScale || 1); if (d < sepD) { sx -= dx / (d || 1) * (sepD - d); sy -= dy / (d || 1) * (sepD - d); }
        }
        if (n) {
          ax += ((cx / n - f.x) * 0.6 + (avx / n - f.vx) * 0.9 + sx * 6);
          ay += ((cy / n - f.y) * 0.6 + (avy / n - f.vy) * 0.9 + sy * 6);
        }
        // the school shares a wandering target
        const lead = S.schools[f.school];
        if (lead && f.mode === 'wander') { ax += (lead.x - f.x) * 0.25; ay += (lead.y - f.y) * 0.25; }
      }
      // walls
      if (f.mode !== 'leave') {
        if (f.x < 30) ax += (30 - f.x) * 4; if (f.x > W - 30) ax -= (f.x - W + 30) * 4;
        if (f.y < y0) ay += (y0 - f.y) * 3; if (f.y > y1) ay -= (f.y - y1) * 3;
      }
      const k = f.mode === 'flee' ? 6 : 1.6;
      f.vx += clamp(ax, -300, 300) * dt * k;
      f.vy += clamp(ay, -200, 200) * dt * k;
      const sp2 = Math.hypot(f.vx, f.vy), max = desired * 1.2 + 6;
      if (sp2 > max) { f.vx *= max / sp2; f.vy *= max / sp2; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.mode === 'leave' && (f.x < -100 || f.x > W + 100)) f.gone = true;
      animate(f, dt, sp2);
    }

    function animate(f, dt, speed) {
      if (f.vx > 3) f.facing = 1; else if (f.vx < -3) f.facing = -1;
      const tr = f.sp.turnRate * dt;
      f.turn += clamp(f.facing - f.turn, -tr, tr);
      const targetPitch = clamp(Math.atan2(f.vy, Math.abs(f.vx) + 8), -0.45, 0.45);
      f.pitch += (targetPitch - f.pitch) * Math.min(1, dt * 3);
      const beat = 3 + speed * 0.09 + (f.happy > 0 ? 6 : 0);
      f.phase += dt * beat;
      f.finPhase += dt * (2.5 + speed * 0.03);
      f.bend = 0.01 + Math.min(0.03, speed * 0.0006) + (f.happy > 0 ? 0.02 : 0);
      if (f.happy > 0) f.happy -= dt;
      f.flare += ((f.mode === 'curious' ? 1 : 0) - f.flare) * Math.min(1, dt * 2);
      // blow a bubble now and then
      if (!preview && Math.random() < dt * (f.hero ? 0.06 : 0.015)) {
        const m = mouthWorld(f);
        S.bubbles.push({ x: m[0], y: m[1], r: rand(1.4, 2.6), vy: -rand(20, 34), ph: rand(0, TAU), wob: rand(2, 5), grow: 0.3 });
      }
    }

    function mouthWorld(f) {
      const scale = (0.55 + 0.6 * f.z) * (f.heroScale || S.fishScale || 1);
      const m = F.mouth(f);
      const dir = F.heading(f);
      const cs = Math.cos(f.pitch * dir), sn = Math.sin(f.pitch * dir);
      const lx = m[0] * scale * (F.isPhoto(f) ? 1 : f.turn), ly = m[1] * scale;
      return [f.x + lx * cs - ly * sn, f.y + lx * sn + ly * cs];
    }

    function eat(f, food) {
      food.eaten = true;
      f.happy = 0.6;
      for (let i = 0; i < 4; i++) S.particles.push({ x: food.x, y: food.y, vx: rand(-20, 20), vy: rand(-20, 10), life: 0.4, max: 0.4, r: 1.2, c: 'rgba(255,220,160,' });
      if (!preview) A.sound.play('plop', { minGap: 120 });
    }

    // Hero betta for the Betta wallpaper: hovers, turns slowly, blows seven bubbles.
    function updateHero(f, dt) {
      const e = F.isPhoto(f) ? F.extent(f) : null;
      const scale = f.heroScale = Math.max(1.2, e ? (W * 0.3) / (e.x1 - e.x0) : (W * 0.28) / (f.len * 1.55));
      const home = { x: W * 0.4, y: H * 0.52 };
      if (S.pointer.inside && S.pointer.still > 0.4 && !preview) {
        f.target = { x: clamp(S.pointer.x - Math.sign(S.pointer.x - f.x) * f.len * scale * 0.9, W * 0.15, W * 0.85), y: clamp(S.pointer.y, H * 0.25, H * 0.75) };
        f.mode = 'curious';
      } else {
        if (f.mode !== 'hover' || f.timer <= 0) {
          f.mode = 'hover';
          f.timer = rand(9, 16);
          f.target = { x: home.x + rand(-W * 0.12, W * 0.12), y: home.y + rand(-H * 0.08, H * 0.08) };
        }
      }
      const tx = f.target.x - f.x, ty = f.target.y - f.y;
      const d = Math.hypot(tx, ty) || 1;
      const desired = Math.min(22 * scale * 0.5, d * 0.6);
      f.vx += ((tx / d) * desired - f.vx) * dt * 0.8;
      f.vy += ((ty / d) * desired * 0.6 - f.vy) * dt * 0.8;
      f.x += f.vx * dt; f.y += f.vy * dt + Math.sin(t * 0.7) * 3 * dt;
      animate(f, dt, Math.hypot(f.vx, f.vy) * 0.4);
      S.nextBubbles -= dt;
      if (S.nextBubbles <= 0) { S.nextBubbles = rand(8, 12); blowSeven(f); }
    }
    function blowSeven(f) {
      for (let i = 0; i < 7; i++) {
        setTimeout(() => {
          if (destroyed) return;
          const m = mouthWorld(f);
          const k = f.heroScale || 1;
          S.bubbles.push({ x: m[0], y: m[1] - 4, r: (1.4 + i * 0.35) * k, vy: -rand(24, 32) * Math.sqrt(k), vx: f.turn * (5 + i * 3) * Math.sqrt(k), ph: i, wob: 2.5, grow: 0.9, rim: true });
        }, i * 380);
      }
    }

    // ---------------------------------------------------------- bubbles & food
    function updateBubbles(dt) {
      if (mode !== 'betta') {
        S.bubblers.forEach((b) => {
          b.acc = (b.acc || 0) + dt;
          const interval = S.party > 0 ? 0.03 : 0.11;
          while (b.acc > interval) {
            b.acc -= interval;
            S.bubbles.push({ x: b.x + rand(-3, 3), y: b.y || S.sandY - 4, r: rand(1.6, 4.2), vy: -rand(55, 90), ph: rand(0, TAU), wob: rand(2, 6), grow: 1 });
          }
        });
        S.nextPearl -= dt;
        if (S.nextPearl <= 0 && S.plants.length) {
          S.nextPearl = rand(0.5, 1.6);
          const p = pick(S.plants.filter((q) => q.type !== 'moss'));
          if (p) S.bubbles.push({ x: p.x + rand(-6, 6), y: S.sandY - (p.h || p.len || 40) * rand(0.4, 0.95), r: rand(0.8, 1.6), vy: -rand(18, 30), ph: rand(0, TAU), wob: 1.5, grow: 0.2 });
        }
      }
      for (const b of S.bubbles) {
        b.y += b.vy * dt;
        b.vy -= 6 * dt;
        b.x += Math.sin(t * 3 + b.ph) * b.wob * dt * 3 + (b.vx || 0) * dt;
        if (b.vx) b.vx *= 1 - dt * 0.3;
        b.r += b.grow * dt * 0.6;
        if (b.y < S.surfaceY + 2) { b.dead = true; S.ripples.push({ x: b.x, y: S.surfaceY + 2, r: b.r, life: 0.6 }); }
      }
      S.bubbles = S.bubbles.filter((b) => !b.dead);
      if (S.bubbles.length > 400) S.bubbles.splice(0, S.bubbles.length - 400);
      for (const p of S.food) {
        if (p.eaten) continue;
        if (p.y < S.sandY - 3) { p.y += p.vy * dt; p.x += Math.sin(t * 2 + p.ph) * 6 * dt; p.rot += p.vr * dt; }
        else { p.rest += dt; if (p.rest > 18) p.eaten = true; }
      }
      S.food = S.food.filter((p) => !p.eaten);
      for (const r of S.ripples) { r.life -= dt; r.r += dt * 24; }
      S.ripples = S.ripples.filter((r) => r.life > 0);
      for (const p of S.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 20 * dt; }
      S.particles = S.particles.filter((p) => p.life > 0);
    }

    function dropFood(x, y) {
      y = clamp(y, S.surfaceY + 6, S.sandY - 6);
      for (let i = 0; i < 6; i++) {
        S.food.push({ x: x + rand(-18, 18), y: y + rand(-10, 6), vy: rand(14, 24), ph: rand(0, TAU), rot: rand(0, TAU), vr: rand(-2, 2), s: rand(2.2, 3.6), c: pick(['#e8702a', '#c8412a', '#f5a623', '#8a5a2a']), rest: 0 });
      }
      S.ripples.push({ x, y, r: 4, life: 0.5 });
      A.sound.play('plop');
    }

    function popBubbleAt(x, y) {
      let popped = false;
      for (const b of S.bubbles) {
        if (b.dead) continue;
        if (Math.hypot(b.x - x, b.y - y) < b.r + 7) {
          b.dead = true;
          popped = true;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            S.particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, life: 0.25, max: 0.25, r: 0.9, c: 'rgba(255,255,255,' });
          }
        }
      }
      if (popped) A.sound.play('bubble', { minGap: 70 });
    }

    function startle(x, y, radius, strength) {
      S.fish.forEach((f) => {
        const d = Math.hypot(f.x - x, f.y - y);
        if (d < radius && f.mode !== 'leave') {
          f.mode = 'flee';
          f.timer = 0.9 * strength;
          const ax = (f.x - x) / (d || 1), ay = (f.y - y) / (d || 1);
          f.target = { x: clamp(f.x + ax * 260, 20, W - 20), y: f.y + ay * 120 };
          f.vx += ax * 80 * strength; f.vy += ay * 50 * strength;
        }
      });
    }

    // ---------------------------------------------------------- drawing
    function updateCaustics() {
      const cw = caus.width, ch = caus.height, d = causImg.data, dw = causWallImg.data;
      const tt = t * 0.9;
      let i = 0;
      for (let y = 0; y < ch; y++) {
        const fade = Math.min(1, y / (ch * 0.6));
        const wallA = fade * fade * (3 - 2 * fade);
        for (let x = 0; x < cw; x++) {
          const px = x * 0.21, py = y * 0.33;
          const v = Math.abs(Math.sin(px + Math.sin(py * 0.9 + tt) * 1.7 + tt * 0.35) + Math.sin(py * 1.1 + Math.sin(px * 0.8 - tt * 0.8) * 1.6 - tt * 0.25));
          const c = Math.pow(Math.max(0, 1 - v), 5) * 255;
          d[i] = dw[i] = 255; d[i + 1] = dw[i + 1] = 255; d[i + 2] = dw[i + 2] = 245;
          d[i + 3] = c > 255 ? 255 : c;
          dw[i + 3] = (c > 255 ? 255 : c) * wallA;
          i += 4;
        }
      }
      causCtx.putImageData(causImg, 0, 0);
      causWallCtx.putImageData(causWallImg, 0, 0);
    }
    function drawWallCaustics() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = P.caustic * 0.4;
      ctx.drawImage(causWall, 0, H * 0.28, W, S.sandY - H * 0.28);
      ctx.restore();
    }
    // Dancing light on the gravel, drawn over the bed so it shows.
    function drawFloorCaustics() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = P.caustic * 0.85;
      ctx.drawImage(caus, 0, S.sandY - 6, W, H - S.sandY + 6);
      ctx.restore();
    }

    function drawRays() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const len = S.sandY - S.surfaceY;
      const slant = (W * 0.12) / Math.max(1, len);
      for (const r of S.rays) {
        const sway = Math.sin(t * 0.08 + r.ph) * W * 0.03;
        const x0 = r.x * W + sway, w0 = r.w * W;
        ctx.globalAlpha = Math.min(1, r.a * (0.6 + 0.4 * Math.sin(t * 0.35 + r.ph * 2)) * 4.2);
        ctx.setTransform(dpr, 0, slant * dpr, dpr, (x0 - slant * S.surfaceY) * dpr, 0);
        ctx.drawImage(rayTex, -w0 * 1.7, S.surfaceY, w0 * 3.4, len);
      }
      ctx.restore();
    }

    function drawPlants(layerIdx) {
      for (const p of S.plants) {
        if (p.layer !== layerIdx) continue;
        if (p.type === 'blade') drawBlade(p);
        else if (p.type === 'leaf') drawSwordLeaf(p);
        else if (p.type === 'stem') drawStem(p);
        else if (p.type === 'tuft') drawTuft(p);
        else if (p.type === 'photo') drawPhotoPlant(p);
        else if (p.type === 'moss') {
          const m = p.r + 4;
          ctx.drawImage(p.tex, p.x - m, S.sandY + 4 - p.r * 0.7 - m, m * 2, m * 2);
        }
      }
    }

    // Ribbon grass: long blades that twist as they rise, darker where they
    // turn edge-on, swaying in the current.
    function drawBlade(p) {
      const n = 12, base = S.sandY + 6, seg = p.h / n;
      const L = [], R = [], C = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const sway = Math.sin(t * 0.9 + p.ph + u * 1.6) * 16 * Math.pow(u, 1.4) + p.lean * p.h * u * u;
        const cx = p.x + sway;
        const twist = Math.abs(Math.cos(p.tw + u * p.tn * Math.PI));
        const w = p.w * Math.pow(1 - u, 0.5) * 0.5 * (0.3 + 0.7 * twist) + 0.35;
        L.push(cx - w); R.push(cx + w); C.push(cx);
      }
      ctx.beginPath();
      ctx.moveTo(L[0], base);
      for (let i = 1; i <= n; i++) ctx.lineTo(L[i], base - seg * i);
      ctx.quadraticCurveTo(C[n], base - p.h - 3, R[n], base - p.h);
      for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i], base - seg * i);
      ctx.closePath();
      const g = ctx.createLinearGradient(p.x, base, C[n], base - p.h);
      for (let k = 0; k < 5; k++) g.addColorStop(k / 4, p.cols[k]);
      ctx.fillStyle = g;
      if (S.photo) ctx.globalAlpha = 0.88;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (S.photo) {
        ctx.beginPath();
        for (let i = 0; i <= n; i++) i ? ctx.lineTo(R[i], base - seg * i) : ctx.moveTo(R[i], base);
        ctx.strokeStyle = 'rgba(0,30,10,0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.beginPath();
      for (let i = 1; i < n; i++) i === 1 ? ctx.moveTo(C[i], base - seg * i) : ctx.lineTo(C[i], base - seg * i);
      ctx.strokeStyle = 'rgba(235,255,220,0.16)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    // Broad sword leaves on a short stalk, with a midrib and side veins.
    function drawSwordLeaf(p) {
      const sway = Math.sin(t * 0.7 + p.ph) * 0.07;
      const a = p.a + sway;
      const bx = p.x, by = S.sandY + 4;
      const pl = p.len * 0.28;
      const sx = bx + Math.cos(a) * pl, sy = by + Math.sin(a) * pl;
      ctx.strokeStyle = p.cols[1];
      ctx.lineWidth = Math.max(1.2, p.w * 0.1);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + Math.cos(a) * pl * 0.5, by + Math.sin(a) * pl * 0.5 + 2, sx, sy);
      ctx.stroke();
      const bl = p.len * 0.74;
      const a2 = a + p.bend * 0.6 + sway * 0.6;
      const tx = sx + Math.cos(a2) * bl, ty = sy + Math.sin(a2) * bl;
      const nx = -Math.sin(a2), ny = Math.cos(a2);
      const cx = (sx + tx) / 2 + nx * p.w * p.bend + bl * 0.02, cy = (sy + ty) / 2 + ny * p.w * p.bend + bl * 0.07;
      const M = 12, mid = [], lft = [], rgt = [];
      for (let i = 0; i <= M; i++) {
        const u = i / M, v = 1 - u;
        const px = v * v * sx + 2 * v * u * cx + u * u * tx, py = v * v * sy + 2 * v * u * cy + u * u * ty;
        const ddx = 2 * v * (cx - sx) + 2 * u * (tx - cx), ddy = 2 * v * (cy - sy) + 2 * u * (ty - cy);
        const dl = Math.hypot(ddx, ddy) || 1;
        const qx = -ddy / dl, qy = ddx / dl;
        const w = p.w * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04)), 0.75);
        mid.push([px, py]); lft.push([px + qx * w, py + qy * w]); rgt.push([px - qx * w, py - qy * w]);
      }
      ctx.beginPath();
      lft.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      for (let i = M; i >= 0; i--) ctx.lineTo(rgt[i][0], rgt[i][1]);
      ctx.closePath();
      const g = ctx.createLinearGradient(sx, sy, tx, ty);
      g.addColorStop(0, p.cols[1]); g.addColorStop(0.5, p.cols[2]); g.addColorStop(1, p.cols[3]);
      ctx.fillStyle = g;
      ctx.fill();
      // one half catches more light
      ctx.beginPath();
      lft.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      for (let i = M; i >= 0; i--) ctx.lineTo(mid[i][0], mid[i][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.fill();
      // side veins and the midrib
      ctx.beginPath();
      for (let i = 2; i < M - 1; i += 2) {
        const j = Math.min(M, i + 2);
        ctx.moveTo(mid[i][0], mid[i][1]); ctx.quadraticCurveTo((mid[i][0] + lft[j][0]) / 2, (mid[i][1] + lft[j][1]) / 2, lft[j][0] * 0.85 + mid[j][0] * 0.15, lft[j][1] * 0.85 + mid[j][1] * 0.15);
        ctx.moveTo(mid[i][0], mid[i][1]); ctx.quadraticCurveTo((mid[i][0] + rgt[j][0]) / 2, (mid[i][1] + rgt[j][1]) / 2, rgt[j][0] * 0.85 + mid[j][0] * 0.15, rgt[j][1] * 0.85 + mid[j][1] * 0.15);
      }
      ctx.strokeStyle = 'rgba(225,255,205,0.16)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.beginPath();
      mid.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.strokeStyle = 'rgba(230,255,210,0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Dwarf hairgrass: a clump of fine blades at the front of the bed.
    function drawTuft(p) {
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let k = pass; k < p.blades.length; k += 2) {
          const [dx, h, lean, ph] = p.blades[k];
          const sway = Math.sin(t * 1.1 + ph) * 3 + lean * h;
          ctx.moveTo(p.x + dx, p.y);
          ctx.quadraticCurveTo(p.x + dx + sway * 0.3, p.y - h * 0.6, p.x + dx + sway, p.y - h);
        }
        ctx.strokeStyle = p.cols[pass];
        ctx.lineWidth = S.photo ? (pass ? 0.7 : 1) : pass ? 1 : 1.5;
        ctx.stroke();
      }
    }

    // Stem plants: pairs of small leaves up a swaying stem, warming to red
    // at the tips on the red variety. Leaves are batched by color.
    const stemBuckets = [[], [], [], []];
    function drawStem(p) {
      const base = S.sandY + 6, n = p.pairs;
      const px = [], py = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        px.push(p.x + Math.sin(t * 0.8 + p.ph + u * 1.4) * 10 * Math.pow(u, 1.3) + p.lean * p.h * u * u);
        py.push(base - p.h * u);
      }
      ctx.beginPath();
      for (let i = 0; i <= n; i++) i ? ctx.lineTo(px[i], py[i]) : ctx.moveTo(px[i], py[i]);
      ctx.strokeStyle = p.cols[0];
      ctx.lineWidth = 1.3;
      ctx.stroke();
      stemBuckets.forEach((b) => (b.length = 0));
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        const dir = Math.atan2(py[i] - py[i - 1], px[i] - px[i - 1]);
        const size = p.size * (1 - u * 0.38);
        const spread = 1.1 + Math.sin(t * 0.9 + i + p.ph) * 0.1;
        const turn = 0.55 + 0.45 * Math.abs(Math.cos(i * 1.3 + p.ph)); // pairs turn around the stem
        stemBuckets[Math.min(3, Math.floor(u * 4))].push(px[i], py[i], dir, size, spread, turn);
      }
      stemBuckets.forEach((b, k) => {
        if (!b.length) return;
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (let i = 0; i < b.length; i += 6) {
            const x0 = b[i], y0 = b[i + 1], dir = b[i + 2], size = b[i + 3], spread = b[i + 4], turn = b[i + 5];
            for (const sgn of [-1, 1]) {
              const len = size * (sgn < 0 ? turn : 1.55 - turn);
              const la = dir + sgn * spread;
              const lx = x0 + Math.cos(la) * len * 0.9, ly = y0 + Math.sin(la) * len * 0.9;
              if (pass) {
                const hx = lx - Math.sin(la) * size * 0.1, hy = ly + Math.cos(la) * size * -0.1;
                ctx.moveTo(hx + Math.cos(la) * len * 0.55, hy + Math.sin(la) * len * 0.55);
                ctx.ellipse(hx, hy, len * 0.55, size * 0.16, la, 0, TAU);
              } else {
                ctx.moveTo(lx + Math.cos(la) * len, ly + Math.sin(la) * len);
                ctx.ellipse(lx, ly, len, size * 0.46, la, 0, TAU);
              }
            }
          }
          ctx.fillStyle = pass ? 'rgba(255,255,255,0.14)' : p.cols[k + 1];
          ctx.fill();
        }
      });
    }

    // Soft shadows of fish swimming near the bottom.
    function drawShadows() {
      for (const f of S.fish) {
        const sc = (0.55 + 0.6 * f.z) * (S.fishScale || 1);
        const sy = S.sandY + 6 + f.z * (H - S.sandY) * 0.3;
        const d = sy - f.y;
        if (d > 200 || d < 0) continue;
        const len = f.len * sc;
        const k = 1 - d / 200;
        ctx.globalAlpha = 0.3 * k * k * (0.5 + 0.5 * f.z) * (P === DAY ? 1 : 0.6);
        const w = len * (0.8 + d / 260), h = Math.max(3, len * 0.1 + d * 0.025);
        ctx.drawImage(shadowTex, f.x - w / 2 + d * 0.1, sy - h / 2, w, h);
      }
      ctx.globalAlpha = 1;
    }

    function drawFish(f) {
      const scale = (0.55 + 0.6 * f.z) * (f.heroScale || S.fishScale || 1);
      if (mode === 'betta') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gr = f.len * scale * 0.95;
        const gg = ctx.createRadialGradient(f.x - f.turn * gr * 0.2, f.y, 0, f.x - f.turn * gr * 0.2, f.y, gr);
        gg.addColorStop(0, 'rgba(70,150,255,0.22)');
        gg.addColorStop(1, 'rgba(70,150,255,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(f.x - gr * 1.3, f.y - gr, gr * 2.6, gr * 2);
        ctx.restore();
      } else {
        // Farther fish take on the water's color and soften (baked into the skin).
        const amt = clamp((1 - f.z) * (P === DAY ? 0.55 : 0.62) - 0.04 + (P === NIGHT ? 0.3 : 0), 0, 0.75);
        const blur = f.z < 0.35 ? Math.round((0.35 - f.z) * 20) / 10 : 0;
        const key = P.fog + amt.toFixed(2) + blur;
        if (f._fogKey !== key) {
          f._fogKey = key;
          f.fog = amt > 0.02 ? { color: P.fog, amount: +amt.toFixed(2), blur } : null;
        }
      }
      ctx.save();
      ctx.translate(f.x, f.y);
      // photo fish fold round by themselves; painted ones flip like a card
      const photo = F.isPhoto(f);
      ctx.rotate(f.pitch * F.heading(f));
      const tx = photo ? 1 : Math.abs(f.turn) < 0.12 ? 0.12 * Math.sign(f.turn || 1) : f.turn;
      ctx.scale(scale * tx, scale);
      const tt = mode === 'betta' ? t * 0.55 : t;
      const lit = mode !== 'betta' && P.caustic > 0.05;
      const body = F.draw(ctx, f, tt, 1, lit, lit ? fishLight(f) : null);
      if (body) {
        // the same rippling light that plays on the sand plays on their backs
        ctx.clip(body);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        const up = clamp(1 - (f.y - S.surfaceY) / Math.max(1, S.sandY - S.surfaceY), 0, 1);
        ctx.globalAlpha = P.caustic * (0.3 + 0.7 * up) * (0.45 + 0.55 * f.z) * 0.8;
        ctx.drawImage(caus, 0, 0, W, S.sandY * 0.85);
      }
      ctx.restore();
      if (P.glow && f.species === 'tetra') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.len * scale * 0.7);
        g.addColorStop(0, 'rgba(52,230,255,0.35)');
        g.addColorStop(1, 'rgba(52,230,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(f.x - 30, f.y - 30, 60, 60);
        ctx.restore();
      }
    }

    // The rippling light from the surface, painted onto a photo fish.
    function fishLight(f) {
      if (!f._light) {
        f._light = {
          light(g, ox, oy) {
            const up = clamp(1 - (f.y - S.surfaceY) / Math.max(1, S.sandY - S.surfaceY), 0, 1);
            g.globalCompositeOperation = 'source-atop';
            g.globalAlpha = Math.min(1, P.caustic * (0.3 + 0.7 * up) * (0.45 + 0.55 * f.z) * 1.05);
            g.setTransform(dpr, 0, 0, dpr, -ox, -oy);
            g.drawImage(caus, 0, 0, W, S.sandY * 0.85);
          },
        };
      }
      return f._light;
    }

    // Hover near a fish to see its name.
    function drawNameLabel() {
      const pt = S.pointer;
      if (!pt.inside || pt.still < 0.35 || preview) return;
      let best = null, bd = 1e9;
      for (const f of S.fish) {
        if (!f.name || f.partyGuest) continue;
        const sc = (0.55 + 0.6 * f.z) * (f.heroScale || S.fishScale || 1);
        const d = Math.hypot(f.x - pt.x, f.y - pt.y);
        if (d < Math.max(26, f.len * sc * 0.7) && d < bd) { bd = d; best = f; }
      }
      if (!best) return;
      const sc = (0.55 + 0.6 * best.z) * (best.heroScale || S.fishScale || 1);
      const label = best.name;
      ctx.save();
      ctx.font = '600 12px Selawik, sans-serif';
      const tw = ctx.measureText(label).width + 18;
      const top = F.isPhoto(best) ? F.extent(best).y0 * sc - 8 : -best.len * sc * best.sp.h * 1.4;
      const lx = clamp(best.x - tw / 2, 6, W - tw - 6), ly = Math.max(6, best.y + top - 26);
      const g = ctx.createLinearGradient(0, ly, 0, ly + 22);
      g.addColorStop(0, 'rgba(255,255,255,0.92)'); g.addColorStop(0.5, 'rgba(230,246,255,0.85)'); g.addColorStop(0.5, 'rgba(205,236,252,0.85)'); g.addColorStop(1, 'rgba(230,246,255,0.9)');
      ctx.fillStyle = g;
      ctx.strokeStyle = 'rgba(10,111,209,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(lx, ly, tw, 22, 11); else ctx.rect(lx, ly, tw, 22);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0b2a4a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + tw / 2, ly + 11.5);
      ctx.restore();
    }

    // A small snail crawls across the front glass and hides when clicked.
    function updateSnail(dt) {
      const sn = S.snail;
      if (!sn) return;
      if (sn.hide > 0) { sn.hide -= dt; return; }
      sn.ph += dt;
      sn.x += sn.dir * sn.v * dt;
      sn.y += Math.sin(sn.ph * 0.3) * 3 * dt;
      if (sn.x > W - 40) sn.dir = -1;
      if (sn.x < 40) sn.dir = 1;
    }
    // With the photo scenery the snail is a real apple snail gliding along
    // the front of the gravel; clicked, it pulls back into its shell.
    const snailW = () => 64 * Math.max(0.8, S.decor);
    const snailY = () => S.sandY + (H - S.sandY) * 0.38;
    function drawPhotoSnail(sn) {
      const w = snailW(), h = w * photoAspect('snail');
      const key = P.fog + dpr + w;
      if (sn.texKey !== key) { sn.tex = photoCanvas('snail', w, h, 0); sn.texKey = key; }
      const meta = scenePhotos.snail.meta, an = meta.anchor, shell = meta.shell;
      const out = sn.hide > 0 ? 0 : Math.min(1, sn.ph * 1.5);
      const y = snailY();
      ctx.save();
      ctx.globalAlpha = P === NIGHT ? 0.35 : 0.5;
      ctx.drawImage(shadowTex, sn.x - w * 0.42, y - h * 0.1, w * 0.84, h * 0.24);
      ctx.globalAlpha = 1;
      ctx.translate(sn.x, y);
      ctx.scale(sn.dir > 0 ? -1 : 1, 1); // the photo faces left
      if (out < 1) {
        // tucked in: only the shell shows, the body slides back out after
        const sx = (shell[0] - an[0]) * w, sy = (shell[1] - an[1]) * h + (1 - out) * h * 0.08;
        ctx.beginPath();
        ctx.arc(sx, sy, shell[2] * w * 1.04 + out * w, 0, TAU);
        ctx.clip();
      }
      const stretch = 1 + Math.sin(sn.ph * 2) * 0.02 * out;
      ctx.drawImage(sn.tex, -an[0] * w * stretch, -an[1] * h, w * stretch, h);
      ctx.restore();
    }

    function drawSnail() {
      const sn = S.snail;
      if (!sn) return;
      if (S.photo) { drawPhotoSnail(sn); return; }
      const k = Math.max(0.8, S.decor * 1.2);
      ctx.save();
      ctx.translate(sn.x, sn.y);
      ctx.scale(sn.dir * k, k);
      const out = sn.hide > 0 ? 0 : Math.min(1, sn.ph * 2);
      if (out > 0) {
        // soft body with eye stalks
        const stretch = 1 + Math.sin(sn.ph * 2) * 0.06;
        ctx.fillStyle = 'rgba(214,200,170,0.85)';
        ctx.beginPath();
        ctx.moveTo(-14, 8);
        ctx.quadraticCurveTo(0, 12, 20 * stretch, 7);
        ctx.quadraticCurveTo(24 * stretch, 2, 16 * stretch, 1);
        ctx.lineTo(-10, 3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(214,200,170,0.95)';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        const wob = Math.sin(sn.ph * 3) * 1.5;
        ctx.beginPath();
        ctx.moveTo(17 * stretch, 2); ctx.lineTo(22 * stretch + wob, -7);
        ctx.moveTo(15 * stretch, 2); ctx.lineTo(17 * stretch - wob, -8);
        ctx.stroke();
        ctx.fillStyle = '#2a2420';
        ctx.beginPath(); ctx.arc(22 * stretch + wob, -7.5, 1.4, 0, TAU); ctx.arc(17 * stretch - wob, -8.5, 1.4, 0, TAU); ctx.fill();
      }
      // glossy spiral shell
      const g = ctx.createRadialGradient(-4, -6, 1, 0, -2, 12);
      g.addColorStop(0, '#fff4d0'); g.addColorStop(0.45, '#e8a948'); g.addColorStop(1, '#8a5520');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -1, 10.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(110,60,20,0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let a = 0; a < TAU * 2.2; a += 0.2) {
        const r = 9.5 - a * 0.66;
        const px = Math.cos(a) * r, py = -1 + Math.sin(a) * r;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.ellipse(-3.5, -6.5, 4, 2.2, -0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function hitSnail(x, y) {
      const sn = S.snail;
      if (!sn) return false;
      const k = Math.max(0.8, S.decor * 1.2);
      const hit = S.photo ? Math.hypot(x - sn.x, y - (snailY() - snailW() * 0.22)) < snailW() * 0.42 : Math.hypot(x - sn.x, y - (sn.y - 2 * k)) < 16 * k;
      if (hit) {
        sn.hide = 4;
        sn.ph = 0;
        A.sound.play('pop');
        return true;
      }
      return false;
    }

    function drawBubbles() {
      if (P === NIGHT) ctx.globalAlpha = 0.75;
      for (const b of S.bubbles) {
        const r = Math.max(0.6, b.r);
        const wob = r > 2.5 ? Math.sin(t * 11 + b.ph * 3) * 0.07 : 0;
        const w = r * 2.1 * (1 + wob), h = r * 2.1 * (1 - wob);
        ctx.drawImage(bubbleTex, b.x - w / 2, b.y - h / 2, w, h);
        if (b.rim && r > 4) {
          ctx.strokeStyle = 'rgba(120,230,255,0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(b.x, b.y, r + 1.5, 0.3, 1.9); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      for (const p of S.food) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.moveTo(-p.s, -p.s * 0.4); ctx.lineTo(p.s * 0.6, -p.s * 0.7); ctx.lineTo(p.s, p.s * 0.3); ctx.lineTo(-p.s * 0.4, p.s * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,210,0.35)';
        ctx.beginPath(); ctx.ellipse(-p.s * 0.2, -p.s * 0.2, p.s * 0.4, p.s * 0.18, 0.3, 0, TAU); ctx.fill();
        ctx.restore();
      }
      for (const r of S.ripples) {
        ctx.strokeStyle = `rgba(255,255,255,${r.life})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, Math.max(0.1, r.r), Math.max(0.1, r.r * 0.45), 0, 0, TAU); ctx.stroke();
      }
      for (const p of S.particles) {
        ctx.fillStyle = p.c + (p.life / p.max) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
    }

    // The underside of the surface: a shimmering net of light and a bright,
    // rippling waterline.
    function drawSurface() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = P === DAY ? 0.55 : 0.25;
      ctx.drawImage(caus, 0, 0, W, S.surfaceY + 14);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = P === DAY ? 'rgba(255,255,255,0.4)' : 'rgba(170,210,255,0.2)';
      for (let k = 0; k < 3; k++) {
        ctx.lineWidth = 2 - k * 0.5;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 12) {
          const y = S.surfaceY + 3 + k * 5 + Math.sin(x * 0.02 + t * (1.2 + k * 0.3) + k) * 2 + Math.sin(x * 0.051 - t * 0.9) * 1.5;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawBokeh() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const b of S.bokeh) {
        b.y += b.vy * 0.016;
        if (b.y < -b.r) { b.y = H + b.r; b.x = rand(0, W); }
        const x = b.x + Math.sin(t * 0.2 + b.ph) * 20;
        const g = ctx.createRadialGradient(x, b.y, b.r * 0.6, x, b.y, b.r);
        g.addColorStop(0, 'rgba(255,255,255,0.025)');
        g.addColorStop(0.85, 'rgba(255,255,255,0.06)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // Tiny particles hanging in the water; at night they glow.
    function drawPlankton() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const night = !!P.glow;
      for (const p of S.plankton) {
        p.y -= p.v * 0.016 * (night ? 1 : 0.35);
        if (p.y < S.surfaceY) { p.y = S.sandY; p.x = rand(0, W); }
        const a = night ? 0.25 + 0.25 * Math.sin(t * 2 + p.ph) : P.specks * (0.45 + 0.55 * Math.sin(t * 0.7 + p.ph));
        if (a <= 0.01) continue;
        ctx.fillStyle = night ? `rgba(120,255,220,${a.toFixed(3)})` : `rgba(255,255,255,${a.toFixed(3)})`;
        const x = p.x + Math.sin(t * 0.5 + p.ph) * 6;
        if (night) { ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, TAU); ctx.fill(); }
        else ctx.fillRect(x - p.r * 0.4, p.y - p.r * 0.4, p.r * 0.8, p.r * 0.8);
      }
      ctx.restore();
    }

    // ---------------------------------------------------------- betta scene
    let bettaBg = null, bettaBands = null;
    function buildBettaStatic() {
      let x;
      [bettaBg, x] = layer(W, H);
      const g = x.createRadialGradient(W * 0.45, H * 0.5, 0, W * 0.45, H * 0.5, Math.hypot(W, H) * 0.62);
      g.addColorStop(0, '#0f4fc0'); g.addColorStop(0.45, '#0a3fa8'); g.addColorStop(1, '#021a4a');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      const tg = x.createRadialGradient(-W * 0.05, H * 0.55, 0, -W * 0.05, H * 0.55, W * 0.55);
      tg.addColorStop(0, 'rgba(32,196,214,0.75)'); tg.addColorStop(0.4, 'rgba(32,196,214,0.25)'); tg.addColorStop(1, 'rgba(32,196,214,0)');
      x.fillStyle = tg; x.fillRect(0, 0, W, H);
      const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(2,10,40,0)'); vg.addColorStop(1, 'rgba(2,10,40,0.55)');
      x.fillStyle = vg; x.fillRect(0, 0, W, H);
      bettaBands = [0, 1, 2].map((i) => ({ off: i / 3, w: rand(0.08, 0.14), a: rand(0.05, 0.11) }));
      S.bokeh = Array.from({ length: preview ? 8 : 26 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(3, 18), vy: rand(-10, -3), ph: rand(0, TAU), a: rand(0.04, 0.14) }));
      S.surfaceY = -50;
    }
    function drawBettaScene() {
      ctx.drawImage(bettaBg, 0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // diagonal light bands drifting upward to the right
      for (const b of bettaBands) {
        const p = ((t * 0.012 + b.off) % 1);
        const cx = lerp(-0.2, 1.2, p) * W, cy = lerp(1.2, -0.2, p) * H;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 4.2);
        const bw = b.w * W;
        const g = ctx.createLinearGradient(-bw, 0, bw, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(200,240,255,${b.a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-bw, -Math.hypot(W, H), bw * 2, Math.hypot(W, H) * 2);
        ctx.restore();
      }
      for (const b of S.bokeh) {
        b.y += b.vy * 0.016;
        if (b.y < -b.r) { b.y = H + b.r; b.x = rand(0, W); }
        const x = b.x + Math.sin(t * 0.3 + b.ph) * 14;
        const g = ctx.createRadialGradient(x, b.y, 0, x, b.y, b.r);
        g.addColorStop(0, `rgba(160,220,255,${b.a})`); g.addColorStop(1, 'rgba(160,220,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ---------------------------------------------------------- frame
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now < slowUntil) return;
      // rAF timestamps can land a hair before the resume time; never step backwards.
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000) || 0.016);
      last = now;
      // Barely animate when a maximized window covers the desktop.
      const covered = !preview && A.wm && A.wm.windows.some((w) => w.state === 'maximized');
      if (covered) slowUntil = now + 240;
      tick(dt);
    }

    function tick(dt) {
      t += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S.pointer.still += dt;
      if (S.party > 0) { S.party -= dt; if (S.party <= 0) endParty(); }

      if (mode === 'betta') {
        drawBettaScene();
        S.fish.forEach((f) => updateFish(f, dt));
        updateBubbles(dt);
        S.fish.forEach(drawFish);
        drawBubbles();
        drawNameLabel();
        return;
      }

      // school leaders wander as a group
      S.schools = S.schools || {};
      S.fish.forEach((f) => {
        if (!f.school) return;
        let s = S.schools[f.school];
        if (!s) s = S.schools[f.school] = { x: W / 2, y: H * 0.4, tx: W / 2, ty: H * 0.4, timer: 0 };
        s.timer -= dt / S.fish.filter((q) => q.school === f.school).length;
        if (s.timer <= 0) { s.timer = rand(4, 9); s.tx = rand(W * 0.1, W * 0.9); const [y0, y1] = zoneY(f); s.ty = rand(y0, y1); }
      });
      Object.values(S.schools).forEach((s) => { s.x += (s.tx - s.x) * dt * 0.35; s.y += (s.ty - s.y) * dt * 0.35; });

      S.fish.forEach((f) => updateFish(f, dt));
      if (S.fish.some((f) => f.gone)) S.fish = S.fish.filter((f) => !f.gone);
      updateBubbles(dt);

      if (S.photoWait) {
        if (sceneReady || sceneFailed) buildStatic();
        else if (!S.still) { ctx.clearRect(0, 0, W, H); return; }
      }
      updateCaustics();
      ctx.drawImage(bg, 0, 0, W, H);
      drawWallCaustics();
      ctx.drawImage(sand, 0, S.sandY - 30, W, H - S.sandY + 40);
      drawFloorCaustics();
      drawShadows();
      drawPlants(0);
      let i = 0;
      const fish = S.fish;
      for (; i < fish.length && fish[i].z < 0.4; i++) drawFish(fish[i]);
      ctx.fillStyle = P.haze;
      ctx.fillRect(0, 0, W, H);
      drawPlants(1);
      ctx.drawImage(front, 0, 0, W, H);
      for (; i < fish.length; i++) drawFish(fish[i]);
      drawPlants(2);
      drawBubbles();
      drawPlankton();
      drawRays();
      drawSurface();
      updateSnail(dt);
      drawSnail();
      drawBokeh();
      ctx.drawImage(glass, 0, 0, W, H);
      drawNameLabel();
    }

    // ---------------------------------------------------------- party
    function party() {
      if (mode === 'betta') { blowSeven(S.fish[0]); return; }
      S.party = 22;
      const species = ['goldfish', 'guppy', 'angelfish', 'betta', 'tetra', 'guppy', 'goldfish'];
      for (let i = 0; i < 26; i++) {
        const sp = pick(species);
        const e = { id: 'party' + i, species: sp, palette: Math.floor(Math.random() * 4), name: 'Party guest' };
        const f = spawnFish(e, 1, true)[0];
        f.partyGuest = true;
        f.speedK = rand(1.2, 1.8);
        S.fish.push(f);
      }
      sortFish();
    }
    function endParty() {
      S.fish.forEach((f) => { if (f.partyGuest) { f.mode = 'leave'; f.target = { x: f.x < W / 2 ? -150 : W + 150, y: f.y }; } });
    }

    // ---------------------------------------------------------- api
    const ro = new ResizeObserver(() => { if (!destroyed) resize(); });
    ro.observe(container);
    resize();

    const ctrl = {
      pause() { running = false; cancelAnimationFrame(raf); },
      resume() {
        if (running || destroyed) return;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      },
      destroy() {
        destroyed = true;
        ctrl.pause();
        ro.disconnect();
        offRoster(); offLights(); offTheme();
        canvas.remove();
      },
      pointer(type, x, y) {
        const r = canvas.getBoundingClientRect();
        const lx = x - r.left, ly = y - r.top;
        const pt = S.pointer;
        if (type === 'move') {
          const now = performance.now();
          const dtm = Math.max(1, now - (pt.lastMove || now)) / 1000;
          const vx = (lx - pt.x) / dtm, vy = (ly - pt.y) / dtm;
          const speed = Math.hypot(vx, vy);
          if (Math.hypot(lx - pt.x, ly - pt.y) > 3) pt.still = 0;
          pt.x = lx; pt.y = ly; pt.inside = true; pt.lastMove = now;
          popBubbleAt(lx, ly);
          if (speed > 2200 && mode !== 'betta') startle(lx, ly, 110, 1);
        } else if (type === 'leave') {
          pt.inside = false;
        } else if (type === 'click') {
          if (mode === 'betta') { blowSeven(S.fish[0]); A.sound.play('bubble'); }
          else if (!hitSnail(lx, ly)) { dropFood(lx, ly); startle(lx, ly, 50, 0.4); }
          return true;
        }
        return false;
      },
      feed(x, y) { dropFood(x == null ? rand(W * 0.2, W * 0.8) : x, y == null ? S.surfaceY + 20 : y); },
      tap() { startle(W / 2, H / 2, Math.max(W, H), 1.4); A.sound.play('click'); },
      party,
      setLights(v) { lightsOverride = v; P = isNight() ? NIGHT : DAY; buildStatic(); },
      renderStill(steps = 30) {
        S.still = true;
        for (let i = 0; i < steps; i++) tick(1 / 30);
        S.still = false;
      },
      fish: () => S.fish.slice(),
    };
    ctrl.resume();
    return ctrl;
  }

  const thumbCache = {};

  A.aquarium = { create, roster, setRoster, defaultRoster, NAMES, SPECIES: F.SPECIES };

  A.theme.registerWallpaper({
    id: 'aquarium', name: 'Aquarium', group: 'Aerium Animated', kind: 'animated', animated: true,
    thumb: () => thumbStill('tank'),
    create: (host) => {
      const c = create(host, { mode: 'tank' });
      return c;
    },
  });
  A.theme.registerWallpaper({
    id: 'betta', name: 'Betta', group: 'Aerium Animated', kind: 'animated', animated: true,
    thumb: () => thumbStill('betta'),
    create: (host) => create(host, { mode: 'betta' }),
  });

  // A still frame for thumbnails: build a small tank, step it once, grab the pixels.
  function thumbStill(mode) {
    if (thumbCache[mode]) return thumbCache[mode];
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:200px;visibility:hidden';
    document.body.appendChild(box);
    const c = create(box, { mode, preview: true });
    c.pause();
    c.renderStill(40);
    const canvas = box.querySelector('canvas');
    let url = '';
    try { url = canvas.toDataURL('image/jpeg', 0.85); } catch (e) { url = ''; }
    c.destroy();
    box.remove();
    thumbCache[mode] = url;
    return url;
  }
})();
