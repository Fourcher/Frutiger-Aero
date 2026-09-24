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
    <rect x="10" y="118" width="180" height="22" rx="3" fill="url(#geoS)" stroke="#222" stroke-width="2"/><rect x="42" y="121" width="116" height="16" fill="#111"/><text x="100" y="133" font-family="Arial Black, Arial" font-weight="900" font-size="11" fill="#ffd21a" text-anchor="middle">UNDER CONSTRUCTION</text></svg>`;
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
      if (!A.sound.ctx || !ctx.audio()) { ctx.dialog({ title: 'Sound', icon: 'icons/speaker', message: 'Turn on "Play sounds in webpages" in Internet Options to hear background music.' }); return; }
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
.web-geo-gbform button { font: 13px Arial, sans-serif; padding: 2px 10px; }
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
      <p>If your download does not start, <a href="#" class="web-fs-now">click here</a>.</p><p class="web-fs-small">File: ${esc(name)}.txt (${size})</p><p><a href="/">&lt;&lt; Back to more FREE screensavers</a></p></div>`;
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
      const root = ctx.html(`<div class="web-fs web-fs-popup"><div class="web-fs-win">${K.burst('WINNER!', { size: 110, font: 18, c1: '#fff45c', c2: '#ff3a3a', rim: '#a00', spin: true })}<h1 class="web-fs-rain">YOU HAVE WON!!!</h1><p>You have been selected to receive a <b>FREE FISHBOWL!!!</b></p><a class="web-fs-dl" href="/claim"><span>CLAIM</span>MY PRIZE</a><p class="web-fs-small">This offer expires in <b class="wk-blink">00:59</b>. Not really.</p></div></div>`);
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

  // @@PART3
})();
