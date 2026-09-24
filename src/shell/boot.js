/* Aerium startup and power: the power button, a quick POST screen, the
   glowing boot animation, the logon screen with its startup chord, and log
   off, lock, restart, sleep and shut down. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, sleep } = A.util;

  const boot = { screen: null };
  let screens;

  boot.onScreen = () => !!boot.screen;

  function show(el) {
    if (boot.screen && boot.screen !== el) {
      const old = boot.screen;
      old.classList.add('bs-out');
      setTimeout(() => { old._stop && old._stop(); old.remove(); }, 700);
    }
    boot.screen = el;
    screens.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('bs-in')));
    return el;
  }
  function hideScreen() {
    const old = boot.screen;
    if (!old) return;
    boot.screen = null;
    old.classList.add('bs-out');
    setTimeout(() => { old._stop && old._stop(); old.remove(); }, 800);
  }

  // ------------------------------------------------------------ power
  boot.power = function (msg) {
    const btn = h('button.bs-power-btn', { type: 'button', 'aria-label': 'Power' }, powerGlyph());
    const el = h('div.bs-screen.bs-power', null,
      h('div.bs-power-center', null,
        btn,
        h('div.bs-power-text', null, msg || 'Press the power button to start'),
        h('div.bs-power-sub', null, 'A Frutiger Aero playground. Best with the sound on.')),
      h('button.bs-skip', { type: 'button', onclick: () => { A.sound.unlock(); boot.login(true); } }, 'Skip startup'));
    const go = () => {
      A.sound.unlock();
      btn.classList.add('on');
      setTimeout(() => (A.store.get('boot.animation') ? boot.post() : boot.login()), 450);
    };
    btn.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    show(el);
    setTimeout(() => btn.focus(), 50);
  };

  function powerGlyph() {
    const svg = A.util.s('svg', { viewBox: '0 0 48 48', 'aria-hidden': 'true' },
      A.util.s('path', { d: 'M16 12.5 A 15 15 0 1 0 32 12.5', fill: 'none', stroke: 'currentColor', 'stroke-width': 4.2, 'stroke-linecap': 'round' }),
      A.util.s('path', { d: 'M24 6 V24', stroke: 'currentColor', 'stroke-width': 4.2, 'stroke-linecap': 'round' }));
    return svg;
  }

  // ------------------------------------------------------------ POST
  boot.post = function () {
    const text = h('pre.bs-post-text');
    const el = h('div.bs-screen.bs-post', { onclick: () => finish() }, text);
    show(el);
    const lines = [
      'AeriumBIOS v2.07, Copyright (C) 2007 Aerium Playground',
      '',
      'Main Processor : AeroCore Duo 2.40GHz',
      'Memory Testing : ',
      '',
      'Detecting Primary Master   ... AERIUM GLASS-160 160GB',
      'Detecting Primary Slave    ... DVD+-RW BUBBLE-2000',
      'Detecting Secondary Master ... None',
      '',
      'Press DEL to enter SETUP, F12 for Boot Menu',
    ];
    let done = false;
    const finish = () => { if (done) return; done = true; boot.bootAnim(); };
    (async () => {
      for (const line of lines) {
        if (done) return;
        if (line.startsWith('Memory Testing')) {
          const span = document.createTextNode(line);
          text.appendChild(span);
          for (let k = 0; k <= 2097152; k += 131072) {
            if (done) return;
            span.textContent = line + k + 'K' + (k >= 2097152 ? ' OK' : '');
            await sleep(26);
          }
          text.appendChild(document.createTextNode('\n'));
        } else {
          text.appendChild(document.createTextNode(line + '\n'));
          await sleep(line ? 110 : 60);
        }
      }
      await sleep(650);
      finish();
    })();
  };

  // ------------------------------------------------------------ boot animation
  boot.bootAnim = function () {
    const canvas = h('canvas.bs-canvas');
    const logo = h('div.bs-logo', null, A.img('icons/aerium', { class: 'bs-logo-orb' }), h('div.bs-wordmark', null, h('span', null, 'Aerium'), h('small', null, 'Home Premium')));
    const bar = h('div.bs-bar', null, h('i'), h('i'), h('i'));
    const copy = h('div.bs-copy', null, '© Aerium Playground');
    const el = h('div.bs-screen.bs-boot', null, canvas, logo, bar, copy);
    show(el);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const resize = () => { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    const COLORS = ['#3aa6f5', '#35c93a', '#ffd62e', '#2cc6ea'];
    const orbs = COLORS.map((c, i) => ({ c, a0: (i / 4) * Math.PI * 2 + 0.4, r0: 0 }));
    const t0 = performance.now();
    let raf = null, flashed = false, finished = false;
    const CONVERGE = 1900;
    function frame(now) {
      const t = now - t0;
      if (canvas.clientWidth !== W || canvas.clientHeight !== H) resize();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const cx = W / 2, cy = H / 2 - 30;
      const p = Math.min(1, t / CONVERGE);
      const ease = 1 - Math.pow(1 - p, 3);
      orbs.forEach((o, i) => {
        const radius = (1 - ease) * Math.min(W, H) * 0.42 + 2;
        const ang = o.a0 + ease * Math.PI * 2.4 + t * 0.0006;
        const x = cx + Math.cos(ang) * radius, y = cy + Math.sin(ang) * radius * 0.62;
        const size = 26 + 20 * (1 - ease);
        const g = ctx.createRadialGradient(x, y, 0, x, y, size);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.25, o.c);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
        void i;
      });
      if (p >= 1 && !flashed) {
        flashed = true;
        el.classList.add('bs-flash');
        setTimeout(() => el.classList.add('bs-show-logo'), 120);
      }
      if (flashed) {
        const k = Math.min(1, (t - CONVERGE) / 900);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160 + k * 120);
        g.addColorStop(0, `rgba(120,210,255,${0.28 * (1 - k)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      if (t > 4700 && !finished) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      boot.login();
    };
    el.addEventListener('click', finish);
    el._stop = () => cancelAnimationFrame(raf);
  };

  // ------------------------------------------------------------ logon background
  function ribbonScene(canvas, variant) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0, H = 0, raf = null, stopped = false;
    const resize = () => { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    window.addEventListener('resize', resize);
    const pal = {
      light: { bg: ['#021a4a', '#06307a', '#0a55b0', '#1391d6'], rib: ['rgba(255,255,255,', 'rgba(140,230,255,', 'rgba(120,255,210,'] },
      dark: { bg: ['#010612', '#031029', '#062a3f', '#0b4a5e'], rib: ['rgba(62,230,160,', 'rgba(42,206,218,', 'rgba(140,255,220,'] },
      technozen: { bg: ['#ffffff', '#f4f7fa', '#e9eef3', '#dfe7ee'], rib: ['rgba(120,190,240,', 'rgba(160,215,245,', 'rgba(200,225,240,'] },
    }[variant] || null;
    const P = pal || { bg: ['#021a4a', '#06307a', '#0a55b0', '#1391d6'], rib: ['rgba(255,255,255,', 'rgba(140,230,255,', 'rgba(120,255,210,'] };
    const ribbons = [0, 1, 2, 3].map((i) => ({ y: 0.52 + i * 0.07, amp: 0.05 + i * 0.012, f: 1.4 + i * 0.35, sp: 0.00012 + i * 0.00004, ph: i * 1.7, col: P.rib[i % P.rib.length], w: 1 - i * 0.18 }));
    const motes = Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3.5, v: 0.00002 + Math.random() * 0.00005, a: Math.random() * 0.5 + 0.2 }));
    function frame(t) {
      if (stopped) return;
      if (canvas.clientWidth !== W || canvas.clientHeight !== H) resize();
      if (W < 2 || H < 2) { raf = requestAnimationFrame(frame); return; }
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, P.bg[0]); g.addColorStop(0.45, P.bg[1]); g.addColorStop(0.8, P.bg[2]); g.addColorStop(1, P.bg[3]);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = variant === 'technozen' ? 'source-over' : 'lighter';
      ribbons.forEach((r) => {
        const path = () => {
          ctx.beginPath();
          for (let x = -20; x <= W + 20; x += 16) {
            const u = x / W;
            const y = H * (r.y + r.amp * Math.sin(u * r.f * Math.PI + t * r.sp * 6 + r.ph) + r.amp * 0.5 * Math.sin(u * 5.1 - t * r.sp * 4 + r.ph * 2));
            x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
        };
        [[90 * r.w, 0.035], [44 * r.w, 0.06], [16 * r.w, 0.1], [4, 0.28], [1.4, 0.7]].forEach(([lw, a]) => {
          path();
          ctx.strokeStyle = r.col + a + ')';
          ctx.lineWidth = lw;
          ctx.lineCap = 'round';
          ctx.stroke();
        });
      });
      motes.forEach((m) => {
        m.y -= m.v * 16;
        if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
        const x = m.x * W + Math.sin(t * 0.0004 + m.x * 9) * 12, y = m.y * H;
        const rg = ctx.createRadialGradient(x, y, 0, x, y, m.r * 3);
        rg.addColorStop(0, variant === 'technozen' ? `rgba(150,200,240,${m.a})` : `rgba(255,255,255,${m.a})`);
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(x, y, m.r * 3, 0, Math.PI * 2); ctx.fill();
      });
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }

  // ------------------------------------------------------------ logon
  boot.login = function (quick, mode) {
    const theme = A.store.get('theme');
    const canvas = h('canvas.bs-canvas');
    const center = h('div.bs-login-center');
    const el = h('div.bs-screen.bs-login', { class: 'bs-login-' + theme }, canvas, center,
      h('div.bs-login-foot', null,
        h('button.bs-access', { type: 'button', 'data-tip': 'Ease of Access', 'aria-label': 'Ease of Access', onclick: () => { document.documentElement.classList.toggle('ae-large-text'); A.sound.play('click'); } }, A.img('icons/users')),
        h('div.bs-brand', null, h('span', null, 'Aerium'), h('small', null, 'Home Premium')),
        h('div.bs-login-power', null,
          h('button.bs-pwr', { type: 'button', 'data-tip': 'Shut down', 'aria-label': 'Shut down', onclick: () => boot.shutdownFromLogin() }, powerGlyph()),
          h('button.bs-pwr-more', { type: 'button', 'aria-label': 'Shut down options', onclick: (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            A.ui.menu([{ label: 'Restart', onClick: () => boot.shutdownFromLogin(true) }, { label: 'Sleep', onClick: () => boot.sleep() }, { label: 'Shut down', onClick: () => boot.shutdownFromLogin() }], r.left - 100, r.top - 90);
          } }, '▲'))));
    el._stop = ribbonScene(canvas, theme);
    show(el);
    if (!quick && mode !== 'locked' && mode !== 'switch') setTimeout(() => A.sound.play('startup'), 250);

    if (!A.store.get('user.created')) renderSetup(center);
    else renderTile(center, mode);
  };

  function renderTile(center, mode) {
    center.innerHTML = '';
    const name = A.store.get('user.name') || 'User';
    const tile = h('button.bs-user', { type: 'button' },
      h('span.bs-user-frame', null, h('img', { src: A.asset(A.store.get('user.avatar')), alt: '' })),
      h('span.bs-user-name', null, name),
      mode === 'locked' ? h('span.bs-user-status', null, 'Locked') : null);
    tile.addEventListener('click', () => signIn(center, tile, mode));
    center.appendChild(tile);
    setTimeout(() => tile.focus(), 100);
  }

  function renderSetup(center) {
    center.innerHTML = '';
    const avatars = ['avatar-fish', 'avatar-flower', 'avatar-butterfly', 'avatar-dolphin', 'avatar-sun', 'avatar-globe', 'avatar-leaf', 'avatar-music'];
    let picked = A.store.get('user.avatar') || 'avatars/avatar-fish';
    const preview = h('span.bs-user-frame', null, h('img', { src: A.asset(picked), alt: '' }));
    const input = h('input.bs-setup-name', { type: 'text', placeholder: 'Type a user name', maxLength: 24, spellcheck: false, value: A.store.get('user.name') || '' });
    const grid = h('div.bs-avatars', null, avatars.map((a) => {
      const b = h('button.bs-avatar', { type: 'button', class: 'avatars/' + a === picked && 'picked', 'aria-label': a.replace('avatar-', '') }, h('img', { src: A.asset('avatars/' + a), alt: '' }));
      b.addEventListener('click', () => {
        picked = 'avatars/' + a;
        grid.querySelectorAll('.bs-avatar').forEach((x) => x.classList.remove('picked'));
        b.classList.add('picked');
        preview.querySelector('img').src = A.asset(picked);
        A.sound.play('hover');
      });
      return b;
    }));
    const start = A.ui.button('Start', { tone: 'aqua', size: 'lg' });
    const submit = () => {
      const nm = input.value.trim() || 'User';
      A.store.set('user.name', nm);
      A.store.set('user.avatar', picked);
      A.store.set('user.created', true);
      const tile = h('button.bs-user', { type: 'button' }, preview, h('span.bs-user-name', null, nm));
      center.innerHTML = '';
      center.appendChild(tile);
      signIn(center, tile);
    };
    start.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    center.appendChild(h('div.bs-setup', null,
      h('div.bs-setup-title', null, 'Welcome to Aerium'),
      h('div.bs-setup-sub', null, 'Choose a user name and a picture. You can change them later.'),
      h('div.bs-setup-row', null, preview, h('div.bs-setup-fields', null, input, grid)),
      h('div.bs-setup-actions', null, start)));
    setTimeout(() => input.focus(), 400);
  }

  async function signIn(center, tile, mode) {
    tile.disabled = true;
    tile.classList.add('signing');
    const status = h('div.bs-welcome', null, A.ui.spinner({ size: 30 }), h('span', null, mode === 'locked' ? 'Unlocking...' : 'Welcome'));
    center.appendChild(status);
    A.sound.play('logon');
    if (mode === 'locked') {
      await sleep(900);
      hideScreen();
      A.shellReady = true;
      return;
    }
    await sleep(700);
    boot.enterDesktop();
    await sleep(900);
    hideScreen();
  }

  // Shows the desktop: wallpaper, icons, taskbar, first-run niceties.
  boot.enterDesktop = function () {
    const firstRun = !A.store.get('welcome.seen');
    document.getElementById('ae-root').classList.add('shell-on');
    A.shell.start();
    A.shellReady = true;
    if (firstRun) A.store.set('welcome.seen', true);
    setTimeout(() => {
      if ((firstRun || A.store.get('welcome.atStartup')) && A.apps.get('welcome') && !A.wm.byApp('welcome').length) A.apps.launch('welcome');
    }, 1300);
    if (firstRun) {
      setTimeout(() => A.notify({ title: 'Your fish are hungry', text: 'Click anywhere on the fish tank to drop some food.', icon: 'icons/aquarium' }), 16000);
    }
  };

  // ------------------------------------------------------------ session actions
  async function farewell(text, soundName) {
    A.shellReady = false;
    A.startmenu.close();
    A.screensaver.stop();
    const theme = A.store.get('theme');
    const canvas = h('canvas.bs-canvas');
    const el = h('div.bs-screen.bs-login.bs-farewell', { class: 'bs-login-' + theme }, canvas, h('div.bs-login-center', null, h('div.bs-welcome', null, A.ui.spinner({ size: 30 }), h('span', null, text))),
      h('div.bs-login-foot', null, h('div'), h('div.bs-brand', null, h('span', null, 'Aerium'), h('small', null, 'Home Premium')), h('div')));
    el._stop = ribbonScene(canvas, theme);
    show(el);
    if (soundName) A.sound.play(soundName);
    await A.wm.closeAll(true);
    await sleep(1800);
    document.getElementById('ae-root').classList.remove('shell-on');
    A.shell.stop();
  }

  boot.logoff = async function (switchUser) {
    await farewell(switchUser ? 'Switching user...' : 'Logging off...', 'logoff');
    boot.login(true, switchUser ? 'switch' : null);
  };

  boot.lock = function () {
    A.shellReady = false;
    A.startmenu.close();
    A.sound.play('lock');
    boot.login(true, 'locked');
  };

  boot.shutdown = async function (restart) {
    await farewell(restart ? 'Restarting...' : 'Shutting down...', 'shutdown');
    await sleep(600);
    const black = h('div.bs-screen.bs-black');
    show(black);
    await sleep(restart ? 1400 : 1000);
    if (restart) boot.post();
    else boot.power('Press the power button to start again');
  };

  boot.shutdownFromLogin = async function (restart) {
    A.sound.play('shutdown');
    const black = h('div.bs-screen.bs-black');
    show(black);
    await sleep(1600);
    if (restart) boot.post();
    else boot.power('Press the power button to start again');
  };

  boot.sleep = function (hibernate) {
    const wasShell = A.shellReady;
    A.shellReady = false;
    A.startmenu.close();
    const led = h('div.bs-led');
    const el = h('div.bs-screen.bs-sleep', null, led, h('div.bs-sleep-text', null, hibernate ? 'Hibernating. Click to wake up.' : 'Sleeping. Move the mouse or press a key to wake up.'));
    show(el);
    A.theme.pause();
    const wake = () => {
      window.removeEventListener('keydown', wake, true);
      el.removeEventListener('pointerdown', wake);
      el.removeEventListener('pointermove', moveWake);
      A.theme.resume();
      if (wasShell) boot.login(true, 'locked');
      else boot.login(true);
    };
    let origin = null;
    const moveWake = (e) => { if (!origin) { origin = [e.clientX, e.clientY]; return; } if (Math.hypot(e.clientX - origin[0], e.clientY - origin[1]) > 20) wake(); };
    setTimeout(() => {
      window.addEventListener('keydown', wake, true);
      el.addEventListener('pointerdown', wake);
      if (!hibernate) el.addEventListener('pointermove', moveWake);
    }, 900);
  };

  boot.init = function () {
    screens = document.getElementById('ae-screens');
  };

  A.boot = boot;
})();
