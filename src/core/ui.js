/* Aerium UI kit: gel controls from the Frutiger Aero design system, menus,
   tooltips, flyouts and Vista-style task dialogs. All return DOM elements. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;

  const ui = {};

  // ------------------------------------------------------------ controls
  ui.button = function (label, o = {}) {
    const b = h('button.fa-btn.fa-focus', {
      type: o.type || 'button',
      class: ['fa-tone-' + (o.tone || 'pearl'), o.size === 'lg' && 'fa-btn-lg', o.size === 'sm' && 'ae-btn-sm', o.className],
      disabled: o.disabled,
      title: o.title,
      onclick: o.onClick,
      dataset: o.dataset,
    }, h('span', null, o.icon ? A.img(o.icon, { class: 'ae-btn-icon' }) : null, label));
    if (o.default) b.classList.add('ae-default');
    return b;
  };

  ui.orb = function (o = {}) {
    const b = h('button.fa-orb.fa-focus', {
      type: 'button',
      class: ['fa-tone-' + (o.tone || 'aqua'), o.size && o.size !== 'md' && 'fa-orb-' + o.size, o.className],
      'aria-label': o.label,
      'data-tip': o.label,
      onclick: o.onClick,
      disabled: o.disabled,
    });
    if (o.icon) b.appendChild(A.img(o.icon));
    else if (o.glyph) b.appendChild(o.glyph);
    return b;
  };

  ui.toggle = function (o = {}) {
    let on = !!o.checked;
    const el = h('button.fa-toggle.fa-focus', { type: 'button', role: 'switch', 'aria-checked': String(on), disabled: o.disabled, class: o.className },
      h('span.fa-toggle-track', null, h('span.fa-toggle-knob')), o.label || null);
    el.addEventListener('click', () => {
      on = !on;
      el.setAttribute('aria-checked', String(on));
      A.sound.play('click');
      o.onChange && o.onChange(on);
    });
    Object.defineProperty(el, 'checked', { get: () => on, set: (v) => { on = !!v; el.setAttribute('aria-checked', String(on)); } });
    return el;
  };

  ui.checkbox = function (o = {}) {
    const input = h('input.ae-check-input', { type: 'checkbox', checked: !!o.checked, disabled: o.disabled });
    input.addEventListener('change', () => o.onChange && o.onChange(input.checked));
    const el = h('label.ae-check', { class: o.className }, input, h('span.ae-check-box'), o.label != null ? h('span.ae-check-label', null, o.label) : null);
    Object.defineProperty(el, 'checked', { get: () => input.checked, set: (v) => (input.checked = !!v) });
    el.input = input;
    return el;
  };

  ui.radio = function (o = {}) {
    const input = h('input.ae-radio-input', { type: 'radio', name: o.name, value: o.value, checked: !!o.checked, disabled: o.disabled });
    input.addEventListener('change', () => input.checked && o.onChange && o.onChange(o.value));
    const el = h('label.ae-radio', { class: o.className }, input, h('span.ae-radio-dot'), o.label != null ? h('span.ae-check-label', null, o.label) : null);
    el.input = input;
    return el;
  };

  ui.radioGroup = function (o = {}) {
    const name = A.util.uid('rg');
    const el = h('div.ae-radio-group', { class: o.className, role: 'radiogroup' });
    let value = o.value;
    o.options.forEach((opt) => {
      const [v, label] = Array.isArray(opt) ? opt : [opt.value, opt.label];
      el.appendChild(ui.radio({ name, value: v, label, checked: v === value, onChange: (nv) => { value = nv; o.onChange && o.onChange(nv); } }));
    });
    Object.defineProperty(el, 'value', { get: () => value });
    return el;
  };

  ui.slider = function (o = {}) {
    const min = o.min == null ? 0 : o.min, max = o.max == null ? 100 : o.max;
    const input = h('input.ae-slider', { type: 'range', min, max, step: o.step || 1, value: o.value == null ? min : o.value, disabled: o.disabled, 'aria-label': o.label || '' });
    const paint = () => input.style.setProperty('--pct', ((input.value - min) / (max - min || 1)) * 100 + '%');
    paint();
    input.addEventListener('input', () => { paint(); o.onInput && o.onInput(Number(input.value)); });
    input.addEventListener('change', () => o.onChange && o.onChange(Number(input.value)));
    if (o.vertical) input.classList.add('ae-slider-vertical');
    if (o.className) input.classList.add(o.className);
    input.setValue = (v) => { input.value = v; paint(); };
    return input;
  };

  ui.select = function (o = {}) {
    const sel = h('select.ae-select.fa-focus', { disabled: o.disabled, class: o.className, 'aria-label': o.label || '' });
    (o.options || []).forEach((opt) => {
      const [v, label] = Array.isArray(opt) ? opt : typeof opt === 'object' ? [opt.value, opt.label] : [opt, opt];
      sel.appendChild(h('option', { value: v, selected: String(v) === String(o.value) }, label));
    });
    sel.addEventListener('change', () => o.onChange && o.onChange(sel.value));
    return sel;
  };

  ui.textField = function (o = {}) {
    const input = h('input', { type: o.type || 'text', value: o.value || '', placeholder: o.placeholder || '', maxLength: o.maxLength, spellcheck: false });
    if (o.onInput) input.addEventListener('input', () => o.onInput(input.value));
    if (o.onEnter) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') o.onEnter(input.value); });
    const el = h('label.fa-field', { class: o.className }, o.label || null, input, o.help ? h('span.fa-field-help', null, o.help) : null);
    el.input = input;
    return el;
  };

  ui.searchField = function (o = {}) {
    const input = h('input', { type: 'search', name: 'q', placeholder: o.placeholder || 'Search', 'aria-label': o.label || 'Search', spellcheck: false, autocomplete: 'off' });
    const glyph = A.util.s('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' },
      A.util.s('circle', { cx: 6.5, cy: 6.5, r: 4.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }),
      A.util.s('path', { d: 'M10 10l4 4', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
    const orb = h('button.fa-orb.fa-tone-aqua.fa-focus', { type: 'submit', 'aria-label': 'Search' }, glyph);
    const form = h('form.fa-search', { role: 'search', class: o.className }, input, orb);
    form.addEventListener('submit', (e) => { e.preventDefault(); o.onSearch && o.onSearch(input.value); });
    if (o.onInput) input.addEventListener('input', () => o.onInput(input.value));
    form.input = input;
    return form;
  };

  ui.progress = function (o = {}) {
    const fill = h('div.fa-progress-fill', { style: { width: (o.value || 0) + '%' } });
    const el = h('div.fa-progress', { class: ['fa-tone-' + (o.tone || 'grass'), o.className], role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': o.label || 'Progress' }, fill);
    el.set = (v) => { v = clamp(v, 0, 100); fill.style.width = v + '%'; el.setAttribute('aria-valuenow', Math.round(v)); };
    if (o.marquee) el.classList.add('ae-progress-marquee');
    el.set(o.value || 0);
    return el;
  };

  ui.spinner = function (o = {}) {
    const el = h('span.fa-spinner', { role: 'status', 'aria-label': o.label || 'Loading', style: o.size ? { '--size': o.size + 'px' } : null });
    for (let i = 0; i < 8; i++) el.appendChild(h('i', { style: { transform: 'rotate(' + i * 45 + 'deg)', animationDelay: (i * 0.15 - 1.2) + 's' } }));
    el.appendChild(h('b'));
    return el;
  };

  ui.badge = function (text, tone = 'aqua', shape) {
    if (shape === 'burst') {
      const el = h('span.fa-burst', { class: 'fa-tone-' + (tone || 'sun') });
      el.innerHTML = burstSVG();
      el.appendChild(h('span', null, text));
      return el;
    }
    return h('span.fa-badge', { class: 'fa-tone-' + tone }, text);
  };
  function burstSVG() {
    const id = A.util.uid('burst');
    let pts = [];
    for (let i = 0; i < 32; i++) { const a = (Math.PI * 2 * i) / 32, r = i % 2 ? 42 : 50; pts.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (50 + r * Math.sin(a)).toFixed(1)); }
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx=".4" cy=".3" r=".8"><stop offset="0" class="fa-burst-a"/><stop offset=".7" class="fa-burst-b"/></radialGradient></defs><polygon points="${pts.join(' ')}" fill="url(#${id})" class="fa-burst-rim" stroke-width="1.5"/><ellipse cx="44" cy="32" rx="26" ry="13" fill="#fff" opacity=".55"/></svg>`;
  }

  ui.tabs = function (o = {}) {
    const bar = h('div.ae-tabs-bar', { role: 'tablist' });
    const body = h('div.ae-tabs-body');
    const el = h('div.ae-tabs', { class: o.className }, bar, body);
    const pages = {};
    let active = null;
    o.tabs.forEach((t) => {
      const btn = h('button.ae-tab', { type: 'button', role: 'tab', onclick: () => select(t.id) }, t.icon ? A.img(t.icon) : null, t.label);
      bar.appendChild(btn);
      pages[t.id] = { btn, t, page: null };
    });
    function select(id) {
      if (!pages[id]) return;
      if (active) { pages[active].btn.classList.remove('active'); pages[active].btn.setAttribute('aria-selected', 'false'); if (pages[active].page) pages[active].page.hidden = true; }
      active = id;
      const p = pages[id];
      p.btn.classList.add('active');
      p.btn.setAttribute('aria-selected', 'true');
      if (!p.page) { p.page = h('div.ae-tab-page', { role: 'tabpanel' }); p.page.append(typeof p.t.content === 'function' ? p.t.content() : p.t.content); body.appendChild(p.page); }
      p.page.hidden = false;
      o.onChange && o.onChange(id);
    }
    select(o.value || o.tabs[0].id);
    el.select = select;
    Object.defineProperty(el, 'value', { get: () => active });
    return el;
  };

  // ------------------------------------------------------------ menus
  let openMenus = [];
  function closeAllMenus() {
    openMenus.slice().forEach((m) => m.close(true));
    openMenus = [];
  }
  ui.closeMenus = closeAllMenus;

  function buildMenu(items, depth, onPick) {
    const el = h('div.ae-menu', { role: 'menu', tabIndex: -1 });
    const rows = [];
    let sub = null;
    items.filter(Boolean).forEach((it) => {
      if (it.separator || it === '-') { el.appendChild(h('div.ae-menu-sep', { role: 'separator' })); return; }
      if (it.header) { el.appendChild(h('div.ae-menu-header', null, it.header)); return; }
      const row = h('div.ae-menu-item', {
        role: 'menuitem',
        class: [it.disabled && 'disabled', it.bold && 'bold', it.submenu && 'has-sub'],
        'aria-disabled': it.disabled ? 'true' : null,
      },
      h('span.ae-menu-icon', null, it.checked ? h('span.ae-menu-check', { class: it.radio ? 'radio' : '' }) : it.icon ? A.img(it.icon) : null),
      h('span.ae-menu-label', null, it.label),
      h('span.ae-menu-shortcut', null, it.shortcut || ''),
      h('span.ae-menu-arrow', null, it.submenu ? '▸' : ''));
      row.item = it;
      rows.push(row);
      el.appendChild(row);
      row.addEventListener('pointerenter', () => {
        rows.forEach((r) => r.classList.remove('hot'));
        row.classList.add('hot');
        if (sub && sub.row !== row) { sub.close(); sub = null; }
        if (it.submenu && !it.disabled && !sub) openSub(row);
      });
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        if (it.disabled) return;
        if (it.submenu) { if (!sub) openSub(row); return; }
        onPick(it);
      });
    });
    function openSub(row) {
      const r = row.getBoundingClientRect();
      const list = typeof row.item.submenu === 'function' ? row.item.submenu() : row.item.submenu;
      sub = ui.menu(list, r.right - 3, r.top - 4, { depth: depth + 1, parentPick: onPick, flipX: r.left });
      sub.row = row;
    }
    el.rows = rows;
    el.closeSub = () => { if (sub) { sub.close(); sub = null; } };
    return el;
  }

  // ui.menu(items, x, y, opts) -> { el, close() }
  ui.menu = function (items, x, y, o = {}) {
    const depth = o.depth || 0;
    if (depth === 0) closeAllMenus();
    let closed = false;
    const handle = {
      close(silent) {
        if (closed) return;
        closed = true;
        el.closeSub();
        el.classList.add('closing');
        setTimeout(() => el.remove(), 120);
        openMenus = openMenus.filter((m) => m !== handle);
        if (depth === 0) {
          document.removeEventListener('pointerdown', outside, true);
          document.removeEventListener('keydown', keys, true);
          window.removeEventListener('blur', blurClose);
        }
        if (!silent || depth === 0) o.onClose && o.onClose();
      },
    };
    const pick = o.parentPick || function (it) {
      closeAllMenus();
      A.sound.play('menu');
      if (it.onClick) setTimeout(() => it.onClick(it), 0);
    };
    const el = buildMenu(items, depth, pick);
    if (o.className) el.classList.add(o.className);
    if (o.minWidth) el.style.minWidth = o.minWidth + 'px';
    document.getElementById('ae-overlays').appendChild(el);
    const W = window.innerWidth, H = window.innerHeight;
    const mw = el.offsetWidth, mh = el.offsetHeight;
    let left = x, top = y;
    if (left + mw > W - 4) left = o.flipX != null ? o.flipX - mw + 3 : W - mw - 4;
    if (top + mh > H - 4) top = o.anchorTop != null ? o.anchorTop - mh : Math.max(4, H - mh - 4);
    el.style.left = Math.max(4, left) + 'px';
    el.style.top = Math.max(4, top) + 'px';
    el.style.zIndex = 100000 + depth;
    openMenus.push(handle);
    handle.el = el;

    function outside(e) {
      if (openMenus.some((m) => m.el.contains(e.target))) return;
      if (o.owner && o.owner.contains(e.target)) return;
      closeAllMenus();
    }
    function blurClose() { closeAllMenus(); }
    function keys(e) {
      const top = openMenus[openMenus.length - 1];
      if (!top) return;
      const rows = top.el.rows.filter((r) => !r.item.disabled);
      const idx = rows.findIndex((r) => r.classList.contains('hot'));
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (openMenus.length > 1) top.close(); else closeAllMenus(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = rows.length; if (!n) return;
        const next = e.key === 'ArrowDown' ? (idx + 1) % n : (idx - 1 + n) % n;
        rows.forEach((r) => r.classList.remove('hot'));
        rows[next].classList.add('hot');
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        if (idx < 0) return;
        e.preventDefault();
        if (e.key === 'ArrowRight' && !rows[idx].item.submenu) return;
        rows[idx].click();
      } else if (e.key === 'ArrowLeft' && openMenus.length > 1) { e.preventDefault(); top.close(); }
    }
    if (depth === 0) {
      setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
      document.addEventListener('keydown', keys, true);
      window.addEventListener('blur', blurClose);
    }
    return handle;
  };

  // Attach a context menu; itemsFn(e) returns the item list (or null for none).
  ui.contextMenu = function (el, itemsFn) {
    el.addEventListener('contextmenu', (e) => {
      const items = itemsFn(e);
      if (!items) return;
      e.preventDefault();
      e.stopPropagation();
      ui.menu(items, e.clientX, e.clientY);
    });
  };

  // Classic menu bar: [{label, items: [] | () => []}]
  ui.menubar = function (defs, o = {}) {
    const bar = h('div.ae-menubar', { role: 'menubar', class: o.className });
    let active = null;
    defs.forEach((d) => {
      const btn = h('button.ae-menubar-item', { type: 'button' }, d.label);
      const open = () => {
        const r = btn.getBoundingClientRect();
        bar.querySelectorAll('.ae-menubar-item').forEach((b) => b.classList.remove('open'));
        btn.classList.add('open');
        active = { btn, menu: ui.menu(typeof d.items === 'function' ? d.items() : d.items, r.left, r.bottom, { owner: bar, onClose: () => { btn.classList.remove('open'); if (active && active.btn === btn) active = null; } }) };
      };
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (active && active.btn === btn) { closeAllMenus(); active = null; return; }
        open();
      });
      btn.addEventListener('pointerenter', () => { if (active && active.btn !== btn) open(); });
      bar.appendChild(btn);
    });
    return bar;
  };

  // ------------------------------------------------------------ flyouts
  // A glass popover anchored to an element; closes on outside click.
  ui.flyout = function (anchor, content, o = {}) {
    const el = h('div.ae-flyout', { class: o.className }, content);
    document.getElementById('ae-overlays').appendChild(el);
    const r = anchor.getBoundingClientRect();
    const w = el.offsetWidth, hgt = el.offsetHeight;
    let left = o.align === 'left' ? r.left : o.align === 'center' ? r.left + r.width / 2 - w / 2 : r.right - w;
    left = clamp(left, 6, window.innerWidth - w - 6);
    let top = o.placement === 'bottom' ? r.bottom + 6 : r.top - hgt - 8;
    top = clamp(top, 6, window.innerHeight - hgt - 6);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    requestAnimationFrame(() => el.classList.add('open'));
    let closed = false;
    const handle = {
      el,
      close() {
        if (closed) return;
        closed = true;
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', esc, true);
        el.classList.remove('open');
        el.classList.add('closing');
        setTimeout(() => el.remove(), 180);
        o.onClose && o.onClose();
      },
    };
    function outside(e) { if (!el.contains(e.target) && !anchor.contains(e.target) && !(e.target.closest && e.target.closest('.ae-menu'))) handle.close(); }
    function esc(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); handle.close(); } }
    setTimeout(() => { document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', esc, true); }, 0);
    return handle;
  };

  // ------------------------------------------------------------ tooltips
  (function tooltips() {
    let timer = null, tip = null, target = null;
    function hide() { clearTimeout(timer); timer = null; if (tip) { tip.remove(); tip = null; } target = null; }
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (t === target) return;
      hide();
      if (!t || document.body.classList.contains('ae-dragging')) return;
      target = t;
      const x = e.clientX, y = e.clientY;
      timer = setTimeout(() => {
        if (!target || !document.body.contains(target)) return;
        const text = target.getAttribute('data-tip');
        if (!text) return;
        tip = h('div.ae-tooltip', { role: 'tooltip' });
        const title = target.getAttribute('data-tip-title');
        if (title) tip.appendChild(h('b', null, title));
        tip.appendChild(h('span', null, text));
        // On the body, above full-screen experiences like Channels.
        document.body.appendChild(tip);
        const w = tip.offsetWidth, hh = tip.offsetHeight;
        let left = x + 2, top = y + 22;
        if (left + w > window.innerWidth - 4) left = window.innerWidth - w - 4;
        if (top + hh > window.innerHeight - 4) top = y - hh - 8;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
      }, 600);
    });
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('wheel', hide, { passive: true, capture: true });
    document.addEventListener('pointerout', (e) => { if (target && (!e.relatedTarget || !target.contains(e.relatedTarget))) hide(); });
  })();

  // ------------------------------------------------------------ dialogs
  const STATUS_ICON = { info: 'icons/info', warning: 'icons/warning', error: 'icons/error', question: 'icons/help', success: 'icons/check', shield: 'icons/defender' };

  // Generic modal dialog hosting arbitrary content.
  // ui.dialog({title, icon, content, buttons:[{label, tone, default, cancel, onClick -> false keeps open}], parent, width})
  ui.dialog = function (o = {}) {
    return new Promise((resolve) => {
      const footer = h('div.ae-dialog-footer');
      const win = A.wm.create({
        title: o.title || 'Aerium',
        icon: o.icon || 'icons/aerium',
        width: o.width || 420,
        height: o.height || 'auto',
        resizable: false,
        maximizable: false,
        minimizable: false,
        modal: o.parent || null,
        center: true,
        className: 'ae-dialog-win',
        taskbar: !o.parent,
        sound: false,
      });
      let result = null;
      const buttons = (o.buttons || [{ label: 'OK', default: true }]).map((b, i) => {
        const btn = ui.button(b.label, {
          tone: b.tone || (b.default ? 'aqua' : 'pearl'),
          onClick: async () => {
            if (b.onClick) { const keep = await b.onClick(); if (keep === false) return; }
            result = b.value !== undefined ? b.value : i;
            win.close(true);
          },
        });
        btn.style.minWidth = '84px';
        if (b.default) btn.classList.add('ae-default');
        return btn;
      });
      buttons.forEach((b) => footer.appendChild(b));
      const body = h('div.ae-dialog', null, h('div.ae-dialog-main', null, o.content), (o.buttons || []).length || !o.noButtons ? footer : null);
      win.body.appendChild(body);
      win.on('close', () => resolve(result == null ? (o.cancelValue !== undefined ? o.cancelValue : -1) : result));
      win.el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); const ci = (o.buttons || []).findIndex((b) => b.cancel); result = ci >= 0 ? ((o.buttons[ci].value !== undefined) ? o.buttons[ci].value : ci) : null; win.close(true); }
        if (e.key === 'Enter' && !(e.target && e.target.tagName === 'TEXTAREA') && !(e.target && e.target.tagName === 'BUTTON')) {
          const di = (o.buttons || []).findIndex((b) => b.default);
          if (di >= 0) { e.preventDefault(); buttons[di].click(); }
        }
      });
      win.fitContent();
      win.center();
      setTimeout(() => {
        const f = body.querySelector('input, textarea, select') || buttons.find((b) => b.classList.contains('ae-default')) || buttons[0];
        f && f.focus();
      }, 60);
      if (o.onOpen) o.onOpen(win, body);
    });
  };

  // Vista task dialog: a blue main instruction, content text and buttons.
  // Resolves with the index (or value) of the button pressed.
  ui.messageBox = function (o = {}) {
    if (typeof o === 'string') o = { message: o };
    const icon = STATUS_ICON[o.icon] || o.icon || null;
    const btns = (o.buttons || ['OK']).map((b, i, arr) => (typeof b === 'string' ? { label: b, value: i, default: i === (o.defaultButton || 0), cancel: /^(cancel|no|close)$/i.test(b) || (arr.length === 1) } : b));
    const content = h('div.ae-taskdialog', null,
      icon ? A.img(icon, { class: 'ae-td-icon' }) : null,
      h('div.ae-td-text', null,
        o.instruction ? h('div.ae-td-instruction', null, o.instruction) : null,
        o.message ? h('div.ae-td-message', null, o.message) : null,
        o.detail ? h('div.ae-td-detail', null, o.detail) : null));
    if (o.sound !== false) A.sound.play(o.icon === 'error' ? 'error' : o.icon === 'warning' ? 'exclamation' : o.icon === 'question' ? 'question' : 'notify');
    return ui.dialog({ title: o.title || 'Aerium', icon: o.windowIcon || icon || 'icons/aerium', content, buttons: btns, parent: o.parent, width: o.width || 440 });
  };

  ui.alert = (message, o = {}) => ui.messageBox(Object.assign({ message, icon: 'info' }, o));
  ui.confirm = (message, o = {}) => ui.messageBox(Object.assign({ message, icon: 'question', buttons: ['Yes', 'No'] }, o)).then((r) => r === 0);

  ui.prompt = function (o = {}) {
    const field = ui.textField({ value: o.value || '', placeholder: o.placeholder || '' });
    field.classList.add('ae-prompt-field');
    const content = h('div.ae-prompt', null, o.message ? h('div.ae-td-message', null, o.message) : null, field);
    return ui.dialog({
      title: o.title || 'Aerium',
      icon: o.icon,
      content,
      parent: o.parent,
      width: o.width || 400,
      buttons: [{ label: o.okLabel || 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }],
      cancelValue: null,
      onOpen: () => setTimeout(() => { field.input.focus(); field.input.select(); }, 80),
    }).then((r) => (r === 'ok' ? field.input.value : null));
  };

  // ------------------------------------------------------------ file dialog
  // ui.fileDialog({mode: 'open'|'save', title, folder, filename, exts: ['txt'], filterLabel, parent})
  // Resolves with the chosen path or null.
  ui.fileDialog = function (o = {}) {
    const fs = A.fs;
    const mode = o.mode || 'open';
    let folder = fs.isDir(o.folder) ? fs.normalize(o.folder) : '/Documents';
    let selected = null;
    const exts = (o.exts || []).map((e) => e.toLowerCase());
    const matches = (it) => it.type === 'folder' || !exts.length || exts.includes(it.ext);

    const crumbs = h('div.ae-fd-crumbs');
    const list = h('div.ae-fd-list', { tabIndex: 0 });
    const nameField = h('input.ae-fd-name', { type: 'text', value: o.filename || '', spellcheck: false });
    const places = [['Desktop', '/Desktop'], ['Documents', '/Documents'], ['Pictures', '/Pictures'], ['Music', '/Music'], ['Videos', '/Videos'], ['Downloads', '/Downloads']];
    const nav = h('div.ae-fd-nav', null, h('div.ae-fd-nav-title', null, 'Favorite Links'), places.map(([label, path]) => h('button.ae-fd-place', { type: 'button', onclick: () => go(path), dataset: { path } }, A.img(fs.iconFor(path)), label)));
    const upBtn = h('button.ae-fd-up', { type: 'button', 'data-tip': 'Up one level', onclick: () => folder !== '/' && go(fs.dirname(folder)) }, '↑');
    const filterText = o.filterLabel || (exts.length ? exts.map((e) => '*.' + e).join('; ') : 'All Files (*.*)');

    function go(path) {
      folder = fs.normalize(path);
      selected = null;
      render();
    }
    function render() {
      crumbs.innerHTML = '';
      crumbs.appendChild(A.img(fs.iconFor(folder), { class: 'ae-fd-crumb-icon' }));
      const parts = folder === '/' ? [] : folder.slice(1).split('/');
      const home = h('button.ae-fd-crumb', { type: 'button', onclick: () => go('/') }, A.store.get('user.name') || 'Home');
      crumbs.appendChild(home);
      parts.forEach((p, i) => {
        crumbs.appendChild(h('span.ae-fd-sep', null, '▸'));
        const path = '/' + parts.slice(0, i + 1).join('/');
        crumbs.appendChild(h('button.ae-fd-crumb', { type: 'button', onclick: () => go(path) }, p));
      });
      nav.querySelectorAll('.ae-fd-place').forEach((b) => b.classList.toggle('active', b.dataset.path === folder));
      list.innerHTML = '';
      const items = fs.list(folder).filter(matches).filter((it) => it.path !== fs.RECYCLE);
      if (!items.length) list.appendChild(h('div.ae-fd-empty', null, 'This folder is empty.'));
      items.forEach((it) => {
        const thumb = it.type === 'file' ? fs.thumbFor(it.path) : null;
        const row = h('div.ae-fd-item', { dataset: { path: it.path }, tabIndex: -1 },
          thumb ? h('img.ae-fd-thumb', { src: thumb, alt: '' }) : A.img(fs.iconFor(it.path)),
          h('span.ae-fd-item-name', null, it.name),
          h('span.ae-fd-item-meta', null, it.type === 'folder' ? 'File Folder' : A.util.fmtBytes(it.size)));
        row.addEventListener('click', () => {
          list.querySelectorAll('.ae-fd-item').forEach((r) => r.classList.remove('selected'));
          row.classList.add('selected');
          selected = it;
          if (it.type === 'file') nameField.value = it.name;
        });
        row.addEventListener('dblclick', () => {
          if (it.type === 'folder') go(it.path);
          else { nameField.value = it.name; confirm(); }
        });
        list.appendChild(row);
      });
    }

    let resolveFn;
    let dialogWin = null;
    async function confirm() {
      let name = nameField.value.trim();
      if (!name) { if (selected && selected.type === 'folder') go(selected.path); return false; }
      if (mode === 'save' && exts.length && !exts.includes(fs.ext(name))) name += '.' + exts[0];
      const path = fs.join(folder, name);
      if (mode === 'open') {
        if (fs.isDir(path)) { go(path); return false; }
        if (!fs.exists(path)) { await ui.messageBox({ title: o.title || 'Open', icon: 'warning', message: name + '\nFile not found.\nCheck the file name and try again.', parent: dialogWin }); return false; }
      } else if (fs.exists(path)) {
        if (fs.isDir(path)) { go(path); return false; }
        const ok = await ui.confirm(name + ' already exists.\nDo you want to replace it?', { title: 'Confirm Save As', icon: 'warning', parent: dialogWin });
        if (!ok) return false;
      }
      resolveFn(path);
      dialogWin && dialogWin.close(true);
      return true;
    }

    const content = h('div.ae-filedialog', null,
      h('div.ae-fd-top', null, upBtn, crumbs),
      h('div.ae-fd-main', null, nav, list),
      h('div.ae-fd-bottom', null,
        h('label.ae-fd-row', null, h('span', null, 'File name:'), nameField),
        h('label.ae-fd-row', null, h('span', null, mode === 'save' ? 'Save as type:' : 'Files of type:'), h('select.ae-select', { disabled: true }, h('option', null, filterText)))));

    return new Promise((resolve) => {
      resolveFn = resolve;
      let done = false;
      const wrapped = (v) => { if (!done) { done = true; resolve(v); } };
      resolveFn = wrapped;
      ui.dialog({
        title: o.title || (mode === 'save' ? 'Save As' : 'Open'),
        icon: 'icons/folder',
        content,
        parent: o.parent,
        width: 640,
        buttons: [
          { label: mode === 'save' ? 'Save' : 'Open', default: true, onClick: () => confirm().then(() => false) },
          { label: 'Cancel', cancel: true, value: null },
        ],
        cancelValue: null,
        onOpen: (win) => { dialogWin = win; render(); setTimeout(() => { nameField.focus(); nameField.select(); }, 80); },
      }).then(() => wrapped(null));
      nameField.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); confirm(); } });
    });
  };

  // Permission prompt: the screen dims and a single question asks for consent.
  // ui.uac({ program, publisher, verified }) resolves true for Yes.
  ui.uac = function (o = {}) {
    return new Promise((resolve) => {
      const verified = o.verified !== false;
      const overlay = h('div.ae-uac-dim');
      const yes = ui.button('Yes', { tone: 'aqua' });
      const no = ui.button('No', { default: true });
      const box = h('div.ae-uac', { role: 'alertdialog', 'aria-label': 'Permission' },
        h('div.ae-uac-band', { class: verified ? 'ok' : 'unknown' }, A.img('icons/defender'), h('span', null, 'Do you want to let this program make changes to your computer?')),
        h('div.ae-uac-body', null,
          h('div.ae-uac-prog', null, A.img(o.icon || 'icons/settings'), h('div', null,
            h('div', null, h('span.ae-muted', null, 'Program name: '), o.program || 'Aerium'),
            h('div', null, h('span.ae-muted', null, 'Verified publisher: '), verified ? (o.publisher || 'Aerium Playground') : 'Unknown'),
            h('div', null, h('span.ae-muted', null, 'File origin: '), 'Hard drive on this computer')))),
        h('div.ae-uac-foot', null, h('button.ae-link', { type: 'button', onclick: (e) => { e.target.textContent = 'It is all just for fun. Nothing here can change your real computer.'; } }, 'Show details'), h('span', { style: { flex: 1 } }), yes, no));
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('on'));
      A.sound.play('exclamation');
      const done = (v) => { overlay.classList.remove('on'); setTimeout(() => overlay.remove(), 300); resolve(v); };
      yes.addEventListener('click', () => done(true));
      no.addEventListener('click', () => done(false));
      overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(false); });
      setTimeout(() => no.focus(), 50);
    });
  };

  A.ui = ui;
})();
