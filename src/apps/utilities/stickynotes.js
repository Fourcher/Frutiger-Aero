/* Sticky Notes: glossy paper notes that live on the desktop. Drag them by the
   header, resize from the corner, right-click to recolor. They remember their
   text, color, position and size, and come back when the desktop starts. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;

  const KEY = 'stickynotes.notes';
  const COLORS = [
    ['yellow', 'Yellow'], ['blue', 'Blue'], ['green', 'Green'],
    ['pink', 'Pink'], ['purple', 'Purple'], ['white', 'White'],
  ];
  const DEFAULT_W = 210, DEFAULT_H = 200;

  let notes = load();
  const els = new Map(); // id -> element
  let mounted = false;
  let z = 1;

  function load() {
    const raw = A.store.get(KEY, []);
    return Array.isArray(raw) ? raw : [];
  }
  const save = A.util.debounce(() => A.store.set(KEY, notes), 250);

  function host() { return document.getElementById('ae-gadgets'); }
  function bounds() {
    const g = host();
    return { W: (g && g.clientWidth) || window.innerWidth, H: (g && g.clientHeight) || (window.innerHeight - 40) };
  }

  function makeNote(o) {
    const note = Object.assign({ id: A.util.uid('sn'), text: '', color: 'yellow', x: 0, y: 0, w: DEFAULT_W, h: DEFAULT_H }, o || {});
    return note;
  }

  // ------------------------------------------------------------ create / delete
  function addNote(near) {
    const { W, H } = bounds();
    // Cascade new notes near the top-left, or beside a given note.
    const base = near || { x: 24, y: 24 };
    const offset = notes.length ? 22 : 0;
    const n = makeNote({
      color: A.store.get('stickynotes.lastColor', 'yellow'),
      x: clamp(base.x + offset, 8, W - DEFAULT_W - 8),
      y: clamp(base.y + offset, 8, H - DEFAULT_H - 8),
    });
    notes.push(n);
    save();
    if (mounted) { const el = renderNote(n); requestAnimationFrame(() => el.classList.add('sn-pop-in')); focusNote(n, el); }
    A.sound.play('plop');
    return n;
  }

  async function deleteNote(n, el) {
    const text = (n.text || '').trim();
    if (text.length > 2) {
      const ok = await A.ui.confirm('Delete this note?\n\nThis note has writing on it. Once it is gone, it is gone.', { title: 'Sticky Notes', icon: 'question' });
      if (!ok) return;
    }
    notes = notes.filter((x) => x.id !== n.id);
    save();
    A.sound.play('recycle');
    if (el) { el.classList.add('sn-pop-out'); setTimeout(() => el.remove(), 180); }
    els.delete(n.id);
  }

  function setColor(n, color, el) {
    n.color = color;
    A.store.set('stickynotes.lastColor', color);
    save();
    if (el) el.dataset.color = color;
    A.sound.play('click');
  }

  // ------------------------------------------------------------ rendering
  function focusNote(n, el) {
    el = el || els.get(n.id);
    if (!el) return;
    el.style.zIndex = ++z;
    const ta = el.querySelector('.sn-text');
    setTimeout(() => ta && ta.focus(), 30);
  }

  function renderNote(n) {
    const { W, H } = bounds();
    n.x = clamp(n.x, 0, Math.max(0, W - 60));
    n.y = clamp(n.y, 0, Math.max(0, H - 40));
    n.w = clamp(n.w || DEFAULT_W, 150, 520);
    n.h = clamp(n.h || DEFAULT_H, 120, 520);

    const addBtn = h('button.sn-btn.sn-add', { type: 'button', 'aria-label': 'New note', 'data-tip': 'New note' }, '+');
    const delBtn = h('button.sn-btn.sn-del', { type: 'button', 'aria-label': 'Delete note', 'data-tip': 'Delete note' }, '×');
    const header = h('div.sn-header', null, h('span.sn-grip'), h('div.sn-actions', null, addBtn, delBtn));
    const ta = h('textarea.sn-text', { spellcheck: false, placeholder: 'Type a note...', 'aria-label': 'Note text' });
    ta.value = n.text || '';
    const grip = h('div.sn-resize', { 'aria-hidden': 'true' });
    const el = h('div.sn-note', {
      dataset: { color: n.color, id: n.id },
      style: { left: n.x + 'px', top: n.y + 'px', width: n.w + 'px', height: n.h + 'px', zIndex: ++z },
    }, header, ta, grip);

    // typing
    ta.addEventListener('input', () => { n.text = ta.value; save(); });
    ta.addEventListener('focus', () => { el.classList.add('sn-focused'); el.style.zIndex = ++z; });
    ta.addEventListener('blur', () => el.classList.remove('sn-focused'));
    ta.addEventListener('keydown', (e) => e.stopPropagation());

    // buttons
    addBtn.addEventListener('click', () => addNote({ x: n.x, y: n.y }));
    delBtn.addEventListener('click', () => deleteNote(n, el));

    // bring to front on any press
    el.addEventListener('pointerdown', () => { el.style.zIndex = ++z; }, true);

    // drag by header
    A.util.drag(header, {
      filter: (e) => !e.target.closest('.sn-btn'),
      onStart: () => { el.classList.add('sn-dragging'); el.style.zIndex = ++z; return true; },
      onMove: (e, dx, dy) => {
        const b = bounds();
        n.x = clamp(startX + dx, 0, b.W - el.offsetWidth);
        n.y = clamp(startY + dy, 0, b.H - 26);
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
      },
      onEnd: () => { el.classList.remove('sn-dragging'); save(); },
    });
    let startX, startY;
    header.addEventListener('pointerdown', () => { startX = n.x; startY = n.y; });

    // resize from the corner
    A.util.drag(grip, {
      threshold: 0,
      onStart: () => { el.classList.add('sn-resizing'); return true; },
      onMove: (e, dx, dy) => {
        n.w = clamp(startW + dx, 150, 560);
        n.h = clamp(startH + dy, 120, 560);
        el.style.width = n.w + 'px';
        el.style.height = n.h + 'px';
      },
      onEnd: () => { el.classList.remove('sn-resizing'); save(); },
    });
    let startW, startH;
    grip.addEventListener('pointerdown', () => { startW = n.w; startH = n.h; });

    // context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      A.ui.menu([
        { header: 'Note color' },
        ...COLORS.map(([id, label]) => ({ label, checked: n.color === id, radio: true, onClick: () => setColor(n, id, el) })),
        { separator: true },
        { label: 'New note', icon: 'icons/sticky', onClick: () => addNote({ x: n.x, y: n.y }) },
        { label: 'Delete note', onClick: () => deleteNote(n, el) },
      ], e.clientX, e.clientY);
    });

    els.set(n.id, el);
    const g = host();
    if (g) g.appendChild(el);
    return el;
  }

  // ------------------------------------------------------------ mount / unmount
  function mountAll() {
    const g = host();
    if (!g) return;
    // remove any of our stale nodes, then draw current notes
    g.querySelectorAll('.sn-note').forEach((el) => el.remove());
    els.clear();
    notes.forEach(renderNote);
    mounted = true;
  }
  function hideAll() {
    const g = host();
    if (g) g.querySelectorAll('.sn-note').forEach((el) => el.remove());
    els.clear();
    mounted = false;
  }
  function reclamp() {
    if (!mounted) return;
    const { W, H } = bounds();
    notes.forEach((n) => {
      const el = els.get(n.id);
      if (!el) return;
      n.x = clamp(n.x, 0, Math.max(0, W - el.offsetWidth));
      n.y = clamp(n.y, 0, Math.max(0, H - 26));
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
    });
    save();
  }

  // ------------------------------------------------------------ app
  A.apps.register({
    id: 'stickynotes',
    name: 'Sticky Notes',
    icon: 'icons/sticky',
    color: '#ffd62e',
    category: 'accessories',
    description: 'Little glossy notes for your desktop.',
    keywords: ['sticky', 'notes', 'note', 'memo', 'reminder', 'stikynot'],
    noWindow: true,
    launch() {
      if (!mounted) mountAll();
      if (!notes.length) addNote();
      else addNote(); // launching again adds a new note
      return null;
    },
  });

  // ------------------------------------------------------------ desktop lifecycle
  A.bus.on('shell:start', () => { notes = load(); mountAll(); });
  A.bus.on('shell:stop', hideAll);
  window.addEventListener('resize', A.util.debounce(reclamp, 200));
  // If the desktop is already up when this script loads, restore right away.
  if (A.shellReady) { notes = load(); mountAll(); }
})();
