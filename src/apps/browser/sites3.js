/* The pretend web, part 3: MiniGames.com (three playable canvas games),
   GeoPlace homepages, a very suspicious screensaver site, FishPals, the
   AeroFans forum, QuizBubble, Ringtonez4U and BubbleCards e-cards. */
(function () {
  'use strict';
  const A = window.Aerium;
  const W = A.web || (A.web = { sites: [], kit: {}, register(def) { this.sites.push(def); return def; } });
  const K = W.kit || (W.kit = {});
  const esc = A.util.escapeHTML;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const D = 86400000, H = 3600000;

  function glossBall(g, x, y, r, c1, c2, rim) {
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    if (rim) { g.strokeStyle = rim; g.lineWidth = Math.max(1, r * 0.08); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x - r * 0.15, y - r * 0.5, r * 0.55, r * 0.28, 0, 0, Math.PI * 2); g.fill();
  }
  function bubbleRing(g, x, y, r, a) {
    g.save(); g.globalAlpha = a == null ? 1 : a;
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.35, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(160,220,255,.5)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = Math.max(0.8, r * 0.07); g.stroke();
    g.restore();
  }
  function sideFish(g, x, y, s, dir, c1, c2, t) {
    g.save(); g.translate(x, y); g.scale(dir * s, s);
    const wag = Math.sin(t * 9) * 0.3;
    g.fillStyle = c2;
    g.beginPath(); g.moveTo(-16, 0); g.quadraticCurveTo(-26, -4, -34, -12 + wag * 8); g.quadraticCurveTo(-29, 0, -34, 12 + wag * 8); g.quadraticCurveTo(-26, 4, -16, 0); g.fill();
    g.beginPath(); g.moveTo(-9, -8); g.quadraticCurveTo(-1, -21, 9, -9); g.closePath(); g.fill();
    const gr = g.createLinearGradient(0, -12, 0, 12);
    gr.addColorStop(0, '#fff7d6'); gr.addColorStop(0.35, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(11, -3, 3.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(12, -3, 1.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(2, -6, 12, 3.5, -0.1, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function hud(g, text, x, y, size, color, align) {
    g.save();
    g.font = `bold ${size}px "Trebuchet MS", Verdana, sans-serif`;
    g.textAlign = align || 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = Math.max(3, size / 5); g.strokeText(text, x, y);
    g.fillStyle = color || '#fff'; g.fillText(text, x, y);
    g.restore();
  }

  // ================================================================ www.minigames.com
  // Each game: create(host, ctx, api) -> { destroy() }. The canvas is 640x400.
  const GW = 640, GH = 400;
  function makeCanvas(ctx, host) {
    const cv = ctx.canvas(GW, GH, 'web-mg-canvas');
    cv.c.tabIndex = 0;
    cv.c.setAttribute('aria-label', 'Game');
    host.appendChild(cv.c);
    setTimeout(() => { if (ctx.visible()) cv.c.focus({ preventScroll: true }); }, 30);
    return cv;
  }

  function gameCopter(host, ctx, api) {
    const cv = makeCanvas(ctx, host), g = cv.g, c = cv.c;
    let st, hold = false;
    const SEG = 16;
    function reset() {
      st = { mode: 'ready', y: GH / 2, vy: 0, dist: 0, speed: 170, top: [], bot: [], obs: [], trail: [], pop: 0, t: 0, drift: 0, gap: 250, center: GH / 2 };
      for (let x = 0; x <= GW + SEG; x += SEG) pushSeg();
    }
    function pushSeg() {
      st.drift += (Math.random() - 0.5) * 16;
      st.drift = clamp(st.drift, -9, 9);
      st.center = clamp(st.center + st.drift, st.gap / 2 + 20, GH - st.gap / 2 - 20);
      if (Math.abs(st.center - GH / 2) > 90) st.drift *= -0.6;
      st.top.push(st.center - st.gap / 2);
      st.bot.push(st.center + st.gap / 2);
    }
    reset();
    const press = (on) => {
      hold = on;
      if (on && st.mode === 'ready') { st.mode = 'play'; api.sound('bubble'); }
      else if (on && st.mode === 'dead' && st.t > 0.8) reset();
    };
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); c.focus({ preventScroll: true }); press(true); });
    c.addEventListener('pointerup', () => press(false));
    c.addEventListener('pointerleave', () => { hold = false; });
    c.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); if (!e.repeat) press(true); } });
    c.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); press(false); } });
    const PX = 150, R = 13;
    function wallAt(x) {
      const i = Math.floor((x + st.dist % SEG) / SEG);
      return [st.top[clamp(i, 0, st.top.length - 1)], st.bot[clamp(i, 0, st.bot.length - 1)]];
    }
    ctx.loop((dt) => {
      st.t += dt;
      if (st.mode === 'play') {
        st.vy += (hold ? -620 : 520) * dt;
        st.vy = clamp(st.vy, -300, 340);
        st.y += st.vy * dt;
        const step = st.speed * dt;
        const before = Math.floor(st.dist / SEG);
        st.dist += step;
        st.speed = Math.min(330, 170 + st.dist / 60);
        st.gap = Math.max(130, 250 - st.dist / 45);
        const after = Math.floor(st.dist / SEG);
        for (let k = before; k < after; k++) { st.top.shift(); st.bot.shift(); pushSeg(); }
        st.obs.forEach((o) => { o.x -= step; });
        st.obs = st.obs.filter((o) => o.x > -40);
        if (!st.obs.length || st.obs[st.obs.length - 1].x < GW - 230 - Math.random() * 200) {
          const [tp, bt] = wallAt(GW + 20);
          const hh = 40 + Math.random() * 40;
          st.obs.push({ x: GW + 20, y: lerp(tp + 10, bt - hh - 10, Math.random()), w: 22, h: hh });
        }
        st.trail.push({ x: PX - 12, y: st.y + (Math.random() * 6 - 3), r: 2 + Math.random() * 3, a: 1 });
        const [tp, bt] = wallAt(PX);
        const hitObs = st.obs.some((o) => PX + R > o.x && PX - R < o.x + o.w && st.y + R > o.y && st.y - R < o.y + o.h);
        if (st.y - R < tp || st.y + R > bt || hitObs) {
          st.mode = 'dead'; st.t = 0; st.pop = 0;
          api.sound('pop');
          const score = Math.floor(st.dist / 10);
          if (score > api.best()) { api.setBest(score); st.newBest = true; } else st.newBest = false;
        }
      }
      st.trail.forEach((p) => { p.x -= (st.mode === 'play' ? st.speed : 40) * dt; p.y -= 20 * dt; p.a -= dt * 1.2; });
      st.trail = st.trail.filter((p) => p.a > 0);
      if (st.mode === 'dead') st.pop += dt;
      draw();
    });
    function draw() {
      const bg = g.createLinearGradient(0, 0, 0, GH);
      bg.addColorStop(0, '#0d6f99'); bg.addColorStop(1, '#063650');
      g.fillStyle = bg; g.fillRect(0, 0, GW, GH);
      g.fillStyle = 'rgba(255,255,255,.05)';
      for (let i = 0; i < 5; i++) { const x = ((i * 170 - st.dist * 0.2) % 800 + 800) % 800 - 80; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x + 120, GH); g.lineTo(x + 70, GH); g.fill(); }
      const off = st.dist % SEG;
      const wall = (arr, isTop) => {
        const gr = g.createLinearGradient(0, isTop ? 0 : GH, 0, isTop ? 140 : GH - 140);
        gr.addColorStop(0, '#5a1d4a'); gr.addColorStop(1, '#e8639a');
        g.fillStyle = gr; g.beginPath();
        g.moveTo(-off, isTop ? 0 : GH);
        arr.forEach((v, i) => g.lineTo(i * SEG - off, v));
        g.lineTo((arr.length - 1) * SEG - off, isTop ? 0 : GH);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,190,220,.6)'; g.lineWidth = 2; g.beginPath();
        arr.forEach((v, i) => (i ? g.lineTo(i * SEG - off, v) : g.moveTo(-off, v)));
        g.stroke();
      };
      wall(st.top, true); wall(st.bot, false);
      st.obs.forEach((o) => {
        const gr = g.createLinearGradient(o.x, 0, o.x + o.w, 0);
        gr.addColorStop(0, '#ff9a5a'); gr.addColorStop(1, '#c2410c');
        g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(o.x, o.y, o.w, o.h, 8) : g.rect(o.x, o.y, o.w, o.h); g.fill();
        g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(o.x + 4, o.y + 4, 4, o.h - 8);
      });
      st.trail.forEach((p) => bubbleRing(g, p.x, p.y, p.r, p.a));
      if (st.mode !== 'dead') {
        bubbleRing(g, PX, st.y, R + 4, 1);
        sideFish(g, PX, st.y, 0.42, 1, '#ff9a2e', '#e0560f', st.t);
      } else if (st.pop < 0.5) {
        g.strokeStyle = `rgba(255,255,255,${1 - st.pop * 2})`; g.lineWidth = 3;
        g.beginPath(); g.arc(PX, st.y, R + 4 + st.pop * 60, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; bubbleRing(g, PX + Math.cos(a) * st.pop * 90, st.y + Math.sin(a) * st.pop * 90, 3, 1 - st.pop * 2); }
      }
      hud(g, 'Distance: ' + Math.floor(st.dist / 10), 14, 20, 16, '#fff');
      hud(g, 'Best: ' + api.best(), GW - 14, 20, 16, '#ffe34a', 'right');
      if (st.mode === 'ready') { hud(g, 'BUBBLE COPTER', GW / 2, GH / 2 - 40, 38, '#9ff0ff', 'center'); hud(g, 'Hold the mouse button (or Space) to float up. Let go to sink.', GW / 2, GH / 2 + 6, 15, '#fff', 'center'); hud(g, 'Click to start', GW / 2, GH / 2 + 40, 20, '#ffe34a', 'center'); }
      if (st.mode === 'dead') { hud(g, 'POP!', GW / 2, GH / 2 - 40, 44, '#ff9ac2', 'center'); hud(g, 'Distance: ' + Math.floor(st.dist / 10) + (st.newBest ? '  (new best!)' : ''), GW / 2, GH / 2 + 6, 20, '#fff', 'center'); if (st.t > 0.8) hud(g, 'Click to try again', GW / 2, GH / 2 + 40, 18, '#ffe34a', 'center'); }
    }
    return { destroy() {} };
  }

  function gameCatcher(host, ctx, api) {
    const cv = makeCanvas(ctx, host), g = cv.g, c = cv.c;
    let st, keys = { l: false, r: false };
    const reset = () => { st = { mode: 'ready', x: GW / 2, tx: GW / 2, dir: 1, score: 0, lives: 3, items: [], pops: [], t: 0, spawn: 0, rate: 1.1, hurt: 0 }; };
    reset();
    c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); st.tx = ((e.clientX - r.left) / r.width) * GW; });
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); c.focus({ preventScroll: true }); if (st.mode === 'ready') { st.mode = 'play'; api.sound('plop'); } else if (st.mode === 'over' && st.t > 0.8) reset(); });
    c.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { keys.l = true; e.preventDefault(); } else if (e.key === 'ArrowRight') { keys.r = true; e.preventDefault(); }
      else if (e.key === ' ') { e.preventDefault(); if (st.mode === 'ready') st.mode = 'play'; else if (st.mode === 'over' && st.t > 0.8) reset(); }
    });
    c.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft') keys.l = false; else if (e.key === 'ArrowRight') keys.r = false; });
    const plants = Array.from({ length: 7 }, (_, i) => ({ x: 40 + i * 95, h: 50 + (i * 37) % 60 }));
    ctx.loop((dt) => {
      st.t += dt;
      if (keys.l) st.tx = st.x - 300 * 0.2;
      if (keys.r) st.tx = st.x + 300 * 0.2;
      st.tx = clamp(st.tx, 30, GW - 30);
      const vx = (st.tx - st.x) * Math.min(1, dt * 8);
      if (Math.abs(vx) > 0.3) st.dir = vx > 0 ? 1 : -1;
      st.x += vx;
      if (st.mode === 'play') {
        st.spawn -= dt;
        st.rate = Math.max(0.35, 1.1 - st.t / 60);
        if (st.spawn <= 0) {
          st.spawn = st.rate * (0.6 + Math.random() * 0.8);
          const r = Math.random();
          const kind = r < 0.14 ? 'boot' : r < 0.22 ? 'can' : r < 0.3 ? 'gold' : 'flake';
          st.items.push({ kind, x: 30 + Math.random() * (GW - 60), y: -20, v: 70 + Math.random() * 50 + st.t * 1.6, rot: Math.random() * 6, hue: Math.floor(Math.random() * 4) });
        }
        st.items.forEach((it) => { it.y += it.v * dt; it.rot += dt * 2; });
        st.items = st.items.filter((it) => {
          const caught = it.y > 330 && it.y < 372 && Math.abs(it.x - st.x) < 30;
          if (caught) {
            if (it.kind === 'boot' || it.kind === 'can') { st.lives--; st.hurt = 0.5; api.sound('error'); st.pops.push({ x: it.x, y: it.y, text: 'Yuck!', c: '#ff8a8a', a: 1 }); if (st.lives <= 0) { st.mode = 'over'; st.t = 0; if (st.score > api.best()) { api.setBest(st.score); st.newBest = true; } } }
            else { const pts = it.kind === 'gold' ? 50 : 10; st.score += pts; api.sound(it.kind === 'gold' ? 'coin' : 'plop'); st.pops.push({ x: it.x, y: it.y, text: '+' + pts, c: it.kind === 'gold' ? '#ffe34a' : '#fff', a: 1 }); }
            return false;
          }
          return it.y < GH + 30;
        });
      }
      st.pops.forEach((p) => { p.y -= 40 * dt; p.a -= dt * 1.3; });
      st.pops = st.pops.filter((p) => p.a > 0);
      st.hurt = Math.max(0, st.hurt - dt);
      draw();
    });
    function draw() {
      const bg = g.createLinearGradient(0, 0, 0, GH);
      bg.addColorStop(0, '#45b6ee'); bg.addColorStop(1, '#0c5a96');
      g.fillStyle = bg; g.fillRect(0, 0, GW, GH);
      g.lineCap = 'round';
      plants.forEach((p, i) => { g.strokeStyle = i % 2 ? '#35b04a' : '#5ac33a'; g.lineWidth = 6; g.beginPath(); g.moveTo(p.x, GH); g.quadraticCurveTo(p.x + Math.sin(st.t + i) * 10, GH - p.h / 2, p.x + Math.sin(st.t * 1.3 + i) * 14, GH - p.h); g.stroke(); });
      g.fillStyle = '#e6d3a0'; g.fillRect(0, GH - 18, GW, 18);
      st.items.forEach((it) => {
        g.save(); g.translate(it.x, it.y); g.rotate(it.rot);
        if (it.kind === 'flake') { g.fillStyle = ['#ff8a3a', '#ffd23a', '#7ad84a', '#ff6a8a'][it.hue]; g.beginPath(); g.moveTo(-7, -4); g.lineTo(6, -6); g.lineTo(8, 4); g.lineTo(-5, 6); g.closePath(); g.fill(); }
        else if (it.kind === 'gold') { g.rotate(-it.rot); glossBall(g, 0, 0, 9, '#fff3a8', '#e0a000', '#9a6a00'); }
        else if (it.kind === 'boot') { g.fillStyle = '#6b4a2a'; g.fillRect(-8, -14, 11, 18); g.fillRect(-8, 0, 20, 8); g.fillStyle = '#3a2a1a'; g.fillRect(-8, 6, 20, 3); }
        else { g.fillStyle = '#9aa4ae'; g.fillRect(-7, -10, 14, 20); g.fillStyle = '#c8ced4'; g.fillRect(-7, -10, 14, 4); g.fillStyle = '#d24a3a'; g.fillRect(-7, -3, 14, 6); }
        g.restore();
      });
      g.save();
      if (st.hurt > 0 && Math.floor(st.hurt * 20) % 2) g.globalAlpha = 0.4;
      sideFish(g, st.x, 352, 1.3, st.dir, '#ff9a2e', '#e0560f', st.t);
      g.restore();
      st.pops.forEach((p) => { g.globalAlpha = Math.max(0, p.a); hud(g, p.text, p.x, p.y, 18, p.c, 'center'); g.globalAlpha = 1; });
      hud(g, 'Score: ' + st.score, 14, 20, 17, '#fff');
      hud(g, 'Best: ' + api.best(), GW / 2, 20, 15, '#ffe34a', 'center');
      for (let i = 0; i < 3; i++) { g.globalAlpha = i < st.lives ? 1 : 0.25; sideFish(g, GW - 30 - i * 34, 22, 0.55, -1, '#ff9a2e', '#e0560f', 0); g.globalAlpha = 1; }
      if (st.mode === 'ready') { hud(g, 'FISH FOOD FRENZY', GW / 2, GH / 2 - 50, 36, '#ffe34a', 'center'); hud(g, 'Move the mouse (or arrow keys) to catch falling food.', GW / 2, GH / 2 - 8, 15, '#fff', 'center'); hud(g, 'Golden pellets are worth 50. Avoid boots and cans!', GW / 2, GH / 2 + 16, 15, '#fff', 'center'); hud(g, 'Click to start', GW / 2, GH / 2 + 52, 20, '#9ff0ff', 'center'); }
      if (st.mode === 'over') { g.fillStyle = 'rgba(0,20,50,.45)'; g.fillRect(0, 0, GW, GH); hud(g, 'GAME OVER', GW / 2, GH / 2 - 36, 40, '#ff9ac2', 'center'); hud(g, 'Score: ' + st.score + (st.newBest ? '  (new best!)' : ''), GW / 2, GH / 2 + 6, 22, '#fff', 'center'); if (st.t > 0.8) hud(g, 'Click to play again', GW / 2, GH / 2 + 42, 18, '#9ff0ff', 'center'); }
    }
    return { destroy() {} };
  }

  function gamePopper(host, ctx, api) {
    const cv = makeCanvas(ctx, host), g = cv.g, c = cv.c;
    let st;
    const COLORS = [['#9fe0ff', '#1a8fe0'], ['#b8f5a0', '#2fb52f'], ['#ffd6a0', '#f08a12'], ['#ffc2e0', '#e0457b'], ['#e0d0ff', '#7a5ae0']];
    const reset = () => { st = { mode: 'ready', t: 0, left: 45, score: 0, combo: 1, lastPop: -9, bubbles: [], bits: [], spawn: 0 }; };
    reset();
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      c.focus({ preventScroll: true });
      if (st.mode === 'ready') { st.mode = 'play'; st.t = 0; return; }
      if (st.mode === 'over') { if (st.t > 0.8) reset(); return; }
      const r = c.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * GW, y = ((e.clientY - r.top) / r.height) * GH;
      for (let i = st.bubbles.length - 1; i >= 0; i--) {
        const b = st.bubbles[i];
        if ((x - b.x) ** 2 + (y - b.y) ** 2 < (b.r + 4) ** 2) {
          st.bubbles.splice(i, 1);
          if (b.spiky) { st.left = Math.max(0, st.left - 5); api.sound('error'); st.bits.push({ x: b.x, y: b.y, text: '-5 sec', a: 1, c: '#ff8a8a' }); st.combo = 1; return; }
          st.combo = st.t - st.lastPop < 0.7 ? Math.min(8, st.combo + 1) : 1;
          st.lastPop = st.t;
          const pts = (b.gold ? 50 : Math.round(40 - b.r)) * st.combo;
          st.score += pts;
          api.sound(b.gold ? 'coin' : 'pop');
          st.bits.push({ x: b.x, y: b.y, text: '+' + pts + (st.combo > 1 ? ' x' + st.combo : ''), a: 1, c: b.gold ? '#ffe34a' : '#fff', ring: b.r });
          return;
        }
      }
      st.combo = 1;
    });
    ctx.loop((dt) => {
      st.t += dt;
      if (st.mode === 'play') {
        st.left -= dt;
        st.spawn -= dt;
        if (st.spawn <= 0) {
          st.spawn = Math.max(0.22, 0.7 - st.t / 90);
          const r = 12 + Math.random() * 22;
          const roll = Math.random();
          st.bubbles.push({ x: r + Math.random() * (GW - r * 2), y: GH + r, r, v: 50 + Math.random() * 60 + st.t, ph: Math.random() * 6, col: COLORS[Math.floor(Math.random() * COLORS.length)], gold: roll < 0.06, spiky: roll > 0.93 });
        }
        st.bubbles.forEach((b) => { b.y -= b.v * dt; b.x += Math.sin(st.t * 2 + b.ph) * 20 * dt; });
        st.bubbles = st.bubbles.filter((b) => b.y > -b.r * 2);
        if (st.left <= 0) { st.left = 0; st.mode = 'over'; st.t = 0; if (st.score > api.best()) { api.setBest(st.score); st.newBest = true; } api.sound('win'); }
      }
      st.bits.forEach((p) => { p.y -= 30 * dt; p.a -= dt * 1.4; });
      st.bits = st.bits.filter((p) => p.a > 0);
      draw();
    });
    function draw() {
      const bg = g.createLinearGradient(0, 0, 0, GH);
      bg.addColorStop(0, '#2f95e6'); bg.addColorStop(0.7, '#9fd6fb'); bg.addColorStop(1, '#e6f7ff');
      g.fillStyle = bg; g.fillRect(0, 0, GW, GH);
      const sun = g.createRadialGradient(560, 50, 5, 560, 50, 160);
      sun.addColorStop(0, 'rgba(255,250,210,.95)'); sun.addColorStop(1, 'rgba(255,250,210,0)');
      g.fillStyle = sun; g.fillRect(0, 0, GW, GH);
      g.fillStyle = '#7fd05a'; g.beginPath(); g.moveTo(0, GH); g.quadraticCurveTo(160, GH - 70, 330, GH - 30); g.quadraticCurveTo(500, GH - 5, GW, GH - 60); g.lineTo(GW, GH); g.fill();
      st.bubbles.forEach((b) => {
        if (b.spiky) {
          g.fillStyle = '#5a3a7a';
          g.beginPath();
          for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 + st.t, rr = k % 2 ? b.r * 0.75 : b.r * 1.15; g.lineTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr); }
          g.closePath(); g.fill();
          glossBall(g, b.x, b.y, b.r * 0.7, '#c9a0ff', '#4a2a6a');
        } else if (b.gold) glossBall(g, b.x, b.y, b.r, '#fff3a8', '#e0a000', '#9a6a00');
        else { bubbleRing(g, b.x, b.y, b.r, 1); g.strokeStyle = b.col[1]; g.globalAlpha = 0.55; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, b.r - 1, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
      });
      st.bits.forEach((p) => {
        g.globalAlpha = Math.max(0, p.a);
        if (p.ring) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y + (1 - p.a) * 30, p.ring + (1 - p.a) * 20, 0, Math.PI * 2); g.stroke(); }
        hud(g, p.text, p.x, p.y, 16, p.c, 'center');
        g.globalAlpha = 1;
      });
      hud(g, 'Score: ' + st.score, 14, 20, 17, '#fff');
      hud(g, 'Time: ' + Math.ceil(st.left), GW / 2, 20, 17, st.left < 10 ? '#ffb0b0' : '#fff', 'center');
      hud(g, 'Best: ' + api.best(), GW - 14, 20, 15, '#ffe34a', 'right');
      if (st.combo > 1 && st.mode === 'play') hud(g, 'Combo x' + st.combo, GW / 2, 46, 15, '#ffe34a', 'center');
      if (st.mode === 'ready') { hud(g, 'BUBBLE POP BLITZ', GW / 2, GH / 2 - 50, 36, '#fff', 'center'); hud(g, 'Click bubbles to pop them. Small bubbles are worth more.', GW / 2, GH / 2 - 8, 15, '#fff', 'center'); hud(g, 'Pop quickly for combos. Gold is 50. Spiky ones cost 5 seconds!', GW / 2, GH / 2 + 16, 15, '#fff', 'center'); hud(g, 'Click to start', GW / 2, GH / 2 + 52, 20, '#ffe34a', 'center'); }
      if (st.mode === 'over') { g.fillStyle = 'rgba(0,30,70,.4)'; g.fillRect(0, 0, GW, GH); hud(g, "TIME'S UP!", GW / 2, GH / 2 - 36, 40, '#ffe34a', 'center'); hud(g, 'Score: ' + st.score + (st.newBest ? '  (new best!)' : ''), GW / 2, GH / 2 + 6, 22, '#fff', 'center'); if (st.t > 0.8) hud(g, 'Click to play again', GW / 2, GH / 2 + 42, 18, '#9ff0ff', 'center'); }
    }
    return { destroy() {} };
  }

  const MG_GAMES = [
    { id: 'copter', title: 'Bubble Copter', cat: 'Skill', icon: 'icons/bubble', c1: '#0d6f99', c2: '#e8639a', rating: 4.7, plays: 2841094, play: gameCopter, isNew: false, desc: 'Guide a goldfish in a bubble through an underwater cave. Hold to float, let go to sink. How far can you go?', how: 'Hold the mouse button or the Space bar to float up. Let go to sink. Do not touch the walls or the coral.' },
    { id: 'catcher', title: 'Fish Food Frenzy', cat: 'Arcade', icon: 'icons/fish', c1: '#45b6ee', c2: '#0c5a96', rating: 4.5, plays: 1920334, play: gameCatcher, isNew: true, desc: 'Food is falling into the tank! Catch the flakes and golden pellets, but watch out for old boots.', how: 'Move the mouse or use the arrow keys to swim left and right. You have three lives.' },
    { id: 'popper', title: 'Bubble Pop Blitz', cat: 'Action', icon: 'icons/droplet', c1: '#2f95e6', c2: '#9fd6fb', rating: 4.6, plays: 3102877, play: gamePopper, isNew: true, desc: 'Pop as many bubbles as you can in 45 seconds. Chain pops together for huge combos!', how: 'Click bubbles to pop them. Smaller bubbles are worth more. Avoid the spiky ones.' },
    { id: 'tower', title: 'Glass Tower Defense', cat: 'Strategy', icon: 'icons/shield', c1: '#5a7a9a', c2: '#1d3557', rating: 4.3, plays: 988120, desc: 'Defend your glass castle from waves of very polite invaders.' },
    { id: 'dolphin', title: 'Dolphin Dash', cat: 'Action', icon: 'icons/dolphin', c1: '#26b5c9', c2: '#0a3d6b', rating: 4.4, plays: 1402200, desc: 'Leap through hoops and collect stars in this splashy runner.' },
    { id: 'aurora', title: 'Aurora Racer', cat: 'Sports', icon: 'icons/moon', c1: '#1f3b73', c2: '#2aceda', rating: 4.1, plays: 702348, desc: 'Race across the northern lights at midnight.' },
    { id: 'pearl', title: 'Pearl Diver', cat: 'Puzzle', icon: 'icons/bubble', c1: '#0f7aa8', c2: '#083b6b', rating: 3.9, plays: 450223, desc: 'Match three pearls to open the giant clam.' },
    { id: 'kart', title: 'Lime Kart', cat: 'Sports', icon: 'icons/leaf', c1: '#97d937', c2: '#2f8a1c', rating: 4.0, plays: 820119, desc: 'Drift around lime-green tracks. Very zesty.' },
    { id: 'golf', title: 'Sky Golf', cat: 'Sports', icon: 'icons/cloud', c1: '#7cc8ff', c2: '#35c93a', rating: 3.8, plays: 311045, desc: 'Mini golf on floating islands above the clouds.' },
    { id: 'mansion', title: 'Mystery Mansion Escape', cat: 'Puzzle', icon: 'icons/key', c1: '#3a2a4a', c2: '#8a6a3a', rating: 4.2, plays: 1122009, desc: 'Find the keys, solve the riddles, escape the mansion. Point and click!' },
    { id: 'pong', title: 'Pong Plus Deluxe', cat: 'Arcade', icon: 'icons/gamepad', c1: '#333', c2: '#0a6fd1', rating: 3.7, plays: 505060, desc: 'The classic paddle game, now with extra gloss.' },
    { id: 'dressup', title: 'Dress Up the Orb', cat: 'Dress-Up', icon: 'icons/gift', c1: '#ff9ad2', c2: '#9b59b6', rating: 4.0, plays: 1602777, desc: 'Give the glass orb a hat, sunglasses and a tiny scarf.' },
  ];
  const mgGame = (id) => MG_GAMES.find((x) => x.id === id);
  const mgThumb = (gm, big) => `<span class="web-mg-thumb${big ? ' big' : ''}" style="--c1:${gm.c1};--c2:${gm.c2}">${K.img(gm.icon, 'web-mg-ticon')}<b>${esc(gm.title)}</b>${gm.isNew ? '<i class="web-mg-new">NEW!</i>' : ''}</span>`;
  const mgPlays = (ctx, gm) => gm.plays + ctx.store.get('minigames.plays.' + gm.id, 0);
  function mgFrame(ctx, active, inner) {
    const cats = ['Action', 'Arcade', 'Puzzle', 'Skill', 'Sports', 'Strategy', 'Dress-Up'];
    return `<div class="web-mg"><div class="web-mg-head"><div class="web-mg-wrap web-mg-headrow"><a class="web-mg-logo" href="http://www.minigames.com/"><span class="web-mg-star"></span><span class="web-mg-word">MiniGames<small>.com</small></span></a><span class="web-mg-tag">Free online games! New games every day!</span>
      <form class="web-mg-search" action="/search"><input type="text" name="q" placeholder="Search games" aria-label="Search games"><button type="submit">Go!</button></form></div>
      <div class="web-mg-nav"><div class="web-mg-wrap"><a href="/" class="${active === 'home' ? 'on' : ''}">Home</a>${cats.map((c) => `<a href="/category/${encodeURIComponent(c)}" class="${active === c ? 'on' : ''}">${c}</a>`).join('')}<a href="/top" class="${active === 'top' ? 'on' : ''}">Top Rated</a></div></div></div>
      <div class="web-mg-wrap web-mg-body">${inner}</div><div class="web-mg-foot">&copy; 2007 MiniGames.com - All games are free! - <a href="#" class="web-mg-joke">Add games to your site</a> - <a href="#" class="web-mg-joke">Contact</a></div></div>`;
  }
  function mgWire(ctx, root) {
    root.querySelectorAll('.web-mg-joke').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); ctx.dialog({ title: 'MiniGames.com', icon: 'icons/gamepad', instruction: 'Thanks for your interest!', message: 'Our webmaster reads every e-mail. He is 14 and it is a school night, so please be patient.' }); }));
  }
  function mgTile(ctx, gm) {
    return `<a class="web-mg-tile" href="/game/${gm.id}">${mgThumb(gm)}<span class="web-mg-tname">${esc(gm.title)}</span>${K.stars(gm.rating)}<small>${K.num(mgPlays(ctx, gm))} plays</small></a>`;
  }
  function mgSidebar(ctx) {
    const top = MG_GAMES.slice().sort((a, b) => b.rating - a.rating).slice(0, 8);
    return `<div class="web-mg-side"><div class="web-mg-box"><div class="web-mg-boxh">Top rated</div><ol class="web-mg-top">${top.map((gm) => `<li><a href="/game/${gm.id}">${esc(gm.title)}</a> ${K.stars(gm.rating)}</li>`).join('')}</ol></div>
      <div class="web-mg-box web-mg-plugin"><div class="web-mg-boxh">Required plugin</div><p>${K.img('icons/play', 'web-mg-plugic')}<span>Some games need <b>BubblePlayer 10</b>. You have BubblePlayer 9.</span></p><a href="#" class="web-mg-getplayer">Get BubblePlayer &raquo;</a></div>
      <div class="web-mg-box"><div class="web-mg-boxh">Your high scores</div><ul class="web-mg-scores">${MG_GAMES.filter((gm) => gm.play).map((gm) => `<li><a href="/game/${gm.id}">${esc(gm.title)}</a><b data-best="${gm.id}">${K.num(ctx.store.get('minigames.best.' + gm.id, 0))}</b></li>`).join('')}</ul></div></div>`;
  }
  function mgWireSide(ctx, root) {
    const gp = root.querySelector('.web-mg-getplayer');
    if (gp) gp.addEventListener('click', (e) => { e.preventDefault(); mgInstallJoke(ctx); });
  }
  function mgInstallJoke(ctx) {
    ctx.dialog({ title: 'BubblePlayer Setup', icon: 'icons/download', instruction: 'Install BubblePlayer 10?', message: 'BubblePlayer is required to play some games on this site.', buttons: [{ label: 'Install', default: true, value: 'go' }, { label: 'Cancel', cancel: true, value: null }] }).then((r) => {
      if (r !== 'go') return;
      ctx.dialog({ title: 'BubblePlayer Setup', icon: 'icons/warning', instruction: 'BubblePlayer could not be installed', message: 'Setup has determined that this computer is too glossy for BubblePlayer 10. Bubble Copter, Fish Food Frenzy and Bubble Pop Blitz work without it!' });
    });
  }
  function mgHome(ctx) {
    ctx.title('MiniGames.com - Free Online Games!');
    const day = K.dayNumber();
    const playable = MG_GAMES.filter((gm) => gm.play);
    const gotd = playable[day % playable.length];
    const inner = `<div class="web-mg-cols"><div class="web-mg-main">
      <div class="web-mg-gotd"><div class="web-mg-gotdl">${mgThumb(gotd, true)}</div><div class="web-mg-gotdr"><span class="web-mg-label">Game of the day</span><h1>${esc(gotd.title)}</h1><p>${esc(gotd.desc)}</p>${K.stars(gotd.rating, true)}<p><a class="web-mg-play" href="/game/${gotd.id}">Play now!</a></p></div>${K.burst('FREE!', { size: 64, font: 14, cls: 'web-mg-burst', spin: true })}</div>
      <h2 class="web-mg-h2">New and popular games</h2><div class="web-mg-grid">${MG_GAMES.map((gm) => mgTile(ctx, gm)).join('')}</div>
    </div>${mgSidebar(ctx)}</div>`;
    const root = ctx.html(mgFrame(ctx, 'home', inner));
    mgWire(ctx, root); mgWireSide(ctx, root);
  }
  function mgList(ctx, cat, list, title) {
    ctx.title(title + ' - MiniGames.com');
    const inner = `<div class="web-mg-cols"><div class="web-mg-main"><h1 class="web-mg-h1">${esc(title)}</h1>${list.length ? `<div class="web-mg-grid">${list.map((gm) => mgTile(ctx, gm)).join('')}</div>` : '<p class="web-mg-none">No games found. Try Bubble Copter, everybody loves Bubble Copter.</p>'}</div>${mgSidebar(ctx)}</div>`;
    const root = ctx.html(mgFrame(ctx, cat, inner));
    mgWire(ctx, root); mgWireSide(ctx, root);
  }
  function mgGamePage(ctx, gm) {
    ctx.title(gm.title + ' - Play free at MiniGames.com');
    const myRate = ctx.store.get('minigames.rate.' + gm.id, 0);
    const others = MG_GAMES.filter((x) => x !== gm).slice(0, 6);
    const inner = `<div class="web-mg-cols"><div class="web-mg-main">
      <div class="web-mg-gamehead"><h1 class="web-mg-h1">${esc(gm.title)}</h1><span>${K.stars(gm.rating)} ${K.num(mgPlays(ctx, gm))} plays</span></div>
      <div class="web-mg-stage"><div class="web-mg-loader"><div class="web-mg-lbox"><div class="web-mg-llogo"><span class="web-mg-star"></span>MiniGames<small>.com</small></div><div class="web-mg-lbar"><i></i></div><div class="web-mg-lpct">Loading 0%</div><div class="web-mg-lsponsor">Presented by <b>Glossr</b> - share your gloss!</div></div></div></div>
      <div class="web-mg-under"><div class="web-mg-how"><h3>How to play</h3><p>${esc(gm.how || gm.desc)}</p>${gm.play ? `<p>Your best score: <b class="web-mg-best">${K.num(ctx.store.get('minigames.best.' + gm.id, 0))}</b></p>` : ''}</div>
        <div class="web-mg-rateit"><h3>Rate this game</h3><div class="web-mg-stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" class="${n <= myRate ? 'on' : ''}" aria-label="${n} stars"></button>`).join('')}</div><span class="web-mg-thanks">${myRate ? 'Thanks for voting!' : ''}</span>
          <h3>Put this game on your site</h3><input type="text" readonly value="&lt;embed src=&quot;http://www.minigames.com/swf/${gm.id}.swf&quot; width=&quot;640&quot; height=&quot;400&quot;&gt;"></div></div>
      <h2 class="web-mg-h2">More games you might like</h2><div class="web-mg-grid">${others.map((x) => mgTile(ctx, x)).join('')}</div>
    </div>${mgSidebar(ctx)}</div>`;
    const root = ctx.html(mgFrame(ctx, gm.cat, inner));
    mgWire(ctx, root); mgWireSide(ctx, root);
    root.querySelectorAll('.web-mg-stars button').forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.n);
      ctx.store.set('minigames.rate.' + gm.id, n);
      root.querySelectorAll('.web-mg-stars button').forEach((x) => x.classList.toggle('on', Number(x.dataset.n) <= n));
      root.querySelector('.web-mg-thanks').textContent = 'Thanks for voting!';
      ctx.sound('click');
    }));
    root.querySelector('.web-mg-under input').addEventListener('focus', (e) => e.target.select());
    const stage = root.querySelector('.web-mg-stage');
    const bar = stage.querySelector('.web-mg-lbar i'), pct = stage.querySelector('.web-mg-lpct');
    let p = 0, stall = 0;
    const speed = ctx.speed() === 'dialup' ? 0.35 : ctx.speed() === 'broadband' ? 3 : 1;
    const tick = ctx.every(70, () => {
      if (stall > 0) { stall -= 70; return; }
      p += (Math.random() * 4 + 1) * speed;
      if (p >= 47 && p < 47 + 6 * speed && !stage.dataset.stalled) { p = 47; stall = 1200; stage.dataset.stalled = '1'; }
      if (!gm.play && p >= 99) { p = 99; }
      bar.style.width = Math.min(100, p) + '%';
      pct.textContent = 'Loading ' + Math.floor(Math.min(100, p)) + '%';
      if (p >= 99 && !gm.play && !stage.dataset.failed) {
        stage.dataset.failed = '1';
        clearInterval(tick);
        ctx.after(1400, () => {
          stage.innerHTML = `<div class="web-mg-fail">${K.img('icons/warning', 'web-mg-failic')}<h2>This game requires BubblePlayer 10</h2><p>You have BubblePlayer 9. Please upgrade to continue, or play one of these instead:</p><div class="web-mg-failgames">${MG_GAMES.filter((x) => x.play).map((x) => `<a href="/game/${x.id}" class="web-mg-play">${esc(x.title)}</a>`).join('')}</div><p><a href="#" class="web-mg-getplayer">Upgrade BubblePlayer</a></p></div>`;
          mgWireSide(ctx, stage);
        });
      }
      if (p >= 100 && gm.play) {
        clearInterval(tick);
        stage.innerHTML = `<div class="web-mg-splash">${mgThumb(gm, true)}<button type="button" class="web-mg-play web-mg-start">Click to play!</button><small>Game ${esc(gm.title)} - (c) MiniGames.com</small></div>`;
        stage.querySelector('.web-mg-start').addEventListener('click', () => {
          stage.innerHTML = '';
          ctx.store.set('minigames.plays.' + gm.id, ctx.store.get('minigames.plays.' + gm.id, 0) + 1);
          const bestEl = root.querySelector('.web-mg-best');
          const api = {
            best: () => ctx.store.get('minigames.best.' + gm.id, 0),
            setBest: (v) => { ctx.store.set('minigames.best.' + gm.id, v); if (bestEl) bestEl.textContent = K.num(v); root.querySelectorAll('[data-best="' + gm.id + '"]').forEach((b) => { b.textContent = K.num(v); }); },
            sound: (name) => ctx.sound(name),
          };
          const game = gm.play(stage, ctx, api);
          ctx.keepAwake(true);
          ctx.onUnload(() => { try { game.destroy(); } catch (e) { /* ignore */ } });
        });
      }
    });
  }
  W.register({
    id: 'minigames', host: 'www.minigames.com', aliases: ['minigames.com'],
    title: 'MiniGames.com - Free Online Games!', shortTitle: 'MiniGames', icon: 'icons/gamepad', weight: 1.2,
    pictures: ['images/preloader.swf', 'images/thumbs/copter.jpg', 'images/new_badge.gif', 'images/star_rating.gif'],
    favicon: '<svg viewBox="0 0 16 16"><path d="M8 .8 L10.2 5.4 L15.2 6 L11.5 9.4 L12.5 14.4 L8 11.9 L3.5 14.4 L4.5 9.4 L.8 6 L5.8 5.4 Z" fill="#b8f53a" stroke="#4a7a00" stroke-linejoin="round"/><path d="M8 2.6 L9.5 5.8 L6.5 5.8 Z" fill="#fff" opacity=".6"/></svg>',
    pages: () => [{ path: '/', title: 'MiniGames.com - Free Online Games!', text: 'free online games: Bubble Copter, Fish Food Frenzy, Bubble Pop Blitz, action, arcade, puzzle, skill, sports, top rated games, high scores' }]
      .concat(MG_GAMES.map((gm) => ({ path: '/game/' + gm.id, title: gm.title + ' - Play free at MiniGames.com', text: gm.desc + ' ' + gm.cat + ' game. ' + (gm.how || '') }))),
    render(ctx) {
      const p = ctx.parts;
      if (!p.length) return mgHome(ctx);
      if (p[0] === 'game') { const gm = mgGame(p[1]); return gm ? mgGamePage(ctx, gm) : ctx.notFound(); }
      if (p[0] === 'category') { const cat = decodeURIComponent(p[1] || ''); return mgList(ctx, cat, MG_GAMES.filter((gm) => gm.cat === cat), cat + ' games'); }
      if (p[0] === 'top') return mgList(ctx, 'top', MG_GAMES.slice().sort((a, b) => b.rating - a.rating), 'Top rated games');
      if (p[0] === 'search') { const q = ctx.q('q').toLowerCase(); return mgList(ctx, '', MG_GAMES.filter((gm) => (gm.title + ' ' + gm.desc + ' ' + gm.cat).toLowerCase().includes(q)), 'Search results for "' + ctx.q('q') + '"'); }
      return ctx.notFound();
    },
    css: `
