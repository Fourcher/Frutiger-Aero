/* Task Manager: Applications, Processes, Services, Performance, Networking
   and Users. Live per-core CPU graphs, memory and network history, real
   window control, a CPU meter in the notification area, and a crowd of
   believable background processes. Timers stop when it closes. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;

  // ============================================================ shared process model
  // Task Manager and the Command Prompt (tasklist, taskkill) read the same list,
  // so a PID in one matches the other. Exposed as Aerium.procmon.
  const TOTAL_MB = 2047;
  // image, user (USER = whoever is logged on), memory in K, CPU appetite, description, flags
  const FAKE = [
    ['System Idle Process', 'SYSTEM', 24, 0, 'Percentage of time the processor is idle', 'idle critical'],
    ['System', 'SYSTEM', 1320, 0.25, 'Aerium Kernel and System', 'critical'],
    ['smss.exe', 'SYSTEM', 428, 0, 'Session Manager Subsystem', 'critical'],
    ['csrss.exe', 'SYSTEM', 3480, 0.3, 'Client Server Runtime Process', 'critical'],
    ['aeinit.exe', 'SYSTEM', 1864, 0, 'Aerium Start-Up Application', 'critical'],
    ['services.exe', 'SYSTEM', 4212, 0.1, 'Services and Controller App', 'critical'],
    ['lsass.exe', 'SYSTEM', 3904, 0.05, 'Local Security Authority Process', 'critical'],
    ['svchost.exe', 'SYSTEM', 5240, 0.3, 'Host Process for Services', ''],
    ['svchost.exe', 'NETWORK SERVICE', 7160, 0.2, 'Host Process for Services', ''],
    ['svchost.exe', 'LOCAL SERVICE', 9820, 0.2, 'Host Process for Services', ''],
    ['svchost.exe', 'SYSTEM', 26480, 0.45, 'Host Process for Services', ''],
    ['spoolsv.exe', 'SYSTEM', 4812, 0, 'Spooler SubSystem App', ''],
    ['soundsynth.exe', 'LOCAL SERVICE', 11840, 0.45, 'Aerium Sound Synthesizer', ''],
    ['findbuddy.exe', 'SYSTEM', 16920, 0.3, 'Search Indexer', ''],
    ['defender.exe', 'SYSTEM', 14260, 0.25, 'Aerium Defender', ''],
    ['glass.exe', 'USER', 38220, 1.3, 'Desktop Window Manager', 'critical'],
    ['aeroshell.exe', 'USER', 29840, 0.9, 'Aerium Desktop and Taskbar', 'shell'],
    ['sidebar.exe', 'USER', 21420, 0.6, 'Aerium Desktop Gadgets', ''],
    ['bubblesrv.exe', 'USER', 8640, 0.2, 'Bubble Messenger Presence', ''],
    ['fishfeeder.exe', 'USER', 6212, 0.35, 'Aquarium Auto-Feeder', 'fish'],
    ['taskeng.exe', 'USER', 5432, 0.02, 'Task Scheduler Engine', ''],
  ];
  const FAKE_PIDS = [0, 4, 268, 352, 404, 452, 464, 616, 692, 760, 812, 1044, 1236, 1328, 1496, 1604, 1732, 1868, 1916, 2004, 2140];
  const IMAGE = { calculator: 'calc.exe', paint: 'paint.exe', notepad: 'notepad.exe', cmd: 'cmd.exe', taskmgr: 'taskmgr.exe', browser: 'horizon.exe', messenger: 'bubblemsgr.exe', mediaplayer: 'aeplayer.exe', explorer: 'explorer.exe', controlpanel: 'control.exe', stickynotes: 'stikynot.exe' };
  const APP_MEM = { browser: 64200, mediaplayer: 48400, paint: 36800, messenger: 31200, explorer: 27600, photos: 42000, channels: 39800, aquarium: 52000, controlpanel: 22400, personalize: 24800, calculator: 7200, notepad: 4600, cmd: 2900, taskmgr: 9800, games: 18600, solitaire: 17200, minesweeper: 12800 };
  const BUSY_APPS = /mediaplayer|aquarium|channels|games|solitaire|minesweeper|pairs|bubble|paint|screensaver/;

  const pm = {
    fakes: FAKE.map((f, i) => ({ key: 'f' + i, image: f[0], userKind: f[1], mem: f[2], weight: f[3], desc: f[4], flags: f[5], pid: FAKE_PIDS[i], cpu: 0, deadUntil: 0 })),
    apps: new Map(),   // window -> process
    notes: null,
    nextPid: 2208,
    total: 3, cores: [3, 3], kernel: 1, net: 0.05, activity: 0,
    lastTick: 0,
  };
  const uname = () => A.store.get('user.name') || 'User';
  const userOf = (p) => (p.userKind === 'USER' ? uname() : p.userKind);
  const newPid = () => (pm.nextPid += 4 * (1 + Math.floor(Math.random() * 12)));
  const imageFor = (id) => IMAGE[id] || String(id).replace(/[^a-z0-9]/gi, '').toLowerCase() + '.exe';

  function sync() {
    const now = Date.now();
    const live = new Set();
    A.wm.windows.forEach((w) => {
      if (!w.app || !w.taskbar || w.closed) return;
      live.add(w);
      if (!pm.apps.has(w)) {
        const app = A.apps.get(w.app);
        pm.apps.set(w, { key: 'w' + w.id, win: w, image: imageFor(w.app), userKind: 'USER', mem: (APP_MEM[w.app] || 16000) * (0.9 + Math.random() * 0.2), weight: BUSY_APPS.test(w.app) ? 2.2 : 0.5, desc: app ? app.name : w.title, flags: 'app', pid: newPid(), cpu: 0 });
      }
    });
    for (const w of Array.from(pm.apps.keys())) if (!live.has(w)) pm.apps.delete(w);
    const hasNotes = !!document.querySelector('.sn-note');
    if (hasNotes && !pm.notes) pm.notes = { key: 'notes', image: 'stikynot.exe', userKind: 'USER', mem: 5480, weight: 0.1, desc: 'Sticky Notes', flags: 'notes', pid: newPid(), cpu: 0 };
    if (!hasNotes) pm.notes = null;
    pm.fakes.forEach((f) => { if (f.deadUntil && now >= f.deadUntil) { f.deadUntil = 0; f.pid = newPid(); f.cpu = 0; if (f.flags.includes('fish')) A.notify({ title: 'The fish got hungry', text: 'fishfeeder.exe started again all by itself.', icon: 'icons/fish' }); } });
  }
  function all() {
    const out = pm.fakes.filter((f) => !f.deadUntil);
    pm.apps.forEach((p) => out.push(p));
    if (pm.notes) out.push(pm.notes);
    return out;
  }
  function tick() {
    sync();
    const now = performance.now();
    if (now - pm.lastTick < 120) return;
    pm.lastTick = now;
    const act = Math.min(1, pm.activity / 60);
    pm.activity = 0;
    let total = 0;
    all().forEach((p) => {
      if (p.flags.includes('idle')) return;
      let target = p.weight * (0.4 + Math.random() * 1.2);
      if (p.win) {
        if (A.wm.active === p.win) target += 0.8 + Math.random() * 1.6;
        if (p.win.state === 'minimized') target *= 0.3;
        if (p.win.notResponding) target = 0;
      }
      if (p.flags.includes('shell') || p.image === 'glass.exe') target += act * (4 + Math.random() * 6);
      if (Math.random() < 0.015) target += 6 + Math.random() * 30; // a busy moment (indexing, updates)
      p.cpu = p.cpu * 0.45 + target * 0.55;
      if (p.cpu < 0.35) p.cpu = 0;
      p.mem = Math.max(300, p.mem * (1 + (Math.random() - 0.48) * (p.win ? 0.012 : 0.004)));
      total += p.cpu;
    });
    total = clamp(total, 0, 100);
    const idle = pm.fakes[0];
    idle.cpu = 100 - total;
    const d = (Math.random() - 0.5) * Math.min(total, 100 - total) * 0.8;
    pm.total = total;
    pm.cores = [clamp(total + d, 0, 100), clamp(total - d, 0, 100)];
    pm.kernel = total * (0.18 + Math.random() * 0.2);
    const netApps = A.wm.windows.filter((w) => /browser|messenger|mediaplayer|channels/.test(w.app || '')).length;
    pm.net = clamp(pm.net * 0.55 + (Math.random() < 0.1 + netApps * 0.12 ? Math.random() * (0.4 + netApps * 1.6) : Math.random() * 0.06), 0, 100);
  }
  function memory() {
    const procK = all().reduce((s, p) => s + p.mem, 0);
    const used = Math.min(TOTAL_MB - 80, 412 + procK / 1024 + Math.sin(Date.now() / 12000) * 12);
    const free = TOTAL_MB - used;
    return { total: TOTAL_MB, used, free, cached: free * 0.62, commit: used * 1.32 };
  }

  // Ending aeroshell.exe makes the taskbar and icons vanish, then Aerium starts it again.
  let shellBusy = false;
  function restartShell() {
    if (shellBusy) return;
    shellBusy = true;
    const els = ['ae-taskbar', 'ae-icons'].map((id) => document.getElementById(id)).filter(Boolean);
    if (A.startmenu && A.startmenu.close) A.startmenu.close();
    els.forEach((el) => { el.style.transition = 'opacity .15s'; el.style.opacity = '0'; el.style.pointerEvents = 'none'; });
    A.sound.play('close');
    setTimeout(() => {
      els.forEach((el) => { el.style.transition = 'opacity .7s'; el.style.opacity = ''; el.style.pointerEvents = ''; });
      setTimeout(() => els.forEach((el) => { el.style.transition = ''; }), 800);
      shellBusy = false;
      A.notify({ title: 'Aerium restarted the desktop', text: 'aeroshell.exe stopped, so the taskbar and desktop icons were started again.', icon: 'icons/info' });
    }, 3000);
  }
  function kill(pid) {
    sync();
    const p = all().find((x) => x.pid === pid);
    if (!p) return { ok: false, reason: 'notfound' };
    if (p.flags.includes('critical')) return { ok: false, critical: true, idle: p.flags.includes('idle'), p };
    if (p.win) { if (!p.win.closed) p.win.close(true); pm.apps.delete(p.win); return { ok: true, p }; }
    if (p.flags.includes('notes')) { A.bus.emit('stickynotes:hide'); pm.notes = null; return { ok: true, p }; }
    if (p.flags.includes('shell')) { restartShell(); p.deadUntil = Date.now() + 3200; return { ok: true, p, shell: true }; }
    p.deadUntil = Date.now() + (p.flags.includes('fish') ? 25000 : 20000 + Math.random() * 40000);
    return { ok: true, p };
  }
  function snapshot() {
    return all().map((p) => ({ key: p.key, pid: p.pid, image: p.image, user: userOf(p), cpu: p.cpu, mem: p.mem, desc: p.desc, win: p.win || null, critical: p.flags.includes('critical'), idle: p.flags.includes('idle'), shell: p.flags.includes('shell'), notes: p.flags.includes('notes') }));
  }
  A.procmon = {
    tick,
    list: snapshot,
    kill,
    memory,
    cpu: () => ({ total: pm.total, cores: pm.cores.slice(), kernel: pm.kernel }),
    net: () => pm.net,
    poke: (n) => { pm.activity += n || 1; },
  };

  // ============================================================ the app
  const SPEEDS = { High: 500, Normal: 1000, Low: 4000, Paused: 0 };
  const TABS = [['applications', 'Applications'], ['processes', 'Processes'], ['services', 'Services'], ['performance', 'Performance'], ['networking', 'Networking'], ['users', 'Users']];
  const HIST = 100;
  const pad2 = (n) => String(n).padStart(2, '0');
  const num = (n) => Math.round(n).toLocaleString('en-US');

  A.apps.register({
    id: 'taskmgr',
    name: 'Task Manager',
    icon: 'icons/taskmgr',
    color: '#3fae49',
    category: 'system',
    description: 'Shows the programs and processes running on your computer, and how busy it is.',
    keywords: ['task', 'manager', 'taskmgr', 'processes', 'performance', 'cpu', 'memory', 'end task'],
    single: true,
    window: { width: 540, height: 570, minWidth: 460, minHeight: 440 },
    launch(win, args) {
      let speed = A.store.get('taskmgr.speed', 'Normal');
      if (!(speed in SPEEDS)) speed = 'Normal';
      let minimizeOnUse = A.store.get('taskmgr.minimizeOnUse', true) !== false;
      let onTop = A.store.get('taskmgr.onTop', false) === true;
      let perCore = A.store.get('taskmgr.perCore', true) !== false;
      let kernelTimes = A.store.get('taskmgr.kernel', false) === true;
      let showAllUsers = true;
      let tab = TABS.some(([id]) => id === (args && args.tab)) ? args.tab : A.store.get('taskmgr.tab', 'applications');
      if (!TABS.some(([id]) => id === tab)) tab = 'applications';
      let sortCol = 'image', sortDir = 1;
      let selWin = null, selProc = null, selSvc = null;
      let timer = null, samples = 0;
      const priority = new Map();
      // Histories start with a little made-up past, as if the computer had been busy before you looked.
      const seedHist = (lo, hi) => { const a = []; let v = (lo + hi) / 2; for (let i = 0; i < HIST; i++) { v = clamp(v + (Math.random() - 0.5) * (hi - lo) * 0.4, lo, hi); a.push(v); } return a; };
      A.procmon.tick();
      const memNow = (A.procmon.memory().used / TOTAL_MB) * 100;
      const hist = { c0: seedHist(1, 16), c1: seedHist(1, 13), cpu: seedHist(1, 13), kern: seedHist(0, 4), mem: seedHist(memNow - 0.6, memNow + 0.6), net: seedHist(0, 0.4) };

      // ------------------------------------------------------------ chrome
      win.body.classList.add('tm');
      const menubar = A.ui.menubar([
        { label: 'File', items: () => [
          { label: 'New Task (Run...)', onClick: newTask },
          { separator: true },
          { label: 'Exit Task Manager', onClick: () => win.close() },
        ] },
        { label: 'Options', items: () => [
          { label: 'Always On Top', checked: onTop, onClick: () => { onTop = !onTop; A.store.set('taskmgr.onTop', onTop); if (onTop) raise(); } },
          { label: 'Minimize On Use', checked: minimizeOnUse, onClick: () => { minimizeOnUse = !minimizeOnUse; A.store.set('taskmgr.minimizeOnUse', minimizeOnUse); } },
          { label: 'Show 16-bit Tasks', checked: true, disabled: true },
        ] },
        { label: 'View', items: () => [
          { label: 'Refresh Now', shortcut: 'F5', onClick: () => update(true) },
          { label: 'Update Speed', submenu: Object.keys(SPEEDS).map((k) => ({ label: k, checked: speed === k, radio: true, onClick: () => setSpeed(k) })) },
          { separator: true },
          { label: 'CPU History', disabled: tab !== 'performance', submenu: [
            { label: 'One Graph, All CPUs', checked: !perCore, radio: true, onClick: () => { perCore = false; A.store.set('taskmgr.perCore', false); render(); } },
            { label: 'One Graph Per CPU', checked: perCore, radio: true, onClick: () => { perCore = true; A.store.set('taskmgr.perCore', true); render(); } },
          ] },
          { label: 'Show Kernel Times', checked: kernelTimes, disabled: tab !== 'performance', onClick: () => { kernelTimes = !kernelTimes; A.store.set('taskmgr.kernel', kernelTimes); update(true); } },
        ] },
        { label: 'Windows', items: () => {
          const w = A.wm.get(selWin);
          const onApps = tab === 'applications';
          return [
            { label: 'Tile Horizontally', disabled: !onApps, onClick: () => A.wm.arrange('stack') },
            { label: 'Tile Vertically', disabled: !onApps, onClick: () => A.wm.arrange('side') },
            { label: 'Minimize', disabled: !onApps || !w, onClick: () => w && w.minimize() },
            { label: 'Maximize', disabled: !onApps || !w, onClick: () => w && w.maximize() },
            { label: 'Cascade', disabled: !onApps, onClick: () => A.wm.arrange('cascade') },
            { label: 'Bring To Front', disabled: !onApps || !w, onClick: () => w && bringToFront(w) },
          ];
        } },
        { label: 'Help', items: () => [
          { label: 'Task Manager Help Topics', onClick: help },
          { separator: true },
          { label: 'About Task Manager', onClick: () => A.ui.messageBox({ parent: win, icon: 'icons/taskmgr', title: 'About Task Manager', instruction: 'Aerium Task Manager', message: 'Version 7.0 (Build 2007)\n\nKeeping an eye on every process, and on the fish.', sound: false }) },
        ] },
      ]);
      const tabBar = h('div.tm-tabs', { role: 'tablist' });
      TABS.forEach(([id, label]) => {
        const b = h('button.tm-tab', { type: 'button', role: 'tab', dataset: { tab: id } }, label);
        b.addEventListener('click', () => selectTab(id));
        tabBar.appendChild(b);
      });
      const page = h('div.tm-page', { role: 'tabpanel' });
      const stProc = h('span.tm-st'), stCpu = h('span.tm-st'), stMem = h('span.tm-st');
      const status = h('div.ae-statusbar.tm-status', null, stProc, h('span.ae-status-cell', null, stCpu), h('span.ae-status-cell', null, stMem));
      win.body.append(menubar, h('div.tm-frame', null, tabBar, page), status);

      // ------------------------------------------------------------ the heartbeat
      function update(force) {
        A.procmon.tick();
        const c = A.procmon.cpu(), m = A.procmon.memory();
        const push = (arr, v) => { arr.push(v); if (arr.length > HIST) arr.shift(); };
        push(hist.c0, c.cores[0]); push(hist.c1, c.cores[1]); push(hist.cpu, c.total); push(hist.kern, c.kernel);
        push(hist.mem, (m.used / m.total) * 100); push(hist.net, A.procmon.net());
        samples++;
        const count = A.procmon.list().length;
        stProc.textContent = 'Processes: ' + count;
        stCpu.textContent = 'CPU Usage: ' + Math.round(c.total) + '%';
        stMem.textContent = 'Physical Memory: ' + Math.round((m.used / m.total) * 100) + '%';
        drawTray(c.total);
        if (win.state === 'minimized' && !force) return;
        const fn = UPDATERS[tab];
        if (fn) fn(c, m);
      }
      function setSpeed(k) {
        speed = k;
        A.store.set('taskmgr.speed', k);
        clearInterval(timer);
        timer = SPEEDS[k] ? setInterval(update, SPEEDS[k]) : null;
      }
      const onMove = () => A.procmon.poke(1);
      window.addEventListener('pointermove', onMove, { passive: true });

      // A tiny CPU meter lives in the notification area while Task Manager runs.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const trayCanvas = h('canvas.tm-tray', { width: 16 * dpr, height: 16 * dpr });
      let tray = null;
      if (A.taskbar && A.taskbar.addTrayIcon) {
        tray = A.taskbar.addTrayIcon({ id: 'taskmgr-cpu', icon: trayCanvas, tip: 'CPU Usage: 0%', onClick: () => { if (win.state === 'minimized') win.restore(); else win.focus(); } });
      }
      function drawTray(pct) {
        const ctx = trayCanvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#062010'; ctx.fillRect(2, 1, 12, 14);
        ctx.strokeStyle = 'rgba(160,255,170,.55)'; ctx.lineWidth = 1; ctx.strokeRect(2.5, 1.5, 11, 13);
        const lit = Math.round((pct / 100) * 6);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = i < Math.max(1, lit) ? '#39ff4a' : '#0f4a1a';
          ctx.fillRect(4, 12 - i * 2, 8, 1.4);
        }
        if (tray) tray.setTip('CPU Usage: ' + Math.round(pct) + '%');
      }

      // Always On Top keeps Task Manager above other windows when they get focus.
      function raise() { if (onTop && win.state !== 'minimized' && !win.closed) win.el.style.zIndex = ++A.wm.z; }
      const offFocus = A.bus.on('win:focus', (w) => { if (w !== win) raise(); });

      // ------------------------------------------------------------ tabs
      function selectTab(id) {
        if (id !== tab) A.sound.play('click');
        tab = id;
        A.store.set('taskmgr.tab', id);
        tabBar.querySelectorAll('.tm-tab').forEach((b) => { const on = b.dataset.tab === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
        render();
      }
      const RENDERERS = {}, UPDATERS = {};
      function render() {
        page.innerHTML = '';
        page.dataset.tab = tab;
        RENDERERS[tab]();
        update(true);
      }
      function bringToFront(w) { if (w.state === 'minimized') w.restore(); w.el.style.zIndex = ++A.wm.z; }
      function switchTo(w) {
        if (!w || w.closed) return;
        if (w.state === 'minimized') w.restore(); else w.focus();
        if (minimizeOnUse) win.minimize();
      }

      // ------------------------------------------------------------ list view
      // Rows update in place, so selection, scrolling and double-clicks survive the live refresh.
      function listView(cols, o = {}) {
        const tpl = cols.map((c) => c.w || '1fr').join(' ');
        const minW = cols.reduce((s, c) => s + (c.min || 60), 0);
        const head = h('div.tm-lv-head', { style: { gridTemplateColumns: tpl, minWidth: minW + 'px' } });
        cols.forEach((c) => {
          const th = h('button.tm-th', { type: 'button', tabIndex: -1, class: [c.align === 'r' && 'tm-r', o.onSort && 'tm-sortable'], dataset: { col: c.id } }, h('span.tm-th-label', null, c.label), h('span.tm-sort'));
          if (o.onSort) th.addEventListener('click', () => o.onSort(c.id));
          head.appendChild(th);
        });
        const rowsEl = h('div.tm-lv-rows', { style: { minWidth: minW + 'px' } });
        const empty = h('div.tm-empty', { hidden: true }, o.empty || '');
        const el = h('div.tm-lv', { tabIndex: 0, role: 'listbox' }, head, rowsEl, empty);
        const lv = { el, sel: null, keys: [] };
        lv.sortMark = (col, dir) => head.querySelectorAll('.tm-th').forEach((th) => {
          const on = th.dataset.col === col;
          th.classList.toggle('sorted', on);
          th.querySelector('.tm-sort').textContent = on ? (dir > 0 ? ' ▴' : ' ▾') : '';
        });
        lv.set = (rows) => {
          const existing = new Map(Array.from(rowsEl.children).map((r) => [r.dataset.key, r]));
          rows.forEach((r) => {
            let row = existing.get(r.key);
            if (row) existing.delete(r.key);
            else {
              row = h('div.tm-row', { role: 'option', dataset: { key: r.key }, style: { gridTemplateColumns: tpl } });
              cols.forEach((c) => row.appendChild(h('span.tm-cell', { class: c.align === 'r' && 'tm-r' })));
            }
            r.cells.forEach((cell, i) => {
              const box = row.children[i];
              if (cell instanceof Node) { const fc = box.firstChild; if (!fc || !fc.dataset || fc.dataset.sig !== cell.dataset.sig) box.replaceChildren(cell); }
              else if (box.textContent !== String(cell)) box.textContent = cell;
            });
            row.className = 'tm-row' + (r.key === lv.sel ? ' selected' : '') + (r.cls ? ' ' + r.cls : '');
            rowsEl.appendChild(row);
          });
          existing.forEach((row) => row.remove());
          lv.keys = rows.map((r) => r.key);
          empty.hidden = rows.length > 0;
        };
        lv.select = (key) => {
          lv.sel = key;
          Array.from(rowsEl.children).forEach((r) => r.classList.toggle('selected', r.dataset.key === key));
          if (o.onSelect) o.onSelect(key);
        };
        rowsEl.addEventListener('click', (e) => { const row = e.target.closest('.tm-row'); lv.select(row ? row.dataset.key : null); });
        rowsEl.addEventListener('dblclick', (e) => { const row = e.target.closest('.tm-row'); if (row && o.onOpen) o.onOpen(row.dataset.key); });
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const row = e.target.closest('.tm-row');
          if (row) { lv.select(row.dataset.key); if (o.onMenu) o.onMenu(row.dataset.key, e); }
        });
        el.addEventListener('keydown', (e) => {
          const i = lv.keys.indexOf(lv.sel);
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const next = lv.keys[Math.max(0, Math.min(lv.keys.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
            if (next) { lv.select(next); const r = rowsEl.querySelector('.tm-row.selected'); if (r) r.scrollIntoView({ block: 'nearest' }); }
          } else if (e.key === 'Enter' && lv.sel && o.onOpen) { e.preventDefault(); o.onOpen(lv.sel); }
          else if (e.key === 'Delete' && lv.sel && o.onDelete) { e.preventDefault(); o.onDelete(lv.sel); }
        });
        return lv;
      }
      const sigEl = (sig, ...children) => h('span.tm-namecell', { dataset: { sig } }, ...children);

      // ------------------------------------------------------------ Applications
      let appsLV = null, btnEnd = null, btnSwitch = null;
      RENDERERS.applications = () => {
        appsLV = listView([{ id: 'task', label: 'Task', min: 200 }, { id: 'status', label: 'Status', w: '120px', min: 120 }], {
          empty: 'No programs are running. Click New Task to start one.',
          onSelect: (k) => { selWin = k; updAppButtons(); },
          onOpen: (k) => switchTo(A.wm.get(k)),
          onMenu: (k, e) => appMenu(A.wm.get(k), e),
          onDelete: () => endTask(),
        });
        appsLV.sel = selWin;
        btnEnd = A.ui.button('End Task', { onClick: endTask });
        btnSwitch = A.ui.button('Switch To', { onClick: () => switchTo(A.wm.get(selWin)) });
        page.append(h('div.tm-pane', null, appsLV.el, h('div.tm-buttons', null, btnEnd, btnSwitch, A.ui.button('New Task...', { onClick: newTask }))));
      };
      UPDATERS.applications = () => {
        const wins = A.wm.windows.filter((w) => w.taskbar && w.app && !w.closed);
        if (selWin && !wins.some((w) => w.id === selWin)) selWin = null;
        appsLV.sel = selWin;
        appsLV.set(wins.map((w) => ({
          key: w.id,
          cls: w.notResponding ? 'tm-hung' : '',
          cells: [sigEl(w.icon + '|' + w.title, A.img(w.icon), h('span', null, w.title)), w.notResponding ? 'Not Responding' : 'Running'],
        })));
        updAppButtons();
      };
      function updAppButtons() {
        const ok = !!A.wm.get(selWin);
        if (btnEnd) btnEnd.disabled = !ok;
        if (btnSwitch) btnSwitch.disabled = !ok;
      }
      async function endTask(w) {
        w = w && w.el ? w : A.wm.get(selWin);
        if (!w || w.closed) return;
        if (w.notResponding) {
          const r = await A.ui.messageBox({
            parent: win, icon: 'warning', title: w.title.replace(/ \(Not Responding\)$/, ''),
            instruction: w.title.replace(/ \(Not Responding\)$/, '') + ' is not responding',
            message: 'If you end the program now, you might lose information that has not been saved.',
            buttons: [{ label: 'End Now', value: 'end', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }],
          });
          if (r === 'end') w.close(true);
        } else w.close();
        setTimeout(() => update(true), 250);
      }
      function appMenu(w, e) {
        if (!w) return;
        A.ui.menu([
          { label: 'Switch To', bold: true, onClick: () => switchTo(w) },
          { label: 'Bring To Front', onClick: () => bringToFront(w) },
          { separator: true },
          { label: 'Minimize', onClick: () => w.minimize() },
          { label: 'Maximize', disabled: w.o && (w.o.maximizable === false || w.o.resizable === false), onClick: () => w.maximize() },
          { separator: true },
          { label: 'End Task', onClick: () => endTask(w) },
          { label: 'Go To Process', onClick: () => { selProc = 'w' + w.id; selectTab('processes'); } },
        ], e.clientX, e.clientY);
      }

      // ------------------------------------------------------------ Processes
      let procLV = null, btnEndProc = null;
      const PCOLS = [
        { id: 'image', label: 'Image Name', w: 'minmax(130px, 1.2fr)', min: 130 },
        { id: 'user', label: 'User Name', w: 'minmax(84px, .8fr)', min: 84 },
        { id: 'cpu', label: 'CPU', w: '40px', align: 'r', min: 40 },
        { id: 'mem', label: 'Memory (Private Working Set)', w: 'minmax(120px, 1fr)', align: 'r', min: 120 },
        { id: 'desc', label: 'Description', w: 'minmax(150px, 1.5fr)', min: 150 },
      ];
      RENDERERS.processes = () => {
        procLV = listView(PCOLS, {
          onSort: (col) => { if (sortCol === col) sortDir = -sortDir; else { sortCol = col; sortDir = col === 'cpu' || col === 'mem' ? -1 : 1; } update(true); },
          onSelect: (k) => { selProc = k; if (btnEndProc) btnEndProc.disabled = !k; },
          onMenu: (k, e) => procMenu(k, e),
          onDelete: () => endProcess(),
        });
        procLV.sel = selProc;
        const all = A.ui.checkbox({ label: 'Show processes from all users', checked: showAllUsers, onChange: (v) => { showAllUsers = v; update(true); } });
        btnEndProc = A.ui.button('End Process', { onClick: endProcess, disabled: !selProc });
        page.append(h('div.tm-pane', null, procLV.el, h('div.tm-buttons', null, all, h('span.tm-spacer'), btnEndProc)));
        if (selProc) setTimeout(() => { const r = procLV.el.querySelector('.tm-row.selected'); if (r) r.scrollIntoView({ block: 'nearest' }); }, 0);
      };
      UPDATERS.processes = () => {
        const me = A.store.get('user.name') || 'User';
        let list = A.procmon.list();
        if (!showAllUsers) list = list.filter((p) => p.user === me);
        list.sort((a, b) => {
          const r = sortCol === 'cpu' ? a.cpu - b.cpu : sortCol === 'mem' ? a.mem - b.mem : String(a[sortCol]).localeCompare(String(b[sortCol]), undefined, { sensitivity: 'base' }) || a.pid - b.pid;
          return r * sortDir;
        });
        if (selProc && !list.some((p) => p.key === selProc)) selProc = null;
        procLV.sel = selProc;
        procLV.sortMark(sortCol, sortDir);
        procLV.set(list.map((p) => ({
          key: p.key,
          cells: [sigEl(p.image, h('span', null, p.image)), p.user, pad2(Math.min(99, Math.round(p.cpu))), num(p.mem) + ' K', p.desc],
        })));
        if (btnEndProc) btnEndProc.disabled = !selProc;
      };
      function funnyWarning(p) {
        if (p.idle) return 'The System Idle Process is just the computer relaxing between jobs. You can’t end relaxing. Everybody needs a break.';
        if (p.image === 'System') return 'System is the whole playground. Ending it would be like pulling the plug on the fish tank, so Task Manager politely refuses.';
        if (p.image === 'glass.exe') return 'Without glass.exe, every window would lose its shine and the bubbles would stop reflecting. Task Manager can’t let that happen.';
        return '"' + p.image + '" is holding the desktop together, a bit like glue. If it stopped, everything would fall apart, so Task Manager won’t end it.';
      }
      async function endProcess() {
        const p = A.procmon.list().find((x) => x.key === selProc);
        if (!p) return;
        if (p.critical) {
          A.ui.messageBox({ parent: win, icon: 'warning', title: 'Task Manager', instruction: 'Task Manager can’t end "' + p.image + '"', message: funnyWarning(p) });
          return;
        }
        const r = await A.ui.messageBox({
          parent: win, icon: 'warning', title: 'Task Manager',
          instruction: 'Do you want to end "' + p.image + '"?',
          message: 'If an open program is associated with this process, it will close and you will lose any unsaved data. If you end a system process, it might make the computer unstable. Are you sure you want to continue?',
          buttons: [{ label: 'End process', value: 'end', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }],
        });
        if (r !== 'end') return;
        const res = A.procmon.kill(p.pid);
        if (res.ok) { selProc = null; A.sound.play('close'); update(true); }
      }
      function procMenu(key, e) {
        const p = A.procmon.list().find((x) => x.key === key);
        if (!p) return;
        const cur = priority.get(key) || 'Normal';
        A.ui.menu([
          { label: 'End Process', onClick: endProcess },
          { separator: true },
          { label: 'Set Priority', submenu: ['Realtime', 'High', 'AboveNormal', 'Normal', 'BelowNormal', 'Low'].map((lvl) => ({
            label: lvl, radio: true, checked: cur === lvl,
            onClick: async () => {
              const ok = await A.ui.messageBox({ parent: win, icon: 'warning', title: 'Task Manager', instruction: 'Do you want to change the priority of "' + p.image + '"?', message: 'Changing the priority of some processes could make the computer unstable. The fish do not mind, though.', buttons: [{ label: 'Change priority', value: 'yes', default: true }, { label: 'Cancel', value: 'no', cancel: true }] });
              if (ok === 'yes') priority.set(key, lvl);
            },
          })) },
          { separator: true },
          { label: 'Properties', onClick: () => A.ui.messageBox({ parent: win, icon: 'info', title: p.image + ' Properties', instruction: p.image, message: 'Description: ' + p.desc + '\nProcess ID: ' + p.pid + '\nUser: ' + p.user + '\nMemory: ' + num(p.mem) + ' K', sound: false }) },
        ], e.clientX, e.clientY);
      }

      // ------------------------------------------------------------ Services
      const SERVICES = [
        ['AudioSynth', 'soundsynth.exe', 'Aerium Sound Synthesizer', 'LocalService', 'sound'],
        ['AeUpdate', null, 'Aerium Update (will ask to restart, eventually)', 'netsvcs', 'stopped'],
        ['BubblePresence', 'bubblesrv.exe', 'Bubble Messenger Presence', 'LocalService', ''],
        ['CloudRender', 'svchost.exe', 'Cloud Rendering Service', 'netsvcs', ''],
        ['Defender', 'defender.exe', 'Aerium Defender', 'secsvcs', ''],
        ['FindBuddy', 'findbuddy.exe', 'Search Indexer', '', ''],
        ['FishFeeder', 'fishfeeder.exe', 'Aquarium Auto-Feeder', 'aquarium', 'fish'],
        ['GlassDWM', 'glass.exe', 'Desktop Window Manager Session Manager', 'LocalSystem', 'critical'],
        ['HomeworkHelper', null, 'Homework Helper (it is Saturday)', '', 'stopped'],
        ['RainbowSvc', null, 'Rainbow Refraction Service', '', 'stopped'],
        ['Spooler', 'spoolsv.exe', 'Print Spooler', '', ''],
        ['Themes', 'svchost.exe', 'Themes', 'netsvcs', ''],
      ];
      const svcStopped = new Set(SERVICES.filter((s) => s[4] === 'stopped').map((s) => s[0]));
      let svcLV = null;
      function svcStatus(s, procs) {
        if (s[4] === 'sound') return A.store.get('sound.enabled') ? 'Running' : 'Stopped';
        if (s[4] === 'fish') return procs.some((p) => p.image === 'fishfeeder.exe') ? 'Running' : 'Stopped';
        return svcStopped.has(s[0]) ? 'Stopped' : 'Running';
      }
      RENDERERS.services = () => {
        svcLV = listView([
          { id: 'name', label: 'Name', w: 'minmax(110px, 1fr)', min: 110 }, { id: 'pid', label: 'PID', w: '48px', align: 'r', min: 48 },
          { id: 'desc', label: 'Description', w: 'minmax(170px, 2fr)', min: 170 }, { id: 'status', label: 'Status', w: '70px', min: 70 }, { id: 'group', label: 'Group', w: '90px', min: 90 },
        ], { onSelect: (k) => { selSvc = k; }, onMenu: (k, e) => svcMenu(k, e), onOpen: (k) => svcMenu(k, null) });
        svcLV.sel = selSvc;
        page.append(h('div.tm-pane', null, svcLV.el, h('div.tm-buttons', null, h('span.tm-hint', null, 'Right-click a service to start or stop it.'), h('span.tm-spacer'),
          A.ui.button('Services...', { onClick: () => A.ui.messageBox({ parent: win, icon: 'info', title: 'Services', instruction: 'The Services console is taking a nap', message: 'You can start and stop services right here. Right-click one to try it.', sound: false }) }))));
      };
      UPDATERS.services = () => {
        const procs = A.procmon.list();
        svcLV.sel = selSvc;
        svcLV.set(SERVICES.map((s) => {
          const st = svcStatus(s, procs);
          const p = s[1] && st === 'Running' ? procs.find((x) => x.image === s[1]) : null;
          return { key: s[0], cls: st === 'Stopped' ? 'tm-stopped' : '', cells: [s[0], p ? String(p.pid) : '', s[2], st, s[3]] };
        }));
      };
      function svcMenu(key, e) {
        const s = SERVICES.find((x) => x[0] === key);
        if (!s) return;
        const running = svcStatus(s, A.procmon.list()) === 'Running';
        const items = [
          { label: 'Start Service', disabled: running, onClick: () => setService(s, true) },
          { label: 'Stop Service', disabled: !running, onClick: () => setService(s, false) },
        ];
        if (e) A.ui.menu(items, e.clientX, e.clientY);
        else setService(s, !running);
      }
      function setService(s, on) {
        if (s[4] === 'critical' && !on) {
          A.ui.messageBox({ parent: win, icon: 'error', title: 'Services', instruction: 'Aerium could not stop the ' + s[0] + ' service', message: 'Access is denied. Every window would go flat without it.' });
          return;
        }
        if (s[4] === 'sound') {
          A.store.set('sound.enabled', on);
          if (on) A.sound.play('ding');
          A.notify({ title: on ? 'Sound is back on' : 'Sound is off', text: on ? 'The Aerium Sound Synthesizer is running again.' : 'You stopped the Aerium Sound Synthesizer. Start it again to hear things.', icon: 'icons/speaker', sound: false });
        } else if (s[4] === 'fish') {
          if (!on) { const p = A.procmon.list().find((x) => x.image === 'fishfeeder.exe'); if (p) A.procmon.kill(p.pid); }
          else A.ui.messageBox({ parent: win, icon: 'info', title: 'Services', message: 'FishFeeder starts by itself when the fish get hungry. Give it a moment.', sound: false });
        } else if (on) svcStopped.delete(s[0]);
        else svcStopped.add(s[0]);
        A.sound.play('click');
        update(true);
      }

      // ------------------------------------------------------------ Performance
      let perf = null;
      const gbox = (title, content, cls) => h('fieldset.tm-box', { class: cls }, h('legend', null, title), content);
      function statTable(labels) {
        const t = h('table.tm-stat');
        const vals = labels.map((label) => { const v = h('td.tm-r'); t.appendChild(h('tr', null, h('td', null, label), v)); return v; });
        return { t, vals };
      }
      RENDERERS.performance = () => {
        const cpuMeter = h('canvas.tm-meter'), memMeter = h('canvas.tm-meter');
        const graphs = perCore ? [h('canvas.tm-graph'), h('canvas.tm-graph')] : [h('canvas.tm-graph')];
        const memGraph = h('canvas.tm-graph');
        const phys = statTable(['Total', 'Cached', 'Available', 'Free']);
        const kern = statTable(['Paged', 'Nonpaged']);
        const sys = statTable(['Handles', 'Threads', 'Processes', 'Up Time', 'Commit (MB)']);
        page.append(h('div.tm-perf', null,
          h('div.tm-perf-grid', null,
            gbox('CPU Usage', cpuMeter, 'tm-meterbox'),
            gbox('CPU Usage History', h('div.tm-graphs', null, graphs), 'tm-histbox'),
            gbox('Memory', memMeter, 'tm-meterbox'),
            gbox('Physical Memory Usage History', memGraph, 'tm-histbox')),
          h('div.tm-stats', null,
            h('div.tm-statcol', null, gbox('Physical Memory (MB)', phys.t), gbox('Kernel Memory (MB)', kern.t)),
            gbox('System', sys.t, 'tm-sysbox')),
          h('div.tm-perf-foot', null, A.ui.button('Resource Monitor...', { size: 'sm', onClick: () => A.ui.messageBox({ parent: win, icon: 'icons/taskmgr', title: 'Resource Monitor', instruction: 'Resource Monitor is out feeding the fish', message: 'Everything it would show you is already on this page, moving in real time.', sound: false }) }))));
        perf = { cpuMeter, memMeter, graphs, memGraph, phys, kern, sys };
      };
      UPDATERS.performance = (c, m) => {
        if (!perf) return;
        drawMeter(perf.cpuMeter, c.total, Math.round(c.total) + ' %');
        drawMeter(perf.memMeter, (m.used / m.total) * 100, (m.used / 1024).toFixed(2) + ' GB');
        if (perf.graphs.length === 2) {
          drawGraph(perf.graphs[0], hist.c0, kernelTimes ? hist.kern : null);
          drawGraph(perf.graphs[1], hist.c1, kernelTimes ? hist.kern.map((k) => k * 0.8) : null);
        } else drawGraph(perf.graphs[0], hist.cpu, kernelTimes ? hist.kern : null);
        drawGraph(perf.memGraph, hist.mem, null);
        const count = A.procmon.list().length;
        const set = (tbl, vals) => vals.forEach((v, i) => { if (tbl.vals[i].textContent !== v) tbl.vals[i].textContent = v; });
        set(perf.phys, [num(m.total), num(m.cached), num(m.free), num(Math.max(0, m.free - m.cached))]);
        set(perf.kern, [num(88 + m.used * 0.07), num(27 + m.used * 0.018)]);
        const up = Math.floor((Date.now() - (performance.timeOrigin || Date.now())) / 1000);
        set(perf.sys, [num(11800 + count * 186 + (up % 37)), num(470 + count * 12 + (up % 7)), String(count),
          Math.floor(up / 86400) + ':' + pad2(Math.floor((up % 86400) / 3600)) + ':' + pad2(Math.floor((up % 3600) / 60)) + ':' + pad2(up % 60),
          num(m.commit) + ' / 4094']);
      };

      // ------------------------------------------------------------ Networking
      let netUI = null;
      RENDERERS.networking = () => {
        const g = h('canvas.tm-graph.tm-netgraph');
        const top = h('span.tm-netscale'), mid = h('span.tm-netscale');
        const lv = listView([
          { id: 'name', label: 'Adapter Name', w: 'minmax(170px, 1.6fr)', min: 170 }, { id: 'util', label: 'Network Utilization', w: '120px', align: 'r', min: 120 },
          { id: 'speed', label: 'Link Speed', w: '80px', align: 'r', min: 80 }, { id: 'state', label: 'State', w: '90px', min: 90 },
        ], {});
        page.append(h('div.tm-net', null,
          gbox('Wireless Network Connection', h('div.tm-netwrap', null, h('div.tm-netaxis', null, top, mid, h('span.tm-netscale', null, '0 %')), g), 'tm-netbox'),
          h('div.tm-netlist', null, lv.el)));
        netUI = { g, top, mid, lv };
      };
      UPDATERS.networking = () => {
        if (!netUI) return;
        const peak = Math.max(...hist.net);
        const scale = [0.5, 1, 2, 5, 10, 25, 50, 100].find((s) => peak <= s) || 100;
        netUI.top.textContent = scale + ' %';
        netUI.mid.textContent = scale / 2 + ' %';
        drawGraph(netUI.g, hist.net.map((v) => (v / scale) * 100), null, '#f2ea3a');
        const now = A.procmon.net();
        const ssid = A.store.get('net.connected', 'Aerium Home Network');
        netUI.lv.set([
          { key: 'wlan', cells: ['Wireless Network Connection (' + ssid + ')', (now < 0.01 ? '0' : now.toFixed(2)) + ' %', '54 Mbps', 'Connected'] },
          { key: 'lan', cls: 'tm-stopped', cells: ['Local Area Connection', '0 %', '100 Mbps', 'Disconnected'] },
        ]);
      };

      // ------------------------------------------------------------ Users
      let usersUI = null;
      RENDERERS.users = () => {
        let sel = 'me';
        const lv = listView([
          { id: 'user', label: 'User', w: 'minmax(150px, 1.4fr)', min: 150 }, { id: 'id', label: 'ID', w: '34px', align: 'r', min: 34 },
          { id: 'status', label: 'Status', w: '84px', min: 84 }, { id: 'client', label: 'Client Name', w: '100px', min: 100 }, { id: 'session', label: 'Session', w: '80px', min: 80 },
        ], { onSelect: (k) => { sel = k || 'me'; } });
        lv.sel = 'me';
        const me = A.store.get('user.name') || 'User';
        const logoff = async () => {
          if (sel === 'fish') { A.ui.messageBox({ parent: win, icon: 'icons/fish', title: 'Task Manager', instruction: 'Captain Bubbles is busy', message: 'He is swimming laps and cannot be logged off right now.', sound: false }); return; }
          const ok = await A.ui.confirm('Are you sure you want to log off? Any unsaved work will be lost.', { parent: win, title: 'Task Manager', icon: 'warning' });
          if (ok) A.boot.logoff();
        };
        const message = async () => {
          const who = sel === 'fish' ? 'Captain Bubbles' : me;
          const text = await A.ui.prompt({ parent: win, title: 'Send Message', message: 'Message to ' + who + ':', value: 'Hello!' });
          if (text == null || !text.trim()) return;
          if (sel === 'fish') setTimeout(() => A.notify({ title: 'Captain Bubbles replied', text: 'blub blub (that means thank you)', icon: 'icons/fish' }), 1400);
          else A.notify({ title: 'Message from ' + me, text: text.trim(), icon: 'icons/chat' });
        };
        page.append(h('div.tm-pane', null, lv.el, h('div.tm-buttons', null,
          A.ui.button('Disconnect', { disabled: true }), A.ui.button('Logoff', { onClick: logoff }), h('span.tm-spacer'), A.ui.button('Send Message...', { onClick: message }))));
        usersUI = { lv, me };
      };
      UPDATERS.users = () => {
        if (!usersUI) return;
        const me = A.store.get('user.name') || 'User';
        usersUI.lv.set([
          { key: 'me', cells: [sigEl('me|' + me, h('img.tm-avatar', { src: A.asset(A.store.get('user.avatar') || 'avatars/avatar-fish'), alt: '' }), h('span', null, me)), '1', 'Active', '', 'Console'] },
          { key: 'fish', cells: [sigEl('fish', h('img.tm-avatar', { src: A.asset('avatars/avatar-fish'), alt: '' }), h('span', null, 'Captain Bubbles')), '2', 'Swimming', 'FISH-TANK', 'Aquarium'] },
        ]);
      };

      // ------------------------------------------------------------ drawing
      function fitCanvas(cv) {
        const w = Math.max(10, cv.clientWidth), hh = Math.max(10, cv.clientHeight);
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); }
        const ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, w, h: hh };
      }
      // Green-on-black history graph with a grid that scrolls along with the data.
      function drawGraph(cv, data, kernel, color) {
        if (!cv.isConnected) return;
        const { ctx, w, h: H } = fitCanvas(cv);
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, H);
        const step = w / (HIST - 1), cell = 12;
        const shift = (samples * step) % cell;
        ctx.strokeStyle = '#00602a'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = w - shift; x > 0; x -= cell) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
        for (let y = H; y > 0; y -= cell) { ctx.moveTo(0, Math.round(y) - 0.5); ctx.lineTo(w, Math.round(y) - 0.5); }
        ctx.stroke();
        const line = (arr, stroke, fill) => {
          ctx.beginPath();
          arr.forEach((v, i) => { const x = i * step, y = H - 1 - (clamp(v, 0, 100) / 100) * (H - 2); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
          if (fill) { ctx.lineTo(w, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.beginPath(); arr.forEach((v, i) => { const x = i * step, y = H - 1 - (clamp(v, 0, 100) / 100) * (H - 2); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); }
          ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke();
        };
        line(data, color || '#39ff4a', color ? null : 'rgba(57,255,74,.10)');
        if (kernel) line(kernel, '#ff3b30');
      }
      // LED-style meter with the reading underneath, like the classic CPU box.
      function drawMeter(cv, pct, label) {
        if (!cv.isConnected) return;
        const { ctx, w, h: H } = fitCanvas(cv);
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, H);
        const barH = H - 22, rows = Math.floor(barH / 3.5);
        const lit = Math.round((clamp(pct, 0, 100) / 100) * rows);
        const colW = Math.min(18, (w - 16) / 2);
        for (let r = 0; r < rows; r++) {
          const y = 6 + barH - (r + 1) * 3.5;
          ctx.fillStyle = r < lit ? '#39ff4a' : '#0a3a14';
          ctx.fillRect(w / 2 - colW - 1, y, colW, 2.2);
          ctx.fillRect(w / 2 + 1, y, colW, 2.2);
        }
        ctx.fillStyle = '#39ff4a';
        ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
        ctx.textAlign = 'center';
        ctx.fillText(label, w / 2, H - 6);
      }
      function paint() {
        const fn = UPDATERS[tab];
        if (fn) fn(A.procmon.cpu(), A.procmon.memory());
      }

      // ------------------------------------------------------------ run a new task
      async function newTask() {
        const cmd = await A.ui.prompt({ parent: win, title: 'Create New Task', icon: 'icons/run', message: 'Type the name of a program, folder, document, or Internet resource, and Aerium will open it for you.', value: A.store.get('run.last', '') });
        if (cmd == null || !cmd.trim()) return;
        const c = cmd.trim();
        A.store.set('run.last', c);
        const lower = c.toLowerCase().replace(/\.exe$/, '');
        let path = c.replace(/\\/g, '/');
        const home = /^c:\/users\/[^/]+/i;
        if (home.test(path)) path = path.replace(home, '') || '/';
        if (/^https?:\/\/|^www\.|\.(com|net|org)$/.test(lower)) { if (A.apps.get('browser')) A.apps.launch('browser', { url: c }); return; }
        if (path.startsWith('/') && A.fs.exists(path)) { A.apps.openFile(path); return; }
        if (A.apps.get(lower)) { A.apps.launch(lower); return; }
        A.ui.messageBox({ parent: win, icon: 'error', title: 'Create New Task', message: "Aerium cannot find '" + c + "'. Make sure you typed the name correctly, and then try again." });
      }
      function help() {
        A.ui.messageBox({
          parent: win, icon: 'icons/taskmgr', title: 'Task Manager Help', instruction: 'Getting around Task Manager',
          message: 'Applications lists your open windows. End Task closes one, Switch To brings it forward.\n\nProcesses lists everything running, including the programs working quietly in the background. Click a column to sort it.\n\nPerformance draws the computer thinking, live. Try moving a window around and watch the CPU graph.\n\nTip: Ctrl+Shift+Esc opens Task Manager from anywhere.',
        });
      }

      // ------------------------------------------------------------ start and stop
      win.on('resize', () => { if (tab === 'performance' || tab === 'networking') paint(); });
      win.on('restore', () => update(true));
      win.el.addEventListener('keydown', (e) => {
        if (e.key === 'F5') { e.preventDefault(); update(true); }
        else if (e.ctrlKey && e.key === 'Tab') {
          e.preventDefault();
          const i = TABS.findIndex(([id]) => id === tab);
          selectTab(TABS[(i + (e.shiftKey ? TABS.length - 1 : 1)) % TABS.length][0]);
        }
      });
      selectTab(tab);
      setSpeed(speed);

      return {
        onArgs(a) { if (a && TABS.some(([id]) => id === a.tab)) selectTab(a.tab); },
        onClose() {
          clearInterval(timer);
          timer = null;
          window.removeEventListener('pointermove', onMove);
          offFocus();
          if (tray) tray.remove();
        },
      };
    },
  });
})();
