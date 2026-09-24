/* Aerium desktop: icons on a grid, the blue selection marquee, drag and drop
   onto the Recycle Bin or folders, rename, context menus and the famous
   Refresh. Clicks on empty space reach the wallpaper (feed the fish). */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;
  const fs = A.fs;

  const SIZES = {
    large: { cell: [92, 110], icon: 64 },
    medium: { cell: [78, 90], icon: 48 },
    small: { cell: [74, 64], icon: 32 },
  };
  const PAD = { x: 6, y: 6 };

  const desktop = { selected: new Set(), items: [] };
  let root, layer, marquee;

  // Extensions the shell hides, like "Hide extensions for known file types".
  const KNOWN = new Set(['lnk', 'txt', 'png', 'jpg', 'jpeg', 'bmp', 'gif', 'mp3', 'wma', 'wmv', 'htm', 'html', 'url', 'log']);
  const labelFor = (path) => (KNOWN.has(fs.ext(path)) ? fs.stem(path) : fs.basename(path));

  function systemItems() {
    return [
      { id: 'sys:computer', name: 'Computer', icon: 'icons/computer', open: () => A.apps.launch('explorer', { path: 'computer' }), kind: 'computer' },
      { id: 'sys:home', name: A.store.get('user.name') || 'User', icon: 'icons/folder-user', open: () => A.apps.launch('explorer', { path: '/' }), kind: 'home', drop: '/Documents' },
      { id: 'sys:recycle', name: 'Recycle Bin', icon: fs.recycleCount() ? 'icons/trash-full' : 'icons/trash', open: () => A.apps.launch('explorer', { path: fs.RECYCLE }), kind: 'recycle', drop: fs.RECYCLE },
    ];
  }

  function collect() {
    const files = fs.list('/Desktop').map((it) => ({
      id: 'file:' + it.path,
      name: labelFor(it.path),
      icon: fs.iconFor(it.path),
      thumb: it.type === 'file' ? fs.thumbFor(it.path) : null,
      path: it.path,
      isFolder: it.type === 'folder',
      shortcut: it.ext === 'lnk',
      open: () => A.apps.openFile(it.path),
      drop: it.type === 'folder' ? it.path : null,
    }));
    return systemItems().concat(files);
  }

  function size() { return SIZES[A.store.get('desktop.iconSize')] || SIZES.medium; }
  function rows() { return Math.max(1, Math.floor((layer.clientHeight - PAD.y * 2) / size().cell[1])); }

  function placeAll(items) {
    const positions = A.store.get('desktop.positions') || {};
    const auto = A.store.get('desktop.autoArrange');
    const R = rows();
    const taken = new Set();
    const key = (c, r) => c + ':' + r;
    const out = {};
    if (!auto) {
      items.forEach((it) => {
        const p = positions[it.id];
        if (p && p.r < R && !taken.has(key(p.c, p.r))) { out[it.id] = p; taken.add(key(p.c, p.r)); }
      });
    }
    let c = 0, r = 0;
    items.forEach((it) => {
      if (out[it.id]) return;
      while (taken.has(key(c, r))) { r++; if (r >= R) { r = 0; c++; } }
      out[it.id] = { c, r };
      taken.add(key(c, r));
    });
    return out;
  }

  function cellToXY(p) {
    const s = size();
    return { x: PAD.x + p.c * s.cell[0], y: PAD.y + p.r * s.cell[1] };
  }
  function xyToCell(x, y) {
    const s = size();
    return { c: Math.max(0, Math.round((x - PAD.x) / s.cell[0])), r: clamp(Math.round((y - PAD.y) / s.cell[1]), 0, rows() - 1) };
  }

  desktop.render = function () {
    if (!layer) return;
    const show = A.store.get('desktop.showIcons');
    layer.querySelectorAll('.dk-icon').forEach((n) => n.remove());
    desktop.items = collect();
    if (!show) return;
    const pos = placeAll(desktop.items);
    const s = size();
    layer.dataset.size = A.store.get('desktop.iconSize');
    desktop.items.forEach((it) => {
      const p = cellToXY(pos[it.id]);
      const iconEl = it.thumb ? h('img.dk-thumb', { src: it.thumb, alt: '', draggable: false }) : A.img(it.icon);
      const el = h('div.dk-icon', {
        class: [desktop.selected.has(it.id) && 'selected', it.shortcut && 'shortcut'],
        dataset: { id: it.id },
        style: { left: p.x + 'px', top: p.y + 'px', width: s.cell[0] - 4 + 'px', '--icon': s.icon + 'px' },
        tabIndex: -1,
      }, h('div.dk-icon-img', null, iconEl, it.shortcut ? h('span.dk-arrow') : null), h('span.dk-label', null, it.name));
      el.item = it;
      el.pos = pos[it.id];
      layer.appendChild(el);
    });
  };

  desktop.refresh = function () {
    // The flicker everybody spammed F5 to see.
    layer.classList.add('dk-refreshing');
    setTimeout(() => { desktop.render(); layer.classList.remove('dk-refreshing'); }, 110);
  };

  function iconEls() { return Array.from(layer.querySelectorAll('.dk-icon')); }
  function setSelection(ids) {
    desktop.selected = new Set(ids);
    iconEls().forEach((el) => el.classList.toggle('selected', desktop.selected.has(el.dataset.id)));
  }
  function selectedItems() { return desktop.items.filter((it) => desktop.selected.has(it.id)); }

  function savePositions() {
    const positions = A.store.get('desktop.positions') || {};
    iconEls().forEach((el) => (positions[el.dataset.id] = el.pos));
    A.store.set('desktop.positions', positions);
  }

  // ------------------------------------------------------------ actions
  function openItem(it) {
    A.sound.play('click');
    it.open();
  }

  async function deleteItems(items) {
    const deletable = items.filter((it) => it.path);
    if (!deletable.length) return;
    deletable.forEach((it) => { try { fs.remove(it.path); } catch (e) { A.ui.messageBox({ icon: 'error', message: e.message }); } });
    A.sound.play('recycle');
    desktop.selected.clear();
  }

  function rename(it) {
    if (!it.path) return;
    const el = layer.querySelector(`.dk-icon[data-id="${CSS.escape(it.id)}"]`);
    if (!el) return;
    const label = el.querySelector('.dk-label');
    const full = fs.basename(it.path);
    const ta = h('textarea.dk-rename', { spellcheck: false, rows: 1 });
    ta.value = full;
    label.replaceWith(ta);
    ta.focus();
    const dot = full.lastIndexOf('.');
    ta.setSelectionRange(0, KNOWN.has(fs.ext(full)) && dot > 0 ? dot : full.length);
    let done = false;
    const finish = (commit) => {
      if (done) return;
      done = true;
      const v = ta.value.replace(/\n/g, '').trim();
      if (commit && v && v !== full) {
        try {
          const np = fs.rename(it.path, v);
          const positions = A.store.get('desktop.positions') || {};
          if (positions[it.id]) { positions['file:' + np] = positions[it.id]; delete positions[it.id]; A.store.set('desktop.positions', positions); }
          setSelection(['file:' + np]);
        } catch (e) { A.ui.messageBox({ icon: 'error', title: 'Rename', message: e.message }); }
      }
      desktop.render();
    };
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    ta.addEventListener('blur', () => finish(true));
    ta.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  function newItem(kind) {
    let path;
    if (kind === 'folder') path = fs.mkdir(fs.join('/Desktop', fs.uniqueName('/Desktop', 'New Folder')));
    else path = fs.write(fs.join('/Desktop', fs.uniqueName('/Desktop', 'New Text Document.txt')), '', { mime: 'text/plain' });
    desktop.render();
    const it = desktop.items.find((i) => i.path === path);
    if (it) { setSelection([it.id]); rename(it); }
  }

  desktop.properties = function (it) {
    if (it.kind === 'computer') { A.apps.launch('system'); return; }
    if (it.kind === 'recycle') {
      A.ui.messageBox({ title: 'Recycle Bin Properties', icon: 'icons/trash', instruction: 'Recycle Bin', message: `Items: ${fs.recycleCount()}\nLocation: Local Disk (C:)\nMaximum size: 8,192 MB` });
      return;
    }
    const path = it.path || '/';
    const st = fs.stat(path);
    const rowsList = [
      ['Type:', it.kind === 'home' ? 'System Folder' : fs.typeName(path)],
      ['Location:', fs.dirname(path)],
      ['Size:', A.util.fmtBytes(st ? st.size : 0)],
      ['Modified:', st ? A.util.fmtDateTime(st.modified) : ''],
    ];
    if (st && st.ext === 'lnk') rowsList.splice(1, 0, ['Target:', String(fs.read(path)).replace(/^app:/, '') + '.exe']);
    const content = h('div.dk-props', null,
      h('div.dk-props-head', null, A.img(it.icon), h('input.ae-input', { value: it.name, readOnly: true })),
      h('div.ae-hr'),
      h('table', null, rowsList.map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, v)))));
    A.ui.dialog({ title: it.name + ' Properties', icon: it.icon, content, width: 380 });
  };

  function iconMenu(it) {
    if (it.kind === 'recycle') {
      return [
        { label: 'Open', bold: true, onClick: () => openItem(it) },
        { separator: true },
        { label: 'Empty Recycle Bin', disabled: !fs.recycleCount(), onClick: emptyBin },
        { separator: true },
        { label: 'Properties', onClick: () => desktop.properties(it) },
      ];
    }
    if (it.kind === 'computer' || it.kind === 'home') {
      return [
        { label: 'Open', bold: true, onClick: () => openItem(it) },
        { label: 'Explore', onClick: () => openItem(it) },
        { separator: true },
        { label: 'Properties', onClick: () => desktop.properties(it) },
      ];
    }
    const ext = fs.ext(it.path);
    const items = [{ label: 'Open', bold: true, onClick: () => openItem(it) }];
    if (['png', 'jpg', 'jpeg', 'bmp', 'gif', 'svg'].includes(ext)) {
      items.push({ label: 'Edit', onClick: () => A.apps.launch('paint', { path: it.path }) });
      items.push({ label: 'Set as Desktop Background', onClick: () => A.theme.setWallpaper('file:' + it.path) });
    }
    if (ext === 'txt') items.push({ label: 'Edit', onClick: () => A.apps.launch('notepad', { path: it.path }) });
    items.push({ separator: true }, { label: 'Delete', onClick: () => deleteItems([it]) }, { label: 'Rename', onClick: () => rename(it) }, { separator: true }, { label: 'Properties', onClick: () => desktop.properties(it) });
    return items;
  }

  async function emptyBin() {
    const n = fs.recycleCount();
    if (!n) return;
    const ok = await A.ui.confirm(n === 1 ? 'Are you sure you want to permanently delete this item?' : `Are you sure you want to permanently delete these ${n} items?`, { title: n === 1 ? 'Delete File' : 'Delete Multiple Items', icon: 'warning' });
    if (!ok) return;
    fs.emptyRecycleBin();
    A.sound.play('empty');
  }
  desktop.emptyBin = emptyBin;

  function desktopMenu() {
    const sz = A.store.get('desktop.iconSize');
    return [
      { label: 'View', submenu: [
        { label: 'Large Icons', checked: sz === 'large', radio: true, onClick: () => { A.store.set('desktop.iconSize', 'large'); desktop.render(); } },
        { label: 'Medium Icons', checked: sz === 'medium', radio: true, onClick: () => { A.store.set('desktop.iconSize', 'medium'); desktop.render(); } },
        { label: 'Classic Icons', checked: sz === 'small', radio: true, onClick: () => { A.store.set('desktop.iconSize', 'small'); desktop.render(); } },
        { separator: true },
        { label: 'Auto Arrange', checked: A.store.get('desktop.autoArrange'), onClick: () => { A.store.set('desktop.autoArrange', !A.store.get('desktop.autoArrange')); desktop.render(); } },
        { separator: true },
        { label: 'Show Desktop Icons', checked: A.store.get('desktop.showIcons'), onClick: () => { A.store.set('desktop.showIcons', !A.store.get('desktop.showIcons')); desktop.render(); } },
      ] },
      { label: 'Sort By', submenu: ['Name', 'Size', 'Type', 'Date Modified'].map((k) => ({ label: k, onClick: () => sortBy(k) })) },
      { label: 'Refresh', onClick: desktop.refresh },
      { separator: true },
      { label: 'Paste', disabled: true },
      { label: 'Paste Shortcut', disabled: true },
      { separator: true },
      { label: 'New', submenu: [
        { label: 'Folder', icon: 'icons/folder', onClick: () => newItem('folder') },
        { separator: true },
        { label: 'Text Document', icon: 'icons/notepad', onClick: () => newItem('text') },
      ] },
      { separator: true },
      { label: 'Screen Resolution', icon: 'icons/monitor', onClick: () => A.apps.launch('personalize', { page: 'display' }) },
      { label: 'Gadgets', icon: 'icons/gadgets', onClick: () => A.gadgets && A.gadgets.gallery() },
      { label: 'Personalize', icon: 'icons/personalize', onClick: () => A.apps.launch('personalize') },
    ];
  }

  function sortBy(key) {
    const items = desktop.items.slice();
    const sys = items.filter((i) => !i.path);
    const files = items.filter((i) => i.path).sort((a, b) => {
      const sa = fs.stat(a.path), sb = fs.stat(b.path);
      if (key === 'Size') return sb.size - sa.size;
      if (key === 'Type') return fs.typeName(a.path).localeCompare(fs.typeName(b.path)) || a.name.localeCompare(b.name);
      if (key === 'Date Modified') return sb.modified - sa.modified;
      return a.name.localeCompare(b.name);
    });
    const R = rows();
    const positions = {};
    sys.concat(files).forEach((it, i) => (positions[it.id] = { c: Math.floor(i / R), r: i % R }));
    A.store.set('desktop.positions', positions);
    desktop.refresh();
  }

  // ------------------------------------------------------------ pointer handling
  function bind() {
    let dragState = null;
    layer.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      const iconEl = e.target.closest('.dk-icon');
      layer.focus({ preventScroll: true });
      A.wm.active && A.wm.active.blur();
      if (iconEl) {
        const id = iconEl.dataset.id;
        if (e.ctrlKey || e.metaKey) {
          const s = new Set(desktop.selected);
          s.has(id) ? s.delete(id) : s.add(id);
          setSelection(s);
        } else if (!desktop.selected.has(id)) setSelection([id]);
        if (e.button === 0) startIconDrag(e, iconEl);
        return;
      }
      if (e.button === 0) startMarquee(e);
    });

    layer.addEventListener('dblclick', (e) => {
      const iconEl = e.target.closest('.dk-icon');
      if (iconEl) openItem(iconEl.item);
    });

    layer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const iconEl = e.target.closest('.dk-icon');
      if (iconEl) {
        if (!desktop.selected.has(iconEl.dataset.id)) setSelection([iconEl.dataset.id]);
        const sel = selectedItems();
        const items = sel.length > 1 && sel.every((s) => s.path)
          ? [{ label: 'Delete', onClick: () => deleteItems(sel) }]
          : iconMenu(iconEl.item);
        A.ui.menu(items, e.clientX, e.clientY);
      } else {
        setSelection([]);
        A.ui.menu(desktopMenu(), e.clientX, e.clientY);
      }
    });

    // Forward hover to the wallpaper (the betta follows the cursor).
    let raf = null, lastMove = null;
    layer.addEventListener('pointermove', (e) => {
      lastMove = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        if (lastMove && !dragState) A.theme.pointer('move', lastMove.clientX, lastMove.clientY, lastMove);
      });
    });
    layer.addEventListener('pointerleave', () => A.theme.pointer('leave', 0, 0));

    layer.addEventListener('keydown', (e) => {
      if (A.util.isTyping(e)) return;
      const sel = selectedItems();
      if (e.key === 'F5') { e.preventDefault(); desktop.refresh(); }
      else if (e.key === 'Enter' && sel.length) { e.preventDefault(); sel.forEach(openItem); }
      else if (e.key === 'Delete' && sel.length) { e.preventDefault(); deleteItems(sel); }
      else if (e.key === 'F2' && sel.length === 1) { e.preventDefault(); rename(sel[0]); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); setSelection(desktop.items.map((i) => i.id)); }
      else if (/^Arrow/.test(e.key)) {
        e.preventDefault();
        const els = iconEls();
        if (!els.length) return;
        const cur = els.find((el) => desktop.selected.has(el.dataset.id)) || els[0];
        const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        const target = els.find((el) => el.pos.c === cur.pos.c + dc && el.pos.r === cur.pos.r + dr);
        if (target) setSelection([target.dataset.id]);
      }
    });

    function startMarquee(e) {
      const rect = layer.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      let moved = false;
      const base = e.ctrlKey ? new Set(desktop.selected) : new Set();
      const move = (ev) => {
        const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
        if (!moved && Math.hypot(x - sx, y - sy) < 4) return;
        if (!moved) { moved = true; marquee.style.display = 'block'; document.body.classList.add('ae-dragging'); }
        const l = Math.min(sx, x), t = Math.min(sy, y), w = Math.abs(x - sx), hh = Math.abs(y - sy);
        Object.assign(marquee.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: hh + 'px' });
        const s = new Set(base);
        iconEls().forEach((el) => {
          const r = { l: el.offsetLeft, t: el.offsetTop, r: el.offsetLeft + el.offsetWidth, b: el.offsetTop + el.offsetHeight };
          if (r.l < l + w && r.r > l && r.t < t + hh && r.b > t) s.add(el.dataset.id);
        });
        setSelection(s);
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.classList.remove('ae-dragging');
        marquee.style.display = 'none';
        if (!moved) {
          setSelection(e.ctrlKey ? desktop.selected : []);
          if (A.store.get('aquarium.feedOnClick') !== false) A.theme.pointer('click', ev.clientX, ev.clientY, ev);
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function startIconDrag(e, iconEl) {
      const rect = layer.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY;
      let started = false;
      let group = [];
      let hoverTarget = null;
      const move = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!started) {
          if (Math.hypot(dx, dy) < 5) return;
          started = true;
          dragState = true;
          document.body.classList.add('ae-dragging');
          group = iconEls().filter((el) => desktop.selected.has(el.dataset.id)).map((el) => ({ el, x: el.offsetLeft, y: el.offsetTop }));
          group.forEach((g) => g.el.classList.add('dragging'));
        }
        group.forEach((g) => { g.el.style.left = g.x + dx + 'px'; g.el.style.top = g.y + dy + 'px'; });
        // Drop targets: Recycle Bin and folders on the desktop, or any
        // Explorer folder (marked with data-exdrop) in a window on top.
        const stack = document.elementsFromPoint(ev.clientX, ev.clientY).filter((n) => !(n.closest && n.closest('.dk-icon.dragging, .dk-ghost')));
        overWin = !!(stack[0] && stack[0].closest && stack[0].closest('.win, #ae-taskbar'));
        let t = null;
        if (overWin) {
          t = stack[0].closest('[data-exdrop]');
        } else {
          const under = stack.find((n) => n.classList && n.classList.contains('dk-icon'));
          t = under && under.item && under.item.drop ? under : null;
        }
        if (t !== hoverTarget) {
          hoverTarget && hoverTarget.classList.remove('drop-target', 'ex-drop-hover');
          hoverTarget = t;
          hoverTarget && hoverTarget.classList.add(overWin ? 'ex-drop-hover' : 'drop-target');
        }
        // Over a window the icons would hide behind it, so a ghost follows the cursor.
        if (overWin && !ghost) {
          const first = group[0].el.item;
          ghost = h('div.dk-ghost', null, A.img(first.icon || A.fs.iconFor(first.path || '')), group.length > 1 ? h('span.dk-ghost-count', null, String(group.length)) : null);
          document.getElementById('ae-overlays').appendChild(ghost);
        }
        if (ghost) {
          ghost.style.display = overWin ? '' : 'none';
          ghost.style.transform = `translate(${ev.clientX + 8}px, ${ev.clientY + 10}px)`;
        }
      };
      let overWin = false, ghost = null;
      const up = (ev) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        if (!started) return;
        dragState = null;
        document.body.classList.remove('ae-dragging');
        group.forEach((g) => g.el.classList.remove('dragging'));
        if (ghost) { ghost.remove(); ghost = null; }
        if (overWin) {
          // Dropped into an Explorer folder: move (or copy with Ctrl) the files there.
          const dest = hoverTarget && hoverTarget.dataset.exdrop;
          if (hoverTarget) hoverTarget.classList.remove('ex-drop-hover');
          const movable = dest ? group.map((g) => g.el.item).filter((it) => it.path && it.path !== dest && fs.dirname(it.path) !== dest) : [];
          if (dest === fs.RECYCLE) deleteItems(movable);
          else movable.forEach((it) => { try { if (ev.ctrlKey) fs.copy(it.path, dest); else fs.move(it.path, dest); } catch (err) { A.ui.messageBox({ icon: 'error', message: err.message }); } });
          desktop.render();
          return;
        }
        if (hoverTarget) {
          const dest = hoverTarget.item.drop;
          hoverTarget.classList.remove('drop-target');
          const movable = group.map((g) => g.el.item).filter((it) => it.path && it.path !== dest);
          if (dest === fs.RECYCLE) deleteItems(movable);
          else movable.forEach((it) => { try { fs.move(it.path, dest); } catch (err) { A.ui.messageBox({ icon: 'error', message: err.message }); } });
          if (!movable.length) desktop.render();
          return;
        }
        // Snap each dragged icon to the nearest free cell.
        const taken = new Set(iconEls().filter((el) => !group.some((g) => g.el === el)).map((el) => el.pos.c + ':' + el.pos.r));
        group.forEach((g) => {
          let cell = xyToCell(g.el.offsetLeft, g.el.offsetTop);
          let guard = 0;
          while (taken.has(cell.c + ':' + cell.r) && guard++ < 400) { cell.r++; if (cell.r >= rows()) { cell.r = 0; cell.c++; } }
          taken.add(cell.c + ':' + cell.r);
          g.el.pos = cell;
          const p = cellToXY(cell);
          g.el.style.left = p.x + 'px';
          g.el.style.top = p.y + 'px';
        });
        if (A.store.get('desktop.autoArrange')) A.store.set('desktop.autoArrange', false);
        savePositions();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      void rect;
    }
  }

  desktop.init = function () {
    root = document.getElementById('ae-desktop');
    layer = document.getElementById('ae-icons');
    layer.tabIndex = -1;
    marquee = h('div.dk-marquee');
    layer.appendChild(marquee);
    bind();
    desktop.render();
    A.fs.on((ev) => { if (ev.dir === '/Desktop' || ev.path.startsWith('/Desktop') || ev.dir === fs.RECYCLE || ev.path.startsWith(fs.RECYCLE) || ev.type === 'reset') desktop.render(); });
    A.bus.on('store:user.name', desktop.render);
    A.bus.on('apps:change', A.util.debounce(desktop.render, 50));
    window.addEventListener('resize', A.util.debounce(desktop.render, 150));
  };

  A.desktop = desktop;
})();
