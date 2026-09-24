/* Aerium theming: the three Frutiger Aero schemes (Light, Dark, Technozen),
   window glass colorization, desktop wallpapers and pointer schemes. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;

  // Glass colors, after the era's "window color" swatches.
  const GLASS = [
    { id: 'sky', name: 'Sky', hex: '#74B8FC', h: 210, s: 96, l: 72, intensity: 46 },
    { id: 'twilight', name: 'Twilight', hex: '#0046AD', h: 216, s: 100, l: 34, intensity: 76 },
    { id: 'sea', name: 'Sea', hex: '#32CDCD', h: 180, s: 61, l: 50, intensity: 56 },
    { id: 'leaf', name: 'Leaf', hex: '#14A600', h: 113, s: 100, l: 33, intensity: 44 },
    { id: 'lime', name: 'Lime', hex: '#97D937', h: 84, s: 68, l: 53, intensity: 44 },
    { id: 'sun', name: 'Sun', hex: '#FADC0E', h: 52, s: 96, l: 52, intensity: 35 },
    { id: 'pumpkin', name: 'Pumpkin', hex: '#FF9C00', h: 37, s: 100, l: 50, intensity: 56 },
    { id: 'ruby', name: 'Ruby', hex: '#CE0F0F', h: 0, s: 86, l: 43, intensity: 76 },
    { id: 'fuchsia', name: 'Fuchsia', hex: '#FF0099', h: 324, s: 100, l: 50, intensity: 44 },
    { id: 'blush', name: 'Blush', hex: '#FCC7F8', h: 305, s: 90, l: 88, intensity: 49 },
    { id: 'violet', name: 'Violet', hex: '#6E3BA1', h: 270, s: 46, l: 43, intensity: 59 },
    { id: 'lavender', name: 'Lavender', hex: '#8D5A94', h: 293, s: 24, l: 47, intensity: 34 },
    { id: 'taupe', name: 'Taupe', hex: '#98844C', h: 44, s: 33, l: 45, intensity: 44 },
    { id: 'chocolate', name: 'Chocolate', hex: '#4F1B1B', h: 0, s: 49, l: 21, intensity: 76 },
    { id: 'slate', name: 'Slate', hex: '#555555', h: 0, s: 0, l: 33, intensity: 56 },
    { id: 'frost', name: 'Frost', hex: '#FCFCFC', h: 0, s: 0, l: 99, intensity: 35 },
  ];

  const THEMES = {
    light: { id: 'light', name: 'Aerium', desc: 'Daylight glass over clear skies and green hills.', glass: 'sky', wallpaper: 'aquarium' },
    dark: { id: 'dark', name: 'Aerium Night', desc: 'Dark Aero: smoked glass, navy skies and aurora glow.', glass: 'twilight', wallpaper: 'aurora-live' },
    technozen: { id: 'technozen', name: 'Technozen', desc: 'White, calm and rounded, like a living-room console.', glass: 'frost', wallpaper: 'technozen-live' },
  };

  const CURSORS = {
    aerium: { name: 'Aerium (default)', size: 1 },
    'aerium-large': { name: 'Aerium (large)', size: 1.5 },
    bubble: { name: 'Bubble', size: 1 },
    system: { name: 'System default', size: 0 },
  };

  function hslToRgb(hh, ss, ll) {
    ss /= 100; ll /= 100;
    const k = (n) => (n + hh / 30) % 12;
    const a = ss * Math.min(ll, 1 - ll);
    const f = (n) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }

  function cursorSVG(scheme, size) {
    if (scheme === 'bubble') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(32 * size)}" height="${Math.round(32 * size)}" viewBox="0 0 32 32"><defs><radialGradient id="b" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".6" stop-color="#8fd3ff" stop-opacity=".55"/><stop offset="1" stop-color="#1f8fe6" stop-opacity=".85"/></radialGradient></defs><path d="M2 2 L2 20 L7 15.5 L10.5 23 L13.5 21.6 L10 14.3 L16.5 14 Z" fill="url(#b)" stroke="#0b3d73" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="6" cy="7" rx="2" ry="3" fill="#fff" opacity=".85"/><circle cx="22" cy="24" r="5" fill="url(#b)" stroke="#fff" stroke-width=".8"/><circle cx="20.5" cy="22.5" r="1.4" fill="#fff"/></svg>`;
    }
    const s = size;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(24 * s)}" height="${Math.round(32 * s)}" viewBox="0 0 24 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe9f3"/></linearGradient><filter id="f" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1" dy="1.5" stdDeviation="1.1" flood-color="#001a33" flood-opacity=".45"/></filter></defs><path filter="url(#f)" d="M2 1.5 L2 22.5 L7.2 17.6 L10.9 26.2 L14.4 24.7 L10.8 16.3 L17.8 16.1 Z" fill="url(#g)" stroke="#000" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
  }

  // ------------------------------------------------------------ wallpapers
  const wallpapers = new Map();
  function registerWallpaper(def) {
    wallpapers.set(def.id, Object.assign({ group: 'Aerium', kind: 'image' }, def));
    A.bus.emit('wallpapers:change');
  }
  [
    ['clear-sky', 'Clear Sky', 'light'], ['meadow', 'Meadow', 'light'], ['sunrise', 'Sunrise', 'light'], ['ocean', 'Ocean', 'light'],
    ['water', 'Underwater', 'light'], ['bokeh-day', 'Bokeh', 'light'], ['vectorgarden', 'Garden', 'light'], ['technozen', 'Pearl', 'technozen'],
    ['aurora', 'Aurora', 'dark'], ['bokeh-night', 'Night Lights', 'dark'], ['dark-ribbons', 'Ribbons', 'dark'], ['deep-sea', 'Deep Sea', 'dark'],
  ].forEach(([id, name, t]) => registerWallpaper({ id, name, group: 'Aerium Wallpapers', kind: 'image', asset: 'imagery/' + id, theme: t }));

  let host = null;
  let current = null; // { id, layer, ctrl }
  let paused = false;

  function resolveWallpaper(id) {
    if (typeof id === 'string' && id.startsWith('file:')) {
      const path = id.slice(5);
      const src = A.fs.thumbFor(path);
      if (src) return { id, name: A.fs.basename(path), kind: 'image', src };
      return null;
    }
    return wallpapers.get(id) || null;
  }

  function mountWallpaper(id, instant) {
    if (!host) return;
    let def = resolveWallpaper(id);
    if (!def) def = wallpapers.get('aquarium') || wallpapers.get('clear-sky');
    if (current && current.id === def.id) return;
    const layer = h('div.wp-layer', { style: { opacity: '0' } });
    host.appendChild(layer);
    const fit = A.store.get('wallpaper.fit');
    let ctrl = null;
    if (def.kind === 'animated' && def.create) {
      try {
        ctrl = def.create(layer, { theme: document.documentElement.dataset.theme }) || null;
      } catch (e) {
        console.error('[Aerium] wallpaper failed', def.id, e);
      }
    } else if (def.kind === 'color') {
      layer.style.background = def.color;
    } else {
      const src = def.src || A.asset(def.asset);
      layer.classList.add('wp-fit-' + fit);
      layer.style.backgroundImage = `url("${src}")`;
    }
    const old = current;
    current = { id: def.id, layer, ctrl, def };
    if (instant || !old) {
      layer.style.opacity = '1';
      if (old) destroyLayer(old);
    } else {
      layer.style.opacity = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => (layer.style.opacity = '1')));
      setTimeout(() => destroyLayer(old), 900);
    }
    if (paused && ctrl && ctrl.pause) ctrl.pause();
    A.bus.emit('wallpaper:mounted', def);
  }
  function destroyLayer(w) {
    try { w.ctrl && w.ctrl.destroy && w.ctrl.destroy(); } catch (e) { /* ignore */ }
    w.layer.remove();
  }

  // ------------------------------------------------------------ API
  const theme = {
    GLASS,
    THEMES,
    CURSORS,
    wallpapers,
    registerWallpaper,
    get current() { return A.store.get('theme'); },

    apply() {
      const t = A.store.get('theme');
      document.documentElement.dataset.theme = THEMES[t] ? t : 'light';
      theme.applyGlass();
      theme.applyCursor();
      theme.applyEffects();
    },

    set(id) {
      if (!THEMES[id]) return;
      const prevTheme = A.store.get('theme');
      A.store.set('theme', id);
      document.documentElement.dataset.theme = id;
      if (prevTheme !== id) {
        theme.setGlass({ color: THEMES[id].glass });
        const wp = A.store.get('wallpaper');
        const def = wallpapers.get(wp);
        // Follow the theme's wallpaper when the current one belongs to another theme.
        if (!def || (def.theme && def.theme !== id) || wp === THEMES[prevTheme].wallpaper) theme.setWallpaper(THEMES[id].wallpaper);
      }
      A.bus.emit('theme:change', id);
    },

    glassColor() {
      const custom = A.store.get('glass.custom');
      if (custom) return custom;
      return GLASS.find((g) => g.id === A.store.get('glass.color')) || GLASS[0];
    },

    applyGlass() {
      const c = theme.glassColor();
      const intensity = clamp(A.store.get('glass.intensity'), 0, 100) / 100;
      const transparent = A.store.get('glass.transparency');
      const root = document.documentElement.style;
      // Intensity is the tint's alpha, from barely there to nearly solid.
      const alpha = 0.05 + intensity * 0.8;
      let hh = c.h, ss = c.s, ll = c.l;
      if (!transparent) {
        // Opaque glass: the color blended over light gray by its intensity.
        const rgb = hslToRgb(c.h, c.s, c.l).map((v) => Math.round(v * alpha + 235 * (1 - alpha)));
        [hh, ss, ll] = A.util.rgbToHsl(rgb[0], rgb[1], rgb[2]);
      }
      root.setProperty('--glass-h', hh);
      root.setProperty('--glass-s', ss + '%');
      root.setProperty('--glass-l', ll + '%');
      root.setProperty('--glass-a', transparent ? alpha.toFixed(3) : '1');
      root.setProperty('--glass-a-inactive', transparent ? (alpha * 0.6).toFixed(3) : '1');
      root.setProperty('--glass-blur', transparent ? '9px' : '0px');
      root.setProperty('--glass-line', ll > 80 ? 'rgba(40,60,80,.55)' : 'rgba(0,0,0,.55)');
      document.documentElement.classList.toggle('no-transparency', !transparent);
      A.bus.emit('glass:change', c);
    },

    setGlass(opts) {
      if (opts.color) {
        A.store.set('glass.color', opts.color);
        A.store.set('glass.custom', null);
        const preset = GLASS.find((g) => g.id === opts.color);
        if (preset && opts.intensity == null) A.store.set('glass.intensity', preset.intensity);
      }
      if (opts.custom) A.store.set('glass.custom', opts.custom);
      if (opts.intensity != null) A.store.set('glass.intensity', clamp(Math.round(opts.intensity), 0, 100));
      if (opts.transparency != null) A.store.set('glass.transparency', !!opts.transparency);
      theme.applyGlass();
    },

    applyCursor() {
      const scheme = A.store.get('cursor.scheme');
      const def = CURSORS[scheme] || CURSORS.aerium;
      const root = document.documentElement;
      if (!def.size) {
        root.style.removeProperty('--cursor-default');
      } else {
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cursorSVG(scheme, def.size));
        root.style.setProperty('--cursor-default', `url("${url}") 2 2, default`);
      }
      root.classList.toggle('cursor-custom', !!def.size);
      A.bus.emit('cursor:change', scheme);
    },

    applyEffects() {
      document.documentElement.classList.toggle('fx-lite', A.store.get('effects.level') === 'performance');
    },

    // ---- wallpaper host
    mountHost(el) {
      host = el;
      mountWallpaper(A.store.get('wallpaper'), true);
    },
    setWallpaper(id, fit) {
      if (fit) A.store.set('wallpaper.fit', fit);
      A.store.set('wallpaper', id);
      if (current && current.id === id && fit && current.layer) {
        current.layer.className = 'wp-layer wp-fit-' + fit;
        return;
      }
      if (current && current.id === id) return;
      mountWallpaper(id);
    },
    refreshWallpaper() {
      const id = A.store.get('wallpaper');
      if (current) { destroyLayer(current); current = null; }
      mountWallpaper(id, true);
    },
    currentWallpaper: () => (current ? current.def : null),
    wallpaperController: () => (current ? current.ctrl : null),
    pointer(type, x, y, e) {
      if (current && current.ctrl && current.ctrl.pointer) return current.ctrl.pointer(type, x, y, e);
      return false;
    },
    pause() {
      paused = true;
      if (current && current.ctrl && current.ctrl.pause) current.ctrl.pause();
    },
    resume() {
      paused = false;
      if (current && current.ctrl && current.ctrl.resume) current.ctrl.resume();
    },
    // Draws a wallpaper preview into a small element (used by Personalization).
    thumb(id) {
      const def = resolveWallpaper(id);
      const el = h('div.wp-thumb');
      if (!def) return el;
      if (def.thumb) el.style.backgroundImage = `url("${typeof def.thumb === 'function' ? def.thumb() : A.asset(def.thumb)}")`;
      else if (def.kind === 'image') el.style.backgroundImage = `url("${def.src || A.asset(def.asset)}")`;
      else if (def.kind === 'color') el.style.background = def.color;
      return el;
    },
  };

  document.addEventListener('visibilitychange', () => {
    if (!current || !current.ctrl) return;
    if (document.hidden) current.ctrl.pause && current.ctrl.pause();
    else if (!paused) current.ctrl.resume && current.ctrl.resume();
  });

  A.theme = theme;
})();
