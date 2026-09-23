/* Aerium screensaver host: watches for idle time, runs the chosen
   screensaver full screen and wakes on the slightest movement. Individual
   screensavers register themselves (src/apps/screensavers). */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;

  const ss = { registry: new Map(), active: null };
  let lastActivity = Date.now();

  ss.register = function (def) {
    ss.registry.set(def.id, Object.assign({ name: def.id }, def));
    A.bus.emit('screensavers:change');
  };
  ss.list = () => Array.from(ss.registry.values());

  ss.start = function (id, o = {}) {
    if (ss.active) return;
    id = id || A.store.get('screensaver.id');
    const def = ss.registry.get(id);
    if (!def) return;
    A.startmenu && A.startmenu.close();
    A.ui.closeMenus();
    const host = h('div#ae-screensaver', { class: def.overDesktop ? 'over-desktop' : '' });
    document.body.appendChild(host);
    let ctrl = null;
    try {
      ctrl = def.create(host, { preview: false, text: A.store.get('screensaver.text'), width: window.innerWidth, height: window.innerHeight }) || {};
    } catch (e) {
      console.error('[Aerium] screensaver failed', e);
      host.remove();
      return;
    }
    if (!def.overDesktop) A.theme.pause();
    const started = performance.now();
    let origin = null;
    const wake = (e) => {
      if (performance.now() - started < 600) return;
      if (e.type === 'pointermove') {
        if (!origin) { origin = [e.clientX, e.clientY]; return; }
        if (Math.hypot(e.clientX - origin[0], e.clientY - origin[1]) < 8) return;
      }
      ss.stop();
    };
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, wake, true));
    ss.active = { id, host, ctrl, wake, preview: !!o.preview };
    requestAnimationFrame(() => host.classList.add('on'));
    A.bus.emit('screensaver:start', id);
  };

  ss.stop = function () {
    const a = ss.active;
    if (!a) return;
    ss.active = null;
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.removeEventListener(ev, a.wake, true));
    a.host.classList.remove('on');
    setTimeout(() => {
      try { a.ctrl && a.ctrl.destroy && a.ctrl.destroy(); } catch (e) { /* ignore */ }
      a.host.remove();
    }, 350);
    A.theme.resume();
    lastActivity = Date.now();
    A.bus.emit('screensaver:stop');
  };

  // Runs a screensaver inside a small element (the Personalization monitor).
  ss.preview = function (id, container) {
    const def = ss.registry.get(id);
    container.innerHTML = '';
    if (!def) { container.appendChild(h('div.ss-none', null, id === 'none' ? '(None)' : '')); return () => {}; }
    let ctrl = null;
    try {
      ctrl = def.create(container, { preview: true, text: A.store.get('screensaver.text'), width: container.clientWidth, height: container.clientHeight }) || {};
    } catch (e) { console.error(e); }
    return () => { try { ctrl && ctrl.destroy && ctrl.destroy(); } catch (e) { /* ignore */ } container.innerHTML = ''; };
  };

  ss.poke = () => { lastActivity = Date.now(); };

  ss.init = function () {
    ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach((ev) => window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true, capture: true }));
    setInterval(() => {
      if (ss.active || !A.shellReady || A.boot.onScreen()) return;
      const id = A.store.get('screensaver.id');
      const wait = Number(A.store.get('screensaver.wait')) || 3;
      if (!id || id === 'none' || !ss.registry.get(id)) return;
      if (A.wm.windows.some((w) => w.ctrl && w.ctrl.keepAwake && w.ctrl.keepAwake())) { lastActivity = Date.now(); return; }
      if (Date.now() - lastActivity > wait * 60000) ss.start(id);
    }, 4000);
  };

  A.screensaver = ss;
})();
