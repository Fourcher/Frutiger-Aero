/* Aerium settings store: persisted JSON values in localStorage, with an
   in-memory fallback when storage is blocked (private windows, previews). */
(function () {
  'use strict';
  const A = window.Aerium;
  const PREFIX = 'aerium.v1.';
  const mem = new Map();
  let usable = true;
  try {
    const k = PREFIX + '__probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
  } catch (e) {
    usable = false;
  }

  const DEFAULTS = {
    'user.name': '',
    'user.avatar': 'avatars/avatar-fish',
    'user.created': false,
    theme: 'light',
    wallpaper: 'aquarium',
    'wallpaper.fit': 'fill',
    'glass.color': 'sky',
    'glass.custom': null,
    'glass.intensity': 46,
    'glass.transparency': true,
    'sound.enabled': true,
    'sound.volume': 70,
    'screensaver.id': 'bubbles',
    'screensaver.wait': 3,
    'screensaver.text': 'Aerium',
    'cursor.scheme': 'aerium',
    'cursor.trails': false,
    'desktop.iconSize': 'medium',
    'desktop.showIcons': true,
    'desktop.autoArrange': false,
    'desktop.positions': {},
    'aquarium.feedOnClick': true,
    'aquarium.fish': null,
    'boot.animation': true,
    'welcome.atStartup': true,
    'taskbar.pinned': ['browser', 'explorer', 'mediaplayer', 'messenger', 'paint'],
    'effects.level': 'best',
    gadgets: null,
    'recent.apps': [],
    'recent.files': [],
  };

  const store = {
    persistent: usable,
    get(key, fallback) {
      let raw = null;
      if (usable) {
        try { raw = localStorage.getItem(PREFIX + key); } catch (e) { raw = null; }
      } else if (mem.has(key)) raw = mem.get(key);
      if (raw == null) return fallback !== undefined ? fallback : clone(DEFAULTS[key]);
      try { return JSON.parse(raw); } catch (e) { return fallback !== undefined ? fallback : clone(DEFAULTS[key]); }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      let ok = true;
      if (usable) {
        try { localStorage.setItem(PREFIX + key, raw); } catch (e) { ok = false; mem.set(key, raw); }
      } else mem.set(key, raw);
      A.bus.emit('store:' + key, value);
      A.bus.emit('store', key, value);
      return ok;
    },
    remove(key) {
      if (usable) { try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ } }
      mem.delete(key);
      A.bus.emit('store:' + key, store.get(key));
    },
    on(key, fn) { return A.bus.on('store:' + key, fn); },
    reset() {
      if (usable) {
        try {
          Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
        } catch (e) { /* ignore */ }
      }
      mem.clear();
    },
    defaults: DEFAULTS,
  };
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  A.store = store;
})();
