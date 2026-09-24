/* Aerium System: "View basic information about your computer" with the
   edition, the Aerium Experience Index (measured by tiny speed tests right
   in the browser), computer name and activation, plus Performance
   Information, Device Manager, System Protection and the About Aerium
   (winver) box. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, s, clamp } = A.util;
  const K = A.cpKit;
  if (!K || !K.frame) return;

  // ============================================================ Experience Index
  const WEI_ROWS = [
    ['cpu', 'Processor', 'Calculations per second'],
    ['mem', 'Memory (RAM)', 'Memory operations per second'],
    ['gfx', 'Graphics', 'Desktop performance for glass effects'],
    ['game', 'Gaming graphics', '3D business and gaming graphics performance'],
    ['disk', 'Primary hard disk', 'Disk data transfer rate'],
    ['bubbles', 'Bubbles', 'Bubbles rendered per second'],
  ];
  const fmtScore = (v) => (Math.round(v * 10) / 10).toFixed(1);
  // Maps a raw measurement onto the familiar 1.0 to 7.9 scale.
  const toScore = (n, base) => clamp(Math.round((2.2 + Math.log2(Math.max(1, n) / base) * 0.9) * 10) / 10, 1, 7.9);
  const TIME = 110;

  const BENCH = {
    cpu() {
      let n = 0, x = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < TIME) { for (let i = 1; i < 2000; i++) x += Math.sqrt(i * (n + 1)) % 7; n++; }
      return toScore(n + (x < 0 ? 1 : 0), 150);
    },
    mem() {
      const a = new Float64Array(1 << 16), b = new Float64Array(1 << 16);
      let n = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < TIME) { b.set(a); for (let i = 0; i < a.length; i += 64) a[i] = b[i] + 1; n++; }
      return toScore(n, 110);
    },
    gfx() {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 200;
      const g = c.getContext('2d');
      let n = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < TIME) {
        const gr = g.createLinearGradient(0, 0, 320, 200);
        gr.addColorStop(0, '#7cc8ff'); gr.addColorStop(1, 'rgba(58,166,245,' + (n % 10) / 10 + ')');
        g.fillStyle = gr;
        g.fillRect(n % 40, n % 30, 280, 170);
        n++;
      }
      return toScore(n, 500);
    },
    game() {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 200;
      const g = c.getContext('2d');
      let n = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < TIME) {
        g.beginPath();
        g.arc((n * 37) % 320, (n * 53) % 200, 6 + (n % 8), 0, Math.PI * 2);
        g.fillStyle = n % 2 ? '#35c93a' : '#ffd62e';
        g.fill();
        n++;
      }
      return toScore(n / 10, 137);
    },
    disk() {
      const key = 'aerium.v1.system.__bench';
      const blob = 'x'.repeat(32768);
      let n = 0;
      try {
        const t0 = performance.now();
        while (performance.now() - t0 < TIME * 0.8) { localStorage.setItem(key, blob + n); localStorage.getItem(key); n++; }
        localStorage.removeItem(key);
      } catch (e) { return 4.1; }
      return toScore(n, 21);
    },
    bubbles() {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 200;
      const g = c.getContext('2d');
      let n = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < TIME) {
        const x = (n * 29) % 320, y = (n * 17) % 200, r = 4 + (n % 12);
        const gr = g.createRadialGradient(x - r / 3, y - r / 3, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(124,200,255,.3)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        n++;
      }
      return toScore(n / 10, 24);
    },
  };
  K.weiBench = BENCH;

  function weiBadge(score, big) {
    return h('span.sy-wei-badge', { class: big && 'big', role: 'img', 'aria-label': 'Base score ' + fmtScore(score) }, h('span.sy-wei-num', null, fmtScore(score)));
  }
  K.weiBadge = weiBadge;

  // The assessment: runs each test with a little scene, then saves the score.
  function assess(win) {
    return new Promise((resolve) => {
      const steps = [
        ['cpu', 'Assessing processor', 'orbs'], ['mem', 'Assessing memory', 'bars'], ['gfx', 'Assessing graphics', 'glass'],
        ['game', 'Assessing gaming graphics', 'stars'], ['disk', 'Assessing primary hard disk', 'disk'], ['bubbles', 'Assessing bubbles', 'bubbles'],
      ];
      const canvas = h('canvas.sy-rate-canvas', { width: 400, height: 130 });
      const label = h('div.sy-rate-step', null, 'Getting ready...');
      const bar = A.ui.progress({ value: 0, tone: 'aqua', label: 'Assessment progress' });
      const list = h('ul.cp-pd-log.sy-rate-list', null, steps.map(([, t]) => h('li.cp-pd-item', null, h('span.cp-pd-dot'), h('span', null, t))));
      const content = h('div.cp-pd', null,
        h('div.cp-pd-top', null, A.img(K.icons.gauge, { class: 'cp-pd-icon' }), h('div.cp-pd-text', null, h('div.ae-td-instruction', null, 'Rating your computer'), h('div.cp-pd-status', null, 'This takes a few seconds. Your screen might flicker a little. That\'s normal.'))),
        canvas, label, bar, list);
      let done = false, raf = 0, mode = 'orbs', dlg = null;
      const g = canvas.getContext('2d');
      const bubbles = Array.from({ length: 22 }, () => ({ x: Math.random() * 400, y: 130 + Math.random() * 130, r: 3 + Math.random() * 9, v: 0.4 + Math.random() * 1.1 }));
      function draw(t) {
        if (done) return;
        const W = 400, H = 130;
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#07203f'); bg.addColorStop(1, '#0b4a5e');
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
        const k = t / 1000;
        if (mode === 'orbs') {
          for (let i = 0; i < 5; i++) {
            const a = k * 2 + (i * Math.PI * 2) / 5, x = W / 2 + Math.cos(a) * 90, y = H / 2 + Math.sin(a) * 34;
            const gr = g.createRadialGradient(x - 5, y - 6, 1, x, y, 16);
            gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, '#7cc8ff'); gr.addColorStop(1, '#0a6fd1');
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fill();
          }
        } else if (mode === 'bars') {
          for (let i = 0; i < 24; i++) {
            const hh = 20 + Math.abs(Math.sin(k * 5 + i * 0.6)) * 80;
            g.fillStyle = i % 2 ? '#45d64a' : '#8fe05a';
            g.fillRect(20 + i * 15, H - hh - 10, 10, hh);
          }
        } else if (mode === 'glass') {
          for (let i = 0; i < 4; i++) {
            const x = ((k * 80 + i * 110) % 520) - 100;
            g.fillStyle = 'rgba(124,200,255,.35)'; g.fillRect(x, 20 + i * 8, 120, 80);
            g.strokeStyle = 'rgba(255,255,255,.8)'; g.strokeRect(x, 20 + i * 8, 120, 80);
            g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, 20 + i * 8, 120, 24);
          }
          if (Math.random() < 0.05) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 0, W, H); }
        } else if (mode === 'stars') {
          for (let i = 0; i < 70; i++) {
            const z = ((i * 7.3 + k * 60) % 100) / 100, a = i * 2.39;
            const x = W / 2 + Math.cos(a) * z * 230, y = H / 2 + Math.sin(a) * z * 90;
            g.fillStyle = `rgba(255,255,255,${z})`; g.fillRect(x, y, 1 + z * 2.5, 1 + z * 2.5);
          }
        } else if (mode === 'disk') {
          const cx = W / 2, cy = H / 2;
          const gr = g.createRadialGradient(cx - 20, cy - 20, 5, cx, cy, 55);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#c3ced8'); gr.addColorStop(1, '#7b8896');
          g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 52, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(11,42,74,.35)';
          for (let r = 18; r < 50; r += 6) { g.beginPath(); g.arc(cx, cy, r, k * 8, k * 8 + 4); g.stroke(); }
          g.fillStyle = '#0b2a4a'; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill();
        } else {
          bubbles.forEach((b) => {
            b.y -= b.v * 2; if (b.y < -12) { b.y = H + 10; b.x = Math.random() * W; }
            g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.2;
            g.beginPath(); g.arc(b.x + Math.sin(k * 2 + b.r) * 4, b.y, b.r, 0, Math.PI * 2); g.stroke();
            g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(b.x - b.r / 3 + Math.sin(k * 2 + b.r) * 4, b.y - b.r / 3, b.r / 4, 0, Math.PI * 2); g.fill();
          });
        }
        raf = requestAnimationFrame(draw);
      }
      raf = requestAnimationFrame(draw);
      const finish = (v) => { if (done) return; done = true; cancelAnimationFrame(raf); resolve(v); };
      A.ui.dialog({ parent: win, title: 'Aerium Experience Index', icon: K.icons.gauge, content, width: 460, buttons: [{ label: 'Cancel', cancel: true, value: 'cancel' }], onOpen: (w) => { dlg = w; run(); } })
        .then(() => finish(null));
      async function run() {
        const sub = {};
        const items = list.querySelectorAll('li');
        for (let i = 0; i < steps.length; i++) {
          if (done) return;
          const [key, text, m] = steps[i];
          mode = m;
          label.textContent = text + '...';
          items[i].classList.add('running');
          A.sound.play('zap');
          await K.sleep(420);
          if (done) return;
          try { sub[key] = BENCH[key](); } catch (e) { sub[key] = 4.0; }
          for (let j = 1; j <= 4; j++) { await K.sleep(130); if (done) return; bar.set(((i + j / 4) / steps.length) * 100); }
          items[i].classList.remove('running');
          items[i].classList.add('done');
          items[i].lastChild.textContent = text + ': ' + fmtScore(sub[key]);
        }
        label.textContent = 'Calculating your score...';
        await K.sleep(500);
        if (done) return;
        const base = Math.min(...Object.values(sub));
        const res = { base, sub, date: Date.now() };
        done = true;
        cancelAnimationFrame(raf);
        if (dlg) dlg.close(true);
        resolve(res);
      }
    });
  }
  K.assess = async function (ctx) {
    const before = K.sys.wei.base;
    const res = await assess(ctx.win);
    if (!res) return;
    A.store.set('system.wei', res);
    const better = res.base > before + 0.05;
    A.sound.play(better ? 'win' : 'notify');
    const content = h('div.cp-dlg.sy-rated', null,
      weiBadge(res.base, true),
      h('div', null,
        h('div.ae-td-instruction', null, 'Your Aerium Experience Index base score is ' + fmtScore(res.base)),
        h('p', null, better ? 'That\'s higher than before! Your computer must have been eating its vegetables.' : 'The base score comes from the lowest subscore, just like a chain is only as strong as its shiniest link.'),
        h('p.cp-muted', null, 'Your score was measured with tiny speed tests, right here in your browser.')),
      better ? A.ui.badge('New high score!', 'sun', 'burst') : null);
    A.ui.dialog({ parent: ctx.win, title: 'Aerium Experience Index', icon: K.icons.gauge, content, width: 460, buttons: [{ label: 'OK', default: true }] });
  };

  // ============================================================ System page
  const joke = (ctx, o) => K.joke(ctx.win, o);
  function changeName(ctx) {
    const name = A.ui.textField({ label: 'Computer name:', value: K.sys.computerName, maxLength: 15 });
    const desc = A.ui.textField({ label: 'Computer description:', value: A.store.get('system.description', '') || (K.sys.userName + '\'s computer'), maxLength: 40 });
    const group = A.ui.textField({ label: 'Workgroup:', value: K.sys.workgroup, maxLength: 15 });
    const content = h('div.cp-dlg.sy-name-dlg', null,
      h('p', null, 'Aerium uses this name to introduce your computer to others on the network.'),
      name, desc, group);
    A.ui.dialog({ parent: ctx.win, title: 'Computer Name Changes', icon: 'icons/computer', content, width: 420, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] }).then((r) => {
      if (r !== 'ok') return;
      const clean = (v, fb) => (String(v).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 15) || fb);
      const newName = clean(name.input.value, K.sys.computerName);
      const changed = newName !== K.sys.computerName;
      A.store.set('system.computerName', newName);
      A.store.set('system.description', desc.input.value.trim());
      A.store.set('system.workgroup', clean(group.input.value, K.sys.workgroup));
      if (!changed) return;
      A.ui.messageBox({ parent: ctx.win, title: 'Computer Name Changes', icon: 'info', instruction: 'Welcome, ' + newName + '!', message: 'Aerium applied the new name right away. Back in 2007 you would have had to restart now. Would you like to restart anyway, for old times\' sake?', buttons: [{ label: 'Restart now', value: 'restart' }, { label: 'No thanks', value: 'no', default: true, cancel: true }] }).then((v) => {
        if (v === 'restart') A.boot.shutdown(true);
      });
    });
  }
  function productKey(ctx) {
    A.ui.prompt({ parent: ctx.win, title: 'Aerium Activation', message: 'Type your product key:', placeholder: 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX' }).then((v) => {
      if (v == null) return;
      A.ui.messageBox({ parent: ctx.win, title: 'Aerium Activation', icon: 'success', instruction: 'That key is genuine too', message: 'Every key is genuine here, and so are you. Your copy of Aerium stays activated either way.' });
    });
  }
  const seeAlso = { title: 'See also', links: [{ label: 'Aerium Update', target: 'cp:update' }, { label: 'Security Center', target: 'cp:security' }, { label: 'Performance Information and Tools', target: 'sy:wei' }, { label: 'About Aerium', target: { app: 'winver' } }] };
  const systemTasks = (ctx) => ({ title: 'Tasks', links: [
    { label: 'Device Manager', target: () => K.dialogs.deviceManager(ctx.win), icon: 'icons/settings' },
    { label: 'Remote settings', target: () => joke(ctx, { title: 'Remote Assistance', icon: 'icons/users', instruction: 'Let a friend help you from far away', message: 'Your friends are busy playing Bubble Pop right now. Try sending them a nudge in Bubble Messenger instead.' }), icon: 'icons/users' },
    { label: 'System protection', target: () => K.dialogs.protection(ctx.win), icon: 'icons/shield' },
    { label: 'Advanced system settings', target: () => K.dialogs.performance(ctx.win), icon: 'icons/settings' },
  ] });

  K.page('sy:system', {
    title: 'System', icon: 'icons/computer', parent: 'cat:system',
    keywords: ['system', 'computer', 'processor', 'memory', 'ram', 'rating', 'experience index', 'activation', 'computer name', 'workgroup', 'edition', 'about'],
    side: (ctx) => [{ links: [{ label: 'Control Panel Home', target: 'cp:home', bold: true }] }, systemTasks(ctx), seeAlso],
    build(ctx) {
      ['store:system.wei', 'store:system.computerName', 'store:system.workgroup', 'store:system.description', 'store:user.name'].forEach((ev) => ctx.bus(ev, ctx.invalidate));
      const w = K.sys.wei;
      const row = (k, v) => [h('dt', null, k), h('dd', null, v)];
      return h('div.sy-page', null,
        K.head('View basic information about your computer'),
        K.section('Aerium edition',
          h('div.sy-edition', null,
            h('div.sy-edition-text', null,
              h('div.sy-edition-name', null, K.sys.edition),
              h('div.cp-muted', null, 'Copyright © 2007 Aerium Playground. All rights reserved.'),
              h('div.cp-muted', null, K.sys.servicePack),
              K.link('Get more features with a new edition of Aerium', () => joke(ctx, { title: 'Aerium Anytime Upgrade', icon: 'icons/aerium', instruction: 'Aerium Ultimate is coming soon', message: 'It has everything in Home Premium, plus a slightly shinier Start orb and one extra bubble. Any day now.' }))),
            h('div.sy-logo', null, A.img('icons/aerium', { class: 'sy-logo-orb' }), A.img('icons/aerium', { class: 'sy-logo-reflect', 'aria-hidden': 'true' })))),
        K.section('System',
          h('dl.cp-kv.sy-kv', null,
            row('Rating:', h('span.sy-rating', null, h('button.sy-wei-btn', { type: 'button', onclick: () => ctx.go('sy:wei'), 'aria-label': 'Aerium Experience Index details', 'data-tip-title': 'Base score ' + fmtScore(w.base) + ' (lowest subscore)', 'data-tip': WEI_ROWS.map(([k, name]) => name + ' ' + fmtScore(w.sub[k] || 1)).join(' \u00b7 ') }, weiBadge(w.base)), K.link('Aerium Experience Index', () => ctx.go('sy:wei')), A.ui.button('Rate this computer', { size: 'sm', icon: K.icons.gauge, onClick: () => K.assess(ctx) }))),
            row('Processor:', K.sys.processor),
            row('Memory (RAM):', K.sys.memory),
            row('System type:', K.sys.type),
            row('Pen and Touch:', 'Your mouse does all the work, and it is very good at it.'))),
        K.section('Computer name, domain, and workgroup settings',
          h('div.sy-name', null,
            h('dl.cp-kv.sy-kv', null,
              row('Computer name:', K.sys.computerName),
              row('Full computer name:', K.sys.computerName),
              row('Computer description:', A.store.get('system.description', '') || (K.sys.userName + '\'s computer')),
              row('Workgroup:', K.sys.workgroup)),
            K.link('Change settings', () => changeName(ctx), { icon: 'icons/shield' }))),
        K.section('Aerium activation',
          h('div.sy-activation', null,
            A.ui.badge('Genuine', 'grass', 'burst'),
            h('div', null,
              h('div.sy-activated', null, 'Aerium is activated'),
              h('div.cp-muted', null, 'It\'s the real thing: genuine glass, certified bubbly, 100% fish-approved.'),
              h('div.sy-pid', null, h('span.cp-muted', null, 'Product ID: '), K.sys.productId, h('span.sy-gap'), K.link('Change product key', () => productKey(ctx)))))));
    },
  });

  K.page('sy:wei', {
    title: 'Performance Information and Tools', icon: 'gauge', parent: 'cat:system',
    keywords: ['performance', 'experience index', 'rating', 'score', 'rate', 'speed', 'benchmark'],
    side: (ctx) => [
      { links: [{ label: 'Control Panel Home', target: 'cp:home', bold: true },
        { label: 'Adjust visual effects', target: () => K.dialogs.performance(ctx.win) },
        { label: 'Adjust power settings', target: 'cp:power' },
        { label: 'Open Task Manager', target: { app: 'taskmgr' } }] },
      seeAlso,
    ],
    build(ctx) {
      ctx.bus('store:system.wei', ctx.invalidate);
      const w = K.sys.wei;
      const low = Math.min(...Object.values(w.sub));
      const rows = WEI_ROWS.map(([k, name, what]) => h('div.sy-wei-row', { class: Math.abs(w.sub[k] - low) < 0.001 && 'lowest' },
        h('span.sy-wei-comp', null, name), h('span.cp-muted', null, what), h('span.sy-wei-sub', null, fmtScore(w.sub[k] || 1))));
      return h('div.sy-page', null,
        K.head('Rate and improve your computer\'s performance', 'The Aerium Experience Index measures how well your computer runs glass, graphics, games and bubbles.'),
        h('div.sy-wei-table', null,
          h('div.sy-wei-grid', null,
            h('div.sy-wei-row.sy-wei-head', null, h('span', null, 'Component'), h('span', null, 'What is rated'), h('span', null, 'Subscore')),
            rows),
          h('div.sy-wei-base', null, h('div.cp-muted', null, 'Base score'), weiBadge(w.base, true), h('div.cp-fine', null, 'Determined by lowest subscore'))),
        h('div.sy-wei-actions', null,
          A.ui.button(w.date ? 'Update my score' : 'Rate this computer', { tone: 'aqua', icon: K.icons.gauge, onClick: () => K.assess(ctx) }),
          h('span.cp-muted', null, w.date ? 'Last update: ' + K.when(w.date) : 'Your computer hasn\'t been rated yet. These are the scores it came with.')),
        h('p.cp-fine', null, 'Scores range from 1.0 to 7.9. They come from tiny speed tests run right here in your browser, so they change a little each time.'),
        K.section('Tips for improving your computer\'s performance',
          h('div.cp-link-list', null,
            K.link('Adjust visual effects', () => K.dialogs.performance(ctx.win), { icon: 'icons/settings' }),
            K.link('Adjust power settings', () => ctx.go('cp:power'), { icon: 'icons/battery' }),
            K.link('Feed the fish (they swim faster when they\'re happy)', () => joke(ctx, { title: 'Performance Tip', icon: 'icons/fish', instruction: 'Click anywhere on the fish tank to drop food', message: 'Happy fish make for a happy computer. That\'s just science.' }), { icon: 'icons/fish' }))));
    },
  });

  // ============================================================ Device Manager
  const DEVICES = [
    ['Aquarium controllers', 'icons/aquarium', [['Glassfish Tank Interface', 'The fish are connected and happy.'], ['Bubble Pump (quiet mode)', 'Pumping about 7 bubbles a minute, as tradition requires.']]],
    ['Bubble generators', 'icons/bubble', [['Aerium Bubble Generator', 'Producing bubbles at the recommended rate.'], ['Aerium Bubble Generator #2', 'Standing by in case of a bubble shortage.']]],
    ['Computer', 'icons/computer', [['ACPI Aerium-Compatible Glossy PC', 'Glossy on the outside, glossy on the inside.']]],
    ['Disk drives', 'icons/disc', [['AERIUM GLASS-160 160GB', 'Spinning happily. Your files are safe in the browser.']]],
    ['Display adapters', 'icons/monitor', [['AquaGlass 256 MB', 'Rendering glass, streaks and shine at full speed.']]],
    ['DVD/CD-ROM drives', 'icons/disc', [['DVD+-RW BUBBLE-2000', 'Ready to burn mix CDs. Please label them.']]],
    ['Floppy disk drives', 'icons/document', [['Floppy disk drive', 'Still here, just in case. It holds 1.44 MB of nostalgia.']]],
    ['Keyboards', K.icons.keyboard, [['Standard 101/102-Key Keyboard', 'All keys present, including the ones nobody uses.']]],
    ['Mice and other pointing devices', K.icons.mouse, [['Glossy Optical Mouse', 'The little red light is on. Everything is fine.']]],
    ['Monitors', 'icons/monitor', [['Generic Glossy Monitor', 'Showing you this very message.']]],
    ['Network adapters', 'icons/wifi', [['Aerium Wireless 802.11g Adapter', '54 Mbps! That was a lot, once.']]],
    ['Processors', K.icons.gauge, [['AeroCore Duo CPU 2.40GHz', 'Core one is thinking.'], ['AeroCore Duo CPU 2.40GHz', 'Core two is thinking about lunch.']]],
    ['Sound, video and game controllers', 'icons/speaker', [['Aerium High Definition Audio', 'Crystal Chime Edition. Every sound is made fresh.']]],
  ];
  K.dialogs.deviceManager = function (win) {
    const tree = h('div.sy-tree', { role: 'tree', 'aria-label': 'Devices' });
    const root = h('div.sy-tree-root', null, A.img('icons/computer'), h('b', null, K.sys.computerName));
    tree.appendChild(root);
    const showDevice = (name, msg, icon) => A.ui.messageBox({ parent: dlgWin, title: name + ' Properties', icon: K.ic(icon), instruction: 'This device is working properly.', message: msg, sound: false });
    let dlgWin = null;
    DEVICES.forEach(([cat, icon, kids], i) => {
      const children = h('div.sy-tree-kids', { hidden: true, role: 'group' }, kids.map(([name, msg]) => {
        const leaf = h('button.sy-tree-leaf', { type: 'button', role: 'treeitem' }, A.img(K.ic(icon)), h('span', null, name));
        leaf.addEventListener('dblclick', () => showDevice(name, msg, icon));
        leaf.addEventListener('keydown', (e) => { if (e.key === 'Enter') showDevice(name, msg, icon); });
        return leaf;
      }));
      const tw = h('span.sy-tree-tw', { 'aria-hidden': 'true' });
      const node = h('button.sy-tree-node', { type: 'button', role: 'treeitem', 'aria-expanded': 'false' }, tw, A.img(K.ic(icon)), h('span', null, cat));
      node.addEventListener('click', () => {
        children.hidden = !children.hidden;
        node.setAttribute('aria-expanded', String(!children.hidden));
        node.classList.toggle('open', !children.hidden);
        A.sound.play('click');
      });
      if (i === 1) { children.hidden = false; node.classList.add('open'); node.setAttribute('aria-expanded', 'true'); }
      tree.append(node, children);
    });
    const content = h('div.cp-dlg.sy-devmgr', null, h('div.ae-toolbar.sy-devmgr-bar', null, h('button.ae-tool', { type: 'button', onclick: () => { A.sound.play('click'); A.notify({ title: 'Device Manager', text: 'Aerium scanned for hardware changes. Everything is exactly where you left it.', icon: 'icons/settings', sound: false }); } }, A.img('icons/search'), 'Scan for hardware changes')), tree,
      h('div.cp-fine', null, 'Double-click a device to see how it is doing.'));
    A.ui.dialog({ parent: win, title: 'Device Manager', icon: 'icons/settings', content, width: 470, buttons: [{ label: 'Close', default: true, cancel: true }], onOpen: (w) => { dlgWin = w; } });
  };

  // ============================================================ Performance Options
  K.dialogs.performance = function (win) {
    let transp = !!A.store.get('glass.transparency');
    let blur = A.store.get('effects.level') !== 'performance';
    let mode = transp && blur ? 'auto' : !transp && !blur ? 'performance' : 'custom';
    const tCheck = A.ui.checkbox({ label: 'Enable transparent glass', checked: transp, onChange: (v) => { transp = v; setMode('custom'); } });
    const bCheck = A.ui.checkbox({ label: 'Blur what is behind the glass', checked: blur, onChange: (v) => { blur = v; setMode('custom'); } });
    const fixed = ['Animate windows when minimizing and maximizing', 'Fade or slide menus into view', 'Show shadows under windows', 'Smooth edges of screen fonts', 'Use visual styles on windows and buttons'].map((l) => A.ui.checkbox({ label: l, checked: true, disabled: true }));
    const radios = A.ui.radioGroup({ value: mode, options: [['auto', 'Let Aerium choose what\'s best for my computer'], ['appearance', 'Adjust for best appearance'], ['performance', 'Adjust for best performance'], ['custom', 'Custom:']], onChange: (v) => {
      mode = v;
      if (v === 'auto' || v === 'appearance') { transp = true; blur = true; }
      if (v === 'performance') { transp = false; blur = false; }
      tCheck.checked = transp; bCheck.checked = blur;
    } });
    function setMode(v) { mode = v; radios.querySelectorAll('input').forEach((i) => { i.checked = i.value === v; }); }
    const content = h('div.cp-dlg.sy-perf', null,
      h('p', null, 'Select the settings you want to use for the appearance and performance of Aerium on this computer.'),
      radios,
      h('div.sy-perf-list', null, tCheck, bCheck, fixed, h('div.cp-fine', null, 'The grayed-out effects are always on. Aerium can\'t help itself.')));
    A.ui.dialog({ parent: win, title: 'Performance Options', icon: 'icons/settings', content, width: 450, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] }).then((r) => {
      if (r !== 'ok') return;
      A.store.set('effects.level', blur ? 'best' : 'performance');
      A.theme.applyEffects();
      A.theme.setGlass({ transparency: transp });
      A.sound.play('select');
    });
  };

  // ============================================================ System Protection (restore points for your look)
  const RESTORE_KEYS = ['theme', 'glass.color', 'glass.custom', 'glass.intensity', 'glass.transparency', 'wallpaper', 'wallpaper.fit', 'cursor.scheme', 'cursor.trails', 'sound.enabled', 'sound.volume', 'screensaver.id', 'screensaver.wait', 'pz.taskbar'];
  function snapshot() { const d = {}; RESTORE_KEYS.forEach((k) => { d[k] = K.clone(A.store.get(k)); }); return d; }
  function applySnapshot(d) {
    RESTORE_KEYS.forEach((k) => { if (k in d && d[k] !== undefined) A.store.set(k, K.clone(d[k])); });
    document.documentElement.dataset.theme = A.theme.THEMES[A.store.get('theme')] ? A.store.get('theme') : 'light';
    A.theme.apply();
    A.theme.setWallpaper(A.store.get('wallpaper'), A.store.get('wallpaper.fit'));
    A.bus.emit('theme:change', A.store.get('theme'));
  }
  K.dialogs.protection = function (win) {
    let dlgWin = null;
    let sel = 0;
    const list = h('div.sy-rp-list', { role: 'listbox', 'aria-label': 'Restore points' });
    const restoreBtn = A.ui.button('Restore...', { size: 'sm', onClick: () => restore() });
    const delBtn = A.ui.button('Delete', { size: 'sm', onClick: () => { const p = points(); p.splice(sel, 1); A.store.set('system.restorePoints', p); sel = 0; render(); A.sound.play('recycle'); } });
    const points = () => (A.store.get('system.restorePoints', []) || []).slice();
    function render() {
      list.innerHTML = '';
      const p = points();
      if (!p.length) list.appendChild(h('div.sy-rp-empty', null, 'No restore points yet. Create one before you try something bold, like Lime glass at full intensity.'));
      p.forEach((pt, i) => {
        const row = h('button.sy-rp', { type: 'button', role: 'option', class: i === sel && 'selected', 'aria-selected': String(i === sel) }, A.img('icons/shield'), h('span.sy-rp-name', null, pt.name), h('span.cp-muted', null, K.when(pt.date)));
        row.addEventListener('click', () => { sel = i; render(); });
        row.addEventListener('dblclick', () => { sel = i; restore(); });
        list.appendChild(row);
      });
      restoreBtn.disabled = delBtn.disabled = !p.length;
    }
    async function create() {
      const name = await A.ui.prompt({ parent: dlgWin, title: 'Create a Restore Point', message: 'Type a description to help you recognize this restore point. The current date and time are added automatically.', value: 'Before I changed the glass color' });
      if (name == null) return;
      const ok = await K.progress({ parent: dlgWin, title: 'System Protection', icon: 'icons/shield', instruction: 'Creating a restore point...', steps: [{ text: 'Remembering your glass color...', ms: 700 }, { text: 'Remembering your background and pointers...', ms: 700 }, { text: 'Writing it down very neatly...', ms: 600 }] });
      if (!ok) return;
      const p = points();
      p.unshift({ name: name.trim() || 'Restore point', date: Date.now(), data: snapshot() });
      A.store.set('system.restorePoints', p.slice(0, 6));
      sel = 0;
      render();
      A.ui.messageBox({ parent: dlgWin, title: 'System Protection', icon: 'success', instruction: 'The restore point was created successfully', message: 'If a change doesn\'t work out, come back here and restore your look to exactly how it is now.' });
    }
    async function restore() {
      const pt = points()[sel];
      if (!pt) return;
      const go = await A.ui.confirm('Restore your theme, glass color, background, pointers, sounds and taskbar to how they were at "' + pt.name + '"?', { parent: dlgWin, title: 'System Restore', icon: 'question' });
      if (!go) return;
      const ok = await K.progress({ parent: dlgWin, title: 'System Restore', icon: 'icons/shield', instruction: 'Restoring your computer...', steps: [{ text: 'Restoring the glass...', ms: 700 }, { text: 'Restoring the background...', ms: 700 }, { text: 'Restoring pointers and sounds...', ms: 600 }] });
      if (!ok) return;
      applySnapshot(pt.data || {});
      A.sound.play('win');
      A.notify({ title: 'System Restore completed', text: 'Your look was restored to "' + pt.name + '".', icon: 'icons/shield', sound: false });
    }
    render();
    const content = h('div.cp-dlg.sy-rp-dlg', null,
      h('p', null, 'Restore points remember how Aerium looks: the theme, glass color, background, pointers, sounds and taskbar. Your files are not affected.'),
      list,
      h('div.cp-row.sy-rp-actions', null, A.ui.button('Create...', { size: 'sm', tone: 'grass', onClick: create }), restoreBtn, delBtn));
    A.ui.dialog({ parent: win, title: 'System Protection', icon: 'icons/shield', content, width: 470, buttons: [{ label: 'Close', default: true, cancel: true }], onOpen: (w) => { dlgWin = w; } });
  };

  // ============================================================ About Aerium (winver)
  A.apps.register({
    id: 'winver',
    name: 'About Aerium',
    icon: 'icons/aerium',
    color: '#3aa6f5',
    category: 'system',
    hidden: true,
    single: true,
    description: 'Version and license information.',
    keywords: ['about', 'version', 'winver', 'license'],
    window: { width: 470, height: 'auto', resizable: false, maximizable: false, minimizable: false },
    launch(win) {
      const name = h('b');
      const pc = h('span');
      const upd = () => { name.textContent = K.sys.userName; pc.textContent = K.sys.computerName; };
      upd();
      const offs = [A.store.on('user.name', upd), A.store.on('system.computerName', upd)];
      const ok = A.ui.button('OK', { tone: 'aqua', onClick: () => win.close() });
      ok.style.minWidth = '84px';
      win.body.classList.add('sy-about');
      win.body.append(
        h('div.sy-about-banner', null,
          h('div.sy-about-rays', { 'aria-hidden': 'true' }),
          A.img('icons/aerium', { class: 'sy-about-orb' }),
          h('div.sy-about-word', null, h('span', null, 'Aerium'), h('small', null, 'Home Premium'))),
        h('div.sy-about-body', null,
          h('p', null, 'Aerium', h('br'), 'Version ' + K.sys.version + ' (Build ' + K.sys.build + ': ' + K.sys.servicePack + ')', h('br'), 'Copyright © 2007 Aerium Playground. All rights reserved.'),
          h('p', null, 'The Aerium Home Premium playground and its glossy user interface are made with care, a lot of gradients and at least seven bubbles.'),
          h('div.sy-about-hr'),
          h('p', null, 'This product is licensed under the Aerium Playground License Terms to:'),
          h('p.sy-about-lic', null, name, h('br'), pc),
          h('p.cp-muted', null, 'Physical memory available to Aerium: 2,097,152 KB')),
        h('div.sy-about-foot', null, ok));
      win.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); win.close(); } });
      setTimeout(() => { win.fitContent && win.fitContent(); win.center(); ok.focus({ preventScroll: true }); }, 30);
      return { onClose() { offs.forEach((off) => off && off()); } };
    },
  });

  // ============================================================ app
  A.apps.register({
    id: 'system',
    name: 'System',
    icon: 'icons/computer',
    color: '#3aa6f5',
    category: 'settings',
    description: 'See basic information about your computer and rate its performance.',
    keywords: ['system', 'computer', 'processor', 'memory', 'ram', 'experience index', 'rating', 'performance', 'about', 'activation', 'computer name', 'properties'],
    single: true,
    window: { width: 860, height: 610, minWidth: 560, minHeight: 380, glassBody: true },
    launch(win, args) {
      const start = (p) => (p === 'performance' || p === 'wei' ? 'sy:wei' : 'sy:system');
      const frame = K.frame(win, { start: start(args && args.page) });
      return {
        onArgs(a) { frame.go(start(a && a.page)); },
        onClose() { frame.destroy(); },
      };
    },
  });
})();
