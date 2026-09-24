/* Aerium screensavers: Bubbles, Ribbons, Aurora, Glass Shapes, 3D Text,
   Photos, Aquarium and Aerium Energy. Each one registers with the host in
   src/shell/screensaver.js and draws into the element it is handed: the whole
   screen, or the little monitor in Personalization (preview). */
(function () {
  'use strict';
  const A = window.Aerium;
  if (!A || !A.screensaver) return;
  const { h } = A.util;

  // ============================================================ helpers
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const fract = (x) => x - Math.floor(x);
  // Screensavers are all motion, so reduced motion slows them rather than stopping them.
  const MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.55 : 1;

  function canvas(w, hh) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(hh));
    return c;
  }
  function fitCanvas(c, w, hh, scale) {
    const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(hh * scale));
    if (c.width !== cw) c.width = cw;
    if (c.height !== ch) c.height = ch;
  }
  function hasAsset(key) { return !!(A.ASSET_SVG && A.ASSET_SVG[key]); }

  // Converts HSL (degrees, 0..1, 0..1) to [r, g, b] in 0..255.
  function hsl(hh, s, l) {
    hh = (((hh % 360) + 360) % 360) / 30;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => { const k = (n + hh) % 12; return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
    return [f(0), f(8), f(4)];
  }
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  // Smooth 1D value noise in 0..1.
  function noise1(seed) {
    const r = A.util.seeded(seed);
    const v = new Float32Array(256);
    for (let i = 0; i < 256; i++) v[i] = r();
    return (x) => {
      const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
      const a = v[i & 255];
      return a + (v[(i + 1) & 255] - a) * u;
    };
  }
  // 2D gradient noise, roughly -0.7..0.7.
  function noise2(seed) {
    const r = A.util.seeded(seed);
    const base = [];
    for (let i = 0; i < 256; i++) base.push(i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = base[i]; base[i] = base[j]; base[j] = t; }
    const p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    const gx = new Float32Array(8), gy = new Float32Array(8);
    for (let i = 0; i < 8; i++) { gx[i] = Math.cos(i * TAU / 8); gy[i] = Math.sin(i * TAU / 8); }
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const X = xi & 255, Y = yi & 255;
      const k00 = p[X + p[Y]] & 7, k10 = p[X + 1 + p[Y]] & 7, k01 = p[X + p[Y + 1]] & 7, k11 = p[X + 1 + p[Y + 1]] & 7;
      const n00 = gx[k00] * xf + gy[k00] * yf, n10 = gx[k10] * (xf - 1) + gy[k10] * yf;
      const n01 = gx[k01] * xf + gy[k01] * (yf - 1), n11 = gx[k11] * (xf - 1) + gy[k11] * (yf - 1);
      const u = fade(xf), v = fade(yf);
      return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
    };
  }

  // Soft glow for additive scenes drawn on opaque black: each frame the scene
  // is copied (on the GPU) into a half-size canvas that the compositor blurs
  // and screens on top with a CSS filter. Nothing is ever read back from the
  // GPU, so it stays cheap. degrade() hides it on machines that struggle.
  function makeGlow(root, opacity, spread) {
    const c = h('canvas.ss-layer.ss-glow');
    c.style.opacity = opacity;
    root.appendChild(c);
    const x = c.getContext('2d', { alpha: false });
    let on = true;
    return {
      resize(S) {
        // keep it large enough to stay GPU-backed alongside the main canvas
        fitCanvas(c, S.w, S.h, S.preview ? S.sx : Math.max(0.4, S.sx * 0.5));
        c.style.filter = `blur(${Math.max(1.2, S.s * (spread || 0.011)).toFixed(1)}px)`;
      },
      run(src) {
        if (!on) return;
        x.globalCompositeOperation = 'copy';
        x.drawImage(src, 0, 0, c.width, c.height);
      },
      off() { on = false; c.style.display = 'none'; },
    };
  }

  // Puts a positioned, clipped root into the container (the full-screen host
  // or the Personalization monitor) and returns it.
  function mount(container, cls) {
    try { if (getComputedStyle(container).position === 'static') container.style.position = 'relative'; } catch (e) { /* ignore */ }
    const root = h('div.ss-root' + (cls ? '.' + cls : ''), { 'aria-hidden': 'true' });
    container.appendChild(root);
    return root;
  }

  // Shared runner for canvas screensavers: sizing for devicePixelRatio, resize
  // handling, a steady requestAnimationFrame loop and adaptive quality (when
  // the machine can't keep up full screen, the canvas resolution steps down).
  //   spec: { cls, maxDpr, budget, alpha, minQuality, setup(S), resize(S), frame(S, dt, t), degrade(S), dispose(S) }
  function runScene(container, opts, spec) {
    const preview = !!(opts && opts.preview);
    const root = mount(container, spec.cls);
    const S = { root, preview, opts: opts || {}, w: 1, h: 1, dpr: 1, quality: 1, t: 0, layers: [] };
    // addLayer: extra canvases. scale is relative to the scene's dpr unless fixed.
    S.addLayer = (cls, o = {}) => {
      const c = h('canvas.ss-layer' + (cls ? '.' + cls : ''));
      root.appendChild(c);
      const L = { c, ctx: c.getContext('2d', { alpha: o.alpha !== false }), scale: o.scale || 1, fixed: !!o.fixed, scaleFn: o.scaleFn || null, sx: 1, sy: 1 };
      S.layers.push(L);
      return L;
    };
    const main = spec.noMain ? null : S.addLayer('ss-main', { alpha: spec.alpha !== false });
    if (main) { S.canvas = main.c; S.ctx = main.ctx; S.main = main; }

    let dirty = false;
    function fit() {
      let w = root.clientWidth, hh = root.clientHeight;
      if (!w || !hh) { w = S.opts.width || 320; hh = S.opts.height || 200; }
      const dev = window.devicePixelRatio || 1;
      let dpr = Math.min(dev, preview ? 2 : spec.maxDpr || 2);
      const budget = spec.budget || 4.2e6;
      if (!preview && w * hh * dpr * dpr > budget) dpr = Math.max(0.5, Math.sqrt(budget / (w * hh)));
      dpr *= S.quality;
      S.w = w; S.h = hh; S.dpr = dpr;
      S.s = Math.min(w, hh);
      for (const L of S.layers) {
        fitCanvas(L.c, w, hh, L.scaleFn ? L.scaleFn(S) : L.fixed ? L.scale : dpr * L.scale);
        L.sx = L.c.width / w; L.sy = L.c.height / hh;
      }
      if (main) { S.sx = main.sx; S.sy = main.sy; }
      if (spec.resize) spec.resize(S);
    }

    if (spec.setup) spec.setup(S);
    fit();

    const onResize = () => { dirty = true; };
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(root); }
    window.addEventListener('resize', onResize);

    let raf = 0, alive = true, last = performance.now();
    const perf = { ema: 16.7, slow: 0, n: 0 };
    function tick(now) {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      const raw = now - last;
      last = now;
      if (dirty) { dirty = false; fit(); }
      const dt = clamp(raw / 1000, 0, 0.05) * MOTION;
      S.t += dt;
      spec.frame(S, dt, S.t);
      // Adaptive quality, full screen only: sustained slow frames step the resolution down.
      if (!preview && S.quality > (spec.minQuality || 0.5) && ++perf.n > 90) {
        perf.ema += (Math.min(raw, 100) - perf.ema) * 0.05;
        if (perf.ema > 26) {
          if (++perf.slow > 50) {
            perf.slow = 0; perf.n = 0; perf.ema = 16.7;
            S.quality = Math.max(spec.minQuality || 0.5, S.quality * 0.8);
            if (spec.degrade) spec.degrade(S);
            dirty = true;
          }
        } else perf.slow = Math.max(0, perf.slow - 1);
      }
    }
    raf = requestAnimationFrame(tick);

    return {
      destroy() {
        if (!alive) return;
        alive = false;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        window.removeEventListener('resize', onResize);
        try { if (spec.dispose) spec.dispose(S); } catch (e) { /* ignore */ }
        root.remove();
      },
    };
  }

  // A picture of the desktop for previews of screensavers that normally float
  // over the live desktop: the current wallpaper and a sliver of taskbar.
  function desktopBackdrop(root) {
    let url = null;
    try {
      const def = A.theme.currentWallpaper && A.theme.currentWallpaper();
      if (def) {
        if (def.src) url = def.src;
        else if (def.asset && hasAsset(def.asset)) url = A.asset(def.asset);
        else if (typeof def.thumb === 'function') url = def.thumb();
        else if (typeof def.thumb === 'string' && hasAsset(def.thumb)) url = A.asset(def.thumb);
      }
    } catch (e) { url = null; }
    const desk = h('div.ss-desk');
    if (url) desk.style.backgroundImage = `url("${url}")`;
    root.appendChild(desk);
    root.appendChild(h('div.ss-desk-bar', null, h('span.ss-desk-orb')));
  }

  // ============================================================ soap film colors
  // Thin-film interference: the reflected spectrum of a soap film of each
  // thickness, integrated against the CIE observer, pushed a little more vivid.
  let FILM = null;
  function filmLUT() {
    if (FILM) return FILM;
    const g = (x, m, s1, s2) => { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
    const cx = (l) => 1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2);
    const cy = (l) => 0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1);
    const cz = (l) => 1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8);
    const toRGB = (x, y, z) => [3.2406 * x - 1.5372 * y - 0.4986 * z, -0.9689 * x + 1.8758 * y + 0.0415 * z, 0.0557 * x - 0.204 * y + 1.057 * z];
    let wx = 0, wy = 0, wz = 0;
    for (let l = 380; l <= 720; l += 4) { wx += cx(l); wy += cy(l); wz += cz(l); }
    const white = toRGB(wx, wy, wz);
    const out = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const d = 285 + i * 1.35; // film thickness in nm (second and third order colors)
      let x = 0, y = 0, z = 0;
      for (let l = 380; l <= 720; l += 4) {
        const s = Math.sin(TAU * 1.33 * d / l), R = s * s;
        x += cx(l) * R; y += cy(l) * R; z += cz(l) * R;
      }
      let rgb = toRGB(x, y, z).map((v, k) => Math.max(0, v / white[k]));
      const lum = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
      rgb = rgb.map((v) => Math.max(0, lum + (v - lum) * 1.45));
      const m = Math.max(1e-3, rgb[0], rgb[1], rgb[2]);
      const bright = 0.78 + 0.22 * Math.min(1, lum * 1.5);
      // a touch of pearl, so it reads as light on glass rather than paint
      for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.round(clamp(lerp(Math.pow(rgb[k] / m, 1 / 2.2) * bright, 1, 0.14), 0, 1) * 255);
    }
    FILM = out;
    return out;
  }
  // Palette lookup with a ping-pong wrap, so cycling never jumps.
  function filmColor(u) {
    const lut = filmLUT();
    let k = fract(u);
    k = k < 0.5 ? k * 2 : 2 - k * 2;
    const i = Math.round(k * 255) * 3;
    return [lut[i], lut[i + 1], lut[i + 2]];
  }

  // ============================================================ 1. Bubbles
  // Glass soap bubbles drifting over the live desktop. Every bubble is drawn
  // from cached sprites: a lit glass body (an environment reflection with a
  // soft studio light, a fresnel rim and the fainter inverted reflection from the
  // back wall), two swirling thin-film layers that turn independently, and a
  // soft caustic shadow on the desktop beneath.

  const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const WIN = norm3([-0.5, -0.62, 0.62]);                // toward the window: up, left, in front
  const WIN_R = norm3([WIN[2], 0, -WIN[0]]);             // window's horizontal axis
  const WIN_V = [WIN_R[1] * WIN[2] - WIN_R[2] * WIN[1], WIN_R[2] * WIN[0] - WIN_R[0] * WIN[2], WIN_R[0] * WIN[1] - WIN_R[1] * WIN[0]];

  // Radiance seen along reflected direction (rx, ry, rz); y points down.
  function bubbleEnv(rx, ry, rz, out) {
    const s = smooth(-0.3, 0.55, -ry);
    let r = lerp(0.1, 1.0, s), g = lerp(0.13, 1.08, s), b = lerp(0.19, 1.2, s);
    if (rz < 0) { // behind the bubble: the glow of the desktop
      const k = -rz * 0.45;
      r = lerp(r, 0.72, k); g = lerp(g, 0.88, k); b = lerp(b, 1.05, k);
    }
    const c = rx * WIN[0] + ry * WIN[1] + rz * WIN[2];
    if (c > 0.25) {
      const u = (rx * WIN_R[0] + ry * WIN_R[1] + rz * WIN_R[2]) / c;
      const v = (rx * WIN_V[0] + ry * WIN_V[1] + rz * WIN_V[2]) / c;
      const halo = Math.exp(-(u * u + v * v) * 4) * 0.7 * smooth(0.25, 0.6, c);
      r += halo; g += halo; b += halo * 1.05;
      // a soft studio light: one rounded panel, brightest near the top
      // (no panes or bars, so it never reads as a logo)
      const q = Math.pow(Math.abs(u) / 0.28, 4) + Math.pow(Math.abs(v) / 0.42, 4);
      const inside = smooth(1.25, 0.8, q);
      if (inside > 0) {
        const L = 14 * inside * (0.8 + 0.25 * (0.5 - v));
        r += L; g += L * 1.02; b += L * 1.06;
      }
    }
    out[0] = r; out[1] = g; out[2] = b;
  }

  // The glass body at radius R (device px), rendered per pixel.
  function bubbleBody(R) {
    const pad = 2, size = Math.ceil(R * 2 + pad * 2), c = canvas(size, size);
    const x = c.getContext('2d');
    const img = x.createImageData(size, size), d = img.data;
    const m = size / 2, e1 = [0, 0, 0], e2 = [0, 0, 0];
    for (let py = 0; py < size; py++) {
      const ny = (py + 0.5 - m) / R;
      for (let px = 0; px < size; px++) {
        const nx = (px + 0.5 - m) / R;
        const r2 = nx * nx + ny * ny, dist = Math.sqrt(r2);
        const cover = clamp((1 - dist) * R + 0.5, 0, 1);
        if (cover <= 0) continue;
        const nz = Math.sqrt(Math.max(0, 1 - r2));
        const rx = 2 * nz * nx, ry = 2 * nz * ny, rz = 2 * nz * nz - 1;
        const F = 0.035 + 0.965 * Math.pow(1 - nz, 3);
        bubbleEnv(rx, ry, rz, e1);     // front surface
        bubbleEnv(-rx, -ry, rz, e2);   // inside of the back surface (inverted, fainter)
        let r = F * (e1[0] + 0.42 * e2[0]), g = F * (e1[1] + 0.42 * e2[1]), b = F * (e1[2] + 0.42 * e2[2]);
        // a faint lens: light gathered in the middle, a darker band inside the rim
        const lens = 0.035 * Math.pow(nz, 6);
        r = 1 - Math.exp(-1.3 * r) + lens; g = 1 - Math.exp(-1.3 * g) + lens; b = 1 - Math.exp(-1.3 * b) + lens;
        const band = 0.065 * smooth(0.72, 0.93, dist) * (1 - smooth(0.95, 1, dist));
        let a = Math.max(r, g, b, F * 0.78, band);
        a = clamp(a, 0, 1);
        const o = (py * size + px) * 4;
        const ia = a > 0 ? 255 / a : 0;
        d[o] = clamp(r * ia, 0, 255); d[o + 1] = clamp(g * ia, 0, 255); d[o + 2] = clamp(b * ia, 0, 255);
        d[o + 3] = a * cover * 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // Swirling film thickness, as colors, at low resolution (it is scaled up).
  function filmField(seed) {
    const n = 88, c = canvas(n, n), x = c.getContext('2d');
    const img = x.createImageData(n, n), d = img.data;
    const N1 = noise2(seed), N2 = noise2(seed + 17), N3 = noise2(seed + 31);
    const fbm = (N, u, v) => N(u, v) + 0.45 * N(u * 2.03 + 1.7, v * 2.03 - 0.6);
    const lut = filmLUT();
    const drift = Math.random();
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const u = ((i + 0.5) / n) * 2 - 1, v = ((j + 0.5) / n) * 2 - 1;
        const qx = fbm(N1, u * 0.9 + 3.1, v * 0.9), qy = fbm(N2, u * 0.9, v * 0.9 + 7.7);
        const t = fbm(N3, u * 0.8 + qx * 1.3, v * 0.8 + qy * 1.3);
        // swirls, plus thicker film settling toward the bottom
        let k = fract(drift + t * 0.75 + v * 0.22);
        k = k < 0.5 ? k * 2 : 2 - k * 2;
        const li = Math.round(k * 255) * 3, o = (j * n + i) * 4;
        d[o] = lut[li]; d[o + 1] = lut[li + 1]; d[o + 2] = lut[li + 2]; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  // Film opacity by radius: faint across the face, strong toward the rim.
  const FILM_RING = [[0, 0.014], [0.55, 0.024], [0.76, 0.07], [0.87, 0.2], [0.935, 0.42], [0.972, 0.7], [0.992, 0.55], [1, 0]];
  function filmSprite(field, R) {
    const size = Math.ceil(R * 2 + 4), c = canvas(size, size), x = c.getContext('2d'), m = size / 2;
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(field, m - R, m - R, 2 * R, 2 * R);
    x.globalCompositeOperation = 'destination-in';
    const g = x.createRadialGradient(m, m, 0, m, m, R);
    FILM_RING.forEach(([s, a]) => g.addColorStop(s, `rgba(0,0,0,${a})`));
    x.fillStyle = g;
    x.beginPath();
    x.arc(m, m, R, 0, TAU);
    x.fill();
    return c;
  }
  function shadowSprite() {
    const R = 64, c = canvas(R * 2, R * 2), x = c.getContext('2d');
    const g = x.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, 'rgba(255,255,244,0.2)');
    g.addColorStop(0.2, 'rgba(255,255,244,0.08)');
    g.addColorStop(0.42, 'rgba(0,0,0,0)');
    g.addColorStop(0.7, 'rgba(6,26,50,0.085)');
    g.addColorStop(0.86, 'rgba(6,26,50,0.12)');
    g.addColorStop(1, 'rgba(6,26,50,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, R * 2, R * 2);
    return c;
  }

  // Canvas transform for a bubble: translate, wobble (squash q along angle th),
  // uniform scale s and rotation phi.
  function bubbleXf(ctx, X, Y, s, q, th, phi) {
    const c2 = Math.cos(2 * th), s2 = Math.sin(2 * th);
    const w00 = 1 + q * c2, w01 = q * s2, w11 = 1 - q * c2;
    const cp = Math.cos(phi) * s, sp = Math.sin(phi) * s;
    // W * [[cp, -sp], [sp, cp]]
    const m00 = w00 * cp + w01 * sp, m01 = -w00 * sp + w01 * cp;
    const m10 = w01 * cp + w11 * sp, m11 = -w01 * sp + w11 * cp;
    ctx.setTransform(m00, m10, m01, m11, X, Y);
  }
  // Springy grow-in with a little overshoot.
  const springIn = (p) => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(p * 9));

  function createBubbles(container, opts) {
    const preview = !!opts.preview;
    let bubbles = [], drops = [], rings = [];
    let shadow = null, fields = [];
    const lods = new Map();   // sprite cache by quantized device radius
    let lastS = 0, nextPop = rand(30, 60);

    function lodFor(rd) {
      const k = Math.ceil(Math.log(Math.max(4, rd)) / Math.log(1.22));
      let L = lods.get(k);
      if (!L) { L = { R: Math.pow(1.22, k), body: null, films: new Map() }; lods.set(k, L); }
      return L;
    }

    function newBubble(S, i, delay) {
      const s = S.s;
      const r = s * (0.058 + 0.075 * Math.pow(Math.random(), 1.25));
      const ang = rand(0, TAU), sp = s * rand(0.06, 0.11);
      const b = {
        r, x: 0, y: 0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, cruise: sp,
        wander: rand(0, TAU), wanderRate: rand(-0.4, 0.4),
        spinA: rand(0, TAU), spinB: rand(0, TAU), rateA: rand(0.1, 0.22) * (Math.random() < 0.5 ? -1 : 1), rateB: rand(0.14, 0.3),
        fieldA: i % fields.length, fieldB: (i + 1 + Math.floor(Math.random() * (fields.length - 1))) % fields.length,
        rim: Math.random(), breathe: rand(0, TAU),
        born: 0, delay, grow: 0, wob: 0, wobPh: 0, wobAng: 0, pop: -1, sprite: null,
      };
      place(S, b);
      return b;
    }
    // Finds a spot that doesn't overlap the other bubbles.
    function place(S, b) {
      for (let tries = 0; tries < 60; tries++) {
        const x = rand(b.r, S.w - b.r), y = rand(b.r, S.h - b.r);
        if (bubbles.every((o) => o === b || Math.hypot(o.x - x, o.y - y) > o.r + b.r + 4)) { b.x = x; b.y = y; return; }
      }
      b.x = rand(b.r, S.w - b.r); b.y = rand(b.r, S.h - b.r);
    }

    function ensureSprites(S, b, budget) {
      const L = lodFor(b.r * S.sx);
      if (b.sprite && b.sprite.L === L) return budget;
      if (!L.body) {
        if (budget <= 0) return budget;
        L.body = bubbleBody(L.R);
        budget--;
      }
      const film = (fi) => {
        let f = L.films.get(fi);
        if (!f) { f = filmSprite(fields[fi], L.R); L.films.set(fi, f); }
        return f;
      };
      b.sprite = { L, body: L.body, a: film(b.fieldA), b: film(b.fieldB) };
      return budget;
    }

    function pop(S, b) {
      b.pop = 0;
      const n = preview ? 5 : 9;
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), sp = b.r * rand(1.2, 2.6);
        drops.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - b.r * 0.6, life: rand(0.45, 0.8), age: 0, size: Math.max(0.8, b.r * rand(0.02, 0.045)) });
      }
      rings.push({ x: b.x, y: b.y, r: b.r, age: 0 });
    }

    function physics(S, dt, t) {
      const W = S.w, H = S.h;
      for (const b of bubbles) {
        if (b.pop >= 0) continue;
        if (t > b.delay) b.grow = Math.min(1, (t - b.delay) / 1.15);
        b.wander += b.wanderRate * dt;
        const wv = b.cruise * 0.25;
        b.vx += Math.cos(b.wander) * wv * dt;
        b.vy += Math.sin(b.wander) * wv * dt;
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const k = 1 + (b.cruise / sp - 1) * Math.min(1, dt * 0.6);
        b.vx *= k; b.vy *= k;
        b.x += b.vx * dt; b.y += b.vy * dt;
        const r = b.r * springIn(b.grow);
        if (b.x < r) { b.x = r; if (b.vx < 0) { hit(b, -b.vx, 0); b.vx = -b.vx; } }
        if (b.x > W - r) { b.x = W - r; if (b.vx > 0) { hit(b, b.vx, 0); b.vx = -b.vx; } }
        if (b.y < r) { b.y = r; if (b.vy < 0) { hit(b, -b.vy, Math.PI / 2); b.vy = -b.vy; } }
        if (b.y > H - r) { b.y = H - r; if (b.vy > 0) { hit(b, b.vy, Math.PI / 2); b.vy = -b.vy; } }
        b.wob *= Math.exp(-dt * 2.4);
        b.wobPh += dt * (10 + 260 / Math.max(8, b.r));
      }
      // Elastic collisions, mass by surface area.
      for (let i = 0; i < bubbles.length; i++) {
        const a = bubbles[i];
        if (a.pop >= 0 || a.grow <= 0) continue;
        const ra = a.r * springIn(a.grow);
        for (let j = i + 1; j < bubbles.length; j++) {
          const b = bubbles[j];
          if (b.pop >= 0 || b.grow <= 0) continue;
          const rb = b.r * springIn(b.grow);
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = ra + rb;
          if (d2 >= min * min || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          const ma = a.r * a.r, mb = b.r * b.r;
          const over = min - d;
          a.x -= nx * over * mb / (ma + mb); a.y -= ny * over * mb / (ma + mb);
          b.x += nx * over * ma / (ma + mb); b.y += ny * over * ma / (ma + mb);
          const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (vn <= 0) continue;
          const imp = (2 * vn) / (1 / ma + 1 / mb);
          a.vx -= (imp / ma) * nx; a.vy -= (imp / ma) * ny;
          b.vx += (imp / mb) * nx; b.vy += (imp / mb) * ny;
          const ang = Math.atan2(ny, nx);
          hit(a, vn, ang); hit(b, vn, ang);
        }
      }
      function hit(b, v, ang) {
        const add = clamp(v / (b.cruise * 9), 0, 0.09);
        if (add > b.wob * 0.5) { b.wobAng = ang; b.wobPh = 0; }
        b.wob = Math.min(0.1, b.wob + add);
      }
      // A rare pop, then a fresh bubble is blown somewhere else.
      if (t > nextPop) {
        nextPop = t + rand(40, 80);
        const ready = bubbles.filter((b) => b.grow >= 1 && b.pop < 0);
        if (ready.length) pop(S, ready[Math.floor(Math.random() * ready.length)]);
      }
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        if (b.pop < 0) continue;
        b.pop += dt;
        if (b.pop > 0.3) {
          const nb = newBubble(S, i, t + rand(1.2, 2.5));
          bubbles[i] = nb;
        }
      }
      for (const d of drops) { d.age += dt; d.vy += S.s * 0.9 * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
      drops = drops.filter((d) => d.age < d.life);
      for (const r of rings) r.age += dt;
      rings = rings.filter((r) => r.age < 0.4);
    }

    function draw(S, t) {
      const ctx = S.ctx, k = S.sx, W = S.w, H = S.h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
      ctx.imageSmoothingEnabled = true;
      // Shadows on the desktop first, so no bubble ever sits under one.
      for (const b of bubbles) {
        if (!b.sprite || b.grow <= 0) continue;
        const g = springIn(b.grow), fade = b.pop >= 0 ? 1 - b.pop / 0.3 : 1;
        const r = b.r * g;
        const ox = r * 0.3 + (b.x / W - 0.5) * r * 0.3, oy = r * 0.42 + (b.y / H - 0.5) * r * 0.25;
        const sc = (r * 1.12 * k) / 64;
        const ang = Math.atan2(oy, ox);
        ctx.globalAlpha = Math.min(1, g) * fade;
        bubbleXf(ctx, (b.x + ox) * k, (b.y + oy) * k, sc, 0.06, ang, 0);
        ctx.drawImage(shadow, -64, -64);
      }
      for (const b of bubbles) {
        if (!b.sprite || b.grow <= 0) continue;
        const sp = b.sprite, R = sp.L.R;
        const g = springIn(b.grow);
        let fade = 1, grow = g;
        if (b.pop >= 0) { const p = b.pop / 0.3; fade = 1 - p * p; grow *= 1 + p * 0.12; }
        const s = (b.r * grow * k) / R;
        if (s < 0.01) continue;
        const q = b.wob * Math.sin(b.wobPh) + 0.006 * Math.sin(t * 2.1 + b.breathe);
        const X = b.x * k, Y = b.y * k, off = -sp.body.width / 2;
        ctx.globalAlpha = fade * Math.min(1, g * 1.5);
        bubbleXf(ctx, X, Y, s, q, b.wobAng, 0);
        ctx.drawImage(sp.body, off, off);
        const fa = -sp.a.width / 2;
        ctx.globalAlpha = fade * 0.95 * Math.min(1, g);
        bubbleXf(ctx, X, Y, s, q, b.wobAng, b.spinA + t * b.rateA);
        ctx.drawImage(sp.a, fa, fa);
        ctx.globalAlpha = fade * Math.min(1, g) * (0.32 + 0.26 * Math.sin(t * 0.23 + b.breathe));
        bubbleXf(ctx, X, Y, s, q, b.wobAng, b.spinB - t * b.rateB);
        ctx.drawImage(sp.b, fa, fa);
        // the thin rim, cycling through the film spectrum
        const c = filmColor(b.rim + t * 0.035);
        bubbleXf(ctx, X, Y, s, q, b.wobAng, 0);
        ctx.globalAlpha = fade * Math.min(1, g) * 0.55;
        ctx.strokeStyle = rgba(c, 1);
        const lw = Math.min(R * 0.08, Math.max(0.8 / s, R * 0.018));
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0, R - lw * 0.5), 0, TAU);
        ctx.stroke();
      }
      // pops: a fading ring and a few droplets
      ctx.setTransform(k, 0, 0, k, 0, 0);
      for (const r of rings) {
        const p = r.age / 0.4;
        ctx.globalAlpha = (1 - p) * 0.5;
        ctx.strokeStyle = 'rgba(255,255,255,1)';
        ctx.lineWidth = Math.max(0.6, r.r * 0.03 * (1 - p));
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r * (1 + p * 0.35), 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(235,248,255,1)';
      for (const d of drops) {
        ctx.globalAlpha = (1 - d.age / d.life) * 0.8;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    return runScene(container, opts, {
      cls: 'ss-bubbles',
      maxDpr: 2,
      budget: 5.2e6,
      setup(S) {
        if (preview) desktopBackdrop(S.root);
        S.root.appendChild(S.canvas); // keep the canvas above the backdrop
        const seed = Math.floor(Math.random() * 1e6);
        fields = [0, 1, 2, 3].map((i) => filmField(seed + i * 101));
        shadow = shadowSprite();
      },
      resize(S) {
        if (!bubbles.length) {
          const n = preview ? 11 : clamp(Math.round((S.w * S.h) / 62000), 12, 20);
          for (let i = 0; i < n; i++) bubbles.push(newBubble(S, i, 0.15 + i * 0.11));
          bubbles.sort((a, b) => a.r - b.r);
        } else if (lastS && Math.abs(S.s - lastS) > 1) {
          const f = S.s / lastS;
          for (const b of bubbles) { b.r *= f; b.cruise *= f; b.vx *= f; b.vy *= f; }
        }
        for (const b of bubbles) { b.x = clamp(b.x, b.r, Math.max(b.r, S.w - b.r)); b.y = clamp(b.y, b.r, Math.max(b.r, S.h - b.r)); }
        lastS = S.s;
      },
      frame(S, dt, t) {
        // Sprites are built lazily, one heavy one per frame, in birth order.
        let budget = 1;
        for (const b of bubbles) budget = ensureSprites(S, b, budget);
        physics(S, dt, t);
        draw(S, t);
      },
      dispose() { lods.clear(); bubbles = []; },
    });
  }

  // ============================================================ shared sprites
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  // A soft round glow (white, tint it with 'lighter' + alpha).
  function glowSprite(size, core) {
    const c = canvas(size, size), x = c.getContext('2d'), m = size / 2;
    const g = x.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(core || 0.15, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
  }
  // Colored glow: a tinted version of the soft glow.
  function tintGlow(size, rgb, core) {
    const c = glowSprite(size, core), x = c.getContext('2d');
    x.globalCompositeOperation = 'source-atop';
    const m = size / 2, g = x.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, rgba(rgb, 1));
    g.addColorStop(1, rgba(rgb, 1));
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
  }

  // ============================================================ 2. Ribbons
  // Glowing ribbons that fly and twist through 3D space over black. Each is a
  // strip of quads with its own slowly shifting color, lit by its twist (full
  // face-on, a white glint when it catches the light, dim edge-on) and fading
  // from the tail. The camera sways a little for depth.
  function createRibbons(container, opts) {
    const preview = !!opts.preview;
    const STRIDE = 13, LIFE = preview ? 6.5 : 8.5, CHUNK = 10;
    const HALF = norm3([-0.4, -0.6, 1.7]);
    const styles = new Map();
    let ribbons = [], spark = null, glow = null, proj = new Float32Array(4096), shade = new Float32Array(4096);

    // Colors are premultiplied by their fade (additive blending), then cached as strings.
    function styleOf(r, g, b) {
      r = r > 255 ? 255 : r | 0; g = g > 255 ? 255 : g | 0; b = b > 255 ? 255 : b | 0;
      const key = (r << 16) | (g << 8) | b;
      let s = styles.get(key);
      if (!s) {
        if (styles.size > 40000) styles.clear();
        s = `rgb(${r},${g},${b})`;
        styles.set(key, s);
      }
      return s;
    }

    function start(S, rb, t, delay) {
      const s = S.s;
      rb.pts = []; rb.head = 0; rb.acc = 0;
      rb.p = [rand(-0.3, 0.3) * S.w, rand(-0.25, 0.25) * S.h, rand(-0.2, 0.2) * s];
      const U = norm3([rand(-1, 1), rand(-1, 1), rand(-0.5, 0.5)]);
      const Sd = norm3(cross3(U, Math.abs(U[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
      rb.U = U; rb.S = Sd; rb.N = cross3(U, Sd);
      rb.hue = rand(0, 360);
      rb.hueRate = rand(10, 20) * (Math.random() < 0.5 ? -1 : 1);
      rb.width = s * rand(0.0065, 0.012);
      rb.speed = s * rand(0.36, 0.5);
      rb.t0 = t + delay;
      rb.t1 = rb.t0 + rand(6, 11);
      rb.f = [rand(0.25, 0.55), rand(0.6, 1.2), rand(0.2, 0.5), rand(0.55, 1.1), rand(0.25, 0.7)];
      rb.ph = rb.f.map(() => rand(0, TAU));
    }

    function fly(S, rb, dt, t) {
      const f = rb.f, ph = rb.ph, U = rb.U, Sd = rb.S, N = rb.N, p = rb.p;
      const yaw = 1.3 * (Math.sin(t * f[0] + ph[0]) + 0.55 * Math.sin(t * f[1] + ph[1]));
      const pitch = 1.15 * (Math.sin(t * f[2] + ph[2]) + 0.55 * Math.sin(t * f[3] + ph[3]));
      const twist = 2.9 * Math.sin(t * f[4] + ph[4]);
      let ux = U[0] + (Sd[0] * yaw + N[0] * pitch) * dt;
      let uy = U[1] + (Sd[1] * yaw + N[1] * pitch) * dt;
      let uz = U[2] + (Sd[2] * yaw + N[2] * pitch) * dt;
      // Stay on screen: turn back toward the middle outside an ellipsoid.
      const e = (p[0] / (0.4 * S.w)) ** 2 + (p[1] / (0.36 * S.h)) ** 2 + (p[2] / (0.3 * S.s)) ** 2;
      if (e > 0.75) {
        const k = Math.min(3.5, (e - 0.75) * 3) * dt, inv = 1 / (Math.hypot(p[0], p[1], p[2]) || 1);
        ux -= p[0] * inv * k; uy -= p[1] * inv * k; uz -= p[2] * inv * k;
      }
      const ul = Math.hypot(ux, uy, uz) || 1;
      U[0] = ux / ul; U[1] = uy / ul; U[2] = uz / ul;
      const c = Math.cos(twist * dt), sn = Math.sin(twist * dt);
      let sx = Sd[0] * c + N[0] * sn, sy = Sd[1] * c + N[1] * sn, sz = Sd[2] * c + N[2] * sn;
      const d = sx * U[0] + sy * U[1] + sz * U[2];
      sx -= d * U[0]; sy -= d * U[1]; sz -= d * U[2];
      const sl = Math.hypot(sx, sy, sz) || 1;
      Sd[0] = sx / sl; Sd[1] = sy / sl; Sd[2] = sz / sl;
      const n = cross3(U, Sd);
      N[0] = n[0]; N[1] = n[1]; N[2] = n[2];
      const step = rb.speed * dt;
      p[0] += U[0] * step; p[1] += U[1] * step; p[2] += U[2] * step;
      rb.acc += step;
      const spacing = Math.max(1.2, S.s * 0.006);
      if (rb.acc >= spacing) {
        rb.acc %= spacing;
        const col = hsl(rb.hue + rb.hueRate * (t - rb.t0), 0.8, 0.6), w = rb.width;
        rb.pts.push(p[0], p[1], p[2], Sd[0] * w, Sd[1] * w, Sd[2] * w, N[0], N[1], N[2], col[0], col[1], col[2], t);
      }
    }

    function draw(S, t) {
      const ctx = S.ctx, k = S.sx;
      // The glow shows the previous frame: its pixels are ready, so copying never stalls.
      glow.run(S.canvas);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S.canvas.width, S.canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      const yaw = 0.38 * Math.sin(t * 0.045), pitch = 0.14 * Math.sin(t * 0.063 + 1);
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const m00 = cyw, m02 = syw, m10 = sp * syw, m11 = cp, m12 = -sp * cyw, m20 = -cp * syw, m21 = sp, m22 = cp * cyw;
      const D = S.s * 1.7, ox = (S.w / 2) * k, oy = (S.h / 2) * k, near = D * 0.25;
      for (const rb of ribbons) {
        const P = rb.pts, n = (P.length - rb.head) / STRIDE;
        if (n >= 2) {
          if (proj.length < n * 4) { proj = new Float32Array(n * 8); shade = new Float32Array(n * 8); }
          // Project both edges of every point and light it: bright face-on,
          // dim edge-on, a white glint toward the light; premultiplied by its fade.
          for (let i = 0, o = rb.head; i < n; i++, o += STRIDE) {
            const x = P[o], y = P[o + 1], z = P[o + 2], a = P[o + 3], b = P[o + 4], c = P[o + 5];
            let X = x - a, Y = y - b, Z = z - c;
            let ps = (D / Math.max(near, D - (m20 * X + m21 * Y + m22 * Z))) * k;
            proj[i * 4] = ox + (m00 * X + m02 * Z) * ps;
            proj[i * 4 + 1] = oy + (m10 * X + m11 * Y + m12 * Z) * ps;
            X = x + a; Y = y + b; Z = z + c;
            ps = (D / Math.max(near, D - (m20 * X + m21 * Y + m22 * Z))) * k;
            proj[i * 4 + 2] = ox + (m00 * X + m02 * Z) * ps;
            proj[i * 4 + 3] = oy + (m10 * X + m11 * Y + m12 * Z) * ps;
            const al = 1 - smooth(LIFE * 0.2, LIFE, t - P[o + 12]);
            const nx = P[o + 6], ny = P[o + 7], nz = P[o + 8];
            const qx = m00 * nx + m02 * nz, qy = m10 * nx + m11 * ny + m12 * nz, qz = m20 * nx + m21 * ny + m22 * nz;
            const spec = Math.pow(Math.abs(qx * HALF[0] + qy * HALF[1] + qz * HALF[2]), 12) * 220 * al;
            const lit = (0.2 + 0.95 * Math.abs(qz)) * al;
            shade[i * 4] = P[o + 9] * lit + spec;
            shade[i * 4 + 1] = P[o + 10] * lit + spec;
            shade[i * 4 + 2] = P[o + 11] * lit + spec;
            shade[i * 4 + 3] = al;
          }
          // Fill the strip in chunks: one polygon each, shaded by a gradient
          // along the chunk, so the twist lighting is smooth and cheap to draw.
          for (let i0 = 0; i0 < n - 1; i0 += CHUNK) {
            const i1 = Math.min(n - 1, i0 + CHUNK);
            if (shade[i0 * 4 + 3] <= 0.004 && shade[i1 * 4 + 3] <= 0.004) continue;
            const ax = (proj[i0 * 4] + proj[i0 * 4 + 2]) / 2, ay = (proj[i0 * 4 + 1] + proj[i0 * 4 + 3]) / 2;
            const dx = (proj[i1 * 4] + proj[i1 * 4 + 2]) / 2 - ax, dy = (proj[i1 * 4 + 1] + proj[i1 * 4 + 3]) / 2 - ay;
            const len2 = dx * dx + dy * dy;
            let fill;
            if (len2 < 4) {
              const m = ((i0 + i1) >> 1) * 4;
              fill = styleOf(shade[m], shade[m + 1], shade[m + 2]);
            } else {
              fill = ctx.createLinearGradient(ax, ay, ax + dx, ay + dy);
              let last = 0;
              for (let j = i0; j <= i1; j++) {
                let u = (((proj[j * 4] + proj[j * 4 + 2]) / 2 - ax) * dx + ((proj[j * 4 + 1] + proj[j * 4 + 3]) / 2 - ay) * dy) / len2;
                u = u < last ? last : u > 1 ? 1 : u;
                last = u;
                fill.addColorStop(u, styleOf(shade[j * 4], shade[j * 4 + 1], shade[j * 4 + 2]));
              }
            }
            ctx.beginPath();
            ctx.moveTo(proj[i0 * 4], proj[i0 * 4 + 1]);
            for (let j = i0 + 1; j <= i1; j++) ctx.lineTo(proj[j * 4], proj[j * 4 + 1]);
            for (let j = i1; j >= i0; j--) ctx.lineTo(proj[j * 4 + 2], proj[j * 4 + 3]);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
          }
        }
        // the point of light spinning the ribbon out
        if (t > rb.t0 && t < rb.t1 + 0.4) {
          const p = rb.p, fade = clamp((rb.t1 + 0.4 - t) / 0.4, 0, 1) * clamp((t - rb.t0) / 0.3, 0, 1);
          const ps = (D / Math.max(near, D - (m20 * p[0] + m21 * p[1] + m22 * p[2]))) * k;
          const X = ox + (m00 * p[0] + m02 * p[2]) * ps, Y = oy + (m10 * p[0] + m11 * p[1] + m12 * p[2]) * ps;
          const r = rb.width * 4.5 * ps;
          ctx.globalAlpha = 0.75 * fade;
          ctx.drawImage(spark, X - r, Y - r, r * 2, r * 2);
          ctx.globalAlpha = 1;
        }
      }
    }

    return runScene(container, opts, {
      cls: 'ss-ribbons',
      alpha: false,
      maxDpr: 1.5,
      budget: 3.2e6,
      setup(S) {
        spark = glowSprite(64, 0.12);
        glow = makeGlow(S.root, 0.9, 0.012);
      },
      degrade(S) { if (S.quality < 0.7) glow.off(); },
      resize(S) {
        glow.resize(S);
        if (ribbons.length) return;
        const n = preview ? 4 : 7;
        for (let i = 0; i < n; i++) { const rb = {}; start(S, rb, S.t, i * 0.8); ribbons.push(rb); }
      },
      frame(S, dt, t) {
        for (const rb of ribbons) {
          if (t >= rb.t0 && t < rb.t1) fly(S, rb, dt, t);
          while (rb.head < rb.pts.length && t - rb.pts[rb.head + 12] > LIFE) rb.head += STRIDE;
          if (rb.head > STRIDE * 400) { rb.pts.splice(0, rb.head); rb.head = 0; }
          if (t > rb.t1 && rb.head >= rb.pts.length) start(S, rb, t, rand(0.2, 1.4));
        }
        draw(S, t);
      },
      dispose() { ribbons = []; styles.clear(); },
    });
  }

  // ============================================================ 3. Aurora
  // Curtains of green, cyan and violet light over a starry sky, above dark
  // mountains and a still lake that holds their reflection. Each curtain is a
  // row of soft vertical rays that fold, ripple, scroll and slowly shimmer,
  // brightest toward the middle of the sky. Only the aurora, twinkles and the
  // reflection are redrawn each frame; everything else is painted once.
  function curtainSprite(stops) {
    const w = 12, hh = 256, c = canvas(w, hh), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, hh);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    x.fillStyle = g;
    x.fillRect(0, 0, w, hh);
    x.globalCompositeOperation = 'destination-in';
    const hg = x.createLinearGradient(0, 0, w, 0);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.5, 'rgba(0,0,0,1)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hg;
    x.fillRect(0, 0, w, hh);
    return c;
  }
  // Rows run from the top of a ray (0) to its bright lower edge (0.94) and a soft fade below.
  const AURORA_INKS = [
    [[0, 'rgba(140,60,255,0)'], [0.3, 'rgba(150,70,255,0.3)'], [0.58, 'rgba(40,190,230,0.55)'], [0.82, 'rgba(50,255,150,0.92)'], [0.94, 'rgba(185,255,200,1)'], [1, 'rgba(60,255,150,0)']],
    [[0, 'rgba(90,80,255,0)'], [0.35, 'rgba(100,90,255,0.3)'], [0.65, 'rgba(40,170,255,0.6)'], [0.88, 'rgba(60,240,255,0.95)'], [0.94, 'rgba(200,250,255,1)'], [1, 'rgba(60,220,255,0)']],
    [[0, 'rgba(210,70,220,0)'], [0.3, 'rgba(200,80,230,0.35)'], [0.6, 'rgba(60,220,190,0.5)'], [0.85, 'rgba(40,250,190,0.9)'], [0.94, 'rgba(200,255,230,1)'], [1, 'rgba(40,250,190,0)']],
  ];

  function createAurora(container, opts) {
    const preview = !!opts.preview;
    let sky, fx, aur, mtn, lake, front, sprites, mirrored, haze, star, starBig;
    let curtains = [], twinkles = [], meteor = null, nextMeteor = rand(5, 12), yH = 0;
    const N1 = noise1(11), N2 = noise1(23), N3 = noise1(37), NR = noise1(71);

    function makeCurtains() {
      const base = [
        { y0: 0.5, h: 0.4, alpha: 0.52, ink: 0, spacing: 2.3 },
        { y0: 0.4, h: 0.34, alpha: 0.32, ink: 1, spacing: 2.8 },
        { y0: 0.58, h: 0.3, alpha: 0.3, ink: 2, spacing: 3 },
      ];
      return base.map((c, i) => Object.assign(c, {
        seed: rand(0, 100),
        a1: rand(0.035, 0.06), k1: rand(0.7, 1.2), w1: rand(0.012, 0.022), p1: rand(0, TAU),
        a2: rand(0.012, 0.025), k2: rand(1.8, 2.8), w2: rand(0.02, 0.035), p2: rand(0, TAU),
        fa: rand(0.022, 0.034), fk: rand(0.9, 1.4), fw: rand(0.008, 0.016) * (i % 2 ? -1 : 1), fp: rand(0, TAU),
        nk: rand(4, 7), hk: rand(3, 5), scroll: rand(0.035, 0.06) * (i % 2 ? -1 : 1),
        pulses: [],
      }));
    }

    // Ridged noise: sharp peaks, soft valleys.
    function ridge(xN, lo, amp, seed, sharp) {
      const r = (f, o) => { const v = 1 - Math.abs(NR(xN * f + o) * 2 - 1); return sharp ? v * v : v; };
      return lo - amp * (0.6 * r(2.6, seed) + 0.28 * r(7.3, seed * 2) + 0.12 * r(19, seed * 3));
    }

    function paintSky(S) {
      const L = sky, x = L.ctx, W = S.w, H = S.h;
      x.setTransform(L.sx, 0, 0, L.sy, 0, 0);
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#010208');
      g.addColorStop(0.45, '#020815');
      g.addColorStop(0.7, '#041627');
      g.addColorStop(0.8, '#072437');
      g.addColorStop(1, '#03101c');
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      // a faint band of the galaxy
      x.save();
      x.translate(W * 0.45, yH * 0.42);
      x.rotate(-0.55);
      x.scale(W * 0.7, S.s * 0.12);
      const mw = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      mw.addColorStop(0, 'rgba(150,170,255,0.07)');
      mw.addColorStop(0.5, 'rgba(120,140,230,0.035)');
      mw.addColorStop(1, 'rgba(120,140,230,0)');
      x.fillStyle = mw;
      x.beginPath();
      x.arc(0, 0, 1, 0, TAU);
      x.fill();
      x.restore();
      // stars, thinning toward the horizon; denser along the galaxy band
      const rnd = A.util.seeded(4242);
      const count = Math.min(1100, Math.round((W * H) / (preview ? 700 : 1900)));
      const ca = Math.cos(-0.55), sa = Math.sin(-0.55);
      for (let i = 0; i < count; i++) {
        const sx = rnd() * W, sy = rnd() * yH;
        const dx = sx - W * 0.45, dy = sy - yH * 0.42;
        const across = Math.abs(-dx * sa + dy * ca) / (S.s * 0.12);
        if (across > 1 && rnd() < 0.35) continue;
        let a = Math.pow(rnd(), 2.2) * (0.35 + 0.65 * smooth(yH, yH * 0.55, sy));
        const r = (0.35 + Math.pow(rnd(), 3) * 0.9) * (preview ? 0.6 : 1);
        const tint = rnd();
        x.fillStyle = tint < 0.15 ? `rgba(255,225,190,${a})` : tint < 0.35 ? `rgba(190,215,255,${a})` : `rgba(255,255,255,${a})`;
        x.beginPath();
        x.arc(sx, sy, r, 0, TAU);
        x.fill();
      }
    }

    function paintMountains(S) {
      const L = mtn, x = L.ctx, W = S.w, H = S.h;
      x.setTransform(L.sx, 0, 0, L.sy, 0, 0);
      x.clearRect(0, 0, W, H);
      const steps = Math.max(40, Math.round(W / 6));
      const far = [], near = [];
      for (let i = 0; i <= steps; i++) {
        const xN = i / steps;
        far.push(ridge(xN, H * 0.76, H * 0.15, 3, true));
        near.push(ridge(xN, H * 0.79, H * 0.07, 9, false));
      }
      const range = (pts, top, bottom, rim) => {
        x.beginPath();
        x.moveTo(0, yH + 1);
        pts.forEach((y, i) => x.lineTo((i / steps) * W, y));
        x.lineTo(W, yH + 1);
        x.closePath();
        const g = x.createLinearGradient(0, H * 0.58, 0, yH);
        g.addColorStop(0, top);
        g.addColorStop(1, bottom);
        x.fillStyle = g;
        x.fill();
        if (rim) {
          x.beginPath();
          pts.forEach((y, i) => (i ? x.lineTo((i / steps) * W, y + 0.5) : x.moveTo(0, y + 0.5)));
          x.strokeStyle = rim;
          x.lineWidth = preview ? 0.6 : 1;
          x.stroke();
        }
      };
      range(far, '#0b1c2b', '#06111b', 'rgba(110,230,190,0.13)');
      range(near, '#040b12', '#02070b', 'rgba(90,200,170,0.07)');
      // the lake: a darker, mirrored sky with the mountains reflected in it
      const lg = x.createLinearGradient(0, yH, 0, H);
      lg.addColorStop(0, '#08243a');
      lg.addColorStop(0.35, '#041422');
      lg.addColorStop(1, '#01060b');
      x.fillStyle = lg;
      x.fillRect(0, yH, W, H - yH);
      const mirror = (pts, col) => {
        x.beginPath();
        x.moveTo(0, yH);
        pts.forEach((y, i) => x.lineTo((i / steps) * W, yH + (yH - y) * 0.55));
        x.lineTo(W, yH);
        x.closePath();
        x.fillStyle = col;
        x.fill();
      };
      mirror(far, 'rgba(6,16,26,0.9)');
      mirror(near, 'rgba(3,8,13,0.95)');
      x.fillStyle = 'rgba(140,240,210,0.1)';
      x.fillRect(0, yH - 0.5, W, preview ? 0.6 : 1);
    }

    function tree(x, bx, by, hh) {
      const w = hh * 0.3, tiers = 7;
      x.beginPath();
      x.moveTo(bx - w * 0.06, by);
      x.lineTo(bx - w * 0.06, by - hh * 0.12);
      for (let i = 0; i < tiers; i++) {
        const f = i / tiers, y = by - hh * (0.1 + 0.9 * f), tw = w * (1 - f) * 0.55 + w * 0.08;
        x.lineTo(bx - tw, y);
        x.lineTo(bx - tw * 0.35, y - hh * 0.07);
      }
      x.lineTo(bx, by - hh);
      for (let i = tiers - 1; i >= 0; i--) {
        const f = i / tiers, y = by - hh * (0.1 + 0.9 * f), tw = w * (1 - f) * 0.55 + w * 0.08;
        x.lineTo(bx + tw * 0.35, y - hh * 0.07);
        x.lineTo(bx + tw, y);
      }
      x.lineTo(bx + w * 0.06, by - hh * 0.12);
      x.lineTo(bx + w * 0.06, by);
      x.closePath();
      x.fill();
    }

    function paintFront(S) {
      const L = front, x = L.ctx, W = S.w, H = S.h;
      x.setTransform(L.sx, 0, 0, L.sy, 0, 0);
      x.clearRect(0, 0, W, H);
      const wg = x.createLinearGradient(0, yH, 0, H);
      wg.addColorStop(0, 'rgba(0,8,16,0.15)');
      wg.addColorStop(1, 'rgba(0,4,8,0.6)');
      x.fillStyle = wg;
      x.fillRect(0, yH, W, H - yH);
      const rnd = A.util.seeded(99);
      x.fillStyle = 'rgba(170,230,255,0.035)';
      for (let i = 0; i < (preview ? 6 : 26); i++) {
        const y = yH + 3 + rnd() * (H - yH) * 0.8, w = W * (0.04 + rnd() * 0.14);
        x.fillRect(rnd() * W, y, w, preview ? 0.5 : 1);
      }
      // near shore and pines
      const shore = H * 0.955;
      x.fillStyle = '#010305';
      x.beginPath();
      x.moveTo(0, H);
      for (let i = 0; i <= 60; i++) {
        const xN = i / 60, edge = Math.min(1, Math.abs(xN - 0.5) * 2.4);
        x.lineTo(xN * W, shore - H * 0.03 * edge * edge - H * 0.006 * NR(xN * 20 + 5));
      }
      x.lineTo(W, H);
      x.closePath();
      x.fill();
      const pines = (from, to, n, seed) => {
        const r = A.util.seeded(seed);
        for (let i = 0; i < n; i++) {
          const xN = from + (to - from) * r();
          const edge = Math.min(1, Math.abs(xN - 0.5) * 2.4);
          const hh = H * (0.1 + 0.16 * r()) * (0.6 + 0.4 * edge);
          tree(x, xN * W, shore - H * 0.03 * edge * edge + 2, hh);
        }
      };
      pines(0, 0.17, preview ? 5 : 11, 7);
      pines(0.84, 1, preview ? 4 : 9, 8);
    }

    function paintTwinkles(S) {
      const rnd = A.util.seeded(777), n = preview ? 10 : 42;
      twinkles = [];
      for (let i = 0; i < n; i++) {
        twinkles.push({ x: rnd() * S.w, y: rnd() * yH * 0.85, a: 0.35 + rnd() * 0.6, sp: 0.6 + rnd() * 2.2, ph: rnd() * TAU, big: rnd() < 0.18, r: (preview ? 3 : 5.5) * (0.7 + rnd() * 0.6) });
      }
    }

    // Rays are drawn into the aurora layer, and mirrored (squashed toward the
    // shore, rippling) straight into the lake layer: no pixels are copied.
    function drawAurora(S, dt, t) {
      const L = aur, ctx = L.ctx, aw = L.c.width, ah = L.c.height;
      const W = lake.c.width, lx = lake.sx, ly = lake.sy, lk = lake.ctx, sq = 0.5;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, aw, ah);
      ctx.globalCompositeOperation = 'lighter';
      lk.setTransform(1, 0, 0, 1, 0, 0);
      lk.globalCompositeOperation = 'source-over';
      lk.globalAlpha = 1;
      lk.fillStyle = '#000';
      lk.fillRect(0, 0, W, lake.c.height);
      lk.globalCompositeOperation = 'lighter';
      const hy = yH / S.h;
      for (const c of curtains) {
        // occasional bright pulses that travel along a curtain
        if (Math.random() < dt * 0.12 && c.pulses.length < 2) c.pulses.push({ s0: rand(0.1, 0.9), v: rand(-0.06, 0.06), t0: t, dur: rand(3, 6), amp: rand(0.5, 0.9) });
        c.pulses = c.pulses.filter((p) => t - p.t0 < p.dur);
        const n = Math.max(20, Math.round(aw / c.spacing)), rw = Math.max(1.6, (aw / n) * 2.8);
        const sprite = sprites[c.ink], flipped = mirrored[c.ink];
        // a broad haze behind the rays
        const hz = haze[c.ink], hw = aw * 0.24;
        for (let j = 0; j <= 10; j++) {
          const s = j / 10, xN = s * 1.1 - 0.05 + c.fa * Math.sin(TAU * (c.fk * s + c.fw * t) + c.fp);
          const dx = (xN - 0.5) / 0.36, env = Math.exp(-dx * dx) * smooth(-0.1, 0.12, xN) * smooth(1.1, 0.88, xN);
          const base = c.y0 + c.a1 * Math.sin(TAU * (c.k1 * s + c.w1 * t) + c.p1);
          ctx.globalAlpha = clamp(env * (0.25 + 0.75 * N2(s * c.nk + t * c.scroll + c.seed)) * c.alpha * 0.34, 0, 1);
          ctx.drawImage(hz, xN * aw - hw / 2, (base - c.h * 0.72) * ah, hw, c.h * ah * 0.95);
        }
        for (let i = 0; i <= n; i++) {
          const s = i / n;
          const ph1 = TAU * (c.fk * s + c.fw * t) + c.fp, ph2 = TAU * (c.fk * 2.3 * s - c.fw * 1.4 * t) + c.fp * 2;
          const xN = s * 1.1 - 0.05 + c.fa * Math.sin(ph1) + c.fa * 0.5 * Math.sin(ph2);
          if (xN < -0.03 || xN > 1.03) continue;
          // Where the curtain folds, rays bunch up and it glows brighter, but never to a spike.
          const dxds = 1.1 + c.fa * TAU * c.fk * (Math.cos(ph1) + 1.15 * Math.cos(ph2));
          const fold = clamp(Math.abs(dxds) * 2.2, 0, 1);
          const dx = (xN - 0.5) / 0.36;
          const env = Math.exp(-dx * dx) * smooth(-0.03, 0.14, xN) * smooth(1.03, 0.86, xN);
          let I = env * (0.2 + 0.8 * Math.pow(N2(s * c.nk + t * c.scroll + c.seed), 1.7));
          I *= 0.62 + 0.38 * N3(s * 55 + t * 0.3 + c.seed * 3);
          I *= 1 + 0.1 * Math.sin(t * 1.4 + i * 0.41);
          for (const p of c.pulses) {
            const u = (t - p.t0) / p.dur, ds = (s - p.s0 - p.v * (t - p.t0)) / 0.05;
            I += p.amp * env * Math.sin(Math.PI * u) * Math.exp(-ds * ds);
          }
          I *= c.alpha * fold;
          if (I < 0.004) continue;
          const base = c.y0 + c.a1 * Math.sin(TAU * (c.k1 * s + c.w1 * t) + c.p1) + c.a2 * Math.sin(TAU * (c.k2 * s - c.w2 * t) + c.p2);
          const hh = c.h * (0.5 + 0.5 * N1(s * c.hk + t * 0.04 + c.seed));
          ctx.globalAlpha = I > 1 ? 1 : I;
          ctx.drawImage(sprite, xN * aw - rw / 2, (base - hh) * ah, rw, (hh / 0.94) * ah);
          // the reflection: every other ray, upside down, squashed and rippling
          if (i & 1) continue;
          const top = hy + (hy - base - hh * 0.064) * sq;
          if (top > 1) continue;
          const wob = Math.sin(t * 1.1 + top * 40) * 0.004 * (1 + (top - hy) * 12);
          lk.globalAlpha = (I > 1 ? 1 : I) * 0.55;
          lk.drawImage(flipped, (xN + wob) * S.w * lx - rw * 1.2 * (W / aw), top * S.h * ly, rw * 2.4 * (W / aw), (hh / 0.94) * sq * S.h * ly);
        }
      }
      ctx.globalAlpha = 1;
      lk.globalAlpha = 1;
    }

    function drawFx(S, dt, t) {
      const L = fx, ctx = L.ctx, k = L.sx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, L.c.width, L.c.height);
      ctx.globalCompositeOperation = 'lighter';
      for (const s of twinkles) {
        const a = s.a * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
        const r = s.r * k;
        ctx.globalAlpha = a;
        ctx.drawImage(s.big ? starBig : star, s.x * k - r, s.y * k - r, r * 2, r * 2);
      }
      // a shooting star now and then
      if (!meteor && t > nextMeteor) {
        const dir = Math.random() < 0.5 ? -1 : 1, ang = rand(0.3, 0.6);
        meteor = { x: rand(0.2, 0.8) * S.w, y: rand(0.04, 0.3) * yH, vx: dir * Math.cos(ang) * S.w * 0.75, vy: Math.sin(ang) * S.w * 0.75, age: 0, life: rand(0.6, 1) };
        nextMeteor = t + rand(12, 28);
      }
      if (meteor) {
        const m = meteor;
        m.age += dt;
        m.x += m.vx * dt; m.y += m.vy * dt;
        const fade = Math.sin(Math.PI * clamp(m.age / m.life, 0, 1));
        const len = 0.1;
        const tx = m.x - m.vx * len, ty = m.y - m.vy * len;
        const g = ctx.createLinearGradient(m.x * k, m.y * k, tx * k, ty * k);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
        g.addColorStop(0.3, `rgba(170,230,255,${0.35 * fade})`);
        g.addColorStop(1, 'rgba(170,230,255,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = (preview ? 0.7 : 1.4) * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x * k, m.y * k);
        ctx.lineTo(tx * k, ty * k);
        ctx.stroke();
        if (m.age > m.life || m.y > yH) meteor = null;
      }
      ctx.globalAlpha = 1;
    }

    return runScene(container, opts, {
      cls: 'ss-aurora',
      noMain: true,
      maxDpr: 1.5,
      budget: 3e6,
      setup(S) {
        sky = S.addLayer('ss-sky', { alpha: false });
        fx = S.addLayer('ss-fx');
        aur = S.addLayer('ss-aur', { alpha: false, scaleFn: (s) => Math.min(0.5, 760 / s.w) * (s.preview ? 1 : Math.max(0.7, s.quality)) });
        mtn = S.addLayer('ss-mtn');
        lake = S.addLayer('ss-lake', { alpha: false, scaleFn: (s) => (s.preview ? 0.6 : 0.3) });
        front = S.addLayer('ss-front');
        sprites = AURORA_INKS.map(curtainSprite);
        mirrored = sprites.map((sp) => {
          const c = canvas(sp.width, sp.height), x = c.getContext('2d');
          x.translate(0, sp.height);
          x.scale(1, -1);
          x.drawImage(sp, 0, 0);
          return c;
        });
        haze = [[60, 255, 150], [60, 190, 255], [90, 240, 200]].map((rgb) => tintGlow(64, rgb, 0.3));
        star = glowSprite(24, 0.1);
        starBig = glowSprite(32, 0.06);
        const bx = starBig.getContext('2d');
        bx.globalCompositeOperation = 'lighter';
        bx.fillStyle = 'rgba(255,255,255,0.5)';
        bx.fillRect(15.5, 2, 1, 28);
        bx.fillRect(2, 15.5, 28, 1);
        curtains = makeCurtains();
      },
      resize(S) {
        yH = S.h * 0.8;
        paintSky(S);
        paintMountains(S);
        paintFront(S);
        paintTwinkles(S);
      },
      frame(S, dt, t) {
        drawAurora(S, dt, t);
        drawFx(S, dt, t);
      },
    });
  }

  // ============================================================ 4. Glass Shapes
  // Two color-cycling polygons whose corners bounce around the screen,
  // trailing echoes of where they've been. Lines are drawn like glass rods:
  // a colored body with a white glint, a faint pane of glass across the
  // newest shape, and a soft glow over everything.
  function createMystify(container, opts) {
    const ECHOES = 11, LAG = 0.085;
    let shapes = [], hist = [], glow = null;

    function make(S, hue) {
      const pts = [];
      for (let i = 0; i < 4; i++) {
        let a = rand(0, TAU);
        // avoid nearly axis-aligned corners; they look stuck against the edges
        while (Math.abs(Math.sin(2 * a)) < 0.35) a = rand(0, TAU);
        const sp = S.s * rand(0.22, 0.36);
        pts.push({ x: rand(0.1, 0.9) * S.w, y: rand(0.1, 0.9) * S.h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
      }
      return { pts, hue, rate: rand(16, 26) };
    }

    function snapshot(t) {
      const xy = new Float32Array(shapes.length * 8), hues = new Float32Array(shapes.length);
      shapes.forEach((sh, i) => { sh.pts.forEach((p, j) => { xy[i * 8 + j * 2] = p.x; xy[i * 8 + j * 2 + 1] = p.y; }); hues[i] = sh.hue; });
      hist.push({ t, xy, hues });
      const keep = t - ECHOES * LAG - 0.3;
      while (hist.length > 2 && hist[1].t < keep) hist.shift();
    }
    // The recorded frame closest to time tt (walking back from index i).
    function at(tt, i) {
      while (i > 0 && hist[i].t > tt) i--;
      return i;
    }

    function draw(S, t) {
      const ctx = S.ctx, k = S.sx, u = Math.max(0.55, S.s / 700);
      glow.run(S.canvas); // last frame's pixels, already rendered
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S.canvas.width, S.canvas.height);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      let idx = hist.length - 1;
      for (let e = ECHOES - 1; e >= 0; e--) {
        const i = at(t - e * LAG, idx);
        const fr = hist[i];
        const a = Math.pow(1 - e / ECHOES, 1.35);
        for (let s = 0; s < shapes.length; s++) {
          const xy = fr.xy, o = s * 8;
          ctx.beginPath();
          ctx.moveTo(xy[o], xy[o + 1]);
          for (let j = 1; j < 4; j++) ctx.lineTo(xy[o + j * 2], xy[o + j * 2 + 1]);
          ctx.closePath();
          const col = hsl(fr.hues[s], 0.95, 0.6);
          if (e === 0) {
            ctx.globalAlpha = 0.07;
            ctx.fillStyle = rgba(col, 1);
            ctx.fill('evenodd');
          }
          ctx.globalAlpha = a;
          ctx.strokeStyle = rgba(col, 1);
          ctx.lineWidth = 2.4 * u;
          ctx.stroke();
          ctx.globalAlpha = a * (e < 3 ? 0.7 : 0.4);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 0.7 * u;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    return runScene(container, opts, {
      cls: 'ss-mystify',
      alpha: false,
      maxDpr: 1.5,
      budget: 3.2e6,
      setup(S) { glow = makeGlow(S.root, 0.85, 0.01); },
      degrade(S) { if (S.quality < 0.7) glow.off(); },
      resize(S) {
        glow.resize(S);
        if (!shapes.length) shapes = [make(S, rand(170, 210)), make(S, rand(90, 130))];
        for (const sh of shapes) for (const p of sh.pts) { p.x = clamp(p.x, 0, S.w); p.y = clamp(p.y, 0, S.h); }
        hist = [];
        snapshot(S.t);
      },
      frame(S, dt, t) {
        const W = S.w, H = S.h;
        for (const sh of shapes) {
          sh.hue += sh.rate * dt;
          for (const p of sh.pts) {
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.x < 0) { p.x = -p.x; p.vx = Math.abs(p.vx); }
            if (p.x > W) { p.x = 2 * W - p.x; p.vx = -Math.abs(p.vx); }
            if (p.y < 0) { p.y = -p.y; p.vy = Math.abs(p.vy); }
            if (p.y > H) { p.y = 2 * H - p.y; p.vy = -Math.abs(p.vy); }
          }
        }
        snapshot(t);
        draw(S, t);
      },
    });
  }

  // ============================================================ 5. 3D Text
  // Your words in extruded chrome or blue glass, turning in 3D with one of four
  // motions (spin, see-saw, wobble, tumble) that take turns, above a glossy
  // floor holding a soft reflection. The letters are a stack of cached slices
  // drawn with perspective; the face is relit every frame as it turns.
  const TEXT_MATERIALS = {
    chrome: {
      face: [[0, '#fbfdff'], [0.3, '#d3e4f4'], [0.47, '#8ba4bf'], [0.5, '#34475e'], [0.57, '#56728f'], [0.8, '#adc8df'], [1, '#f0f8ff']],
      sides: [['#5d6f84', '#18222e'], ['#8ea1b6', '#2f3e50'], ['#d2dde9', '#56697f']],
      line: 'rgba(8,24,44,0.55)', floor: [150, 205, 255],
    },
    glass: {
      face: [[0, '#effcff'], [0.46, '#a6e6ff'], [0.5, '#39b3f2'], [0.78, '#0b74c9'], [1, '#48d6ff']],
      sides: [['#0b4580', '#041a33'], ['#1a70b3', '#07345f'], ['#55c0f2', '#0c5796']],
      line: 'rgba(0,36,80,0.6)', floor: [80, 190, 255],
    },
  };
  const qmul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
  function qEuler(pitch, yaw, roll) {
    const qx = [Math.sin(pitch / 2), 0, 0, Math.cos(pitch / 2)];
    const qy = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
    const qz = [0, 0, Math.sin(roll / 2), Math.cos(roll / 2)];
    return qmul(qmul(qy, qx), qz);
  }
  function qSlerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map((v) => -v); d = -d; }
    if (d > 0.9995) {
      const r = a.map((v, i) => v + (b[i] - v) * t), l = Math.hypot(r[0], r[1], r[2], r[3]);
      return r.map((v) => v / l);
    }
    const th = Math.acos(d), s0 = Math.sin((1 - t) * th) / Math.sin(th), s1 = Math.sin(t * th) / Math.sin(th);
    return a.map((v, i) => v * s0 + b[i] * s1);
  }
  // Row-major 3x3 rotation matrix.
  function qMat(q) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    return [
      1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
      2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
      2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
    ];
  }
  const TEXT_MOTIONS = {
    spin: (t) => qEuler(0.12 * Math.sin(t * 0.4), t * 0.9, 0.04 * Math.sin(t * 0.3)),
    seesaw: (t) => qEuler(0.1 * Math.sin(t * 0.7), 0.3 * Math.sin(t * 0.55), 0.3 * Math.sin(t * 1.05)),
    wobble: (t) => qEuler(0.36 * Math.sin(t * 1.2), 0.46 * Math.sin(t * 0.8), 0.05 * Math.sin(t * 0.6)),
    tumble: (t) => qEuler(t * 0.75, 0.4 * Math.sin(t * 0.33) + t * 0.18, 0.1 * Math.sin(t * 0.5)),
  };
  const TEXT_FONT = (px) => `600 ${px}px Selawik, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;

  function create3DText(container, opts) {
    const preview = !!opts.preview;
    const T = {};
    const mat = TEXT_MATERIALS[Math.random() < 0.6 ? 'chrome' : 'glass'];
    const order = A.util.shuffle(Object.keys(TEXT_MOTIONS));
    const HOLD = preview ? 12 : 18, BLEND = 2.5;
    const LIGHT = norm3([-0.3, -0.5, 0.8]);
    const measure = canvas(8, 8).getContext('2d');
    let text = clean(opts.text), needBuild = false, unsub = null;
    let mi = 0, cur = { name: order[0], t0: 0 }, prev = null;
    let refl = null, reflX = null, floorGrad = null;

    function clean(v) {
      const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
      return (s || 'Aerium').slice(0, 40);
    }
    // Long phrases wrap onto two lines at the space nearest the middle.
    function split(s) {
      if (s.length <= 16 || s.indexOf(' ') < 0) return [s];
      let best = -1;
      for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (best < 0 || Math.abs(i - s.length / 2) < Math.abs(best - s.length / 2))) best = i;
      return [s.slice(0, best), s.slice(best + 1)];
    }

    function build(S) {
      needBuild = false;
      const ls = split(text), lh = 1.08;
      measure.font = TEXT_FONT(100);
      const mw = Math.max(1, ...ls.map((l) => measure.measureText(l).width)) / 100;
      const fs = Math.max(6, Math.min(S.h * (ls.length > 1 ? 0.15 : 0.26), (S.w * (ls.length > 1 ? 0.6 : 0.72)) / mw));
      T.fs = fs;
      T.tw = mw * fs;
      T.th = ls.length * lh * fs;
      T.depth = fs * 0.26;
      T.F = Math.max(S.w, S.h) * 1.35;       // camera distance, in CSS px
      T.cy0 = S.h * (ls.length > 1 ? 0.42 : 0.44);
      // clear the floor even when a wide phrase rolls (see-saw) or pitches (wobble)
      const reach = (T.th / 2) * 1.02 + (T.tw / 2) * 0.3 + T.depth * 0.3;
      T.yF = Math.min(S.h * 0.95, T.cy0 + reach * 1.08 + S.h * 0.025);
      S.root.style.setProperty('--ss-floor', ((T.yF / S.h) * 100).toFixed(2) + '%');
      const pad = fs * 0.14;
      T.sc = Math.min(S.dpr, 2400 / (T.tw + pad * 2), 800 / (T.th + pad * 2));
      const sw = Math.ceil((T.tw + pad * 2) * T.sc), sh = Math.ceil((T.th + pad * 2) * T.sc);
      T.sw = sw; T.sh = sh; T.cx = sw / 2; T.cy = sh / 2;
      const px = fs * T.sc, top = T.cy - (T.th / 2) * T.sc, bottom = T.cy + (T.th / 2) * T.sc;
      const write = (c, style, stroke) => {
        const x = c.getContext('2d');
        x.font = TEXT_FONT(px);
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.lineJoin = 'round';
        style(x);
        ls.forEach((l, i) => {
          const y = T.cy + (i - (ls.length - 1) / 2) * lh * px;
          if (stroke) x.strokeText(l, T.cx, y); else x.fillText(l, T.cx, y);
        });
        return x;
      };
      T.mask = canvas(sw, sh);
      write(T.mask, (x) => { x.fillStyle = '#fff'; });
      // the walls: three shades, lit from above, lighter toward the face
      T.sides = mat.sides.map(([a, b]) => {
        const c = canvas(sw, sh);
        write(c, (x) => { const g = x.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; });
        return c;
      });
      // bevel: a lit upper edge, a shaded lower edge and a fine outline, inside the letters
      T.bevel = canvas(sw, sh);
      const bx = write(T.bevel, (x) => {
        const g = x.createLinearGradient(0, top, 0, bottom);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.5, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(0,20,40,0.35)');
        x.strokeStyle = g;
        x.lineWidth = px * 0.07;
      }, true);
      bx.lineWidth = Math.max(1, px * 0.014);
      bx.strokeStyle = mat.line;
      ls.forEach((l, i) => bx.strokeText(l, T.cx, T.cy + (i - (ls.length - 1) / 2) * lh * px));
      bx.globalCompositeOperation = 'destination-in';
      bx.drawImage(T.mask, 0, 0);
      // Two faces and a reflection drawn a frame ahead: every canvas is drawn
      // one frame before it is used, so the GPU never makes the page wait.
      T.faces = [canvas(sw, sh), canvas(sw, sh)];
      T.fi = 0;
      // reflection at half resolution
      T.rk = S.sx * 0.5;
      refl = canvas(S.w * T.rk, Math.max(1, (S.h - T.yF) * T.rk));
      reflX = refl.getContext('2d');
      floorGrad = null;
    }

    // Relight the face: the reflected horizon slides as it tilts, a sheen sweeps as it turns.
    function updateFace(face, M, front, t) {
      const x = face.getContext('2d'), sw = T.sw, sh = T.sh, th = T.th * T.sc;
      const nx = front ? M[2] : -M[2], ny = front ? M[5] : -M[5], nz = front ? M[8] : -M[8];
      const shift = -ny * th * 0.55;
      x.globalCompositeOperation = 'copy';
      const g = x.createLinearGradient(0, T.cy - th / 2 + shift, 0, T.cy + th / 2 + shift);
      mat.face.forEach(([o, c]) => g.addColorStop(o, c));
      x.fillStyle = g;
      x.fillRect(0, 0, sw, sh);
      x.globalCompositeOperation = 'destination-in';
      x.drawImage(T.mask, 0, 0);
      x.globalCompositeOperation = 'source-over';
      x.drawImage(T.bevel, 0, 0);
      x.globalCompositeOperation = 'source-atop';
      const band = sw * 0.22, cxs = T.cx + (-nx * 1.4 + 0.3 * Math.sin(t * 0.35)) * sw * 0.5;
      const sg = x.createLinearGradient(cxs - band, 0, cxs + band, band * 0.5);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = sg;
      x.fillRect(0, 0, sw, sh);
      // turned away from the light, the face falls into shade
      const nl = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
      const dark = clamp(0.55 - nl * 0.65, 0, 0.6);
      if (dark > 0.01) {
        x.fillStyle = `rgba(2,12,26,${dark.toFixed(3)})`;
        x.fillRect(0, 0, sw, sh);
      }
      x.globalCompositeOperation = 'source-over';
    }

    function slice(x, M, z, cx, cy, k0, mirror) {
      const ps = T.F / (T.F - M[8] * z), k = (k0 * ps) / T.sc;
      let b = k * M[3], d = k * M[4];
      const a = k * M[0], c = k * M[1];
      const e = k0 * (cx + ps * M[2] * z) - a * T.cx - c * T.cy;
      let f = k0 * (cy + ps * M[5] * z) - b * T.cx - d * T.cy;
      // mirrored about the floor; in the reflection canvas the floor is y = 0
      if (mirror) { b = -b; d = -d; f = k0 * T.yF - f; }
      x.setTransform(a, b, c, d, e, f);
    }
    function drawObject(x, M, front, cx, cy, n, k0, mirror, face) {
      const half = T.depth / 2;
      for (let i = 0; i <= n; i++) {
        const f = i / n, z = front ? lerp(-half, half, f) : lerp(half, -half, f);
        slice(x, M, z, cx, cy, k0, mirror);
        x.drawImage(i === n ? face : T.sides[f > 0.78 ? 2 : f > 0.38 ? 1 : 0], 0, 0);
      }
    }

    function frame(S, dt, t) {
      if (needBuild) build(S);
      if (t - cur.t0 > HOLD) { prev = cur; mi = (mi + 1) % order.length; cur = { name: order[mi], t0: t }; }
      let q = TEXT_MOTIONS[cur.name](t - cur.t0);
      if (prev) {
        const u = (t - cur.t0) / BLEND;
        if (u >= 1) prev = null;
        else q = qSlerp(TEXT_MOTIONS[prev.name](t - prev.t0), q, u * u * (3 - 2 * u));
      }
      const M = qMat(q), front = M[8] >= 0;
      const cx = S.w / 2 + S.w * 0.05 * Math.sin(t * 0.11), cy = T.cy0 + S.h * 0.018 * Math.sin(t * 0.23);
      const ctx = S.ctx, k = S.sx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
      const face = T.faces[T.fi];
      if (!T.primed) { updateFace(face, M, front, t); T.primed = true; }
      // enough slices that the walls look solid, and no more
      const half = T.depth / 2, pf = T.F / (T.F - Math.abs(M[8]) * half), pb = T.F / (T.F + Math.abs(M[8]) * half);
      const shift = Math.hypot(M[2], M[5]) * T.depth * pf + (pf - pb) * Math.hypot(T.tw, T.th) * 0.5;
      const n = clamp(Math.ceil((shift * k) / 1.25), 2, preview ? 24 : 56);
      // a pool of light on the floor
      if (!floorGrad) {
        floorGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        floorGrad.addColorStop(0, rgba(mat.floor, 0.2));
        floorGrad.addColorStop(0.55, rgba(mat.floor, 0.06));
        floorGrad.addColorStop(1, rgba(mat.floor, 0));
      }
      const lift = 1 - (cy - T.cy0) / (S.h * 0.05);
      ctx.setTransform(k * T.tw * 0.55, 0, 0, k * T.fs * 0.3, k * cx, k * T.yF);
      ctx.globalAlpha = clamp(0.75 + lift * 0.25, 0, 1);
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      // last frame's reflection, then the letters themselves
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(refl, 0, T.yF * k, S.w * k, (S.h - T.yF) * k);
      drawObject(ctx, M, front, cx, cy, n, k, false, face);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // the reflection for next frame, fading into the floor
      const rx = reflX;
      rx.setTransform(1, 0, 0, 1, 0, 0);
      rx.globalCompositeOperation = 'source-over';
      rx.clearRect(0, 0, refl.width, refl.height);
      drawObject(rx, M, front, cx, cy, Math.max(2, Math.ceil(n / 2)), T.rk, true, face);
      rx.setTransform(1, 0, 0, 1, 0, 0);
      rx.globalCompositeOperation = 'destination-in';
      const fade = rx.createLinearGradient(0, 0, 0, Math.min(refl.height, T.th * 0.9 * T.rk));
      fade.addColorStop(0, 'rgba(0,0,0,0.42)');
      fade.addColorStop(0.5, 'rgba(0,0,0,0.12)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      rx.fillStyle = fade;
      rx.fillRect(0, 0, refl.width, refl.height);
      rx.globalCompositeOperation = 'source-over';
      // and the face for next frame
      T.fi ^= 1;
      updateFace(T.faces[T.fi], M, front, t);
    }

    return runScene(container, opts, {
      cls: 'ss-3dtext',
      maxDpr: 1.5,
      budget: 3.2e6,
      setup() {
        if (document.fonts && document.fonts.check && !document.fonts.check(TEXT_FONT(40))) {
          document.fonts.load(TEXT_FONT(40)).then(() => { needBuild = true; }, () => {});
        }
        // Personalization edits the text live: follow along in the preview.
        unsub = A.store.on('screensaver.text', (v) => { text = clean(v); needBuild = true; });
      },
      resize(S) { build(S); },
      frame,
      dispose() { if (unsub) unsub(); },
    });
  }

  // ============================================================ 6. Photos
  // A slideshow of every picture under /Pictures. Each one is painted once to
  // a canvas, then crossfades in while the compositor runs a slow Ken Burns
  // pan and zoom (CSS transitions), so it costs next to nothing as it plays.
  function collectPictures(dir, depth, out) {
    let items = [];
    try { items = A.fs.list(dir) || []; } catch (e) { return out; }
    for (const it of items) {
      if (out.length >= 400) break;
      if (it.type === 'folder') { if (depth < 8) collectPictures(it.path, depth + 1, out); continue; }
      let raw = null;
      try { raw = A.fs.read(it.path); } catch (e) { raw = null; }
      if (typeof raw === 'string' && raw.startsWith('asset:') && !hasAsset(raw.slice(6))) continue;
      let url = null;
      try { url = A.fs.thumbFor(it.path); } catch (e) { url = null; }
      if (url) out.push({ path: it.path, name: A.fs.stem(it.path), url });
    }
    return out;
  }

  function createPhotos(container, opts) {
    const preview = !!opts.preview;
    const root = mount(container, 'ss-photos');
    const SHOW = preview ? 5.5 : 7, FADE = preview ? 1.4 : 2;
    const timers = new Set();
    let alive = true, idx = 0, flip = 0, fails = 0, z = 1, shown = null;
    const later = (fn, ms) => {
      const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms);
      timers.add(id);
    };
    const pics = A.util.shuffle(collectPictures('/Pictures', 0, []));
    const slides = [0, 1].map(() => root.appendChild(h('canvas.ss-photo')));
    const cap = h('div.ss-photo-cap');
    if (!preview) root.appendChild(cap);

    function size() {
      return [Math.max(1, root.clientWidth || opts.width || 320), Math.max(1, root.clientHeight || opts.height || 200)];
    }
    function paint(c, img) {
      const [W, H] = size();
      fitCanvas(c, W, H, Math.min(window.devicePixelRatio || 1, preview ? 2 : 1.5));
      const x = c.getContext('2d');
      x.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = 'high';
      const iw = img.naturalWidth || img.width || 1600, ih = img.naturalHeight || img.height || 1000;
      x.fillStyle = '#000';
      x.fillRect(0, 0, W, H);
      if (preview || iw >= W * 0.55 || ih >= H * 0.55) {
        const sc = Math.max(W / iw, H / ih);
        x.drawImage(img, (W - iw * sc) / 2, (H - ih * sc) / 2, iw * sc, ih * sc);
        return;
      }
      // A small picture: a blurred wash of itself behind a framed print.
      const tiny = canvas(24, 16);
      tiny.getContext('2d').drawImage(img, 0, 0, 24, 16);
      x.drawImage(tiny, -W * 0.05, -H * 0.05, W * 1.1, H * 1.1);
      x.fillStyle = 'rgba(0,10,25,0.4)';
      x.fillRect(0, 0, W, H);
      const sc = Math.min(2, (W * 0.62) / iw, (H * 0.62) / ih);
      const w = iw * sc, hh = ih * sc, px = (W - w) / 2, py = (H - hh) / 2, b = Math.max(6, Math.min(W, H) * 0.012);
      x.shadowColor = 'rgba(0,0,0,0.5)';
      x.shadowBlur = 30;
      x.shadowOffsetY = 8;
      x.fillStyle = '#fbfdff';
      x.fillRect(px - b, py - b, w + b * 2, hh + b * 2);
      x.shadowColor = 'transparent';
      x.drawImage(img, px, py, w, hh);
    }
    // Start somewhere, drift to somewhere else; never showing an edge.
    function kenBurns(c) {
      let s0 = rand(1.03, 1.1), s1 = rand(1.16, 1.26);
      if (Math.random() < 0.5) { const tmp = s0; s0 = s1; s1 = tmp; }
      const a = rand(0, TAU), m0 = ((s0 - 1) / 2) * 90, m1 = ((s1 - 1) / 2) * 90;
      c.style.transition = 'none';
      c.style.opacity = '0';
      c.style.transform = `translate(${(Math.cos(a) * m0).toFixed(2)}%, ${(Math.sin(a) * m0).toFixed(2)}%) scale(${s0.toFixed(3)})`;
      void c.offsetWidth;
      c.style.transition = `opacity ${FADE}s ease-in-out, transform ${SHOW + FADE * 2}s linear`;
      c.style.opacity = '1';
      c.style.transform = `translate(${(-Math.cos(a) * m1).toFixed(2)}%, ${(-Math.sin(a) * m1).toFixed(2)}%) scale(${s1.toFixed(3)})`;
    }
    function next() {
      const pic = pics[idx % pics.length];
      idx++;
      A.util.loadImage(pic.url).then((img) => {
        if (!alive) return;
        fails = 0;
        const c = slides[flip], old = slides[flip ^ 1];
        flip ^= 1;
        paint(c, img);
        shown = { c, img };
        c.style.zIndex = String(++z);
        kenBurns(c);
        if (!preview) {
          cap.classList.remove('on');
          later(() => { cap.textContent = pic.name; cap.classList.add('on'); }, FADE * 1000);
          later(() => cap.classList.remove('on'), (FADE + 4.5) * 1000);
        }
        later(() => { old.style.transition = 'none'; old.style.opacity = '0'; }, FADE * 1000 + 120);
        later(next, SHOW * 1000);
      }, () => {
        if (!alive) return;
        if (++fails >= pics.length) { empty(); return; }
        later(next, 30);
      });
    }
    function empty() {
      root.classList.add('ss-photos-none');
      root.appendChild(h('div.ss-photo-empty', null,
        h('div.ss-photo-card', null,
          h('img.ss-photo-icon', { src: A.icon('photo'), alt: '' }),
          h('div.ss-photo-title', null, preview ? 'No pictures yet' : 'Your pictures will play here'),
          preview ? null : h('div.ss-photo-text', null, 'Put some pictures in your Pictures folder and they will show up here as a slideshow.'))));
    }

    // Keep the current picture sharp and in proportion if the screen changes size.
    let ro = null, pending = 0;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => {
        clearTimeout(pending);
        pending = setTimeout(() => { if (alive && shown) paint(shown.c, shown.img); }, 150);
      });
      ro.observe(root);
    }

    if (pics.length) next(); else empty();
    return {
      destroy() {
        alive = false;
        timers.forEach(clearTimeout);
        timers.clear();
        clearTimeout(pending);
        if (ro) ro.disconnect();
        root.remove();
      },
    };
  }

  // ============================================================ 7. Aquarium
  // The living fish tank, full screen. If the tank isn't available, a calm
  // underwater scene of light rays, drifting motes and rising bubbles.
  function createAquarium(container, opts) {
    if (A.aquarium && typeof A.aquarium.create === 'function') {
      const root = mount(container, 'ss-aquarium');
      try {
        const ctrl = A.aquarium.create(root, { mode: 'tank', preview: !!opts.preview, interactive: false });
        if (ctrl) {
          return {
            destroy() {
              try { if (ctrl.destroy) ctrl.destroy(); } catch (e) { /* ignore */ }
              root.remove();
            },
          };
        }
      } catch (e) { /* use the underwater scene below */ }
      root.remove();
    }
    return createUnderwater(container, opts);
  }

  function bubbleSprite(size) {
    const c = canvas(size, size), x = c.getContext('2d'), m = size / 2, r = m - 1;
    const g = x.createRadialGradient(m, m, r * 0.5, m, m, r);
    g.addColorStop(0, 'rgba(180,235,255,0.04)');
    g.addColorStop(0.78, 'rgba(200,240,255,0.22)');
    g.addColorStop(1, 'rgba(235,250,255,0.8)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(m, m, r, 0, TAU);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.9)';
    x.beginPath();
    x.ellipse(m - r * 0.36, m - r * 0.4, r * 0.28, r * 0.15, -0.65, 0, TAU);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.35)';
    x.beginPath();
    x.ellipse(m + r * 0.35, m + r * 0.42, r * 0.16, r * 0.08, -0.65, 0, TAU);
    x.fill();
    return c;
  }
  function raySprite() {
    const w = 64, hh = 256, c = canvas(w, hh), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, hh);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(w * 0.36, 0);
    x.lineTo(w * 0.64, 0);
    x.lineTo(w, hh);
    x.lineTo(0, hh);
    x.closePath();
    x.fill();
    x.globalCompositeOperation = 'destination-in';
    const hg = x.createLinearGradient(0, 0, w, 0);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.5, 'rgba(0,0,0,1)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hg;
    x.fillRect(0, 0, w, hh);
    return c;
  }

  function createUnderwater(container, opts) {
    const preview = !!opts.preview;
    let rays = [], bubbles = [], motes = [], weeds = [], streams = [], bub = null, ray = null, mote = null;
    function blow(S, x, y, r) {
      bubbles.push({ x, y, r, vy: -(S.s * 0.07 + r * 7), ph: rand(0, TAU), wob: rand(0.8, 2) * r, f: rand(1.6, 3.2) });
    }
    return runScene(container, opts, {
      cls: 'ss-under',
      maxDpr: 1.5,
      budget: 3e6,
      setup() {
        bub = bubbleSprite(64);
        ray = raySprite();
        mote = glowSprite(16, 0.25);
      },
      resize(S) {
        const u = Math.max(0.5, S.s / 700), nr = preview ? 4 : 7;
        rays = Array.from({ length: nr }, (_, i) => ({ x: (i + 0.5) / nr + rand(-0.05, 0.05), w: rand(0.07, 0.13), ph: rand(0, TAU), sp: rand(0.1, 0.22), a: rand(0.22, 0.42) }));
        streams = [{ x: rand(0.15, 0.3), acc: 0 }, { x: rand(0.7, 0.85), acc: 0 }];
        motes = Array.from({ length: preview ? 18 : 70 }, () => ({ x: rand(0, S.w), y: rand(0, S.h), r: rand(1.5, 4) * u, vx: rand(-4, 4) * u, vy: rand(-7, 2) * u, ph: rand(0, TAU) }));
        weeds = Array.from({ length: preview ? 7 : 16 }, () => ({ x: rand(0, S.w), h: S.h * rand(0.1, 0.28), w: rand(5, 11) * u, ph: rand(0, TAU), sp: rand(0.45, 1) }));
        bubbles = [];
        for (let i = 0; i < (preview ? 8 : 26); i++) blow(S, rand(0, S.w), rand(0, S.h), rand(2, 9) * u);
      },
      frame(S, dt, t) {
        const ctx = S.ctx, k = S.sx, W = S.w, H = S.h, u = Math.max(0.5, S.s / 700);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
        // sunlight slanting down from the surface, swaying
        ctx.globalCompositeOperation = 'lighter';
        for (const r of rays) {
          const lean = Math.sin(t * r.sp + r.ph) * 0.12, w = r.w * W, hh = H * 0.95;
          ctx.globalAlpha = r.a * (0.75 + 0.25 * Math.sin(t * 0.6 + r.ph * 2));
          ctx.setTransform((k * w) / 64, 0, (k * lean * hh) / 256, (k * hh) / 256, k * (r.x * W - w / 2), 0);
          ctx.drawImage(ray, 0, 0);
        }
        // light rippling on the underside of the surface
        ctx.setTransform(k, 0, 0, k, 0, 0);
        ctx.strokeStyle = 'rgba(200,245,255,1)';
        ctx.lineWidth = 1.2 * u;
        for (let j = 0; j < 4; j++) {
          ctx.globalAlpha = 0.16 - j * 0.03;
          ctx.beginPath();
          for (let i = 0; i <= 48; i++) {
            const x = (i / 48) * W;
            const y = H * (0.025 + j * 0.02) + Math.sin(x * 0.018 / u + t * (0.9 + j * 0.3) + j) * H * 0.006 + Math.sin(x * 0.047 / u - t * 1.6) * H * 0.004;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        // drifting motes
        for (const m of motes) {
          m.x += (m.vx + Math.sin(t * 0.5 + m.ph) * 3 * u) * dt;
          m.y += m.vy * dt;
          if (m.y < -5) m.y = H + 5; if (m.y > H + 5) m.y = -5;
          if (m.x < -5) m.x = W + 5; if (m.x > W + 5) m.x = -5;
          ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 1.3 + m.ph);
          ctx.drawImage(mote, m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
        }
        // swaying blades of weed in silhouette
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(3,36,56,0.88)';
        for (const wd of weeds) {
          const sw = Math.sin(t * wd.sp + wd.ph), tipX = wd.x + sw * wd.h * 0.4, tipY = H - wd.h;
          const midX = wd.x + sw * wd.h * 0.2, midY = H - wd.h * 0.55;
          ctx.beginPath();
          ctx.moveTo(wd.x - wd.w, H + 2);
          ctx.quadraticCurveTo(midX - wd.w * 1.1, midY, tipX, tipY);
          ctx.quadraticCurveTo(midX + wd.w * 0.9, midY, wd.x + wd.w, H + 2);
          ctx.closePath();
          ctx.fill();
        }
        // bubbles: two air stones and the odd stray
        for (const st of streams) {
          st.acc += dt;
          while (st.acc > 0.17) { st.acc -= 0.17; blow(S, st.x * W + rand(-3, 3) * u, H + 6, rand(1.5, 4.5) * u); }
        }
        if (Math.random() < dt * (preview ? 1 : 2.5)) blow(S, rand(0, W), H + 12, rand(3, 10) * u);
        ctx.globalAlpha = 0.9;
        for (const b of bubbles) {
          b.y += b.vy * dt;
          const x = b.x + Math.sin(t * b.f + b.ph) * b.wob;
          ctx.drawImage(bub, x - b.r, b.y - b.r, b.r * 2, b.r * 2);
        }
        bubbles = bubbles.filter((b) => b.y > -b.r * 3);
        ctx.globalAlpha = 1;
      },
    });
  }

  // ============================================================ 8. Aerium Energy
  // Streams of glowing aqua and green light flowing across deep blue. Particles
  // ride a few gently undulating currents (some spiral around them) and leave
  // luminous trails; every so often a burst of sparks blooms and is swept back
  // into the flow. Trails live on the canvas and fade a little every frame.
  function createEnergy(container, opts) {
    const preview = !!opts.preview;
    const COLORS = [[64, 224, 255], [96, 255, 140], [40, 240, 190], [150, 255, 120]];
    const LEVELS = [[0.34, 1.1, 0], [0.6, 1.5, 0.12], [0.95, 2.1, 0.6]]; // alpha, width, whiteness
    let bands = [], parts = [], sparks = [], flashes = [], glow = null, dot = null, nextBurst = rand(3, 5), styles = [];
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

    function makeBands() {
      const n = preview ? 3 : 4;
      bands = [];
      for (let i = 0; i < n; i++) {
        bands.push({
          c: 0.3 + (i / (n - 1)) * 0.42 + rand(-0.04, 0.04),
          slope: rand(-0.38, -0.12),
          a1: rand(0.07, 0.12), k1: rand(0.55, 1.05), w1: rand(0.035, 0.07) * (Math.random() < 0.5 ? -1 : 1), p1: rand(0, TAU),
          a2: rand(0.02, 0.045), k2: rand(1.5, 2.5), w2: rand(0.05, 0.1), p2: rand(0, TAU),
          width: rand(0.02, 0.045),
          speed: rand(0.13, 0.2),
          col: COLORS[i % COLORS.length],
        });
      }
      styles = bands.map((b) => LEVELS.map(([a, , wh]) => rgba([lerp(b.col[0], 255, wh), lerp(b.col[1], 255, wh), lerp(b.col[2], 255, wh)], a)));
    }
    // Height of a current (0..1) at x (0..1) and time t.
    function bandY(b, xN, t) {
      return b.c + b.slope * (xN - 0.5) + b.a1 * Math.sin(TAU * (b.k1 * xN + b.w1 * t) + b.p1) + b.a2 * Math.sin(TAU * (b.k2 * xN - b.w2 * t) + b.p2);
    }
    function spawn(S, p, anywhere) {
      const bi = Math.floor(Math.random() * bands.length), b = bands[bi];
      p.b = bi;
      p.x = (anywhere ? rand(-0.05, 1.05) : rand(-0.12, -0.01)) * S.w;
      p.helix = Math.random() < 0.45;
      p.off = gauss() * b.width * (p.helix ? 0.35 : 1);
      p.hr = rand(0.4, 1.1) * b.width;
      p.hw = rand(1.6, 3.4) * (Math.random() < 0.5 ? -1 : 1);
      p.hp = rand(0, TAU);
      p.v = S.w * b.speed * rand(0.75, 1.3);
      p.lvl = Math.random() < 0.09 ? 2 : Math.random() < 0.55 ? 1 : 0;
      p.seed = rand(0, 100);
      p.y = NaN;
    }
    function populate(S) {
      const n = preview ? 130 : Math.round(clamp((S.w * S.h) / 750, 500, 2200) * S.quality);
      while (parts.length < n) { const p = {}; spawn(S, p, true); parts.push(p); }
      parts.length = n;
    }

    function frame(S, dt, t) {
      const ctx = S.ctx, k = S.sx, W = S.w, H = S.h, u = Math.max(0.6, S.s / 800);
      glow.run(S.canvas); // last frame, already rendered
      // Fade the trails: a little toward black, then subtract one level so
      // nothing lingers as a faint ghost.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0,0,0,${(1 - Math.exp(-dt * 6.5)).toFixed(4)})`;
      ctx.fillRect(0, 0, S.canvas.width, S.canvas.height);
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = 'rgb(1,1,1)';
      ctx.fillRect(0, 0, S.canvas.width, S.canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.lineCap = 'round';
      // the currents
      const paths = bands.map(() => LEVELS.map(() => new Path2D()));
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i], b = bands[p.b];
        const px = p.x, py = p.y;
        p.x += p.v * dt;
        const xN = p.x / W;
        let off = p.off + 0.012 * Math.sin(xN * 8 + t * 1.1 + p.seed);
        if (p.helix) off += p.hr * Math.sin(p.hp + t * p.hw);
        p.y = (bandY(b, xN, t) + off) * H;
        if (py === py) { const path = paths[p.b][p.lvl]; path.moveTo(px, py); path.lineTo(p.x, p.y); }
        if (p.x > W * 1.05) spawn(S, p, false);
      }
      for (let bi = 0; bi < bands.length; bi++) {
        for (let l = 0; l < LEVELS.length; l++) {
          ctx.strokeStyle = styles[bi][l];
          ctx.lineWidth = LEVELS[l][1] * u;
          ctx.stroke(paths[bi][l]);
        }
      }
      // bright heads on some of the hottest particles
      const r = 5 * u;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < parts.length; i += 3) {
        const p = parts[i];
        if (p.lvl === 2 && p.y === p.y) ctx.drawImage(dot, p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      // now and then, a burst of sparks
      if (t > nextBurst) {
        nextBurst = t + rand(preview ? 5 : 6, preview ? 9 : 11);
        const b = bands[Math.floor(Math.random() * bands.length)], xN = rand(0.25, 0.75);
        const cx = xN * W, cy = bandY(b, xN, t) * H, n = preview ? 26 : 110;
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU), sp = S.s * rand(0.12, 0.5);
          sparks.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: rand(1.6, 2.6), b });
        }
        flashes.push({ x: cx, y: cy, age: 0, col: b.col });
      }
      if (sparks.length) {
        const young = new Path2D(), old = new Path2D();
        for (const s of sparks) {
          const px = s.x, py = s.y, drag = Math.exp(-dt * 2.2);
          s.age += dt;
          s.vx *= drag; s.vy *= drag;
          if (s.age > 0.45) { // swept back into the current
            const f = 1 - Math.exp(-dt * 1.4);
            s.vx += (W * s.b.speed - s.vx) * f;
            s.vy += ((bandY(s.b, s.x / W, t) * H - s.y) * 1.6 - s.vy) * f;
          }
          s.x += s.vx * dt; s.y += s.vy * dt;
          const path = s.age < s.life * 0.45 ? young : old;
          path.moveTo(px, py);
          path.lineTo(s.x, s.y);
        }
        ctx.lineWidth = 1.8 * u;
        ctx.strokeStyle = 'rgba(225,255,250,0.9)';
        ctx.stroke(young);
        ctx.lineWidth = 1.3 * u;
        ctx.strokeStyle = 'rgba(120,240,230,0.5)';
        ctx.stroke(old);
        sparks = sparks.filter((s) => s.age < s.life);
      }
      for (const f of flashes) {
        f.age += dt;
        const p = f.age / 0.9, rr = S.s * (0.04 + 0.2 * p);
        ctx.globalAlpha = 0.8 * (1 - p) * (1 - p);
        ctx.drawImage(dot, f.x - rr, f.y - rr, rr * 2, rr * 2);
        ctx.globalAlpha = 0.45 * (1 - p);
        ctx.strokeStyle = rgba(f.col, 1);
        ctx.lineWidth = 1.5 * u;
        ctx.beginPath();
        ctx.arc(f.x, f.y, S.s * 0.3 * p, 0, TAU);
        ctx.stroke();
      }
      flashes = flashes.filter((f) => f.age < 0.9);
      ctx.globalAlpha = 1;
    }

    return runScene(container, opts, {
      cls: 'ss-energy',
      alpha: false,
      maxDpr: 1.5,
      budget: 3.2e6,
      setup(S) {
        glow = makeGlow(S.root, 0.8, 0.014);
        dot = glowSprite(32, 0.2);
        makeBands();
      },
      resize(S) { glow.resize(S); populate(S); },
      degrade(S) { populate(S); if (S.quality < 0.7) glow.off(); },
      frame,
      dispose() { parts = []; sparks = []; },
    });
  }

  // ============================================================ register
  const REG = [
    { id: '3dtext', name: '3D Text', create: create3DText },
    { id: 'energy', name: 'Aerium Energy', create: createEnergy },
    { id: 'aquarium', name: 'Aquarium', create: createAquarium },
    { id: 'aurora', name: 'Aurora', create: createAurora },
    { id: 'bubbles', name: 'Bubbles', overDesktop: true, create: createBubbles },
    { id: 'mystify', name: 'Glass Shapes', create: createMystify },
    { id: 'photos', name: 'Photos', create: createPhotos },
    { id: 'ribbons', name: 'Ribbons', create: createRibbons },
  ];
  REG.forEach((def) => {
    A.screensaver.register({
      id: def.id,
      name: def.name,
      overDesktop: !!def.overDesktop,
      create(container, o) { return def.create(container, o || {}); },
    });
  });
})();
