/* Aerium fish: procedural side-view fish drawn on canvas in the glossy
   Frutiger Aero style. Each species describes a body profile, fins, tail,
   colors and markings; draw() renders one fish at its current pose. */
(function () {
  'use strict';
  const A = window.Aerium;
  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
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

  // ------------------------------------------------------------ species
  const SPECIES = {
    betta: {
      name: 'Betta', size: [64, 78], h: 0.33, bodyLen: 0.55, peak: 0.34, ped: 0.46, noseRound: 0.65, topK: 1, botK: 1.05, arch: -0.02,
      tail: 'veil', tailScale: 1.22, speed: 18, turnRate: 2.2, zone: [0.15, 0.75], ruffle: 1,
      dorsal: { s0: 0.4, s1: 1.0, height: 0.85, sweep: 1.0 }, anal: { s0: 0.24, s1: 1.0, height: 1.05, sweep: 0.9 },
      pectoral: 0.2, pelvic: { s: 0.3, len: 0.36 },
      palettes: [
        { name: 'Cobalt', back: '#0f2f9c', body: '#1c4fd6', belly: '#3a6ff0', sheen: '#48d4ff', fin: '#2b2fa0', finEdge: '#5a78ff', rim: '#9fb4ff', eye: '#0b1a2e', iris: '#2a4fb0' },
        { name: 'Ruby', back: '#7a0c1c', body: '#c8172e', belly: '#e84a4a', sheen: '#ff9fb0', fin: '#a3122a', finEdge: '#ff5a6e', rim: '#ffc0c8', eye: '#1a0808', iris: '#8a1a2a' },
        { name: 'Violet', back: '#3a1470', body: '#6a2fc0', belly: '#8a5ae0', sheen: '#6fd8ff', fin: '#4a2aa0', finEdge: '#b58aff', rim: '#e0ccff', eye: '#120a20', iris: '#5a3aa0' },
        { name: 'Koi', back: '#e8eef5', body: '#f5f8fb', belly: '#ffffff', sheen: '#ffb3a3', fin: '#ff6a4a', finEdge: '#ffd0c0', rim: '#ffffff', eye: '#101820' },
        { name: 'Beta blue', back: '#081f86', body: '#1c4fd6', belly: '#4d86ff', sheen: '#48d4ff', fin: '#1a24a8', finEdge: '#6f7dff', rim: '#bff4ff', eye: '#050c1c', iris: '#2a5fe0', finAlpha: [0.9, 0.72, 0.55], iridescent: true },
      ],
    },
    goldfish: {
      name: 'Goldfish', size: [44, 58], h: 0.46, bodyLen: 0.62, peak: 0.36, ped: 0.34, noseRound: 0.55, topK: 1.08, botK: 1.02, arch: -0.05,
      tail: 'double', tailScale: 1.2, speed: 26, turnRate: 2.6, zone: [0.2, 0.8], ruffle: 0.7,
      dorsal: { s0: 0.3, s1: 0.72, height: 0.5, sweep: 0.5 }, anal: { s0: 0.72, s1: 0.9, height: 0.3, sweep: 0.5 },
      pectoral: 0.28, pelvic: { s: 0.42, len: 0.25 },
      palettes: [
        { name: 'Orange', back: '#e2530f', body: '#ffa928', belly: '#ffe7a0', sheen: '#fff1b8', fin: '#ff9a28', finEdge: '#ffd27a', rim: '#fff4d0', eye: '#1b2a3a', iris: '#ffd62e' },
        { name: 'Red cap', back: '#f2f5f8', body: '#fbfcfd', belly: '#ffffff', sheen: '#ffffff', fin: '#fff0e0', finEdge: '#ffe0c0', rim: '#ffffff', eye: '#1b2a3a', iris: '#f5c060', cap: '#e8412c' },
        { name: 'Calico', back: '#f08a12', body: '#ffb04a', belly: '#fff3dc', sheen: '#ffffff', fin: '#ffe6c8', finEdge: '#fff6ea', rim: '#ffffff', eye: '#1b2a3a', iris: '#ffd62e', spots: '#2a2a3a' },
      ],
    },
    tetra: {
      name: 'Neon tetra', size: [20, 25], h: 0.27, bodyLen: 0.78, peak: 0.36, ped: 0.34, noseRound: 0.8, topK: 1, botK: 1.05, arch: 0,
      tail: 'fork', tailScale: 1, speed: 46, turnRate: 4, zone: [0.2, 0.7], school: true, ruffle: 0,
      dorsal: { s0: 0.42, s1: 0.58, height: 0.45, sweep: 0.6 }, anal: { s0: 0.58, s1: 0.8, height: 0.3, sweep: 0.5 },
      pectoral: 0.3,
      palettes: [{ name: 'Neon', back: '#5f7a8a', body: '#c9d8e2', belly: '#eef6fa', sheen: '#ffffff', fin: '#dfeef6', finEdge: '#ffffff', rim: '#ffffff', eye: '#0b1622', iris: '#bfe6ff', stripe: '#34e6ff', red: '#ff3a3a' }],
    },
    angelfish: {
      name: 'Angelfish', size: [42, 52], h: 0.72, bodyLen: 0.66, peak: 0.42, ped: 0.26, noseRound: 0.9, topK: 1, botK: 1, arch: 0,
      tail: 'lyre', tailScale: 0.95, speed: 16, turnRate: 1.8, zone: [0.2, 0.7], ruffle: 0.3,
      dorsal: { s0: 0.26, s1: 0.78, height: 0.95, sweep: 0.75, sail: true }, anal: { s0: 0.3, s1: 0.8, height: 0.95, sweep: 0.75, sail: true },
      pectoral: 0.22, pelvic: { s: 0.34, len: 1.1, filament: true },
      palettes: [
        { name: 'Silver', back: '#8e9aa6', body: '#e8eef4', belly: '#ffffff', sheen: '#ffffff', fin: '#dfe8ef', finEdge: '#ffffff', rim: '#ffffff', eye: '#1b1b1b', iris: '#e0301e', bars: '#1e2530', crown: '#ffd27a' },
        { name: 'Marble', back: '#3a3f48', body: '#e9e4d6', belly: '#fffaf0', sheen: '#ffffff', fin: '#d8d2c2', finEdge: '#fff8e8', rim: '#ffffff', eye: '#1b1b1b', iris: '#e0301e', bars: '#2a2a30', crown: '#ffb84a' },
      ],
    },
    guppy: {
      name: 'Guppy', size: [22, 28], h: 0.26, bodyLen: 0.6, peak: 0.34, ped: 0.4, noseRound: 0.75, topK: 1, botK: 1.1, arch: 0,
      tail: 'fan', tailScale: 1.35, speed: 40, turnRate: 3.6, zone: [0.1, 0.6], ruffle: 0.6,
      dorsal: { s0: 0.55, s1: 0.85, height: 0.55, sweep: 0.9 }, anal: { s0: 0.62, s1: 0.8, height: 0.25, sweep: 0.4 },
      pectoral: 0.3,
      palettes: [
        { name: 'Sunset', back: '#6f7f6a', body: '#b8c4b0', belly: '#e8f0e0', sheen: '#ffffff', fin: '#ff7a2a', finEdge: '#ffd62e', rim: '#fff0c0', eye: '#101010', iris: '#e0e0e0', tailSpots: '#2a3aa0' },
        { name: 'Blue grass', back: '#5f7390', body: '#b0c0d8', belly: '#e6eef8', sheen: '#ffffff', fin: '#1f8fe6', finEdge: '#7fe6ff', rim: '#e0f6ff', eye: '#101010', iris: '#e0e0e0', tailSpots: '#0b3d73' },
        { name: 'Tuxedo', back: '#5a5a66', body: '#c8c0b8', belly: '#f4eee8', sheen: '#ffffff', fin: '#e8412c', finEdge: '#ffb13b', rim: '#ffe0c8', eye: '#101010', iris: '#e0e0e0', tailSpots: '#1e2530' },
      ],
    },
    cory: {
      name: 'Cory catfish', size: [26, 32], h: 0.34, bodyLen: 0.78, peak: 0.28, ped: 0.36, noseRound: 0.6, topK: 1.2, botK: 0.72, arch: -0.04,
      tail: 'fork', tailScale: 0.9, speed: 20, turnRate: 3, zone: [0.9, 0.97], bottom: true, ruffle: 0,
      dorsal: { s0: 0.26, s1: 0.44, height: 0.75, sweep: 0.5, pointed: true }, anal: { s0: 0.7, s1: 0.8, height: 0.25, sweep: 0.4 },
      pectoral: 0.24, barbels: true,
      palettes: [{ name: 'Peppered', back: '#6b6456', body: '#bfb39a', belly: '#efe6d2', sheen: '#ffffff', fin: '#e6dccb', finEdge: '#fff8ea', rim: '#ffffff', eye: '#101010', iris: '#b0b8c0', spots: '#3a342a' }],
    },
  };

  // ------------------------------------------------------------ pose helpers
  function profile(sp, s) {
    const m = sp.peak;
    if (s < m) {
      const k = (m - s) / m;
      return Math.pow(Math.max(0, 1 - k * k), 0.5 * sp.noseRound + 0.25);
    }
    const k = (s - m) / (1 - m);
    return lerp(1, sp.ped, smooth(k));
  }

  const N = 18;
  // Computes the body outline for a fish at its current phase (local space, facing +x).
  function outline(f) {
    const sp = f.sp, L = f.len, H = L * sp.h;
    const noseX = L * 0.5, pedX = L * 0.5 - L * sp.bodyLen;
    const top = [], bot = [], mid = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const x = lerp(noseX, pedX, s);
      const hh = profile(sp, s) * H * 0.5;
      const bend = f.bend * L * Math.sin(f.phase - s * 2.6) * s * s;
      const yc = sp.arch * Math.sin(Math.PI * s) * H + bend;
      top.push([x, yc - hh * sp.topK]);
      bot.push([x, yc + hh * sp.botK]);
      mid.push([x, yc]);
    }
    return { top, bot, mid, H, noseX, pedX };
  }
  function at(arr, s) {
    const fi = Math.max(0, Math.min(N, s * N));
    const i = Math.min(N - 1, Math.floor(fi)), t = fi - i;
    return [lerp(arr[i][0], arr[i + 1][0], t), lerp(arr[i][1], arr[i + 1][1], t)];
  }
  function smoothPath(ctx, pts, move) {
    if (move) ctx.moveTo(pts[0][0], pts[0][1]);
    else ctx.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }
  function bodyPath(ctx, o) {
    ctx.beginPath();
    smoothPath(ctx, o.top, true);
    smoothPath(ctx, o.bot.slice().reverse(), false);
    ctx.closePath();
  }

  // ------------------------------------------------------------ fins
  // Dorsal or anal fin along the top (dir -1) or bottom (dir +1) profile.
  function finPts(f, o, def, dir, t) {
    const sp = f.sp, L = f.len, H = o.H;
    const edge = dir < 0 ? o.top : o.bot;
    const M = 12;
    const base = [], outer = [];
    const flare = f.flare || 0;
    for (let k = 0; k <= M; k++) {
      const u = k / M;
      const s = Math.min(1, lerp(def.s0, def.s1, u));
      const b = at(edge, s);
      base.push(b);
      let hgt = def.sail ? (u < 0.92 ? 0.2 + 0.8 * Math.pow(u / 0.92, 1.1) : 1 - (u - 0.92) * 9)
        : def.pointed ? Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - u * 0.2)
        : Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.15)), 0.7);
      if (def.s1 > 1 && u > 0.75) hgt *= 1 + (u - 0.75) * 1.4;
      hgt *= def.height * H * (1 + flare * 0.35);
      const ruffle = sp.ruffle * Math.sin(t * 2.2 + u * 9 + f.seed) * H * 0.07 * u;
      const sweepX = -def.sweep * hgt * (0.3 + u * 0.7) - (def.s1 > 1 ? u * u * L * 0.18 : 0);
      outer.push([b[0] + sweepX + ruffle * 0.5, b[1] + dir * (hgt + ruffle)]);
    }
    return { base, outer };
  }
  function drawFin(ctx, pts, pal, grad, rays) {
    const { base, outer } = pts;
    ctx.beginPath();
    ctx.moveTo(base[0][0], base[0][1]);
    smoothPath(ctx, outer, false);
    ctx.lineTo(base[base.length - 1][0], base[base.length - 1][1]);
    for (let i = base.length - 1; i >= 0; i--) ctx.lineTo(base[i][0], base[i][1]);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    if (rays) {
      ctx.strokeStyle = rgba(pal.rim, pal.iridescent ? 0.16 : 0.28);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let i = 1; i < base.length; i += 2) { ctx.moveTo(base[i][0], base[i][1]); ctx.lineTo(outer[i][0], outer[i][1]); }
      ctx.stroke();
      ctx.strokeStyle = rgba(pal.finEdge, 0.55);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      smoothPath(ctx, outer, true);
      ctx.stroke();
    }
  }

  function drawTail(ctx, f, o, pal, t, G) {
    const sp = f.sp, L = f.len;
    const bt = o.top[N], bb = o.bot[N];
    const cx = o.pedX, cy = (bt[1] + bb[1]) / 2;
    const bh = Math.max(1, (bb[1] - bt[1]) / 2);
    const tl = L * (1 - sp.bodyLen) * sp.tailScale;
    const flap = Math.cos(f.phase);
    const shear = Math.sin(f.phase) * 0.22;
    const lenK = 0.82 + 0.18 * flap;
    const P = (dx, dy) => [cx + dx * lenK, cy + dy + dx * lenK * -shear];
    ctx.beginPath();
    let pts;
    if (sp.tail === 'fork') {
      pts = [P(0, -bh), P(-tl * 0.7, -tl * 0.62), P(-tl, -tl * 0.66), P(-tl * 0.5, 0), P(-tl, tl * 0.66), P(-tl * 0.7, tl * 0.62), P(0, bh)];
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
      ctx.quadraticCurveTo(pts[3][0] - tl * 0.1, pts[3][1], pts[4][0], pts[4][1]);
      ctx.quadraticCurveTo(pts[5][0], pts[5][1], pts[6][0], pts[6][1]);
      ctx.closePath();
    } else {
      // Fan-like tails: a ruffled edge swept through an angle.
      const spread = sp.tail === 'veil' ? 1.3 : sp.tail === 'double' ? 1.2 : sp.tail === 'lyre' ? 1.05 : 1.15;
      const M = 26;
      const edge = [];
      const shoulder = (sgn) => [0.35, 0.68].map((k) => P(-Math.cos(spread) * tl * k - tl * 0.12 * k, sgn * Math.sin(spread) * tl * k * 0.92));
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
        edge.unshift(...shoulder(-1));
        edge.push(...shoulder(1).reverse());
      }
      ctx.moveTo(cx, cy - bh);
      smoothPath(ctx, edge, false);
      ctx.lineTo(cx, cy + bh);
      ctx.closePath();
      pts = edge;
    }
    ctx.fillStyle = G.tail;
    ctx.fill();
    if (pal.iridescent) {
      ctx.save();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = tl * 0.05;
      [0.42, 0.68, 0.88].forEach((k, i) => {
        ctx.strokeStyle = rgba(pal.sheen, 0.1 + 0.06 * Math.sin(t * 1.2 + i * 1.7 + f.seed));
        ctx.beginPath();
        ctx.arc(cx, cy, tl * k, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();
      });
      ctx.restore();
    }
    // rays and bright rim
    if (f.len > 18) {
      ctx.strokeStyle = rgba(pal.rim, pal.iridescent ? 0.13 : 0.22);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      const step = Math.max(1, Math.floor(pts.length / 12));
      for (let i = 0; i < pts.length; i += step) { ctx.moveTo(cx, cy); ctx.lineTo(pts[i][0], pts[i][1]); }
      ctx.stroke();
      if (sp.tail !== 'fork') {
        ctx.strokeStyle = rgba(pal.finEdge, 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        smoothPath(ctx, pts, true);
        ctx.stroke();
      }
    }
    if (pal.tailSpots) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = rgba(pal.tailSpots, 0.55);
      for (let i = 0; i < 7; i++) {
        const u = ((i * 0.37 + f.seed) % 1);
        ctx.beginPath();
        ctx.arc(cx - tl * (0.35 + 0.5 * u), cy + Math.sin(i * 2.3 + f.seed) * tl * 0.45, tl * 0.06, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawPectoral(ctx, f, o, pal, alpha) {
    const sp = f.sp, L = f.len, H = o.H;
    const p = at(o.mid, sp.pectoral);
    const len = H * 0.55;
    const ang = 0.5 + Math.sin(f.finPhase) * 0.45;
    ctx.save();
    ctx.translate(p[0] - L * 0.02, p[1] + H * 0.12);
    ctx.rotate(ang + Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, -len * 0.05);
    ctx.quadraticCurveTo(len * 0.55, len * 0.22, 0, 0);
    ctx.fillStyle = rgba(pal.finEdge, 0.42 * alpha);
    ctx.fill();
    ctx.strokeStyle = rgba(pal.rim, 0.35 * alpha);
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawPelvic(ctx, f, o, pal, alpha, t) {
    const pv = f.sp.pelvic;
    if (!pv) return;
    const H = o.H;
    const p = at(o.bot, pv.s);
    const len = H * pv.len;
    const sway = Math.sin(t * 1.4 + f.seed) * 0.15;
    ctx.save();
    ctx.translate(p[0], p[1] - 1);
    ctx.rotate(0.35 + sway);
    ctx.beginPath();
    if (pv.filament) {
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-len * 0.2, len * 0.5, -len * 0.35, len);
      ctx.strokeStyle = rgba(pal.finEdge, 0.7 * alpha);
      ctx.lineWidth = Math.max(0.8, H * 0.025);
      ctx.stroke();
    } else {
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-len * 0.1, len * 0.6, -len * 0.45, len);
      ctx.quadraticCurveTo(-len * 0.35, len * 0.35, -len * 0.3, 0);
      ctx.closePath();
      ctx.fillStyle = rgba(pal.fin, 0.55 * alpha);
      ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ body markings
  function markings(ctx, f, o, pal, t, G) {
    const sp = f.sp, L = f.len, H = o.H;
    if (f.species === 'tetra') {
      // Neon stripe from eye to tail plus the red lower rear.
      ctx.beginPath();
      const pts = [];
      for (let i = 2; i <= N - 2; i++) { const m = o.mid[i]; pts.push([m[0], m[1] - H * 0.05]); }
      ctx.lineWidth = H * 0.2;
      ctx.lineCap = 'round';
      smoothPath(ctx, pts, true);
      ctx.strokeStyle = rgba(pal.stripe, 0.95);
      ctx.stroke();
      ctx.lineWidth = H * 0.07;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.stroke();
      ctx.beginPath();
      const s0 = 0.45;
      const b0 = at(o.mid, s0);
      ctx.moveTo(b0[0], b0[1] + H * 0.06);
      for (let i = Math.floor(s0 * N); i <= N; i++) ctx.lineTo(o.mid[i][0], o.mid[i][1] + H * 0.06);
      for (let i = N; i >= Math.floor(s0 * N); i--) ctx.lineTo(o.bot[i][0], o.bot[i][1]);
      ctx.closePath();
      ctx.fillStyle = rgba(pal.red, 0.9);
      ctx.fill();
    } else if (f.species === 'angelfish') {
      ctx.fillStyle = rgba(pal.bars, 0.7);
      [0.2, 0.46, 0.76].forEach((s, i) => {
        const tp = at(o.top, s), bp = at(o.bot, s);
        const w = H * (i === 1 ? 0.075 : 0.055);
        ctx.beginPath();
        ctx.moveTo(tp[0] - w, tp[1] - H * 0.2);
        ctx.quadraticCurveTo(tp[0] - w * 2.2, (tp[1] + bp[1]) / 2, bp[0] - w, bp[1] + H * 0.2);
        ctx.lineTo(bp[0] + w, bp[1] + H * 0.2);
        ctx.quadraticCurveTo(tp[0] - w * 0.2, (tp[1] + bp[1]) / 2, tp[0] + w, tp[1] - H * 0.2);
        ctx.closePath();
        ctx.fill();
      });
      if (G.extra.crown) {
        const tp = G.extra.crownAt;
        ctx.fillStyle = G.extra.crown;
        ctx.fillRect(tp[0] - H * 0.3, tp[1] - H * 0.3, H * 0.6, H * 0.6);
      }
    } else if (f.species === 'goldfish') {
      if (G.extra.cap) {
        const p = G.extra.capAt;
        ctx.fillStyle = G.extra.cap;
        ctx.fillRect(p[0] - H * 0.5, p[1] - H * 0.5, H, H);
      }
      if (pal.spots) {
        for (let i = 0; i < 6; i++) {
          const s = 0.2 + ((i * 0.23 + f.seed) % 0.7);
          const m = at(o.mid, s);
          ctx.fillStyle = rgba(i % 2 ? pal.spots : '#ffffff', i % 2 ? 0.45 : 0.6);
          ctx.beginPath();
          ctx.ellipse(m[0], m[1] + Math.sin(i * 1.7 + f.seed) * H * 0.2, H * 0.12, H * 0.08, 0.4, 0, TAU);
          ctx.fill();
        }
      }
    } else if (f.species === 'betta') {
      // Iridescent scale shimmer that drifts along the body.
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 30; i++) {
        const s = 0.16 + ((i % 10) / 10) * 0.78;
        const row = Math.floor(i / 10) - 1;
        const m = at(o.mid, s + (row % 2 ? 0.04 : 0));
        const wob = Math.sin(t * 1.3 + i * 0.9 + f.seed) * 0.5 + 0.5;
        ctx.fillStyle = rgba(pal.sheen, 0.04 + wob * 0.09);
        ctx.beginPath();
        ctx.arc(m[0], m[1] + row * H * 0.17, H * 0.065, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      const head = G.extra.headAt;
      ctx.fillStyle = G.extra.head;
      ctx.fillRect(head[0] - H * 0.6, head[1] - H * 0.6, H * 1.2, H * 1.2);
    } else if (f.species === 'cory') {
      ctx.fillStyle = rgba(pal.spots, 0.55);
      for (let i = 0; i < 18; i++) {
        const s = 0.18 + ((i * 0.618 + f.seed * 0.1) % 0.75);
        const tp = at(o.top, s), bp = at(o.bot, s);
        const y = lerp(tp[1], bp[1], 0.2 + ((i * 0.37) % 0.55));
        ctx.beginPath();
        ctx.arc(tp[0], y, H * 0.05, 0, TAU);
        ctx.fill();
      }
    }
    void sp; void L;
  }

  // ------------------------------------------------------------ draw
  // Gradients are built once per fish (in its local space) and reused every frame.
  function grads(ctx, f, o) {
    if (f._g && f._g.len === f.len) return f._g;
    const pal = f.pal, sp = f.sp, L = f.len, H = o.H;
    const body = ctx.createLinearGradient(0, -H * 0.55, 0, H * 0.55);
    body.addColorStop(0, pal.back);
    body.addColorStop(0.45, pal.body);
    body.addColorStop(1, pal.belly);
    const shineY = at(o.top, 0.3)[1];
    const shine = ctx.createLinearGradient(0, shineY, 0, shineY + H * 0.5);
    shine.addColorStop(0, 'rgba(255,255,255,0.55)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    const bp = at(o.bot, 0.45);
    const belly = ctx.createRadialGradient(bp[0], bp[1], 0, bp[0], bp[1], H * 0.5);
    belly.addColorStop(0, 'rgba(255,255,255,0.28)');
    belly.addColorStop(1, 'rgba(255,255,255,0)');
    const tl = L * (1 - sp.bodyLen) * sp.tailScale;
    const fa = pal.finAlpha || [0.95, 0.7, 0.35];
    const tail = ctx.createRadialGradient(o.pedX, 0, H * 0.1, o.pedX, 0, tl * 1.05);
    tail.addColorStop(0, rgba(pal.fin, fa[0]));
    tail.addColorStop(0.6, rgba(mix(pal.fin, pal.finEdge, 0.5), fa[1]));
    tail.addColorStop(1, rgba(pal.finEdge, fa[2]));
    const fin = (dir, def) => {
      const hgt = def.height * H;
      const g = ctx.createLinearGradient(0, dir * H * 0.3, -def.sweep * hgt * 0.5, dir * (H * 0.4 + hgt));
      g.addColorStop(0, rgba(pal.fin, fa[0] * 0.95));
      g.addColorStop(1, rgba(pal.finEdge, Math.max(0.38, fa[2])));
      return g;
    };
    const extra = {};
    if (f.species === 'betta') {
      const head = at(o.mid, 0.1);
      extra.head = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], H * 0.6);
      extra.head.addColorStop(0, rgba(pal.back, 0.55));
      extra.head.addColorStop(1, rgba(pal.back, 0));
      extra.headAt = head;
    }
    if (pal.cap) {
      const p = at(o.top, 0.16);
      extra.cap = ctx.createRadialGradient(p[0], p[1] + H * 0.05, 0, p[0], p[1] + H * 0.05, H * 0.42);
      extra.cap.addColorStop(0, rgba(pal.cap, 0.95));
      extra.cap.addColorStop(0.7, rgba(pal.cap, 0.8));
      extra.cap.addColorStop(1, rgba(pal.cap, 0));
      extra.capAt = p;
    }
    if (pal.crown) {
      const tp = at(o.top, 0.12);
      extra.crown = ctx.createRadialGradient(tp[0], tp[1], 0, tp[0], tp[1], H * 0.3);
      extra.crown.addColorStop(0, rgba(pal.crown, 0.8));
      extra.crown.addColorStop(1, rgba(pal.crown, 0));
      extra.crownAt = tp;
    }
    f._g = { len: L, body, shine, shineY, belly, bellyAt: bp, tail, dorsal: sp.dorsal && fin(-1, sp.dorsal), anal: sp.anal && fin(1, sp.anal), extra };
    return f._g;
  }

  // f: { species, sp, pal, len, phase, finPhase, bend, seed, flare }
  // Draws the fish centered at the current transform, facing +x.
  function draw(ctx, f, t, alpha = 1) {
    const sp = f.sp, pal = f.pal, L = f.len;
    const o = outline(f);
    const H = o.H;
    const G = grads(ctx, f, o);
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * alpha;
    // far-side pectoral fin (dim)
    drawPectoral(ctx, Object.assign({}, f, { finPhase: f.finPhase + 1.3 }), o, pal, 0.45);
    drawTail(ctx, f, o, pal, t, G);
    if (sp.dorsal) drawFin(ctx, finPts(f, o, sp.dorsal, -1, t), pal, G.dorsal, L > 26);
    if (sp.anal) drawFin(ctx, finPts(f, o, sp.anal, 1, t + 0.7), pal, G.anal, L > 26);
    drawPelvic(ctx, f, o, pal, 1, t);

    // body
    bodyPath(ctx, o);
    ctx.fillStyle = G.body;
    ctx.fill();

    ctx.save();
    ctx.clip();
    markings(ctx, f, o, pal, t, G);
    ctx.fillStyle = G.shine;
    ctx.beginPath();
    ctx.ellipse(lerp(o.noseX, o.pedX, 0.34), G.shineY + H * 0.12, L * sp.bodyLen * 0.4, H * 0.24, -0.04, 0, TAU);
    ctx.fill();
    ctx.fillStyle = G.belly;
    ctx.fillRect(G.bellyAt[0] - H * 0.5, G.bellyAt[1] - H * 0.5, H, H);
    if (L > 16) {
      const gt = at(o.top, 0.27), gb = at(o.bot, 0.27);
      ctx.strokeStyle = rgba(pal.back, 0.35);
      ctx.lineWidth = Math.max(0.6, H * 0.03);
      ctx.beginPath();
      ctx.moveTo(gt[0] + H * 0.05, gt[1] + H * 0.12);
      ctx.quadraticCurveTo(gt[0] - H * 0.12, (gt[1] + gb[1]) / 2, gb[0] + H * 0.05, gb[1] - H * 0.12);
      ctx.stroke();
    }
    ctx.restore();

    // rim light along the back
    ctx.beginPath();
    smoothPath(ctx, o.top.slice(1, N - 1), true);
    ctx.strokeStyle = rgba(pal.rim, 0.35);
    ctx.lineWidth = Math.max(0.6, H * 0.025);
    ctx.stroke();

    // eye
    const eyeS = f.species === 'cory' ? 0.16 : 0.12;
    const ep = at(o.mid, eyeS);
    const er = Math.max(1, H * (f.species === 'angelfish' ? 0.07 : f.species === 'tetra' ? 0.16 : 0.12));
    const ex = ep[0], ey = ep[1] - H * (f.species === 'cory' ? 0.12 : 0.06);
    ctx.fillStyle = pal.iris || '#e8eef5';
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.eye;
    ctx.beginPath(); ctx.arc(ex + er * 0.12, ey, er * 0.62, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(ex - er * 0.2, ey - er * 0.3, er * 0.26, 0, TAU); ctx.fill();

    if (sp.barbels) {
      ctx.strokeStyle = rgba(pal.belly, 0.8);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      const nb = o.bot[1];
      ctx.moveTo(nb[0], nb[1]); ctx.lineTo(nb[0] + L * 0.06, nb[1] + H * 0.25);
      ctx.moveTo(nb[0] - 1, nb[1]); ctx.lineTo(nb[0] + L * 0.02, nb[1] + H * 0.3);
      ctx.stroke();
    }
    drawPectoral(ctx, f, o, pal, 1);
    ctx.globalAlpha = prevAlpha;
    return o;
  }

  // Mouth position in local space (for eating and blowing bubbles).
  function mouth(f) {
    return [f.len * 0.5, f.len * f.sp.h * 0.02];
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

  A.fish = { SPECIES, draw, makeFish, mouth, rgba, mix };
})();
