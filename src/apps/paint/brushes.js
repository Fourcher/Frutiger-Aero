/* Paint engines for Aerium Paint: brushes (classic and era specials like
   bubbles, rainbows, sparkles and glass gel), paper textures, the shape
   library, shape rendering with outline/fill styles, tolerant flood fill and
   sticker sprites. Loaded before paint.js; exposes Aerium.paintBrushes.
   Everything works in canvas pixel space and never touches the DOM tree. */
(function () {
  'use strict';
  const A = window.Aerium;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const noop = () => {};

  // ------------------------------------------------------------------ color
  function parse(c) {
    let hex = String(c || '#000000').trim().replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    if (Number.isNaN(n)) return { r: 0, g: 0, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  function rgba(c, a) { const p = parse(c); return `rgba(${p.r},${p.g},${p.b},${a})`; }
  function mix(c1, c2, t) {
    const a = parse(c1), b = parse(c2);
    return hex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
  }
  const lighten = (c, t) => mix(c, '#ffffff', t);
  const darken = (c, t) => mix(c, '#000000', t);
  const shade = (c, t) => (t >= 0 ? lighten(c, t) : darken(c, -t));
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return hex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  function toHsl(c) {
    const { r, g, b } = parse(c);
    const R = r / 255, G = g / 255, B2 = b / 255;
    const max = Math.max(R, G, B2), min = Math.min(R, G, B2);
    let hh = 0, ss = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      ss = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      hh = max === R ? (G - B2) / d + (G < B2 ? 6 : 0) : max === G ? (B2 - R) / d + 2 : (R - G) / d + 4;
      hh *= 60;
    }
    return { h: hh, s: ss * 100, l: l * 100 };
  }
  const luma = (c) => { const p = parse(c); return (p.r * 0.299 + p.g * 0.587 + p.b * 0.114) / 255; };

  // ------------------------------------------------------------------ scratch canvases
  const pool = {};
  function scratch(slot, w, h) {
    w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
    let s = pool[slot];
    if (!s) {
      const c = document.createElement('canvas');
      c.width = Math.max(64, w); c.height = Math.max(64, h);
      s = pool[slot] = { c, x: c.getContext('2d') };
    } else if (s.c.width < w || s.c.height < h) {
      s.c.width = Math.max(s.c.width, w); s.c.height = Math.max(s.c.height, h);
    }
    const x = s.x;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.filter = 'none';
    x.shadowColor = 'transparent';
    x.clearRect(0, 0, w, h);
    return s;
  }
  // Readbacks go through CPU-backed canvases so the GPU document canvas is
  // never asked for getImageData repeatedly.
  const cpuPool = {};
  function readback(src, x, y, w, h, slot) {
    w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
    slot = slot || 'main';
    let s = cpuPool[slot];
    if (!s || s.c.width < w || s.c.height < h) {
      const c = document.createElement('canvas');
      c.width = Math.max(w, s ? s.c.width : 1); c.height = Math.max(h, s ? s.c.height : 1);
      s = cpuPool[slot] = { c, x: c.getContext('2d', { willReadFrequently: true }) };
    }
    s.x.clearRect(0, 0, w, h);
    s.x.drawImage(src, x, y, w, h, 0, 0, w, h);
    return s.x.getImageData(0, 0, w, h);
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }

  // ------------------------------------------------------------------ paper textures
  // Tileable value noise turned into alpha masks: crayon tooth, graphite grain
  // and watercolor paper. Seeded, so every stroke lands on the same "paper".
  function smooth(t) { return t * t * (3 - 2 * t); }
  function valueNoise(size, cells, rnd) {
    const g = new Float32Array(cells * cells);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    const out = new Float32Array(size * size);
    const k = cells / size;
    for (let y = 0; y < size; y++) {
      const fy = y * k, y0 = Math.floor(fy), ty = smooth(fy - y0), ya = (y0 % cells) * cells, yb = ((y0 + 1) % cells) * cells;
      for (let x = 0; x < size; x++) {
        const fx = x * k, x0 = Math.floor(fx), tx = smooth(fx - x0), xa = x0 % cells, xb = (x0 + 1) % cells;
        const a = g[ya + xa], b = g[ya + xb], c = g[yb + xa], d = g[yb + xb];
        out[y * size + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
      }
    }
    return out;
  }
  const textures = {};
  function texture(kind) {
    if (textures[kind]) return textures[kind];
    const size = kind === 'pencil' ? 64 : 128;
    const rnd = A.util.seeded(kind === 'crayon' ? 1107 : kind === 'pencil' ? 2309 : 3701);
    const n1 = valueNoise(size, kind === 'pencil' ? 32 : 16, rnd);
    const n2 = valueNoise(size, kind === 'pencil' ? 64 : kind === 'crayon' ? 64 : 32, rnd);
    const c = canvas(size, size);
    const x = c.getContext('2d');
    const img = x.createImageData(size, size);
    const d = img.data;
    for (let i = 0; i < size * size; i++) {
      const wn = rnd();
      let a;
      if (kind === 'crayon') a = clamp((n1[i] * 0.62 + n2[i] * 0.28 + wn * 0.1 - 0.24) * 3.1, 0, 1);
      else if (kind === 'pencil') a = clamp((n1[i] * 0.4 + n2[i] * 0.3 + wn * 0.3 - 0.16) * 2.3, 0, 1);
      else a = 0.72 + (n1[i] * 0.6 + n2[i] * 0.4) * 0.28;
      d[i * 4 + 3] = Math.round(a * 255);
    }
    x.putImageData(img, 0, 0);
    return (textures[kind] = c);
  }
  const patterns = new WeakMap();
  function pattern(ctx, kind) {
    let m = patterns.get(ctx);
    if (!m) { m = {}; patterns.set(ctx, m); }
    if (!m[kind]) m[kind] = ctx.createPattern(texture(kind), 'repeat');
    return m[kind];
  }

  // Draws draw(ctx) (in document coordinates) into a scratch layer limited to
  // box, masks it with a paper texture anchored to the document origin, then
  // composites it onto ctx.
  function textured(ctx, box, kind, draw, alpha, composite) {
    const x0 = Math.floor(box.x0), y0 = Math.floor(box.y0);
    const w = Math.ceil(box.x1) - x0 + 1, h = Math.ceil(box.y1) - y0 + 1;
    if (w <= 0 || h <= 0) return;
    const s = scratch('tex', w, h), x = s.x;
    x.setTransform(1, 0, 0, 1, -x0, -y0);
    draw(x);
    if (kind) {
      x.globalCompositeOperation = 'destination-in';
      x.globalAlpha = 1;
      x.fillStyle = pattern(x, kind);
      x.fillRect(x0, y0, w, h);
    }
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.globalCompositeOperation = composite || 'source-over';
    ctx.drawImage(s.c, 0, 0, w, h, x0, y0, w, h);
    ctx.restore();
  }

  // Watercolor finish for a painted region: soft bled body, darker pigment
  // rim where the water dried, and paper granulation.
  function watercolorize(ctx, box, color) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const x0 = clamp(Math.floor(box.x0), 0, W), y0 = clamp(Math.floor(box.y0), 0, H);
    const x1 = clamp(Math.ceil(box.x1), 0, W), y1 = clamp(Math.ceil(box.y1), 0, H);
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const src = scratch('wc1', w, h);
    src.x.drawImage(ctx.canvas, x0, y0, w, h, 0, 0, w, h);
    const ero = scratch('wc2', w, h), e = ero.x;
    e.drawImage(src.c, 0, 0, w, h, 0, 0, w, h);
    e.globalCompositeOperation = 'destination-in';
    [[2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5], [1.8, 1.8], [-1.8, -1.8]].forEach(([dx, dy]) => e.drawImage(src.c, 0, 0, w, h, dx, dy, w, h));
    const ring = scratch('wc3', w, h), r = ring.x;
    r.drawImage(src.c, 0, 0, w, h, 0, 0, w, h);
    r.globalCompositeOperation = 'destination-out';
    r.drawImage(ero.c, 0, 0, w, h, 0, 0, w, h);
    r.globalCompositeOperation = 'source-in';
    r.fillStyle = darken(color, 0.32);
    r.fillRect(0, 0, w, h);
    ctx.save();
    ctx.clearRect(x0, y0, w, h);
    ctx.filter = 'blur(1.4px)';
    ctx.globalAlpha = 0.88;
    ctx.drawImage(src.c, 0, 0, w, h, x0, y0, w, h);
    ctx.filter = 'blur(0.7px)';
    ctx.globalAlpha = 0.85;
    ctx.drawImage(ring.c, 0, 0, w, h, x0, y0, w, h);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = pattern(ctx, 'paper');
    ctx.fillRect(x0, y0, w, h);
    ctx.restore();
  }

  // ------------------------------------------------------------------ geometry helpers
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  function flattenQuad(a, c, b, step) {
    const n = Math.max(1, Math.ceil((dist(a, c) + dist(c, b)) / step));
    const out = [];
    for (let i = 1; i <= n; i++) {
      const t = i / n, mt = 1 - t;
      out.push({ x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x, y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y });
    }
    return out;
  }
  function quadBox(a, c, b, m) {
    return { x0: Math.min(a.x, b.x, c.x) - m, y0: Math.min(a.y, b.y, c.y) - m, x1: Math.max(a.x, b.x, c.x) + m, y1: Math.max(a.y, b.y, c.y) + m };
  }
  function strokeQuad(x, a, c, b) {
    x.beginPath();
    x.moveTo(a.x, a.y);
    x.quadraticCurveTo(c.x, c.y, b.x, b.y);
    x.stroke();
  }
  function lineStyle(x, color, w, cap) {
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.strokeStyle = color;
    x.lineWidth = w;
    x.lineCap = cap || 'round';
    x.lineJoin = 'round';
  }
  function disc(x, p, r, color) {
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = color;
    x.beginPath();
    x.arc(p.x, p.y, Math.max(0.5, r), 0, TAU);
    x.fill();
  }
  function bresenham(x0, y0, x1, y1, fn) {
    x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 100000; guard++) {
      fn(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // ------------------------------------------------------------------ decorative stamps
  // A soap bubble lit from the top left: tinted body, iridescent rim,
  // caustic glow at the base and a crisp specular highlight.
  function drawBubble(x, cx, cy, r, color, rnd) {
    if (r < 1.5) return;
    rnd = rnd || Math.random;
    x.save();
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    const body = x.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.05, cx, cy, r);
    body.addColorStop(0, rgba(color, 0.03));
    body.addColorStop(0.7, rgba(color, 0.1));
    body.addColorStop(0.9, rgba(color, 0.3));
    body.addColorStop(1, rgba(lighten(color, 0.2), 0.62));
    x.fillStyle = body;
    x.beginPath();
    x.arc(cx, cy, r, 0, TAU);
    x.fill();
    x.save();
    x.clip();
    if (x.createConicGradient) {
      const cg = x.createConicGradient(rnd() * TAU, cx, cy);
      ['#ff7ab8', '#ffd62e', '#8fe05a', '#2aceda', '#7cc8ff', '#b57cff', '#ff7ab8'].forEach((c, i, arr) => cg.addColorStop(i / (arr.length - 1), rgba(c, 0.55)));
      x.strokeStyle = cg;
      x.lineWidth = Math.max(1, r * 0.2);
      x.beginPath();
      x.arc(cx, cy, r * 0.94, 0, TAU);
      x.stroke();
    }
    const glow = x.createRadialGradient(cx + r * 0.15, cy + r * 0.75, 0, cx + r * 0.15, cy + r * 0.75, r * 0.6);
    glow.addColorStop(0, 'rgba(255,255,255,0.55)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = glow;
    x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.restore();
    x.strokeStyle = rgba(darken(color, 0.25), 0.5);
    x.lineWidth = Math.max(0.7, r * 0.05);
    x.beginPath();
    x.arc(cx, cy, r - x.lineWidth / 2, 0, TAU);
    x.stroke();
    x.save();
    x.translate(cx - r * 0.36, cy - r * 0.42);
    x.rotate(-0.62);
    const sg = x.createLinearGradient(0, -r * 0.17, 0, r * 0.17);
    sg.addColorStop(0, 'rgba(255,255,255,0.95)');
    sg.addColorStop(1, 'rgba(255,255,255,0.2)');
    x.fillStyle = sg;
    x.beginPath();
    x.ellipse(0, 0, r * 0.32, r * 0.16, 0, 0, TAU);
    x.fill();
    x.restore();
    x.fillStyle = 'rgba(255,255,255,0.75)';
    x.beginPath();
    x.arc(cx + r * 0.44, cy + r * 0.3, Math.max(0.6, r * 0.07), 0, TAU);
    x.fill();
    x.restore();
  }

  // A four-point twinkle with a colored halo and a smaller cross-light.
  function drawSparkle(x, cx, cy, R, color, rot) {
    if (R < 1) return;
    x.save();
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    const halo = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.05);
    halo.addColorStop(0, rgba(lighten(color, 0.25), 0.6));
    halo.addColorStop(0.45, rgba(color, 0.28));
    halo.addColorStop(1, rgba(color, 0));
    x.fillStyle = halo;
    x.beginPath();
    x.arc(cx, cy, R * 1.05, 0, TAU);
    x.fill();
    const star = (rad, inner, a0) => {
      x.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = a0 + (i * Math.PI) / 4, rr = i % 2 ? inner : rad;
        x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      x.closePath();
      x.fill();
    };
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.22, lighten(color, 0.4));
    g.addColorStop(0.6, color);
    g.addColorStop(1, darken(color, 0.12));
    x.fillStyle = g;
    star(R, R * 0.13, rot);
    x.globalAlpha = 0.8;
    star(R * 0.5, R * 0.1, rot + Math.PI / 4);
    x.globalAlpha = 1;
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(cx, cy, Math.max(0.7, R * 0.12), 0, TAU);
    x.fill();
    x.restore();
  }

  // ------------------------------------------------------------------ stroke engine
  // Raw pointer points are smoothed with midpoint quadratics; each brush
  // either paints the resulting pieces (seg), stamps along them at a spacing
  // (stamp), redraws the whole stroke on a layer (redraw), or works on raw
  // integer points (raw, for the pixel pencil and eraser).
  const MIN_STEP = 1;
  class Stroke {
    constructor(def, o) {
      this.def = def;
      this.id = def.id;
      this.target = o.target;
      this.layer = o.layer || null;
      this.ctx = def.layered ? this.layer : this.target;
      this.color = o.color || '#000000';
      this.color2 = o.color2 || '#ffffff';
      this.size = o.size || 4;
      this.rng = o.rng || Math.random;
      this.sound = o.sound || noop;
      this.pts = [];
      this.need = 0;
      this.pos = null;
      this.bounds = null;
      this.margin = def.margin ? def.margin(this.size) : this.size / 2 + 2;
      this.s = {};
      this.ended = false;
      if (def.begin) def.begin(this);
    }
    get layered() { return this.def.layered || null; }
    grow(x, y, m) {
      if (m == null) m = this.margin;
      const b = this.bounds;
      if (!b) { this.bounds = { x0: x - m, y0: y - m, x1: x + m, y1: y + m }; return; }
      if (x - m < b.x0) b.x0 = x - m;
      if (y - m < b.y0) b.y0 = y - m;
      if (x + m > b.x1) b.x1 = x + m;
      if (y + m > b.y1) b.y1 = y + m;
    }
    add(x, y) {
      if (this.ended) return;
      const def = this.def, pts = this.pts, n = pts.length;
      const p = { x, y };
      if (def.raw) {
        p.x = Math.floor(x); p.y = Math.floor(y);
        if (n && pts[n - 1].x === p.x && pts[n - 1].y === p.y) return;
        this.pos = p;
        pts.push(p);
        this.grow(p.x, p.y);
        if (n === 0) def.dot(this, p);
        else def.rawSeg(this, pts[n - 1], p);
        return;
      }
      this.pos = p;
      if (n && dist(p, pts[n - 1]) < MIN_STEP) return;
      pts.push(p);
      this.grow(x, y);
      if (n === 0) {
        if (def.stamp) { def.stamp(this, x, y, 0); this.need = def.spacing(this); }
        else if (def.dot) def.dot(this, p);
      } else if (n === 1) {
        const m = mid(pts[0], p);
        this.piece(pts[0], mid(pts[0], m), m);
      } else {
        this.piece(mid(pts[n - 2], pts[n - 1]), pts[n - 1], mid(pts[n - 1], p));
      }
      if (def.redraw) def.redraw(this);
    }
    piece(a, c, b) {
      if (this.def.stamp) this.walk(a, c, b);
      else if (this.def.seg) this.def.seg(this, a, c, b);
    }
    walk(a, c, b) {
      const def = this.def;
      let prev = a;
      for (const p of flattenQuad(a, c, b, 1)) {
        let d = dist(prev, p), from = prev;
        while (d >= this.need) {
          const t = d > 0 ? this.need / d : 0;
          const q = { x: from.x + (p.x - from.x) * t, y: from.y + (p.y - from.y) * t };
          def.stamp(this, q.x, q.y, Math.atan2(p.y - from.y, p.x - from.x));
          d -= this.need;
          from = q;
          this.need = Math.max(0.5, def.spacing(this));
        }
        this.need -= d;
        prev = p;
      }
    }
    tick(dt) {
      if (!this.ended && this.def.tick && this.pos) this.def.tick(this, Math.min(dt, 60));
    }
    end() {
      if (this.ended) return;
      const def = this.def, pts = this.pts, n = pts.length;
      if (!def.raw && n >= 2) {
        const a = mid(pts[n - 2], pts[n - 1]), b = pts[n - 1];
        this.piece(a, mid(a, b), b);
      }
      if (def.end) def.end(this);
      if (def.redraw) def.redraw(this);
      this.ended = true;
      if (def.finish && this.bounds) def.finish(this);
    }
  }

  const BRUSHES = {};
  const ORDER = [];
  function brush(id, name, sizes, o, internal) {
    BRUSHES[id] = Object.assign({ id, name, sizes }, o);
    if (!internal) ORDER.push(id);
  }

  // Normal brush: smooth anti-aliased round stroke.
  brush('brush', 'Brush', [2, 5, 9, 15, 24], {
    dot(s, p) { disc(s.ctx, p, s.size / 2, s.color); },
    seg(s, a, c, b) { lineStyle(s.ctx, s.color, s.size); strokeQuad(s.ctx, a, c, b); },
  });

  // Calligraphy: a flat nib held at 45 degrees.
  brush('calligraphy', 'Calligraphy brush', [3, 6, 10, 16, 24], {
    dot(s, p) {
      const k = s.size * 0.3536;
      lineStyle(s.ctx, s.color, 1.5);
      s.ctx.beginPath(); s.ctx.moveTo(p.x - k, p.y + k); s.ctx.lineTo(p.x + k, p.y - k); s.ctx.stroke();
    },
    seg(s, a, c, b) {
      const x = s.ctx, k = s.size * 0.3536, nx = k, ny = -k;
      const pts = [a].concat(flattenQuad(a, c, b, 1.5));
      lineStyle(x, s.color, 1);
      x.fillStyle = s.color;
      x.beginPath();
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        const quad = [[p.x + nx, p.y + ny], [q.x + nx, q.y + ny], [q.x - nx, q.y - ny], [p.x - nx, p.y - ny]];
        const cross = (q.x - p.x) * ny - (q.y - p.y) * nx;
        if (cross < 0) quad.reverse();
        x.moveTo(quad[0][0], quad[0][1]);
        for (let j = 1; j < 4; j++) x.lineTo(quad[j][0], quad[j][1]);
        x.closePath();
      }
      x.fill();
      x.stroke();
    },
    margin: (size) => size * 0.4 + 2,
  });

  // Airbrush: a fine spray that keeps building while you hold still.
  function spray(s, cx, cy, n) {
    const x = s.ctx, r = s.size / 2, d = s.size >= 40 ? 2 : 1;
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = s.color;
    let count = Math.floor(n);
    if (s.rng() < n - count) count++;
    for (let i = 0; i < count; i++) {
      const rr = r * Math.sqrt(s.rng()), an = s.rng() * TAU;
      x.fillRect(Math.floor(cx + Math.cos(an) * rr), Math.floor(cy + Math.sin(an) * rr), d, d);
    }
  }
  brush('airbrush', 'Airbrush', [10, 18, 28, 40, 56], {
    continuous: true,
    spacing: (s) => Math.max(1, s.size * 0.18),
    stamp(s, x, y) { spray(s, x, y, s.size * 0.35); },
    tick(s, dt) { spray(s, s.pos.x, s.pos.y, s.size * s.size * 0.0032 * dt); },
    margin: (size) => size / 2 + 3,
  });

  // Oil brush: bristles with their own shade and paint load; long strokes
  // run dry and leave streaks.
  brush('oil', 'Oil brush', [6, 10, 16, 24, 36], {
    begin(s) {
      const n = clamp(Math.round(s.size * 0.75), 5, 26);
      s.s.bristles = [];
      for (let i = 0; i < n; i++) {
        const r = (s.size / 2) * Math.sqrt(s.rng()), a = s.rng() * TAU;
        s.s.bristles.push({
          ox: Math.cos(a) * r, oy: Math.sin(a) * r,
          color: shade(s.color, (s.rng() - 0.5) * 0.34),
          dry: mix(shade(s.color, (s.rng() - 0.5) * 0.3), '#ffffff', 0.35),
          w: Math.max(1.5, (s.size / n) * 3.4 * (0.6 + s.rng() * 0.8)),
          load: 0.75 + s.rng() * 0.7,
        });
      }
    },
    dot(s, p) {
      s.s.bristles.forEach((b) => disc(s.ctx, { x: p.x + b.ox, y: p.y + b.oy }, b.w / 2, b.color));
    },
    seg(s, a, c, b) {
      const x = s.ctx, len = dist(a, c) + dist(c, b);
      x.globalCompositeOperation = 'source-over';
      x.globalAlpha = 1;
      x.lineCap = 'butt';
      x.lineJoin = 'round';
      for (const br of s.s.bristles) {
        br.load -= len * 0.0011 * (0.4 + s.rng());
        if (br.load <= 0 && s.rng() > 0.08) continue;
        x.strokeStyle = br.load > 0.25 ? br.color : br.dry;
        x.lineWidth = br.w;
        x.beginPath();
        x.moveTo(a.x + br.ox, a.y + br.oy);
        x.quadraticCurveTo(c.x + br.ox, c.y + br.oy, b.x + br.ox, b.y + br.oy);
        x.stroke();
      }
    },
    margin: (size) => size / 2 + 4,
  });

  // Crayon and natural pencil: strokes masked by paper tooth.
  function texturedBrush(kind, alpha) {
    return {
      dot(s, p) {
        const r = s.size / 2;
        textured(s.ctx, { x0: p.x - r - 1, y0: p.y - r - 1, x1: p.x + r + 1, y1: p.y + r + 1 }, kind, (x) => disc(x, p, r, s.color), alpha);
      },
      seg(s, a, c, b) {
        textured(s.ctx, quadBox(a, c, b, s.size / 2 + 2), kind, (x) => { lineStyle(x, s.color, s.size, 'butt'); strokeQuad(x, a, c, b); }, alpha);
      },
      end(s) {
        if (s.pts.length < 2) return;
        const p = s.pts[s.pts.length - 1], r = s.size / 2;
        textured(s.ctx, { x0: p.x - r - 1, y0: p.y - r - 1, x1: p.x + r + 1, y1: p.y + r + 1 }, kind, (x) => disc(x, p, r, s.color), alpha);
      },
    };
  }
  brush('crayon', 'Crayon', [4, 8, 12, 18, 26], texturedBrush('crayon', 1));

  // Marker: translucent ink laid down as one sheet per stroke, so a stroke
  // never darkens itself, but crossing strokes do.
  brush('marker', 'Marker', [6, 10, 15, 22, 32], {
    layered: { alpha: 0.62, composite: 'multiply' },
    dot(s, p) { disc(s.ctx, p, s.size / 2, s.color); },
    seg(s, a, c, b) { lineStyle(s.ctx, s.color, s.size); strokeQuad(s.ctx, a, c, b); },
  });

  brush('pencil', 'Natural pencil', [1.5, 2.5, 4, 6, 9], Object.assign(texturedBrush('pencil', 0.9), { margin: (size) => size / 2 + 3 }));

  // Watercolor: painted as a wet sheet; when you lift the brush it dries with
  // a pigment rim, soft bleed and paper granulation.
  brush('watercolor', 'Watercolor brush', [8, 14, 22, 32, 46], {
    layered: { alpha: 0.64, composite: 'multiply', live: 0.5 },
    dot(s, p) { disc(s.ctx, p, s.size / 2, s.color); },
    seg(s, a, c, b) { lineStyle(s.ctx, s.color, s.size); strokeQuad(s.ctx, a, c, b); },
    finish(s) { watercolorize(s.layer, s.bounds, s.color); },
    margin: (size) => size / 2 + 6,
  });

  // Bubble brush: glossy soap bubbles of every size.
  brush('bubbles', 'Bubble brush', [10, 16, 24, 36, 52], {
    spacing: (s) => s.size * (0.5 + s.rng() * 0.8),
    stamp(s, x, y) {
      const r = (s.size / 2) * (0.45 + s.rng() * 0.85);
      drawBubble(s.ctx, x + (s.rng() - 0.5) * s.size * 0.6, y + (s.rng() - 0.5) * s.size * 0.6, r, s.color, s.rng);
      s.sound('bubble');
    },
    margin: (size) => size * 1.2 + 2,
  });

  // Rainbow brush: the hue flows along the stroke.
  const hueColor = (hh) => `hsl(${hh.toFixed(1)},92%,56%)`;
  brush('rainbow', 'Rainbow brush', [3, 6, 10, 16, 26], {
    begin(s) { s.s.hue = Math.floor(s.rng() * 360); },
    dot(s, p) { disc(s.ctx, p, s.size / 2, hueColor(s.s.hue)); },
    seg(s, a, c, b) {
      const x = s.ctx, pts = [a].concat(flattenQuad(a, c, b, 3));
      lineStyle(x, '#000', s.size);
      for (let i = 1; i < pts.length; i++) {
        s.s.hue = (s.s.hue + dist(pts[i - 1], pts[i]) * 1.3) % 360;
        x.strokeStyle = hueColor(s.s.hue);
        x.beginPath();
        x.moveTo(pts[i - 1].x, pts[i - 1].y);
        x.lineTo(pts[i].x, pts[i].y);
        x.stroke();
      }
    },
  });

  // Sparkle brush: twinkles, halos and a little glitter.
  brush('sparkle', 'Sparkle brush', [8, 12, 18, 26, 36], {
    spacing: (s) => s.size * (0.55 + s.rng() * 0.9),
    stamp(s, x, y) {
      const R = s.size * (0.35 + s.rng() * 0.7);
      const cx = x + (s.rng() - 0.5) * s.size * 0.9, cy = y + (s.rng() - 0.5) * s.size * 0.9;
      drawSparkle(s.ctx, cx, cy, R, s.color, s.rng() * 0.6 - 0.3);
      const c = s.ctx;
      c.save();
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      const dots = 1 + Math.floor(s.rng() * 3);
      for (let i = 0; i < dots; i++) {
        c.fillStyle = s.rng() < 0.5 ? '#ffffff' : lighten(s.color, 0.3);
        c.beginPath();
        c.arc(x + (s.rng() - 0.5) * s.size * 1.6, y + (s.rng() - 0.5) * s.size * 1.6, 0.6 + s.rng() * Math.max(0.8, s.size * 0.06), 0, TAU);
        c.fill();
      }
      c.restore();
      s.sound('twinkle');
    },
    margin: (size) => size * 1.7 + 2,
  });

  // Glass gel brush: a glossy tube of gel lit from the top left. The whole
  // stroke is redrawn on its own layer so highlights stay continuous.
  function smoothPath(pts) {
    const p = new Path2D();
    const n = pts.length;
    if (!n) return p;
    p.moveTo(pts[0].x, pts[0].y);
    if (n === 1) { p.lineTo(pts[0].x + 0.01, pts[0].y); return p; }
    for (let i = 1; i < n - 1; i++) {
      const m = mid(pts[i], pts[i + 1]);
      p.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
    }
    p.lineTo(pts[n - 1].x, pts[n - 1].y);
    return p;
  }
  brush('gel', 'Glass gel brush', [6, 10, 16, 24, 34], {
    layered: { alpha: 1, composite: 'source-over' },
    redraw(s) {
      const x = s.layer, b = s.bounds;
      if (!b) return;
      x.save();
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(Math.floor(b.x0) - 2, Math.floor(b.y0) - 2, Math.ceil(b.x1 - b.x0) + 4, Math.ceil(b.y1 - b.y0) + 4);
      const path = smoothPath(s.pts), w = s.size, col = s.color;
      x.lineCap = 'round';
      x.lineJoin = 'round';
      x.globalCompositeOperation = 'source-over';
      const pass = (style, lw, dx, dy) => {
        x.setTransform(1, 0, 0, 1, dx, dy);
        x.strokeStyle = style;
        x.lineWidth = lw;
        x.stroke(path);
      };
      pass('rgba(11,42,74,0.16)', w * 1.06, w * 0.06, w * 0.13);
      pass(darken(col, 0.38), w, 0, 0);
      pass(col, w * 0.78, 0, 0);
      pass(rgba(lighten(col, 0.5), 0.8), w * 0.4, w * 0.04, w * 0.16);
      pass('rgba(255,255,255,0.6)', w * 0.32, -w * 0.1, -w * 0.15);
      pass('rgba(255,255,255,0.92)', Math.max(1, w * 0.1), -w * 0.13, -w * 0.2);
      x.restore();
    },
    margin: (size) => size * 0.7 + 3,
  });

  // Internal tools: the pixel pencil, the eraser and the color eraser.
  function square(s, x, y) {
    const n = Math.max(1, Math.round(s.size)), o = Math.floor(n / 2);
    s.ctx.fillRect(x - o, y - o, n, n);
  }
  const pixelTool = {
    raw: true,
    begin(s) { s.ctx.globalAlpha = 1; s.ctx.globalCompositeOperation = 'source-over'; },
    dot(s, p) { s.ctx.fillStyle = s.color; square(s, p.x, p.y); },
    rawSeg(s, p, q) { s.ctx.fillStyle = s.color; bresenham(p.x, p.y, q.x, q.y, (x, y) => square(s, x, y)); },
    margin: (size) => size / 2 + 2,
  };
  brush('pixel', 'Pencil', [1, 2, 3, 5, 8], pixelTool, true);
  brush('eraser', 'Eraser', [4, 8, 14, 22, 34], pixelTool, true);
  // Right-drag eraser: swaps Color 1 for Color 2 only where it touches.
  function recolor(s, pts) {
    const n = Math.max(1, Math.round(s.size)), o = Math.floor(n / 2);
    const W = s.ctx.canvas.width, H = s.ctx.canvas.height;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach((p) => { x0 = Math.min(x0, p[0] - o); y0 = Math.min(y0, p[1] - o); x1 = Math.max(x1, p[0] - o + n); y1 = Math.max(y1, p[1] - o + n); });
    x0 = clamp(x0, 0, W); y0 = clamp(y0, 0, H); x1 = clamp(x1, 0, W); y1 = clamp(y1, 0, H);
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const img = readback(s.ctx.canvas, x0, y0, w, h, 'recolor'), d = img.data;
    const from = parse(s.color), to = parse(s.color2), tol = 48;
    const seen = new Uint8Array(w * h);
    pts.forEach((p) => {
      const sx = clamp(p[0] - o - x0, 0, w), sy = clamp(p[1] - o - y0, 0, h), ex = clamp(p[0] - o + n - x0, 0, w), ey = clamp(p[1] - o + n - y0, 0, h);
      for (let y = sy; y < ey; y++) {
        for (let x = sx; x < ex; x++) {
          const k = y * w + x;
          if (seen[k]) continue;
          seen[k] = 1;
          const i = k * 4;
          if (Math.abs(d[i] - from.r) <= tol && Math.abs(d[i + 1] - from.g) <= tol && Math.abs(d[i + 2] - from.b) <= tol) {
            d[i] = to.r; d[i + 1] = to.g; d[i + 2] = to.b; d[i + 3] = 255;
          }
        }
      }
    });
    s.ctx.putImageData(img, x0, y0);
  }
  brush('recolor', 'Color eraser', [4, 8, 14, 22, 34], {
    raw: true,
    dot(s, p) { recolor(s, [[p.x, p.y]]); },
    rawSeg(s, p, q) { const pts = []; bresenham(p.x, p.y, q.x, q.y, (x, y) => pts.push([x, y])); recolor(s, pts); },
    margin: (size) => size / 2 + 2,
  }, true);

  // Renders a sample stroke for the brush gallery (sizes and coordinates in
  // canvas pixels, so callers pre-multiply by devicePixelRatio).
  function preview(cv, id, color, size) {
    const def = BRUSHES[id];
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    let layer = null;
    if (def.layered) layer = canvas(W, H).getContext('2d');
    const s = new Stroke(def, { target: ctx, layer, color, color2: '#ffffff', size, rng: A.util.seeded(id.length * 97 + 13) });
    const pad = size * 0.8 + 4;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      s.add(pad + t * (W - pad * 2), H / 2 + Math.sin(t * TAU) * (H / 2 - pad) * 0.8);
      if (def.continuous && i % 2 === 0) s.tick(16);
    }
    s.end();
    if (layer) {
      ctx.save();
      ctx.globalAlpha = def.layered.alpha;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------ shapes
  const SHAPES = [
    ['line', 'Line', 'line'], ['curve', 'Curve', 'curve'], ['oval', 'Oval'], ['rect', 'Rectangle'], ['roundrect', 'Rounded rectangle'],
    ['polygon', 'Polygon', 'poly'], ['triangle', 'Triangle'], ['righttri', 'Right triangle'], ['diamond', 'Diamond'], ['pentagon', 'Pentagon'],
    ['hexagon', 'Hexagon'], ['arrowR', 'Right arrow'], ['arrowL', 'Left arrow'], ['arrowU', 'Up arrow'], ['arrowD', 'Down arrow'],
    ['star4', 'Four-point star'], ['star5', 'Five-point star'], ['star6', 'Six-point star'], ['callRound', 'Rounded rectangular callout'],
    ['callOval', 'Oval callout'], ['callCloud', 'Cloud callout'], ['heart', 'Heart'], ['lightning', 'Lightning'], ['cloud', 'Cloud'],
  ].map(([id, name, kind]) => ({ id, name, kind: kind || 'box' }));
  const SHAPE = {};
  SHAPES.forEach((s) => (SHAPE[s.id] = s));

  function normalize(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    return pts.map(([x, y]) => [(x - x0) / (x1 - x0 || 1), (y - y0) / (y1 - y0 || 1)]);
  }
  function regular(n) {
    const out = [];
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * TAU) / n; out.push([Math.cos(a), Math.sin(a)]); }
    return normalize(out);
  }
  function starPts(n, inner) {
    const out = [];
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? inner : 1; out.push([Math.cos(a) * r, Math.sin(a) * r]); }
    return normalize(out);
  }
  const ARROW = [[0, 0.27], [0.56, 0.27], [0.56, 0], [1, 0.5], [0.56, 1], [0.56, 0.73], [0, 0.73]];
  const UNIT = {
    triangle: [[0.5, 0], [1, 1], [0, 1]],
    righttri: [[0, 0], [1, 1], [0, 1]],
    diamond: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
    pentagon: regular(5),
    hexagon: [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]],
    arrowR: ARROW,
    arrowL: ARROW.map(([x, y]) => [1 - x, y]),
    arrowU: ARROW.map(([x, y]) => [y, 1 - x]),
    arrowD: ARROW.map(([x, y]) => [1 - y, x]),
    star4: starPts(4, 0.36),
    star5: starPts(5, 0.382),
    star6: starPts(6, 0.56),
    lightning: [[0.4, 0], [0.8, 0], [0.56, 0.36], [0.86, 0.36], [0.24, 1], [0.44, 0.54], [0.14, 0.54]],
  };
  const f = (n) => Math.round(n * 100) / 100;
  function polyD(unit, x, y, w, h) {
    return unit.map(([u, v], i) => (i ? 'L' : 'M') + f(x + u * w) + ' ' + f(y + v * h)).join(' ') + ' Z';
  }
  function roundRectD(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    return `M${f(x + r)} ${f(y)} H${f(x + w - r)} A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)} V${f(y + h - r)} A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)} H${f(x + r)} A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)} V${f(y + r)} A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)} Z`;
  }
  function ellipseD(cx, cy, rx, ry) {
    rx = Math.max(rx, 0.01); ry = Math.max(ry, 0.01);
    return `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;
  }
  const CLOUD_R = [1, 0.92, 1.04, 0.96, 1.02, 0.9, 0.98, 0.94, 1.03];
  function cloudD(x, y, w, h) {
    const n = CLOUD_R.length, cx = x + w / 2, cy = y + h * 0.53, rx = w * 0.36, ry = h * 0.3;
    const pts = CLOUD_R.map((k, i) => {
      const a = -Math.PI / 2 + (i * TAU) / n + 0.18;
      return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
    });
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const r = Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.56;
      d += ` A${f(r)} ${f(r)} 0 0 1 ${f(q[0])} ${f(q[1])}`;
    }
    return d + ' Z';
  }
  function shapeD(sp) {
    const kind = (SHAPE[sp.id] || {}).kind;
    if (kind === 'line') {
      if (!sp.pts || sp.pts.length < 2) return null;
      return `M${f(sp.pts[0].x)} ${f(sp.pts[0].y)} L${f(sp.pts[1].x)} ${f(sp.pts[1].y)}`;
    }
    if (kind === 'curve') {
      const p = sp.pts || [];
      if (p.length < 2) return null;
      const a = p[0], d = p[p.length - 1];
      const b = p.length >= 4 ? p[1] : a, c = p.length >= 4 ? p[2] : d;
      return `M${f(a.x)} ${f(a.y)} C${f(b.x)} ${f(b.y)} ${f(c.x)} ${f(c.y)} ${f(d.x)} ${f(d.y)}`;
    }
    if (kind === 'poly') {
      if (!sp.pts || sp.pts.length < 2) return null;
      return sp.pts.map((p, i) => (i ? 'L' : 'M') + f(p.x) + ' ' + f(p.y)).join(' ') + (sp.open ? '' : ' Z');
    }
    const x = Math.min(sp.x0, sp.x1), y = Math.min(sp.y0, sp.y1), w = Math.abs(sp.x1 - sp.x0), h = Math.abs(sp.y1 - sp.y0);
    switch (sp.id) {
      case 'rect': return `M${f(x)} ${f(y)} H${f(x + w)} V${f(y + h)} H${f(x)} Z`;
      case 'roundrect': return roundRectD(x, y, w, h, Math.min(w, h) * 0.2);
      case 'oval': return ellipseD(x + w / 2, y + h / 2, w / 2, h / 2);
      case 'righttri': {
        let u = UNIT.righttri;
        if (sp.x1 < sp.x0) u = u.map(([a, b]) => [1 - a, b]);
        if (sp.y1 < sp.y0) u = u.map(([a, b]) => [a, 1 - b]);
        return polyD(u, x, y, w, h);
      }
      case 'heart': {
        const P = (u, v) => f(x + u * w) + ' ' + f(y + v * h);
        return `M${P(0.5, 0.3)} C${P(0.5, 0.12)} ${P(0.36, 0.02)} ${P(0.24, 0.02)} C${P(0.1, 0.02)} ${P(0, 0.14)} ${P(0, 0.3)} C${P(0, 0.56)} ${P(0.3, 0.76)} ${P(0.5, 1)} C${P(0.7, 0.76)} ${P(1, 0.56)} ${P(1, 0.3)} C${P(1, 0.14)} ${P(0.9, 0.02)} ${P(0.76, 0.02)} C${P(0.64, 0.02)} ${P(0.5, 0.12)} ${P(0.5, 0.3)} Z`;
      }
      case 'callRound': {
        const bh = h * 0.76, r = Math.max(0, Math.min(w, bh) * 0.2);
        const P = (px, py) => f(px) + ' ' + f(py);
        return `M${P(x + r, y)} H${f(x + w - r)} A${f(r)} ${f(r)} 0 0 1 ${P(x + w, y + r)} V${f(y + bh - r)} A${f(r)} ${f(r)} 0 0 1 ${P(x + w - r, y + bh)} H${f(x + w * 0.4)} L${P(x + w * 0.13, y + h)} L${P(x + w * 0.24, y + bh)} H${f(x + r)} A${f(r)} ${f(r)} 0 0 1 ${P(x, y + bh - r)} V${f(y + r)} A${f(r)} ${f(r)} 0 0 1 ${P(x + r, y)} Z`;
      }
      case 'callOval': {
        const bh = h * 0.8, cx = x + w / 2, cy = y + bh / 2, rx = Math.max(w / 2, 0.01), ry = Math.max(bh / 2, 0.01);
        const at = (deg) => { const a = (deg * Math.PI) / 180; return f(cx + Math.cos(a) * rx) + ' ' + f(cy + Math.sin(a) * ry); };
        return `M${at(128)} A${f(rx)} ${f(ry)} 0 1 1 ${at(104)} L${f(x + w * 0.16)} ${f(y + h)} Z`;
      }
      case 'cloud': return cloudD(x, y, w, h);
      case 'callCloud': {
        const s = Math.min(w, h);
        return cloudD(x, y, w, h * 0.8) + ' ' + ellipseD(x + w * 0.24, y + h * 0.84, s * 0.07, s * 0.05) + ' ' + ellipseD(x + w * 0.13, y + h * 0.95, s * 0.042, s * 0.03);
      }
      default:
        if (UNIT[sp.id]) return polyD(UNIT[sp.id], x, y, w, h);
        return null;
    }
  }
  function shapeBox(sp) {
    const kind = (SHAPE[sp.id] || {}).kind;
    if (kind === 'line' || kind === 'curve' || kind === 'poly') {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      (sp.pts || []).forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
      return { x0, y0, x1, y1 };
    }
    return { x0: Math.min(sp.x0, sp.x1), y0: Math.min(sp.y0, sp.y1), x1: Math.max(sp.x0, sp.x1), y1: Math.max(sp.y0, sp.y1) };
  }

  // Gel fill: highlight, lighter mid, saturated body with a hard gloss line,
  // a caustic bloom from the base and a white shine across the top.
  function gelFill(ctx, path, box, color) {
    const x0 = box.x0, y0 = box.y0, w = Math.max(1, box.x1 - box.x0), h = Math.max(1, box.y1 - box.y0), cx = x0 + w / 2;
    ctx.save();
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, lighten(color, 0.62));
    g.addColorStop(0.5, lighten(color, 0.28));
    g.addColorStop(0.5, color);
    g.addColorStop(1, darken(color, 0.1));
    ctx.fillStyle = g;
    ctx.fill(path);
    ctx.clip(path);
    const cg = ctx.createRadialGradient(cx, y0 + h * 1.08, 0, cx, y0 + h * 1.08, Math.max(w, h) * 0.62);
    cg.addColorStop(0, 'rgba(255,255,255,0.7)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(x0, y0, w, h);
    const sg = ctx.createLinearGradient(0, y0, 0, y0 + h * 0.48);
    sg.addColorStop(0, 'rgba(255,255,255,0.92)');
    sg.addColorStop(1, 'rgba(255,255,255,0.1)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(cx, y0 + h * 0.25, w * 0.42, h * 0.23, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Draws a shape spec: { id, x0, y0, x1, y1 | pts, outline, fill, strokeColor, fillColor, width }.
  // Returns the dirty box in document pixels.
  function renderShape(ctx, sp) {
    const d = shapeD(sp);
    if (!d) return null;
    const path = new Path2D(d);
    const kind = (SHAPE[sp.id] || {}).kind;
    const closed = kind !== 'line' && kind !== 'curve' && !sp.open;
    const lw = Math.max(1, sp.width || 1);
    const box = shapeBox(sp);
    const m = lw + 4 + Math.max(box.x1 - box.x0, box.y1 - box.y0) * 0.04;
    const dirty = { x0: box.x0 - m, y0: box.y0 - m, x1: box.x1 + m, y1: box.y1 + m };
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const fillStyle = closed ? sp.fill || 'none' : 'none';
    const fc = sp.fillColor || '#ffffff', sc = sp.strokeColor || '#000000';
    const fillOp = (x) => { x.fillStyle = fc; x.fill(path); };
    if (fillStyle === 'solid') fillOp(ctx);
    else if (fillStyle === 'glass') gelFill(ctx, path, box, fc);
    else if (fillStyle === 'crayon') textured(ctx, dirty, 'crayon', fillOp, 1);
    else if (fillStyle === 'marker') textured(ctx, dirty, null, fillOp, 0.62, 'multiply');
    else if (fillStyle === 'watercolor') wcShape(ctx, dirty, fc, fillOp);
    let outline = sp.outline || 'solid';
    if (!closed && outline === 'none') outline = 'solid';
    const strokeOp = (x) => { x.strokeStyle = sc; x.lineWidth = lw; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke(path); };
    if (outline === 'solid') strokeOp(ctx);
    else if (outline === 'crayon') textured(ctx, dirty, 'crayon', (x) => { strokeOp(x); if (lw < 4) { x.lineWidth = lw + 1; x.stroke(path); } }, 1);
    else if (outline === 'marker') textured(ctx, dirty, null, strokeOp, 0.62, 'multiply');
    else if (outline === 'watercolor') wcShape(ctx, dirty, sc, strokeOp);
    ctx.restore();
    return dirty;
  }
  function wcShape(ctx, box, color, draw) {
    const x0 = Math.floor(box.x0), y0 = Math.floor(box.y0), w = Math.ceil(box.x1 - box.x0) + 2, h = Math.ceil(box.y1 - box.y0) + 2;
    if (w <= 0 || h <= 0) return;
    const c = canvas(w, h), x = c.getContext('2d');
    x.translate(-x0, -y0);
    draw(x);
    x.setTransform(1, 0, 0, 1, 0, 0);
    watercolorize(x, { x0: 0, y0: 0, x1: w, y1: h }, color);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(c, x0, y0);
    ctx.restore();
  }

  // ------------------------------------------------------------------ flood fill
  // Scanline fill with a per-channel tolerance, then a one-pixel pass that
  // re-tints anti-aliased edge pixels so fills sit snugly against strokes.
  function floodFill(img, sx, sy, color, tol) {
    const W = img.width, H = img.height, d = img.data;
    sx = Math.floor(sx); sy = Math.floor(sy);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return null;
    const F = parse(color);
    const i0 = (sy * W + sx) * 4;
    const r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2], a0 = d[i0 + 3];
    if (r0 === F.r && g0 === F.g && b0 === F.b && a0 === 255) return null;
    tol = tol == null ? 40 : tol;
    const mask = new Uint8Array(W * H);
    const match = (k) => {
      const i = k * 4;
      return Math.abs(d[i] - r0) <= tol && Math.abs(d[i + 1] - g0) <= tol && Math.abs(d[i + 2] - b0) <= tol && Math.abs(d[i + 3] - a0) <= tol;
    };
    let bx0 = sx, by0 = sy, bx1 = sx, by1 = sy;
    const stack = [sx, sy];
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      let xl = x;
      const row = y * W;
      if (mask[row + x] || !match(row + x)) continue;
      while (xl > 0 && !mask[row + xl - 1] && match(row + xl - 1)) xl--;
      let up = false, down = false;
      for (let xx = xl; xx < W && !mask[row + xx] && match(row + xx); xx++) {
        mask[row + xx] = 1;
        if (xx < bx0) bx0 = xx;
        if (xx > bx1) bx1 = xx;
        if (y > 0) {
          const k = row - W + xx, m = !mask[k] && match(k);
          if (m && !up) { stack.push(xx, y - 1); up = true; } else if (!m) up = false;
        }
        if (y < H - 1) {
          const k = row + W + xx, m = !mask[k] && match(k);
          if (m && !down) { stack.push(xx, y + 1); down = true; } else if (!m) down = false;
        }
      }
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
    }
    // Edge pass: for anti-aliased pixels bordering the region, estimate how
    // much of the old background shows through and swap it for the new color.
    const rx0 = Math.max(0, bx0 - 1), ry0 = Math.max(0, by0 - 1), rx1 = Math.min(W - 1, bx1 + 1), ry1 = Math.min(H - 1, by1 + 1);
    const edits = [];
    const dS = (i) => Math.hypot(d[i] - r0, d[i + 1] - g0, d[i + 2] - b0);
    for (let y = ry0; y <= ry1; y++) {
      for (let x = rx0; x <= rx1; x++) {
        const k = y * W + x;
        if (mask[k]) continue;
        const nb = (x > 0 && mask[k - 1] === 1) || (x < W - 1 && mask[k + 1] === 1) || (y > 0 && mask[k - W] === 1) || (y < H - 1 && mask[k + W] === 1);
        if (!nb) continue;
        const i = k * 4, dp = dS(i);
        let far = dp;
        for (let yy = Math.max(0, y - 1); yy <= Math.min(H - 1, y + 1); yy++) {
          for (let xx = Math.max(0, x - 1); xx <= Math.min(W - 1, x + 1); xx++) {
            const kk = yy * W + xx;
            if (!mask[kk]) far = Math.max(far, dS(kk * 4));
          }
        }
        if (far < 1) continue;
        const t = clamp(1 - dp / far, 0, 1);
        if (t > 0.04) edits.push(i, t);
      }
    }
    for (let j = 0; j < edits.length; j += 2) {
      const i = edits[j], t = edits[j + 1];
      d[i] = clamp(d[i] + t * (F.r - r0), 0, 255);
      d[i + 1] = clamp(d[i + 1] + t * (F.g - g0), 0, 255);
      d[i + 2] = clamp(d[i + 2] + t * (F.b - b0), 0, 255);
    }
    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        const k = y * W + x;
        if (mask[k] !== 1) continue;
        const i = k * 4;
        d[i] = F.r; d[i + 1] = F.g; d[i + 2] = F.b; d[i + 3] = 255;
      }
    }
    return { x0: rx0, y0: ry0, x1: rx1 + 1, y1: ry1 + 1 };
  }

  // Makes pixels close to `color` transparent (transparent selections).
  function keyOut(cv, color, tol) {
    const x = cv.getContext('2d');
    const img = x.getImageData(0, 0, cv.width, cv.height), d = img.data, k = parse(color);
    tol = tol == null ? 24 : tol;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - k.r) <= tol && Math.abs(d[i + 1] - k.g) <= tol && Math.abs(d[i + 2] - k.b) <= tol) d[i + 3] = 0;
    }
    x.putImageData(img, 0, 0);
  }
  function invert(cv, x0, y0, w, h) {
    const x = cv.getContext('2d');
    x0 = x0 || 0; y0 = y0 || 0; w = w || cv.width; h = h || cv.height;
    const img = x.getImageData(x0, y0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
    x.putImageData(img, x0, y0);
  }

  // ------------------------------------------------------------------ stickers
  // Sticker sprites from the glossy icon set. "diecut" adds a white die-cut
  // border and a soft lift shadow (and drops the icon's floor shadow).
  const spriteCache = new Map();
  function stickerSprite(img, key, size, style, hasFloor) {
    size = Math.round(size);
    const ck = key + '|' + size + '|' + style;
    if (spriteCache.has(ck)) return spriteCache.get(ck);
    const pad = style === 'diecut' ? Math.ceil(size * 0.1) + 3 : 2;
    const S = size + pad * 2;
    const base = canvas(S, S), b = base.getContext('2d');
    b.drawImage(img, pad, pad, size, size);
    let out = base;
    if (style === 'diecut') {
      if (hasFloor) {
        const top = Math.floor(pad + size * 0.86);
        if (top < S) {
          const band = b.getImageData(0, top, S, S - top), d = band.data;
          for (let i = 3; i < d.length; i += 4) if (d[i] < 92) d[i] = 0;
          b.putImageData(band, 0, top);
        }
      }
      const border = Math.max(2, size * 0.045);
      const sil = canvas(S, S), sx = sil.getContext('2d');
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        sx.drawImage(base, Math.cos(a) * border, Math.sin(a) * border);
      }
      sx.drawImage(base, 0, 0);
      sx.globalCompositeOperation = 'source-in';
      sx.fillStyle = '#ffffff';
      sx.fillRect(0, 0, S, S);
      out = canvas(S, S);
      const o = out.getContext('2d');
      o.shadowColor = 'rgba(11,42,74,0.32)';
      o.shadowBlur = border * 1.8;
      o.shadowOffsetY = border * 0.7;
      o.drawImage(sil, 0, 0);
      o.shadowColor = 'transparent';
      o.drawImage(base, 0, 0);
    }
    if (spriteCache.size > 80) spriteCache.delete(spriteCache.keys().next().value);
    spriteCache.set(ck, out);
    return out;
  }

  A.paintBrushes = {
    color: { parse, hex, rgba, mix, lighten, darken, shade, hsl, toHsl, luma },
    BRUSHES,
    ORDER,
    SHAPES,
    SHAPE,
    start(id, o) { return new Stroke(BRUSHES[id] || BRUSHES.brush, o); },
    preview,
    shapeD,
    shapeBox,
    renderShape,
    floodFill,
    keyOut,
    invert,
    bresenham,
    drawBubble,
    drawSparkle,
    stickerSprite,
    texture,
    canvas,
    readback,
  };
})();
