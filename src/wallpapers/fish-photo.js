/* Aerium photo fish: real aquarium fish, cut out of photographs and brought
   to life. Each photo is drawn in thin vertical slices that follow the
   swimming wave, so the body flexes and the tail swings toward and away from
   us (narrowing and dimming as it turns edge-on). Turning around folds the
   fish head first, the way a real fish curls round. Distance haze and the
   rippling light from the surface are painted on in a scratch canvas, so
   they land on the fish and nowhere else.

   Photos and their measurements live in A.PHOTOS (src/generated/photos.js).
   A palette opts in with photo: '<id>' and may recolor it with
   tone: { hue, sat, bright }. */
(function () {
  'use strict';
  const A = window.Aerium;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (t) => t * t * (3 - 2 * t);

  const N = 24; // slices from the nose (0) to the tip of the tail (N)
  const PX = new Float32Array(N + 1), PY = new Float32Array(N + 1), SH = new Float32Array(N + 1), SW = new Float32Array(N + 1);

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w); c.height = Math.max(1, h);
    return c;
  }

  // ------------------------------------------------------------ sprites
  // A sprite is a decoded photo (recolored if the palette asks) plus a chain
  // of half-size copies, so small fish are drawn from a copy near their size.
  const sprites = new Map();

  function meta(id) {
    const p = A.PHOTOS && A.PHOTOS['fish/' + id];
    return p && p.fish ? p : null;
  }

  // Hue rotation and saturation as one color matrix (the same math as SVG's
  // feColorMatrix), then brightness.
  function toneMatrix(tone) {
    const th = ((tone.hue || 0) * Math.PI) / 180, a = Math.cos(th), b = Math.sin(th);
    const H = [
      0.213 + a * 0.787 - b * 0.213, 0.715 - a * 0.715 - b * 0.715, 0.072 - a * 0.072 + b * 0.928,
      0.213 - a * 0.213 + b * 0.143, 0.715 + a * 0.285 + b * 0.14, 0.072 - a * 0.072 - b * 0.283,
      0.213 - a * 0.213 - b * 0.787, 0.715 - a * 0.715 + b * 0.715, 0.072 + a * 0.928 + b * 0.072,
    ];
    const s = tone.sat == null ? 1 : tone.sat;
    const Sm = [
      0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ];
    const k = tone.bright == null ? 1 : tone.bright;
    const M = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        M.push(k * (Sm[r * 3] * H[c] + Sm[r * 3 + 1] * H[3 + c] + Sm[r * 3 + 2] * H[6 + c]));
      }
    }
    return M;
  }

  function recolor(c, tone) {
    const g = c.getContext('2d');
    const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
    const M = toneMatrix(tone);
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      d[i] = M[0] * r + M[1] * gg + M[2] * b;
      d[i + 1] = M[3] * r + M[4] * gg + M[5] * b;
      d[i + 2] = M[6] * r + M[7] * gg + M[8] * b;
    }
    g.putImageData(im, 0, 0);
  }

  function build(sp, img) {
    const base = canvas(img.naturalWidth || img.width, img.naturalHeight || img.height);
    base.getContext('2d').drawImage(img, 0, 0);
    if (sp.tone) recolor(base, sp.tone);
    const levels = [{ c: base, s: 1 }];
    let prev = base;
    while (prev.width > 40) {
      const c = canvas(Math.round(prev.width / 2), Math.round(prev.height / 2));
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(prev, 0, 0, c.width, c.height);
      levels.push({ c, s: c.width / base.width });
      prev = c;
    }
    sp.levels = levels;
    sp.ready = true;
    flush(sp);
  }
  function flush(sp) {
    const w = sp.waiters || [];
    sp.waiters = null;
    w.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  }

  // Sprite for a palette, starting its decode on first use. null means the
  // palette has no photo (or the photo is missing): draw the painted fish.
  function sprite(pal) {
    if (!pal || !pal.photo) return null;
    const key = pal.photo + (pal.tone ? '|' + JSON.stringify(pal.tone) : '');
    let sp = sprites.get(key);
    if (!sp) {
      const m = meta(pal.photo);
      if (!m) return null;
      sp = { key, m, fm: m.fish, tone: pal.tone || null, ready: false, failed: false };
      sprites.set(key, sp);
      const img = new Image();
      img.onload = () => { try { build(sp, img); } catch (e) { sp.failed = true; flush(sp); console.error(e); } };
      img.onerror = () => { sp.failed = true; flush(sp); };
      img.src = A.photoURL ? A.photoURL('fish/' + pal.photo) : m.src;
    }
    return sp.failed ? null : sp;
  }

  function preload(species) {
    for (const id in species) species[id].palettes.forEach((p) => sprite(p));
  }

  // ------------------------------------------------------------ geometry
  // Local units: the body (nose to tail root) is len * bodyLen long, like the
  // painted fish, and the local origin is the middle of the body.
  function geo(f, sp) {
    const fm = sp.fm;
    if (f._pg && f._pg.sp === sp && f._pg.len === f.len) return f._pg;
    const k = (f.len * (f.sp.bodyLen || 0.6) * (fm.scale || 1)) / (fm.nose - fm.root);
    const cx = fm.cx != null ? fm.cx : fm.root + (fm.nose - fm.root) * 0.48;
    const Lpx = fm.nose - fm.tip;
    f._pg = {
      sp, len: f.len, k, cx, Lpx,
      L: Lpx * k,
      r: (fm.nose - fm.root) / Lpx,
      uc: (fm.nose - cx) / Lpx,
      top: -fm.axis * k,
      hgt: sp.m.h * k,
    };
    return f._pg;
  }

  // Turning: every slice has its own heading (0 = facing right, PI = left).
  // The head swings round first and the rest follows, so a turn travels down
  // the body; reversing mid-turn just sends the slices back.
  function steer(f, t) {
    let y = f._yaw;
    const target = (f.facing != null ? f.facing : f.turn != null ? Math.sign(f.turn) || 1 : 1) < 0 ? Math.PI : 0;
    if (!y) {
      y = f._yaw = new Float32Array(N + 1).fill(target);
      f._yawT = t;
      return y;
    }
    const dt = clamp(t - (f._yawT != null ? f._yawT : t), 0, 0.1);
    f._yawT = t;
    if (!dt) return y;
    const w = (Math.PI * (f.sp.turnRate || 2.5)) / 2;
    for (let i = 0; i <= N; i++) {
      const u = i / N, step = w * (1.7 - 1.1 * u) * dt;
      y[i] += clamp(target - y[i], -step, step);
    }
    return y;
  }

  // Which way the middle of the body points: 1 right, -1 left, and in
  // between mid-turn. Used to tilt the fish when it swims up or down.
  function heading(f) {
    const y = f._yaw;
    if (!y) return f.facing != null ? f.facing : 1;
    return Math.cos(y[N >> 1]);
  }

  // The swimming pose: the rear body and tail yaw side to side, which from
  // the side shows as the tail end foreshortening. Fills PX/PY (posed slice
  // edges), SH (how edge-on each is) and SW (heading, with the turn).
  function pose(f, g, yaw) {
    const r = g.r, hd = r * (g.sp.fm.head || 0.3);
    const ph = f.phase || 0;
    const bend = clamp(f.bend || 0.012, 0, 0.08);
    const amp = 0.3 + bend * 8;
    const fin = 0.38 + bend * 8;
    const kw = 2.3, ver = bend * 0.5 * (g.sp.fm.wave == null ? 1 : g.sp.fm.wave);
    const L = g.L;
    // mid-turn the fish curls instead of beating its tail
    const turning = Math.abs(Math.sin(yaw[N >> 1])) + Math.abs(Math.sin(yaw[0])) * 0.5;
    const calm = 1 - 0.75 * Math.min(1, turning);
    let x = 0;
    PX[0] = 0; PY[0] = 0;
    SW[0] = yaw[0]; SH[0] = 0;
    for (let i = 1; i <= N; i++) {
      const u = i / N, um = (i - 0.5) / N;
      let sw;
      if (um < hd) sw = -0.05 * amp * Math.sin(ph);
      else if (um < r) { const q = (um - hd) / (r - hd); sw = amp * q * q * Math.sin(ph - kw * um); }
      else { const q = (um - r) / (1 - r); sw = amp * Math.sin(ph - kw * um) + fin * q * Math.sin(ph - kw * um - 0.8); }
      sw *= calm;
      // a turning slice hurries through edge-on, and never quite vanishes
      let ty = yaw[i] * 0.5 + yaw[i - 1] * 0.5;
      ty -= 0.32 * Math.sin(2 * ty);
      const ang = ty + sw;
      let cx = Math.cos(ang);
      if (cx > -0.12 && cx < 0.12) cx = Math.cos(ty) >= 0 ? 0.12 : -0.12;
      x -= cx * (L / N);
      PX[i] = x;
      PY[i] = ver * L * Math.sin(ph - 2.6 * u) * u * u;
      SH[i] = Math.abs(Math.sin(sw));
      SW[i] = ang;
    }
    // keep the middle of the body where it is
    const fi = g.uc * N, i0 = Math.min(N - 1, Math.floor(fi)), uu = fi - i0;
    const cxp = PX[i0] + (PX[i0 + 1] - PX[i0]) * uu;
    const cyp = PY[i0] + (PY[i0 + 1] - PY[i0]) * uu;
    for (let i = 0; i <= N; i++) { PX[i] -= cxp; PY[i] -= cyp; }
  }

  // ------------------------------------------------------------ drawing
  let scratch = null, sg = null;
  function ensureScratch(w, h) {
    if (!scratch || scratch.width < w || scratch.height < h) {
      scratch = canvas(Math.max(w, scratch ? scratch.width : 0, 64), Math.max(h, scratch ? scratch.height : 0, 64));
      sg = scratch.getContext('2d');
    }
    return sg;
  }

  function slices(g2, sp, lvl, m, geom, step, flare) {
    const fm = sp.fm, c = lvl.c, s = lvl.s, k = geom.k;
    const a = m.a, b = m.b, cc = m.c, d = m.d, e = m.e, ff = m.f;
    const px = Math.hypot(cc, d) * k || 1;
    const ov = 1 / px; // about a device pixel of overlap hides the joins
    const W = sp.m.w;
    // tail first, so a head swinging round lands on top
    for (let i = N - step; i >= 0; i -= step) {
      const j = i + step;
      const p1 = fm.nose - (i / N) * geom.Lpx, p0 = fm.nose - (j / N) * geom.Lpx;
      const u1 = (p1 - geom.cx) * k, u0 = (p0 - geom.cx) * k, span = u1 - u0;
      const ma = (PX[i] - PX[j]) / span, mb = (PY[i] - PY[j]) / span;
      const me = PX[j] - ma * u0, mf = PY[j] - mb * u0;
      const sy = flare ? 1 + flare * smooth(clamp((i / N - 0.15) * 2, 0, 1)) : 1;
      let s0 = j >= N ? 0 : p0 - ov, s1 = i === 0 ? W : p1 + ov;
      if (s0 < 0) s0 = 0;
      if (s1 > W) s1 = W;
      if (s1 - s0 <= 0) continue;
      g2.setTransform(a * ma + cc * mb, b * ma + d * mb, cc * sy, d * sy, a * me + cc * mf + e, b * me + d * mf + ff);
      g2.drawImage(c, s0 * s, 0, (s1 - s0) * s, c.height, (s0 - geom.cx) * k, geom.top, (s1 - s0) * k, geom.hgt);
    }
  }

  // Draws the fish at the current transform, facing +x at rest (a facing /
  // turn on the fish steers it). fx: { light(g, ox, oy) } paints rippling
  // light onto the fish; f.fog = { color, amount, blur } hazes it.
  // Returns undefined when this fish has no photo to draw.
  function draw(ctx, f, t, alpha = 1, fx = null) {
    const sp = sprite(f.pal);
    if (!sp) return undefined;
    if (!sp.ready) return null; // still decoding: draw nothing for a moment
    const geom = geo(f, sp);
    const yaw = steer(f, t);
    pose(f, geom, yaw);

    const m = ctx.getTransform();
    const unit = Math.hypot(m.c, m.d) || 1; // device px per local unit
    const fog = f.fog || null;
    const blur = fog && fog.blur ? fog.blur : 0;
    // pick the smallest copy that still has a pixel for every screen pixel
    // (a size smaller when the fish is far away and out of focus)
    const need = (unit * geom.k) / (1 + blur * 0.8);
    let lvl = sp.levels[0];
    for (const L of sp.levels) { if (L.s >= need) lvl = L; else break; }
    const onScreen = geom.L * unit;
    const step = onScreen > 90 ? 1 : onScreen > 40 ? 2 : onScreen > 20 ? 3 : 4;
    const flare = (f.flare || 0) * (sp.fm.flare || 0);

    // bounds of the posed fish, in device pixels
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i <= N; i++) {
      if (PX[i] < x0) x0 = PX[i];
      if (PX[i] > x1) x1 = PX[i];
      if (PY[i] < y0) y0 = PY[i];
      if (PY[i] > y1) y1 = PY[i];
    }
    const padX = Math.max(sp.m.w - sp.fm.nose, sp.fm.tip, 2) * geom.k;
    const fl = 1 + flare;
    const lx0 = x0 - padX, lx1 = x1 + padX, ly0 = geom.top * fl + y0, ly1 = (geom.top + geom.hgt) * fl + y1;
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (let q = 0; q < 4; q++) {
      const lx = q & 1 ? lx1 : lx0, ly = q & 2 ? ly1 : ly0;
      const X = m.a * lx + m.c * ly + m.e, Y = m.b * lx + m.d * ly + m.f;
      if (X < bx0) bx0 = X;
      if (X > bx1) bx1 = X;
      if (Y < by0) by0 = Y;
      if (Y > by1) by1 = Y;
    }
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    bx0 = Math.max(0, Math.floor(bx0) - 2); by0 = Math.max(0, Math.floor(by0) - 2);
    bx1 = Math.min(cw, Math.ceil(bx1) + 2); by1 = Math.min(ch, Math.ceil(by1) + 2);
    const bw = bx1 - bx0, bh = by1 - by0;
    f._mouth = mouthAt(f, geom);
    if (bw <= 0 || bh <= 0) return null;

    const g2 = ensureScratch(bw, bh);
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.globalCompositeOperation = 'source-over';
    g2.globalAlpha = 1;
    g2.clearRect(0, 0, bw, bh);
    g2.imageSmoothingEnabled = true;
    const sm = new DOMMatrix([m.a, m.b, m.c, m.d, m.e - bx0, m.f - by0]);
    slices(g2, sp, lvl, sm, geom, step, flare);

    g2.globalCompositeOperation = 'source-atop';
    // The tail dims as it turns edge-on to us and brightens as it comes back.
    if (onScreen > 36) {
      let mono = true;
      const dir = Math.sign(PX[0] - PX[N]) || 1;
      for (let i = 0; i < N && mono; i++) if ((PX[i] - PX[i + 1]) * dir <= 0) mono = false;
      if (mono) {
        g2.setTransform(sm);
        const gr = g2.createLinearGradient(PX[0], 0, PX[N], 0);
        const span = PX[N] - PX[0];
        const r0 = geom.r * 0.75;
        for (let i = 0; i <= N; i += 2) {
          const u = i / N, w = u < r0 ? 0 : smooth(Math.min(1, (u - r0) / (1 - r0) * 2));
          gr.addColorStop(clamp((PX[i] - PX[0]) / span, 0, 1), `rgba(6,24,40,${(0.42 * SH[i] * w).toFixed(3)})`);
        }
        g2.fillStyle = gr;
        g2.fillRect(lx0, ly0, lx1 - lx0, ly1 - ly0);
      }
    }
    g2.setTransform(1, 0, 0, 1, 0, 0);
    // a touch lighter or darker per fish, so a school isn't all clones
    const vary = ((f.seed || 0) * 7.31) % 1;
    if (vary > 0.12) {
      g2.globalAlpha = Math.abs(vary - 0.5) * 0.14;
      g2.fillStyle = vary > 0.5 ? '#ffffff' : '#001018';
      g2.fillRect(0, 0, bw, bh);
    }
    if (fog && fog.amount > 0) {
      g2.globalAlpha = Math.min(0.92, fog.amount * 0.95);
      g2.fillStyle = fog.color;
      g2.fillRect(0, 0, bw, bh);
    }
    g2.globalAlpha = 1;
    if (fx && fx.light) {
      g2.save();
      fx.light(g2, bx0, by0);
      g2.restore();
    }
    g2.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha *= alpha;
    ctx.drawImage(scratch, 0, 0, bw, bh, bx0, by0, bw, bh);
    ctx.restore();
    return null;
  }

  function mouthAt(f, geom) {
    const fm = geom.sp.fm, mo = fm.mouth || [fm.nose, fm.axis];
    // the nose sits at the head end of the posed spine
    const dir = Math.cos(SW[0]);
    return [PX[0] + (mo[0] - fm.nose) * geom.k * dir, PY[0] + (mo[1] - fm.axis) * geom.k];
  }

  // Mouth in local space, already facing the way the fish faces.
  function mouth(f) {
    const sp = sprite(f.pal);
    if (!sp || !sp.ready) return null;
    if (f._mouth) return f._mouth;
    const g = geo(f, sp), fm = sp.fm, mo = fm.mouth || [fm.nose, fm.axis];
    const dir = (f.facing != null ? f.facing : 1) < 0 ? -1 : 1;
    return [(mo[0] - g.cx) * g.k * dir, (mo[1] - fm.axis) * g.k];
  }

  // Straight-pose bounds in local units: { x0, x1, y0, y1 }.
  function extent(f) {
    const sp = sprite(f.pal);
    if (!sp) return null;
    const g = geo(f, sp);
    return { x0: -g.cx * g.k, x1: (sp.m.w - g.cx) * g.k, y0: g.top, y1: g.top + g.hgt };
  }

  function has(f) { return !!sprite(f.pal); }

  // Whether the palette's photo is ready to draw (or there is none), and a
  // way to hear when it is.
  function ready(pal) {
    const sp = sprite(pal);
    return !sp || sp.ready || sp.failed;
  }
  function whenReady(pal, cb) {
    const sp = sprite(pal);
    if (!sp || sp.ready || sp.failed) { cb(); return; }
    (sp.waiters = sp.waiters || []).push(cb);
  }

  A.fishPhoto = { draw, mouth, extent, heading, has, ready, whenReady, preload, sprite };
})();
