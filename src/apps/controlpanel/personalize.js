/* Aerium Personalization: the "Personalize appearance and sounds" hub with
   Window Color and Appearance, Desktop Background, Screen Saver, Sounds,
   Mouse Pointers, Theme, Display Settings and Taskbar and Start Menu.
   Every change previews live; OK and Apply keep it, Cancel puts back what
   was there. Pages live in the shared settings frame (Aerium.cpKit), so the
   Control Panel can show them too. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, s, clamp } = A.util;
  const K = A.cpKit;
  if (!K || !K.frame) return;
  const T = A.theme;

  // ============================================================ helpers
  const glassName = () => {
    const custom = A.store.get('glass.custom');
    if (custom) return 'Custom color';
    const g = T.GLASS.find((x) => x.id === A.store.get('glass.color'));
    return g ? g.name : 'Sky';
  };
  const wallName = (id) => {
    if (typeof id === 'string' && id.startsWith('file:')) return A.fs.stem(id.slice(5));
    const def = T.wallpapers.get(id);
    return def ? def.name : 'Aquarium';
  };
  const saverName = () => {
    const def = A.screensaver.registry.get(A.store.get('screensaver.id'));
    return def ? def.name : '(None)';
  };
  const themeName = () => (T.THEMES[T.current] || T.THEMES.light).name;

  // A wallpaper thumbnail, with a soft stand-in when a living one has no picture.
  function wallThumb(id) {
    const el = T.thumb(id);
    if (!el.style.backgroundImage && !el.style.background) {
      const def = T.wallpapers.get(id);
      el.classList.add('pz-thumb-fallback');
      el.dataset.pzTheme = (def && def.theme) || 'light';
      el.appendChild(A.img(/aquarium|betta|fish/.test(id) ? 'icons/aquarium' : def && def.kind === 'animated' ? 'icons/play' : 'icons/photo', { class: 'pz-thumb-glyph' }));
    }
    return el;
  }

  // A tiny live desktop: the current wallpaper with a glass window and taskbar.
  function miniDesktop() {
    const wp = h('div.pz-mini-wp');
    const el = h('div.pz-mini', { 'aria-hidden': 'true' },
      wp,
      h('div.pz-mini-win', null, h('div.pz-mini-title'), h('div.pz-mini-body', null, h('i'), h('i'), h('i'))),
      h('div.pz-mini-bar', null, h('span.pz-mini-orb'), h('span.pz-mini-app'), h('span.pz-mini-app'), h('span.pz-mini-clock')));
    el.setWallpaper = (id) => { wp.innerHTML = ''; wp.appendChild(wallThumb(id)); };
    el.setWallpaper(A.store.get('wallpaper'));
    return el;
  }
  K.miniDesktop = miniDesktop;
  K.wallThumb = wallThumb;

  const chev = (down) => s('svg', { viewBox: '0 0 8 8', width: 8, height: 8, 'aria-hidden': 'true' }, s('path', { d: down ? 'M1 2.5h6L4 6z' : 'M2.5 1v6L6 4z', fill: 'currentColor' }));

  // ============================================================ hub
  const HUB = [
    ['pz:color', 'palette', 'Window Color and Appearance', 'Tint your windows, Start menu and taskbar, and make the glass as clear or as colorful as you like.'],
    ['pz:background', 'icons/photo', 'Desktop Background', 'Pick a photo, a living scene or one of your own pictures to sit behind your windows.'],
    ['pz:screensaver', 'icons/monitor', 'Screen Saver', 'Choose what plays when your computer rests for a while, and how long it waits first.'],
    ['pz:sounds', 'icons/speaker', 'Sounds', 'Listen to every chime, pop and whoosh, and choose whether you hear them.'],
    ['pz:mouse', 'mouse', 'Mouse Pointers', 'Pick a pointer, switch on pointer trails and test your double-click speed.'],
    ['pz:theme', 'icons/rainbow', 'Theme', 'Switch between Aerium, Aerium Night and Technozen in a single click.'],
    ['pz:display', 'icons/laptop', 'Display Settings', 'Adjust the resolution, identify your monitor and make text easier to read.'],
    ['pz:taskbar', 'taskbar', 'Taskbar and Start Menu', 'Show or hide the clock, tuck the taskbar away and choose what the Start menu shows.'],
  ];

  function desktopIconsDialog(ctx) {
    let size = A.store.get('desktop.iconSize');
    let show = A.store.get('desktop.showIcons');
    const content = h('div.cp-dlg', null,
      h('p', null, 'Choose how the icons on your desktop look.'),
      A.ui.checkbox({ label: 'Show desktop icons', checked: show, onChange: (v) => { show = v; } }),
      h('p', { style: 'margin: 14px 0 6px' }, 'Icon size:'),
      A.ui.radioGroup({ value: size, options: [['large', 'Large icons'], ['medium', 'Medium icons'], ['small', 'Classic icons']], onChange: (v) => { size = v; } }));
    A.ui.dialog({ parent: ctx.win, title: 'Desktop Icon Settings', icon: 'icons/folder-desktop', content, width: 380, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] }).then((r) => {
      if (r !== 'ok') return;
      A.store.set('desktop.showIcons', show);
      A.store.set('desktop.iconSize', size);
      if (A.desktop && A.desktop.render) A.desktop.render();
      A.sound.play('select');
    });
  }

  K.page('pz:home', {
    title: 'Personalization', icon: 'icons/personalize', parent: 'cat:appearance',
    keywords: ['personalize', 'personalization', 'appearance', 'customize', 'desktop', 'look'],
    side: (ctx) => [
      { links: [{ label: 'Control Panel Home', target: 'cp:home', bold: true }] },
      { title: 'Tasks', links: [
        { label: 'Change desktop icons', target: () => desktopIconsDialog(ctx) },
        { label: 'Adjust font size', target: 'pz:display' },
        { label: 'Change your account picture', target: 'cp:users-picture' }] },
      { title: 'See also', links: [{ label: 'Taskbar and Start Menu', target: 'pz:taskbar' }, { label: 'Ease of Access', target: 'cp:access' }, { label: 'Welcome Center', target: { app: 'welcome' } }] },
    ],
    build(ctx) {
      const mini = miniDesktop();
      const facts = h('div.pz-hub-facts');
      const renderFacts = () => {
        mini.setWallpaper(A.store.get('wallpaper'));
        facts.innerHTML = '';
        [['Window color', glassName(), 'pz:color'], ['Background', wallName(A.store.get('wallpaper')), 'pz:background'], ['Screen saver', saverName(), 'pz:screensaver'], ['Sounds', A.store.get('sound.enabled') ? 'Aerium Default' : 'No Sounds', 'pz:sounds'], ['Theme', themeName(), 'pz:theme']]
          .forEach(([k, v, t]) => facts.appendChild(h('div.pz-hub-fact', null, h('span.cp-muted', null, k + ':'), K.link(v, () => ctx.go(t)))));
      };
      renderFacts();
      ['store:wallpaper', 'glass:change', 'store:screensaver.id', 'store:sound.enabled', 'theme:change'].forEach((ev) => ctx.bus(ev, renderFacts));
      const list = h('div.pz-hub-list');
      HUB.forEach(([id, icon, title, desc]) => list.appendChild(K.item({ icon, title, desc, className: 'pz-hub-item', onClick: () => ctx.go(id) })));
      return h('div.pz-hub', null,
        h('div.pz-hub-top', null,
          h('div.pz-hub-head', null, h('h1.cp-title', null, 'Personalize appearance and sounds'), h('p.cp-lead', null, 'Make Aerium feel like yours. Every change shows up right away, so go ahead and play.')),
          h('div.pz-hub-preview', null, mini, facts)),
        list);
    },
  });

  // ============================================================ Window Color and Appearance
  function appearanceDialog(ctx) {
    let v = !A.store.get('glass.transparency') ? 'basic' : A.store.get('effects.level') === 'performance' ? 'lite' : 'aerium';
    const opts = [
      ['aerium', 'Aerium', 'Clear glass with blur, streaks and shine. The full experience.'],
      ['lite', 'Aerium Lite', 'Tinted glass without the blur. Kinder to slower computers.'],
      ['basic', 'Aerium Basic', 'Solid, opaque window frames. Very sensible, a little less sparkly.'],
    ];
    const content = h('div.cp-dlg', null,
      h('p', null, 'Color scheme:'),
      A.ui.radioGroup({ value: v, options: opts.map(([id, name, desc]) => [id, h('span.pz-scheme-opt', null, h('b', null, name), h('span.cp-muted', null, desc))]), onChange: (x) => { v = x; } }));
    A.ui.dialog({ parent: ctx.win, title: 'Appearance Settings', icon: K.icons.palette, content, width: 430, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] }).then((r) => {
      if (r !== 'ok') return;
      A.store.set('effects.level', v === 'lite' ? 'performance' : 'best');
      T.applyEffects();
      T.setGlass({ transparency: v !== 'basic' });
      A.sound.play('select');
    });
  }

  K.page('pz:color', {
    title: 'Window Color and Appearance', icon: 'palette', parent: 'pz:home', side: false,
    keywords: ['color', 'colour', 'glass', 'transparency', 'intensity', 'tint', 'mixer', 'hue', 'saturation', 'brightness', 'window color'],
    build(ctx) {
      const footer = K.settingsFooter(ctx, {
        keys: ['glass.color', 'glass.custom', 'glass.intensity', 'glass.transparency'],
        restore: () => T.applyGlass(),
      });
      const swatches = h('div.pz-swatches', { role: 'radiogroup', 'aria-label': 'Glass colors' });
      T.GLASS.forEach((g) => {
        const b = h('button.pz-swatch', { type: 'button', role: 'radio', 'aria-label': g.name, 'data-tip': g.name, dataset: { id: g.id }, style: { '--c': g.hex } },
          h('span.pz-swatch-streaks'), h('span.pz-swatch-shine'));
        b.addEventListener('click', () => { T.setGlass({ color: g.id }); A.sound.play('click'); });
        swatches.appendChild(b);
      });
      const nameEl = h('span.pz-color-name');
      const transp = A.ui.checkbox({ label: 'Enable transparency', checked: A.store.get('glass.transparency'), onChange: (v) => T.setGlass({ transparency: v }) });
      const intensityVal = h('span.pz-val');
      const intensity = A.ui.slider({ min: 0, max: 100, value: A.store.get('glass.intensity'), label: 'Color intensity', className: 'pz-track', onInput: (v) => { T.setGlass({ intensity: v }); } });
      const cur0 = T.glassColor();
      const mixSlider = (label, max, val) => A.ui.slider({ min: 0, max, value: val, label, className: 'pz-track', onInput: () => mix() });
      const hue = mixSlider('Hue', 359, cur0.h), sat = mixSlider('Saturation', 100, cur0.s), lig = mixSlider('Brightness', 100, cur0.l);
      function mix() { T.setGlass({ custom: { id: 'custom', name: 'Custom', h: +hue.value, s: +sat.value, l: +lig.value } }); }
      const mixRow = (label, el) => h('label.pz-mix-row', null, h('span', null, label), el);
      const mixer = h('div.pz-mixer', null, mixRow('Hue:', hue), mixRow('Saturation:', sat), mixRow('Brightness:', lig));
      const mixOpen = !!A.store.get('glass.custom');
      mixer.hidden = !mixOpen;
      const mixBtn = h('button.pz-expand', { type: 'button', class: mixOpen && 'open', 'aria-expanded': String(mixOpen) }, h('span.cp-expander', { class: mixOpen && 'open' }, chev(true)), h('span', null, mixOpen ? 'Hide color mixer' : 'Show color mixer'));
      mixBtn.addEventListener('click', () => {
        mixer.hidden = !mixer.hidden;
        mixBtn.classList.toggle('open', !mixer.hidden);
        mixBtn.firstChild.classList.toggle('open', !mixer.hidden);
        mixBtn.lastChild.textContent = mixer.hidden ? 'Show color mixer' : 'Hide color mixer';
        mixBtn.setAttribute('aria-expanded', String(!mixer.hidden));
        A.sound.play('click');
      });
      const mini = miniDesktop();
      function sync() {
        const c = T.glassColor();
        const custom = !!A.store.get('glass.custom');
        const sel = A.store.get('glass.color');
        swatches.querySelectorAll('.pz-swatch').forEach((b) => {
          const on = !custom && b.dataset.id === sel;
          b.classList.toggle('selected', on);
          b.setAttribute('aria-checked', String(on));
        });
        nameEl.textContent = glassName();
        transp.checked = !!A.store.get('glass.transparency');
        const iv = A.store.get('glass.intensity');
        if (document.activeElement !== intensity) intensity.setValue(iv);
        intensityVal.textContent = iv + '%';
        [[hue, c.h], [sat, c.s], [lig, c.l]].forEach(([el, v]) => { if (document.activeElement !== el) el.setValue(v); });
        const hsl = (hh, ss, ll, a) => `hsla(${hh}, ${ss}%, ${ll}%, ${a == null ? 1 : a})`;
        intensity.style.setProperty('--track', `linear-gradient(to right, ${hsl(c.h, c.s, c.l, 0.08)}, ${hsl(c.h, c.s, c.l)})`);
        hue.style.setProperty('--track', `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((x) => hsl(x, 88, 55)).join(', ')})`);
        sat.style.setProperty('--track', `linear-gradient(to right, ${hsl(c.h, 0, c.l)}, ${hsl(c.h, 100, c.l)})`);
        lig.style.setProperty('--track', `linear-gradient(to right, ${hsl(c.h, c.s, 0)}, ${hsl(c.h, c.s, 50)}, ${hsl(c.h, c.s, 100)})`);
        mixer.style.setProperty('--mix', hsl(c.h, c.s, c.l));
      }
      ctx.bus('glass:change', sync);
      ctx.bus('store:wallpaper', () => mini.setWallpaper(A.store.get('wallpaper')));
      sync();
      return h('div.pz-color', null,
        K.head('Change the color of your windows, Start menu and taskbar', 'Pick one of the glass colors or mix your own. Every window changes as you go.'),
        h('div.pz-color-top', null,
          h('div.pz-color-left', null,
            swatches,
            h('div.pz-color-current', null, h('span.cp-muted', null, 'Current color:'), nameEl),
            h('div.pz-color-controls', null,
              transp,
              h('label.pz-intensity-row', null, h('span', null, 'Color intensity:'), intensity, intensityVal),
              mixBtn,
              mixer)),
          h('div.pz-color-preview', null, mini, h('div.cp-fine', null, 'Preview over your desktop'))),
        h('div.cp-link-list', null, K.link('Open appearance settings for more options', () => appearanceDialog(ctx), { icon: 'palette' })),
        footer);
    },
  });

  // ============================================================ Desktop Background
  const FITS = [['fill', 'Fill'], ['fit', 'Fit'], ['stretch', 'Stretch'], ['tile', 'Tile'], ['center', 'Center']];
  // Little monitors that show how a picture sits on the screen.
  function fitGlyph(fit) {
    const id = A.util.uid('fg');
    const pic = (x, y, w, hh) => [
      s('rect', { x, y, width: w, height: hh, fill: `url(#${id}s)` }),
      s('path', { d: `M${x} ${y + hh} L${x + w * 0.32} ${y + hh * 0.45} L${x + w * 0.55} ${y + hh * 0.72} L${x + w * 0.75} ${y + hh * 0.5} L${x + w} ${y + hh} Z`, fill: '#35c93a' }),
      s('circle', { cx: x + w * 0.76, cy: y + hh * 0.28, r: Math.max(1.2, hh * 0.12), fill: '#ffd62e' }),
    ];
    let inner;
    if (fit === 'fill') inner = pic(2, 1, 40, 26);
    else if (fit === 'fit') inner = [s('rect', { x: 4, y: 3, width: 36, height: 22, fill: '#0b1a2a' }), ...pic(9, 3, 26, 22)];
    else if (fit === 'stretch') inner = [s('g', { transform: 'translate(4 3) scale(1.385 0.846)' }, ...pic(0, 0, 26, 26))];
    else if (fit === 'tile') inner = [...pic(4, 3, 18, 11), ...pic(22, 3, 18, 11), ...pic(4, 14, 18, 11), ...pic(22, 14, 18, 11)];
    else inner = [s('rect', { x: 4, y: 3, width: 36, height: 22, fill: '#1b3a5c' }), ...pic(14, 8, 16, 12)];
    return s('svg', { viewBox: '0 0 44 36', width: 44, height: 36, class: 'pz-fit-glyph', 'aria-hidden': 'true' },
      s('defs', null, s('linearGradient', { id: id + 's', x1: 0, y1: 0, x2: 0, y2: 1 }, s('stop', { offset: 0, 'stop-color': '#1f8fe6' }), s('stop', { offset: 1, 'stop-color': '#bfe6ff' }))),
      s('rect', { x: 1, y: 1, width: 42, height: 27, rx: 2.5, fill: '#1a222c' }),
      s('clipPath', { id: id + 'c' }, s('rect', { x: 4, y: 3, width: 36, height: 22 })),
      s('g', { 'clip-path': `url(#${id}c)` }, ...inner),
      s('path', { d: 'M18 28 L26 28 L27.5 33 L16.5 33 Z', fill: '#8e9aa6' }),
      s('rect', { x: 12, y: 32.5, width: 20, height: 2.5, rx: 1.2, fill: '#aab4be' }));
  }
  function picturesList() {
    const out = [];
    const walk = (dir, depth) => {
      if (depth > 3) return;
      A.fs.list(dir).forEach((it) => {
        if (it.type === 'folder') walk(it.path, depth + 1);
        else if (A.fs.thumbFor(it.path)) out.push(it);
      });
    };
    walk('/Pictures', 0);
    return out;
  }
  const GROUP_BY_THEME = { light: 'Daylight', dark: 'Night', technozen: 'Technozen' };

  K.page('pz:background', {
    title: 'Desktop Background', icon: 'icons/photo', parent: 'pz:home', side: false,
    keywords: ['background', 'wallpaper', 'desktop', 'picture', 'photo', 'animated', 'aquarium', 'fit', 'stretch', 'tile'],
    build(ctx) {
      const footer = K.settingsFooter(ctx, {
        keys: ['wallpaper', 'wallpaper.fit'],
        restore: (snap) => T.setWallpaper(snap.wallpaper, snap['wallpaper.fit']),
      });
      const curId = () => A.store.get('wallpaper');
      const curDef = () => T.wallpapers.get(curId());
      let loc = String(curId()).startsWith('file:') ? 'pictures' : curDef() && curDef().kind === 'animated' ? 'animated' : 'images';
      if (ctx.params.loc) loc = ctx.params.loc;
      const grid = h('div.pz-wp-grid', { role: 'listbox', 'aria-label': 'Backgrounds' });
      const locSel = A.ui.select({ options: [['animated', 'Aerium Animated'], ['images', 'Aerium Wallpapers'], ['pictures', 'Pictures folder']], value: loc, label: 'Picture location', onChange: (v) => { loc = v; renderGrid(); A.sound.play('click'); } });
      const count = h('span.cp-muted.pz-wp-count');
      let hoverStop = null;
      function liveHover(tile, def) {
        if (!def || def.kind !== 'animated' || !def.create) return;
        let t = null;
        tile.addEventListener('pointerenter', () => {
          t = setTimeout(() => {
            stopHover();
            const box = tile.querySelector('.pz-wp-thumb');
            if (!box) return;
            const host = h('div.pz-wp-live');
            const stage = h('div.pz-wp-stage');
            host.appendChild(stage);
            box.appendChild(host);
            const scale = box.clientWidth / 480;
            stage.style.transform = `scale(${scale})`;
            let ctrl = null;
            try { ctrl = def.create(stage, { theme: document.documentElement.dataset.theme, preview: true }) || null; } catch (e) { ctrl = null; }
            hoverStop = () => { try { ctrl && ctrl.destroy && ctrl.destroy(); } catch (e) { /* ignore */ } host.remove(); hoverStop = null; };
            requestAnimationFrame(() => host.classList.add('on'));
          }, 450);
        });
        tile.addEventListener('pointerleave', () => { clearTimeout(t); stopHover(); });
      }
      const stopHover = () => { if (hoverStop) hoverStop(); };
      ctx.cleanup(stopHover);
      function tile(id, name, def) {
        const thumb = h('div.pz-wp-thumb', null, wallThumb(id));
        if (def && def.kind === 'animated') thumb.appendChild(h('span.pz-wp-badge', { 'data-tip': 'Animated background' }, s('svg', { viewBox: '0 0 10 10', width: 9, height: 9, 'aria-hidden': 'true' }, s('path', { d: 'M2.5 1.5v7l6-3.5z', fill: 'currentColor' })), 'Live'));
        const b = h('button.pz-wp', { type: 'button', role: 'option', dataset: { id }, 'aria-label': name, 'data-tip': name }, thumb, h('span.pz-wp-name', null, name));
        b.addEventListener('click', () => { T.setWallpaper(id, A.store.get('wallpaper.fit')); A.sound.play('click'); });
        b.addEventListener('dblclick', () => footer.commit());
        liveHover(b, def);
        return b;
      }
      function renderGrid() {
        stopHover();
        grid.innerHTML = '';
        const groups = new Map();
        const add = (g, el) => { if (!groups.has(g)) groups.set(g, []); groups.get(g).push(el); };
        if (loc === 'pictures') {
          picturesList().forEach((it) => add(A.fs.basename(A.fs.dirname(it.path)) || 'Pictures', tile('file:' + it.path, A.fs.stem(it.path), null)));
        } else {
          Array.from(T.wallpapers.values())
            .filter((d) => (loc === 'animated' ? d.kind === 'animated' : d.kind !== 'animated'))
            .forEach((d) => add(loc === 'animated' ? (d.group && d.group !== 'Aerium Animated' ? d.group : 'Living scenes') : GROUP_BY_THEME[d.theme] || d.group || 'More backgrounds', tile(d.id, d.name, d)));
        }
        let n = 0;
        groups.forEach((els, g) => {
          grid.appendChild(h('div.pz-wp-group', null, g));
          els.forEach((el) => { grid.appendChild(el); n++; });
        });
        if (!n) grid.appendChild(h('div.pz-wp-empty', null, loc === 'pictures' ? 'There are no pictures in your Pictures folder yet. Paint something and save it there!' : 'No backgrounds here yet.'));
        count.textContent = n + (n === 1 ? ' background' : ' backgrounds');
        mark();
      }
      const fitName = A.util.uid('fit');
      const fitBox = h('div.pz-fits', { role: 'radiogroup', 'aria-label': 'Picture position' });
      FITS.forEach(([v, label]) => {
        const r = A.ui.radio({ name: fitName, value: v, label, checked: A.store.get('wallpaper.fit') === v, onChange: () => { T.setWallpaper(curId(), v); A.sound.play('click'); } });
        r.classList.add('pz-fit');
        r.insertBefore(fitGlyph(v), r.querySelector('.ae-check-label'));
        fitBox.appendChild(r);
      });
      const fitNote = h('div.cp-fine.pz-fit-note');
      function mark() {
        const id = curId();
        grid.querySelectorAll('.pz-wp').forEach((b) => { const on = b.dataset.id === id; b.classList.toggle('selected', on); b.setAttribute('aria-selected', String(on)); });
        const def = curDef();
        const animated = def && def.kind === 'animated';
        fitBox.classList.toggle('disabled', !!animated);
        fitBox.querySelectorAll('input').forEach((i) => { i.disabled = !!animated; i.checked = i.value === A.store.get('wallpaper.fit'); });
        fitNote.textContent = animated ? 'Living backgrounds always fill the whole screen.' : 'Choose how the picture fits your screen.';
      }
      ctx.bus('store:wallpaper', mark);
      ctx.bus('store:wallpaper.fit', mark);
      ctx.bus('wallpapers:change', renderGrid);
      ctx.bus('fs:change', (ev) => { if (loc === 'pictures' && ev && String(ev.path || '').startsWith('/Pictures')) renderGrid(); });
      async function browse() {
        const p = await A.ui.fileDialog({ mode: 'open', parent: ctx.win, title: 'Browse', folder: '/Pictures', exts: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'], filterLabel: 'Pictures (*.png; *.jpg; *.gif; *.bmp)' });
        if (!p || !ctx.alive) return;
        if (!A.fs.thumbFor(p)) { A.ui.messageBox({ parent: ctx.win, title: 'Desktop Background', icon: 'warning', message: 'Aerium can\'t show that file as a background.' }); return; }
        T.setWallpaper('file:' + p, A.store.get('wallpaper.fit'));
        loc = 'pictures';
        locSel.value = 'pictures';
        renderGrid();
      }
      const peek = h('button.pz-peek', { type: 'button', 'data-tip': 'Hold to peek at the desktop' }, A.img('icons/monitor'), h('span', null, 'Hold to peek'));
      const peekOn = () => { if (A.taskbar && A.taskbar.peek) A.taskbar.peek('desktop'); };
      const peekOff = () => { if (A.taskbar && A.taskbar.peek) A.taskbar.peek(null); };
      peek.addEventListener('pointerdown', (e) => { peek.setPointerCapture && peek.setPointerCapture(e.pointerId); peekOn(); });
      peek.addEventListener('pointerup', peekOff);
      peek.addEventListener('pointercancel', peekOff);
      peek.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') peekOn(); });
      peek.addEventListener('keyup', peekOff);
      ctx.cleanup(peekOff);
      renderGrid();
      return {
        el: h('div.pz-bg', null,
          K.head('Choose a desktop background', 'Click a picture to make it your background. Living scenes move gently, and hovering over one plays it.'),
          h('div.pz-bg-bar', null, h('label.pz-bg-loc', null, h('span', null, 'Picture location:'), locSel), A.ui.button('Browse...', { size: 'sm', onClick: browse }), count, h('span.cp-spacer'), peek),
          grid,
          h('div.pz-fit-box', null, h('div.pz-fit-title', null, 'How should the picture be positioned?'), fitBox, fitNote),
          footer),
        onShow() { const sel = grid.querySelector('.pz-wp.selected'); if (sel) K.reveal(sel, grid); },
      };
    },
  });

  // ============================================================ Screen Saver
  K.page('pz:screensaver', {
    title: 'Screen Saver Settings', icon: 'icons/monitor', parent: 'pz:home', side: false,
    keywords: ['screensaver', 'screen saver', 'idle', 'wait', 'bubbles', 'ribbons', 'aurora', '3d text', 'lock', 'preview'],
    build(ctx) {
      const SS = A.screensaver;
      const footer = K.settingsFooter(ctx, { keys: ['screensaver.id', 'screensaver.wait', 'screensaver.text', 'screensaver.lock'] });
      const mon = K.monitor({ width: 300, className: 'pz-ss-monitor' });
      let stop = null;
      const cur = () => A.store.get('screensaver.id');
      const hasSaver = (id) => !!(id && id !== 'none' && SS.registry.get(id));
      function preview() {
        if (stop) { try { stop(); } catch (e) { /* ignore */ } stop = null; }
        mon.host.innerHTML = '';
        const id = cur();
        if (!hasSaver(id)) {
          mon.host.appendChild(wallThumb(A.store.get('wallpaper')));
          mon.host.appendChild(h('div.pz-ss-none', null, '(None)'));
          return;
        }
        stop = SS.preview(id, mon.host);
      }
      const options = () => [['none', '(None)']].concat(SS.list().map((d) => [d.id, d.name]));
      const selWrap = h('span.pz-ss-selwrap');
      let sel = null;
      function buildSelect() {
        sel = A.ui.select({ options: options(), value: hasSaver(cur()) ? cur() : 'none', label: 'Screen saver', onChange: (v) => { A.store.set('screensaver.id', v); preview(); updateButtons(); A.sound.play('click'); } });
        selWrap.innerHTML = '';
        selWrap.appendChild(sel);
      }
      buildSelect();
      const wait = h('input.ae-input.pz-wait', { type: 'number', min: 1, max: 120, value: A.store.get('screensaver.wait') || 3, 'aria-label': 'Wait minutes' });
      const saveWait = () => { const v = clamp(Math.round(Number(wait.value) || 1), 1, 120); wait.value = v; A.store.set('screensaver.wait', v); };
      wait.addEventListener('change', saveWait);
      wait.addEventListener('input', () => { if (Number(wait.value) >= 1) A.store.set('screensaver.wait', clamp(Math.round(Number(wait.value)), 1, 120)); });
      const lock = K.storeCheck('screensaver.lock', 'On resume, display logon screen', false);
      const settingsBtn = A.ui.button('Settings...', { size: 'sm', onClick: () => settings() });
      const previewBtn = A.ui.button('Preview', { size: 'sm', onClick: () => { if (hasSaver(cur())) { A.sound.play('click'); K.previewSaver(cur()); } } });
      function updateButtons() { previewBtn.disabled = !hasSaver(cur()); settingsBtn.disabled = !hasSaver(cur()); }
      function isText(def) { return /text/i.test(def.id + ' ' + def.name); }
      function settings() {
        const def = SS.registry.get(cur());
        if (!def) return;
        if (typeof def.settings === 'function') { try { def.settings({ parent: ctx.win }); } catch (e) { console.error(e); } return; }
        if (!isText(def)) {
          A.ui.messageBox({ parent: ctx.win, title: def.name, icon: 'info', instruction: 'This screen saver has no options that you can set', message: def.name + ' already knows exactly what it wants to do. Just sit back and watch.' });
          return;
        }
        const field = A.ui.textField({ label: 'Custom text:', value: A.store.get('screensaver.text') || 'Aerium', maxLength: 24 });
        const sample = h('div.pz-3d-sample');
        const upd = () => { sample.textContent = field.input.value || 'Aerium'; };
        field.input.addEventListener('input', upd);
        upd();
        A.ui.dialog({ parent: ctx.win, title: '3D Text Settings', icon: 'icons/monitor', width: 400, content: h('div.cp-dlg', null, field, h('div.cp-fine', null, 'Up to 24 letters. Your name, a secret message, or "ask me about my fish".'), sample), buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] }).then((r) => {
          if (r !== 'ok') return;
          A.store.set('screensaver.text', field.input.value.trim() || 'Aerium');
          if (ctx.alive) preview();
        });
      }
      ctx.bus('screensavers:change', () => { buildSelect(); preview(); updateButtons(); });
      ctx.bus('store:screensaver.id', () => { if (sel && sel.value !== (hasSaver(cur()) ? cur() : 'none')) { sel.value = hasSaver(cur()) ? cur() : 'none'; preview(); updateButtons(); } });
      ctx.bus('store:screensaver.wait', () => { if (document.activeElement !== wait) wait.value = A.store.get('screensaver.wait'); });
      ctx.bus('store:screensaver.text', () => { if (hasSaver(cur())) preview(); });
      ctx.winOn('minimize', () => { if (stop) { try { stop(); } catch (e) { /* ignore */ } stop = null; } });
      ctx.winOn('restore', () => preview());
      ctx.cleanup(() => { if (stop) { try { stop(); } catch (e) { /* ignore */ } stop = null; } });
      updateButtons();
      return {
        el: h('div.pz-ss', null,
          K.head('Screen Saver', 'A screen saver is a moving picture that plays when your computer rests for a while. It is also very relaxing.'),
          h('div.pz-ss-top', null,
            h('div.pz-ss-mon', null, mon),
            h('div.pz-ss-panel', null,
              h('div.pz-field-title', null, 'Screen saver'),
              h('div.cp-row', null, selWrap, settingsBtn, previewBtn),
              h('div.cp-row.pz-ss-wait', null, h('span', null, 'Wait:'), wait, h('span', null, 'minutes'), lock),
              h('p.cp-fine', null, 'Your screen saver starts after this many minutes without moving the mouse or pressing a key. Games and videos keep it away.'))),
          h('div.cp-panel.pz-ss-power', null,
            h('div.pz-ss-power-row', null, A.img('icons/battery', { class: 'pz-ss-power-icon' }), h('div', null,
              h('div.cp-panel-title', null, 'Power management'),
              h('div.cp-muted', null, 'Save energy or keep things bright by adjusting when the display turns off and when the computer sleeps.'),
              K.link('Change power settings', () => ctx.go('cp:power'))))),
          footer),
        onShow() { preview(); },
      };
    },
  });

  // ============================================================ Sounds
  const SOUND_NAMES = {
    startup: 'Aerium Startup', logon: 'Aerium Logon', logoff: 'Aerium Logoff', shutdown: 'Aerium Shutdown', lock: 'Lock Computer',
    notify: 'Notification', ding: 'Default Beep', balloon: 'Balloon Tip', error: 'Error', critical: 'Critical Stop', exclamation: 'Exclamation',
    warning: 'Warning', question: 'Question', info: 'Information',
    open: 'Open Program', close: 'Close Program', minimize: 'Minimize', maximize: 'Maximize', snap: 'Window Snap', menu: 'Menu Command',
    click: 'Click', navigate: 'Start Navigation', select: 'Select', back: 'Back', hover: 'Hover Tick', zap: 'Zap', whooshIn: 'Whoosh In', whooshOut: 'Whoosh Out',
    message: 'New Message', signin: 'Contact Online', signout: 'Contact Offline', nudge: 'Nudge', type: 'Typing',
    recycle: 'Delete to Recycle Bin', empty: 'Empty Recycle Bin', connect: 'Device Connect', disconnect: 'Device Disconnect',
    win: 'Win', tada: 'Tada', lose: 'Game Over', pop: 'Bubble Pop', plop: 'Plop', bubble: 'Bubble', card: 'Card Flip', shuffle: 'Card Shuffle', coin: 'Coin', flag: 'Flag',
  };
  const SOUND_GROUPS = [
    ['Aerium', 'icons/aerium', ['startup', 'logon', 'logoff', 'shutdown', 'lock', 'notify', 'ding', 'balloon', 'error', 'critical', 'exclamation', 'warning', 'question', 'info']],
    ['Windows and menus', 'icons/monitor', ['open', 'close', 'minimize', 'maximize', 'snap', 'menu', 'click', 'navigate', 'select', 'back', 'hover', 'zap', 'whooshIn', 'whooshOut']],
    ['Bubble Messenger', 'icons/chat', ['message', 'signin', 'signout', 'nudge', 'type']],
    ['Files and devices', 'icons/trash', ['recycle', 'empty', 'connect', 'disconnect']],
    ['Games and bubbles', 'icons/gamepad', ['win', 'tada', 'lose', 'pop', 'plop', 'bubble', 'card', 'shuffle', 'coin', 'flag']],
  ];
  const prettify = (n) => n.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const soundName = (n) => SOUND_NAMES[n] || prettify(n);
  const playGlyph = () => s('svg', { viewBox: '0 0 10 10', width: 9, height: 9, 'aria-hidden': 'true' }, s('path', { d: 'M2.5 1.5v7l6-3.5z', fill: 'currentColor' }));

  K.page('pz:sounds', {
    title: 'Sounds', icon: 'icons/speaker', parent: 'pz:home', side: false,
    keywords: ['sound', 'sounds', 'volume', 'mute', 'audio', 'scheme', 'chime', 'beep', 'test'],
    build(ctx) {
      const footer = K.settingsFooter(ctx, { keys: ['sound.enabled', 'sound.volume'] });
      const speaker = A.img('icons/speaker', { class: 'pz-snd-speaker' });
      const volVal = h('span.pz-val');
      const enabled = A.ui.toggle({ label: 'Enable sounds', checked: A.store.get('sound.enabled'), onChange: (v) => { A.store.set('sound.enabled', v); if (v) setTimeout(() => A.sound.play('notify'), 60); } });
      const vol = A.ui.slider({ min: 0, max: 100, value: A.store.get('sound.volume'), label: 'Volume', onInput: (v) => { A.store.set('sound.volume', v); volVal.textContent = v + '%'; }, onChange: () => A.sound.play('ding') });
      vol.classList.add('pz-vol');
      const scheme = A.ui.select({ options: [['default', 'Aerium Default'], ['none', 'No Sounds']], value: A.store.get('sound.enabled') ? 'default' : 'none', label: 'Sound scheme', onChange: (v) => { A.store.set('sound.enabled', v === 'default'); if (v === 'default') setTimeout(() => A.sound.play('logon'), 60); } });
      const hint = h('div.pz-snd-hint', { hidden: true }, 'Sounds are turned off. Switch on "Enable sounds" to hear them.');
      function sync() {
        const on = !!A.store.get('sound.enabled');
        enabled.checked = on;
        scheme.value = on ? 'default' : 'none';
        const v = A.store.get('sound.volume');
        if (document.activeElement !== vol) vol.setValue(v);
        volVal.textContent = v + '%';
        list.classList.toggle('muted', !on);
        if (on) hint.hidden = true;
      }
      const list = h('div.pz-snd-list', { role: 'list', 'aria-label': 'Program events' });
      const rows = [];
      function test(name, row) {
        if (!A.store.get('sound.enabled')) {
          hint.hidden = false;
          enabled.classList.remove('pz-nudge'); void enabled.offsetWidth; enabled.classList.add('pz-nudge');
          return;
        }
        A.sound.unlock();
        A.sound.play(name, { minGap: 0 });
        row.classList.remove('playing'); void row.offsetWidth; row.classList.add('playing');
        speaker.classList.remove('pz-bump'); void speaker.offsetWidth; speaker.classList.add('pz-bump');
      }
      const known = new Set();
      const catalog = A.sound.catalog.slice();
      const groups = SOUND_GROUPS.map(([g, icon, names]) => [g, icon, names.filter((n) => catalog.includes(n))]);
      SOUND_GROUPS.forEach(([, , names]) => names.forEach((n) => known.add(n)));
      const others = catalog.filter((n) => !known.has(n));
      if (others.length) groups.push(['More sounds', 'icons/music', others]);
      groups.forEach(([g, icon, names]) => {
        if (!names.length) return;
        list.appendChild(h('div.pz-snd-group', null, A.img(icon), h('span', null, g)));
        names.forEach((n) => {
          const btn = h('button.pz-snd-test', { type: 'button', 'aria-label': 'Test ' + soundName(n), 'data-tip': 'Test' }, playGlyph(), 'Test');
          const row = h('div.pz-snd-row', { role: 'listitem', tabIndex: 0, dataset: { name: n } },
            h('span.pz-snd-icon'), h('span.pz-snd-name', null, soundName(n)), h('span.pz-snd-id', null, n),
            h('span.pz-snd-eq', { 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i')), btn);
          btn.addEventListener('click', (e) => { e.stopPropagation(); test(n, row); });
          row.addEventListener('dblclick', () => test(n, row));
          row.addEventListener('animationend', (e) => { if (e.animationName === 'pz-glowrow') row.classList.remove('playing'); });
          rows.push(row);
          list.appendChild(row);
        });
      });
      list.addEventListener('keydown', (e) => {
        const i = rows.indexOf(document.activeElement);
        if (i < 0) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = rows[clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, rows.length - 1)]; K.focus(n); K.reveal(n, list); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); test(rows[i].dataset.name, rows[i]); }
      });
      const surprise = A.ui.button('Surprise me', { size: 'sm', icon: 'icons/gift', onClick: () => {
        const row = rows[Math.floor(Math.random() * rows.length)];
        K.reveal(row, list);
        row.focus({ preventScroll: true });
        test(row.dataset.name, row);
      } });
      ['store:sound.enabled', 'store:sound.volume'].forEach((ev) => ctx.bus(ev, sync));
      sync();
      return h('div.pz-snd', null,
        K.head('Sounds', 'Aerium makes all of its sounds live, from glass bells and soft swooshes. Test any of them below.'),
        h('div.pz-snd-top', null,
          speaker,
          h('div.pz-snd-controls', null,
            h('div.cp-row', null, enabled, h('label.pz-snd-scheme', null, h('span', null, 'Sound scheme:'), scheme)),
            h('label.pz-snd-vol', null, h('span', null, 'Volume:'), vol, volVal),
            hint)),
        h('div.pz-snd-bar', null, h('span.pz-field-title', null, 'Program events (' + rows.length + ' sounds)'), h('span.cp-spacer'), surprise),
        list,
        footer);
    },
  });

  // ============================================================ Mouse Pointers
  const ARROW = 'M2 1.5 L2 22.5 L7.2 17.6 L10.9 26.2 L14.4 24.7 L10.8 16.3 L17.8 16.1 Z';
  function arrowGlyph(scheme, px) {
    const id = A.util.uid('cur');
    if (scheme === 'bubble') {
      return s('svg', { viewBox: '0 0 32 32', width: px, height: px, class: 'pz-cur-svg', 'aria-hidden': 'true' },
        s('defs', null, s('radialGradient', { id, cx: 0.4, cy: 0.35, r: 0.7 }, s('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.9 }), s('stop', { offset: 0.6, 'stop-color': '#8fd3ff', 'stop-opacity': 0.55 }), s('stop', { offset: 1, 'stop-color': '#1f8fe6', 'stop-opacity': 0.85 }))),
        s('path', { d: 'M2 2 L2 20 L7 15.5 L10.5 23 L13.5 21.6 L10 14.3 L16.5 14 Z', fill: `url(#${id})`, stroke: '#0b3d73', 'stroke-width': 1.2, 'stroke-linejoin': 'round' }),
        s('ellipse', { cx: 6, cy: 7, rx: 2, ry: 3, fill: '#fff', opacity: 0.85 }),
        s('circle', { cx: 22, cy: 24, r: 5, fill: `url(#${id})`, stroke: '#fff', 'stroke-width': 0.8 }),
        s('circle', { cx: 20.5, cy: 22.5, r: 1.4, fill: '#fff' }));
    }
    if (scheme === 'system') {
      return s('svg', { viewBox: '0 0 24 32', width: px * 0.75, height: px, class: 'pz-cur-svg', 'aria-hidden': 'true' },
        s('path', { d: ARROW, fill: '#fff', stroke: '#000', 'stroke-width': 1.3, 'stroke-linejoin': 'miter' }));
    }
    return s('svg', { viewBox: '0 0 24 32', width: px * 0.75, height: px, class: 'pz-cur-svg pz-cur-shadow', 'aria-hidden': 'true' },
      s('defs', null, s('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, s('stop', { offset: 0, 'stop-color': '#ffffff' }), s('stop', { offset: 1, 'stop-color': '#dfe9f3' }))),
      s('path', { d: ARROW, fill: `url(#${id})`, stroke: '#000', 'stroke-width': 1.1, 'stroke-linejoin': 'round' }));
  }
  function stateGlyph(kind, scheme) {
    const wrap = (...kids) => s('svg', { viewBox: '0 0 32 32', width: 32, height: 32, class: 'pz-state-svg', 'aria-hidden': 'true' }, ...kids);
    const ring = (cx, cy, r, w) => {
      const id = A.util.uid('ring');
      return s('g', { class: 'pz-busy', style: `transform-origin: ${cx}px ${cy}px` },
        s('defs', null, s('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, s('stop', { offset: 0, 'stop-color': '#bff4ff' }), s('stop', { offset: 0.5, 'stop-color': '#2cb6ea' }), s('stop', { offset: 1, 'stop-color': '#35c93a' }))),
        s('circle', { cx, cy, r, fill: 'none', stroke: 'rgba(11,42,74,.18)', 'stroke-width': w }),
        s('circle', { cx, cy, r, fill: 'none', stroke: `url(#${id})`, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-dasharray': `${(r * 4.2).toFixed(1)} ${(r * 2.1).toFixed(1)}` }));
    };
    const arrow = () => { const g = arrowGlyph(scheme, 26); g.setAttribute('x', 2); g.setAttribute('y', 2); return g; };
    const outline = { fill: '#fff', stroke: '#000', 'stroke-width': 1.1, 'stroke-linejoin': 'round' };
    switch (kind) {
      case 'normal': return wrap(arrow());
      case 'help': return wrap(arrow(), s('circle', { cx: 24, cy: 22, r: 6.5, fill: '#fff', stroke: '#0a6fd1', 'stroke-width': 1.3 }), s('text', { x: 24, y: 25.6, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#0a6fd1', 'font-family': 'Selawik, sans-serif' }, '?'));
      case 'working': return wrap(arrow(), ring(24, 23, 5, 2.6));
      case 'busy': return wrap(ring(16, 16, 9, 4));
      case 'text': return wrap(s('path', { d: 'M11 5h3.5l1.5 1.5L17.5 5H21M16 6.5v19M11 27h3.5l1.5-1.5 1.5 1.5H21', fill: 'none', stroke: '#fff', 'stroke-width': 3.4, 'stroke-linecap': 'round' }), s('path', { d: 'M11 5h3.5l1.5 1.5L17.5 5H21M16 6.5v19M11 27h3.5l1.5-1.5 1.5 1.5H21', fill: 'none', stroke: '#000', 'stroke-width': 1.3, 'stroke-linecap': 'round' }));
      case 'link': return wrap(s('path', Object.assign({ d: 'M11 4.5a1.8 1.8 0 0 1 3.6 0V12l1.2-.2a1.6 1.6 0 0 1 1.9 1.2l.1.5 1-.1a1.5 1.5 0 0 1 1.6 1.2l.1.6.8-.1a1.4 1.4 0 0 1 1.6 1.3v3.6c0 3.5-2.4 6.2-5.8 6.2h-1.5c-2.1 0-3.6-.9-4.9-2.6L7.2 18c-.8-1-.5-2.3.5-2.8.8-.4 1.8-.2 2.4.5L11 17z' }, outline)));
      case 'move': return wrap(s('path', Object.assign({ d: 'M16 2l4 4h-2.6v6.6H24V10l4 4-4 4v-2.6h-6.6V22H20l-4 4-4-4h2.6v-6.6H8V18l-4-4 4-4v2.6h6.6V6H12z', transform: 'translate(0 2)' }, outline)));
      default: return wrap(arrow());
    }
  }
  const STATES = [['normal', 'Normal Select'], ['help', 'Help Select'], ['working', 'Working in Background'], ['busy', 'Busy'], ['text', 'Text Select'], ['link', 'Link Select'], ['move', 'Move']];
  const dblMs = (v) => Math.round(900 - clamp(Number(v), 0, 10) * 60);

  function dblToy(ctx) {
    const area = h('div.pz-dbl', { 'aria-label': 'Double-click test area' });
    const msg = h('div.pz-dbl-msg', { role: 'status' }, 'Double-click the bubble to pop it.');
    const score = h('b', null, '0');
    const bubble = h('button.pz-dbl-bubble', { type: 'button', 'aria-label': 'Bubble. Double-click to pop it', 'data-tip': 'Double-click me' }, h('i'));
    area.append(bubble, h('div.pz-dbl-hud', null, 'Popped: ', score));
    let last = 0, slowT = null, busy = false, popped = 0;
    const place = () => {
      const W = area.clientWidth || 300, H = area.clientHeight || 140;
      bubble.style.left = Math.round(16 + Math.random() * Math.max(10, W - 96)) + 'px';
      bubble.style.top = Math.round(10 + Math.random() * Math.max(10, H - 86)) + 'px';
    };
    function pop() {
      busy = true;
      popped++;
      score.textContent = popped;
      bubble.classList.add('popped');
      A.sound.play('pop', { minGap: 0 });
      const cx = bubble.offsetLeft + bubble.offsetWidth / 2, cy = bubble.offsetTop + bubble.offsetHeight / 2;
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
        const d = 34 + Math.random() * 26;
        const drop = h('span.pz-drop', { style: { left: cx + 'px', top: cy + 'px', '--dx': (Math.cos(a) * d).toFixed(0) + 'px', '--dy': (Math.sin(a) * d).toFixed(0) + 'px' } });
        area.appendChild(drop);
        ctx.timeout(() => drop.remove(), 700);
      }
      msg.textContent = A.util.pick(['Pop! Nice and quick.', 'Pop! Your double-click is in great shape.', 'Pop! The fish are impressed.', 'Pop! That was a speedy one.', 'Pop! Bubble champion.']);
      ctx.timeout(() => { bubble.classList.remove('popped', 'wobble'); place(); busy = false; }, 850);
    }
    bubble.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (busy) return;
      const t = performance.now();
      const ms = dblMs(A.store.get('mouse.dblclick', 5));
      clearTimeout(slowT);
      if (t - last <= ms) { last = 0; pop(); return; }
      last = t;
      bubble.classList.remove('wobble'); void bubble.offsetWidth; bubble.classList.add('wobble');
      A.sound.play('bubble');
      slowT = ctx.timeout(() => { if (!busy) msg.textContent = 'Almost! Click twice a little faster, or slide the speed toward Slow.'; }, ms + 60);
    });
    bubble.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); pop(); } });
    ctx.timeout(place, 30);
    return h('div.pz-dbl-wrap', null, area, msg);
  }

  K.page('pz:mouse', {
    title: 'Mouse Pointers', icon: 'mouse', parent: 'pz:home', side: false,
    keywords: ['mouse', 'pointer', 'cursor', 'trails', 'double-click', 'double click', 'speed', 'bubble'],
    build(ctx) {
      const footer = K.settingsFooter(ctx, { keys: ['cursor.scheme', 'cursor.trails', 'mouse.dblclick'], restore: () => T.applyCursor() });
      const cards = h('div.pz-curs', { role: 'radiogroup', 'aria-label': 'Pointer schemes' });
      Object.entries(T.CURSORS).forEach(([id, def]) => {
        const size = def.size ? Math.round(30 * def.size) : 30;
        const card = h('button.pz-cur', { type: 'button', role: 'radio', dataset: { id }, 'aria-label': def.name },
          h('span.pz-cur-prev', null, arrowGlyph(id, size)), h('span.pz-cur-name', null, def.name));
        card.addEventListener('click', () => { A.store.set('cursor.scheme', id); T.applyCursor(); A.sound.play('click'); });
        cards.appendChild(card);
      });
      const states = h('div.pz-states');
      const renderStates = () => {
        states.innerHTML = '';
        const scheme = A.store.get('cursor.scheme');
        STATES.forEach(([k, label]) => states.appendChild(h('div.pz-state', null, stateGlyph(k, scheme), h('span', null, label))));
      };
      const trails = A.ui.checkbox({ label: 'Display pointer trails', checked: !!A.store.get('cursor.trails'), onChange: (v) => { A.store.set('cursor.trails', v); A.sound.play('click'); } });
      const speed = A.ui.slider({ min: 0, max: 10, value: A.store.get('mouse.dblclick', 5), label: 'Double-click speed', onInput: (v) => { A.store.set('mouse.dblclick', v); speedVal.textContent = dblMs(v) + ' ms'; } });
      const speedVal = h('span.pz-val', null, dblMs(A.store.get('mouse.dblclick', 5)) + ' ms');
      function sync() {
        const scheme = A.store.get('cursor.scheme');
        cards.querySelectorAll('.pz-cur').forEach((c) => { const on = c.dataset.id === scheme; c.classList.toggle('selected', on); c.setAttribute('aria-checked', String(on)); });
        trails.checked = !!A.store.get('cursor.trails');
        const v = A.store.get('mouse.dblclick', 5);
        if (document.activeElement !== speed) speed.setValue(v);
        speedVal.textContent = dblMs(v) + ' ms';
        renderStates();
      }
      ['store:cursor.scheme', 'store:cursor.trails', 'store:mouse.dblclick'].forEach((ev) => ctx.bus(ev, sync));
      sync();
      return h('div.pz-mouse', null,
        K.head('Mouse Pointers', 'Choose the pointer you like, give it a sparkly trail, and see how quick your double-click is.'),
        K.section('Pointer scheme', cards, h('div.pz-states-box', null, h('div.pz-field-title', null, 'Preview'), states)),
        K.section('Pointer options', h('div.pz-trails', null, trails, h('span.cp-fine', null, 'A little trail of pointers follows your mouse wherever it goes. Very 2007.'))),
        K.section('Double-click speed',
          h('div.pz-dbl-row', null,
            h('div.pz-dbl-controls', null,
              h('div.pz-speed', null, h('span.cp-muted', null, 'Slow'), speed, h('span.cp-muted', null, 'Fast')),
              speedVal,
              h('p.cp-fine', null, 'This sets how quickly you need to click twice to pop the bubble. Your real mouse keeps its own setting.')),
            dblToy(ctx))),
        footer);
    },
  });

  // ============================================================ Theme
  const THEME_FALLBACK_WALL = { light: 'clear-sky', dark: 'aurora', technozen: 'technozen' };
  function themeWall(th) {
    const id = T.wallpapers.get(th.wallpaper) ? th.wallpaper : THEME_FALLBACK_WALL[th.id] || 'clear-sky';
    const el = T.thumb(id);
    if (!el.style.backgroundImage) return T.thumb(THEME_FALLBACK_WALL[th.id] || 'clear-sky');
    return el;
  }
  K.page('pz:theme', {
    title: 'Theme Settings', icon: 'icons/rainbow', parent: 'pz:home', side: false,
    keywords: ['theme', 'dark', 'night', 'light', 'technozen', 'scheme', 'look', 'mode'],
    build(ctx) {
      const footer = K.settingsFooter(ctx, {
        keys: ['theme', 'glass.color', 'glass.custom', 'glass.intensity', 'glass.transparency', 'wallpaper', 'wallpaper.fit'],
        restore: (snap) => {
          document.documentElement.dataset.theme = T.THEMES[snap.theme] ? snap.theme : 'light';
          T.apply();
          T.setWallpaper(snap.wallpaper, snap['wallpaper.fit']);
          A.bus.emit('theme:change', snap.theme);
        },
      });
      const cards = h('div.pz-themes', { role: 'radiogroup', 'aria-label': 'Themes' });
      Object.values(T.THEMES).forEach((th) => {
        const g = T.GLASS.find((x) => x.id === th.glass) || T.GLASS[0];
        const prev = h('div.pz-theme-prev', { dataset: { theme: th.id }, style: { '--g': g.hex } },
          h('div.pz-theme-wall', null, themeWall(th)),
          h('div.pz-theme-win', null, h('div.pz-theme-wtitle', null, h('i'), h('i'), h('i')), h('div.pz-theme-wbody', null, h('b'), h('em'), h('em'), h('em'), h('span.pz-theme-btn'))),
          h('div.pz-theme-bar', null, h('span.pz-mini-orb'), h('span.pz-theme-app'), h('span.pz-theme-app')));
        const card = h('button.pz-theme', { type: 'button', role: 'radio', dataset: { id: th.id }, 'aria-label': th.name },
          prev,
          h('div.pz-theme-text', null, h('div.pz-theme-name', null, th.name, h('span.pz-theme-cur', null, 'Current')), h('div.pz-theme-desc', null, th.desc)));
        card.addEventListener('click', () => { if (T.current !== th.id) { T.set(th.id); A.sound.play('select'); } });
        cards.appendChild(card);
      });
      const sync = () => cards.querySelectorAll('.pz-theme').forEach((c) => { const on = c.dataset.id === T.current; c.classList.toggle('selected', on); c.setAttribute('aria-checked', String(on)); });
      ctx.bus('theme:change', sync);
      sync();
      return h('div.pz-theme-page', null,
        K.head('Choose a theme', 'A theme changes the whole look at once: the glass, the sky behind it and the colors of every window.'),
        cards,
        h('p.cp-fine', null, 'Switching themes also picks a matching glass color and background. You can change either one afterward.'),
        h('div.cp-link-list', null,
          K.link('Change the glass color', () => ctx.go('pz:color'), { icon: 'palette' }),
          K.link('Get more themes online', () => K.joke(ctx.win, { title: 'Themes', icon: 'icons/rainbow', instruction: 'More themes are on their way', message: 'Aerium is saving up for Aerium Ultimate Extras. Any day now.' }), { icon: 'icons/globe' })),
        footer);
    },
  });

  // ============================================================ Display Settings
  const RES = [[800, 600], [1024, 768], [1152, 864], [1280, 800], [1280, 1024], [1440, 900], [1680, 1050], [1920, 1200]];
  function identify() {
    const el = h('div.pz-identify', { 'aria-hidden': 'true' }, h('span.pz-identify-num', null, '1'), h('span.pz-identify-sub', null, 'Generic Glossy Monitor'));
    document.getElementById('ae-overlays').appendChild(el);
    A.sound.play('ding');
    setTimeout(() => el.classList.add('out'), 2300);
    setTimeout(() => el.remove(), 2900);
  }
  K.identify = identify;
  K.page('pz:display', {
    title: 'Display Settings', icon: 'icons/laptop', parent: 'pz:home', side: false,
    keywords: ['display', 'resolution', 'screen', 'monitor', 'text size', 'font size', 'dpi', 'large text', 'identify', 'colors', 'refresh rate'],
    build(ctx) {
      const footer = K.settingsFooter(ctx, { keys: ['display.res', 'display.colors', 'a11y.largeText'] });
      const fid = A.util.uid('pzpost');
      const filters = s('svg', { width: 0, height: 0, class: 'pz-svgdefs', 'aria-hidden': 'true' },
        s('filter', { id: fid + '8' }, s('feComponentTransfer', null, ...['R', 'G', 'B'].map((c) => s('feFunc' + c, { type: 'discrete', tableValues: '0 .2 .4 .6 .8 1' })))),
        s('filter', { id: fid + '16' }, s('feComponentTransfer', null, ...['R', 'G', 'B'].map((c) => s('feFunc' + c, { type: 'discrete', tableValues: '0 .07 .14 .21 .29 .36 .43 .5 .57 .64 .71 .79 .86 .93 1' })))));
      const mon = K.monitor({ width: 330, className: 'pz-disp-monitor' });
      const desk = h('div.pz-disp-desk', null,
        h('div.pz-disp-wall', null, wallThumb(A.store.get('wallpaper'))),
        h('div.pz-disp-icons', null, ['icons/computer', 'icons/folder-user', 'icons/trash', 'icons/globe'].map((k) => A.img(k))),
        h('div.pz-disp-win', null, h('div.pz-disp-wtitle'), h('div.pz-disp-wbody', null, h('i'), h('i'), h('i'))),
        h('div.pz-disp-bar', null, h('span.pz-mini-orb')));
      mon.host.appendChild(desk);
      const resIdx = () => clamp(Number(A.store.get('display.res', 1)), 0, RES.length - 1);
      const resLabel = h('div.pz-res-label');
      const slider = A.ui.slider({ min: 0, max: RES.length - 1, value: resIdx(), label: 'Resolution', onInput: (v) => { A.store.set('display.res', v); render(); }, onChange: () => A.sound.play('click') });
      slider.classList.add('pz-res-slider');
      const colors = A.ui.select({ options: [['32', 'Highest (32 bit)'], ['16', 'Medium (16 bit)'], ['8', '256 Colors (retro)']], value: String(A.store.get('display.colors', '32')), label: 'Colors', onChange: (v) => { A.store.set('display.colors', v); render(); A.sound.play('click'); } });
      const size = A.ui.radioGroup({ value: A.store.get('a11y.largeText', false) ? 'large' : 'normal', options: [['normal', 'Default scale (96 DPI): fits more on the screen'], ['large', 'Larger scale (120 DPI): makes text easier to read']], onChange: (v) => { A.store.set('a11y.largeText', v === 'large'); A.sound.play('click'); } });
      const real = h('span');
      function render() {
        const [w, hh] = RES[resIdx()];
        resLabel.textContent = w + ' by ' + hh + ' pixels';
        const aspect = w / hh;
        desk.style.width = aspect < 1.599 ? ((aspect / 1.6) * 100).toFixed(1) + '%' : '100%';
        desk.style.setProperty('--ui', (1024 / w).toFixed(3));
        const c = String(A.store.get('display.colors', '32'));
        desk.style.filter = c === '8' ? `url(#${fid}8) saturate(1.3)` : c === '16' ? `url(#${fid}16)` : '';
        real.textContent = window.innerWidth + ' by ' + window.innerHeight;
        if (document.activeElement !== slider) slider.setValue(resIdx());
        colors.value = c;
      }
      ctx.bus('store:display.res', render);
      ctx.bus('store:display.colors', render);
      ctx.bus('store:wallpaper', () => { const wall = desk.querySelector('.pz-disp-wall'); wall.innerHTML = ''; wall.appendChild(wallThumb(A.store.get('wallpaper'))); });
      ctx.bus('store:a11y.largeText', () => { const v = A.store.get('a11y.largeText', false) ? 'large' : 'normal'; size.querySelectorAll('input').forEach((i) => { i.checked = i.value === v; }); });
      ctx.listen(window, 'resize', render);
      render();
      return h('div.pz-display', null,
        filters,
        K.head('Display Settings', 'Drag the slider to change the resolution, identify your monitor, or make text easier to read.'),
        h('div.pz-disp-top', null,
          h('div.pz-disp-mon', null, mon, A.ui.button('Identify Monitors', { size: 'sm', icon: 'icons/monitor', onClick: identify })),
          h('div.pz-disp-panel', null,
            h('div.pz-field-title', null, '1. Generic Glossy Monitor on AquaGlass 256 MB'),
            h('div.pz-res', null, h('span.cp-muted', null, 'Low'), slider, h('span.cp-muted', null, 'High')),
            resLabel,
            h('label.pz-colors', null, h('span', null, 'Colors:'), colors),
            K.note(h('span', null, 'Aerium always fits your browser window, which is ', real, ' right now, so this slider is just for fun. The little screen shows how things would have looked.'), 'info', 'icons/info'),
            A.ui.button('Advanced Settings...', { size: 'sm', onClick: () => K.joke(ctx.win, { title: 'Advanced Settings', icon: 'icons/monitor', instruction: 'Generic Glossy Monitor', message: 'Adapter: AquaGlass 256 MB\nRefresh rate: 60 Hertz\nColor profile: Extra Shiny\n\nThe fish prefer it this way.' }) }))),
        K.section('Text size', size, h('p.cp-fine', null, 'Larger text is also available in the Ease of Access Center.')),
        footer);
    },
  });

  // ============================================================ Taskbar and Start Menu
  function tbPreview() {
    const p = tbPrefs();
    const now = new Date();
    const tray = h('span.pz-tbprev-tray', null,
      p.action ? h('i.pz-tbprev-dot.flag') : null, p.power ? h('i.pz-tbprev-dot.power') : null,
      p.network ? h('i.pz-tbprev-dot.net') : null, p.volume ? h('i.pz-tbprev-dot.vol') : null);
    return h('div.pz-tbprev-wrap', null,
      h('div.pz-tbprev-wall', null, wallThumb(A.store.get('wallpaper'))),
      h('div.pz-tbprev', { class: [p.small && 'small', p.autohide && 'autohide'] },
        h('span.pz-tbprev-orb'),
        p.quick ? h('span.pz-tbprev-quick') : null,
        ['icons/personalize', 'icons/globe', 'icons/folder'].map((k, i) => h('span.pz-tbprev-app', { class: i === 0 && 'running' }, A.img(k))),
        h('span.cp-spacer'),
        tray,
        p.clock ? h('span.pz-tbprev-clock', null, A.util.fmtTime(now)) : null,
        p.showdesk ? h('span.pz-tbprev-desk') : null),
      p.autohide ? h('span.pz-tbprev-hint', null, 'Hidden until you point at the bottom of the screen') : null);
  }
  K.page('pz:taskbar', {
    title: 'Taskbar and Start Menu Properties', icon: 'taskbar', parent: 'cat:appearance', side: false,
    keywords: ['taskbar', 'start menu', 'clock', 'auto-hide', 'autohide', 'hide', 'tray', 'notification area', 'quick launch', 'icons', 'thumbnails', 'show desktop'],
    build(ctx) {
      const footer = K.settingsFooter(ctx, {
        keys: ['pz.taskbar', 'desktop.showIcons', 'desktop.iconSize'],
        restore: () => { applyTaskbarPrefs(); if (A.desktop && A.desktop.render) A.desktop.render(); },
      });
      const set = (k, v) => { const p = tbPrefs(); p[k] = v; A.store.set('pz.taskbar', p); A.sound.play('click'); };
      const opts = [];
      const opt = (k, label, note) => {
        const c = A.ui.checkbox({ label, checked: !!tbPrefs()[k], onChange: (v) => set(k, v) });
        opts.push([k, c]);
        return h('div.pz-tb-opt', null, c, note ? h('div.cp-fine', null, note) : null);
      };
      const prevBox = h('div.pz-tbprev-box');
      const renderPrev = () => { prevBox.innerHTML = ''; prevBox.appendChild(tbPreview()); };
      const showIcons = A.ui.checkbox({ label: 'Show desktop icons', checked: A.store.get('desktop.showIcons'), onChange: (v) => { A.store.set('desktop.showIcons', v); if (A.desktop && A.desktop.render) A.desktop.render(); A.sound.play('click'); } });
      const iconSize = A.ui.radioGroup({ value: A.store.get('desktop.iconSize'), options: [['large', 'Large icons'], ['medium', 'Medium icons'], ['small', 'Classic icons']], onChange: (v) => { A.store.set('desktop.iconSize', v); if (A.desktop && A.desktop.render) A.desktop.render(); A.sound.play('click'); } });
      const clearBtn = A.ui.button('Clear list', { size: 'sm', onClick: () => { A.store.set('recent.apps', []); A.store.set('recent.files', []); clearBtn.disabled = true; A.sound.play('recycle'); clearNote.textContent = 'Cleared. Your Start menu will show the usual favorites again.'; } });
      const clearNote = h('div.cp-fine', null, 'The Start menu remembers the programs and files you opened recently.');
      const tabs = A.ui.tabs({ className: 'cp-tabs pz-tb-tabs', value: ctx.params.tab || 'taskbar', tabs: [
        { id: 'taskbar', label: 'Taskbar', content: () => h('div', null,
          prevBox,
          h('div.pz-tb-group', null, h('div.pz-field-title', null, 'Taskbar appearance'),
            h('div.pz-tb-opt', null, A.ui.checkbox({ label: 'Lock the taskbar', checked: true, disabled: true }), h('div.cp-fine', null, 'Always locked, so it never wanders off to the side of the screen.')),
            opt('autohide', 'Auto-hide the taskbar', 'Tucks the taskbar away until you point at the bottom of the screen.'),
            opt('small', 'Use small icons'),
            opt('quick', 'Show Quick Launch', 'The little Flip 3D button next to the Start orb.'),
            opt('thumbs', 'Show window previews (thumbnails)', 'Point at a taskbar button to see a live picture of its window.'),
            opt('showdesk', 'Show the Show desktop button', 'The glass strip at the far right. Point at it to peek at the desktop.'))) },
        { id: 'start', label: 'Start Menu', content: () => h('div', null,
          h('div.pz-tb-group', null, h('div.pz-field-title', null, 'Start menu'),
            opt('userpic', 'Show my picture on the Start menu', 'Your framed user picture sits at the top of the Start menu.'),
            h('div.cp-link-list', null, K.link('Change your picture', () => ctx.go('cp:users-picture'), { icon: 'icons/photo' }))),
          h('div.pz-tb-group', null, h('div.pz-field-title', null, 'Privacy'), clearNote, clearBtn)) },
        { id: 'tray', label: 'Notification Area', content: () => h('div', null,
          h('div.pz-tb-group', null, h('div.pz-field-title', null, 'System icons'),
            h('div.cp-fine', null, 'Choose which system icons appear next to the clock.'),
            opt('clock', 'Clock'), opt('volume', 'Volume'), opt('network', 'Network'), opt('power', 'Power'), opt('action', 'Security flag'))) },
        { id: 'desktop', label: 'Desktop', content: () => h('div', null,
          h('div.pz-tb-group', null, h('div.pz-field-title', null, 'Desktop icons'), showIcons, h('div.pz-tb-sizes', null, iconSize))) },
      ] });
      function sync() {
        const p = tbPrefs();
        opts.forEach(([k, c]) => { c.checked = !!p[k]; });
        showIcons.checked = !!A.store.get('desktop.showIcons');
        iconSize.querySelectorAll('input').forEach((i) => { i.checked = i.value === A.store.get('desktop.iconSize'); });
        renderPrev();
      }
      ['store:pz.taskbar', 'store:desktop.showIcons', 'store:desktop.iconSize', 'store:wallpaper'].forEach((ev) => ctx.bus(ev, sync));
      ctx.interval(renderPrev, 30000);
      renderPrev();
      return h('div.pz-taskbar', null,
        K.head('Taskbar and Start Menu', 'Every option here really changes your taskbar and Start menu, right away.'),
        tabs,
        footer);
    },
  });

  // ==== more pages are added here ====

  // ============================================================ always-on behaviors
  // Taskbar and Start menu preferences, applied as classes on the document.
  const TB_DEFAULTS = { autohide: false, small: false, quick: true, thumbs: true, showdesk: true, clock: true, volume: true, network: true, power: true, action: true, userpic: true };
  const tbPrefs = () => K.obj('pz.taskbar', TB_DEFAULTS);
  function applyTaskbarPrefs() {
    const p = tbPrefs();
    const root = document.documentElement.classList;
    const had = root.contains('pz-tb-autohide');
    root.toggle('pz-tb-autohide', !!p.autohide);
    root.toggle('pz-tb-small', !!p.small);
    root.toggle('pz-tb-noquick', !p.quick);
    root.toggle('pz-tb-nothumbs', !p.thumbs);
    root.toggle('pz-tb-noshowdesk', !p.showdesk);
    root.toggle('pz-tb-noclock', !p.clock);
    root.toggle('pz-sm-nopic', !p.userpic);
    const tray = A.taskbar && A.taskbar.tray;
    if (tray) [['volume', 'volume'], ['network', 'network'], ['battery', 'power'], ['action', 'action']].forEach(([id, key]) => { const t = tray.get(id); if (t && t.el) t.el.hidden = !p[key]; });
    if (had !== !!p.autohide && A.desktop && A.desktop.render && A.shellReady) setTimeout(() => A.desktop.render(), 320);
  }
  applyTaskbarPrefs();
  A.store.on('pz.taskbar', applyTaskbarPrefs);
  A.bus.on('shell:start', applyTaskbarPrefs);

  // "On resume, display logon screen" for the screensaver.
  let previewing = false;
  A.bus.on('screensaver:stop', () => {
    if (previewing) { previewing = false; return; }
    if (A.store.get('screensaver.lock', false) && A.shellReady) setTimeout(() => { if (A.shellReady) A.boot.lock(); }, 380);
  });
  K.previewSaver = (id) => { previewing = true; A.screensaver.start(id); if (!A.screensaver.active) previewing = false; };

  // ============================================================ app
  const PAGE_MAP = {
    theme: 'pz:theme', themes: 'pz:theme', background: 'pz:background', wallpaper: 'pz:background', desktop: 'pz:background',
    color: 'pz:color', colors: 'pz:color', glass: 'pz:color', sounds: 'pz:sounds', sound: 'pz:sounds', screensaver: 'pz:screensaver',
    mouse: 'pz:mouse', pointers: 'pz:mouse', display: 'pz:display', resolution: 'pz:display', taskbar: 'pz:taskbar', startmenu: 'pz:taskbar',
  };
  const mapPage = (p) => (!p ? 'pz:home' : PAGE_MAP[p] || (K.pages.has(p) ? p : 'pz:home'));

  A.apps.register({
    id: 'personalize',
    name: 'Personalization',
    icon: 'icons/personalize',
    color: '#46b3e6',
    category: 'settings',
    description: 'Change the glass color, desktop background, screen saver, sounds and mouse pointers.',
    keywords: ['personalize', 'personalization', 'wallpaper', 'background', 'color', 'glass', 'theme', 'screensaver', 'screen saver', 'sounds', 'mouse', 'pointer', 'display', 'resolution', 'taskbar'],
    single: true,
    window: { width: 880, height: 620, minWidth: 580, minHeight: 400, glassBody: true },
    launch(win, args) {
      const frame = K.frame(win, { start: mapPage(args && args.page) });
      return {
        onArgs(a) { frame.go(mapPage(a && a.page)); },
        onClose() { frame.destroy(); },
      };
    },
  });
})();
