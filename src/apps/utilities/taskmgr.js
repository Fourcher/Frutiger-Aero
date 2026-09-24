/* Task Manager: Applications, Processes, Services, Performance, Networking
   and Users, with live CPU / memory / network graphs, real window control
   and a pile of plausible fake system processes. Timers stop on close. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;

  const TOTAL_MEM = 2048; // MB
  const SPEEDS = { High: 700, Normal: 1500, Low: 4000, Paused: 0 };

  // Believable background processes. [image, user, baseMem(K), critical]
  const FAKE = [
    ['System Idle Process', 'SYSTEM', 24, true, 'idle'],
    ['System', 'SYSTEM', 148, true],
    ['aerium.exe', 'SYSTEM', 3820, true],
    ['glass.exe', 'SYSTEM', 24960, true],
    ['dwm.exe', 'USER', 41200, true],
    ['sidebar.exe', 'USER', 22160, false],
    ['bubbles.exe', 'USER', 8640, false],
    ['aquarium.exe', 'USER', 15380, false],
    ['defender.exe', 'SYSTEM', 6420, false],
    ['audiodg.exe', 'LOCAL SERVICE', 12040, false],
    ['spoolsv.exe', 'SYSTEM', 4980, false],
    ['search.exe', 'SYSTEM', 18220, false],
    ['taskmgr.exe', 'USER', 9200, false],
  ];
  const SERVICES = [
    ['Aquarium', 'Aerium Aquarium Service', 'Running', 'Automatic'],
    ['BubbleMsg', 'Bubble Messenger Presence', 'Running', 'Automatic'],
    ['GlassDWM', 'Desktop Window Manager', 'Running', 'Automatic'],
    ['AeroTheme', 'Themes', 'Running', 'Automatic'],
    ['AeUpdate', 'Aerium Update', 'Stopped', 'Manual'],
    ['Defender', 'Aerium Defender Antivirus', 'Running', 'Automatic'],
    ['FishFeed', 'Scheduled Fish Feeding', 'Running', 'Automatic'],
    ['SunSync', 'Time and Sunlight Sync', 'Running', 'Automatic'],
    ['Nostalgia', 'Nostalgia Provider', 'Running', 'Automatic'],
    ['Homework', 'Homework Reminder', 'Stopped', 'Disabled'],
  ];

  A.apps.register({
    id: 'taskmgr',
    name: 'Task Manager',
    icon: 'icons/taskmgr',
    color: '#4a7a3a',
    category: 'system',
    description: 'Shows what is running and how busy the computer is.',
    keywords: ['task', 'manager', 'processes', 'performance', 'cpu', 'kill'],
    single: true,
    window: { width: 560, height: 520, minWidth: 460, minHeight: 400 },
    launch(win, args) {
      const user = A.store.get('user.name') || 'User';
      let speed = A.store.get('taskmgr.speed', 'Normal');
      let minimizeOnUse = A.store.get('taskmgr.minUse', false);
      let alwaysTop = false;
      let tab = 'performance';
      let sortCol = 'mem', sortDir = -1;
      let selectedApp = null, selectedProc = null;
      let timer = null;
      const bootTime = Date.now() - (30 * 60000 + Math.floor(Math.random() * 90 * 60000));

      // rolling histories
      const N = 90;
      const cpuHist = new Array(N).fill(0);
      const memHist = new Array(N).fill(0);
      const netHist = new Array(N).fill(0);
      let cpu = 6, netUtil = 1;
      const procState = new Map(); // key -> { image, user, pid, cpu, mem, critical, win, idle }
      let nextPid = 1000;

      // ------------------------------------------------------------ chrome
      win.body.classList.add('tm');
      const menubar = A.ui.menubar([
        { label: 'File', items: () => [
          { label: 'New Task (Run...)', onClick: newTask },
          { separator: true },
          { label: 'Exit Task Manager', onClick: () => win.close() },
        ] },
        { label: 'Options', items: () => [
          { label: 'Always On Top', checked: alwaysTop, onClick: () => { alwaysTop = !alwaysTop; win.el.classList.toggle('tm-ontop', alwaysTop); } },
          { label: 'Minimize On Use', checked: minimizeOnUse, onClick: () => { minimizeOnUse = !minimizeOnUse; A.store.set('taskmgr.minUse', minimizeOnUse); } },
          { label: 'Hide When Minimized', checked: true, disabled: true },
        ] },
        { label: 'View', items: () => [
          { label: 'Refresh Now', shortcut: 'F5', onClick: tick },
          { label: 'Update Speed', submenu: Object.keys(SPEEDS).map((k) => ({ label: k, checked: speed === k, radio: true, onClick: () => setSpeed(k) })) },
          { separator: true },
          { label: 'Select Columns...', disabled: true },
        ] },
        { label: 'Help', items: () => [
          { label: 'Task Manager Help', onClick: () => A.ui.messageBox({ parent: win, icon: 'icons/taskmgr', title: 'Task Manager', instruction: 'Task Manager', message: 'Applications shows your open windows. Processes shows everything running. Performance draws live graphs of the computer working.\n\nEnd Task closes a window. End Process is more forceful, and asks first.' }) },
          { separator: true },
          { label: 'About Task Manager', onClick: () => A.ui.messageBox({ parent: win, icon: 'icons/taskmgr', title: 'About', instruction: 'Aerium Task Manager', message: 'Version 7.0 (Build 2007)\n\nWatching the fish swim, one CPU cycle at a time.', sound: false }) },
        ] },
      ]);

      const tabsBar = h('div.tm-tabs', { role: 'tablist' });
      const TABS = [
        ['applications', 'Applications'], ['processes', 'Processes'], ['services', 'Services'],
        ['performance', 'Performance'], ['networking', 'Networking'], ['users', 'Users'],
      ];
      TABS.forEach(([id, label]) => {
        const b = h('button.tm-tab', { type: 'button', role: 'tab', dataset: { tab: id } }, label);
        b.addEventListener('click', () => selectTab(id));
        tabsBar.appendChild(b);
      });
      const content = h('div.tm-content');
      const status = h('div.ae-statusbar.tm-status', null,
        h('span.tm-st-proc', null, 'Processes: 0'),
        h('span.ae-status-cell.tm-st-cpu', null, 'CPU Usage: 0%'),
        h('span.ae-status-cell.tm-st-mem', null, 'Physical Memory: 0%'));
      win.body.append(menubar, h('div.tm-body', null, tabsBar, content), status);

      // ------------------------------------------------------------ simulation
      function sampleProcesses() {
        const seen = new Set();
        // real windows
        A.wm.windows.filter((w) => w.app && w.taskbar).forEach((w) => {
          const key = 'w' + w.id;
          seen.add(key);
          let p = procState.get(key);
          if (!p) { const app = A.apps.get(w.app); p = { key, image: (app ? app.id : w.app) + '.exe', user, pid: nextPid += 4, mem: 22000 + Math.random() * 40000, cpu: 0, win: w }; procState.set(key, p); }
          p.win = w;
        });
        // fake processes
        FAKE.forEach(([image, u, baseMem, critical, idle], i) => {
          const key = 'f' + i;
          seen.add(key);
          let p = procState.get(key);
          if (!p) { p = { key, image, user: u, pid: image === 'System Idle Process' ? 0 : image === 'System' ? 4 : (nextPid += 4), mem: baseMem, cpu: 0, critical, idle: !!idle }; procState.set(key, p); }
        });
        for (const key of Array.from(procState.keys())) if (!seen.has(key)) procState.delete(key);

        // update cpu/mem with a gentle random walk
        let load = 0;
        const list = Array.from(procState.values());
        list.forEach((p) => {
          if (p.idle) return;
          const spike = Math.random() < 0.06 ? Math.random() * 20 : 0;
          p.cpu = clamp((p.cpu || 0) * 0.55 + Math.random() * (p.win ? 6 : 2.2) + spike, 0, 92);
          if (p.cpu < 0.6) p.cpu = 0;
          p.mem = Math.max(400, p.mem + (Math.random() - 0.5) * (p.win ? 900 : 240));
          load += p.cpu;
        });
        cpu = clamp(load, 0, 100);
        const idleP = list.find((p) => p.idle); if (idleP) idleP.cpu = 100 - cpu;
        return list;
      }
      function usedMem() {
        let base = 760 + A.wm.windows.filter((w) => w.taskbar).length * 42;
        base += Math.sin(Date.now() / 9000) * 20;
        return clamp(base, 400, TOTAL_MEM - 60);
      }
      function tick() {
        const list = sampleProcesses();
        const memMB = usedMem();
        const memPct = (memMB / TOTAL_MEM) * 100;
        // network: usually quiet with occasional bursts
        netUtil = clamp(netUtil * 0.6 + (Math.random() < 0.12 ? Math.random() * 40 : Math.random() * 3), 0, 100);
        cpuHist.push(cpu); cpuHist.shift();
        memHist.push(memPct); memHist.shift();
        netHist.push(netUtil); netHist.shift();
        // status bar
        status.querySelector('.tm-st-proc').textContent = 'Processes: ' + list.length;
        status.querySelector('.tm-st-cpu').textContent = 'CPU Usage: ' + Math.round(cpu) + '%';
        status.querySelector('.tm-st-mem').textContent = 'Physical Memory: ' + Math.round(memPct) + '%';
        // live tab
        if (tab === 'performance') updatePerformance(memMB, memPct);
        else if (tab === 'networking') updateNetworking();
        else if (tab === 'processes') updateProcesses();
        else if (tab === 'applications') updateApplications();
      }
      function setSpeed(k) {
        speed = k; A.store.set('taskmgr.speed', k);
        if (timer) { clearInterval(timer); timer = null; }
        if (SPEEDS[k]) timer = setInterval(tick, SPEEDS[k]);
      }

      // ------------------------------------------------------------ tabs
      function selectTab(id) {
        tab = id;
        tabsBar.querySelectorAll('.tm-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
        A.sound.play('click');
        render();
      }
      function render() {
        content.innerHTML = '';
        if (tab === 'applications') renderApplications();
        else if (tab === 'processes') renderProcesses();
        else if (tab === 'services') renderServices();
        else if (tab === 'performance') renderPerformance();
        else if (tab === 'networking') renderNetworking();
        else if (tab === 'users') renderUsers();
        tick();
      }

      // ------------------------------------------------------------ Applications
      let appListEl, appBtns;
      function renderApplications() {
        appListEl = h('div.tm-applist', { tabIndex: 0 });
        const head = h('div.tm-app-head', null, h('span', null, 'Task'), h('span', null, 'Status'));
        const foot = h('div.tm-btnrow');
        const endBtn = A.ui.button('End Task', { onClick: endTask });
        const switchBtn = A.ui.button('Switch To', { onClick: switchTo });
        const newBtn = A.ui.button('New Task...', { onClick: newTask });
        appBtns = { endBtn, switchBtn };
        foot.append(endBtn, switchBtn, h('span.tm-spacer'), newBtn);
        content.append(h('div.tm-pane', null, h('div.tm-list-wrap', null, head, appListEl), foot));
        updateApplications();
      }
      function updateApplications() {
        if (!appListEl) return;
        const wins = A.wm.windows.filter((w) => w.taskbar && w.app);
        appListEl.innerHTML = '';
        if (!wins.length) appListEl.appendChild(h('div.tm-empty', null, 'No applications are running. Open something fun.'));
        wins.forEach((w) => {
          const row = h('div.tm-approw', { class: selectedApp === w.id && 'selected', dataset: { id: w.id } },
            h('span.tm-app-task', null, A.img(w.icon), h('span', null, w.title)),
            h('span.tm-app-status', { class: w.notResponding && 'tm-nr' }, w.notResponding ? 'Not Responding' : 'Running'));
          row.addEventListener('click', () => { selectedApp = w.id; appListEl.querySelectorAll('.tm-approw').forEach((r) => r.classList.toggle('selected', r.dataset.id === String(w.id))); updateAppButtons(); });
          row.addEventListener('dblclick', () => { selectedApp = w.id; switchTo(); });
          appListEl.appendChild(row);
        });
        updateAppButtons();
      }
      function updateAppButtons() {
        const w = A.wm.get(selectedApp);
        if (appBtns) { appBtns.endBtn.disabled = !w; appBtns.switchBtn.disabled = !w; }
      }
      function endTask() {
        const w = A.wm.get(selectedApp);
        if (!w) return;
        A.sound.play('click');
        w.close();
        selectedApp = null;
        setTimeout(updateApplications, 60);
      }
      function switchTo() {
        const w = A.wm.get(selectedApp);
        if (!w) return;
        if (w.state === 'minimized') w.restore(); else w.focus();
        if (minimizeOnUse) win.minimize();
      }

      // ------------------------------------------------------------ Processes
      let procTable, procBtn;
      const COLS = [['image', 'Image Name', 'l'], ['user', 'User Name', 'l'], ['cpu', 'CPU', 'r'], ['mem', 'Memory (Private Working Set)', 'r']];
      function renderProcesses() {
        const thead = h('div.tm-proc-head');
        COLS.forEach(([id, label, align]) => {
          const th = h('button.tm-th', { type: 'button', class: ['tm-th-' + align, sortCol === id && 'sorted'], dataset: { col: id } }, label, h('span.tm-sortarrow', null, sortCol === id ? (sortDir < 0 ? ' ▾' : ' ▴') : ''));
          th.addEventListener('click', () => { if (sortCol === id) sortDir = -sortDir; else { sortCol = id; sortDir = id === 'image' || id === 'user' ? 1 : -1; } updateProcesses(); });
          thead.appendChild(th);
        });
        procTable = h('div.tm-proc-body', { tabIndex: 0 });
        const foot = h('div.tm-btnrow', null, h('label.tm-showall', null, A.ui.checkbox({ label: 'Show processes from all users', checked: true }), ''), h('span.tm-spacer'));
        procBtn = A.ui.button('End Process', { tone: 'pearl', onClick: endProcess });
        foot.appendChild(procBtn);
        content.append(h('div.tm-pane', null, h('div.tm-proc-wrap', null, thead, procTable), foot));
        updateProcesses();
      }
      function updateProcesses() {
        if (!procTable) return;
        const list = Array.from(procState.values()).slice();
        list.sort((a, b) => {
          let r;
          if (sortCol === 'image') r = a.image.localeCompare(b.image);
          else if (sortCol === 'user') r = a.user.localeCompare(b.user) || a.image.localeCompare(b.image);
          else if (sortCol === 'cpu') r = a.cpu - b.cpu;
          else r = a.mem - b.mem;
          return r * sortDir;
        });
        const scroll = procTable.scrollTop;
        procTable.innerHTML = '';
        list.forEach((p) => {
          const row = h('div.tm-procrow', { class: selectedProc === p.key && 'selected', dataset: { key: p.key } },
            h('span.tm-td.tm-td-l', null, A.img(p.win ? p.win.icon : imageIcon(p.image)), h('span', null, p.image)),
            h('span.tm-td.tm-td-l', null, p.user),
            h('span.tm-td.tm-td-r', null, String(Math.round(p.cpu)).padStart(2, '0')),
            h('span.tm-td.tm-td-r', null, Math.round(p.mem).toLocaleString('en-US') + ' K'));
          row.addEventListener('click', () => { selectedProc = p.key; procTable.querySelectorAll('.tm-procrow').forEach((r) => r.classList.toggle('selected', r.dataset.key === p.key)); procBtn.disabled = false; });
          procTable.appendChild(row);
        });
        procTable.scrollTop = scroll;
        if (procBtn) procBtn.disabled = !selectedProc || !procState.has(selectedProc);
      }
      function imageIcon(image) {
        const id = image.replace(/\.exe$/, '');
        const app = A.apps.get(id);
        if (app) return app.icon;
        if (/idle|system|glass|aerium|dwm|spoolsv|audiodg/.test(image)) return 'icons/settings';
        if (/defender/.test(image)) return 'icons/defender';
        if (/aquarium/.test(image)) return 'icons/aquarium';
        if (/bubble|msg/.test(image)) return 'icons/chat';
        if (/search/.test(image)) return 'icons/search';
        if (/sidebar/.test(image)) return 'icons/gadgets';
        return 'icons/settings';
      }
      async function endProcess() {
        const p = procState.get(selectedProc);
        if (!p) return;
        if (p.critical) {
          A.ui.messageBox({ parent: win, icon: 'warning', title: 'Task Manager Warning', instruction: 'Do you really want to do that?',
            message: (p.idle || p.image === 'System' || p.image === 'aerium.exe' || p.image === 'glass.exe')
              ? 'This is a critical system process. Ending "' + p.image + '" would turn the whole computer into a very expensive paperweight.\n\nThe fish have advised against it.'
              : 'Ending "' + p.image + '" could make the desktop misbehave. And nobody wants that.' });
          A.sound.play('error');
          return;
        }
        const ok = await A.ui.confirm('Do you want to end "' + p.image + '"?\n\nIf an open program is ended, you will lose any unsaved data. Ending a process might make the computer unstable.', { parent: win, title: 'Task Manager Warning', icon: 'warning' });
        if (!ok) return;
        if (p.win && !p.win.closed) p.win.close(true);
        procState.delete(p.key);
        selectedProc = null;
        A.sound.play('close');
        updateProcesses();
      }

      // ------------------------------------------------------------ Services
      function renderServices() {
        const thead = h('div.tm-proc-head.tm-svc-head', null, h('span.tm-th', null, 'Name'), h('span.tm-th', null, 'Description'), h('span.tm-th', null, 'Status'), h('span.tm-th', null, 'Startup'));
        const body = h('div.tm-proc-body');
        SERVICES.forEach(([name, desc, st, start]) => {
          body.appendChild(h('div.tm-svcrow', null,
            h('span.tm-td', null, name),
            h('span.tm-td', null, desc),
            h('span.tm-td', { class: st === 'Running' ? 'tm-run' : 'tm-stop' }, st),
            h('span.tm-td', null, start)));
        });
        content.append(h('div.tm-pane', null, h('div.tm-proc-wrap', null, thead, body),
          h('div.tm-btnrow', null, h('span.ae-muted', null, 'These services keep the playground running.'), h('span.tm-spacer'), A.ui.button('Services...', { disabled: true }))));
      }

      // ------------------------------------------------------------ Performance
      let cpuCanvas, cpuHistCanvas, memBarCanvas, memHistCanvas, perfStats, cpuNow;
      function renderPerformance() {
        cpuCanvas = mkCanvas('tm-graph-sm');
        cpuHistCanvas = mkCanvas('tm-graph-lg');
        memBarCanvas = mkCanvas('tm-graph-sm');
        memHistCanvas = mkCanvas('tm-graph-lg');
        cpuNow = h('div.tm-readout');
        const memNow = h('div.tm-readout.tm-mem-now');
        perfStats = h('div.tm-perf-stats');
        content.append(h('div.tm-perf', null,
          h('div.tm-perf-row', null,
            h('div.tm-perf-box', null, h('div.tm-perf-title', null, 'CPU Usage'), h('div.tm-perf-meter', null, cpuCanvas, cpuNow)),
            h('div.tm-perf-box.tm-perf-wide', null, h('div.tm-perf-title', null, 'CPU Usage History'), cpuHistCanvas)),
          h('div.tm-perf-row', null,
            h('div.tm-perf-box', null, h('div.tm-perf-title', null, 'Memory'), h('div.tm-perf-meter', null, memBarCanvas, memNow)),
            h('div.tm-perf-box.tm-perf-wide', null, h('div.tm-perf-title', null, 'Physical Memory Usage History'), memHistCanvas)),
          perfStats));
        perfStats._memNow = memNow;
        updatePerformance(usedMem(), (usedMem() / TOTAL_MEM) * 100);
      }
      function updatePerformance(memMB, memPct) {
        if (!cpuHistCanvas || !cpuHistCanvas.isConnected) return;
        drawMeter(cpuCanvas, cpu);
        drawGraph(cpuHistCanvas, cpuHist, cpu);
        drawMeter(memBarCanvas, memPct);
        drawGraph(memHistCanvas, memHist, memPct);
        if (cpuNow) cpuNow.textContent = Math.round(cpu) + '%';
        if (perfStats._memNow) perfStats._memNow.textContent = Math.round(memMB) + ' MB';
        const up = Date.now() - bootTime;
        const hh = Math.floor(up / 3600000), mm = Math.floor((up % 3600000) / 60000), ssv = Math.floor((up % 60000) / 1000);
        const procCount = procState.size;
        perfStats.innerHTML = '';
        const box = (title, rows) => h('div.tm-stat-box', null, h('div.tm-stat-title', null, title), h('table.tm-stat-table', null, rows.map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, v)))));
        perfStats.append(
          box('Physical Memory (MB)', [['Total', TOTAL_MEM.toLocaleString()], ['Cached', Math.round(memMB * 0.42).toLocaleString()], ['Available', (TOTAL_MEM - Math.round(memMB)).toLocaleString()], ['Free', Math.round((TOTAL_MEM - memMB) * 0.4).toLocaleString()]]),
          box('System', [['Handles', (18000 + procCount * 120).toLocaleString()], ['Threads', (520 + procCount * 9).toLocaleString()], ['Processes', String(procCount)], ['Up Time', pad(hh) + ':' + pad(mm) + ':' + pad(ssv)]]),
          box('Kernel Memory (MB)', [['Paged', Math.round(120 + memMB * 0.05).toLocaleString()], ['Nonpaged', Math.round(30 + memMB * 0.02).toLocaleString()], ['Page File', Math.round(memMB * 1.2).toLocaleString() + ' / 4096']]));
      }
      const pad = (n) => String(n).padStart(2, '0');

      // ------------------------------------------------------------ Networking
      let netCanvas, netReadout;
      function renderNetworking() {
        netCanvas = mkCanvas('tm-graph-net');
        netReadout = h('div.tm-net-readout');
        content.append(h('div.tm-net', null,
          h('div.tm-perf-title', null, 'Wireless Network Connection'),
          h('div.tm-net-graph', null, netCanvas),
          netReadout,
          h('table.tm-net-table', null,
            h('tr', null, h('th', null, 'Adapter Name'), h('th', null, 'Network Utilization'), h('th', null, 'Link Speed'), h('th', null, 'State')),
            h('tr', null, h('td', null, 'Wireless Network Connection'), h('td.tm-net-util', null, '0 %'), h('td', null, '54 Mbps'), h('td', null, 'Connected')))));
        updateNetworking();
      }
      function updateNetworking() {
        if (!netCanvas || !netCanvas.isConnected) return;
        drawGraph(netCanvas, netHist, netUtil, '#ffd62e', 'rgba(255,214,46,0.18)');
        if (netReadout) netReadout.textContent = netUtil.toFixed(1) + '% utilization';
        const cell = content.querySelector('.tm-net-util'); if (cell) cell.textContent = netUtil.toFixed(1) + ' %';
      }

      // ------------------------------------------------------------ Users
      function renderUsers() {
        const table = h('div.tm-proc-wrap');
        table.append(
          h('div.tm-proc-head.tm-users-head', null, h('span.tm-th', null, 'User'), h('span.tm-th', null, 'ID'), h('span.tm-th', null, 'Status'), h('span.tm-th', null, 'Client Name')),
          (() => {
            const body = h('div.tm-proc-body');
            const rows = [[user, '1', 'Active', A.store.get('user.avatar')], ['Guest', '2', 'Disconnected', 'avatars/avatar-globe']];
            rows.forEach(([nm, id, st, av], i) => {
              const row = h('div.tm-userrow', { class: i === 0 && 'selected' },
                h('span.tm-td.tm-td-l', null, h('span.fa-avatar.fa-avatar-sm', null, h('img', { src: A.asset(av), alt: '' })), h('span', null, nm)),
                h('span.tm-td', null, id), h('span.tm-td', { class: st === 'Active' ? 'tm-run' : 'tm-stop' }, st), h('span.tm-td', null, 'AERIUM-PC'));
              body.appendChild(row);
            });
            return body;
          })());
        content.append(h('div.tm-pane', null, table,
          h('div.tm-btnrow', null,
            A.ui.button('Disconnect', { disabled: true }),
            A.ui.button('Logoff', { onClick: () => A.boot.logoff() }),
            h('span.tm-spacer'),
            A.ui.button('Send Message...', { onClick: () => A.ui.messageBox({ parent: win, icon: 'info', title: 'Send Message', instruction: 'Message sent', message: 'You waved at yourself. You waved back. Everyone had a nice time.' }) }))));
      }

      // ------------------------------------------------------------ canvas graphs
      function mkCanvas(cls) { return h('canvas', { class: cls }); }
      function ctxOf(canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = canvas.clientWidth || canvas.parentElement.clientWidth || 120;
        const H = canvas.clientHeight || 80;
        if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, W, H };
      }
      function drawGraph(canvas, hist, cur, color, fill) {
        const { ctx, W, H } = ctxOf(canvas);
        color = color || '#35e83a'; fill = fill || 'rgba(53,232,58,0.16)';
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#04180a';
        ctx.fillRect(0, 0, W, H);
        // grid (scrolls slowly for the classic feel)
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(46,150,70,0.35)';
        const off = (Date.now() / 90) % 12;
        ctx.beginPath();
        for (let x = W - off; x > 0; x -= 12) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
        for (let y = 0; y <= H; y += 12) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
        ctx.stroke();
        // series
        const step = W / (hist.length - 1);
        ctx.beginPath();
        hist.forEach((v, i) => { const x = i * step, y = H - (v / 100) * H; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
        ctx.beginPath();
        hist.forEach((v, i) => { const x = i * step, y = H - (v / 100) * H; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.stroke();
        void cur;
      }
      function drawMeter(canvas, pct) {
        const { ctx, W, H } = ctxOf(canvas);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#04180a'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(46,150,70,0.3)';
        ctx.beginPath();
        for (let y = 0; y <= H; y += 10) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
        ctx.stroke();
        const fillH = (pct / 100) * H;
        const g = ctx.createLinearGradient(0, H, 0, 0);
        g.addColorStop(0, '#1f9e2a'); g.addColorStop(0.7, '#35e83a'); g.addColorStop(1, '#a8ff8a');
        ctx.fillStyle = g;
        ctx.fillRect(2, H - fillH, W - 4, fillH);
      }

      // ------------------------------------------------------------ new task
      async function newTask() {
        const cmd = await A.ui.prompt({ parent: win, title: 'Create New Task', icon: 'icons/run', message: 'Type the name of a program, folder, or document, and Task Manager will open it for you.', value: '', okLabel: 'OK' });
        if (cmd == null || !cmd.trim()) return;
        const c = cmd.trim();
        const lower = c.toLowerCase().replace(/\.exe$/, '');
        if (/^https?:\/\/|^www\.|\.(com|net|org)$/.test(lower)) { A.apps.launch('browser', { url: c }); return; }
        if (A.fs.exists(c)) { A.apps.openFile(c); return; }
        if (A.apps.get(lower)) { A.apps.launch(lower); return; }
        A.ui.messageBox({ parent: win, icon: 'error', title: 'Create New Task', message: "Aerium cannot find '" + c + "'. Make sure you typed the name correctly, and then try again." });
      }

      // ------------------------------------------------------------ lifecycle
      let redraw = null;
      win.on('resize', () => { if (redraw) cancelAnimationFrame(redraw); redraw = requestAnimationFrame(() => { redraw = null; if (tab === 'performance') updatePerformance(usedMem(), (usedMem() / TOTAL_MEM) * 100); else if (tab === 'networking') updateNetworking(); }); });
      win.on('minimize', () => { if (timer) { clearInterval(timer); timer = null; } });
      win.on('restore', () => { if (!timer && SPEEDS[speed]) { timer = setInterval(tick, SPEEDS[speed]); tick(); } });

      // start on the tab requested (Performance by default)
      if (args && args.tab && TABS.some(([id]) => id === args.tab)) tab = args.tab;
      selectTab(tab);
      setSpeed(speed);

      return {
        onArgs(a) { if (a && a.tab && TABS.some(([id]) => id === a.tab)) selectTab(a.tab); },
        onClose() { if (timer) clearInterval(timer); if (redraw) cancelAnimationFrame(redraw); },
      };
    },
  });
})();
