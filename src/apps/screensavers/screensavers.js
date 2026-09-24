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

  // Soft glow: a chain of half-size copies of an opaque (black) canvas. The
  // 1/4 and 1/8 copies are shown as screen-blended layers, scaled up by the
  // compositor, so the glow costs three tiny draws a frame.
  function makeBloom(root, opacities) {
    const cs = [canvas(1, 1), canvas(1, 1), canvas(1, 1)];
    const xs = cs.map((c) => c.getContext('2d', { alpha: false }));
    if (root) {
      [1, 2].forEach((i) => {
        cs[i].className = 'ss-layer ss-glow';
        cs[i].style.opacity = opacities ? opacities[i - 1] : 0.6;
        root.appendChild(cs[i]);
      });
    }
    return {
      run(src, w, hh) {
        let prev = src;
        for (let i = 0; i < 3; i++) {
          const f = 2 << i;
          fitCanvas(cs[i], w, hh, 1 / f);
          const x = xs[i];
          x.globalCompositeOperation = 'copy';
          x.imageSmoothingEnabled = true;
          x.drawImage(prev, 0, 0, cs[i].width, cs[i].height);
          prev = cs[i];
        }
        return cs;
      },
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
  // bright window, a fresnel rim and the fainter inverted reflection from the
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
      // a tall window of six panes: one upright, two cross bars
      const au = Math.abs(u), av = Math.abs(v);
      const inside = smooth(0.3, 0.27, au) * smooth(0.46, 0.43, av);
      if (inside > 0) {
        const bar = Math.abs(av - 0.15);
        const pane = inside * smooth(0.01, 0.028, au) * smooth(0.008, 0.024, bar);
        const L = 20 * pane * (0.8 + 0.25 * (0.5 - v));
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
        const band = 0.1 * smooth(0.72, 0.93, dist) * (1 - smooth(0.95, 1, dist));
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
  const FILM_RING = [[0, 0.022], [0.55, 0.034], [0.76, 0.085], [0.87, 0.2], [0.935, 0.42], [0.972, 0.7], [0.992, 0.55], [1, 0]];
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
        ctx.globalAlpha = fade * Math.min(1, g) * (0.35 + 0.3 * Math.sin(t * 0.23 + b.breathe));
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

  // ============================================================ register
  const REG = [
    { id: 'bubbles', name: 'Bubbles', overDesktop: true, create: createBubbles },
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
