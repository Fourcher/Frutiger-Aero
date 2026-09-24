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
    actual: '<svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="15" rx="2" fill="none" stroke="#fff" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-family="Selawik, Segoe UI, sans-serif" font-weight="700" font-size="9">1:1</text></svg>',
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
          if (rot) {
            img.classList.add('ph-rot');
            img.style.width = Math.round(im.naturalWidth * s) + 'px';
            img.style.height = Math.round(im.naturalHeight * s) + 'px';
            img.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
          }
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

  // ================================================================ jokes
  const jokes = {
    print: (parent) => A.ui.messageBox({ parent, title: 'Print Pictures', icon: 'warning', instruction: 'No printers are installed', message: 'Before you can print, you need to add a printer. The one in the den is out of cyan anyway.' }),
    email: (parent) => A.ui.messageBox({ parent, title: 'E-mail', icon: 'icons/mail', instruction: 'Send pictures by e-mail', message: 'Aerium Mail is not set up yet. You could print them out and mail them to Grandma instead. She would love that.' }),
    burn: (parent) => A.ui.messageBox({ parent, title: 'Burn a Disc', icon: 'icons/disc', instruction: 'Insert a blank disc', message: 'Put a blank CD or DVD in DVD RW Drive (D:) to burn your pictures. Do not forget to label it with a marker.' }),
    movie: (parent) => A.ui.messageBox({ parent, title: 'Make a Movie', icon: 'icons/video', instruction: 'Aerium Movie Studio is still in the oven', message: 'Picture your photos gliding by to a soft piano track, with a title that fades in slowly. Lovely, right?' }),
  };

  // ================================================================ the app
  A.apps.register({
    id: 'photos',
    name: 'Photo Gallery',
    icon: 'icons/photogallery',
    color: '#3aa6f5',
    category: 'media',
    description: 'View, rate and show off your pictures.',
    keywords: ['pictures', 'photos', 'images', 'viewer', 'slide show', 'slideshow', 'gallery', 'jpg', 'png'],
    fileTypes: EXTS.slice(),
    window: { width: 900, height: 600, minWidth: 500, minHeight: 360, glassBody: true },
    tasks: [
      { label: 'Play a slide show', icon: 'icons/play', onClick: () => A.apps.launch('photos', { slideshow: true, folder: '/Pictures', recursive: true }) },
      { label: 'Sample Pictures', icon: 'icons/folder-pictures', onClick: () => A.apps.launch('photos', { folder: '/Pictures/Sample Pictures' }) },
    ],
    launch(win, args) { return photoWindow(win, args || {}); },
  });

  function photoWindow(win, args) {
    // ------------------------------------------------------------ state
    let mode = 'gallery', closed = false;
    const cleanups = [];
    let filter = { type: 'all' };
    let thumbSize = clamp(Number(A.store.get('photos.thumbSize', 132)) || 132, 72, 240);
    let gsel = new Set(), ganchor = null, gfocus = null, gitems = [];
    let list = [], listDir = null, idx = -1, path = null, fromGallery = false;
    let nat = { w: 1600, h: 1000 }, z = 1, fitMode = true, pan = { x: 0, y: 0 }, rot = 0;
    let bg = A.store.get('photos.viewerBg', 'dark') === 'light' ? 'light' : 'dark';
    let infoOn = !!A.store.get('photos.infoPane', false);
    let autoFix = false, show = null, loadToken = 0, galleryDirty = true;
    const MAXZ = 4;

    // ------------------------------------------------------------ DOM: command bar
    win.body.classList.add('ph');
    const tool = (label, icon, onClick, tip) => h('button.ae-tool', { type: 'button', onclick: onClick, 'data-tip': tip || null }, icon ? A.img(icon) : null, label);
    const menuTool = (label, icon, itemsFn) => {
      const b = h('button.ae-tool.ph-menu-btn', { type: 'button' }, icon ? A.img(icon) : null, label, h('span.ph-caret', null, svgEl('<svg viewBox="0 0 8 5" aria-hidden="true"><path d="M.4.4h7.2L4 4.6z" fill="currentColor"/></svg>')));
      b.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        if (b.classList.contains('active')) { A.ui.closeMenus(); return; }
        const r = b.getBoundingClientRect();
        b.classList.add('active');
        A.ui.menu(itemsFn(), r.left, r.bottom, { owner: b, onClose: () => b.classList.remove('active') });
      });
      return b;
    };
    const backBtn = h('button.ae-tool.ph-back', { type: 'button', 'data-tip': 'Go back to the gallery' }, glyph('back'), 'Go to Gallery');
    backBtn.addEventListener('click', () => goGallery());
    const fixBtn = tool('Fix', 'icons/lightbulb', () => toggleFix(), 'Brighten colors with Auto Adjust');
    const infoBtn = tool('Info', 'icons/info', () => toggleInfo(), 'Show or hide the info pane');
    const cmd = h('div.ae-toolbar.ph-cmd', null,
      backBtn,
      menuTool('File', null, fileMenu), fixBtn, infoBtn, h('span.ae-tool-sep'),
      tool('Print', 'icons/document', () => jokes.print(win)), tool('E-mail', 'icons/mail', () => jokes.email(win)),
      tool('Burn', 'icons/disc', () => jokes.burn(win)), tool('Make a Movie', 'icons/video', () => jokes.movie(win)),
      h('div.ph-cmd-spacer'), menuTool('Open', 'icons/folder', openMenu));

    // ------------------------------------------------------------ DOM: gallery, viewer, info
    const navEl = h('nav.ae-sidebar.ph-nav', { 'aria-label': 'Picture filters' });
    const gTitle = h('div.ph-gtitle');
    const gCount = h('div.ph-gcount');
    const gridEl = h('div.ph-grid', { tabIndex: 0, role: 'listbox', 'aria-multiselectable': 'true', 'aria-label': 'Pictures' });
    const gallery = h('div.ph-gallery', null, h('div.ph-ghead', null, gTitle, gCount), gridEl);
    const imgEl = h('img.ph-img', { alt: '', draggable: false });
    const zoomBadge = h('div.ph-zoombadge', { 'aria-live': 'polite' });
    const vEmpty = h('div.ph-vempty', { hidden: true });
    const stage = h('div.ph-stage', { tabIndex: 0, class: 'ph-bg-' + bg, 'aria-label': 'Picture' }, imgEl, zoomBadge, vEmpty);
    const infoEl = h('aside.ph-info', { 'aria-label': 'Info' });
    const noticeEl = h('div.ph-notice', { role: 'status', hidden: true });
    const main = h('div.ph-main', null, navEl, gallery, stage, infoEl);
    const frame = h('div.ph-frame', null, cmd, noticeEl, main);

    // ------------------------------------------------------------ DOM: control bar on the glass
    const bbtn = (name, label, fn, cls) => {
      const b = h('button.ph-bbtn', { type: 'button', class: cls, 'aria-label': label, 'data-tip': label }, glyph(name));
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(b); });
      return b;
    };
    const galleryBtn = bbtn('grid', 'Go to Gallery', () => goGallery(), 'ph-v');
    const infoBbtn = bbtn('info', 'Info pane', () => toggleInfo());
    const sizeSlider = A.ui.slider({ min: 72, max: 240, value: thumbSize, label: 'Thumbnail size', onInput: (v) => setThumbSize(v), onChange: () => A.store.set('photos.thumbSize', thumbSize) });
    const sizeBox = h('div.ph-sizebox.ph-g', { 'data-tip': 'Thumbnail size' }, glyph('small', 'ph-size-s'), sizeSlider, glyph('large', 'ph-size-l'));
    const zoomSlider = A.ui.slider({ min: 0, max: 100, value: 0, label: 'Zoom', onInput: (t) => zoomFromSlider(t) });
    const zoomBox = h('div.ph-zoombox.ph-v', null, glyph('zoom', 'ph-zoom-g'), zoomSlider);
    const fitBtn = bbtn('actual', 'Actual size', () => toggleFit(), 'ph-v');
    const prevBtn = bbtn('prev', 'Previous', () => nav(-1), 'ph-wingbtn ph-v');
    const nextBtn = bbtn('next', 'Next', () => nav(1), 'ph-wingbtn ph-v');
    const playBtn = h('button.ph-playorb', { type: 'button', 'aria-label': 'Play slide show', 'data-tip': 'Play slide show (F11)' }, glyph('play'));
    playBtn.addEventListener('click', () => playShow());
    const rotLBtn = bbtn('rotL', 'Rotate counterclockwise', () => rotateBy(-90));
    const rotRBtn = bbtn('rotR', 'Rotate clockwise', () => rotateBy(90));
    const delBtn = bbtn('del', 'Delete', () => deletePics(), 'ph-del');
    const wallBtn = bbtn('wallpaper', 'Set as desktop background', () => setBackground());
    const paintBtn = bbtn('paint', 'Edit in Paint', () => editInPaint());
    const bgBtn = bbtn('bg', 'Change the background', () => toggleBg(), 'ph-v');
    const bar = h('div.ph-bar', { role: 'toolbar', 'aria-label': 'Picture controls' },
      h('div.ph-bar-side.ph-bar-left', null, galleryBtn, infoBbtn, h('span.ph-bsep'), sizeBox, zoomBox, fitBtn),
      h('div.ph-wing', null, prevBtn, playBtn, nextBtn),
      h('div.ph-bar-side.ph-bar-right', null, rotLBtn, rotRBtn, h('span.ph-bsep'), delBtn, h('span.ph-bsep'), wallBtn, paintBtn, bgBtn));
    win.body.append(frame, bar);

    // ------------------------------------------------------------ helpers
    const target = () => (mode === 'viewer' ? path : [...gsel][0] || null);
    const targets = () => (mode === 'viewer' ? (path ? [path] : []) : gitems.filter((p) => gsel.has(p)));
    function notice(text, action, fn) {
      clearTimeout(notice.t);
      const close = h('button.ph-notice-x', { type: 'button', 'aria-label': 'Close', onclick: () => (noticeEl.hidden = true) }, glyph('exit'));
      const parts = [A.img('icons/info'), h('span.ph-notice-text', null, text)];
      if (action) parts.push(h('button.ae-link', { type: 'button', onclick: () => { noticeEl.hidden = true; fn(); } }, action));
      noticeEl.replaceChildren(...parts, close);
      noticeEl.hidden = false;
      notice.t = setTimeout(() => (noticeEl.hidden = true), 7000);
      if (mode === 'viewer') requestAnimationFrame(layoutImage);
    }

    // ------------------------------------------------------------ gallery
    function filterTitle() {
      if (filter.type === 'folder') return filter.value === '/Pictures' ? 'Pictures' : fs.basename(filter.value) || 'Pictures';
      if (filter.type === 'rating') return filter.value === 5 ? '5 stars' : `${plural(filter.value, 'star')} or more`;
      if (filter.type === 'unrated') return 'Not rated';
      return 'All Pictures';
    }
    function galleryPaths() {
      let out = filter.type === 'folder' ? picturesIn(filter.value, true) : picturesIn('/Pictures', true);
      if (filter.type === 'rating') out = out.filter((p) => meta.rating(p) >= filter.value);
      if (filter.type === 'unrated') out = out.filter((p) => !meta.rating(p));
      return out;
    }
    function setFilter(f) {
      filter = f;
      A.sound.play('click');
      gsel = new Set();
      ganchor = gfocus = null;
      renderGallery(false);
      if (mode === 'gallery') win.setTitle(filterTitle() + ' - Photo Gallery');
    }
    function navRow(label, icon, n, active, onClick, depth = 0, stars = 0) {
      const b = h('button.ph-nrow', { type: 'button', class: active ? 'active' : null, style: { paddingLeft: 8 + depth * 14 + 'px' } },
        icon ? A.img(icon) : null,
        stars ? h('span.ph-nstars', null, [1, 2, 3, 4, 5].map((i) => h('i', { class: i <= stars ? 'on' : null }, glyph('star')))) : null,
        label ? h('span.ph-nlabel', null, label) : null,
        h('span.ph-ncount', null, String(n)));
      b.addEventListener('click', onClick);
      return b;
    }
    function renderNav() {
      const all = picturesIn('/Pictures', true);
      const rows = [navRow('All Pictures', 'icons/photogallery', all.length, filter.type === 'all', () => setFilter({ type: 'all' })), h('div.ph-ntitle', null, 'Folders')];
      const walkF = (dir, depth) => {
        if (depth > 8) return;
        rows.push(navRow(dir === '/Pictures' ? 'Pictures' : fs.basename(dir), fs.iconFor(dir), picturesIn(dir, true).length, filter.type === 'folder' && filter.value === dir, () => setFilter({ type: 'folder', value: dir }), depth));
        fs.list(dir).filter((st) => st.type === 'folder').forEach((st) => walkF(st.path, depth + 1));
      };
      if (fs.isDir('/Pictures')) walkF('/Pictures', 0);
      if (filter.type === 'folder' && filter.value !== '/Pictures' && !filter.value.startsWith('/Pictures/')) {
        rows.push(navRow(fs.basename(filter.value) || 'Folder', fs.iconFor(filter.value), picturesIn(filter.value, true).length, true, () => {}, 0));
      }
      rows.push(h('div.ph-ntitle', null, 'Ratings'));
      [5, 4, 3, 2, 1].forEach((n) => rows.push(navRow(n === 5 ? '' : 'or more', null, all.filter((p) => meta.rating(p) >= n).length, filter.type === 'rating' && filter.value === n, () => setFilter({ type: 'rating', value: n }), 0, n)));
      rows.push(navRow('Not rated', null, all.filter((p) => !meta.rating(p)).length, filter.type === 'unrated', () => setFilter({ type: 'unrated' })));
      navEl.replaceChildren(...rows);
    }
    function thumbEl(p) {
      const url = fs.thumbFor(p);
      const r = meta.rotation(p);
      const img = h('img.ph-timg', { src: url || '', alt: '', draggable: false, class: r % 180 ? 'turned' : null, style: r ? { '--rot': r + 'deg' } : null });
      return h('div.ph-thumb', { role: 'option', dataset: { path: p }, 'aria-label': nameOf(p), 'aria-selected': 'false' },
        h('div.ph-tbox', null, img),
        h('div.ph-tname', null, nameOf(p)),
        starsEl(p, { className: 'ph-tstars', onChange: () => { renderInfo(); renderNav(); if (filter.type === 'rating' || filter.type === 'unrated') setTimeout(() => renderGallery(true), 300); } }));
    }
    function renderGallery(keepScroll) {
      galleryDirty = false;
      const st = keepScroll ? gridEl.scrollTop : 0;
      gitems = galleryPaths();
      const set = new Set(gitems);
      gsel = new Set([...gsel].filter((p) => set.has(p)));
      if (gfocus && !set.has(gfocus)) gfocus = null;
      gTitle.textContent = filterTitle();
      gCount.textContent = plural(gitems.length, 'item');
      gridEl.style.setProperty('--ph-size', thumbSize + 'px');
      const frag = document.createDocumentFragment();
      let group = null;
      gitems.forEach((p) => {
        const dir = fs.dirname(p);
        if (dir !== group) {
          group = dir;
          const n = gitems.filter((q) => fs.dirname(q) === dir).length;
          frag.appendChild(h('div.ph-group', null, h('span', null, dir === '/Pictures' ? 'Pictures' : fs.basename(dir)), h('span.ph-group-n', null, `(${n})`)));
        }
        frag.appendChild(thumbEl(p));
      });
      if (!gitems.length) {
        const openBtn = A.ui.button('Open the Pictures folder', { size: 'sm', onClick: () => A.apps.launch('explorer', { path: '/Pictures' }) });
        frag.appendChild(h('div.ph-gempty', null, A.img('icons/photogallery'),
          h('div.ph-gempty-title', null, filter.type === 'all' ? 'No pictures here yet' : 'No pictures match this filter'),
          h('div.ae-muted', null, filter.type === 'all' ? 'Pictures you save in your Pictures folder show up here.' : 'Try another folder or rating on the left.'),
          filter.type === 'all' ? openBtn : null));
      }
      gridEl.replaceChildren(frag);
      gridEl.scrollTop = st;
      applyGSel();
      renderNav();
      if (mode === 'gallery') { renderInfo(); updateBar(); }
    }
    function setThumbSize(v) {
      thumbSize = clamp(Math.round(v), 72, 240);
      gridEl.style.setProperty('--ph-size', thumbSize + 'px');
      hidePeek();
    }
    function thumbEls() { return Array.from(gridEl.querySelectorAll('.ph-thumb')); }
    function applyGSel() {
      thumbEls().forEach((el) => {
        const on = gsel.has(el.dataset.path);
        el.classList.toggle('selected', on);
        el.classList.toggle('ph-focus', el.dataset.path === gfocus);
        el.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (mode === 'gallery') { renderInfo(); updateBar(); }
    }
    function gSelectOnly(p) { gsel = new Set(p ? [p] : []); ganchor = gfocus = p; applyGSel(); }
    function gToggle(p) { if (gsel.has(p)) gsel.delete(p); else gsel.add(p); ganchor = gfocus = p; applyGSel(); }
    function gRange(a, b, add) {
      const ia = gitems.indexOf(a), ib = gitems.indexOf(b);
      if (ia < 0 || ib < 0) { gSelectOnly(b); return; }
      const next = add ? new Set(gsel) : new Set();
      for (let i = Math.min(ia, ib); i <= Math.max(ia, ib); i++) next.add(gitems[i]);
      gsel = next;
      gfocus = b;
      applyGSel();
    }
    function scrollToThumb(p) {
      const el = gridEl.querySelector(`.ph-thumb[data-path="${CSS.escape(p)}"]`);
      if (!el) return;
      const g = gridEl.getBoundingClientRect(), r = el.getBoundingClientRect();
      if (r.top < g.top) gridEl.scrollTop -= g.top - r.top + 8;
      else if (r.bottom > g.bottom) gridEl.scrollTop += r.bottom - g.bottom + 8;
    }
    gridEl.addEventListener('pointerdown', (e) => {
      hidePeek();
      const t = e.target.closest('.ph-thumb');
      gridEl.focus({ preventScroll: true });
      if (!t) { if (e.button === 0 && !e.ctrlKey && !e.shiftKey && gsel.size) gSelectOnly(null); return; }
      if (e.target.closest('.ph-stars')) return;
      const p = t.dataset.path;
      if (e.button === 2) { if (!gsel.has(p)) gSelectOnly(p); return; }
      if (e.button !== 0) return;
      if (e.shiftKey) gRange(ganchor || p, p, e.ctrlKey || e.metaKey);
      else if (e.ctrlKey || e.metaKey) gToggle(p);
      else gSelectOnly(p);
    });
    gridEl.addEventListener('dblclick', (e) => {
      const t = e.target.closest('.ph-thumb');
      if (!t || e.target.closest('.ph-stars')) return;
      openViewer(t.dataset.path, gitems, true);
    });
    gridEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const t = e.target.closest('.ph-thumb');
      if (!t) {
        A.ui.menu([
          { label: 'Thumbnail Size', submenu: [['Small', 96], ['Medium', 132], ['Large', 190], ['Extra Large', 240]].map(([l, v]) => ({ label: l, radio: true, checked: Math.abs(thumbSize - v) < 12, onClick: () => { setThumbSize(v); sizeSlider.setValue(v); A.store.set('photos.thumbSize', v); } })) },
          { label: 'Refresh', onClick: () => renderGallery(true) },
          { separator: true },
          { label: 'Play Slide Show', shortcut: 'F11', disabled: !gitems.length, onClick: playShow },
          { label: 'Select All', shortcut: 'Ctrl+A', disabled: !gitems.length, onClick: () => { gsel = new Set(gitems); applyGSel(); } },
        ], e.clientX, e.clientY);
        return;
      }
      const p = t.dataset.path;
      if (!gsel.has(p)) gSelectOnly(p);
      const sel = targets();
      const one = sel.length === 1 ? sel[0] : null;
      A.ui.menu([
        { label: 'Preview', bold: true, disabled: !one, onClick: () => openViewer(one, gitems, true) },
        { label: 'Play Slide Show', onClick: playShow },
        { separator: true },
        { label: 'Rate', submenu: [5, 4, 3, 2, 1, 0].map((n) => ({ label: n ? plural(n, 'star') : 'Not rated', onClick: () => { sel.forEach((q) => meta.setRating(q, n)); A.sound.play('select'); renderGallery(true); } })) },
        { label: 'Rotate Clockwise', shortcut: 'Ctrl+.', onClick: () => rotateBy(90) },
        { label: 'Rotate Counterclockwise', shortcut: 'Ctrl+,', onClick: () => rotateBy(-90) },
        { separator: true },
        { label: 'Set as Desktop Background', disabled: !one, onClick: () => setBackground(one) },
        { label: 'Edit in Paint', disabled: !one, onClick: () => editInPaint(one) },
        { label: 'Open File Location', disabled: !one, onClick: () => A.apps.launch('explorer', { path: one }) },
        { separator: true },
        { label: 'Rename', disabled: !one, onClick: () => renamePic(one) },
        { label: 'Delete', shortcut: 'Del', onClick: () => deletePics() },
      ], e.clientX, e.clientY);
    });
    function gridCols() {
      const els = thumbEls();
      if (!els.length) return 1;
      const top = els[0].offsetTop;
      let n = 0;
      for (const el of els) { if (el.offsetTop !== top) break; n++; }
      return Math.max(1, n);
    }
    gridEl.addEventListener('keydown', galleryKey);
    function galleryKey(e) {
      if (A.util.isTyping(e)) return;
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      const i = gfocus ? gitems.indexOf(gfocus) : -1;
      const moveTo = (j) => {
        j = clamp(j, 0, gitems.length - 1);
        if (!gitems.length) return;
        if (e.shiftKey) gRange(ganchor || gitems[Math.max(0, i)], gitems[j], ctrl);
        else gSelectOnly(gitems[j]);
        scrollToThumb(gitems[j]);
      };
      if (k === 'ArrowRight') { e.preventDefault(); moveTo(i < 0 ? 0 : i + 1); }
      else if (k === 'ArrowLeft') { e.preventDefault(); moveTo(i < 0 ? 0 : i - 1); }
      else if (k === 'ArrowDown') { e.preventDefault(); moveTo(i < 0 ? 0 : i + gridCols()); }
      else if (k === 'ArrowUp') { e.preventDefault(); moveTo(i < 0 ? 0 : i - gridCols()); }
      else if (k === 'Home') { e.preventDefault(); moveTo(0); }
      else if (k === 'End') { e.preventDefault(); moveTo(gitems.length - 1); }
      else if (k === 'Enter' && gfocus) { e.preventDefault(); openViewer(gfocus, gitems, true); }
      else if (k === 'Delete') { e.preventDefault(); deletePics(); }
      else if (ctrl && k.toLowerCase() === 'a') { e.preventDefault(); gsel = new Set(gitems); applyGSel(); }
      else if (/^[0-5]$/.test(k) && gsel.size) {
        e.preventDefault();
        const n = Number(k);
        targets().forEach((q) => meta.setRating(q, n));
        A.sound.play('select');
        renderGallery(true);
      }
    }

    // Hover preview: a larger glossy card after a short pause, like the era's gallery tooltips.
    let peekT = null, peekFor = null, peekEl = null;
    function hidePeek() {
      clearTimeout(peekT);
      peekT = null;
      peekFor = null;
      if (peekEl) { const el = peekEl; peekEl = null; el.classList.add('closing'); setTimeout(() => el.remove(), 160); }
    }
    function showPeek(t) {
      if (closed || !t.isConnected || document.body.classList.contains('ae-dragging')) return;
      const p = t.dataset.path, url = fs.thumbFor(p), st = fs.stat(p);
      if (!url || !st) return;
      const r = meta.rotation(p);
      const dims = h('span', null, '');
      imageSize(url).then((s) => { dims.textContent = (r % 180 ? s.h + ' x ' + s.w : s.w + ' x ' + s.h) + ' pixels'; });
      const img = h('img', { src: url, alt: '', class: r % 180 ? 'turned' : null, style: r ? { '--rot': r + 'deg' } : null });
      peekEl = h('div.ph-peek', { role: 'tooltip' },
        h('div.ph-peek-img', null, img),
        h('div.ph-peek-name', null, fs.basename(p)),
        h('div.ph-peek-row', null, fmtDT(st.modified)),
        h('div.ph-peek-row', null, A.util.fmtBytes(st.size), h('span.ph-peek-dot'), dims),
        starsEl(p, { readOnly: true, className: 'ph-peek-stars' }));
      document.getElementById('ae-overlays').appendChild(peekEl);
      const tr = t.getBoundingClientRect();
      const w = peekEl.offsetWidth, hh = peekEl.offsetHeight;
      let left = tr.right + 10;
      if (left + w > window.innerWidth - 8) left = tr.left - w - 10;
      if (left < 8) left = clamp(tr.left + tr.width / 2 - w / 2, 8, window.innerWidth - w - 8);
      const top = clamp(tr.top + tr.height / 2 - hh / 2, 8, window.innerHeight - hh - 48);
      peekEl.style.left = Math.round(left) + 'px';
      peekEl.style.top = Math.round(top) + 'px';
    }
    gridEl.addEventListener('pointerover', (e) => {
      const t = e.target.closest('.ph-thumb');
      if (!t) { hidePeek(); return; }
      if (t === peekFor) return;
      hidePeek();
      peekFor = t;
      peekT = setTimeout(() => showPeek(t), 700);
    });
    gridEl.addEventListener('pointerleave', hidePeek);
    gridEl.addEventListener('scroll', hidePeek, { passive: true });
    gridEl.addEventListener('wheel', hidePeek, { passive: true });

    // ------------------------------------------------------------ viewer
    let visRot = 0;
    function setMode(m) {
      mode = m;
      hidePeek();
      win.body.classList.toggle('ph-viewer', m === 'viewer');
      win.body.classList.toggle('ph-gallerymode', m === 'gallery');
      navEl.hidden = m !== 'gallery';
      gallery.hidden = m !== 'gallery';
      stage.hidden = m !== 'viewer';
      backBtn.hidden = m !== 'viewer';
      fixBtn.classList.toggle('active', autoFix && m === 'viewer');
      if (m === 'gallery') {
        win.setTitle(filterTitle() + ' - Photo Gallery');
        if (galleryDirty) renderGallery(true);
        setTimeout(() => { if (!closed && mode === 'gallery') gridEl.focus({ preventScroll: true }); }, 30);
      } else setTimeout(() => { if (!closed && mode === 'viewer') stage.focus({ preventScroll: true }); }, 30);
      renderInfo();
      updateBar();
    }
    function openViewer(p, paths, fromG) {
      if (!p || !fs.exists(p)) return;
      if (paths && paths.includes(p)) { list = paths.slice(); listDir = null; }
      else { listDir = fs.dirname(p); list = picturesIn(listDir, false); if (!list.includes(p)) list.unshift(p); }
      fromGallery = !!fromG;
      setMode('viewer');
      loadAt(list.indexOf(p));
    }
    function showEmpty() {
      path = null;
      idx = -1;
      imgEl.hidden = true;
      imgEl.removeAttribute('src');
      vEmpty.hidden = false;
      vEmpty.replaceChildren(A.img('icons/photogallery'), h('div.ph-vempty-title', null, 'There are no more pictures here'), A.ui.button('Go to Gallery', { size: 'sm', tone: 'aqua', onClick: () => goGallery() }));
      win.setTitle('Photo Gallery');
      renderInfo();
      updateBar();
    }
    function loadAt(i) {
      if (!list.length) { showEmpty(); return; }
      idx = ((i % list.length) + list.length) % list.length;
      path = list[idx];
      const url = fs.thumbFor(path);
      const my = ++loadToken;
      vEmpty.hidden = true;
      imgEl.hidden = false;
      rot = meta.rotation(path);
      visRot = rot;
      win.setTitle(fs.basename(path) + ' - Photo Gallery');
      imgEl.classList.remove('ph-rotating');
      imgEl.classList.add('ph-swap');
      imageSize(url).then((s) => {
        if (my !== loadToken || closed) return;
        nat = s;
        fitMode = true;
        pan = { x: 0, y: 0 };
        imgEl.src = url || '';
        imgEl.alt = nameOf(path);
        layoutImage();
        requestAnimationFrame(() => requestAnimationFrame(() => imgEl.classList.remove('ph-swap')));
        renderInfo();
      });
      renderInfo();
      updateBar();
    }
    function nav(d) {
      if (mode !== 'viewer' || list.length < 2) return;
      A.sound.play('click');
      loadAt(idx + d);
    }
    const stageSize = () => ({ w: Math.max(60, stage.clientWidth), h: Math.max(60, stage.clientHeight) });
    const rotDims = () => (rot % 180 ? { w: nat.h, h: nat.w } : { w: nat.w, h: nat.h });
    function fitZoom() { const s = stageSize(), d = rotDims(); return Math.min((s.w - 28) / d.w, (s.h - 28) / d.h, 1); }
    const minZoom = () => Math.min(fitZoom(), 1);
    const isFitted = () => Math.abs(z - fitZoom()) < 0.002;
    function canPan() { const s = stageSize(), d = rotDims(); return d.w * z > s.w + 1 || d.h * z > s.h + 1; }
    function clampPan() {
      if (!canPan()) { pan = { x: 0, y: 0 }; return; }
      const s = stageSize(), d = rotDims();
      const mx = Math.max(0, (d.w * z - s.w) / 2 + 14), my = Math.max(0, (d.h * z - s.h) / 2 + 14);
      pan.x = clamp(pan.x, -mx, mx);
      pan.y = clamp(pan.y, -my, my);
    }
    function layoutImage() {
      if (!path || mode !== 'viewer') return;
      if (fitMode) { z = fitZoom(); pan = { x: 0, y: 0 }; }
      z = clamp(z, minZoom(), MAXZ);
      clampPan();
      imgEl.style.width = Math.round(nat.w * z) + 'px';
      imgEl.style.height = Math.round(nat.h * z) + 'px';
      imgEl.style.transform = `translate(-50%, -50%) translate(${Math.round(pan.x)}px, ${Math.round(pan.y)}px) rotate(${visRot}deg)`;
      imgEl.style.filter = autoFix ? 'brightness(1.04) contrast(1.08) saturate(1.22)' : '';
      stage.classList.toggle('ph-pannable', canPan());
      const zmin = minZoom();
      zoomSlider.setValue(MAXZ > zmin ? (Math.log(z / zmin) / Math.log(MAXZ / zmin)) * 100 : 0);
      const fitted = isFitted();
      fitBtn.replaceChildren(glyph(fitted ? 'actual' : 'fit'));
      fitBtn.setAttribute('aria-label', fitted ? 'Actual size' : 'Fit to window');
      fitBtn.setAttribute('data-tip', fitted ? 'Actual size' : 'Fit to window');
    }
    let badgeT = null;
    function badge() {
      zoomBadge.textContent = Math.round(z * 100) + '%';
      zoomBadge.classList.add('show');
      clearTimeout(badgeT);
      badgeT = setTimeout(() => zoomBadge.classList.remove('show'), 900);
    }
    function zoomTo(nz, cx = 0, cy = 0) {
      if (!path) return;
      nz = clamp(nz, minZoom(), MAXZ);
      if (Math.abs(nz - z) < 1e-4) { badge(); return; }
      pan.x = cx - (cx - pan.x) * (nz / z);
      pan.y = cy - (cy - pan.y) * (nz / z);
      z = nz;
      fitMode = isFitted();
      layoutImage();
      badge();
    }
    function zoomFromSlider(t) {
      const zmin = minZoom();
      zoomTo(zmin * Math.pow(MAXZ / zmin, t / 100));
    }
    function fitNow() { fitMode = true; layoutImage(); badge(); }
    function toggleFit() {
      if (!path) return;
      if (isFitted()) zoomTo(1); else fitNow();
      A.sound.play('click');
    }
    stage.addEventListener('wheel', (e) => {
      if (!path) return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomTo(z * Math.exp(-clamp(e.deltaY, -240, 240) * 0.0022), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    }, { passive: false });
    stage.addEventListener('dblclick', (e) => {
      if (!path || e.target.closest('.ph-vempty')) return;
      const r = stage.getBoundingClientRect();
      if (isFitted()) zoomTo(Math.max(1, fitZoom() * 2), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
      else fitNow();
    });
    stage.addEventListener('pointerdown', () => stage.focus({ preventScroll: true }));
    let panStart = null;
    A.util.drag(stage, {
      threshold: 2,
      filter: (e) => !!path && canPan() && !e.target.closest('.ph-vempty'),
      onStart: () => { panStart = { x: pan.x, y: pan.y }; stage.classList.add('ph-panning'); },
      onMove: (e, dx, dy) => { pan.x = panStart.x + dx; pan.y = panStart.y + dy; fitMode = false; layoutImage(); },
      onEnd: () => stage.classList.remove('ph-panning'),
    });
    stage.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!path) return;
      A.ui.menu([
        { label: 'Play Slide Show', shortcut: 'F11', onClick: playShow },
        { separator: true },
        { label: 'Fit to Window', shortcut: '0', onClick: fitNow },
        { label: 'Actual Size', shortcut: '1', onClick: () => zoomTo(1) },
        { separator: true },
        { label: 'Rotate Clockwise', shortcut: 'Ctrl+.', onClick: () => rotateBy(90) },
        { label: 'Rotate Counterclockwise', shortcut: 'Ctrl+,', onClick: () => rotateBy(-90) },
        { label: 'Rate', submenu: [5, 4, 3, 2, 1, 0].map((n) => ({ label: n ? plural(n, 'star') : 'Not rated', radio: true, checked: meta.rating(path) === n, onClick: () => { meta.setRating(path, n); A.sound.play('select'); } })) },
        { separator: true },
        { label: 'Set as Desktop Background', onClick: () => setBackground() },
        { label: 'Edit in Paint', onClick: () => editInPaint() },
        { label: 'Open File Location', onClick: () => A.apps.launch('explorer', { path }) },
        { separator: true },
        { label: 'Delete', shortcut: 'Del', onClick: deletePics },
        { label: 'Go to Gallery', shortcut: 'Esc', onClick: () => goGallery() },
      ], e.clientX, e.clientY);
    });

    // ------------------------------------------------------------ actions
    function goGallery() {
      if (mode === 'gallery') return;
      const p = path;
      if (p && !fromGallery) {
        filter = p.startsWith('/Pictures/') ? { type: 'all' } : { type: 'folder', value: fs.dirname(p) };
        galleryDirty = true;
      }
      A.sound.play('back');
      setMode('gallery');
      if (p && gitems.includes(p)) {
        gSelectOnly(p);
        scrollToThumb(p);
        requestAnimationFrame(() => requestAnimationFrame(() => { if (!closed && mode === 'gallery') scrollToThumb(p); }));
      }
    }
    function rotateBy(d) {
      const ps = targets();
      if (!ps.length) return;
      A.sound.play('click');
      if (mode === 'viewer' && path) {
        rot = meta.rotate(path, d);
        visRot += d;
        imgEl.classList.add('ph-rotating');
        layoutImage();
        clearTimeout(rotateBy.t);
        rotateBy.t = setTimeout(() => imgEl.classList.remove('ph-rotating'), 420);
      } else ps.forEach((p) => meta.rotate(p, d));
    }
    function deletePics() {
      const ps = targets();
      if (!ps.length) return;
      const binned = [], errors = [];
      ps.forEach((p) => {
        const binName = fs.uniqueName(RECYCLE, fs.basename(p));
        try { if (fs.remove(p)) binned.push(fs.join(RECYCLE, binName)); } catch (e) { errors.push(e.message); }
      });
      if (errors.length) A.ui.messageBox({ parent: win, icon: 'error', title: 'Photo Gallery', message: errors[0] });
      if (!binned.length) return;
      A.sound.play('recycle');
      const text = binned.length === 1 ? `${fs.basename(ps[0])} was moved to the Recycle Bin.` : `${binned.length} pictures were moved to the Recycle Bin.`;
      notice(text, 'Undo', () => {
        const back = binned.map((b) => (fs.exists(b) ? fs.restore(b) : null)).filter(Boolean);
        if (!back.length) return;
        A.sound.play('pop');
        if (mode === 'viewer') {
          if (listDir) list = picturesIn(listDir, false);
          back.forEach((p) => { if (!list.includes(p)) list.splice(Math.max(0, idx), 0, p); });
          loadAt(list.indexOf(back[0]));
        } else { renderGallery(true); gsel = new Set(back); applyGSel(); }
      });
      if (mode === 'viewer') {
        const at = idx;
        list = list.filter((p) => fs.exists(p));
        if (list.length) loadAt(Math.min(at, list.length - 1)); else showEmpty();
      } else { gsel = new Set(); renderGallery(true); }
    }
    function setBackground(p = target()) {
      if (!p) return;
      A.theme.setWallpaper('file:' + p, 'fill');
      A.sound.play('select');
      notice(`${nameOf(p)} is now your desktop background.`, 'Personalize', () => A.apps.launch('personalize'));
    }
    function editInPaint(p = target()) { if (p) A.apps.launch('paint', { path: p }); }
    function renamePic(p) {
      if (!p) return;
      A.ui.prompt({ parent: win, title: 'Rename', message: 'Type a new name for this picture.', value: nameOf(p), okLabel: 'Rename' }).then((v) => {
        v = String(v || '').replace(/[\\/:*?"<>|]/g, '').trim();
        if (!v || v === nameOf(p)) return;
        try { fs.rename(p, isPic(v) ? v : v + '.' + fs.ext(p)); } catch (e) { A.ui.messageBox({ parent: win, icon: 'error', title: 'Rename', message: e.message }); }
      });
    }
    function toggleInfo() {
      infoOn = !infoOn;
      A.store.set('photos.infoPane', infoOn);
      A.sound.play('click');
      renderInfo();
      if (mode === 'viewer') requestAnimationFrame(layoutImage);
    }
    function toggleBg() {
      bg = bg === 'dark' ? 'light' : 'dark';
      A.store.set('photos.viewerBg', bg);
      stage.classList.remove('ph-bg-dark', 'ph-bg-light');
      stage.classList.add('ph-bg-' + bg);
      A.sound.play('click');
    }
    function toggleFix() {
      if (mode !== 'viewer') {
        const p = target() || gitems[0];
        if (!p) return;
        openViewer(p, gitems, true);
      }
      autoFix = !autoFix;
      fixBtn.classList.toggle('active', autoFix);
      layoutImage();
      A.sound.play('click');
      notice(autoFix ? 'Auto Adjust is on. Colors look a little happier.' : 'Auto Adjust is off. Your picture is back to its own colors.');
    }
    function playShow() {
      if (show && show.running) return;
      let paths, start = 0;
      if (mode === 'viewer') { paths = list.slice(); start = Math.max(0, idx); }
      else {
        const sel = targets();
        paths = sel.length > 1 ? sel : gitems.slice();
        start = sel.length === 1 ? Math.max(0, paths.indexOf(sel[0])) : 0;
      }
      if (!paths.length) { notice('There are no pictures to show yet.'); return; }
      hidePeek();
      show = slideShow(paths, start, { onExit: onShowExit });
    }
    function onShowExit(p) {
      show = null;
      if (closed || !p || !fs.exists(p)) return;
      if (mode === 'viewer' && list.includes(p) && p !== path) loadAt(list.indexOf(p));
      else if (mode === 'gallery' && gitems.includes(p)) { gSelectOnly(p); scrollToThumb(p); }
    }
    function fileMenu() {
      const t = target();
      return [
        { label: 'Open File Location', disabled: !t, onClick: () => A.apps.launch('explorer', { path: t }) },
        { label: 'Rename...', disabled: !t, onClick: () => renamePic(t) },
        { label: 'Delete', shortcut: 'Del', disabled: !targets().length, onClick: deletePics },
        { separator: true },
        { label: 'Set as Desktop Background', disabled: !t, onClick: () => setBackground(t) },
        { label: 'Play Slide Show', shortcut: 'F11', onClick: playShow },
        { separator: true },
        { label: 'Info Pane', shortcut: 'Ctrl+I', checked: infoOn, onClick: toggleInfo },
        { separator: true },
        { label: 'Exit', onClick: () => win.close() },
      ];
    }
    function openMenu() {
      const t = target();
      return [
        { label: 'Paint', icon: 'icons/paint', disabled: !t, onClick: () => editInPaint(t) },
        { label: 'Explorer', icon: 'icons/folder', onClick: () => A.apps.launch('explorer', { path: t || (filter.type === 'folder' ? filter.value : '/Pictures') }) },
        { separator: true },
        { label: 'Choose Default Program...', disabled: true },
      ];
    }

    // ------------------------------------------------------------ info pane and bar state
    function infoRow(k, v) { return h('div.ph-info-row', null, h('span.ph-info-k', null, k), h('span.ph-info-v', null, v)); }
    function renderInfo() {
      infoEl.hidden = !infoOn;
      infoBtn.classList.toggle('active', infoOn);
      infoBbtn.classList.toggle('on', infoOn);
      if (!infoOn) return;
      const sel = targets();
      if (sel.length === 1) {
        const p = sel[0], st = fs.stat(p), url = fs.thumbFor(p), r = meta.rotation(p);
        const dims = h('span', null, '');
        imageSize(url).then((s) => { dims.textContent = r % 180 ? `${s.h} x ${s.w}` : `${s.w} x ${s.h}`; });
        infoEl.replaceChildren(
          h('div.ph-info-head', null, 'Info'),
          h('div.ph-info-thumb', null, h('img', { src: url || '', alt: '', class: r % 180 ? 'turned' : null, style: r ? { '--rot': r + 'deg' } : null })),
          h('div.ph-info-name', null, fs.basename(p)),
          infoRow('Date taken', fmtDT(st && st.modified)),
          infoRow('Size', A.util.fmtBytes(st ? st.size : 0)),
          infoRow('Dimensions', dims),
          infoRow('Type', fs.typeName(p)),
          infoRow('Folder', fs.dirname(p)),
          h('div.ph-info-rate', null, h('span.ph-info-k', null, 'Rating'), starsEl(p)));
      } else {
        const ps = sel.length ? sel : (mode === 'viewer' ? list : gitems);
        let size = 0;
        ps.forEach((p) => { const st = fs.stat(p); size += st ? st.size : 0; });
        infoEl.replaceChildren(
          h('div.ph-info-head', null, 'Info'),
          h('div.ph-info-thumb.ph-info-stack', null, ps.slice(0, 3).map((p, i) => h('img', { src: fs.thumbFor(p) || '', alt: '', style: { '--i': i } }))),
          h('div.ph-info-name', null, sel.length ? plural(sel.length, 'picture') + ' selected' : filterTitle()),
          infoRow('Items', String(ps.length)),
          infoRow('Total size', A.util.fmtBytes(size)),
          sel.length ? null : h('p.ph-info-hint', null, 'Select a picture to see its details and rating.'));
      }
    }
    function updateBar() {
      const has = targets().length > 0;
      const one = mode === 'viewer' ? !!path : gsel.size === 1;
      [rotLBtn, rotRBtn, delBtn].forEach((b) => (b.disabled = !has));
      [wallBtn, paintBtn].forEach((b) => (b.disabled = !one));
      prevBtn.disabled = nextBtn.disabled = !(mode === 'viewer' && list.length > 1);
      playBtn.disabled = mode === 'viewer' ? !list.length : !gitems.length;
      fitBtn.disabled = zoomSlider.disabled = !(mode === 'viewer' && path);
    }

    // ------------------------------------------------------------ keyboard
    stage.addEventListener('keydown', viewerKey);
    function viewerKey(e) {
      if (A.util.isTyping(e)) return;
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); nav(1); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); nav(-1); }
      else if (k === 'Home') { e.preventDefault(); if (list.length) loadAt(0); }
      else if (k === 'End') { e.preventDefault(); if (list.length) loadAt(list.length - 1); }
      else if (k === '+' || k === '=') { e.preventDefault(); zoomTo(z * 1.25); }
      else if (k === '-' || k === '_') { e.preventDefault(); zoomTo(z / 1.25); }
      else if (ctrl && /^[0-5]$/.test(k)) { e.preventDefault(); if (path) { meta.setRating(path, Number(k)); A.sound.play('select'); } }
      else if (k === '0') { e.preventDefault(); fitNow(); }
      else if (k === '1') { e.preventDefault(); zoomTo(1); }
      else if (k === 'Delete') { e.preventDefault(); deletePics(); }
      else if (k === 'Escape') { e.preventDefault(); goGallery(); }
      else if (ctrl && k === '.') { e.preventDefault(); rotateBy(90); }
      else if (ctrl && k === ',') { e.preventDefault(); rotateBy(-90); }
    }
    win.el.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || closed || A.util.isTyping(e)) return;
      // Keys that land on the frame itself (after a title bar click) still drive the current view.
      if (e.target === win.el) { if (mode === 'viewer') viewerKey(e); else galleryKey(e); if (e.defaultPrevented) return; }
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      if (k === 'F11' || k === 'F5') { e.preventDefault(); playShow(); }
      else if (ctrl && k.toLowerCase() === 'i') { e.preventDefault(); toggleInfo(); }
      else if (ctrl && k.toLowerCase() === 'w') { e.preventDefault(); win.close(); }
      else if (ctrl && (k === '.' || k === ',')) { e.preventDefault(); rotateBy(k === '.' ? 90 : -90); }
      else if (mode === 'viewer' && (k === 'ArrowRight' || k === 'ArrowLeft')) { e.preventDefault(); nav(k === 'ArrowRight' ? 1 : -1); }
    });

    // ------------------------------------------------------------ live updates
    const refresh = A.util.debounce(() => {
      if (closed) return;
      if (mode === 'viewer') {
        if (listDir && fs.isDir(listDir)) list = picturesIn(listDir, false);
        else list = list.filter((p) => fs.exists(p));
        if (path && !fs.exists(path)) { if (list.length) loadAt(Math.min(Math.max(0, idx), list.length - 1)); else showEmpty(); }
        else if (path) { idx = list.indexOf(path); if (idx < 0) { list.unshift(path); idx = 0; } renderInfo(); updateBar(); }
        galleryDirty = true;
      } else renderGallery(true);
    }, 120);
    cleanups.push(fs.on(() => { if (!closed) refresh(); }));
    cleanups.push(A.bus.on('fs:rename', (ev) => {
      if (!ev || !ev.from) return;
      const fix = (x) => (typeof x !== 'string' ? x : x === ev.from ? ev.to : x.startsWith(ev.from + '/') ? ev.to + x.slice(ev.from.length) : x);
      list = list.map(fix);
      path = fix(path);
      listDir = fix(listDir);
      gsel = new Set([...gsel].map(fix));
      ganchor = fix(ganchor);
      gfocus = fix(gfocus);
      if (filter.type === 'folder') filter = { type: 'folder', value: fix(filter.value) };
      if (mode === 'viewer' && path) win.setTitle(fs.basename(path) + ' - Photo Gallery');
    }));
    const ratingsChanged = A.util.debounce(() => {
      if (closed) return;
      if (mode === 'gallery') {
        if (filter.type === 'rating' || filter.type === 'unrated') renderGallery(true);
        else { gridEl.querySelectorAll('.ph-stars').forEach((s) => s.refresh && s.refresh()); renderNav(); }
      } else galleryDirty = true;
      renderInfo();
    }, 60);
    cleanups.push(A.store.on('photos.ratings', ratingsChanged));
    cleanups.push(A.store.on('photos.rotation', () => {
      if (closed) return;
      if (mode === 'gallery') renderGallery(true); else galleryDirty = true;
      renderInfo();
    }));
    win.on('minimize', hidePeek);

    // ------------------------------------------------------------ start
    const startPath = args.path && fs.exists(args.path) && !fs.isDir(args.path) && isPic(args.path) ? fs.normalize(args.path) : null;
    const explicit = Array.isArray(args.paths) ? args.paths.filter((p) => typeof p === 'string' && fs.exists(p) && isPic(p)) : null;
    const folderArg = args.folder && fs.isDir(args.folder) ? fs.normalize(args.folder) : null;
    if (folderArg) filter = folderArg === '/Pictures' ? { type: 'all' } : { type: 'folder', value: folderArg };
    if (startPath) openViewer(startPath, explicit && explicit.includes(startPath) ? explicit : null, false);
    else setMode('gallery');
    if (args.slideshow) {
      const paths = explicit && explicit.length ? explicit : folderArg ? picturesIn(folderArg, args.recursive !== false) : picturesIn('/Pictures', true);
      setTimeout(() => {
        if (closed || !paths.length) return;
        show = slideShow(paths, Math.max(0, startPath ? paths.indexOf(startPath) : 0), { onExit: onShowExit });
      }, 260);
    }

    return {
      keepAwake: () => !!(show && show.running),
      onResize() { if (mode === 'viewer') layoutImage(); hidePeek(); },
      onClose() {
        closed = true;
        if (show && show.running) show.stop();
        hidePeek();
        clearTimeout(notice.t);
        clearTimeout(badgeT);
        clearTimeout(rotateBy.t);
        cleanups.forEach((off) => { try { off(); } catch (e) { /* ignore */ } });
      },
    };
  }
})();

