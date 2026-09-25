/* Aerium fish: side-view aquarium fish. Palettes with a photo are drawn
   from real photographs (fish-photo.js). The rest are painted: each body is
   painted once into a cached skin (rounded shading, scales, markings, gill
   cover, glossy highlights and a detailed eye) and drawn every frame in thin
   vertical slices that follow the swimming wave, so the body flexes and
   foreshortens as the tail beats. Fins and tail are drawn live as
   translucent membranes with fine rays. */
(function () {
  'use strict';
  const A = window.Aerium;
  const PH = A.fishPhoto || null;
  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (t) => t * t * (3 - 2 * t);

  const rgbCache = new Map();
  function rgb(hex) {
    let v = rgbCache.get(hex);
    if (!v) {
      const n = parseInt(hex.slice(1), 16);
      v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      rgbCache.set(hex, v);
    }
    return v;
  }
  const rgba = (hex, a) => { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  function mix(h1, h2, t) {
    const a = rgb(h1), b = rgb(h2);
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  const lighten = (h, t) => mix(h, '#ffffff', t);
  const darken = (h, t) => mix(h, '#000000', t);

  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------ species
  // scale: scale size as a share of body height. gill: where the gill cover
  // ends (0 = nose, 1 = tail root). eye: [position, height offset, radius].
  const SPECIES = {
    betta: {
      name: 'Betta', size: [64, 78], h: 0.33, bodyLen: 0.55, peak: 0.34, ped: 0.46, noseRound: 0.65, topK: 1, botK: 1.05, arch: -0.02,
      tail: 'veil', tailScale: 1.22, speed: 18, turnRate: 2.2, zone: [0.15, 0.75], ruffle: 1,
      dorsal: { s0: 0.4, s1: 1.0, height: 0.85, sweep: 1.0 }, anal: { s0: 0.24, s1: 1.0, height: 1.05, sweep: 0.9 },
      pectoral: 0.24, pelvic: { s: 0.3, len: 0.36 },
      scale: 0.085, gill: 0.3, eye: [0.1, -0.06, 0.13], mouthY: -0.02, rays: 1.4,
      palettes: [
        { name: 'Halfmoon', photo: 'betta-blue', swatch: ['#2f86c4', '#c8303f'], back: '#0e2574', body: '#1d4ec9', belly: '#4b7fe0', sheen: '#5fdcff', fin: '#1a2c9c', finEdge: '#6a86ff', rim: '#b7c8ff', eye: '#050a18', iris: '#27449a' },
        { name: 'Ruby', photo: 'betta-cambodian', swatch: ['#eadccb', '#b3182c'], back: '#560914', body: '#b3142a', belly: '#dc4048', sheen: '#ff8fa8', fin: '#98102a', finEdge: '#ff5a6e', rim: '#ffc0c8', eye: '#140404', iris: '#7a1a24' },
        { name: 'Violet', photo: 'betta-royal', swatch: ['#6b4fd8', '#a13bc9'], tone: { hue: 48, sat: 1.05 }, back: '#2a0f5c', body: '#5a2aae', belly: '#8156d6', sheen: '#78dcff', fin: '#3f2294', finEdge: '#b58aff', rim: '#e0ccff', eye: '#0c0718', iris: '#4a2e8a' },
        { name: 'Koi', photo: 'betta-marble', swatch: ['#f2f2f2', '#2f55c8'], back: '#d9dfe7', body: '#f1f4f7', belly: '#ffffff', sheen: '#ffd0c4', fin: '#f06a4a', finEdge: '#ffd6c8', rim: '#ffffff', eye: '#0e1620', iris: '#6a7a8a', koi: true },
        { name: 'Beta blue', photo: 'betta-royal', swatch: ['#2346c8', '#5a2fc0'], back: '#07196e', body: '#1947c8', belly: '#4a80f6', sheen: '#48d4ff', fin: '#16209c', finEdge: '#6f7dff', rim: '#bff4ff', eye: '#040a18', iris: '#2649b0', finAlpha: [0.9, 0.72, 0.55], iridescent: true },
      ],
    },
    goldfish: {
      name: 'Goldfish', size: [44, 58], h: 0.46, bodyLen: 0.62, peak: 0.36, ped: 0.34, noseRound: 0.55, topK: 1.08, botK: 1.02, arch: -0.05,
      tail: 'double', tailScale: 1.2, speed: 26, turnRate: 2.6, zone: [0.2, 0.8], ruffle: 0.7,
      dorsal: { s0: 0.3, s1: 0.72, height: 0.5, sweep: 0.5 }, anal: { s0: 0.72, s1: 0.9, height: 0.3, sweep: 0.5 },
      pectoral: 0.3, pelvic: { s: 0.42, len: 0.25 },
      scale: 0.105, gill: 0.29, eye: [0.11, -0.1, 0.12], mouthY: -0.04, rays: 1,
      palettes: [
        { name: 'Orange', photo: 'goldfish-fantail', swatch: ['#ff6a1a', '#e03a16'], back: '#c23d08', body: '#f5821c', belly: '#ffd58a', sheen: '#fff0b0', fin: '#ff8a20', finEdge: '#ffd07a', rim: '#fff4d0', eye: '#101a26', iris: '#f2b01e', metallic: true, finAlpha: [0.95, 0.74, 0.42] },
        { name: 'Red cap', photo: 'goldfish-redcap', swatch: ['#f7f4ef', '#e3321f'], back: '#e6ebf1', body: '#f7f9fb', belly: '#ffffff', sheen: '#ffffff', fin: '#fdf2e6', finEdge: '#ffffff', rim: '#ffffff', eye: '#101a26', iris: '#e8a040', cap: '#e3321f' },
        { name: 'Calico', photo: 'goldfish-calico', swatch: ['#e8452a', '#d8d8d0'], back: '#e0730c', body: '#fbab47', belly: '#fff1d9', sheen: '#ffffff', fin: '#ffe5c6', finEdge: '#fff6ea', rim: '#ffffff', eye: '#101a26', iris: '#f2b01e', spots: '#20222e', calico: true },
      ],
    },
    tetra: {
      name: 'Neon tetra', size: [20, 25], h: 0.27, bodyLen: 0.78, peak: 0.36, ped: 0.34, noseRound: 0.8, topK: 1, botK: 1.05, arch: 0,
      tail: 'fork', tailScale: 1, speed: 46, turnRate: 4, zone: [0.2, 0.7], school: true, ruffle: 0,
      dorsal: { s0: 0.42, s1: 0.58, height: 0.45, sweep: 0.6 }, anal: { s0: 0.58, s1: 0.8, height: 0.3, sweep: 0.5 },
      pectoral: 0.3,
      scale: 0.12, gill: 0.26, eye: [0.11, -0.02, 0.17], mouthY: 0, rays: 0.7,
      palettes: [{ name: 'Neon', photo: 'tetra-neon', swatch: ['#2a8cff', '#f4283a'], back: '#6a6448', body: '#b9c4c6', belly: '#eef3f2', sheen: '#ffffff', fin: '#e8f0f2', finEdge: '#ffffff', rim: '#ffffff', eye: '#07101a', iris: '#a9d2ee', stripe: '#3ee8ff', stripe2: '#2a6cff', red: '#f4283a' }],
    },
    angelfish: {
      name: 'Angelfish', size: [42, 52], h: 0.72, bodyLen: 0.66, peak: 0.42, ped: 0.26, noseRound: 0.9, topK: 1, botK: 1, arch: 0,
      tail: 'lyre', tailScale: 0.95, speed: 16, turnRate: 1.8, zone: [0.2, 0.7], ruffle: 0.3,
      dorsal: { s0: 0.26, s1: 0.78, height: 0.95, sweep: 0.75, sail: true }, anal: { s0: 0.3, s1: 0.8, height: 0.95, sweep: 0.75, sail: true },
      pectoral: 0.26, pelvic: { s: 0.34, len: 1.1, filament: true },
      scale: 0.055, gill: 0.3, eye: [0.13, -0.12, 0.075], mouthY: -0.03, rays: 1.2,
      palettes: [
        { name: 'Silver', photo: 'angelfish-silver', swatch: ['#d8d4c0', '#2a2e34'], back: '#7f8c97', body: '#dfe6ec', belly: '#fafcfd', sheen: '#ffffff', fin: '#d3dde5', finEdge: '#ffffff', rim: '#ffffff', eye: '#141414', iris: '#d8281a', bars: '#1c2129', crown: '#e8b85a' },
        { name: 'Marble', photo: 'angelfish-koi', swatch: ['#ffffff', '#f08a1a'], back: '#343942', body: '#e6e0d0', belly: '#fffaf0', sheen: '#ffffff', fin: '#d6cfbd', finEdge: '#fff8e8', rim: '#ffffff', eye: '#141414', iris: '#d8281a', bars: '#23252b', crown: '#f0a640', marble: true },
        { name: 'Platinum', photo: 'angelfish-platinum', swatch: ['#f4f2ee', '#d8d2c8'], back: '#c9ccd2', body: '#eef0f3', belly: '#ffffff', sheen: '#ffffff', fin: '#e8ebef', finEdge: '#ffffff', rim: '#ffffff', eye: '#141414', iris: '#b8a8a0', bars: '#dfe3e8', crown: '#f4e8d8' },
      ],
    },
    guppy: {
      name: 'Guppy', size: [22, 28], h: 0.26, bodyLen: 0.6, peak: 0.34, ped: 0.4, noseRound: 0.75, topK: 1, botK: 1.1, arch: 0,
      tail: 'fan', tailScale: 1.35, speed: 40, turnRate: 3.6, zone: [0.1, 0.6], ruffle: 0.6,
      dorsal: { s0: 0.55, s1: 0.85, height: 0.55, sweep: 0.9 }, anal: { s0: 0.62, s1: 0.8, height: 0.25, sweep: 0.4 },
      pectoral: 0.3,
      scale: 0.1, gill: 0.28, eye: [0.11, -0.05, 0.15], mouthY: -0.06, rays: 1,
      palettes: [
        { name: 'Sunset', photo: 'guppy-red', swatch: ['#8a4ab0', '#ff3a1f'], back: '#6c7462', body: '#b9c2ac', belly: '#eef2e6', sheen: '#ffffff', fin: '#ff6a1f', finEdge: '#ffd02e', rim: '#fff0c0', eye: '#0b0b0b', iris: '#d8dcd8', tailSpots: '#2238a0', patch: '#ff8a3a' },
        { name: 'Blue grass', photo: 'guppy-blue', swatch: ['#3a90b0', '#e8c830'], back: '#5b6a82', body: '#aebcd2', belly: '#e8eef7', sheen: '#ffffff', fin: '#1f8fe6', finEdge: '#7fe6ff', rim: '#e0f6ff', eye: '#0b0b0b', iris: '#d8dcd8', tailSpots: '#0b3d73', patch: '#3ab0ff' },
        { name: 'Tuxedo', photo: 'guppy-lace', swatch: ['#c04030', '#1a1a20'], back: '#4e4e58', body: '#c6beb4', belly: '#f4eee8', sheen: '#ffffff', fin: '#e63a26', finEdge: '#ffb13b', rim: '#ffe0c8', eye: '#0b0b0b', iris: '#d8dcd8', tailSpots: '#1e2530', tux: true },
        { name: 'Leopard', photo: 'guppy-leopard', swatch: ['#c8b8c0', '#e0a030'], back: '#6a6a70', body: '#c4bcc0', belly: '#f2eef0', sheen: '#ffffff', fin: '#d8a23a', finEdge: '#ffe08a', rim: '#fff2d0', eye: '#0b0b0b', iris: '#d8dcd8', tailSpots: '#1c1c22', patch: '#e8b040' },
        { name: 'Koi', photo: 'guppy-koi', swatch: ['#fbe8e0', '#f25a30'], back: '#e8d8d0', body: '#fbeee8', belly: '#ffffff', sheen: '#ffffff', fin: '#ff7a4a', finEdge: '#ffd0b8', rim: '#fff0e8', eye: '#0b0b0b', iris: '#d8dcd8', tailSpots: '#e8452a', patch: '#f25a30' },
      ],
    },
    cory: {
      name: 'Cory catfish', size: [26, 32], h: 0.34, bodyLen: 0.78, peak: 0.28, ped: 0.36, noseRound: 0.6, topK: 1.2, botK: 0.72, arch: -0.04,
      tail: 'fork', tailScale: 0.9, speed: 20, turnRate: 3, zone: [0.9, 0.97], bottom: true, ruffle: 0,
      dorsal: { s0: 0.26, s1: 0.44, height: 0.75, sweep: 0.5, pointed: true }, anal: { s0: 0.7, s1: 0.8, height: 0.25, sweep: 0.4 },
      pectoral: 0.26, barbels: true,
      plates: true, gill: 0.28, eye: [0.17, -0.16, 0.12], mouthY: 0.18, rays: 1,
      palettes: [{ name: 'Peppered', photo: 'cory-peppered', swatch: ['#c8a050', '#3a3a28'], back: '#5e584a', body: '#b8ac92', belly: '#efe6d2', sheen: '#ffffff', fin: '#e2d8c6', finEdge: '#fff8ea', rim: '#ffffff', eye: '#0b0b0b', iris: '#a8b4bc', spots: '#3a3228', gillSheen: '#6fd6b0' }],
    },
  };

  // ------------------------------------------------------------ body shape
  function profile(sp, s) {
    const m = sp.peak;
    if (s < m) {
      const k = (m - s) / m;
      return Math.pow(Math.max(0, 1 - k * k), 0.5 * sp.noseRound + 0.25);
    }
    const k = (s - m) / (1 - m);
    return lerp(1, sp.ped, smooth(k));
  }

  const S = 24; // spine samples along the body
  // The unbent body in local space: nose at +x, tail root at -x.
  function shape(f) {
    if (f._sh && f._sh.len === f.len && f._sh.sp === f.sp) return f._sh;
    const sp = f.sp, L = f.len, H = L * sp.h, Lb = L * sp.bodyLen;
    const noseX = L * 0.5, pedX = noseX - Lb;
    const yc = (s) => sp.arch * Math.sin(Math.PI * s) * H;
    const hh = (s) => profile(sp, s) * H * 0.5;
    const topY = (s) => yc(s) - hh(s) * sp.topK;
    const botY = (s) => yc(s) + hh(s) * sp.botK;
    const xAt = (s) => noseX - s * Lb;
    const xs = new Float32Array(S + 1), top = new Float32Array(S + 1), bot = new Float32Array(S + 1);
    for (let i = 0; i <= S; i++) { const s = i / S; xs[i] = xAt(s); top[i] = topY(s); bot[i] = botY(s); }
    f._sh = { len: L, sp, L, H, Lb, noseX, pedX, yc, hh, topY, botY, xAt, xs, top, bot };
    return f._sh;
  }

  // ------------------------------------------------------------ swimming pose
  // Fish swing their rear body side to side, toward and away from us. Seen
  // from the side that reads as the tail end foreshortening, plus a little
  // up-and-down flex. The pose lives in shared arrays, filled per draw.
  const PX = new Float32Array(S + 1), PY = new Float32Array(S + 1), PC = new Float32Array(S + 1), PSN = new Float32Array(S + 1);
  let tailYaw = 0;
  function pose(f, sh) {
    const L = sh.L, Lb = sh.Lb, ph = f.phase, k = 2.4;
    const lat = 0.045 + clamp(f.bend || 0, 0, 0.06) * 1.3;
    const ver = (f.bend || 0) * 0.5;
    const slopeAt = (s) => (lat * L * (2 * s * Math.sin(ph - k * s) - k * s * s * Math.cos(ph - k * s))) / Lb;
    let x = sh.noseX;
    PX[0] = x;
    PY[0] = -ver * L * 0.12 * Math.sin(ph);
    for (let i = 1; i <= S; i++) {
      const s = i / S, sm = (i - 0.5) / S;
      const sl = slopeAt(sm);
      x -= (Lb / S) / Math.sqrt(1 + sl * sl);
      PX[i] = x;
      PY[i] = ver * L * Math.sin(ph - 2.6 * s) * s * s;
    }
    for (let i = 0; i <= S; i++) {
      const a = i > 0 ? i - 1 : 0, b = i < S ? i + 1 : S;
      const dx = PX[a] - PX[b], dy = PY[a] - PY[b];
      const d = Math.hypot(dx, dy) || 1;
      PC[i] = dx / d; PSN[i] = dy / d;
    }
    tailYaw = Math.atan(slopeAt(1)) * 1.3 + 0.28 * Math.sin(ph - k - 0.9);
  }

  // Maps an unbent body point (position s along the body, local y) onto the
  // current pose. Writes [x, y, cos, sin] into out: the point, and the
  // direction of the spine there (for fins that stick out of the body).
  function warp(sh, s, y, out) {
    const fi = clamp(s, 0, 1) * S;
    let i = Math.floor(fi);
    if (i >= S) i = S - 1;
    const u = fi - i;
    let X = lerp(PX[i], PX[i + 1], u), Y = lerp(PY[i], PY[i + 1], u);
    let c = lerp(PC[i], PC[i + 1], u), sn = lerp(PSN[i], PSN[i + 1], u);
    const n = Math.hypot(c, sn) || 1;
    c /= n; sn /= n;
    if (s < 0) { X -= s * sh.Lb * c; Y -= s * sh.Lb * sn; }
    else if (s > 1) { X -= (s - 1) * sh.Lb * c; Y -= (s - 1) * sh.Lb * sn; }
    out[0] = X; out[1] = Y + y; out[2] = c; out[3] = sn;
    return out;
  }

  // ------------------------------------------------------------ skin
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function smoothTo(p, pts, move) {
    if (move) p.moveTo(pts[0][0], pts[0][1]); else p.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      p.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const q = pts[pts.length - 1];
    p.lineTo(q[0], q[1]);
  }
  function fogPalette(pal, fog) {
    if (!fog || !fog.amount) return pal;
    const out = {};
    for (const k in pal) out[k] = typeof pal[k] === 'string' && pal[k][0] === '#' ? mix(pal[k], fog.color, fog.amount * 0.85) : pal[k];
    return out;
  }
  function blob(g, x, y, rx, ry, rot, fill) {
    g.fillStyle = fill;
    g.beginPath();
    g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
    g.fill();
  }

  function paintSkin(f, sh, res, fog) {
    const sp = f.sp, H = sh.H, L = sh.L;
    const pal = f.pal;
    const R = rng(Math.floor(f.seed * 99991) + 7);
    const pad = H * 0.12 + 0.8;
    const NN = 64, tops = [], bots = [];
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i <= NN; i++) {
      const s = i / NN, x = sh.xAt(s), ty = sh.topY(s), by = sh.botY(s);
      tops.push([x, ty]); bots.push([x, by]);
      if (ty < yMin) yMin = ty;
      if (by > yMax) yMax = by;
    }
    const x0 = sh.pedX - pad, x1 = sh.noseX + pad, y0 = yMin - pad, y1 = yMax + pad;
    const w = x1 - x0, h = y1 - y0;
    const c = canvas(Math.max(2, Math.ceil(w * res)), Math.max(2, Math.ceil(h * res)));
    const g = c.getContext('2d');
    g.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
    const px = (u) => u * res; // local units to skin pixels (for blur radii)
    const body = new Path2D();
    smoothTo(body, tops, true);
    smoothTo(body, bots.slice().reverse(), false);
    body.closePath();

    g.fillStyle = pal.body;
    g.fill(body);
    g.save();
    g.clip(body);

    // Rounded shading, one column at a time so it follows the silhouette:
    // dark back, a wet highlight on the upper flank, pale belly, shaded underside.
    const COLS = 40;
    for (let i = 0; i < COLS; i++) {
      const sa = i / COLS, sb = (i + 1) / COLS, sm = (sa + sb) / 2;
      const xa = sh.xAt(sa) + 0.25, xb = sh.xAt(sb) - 0.25;
      const ty = sh.topY(sm), by = sh.botY(sm);
      const gr = g.createLinearGradient(0, ty, 0, by);
      gr.addColorStop(0, darken(pal.back, 0.12));
      gr.addColorStop(0.14, pal.back);
      gr.addColorStop(0.3, mix(pal.back, pal.body, 0.72));
      gr.addColorStop(0.36, mix(pal.body, '#ffffff', 0.1));
      gr.addColorStop(0.5, pal.body);
      gr.addColorStop(0.72, mix(pal.body, pal.belly, 0.6));
      gr.addColorStop(0.88, pal.belly);
      gr.addColorStop(1, mix(pal.belly, pal.back, 0.4));
      g.fillStyle = gr;
      g.fillRect(xb, ty - 1, xa - xb, by - ty + 2);
    }

    markings(g, f, sh, pal, R, px);
    scales(g, f, sh, pal, R);

    // The tail end is thinner and a touch darker; the head is smooth.
    const tg = g.createLinearGradient(sh.xAt(0.45), 0, sh.pedX, 0);
    tg.addColorStop(0, 'rgba(0,0,0,0)');
    tg.addColorStop(1, rgba(darken(pal.back, 0.3), 0.22));
    g.fillStyle = tg;
    g.fillRect(sh.pedX - 1, y0, sh.xAt(0.45) - sh.pedX + 1, h);

    // lateral line
    if (!sp.plates && L > 22) {
      const lc = rgba(darken(pal.back, 0.2), 0.12);
      for (let s = sp.gill + 0.05; s < 0.95; s += 0.035) {
        const x = sh.xAt(s), y = sh.yc(s) - H * 0.04 + Math.sin(s * 5) * H * 0.02;
        blob(g, x, y, H * 0.013, H * 0.008, 0, lc);
      }
    }

    // gill cover: a soft shadow behind its edge and a lit lip in front
    const gs = sp.gill;
    const gt = [sh.xAt(gs - 0.03), sh.topY(gs - 0.03) + H * 0.16];
    const gm = [sh.xAt(gs + 0.03), sh.yc(gs) + H * 0.05];
    const gb = [sh.xAt(gs - 0.02), sh.botY(gs - 0.02) - H * 0.1];
    const gill = new Path2D();
    gill.moveTo(gt[0], gt[1]);
    gill.quadraticCurveTo(gm[0], gm[1], gb[0], gb[1]);
    g.save();
    g.filter = `blur(${Math.max(0.5, px(H * 0.035))}px)`;
    g.strokeStyle = rgba(darken(pal.back, 0.35), 0.32);
    g.lineWidth = H * 0.07;
    g.translate(-H * 0.035, 0);
    g.stroke(gill);
    g.restore();
    if (f.species === 'betta' || f.species === 'goldfish') {
      g.strokeStyle = 'rgba(210,40,50,0.14)';
      g.lineWidth = H * 0.05;
      g.save(); g.translate(-H * 0.05, 0); g.stroke(gill); g.restore();
    }
    g.strokeStyle = rgba('#ffffff', 0.12);
    g.lineWidth = H * 0.016;
    g.save(); g.translate(H * 0.012, 0); g.stroke(gill); g.restore();
    // head: smooth, a little darker on top
    const hg = g.createRadialGradient(sh.xAt(0.1), sh.topY(0.1), 0, sh.xAt(0.1), sh.topY(0.1), H * 0.7);
    hg.addColorStop(0, rgba(darken(pal.back, 0.1), f.species === 'betta' ? 0.45 : 0.2));
    hg.addColorStop(1, rgba(pal.back, 0));
    g.fillStyle = hg;
    g.fillRect(sh.xAt(gs + 0.05), y0, sh.noseX + pad - sh.xAt(gs + 0.05), h);

    // Glossy highlights: a long soft sheen along the upper flank and a crisp
    // glint on the forehead, the way light sits on a wet, rounded body.
    g.save();
    const shx = sh.xAt(0.42), shy = sh.topY(0.42) + H * 0.2;
    g.translate(shx, shy);
    g.scale(sh.Lb * 0.4, H * 0.13);
    const sg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    sg.addColorStop(0, rgba('#ffffff', pal.metallic ? 0.55 : 0.42));
    sg.addColorStop(0.55, rgba('#ffffff', pal.metallic ? 0.22 : 0.15));
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg;
    g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
    g.restore();
    g.save();
    g.filter = `blur(${Math.max(0.3, px(H * 0.02))}px)`;
    blob(g, sh.xAt(0.07), sh.topY(0.07) + H * 0.13, H * 0.1, H * 0.035, -0.35, 'rgba(255,255,255,0.6)');
    g.restore();
    // rim light along the back and bounce light on the belly
    const topPath = new Path2D();
    smoothTo(topPath, tops, true);
    g.strokeStyle = rgba(pal.rim, 0.45);
    g.lineWidth = H * 0.05;
    g.stroke(topPath);
    const botPath = new Path2D();
    smoothTo(botPath, bots, true);
    g.strokeStyle = rgba(lighten(pal.belly, 0.4), 0.3);
    g.lineWidth = H * 0.04;
    g.stroke(botPath);
    g.restore();

    // a thin darker edge so the body reads against the water
    g.strokeStyle = rgba(darken(pal.back, 0.2), 0.16);
    g.lineWidth = Math.max(0.2, H * 0.01);
    g.stroke(body);

    face(g, f, sh, pal, body);

    // Depth: far fish take on the water's color and soften.
    if (fog && fog.amount) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = rgba(fog.color, fog.amount);
      g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over';
    }
    let out = c;
    if (fog && fog.blur > 0) {
      out = canvas(c.width, c.height);
      const g2 = out.getContext('2d');
      g2.filter = `blur(${px(fog.blur).toFixed(2)}px)`;
      g2.drawImage(c, 0, 0);
    }
    return { c: out, res, x0, y0, w, h, key: '', pal: f.pal, fins: fogPalette(pal, fog), grads: null };
  }

  function scales(g, f, sh, pal, R) {
    const sp = f.sp, H = sh.H;
    if (sp.plates) { plates(g, sh, pal); return; }
    const r0 = Math.max(0.5, sp.scale * H);
    const dx = r0 * 0.92, dy = r0 * 0.74;
    const s0 = sp.gill + 0.02;
    const xStart = sh.xAt(s0);
    let yTop = Infinity, yBot = -Infinity;
    for (let i = 0; i <= S; i++) { yTop = Math.min(yTop, sh.top[i]); yBot = Math.max(yBot, sh.bot[i]); }
    const sparkle = pal.iridescent || pal.metallic || f.species === 'betta' || f.species === 'tetra';
    const dark = darken(pal.back, 0.45);
    let row = 0;
    for (let y0 = yTop; y0 <= yBot; y0 += dy, row++) {
      const off = (row % 2) * dx * 0.5;
      for (let x0 = xStart - off; x0 >= sh.pedX - r0; x0 -= dx) {
        const x = x0 + (R() - 0.5) * r0 * 0.16, y = y0 + (R() - 0.5) * r0 * 0.12, r = r0 * (0.9 + R() * 0.2);
        const s = clamp((sh.noseX - x) / sh.Lb, 0, 1);
        const ty = sh.topY(s), by = sh.botY(s);
        if (y < ty - r || y > by + r) continue;
        const fade = smooth(clamp(((sh.noseX - x) / sh.Lb - s0) / 0.08, 0, 1));
        const v = (y - ty) / Math.max(0.01, by - ty);
        const k = fade * smooth(clamp(v / 0.18, 0, 1)) * smooth(clamp((1 - v) / 0.22, 0, 1));
        if (k <= 0.02) continue;
        const tone = R() - 0.5;
        g.fillStyle = tone > 0 ? rgba('#ffffff', tone * 0.1 * k) : rgba('#000000', -tone * 0.08 * k);
        g.beginPath(); g.arc(x - r * 0.1, y, r * 0.5, 0, TAU); g.fill();
        g.lineWidth = Math.max(0.05, r * 0.08);
        g.strokeStyle = rgba(dark, 0.13 * k);
        g.beginPath(); g.arc(x, y, r * 0.62, Math.PI * 0.56, Math.PI * 1.44); g.stroke();
        g.strokeStyle = rgba('#ffffff', 0.11 * k);
        g.beginPath(); g.arc(x + r * 0.14, y, r * 0.57, Math.PI * 0.64, Math.PI * 1.36); g.stroke();
        if (sparkle && R() < 0.2) {
          g.fillStyle = rgba(pal.sheen, (pal.iridescent ? 0.3 : 0.2) * k);
          g.beginPath(); g.arc(x - r * 0.18, y - r * 0.08, r * 0.3, 0, TAU); g.fill();
        }
      }
    }
  }

  // Corydoras wear two rows of armor plates instead of scales.
  function plates(g, sh, pal) {
    const H = sh.H;
    g.lineWidth = Math.max(0.1, H * 0.03);
    for (let s = 0.32; s < 0.98; s += 0.06) {
      const x = sh.xAt(s), ty = sh.topY(s), by = sh.botY(s), my = sh.yc(s);
      g.strokeStyle = rgba(darken(pal.back, 0.3), 0.26);
      g.beginPath();
      g.moveTo(x, ty); g.quadraticCurveTo(x - H * 0.12, (ty + my) / 2, x, my);
      g.moveTo(x - H * 0.06, my); g.quadraticCurveTo(x - H * 0.18, (my + by) / 2, x - H * 0.06, by);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.14)';
      g.beginPath();
      g.moveTo(x + H * 0.04, ty); g.quadraticCurveTo(x - H * 0.08, (ty + my) / 2, x + H * 0.04, my);
      g.stroke();
    }
    g.strokeStyle = rgba(darken(pal.back, 0.3), 0.22);
    g.beginPath();
    for (let s = 0.3; s <= 1; s += 0.05) { const x = sh.xAt(s), y = sh.yc(s); s === 0.3 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  }

  function markings(g, f, sh, pal, R, px) {
    const H = sh.H;
    const soft = (u) => { g.filter = `blur(${Math.max(0.3, px(u)).toFixed(2)}px)`; };
    g.save();
    if (f.species === 'tetra') {
      // red lower rear half
      soft(H * 0.05);
      g.beginPath();
      for (let s = 0.42; s <= 1.02; s += 0.04) g.lineTo(sh.xAt(s), sh.yc(s) + H * 0.02);
      g.lineTo(sh.xAt(1.02), sh.botY(1) + H * 0.3);
      g.lineTo(sh.xAt(0.42), sh.botY(0.42) + H * 0.3);
      g.closePath();
      g.fillStyle = rgba(pal.red, 0.92);
      g.fill();
      // silver belly up front
      blob(g, sh.xAt(0.25), sh.botY(0.25) - H * 0.15, sh.Lb * 0.2, H * 0.2, 0, 'rgba(255,255,255,0.55)');
      g.filter = 'none';
      // the neon stripe, eye to tail
      const band = new Path2D();
      const up = [], dn = [];
      for (let s = 0.06; s <= 0.92; s += 0.02) {
        const th = H * 0.085 * Math.sin(Math.PI * clamp((s - 0.04) / 0.9, 0, 1)) ** 0.4;
        const y = sh.yc(s) - H * 0.07;
        up.push([sh.xAt(s), y - th]); dn.push([sh.xAt(s), y + th]);
      }
      smoothTo(band, up, true); smoothTo(band, dn.reverse(), false); band.closePath();
      const bg = g.createLinearGradient(0, sh.yc(0.5) - H * 0.16, 0, sh.yc(0.5) + H * 0.02);
      bg.addColorStop(0, pal.stripe2); bg.addColorStop(0.35, pal.stripe); bg.addColorStop(0.55, '#b8fbff'); bg.addColorStop(0.75, pal.stripe); bg.addColorStop(1, pal.stripe2);
      g.fillStyle = bg;
      g.fill(band);
      g.globalCompositeOperation = 'lighter';
      soft(H * 0.1);
      g.globalAlpha = 0.55;
      g.fillStyle = pal.stripe;
      g.fill(band);
    } else if (f.species === 'angelfish') {
      if (pal.marble) {
        soft(H * 0.03);
        for (let i = 0; i < 14; i++) {
          const s = 0.08 + R() * 0.9;
          blob(g, sh.xAt(s), lerp(sh.topY(s), sh.botY(s), R()), H * (0.06 + R() * 0.14), H * (0.04 + R() * 0.1), R() * 3, rgba(pal.bars, 0.75));
        }
      }
      soft(H * 0.025);
      [[0.09, 0.07], [0.34, 0.075], [0.62, 0.095], [0.9, 0.06]].forEach(([s, wk]) => {
        const w = H * wk, x = sh.xAt(s), ty = sh.topY(s) - H, by = sh.botY(s) + H;
        g.beginPath();
        g.moveTo(x - w + H * 0.08, ty); g.lineTo(x + w + H * 0.08, ty);
        g.lineTo(x + w - H * 0.06, by); g.lineTo(x - w - H * 0.06, by);
        g.closePath();
        g.fillStyle = rgba(pal.bars, pal.marble ? 0.55 : 0.82);
        g.fill();
      });
      if (pal.crown) {
        const cg = g.createRadialGradient(sh.xAt(0.12), sh.topY(0.12), 0, sh.xAt(0.12), sh.topY(0.12), H * 0.32);
        cg.addColorStop(0, rgba(pal.crown, 0.85)); cg.addColorStop(1, rgba(pal.crown, 0));
        g.filter = 'none';
        g.fillStyle = cg;
        g.fillRect(sh.xAt(0.12) - H * 0.4, sh.topY(0.12) - H * 0.4, H * 0.8, H * 0.8);
      }
      // silvery sheen bands
      g.filter = 'none';
      g.globalCompositeOperation = 'lighter';
      soft(H * 0.12);
      blob(g, sh.xAt(0.45), sh.yc(0.45) - H * 0.05, sh.Lb * 0.34, H * 0.2, 0, 'rgba(200,225,255,0.14)');
    } else if (f.species === 'goldfish') {
      if (pal.metallic) {
        g.globalCompositeOperation = 'lighter';
        soft(H * 0.08);
        for (let i = 0; i < 5; i++) {
          const s = 0.3 + R() * 0.55;
          blob(g, sh.xAt(s), lerp(sh.topY(s), sh.botY(s), 0.3 + R() * 0.4), H * 0.18, H * 0.1, R(), 'rgba(255,215,120,0.28)');
        }
      }
      if (pal.calico) {
        soft(H * 0.04);
        for (let i = 0; i < 7; i++) {
          const s = 0.1 + R() * 0.85;
          blob(g, sh.xAt(s), lerp(sh.topY(s), sh.botY(s), 0.15 + R() * 0.6), H * (0.12 + R() * 0.16), H * (0.08 + R() * 0.12), R() * 3, rgba(i % 3 ? '#f07a12' : '#ffffff', 0.75));
        }
        soft(H * 0.015);
        for (let i = 0; i < 16; i++) {
          const s = 0.08 + R() * 0.88;
          blob(g, sh.xAt(s), lerp(sh.topY(s), sh.botY(s), 0.1 + R() * 0.7), H * (0.025 + R() * 0.05), H * (0.02 + R() * 0.04), R() * 3, rgba(pal.spots, 0.7));
        }
      }
      if (pal.cap) {
        // the red cap: a bumpy hood over the top of the head
        g.filter = 'none';
        const cx = sh.xAt(0.14), cy = sh.topY(0.14) + H * 0.06;
        const cg = g.createRadialGradient(cx, cy, 0, cx, cy, H * 0.42);
        cg.addColorStop(0, rgba(pal.cap, 0.98)); cg.addColorStop(0.7, rgba(pal.cap, 0.85)); cg.addColorStop(1, rgba(pal.cap, 0));
        g.fillStyle = cg;
        g.fillRect(cx - H * 0.5, cy - H * 0.5, H, H);
        for (let i = 0; i < 26; i++) {
          const a = R() * TAU, d = Math.sqrt(R()) * H * 0.3;
          const bx = cx + Math.cos(a) * d, by = cy + Math.sin(a) * d * 0.8;
          blob(g, bx, by, H * 0.045, H * 0.04, 0, rgba(darken(pal.cap, 0.25), 0.35));
          blob(g, bx - H * 0.012, by - H * 0.015, H * 0.02, H * 0.015, 0, 'rgba(255,220,200,0.45)');
        }
      }
    } else if (f.species === 'guppy') {
      if (pal.tux) {
        const tg = g.createLinearGradient(sh.xAt(0.45), 0, sh.xAt(0.7), 0);
        tg.addColorStop(0, rgba(pal.tailSpots, 0)); tg.addColorStop(1, rgba(pal.tailSpots, 0.82));
        g.fillStyle = tg;
        g.fillRect(sh.pedX - 2, sh.yc(0.6) - H, sh.xAt(0.45) - sh.pedX + 2, H * 2);
      }
      if (pal.patch) {
        soft(H * 0.08);
        blob(g, sh.xAt(0.68), sh.yc(0.68), sh.Lb * 0.17, H * 0.22, 0.2, rgba(pal.patch, 0.7));
        g.globalCompositeOperation = 'lighter';
        blob(g, sh.xAt(0.62), sh.yc(0.62) - H * 0.08, sh.Lb * 0.1, H * 0.1, 0, rgba(pal.patch, 0.4));
        g.globalCompositeOperation = 'source-over';
        soft(H * 0.02);
        blob(g, sh.xAt(0.8), sh.yc(0.8), H * 0.09, H * 0.08, 0, 'rgba(20,20,30,0.7)');
      }
    } else if (f.species === 'cory') {
      soft(H * 0.012);
      for (let i = 0; i < 34; i++) {
        const s = 0.06 + R() * 0.9;
        blob(g, sh.xAt(s), lerp(sh.topY(s), sh.botY(s), 0.08 + R() * 0.62), H * (0.03 + R() * 0.05), H * (0.025 + R() * 0.035), R() * 3, rgba(pal.spots, 0.4 + R() * 0.35));
      }
      g.filter = 'none';
      g.globalCompositeOperation = 'lighter';
      soft(H * 0.06);
      blob(g, sh.xAt(0.24), sh.yc(0.24), H * 0.14, H * 0.18, 0, rgba(pal.gillSheen, 0.3));
    } else if (f.species === 'betta') {
      if (pal.koi) {
        soft(H * 0.03);
        for (let i = 0; i < 6; i++) {
          const s = 0.1 + R() * 0.85;
          blob(g, sh.xAt(s), lerp(sh.topY(s), sh.botY(s), 0.15 + R() * 0.55), H * (0.1 + R() * 0.16), H * (0.08 + R() * 0.12), R() * 3, rgba(i % 3 ? '#e8452c' : '#1d2230', 0.8));
        }
      } else {
        g.globalCompositeOperation = 'lighter';
        soft(H * 0.06);
        blob(g, sh.xAt(0.55), sh.yc(0.55) - H * 0.02, sh.Lb * 0.36, H * 0.22, 0, rgba(pal.sheen, pal.iridescent ? 0.3 : 0.2));
      }
    }
    g.restore();
  }

  // Eye, nostril and mouth. The eye gets a dark socket, a striated iris,
  // a deep pupil and a glossy cornea with a bright catchlight.
  function face(g, f, sh, pal, body) {
    const sp = f.sp, H = sh.H;
    const [es, eo, er] = sp.eye;
    const cx = sh.xAt(es), cy = sh.yc(es) + eo * H, r = Math.max(0.55, er * H);
    const iris = pal.iris || '#9aa4ae';
    const sg = g.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.75);
    sg.addColorStop(0, rgba(darken(pal.back, 0.35), 0.4));
    sg.addColorStop(1, rgba(darken(pal.back, 0.35), 0));
    g.save();
    g.clip(body);
    g.fillStyle = sg;
    g.beginPath(); g.arc(cx, cy, r * 1.75, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = darken(iris, 0.6);
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    const ig = g.createRadialGradient(cx + r * 0.1, cy + r * 0.2, r * 0.15, cx, cy, r * 0.9);
    ig.addColorStop(0, lighten(iris, 0.4)); ig.addColorStop(0.55, iris); ig.addColorStop(1, darken(iris, 0.4));
    g.fillStyle = ig;
    g.beginPath(); g.arc(cx, cy, r * 0.88, 0, TAU); g.fill();
    if (r > 1.2) {
      g.strokeStyle = rgba(darken(iris, 0.5), 0.3);
      g.lineWidth = r * 0.05;
      g.beginPath();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        g.moveTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5);
        g.lineTo(cx + Math.cos(a) * r * 0.84, cy + Math.sin(a) * r * 0.84);
      }
      g.stroke();
    }
    const pgx = cx + r * 0.06, pgy = cy + r * 0.02;
    const pg = g.createRadialGradient(pgx - r * 0.1, pgy - r * 0.1, 0, pgx, pgy, r * 0.54);
    pg.addColorStop(0, '#000000'); pg.addColorStop(0.8, pal.eye || '#050a12'); pg.addColorStop(1, darken(iris, 0.5));
    g.fillStyle = pg;
    g.beginPath(); g.arc(pgx, pgy, r * 0.52, 0, TAU); g.fill();
    g.strokeStyle = rgba(lighten(iris, 0.3), 0.4);
    g.lineWidth = r * 0.08;
    g.beginPath(); g.arc(cx, cy, r * 0.72, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    const cg = g.createRadialGradient(cx + r * 0.2, cy - r * 0.38, 0, cx + r * 0.2, cy - r * 0.38, r * 0.75);
    cg.addColorStop(0, 'rgba(255,255,255,0.45)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = cg;
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    blob(g, cx + r * 0.22, cy - r * 0.36, r * 0.24, r * 0.18, -0.4, 'rgba(255,255,255,0.95)');
    blob(g, cx - r * 0.3, cy + r * 0.36, r * 0.1, r * 0.08, 0, 'rgba(255,255,255,0.5)');
    // nostril and mouth line
    g.save();
    g.clip(body);
    blob(g, sh.xAt(0.045), sh.yc(0.045) + (eo - 0.06) * H, H * 0.022, H * 0.016, 0, rgba(darken(pal.back, 0.4), 0.45));
    const my = sh.yc(0) + (sp.mouthY || 0) * H;
    g.strokeStyle = rgba(darken(pal.back, 0.45), 0.32);
    g.lineWidth = Math.max(0.15, H * 0.018);
    g.beginPath();
    g.moveTo(sh.noseX, my);
    g.quadraticCurveTo(sh.xAt(0.02), my + H * 0.008, sh.xAt(0.04), my + H * 0.025);
    g.stroke();
    g.restore();
  }

  function ensureSkin(f, sh, scale) {
    const want = clamp(Math.ceil(scale * 1.15 * 2) / 2, 1, 10);
    const fog = f.fog || null;
    const key = f.len + '|' + (fog ? fog.color + '|' + fog.amount + '|' + (fog.blur || 0) : '');
    let sk = f._skin;
    if (!sk || sk.key !== key || sk.pal !== f.pal || sk.res < want * 0.8 || sk.res > want * 3) {
      const res = sk && sk.key === key && sk.pal === f.pal && sk.res < want * 0.8 ? Math.max(want, sk.res * 1.5) : want;
      sk = paintSkin(f, shape(f), Math.min(10, res), fog);
      sk.key = key;
      f._skin = sk;
    }
    return sk;
  }

  // ------------------------------------------------------------ body strips
  // Each slice is sheared (not rotated) so its vertical edges land exactly
  // on its neighbors': the body flexes with no seams.
  function drawBody(ctx, sh, sk, m, step) {
    const a = m.a, b = m.b, c = m.c, d = m.d, e = m.e, ff = m.f;
    const scale = Math.hypot(c, d) || 1;
    const ov = 0.8 / scale;
    const right = sk.x0 + sk.w;
    for (let j = 0; j < S; j += step) {
      const k = Math.min(S, j + step);
      const ux1 = sh.xs[j], ux0 = sh.xs[k], span = ux1 - ux0;
      const ma = (PX[j] - PX[k]) / span, mb = (PY[j] - PY[k]) / span;
      const me = PX[k] - ma * ux0, mf = PY[k] - mb * ux0;
      let sx0 = k === S ? sk.x0 : ux0 - ov;
      let sx1 = j === 0 ? right : ux1 + ov;
      sx0 = Math.max(sk.x0, sx0); sx1 = Math.min(right, sx1);
      ctx.setTransform(a * ma + c * mb, b * ma + d * mb, c, d, a * me + c * mf + e, b * me + d * mf + ff);
      ctx.drawImage(sk.c, (sx0 - sk.x0) * sk.res, 0, (sx1 - sx0) * sk.res, sk.c.height, sx0, sk.y0, sx1 - sx0, sk.h);
    }
    ctx.setTransform(m);
  }

  function bodyPath(sh) {
    const p = new Path2D(), q = [0, 0, 0, 0];
    for (let i = 0; i <= S; i++) { warp(sh, i / S, sh.top[i], q); i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); }
    for (let i = S; i >= 0; i--) { warp(sh, i / S, sh.bot[i], q); p.lineTo(q[0], q[1]); }
    p.closePath();
    return p;
  }

  // ------------------------------------------------------------ fins
  function membrane(ctx, base, outer, pal, a0, a1, rays, rayW, curl) {
    const n = base.length;
    ctx.beginPath();
    ctx.moveTo(base[0][0], base[0][1]);
    smoothTo(ctx, outer, false);
    ctx.lineTo(base[n - 1][0], base[n - 1][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(base[i][0], base[i][1]);
    ctx.closePath();
    const bi = base[n >> 1], oi = outer[n >> 1];
    const gr = ctx.createLinearGradient(bi[0], bi[1], oi[0], oi[1]);
    gr.addColorStop(0, rgba(pal.fin, a0));
    gr.addColorStop(0.7, rgba(mix(pal.fin, pal.finEdge, 0.5), (a0 + a1) / 2));
    gr.addColorStop(1, rgba(pal.finEdge, a1));
    ctx.fillStyle = gr;
    ctx.fill();
    if (!rays) return;
    // rays: fine bony lines from the base out to the edge that fork near
    // the rim, curving with the flow
    ctx.beginPath();
    for (let i = 0; i < n; i += rays) {
      const bx = base[i][0], by = base[i][1], ox = outer[i][0], oy = outer[i][1];
      const qx = (bx + ox) / 2 + (oy - by) * curl, qy = (by + oy) / 2 - (ox - bx) * curl;
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(qx, qy, ox, oy);
      if (i + 1 < n && n > 6) {
        const fx = 0.25 * bx + 0.5 * qx + 0.25 * ox, fy = 0.25 * by + 0.5 * qy + 0.25 * oy;
        const tx = (ox + outer[i + 1][0]) / 2, ty = (oy + outer[i + 1][1]) / 2;
        ctx.moveTo(lerp(fx, ox, 0.45), lerp(fy, oy, 0.45));
        ctx.lineTo(tx, ty);
      }
    }
    ctx.strokeStyle = rgba(darken(pal.fin, 0.25), Math.min(0.42, a0 * 0.42));
    ctx.lineWidth = rayW * 0.85;
    ctx.stroke();
    ctx.strokeStyle = rgba(pal.rim, 0.1);
    ctx.lineWidth = rayW * 0.4;
    ctx.stroke();
    ctx.beginPath();
    smoothTo(ctx, outer, true);
    ctx.strokeStyle = rgba(pal.finEdge, Math.min(0.5, a1 + 0.15));
    ctx.lineWidth = rayW;
    ctx.stroke();
  }

  const W4 = [0, 0, 0, 0];
  // Dorsal (dir -1) or anal (dir +1) fin along the back or belly.
  function edgeFin(ctx, f, sh, def, dir, t, pal, detail) {
    const sp = f.sp, L = sh.L, H = sh.H;
    const M = detail ? 16 : 8;
    const flare = f.flare || 0;
    const base = [], outer = [];
    const s1 = Math.min(1, def.s1);
    for (let k = 0; k <= M; k++) {
      const u = k / M;
      const s = lerp(def.s0, s1, u);
      const ey = dir < 0 ? sh.topY(s) + H * 0.05 : sh.botY(s) - H * 0.05;
      warp(sh, s, ey, W4);
      let hgt = def.sail ? (u < 0.92 ? 0.2 + 0.8 * Math.pow(u / 0.92, 1.1) : 1 - (u - 0.92) * 9)
        : def.pointed ? Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - u * 0.2)
          : Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.15)), 0.7);
      if (def.s1 > 1 && u > 0.75) hgt *= 1 + (u - 0.75) * 1.4;
      hgt *= def.height * H * (1 + flare * 0.35);
      const ruffle = sp.ruffle * Math.sin(t * 2.2 + u * 9 + f.seed) * H * 0.07 * u;
      const wave = Math.sin(t * 3 - u * 5 + f.seed) * H * 0.025 * u;
      const ox = -def.sweep * hgt * (0.3 + u * 0.7) - (def.s1 > 1 ? u * u * L * 0.18 : 0) + ruffle * 0.5;
      const oy = dir * (hgt + H * 0.05 + ruffle + wave);
      base.push([W4[0], W4[1]]);
      outer.push([W4[0] + ox * W4[2] - oy * W4[3], W4[1] + ox * W4[3] + oy * W4[2]]);
    }
    const fa = pal.finAlpha || [0.8, 0.6, 0.3];
    membrane(ctx, base, outer, pal, fa[0] * 0.92, Math.max(0.28, fa[2]), detail ? (sp.rays > 1.2 ? 1 : 2) : 0, Math.max(0.12, H * 0.012), dir * 0.06);
    if (pal.bars && detail) {
      // the angelfish's dark bars run on into the fins
      ctx.save();
      ctx.globalAlpha *= 0.45;
      [[0.34, 0.075], [0.62, 0.095]].forEach(([bs]) => {
        const u = (bs - def.s0) / (s1 - def.s0);
        if (u < 0 || u > 1) return;
        const i = Math.round(u * M), i0 = Math.max(0, i - 1), i1 = Math.min(M, i + 1);
        ctx.beginPath();
        ctx.moveTo(base[i0][0], base[i0][1]); ctx.lineTo(outer[i0][0], outer[i0][1]);
        ctx.lineTo(outer[i1][0], outer[i1][1]); ctx.lineTo(base[i1][0], base[i1][1]);
        ctx.closePath();
        ctx.fillStyle = rgba(pal.bars, 0.8);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  function drawTail(ctx, f, sh, pal, t, detail) {
    const sp = f.sp, L = sh.L;
    const bt = sh.top[S], bb = sh.bot[S];
    const bh = Math.max(0.5, (bb - bt) / 2), cy0 = (bt + bb) / 2;
    warp(sh, 1, cy0, W4);
    const ox = W4[0], oy = W4[1], c = W4[2], sn = W4[3];
    const tl = L * (1 - sp.bodyLen) * sp.tailScale;
    const fore = Math.max(0.34, Math.cos(tailYaw));
    const flick = Math.sin(f.phase - 3.1) * 0.07;
    const cf = Math.cos(flick), sf = Math.sin(flick);
    const P = (dx, dy) => {
      const x = dx * fore, x2 = x * cf - dy * sf, y2 = x * sf + dy * cf;
      return [ox + x2 * c - y2 * sn, oy + x2 * sn + y2 * c];
    };
    const light = 0.86 + 0.14 * Math.sin(tailYaw * 2);
    const fa = pal.finAlpha || [0.9, 0.62, 0.3];
    let edge;
    const path = new Path2D();
    if (sp.tail === 'fork') {
      const M = 12;
      edge = [];
      for (let k = 0; k <= M; k++) {
        const u = k / M, v = Math.abs(u - 0.5) * 2;
        const reach = tl * (0.55 + 0.45 * Math.pow(v, 0.8));
        const a = (u - 0.5) * 1.5;
        edge.push(P(-Math.cos(a) * reach, Math.sin(a) * reach * 0.95));
      }
      path.moveTo(...P(0, -bh));
      smoothTo(path, edge, false);
      path.lineTo(...P(0, bh));
      path.closePath();
    } else {
      const spread = sp.tail === 'veil' ? 1.3 : sp.tail === 'double' ? 1.2 : sp.tail === 'lyre' ? 1.05 : 1.15;
      const M = 26;
      edge = [];
      for (let k = 0; k <= M; k++) {
        const u = k / M;
        const a = (u - 0.5) * spread * 2;
        let r = tl * (sp.tail === 'veil' ? 0.95 + 0.12 * Math.cos(a * 1.2) : sp.tail === 'lyre' ? 0.75 + 0.35 * Math.pow(Math.abs(u - 0.5) * 2, 3) : 0.88 + 0.12 * Math.cos(a));
        if (sp.tail === 'double') r *= 0.82 + 0.28 * Math.abs(Math.sin(u * Math.PI * 2));
        r += sp.ruffle * Math.sin(t * 2.6 + u * 14 + f.seed) * tl * 0.06 * (0.4 + Math.abs(u - 0.5));
        const flow = Math.sin(t * 1.6 - u * 3 + f.seed) * tl * 0.05 * sp.ruffle;
        edge.push(P(-Math.cos(a) * r + flow, Math.sin(a) * r * 1.02));
      }
      if (sp.tail === 'veil' || sp.tail === 'double') {
        const sh2 = (sgn) => [0.35, 0.68].map((k) => P(-Math.cos(spread) * tl * k - tl * 0.12 * k, sgn * Math.sin(spread) * tl * k * 0.92));
        edge.unshift(...sh2(-1));
        edge.push(...sh2(1).reverse());
      }
      path.moveTo(...P(0, -bh));
      smoothTo(path, edge, false);
      path.lineTo(...P(0, bh));
      path.closePath();
    }
    const g = ctx.createRadialGradient(ox, oy, bh * 0.4, ox, oy, tl * 1.05);
    g.addColorStop(0, rgba(pal.fin, fa[0] * light));
    g.addColorStop(0.6, rgba(mix(pal.fin, pal.finEdge, 0.5), fa[1] * light));
    g.addColorStop(1, rgba(pal.finEdge, fa[2] * light));
    ctx.fillStyle = g;
    ctx.fill(path);
    if (pal.iridescent || (f.species === 'betta' && detail)) {
      const ig = ctx.createRadialGradient(ox, oy, tl * 0.2, ox, oy, tl * 0.95);
      ig.addColorStop(0, rgba(pal.sheen, 0));
      ig.addColorStop(0.55, rgba(pal.sheen, 0.1 + 0.04 * Math.sin(t * 1.2 + f.seed)));
      ig.addColorStop(1, rgba(pal.sheen, 0));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = ig;
      ctx.fill(path);
      ctx.restore();
    }
    if (pal.tailSpots) {
      // guppy tails: fine speckles and a darker trailing band
      ctx.save();
      ctx.clip(path);
      const sr = rng(Math.floor(f.seed * 7919) + 3);
      ctx.fillStyle = rgba(pal.tailSpots, 0.5);
      ctx.beginPath();
      for (let i = 0; i < 46; i++) {
        const a = (sr() - 0.5) * 2.1, d = tl * (0.25 + 0.7 * Math.sqrt(sr()));
        const p = P(-Math.cos(a) * d, Math.sin(a) * d);
        const rr = tl * (0.012 + sr() * 0.022);
        ctx.moveTo(p[0] + rr, p[1]);
        ctx.arc(p[0], p[1], rr, 0, TAU);
      }
      ctx.fill();
      ctx.lineWidth = tl * 0.12;
      ctx.strokeStyle = rgba(darken(pal.fin, 0.35), 0.28);
      ctx.beginPath();
      smoothTo(ctx, edge, true);
      ctx.stroke();
      ctx.restore();
    }
    if (detail) {
      // rays fan out from the tail root, bending with the water
      const n = edge.length;
      const every = sp.rays > 1.2 ? 1 : 2;
      ctx.beginPath();
      for (let i = 0; i < n; i += every) {
        const u = i / (n - 1);
        const b = P(0, lerp(-bh, bh, u) * 0.85);
        const e = edge[i];
        const bend = Math.sin(f.phase - 3.6) * 0.12;
        const qx = (b[0] + e[0]) / 2 + (e[1] - b[1]) * bend, qy = (b[1] + e[1]) / 2 - (e[0] - b[0]) * bend;
        ctx.moveTo(b[0], b[1]);
        ctx.quadraticCurveTo(qx, qy, e[0], e[1]);
        if (i + 1 < n) {
          const mx = 0.25 * b[0] + 0.5 * qx + 0.25 * e[0], my = 0.25 * b[1] + 0.5 * qy + 0.25 * e[1];
          ctx.moveTo(lerp(mx, e[0], 0.4), lerp(my, e[1], 0.4));
          ctx.lineTo((e[0] + edge[i + 1][0]) / 2, (e[1] + edge[i + 1][1]) / 2);
        }
      }
      ctx.strokeStyle = rgba(darken(pal.fin, 0.25), Math.min(0.42, fa[0] * 0.45 * light));
      ctx.lineWidth = Math.max(0.1, sh.H * 0.01);
      ctx.stroke();
      ctx.strokeStyle = rgba(pal.rim, 0.1);
      ctx.lineWidth = Math.max(0.05, sh.H * 0.005);
      ctx.stroke();
      if (sp.tail !== 'fork') {
        ctx.beginPath();
        const shoulders = sp.tail === 'veil' || sp.tail === 'double' ? 2 : 0;
        smoothTo(ctx, edge.slice(shoulders, edge.length - shoulders), true);
        ctx.strokeStyle = rgba(pal.finEdge, 0.55);
        ctx.lineWidth = Math.max(0.15, sh.H * 0.014);
        ctx.stroke();
      }
    }
  }

  function drawPectoral(ctx, f, sh, pal, far, detail) {
    const sp = f.sp, H = sh.H;
    const s = sp.pectoral + (far ? 0.02 : 0);
    warp(sh, s, sh.yc(s) + H * 0.14, W4);
    const len = Math.min(H * 0.52, sh.L * 0.17);
    const ang = 0.55 + Math.sin(f.finPhase + (far ? 1.3 : 0)) * 0.42;
    ctx.save();
    ctx.translate(W4[0], W4[1]);
    ctx.rotate(Math.atan2(W4[3], W4[2]) + ang + Math.PI);
    const pts = [];
    const M = 6;
    for (let k = 0; k <= M; k++) {
      const a = (k / M - 0.5) * 0.9;
      const r = len * (0.72 + 0.28 * Math.cos(a * 2.2));
      pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.9]);
    }
    const base = pts.map((_, k) => [0, (k / M - 0.5) * H * 0.08]);
    const fa = far ? 0.16 : 0.3;
    const clear = { fin: mix(pal.fin, pal.body || pal.fin, 0.5), finEdge: pal.finEdge, rim: pal.rim };
    membrane(ctx, base, pts, clear, fa, fa * 0.5, detail ? 1 : 0, Math.max(0.08, H * 0.008), 0.05);
    ctx.restore();
  }

  function drawPelvic(ctx, f, sh, pal, t, detail) {
    const pv = f.sp.pelvic;
    if (!pv) return;
    const H = sh.H;
    warp(sh, pv.s, sh.botY(pv.s) - H * 0.06, W4);
    const len = H * pv.len;
    const sway = Math.sin(t * 1.4 + f.seed) * 0.15;
    ctx.save();
    ctx.translate(W4[0], W4[1]);
    ctx.rotate(Math.atan2(W4[3], W4[2]) + 0.35 + sway);
    if (pv.filament) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-len * 0.2, len * 0.5, -len * 0.35, len);
      ctx.strokeStyle = rgba(pal.finEdge, 0.75);
      ctx.lineWidth = Math.max(0.35, H * 0.025);
      ctx.lineCap = 'round';
      ctx.stroke();
    } else {
      const base = [], outer = [];
      for (let k = 0; k <= 5; k++) {
        const u = k / 5, a = 1.15 + u * 0.75;
        const r = len * (0.75 + 0.25 * Math.sin(Math.PI * u));
        base.push([-u * len * 0.22, 0]);
        outer.push([Math.cos(a) * r - u * len * 0.22, Math.sin(a) * r]);
      }
      membrane(ctx, base, outer, pal, 0.6, 0.3, detail ? 1 : 0, Math.max(0.08, H * 0.008), 0.04);
    }
    ctx.restore();
  }

  // A flaring betta puffs out the dark "beard" under its gill cover.
  function drawBeard(ctx, f, sh, pal, t) {
    const fl = f.flare || 0;
    if (f.species !== 'betta' || fl < 0.05) return;
    const H = sh.H;
    const base = [], outer = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8, s = lerp(0.14, 0.32, u);
      warp(sh, s, sh.botY(s) - H * 0.04, W4);
      const d = H * 0.26 * fl * Math.sin(Math.PI * u) * (1 + Math.sin(t * 6 + u * 9) * 0.12);
      base.push([W4[0], W4[1]]);
      outer.push([W4[0] - W4[3] * d, W4[1] + W4[2] * d]);
    }
    ctx.save();
    ctx.globalAlpha *= 0.8 * fl;
    membrane(ctx, base, outer, { fin: darken(pal.back, 0.3), finEdge: pal.fin, rim: pal.rim }, 0.9, 0.5, 1, Math.max(0.1, H * 0.01), 0);
    ctx.restore();
  }

  function drawBarbels(ctx, f, sh, pal) {
    if (!f.sp.barbels) return;
    const H = sh.H;
    warp(sh, 0.03, sh.botY(0.03) - H * 0.05, W4);
    ctx.save();
    ctx.translate(W4[0], W4[1]);
    ctx.rotate(Math.atan2(W4[3], W4[2]));
    ctx.strokeStyle = rgba(lighten(pal.belly, 0.2), 0.85);
    ctx.lineCap = 'round';
    const wig = Math.sin(f.finPhase * 1.7) * H * 0.05;
    [[0.34, 0.22], [0.26, 0.34], [0.12, 0.4]].forEach(([dx, dy], i) => {
      ctx.lineWidth = Math.max(0.2, H * (0.035 - i * 0.008));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(H * dx * 0.6, H * dy * 0.4 + wig, H * dx, H * dy + wig);
      ctx.stroke();
    });
    ctx.restore();
  }

  // Breathing: the mouth opens a touch, now and then.
  function drawMouth(ctx, f, sh, pal, t) {
    const H = sh.H;
    const open = Math.max(0, Math.sin(t * 2.2 + f.seed * 3));
    if (open < 0.1) return;
    warp(sh, 0.005, sh.yc(0) + (f.sp.mouthY || 0) * H, W4);
    blob(ctx, W4[0] - H * 0.01, W4[1], H * 0.035, H * 0.02 * open, Math.atan2(W4[3], W4[2]), rgba(darken(pal.back, 0.6), 0.55));
  }

  // ------------------------------------------------------------ draw
  // f: { species, sp, pal, len, phase, finPhase, bend, seed, flare, fog }
  // Draws the fish centered at the current transform, facing +x. Palettes
  // with a photo are drawn from the photograph (see fish-photo.js); fx.light
  // then paints the tank's rippling light onto it. Painted fish return their
  // body outline when wantPath is set, for the caller to light.
  function draw(ctx, f, t, alpha = 1, wantPath = false, fx = null) {
    if (PH && f.pal && f.pal.photo) {
      const r = PH.draw(ctx, f, t, alpha, fx);
      if (r !== undefined) return r;
    }
    const sh = shape(f);
    const m = ctx.getTransform();
    const scale = Math.hypot(m.c, m.d) || 1;
    const sk = ensureSkin(f, sh, scale);
    const pal = sk.fins;
    const onScreen = sh.L * scale;
    const detail = onScreen > 30;
    const fine = onScreen > 80;
    pose(f, sh);
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * alpha;
    drawPectoral(ctx, f, sh, pal, true, detail);
    drawTail(ctx, f, sh, pal, t, detail);
    if (f.sp.dorsal) edgeFin(ctx, f, sh, f.sp.dorsal, -1, t, pal, detail);
    if (f.sp.anal) edgeFin(ctx, f, sh, f.sp.anal, 1, t + 0.7, pal, detail);
    drawPelvic(ctx, f, sh, pal, t, detail);
    drawBeard(ctx, f, sh, pal, t);
    drawBody(ctx, sh, sk, m, fine ? 1 : detail ? 2 : 4);
    if (fine) drawMouth(ctx, f, sh, pal, t);
    drawPectoral(ctx, f, sh, pal, false, detail);
    drawBarbels(ctx, f, sh, pal);
    ctx.globalAlpha = prevAlpha;
    return wantPath ? bodyPath(sh) : null;
  }

  // Mouth position in local space (for eating and blowing bubbles). A photo
  // fish's mouth already faces the way the fish is turned; see isPhoto.
  function mouth(f) {
    if (PH && f.pal && f.pal.photo) {
      const m = PH.mouth(f);
      if (m) return m;
    }
    return [f.len * 0.5, f.len * f.sp.h * 0.02];
  }

  // Photo fish steer themselves: callers skip the flip-around squash and
  // tilt by heading(f) instead of the turn.
  function isPhoto(f) { return !!(PH && f.pal && f.pal.photo && PH.has(f)); }
  const ready = (f) => (PH ? PH.ready(f.pal) : true);
  const whenReady = (f, cb) => (PH ? PH.whenReady(f.pal, cb) : cb());
  function heading(f) { return isPhoto(f) ? PH.heading(f) : Math.sign(f.turn || 1); }

  // The fish's straight-pose bounds in local units (for framing portraits).
  function extent(f) {
    const e = isPhoto(f) ? PH.extent(f) : null;
    if (e) return e;
    const tail = f.len * (1 - f.sp.bodyLen) * f.sp.tailScale;
    return { x0: -f.len * 0.5 - tail * 0.6, x1: f.len * 0.5, y0: -f.len * f.sp.h * 1.1, y1: f.len * f.sp.h * 1.1 };
  }

  function makeFish(species, opts = {}) {
    const sp = SPECIES[species] || SPECIES.goldfish;
    const pal = sp.palettes[opts.palette != null ? opts.palette % sp.palettes.length : Math.floor(Math.random() * sp.palettes.length)];
    return {
      species,
      sp,
      pal,
      palette: sp.palettes.indexOf(pal),
      len: opts.len || sp.size[0] + Math.random() * (sp.size[1] - sp.size[0]),
      phase: Math.random() * TAU,
      finPhase: Math.random() * TAU,
      bend: 0.012,
      seed: Math.random() * 10,
      flare: 0,
    };
  }

  if (PH) PH.preload(SPECIES);
  A.fish = { SPECIES, draw, makeFish, mouth, isPhoto, heading, extent, ready, whenReady, rgba, mix };
})();
