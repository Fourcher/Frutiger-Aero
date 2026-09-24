/* Aerium Media Player visualizations.
   Each visualization draws into a 2D canvas from a shared audio analysis
   (log-spaced bands, waveform, bass/mid/treble, a soft beat pulse) taken
   from Aerium.music.analyser. A.visualizers.mount() runs the render loop,
   handles devicePixelRatio and resizing, and switches presets. */
(function () {
  'use strict';
  const A = window.Aerium;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  const VIS = [];
  function register(def) { VIS.push(def); }

  // ================================================================ analysis
  const NB = 48;
  function Analysis() {
    this.freq = new Uint8Array(1024);
    this.wave = new Uint8Array(2048).fill(128);
    this.bands = new Float32Array(NB);
    this.bass = 0; this.mid = 0; this.treble = 0; this.level = 0;
    this.pulse = 0; this.beat = false; this.avgBass = 0.2; this.lastBeat = 0; this.energy = 0;
    this.wf = new Float32Array(512);
    this.waveGain = 3;
  }
  Analysis.prototype.update = function (analyser, playing, t, dt) {
    const live = !!(analyser && playing);
    if (live) {
      if (this.freq.length !== analyser.frequencyBinCount) this.freq = new Uint8Array(analyser.frequencyBinCount);
      if (this.wave.length !== analyser.fftSize) this.wave = new Uint8Array(analyser.fftSize);
      analyser.getByteFrequencyData(this.freq);
      analyser.getByteTimeDomainData(this.wave);
    } else {
      const k = Math.pow(0.02, dt);
      for (let i = 0; i < this.freq.length; i++) this.freq[i] *= k;
      for (let i = 0; i < this.wave.length; i++) this.wave[i] = 128 + Math.sin(i * 0.02 + t * 1.3) * 3 * (1 + Math.sin(t * 0.4));
    }
    const sr = analyser ? analyser.context.sampleRate : 48000;
    const binHz = sr / 2 / this.freq.length;
    const lo = 38, hi = 15000;
    let bass = 0, mid = 0, tre = 0;
    for (let b = 0; b < NB; b++) {
      const f0 = lo * Math.pow(hi / lo, b / NB), f1 = lo * Math.pow(hi / lo, (b + 1) / NB);
      const i0 = Math.min(this.freq.length - 1, Math.floor(f0 / binHz)), i1 = Math.min(this.freq.length, Math.max(i0 + 1, Math.ceil(f1 / binHz)));
      let v = 0;
      for (let i = i0; i < i1; i++) if (this.freq[i] > v) v = this.freq[i];
      v = v / 255;
      v = clamp((v - 0.12) / 0.88, 0, 1) * (0.85 + 0.45 * (b / NB));
      v = Math.min(1, v);
      const cur = this.bands[b];
      this.bands[b] = v > cur ? lerp(cur, v, Math.min(1, dt * 22)) : lerp(cur, v, Math.min(1, dt * 5));
      if (b < 6) bass += this.bands[b]; else if (b < 26) mid += this.bands[b]; else tre += this.bands[b];
    }
    this.bass = bass / 6; this.mid = mid / 20; this.treble = tre / (NB - 26);
    let acc = 0, pk = 0;
    for (let i = 0; i < this.wave.length; i += 4) { const x = (this.wave[i] - 128) / 128; acc += x * x; if (Math.abs(x) > pk) pk = Math.abs(x); }
    // Normalized waveform with a slow automatic gain, so scopes fill the screen at any volume.
    const target = clamp(0.8 / Math.max(pk, 0.02), 1, live ? 12 : 3);
    this.waveGain = lerp(this.waveGain, target, Math.min(1, dt * (target < this.waveGain ? 6 : 1.2)));
    const wl = this.wf.length, st = this.wave.length / wl;
    for (let i = 0; i < wl; i++) this.wf[i] = clamp(((this.wave[Math.floor(i * st)] - 128) / 128) * this.waveGain, -1, 1);
    this.level = lerp(this.level, Math.min(1, Math.sqrt(acc / (this.wave.length / 4)) * 3), Math.min(1, dt * 10));
    this.beat = false;
    if (live && this.bass > this.avgBass * 1.25 + 0.06 && t - this.lastBeat > 0.28) { this.beat = true; this.lastBeat = t; this.pulse = 1; }
    this.avgBass = lerp(this.avgBass, this.bass, Math.min(1, dt * 1.5));
    this.pulse *= Math.exp(-dt * 4.5);
    this.energy = lerp(this.energy, (this.bass + this.mid + this.treble) / 3, Math.min(1, dt * 3));
  };
  // Resample the band array to n values (for bar counts that follow the width).
  function bandsTo(bands, n, out) {
    out = out && out.length === n ? out : new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / Math.max(1, n - 1)) * (bands.length - 1), k = Math.floor(x), fr = x - k;
      out[i] = lerp(bands[k], bands[Math.min(bands.length - 1, k + 1)], fr);
    }
    return out;
  }

  // ================================================================ helpers
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
  function hsl(h, s, l, a) { return 'hsla(' + ((h % 360) + 360) % 360 + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')'; }
  // Aero palette walk: sun gold -> leaf green -> aqua -> sky blue and back. Never purple.
  function aeroHue(x) { return 128 + 86 * Math.sin(x); }
  function hexToHue(hex) {
    if (!hex) return 200;
    const rgb = A.util.hexToRgb(hex);
    return A.util.rgbToHsl(rgb[0], rgb[1], rgb[2])[0];
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // A soft round glow sprite, tinted.
  const spriteCache = new Map();
  function glowSprite(hue, sat, light) {
    const key = hue + ',' + sat + ',' + light;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const c = canvas(64, 64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, hsl(hue, sat, 96, 1));
    g.addColorStop(0.18, hsl(hue, sat, light + 10, 0.9));
    g.addColorStop(0.45, hsl(hue, sat, light, 0.35));
    g.addColorStop(1, hsl(hue, sat, light, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    spriteCache.set(key, c);
    return c;
  }
  // A glossy soap bubble sprite: clear body, lit rim, top-left highlight, caustic base.
  let bubbleSprite = null;
  function bubble() {
    if (bubbleSprite) return bubbleSprite;
    const S = 128, c = canvas(S, S), x = c.getContext('2d'), r = S / 2 - 3;
    x.translate(S / 2, S / 2);
    const body = x.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
    body.addColorStop(0, 'rgba(170,230,255,0.03)');
    body.addColorStop(0.82, 'rgba(150,220,255,0.12)');
    body.addColorStop(0.96, 'rgba(220,250,255,0.55)');
    body.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = body;
    x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.55)';
    x.lineWidth = 1.5;
    x.beginPath(); x.arc(0, 0, r - 1, 0, TAU); x.stroke();
    const irid = x.createLinearGradient(-r, -r, r, r);
    irid.addColorStop(0, 'rgba(255,170,230,0.25)'); irid.addColorStop(0.4, 'rgba(160,240,255,0.2)'); irid.addColorStop(0.7, 'rgba(190,255,160,0.2)'); irid.addColorStop(1, 'rgba(150,190,255,0.25)');
    x.strokeStyle = irid; x.lineWidth = 4;
    x.beginPath(); x.arc(0, 0, r - 3, 0, TAU); x.stroke();
    const sh = x.createLinearGradient(0, -r, 0, 0);
    sh.addColorStop(0, 'rgba(255,255,255,0.85)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = sh;
    x.beginPath(); x.ellipse(-r * 0.28, -r * 0.5, r * 0.42, r * 0.24, -0.5, 0, TAU); x.fill();
    const ca = x.createRadialGradient(0, r * 0.75, 0, 0, r * 0.75, r * 0.55);
    ca.addColorStop(0, 'rgba(255,255,255,0.4)'); ca.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = ca;
    x.beginPath(); x.arc(0, 0, r - 2, 0, TAU); x.fill();
    bubbleSprite = c;
    return c;
  }
  function stars(n, seed) {
    const rnd = A.util.seeded(seed || 5), out = [];
    for (let i = 0; i < n; i++) out.push({ x: rnd(), y: rnd() * 0.75, r: 0.4 + rnd() * 1.2, p: rnd() * TAU, s: 0.5 + rnd() * 2 });
    return out;
  }
  function drawStars(ctx, list, w, h, t, alpha) {
    for (const s of list) {
      const a = alpha * (0.45 + 0.55 * Math.sin(t * s.s + s.p) * 0.5 + 0.275);
      ctx.fillStyle = 'rgba(220,240,255,' + a.toFixed(3) + ')';
      ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
    }
  }
  function skyGradient(ctx, w, h, top, mid, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(0.6, mid); g.addColorStop(1, bottom);
    return g;
  }

  // ================================================================ mount
  // mount(container, { id, analyser: () => node, playing: () => bool, art: () => image, color: () => hex, onChange })
  function mount(container, o) {
    o = o || {};
    const cv = document.createElement('canvas');
    cv.className = 'vis-canvas';
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    container.appendChild(cv);
    const ctx = cv.getContext('2d');
    const an = new Analysis();
    let w = 1, h = 1, dpr = 1, raf = 0, running = false, last = 0, t0 = performance.now();
    let cur = null, inst = null, destroyed = false, hidden = false;

    function size() {
      const r = container.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const scale = cur && cur.scale ? cur.scale : 1;
      cv.width = Math.max(1, Math.round(w * dpr * scale));
      cv.height = Math.max(1, Math.round(h * dpr * scale));
      if (inst && inst.resize) inst.resize(w, h);
    }
    function set(id) {
      const def = get(id) || VIS[0];
      if (inst && inst.destroy) inst.destroy();
      cur = def;
      size();
      inst = def.create({ canvas: cv, ctx, w, h }) || {};
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (o.onChange) o.onChange(def);
      return def;
    }
    const frame = { ctx, w: 1, h: 1, t: 0, dt: 0, an, bands: an.bands, wave: an.wave, wf: an.wf, freq: an.freq, bass: 0, mid: 0, treble: 0, level: 0, pulse: 0, beat: false, hue: 200, playing: false, art: null, track: null };
    function loop(now) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, Math.max(0.001, (now - last) / 1000));
      last = now;
      const t = (now - t0) / 1000;
      const playing = o.playing ? !!o.playing() : false;
      an.update(o.analyser ? o.analyser() : null, playing, t, dt);
      const scale = cur && cur.scale ? cur.scale : 1;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      frame.w = w; frame.h = h; frame.t = t; frame.dt = dt; frame.bands = an.bands; frame.wave = an.wave; frame.wf = an.wf; frame.freq = an.freq;
      frame.bass = an.bass; frame.mid = an.mid; frame.treble = an.treble; frame.level = an.level; frame.pulse = an.pulse; frame.beat = an.beat;
      frame.playing = playing; frame.hue = hexToHue(o.color ? o.color() : null); frame.art = o.art ? o.art() : null; frame.track = o.track ? o.track() : null;
      try { inst.draw(frame); } catch (e) { running = false; console.error('[Aerium] visualization failed', e); }
    }
    const ro = new ResizeObserver(() => { if (!destroyed) size(); });
    ro.observe(container);
    set(o.id);
    const api = {
      canvas: cv,
      get current() { return cur; },
      set,
      step(dir) {
        const i = VIS.indexOf(cur);
        return set(VIS[(i + dir + VIS.length) % VIS.length].id);
      },
      resume() { if (running || destroyed || hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); },
      pause() { running = false; cancelAnimationFrame(raf); },
      setHidden(v) { hidden = !!v; if (hidden) api.pause(); else api.resume(); },
      resize: size,
      destroy() { destroyed = true; api.pause(); ro.disconnect(); if (inst && inst.destroy) inst.destroy(); cv.remove(); },
    };
    api.resume();
    return api;
  }
  function get(id) { return VIS.find((v) => v.id === id) || null; }
  function groups() {
    const out = [];
    VIS.forEach((v) => { let g = out.find((x) => x.name === v.group); if (!g) { g = { name: v.group, items: [] }; out.push(g); } g.items.push(v); });
    return out;
  }

  A.visualizers = { list: VIS, register, get, groups, mount, Analysis, bandsTo, _h: { canvas, hsl, glowSprite, bubble, stars, drawStars, roundRect, skyGradient, aeroHue } };

  // ================================================================ visualizations
  // ---------------------------------------------------------------- Spectrum: Glass Bars
  register({
    id: 'glass-bars', name: 'Glass Bars', group: 'Spectrum',
    create() {
      let vals = null, caps = null, capV = null, n = 0;
      return {
        draw(f) {
          const { ctx, w, h } = f;
          ctx.fillStyle = skyGradient(ctx, w, h, '#020714', '#071a36', '#01040b');
          ctx.fillRect(0, 0, w, h);
          const floor = Math.round(h * 0.72), hue = 196 + (f.hue - 200) * 0.2;
          const glow = ctx.createRadialGradient(w / 2, floor, 0, w / 2, floor, w * 0.6);
          glow.addColorStop(0, hsl(hue, 90, 55, 0.2 + f.bass * 0.2));
          glow.addColorStop(1, hsl(hue, 90, 40, 0));
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, w, h);
          const count = clamp(Math.round(w / 20), 16, 56);
          if (count !== n) { n = count; caps = new Float32Array(n); capV = new Float32Array(n); }
          vals = bandsTo(f.bands, n, vals);
          const x0 = w * 0.06, slot = (w * 0.88) / n, bw = Math.max(3, slot * 0.7), maxH = floor - h * 0.1;
          const body = ctx.createLinearGradient(0, floor - maxH, 0, floor);
          body.addColorStop(0, hsl(hue - 18, 95, 84));
          body.addColorStop(0.3, hsl(hue, 92, 62));
          body.addColorStop(1, hsl(hue + 14, 90, 28));
          const refl = ctx.createLinearGradient(0, floor, 0, h);
          refl.addColorStop(0, hsl(hue, 90, 58, 0.34));
          refl.addColorStop(0.75, hsl(hue, 90, 40, 0));
          for (let i = 0; i < n; i++) {
            const bh = Math.max(2, vals[i] * maxH), x = x0 + i * slot + (slot - bw) / 2;
            ctx.fillStyle = body;
            roundRect(ctx, x, floor - bh, bw, bh, Math.min(4, bw / 3));
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.26)';
            ctx.fillRect(x + bw * 0.14, floor - bh + 2, bw * 0.3, Math.max(0, bh - 3));
            ctx.fillStyle = refl;
            ctx.fillRect(x, floor + 2, bw, Math.min(h - floor, bh * 0.55));
            if (bh >= caps[i]) { caps[i] = bh; capV[i] = 0; } else { capV[i] += f.dt * 240; caps[i] = Math.max(0, caps[i] - capV[i] * f.dt); }
            ctx.fillStyle = hsl(hue - 22, 100, 90, 0.95);
            roundRect(ctx, x, floor - caps[i] - 7, bw, 3.5, 1.7);
            ctx.fill();
          }
          const fl = ctx.createLinearGradient(0, 0, w, 0);
          fl.addColorStop(0, 'rgba(200,240,255,0)');
          fl.addColorStop(0.5, 'rgba(200,240,255,0.55)');
          fl.addColorStop(1, 'rgba(200,240,255,0)');
          ctx.fillStyle = fl;
          ctx.fillRect(0, floor, w, 1);
        },
      };
    },
  });

  // ---------------------------------------------------------------- Spectrum: Ocean Scope
  register({
    id: 'ocean-scope', name: 'Ocean Scope', group: 'Spectrum',
    create() {
      let first = true;
      return {
        draw(f) {
          const { ctx, w, h, t } = f;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = first ? '#01060f' : 'rgba(1,6,15,0.26)';
          first = false;
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = 'rgba(80,170,230,0.07)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = (w / 2) % 48; x < w; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
          for (let y = (h / 2) % 48; y < h; y += 48) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
          ctx.stroke();
          const mid = h / 2, amp = h * 0.36, N = Math.min(512, Math.floor(w / 2)), wf = f.wf, step = wf.length / N;
          const hue = 188 + Math.sin(t * 0.23) * 26;
          ctx.globalCompositeOperation = 'lighter';
          const path = () => {
            ctx.beginPath();
            for (let i = 0; i < N; i++) {
              const v = wf[Math.floor(i * step)];
              const x = (i / (N - 1)) * w, y = mid + v * amp;
              if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
          };
          path();
          ctx.lineJoin = 'round';
          ctx.strokeStyle = hsl(hue, 95, 60, 0.14);
          ctx.lineWidth = 9;
          ctx.stroke();
          ctx.strokeStyle = hsl(hue, 95, 70, 0.35);
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.strokeStyle = hsl(hue - 10, 100, 88, 0.95);
          ctx.lineWidth = 1.6;
          ctx.stroke();
          if (f.pulse > 0.5) {
            ctx.fillStyle = hsl(hue, 100, 80, (f.pulse - 0.5) * 0.25);
            ctx.fillRect(0, mid - 1, w, 2);
          }
          ctx.globalCompositeOperation = 'source-over';
        },
      };
    },
  });

  // ---------------------------------------------------------------- Spectrum: Sound Horizon
  register({
    id: 'sound-horizon', name: 'Sound Horizon', group: 'Spectrum',
    create() {
      const st = stars(90, 21);
      let vals = null;
      return {
        draw(f) {
          const { ctx, w, h, t } = f;
          ctx.fillStyle = skyGradient(ctx, w, h, '#020818', '#0a2b4f', '#0f5f70');
          ctx.fillRect(0, 0, w, h);
          drawStars(ctx, st, w, h * 0.72, t, 0.8);
          const sx = w * 0.5, sy = h * 0.62, sr = Math.min(w, h) * (0.08 + f.bass * 0.05 + f.pulse * 0.02);
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 4);
          g.addColorStop(0, 'rgba(255,250,220,0.95)');
          g.addColorStop(0.22, 'rgba(255,230,160,0.55)');
          g.addColorStop(0.5, 'rgba(120,220,255,0.18)');
          g.addColorStop(1, 'rgba(60,160,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
          vals = bandsTo(f.bands, 64, vals);
          const cols = [['#1d7f8f', '#0a3a5c'], ['#135b78', '#082c4d'], ['#0a3558', '#041a33']];
          for (let L = 0; L < 3; L++) {
            const base = h * (0.7 + L * 0.1), amp = h * (0.32 - L * 0.07), off = t * (0.05 + L * 0.03);
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let x = 0; x <= w + 6; x += 6) {
              const u = Math.abs(((x / w + off) % 1) * 2 - 1);
              const v = vals[Math.min(63, Math.floor(u * 63))];
              const y = base - v * amp - Math.sin(x * 0.013 + L * 2 + t * 0.2) * h * 0.02;
              ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            const lg = ctx.createLinearGradient(0, base - amp, 0, h);
            lg.addColorStop(0, cols[L][0]);
            lg.addColorStop(1, cols[L][1]);
            ctx.fillStyle = lg;
            ctx.fill();
            ctx.strokeStyle = 'rgba(160,235,255,' + (0.45 - L * 0.12) + ')';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        },
      };
    },
  });

  // ---------------------------------------------------------------- Aurora: Northern Ribbons
  register({
    id: 'northern-ribbons', name: 'Northern Ribbons', group: 'Aurora',
    create() {
      const st = stars(130, 33);
      const strip = (hue) => {
        const c = canvas(4, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, hsl(hue + 40, 90, 60, 0));
        g.addColorStop(0.55, hsl(hue + 20, 90, 55, 0.25));
        g.addColorStop(0.86, hsl(hue, 95, 62, 0.75));
        g.addColorStop(0.94, hsl(hue - 10, 100, 85, 0.95));
        g.addColorStop(1, hsl(hue, 90, 60, 0));
        x.fillStyle = g;
        x.fillRect(0, 0, 4, 256);
        return c;
      };
      const strips = [strip(150), strip(172), strip(195)];
      return {
        draw(f) {
          const { ctx, w, h, t } = f;
          ctx.fillStyle = skyGradient(ctx, w, h, '#01040d', '#041329', '#06293a');
          ctx.fillRect(0, 0, w, h);
          drawStars(ctx, st, w, h, t, 0.7);
          ctx.globalCompositeOperation = 'lighter';
          for (let r = 0; r < 3; r++) {
            const img = strips[r];
            for (let x = -8; x < w + 8; x += 5) {
              const u = clamp(x / w, 0, 0.999), band = f.bands[Math.floor(((u * 1.6 + r * 0.3) % 1) * 47)];
              const ph = u * TAU * (1.05 + r * 0.32) + t * (0.22 + r * 0.07);
              const y = h * (0.44 + r * 0.1) + Math.sin(ph) * h * 0.07 + Math.sin(ph * 2.7 - t * 0.6) * h * 0.025;
              const hh = h * (0.13 + 0.07 * Math.sin(ph * 0.5 + t * 0.8)) * (0.55 + band * 1.3 + f.level * 0.35);
              ctx.globalAlpha = clamp(0.28 + band * 0.55 + f.pulse * 0.1, 0, 1);
              ctx.drawImage(img, x, y - hh, 6, hh * 1.08);
            }
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#010610';
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * 0.9 - Math.abs(Math.sin(x * 0.011) * Math.cos(x * 0.004)) * h * 0.09);
          ctx.lineTo(w, h);
          ctx.fill();
        },
      };
    },
  });

  // ---------------------------------------------------------------- Bubbles: Rising Bubbles
  register({
    id: 'rising-bubbles', name: 'Rising Bubbles', group: 'Bubbles',
    create() {
      const list = [], rings = [];
      let acc = 0;
      return {
        draw(f) {
          const { ctx, w, h, t, dt } = f;
          ctx.fillStyle = skyGradient(ctx, w, h, '#0b5a93', '#063a6c', '#021a38');
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 5; i++) {
            const x = w * (0.15 + i * 0.18) + Math.sin(t * 0.2 + i) * w * 0.04;
            const g = ctx.createLinearGradient(0, 0, 0, h * 0.85);
            g.addColorStop(0, 'rgba(180,230,255,0.10)');
            g.addColorStop(1, 'rgba(180,230,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(x - w * 0.03, 0);
            ctx.lineTo(x + w * 0.03, 0);
            ctx.lineTo(x + w * 0.09 + Math.sin(t * 0.3 + i) * 20, h * 0.85);
            ctx.lineTo(x - w * 0.02, h * 0.85);
            ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
          acc += dt * (1.2 + f.bass * 16 + f.pulse * 8);
          while (acc > 1 && list.length < 170) {
            acc -= 1;
            const r = 4 + Math.random() * (7 + f.bass * 30);
            list.push({ x: Math.random() * w, y: h + r, r, ph: Math.random() * TAU, wob: 8 + Math.random() * 22, sp: 0.8 + Math.random() * 0.5 });
          }
          if (acc > 1) acc = 1;
          const img = bubble();
          for (let i = list.length - 1; i >= 0; i--) {
            const b = list[i];
            b.y -= (22 + b.r * 1.5) * b.sp * dt * (0.8 + f.level * 1.2);
            b.x += Math.cos(t * 1.6 + b.ph) * b.wob * dt;
            const s = b.r * (1 + f.treble * 0.12 * Math.sin(t * 9 + b.ph));
            ctx.drawImage(img, b.x - s, b.y - s, s * 2, s * 2);
            if (b.y < -b.r || (b.y < h * 0.55 && Math.random() < f.treble * dt * 0.6)) {
              if (b.y > 0) rings.push({ x: b.x, y: b.y, r: b.r, age: 0 });
              list.splice(i, 1);
            }
          }
          for (let i = rings.length - 1; i >= 0; i--) {
            const q = rings[i];
            q.age += dt;
            if (q.age > 0.35) { rings.splice(i, 1); continue; }
            ctx.strokeStyle = 'rgba(230,250,255,' + (1 - q.age / 0.35) * 0.7 + ')';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(q.x, q.y, q.r * (1 + q.age * 4), 0, TAU);
            ctx.stroke();
          }
        },
      };
    },
  });

  // ---------------------------------------------------------------- Ambient: Firefly Swirl
  register({
    id: 'firefly-swirl', name: 'Firefly Swirl', group: 'Ambient',
    create() {
      const rnd = A.util.seeded(8), P = [];
      for (let i = 0; i < 230; i++) P.push({ a: rnd() * TAU, r: 0.06 + Math.pow(rnd(), 0.7) * 0.94, s: 0.6 + rnd() * 1.8, k: rnd() * TAU, hue: rnd() });
      let first = true;
      return {
        draw(f) {
          const { ctx, w, h, t, dt } = f;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = first ? '#01040c' : 'rgba(1,4,12,0.2)';
          first = false;
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = 'lighter';
          const cx = w / 2, cy = h / 2, R = Math.min(w * 0.62, h) * 0.5, ph = t * 0.12 + f.hue / 57;
          for (const p of P) {
            p.a += dt * (0.12 + 0.45 / (p.r + 0.15)) * (0.45 + f.level * 1.6 + f.pulse * 0.9);
            const rr = R * p.r * (0.8 + f.bass * 0.4) + Math.sin(t * 1.1 + p.k) * 6;
            const x = cx + Math.cos(p.a) * rr * 1.25, y = cy + Math.sin(p.a) * rr * 0.62 + Math.sin(t * 0.7 + p.k) * 5;
            const sz = (3.5 + p.s * 4.5) * (1 + f.pulse * 0.5 + f.treble * 0.5);
            const hue = Math.round(aeroHue(ph + p.hue * 1.2) / 12) * 12;
            ctx.drawImage(glowSprite(hue, 90, 60), x - sz, y - sz, sz * 2, sz * 2);
          }
          const core = Math.min(w, h) * (0.05 + f.bass * 0.05);
          ctx.drawImage(glowSprite(Math.round(aeroHue(ph) / 12) * 12, 80, 70), cx - core * 2, cy - core * 2, core * 4, core * 4);
          ctx.globalCompositeOperation = 'source-over';
        },
      };
    },
  });

  // ---------------------------------------------------------------- Organic: Living Glass
  register({
    id: 'living-glass', name: 'Living Glass', group: 'Organic',
    create() {
      let ry = 0, first = true;
      const LAT = 11, LON = 28;
      return {
        draw(f) {
          const { ctx, w, h, t, dt } = f;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = first ? '#000308' : 'rgba(0,3,10,0.32)';
          first = false;
          ctx.fillRect(0, 0, w, h);
          ry += dt * (0.25 + f.level * 0.9);
          const rx = 0.4 + Math.sin(t * 0.21) * 0.3, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.31 * (1 + f.pulse * 0.08);
          const cyr = Math.cos(ry), syr = Math.sin(ry), cxr = Math.cos(rx), sxr = Math.sin(rx);
          const pt = (lat, lon) => {
            const th = (lat / LAT) * Math.PI, ph = (lon / LON) * TAU;
            const d = 1 + f.bands[(lat * 5 + lon * 2) % 48] * 0.38 + Math.sin(ph * 3 + t * 1.4 + lat) * 0.05;
            let x = Math.sin(th) * Math.cos(ph) * d, y = Math.cos(th) * d, z = Math.sin(th) * Math.sin(ph) * d;
            const x2 = x * cyr + z * syr; z = -x * syr + z * cyr; x = x2;
            const y2 = y * cxr - z * sxr; z = y * sxr + z * cxr; y = y2;
            const p = 2.8 / (2.8 + z);
            return [cx + x * R * p, cy + y * R * p, z];
          };
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineWidth = 1.1;
          const hue = aeroHue(t * 0.1 + f.hue / 57);
          for (let lat = 1; lat < LAT; lat++) {
            ctx.strokeStyle = hsl(hue + lat * 3, 90, 62, 0.55);
            ctx.beginPath();
            for (let lon = 0; lon <= LON; lon++) { const p = pt(lat, lon); if (lon) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
            ctx.stroke();
          }
          ctx.strokeStyle = hsl(hue + 18, 90, 72, 0.3);
          for (let lon = 0; lon < LON; lon += 2) {
            ctx.beginPath();
            for (let lat = 0; lat <= LAT; lat++) { const p = pt(lat, lon); if (lat) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
            ctx.stroke();
          }
          ctx.globalCompositeOperation = 'source-over';
        },
      };
    },
  });

  // ---------------------------------------------------------------- Prism: feedback kaleidoscopes
  function kaleido(dst, src, w, h, n) {
    const cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy) + 2, ang = TAU / n;
    for (let k = 0; k < n; k++) {
      dst.save();
      dst.translate(cx, cy);
      dst.rotate(k * ang);
      if (k % 2) dst.scale(1, -1);
      dst.beginPath();
      dst.moveTo(0, 0);
      dst.arc(0, 0, R, -ang / 2 - 0.01, ang / 2 + 0.01);
      dst.closePath();
      dst.clip();
      dst.drawImage(src, -cx, -cy);
      dst.restore();
    }
  }
  function prism(o) {
    return function create() {
      let acc = null, tmp = null, aw = 0, ah = 0;
      return {
        draw(f) {
          const { ctx, w, h } = f;
          const W = Math.max(64, Math.round(w * 0.5)), H = Math.max(64, Math.round(h * 0.5));
          if (!acc || W !== aw || H !== ah) { aw = W; ah = H; acc = canvas(W, H); tmp = canvas(W, H); }
          const a = acc.getContext('2d'), m = tmp.getContext('2d'), cx = aw / 2, cy = ah / 2;
          m.globalCompositeOperation = 'source-over';
          m.fillStyle = '#000';
          m.fillRect(0, 0, aw, ah);
          m.save();
          m.translate(cx, cy);
          m.rotate(o.rot(f));
          const z = o.zoom(f);
          m.scale(z, z);
          m.translate(-cx, -cy);
          m.globalAlpha = o.decay;
          m.drawImage(acc, 0, 0);
          m.restore();
          m.globalAlpha = 1;
          m.globalCompositeOperation = 'lighter';
          o.shape(m, aw, ah, f);
          a.globalCompositeOperation = 'source-over';
          a.fillStyle = '#000';
          a.fillRect(0, 0, aw, ah);
          kaleido(a, tmp, aw, ah, o.fold);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(acc, 0, 0, w, h);
          const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
          v.addColorStop(0, 'rgba(0,0,0,0)');
          v.addColorStop(1, 'rgba(0,0,0,0.55)');
          ctx.fillStyle = v;
          ctx.fillRect(0, 0, w, h);
        },
      };
    };
  }
  register({
    id: 'prism-ocean', name: 'the ocean is dreaming', group: 'Prism',
    create: prism({
      fold: 6, decay: 0.93,
      zoom: (f) => 1.018 + f.bass * 0.035,
      rot: (f) => 0.005 + f.mid * 0.012,
      shape(m, w, h, f) {
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * (0.16 + f.bass * 0.08), N = 90, wf = f.wf, step = wf.length / N;
        m.strokeStyle = hsl(178 + Math.sin(f.t * 0.3) * 32, 95, 62, 0.9);
        m.lineWidth = 1.6;
        m.beginPath();
        for (let i = 0; i <= N; i++) {
          const v = wf[Math.floor((i % N) * step)], a = (i / N) * TAU;
          const r = R * (1 + v * 0.45);
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          if (i) m.lineTo(x, y); else m.moveTo(x, y);
        }
        m.stroke();
        if (f.beat) { m.fillStyle = hsl(160, 90, 70, 0.5); m.beginPath(); m.arc(cx + R * 1.3, cy, 3 + f.bass * 6, 0, TAU); m.fill(); }
      },
    }),
  });
  register({
    id: 'prism-flowers', name: 'glass flowers at noon', group: 'Prism',
    create: prism({
      fold: 8, decay: 0.88,
      zoom: (f) => 0.986 - f.bass * 0.02,
      rot: () => -0.009,
      shape(m, w, h, f) {
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.5;
        m.lineWidth = 1.8;
        for (let i = 0; i < 48; i += 2) {
          const a = (i / 48) * TAU + f.t * 0.2, len = R * (0.08 + f.bands[i] * 0.85);
          m.strokeStyle = hsl(aeroHue(i * 0.09 + f.t * 0.25), 90, 65, 0.8);
          m.beginPath();
          m.moveTo(cx + Math.cos(a) * R * 0.05, cy + Math.sin(a) * R * 0.05);
          m.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
          m.stroke();
        }
      },
    }),
  });
  register({
    id: 'prism-storm', name: 'a quiet storm of light', group: 'Prism',
    create: prism({
      fold: 2, decay: 0.9,
      zoom: (f) => 1.03 + f.pulse * 0.04,
      rot: (f) => Math.sin(f.t * 0.3) * 0.02,
      shape(m, w, h, f) {
        const N = 120, wf = f.wf, step = wf.length / N, mid = h / 2;
        m.strokeStyle = hsl(aeroHue(f.t * 0.3), 90, 65, 0.85);
        m.lineWidth = 1.5;
        m.beginPath();
        for (let i = 0; i < N; i++) {
          const v = wf[Math.floor(i * step)], x = (i / (N - 1)) * w;
          const y = mid + v * h * 0.3;
          if (i) m.lineTo(x, y); else m.moveTo(x, y);
        }
        m.stroke();
        if (f.beat) {
          m.strokeStyle = hsl(aeroHue(f.t * 0.3 + 1.4), 90, 70, 0.7);
          m.beginPath();
          m.arc(w / 2, mid, Math.min(w, h) * (0.1 + f.bass * 0.2), 0, TAU);
          m.stroke();
        }
      },
    }),
  });

  // ---------------------------------------------------------------- Album Art
  register({
    id: 'album-art', name: 'Album Art', group: 'Album Art',
    create() {
      return {
        draw(f) {
          const { ctx, w, h, t } = f;
          const hue = f.hue;
          ctx.fillStyle = skyGradient(ctx, w, h, hsl(hue, 45, 10), hsl(hue, 55, 16), hsl(hue, 40, 6));
          ctx.fillRect(0, 0, w, h);
          const size = Math.min(w * 0.5, h * 0.56), x = (w - size) / 2, y = (h - size) / 2 - h * 0.07 + Math.sin(t * 0.6) * 3;
          const g = ctx.createRadialGradient(w / 2, y + size / 2, size * 0.3, w / 2, y + size / 2, size * (0.95 + f.bass * 0.2));
          g.addColorStop(0, hsl(hue, 90, 60, 0.3 + f.pulse * 0.15));
          g.addColorStop(1, hsl(hue, 90, 50, 0));
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
          if (!f.art) return;
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.translate(0, (y + size) * 2 + 3);
          ctx.scale(1, -1);
          ctx.drawImage(f.art, x, y, size, size);
          ctx.restore();
          const fade = ctx.createLinearGradient(0, y + size, 0, y + size * 1.6);
          fade.addColorStop(0, hsl(hue, 40, 8, 0.2));
          fade.addColorStop(1, hsl(hue, 40, 7, 1));
          ctx.fillStyle = fade;
          ctx.fillRect(0, y + size + 1, w, h - y - size);
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 24;
          ctx.drawImage(f.art, x, y, size, size);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
        },
      };
    },
  });
})();