.web-mg { min-height: 100%; background: #10131c; color: #dfe6f0; font: calc(12px * var(--hz-text, 1))/1.4 Verdana, Tahoma, sans-serif; }
.web-mg a { color: #9fe04a; text-decoration: none; }
.web-mg a:hover { text-decoration: underline; }
.web-mg-wrap { width: 920px; margin: 0 auto; }
.web-mg-head { background: linear-gradient(to bottom, #1e2a44 0, #0d1426 100%); border-bottom: 2px solid #ff9a00; }
.web-mg-headrow { display: flex; align-items: center; gap: 18px; height: 70px; }
.web-mg-logo { display: flex; align-items: center; gap: 6px; text-decoration: none !important; }
.web-mg-star { display: inline-block; width: 40px; height: 40px; background: radial-gradient(circle at 40% 35%, #fff 0, #e8ff9a 25%, #8fd21a 60%, #3a7a00 100%); clip-path: polygon(50% 0, 62% 35%, 100% 38%, 70% 60%, 80% 98%, 50% 76%, 20% 98%, 30% 60%, 0 38%, 38% 35%); filter: drop-shadow(0 0 6px rgba(160,255,60,.6)); animation: web-mg-wobble 3s ease-in-out infinite; }
@keyframes web-mg-wobble { 50% { transform: rotate(12deg) scale(1.06); } }
.web-mg-word { font: 900 2.4em/1 "Arial Black", Impact, sans-serif; letter-spacing: -1px; background: linear-gradient(to bottom, #fff9b0 0, #ffd21a 45%, #ff9a00 55%, #ffcf3a 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 2px 0 #7a3a00); }
.web-mg-word small { font-size: .5em; }
.web-mg-tag { color: #9fb4d8; font-style: italic; flex: 1; }
.web-mg-search { display: flex; gap: 4px; }
.web-mg-search input { width: 160px; padding: 3px 6px; font: inherit; border: 1px solid #3a4a6a; background: #0a0f1c; color: #fff; }
.web-mg-search button { font: 700 1em Verdana, sans-serif; padding: 3px 10px; border: 1px solid #7a3a00; color: #3a1a00; cursor: pointer; background: linear-gradient(#ffe38a, #ff9a00); border-radius: 3px; }
.web-mg-nav { background: linear-gradient(#2a3a5c, #1a2640); border-top: 1px solid #3a4a6a; }
.web-mg-nav a { display: inline-block; padding: 6px 12px; color: #dfe6f0 !important; font-weight: 700; }
.web-mg-nav a.on, .web-mg-nav a:hover { color: #1a2640 !important; background: linear-gradient(#e8ff9a, #8fd21a); text-decoration: none !important; }
.web-mg-body { padding: 14px 0; }
.web-mg-cols { display: grid; grid-template-columns: 1fr 230px; gap: 16px; }
.web-mg-gotd { position: relative; display: flex; gap: 16px; padding: 14px; border-radius: 10px; border: 1px solid #3a4a6a; background: linear-gradient(135deg, #1e2a44, #121a2c); box-shadow: inset 0 1px 0 rgba(255,255,255,.08); }
.web-mg-gotd h1 { margin: 4px 0; font: 900 1.8em "Arial Black", Verdana, sans-serif; color: #fff; }
.web-mg-gotdr p { margin: 6px 0; }
.web-mg-label { display: inline-block; padding: 2px 8px; border-radius: 3px; background: #ff9a00; color: #1a0f00; font-weight: 700; font-size: .85em; text-transform: uppercase; }
.web-mg-burst { position: absolute; right: -10px; top: -14px; }
.web-mg-play { display: inline-block; padding: 8px 22px; border-radius: 20px; font: 900 1.2em "Arial Black", Verdana, sans-serif; color: #1a3a00 !important; border: 1px solid #3a7a00; cursor: pointer; text-decoration: none !important; background: linear-gradient(to bottom, #f4ffc8 0, #b8f53a 48%, #7ac21a 52%, #a8e83a 100%); box-shadow: inset 0 1px 0 #fff, 0 0 14px rgba(160,255,60,.35); }
.web-mg-play:hover { filter: brightness(1.1); }
.web-mg-thumb { position: relative; display: grid; place-items: center; width: 150px; height: 112px; border-radius: 8px; overflow: hidden; border: 2px solid #3a4a6a; background: radial-gradient(circle at 50% 30%, rgba(255,255,255,.35), transparent 60%), linear-gradient(135deg, var(--c1), var(--c2)); }
.web-mg-thumb.big { width: 230px; height: 170px; }
.web-mg-ticon { width: 58%; height: 58%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,.4)); margin-top: -16px; }
.web-mg-thumb b { position: absolute; left: 0; right: 0; bottom: 0; padding: 4px; font: 900 .95em "Arial Black", Verdana, sans-serif; color: #fff; text-align: center; background: linear-gradient(transparent, rgba(0,0,0,.7)); text-shadow: 0 1px 2px #000; }
.web-mg-thumb.big b { font-size: 1.3em; }
.web-mg-new { position: absolute; right: 4px; top: 4px; padding: 1px 5px; font: 900 .8em Verdana, sans-serif; font-style: normal; color: #fff; background: #e0352a; border-radius: 3px; animation: wk-blink 1s steps(1) infinite; }
.web-mg-h1 { font: 900 1.7em "Arial Black", Verdana, sans-serif; color: #fff; margin: 0 0 10px; }
.web-mg-h2 { font: 700 1.25em Verdana, sans-serif; color: #ffd21a; margin: 18px 0 10px; border-bottom: 1px solid #3a4a6a; padding-bottom: 4px; }
.web-mg-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.web-mg-tile { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px; border-radius: 8px; color: #dfe6f0 !important; text-decoration: none !important; }
.web-mg-tile:hover { background: #1e2a44; }
.web-mg-tile:hover .web-mg-thumb { border-color: #b8f53a; box-shadow: 0 0 12px rgba(160,255,60,.5); }
.web-mg-tname { font-weight: 700; color: #fff; }
.web-mg-tile small { color: #8a9ab8; }
.web-mg-box { border: 1px solid #3a4a6a; border-radius: 8px; overflow: hidden; margin-bottom: 12px; background: #151d30; }
.web-mg-boxh { padding: 5px 8px; font-weight: 700; color: #1a2640; background: linear-gradient(#ffe38a, #ff9a00); }
.web-mg-top { margin: 6px 0; padding-left: 26px; }
.web-mg-top li { margin: 4px 0; }
.web-mg-plugin p { display: flex; gap: 8px; align-items: center; margin: 8px; }
.web-mg-plugic { width: 32px; height: 32px; }
.web-mg-plugin > a { display: block; margin: 0 8px 8px; }
.web-mg-scores { list-style: none; margin: 0; padding: 6px 8px; }
.web-mg-scores li { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #3a4a6a; }
.web-mg-scores b { color: #ffd21a; }
.web-mg-gamehead { display: flex; justify-content: space-between; align-items: baseline; }
.web-mg-stage { position: relative; width: 652px; height: 412px; padding: 6px; border-radius: 10px; background: linear-gradient(#3a4a6a, #1a2640); border: 1px solid #000; box-shadow: 0 6px 20px rgba(0,0,0,.6); }
.web-mg-canvas { display: block; border-radius: 4px; outline: none; cursor: pointer; }
.web-mg-canvas:focus-visible { box-shadow: 0 0 0 2px #b8f53a; }
.web-mg-loader { position: absolute; inset: 6px; display: grid; place-items: center; background: radial-gradient(circle at 50% 40%, #243458, #0a0f1c); border-radius: 4px; }
.web-mg-lbox { width: 360px; text-align: center; }
.web-mg-llogo { font: 900 1.8em "Arial Black", sans-serif; color: #ffd21a; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 18px; }
.web-mg-llogo small { font-size: .5em; }
.web-mg-lbar { height: 18px; border-radius: 9px; border: 1px solid #000; background: #0a0f1c; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,.6); }
.web-mg-lbar i { display: block; height: 100%; width: 0; background: linear-gradient(to bottom, #f4ffc8 0, #b8f53a 48%, #7ac21a 52%, #a8e83a 100%); transition: width .1s; }
.web-mg-lpct { margin-top: 8px; font: 700 1.3em Verdana, sans-serif; color: #fff; }
.web-mg-lsponsor { margin-top: 18px; color: #8a9ab8; }
.web-mg-splash, .web-mg-fail { position: absolute; inset: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: radial-gradient(circle at 50% 40%, #243458, #0a0f1c); border-radius: 4px; text-align: center; }
.web-mg-splash small { color: #8a9ab8; }
.web-mg-failic { width: 56px; height: 56px; }
.web-mg-fail h2 { margin: 0; color: #ffd21a; }
.web-mg-fail p { margin: 0; max-width: 420px; }
.web-mg-failgames { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.web-mg-failgames .web-mg-play { font-size: .95em; padding: 6px 14px; }
.web-mg-under { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
.web-mg-under h3 { margin: 8px 0 4px; color: #ffd21a; font-size: 1.05em; }
.web-mg-under input { width: 100%; font: .9em Verdana, sans-serif; padding: 3px; background: #0a0f1c; color: #9fb4d8; border: 1px solid #3a4a6a; }
.web-mg-stars { display: inline-flex; gap: 3px; }
.web-mg-stars button { width: 22px; height: 22px; padding: 0; border: 0; cursor: pointer; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M10 1.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L10 14.6l-5.2 2.9L6 11.6 1.6 7.6l5.9-.7z' fill='%23334' stroke='%23667'/%3E%3C/svg%3E") center / contain no-repeat; }
.web-mg-stars button.on, .web-mg-stars:hover button { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M10 1.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L10 14.6l-5.2 2.9L6 11.6 1.6 7.6l5.9-.7z' fill='%23ffd21a' stroke='%23b86a00'/%3E%3C/svg%3E"); }
.web-mg-stars button:hover ~ button { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M10 1.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L10 14.6l-5.2 2.9L6 11.6 1.6 7.6l5.9-.7z' fill='%23334' stroke='%23667'/%3E%3C/svg%3E"); }
.web-mg-thanks { margin-left: 8px; color: #b8f53a; font-weight: 700; }
.web-mg-none { color: #8a9ab8; }
.web-mg-foot { padding: 14px 0 24px; text-align: center; color: #6a7a98; border-top: 1px solid #2a3a5c; }
`,
  });

  // ================================================================ www.geoplace.com
  const GEO_UC = `<svg class="web-geo-ucsvg" viewBox="0 0 200 150" aria-label="Under construction"><defs><linearGradient id="geoY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff27a"/><stop offset="1" stop-color="#f5b400"/></linearGradient><pattern id="geoS" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="20" fill="#111"/><rect x="10" width="10" height="20" fill="#ffd21a"/></pattern></defs>
    <rect x="96" y="70" width="8" height="60" fill="#666"/><g transform="translate(100 56) rotate(45)"><rect x="-38" y="-38" width="76" height="76" rx="7" fill="url(#geoY)" stroke="#222" stroke-width="3"/></g>
    <g fill="#111"><circle cx="92" cy="36" r="5"/><path d="M92 41 L96 58 L102 72 L98 74 L91 60 L86 74 L82 72 L88 57 Z"/><g class="web-geo-shovel"><path d="M94 46 L112 58" stroke="#111" stroke-width="3" stroke-linecap="round"/><path d="M110 54 L120 62 L114 68 Z"/></g><path d="M104 74 Q112 64 120 74 Z"/></g>
    <rect x="10" y="118" width="180" height="22" rx="3" fill="url(#geoS)" stroke="#222" stroke-width="2"/><rect x="24" y="121" width="152" height="16" fill="#111"/><text x="100" y="133" font-family="Arial, sans-serif" font-weight="900" font-size="10.5" fill="#ffd21a" text-anchor="middle" textLength="140" lengthAdjust="spacingAndGlyphs">UNDER CONSTRUCTION</text></svg>`;
  const GEO_PAGES = {
    sk8rjake: { title: "Jake's Skate Zone", theme: 'jake', base: 4261 },
    aquagirl88: { title: "~ Aquagirl's Fish Shrine ~", theme: 'aqua', base: 1882 },
    pixelpete: { title: "Pete's Pixel Palace (coming soon!!)", theme: 'pete', base: 311 },
    stargazer_liz: { title: "Liz's Space Station", theme: 'liz', base: 2504 },
  };
  const GEO_RING = ['sk8rjake', 'aquagirl88', 'pixelpete', 'stargazer_liz'];
  const GEO_TUNES = {
    sk8rjake: { bpm: 152, type: 'square', notes: [['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['B5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['A4', 2]], file: 'skate_or_float.mid' },
    aquagirl88: { bpm: 96, type: 'triangle', notes: [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['B5', 0.5], ['G5', 0.5], ['E5', 1], ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['F5', 0.5], ['E5', 0.5], ['C5', 0.5], ['G4', 1], ['C5', 2]], file: 'ocean_dreams.mid' },
    stargazer_liz: { bpm: 80, type: 'sine', notes: [['E5', 1], ['B4', 1], ['G5', 1], ['F#5', 1], ['E5', 0.5], ['D5', 0.5], ['B4', 2], ['C5', 1], ['G5', 1], ['E5', 2], [null, 1]], file: 'space_lullaby.mid' },
  };
  const geoCounter = (n) => `<span class="web-geo-counter">${String(n).padStart(6, '0').split('').map((d) => `<i>${d}</i>`).join('')}</span>`;
  const geoBroken = (name) => `<span class="web-geo-broken"><i></i>${esc(name)}</span>`;
  function geoRing(user) {
    const i = GEO_RING.indexOf(user);
    const prev = GEO_RING[(i - 1 + GEO_RING.length) % GEO_RING.length], next = GEO_RING[(i + 1) % GEO_RING.length];
    return `<table class="web-geo-ring"><tr><td colspan="3" class="web-geo-ringh">This site is a member of the <b>Skate &amp; Chill Webring</b></td></tr><tr><td><a href="/~${prev}/">&lt;&lt; Prev</a></td><td><a href="#" class="web-geo-random" data-user="${user}">Random</a> | <a href="/webring">List sites</a></td><td><a href="/~${next}/">Next &gt;&gt;</a></td></tr></table>`;
  }
  const geoBadges = () => `<div class="web-geo-badges"><span class="b1">Best viewed in <b>Horizon</b> at 1024x768</span><span class="b2">Made with <b>Notepad</b></span><span class="b3"><b>GeoPlace</b> homepage</span><span class="b4">Get <b>BubblePlayer</b></span></div>`;
  function geoMidi(ctx, root, user) {
    const tune = GEO_TUNES[user];
    const el = root.querySelector('.web-geo-midi');
    if (!tune || !el) return;
    let playing = false, next = 0, idx = 0;
    const beat = 60 / tune.bpm;
    const btn = el.querySelector('.web-geo-mplay'), stop = el.querySelector('.web-geo-mstop'), label = el.querySelector('.web-geo-mstate');
    const set = (on) => { playing = on; label.textContent = on ? 'Playing' : 'Stopped'; el.classList.toggle('on', on); };
    btn.addEventListener('click', () => {
      if (!ctx.audio() || !A.sound.ctx) { ctx.dialog({ title: 'Sound', icon: 'icons/speaker', message: 'Turn on "Play sounds in webpages" in Internet Options to hear background music.' }); return; }
      idx = 0; next = 0; set(true);
    });
    stop.addEventListener('click', () => set(false));
    ctx.every(60, () => {
      if (!playing || !A.sound.ctx) return;
      const dest = ctx.audio();
      if (!dest) return;
      dest.gain.value = 0.55;
      const now = A.sound.ctx.currentTime;
      if (next < now) next = now + 0.05;
      while (next < now + 0.3) {
        const [n, len] = tune.notes[idx % tune.notes.length];
        if (n) A.sound.blip(n, n, next, { dur: len * beat * 0.85, vel: tune.type === 'square' ? 0.035 : 0.06, type: tune.type, dest, rev: 0.08, glide: 0.001 });
        if (idx % 4 === 0 && tune.type === 'square') A.sound.blip('A2', 'A2', next, { dur: beat * 0.5, vel: 0.04, type: 'triangle', dest, rev: 0, glide: 0.001 });
        next += len * beat;
        idx++;
      }
    });
    ctx.onUnload(() => { playing = false; });
  }
  function geoWire(ctx, root) {
    root.querySelectorAll('.web-geo-random').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const others = GEO_RING.filter((u) => u !== a.dataset.user);
      ctx.go('/~' + others[Math.floor(Math.random() * others.length)] + '/');
    }));
    root.querySelectorAll('.web-geo-mail').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      ctx.dialog({ title: 'Horizon', icon: 'error', message: 'Could not perform this operation because the default mail client is not properly installed.', detail: 'Tip: sign the guestbook instead!' });
    }));
  }
  function geoFrame(user, inner) { return `<div class="web-geo web-geo-${GEO_PAGES[user].theme}">${inner}</div>`; }
  function geoHits(ctx, user) {
    const n = ctx.store.get('geo.hits.' + user, 0) + 1;
    ctx.store.set('geo.hits.' + user, n);
    return GEO_PAGES[user].base + n;
  }
  function geoJake(ctx) {
    const hits = geoHits(ctx, 'sk8rjake');
    ctx.title("Jake's Skate Zone");
    const inner = `<div class="web-geo-marq wk-marquee" style="--wk-speed:14s"><span>*** WELCOME TO JAKE'S SKATE ZONE *** thanks for visiting!!! *** sign my guestbook!!! *** skate or float *** you are visitor #${K.num(hits)} ***</span></div>
      <center class="web-geo-center"><h1 class="web-geo-rainbow">~*~ Jake's Skate Zone ~*~</h1>
      <div class="web-geo-uc">${GEO_UC}<p class="wk-blink">This page is ALWAYS under construction!!!</p></div></center>
      <table class="web-geo-layout"><tr><td class="web-geo-menu"><b>MENU</b><br><a href="/~sk8rjake/">Home</a><br><a href="/~sk8rjake/pics.html">My Pics</a><br><a href="/~sk8rjake/links.html">Kewl Links</a><br><a href="/~sk8rjake/guestbook.html">Guestbook</a><br><a href="/~sk8rjake/guestbook.html#sign">Sign it!!</a><br><a href="#" class="web-geo-mail">${K.img('icons/mail', 'web-geo-spinmail')}E-mail me</a></td>
        <td class="web-geo-main"><p>Hi!!! My name is <b>Jake</b> and this is my homepage. I like skateboarding, video games and my dog Rocket. I made this whole page myself in Notepad!!! It took forever.</p>
          <div class="web-geo-hr"></div>
          <h2>Latest updates <span class="web-geo-new wk-blink">NEW!</span></h2><ul><li><b>3/14/07</b> - added a hit counter. u are officially being counted</li><li><b>3/10/07</b> - my friend <a href="http://www.myspot.com/tyler">Tyler</a> made a <a href="http://www.tubeview.com/watch?v=skate">kickflip video</a>!!! (watch the end lol)</li><li><b>3/2/07</b> - joined the Skate &amp; Chill webring!!</li><li><b>2/28/07</b> - learned how to make text blink</li></ul>
          <h2>My top 5 skate tricks</h2><ol><li>Ollie (easy)</li><li>Kickflip (kinda)</li><li>Heelflip (almost)</li><li>Pop shove-it</li><li>Falling off with style</li></ol>
          <h2>My dog Rocket</h2><p>${geoBroken('rocket_dog.jpg')}<br><small>(picture coming soon, my scanner is broken)</small></p>
          <div class="web-geo-hr"></div>
          <div class="web-geo-midi"><b>Now playing:</b> ${GEO_TUNES.sk8rjake.file} <button type="button" class="web-geo-mplay">Play</button><button type="button" class="web-geo-mstop">Stop</button> <span class="web-geo-mstate">Stopped</span></div></td></tr></table>
      <center class="web-geo-center"><p>You are visitor number ${geoCounter(hits)}</p>${geoBadges()}${geoRing('sk8rjake')}<p class="web-geo-small">This site was last updated on 3/14/2007. (c) 2007 Jake. Do not steal my graphics!!!</p></center>`;
    const root = ctx.html(geoFrame('sk8rjake', inner));
    geoWire(ctx, root);
    geoMidi(ctx, root, 'sk8rjake');
  }
  function geoJakePics(ctx) {
    ctx.title("Jake's Pics");
    const pics = [['me_at_skatepark.jpg', null], ['sunset_from_the_ramp.jpg', 'imagery/sunrise'], ['beach_trip.jpg', 'imagery/ocean'], ['my_room_at_night.jpg', 'imagery/bokeh-night'], ['rocket_dog.jpg', null], ['fishtank_at_moms.jpg', 'imagery/water']];
    const inner = `<center class="web-geo-center"><h1 class="web-geo-rainbow">My Pics!!!</h1><p>click to make them bigger (it doesnt work yet)</p><table class="web-geo-pics"><tr>${pics.map(([n, k], i) => `${i && i % 3 === 0 ? '</tr><tr>' : ''}<td>${k ? K.img(k, 'web-geo-pic', n) : geoBroken(n)}<br><small>${esc(n)}</small></td>`).join('')}</tr></table><p><a href="/~sk8rjake/">&lt;&lt; Back to home</a></p>${geoRing('sk8rjake')}</center>`;
    geoWire(ctx, ctx.html(geoFrame('sk8rjake', inner)));
  }
  function geoJakeLinks(ctx) {
    ctx.title("Jake's Kewl Links");
    const links = [['http://www.minigames.com/', 'MiniGames.com', 'the best game site EVER. bubble copter is so hard'], ['http://www.tubeview.com/watch?v=skate', 'Tylers kickflip video', 'watch til the end lol'], ['http://www.myspot.com/tyler', 'Tyler on MySpot', 'my best friend. he plays drums'], ['http://www.bubblesearch.com/', 'Bubble Search', 'use it to find stuff'], ['http://www.free-screensavers-4u.com/', 'FREE screensavers', 'they work i think'], ['http://www.fishpals.com/', 'FishPals', 'my sister made me put this here'], ['http://forums.aerofans.net/', 'AeroFans forum', 'i post here sometimes'], ['http://www.geoplace.com/~aquagirl88/', "Aquagirl's Fish Shrine", 'webring buddy']];
    const inner = `<center class="web-geo-center"><h1 class="web-geo-rainbow">Kewl Links</h1></center><ul class="web-geo-links">${links.map(([u, t, d]) => `<li><a href="${u}">${esc(t)}</a> - ${esc(d)}</li>`).join('')}</ul><center class="web-geo-center"><p><a href="/~sk8rjake/">&lt;&lt; Back to home</a></p>${geoRing('sk8rjake')}</center>`;
    geoWire(ctx, ctx.html(geoFrame('sk8rjake', inner)));
  }
  const GEO_GB_DEFAULT = {
    sk8rjake: [['Mike', 'cool site!!! the blinking text is awesome', 'A friend', 40], ['tyler', 'sk8 or float!!! nice page dude', 'Webring', 25], ['Kayla', 'hi jake its kayla (tylers friend). ur site is cute. u should add glitter', 'A friend', 12], ['webmaster_dan', 'Great site. Please visit my site too!!! Link exchange?', 'Bubble Search', 5]],
    aquagirl88: [['FishFan77', 'I love your fish shrine!!! Goldie is so cute', 'Webring', 20], ['jake', 'cool fish. rocket (my dog) says hi', 'Webring', 9]],
    stargazer_liz: [['cosmic_carl', 'Saturn is my favorite too!!!', 'Bubble Search', 30]],
    pixelpete: [],
  };
  function geoGuestbook(ctx, user) {
    const P = GEO_PAGES[user];
    ctx.title(P.title + ' - Guestbook');
    const inner = `<center class="web-geo-center"><h1 class="web-geo-rainbow">My Guestbook!!!</h1><p>Please sign my guestbook!! It makes me happy :)</p></center>
      <form class="web-geo-gbform" id="sign"><table><tr><td>Name:</td><td><input name="name" type="text" maxlength="30"></td></tr><tr><td>Homepage:</td><td><input name="url" type="text" maxlength="60" placeholder="http://"></td></tr><tr><td>How did you find my site?</td><td><select name="how"><option>A friend</option><option>Webring</option><option>Bubble Search</option><option>I got lost</option></select></td></tr><tr><td>Comments:</td><td><textarea name="msg" maxlength="400" rows="4"></textarea></td></tr><tr><td></td><td><button type="submit">Sign Guestbook</button> <button type="reset">Clear</button></td></tr></table><p class="web-geo-gbmsg"></p></form>
      <div class="web-geo-hr"></div><div class="web-geo-entries"></div>
      <center class="web-geo-center"><p><a href="/~${user}/">&lt;&lt; Back to home</a></p>${geoRing(user)}</center>`;
    const root = ctx.html(geoFrame(user, inner));
    geoWire(ctx, root);
    const list = root.querySelector('.web-geo-entries');
    const paint = () => {
      const mine = ctx.store.get('geo.gb.' + user, []);
      const all = mine.map((e) => ({ ...e, when: new Date(e.t) })).concat((GEO_GB_DEFAULT[user] || []).map(([name, msg, how, d]) => ({ name, msg, how, when: new Date(Date.now() - d * D) })));
      list.innerHTML = all.length ? all.map((e, i) => `<table class="web-geo-entry"><tr><td class="web-geo-eh">Entry #${all.length - i} - <b>${esc(e.name)}</b>${e.url ? ` (<a href="${esc(/^https?:\/\//.test(e.url) ? e.url : 'http://' + e.url)}">homepage</a>)` : ''} - ${esc(A.util.fmtDateTime(e.when))}</td></tr><tr><td class="web-geo-eb">${esc(e.msg)}<br><small>Found this site: ${esc(e.how || 'A friend')}</small></td></tr></table>`).join('') : '<p>No entries yet. Be the first!!!</p>';
    };
    paint();
    const form = root.querySelector('.web-geo-gbform');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim(), msg = form.msg.value.trim();
      const out = root.querySelector('.web-geo-gbmsg');
      if (!name || !msg) { out.textContent = 'Please fill in your name AND a comment!!!'; ctx.sound('error'); return; }
      const mine = ctx.store.get('geo.gb.' + user, []);
      mine.unshift({ name: name.slice(0, 30), url: form.url.value.trim().slice(0, 60), how: form.how.value, msg: msg.slice(0, 400), t: Date.now() });
      ctx.store.set('geo.gb.' + user, mine.slice(0, 40));
      form.reset();
      out.innerHTML = '<span class="wk-blink">THANK YOU FOR SIGNING MY GUESTBOOK!!!</span>';
      ctx.sound('ding');
      paint();
    });
  }
  function geoAqua(ctx) {
    const hits = geoHits(ctx, 'aquagirl88');
    ctx.title("~ Aquagirl's Fish Shrine ~");
    const facts = ['Goldfish can remember things for months!', 'A group of fish is called a school.', 'Some fish can change color when they are happy.', 'Bettas build bubble nests!', 'Fish have been around for about 500 million years.'];
    const fact = facts[K.dayNumber() % facts.length];
    const inner = `<center class="web-geo-center"><h1 class="web-geo-aquatitle">~ Welcome to my Fish Shrine ~</h1><p><i>a place for fish lovers everywhere</i></p></center>
      <table class="web-geo-layout"><tr><td class="web-geo-main"><h2>My Fish</h2><table class="web-geo-fish"><tr><td>${K.img('avatars/avatar-fish', 'web-geo-fpic')}</td><td><b>Goldie</b><br>Goldfish, 2 years old<br>Likes: food, swimming in circles, food</td></tr><tr><td>${K.img('icons/fish', 'web-geo-fpic')}</td><td><b>Sir Swims-a-Lot</b><br>Betta fish<br>Builds bubble nests when he is happy</td></tr><tr><td>${K.img('icons/bubble', 'web-geo-fpic')}</td><td><b>Bubbles</b><br>Snail (technically not a fish)<br>Very slow. Very loyal.</td></tr></table>
        <h2>Fish Fact of the Day</h2><p class="web-geo-fact">${esc(fact)}</p>
        <h2>Fish of the Month</h2><p>The <b>Bubble Eye goldfish</b>! It has two big bubbles under its eyes. Read more on <a href="http://www.aeropedia.org/wiki/Goldfish">Aeropedia</a>.</p>
        <h2>Adopt a virtual fish!!</h2><p>I adopted one at <a href="http://www.fishpals.com/">FishPals</a> and you should too!!</p>
        <div class="web-geo-midi"><b>Now playing:</b> ${GEO_TUNES.aquagirl88.file} <button type="button" class="web-geo-mplay">Play</button><button type="button" class="web-geo-mstop">Stop</button> <span class="web-geo-mstate">Stopped</span></div>
        <p><a href="/~aquagirl88/guestbook.html">Sign my guestbook!!</a> | <a href="#" class="web-geo-mail">E-mail me</a></p></td></tr></table>
      <center class="web-geo-center"><p>Fish lovers who visited: ${geoCounter(hits)}</p>${geoBadges()}${geoRing('aquagirl88')}</center>`;
    const root = ctx.html(geoFrame('aquagirl88', inner));
    geoWire(ctx, root);
    geoMidi(ctx, root, 'aquagirl88');
  }
  function geoPete(ctx) {
    const hits = geoHits(ctx, 'pixelpete');
    ctx.title("Pete's Pixel Palace (coming soon!!)");
    const inner = `<center class="web-geo-center"><div class="web-geo-bigsign">${GEO_UC}</div><h1 class="web-geo-petetitle wk-blink">COMING SOON!!!</h1><p class="web-geo-big">Pete's Pixel Palace will be the best page on the internet.</p><p>It will have: games, pictures, a chat room, a message board, MIDI music, a Java applet, a guestbook and SO much more.</p><p>Check back soon!!! (Last updated: 1999)</p><p>Visitors so far: ${geoCounter(hits)}</p>${geoRing('pixelpete')}</center>`;
    geoWire(ctx, ctx.html(geoFrame('pixelpete', inner)));
  }
  function geoLiz(ctx) {
    const hits = geoHits(ctx, 'stargazer_liz');
    ctx.title("Liz's Space Station");
    const planets = [['Mercury', '#b8a898', 'Smallest planet. Very hot, then very cold.'], ['Venus', '#e8c878', 'Brightest planet in the night sky.'], ['Earth', '#3a8ee6', 'Home! Has fish.'], ['Mars', '#d85a3a', 'The red planet. Has the tallest volcano.'], ['Jupiter', '#d8a878', 'Biggest planet. Giant storm spot.'], ['Saturn', '#e8d098', 'MY FAVORITE. The rings are made of ice!']];
    const inner = `<center class="web-geo-center"><h1 class="web-geo-lizt">~ Liz's Space Station ~</h1><p>Welcome, space travelers!!!</p></center>
      <table class="web-geo-layout"><tr><td class="web-geo-main"><h2>My Favorite Planets</h2><table class="web-geo-planets">${planets.map(([n, c, d]) => `<tr><td><span class="web-geo-planet${n === 'Saturn' ? ' ringed' : ''}" style="--pc:${c}"></span></td><td><b>${n}</b><br>${esc(d)}</td></tr>`).join('')}</table>
        <h2>Are aliens real?</h2><p>Probably!!! The universe is really big. If you are an alien reading this, please sign my guestbook.</p>
        <div class="web-geo-midi"><b>Now playing:</b> ${GEO_TUNES.stargazer_liz.file} <button type="button" class="web-geo-mplay">Play</button><button type="button" class="web-geo-mstop">Stop</button> <span class="web-geo-mstate">Stopped</span></div>
        <p><a href="/~stargazer_liz/guestbook.html">Guestbook</a> | <a href="http://www.aeropedia.org/wiki/Aurora">Learn about auroras</a> | <a href="http://www.skycast.com/">Check the sky forecast</a></p></td></tr></table>
      <center class="web-geo-center"><p>Space travelers: ${geoCounter(hits)}</p>${geoBadges()}${geoRing('stargazer_liz')}</center>`;
    const root = ctx.html(geoFrame('stargazer_liz', inner));
    geoWire(ctx, root);
    geoMidi(ctx, root, 'stargazer_liz');
  }
  function geoHome(ctx) {
    ctx.title('GeoPlace - Build your FREE homepage!');
    const hoods = [['Skatepark', 'sk8rjake', 'skateboarding, BMX and extreme sports'], ['Aquarium Row', 'aquagirl88', 'fish, pets and everything that swims'], ['Pixel Plaza', 'pixelpete', 'computers, games and web design'], ['Nebula Heights', 'stargazer_liz', 'space, science fiction and stars']];
    const inner = `<div class="web-geo-portal"><div class="web-geo-phead"><div class="web-geo-pwrap"><span class="web-geo-plogo">${K.img('icons/home', 'web-geo-plogoic')}Geo<b>Place</b></span><span class="web-geo-ptag">Build your FREE homepage today! 15 MB of FREE space!</span></div></div>
      <div class="web-geo-pwrap web-geo-pbody"><div class="web-geo-pmain"><h1>Neighborhoods</h1><table class="web-geo-hoods">${hoods.map(([n, u, d]) => `<tr><td class="web-geo-hood"><b>${n}</b><br><small>${d}</small></td><td>Featured homepage: <a href="/~${u}/">${esc(GEO_PAGES[u].title)}</a></td></tr>`).join('')}</table>
        <h2>Why GeoPlace?</h2><ul><li>15 MB of free web space (that is a LOT of pictures)</li><li>Easy page builder (coming soon)</li><li>Free hit counters and guestbooks!</li><li>Join a webring and make friends</li></ul></div>
        <div class="web-geo-pside"><div class="web-geo-pbox"><b>Get your free homepage!</b><p>Your address will look like:<br><tt>www.geoplace.com/~yourname/</tt></p><button type="button" class="web-geo-pbtn">Sign up now!</button></div><div class="web-geo-pbox"><b>Popular this week</b><ol><li><a href="/~sk8rjake/">Jake's Skate Zone</a></li><li><a href="/~aquagirl88/">Aquagirl's Fish Shrine</a></li><li><a href="/~stargazer_liz/">Liz's Space Station</a></li></ol></div></div></div>
      <div class="web-geo-pfoot">GeoPlace &copy; 2007. Over 38 million homepages, most of them under construction.</div></div>`;
    const root = ctx.html(inner);
    root.querySelector('.web-geo-pbtn').addEventListener('click', () => ctx.dialog({ title: 'GeoPlace', icon: 'icons/home', instruction: 'The page builder is under construction', message: 'Please check back after it is done under-constructing. In the meantime, enjoy the neighborhoods!' }));
  }
  function geoWebring(ctx) {
    ctx.title('Skate & Chill Webring - Member sites');
    const inner = `<div class="web-geo web-geo-jake"><center class="web-geo-center"><h1 class="web-geo-rainbow">Skate &amp; Chill Webring</h1><p>Member sites:</p><ol class="web-geo-links">${GEO_RING.map((u) => `<li><a href="/~${u}/">${esc(GEO_PAGES[u].title)}</a></li>`).join('')}</ol><p>Want to join? Ask Jake. (He is the ring master. It is on his resume.)</p></center></div>`;
    ctx.html(inner);
  }
  W.register({
    id: 'geoplace', host: 'www.geoplace.com', aliases: ['geoplace.com'],
    title: 'GeoPlace', shortTitle: "Jake's Skate Zone", icon: 'icons/home', homePath: '/~sk8rjake/', weight: 0.9,
    pictures: ['images/under_construction.gif', 'images/counter_digits.gif', 'images/stars_bg.gif', 'images/new_blink.gif', 'images/email_spin.gif'],
    favicon: '<svg viewBox="0 0 16 16"><path d="M1.5 8 L8 2 L14.5 8 L13 8 L13 14 L3 14 L3 8 Z" fill="#b07ad8" stroke="#5a2a8a" stroke-linejoin="round"/><rect x="6.5" y="9.5" width="3" height="4.5" fill="#ffd21a"/></svg>',
    pages: () => [
      { path: '/', title: 'GeoPlace - Build your FREE homepage!', text: 'GeoPlace free homepages 15 MB free web space neighborhoods skatepark aquarium row pixel plaza nebula heights hit counters guestbooks webrings' },
      { path: '/~sk8rjake/', title: "Jake's Skate Zone", text: "Jake's homepage: skateboarding, video games, my dog Rocket, under construction, hit counter, guestbook, webring, top 5 skate tricks, kickflip, made in Notepad" },
      { path: '/~sk8rjake/guestbook.html', title: "Jake's Skate Zone - Guestbook", text: 'sign my guestbook comments cool site' },
      { path: '/~sk8rjake/links.html', title: "Jake's Kewl Links", text: 'kewl links games videos free screensavers bubble search' },
      { path: '/~aquagirl88/', title: "~ Aquagirl's Fish Shrine ~", text: 'fish shrine goldfish betta snail fish fact of the day bubble eye goldfish fish lovers' },
      { path: '/~pixelpete/', title: "Pete's Pixel Palace (coming soon!!)", text: 'under construction coming soon pixel palace best page on the internet' },
      { path: '/~stargazer_liz/', title: "Liz's Space Station", text: 'space station planets saturn rings mars jupiter aliens stars astronomy' },
    ],
    render(ctx) {
      const p = ctx.parts;
      if (!p.length) return geoHome(ctx);
      if (p[0] === 'webring') return geoWebring(ctx);
      const m = /^~([\w-]+)$/.exec(p[0] || '');
      if (!m || !GEO_PAGES[m[1]]) return ctx.notFound();
      const user = m[1];
      if (ctx.path.slice(-1) !== '/' && p.length === 1) { ctx.go('/~' + user + '/', { replace: true, noSound: true }); ctx.html('<div></div>'); return; }
      const page = p[1] || 'index.html';
      if (page === 'guestbook.html') return geoGuestbook(ctx, user);
      if (user === 'sk8rjake' && page === 'pics.html') return geoJakePics(ctx);
      if (user === 'sk8rjake' && page === 'links.html') return geoJakeLinks(ctx);
      if (page !== 'index.html') return ctx.notFound();
      return { sk8rjake: geoJake, aquagirl88: geoAqua, pixelpete: geoPete, stargazer_liz: geoLiz }[user](ctx);
    },
    css: `
.web-geo { min-height: 100%; padding: 10px 14px 30px; font: calc(14px * var(--hz-text, 1))/1.35 "Times New Roman", Times, serif; }
.web-geo-center { display: block; text-align: center; }
.web-geo h2 { margin: 16px 0 6px; }
.web-geo-small { font-size: .8em; }
.web-geo-jake { color: #d8ff5a; background-color: #000; background-image: radial-gradient(1px 1px at 12px 20px, #fff, transparent), radial-gradient(1px 1px at 70px 90px, #fff, transparent), radial-gradient(1.5px 1.5px at 120px 40px, #ffa, transparent), radial-gradient(1px 1px at 40px 130px, #aff, transparent), radial-gradient(1px 1px at 150px 150px, #fff, transparent); background-size: 170px 170px; font-family: "Comic Sans MS", "Chalkboard SE", "Trebuchet MS", sans-serif; }
.web-geo-jake a { color: #3cf6ff; text-decoration: underline; }
.web-geo-jake h2 { color: #ff5ae0; }
.web-geo-marq { margin: -10px -14px 10px; padding: 3px 0; color: #ffe34a; background: #1a1a6a; font: bold 1em "Courier New", monospace; }
.web-geo-rainbow { margin: 6px 0; font: 900 2.3em/1.1 "Arial Black", Impact, sans-serif; background: linear-gradient(90deg, #ff3a3a, #ffb13a, #fff23a, #3aff5a, #3ad8ff, #9a5aff, #ff3a3a); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: web-geo-rain 3s linear infinite; }
@keyframes web-geo-rain { to { background-position: -200% 0; } }
.web-geo-uc p { color: #ffd21a; font-weight: 700; margin: 2px 0 10px; }
.web-geo-ucsvg { width: 170px; height: 128px; }
.web-geo-shovel { transform-origin: 94px 46px; animation: web-geo-dig .9s ease-in-out infinite alternate; }
@keyframes web-geo-dig { to { transform: rotate(28deg); } }
.web-geo-layout { width: 100%; max-width: 760px; margin: 0 auto; border-collapse: separate; border-spacing: 10px; }
.web-geo-layout td { vertical-align: top; }
.web-geo-menu { width: 140px; padding: 10px; border: 3px ridge #6a6aff; background: #10104a; line-height: 1.8; }
.web-geo-main { padding: 10px 14px; border: 3px ridge #6a6aff; background: rgba(10,10,50,.85); }
.web-geo-spinmail { width: 20px; height: 20px; vertical-align: -5px; margin-right: 4px; animation: web-geo-spin 2s linear infinite; }
@keyframes web-geo-spin { to { transform: rotateY(360deg); } }
.web-geo-hr { height: 6px; margin: 14px 0; background: linear-gradient(90deg, #ff3a3a, #ffb13a, #fff23a, #3aff5a, #3ad8ff, #9a5aff); border-radius: 3px; }
.web-geo-new { color: #ff3a3a; font: 900 .7em Arial, sans-serif; background: #ffe34a; padding: 0 4px; vertical-align: middle; }
.web-geo-broken { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px 3px 3px; border: 1px solid #999; background: #fff; color: #000; font: 11px Arial, sans-serif; }
.web-geo-broken i { width: 14px; height: 14px; border: 1px solid #aaa; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'%3E%3Cpath d='M3 3 L11 11 M11 3 L3 11' stroke='%23e0352a' stroke-width='2'/%3E%3C/svg%3E") center no-repeat; }
.web-geo-counter { display: inline-flex; gap: 1px; padding: 2px; background: #222; border: 2px inset #888; vertical-align: middle; }
.web-geo-counter i { display: inline-block; width: 14px; height: 20px; font: bold 15px/20px "Courier New", monospace; font-style: normal; text-align: center; color: #fff; background: linear-gradient(#444 0, #111 48%, #000 52%, #333 100%); }
.web-geo-badges { display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; margin: 12px 0; }
.web-geo-badges span { display: inline-flex; align-items: center; justify-content: center; width: 88px; height: 31px; padding: 0 3px; font: 9px/1.1 Verdana, sans-serif; text-align: center; border: 1px solid #000; color: #000; }
.web-geo-badges .b1 { background: linear-gradient(#fff, #9cf); } .web-geo-badges .b2 { background: linear-gradient(#fff, #ccc); } .web-geo-badges .b3 { background: linear-gradient(#fcf, #a6f); } .web-geo-badges .b4 { background: linear-gradient(#ffc, #fc3); }
.web-geo-ring { margin: 10px auto; border: 2px outset #ccc; background: #c0c0c0; color: #000; font: 12px Arial, sans-serif; border-collapse: collapse; }
.web-geo-ring td { padding: 4px 10px; border: 1px solid #888; text-align: center; }
.web-geo-ring a { color: #00008b !important; }
.web-geo-ringh { background: #000080; color: #fff; }
.web-geo-midi { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; margin: 8px 0; background: #c0c0c0; color: #000; border: 2px outset #eee; font: 12px Arial, sans-serif; }
.web-geo-midi button { font: 12px Arial, sans-serif; padding: 1px 8px; border: 2px outset #eee; background: #d4d0c8; cursor: pointer; }
.web-geo-midi button:active { border-style: inset; }
.web-geo-midi.on .web-geo-mstate { color: #070; font-weight: 700; }
.web-geo-pics { margin: 10px auto; border-spacing: 14px; }
.web-geo-pics td { text-align: center; vertical-align: top; }
.web-geo-pic { width: 180px; height: 120px; object-fit: cover; border: 3px ridge #6a6aff; }
.web-geo-links { text-align: left; max-width: 620px; margin: 10px auto; line-height: 1.9; }
.web-geo-gbform { max-width: 620px; margin: 0 auto; padding: 10px; border: 3px ridge #6a6aff; background: rgba(10,10,50,.85); }
.web-geo-gbform td { padding: 3px 6px; vertical-align: top; }
.web-geo-gbform input, .web-geo-gbform textarea, .web-geo-gbform select { width: 320px; font: 13px Arial, sans-serif; }
.web-geo-gbform button { font: 13px Arial, sans-serif; padding: 2px 10px; color: #000; }
.web-geo-gbmsg { color: #ffe34a; font-weight: 700; text-align: center; }
.web-geo-entries { max-width: 640px; margin: 0 auto; }
.web-geo-entry { width: 100%; margin-bottom: 8px; border: 2px solid #6a6aff; border-collapse: collapse; }
.web-geo-eh { padding: 3px 6px; background: #2a2a8a; color: #fff; font-size: .85em; }
.web-geo-eb { padding: 6px; background: rgba(0,0,40,.8); word-break: break-word; }
.web-geo-aqua { color: #0a2a5a; background: #aee8f7 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='20' cy='20' r='9' fill='none' stroke='%23fff' stroke-opacity='.8'/%3E%3Ccircle cx='17' cy='17' r='2' fill='%23fff'/%3E%3Ccircle cx='60' cy='56' r='6' fill='none' stroke='%23fff' stroke-opacity='.7'/%3E%3Ccircle cx='50' cy='20' r='3' fill='none' stroke='%23fff' stroke-opacity='.6'/%3E%3C/svg%3E"); font-family: Georgia, "Times New Roman", serif; }
.web-geo-aqua a { color: #7a1ab0; }
.web-geo-aqua h2 { color: #0a6fa8; font-style: italic; }
.web-geo-aqua .web-geo-main { background: rgba(255,255,255,.75); border: 4px double #1fb4d8; }
.web-geo-aqua .web-geo-gbform { background: rgba(255,255,255,.8); border-color: #1fb4d8; }
.web-geo-aqua .web-geo-gbmsg { color: #7a1ab0; }
.web-geo-aqua .web-geo-eh { background: #1fb4d8; } .web-geo-aqua .web-geo-eb { background: rgba(255,255,255,.85); } .web-geo-aqua .web-geo-entry { border-color: #1fb4d8; }
.web-geo-aquatitle { font: italic 700 2.3em Georgia, serif; color: #0a6fa8; text-shadow: 2px 2px 0 #fff, 4px 4px 0 #7fe6ff; margin: 8px 0 0; }
.web-geo-fish td { padding: 4px 10px 4px 0; vertical-align: middle; }
.web-geo-fpic { width: 56px; height: 56px; }
.web-geo-fact { padding: 8px; border: 2px dashed #1fb4d8; background: #eaffff; }
.web-geo-pete { color: #000; background: repeating-linear-gradient(45deg, #ffd21a 0 30px, #222 30px 60px); }
.web-geo-pete .web-geo-center { max-width: 640px; margin: 20px auto; padding: 20px; background: #fff; border: 6px solid #000; }
.web-geo-bigsign .web-geo-ucsvg { width: 300px; height: 225px; }
.web-geo-petetitle { font: 900 3em Impact, "Arial Black", sans-serif; color: #e0352a; margin: 6px 0; }
.web-geo-big { font-size: 1.3em; font-weight: 700; }
.web-geo-liz { color: #e8dcff; background: radial-gradient(ellipse at 30% 20%, #3a2a7a, transparent 60%), radial-gradient(1px 1px at 20px 30px, #fff, transparent), radial-gradient(1px 1px at 90px 70px, #fff, transparent), radial-gradient(1.5px 1.5px at 60px 120px, #cdf, transparent), #0a0620; background-size: auto, 130px 130px, 130px 130px, 130px 130px, auto; font-family: Verdana, sans-serif; }
.web-geo-liz a { color: #ffd6ff; }
.web-geo-liz h2 { color: #b89aff; }
.web-geo-liz .web-geo-main { background: rgba(20,10,50,.8); border: 3px ridge #8a6aff; }
.web-geo-liz .web-geo-gbform { background: rgba(20,10,50,.85); border-color: #8a6aff; }
.web-geo-lizt { font: 900 2.2em "Arial Black", sans-serif; color: #fff; text-shadow: 0 0 10px #b89aff, 0 0 20px #7a5aff; margin: 8px 0 0; }
.web-geo-planets td { padding: 6px 12px 6px 0; vertical-align: middle; }
.web-geo-planet { position: relative; display: inline-block; width: 40px; height: 40px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff, var(--pc) 45%, #000 110%); box-shadow: 0 0 12px rgba(180,150,255,.4); }
.web-geo-planet.ringed::after { content: ""; position: absolute; left: -12px; right: -12px; top: 15px; height: 10px; border-radius: 50%; border: 3px solid rgba(240,220,170,.85); transform: rotate(-18deg); }
.web-geo-portal { min-height: 100%; background: #f4efff; color: #222; font: calc(13px * var(--hz-text, 1))/1.45 Verdana, Arial, sans-serif; }
.web-geo-portal a { color: #5a2a9a; }
.web-geo-phead { background: linear-gradient(#8a4ad8, #4a1a8a); border-bottom: 4px solid #ffd21a; }
.web-geo-pwrap { width: 860px; margin: 0 auto; }
.web-geo-phead .web-geo-pwrap { display: flex; align-items: center; gap: 20px; height: 76px; }
.web-geo-plogo { display: flex; align-items: center; gap: 8px; font: 900 2.4em "Arial Black", sans-serif; color: #fff; text-shadow: 0 2px 0 #2a0a5a; }
.web-geo-plogo b { color: #ffd21a; }
.web-geo-plogoic { width: 48px; height: 48px; }
.web-geo-ptag { color: #f0e6ff; font-weight: 700; }
.web-geo-pbody { display: grid; grid-template-columns: 1fr 240px; gap: 20px; padding: 16px 0; }
.web-geo-pmain h1 { color: #4a1a8a; margin: 0 0 10px; }
.web-geo-hoods { width: 100%; border-collapse: collapse; }
.web-geo-hoods td { padding: 8px; border-bottom: 1px solid #d8c8f0; }
.web-geo-hood b { color: #4a1a8a; font-size: 1.1em; }
.web-geo-pbox { padding: 10px; margin-bottom: 12px; border: 2px solid #b89ae8; border-radius: 8px; background: #fff; }
.web-geo-pbtn { font: 700 1.05em Verdana, sans-serif; padding: 6px 14px; border-radius: 16px; border: 1px solid #a07a00; cursor: pointer; background: linear-gradient(#fff3a8, #ffd21a); }
.web-geo-pfoot { text-align: center; color: #7a6a9a; padding: 10px 0 20px; font-size: .9em; }
`,
  });

  // ================================================================ www.free-screensavers-4u.com
  const FS_SAVERS = [
    ['bubbles3d', 'Super Bubbles 3D', '2.1 MB', 4.6, 1203443, 'Realistic 3D bubbles float across your screen! Now with REAL physics!!!'],
    ['starwarp', 'Starfield Warp Deluxe', '1.4 MB', 4.3, 988201, 'Fly through space at WARP SPEED. Makes your computer 20% faster*'],
    ['aquarium', 'Aquarium Paradise', '3.8 MB', 4.8, 2204551, 'A beautiful tropical aquarium right on your desktop. No feeding required!'],
    ['fireworks', 'Glass Fireworks 2007', '2.9 MB', 4.1, 603322, 'Celebrate EVERY DAY with amazing glass fireworks!!!'],
    ['tubes', '3D Tube Maze', '0.9 MB', 4.4, 1450990, 'Watch colorful tubes build a maze. Oddly relaxing.'],
    ['aurora', 'Aurora Dreams', '2.2 MB', 4.7, 877114, 'The northern lights, live on your screen. So calm. So free.'],
  ];
  function fsFrame(inner) {
    return `<div class="web-fs"><div class="web-fs-banner" data-ad="winner"><span class="web-fs-bannertxt">CONGRATULATIONS!!! You are the <b>1,000,000th</b> visitor!!! CLICK HERE to claim your prize!!!</span></div>
      <div class="web-fs-head"><h1><span class="web-fs-rain">FREE-SCREENSAVERS-4U.COM</span></h1><p><span class="wk-blink">100% FREE!!!</span> No spyware!!!* Updated DAILY!!! ${K.burst('NEW!', { size: 46, font: 11, c1: '#fff', c2: '#ff3a3a', rim: '#a00', spin: true })}</p></div>
      <div class="web-fs-nav"><a href="/">HOME</a> | <a href="/">3D</a> | <a href="/">NATURE</a> | <a href="/">SPACE</a> | <a href="/">AQUARIUM</a> | <a href="/" class="web-fs-hot">TOP 10</a> | <a href="#" data-ad="submit">SUBMIT</a></div>${inner}
      <div class="web-fs-foot">Copyright 2006 free-screensavers-4u.com. All screensavers 100% free*.<br>*Free as in free. No spyware. Some toolbars. Webmaster: webmaster at free-screensavers-4u.com</div></div>`;
  }
  function fsWire(ctx, root) {
    root.querySelectorAll('[data-ad]').forEach((el) => el.addEventListener('click', (e) => {
      if (e.target.closest('.web-fs-fish')) return;
      e.preventDefault();
      const k = el.dataset.ad;
      if (k === 'winner') ctx.dialog({ title: 'Message from webpage', icon: 'icons/gift', instruction: 'You are our 1,000,000th visitor!', message: 'Your prize is the warm feeling of clicking a flashing banner.\n\nAlso, every visitor is the 1,000,000th visitor. We checked.' });
      else if (k === 'slow') fsScan(ctx);
      else if (k === 'fishmiss') { ctx.dialog({ title: 'Message from webpage', icon: 'icons/fish', instruction: 'MISSED!!!', message: 'You missed the fish! Try again! The fish is fast. The fish is ready.' }); }
      else if (k === 'submit') ctx.dialog({ title: 'Message from webpage', icon: 'info', message: 'Submissions are closed while our webmaster finishes his homework.' });
      else if (k === 'news') ctx.dialog({ title: 'Message from webpage', icon: 'icons/mail', instruction: 'You are now subscribed!!!', message: 'You will receive our newsletter every 15 minutes. Just kidding: there is no newsletter, and nothing was sent anywhere.' });
      else if (k === 'ring') ctx.go('http://www.ringtonez4u.com/');
    }));
    root.querySelectorAll('.web-fs-fish').forEach((f) => f.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      ctx.sound('pop');
      ctx.dialog({ title: 'Message from webpage', icon: 'icons/fish', instruction: 'BOOP! You booped the fish!', message: 'Congratulations! Your prize: one (1) free fishbowl, delivered in 6 to 8 weeks.\n\nThe fish would like you to know that it was a very gentle boop, and it is fine.' });
    }));
  }
  function fsScan(ctx) {
    const go = () => {
      const bar = A.ui.progress({ value: 0 });
      const txt = A.util.h('div.ae-td-message', null, 'Scanning C:\\Aerium... just kidding. Scanning your bubbles...');
      A.ui.dialog({
        parent: ctx.win, title: 'SpeedUp My PC 2007 (Free Edition)', icon: 'icons/taskmgr', width: 420,
        content: A.util.h('div', { style: { padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' } }, A.util.h('div.ae-td-instruction', null, 'Scanning your computer...'), bar, txt),
        buttons: [{ label: 'Close', cancel: true }],
        onOpen(w) {
          let p = 0;
          const files = ['bubbles.dll', 'fish_food.sys', 'glass_colors.ini', 'screensaver_mood.dat', 'homework (due friday).txt', 'reflections.cache'];
          const tick = () => {
            if (w.closed) return;
            p += 7 + Math.random() * 9;
            bar.set(p);
            txt.textContent = 'Scanning ' + files[Math.floor(Math.random() * files.length)] + '...';
            if (p < 100) setTimeout(tick, 260);
            else { txt.textContent = 'Scan complete! 0 problems found. Your computer is running at a perfectly normal speed. It was just waiting for you.'; A.sound.play('notify'); }
          };
          setTimeout(tick, 300);
        },
      });
    };
    if (A.ui.uac) A.ui.uac({ program: 'SpeedUp My PC 2007', publisher: 'Unknown', verified: false, icon: 'icons/taskmgr' }).then((ok) => { if (ok) go(); else ctx.dialog({ title: 'Message from webpage', icon: 'icons/shield', message: 'Good call. You should never trust a flashing banner. (It was harmless anyway.)' }); });
    else go();
  }
  function fsPreview(id) {
    if (id === 'bubbles3d') return `<span class="web-fs-pv pv-bub">${'<i></i>'.repeat(7)}</span>`;
    if (id === 'starwarp') return '<span class="web-fs-pv pv-warp"><i></i><i></i><i></i></span>';
    if (id === 'aquarium') return `<span class="web-fs-pv pv-aqua">${K.img('icons/fish', 'pv-fish1')}${K.img('icons/fish', 'pv-fish2')}</span>`;
    if (id === 'fireworks') return `<span class="web-fs-pv pv-fire">${'<i></i>'.repeat(4)}</span>`;
    if (id === 'tubes') return '<span class="web-fs-pv pv-tube"><i></i><i></i><i></i><i></i></span>';
    return '<span class="web-fs-pv pv-aur"><i></i><i></i></span>';
  }
  function fsHome(ctx) {
    ctx.title('FREE SCREENSAVERS 4 U!!! 100% FREE DOWNLOADS!!!');
    const inner = `<div class="web-fs-cols"><div class="web-fs-left"><div class="web-fs-box"><b>CATEGORIES</b><br><a href="/">3D Screensavers</a> <span class="web-fs-new wk-blink">NEW!</span><br><a href="/">Nature</a><br><a href="/">Space</a> <span class="web-fs-new wk-blink">NEW!</span><br><a href="/">Aquarium</a><br><a href="/">Fireworks</a><br><a href="/">Funny</a></div>
        <div class="web-fs-box"><b>NEWSLETTER!!!</b><br>Get new screensavers every day!!!<br><button type="button" data-ad="news">SUBSCRIBE</button></div>
        <div class="web-fs-box web-fs-ring" data-ad="ring"><b>HOT RINGTONES!!!</b><br>${K.img('icons/phone', 'web-fs-ringic')}<br>Get them at Ringtonez4U!</div></div>
      <div class="web-fs-main"><h2 class="web-fs-h2">TODAY'S TOP SCREENSAVERS!!!</h2>${FS_SAVERS.map(([id, name, size, rating, dls, desc]) => `<div class="web-fs-item">${fsPreview(id)}<div class="web-fs-info"><a class="web-fs-name" href="/download/${id}">${esc(name)}</a><p>${esc(desc)}</p><div class="web-fs-meta">Rating: ${K.stars(rating)} | Downloads: <b>${K.num(dls)}</b> | Size: ${size}</div></div><a class="web-fs-dl" href="/download/${id}"><span>FREE</span>DOWNLOAD</a></div>`).join('')}</div>
      <div class="web-fs-right"><div class="web-fs-slow" data-ad="slow"><b>WARNING!!!</b><br>Your computer may be running <span class="wk-blink">SLOW!!!</span><br>${K.img('icons/warning', 'web-fs-warnic')}<br><u>CLICK HERE TO SCAN NOW</u><br><small>100% FREE SCAN</small></div>
        <div class="web-fs-boop" data-ad="fishmiss"><b>BOOP THE FISH!!!</b><br><small>and WIN a FREE fishbowl!!!</small><div class="web-fs-tank"><span class="web-fs-fish" role="button" aria-label="Boop the fish">${K.img('icons/fish')}</span></div></div></div></div>`;
    const root = ctx.html(fsFrame(inner));
    fsWire(ctx, root);
    ctx.after(1500, () => ctx.popup('http://www.free-screensavers-4u.com/popup/winner', { width: 400, height: 340 }));
  }
  function fsDownload(ctx, id) {
    const s = FS_SAVERS.find((x) => x[0] === id);
    if (!s) return ctx.notFound();
    const [, name, size] = s;
    ctx.title('Downloading ' + name + '...');
    const inner = `<div class="web-fs-dlpage"><h2 class="web-fs-h2">THANK YOU FOR CHOOSING ${esc(name.toUpperCase())}!!!</h2>${fsPreview(id)}
      <p class="web-fs-count">Your download will begin in <b class="web-fs-secs">5</b> seconds...</p>
      <label class="web-fs-toolbar"><input type="checkbox" checked> Also install the FREE Bubble Toolbar (recommended!!!)</label>
      <p>If your download does not start, <a href="#" class="web-fs-now">click here</a>.</p><p class="web-fs-small">File: ${esc(name)} Screensaver.txt (${size})</p><p><a href="/">&lt;&lt; Back to more FREE screensavers</a></p></div>`;
    const root = ctx.html(fsFrame(inner));
    fsWire(ctx, root);
    const cb = root.querySelector('.web-fs-toolbar input');
    cb.addEventListener('change', () => {
      if (cb.checked) return;
      ctx.dialog({ title: 'Message from webpage', icon: 'question', instruction: 'Are you sure?', message: 'The Bubble Toolbar is very nice. It has a search box AND a weather button.', buttons: [{ label: 'Keep the toolbar', value: 'keep' }, { label: 'No thanks', default: true, value: 'no' }] }).then((r) => { if (r === 'keep') cb.checked = true; });
    });
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      root.querySelector('.web-fs-count').innerHTML = 'Your download has started!!! Enjoy!!!';
      const text = `${name.toUpperCase()} SCREENSAVER\r\n${'='.repeat(name.length + 12)}\r\n\r\nThank you for downloading from free-screensavers-4u.com!!!\r\n\r\nINSTALLATION INSTRUCTIONS:\r\n1. Close your eyes.\r\n2. Imagine ${name} on your screen.\r\n3. That's it! You now have ${name}.\r\n${cb.checked ? '\r\nBONUS: The Bubble Toolbar has also been imagined into your browser.\r\n' : ''}\r\nWant a REAL screensaver? Right-click the desktop, choose Personalize,\r\nthen Screen Saver. Aerium comes with some very nice ones, and none of\r\nthem came with a toolbar.\r\n\r\n(This is a pretend download from a pretend website. Your computer is\r\nperfectly fine. The fish says hi.)\r\n`;
      ctx.download({ name: name + ' Screensaver.txt', content: text, type: 'Text Document', icon: 'icons/monitor', size: Math.round(parseFloat(size) * 1048576) });
    };
    let n = 5;
    const secs = root.querySelector('.web-fs-secs');
    const iv = ctx.every(1000, () => { n--; if (secs) secs.textContent = String(Math.max(0, n)); if (n <= 0) { clearInterval(iv); start(); } });
    root.querySelector('.web-fs-now').addEventListener('click', (e) => { e.preventDefault(); clearInterval(iv); start(); });
  }
  function fsPopup(ctx, kind) {
    if (kind === 'winner') {
      ctx.title('YOU ARE A WINNER!!!');
      const root = ctx.html(`<div class="web-fs web-fs-popup"><div class="web-fs-win">${K.burst('WINNER!', { size: 110, font: 18, c1: '#fff45c', c2: '#ff3a3a', rim: '#a00', spin: true })}<h1 class="web-fs-rain">YOU HAVE WON!!!</h1><p>You have been selected to receive a <b>FREE FISHBOWL!!!</b></p><a class="web-fs-dl" href="/claim"><span>CLAIM</span>MY PRIZE</a><p class="web-fs-small">This offer expires in <b class="wk-blink web-fs-count">00:59</b>. Not really.</p></div></div>`);
      const cd = root.querySelector('.web-fs-count');
      let left = 59;
      ctx.every(1000, () => { left = left > 1 ? left - 1 : 59; cd.textContent = '00:' + String(left).padStart(2, '0'); });
      return root;
    }
    if (kind === 'speed') {
      ctx.title('Your computer may be running slow!!!');
      const root = ctx.html(`<div class="web-fs web-fs-popup"><div class="web-fs-win">${K.img('icons/warning', 'web-fs-warnbig')}<h1>WARNING!!!</h1><p>Your computer may be running slow!!!</p><button type="button" class="web-fs-scan">SCAN NOW</button></div></div>`);
      root.querySelector('.web-fs-scan').addEventListener('click', () => fsScan(ctx));
      return root;
    }
    return ctx.notFound();
  }
  function fsClaim(ctx) {
    ctx.title('Claim your FREE fishbowl!!!');
    const root = ctx.html(`<div class="web-fs web-fs-popup"><div class="web-fs-win"><h1>CLAIM YOUR PRIZE!!!</h1><form class="web-fs-claim"><label>Your first name (just the first one!): <input name="n" type="text" maxlength="20"></label><label>Your favorite fish: <select name="f"><option>Goldfish</option><option>Betta</option><option>Clownfish</option><option>All of them</option></select></label><button type="submit">CLAIM!!!</button></form><p class="web-fs-claimed"></p></div></div>`);
    root.querySelector('.web-fs-claim').addEventListener('submit', (e) => {
      e.preventDefault();
      const n = e.target.n.value.trim() || 'friend';
      root.querySelector('.web-fs-claimed').innerHTML = `Congratulations, <b>${esc(n)}</b>! Your free fishbowl will arrive in 6 to 8 weeks.<br><br><small>(There is no fishbowl. There never was. But the ${esc(e.target.f.value.toLowerCase())} thanks you for being so trusting. Nothing you typed went anywhere.)</small>`;
      ctx.sound('win');
    });
  }
  W.register({
    id: 'free-screensavers', host: 'www.free-screensavers-4u.com', aliases: ['free-screensavers-4u.com'],
    title: 'FREE SCREENSAVERS 4 U!!!', shortTitle: 'Free Screensavers!!', icon: 'icons/monitor', weight: 1.8,
    shady: 'This website contains 7 blinking banners, 1 pop-up window and a free fishbowl that nobody has ever received. It is harmless, but please do not believe anything it says.',
    pictures: ['images/banner_1000000.gif', 'images/new_star.gif', 'images/download_btn.gif', 'images/spacer.gif', 'images/punch_fish.swf', 'images/scan_now.gif'],
    favicon: '<svg viewBox="0 0 16 16"><path d="M8 .5 L9.8 5.6 L15.3 5.8 L11 9.1 L12.6 14.4 L8 11.3 L3.4 14.4 L5 9.1 L.7 5.8 L6.2 5.6 Z" fill="#ff3a3a" stroke="#900" stroke-linejoin="round"/><text x="8" y="10.4" font-family="Arial" font-weight="bold" font-size="7" text-anchor="middle" fill="#ff0">!</text></svg>',
    pages: [
      { path: '/', title: 'FREE SCREENSAVERS 4 U!!! 100% FREE DOWNLOADS!!!', text: 'free screensavers download super bubbles 3D starfield warp aquarium paradise glass fireworks 3D tube maze aurora dreams 100% free no spyware' },
      { path: '/download/bubbles3d', title: 'Downloading Super Bubbles 3D...', text: 'download super bubbles 3D screensaver free' },
      { path: '/download/aquarium', title: 'Downloading Aquarium Paradise...', text: 'download aquarium paradise screensaver fish free' },
    ],
    render(ctx) {
      const p = ctx.parts;
      if (!p.length) return fsHome(ctx);
      if (p[0] === 'download') return fsDownload(ctx, p[1]);
      if (p[0] === 'popup') return fsPopup(ctx, p[1]);
      if (p[0] === 'claim') return fsClaim(ctx);
      return ctx.notFound();
    },
    css: `
.web-fs { min-height: 100%; background: #ffff66; color: #000; font: calc(13px * var(--hz-text, 1))/1.35 Verdana, Arial, sans-serif; }
.web-fs a { color: #0000ee; }
.web-fs-banner { width: 728px; max-width: 100%; margin: 0 auto; padding: 14px 10px; text-align: center; cursor: pointer; border: 3px solid #000; font: 900 1.05em Arial, sans-serif; animation: web-fs-flash .5s steps(1) infinite; }
@keyframes web-fs-flash { 0% { background: #ff0; color: #f00; } 33% { background: #f00; color: #ff0; } 66% { background: #0f0; color: #00f; } }
.web-fs-head { text-align: center; padding: 8px 0 4px; }
.web-fs-head h1 { margin: 0; }
.web-fs-rain { font: 900 2.2em/1 Impact, "Arial Black", sans-serif; background: linear-gradient(90deg, #f00, #f90, #ff0, #0c0, #09f, #90f, #f00); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: web-geo-rain 1.5s linear infinite; -webkit-text-stroke: 1px #000; }
@keyframes web-geo-rain { to { background-position: -200% 0; } }
.web-fs-head p { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 6px 0; font-weight: 700; color: #c00; }
.web-fs-nav { padding: 5px; text-align: center; background: #000; color: #0f0; font-weight: 700; }
.web-fs-nav a { color: #0f0; }
.web-fs-hot { color: #f0f !important; }
.web-fs-cols { display: grid; grid-template-columns: 150px minmax(0, 1fr) 170px; gap: 10px; max-width: 980px; margin: 10px auto; padding: 0 8px; }
.web-fs-box { padding: 8px; margin-bottom: 10px; background: #fff; border: 3px dashed #f00; font-size: .92em; line-height: 1.7; }
.web-fs-box button { font: 700 1em Arial, sans-serif; background: #f00; color: #fff; border: 2px outset #f66; cursor: pointer; }
.web-fs-new { color: #fff; background: #f00; font-size: .75em; padding: 0 3px; font-weight: 700; }
.web-fs-ring { cursor: pointer; text-align: center; background: #000; color: #0f0; border-color: #0f0; }
.web-fs-ringic { width: 40px; height: 40px; }
.web-fs-h2 { margin: 0 0 8px; font: 900 1.4em Impact, "Arial Black", sans-serif; color: #c00; text-align: center; }
.web-fs-item { display: flex; gap: 10px; align-items: center; padding: 8px; margin-bottom: 8px; background: #fff; border: 2px solid #000; box-shadow: 4px 4px 0 #f90; }
.web-fs-info { flex: 1; min-width: 0; }
.web-fs-info p { margin: 3px 0; font-size: .92em; }
.web-fs-name { font: 900 1.2em Arial, sans-serif; }
.web-fs-meta { font-size: .85em; color: #333; }
.web-fs-dl { display: inline-flex; flex-direction: column; align-items: center; padding: 6px 12px; border-radius: 8px; color: #fff !important; font: 900 1em Arial, sans-serif; text-decoration: none; border: 2px solid #060; background: linear-gradient(#7f7 0, #0b0 50%, #080 51%, #0c0 100%); box-shadow: 0 3px 0 #040; animation: web-fs-pulse 1s ease-in-out infinite; }
.web-fs-dl span { font-size: .75em; color: #ff0; }
@keyframes web-fs-pulse { 50% { transform: scale(1.06); } }
.web-fs-pv { position: relative; flex: none; display: block; width: 110px; height: 80px; overflow: hidden; border: 3px solid #333; background: #000; }
.pv-bub { background: linear-gradient(#0a4f86, #1fb4d8); }
.pv-bub i { position: absolute; bottom: -20px; width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(255,255,255,.8); background: radial-gradient(circle at 35% 30%, #fff, rgba(255,255,255,.1) 45%, rgba(150,220,255,.4)); animation: web-fs-rise 3s linear infinite; }
.pv-bub i:nth-child(1) { left: 8px; } .pv-bub i:nth-child(2) { left: 30px; animation-delay: -.5s; width: 10px; height: 10px; } .pv-bub i:nth-child(3) { left: 52px; animation-delay: -1.2s; } .pv-bub i:nth-child(4) { left: 74px; animation-delay: -2s; width: 20px; height: 20px; } .pv-bub i:nth-child(5) { left: 90px; animation-delay: -2.5s; } .pv-bub i:nth-child(6) { left: 18px; animation-delay: -1.6s; width: 8px; height: 8px; } .pv-bub i:nth-child(7) { left: 62px; animation-delay: -.2s; width: 12px; height: 12px; }
@keyframes web-fs-rise { to { transform: translateY(-120px); } }
.pv-warp i { position: absolute; inset: 0; background: radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 60%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 80%, #fff, transparent), radial-gradient(1px 1px at 85% 20%, #fff, transparent), radial-gradient(1px 1px at 10% 70%, #fff, transparent); animation: web-fs-warp 1.5s linear infinite; }
.pv-warp i:nth-child(2) { animation-delay: -.5s; } .pv-warp i:nth-child(3) { animation-delay: -1s; }
@keyframes web-fs-warp { from { transform: scale(.3); opacity: 0; } 30% { opacity: 1; } to { transform: scale(2.4); opacity: 0; } }
.pv-aqua { background: linear-gradient(#39a9e8, #0b4f8f); }
.pv-aqua img { position: absolute; width: 30px; height: 30px; }
.pv-fish1 { top: 12px; animation: web-fs-swim 4s linear infinite; }
.pv-fish2 { top: 42px; animation: web-fs-swim 6s linear infinite reverse; }
@keyframes web-fs-swim { from { left: -30px; } to { left: 110px; } }
.pv-fire i { position: absolute; width: 40px; height: 40px; border-radius: 50%; background: radial-gradient(circle, transparent 30%, #ff0 32%, transparent 36%, transparent 55%, #f0f 57%, transparent 62%); animation: web-fs-boom 1.4s ease-out infinite; }
.pv-fire i:nth-child(1) { left: 10px; top: 10px; } .pv-fire i:nth-child(2) { left: 60px; top: 20px; animation-delay: -.4s; } .pv-fire i:nth-child(3) { left: 30px; top: 40px; animation-delay: -.8s; } .pv-fire i:nth-child(4) { left: 70px; top: 44px; animation-delay: -1.1s; }
@keyframes web-fs-boom { from { transform: scale(.1); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
.pv-tube { background: #001; }
.pv-tube i { position: absolute; height: 8px; border-radius: 4px; animation: web-fs-grow 3s ease-in-out infinite; }
.pv-tube i:nth-child(1) { left: 5px; top: 10px; background: linear-gradient(#f99, #c00); } .pv-tube i:nth-child(2) { left: 20px; top: 30px; background: linear-gradient(#9f9, #0a0); animation-delay: -.7s; } .pv-tube i:nth-child(3) { left: 10px; top: 50px; background: linear-gradient(#99f, #00c); animation-delay: -1.4s; } .pv-tube i:nth-child(4) { left: 30px; top: 64px; background: linear-gradient(#ff9, #cc0); animation-delay: -2.1s; }
@keyframes web-fs-grow { from { width: 0; } 70% { width: 90px; } to { width: 90px; opacity: 0; } }
.pv-aur i { position: absolute; left: -20%; right: -20%; height: 40px; border-radius: 50%; filter: blur(6px); animation: web-fs-aur 5s ease-in-out infinite alternate; }
.pv-aur i:nth-child(1) { top: 10px; background: linear-gradient(90deg, transparent, #3ee6a0, #2aceda, transparent); } .pv-aur i:nth-child(2) { top: 36px; background: linear-gradient(90deg, transparent, #2aceda, #9a5aff, transparent); animation-delay: -2s; }
@keyframes web-fs-aur { from { transform: translateX(-12%) skewX(-10deg); } to { transform: translateX(12%) skewX(10deg); } }
.web-fs-slow { padding: 10px; margin-bottom: 10px; text-align: center; cursor: pointer; border: 3px solid #000; font: 700 1em Arial, sans-serif; animation: web-fs-flash2 .8s steps(1) infinite; }
@keyframes web-fs-flash2 { 0% { background: #f00; color: #fff; } 50% { background: #ff0; color: #f00; } }
.web-fs-warnic { width: 44px; height: 44px; }
.web-fs-boop { position: relative; padding: 8px; text-align: center; cursor: crosshair; background: #0af; color: #fff; border: 3px solid #000; font: 700 1em Arial, sans-serif; }
.web-fs-tank { position: relative; height: 70px; margin-top: 6px; background: linear-gradient(#6cf, #06a); border: 2px solid #fff; overflow: hidden; }
.web-fs-fish { position: absolute; top: 14px; width: 40px; height: 40px; cursor: crosshair; animation: web-fs-dart 1.3s ease-in-out infinite alternate; }
.web-fs-fish img { width: 100%; height: 100%; }
@keyframes web-fs-dart { from { left: 2px; transform: scaleX(1); } 49% { transform: scaleX(1); } 50% { transform: scaleX(-1); } to { left: calc(100% - 42px); transform: scaleX(-1); } }
.web-fs-foot { max-width: 980px; margin: 10px auto 0; padding: 10px; text-align: center; font-size: .8em; color: #555; border-top: 2px dashed #f00; }
.web-fs-dlpage { max-width: 640px; margin: 16px auto; padding: 16px; text-align: center; background: #fff; border: 3px solid #000; box-shadow: 6px 6px 0 #f90; }
.web-fs-dlpage .web-fs-pv { margin: 10px auto; width: 220px; height: 150px; }
.web-fs-count { font: 700 1.2em Arial, sans-serif; }
.web-fs-toolbar { display: inline-flex; gap: 6px; align-items: center; padding: 4px 8px; background: #ffc; border: 1px dotted #990; font-size: .92em; }
.web-fs-small { font-size: .8em; color: #666; }
.web-fs-popup { display: grid; place-items: center; padding: 10px; }
.web-fs-win { text-align: center; padding: 12px; background: #fff; border: 4px solid #f00; box-shadow: 0 0 0 4px #ff0; }
.web-fs-win h1 { margin: 6px 0; }
.web-fs-warnbig { width: 64px; height: 64px; }
.web-fs-scan, .web-fs-claim button { font: 900 1.2em Arial, sans-serif; padding: 6px 16px; color: #fff; background: #f00; border: 3px outset #f66; cursor: pointer; }
.web-fs-claim { display: flex; flex-direction: column; gap: 8px; align-items: center; }
.web-fs-claim input, .web-fs-claim select { font: inherit; }
.web-fs-claimed { max-width: 320px; }
`,
  });

  // ================================================================ www.fishpals.com
  const FP_SPECIES = {
    goldfish: { name: 'Goldfish', c1: '#ff9a2e', c2: '#e0560f' },
    betta: { name: 'Betta', c1: '#6aa8ff', c2: '#3a3ad8', fins: true },
    guppy: { name: 'Guppy', c1: '#ffd84a', c2: '#35b04a' },
    clownfish: { name: 'Clownfish', c1: '#ff8a1a', c2: '#d8500a', stripes: true },
  };
  const FP_SHOP = [['bubbler', 'Bubble stone', 10, 'icons/bubble'], ['plant', 'Swaying plant', 15, 'icons/leaf'], ['arch', 'Rock arch', 20, 'icons/mountain'], ['chest', 'Treasure chest', 25, 'icons/gift'], ['castle', 'Tiny castle', 30, 'icons/home'], ['diver', 'Deep sea diver', 40, 'icons/user']];
  function fpLoad(ctx) {
    const pet = ctx.store.get('fishpals.pet', null);
    if (!pet) return null;
    const now = Date.now();
    const hrs = Math.max(0, (now - (pet.last || now)) / H);
    pet.hunger = clamp(pet.hunger - hrs * 4, 0, 100);
    pet.happy = clamp(pet.happy - hrs * 3, 0, 100);
    pet.clean = clamp(pet.clean - hrs * 2, 0, 100);
    pet.last = now;
    pet.daily = false;
    if ((pet.lastDaily || 0) < K.dayNumber()) { pet.lastDaily = K.dayNumber(); pet.bucks = (pet.bucks || 0) + 10; pet.daily = true; }
    ctx.store.set('fishpals.pet', pet);
    return pet;
  }
  function fpFrame(ctx, inner) {
    return `<div class="web-fp"><div class="web-fp-head"><div class="web-fp-wrap web-fp-headrow"><a class="web-fp-logo" href="http://www.fishpals.com/">${K.img('icons/fish', 'web-fp-logoic')}<span>Fish<b>Pals</b></span></a><span class="web-fp-tag">Over 2 million fish adopted! Yours is waiting.</span><nav><a href="/">My tank</a><a href="/shop">Shop</a><a href="/adopt">Adopt</a></nav></div></div><div class="web-fp-wrap web-fp-body">${inner}</div><div class="web-fp-foot">FishPals &copy; 2007. No real fish were hungry in the making of this website.</div></div>`;
  }
  function fpMood(p) {
    const avg = (p.hunger + p.happy + p.clean) / 3;
    if (p.hunger < 20) return p.name + ' is hungry! Try feeding them.';
    if (p.clean < 25) return p.name + "'s tank is getting murky. Time to clean!";
    if (p.happy < 25) return p.name + ' is bored. Play a game together!';
    if (avg > 80) return p.name + ' is very happy! Look at those fins go.';
    return p.name + ' is doing fine and blowing little bubbles.';
  }
  function fpTank(ctx) {
    const pet = fpLoad(ctx);
    if (!pet) return fpLanding(ctx);
    const sp = FP_SPECIES[pet.species] || FP_SPECIES.goldfish;
    ctx.title(pet.name + "'s tank - FishPals");
    const age = Math.max(0, Math.floor((Date.now() - pet.born) / D));
    const bar = (label, key, cls) => `<div class="web-fp-stat"><span>${label}</span><div class="web-fp-bar ${cls}"><i data-stat="${key}" style="width:${Math.round(pet[key])}%"></i></div></div>`;
    const inner = `${pet.daily ? `<div class="web-fp-daily">${K.img('icons/star', 'web-fp-dailyic')} Welcome back! You earned <b>10 FishBucks</b> for visiting today.</div>` : ''}
      <div class="web-fp-tankrow"><div class="web-fp-tankbox"><div class="web-fp-tankhead"><h1>${esc(pet.name)}</h1><span>${esc(sp.name)} &middot; ${age === 0 ? 'born today' : age + ' day' + (age === 1 ? '' : 's') + ' old'}</span></div><div class="web-fp-tank"></div><p class="web-fp-mood">${esc(fpMood(pet))}</p></div>
      <div class="web-fp-panel">${bar('Full', 'hunger', 'food')}${bar('Happy', 'happy', 'joy')}${bar('Clean', 'clean', 'water')}
        <div class="web-fp-bucks">${K.img('icons/cart', 'web-fp-bic')}<span><b class="web-fp-bnum">${pet.bucks || 0}</b> FishBucks</span></div>
        <div class="web-fp-actions"><button type="button" data-a="feed" class="web-fp-btn feed">Feed</button><button type="button" data-a="play" class="web-fp-btn play">Play</button><button type="button" data-a="clean" class="web-fp-btn clean">Clean tank</button><button type="button" data-a="tap" class="web-fp-btn tap">Tap the glass</button></div>
        <p class="web-fp-links"><a href="/shop">Decorate the tank</a> &middot; <a href="#" class="web-fp-rename">Rename</a> &middot; <a href="#" class="web-fp-release">Start over</a></p></div></div>`;
    const root = ctx.html(fpFrame(ctx, inner));
    const cv = ctx.canvas(560, 300, 'web-fp-cv');
    root.querySelector('.web-fp-tank').appendChild(cv.c);
    const g = cv.g, TW = 560, TH = 300;
    const fish = { x: 280, y: 150, tx: 200, ty: 120, dir: 1, speed: 50, dart: 0 };
    let flakes = [], bubbles = [], toy = null, sparkle = 0, t = 0;
    const save = () => { pet.last = Date.now(); ctx.store.set('fishpals.pet', pet); };
    const paintStats = () => {
      root.querySelectorAll('[data-stat]').forEach((i) => { i.style.width = Math.round(pet[i.dataset.stat]) + '%'; });
      root.querySelector('.web-fp-mood').textContent = fpMood(pet);
      root.querySelector('.web-fp-bnum').textContent = pet.bucks || 0;
    };
    const earn = () => { pet.bucks = (pet.bucks || 0) + 2; };
    root.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'feed') { for (let i = 0; i < 5; i++) flakes.push({ x: 120 + Math.random() * 320, y: -Math.random() * 40, v: 25 + Math.random() * 20, c: ['#ff8a3a', '#ffd23a', '#7ad84a', '#ff6a8a'][i % 4] }); ctx.sound('plop'); earn(); }
      else if (a === 'play') { toy = { x: 40, y: 60, vx: 140, vy: 90, life: 6 }; ctx.sound('bubble'); earn(); }
      else if (a === 'clean') { sparkle = 1.2; pet.clean = 100; earn(); ctx.sound('zap'); }
      else if (a === 'tap') { fish.tx = fish.x < TW / 2 ? TW - 60 : 60; fish.ty = 40 + Math.random() * 200; fish.dart = 0.9; pet.happy = clamp(pet.happy - 4, 0, 100); ctx.sound('click'); ctx.dialog({ title: 'FishPals', icon: 'icons/fish', instruction: 'Please do not tap on the glass!', message: pet.name + ' got a little startled. Fish have very good hearing. (-4 happiness)' }); }
      save(); paintStats();
    }));
    root.querySelector('.web-fp-rename').addEventListener('click', async (e) => {
      e.preventDefault();
      const n = await ctx.ask({ title: 'FishPals', message: 'New name for your fish:', value: pet.name });
      if (n && n.trim()) { pet.name = n.trim().slice(0, 24); save(); ctx.reload(); }
    });
    root.querySelector('.web-fp-release').addEventListener('click', (e) => {
      e.preventDefault();
      ctx.dialog({ title: 'FishPals', icon: 'question', instruction: 'Start over with a new fish?', message: pet.name + ' will retire to a lovely pond with lots of lily pads and friends. You can adopt a new fish right away.', buttons: [{ label: 'Retire to the pond', value: 'yes' }, { label: 'Keep ' + pet.name, default: true, value: 'no' }] }).then((r) => { if (r === 'yes') { ctx.store.set('fishpals.pet', null); ctx.go('/adopt'); } });
    });
    const has = (k) => (pet.decor || []).includes(k);
    const sandH = 36;
    ctx.loop((dt) => {
      t += dt;
      if (flakes.length) { const f = flakes.reduce((a, b) => (Math.hypot(b.x - fish.x, b.y - fish.y) < Math.hypot(a.x - fish.x, a.y - fish.y) ? b : a)); fish.tx = f.x; fish.ty = f.y; }
      else if (toy) { fish.tx = toy.x; fish.ty = toy.y; }
      else if (Math.hypot(fish.tx - fish.x, fish.ty - fish.y) < 12) { fish.tx = 40 + Math.random() * (TW - 80); fish.ty = 30 + Math.random() * (TH - sandH - 70); }
      const sp2 = fish.dart > 0 ? 240 : flakes.length || toy ? 110 : 45;
      fish.dart = Math.max(0, fish.dart - dt);
      const dx = fish.tx - fish.x, dy = fish.ty - fish.y, dd = Math.hypot(dx, dy) || 1;
      fish.x += (dx / dd) * Math.min(dd, sp2 * dt); fish.y += (dy / dd) * Math.min(dd, sp2 * dt);
      if (Math.abs(dx) > 2) fish.dir = dx > 0 ? 1 : -1;
      flakes.forEach((f) => { f.y = Math.min(TH - sandH - 4, f.y + f.v * dt); f.x += Math.sin(t * 3 + f.v) * 10 * dt; });
      const before = flakes.length;
      flakes = flakes.filter((f) => Math.hypot(f.x - (fish.x + fish.dir * 16), f.y - fish.y) > 14);
      if (flakes.length < before) { pet.hunger = clamp(pet.hunger + 6 * (before - flakes.length), 0, 100); ctx.sound('pop'); save(); paintStats(); }
      if (toy) {
        toy.x += toy.vx * dt; toy.y += toy.vy * dt; toy.life -= dt;
        if (toy.x < 12 || toy.x > TW - 12) toy.vx *= -1;
        if (toy.y < 12 || toy.y > TH - sandH - 12) toy.vy *= -1;
        if (Math.hypot(toy.x - fish.x, toy.y - fish.y) < 20) { toy.vx = (Math.random() - 0.5) * 300; toy.vy = -Math.abs(toy.vy) - 40; pet.happy = clamp(pet.happy + 4, 0, 100); paintStats(); }
        if (toy.life <= 0) { toy = null; save(); }
      }
      if (Math.random() < dt * (has('bubbler') ? 6 : 0.8)) bubbles.push({ x: has('bubbler') ? 480 + Math.random() * 6 : fish.x + fish.dir * 20, y: has('bubbler') ? TH - sandH : fish.y - 4, r: 1.5 + Math.random() * 3 });
      bubbles.forEach((b) => { b.y -= 50 * dt; b.x += Math.sin(t * 4 + b.r) * 8 * dt; });
      bubbles = bubbles.filter((b) => b.y > -10);
      sparkle = Math.max(0, sparkle - dt);
      draw();
    });
    function draw() {
      const bg = g.createLinearGradient(0, 0, 0, TH);
      bg.addColorStop(0, '#8fe0ff'); bg.addColorStop(1, '#1f86c8');
      g.fillStyle = bg; g.fillRect(0, 0, TW, TH);
      g.fillStyle = 'rgba(255,255,255,.08)';
      for (let i = 0; i < 4; i++) { const x = i * 150 + Math.sin(t * 0.4 + i) * 20; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x + 110, TH); g.lineTo(x + 60, TH); g.fill(); }
      g.fillStyle = '#ecd9a6'; g.beginPath(); g.moveTo(0, TH); for (let x = 0; x <= TW; x += 20) g.lineTo(x, TH - sandH + Math.sin(x * 0.04) * 4); g.lineTo(TW, TH); g.fill();
      g.lineCap = 'round';
      if (has('plant')) [60, 80, 96].forEach((x, i) => { g.strokeStyle = i % 2 ? '#2f9e3a' : '#4cc23a'; g.lineWidth = 6; g.beginPath(); g.moveTo(x, TH - sandH + 4); g.quadraticCurveTo(x + Math.sin(t + i) * 12, TH - 90, x + Math.sin(t * 1.3 + i) * 16, TH - 140 + i * 16); g.stroke(); });
      if (has('arch')) { g.fillStyle = '#8a8f9a'; g.beginPath(); g.moveTo(150, TH - sandH + 6); g.quadraticCurveTo(150, TH - 110, 200, TH - 110); g.quadraticCurveTo(250, TH - 110, 250, TH - sandH + 6); g.lineTo(230, TH - sandH + 6); g.quadraticCurveTo(230, TH - 86, 200, TH - 86); g.quadraticCurveTo(170, TH - 86, 170, TH - sandH + 6); g.fill(); }
      if (has('castle')) { g.fillStyle = '#b8a6d8'; g.fillRect(360, TH - 96, 60, 64); g.fillRect(350, TH - 116, 18, 84); g.fillRect(412, TH - 116, 18, 84); g.fillStyle = '#5a4a7a'; g.beginPath(); g.moveTo(380, TH - 32); g.lineTo(380, TH - 56); g.arc(390, TH - 56, 10, Math.PI, 0); g.lineTo(400, TH - 32); g.fill(); g.fillStyle = '#e04a7a'; g.beginPath(); g.moveTo(359, TH - 132); g.lineTo(359, TH - 118); g.lineTo(372, TH - 125); g.fill(); }
      if (has('chest')) { g.fillStyle = '#8a5a2a'; g.fillRect(270, TH - 58, 44, 28); g.fillStyle = '#a06c3a'; g.beginPath(); g.ellipse(292, TH - 58, 22, 10, 0, Math.PI, 0); g.fill(); g.fillStyle = '#ffd23a'; g.fillRect(288, TH - 54, 8, 8); if (Math.sin(t * 2) > 0.7) { g.fillStyle = 'rgba(255,240,150,.8)'; g.beginPath(); g.arc(300, TH - 66, 3, 0, Math.PI * 2); g.fill(); } }
      if (has('diver')) { g.fillStyle = '#c8a04a'; g.beginPath(); g.arc(470, TH - 82, 14, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9fd8ff'; g.beginPath(); g.arc(470, TH - 82, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = '#7a6a5a'; g.fillRect(460, TH - 68, 20, 30); }
      if (has('bubbler')) { g.fillStyle = '#9aa4ae'; g.beginPath(); g.ellipse(483, TH - sandH + 2, 12, 5, 0, 0, Math.PI * 2); g.fill(); }
      flakes.forEach((f) => { g.fillStyle = f.c; g.fillRect(f.x - 3, f.y - 2, 6, 4); });
      if (toy) { glossBall(g, toy.x, toy.y, 10, '#ffb3d9', '#e0457b', '#9a2a5a'); }
      bubbles.forEach((b) => bubbleRing(g, b.x, b.y, b.r, 0.9));
      if (sp.fins) { g.save(); g.globalAlpha = 0.6; g.fillStyle = '#5a5ae8'; g.beginPath(); g.moveTo(fish.x - fish.dir * 14, fish.y - 4); g.quadraticCurveTo(fish.x - fish.dir * 40, fish.y - 30 + Math.sin(t * 5) * 6, fish.x - fish.dir * 46, fish.y + 4); g.quadraticCurveTo(fish.x - fish.dir * 40, fish.y + 34 + Math.sin(t * 5) * 6, fish.x - fish.dir * 14, fish.y + 6); g.fill(); g.restore(); }
      sideFish(g, fish.x, fish.y, 1.15, fish.dir, sp.c1, sp.c2, t * (flakes.length ? 2 : 1));
      if (sp.stripes) { g.save(); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 4; [-4, 7].forEach((sx) => { g.beginPath(); g.moveTo(fish.x + fish.dir * sx * 1.15, fish.y - 11); g.quadraticCurveTo(fish.x + fish.dir * (sx + 3) * 1.15, fish.y, fish.x + fish.dir * sx * 1.15, fish.y + 11); g.stroke(); }); g.restore(); }
      const murk = (100 - pet.clean) / 100;
      if (murk > 0.05) { g.fillStyle = `rgba(90,120,40,${murk * 0.35})`; g.fillRect(0, 0, TW, TH); g.fillStyle = `rgba(60,80,30,${murk * 0.6})`; for (let i = 0; i < 40; i++) { const r = A.util.seeded(i + 3); g.fillRect(r() * TW, r() * TH, 2, 2); } }
      if (sparkle > 0) { g.fillStyle = `rgba(255,255,255,${sparkle * 0.5})`; g.fillRect(0, 0, TW, TH); for (let i = 0; i < 18; i++) { const r = A.util.seeded(i * 7 + Math.floor(t * 6)); g.fillStyle = '#fff'; const sx = r() * TW, sy = r() * TH; g.beginPath(); g.moveTo(sx, sy - 6); g.lineTo(sx + 2, sy); g.lineTo(sx, sy + 6); g.lineTo(sx - 2, sy); g.fill(); } }
    }
  }
  function fpLanding(ctx) {
    ctx.title('FishPals - Adopt a virtual fish!');
    const inner = `<div class="web-fp-hero">${K.img('avatars/avatar-fish', 'web-fp-heroimg')}<div><h1>Adopt a virtual fish!</h1><p>Name it, feed it, play with it and decorate its tank. Your fish remembers you (for months, not three seconds).</p><a class="web-fp-btn feed big" href="/adopt">Adopt a fish now</a></div></div>
      <div class="web-fp-three"><div>${K.img('icons/heart')}<b>Take care</b><span>Feed, play and clean to keep your fish happy.</span></div><div>${K.img('icons/cart')}<b>Earn FishBucks</b><span>Visit every day and spend them on decorations.</span></div><div>${K.img('icons/users')}<b>Show it off</b><span>Tell all your friends on MySpot about your fish.</span></div></div>`;
    ctx.html(fpFrame(ctx, inner));
  }
  function fpAdopt(ctx) {
    ctx.title('Adopt a fish - FishPals');
    let species = 'goldfish';
    const inner = `<h1 class="web-fp-h1">Adopt a fish</h1><form class="web-fp-adopt"><div class="web-fp-species">${Object.entries(FP_SPECIES).map(([id, sp]) => `<label class="web-fp-sp${id === species ? ' on' : ''}"><input type="radio" name="sp" value="${id}" ${id === species ? 'checked' : ''}><span class="web-fp-swatch" style="--c1:${sp.c1};--c2:${sp.c2}"></span>${sp.name}</label>`).join('')}</div>
      <label class="web-fp-name">Name your fish: <input name="n" type="text" maxlength="24" value="Mr. Bubbles"></label><button type="submit" class="web-fp-btn feed big">Adopt!</button></form>`;
    const root = ctx.html(fpFrame(ctx, inner));
    root.querySelectorAll('.web-fp-sp input').forEach((i) => i.addEventListener('change', () => { species = i.value; root.querySelectorAll('.web-fp-sp').forEach((l) => l.classList.toggle('on', l.contains(i))); }));
    root.querySelector('.web-fp-adopt').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = e.target.n.value.trim() || 'Mr. Bubbles';
      ctx.store.set('fishpals.pet', { name: name.slice(0, 24), species, born: Date.now(), hunger: 70, happy: 80, clean: 100, last: Date.now(), bucks: 20, decor: [], lastDaily: K.dayNumber() });
      ctx.sound('win');
      A.notify({ title: 'Welcome home, ' + name + '!', text: 'Your new fish is swimming in its tank at FishPals.', icon: 'icons/fish' });
      ctx.go('/');
    });
  }
  function fpShop(ctx) {
    const pet = fpLoad(ctx);
    ctx.title('FishPals Shop');
    if (!pet) { ctx.html(fpFrame(ctx, '<h1 class="web-fp-h1">FishPals Shop</h1><p>You need a fish before you can decorate a tank! <a href="/adopt">Adopt one now</a>.</p>')); return; }
    const inner = `<h1 class="web-fp-h1">FishPals Shop</h1><p class="web-fp-shopbucks">You have <b class="web-fp-bnum">${pet.bucks || 0}</b> FishBucks. Earn more by visiting every day and taking care of ${esc(pet.name)}.</p><div class="web-fp-shop">${FP_SHOP.map(([id, n, price, ic]) => `<div class="web-fp-item">${K.img(ic)}<b>${esc(n)}</b><span>${price} FishBucks</span>${(pet.decor || []).includes(id) ? '<em>In your tank!</em>' : `<button type="button" class="web-fp-btn clean" data-buy="${id}">Buy</button>`}</div>`).join('')}</div><p><a href="/">&laquo; Back to ${esc(pet.name)}'s tank</a></p>`;
    const root = ctx.html(fpFrame(ctx, inner));
    root.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
      const item = FP_SHOP.find((x) => x[0] === b.dataset.buy);
      const p = ctx.store.get('fishpals.pet', null);
      if (!p || !item) return;
      if ((p.bucks || 0) < item[2]) { ctx.dialog({ title: 'FishPals Shop', icon: 'icons/cart', instruction: 'Not enough FishBucks', message: 'You need ' + item[2] + ' FishBucks for the ' + item[1].toLowerCase() + '. Visit tomorrow for 10 more!' }); return; }
      p.bucks -= item[2];
      p.decor = (p.decor || []).concat([item[0]]);
      ctx.store.set('fishpals.pet', p);
      ctx.sound('coin');
      ctx.reload();
    }));
  }
  W.register({
    id: 'fishpals', host: 'www.fishpals.com', aliases: ['fishpals.com'],
    title: 'FishPals - Adopt a virtual fish!', shortTitle: 'FishPals', icon: 'icons/fish',
    favicon: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.3" fill="#8fe0ff" stroke="#1f86c8"/><path d="M3.5 8 C5 5 9 5 11 8 C9 11 5 11 3.5 8 Z" fill="#ff9a2e"/><path d="M11 8 L14 5.8 L14 10.2 Z" fill="#e0560f"/><circle cx="5.6" cy="7.4" r=".8" fill="#111"/></svg>',
    pages: [{ path: '/', title: 'FishPals - Adopt a virtual fish!', text: 'adopt a virtual fish pet goldfish betta guppy clownfish feed play clean tank FishBucks decorations shop' }, { path: '/adopt', title: 'Adopt a fish - FishPals', text: 'adopt name your fish goldfish betta guppy clownfish' }, { path: '/shop', title: 'FishPals Shop', text: 'shop decorations castle treasure chest diver plant rock arch bubble stone FishBucks' }],
    render(ctx) {
      const p = ctx.parts;
      if (!p.length || p[0] === 'tank') return fpTank(ctx);
      if (p[0] === 'adopt') return fpAdopt(ctx);
      if (p[0] === 'shop') return fpShop(ctx);
      return ctx.notFound();
    },
    css: `
.web-fp { min-height: 100%; background: #e8f9ff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Ccircle cx='20' cy='30' r='8' fill='none' stroke='%23bfeaff'/%3E%3Ccircle cx='90' cy='90' r='12' fill='none' stroke='%23c8eeff'/%3E%3Ccircle cx='80' cy='20' r='4' fill='none' stroke='%23bfeaff'/%3E%3C/svg%3E"); color: #1d3a56; font: calc(13px * var(--hz-text, 1))/1.45 "Trebuchet MS", "Comic Sans MS", Verdana, sans-serif; }
.web-fp a { color: #0a7fc2; }
.web-fp-wrap { width: 900px; margin: 0 auto; }
.web-fp-head { background: linear-gradient(to bottom, #6fd0f7, #1fa0d8); border-bottom: 3px solid #0a7fb8; }
.web-fp-headrow { display: flex; align-items: center; gap: 20px; height: 70px; }
.web-fp-logo { display: flex; align-items: center; gap: 6px; text-decoration: none !important; font: 900 2.2em "Arial Rounded MT Bold", "Trebuchet MS", sans-serif; color: #fff !important; text-shadow: 0 2px 0 #0a6a9a; }
.web-fp-logo b { color: #ffe34a; }
.web-fp-logoic { width: 52px; height: 52px; animation: web-fp-bob 2.5s ease-in-out infinite; }
@keyframes web-fp-bob { 50% { transform: translateY(-5px) rotate(-6deg); } }
.web-fp-tag { color: #eaffff; flex: 1; font-weight: 700; }
.web-fp-head nav a { margin-left: 8px; padding: 5px 12px; border-radius: 14px; color: #0a5a8a !important; font-weight: 700; text-decoration: none; background: linear-gradient(#fff, #d6f3ff); }
.web-fp-body { padding: 16px 0 24px; }
.web-fp-daily { display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 12px; border-radius: 10px; background: #fffbe0; border: 2px solid #f5c400; }
.web-fp-dailyic { width: 28px; height: 28px; }
.web-fp-tankrow { display: flex; gap: 18px; }
.web-fp-tankbox { padding: 12px; border-radius: 16px; background: #fff; border: 3px solid #8fd8f5; box-shadow: 0 6px 16px rgba(0,90,140,.15); }
.web-fp-tankhead { display: flex; align-items: baseline; gap: 12px; }
.web-fp-tankhead h1 { margin: 0 0 6px; color: #0a7fc2; font-size: 1.7em; }
.web-fp-tank { line-height: 0; border-radius: 10px; overflow: hidden; border: 6px solid #3a4a5a; box-shadow: inset 0 0 0 2px rgba(255,255,255,.5); }
.web-fp-mood { margin: 8px 0 0; font-weight: 700; color: #2a6a9a; }
.web-fp-panel { flex: 1; padding: 14px; border-radius: 16px; background: #fff; border: 3px solid #8fd8f5; }
.web-fp-stat { display: grid; grid-template-columns: 50px 1fr; align-items: center; gap: 8px; margin-bottom: 10px; font-weight: 700; }
.web-fp-bar { height: 16px; border-radius: 8px; background: #e3f2f9; border: 1px solid #9cc6da; overflow: hidden; }
.web-fp-bar i { display: block; height: 100%; border-radius: 8px; transition: width .4s; }
.web-fp-bar.food i { background: linear-gradient(#ffd6a0, #f08a12 50%, #d86a00 52%, #f5a030); }
.web-fp-bar.joy i { background: linear-gradient(#ffc2e0, #e0457b 50%, #c02a60 52%, #ea6a9a); }
.web-fp-bar.water i { background: linear-gradient(#bff4ff, #1fb4d8 50%, #0a8ab0 52%, #3ac4e4); }
.web-fp-bucks { display: flex; align-items: center; gap: 8px; margin: 12px 0; padding: 8px; border-radius: 10px; background: #f0fbff; }
.web-fp-bic { width: 32px; height: 32px; }
.web-fp-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.web-fp-btn { display: inline-block; padding: 8px 12px; border-radius: 20px; cursor: pointer; font: 700 1em "Trebuchet MS", sans-serif; text-decoration: none !important; color: #fff !important; text-shadow: 0 1px 1px rgba(0,0,0,.3); border: 1px solid rgba(0,0,0,.25); box-shadow: inset 0 1px 0 rgba(255,255,255,.6), 0 2px 4px rgba(0,60,100,.2); }
.web-fp-btn.feed { background: linear-gradient(#ffd6a0, #f08a12 50%, #d86a00 52%, #f5a030); }
.web-fp-btn.play { background: linear-gradient(#ffc2e0, #e0457b 50%, #c02a60 52%, #ea6a9a); }
.web-fp-btn.clean { background: linear-gradient(#bff4ff, #1fb4d8 50%, #0a8ab0 52%, #3ac4e4); }
.web-fp-btn.tap { background: linear-gradient(#e0e6ea, #8a98a6 50%, #6a7a88 52%, #9aa8b6); }
.web-fp-btn.big { font-size: 1.25em; padding: 10px 24px; }
.web-fp-btn:hover { filter: brightness(1.08); }
.web-fp-links { margin: 12px 0 0; font-size: .92em; }
.web-fp-hero { display: flex; gap: 24px; align-items: center; padding: 24px; border-radius: 18px; background: #fff; border: 3px solid #8fd8f5; }
.web-fp-heroimg { width: 150px; height: 150px; }
.web-fp-hero h1 { margin: 0 0 8px; color: #0a7fc2; font-size: 2.2em; }
.web-fp-three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px; }
.web-fp-three div { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding: 14px; border-radius: 14px; background: #fff; border: 2px solid #c8eefc; }
.web-fp-three img { width: 48px; height: 48px; }
.web-fp-h1 { color: #0a7fc2; font-size: 2em; margin: 0 0 12px; }
.web-fp-adopt { padding: 18px; border-radius: 16px; background: #fff; border: 3px solid #8fd8f5; }
.web-fp-species { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.web-fp-sp { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px; border-radius: 14px; border: 2px solid #c8eefc; cursor: pointer; font-weight: 700; }
.web-fp-sp.on { border-color: #1fa0d8; background: #e8f9ff; }
.web-fp-sp input { position: absolute; opacity: 0; pointer-events: none; }
.web-fp-swatch { width: 70px; height: 40px; border-radius: 50% 40% 40% 50%; background: linear-gradient(var(--c1), var(--c2)); box-shadow: inset 0 3px 6px rgba(255,255,255,.6); }
.web-fp-name { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; font-weight: 700; }
.web-fp-name input { font: inherit; padding: 6px 10px; border-radius: 8px; border: 2px solid #9cc6da; }
.web-fp-shop { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px; }
.web-fp-item { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 14px; border-radius: 14px; background: #fff; border: 2px solid #c8eefc; }
.web-fp-item img { width: 48px; height: 48px; }
.web-fp-item em { color: #2f9e2f; font-weight: 700; font-style: normal; }
.web-fp-foot { text-align: center; color: #6a8aa0; padding: 12px 0 20px; font-size: .9em; }
`,
  });

  // ================================================================ forums.aerofans.net
  const AF_USERS = {
    bubbleboy: { avatar: 'icons/bubble', rank: 'Glass Enthusiast', posts: 412, joined: 'Mar 2006', loc: 'Aerium City', sig: ['I LOVE SKY GLASS', '#74B8FC'] },
    limelight: { avatar: 'avatars/avatar-leaf', rank: 'Aero Veteran', posts: 1893, joined: 'Nov 2005', loc: 'Sunnyvale Heights', sig: ['LIME GLASS 4 LIFE', '#97D937'] },
    aqua_amy: { avatar: 'avatars/avatar-dolphin', rank: 'Bubble Master', posts: 977, joined: 'Jan 2006', loc: 'Crystal Bay', sig: ['~*~ sea glass ~*~', '#32CDCD'] },
    TwilightTim: { avatar: 'avatars/avatar-globe', rank: 'Moderator', posts: 5021, joined: 'Aug 2005', loc: 'Glass Harbor', sig: ['MODERATOR - be nice!', '#0046AD'], mod: true },
    frost_bite: { avatar: 'icons/snow', rank: 'Bubble Newbie', posts: 23, joined: 'Sep 2007', loc: 'Maple Falls', sig: ['frost = clean desktop', '#9aa8b6'] },
    kayla_xo: { avatar: 'avatars/avatar-flower', rank: 'Glass Enthusiast', posts: 301, joined: 'Feb 2007', loc: 'Sunnyvale Heights', sig: ['FUCHSIA IS A LIFESTYLE', '#FF0099'] },
    screensaver_sam: { avatar: 'icons/monitor', rank: 'Aero Veteran', posts: 2250, joined: 'Oct 2005', loc: 'Bubbleton', sig: ['bubbles screensaver fan club', '#1fb4d8'] },
    sunny_d: { avatar: 'avatars/avatar-sun', rank: 'Glass Enthusiast', posts: 188, joined: 'May 2007', loc: 'Seaside Heights', sig: ['SUN GLASS = HAPPY GLASS', '#FADC0E'] },
  };
  const AF_POLL = [['sky', 'Sky', 212], ['lime', 'Lime', 188], ['sea', 'Sea', 131], ['twilight', 'Twilight', 97], ['fuchsia', 'Fuchsia', 76], ['frost', 'Frost', 54], ['sun', 'Sun', 49]];
  const AF_TOPICS = {
    1: { forum: 'glass', title: "What's your favorite glass color?? (POLL)", views: 8211, poll: true, posts: [
      ['bubbleboy', 5 * D, "Ok everyone, the eternal question. What glass color do you use and WHY. I'll start: <b>Sky</b>. It's the default for a reason. It looks like the actual sky. Vote in the poll!!"],
      ['limelight', 5 * D - 3 * H, '<div class="web-af-quote"><b>bubbleboy wrote:</b><br>It\'s the default for a reason.</div>The reason is that people are afraid of change. <b>LIME</b>. Full intensity. Transparency on. You will never go back.'],
      ['aqua_amy', 4 * D, 'Sea glass over the underwater wallpaper is basically the best combo in the history of computers. I will not be taking questions.'],
      ['TwilightTim', 4 * D - 5 * H, 'Twilight at around 70% intensity, dark theme, aurora wallpaper. Very calm. <br><br><i>Reminder: be nice in this thread. Last time someone called Frost "boring" and it got out of hand.</i>'],
      ['frost_bite', 3 * D, 'Frost is not boring. Frost is <i>clean</i>. My desktop has three icons and they are perfectly aligned.'],
      ['kayla_xo', 2 * D, 'fuchsia!!!!!!! with glitter wallpaper. i took a quiz that said i was lime but i dont care. <a href="http://www.quizbubble.com/">take it here</a>'],
      ['screensaver_sam', D, 'Whatever color you pick, make sure the Bubbles screensaver is on. The glass color tints the bubbles. (It does not. But it feels like it does.)'],
      ['sunny_d', 9 * H, 'SUN. it makes everything feel like summer vacation. also it matches my notebook.'],
    ] },
    2: { forum: 'desktops', title: 'Post your desktop!!! (56k warning)', views: 12045, posts: [
      ['screensaver_sam', 6 * D, 'Show us your desktops! Here is mine: <br>[[imagery/aurora]]<br>Aurora wallpaper, Twilight glass, clock gadget. Classic.'],
      ['aqua_amy', 6 * D - 2 * H, 'Underwater all the way.<br>[[imagery/water]]'],
      ['limelight', 5 * D, 'meadow + lime glass = best combo<br>[[imagery/meadow]]'],
      ['bubbleboy', 3 * D, 'Mine is the fish tank one. The betta follows my mouse. His name is Captain Bubbles.'],
      ['frost_bite', D, '[[imagery/technozen]]<br>Three icons. Perfectly aligned. As promised.'],
    ] },
    3: { forum: 'web', title: 'Is Frutiger Aero coming back?', views: 3301, posts: [
      ['TwilightTim', 8 * D, 'Serious question. Everything is starting to look flat. Are glossy buttons and bubbles going away?'],
      ['limelight', 8 * D - 4 * H, 'Nothing lasts forever, but I think people will miss it. Gloss makes technology feel friendly. One day someone will build a whole pretend computer just to feel this way again.'],
      ['aqua_amy', 7 * D, 'There is an encyclopedia article about it now: <a href="http://www.aeropedia.org/wiki/Frutiger_Aero">Frutiger Aero on Aeropedia</a>. When you have an encyclopedia article, you are forever.'],
      ['screensaver_sam', 2 * D, 'As long as there are bubbles, there is hope.'],
    ] },
    4: { forum: 'glass', title: 'HELP my glass turned beige', views: 977, posts: [
      ['sunny_d', 2 * D, 'I opened my computer this morning and all my windows are BEIGE. What happened?? I did not change anything!!!'],
      ['TwilightTim', 2 * D - H, 'Did you ignore a chain e-mail? "Send this to 10 people or your glass turns beige"?'],
      ['sunny_d', 2 * D - 50 * 60000, '...maybe'],
      ['limelight', 2 * D - 40 * 60000, 'Right-click the desktop, Personalize, pick a new glass color. Also: chain e-mails are not real. The beige was probably the Taupe swatch.'],
      ['sunny_d', D, 'IT WORKED. back to sun glass. thank u all. i will never doubt the glass again'],
    ] },
  };
  const AF_FORUMS = [
    ['General', [['news', 'Announcements', 'Forum news and rules. Please read before posting!', []], ['chat', 'General Chat', 'Talk about anything. Be nice!', []]]],
    ['Glass & Themes', [['glass', 'Glass colors', 'Sky vs Lime vs everything else', [1, 4]], ['desktops', 'Wallpapers & Desktops', 'Show off your desktop', [2]]]],
    ['The Web', [['web', 'Web & Design', 'Glossy buttons, reflections, starbursts and more', [3]]]],
  ];
  const afStamp = (ms) => { const d = new Date(Date.now() - ms); return A.util.DAYS[d.getDay()].slice(0, 3) + ' ' + K.shortDate(d) + ' ' + A.util.fmtTime(d); };
  function afPostBody(html) { return html.replace(/\[\[([\w/-]+)\]\]/g, (m, k) => K.img(k, 'web-af-shot', 'desktop screenshot')); }
  function afFrame(ctx, crumbs, inner) {
    return `<div class="web-af"><div class="web-af-wrap"><div class="web-af-head"><a class="web-af-logo" href="http://forums.aerofans.net/">${K.img('icons/aerium', 'web-af-logoic')}<span>AeroFans<small>Community Forums</small></span></a><div class="web-af-user">Logged in as <b>${esc(ctx.user().name)}</b> | <a href="#" class="web-af-joke">Profile</a> | <a href="#" class="web-af-joke">Private messages (0)</a></div></div>
      <div class="web-af-crumbs"><a href="http://forums.aerofans.net/">AeroFans Forum Index</a>${crumbs}</div>${inner}
      <div class="web-af-online"><b>Who is online</b><br>In total there are <b>${3 + (K.dayNumber() % 5)}</b> users online :: 2 registered, 0 hidden and ${40 + (K.dayNumber() % 20)} guests<br>Most users ever online was 214 on Sat Mar 3, 2007</div>
      <div class="web-af-foot">Powered by BubbleBB &copy; 2007. Glossy theme by limelight.</div></div></div>`;
  }
  function afWire(ctx, root) { root.querySelectorAll('.web-af-joke').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); ctx.dialog({ title: 'AeroFans', icon: 'icons/chat', message: 'This part of the forum is being moved to a new server. Please do not double post.' }); })); }
  function afIndex(ctx) {
    ctx.title('AeroFans Community Forums - Index');
    const inner = AF_FORUMS.map(([cat, forums]) => `<table class="web-af-table web-af-idx"><colgroup><col><col style="width:12%"><col style="width:12%"><col style="width:26%"></colgroup><tr><th class="web-af-cat" colspan="4">${esc(cat)}</th></tr><tr class="web-af-sub"><td>Forum</td><td>Topics</td><td>Posts</td><td>Last post</td></tr>${forums.map(([id, name, desc, topics]) => {
      const posts = topics.reduce((n, t) => n + AF_TOPICS[t].posts.length + ctx.store.get('aerofans.replies.' + t, []).length, 0);
      const last = topics.length ? AF_TOPICS[topics[0]] : null;
      return `<tr><td class="web-af-forum"><div class="web-af-fwrap">${K.img(topics.length ? 'icons/chat' : 'icons/document', 'web-af-ficon')}<div><a href="/viewforum?f=${id}"><b>${esc(name)}</b></a><br><small>${esc(desc)}</small></div></div></td><td>${topics.length || (id === 'news' ? 1 : 0)}</td><td>${posts || (id === 'news' ? 1 : 0)}</td><td><small>${last ? `<a href="/viewtopic?t=${topics[0]}">${esc(last.title.slice(0, 26))}...</a><br>by ${esc(last.posts[last.posts.length - 1][0])}` : id === 'news' ? 'Forum rules<br>by TwilightTim' : 'No posts'}</small></td></tr>`;
    }).join('')}</table>`).join('');
    afWire(ctx, ctx.html(afFrame(ctx, '', inner)));
  }
  function afForum(ctx, id) {
    const f = AF_FORUMS.flatMap((c) => c[1]).find((x) => x[0] === id);
    if (!f) return ctx.notFound();
    ctx.title(f[1] + ' - AeroFans');
    const topics = f[3];
    const rows = id === 'news' ? '<tr><td><b>Forum rules: be nice, no double posting, glossy avatars only</b><br><small>by TwilightTim</small></td><td>0</td><td>4,410</td></tr>' : topics.map((t) => { const T = AF_TOPICS[t]; const n = T.posts.length + ctx.store.get('aerofans.replies.' + t, []).length; return `<tr><td>${T.poll ? '<span class="web-af-pollbadge">POLL</span> ' : ''}<a href="/viewtopic?t=${t}"><b>${esc(T.title)}</b></a><br><small>by ${esc(T.posts[0][0])}</small></td><td>${n - 1}</td><td>${K.num(T.views + n)}</td></tr>`; }).join('') || '<tr><td colspan="3">No topics yet. Be the first!</td></tr>';
    const inner = `<h2 class="web-af-h2">${esc(f[1])}</h2><table class="web-af-table"><tr class="web-af-sub"><td>Topic</td><td>Replies</td><td>Views</td></tr>${rows}</table>`;
    afWire(ctx, ctx.html(afFrame(ctx, ` &raquo; <a href="/viewforum?f=${id}">${esc(f[1])}</a>`, inner)));
  }
  function afTopic(ctx, t) {
    const T = AF_TOPICS[t];
    if (!T) return ctx.notFound();
    ctx.title(T.title + ' - AeroFans');
    const f = AF_FORUMS.flatMap((c) => c[1]).find((x) => x[0] === T.forum);
    const user = ctx.user();
    const replies = ctx.store.get('aerofans.replies.' + t, []);
    const posts = T.posts.map(([u, ms, body]) => ({ u, info: AF_USERS[u], when: afStamp(ms), body: afPostBody(body) }))
      .concat(replies.map((r) => ({ u: r.name, info: { avatar: r.avatar, rank: 'Bubble Newbie', posts: replies.length, joined: 'Today', loc: 'Aerium' }, when: afStamp(Date.now() - r.t), body: esc(r.text).replace(/\n/g, '<br>'), mine: true })));
    const vote = ctx.store.get('aerofans.poll', null);
    const pollHTML = T.poll ? (() => {
      const counts = AF_POLL.map(([id, n, c]) => [id, n, c + (vote === id ? 1 : 0)]);
      const total = counts.reduce((s, x) => s + x[2], 0);
      return `<div class="web-af-poll"><b>Poll: What is your favorite glass color?</b>${vote ? counts.map(([id, n, c]) => `<div class="web-af-prow"><span>${n}${vote === id ? ' (your vote)' : ''}</span><div class="web-af-pbar"><i style="width:${(c / total) * 100}%"></i></div><small>${Math.round((c / total) * 100)}% [ ${c} ]</small></div>`).join('') + `<div class="web-af-ptotal">Total votes: ${total}</div>` : `<form class="web-af-pform">${counts.map(([id, n]) => `<label><input type="radio" name="v" value="${id}"> ${n}</label>`).join('')}<button type="submit" class="web-af-btn">Submit vote</button></form>`}</div>`;
    })() : '';
    const inner = `<h2 class="web-af-h2">${esc(T.title)}</h2>${pollHTML}<table class="web-af-thread">${posts.map((p, i) => `<tr class="${i % 2 ? 'alt' : ''}" id="p${i}"><td class="web-af-author"><b>${esc(p.u)}</b><br><small>${esc(p.info.rank)}</small><br>${K.img(p.info.avatar, 'web-af-avatar')}<br><small>Joined: ${esc(p.info.joined)}<br>Posts: ${K.num(p.info.posts)}<br>Location: ${esc(p.info.loc)}</small></td><td class="web-af-post"><div class="web-af-ptop">Posted: ${esc(p.when)} <span>#${i + 1}</span></div><div class="web-af-pbody">${p.body}</div>${p.info.sig ? `<div class="web-af-sig"><span class="web-af-userbar" style="--c:${p.info.sig[1]}">${esc(p.info.sig[0])}</span></div>` : ''}</td></tr>`).join('')}</table>
      <form class="web-af-reply"><b>Quick reply</b><textarea maxlength="1000" placeholder="Write your reply. Be nice!" aria-label="Reply"></textarea><div><button type="submit" class="web-af-btn">Post reply</button> <span class="web-af-msg"></span></div></form>`;
    const root = ctx.html(afFrame(ctx, ` &raquo; <a href="/viewforum?f=${T.forum}">${esc(f ? f[1] : 'Forum')}</a>`, inner));
    afWire(ctx, root);
    const pf = root.querySelector('.web-af-pform');
    if (pf) pf.addEventListener('submit', (e) => { e.preventDefault(); const v = pf.querySelector('input:checked'); if (!v) return; ctx.store.set('aerofans.poll', v.value); ctx.sound('ding'); ctx.reload(); });
    root.querySelector('.web-af-reply').addEventListener('submit', (e) => {
      e.preventDefault();
      const ta = e.target.querySelector('textarea');
      const text = ta.value.trim();
      if (!text) { root.querySelector('.web-af-msg').textContent = 'Your message is empty.'; return; }
      const list = ctx.store.get('aerofans.replies.' + t, []);
      if (list.length && list[list.length - 1].text === text) { root.querySelector('.web-af-msg').textContent = 'Please do not double post!'; return; }
      list.push({ name: user.name, avatar: user.avatar, text: text.slice(0, 1000), t: Date.now() });
      ctx.store.set('aerofans.replies.' + t, list.slice(-30));
      ctx.sound('pop');
      ctx.reload();
    });
  }
  W.register({
    id: 'aerofans', host: 'forums.aerofans.net', aliases: ['aerofans.net', 'www.aerofans.net'],
    title: 'AeroFans Community Forums', shortTitle: 'AeroFans Forum', icon: 'icons/chat',
    favicon: '<svg viewBox="0 0 16 16"><path d="M2 2.5 H14 V10.5 H7 L4 13.5 V10.5 H2 Z" fill="#3aa6f5" stroke="#0b3d73" stroke-linejoin="round"/><path d="M2.5 3 H13.5 V6 H2.5 Z" fill="#fff" opacity=".45"/></svg>',
    pages: () => [{ path: '/', title: 'AeroFans Community Forums - Index', text: 'AeroFans forum community glass colors wallpapers desktops web design announcements general chat' }]
      .concat(Object.entries(AF_TOPICS).map(([t, T]) => ({ path: '/viewtopic?t=' + t, title: T.title + ' - AeroFans', text: T.posts.map((p) => p[2].replace(/<[^>]+>|\[\[[^\]]+\]\]/g, ' ')).join(' ') }))),
    render(ctx) {
      const p = ctx.parts;
      if (!p.length) return afIndex(ctx);
      if (p[0] === 'viewforum') return afForum(ctx, ctx.q('f'));
      if (p[0] === 'viewtopic') return afTopic(ctx, ctx.q('t'));
      return ctx.notFound();
    },
    css: `
.web-af { min-height: 100%; background: #dfe9f3; color: #1c2c3c; font: calc(12px * var(--hz-text, 1))/1.45 Verdana, Tahoma, sans-serif; padding: 12px 0 20px; }
.web-af a { color: #105289; }
.web-af-wrap { width: 900px; margin: 0 auto; }
.web-af-head { display: flex; justify-content: space-between; align-items: flex-end; padding: 12px 14px; border-radius: 10px 10px 0 0; background: linear-gradient(to bottom, #6fb8ef 0, #2f86d0 50%, #1f6fbf 51%, #3a8ee0 100%); color: #fff; }
.web-af-logo { display: flex; align-items: center; gap: 10px; color: #fff !important; text-decoration: none !important; font: 700 2em "Trebuchet MS", sans-serif; text-shadow: 0 2px 2px rgba(0,30,70,.5); }
.web-af-logo small { display: block; font-size: .42em; font-weight: 400; }
.web-af-logoic { width: 48px; height: 48px; }
.web-af-user { font-size: .92em; }
.web-af-user a { color: #fff; }
.web-af-crumbs { padding: 6px 10px; background: #f5f9fc; border: 1px solid #a6c2dc; border-top: 0; margin-bottom: 10px; font-weight: 700; }
.web-af-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; background: #fff; border: 1px solid #a6c2dc; }
.web-af-idx { table-layout: fixed; }
.web-af-idx td { overflow-wrap: anywhere; }
.web-af-table td { padding: 7px 8px; border-top: 1px solid #dbe6f0; vertical-align: middle; }
.web-af-cat { text-align: left; padding: 6px 10px; color: #fff; background: linear-gradient(#4a90d9, #1f5fa0); }
.web-af-sub td { background: #eaf2f9; font-weight: 700; color: #3a5a7a; font-size: .92em; }
.web-af-fwrap { display: flex; gap: 10px; align-items: center; }
.web-af-ficon { width: 32px; height: 32px; }
.web-af-h2 { color: #105289; margin: 4px 0 10px; font: 700 1.4em "Trebuchet MS", sans-serif; }
.web-af-pollbadge { padding: 0 4px; font-size: .8em; font-weight: 700; color: #fff; background: #e08a00; border-radius: 3px; }
.web-af-poll { padding: 10px 14px; margin-bottom: 12px; background: #fff; border: 1px solid #a6c2dc; border-radius: 6px; }
.web-af-prow { display: grid; grid-template-columns: 130px 1fr 110px; gap: 8px; align-items: center; margin: 5px 0; }
.web-af-pbar { height: 12px; background: #eef3f8; border: 1px solid #b8cfe3; }
.web-af-pbar i { display: block; height: 100%; background: linear-gradient(#bfe6ff, #3aa6f5 50%, #1f86d8 51%, #6ec2ff); }
.web-af-ptotal { margin-top: 6px; font-weight: 700; }
.web-af-pform { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.web-af-pform .web-af-btn { align-self: flex-start; margin-top: 4px; }
.web-af-btn { font: 700 1em Verdana, sans-serif; padding: 3px 12px; border: 1px solid #1f5fa0; border-radius: 3px; color: #fff; cursor: pointer; background: linear-gradient(#6fb8ef, #2f86d0 50%, #1f6fbf 51%, #3a8ee0); }
.web-af-thread { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #a6c2dc; }
.web-af-thread tr.alt { background: #f3f8fc; }
.web-af-thread td { vertical-align: top; border-top: 1px solid #c8dbec; padding: 8px 10px; }
.web-af-author { width: 150px; border-right: 1px solid #dbe6f0; font-size: .92em; color: #3a5a7a; }
.web-af-author b { color: #105289; font-size: 1.1em; }
.web-af-avatar { width: 80px; height: 80px; margin: 6px 0; }
.web-af-ptop { display: flex; justify-content: space-between; font-size: .88em; color: #6a8aa0; border-bottom: 1px dotted #c8dbec; padding-bottom: 4px; margin-bottom: 6px; }
.web-af-pbody { min-height: 50px; word-break: break-word; }
.web-af-quote { margin: 0 0 8px; padding: 6px 8px; background: #f0f5fa; border: 1px solid #b8cfe3; border-left: 4px solid #3aa6f5; font-size: .95em; }
.web-af-shot { display: block; max-width: 320px; height: 180px; object-fit: cover; margin: 6px 0; border: 1px solid #8aa; }
.web-af-sig { margin-top: 10px; padding-top: 6px; border-top: 1px dashed #c8dbec; }
.web-af-userbar { display: inline-block; width: 350px; height: 19px; padding-left: 10px; font: 900 11px/19px Verdana, sans-serif; letter-spacing: .06em; color: #fff; text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000; border: 1px solid #000; background: repeating-linear-gradient(135deg, rgba(255,255,255,.18) 0 2px, transparent 2px 4px), linear-gradient(to bottom, rgba(255,255,255,.55), rgba(255,255,255,0) 50%, rgba(0,0,0,.15) 51%), var(--c); }
.web-af-reply { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; padding: 10px; background: #fff; border: 1px solid #a6c2dc; }
.web-af-reply textarea { width: 100%; min-height: 70px; font: inherit; padding: 5px; border: 1px solid #8aa7c4; resize: vertical; }
.web-af-msg { color: #c8412a; font-weight: 700; }
.web-af-online { margin-top: 12px; padding: 8px 10px; background: #fff; border: 1px solid #a6c2dc; font-size: .92em; }
.web-af-foot { text-align: center; color: #6a8aa0; font-size: .85em; margin-top: 10px; }
`,
  });

  // ================================================================ www.quizbubble.com
  const QB_GLASS = {
    sky: ['Sky', '#74B8FC', 'Calm, clear and friendly. People feel relaxed around you, like a cloudless Saturday morning.'],
    lime: ['Lime', '#97D937', 'Bright, fresh and a little bit zesty. You bring energy to every room (and every desktop).'],
    sea: ['Sea', '#32CDCD', 'Cool, creative and deep. You love water, music and long walks on the beach.'],
    sun: ['Sun', '#FADC0E', 'Warm, cheerful and optimistic. Your friends call you when they need a pick-me-up.'],
    fuchsia: ['Fuchsia', '#FF0099', 'Bold, fun and totally unforgettable. Glitter was basically invented for you.'],
    twilight: ['Twilight', '#0046AD', 'Thoughtful and a little mysterious. You do your best thinking after 10pm.'],
    frost: ['Frost', '#E8EEF4', 'Clean, calm and minimal. Your desktop has exactly three icons and you like it that way.'],
    pumpkin: ['Pumpkin', '#FF9C00', 'Cozy, crafty and warm. You definitely have a favorite sweater.'],
  };
  const QB_QUIZ = [
    ['Pick a weekend plan', [['Picnic in the park', 'sky'], ['Beach day', 'sea'], ['Skate park', 'lime'], ['Stargazing', 'twilight']]],
    ['Pick a snack', [['Lemon sorbet', 'lime'], ['Pumpkin pie', 'pumpkin'], ['Cotton candy', 'fuchsia'], ['Mint tea', 'frost']]],
    ['Your dream pet', [['A goldfish named Sunny', 'sun'], ['A dolphin (obviously)', 'sea'], ['A snowy owl', 'frost'], ['A glitter unicorn', 'fuchsia']]],
    ['Pick a screensaver', [['Bubbles', 'sky'], ['Aurora', 'twilight'], ['Fireworks', 'sun'], ['3D tube maze', 'lime']]],
    ['Your favorite season', [['Summer', 'sun'], ['Autumn', 'pumpkin'], ['Winter', 'frost'], ['Spring', 'sky']]],
    ['How many icons are on your desktop?', [['Three, perfectly aligned', 'frost'], ['About twenty', 'sky'], ['I cannot see my wallpaper', 'fuchsia'], ['Only the Recycle Bin', 'twilight']]],
    ['Pick a profile song', [['Something cozy', 'pumpkin'], ['Something with a huge chorus', 'sun'], ['Something dreamy', 'sea'], ['Something with sparkles in it', 'fuchsia']]],
  ];
  const QB_2007 = [
    ['Do you have a Top 8?', ['Yes, and I rearrange it weekly', 'No']],
    ['Have you ever typed "brb" and then not come back?', ['Yes', 'Never']],
    ['Does your phone flip open?', ['Of course', 'No']],
    ['Have you signed a guestbook this year?', ['Yes!!!', 'What is a guestbook?']],
    ['Is your ringtone polyphonic?', ['Obviously', 'It just vibrates']],
  ];
  function qbFrame(inner) {
    return `<div class="web-qb"><div class="web-qb-head"><a class="web-qb-logo" href="http://www.quizbubble.com/"><span class="web-qb-q">?</span>Quiz<b>Bubble</b></a><span class="web-qb-tag">Find out who you REALLY are. One bubble at a time.</span></div><div class="web-qb-wrap">${inner}</div><div class="web-qb-foot">QuizBubble &copy; 2007. Results are 100% scientific*. <small>*not scientific</small></div></div>`;
  }
  function qbHome(ctx) {
    ctx.title('QuizBubble - Which Aerium glass color are you?');
    const last = ctx.store.get('quiz.last', null);
    const inner = `<div class="web-qb-feature"><div class="web-qb-orbs">${Object.values(QB_GLASS).map(([, hex]) => `<i style="--c:${hex}"></i>`).join('')}</div><h1>Which Aerium glass color are you?</h1><p>Seven questions. One glass color. Your whole personality, explained.</p>${last ? `<p class="web-qb-last">Last time you got <b>${esc(QB_GLASS[last][0])}</b>!</p>` : ''}<a class="web-qb-go" href="/quiz/glass">Take the quiz!</a></div>
      <div class="web-qb-more"><h2>More quizzes</h2><a href="/quiz/2007" class="web-qb-card"><b>How 2007 are you?</b><span>5 questions. Brutal honesty.</span></a><a href="#" class="web-qb-card web-qb-soon"><b>Which screensaver are you?</b><span>Coming soon!</span></a><a href="#" class="web-qb-card web-qb-soon"><b>What does your ringtone say about you?</b><span>Coming soon!</span></a></div>`;
    const root = ctx.html(qbFrame(inner));
    root.querySelectorAll('.web-qb-soon').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); ctx.dialog({ title: 'QuizBubble', icon: 'icons/help', message: 'This quiz is still being written. The writers are busy taking other quizzes.' }); }));
  }
  function qbQuiz(ctx, kind) {
    const glass = kind === 'glass';
    const Q = glass ? QB_QUIZ : QB_2007;
    ctx.title(glass ? 'Which Aerium glass color are you? - QuizBubble' : 'How 2007 are you? - QuizBubble');
    const answers = [];
    let i = 0;
    const root = ctx.html(qbFrame('<div class="web-qb-box"></div>'));
    const box = root.querySelector('.web-qb-box');
    const paint = () => {
      if (i >= Q.length) return result();
      const [q, opts] = Q[i];
      box.innerHTML = `<div class="web-qb-prog"><i style="width:${(i / Q.length) * 100}%"></i></div><div class="web-qb-num">Question ${i + 1} of ${Q.length}</div><h2 class="web-qb-question">${esc(q)}</h2><div class="web-qb-opts">${opts.map((o, j) => `<button type="button" data-j="${j}">${esc(Array.isArray(o) ? o[0] : o)}</button>`).join('')}</div>`;
      box.querySelectorAll('[data-j]').forEach((b) => b.addEventListener('click', () => { answers.push(Number(b.dataset.j)); i++; ctx.sound('click'); paint(); }));
    };
    const result = () => {
      if (glass) {
        const tally = {};
        answers.forEach((j, qi) => { const id = QB_QUIZ[qi][1][j][1]; tally[id] = (tally[id] || 0) + 1; });
        const id = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || 'sky';
        const [name, hex, desc] = QB_GLASS[id];
        ctx.store.set('quiz.last', id);
        const code = `<a href="http://www.quizbubble.com/"><b>I'm ${name} glass! Which Aerium glass color are you?</b></a>`;
        box.innerHTML = `<div class="web-qb-result"><span class="web-qb-orb" style="--c:${hex}"></span><h2>You are <b>${esc(name)}</b>!</h2><p class="web-qb-desc">${esc(desc)}</p><button type="button" class="web-qb-go web-qb-apply">Apply ${esc(name)} glass to my computer!</button><div class="web-qb-share"><b>Post it on your MySpot profile:</b><textarea readonly>${esc(code)}</textarea></div><p><a href="/quiz/glass">Retake the quiz</a> &middot; <a href="/">More quizzes</a></p></div>`;
        box.querySelector('textarea').addEventListener('focus', (e) => e.target.select());
        box.querySelector('.web-qb-apply').addEventListener('click', () => {
          if (A.theme && typeof A.theme.setGlass === 'function') {
            try { A.theme.setGlass({ color: id }); } catch (e) { /* ignore */ }
            A.notify({ title: 'Your glass is now ' + name + '!', text: 'Change it back any time: right-click the desktop and choose Personalize.', icon: 'icons/personalize' });
          } else ctx.dialog({ title: 'QuizBubble', icon: 'icons/personalize', message: 'Right-click the desktop and choose Personalize to pick ' + name + ' glass.' });
        });
      } else {
        const score = Math.round((answers.filter((j) => j === 0).length / Q.length) * 100);
        const verdict = score >= 80 ? 'You still have a flip phone, a Top 8 and a guestbook. Never change.' : score >= 40 ? 'You are partly 2007. You probably still say "brb".' : 'You are extremely not 2007. Have you tried a glossy button? It might help.';
        box.innerHTML = `<div class="web-qb-result"><div class="web-qb-pct">${score}%</div><h2>You are ${score}% 2007!</h2><p class="web-qb-desc">${esc(verdict)}</p><p><a href="/quiz/2007">Retake</a> &middot; <a href="/quiz/glass">Which glass color are you?</a></p></div>`;
      }
      ctx.sound('win');
    };
    paint();
  }
  W.register({
    id: 'quizbubble', host: 'www.quizbubble.com', aliases: ['quizbubble.com'],
    title: 'QuizBubble', shortTitle: 'QuizBubble', icon: 'icons/help',
    favicon: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.2" fill="#e0457b" stroke="#8a1a4a"/><text x="8" y="11.8" font-family="Arial" font-weight="bold" font-size="10" text-anchor="middle" fill="#fff">?</text><ellipse cx="8" cy="4.4" rx="4.6" ry="2.2" fill="#fff" opacity=".45"/></svg>',
    pages: [{ path: '/', title: 'QuizBubble - Which Aerium glass color are you?', text: 'quiz which Aerium glass color are you personality test sky lime sea sun fuchsia twilight frost pumpkin how 2007 are you' }, { path: '/quiz/glass', title: 'Which Aerium glass color are you? - QuizBubble', text: 'glass color quiz seven questions weekend plan snack dream pet screensaver season desktop icons profile song' }, { path: '/quiz/2007', title: 'How 2007 are you? - QuizBubble', text: 'how 2007 are you quiz top 8 brb flip phone guestbook polyphonic ringtone' }],
    render(ctx) {
      const p = ctx.parts;
      if (!p.length) return qbHome(ctx);
      if (p[0] === 'quiz' && (p[1] === 'glass' || p[1] === '2007')) return qbQuiz(ctx, p[1]);
      return ctx.notFound();
    },
    css: `
.web-qb { min-height: 100%; background: linear-gradient(to bottom, #ffe3f1, #fff 320px); color: #3a2a3a; font: calc(14px * var(--hz-text, 1))/1.45 "Trebuchet MS", Verdana, sans-serif; }
.web-qb a { color: #c02a70; }
.web-qb-head { display: flex; align-items: center; gap: 20px; padding: 14px 30px; background: linear-gradient(to bottom, #ff8ac2 0, #e0457b 50%, #c8306a 51%, #e8588e 100%); border-bottom: 3px solid #a0205a; }
.web-qb-logo { display: flex; align-items: center; gap: 8px; color: #fff !important; text-decoration: none !important; font: 900 1.8em "Arial Rounded MT Bold", "Trebuchet MS", sans-serif; text-shadow: 0 2px 0 #8a1a4a; }
.web-qb-logo b { color: #fff3a8; }
.web-qb-q { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(circle at 40% 30%, #fff, #ffd6e8 40%, #ff8ac2); color: #c02a70; text-shadow: none; box-shadow: inset 0 -3px 6px rgba(255,255,255,.6); }
.web-qb-tag { color: #fff; font-style: italic; }
.web-qb-wrap { max-width: 760px; margin: 0 auto; padding: 24px 16px; }
.web-qb-feature { text-align: center; padding: 28px; border-radius: 20px; background: #fff; border: 3px solid #ffc2e0; box-shadow: 0 8px 22px rgba(200,40,110,.15); }
.web-qb-feature h1 { font: 900 2em "Arial Rounded MT Bold", "Trebuchet MS", sans-serif; color: #c02a70; margin: 12px 0 6px; }
.web-qb-orbs { display: flex; justify-content: center; gap: 8px; }
.web-qb-orbs i, .web-qb-orb { display: inline-block; width: 34px; height: 34px; border-radius: 50%; background: radial-gradient(circle at 50% 115%, #fff, var(--c) 45%, color-mix(in srgb, var(--c) 70%, #000) 100%); border: 1px solid rgba(0,0,0,.25); box-shadow: inset 0 -4px 8px rgba(255,255,255,.5), 0 3px 6px rgba(0,0,0,.2); position: relative; }
.web-qb-orbs i::before, .web-qb-orb::before { content: ""; position: absolute; left: 16%; right: 16%; top: 5%; height: 45%; border-radius: 50%; background: linear-gradient(rgba(255,255,255,.95), rgba(255,255,255,.15)); }
.web-qb-orbs i:nth-child(odd) { animation: web-qb-bob 2.4s ease-in-out infinite; }
.web-qb-orbs i:nth-child(even) { animation: web-qb-bob 2.4s ease-in-out -1.2s infinite; }
@keyframes web-qb-bob { 50% { transform: translateY(-6px); } }
.web-qb-last { color: #6a4a6a; }
.web-qb-go { display: inline-block; margin-top: 10px; padding: 12px 30px; border-radius: 28px; font: 900 1.2em "Arial Rounded MT Bold", "Trebuchet MS", sans-serif; color: #fff !important; text-decoration: none !important; cursor: pointer; border: 1px solid #a0205a; background: linear-gradient(to bottom, #ffc2e0 0, #ff6aa8 48%, #e0457b 52%, #ff7ab8 100%); box-shadow: inset 0 1px 0 #fff, 0 4px 10px rgba(200,40,110,.3); text-shadow: 0 1px 1px rgba(120,0,50,.5); }
.web-qb-go:hover { filter: brightness(1.07); }
.web-qb-more { margin-top: 24px; }
.web-qb-more h2 { color: #c02a70; }
.web-qb-card { display: flex; flex-direction: column; padding: 12px 16px; margin-bottom: 10px; border-radius: 14px; background: #fff; border: 2px solid #ffd6e8; text-decoration: none !important; color: #3a2a3a !important; }
.web-qb-card:hover { border-color: #ff8ac2; }
.web-qb-card b { color: #c02a70; }
.web-qb-box { padding: 26px; border-radius: 20px; background: #fff; border: 3px solid #ffc2e0; box-shadow: 0 8px 22px rgba(200,40,110,.12); }
.web-qb-prog { height: 12px; border-radius: 6px; background: #ffe3f1; overflow: hidden; }
.web-qb-prog i { display: block; height: 100%; background: linear-gradient(#ffc2e0, #e0457b); transition: width .3s; }
.web-qb-num { margin-top: 10px; color: #9a6a8a; font-weight: 700; }
.web-qb-question { font: 900 1.6em "Arial Rounded MT Bold", "Trebuchet MS", sans-serif; color: #3a2a3a; margin: 6px 0 16px; }
.web-qb-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.web-qb-opts button { padding: 14px; border-radius: 16px; cursor: pointer; font: 700 1.05em "Trebuchet MS", sans-serif; color: #3a2a3a; border: 2px solid #ffc2e0; background: linear-gradient(to bottom, #fff 0, #fff5fa 50%, #ffe3f1 51%, #fff 100%); box-shadow: inset 0 1px 0 #fff, 0 2px 4px rgba(200,40,110,.1); }
.web-qb-opts button:hover { border-color: #e0457b; box-shadow: 0 0 10px rgba(224,69,123,.35); }
.web-qb-result { text-align: center; }
.web-qb-orb { width: 110px; height: 110px; }
.web-qb-result h2 { font: 900 2em "Arial Rounded MT Bold", "Trebuchet MS", sans-serif; margin: 12px 0 4px; }
.web-qb-result h2 b { color: #c02a70; }
.web-qb-desc { font-size: 1.15em; color: #5a4a5a; }
.web-qb-share { margin: 18px auto 8px; max-width: 520px; text-align: left; }
.web-qb-share textarea { width: 100%; height: 56px; font: 12px Consolas, monospace; margin-top: 4px; }
.web-qb-pct { font: 900 4em "Arial Rounded MT Bold", sans-serif; color: #e0457b; }
.web-qb-foot { text-align: center; color: #9a6a8a; padding: 10px 0 20px; font-size: .9em; }
`,
  });

  // ================================================================ www.ringtonez4u.com
  const RT_TONES = [
    ['crazy', 'Crazy Bubble', 'Polyphonic', (dest, t) => { const n = ['C6', 'E6', 'G6', 'E6', 'C6', 'G5', 'A5', 'C6']; for (let r = 0; r < 2; r++) n.forEach((x, i) => A.sound.blip(x, x, t + (r * 8 + i) * 0.11, { dur: 0.09, vel: 0.06, type: 'square', dest, rev: 0.05, glide: 0.001 })); }],
    ['sunrise', 'Polyphonic Sunrise', 'Polyphonic', (dest, t) => { ['C5', 'E5', 'G5', 'B5', 'D6', 'B5', 'G5', 'E5', 'F5', 'A5', 'C6', 'E6'].forEach((x, i) => A.sound.bell(x, t + i * 0.2, { vel: 0.06, dur: 0.9, dest })); }],
    ['classic', 'Classic Phone Ring', 'Realtone', (dest, t) => { for (let r = 0; r < 2; r++) for (let i = 0; i < 16; i++) { A.sound.blip(440, 440, t + r * 1.3 + i * 0.05, { dur: 0.045, vel: 0.05, type: 'sine', dest, rev: 0, glide: 0.001 }); A.sound.blip(480, 480, t + r * 1.3 + i * 0.05, { dur: 0.045, vel: 0.05, type: 'sine', dest, rev: 0, glide: 0.001 }); } }],
    ['dolphin', 'Dolphin Chirp', 'Nature', (dest, t) => { for (let i = 0; i < 6; i++) A.sound.blip(1200 + (i % 3) * 300, 2600 + (i % 2) * 600, t + i * 0.3, { dur: 0.18, vel: 0.05, type: 'sine', dest, glide: 0.15 }); }],
    ['aquabeat', 'Aqua Beat', 'Polyphonic', (dest, t) => { for (let i = 0; i < 16; i++) { if (i % 4 === 0) A.sound.blip(110, 55, t + i * 0.14, { dur: 0.2, vel: 0.12, type: 'sine', dest, glide: 0.12 }); if (i % 2 === 1) A.sound.noise(t + i * 0.14, { dur: 0.03, vel: 0.05, type: 'highpass', f1: 6000, dest }); if (i % 4 === 2) A.sound.pluck(['A4', 'C5', 'E5', 'G5'][(i / 4) | 0], t + i * 0.14, { vel: 0.08, dest }); } }],
    ['mono', 'Old School Mono', 'Monophonic', (dest, t) => { ['E5', 'D5', 'F#4', 'G#4', 'C#5', 'B4', 'D4', 'E4', 'B4', 'A4', 'C#4', 'E4', 'A4'].forEach((x, i) => A.sound.blip(x, x, t + i * 0.15, { dur: 0.13, vel: 0.05, type: 'square', dest, rev: 0, glide: 0.001 })); }],
    ['glassharp', 'Glass Harp', 'Polyphonic', (dest, t) => { ['G5', 'D6', 'B5', 'G6', 'E6', 'C6', 'A5', 'F#6'].forEach((x, i) => A.sound.bell(x, t + i * 0.26, { vel: 0.05, dur: 1.6, ratio: 2.01, index: 1.2, dest })); }],
  ];
  function rtHome(ctx) {
    ctx.title('Ringtonez4U - The hottest ringtones!!!');
    const inner = `<div class="web-rt"><div class="web-rt-head"><span class="web-rt-logo">Ringtonez<b>4U</b></span><span class="web-rt-tag">The HOTTEST ringtones for your phone!!! ${K.burst('Poly-<br>phonic!', { size: 60, font: 10, c1: '#e8ff9a', c2: '#39ff14', rim: '#1a8a00', color: '#1a3a00', spin: true })}</span></div>
      <div class="web-rt-body"><div class="web-rt-phone"><div class="web-rt-screen"><b class="web-rt-now">Ringtonez4U</b><span class="web-rt-sub">Pick a tone!</span></div><div class="web-rt-keys">${'123456789*0#'.split('').map((k) => `<i>${k}</i>`).join('')}</div></div>
        <div class="web-rt-list"><h2>TOP 7 THIS WEEK</h2>${RT_TONES.map(([id, name, kind], i) => `<div class="web-rt-item"><span class="web-rt-rank">${i + 1}</span><div class="web-rt-info"><b>${esc(name)}</b><small>${kind}${i < 2 ? ' <span class="web-rt-hot wk-blink">HOT!</span>' : ''}</small></div><button type="button" class="web-rt-play" data-tone="${id}">Preview</button><button type="button" class="web-rt-send" data-send="${esc(name)}">Send to phone</button></div>`).join('')}
        <p class="web-rt-fine">Text TONE to 55-555 for unlimited ringtones!!! $2.99/week*<br>*Just kidding. Everything here is free and pretend, and there is no number to text.</p></div></div></div>`;
    const root = ctx.html(inner);
    const phone = root.querySelector('.web-rt-phone'), now = root.querySelector('.web-rt-now'), sub = root.querySelector('.web-rt-sub');
    root.querySelectorAll('[data-tone]').forEach((b) => b.addEventListener('click', () => {
      const tone = RT_TONES.find((x) => x[0] === b.dataset.tone);
      const dest = ctx.audio();
      now.textContent = tone[1];
      sub.textContent = 'Incoming call...';
      phone.classList.remove('ringing'); void phone.offsetWidth; phone.classList.add('ringing');
      ctx.after(2600, () => { phone.classList.remove('ringing'); sub.textContent = 'Missed call (1)'; });
      if (!A.sound.ctx || !dest) { ctx.dialog({ title: 'Ringtonez4U', icon: 'icons/phone', message: 'Turn on "Play sounds in webpages" in Internet Options to preview ringtones.' }); return; }
      dest.gain.value = 0.8;
      tone[3](dest, A.sound.ctx.currentTime + 0.05);
    }));
    root.querySelectorAll('[data-send]').forEach((b) => b.addEventListener('click', () => ctx.dialog({ title: 'Ringtonez4U', icon: 'icons/phone', instruction: '"' + b.dataset.send + '" is on its way!', message: 'Hold your phone up to the screen and wiggle it gently. (Nothing was sent anywhere. This is a pretend store, and your phone is safe.)' })));
  }
  W.register({
    id: 'ringtonez4u', host: 'www.ringtonez4u.com', aliases: ['ringtonez4u.com'],
    title: 'Ringtonez4U', shortTitle: 'Ringtonez4U', icon: 'icons/phone', weight: 1.3,
    shady: 'This website promises unlimited ringtones for $2.99 a week. It is pretend, so you will never be charged, but that is exactly the kind of offer to be careful about.',
    favicon: '<svg viewBox="0 0 16 16"><rect x="4" y="1" width="8" height="14" rx="2" fill="#39ff14" stroke="#1a6a00"/><rect x="5.3" y="2.6" width="5.4" height="5" fill="#0a1a00"/><circle cx="8" cy="11.5" r="1.4" fill="#1a6a00"/></svg>',
    pages: [{ path: '/', title: 'Ringtonez4U - The hottest ringtones!!!', text: 'ringtones polyphonic monophonic realtone crazy bubble polyphonic sunrise classic phone ring dolphin chirp aqua beat old school mono glass harp send to phone' }],
    render(ctx) { if (ctx.parts.length) return ctx.notFound(); return rtHome(ctx); },
    css: `
.web-rt { min-height: 100%; background: radial-gradient(circle at 20% 10%, #5a0a8a, transparent 50%), radial-gradient(circle at 90% 80%, #0a4a8a, transparent 45%), #12001f; color: #f0e6ff; font: calc(13px * var(--hz-text, 1))/1.4 Verdana, Arial, sans-serif; }
.web-rt-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 30px; border-bottom: 2px solid #39ff14; box-shadow: 0 0 18px rgba(57,255,20,.35); }
.web-rt-logo { font: 900 2.4em Impact, "Arial Black", sans-serif; color: #fff; text-shadow: 0 0 10px #ff2fd8, 0 0 22px #ff2fd8; }
.web-rt-logo b { color: #39ff14; text-shadow: 0 0 10px #39ff14; }
.web-rt-tag { display: flex; align-items: center; gap: 14px; font-weight: 700; color: #ffe34a; }
.web-rt-body { display: flex; gap: 30px; max-width: 900px; margin: 0 auto; padding: 24px 16px; }
.web-rt-phone { flex: none; width: 150px; height: 300px; padding: 16px 14px; border-radius: 26px; background: linear-gradient(135deg, #d8dce2, #7a8490); border: 2px solid #333; box-shadow: inset 0 2px 4px rgba(255,255,255,.8), 0 10px 26px rgba(0,0,0,.6); }
.web-rt-phone.ringing { animation: web-rt-ring .12s linear 20; }
@keyframes web-rt-ring { 25% { transform: rotate(-4deg) translateX(-2px); } 75% { transform: rotate(4deg) translateX(2px); } }
.web-rt-screen { height: 110px; border-radius: 6px; padding: 10px 8px; display: flex; flex-direction: column; justify-content: center; text-align: center; color: #0a2a00; background: linear-gradient(#c8ffb8, #8fe07a); border: 2px solid #333; box-shadow: inset 0 2px 6px rgba(0,0,0,.35); font: 700 12px "Courier New", monospace; }
.web-rt-sub { font-weight: 400; margin-top: 6px; }
.web-rt-keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 14px; }
.web-rt-keys i { display: grid; place-items: center; height: 26px; border-radius: 8px; font: 700 12px Arial, sans-serif; font-style: normal; color: #222; background: linear-gradient(#fff, #c8ccd2); border: 1px solid #666; }
.web-rt-list { flex: 1; }
.web-rt-list h2 { margin: 0 0 12px; font: 900 1.6em Impact, sans-serif; color: #39ff14; letter-spacing: .05em; }
.web-rt-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 8px; border-radius: 10px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,47,216,.4); }
.web-rt-rank { width: 30px; font: 900 1.6em Impact, sans-serif; color: #ff2fd8; text-align: center; }
.web-rt-info { flex: 1; display: flex; flex-direction: column; }
.web-rt-info small { color: #b8a6d8; }
.web-rt-hot { color: #12001f; background: #ffe34a; padding: 0 4px; font-weight: 900; }
.web-rt-play, .web-rt-send { font: 700 .95em Verdana, sans-serif; padding: 5px 10px; border-radius: 14px; cursor: pointer; border: 1px solid #1a6a00; color: #0a2a00; background: linear-gradient(#e8ffc8, #39ff14 50%, #2ad800 51%, #7aff5a); }
.web-rt-send { color: #fff; border-color: #8a0a7a; background: linear-gradient(#ffb3f0, #ff2fd8 50%, #d800b0 51%, #ff6ae4); }
.web-rt-play:hover, .web-rt-send:hover { filter: brightness(1.1); }
.web-rt-fine { color: #9a8ab8; font-size: .85em; }
`,
  });

  // ================================================================ www.bubblecards.com
  const BC_CARDS = {
    birthday: ['Happy Birthday!', 'bday'], thanks: ['Thank You!', 'thanks'], fish: ['You are swimmingly awesome', 'fish'],
    getwell: ['Get well soon!', 'sun'], congrats: ['Congratulations!', 'party'], missyou: ['Miss you!', 'aurora'],
  };
  const bcScene = (id) => {
    const [text, kind] = BC_CARDS[id] || BC_CARDS.birthday;
    const bits = kind === 'bday' ? '<i></i><i></i><i></i><i></i><i></i><i></i>' : kind === 'fish' ? `${K.img('icons/fish', 'bc-f1')}${K.img('icons/fish', 'bc-f2')}` : kind === 'thanks' ? `${K.img('icons/flower', 'bc-flower')}` : kind === 'sun' ? `${K.img('icons/sun', 'bc-sunimg')}` : kind === 'party' ? '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>' : '<i></i><i></i>';
    return `<div class="web-bc-card bc-${kind}"><div class="web-bc-bits">${bits}</div><div class="web-bc-text">${esc(text)}</div></div>`;
  };
  function bcEncode(o) { try { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); } catch (e) { return ''; } }
  function bcDecode(s) { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch (e) { return null; } }
  function bcFrame(inner) { return `<div class="web-bc"><div class="web-bc-head"><a class="web-bc-logo" href="http://www.bubblecards.com/">${K.img('icons/mail', 'web-bc-logoic')}Bubble<b>Cards</b></a><span>Free e-cards for every occasion!</span></div><div class="web-bc-wrap">${inner}</div><div class="web-bc-foot">BubbleCards &copy; 2007. Spread the joy. Recycle your bubbles.</div></div>`; }
  function bcHome(ctx) {
    ctx.title('BubbleCards - Free e-cards!');
    const inner = `<h1 class="web-bc-h1">Pick a card</h1><div class="web-bc-grid">${Object.keys(BC_CARDS).map((id) => `<a href="/create?c=${id}" class="web-bc-pick">${bcScene(id)}<b>${esc(BC_CARDS[id][0])}</b></a>`).join('')}</div>`;
    ctx.html(bcFrame(inner));
  }
  function bcCreate(ctx) {
    const id = BC_CARDS[ctx.q('c')] ? ctx.q('c') : 'birthday';
    ctx.title('Send a card - BubbleCards');
    const user = ctx.user();
    const inner = `<h1 class="web-bc-h1">Personalize your card</h1><div class="web-bc-create"><div class="web-bc-preview">${bcScene(id)}<p class="web-bc-msgprev"></p></div><form class="web-bc-form"><label>To: <input name="to" type="text" maxlength="30" placeholder="Their name"></label><label>From: <input name="from" type="text" maxlength="30" value="${esc(user.name)}"></label><label>Message:<textarea name="msg" maxlength="240" placeholder="Write something nice!"></textarea></label><button type="submit" class="web-bc-btn">Send e-card</button><p class="web-bc-err"></p></form></div>`;
    const root = ctx.html(bcFrame(inner));
    const f = root.querySelector('.web-bc-form'), prev = root.querySelector('.web-bc-msgprev');
    const upd = () => { prev.textContent = (f.to.value ? 'Dear ' + f.to.value + ', ' : '') + f.msg.value + (f.from.value ? ' - ' + f.from.value : ''); };
    f.addEventListener('input', upd);
    upd();
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.to.value.trim() || !f.msg.value.trim()) { root.querySelector('.web-bc-err').textContent = 'Please add a name and a message!'; return; }
      const d = bcEncode({ c: id, to: f.to.value.trim().slice(0, 30), from: f.from.value.trim().slice(0, 30), msg: f.msg.value.trim().slice(0, 240) });
      ctx.sound('whooshIn');
      ctx.go('/sent?d=' + encodeURIComponent(d));
    });
  }
  function bcSent(ctx) {
    const o = bcDecode(ctx.q('d'));
    if (!o) return ctx.notFound();
    ctx.title('Card sent! - BubbleCards');
    const inner = `<div class="web-bc-sent"><h1 class="web-bc-h1">Your e-card to ${esc(o.to)} is on its way!</h1><div class="web-bc-plane">${K.img('icons/mail', 'web-bc-planeic')}</div><p>They can pick it up here:</p><p><a href="/view?d=${encodeURIComponent(ctx.q('d'))}">http://www.bubblecards.com/view?card=${esc(ctx.q('d').slice(0, 12))}...</a></p><p><a href="/" class="web-bc-btn">Send another card</a></p></div>`;
    ctx.html(bcFrame(inner));
    ctx.after(3500, () => A.notify.toast({ title: o.to + ' opened your e-card!', text: '"aww thank you!! that made my day"', app: 'BubbleCards', appIcon: 'icons/mail' }));
  }
  function bcView(ctx) {
    const o = bcDecode(ctx.q('d'));
    if (!o || !BC_CARDS[o.c]) return ctx.notFound();
    ctx.title('You have an e-card from ' + o.from + '!');
    const inner = `<div class="web-bc-view"><p class="web-bc-from">${esc(o.from)} sent you an e-card!</p>${bcScene(o.c)}<div class="web-bc-letter"><p>Dear ${esc(o.to)},</p><p>${esc(o.msg)}</p><p class="web-bc-sign">- ${esc(o.from)}</p></div><p><a href="/create?c=${o.c}" class="web-bc-btn">Send a card back</a></p></div>`;
    ctx.html(bcFrame(inner));
  }
  W.register({
    id: 'bubblecards', host: 'www.bubblecards.com', aliases: ['bubblecards.com'],
    title: 'BubbleCards - Free e-cards!', shortTitle: 'BubbleCards', icon: 'icons/mail',
    favicon: '<svg viewBox="0 0 16 16"><rect x="1" y="3.5" width="14" height="9.5" rx="1.5" fill="#fff" stroke="#e0457b"/><path d="M1.5 4 L8 9 L14.5 4" fill="none" stroke="#e0457b" stroke-width="1.3"/><circle cx="12.5" cy="3.5" r="2.5" fill="#7fd0ff" stroke="#1a8fe0" stroke-width=".7"/></svg>',
    pages: [{ path: '/', title: 'BubbleCards - Free e-cards!', text: 'free e-cards birthday thank you get well soon congratulations miss you just because send a card greeting cards' }],
    render(ctx) {
      const p = ctx.parts;
      if (!p.length) return bcHome(ctx);
      if (p[0] === 'create') return bcCreate(ctx);
      if (p[0] === 'sent') return bcSent(ctx);
      if (p[0] === 'view') return bcView(ctx);
      return ctx.notFound();
    },
    css: `
.web-bc { min-height: 100%; background: #fff8e8; color: #4a3a2a; font: calc(14px * var(--hz-text, 1))/1.45 Georgia, "Times New Roman", serif; }
.web-bc a { color: #c0507a; }
.web-bc-head { display: flex; align-items: center; gap: 18px; padding: 14px 30px; background: linear-gradient(to bottom, #fff 0, #ffe9f2 100%); border-bottom: 2px dashed #e0457b; }
.web-bc-logo { display: flex; align-items: center; gap: 8px; font: italic 700 2em Georgia, serif; color: #e0457b !important; text-decoration: none !important; }
.web-bc-logo b { color: #1a8fe0; }
.web-bc-logoic { width: 44px; height: 44px; }
.web-bc-wrap { max-width: 880px; margin: 0 auto; padding: 22px 16px; }
.web-bc-h1 { font: italic 700 1.9em Georgia, serif; color: #c0507a; margin: 0 0 14px; }
.web-bc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.web-bc-pick { display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none !important; color: #4a3a2a !important; }
.web-bc-pick:hover .web-bc-card { transform: translateY(-4px) rotate(-1deg); box-shadow: 0 10px 20px rgba(120,60,40,.3); }
.web-bc-card { position: relative; width: 100%; max-width: 260px; aspect-ratio: 4 / 3; border-radius: 10px; overflow: hidden; border: 4px solid #fff; box-shadow: 0 4px 12px rgba(120,60,40,.2); transition: transform .2s, box-shadow .2s; }
.web-bc-bits { position: absolute; inset: 0; }
.web-bc-text { position: absolute; left: 0; right: 0; bottom: 12px; text-align: center; font: italic 700 1.3em Georgia, serif; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,.4); }
.bc-bday { background: linear-gradient(#7fc8ff, #ffc2e0); }
.bc-bday i { position: absolute; bottom: -40px; width: 30px; height: 36px; border-radius: 50% 50% 48% 48%; background: radial-gradient(circle at 35% 30%, #fff, var(--bc, #ff6a9a) 40%); animation: web-bc-float 5s linear infinite; }
.bc-bday i::after { content: ""; position: absolute; left: 50%; top: 100%; width: 1px; height: 30px; background: #999; }
.bc-bday i:nth-child(1) { left: 8%; --bc: #ff6a9a; } .bc-bday i:nth-child(2) { left: 25%; --bc: #ffd23a; animation-delay: -1s; } .bc-bday i:nth-child(3) { left: 42%; --bc: #6ad0ff; animation-delay: -2.2s; } .bc-bday i:nth-child(4) { left: 58%; --bc: #8fe05a; animation-delay: -3s; } .bc-bday i:nth-child(5) { left: 74%; --bc: #c89aff; animation-delay: -4s; } .bc-bday i:nth-child(6) { left: 88%; --bc: #ff9a3a; animation-delay: -.5s; }
@keyframes web-bc-float { to { transform: translateY(-260px) rotate(8deg); } }
.bc-thanks { background: linear-gradient(#bfe8ff 55%, #7fd05a 55%); }
.bc-flower { position: absolute; left: 50%; top: 20%; width: 50%; height: 50%; margin-left: -25%; animation: web-bc-bloom 3s ease-in-out infinite alternate; }
@keyframes web-bc-bloom { from { transform: scale(.7) rotate(-8deg); } to { transform: scale(1.05) rotate(8deg); } }
.bc-fish { background: linear-gradient(#4ab8ee, #0c5a96); }
.bc-f1, .bc-f2 { position: absolute; width: 60px; height: 60px; }
.bc-f1 { top: 18%; animation: web-bc-swim 6s linear infinite; } .bc-f2 { top: 45%; width: 44px; height: 44px; animation: web-bc-swim 9s linear -3s infinite; }
@keyframes web-bc-swim { from { left: -70px; } to { left: 110%; } }
.bc-sun { background: repeating-conic-gradient(from 0deg at 50% 45%, #ffe38a 0 10deg, #ffd23a 10deg 20deg); }
.bc-sunimg { position: absolute; left: 50%; top: 12%; width: 46%; height: 60%; margin-left: -23%; animation: web-bc-spin 12s linear infinite; }
@keyframes web-bc-spin { to { transform: rotate(360deg); } }
.bc-party { background: #1a2a5a; }
.bc-party i { position: absolute; width: 10px; height: 6px; top: -10px; animation: web-bc-fall 3s linear infinite; }
.bc-party i:nth-child(odd) { background: #ffd23a; } .bc-party i:nth-child(even) { background: #ff6a9a; } .bc-party i:nth-child(3n) { background: #6ad0ff; }
.bc-party i:nth-child(1) { left: 10%; } .bc-party i:nth-child(2) { left: 22%; animation-delay: -1s; } .bc-party i:nth-child(3) { left: 34%; animation-delay: -2s; } .bc-party i:nth-child(4) { left: 46%; animation-delay: -.5s; } .bc-party i:nth-child(5) { left: 58%; animation-delay: -1.5s; } .bc-party i:nth-child(6) { left: 70%; animation-delay: -2.5s; } .bc-party i:nth-child(7) { left: 82%; animation-delay: -.8s; } .bc-party i:nth-child(8) { left: 92%; animation-delay: -1.8s; }
@keyframes web-bc-fall { to { transform: translateY(240px) rotate(720deg); } }
.bc-aurora { background: #041430; }
.bc-aurora i { position: absolute; left: -20%; right: -20%; height: 50px; border-radius: 50%; filter: blur(10px); animation: web-fs-aur 6s ease-in-out infinite alternate; }
.bc-aurora i:nth-child(1) { top: 15%; background: linear-gradient(90deg, transparent, #3ee6a0, #2aceda, transparent); } .bc-aurora i:nth-child(2) { top: 38%; background: linear-gradient(90deg, transparent, #2aceda, #7a5aff, transparent); animation-delay: -3s; }
@keyframes web-fs-aur { from { transform: translateX(-12%) skewX(-10deg); } to { transform: translateX(12%) skewX(10deg); } }
.web-bc-create { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.web-bc-preview .web-bc-card { max-width: none; }
.web-bc-msgprev { font-style: italic; color: #7a5a4a; min-height: 2em; }
.web-bc-form { display: flex; flex-direction: column; gap: 10px; }
.web-bc-form label { display: flex; flex-direction: column; gap: 3px; font-weight: 700; }
.web-bc-form input, .web-bc-form textarea { font: 1em Georgia, serif; padding: 6px 8px; border: 1px solid #e0b8c8; border-radius: 6px; }
.web-bc-form textarea { min-height: 90px; resize: vertical; }
.web-bc-btn { align-self: flex-start; display: inline-block; padding: 9px 22px; border-radius: 22px; cursor: pointer; font: italic 700 1.1em Georgia, serif; color: #fff !important; text-decoration: none !important; border: 1px solid #a0305a; background: linear-gradient(to bottom, #ffb3d0 0, #e0457b 50%, #c8306a 51%, #e8588e 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.7); }
.web-bc-err { color: #c8412a; margin: 0; }
.web-bc-sent, .web-bc-view { text-align: center; }
.web-bc-plane { margin: 10px 0; }
.web-bc-planeic { width: 80px; height: 80px; animation: web-bc-fly 2s ease-in-out infinite; }
@keyframes web-bc-fly { 50% { transform: translate(20px, -12px) rotate(-8deg); } }
.web-bc-view .web-bc-card { margin: 0 auto; max-width: 420px; }
.web-bc-from { font: italic 700 1.3em Georgia, serif; color: #c0507a; }
.web-bc-letter { max-width: 460px; margin: 18px auto; padding: 16px 22px; text-align: left; background: #fff; border: 1px solid #f0d0dc; border-radius: 8px; box-shadow: 0 4px 12px rgba(120,60,40,.12); }
.web-bc-sign { text-align: right; font-style: italic; }
.web-bc-foot { text-align: center; color: #9a7a6a; padding: 10px 0 20px; font-size: .9em; }
`,
  });
})();
