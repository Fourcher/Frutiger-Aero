/* Desktop Gadgets: glossy mini-programs that float on the desktop (clock,
   calendar, weather, CPU meter and friends) and the Gadget Gallery that adds
   them. Implements Aerium.gadgets = { init, start, stop, gallery, add }.
   Every gadget shares one animation loop, and all motion stops in stop(). */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp, pad2 } = A.util;

  const STORE_KEY = 'gadgets';
  const EDGE = 14;          // margin from the screen edges
  const GAP = 12;           // space between stacked gadgets
  const COLUMN = 156;       // width of the classic sidebar column
  const DEFS = new Map();   // id -> gadget definition
  const MONTHS = A.util.MONTHS, DAYS = A.util.DAYS;

  // ------------------------------------------------------------ helpers
  function node(markup) {
    const t = document.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstElementChild;
  }
  const esc = A.util.escapeHTML;
  const n1 = (v) => Math.round(v * 10) / 10;
  function polar(cx, cy, r, deg) {
    const a = ((deg - 90) * Math.PI) / 180;
    return [n1(cx + r * Math.cos(a)), n1(cy + r * Math.sin(a))];
  }
  function arc(cx, cy, r, a0, a1) {
    const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
    return `M${p0[0]} ${p0[1]}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1[0]} ${p1[1]}`;
  }
  function hash(str) {
    let x = 2166136261;
    for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  const dayKey = (d = new Date()) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const uid = (p) => A.util.uid(p || 'gd');
  function sfx(name) { try { A.sound.play(name); } catch (e) { /* audio is optional */ } }
  function optRow(label, control) { return h('label.gd-opt-row', null, h('span.gd-opt-label', null, label), control); }
  function stopClick(fn) { return (e) => { e.stopPropagation(); fn(e); }; }

  // Pictures anywhere under /Pictures, as { path, name, url }.
  function pictures(dir = '/Pictures', out = [], depth = 0) {
    if (depth > 5) return out;
    for (const it of A.fs.list(dir)) {
      if (it.type === 'folder') pictures(it.path, out, depth + 1);
      else {
        const url = A.fs.thumbFor(it.path);
        if (url) out.push({ path: it.path, name: A.fs.stem(it.path), url });
      }
    }
    return out;
  }

  const GLYPH = {
    close: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.3 3.3l5.4 5.4M8.7 3.3L3.3 8.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    larger: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9l6-6M5.2 2.7h4.1v4.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    smaller: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M9 3L3 9M2.7 5.2v4.1h4.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    wrench: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M8.7 1.2a2.8 2.8 0 0 0-2.7 3.6L1.5 9.3a.95.95 0 0 0 1.3 1.3l4.5-4.5a2.8 2.8 0 0 0 3.6-2.7L9.4 4.9 7.9 4.1 7.1 2.6z" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.6 2.6L4.2 6l3.4 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.4 2.6L7.8 6 4.4 9.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.4v7.2L9.6 6z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="2.6" width="2.2" height="6.8" rx=".6" fill="currentColor"/><rect x="6.8" y="2.6" width="2.2" height="6.8" rx=".6" fill="currentColor"/></svg>',
    view: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.2V2h2.2M7.8 2H10v2.2M10 7.8V10H7.8M4.2 10H2V7.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    shuffle: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M9.8 4.6A4 4 0 0 0 2.6 4M2.2 7.4A4 4 0 0 0 9.4 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10.2 1.8v3h-3M1.8 10.2v-3h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    eye: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6s1.8-3.4 5-3.4S11 6 11 6 9.2 9.4 6 9.4 1 6 1 6z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6" r="1.7" fill="currentColor"/></svg>',
    swap: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 1.8v8.4M1.8 4 4 1.8 6.2 4M8 10.2V1.8M5.8 8 8 10.2 10.2 8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    refresh: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M10 6a4 4 0 1 1-1.2-2.9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9.4 1.4v2.4H7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const glyph = (name) => node(GLYPH[name]);

  function define(def) { DEFS.set(def.id, def); }

  // ------------------------------------------------------------ state
  let layer = null, inited = false, started = false;
  let state = null;           // { v, seq, items: [{ k, id, x|rx, ax, y, large, op, o }] }
  const live = new Map();     // key -> record { item, def, el, body, inst, x, y, w, h }
  let zTop = 1;
  const pauses = new Set();
  let flyout = null;

  function persist() {
    if (!state) return;
    try { A.store.set(STORE_KEY, state); } catch (e) { /* storage full: gadgets still work */ }
  }
  const persistSoon = A.util.debounce(persist, 300);

  function loadState() {
    let s = null;
    try { s = A.store.get(STORE_KEY); } catch (e) { s = null; }
    if (!s || typeof s !== 'object' || !Array.isArray(s.items)) return null;
    s.items = s.items.filter((it) => it && it.k && DEFS.has(it.id));
    s.items.forEach((it) => {
      const def = DEFS.get(it.id);
      it.o = Object.assign(def.defaults ? def.defaults() : {}, it.o || {});
    });
    s.seq = s.seq || s.items.length;
    return s;
  }

  function newItem(id) {
    const def = DEFS.get(id);
    state.seq = (state.seq || 0) + 1;
    return { k: 'g' + state.seq + Math.random().toString(36).slice(2, 6), id, large: false, op: 100, o: def.defaults ? def.defaults() : {} };
  }

  // First run: clock, weather and the CPU meter along the right edge, like the old sidebar.
  function firstRun() {
    state = { v: 1, seq: 0, items: [] };
    let y = EDGE + 4;
    ['clock', 'weather', 'cpu'].forEach((id) => {
      const it = newItem(id);
      const [w, hh] = DEFS.get(id).size(it.o, false);
      Object.assign(it, { ax: 'r', rx: EDGE + Math.round((COLUMN - w) / 2), y });
      y += hh + GAP + 6;
      state.items.push(it);
    });
    persist();
  }

  function area() {
    const W = (layer && layer.clientWidth) || window.innerWidth;
    const H = (layer && layer.clientHeight) || window.innerHeight - 40;
    return { W, H };
  }

  // A free spot for a new gadget: stack down columns from the right edge.
  function freeSpot(w, hh) {
    const { W, H } = area();
    const rects = Array.from(live.values()).map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
    for (let col = 0; col < 8; col++) {
      const x = Math.round(W - EDGE - col * (COLUMN + 16) - (COLUMN + w) / 2);
      if (x < 110) break;
      for (let y = EDGE + 4; y + hh <= H - EDGE;) {
        const hit = rects.find((r) => x < r.x + r.w + 8 && x + w + 8 > r.x && y < r.y + r.h + 8 && y + hh + 8 > r.y);
        if (!hit) return { x, y };
        y = hit.y + hit.h + GAP + 6;
      }
    }
    return { x: Math.round((W - w) / 2 + A.util.rand(-40, 40)), y: Math.round((H - hh) / 3 + A.util.rand(-30, 30)) };
  }

  // ------------------------------------------------------------ shared loop
  // One loop for every gadget: requestAnimationFrame (capped near 30 fps)
  // while something moves, otherwise a slow timer for clocks and dates.
  let loopId = 0, loopRaf = false, lastT = 0;
  function wantsFrames() {
    for (const r of live.values()) {
      const f = r.inst && r.inst.frames;
      if (f && (typeof f === 'function' ? f() : true)) return true;
    }
    return false;
  }
  function schedule() {
    if (loopId || !started || pauses.size) return;
    loopRaf = wantsFrames();
    loopId = loopRaf ? requestAnimationFrame(frame) : setTimeout(() => frame(performance.now()), 400);
  }
  function frame(now) {
    loopId = 0;
    if (!started || pauses.size) return;
    if (loopRaf && now - lastT < 28) { schedule(); return; }
    lastT = now;
    for (const r of live.values()) {
      if (!r.inst || !r.inst.tick) continue;
      try { r.inst.tick(now); } catch (e) { console.error('[Aerium] gadget tick failed', r.def.id, e); r.inst.tick = null; }
    }
    schedule();
  }
  function stopLoop() {
    if (!loopId) return;
    if (loopRaf) cancelAnimationFrame(loopId); else clearTimeout(loopId);
    loopId = 0;
  }
  function kick() { stopLoop(); schedule(); }
  function setPause(reason, on) {
    const was = pauses.size > 0;
    if (on) pauses.add(reason); else pauses.delete(reason);
    const now = pauses.size > 0;
    if (layer) layer.classList.toggle('gd-paused', now);
    if (was === now) return;
    live.forEach((r) => { try { r.inst && r.inst[now ? 'pause' : 'resume'] && r.inst[now ? 'pause' : 'resume'](); } catch (e) { /* ignore */ } });
    if (now) stopLoop(); else kick();
  }

  // ------------------------------------------------------------ gadget host
  function mount(item, animate) {
    const def = DEFS.get(item.id);
    const rec = { item, def, inst: null, x: 0, y: 0, w: 100, h: 100 };
    rec.body = h('div.gd-body');
    rec.el = h('div.gd-gadget', {
      class: ['gd-g-' + def.id, animate && 'gd-enter'],
      dataset: { key: item.k, gadget: def.id },
      style: { '--gd-op': String((item.op || 100) / 100), zIndex: ++zTop },
      role: 'group',
      'aria-label': def.name + ' gadget',
    }, rec.body, buildTools(rec));
    layer.appendChild(rec.el);
    live.set(item.k, rec);
    build(rec);
    place(rec);
    bindGadget(rec);
    if (animate) setTimeout(() => rec.el.classList.remove('gd-enter'), 700);
    kick();
    return rec;
  }

  function build(rec) {
    destroyInst(rec);
    rec.body.replaceChildren();
    rec.body.className = 'gd-body';
    const large = !!(rec.def.sizeable && rec.item.large);
    const [w, hh] = rec.def.size(rec.item.o, large);
    rec.w = w; rec.h = hh;
    rec.body.style.width = w + 'px';
    rec.body.style.height = hh + 'px';
    rec.el.classList.toggle('gd-large', large);
    const ctx = { rec, body: rec.body, el: rec.el, o: rec.item.o, large, save: persistSoon, kick };
    try { rec.inst = rec.def.create(ctx) || {}; } catch (e) { console.error('[Aerium] gadget failed to start', rec.def.id, e); rec.inst = {}; }
    if (pauses.size && rec.inst.pause) rec.inst.pause();
    updateTools(rec);
  }

  function destroyInst(rec) {
    if (!rec.inst) return;
    try { rec.inst.destroy && rec.inst.destroy(); } catch (e) { console.error(e); }
    rec.inst = null;
  }

  function place(rec) {
    const { W, H } = area();
    const it = rec.item;
    let x = it.ax === 'r' ? W - (it.rx || 0) - rec.w : (it.x || 0);
    x = clamp(x, 0, Math.max(0, W - rec.w));
    const y = clamp(it.y || 0, 0, Math.max(0, H - rec.h));
    rec.x = x; rec.y = y;
    rec.el.style.left = Math.round(x) + 'px';
    rec.el.style.top = Math.round(y) + 'px';
    rec.el.classList.toggle('gd-tools-left', x + rec.w + 30 > W);
  }

  // Remember the position against the nearest side, so the sidebar stays put when the screen resizes.
  function anchor(rec) {
    const { W } = area();
    const it = rec.item;
    it.y = Math.round(rec.y);
    if (rec.x + rec.w / 2 > W / 2) { it.ax = 'r'; it.rx = Math.round(W - rec.x - rec.w); delete it.x; }
    else { it.ax = 'l'; it.x = Math.round(rec.x); delete it.rx; }
  }

  function buildTools(rec) {
    const tool = (cls, label, g, fn) => h('button.gd-t-btn', { type: 'button', class: cls, 'aria-label': label, 'data-tip': label, onclick: stopClick(fn) }, glyph(g));
    rec.tClose = tool('gd-t-close', 'Close', 'close', () => removeGadget(rec));
    rec.tSize = tool('gd-t-size', 'Larger size', 'larger', () => setLarge(rec, !rec.item.large));
    rec.tOpts = tool('gd-t-opts', 'Options', 'wrench', () => openOptions(rec));
    const grip = h('div.gd-t-grip', { 'data-tip': 'Drag gadget', 'aria-hidden': 'true' });
    return h('div.gd-tools', null, h('div.gd-strip', null, rec.tClose, rec.tSize, rec.tOpts, grip));
  }

  function updateTools(rec) {
    rec.tSize.hidden = !rec.def.sizeable;
    rec.tOpts.hidden = !rec.def.options;
    const larger = !rec.item.large;
    const label = larger ? 'Larger size' : 'Smaller size';
    rec.tSize.setAttribute('aria-label', label);
    rec.tSize.dataset.tip = label;
    rec.tSize.replaceChildren(glyph(larger ? 'larger' : 'smaller'));
  }

  function bindGadget(rec) {
    const el = rec.el;
    let start = null;
    el.addEventListener('pointerdown', () => { if (el.style.zIndex != zTop) el.style.zIndex = ++zTop; }, true);
    A.util.drag(el, {
      threshold: 4,
      filter: (e) => !(e.target.closest && e.target.closest('input, select, textarea, .gd-t-btn, .gd-nodrag')),
      onStart: () => {
        start = { x: rec.x, y: rec.y };
        el.classList.add('gd-dragging');
        closeFlyout();
      },
      onMove: (e, dx, dy) => {
        const { W, H } = area();
        rec.x = clamp(start.x + dx, 0, Math.max(0, W - rec.w));
        rec.y = clamp(start.y + dy, 0, Math.max(0, H - rec.h));
        el.style.left = Math.round(rec.x) + 'px';
        el.style.top = Math.round(rec.y) + 'px';
      },
      onEnd: (e, moved) => {
        el.classList.remove('gd-dragging');
        if (!moved) return;
        const { W, H } = area();
        // A gentle snap to the screen edges.
        if (W - (rec.x + rec.w) < EDGE + 10) rec.x = W - rec.w - EDGE;
        if (rec.x < EDGE + 10 && rec.x > 0) rec.x = EDGE;
        if (rec.y < EDGE + 10) rec.y = EDGE;
        if (H - (rec.y + rec.h) < EDGE + 10) rec.y = H - rec.h - EDGE;
        anchor(rec);
        place(rec);
        persistSoon();
        // Swallow the click that follows a drag so the gadget does not react to it.
        const kill = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        el.addEventListener('click', kill, true);
        setTimeout(() => el.removeEventListener('click', kill, true), 0);
        A.bus.emit('gadgets:drag');
      },
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      gadgetMenu(rec, e.clientX, e.clientY);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' && e.target === el) removeGadget(rec);
    });
  }

  function gadgetMenu(rec, x, y) {
    const op = rec.item.op || 100;
    A.ui.menu([
      { label: 'Add gadgets...', icon: 'icons/gadgets', onClick: () => gadgets.gallery() },
      { separator: true },
      rec.def.sizeable && { label: rec.item.large ? 'Smaller size' : 'Larger size', onClick: () => setLarge(rec, !rec.item.large) },
      { label: 'Opacity', submenu: [20, 40, 60, 80, 100].map((p) => ({ label: p + '%', radio: true, checked: op === p, onClick: () => setOpacity(rec, p) })) },
      rec.def.options && { label: 'Options', onClick: () => openOptions(rec) },
      { separator: true },
      { label: 'Close gadget', onClick: () => removeGadget(rec) },
    ], x, y);
  }

  function setOpacity(rec, p) {
    rec.item.op = p;
    rec.el.style.setProperty('--gd-op', String(p / 100));
    persistSoon();
  }

  function setLarge(rec, large) {
    if (!rec.def.sizeable) return;
    closeFlyout();
    rec.item.large = !!large;
    build(rec);
    place(rec);
    anchor(rec);
    persistSoon();
    sfx('click');
    kick();
  }

  function removeGadget(rec) {
    if (!live.has(rec.item.k)) return;
    closeFlyout();
    live.delete(rec.item.k);
    if (state) state.items = state.items.filter((it) => it !== rec.item);
    persistSoon();
    destroyInst(rec);
    rec.el.classList.add('gd-leave');
    setTimeout(() => rec.el.remove(), 260);
    sfx('click');
    kick();
    A.bus.emit('gadgets:change');
  }

  function closeFlyout() {
    if (!flyout) return;
    const f = flyout;
    flyout = null;
    f.close();
  }

  // Options open in a small glossy flyout beside the gadget. Changes apply on OK.
  function openOptions(rec) {
    if (!rec.def.options) return;
    closeFlyout();
    const draft = clone(rec.item.o);
    let content;
    try { content = rec.def.options(draft, { rec, large: rec.item.large }); } catch (e) { console.error(e); return; }
    const apply = () => {
      rec.item.o = draft;
      build(rec);
      place(rec);
      persistSoon();
      closeFlyout();
      kick();
    };
    const panel = h('div.gd-opt', { role: 'dialog', 'aria-label': rec.def.name + ' options' },
      h('div.gd-opt-title', null, rec.def.name + ' options'),
      content,
      h('div.gd-opt-foot', null,
        A.ui.button('OK', { tone: 'aqua', size: 'sm', onClick: apply }),
        A.ui.button('Cancel', { size: 'sm', onClick: closeFlyout })));
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); apply(); }
    });
    const f = A.ui.flyout(rec.el, panel, { className: 'gd-flyout', onClose: () => { if (flyout === f) flyout = null; } });
    flyout = f;
    // Beside the gadget, on the side with more room.
    const r = rec.el.getBoundingClientRect();
    const w = f.el.offsetWidth, hh = f.el.offsetHeight;
    let left = r.left + r.width / 2 > window.innerWidth / 2 ? r.left - w - 12 : r.right + 34;
    left = clamp(left, 6, window.innerWidth - w - 6);
    f.el.style.left = left + 'px';
    f.el.style.top = clamp(r.top, 6, window.innerHeight - hh - 6) + 'px';
    sfx('click');
  }

  // ============================================================ Clock
  const FACES = [['aqua', 'Aqua'], ['pearl', 'Pearl'], ['night', 'Night'], ['meadow', 'Meadow'], ['chrome', 'Chrome']];
  const ZONES = [
    ['local', 'Current computer time', null],
    ['Pacific/Honolulu', 'Honolulu', -600],
    ['America/Anchorage', 'Anchorage', -540],
    ['America/Los_Angeles', 'Los Angeles, Vancouver', -480],
    ['America/Denver', 'Denver', -420],
    ['America/Chicago', 'Chicago, Mexico City', -360],
    ['America/New_York', 'New York, Toronto', -300],
    ['America/Sao_Paulo', 'Rio de Janeiro, Sao Paulo', -180],
    ['Atlantic/Reykjavik', 'Reykjavik', 0],
    ['Europe/London', 'London, Dublin, Lisbon', 0],
    ['Europe/Paris', 'Paris, Berlin, Rome', 60],
    ['Africa/Johannesburg', 'Cape Town, Johannesburg', 120],
    ['Europe/Athens', 'Athens, Helsinki', 120],
    ['Asia/Dubai', 'Dubai', 240],
    ['Asia/Kolkata', 'Mumbai, New Delhi', 330],
    ['Asia/Bangkok', 'Bangkok, Jakarta', 420],
    ['Asia/Singapore', 'Singapore, Hong Kong', 480],
    ['Asia/Tokyo', 'Tokyo, Seoul', 540],
    ['Australia/Sydney', 'Sydney, Melbourne', 600],
    ['Pacific/Auckland', 'Auckland, Wellington', 720],
  ];
  const tzCache = new Map();
  // Minutes east of UTC for an IANA zone (daylight saving aware), or null for local time.
  function zoneOffset(tz) {
    if (!tz || tz === 'local') return null;
    const now = Date.now();
    const c = tzCache.get(tz);
    if (c && now - c.at < 60000) return c.off;
    let off;
    try {
      const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
      const p = {};
      f.formatToParts(new Date(now)).forEach((x) => { p[x.type] = x.value; });
      const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
      off = Math.round((asUTC - Math.floor(now / 1000) * 1000) / 60000);
    } catch (e) {
      const z = ZONES.find((zz) => zz[0] === tz);
      off = z ? z[2] : 0;
    }
    tzCache.set(tz, { at: now, off });
    return off;
  }
  // Wall-clock parts in a zone: { y, mo, d, dow, h, m, s, ms }.
  function zoneNow(tz) {
    const now = Date.now();
    const off = zoneOffset(tz);
    if (off == null) {
      const d = new Date(now);
      return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate(), dow: d.getDay(), h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), ms: d.getMilliseconds() };
    }
    const d = new Date(now + off * 60000);
    return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay(), h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(), ms: d.getUTCMilliseconds() };
  }
  function zoneLabel(z) {
    if (z[0] === 'local') return z[1];
    const off = zoneOffset(z[0]);
    const sign = off < 0 ? '-' : '+', a = Math.abs(off);
    return `(UTC${sign}${pad2(Math.floor(a / 60))}:${pad2(a % 60)}) ${z[1]}`;
  }
  function localZoneId() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (ZONES.some((z) => z[0] === tz)) return tz;
    } catch (e) { /* ignore */ }
    return null;
  }
  function themeFace() {
    const t = document.documentElement.dataset.theme;
    return t === 'dark' ? 'night' : t === 'technozen' ? 'pearl' : 'aqua';
  }

  // Each face returns its gradients, dial art, marks and hand colors. All art is original.
  const CLOCK_FACES = {
    aqua(u) {
      let marks = '';
      for (let i = 0; i < 60; i++) {
        const big = i % 5 === 0, [x0, y0] = polar(100, 100, 79, i * 6), [x1, y1] = polar(100, 100, big ? 68.5 : 75.5, i * 6);
        marks += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${big ? '#0a6fd1' : '#86b3da'}" stroke-width="${big ? 3.2 : 1.1}" stroke-linecap="round"/>`;
      }
      [12, 3, 6, 9].forEach((n) => { const [x, y] = polar(100, 100, 56, n * 30); marks += `<text x="${x}" y="${y + 1}" class="gd-f-light" font-size="21" fill="#0a6fd1" text-anchor="middle" dominant-baseline="central">${n}</text>`; });
      return {
        defs: `<linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4fcff"/><stop offset=".44" stop-color="#8fd3ff"/><stop offset=".5" stop-color="#2f9ae8"/><stop offset="1" stop-color="#0b4d93"/></linearGradient>
          <radialGradient id="${u}f" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#ffffff"/><stop offset=".72" stop-color="#eef8ff"/><stop offset="1" stop-color="#b8dcf6"/></radialGradient>
          <radialGradient id="${u}b" cx=".5" cy="1" r=".55"><stop offset="0" stop-color="#c8f6ff" stop-opacity=".95"/><stop offset="1" stop-color="#c8f6ff" stop-opacity="0"/></radialGradient>`,
        dial: `<circle cx="100" cy="100" r="95" fill="url(#${u}r)"/><circle cx="100" cy="100" r="95" fill="url(#${u}b)"/><circle cx="100" cy="100" r="95" fill="none" stroke="#0b3d73" stroke-opacity=".55"/>
          <circle cx="100" cy="100" r="86" fill="#0b3d73" opacity=".55"/><circle cx="100" cy="100" r="84.6" fill="url(#${u}f)"/>`,
        marks,
        label: { y: 137, fill: '#3f7fb8', cls: 'gd-f-aero', size: 12 },
        hand: '#12324f', sec: '#ff5a3c', capA: '#ffffff', capB: '#3aa6f5', capEdge: '#0a4f9c', gloss: 0.8,
      };
    },
    pearl(u) {
      let marks = '';
      for (let i = 0; i < 12; i++) { const big = i % 3 === 0, [x, y] = polar(100, 100, 73, i * 30); marks += `<circle cx="${x}" cy="${y}" r="${big ? 4.8 : 3}" fill="${big ? '#7d8e9d' : '#b5c1cc'}"/>`; }
      return {
        defs: `<linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef2f6"/><stop offset="1" stop-color="#cfd8e0"/></linearGradient>
          <radialGradient id="${u}f" cx=".5" cy=".4" r=".65"><stop offset="0" stop-color="#ffffff"/><stop offset=".8" stop-color="#f7f9fb"/><stop offset="1" stop-color="#e3e9ee"/></radialGradient>`,
        dial: `<circle cx="100" cy="100" r="95" fill="url(#${u}r)" stroke="#aebbc6"/><circle cx="100" cy="100" r="86" fill="#c7d1da"/><circle cx="100" cy="100" r="85" fill="url(#${u}f)"/>`,
        marks,
        label: { y: 138, fill: '#8594a1', cls: 'gd-f-zen', size: 13 },
        hand: '#5f6d79', sec: '#4aaef2', capA: '#ffffff', capB: '#c9d3dc', capEdge: '#9aa9b7', gloss: 0.55,
      };
    },
    night(u) {
      let marks = '';
      for (let i = 0; i < 60; i++) {
        if (i % 5 === 0) {
          const [x0, y0] = polar(100, 100, 79, i * 6), [x1, y1] = polar(100, 100, 69, i * 6);
          marks += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#2aceda" stroke-opacity=".3" stroke-width="7" stroke-linecap="round"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#9ff3ff" stroke-width="2.6" stroke-linecap="round"/>`;
        } else { const [x, y] = polar(100, 100, 77, i * 6); marks += `<circle cx="${x}" cy="${y}" r="1" fill="#6f8fb8"/>`; }
      }
      return {
        defs: `<linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a8fc8"/><stop offset=".45" stop-color="#1a3357"/><stop offset=".55" stop-color="#0a1732"/><stop offset="1" stop-color="#030a1f"/></linearGradient>
          <radialGradient id="${u}f" cx=".5" cy=".4" r=".65"><stop offset="0" stop-color="#143e70"/><stop offset=".7" stop-color="#081a3a"/><stop offset="1" stop-color="#040c1f"/></radialGradient>
          <radialGradient id="${u}a" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3ee6a0" stop-opacity=".75"/><stop offset=".6" stop-color="#2aceda" stop-opacity=".25"/><stop offset="1" stop-color="#2aceda" stop-opacity="0"/></radialGradient>
          <clipPath id="${u}c"><circle cx="100" cy="100" r="85"/></clipPath>`,
        dial: `<circle cx="100" cy="100" r="95" fill="url(#${u}r)"/><circle cx="100" cy="100" r="88.5" fill="none" stroke="#2aceda" stroke-opacity=".7" stroke-width="1.4"/>
          <circle cx="100" cy="100" r="85" fill="url(#${u}f)"/><ellipse cx="100" cy="162" rx="80" ry="36" fill="url(#${u}a)" clip-path="url(#${u}c)"/>`,
        marks,
        label: { y: 137, fill: '#8fd3ff', cls: 'gd-f-aero', size: 12 },
        hand: '#e6f3ff', glow: '#7fe6ff', sec: '#3ee6a0', capA: '#dff4ff', capB: '#1a86e0', capEdge: '#0b3d73', gloss: 0.35,
      };
    },
    meadow(u) {
      let marks = '';
      for (let i = 0; i < 12; i++) { const big = i % 3 === 0, [x, y] = polar(100, 100, 75, i * 30); marks += `<circle cx="${x}" cy="${y}" r="${big ? 4.6 : 3.3}" fill="#fff" stroke="#0c5a1c" stroke-opacity=".35" stroke-width=".8"/>`; }
      return {
        defs: `<linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0ffe6"/><stop offset=".45" stop-color="#9ceb66"/><stop offset=".55" stop-color="#35c93a"/><stop offset="1" stop-color="#13701c"/></linearGradient>
          <linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f8fe6"/><stop offset=".55" stop-color="#7cc8ff"/><stop offset=".8" stop-color="#d4f0ff"/></linearGradient>
          <linearGradient id="${u}h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bdf384"/><stop offset="1" stop-color="#45c93a"/></linearGradient>
          <linearGradient id="${u}h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86de52"/><stop offset="1" stop-color="#1f9e2a"/></linearGradient>
          <radialGradient id="${u}sun" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffbe0"/><stop offset=".55" stop-color="#ffd62e"/><stop offset="1" stop-color="#f5a623"/></radialGradient>
          <clipPath id="${u}c"><circle cx="100" cy="100" r="85"/></clipPath>`,
        dial: `<circle cx="100" cy="100" r="95" fill="url(#${u}r)"/><circle cx="100" cy="100" r="86" fill="#157a1f" opacity=".5"/>
          <g clip-path="url(#${u}c)"><rect x="0" y="0" width="200" height="200" fill="url(#${u}s)"/>
          <circle cx="68" cy="66" r="24" fill="#fff6b0" opacity=".35"/><circle cx="68" cy="66" r="13" fill="url(#${u}sun)"/>
          <g fill="#fff" opacity=".92"><ellipse cx="128" cy="62" rx="15" ry="8"/><ellipse cx="139" cy="57" rx="10" ry="8"/><ellipse cx="119" cy="58" rx="8" ry="6"/></g>
          <path d="M0 146Q55 116 112 136T210 124V210H0Z" fill="url(#${u}h1)"/><path d="M-10 160Q66 134 128 156T214 146V210H-10Z" fill="url(#${u}h2)"/></g>`,
        marks,
        label: { y: 158, fill: '#ffffff', cls: 'gd-f-zen gd-f-outline', size: 13 },
        hand: '#ffffff', handEdge: '#1f6d25', sec: '#ffc21a', secTip: '<circle cx="100" cy="31" r="4.6" fill="#ffd62e" stroke="#f08a12" stroke-width=".9"/>',
        capA: '#fffbe0', capB: '#35c93a', capEdge: '#157a1f', gloss: 0.6,
      };
    },
    chrome(u) {
      let marks = '';
      for (let i = 0; i < 60; i++) {
        const big = i % 5 === 0, [x0, y0] = polar(100, 100, 80, i * 6), [x1, y1] = polar(100, 100, big ? 74 : 77.2, i * 6);
        marks += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#2a3540" stroke-width="${big ? 2.2 : 0.9}" stroke-linecap="round"/>`;
      }
      for (let n = 1; n <= 12; n++) { const [x, y] = polar(100, 100, 64, n * 30); marks += `<text x="${x}" y="${y + 0.5}" class="gd-f-y2k" font-size="10.5" fill="#2a3540" text-anchor="middle" dominant-baseline="central">${n}</text>`; }
      return {
        defs: `<linearGradient id="${u}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".18" stop-color="#aab4be"/><stop offset=".33" stop-color="#f4f6f8"/><stop offset=".5" stop-color="#7d8995"/><stop offset=".66" stop-color="#eef1f4"/><stop offset=".86" stop-color="#5f6b77"/><stop offset="1" stop-color="#d5dce2"/></linearGradient>
          <radialGradient id="${u}f" cx=".5" cy=".4" r=".65"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f1f4f7"/><stop offset="1" stop-color="#d9e0e6"/></radialGradient>`,
        dial: `<circle cx="100" cy="100" r="95" fill="url(#${u}r)" stroke="#56626f" stroke-opacity=".6"/><circle cx="100" cy="100" r="86" fill="#56626f" opacity=".6"/><circle cx="100" cy="100" r="84.6" fill="url(#${u}f)"/>`,
        marks,
        label: { y: 134, fill: '#6d7a86', cls: 'gd-f-y2k', size: 7.5, upper: true },
        hand: '#1e2a35', sec: '#0095b6', capA: '#ffffff', capB: '#8e9aa6', capEdge: '#56626f', gloss: 0.7,
      };
    },
  };

  const HAND_H = 'M100 50c2.6 0 4 3 4 6l1.2 47c0 5-10.4 5-10.4 0L96 56c0-3 1.4-6 4-6z';
  const HAND_M = 'M100 23c2 0 3 2.6 3 5.4l.9 76c0 4.4-7.8 4.4-7.8 0l.9-76c0-2.8 1-5.4 3-5.4z';
  const HAND_S = 'M99.35 124h1.3l-.25-102h-.8z';

  // Builds a clock face. `angles` poses the hands for still pictures.
  function clockSVG(face, u, o, angles) {
    const F = (CLOCK_FACES[face] || CLOCK_FACES.aqua)(u);
    const sec = o.seconds !== false;
    const rot = (k) => (angles ? ` transform="rotate(${angles[k]} 100 100)"` : '');
    const edge = F.handEdge ? ` stroke="${F.handEdge}" stroke-width="1.2"` : '';
    const glow = (d) => (F.glow ? `<path d="${d}" fill="none" stroke="${F.glow}" stroke-opacity=".38" stroke-width="4"/>` : '');
    let name = o.name ? esc(String(o.name).slice(0, 24)) : '';
    if (F.label.upper) name = name.toUpperCase();
    const label = name ? `<text x="100" y="${F.label.y}" class="${F.label.cls}" font-size="${F.label.size}" fill="${F.label.fill}" text-anchor="middle">${name}</text>` : '';
    return `<svg class="gd-clock-svg" viewBox="0 0 200 200" aria-hidden="true">
      <defs>${F.defs}
        <linearGradient id="${u}gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${F.gloss}"/><stop offset="1" stop-color="#fff" stop-opacity=".02"/></linearGradient>
        <radialGradient id="${u}cap" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${F.capA}"/><stop offset="1" stop-color="${F.capB}"/></radialGradient>
        <radialGradient id="${u}sh" cx=".5" cy=".5" r=".5"><stop offset=".82" stop-color="#001a33" stop-opacity=".34"/><stop offset="1" stop-color="#001a33" stop-opacity="0"/></radialGradient>
      </defs>
      <circle cx="100" cy="104" r="100" fill="url(#${u}sh)"/>
      ${F.dial}${F.marks}${label}
      <g transform="translate(2.2 3.4)" fill="#001428" opacity=".24">
        <g data-h="h"${rot('h')}><path d="${HAND_H}"/></g><g data-h="m"${rot('m')}><path d="${HAND_M}"/></g>
        ${sec ? `<g data-h="s"${rot('s')}><path d="${HAND_S}"/><circle cx="100" cy="113" r="3.6"/></g>` : ''}
      </g>
      <g data-h="h"${rot('h')}>${glow(HAND_H)}<path d="${HAND_H}" fill="${F.hand}"${edge}/></g>
      <g data-h="m"${rot('m')}>${glow(HAND_M)}<path d="${HAND_M}" fill="${F.hand}"${edge}/></g>
      ${sec ? `<g data-h="s"${rot('s')}><path d="${HAND_S}" fill="${F.sec}"/><circle cx="100" cy="113" r="3.6" fill="${F.sec}"/>${F.secTip || ''}</g>` : ''}
      <circle cx="100" cy="100" r="6.6" fill="url(#${u}cap)" stroke="${F.capEdge}" stroke-width=".8"/><circle cx="98.3" cy="97.9" r="2.2" fill="#fff" opacity=".85"/>
      <path d="M25 97a75 75 0 0 1 150 0c-28-18-122-18-150 0z" fill="url(#${u}gl)"/>
    </svg>`;
  }

  function clockAngles(t) {
    const s = t.s + t.ms / 1000;
    return { s: n1(s * 6), m: n1((t.m + s / 60) * 6), h: n1(((t.h % 12) + t.m / 60 + s / 3600) * 30) };
  }

  define({
    id: 'clock',
    name: 'Clock',
    version: '2.0.2007',
    desc: 'See the time at a glance, anywhere in the world. Choose from five glossy faces, give your clock a name and pick a time zone.',
    keywords: ['time', 'watch', 'analog', 'zone', 'world'],
    sizeable: true,
    size: (o, large) => (large ? [196, 196] : [130, 130]),
    defaults: () => ({ style: themeFace(), name: '', tz: 'local', seconds: true }),
    art: () => clockSVG('aqua', uid('gda'), { seconds: true }, { h: 304, m: 48, s: 180 }),
    options(d) {
      const preview = h('div.gd-opt-clock');
      const count = h('div.gd-opt-count');
      const idx = () => Math.max(0, FACES.findIndex((f) => f[0] === d.style));
      const render = () => {
        preview.innerHTML = clockSVG(d.style, uid('gdp'), d, clockAngles(zoneNow(d.tz)));
        count.textContent = `${idx() + 1} of ${FACES.length}: ${FACES[idx()][1]}`;
      };
      const cycle = (dir) => { d.style = FACES[(idx() + dir + FACES.length) % FACES.length][0]; render(); sfx('click'); };
      const arrow = (dir, label) => h('button.gd-opt-arrow', { type: 'button', 'aria-label': label, 'data-tip': label, onclick: () => cycle(dir) }, glyph(dir < 0 ? 'prev' : 'next'));
      const name = A.ui.textField({ value: d.name, placeholder: 'Give your clock a name', maxLength: 24, onInput: (v) => { d.name = v; render(); } });
      const tz = A.ui.select({ options: ZONES.map((z) => [z[0], zoneLabel(z)]), value: d.tz, onChange: (v) => { d.tz = v; render(); } });
      const secs = A.ui.checkbox({ label: 'Show the second hand', checked: d.seconds !== false, onChange: (v) => { d.seconds = v; render(); } });
      render();
      return h('div.gd-opt-body', null, h('div.gd-opt-faces', null, arrow(-1, 'Previous clock'), preview, arrow(1, 'Next clock')), count,
        optRow('Clock name', name), optRow('Time zone', tz), secs);
    },
    create(ctx) {
      const u = uid('gdc');
      ctx.body.innerHTML = clockSVG(ctx.o.style, u, ctx.o);
      const svg = ctx.body.firstElementChild;
      const hands = { h: [], m: [], s: [] };
      svg.querySelectorAll('[data-h]').forEach((g) => hands[g.dataset.h].push(g));
      const last = { h: -1, m: -1, s: -1 };
      const tip = () => {
        const z = ZONES.find((zz) => zz[0] === ctx.o.tz);
        const t = zoneNow(ctx.o.tz);
        ctx.body.dataset.tip = (ctx.o.name ? ctx.o.name + ': ' : '') + A.util.fmtTime(new Date(t.y, t.mo, t.d, t.h, t.m)) + (z && z[0] !== 'local' ? ' in ' + z[1].split(',')[0] : '');
      };
      function tick() {
        const a = clockAngles(zoneNow(ctx.o.tz));
        for (const k of ['h', 'm', 's']) {
          if (Math.abs(a[k] - last[k]) < 0.05) continue;
          last[k] = a[k];
          const tr = `rotate(${a[k]} 100 100)`;
          for (const g of hands[k]) g.setAttribute('transform', tr);
        }
        if (a.m !== last.tipM) { last.tipM = a.m; tip(); }
      }
      tick();
      return { tick, frames: () => ctx.o.seconds !== false };
    },
  });

  // ============================================================ Calendar
  const SEASON = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
  function calendarArt() {
    const d = new Date();
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs>
      <linearGradient id="gdcal-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3ebf2"/></linearGradient>
      <linearGradient id="gdcal-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb18a"/><stop offset=".5" stop-color="#ff7a45"/><stop offset=".5" stop-color="#e8531f"/><stop offset="1" stop-color="#f27a3c"/></linearGradient>
      <radialGradient id="gdcal-s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b2a4a" stop-opacity=".32"/><stop offset="1" stop-color="#0b2a4a" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="32" cy="59.5" rx="22" ry="3" fill="url(#gdcal-s)"/>
      <rect x="9" y="8" width="46" height="49" rx="7" fill="url(#gdcal-p)" stroke="#8ea6bd"/>
      <path d="M9 15a7 7 0 0 1 7-7h32a7 7 0 0 1 7 7v7H9z" fill="url(#gdcal-b)"/>
      <rect x="18" y="4" width="4" height="9" rx="2" fill="#c7d2dc" stroke="#6d7a86" stroke-width=".8"/><rect x="42" y="4" width="4" height="9" rx="2" fill="#c7d2dc" stroke="#6d7a86" stroke-width=".8"/>
      <text x="32" y="45" font-size="21" class="gd-f-light" fill="#1e3a5a" text-anchor="middle">${d.getDate()}</text>
      <text x="32" y="53" font-size="5.5" class="gd-f-aero" fill="#5f7a93" text-anchor="middle">${DAYS[d.getDay()]}</text>
      <path d="M10 16a7 7 0 0 1 7-7h30a7 7 0 0 1 7 7v2c-12-3-32-3-44 0z" fill="#fff" opacity=".45"/></svg>`;
  }

  define({
    id: 'calendar',
    name: 'Calendar',
    version: '1.4.2007',
    desc: "Today's page, always on your desktop. Click the page to flip to the whole month, then pick any day to see it.",
    keywords: ['date', 'month', 'day', 'week', 'schedule'],
    sizeable: true,
    size: (o, large) => (large ? [274, 138] : [130, 138]),
    defaults: () => ({ weekStart: 0 }),
    art: calendarArt,
    options(d) {
      return h('div.gd-opt-body', null,
        optRow('Week starts on', A.ui.select({ options: [[0, 'Sunday'], [1, 'Monday']], value: d.weekStart, onChange: (v) => { d.weekStart = Number(v); } })));
    },
    create(ctx) {
      const o = ctx.o, large = ctx.large;
      const today0 = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
      let shown = today0();
      let month = new Date(shown.getFullYear(), shown.getMonth(), 1);
      let todayKey = dayKey();
      let lastCheck = 0;
      const dayFace = h('div.gd-cal-face.gd-cal-day');
      const monFace = h('div.gd-cal-face.gd-cal-mon');
      const card = h('div.gd-cal-card', null, dayFace, monFace);
      const root = h('div.gd-cal', { class: large ? 'gd-cal-large' : '' }, card);
      ctx.body.appendChild(root);

      function drawDay() {
        const d = shown, isToday = dayKey(d) === dayKey();
        dayFace.className = 'gd-cal-face gd-cal-day gd-cal-' + SEASON[d.getMonth()];
        dayFace.setAttribute('aria-label', A.util.fmtLongDate(d) + (large ? '' : '. Click to see the month.'));
        dayFace.dataset.tip = large ? A.util.fmtLongDate(d) : 'Click to see the month';
        dayFace.innerHTML = `<div class="gd-cal-rings"><i></i><i></i></div>
          <div class="gd-cal-band"><span>${MONTHS[d.getMonth()]}</span></div>
          <div class="gd-cal-num">${d.getDate()}</div>
          <div class="gd-cal-wd">${DAYS[d.getDay()]}</div>
          <div class="gd-cal-yr">${d.getFullYear()}</div>`;
        if (!isToday) dayFace.appendChild(h('button.gd-cal-today', { type: 'button', onclick: stopClick(goToday) }, 'Today'));
      }
      function drawMonth() {
        const y = month.getFullYear(), m = month.getMonth();
        const offset = (new Date(y, m, 1).getDay() - o.weekStart + 7) % 7;
        const title = large ? MONTHS[m] + ' ' + y : MONTHS[m].slice(0, 3) + ' ' + y;
        const head = h('div.gd-cal-mhead', null,
          h('button.gd-cal-arrow', { type: 'button', 'aria-label': 'Previous month', 'data-tip': 'Previous month', onclick: stopClick(() => { month = new Date(y, m - 1, 1); drawMonth(); sfx('click'); }) }, glyph('prev')),
          h('button.gd-cal-title', { type: 'button', 'data-tip': large ? 'Go to today' : 'Back to today', onclick: stopClick(goToday) }, title),
          h('button.gd-cal-arrow', { type: 'button', 'aria-label': 'Next month', 'data-tip': 'Next month', onclick: stopClick(() => { month = new Date(y, m + 1, 1); drawMonth(); sfx('click'); }) }, glyph('next')));
        const wds = h('div.gd-cal-wds');
        for (let i = 0; i < 7; i++) wds.appendChild(h('span', null, 'SMTWTFS'[(i + o.weekStart) % 7]));
        const grid = h('div.gd-cal-grid');
        const tk = dayKey(), sk = dayKey(shown);
        for (let i = 0; i < 42; i++) {
          const d = new Date(y, m, 1 - offset + i);
          const k = dayKey(d);
          grid.appendChild(h('button.gd-cal-d', {
            type: 'button',
            class: [d.getMonth() !== m && 'out', k === tk && 'today', k === sk && 'sel'],
            'aria-label': A.util.fmtLongDate(d),
            onclick: stopClick(() => pick(d)),
          }, String(d.getDate())));
        }
        monFace.replaceChildren(head, wds, grid);
      }
      function flip(on) {
        if (large) return;
        card.classList.toggle('flipped', on);
        sfx('card');
      }
      function pick(d) {
        shown = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        month = new Date(shown.getFullYear(), shown.getMonth(), 1);
        drawDay(); drawMonth();
        if (!large) flip(false); else sfx('click');
      }
      function goToday() { pick(today0()); }
      dayFace.addEventListener('click', () => {
        if (large) return;
        month = new Date(shown.getFullYear(), shown.getMonth(), 1);
        drawMonth();
        flip(true);
      });
      drawDay(); drawMonth();
      return {
        tick(now) {
          if (now - lastCheck < 5000) return;
          lastCheck = now;
          if (dayKey() === todayKey) return;
          // Past midnight: turn the page.
          const wasToday = dayKey(shown) === todayKey;
          todayKey = dayKey();
          if (wasToday) { shown = today0(); month = new Date(shown.getFullYear(), shown.getMonth(), 1); }
          drawDay(); drawMonth();
        },
      };
    },
  });

  // ============================================================ Weather
  // Fake but stable: the weather is seeded by city and date, and follows the
  // season, the latitude and the time of day in that city.
  const CITIES = [
    { id: 'seattle', name: 'Seattle', tz: 'America/Los_Angeles', off: -480, lat: 47.6, t: 11.5, sw: 7.5, r: 8, wet: 0.55 },
    { id: 'sanfrancisco', name: 'San Francisco', tz: 'America/Los_Angeles', off: -480, lat: 37.8, t: 14.5, sw: 3.5, r: 8, wet: 0.28, fog: 0.4 },
    { id: 'losangeles', name: 'Los Angeles', tz: 'America/Los_Angeles', off: -480, lat: 34, t: 18.5, sw: 4.5, r: 9, wet: 0.1 },
    { id: 'honolulu', name: 'Honolulu', tz: 'Pacific/Honolulu', off: -600, lat: 21.3, t: 25.5, sw: 2, r: 7, wet: 0.25 },
    { id: 'denver', name: 'Denver', tz: 'America/Denver', off: -420, lat: 39.7, t: 10.5, sw: 12, r: 14, wet: 0.25 },
    { id: 'chicago', name: 'Chicago', tz: 'America/Chicago', off: -360, lat: 41.9, t: 10.5, sw: 14, r: 9, wet: 0.38 },
    { id: 'newyork', name: 'New York', tz: 'America/New_York', off: -300, lat: 40.7, t: 13, sw: 12, r: 8, wet: 0.38 },
    { id: 'miami', name: 'Miami', tz: 'America/New_York', off: -300, lat: 25.8, t: 25, sw: 3.8, r: 7, wet: 0.42, storm: 0.5 },
    { id: 'toronto', name: 'Toronto', tz: 'America/Toronto', off: -300, lat: 43.7, t: 9, sw: 13.5, r: 9, wet: 0.38 },
    { id: 'vancouver', name: 'Vancouver', tz: 'America/Vancouver', off: -480, lat: 49.3, t: 10.5, sw: 7, r: 7, wet: 0.55 },
    { id: 'rio', name: 'Rio de Janeiro', tz: 'America/Sao_Paulo', off: -180, lat: -22.9, t: 24, sw: -3, r: 7, wet: 0.35, storm: 0.3 },
    { id: 'london', name: 'London', tz: 'Europe/London', off: 0, lat: 51.5, t: 11.5, sw: 7, r: 8, wet: 0.5 },
    { id: 'reykjavik', name: 'Reykjavik', tz: 'Atlantic/Reykjavik', off: 0, lat: 64.1, t: 5, sw: 6, r: 5, wet: 0.6 },
    { id: 'paris', name: 'Paris', tz: 'Europe/Paris', off: 60, lat: 48.9, t: 12.5, sw: 8, r: 9, wet: 0.42 },
    { id: 'berlin', name: 'Berlin', tz: 'Europe/Berlin', off: 60, lat: 52.5, t: 10, sw: 9.5, r: 9, wet: 0.42 },
    { id: 'rome', name: 'Rome', tz: 'Europe/Rome', off: 60, lat: 41.9, t: 16, sw: 8.5, r: 11, wet: 0.28 },
    { id: 'capetown', name: 'Cape Town', tz: 'Africa/Johannesburg', off: 120, lat: -33.9, t: 17, sw: -4.5, r: 9, wet: 0.3 },
    { id: 'dubai', name: 'Dubai', tz: 'Asia/Dubai', off: 240, lat: 25.2, t: 28.5, sw: 7.5, r: 10, wet: 0.03 },
    { id: 'singapore', name: 'Singapore', tz: 'Asia/Singapore', off: 480, lat: 1.35, t: 27.5, sw: 0.7, r: 7, wet: 0.55, storm: 0.45 },
    { id: 'hongkong', name: 'Hong Kong', tz: 'Asia/Hong_Kong', off: 480, lat: 22.3, t: 23.5, sw: 5.5, r: 5, wet: 0.45, storm: 0.3 },
    { id: 'tokyo', name: 'Tokyo', tz: 'Asia/Tokyo', off: 540, lat: 35.7, t: 16, sw: 10.5, r: 7, wet: 0.4 },
    { id: 'sydney', name: 'Sydney', tz: 'Australia/Sydney', off: 600, lat: -33.9, t: 18, sw: -5, r: 8, wet: 0.35 },
    { id: 'auckland', name: 'Auckland', tz: 'Pacific/Auckland', off: 720, lat: -36.8, t: 15.5, sw: -4, r: 7, wet: 0.45 },
  ];
  CITIES.forEach((c) => { if (!ZONES.some((z) => z[0] === c.tz)) ZONES.push([c.tz, c.name, c.off, true]); });
  const COND_TEXT = { sunny: 'Sunny', clear: 'Clear', partly: 'Partly cloudy', 'partly-night': 'Partly cloudy', cloudy: 'Cloudy', rain: 'Light rain', storm: 'Thunderstorms', snow: 'Snow showers', fog: 'Foggy' };
  const cityById = (id) => CITIES.find((c) => c.id === id) || CITIES[0];
  function defaultCity() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const c = CITIES.find((cc) => cc.tz === tz);
      if (c) return c.id;
      const off = -new Date().getTimezoneOffset();
      const near = CITIES.find((cc) => cc.off === off);
      if (near) return near.id;
    } catch (e) { /* ignore */ }
    return 'seattle';
  }
  const defaultUnit = () => (/^en-US|^en-LR|^my/i.test(navigator.language || '') ? 'F' : 'C');
  const toUnit = (c, unit) => (unit === 'F' ? c * 1.8 + 32 : c);

  function dayOfYear(y, mo, d) { return Math.floor((Date.UTC(y, mo, d) - Date.UTC(y, 0, 0)) / 86400000); }
  function dayWeather(city, y, mo, d) {
    const rnd = A.util.seeded(hash(city.id + ':' + y + '-' + mo + '-' + d));
    const season = Math.cos((2 * Math.PI * (dayOfYear(y, mo, d) - 200)) / 365.25);
    const mean = city.t + city.sw * season + (rnd() - 0.5) * 5;
    const range = city.r * (0.75 + rnd() * 0.5);
    let hi = mean + range / 2, lo = mean - range / 2;
    const x = rnd();
    let cond;
    if (x < city.wet * 0.42) cond = mean < 1.5 ? 'snow' : city.storm && rnd() < city.storm ? 'storm' : 'rain';
    else if (x < city.wet * 0.78) cond = 'cloudy';
    else if (city.fog && rnd() < city.fog) cond = 'fog';
    else if (x < city.wet * 0.78 + 0.28) cond = 'partly';
    else cond = 'sunny';
    if (cond === 'rain' || cond === 'storm' || cond === 'snow') { hi -= 2; lo -= 0.5; }
    else if (cond === 'sunny') hi += 1.2;
    return { hi, lo, cond };
  }
  function cityNow(city) {
    zoneOffset(city.tz);
    return zoneNow(city.tz);
  }
  function skyPhase(city, t) {
    const season = Math.cos((2 * Math.PI * (dayOfYear(t.y, t.mo, t.d) - 172)) / 365.25);
    const len = 12 + clamp(city.lat / 60, -1, 1) * 4.2 * season;
    const rise = 12.4 - len / 2, set = 12.4 + len / 2;
    const hr = t.h + t.m / 60;
    if (Math.abs(hr - rise) < 0.6) return 'dawn';
    if (Math.abs(hr - set) < 0.6) return 'dusk';
    return hr > rise && hr < set ? 'day' : 'night';
  }
  function weatherNow(city) {
    const t = cityNow(city);
    const w = dayWeather(city, t.y, t.mo, t.d);
    const hr = t.h + t.m / 60;
    const temp = w.lo + ((w.hi - w.lo) * (1 - Math.cos((2 * Math.PI * (hr - 4)) / 24))) / 2;
    const phase = skyPhase(city, t);
    let icon = w.cond;
    if (phase === 'night') icon = w.cond === 'sunny' ? 'clear' : w.cond === 'partly' ? 'partly-night' : w.cond;
    const days = [];
    for (let i = 1; i <= 3; i++) {
      const dd = new Date(Date.UTC(t.y, t.mo, t.d + i));
      days.push(Object.assign({ dow: dd.getUTCDay() }, dayWeather(city, dd.getUTCFullYear(), dd.getUTCMonth(), dd.getUTCDate())));
    }
    return { t, w, temp, phase, icon, days };
  }

  // Glossy animated condition icons (viewBox 100 x 100).
  function wxIcon(cond, u) {
    let n = 0;
    const cloud = (x, y, s, dark, cls) => {
      const id = u + 'c' + (n++);
      const shapes = `<circle cx="${n1(x - 14 * s)}" cy="${n1(y + 2 * s)}" r="${n1(11 * s)}"/><circle cx="${n1(x + s)}" cy="${n1(y - 6 * s)}" r="${n1(15 * s)}"/><circle cx="${n1(x + 16 * s)}" cy="${n1(y + 2 * s)}" r="${n1(11 * s)}"/><rect x="${n1(x - 25 * s)}" y="${n1(y + s)}" width="${n1(52 * s)}" height="${n1(12 * s)}" rx="${n1(6 * s)}"/>`;
      const stops = dark ? ['#c7d3df', '#8e9fb1', '#607186'] : ['#ffffff', '#eef6fc', '#b3cde6'];
      return `<g class="${cls || ''}"><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${n1(y - 21 * s)}" x2="0" y2="${n1(y + 13 * s)}"><stop offset="0" stop-color="${stops[0]}"/><stop offset=".6" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient>
        <g fill="${dark ? '#56667a' : '#7fa3c6'}" stroke="${dark ? '#56667a' : '#7fa3c6'}" stroke-width="2.2">${shapes}</g><g fill="url(#${id})">${shapes}</g>
        <ellipse cx="${n1(x - 1 * s)}" cy="${n1(y - 12 * s)}" rx="${n1(11 * s)}" ry="${n1(4.5 * s)}" fill="#fff" opacity="${dark ? 0.45 : 0.8}"/></g>`;
    };
    const sun = (cx, cy, r) => {
      let rays = '';
      for (let i = 0; i < 12; i++) rays += `<rect x="${n1(cx - 2.2)}" y="${n1(cy - r - 12)}" width="4.4" height="9" rx="2.2" transform="rotate(${i * 30} ${cx} ${cy})"/>`;
      return `<circle class="gd-wx-glow" cx="${cx}" cy="${cy}" r="${n1(r * 1.55)}" fill="#fff3a8"/>
        <g class="gd-wx-rays" style="transform-origin:${cx}px ${cy}px" fill="url(#${u}ray)">${rays}</g>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${u}sun)" stroke="#f08a12" stroke-opacity=".5"/>
        <ellipse cx="${n1(cx - r * 0.2)}" cy="${n1(cy - r * 0.45)}" rx="${n1(r * 0.62)}" ry="${n1(r * 0.36)}" fill="#fff" opacity=".7"/>`;
    };
    const moon = (cx, cy, r, stars) => {
      let st = '';
      if (stars) [[22, 24, 0], [78, 30, 0.8], [70, 72, 1.6], [26, 70, 2.2]].forEach(([x, y, dl]) => {
        st += `<path class="gd-wx-star" style="animation-delay:-${dl}s" d="M${x} ${y - 4}l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1z" fill="#fffbe0"/>`;
      });
      return `${st}<mask id="${u}mk"><rect width="100" height="100" fill="#fff"/><circle cx="${n1(cx + r * 0.48)}" cy="${n1(cy - r * 0.34)}" r="${n1(r * 0.86)}" fill="#000"/></mask>
        <circle cx="${cx}" cy="${cy}" r="${n1(r * 1.45)}" fill="#fff6c8" opacity=".18"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${u}moon)" mask="url(#${u}mk)"/>`;
    };
    const drops = (xs, y0, cls) => xs.map((x, i) => `<path class="${cls}" style="animation-delay:-${(i * 0.37).toFixed(2)}s" d="M${x} ${y0}c1.8 3 3.3 4.6 3.3 6.4a3.3 3.3 0 0 1-6.6 0c0-1.8 1.5-3.4 3.3-6.4z" fill="url(#${u}drop)" stroke="#1f7fc0" stroke-width=".5"/>`).join('');
    const flakes = (xs, y0) => xs.map((x, i) => `<g class="gd-wx-flake" style="animation-delay:-${(i * 0.61).toFixed(2)}s"><circle cx="${x}" cy="${y0}" r="3" fill="#fff" stroke="#8fc3ea" stroke-width=".8"/><circle cx="${x - 0.8}" cy="${y0 - 0.9}" r="1" fill="#fff"/></g>`).join('');
    let art;
    switch (cond) {
      case 'sunny': art = sun(50, 50, 21); break;
      case 'clear': art = moon(50, 48, 22, true); break;
      case 'partly': art = sun(36, 36, 16) + cloud(56, 60, 1, false, 'gd-wx-drift'); break;
      case 'partly-night': art = moon(36, 34, 15, false) + cloud(56, 60, 1, false, 'gd-wx-drift'); break;
      case 'cloudy': art = cloud(38, 42, 0.78, true, 'gd-wx-drift2') + cloud(56, 58, 1.05, false, 'gd-wx-drift'); break;
      case 'rain': art = drops([34, 48, 62, 41, 56], 66, 'gd-wx-drop') + cloud(50, 44, 1.1, true, 'gd-wx-drift'); break;
      case 'storm': art = drops([32, 66, 40, 60], 66, 'gd-wx-drop') + `<path class="gd-wx-bolt" d="M53 54l-9 17h7l-5 15 15-20h-7l6-12z" fill="#ffe45c" stroke="#f0a020" stroke-width="1.2" stroke-linejoin="round"/>` + cloud(50, 42, 1.12, true, 'gd-wx-drift'); break;
      case 'snow': art = flakes([34, 50, 64, 42, 58], 66) + cloud(50, 44, 1.1, false, 'gd-wx-drift'); break;
      case 'fog': art = cloud(50, 40, 1.05, false, 'gd-wx-drift') + [64, 73, 82].map((y, i) => `<rect class="gd-wx-fog" style="animation-delay:-${i * 1.3}s" x="${22 + i * 4}" y="${y}" width="${56 - i * 6}" height="5" rx="2.5" fill="#e8f1f8" opacity=".9"/>`).join(''); break;
      default: art = sun(50, 50, 21);
    }
    return `<svg viewBox="0 0 100 100" class="gd-wx-svg" aria-hidden="true"><defs>
      <radialGradient id="${u}sun" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffd62e"/><stop offset="1" stop-color="#f08a12"/></radialGradient>
      <linearGradient id="${u}ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#ffab1f"/></linearGradient>
      <linearGradient id="${u}moon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf0"/><stop offset="1" stop-color="#e6d27a"/></linearGradient>
      <linearGradient id="${u}drop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8f8ff"/><stop offset="1" stop-color="#1f9be0"/></linearGradient>
    </defs>${art}</svg>`;
  }

  define({
    id: 'weather',
    name: 'Weather',
    version: '1.6.2007',
    desc: 'Check the weather in your favorite city. The sky changes from day to night, and the bigger size shows the next three days.',
    keywords: ['forecast', 'temperature', 'sun', 'rain', 'city'],
    sizeable: true,
    size: (o, large) => (large ? [264, 192] : [130, 112]),
    defaults: () => ({ city: defaultCity(), unit: defaultUnit() }),
    art: () => wxIcon('partly', 'gdwa'),
    options(d) {
      const cities = CITIES.slice().sort((a, b) => a.name.localeCompare(b.name));
      return h('div.gd-opt-body', null,
        optRow('City', A.ui.select({ options: cities.map((c) => [c.id, c.name]), value: d.city, onChange: (v) => { d.city = v; } })),
        h('div.gd-opt-row', null, h('span.gd-opt-label', null, 'Show temperature in'),
          A.ui.radioGroup({ options: [['F', 'Fahrenheit'], ['C', 'Celsius']], value: d.unit, onChange: (v) => { d.unit = v; } })));
    },
    create(ctx) {
      const o = ctx.o, large = ctx.large;
      const root = h('div.gd-wx');
      ctx.body.appendChild(root);
      let key = '', lastCheck = 0;
      const deg = (c) => Math.round(toUnit(c, o.unit)) + '°';
      function render() {
        const city = cityById(o.city);
        const now = weatherNow(city);
        const k = [o.city, o.unit, now.icon, deg(now.temp), now.phase, now.t.d, large].join('|');
        if (k === key) return;
        key = k;
        root.className = `gd-wx gd-wx-${now.phase} gd-wx-c-${now.w.cond}${large ? ' gd-wx-large' : ''}`;
        const u = uid('gdw');
        const fc = large ? `<div class="gd-wx-fc">${now.days.map((d, i) => `<div class="gd-wx-fd"><b>${DAYS[d.dow].slice(0, 3)}</b>${wxIcon(d.cond, u + 'f' + i)}<span>${deg(d.hi)} <i>${deg(d.lo)}</i></span></div>`).join('')}</div>` : '';
        root.innerHTML = `<div class="gd-wx-sky"></div><div class="gd-wx-shine"></div>
          <div class="gd-wx-icon">${wxIcon(now.icon, u)}</div>
          <div class="gd-wx-temp">${deg(now.temp)}</div>
          <div class="gd-wx-cond">${COND_TEXT[now.icon]}</div>
          <div class="gd-wx-city">${esc(city.name)}</div>
          <div class="gd-wx-hl">H ${deg(now.w.hi)}&nbsp; L ${deg(now.w.lo)}</div>${fc}`;
        ctx.body.dataset.tip = `${city.name}: ${COND_TEXT[now.icon].toLowerCase()}, ${Math.round(toUnit(now.temp, o.unit))}°${o.unit}. Aerium Weather`;
      }
      render();
      return { tick(nowT) { if (nowT - lastCheck > 20000) { lastCheck = nowT; render(); } } };
    },
  });

  // ============================================================ CPU Meter
  function gaugeSVG(u, cx, cy, R, label) {
    const face = n1(R * 0.86), ar = n1(R * 0.7), aw = n1(R * 0.085);
    let ticks = '';
    for (let p = 0; p <= 100; p += 10) {
      const a = -120 + p * 2.4, big = p % 20 === 0;
      const [x0, y0] = polar(cx, cy, R * 0.79, a), [x1, y1] = polar(cx, cy, R * (big ? 0.64 : 0.71), a);
      ticks += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#eaf6ff" stroke-width="${big ? n1(R * 0.035) : n1(R * 0.02)}" stroke-linecap="round" opacity="${big ? 0.95 : 0.6}"/>`;
    }
    const L = R * 0.74, w = R * 0.075;
    const needle = `M${n1(cx - w)} ${n1(cy + R * 0.16)}L${n1(cx - w * 0.3)} ${n1(cy - L)}L${n1(cx + w * 0.3)} ${n1(cy - L)}L${n1(cx + w)} ${n1(cy + R * 0.16)}Z`;
    const rw = n1(R * 0.64), rh = n1(R * 0.25);
    return `<circle cx="${cx}" cy="${n1(cy + R * 0.08)}" r="${n1(R * 1.04)}" fill="url(#${u}sh)"/>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${u}chr)" stroke="#4d5966" stroke-width=".8"/>
      <circle cx="${cx}" cy="${cy}" r="${n1(R * 0.9)}" fill="url(#${u}chr2)"/>
      <circle cx="${cx}" cy="${cy}" r="${face}" fill="url(#${u}face)" stroke="#02060b" stroke-width="1"/>
      <path d="${arc(cx, cy, ar, -120, 24)}" stroke="#45d64a" stroke-width="${aw}" fill="none" opacity=".9"/>
      <path d="${arc(cx, cy, ar, 24, 84)}" stroke="#ffd84a" stroke-width="${aw}" fill="none" opacity=".9"/>
      <path d="${arc(cx, cy, ar, 84, 120)}" stroke="#ff5a3c" stroke-width="${aw}" fill="none" opacity=".95"/>
      ${ticks}
      <text x="${cx}" y="${n1(cy - R * 0.28)}" class="gd-f-y2k" font-size="${n1(R * 0.15)}" fill="#8fd3ff" text-anchor="middle">${label}</text>
      <rect x="${n1(cx - rw / 2)}" y="${n1(cy + R * 0.34)}" width="${rw}" height="${rh}" rx="${n1(rh / 2.6)}" fill="#03101a" stroke="#35546e" stroke-width=".7"/>
      <text x="${cx}" y="${n1(cy + R * 0.34 + rh * 0.74)}" class="gd-f-y2k" font-size="${n1(R * 0.155)}" fill="#7dffd0" text-anchor="middle"><tspan data-r="${label}">0</tspan><tspan class="gd-f-aero" font-weight="600" font-size="${n1(R * 0.14)}" dx="${n1(R * 0.02)}">%</tspan></text>
      <g data-n="${label}" transform="rotate(-120 ${cx} ${cy})"><path d="${needle}" fill="#200a05" opacity=".35" transform="translate(${n1(R * 0.03)} ${n1(R * 0.05)})"/><path d="${needle}" fill="url(#${u}ndl)"/></g>
      <circle cx="${cx}" cy="${cy}" r="${n1(R * 0.12)}" fill="url(#${u}cap)" stroke="#3a4652" stroke-width=".6"/>
      <path d="M${n1(cx - face * 0.86)} ${n1(cy - face * 0.05)}a${n1(face * 0.86)} ${n1(face * 0.86)} 0 0 1 ${n1(face * 1.72)} 0c-${n1(face * 0.4)}-${n1(face * 0.26)}-${n1(face * 1.32)}-${n1(face * 0.26)}-${n1(face * 1.72)} 0z" fill="url(#${u}gl)"/>`;
  }
  function cpuSVG(u) {
    return `<svg viewBox="0 0 150 104" class="gd-cpu-svg" aria-hidden="true"><defs>
      <linearGradient id="${u}chr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".22" stop-color="#b9c4ce"/><stop offset=".45" stop-color="#f4f7f9"/><stop offset=".62" stop-color="#7f8b97"/><stop offset=".82" stop-color="#e2e8ed"/><stop offset="1" stop-color="#5d6975"/></linearGradient>
      <linearGradient id="${u}chr2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f3f6f8"/><stop offset=".5" stop-color="#8d99a5"/><stop offset="1" stop-color="#e9eef2"/></linearGradient>
      <radialGradient id="${u}face" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#23384f"/><stop offset=".7" stop-color="#0b1622"/><stop offset="1" stop-color="#03070c"/></radialGradient>
      <linearGradient id="${u}ndl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8a5c"/><stop offset=".5" stop-color="#ff4a26"/><stop offset="1" stop-color="#c8260e"/></linearGradient>
      <radialGradient id="${u}cap" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#7d8995"/></radialGradient>
      <linearGradient id="${u}gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity=".02"/></linearGradient>
      <radialGradient id="${u}sh" cx=".5" cy=".5" r=".5"><stop offset=".78" stop-color="#001a33" stop-opacity=".36"/><stop offset="1" stop-color="#001a33" stop-opacity="0"/></radialGradient>
    </defs>${gaugeSVG(u, 56, 52, 44, 'CPU')}${gaugeSVG(u, 118, 68, 28, 'RAM')}</svg>`;
  }

  define({
    id: 'cpu',
    name: 'CPU Meter',
    version: '1.3.2007',
    desc: 'Twin chrome gauges show how hard your computer is working and how much memory is in use. Open a few windows and watch the needles jump.',
    keywords: ['performance', 'memory', 'ram', 'processor', 'meter', 'system'],
    sizeable: true,
    size: (o, large) => (large ? [240, 166] : [150, 104]),
    defaults: () => ({}),
    art: () => cpuSVG('gdcpa'),
    create(ctx) {
      const u = uid('gdcpu');
      ctx.body.innerHTML = cpuSVG(u);
      const svg = ctx.body.firstElementChild;
      const gauge = (label, cx, cy) => ({ x: 0, v: 0, target: 0, cx, cy, g: svg.querySelector(`[data-n="${label}"]`), txt: svg.querySelector(`[data-r="${label}"]`), shown: -1, ang: null });
      const cpu = gauge('CPU', 56, 52), ram = gauge('RAM', 118, 68);
      let spikeUntil = 0, nextAt = 0, last = performance.now();
      const offs = [
        A.bus.on('win:open', () => { spikeUntil = performance.now() + 1600; nextAt = 0; ctx.kick(); }),
        A.bus.on('gadgets:drag', () => { spikeUntil = Math.max(spikeUntil, performance.now() + 500); nextAt = 0; ctx.kick(); }),
      ];
      const settled = (n) => Math.abs(n.v) < 0.04 && Math.abs(n.target - n.x) < 0.06;
      function retarget(now) {
        const wins = A.wm && A.wm.windows ? A.wm.windows.filter((w) => !w.closed && w.state !== 'minimized').length : 0;
        let c = 3 + wins * 2.4 + Math.random() * 9 + (Math.random() < 0.07 ? 18 + Math.random() * 26 : 0);
        if (spikeUntil > now) c = 52 + Math.random() * 40;
        cpu.target = clamp(c, 1, 99);
        ram.target = clamp(31 + wins * 4.6 + live.size * 1.2 + Math.sin(now / 9000) * 2.2 + Math.random() * 1.6, 16, 94);
        nextAt = now + 850 + Math.random() * 750;
        ctx.body.dataset.tip = `CPU usage ${Math.round(cpu.target)}%, memory ${Math.round(ram.target)}%`;
      }
      function step(n, dt) {
        const a = 42 * (n.target - n.x) - 8.2 * n.v;
        n.v += a * dt;
        n.x = clamp(n.x + n.v * dt, -1.5, 101.5);
        const ang = n1(-120 + n.x * 2.4);
        if (ang !== n.ang) { n.ang = ang; n.g.setAttribute('transform', `rotate(${ang} ${n.cx} ${n.cy})`); }
        const pct = Math.round(clamp(n.x, 0, 100));
        if (pct !== n.shown) { n.shown = pct; n.txt.textContent = String(pct); }
      }
      return {
        tick(now) {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (now >= nextAt) retarget(now);
          if (!settled(cpu)) step(cpu, dt);
          if (!settled(ram)) step(ram, dt);
        },
        frames: () => !settled(cpu) || !settled(ram),
        resume() { last = performance.now(); },
        destroy() { offs.forEach((off) => off()); },
      };
    },
  });

  // ============================================================ Slide Show
  const KEN_BURNS = [
    ['scale(1.16) translate(-3%, -2%)', 'scale(1.02) translate(2%, 1%)'],
    ['scale(1.04) translate(3%, 2%)', 'scale(1.18) translate(-2%, -1%)'],
    ['scale(1.14) translate(3%, -2%)', 'scale(1.03) translate(-2%, 2%)'],
    ['scale(1.02) translate(-2%, 2%)', 'scale(1.15) translate(2%, -2%)'],
  ];
  function slideshowArt() {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs>
      <linearGradient id="gdss-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a7f96"/><stop offset=".5" stop-color="#27364a"/><stop offset="1" stop-color="#0e1824"/></linearGradient>
      <linearGradient id="gdss-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f8fe6"/><stop offset="1" stop-color="#c8ecff"/></linearGradient>
      <radialGradient id="gdss-sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b2a4a" stop-opacity=".32"/><stop offset="1" stop-color="#0b2a4a" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="32" cy="58.5" rx="25" ry="3" fill="url(#gdss-sh)"/>
      <rect x="5" y="11" width="54" height="42" rx="6" fill="url(#gdss-f)" stroke="#0b1622"/>
      <rect x="9.5" y="15.5" width="45" height="33" rx="2.5" fill="url(#gdss-s)"/>
      <circle cx="21" cy="24.5" r="7" fill="#fff6b0" opacity=".45"/><circle cx="21" cy="24.5" r="4.4" fill="#ffd84a"/>
      <path d="M9.5 41.5Q22 33 34 38.5T54.5 35.5v13h-45z" fill="#6fd04a"/><path d="M9.5 45Q26 38.5 40 43.5T54.5 42.5v6h-45z" fill="#1f9e2a"/>
      <path d="M6 17a6 6 0 0 1 6-6h40a6 6 0 0 1 6 6v5c-16-5-36-5-52 0z" fill="#fff" opacity=".28"/></svg>`;
  }

  define({
    id: 'slideshow',
    name: 'Slide Show',
    version: '1.2.2007',
    desc: 'A little photo frame that shows your pictures one after another, with a soft crossfade and a slow pan. Point at it for the controls.',
    keywords: ['photos', 'pictures', 'frame', 'images', 'gallery'],
    sizeable: true,
    size: (o, large) => (large ? [312, 236] : [132, 102]),
    defaults: () => ({ folder: '/Pictures', interval: 10, pan: true, shuffle: false }),
    art: slideshowArt,
    options(d) {
      const folders = ['/Pictures'].concat(Array.from(new Set(pictures().map((p) => A.fs.dirname(p.path)))).filter((f) => f !== '/Pictures'));
      return h('div.gd-opt-body', null,
        optRow('Folder', A.ui.select({ options: folders.map((f) => [f, f === '/Pictures' ? 'All my pictures' : A.fs.basename(f)]), value: d.folder, onChange: (v) => { d.folder = v; } })),
        optRow('Show each picture', A.ui.select({ options: [[5, '5 seconds'], [10, '10 seconds'], [15, '15 seconds'], [30, '30 seconds'], [60, '1 minute']], value: d.interval, onChange: (v) => { d.interval = Number(v); } })),
        A.ui.checkbox({ label: 'Pan and zoom', checked: d.pan, onChange: (v) => { d.pan = v; } }),
        A.ui.checkbox({ label: 'Shuffle pictures', checked: d.shuffle, onChange: (v) => { d.shuffle = v; } }));
    },
    create(ctx) {
      const o = ctx.o;
      const layers = [h('div.gd-ss-pic'), h('div.gd-ss-pic')];
      const empty = h('div.gd-ss-empty', { hidden: true }, 'Add pictures to your Pictures folder to see them here.');
      const btn = (g, label, fn) => h('button.gd-ss-btn', { type: 'button', 'aria-label': label, 'data-tip': label, onclick: stopClick(fn) }, glyph(g));
      const playBtn = btn('pause', 'Pause', () => setPlaying(paused));
      const bar = h('div.gd-ss-bar', null, btn('prev', 'Previous picture', () => go(-1)), playBtn, btn('next', 'Next picture', () => go(1)), btn('view', 'Open picture', viewPic));
      const view = h('div.gd-ss-view', null, layers[0], layers[1], empty);
      const frame = h('div.gd-ss', null, view, bar, h('div.gd-ss-gloss'));
      ctx.body.appendChild(frame);
      let pics = [], order = [], idx = -1, front = 0, paused = false, nextAt = Infinity;

      function load() {
        const cur = pics[order[idx]];
        pics = pictures(o.folder && A.fs.isDir(o.folder) ? o.folder : '/Pictures');
        order = pics.map((p, i) => i);
        if (o.shuffle) order = A.util.shuffle(order);
        empty.hidden = pics.length > 0;
        bar.hidden = pics.length === 0;
        const keep = cur ? order.findIndex((i) => pics[i].path === cur.path) : -1;
        if (keep >= 0) idx = keep;
        else if (pics.length) show(0);
        else layers.forEach((l) => { l.style.opacity = '0'; });
      }
      function show(i) {
        if (!pics.length) return;
        idx = ((i % order.length) + order.length) % order.length;
        const pic = pics[order[idx]];
        const next = layers[1 - front], cur = layers[front];
        const kb = o.pan ? KEN_BURNS[Math.floor(Math.random() * KEN_BURNS.length)] : null;
        const flipKb = kb && Math.random() < 0.5;
        next.style.transition = 'none';
        next.style.backgroundImage = `url("${pic.url}")`;
        next.style.transform = kb ? kb[flipKb ? 1 : 0] : 'none';
        void next.offsetWidth;
        const ms = (o.interval || 10) * 1000 + 1600;
        next.style.transition = `opacity 1.2s ease, transform ${ms}ms linear`;
        next.style.opacity = '1';
        if (kb) next.style.transform = kb[flipKb ? 0 : 1];
        cur.style.opacity = '0';
        front = 1 - front;
        nextAt = performance.now() + (o.interval || 10) * 1000;
        frame.dataset.tip = pic.name;
      }
      function go(dir) { if (pics.length > 1) { show(idx + dir); sfx('click'); } }
      function setPlaying(on) {
        paused = !on;
        playBtn.replaceChildren(glyph(paused ? 'play' : 'pause'));
        playBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
        playBtn.dataset.tip = paused ? 'Play' : 'Pause';
        frame.classList.toggle('gd-ss-paused', paused);
        if (!paused) nextAt = performance.now() + 1500;
        sfx('click');
      }
      function viewPic() { const p = pics[order[idx]]; if (p) A.apps.openFile(p.path); }
      view.addEventListener('dblclick', viewPic);
      const refresh = A.util.debounce(load, 400);
      const off = A.fs.on((ev) => { if (ev.type === 'reset' || (ev.path || '').startsWith('/Pictures')) refresh(); });
      load();
      return {
        tick(now) { if (!paused && pics.length > 1 && now >= nextAt) show(idx + 1); },
        resume() { nextAt = Math.max(nextAt, performance.now() + 1500); },
        destroy() { off(); },
      };
    },
  });

  // ============================================================ Picture Puzzle
  const SOLVED = () => Array.from({ length: 16 }, (_, i) => i);
  const fmtClock = (s) => Math.floor(s / 60) + ':' + pad2(Math.floor(s % 60));
  function puzzlePic(path) {
    const url = path && A.fs.thumbFor(path);
    if (url) return { path, url };
    const all = pictures();
    const p = all.find((x) => /meadow/i.test(x.name)) || all[0];
    return p ? { path: p.path, url: p.url } : { path: '', url: A.asset('imagery/meadow') };
  }
  function puzzleArt() {
    let cells = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) continue;
      cells += `<rect x="${10 + c * 15}" y="${10 + r * 15}" width="14" height="14" rx="2" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.2"/>`;
    }
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs>
      <linearGradient id="gdpz-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f8fe6"/><stop offset=".6" stop-color="#8fd3ff"/><stop offset="1" stop-color="#d4f0ff"/></linearGradient>
      <linearGradient id="gdpz-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a6a8f"/><stop offset="1" stop-color="#132338"/></linearGradient>
      <clipPath id="gdpz-c"><path d="M10 10h44v29H39v15H10z"/></clipPath>
      <radialGradient id="gdpz-sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b2a4a" stop-opacity=".32"/><stop offset="1" stop-color="#0b2a4a" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="32" cy="60" rx="24" ry="3" fill="url(#gdpz-sh)"/>
      <rect x="6" y="6" width="52" height="52" rx="7" fill="url(#gdpz-f)"/>
      <rect x="39.5" y="39.5" width="14" height="14" rx="2" fill="#0b1622" opacity=".6"/>
      <g clip-path="url(#gdpz-c)"><rect x="10" y="10" width="44" height="44" fill="url(#gdpz-s)"/><circle cx="22" cy="21" r="5" fill="#ffd84a"/>
        <path d="M10 40Q24 30 37 37T54 34v20H10z" fill="#6fd04a"/><path d="M10 45Q27 38 41 43T54 42v12H10z" fill="#1f9e2a"/></g>
      ${cells}
      <rect x="42" y="27" width="14" height="14" rx="2" fill="none" stroke="#fff" stroke-width="1.4"/>
      <path d="M7 13a7 7 0 0 1 7-7h36a7 7 0 0 1 7 7v4c-16-5-34-5-50 0z" fill="#fff" opacity=".3"/></svg>`;
  }

  define({
    id: 'puzzle',
    name: 'Picture Puzzle',
    version: '1.1.2007',
    desc: 'Slide the tiles back into place to finish the picture. A timer keeps score, and you can peek at the whole picture any time.',
    keywords: ['game', 'sliding', 'tiles', 'fifteen', 'picture'],
    sizeable: true,
    size: (o, large) => (large ? [228, 264] : [152, 184]),
    defaults: () => ({ pic: '', board: null, boardPic: '', time: 0, moves: 0, solved: false, best: {} }),
    art: puzzleArt,
    options(d) {
      const pics = pictures().slice(0, 16);
      const cur = puzzlePic(d.pic).path;
      const grid = h('div.gd-opt-pics');
      pics.forEach((p) => {
        const b = h('button.gd-opt-pic', {
          type: 'button', class: p.path === cur && 'sel', 'aria-label': p.name, 'data-tip': p.name,
          style: { backgroundImage: `url("${p.url}")` },
          onclick: () => { d.pic = p.path; grid.querySelectorAll('.gd-opt-pic').forEach((x) => x.classList.toggle('sel', x === b)); sfx('click'); },
        });
        grid.appendChild(b);
      });
      return h('div.gd-opt-body', null, h('div.gd-opt-label', null, 'Choose a picture'), grid,
        h('div.gd-opt-note', null, 'Picking a new picture starts a new puzzle.'));
    },
    create(ctx) {
      const o = ctx.o;
      const T = ctx.large ? 50 : 33;
      const pic = puzzlePic(o.pic);
      if (!o.best || typeof o.best !== 'object') o.best = {};
      const valid = Array.isArray(o.board) && o.board.length === 16 && SOLVED().every((i) => o.board.includes(i)) && o.boardPic === pic.path;
      let board = valid ? o.board.slice() : null;
      let solved = valid && !!o.solved;
      let running = false, startedAt = 0, shownSec = -1;

      const timer = h('div.gd-pz-time', null, '0:00');
      const peekBtn = h('button.gd-pz-btn', { type: 'button', 'aria-label': 'Hold to see the picture', 'data-tip': 'Hold to see the picture' }, glyph('eye'));
      const shuffleBtn = h('button.gd-pz-btn', { type: 'button', 'aria-label': 'Shuffle', 'data-tip': 'Shuffle', onclick: stopClick(() => { newGame(); sfx('shuffle'); }) }, glyph('shuffle'));
      const boardEl = h('div.gd-pz-board', { tabIndex: 0, role: 'grid', 'aria-label': 'Picture puzzle. Use the arrow keys to slide tiles.', style: { width: T * 4 + 'px', height: T * 4 + 'px', '--t': T + 'px' } });
      const peek = h('div.gd-pz-peek', { style: { backgroundImage: `url("${pic.url}")` } });
      const badge = h('div.gd-pz-badge');
      const root = h('div.gd-pz', { class: ctx.large ? 'gd-pz-large' : '' },
        h('div.gd-pz-top', null, timer, h('span.gd-pz-sp'), peekBtn, shuffleBtn),
        h('div.gd-pz-well', null, boardEl), h('div.gd-pz-gloss'));
      ctx.body.appendChild(root);

      const tiles = [];
      for (let t = 0; t < 16; t++) {
        const el = h('div.gd-pz-tile', {
          class: t === 15 && 'gd-pz-last',
          style: { backgroundImage: `url("${pic.url}")`, backgroundSize: T * 4 + 'px ' + T * 4 + 'px', backgroundPosition: `-${(t % 4) * T}px -${Math.floor(t / 4) * T}px` },
        });
        if (t < 15) el.addEventListener('click', stopClick(() => tryMove(board.indexOf(t))));
        tiles.push(el);
        boardEl.appendChild(el);
      }
      boardEl.append(peek, badge);

      function layout(animate) {
        tiles.forEach((el, t) => {
          if (t === 15) return;
          const p = board.indexOf(t);
          el.style.transition = animate ? '' : 'none';
          el.style.transform = `translate(${(p % 4) * T}px, ${Math.floor(p / 4) * T}px)`;
        });
        tiles[15].style.transform = `translate(${3 * T}px, ${3 * T}px)`;
        root.classList.toggle('gd-pz-won', solved);
      }
      function elapsed() { return (o.time || 0) + (running ? (performance.now() - startedAt) / 1000 : 0); }
      function drawTime() {
        const s = Math.floor(elapsed());
        if (s === shownSec) return;
        shownSec = s;
        timer.textContent = fmtClock(s);
      }
      function neighbors(b) {
        const out = [];
        if (b >= 4) out.push(b - 4);
        if (b < 12) out.push(b + 4);
        if (b % 4) out.push(b - 1);
        if (b % 4 !== 3) out.push(b + 1);
        return out;
      }
      function shuffled() {
        let b, next;
        do {
          next = SOLVED();
          b = 15;
          let prev = -1;
          for (let i = 0; i < 200; i++) {
            const opts = neighbors(b).filter((n) => n !== prev);
            const n = opts[Math.floor(Math.random() * opts.length)];
            next[b] = next[n]; next[n] = 15;
            prev = b; b = n;
          }
        } while (next.every((v, i) => v === i));
        return next;
      }
      function save() {
        o.board = board.slice();
        o.boardPic = pic.path;
        o.solved = solved;
        ctx.save();
      }
      function newGame() {
        board = shuffled();
        solved = false; running = false;
        o.time = 0; o.moves = 0; shownSec = -1;
        badge.textContent = '';
        layout(false);
        drawTime();
        save();
      }
      function tryMove(p) {
        if (solved || p < 0) return false;
        const b = board.indexOf(15);
        let step = 0;
        if (Math.floor(p / 4) === Math.floor(b / 4) && p !== b) step = p > b ? 1 : -1;
        else if (p % 4 === b % 4 && p !== b) step = p > b ? 4 : -4;
        if (!step) return false;
        for (let q = b; q !== p; q += step) board[q] = board[q + step];
        board[p] = 15;
        if (!running) { running = true; startedAt = performance.now(); ctx.kick(); }
        o.moves = (o.moves || 0) + 1;
        sfx('card');
        layout(true);
        if (board.every((v, i) => v === i)) win();
        save();
        return true;
      }
      function win() {
        o.time = elapsed();
        running = false;
        solved = true;
        const t = Math.round(o.time);
        const prevBest = o.best[pic.path];
        const record = !prevBest || t < prevBest;
        if (record) o.best[pic.path] = t;
        badge.textContent = (record && prevBest ? 'New best! ' : 'Solved in ') + fmtClock(t);
        layout(true);
        drawTime();
        for (let i = 0; i < 12; i++) {
          const s = h('span.gd-pz-spark', { style: { left: A.util.rand(5, 95) + '%', top: A.util.rand(5, 95) + '%', animationDelay: (i * 0.07).toFixed(2) + 's' } });
          boardEl.appendChild(s);
          setTimeout(() => s.remove(), 1800);
        }
        setTimeout(() => sfx('win'), 180);
      }
      // Hold the eye to see the whole picture.
      const peekOn = (e) => { e.preventDefault(); e.stopPropagation(); peek.classList.add('on'); };
      const peekOff = () => peek.classList.remove('on');
      peekBtn.addEventListener('pointerdown', peekOn);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => peekBtn.addEventListener(ev, peekOff));
      boardEl.addEventListener('keydown', (e) => {
        const b = board.indexOf(15);
        const map = { ArrowUp: b + 4, ArrowDown: b - 4, ArrowLeft: b % 4 !== 3 ? b + 1 : -1, ArrowRight: b % 4 ? b - 1 : -1 };
        if (!(e.key in map)) return;
        e.preventDefault();
        e.stopPropagation();
        const t = map[e.key];
        if (t >= 0 && t < 16) tryMove(t);
      });

      if (!board) newGame();
      else {
        layout(false);
        if (solved) badge.textContent = 'Solved in ' + fmtClock(Math.round(o.time || 0));
        drawTime();
      }
      return {
        tick() { if (running) drawTime(); },
        pause() { if (running) { o.time = elapsed(); running = false; this._was = true; } },
        resume() { if (this._was) { this._was = false; running = true; startedAt = performance.now(); } },
        destroy() { if (running) { o.time = elapsed(); running = false; save(); } },
      };
    },
  });

  // ============================================================ Feed Headlines
  const FEEDS = {
    daily: { name: 'Aerium Daily', items: [
      ['Neighborhood kids build the tallest pillow fort on record', 'Using 41 pillows and every blanket in the house, the fort stood proudly until dinner was ready.'],
      ['Sunny weekend ahead, experts recommend kites', 'Forecasters expect gentle breezes and clear skies from Saturday morning. Pack a lunch.'],
      ['Library adds a row of brand new flat screen computers', 'Visitors can now surf the web side by side. A sign-up sheet by the door keeps things fair.'],
      ['Most families still share one computer, survey finds', 'The favorite rule: whoever is using it gets thirty minutes, then it is your little brother\'s turn.'],
      ['Student burns the perfect mix CD on the first try', 'No skips and no coasters. Friends are calling track 7 a masterpiece.'],
      ['City plants 2,000 trees along the new riverside path', 'Walkers and cyclists can expect shade by next summer, and a lot more birdsong.'],
      ['Grandpa masters the webcam, waves for twenty minutes', 'The whole family agreed it was the best video call so far.'],
      ['Cloud spotted that looks exactly like a dolphin', 'Witnesses say it swam slowly across the afternoon sky before turning into a teapot.'],
      ['Mall food court welcomes a smoothie with three kinds of berries', 'Early reviews describe it as refreshing, purple and very photogenic.'],
      ['Town fountain gets fresh blue tiles and a family of ducks', 'The ducks were not part of the plan, but everyone agrees they belong there.'],
    ] },
    nature: { name: 'Nature and Science', items: [
      ['Scientists confirm bubbles are still very fun', 'A long study of backyard bubbles reached the same happy conclusion as every summer before it.'],
      ['Coral reef shows signs of a bright recovery', 'Divers report new growth in shades of pink, green and gold along the outer reef.'],
      ['Aurora expected to put on a show this weekend', 'Look north after dark. Clear skies should make the ribbons easy to spot.'],
      ['Goldfish remember much longer than three seconds', 'Researchers say your goldfish knows exactly when dinner time is.'],
      ['Glowing jellyfish photographed in the deep sea', 'The gentle blue light helps it find friends in the dark, scientists think.'],
      ['Wind farm powers an entire town for a full week', 'Engineers credit steady breezes and a lot of patient planning.'],
      ['Honeybees dance directions to a record flower patch', 'The patch was found three meadows away, and the bees were thrilled.'],
      ['Astronomers name a new comet after a school science club', 'The club spotted it first with a telescope bought through bake sales.'],
      ['Dolphins seen teaching their young to ride waves', 'Marine biologists call it surfing lessons, with lots of splashing.'],
      ['Rainforest canopy walkway opens to visitors', 'The rope bridges sway gently thirty meters above the forest floor.'],
    ] },
    tech: { name: 'Tech Corner', items: [
      ['New laptops weigh under five pounds', 'You can now carry your whole computer to the couch with one hand.'],
      ['Pocket music players now hold 2,000 songs', 'That is enough music for a very long road trip, and then some.'],
      ['Wireless internet arrives at the corner coffee shop', 'Just ask for the password at the counter, next to the muffins.'],
      ['Glass windows are the hot new look on the desktop', 'Designers say see-through title bars help you feel calm and focused.'],
      ['Digital cameras pass the 10 megapixel mark', 'Photos are now sharp enough to count every freckle on the family cat.'],
      ['Families discover video calling, grandparents delighted', 'Tips from experts: sit near a lamp, and remember to smile.'],
      ['Flat screens outsell tube televisions for the first time', 'Living rooms everywhere suddenly have a lot more space.'],
      ['Web pages now load in under five seconds on broadband', 'Dial-up tones are becoming a fond memory for many households.'],
      ['Instant messaging adds nudges and animated winks', 'Early testers report that nudging a friend never stops being funny.'],
      ['Screensaver fans gather for a bubble convention', 'The most popular panel: bubbles that bounce off each other.'],
    ] },
    good: { name: 'Good News', items: [
      ['Lost dog finds his way home after a week of adventures', 'He came back muddy, happy and very ready for a nap.'],
      ['Community garden grows 500 pounds of tomatoes for the food bank', 'Volunteers say the secret is sunshine, patience and good music.'],
      ['Lemonade stand raises money for the animal shelter', 'The young owners plan to open a second stand next summer.'],
      ['Retired teacher knits 300 hats for newborns', 'Each hat comes with a tiny pom-pom and a handwritten note.'],
      ['Strangers team up to help a kitten down from a tree', 'The kitten was fine, and five new friendships began that afternoon.'],
      ['Neighbors throw a surprise party for their mail carrier', 'After 25 years on the same route, she got cake and a standing ovation.'],
      ['Local band plays a free concert in the park', 'By the second song the whole town was dancing on the grass.'],
      ['Robotics team wins with a robot that waters plants', 'The judges loved its gentle watering can and friendly blinking lights.'],
      ['Beach cleanup draws a record 1,200 volunteers', 'The shore sparkled by noon, and the sandcastles were extra tall.'],
      ['Grandma finishes her first 5K, cheered on by 14 grandchildren', 'She says she is already training for the next one.'],
    ] },
  };
  function ago(min) {
    if (min < 60) return min + ' min ago';
    const hr = Math.floor(min / 60);
    return hr === 1 ? '1 hr ago' : hr + ' hrs ago';
  }
  function feedItems(id) {
    const f = FEEDS[id] || FEEDS.daily;
    const rnd = A.util.seeded(hash(dayKey() + ':' + id));
    const mins = f.items.map(() => 3 + Math.floor(rnd() * 360)).sort((a, b) => a - b);
    return A.util.shuffle(f.items, rnd).map(([title, summary], i) => ({ title, summary, min: mins[i], feed: f.name }));
  }
  const FEED_ORB = (u) => `<svg viewBox="0 0 24 24" class="gd-fd-orb" aria-hidden="true"><defs><radialGradient id="${u}" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#ffe0a8"/><stop offset=".45" stop-color="#ff9a3c"/><stop offset="1" stop-color="#d9580f"/></radialGradient></defs>
    <circle cx="12" cy="12" r="11" fill="url(#${u})" stroke="#b8480f" stroke-width=".8"/><circle cx="8" cy="16" r="1.9" fill="#fff"/>
    <path d="M6.2 10.6a7.2 7.2 0 0 1 7.2 7.2M6.2 6.4a11.4 11.4 0 0 1 11.4 11.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 9.5a8 8 0 0 1 16 0c-4-2.6-12-2.6-16 0z" fill="#fff" opacity=".5"/></svg>`;
  function feedArt() {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs>
      <linearGradient id="gdfd-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2eaf1"/></linearGradient>
      <radialGradient id="gdfd-o" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#ffe0a8"/><stop offset=".45" stop-color="#ff9a3c"/><stop offset="1" stop-color="#d9580f"/></radialGradient>
      <radialGradient id="gdfd-sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b2a4a" stop-opacity=".3"/><stop offset="1" stop-color="#0b2a4a" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="32" cy="59.5" rx="23" ry="3" fill="url(#gdfd-sh)"/>
      <rect x="14" y="7" width="38" height="47" rx="4" fill="#dfe8f0" stroke="#9aa9b7" transform="rotate(6 33 30)"/>
      <rect x="10" y="8" width="38" height="47" rx="4" fill="url(#gdfd-p)" stroke="#8ea6bd"/>
      <rect x="15" y="14" width="28" height="5" rx="1.5" fill="#1a5fa8"/>
      <g fill="#a8b8c8"><rect x="15" y="23" width="28" height="2.4" rx="1.2"/><rect x="15" y="28" width="24" height="2.4" rx="1.2"/><rect x="15" y="33" width="27" height="2.4" rx="1.2"/><rect x="15" y="38" width="18" height="2.4" rx="1.2"/><rect x="15" y="43" width="22" height="2.4" rx="1.2"/></g>
      <circle cx="45" cy="45" r="12" fill="url(#gdfd-o)" stroke="#b8480f"/><circle cx="41" cy="49" r="2" fill="#fff"/>
      <path d="M39.2 43.4a6.6 6.6 0 0 1 6.6 6.6M39.2 39a11 11 0 0 1 11 11" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round"/>
      <path d="M36 42a9.2 9.2 0 0 1 18 0c-5-3-13-3-18 0z" fill="#fff" opacity=".5"/></svg>`;
  }

  define({
    id: 'feed',
    name: 'Feed Headlines',
    version: '1.0.2007',
    desc: 'The latest cheerful headlines scroll by on your desktop. Click a headline to read a little more.',
    keywords: ['news', 'rss', 'headlines', 'feed', 'stories'],
    sizeable: true,
    size: (o, large) => (large ? [262, 250] : [142, 176]),
    defaults: () => ({ feed: 'daily', auto: true }),
    art: feedArt,
    options(d) {
      return h('div.gd-opt-body', null,
        optRow('Show headlines from', A.ui.select({ options: Object.keys(FEEDS).map((k) => [k, FEEDS[k].name]), value: d.feed, onChange: (v) => { d.feed = v; } })),
        A.ui.checkbox({ label: 'Scroll through headlines automatically', checked: d.auto !== false, onChange: (v) => { d.auto = v; } }));
    },
    create(ctx) {
      const o = ctx.o, large = ctx.large;
      const items = feedItems(o.feed);
      const ROW = large ? 46 : 40;
      const list = h('div.gd-fd-list');
      const view = h('div.gd-fd-view', null, list);
      const count = h('span.gd-fd-count');
      let first = 0, nextAt = performance.now() + 7000, sliding = false;
      const root = h('div.gd-fd', { class: large ? 'gd-fd-large' : '' },
        h('div.gd-fd-head', null, node(FEED_ORB(uid('gdfo'))), h('div.gd-fd-title', null, h('b', null, 'Headlines'), h('span', null, (FEEDS[o.feed] || FEEDS.daily).name))),
        view,
        h('div.gd-fd-foot', null,
          h('button.gd-fd-nav', { type: 'button', 'aria-label': 'Previous headlines', 'data-tip': 'Previous', onclick: stopClick(() => advance(-1)) }, glyph('prev')),
          count,
          h('button.gd-fd-nav', { type: 'button', 'aria-label': 'Next headlines', 'data-tip': 'Next', onclick: stopClick(() => advance(1)) }, glyph('next'))),
        h('div.gd-fd-shine'));
      ctx.body.appendChild(root);
      function row(it) {
        const el = h('button.gd-fd-row', { type: 'button', style: { height: ROW + 'px' } }, h('i.gd-fd-dot'), h('span.gd-fd-text', null, it.title), h('span.gd-fd-ago', null, ago(it.min)));
        el.addEventListener('click', (e) => { e.stopPropagation(); openStory(it, el); });
        return el;
      }
      function draw() {
        list.replaceChildren(...items.map((_, i) => row(items[(first + i) % items.length])));
        list.style.transition = 'none';
        list.style.transform = 'none';
        count.textContent = `${first + 1} of ${items.length}`;
      }
      function advance(dir) {
        if (sliding) return;
        nextAt = performance.now() + 9000;
        if (dir < 0) { first = (first - 1 + items.length) % items.length; draw(); sfx('click'); return; }
        sliding = true;
        list.style.transition = 'transform .6s cubic-bezier(.3,.7,.3,1)';
        list.style.transform = `translateY(-${ROW}px)`;
        setTimeout(() => { first = (first + 1) % items.length; sliding = false; draw(); }, 620);
      }
      function openStory(it, anchor) {
        closeFlyout();
        const panel = h('div.gd-story', { role: 'dialog', 'aria-label': it.title },
          h('div.gd-story-src', null, node(FEED_ORB(uid('gdfs'))), h('span', null, it.feed + '  ·  ' + ago(it.min))),
          h('div.gd-story-title', null, it.title),
          h('p.gd-story-text', null, it.summary),
          h('div.gd-opt-foot', null, A.ui.button('Close', { size: 'sm', onClick: closeFlyout })));
        const f = A.ui.flyout(anchor, panel, { className: 'gd-flyout', onClose: () => { if (flyout === f) flyout = null; } });
        flyout = f;
        const r = ctx.el.getBoundingClientRect();
        const w = f.el.offsetWidth, hh = f.el.offsetHeight;
        let left = r.left + r.width / 2 > window.innerWidth / 2 ? r.left - w - 12 : r.right + 34;
        f.el.style.left = clamp(left, 6, window.innerWidth - w - 6) + 'px';
        f.el.style.top = clamp(anchor.getBoundingClientRect().top - 20, 6, window.innerHeight - hh - 6) + 'px';
        sfx('click');
      }
      draw();
      return {
        tick(now) {
          if (o.auto === false || now < nextAt) return;
          if (root.matches(':hover') || flyout) { nextAt = now + 2500; return; }
          advance(1);
          nextAt = now + 7000;
        },
      };
    },
  });

  // ============================================================ Currency
  // Rates per US dollar, as they looked around 2007, plus our own Bubbles.
  const CURRENCIES = [
    ['USD', 'US dollar', '$', 1], ['EUR', 'Euro', '€', 0.73], ['GBP', 'British pound', '£', 0.5], ['JPY', 'Japanese yen', '¥', 117.8],
    ['CAD', 'Canadian dollar', '$', 1.07], ['AUD', 'Australian dollar', '$', 1.21], ['CHF', 'Swiss franc', 'Fr', 1.22],
    ['CNY', 'Chinese yuan', '¥', 7.52], ['MXN', 'Mexican peso', '$', 10.9], ['SEK', 'Swedish krona', 'kr', 6.85], ['BUB', 'Bubbles', '', 42],
  ];
  const curBy = (code) => CURRENCIES.find((c) => c[0] === code) || CURRENCIES[0];
  function rateOf(code, salt) {
    const c = curBy(code);
    if (code === 'USD') return 1;
    const r = A.util.seeded(hash(code + dayKey() + ':' + (salt || 0)))();
    return c[3] * (1 + (r - 0.5) * (code === 'BUB' ? 0.1 : 0.016));
  }
  const decimals = (code) => (code === 'JPY' ? 0 : 2);
  function fmtMoney(v, code) {
    if (!isFinite(v)) return '';
    const d = decimals(code);
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function coin(code) {
    const c = curBy(code);
    return h('span.gd-cur-coin', { class: code === 'BUB' ? 'gd-cur-bubble' : ['EUR', 'CHF', 'SEK'].includes(code) ? 'gd-cur-silver' : '', 'aria-hidden': 'true' }, c[2]);
  }
  function currencyArt() {
    const coinSvg = (x, y, sym, a, b) => `<g><ellipse cx="${x}" cy="${y + 3}" rx="13" ry="4.5" fill="${b}"/><rect x="${x - 13}" y="${y - 1}" width="26" height="4" fill="${b}"/><ellipse cx="${x}" cy="${y - 1}" rx="13" ry="4.5" fill="${a}" stroke="${b}" stroke-width=".8"/><text x="${x}" y="${y + 1}" font-size="6" class="gd-f-aero" font-weight="700" fill="${b}" text-anchor="middle">${sym}</text></g>`;
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs>
      <radialGradient id="gdcu-g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff8d0"/><stop offset=".5" stop-color="#ffd84a"/><stop offset="1" stop-color="#e09a12"/></radialGradient>
      <radialGradient id="gdcu-b" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".6" stop-color="#8fd3ff" stop-opacity=".5"/><stop offset="1" stop-color="#1f8fe6" stop-opacity=".85"/></radialGradient>
      <radialGradient id="gdcu-sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b2a4a" stop-opacity=".3"/><stop offset="1" stop-color="#0b2a4a" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="30" cy="58" rx="24" ry="3" fill="url(#gdcu-sh)"/>
      ${coinSvg(24, 51, '$', 'url(#gdcu-g)', '#b8740a')}${coinSvg(24, 45, '€', 'url(#gdcu-g)', '#b8740a')}${coinSvg(24, 39, '£', 'url(#gdcu-g)', '#b8740a')}${coinSvg(24, 33, '¥', 'url(#gdcu-g)', '#b8740a')}
      <circle cx="46" cy="24" r="12" fill="url(#gdcu-b)" stroke="#fff" stroke-width="1"/><ellipse cx="42" cy="19" rx="4.5" ry="3" fill="#fff" opacity=".9"/><circle cx="50" cy="29" r="1.6" fill="#fff" opacity=".8"/>
      <circle cx="54" cy="44" r="5" fill="url(#gdcu-b)" stroke="#fff" stroke-width=".8"/><circle cx="52.4" cy="42.4" r="1.4" fill="#fff"/></svg>`;
  }

  define({
    id: 'currency',
    name: 'Currency',
    version: '1.2.2007',
    desc: 'Convert between dollars, euros, yen and more. It even knows the going rate for Bubbles.',
    keywords: ['money', 'exchange', 'convert', 'dollar', 'euro', 'bubbles'],
    sizeable: false,
    size: () => [158, 128],
    defaults: () => ({ a: 'USD', b: 'BUB', amt: 1, side: 'a' }),
    art: currencyArt,
    create(ctx) {
      const o = ctx.o;
      let salt = 0, updated = new Date();
      const opts = CURRENCIES.map((c) => [c[0], c[0]]);
      const mkRow = (side) => {
        const input = h('input.gd-cur-amt', { type: 'text', inputMode: 'decimal', spellcheck: false, 'aria-label': 'Amount' });
        const sel = A.ui.select({ options: opts, value: o[side], label: 'Currency', className: 'gd-cur-sel', onChange: (v) => { o[side] = v; coinBox.replaceChildren(coin(v)); sel.dataset.tip = curBy(v)[1]; convert(o.side); ctx.save(); } });
        sel.dataset.tip = curBy(o[side])[1];
        const coinBox = h('span.gd-cur-coinbox', null, coin(o[side]));
        input.addEventListener('input', () => {
          o.side = side;
          o.amt = parseFloat(input.value.replace(/,/g, ''));
          convert(side);
          ctx.save();
        });
        input.addEventListener('focus', () => input.select());
        input.addEventListener('keydown', (e) => e.stopPropagation());
        return { input, sel, el: h('div.gd-cur-row', null, coinBox, input, sel) };
      };
      const ra = mkRow('a'), rb = mkRow('b');
      const stamp = h('span.gd-cur-stamp');
      const swap = h('button.gd-cur-swap', { type: 'button', 'aria-label': 'Swap currencies', 'data-tip': 'Swap currencies', onclick: stopClick(() => {
        [o.a, o.b] = [o.b, o.a];
        o.side = o.side === 'a' ? 'b' : 'a';
        sfx('click');
        build();
      }) }, glyph('swap'));
      const refresh = h('button.gd-cur-refresh', { type: 'button', 'aria-label': 'Update rates', 'data-tip': 'Update rates', onclick: stopClick(() => {
        refresh.classList.add('spin');
        setTimeout(() => { refresh.classList.remove('spin'); salt++; updated = new Date(); convert(o.side); drawStamp(); sfx('ding'); }, 700);
      }) }, glyph('refresh'));
      const root = h('div.gd-cur', null,
        h('div.gd-cur-head', null, h('b', null, 'Currency'), refresh),
        ra.el, swap, rb.el,
        h('div.gd-cur-foot', null, stamp),
        h('div.gd-cur-shine'));
      ctx.body.appendChild(root);
      function convert(from) {
        const src = from === 'b' ? rb : ra, dst = from === 'b' ? ra : rb;
        const codeFrom = o[from === 'b' ? 'b' : 'a'], codeTo = o[from === 'b' ? 'a' : 'b'];
        const v = parseFloat(String(src.input.value).replace(/,/g, ''));
        dst.input.value = isFinite(v) ? fmtMoney((v / rateOf(codeFrom, salt)) * rateOf(codeTo, salt), codeTo) : '';
      }
      function drawStamp() {
        const one = rateOf(o.b, salt) / rateOf(o.a, salt);
        stamp.textContent = `1 ${o.a} = ${one >= 100 ? one.toFixed(1) : one.toFixed(one < 1 ? 4 : 2)} ${o.b}`;
        stamp.dataset.tip = 'Rates updated ' + A.util.fmtTime(updated);
      }
      function build() {
        [['a', ra], ['b', rb]].forEach(([side, r]) => {
          r.sel.value = o[side];
          r.sel.dataset.tip = curBy(o[side])[1];
          r.el.querySelector('.gd-cur-coinbox').replaceChildren(coin(o[side]));
        });
        const src = o.side === 'b' ? rb : ra;
        const amt = isFinite(o.amt) ? o.amt : 1;
        src.input.value = fmtMoney(amt, o[o.side === 'b' ? 'b' : 'a']).replace(/\.00$/, '');
        convert(o.side === 'b' ? 'b' : 'a');
        drawStamp();
        ctx.save();
      }
      build();
      return {};
    },
  });

  // ============================================================ Fish Food
  function jarSVG(u) {
    const rnd = A.util.seeded(7);
    const colors = ['#ff8a3d', '#ffd23f', '#e8453c', '#6fd04a', '#f58fb8', '#ffb347'];
    let flakes = '';
    for (let i = 0; i < 46; i++) {
      const x = 25 + rnd() * 46, y = 62 + rnd() * 40, s = 1.4 + rnd() * 2.2, a = Math.floor(rnd() * 180);
      flakes += `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(s * 1.6)}" height="${n1(s)}" rx=".5" fill="${colors[i % colors.length]}" transform="rotate(${a} ${n1(x)} ${n1(y)})"/>`;
    }
    let ridges = '';
    for (let x = 24; x <= 72; x += 4) ridges += `<line x1="${x}" y1="15" x2="${x}" y2="28" stroke="#c4541a" stroke-opacity=".35" stroke-width=".8"/>`;
    return `<svg viewBox="0 0 96 112" class="gd-ff-svg" aria-hidden="true"><defs>
      <linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dff6ff" stop-opacity=".8"/><stop offset=".22" stop-color="#ffffff" stop-opacity=".35"/><stop offset=".7" stop-color="#bfe6ff" stop-opacity=".22"/><stop offset="1" stop-color="#7cc8ff" stop-opacity=".62"/></linearGradient>
      <linearGradient id="${u}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd6b0"/><stop offset=".48" stop-color="#ff8a3d"/><stop offset=".5" stop-color="#ee6616"/><stop offset="1" stop-color="#ff9d57"/></linearGradient>
      <linearGradient id="${u}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc56b"/><stop offset="1" stop-color="#dc6a2e"/></linearGradient>
      <radialGradient id="${u}s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#001a33" stop-opacity=".38"/><stop offset="1" stop-color="#001a33" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}fish" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffe0a0"/><stop offset=".6" stop-color="#ff8a2a"/><stop offset="1" stop-color="#e05a10"/></radialGradient>
      <clipPath id="${u}c"><path d="M24 36h48v58a10 10 0 0 1-10 10H34a10 10 0 0 1-10-10z"/></clipPath></defs>
      <ellipse cx="48" cy="106" rx="31" ry="4.5" fill="url(#${u}s)"/>
      <g class="gd-ff-jar">
        <g clip-path="url(#${u}c)"><path d="M20 64Q34 57 48 61T78 59v52H20z" fill="url(#${u}f)"/>${flakes}</g>
        <path d="M22 34h52v60a12 12 0 0 1-12 12H34a12 12 0 0 1-12-12z" fill="url(#${u}g)" stroke="#5b89b4" stroke-opacity=".75"/>
        <rect x="26" y="28" width="44" height="8" rx="3" fill="#e8f6ff" fill-opacity=".65" stroke="#5b89b4" stroke-opacity=".6"/>
        <rect x="20" y="12" width="56" height="18" rx="5" fill="url(#${u}l)" stroke="#b8480f" stroke-width=".8"/>${ridges}
        <path d="M22 17a4.5 4.5 0 0 1 4.5-4h43a4.5 4.5 0 0 1 4.5 4v3c-15-3.4-37-3.4-52 0z" fill="#fff" opacity=".55"/>
        <rect x="29" y="63" width="38" height="25" rx="5" fill="#fff" fill-opacity=".93" stroke="#9ab8d3" stroke-width=".7"/>
        <path d="M37 72.5c3-3.4 8.5-3.4 11.5 0-3 3.4-8.5 3.4-11.5 0zM48.3 72.5l4.4-3.1v6.2z" fill="url(#${u}fish)" stroke="#c4541a" stroke-width=".5"/><circle cx="40.6" cy="71.8" r=".9" fill="#1e2a35"/>
        <circle cx="56" cy="69.5" r="1.4" fill="none" stroke="#7cc8ff" stroke-width=".7"/><circle cx="59" cy="66.8" r=".9" fill="none" stroke="#7cc8ff" stroke-width=".6"/>
        <text x="48" y="84.5" font-size="6.6" class="gd-f-zen" fill="#2f5f8c" text-anchor="middle">Fish food</text>
        <path d="M28.5 40c-2.2 16-2.2 38 1 56" stroke="#fff" stroke-width="3.6" stroke-linecap="round" opacity=".78" fill="none"/>
        <path d="M67.5 44c1 10 1 22 0 30" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".5" fill="none"/>
      </g></svg>`;
  }

  define({
    id: 'fishfood',
    name: 'Fish Food',
    version: '1.0.2007',
    desc: 'A little jar of flakes for the fish in your aquarium wallpaper. Give it a shake whenever they look hungry.',
    keywords: ['aquarium', 'fish', 'feed', 'tank', 'pet', 'food'],
    sizeable: false,
    size: () => [96, 128],
    defaults: () => ({ day: '', fed: 0, total: 0 }),
    art: () => jarSVG('gdffa'),
    create(ctx) {
      const o = ctx.o;
      const jar = h('button.gd-ff-btn', { type: 'button', 'aria-label': 'Feed the fish', 'data-tip': 'Feed the fish' });
      jar.innerHTML = jarSVG(uid('gdff'));
      const label = h('div.gd-ff-count');
      const root = h('div.gd-ff', null, jar, label);
      ctx.body.appendChild(root);
      let busy = false, tipEl = null, tipTimer = 0;
      const drawCount = () => {
        if (o.day !== dayKey()) { o.day = dayKey(); o.fed = 0; }
        label.textContent = o.fed ? (o.fed === 1 ? 'Fed once today' : `Fed ${o.fed} times today`) : 'Hungry fish';
      };
      function hideTip() { clearTimeout(tipTimer); if (tipEl) { const t = tipEl; tipEl = null; t.classList.add('out'); setTimeout(() => t.remove(), 250); } }
      function showTip() {
        hideTip();
        const canSwitch = A.theme.wallpapers && A.theme.wallpapers.has && A.theme.wallpapers.has('aquarium');
        tipEl = h('div.gd-ff-tip', { role: 'status' },
          h('span', null, 'Your fish live in the aquarium wallpaper.'),
          canSwitch ? h('button.ae-link', { type: 'button', onclick: stopClick(() => { A.theme.setWallpaper('aquarium'); hideTip(); }) }, 'Show me the fish') : null);
        tipEl.classList.toggle('right', ctx.el.getBoundingClientRect().left < 220);
        root.appendChild(tipEl);
        tipTimer = setTimeout(hideTip, 6000);
      }
      function flakes() {
        const colors = ['#ff8a3d', '#ffd23f', '#e8453c', '#6fd04a', '#f58fb8'];
        for (let i = 0; i < 9; i++) {
          const f = h('i.gd-ff-flake', { style: { background: colors[i % colors.length], '--dx': A.util.rand(-38, 38).toFixed(0) + 'px', '--dy': A.util.rand(-70, -34).toFixed(0) + 'px', '--r': A.util.rand(-200, 200).toFixed(0) + 'deg', animationDelay: (i * 0.04).toFixed(2) + 's' } });
          root.appendChild(f);
          setTimeout(() => f.remove(), 1300);
        }
      }
      jar.addEventListener('click', () => {
        if (busy) return;
        busy = true;
        setTimeout(() => { busy = false; }, 900);
        jar.classList.remove('shake');
        void jar.offsetWidth;
        jar.classList.add('shake');
        flakes();
        sfx('bubble');
        const wp = A.theme.currentWallpaper && A.theme.currentWallpaper();
        const id = wp && wp.id;
        if (id === 'aquarium' || id === 'betta') {
          hideTip();
          const W = window.innerWidth;
          const spots = id === 'betta' ? 1 : 4;
          for (let i = 0; i < spots; i++) {
            setTimeout(() => { try { A.theme.pointer('click', Math.round(A.util.rand(W * 0.18, W * 0.82)), Math.round(A.util.rand(36, 110))); } catch (e) { /* wallpaper changed */ } }, 160 + i * 170);
          }
          drawCount();
          o.fed++;
          o.total = (o.total || 0) + 1;
          drawCount();
          ctx.save();
        } else showTip();
      });
      drawCount();
      return {
        tick(now) { if (!this._t || now - this._t > 30000) { this._t = now; drawCount(); } },
        destroy() { hideTip(); },
      };
    },
  });

  // ============================================================ Gallery
  function artNode(def) {
    const wrap = h('span.gd-art');
    wrap.innerHTML = def.art();
    return wrap;
  }

  function buildGallery(win) {
    let query = '', selected = null, page = 0, perPage = 12, pages = 1;
    let details = !!A.store.get('gadgets.galleryDetails', false);
    let ghost = null;
    const cleanups = [];

    const search = A.ui.searchField({ placeholder: 'Search gadgets', label: 'Search gadgets', onInput: (v) => { query = v.trim().toLowerCase(); page = 0; render(); }, onSearch: (v) => { query = v.trim().toLowerCase(); page = 0; render(); } });
    search.classList.add('gd-gal-search');
    const pageLabel = h('span.gd-gal-page');
    const prevB = h('button.gd-gal-pg', { type: 'button', 'aria-label': 'Previous page', 'data-tip': 'Previous page', onclick: () => { page = Math.max(0, page - 1); render(); sfx('click'); } }, glyph('prev'));
    const nextB = h('button.gd-gal-pg', { type: 'button', 'aria-label': 'Next page', 'data-tip': 'Next page', onclick: () => { page = Math.min(pages - 1, page + 1); render(); sfx('click'); } }, glyph('next'));
    const grid = h('div.gd-gal-grid', { role: 'listbox', tabIndex: 0, 'aria-label': 'Gadgets' });
    const empty = h('div.gd-gal-empty', { hidden: true }, 'No gadgets match your search.');
    const info = h('div.gd-gal-info');
    const toggle = h('button.gd-gal-toggle', { type: 'button', onclick: () => { details = !details; A.store.set('gadgets.galleryDetails', details); drawDetails(); layout(); sfx('click'); } });
    const online = h('button.ae-link.gd-gal-online', { type: 'button', onclick: () => A.apps.launch('browser', { url: 'home.aerium.net' }) }, A.img('icons/globe'), 'Get more gadgets online');
    const root = h('div.gd-gal', null,
      h('div.gd-gal-top', null, h('div.gd-gal-pager', null, prevB, pageLabel, nextB), h('span.gd-gal-hint', null, 'Double-click or drag a gadget to your desktop'), search),
      h('div.gd-gal-stage', null, grid, empty),
      info,
      h('div.gd-gal-foot', null, toggle, h('span', { style: { flex: '1' } }), online));
    win.body.classList.add('gd-gal-body');
    win.body.appendChild(root);

    const matches = () => Array.from(DEFS.values()).filter((d) => !query || (d.name + ' ' + d.desc + ' ' + (d.keywords || []).join(' ')).toLowerCase().includes(query));

    function layout() {
      const cw = grid.clientWidth, ch = grid.clientHeight;
      if (!cw || !ch) return;
      const cols = Math.max(1, Math.floor((cw - 8) / 116));
      const rows = Math.max(1, Math.floor((ch - 14) / 118));
      const next = cols * rows;
      if (next !== perPage) { perPage = next; render(); }
    }

    function render() {
      const list = matches();
      pages = Math.max(1, Math.ceil(list.length / perPage));
      page = clamp(page, 0, pages - 1);
      const shown = list.slice(page * perPage, page * perPage + perPage);
      if (selected && !list.some((d) => d.id === selected)) selected = null;
      grid.replaceChildren(...shown.map(item));
      empty.hidden = list.length > 0;
      pageLabel.textContent = `Page ${page + 1} of ${pages}`;
      prevB.disabled = page === 0;
      nextB.disabled = page >= pages - 1;
      drawDetails();
    }

    function item(def) {
      const art = artNode(def);
      const refl = artNode(def);
      refl.classList.add('gd-art-refl');
      const el = h('div.gd-gal-item', {
        role: 'option', tabIndex: -1, dataset: { id: def.id }, 'aria-selected': String(def.id === selected),
        class: def.id === selected && 'sel', 'aria-label': def.name,
      }, h('div.gd-gal-art', null, art, refl), h('div.gd-gal-name', null, def.name));
      el.addEventListener('click', () => select(def.id));
      el.addEventListener('dblclick', () => addFromGallery(def.id));
      A.util.drag(el, {
        threshold: 6,
        onStart: (e) => {
          select(def.id);
          ghost = h('div.gd-ghost', null, artNode(def), h('span', null, def.name));
          document.getElementById('ae-overlays').appendChild(ghost);
          moveGhost(e);
        },
        onMove: (e) => moveGhost(e),
        onEnd: (e, moved) => {
          if (!moved || !ghost) return;
          const g = ghost;
          ghost = null;
          if (dropOk(e)) {
            const r = layer.getBoundingClientRect();
            const [w, hh] = def.size(def.defaults ? def.defaults() : {}, false);
            const k = gadgets.add(def.id, { x: e.clientX - r.left - w / 2, y: e.clientY - r.top - hh / 2 });
            g.remove();
            if (!k) sfx('error');
          } else {
            g.classList.add('back');
            setTimeout(() => g.remove(), 260);
          }
        },
      });
      return el;
    }
    function dropOk(e) {
      const wr = win.el.getBoundingClientRect();
      const inWin = e.clientX >= wr.left && e.clientX <= wr.right && e.clientY >= wr.top && e.clientY <= wr.bottom;
      const lr = layer && layer.getBoundingClientRect();
      return !inWin && lr && e.clientY < lr.bottom && e.clientY > lr.top;
    }
    function moveGhost(e) {
      if (!ghost) return;
      ghost.style.transform = `translate(${e.clientX - 36}px, ${e.clientY - 36}px)`;
      ghost.classList.toggle('ok', dropOk(e));
    }

    function select(id) {
      selected = id;
      grid.querySelectorAll('.gd-gal-item').forEach((el) => {
        const on = el.dataset.id === id;
        el.classList.toggle('sel', on);
        el.setAttribute('aria-selected', String(on));
      });
      drawDetails();
    }

    function drawDetails() {
      toggle.replaceChildren(h('span.gd-gal-chev', { class: details && 'open' }), details ? 'Hide details' : 'Show details');
      info.hidden = !details;
      if (!details) return;
      const def = DEFS.get(selected) || Array.from(DEFS.values())[0];
      const count = Array.from(live.values()).filter((r) => r.def.id === def.id).length;
      info.replaceChildren(
        h('div.gd-gal-info-art', null, artNode(def)),
        h('div.gd-gal-info-text', null,
          h('div.gd-gal-info-name', null, def.name),
          h('div.gd-gal-info-desc', null, def.desc),
          h('div.gd-gal-info-meta', null, h('span', null, 'Version ' + def.version), h('span', null, 'Aerium Gadgets'), count ? h('span', null, count === 1 ? 'On your desktop' : count + ' on your desktop') : null)),
        A.ui.button('Add', { tone: 'aqua', onClick: () => addFromGallery(def.id) }));
    }

    function addFromGallery(id) {
      const k = gadgets.add(id);
      if (k) drawDetails();
    }

    grid.addEventListener('keydown', (e) => {
      const items = Array.from(grid.querySelectorAll('.gd-gal-item'));
      if (!items.length) return;
      let i = items.findIndex((el) => el.dataset.id === selected);
      const cols = Math.max(1, Math.floor((grid.clientWidth - 8) / 116));
      const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
      if (e.key in moves) {
        e.preventDefault();
        i = clamp(i < 0 ? 0 : i + moves[e.key], 0, items.length - 1);
        select(items[i].dataset.id);
        items[i].focus();
      } else if (e.key === 'Enter' && selected) {
        e.preventDefault();
        addFromGallery(selected);
      }
    });
    const offLive = A.bus.on('gadgets:change', () => drawDetails());
    cleanups.push(offLive);

    render();
    requestAnimationFrame(layout);
    return {
      layout,
      destroy() { cleanups.forEach((f) => f()); if (ghost) { ghost.remove(); ghost = null; } },
    };
  }

  // ============================================================ API
  function init() {
    if (inited) return;
    layer = document.getElementById('ae-gadgets');
    if (!layer) return;
    inited = true;
    layer.classList.add('gd-layer');
    A.bus.on('screensaver:start', () => setPause('saver', true));
    A.bus.on('screensaver:stop', () => setPause('saver', false));
    A.bus.on('channels:open', () => setPause('channels', true));
    A.bus.on('channels:close', () => setPause('channels', false));
    document.addEventListener('visibilitychange', () => setPause('hidden', document.hidden));
    window.addEventListener('resize', A.util.debounce(() => { if (started) live.forEach(place); }, 120));
    window.addEventListener('pagehide', persist);
  }

  function start() {
    init();
    if (!layer || started) return;
    started = true;
    state = loadState();
    if (!state) firstRun();
    state.items.forEach((it) => mount(it, false));
    setPause('hidden', document.hidden);
    kick();
  }

  function stop() {
    if (!started) return;
    started = false;
    stopLoop();
    closeFlyout();
    persist();
    live.forEach((rec) => { destroyInst(rec); rec.el.remove(); });
    live.clear();
    state = null; // start() reads it back from the store
  }

  const gadgets = {
    init,
    start,
    stop,
    gallery() { return A.apps.launch('gadgets'); },
    // Adds a gadget. opts: { x, y } in desktop pixels, or { unique: true } to reuse one already open.
    add(id, opts = {}) {
      if (!DEFS.has(id)) return null;
      if (!state) state = loadState() || { v: 1, seq: 0, items: [] };
      if (opts.unique) {
        const existing = Array.from(live.values()).find((r) => r.def.id === id);
        if (existing) {
          existing.el.style.zIndex = ++zTop;
          existing.el.classList.remove('gd-flash');
          void existing.el.offsetWidth;
          existing.el.classList.add('gd-flash');
          return existing.item.k;
        }
      }
      const def = DEFS.get(id);
      const it = newItem(id);
      const [w, hh] = def.size(it.o, false);
      const pos = opts.x != null && opts.y != null ? { x: opts.x, y: opts.y } : freeSpot(w, hh);
      Object.assign(it, { ax: 'l', x: Math.round(pos.x), y: Math.round(pos.y) });
      state.items.push(it);
      if (started && layer) {
        const rec = mount(it, true);
        anchor(rec);
        place(rec);
      }
      persistSoon();
      sfx('pop');
      A.bus.emit('gadgets:change');
      return it.k;
    },
    list: () => Array.from(DEFS.values()).map((d) => ({ id: d.id, name: d.name, desc: d.desc, version: d.version })),
    open: () => Array.from(live.values()).map((r) => r.def.id),
    // Shared with Channels, so the News and Weather channels match the gadgets.
    headlines: (feed) => (feed ? feedItems(feed) : Object.keys(FEEDS).reduce((all, k) => all.concat(feedItems(k)), [])),
    weather(cityId) {
      const rec = Array.from(live.values()).find((r) => r.def.id === 'weather');
      const o = rec ? rec.item.o : { city: defaultCity(), unit: defaultUnit() };
      const city = cityById(cityId || o.city);
      const now = weatherNow(city);
      return { city: city.name, temp: Math.round(toUnit(now.temp, o.unit)), unit: o.unit, cond: now.icon, text: COND_TEXT[now.icon], phase: now.phase, hi: Math.round(toUnit(now.w.hi, o.unit)), lo: Math.round(toUnit(now.w.lo, o.unit)) };
    },
    cities: () => CITIES.map((c) => ({ id: c.id, name: c.name })),
    weatherIcon: (cond) => wxIcon(cond, uid('gdwx')),
  };
  A.gadgets = gadgets;

  A.apps.register({
    id: 'gadgets',
    name: 'Desktop Gadget Gallery',
    icon: 'icons/gadgets',
    color: '#3aa6f5',
    category: 'accessories',
    description: 'Add glossy mini-programs like a clock, weather and a CPU meter to your desktop.',
    keywords: ['gadget', 'gadgets', 'sidebar', 'clock', 'weather', 'cpu', 'calendar', 'widgets'],
    single: true,
    window: { width: 640, height: 470, minWidth: 470, minHeight: 360 },
    launch(win) {
      const g = buildGallery(win);
      return { onClose: () => g.destroy(), onResize: () => g.layout() };
    },
  });
})();
