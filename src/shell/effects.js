/* Aerium shell effects: Flip 3D, mouse trails, keyboard shortcuts, the
   Konami code and the occasional tray balloon. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, pick, rand, shuffle } = A.util;
  const effects = {};

  // ------------------------------------------------------------ Flip 3D
  let flip = null;
  effects.flip3d = function () {
    if (flip) { exitFlip(); return; }
    const wins = A.wm.windows.filter((w) => w.taskbar && !w.closed);
    if (!wins.length) { A.sound.play('ding'); A.notify({ title: 'Flip 3D', text: 'Open a few windows first, then try again.', icon: 'icons/aerium', sound: false }); return; }
    A.startmenu.close();
    const layer = A.wm.layer;
    const order = wins.slice().sort((a, b) => (parseInt(b.el.style.zIndex, 10) || 0) - (parseInt(a.el.style.zIndex, 10) || 0));
    const overlay = h('div.flip-overlay', { onclick: () => exitFlip() });
    layer.insertBefore(overlay, layer.firstChild);
    const hint = h('div.flip-hint', null, 'Scroll or use the arrow keys to flip. Click a window to open it. Esc to cancel.');
    document.getElementById('ae-overlays').appendChild(hint);
    flip = { order, overlay, hint, wasMin: order.filter((w) => w.state === 'minimized'), prevActive: A.wm.active };
    A.wm.flipping = true;
    document.documentElement.classList.add('flip3d');
    flip.wasMin.forEach((w) => { w.el.style.display = ''; w.el.classList.add('flip-min'); });
    A.sound.play('whooshIn');
    requestAnimationFrame(() => layoutFlip());
    layer.addEventListener('pointerdown', flipPick, true);
    window.addEventListener('wheel', flipWheel, { passive: false });
    window.addEventListener('keydown', flipKeys, true);
  };

  function layoutFlip() {
    if (!flip) return;
    const W = A.wm.layer.clientWidth, H = A.wm.layer.clientHeight;
    const n = flip.order.length;
    flip.order.forEach((w, i) => {
      const r = w.el.getBoundingClientRect();
      const rw = w.el.offsetWidth, rh = w.el.offsetHeight;
      const left = parseFloat(w.el.style.left) || 0, top = parseFloat(w.el.style.top) || 0;
      const s = Math.min(0.78, (W * 0.52) / rw, (H * 0.6) / rh);
      const cx = W * 0.42 + i * Math.min(92, W * 0.065);
      const cy = H * 0.56 - i * Math.min(52, H * 0.05);
      const dx = cx - (left + rw / 2), dy = cy - (top + rh / 2);
      w.el.style.transition = 'transform .42s cubic-bezier(.2,.75,.25,1), opacity .3s';
      w.el.style.transform = `translate3d(${dx}px, ${dy}px, ${-i * 160}px) rotateY(-30deg) scale(${s})`;
      w.el.style.zIndex = 5000 + (n - i);
      w.el.style.opacity = i > 7 ? '0' : '1';
      void r;
    });
  }
  function flipPick(e) {
    const winEl = e.target.closest('.win');
    if (!winEl) return;
    e.preventDefault();
    e.stopPropagation();
    const w = A.wm.get(winEl.dataset.win);
    exitFlip(w);
  }
  function rotate(dir) {
    if (!flip || flip.order.length < 2) return;
    if (dir > 0) flip.order.push(flip.order.shift());
    else flip.order.unshift(flip.order.pop());
    A.sound.play('card');
    layoutFlip();
  }
  let wheelLock = 0;
  function flipWheel(e) {
    e.preventDefault();
    const t = performance.now();
    if (t - wheelLock < 120) return;
    wheelLock = t;
    rotate(e.deltaY > 0 ? 1 : -1);
  }
  function flipKeys(e) {
    if (!flip) return;
    if (e.key === 'Escape') { e.preventDefault(); exitFlip(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Tab') { e.preventDefault(); rotate(1); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); rotate(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); exitFlip(flip.order[0]); }
  }
  function exitFlip(chosen) {
    if (!flip) return;
    const f = flip;
    flip = null;
    A.wm.layer.removeEventListener('pointerdown', flipPick, true);
    window.removeEventListener('wheel', flipWheel);
    window.removeEventListener('keydown', flipKeys, true);
    f.hint.remove();
    f.overlay.classList.add('out');
    A.sound.play('whooshOut');
    // Keep stacking order until the transforms have unwound.
    f.order.forEach((w) => { w.el.style.transform = ''; w.el.style.opacity = ''; });
    setTimeout(() => {
      f.overlay.remove();
      document.documentElement.classList.remove('flip3d');
      A.wm.flipping = false;
      f.order.forEach((w, i) => { w.el.style.transition = ''; w.el.style.zIndex = 10 + (f.order.length - i); });
      A.wm.z = Math.max(A.wm.z, 10 + f.order.length + 1);
      f.wasMin.forEach((w) => { w.el.classList.remove('flip-min'); if (w !== chosen) w.el.style.display = 'none'; });
      const target = chosen || f.prevActive || f.order[0];
      if (target && !target.closed) {
        if (target.state === 'minimized') { target.el.style.display = 'none'; target.restore(); }
        else { target.el.style.zIndex = ++A.wm.z; target.focus(); }
      }
    }, 430);
  }

  // ------------------------------------------------------------ mouse trails
  let trails = null;
  function setTrails(on) {
    if (on && !trails) {
      const ghosts = [];
      for (let i = 0; i < 7; i++) {
        const g = h('div.ae-trail', { style: { opacity: (0.55 - i * 0.07).toFixed(2) } });
        document.getElementById('ae-overlays').appendChild(g);
        ghosts.push(g);
      }
      const pts = [];
      let raf = null, idle = 0;
      const move = (e) => { pts.unshift([e.clientX, e.clientY]); pts.length = 8; idle = 0; if (!raf) raf = requestAnimationFrame(step); };
      const step = () => {
        raf = null;
        ghosts.forEach((g, i) => {
          const p = pts[i + 1] || pts[0];
          if (!p) return;
          g.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
          g.style.display = idle > 6 ? 'none' : 'block';
        });
        idle++;
        if (idle < 10) { pts.unshift(pts[0]); pts.length = 8; raf = requestAnimationFrame(step); }
      };
      window.addEventListener('pointermove', move, true);
      trails = { ghosts, move };
    } else if (!on && trails) {
      window.removeEventListener('pointermove', trails.move, true);
      trails.ghosts.forEach((g) => g.remove());
      trails = null;
    }
  }
  effects.setTrails = setTrails;

  // ------------------------------------------------------------ shortcuts
  function keys() {
    let metaAlone = false;
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let kpos = 0;
    window.addEventListener('keydown', (e) => {
      if (!A.shellReady) return;
      if (e.key === 'Meta' || e.key === 'OS') { metaAlone = true; return; }
      metaAlone = false;
      if (e.ctrlKey && e.shiftKey && e.key === 'Escape') { e.preventDefault(); A.apps.launch('taskmgr'); return; }
      if (e.ctrlKey && !e.shiftKey && e.key === 'Escape') { e.preventDefault(); A.startmenu.toggle(); return; }
      if (e.key === 'F1' && !e.ctrlKey) { e.preventDefault(); A.apps.launch('help'); return; }
      if (e.altKey && e.key === 'F4' && A.wm.active) { e.preventDefault(); A.wm.active.close(); return; }
      if (e.ctrlKey && e.altKey && (e.key === 'ArrowUp' || e.key === 'f')) { e.preventDefault(); effects.flip3d(); return; }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === konami[kpos]) { kpos++; if (kpos === konami.length) { kpos = 0; fishParty(); } }
      else kpos = k === konami[0] ? 1 : 0;
    });
    window.addEventListener('keyup', (e) => {
      if ((e.key === 'Meta' || e.key === 'OS') && metaAlone && A.shellReady) A.startmenu.toggle();
      metaAlone = false;
    });
  }

  function fishParty() {
    A.sound.play('win');
    A.notify({ title: 'Cheat activated', text: 'Fish party! Everybody into the tank.', icon: 'icons/aquarium', sound: false });
    if (A.store.get('wallpaper') !== 'aquarium') A.theme.setWallpaper('aquarium');
    setTimeout(() => { const c = A.theme.wallpaperController(); c && c.party && c.party(); }, 300);
  }
  effects.fishParty = fishParty;

  // Keep the browser's own shortcuts and menus from breaking the illusion.
  function guards() {
    window.addEventListener('keydown', (e) => {
      if (!A.shellReady || e.defaultPrevented) return;
      const k = e.key.toLowerCase();
      if (e.key === 'F5' && !e.ctrlKey) {
        e.preventDefault();
        if (!A.wm.active) A.desktop.refresh();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (k === 's' || k === 'o' || k === 'p' || k === 'g')) {
        e.preventDefault();
      }
    });
    window.addEventListener('contextmenu', (e) => {
      if (e.defaultPrevented) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return;
      e.preventDefault();
    });
  }

  // The family computer was never quite quiet: now and then a balloon pops up
  // from the tray. Three per session at most, spaced well apart.
  const AMBIENT = [
    { icon: 'icons/sync', title: 'Aerium installed 3 updates', text: 'Your fish now blow slightly rounder bubbles.' },
    { hardware: true },
    { icon: 'icons/shield', title: 'Your computer might be at risk', text: 'Aerium Defender would like a quick checkup. Click this balloon to fix it.', onClick: () => A.apps.launch('controlpanel', { page: 'security' }) },
    { icon: 'icons/trash', title: 'Disk Cleanup', text: 'You can free up 4 KB on Local Disk (C:). Click here to see what can be removed.', onClick: () => A.apps.launch('explorer', { path: A.fs.RECYCLE }) },
    { icon: 'icons/personalize', title: 'Make it yours', text: 'Right-click the desktop and choose Personalize to change the color of your glass.', onClick: () => A.apps.launch('personalize') },
    { icon: 'icons/droplet', title: 'Hydration check', text: 'This is your computer reminding you to drink a glass of water.' },
  ];
  const DEVICES = ['Wireless Fish Tank Thermometer', 'USB Bubble Machine', 'Glossy Optical Mouse', 'AquaCam 2000 Webcam', 'Pocket Music Player', 'Lava Lamp (USB)'];
  let ambientT = null, ambientCount = 0, ambientDeck = [];

  function hardwareBalloon() {
    const dev = pick(DEVICES);
    const first = A.notify({ title: 'Installing device driver software', text: dev, icon: 'icons/computer', timeout: 0 });
    setTimeout(() => {
      first.close();
      A.notify({ title: 'Device driver software installed successfully', text: dev + ' is ready to use.', icon: 'icons/check', sound: false });
    }, 4200);
  }
  function scheduleAmbient(ms) {
    clearTimeout(ambientT);
    ambientT = setTimeout(ambientTick, ms);
  }
  function ambientTick() {
    if (!A.shellReady || ambientCount >= 3) return;
    if (document.hidden || A.screensaver.active || A.boot.onScreen() || document.querySelector('.ae-note')) return scheduleAmbient(60000);
    if (!ambientDeck.length) ambientDeck = shuffle(AMBIENT.slice());
    const item = ambientDeck.pop();
    ambientCount++;
    if (item.hardware) hardwareBalloon();
    else A.notify(item);
    scheduleAmbient(rand(9, 15) * 60000);
  }
  effects.ambientTick = ambientTick;

  effects.init = function () {
    keys();
    guards();
    setTrails(A.store.get('cursor.trails'));
    A.bus.on('store:cursor.trails', setTrails);
    A.bus.on('shell:start', () => { if (!ambientT) scheduleAmbient(rand(3, 5) * 60000); });
    A.bus.on('shell:stop', () => { clearTimeout(ambientT); ambientT = null; });
  };

  A.effects = effects;
})();
