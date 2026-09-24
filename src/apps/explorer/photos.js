/* Photo Gallery: a glossy thumbnail gallery of everything in Pictures with
   folder and rating filters, a viewer with zoom, pan, rotate and an info
   pane, and a full-screen slide show with crossfades, slow Ken Burns pans
   and a glass frame theme. Ratings and rotation are shared with Explorer
   through Aerium.store (photos.ratings, photos.rotation). */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;
  const fs = A.fs;
  const RECYCLE = fs.RECYCLE;
  const EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'];
  const isPic = (p) => EXTS.includes(fs.ext(p));
  const nameOf = (p) => fs.stem(p);
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  const fmtDT = (t) => (t ? A.util.fmtDateTime(t) : '');

  // ================================================================ shared metadata
  const meta = {
    ratings: () => A.store.get('photos.ratings', {}) || {},
    rating: (p) => meta.ratings()[p] || 0,
    setRating(p, n) {
      const all = Object.assign({}, meta.ratings());
      if (n) all[p] = n; else delete all[p];
      A.store.set('photos.ratings', all);
    },
    rotation: (p) => (A.store.get('photos.rotation', {}) || {})[p] || 0,
    rotate(p, deg) {
      const all = Object.assign({}, A.store.get('photos.rotation', {}) || {});
      const v = ((((all[p] || 0) + deg) % 360) + 360) % 360;
      if (v) all[p] = v; else delete all[p];
      A.store.set('photos.rotation', all);
      return v;
    },
  };
  // Ratings and rotation follow a picture when it (or its folder) is renamed.
  A.bus.on('fs:rename', (ev) => {
    if (!ev || !ev.from) return;
    ['photos.ratings', 'photos.rotation'].forEach((key) => {
      const src = A.store.get(key, {}) || {};
      let changed = false;
      const out = {};
      Object.keys(src).forEach((k) => {
        const nk = k === ev.from ? ev.to : k.startsWith(ev.from + '/') ? ev.to + k.slice(ev.from.length) : k;
        if (nk !== k) changed = true;
        out[nk] = src[k];
      });
      if (changed) A.store.set(key, out);
    });
  });

  function picturesIn(dir, recursive) {
    const out = [];
    const walk = (d, depth) => {
      fs.list(d).forEach((st) => {
        if (st.path === RECYCLE) return;
        if (st.type === 'file' && isPic(st.path)) out.push(st.path);
        else if (st.type === 'folder' && recursive && depth < 20) walk(st.path, depth + 1);
      });
    };
    if (fs.isDir(dir)) walk(fs.normalize(dir), 0);
    return out;
  }
  const imageSize = (url) => A.util.loadImage(url).then((im) => ({ w: im.naturalWidth || 1600, h: im.naturalHeight || 1000 })).catch(() => ({ w: 1600, h: 1000 }));

  // ================================================================ glyphs
  function svgEl(markup) {
    const t = document.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstChild;
  }
  const G = {
    play: '<svg viewBox="0 0 24 24"><path d="M8.5 5.2v13.6L19.4 12z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6.2" y="5.4" width="4.2" height="13.2" rx="1"/><rect x="13.6" y="5.4" width="4.2" height="13.2" rx="1"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M12.6 6v12L4.6 12z"/><path d="M20.2 6v12l-8-6z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M11.4 6v12l8-6z"/><path d="M3.8 6v12l8-6z"/></svg>',
    rotL: '<svg viewBox="0 0 24 24"><path d="M7.4 9.2A6.6 6.6 0 1 1 6.6 16" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M3.4 4.6 9.8 5.8 5.6 11z"/></svg>',
    rotR: '<svg viewBox="0 0 24 24" style="transform:scaleX(-1)"><path d="M7.4 9.2A6.6 6.6 0 1 1 6.6 16" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M3.4 4.6 9.8 5.8 5.6 11z"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
    zoom: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="5.6" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M14.4 14.4 19.6 19.6" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>',
    fit: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="8.5" y="8.5" width="7" height="7" rx="1"/></svg>',
    actual: '<svg viewBox="0 0 24 24"><text x="12" y="16.4" text-anchor="middle" font-family="Selawik, Segoe UI, sans-serif" font-weight="700" font-size="11">1:1</text></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.3"/><rect x="13" y="4" width="7" height="7" rx="1.3"/><rect x="4" y="13" width="7" height="7" rx="1.3"/><rect x="13" y="13" width="7" height="7" rx="1.3"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="12" cy="7.9" r="1.5"/><rect x="10.8" y="10.4" width="2.4" height="7" rx="1"/></svg>',
    wallpaper: '<svg viewBox="0 0 24 24"><rect x="3.2" y="4.2" width="17.6" height="12" rx="1.4" fill="none" stroke="#fff" stroke-width="2"/><path d="M5 14.4l4.2-4.2 3 3 2.2-2 4.6 3.2z"/><rect x="9.5" y="17.6" width="5" height="1.6"/><rect x="7.4" y="19.2" width="9.2" height="1.6" rx=".8"/></svg>',
    paint: '<svg viewBox="0 0 24 24"><path d="M14.8 3.6 20.4 9.2 11 18.6 5.4 13z"/><path d="M4.6 14.2 9.8 19.4C8.6 21 5.6 21.4 3 21c-.3-2.6.1-5.6 1.6-6.8z"/></svg>',
    bg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M12 4a8 8 0 0 1 0 16z"/></svg>',
    small: '<svg viewBox="0 0 24 24"><rect x="7.5" y="9" width="9" height="7" rx="1"/></svg>',
    large: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M10.6 2.8h2.8l.5 2.6 1.9.8 2.2-1.5 2 2-1.5 2.2.8 1.9 2.6.5v2.8l-2.6.5-.8 1.9 1.5 2.2-2 2-2.2-1.5-1.9.8-.5 2.6h-2.8l-.5-2.6-1.9-.8-2.2 1.5-2-2 1.5-2.2-.8-1.9-2.6-.5v-2.8l2.6-.5.8-1.9-1.5-2.2 2-2 2.2 1.5 1.9-.8z"/><circle cx="12" cy="12" r="3.2" fill="#1a2a3c"/></svg>',
    exit: '<svg viewBox="0 0 24 24"><path d="M6.8 6.8l10.4 10.4M17.2 6.8 6.8 17.2" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg>',
    themes: '<svg viewBox="0 0 24 24"><rect x="3.5" y="6" width="12" height="9" rx="1.2" fill="none" stroke="#fff" stroke-width="1.8"/><rect x="8.5" y="9" width="12" height="9" rx="1.2"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H6.5M11.5 6.6 6 12l5.5 5.4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.4l2.95 6.05 6.65.95-4.8 4.65 1.15 6.6L12 17.5l-5.95 3.15 1.15-6.6-4.8-4.65 6.65-.95z"/></svg>',
  };
  const glyph = (name, cls) => { const el = svgEl(G[name]); el.setAttribute('aria-hidden', 'true'); if (cls) el.classList.add(cls); return el; };

  // Five clickable stars; clicking the current rating again clears it.
  function starsEl(path, o = {}) {
    const wrap = h('span.ph-stars', { class: o.className, role: 'radiogroup', 'aria-label': 'Rating' });
    const paint = (n) => wrap.querySelectorAll('.ph-star').forEach((b, i) => b.classList.toggle('on', i < n));
    for (let i = 1; i <= 5; i++) {
      const b = h('button.ph-star', { type: 'button', 'aria-label': plural(i, 'star'), tabIndex: -1 }, glyph('star'));
      if (!o.readOnly) {
        b.addEventListener('pointerenter', () => { wrap.classList.add('hover'); paint(i); });
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        b.addEventListener('dblclick', (e) => e.stopPropagation());
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          const n = meta.rating(path) === i ? 0 : i;
          meta.setRating(path, n);
          A.sound.play('select');
          paint(n);
          if (o.onChange) o.onChange(n);
        });
      } else b.disabled = true;
      wrap.appendChild(b);
    }
    wrap.addEventListener('pointerleave', () => { wrap.classList.remove('hover'); paint(meta.rating(path)); });
    paint(meta.rating(path));
    wrap.refresh = () => paint(meta.rating(path));
    return wrap;
  }

  // ================================================================ slide show
  const THEMES = [
    { id: 'classic', label: 'Classic', fade: 0.45 },
    { id: 'fade', label: 'Fade', fade: 1.5 },
    { id: 'panzoom', label: 'Pan and zoom', fade: 1.7 },
    { id: 'glass', label: 'Glass frame', fade: 1.2 },
    { id: 'bw', label: 'Black and white', fade: 1.5 },
    { id: 'sepia', label: 'Sepia', fade: 1.5 },
  ];
  const SPEEDS = { slow: 8, medium: 5, fast: 3 };
  const showPrefs = () => Object.assign({ theme: 'panzoom', speed: 'medium', shuffle: false, loop: true }, A.store.get('photos.slideshow', {}) || {});

  // Runs a full-screen slide show over everything. Returns { stop(), running, current() }.
  function slideShow(paths, startIndex, o = {}) {
    paths = paths.filter((p) => fs.exists(p));
    if (!paths.length) return null;
    let prefs = showPrefs();
    let order = paths.slice();
    let pos = clamp(startIndex || 0, 0, order.length - 1);
    if (prefs.shuffle) reshuffle(true);
    let playing = true, stopped = false, timer = null, remain = 0, dueAt = 0, idleT = null, token = 0;
    let slideEl = null, anims = [];

    const stage = h('div.ph-show-stage');
    const caption = h('div.ph-show-caption');
    const counter = h('span.ph-show-count');
    const btn = (name, label, fn, cls) => {
      const b = h('button.ph-show-btn', { type: 'button', class: cls, 'aria-label': label, 'data-tip': label }, glyph(name));
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(b); });
      return b;
    };
    const themeBtn = h('button.ph-show-btn.ph-show-text', { type: 'button', 'aria-label': 'Themes', 'data-tip': 'Choose a theme' }, glyph('themes'), h('span', null, 'Themes'));
    const playBtn = btn('pause', 'Pause', () => togglePlay(), 'ph-show-play');
    const bar = h('div.ph-show-bar', { role: 'toolbar', 'aria-label': 'Slide show controls' },
      themeBtn, h('span.ph-show-sep'),
      btn('prev', 'Previous', () => step(-1)), playBtn, btn('next', 'Next', () => step(1)),
      h('span.ph-show-sep'), btn('gear', 'Settings', (b) => settingsMenu(b)), counter, h('span.ph-show-sep'),
      h('button.ph-show-btn.ph-show-text.ph-show-exit', { type: 'button', 'aria-label': 'Exit', onclick: (e) => { e.stopPropagation(); stop(); } }, glyph('exit'), h('span', null, 'Exit')));
    const root = h('div.ph-show', { role: 'dialog', 'aria-label': 'Slide show', tabIndex: -1 }, stage, caption, bar);
    themeBtn.addEventListener('click', (e) => { e.stopPropagation(); themeMenu(themeBtn); });
    (document.getElementById('ae-overlays') || document.body).appendChild(root);
    requestAnimationFrame(() => root.classList.add('on'));
    A.sound.play('whooshIn');
    A.ui.closeMenus();

    function reshuffle(keepCurrent) {
      const cur = order[pos];
      order = A.util.shuffle(paths);
      if (keepCurrent && cur) { order = order.filter((p) => p !== cur); order.unshift(cur); pos = 0; }
    }
    function theme() { return THEMES.find((t) => t.id === prefs.theme) || THEMES[2]; }
    function savePrefs() { A.store.set('photos.slideshow', prefs); }
    function slideTime() { return (SPEEDS[prefs.speed] || 5) * 1000; }

    function show(i, dir = 1) {
      const my = ++token;
      pos = (i + order.length) % order.length;
      const path = order[pos];
      const url = fs.thumbFor(path);
      counter.textContent = pos + 1 + ' of ' + order.length;
      if (!url) { schedule(300); return; }
      A.util.loadImage(url).then((im) => {
        if (stopped || my !== token) return;
        const th = theme();
        const rot = meta.rotation(path);
        const el = h('div.ph-slide', { class: 'ph-t-' + th.id, style: { '--fade': th.fade + 's' } });
        const img = h('img.ph-slide-img', { src: url, alt: nameOf(path), draggable: false });
        const turned = rot % 180 !== 0;
        if (th.id === 'glass') {
          el.append(h('div.ph-slide-bg', { style: { backgroundImage: `url("${url}")` } }));
          const frame = h('div.ph-glassframe', null, img);
          const W = window.innerWidth, H = window.innerHeight;
          const iw = turned ? im.naturalHeight : im.naturalWidth, ih = turned ? im.naturalWidth : im.naturalHeight;
          const s = Math.min((W * 0.7) / iw, (H * 0.66) / ih);
          frame.style.width = Math.round(iw * s) + 'px';
          frame.style.height = Math.round(ih * s) + 'px';
          if (turned) { img.style.width = Math.round(ih * s) + 'px'; img.style.height = Math.round(iw * s) + 'px'; }
          if (rot) img.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
          el.append(frame);
        } else if (th.id === 'panzoom' && !turned) {
          el.append(img);
          el.classList.add('ph-kb');
        } else {
          el.classList.add('ph-contain');
          el.append(img);
          if (rot) {
            const W = window.innerWidth, H = window.innerHeight;
            const s = Math.min(W / (turned ? im.naturalHeight : im.naturalWidth), H / (turned ? im.naturalWidth : im.naturalHeight));
            Object.assign(img.style, { width: im.naturalWidth * s + 'px', height: im.naturalHeight * s + 'px', maxWidth: 'none', maxHeight: 'none', transform: `rotate(${rot}deg)` });
          }
        }
        stage.appendChild(el);
        anims = anims.filter((a) => a.playState !== 'finished');
        if (el.classList.contains('ph-kb') && img.animate) {
          // Slow Ken Burns drift: a gentle zoom from one corner toward another.
          const z0 = 1.04 + Math.random() * 0.06, z1 = 1.16 + Math.random() * 0.1;
          const ang = Math.random() * Math.PI * 2;
          const dx = Math.cos(ang) * 3.2, dy = Math.sin(ang) * 2.4;
          const inOut = Math.random() < 0.5;
          const from = `scale(${inOut ? z0 : z1}) translate(${-dx}%, ${-dy}%)`, to = `scale(${inOut ? z1 : z0}) translate(${dx}%, ${dy}%)`;
          const a = img.animate([{ transform: from }, { transform: to }], { duration: slideTime() + th.fade * 1000 + 1400, easing: 'linear', fill: 'forwards' });
          if (!playing) a.pause();
          anims.push(a);
        } else if (th.id === 'glass' && el.animate) {
          const frame = el.querySelector('.ph-glassframe');
          const a = frame.animate([{ transform: `translateY(${dir * 14}px) scale(.97)` }, { transform: 'translateY(0) scale(1)' }], { duration: 1300, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
          anims.push(a);
        }
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
        const old = slideEl;
        slideEl = el;
        if (old) {
          old.classList.add('out');
          old.style.setProperty('--fade', th.fade + 's');
          setTimeout(() => old.remove(), th.fade * 1000 + 120);
        }
        caption.textContent = nameOf(path);
        caption.classList.toggle('show', th.id === 'glass');
        if (o.onShow) o.onShow(path);
        schedule(slideTime() + th.fade * 1000 * 0.5);
      }).catch(() => { if (!stopped && my === token) schedule(400); });
    }
    function schedule(ms) {
      clearTimeout(timer);
      remain = ms;
      if (!playing) return;
      dueAt = performance.now() + ms;
      timer = setTimeout(advance, ms);
    }
    function advance() {
      if (stopped) return;
      if (pos + 1 >= order.length && !prefs.loop) { togglePlay(false); return; }
      if (pos + 1 >= order.length && prefs.shuffle) { order = A.util.shuffle(paths); pos = -1; }
      show(pos + 1, 1);
    }
    function step(d) {
      A.sound.play('click');
      clearTimeout(timer);
      show(pos + d, d);
      wake();
    }
    function togglePlay(force) {
      const next = force == null ? !playing : !!force;
      if (next === playing) return;
      playing = next;
      playBtn.replaceChildren(glyph(playing ? 'pause' : 'play'));
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      playBtn.setAttribute('data-tip', playing ? 'Pause' : 'Play');
      root.classList.toggle('paused', !playing);
      anims.forEach((a) => { try { playing ? a.play() : a.pause(); } catch (e) { /* ignore */ } });
      if (playing) schedule(Math.max(600, remain));
      else { clearTimeout(timer); remain = Math.max(600, dueAt - performance.now()); }
      A.sound.play('click');
      wake();
    }
    function themeMenu(anchor) {
      const r = anchor.getBoundingClientRect();
      A.ui.menu(THEMES.map((t) => ({ label: t.label, radio: true, checked: prefs.theme === t.id, onClick: () => { prefs.theme = t.id; savePrefs(); clearTimeout(timer); show(pos, 1); } })), r.left, r.top - 8, { anchorTop: r.top - 6 });
    }
    function settingsItems() {
      return [
        { label: 'Play', checked: playing, onClick: () => togglePlay(true) },
        { label: 'Pause', checked: !playing, onClick: () => togglePlay(false) },
        { separator: true },
        { label: 'Slide Show Speed', submenu: [['slow', 'Slow'], ['medium', 'Medium'], ['fast', 'Fast']].map(([v, l]) => ({ label: l, radio: true, checked: prefs.speed === v, onClick: () => { prefs.speed = v; savePrefs(); if (playing) schedule(slideTime()); } })) },
        { label: 'Shuffle', checked: prefs.shuffle, onClick: () => { prefs.shuffle = !prefs.shuffle; savePrefs(); if (prefs.shuffle) reshuffle(true); else { const cur = order[pos]; order = paths.slice(); pos = Math.max(0, order.indexOf(cur)); } } },
        { label: 'Loop', checked: prefs.loop, onClick: () => { prefs.loop = !prefs.loop; savePrefs(); } },
        { separator: true },
        { label: 'Next', shortcut: 'Right', onClick: () => step(1) },
        { label: 'Back', shortcut: 'Left', onClick: () => step(-1) },
        { separator: true },
        { label: 'Exit', shortcut: 'Esc', onClick: stop },
      ];
    }
    function settingsMenu(anchor) {
      const r = anchor.getBoundingClientRect();
      A.ui.menu(settingsItems(), r.left, r.top - 8, { anchorTop: r.top - 6 });
    }
    function wake() {
      root.classList.add('awake');
      clearTimeout(idleT);
      idleT = setTimeout(() => { if (!bar.matches(':hover') && !document.querySelector('.ae-menu')) root.classList.remove('awake'); else wake(); }, 2600);
    }
    function onKey(e) {
      if (stopped) return;
      const k = e.key;
      if (document.querySelector('.ae-menu') && k !== 'Escape') return;
      if (k === 'Escape') { if (document.querySelector('.ae-menu')) return; e.preventDefault(); e.stopPropagation(); stop(); }
      else if (k === ' ' || k === 'Spacebar') { e.preventDefault(); e.stopPropagation(); togglePlay(); }
      else if (k === 'ArrowRight' || k === 'PageDown' || k === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); step(1); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); step(-1); }
      else if (k === 'Home') { e.preventDefault(); e.stopPropagation(); clearTimeout(timer); show(0, -1); }
      else if (k === 'End') { e.preventDefault(); e.stopPropagation(); clearTimeout(timer); show(order.length - 1, 1); }
      else if (k.length === 1 || /^F\d+$/.test(k) || k === 'Enter' || k === 'Tab') { e.preventDefault(); e.stopPropagation(); }
    }
    root.addEventListener('pointermove', wake);
    root.addEventListener('pointerdown', (e) => { if (e.button === 0 && !e.target.closest('.ph-show-bar')) wake(); });
    root.addEventListener('contextmenu', (e) => { e.preventDefault(); A.ui.menu(settingsItems(), e.clientX, e.clientY); });
    root.addEventListener('wheel', (e) => { e.preventDefault(); if (Math.abs(e.deltaY) > 4) step(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    window.addEventListener('keydown', onKey, true);
    const onResize = A.util.debounce(() => { if (!stopped && theme().id === 'glass') { clearTimeout(timer); show(pos, 0); } }, 250);
    window.addEventListener('resize', onResize);
    setTimeout(() => root.focus({ preventScroll: true }), 30);

    function stop() {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      clearTimeout(idleT);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      anims.forEach((a) => { try { a.cancel(); } catch (e) { /* ignore */ } });
      A.ui.closeMenus();
      root.classList.remove('on');
      root.classList.add('closing');
      setTimeout(() => root.remove(), 420);
      A.sound.play('whooshOut');
      if (o.onExit) o.onExit(order[pos]);
    }
    show(pos, 1);
    wake();
    return { stop, get running() { return !stopped; }, current: () => order[pos], el: root };
  }
