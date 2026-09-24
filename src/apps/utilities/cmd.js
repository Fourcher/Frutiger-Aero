/* Command Prompt: a black console with a blinking block cursor, command
   history, Tab completion, the legacy 16-color palette and the real virtual
   file system (C:\Users\<you> is your Aerium home folder). Plus ping,
   tracert, tasklist, a shutdown countdown and a few secrets for the curious. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;
  const vfs = A.fs;

  // Legacy 16-color console palette (docs/FEEL.md): color XY sets background X, text Y.
  const PALETTE = {
    0: '#000000', 1: '#000080', 2: '#008000', 3: '#008080', 4: '#800000', 5: '#800080', 6: '#808000', 7: '#c0c0c0',
    8: '#808080', 9: '#0000ff', a: '#00ff00', b: '#00ffff', c: '#ff0000', d: '#ff00ff', e: '#ffff00', f: '#ffffff',
  };
  const COLOR_NAMES = ['Black', 'Blue', 'Green', 'Aqua', 'Red', 'Purple', 'Yellow', 'White', 'Gray', 'Light Blue', 'Light Green', 'Light Aqua', 'Light Red', 'Light Purple', 'Light Yellow', 'Bright White'];
  const RAINBOW = ['#ff5f5f', '#ffaf3f', '#ffff5f', '#5fff5f', '#5fffff', '#5fafff', '#ff5fff'];
  const VERSION = 'Aerium [Version 7.0.2007]';
  const INSTALL = new Date(2007, 8, 1, 15, 7).getTime();
  const BOOTED = Date.now();
  const pad2 = (n) => String(n).padStart(2, '0');
  const num = (n) => Math.round(n).toLocaleString('en-US');
  const user = () => A.store.get('user.name') || 'User';
  const hostName = () => (user().replace(/[^A-Za-z0-9-]/g, '').slice(0, 12) || 'AERIUM').toUpperCase() + '-PC';
  function dirStamp(t) {
    const d = new Date(t);
    let hh = d.getHours();
    const ap = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + '/' + d.getFullYear() + '  ' + pad2(hh) + ':' + pad2(d.getMinutes()) + ' ' + ap;
  }
  function hash(s) { let n = 2166136261; for (let i = 0; i < s.length; i++) { n ^= s.charCodeAt(i); n = Math.imul(n, 16777619); } return n >>> 0; }

  // ============================================================ the pretend C: drive
  // Real files live in the virtual file system under C:\Users\<you>. Everything
  // around it is a believable, read-only system tree for exploring.
  const DIR = (c = {}, o = {}) => Object.assign({ d: true, c }, o);
  const FILE = (text, o = {}) => Object.assign({ d: false, text: text || '', size: o.size != null ? o.size : (text || '').length }, o);
  const BIN = (size) => FILE('', { size, bin: true });
  const HOSTS = '# Copyright (c) 2007 Aerium Playground\r\n#\r\n# This is a sample HOSTS file used by Aerium.\r\n#\r\n# Each entry is an IP address followed by a host name.\r\n\r\n127.0.0.1       localhost\r\n127.0.0.1       fish.tank\r\n::1             localhost\r\n';
  let fakeRoot = null, appData = null;
  function buildFake() {
    const rnd = A.util.seeded(2007);
    const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('');
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const repo = {};
    const parts = ['aqua', 'bubble', 'coral', 'glass', 'wave', 'breeze', 'pearl', 'sky', 'lagoon', 'ripple', 'dolphin', 'sunny', 'cloud', 'drop', 'reef', 'kelp'];
    const kinds = ['net', 'snd', 'usb', 'vid', 'kbd', 'hid', 'prn', 'cam', 'bt', 'disk', 'mou', 'wifi'];
    for (let i = 0; i < 96; i++) repo[pick(parts) + pick(kinds) + '.inf_x86_neutral_' + hex(16)] = DIR({ [pick(parts) + pick(kinds) + '.sys']: BIN(8192 + Math.floor(rnd() * 90000)) });
    const winsxs = {};
    for (let i = 0; i < 60; i++) winsxs['x86_aerium-' + pick(parts) + '-' + pick(['shell', 'theme', 'audio', 'glass', 'fonts', 'help', 'games']) + '_' + hex(16) + '_7.0.2007.' + (1000 + Math.floor(rnd() * 9000)) + '_none_' + hex(16)] = DIR();
    const exe = (n) => BIN(n);
    fakeRoot = DIR({
      Aerium: DIR({
        Cursors: DIR({ 'aero_arrow.cur': BIN(4286), 'aero_busy.ani': BIN(79592), 'bubble_arrow.cur': BIN(4286) }),
        Fonts: DIR({ 'selawik.ttf': BIN(44224), 'selawksl.ttf': BIN(44260), 'michroma.ttf': BIN(17908), 'rounded.ttf': BIN(22040) }),
        Help: DIR({ 'aerium.chm': BIN(1203456) }),
        Media: DIR({ 'Aerium Startup.wav': BIN(1204650), 'Aerium Logon.wav': BIN(324124), 'Aerium Ding.wav': BIN(85334), 'Aerium Error.wav': BIN(71114), 'Bubble Pop.wav': BIN(26414) }),
        System32: DIR({
          config: DIR({ systemprofile: DIR(), RegBack: DIR() }),
          drivers: DIR({ etc: DIR({ hosts: FILE(HOSTS), networks: FILE('# Aerium network names\r\n\r\nloopback 127\r\ncampus   284.122.107\r\nlondon   284.122.108\r\n'), services: FILE('echo 7/tcp\r\nftp 21/tcp\r\nhttp 80/tcp www\r\nfishfeed 7734/tcp # feeds the fish\r\n') }), 'aquafx.sys': BIN(53248), 'glassdrv.sys': BIN(146944), 'bubble.sys': BIN(33280) }),
          DriverStore: DIR({ FileRepository: DIR(repo) }),
          'en-US': DIR(), spool: DIR({ PRINTERS: DIR(), drivers: DIR({ x86: DIR() }) }), Tasks: DIR(), wbem: DIR({ Repository: DIR(), Logs: DIR() }),
          'calc.exe': exe(776192), 'cmd.exe': exe(302592), 'notepad.exe': exe(179712), 'taskmgr.exe': exe(257024), 'paint.exe': exe(6341632), 'control.exe': exe(115712), 'shutdown.exe': exe(26112), 'ping.exe': exe(16896), 'tracert.exe': exe(11776), 'fishfood.dll': BIN(7734),
        }),
        Temp: DIR(),
        Web: DIR({ Wallpaper: DIR({ Aerium: DIR(), Nature: DIR(), Technozen: DIR() }) }),
        winsxs: DIR(winsxs),
        'explorer.exe': exe(2614784), 'aerium.ini': FILE('[boot]\r\nshell=aeroshell.exe\r\nfish=happy\r\n'),
      }, { sys: true }),
      'Program Files': DIR({
        'Aerium Games': DIR({ Minesweeper: DIR(), Solitaire: DIR(), Pairs: DIR(), 'Bubble Pop': DIR() }),
        'Aerium Media Player': DIR({ Skins: DIR(), Visualizations: DIR(), 'aeplayer.exe': exe(4452352) }),
        'Bubble Messenger': DIR({ Emoticons: DIR(), Sounds: DIR(), 'bubblemsgr.exe': exe(5134336) }),
        'Common Files': DIR({ System: DIR({ 'Ole DB': DIR() }), Services: DIR() }),
        'Horizon Browser': DIR({ Plugins: DIR(), 'horizon.exe': exe(638976) }),
        'Aerium Sidebar': DIR({ Gadgets: DIR(), 'sidebar.exe': exe(1175552) }),
      }),
      Users: DIR({ Public: DIR({ 'Public Documents': DIR(), 'Public Music': DIR(), 'Public Pictures': DIR(), 'Public Videos': DIR(), 'Public Downloads': DIR() }) }),
      'autoexec.bat': FILE('@ECHO OFF\r\nREM This file does nothing. It is here for old times\' sake.\r\n'),
      'config.sys': FILE('FILES=40\r\nBUFFERS=20\r\nDEVICE=C:\\AERIUM\\FISHFOOD.SYS\r\n'),
      'pagefile.sys': FILE('', { size: 2146951168, bin: true, hidden: true }),
    });
    appData = DIR({
      Local: DIR({
        Aerium: DIR({ Explorer: DIR({ Thumbnails: DIR() }), Sidebar: DIR({ Gadgets: DIR(), Settings: DIR() }), Burn: DIR() }),
        'Horizon Browser': DIR({ Cache: DIR({ Images: DIR(), Scripts: DIR() }), Cookies: DIR() }),
        Temp: DIR({ Low: DIR() }),
      }),
      LocalLow: DIR(),
      Roaming: DIR({
        Aerium: DIR({ Recent: DIR(), 'Start Menu': DIR({ Programs: DIR({ Accessories: DIR(), Games: DIR(), Startup: DIR() }) }), Themes: DIR() }),
        'Bubble Messenger': DIR({ 'My Emoticons': DIR(), 'Chat Logs': DIR(), 'Display Pictures': DIR() }),
        Aquarium: DIR({ 'Fish Names': DIR(), 'Feeding Log': DIR() }),
      }),
    }, { hidden: true });
  }

  // ============================================================ scheduled shutdown
  // Shared by every Command Prompt window, like the real system-wide timer.
  let pending = null;
  const ACTION_TEXT = { shutdown: 'shut down', restart: 'restart', logoff: 'log off' };
  function runAction(action) {
    if (action === 'logoff') A.boot.logoff();
    else if (action === 'hibernate') A.boot.sleep(true);
    else A.boot.shutdown(action === 'restart');
  }
  function scheduleShutdown(action, secs, comment) {
    if (pending) return false;
    const deadline = Date.now() + secs * 1000;
    const timeEl = h('b.cmd-sd-time', null, '');
    const p = { action, deadline, timer: null, win: null, done: false };
    pending = p;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      timeEl.textContent = pad2(Math.floor(left / 3600)) + ':' + pad2(Math.floor((left % 3600) / 60)) + ':' + pad2(left % 60);
      if (left <= 0 && !p.done) {
        p.done = true;
        clearInterval(p.timer);
        if (pending === p) pending = null;
        if (p.win) p.win.close(true);
        runAction(action);
      }
    };
    const content = h('div.cmd-sd', null,
      A.img('icons/warning', { class: 'cmd-sd-icon' }),
      h('div.cmd-sd-text', null,
        h('div.cmd-sd-title', null, 'Aerium is about to ' + ACTION_TEXT[action]),
        h('div', null, 'Please save all work in progress, and close any programs you are using.'),
        comment ? h('div.cmd-sd-comment', null, 'Message: ' + comment) : null,
        h('div.cmd-sd-count', null, 'Time before ' + (action === 'logoff' ? 'log off' : action) + ': ', timeEl),
        h('div.ae-muted', null, 'Changed your mind? Type shutdown -a, or press Cancel.')));
    A.ui.dialog({
      title: 'System Shutdown', icon: 'icons/warning', width: 430, content,
      buttons: [{ label: 'Cancel', cancel: true, value: 'cancel' }],
      onOpen: (win) => { p.win = win; },
    }).then(() => { if (!p.done) abortShutdown(p); });
    p.timer = setInterval(tick, 250);
    tick();
    A.sound.play('exclamation');
    return true;
  }
  function abortShutdown(which) {
    const p = which || pending;
    if (!p || p.done) return false;
    p.done = true;
    clearInterval(p.timer);
    if (pending === p) pending = null;
    if (p.win && !p.win.closed) p.win.close(true);
    A.notify({ title: 'Shutdown canceled', text: 'The scheduled ' + (p.action === 'logoff' ? 'log off' : p.action) + ' was canceled.', icon: 'icons/info' });
    return true;
  }

  const ABORT = { abort: true };
  const MAX_LINES = 1500;

  A.apps.register({
    id: 'cmd',
    name: 'Command Prompt',
    icon: 'icons/cmd',
    color: '#3a4a5a',
    category: 'system',
    description: 'Type commands the way the family computer did. Try "help".',
    keywords: ['cmd', 'command', 'console', 'terminal', 'dos', 'prompt', 'shell'],
    window: { width: 680, height: 430, minWidth: 380, minHeight: 220 },
    launch(win, args) {
      if (!fakeRoot) buildFake();
      const USER = user();
      const HOME = ['Users', USER];
      let cwd = HOME.slice();
      let fg = PALETTE[7], bg = PALETTE[0], rainbow = false, rainbowIdx = 0;
      let echoOn = true, promptFmt = '$P$G';
      let closed = false, overwrite = false;
      let job = null;          // the running command, if any
      let submitFn = null;     // what Enter does right now
      let keyWaiter = null;    // pause / press-any-key
      let overlayStop = null;  // matrix or fish tank
      const hist = [];
      let histPos = -1, histDraft = '';
      const vars = {
        USERNAME: USER, COMPUTERNAME: hostName(), USERPROFILE: 'C:\\Users\\' + USER, HOMEDRIVE: 'C:', HOMEPATH: '\\Users\\' + USER,
        SYSTEMDRIVE: 'C:', SYSTEMROOT: 'C:\\Aerium', OS: 'Aerium', PROCESSOR_ARCHITECTURE: 'x86', NUMBER_OF_PROCESSORS: '2',
        PATH: 'C:\\Aerium\\System32;C:\\Aerium;C:\\Program Files\\Common Files', PATHEXT: '.COM;.EXE;.BAT;.CMD',
        TEMP: 'C:\\Users\\' + USER + '\\AppData\\Local\\Temp', FAVORITE_FISH: 'Captain Bubbles',
      };

      // ------------------------------------------------------------ DOM
      win.body.classList.add('cmd');
      const screen = h('div.cmd-screen', { role: 'log', 'aria-live': 'polite' });
      const kb = h('textarea.cmd-kb', { spellcheck: false, autocomplete: 'off', autocapitalize: 'off', rows: 1, 'aria-label': 'Command input' });
      win.body.append(screen, kb);
      applyColors();
      let lineCount = 0;
      let inputLine = null, promptEl = null, textEl = null;

      function applyColors() {
        win.body.style.setProperty('--cmd-fg', fg);
        win.body.style.setProperty('--cmd-bg', bg);
      }

      // ------------------------------------------------------------ output
      function addNode(node) {
        if (inputLine && inputLine.parentNode === screen) screen.insertBefore(node, inputLine);
        else screen.appendChild(node);
        if (++lineCount > MAX_LINES) {
          const old = Array.from(screen.children).filter((n) => n !== inputLine).slice(0, 200);
          old.forEach((n) => n.remove());
          lineCount -= old.length;
        }
      }
      // print('text') adds one or more lines; color is an optional CSS color.
      function print(text, color) {
        let last = null;
        String(text == null ? '' : text).split(/\r?\n/).forEach((t) => {
          const line = h('div.cmd-line');
          line.textContent = t;
          if (color) line.style.color = color;
          else if (rainbow) line.style.color = RAINBOW[rainbowIdx++ % RAINBOW.length];
          addNode(line);
          last = line;
        });
        scrollDown();
        return last;
      }
      // A line built from colored pieces: [['text', color], ...]
      function printParts(parts) {
        const line = h('div.cmd-line');
        parts.forEach(([t, c]) => line.appendChild(c ? h('span', { style: { color: c } }, t) : document.createTextNode(t)));
        addNode(line);
        scrollDown();
        return line;
      }
      const blank = () => print('');
      function scrollDown() { screen.scrollTop = screen.scrollHeight; }

      // ------------------------------------------------------------ the input line
      function promptString() {
        if (!echoOn) return '';
        const d = new Date();
        return promptFmt.replace(/\$(.)/g, (m, c) => {
          switch (c.toUpperCase()) {
            case 'P': return pathText(cwd);
            case 'G': return '>';
            case 'L': return '<';
            case 'N': return 'C';
            case 'T': return A.util.fmtTime(d, true);
            case 'D': return A.util.fmtDate(d);
            case 'V': return VERSION;
            case 'Q': return '=';
            case 'S': return ' ';
            case '$': return '$';
            case '_': return ' ';
            default: return '';
          }
        });
      }
      function showInput(label, onSubmit) {
        removeInput();
        promptEl = h('span.cmd-prompt', null, label);
        textEl = h('span.cmd-typed');
        inputLine = h('div.cmd-line.cmd-inputline', null, promptEl, textEl);
        if (rainbow) inputLine.style.color = RAINBOW[rainbowIdx % RAINBOW.length];
        screen.appendChild(inputLine);
        submitFn = onSubmit;
        kb.value = '';
        overwrite = false;
        render();
        focusKb();
        scrollDown();
      }
      function removeInput() {
        if (inputLine) inputLine.remove();
        inputLine = null;
        submitFn = null;
      }
      // Freeze the current input line into the scrollback.
      function commitInput(suffix) {
        if (!inputLine) return;
        textEl.textContent = kb.value + (suffix || '');
        textEl.classList.add('cmd-done');
        inputLine.classList.remove('cmd-inputline');
        inputLine = null;
        submitFn = null;
        lineCount++;
      }
      function render() {
        if (!textEl || !inputLine) return;
        const v = kb.value;
        const c = kb.selectionStart == null ? v.length : kb.selectionStart;
        textEl.textContent = '';
        textEl.append(v.slice(0, c), h('span.cmd-cursor', { class: overwrite ? 'cmd-cursor-over' : null }, v[c] || '\u00a0'), v.slice(c + 1));
      }
      function focusKb() { if (!closed) setTimeout(() => { if (!closed && document.activeElement !== kb) kb.focus({ preventScroll: true }); }, 0); }
      function caretEnd() { kb.selectionStart = kb.selectionEnd = kb.value.length; render(); }
      ['input', 'keyup', 'select', 'click'].forEach((ev) => kb.addEventListener(ev, render));
      kb.addEventListener('focus', () => screen.classList.add('cmd-focused'));
      kb.addEventListener('blur', () => screen.classList.remove('cmd-focused'));
      // Pasting several lines runs them one after another.
      kb.addEventListener('input', () => {
        if (!kb.value.includes('\n')) return;
        const lines = kb.value.split(/\r?\n/);
        kb.value = lines.shift();
        queue.push(...lines.filter((l, i) => l.trim() || i < lines.length - 1));
        if (submitFn) submit();
      });
      const queue = [];

      function submit() {
        if (!submitFn) return;
        const text = kb.value.replace(/\r?\n/g, '');
        kb.value = text;
        const fn = submitFn;
        commitInput();
        fn(text);
      }

      // ------------------------------------------------------------ keys
      function onKey(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const k = e.key;
        if (ctrl && k.toLowerCase() === 'c') {
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed && screen.contains(sel.anchorNode)) return; // copying text
          e.preventDefault();
          if (overlayStop) { overlayStop(); return; }
          if (job) { breakJob(); return; }
          if (submitFn) { commitInput('^C'); showPrompt(); }
          return;
        }
        if (overlayStop) { if (!['Shift', 'Control', 'Alt', 'Meta'].includes(k)) { e.preventDefault(); overlayStop(); } return; }
        if (keyWaiter && !['Shift', 'Control', 'Alt', 'Meta'].includes(k)) { e.preventDefault(); const f = keyWaiter; keyWaiter = null; f(k); return; }
        if (!submitFn) { if (k.length === 1 || k === 'Enter' || k === 'Backspace') e.preventDefault(); return; }
        if (k !== 'Tab' && k !== 'Shift') tab = null;
        switch (k) {
          case 'Enter': e.preventDefault(); submit(); return;
          case 'ArrowUp': e.preventDefault(); if (submitFn === runLine) historyNav(-1); return;
          case 'ArrowDown': e.preventDefault(); if (submitFn === runLine) historyNav(1); return;
          case 'Tab': e.preventDefault(); complete(e.shiftKey ? -1 : 1); return;
          case 'Escape': e.preventDefault(); kb.value = ''; render(); return;
          case 'F3': e.preventDefault(); if (hist.length) { kb.value = hist[hist.length - 1]; caretEnd(); } return;
          case 'F7': e.preventDefault(); historyPopup(); return;
          case 'Insert': e.preventDefault(); overwrite = !overwrite; render(); return;
          case 'PageUp': e.preventDefault(); screen.scrollTop -= screen.clientHeight * 0.85; return;
          case 'PageDown': e.preventDefault(); screen.scrollTop += screen.clientHeight * 0.85; return;
        }
        if (overwrite && k.length === 1 && !ctrl && !e.altKey && kb.selectionStart === kb.selectionEnd && kb.selectionStart < kb.value.length) kb.setSelectionRange(kb.selectionStart, kb.selectionStart + 1);
        requestAnimationFrame(render);
      }
      kb.addEventListener('keydown', onKey);
      // If focus drifts elsewhere in the window, send typing back to the console.
      win.el.addEventListener('keydown', (e) => {
        if (e.target === kb || e.defaultPrevented || A.util.isTyping(e)) return;
        if (e.altKey || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() !== 'c')) return;
        kb.focus({ preventScroll: true });
        if (e.key.length === 1 && submitFn && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          kb.setRangeText(e.key, kb.selectionStart, kb.selectionEnd, 'end');
          render();
        } else onKey(e);
      });
      screen.addEventListener('mouseup', () => { const sel = window.getSelection(); if (!sel || sel.isCollapsed) focusKb(); });
      win.on('focus', focusKb);

      function historyNav(dir) {
        if (!hist.length) return;
        if (histPos === -1) { histDraft = kb.value; histPos = hist.length; }
        histPos = Math.max(0, histPos + dir);
        if (histPos >= hist.length) { histPos = -1; kb.value = histDraft; }
        else kb.value = hist[histPos];
        caretEnd();
      }
      // F7: the little history box, pick a line with the arrows.
      function historyPopup() {
        if (!hist.length) return;
        const list = h('div.cmd-hist-list');
        const items = hist.slice(-12);
        let sel = items.length - 1;
        const box = h('div.cmd-hist', null, h('div.cmd-hist-title', null, 'History'), list);
        const draw = () => { list.innerHTML = ''; items.forEach((t, i) => list.appendChild(h('div.cmd-hist-row', { class: i === sel && 'on' }, (i + 1) + ': ' + t))); };
        draw();
        win.body.appendChild(box);
        const prevSubmit = submitFn;
        submitFn = null;
        keyWaiter = null;
        const close = (useIt) => {
          box.remove();
          window.removeEventListener('keydown', keys, true);
          submitFn = prevSubmit;
          if (useIt) { kb.value = items[sel]; caretEnd(); submit(); }
          focusKb();
        };
        const keys = (e) => {
          if (!win.el.contains(document.activeElement)) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); }
          else if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); }
          else if (e.key === 'Enter') close(true);
          else if (e.key === 'Escape' || e.key === 'F7') close(false);
        };
        setTimeout(() => window.addEventListener('keydown', keys, true), 0);
      }

      // Tab completes file and folder names (and commands, first word only).
      let tab = null;
      function complete(dir) {
        if (!tab) {
          const v = kb.value.slice(0, kb.selectionStart);
          const after = kb.value.slice(kb.selectionStart);
          let quoteOpen = false, start = 0;
          for (let i = 0; i < v.length; i++) { if (v[i] === '"') quoteOpen = !quoteOpen; else if (v[i] === ' ' && !quoteOpen) start = i + 1; }
          const token = v.slice(start).replace(/"/g, '');
          const slash = Math.max(token.lastIndexOf('\\'), token.lastIndexOf('/'));
          const dirPart = slash >= 0 ? token.slice(0, slash + 1) : '';
          const prefix = token.slice(slash + 1).toLowerCase();
          let names = [];
          const base = dirPart ? lookup(parse(dirPart)) : lookup(cwd);
          if (base && base.dir) names = listDir(base).filter((it) => !it.hidden || prefix).map((it) => it.name);
          if (!v.slice(0, start).trim() && !dirPart) names = names.concat(Object.keys(COMMANDS), Object.keys(A.apps.aliases));
          const matches = Array.from(new Set(names.filter((n) => n.toLowerCase().startsWith(prefix)))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
          if (!matches.length) return;
          tab = { head: v.slice(0, start), dirPart, after, matches, i: dir > 0 ? -1 : 0 };
        }
        tab.i = (tab.i + dir + tab.matches.length) % tab.matches.length;
        let word = tab.dirPart + tab.matches[tab.i];
        if (/\s/.test(word)) word = '"' + word + '"';
        kb.value = tab.head + word + tab.after;
        kb.selectionStart = kb.selectionEnd = (tab.head + word).length;
        render();
      }

      // ------------------------------------------------------------ jobs
      // A running command can sleep, read a line or wait for a key; Ctrl+C
      // cancels whatever it is waiting on.
      function wait(ms) {
        return new Promise((resolve, reject) => {
          const j = job;
          if (!j || j.aborted) { reject(ABORT); return; }
          const stop = () => { clearTimeout(t); reject(ABORT); };
          const t = setTimeout(() => { j.stops.delete(stop); resolve(); }, ms);
          j.stops.add(stop);
        });
      }
      function readLine(label) {
        return new Promise((resolve, reject) => {
          const j = job;
          if (!j || j.aborted) { reject(ABORT); return; }
          const stop = () => { removeInput(); reject(ABORT); };
          j.stops.add(stop);
          showInput(label, (text) => { j.stops.delete(stop); resolve(text); });
        });
      }
      function readKey() {
        return new Promise((resolve, reject) => {
          const j = job;
          if (!j || j.aborted) { reject(ABORT); return; }
          const stop = () => { keyWaiter = null; reject(ABORT); };
          j.stops.add(stop);
          keyWaiter = (k) => { j.stops.delete(stop); resolve(k); };
        });
      }
      function breakJob() {
        if (!job || job.aborted) return;
        if (inputLine) commitInput('^C');
        else if (job.onBreak) job.onBreak();
        else print('^C');
        job.aborted = true;
        job.stops.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
        job.stops.clear();
      }
      const aborted = () => !job || job.aborted;
      // Keeps a steady number of lines per second even when timers run late,
      // so the fast tree scroll looks the same on every computer.
      function pacer(perSecond) {
        const t0 = performance.now();
        let n = 0;
        return async () => {
          n++;
          const due = ((performance.now() - t0) * perSecond) / 1000;
          if (n > due + 1) await wait(Math.min(200, ((n - due) * 1000) / perSecond));
          else if (n % 40 === 0) await wait(0);
        };
      }
      // Drives a progress bar by elapsed time: step(percent) until 100.
      async function progress(ms, step) {
        const t0 = performance.now();
        for (;;) {
          const pct = Math.min(100, Math.floor(((performance.now() - t0) / ms) * 100));
          step(pct);
          if (pct >= 100) return;
          await wait(45);
        }
      }

      async function runLine(raw) {
        const line = raw.trim();
        if (line) { if (hist[hist.length - 1] !== line) hist.push(line); if (hist.length > 100) hist.shift(); }
        histPos = -1; histDraft = '';
        if (line) {
          job = { aborted: false, stops: new Set() };
          try { await execute(line); }
          catch (err) { if (err !== ABORT) { console.error('[cmd]', err); print('Something went wrong running that command.'); } }
          job = null;
        }
        if (closed) return;
        if (!overlayStop) {
          if (line && echoOn && !/^cls$/i.test(line)) blank();
          nextPrompt();
        }
      }
      function nextPrompt() {
        if (queue.length) { const next = queue.shift(); showPrompt(); kb.value = next; caretEnd(); submit(); return; }
        showPrompt();
      }
      function showPrompt() { showInput(promptString(), runLine); }

      // ------------------------------------------------------------ paths
      // A path is a list of folder names from C:\. C:\Users\<you> is the Aerium home folder.
      const pathText = (segs) => 'C:\\' + segs.join('\\');
      function parse(arg, from) {
        let s = String(arg || '').replace(/"/g, '').replace(/\//g, '\\');
        const drive = /^([a-z]):/i.exec(s);
        if (drive) {
          if (drive[1].toUpperCase() !== 'C') return null;
          s = s.slice(2);
          if (!s.startsWith('\\')) s = '\\' + (from || cwd).join('\\') + (s ? '\\' + s : '');
        }
        const segs = s.startsWith('\\') ? [] : (from || cwd).slice();
        s.split('\\').forEach((part) => {
          if (!part || part === '.') return;
          if (/^\.\.+$/.test(part)) { for (let i = 1; i < part.length; i++) segs.pop(); }
          else segs.push(part.replace(/[. ]+$/, '') || part);
        });
        return segs;
      }
      const isHome = (segs, i) => segs[0] && segs[0].toLowerCase() === 'users' && segs[1] && segs[1].toLowerCase() === USER.toLowerCase() && i >= 1;
      // Finds a file or folder. Returns { segs (real casing), dir, kind: 'vfs'|'fake', path|f } or null.
      function lookup(segs) {
        if (!segs) return null;
        let node = { kind: 'fake', f: fakeRoot, dir: true };
        const canon = [];
        for (let i = 0; i < segs.length; i++) {
          const seg = segs[i].toLowerCase();
          if (!node.dir) return null;
          if (node.kind === 'fake') {
            if (i === 1 && canon[0] === 'Users' && seg === USER.toLowerCase()) { canon.push(USER); node = { kind: 'vfs', path: '/', dir: true }; continue; }
            const key = Object.keys(node.f.c).find((k) => k.toLowerCase() === seg);
            if (!key) return null;
            canon.push(key);
            node = { kind: 'fake', f: node.f.c[key], dir: node.f.c[key].d };
          } else {
            if (node.path === '/' && seg === 'appdata') { canon.push('AppData'); node = { kind: 'fake', f: appData, dir: true, appdata: true }; continue; }
            const hit = vfs.list(node.path).find((it) => it.name.toLowerCase() === seg);
            if (!hit) return null;
            canon.push(hit.name);
            node = { kind: 'vfs', path: hit.path, dir: hit.type === 'folder', item: hit };
          }
        }
        return Object.assign({ segs: canon }, node);
      }
      // Children of a folder: [{ name, dir, size, time, hidden, node }]
      function listDir(node) {
        let out;
        if (node.kind === 'vfs') {
          out = vfs.list(node.path).map((it) => ({ name: it.name, dir: it.type === 'folder', size: it.size || 0, time: it.modified || BOOTED, node: { kind: 'vfs', path: it.path, dir: it.type === 'folder', item: it } }));
          if (node.path === '/') out.push({ name: 'AppData', dir: true, size: 0, time: INSTALL, hidden: true, node: { kind: 'fake', f: appData, dir: true } });
        } else {
          const c = node.f.c;
          out = Object.keys(c).map((k) => ({ name: k, dir: c[k].d, size: c[k].size || 0, time: c[k].time || INSTALL, hidden: !!c[k].hidden, node: { kind: 'fake', f: c[k], dir: c[k].d } }));
          if (node.f === fakeRoot.c.Users) out.push({ name: USER, dir: true, size: 0, time: INSTALL, node: { kind: 'vfs', path: '/', dir: true } });
        }
        return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      }
      const writable = (node) => node && node.kind === 'vfs';
      // Wildcards like *.txt and pic?.png
      const wild = (pat) => new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
      // Resolves an argument that may end in a wildcard: { base (folder node), re, segs } or a direct node.
      function target(arg) {
        const segs = parse(arg);
        if (!segs) return { badDrive: true };
        const last = segs[segs.length - 1] || '';
        if (/[*?]/.test(last)) return { base: lookup(segs.slice(0, -1)), re: wild(last), segs: segs.slice(0, -1), pattern: last };
        return { node: lookup(segs), segs };
      }

      // ------------------------------------------------------------ dispatch
      function expand(s) {
        return s.replace(/%([^%\s]+)%/g, (m, k) => {
          const K = k.toUpperCase();
          if (K === 'CD') return pathText(cwd);
          if (K === 'DATE') return A.util.DAYS[new Date().getDay()].slice(0, 3) + ' ' + A.util.fmtDate();
          if (K === 'TIME') { const d = new Date(); return d.getHours() + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + '.' + pad2(Math.floor(d.getMilliseconds() / 10)); }
          if (K === 'RANDOM') return String(Math.floor(Math.random() * 32768));
          if (K === 'ERRORLEVEL') return '0';
          return vars[K] != null ? vars[K] : m;
        });
      }
      function tokens(s) {
        const out = [];
        const re = /"([^"]*)"|(\S+)/g;
        let m;
        while ((m = re.exec(s))) out.push(m[1] != null ? m[1] : m[2]);
        return out;
      }
      async function execute(line) {
        line = expand(line);
        // "cd.." and "cd\" work without a space, just like the real thing.
        const m = /^\s*(cd|chdir|md|mkdir|rd|rmdir|dir|echo|type)([.\\/].*)$/i.exec(line);
        if (m && !/^\s*echo\./i.test(line)) line = m[1] + ' ' + m[2];
        const tk = tokens(line);
        if (!tk.length) return;
        const word = tk[0].toLowerCase().replace(/\.(exe|com|bat)$/, '');
        const args = tk.slice(1);
        const rest = line.replace(/^\s*\S+\s?/, '');
        if (/^[a-z]:$/.test(word)) return driveCmd(word);
        if (args[0] === '/?' && HELP[word]) { print(HELP[word]); return; }
        if (/^echo[.:]/.test(word)) { print(line.replace(/^\s*echo[.:]/i, '')); return; }
        if (COMMANDS[word]) return COMMANDS[word](args, rest, line);
        if (A.apps.get(word)) return launchApp(word, args);
        print("'" + tk[0] + "' is not recognized as an internal or external command,\noperable program or batch file.");
      }
      function launchApp(id, args) {
        const app = A.apps.get(id);
        const a = {};
        if (args && args[0]) {
          const n = lookup(parse(args[0]));
          if (n && n.kind === 'vfs') a.path = n.path;
          else if (/^(https?:\/\/|www\.)/i.test(args[0])) a.url = args[0];
        }
        A.apps.launch(app.id, a);
      }

      // ------------------------------------------------------------ commands
      const COMMANDS = {};
      const HELP = {};
      const LISTED = [];
      function def(names, summary, usage, fn) {
        names.split(' ').forEach((n, i) => { COMMANDS[n] = fn; if (i === 0 && summary) LISTED.push([n.toUpperCase(), summary]); if (usage) HELP[n] = usage; });
      }

      def('help', 'Provides help information for commands.', 'Provides help information for commands.\n\nHELP [command]\n\n    command - displays help information on that command.', (a) => {
        const c = (a[0] || '').toLowerCase();
        if (c) { print(HELP[c] || 'This command is not supported by the help utility.  Try "' + c + ' /?".'); return; }
        print('For more information on a specific command, type HELP command-name');
        LISTED.slice().sort((x, y) => x[0].localeCompare(y[0])).forEach(([n, d]) => printParts([[n.padEnd(15), rainbow ? null : '#ffffff'], [d]]));
        blank();
        print('You can also type the name of a program, like notepad, calc or mspaint.');
        print('There are a few secret commands, too. The fish know them.');
      });
      def('cls', 'Clears the screen.', 'Clears the screen.\n\nCLS', () => {
        Array.from(screen.children).forEach((n) => { if (n !== inputLine) n.remove(); });
        lineCount = 0;
      });
      def('ver', 'Displays the Aerium version.', 'Displays the Aerium version.\n\nVER', () => { blank(); print(VERSION); });
      def('vol', 'Displays the disk volume label and serial number.', 'Displays the disk volume label and serial number.\n\nVOL [drive:]', () => {
        print(' Volume in drive C is AERIUM');
        print(' Volume Serial Number is 2007-AE71');
      });
      def('echo', 'Displays messages, or turns command echoing on or off.', 'Displays messages, or turns command-echoing on or off.\n\n  ECHO [ON | OFF]\n  ECHO [message]\n\nType ECHO without parameters to display the current echo setting.', (a, rest) => {
        const r = rest.trim();
        if (!r) print('ECHO is ' + (echoOn ? 'on.' : 'off.'));
        else if (/^off$/i.test(r)) echoOn = false;
        else if (/^on$/i.test(r)) echoOn = true;
        else print(rest);
      });
      def('title', 'Sets the window title for the Command Prompt window.', 'Sets the window title for the command prompt window.\n\nTITLE [string]', (a, rest) => { win.setTitle(rest.trim() || 'Command Prompt'); });
      def('exit', 'Closes the Command Prompt.', 'Quits the Command Prompt.\n\nEXIT', () => { win.close(); });
      def('pause', 'Suspends processing and waits for a key.', 'Suspends processing and displays the message\n    Press any key to continue . . .\n\nPAUSE', async () => {
        print('Press any key to continue . . . ');
        await readKey();
      });
      def('prompt', 'Changes the command prompt.', 'Changes the command prompt.\n\nPROMPT [text]\n\n  $P  Current drive and path    $G  > (greater-than sign)\n  $T  Current time              $D  Current date\n  $N  Current drive             $V  Aerium version\n  $$  $ (dollar sign)\n\nTry: prompt $T$G', (a, rest) => { promptFmt = rest.trim() || '$P$G'; vars.PROMPT = promptFmt; });
      def('set', 'Displays or sets environment variables.', 'Displays, sets, or removes environment variables.\n\nSET [variable=[string]]', (a, rest) => {
        const r = rest.trim();
        const eq = r.indexOf('=');
        if (eq > 0) { const k = r.slice(0, eq).trim().toUpperCase(); const v = r.slice(eq + 1); if (v) vars[k] = v; else delete vars[k]; return; }
        const list = Object.keys(vars).sort().filter((k) => !r || k.startsWith(r.toUpperCase()));
        if (!list.length) { print('Environment variable ' + r + ' not defined'); return; }
        list.forEach((k) => print(k + '=' + vars[k]));
      });
      def('whoami', 'Displays the current user name.', 'Displays the name of the current user.\n\nWHOAMI', () => print((hostName() + '\\' + USER).toLowerCase()));
      def('hostname', 'Prints the name of this computer.', 'Prints the name of the current host.\n\nHOSTNAME', () => print(hostName()));
      def('date', 'Displays or sets the date.', 'Displays or sets the date.\n\nDATE [/T | date]\n\nType DATE /T to display the date without asking for a new one.', async (a) => {
        const d = new Date();
        const today = A.util.DAYS[d.getDay()].slice(0, 3) + ' ' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + '/' + d.getFullYear();
        if (a[0] && a[0].toLowerCase() === '/t') { print(today); return; }
        print('The current date is: ' + today);
        const v = await readLine('Enter the new date: (mm-dd-yy) ');
        if (v.trim()) print('A required privilege is not held by the client.');
      });
      def('time', 'Displays or sets the system time.', 'Displays or sets the system time.\n\nTIME [/T | time]\n\nType TIME /T to display the time without asking for a new one.', async (a) => {
        const d = new Date();
        if (a[0] && a[0].toLowerCase() === '/t') { print(A.util.fmtTime(d)); return; }
        print('The current time is: ' + String(d.getHours()).padStart(2, ' ') + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + '.' + pad2(Math.floor(d.getMilliseconds() / 10)));
        const v = await readLine('Enter the new time: ');
        if (v.trim()) print('A required privilege is not held by the client.');
      });
      def('color', 'Sets the default console foreground and background colors.', colorHelp(), (a) => colorCmd(a));
      function colorHelp() {
        const rows = [];
        for (let i = 0; i < 8; i++) rows.push('    ' + i.toString(16).toUpperCase() + ' = ' + COLOR_NAMES[i].padEnd(14) + (i + 8).toString(16).toUpperCase() + ' = ' + COLOR_NAMES[i + 8]);
        return 'Sets the default console foreground and background colors.\n\nCOLOR [attr]\n\n  attr        Specifies color attribute of console output\n\nColor attributes are specified by TWO hex digits -- the first\ncorresponds to the background; the second the foreground.\nEach digit can be any of the following values:\n\n' + rows.join('\n') +
          '\n\nIf no argument is given, this command restores the color to what it was\nwhen the Command Prompt started.\n\nExample: "COLOR 0A" makes green text on a black background.';
      }
      function colorCmd(a) {
        const code = (a[0] || '').toLowerCase();
        if (!code) { fg = PALETTE[7]; bg = PALETTE[0]; rainbow = false; applyColors(); return; }
        if (code === 'rainbow') {
          rainbow = true; bg = PALETTE[0]; fg = PALETTE.f; applyColors();
          printParts('Rainbow mode! Type COLOR to go back to normal.'.split('').map((ch, i) => [ch, RAINBOW[i % RAINBOW.length]]));
          A.sound.play('coin');
          return;
        }
        if (!/^[0-9a-f]{1,2}$/.test(code)) { print(HELP.color); return; }
        const b = code.length === 2 ? code[0] : '0', f = code.length === 2 ? code[1] : code[0];
        if (b === f) return; // the real one quietly refuses matching colors
        rainbow = false;
        bg = PALETTE[b]; fg = PALETTE[f];
        applyColors();
        A.sound.play('click');
      }
      function driveCmd(d) {
        if (d === 'c:') return;
        if (d === 'a:' || d === 'b:') print('The device is not ready.');
        else print('The system cannot find the drive specified.');
      }

      // ------------------------------------------------------------ files and folders
      const freeBytes = () => Math.max(0, (vfs.capacity || 171798691840) - (vfs.used ? vfs.used() : 41020000000));
      function dirLine(it) {
        return dirStamp(it.time) + (it.dir ? '    <DIR>          ' : num(it.size).padStart(18) + ' ') + it.name;
      }
      def('dir', 'Displays a list of files and subdirectories in a directory.', 'Displays a list of files and subdirectories in a directory.\n\nDIR [drive:][path][filename] [/A] [/B] [/S] [/W]\n\n  /A   Displays hidden files too.\n  /B   Uses bare format (no heading information or summary).\n  /S   Displays files in the directory and all subdirectories.\n  /W   Uses wide list format.', async (a) => {
        const sw = a.filter((x) => /^\/./.test(x)).map((x) => x.slice(1).toLowerCase());
        const showHidden = sw.some((x) => x.startsWith('a')), bare = sw.includes('b'), sub = sw.includes('s'), wide = sw.includes('w');
        const argp = a.find((x) => !/^\/./.test(x));
        const segs = argp ? parse(argp) : cwd;
        if (!segs) { print('The system cannot find the drive specified.'); return; }
        let node = lookup(segs), re = null;
        if (!node || !node.dir) {
          const parent = lookup(segs.slice(0, -1));
          if (!parent || !parent.dir || (!node && !/[*?]/.test(segs[segs.length - 1] || '') && !sub)) {
            if (!bare) { print(' Volume in drive C is AERIUM'); print(' Volume Serial Number is 2007-AE71'); blank(); print(' Directory of ' + pathText(parent ? parent.segs : segs.slice(0, -1))); blank(); }
            print('File Not Found');
            return;
          }
          re = wild(segs[segs.length - 1]);
          node = parent;
        }
        if (!bare) { print(' Volume in drive C is AERIUM'); print(' Volume Serial Number is 2007-AE71'); }
        let tFiles = 0, tBytes = 0, tDirs = 0, lines = 0, found = false;
        const one = async (n, s) => {
          const kids = listDir(n).filter((it) => showHidden || !it.hidden);
          const items = kids.filter((it) => !re || re.test(it.name));
          if (items.length || !re) {
            found = found || items.length > 0;
            let files = 0, bytes = 0, dirs = 0;
            if (!bare) { blank(); print(' Directory of ' + pathText(s)); blank(); }
            const rows = (s.length && !re && !bare ? [{ name: '.', dir: true, time: BOOTED }, { name: '..', dir: true, time: BOOTED }] : []).concat(items);
            if (wide && !bare) {
              const cells = rows.map((it) => (it.dir ? '[' + it.name + ']' : it.name));
              const w = Math.min(28, Math.max(...cells.map((c) => c.length), 8) + 2);
              const per = Math.max(1, Math.floor(76 / w));
              for (let i = 0; i < cells.length; i += per) print(cells.slice(i, i + per).map((c) => c.padEnd(w)).join('').trimEnd());
            }
            for (const it of rows) {
              if (it.dir) dirs++; else { files++; bytes += it.size || 0; }
              if (bare) { if (it.name !== '.' && it.name !== '..') print(sub ? pathText(s.concat(it.name)) : it.name); }
              else if (!wide) print(dirLine(it));
              if (++lines % 60 === 0) await wait(10);
            }
            tFiles += files; tBytes += bytes; tDirs += dirs;
            if (!bare) print(String(files).padStart(16) + ' File(s) ' + num(bytes).padStart(14) + ' bytes');
            if (!sub && !bare) print(String(dirs).padStart(16) + ' Dir(s) ' + num(freeBytes()).padStart(15) + ' bytes free');
          }
          if (sub) for (const d of kids.filter((it) => it.dir)) { if (aborted()) throw ABORT; await one(d.node, s.concat(d.name)); }
        };
        await one(node, node.segs);
        if (sub && !bare) {
          blank();
          print('     Total Files Listed:');
          print(String(tFiles).padStart(16) + ' File(s) ' + num(tBytes).padStart(14) + ' bytes');
          print(String(tDirs).padStart(16) + ' Dir(s) ' + num(freeBytes()).padStart(15) + ' bytes free');
        }
        if (re && !found) print('File Not Found');
      });
      def('cd chdir', 'Displays the name of or changes the current directory.', 'Displays the name of or changes the current directory.\n\nCD [/D] [drive:][path]\nCD [..]\n\n  ..   Specifies that you want to change to the parent directory.\n\nType CD drive: to display the current directory in the specified drive.\nType CD without parameters to display the current drive and directory.', (a, rest) => {
        const r = rest.trim().replace(/^\/d\s+/i, '');
        if (!r) { print(pathText(cwd)); return; }
        const segs = parse(r);
        if (!segs) { print('The system cannot find the drive specified.'); return; }
        const n = lookup(segs);
        if (!n) { print('The system cannot find the path specified.'); return; }
        if (!n.dir) { print('The directory name is invalid.'); return; }
        cwd = n.segs;
      });
      def('tree', 'Graphically displays the folder structure of a drive or path.', 'Graphically displays the folder structure of a drive or path.\n\nTREE [drive:][path] [/F] [/A]\n\n   /F   Display the names of the files in each folder.\n   /A   Use ASCII instead of extended characters.', async (a) => {
        const withFiles = a.some((x) => x.toLowerCase() === '/f');
        const G = a.some((x) => x.toLowerCase() === '/a') ? { t: '+---', l: '\\---', v: '|   ', s: '    ' } : { t: '├───', l: '└───', v: '│   ', s: '    ' };
        const argp = a.find((x) => !x.startsWith('/'));
        const segs = argp ? parse(argp) : cwd;
        const n = segs && lookup(segs);
        if (!n || !n.dir) { print('Invalid path - ' + (argp ? argp.toUpperCase() : '\\')); return; }
        print('Folder PATH listing for volume AERIUM');
        print('Volume serial number is 2007-AE71');
        print(pathText(n.segs).toUpperCase());
        let count = 0;
        const pace = pacer(170);
        const walk = async (node, prefix) => {
          const kids = listDir(node);
          const dirs = kids.filter((k) => k.dir);
          if (withFiles) {
            const files = kids.filter((k) => !k.dir);
            files.forEach((f) => print(prefix + (dirs.length ? G.v : G.s) + f.name));
            if (files.length) print(prefix + (dirs.length ? G.v : G.s));
          }
          for (let i = 0; i < dirs.length; i++) {
            if (aborted()) throw ABORT;
            const last = i === dirs.length - 1;
            print(prefix + (last ? G.l : G.t) + dirs[i].name);
            count++;
            await pace(); // the famous fast scroll
            await walk(dirs[i].node, prefix + (last ? G.s : G.v));
          }
        };
        await walk(n, '');
        if (!count) print('No subfolders exist');
      });
      const TEXT_EXT = /\.(txt|log|ini|md|bat|cmd|csv|htm|html|xml|json|js|css|inf|reg|nfo)$/i;
      function garble(seed) {
        const rnd = A.util.seeded(hash(seed));
        const cs = 'ÿØÿàÉ¶§¤¥¦©®±µ¼½¾ÆÐ×ßæðøþ░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬█▄▌▐▀αΓπΣστΦΘΩδ∞φε∩≡≥≤⌠⌡÷≈°∙·√ⁿ²■';
        let s = seed.slice(0, 4).toUpperCase();
        for (let i = 0; i < 180; i++) s += rnd() < 0.12 ? ' ' : cs[Math.floor(rnd() * cs.length)];
        return s;
      }
      def('type', 'Displays the contents of a text file.', 'Displays the contents of a text file or files.\n\nTYPE [drive:][path]filename', async (a) => {
        if (!a.length) { print('The syntax of the command is incorrect.'); return; }
        for (const arg of a) {
          const n = lookup(parse(arg));
          if (!n) { print('The system cannot find the file specified.'); continue; }
          if (n.dir) { print('Access is denied.'); continue; }
          let text, bin;
          if (n.kind === 'vfs') {
            text = String(vfs.read(n.path) == null ? '' : vfs.read(n.path));
            bin = /^(asset|data|track|video|app|file):/.test(text) && !TEXT_EXT.test(n.path);
          } else { text = n.f.text; bin = !!n.f.bin; }
          if (a.length > 1) { blank(); print(n.segs[n.segs.length - 1]); blank(); }
          if (bin) { const g = garble(n.segs.join('/')); for (let i = 0; i < g.length; i += 72) print(g.slice(i, i + 72)); A.sound.play('ding'); continue; }
          const lines = text.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) { print(lines[i]); if (i % 80 === 79) await wait(8); }
        }
      });
      function badName(name) { return !name || /[\\/:*?"<>|]/.test(name); }
      def('mkdir md', 'Creates a directory.', 'Creates a directory.\n\nMKDIR [drive:]path\nMD [drive:]path\n\nMKDIR creates any folders in the path that do not exist yet.', (a) => {
        if (!a.length) { print('The syntax of the command is incorrect.'); return; }
        for (const arg of a) {
          const segs = parse(arg);
          if (!segs) { print('The system cannot find the drive specified.'); continue; }
          if (lookup(segs)) { print('A subdirectory or file ' + arg + ' already exists.'); continue; }
          let i = segs.length;
          while (i > 0 && !lookup(segs.slice(0, i))) i--;
          const base = lookup(segs.slice(0, i));
          if (!base || !base.dir || !writable(base)) { print('Access is denied.'); continue; }
          if (segs.slice(i).some(badName)) { print('The filename, directory name, or volume label syntax is incorrect.'); continue; }
          try {
            let p = base.path;
            segs.slice(i).forEach((name) => { p = vfs.join(p, name); vfs.mkdir(p); });
          } catch (err) { print(err.message); }
        }
      });
      def('rd rmdir', 'Removes a directory.', 'Removes (deletes) a directory.\n\nRMDIR [/S] [/Q] [drive:]path\nRD [/S] [/Q] [drive:]path\n\n    /S   Removes the folder and everything in it.\n    /Q   Quiet mode, does not ask if ok to remove a directory tree with /S', async (a) => {
        const s = a.some((x) => x.toLowerCase() === '/s'), q = a.some((x) => x.toLowerCase() === '/q');
        const args = a.filter((x) => !x.startsWith('/'));
        if (!args.length) { print('The syntax of the command is incorrect.'); return; }
        for (const arg of args) {
          const n = lookup(parse(arg));
          if (!n || !n.dir) { print(n ? 'The directory name is invalid.' : 'The system cannot find the file specified.'); continue; }
          if (!writable(n) || n.path === '/') { print('Access is denied.'); continue; }
          if (cwd.join('\\').toLowerCase().startsWith(n.segs.join('\\').toLowerCase())) { print('The process cannot access the file because it is being used by another process.'); continue; }
          if (vfs.list(n.path).length && !s) { print('The directory is not empty.'); continue; }
          if (s && !q) { const ans = await readLine(arg + ', Are you sure (Y/N)? '); if (!/^y/i.test(ans.trim())) continue; }
          try { vfs.remove(n.path); A.sound.play('recycle'); } catch (err) { print('Access is denied.'); }
        }
      });
      def('del erase', 'Deletes one or more files.', 'Deletes one or more files. Deleted files go to the Recycle Bin.\n\nDEL [/Q] names\nERASE [/Q] names\n\n  names   Specifies a list of one or more files or directories.\n          Wildcards may be used to delete multiple files. If a\n          directory is specified, all files within it are deleted.\n  /Q      Quiet mode, do not ask if ok to delete on global wildcard', async (a) => {
        const quiet = a.some((x) => x.toLowerCase() === '/q');
        const args = a.filter((x) => !x.startsWith('/'));
        if (!args.length) { print('The syntax of the command is incorrect.'); return; }
        let removed = 0;
        for (const arg of args) {
          const t = target(arg);
          if (t.badDrive) { print('The system cannot find the drive specified.'); continue; }
          let folder = null, re = null;
          if (t.node && t.node.dir) { folder = t.node; re = /.*/; }
          else if (t.base && t.base.dir) { folder = t.base; re = t.re; }
          if (folder) {
            if (!writable(folder)) { print('Access is denied.'); continue; }
            const files = listDir(folder).filter((it) => !it.dir && !it.hidden && re.test(it.name));
            const global = (t.node && t.node.dir) || /^\*(\.\*)?$/.test(t.pattern || '');
            if (global && !quiet) {
              const ans = await readLine(pathText(folder.segs.concat('*')) + ', Are you sure (Y/N)? ');
              if (!/^y/i.test(ans.trim())) continue;
            }
            if (!files.length) { print('Could Not Find ' + pathText(folder.segs.concat(t.pattern || '*'))); continue; }
            files.forEach((f) => { try { vfs.remove(f.node.path); removed++; } catch (err) { print('Access is denied.'); } });
            continue;
          }
          if (!t.node) { print('Could Not Find ' + pathText(t.segs)); continue; }
          if (!writable(t.node)) { print('Access is denied.'); continue; }
          try { vfs.remove(t.node.path); removed++; } catch (err) { print('Access is denied.'); }
        }
        if (removed) A.sound.play('recycle');
      });
      def('ren rename', 'Renames a file or files.', 'Renames a file or files.\n\nRENAME [drive:][path]filename1 filename2\nREN [drive:][path]filename1 filename2\n\nNote that you cannot specify a new drive or path for your destination file.', (a) => {
        if (a.length < 2) { print('The syntax of the command is incorrect.'); return; }
        const n = lookup(parse(a[0]));
        if (!n) { print('The system cannot find the file specified.'); return; }
        if (!writable(n) || n.path === '/') { print('Access is denied.'); return; }
        if (badName(a[1])) { print('The syntax of the command is incorrect.'); return; }
        try { vfs.rename(n.path, a[1]); } catch (err) { print('A duplicate file name exists, or the file cannot be found.'); }
      });
      // copy and move share their plumbing
      async function transfer(a, moving) {
        const args = a.filter((x) => !/^\/[yv-]/i.test(x));
        if (!args.length) { print('The syntax of the command is incorrect.'); return; }
        const t = target(args[0]);
        let sources = [];
        if (t.node && !t.node.dir) sources = [t.node];
        else if (t.node && t.node.dir) sources = listDir(t.node).filter((it) => !it.dir && !it.hidden).map((it) => Object.assign({ segs: t.node.segs.concat(it.name) }, it.node));
        else if (t.base && t.base.dir) sources = listDir(t.base).filter((it) => !it.dir && t.re.test(it.name)).map((it) => Object.assign({ segs: t.base.segs.concat(it.name) }, it.node));
        if (!sources.length) { print('The system cannot find the file specified.'); print('        0 file(s) ' + (moving ? 'moved.' : 'copied.')); return; }
        const destSegs = args[1] ? parse(args[1]) : cwd;
        const dn = destSegs && lookup(destSegs);
        let destDir, newName = null;
        if (dn && dn.dir) destDir = dn;
        else {
          destDir = destSegs && lookup(destSegs.slice(0, -1));
          newName = destSegs ? destSegs[destSegs.length - 1] : null;
          if (dn && !dn.dir) newName = dn.segs[dn.segs.length - 1];
        }
        if (!destDir || !destDir.dir) { print('The system cannot find the path specified.'); return; }
        if (!writable(destDir)) { print('Access is denied.'); return; }
        let done = 0, all = false;
        for (const src of sources) {
          const name = newName && sources.length === 1 ? newName : src.segs[src.segs.length - 1];
          const destPath = vfs.join(destDir.path, name);
          if (src.kind === 'vfs' && vfs.normalize(src.path) === vfs.normalize(destPath)) { print('The file cannot be copied onto itself.'); continue; }
          if (vfs.exists(destPath) && !all) {
            const ans = (await readLine('Overwrite ' + pathText(destDir.segs.concat(name)) + '? (Yes/No/All): ')).trim().toLowerCase();
            if (ans.startsWith('a')) all = true;
            else if (!ans.startsWith('y')) continue;
          }
          try {
            if (src.kind === 'vfs') {
              if (vfs.exists(destPath)) vfs.remove(destPath, { permanent: true });
              if (moving) { const moved = vfs.move(src.path, destDir.path); if (vfs.basename(moved) !== name) vfs.rename(moved, name); }
              else { const copied = vfs.copy(src.path, destDir.path); if (vfs.basename(copied) !== name) vfs.rename(copied, name); }
            } else {
              if (moving || src.f.bin) { print('Access is denied.'); continue; }
              vfs.write(destPath, src.f.text, { mime: 'text/plain' });
            }
            if (sources.length > 1) print(pathText(src.segs));
            done++;
          } catch (err) { print(err.message); }
        }
        print('        ' + done + ' file(s) ' + (moving ? 'moved.' : 'copied.'));
      }
      def('copy', 'Copies one or more files to another location.', 'Copies one or more files to another location.\n\nCOPY source [destination]\n\n  source       Specifies the file or files to be copied.\n  destination  Specifies the directory and/or filename for the new file(s).', (a) => transfer(a, false));
      def('move', 'Moves one or more files from one directory to another directory.', 'Moves files.\n\nMOVE [drive:][path]filename destination', (a) => transfer(a, true));
      def('start', 'Starts a program or opens a file.', 'Starts a separate window to run a specified program or command.\n\nSTART ["title"] [command/program] [parameters]\n\nTry: start calc, start notepad, start . (opens this folder)', (a) => {
        const args = a.filter((x) => !/^\/(min|max|wait|b)$/i.test(x));
        if (!args.length) { A.apps.launch('cmd'); return; }
        const t = args[0];
        if (/^(https?:\/\/|www\.)/i.test(t)) { if (A.apps.get('browser')) A.apps.launch('browser', { url: t }); else print('The system cannot find the file ' + t + '.'); return; }
        const id = t.toLowerCase().replace(/\.(exe|com)$/, '');
        if (A.apps.get(id)) { launchApp(id, args.slice(1)); return; }
        const n = lookup(parse(t));
        if (n && n.kind === 'vfs') { A.apps.openFile(n.path); return; }
        if (n && n.dir && A.apps.get('explorer')) { A.apps.launch('explorer', { path: 'computer' }); return; }
        print('The system cannot find the file ' + t + '.');
      });

      // ------------------------------------------------------------ programs
      // Task Manager shares its process list (A.procmon) so PIDs match everywhere.
      function processes() {
        if (A.procmon) { A.procmon.tick(); return A.procmon.list(); }
        const list = [{ image: 'System Idle Process', pid: 0, mem: 24, user: 'SYSTEM' }, { image: 'System', pid: 4, mem: 1320, user: 'SYSTEM' }];
        A.wm.windows.filter((w) => w.app && w.taskbar).forEach((w, i) => list.push({ image: w.app + '.exe', pid: 2400 + i * 4, mem: 18000, user: USER, win: w }));
        return list;
      }
      def('tasklist', 'Displays all currently running tasks.', 'Displays a list of the programs currently running.\n\nTASKLIST', () => {
        blank();
        print('Image Name                     PID Session Name        Session#    Mem Usage');
        print('========================= ======== ================ =========== ============');
        processes().forEach((p) => {
          const sys = p.user === 'SYSTEM' || p.user === 'LOCAL SERVICE' || p.user === 'NETWORK SERVICE';
          print(p.image.slice(0, 25).padEnd(25) + String(p.pid).padStart(9) + ' ' + (sys ? 'Services' : 'Console').padEnd(16) + String(sys ? 0 : 1).padStart(12) + (num(p.mem) + ' K').padStart(13));
        });
      });
      def('taskkill', 'Ends one or more tasks or processes.', 'Ends one or more tasks or processes.\n\nTASKKILL [/F] /IM imagename\nTASKKILL [/F] /PID processid\n\nExamples:\n    TASKKILL /IM notepad.exe\n    TASKKILL /PID 1230', (a) => {
        const low = a.map((x) => x.toLowerCase());
        const im = low.indexOf('/im'), pidI = low.indexOf('/pid');
        if ((im < 0 || !a[im + 1]) && (pidI < 0 || !a[pidI + 1])) { print('ERROR: Invalid syntax. Neither /FI nor /PID nor /IM were specified.'); print('Type "TASKKILL /?" for usage.'); return; }
        const list = processes();
        let hits;
        if (im >= 0) {
          const want = a[im + 1].toLowerCase();
          const re = wild(want.includes('.') || want.includes('*') ? want : want + '.exe');
          const byAlias = A.apps.get(want.replace(/\.exe$/, ''));
          hits = list.filter((p) => re.test(p.image) || (byAlias && p.win && p.win.app === byAlias.id));
          if (!hits.length) { print('ERROR: The process "' + a[im + 1] + '" not found.'); return; }
        } else {
          const pid = parseInt(a[pidI + 1], 10);
          hits = list.filter((p) => p.pid === pid);
          if (!hits.length) { print('ERROR: The process "' + a[pidI + 1] + '" not found.'); return; }
        }
        hits.forEach((p) => {
          const r = A.procmon ? A.procmon.kill(p.pid) : (p.win ? (p.win.close(true), { ok: true }) : { ok: false, critical: true });
          if (r.ok) print('SUCCESS: The process "' + p.image + '" with PID ' + p.pid + ' has been terminated.');
          else {
            print('ERROR: The process "' + p.image + '" with PID ' + p.pid + ' could not be terminated.');
            print('Reason: ' + (r.critical ? 'This is critical system process. Taskkill cannot end this process.' : 'Access is denied.'));
          }
        });
      });

      // ------------------------------------------------------------ network
      function resolveHost(host) {
        const x = host.toLowerCase();
        const me = hostName().toLowerCase();
        if (x === 'localhost' || x === me || x === 'fish.tank' || /^127\.\d+\.\d+\.\d+$/.test(x)) return { name: x === 'fish.tank' ? 'fish.tank' : hostName(), ip: /^127\./.test(x) ? x : '127.0.0.1', local: true, ttl: 128 };
        const n = hash(x);
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(x)) {
          if (x.split('.').some((o) => Number(o) > 255)) return null;
          const lan = /^(192\.168|10\.)/.test(x);
          return { name: x, ip: x, base: lan ? 2 : 20 + (n % 70), jitter: lan ? 3 : 12, ttl: lan ? 64 : 44 + (n % 12), lost: x === '192.168.1.254' };
        }
        if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(x)) return null;
        return { name: x, ip: (12 + (n % 200)) + '.' + ((n >>> 8) & 255) + '.' + ((n >>> 16) & 255) + '.' + (1 + ((n >>> 24) % 253)), base: 18 + (n % 80), jitter: 14, ttl: 44 + (n % 12) };
      }
      def('ping', 'Checks whether another computer answers.', 'Usage: ping [-t] [-n count] [-l size] target_name\n\nOptions:\n    -t         Ping the specified host until stopped (press Ctrl+C).\n    -n count   Number of echo requests to send.\n    -l size    Send buffer size.', async (a) => {
        let count = 4, forever = false, host = null, size = 32;
        for (let i = 0; i < a.length; i++) {
          const x = a[i].toLowerCase();
          if (x === '-t' || x === '/t') forever = true;
          else if ((x === '-n' || x === '/n') && a[i + 1]) count = Math.max(1, Math.min(9999, parseInt(a[++i], 10) || 4));
          else if ((x === '-l' || x === '/l') && a[i + 1]) size = Math.max(0, Math.min(65500, parseInt(a[++i], 10) || 32));
          else if (!/^[-/]/.test(x)) host = a[i];
        }
        if (!host) { print(HELP.ping); return; }
        const r = resolveHost(host);
        if (!r) { print('Ping request could not find host ' + host + '. Please check the name and try again.'); return; }
        blank();
        print('Pinging ' + (r.name !== r.ip ? r.name + ' [' + r.ip + ']' : r.ip) + ' with ' + size + ' bytes of data:');
        const times = [];
        let sent = 0;
        const stats = () => {
          blank();
          print('Ping statistics for ' + r.ip + ':');
          const lost = sent - times.length;
          print('    Packets: Sent = ' + sent + ', Received = ' + times.length + ', Lost = ' + lost + ' (' + (sent ? Math.round((lost / sent) * 100) : 0) + '% loss),');
          if (times.length) {
            print('Approximate round trip times in milli-seconds:');
            print('    Minimum = ' + Math.min(...times) + 'ms, Maximum = ' + Math.max(...times) + 'ms, Average = ' + Math.round(times.reduce((s, t) => s + t, 0) / times.length) + 'ms');
          }
        };
        job.onBreak = () => { stats(); print('Control-C'); print('^C'); };
        for (let i = 0; forever || i < count; i++) {
          await wait(i === 0 ? 350 : 1000);
          sent++;
          if (r.lost || (!r.local && Math.random() < 0.02)) { print('Request timed out.'); continue; }
          const t = r.local ? 0 : Math.max(1, Math.round(r.base + (Math.random() - 0.35) * r.jitter));
          times.push(t);
          print('Reply from ' + r.ip + ': bytes=' + size + ' time' + (t < 1 ? '<1ms' : '=' + t + 'ms') + ' TTL=' + r.ttl);
        }
        job.onBreak = null;
        stats();
      });
      const HOPS = [
        ['home-router.lan', '192.168.1.1'], ['your-isp-says-hi.local', '10.64.0.1'], ['series-of-tubes.backbone.net', '72.14.215.1'],
        ['a-much-bigger-tube.backbone.net', '72.14.232.66'], ['seagull-relay-07.coastal.net', '64.233.174.9'], ['dolphin-approved.undersea-cable.net', '209.85.250.3'],
        ['cloud-nine.sky-exchange.net', '216.239.49.1'], ['coffee-break.slow-router.org', '66.249.94.2'], ['almost-there.last-mile.net', '209.85.241.7'],
      ];
      def('tracert', 'Traces the route packets take to another computer.', 'Usage: tracert [-d] [-h maximum_hops] target_name', async (a) => {
        const host = a.find((x) => !/^[-/]/.test(x));
        if (!host) { print(HELP.tracert); return; }
        const r = resolveHost(host);
        if (!r) { print('Unable to resolve target system name ' + host + '.'); return; }
        blank();
        print('Tracing route to ' + (r.name !== r.ip ? r.name + ' [' + r.ip + ']' : r.ip));
        print('over a maximum of 30 hops:');
        blank();
        const n = hash(host.toLowerCase());
        const hops = r.local ? [] : HOPS.slice(0, 2).concat(HOPS.slice(2).filter((h0, i) => ((n >> i) & 1) || i === 1 || i === 5)).slice(0, 8);
        let ms = 1;
        const cell = (t) => (t == null ? '*'.padStart(4) + '    ' : ((t < 1 ? '<1' : String(t)).padStart(4) + ' ms '));
        for (let i = 0; i <= hops.length; i++) {
          await wait(260 + Math.random() * 520);
          const last = i === hops.length;
          const hop = last ? [r.name !== r.ip ? r.name : null, r.ip] : hops[i];
          ms = last ? (r.local ? 0 : r.base) : Math.max(ms, (i === 0 ? 1 : i * 9) + Math.floor(Math.random() * 8)) + (hop[0] && hop[0].startsWith('coffee') ? 60 : 0);
          const timeout = !last && i > 1 && Math.random() < 0.12;
          const t = () => (timeout ? null : Math.max(r.local ? 0 : 1, ms + Math.round((Math.random() - 0.5) * 6)));
          print(String(i + 1).padStart(3) + '  ' + cell(t()) + ' ' + cell(t()) + ' ' + cell(t()) + ' ' + (timeout ? 'Request timed out.' : (hop[0] ? hop[0] + ' [' + hop[1] + ']' : hop[1])));
        }
        blank();
        print('Trace complete.');
      });
      def('ipconfig', 'Displays the network settings.', 'USAGE:\n    ipconfig [/all | /release | /renew]\n\n    /all     Display full configuration information.\n    /release Release the IPv4 address.\n    /renew   Renew the IPv4 address.', async (a) => {
        const opt = (a[0] || '').toLowerCase();
        const all = opt === '/all';
        const net = A.store.get('net.connected', 'Aerium Home Network');
        blank();
        print('Aerium IP Configuration');
        blank();
        if (all) {
          print('   Host Name . . . . . . . . . . . . : ' + hostName());
          print('   Primary Dns Suffix  . . . . . . . : ');
          print('   Node Type . . . . . . . . . . . . : Hybrid');
          print('   IP Routing Enabled. . . . . . . . : No');
          blank();
        }
        if (opt === '/release' || opt === '/renew') { print('Asking the router nicely...'); await wait(900); }
        print('Wireless LAN adapter Wireless Network Connection:');
        blank();
        print('   Connection-specific DNS Suffix  . : home');
        if (all) {
          print('   Description . . . . . . . . . . . : Aerium Wireless 54G Adapter (' + net + ')');
          print('   Physical Address. . . . . . . . . : 00-1B-77-AE-20-07');
          print('   DHCP Enabled. . . . . . . . . . . : Yes');
        }
        print('   Link-local IPv6 Address . . . . . : fe80::a3e1:2007:fa1b:c0de%11');
        print('   IPv4 Address. . . . . . . . . . . : ' + (opt === '/release' ? '0.0.0.0' : '192.168.1.101'));
        print('   Subnet Mask . . . . . . . . . . . : 255.255.255.0');
        print('   Default Gateway . . . . . . . . . : 192.168.1.1');
        if (all) print('   DNS Servers . . . . . . . . . . . : 192.168.1.1');
        blank();
        print('Ethernet adapter Local Area Connection:');
        blank();
        print('   Media State . . . . . . . . . . . : Media disconnected');
        print('   Connection-specific DNS Suffix  . : ');
      });
      def('netstat', 'Displays network connections.', 'Displays protocol statistics and current TCP/IP network connections.\n\nNETSTAT [-a] [-n]', async (a) => {
        const numeric = a.some((x) => /^[-/][a-z]*n/i.test(x));
        const running = (id) => A.wm.windows.some((w) => w.app === id);
        const rows = [['TCP', '127.0.0.1:5357', hostName() + ':49157', 'ESTABLISHED']];
        if (running('messenger')) rows.push(['TCP', '192.168.1.101:49160', 'bubble-messenger:https', 'ESTABLISHED']);
        if (running('browser')) rows.push(['TCP', '192.168.1.101:49163', 'horizon-cdn:http', 'ESTABLISHED'], ['TCP', '192.168.1.101:49164', 'horizon-cdn:http', 'TIME_WAIT']);
        if (running('mediaplayer')) rows.push(['TCP', '192.168.1.101:49170', 'radio-lagoon:http', 'ESTABLISHED']);
        rows.push(['TCP', '192.168.1.101:49175', 'fish-food-updates:http', 'CLOSE_WAIT'], ['TCP', '192.168.1.101:49181', 'weather-gadget:http', 'TIME_WAIT']);
        blank();
        print('Active Connections');
        blank();
        print('  Proto  Local Address          Foreign Address        State');
        for (const [p, l, f, s] of rows) {
          await wait(numeric ? 30 : 160);
          const far = numeric ? (72 + (hash(f) % 150)) + '.' + (hash(f) % 250) + '.' + ((hash(f) >> 8) % 250) + '.' + ((hash(f) >> 16) % 250) + ':' + (f.endsWith('https') ? 443 : 80) : f;
          print('  ' + p.padEnd(6) + ' ' + l.padEnd(22) + ' ' + far.padEnd(22) + ' ' + s);
        }
      });
      def('systeminfo', "Displays this computer's configuration.", 'Displays operating system configuration information.\n\nSYSTEMINFO', async () => {
        const line = print('Loading Operating System Information ...');
        await wait(700);
        line.textContent = 'Loading Hotfix Information ...';
        await wait(600);
        line.remove();
        lineCount--;
        const mem = A.procmon ? A.procmon.memory() : { total: 2047, free: 912 };
        const boot = new Date(BOOTED);
        const rows = [
          ['Host Name', hostName()], ['OS Name', 'Aerium Home Premium'], ['OS Version', '7.0.2007 Service Pack 1 Build 2007'],
          ['OS Manufacturer', 'Aerium Playground'], ['OS Configuration', 'Standalone Workstation'], ['OS Build Type', 'Multiprocessor Free'],
          ['Registered Owner', USER], ['Registered Organization', ''], ['Product ID', '00427-AER-2007070-00742'],
          ['Original Install Date', '9/1/2007, 3:07:00 PM'], ['System Boot Time', A.util.fmtDate(boot) + ', ' + A.util.fmtTime(boot, true)],
          ['System Manufacturer', 'Aerium Playground'], ['System Model', 'Glass Tower 2007'], ['System Type', 'X86-based PC'],
          ['Processor(s)', '1 Processor(s) Installed.'], ['', '[01]: AeroCore Duo CPU @ 2.40GHz'], ['BIOS Version', 'AeriumBIOS v2.07, 9/1/2007'],
          ['Aerium Directory', 'C:\\Aerium'], ['System Directory', 'C:\\Aerium\\System32'], ['Boot Device', '\\Device\\HarddiskVolume1'],
          ['System Locale', 'en-us;English (United States)'], ['Input Locale', 'en-us;English (United States)'],
          ['Time Zone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'],
          ['Total Physical Memory', num(mem.total) + ' MB'], ['Available Physical Memory', num(mem.free) + ' MB'],
          ['Virtual Memory: Max Size', '4,094 MB'], ['Page File Location(s)', 'C:\\pagefile.sys'], ['Domain', 'WORKGROUP'], ['Logon Server', '\\\\' + hostName()],
          ['Hotfix(s)', '3 Hotfix(s) Installed.'], ['', '[01]: AE-000071 (Shinier glass)'], ['', '[02]: AE-000314 (Fish swim 3% faster)'], ['', '[03]: AE-007734 (Says hello)'],
          ['Network Card(s)', '1 NIC(s) Installed.'], ['', '[01]: Aerium Wireless 54G Adapter'], ['', '      Connection Name: Wireless Network Connection'], ['', '      IP address(es): 192.168.1.101'],
        ];
        blank();
        for (const [k, v] of rows) print((k ? k + ':' : '').padEnd(27) + v);
      });

      // ------------------------------------------------------------ shutdown
      def('shutdown', 'Shuts down, restarts or logs off the computer.', 'Usage: shutdown [-s | -r | -l | -h | -a] [-t xxx] [-c "comment"]\n\n    -s    Shut down the computer.\n    -r    Restart the computer.\n    -l    Log off.\n    -h    Hibernate the computer.\n    -a    Abort a system shutdown.\n    -t    Set the time-out before shutdown to xxx seconds (default 30).\n    -c    Show a comment in the shutdown window.', (a) => {
        const f = a.map((x) => x.toLowerCase().replace(/^\//, '-'));
        if (f.includes('-a')) { if (!abortShutdown()) print('Unable to abort the system shutdown because no shutdown was in progress.(1116)'); return; }
        if (f.includes('-i')) { print('The graphical shutdown tool is not installed. Try: shutdown -s -t 60'); return; }
        const action = f.includes('-r') ? 'restart' : f.includes('-l') ? 'logoff' : f.includes('-h') ? 'hibernate' : f.includes('-s') ? 'shutdown' : null;
        if (!action) { print(HELP.shutdown); return; }
        const ti = f.indexOf('-t');
        let secs = action === 'hibernate' ? 0 : action === 'logoff' ? 10 : 30;
        if (ti >= 0) {
          secs = parseInt(a[ti + 1], 10);
          if (!(secs >= 0) || secs > 315360000) { print('Invalid time-out. Use a number of seconds, for example: shutdown -s -t 60'); return; }
        }
        const ci = f.indexOf('-c');
        const comment = ci >= 0 && a[ci + 1] ? a[ci + 1].slice(0, 127) : '';
        if (pending) { print('A system shutdown has already been scheduled.(1190)'); return; }
        if (secs === 0) { runAction(action); return; }
        scheduleShutdown(action, secs, comment);
      });

      // ------------------------------------------------------------ fun
      def('about', 'Tells you about this Command Prompt.', 'Tells you about this Command Prompt.\n\nABOUT', () => {
        const aq = '#5fd7ff', gr = '#87ff5f';
        blank();
        [['        .-~~~~-.', aq], ['      .\'  o     \'.       Aerium Command Processor', aq], ['     /   o    O   \\      ' + VERSION, aq], ['    |  ~~~~~~~~~~  |', gr], ['     \\ ~~~~~~~~~~ /       A Frutiger Aero playground.', gr], ['      \'.  ~~~~  .\'        Made of glass, water and light.', gr], ['        \'-....-\'', aq]].forEach(([t, c]) => print(t, rainbow ? null : c));
        blank();
        print('Type HELP for the list of commands. Some commands are secret.');
        print('Hint: the fish know one. So does anyone who has seen a certain movie about green rain.');
      });
      def('sudo', null, null, (a, rest) => {
        if (/make me a sandwich/i.test(rest)) { print('Okay.'); print('   _______'); print('  (_______)   one sandwich, as requested'); print('  (~~~~~~~)'); print('  (_______)'); A.sound.play('coin'); return; }
        print(USER + ' is not in the sudoers file. This incident will be reported.');
        print('(Just kidding. This is not that kind of computer, but we admire the confidence.)');
      });
      def('cowsay', null, null, (a, rest) => {
        const msg = rest.trim() || 'Moo. Have you fed the fish today?';
        print(' ' + '_'.repeat(msg.length + 2));
        print('< ' + msg + ' >');
        print(' ' + '-'.repeat(msg.length + 2));
        ['        \\   ^__^', '         \\  (oo)\\_______', '            (__)\\       )\\/\\', '                ||----w |', '                ||     ||'].forEach((l) => print(l));
      });
      def('format', null, 'Formats a disk for use with Aerium.\n\nFORMAT volume\n\nTry: FORMAT C: (it is safe, promise)', async (a) => {
        const d = (a[0] || '').toLowerCase();
        if (!d) { print('Required parameter missing -'); return; }
        if (d === 'a:' || d === 'b:') {
          await readLine('Insert new disk for drive ' + d.toUpperCase() + '\nand press ENTER when ready...');
          print('The device is not ready.');
          return;
        }
        if (d !== 'c:') { print('The system cannot find the drive specified.'); return; }
        const red = '#ff5f5f';
        print('The type of the file system is AERFS.');
        blank();
        print('WARNING, ALL DATA ON NON-REMOVABLE DISK', red);
        print('DRIVE C: WILL BE LOST!', red);
        A.sound.play('exclamation');
        const ans = await readLine('Proceed with Format (Y/N)? ');
        if (!/^y/i.test(ans.trim())) return;
        print('Verifying 152625M');
        const bar = print('Formatting 0 percent completed.');
        await progress(3200, (pct) => { bar.textContent = 'Formatting ' + pct + ' percent completed.'; });
        bar.textContent = 'Format complete.';
        await wait(900);
        blank();
        print('Just kidding. Your fish are safe.', '#87ff5f');
        print('Nothing was erased. It never is, here.', '#87ff5f');
        A.sound.play('ding');
      });
      def('hack', null, null, async () => {
        const g = '#00ff5f', dim = '#008f3f';
        const hex = () => Array.from({ length: 8 }, () => Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0')).join(' ');
        print('ESTABLISHING TOTALLY SECURE CONNECTION TO GRANDMA-PC...', g);
        await wait(500);
        for (const st of ['Bypassing firewall', 'Decrypting mainframe', 'Downloading more RAM', 'Rerouting through the fish tank', 'Guessing the password']) {
          const bar = print(st.padEnd(32) + '[' + ' '.repeat(24) + ']   0%', g);
          await progress(900 + Math.random() * 700, (p) => {
            const fill = Math.round((p / 100) * 24);
            bar.textContent = st.padEnd(32) + '[' + '#'.repeat(fill) + ' '.repeat(24 - fill) + '] ' + String(p).padStart(3) + '%';
            if (p < 100 && Math.random() < 0.6) print('  0x' + Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, '0') + '  ' + hex(), dim);
          });
        }
        print('Password found: ********  (it was "password")', g);
        await wait(600);
        blank();
        print('   >>> ACCESS GRANTED <<<', g);
        await wait(700);
        print('Opening secret file: COOKIES.TXT', g);
        await wait(900);
        blank();
        print('  Grandma\'s secret cookie recipe:', '#ffd75f');
        print('    - extra chocolate chips', '#ffd75f');
        print('    - a pinch of cinnamon', '#ffd75f');
        print('    - bake with someone you love', '#ffd75f');
        blank();
        print('Hack complete. Real hackers use their powers to help people.', g);
        print('Now go call your grandma. She misses you.', g);
        A.sound.play('win');
      });
      def('matrix', null, null, () => matrix());
      def('fish', null, null, () => fishTank());

      // ------------------------------------------------------------ full-window animations
      function overlay(content, hint) {
        const wrap = h('div.cmd-overlay', null, content, h('div.cmd-overlay-hint', null, hint));
        win.body.appendChild(wrap);
        wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); if (overlayStop) overlayStop(); });
        return wrap;
      }
      function endOverlay(wrap, stopFn) {
        stopFn();
        wrap.remove();
        overlayStop = null;
        if (!closed) { blank(); showPrompt(); }
      }
      function matrix() {
        const canvas = h('canvas.cmd-canvas');
        const wrap = overlay(canvas, 'Wake up... press any key to leave the Matrix.');
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const CH = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFZ';
        let W = 0, H = 0, drops = [], raf = null, last = 0;
        const size = () => {
          W = canvas.clientWidth; H = canvas.clientHeight;
          canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
          drops = Array.from({ length: Math.ceil(W / 14) }, () => Math.floor(Math.random() * -H / 16));
        };
        size();
        const offResize = win.on('resize', size);
        const frame = (t) => {
          raf = requestAnimationFrame(frame);
          if (win.state === 'minimized' || t - last < 45) return;
          last = t;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
          ctx.fillRect(0, 0, W, H);
          ctx.font = '15px "MS Gothic", "Meiryo", monospace';
          drops.forEach((y, i) => {
            const ch = CH[Math.floor(Math.random() * CH.length)];
            ctx.fillStyle = '#d7ffd7';
            ctx.fillText(ch, i * 14, y * 16);
            ctx.fillStyle = '#00d948';
            ctx.fillText(CH[Math.floor(Math.random() * CH.length)], i * 14, (y - 1) * 16);
            drops[i] = y * 16 > H && Math.random() > 0.975 ? 0 : y + 1;
          });
        };
        raf = requestAnimationFrame(frame);
        A.sound.play('zap');
        overlayStop = () => endOverlay(wrap, () => { cancelAnimationFrame(raf); offResize(); });
      }
      function fishTank() {
        const pre = h('pre.cmd-tank');
        const wrap = overlay(pre, 'Your ASCII aquarium. Press any key to close.');
        const cols = () => Math.max(40, Math.floor(pre.clientWidth / 8.2));
        const rows = () => Math.max(12, Math.floor(pre.clientHeight / 16));
        const RIGHT = [['><>', '#ffd75f'], ['><(((\u00b0>', '#ff8f5f'], ['>=\u00b0>', '#5fd7ff'], ['><((\u00b0>', '#ff5fd7'], ['>))\u00b0>', '#87ff5f']];
        const flip = (s) => s.split('').reverse().map((c) => ({ '>': '<', '<': '>', '(': ')', ')': '(' }[c] || c)).join('');
        let W = cols(), H = rows();
        const fish = Array.from({ length: 7 }, (_, i) => {
          const [art, color] = RIGHT[i % RIGHT.length];
          return { art, color, x: Math.random() * W, y: 2 + Math.floor(Math.random() * (H - 5)), dir: Math.random() < 0.5 ? 1 : -1, sp: 0.18 + Math.random() * 0.5 };
        });
        const bubbles = [];
        let tick = 0, raf = null, last = 0;
        const frame = (t) => {
          raf = requestAnimationFrame(frame);
          if (win.state === 'minimized' || t - last < 90) return;
          last = t;
          tick++;
          W = cols(); H = rows();
          const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => [' ', null]));
          const put = (x, y, ch, c) => { if (y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = [ch, c]; };
          for (let x = 0; x < W; x++) { put(x, 0, '~', '#5fafff'); put(x, H - 1, (x * 7) % 5 ? '.' : ',', '#d7af5f'); }
          for (let s = 3; s < W - 2; s += 9) for (let k = 0; k < 3 + (s % 3); k++) put(s + ((tick + k + s) % 6 < 3 ? 0 : 1), H - 2 - k, k % 2 ? '(' : ')', '#5fd75f');
          const cx = Math.floor(W * 0.72);
          ['  __', ' |==|', ' |__|'].forEach((l, i) => l.split('').forEach((c, j) => put(cx + j, H - 4 + i, c, '#d7af5f')));
          if (tick % 3 === 0) bubbles.push({ x: cx + 2, y: H - 5 });
          fish.forEach((f) => {
            f.x += f.dir * f.sp;
            if (f.x < 0) { f.x = 0; f.dir = 1; }
            if (f.x > W - f.art.length) { f.x = W - f.art.length; f.dir = -1; }
            if (Math.random() < 0.01) f.dir = -f.dir;
            if (Math.random() < 0.02) bubbles.push({ x: Math.floor(f.x) + (f.dir > 0 ? f.art.length : 0), y: f.y - 1 });
            const art = f.dir > 0 ? f.art : flip(f.art);
            art.split('').forEach((c, j) => put(Math.floor(f.x) + j, f.y, c, f.color));
          });
          for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            b.y -= 0.5;
            if (Math.random() < 0.3) b.x += Math.random() < 0.5 ? -1 : 1;
            if (b.y < 1) { bubbles.splice(i, 1); continue; }
            put(b.x, Math.floor(b.y), b.y < H / 3 ? 'O' : b.y < H / 1.6 ? 'o' : '.', '#bfefff');
          }
          pre.textContent = '';
          grid.forEach((row, y) => {
            let run = '', color = undefined;
            const flush = () => { if (run) pre.appendChild(color ? h('span', { style: { color } }, run) : document.createTextNode(run)); run = ''; };
            row.forEach(([ch, c]) => { if (c !== color) { flush(); color = c; } run += ch; });
            flush();
            if (y < H - 1) pre.appendChild(document.createTextNode('\n'));
          });
        };
        raf = requestAnimationFrame(frame);
        A.sound.play('bubble');
        overlayStop = () => endOverlay(wrap, () => cancelAnimationFrame(raf));
      }

      // ------------------------------------------------------------ start
      print(VERSION);
      print('Copyright (c) 2007 Aerium Playground.  All rights reserved.');
      blank();
      if (args && args.title) win.setTitle(String(args.title));
      showPrompt();

      return {
        onClose() {
          closed = true;
          queue.length = 0;
          if (job) { job.aborted = true; job.stops.forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); job.stops.clear(); }
          if (overlayStop) overlayStop();
        },
        keepAwake: () => !!overlayStop,
      };
    },
  });
})();
