/* Aerium start menu: glass frame, white program list with All Programs,
   search as you type, the framed user picture that turns into the icon of
   whatever you hover, and the power button. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;

  const sm = { open: false };
  let el = null;

  const PINNED = ['browser', 'messenger'];
  const DEFAULT_FREQUENT = ['welcome', 'mediaplayer', 'paint', 'calculator', 'notepad', 'solitaire', 'photos', 'channels'];
  const CATEGORIES = [
    ['accessories', 'Accessories', 'icons/folder'],
    ['games', 'Games', 'icons/folder-games'],
    ['internet', 'Internet', 'icons/folder'],
    ['media', 'Media', 'icons/folder-music'],
    ['system', 'System Tools', 'icons/folder'],
  ];

  function frequent() {
    const recent = (A.store.get('recent.apps') || []).filter((id) => A.apps.get(id) && !PINNED.includes(id) && !A.apps.get(id).hidden);
    const out = recent.slice(0, 8);
    DEFAULT_FREQUENT.forEach((id) => { if (out.length < 8 && !out.includes(id) && A.apps.get(id) && !PINNED.includes(id)) out.push(id); });
    return out;
  }

  function appRow(id, big) {
    const app = A.apps.get(id);
    if (!app) return null;
    const row = h('button.sm-item', { type: 'button', class: big && 'big', 'data-tip': app.description || '' },
      A.img(app.icon), h('span.sm-item-text', null, h('span.sm-item-name', null, app.name), big && app.subtitle ? h('span.sm-item-sub', null, app.subtitle) : null));
    row.addEventListener('click', () => { sm.close(); A.apps.launch(id); });
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const pinned = A.store.get('taskbar.pinned') || [];
      A.ui.menu([
        { label: 'Open', bold: true, onClick: () => { sm.close(); A.apps.launch(id); } },
        { separator: true },
        pinned.includes(id) ? { label: 'Unpin from Taskbar', onClick: () => { A.store.set('taskbar.pinned', pinned.filter((p) => p !== id)); A.taskbar.render(); } } : { label: 'Pin to Taskbar', onClick: () => { A.store.set('taskbar.pinned', pinned.concat(id)); A.taskbar.render(); } },
        { label: 'Remove from this list', onClick: () => { A.store.set('recent.apps', (A.store.get('recent.apps') || []).filter((x) => x !== id)); build(); } },
      ], e.clientX, e.clientY);
    });
    return row;
  }

  // ------------------------------------------------------------ search
  function searchResults(q) {
    q = q.trim().toLowerCase();
    const out = { programs: [], settings: [], files: [] };
    if (!q) return out;
    A.apps.list({ includeHidden: false }).forEach((app) => {
      const hay = (app.name + ' ' + (app.keywords || []).join(' ') + ' ' + app.id).toLowerCase();
      if (hay.includes(q)) (app.category === 'settings' ? out.settings : out.programs).push(app);
    });
    const walk = (dir, depth) => {
      if (depth > 4 || out.files.length > 6) return;
      A.fs.list(dir).forEach((it) => {
        if (it.path === A.fs.RECYCLE) return;
        if (it.name.toLowerCase().includes(q)) out.files.push(it);
        if (it.type === 'folder') walk(it.path, depth + 1);
      });
    };
    walk('/', 0);
    return out;
  }

  function renderSearch(list, q) {
    list.innerHTML = '';
    const r = searchResults(q);
    let first = null;
    const section = (title, items, make) => {
      if (!items.length) return;
      list.appendChild(h('div.sm-section', null, title));
      items.slice(0, 6).forEach((it) => { const row = make(it); if (row) { list.appendChild(row); first = first || row; } });
    };
    section('Programs', r.programs, (app) => appRow(app.id));
    section('Control Panel', r.settings, (app) => appRow(app.id));
    section('Files', r.files, (it) => {
      const row = h('button.sm-item', { type: 'button' }, A.img(A.fs.iconFor(it.path)), h('span.sm-item-text', null, h('span.sm-item-name', null, it.name)));
      row.addEventListener('click', () => { sm.close(); A.apps.openFile(it.path); });
      return row;
    });
    if (!first) list.appendChild(h('div.sm-empty', null, 'No items match your search.'));
    list.appendChild(h('button.sm-seemore', { type: 'button', onclick: () => { sm.close(); A.apps.launch('explorer', { path: '/', search: q }); } }, A.img('icons/search'), 'See more results'));
    return first;
  }

  // ------------------------------------------------------------ build
  function build() {
    if (el) el.remove();
    const user = A.store.get('user.name') || 'User';
    const avatar = A.store.get('user.avatar');
    const list = h('div.sm-list');
    const leftBody = h('div.sm-left-body', null, list);
    let allMode = false;

    function renderDefault() {
      list.innerHTML = '';
      PINNED.forEach((id) => { const r = appRow(id, true); r && list.appendChild(r); });
      list.appendChild(h('div.sm-sep'));
      frequent().forEach((id) => { const r = appRow(id); r && list.appendChild(r); });
    }
    function renderAll() {
      list.innerHTML = '';
      const tree = h('div.sm-tree');
      A.apps.list().filter((a) => !a.category || !CATEGORIES.some(([c]) => c === a.category)).filter((a) => a.category !== 'settings').forEach((a) => tree.appendChild(appRow(a.id)));
      CATEGORIES.forEach(([cat, label, icon]) => {
        const items = A.apps.list({ category: cat });
        if (!items.length) return;
        const kids = h('div.sm-folder-kids', { hidden: true }, items.map((a) => appRow(a.id)));
        const f = h('button.sm-item.sm-folder', { type: 'button' }, A.img(icon), h('span.sm-item-text', null, h('span.sm-item-name', null, label)));
        f.addEventListener('click', () => { kids.hidden = !kids.hidden; f.classList.toggle('open', !kids.hidden); });
        tree.append(f, kids);
      });
      list.appendChild(tree);
    }
    const allBtn = h('button.sm-all', { type: 'button' }, h('span', null, 'All Programs'), h('span.sm-all-arrow', null, '▶'));
    allBtn.addEventListener('click', () => {
      allMode = !allMode;
      allBtn.firstChild.textContent = allMode ? 'Back' : 'All Programs';
      allBtn.classList.toggle('back', allMode);
      allMode ? renderAll() : renderDefault();
    });

    const search = h('input.sm-search-input', { type: 'search', placeholder: 'Search programs and files', spellcheck: false, autocomplete: 'off', 'aria-label': 'Search programs and files' });
    let firstResult = null;
    search.addEventListener('input', () => {
      const q = search.value;
      if (q.trim()) { allBtn.hidden = true; firstResult = renderSearch(list, q); }
      else { allBtn.hidden = false; firstResult = null; allMode ? renderAll() : renderDefault(); }
    });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = search.value.trim().toLowerCase();
        if (firstResult) firstResult.click();
        else if (q && A.apps.get(q)) { sm.close(); A.apps.launch(q); }
      }
      if (e.key === 'Escape') { e.preventDefault(); sm.close(); }
    });

    // Right column links; hovering swaps the user picture for the link icon.
    const pic = h('div.sm-userpic', null, h('img.sm-pic-user', { src: A.asset(avatar), alt: '' }), h('img.sm-pic-hover', { alt: '' }));
    const hoverImg = pic.querySelector('.sm-pic-hover');
    const link = (label, icon, fn, bold) => {
      const b = h('button.sm-link', { type: 'button', class: bold && 'bold' }, label);
      b.addEventListener('pointerenter', () => { hoverImg.src = A.asset(icon); pic.classList.add('hovering'); });
      b.addEventListener('pointerleave', () => pic.classList.remove('hovering'));
      b.addEventListener('click', () => { sm.close(); fn(); });
      return b;
    };
    const right = h('div.sm-right', null,
      pic,
      h('div.sm-links', null,
        link(user, 'icons/folder-user', () => A.apps.launch('explorer', { path: '/' }), true),
        link('Documents', 'icons/folder-documents', () => A.apps.launch('explorer', { path: '/Documents' })),
        link('Pictures', 'icons/folder-pictures', () => A.apps.launch('explorer', { path: '/Pictures' })),
        link('Music', 'icons/folder-music', () => A.apps.launch('explorer', { path: '/Music' })),
        link('Games', 'icons/folder-games', () => A.apps.launch('games')),
        h('div.sm-link-sep'),
        link('Computer', 'icons/computer', () => A.apps.launch('explorer', { path: 'computer' })),
        link('Network', 'icons/network', () => A.apps.launch('controlpanel', { page: 'network' })),
        h('div.sm-link-sep'),
        link('Control Panel', 'icons/settings', () => A.apps.launch('controlpanel')),
        link('Personalize', 'icons/personalize', () => A.apps.launch('personalize')),
        link('Help and Support', 'icons/help', () => A.apps.launch('help')),
        link('Run...', 'icons/run', runDialog)),
      h('div.sm-power', null,
        h('button.sm-shutdown', { type: 'button', onclick: () => { sm.close(); A.boot.shutdown(); } }, 'Shut down'),
        h('button.sm-power-more', { type: 'button', 'aria-label': 'More power options', onclick: (e) => powerMenu(e.currentTarget) }, '▶')));

    el = h('div.startmenu', { role: 'menu', 'aria-label': 'Start menu' },
      h('div.sm-left', null, leftBody, allBtn, h('div.sm-search', null, search, h('span.sm-search-icon'))),
      right);
    document.getElementById('ae-overlays').appendChild(el);
    renderDefault();
    el.search = search;
  }

  function powerMenu(anchor) {
    const r = anchor.getBoundingClientRect();
    A.ui.menu([
      { label: 'Switch user', onClick: () => { sm.close(); A.boot.logoff(true); } },
      { label: 'Log off', onClick: () => { sm.close(); A.boot.logoff(); } },
      { label: 'Lock', onClick: () => { sm.close(); A.boot.lock(); } },
      { separator: true },
      { label: 'Restart', onClick: () => { sm.close(); A.boot.shutdown(true); } },
      { label: 'Sleep', onClick: () => { sm.close(); A.boot.sleep(); } },
      { label: 'Hibernate', onClick: () => { sm.close(); A.boot.sleep(true); } },
    ], r.right + 2, r.top, { owner: el });
  }

  async function runDialog() {
    const cmd = await A.ui.prompt({ title: 'Run', icon: 'icons/run', message: 'Type the name of a program, folder, document, or Internet resource, and Aerium will open it for you.', value: A.store.get('run.last', '') });
    if (cmd == null || !cmd.trim()) return;
    const c = cmd.trim();
    A.store.set('run.last', c);
    const lower = c.toLowerCase().replace(/\.exe$/, '');
    if (lower === 'regedit' || lower === 'msconfig') {
      const ok = await A.ui.uac({ program: lower === 'regedit' ? 'Registry Editor' : 'System Configuration', icon: 'icons/settings' });
      if (ok) A.ui.messageBox({ title: lower === 'regedit' ? 'Registry Editor' : 'System Configuration', icon: 'info', instruction: 'Nice try', message: 'The registry is where the fish keep their secrets. It is locked for their privacy.' });
      return;
    }
    if (/^https?:\/\/|^www\.|\.(com|net|org)$/.test(lower)) return A.apps.launch('browser', { url: c });
    if (A.fs.exists(c)) return A.apps.openFile(c);
    if (A.apps.get(lower)) return A.apps.launch(lower);
    A.ui.messageBox({ title: c, icon: 'error', message: `Aerium cannot find '${c}'. Make sure you typed the name correctly, and then try again.` });
  }
  sm.runDialog = runDialog;

  sm.show = function () {
    if (sm.open) return;
    A.taskbar.closeFlyouts();
    build();
    sm.open = true;
    document.querySelector('.tb-orb').classList.add('pressed');
    requestAnimationFrame(() => el.classList.add('open'));
    setTimeout(() => el && el.search && el.search.focus(), 60);
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  };
  sm.close = function () {
    if (!sm.open) return;
    sm.open = false;
    document.removeEventListener('pointerdown', outside, true);
    const orb = document.querySelector('.tb-orb');
    orb && orb.classList.remove('pressed');
    const e = el;
    el = null;
    if (e) { e.classList.remove('open'); e.classList.add('closing'); setTimeout(() => e.remove(), 160); }
  };
  sm.toggle = () => (sm.open ? sm.close() : sm.show());

  function outside(e) {
    if (el && el.contains(e.target)) return;
    if (e.target.closest && (e.target.closest('.tb-orb') || e.target.closest('.ae-menu'))) return;
    sm.close();
  }

  A.startmenu = sm;
})();
