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
    top: '#8fe4ff', mid: '#1fa9d9', deep: '#0a5a96', abyss: '#063a6e',
    haze: 'rgba(40,150,205,0.22)', sandA: '#f4e2b8', sandB: '#d9bf8a', sandC: '#b89a64',
    ray: 'rgba(255,255,255,', caustic: 0.34, plantA: '#157a1f', plantB: '#45c93a', plantC: '#9ceb66', silhouette: 'rgba(8,70,110,0.35)',
    glow: 0,
  };
  const NIGHT = {
    top: '#1a4f8a', mid: '#0b2f63', deep: '#061a3c', abyss: '#030c22',
    haze: 'rgba(6,24,60,0.3)', sandA: '#5a6a84', sandB: '#3e4c66', sandC: '#2a3650',
    ray: 'rgba(170,210,255,', caustic: 0.12, plantA: '#0c3a2a', plantB: '#1b6e4a', plantC: '#3fa878', silhouette: 'rgba(0,10,30,0.45)',
    glow: 1,
  };

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
      if (mode === 'betta') { buildBettaStatic(); return; }
      // Water and a distant planted background
      let x;
      [bg, x] = layer(W, H);
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, P.top); g.addColorStop(0.35, P.mid); g.addColorStop(0.8, P.deep); g.addColorStop(1, P.abyss);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      // Soft light from above-left
      const lg = x.createRadialGradient(W * 0.3, -H * 0.1, 0, W * 0.3, -H * 0.1, H * 1.1);
      lg.addColorStop(0, P === DAY ? 'rgba(255,255,230,0.35)' : 'rgba(150,190,255,0.18)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = lg; x.fillRect(0, 0, W, H);
      // Distant plant silhouettes
      x.fillStyle = P.silhouette;
      const seed = A.util.seeded(7);
      for (let i = 0; i < Math.ceil(W / 26); i++) {
        const bx = i * 26 + seed() * 20, hgt = H * (0.12 + seed() * 0.3);
        x.beginPath();
        x.moveTo(bx - 8, S.sandY + 4);
        x.quadraticCurveTo(bx + seed() * 30 - 15, S.sandY - hgt * 0.6, bx + seed() * 16 - 8, S.sandY - hgt);
        x.quadraticCurveTo(bx + seed() * 30 - 5, S.sandY - hgt * 0.5, bx + 10, S.sandY + 4);
        x.fill();
      }
      // Surface: light band seen from under the water
      const sg = x.createLinearGradient(0, 0, 0, S.surfaceY + 40);
      sg.addColorStop(0, P === DAY ? 'rgba(230,252,255,0.95)' : 'rgba(120,170,230,0.6)');
      sg.addColorStop(S.surfaceY / (S.surfaceY + 40), P === DAY ? 'rgba(200,245,255,0.65)' : 'rgba(90,140,210,0.35)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = sg; x.fillRect(0, 0, W, S.surfaceY + 40);

      // Sand bed with dunes, speckles and glossy pebbles
      [sand, x] = layer(W, H - S.sandY + 40);
      const oy = -S.sandY + 30;
      x.translate(0, oy);
      x.beginPath();
      x.moveTo(0, S.sandY);
      for (let px = 0; px <= W + 40; px += 40) x.lineTo(px, S.sandY + Math.sin(px * 0.006) * 8 + Math.sin(px * 0.017 + 1) * 4);
      x.lineTo(W, H); x.lineTo(0, H); x.closePath();
      const sg2 = x.createLinearGradient(0, S.sandY - 10, 0, H);
      sg2.addColorStop(0, P.sandA); sg2.addColorStop(0.4, P.sandB); sg2.addColorStop(1, P.sandC);
      x.fillStyle = sg2; x.fill();
      x.save(); x.clip();
      const sr = A.util.seeded(11);
      for (let i = 0; i < W * (H - S.sandY) * 0.004; i++) {
        x.fillStyle = sr() > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(90,70,40,0.25)';
        x.fillRect(sr() * W, S.sandY + sr() * (H - S.sandY), 1.2, 1.2);
      }
      for (let i = 0; i < W / 18; i++) {
        const px = sr() * W, py = S.sandY + 6 + sr() * (H - S.sandY - 6), r = 2 + sr() * 5;
        const hue = sr();
        const pg = x.createRadialGradient(px - r * 0.3, py - r * 0.4, 0, px, py, r);
        pg.addColorStop(0, '#ffffff');
        pg.addColorStop(0.35, hue < 0.33 ? '#c9d3dd' : hue < 0.66 ? '#e6cfa0' : '#b9c9b0');
        pg.addColorStop(1, hue < 0.33 ? '#6b7b8b' : hue < 0.66 ? '#9a7a4a' : '#6a7a5a');
        x.fillStyle = P === NIGHT ? 'rgba(40,60,90,0.8)' : pg;
        x.beginPath(); x.ellipse(px, py, r, r * 0.7, 0, 0, TAU); x.fill();
      }
      x.restore();

      // Front decor: river stones and a driftwood branch
      [front, x] = layer(W, H);
      const dk = S.decor;
      const rocks = [[W * 0.08, 60, 34], [W * 0.13, 38, 24], [W * 0.62, 70, 40], [W * 0.69, 44, 26], [W * 0.93, 52, 32]].map(([a, b, c]) => [a, b * dk, c * dk]);
      rocks.forEach(([rx, rw, rh], i) => {
        const ry = S.sandY + 12;
        const rg = x.createRadialGradient(rx - rw * 0.25, ry - rh * 0.6, 2, rx, ry - rh * 0.2, rw);
        rg.addColorStop(0, P === DAY ? '#f2f6fa' : '#7a8aa6');
        rg.addColorStop(0.35, P === DAY ? (i % 2 ? '#a9b8c6' : '#9fb2a8') : '#3e4c66');
        rg.addColorStop(1, P === DAY ? '#4f6070' : '#1a2438');
        x.fillStyle = rg;
        x.beginPath();
        x.ellipse(rx, ry, rw, rh, 0, Math.PI, TAU);
        x.quadraticCurveTo(rx + rw, ry + 4, rx - rw, ry + 2);
        x.fill();
        x.fillStyle = 'rgba(255,255,255,0.35)';
        x.beginPath(); x.ellipse(rx - rw * 0.3, ry - rh * 0.62, rw * 0.3, rh * 0.14, -0.3, 0, TAU); x.fill();
      });
      // driftwood
      const dx = W * 0.36, dy = S.sandY + 8;
      x.lineCap = 'round';
      const branches = [[0, 0, 170, -80, 18], [70, -34, 118, -128, 9], [128, -60, 214, -92, 7], [40, -14, -30, -60, 8]].map((b) => b.map((v) => v * dk));
      branches.forEach(([x0, y0, x1, y1, w]) => {
        const grad = x.createLinearGradient(dx + x0, dy + y0 - w, dx + x0, dy + y0 + w);
        grad.addColorStop(0, P === DAY ? '#a0754a' : '#3a2e40');
        grad.addColorStop(0.5, P === DAY ? '#6b4a2a' : '#2a2030');
        grad.addColorStop(1, P === DAY ? '#3e2a18' : '#18121e');
        x.strokeStyle = grad;
        x.lineWidth = w;
        x.beginPath();
        x.moveTo(dx + x0, dy + y0);
        x.quadraticCurveTo(dx + (x0 + x1) / 2 + 12, dy + (y0 + y1) / 2 + 14, dx + x1, dy + y1);
        x.stroke();
        x.strokeStyle = P === DAY ? 'rgba(255,235,200,0.4)' : 'rgba(150,170,220,0.2)';
        x.lineWidth = Math.max(1.2, w * 0.18);
        x.beginPath();
        x.moveTo(dx + x0 + 2, dy + y0 - w * 0.3);
        x.quadraticCurveTo(dx + (x0 + x1) / 2 + 12, dy + (y0 + y1) / 2 + 14 - w * 0.3, dx + x1, dy + y1 - w * 0.25);
        x.stroke();
      });

      // Glass: faint reflection and depth vignette
      [glass, x] = layer(W, H);
      const rf = x.createLinearGradient(0, 0, W, H);
      rf.addColorStop(0, 'rgba(255,255,255,0.1)'); rf.addColorStop(0.28, 'rgba(255,255,255,0.02)');
      rf.addColorStop(0.3, 'rgba(255,255,255,0.07)'); rf.addColorStop(0.36, 'rgba(255,255,255,0)'); rf.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = rf; x.fillRect(0, 0, W, H);
      const vg = x.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.4, W / 2, H * 0.5, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,20,50,0)'); vg.addColorStop(1, P === DAY ? 'rgba(0,30,70,0.28)' : 'rgba(0,5,20,0.5)');
      x.fillStyle = vg; x.fillRect(0, 0, W, H);

      // Caustics texture (computed live at low resolution)
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
      S.bubblers = preview ? [{ x: W * 0.8 }] : [{ x: W * 0.78 }, { x: W * 0.17 }];
      S.rays = Array.from({ length: preview ? 4 : 7 }, (_, i) => ({ x: (i + 0.5) / (preview ? 4 : 7) + rand(-0.05, 0.05), w: rand(0.04, 0.09), ph: rand(0, TAU), a: rand(0.05, 0.1) }));
      S.bokeh = Array.from({ length: preview ? 3 : 6 }, () => ({ x: rand(0, W), y: rand(H * 0.1, H * 0.9), r: rand(20, 55), vy: rand(-6, -2), ph: rand(0, TAU) }));
      S.plankton = Array.from({ length: preview ? 20 : 70 }, () => ({ x: rand(0, W), y: rand(S.surfaceY, S.sandY), r: rand(0.6, 1.8), ph: rand(0, TAU), v: rand(2, 6) }));
    }

    function buildPlants() {
      S.plants = [];
      const sr = A.util.seeded(3 + Math.round(W / 100));
      const addGrass = (cx, n, layerIdx, hmin, hmax) => {
        for (let i = 0; i < n; i++) {
          S.plants.push({ type: 'blade', x: cx + (sr() - 0.5) * 60 * S.decor, h: H * (hmin + sr() * (hmax - hmin)), w: (4 + sr() * 5) * Math.max(0.6, S.decor), ph: sr() * TAU, lean: (sr() - 0.5) * 0.4, layer: layerIdx, tone: sr() });
        }
      };
      const addSword = (cx, layerIdx, size) => {
        const n = 9;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.1 + (sr() - 0.5) * 0.15;
          S.plants.push({ type: 'leaf', x: cx, a, len: H * size * (0.65 + sr() * 0.45), w: (14 + sr() * 10) * Math.max(0.55, S.decor), ph: sr() * TAU, layer: layerIdx, tone: sr() });
        }
      };
      addGrass(W * 0.05, 9, 0, 0.3, 0.55);
      addGrass(W * 0.24, 7, 1, 0.2, 0.42);
      addSword(W * 0.3, 0, 0.2);
      addGrass(W * 0.5, 8, 0, 0.35, 0.6);
      addSword(W * 0.57, 1, 0.16);
      addGrass(W * 0.84, 10, 1, 0.25, 0.5);
      addGrass(W * 0.97, 6, 0, 0.3, 0.52);
      addSword(W * 0.9, 0, 0.22);
      if (!preview) {
        addGrass(W * 0.72, 5, 2, 0.12, 0.24);
        addGrass(W * 0.12, 4, 2, 0.1, 0.2);
      }
      // moss balls
      [[W * 0.2, 16], [W * 0.46, 11], [W * 0.76, 14]].forEach(([mx, r]) => S.plants.push({ type: 'moss', x: mx, r: r * S.decor, layer: 2 }));
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
      const cs = Math.cos(f.pitch * Math.sign(f.turn || 1)), sn = Math.sin(f.pitch * Math.sign(f.turn || 1));
      const lx = m[0] * scale * f.turn, ly = m[1] * scale;
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
      const scale = f.heroScale = Math.max(1.2, (W * 0.28) / (f.len * 1.55));
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
            S.bubbles.push({ x: b.x + rand(-3, 3), y: S.sandY - 4, r: rand(1.6, 4.2), vy: -rand(55, 90), ph: rand(0, TAU), wob: rand(2, 6), grow: 1 });
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
    function drawCaustics() {
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
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = P.caustic * 0.4;
      ctx.drawImage(causWall, 0, H * 0.28, W, S.sandY - H * 0.28);
      ctx.globalAlpha = P.caustic;
      ctx.drawImage(caus, 0, S.sandY - 2, W, H - S.sandY + 2);
      ctx.restore();
    }

    function drawRays() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const r of S.rays) {
        const sway = Math.sin(t * 0.08 + r.ph) * W * 0.03;
        const x0 = r.x * W + sway, w0 = r.w * W;
        const slant = W * 0.12;
        const a = r.a * (0.65 + 0.35 * Math.sin(t * 0.35 + r.ph * 2));
        const g = ctx.createLinearGradient(0, S.surfaceY, 0, S.sandY);
        g.addColorStop(0, P.ray + a + ')');
        g.addColorStop(0.7, P.ray + a * 0.3 + ')');
        g.addColorStop(1, P.ray + '0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0 - w0 * 0.5, S.surfaceY);
        ctx.lineTo(x0 + w0 * 0.5, S.surfaceY);
        ctx.lineTo(x0 + slant + w0 * 1.6, S.sandY);
        ctx.lineTo(x0 + slant - w0 * 1.6, S.sandY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    function drawPlants(layerIdx) {
      const depthFade = layerIdx === 0 ? 0.62 : layerIdx === 1 ? 0.85 : 1;
      for (const p of S.plants) {
        if (p.layer !== layerIdx) continue;
        if (p.type === 'blade') {
          const n = 9, seg = p.h / n;
          const pts = [];
          for (let i = 0; i <= n; i++) {
            const u = i / n;
            const sway = Math.sin(t * 0.9 + p.ph + u * 1.6) * 16 * Math.pow(u, 1.4) + p.lean * p.h * u * u;
            pts.push([p.x + sway, S.sandY + 6 - seg * i]);
          }
          ctx.beginPath();
          for (let i = 0; i <= n; i++) {
            const w = p.w * Math.pow(1 - i / n, 0.6) * 0.5 + 0.3;
            i === 0 ? ctx.moveTo(pts[i][0] - w, pts[i][1]) : ctx.lineTo(pts[i][0] - w, pts[i][1]);
          }
          for (let i = n; i >= 0; i--) {
            const w = p.w * Math.pow(1 - i / n, 0.6) * 0.5 + 0.3;
            ctx.lineTo(pts[i][0] + w, pts[i][1]);
          }
          ctx.closePath();
          const g = ctx.createLinearGradient(0, S.sandY, 0, S.sandY - p.h);
          g.addColorStop(0, P.plantA);
          g.addColorStop(0.6, p.tone > 0.5 ? P.plantB : F.mix(P.plantB, P.plantC, 0.4));
          g.addColorStop(1, P.plantC);
          ctx.globalAlpha = depthFade;
          ctx.fillStyle = g;
          ctx.fill();
          ctx.globalAlpha = depthFade * 0.5;
          ctx.strokeStyle = 'rgba(255,255,255,0.45)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          pts.forEach((q, i) => (i ? ctx.lineTo(q[0] - 0.6, q[1]) : ctx.moveTo(q[0] - 0.6, q[1])));
          ctx.stroke();
        } else if (p.type === 'leaf') {
          const sway = Math.sin(t * 0.7 + p.ph) * 0.07;
          const a = p.a + sway;
          const bx = p.x, by = S.sandY + 4;
          const tx = bx + Math.cos(a) * p.len, ty = by + Math.sin(a) * p.len;
          const nx = -Math.sin(a), ny = Math.cos(a);
          const mx = (bx + tx) / 2 + nx * p.w * 0.2, my = (by + ty) / 2 + ny * p.w * 0.2 - p.len * 0.08;
          ctx.globalAlpha = depthFade;
          const g = ctx.createLinearGradient(bx, by, tx, ty);
          g.addColorStop(0, P.plantA); g.addColorStop(0.5, P.plantB); g.addColorStop(1, P.plantC);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(mx + nx * p.w, my + ny * p.w, tx, ty);
          ctx.quadraticCurveTo(mx - nx * p.w, my - ny * p.w, bx, by);
          ctx.fill();
          ctx.globalAlpha = depthFade * 0.55;
          ctx.strokeStyle = 'rgba(230,255,210,0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
        } else if (p.type === 'moss') {
          ctx.globalAlpha = 1;
          const my = S.sandY + 4 - p.r * 0.7;
          const g = ctx.createRadialGradient(p.x - p.r * 0.3, my - p.r * 0.4, 1, p.x, my, p.r);
          g.addColorStop(0, P.plantC); g.addColorStop(0.6, P.plantB); g.addColorStop(1, P.plantA);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, my, p.r, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath(); ctx.ellipse(p.x - p.r * 0.3, my - p.r * 0.45, p.r * 0.45, p.r * 0.25, -0.4, 0, TAU); ctx.fill();
        }
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
      }
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.pitch * Math.sign(f.turn || 1));
      const tx = Math.abs(f.turn) < 0.12 ? 0.12 * Math.sign(f.turn || 1) : f.turn;
      ctx.scale(scale * tx, scale);
      const tt = mode === 'betta' ? t * 0.55 : t;
      F.draw(ctx, f, tt, mode === 'betta' ? 1 : 0.72 + 0.28 * f.z);
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
      ctx.font = '600 12px "Segoe UI", Selawik, sans-serif';
      const tw = ctx.measureText(label).width + 18;
      const lx = clamp(best.x - tw / 2, 6, W - tw - 6), ly = Math.max(6, best.y - best.len * sc * best.sp.h * 1.4 - 26);
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
    function drawSnail() {
      const sn = S.snail;
      if (!sn) return;
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
      if (Math.hypot(x - sn.x, y - (sn.y - 2 * k)) < 16 * k) {
        sn.hide = 4;
        sn.ph = 0;
        A.sound.play('pop');
        return true;
      }
      return false;
    }

    function drawBubbles() {
      for (const b of S.bubbles) {
        const r = b.r;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = b.rim ? 'rgba(200,245,255,0.95)' : 'rgba(255,255,255,0.75)';
        ctx.lineWidth = Math.max(0.7, r / 7);
        ctx.stroke();
        if (r > 2) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath(); ctx.ellipse(b.x - r * 0.35, b.y - r * 0.4, r * 0.34, r * 0.2, -0.5, 0, TAU); ctx.fill();
        }
        if (b.rim && r > 4) {
          ctx.strokeStyle = 'rgba(120,230,255,0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(b.x, b.y, r + 1.5, 0.3, 1.9); ctx.stroke();
        }
      }
      for (const p of S.food) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.moveTo(-p.s, -p.s * 0.4); ctx.lineTo(p.s * 0.6, -p.s * 0.7); ctx.lineTo(p.s, p.s * 0.3); ctx.lineTo(-p.s * 0.4, p.s * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      for (const r of S.ripples) {
        ctx.strokeStyle = `rgba(255,255,255,${r.life})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.45, 0, 0, TAU); ctx.stroke();
      }
      for (const p of S.particles) {
        ctx.fillStyle = p.c + (p.life / p.max) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
    }

    function drawSurface() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = P === DAY ? 'rgba(255,255,255,0.35)' : 'rgba(170,210,255,0.2)';
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

    function drawPlankton() {
      if (!P.glow) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of S.plankton) {
        p.y -= p.v * 0.016;
        if (p.y < S.surfaceY) p.y = S.sandY;
        const a = 0.25 + 0.25 * Math.sin(t * 2 + p.ph);
        ctx.fillStyle = `rgba(120,255,220,${a})`;
        ctx.beginPath(); ctx.arc(p.x + Math.sin(t + p.ph) * 6, p.y, p.r, 0, TAU); ctx.fill();
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
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
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

      ctx.drawImage(bg, 0, 0, W, H);
      drawCaustics();
      ctx.drawImage(sand, 0, S.sandY - 30, W, H - S.sandY + 40);
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
      renderStill(steps = 30) { for (let i = 0; i < steps; i++) tick(1 / 30); },
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
