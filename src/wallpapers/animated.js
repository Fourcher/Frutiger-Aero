/* Aerium animated wallpapers: Aurora night sky, Technozen pearls,
   Daydream meadow with drifting clouds, Horizon waves that follow the month,
   and Rising bubbles. Each one pauses when hidden and makes its own
   thumbnail from a still frame. */
(function () {
  'use strict';
  const A = window.Aerium;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;

  // Tiny scene runner shared by every animated wallpaper.
  function scene(def) {
    function create(host, opts = {}) {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      host.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const st = { W: 1, H: 1, t: rand(0, 50), preview: !!opts.preview };
      let dpr = 1, raf = null, running = false, last = 0, dead = false;
      function resize() {
        const r = host.getBoundingClientRect();
        st.W = Math.max(1, Math.round(r.width || opts.width || 1));
        st.H = Math.max(1, Math.round(r.height || opts.height || 1));
        dpr = Math.min(window.devicePixelRatio || 1, opts.preview ? 1 : 1.25);
        canvas.width = Math.round(st.W * dpr);
        canvas.height = Math.round(st.H * dpr);
        if (st.W > 20 && st.H > 20) def.setup(st, ctx);
      }
      function frame(now) {
        if (!running) return;
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
        last = now;
        if (A.wm && !st.preview && A.wm.windows.some((w) => w.state === 'maximized') && (st.skip = (st.skip || 0) + 1) % 12) return;
        step(dt);
      }
      function step(dt) {
        st.t += dt;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (st.W > 20) def.draw(ctx, st, dt);
      }
      const ro = new ResizeObserver(() => !dead && resize());
      ro.observe(host);
      resize();
      const ctrl = {
        pause() { running = false; cancelAnimationFrame(raf); },
        resume() { if (running || dead) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
        destroy() { dead = true; ctrl.pause(); ro.disconnect(); canvas.remove(); },
        pointer(type, x, y) {
          if (!def.pointer) return false;
          const r = canvas.getBoundingClientRect();
          return def.pointer(st, type, x - r.left, y - r.top);
        },
        renderStill(n = 20) { for (let i = 0; i < n; i++) step(1 / 30); },
      };
      ctrl.resume();
      return ctrl;
    }
    let thumbUrl = null;
    function thumb() {
      if (thumbUrl) return thumbUrl;
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:200px;visibility:hidden';
      document.body.appendChild(box);
      const c = create(box, { preview: true, width: 320, height: 200 });
      c.pause();
      c.renderStill(30);
      try { thumbUrl = box.querySelector('canvas').toDataURL('image/jpeg', 0.85); } catch (e) { thumbUrl = ''; }
      c.destroy();
      box.remove();
      return thumbUrl;
    }
    return { create, thumb };
  }

  function register(id, name, theme, s, ink) {
    A.theme.registerWallpaper({ id, name, group: 'Aerium Animated', kind: 'animated', animated: true, theme, ink, thumb: s.thumb, create: (host) => s.create(host) });
  }

  // ------------------------------------------------------------ Aurora
  const aurora = scene({
    setup(st, ctx) {
      const { W, H } = st;
      st.stars = Array.from({ length: Math.round((W * H) / 2600) }, () => ({ x: rand(0, W), y: rand(0, H * 0.75), r: rand(0.3, 1.4), ph: rand(0, TAU), s: rand(0.5, 2) }));
      st.ribbons = [
        { y: 0.24, amp: 0.06, len: 0.32, c1: [62, 230, 160], c2: [42, 206, 218], sp: 0.05, ph: 0 },
        { y: 0.34, amp: 0.05, len: 0.26, c1: [80, 255, 190], c2: [120, 110, 255], sp: 0.035, ph: 2 },
        { y: 0.18, amp: 0.04, len: 0.2, c1: [42, 206, 218], c2: [60, 140, 255], sp: 0.07, ph: 4 },
      ];
      st.shoot = null;
      // hills and a still lake, pre-rendered
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#010612'); g.addColorStop(0.5, '#031029'); g.addColorStop(0.75, '#062a3f'); g.addColorStop(1, '#0b4a5e');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      st.sky = c;
      const h2 = document.createElement('canvas');
      h2.width = W; h2.height = H;
      const y = h2.getContext('2d');
      y.fillStyle = '#020a14';
      y.beginPath();
      y.moveTo(0, H * 0.8);
      for (let px = 0; px <= W; px += W / 12) y.lineTo(px, H * (0.74 + 0.05 * Math.sin(px * 0.004) + 0.03 * Math.sin(px * 0.013 + 1)));
      y.lineTo(W, H); y.lineTo(0, H); y.closePath(); y.fill();
      y.fillStyle = '#041224';
      y.beginPath();
      y.moveTo(0, H * 0.86);
      for (let px = 0; px <= W; px += W / 9) y.lineTo(px, H * (0.84 + 0.03 * Math.sin(px * 0.006 + 2)));
      y.lineTo(W, H); y.lineTo(0, H); y.closePath(); y.fill();
      st.hills = h2;
      void ctx;
    },
    draw(ctx, st) {
      const { W, H, t } = st;
      ctx.drawImage(st.sky, 0, 0, W, H);
      for (const s of st.stars) {
        const a = 0.35 + 0.5 * Math.abs(Math.sin(t * s.s + s.ph));
        ctx.fillStyle = `rgba(220,240,255,${a})`;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const r of st.ribbons) {
        const step = st.preview ? 3 : 4;
        for (let x = 0; x < W; x += step) {
          const u = x / W;
          const yTop = H * (r.y + r.amp * Math.sin(u * 5 + t * r.sp * 6 + r.ph) + r.amp * 0.6 * Math.sin(u * 13 - t * r.sp * 9 + r.ph));
          const inten = Math.pow(0.5 + 0.5 * Math.sin(u * 9 + t * 0.4 + r.ph) * Math.sin(u * 3.3 - t * 0.21), 1.5) * (1 - Math.abs(u - 0.5) * 0.9);
          if (inten < 0.02) continue;
          const len = H * r.len * (0.7 + 0.5 * inten);
          const g = ctx.createLinearGradient(0, yTop, 0, yTop + len);
          const c1 = r.c1, c2 = r.c2;
          g.addColorStop(0, `rgba(${c2[0]},${c2[1]},${c2[2]},0)`);
          g.addColorStop(0.12, `rgba(${c1[0]},${c1[1]},${c1[2]},${0.5 * inten})`);
          g.addColorStop(0.6, `rgba(${c1[0]},${c1[1]},${c1[2]},${0.2 * inten})`);
          g.addColorStop(1, `rgba(${c2[0]},${c2[1]},${c2[2]},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x, yTop, step + 0.5, len);
        }
      }
      // occasional shooting star
      if (!st.shoot && Math.random() < 0.002) st.shoot = { x: rand(W * 0.2, W), y: rand(0, H * 0.3), life: 1 };
      if (st.shoot) {
        const s = st.shoot;
        s.x -= 9; s.y += 4; s.life -= 0.02;
        const g = ctx.createLinearGradient(s.x, s.y, s.x + 90, s.y - 40);
        g.addColorStop(0, `rgba(255,255,255,${s.life})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 90, s.y - 40); ctx.stroke();
        if (s.life <= 0) st.shoot = null;
      }
      ctx.restore();
      ctx.drawImage(st.hills, 0, 0, W, H);
    },
  });

  // ------------------------------------------------------------ Technozen pearls
  const pearls = scene({
    setup(st) {
      const { W, H } = st;
      st.pearls = Array.from({ length: st.preview ? 7 : 16 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(10, 46), vx: rand(-4, 4), vy: rand(-6, -2), ph: rand(0, TAU) }));
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f1f4f7'); g.addColorStop(1, '#e1e8ee');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(200,210,220,0.18)';
      for (let yy = 0; yy < H; yy += 4) x.fillRect(0, yy, W, 2);
      const glow = x.createRadialGradient(W * 0.72, H * 0.3, 0, W * 0.72, H * 0.3, W * 0.5);
      glow.addColorStop(0, 'rgba(191,230,255,0.55)'); glow.addColorStop(1, 'rgba(191,230,255,0)');
      x.fillStyle = glow; x.fillRect(0, 0, W, H);
      st.bg = c;
    },
    draw(ctx, st) {
      const { W, H, t } = st;
      ctx.drawImage(st.bg, 0, 0, W, H);
      // soft cyan ribbon
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 16) {
          const y = H * (0.62 + k * 0.035) + Math.sin(x * 0.004 + t * 0.2 + k) * H * 0.05 + Math.sin(x * 0.011 - t * 0.13) * H * 0.02;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = `rgba(120,190,240,${0.35 - k * 0.1})`;
        ctx.lineWidth = 40 - k * 14;
        ctx.stroke();
      }
      ctx.restore();
      for (const p of st.pearls) {
        p.x += p.vx * 0.016; p.y += p.vy * 0.016;
        if (p.y < -p.r * 2) { p.y = H + p.r * 2; p.x = rand(0, W); }
        if (p.x < -p.r * 2) p.x = W + p.r; if (p.x > W + p.r * 2) p.x = -p.r;
        const x = p.x + Math.sin(t * 0.3 + p.ph) * 10, y = p.y;
        const g = ctx.createRadialGradient(x - p.r * 0.35, y - p.r * 0.4, p.r * 0.05, x, y, p.r);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(230,242,252,0.6)'); g.addColorStop(1, 'rgba(160,200,235,0.35)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.ellipse(x - p.r * 0.32, y - p.r * 0.42, p.r * 0.3, p.r * 0.16, -0.5, 0, TAU); ctx.fill();
      }
    },
  });

  // ------------------------------------------------------------ Daydream meadow
  const meadow = scene({
    setup(st) {
      const { W, H } = st;
      const mk = (w, h, puffs) => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d');
        for (let i = 0; i < puffs; i++) {
          const px = rand(w * 0.15, w * 0.85), py = rand(h * 0.35, h * 0.7), r = rand(h * 0.2, h * 0.42);
          const g = x.createRadialGradient(px, py - r * 0.2, 0, px, py, r);
          g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          x.fillStyle = g;
          x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
        }
        return c;
      };
      st.clouds = Array.from({ length: st.preview ? 4 : 7 }, (_, i) => ({ img: mk(360, 140, 9), x: rand(-200, W), y: rand(H * 0.04, H * 0.42), s: rand(0.5, 1.3), v: rand(4, 11) * (i % 2 ? 1 : 0.7) }));
      st.butterflies = Array.from({ length: st.preview ? 1 : 3 }, () => ({ x: rand(0, W), y: rand(H * 0.5, H * 0.75), vx: rand(12, 24), ph: rand(0, TAU), hue: Math.random() < 0.5 ? '#3aa6f5' : '#ff7ab8' }));
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1f8fe6'); g.addColorStop(0.55, '#7cc8ff'); g.addColorStop(0.72, '#e6f7ff');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      st.sky = c;
      const hc = document.createElement('canvas');
      hc.width = W; hc.height = H;
      const y = hc.getContext('2d');
      const hill = (base, amp, c1, c2, c3, ph) => {
        y.beginPath();
        y.moveTo(0, H);
        for (let px = 0; px <= W; px += 20) y.lineTo(px, H * base - Math.sin(px / W * Math.PI * 1.2 + ph) * H * amp);
        y.lineTo(W, H); y.closePath();
        const hg = y.createLinearGradient(0, H * (base - amp), 0, H);
        hg.addColorStop(0, c1); hg.addColorStop(0.35, c2); hg.addColorStop(1, c3);
        y.fillStyle = hg; y.fill();
      };
      hill(0.74, 0.07, '#9ceb66', '#45c93a', '#1f8a29', 0.2);
      hill(0.84, 0.05, '#8fe05a', '#35c93a', '#157a1f', 1.9);
      st.hills = hc;
    },
    draw(ctx, st) {
      const { W, H, t } = st;
      ctx.drawImage(st.sky, 0, 0, W, H);
      // sun with a soft flare
      const sx = W * 0.8, sy = H * 0.14;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.22);
      sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(0.15, 'rgba(255,243,168,0.7)'); sg.addColorStop(1, 'rgba(255,243,168,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx - H * 0.22, sy - H * 0.22, H * 0.44, H * 0.44);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(sx - W * 0.25, sy - 1, W * 0.5, 2);
      [[0.62, 0.3, 16, 0.12], [0.5, 0.42, 9, 0.16], [0.4, 0.52, 22, 0.08]].forEach(([fx, fy, r, a]) => {
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.arc(W * fx, H * fy, r, 0, TAU); ctx.fill();
      });
      ctx.restore();
      for (const c of st.clouds) {
        c.x += c.v * 0.016;
        if (c.x > W + 50) { c.x = -360 * c.s - 50; c.y = rand(H * 0.04, H * 0.42); }
        ctx.globalAlpha = 0.92;
        ctx.drawImage(c.img, c.x, c.y, 360 * c.s, 140 * c.s);
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(st.hills, 0, 0, W, H);
      // grass shimmer along the hill crest
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const shimmer = ctx.createLinearGradient(((t * 40) % (W + 400)) - 400, 0, ((t * 40) % (W + 400)), 0);
      shimmer.addColorStop(0, 'rgba(255,255,220,0)'); shimmer.addColorStop(0.5, 'rgba(255,255,220,0.12)'); shimmer.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.fillStyle = shimmer;
      ctx.fillRect(0, H * 0.66, W, H * 0.34);
      ctx.restore();
      for (const b of st.butterflies) {
        b.x += b.vx * 0.016;
        if (b.x > W + 30) { b.x = -30; b.y = rand(H * 0.5, H * 0.75); }
        const y = b.y + Math.sin(t * 1.3 + b.ph) * 20;
        const flap = Math.abs(Math.sin(t * 12 + b.ph));
        ctx.save();
        ctx.translate(b.x, y);
        ctx.fillStyle = b.hue;
        ctx.globalAlpha = 0.9;
        [-1, 1].forEach((sgn) => {
          ctx.save();
          ctx.scale(1, 0.4 + flap * 0.6);
          ctx.beginPath(); ctx.ellipse(sgn * 5, -3, 5, 7, sgn * 0.5, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(sgn * 4, 5, 3.5, 5, -sgn * 0.4, 0, TAU); ctx.fill();
          ctx.restore();
        });
        ctx.fillStyle = '#1e2a35';
        ctx.fillRect(-0.8, -6, 1.6, 12);
        ctx.restore();
      }
    },
  });

  // ------------------------------------------------------------ Horizon waves (month-colored)
  const MONTH_COLORS = [
    ['#bda57a', '#6b5230'], ['#8ea35a', '#3f6a2a'], ['#e89bb8', '#b0507a'], ['#b8c4c8', '#5f8a6a'],
    ['#c8a8d8', '#7a4a9a'], ['#8fd3ff', '#0e7a8a'], ['#3aa6f5', '#0b2f73'], ['#9a6ad8', '#4a1a8a'],
    ['#9a3a4a', '#bda57a'], ['#b87333', '#5a3218'], ['#ce2029', '#6a0c10'], ['#e0b0ff', '#9aa6b4'],
  ];
  const waves = scene({
    setup(st) {
      const m = new Date().getMonth();
      st.col = MONTH_COLORS[m];
      st.sparks = Array.from({ length: st.preview ? 12 : 60 }, () => ({ x: rand(0, st.W), y: rand(st.H * 0.3, st.H * 0.8), ph: rand(0, TAU), s: rand(0.5, 1.8) }));
    },
    draw(ctx, st) {
      const { W, H, t } = st;
      const hour = new Date().getHours();
      const bright = 0.55 + 0.45 * Math.sin(((hour - 6) / 24) * TAU);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, A.fish ? A.fish.mix(st.col[1], '#000000', 0.45 - bright * 0.3) : st.col[1]);
      g.addColorStop(1, st.col[0]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const layers = [[30, 0.16, 1], [20, 0.12, 1.6], [12, 0.1, 2.3]];
      layers.forEach(([period, a, k], li) => {
        ctx.beginPath();
        const yb = H * (0.55 + li * 0.03);
        for (let x = 0; x <= W; x += 10) {
          const y = yb + Math.sin(x / W * TAU * 0.8 * k + (t / period) * TAU) * H * 0.07 + Math.sin(x / W * TAU * 2.1 * k - (t / period) * TAU * 1.3) * H * 0.025;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        const upper = [];
        for (let x = W; x >= 0; x -= 10) {
          const y = yb + H * 0.05 + Math.sin(x / W * TAU * 0.8 * k + (t / period) * TAU + 0.6) * H * 0.07 + Math.sin(x / W * TAU * 2.4 * k - (t / period) * TAU) * H * 0.02;
          upper.push([x, y]);
        }
        upper.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${a * 2})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      for (const s of st.sparks) {
        const a = Math.max(0, Math.sin(t * s.s + s.ph)) * 0.6;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.arc(s.x + Math.sin(t * 0.2 + s.ph) * 10, s.y, 1.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    },
  });

  // ------------------------------------------------------------ Rising bubbles
  const bubbles = scene({
    setup(st) {
      const { W, H } = st;
      st.b = Array.from({ length: st.preview ? 30 : 110 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(2, 16), v: rand(20, 60), ph: rand(0, TAU) }));
      st.rays = Array.from({ length: 6 }, (_, i) => ({ x: (i + 0.5) / 6, ph: rand(0, TAU) }));
      st.pops = [];
    },
    draw(ctx, st, dt) {
      const { W, H, t } = st;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#7fe6ff'); g.addColorStop(0.4, '#1fb4d8'); g.addColorStop(1, '#0a4f86');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const r of st.rays) {
        const x0 = r.x * W + Math.sin(t * 0.1 + r.ph) * W * 0.03;
        const rg = ctx.createLinearGradient(0, 0, 0, H);
        rg.addColorStop(0, 'rgba(255,255,255,0.12)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.moveTo(x0 - 30, 0); ctx.lineTo(x0 + 30, 0); ctx.lineTo(x0 + 160, H); ctx.lineTo(x0 + 40, H); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      for (const b of st.b) {
        b.y -= b.v * dt;
        if (b.y < -b.r) { b.y = H + b.r; b.x = rand(0, W); b.r = rand(2, 16); }
        const x = b.x + Math.sin(t * 2 + b.ph) * 4;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(0.7, b.r / 8); ctx.stroke();
        if (b.r > 3) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.32, b.r * 0.18, -0.5, 0, TAU); ctx.fill(); }
      }
      st.pops = st.pops.filter((p) => (p.life -= dt) > 0);
      for (const p of st.pops) {
        ctx.strokeStyle = `rgba(255,255,255,${p.life * 2})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (0.5 - p.life) * 30, 0, TAU); ctx.stroke();
      }
    },
    pointer(st, type, x, y) {
      if (type !== 'move' && type !== 'click') return false;
      let hit = false;
      for (const b of st.b) {
        if (Math.hypot(b.x - x, b.y - y) < b.r + 6) {
          st.pops.push({ x: b.x, y: b.y, r: b.r, life: 0.5 });
          b.y = st.H + b.r + rand(0, 100);
          hit = true;
        }
      }
      if (hit) A.sound.play('pop', { minGap: 60 });
      return type === 'click';
    },
  });

  register('aurora-live', 'Aurora Night', 'dark', aurora);
  register('technozen-live', 'Pearl Room', 'technozen', pearls, 'dark');
  register('sky-live', 'Daydream', 'light', meadow);
  register('wave-live', 'Horizon Waves', null, waves);
  register('bubbles-live', 'Rising Bubbles', 'light', bubbles);

  A.animatedWallpapers = { scene };
})();
