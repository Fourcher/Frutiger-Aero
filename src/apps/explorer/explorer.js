/* Explorer: browse the Aerium virtual file system in a glass window.
   Back and Forward orbs, breadcrumbs with sibling menus, live search, the
   glossy command bar, a navigation pane with Favorite Links and the folder
   tree, seven views with real thumbnails, the blue selection marquee, drag
   and drop, inline rename, a details pane, and the Computer and Recycle Bin
   views. Everything it shows lives in Aerium.fs. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;
  const fs = A.fs;
  const RECYCLE = fs.RECYCLE;

  // ================================================================ constants
  const PICTURE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'];
  const MUSIC_EXTS = ['mp3', 'wma', 'wav', 'ogg', 'm4a'];
  const VIDEO_EXTS = ['wmv', 'avi', 'mp4'];
  const TEXT_EXTS = ['txt', 'log', 'ini', 'md'];
  // "Hide extensions for known file types", the same list the desktop uses.
  const KNOWN = new Set(['lnk', 'txt', 'png', 'jpg', 'jpeg', 'bmp', 'gif', 'mp3', 'wma', 'wmv', 'htm', 'html', 'url', 'log']);
  const BUILD_DATE = new Date(2007, 0, 30, 9, 41).getTime();
  const DRIVE_C = 'Local Disk (C:)';
  const DRIVE_D = 'DVD RW Drive (D:)';
  const BAD_CHARS = /[\\/:*?"<>|]/g;

  const isPic = (p) => PICTURE_EXTS.includes(fs.ext(p));
  const isMusic = (p) => MUSIC_EXTS.includes(fs.ext(p));
  const isVideo = (p) => VIDEO_EXTS.includes(fs.ext(p));
  const isText = (p) => TEXT_EXTS.includes(fs.ext(p));
  const userName = () => A.store.get('user.name') || 'User';
  const showExt = () => !!A.store.get('explorer.showExt', false);
  const labelFor = (name) => (!showExt() && KNOWN.has(fs.ext(name)) ? fs.stem(name) : name);
  const kb = (n) => Math.max(n ? 1 : 0, Math.ceil((n || 0) / 1024)).toLocaleString('en-US') + ' KB';
  const bytesLong = (n) => A.util.fmtBytes(n) + ' (' + Math.round(n).toLocaleString('en-US') + ' bytes)';
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  const fmtDT = (t) => (t ? A.util.fmtDateTime(t) : '');
  const ratingOf = (p) => (A.store.get('photos.ratings', {}) || {})[p] || 0;
  const rotationOf = (p) => (A.store.get('photos.rotation', {}) || {})[p] || 0;
  function setRating(p, n) {
    const all = Object.assign({}, A.store.get('photos.ratings', {}) || {});
    if (n) all[p] = n; else delete all[p];
    A.store.set('photos.ratings', all);
  }
  function rotateStored(p, deg) {
    const all = Object.assign({}, A.store.get('photos.rotation', {}) || {});
    const v = (((all[p] || 0) + deg) % 360 + 360) % 360;
    if (v) all[p] = v; else delete all[p];
    A.store.set('photos.rotation', all);
  }
  function prettyPath(p) {
    if (!p) return '';
    p = fs.normalize(p);
    if (p === '/') return userName();
    if (p === RECYCLE) return 'Recycle Bin';
    return p;
  }
  function hashNum(str) {
    let x = 2166136261;
    for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function trackFor(path) {
    const d = String(fs.read(path) || '');
    if (!d.startsWith('track:')) return null;
    const id = d.slice(6);
    const t = A.music && typeof A.music.getTrack === 'function' ? A.music.getTrack(id) : null;
    if (t) return t;
    const stem = fs.stem(path);
    const i = stem.indexOf(' - ');
    return { id, title: i > 0 ? stem.slice(i + 3) : stem, artist: i > 0 ? stem.slice(0, i) : '', album: 'Sample Music', genre: '', year: '', duration: 0 };
  }
  function walk(dir, fn, skipRecycle = true, depth = 0) {
    if (depth > 24) return;
    for (const st of fs.list(dir)) {
      if (skipRecycle && st.path === RECYCLE) continue;
      fn(st);
      if (st.type === 'folder') walk(st.path, fn, skipRecycle, depth + 1);
    }
  }
  function findCaseInsensitive(p) {
    p = fs.normalize(p);
    if (fs.exists(p)) return p;
    let cur = '/';
    for (const seg of p.slice(1).split('/')) {
      if (!seg) continue;
      const hit = fs.list(cur).find((it) => it.name.toLowerCase() === seg.toLowerCase());
      if (!hit) return null;
      cur = hit.path;
    }
    return cur;
  }

  // ================================================================ glyphs and icons
  function svgEl(markup) {
    const t = document.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstChild;
  }
  const svgURL = (svg) => URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const ARROW = 'M15.5 10H5.6M10.2 5 5.2 10l5 5';
  const GLYPH = {
    back: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${ARROW}" fill="none" stroke="rgba(3,30,70,.5)" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${ARROW}" fill="none" stroke="#fff" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    fwd: `<svg viewBox="0 0 20 20" aria-hidden="true" style="transform:scaleX(-1)"><path d="${ARROW}" fill="none" stroke="rgba(3,30,70,.5)" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${ARROW}" fill="none" stroke="#fff" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    caret: '<svg viewBox="0 0 8 5" aria-hidden="true"><path d="M.4.4h7.2L4 4.6z" fill="currentColor"/></svg>',
    chevron: '<svg viewBox="0 0 5 8" aria-hidden="true"><path d="M.9.5 4.5 4 .9 7.5z" fill="currentColor"/></svg>',
    refresh: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.2 8.4A5.2 5.2 0 1 1 11.6 4.3" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M14.4 1.6v4.9H9.5z" fill="currentColor"/></svg>',
    search: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.6" cy="6.6" r="4.4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9.9 9.9 14 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    clear: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    views: '<svg viewBox="0 0 16 16" aria-hidden="true"><g stroke="#0a6fd1" stroke-width=".8"><rect x="1.5" y="1.5" width="5.6" height="5.6" rx="1.2" fill="#7cc8ff"/><rect x="8.9" y="1.5" width="5.6" height="5.6" rx="1.2" fill="#3aa6f5"/><rect x="1.5" y="8.9" width="5.6" height="5.6" rx="1.2" fill="#3aa6f5"/><rect x="8.9" y="8.9" width="5.6" height="5.6" rx="1.2" fill="#7cc8ff"/></g><path d="M2.4 2.6h3.8M9.8 2.6h3.8M2.4 10h3.8M9.8 10h3.8" stroke="#fff" stroke-opacity=".8" stroke-width="1.1" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4l2.95 6.05 6.65.95-4.8 4.65 1.15 6.6L12 17.5l-5.95 3.15 1.15-6.6-4.8-4.65 6.65-.95z"/></svg>',
    up: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10V2.5M2.6 5.6 6 2.2l3.4 3.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const glyph = (name, cls) => { const el = svgEl(GLYPH[name]); if (cls) el.classList.add(cls); return el; };

  // Nested asset art: a folder with a small badge (saved searches, system folders).
  function composeIcon(baseKey, badgeKey, x, y, size) {
    const S = A.ASSET_SVG || {};
    const base = S[baseKey], badge = S[badgeKey];
    if (!base || !badge) return baseKey;
    const inner = (svg, pre) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
      .replace(/id="([^"]+)"/g, `id="${pre}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${pre}$1)`);
    return svgURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${inner(base, 'b_')}<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 64 64">${inner(badge, 'g_')}</svg></svg>`);
  }

  const DRIVE_BODY = '<defs><radialGradient id="f" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b2a4a" stop-opacity=".32"/><stop offset="1" stop-color="#0b2a4a" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d0dbe6"/></linearGradient>' +
    '<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aab7c4"/><stop offset=".48" stop-color="#7c8a9a"/><stop offset=".52" stop-color="#5f6d7c"/><stop offset="1" stop-color="#46515d"/></linearGradient>' +
    '<radialGradient id="l" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f1ffe6"/><stop offset=".45" stop-color="#6ee655"/><stop offset="1" stop-color="#1f8a22"/></radialGradient>' +
    '<radialGradient id="o" cx=".5" cy="1.1" r="1.05"><stop offset="0" stop-color="#bff4ff"/><stop offset=".5" stop-color="#2cb6ea"/><stop offset="1" stop-color="#0b3d73"/></radialGradient>' +
    '<linearGradient id="d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset=".3" stop-color="#cfe8ff"/><stop offset=".5" stop-color="#ffe0f2"/><stop offset=".7" stop-color="#e0ffdc"/><stop offset="1" stop-color="#eef3f8"/></linearGradient></defs>' +
    '<ellipse cx="32" cy="55.5" rx="27" ry="3.6" fill="url(#f)"/>' +
    '<path d="M11 19h42c2 0 3.3 1 4 2.6L60.5 31h-57L7 21.6C7.7 20 9 19 11 19z" fill="url(#t)" stroke="#5a6a7b" stroke-opacity=".55"/>' +
    '<rect x="3.5" y="31" width="57" height="17" rx="3.2" fill="url(#b)" stroke="#34404c" stroke-opacity=".75"/>' +
    '<rect x="5" y="32" width="54" height="6.5" rx="2.6" fill="#fff" opacity=".35"/>';
  const ICON_HDD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${DRIVE_BODY}` +
    '<g stroke="#2a333d" stroke-opacity=".45" stroke-width="1.3" stroke-linecap="round"><path d="M9.5 41v4M12.5 41v4M15.5 41v4M18.5 41v4M21.5 41v4"/></g>' +
    '<circle cx="53" cy="42.8" r="5.5" fill="#6ee655" opacity=".22"/><circle cx="53" cy="42.8" r="2.5" fill="url(#l)"/>' +
    '<ellipse cx="32" cy="25.2" rx="8.5" ry="3.9" fill="url(#o)" stroke="#0b3d73" stroke-opacity=".4" stroke-width=".6"/>' +
    '<path d="M25 26.2c3-2.2 6.5 1.6 13-1.5" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="31" cy="23.4" rx="5.5" ry="1.5" fill="#fff" opacity=".6"/></svg>';
  const ICON_DVD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${DRIVE_BODY}` +
    '<rect x="8" y="39" width="38" height="2.4" rx="1.2" fill="#232b33" opacity=".6"/>' +
    '<rect x="49.5" y="37.6" width="7.5" height="4.6" rx="1.6" fill="#e3e9ef" stroke="#34404c" stroke-opacity=".6" stroke-width=".8"/>' +
    '<path d="M51.6 41h3.4M51.8 40l1.5-1.5 1.5 1.5" stroke="#34404c" stroke-width=".8" fill="none"/>' +
    '<ellipse cx="32" cy="25.2" rx="11" ry="4.4" fill="url(#d)" stroke="#8e9aa6" stroke-width=".7"/>' +
    '<ellipse cx="32" cy="25.2" rx="2.6" ry="1.1" fill="#b3c0cc" stroke="#8e9aa6" stroke-width=".5"/>' +
    '<path d="M24 23.6c3-1.4 7-1.8 11-1.2" stroke="#fff" stroke-width="1" fill="none" stroke-linecap="round" opacity=".9"/></svg>';
  const FOLDER_BACK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset=".55" stop-color="#f5b73a"/><stop offset="1" stop-color="#d97c10"/></linearGradient><radialGradient id="f" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b2a4a" stop-opacity=".3"/><stop offset="1" stop-color="#0b2a4a" stop-opacity="0"/></radialGradient></defs>' +
    '<ellipse cx="32" cy="60.5" rx="21" ry="3" fill="url(#f)"/><path d="M6 16Q6 12 10 12H24L29 17H54Q58 17 58 21V50Q58 54 54 54H10Q6 54 6 50Z" fill="url(#k)" stroke="#c86a0a" stroke-opacity=".55"/></svg>';
  const FLAP = 'M4.5 29Q5 26 8.2 26H55.8Q59 26 59.5 29L57.4 51Q57 54 53.6 54H10.4Q7 54 6.6 51Z';
  const FOLDER_FRONT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c0"/><stop offset=".5" stop-color="#ffd62e"/><stop offset="1" stop-color="#f08a12"/></linearGradient><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><radialGradient id="c" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".65"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    `<clipPath id="p"><path d="${FLAP}"/></clipPath></defs><path d="${FLAP}" fill="url(#g)" opacity=".95"/><g clip-path="url(#p)"><path d="M4 26H60L59 36H5Z" fill="url(#s)" opacity=".75"/><ellipse cx="32" cy="55" rx="22" ry="7" fill="url(#c)"/></g><path d="${FLAP}" fill="none" stroke="#c86a0a" stroke-opacity=".6"/></svg>`;

  const ICONS = {};
  function initIcons() {
    if (ICONS.hdd) return;
    ICONS.hdd = svgURL(ICON_HDD);
    ICONS.dvd = svgURL(ICON_DVD);
    ICONS.folderBack = svgURL(FOLDER_BACK);
    ICONS.folderFront = svgURL(FOLDER_FRONT);
    ICONS.searches = composeIcon('icons/folder', 'icons/search', 25, 24, 38);
    ICONS.recent = composeIcon('icons/folder', 'icons/clock', 25, 24, 38);
    ICONS.system = composeIcon('icons/folder', 'icons/settings', 25, 24, 38);
    ICONS.programs = composeIcon('icons/folder', 'icons/run', 25, 24, 38);
  }

  // ================================================================ shared state
  // One clipboard and one undo list for every Explorer window, like the real thing.
  const shared = { clip: { mode: null, paths: [] }, undo: [], ev: A.util.emitter() };
  function setClip(mode, paths) {
    shared.clip = { mode: paths && paths.length ? mode : null, paths: paths ? paths.slice() : [] };
    shared.ev.emit('clip');
  }
  function pushUndo(label, run) {
    shared.undo.push({ label, run });
    if (shared.undo.length > 40) shared.undo.shift();
    shared.ev.emit('undo');
  }
  function undoLast(parent) {
    const u = shared.undo.pop();
    if (!u) return;
    try { u.run(); } catch (e) { errorBox(parent, e.message, 'Undo'); }
    shared.ev.emit('undo');
  }
  function errorBox(parent, message, title) {
    return A.ui.messageBox({ parent: parent && !parent.closed ? parent : null, icon: 'error', title: title || 'Explorer', message });
  }

  // ================================================================ file operations
  function removePaths(paths, parent, o = {}) {
    const binned = [], errors = [];
    let gone = 0;
    paths.forEach((p) => {
      if (!fs.exists(p)) return;
      const inBin = p.startsWith(RECYCLE + '/');
      const binName = !inBin && !o.permanent ? fs.uniqueName(RECYCLE, fs.basename(p)) : null;
      try {
        if (fs.remove(p, { permanent: !!o.permanent })) { if (binName) binned.push(fs.join(RECYCLE, binName)); else gone++; }
      } catch (e) { errors.push(e.message); }
    });
    if (binned.length) {
      A.sound.play('recycle');
      pushUndo('Undo Delete', () => binned.slice().reverse().forEach((b) => fs.exists(b) && fs.restore(b)));
    }
    if (gone) A.sound.play('empty');
    if (errors.length) errorBox(parent, errors[0], 'Delete');
    return binned.length + gone;
  }
  // Ratings and rotation (keyed by path) travel with a picture or folder when it moves.
  function migrateMeta(from, to) {
    ['photos.ratings', 'photos.rotation'].forEach((key) => {
      const src = A.store.get(key, {}) || {};
      let changed = false;
      const out = {};
      Object.keys(src).forEach((k) => {
        const nk = k === from ? to : k.startsWith(from + '/') ? to + k.slice(from.length) : k;
        if (nk !== k) changed = true;
        out[nk] = src[k];
      });
      if (changed) A.store.set(key, out);
    });
  }
  function movePaths(paths, dest, parent) {
    dest = fs.normalize(dest);
    const moves = [], errors = [];
    paths.forEach((p) => {
      if (!fs.exists(p) || fs.dirname(p) === dest) return;
      try { const np = fs.move(p, dest); moves.push([p, np]); migrateMeta(p, np); } catch (e) { errors.push(e.message); }
    });
    if (errors.length) errorBox(parent, errors[0], 'Move');
    if (moves.length) {
      pushUndo('Undo Move', () => moves.slice().reverse().forEach(([from, to]) => {
        if (!fs.exists(to)) return;
        let back = fs.move(to, fs.dirname(from));
        migrateMeta(to, back);
        if (fs.basename(back) !== fs.basename(from) && !fs.exists(from)) back = fs.rename(back, fs.basename(from));
      }));
    }
    return moves.map((m) => m[1]);
  }
  function copyPaths(paths, dest, parent) {
    const made = [], errors = [];
    paths.forEach((p) => { try { if (fs.exists(p)) made.push(fs.copy(p, dest)); } catch (e) { errors.push(e.message); } });
    if (errors.length) errorBox(parent, errors[0], 'Copy');
    if (made.length) pushUndo('Undo Copy', () => made.forEach((m) => fs.exists(m) && fs.remove(m)));
    return made;
  }
  function renamePath(p, name, parent) {
    try {
      const np = fs.rename(p, name);
      if (np !== p) pushUndo('Undo Rename', () => fs.exists(np) && fs.rename(np, fs.basename(p)));
      return np;
    } catch (e) { errorBox(parent, e.message, 'Rename'); return null; }
  }
  function restorePaths(paths) {
    const out = [];
    paths.forEach((p) => { const r = fs.exists(p) ? fs.restore(p) : null; if (r) out.push(r); });
    if (out.length) {
      A.sound.play('pop');
      pushUndo('Undo Restore', () => out.forEach((r) => fs.exists(r) && fs.remove(r)));
    }
    return out;
  }
  async function emptyBin(parent) {
    const n = fs.recycleCount();
    if (!n) return false;
    const r = await A.ui.messageBox({
      parent, icon: 'warning', title: n === 1 ? 'Delete File' : 'Delete Multiple Items',
      instruction: n === 1 ? 'Are you sure you want to permanently delete this item?' : `Are you sure you want to permanently delete these ${n} items?`,
      message: 'Once the Recycle Bin is empty, these items are gone for good.',
      buttons: [{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no', cancel: true }],
    });
    if (r !== 'yes') return false;
    fs.emptyRecycleBin();
    A.sound.play('empty');
    return true;
  }
  function createShortcut(targetPath, dir) {
    const name = fs.uniqueName(dir, labelFor(fs.basename(targetPath)) + ' - Shortcut.lnk');
    const p = fs.write(fs.join(dir, name), 'file:' + targetPath, { mime: 'application/x-aerium-link' });
    pushUndo('Undo New', () => fs.exists(p) && fs.remove(p, { permanent: true }));
    return p;
  }
  function setWallpaper(path) {
    A.theme.setWallpaper('file:' + path, 'fill');
    A.notify({ title: 'Desktop background changed', text: labelFor(fs.basename(path)) + ' is now your desktop background.', icon: 'icons/personalize', timeout: 3500, sound: false });
  }

  // ================================================================ columns and views
  const COLS = {
    name: { label: 'Name', width: 240, get: (it) => it.name, text: (it) => it.name },
    modified: { label: 'Date modified', width: 140, get: (it) => it.modified || 0, text: (it) => fmtDT(it.modified) },
    type: { label: 'Type', width: 130, get: (it) => it.typeName || '', text: (it) => it.typeName || '' },
    size: { label: 'Size', width: 84, align: 'right', get: (it) => (it.isFolder || it.size == null ? -1 : it.size), text: (it) => (it.isFolder || it.size == null ? '' : kb(it.size)) },
    location: { label: 'Folder', width: 180, get: (it) => it.location || '', text: (it) => prettyPath(it.location) },
    origin: { label: 'Original Location', width: 170, get: (it) => (it.origin ? fs.dirname(it.origin) : ''), text: (it) => (it.origin ? prettyPath(fs.dirname(it.origin)) : '') },
    deleted: { label: 'Date Deleted', width: 140, get: (it) => it.deleted || 0, text: (it) => fmtDT(it.deleted) },
    artist: { label: 'Artists', width: 150, get: (it) => (it.track && it.track.artist) || '', text: (it) => (it.track && it.track.artist) || '' },
    album: { label: 'Album', width: 130, get: (it) => (it.track && it.track.album) || '', text: (it) => (it.track && it.track.album) || '' },
    length: { label: 'Length', width: 64, align: 'right', get: (it) => (it.track && it.track.duration) || 0, text: (it) => (it.track && it.track.duration ? A.util.fmtDuration(it.track.duration) : '') },
    total: { label: 'Total Size', width: 100, align: 'right', get: (it) => it.total || 0, text: (it) => (it.total ? A.util.fmtBytes(it.total) : '') },
    free: { label: 'Free Space', width: 100, align: 'right', get: (it) => it.free || 0, text: (it) => (it.free != null ? A.util.fmtBytes(it.free) : '') },
  };
  const COLSETS = {
    standard: ['name', 'modified', 'type', 'size'],
    music: ['name', 'artist', 'album', 'length', 'size'],
    recycle: ['name', 'origin', 'deleted', 'size', 'type'],
    search: ['name', 'location', 'modified', 'type', 'size'],
    computer: ['name', 'type', 'total', 'free'],
    programs: ['name', 'type', 'size', 'modified'],
  };
  const STOPS = [
    { id: 'xl', label: 'Extra Large Icons', mode: 'icons', size: 176 },
    { id: 'large', label: 'Large Icons', mode: 'icons', size: 96 },
    { id: 'medium', label: 'Medium Icons', mode: 'icons', size: 48 },
    { id: 'small', label: 'Small Icons', mode: 'small' },
    { id: 'list', label: 'List', mode: 'list' },
    { id: 'details', label: 'Details', mode: 'details' },
    { id: 'tiles', label: 'Tiles', mode: 'tiles' },
  ];
  const ICON_MIN = 40, ICON_MAX = 176;
  const DEFAULT_VIEWS = {
    pictures: { mode: 'icons', size: 96 }, videos: { mode: 'icons', size: 96 }, root: { mode: 'icons', size: 96 },
    music: { mode: 'details' }, documents: { mode: 'tiles' }, generic: { mode: 'icons', size: 48 },
  };
  function stopOf(v) {
    if (v.mode !== 'icons') return v.mode;
    return v.size >= 136 ? 'xl' : v.size >= 72 ? 'large' : 'medium';
  }
  // Slider position (0..6) for a view: icon sizes slide continuously between the first three stops.
  function viewToPos(v) {
    if (v.mode === 'icons') {
      if (v.size >= 96) return clamp((176 - v.size) / 80, 0, 1);
      return clamp(1 + (96 - v.size) / 48, 1, 2);
    }
    return STOPS.findIndex((s) => s.mode === v.mode);
  }
  function posToView(pos, snap) {
    if (pos <= 2 && !snap) {
      const size = pos <= 1 ? 176 - pos * 80 : 96 - (pos - 1) * 48;
      return { mode: 'icons', size: Math.round(size) };
    }
    const st = STOPS[clamp(Math.round(pos), 0, 6)];
    return { mode: st.mode, size: st.size };
  }

  // ================================================================ locations
  // A location is a string: a VFS folder path, or one of the virtual places
  // below. resolve() turns it into a description the window can render.
  function vfsCrumbs(p) {
    p = fs.normalize(p);
    if (p === RECYCLE || p.startsWith(RECYCLE + '/')) return [{ label: 'Recycle Bin', loc: RECYCLE }];
    const out = [{ label: userName(), loc: '/' }];
    if (p === '/') return out;
    const parts = p.slice(1).split('/');
    parts.forEach((seg, i) => out.push({ label: seg, loc: '/' + parts.slice(0, i + 1).join('/') }));
    return out;
  }
  function childrenOf(loc) {
    if (loc === 'computer') return [{ label: DRIVE_C, loc: 'drive:c', icon: ICONS.hdd }, { label: DRIVE_D, loc: 'dvd:d', icon: ICONS.dvd }];
    if (loc === 'drive:c') {
      return [
        { label: 'Aerium', loc: 'drive:c/Aerium', icon: ICONS.system },
        { label: 'Program Files', loc: 'drive:c/Program Files', icon: ICONS.programs },
        { label: 'Users', loc: 'drive:c/Users', icon: 'icons/folder-user' },
      ];
    }
    if (loc === 'drive:c/Users') return [{ label: userName(), loc: '/', icon: 'icons/folder-user' }];
    if (typeof loc === 'string' && loc.startsWith('/') && fs.isDir(loc) && loc !== RECYCLE) {
      const out = fs.list(loc).filter((it) => it.type === 'folder' && it.path !== RECYCLE)
        .map((it) => ({ label: it.name, loc: it.path, icon: fs.iconFor(it.path) }));
      if (fs.normalize(loc) === '/') out.push({ label: 'Searches', loc: 'searches', icon: ICONS.searches });
      return out;
    }
    return [];
  }
  const treeRoots = () => [
    { label: userName(), loc: '/', icon: 'icons/folder-user' },
    { label: 'Computer', loc: 'computer', icon: 'icons/computer' },
    { label: 'Recycle Bin', loc: RECYCLE, icon: fs.iconFor(RECYCLE) },
  ];
  const rootPlaces = () => [
    { label: 'Desktop', loc: '/Desktop', icon: 'icons/folder-desktop' },
    { label: userName(), loc: '/', icon: 'icons/folder-user' },
    { label: 'Computer', loc: 'computer', icon: 'icons/computer' },
    { label: 'Recycle Bin', loc: RECYCLE, icon: fs.iconFor(RECYCLE) },
  ];
  const isDropLoc = (loc) => typeof loc === 'string' && loc.startsWith('/') && fs.isDir(loc);

  function folderType(p) {
    p = fs.normalize(p);
    if (p === '/') return 'root';
    const top = p.split('/')[1] || '';
    if (top === 'Pictures') return 'pictures';
    if (top === 'Music') return 'music';
    if (top === 'Videos') return 'videos';
    if (top === 'Documents') return 'documents';
    const files = fs.list(p).filter((f) => f.type === 'file');
    if (files.length) {
      if (files.filter((f) => isPic(f.path)).length / files.length >= 0.5) return 'pictures';
      if (files.filter((f) => isMusic(f.path)).length / files.length >= 0.5) return 'music';
    }
    return 'generic';
  }

  // The shared VFS names a couple of types after a real product; keep the UI original.
  const typeNameOf = (p) => String(fs.typeName(p) || '').replace(/^Windows Media /, 'Media ');
  function vfsItem(st) {
    const isFolder = st.type === 'folder';
    const it = {
      key: st.path, path: st.path, loc: isFolder ? st.path : null, isFolder,
      kind: isFolder ? 'folder' : 'file',
      name: isFolder ? st.name : labelFor(st.name), fullName: st.name,
      icon: fs.iconFor(st.path), thumb: isFolder ? null : fs.thumbFor(st.path),
      ext: st.ext, size: st.size, modified: st.modified, typeName: typeNameOf(st.path),
      readonly: st.readonly, meta: st.meta, shortcut: st.ext === 'lnk',
    };
    if (it.shortcut) {
      const target = String(fs.read(st.path) || '');
      if (target.startsWith('file:')) {
        const tp = target.slice(5);
        it.icon = fs.iconFor(tp);
        it.thumb = fs.thumbFor(tp);
        it.target = tp;
      }
    }
    if (!isFolder && isMusic(st.path)) it.track = trackFor(st.path);
    return it;
  }
  function virtFolder(c) {
    return { key: c.loc, loc: c.loc, isFolder: true, kind: 'vfolder', name: c.label, fullName: c.label, icon: c.icon, typeName: 'File Folder', modified: BUILD_DATE };
  }

  const SYSTEM_FILES = [
    ['bubbles.dll', 'icons/bubble', 'Application extension', 348160],
    ['glass.sys', 'icons/settings', 'System file', 1261568],
    ['fish.drv', 'icons/fish', 'Device driver', 77824],
    ['aurora.scr', 'icons/monitor', 'Screen saver', 524288],
    ['startup.wav', 'icons/speaker', 'Wave Sound', 1167360],
    ['sparkle.cur', 'icons/star', 'Cursor', 4286],
    ['nostalgia.dat', 'icons/heart', 'DAT File', 2007],
    ['desktop.ini', 'icons/document', 'Configuration settings', 282],
  ];

  function base(extra) {
    return Object.assign({ kind: 'folder', path: null, parent: null, canCreate: false, canPaste: false, searchScope: '/', columns: COLSETS.standard, empty: 'This folder is empty.', defaultView: DEFAULT_VIEWS.generic, defaultSort: { key: 'name', dir: 1 } }, extra);
  }

  function resolve(loc) {
    if (loc == null || loc === '') loc = '/';
    loc = String(loc);
    if (/^computer$/i.test(loc)) return computerLoc();
    if (loc === 'recent') return recentLoc();
    if (loc === 'recent:files') return recentFilesLoc();
    if (loc === 'searches') return searchesLoc();
    if (loc.startsWith('search:')) return searchLoc(loc);
    if (loc.startsWith('drive:c')) return driveLoc(loc);
    const p = fs.normalize(loc);
    if (!fs.isDir(p)) return null;
    if (p === RECYCLE) return recycleLoc();
    return folderLoc(p);
  }

  function folderLoc(p) {
    const type = folderType(p);
    return base({
      loc: p, kind: p === '/' ? 'root' : 'folder', path: p,
      title: p === '/' ? userName() : fs.basename(p),
      icon: p === '/' ? 'icons/folder-user' : fs.iconFor(p),
      crumbs: vfsCrumbs(p), parent: p === '/' ? null : fs.dirname(p),
      folderType: type, canCreate: true, canPaste: true, searchScope: p,
      columns: type === 'music' ? COLSETS.music : COLSETS.standard,
      viewKey: p, defaultView: DEFAULT_VIEWS[type] || DEFAULT_VIEWS.generic,
      items: () => fs.list(p).filter((st) => st.path !== RECYCLE).map(vfsItem),
    });
  }
  function recycleLoc() {
    return base({
      loc: RECYCLE, kind: 'recycle', path: RECYCLE, title: 'Recycle Bin', icon: fs.iconFor(RECYCLE),
      crumbs: [{ label: 'Recycle Bin', loc: RECYCLE }], folderType: 'recycle', searchScope: RECYCLE,
      columns: COLSETS.recycle, viewKey: RECYCLE, defaultView: { mode: 'details' },
      defaultSort: { key: 'deleted', dir: -1 }, empty: 'The Recycle Bin is empty.',
      items: () => fs.list(RECYCLE).map((st) => Object.assign(vfsItem(st), {
        loc: null, recycled: true, origin: st.meta && st.meta.origin, deleted: st.meta && st.meta.deleted,
        name: labelFor(st.meta && st.meta.origin ? fs.basename(st.meta.origin) : st.name),
      })),
    });
  }
  function computerLoc() {
    return base({
      loc: 'computer', kind: 'computer', title: 'Computer', icon: 'icons/computer',
      crumbs: [{ label: 'Computer', loc: 'computer' }], folderType: 'computer',
      columns: COLSETS.computer, viewKey: 'computer', defaultView: { mode: 'tiles' }, grouped: true,
      items: () => {
        const cap = fs.capacity, used = Math.min(cap, fs.used());
        return [
          { key: 'drive:c', loc: 'drive:c', isFolder: true, kind: 'drive', name: DRIVE_C, fullName: DRIVE_C, icon: ICONS.hdd, group: 'Hard Disk Drives', typeName: 'Local Disk', total: cap, free: cap - used, used },
          { key: 'dvd:d', loc: 'dvd:d', isFolder: true, kind: 'dvd', name: DRIVE_D, fullName: DRIVE_D, icon: ICONS.dvd, group: 'Devices with Removable Storage', typeName: 'CD Drive' },
        ];
      },
    });
  }
  function driveLoc(loc) {
    const sub = loc.slice(7).replace(/^\/+/, '');
    const crumbs = [{ label: 'Computer', loc: 'computer' }, { label: DRIVE_C, loc: 'drive:c' }];
    if (!sub) {
      return base({ loc: 'drive:c', kind: 'virtual', title: DRIVE_C, icon: ICONS.hdd, crumbs, parent: 'computer', folderType: 'drive', viewKey: 'drive:c', defaultView: { mode: 'icons', size: 48 }, items: () => childrenOf('drive:c').map(virtFolder) });
    }
    if (sub === 'Program Files') {
      return base({
        loc, kind: 'virtual', title: 'Program Files', icon: ICONS.programs, crumbs: crumbs.concat({ label: 'Program Files', loc }), parent: 'drive:c',
        folderType: 'programs', columns: COLSETS.programs, viewKey: loc, defaultView: { mode: 'tiles' },
        items: () => A.apps.list().map((app) => ({
          key: 'app:' + app.id, kind: 'app', name: app.name, fullName: app.name, icon: app.icon, typeName: 'Application',
          size: 180000 + (hashNum(app.id) % 8800000), modified: BUILD_DATE, appId: app.id, description: app.description,
          open: () => A.apps.launch(app.id),
        })),
      });
    }
    if (sub === 'Users') {
      return base({ loc, kind: 'virtual', title: 'Users', icon: 'icons/folder-user', crumbs: crumbs.concat({ label: 'Users', loc }), parent: 'drive:c', folderType: 'users', viewKey: loc, defaultView: { mode: 'icons', size: 96 }, items: () => childrenOf(loc).map(virtFolder) });
    }
    if (sub === 'Aerium') {
      return base({
        loc, kind: 'virtual', title: 'Aerium', icon: ICONS.system, crumbs: crumbs.concat({ label: 'Aerium', loc }), parent: 'drive:c',
        folderType: 'system', viewKey: loc, defaultView: { mode: 'icons', size: 48 }, hiddenUntilShown: true,
        items: () => SYSTEM_FILES.map(([name, icon, type, size]) => ({ key: 'sys:' + name, kind: 'sysfile', name, fullName: name, icon, typeName: type, size, modified: BUILD_DATE })),
      });
    }
    return null;
  }
  function withLocation(st) { return Object.assign(vfsItem(st), { location: fs.dirname(st.path) }); }
  function recentLoc() {
    return base({
      loc: 'recent', kind: 'search', title: 'Recently Changed', icon: ICONS.recent,
      crumbs: [{ label: 'Searches', loc: 'searches' }, { label: 'Recently Changed', loc: 'recent' }], parent: 'searches',
      folderType: 'search', columns: COLSETS.search, viewKey: 'recent', defaultView: { mode: 'details' },
      defaultSort: { key: 'modified', dir: -1 }, empty: 'Nothing has changed lately.',
      items: () => {
        const out = [];
        walk('/', (st) => { if (st.type === 'file') out.push(st); });
        out.sort((a, b) => b.modified - a.modified);
        return out.slice(0, 60).map(withLocation);
      },
    });
  }
  function recentFilesLoc() {
    return base({
      loc: 'recent:files', kind: 'search', title: 'Recent Documents', icon: ICONS.searches,
      crumbs: [{ label: 'Searches', loc: 'searches' }, { label: 'Recent Documents', loc: 'recent:files' }], parent: 'searches',
      folderType: 'search', columns: COLSETS.search, viewKey: 'recent:files', defaultView: { mode: 'details' },
      defaultSort: { key: 'modified', dir: -1 }, empty: 'Files you open will show up here.',
      items: () => (A.store.get('recent.files') || []).filter((p) => fs.exists(p) && !fs.isDir(p) && !p.startsWith(RECYCLE + '/')).map((p) => withLocation(fs.stat(p))),
    });
  }
  const BUILTIN_SEARCHES = () => [
    { name: 'Recent Documents', loc: 'recent:files' },
    { name: 'Recently Changed', loc: 'recent', icon: ICONS.recent },
    { name: 'All Pictures', loc: searchKey('/', 'kind:pictures') },
    { name: 'All Music', loc: searchKey('/', 'kind:music') },
    { name: 'All Videos', loc: searchKey('/', 'kind:videos') },
  ];
  const searchKey = (scope, q) => 'search:' + encodeURIComponent(scope || '/') + '?' + encodeURIComponent(q);
  function searchesLoc() {
    return base({
      loc: 'searches', kind: 'searches', title: 'Searches', icon: ICONS.searches,
      crumbs: [{ label: userName(), loc: '/' }, { label: 'Searches', loc: 'searches' }], parent: '/',
      folderType: 'searches', viewKey: 'searches', defaultView: { mode: 'icons', size: 48 },
      items: () => {
        const saved = (A.store.get('explorer.searches', []) || []).map((s, i) => ({ name: s.name, loc: searchKey(s.scope, s.q), saved: i }));
        return BUILTIN_SEARCHES().concat(saved).map((s) => ({
          key: 'ss:' + s.name + ':' + s.loc, loc: s.loc, isFolder: true, kind: 'search', name: s.name, fullName: s.name,
          icon: s.icon || ICONS.searches, typeName: 'Saved Search', modified: BUILD_DATE, saved: s.saved,
        }));
      },
    });
  }
  function makeMatcher(q) {
    let kind = null;
    q = String(q || '').replace(/\bkind:(\w+)/i, (_, k) => { kind = k.toLowerCase(); return ''; }).trim();
    let test;
    if (!q) test = () => true;
    else if (/[*?]/.test(q)) {
      const re = new RegExp('^' + q.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
      test = (st) => re.test(st.name);
    } else {
      const n = q.toLowerCase();
      test = (st) => st.name.toLowerCase().includes(n) || (st.type === 'file' && isText(st.path) && String(fs.read(st.path) || '').toLowerCase().includes(n));
    }
    const KINDS = { picture: isPic, pictures: isPic, photo: isPic, photos: isPic, music: isMusic, song: isMusic, songs: isMusic, video: isVideo, videos: isVideo, document: (p) => isText(p) || ['doc', 'rtf', 'htm', 'html'].includes(fs.ext(p)), documents: (p) => isText(p) || ['doc', 'rtf', 'htm', 'html'].includes(fs.ext(p)) };
    return (st) => {
      if (kind) {
        if (kind === 'folder' || kind === 'folders') { if (st.type !== 'folder') return false; }
        else { const fn = KINDS[kind]; if (!fn || st.type !== 'file' || !fn(st.path)) return false; }
      }
      return test(st);
    };
  }
  function searchLoc(loc) {
    const m = /^search:([^?]*)\?(.*)$/.exec(loc);
    if (!m) return null;
    let scope, q;
    try { scope = fs.normalize(decodeURIComponent(m[1]) || '/'); q = decodeURIComponent(m[2]); } catch (e) { return null; }
    if (!fs.isDir(scope)) scope = '/';
    const scopeTitle = prettyPath(scope) === scope ? fs.basename(scope) : prettyPath(scope);
    const title = 'Search Results in ' + scopeTitle;
    return base({
      loc, kind: 'search', title, icon: ICONS.searches, crumbs: [{ label: title, loc }], parent: scope, query: q, scope,
      folderType: 'search', searchScope: scope, columns: COLSETS.search, viewKey: 'search', defaultView: { mode: 'details' },
      empty: 'No items match your search.',
      items: () => {
        const match = makeMatcher(q);
        const out = [];
        walk(scope, (st) => { if (match(st)) out.push(withLocation(st)); }, scope !== RECYCLE);
        return out;
      },
    });
  }
  function addressText(L) {
    if (!L) return '';
    if (L.path) return L.path === RECYCLE ? 'Recycle Bin' : L.path;
    if (L.loc === 'drive:c') return 'C:\\';
    if (L.loc.startsWith('drive:c/')) return 'C:\\' + L.loc.slice(8);
    return L.title;
  }
  function sortItems(list, sort) {
    const col = COLS[sort.key] || COLS.name;
    const cmp = (a, b) => {
      const fa = a.isFolder ? 0 : 1, fb = b.isFolder ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const va = col.get(a), vb = col.get(b);
      let c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
      if (!c) c = String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' });
      return c;
    };
    const out = list.slice().sort(cmp);
    return sort.dir < 0 ? out.reverse() : out;
  }
  function loadView(L) {
    const all = A.store.get('explorer.views', {}) || {};
    const v = all[L.viewKey] || {};
    const d = L.defaultView || DEFAULT_VIEWS.generic;
    return {
      mode: v.mode || d.mode, size: clamp(v.size || d.size || 48, ICON_MIN, ICON_MAX),
      sort: v.sort && COLS[v.sort.key] ? v.sort : Object.assign({}, L.defaultSort || { key: 'name', dir: 1 }),
      widths: v.widths || {},
    };
  }
  function saveView(L, view) {
    const all = Object.assign({}, A.store.get('explorer.views', {}) || {});
    delete all[L.viewKey];
    all[L.viewKey] = { mode: view.mode, size: view.size, sort: view.sort, widths: view.widths };
    const keys = Object.keys(all);
    if (keys.length > 80) keys.slice(0, keys.length - 80).forEach((k) => delete all[k]);
    A.store.set('explorer.views', all);
  }

  // ================================================================ jokes and small dialogs
  function discJoke(parent, tries = 0) {
    const lines = [
      'The tray is empty. A mix CD would be perfect, or a blank disc if you want to burn your playlist.',
      'Still nothing in there. Maybe the disc is in its case under your bed.',
      'The drive checked again, very carefully. It is definitely still empty.',
    ];
    A.ui.messageBox({
      parent, title: DRIVE_D, icon: ICONS.dvd, instruction: 'Please insert a disc into drive D:', message: lines[Math.min(tries, lines.length - 1)],
      buttons: [{ label: 'Eject', value: 'eject' }, { label: 'Try Again', value: 'retry', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }],
    }).then((r) => {
      if (r === 'retry') setTimeout(() => discJoke(parent, tries + 1), 350);
      else if (r === 'eject') {
        A.sound.play('click');
        A.ui.messageBox({ parent, title: DRIVE_D, icon: ICONS.dvd, instruction: 'The tray is open', message: 'It makes a very convincing cup holder, but please use a coaster.', sound: false });
      }
    });
  }
  const jokes = {
    share: (parent) => A.ui.messageBox({ parent, title: 'File Sharing', icon: 'icons/users', instruction: 'Share with people on your network', message: 'Sharing is ready, but nobody else is on your network right now. Try again when your friends come over with their laptops.' }),
    email: (parent, n) => A.ui.messageBox({ parent, title: 'E-mail', icon: 'icons/mail', instruction: 'Send ' + (n === 1 ? 'this file' : 'these files') + ' by e-mail', message: 'Aerium Mail is not set up yet. You could print them out and mail them to Grandma instead. She would love that.' }),
    burn: (parent) => A.ui.messageBox({ parent, title: 'Burn to Disc', icon: ICONS.dvd, instruction: 'Insert a blank disc', message: 'Put a blank CD or DVD in ' + DRIVE_D + ' to burn your files. Do not forget to label it with a marker.' }),
    print: (parent) => A.ui.messageBox({ parent, title: 'Print', icon: 'warning', instruction: 'No printers are installed', message: 'Before you can print, you need to add a printer. The one in the den is out of cyan anyway.' }),
    removeProps: (parent, n) => A.ui.messageBox({ parent, title: 'Remove Properties', icon: 'success', instruction: 'Your files are a little more mysterious now', message: `Aerium removed the author, the camera model and every embarrassing tag from ${plural(n, 'item')}. Nobody will ever know.` }),
    mapDrive: (parent) => A.ui.messageBox({ parent, title: 'Map Network Drive', icon: 'icons/network', instruction: 'No network folders were found', message: 'Aerium looked everywhere. The computer upstairs is not sharing anything today.' }),
    uninstall: (parent) => A.ui.messageBox({
      parent, title: 'Programs', icon: 'icons/settings', instruction: 'Everything here is worth keeping',
      message: 'Every program on this computer was picked for fun, so there is nothing to uninstall. You can still tidy up the Start menu.',
      buttons: [{ label: 'Open Control Panel', value: 'cp' }, { label: 'Close', value: 'close', default: true, cancel: true }],
    }).then((r) => { if (r === 'cp') A.apps.launch('controlpanel'); }),
    format: (parent) => A.ui.messageBox({ parent, title: 'Format ' + DRIVE_C, icon: 'warning', instruction: 'You cannot format this drive', message: DRIVE_C + ' is where Aerium lives. Formatting it would be like pulling the rug out from under yourself.' }),
    sysfile: (parent, name) => A.ui.messageBox({ parent, title: name, icon: 'shield', instruction: 'This file helps Aerium run smoothly', message: 'It is best left alone. The fish are counting on you.' }),
    previous: (parent) => A.ui.messageBox({ parent, title: 'Restore Previous Versions', icon: 'info', instruction: 'There are no previous versions available', message: 'Aerium keeps things fresh. Every version of this item is the newest one.' }),
  };
  async function runAsAdmin(parent, app) {
    if (typeof A.ui.uac === 'function') {
      if (await A.ui.uac({ program: app.name, icon: app.icon, publisher: 'Aerium Playground' })) A.apps.launch(app.appId);
      return;
    }
    const r = await A.ui.messageBox({
      parent, title: 'User Account Control', icon: 'shield',
      instruction: 'Do you want to allow this program to make changes to this computer?',
      message: 'Program name: ' + app.name + '\nVerified publisher: Aerium',
      buttons: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no', default: true, cancel: true }],
    });
    if (r === 'yes') A.apps.launch(app.appId);
  }
  async function diskCleanup(parent) {
    const bar = A.ui.progress({ marquee: true, tone: 'aqua', label: 'Calculating' });
    const content = h('div.ex-cleanup', null,
      h('div.ex-cleanup-row', null, A.img(ICONS.hdd), h('div', null,
        h('div.ex-cleanup-title', null, 'Disk Cleanup is calculating how much space you can free on ' + DRIVE_C + '.'),
        h('div.ae-muted', null, 'This may take a few moments.'))), bar);
    let done = false;
    const pending = A.ui.dialog({ parent, title: 'Disk Cleanup', icon: ICONS.hdd, content, width: 400, buttons: [{ label: 'Cancel', cancel: true, value: 'cancel' }] });
    const t = setTimeout(() => {
      done = true;
      const d = A.wm.windows.find((w) => w.parent === parent && w.el.contains(content));
      if (d) d.close(true);
      A.ui.messageBox({ parent, title: 'Disk Cleanup', icon: 'success', instruction: 'Your disk is already sparkling', message: 'Disk Cleanup found 0 bytes to clean up on ' + DRIVE_C + '. The fish keep it tidy.' });
    }, 2600);
    await pending;
    if (!done) clearTimeout(t);
  }

  // 3D pie chart for drive properties, drawn with SVG.
  function pieSVG(frac) {
    const cx = 70, cy = 34, rx = 62, ry = 27, dep = 14;
    const P = (a, dy = 0) => (cx + rx * Math.cos(a)).toFixed(2) + ' ' + (cy + dy + ry * Math.sin(a)).toFixed(2);
    const TAU = Math.PI * 2;
    const start = -Math.PI / 2, end = start + TAU * clamp(frac, 0.002, 0.998);
    const slice = (a0, a1) => `M${cx} ${cy}L${P(a0)}A${rx} ${ry} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${P(a1)}Z`;
    const band = (a0, a1) => `M${P(a0)}A${rx} ${ry} 0 0 1 ${P(a1)}L${P(a1, dep)}A${rx} ${ry} 0 0 0 ${P(a0, dep)}Z`;
    // Visible side is the front half (angles 0..PI). Clip each slice to it.
    const sides = (a0, a1, cls) => {
      let out = '';
      for (const off of [-TAU, 0, TAU]) {
        const s0 = Math.max(a0 + off, 0), s1 = Math.min(a1 + off, Math.PI);
        if (s1 > s0 + 0.001) out += `<path class="${cls}" d="${band(s0, s1)}"/>`;
      }
      return out;
    };
    return `<svg viewBox="0 0 140 80" class="ex-pie" aria-hidden="true">` +
      sides(start, end, 'ex-pie-used-side') + sides(end, start + TAU, 'ex-pie-free-side') +
      `<path class="ex-pie-used" d="${slice(start, end)}"/><path class="ex-pie-free" d="${slice(end, start + TAU)}"/>` +
      `<ellipse cx="${cx - 8}" cy="${cy - 10}" rx="${rx * 0.62}" ry="${ry * 0.34}" fill="#fff" opacity=".28"/></svg>`;
  }

  // ================================================================ properties
  function propertiesDialog(parent, list, L) {
    if (!list.length) list = [locationAsItem(L)];
    if (list.length === 1) {
      const it = list[0];
      if (it.kind === 'computer-root') { A.apps.launch('system'); return; }
      if (it.kind === 'drive') return driveProperties(parent, it);
      if (it.kind === 'dvd') {
        A.ui.messageBox({ parent, title: DRIVE_D + ' Properties', icon: ICONS.dvd, instruction: DRIVE_D, message: 'Type: CD Drive\nFile system: None\nThere is no disc in the drive.' });
        return;
      }
      if (it.kind === 'recycle-root') {
        let size = 0;
        fs.list(RECYCLE).forEach((st) => (size += st.size || 0));
        A.ui.messageBox({ parent, title: 'Recycle Bin Properties', icon: fs.iconFor(RECYCLE), instruction: 'Recycle Bin', message: `Location: ${DRIVE_C}\nItems: ${fs.recycleCount()}\nSize: ${A.util.fmtBytes(size)}\nMaximum size: 8,192 MB` });
        return;
      }
      return itemProperties(parent, it);
    }
    return multiProperties(parent, list);
  }
  function locationAsItem(L) {
    if (L.kind === 'computer') return { kind: 'computer-root' };
    if (L.kind === 'recycle') return { kind: 'recycle-root' };
    if (L.path) return Object.assign(vfsItem(fs.stat(L.path)), { name: L.title, icon: L.icon });
    return { kind: 'virtual-root', name: L.title, icon: L.icon, typeName: L.kind === 'search' ? 'Saved Search' : 'System Folder', modified: BUILD_DATE, isFolder: true };
  }
  function propRows(rows) {
    return h('table.ex-props-table', null, rows.filter(Boolean).map((r) => (r === '-' ? h('tr.ex-props-sep', null, h('td', { colSpan: 2 }, h('div.ae-hr'))) : h('tr', null, h('td', null, r[0]), h('td', null, r[1])))));
  }
  function propsHead(icon, name, editable) {
    const input = h('input.ae-input.ex-props-name', { value: name, readOnly: !editable, spellcheck: false });
    return { el: h('div.ex-props-head', null, A.img(icon), input), input };
  }
  function folderCounts(p) {
    let files = 0, folders = 0;
    walk(p, (st) => (st.type === 'folder' ? folders++ : files++), p !== RECYCLE);
    return { files, folders };
  }
  function itemProperties(parent, it) {
    const path = it.path;
    const st = path ? fs.stat(path) : null;
    const editable = !!(path && !it.recycled && path !== '/' && !(fs.dirname(path) === '/' && fs.special[path]));
    const head = propsHead(it.icon, it.recycled ? it.name : (path ? fs.basename(path) || it.name : it.name), editable);
    const size = st ? st.size : it.size || 0;
    const onDisk = Math.ceil(size / 4096) * 4096;
    const appId = path && !it.isFolder ? A.apps.appForExt(it.ext) : null;
    const app = appId ? A.apps.get(appId) : null;
    const rows = [];
    if (it.isFolder && path) {
      const c = folderCounts(path);
      rows.push(['Type:', path === '/' ? 'System Folder' : 'File Folder'], ['Location:', prettyPath(fs.dirname(path))], ['Size:', bytesLong(size)], ['Size on disk:', bytesLong(onDisk)], ['Contains:', `${plural(c.files, 'File')}, ${plural(c.folders, 'Folder')}`], '-', ['Modified:', fmtDT(st && st.modified)]);
    } else if (path) {
      rows.push(['Type of file:', it.typeName + (it.ext ? ` (.${it.ext})` : '')]);
      if (app) rows.push(['Opens with:', h('span.ex-props-app', null, A.img(app.icon), app.name)]);
      if (it.shortcut) rows.push(['Target:', it.target ? prettyPath(it.target) : String(fs.read(path) || '').replace(/^app:/, '') + '.exe']);
      rows.push('-', ['Location:', it.recycled ? 'Recycle Bin' : prettyPath(fs.dirname(path))], ['Size:', bytesLong(size)], ['Size on disk:', bytesLong(onDisk)], '-');
      if (it.recycled) rows.push(['Original location:', prettyPath(it.origin ? fs.dirname(it.origin) : '')], ['Date deleted:', fmtDT(it.deleted)]);
      rows.push(['Modified:', fmtDT(st && st.modified)], ['Accessed:', 'Today, ' + A.util.fmtTime(new Date())]);
    } else {
      rows.push(['Type:', it.typeName || 'System Folder']);
      if (it.size) rows.push(['Size:', bytesLong(it.size)]);
      if (it.description) rows.push(['Description:', it.description]);
      rows.push(['Modified:', fmtDT(it.modified || BUILD_DATE)]);
    }
    const attrs = h('div.ex-props-attrs', null, h('span', null, 'Attributes:'),
      A.ui.checkbox({ label: 'Read-only', checked: !!(st && st.readonly) || !path }), A.ui.checkbox({ label: 'Hidden', checked: false }));
    attrs.querySelectorAll('input').forEach((i) => (i.disabled = true));
    const general = h('div.ex-props', null, head.el, h('div.ae-hr'), propRows(rows), h('div.ae-hr'), attrs);
    const tabs = [{ id: 'general', label: 'General', content: general }];
    if (path && !it.isFolder && (isPic(path) || isMusic(path))) tabs.push({ id: 'details', label: 'Details', content: () => detailsTab(it) });
    tabs.push({ id: 'prev', label: 'Previous Versions', content: () => h('div.ex-props.ex-props-prev', null, A.img('icons/sync'), h('div', null, h('p', null, 'Previous versions come from restore points that Aerium saves automatically.'), h('p.ae-muted', null, 'There are no previous versions available.'))) });
    const content = A.ui.tabs({ tabs, className: 'ex-props-tabs' });
    A.ui.dialog({
      parent, title: (it.recycled ? it.name : it.name || fs.basename(path)) + ' Properties', icon: it.icon, content, width: 400,
      buttons: [
        { label: 'OK', default: true, value: 'ok', onClick: () => {
          const v = head.input.value.trim();
          if (editable && v && v !== fs.basename(path)) renamePath(path, v, parent);
        } },
        { label: 'Cancel', cancel: true, value: null },
      ],
    });
  }
  function detailsTab(it) {
    const rows = [];
    const box = h('div.ex-props');
    if (isPic(it.path)) {
      const dims = h('span', null, '...');
      rows.push(['Dimensions:', dims], ['Rating:', starsEl(it.path)], ['Rotation:', (rotationOf(it.path) || 0) + '°'], ['Taken:', fmtDT(it.modified)], ['Camera:', 'Aerium Glass Cam 5000']);
      const url = fs.thumbFor(it.path);
      if (url) A.util.loadImage(url).then((im) => { dims.textContent = im.naturalWidth + ' x ' + im.naturalHeight; }).catch(() => { dims.textContent = 'Unknown'; });
    } else if (it.track) {
      const t = it.track;
      rows.push(['Title:', t.title || ''], ['Contributing artists:', t.artist || ''], ['Album:', t.album || ''], ['Year:', String(t.year || '')], ['Genre:', t.genre || ''], ['Length:', t.duration ? A.util.fmtDuration(t.duration) : ''], ['Bit rate:', '192kbps']);
    }
    box.appendChild(propRows(rows));
    return box;
  }
  function multiProperties(parent, list) {
    const paths = list.filter((it) => it.path).map((it) => it.path);
    let size = 0, files = 0, folders = 0;
    paths.forEach((p) => {
      const st = fs.stat(p);
      if (!st) return;
      size += st.size || 0;
      if (st.type === 'folder') { folders++; const c = folderCounts(p); files += c.files; folders += c.folders; } else files++;
    });
    const types = new Set(list.map((it) => it.typeName));
    const dirs = new Set(paths.map((p) => fs.dirname(p)));
    const content = h('div.ex-props', null,
      h('div.ex-props-head', null, A.img('icons/document'), h('div.ex-props-multi', null, `${plural(files, 'File')}, ${plural(folders, 'Folder')}`)),
      h('div.ae-hr'),
      propRows([['Type:', types.size === 1 ? 'All of type ' + [...types][0] : 'Multiple Types'], ['Location:', dirs.size === 1 ? 'All in ' + prettyPath([...dirs][0]) : 'Various Folders'], ['Size:', bytesLong(size)], ['Size on disk:', bytesLong(Math.ceil(size / 4096) * 4096)]]));
    A.ui.dialog({ parent, title: 'Properties', icon: 'icons/document', content, width: 380, buttons: [{ label: 'OK', default: true }] });
  }
  function driveProperties(parent, it) {
    const cap = it.total, used = it.used, free = cap - used;
    const swatch = (cls) => h('span.ex-swatch', { class: cls });
    const content = h('div.ex-props.ex-drive-props', null,
      propsHead(ICONS.hdd, 'Local Disk', false).el,
      h('div.ae-hr'),
      propRows([['Type:', 'Local Disk'], ['File system:', 'AFS (Aerium File System)']]),
      h('div.ae-hr'),
      h('table.ex-props-table', null,
        h('tr', null, h('td', null, swatch('used'), 'Used space:'), h('td.right', null, Math.round(used).toLocaleString('en-US') + ' bytes'), h('td.right', null, A.util.fmtBytes(used))),
        h('tr', null, h('td', null, swatch('free'), 'Free space:'), h('td.right', null, Math.round(free).toLocaleString('en-US') + ' bytes'), h('td.right', null, A.util.fmtBytes(free))),
        h('tr.ex-props-cap', null, h('td', null, 'Capacity:'), h('td.right', null, Math.round(cap).toLocaleString('en-US') + ' bytes'), h('td.right', null, A.util.fmtBytes(cap)))),
      h('div.ex-pie-row', null,
        h('div.ex-pie-wrap', { html: pieSVG(used / cap) }, h('div.ex-pie-label', null, 'Drive C:')),
        A.ui.button('Disk Cleanup', { size: 'sm', onClick: () => diskCleanup(parent) })),
      h('div.ae-hr'),
      h('div.ex-drive-checks', null, A.ui.checkbox({ label: 'Compress this drive to save disk space', checked: false }), A.ui.checkbox({ label: 'Index this drive for faster searching', checked: true })));
    A.ui.dialog({ parent, title: DRIVE_C + ' Properties', icon: ICONS.hdd, content, width: 390, buttons: [{ label: 'OK', default: true }, { label: 'Cancel', cancel: true }] });
  }

  // Rating stars shared with Photo Gallery (stored in photos.ratings).
  function starsEl(path, onChange) {
    const wrap = h('span.ex-stars', { role: 'radiogroup', 'aria-label': 'Rating' });
    const paint = (n) => wrap.querySelectorAll('.ex-star').forEach((b, i) => b.classList.toggle('on', i < n));
    for (let i = 1; i <= 5; i++) {
      const b = h('button.ex-star', { type: 'button', 'aria-label': plural(i, 'star'), 'data-tip': plural(i, 'star') }, glyph('star'));
      b.addEventListener('pointerenter', () => { wrap.classList.add('hover'); paint(i); });
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const n = ratingOf(path) === i ? 0 : i;
        setRating(path, n);
        A.sound.play('select');
        paint(n);
        onChange && onChange(n);
      });
      wrap.appendChild(b);
    }
    wrap.addEventListener('pointerleave', () => { wrap.classList.remove('hover'); paint(ratingOf(path)); });
    paint(ratingOf(path));
    return wrap;
  }

  function folderOptions(parent) {
    const hide = A.ui.checkbox({ label: 'Hide extensions for known file types', checked: !showExt() });
    const full = A.ui.checkbox({ label: 'Display the full path in the title bar', checked: !!A.store.get('explorer.fullPath', false) });
    const single = A.ui.checkbox({ label: 'Show pop-up description for folder and desktop items', checked: true });
    single.input.disabled = true;
    const content = h('div.ex-props.ex-options', null,
      h('div.ex-options-head', null, A.img('icons/folder'), h('div', null, h('div.ex-options-title', null, 'Folder Options'), h('div.ae-muted', null, 'Choose how your files and folders look in Explorer.'))),
      h('div.ae-hr'), h('div.ex-options-group', null, hide, full, single));
    A.ui.dialog({
      parent, title: 'Folder Options', icon: 'icons/folder', content, width: 400,
      buttons: [{ label: 'OK', default: true, value: 'ok', onClick: () => {
        A.store.set('explorer.showExt', !hide.checked);
        A.store.set('explorer.fullPath', !!full.checked);
      } }, { label: 'Cancel', cancel: true }],
    });
  }

  // ================================================================ the app
  A.apps.register({
    id: 'explorer',
    name: 'Explorer',
    icon: 'icons/folder',
    color: '#f5b62a',
    category: 'system',
    description: 'Browse your files and folders.',
    keywords: ['files', 'folders', 'browse', 'documents', 'computer', 'recycle bin', 'file manager', 'my computer'],
    window: { width: 880, height: 580, minWidth: 500, minHeight: 330, glassBody: true },
    tasks: [
      { label: 'Documents', icon: 'icons/folder-documents', onClick: () => A.apps.launch('explorer', { path: '/Documents' }) },
      { label: 'Pictures', icon: 'icons/folder-pictures', onClick: () => A.apps.launch('explorer', { path: '/Pictures' }) },
      { label: 'Music', icon: 'icons/folder-music', onClick: () => A.apps.launch('explorer', { path: '/Music' }) },
      { label: 'Computer', icon: 'icons/computer', onClick: () => A.apps.launch('explorer', { path: 'computer' }) },
      { label: 'Recycle Bin', icon: 'icons/trash', onClick: () => A.apps.launch('explorer', { path: RECYCLE }) },
    ],
    launch(win, args) {
      initIcons();
      return explorerWindow(win, args || {});
    },
  });

  function explorerWindow(win, args) {
    // ------------------------------------------------------------ state
    let L = null, view = null;
    let hist = [], hi = -1;
    let items = [], shown = [];
    const byKey = new Map(), elByKey = new Map();
    let sel = new Set(), anchor = null, focusKey = null;
    let filter = '', showSys = false;
    let navOn = A.store.get('explorer.navPane', true) !== false;
    let detailsOn = A.store.get('explorer.detailsPane', true) !== false;
    let treeOpen = A.store.get('explorer.treeOpen', true) !== false;
    let navW = clamp(Number(A.store.get('explorer.navWidth', 196)) || 196, 140, 360);
    const expanded = new Set(['/', 'computer']);
    const cleanups = [];
    let closed = false, renaming = null, pendingRefresh = false, viewsFly = null, activeDrag = null;
    let peekCache = new Map();

    // ------------------------------------------------------------ DOM
    win.body.classList.add('ex');
    const backBtn = h('button.ex-orb.ex-back', { type: 'button', 'aria-label': 'Back', 'data-tip': 'Back' }, glyph('back'));
    const fwdBtn = h('button.ex-orb.ex-fwd', { type: 'button', 'aria-label': 'Forward', 'data-tip': 'Forward' }, glyph('fwd'));
    const histBtn = h('button.ex-hist', { type: 'button', 'aria-label': 'Recent pages', 'data-tip': 'Recent pages' }, glyph('caret'));
    const addrIcon = h('img.ex-addr-icon', { alt: '', draggable: false });
    const crumbsEl = h('div.ex-crumbs');
    const addrInput = h('input.ex-addr-input', { type: 'text', spellcheck: false, autocomplete: 'off', 'aria-label': 'Address', hidden: true });
    const addrDrop = h('button.ex-addr-btn.ex-addr-drop', { type: 'button', 'aria-label': 'Previous locations', 'data-tip': 'Previous locations' }, glyph('caret'));
    const refreshBtn = h('button.ex-addr-btn.ex-refresh', { type: 'button', 'aria-label': 'Refresh', 'data-tip': 'Refresh' }, glyph('refresh'));
    const addrProgress = h('div.ex-addr-progress');
    const address = h('div.ex-address', null, addrProgress, addrIcon, crumbsEl, addrInput, addrDrop, refreshBtn);
    const searchInput = h('input.ex-search-input', { type: 'text', placeholder: 'Search', spellcheck: false, autocomplete: 'off', 'aria-label': 'Search' });
    const searchBtn = h('button.ex-search-btn', { type: 'button', 'aria-label': 'Search', 'data-tip': 'Search' }, glyph('search'));
    const searchBox = h('div.ex-search', null, searchInput, searchBtn);
    const top = h('div.ex-top', null, h('div.ex-navbtns', null, backBtn, fwdBtn, histBtn), address, searchBox);

    const organizeBtn = h('button.ae-tool.ex-menu-btn', { type: 'button' }, 'Organize', glyph('caret', 'ex-caret'));
    const viewsBtn = h('button.ae-tool.ex-views-main', { type: 'button', 'data-tip': 'Change your view' }, glyph('views', 'ex-views-ico'), 'Views');
    const viewsCaret = h('button.ae-tool.ex-views-caret', { type: 'button', 'aria-label': 'More view options', 'data-tip': 'More options' }, glyph('caret', 'ex-caret'));
    const ctxBar = h('div.ex-cmd-context');
    const helpBtn = h('button.ae-tool.ex-help', { type: 'button', 'aria-label': 'Help', 'data-tip': 'Get help with Explorer' }, A.img('icons/help'));
    const cmd = h('div.ae-toolbar.ex-cmd', null, organizeBtn, h('div.ex-split', null, viewsBtn, viewsCaret), h('span.ae-tool-sep'), ctxBar, h('div.ex-cmd-spacer'), helpBtn);

    const favsEl = h('div.ex-favs');
    const treeEl = h('div.ex-tree', { role: 'tree', 'aria-label': 'Folders' });
    const foldBar = h('button.ex-foldbar', { type: 'button', 'aria-expanded': String(treeOpen) }, h('span', null, 'Folders'), glyph('caret', 'ex-caret'));
    const navEl = h('nav.ae-sidebar.ex-nav', { 'aria-label': 'Navigation pane' }, h('div.ex-nav-title', null, 'Favorite Links'), favsEl, foldBar, treeEl);
    const splitter = h('div.ex-splitter', { role: 'separator', 'aria-orientation': 'vertical' });

    const colHead = h('div.ex-colhead', { hidden: true });
    const bannerEl = h('div.ex-banner', { hidden: true });
    const itemsEl = h('div.ex-items');
    const emptyEl = h('div.ex-empty', { hidden: true });
    const marquee = h('div.ex-marquee');
    const content = h('div.ex-content', { tabIndex: 0, role: 'listbox', 'aria-multiselectable': 'true', 'aria-label': 'Items' }, colHead, bannerEl, itemsEl, emptyEl, marquee);
    const dpane = h('div.ex-dpane');
    const main = h('div.ex-main', null, navEl, splitter, content);
    const frame = h('div.ex-frame', null, cmd, main, dpane);
    win.body.append(top, frame);
    applyPanes();

    // ------------------------------------------------------------ helpers
    const selected = () => shown.filter((it) => sel.has(it.key));
    const iconPx = () => (view.mode === 'icons' ? view.size : view.mode === 'tiles' ? 48 : 18);
    const isCut = (it) => shared.clip.mode === 'cut' && it.path && shared.clip.paths.includes(it.path);
    const titleText = () => (A.store.get('explorer.fullPath', false) ? addressText(L) : L.title);
    const canCopy = (list) => list.length > 0 && list.every((it) => it.path && !it.recycled);
    const canPaste = () => !!(L && L.canPaste && L.path && shared.clip.mode && shared.clip.paths.some((p) => fs.exists(p)));
    const deletable = (it) => (it.path && it.path !== '/' && !(fs.dirname(it.path) === '/' && fs.special[it.path])) || (it.kind === 'search' && it.saved != null);
    const renamable = (it) => (it.path && !it.recycled && deletable(it)) || (it.kind === 'search' && it.saved != null);

    function applyPanes() {
      navEl.hidden = !navOn;
      splitter.hidden = !navOn;
      navEl.style.width = navW + 'px';
      dpane.hidden = !detailsOn;
      treeEl.hidden = !treeOpen;
      navEl.classList.toggle('ex-tree-closed', !treeOpen);
      foldBar.setAttribute('aria-expanded', String(treeOpen));
    }

    // ------------------------------------------------------------ navigation
    function navigate(loc, o = {}) {
      if (loc === 'dvd:d') { discJoke(win); return false; }
      const next = resolve(loc);
      if (!next) {
        A.ui.messageBox({ parent: win, icon: 'error', title: 'Explorer', message: `Aerium can't find '${loc}'. Check the spelling and try again.` });
        return false;
      }
      if (renaming) renaming.cancel();
      if (o.history !== false && hist[hi] !== next.loc) {
        hist = hist.slice(0, hi + 1);
        hist.push(next.loc);
        if (hist.length > 60) hist.shift();
        hi = hist.length - 1;
      }
      const same = L && L.loc === next.loc;
      L = next;
      if (!same) { sel = new Set(); anchor = focusKey = null; showSys = false; }
      if (!o.keepFilter) {
        filter = '';
        searchInput.value = L.query != null ? L.query : '';
        updateSearchBtn();
      }
      view = loadView(L);
      expandTo(L.loc);
      closeViewsFly();
      renderAll(same && o.keepScroll);
      if (!o.silent) A.sound.play('navigate');
      return true;
    }
    function renderAll(keepScroll) {
      win.setTitle(titleText());
      win.setIcon(L.icon);
      renderAddress();
      renderFavs();
      renderTree();
      renderContent(keepScroll);
      updateNavButtons();
    }
    function goHist(i) {
      const dir = i < hi ? -1 : 1;
      while (i >= 0 && i < hist.length) {
        if (hist[i] === 'dvd:d' || resolve(hist[i])) { hi = i; navigate(hist[i], { history: false }); return; }
        hist.splice(i, 1);
        if (dir < 0) { hi--; i--; }
      }
      updateNavButtons();
    }
    const goBack = () => { if (hi > 0) goHist(hi - 1); };
    const goForward = () => { if (hi < hist.length - 1) goHist(hi + 1); };
    const goUp = () => { if (L.parent) navigate(L.parent); };
    function updateNavButtons() {
      backBtn.disabled = hi <= 0;
      fwdBtn.disabled = hi >= hist.length - 1;
      histBtn.disabled = hist.length < 2;
      const name = (loc) => { const R = loc && loc !== 'dvd:d' ? resolve(loc) : null; return R ? R.title : ''; };
      const b = hi > 0 ? name(hist[hi - 1]) : '', f = hi < hist.length - 1 ? name(hist[hi + 1]) : '';
      backBtn.setAttribute('data-tip', b ? 'Back to ' + b : 'Back');
      fwdBtn.setAttribute('data-tip', f ? 'Forward to ' + f : 'Forward');
    }
    function historyMenu() {
      if (histBtn.classList.contains('open')) { A.ui.closeMenus(); return; }
      const list = [];
      const lo = Math.max(0, hi - 8), top2 = Math.min(hist.length - 1, hi + 8);
      for (let i = top2; i >= lo; i--) {
        const R = hist[i] === 'dvd:d' ? null : resolve(hist[i]);
        if (!R) continue;
        list.push({ label: R.title, icon: i === hi ? null : R.icon, checked: i === hi, radio: true, bold: i === hi, onClick: () => goHist(i) });
      }
      if (!list.length) return;
      const r = histBtn.getBoundingClientRect();
      histBtn.classList.add('open');
      A.ui.menu(list, r.left - 40, r.bottom + 2, { owner: histBtn, onClose: () => histBtn.classList.remove('open') });
    }
    function expandTo(loc) {
      if (typeof loc !== 'string') return;
      if (loc.startsWith('/') && loc !== RECYCLE && !loc.startsWith(RECYCLE + '/')) {
        let p = fs.dirname(loc);
        expanded.add('/');
        while (p !== '/') { expanded.add(p); p = fs.dirname(p); }
      } else if (loc.startsWith('drive:c')) {
        expanded.add('computer');
        if (loc !== 'drive:c') expanded.add('drive:c');
      }
    }

    // ------------------------------------------------------------ address bar
    function renderAddress() {
      addrIcon.src = A.asset(L.icon);
      const parts = [crumbArrow(null, L.crumbs[0] && L.crumbs[0].loc)];
      L.crumbs.forEach((c, i) => {
        const b = h('button.ex-crumb', { type: 'button' }, c.label);
        b.addEventListener('click', () => navigate(c.loc));
        if (isDropLoc(c.loc)) { b.dataset.exdrop = c.loc; b.dataset.exlabel = c.label; }
        parts.push(b);
        const next = L.crumbs[i + 1];
        if (next || childrenOf(c.loc).length) parts.push(crumbArrow(c, next && next.loc));
      });
      const space = h('div.ex-crumb-space', { 'aria-hidden': 'true' });
      space.addEventListener('click', editAddress);
      crumbsEl.replaceChildren(...parts, space);
      fitCrumbs();
    }
    function crumbArrow(c, nextLoc) {
      const b = h('button.ex-crumb-arrow', { type: 'button', 'aria-label': c ? 'Folders inside ' + c.label : 'Places' }, glyph('chevron'));
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (e.button !== 0) return;
        if (b.classList.contains('open')) { A.ui.closeMenus(); return; }
        const list = c ? childrenOf(c.loc) : rootPlaces();
        if (!list.length) return;
        const r = b.getBoundingClientRect();
        b.classList.add('open');
        A.ui.menu(list.map((k) => ({ label: k.label, icon: k.icon, bold: k.loc === nextLoc, onClick: () => navigate(k.loc) })), r.left - 6, r.bottom + 1, { owner: b, onClose: () => b.classList.remove('open') });
      });
      return b;
    }
    function fitCrumbs() {
      const old = crumbsEl.querySelector('.ex-crumb-more');
      if (old) old.remove();
      const kids = Array.from(crumbsEl.children).filter((n) => !n.classList.contains('ex-crumb-space'));
      kids.forEach((n) => (n.hidden = false));
      if (crumbsEl.scrollWidth <= crumbsEl.clientWidth + 1) return;
      const more = h('button.ex-crumb-more', { type: 'button', 'aria-label': 'More locations', 'data-tip': 'More locations' }, '«');
      crumbsEl.insertBefore(more, crumbsEl.firstChild);
      const hidden = [];
      const crumbBtns = kids.filter((n) => n.classList.contains('ex-crumb'));
      kids[0].hidden = true;
      for (let i = 0; i < crumbBtns.length - 1 && crumbsEl.scrollWidth > crumbsEl.clientWidth + 1; i++) {
        crumbBtns[i].hidden = true;
        const arrow = crumbBtns[i].nextElementSibling;
        if (arrow && arrow.classList.contains('ex-crumb-arrow')) arrow.hidden = true;
        hidden.push(L.crumbs[i]);
      }
      more.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const r = more.getBoundingClientRect();
        const list = rootPlaces().concat([{ separator: true }]).concat(hidden.map((c) => ({ label: c.label, loc: c.loc, icon: c.loc === '/' ? 'icons/folder-user' : c.loc.startsWith('/') ? fs.iconFor(c.loc) : L.icon })));
        A.ui.menu(list.map((k) => (k.separator ? k : { label: k.label, icon: k.icon, onClick: () => navigate(k.loc) })), r.left, r.bottom + 1, { owner: more });
      });
    }
    function editAddress() {
      if (address.classList.contains('editing')) return;
      address.classList.add('editing');
      addrInput.value = addressText(L);
      crumbsEl.hidden = true;
      addrInput.hidden = false;
      addrInput.focus();
      addrInput.select();
    }
    function endEdit() {
      address.classList.remove('editing');
      crumbsEl.hidden = false;
      addrInput.hidden = true;
      fitCrumbs();
    }
    addrInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); const v = addrInput.value; endEdit(); content.focus({ preventScroll: true }); goAddress(v); }
      else if (e.key === 'Escape') { e.preventDefault(); endEdit(); content.focus({ preventScroll: true }); }
    });
    addrInput.addEventListener('blur', () => { if (address.classList.contains('editing')) endEdit(); });
    address.addEventListener('pointerdown', (e) => {
      if (e.target === address || e.target === crumbsEl) { e.preventDefault(); editAddress(); }
    });
    addrIcon.addEventListener('click', editAddress);
    function goAddress(text) {
      const t = String(text || '').trim();
      if (!t) return;
      const target = parseAddress(t);
      if (target && target.app) { A.apps.launch(target.app, target.args || {}); return; }
      if (target && target.file) { A.apps.openFile(target.file); return; }
      if (target && target.loc) { navigate(target.loc); return; }
      A.ui.messageBox({ parent: win, icon: 'error', title: t, message: `Aerium can't find '${t}'. Check the spelling and try again.` });
    }
    function parseAddress(t) {
      const low = t.toLowerCase();
      if (/^(https?:\/\/|www\.)/.test(low)) return { app: 'browser', args: { url: t } };
      const named = {
        computer: 'computer', 'my computer': 'computer', 'recycle bin': RECYCLE, searches: 'searches', 'recently changed': 'recent',
        desktop: '/Desktop', documents: '/Documents', 'my documents': '/Documents', pictures: '/Pictures', music: '/Music',
        videos: '/Videos', downloads: '/Downloads', 'c:': 'drive:c', 'c:\\': 'drive:c', 'c:/': 'drive:c', 'd:': 'dvd:d', 'd:\\': 'dvd:d',
      };
      if (named[low]) return { loc: named[low] };
      if (low === userName().toLowerCase() || low === '~' || low === '/') return { loc: '/' };
      if (low === 'control panel') return { app: 'controlpanel' };
      let p = t.replace(/\\/g, '/');
      const m = /^c:\/*(.*)$/i.exec(p);
      if (m) {
        const rest = m[1].replace(/\/+$/, '');
        const um = /^users\/[^/]+\/?(.*)$/i.exec(rest);
        if (um) p = '/' + um[1];
        else if (/^users$/i.test(rest)) return { loc: 'drive:c/Users' };
        else if (/^program files$/i.test(rest)) return { loc: 'drive:c/Program Files' };
        else if (/^aerium$/i.test(rest)) return { loc: 'drive:c/Aerium' };
        else if (!rest) return { loc: 'drive:c' };
        else p = '/' + rest;
      }
      if (!p.startsWith('/')) p = (L && L.path ? L.path : '/') + '/' + p;
      const real = findCaseInsensitive(p);
      if (real && fs.isDir(real)) return { loc: real };
      if (real && fs.exists(real)) return { file: real };
      if (!/[/\\]/.test(t) && A.apps.get(low)) return { app: A.apps.get(low).id };
      return null;
    }
    function addressHistoryMenu() {
      if (addrDrop.classList.contains('open')) { A.ui.closeMenus(); return; }
      const seen = new Set();
      const list = [];
      for (let i = hist.length - 1; i >= 0 && list.length < 10; i--) {
        if (seen.has(hist[i]) || hist[i] === 'dvd:d') continue;
        seen.add(hist[i]);
        const R = resolve(hist[i]);
        if (R) list.push({ label: addressText(R), icon: R.icon, onClick: () => navigate(R.loc) });
      }
      if (!list.length) return;
      const r = address.getBoundingClientRect();
      addrDrop.classList.add('open');
      const m = A.ui.menu(list, r.left, r.bottom + 1, { owner: addrDrop, minWidth: Math.round(r.width), onClose: () => addrDrop.classList.remove('open') });
      m.el.classList.add('ex-addr-menu');
    }
    addrDrop.addEventListener('pointerdown', (e) => { e.preventDefault(); addressHistoryMenu(); });
    refreshBtn.addEventListener('click', () => refresh());
    backBtn.addEventListener('click', goBack);
    fwdBtn.addEventListener('click', goForward);
    histBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!histBtn.disabled) historyMenu(); });

    // ------------------------------------------------------------ search
    function updateSearchBtn() {
      const has = !!searchInput.value;
      searchBtn.replaceChildren(glyph(has ? 'clear' : 'search'));
      searchBtn.setAttribute('aria-label', has ? 'Clear search' : 'Search');
      searchBtn.setAttribute('data-tip', has ? 'Clear search' : 'Search');
      searchBox.classList.toggle('has-text', has);
    }
    searchInput.addEventListener('input', () => {
      updateSearchBtn();
      const inResults = L.kind === 'search' && L.query != null;
      filter = inResults && searchInput.value === L.query ? '' : searchInput.value.trim();
      renderContent(true);
    });
    searchInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); runSearch(searchInput.value); }
      else if (e.key === 'Escape') { e.preventDefault(); clearSearch(); content.focus({ preventScroll: true }); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); content.focus({ preventScroll: true }); if (!sel.size && shown[0]) selectOnly(shown[0].key); }
    });
    searchBtn.addEventListener('click', () => { if (searchInput.value) clearSearch(); else searchInput.focus(); });
    function runSearch(q) {
      q = String(q || '').trim();
      if (!q) { clearSearch(); return; }
      const scope = L.kind === 'search' && L.scope ? L.scope : L.searchScope || '/';
      address.classList.remove('searching');
      void address.offsetWidth;
      address.classList.add('searching');
      setTimeout(() => address.classList.remove('searching'), 1100);
      navigate(searchKey(scope, q), { silent: true });
      A.sound.play('navigate');
    }
    function clearSearch() {
      searchInput.value = '';
      filter = '';
      updateSearchBtn();
      if (L.kind === 'search' && L.query != null) navigate(L.scope || '/');
      else renderContent(true);
    }
    function saveSearch() {
      if (L.query == null) return;
      A.ui.prompt({ parent: win, title: 'Save Search', message: 'Name this search so you can come back to it from Searches.', value: L.query.replace(/kind:\w+/i, '').trim() || 'My search', okLabel: 'Save' }).then((name) => {
        name = (name || '').replace(BAD_CHARS, '').trim();
        if (!name) return;
        const list = (A.store.get('explorer.searches', []) || []).filter((s) => s.name !== name);
        list.push({ name, scope: L.scope, q: L.query });
        A.store.set('explorer.searches', list);
        A.notify({ title: 'Search saved', text: `"${name}" is now in your Searches folder.`, icon: 'icons/search', timeout: 3000, sound: false });
      });
    }

    // ------------------------------------------------------------ navigation pane
    const FAVS = [
      { label: 'Documents', loc: '/Documents', icon: 'icons/folder-documents' },
      { label: 'Pictures', loc: '/Pictures', icon: 'icons/folder-pictures' },
      { label: 'Music', loc: '/Music', icon: 'icons/folder-music' },
      { label: 'Recently Changed', loc: 'recent', icon: () => ICONS.recent },
      { label: 'Searches', loc: 'searches', icon: () => ICONS.searches },
    ];
    function renderFavs() {
      favsEl.replaceChildren(...FAVS.map((f) => {
        const b = h('button.ex-fav', { type: 'button', class: L.loc === f.loc ? 'active' : null }, A.img(typeof f.icon === 'function' ? f.icon() : f.icon), h('span', null, f.label));
        if (isDropLoc(f.loc)) { b.dataset.exdrop = f.loc; b.dataset.exlabel = f.label; }
        b.addEventListener('click', () => navigate(f.loc));
        b.addEventListener('contextmenu', (e) => {
          e.preventDefault(); e.stopPropagation();
          A.ui.menu([{ label: 'Open', bold: true, onClick: () => navigate(f.loc) }, { label: 'Open in New Window', onClick: () => A.apps.launch('explorer', { path: f.loc }) }], e.clientX, e.clientY);
        });
        return b;
      }));
    }
    function renderTree() {
      const st = treeEl.scrollTop;
      treeEl.replaceChildren(...treeRoots().map((n) => treeNode(n, 0)));
      treeEl.scrollTop = st;
      const cur = treeEl.querySelector('.ex-tree-row.current');
      if (cur && treeOpen) {
        const tr = treeEl.getBoundingClientRect(), rr = cur.getBoundingClientRect();
        if (rr.top < tr.top || rr.bottom > tr.bottom) treeEl.scrollTop += rr.top - tr.top - tr.height / 2 + rr.height / 2;
      }
    }
    function treeNode(n, depth) {
      const kids = depth > 12 ? [] : childrenOf(n.loc);
      const hasKids = kids.length > 0;
      const open = hasKids && expanded.has(n.loc);
      const toggle = h('span.ex-tree-toggle', { class: [hasKids && 'has', open && 'open'] }, hasKids ? glyph('chevron') : null);
      const row = h('div.ex-tree-row', {
        role: 'treeitem', class: n.loc === L.loc ? 'current' : null, style: { paddingLeft: 3 + depth * 14 + 'px' },
        'aria-expanded': hasKids ? String(open) : null, 'aria-selected': n.loc === L.loc ? 'true' : 'false',
      }, toggle, A.img(n.icon), h('span.ex-tree-label', null, n.label));
      if (isDropLoc(n.loc)) { row.dataset.exdrop = n.loc; row.dataset.exlabel = n.label; }
      row.dataset.loc = n.loc;
      const node = h('div.ex-tree-node', null, row);
      if (open) node.appendChild(h('div.ex-tree-kids', { role: 'group' }, kids.map((k) => treeNode(k, depth + 1))));
      toggle.addEventListener('click', (e) => { e.stopPropagation(); if (hasKids) toggleNode(n.loc); });
      row.addEventListener('click', () => { if (n.loc !== L.loc) navigate(n.loc); });
      row.addEventListener('dblclick', (e) => { if (e.target.closest('.ex-tree-toggle')) return; if (hasKids) toggleNode(n.loc); });
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        const m = [];
        if (hasKids) m.push({ label: open ? 'Collapse' : 'Expand', bold: true, onClick: () => toggleNode(n.loc) });
        m.push({ label: 'Open', bold: !hasKids, onClick: () => navigate(n.loc) }, { label: 'Open in New Window', onClick: () => (n.loc === 'dvd:d' ? discJoke(win) : A.apps.launch('explorer', { path: n.loc })) });
        if (n.loc === RECYCLE) m.push({ separator: true }, { label: 'Empty Recycle Bin', disabled: !fs.recycleCount(), onClick: () => emptyBin(win) });
        if (isDropLoc(n.loc)) {
          m.push({ separator: true }, { label: 'Paste', disabled: !(shared.clip.mode && n.loc !== RECYCLE), onClick: () => paste(n.loc) });
          if (n.loc !== RECYCLE) m.push({ label: 'New Folder', onClick: () => { const p = fs.mkdir(fs.join(n.loc, fs.uniqueName(n.loc, 'New Folder'))); pushUndo('Undo New', () => fs.exists(p) && fs.remove(p, { permanent: true })); } });
        }
        m.push({ separator: true }, { label: 'Properties', onClick: () => { const R = n.loc === 'dvd:d' ? null : resolve(n.loc); if (R) propertiesDialog(win, [], R); else propertiesDialog(win, [{ kind: 'dvd' }], L); } });
        A.ui.menu(m, e.clientX, e.clientY);
      });
      return node;
    }
    function toggleNode(loc) {
      if (expanded.has(loc)) expanded.delete(loc); else expanded.add(loc);
      A.sound.play('click');
      renderTree();
    }
    foldBar.addEventListener('click', () => {
      treeOpen = !treeOpen;
      A.store.set('explorer.treeOpen', treeOpen);
      applyPanes();
      if (treeOpen) renderTree();
    });
    A.util.drag(splitter, {
      threshold: 0,
      onStart: () => { splitter.startW = navW; splitter.classList.add('dragging'); },
      onMove: (e, dx) => { navW = clamp(splitter.startW + dx, 140, Math.min(360, win.body.clientWidth - 260)); navEl.style.width = navW + 'px'; layoutList(); fitCrumbs(); applyColWidths(); },
      onEnd: () => { splitter.classList.remove('dragging'); A.store.set('explorer.navWidth', navW); },
    });

    // ------------------------------------------------------------ command bar
    function toggleMenu(btn, itemsFn) {
      if (btn.classList.contains('active')) { A.ui.closeMenus(); return; }
      closeViewsFly();
      const r = btn.getBoundingClientRect();
      btn.classList.add('active');
      A.ui.menu(itemsFn(), r.left, r.bottom, { owner: btn, onClose: () => btn.classList.remove('active') });
    }
    organizeBtn.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; e.preventDefault(); toggleMenu(organizeBtn, organizeItems); });
    function organizeItems() {
      const list = selected();
      const u = shared.undo[shared.undo.length - 1];
      return [
        { label: 'New Folder', icon: 'icons/folder', shortcut: 'Ctrl+Shift+N', disabled: !L.canCreate, onClick: () => newItem('folder') },
        { separator: true },
        { label: 'Cut', shortcut: 'Ctrl+X', disabled: !canCopy(list), onClick: () => cutCopy('cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', disabled: !canCopy(list), onClick: () => cutCopy('copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', disabled: !canPaste(), onClick: () => paste() },
        { label: u ? u.label : 'Undo', shortcut: 'Ctrl+Z', disabled: !u, onClick: () => undoLast(win) },
        { separator: true },
        { label: 'Select All', shortcut: 'Ctrl+A', disabled: !shown.length, onClick: selectAll },
        { separator: true },
        { label: 'Layout', submenu: [
          { label: 'Details Pane', checked: detailsOn, onClick: () => { detailsOn = !detailsOn; A.store.set('explorer.detailsPane', detailsOn); applyPanes(); renderDetails(); layoutList(); } },
          { label: 'Navigation Pane', checked: navOn, onClick: () => { navOn = !navOn; A.store.set('explorer.navPane', navOn); applyPanes(); layoutList(); fitCrumbs(); applyColWidths(); } },
        ] },
        { label: 'Folder and Search Options', icon: 'icons/settings', onClick: () => folderOptions(win) },
        { separator: true },
        { label: 'Delete', shortcut: 'Del', disabled: !list.some(deletable), onClick: () => deleteItems(list) },
        { label: 'Rename', shortcut: 'F2', disabled: !(list.length === 1 && renamable(list[0])), onClick: () => startRename(list[0]) },
        { label: 'Remove Properties', disabled: !list.some((it) => it.path), onClick: () => jokes.removeProps(win, list.length) },
        { label: 'Properties', shortcut: 'Alt+Enter', onClick: () => propertiesDialog(win, list, L) },
        { separator: true },
        { label: 'Close', onClick: () => win.close() },
      ];
    }
    viewsBtn.addEventListener('click', () => {
      const cycle = ['list', 'details', 'tiles', 'large'];
      const i = cycle.indexOf(stopOf(view));
      const next = STOPS.find((s) => s.id === cycle[(i + 1) % cycle.length]);
      setView({ mode: next.mode, size: next.size });
    });
    viewsCaret.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (viewsFly) { closeViewsFly(); return; }
      openViewsFly();
    });
    function closeViewsFly() { if (viewsFly) { viewsFly.close(); viewsFly = null; } }
    function openViewsFly() {
      A.ui.closeMenus();
      const ROW = 26;
      const knob = h('div.ex-vknob', { role: 'slider', tabIndex: 0, 'aria-label': 'View', 'aria-valuemin': 0, 'aria-valuemax': 6 });
      const rail = h('div.ex-vrail', null, h('div.ex-vtrack'), STOPS.map((st, i) => h('i.ex-vtick', { style: { top: ROW / 2 + i * ROW + 'px' } })), knob);
      const labels = h('div.ex-vlabels', null, STOPS.map((st, i) => {
        const b = h('button.ex-vlabel', { type: 'button', dataset: { i } }, st.label);
        b.addEventListener('click', () => { setView({ mode: st.mode, size: st.size }); A.sound.play('click'); closeViewsFly(); });
        return b;
      }));
      const el = h('div.ex-vmenu', null, rail, labels);
      const place = () => {
        const pos = viewToPos(view);
        knob.style.top = ROW / 2 + pos * ROW + 'px';
        knob.setAttribute('aria-valuenow', pos.toFixed(2));
        const cur = stopOf(view);
        labels.querySelectorAll('.ex-vlabel').forEach((b, i) => b.classList.toggle('active', STOPS[i].id === cur));
      };
      place();
      const posFromY = (y) => clamp((y - rail.getBoundingClientRect().top - ROW / 2) / ROW, 0, 6);
      const dragTo = (ev, snap) => {
        const v = posToView(posFromY(ev.clientY), snap);
        if (v.mode !== view.mode || (v.mode === 'icons' && v.size !== view.size)) { view.mode = v.mode; if (v.size) view.size = v.size; renderContent(true); }
        place();
      };
      rail.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        knob.classList.add('dragging');
        dragTo(e);
        const move = (ev) => dragTo(ev);
        const up = (ev) => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          knob.classList.remove('dragging');
          const pos = posFromY(ev.clientY);
          if (pos > 2.4) dragTo(ev, true);
          saveView(L, view);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
      knob.addEventListener('keydown', (e) => {
        const pos = viewToPos(view);
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault(); e.stopPropagation();
          const np = clamp(Math.round(pos) + (e.key === 'ArrowUp' ? -1 : 1), 0, 6);
          setView(posToView(np, true));
          place();
        } else if (e.key === 'Enter') closeViewsFly();
      });
      viewsCaret.classList.add('active');
      viewsFly = A.ui.flyout(viewsCaret, el, { placement: 'bottom', align: 'left', className: 'ex-vfly', onClose: () => { viewsCaret.classList.remove('active'); viewsFly = null; } });
      setTimeout(() => knob.focus({ preventScroll: true }), 30);
    }
    function setView(v, save = true) {
      view.mode = v.mode;
      if (v.size) view.size = clamp(v.size, ICON_MIN, ICON_MAX);
      renderContent(true);
      if (save) saveView(L, view);
    }
    helpBtn.addEventListener('click', () => A.apps.launch('help', { topic: 'explorer' }));

    function renderContextButtons() {
      const list = selected();
      const one = list.length === 1 ? list[0] : null;
      const btns = [];
      const tool = (label, icon, onClick, tip) => h('button.ae-tool', { type: 'button', onclick: onClick, 'data-tip': tip || null }, icon ? A.img(icon) : null, label);
      if (L.kind === 'recycle') {
        const none = !fs.recycleCount();
        btns.push(tool('Empty the Recycle Bin', 'icons/trash', () => emptyBin(win), 'Permanently delete everything in the Recycle Bin'));
        if (list.length) btns.push(tool(list.length === 1 ? 'Restore this item' : 'Restore the selected items', 'icons/sync', () => restoreItems(list)));
        else btns.push(tool('Restore all items', 'icons/sync', restoreAll, 'Put everything back where it came from'));
        if (none) btns.forEach((b) => (b.disabled = true));
      } else if (L.kind === 'computer') {
        btns.push(tool('System properties', 'icons/computer', () => A.apps.launch('system')));
        btns.push(tool('Uninstall or change a program', 'icons/settings', () => jokes.uninstall(win)));
        btns.push(tool('Map network drive', 'icons/network', () => jokes.mapDrive(win)));
        btns.push(tool('Open Control Panel', 'icons/personalize', () => A.apps.launch('controlpanel')));
      } else if (L.kind === 'search' && L.query != null) {
        btns.push(tool('Save search', 'icons/search', saveSearch, 'Keep this search in your Searches folder'));
      }
      if (L.kind !== 'recycle') {
        const hasPics = L.folderType === 'pictures' || shown.some((it) => it.path && !it.isFolder && isPic(it.path));
        const hasMusic = L.folderType === 'music' || shown.some((it) => it.path && !it.isFolder && isMusic(it.path));
        if (one && one.path && !one.isFolder && isPic(one.path)) btns.push(tool('Preview', 'icons/photogallery', () => A.apps.launch('photos', { path: one.path })));
        if (hasPics) btns.push(tool('Slide show', 'icons/play', slideShow, 'Show these pictures full screen'));
        if (one && one.path && !one.isFolder && isMusic(one.path)) btns.push(tool('Play', 'icons/play', () => openItem(one)));
        if (hasMusic) btns.push(tool('Play all', 'icons/mediaplayer', playAll, 'Play every song in this folder'));
        if (list.length && list.every((it) => it.path && !it.recycled)) {
          if (!(one && !one.isFolder && (isPic(one.path) || isMusic(one.path)))) btns.push(tool('Open', one && one.isFolder ? 'icons/folder' : 'icons/document', () => openItems(list)));
          btns.push(tool('Share', 'icons/users', () => jokes.share(win)));
          btns.push(tool('E-mail', 'icons/mail', () => jokes.email(win, list.length)));
          btns.push(tool('Burn', 'icons/disc', () => jokes.burn(win)));
        } else if (L.path && L.kind !== 'recycle' && !list.length) {
          btns.push(tool('Burn', 'icons/disc', () => jokes.burn(win)));
        }
      }
      ctxBar.replaceChildren(...btns);
      fitCommands();
    }
    // Buttons that do not fit are hidden whole instead of being cut in half.
    function fitCommands() {
      const btns = Array.from(ctxBar.children);
      btns.forEach((b) => (b.hidden = false));
      const right = ctxBar.getBoundingClientRect().right + 1;
      btns.forEach((b) => { if (b.getBoundingClientRect().right > right) b.hidden = true; });
    }
    function picturesHere() {
      const list = [];
      const direct = shown.filter((it) => it.path && !it.isFolder && isPic(it.path)).map((it) => it.path);
      if (direct.length) return { paths: direct };
      if (L.path) walk(L.path, (st) => { if (st.type === 'file' && isPic(st.path)) list.push(st.path); });
      return { paths: list };
    }
    function slideShow() {
      const list = selected().filter((it) => it.path && !it.isFolder && isPic(it.path)).map((it) => it.path);
      const pics = list.length > 1 ? { paths: list } : picturesHere();
      if (!pics.paths.length) { A.ui.messageBox({ parent: win, icon: 'info', title: 'Slide Show', message: 'There are no pictures here to show yet.' }); return; }
      const start = list.length === 1 ? list[0] : pics.paths[0];
      A.apps.launch('photos', { path: start, paths: pics.paths, folder: L.path || null, slideshow: true });
    }
    function playAll() {
      const paths = [];
      const direct = shown.filter((it) => it.path && !it.isFolder && isMusic(it.path)).map((it) => it.path);
      if (direct.length) paths.push(...direct);
      else if (L.path) walk(L.path, (st) => { if (st.type === 'file' && isMusic(st.path)) paths.push(st.path); });
      if (!paths.length) { A.ui.messageBox({ parent: win, icon: 'info', title: 'Play all', message: 'There is no music in this folder yet.' }); return; }
      A.apps.launch('mediaplayer', { path: paths[0], playlist: paths, folder: L.path || null, play: true });
    }

    // ------------------------------------------------------------ content rendering
    function safeItems() {
      try { return L.items() || []; } catch (e) { console.error('[Explorer] could not list', L.loc, e); return []; }
    }
    function computeShown() {
      items = safeItems();
      byKey.clear();
      items.forEach((it) => byKey.set(it.key, it));
      let list = items;
      if (filter) { const f = filter.toLowerCase(); list = list.filter((it) => String(it.name).toLowerCase().includes(f)); }
      if (L.hiddenUntilShown && !showSys) list = [];
      shown = L.grouped ? list : sortItems(list, view.sort);
      const keys = new Set(shown.map((it) => it.key));
      sel = new Set([...sel].filter((k) => keys.has(k)));
      if (anchor && !keys.has(anchor)) anchor = null;
      if (focusKey && !keys.has(focusKey)) focusKey = null;
    }
    function renderContent(keepScroll) {
      const scroll = keepScroll ? { top: content.scrollTop, left: content.scrollLeft } : { top: 0, left: 0 };
      peekCache = new Map();
      computeShown();
      elByKey.clear();
      itemsEl.className = 'ex-items ex-view-' + view.mode;
      content.dataset.view = view.mode;
      content.style.setProperty('--ex-icon', iconPx() + 'px');
      content.style.setProperty('--ex-cell', Math.max(78, iconPx() + 30) + 'px');
      content.classList.toggle('ex-in-recycle', L.kind === 'recycle');
      if (L.path && L.kind !== 'recycle') { content.dataset.exdrop = L.path; content.dataset.exlabel = L.title; }
      else { delete content.dataset.exdrop; delete content.dataset.exlabel; }
      renderColHead();
      renderBanner();
      const frag = document.createDocumentFragment();
      let group = null;
      shown.forEach((it) => {
        if (L.grouped && view.mode !== 'list' && it.group !== group) {
          group = it.group;
          const n = shown.filter((x) => x.group === group).length;
          frag.appendChild(h('div.ex-group', null, h('span', null, `${group} (${n})`)));
        }
        const el = itemEl(it);
        elByKey.set(it.key, el);
        frag.appendChild(el);
      });
      itemsEl.replaceChildren(frag);
      const hiddenSys = L.hiddenUntilShown && !showSys;
      emptyEl.hidden = !!shown.length || hiddenSys;
      emptyEl.textContent = filter ? 'No items match your search.' : L.empty;
      layoutList();
      applySelection();
      content.scrollTop = scroll.top;
      content.scrollLeft = scroll.left;
    }
    function layoutList() {
      if (!view || view.mode !== 'list') { itemsEl.style.gridTemplateRows = ''; return; }
      const rows = Math.max(1, Math.floor((content.clientHeight - 14) / 22));
      itemsEl.style.gridTemplateRows = `repeat(${rows}, 22px)`;
    }
    function colWidth(id) { return clamp(view.widths[id] || COLS[id].width, 40, 600); }
    // Default widths shrink the Name column so every column fits, until you size them yourself.
    function applyColWidths() {
      if (!view || view.mode !== 'details') return;
      const cols = L.columns;
      const w = {};
      cols.forEach((id) => (w[id] = colWidth(id)));
      const avail = content.clientWidth - 18;
      const sum = () => cols.reduce((a, id) => a + w[id], 0);
      if (!view.widths.name && sum() > avail && avail > 0) w.name = Math.max(150, w.name - (sum() - avail));
      const auto = cols.filter((id) => id !== 'name' && !view.widths[id]);
      if (auto.length && sum() > avail && avail > 0) {
        const room = auto.reduce((a, id) => a + w[id] - 64, 0);
        const cut = Math.min(room, sum() - avail);
        auto.forEach((id) => (w[id] = Math.round(w[id] - (cut * (w[id] - 64)) / (room || 1))));
      }
      content.style.setProperty('--ex-cols', cols.map((id) => w[id] + 'px').join(' '));
      content.style.setProperty('--ex-cols-w', cols.reduce((a, id) => a + w[id], 0) + 12 + 'px');
    }
    function renderColHead() {
      const on = view.mode === 'details';
      colHead.hidden = !on;
      if (!on) return;
      const cols = L.columns;
      applyColWidths();
      colHead.replaceChildren(...cols.map((id) => {
        const c = COLS[id];
        const sorted = view.sort.key === id;
        const cell = h('div.ex-colh', { class: [c.align === 'right' && 'right', sorted && (view.sort.dir > 0 ? 'asc' : 'desc')], role: 'columnheader', 'aria-sort': sorted ? (view.sort.dir > 0 ? 'ascending' : 'descending') : 'none' },
          h('span.ex-colh-label', null, c.label), h('span.ex-sortglyph', { 'aria-hidden': 'true' }), h('span.ex-colgrip'));
        cell.addEventListener('click', (e) => { if (!e.target.classList.contains('ex-colgrip')) sortBy(id); });
        const grip = cell.querySelector('.ex-colgrip');
        let startW = 0;
        A.util.drag(grip, {
          threshold: 0,
          onStart: () => { startW = cell.getBoundingClientRect().width; if (id !== 'name' && !view.widths.name) view.widths.name = Math.round(colHead.firstChild.getBoundingClientRect().width); },
          onMove: (e, dx) => { view.widths[id] = clamp(Math.round(startW + dx), 40, 600); applyColWidths(); },
          onEnd: () => saveView(L, view),
        });
        grip.addEventListener('dblclick', (e) => { e.stopPropagation(); delete view.widths[id]; renderContent(true); saveView(L, view); });
        return cell;
      }));
      colHead.addEventListener('contextmenu', headMenu);
    }
    function headMenu(e) {
      e.preventDefault(); e.stopPropagation();
      A.ui.menu([
        { header: 'Sort by' },
        ...L.columns.map((id) => ({ label: COLS[id].label, radio: true, checked: view.sort.key === id, onClick: () => sortBy(id, view.sort.key === id ? view.sort.dir : 1) })),
        { separator: true },
        { label: 'Size All Columns to Fit', onClick: () => { view.widths = {}; renderContent(true); saveView(L, view); } },
      ], e.clientX, e.clientY);
    }
    function sortBy(id, dir) {
      if (dir == null) dir = view.sort.key === id ? -view.sort.dir : (id === 'modified' || id === 'deleted' || id === 'size' ? -1 : 1);
      view.sort = { key: id, dir };
      A.sound.play('click');
      renderContent(true);
      saveView(L, view);
    }
    function renderBanner() {
      const on = !!(L.hiddenUntilShown && !showSys);
      bannerEl.hidden = !on;
      if (!on) { bannerEl.replaceChildren(); return; }
      const link = h('button.ae-link', { type: 'button' }, 'Show the contents of this folder');
      link.addEventListener('click', () => { showSys = true; A.sound.play('click'); renderContent(true); });
      bannerEl.replaceChildren(A.img('icons/shield'), h('div', null,
        h('div.ex-banner-title', null, 'These files are hidden.'),
        h('p', null, 'This folder contains files that keep Aerium running properly. You should not change its contents.'),
        link));
    }
    function itemEl(it) {
      const el = h('div.ex-item', {
        role: 'option', class: ['ex-k-' + it.kind, isCut(it) && 'ex-cut'],
        dataset: { key: it.key }, 'aria-label': it.name,
      });
      if (it.isFolder && it.path && !it.recycled && isDropLoc(it.path)) { el.dataset.exdrop = it.path; el.dataset.exlabel = it.name; }
      const px = iconPx();
      if (view.mode === 'details') {
        L.columns.forEach((id, i) => {
          if (i === 0) el.appendChild(h('div.ex-cell.ex-cell-name', null, iconBox(it, px), nameNode(it)));
          else el.appendChild(h('div.ex-cell', { class: COLS[id].align === 'right' ? 'right' : null }, COLS[id].text(it)));
        });
      } else if (view.mode === 'tiles') {
        el.append(iconBox(it, px), h('div.ex-item-text', null, nameNode(it), ...tileMeta(it)));
      } else {
        el.append(iconBox(it, px), nameNode(it));
        if (view.mode === 'icons' && it.kind === 'drive' && px >= 48) el.appendChild(capBar(it));
        const tip = infoTip(it);
        if (tip) el.dataset.tip = tip;
      }
      return el;
    }
    function infoTip(it) {
      if (it.kind === 'file' && !it.recycled) return `Type: ${it.typeName}\u2002\u2002Size: ${A.util.fmtBytes(it.size || 0)}\u2002\u2002Date modified: ${fmtDT(it.modified)}`;
      if (it.kind === 'drive') return `Free space: ${A.util.fmtBytes(it.free)}\u2002\u2002Total size: ${A.util.fmtBytes(it.total)}`;
      if (it.kind === 'app' && it.description) return it.description;
      return '';
    }
    function capBar(it) {
      const pct = it.total ? (it.used / it.total) * 100 : 0;
      return h('div.ex-cap', { class: pct >= 90 ? 'full' : null, role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct), 'aria-label': 'Space used' }, h('div.ex-cap-fill', { style: { width: pct.toFixed(1) + '%' } }));
    }
    function tileMeta(it) {
      if (it.kind === 'drive') return [capBar(it), h('span.ex-item-meta', null, `${A.util.fmtBytes(it.free)} free of ${A.util.fmtBytes(it.total)}`)];
      if (it.kind === 'dvd') return [h('span.ex-item-meta', null, 'CD Drive'), h('span.ex-item-meta', null, 'Insert a disc')];
      if (it.kind === 'app') return [h('span.ex-item-meta', null, it.description || 'Application'), h('span.ex-item-meta', null, 'Aerium')];
      if (it.kind === 'search') return [h('span.ex-item-meta', null, 'Saved Search')];
      if (it.recycled) return [h('span.ex-item-meta', null, it.typeName), h('span.ex-item-meta', null, 'From ' + prettyPath(it.origin ? fs.dirname(it.origin) : ''))];
      if (it.track) return [h('span.ex-item-meta', null, it.track.artist || it.typeName), h('span.ex-item-meta', null, it.track.album || A.util.fmtBytes(it.size || 0))];
      if (it.isFolder) return [h('span.ex-item-meta', null, 'File Folder')];
      return [h('span.ex-item-meta', null, it.typeName), h('span.ex-item-meta', null, A.util.fmtBytes(it.size || 0))];
    }
    function folderPeek(p) {
      if (peekCache.has(p)) return peekCache.get(p);
      const out = [];
      const scan = (dir, depth) => {
        for (const st of fs.list(dir)) {
          if (out.length >= 3) return;
          if (st.type === 'file' && isPic(st.path)) { const t = fs.thumbFor(st.path); if (t) out.push(t); }
        }
        if (depth < 1) for (const st of fs.list(dir)) { if (out.length >= 3) return; if (st.type === 'folder' && st.path !== RECYCLE) scan(st.path, depth + 1); }
      };
      scan(p, 0);
      peekCache.set(p, out);
      return out;
    }
    function iconBox(it, px) {
      const box = h('div.ex-ibox');
      if (it.thumb) {
        const rot = it.path ? rotationOf(it.target || it.path) : 0;
        if (px >= 32) box.appendChild(h('img.ex-thumb', { src: it.thumb, alt: '', draggable: false, style: rot ? { transform: `rotate(${rot}deg)` } : null }));
        else box.appendChild(h('img.ex-minithumb', { src: it.thumb, alt: '', draggable: false }));
      } else if (px >= 48 && it.kind === 'folder' && it.path && !it.recycled) {
        const pics = folderPeek(it.path);
        if (pics.length) {
          box.appendChild(h('div.ex-peek', null, h('img.ex-peek-back', { src: ICONS.folderBack, alt: '', draggable: false }),
            pics.map((t, i) => h('img.ex-peek-pic', { src: t, alt: '', draggable: false, style: { '--i': i, '--n': pics.length } })),
            h('img.ex-peek-front', { src: ICONS.folderFront, alt: '', draggable: false })));
        } else box.appendChild(A.img(it.icon, { class: 'ex-icon' }));
      } else box.appendChild(A.img(it.icon, { class: 'ex-icon' }));
      if (it.shortcut) box.appendChild(h('span.ex-arrow'));
      return box;
    }
    function nameNode(it) {
      const name = String(it.name);
      const el = h('span.ex-item-name');
      const f = filter.toLowerCase();
      const i = f ? name.toLowerCase().indexOf(f) : -1;
      if (i >= 0) el.append(name.slice(0, i), h('mark.ex-hl', null, name.slice(i, i + f.length)), name.slice(i + f.length));
      else el.textContent = name;
      return el;
    }

    // ------------------------------------------------------------ selection
    function applySelection(light) {
      elByKey.forEach((el, k) => {
        const on = sel.has(k);
        el.classList.toggle('selected', on);
        el.classList.toggle('ex-focus', k === focusKey);
        el.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (!light) { renderContextButtons(); renderDetails(); }
    }
    function selectOnly(k) { sel = new Set(k ? [k] : []); anchor = k; focusKey = k; applySelection(); }
    function toggleSel(k) { if (sel.has(k)) sel.delete(k); else sel.add(k); anchor = k; focusKey = k; applySelection(); }
    function selectRange(a, b, add) {
      const ia = shown.findIndex((x) => x.key === a), ib = shown.findIndex((x) => x.key === b);
      if (ia < 0 || ib < 0) { selectOnly(b); return; }
      const next = add ? new Set(sel) : new Set();
      for (let i = Math.min(ia, ib); i <= Math.max(ia, ib); i++) next.add(shown[i].key);
      sel = next;
      focusKey = b;
      applySelection();
    }
    function selectAll() { sel = new Set(shown.map((it) => it.key)); focusKey = focusKey || (shown[0] && shown[0].key); applySelection(); }
    function selectPaths(paths) {
      const keys = paths.filter((p) => byKey.has(p));
      if (!keys.length) return;
      sel = new Set(keys);
      anchor = focusKey = keys[keys.length - 1];
      applySelection();
      scrollToKey(focusKey);
    }
    function scrollToKey(k) {
      const el = elByKey.get(k);
      if (!el) return;
      const cr = content.getBoundingClientRect(), r = el.getBoundingClientRect();
      const headH = view.mode === 'details' ? colHead.offsetHeight : 0;
      if (r.top < cr.top + headH) content.scrollTop -= cr.top + headH - r.top + 4;
      else if (r.bottom > cr.top + content.clientHeight) content.scrollTop += r.bottom - (cr.top + content.clientHeight) + 4;
      if (r.left < cr.left) content.scrollLeft -= cr.left - r.left + 4;
      else if (r.right > cr.left + content.clientWidth) content.scrollLeft += r.right - (cr.left + content.clientWidth) + 4;
    }

    // ------------------------------------------------------------ details pane
    function dpProp(label, value) {
      return h('div.ex-dp-p', null, h('span.ex-dp-k', null, label + ':'), h('span.ex-dp-v', null, value));
    }
    function renderDetails() {
      if (!detailsOn) return;
      const list = selected();
      let icon, name, sub, props = [];
      const iconBoxEl = h('div.ex-dp-icon');
      if (list.length === 1) {
        const it = list[0];
        name = it.name;
        sub = it.typeName || '';
        if (it.thumb) {
          const rot = it.path ? rotationOf(it.target || it.path) : 0;
          iconBoxEl.appendChild(h('img.ex-dp-thumb', { src: it.thumb, alt: '', style: rot ? { transform: `rotate(${rot}deg)` } : null }));
        } else icon = it.icon;
        if (it.recycled) {
          props.push(dpProp('Original location', prettyPath(it.origin ? fs.dirname(it.origin) : '')), dpProp('Date deleted', fmtDT(it.deleted)), dpProp('Size', A.util.fmtBytes(it.size || 0)), dpProp('Date modified', fmtDT(it.modified)));
        } else if (it.kind === 'drive') {
          props.push(dpProp('Space used', capBar(it)), dpProp('Space free', A.util.fmtBytes(it.free)), dpProp('Total size', A.util.fmtBytes(it.total)), dpProp('File system', 'AFS'));
        } else if (it.kind === 'dvd') {
          props.push(dpProp('Status', 'No disc inserted'), dpProp('Speed', '16x DVD, 48x CD'));
        } else if (it.kind === 'app') {
          props.push(dpProp('Description', it.description || 'Application'), dpProp('Version', '7.0 (Build 2007)'), dpProp('Size', A.util.fmtBytes(it.size || 0)));
        } else if (it.kind === 'sysfile') {
          props.push(dpProp('Date modified', fmtDT(it.modified)), dpProp('Size', A.util.fmtBytes(it.size || 0)), dpProp('Attributes', 'System, Read-only'));
        } else if (it.kind === 'search') {
          props.push(dpProp('Type', 'Saved Search'), dpProp('Look in', it.loc.startsWith('search:') ? prettyPath(resolve(it.loc) && resolve(it.loc).scope) : userName()));
        } else if (it.kind === 'vfolder') {
          props.push(dpProp('Date modified', fmtDT(it.modified)));
        } else if (it.track) {
          const t = it.track;
          name = t.title || it.name;
          props.push(dpProp('Artist', t.artist || 'Unknown artist'), dpProp('Album', t.album || 'Unknown album'), dpProp('Genre', t.genre || 'Unknown'), dpProp('Length', t.duration ? A.util.fmtDuration(t.duration) : ''), dpProp('Year', String(t.year || '')), dpProp('Size', A.util.fmtBytes(it.size || 0)));
        } else if (it.path && !it.isFolder && isPic(it.target || it.path)) {
          const dims = h('span', null, '');
          props.push(dpProp('Date taken', fmtDT(it.modified)), dpProp('Rating', starsEl(it.target || it.path)), dpProp('Dimensions', dims), dpProp('Size', A.util.fmtBytes(it.size || 0)));
          if (it.location) props.push(dpProp('Folder', prettyPath(it.location)));
          A.util.loadImage(it.thumb).then((im) => { dims.textContent = im.naturalWidth + ' x ' + im.naturalHeight; }).catch(() => {});
        } else if (it.isFolder && it.path) {
          const n = fs.list(it.path).length;
          props.push(dpProp('Date modified', fmtDT(it.modified)), dpProp('Contains', plural(n, 'item')));
          if (it.location) props.push(dpProp('Folder', prettyPath(it.location)));
        } else if (it.path) {
          props.push(dpProp('Date modified', fmtDT(it.modified)), dpProp('Size', A.util.fmtBytes(it.size || 0)));
          if (it.shortcut) props.push(dpProp('Target', it.target ? prettyPath(it.target) : String(fs.read(it.path) || '').replace(/^app:/, '')));
          if (it.location) props.push(dpProp('Folder', prettyPath(it.location)));
          if (isText(it.path)) {
            const first = String(fs.read(it.path) || '').split(/\r?\n/).find((x) => x.trim()) || '';
            if (first) props.push(dpProp('Preview', first.length > 60 ? first.slice(0, 58) + '...' : first));
          }
        }
      } else if (list.length > 1) {
        icon = 'icons/document';
        name = plural(list.length, 'item') + ' selected';
        let size = 0;
        list.forEach((it) => (size += it.isFolder ? 0 : it.size || 0));
        const dates = list.map((it) => it.modified).filter(Boolean).sort((a, b) => a - b);
        sub = '';
        if (size) props.push(dpProp('Total size', A.util.fmtBytes(size)));
        if (dates.length) props.push(dpProp('Date modified', dates.length > 1 && A.util.fmtDate(new Date(dates[0])) !== A.util.fmtDate(new Date(dates[dates.length - 1])) ? `${A.util.fmtDate(new Date(dates[0]))} - ${A.util.fmtDate(new Date(dates[dates.length - 1]))}` : fmtDT(dates[0])));
      } else if (L.kind === 'computer') {
        icon = 'icons/computer';
        name = userName().toUpperCase().replace(/\s+/g, '') + '-PC';
        sub = 'Workgroup: WORKGROUP';
        props.push(dpProp('Processor', 'Aerium Glass Duo @ 2.40 GHz'), dpProp('Memory', '2.00 GB'), dpProp('Experience', '5.9'));
      } else {
        icon = L.icon;
        name = L.hiddenUntilShown && !showSys ? plural(items.length, 'hidden item') : plural(shown.length, 'item');
        sub = '';
        if (L.kind === 'recycle') {
          let size = 0;
          shown.forEach((it) => (size += it.size || 0));
          if (shown.length) props.push(dpProp('Total size', A.util.fmtBytes(size)));
        } else if (L.kind === 'search' && L.query != null) {
          sub = 'Search for "' + L.query + '"';
        } else if (L.path) {
          const st = fs.stat(L.path);
          if (st) props.push(dpProp('Date modified', fmtDT(st.modified)));
        }
        if (filter) sub = 'Filtered by "' + filter + '"';
      }
      if (icon) iconBoxEl.appendChild(A.img(icon));
      dpane.replaceChildren(iconBoxEl, h('div.ex-dp-head', null, h('div.ex-dp-name', null, name), sub ? h('div.ex-dp-type', null, sub) : null), h('div.ex-dp-props', null, props));
    }

    // ------------------------------------------------------------ actions
    function openItem(it, o = {}) {
      if (!it) return;
      if (it.recycled) { recycledOpen(it); return; }
      if (it.kind === 'sysfile') { jokes.sysfile(win, it.name); return; }
      if (it.open) { A.sound.play('click'); it.open(); return; }
      if (it.loc && it.isFolder) {
        if (o.newWindow) { if (it.loc === 'dvd:d') discJoke(win); else A.apps.launch('explorer', { path: it.loc }); }
        else navigate(it.loc);
        return;
      }
      if (it.path) { A.sound.play('click'); A.apps.openFile(it.path); }
    }
    function openItems(list) {
      const folders = list.filter((it) => it.isFolder && it.loc);
      const rest = list.filter((it) => !(it.isFolder && it.loc));
      rest.forEach((it) => openItem(it));
      if (folders.length === 1 && !rest.length) openItem(folders[0]);
      else folders.forEach((it) => openItem(it, { newWindow: true }));
    }
    async function recycledOpen(it) {
      const r = await A.ui.messageBox({
        parent: win, title: 'Recycle Bin', icon: fs.iconFor(RECYCLE), instruction: 'This item is in the Recycle Bin',
        message: `To open ${it.name}, restore it first. It will go back to ${prettyPath(it.origin ? fs.dirname(it.origin) : '/Desktop')}.`,
        buttons: [{ label: 'Restore', value: 'restore', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }],
      });
      if (r === 'restore') restoreItems([it]);
    }
    function restoreItems(list) {
      const paths = list.filter((it) => it.recycled).map((it) => it.path);
      if (!paths.length) return;
      restorePaths(paths);
    }
    async function restoreAll() {
      const n = fs.recycleCount();
      if (!n) return;
      const r = await A.ui.messageBox({
        parent: win, icon: 'question', title: 'Restore All Items',
        instruction: n === 1 ? 'Do you want to restore this item?' : `Do you want to restore all ${n} items?`,
        message: 'Everything goes back to the folder it came from.',
        buttons: [{ label: 'Restore', value: 'yes', default: true }, { label: 'Cancel', value: 'no', cancel: true }],
      });
      if (r !== 'yes') return;
      restorePaths(fs.list(RECYCLE).map((st) => st.path));
    }
    async function deleteItems(list, o = {}) {
      list = list.filter(Boolean);
      const searches = list.filter((it) => it.kind === 'search' && it.saved != null);
      if (searches.length) {
        const drop = new Set(searches.map((it) => it.saved));
        A.store.set('explorer.searches', (A.store.get('explorer.searches', []) || []).filter((s, i) => !drop.has(i)));
        A.sound.play('recycle');
        renderContent(true);
      }
      const paths = list.filter((it) => it.path && deletable(it)).map((it) => it.path);
      if (!paths.length) {
        if (!searches.length && list.some((it) => it.path)) errorBox(win, 'This folder cannot be deleted. Aerium keeps it safe for you.', 'Delete');
        return;
      }
      const inBin = paths.every((p) => p.startsWith(RECYCLE + '/'));
      if (inBin || o.permanent) {
        const n = paths.length;
        const r = await A.ui.messageBox({
          parent: win, icon: 'warning', title: n === 1 ? 'Delete File' : 'Delete Multiple Items',
          instruction: n === 1 ? `Are you sure you want to permanently delete this ${fs.isDir(paths[0]) ? 'folder' : 'file'}?` : `Are you sure you want to permanently delete these ${n} items?`,
          message: n === 1 ? labelFor(fs.basename(inBin ? ((byKey.get(paths[0]) || {}).origin || paths[0]) : paths[0])) : 'You will not be able to get them back.',
          buttons: [{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no', cancel: true }],
        });
        if (r !== 'yes') return;
        removePaths(paths, win, { permanent: true });
      } else removePaths(paths, win);
      sel = new Set();
    }
    function cutCopy(mode, list = selected()) {
      const paths = list.filter((it) => it.path && !it.recycled).map((it) => it.path);
      if (!paths.length) return;
      setClip(mode, paths);
      if (mode === 'copy') A.sound.play('click');
    }
    function paste(dest) {
      dest = dest || L.path;
      if (!dest || dest === RECYCLE || !shared.clip.mode) return;
      const paths = shared.clip.paths.filter((p) => fs.exists(p));
      if (!paths.length) return;
      let made;
      if (shared.clip.mode === 'cut') { made = movePaths(paths, dest, win); setClip(null, []); }
      else made = copyPaths(paths, dest, win);
      if (dest === L.path && made.length) { renderContent(true); selectPaths(made); }
    }
    function pasteShortcut() {
      if (!L.path || shared.clip.mode !== 'copy') return;
      const made = shared.clip.paths.filter((p) => fs.exists(p)).map((p) => createShortcut(p, L.path));
      renderContent(true);
      selectPaths(made);
    }
    function newItem(kind) {
      if (!L.canCreate || !L.path) return;
      let p;
      try {
        if (kind === 'folder') p = fs.mkdir(fs.join(L.path, fs.uniqueName(L.path, 'New Folder')));
        else p = fs.write(fs.join(L.path, fs.uniqueName(L.path, 'New Text Document.txt')), '', { mime: 'text/plain' });
      } catch (e) { errorBox(win, e.message, 'New'); return; }
      pushUndo('Undo New', () => fs.exists(p) && fs.remove(p, { permanent: true }));
      if (filter) { filter = ''; searchInput.value = ''; updateSearchBtn(); }
      renderContent(true);
      selectPaths([p]);
      startRename(byKey.get(p));
    }
    function startRename(it) {
      if (!it || !renamable(it)) return;
      const el = elByKey.get(it.key);
      if (!el) return;
      if (renaming) renaming.cancel();
      scrollToKey(it.key);
      const label = el.querySelector('.ex-item-name');
      const full = it.path ? fs.basename(it.path) : it.name;
      const ta = h('textarea.ex-rename', { spellcheck: false, rows: 1, 'aria-label': 'New name' });
      ta.value = full;
      label.replaceWith(ta);
      el.classList.add('ex-renaming');
      const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
      fit();
      ta.focus();
      const dot = full.lastIndexOf('.');
      ta.setSelectionRange(0, it.path && !it.isFolder && dot > 0 ? dot : full.length);
      let done = false;
      const finish = (commit) => {
        if (done) return;
        done = true;
        renaming = null;
        const v = ta.value.replace(/[\r\n]+/g, '').trim();
        let np = null;
        if (commit && v && v !== full) {
          if (it.kind === 'search') {
            const list = (A.store.get('explorer.searches', []) || []).slice();
            if (list[it.saved]) { list[it.saved] = Object.assign({}, list[it.saved], { name: v }); A.store.set('explorer.searches', list); }
          } else np = renamePath(it.path, v, win);
        }
        renderContent(true);
        if (np) selectPaths([np]);
        else if (byKey.has(it.key)) selectOnly(it.key);
        if (win.el.contains(document.activeElement) || document.activeElement === document.body) content.focus({ preventScroll: true });
        if (pendingRefresh) { pendingRefresh = false; scheduleRefresh(); }
      };
      renaming = { it, cancel: () => finish(false) };
      ta.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      });
      ta.addEventListener('input', () => {
        if (BAD_CHARS.test(ta.value)) {
          const pos = ta.selectionStart;
          const before = ta.value.length;
          ta.value = ta.value.replace(BAD_CHARS, '');
          const at = Math.max(0, pos - (before - ta.value.length));
          ta.setSelectionRange(at, at);
          balloon(ta, 'A file name can\'t contain any of the following characters:\n\\ / : * ? " < > |');
          A.sound.play('ding');
        }
        BAD_CHARS.lastIndex = 0;
        fit();
      });
      ta.addEventListener('blur', () => finish(true));
      ta.addEventListener('pointerdown', (e) => e.stopPropagation());
      ta.addEventListener('dblclick', (e) => e.stopPropagation());
      ta.addEventListener('contextmenu', (e) => e.stopPropagation());
    }
    let balloonEl = null, balloonT = null;
    function balloon(anchorEl, text) {
      if (balloonEl) balloonEl.remove();
      clearTimeout(balloonT);
      const r = anchorEl.getBoundingClientRect();
      balloonEl = h('div.ex-balloon', { role: 'alert' }, A.img('icons/info'), h('span', null, text));
      document.getElementById('ae-overlays').appendChild(balloonEl);
      balloonEl.style.left = clamp(r.left, 6, window.innerWidth - balloonEl.offsetWidth - 6) + 'px';
      balloonEl.style.top = Math.min(window.innerHeight - balloonEl.offsetHeight - 6, r.bottom + 10) + 'px';
      balloonT = setTimeout(() => { if (balloonEl) { balloonEl.remove(); balloonEl = null; } }, 4200);
    }
    function refresh() {
      content.classList.add('ex-refreshing');
      setTimeout(() => {
        if (closed) return;
        content.classList.remove('ex-refreshing');
        liveRefresh();
      }, 110);
    }
    function liveRefresh() {
      if (closed) return;
      if (L.path && !fs.isDir(L.path)) {
        let p = L.path;
        while (p !== '/' && !fs.isDir(p)) p = fs.dirname(p);
        hist[hi] = p;
        navigate(p, { history: false, silent: true });
        return;
      }
      const R = resolve(L.loc);
      if (R) L = R;
      win.setTitle(titleText());
      win.setIcon(L.icon);
      renderAddress();
      renderFavs();
      renderTree();
      renderContent(true);
      updateNavButtons();
    }
    const scheduleRefresh = A.util.debounce(() => {
      if (closed) return;
      if (renaming || activeDrag) { pendingRefresh = true; return; }
      liveRefresh();
    }, 40);
    const scheduleTree = A.util.debounce(() => { if (!closed && !activeDrag) renderTree(); }, 80);

    // ------------------------------------------------------------ context menus
    function openWithMenu(it) {
      const apps = A.apps.list({ includeHidden: true }).filter((a) => (a.fileTypes || []).includes(it.ext));
      const m = apps.map((a) => ({ label: a.name, icon: a.icon, onClick: () => { A.apps.rememberRecentFile && A.apps.rememberRecentFile(it.path); A.apps.launch(a.id, { path: it.path }); } }));
      if (!apps.some((a) => a.id === 'notepad') && A.apps.get('notepad') && !isPic(it.path) && !isMusic(it.path)) m.push({ label: 'Notepad', icon: 'icons/notepad', onClick: () => A.apps.launch('notepad', { path: it.path }) });
      if (!m.length) m.push({ label: 'No programs found', disabled: true });
      m.push({ separator: true }, { label: 'Choose Default Program...', disabled: true });
      return m;
    }
    function sendToMenu(list) {
      const paths = list.filter((it) => it.path).map((it) => it.path);
      return [
        { label: 'Desktop (create shortcut)', icon: 'icons/folder-desktop', onClick: () => { paths.forEach((p) => createShortcut(p, '/Desktop')); A.sound.play('click'); } },
        { label: 'Documents', icon: 'icons/folder-documents', disabled: paths.every((p) => fs.dirname(p) === '/Documents'), onClick: () => copyPaths(paths, '/Documents', win) },
        { label: 'Mail Recipient', icon: 'icons/mail', onClick: () => jokes.email(win, paths.length) },
        { separator: true },
        { label: DRIVE_D, icon: ICONS.dvd, onClick: () => jokes.burn(win) },
      ];
    }
    function itemMenu(list) {
      if (!list.length) return backgroundMenu();
      const one = list.length === 1 ? list[0] : null;
      if (list.every((it) => it.recycled)) {
        return [
          { label: 'Restore', bold: true, onClick: () => restoreItems(list) },
          { separator: true },
          { label: 'Delete', onClick: () => deleteItems(list) },
          { separator: true },
          { label: 'Properties', onClick: () => propertiesDialog(win, list, L) },
        ];
      }
      if (one && one.kind === 'drive') {
        return [
          { label: 'Open', bold: true, onClick: () => openItem(one) },
          { label: 'Open in New Window', onClick: () => openItem(one, { newWindow: true }) },
          { separator: true },
          { label: 'Disk Cleanup', icon: 'icons/sync', onClick: () => diskCleanup(win) },
          { label: 'Format...', onClick: () => jokes.format(win) },
          { separator: true },
          { label: 'Properties', onClick: () => propertiesDialog(win, [one], L) },
        ];
      }
      if (one && one.kind === 'dvd') {
        return [
          { label: 'Open', bold: true, onClick: () => discJoke(win) },
          { label: 'Eject', onClick: () => { A.sound.play('click'); A.ui.messageBox({ parent: win, title: DRIVE_D, icon: ICONS.dvd, instruction: 'The tray is open', message: 'It makes a very convincing cup holder, but please use a coaster.', sound: false }); } },
          { separator: true },
          { label: 'Properties', onClick: () => propertiesDialog(win, [one], L) },
        ];
      }
      if (one && one.kind === 'app') {
        return [
          { label: 'Open', bold: true, onClick: () => openItem(one) },
          { label: 'Run as administrator', icon: 'icons/shield', onClick: () => runAsAdmin(win, one) },
          { separator: true },
          { label: 'Properties', onClick: () => propertiesDialog(win, [one], L) },
        ];
      }
      if (list.some((it) => !it.path)) {
        const m = [{ label: 'Open', bold: true, onClick: () => openItems(list) }];
        if (one && one.loc) m.push({ label: 'Open in New Window', onClick: () => openItem(one, { newWindow: true }) });
        if (list.every((it) => it.kind === 'search' && it.saved != null)) m.push({ separator: true }, { label: 'Delete', onClick: () => deleteItems(list) }, { label: 'Rename', disabled: !one, onClick: () => startRename(one) });
        m.push({ separator: true }, { label: 'Properties', onClick: () => propertiesDialog(win, list, L) });
        return m;
      }
      const m = [{ label: 'Open', bold: true, onClick: () => openItems(list) }];
      if (one && one.isFolder) m.push({ label: 'Open in New Window', onClick: () => openItem(one, { newWindow: true }) });
      if (one && !one.isFolder) {
        const real = one.target || one.path;
        if (isPic(real)) {
          m.push({ label: 'Preview', onClick: () => A.apps.launch('photos', { path: real }) });
          m.push({ label: 'Edit', onClick: () => A.apps.launch('paint', { path: real }) });
          m.push({ label: 'Set as Desktop Background', onClick: () => setWallpaper(real) });
          m.push({ separator: true }, { label: 'Rotate Clockwise', onClick: () => { rotateStored(real, 90); renderContent(true); } }, { label: 'Rotate Counterclockwise', onClick: () => { rotateStored(real, -90); renderContent(true); } });
        } else if (isText(real)) {
          m.push({ label: 'Edit', onClick: () => A.apps.launch('notepad', { path: real }) });
          m.push({ label: 'Print', onClick: () => jokes.print(win) });
        } else if (isMusic(real)) {
          m.push({ label: 'Play', onClick: () => openItem(one) });
        }
        if (!one.shortcut) m.push({ label: 'Open With', submenu: () => openWithMenu(one) });
      }
      if (one && one.isFolder) m.push({ separator: true }, { label: 'Restore previous versions', onClick: () => jokes.previous(win) });
      m.push({ separator: true }, { label: 'Send To', submenu: () => sendToMenu(list) });
      m.push({ separator: true });
      m.push({ label: 'Cut', onClick: () => cutCopy('cut', list) }, { label: 'Copy', onClick: () => cutCopy('copy', list) });
      if (one && one.isFolder) m.push({ label: 'Paste', disabled: !shared.clip.mode, onClick: () => paste(one.path) });
      m.push({ separator: true });
      m.push({ label: 'Create Shortcut', disabled: !L.canCreate, onClick: () => { const made = list.map((it) => createShortcut(it.path, L.path)); renderContent(true); selectPaths(made); } });
      m.push({ label: 'Delete', disabled: !list.some(deletable), onClick: () => deleteItems(list) });
      m.push({ label: 'Rename', disabled: !(one && renamable(one)), onClick: () => startRename(one) });
      m.push({ separator: true }, { label: 'Properties', onClick: () => propertiesDialog(win, list, L) });
      return m;
    }
    function backgroundMenu() {
      const cur = stopOf(view);
      const u = shared.undo[shared.undo.length - 1];
      const m = [
        { label: 'View', submenu: STOPS.map((st) => ({ label: st.label, radio: true, checked: cur === st.id, onClick: () => setView({ mode: st.mode, size: st.size }) })) },
      ];
      if (!L.grouped) {
        m.push({ label: 'Sort By', submenu: L.columns.map((id) => ({ label: COLS[id].label, radio: true, checked: view.sort.key === id, onClick: () => sortBy(id, view.sort.dir) }))
          .concat([{ separator: true }, { label: 'Ascending', radio: true, checked: view.sort.dir > 0, onClick: () => sortBy(view.sort.key, 1) }, { label: 'Descending', radio: true, checked: view.sort.dir < 0, onClick: () => sortBy(view.sort.key, -1) }]) });
      }
      m.push({ label: 'Refresh', shortcut: 'F5', onClick: refresh }, { separator: true });
      if (L.kind === 'recycle') {
        m.push({ label: 'Empty Recycle Bin', disabled: !fs.recycleCount(), onClick: () => emptyBin(win) }, { label: 'Restore All Items', disabled: !fs.recycleCount(), onClick: restoreAll });
      } else {
        m.push({ label: 'Paste', shortcut: 'Ctrl+V', disabled: !canPaste(), onClick: () => paste() });
        m.push({ label: 'Paste Shortcut', disabled: !(canPaste() && shared.clip.mode === 'copy'), onClick: pasteShortcut });
        m.push({ label: u ? u.label : 'Undo', shortcut: 'Ctrl+Z', disabled: !u, onClick: () => undoLast(win) });
        m.push({ separator: true });
        m.push({ label: 'New', disabled: !L.canCreate, submenu: [
          { label: 'Folder', icon: 'icons/folder', onClick: () => newItem('folder') },
          { separator: true },
          { label: 'Text Document', icon: 'icons/notepad', onClick: () => newItem('text') },
        ] });
      }
      m.push({ separator: true }, { label: 'Properties', onClick: () => propertiesDialog(win, [], L) });
      return m;
    }
    content.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (e.target.closest('.ex-colhead, .ex-rename')) return;
      const el = e.target.closest('.ex-item');
      if (el && elByKey.get(el.dataset.key) === el) {
        if (!sel.has(el.dataset.key)) selectOnly(el.dataset.key);
        A.ui.menu(itemMenu(selected()), e.clientX, e.clientY);
      } else {
        if (!e.ctrlKey && sel.size) selectOnly(null);
        A.ui.menu(backgroundMenu(), e.clientX, e.clientY);
      }
    });

    // ------------------------------------------------------------ pointer: items, marquee, drag
    let clickOnly = null;
    itemsEl.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.ex-item');
      if (!el || e.target.closest('.ex-rename, .ex-stars')) return;
      const key = el.dataset.key;
      content.focus({ preventScroll: true });
      clickOnly = null;
      if (e.button === 2) { if (!sel.has(key)) selectOnly(key); return; }
      if (e.button !== 0) return;
      if (e.shiftKey) selectRange(anchor || key, key, e.ctrlKey || e.metaKey);
      else if (e.ctrlKey || e.metaKey) toggleSel(key);
      else if (!sel.has(key)) selectOnly(key);
      else { clickOnly = key; focusKey = key; anchor = key; applySelection(true); }
      startItemDrag(e);
    });
    itemsEl.addEventListener('dblclick', (e) => {
      const el = e.target.closest('.ex-item');
      if (!el || e.target.closest('.ex-rename, .ex-stars') || e.ctrlKey || e.shiftKey) return;
      const it = byKey.get(el.dataset.key);
      if (it) openItem(it);
    });
    content.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      if (e.target.closest('.ex-item, .ex-colhead, .ex-banner, .ex-rename')) return;
      const r = content.getBoundingClientRect();
      if (e.clientX - r.left >= content.clientWidth || e.clientY - r.top >= content.clientHeight) return;
      content.focus({ preventScroll: true });
      if (e.button === 0) { e.preventDefault(); startMarquee(e); }
    });
    let marqueeStop = null;
    function startMarquee(e) {
      const additive = e.ctrlKey || e.metaKey || e.shiftKey;
      const base0 = additive ? new Set(sel) : new Set();
      const pt = (ev) => { const r = content.getBoundingClientRect(); return { x: ev.clientX - r.left + content.scrollLeft, y: ev.clientY - r.top + content.scrollTop }; };
      const start = pt(e);
      let last = e, moved = false, raf = null;
      const update = () => {
        const p = pt(last);
        const maxX = content.scrollWidth, maxY = content.scrollHeight;
        p.x = clamp(p.x, 0, maxX); p.y = clamp(p.y, 0, maxY);
        const l = Math.min(start.x, p.x), t = Math.min(start.y, p.y), w = Math.abs(p.x - start.x), hh = Math.abs(p.y - start.y);
        Object.assign(marquee.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: hh + 'px' });
        const cr = content.getBoundingClientRect();
        const next = new Set(base0);
        elByKey.forEach((el, key) => {
          const q = el.getBoundingClientRect();
          const ql = q.left - cr.left + content.scrollLeft, qt = q.top - cr.top + content.scrollTop;
          const hit = ql < l + w && ql + q.width > l && qt < t + hh && qt + q.height > t;
          if (hit) { if (additive && (e.ctrlKey || e.metaKey) && base0.has(key)) next.delete(key); else next.add(key); }
        });
        if (next.size !== sel.size || [...next].some((k) => !sel.has(k))) { sel = next; applySelection(true); }
      };
      const tick = () => {
        raf = null;
        if (!moved) return;
        const cr = content.getBoundingClientRect();
        const bottom = cr.top + content.clientHeight, right = cr.left + content.clientWidth;
        let dy = 0, dx = 0;
        if (last.clientY < cr.top + 12) dy = -Math.min(26, (cr.top + 12 - last.clientY) / 2 + 3);
        else if (last.clientY > bottom - 12) dy = Math.min(26, (last.clientY - bottom + 12) / 2 + 3);
        if (last.clientX < cr.left + 12) dx = -Math.min(26, (cr.left + 12 - last.clientX) / 2 + 3);
        else if (last.clientX > right - 12) dx = Math.min(26, (last.clientX - right + 12) / 2 + 3);
        const st = content.scrollTop, sl = content.scrollLeft;
        if (dy) content.scrollTop += dy;
        if (dx) content.scrollLeft += dx;
        if (content.scrollTop !== st || content.scrollLeft !== sl) update();
        if (dx || dy) raf = requestAnimationFrame(tick);
      };
      const move = (ev) => {
        last = ev;
        if (!moved) {
          const p = pt(ev);
          if (Math.hypot(p.x - start.x, p.y - start.y) < 4) return;
          moved = true;
          marquee.style.display = 'block';
          document.body.classList.add('ae-dragging');
          if (!additive && sel.size) { sel = new Set(); applySelection(true); }
        }
        update();
        if (!raf) raf = requestAnimationFrame(tick);
      };
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
        if (raf) cancelAnimationFrame(raf);
        marqueeStop = null;
        marquee.style.display = 'none';
        document.body.classList.remove('ae-dragging');
        if (moved) {
          const inOrder = shown.filter((it) => sel.has(it.key));
          focusKey = anchor = inOrder.length ? inOrder[inOrder.length - 1].key : null;
          applySelection();
        } else if (!additive) selectOnly(null);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
      marqueeStop = stop;
    }

    function dropTargetAt(x, y, paths) {
      const stack = document.elementsFromPoint(x, y);
      const topEl = stack[0];
      if (!topEl) return null;
      const t = topEl.closest('[data-exdrop]');
      if (t) {
        const dest = t.dataset.exdrop;
        if (!fs.isDir(dest)) return null;
        if (paths.some((p) => p === dest || dest.startsWith(p + '/'))) return null;
        return { el: t, dest, label: t.dataset.exlabel || fs.basename(dest) || userName(), same: paths.every((p) => fs.dirname(p) === dest) };
      }
      if (topEl.closest('.win, .ae-menu, #ae-taskbar')) return null;
      const dk = topEl.closest('.dk-icon');
      if (dk) {
        const dest = dk.item && dk.item.drop;
        if (!dest || !fs.isDir(dest) || paths.some((p) => p === dest || dest.startsWith(p + '/'))) return null;
        return { el: dk, dest, label: dk.item.name, desk: true, same: paths.every((p) => fs.dirname(p) === dest) };
      }
      if (topEl.closest('#ae-icons')) return { el: null, dest: '/Desktop', label: 'Desktop', same: paths.every((p) => fs.dirname(p) === '/Desktop') };
      return null;
    }
    function startItemDrag(e) {
      const sx = e.clientX, sy = e.clientY;
      let ghost = null, tipEl = null, target = null, copy = false, dragging = false, list = [];
      const pid = e.pointerId;
      const setTarget = (t) => {
        const prevEl = target && target.el;
        const nextEl = t && t.el;
        if (prevEl !== nextEl) {
          if (prevEl) prevEl.classList.remove('ex-drop-hover', 'drop-target');
          if (nextEl) nextEl.classList.add(t.desk ? 'drop-target' : 'ex-drop-hover');
        }
        target = t;
      };
      const label = () => {
        if (!target || target.same && !copy) return '';
        if (target.dest === RECYCLE) return 'Move to Recycle Bin';
        return (copy ? 'Copy to ' : 'Move to ') + target.label;
      };
      const begin = () => {
        list = selected().filter((it) => it.path && !it.recycled);
        if (!list.length) return false;
        dragging = true;
        activeDrag = true;
        document.body.classList.add('ae-dragging');
        list.forEach((it) => { const el = elByKey.get(it.key); if (el) el.classList.add('ex-dragging'); });
        const pics = list.slice(0, 3).map((it, i) => h('div.ex-ghost-card', { style: { '--i': i } }, it.thumb ? h('img.ex-ghost-thumb', { src: it.thumb, alt: '' }) : A.img(it.icon)));
        tipEl = h('div.ex-ghost-tip');
        ghost = h('div.ex-ghost', null, h('div.ex-ghost-stack', null, pics, list.length > 1 ? h('span.ex-ghost-count', null, String(list.length)) : null), tipEl);
        document.getElementById('ae-overlays').appendChild(ghost);
        return true;
      };
      const move = (ev) => {
        if (ev.pointerId !== pid) return;
        if (!dragging) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
          if (!begin()) { cleanup(); return; }
          clickOnly = null;
        }
        copy = ev.ctrlKey || ev.metaKey;
        ghost.style.transform = `translate(${ev.clientX + 12}px, ${ev.clientY + 10}px)`;
        setTarget(dropTargetAt(ev.clientX, ev.clientY, list.map((it) => it.path)));
        const text = label();
        tipEl.textContent = text;
        tipEl.hidden = !text;
        ghost.classList.toggle('copy', copy && !!text);
        autoScroll(ev);
      };
      const keys = (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); setTarget(null); up({ pointerId: pid, cancel: true }); } };
      const up = (ev) => {
        if (ev.pointerId !== pid) return;
        cleanup();
        if (!dragging) {
          if (clickOnly && !ev.cancel) selectOnly(clickOnly);
          clickOnly = null;
          return;
        }
        const t = target;
        setTarget(null);
        list.forEach((it) => { const el = elByKey.get(it.key); if (el) el.classList.remove('ex-dragging'); });
        if (ghost) ghost.remove();
        document.body.classList.remove('ae-dragging');
        activeDrag = null;
        if (!ev.cancel && t && !(t.same && !copy)) {
          const paths = list.map((it) => it.path);
          if (t.dest === RECYCLE) removePaths(paths, win);
          else if (copy) copyPaths(paths, t.dest, win);
          else movePaths(paths, t.dest, win);
        }
        if (pendingRefresh) { pendingRefresh = false; scheduleRefresh(); }
      };
      function cleanup() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        window.removeEventListener('keydown', keys, true);
        dragStop = null;
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      window.addEventListener('keydown', keys, true);
      dragStop = () => up({ pointerId: pid, cancel: true });
    }
    let dragStop = null;
    function autoScroll(ev) {
      const cr = content.getBoundingClientRect();
      if (ev.clientX < cr.left || ev.clientX > cr.right) return;
      if (ev.clientY < cr.top + 18 && ev.clientY > cr.top - 30) content.scrollTop -= 12;
      else if (ev.clientY > cr.top + content.clientHeight - 18 && ev.clientY < cr.bottom + 30) content.scrollTop += 12;
    }
    content.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      // Ctrl + wheel slides through the views, like dragging the Views slider.
      const pos = viewToPos(view);
      const step = e.deltaY < 0 ? -0.25 : 0.25;
      let np = pos + step;
      if (pos > 2 || np > 2) np = e.deltaY < 0 ? Math.ceil(pos) - 1 : Math.floor(pos) + 1;
      setView(posToView(clamp(np, 0, 6), np > 2));
    }, { passive: false });

    // ------------------------------------------------------------ keyboard
    let taBuf = '', taTime = 0;
    function typeAhead(ch) {
      const now = Date.now();
      taBuf = now - taTime > 900 ? ch : taBuf + ch;
      taTime = now;
      const q = taBuf.toLowerCase();
      const allSame = q.split('').every((c) => c === q[0]);
      const start = Math.max(0, shown.findIndex((x) => x.key === focusKey));
      const rotated = (from) => shown.slice(from).concat(shown.slice(0, from));
      const hit = allSame ? rotated(start + 1).find((x) => String(x.name).toLowerCase().startsWith(q[0]))
        : rotated(start).find((x) => String(x.name).toLowerCase().startsWith(q));
      if (hit) { selectOnly(hit.key); scrollToKey(hit.key); }
    }
    function neighbor(idx, k) {
      const mode = view.mode;
      const n = shown.length;
      if (mode === 'details') { if (k === 'ArrowUp') return Math.max(0, idx - 1); if (k === 'ArrowDown') return Math.min(n - 1, idx + 1); return null; }
      if (mode === 'list' && (k === 'ArrowUp' || k === 'ArrowDown')) return clamp(idx + (k === 'ArrowUp' ? -1 : 1), 0, n - 1);
      if (mode !== 'list' && (k === 'ArrowLeft' || k === 'ArrowRight')) return clamp(idx + (k === 'ArrowLeft' ? -1 : 1), 0, n - 1);
      const el = elByKey.get(shown[idx].key);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let best = null, bestScore = Infinity;
      shown.forEach((it, i) => {
        if (i === idx) return;
        const q = elByKey.get(it.key);
        if (!q) return;
        const b = q.getBoundingClientRect();
        const dx = b.left + b.width / 2 - cx, dy = b.top + b.height / 2 - cy;
        let pri, sec;
        if (k === 'ArrowUp') { if (dy > -4) return; pri = -dy; sec = Math.abs(dx); }
        else if (k === 'ArrowDown') { if (dy < 4) return; pri = dy; sec = Math.abs(dx); }
        else if (k === 'ArrowLeft') { if (dx > -4) return; pri = -dx; sec = Math.abs(dy); }
        else { if (dx < 4) return; pri = dx; sec = Math.abs(dy); }
        const score = pri + sec * 3;
        if (score < bestScore) { bestScore = score; best = i; }
      });
      return best;
    }
    function moveFocus(k, shift, ctrl) {
      if (!shown.length) return;
      const idx = focusKey ? shown.findIndex((x) => x.key === focusKey) : -1;
      let next;
      if (idx < 0) next = 0;
      else if (k === 'Home') next = 0;
      else if (k === 'End') next = shown.length - 1;
      else if (k === 'PageUp' || k === 'PageDown') {
        const el = elByKey.get(shown[idx].key);
        const rowH = el ? el.offsetHeight || 22 : 22;
        const perPage = Math.max(1, Math.floor(content.clientHeight / rowH));
        let perRow = 1;
        if (view.mode !== 'details' && view.mode !== 'list') {
          const y0 = elByKey.get(shown[0].key).offsetTop;
          perRow = Math.max(1, shown.filter((it) => elByKey.get(it.key).offsetTop === y0).length);
        }
        next = clamp(idx + (k === 'PageDown' ? 1 : -1) * perPage * perRow, 0, shown.length - 1);
      } else next = neighbor(idx, k);
      if (next == null || next < 0) return;
      const key = shown[next].key;
      if (shift) selectRange(anchor || (idx >= 0 ? shown[idx].key : key), key, ctrl);
      else if (ctrl) { focusKey = key; applySelection(true); }
      else selectOnly(key);
      scrollToKey(key);
    }
    function keyboardMenu() {
      const list = selected();
      const el = list.length ? elByKey.get(focusKey || list[0].key) : null;
      const r = (el || content).getBoundingClientRect();
      A.ui.menu(list.length ? itemMenu(list) : backgroundMenu(), r.left + Math.min(40, r.width / 2), r.top + Math.min(r.height, 24));
    }
    content.addEventListener('keydown', contentKey);
    function contentKey(e) {
      if (A.util.isTyping(e)) return;
      const k = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const low = k.length === 1 ? k.toLowerCase() : k;
      if (/^Arrow/.test(k) && e.altKey) return;
      if (/^Arrow/.test(k) || k === 'Home' || k === 'End' || k === 'PageUp' || k === 'PageDown') { e.preventDefault(); moveFocus(k, e.shiftKey, ctrl); }
      else if (k === 'Enter' && !e.altKey) { e.preventDefault(); const list = selected(); if (list.length) openItems(list); }
      else if (k === 'Delete') { e.preventDefault(); deleteItems(selected(), { permanent: e.shiftKey }); }
      else if (k === 'F2') { e.preventDefault(); const list = selected(); if (list.length === 1) startRename(list[0]); }
      else if (k === 'Backspace') { e.preventDefault(); goUp(); }
      else if (ctrl && !e.shiftKey && low === 'a') { e.preventDefault(); selectAll(); }
      else if (ctrl && low === 'c') { e.preventDefault(); cutCopy('copy'); }
      else if (ctrl && low === 'x') { e.preventDefault(); cutCopy('cut'); }
      else if (ctrl && low === 'v') { e.preventDefault(); paste(); }
      else if (ctrl && low === 'z') { e.preventDefault(); undoLast(win); }
      else if (k === ' ' && ctrl && focusKey) { e.preventDefault(); toggleSel(focusKey); }
      else if ((k === 'F10' && e.shiftKey) || k === 'ContextMenu') { e.preventDefault(); keyboardMenu(); }
      else if (k === 'Escape' && sel.size) { e.preventDefault(); selectOnly(null); }
      else if (k.length === 1 && !ctrl && !e.altKey && k !== ' ') { e.preventDefault(); typeAhead(k); }
    }
    win.el.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || closed) return;
      // Keys that land on the frame itself (after a title bar click) still reach the item view.
      if (e.target === win.el) { contentKey(e); if (e.defaultPrevented) { content.focus({ preventScroll: true }); return; } }
      const k = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const low = k.length === 1 ? k.toLowerCase() : k;
      const typing = A.util.isTyping(e);
      if ((e.altKey && k === 'ArrowLeft') || k === 'BrowserBack') { e.preventDefault(); goBack(); }
      else if ((e.altKey && k === 'ArrowRight') || k === 'BrowserForward') { e.preventDefault(); goForward(); }
      else if (e.altKey && k === 'ArrowUp') { e.preventDefault(); goUp(); }
      else if (k === 'F5' || (ctrl && low === 'r')) { e.preventDefault(); refresh(); }
      else if (k === 'F4' || (e.altKey && low === 'd') || (ctrl && low === 'l')) { e.preventDefault(); editAddress(); }
      else if (k === 'F3' || (ctrl && (low === 'f' || low === 'e'))) { e.preventDefault(); searchInput.focus(); searchInput.select(); }
      else if (ctrl && low === 'w') { e.preventDefault(); win.close(); }
      else if (ctrl && e.shiftKey && low === 'n') { e.preventDefault(); newItem('folder'); }
      else if (ctrl && low === 'n') { e.preventDefault(); A.apps.launch('explorer', { path: L.loc === 'dvd:d' ? 'computer' : L.loc }); }
      else if (e.altKey && k === 'Enter') { e.preventDefault(); propertiesDialog(win, selected(), L); }
      else if (!typing && k === 'Backspace') { e.preventDefault(); goUp(); }
    });

    // ------------------------------------------------------------ live updates
    function relevant(ev) {
      if (ev.type === 'reset' || !L) return true;
      if (L.kind === 'search' || L.kind === 'computer' || L.kind === 'searches') return true;
      if (L.path) {
        if (ev.dir === L.path || ev.path === L.path) return true;
        if (L.path.startsWith(ev.path + '/')) return true;
        if (ev.path.startsWith(L.path === '/' ? '/' : L.path + '/')) return true;
      }
      return false;
    }
    cleanups.push(fs.on((ev) => {
      if (closed) return;
      if (relevant(ev)) scheduleRefresh();
      else scheduleTree();
    }));
    cleanups.push(A.bus.on('fs:rename', (ev) => {
      if (!ev || !ev.from) return;
      const fix = (x) => (typeof x !== 'string' ? x : x === ev.from ? ev.to : x.startsWith(ev.from + '/') ? ev.to + x.slice(ev.from.length) : x);
      hist = hist.map(fix);
      sel = new Set([...sel].map(fix));
      anchor = fix(anchor);
      focusKey = fix(focusKey);
      [...expanded].forEach((x) => { const y = fix(x); if (y !== x) { expanded.delete(x); expanded.add(y); } });
      if (L && L.path && (L.path === ev.from || L.path.startsWith(ev.from + '/'))) { const R = resolve(fix(L.loc)); if (R) L = R; }
    }));
    cleanups.push(shared.ev.on('clip', () => {
      elByKey.forEach((el, k) => { const it = byKey.get(k); el.classList.toggle('ex-cut', !!(it && isCut(it))); });
    }));
    cleanups.push(A.store.on('photos.ratings', () => { if (!closed) renderDetails(); }));
    cleanups.push(A.store.on('photos.rotation', () => { if (!closed) scheduleRefresh(); }));
    cleanups.push(A.store.on('explorer.showExt', () => { if (!closed) liveRefresh(); }));
    cleanups.push(A.store.on('explorer.fullPath', () => { if (!closed) win.setTitle(titleText()); }));
    cleanups.push(A.store.on('explorer.searches', () => { if (!closed && L.kind === 'searches') scheduleRefresh(); }));
    cleanups.push(A.store.on('user.name', () => { if (!closed) liveRefresh(); }));
    cleanups.push(A.bus.on('apps:change', A.util.debounce(() => { if (!closed && L.folderType === 'programs') liveRefresh(); }, 60)));

    // ------------------------------------------------------------ start
    let start = args.path != null ? String(args.path) : '/';
    let selectAfter = null;
    if (start.startsWith('/') && fs.exists(start) && !fs.isDir(start)) { selectAfter = fs.normalize(start); start = fs.dirname(start); }
    if (!resolve(start) && start !== 'dvd:d') {
      const found = start.startsWith('/') ? findCaseInsensitive(start) : null;
      start = found && fs.isDir(found) ? found : '/';
    }
    if (start === 'dvd:d') { start = 'computer'; setTimeout(() => discJoke(win), 400); }
    navigate(start, { silent: true });
    if (selectAfter) selectPaths([selectAfter]);
    const q0 = args.search || args.q;
    if (q0) { searchInput.value = String(q0); updateSearchBtn(); runSearch(String(q0)); }
    setTimeout(() => { if (!closed && !win.el.contains(document.activeElement) || document.activeElement === win.el) content.focus({ preventScroll: true }); }, 60);

    return {
      onResize() { layoutList(); fitCrumbs(); fitCommands(); applyColWidths(); },
      onClose() {
        closed = true;
        cleanups.forEach((off) => { try { off(); } catch (e) { /* ignore */ } });
        if (marqueeStop) marqueeStop();
        if (dragStop) dragStop();
        closeViewsFly();
        if (balloonEl) balloonEl.remove();
        clearTimeout(balloonT);
      },
      onArgs(a) { if (a && a.path) navigate(a.path); },
    };
  }
})();
