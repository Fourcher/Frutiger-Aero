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
        screen.style.setProperty('--cmd-fg', fg);
        screen.style.setProperty('--cmd-bg', bg);
        win.body.style.background = bg;
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
        if (inputLine) commitInput('^C'); else print('^C');
        job.aborted = true;
        job.stops.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
        job.stops.clear();
      }
      const aborted = () => !job || job.aborted;

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
            if (++count % 3 === 0) await wait(12); // the famous fast scroll
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

      // @@CONTINUE@@
    },
  });
})();
