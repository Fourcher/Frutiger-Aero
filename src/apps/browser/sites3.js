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
      <div class="web-mg-box"><div class="web-mg-boxh">Your high scores</div><ul class="web-mg-scores">${MG_GAMES.filter((gm) => gm.play).map((gm) => `<li><a href="/game/${gm.id}">${esc(gm.title)}</a><b>${K.num(ctx.store.get('minigames.best.' + gm.id, 0))}</b></li>`).join('')}</ul></div></div>`;
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
            setBest: (v) => { ctx.store.set('minigames.best.' + gm.id, v); if (bestEl) bestEl.textContent = K.num(v); },
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

  // @@PART2
})();
