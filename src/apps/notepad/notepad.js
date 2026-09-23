/* Notepad: plain text editing with the classic menus, Find/Replace, Go To,
   Time/Date (F5), word wrap, and the secret .LOG diary trick.
   This file is also the reference for how an Aerium app is put together. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;

  A.apps.register({
    id: 'notepad',
    name: 'Notepad',
    icon: 'icons/notepad',
    color: '#5aa9e6',
    category: 'accessories',
    description: 'Creates and edits text files using basic text formatting.',
    keywords: ['text', 'editor', 'txt', 'write'],
    fileTypes: ['txt', 'log', 'ini', 'md'],
    window: { width: 640, height: 460, minWidth: 320, minHeight: 200 },
    launch(win, args) {
      let path = null;
      let saved = '';
      let wrap = A.store.get('notepad.wrap', true);
      let statusOn = A.store.get('notepad.status', true);
      let font = A.store.get('notepad.font', { family: 'Consolas', size: 14 });
      let lastFind = '';

      const text = h('textarea.np-text', { spellcheck: false, wrap: wrap ? 'soft' : 'off', 'aria-label': 'Text editor' });
      const pos = h('span.np-pos', null, 'Ln 1, Col 1');
      const status = h('div.ae-statusbar.np-status', { hidden: !statusOn }, h('span', { style: { flex: 1 } }), h('span.ae-status-cell', null, pos));
      applyFont();

      const menubar = A.ui.menubar([
        { label: 'File', items: () => [
          { label: 'New', shortcut: 'Ctrl+N', onClick: newFile },
          { label: 'Open...', shortcut: 'Ctrl+O', onClick: openFile },
          { label: 'Save', shortcut: 'Ctrl+S', onClick: () => save() },
          { label: 'Save As...', onClick: () => save(true) },
          { separator: true },
          { label: 'Page Setup...', disabled: true },
          { label: 'Print...', shortcut: 'Ctrl+P', onClick: print },
          { separator: true },
          { label: 'Exit', onClick: () => win.close() },
        ] },
        { label: 'Edit', items: () => {
          const sel = text.selectionEnd > text.selectionStart;
          return [
            { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => { text.focus(); document.execCommand('undo'); } },
            { separator: true },
            { label: 'Cut', shortcut: 'Ctrl+X', disabled: !sel, onClick: () => { text.focus(); document.execCommand('cut'); } },
            { label: 'Copy', shortcut: 'Ctrl+C', disabled: !sel, onClick: () => { text.focus(); document.execCommand('copy'); } },
            { label: 'Paste', shortcut: 'Ctrl+V', onClick: paste },
            { label: 'Delete', shortcut: 'Del', disabled: !sel, onClick: () => { text.focus(); document.execCommand('delete'); } },
            { separator: true },
            { label: 'Find...', shortcut: 'Ctrl+F', onClick: find },
            { label: 'Find Next', shortcut: 'F3', onClick: () => findNext() },
            { label: 'Replace...', shortcut: 'Ctrl+H', onClick: replace },
            { label: 'Go To...', shortcut: 'Ctrl+G', disabled: wrap, onClick: goTo },
            { separator: true },
            { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => { text.focus(); text.select(); } },
            { label: 'Time/Date', shortcut: 'F5', onClick: timeDate },
          ];
        } },
        { label: 'Format', items: () => [
          { label: 'Word Wrap', checked: wrap, onClick: toggleWrap },
          { label: 'Font...', onClick: chooseFont },
        ] },
        { label: 'View', items: () => [
          { label: 'Status Bar', checked: statusOn, disabled: wrap, onClick: () => { statusOn = !statusOn; status.hidden = !statusOn; A.store.set('notepad.status', statusOn); } },
        ] },
        { label: 'Help', items: () => [
          { label: 'View Help', onClick: () => A.apps.launch('help', { topic: 'notepad' }) },
          { separator: true },
          { label: 'About Notepad', onClick: about },
        ] },
      ]);

      win.body.classList.add('np');
      win.body.append(menubar, h('div.np-edit', null, text), status);

      // ---------------------------------------------------- behaviors
      function title() { win.setTitle((path ? A.fs.basename(path) : 'Untitled') + ' - Notepad'); }
      const dirty = () => text.value !== saved;

      function applyFont() {
        text.style.fontFamily = `"${font.family}", Consolas, "Lucida Console", monospace`;
        text.style.fontSize = font.size + 'px';
      }

      function load(p) {
        const content = A.fs.read(p);
        if (content == null) { A.ui.messageBox({ parent: win, icon: 'error', title: 'Notepad', message: 'Cannot find the file ' + p + '.' }); return; }
        path = p;
        let body = String(content);
        // The .LOG trick: files starting with .LOG get a timestamp every time they open.
        if (body.startsWith('.LOG')) body += '\r\n' + stamp() + '\r\n';
        text.value = body;
        saved = String(content);
        title();
        A.apps.rememberRecentFile(p);
        setTimeout(() => {
          text.focus();
          const end = body.startsWith('.LOG') ? body.length : 0;
          text.setSelectionRange(end, end);
          updatePos();
        }, 30);
      }

      async function confirmDiscard() {
        if (!dirty()) return true;
        const name = path ? A.fs.basename(path) : 'Untitled';
        const r = await A.ui.messageBox({
          parent: win, title: 'Notepad', icon: 'question',
          instruction: `Do you want to save changes to ${name}?`,
          buttons: [{ label: 'Save', default: true, value: 'save' }, { label: "Don't Save", value: 'discard' }, { label: 'Cancel', cancel: true, value: 'cancel' }],
        });
        if (r === 'save') return save();
        return r === 'discard';
      }

      async function newFile() {
        if (!(await confirmDiscard())) return;
        path = null; saved = ''; text.value = '';
        title(); updatePos(); text.focus();
      }

      async function openFile() {
        if (!(await confirmDiscard())) return;
        const p = await A.ui.fileDialog({ mode: 'open', parent: win, folder: path ? A.fs.dirname(path) : '/Documents', exts: ['txt', 'log', 'ini', 'md'], filterLabel: 'Text Documents (*.txt)' });
        if (p) load(p);
      }

      async function save(as) {
        let p = path;
        if (!p || as) {
          p = await A.ui.fileDialog({ mode: 'save', parent: win, folder: path ? A.fs.dirname(path) : '/Documents', filename: path ? A.fs.basename(path) : '*.txt', exts: ['txt'], filterLabel: 'Text Documents (*.txt)' });
          if (!p) return false;
        }
        try {
          A.fs.write(p, text.value, { mime: 'text/plain' });
        } catch (e) {
          A.ui.messageBox({ parent: win, icon: 'error', title: 'Notepad', message: e.message });
          return false;
        }
        path = p;
        saved = text.value;
        title();
        return true;
      }

      function paste() {
        text.focus();
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then((t) => insert(t)).catch(() => document.execCommand('paste'));
        } else document.execCommand('paste');
      }
      function insert(str) {
        text.focus();
        if (!document.execCommand('insertText', false, str)) text.setRangeText(str, text.selectionStart, text.selectionEnd, 'end');
        updatePos();
      }
      const stamp = () => A.util.fmtTime(new Date()) + ' ' + A.util.fmtDate(new Date());
      function timeDate() { insert(stamp()); }

      function findNext(term) {
        term = term || lastFind;
        if (!term) { find(); return; }
        lastFind = term;
        const hay = text.value.toLowerCase(), needle = term.toLowerCase();
        let i = hay.indexOf(needle, text.selectionEnd);
        if (i < 0) i = hay.indexOf(needle);
        if (i < 0) { A.ui.messageBox({ parent: win, title: 'Notepad', icon: 'info', message: `Cannot find "${term}"` }); return; }
        text.focus();
        text.setSelectionRange(i, i + term.length);
        updatePos();
      }
      async function find() {
        const sel = text.value.slice(text.selectionStart, text.selectionEnd);
        const term = await A.ui.prompt({ parent: win, title: 'Find', message: 'Find what:', value: sel || lastFind, okLabel: 'Find Next' });
        if (term) findNext(term);
      }
      async function replace() {
        const what = A.ui.textField({ label: 'Find what:', value: lastFind });
        const withF = A.ui.textField({ label: 'Replace with:' });
        const r = await A.ui.dialog({
          parent: win, title: 'Replace', width: 380,
          content: h('div.np-replace', null, what, withF),
          buttons: [{ label: 'Replace All', default: true, value: 'all' }, { label: 'Replace', value: 'one' }, { label: 'Cancel', cancel: true, value: null }],
        });
        const a = what.input.value, b = withF.input.value;
        if (!r || !a) return;
        lastFind = a;
        if (r === 'all') {
          const re = new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          text.focus(); text.select();
          insert(text.value.replace(re, b));
        } else {
          const cur = text.value.slice(text.selectionStart, text.selectionEnd);
          if (cur.toLowerCase() !== a.toLowerCase()) findNext(a);
          if (text.value.slice(text.selectionStart, text.selectionEnd).toLowerCase() === a.toLowerCase()) insert(b);
        }
      }
      async function goTo() {
        const lines = text.value.split('\n').length;
        const v = await A.ui.prompt({ parent: win, title: 'Go To Line', message: 'Line number:', value: String(lineCol().ln) });
        if (v == null) return;
        const n = parseInt(v, 10);
        if (!(n >= 1 && n <= lines)) { A.ui.messageBox({ parent: win, title: 'Notepad - Goto Line', icon: 'warning', message: 'The line number is beyond the total number of lines' }); return; }
        const idx = text.value.split('\n').slice(0, n - 1).join('\n').length + (n > 1 ? 1 : 0);
        text.focus(); text.setSelectionRange(idx, idx); updatePos();
      }
      function toggleWrap() {
        wrap = !wrap;
        text.wrap = wrap ? 'soft' : 'off';
        A.store.set('notepad.wrap', wrap);
      }
      async function chooseFont() {
        const families = ['Consolas', 'Lucida Console', 'Courier New', 'Selawik', 'Segoe UI', 'Comic Sans MS', 'Georgia', 'M PLUS Rounded 1c', 'Michroma'];
        const fam = A.ui.select({ options: families, value: font.family });
        const size = A.ui.select({ options: [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 36], value: font.size });
        const sample = h('div.np-font-sample', null, 'AaBbYyZz');
        const upd = () => { sample.style.fontFamily = `"${fam.value}"`; sample.style.fontSize = size.value + 'px'; };
        fam.addEventListener('change', upd); size.addEventListener('change', upd); upd();
        const r = await A.ui.dialog({
          parent: win, title: 'Font', width: 360,
          content: h('div.np-font', null, h('label', null, 'Font:', fam), h('label', null, 'Size:', size), h('fieldset', null, h('legend', null, 'Sample'), sample)),
          buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }],
        });
        if (r !== 'ok') return;
        font = { family: fam.value, size: Number(size.value) };
        A.store.set('notepad.font', font);
        applyFont();
      }
      function print() {
        A.ui.messageBox({ parent: win, title: 'Print', icon: 'warning', instruction: 'No printers are installed', message: 'Before you can print, you need to install a printer. Honestly, just take a screenshot.' });
      }
      function about() {
        A.ui.messageBox({ parent: win, title: 'About Notepad', icon: 'icons/aerium', instruction: 'Aerium Notepad', message: 'Version 7.0 (Build 2007)\n\nThis product is licensed to:\n' + (A.store.get('user.name') || 'User'), sound: false });
      }

      function lineCol() {
        const before = text.value.slice(0, text.selectionStart);
        const lines = before.split('\n');
        return { ln: lines.length, col: lines[lines.length - 1].length + 1 };
      }
      function updatePos() { const p = lineCol(); pos.textContent = `Ln ${p.ln}, Col ${p.col}`; }
      ['keyup', 'click', 'input', 'select'].forEach((ev) => text.addEventListener(ev, updatePos));

      win.el.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (e.key === 'F5') { e.preventDefault(); timeDate(); }
        else if (e.key === 'F3') { e.preventDefault(); findNext(); }
        else if (e.ctrlKey || e.metaKey) {
          if (k === 's') { e.preventDefault(); save(); }
          else if (k === 'o') { e.preventDefault(); openFile(); }
          else if (k === 'n') { e.preventDefault(); newFile(); }
          else if (k === 'f') { e.preventDefault(); find(); }
          else if (k === 'h') { e.preventDefault(); replace(); }
          else if (k === 'g') { e.preventDefault(); goTo(); }
          else if (k === 'p') { e.preventDefault(); print(); }
        }
      });

      if (args && args.path) load(args.path);
      else { title(); setTimeout(() => text.focus(), 50); }

      return {
        beforeClose: confirmDiscard,
        onArgs(a) { if (a && a.path) confirmDiscard().then((ok) => ok && load(a.path)); },
      };
    },
  });
})();
