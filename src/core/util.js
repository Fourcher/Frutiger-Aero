/* Aerium core utilities: DOM builder, events, math, drag helper, assets. */
(function () {
  'use strict';
  const A = (window.Aerium = window.Aerium || {});

  // ---------------------------------------------------------------- DOM
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden', 'tabIndex', 'readOnly', 'multiple', 'indeterminate', 'draggable', 'spellcheck', 'contentEditable', 'src', 'href', 'type', 'placeholder', 'title', 'id', 'name', 'min', 'max', 'step', 'rows', 'cols', 'maxLength', 'autofocus', 'htmlFor']);

  function applyProps(el, props, isSvg) {
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class' || k === 'className') {
        const cls = Array.isArray(v) ? v.filter(Boolean).join(' ') : v;
        if (cls) isSvg ? el.setAttribute('class', ((el.getAttribute('class') || '') + ' ' + cls).trim()) : el.classList.add(...cls.split(/\s+/).filter(Boolean));
      } else if (k === 'style') {
        if (typeof v === 'string') el.style.cssText += ';' + v;
        else for (const s in v) { if (v[s] == null) continue; s.startsWith('--') ? el.style.setProperty(s, v[s]) : (el.style[s] = v[s]); }
      } else if (k === 'dataset') {
        for (const d in v) el.dataset[d] = v[d];
      } else if (k === 'html') {
        el.innerHTML = v;
      } else if (k === 'text') {
        el.textContent = v;
      } else if (k === 'ref') {
        v(el);
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (!isSvg && PROPS.has(k)) {
        el[k] = v;
      } else if (v === true) {
        el.setAttribute(k, '');
      } else {
        el.setAttribute(k, v);
      }
    }
  }

  function appendChildren(el, children) {
    for (const c of children) {
      if (c == null || c === false || c === true) continue;
      if (Array.isArray(c)) appendChildren(el, c);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    }
  }

  // h('div.cls#id', {props}, ...children)
  function h(tag, props, ...children) {
    if (props instanceof Node || typeof props === 'string' || Array.isArray(props)) { children.unshift(props); props = null; }
    const m = /^([a-zA-Z0-9-]*)((?:[.#][\w-]+)*)$/.exec(tag) || ['', tag, ''];
    const el = document.createElement(m[1] || 'div');
    if (m[2]) {
      for (const part of m[2].match(/[.#][\w-]+/g)) {
        if (part[0] === '.') el.classList.add(part.slice(1));
        else el.id = part.slice(1);
      }
    }
    if (props) applyProps(el, props, false);
    appendChildren(el, children);
    return el;
  }

  function s(tag, props, ...children) {
    const el = document.createElementNS(SVG_NS, tag);
    if (props) applyProps(el, props, true);
    for (const c of children.flat()) if (c != null && c !== false) el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function css(text, id) {
    if (id && document.getElementById(id)) return document.getElementById(id);
    const st = document.createElement('style');
    if (id) st.id = id;
    st.textContent = text;
    document.head.appendChild(st);
    return st;
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------------------------------------------------------------- events
  function emitter() {
    const map = new Map();
    return {
      on(ev, fn) { if (!map.has(ev)) map.set(ev, new Set()); map.get(ev).add(fn); return () => this.off(ev, fn); },
      once(ev, fn) { const off = this.on(ev, (...a) => { off(); fn(...a); }); return off; },
      off(ev, fn) { map.get(ev) && map.get(ev).delete(fn); },
      emit(ev, ...args) {
        const set = map.get(ev);
        if (!set) return;
        for (const fn of Array.from(set)) {
          try { fn(...args); } catch (err) { console.error('[Aerium] listener for "' + ev + '" failed', err); }
        }
      },
    };
  }
  const bus = emitter();

  // ---------------------------------------------------------------- math
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad2 = (n) => String(n).padStart(2, '0');
  let uidN = 0;
  const uid = (p = 'ae') => p + (++uidN).toString(36) + Math.random().toString(36).slice(2, 6);
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const throttle = (fn, ms) => { let last = 0; return (...a) => { const n = Date.now(); if (n - last >= ms) { last = n; fn(...a); } }; };

  // ---------------------------------------------------------------- formatting
  function fmtBytes(n) {
    if (n < 1024) return n + ' bytes';
    const u = ['KB', 'MB', 'GB', 'TB'];
    let i = -1;
    do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
    return (n >= 100 ? Math.round(n) : n.toFixed(n >= 10 ? 1 : 2)) + ' ' + u[i];
  }
  function fmtTime(d = new Date(), seconds = false) {
    let hh = d.getHours();
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return hh + ':' + pad2(d.getMinutes()) + (seconds ? ':' + pad2(d.getSeconds()) : '') + ' ' + ampm;
  }
  function fmtDate(d = new Date()) { return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(); }
  function fmtDateTime(d) { d = d instanceof Date ? d : new Date(d); return fmtDate(d) + ' ' + fmtTime(d); }
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function fmtLongDate(d = new Date()) { return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function fmtDuration(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ':' + pad2(sec % 60); }

  // ---------------------------------------------------------------- drag helper
  // drag(el, {onStart(e) -> false to cancel, onMove(e, dx, dy), onEnd(e, moved), threshold, button})
  function drag(el, opts) {
    const threshold = opts.threshold == null ? 3 : opts.threshold;
    function down(e) {
      if (e.button !== (opts.button == null ? 0 : opts.button)) return;
      if (opts.filter && !opts.filter(e)) return;
      const sx = e.clientX, sy = e.clientY;
      let started = false;
      const pid = e.pointerId;
      function move(ev) {
        if (ev.pointerId !== pid) return;
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!started) {
          if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
          if (opts.onStart && opts.onStart(e, ev) === false) { cleanup(); return; }
          started = true;
          document.body.classList.add('ae-dragging');
        }
        opts.onMove && opts.onMove(ev, dx, dy);
      }
      function up(ev) {
        if (ev.pointerId !== pid) return;
        cleanup();
        if (started) document.body.classList.remove('ae-dragging');
        opts.onEnd && opts.onEnd(ev, started);
      }
      function cleanup() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      if (opts.onDown) opts.onDown(e);
    }
    el.addEventListener('pointerdown', down);
    return () => el.removeEventListener('pointerdown', down);
  }

  // ---------------------------------------------------------------- assets
  // Every icon/wallpaper is embedded as SVG text (src/generated/assets.js) and
  // served through blob: URLs, so it works from file:// and never taints canvases.
  const assetCache = new Map();
  function asset(key) {
    if (!key) return '';
    if (/^(data:|blob:|https?:|\.|\/)/.test(key)) return key;
    if (assetCache.has(key)) return assetCache.get(key);
    const svg = A.ASSET_SVG && A.ASSET_SVG[key];
    if (!svg) {
      console.warn('[Aerium] missing asset', key);
      return '';
    }
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    assetCache.set(key, url);
    return url;
  }
  const icon = (name) => asset(name.includes('/') ? name : 'icons/' + name);
  function img(key, props) { return h('img', Object.assign({ src: asset(key), alt: '', draggable: false }, props || {})); }
  const imageCache = new Map();
  function loadImage(src) {
    src = asset(src);
    if (imageCache.has(src)) return imageCache.get(src);
    const p = new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
    imageCache.set(src, p);
    return p;
  }

  // ---------------------------------------------------------------- misc
  function onIdle(fn) { (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(fn); }
  function isTyping(e) {
    const t = e.target;
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
  }
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hh = 0, ss = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      ss = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      hh = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh /= 6;
    }
    return [Math.round(hh * 360), Math.round(ss * 100), Math.round(l * 100)];
  }

  A.util = {
    h, s, $, $$, css, escapeHTML, emitter, clamp, lerp, rand, randInt, pick, sleep, pad2, uid, seeded, shuffle,
    debounce, throttle, fmtBytes, fmtTime, fmtDate, fmtDateTime, fmtLongDate, fmtDuration, MONTHS, DAYS, drag,
    onIdle, isTyping, downloadBlob, hexToRgb, rgbToHsl, loadImage,
  };
  A.h = h;
  A.bus = bus;
  A.asset = asset;
  A.icon = icon;
  A.img = img;
})();
