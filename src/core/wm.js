/* Aerium window manager: glass windows that drag, resize, snap to screen
   edges, shake, minimize into the taskbar and host modal task dialogs. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp, emitter, uid } = A.util;

  const TASKBAR_H = 40;
  const SNAP_EDGE = 6;

  const wm = {
    layer: null,
    windows: [],
    active: null,
    z: 10,
    shaken: null,
  };

  function area() {
    const W = wm.layer ? wm.layer.clientWidth : window.innerWidth;
    const H = wm.layer ? wm.layer.clientHeight : window.innerHeight - TASKBAR_H;
    return { W, H };
  }

  let cascade = 0;

  class Win {
    constructor(o) {
      this.id = uid('win');
      this.o = o;
      this.app = o.app || null;
      this.title = o.title || '';
      this.icon = o.icon || 'icons/aerium';
      this.state = 'normal';
      this.snap = null;
      this.ev = emitter();
      this.modalChild = null;
      this.parent = o.modal || null;
      this.closed = false;
      this.taskbar = o.taskbar !== false && !o.modal;
      this.created = Date.now();
      this.build();
    }

    build() {
      const o = this.o;
      const iconEl = A.img(this.icon, { class: 'win-icon' });
      const titleEl = h('div.win-title', null, this.title);
      const caption = h('div.win-caption');
      if (o.minimizable !== false) caption.appendChild(h('button.win-btn.win-min', { type: 'button', 'aria-label': 'Minimize', 'data-tip': 'Minimize', onclick: (e) => { e.stopPropagation(); this.minimize(); } }, h('i')));
      if (o.maximizable !== false && o.resizable !== false) caption.appendChild(h('button.win-btn.win-max', { type: 'button', 'aria-label': 'Maximize', 'data-tip': 'Maximize', onclick: (e) => { e.stopPropagation(); this.toggleMaximize(); } }, h('i')));
      if (o.closable !== false) caption.appendChild(h('button.win-btn.win-close', { type: 'button', 'aria-label': 'Close', 'data-tip': 'Close', onclick: (e) => { e.stopPropagation(); this.close(); } }, h('i')));
      const titlebar = h('div.win-titlebar', null, iconEl, titleEl, caption);
      const body = h('div.win-body', { class: o.bodyClass });
      const el = h('div.win', {
        role: 'dialog',
        'aria-label': this.title,
        tabIndex: -1,
        class: [o.className, o.glassBody && 'win-glass-body', o.resizable === false && 'win-fixed', o.modal && 'win-modal', o.app && 'app-' + o.app],
        dataset: { win: this.id },
      }, titlebar, body);
      if (o.resizable !== false) {
        ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach((d) => {
          const rz = h('div.win-rz', { class: 'rz-' + d });
          el.appendChild(rz);
          this.bindResize(rz, d);
        });
      }
      this.el = el;
      this.body = body;
      this.titlebar = titlebar;
      this.titleEl = titleEl;
      this.iconEl = iconEl;
      this.caption = caption;

      // Bounds
      const { W, H } = area();
      let w = o.width || 640;
      let hgt = o.height === 'auto' ? 200 : o.height || 440;
      w = Math.min(w, W - 20);
      hgt = Math.min(hgt, H - 10);
      let x, y;
      if (o.x != null && o.y != null) { x = o.x; y = o.y; }
      else if (o.center || o.modal) { x = (W - w) / 2; y = Math.max(10, (H - hgt) / 2 - 20); }
      else {
        x = 90 + (cascade % 8) * 28 + Math.min(80, W * 0.04);
        y = 40 + (cascade % 8) * 26;
        cascade++;
        if (x + w > W - 10) x = Math.max(10, W - w - 10);
        if (y + hgt > H - 10) y = Math.max(0, H - hgt - 10);
      }
      this.rect = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hgt) };
      this.applyRect();
      if (o.height === 'auto') el.classList.add('win-autoheight');

      // Interactions
      el.addEventListener('pointerdown', () => this.focus(), true);
      titlebar.addEventListener('dblclick', (e) => {
        if (e.target.closest('.win-btn')) return;
        if (e.target === iconEl) { this.close(); return; }
        if (o.maximizable !== false && o.resizable !== false) this.toggleMaximize();
      });
      titlebar.addEventListener('contextmenu', (e) => { e.preventDefault(); this.systemMenu(e.clientX, e.clientY); });
      iconEl.addEventListener('click', (e) => { e.stopPropagation(); const r = iconEl.getBoundingClientRect(); this.systemMenu(r.left, r.bottom + 2); });
      this.bindMove();
    }

    applyRect() {
      const r = this.rect;
      Object.assign(this.el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: this.el.classList.contains('win-autoheight') ? '' : r.h + 'px' });
    }

    bindMove() {
      let start = null;
      let shake = null;
      A.util.drag(this.titlebar, {
        threshold: 2,
        filter: (e) => !e.target.closest('.win-btn') && e.target !== this.iconEl,
        onStart: (e) => {
          if (wm.flipping) return false;
          const { W } = area();
          if (this.state === 'maximized' || this.snap) {
            // Pull the window off the edge, keeping the cursor at the same relative spot.
            const restore = this.restoreRect || this.rect;
            const ratio = (e.clientX - this.el.getBoundingClientRect().left) / this.el.offsetWidth;
            this.state = 'normal';
            this.snap = null;
            this.el.classList.remove('win-maximized', 'win-snapped');
            this.rect = { x: clamp(e.clientX - restore.w * ratio, 0, W - restore.w), y: Math.max(0, e.clientY - 14), w: restore.w, h: restore.h };
            this.applyRect();
            this.updateMaxButton();
            this.emit('resize');
          }
          start = { x: this.rect.x, y: this.rect.y };
          shake = { lastX: e.clientX, dir: 0, flips: [], };
          this.el.classList.add('win-moving');
          return true;
        },
        onMove: (e, dx, dy) => {
          const { W, H } = area();
          this.rect.x = start.x + dx;
          this.rect.y = clamp(start.y + dy, 0, H - 30);
          this.el.style.left = this.rect.x + 'px';
          this.el.style.top = this.rect.y + 'px';
          // Snap preview near screen edges
          let zone = null;
          if (this.o.resizable !== false) {
            if (e.clientY <= SNAP_EDGE) zone = 'max';
            else if (e.clientX <= SNAP_EDGE) zone = 'left';
            else if (e.clientX >= window.innerWidth - SNAP_EDGE) zone = 'right';
          }
          wm.showSnapPreview(zone, e.clientX, e.clientY);
          this.pendingSnap = zone;
          // Shake detection: rapid left-right reversals
          const mx = e.clientX - shake.lastX;
          if (Math.abs(mx) > 18) {
            const dir = Math.sign(mx);
            if (shake.dir && dir !== shake.dir) {
              const t = performance.now();
              shake.flips = shake.flips.filter((f) => t - f < 700);
              shake.flips.push(t);
              if (shake.flips.length >= 4) { shake.flips = []; wm.shake(this); }
            }
            shake.dir = dir;
            shake.lastX = e.clientX;
          }
        },
        onEnd: () => {
          this.el.classList.remove('win-moving');
          wm.showSnapPreview(null);
          if (this.pendingSnap) {
            const z = this.pendingSnap;
            this.pendingSnap = null;
            if (z === 'max') this.maximize();
            else this.snapTo(z);
            A.sound.play('snap');
          }
          this.emit('move');
        },
      });
    }

    bindResize(handle, dir) {
      let start = null;
      A.util.drag(handle, {
        threshold: 0,
        onStart: () => {
          if (this.state === 'maximized') return false;
          if (this.snap) { this.snap = null; this.el.classList.remove('win-snapped'); }
          start = Object.assign({}, this.rect, { h: this.el.offsetHeight });
          this.el.classList.remove('win-autoheight');
          this.el.classList.add('win-resizing');
          return true;
        },
        onMove: (e, dx, dy) => {
          const minW = this.o.minWidth || 260, minH = this.o.minHeight || 150;
          const r = Object.assign({}, start);
          if (dir.includes('e')) r.w = Math.max(minW, start.w + dx);
          if (dir.includes('s')) r.h = Math.max(minH, start.h + dy);
          if (dir.includes('w')) { r.w = Math.max(minW, start.w - dx); r.x = start.x + (start.w - r.w); }
          if (dir.includes('n')) { r.h = Math.max(minH, start.h - dy); r.y = Math.max(0, start.y + (start.h - r.h)); }
          this.rect = r;
          this.applyRect();
          this.emitResize();
        },
        onEnd: () => { this.el.classList.remove('win-resizing'); this.emit('resize'); },
      });
    }

    emitResize() {
      if (this._rzRaf) return;
      this._rzRaf = requestAnimationFrame(() => { this._rzRaf = null; this.emit('resize'); });
    }

    systemMenu(x, y) {
      const max = this.state === 'maximized';
      A.ui.menu([
        { label: 'Restore', disabled: !max && !this.snap, onClick: () => this.restoreSize() },
        { label: 'Minimize', disabled: this.o.minimizable === false, onClick: () => this.minimize() },
        { label: 'Maximize', disabled: max || this.o.maximizable === false || this.o.resizable === false, onClick: () => this.maximize() },
        { separator: true },
        { label: 'Close', bold: true, shortcut: 'Alt+F4', onClick: () => this.close() },
      ], x, y);
    }

    // ---------------------------------------------------------- API
    on(ev, fn) { return this.ev.on(ev, fn); }
    emit(ev, ...a) { this.ev.emit(ev, this, ...a); }

    setTitle(t) {
      this.title = t;
      this.titleEl.textContent = t;
      this.el.setAttribute('aria-label', t);
      A.bus.emit('win:title', this);
    }
    setIcon(icon) {
      this.icon = icon;
      this.iconEl.src = A.asset(icon);
      A.bus.emit('win:icon', this);
    }

    focus() {
      if (this.closed) return;
      if (this.modalChild && !this.modalChild.closed) {
        if (wm.active !== this.modalChild) this.modalChild.focus();
        return;
      }
      if (wm.active === this && this.el.classList.contains('active')) return;
      if (this.state === 'minimized') { this.restore(); return; }
      const prev = wm.active;
      if (prev && prev !== this) { prev.el.classList.remove('active'); prev.emit('blur'); A.bus.emit('win:blur', prev); }
      wm.active = this;
      this.el.style.zIndex = ++wm.z;
      if (this.modalChild) this.modalChild.el.style.zIndex = ++wm.z;
      this.el.classList.add('active');
      if (!this.el.contains(document.activeElement)) this.el.focus({ preventScroll: true });
      this.stopFlash();
      this.emit('focus');
      A.bus.emit('win:focus', this);
    }

    blur() {
      if (wm.active !== this) return;
      this.el.classList.remove('active');
      wm.active = null;
      this.emit('blur');
      A.bus.emit('win:blur', this);
    }

    minimize() {
      if (this.state === 'minimized' || this.o.minimizable === false) return;
      this.prevState = this.state;
      this.state = 'minimized';
      const target = A.taskbar && A.taskbar.buttonRect(this);
      const r = this.el.getBoundingClientRect();
      A.sound.play('minimize');
      const done = () => { this.el.style.display = 'none'; };
      if (target && this.el.animate) {
        const dx = target.left + target.width / 2 - (r.left + r.width / 2);
        const dy = target.top + target.height / 2 - (r.top + r.height / 2);
        this.el.animate([
          { transform: 'none', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0 },
        ], { duration: 260, easing: 'cubic-bezier(.4,0,.8,.6)' }).onfinish = done;
      } else done();
      this.el.classList.remove('active');
      if (wm.active === this) { wm.active = null; wm.focusTop(this); }
      this.emit('minimize');
      A.bus.emit('win:minimize', this);
    }

    restore() {
      if (this.state !== 'minimized') { this.focus(); return; }
      this.state = this.prevState === 'maximized' ? 'maximized' : 'normal';
      this.el.style.display = '';
      const target = A.taskbar && A.taskbar.buttonRect(this);
      const r = this.el.getBoundingClientRect();
      if (target && this.el.animate) {
        const dx = target.left + target.width / 2 - (r.left + r.width / 2);
        const dy = target.top + target.height / 2 - (r.top + r.height / 2);
        this.el.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0 },
          { transform: 'none', opacity: 1 },
        ], { duration: 240, easing: 'cubic-bezier(.2,.6,.3,1)' });
      }
      A.sound.play('maximize');
      this.emit('restore');
      A.bus.emit('win:restore', this);
      this.focus();
    }

    flipAnimate(apply) {
      const before = this.el.getBoundingClientRect();
      apply();
      const after = this.el.getBoundingClientRect();
      if (!this.el.animate || !before.width || !after.width) return;
      const sx = before.width / after.width, sy = before.height / after.height;
      const dx = before.left - after.left, dy = before.top - after.top;
      this.el.animate([
        { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transformOrigin: '0 0', transform: 'none' },
      ], { duration: 190, easing: 'cubic-bezier(.2,.7,.3,1)' });
    }

    maximize() {
      if (this.o.maximizable === false || this.o.resizable === false) return;
      if (this.state === 'minimized') this.restore();
      if (this.state === 'maximized') return;
      if (!this.snap) this.restoreRect = Object.assign({}, this.rect, { h: this.el.offsetHeight });
      this.flipAnimate(() => {
        this.state = 'maximized';
        this.snap = null;
        this.el.classList.remove('win-snapped', 'win-autoheight');
        this.el.classList.add('win-maximized');
        Object.assign(this.el.style, { left: '0px', top: '0px', width: '100%', height: '100%' });
      });
      this.updateMaxButton();
      this.emit('resize');
      this.emit('maximize');
      A.bus.emit('win:maximize', this);
      this.focus();
    }

    snapTo(side) {
      const { W, H } = area();
      if (!this.snap && this.state !== 'maximized') this.restoreRect = Object.assign({}, this.rect, { h: this.el.offsetHeight });
      this.flipAnimate(() => {
        this.state = 'normal';
        this.snap = side;
        this.el.classList.remove('win-maximized', 'win-autoheight');
        this.el.classList.add('win-snapped');
        this.rect = { x: side === 'left' ? 0 : Math.floor(W / 2), y: 0, w: Math.ceil(W / 2), h: H };
        this.applyRect();
      });
      this.updateMaxButton();
      this.emit('resize');
    }

    restoreSize() {
      if (this.state === 'minimized') { this.restore(); return; }
      if (this.state !== 'maximized' && !this.snap) return;
      const r = this.restoreRect || this.rect;
      this.flipAnimate(() => {
        this.state = 'normal';
        this.snap = null;
        this.el.classList.remove('win-maximized', 'win-snapped');
        this.rect = Object.assign({}, r);
        this.applyRect();
      });
      this.updateMaxButton();
      this.emit('resize');
      A.bus.emit('win:restoreSize', this);
    }

    toggleMaximize() {
      if (this.state === 'maximized' || this.snap) this.restoreSize();
      else this.maximize();
    }

    updateMaxButton() {
      const b = this.caption.querySelector('.win-max');
      if (!b) return;
      const max = this.state === 'maximized';
      b.classList.toggle('is-restore', max);
      b.setAttribute('aria-label', max ? 'Restore Down' : 'Maximize');
      b.setAttribute('data-tip', max ? 'Restore Down' : 'Maximize');
    }

    moveTo(x, y) { this.rect.x = Math.round(x); this.rect.y = Math.round(y); this.applyRect(); }
    resizeTo(w, hh) { this.rect.w = Math.round(w); this.rect.h = Math.round(hh); this.el.classList.remove('win-autoheight'); this.applyRect(); this.emit('resize'); }
    center() {
      const { W, H } = area();
      const hh = this.el.offsetHeight || this.rect.h;
      this.moveTo(Math.max(0, (W - this.rect.w) / 2), Math.max(0, (H - hh) / 2 - 16));
    }
    fitContent() {
      if (!this.el.classList.contains('win-autoheight')) return;
      this.rect.h = this.el.offsetHeight;
    }

    flash() {
      if (wm.active === this && this.state !== 'minimized') return;
      this.flashing = true;
      A.bus.emit('win:flash', this, true);
    }
    stopFlash() {
      if (!this.flashing) return;
      this.flashing = false;
      A.bus.emit('win:flash', this, false);
    }

    shake() {
      if (this.state === 'minimized') this.restore();
      this.el.classList.remove('win-nudge');
      void this.el.offsetWidth;
      this.el.classList.add('win-nudge');
      setTimeout(() => this.el.classList.remove('win-nudge'), 700);
    }

    setBusy(on) { this.el.classList.toggle('win-busy', !!on); }

    setNotResponding(on) {
      this.notResponding = !!on;
      const base = this.title.replace(/ \(Not Responding\)$/, '');
      this.setTitle(on ? base + ' (Not Responding)' : base);
      this.el.classList.toggle('win-hung', !!on);
    }

    async close(force) {
      if (this.closed) return false;
      while (this.modalChild && !this.modalChild.closed) {
        if (!force) { this.modalChild.focus(); this.modalChild.flashFrame(); return false; }
        await this.modalChild.close(true);
      }
      if (!force && this.beforeClose) {
        let ok = true;
        try { ok = await this.beforeClose(); } catch (e) { ok = true; }
        if (ok === false) return false;
      }
      this.closed = true;
      if (this.o.sound !== false && !this.o.modal) A.sound.play('close');
      this.emit('close');
      A.bus.emit('win:close', this);
      wm.windows = wm.windows.filter((w) => w !== this);
      if (this.parent) {
        // Dialogs can stack on one parent; the one underneath takes over.
        const p = this.parent;
        p.modalStack = (p.modalStack || []).filter((w) => w !== this && !w.closed);
        p.modalChild = p.modalStack[p.modalStack.length - 1] || null;
        if (!p.modalChild) p.el.classList.remove('win-blocked');
      }
      const finish = () => this.el.remove();
      if (this.el.animate && this.state !== 'minimized') {
        this.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 170, easing: 'ease-in' }).onfinish = finish;
      } else finish();
      if (wm.active === this) {
        wm.active = null;
        if (this.parent) (this.parent.modalChild || this.parent).focus();
        else wm.focusTop(this);
      }
      return true;
    }

    flashFrame() {
      A.sound.play('ding');
      this.el.classList.remove('win-attention');
      void this.el.offsetWidth;
      this.el.classList.add('win-attention');
      setTimeout(() => this.el.classList.remove('win-attention'), 900);
    }
  }

  // ------------------------------------------------------------ manager
  wm.init = function (layer) {
    wm.layer = layer;
    wm.snapPreview = h('div.snap-preview');
    layer.appendChild(wm.snapPreview);
    window.addEventListener('resize', A.util.debounce(() => {
      const { W, H } = area();
      wm.windows.forEach((w) => {
        if (w.snap) w.snapTo(w.snap);
        else if (w.state !== 'maximized') {
          w.rect.x = clamp(w.rect.x, -w.rect.w + 80, W - 80);
          w.rect.y = clamp(w.rect.y, 0, H - 30);
          w.applyRect();
        }
        w.emit('resize');
      });
    }, 120));
  };

  wm.create = function (o = {}) {
    const win = new Win(o);
    wm.windows.push(win);
    wm.layer.appendChild(win.el);
    if (o.modal) {
      (o.modal.modalStack = o.modal.modalStack || []).push(win);
      o.modal.modalChild = win;
      o.modal.el.classList.add('win-blocked');
      // Clicking a blocked parent flashes its dialog.
      if (!o.modal._blockBound) {
        o.modal._blockBound = true;
        o.modal.el.addEventListener('pointerdown', (e) => {
          if (o.modal.modalChild && !o.modal.modalChild.closed) { e.stopPropagation(); e.preventDefault(); o.modal.modalChild.focus(); o.modal.modalChild.flashFrame(); }
        }, true);
      }
    }
    if (win.el.animate) win.el.animate([{ opacity: 0, transform: 'scale(.95)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.7,.3,1)' });
    if (o.sound !== false && !o.modal) A.sound.play('open');
    A.bus.emit('win:open', win);
    if (o.background && wm.active && !wm.active.closed) {
      // Opens just beneath the active window without taking focus.
      const act = wm.active;
      win.el.style.zIndex = ++wm.z;
      act.el.style.zIndex = ++wm.z;
      if (act.modalChild) act.modalChild.el.style.zIndex = ++wm.z;
    } else win.focus();
    // On phone-sized screens, big windows open maximized.
    const small = area().W < 640 && !o.modal && o.maximizable !== false && o.resizable !== false;
    if (o.maximized || small) win.maximize();
    return win;
  };

  wm.focusTop = function (except) {
    const visible = wm.windows.filter((w) => w !== except && w.state !== 'minimized' && !w.closed);
    if (!visible.length) return;
    visible.sort((a, b) => (parseInt(b.el.style.zIndex, 10) || 0) - (parseInt(a.el.style.zIndex, 10) || 0));
    visible[0].focus();
  };

  wm.byApp = (appId) => wm.windows.filter((w) => w.app === appId);
  wm.get = (id) => wm.windows.find((w) => w.id === id);
  wm.list = () => wm.windows.slice();
  wm.visible = () => wm.windows.filter((w) => w.state !== 'minimized');

  wm.showSnapPreview = function (zone, px, py) {
    const el = wm.snapPreview;
    if (!el) return;
    if (!zone) { el.classList.remove('show'); wm._zone = null; return; }
    if (wm._zone === zone) return;
    wm._zone = zone;
    const { W, H } = area();
    const r = zone === 'max' ? { x: 4, y: 4, w: W - 8, h: H - 8 } : zone === 'left' ? { x: 4, y: 4, w: W / 2 - 8, h: H - 8 } : { x: W / 2 + 4, y: 4, w: W / 2 - 8, h: H - 8 };
    el.classList.remove('show');
    Object.assign(el.style, { left: px - 10 + 'px', top: py - 10 + 'px', width: '20px', height: '20px', transition: 'none' });
    void el.offsetWidth;
    el.style.transition = '';
    el.classList.add('show');
    Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    A.sound.play('snap');
  };

  // Aero Shake: shaking a window minimizes every other window; shaking again brings them back.
  wm.shake = function (win) {
    if (wm.shaken && wm.shaken.by === win) {
      wm.shaken.list.forEach((w) => !w.closed && w.restore());
      wm.shaken = null;
      win.focus();
      return;
    }
    const others = wm.windows.filter((w) => w !== win && w.state !== 'minimized' && w.taskbar);
    if (!others.length) return;
    others.forEach((w) => w.minimize());
    wm.shaken = { by: win, list: others };
    win.focus();
  };

  wm.minimizeAll = function () {
    const list = wm.windows.filter((w) => w.state !== 'minimized' && w.taskbar);
    list.forEach((w) => w.minimize());
    return list;
  };

  // Show desktop toggles between hiding every window and restoring the same set.
  wm.toggleDesktop = function () {
    if (wm._hidden && wm._hidden.length && wm._hidden.every((w) => w.state === 'minimized' || w.closed)) {
      wm._hidden.forEach((w) => !w.closed && w.restore());
      wm._hidden = null;
    } else {
      wm._hidden = wm.minimizeAll();
    }
  };

  wm.arrange = function (mode) {
    const list = wm.windows.filter((w) => w.state !== 'minimized' && w.taskbar);
    const { W, H } = area();
    if (!list.length) return;
    list.forEach((w) => { if (w.state === 'maximized' || w.snap) { w.state = 'normal'; w.snap = null; w.el.classList.remove('win-maximized', 'win-snapped'); w.updateMaxButton(); } });
    if (mode === 'cascade') {
      list.forEach((w, i) => w.flipAnimate(() => { w.rect = { x: 30 + i * 30, y: 20 + i * 30, w: Math.min(W * 0.6, 760), h: Math.min(H * 0.65, 520) }; w.applyRect(); }));
    } else if (mode === 'stack') {
      const hh = H / list.length;
      list.forEach((w, i) => w.flipAnimate(() => { w.rect = { x: 0, y: Math.round(i * hh), w: W, h: Math.round(hh) }; w.el.classList.remove('win-autoheight'); w.applyRect(); }));
    } else {
      const ww = W / list.length;
      list.forEach((w, i) => w.flipAnimate(() => { w.rect = { x: Math.round(i * ww), y: 0, w: Math.round(ww), h: H }; w.el.classList.remove('win-autoheight'); w.applyRect(); }));
    }
    list.forEach((w) => w.emit('resize'));
  };

  wm.closeAll = async function (force) {
    for (const w of wm.windows.slice()) await w.close(force);
  };

  wm.Win = Win;
  A.wm = wm;
})();
