/* Aerium virtual file system. A small persisted tree of folders and files
   that lives in localStorage. Sample pictures and music are references to
   built-in assets ("asset:imagery/meadow", "track:bubble-garden"). */
(function () {
  'use strict';
  const A = window.Aerium;
  const KEY = 'fs';
  const RECYCLE = '/Recycle Bin';

  const SPECIAL = {
    '/Desktop': 'icons/folder-desktop',
    '/Documents': 'icons/folder-documents',
    '/Pictures': 'icons/folder-pictures',
    '/Music': 'icons/folder-music',
    '/Videos': 'icons/folder-videos',
    '/Downloads': 'icons/folder-downloads',
    '/Games': 'icons/folder-games',
    '/Pictures/Sample Pictures': 'icons/folder-pictures',
    '/Music/Sample Music': 'icons/folder-music',
    '/Videos/Sample Videos': 'icons/folder-videos',
  };

  const EXT_ICON = {
    txt: 'icons/notepad', log: 'icons/notepad', ini: 'icons/document', md: 'icons/document', rtf: 'icons/document', doc: 'icons/document',
    png: 'icons/photo', jpg: 'icons/photo', jpeg: 'icons/photo', gif: 'icons/photo', bmp: 'icons/photo', svg: 'icons/photo', webp: 'icons/photo',
    mp3: 'icons/music', wma: 'icons/music', wav: 'icons/music', ogg: 'icons/music', m4a: 'icons/music',
    wmv: 'icons/video', avi: 'icons/video', mp4: 'icons/video',
    htm: 'icons/globe', html: 'icons/globe', url: 'icons/globe',
    exe: 'icons/settings', zip: 'icons/folder', theme: 'icons/personalize',
  };

  const now = () => Date.now();
  const folder = (children = {}, extra = {}) => Object.assign({ t: 'd', c: children, m: now() }, extra);
  const file = (d, extra = {}) => Object.assign({ t: 'f', d, m: now(), sz: typeof d === 'string' ? d.length : 0 }, extra);

  const SAMPLE_PICTURES = [
    ['Clear Sky.jpg', 'imagery/clear-sky'], ['Meadow.jpg', 'imagery/meadow'], ['Sunrise.jpg', 'imagery/sunrise'],
    ['Ocean.jpg', 'imagery/ocean'], ['Underwater.jpg', 'imagery/water'], ['Bokeh.jpg', 'imagery/bokeh-day'],
    ['Garden.jpg', 'imagery/vectorgarden'], ['Pearl.jpg', 'imagery/technozen'], ['Aurora.jpg', 'imagery/aurora'],
    ['Night Lights.jpg', 'imagery/bokeh-night'], ['Ribbons.jpg', 'imagery/dark-ribbons'], ['Deep Sea.jpg', 'imagery/deep-sea'],
  ];
  // Track ids are provided by the music engine (src/core/music.js).
  const SAMPLE_MUSIC = [
    ['Crystal Lagoon - Bubble Garden.mp3', 'bubble-garden'],
    ['Sky Mall Orchestra - Escalator Sunrise.mp3', 'sky-mall'],
    ['Aqua Pura - Aurora Drift.mp3', 'aurora-drift'],
    ['DJ Hydrate - Hydration Station.mp3', 'hydration-station'],
    ['The Glassmen - Glass City.mp3', 'glass-city'],
    ['Crystal Lagoon - Dolphin Dreams.mp3', 'dolphin-dreams'],
  ];

  const DOCS = {
    'Welcome to Aerium.txt':
      'Welcome to Aerium!\r\n\r\nThis computer is a playground. Nothing here is for work.\r\n\r\n' +
      'A few places to start:\r\n' +
      '  - Right-click the desktop and choose Personalize to change the glass color.\r\n' +
      '  - Click the fish tank to drop food. Your betta likes to say hello.\r\n' +
      '  - Open Bubble Messenger. Your friends are online.\r\n' +
      '  - Press the Flip 3D button on the taskbar with a few windows open.\r\n' +
      '  - Shake a window by its title bar.\r\n' +
      '  - Leave the computer alone for a few minutes and watch the screensaver.\r\n\r\n' +
      'Have fun. There is no homework here.\r\n',
    'Things to try.txt':
      'THINGS TO TRY\r\n=============\r\n\r\n' +
      '[ ] Change the wallpaper to the betta fish\r\n[ ] Make the glass Lime green at full intensity\r\n' +
      '[ ] Spam Refresh on the desktop (F5)\r\n[ ] Type color a in the Command Prompt\r\n' +
      '[ ] Nudge somebody in Messenger\r\n[ ] Win a game of Solitaire and watch the cards bounce\r\n' +
      '[ ] Paint something and set it as your desktop background\r\n[ ] Turn on mouse trails\r\n' +
      '[ ] Visit the Channels\r\n[ ] Find the secret in the Recycle Bin\r\n[ ] Rate this computer in System\r\n',
    'homework (due friday).txt':
      'Science project ideas:\r\n1. why is the sky blue (ask dad)\r\n2. do fish sleep??\r\n3. volcano (again)\r\n\r\n' +
      'Spelling words: aquarium, atmosphere, transparent, beautiful, definitely\r\n\r\n' +
      'remember to bring the poster board!!!\r\n',
    'diary - DO NOT READ.txt':
      'Dear diary,\r\n\r\nToday I changed the glass color to Lime and made it super see-through. It looks SO cool.\r\n' +
      'Then I made my own screensaver say my name. Mom says I have to get off the computer at 8.\r\n\r\n' +
      'The betta fish on the desktop followed my mouse. I named him Captain Bubbles.\r\n\r\nOK bye\r\n',
    'My playlist.txt':
      'MY PLAYLIST (burn to CD!!)\r\n\r\n1. Bubble Garden - Crystal Lagoon\r\n2. Escalator Sunrise - Sky Mall Orchestra\r\n' +
      '3. Aurora Drift - Aqua Pura\r\n4. Hydration Station - DJ Hydrate\r\n5. Glass City - The Glassmen\r\n6. Dolphin Dreams - Crystal Lagoon\r\n',
  };

  const DESKTOP_LINKS = [
    ['Horizon Browser.lnk', 'browser'],
    ['Bubble Messenger.lnk', 'messenger'],
    ['Media Player.lnk', 'mediaplayer'],
    ['Paint.lnk', 'paint'],
    ['Games.lnk', 'games'],
    ['Channels.lnk', 'channels'],
  ];

  function defaultTree() {
    const pics = {};
    SAMPLE_PICTURES.forEach(([n, a]) => (pics[n] = file('asset:' + a, { mime: 'image/svg+xml', ro: true, sz: 2400000 + Math.floor(Math.random() * 900000) })));
    const music = {};
    SAMPLE_MUSIC.forEach(([n, id]) => (music[n] = file('track:' + id, { mime: 'audio/x-aerium-track', ro: true, sz: 3800000 + Math.floor(Math.random() * 2600000) })));
    const docs = {};
    Object.entries(DOCS).forEach(([n, d]) => (docs[n] = file(d, { mime: 'text/plain' })));
    const desk = {};
    DESKTOP_LINKS.forEach(([n, id]) => (desk[n] = file('app:' + id, { mime: 'application/x-aerium-link', sz: 1024 })));
    const recycle = {};
    recycle['secret.txt'] = file('You found the secret!\r\n\r\nThe fish know everything. Be nice to them.\r\n\r\n(Try typing "fish" in the Command Prompt.)\r\n', {
      mime: 'text/plain',
      meta: { origin: '/Documents/secret.txt', deleted: now() - 86400000 * 3 },
    });
    return folder({
      Desktop: folder(desk),
      Documents: folder(docs),
      Pictures: folder({ 'Sample Pictures': folder(pics) }),
      Music: folder({ 'Sample Music': folder(music) }),
      Videos: folder({
        'Sample Videos': folder({
          'Fish.wmv': file('video:aquarium', { mime: 'video/x-aerium', ro: true, sz: 26214400 }),
          'Clouds.wmv': file('video:clouds', { mime: 'video/x-aerium', ro: true, sz: 18874368 }),
        }),
      }),
      Downloads: folder({}),
      'Recycle Bin': folder(recycle),
    });
  }

  let root = null;
  function load() {
    const saved = A.store.get(KEY, null);
    root = saved && saved.t === 'd' ? saved : defaultTree();
  }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = A.store.set(KEY, root);
      if (!ok) A.bus.emit('fs:full');
    }, 150);
  }
  // Saves immediately; used for big writes so a full disk is reported to
  // the caller (as a thrown error) instead of breaking a later batch.
  function flush() {
    clearTimeout(saveTimer);
    return A.store.set(KEY, root);
  }
  const BIG = 32 * 1024;
  function diskFull() {
    const err = new Error('There is not enough space on the disk. Aerium keeps your files in this browser, which only has a little room. Delete a few pictures, then try again.');
    err.code = 'ENOSPC';
    return err;
  }

  // ------------------------------------------------------------ paths
  function normalize(p) {
    if (!p) return '/';
    const parts = [];
    p.replace(/\\/g, '/').split('/').forEach((seg) => {
      if (!seg || seg === '.') return;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    });
    return '/' + parts.join('/');
  }
  const join = (...ps) => normalize(ps.join('/'));
  const dirname = (p) => normalize(normalize(p).split('/').slice(0, -1).join('/'));
  const basename = (p) => normalize(p).split('/').pop() || '';
  function ext(p) {
    const b = basename(p);
    const i = b.lastIndexOf('.');
    return i > 0 ? b.slice(i + 1).toLowerCase() : '';
  }
  const stem = (p) => { const b = basename(p); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(0, i) : b; };

  function get(p) {
    p = normalize(p);
    if (p === '/') return root;
    let node = root;
    for (const seg of p.slice(1).split('/')) {
      if (!node || node.t !== 'd') return null;
      node = node.c[seg];
    }
    return node || null;
  }

  function changed(path, type) {
    save();
    A.bus.emit('fs:change', { path: normalize(path), type, dir: dirname(path) });
  }

  // ------------------------------------------------------------ API
  const fs = {
    RECYCLE,
    normalize, join, dirname, basename, ext, stem,
    get,
    exists: (p) => !!get(p),
    isDir: (p) => { const n = get(p); return !!n && n.t === 'd'; },
    stat(p) {
      const n = get(p);
      if (!n) return null;
      return { path: normalize(p), name: basename(p) || 'Computer', type: n.t === 'd' ? 'folder' : 'file', ext: n.t === 'd' ? '' : ext(p), size: n.t === 'd' ? folderSize(n) : n.sz || 0, modified: n.m, mime: n.mime || '', readonly: !!n.ro, meta: n.meta || null };
    },
    list(p, opts = {}) {
      const n = get(p);
      if (!n || n.t !== 'd') return [];
      const out = Object.keys(n.c).map((name) => fs.stat(join(p, name)));
      out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) : a.type === 'folder' ? -1 : 1));
      return opts.filter ? out.filter(opts.filter) : out;
    },
    read(p) {
      const n = get(p);
      return n && n.t === 'f' ? n.d : null;
    },
    write(p, data, opts = {}) {
      p = normalize(p);
      const parent = get(dirname(p));
      if (!parent || parent.t !== 'd') throw new Error('Folder does not exist: ' + dirname(p));
      const name = basename(p);
      const existing = parent.c[name];
      if (existing && existing.t === 'd') throw new Error('A folder with that name already exists.');
      if (existing && existing.ro) throw new Error('This file is read-only.');
      const prevM = parent.m;
      parent.c[name] = file(data, { mime: opts.mime || (existing && existing.mime) || '', sz: typeof data === 'string' ? (data.startsWith('data:') ? Math.floor(data.length * 0.74) : data.length) : 0 });
      parent.m = now();
      if (typeof data === 'string' && data.length > BIG && !flush()) {
        if (existing) parent.c[name] = existing; else delete parent.c[name];
        parent.m = prevM;
        throw diskFull();
      }
      changed(p, existing ? 'modify' : 'create');
      return p;
    },
    mkdir(p) {
      p = normalize(p);
      if (get(p)) return p;
      const parent = get(dirname(p));
      if (!parent || parent.t !== 'd') throw new Error('Folder does not exist');
      parent.c[basename(p)] = folder();
      changed(p, 'create');
      return p;
    },
    rename(p, newName) {
      p = normalize(p);
      newName = String(newName).replace(/[\\/:*?"<>|]/g, '').trim();
      if (!newName) throw new Error('A file name cannot be empty.');
      const parent = get(dirname(p));
      const node = get(p);
      if (!node || !parent) throw new Error('Item not found');
      if (basename(p) === newName) return p;
      if (parent.c[newName]) throw new Error('There is already a file with the same name in this location.');
      delete parent.c[basename(p)];
      parent.c[newName] = node;
      node.m = now();
      const np = join(dirname(p), newName);
      changed(np, 'rename');
      A.bus.emit('fs:rename', { from: p, to: np });
      return np;
    },
    move(p, destDir) {
      p = normalize(p); destDir = normalize(destDir);
      if (destDir === p || destDir.startsWith(p + '/')) throw new Error('You cannot move a folder into itself.');
      const node = get(p), parent = get(dirname(p)), dest = get(destDir);
      if (!node || !parent || !dest || dest.t !== 'd') throw new Error('Item not found');
      if (dirname(p) === destDir) return p;
      const name = fs.uniqueName(destDir, basename(p));
      delete parent.c[basename(p)];
      dest.c[name] = node;
      changed(p, 'delete');
      changed(join(destDir, name), 'create');
      return join(destDir, name);
    },
    copy(p, destDir) {
      const node = get(p), dest = get(destDir);
      if (!node || !dest || dest.t !== 'd') throw new Error('Item not found');
      const name = fs.uniqueName(destDir, basename(p), true);
      dest.c[name] = JSON.parse(JSON.stringify(node));
      delete dest.c[name].ro;
      if ((node.t === 'd' ? folderSize(node) : node.sz || 0) > BIG && !flush()) {
        delete dest.c[name];
        throw diskFull();
      }
      changed(join(destDir, name), 'create');
      return join(destDir, name);
    },
    // Moves an item to the Recycle Bin (or deletes it for good when already there).
    remove(p, opts = {}) {
      p = normalize(p);
      if (p === '/' || p === RECYCLE || Object.prototype.hasOwnProperty.call(SPECIAL, p) && dirname(p) === '/') throw new Error('This folder cannot be deleted.');
      const node = get(p), parent = get(dirname(p));
      if (!node || !parent) return false;
      delete parent.c[basename(p)];
      if (!opts.permanent && !p.startsWith(RECYCLE + '/')) {
        const bin = get(RECYCLE);
        const name = fs.uniqueName(RECYCLE, basename(p));
        node.meta = Object.assign({}, node.meta, { origin: p, deleted: now() });
        bin.c[name] = node;
      }
      changed(p, 'delete');
      A.bus.emit('fs:recycle', { path: p });
      return true;
    },
    restore(recyclePath) {
      const node = get(recyclePath);
      if (!node) return null;
      const origin = (node.meta && node.meta.origin) || '/Desktop/' + basename(recyclePath);
      let destDir = dirname(origin);
      if (!fs.isDir(destDir)) destDir = '/Desktop';
      const name = fs.uniqueName(destDir, basename(origin));
      delete get(RECYCLE).c[basename(recyclePath)];
      if (node.meta) { delete node.meta.origin; delete node.meta.deleted; }
      get(destDir).c[name] = node;
      changed(join(destDir, name), 'create');
      changed(recyclePath, 'delete');
      return join(destDir, name);
    },
    emptyRecycleBin() {
      const bin = get(RECYCLE);
      const had = Object.keys(bin.c).length;
      bin.c = {};
      changed(RECYCLE, 'delete');
      return had;
    },
    recycleCount: () => Object.keys(get(RECYCLE).c).length,
    uniqueName(dir, name, copy) {
      const d = get(dir);
      if (!d || !d.c[name]) return name;
      const i = name.lastIndexOf('.');
      const base = i > 0 ? name.slice(0, i) : name, e = i > 0 ? name.slice(i) : '';
      if (copy && !d.c[base + ' - Copy' + e]) return base + ' - Copy' + e;
      for (let n = 2; ; n++) {
        const candidate = base + ' (' + n + ')' + e;
        if (!d.c[candidate]) return candidate;
      }
    },
    iconFor(p) {
      p = normalize(p);
      const n = get(p);
      if (p === RECYCLE) return fs.recycleCount() ? 'icons/trash-full' : 'icons/trash';
      if (SPECIAL[p]) return SPECIAL[p];
      if (!n) return 'icons/document';
      if (n.t === 'd') return 'icons/folder';
      const e = ext(p);
      if (e === 'lnk') {
        const app = A.apps && A.apps.get(String(n.d).replace(/^app:/, ''));
        return app ? app.icon : 'icons/run';
      }
      return EXT_ICON[e] || 'icons/document';
    },
    // Image URL for picture files (assets or data URLs), else null.
    thumbFor(p) {
      const n = get(p);
      if (!n || n.t !== 'f') return null;
      const d = String(n.d || '');
      if (d.startsWith('asset:')) return A.asset(d.slice(6));
      if (d.startsWith('data:image')) return d;
      return null;
    },
    typeName(p) {
      const n = get(p);
      if (!n) return '';
      if (n.t === 'd') return 'File Folder';
      const e = ext(p);
      return ({ txt: 'Text Document', log: 'Text Document', png: 'PNG Image', jpg: 'JPEG Image', jpeg: 'JPEG Image', bmp: 'Bitmap Image', gif: 'GIF Image', svg: 'SVG Image', mp3: 'MP3 Audio File', wma: 'Windows Media Audio File', wav: 'Wave Sound', wmv: 'Windows Media Video File', avi: 'Video Clip', lnk: 'Shortcut', htm: 'HTML Document', html: 'HTML Document', url: 'Internet Shortcut', theme: 'Aerium Theme File' }[e]) || (e ? e.toUpperCase() + ' File' : 'File');
    },
    capacity: 160 * 1024 * 1024 * 1024,
    used() {
      return 38.2 * 1024 * 1024 * 1024 + folderSize(root);
    },
    // Roughly how many bytes of real browser storage are left for files.
    room() {
      let used = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          used += k.length + (localStorage.getItem(k) || '').length;
        }
      } catch (e) { return Infinity; }
      return Math.max(0, 4.8e6 - used);
    },
    reset() { root = defaultTree(); save(); A.bus.emit('fs:change', { path: '/', type: 'reset', dir: '/' }); },
    on(fn) { return A.bus.on('fs:change', fn); },
    special: SPECIAL,
  };

  function folderSize(n) {
    let s = 0;
    for (const k in n.c) s += n.c[k].t === 'd' ? folderSize(n.c[k]) : n.c[k].sz || 0;
    return s;
  }

  load();
  // Make sure the standard folders exist even for older saved trees.
  ['Desktop', 'Documents', 'Pictures', 'Music', 'Videos', 'Downloads', 'Recycle Bin'].forEach((f) => { if (!root.c[f]) root.c[f] = folder(); });

  A.fs = fs;
})();
