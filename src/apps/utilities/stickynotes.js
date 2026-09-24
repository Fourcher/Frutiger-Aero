/* Sticky Notes: glossy paper notes that live on the desktop, above the icons
   and below the windows. Drag them by the header, resize from the corner and
   right-click to change the color. They remember their text, color, position
   and size, and come back whenever the desktop starts. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;

  const KEY = 'stickynotes.notes';
  const COLORS = [
    ['yellow', 'Yellow', '#fff27a'], ['blue', 'Blue', '#a8d8f5'], ['green', 'Green', '#b9eb95'],
    ['pink', 'Pink', '#ffb6d8'], ['purple', 'Purple', '#cdb6f3'], ['white', 'White', '#ffffff'],
  ];
  const W0 = 210, H0 = 196, MIN_W = 160, MIN_H = 110, MAX_W = 620, MAX_H = 620;
  const SIDEBAR = 14 + 156 + 24; // keep clear of the gadget column on the right

  let notes = load();
  const els = new Map();
  let mounted = false;

  function load() {
    const raw = A.store.get(KEY, []);
    return Array.isArray(raw) ? raw.filter((n) => n && n.id).map((n) => Object.assign({ text: '', color: 'yellow', x: 40, y: 40, w: W0, h: H0 }, n)) : [];
  }
  const saveNow = () => A.store.set(KEY, notes.map((n) => ({ id: n.id, text: n.text, color: n.color, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.w), h: Math.round(n.h) })));
  const save = A.util.debounce(saveNow, 300);
  const layer = () => document.getElementById('ae-gadgets');
  function area() {
    const g = layer();
    return { W: (g && g.clientWidth) || window.innerWidth, H: (g && g.clientHeight) || window.innerHeight - 40 };
  }
  // Notes share the layer with the gadgets, so "to the front" means above those too.
  function topZ() {
    const g = layer();
    let z = 1;
    if (g) Array.from(g.children).forEach((c) => { z = Math.max(z, parseInt(c.style.zIndex, 10) || 0); });
    return z + 1;
  }
  const swatch = (hex) => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="' + hex + '"/><stop offset="1" stop-color="' + hex + '"/></linearGradient></defs><rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="url(#g)" stroke="rgba(0,0,0,.35)"/></svg>');

  // ------------------------------------------------------------ create and delete
  // New notes land near the top right, left of the gadgets, cascading down.
  function spot(near) {
    const { W, H } = area();
    if (near) return { x: clamp(near.x + 26, 8, W - W0 - 8), y: clamp(near.y + 26, 8, H - H0 - 8) };
    const baseX = Math.max(12, W - SIDEBAR - W0), baseY = 28;
    for (let i = 0; i < 40; i++) {
      const x = baseX - (i % 8) * 26 - Math.floor(i / 8) * 40, y = baseY + (i % 8) * 26;
      if (!notes.some((n) => Math.abs(n.x - x) < 12 && Math.abs(n.y - y) < 12)) return { x: clamp(x, 8, W - W0 - 8), y: clamp(y, 8, H - H0 - 8) };
    }
    return { x: clamp(baseX, 8, W - W0 - 8), y: baseY };
  }
  function addNote(near) {
    const p = spot(near);
    const n = { id: A.util.uid('sn'), text: '', color: (near && near.color) || A.store.get('stickynotes.color', 'yellow'), x: p.x, y: p.y, w: W0, h: H0 };
    notes.push(n);
    saveNow();
    if (mounted) {
      const el = renderNote(n);
      el.classList.add('sn-new');
      setTimeout(() => el.classList.remove('sn-new'), 400);
      focusNote(el);
    }
    A.sound.play('plop');
    return n;
  }
  async function askDelete() {
    if (A.store.get('stickynotes.noConfirm', false)) return true;
    const again = A.ui.checkbox({ label: "Don't display this message again" });
    const content = h('div.ae-taskdialog', null,
      A.img('icons/warning', { class: 'ae-td-icon' }),
      h('div.ae-td-text', null,
        h('div.ae-td-instruction', null, 'Are you sure you want to delete this note?'),
        h('div.sn-ask', null, again)));
    A.sound.play('exclamation');
    const r = await A.ui.dialog({
      title: 'Sticky Notes', icon: 'icons/sticky', width: 400, content,
      buttons: [{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no', cancel: true }],
    });
    if (r === 'yes' && again.checked) A.store.set('stickynotes.noConfirm', true);
    return r === 'yes';
  }
  async function deleteNote(n) {
    if (!(await askDelete())) return;
    notes = notes.filter((x) => x.id !== n.id);
    saveNow();
    const el = els.get(n.id);
    els.delete(n.id);
    A.sound.play('recycle');
    if (el) { el.classList.add('sn-gone'); setTimeout(() => el.remove(), 260); }
  }
  function setColor(n, color) {
    n.color = color;
    A.store.set('stickynotes.color', color);
    const el = els.get(n.id);
    if (el) el.dataset.color = color;
    save();
    A.sound.play('click');
  }
  function focusNote(el) {
    el.style.zIndex = topZ();
    const ta = el.querySelector('.sn-text');
    setTimeout(() => { if (ta && ta.isConnected) { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); } }, 40);
  }

  // ------------------------------------------------------------ one note
  function renderNote(n) {
    const { W, H } = area();
    n.w = clamp(n.w || W0, MIN_W, MAX_W);
    n.h = clamp(n.h || H0, MIN_H, MAX_H);
    n.x = clamp(n.x, 0, Math.max(0, W - 60));
    n.y = clamp(n.y, 0, Math.max(0, H - 30));
    const add = h('button.sn-btn.sn-add', { type: 'button', 'aria-label': 'New note', 'data-tip': 'New note' });
    const del = h('button.sn-btn.sn-del', { type: 'button', 'aria-label': 'Delete note', 'data-tip': 'Delete note' });
    const head = h('div.sn-head', null, add, h('span.sn-grab'), del);
    const ta = h('textarea.sn-text', { spellcheck: false, 'aria-label': 'Note' });
    ta.value = n.text || '';
    const grip = h('div.sn-grip', { 'aria-hidden': 'true' });
    const el = h('div.sn-note', {
      dataset: { color: n.color, id: n.id },
      style: { left: n.x + 'px', top: n.y + 'px', width: n.w + 'px', height: n.h + 'px', zIndex: topZ() },
    }, head, ta, grip);

    ta.addEventListener('input', () => { n.text = ta.value; save(); });
    ta.addEventListener('focus', () => el.classList.add('sn-focus'));
    ta.addEventListener('blur', () => el.classList.remove('sn-focus'));
    ta.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'n') { e.preventDefault(); addNote(n); }
      else if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); deleteNote(n); }
    });
    add.addEventListener('click', () => addNote(n));
    del.addEventListener('click', () => deleteNote(n));
    el.addEventListener('pointerdown', (e) => {
      el.style.zIndex = topZ();
      if (A.wm.active) A.wm.active.blur();
      if (e.target === el || e.target === grip) e.preventDefault();
    });

    let sx = 0, sy = 0, sw = 0, sh = 0;
    A.util.drag(head, {
      filter: (e) => !e.target.closest('.sn-btn'),
      onDown: () => { sx = n.x; sy = n.y; },
      onStart: () => { el.classList.add('sn-dragging'); return true; },
      onMove: (e, dx, dy) => {
        const b = area();
        n.x = clamp(sx + dx, -n.w + 60, b.W - 60);
        n.y = clamp(sy + dy, 0, b.H - 26);
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
      },
      onEnd: (e, moved) => { el.classList.remove('sn-dragging'); if (moved) save(); },
    });
    A.util.drag(grip, {
      threshold: 0,
      onDown: () => { sw = n.w; sh = n.h; },
      onStart: () => { el.classList.add('sn-resizing'); return true; },
      onMove: (e, dx, dy) => {
        n.w = clamp(sw + dx, MIN_W, MAX_W);
        n.h = clamp(sh + dy, MIN_H, MAX_H);
        el.style.width = n.w + 'px';
        el.style.height = n.h + 'px';
      },
      onEnd: () => { el.classList.remove('sn-resizing'); save(); },
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const hasSel = ta.selectionEnd > ta.selectionStart;
      const edit = (cmd) => { ta.focus(); document.execCommand(cmd); };
      A.ui.menu([
        { label: 'Cut', shortcut: 'Ctrl+X', disabled: !hasSel, onClick: () => edit('cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', disabled: !hasSel, onClick: () => edit('copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', disabled: !(navigator.clipboard && navigator.clipboard.readText), onClick: () => {
          ta.focus();
          navigator.clipboard.readText().then((t) => { if (t) { ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, 'end'); n.text = ta.value; save(); } }).catch(() => {});
        } },
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => { ta.focus(); ta.select(); } },
        { separator: true },
        ...COLORS.map(([id, label, hex]) => ({ label, icon: swatch(hex), checked: n.color === id, radio: true, onClick: () => setColor(n, id) })),
        { separator: true },
        { label: 'New note', shortcut: 'Ctrl+N', icon: 'icons/sticky', onClick: () => addNote(n) },
        { label: 'Delete note', shortcut: 'Ctrl+D', onClick: () => deleteNote(n) },
      ], e.clientX, e.clientY);
    });

    els.set(n.id, el);
    const g = layer();
    if (g) g.appendChild(el);
    return el;
  }

  // ------------------------------------------------------------ show and hide
  function mountAll() {
    const g = layer();
    if (!g) return;
    g.querySelectorAll('.sn-note').forEach((el) => el.remove());
    els.clear();
    notes.forEach(renderNote);
    mounted = true;
  }
  function hideAll() {
    els.forEach((el) => el.remove());
    els.clear();
    const g = layer();
    if (g) g.querySelectorAll('.sn-note').forEach((el) => el.remove());
    mounted = false;
  }
  function reclamp() {
    if (!mounted) return;
    const { W, H } = area();
    notes.forEach((n) => {
      const el = els.get(n.id);
      if (!el) return;
      n.x = clamp(n.x, -n.w + 60, Math.max(0, W - 60));
      n.y = clamp(n.y, 0, Math.max(0, H - 26));
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
    });
    save();
  }

  A.apps.register({
    id: 'stickynotes',
    name: 'Sticky Notes',
    icon: 'icons/sticky',
    color: '#f5c518',
    category: 'accessories',
    description: 'Jot down a quick note and stick it on your desktop.',
    keywords: ['sticky', 'notes', 'note', 'memo', 'reminder', 'post', 'stikynot'],
    noWindow: true,
    launch() {
      if (!mounted) {
        notes = load();
        mountAll();
        // Opening Sticky Notes shows your notes; with none yet, it starts one.
        if (!notes.length) addNote();
        else { const last = els.get(notes[notes.length - 1].id); if (last) focusNote(last); }
      } else addNote();
      return null;
    },
  });

  // ------------------------------------------------------------ desktop lifecycle
  A.bus.on('shell:start', () => { notes = load(); mountAll(); });
  A.bus.on('shell:stop', () => { saveNow(); hideAll(); });
  A.bus.on('stickynotes:hide', () => { saveNow(); hideAll(); }); // Task Manager ended stikynot.exe
  window.addEventListener('resize', A.util.debounce(reclamp, 200));
  window.addEventListener('pagehide', () => { if (notes.length) saveNow(); });
  if (A.shellReady) { notes = load(); mountAll(); }
})();
