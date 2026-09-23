/* Aerium app registry: apps register a definition and get launched into
   glass windows. Also owns file associations and Run-dialog aliases. */
(function () {
  'use strict';
  const A = window.Aerium;
  const registry = new Map();

  const ALIASES = {
    calc: 'calculator', mspaint: 'paint', pbrush: 'paint', notepad: 'notepad', write: 'notepad', wordpad: 'notepad',
    cmd: 'cmd', command: 'cmd', taskmgr: 'taskmgr', control: 'controlpanel', explorer: 'explorer', iexplore: 'browser',
    browser: 'browser', wmplayer: 'mediaplayer', msnmsgr: 'messenger', msn: 'messenger', winmine: 'minesweeper',
    sol: 'solitaire', solitaire: 'solitaire', minesweeper: 'minesweeper', stikynot: 'stickynotes', desk: 'personalize',
    'desk.cpl': 'personalize', sysdm: 'system', 'sysdm.cpl': 'system', winver: 'winver', photos: 'photos',
  };

  const apps = {
    registry,
    aliases: ALIASES,

    register(def) {
      if (!def || !def.id) throw new Error('App definition needs an id');
      const d = Object.assign({ name: def.id, icon: 'icons/aerium', category: 'accessories', window: {}, color: '#3aa6f5', fileTypes: [] }, def);
      registry.set(d.id, d);
      A.bus.emit('apps:change', d);
      return d;
    },

    get: (id) => registry.get(id) || registry.get(ALIASES[id]) || null,

    list(o = {}) {
      let out = Array.from(registry.values());
      if (!o.includeHidden) out = out.filter((a) => !a.hidden);
      if (o.category) out = out.filter((a) => a.category === o.category);
      return out.sort((a, b) => a.name.localeCompare(b.name));
    },

    launch(id, args = {}) {
      const def = apps.get(id);
      if (!def) {
        A.ui.messageBox({ title: 'Run', icon: 'error', message: `Aerium cannot find '${id}'. Make sure you typed the name correctly, and then try again.` });
        return null;
      }
      rememberRecent(def.id);
      if (def.single) {
        const existing = A.wm.byApp(def.id)[0];
        if (existing) {
          existing.focus();
          if (existing.ctrl && existing.ctrl.onArgs) existing.ctrl.onArgs(args);
          return existing;
        }
      }
      if (def.noWindow) {
        try { return def.launch(null, args) || null; } catch (e) { crash(def, e); return null; }
      }
      const w = def.window || {};
      const win = A.wm.create(Object.assign({}, w, { app: def.id, title: w.title || def.name, icon: def.icon }));
      let ctrl = {};
      try {
        ctrl = def.launch(win, args) || {};
      } catch (e) {
        win.close(true);
        crash(def, e);
        return null;
      }
      win.ctrl = ctrl;
      if (ctrl.beforeClose) win.beforeClose = ctrl.beforeClose;
      win.on('close', () => { try { ctrl.onClose && ctrl.onClose(); } catch (e) { console.error(e); } });
      if (ctrl.onResize) win.on('resize', () => ctrl.onResize());
      if (ctrl.onFocus) win.on('focus', () => ctrl.onFocus());
      if (ctrl.onBlur) win.on('blur', () => ctrl.onBlur());
      return win;
    },

    // Opens a file with the app associated with its extension.
    openFile(path, o = {}) {
      const fs = A.fs;
      if (!fs.exists(path)) {
        A.ui.messageBox({ icon: 'error', title: 'Aerium', message: `Aerium cannot find '${path}'. It may have been moved or deleted.` });
        return null;
      }
      if (fs.isDir(path)) return apps.launch('explorer', { path });
      const ext = fs.ext(path);
      if (ext === 'lnk') {
        const target = String(fs.read(path) || '');
        if (target.startsWith('app:')) return apps.launch(target.slice(4));
        if (target.startsWith('file:')) return apps.openFile(target.slice(5));
      }
      const appId = o.app || apps.appForExt(ext);
      if (!appId) {
        A.ui.messageBox({ icon: 'question', title: 'Aerium', instruction: 'Aerium cannot open this file', message: `File: ${fs.basename(path)}\n\nTo open this file, Aerium needs to know what program you want to use to open it.` });
        return null;
      }
      rememberRecentFile(path);
      return apps.launch(appId, { path });
    },

    appForExt(ext) {
      ext = String(ext || '').toLowerCase();
      for (const def of registry.values()) if ((def.fileTypes || []).includes(ext)) return def.id;
      return null;
    },

    running: () => Array.from(new Set(A.wm.windows.map((w) => w.app).filter(Boolean))),
  };

  function rememberRecent(id) {
    const list = A.store.get('recent.apps').filter((x) => x !== id);
    list.unshift(id);
    A.store.set('recent.apps', list.slice(0, 12));
  }
  function rememberRecentFile(path) {
    const list = A.store.get('recent.files').filter((x) => x !== path);
    list.unshift(path);
    A.store.set('recent.files', list.slice(0, 15));
  }

  // "Paint has stopped working": real errors get an era-appropriate dialog.
  function crash(def, err) {
    console.error('[Aerium] ' + def.id + ' crashed', err);
    A.ui.messageBox({
      title: def.name,
      icon: 'error',
      instruction: def.name + ' has stopped working',
      message: 'A problem caused the program to stop working correctly. Aerium will close the program and notify you if a solution is available.',
      detail: String((err && err.message) || err),
      buttons: ['Close program'],
    });
  }

  apps.rememberRecentFile = rememberRecentFile;
  A.apps = apps;
})();
