/* Command Prompt: a black console with a blinking block cursor, command
   history, Tab completion, the legacy color palette, the real virtual file
   system and a pile of era-accurate commands (and a few secret ones). */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, sleep } = A.util;
  const fs = A.fs;

  // Legacy 16-color console palette (see docs/FEEL.md).
  const PALETTE = {
    0: '#000000', 1: '#000080', 2: '#008000', 3: '#008080', 4: '#800000', 5: '#800080', 6: '#808000', 7: '#c0c0c0',
    8: '#808080', 9: '#0000ff', a: '#00ff00', b: '#00ffff', c: '#ff0000', d: '#ff00ff', e: '#ffff00', f: '#ffffff',
  };
  const VERSION = 'Aerium [Version 7.0.2007]';

  A.apps.register({
    id: 'cmd',
    name: 'Command Prompt',
    icon: 'icons/cmd',
    color: '#2b2b2b',
    category: 'system',
    description: 'Runs commands the way the family computer did.',
    keywords: ['cmd', 'command', 'console', 'terminal', 'dos', 'prompt'],
    window: { width: 660, height: 420, minWidth: 380, minHeight: 240 },
    launch(win, args) {
      const name = A.store.get('user.name') || 'User';
      let cwd = '/';                 // virtual path; '/' shows as C:\Users\<name>
      let running = false;           // a command is animating
      let abort = false;             // Ctrl+C requested
      let overlay = null;            // active full-screen animation cleanup
      let closed = false;
      const hist = [];
      let histIdx = -1;
      let stash = '';

      const screen = h('div.cmd-screen', { tabIndex: 0 });
      win.body.classList.add('cmd');
      win.body.appendChild(screen);
      screen.style.setProperty('--cmd-fg', PALETTE[7]);
      screen.style.setProperty('--cmd-bg', PALETTE[0]);

      // ------------------------------------------------------------ output
      function esc(s) { return A.util.escapeHTML(s); }
      function write(text, cls) {
        const line = h('div.cmd-line', { class: cls });
        line.textContent = text;
        insertBeforeInput(line);
        scroll();
        return line;
      }
      function writeHTML(html, cls) {
        const line = h('div.cmd-line', { class: cls });
        line.innerHTML = html;
        insertBeforeInput(line);
        scroll();
        return line;
      }
      function blank() { write(''); }
      function scroll() { screen.scrollTop = screen.scrollHeight; }

      // The active input line lives at the bottom; output inserts above it.
      let inputLine = null, promptEl = null, typedEl = null, input = null;
      function insertBeforeInput(node) { if (inputLine && inputLine.parentNode === screen) screen.insertBefore(node, inputLine); else screen.appendChild(node); }

      function winPath(p) {
        p = fs.normalize(p);
        const rel = p === '/' ? '' : p.replace(/\//g, '\\');
        return 'C:\\Users\\' + name + rel;
      }
      function promptText() { return winPath(cwd) + '>'; }

      function showPrompt() {
        if (inputLine) inputLine.remove();
        promptEl = h('span.cmd-prompt', null, promptText());
        typedEl = h('span.cmd-typed');
        input = h('input.cmd-input', { type: 'text', spellcheck: false, autocomplete: 'off', autocapitalize: 'off', 'aria-label': 'Command input' });
        inputLine = h('div.cmd-line.cmd-inputline', null, promptEl, h('span.cmd-typed-wrap', null, typedEl, input));
        screen.appendChild(inputLine);
        input.addEventListener('input', renderInput);
        input.addEventListener('keyup', renderInput);
        input.addEventListener('click', renderInput);
        input.addEventListener('keydown', onInputKey);
        renderInput();
        focusInput();
        scroll();
      }
      function renderInput() {
        if (!input) return;
        const v = input.value;
        const c = input.selectionStart == null ? v.length : input.selectionStart;
        typedEl.innerHTML = esc(v.slice(0, c)) + '<span class="cmd-cursor">' + esc(v[c] || '\u00a0') + '</span>' + esc(v.slice(c + 1));
      }
      function focusInput() { if (input) setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 0); }

      // ------------------------------------------------------------ key handling
      function onInputKey(e) {
        if (running) { e.preventDefault(); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') requestAbort(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
          if (input.selectionStart !== input.selectionEnd) return; // allow copy of selection
          e.preventDefault();
          finalizeInput(input.value);
          write('^C');
          showPrompt();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const cmd = input.value;
          finalizeInput(cmd);
          submit(cmd);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault(); historyNav(-1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault(); historyNav(1);
        } else if (e.key === 'Tab') {
          e.preventDefault(); complete(e.shiftKey ? -1 : 1);
        } else if (e.key === 'Escape') {
          e.preventDefault(); input.value = ''; renderInput();
        } else if (e.key === 'PageUp') { e.preventDefault(); screen.scrollTop -= screen.clientHeight * 0.8; }
        else if (e.key === 'PageDown') { e.preventDefault(); screen.scrollTop += screen.clientHeight * 0.8; }
      }
      function finalizeInput(text) {
        if (!inputLine) return;
        input.remove();
        typedEl.textContent = text;
        typedEl.classList.add('cmd-done');
        inputLine.classList.remove('cmd-inputline');
        inputLine = null; input = null;
      }
      function historyNav(dir) {
        if (!hist.length) return;
        if (histIdx === -1) { stash = input.value; histIdx = hist.length; }
        histIdx += dir;
        if (histIdx >= hist.length) { histIdx = -1; input.value = stash; }
        else { histIdx = Math.max(0, histIdx); input.value = hist[histIdx]; }
        renderInput();
        setTimeout(() => { input.selectionStart = input.selectionEnd = input.value.length; renderInput(); }, 0);
      }
      let tabState = null;
      function complete(dir) {
        const v = input.value;
        const m = /(\S*)$/.exec(v);
        const frag = m[1];
        // Complete against files in cwd, plus commands when it's the first word.
        let base = frag, dir2 = cwd;
        const slash = frag.lastIndexOf('\\');
        if (slash >= 0) { dir2 = resolvePath(frag.slice(0, slash + 1)); base = frag.slice(slash + 1); }
        let names = [];
        try { names = fs.list(dir2).map((it) => it.name + (it.type === 'folder' ? '\\' : '')); } catch (e) { names = []; }
        const firstWord = v.trimStart().indexOf(' ') === -1;
        if (firstWord) names = names.concat(Object.keys(COMMANDS), Object.keys(A.apps.aliases));
        const low = base.toLowerCase();
        let matches = names.filter((n) => n.toLowerCase().startsWith(low));
        matches = Array.from(new Set(matches)).sort();
        if (!matches.length) { A.sound.play('error', { minGap: 200 }); return; }
        if (!tabState || tabState.frag !== v) tabState = { frag: v, base: frag, matches, i: -1, prefix: v.slice(0, v.length - frag.length) };
        tabState.i = (tabState.i + dir + tabState.matches.length) % tabState.matches.length;
        let pick = tabState.matches[tabState.i];
        if (slash >= 0) pick = frag.slice(0, slash + 1) + pick.slice(base.length + (frag.slice(slash + 1).length - base.length));
        const full = tabState.prefix + (slash >= 0 ? frag.slice(0, slash + 1) + tabState.matches[tabState.i] : tabState.matches[tabState.i]);
        input.value = /\s/.test(pick) && !pick.endsWith('\\') ? '"' + full + '"' : full;
        renderInput();
        setTimeout(() => { input.selectionStart = input.selectionEnd = input.value.length; renderInput(); }, 0);
      }

      function requestAbort() { abort = true; }

      async function submit(raw) {
        const cmd = raw.trim();
        if (cmd) { hist.push(cmd); if (hist.length > 200) hist.shift(); }
        histIdx = -1; stash = ''; tabState = null;
        if (!cmd) { showPrompt(); return; }
        running = true; abort = false;
        try { await run(cmd); }
        catch (err) { write(String(err && err.message || err)); }
        running = false;
        if (!closed && !overlay) showPrompt();
      }

      // ------------------------------------------------------------ parsing
      function tokenize(s) {
        const out = [];
        const re = /"([^"]*)"|(\S+)/g; let m;
        while ((m = re.exec(s))) out.push(m[1] != null ? m[1] : m[2]);
        return out;
      }
      function resolvePath(arg) {
        if (!arg) return cwd;
        arg = arg.replace(/"/g, '');
        // Windows-style: leading backslash = root, else relative.
        if (/^[a-z]:\\?/i.test(arg)) arg = arg.replace(/^[a-z]:/i, '');
        arg = arg.replace(/\\/g, '/');
        if (arg.startsWith('/')) return fs.normalize(arg);
        return fs.normalize(fs.join(cwd, arg));
      }

      // ------------------------------------------------------------ commands
      const COMMANDS = {};
      const HELP = [];
      function cmd(name, help, fn) { COMMANDS[name] = fn; if (help) HELP.push([name, help]); }

      cmd('help', 'Lists the commands you can use.', () => {
        writeHTML('For more information on a specific command, just try it out.', '');
        blank();
        HELP.forEach(([n, d]) => writeHTML('<span class="cmd-cmdname">' + esc((n.toUpperCase() + '        ').slice(0, 10)) + '</span>' + esc(d)));
        blank();
        write('Secret commands are not listed. The fish know a few.');
      });
      cmd('cls', 'Clears the screen.', () => { screen.querySelectorAll('.cmd-line').forEach((n) => n.remove()); });
      cmd('ver', 'Displays the version.', () => { blank(); write(VERSION); blank(); });
      cmd('echo', 'Displays messages.', (a, raw) => {
        const rest = raw.slice(raw.toLowerCase().indexOf('echo') + 4).replace(/^\s/, '');
        if (!rest) write('ECHO is on.');
        else if (rest === '.') blank();
        else write(rest.replace(/^\./, ''));
      });
      cmd('date', 'Displays the date.', () => { write('The current date is: ' + A.util.DAYS[new Date().getDay()].slice(0, 3) + ' ' + A.util.fmtDate()); });
      cmd('time', 'Displays the time.', () => { write('The current time is: ' + A.util.fmtTime(new Date(), true)); });
      cmd('whoami', 'Shows the current user.', () => write(('aerium-pc\\' + name).toLowerCase()));
      cmd('hostname', 'Shows the computer name.', () => write('Aerium-PC'));
      cmd('title', 'Sets the window title.', (a, raw) => { const t = raw.replace(/^\s*title\s?/i, ''); win.setTitle(t || 'Command Prompt'); });
      cmd('exit', 'Closes the Command Prompt.', () => { win.close(); });
      cmd('pause', null, async () => { write('Press any key to continue . . .'); await waitKey(); });

      cmd('dir', 'Lists files in a folder.', (a) => dirCmd(a));
      cmd('cd', 'Changes the current folder.', (a) => cdCmd(a));
      cmd('chdir', null, (a) => cdCmd(a));
      cmd('tree', 'Shows folders as a tree.', () => treeCmd());
      cmd('type', 'Prints a text file.', (a) => typeCmd(a));
      cmd('mkdir', 'Creates a folder.', (a) => mkdirCmd(a));
      cmd('md', null, (a) => mkdirCmd(a));
      cmd('del', 'Deletes a file (to Recycle Bin).', (a) => delCmd(a));
      cmd('erase', null, (a) => delCmd(a));
      cmd('ren', 'Renames a file.', (a) => renCmd(a));
      cmd('rename', null, (a) => renCmd(a));
      cmd('copy', 'Copies a file.', (a) => copyCmd(a));
      cmd('start', 'Opens an app.', (a) => startCmd(a));
      cmd('color', 'Sets the console colors.', (a, raw) => colorCmd(a, raw));

      cmd('tasklist', 'Lists running processes.', () => tasklist());
      cmd('taskkill', 'Ends a process (taskkill /im app).', (a) => taskkill(a));
      cmd('ping', 'Pings a host.', (a) => ping(a));
      cmd('ipconfig', 'Shows network settings.', () => ipconfig());
      cmd('tracert', 'Traces a route to a host.', (a) => tracert(a));
      cmd('netstat', 'Shows network connections.', () => netstat());
      cmd('systeminfo', 'Shows system information.', () => systeminfo());
      cmd('shutdown', 'Shuts down (shutdown -s -t 30).', (a) => shutdownCmd(a));
      cmd('about', 'About the Command Prompt.', () => about());

      // Secret commands (not in HELP)
      COMMANDS.hack = () => hack();
      COMMANDS.matrix = () => matrix();
      COMMANDS.fish = () => fishTank();
      COMMANDS.format = (a) => formatCmd(a);
      COMMANDS.sudo = (a, raw) => sudo(raw);
      COMMANDS.cowsay = (a, raw) => cowsay(raw);

      // ------------------------------------------------------------ run dispatch
      async function run(line) {
        const toks = tokenize(line);
        const c = toks[0].toLowerCase();
        const args = toks.slice(1);
        if (c === 'color' && args[0] && args[0].toLowerCase() === 'rainbow') return colorRainbow();
        if (COMMANDS[c]) return COMMANDS[c](args, line);
        // bare app names / aliases
        const appId = c.replace(/\.exe$/, '');
        if (A.apps.get(appId)) { A.apps.launch(appId); return; }
        blank();
        write("'" + toks[0] + "' is not recognized as an internal or external command,");
        write('operable program or batch file.');
        A.sound.play('error');
      }

      // ------------------------------------------------------------ file commands
      function dirCmd(a) {
        const target = a[0] ? resolvePath(a[0]) : cwd;
        if (!fs.exists(target) || !fs.isDir(target)) { write('File Not Found'); return; }
        const items = fs.list(target).filter((it) => it.path !== fs.RECYCLE);
        write(' Volume in drive C is Aerium Glass');
        write(' Volume Serial Number is 2007-AE71');
        blank();
        write(' Directory of ' + winPath(target));
        blank();
        let files = 0, dirs = 0, bytes = 0;
        const fmtRow = (d, sizeOrDir, nm) => {
          const dt = new Date(d);
          const date = A.util.fmtDate(dt).padStart(10, ' ');
          const time = A.util.fmtTime(dt).padStart(8, ' ');
          return date + '  ' + time + '  ' + sizeOrDir.padStart(14, ' ') + ' ' + nm;
        };
        if (target !== '/') { write(fmtRow(Date.now(), '<DIR>', '.')); write(fmtRow(Date.now(), '<DIR>', '..')); dirs += 2; }
        items.forEach((it) => {
          if (it.type === 'folder') { dirs++; write(fmtRow(it.modified, '<DIR>', it.name)); }
          else { files++; bytes += it.size; write(fmtRow(it.modified, it.size.toLocaleString('en-US'), it.name)); }
        });
        write('              ' + String(files) + ' File(s)  ' + bytes.toLocaleString('en-US').padStart(14) + ' bytes');
        const free = 108_916_781_056;
        write('              ' + String(dirs) + ' Dir(s)   ' + free.toLocaleString('en-US').padStart(14) + ' bytes free');
      }
      function cdCmd(a) {
        if (!a.length) { write(winPath(cwd)); return; }
        const arg = a[0];
        if (arg === '\\' || arg === '/') { cwd = '/'; return; }
        const target = resolvePath(arg);
        if (!fs.exists(target)) { write('The system cannot find the path specified.'); A.sound.play('error'); return; }
        if (!fs.isDir(target)) { write('The directory name is invalid.'); return; }
        cwd = target;
      }
      function typeCmd(a) {
        if (!a.length) { write('The syntax of the command is incorrect.'); return; }
        const target = resolvePath(a[0]);
        if (!fs.exists(target)) { write('The system cannot find the file specified.'); A.sound.play('error'); return; }
        if (fs.isDir(target)) { write('Access is denied.'); return; }
        const data = String(fs.read(target) || '');
        if (data.startsWith('asset:') || data.startsWith('data:') || data.startsWith('track:') || data.startsWith('video:') || data.startsWith('app:')) { write('(This file is not a text file.)'); return; }
        data.split(/\r?\n/).forEach((l) => write(l));
      }
      function mkdirCmd(a) {
        if (!a.length) { write('The syntax of the command is incorrect.'); return; }
        const target = resolvePath(a[0]);
        if (fs.exists(target)) { write('A subdirectory or file ' + a[0] + ' already exists.'); return; }
        try { fs.mkdir(target); A.sound.play('click'); } catch (e) { write(e.message); }
      }
      function delCmd(a) {
        if (!a.length) { write('The syntax of the command is incorrect.'); return; }
        const target = resolvePath(a[0]);
        if (!fs.exists(target)) { write('Could Not Find ' + winPath(target)); A.sound.play('error'); return; }
        if (fs.isDir(target)) { write('Access is denied. (Use rmdir for folders.)'); return; }
        try { fs.remove(target); A.sound.play('recycle'); } catch (e) { write(e.message); }
      }
      function renCmd(a) {
        if (a.length < 2) { write('The syntax of the command is incorrect.'); return; }
        const target = resolvePath(a[0]);
        if (!fs.exists(target)) { write('The system cannot find the file specified.'); return; }
        try { fs.rename(target, a[1]); A.sound.play('click'); } catch (e) { write(e.message); }
      }
      function copyCmd(a) {
        if (a.length < 2) { write('The syntax of the command is incorrect.'); return; }
        const src = resolvePath(a[0]);
        if (!fs.exists(src)) { write('The system cannot find the file specified.'); return; }
        let destDir = resolvePath(a[1]);
        if (!fs.isDir(destDir)) destDir = fs.dirname(destDir);
        try { fs.copy(src, destDir); write('        1 file(s) copied.'); A.sound.play('click'); } catch (e) { write(e.message); }
      }
      function startCmd(a) {
        if (!a.length) { A.apps.launch('cmd'); return; }
        const id = a[0].replace(/\.exe$/i, '').toLowerCase();
        if (A.apps.get(id)) { A.apps.launch(id, a[1] ? { path: resolvePath(a[1]) } : {}); return; }
        if (fs.exists(resolvePath(a[0]))) { A.apps.openFile(resolvePath(a[0])); return; }
        write('The system cannot find the file ' + a[0] + '.');
      }

      // ------------------------------------------------------------ color / title
      function colorCmd(a) {
        if (!a.length) { screen.style.setProperty('--cmd-fg', PALETTE[7]); screen.style.setProperty('--cmd-bg', PALETTE[0]); screen.classList.remove('cmd-rainbow'); return; }
        let code = a[0].toLowerCase();
        if (!/^[0-9a-f]{1,2}$/.test(code)) { write('The color attribute is a two-digit hexadecimal number.'); write('The first digit is the background, the second the text.'); write('Try: color 0a'); return; }
        screen.classList.remove('cmd-rainbow');
        const bg = code.length === 2 ? code[0] : '0';
        const fg = code.length === 2 ? code[1] : code[0];
        if (bg === fg) { write('The background and text colors cannot be the same.'); return; }
        screen.style.setProperty('--cmd-bg', PALETTE[bg]);
        screen.style.setProperty('--cmd-fg', PALETTE[fg]);
        A.sound.play('click');
      }
      function colorRainbow() {
        screen.classList.add('cmd-rainbow');
        screen.style.setProperty('--cmd-bg', PALETTE[0]);
        write('Taste the rainbow. (color to reset.)');
        A.sound.play('coin');
      }

      // ------------------------------------------------------------ process commands
      const FAKE_PROCS = [
        ['System Idle Process', 0, 24], ['System', 4, 148], ['aerium.exe', 620, 3820], ['glass.exe', 704, 24960],
        ['dwm.exe', 812, 41200], ['bubbles.exe', 980, 8640], ['aquarium.exe', 1024, 15380], ['defender.exe', 1180, 6420],
        ['audiodg.exe', 1256, 12040], ['sidebar.exe', 1408, 22160], ['spoolsv.exe', 1520, 4980],
      ];
      function procList() {
        const rows = FAKE_PROCS.map(([img, pid, mem]) => ({ img, pid, mem }));
        A.wm.windows.filter((w) => w.app && w.taskbar).forEach((w, i) => {
          const app = A.apps.get(w.app);
          rows.push({ img: (app ? app.id : w.app) + '.exe', pid: 2000 + i * 4, mem: 18000 + Math.floor(Math.random() * 60000), win: w });
        });
        return rows;
      }
      function tasklist() {
        write('Image Name'.padEnd(26) + 'PID'.padStart(8) + ' Session Name'.padEnd(16) + '   Mem Usage');
        write('='.repeat(26) + ' ' + '='.repeat(7) + ' ' + '='.repeat(15) + ' ' + '='.repeat(12));
        procList().forEach((p) => {
          write(p.img.padEnd(26) + String(p.pid).padStart(7) + ' Console'.padEnd(16) + '  ' + (p.mem.toLocaleString('en-US') + ' K').padStart(11));
        });
      }
      function taskkill(a) {
        const imIdx = a.findIndex((x) => x.toLowerCase() === '/im');
        if (imIdx < 0 || !a[imIdx + 1]) { write('ERROR: Invalid syntax. Try: taskkill /im notepad.exe'); return; }
        const target = a[imIdx + 1].replace(/\.exe$/i, '').toLowerCase();
        const wins = A.wm.byApp(target) .concat(A.apps.get(target) ? A.wm.byApp(A.apps.get(target).id) : []);
        const uniq = Array.from(new Set(wins));
        if (uniq.length) {
          uniq.forEach((w) => { const app = A.apps.get(w.app); write('SUCCESS: Sent termination signal to the process "' + (app ? app.id : w.app) + '.exe" with PID ' + (2000 + Math.floor(Math.random() * 900)) + '.'); w.close(true); });
          A.sound.play('close');
        } else if (['system', 'aerium', 'glass', 'dwm'].includes(target)) {
          write('ERROR: The process "' + target + '.exe" is a critical system process and cannot be terminated.');
          write('Nice try. The fish would miss you.');
          A.sound.play('error');
        } else {
          write('ERROR: The process "' + target + '.exe" not found.');
        }
      }

      // ------------------------------------------------------------ network commands
      async function ping(a) {
        const host = a.find((x) => !x.startsWith('-')) || 'aerium.playground';
        const ip = fakeIp(host);
        const count = a.includes('-t') ? Infinity : 4;
        blank();
        write('Pinging ' + host + ' [' + ip + '] with 32 bytes of data:');
        let sent = 0, recv = 0, times = [];
        for (let i = 0; i < count; i++) {
          if (abort) break;
          await sleep(360 + Math.random() * 500);
          if (abort) break;
          sent++;
          if (Math.random() < 0.04) { write('Request timed out.'); }
          else { const t = Math.floor(6 + Math.random() * 40); times.push(t); recv++; write('Reply from ' + ip + ': bytes=32 time=' + (t < 1 ? '<1' : t) + 'ms TTL=' + (52 + Math.floor(Math.random() * 8))); }
        }
        blank();
        write('Ping statistics for ' + ip + ':');
        const lost = sent - recv;
        write('    Packets: Sent = ' + sent + ', Received = ' + recv + ', Lost = ' + lost + ' (' + (sent ? Math.round((lost / sent) * 100) : 0) + '% loss),');
        if (times.length) {
          write('Approximate round trip times in milli-seconds:');
          write('    Minimum = ' + Math.min(...times) + 'ms, Maximum = ' + Math.max(...times) + 'ms, Average = ' + Math.round(times.reduce((x, y) => x + y, 0) / times.length) + 'ms');
        }
      }
      function ipconfig() {
        blank();
        write('Aerium IP Configuration');
        blank();
        write('Wireless LAN adapter Wireless Network Connection:');
        blank();
        write('   Connection-specific DNS Suffix  . : aerium.home');
        write('   IPv4 Address. . . . . . . . . . . : 192.168.1.107');
        write('   Subnet Mask . . . . . . . . . . . : 255.255.255.0');
        write('   Default Gateway . . . . . . . . . : 192.168.1.1');
        blank();
        write('Ethernet adapter Local Area Connection:');
        blank();
        write('   Media State . . . . . . . . . . . : Media disconnected');
        blank();
      }
      async function tracert(a) {
        const host = a.find((x) => !x.startsWith('-')) || 'aerium.playground';
        const ip = fakeIp(host);
        blank();
        write('Tracing route to ' + host + ' [' + ip + ']');
        write('over a maximum of 30 hops:');
        blank();
        const hops = ['aerium-router.home [192.168.1.1]', 'the-tubes.isp.net [10.4.0.1]', 'big-pipe.backbone.net [72.14.8.9]', 'bubbles.exchange.net [193.2.6.44]', 'undersea-cable.aq [201.55.9.1]', host + ' [' + ip + ']'];
        for (let i = 0; i < hops.length; i++) {
          if (abort) break;
          await sleep(280 + Math.random() * 420);
          const t = () => (Math.random() < 0.05 ? '   *' : (1 + Math.floor(Math.random() * 60)) + ' ms');
          write(String(i + 1).padStart(3) + '    ' + t().padStart(5) + '    ' + t().padStart(5) + '    ' + t().padStart(5) + '  ' + hops[i]);
        }
        blank();
        write('Trace complete.');
      }
      function netstat() {
        write('Active Connections');
        blank();
        write('  Proto  Local Address          Foreign Address        State');
        const conns = [
          ['TCP', '192.168.1.107:49712', 'bubble-msgr.aerium:443', 'ESTABLISHED'],
          ['TCP', '192.168.1.107:49718', 'channels.aerium:80', 'ESTABLISHED'],
          ['TCP', '192.168.1.107:49720', 'aquarium-cdn.aq:443', 'TIME_WAIT'],
          ['TCP', '192.168.1.107:139', 'AERIUM-PC:0', 'LISTENING'],
          ['TCP', '192.168.1.107:49001', 'update.aerium:443', 'CLOSE_WAIT'],
        ];
        conns.forEach(([p, l, f, s]) => write('  ' + p.padEnd(6) + ' ' + l.padEnd(22) + ' ' + f.padEnd(22) + ' ' + s));
      }
      function systeminfo() {
        const up = Math.floor((Date.now() - (window.performance.timing ? window.performance.timing.navigationStart : Date.now() - 3600000)) / 1000);
        const rows = [
          ['Host Name', 'AERIUM-PC'],
          ['OS Name', 'Aerium Home Premium'],
          ['OS Version', '7.0.2007 Build 2007'],
          ['Registered Owner', name],
          ['System Manufacturer', 'Aerium Playground'],
          ['System Model', 'Glass Tower 2007'],
          ['Processor', 'AeroCore Duo CPU 2.40GHz'],
          ['BIOS Version', 'AeriumBIOS v2.07'],
          ['Total Physical Memory', '2,048 MB'],
          ['Available Physical Memory', (900 + Math.floor(Math.random() * 400)) + ' MB'],
          ['System Uptime', Math.floor(up / 3600) + ' hours, ' + Math.floor((up % 3600) / 60) + ' minutes'],
          ['System Locale', 'en-us;English (United States)'],
          ['Time Zone', '(UTC) Coordinated Universal Time'],
        ];
        blank();
        rows.forEach(([k, v]) => write((k + ':').padEnd(30) + ' ' + v));
        blank();
      }
      function fakeIp(host) {
        let n = 0; for (let i = 0; i < host.length; i++) n = (n * 31 + host.charCodeAt(i)) >>> 0;
        return (23 + (n & 63)) + '.' + ((n >> 6) & 255) + '.' + ((n >> 14) & 255) + '.' + (1 + ((n >> 22) & 253));
      }

      // ------------------------------------------------------------ shutdown
      async function shutdownCmd(a) {
        const flags = a.map((x) => x.toLowerCase());
        const tIdx = flags.findIndex((x) => x === '-t' || x === '/t');
        const secs = tIdx >= 0 ? parseInt(a[tIdx + 1], 10) || 0 : (flags.some((f) => /^[-/]s|^[-/]r/.test(f)) ? 30 : 0);
        if (flags.includes('-a') || flags.includes('/a')) {
          if (shutdownTimer) { clearInterval(shutdownTimer); shutdownTimer = null; write('Shutdown has been aborted.'); A.notify({ title: 'Logoff/shutdown canceled', text: 'The scheduled shutdown was aborted.', icon: 'icons/info' }); }
          else write('No shutdown was in progress.');
          return;
        }
        const restart = flags.includes('-r') || flags.includes('/r');
        const logoff = flags.includes('-l') || flags.includes('/l');
        const shut = flags.includes('-s') || flags.includes('/s');
        if (!restart && !logoff && !shut) {
          write('Usage: shutdown [-s | -r | -l | -a] [-t seconds]');
          write('    -s   Shut down       -r   Restart');
          write('    -l   Log off         -a   Abort a scheduled shutdown');
          write('    -t   Set a timeout in seconds (default 30)');
          return;
        }
        const action = logoff ? 'logoff' : restart ? 'restart' : 'shutdown';
        if (logoff && secs === 0) { A.boot.logoff(); return; }
        A.notify({ title: 'Aerium will ' + (action === 'logoff' ? 'log off' : action) + ' soon', text: 'You are about to be signed out in ' + secs + ' seconds. Run shutdown -a to cancel.', icon: 'icons/warning' });
        write('Aerium will ' + (action === 'logoff' ? 'log off' : action) + ' in ' + secs + ' seconds. Run "shutdown -a" to cancel.');
        let left = secs;
        return new Promise((resolve) => {
          const tick = () => {
            if (closed) { clearInterval(shutdownTimer); shutdownTimer = null; resolve(); return; }
            if (!shutdownTimer) { resolve(); return; } // aborted
            if (left <= 0) {
              clearInterval(shutdownTimer); shutdownTimer = null;
              if (action === 'logoff') A.boot.logoff();
              else A.boot.shutdown(action === 'restart');
              resolve(); return;
            }
            if (left <= 10 || left % 10 === 0) write('  ' + left + '...');
            left--;
          };
          // Let submit() finish so Ctrl+C isn't blocked by running-lock: run the countdown in the background.
          running = false;
          shutdownTimer = setInterval(tick, 1000);
          tick();
          resolve();
        });
      }
      let shutdownTimer = null;

      // ------------------------------------------------------------ easter eggs
      async function hack() {
        running = true;
        const stages = ['Bypassing firewall', 'Cracking passwords', 'Accessing mainframe', 'Downloading the internet', 'Rerouting encryption', 'Locating the fish'];
        write('INITIATING TOTALLY REAL HACK SEQUENCE...', 'cmd-green');
        blank();
        for (const st of stages) {
          if (abort) { write('^C'); return; }
          const bar = write(st + ' [                    ] 0%', 'cmd-green');
          for (let p = 0; p <= 100; p += 4 + Math.floor(Math.random() * 8)) {
            if (abort) { write('^C'); return; }
            p = Math.min(100, p);
            const filled = Math.round(p / 5);
            bar.textContent = st + ' [' + '\u2588'.repeat(filled) + ' '.repeat(20 - filled) + '] ' + p + '%';
            // spray some scrolling hex
            if (Math.random() < 0.5) write(hexLine(), 'cmd-green cmd-dim');
            await sleep(30 + Math.random() * 40);
          }
          bar.textContent = st + ' [' + '\u2588'.repeat(20) + '] 100%';
        }
        blank();
        write('ACCESS GRANTED.', 'cmd-green');
        await sleep(500);
        blank();
        write('...just kidding.', 'cmd-green');
        write("You didn't hack anything. This is a pretend computer.", 'cmd-green');
        write('Go outside, or at least feed the fish. They like you.', 'cmd-green');
        A.sound.play('win');
      }
      function hexLine() { let s = ''; for (let i = 0; i < 8; i++) s += Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0') + ' '; return '  ' + s; }

      function matrix() {
        overlay = startCanvasOverlay((ctx, W, H, dpr, state) => {
          const cols = Math.floor(W / 12);
          if (!state.drops) { state.drops = Array.from({ length: cols }, () => Math.random() * -H); }
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(0, 0, W, H);
          ctx.font = '13px monospace';
          for (let i = 0; i < cols; i++) {
            const chr = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
            const x = i * 12, y = state.drops[i];
            ctx.fillStyle = Math.random() < 0.03 ? '#c8ffd0' : '#00ff5a';
            ctx.fillText(chr, x, y);
            state.drops[i] = y > H && Math.random() > 0.975 ? 0 : y + 13;
          }
        }, 'The Matrix has you... press any key to leave.');
      }

      function fishTank() {
        // ASCII aquarium rendered into a <pre>, animated until a key is pressed.
        const W = Math.max(48, Math.min(120, Math.floor(screen.clientWidth / 8.2)));
        const H = Math.max(16, Math.min(30, Math.floor(screen.clientHeight / 17)));
        const pre = h('pre.cmd-fishtank');
        const wrap = h('div.cmd-overlay', null, pre, h('div.cmd-overlay-hint', null, 'Your aquarium. Press any key to close.'));
        screen.appendChild(wrap);
        const fishR = ['><((\u00b0>', '><>', '>\u00b0))><'];
        const fishL = ['<\u00b0((><', '<><', '<)(\u00b0<'];
        const fishes = Array.from({ length: 6 }, () => ({ x: Math.random() * W, y: 2 + Math.floor(Math.random() * (H - 4)), dir: Math.random() < 0.5 ? 1 : -1, sp: 0.3 + Math.random() * 0.7, sh: Math.floor(Math.random() * 3) }));
        const bubbles = Array.from({ length: 10 }, () => ({ x: Math.floor(Math.random() * W), y: Math.random() * H }));
        let raf = null;
        function frame() {
          const grid = Array.from({ length: H }, () => new Array(W).fill(' '));
          // weeds and floor
          for (let x = 0; x < W; x++) grid[H - 1][x] = '~';
          for (let i = 0; i < W; i += 7) { const hh = 1 + Math.floor(Math.random() * 2); for (let k = 0; k < hh + 2; k++) if (H - 2 - k > 0) grid[H - 2 - k][i] = k % 2 ? '(' : ')'; }
          bubbles.forEach((b) => { b.y -= 0.25; if (b.y < 1) { b.y = H - 2; b.x = Math.floor(Math.random() * W); } const yy = Math.floor(b.y), xx = Math.floor(b.x); if (grid[yy] && grid[yy][xx] === ' ') grid[yy][xx] = 'o'; });
          fishes.forEach((f) => {
            f.x += f.dir * f.sp;
            if (f.x < 0) { f.x = 0; f.dir = 1; } if (f.x > W - 6) { f.x = W - 6; f.dir = -1; }
            const art = (f.dir > 0 ? fishR : fishL)[f.sh];
            const yy = f.y, xs = Math.floor(f.x);
            for (let k = 0; k < art.length; k++) if (grid[yy] && xs + k < W) grid[yy][xs + k] = art[k];
          });
          pre.textContent = grid.map((r) => r.join('')).join('\n');
          raf = requestAnimationFrame(() => setTimeout(frame, 90));
        }
        frame();
        A.sound.play('bubble');
        overlay = () => { cancelAnimationFrame(raf); wrap.remove(); overlay = null; };
        armOverlayDismiss();
      }

      async function formatCmd(a) {
        if (!a.length || a[0].toLowerCase() !== 'c:') { write('Required parameter missing. Try: format c:'); return; }
        running = true;
        write('WARNING, ALL DATA ON NON-REMOVABLE DISK', 'cmd-red');
        write('DRIVE C: WILL BE LOST!', 'cmd-red');
        write('(including your fish, your paintings, and that diary)', 'cmd-red');
        const ok = await A.ui.confirm('You are about to erase everything on drive C:.\n\nAre you absolutely, positively sure?', { parent: win, title: 'Format C:', icon: 'warning' });
        if (!ok) { write('Format canceled. Phew.'); return; }
        blank();
        write('Formatting C:...');
        const bar = write('[                    ] 0%');
        for (let p = 0; p <= 100; p += 3 + Math.floor(Math.random() * 5)) {
          if (abort) { write('^C'); return; }
          p = Math.min(100, p);
          const filled = Math.round(p / 5);
          bar.textContent = '[' + '\u2588'.repeat(filled) + ' '.repeat(20 - filled) + '] ' + p + '%';
          await sleep(60 + Math.random() * 60);
        }
        blank();
        await sleep(500);
        write('Just kidding. Your fish are safe.', 'cmd-green');
        write('Nothing was deleted. This computer loves you too much.', 'cmd-green');
        A.sound.play('ding');
      }
      function sudo(raw) {
        const rest = raw.replace(/^\s*sudo\s?/i, '');
        if (/sandwich/i.test(rest)) { write('Okay.'); write('  ( poof )  Here is your sandwich.'); write('  [========]  (it is a very nice sandwich)'); A.sound.play('coin'); return; }
        write('This is not that kind of computer, but I admire the confidence.');
        write(name + ' is not in the sudoers file. This incident will be reported to the fish.');
        A.sound.play('error');
      }
      function cowsay(raw) {
        const msg = raw.replace(/^\s*cowsay\s?/i, '') || 'Moo.';
        const top = ' ' + '_'.repeat(msg.length + 2);
        const bot = ' ' + '-'.repeat(msg.length + 2);
        write(top); write('< ' + msg + ' >'); write(bot);
        ['        \\   ^__^', '         \\  (oo)\\_______', '            (__)\\       )\\/\\', '                ||----w |', '                ||     ||'].forEach((l) => write(l));
      }
      function about() {
        blank();
        write(VERSION);
        write('(c) 2007 Aerium Playground. All fish reserved.');
        blank();
        write('This console is a nostalgic toy. Type "help" for commands,');
        write('or try "matrix", "fish", "hack" or "color a" for a good time.');
        blank();
      }

      // ------------------------------------------------------------ overlay helpers (matrix)
      function startCanvasOverlay(draw, hint) {
        const canvas = h('canvas.cmd-canvas');
        const wrap = h('div.cmd-overlay', null, canvas, h('div.cmd-overlay-hint', null, hint));
        screen.appendChild(wrap);
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let raf = null, state = {}, W = 0, Hh = 0;
        const resize = () => { W = canvas.clientWidth; Hh = canvas.clientHeight; canvas.width = W * dpr; canvas.height = Hh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, Hh); state.drops = null; };
        resize();
        const offResize = win.on('resize', () => resize());
        function loop() { if (!W) resize(); draw(ctx, W, Hh, dpr, state); raf = requestAnimationFrame(loop); }
        loop();
        A.sound.play('zap');
        const cleanup = () => { cancelAnimationFrame(raf); offResize(); wrap.remove(); overlay = null; };
        overlay = cleanup;
        armOverlayDismiss();
        return cleanup;
      }
      function armOverlayDismiss() {
        const stop = (e) => {
          if (e && e.type === 'keydown' && (e.key === 'F5' || e.key === 'F12')) return;
          window.removeEventListener('keydown', stop, true);
          screen.removeEventListener('pointerdown', stop, true);
          if (overlay) overlay();
          if (!closed) showPrompt();
        };
        setTimeout(() => { window.addEventListener('keydown', stop, true); screen.addEventListener('pointerdown', stop, true); }, 120);
      }
      function waitKey() {
        return new Promise((resolve) => {
          const on = () => { window.removeEventListener('keydown', on, true); resolve(); };
          setTimeout(() => window.addEventListener('keydown', on, true), 50);
        });
      }

      // ------------------------------------------------------------ tree
      async function treeCmd() {
        write('Folder PATH listing for volume Aerium Glass');
        write('Volume serial number is 2007-AE71');
        write(winPath(cwd).replace(/^C:/, 'C:.'));
        async function walk(path, prefix) {
          let subs;
          try { subs = fs.list(path).filter((it) => it.type === 'folder' && it.path !== fs.RECYCLE); } catch (e) { subs = []; }
          for (let i = 0; i < subs.length; i++) {
            if (abort) return;
            const last = i === subs.length - 1;
            write(prefix + (last ? '\u2514\u2500\u2500\u2500' : '\u251c\u2500\u2500\u2500') + subs[i].name);
            await sleep(14);
            await walk(subs[i].path, prefix + (last ? '    ' : '\u2502   '));
          }
        }
        await walk(cwd, '');
        // A couple of fake system branches for nostalgia when at the home root.
        if (!abort && cwd === '/') {
          for (const l of ['\u251c\u2500\u2500\u2500Program Files', '\u2502   \u251c\u2500\u2500\u2500Aerium Media Player', '\u2502   \u2514\u2500\u2500\u2500Bubble Messenger', '\u2514\u2500\u2500\u2500Windows.old', '    \u2514\u2500\u2500\u2500(here be dragons)']) {
            if (abort) break;
            write(l); await sleep(14);
          }
        }
      }

      // ------------------------------------------------------------ boot
      screen.addEventListener('pointerdown', (e) => { if (e.target.tagName !== 'INPUT' && !overlay && input) { const sel = window.getSelection(); if (!sel || sel.isCollapsed) focusInput(); } });
      win.on('focus', () => { if (!overlay) focusInput(); });

      write('Aerium Command Processor  [Version 7.0.2007]');
      write('(c) 2007 Aerium Playground. All rights reserved.');
      blank();
      if (args && args.title) win.setTitle(args.title);
      showPrompt();

      return {
        onClose() {
          closed = true;
          abort = true;
          if (shutdownTimer) { clearInterval(shutdownTimer); shutdownTimer = null; }
          if (overlay) { try { overlay(); } catch (e) { /* ignore */ } overlay = null; }
        },
      };
    },
  });
})();
