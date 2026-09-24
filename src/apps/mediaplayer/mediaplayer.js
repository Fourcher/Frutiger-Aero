/* Aerium Media Player: dark glossy glass, a big glowing play orb with
   prev/next wings, a Library with album art and star ratings, a draggable
   Now Playing list, hypnotic visualizations (see visualizers.js), sample
   videos, and charming Rip / Burn / Sync tabs. Music is synthesized live by
   Aerium.music; your own audio files play through the same analyser. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, s, clamp } = A.util;
  const TAU = Math.PI * 2;

  // ================================================================ glyphs
  const svg = (vb, kids, cls) => s('svg', { viewBox: vb, class: cls || 'mp-g', 'aria-hidden': 'true', focusable: 'false' }, kids);
  const G = {
    play: () => svg('0 0 24 24', [s('path', { d: 'M8.6 5.2v13.6a.6.6 0 0 0 .9.5l10.6-6.8a.6.6 0 0 0 0-1L9.5 4.7a.6.6 0 0 0-.9.5z', fill: 'currentColor' })]),
    pause: () => svg('0 0 24 24', [s('rect', { x: 6.2, y: 5, width: 4.2, height: 14, rx: 1.1, fill: 'currentColor' }), s('rect', { x: 13.6, y: 5, width: 4.2, height: 14, rx: 1.1, fill: 'currentColor' })]),
    stop: () => svg('0 0 24 24', [s('rect', { x: 6.5, y: 6.5, width: 11, height: 11, rx: 1.8, fill: 'currentColor' })]),
    prev: () => svg('0 0 24 24', [s('rect', { x: 4.5, y: 6, width: 2.4, height: 12, rx: 0.8, fill: 'currentColor' }), s('path', { d: 'M13 6.2v11.6L6.8 12zM19.5 6.2v11.6L13.3 12z', fill: 'currentColor' })]),
    next: () => svg('0 0 24 24', [s('rect', { x: 17.1, y: 6, width: 2.4, height: 12, rx: 0.8, fill: 'currentColor' }), s('path', { d: 'M11 6.2v11.6l6.2-5.8zM4.5 6.2v11.6l6.2-5.8z', fill: 'currentColor' })]),
    shuffle: () => svg('0 0 24 24', [s('path', { d: 'M3 7h3.5c4.5 0 6.5 10 11 10H20M3 17h3.5c1.6 0 2.8-1.2 3.8-2.8M13.6 9.8C14.6 8.2 15.8 7 17.5 7H20', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round' }), s('path', { d: 'M18 4.3L21 7l-3 2.7zM18 14.3l3 2.7-3 2.7z', fill: 'currentColor' })]),
    repeat: () => svg('0 0 24 24', [s('path', { d: 'M5 11V9.5A2.5 2.5 0 0 1 7.5 7H18M19 13v1.5a2.5 2.5 0 0 1-2.5 2.5H6', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round' }), s('path', { d: 'M16.5 4l3.2 3-3.2 3zM7.5 14L4.3 17l3.2 3z', fill: 'currentColor' })]),
    vol: (lvl) => svg('0 0 24 24', [
      s('path', { d: 'M4 9.3h3.2L11.5 5.5v13l-4.3-3.8H4z', fill: 'currentColor' }),
      lvl > 0 ? s('path', { d: 'M14.3 9.2a4 4 0 0 1 0 5.6', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' }) : null,
      lvl > 1 ? s('path', { d: 'M16.6 6.9a7.3 7.3 0 0 1 0 10.2', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' }) : null,
      lvl > 2 ? s('path', { d: 'M18.9 4.6a10.6 10.6 0 0 1 0 14.8', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' }) : null,
    ]),
    mute: () => svg('0 0 24 24', [s('path', { d: 'M4 9.3h3.2L11.5 5.5v13l-4.3-3.8H4z', fill: 'currentColor' }), s('path', { d: 'M15 9.5l5 5M20 9.5l-5 5', stroke: '#ff8a70', 'stroke-width': 2, 'stroke-linecap': 'round' })]),
    full: () => svg('0 0 24 24', [s('path', { d: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })]),
    list: () => svg('0 0 24 24', [s('path', { d: 'M5 7h14M5 12h14M5 17h9', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' })]),
    folder: () => svg('0 0 24 24', [s('path', { d: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2l1.8 2h9A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z', fill: 'currentColor', opacity: 0.9 })]),
    back: () => svg('0 0 24 24', [s('path', { d: 'M14.5 6l-6 6 6 6', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })]),
    fwd: () => svg('0 0 24 24', [s('path', { d: 'M9.5 6l6 6-6 6', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })]),
    down: () => svg('0 0 10 10', [s('path', { d: 'M2 3.5l3 3 3-3', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })], 'mp-g mp-g-down'),
    star: () => svg('0 0 20 20', [s('path', { d: 'M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z' })], 'mp-star-g'),
    eq: () => h('span.mp-eq', { 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    note: () => svg('0 0 24 24', [s('path', { d: 'M9 17.5V6.2l10-2.2v11', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }), s('ellipse', { cx: 6.8, cy: 17.6, rx: 2.8, ry: 2.1, fill: 'currentColor' }), s('ellipse', { cx: 16.8, cy: 15.2, rx: 2.8, ry: 2.1, fill: 'currentColor' })]),
  };

  // ================================================================ album art
  // Every album gets its own glossy cover, painted once on a canvas and cached.
  const artCache = new Map();
  let fontsReady = false;
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('300 20px Selawik'), document.fonts.load('10px Michroma'), document.fonts.load('700 20px "M PLUS Rounded 1c"')])
      .then(() => { fontsReady = true; artCache.clear(); A.bus.emit('mediaplayer:art'); }, () => { fontsReady = true; });
  }
  function artKey(item) { return item.kind === 'video' ? 'video:' + item.id : item.kind === 'file' ? 'file' : item.album; }
  function artFor(item, size) {
    const key = artKey(item) + '@' + (size || 256);
    if (artCache.has(key)) return artCache.get(key);
    const S = size || 256, c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    x.scale(S / 256, S / 256);
    try { paintArt(x, item); } catch (e) { x.fillStyle = '#123'; x.fillRect(0, 0, 256, 256); }
    gloss(x);
    const url = c.toDataURL('image/png');
    const out = { url, canvas: c };
    if (fontsReady || !document.fonts) artCache.set(key, out);
    return out;
  }
  function lin(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function rad(x, cx, cy, r0, r1, stops) { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function gloss(x) {
    x.fillStyle = lin(x, 0, 0, 0, 118, [[0, 'rgba(255,255,255,0.34)'], [1, 'rgba(255,255,255,0)']]);
    x.beginPath();
    x.moveTo(0, 0); x.lineTo(256, 0); x.lineTo(256, 92); x.quadraticCurveTo(128, 128, 0, 104); x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.35)';
    x.lineWidth = 2;
    x.strokeRect(1, 1, 254, 254);
    x.strokeStyle = 'rgba(0,0,0,0.35)';
    x.lineWidth = 1;
    x.strokeRect(0.5, 0.5, 255, 255);
  }
  function label(x, title, artist, o) {
    o = o || {};
    x.save();
    x.textBaseline = 'alphabetic';
    x.fillStyle = o.ink || '#ffffff';
    x.shadowColor = o.shadow || 'rgba(0,30,60,0.55)';
    x.shadowBlur = 6;
    x.font = o.font || '300 27px Selawik, "Segoe UI", sans-serif';
    x.fillText(title, o.x || 18, o.y || 222);
    x.shadowBlur = 3;
    x.font = '8.5px Michroma, Selawik, sans-serif';
    if ('letterSpacing' in x) x.letterSpacing = '2px';
    x.globalAlpha = 0.9;
    x.fillText(artist.toUpperCase(), (o.x || 18) + 1, (o.y || 222) + 18);
    x.restore();
  }
  function puff(x, cx, cy, k) {
    [[0, 0, 26], [-26, 8, 18], [26, 7, 20], [-10, -14, 20], [13, -12, 17], [-44, 14, 12], [44, 14, 13]].forEach(([dx, dy, r]) => {
      x.fillStyle = lin(x, 0, cy + (dy - r) * k, 0, cy + (dy + r) * k, [[0, '#ffffff'], [0.7, '#f1f8ff'], [1, '#cfe4f5']]);
      x.beginPath(); x.arc(cx + dx * k, cy + dy * k, r * k, 0, TAU); x.fill();
    });
  }
  function bubbleAt(x, cx, cy, r) {
    const sp = A.visualizers && A.visualizers._h ? A.visualizers._h.bubble() : null;
    if (sp) x.drawImage(sp, cx - r, cy - r, r * 2, r * 2);
  }
  function star(x, cx, cy, r0, r1, n, rot) {
    x.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, r = i % 2 ? r0 : r1; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    x.closePath();
  }
  function paintArt(x, item) {
    const key = artKey(item);
    const rnd = A.util.seeded(key.length * 131 + key.charCodeAt(0));
    if (key === 'Clear Skies') {
      x.fillStyle = lin(x, 0, 0, 0, 256, [[0, '#1a78d0'], [0.55, '#5db6f4'], [1, '#d9f4ff']]);
      x.fillRect(0, 0, 256, 256);
      x.fillStyle = rad(x, 62, 58, 0, 120, [[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,250,215,0.95)'], [0.4, 'rgba(255,240,190,0.35)'], [1, 'rgba(255,240,190,0)']]);
      x.fillRect(0, 0, 256, 256);
      puff(x, 160, 150, 1.15); puff(x, 46, 182, 0.75); puff(x, 222, 96, 0.55);
      [[206, 196, 20], [228, 160, 11], [186, 132, 8], [236, 214, 7], [170, 206, 6]].forEach(([a, b, r]) => bubbleAt(x, a, b, r));
      label(x, 'Clear Skies', item.artist || 'Crystal Lagoon');
    } else if (key === 'Upper Level') {
      x.fillStyle = lin(x, 0, 0, 0, 256, [[0, '#62bdf6'], [0.48, '#ffd89a'], [1, '#ff9f6b']]);
      x.fillRect(0, 0, 256, 256);
      x.save();
      x.beginPath(); x.arc(176, 120, 56, 0, TAU); x.clip();
      x.fillStyle = lin(x, 0, 64, 0, 176, [[0, '#fff7cf'], [1, '#ffb347']]);
      x.fillRect(110, 60, 140, 130);
      x.fillStyle = '#ffc98a';
      for (let i = 0; i < 6; i++) x.fillRect(110, 124 + i * 9, 140, 2 + i * 0.8);
      x.restore();
      x.save();
      x.translate(0, 256); x.rotate(-0.62);
      x.fillStyle = lin(x, 0, -38, 0, 10, [[0, '#f7f9fb'], [0.5, '#c9d3dd'], [1, '#8e9aa6']]);
      x.fillRect(-20, -34, 400, 40);
      x.fillStyle = 'rgba(40,50,60,0.35)';
      for (let i = 0; i < 26; i++) x.fillRect(-20 + i * 15, -30, 2, 32);
      x.fillStyle = '#26303a'; x.fillRect(-20, -46, 400, 8);
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(-20, -45, 400, 2);
      x.restore();
      label(x, 'Upper Level', item.artist || 'Sky Mall Orchestra', { y: 40, shadow: 'rgba(120,60,0,0.45)' });
    } else if (key === 'Northern Water') {
      x.fillStyle = lin(x, 0, 0, 0, 256, [[0, '#020a1c'], [0.6, '#062642'], [1, '#0a3a4a']]);
      x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(220,240,255,' + (0.3 + rnd() * 0.6) + ')'; x.fillRect(rnd() * 256, rnd() * 140, 1.2, 1.2); }
      x.globalCompositeOperation = 'lighter';
      [[150, 70, 0], [172, 95, 1.3], [195, 60, 2.4]].forEach(([hue, base, ph]) => {
        for (let px = 0; px < 256; px += 3) {
          const y = base + Math.sin(px / 256 * TAU * 1.2 + ph) * 22, hh = 34 + Math.sin(px * 0.05 + ph) * 12;
          x.fillStyle = lin(x, 0, y - hh, 0, y + 6, [[0, 'hsla(' + hue + ',90%,60%,0)'], [0.8, 'hsla(' + hue + ',90%,62%,0.32)'], [1, 'hsla(' + hue + ',90%,80%,0)']]);
          x.fillRect(px, y - hh, 3, hh + 6);
        }
      });
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#031020';
      x.beginPath(); x.moveTo(0, 190);
      [[30, 160], [60, 178], [96, 146], [130, 176], [168, 150], [206, 180], [236, 162], [256, 176], [256, 196], [0, 196]].forEach(([a, b]) => x.lineTo(a, b));
      x.fill();
      x.fillStyle = lin(x, 0, 196, 0, 256, [[0, '#0b3d52'], [1, '#03101e']]);
      x.fillRect(0, 196, 256, 60);
      x.strokeStyle = 'rgba(120,255,210,0.25)';
      for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(20 + rnd() * 80, 204 + i * 6); x.lineTo(120 + rnd() * 120, 204 + i * 6); x.stroke(); }
      label(x, 'Northern Water', item.artist || 'Aqua Pura', { font: '300 24px Selawik, sans-serif', y: 234 });
    } else if (key === 'Fresh Mix') {
      x.fillStyle = rad(x, 128, 110, 0, 190, [[0, '#e2ffd6'], [0.42, '#8fe05a'], [1, '#1a9fcf']]);
      x.fillRect(0, 0, 256, 256);
      x.fillStyle = 'rgba(255,255,255,0.16)';
      for (let i = 0; i < 16; i += 2) { const a0 = (i / 16) * TAU, a1 = ((i + 1) / 16) * TAU; x.beginPath(); x.moveTo(128, 110); x.arc(128, 110, 260, a0, a1); x.closePath(); x.fill(); }
      x.save();
      x.translate(128, 118);
      x.beginPath();
      x.moveTo(0, -70); x.bezierCurveTo(22, -38, 48, -12, 48, 14); x.arc(0, 14, 48, 0, Math.PI); x.bezierCurveTo(-48, -12, -22, -38, 0, -70);
      x.fillStyle = lin(x, 0, -70, 0, 62, [[0, '#c9f6ff'], [0.55, '#2cc6ea'], [1, '#0a6fa8']]);
      x.fill();
      x.strokeStyle = 'rgba(8,80,130,0.6)'; x.lineWidth = 2; x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.75)';
      x.beginPath(); x.ellipse(-18, -4, 9, 20, 0.35, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.45)';
      x.beginPath(); x.ellipse(14, 40, 18, 6, 0, 0, TAU); x.fill();
      x.restore();
      star(x, 206, 52, 26, 34, 12, 0.2);
      x.fillStyle = lin(x, 0, 18, 0, 86, [[0, '#fff3a8'], [0.6, '#ffd62e'], [1, '#f08a12']]);
      x.fill();
      x.strokeStyle = '#c86a0a'; x.lineWidth = 1.5; x.stroke();
      x.save(); x.translate(206, 55); x.rotate(-0.22); x.fillStyle = '#6b3a00'; x.font = '700 13px "M PLUS Rounded 1c", Selawik, sans-serif'; x.textAlign = 'center'; x.fillText('FRESH!', 0, 4); x.restore();
      label(x, 'Fresh Mix', item.artist || 'DJ Hydrate', { font: '700 28px "M PLUS Rounded 1c", Selawik, sans-serif', shadow: 'rgba(0,70,110,0.7)' });
    } else if (key === 'Glass City') {
      x.fillStyle = lin(x, 0, 0, 0, 256, [[0, '#030b1e'], [0.6, '#0b2a52'], [1, '#0f4a6e']]);
      x.fillRect(0, 0, 256, 256);
      x.fillStyle = rad(x, 196, 52, 0, 40, [[0, 'rgba(240,250,255,0.95)'], [0.35, 'rgba(200,235,255,0.5)'], [1, 'rgba(200,235,255,0)']]);
      x.fillRect(150, 10, 90, 90);
      const towers = [[8, 28, 118], [36, 34, 150], [70, 26, 96], [96, 40, 170], [136, 30, 128], [166, 36, 156], [202, 26, 110], [228, 30, 136]];
      towers.forEach(([tx, tw, th]) => {
        const top = 212 - th;
        x.fillStyle = lin(x, tx, 0, tx + tw, 0, [[0, '#3f95d8'], [0.4, '#1c5f9e'], [1, '#0b2f5c']]);
        x.fillRect(tx, top, tw, th);
        for (let wy = top + 6; wy < 206; wy += 8) for (let wx = tx + 4; wx < tx + tw - 4; wx += 6) if (rnd() < 0.45) { x.fillStyle = 'rgba(190,235,255,' + (0.3 + rnd() * 0.5) + ')'; x.fillRect(wx, wy, 3, 4); }
        x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(tx, top, 1.5, th);
        x.save(); x.globalAlpha = 0.28; x.translate(0, 424); x.scale(1, -1); x.fillStyle = '#2a78bd'; x.fillRect(tx, 212, tw, Math.min(40, th * 0.3)); x.restore();
      });
      x.fillStyle = lin(x, 0, 60, 256, 200, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.10)'], [0.56, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
      x.fillRect(0, 0, 256, 212);
      x.fillStyle = 'rgba(95,220,255,0.9)'; x.fillRect(0, 212, 256, 2);
      x.fillStyle = 'rgba(95,220,255,0.25)'; x.fillRect(0, 209, 256, 8);
      label(x, 'Glass City', item.artist || 'The Glassmen', { y: 40 });
    } else if (key === 'Channels') {
      x.fillStyle = '#f5f8fb'; x.fillRect(0, 0, 256, 256);
      x.fillStyle = '#e7edf3';
      for (let y = 0; y < 256; y += 4) x.fillRect(0, y, 256, 2);
      const cols = ['#3aa6f5', '#35c93a', '#ffd62e', '#1fb4d8', '#f59a2a', '#8fd3ff'];
      for (let i = 0; i < 6; i++) {
        const tx = 22 + (i % 3) * 74, ty = 36 + Math.floor(i / 3) * 62;
        A.visualizers._h.roundRect(x, tx, ty, 64, 50, 10);
        x.fillStyle = lin(x, 0, ty, 0, ty + 50, [[0, '#ffffff'], [1, '#e9eff5']]);
        x.fill();
        x.strokeStyle = '#9fb3c6'; x.lineWidth = 1.2; x.stroke();
        x.fillStyle = cols[i];
        x.beginPath(); x.arc(tx + 32, ty + 25, 11, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.ellipse(tx + 29, ty + 20, 6, 3.5, 0, 0, TAU); x.fill();
      }
      label(x, 'Channels', item.artist || 'Aerium Sound Team', { font: '500 28px "M PLUS Rounded 1c", Selawik, sans-serif', ink: '#4f6070', shadow: 'rgba(255,255,255,0.9)' });
    } else if (key === 'Shop') {
      x.fillStyle = lin(x, 0, 0, 0, 256, [[0, '#e6f6ff'], [1, '#b8e2ff']]);
      x.fillRect(0, 0, 256, 256);
      x.fillStyle = 'rgba(255,255,255,0.35)';
      for (let y = 0; y < 256; y += 6) x.fillRect(0, y, 256, 2);
      x.strokeStyle = '#1a7fcf'; x.lineWidth = 7; x.lineCap = 'round';
      x.beginPath(); x.arc(128, 86, 30, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
      x.beginPath(); x.moveTo(74, 84); x.lineTo(182, 84); x.lineTo(196, 190); x.lineTo(60, 190); x.closePath();
      x.fillStyle = lin(x, 0, 84, 0, 190, [[0, '#9fdcff'], [0.5, '#3aa6f5'], [1, '#1a7fcf']]);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.45)';
      x.beginPath(); x.moveTo(78, 88); x.lineTo(178, 88); x.lineTo(182, 124); x.quadraticCurveTo(128, 136, 74, 124); x.closePath(); x.fill();
      [[196, 70, 12], [214, 96, 9], [52, 60, 8]].forEach(([cx, cy, r]) => {
        x.fillStyle = rad(x, cx - r * 0.3, cy - r * 0.3, 0, r, [[0, '#fff3a8'], [0.6, '#ffd62e'], [1, '#f08a12']]);
        x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
      });
      label(x, 'Shop', item.artist || 'Aerium Sound Team', { font: '700 32px "M PLUS Rounded 1c", Selawik, sans-serif', ink: '#0b4f86', shadow: 'rgba(255,255,255,0.9)', y: 226 });
    } else if (key === 'video:aquarium') {
      x.fillStyle = lin(x, 0, 0, 0, 256, [[0, '#2cc6ea'], [0.5, '#0a6fa8'], [1, '#063462']]);
      x.fillRect(0, 0, 256, 256);
      x.fillStyle = '#d9c28a'; x.beginPath(); x.moveTo(0, 220); x.quadraticCurveTo(128, 200, 256, 222); x.lineTo(256, 256); x.lineTo(0, 256); x.fill();
      x.fillStyle = lin(x, 0, 100, 0, 170, [[0, '#ffb347'], [1, '#f07a12']]);
      x.beginPath(); x.ellipse(120, 128, 42, 24, 0, 0, TAU); x.fill();
      x.beginPath(); x.moveTo(160, 128); x.lineTo(196, 104); x.lineTo(190, 128); x.lineTo(196, 152); x.closePath(); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(96, 122, 6, 0, TAU); x.fill();
      x.fillStyle = '#123'; x.beginPath(); x.arc(95, 122, 3, 0, TAU); x.fill();
      [[70, 80, 8], [60, 50, 5], [76, 30, 4]].forEach(([a, b, r]) => bubbleAt(x, a, b, r));
    } else if (key === 'video:clouds') {
      x.fillStyle = lin(x, 0, 0, 0, 256, [[0, '#1c7fd6'], [1, '#bfe8ff']]);
      x.fillRect(0, 0, 256, 256);
      puff(x, 90, 100, 1); puff(x, 196, 160, 0.8); puff(x, 60, 200, 0.6);
    } else {
      x.fillStyle = lin(x, 0, 0, 256, 256, [[0, '#2e4c73'], [0.5, '#152a4a'], [1, '#0a1428']]);
      x.fillRect(0, 0, 256, 256);
      x.fillStyle = rad(x, 128, 120, 0, 110, [[0, 'rgba(90,200,255,0.4)'], [1, 'rgba(90,200,255,0)']]);
      x.fillRect(0, 0, 256, 256);
      x.save(); x.translate(64, 50); x.scale(5.2, 5.2);
      x.fillStyle = 'rgba(210,240,255,0.9)';
      x.fill(new Path2D('M9 17.5V6.2l10-2.2v11.3a2.8 2.1 0 1 1-1.8-2V6.3L10.8 7.7v9.8a2.8 2.1 0 1 1-1.8-2z'));
      x.restore();
      label(x, item.album && item.album !== 'Unknown Album' ? item.album : 'My Music', item.artist || 'Unknown Artist', { y: 230 });
    }
  }

  // ================================================================ library data
  const SAMPLE_DIR = '/Music/Sample Music';
  function vfsPathFor(id) {
    try {
      const list = A.fs.list(SAMPLE_DIR);
      const hit = list.find((it) => String(A.fs.read(it.path) || '') === 'track:' + id);
      return hit ? hit.path : null;
    } catch (e) { return null; }
  }
  function trackItem(t) {
    return { kind: 'track', id: t.id, title: t.title, artist: t.artist, album: t.album, genre: t.genre, year: t.year, duration: t.duration, color: t.color, no: t.no, key: 'track:' + t.id };
  }
  const VIDEOS = {
    aquarium: { kind: 'video', id: 'aquarium', title: 'Fish', artist: 'Sample Videos', album: 'Sample Videos', genre: 'Video', year: 2007, color: '#1fb4d8', key: 'video:aquarium' },
    clouds: { kind: 'video', id: 'clouds', title: 'Clouds', artist: 'Sample Videos', album: 'Sample Videos', genre: 'Video', year: 2007, color: '#7cc8ff', key: 'video:clouds' },
  };
  function videoItem(id) {
    const v = VIDEOS[id];
    if (!v) return null;
    const tr = A.music.getTrack('video:' + id);
    return Object.assign({}, v, { duration: tr ? tr.duration : 60 });
  }
  function itemFromKey(key) {
    if (!key) return null;
    if (key.startsWith('track:')) { const t = A.music.getTrack(key.slice(6)); return t && !t.id.startsWith('video:') ? trackItem(t) : null; }
    if (key.startsWith('video:')) return videoItem(key.slice(6));
    return null;
  }
  const fmt = (sec) => A.util.fmtDuration(sec || 0);
  function fmtLong(sec) {
    sec = Math.round(sec || 0);
    const m = Math.round(sec / 60);
    if (sec < 60) return sec + ' seconds';
    return m === 1 ? '1 minute' : m + ' minutes';
  }

  // ================================================================ player shell
  const TABS = [['nowplaying', 'Now Playing'], ['library', 'Library'], ['rip', 'Rip'], ['burn', 'Burn'], ['sync', 'Sync']];
  const TINTS = [['aqua', 'Aqua', 205], ['teal', 'Lagoon', 182], ['leaf', 'Leaf', 118], ['sun', 'Sunset', 36]];

  function createPlayer(win, args) {
    const store = A.store;
    const P = {
      win, M: A.music, el: {},
      tab: store.get('mediaplayer.tab', 'nowplaying'),
      history: [], future: [],
      visId: store.get('mediaplayer.vis', 'glass-bars'),
      shuffle: !!store.get('mediaplayer.shuffle', false),
      repeat: store.get('mediaplayer.repeat', 'off'),
      showList: store.get('mediaplayer.showList', true),
      ratings: store.get('mediaplayer.ratings', {}) || {},
      queue: [], qi: -1, owned: false, order: null,
      files: [],
      libView: store.get('mediaplayer.libView', 'songs'), libFilter: null, libSort: { key: 'album', dir: 1 }, search: '', selKey: null,
      listSel: -1, burn: [], sync: [],
      fs: null, vis: null, video: null, closed: false, minimized: false,
      offs: [], timers: new Set(),
    };
    P.queue = (store.get('mediaplayer.list', null) || []).map(itemFromKey).filter(Boolean);
    if (!P.queue.length) P.queue = A.music.tracks.slice(0, 6).map(trackItem);
    P.later = (fn, ms) => { const id = setTimeout(() => { P.timers.delete(id); if (!P.closed) fn(); }, ms); P.timers.add(id); return id; };
    P.saveList = () => store.set('mediaplayer.list', P.queue.filter((it) => it.kind !== 'file').map((it) => it.key));
    P.rating = (key) => P.ratings[key] || 0;
    P.setRating = (key, n) => {
      P.ratings[key] = n;
      if (!n) delete P.ratings[key];
      store.set('mediaplayer.ratings', P.ratings);
      A.sound.play(n ? 'select' : 'back');
    };
    P.current = () => (P.qi >= 0 ? P.queue[P.qi] : null);
    P.matches = (it, c) => {
      if (!it || !c) return false;
      if (it.kind === 'track') return c.id === it.id;
      if (it.kind === 'video') return c.id === 'video:' + it.id;
      return !!c.url && c.url === it.url;
    };

    const root = h('div.mp', { tabIndex: -1 });
    P.root = root;
    applyTint(P, store.get('mediaplayer.tint', 'aqua'));
    win.body.classList.add('mp-body');
    win.body.appendChild(root);

    buildTop(P);
    buildNowPlaying(P);
    buildLibrary(P);
    buildDiscViews(P);
    buildList(P);
    buildTransport(P);
    root.append(P.el.top, h('div.mp-main', null, h('div.mp-views', null, P.el.np, P.el.lib, P.el.rip, P.el.burn, P.el.sync), P.el.list), P.el.bar);
    wirePlayback(P);
    wireKeys(P);
    return P;
  }

  function applyTint(P, id) {
    const t = TINTS.find((x) => x[0] === id) || TINTS[0];
    P.tint = t[0];
    P.root.style.setProperty('--mp-h', t[2]);
  }

  // Small glossy transport button.
  function tbtn(cls, label, glyph, onClick) {
    const b = h('button.mp-btn', { type: 'button', class: cls, 'aria-label': label, 'data-tip': label }, glyph);
    b.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); });
    return b;
  }

  // Glossy horizontal slider used for seeking and volume.
  function makeSlider(o) {
    const fill = h('div.mp-sl-fill'), thumb = h('div.mp-sl-thumb');
    const track = h('div.mp-sl-track', null, fill, thumb);
    const el = h('div.mp-sl', { class: o.cls, role: 'slider', tabIndex: 0, 'aria-label': o.label, 'aria-valuemin': 0, 'aria-valuemax': 100 }, track);
    let v = o.value || 0, dragging = false;
    const paint = (x) => {
      v = clamp(x, 0, 1);
      fill.style.width = (v * 100).toFixed(3) + '%';
      thumb.style.left = (v * 100).toFixed(3) + '%';
      el.setAttribute('aria-valuenow', Math.round(v * 100));
    };
    const at = (e) => { const r = track.getBoundingClientRect(); return clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1); };
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || el.classList.contains('disabled')) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('drag');
      paint(at(e));
      if (o.onInput) o.onInput(v, true);
      el.focus({ preventScroll: true });
    });
    el.addEventListener('pointermove', (e) => {
      if (o.onHover) o.onHover(at(e), e);
      if (!dragging) return;
      paint(at(e));
      if (o.onInput) o.onInput(v, true);
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('drag');
      if (o.onChange) o.onChange(v);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', () => { if (o.onHover) o.onHover(null); });
    el.addEventListener('keydown', (e) => {
      const step = o.step || 0.05;
      let nv = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nv = v - step;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nv = v + step;
      else if (e.key === 'Home') nv = 0;
      else if (e.key === 'End') nv = 1;
      if (nv == null) return;
      e.preventDefault();
      e.stopPropagation();
      paint(nv);
      if (o.onInput) o.onInput(v, false);
      if (o.onChange) o.onChange(v);
    });
    el.set = (x) => { if (!dragging) paint(x); };
    el.get = () => v;
    el.dragging = () => dragging;
    paint(v);
    return el;
  }

  // ---------------------------------------------------------------- top bar
  function buildTop(P) {
    const tabs = {};
    const bar = h('div.mp-tabs', { role: 'tablist' });
    TABS.forEach(([id, label]) => {
      const arrow = h('span.mp-tab-arrow', { 'aria-hidden': 'true' }, G.down());
      const b = h('button.mp-tab', { type: 'button', role: 'tab', dataset: { tab: id }, 'data-tip': label + '. Click the arrow for options.' }, h('span.mp-tab-label', null, label), arrow);
      b.addEventListener('click', (e) => {
        if (e.target.closest('.mp-tab-arrow')) { A.sound.play('menu'); tabMenu(P, id, b); return; }
        P.setTab(id);
      });
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); tabMenu(P, id, b); });
      b.addEventListener('pointerenter', () => A.sound.play('hover'));
      tabs[id] = b;
      bar.appendChild(b);
    });
    const back = h('button.mp-nav-btn', { type: 'button', 'aria-label': 'Back', 'data-tip': 'Back' }, G.back());
    const fwd = h('button.mp-nav-btn', { type: 'button', 'aria-label': 'Forward', 'data-tip': 'Forward' }, G.fwd());
    back.addEventListener('click', () => { const t = P.history.pop(); if (t) { P.future.push(P.tab); P.setTab(t, true); } });
    fwd.addEventListener('click', () => { const t = P.future.pop(); if (t) { P.history.push(P.tab); P.setTab(t, true); } });
    const search = A.ui.searchField({
      placeholder: 'Search your library',
      onInput: (v) => { P.search = v.trim().toLowerCase(); if (P.tab !== 'library') P.setTab('library'); P.renderLibrary(); },
      onSearch: (v) => { P.search = v.trim().toLowerCase(); if (P.tab !== 'library') P.setTab('library'); P.renderLibrary(); },
    });
    search.classList.add('mp-search');
    P.el.tabs = tabs;
    P.el.back = back;
    P.el.fwd = fwd;
    P.el.searchBox = search;
    P.el.top = h('div.mp-top', null, h('div.mp-nav', null, back, fwd), bar, h('div.mp-top-right', null, search));
  }

  // ---------------------------------------------------------------- transport bar
  function buildTransport(P) {
    const M = P.M;
    const tip = h('div.mp-seek-tip');
    let dur = 0;
    const seek = makeSlider({
      cls: 'mp-seek', label: 'Seek', step: 0.02,
      onInput: (v, drag) => { P.el.time.textContent = fmt(v * P.durNow()) + ' / ' + fmt(P.durNow()); if (!drag) M.seek(v * P.durNow()); },
      onChange: (v) => { if (M.current) M.seek(v * P.durNow()); },
      onHover: (v, e) => {
        dur = P.durNow();
        if (v == null || !dur) { tip.classList.remove('show'); return; }
        tip.textContent = fmt(v * dur);
        tip.style.left = (v * 100) + '%';
        tip.classList.add('show');
      },
    });
    seek.appendChild(tip);

    const thumb = h('img.mp-thumb', { alt: '', draggable: false });
    const title = h('span.mp-info-title');
    const titleWrap = h('div.mp-marquee', null, title);
    const sub = h('div.mp-info-sub');
    const time = h('div.mp-time', null, '0:00');
    time.addEventListener('click', () => { P.remaining = !P.remaining; P.updateTime(); });
    time.setAttribute('data-tip', 'Click to switch between elapsed and remaining time');
    const status = h('div.mp-status', null, h('div.mp-thumb-wrap', { 'data-tip': 'Show Now Playing' }, thumb), h('div.mp-info', null, titleWrap, sub));
    status.firstChild.addEventListener('click', () => P.setTab('nowplaying'));

    const shuffle = tbtn('mp-shuffle', 'Turn shuffle on (Ctrl+H)', G.shuffle(), () => P.toggleShuffle());
    const repeat = tbtn('mp-repeat', 'Turn repeat on (Ctrl+T)', h('span.mp-rep', null, G.repeat(), h('b.mp-rep-one', null, '1')), () => P.cycleRepeat());
    const stop = tbtn('mp-stop', 'Stop (Ctrl+S)', G.stop(), () => P.stop());
    const prev = h('button.mp-wing.mp-wing-l', { type: 'button', 'aria-label': 'Previous (Ctrl+B)', 'data-tip': 'Previous (Ctrl+B)' }, G.prev());
    const next = h('button.mp-wing.mp-wing-r', { type: 'button', 'aria-label': 'Next (Ctrl+F)', 'data-tip': 'Next (Ctrl+F)' }, G.next());
    prev.addEventListener('click', () => P.prev());
    next.addEventListener('click', () => P.next());
    const orbGlyph = h('span.mp-orb-glyph', null, G.play());
    const orb = h('button.mp-orb', { type: 'button', 'aria-label': 'Play (Space)', 'data-tip': 'Play (Space)' }, h('span.mp-orb-ring'), orbGlyph);
    orb.addEventListener('click', () => { A.sound.play('click'); P.togglePlay(); });
    const wings = h('div.mp-wings', null, prev, orb, next);
    [prev, orb, next].forEach((b) => b.addEventListener('pointerenter', () => A.sound.play('hover')));
    const mute = tbtn('mp-mute', 'Mute (M)', G.vol(3), () => P.toggleMute());
    const vol = makeSlider({ cls: 'mp-vol', label: 'Volume', value: M.volume, step: 0.05, onInput: (v) => { M.volume = v; if (M.muted && v > 0) M.muted = false; P.syncVolume(); } });
    const controls = h('div.mp-controls', null, h('div.mp-ctl-left', null, shuffle, repeat, h('span.mp-sep'), stop), wings, h('div.mp-ctl-right', null, mute, vol));
    const open = tbtn('mp-open', 'Open a file from your computer (Ctrl+O)', G.folder(), () => P.openFiles());
    const listBtn = tbtn('mp-listbtn', 'Show or hide the list pane', G.list(), () => P.toggleList());
    const full = tbtn('mp-fullbtn', 'Full screen (F11)', G.full(), () => { if (P.tab !== 'nowplaying') P.setTab('nowplaying'); P.enterFull(); });
    const right = h('div.mp-bar-right', null, time, open, listBtn, full);
    P.el.bar = h('div.mp-bar', null, seek, h('div.mp-bar-row', null, status, controls, right));
    Object.assign(P.el, { seek, thumb, title, titleWrap, sub, time, shuffle, repeat, stop, prev, next, orb, orbGlyph, mute, vol, listBtn, full, status });
  }

  // ---------------------------------------------------------------- Now Playing
  const IDLE_TIPS = [
    'Tip: press Up or Down to flip through visualizations.',
    'Tip: double-click the visualization to go full screen.',
    'Tip: try the one called "the ocean is dreaming".',
    'Tip: drag songs onto the list to change what plays next.',
    'Tip: rate your favorites with the stars in the Library.',
  ];
  function buildNowPlaying(P) {
    const stage = h('div.mp-stage');
    const art = h('img.mp-np-art', { alt: '', draggable: false });
    const npTitle = h('div.mp-np-title'), npArtist = h('div.mp-np-artist'), npAlbum = h('div.mp-np-album');
    const info = h('div.mp-np-info', null, art, h('div.mp-np-text', null, npTitle, npArtist, npAlbum));
    const toast = h('div.mp-vis-toast', null, h('span.mp-vis-toast-group'), h('span.mp-vis-toast-name'));
    const visName = h('button.mp-vis-name', { type: 'button', 'data-tip': 'Choose a visualization' });
    const sbtn = (label, glyph, fn) => { const b = h('button.mp-sbtn', { type: 'button', 'aria-label': label, 'data-tip': label }, glyph); b.addEventListener('click', (e) => { e.stopPropagation(); fn(e); }); return b; };
    const ctl = h('div.mp-stage-ctl', null,
      sbtn('Previous visualization (Up)', G.back(), () => P.stepVis(-1)),
      visName,
      sbtn('Next visualization (Down)', G.fwd(), () => P.stepVis(1)),
      h('span.mp-sep'),
      sbtn('Full screen (F11)', G.full(), () => P.enterFull()));
    visName.addEventListener('click', (e) => { e.stopPropagation(); const r = visName.getBoundingClientRect(); A.ui.menu(visMenuItems(P), r.left, r.bottom + 4); });
    const tip = h('div.mp-idle-tip');
    const idleTitle = h('div.mp-idle-title', null, 'Nothing is playing yet');
    const idle = h('div.mp-idle', null,
      h('div.mp-idle-logo', null, A.img('icons/mediaplayer', { class: 'mp-idle-icon' }), A.img('icons/mediaplayer', { class: 'mp-idle-refl' })),
      idleTitle,
      h('div.mp-idle-text', null, 'Pick something from your Library, or open one of your own music files.'),
      h('div.mp-idle-btns', null,
        A.ui.button('Play all music', { tone: 'aqua', onClick: () => P.playAll() }),
        A.ui.button('Go to Library', { onClick: () => P.setTab('library') }),
        A.ui.button('Open file...', { onClick: () => P.openFiles() })),
      tip);
    const np = h('div.mp-view.mp-view-np', { dataset: { view: 'nowplaying' } }, stage, info, toast, idle, ctl);
    let idleT = 0;
    const wake = () => {
      np.classList.add('awake');
      clearTimeout(idleT);
      idleT = P.later(() => np.classList.remove('awake'), 2600);
      if (P.M.current && P.M.state !== 'stopped') P.showInfo();
    };
    np.addEventListener('pointermove', wake);
    np.addEventListener('pointerleave', () => np.classList.remove('awake'));
    stage.addEventListener('dblclick', () => P.toggleFull());
    stage.addEventListener('contextmenu', (e) => { e.preventDefault(); A.ui.menu(visMenuItems(P, true), e.clientX, e.clientY); });
    let tipN = Math.floor(Math.random() * IDLE_TIPS.length);
    tip.textContent = IDLE_TIPS[tipN];
    P.cycleTip = () => { tipN = (tipN + 1) % IDLE_TIPS.length; tip.textContent = IDLE_TIPS[tipN]; };

    let infoT = 0;
    P.showInfo = (long) => {
      const c = P.M.current;
      if (!c) return;
      info.classList.add('show');
      clearTimeout(infoT);
      infoT = P.later(() => info.classList.remove('show'), long ? 5500 : 3500);
    };
    let toastT = 0;
    P.showToast = (def) => {
      toast.firstChild.textContent = def.group;
      toast.lastChild.textContent = def.name;
      toast.classList.add('show');
      clearTimeout(toastT);
      toastT = P.later(() => toast.classList.remove('show'), 2400);
    };
    P.setNpInfo = (item, c) => {
      const src = item || c;
      art.src = src ? artFor(src.file ? { kind: 'file', album: src.album, artist: src.artist } : src, 160).url : '';
      npTitle.textContent = c ? c.title : '';
      npArtist.textContent = c ? c.artist : '';
      npAlbum.textContent = c ? c.album + (c.year ? ' (' + c.year + ')' : '') : '';
    };
    Object.assign(P.el, { np, stage, info, toast, visName, ctl, idle, idleTitle });

    // Visualization host: mounted while Now Playing is visible and no video is showing.
    P.ensureVis = () => {
      if (P.vis || P.closed) return;
      P.vis = A.visualizers.mount(stage, {
        id: P.visId,
        analyser: () => P.M.analyser,
        playing: () => P.M.state === 'playing',
        color: () => (P.M.current ? P.M.current.color : '#3aa6f5'),
        art: () => P.visArt(),
        onChange: (def) => { visName.textContent = def.name; },
      });
      P.syncVisVisibility();
    };
    let artImg = null, artKeyNow = '';
    P.visArt = () => {
      const c = P.M.current, it = P.current();
      if (!c) return null;
      const src = it && P.matches(it, c) ? it : c.file ? { kind: 'file', album: c.album, artist: c.artist } : { kind: 'track', album: c.album, artist: c.artist };
      const key = artKey(src);
      if (key !== artKeyNow) { artKeyNow = key; artImg = artFor(src, 256).canvas; }
      return artImg;
    };
    P.setVis = (id, quiet) => {
      if (!A.visualizers.get(id)) id = 'glass-bars';
      P.visId = id;
      A.store.set('mediaplayer.vis', id);
      if (P.vis) {
        const def = P.vis.set(id);
        if (!quiet) { P.showToast(def); A.sound.play('navigate'); }
      }
    };
    P.stepVis = (dir) => {
      const list = A.visualizers.list;
      const i = Math.max(0, list.findIndex((v) => v.id === P.visId));
      P.setVis(list[(i + dir + list.length) % list.length].id);
    };
    P.syncVisVisibility = () => {
      if (!P.vis) return;
      const show = (P.tab === 'nowplaying' || P.fs) && !P.video && !P.minimized;
      P.vis.setHidden(!show);
      P.vis.canvas.style.visibility = P.video ? 'hidden' : '';
    };
  }

  function visMenuItems(P, extras) {
    const items = [{ header: 'Visualizations' }];
    A.visualizers.groups().forEach((g) => {
      items.push({ label: g.name, submenu: g.items.map((v) => ({ label: v.name, radio: true, checked: v.id === P.visId, onClick: () => P.setVis(v.id) })) });
    });
    items.push({ separator: true });
    items.push({ label: 'Next visualization', shortcut: 'Down', onClick: () => P.stepVis(1) });
    items.push({ label: 'Previous visualization', shortcut: 'Up', onClick: () => P.stepVis(-1) });
    if (extras) {
      items.push({ separator: true });
      items.push({ label: P.fs ? 'Exit full screen' : 'Full screen', shortcut: 'F11', onClick: () => P.toggleFull() });
      items.push({ label: 'Show list pane', checked: P.showList, onClick: () => P.toggleList() });
    }
    return items;
  }

  // ---------------------------------------------------------------- sample videos
  // "Clouds": an original timelapse of cumulus drifting over green hills.
  function cloudsVideo(host, P) {
    const cv = h('canvas.mp-video-canvas');
    host.appendChild(cv);
    const ctx = cv.getContext('2d');
    const rnd = A.util.seeded(4242);
    let w = 1, hh = 1, dpr = 1, raf = 0, running = false, last = -1, dirty = true;
    const clouds = Array.from({ length: 15 }, (_, i) => ({ layer: i % 3, x0: rnd() * 1.4, y: 0.06 + rnd() * 0.36 + (i % 3) * 0.04, s: 0.65 + rnd() * 0.7, v: 0.012 + rnd() * 0.012, seed: Math.floor(rnd() * 1e6) }));
    clouds.sort((a, b) => a.layer - b.layer);
    const birds = Array.from({ length: 5 }, () => ({ t0: rnd() * 40, y: 0.2 + rnd() * 0.25, v: 0.03 + rnd() * 0.02, s: 3 + rnd() * 3 }));
    // Soft cumulus: a union of puffs with a flat base, blurred, then shaded from below.
    function sprite(seed) {
      const r = A.util.seeded(seed), W = 380, H = 190;
      const shape = document.createElement('canvas');
      shape.width = W; shape.height = H;
      const sx = shape.getContext('2d');
      sx.fillStyle = '#fff';
      const puffs = 10 + Math.floor(r() * 6);
      for (let i = 0; i < puffs; i++) {
        const u = i / (puffs - 1);
        const px = W * (0.14 + u * 0.72) + (r() - 0.5) * 26;
        const rr = (20 + r() * 22) * (0.5 + Math.sin(u * Math.PI) * 0.8);
        const py = H * 0.68 - rr * (0.4 + r() * 0.4);
        sx.beginPath(); sx.arc(px, py, rr, 0, TAU); sx.fill();
      }
      for (let i = 0; i < 5; i++) { const px = W * (0.3 + r() * 0.4), rr = 18 + r() * 16; sx.beginPath(); sx.arc(px, H * 0.4 - r() * 30, rr, 0, TAU); sx.fill(); }
      sx.beginPath();
      sx.ellipse(W * 0.5, H * 0.66, W * 0.36, H * 0.06, 0, 0, TAU);
      sx.fill();
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.filter = 'blur(5px)';
      x.drawImage(shape, 0, 0);
      x.filter = 'none';
      x.globalCompositeOperation = 'source-atop';
      const g = x.createLinearGradient(0, H * 0.18, 0, H * 0.72);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.55, 'rgba(210,226,243,0.3)');
      g.addColorStop(1, 'rgba(146,170,200,0.62)');
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      const hl = x.createRadialGradient(W * 0.38, H * 0.22, 0, W * 0.38, H * 0.22, W * 0.42);
      hl.addColorStop(0, 'rgba(255,255,255,0.7)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = hl;
      x.fillRect(0, 0, W, H);
      return c;
    }
    clouds.forEach((c) => { c.img = sprite(c.seed); });
    function size() {
      const r = host.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); hh = Math.max(1, Math.round(r.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr);
      dirty = true;
    }
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const rgb = (c) => 'rgb(' + c.join(',') + ')';
    function draw(T) {
      const dur = P.durNow() || 60, k = clamp(T / dur, 0, 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, hh);
      g.addColorStop(0, rgb(mix([18, 104, 200], [30, 90, 170], k)));
      g.addColorStop(0.55, rgb(mix([98, 182, 244], [150, 190, 230], k)));
      g.addColorStop(1, rgb(mix([205, 238, 255], [255, 222, 170], k)));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, hh);
      const sx = w * (0.8 - k * 0.12), sy = hh * (0.14 + k * 0.2);
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, hh) * 0.45);
      sg.addColorStop(0, 'rgba(255,255,245,0.95)');
      sg.addColorStop(0.08, 'rgba(255,248,220,0.7)');
      sg.addColorStop(0.3, 'rgba(255,240,200,' + (0.18 + k * 0.15) + ')');
      sg.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, hh);
      const scale = Math.max(0.5, w / 900);
      for (const c of clouds) {
        const sp = 0.4 + c.layer * 0.45;
        const u = ((c.x0 + T * c.v * sp * 3) % 1.6) - 0.3;
        const sw = c.img.width * c.s * (0.55 + c.layer * 0.3) * scale, sh = c.img.height * c.s * (0.55 + c.layer * 0.3) * scale;
        const y = hh * c.y + Math.sin(T * 0.05 + c.seed) * 4;
        ctx.globalAlpha = 0.8 + c.layer * 0.07;
        ctx.drawImage(c.img, u * w - sw / 2, y, sw, sh * (0.92 + 0.08 * Math.sin(T * 0.08 + c.seed)));
      }
      ctx.globalAlpha = 1;
      if (k > 0.5) { ctx.fillStyle = 'rgba(255,190,120,' + ((k - 0.5) * 0.16) + ')'; ctx.fillRect(0, 0, w, hh); }
      ctx.strokeStyle = 'rgba(20,40,60,0.55)';
      ctx.lineWidth = 1.4;
      for (const b of birds) {
        const u = ((T - b.t0) * b.v) % 1.6 - 0.3;
        if (u < -0.2 || u > 1.2) continue;
        const bx = u * w, by = hh * b.y + Math.sin(T * 0.7 + b.t0) * 6, fl = Math.sin(T * 9 + b.t0) * b.s * 0.6;
        ctx.beginPath(); ctx.moveTo(bx - b.s, by - fl); ctx.quadraticCurveTo(bx - b.s / 2, by - b.s * 0.4, bx, by); ctx.quadraticCurveTo(bx + b.s / 2, by - b.s * 0.4, bx + b.s, by - fl); ctx.stroke();
      }
      [[0.8, ['#9ee86a', '#3fae3a'], 0.018, 0], [0.87, ['#6fd04e', '#1f8a29'], 0.026, 1.8]].forEach(([base, cols, amp, ph]) => {
        ctx.beginPath();
        ctx.moveTo(0, hh);
        for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, hh * base - Math.sin(x / w * Math.PI * 2 + ph) * hh * amp * 2 - Math.sin(x / w * 7 + ph) * hh * amp * 0.6);
        ctx.lineTo(w, hh);
        const hg = ctx.createLinearGradient(0, hh * (base - 0.06), 0, hh);
        hg.addColorStop(0, cols[0]);
        hg.addColorStop(1, cols[1]);
        ctx.fillStyle = hg;
        ctx.fill();
      });
      const hl = ctx.createLinearGradient(0, hh * 0.76, 0, hh * 0.84);
      hl.addColorStop(0, 'rgba(255,255,220,0.25)');
      hl.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.fillStyle = hl;
      ctx.fillRect(0, hh * 0.76, w, hh * 0.08);
    }
    function loop() {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      const pos = P.M.current && P.M.current.id === 'video:clouds' ? P.M.position : 0;
      if (dirty || Math.abs(pos - last) > 0.0005) { draw(pos); last = pos; dirty = false; }
    }
    const ro = new ResizeObserver(size);
    ro.observe(host);
    size();
    const api = {
      pause() { running = false; cancelAnimationFrame(raf); },
      resume() { if (running) return; running = true; raf = requestAnimationFrame(loop); },
      destroy() { api.pause(); ro.disconnect(); cv.remove(); },
    };
    api.resume();
    return api;
  }
  // A simple tank for when the living aquarium is not available.
  function fishFallback(host) {
    const cv = h('canvas.mp-video-canvas');
    host.appendChild(cv);
    const ctx = cv.getContext('2d');
    let w = 1, hh = 1, dpr = 1, raf = 0, running = false, t = 0, last = 0;
    const rnd = A.util.seeded(77);
    const fish = Array.from({ length: 7 }, (_, i) => ({ x: rnd(), y: 0.2 + rnd() * 0.55, v: (0.03 + rnd() * 0.05) * (i % 2 ? 1 : -1), s: 0.6 + rnd() * 0.7, hue: [28, 45, 200, 12, 190, 50, 20][i], ph: rnd() * TAU }));
    const bubbles = [];
    function size() { const r = host.getBoundingClientRect(); w = Math.max(1, r.width); hh = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = w * dpr; cv.height = hh * dpr; }
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now; t += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, hh);
      g.addColorStop(0, '#2cc6ea'); g.addColorStop(0.5, '#0a6fa8'); g.addColorStop(1, '#063462');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, hh);
      ctx.fillStyle = '#d9c28a';
      ctx.beginPath(); ctx.moveTo(0, hh * 0.88); ctx.quadraticCurveTo(w / 2, hh * 0.82, w, hh * 0.9); ctx.lineTo(w, hh); ctx.lineTo(0, hh); ctx.fill();
      for (let i = 0; i < 7; i++) {
        const px = w * (0.08 + i * 0.14);
        ctx.strokeStyle = 'rgba(40,160,90,0.8)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px, hh * 0.9);
        ctx.quadraticCurveTo(px + Math.sin(t + i) * 18, hh * 0.75, px + Math.sin(t * 0.8 + i) * 26, hh * (0.58 + (i % 3) * 0.06)); ctx.stroke();
      }
      for (const f of fish) {
        f.x += f.v * dt;
        if (f.x > 1.15) f.x = -0.15; if (f.x < -0.15) f.x = 1.15;
        const x = f.x * w, y = f.y * hh + Math.sin(t * 1.2 + f.ph) * 10, s = f.s * Math.max(0.6, w / 800) * 22, dir = f.v > 0 ? 1 : -1;
        ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
        const fg = ctx.createLinearGradient(0, -s, 0, s);
        fg.addColorStop(0, 'hsl(' + f.hue + ',95%,72%)'); fg.addColorStop(1, 'hsl(' + f.hue + ',90%,42%)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.ellipse(0, 0, s * 1.3, s * 0.72, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-s * 1.1, 0); ctx.lineTo(-s * 2, -s * 0.7 + Math.sin(t * 8 + f.ph) * 3); ctx.lineTo(-s * 2, s * 0.7 + Math.sin(t * 8 + f.ph) * 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 0.75, -s * 0.15, s * 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#123'; ctx.beginPath(); ctx.arc(s * 0.8, -s * 0.15, s * 0.1, 0, TAU); ctx.fill();
        ctx.restore();
        if (Math.random() < dt * 0.3) bubbles.push({ x, y: y - 6, r: 2 + Math.random() * 3 });
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]; b.y -= dt * 40; b.x += Math.sin(t * 3 + i) * 0.3;
        if (b.y < -5) { bubbles.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
      }
    }
    const ro = new ResizeObserver(size);
    ro.observe(host);
    size();
    const api = {
      pause() { running = false; cancelAnimationFrame(raf); },
      resume() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
      destroy() { api.pause(); ro.disconnect(); cv.remove(); },
    };
    api.resume();
    return api;
  }
  function mountVideo(P, id) {
    const el = h('div.mp-video', { dataset: { video: id } });
    P.el.stage.appendChild(el);
    let ctrl = null;
    if (id === 'aquarium' && A.aquarium && A.aquarium.create) {
      try {
        ctrl = A.aquarium.create(el, { mode: 'tank', preview: true });
        el.addEventListener('pointermove', (e) => ctrl.pointer && ctrl.pointer('move', e.clientX, e.clientY));
        el.addEventListener('pointerleave', (e) => ctrl.pointer && ctrl.pointer('leave', e.clientX, e.clientY));
        el.addEventListener('click', (e) => ctrl.pointer && ctrl.pointer('click', e.clientX, e.clientY));
        el.setAttribute('data-tip', 'Click to feed the fish');
      } catch (e) { ctrl = null; }
    }
    if (!ctrl) ctrl = id === 'clouds' ? cloudsVideo(el, P) : fishFallback(el);
    return {
      id, el,
      pause() { try { ctrl.pause(); } catch (e) { /* ignore */ } },
      resume() { try { ctrl.resume(); } catch (e) { /* ignore */ } },
      destroy() { try { ctrl.destroy(); } catch (e) { /* ignore */ } el.remove(); },
    };
  }

  // ---------------------------------------------------------------- full screen
  function enterFull(P) {
    if (P.fs || P.closed) return;
    P.setTab('nowplaying');
    const M = P.M;
    const layer = h('div.mp-fs', { tabIndex: -1 });
    const hint = h('div.mp-fs-hint', null, 'Press Esc to exit full-screen mode');
    const title = h('div.mp-fs-title');
    const play = h('button.mp-fs-btn.mp-fs-play', { type: 'button', 'aria-label': 'Play or pause', 'data-tip': 'Play or pause (Space)' }, G.play());
    const mk = (label, glyph, fn) => { const b = h('button.mp-fs-btn', { type: 'button', 'aria-label': label, 'data-tip': label }, glyph); b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); return b; };
    play.addEventListener('click', (e) => { e.stopPropagation(); P.togglePlay(); });
    const bar = h('div.mp-fs-bar', null,
      mk('Previous', G.prev(), () => P.prev()), play, mk('Next', G.next(), () => P.next()),
      title,
      mk('Previous visualization', G.back(), () => P.stepVis(-1)), mk('Next visualization', G.fwd(), () => P.stepVis(1)),
      mk('Exit full screen (Esc)', G.full(), () => exitFull(P)));
    layer.append(P.el.stage, hint, bar);
    (document.getElementById('ae-screens') || document.body).appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('on'));
    let t = 0;
    const wake = () => { layer.classList.add('awake'); clearTimeout(t); t = setTimeout(() => layer.classList.remove('awake'), 2500); };
    layer.addEventListener('pointermove', wake);
    layer.addEventListener('dblclick', () => exitFull(P));
    const keys = (e) => {
      if (e.key === 'Escape' || e.key === 'F11') { e.preventDefault(); e.stopPropagation(); exitFull(P); }
      else if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); P.togglePlay(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); P.stepVis(e.key === 'ArrowUp' ? -1 : 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); if (M.current) M.seek(M.position + (e.key === 'ArrowLeft' ? -5 : 5)); }
    };
    const onFsChange = () => { if (!document.fullscreenElement && P.fs && P.fs.real) exitFull(P); };
    document.addEventListener('keydown', keys, true);
    document.addEventListener('fullscreenchange', onFsChange);
    P.fs = { layer, title, play, keys, onFsChange, timer: () => clearTimeout(t), real: false };
    if (layer.requestFullscreen) {
      try {
        const pr = layer.requestFullscreen();
        if (pr && pr.then) pr.then(() => { if (P.fs && P.fs.layer === layer) P.fs.real = true; }, () => { /* the overlay still fills the window */ });
      } catch (e) { /* not allowed here; the overlay fills the window */ }
    }
    layer.focus({ preventScroll: true });
    wake();
    A.sound.play('maximize');
    P.updateNow();
    P.syncVisVisibility();
  }
  function exitFull(P) {
    const f = P.fs;
    if (!f) return;
    P.fs = null;
    document.removeEventListener('keydown', f.keys, true);
    document.removeEventListener('fullscreenchange', f.onFsChange);
    f.timer();
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    P.el.np.insertBefore(P.el.stage, P.el.np.firstChild);
    f.layer.remove();
    if (!P.closed) {
      A.sound.play('minimize');
      P.syncVisVisibility();
      P.win.focus();
    }
  }

  // ---------------------------------------------------------------- Library
  const LIB_VIEWS = [['artist', 'Artist'], ['album', 'Album'], ['songs', 'Songs'], ['genre', 'Genre'], ['year', 'Year'], ['rating', 'Rating']];
  const STAR_TIPS = ['Not for me', "It's OK", 'I like it', 'I really like it', 'I love it'];
  const COLS = [['no', '#'], ['title', 'Title'], ['artist', 'Artist'], ['album', 'Album'], ['duration', 'Length'], ['rating', 'Rating'], ['genre', 'Genre']];

  function buildLibrary(P) {
    const nav = h('nav.mp-lib-nav', { 'aria-label': 'Library' });
    const navItem = (view, label, icon) => {
      const b = h('button.mp-nav-item', { type: 'button', dataset: { view } }, A.img(icon, { class: 'mp-nav-icon' }), h('span', null, label));
      b.addEventListener('click', () => { P.libFilter = null; P.libView = view; A.store.set('mediaplayer.libView', view); A.sound.play('navigate'); P.renderLibrary(); });
      return b;
    };
    nav.append(
      h('div.mp-nav-head', null, 'Library'),
      navItem('artist', 'Artist', 'icons/user'),
      navItem('album', 'Album', 'icons/disc'),
      navItem('songs', 'Songs', 'icons/music'),
      navItem('genre', 'Genre', 'icons/headphones'),
      navItem('year', 'Year', 'icons/calendar'),
      navItem('rating', 'Rating', 'icons/star'),
      h('div.mp-nav-head', null, 'More'),
      navItem('videos', 'Videos', 'icons/video'),
      navItem('files', 'My files', 'icons/folder-music'));
    const crumbs = h('div.mp-crumbs');
    const head = h('div.mp-lib-head', null, crumbs,
      h('div.mp-lib-actions', null,
        A.ui.button('Play all', { tone: 'aqua', size: 'sm', icon: 'icons/play', onClick: () => P.playView() }),
        A.ui.button('Open file...', { size: 'sm', icon: 'icons/folder', onClick: () => P.openFiles() })));
    const body = h('div.mp-lib-body', { tabIndex: 0 });
    const lib = h('div.mp-view.mp-view-lib', { dataset: { view: 'library' } }, nav, h('div.mp-lib-main', null, head, body));
    Object.assign(P.el, { lib, libNav: nav, crumbs, libBody: body });
    P.el.libBody.addEventListener('dragstart', (e) => {
      const r = e.target.closest && e.target.closest('[data-key]');
      if (!r) return;
      e.dataTransfer.setData('text/x-mp-item', r.dataset.key);
      e.dataTransfer.setData('text/plain', r.dataset.title || r.dataset.key);
      e.dataTransfer.effectAllowed = 'copy';
    });

    P.libItems = () => A.music.tracks.map(trackItem).concat(P.files.map((f) => f.item));
    P.findItem = (key) => P.libItems().find((it) => it.key === key) || itemFromKey(key);
    P.viewItems = () => {
      let list = P.libView === 'files' ? P.files.map((f) => f.item) : P.libView === 'videos' ? [videoItem('aquarium'), videoItem('clouds')] : P.libItems();
      const f = P.libFilter;
      if (f) list = list.filter((it) => String(it[f.field]) === String(f.value));
      if (P.search) list = list.filter((it) => [it.title, it.artist, it.album, it.genre, String(it.year)].join(' ').toLowerCase().includes(P.search));
      return list;
    };
    P.renderLibrary = () => renderLibrary(P);
  }

  function sortItems(P, list) {
    const { key, dir } = P.libSort;
    const val = (it) => (key === 'rating' ? P.rating(it.key) : key === 'no' ? (it.album + '\u0000' + String(it.no).padStart(3, '0')) : it[key]);
    return list.slice().sort((a, b) => {
      const x = val(a), y = val(b);
      let c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
      if (!c) c = String(a.album).localeCompare(String(b.album)) || (a.no || 0) - (b.no || 0);
      return c * dir;
    });
  }

  function renderLibrary(P) {
    const body = P.el.libBody;
    const view = P.libView;
    P.el.libNav.querySelectorAll('.mp-nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === (P.libFilter && P.libFilter.from ? P.libFilter.from : view)));
    // breadcrumb
    const cr = P.el.crumbs;
    cr.innerHTML = '';
    const crumb = (label, fn) => { const b = h('button.mp-crumb', { type: 'button' }, label); if (fn) b.addEventListener('click', fn); else b.disabled = true; return b; };
    const names = { artist: 'Artist', album: 'Album', songs: 'Songs', genre: 'Genre', year: 'Year', rating: 'Rating', videos: 'Videos', files: 'My files' };
    cr.append(crumb('Library', () => { P.libFilter = null; P.libView = 'songs'; P.renderLibrary(); }), h('span.mp-crumb-sep', null, '›'));
    if (P.libFilter) {
      cr.append(crumb(P.libFilter.from ? names[P.libFilter.from] : 'Songs', () => { const from = P.libFilter.from; P.libFilter = null; P.libView = from || 'songs'; P.renderLibrary(); }), h('span.mp-crumb-sep', null, '›'), crumb(P.libFilter.label));
    } else cr.append(crumb(names[view] || 'Songs'));
    if (P.search) cr.append(h('span.mp-crumb-search', null, 'Searching for "' + P.search + '"'));
    body.innerHTML = '';
    const items = P.viewItems();
    if (view === 'files' && !P.files.length && !P.search) {
      body.appendChild(h('div.mp-empty', null, A.img('icons/folder-music', { class: 'mp-empty-icon' }), h('div.mp-empty-title', null, 'Play your own music'),
        h('div.mp-empty-text', null, 'Open audio files from your computer and they will show up here. They stay on your computer: nothing is uploaded.'),
        A.ui.button('Open file...', { tone: 'aqua', onClick: () => P.openFiles() })));
      return;
    }
    if (!items.length) {
      body.appendChild(h('div.mp-empty', null, A.img('icons/search', { class: 'mp-empty-icon' }), h('div.mp-empty-title', null, 'No items match your search'), h('div.mp-empty-text', null, 'Check the spelling, or try fewer words.')));
      return;
    }
    if (!P.libFilter && (view === 'album' || view === 'artist' || view === 'genre' || view === 'videos')) { renderTiles(P, body, items, view); return; }
    if (!P.libFilter && (view === 'year' || view === 'rating')) { renderGroupedBy(P, body, items, view); return; }
    renderTable(P, body, items);
  }

  function headerRow(P, flat) {
    const cells = COLS.filter(([k]) => flat || k !== 'album').map(([k, label]) => {
      const c = h('button.mp-th', { type: 'button', class: 'mp-c-' + k, dataset: { key: k } }, label);
      if (P.libSort.key === k || (k === 'no' && !flat && P.libSort.key === 'album')) c.classList.add('sorted', P.libSort.dir > 0 ? 'asc' : 'desc');
      c.addEventListener('click', () => {
        const key = k === 'no' && !flat ? 'album' : k;
        P.libSort = P.libSort.key === key ? { key, dir: -P.libSort.dir } : { key, dir: 1 };
        A.sound.play('click');
        P.renderLibrary();
      });
      return c;
    });
    return h('div.mp-thead', { class: flat ? 'flat' : 'grouped' }, flat ? null : h('div.mp-th.mp-th-art', null, 'Album'), h('div.mp-thead-grid', null, cells));
  }

  function renderTable(P, body, items) {
    const grouped = P.libSort.key === 'album' && P.libView !== 'videos';
    body.appendChild(headerRow(P, !grouped));
    const sorted = sortItems(P, items);
    const play = (it) => P.playFromList(sorted, sorted.indexOf(it));
    if (!grouped) {
      const rows = h('div.mp-rows.flat');
      sorted.forEach((it, i) => rows.appendChild(trackRow(P, it, i, true, () => play(it))));
      body.appendChild(rows);
      return;
    }
    const groups = [];
    sorted.forEach((it) => { let g = groups.find((x) => x.album === it.album && x.artistKey === (it.kind === 'file' ? 'file' : it.album)); if (!g) { g = { album: it.album, artistKey: it.kind === 'file' ? 'file' : it.album, items: [] }; groups.push(g); } g.items.push(it); });
    groups.forEach((g) => {
      const first = g.items[0];
      const artists = Array.from(new Set(g.items.map((x) => x.artist)));
      const artImg = h('img.mp-group-img', { src: artFor(first, 128).url, alt: '', draggable: false });
      const artBox = h('div.mp-group-art', null,
        h('div.mp-group-cover', { 'data-tip': 'Play this album' }, artImg, h('span.mp-group-play', null, G.play())),
        h('div.mp-group-album', null, g.album),
        h('div.mp-group-meta', null, artists.length > 1 ? 'Various Artists' : artists[0]),
        h('div.mp-group-meta', null, [first.genre, first.year].filter(Boolean).join(', ')));
      artBox.firstChild.addEventListener('click', () => { A.sound.play('click'); P.playFromList(g.items, 0); });
      const rows = h('div.mp-rows');
      g.items.forEach((it, i) => rows.appendChild(trackRow(P, it, i, false, () => play(it))));
      body.appendChild(h('div.mp-group', null, artBox, rows));
    });
  }

  function trackRow(P, it, i, flat, onPlay) {
    const cur = P.M.current;
    const playing = cur && P.matches(it, cur);
    const noText = String(it.kind === 'file' ? i + 1 : it.no || i + 1);
    const no = h('div.mp-c.mp-c-no', null, playing ? G.eq() : noText);
    const r = h('div.mp-row', { dataset: { key: it.key, title: it.title, no: noText }, draggable: true, tabIndex: -1, class: [playing && 'playing', playing && P.M.state === 'playing' && 'live', P.selKey === it.key && 'selected'] },
      no,
      h('div.mp-c.mp-c-title', null, it.title),
      h('div.mp-c.mp-c-artist', null, it.artist),
      flat ? h('div.mp-c.mp-c-album', null, it.album) : null,
      h('div.mp-c.mp-c-duration', null, it.duration ? fmt(it.duration) : '--:--'),
      h('div.mp-c.mp-c-rating', null, starsEl(P, it.key)),
      h('div.mp-c.mp-c-genre', null, it.genre));
    r.addEventListener('click', () => { P.selKey = it.key; P.el.libBody.querySelectorAll('.mp-row.selected').forEach((x) => x.classList.remove('selected')); r.classList.add('selected'); });
    r.addEventListener('dblclick', (e) => { if (e.target.closest('.mp-stars')) return; A.sound.play('click'); onPlay(); });
    r.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      P.selKey = it.key;
      A.ui.menu(itemMenu(P, it, onPlay), e.clientX, e.clientY);
    });
    r.playNow = onPlay;
    return r;
  }

  function starsEl(P, key) {
    const wrap = h('div.mp-stars', { role: 'group', 'aria-label': 'Rating' });
    const paint = (n, cls) => wrap.querySelectorAll('.mp-star').forEach((st, i) => st.classList.toggle(cls, i < n));
    for (let i = 1; i <= 5; i++) {
      const st = h('button.mp-star', { type: 'button', 'aria-label': 'Rate ' + i + (i > 1 ? ' stars' : ' star'), 'data-tip': STAR_TIPS[i - 1] }, G.star());
      st.addEventListener('pointerenter', () => { wrap.classList.add('hovering'); paint(i, 'hov'); });
      st.addEventListener('click', (e) => {
        e.stopPropagation();
        P.setRating(key, P.rating(key) === i ? 0 : i);
        paint(P.rating(key), 'on');
        st.classList.remove('pop');
        void st.offsetWidth;
        st.classList.add('pop');
      });
      st.addEventListener('dblclick', (e) => e.stopPropagation());
      wrap.appendChild(st);
    }
    wrap.addEventListener('pointerleave', () => { wrap.classList.remove('hovering'); paint(0, 'hov'); });
    paint(P.rating(key), 'on');
    return wrap;
  }

  function itemMenu(P, it, onPlay) {
    const r = P.rating(it.key);
    return [
      { label: 'Play', bold: true, icon: 'icons/play', onClick: onPlay },
      { label: 'Play next', onClick: () => P.enqueue([it], true) },
      { label: 'Add to Now Playing list', onClick: () => P.enqueue([it]) },
      { label: 'Add to Burn list', onClick: () => { P.addBurn([it]); } },
      { separator: true },
      { label: 'Rate', submenu: [5, 4, 3, 2, 1, 0].map((n) => ({ label: n ? n + (n > 1 ? ' stars' : ' star') : 'Unrated', radio: true, checked: r === n, onClick: () => { P.setRating(it.key, n); P.renderLibrary(); } })) },
      { separator: true },
      { label: 'Properties', onClick: () => showProperties(P, it) },
    ];
  }

  function renderTiles(P, body, items, view) {
    const field = view === 'videos' ? 'key' : view;
    const groups = [];
    items.forEach((it) => { const k = String(it[field]); let g = groups.find((x) => x.k === k); if (!g) { g = { k, items: [] }; groups.push(g); } g.items.push(it); });
    groups.sort((a, b) => a.k.localeCompare(b.k));
    const grid = h('div.mp-tiles');
    groups.forEach((g) => {
      const first = g.items[0];
      const covers = Array.from(new Set(g.items.map((x) => artKey(x)))).slice(0, 3);
      const stack = h('div.mp-tile-art', { class: covers.length > 1 ? 'stacked' : '' });
      covers.reverse().forEach((ck) => stack.appendChild(h('img', { src: artFor(g.items.find((x) => artKey(x) === ck), 160).url, alt: '', draggable: false })));
      stack.appendChild(h('span.mp-tile-play', { 'aria-hidden': 'true' }, G.play()));
      const title = view === 'videos' ? first.title : g.k;
      const sub = view === 'album' ? first.artist : view === 'videos' ? fmt(first.duration) + ' video' : g.items.length + (g.items.length > 1 ? ' songs' : ' song');
      const meta = view === 'album' ? String(first.year || '') : '';
      const t = h('div.mp-tile', { tabIndex: 0, dataset: view === 'videos' ? { key: first.key, title: first.title } : {}, draggable: view === 'videos', 'data-tip': view === 'videos' ? 'Double-click to play' : 'Click to open, double-click to play' },
        stack, h('div.mp-tile-title', null, title), h('div.mp-tile-sub', null, sub), meta ? h('div.mp-tile-sub', null, meta) : null);
      const playG = () => { A.sound.play('click'); P.playFromList(sortItems(P, g.items), 0); };
      t.addEventListener('click', (e) => {
        if (view === 'videos' || e.target.closest('.mp-tile-play')) { playG(); return; }
        P.libFilter = { field, value: g.k, label: g.k, from: view };
        A.sound.play('navigate');
        P.renderLibrary();
      });
      t.addEventListener('dblclick', (e) => { e.preventDefault(); if (view !== 'videos') playG(); });
      t.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); playG(); } });
      t.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        A.ui.menu([
          { label: 'Play', bold: true, icon: 'icons/play', onClick: playG },
          { label: 'Add to Now Playing list', onClick: () => P.enqueue(sortItems(P, g.items)) },
          view !== 'videos' ? { label: 'Open', onClick: () => { P.libFilter = { field, value: g.k, label: g.k, from: view }; P.renderLibrary(); } } : null,
        ].filter(Boolean), e.clientX, e.clientY);
      });
      grid.appendChild(t);
    });
    body.appendChild(grid);
  }

  function renderGroupedBy(P, body, items, view) {
    body.appendChild(headerRow(P, true));
    const keyOf = (it) => (view === 'year' ? String(it.year || 'Unknown') : String(P.rating(it.key)));
    const groups = [];
    items.forEach((it) => { const k = keyOf(it); let g = groups.find((x) => x.k === k); if (!g) { g = { k, items: [] }; groups.push(g); } g.items.push(it); });
    groups.sort((a, b) => (view === 'rating' ? Number(b.k) - Number(a.k) : b.k.localeCompare(a.k)));
    groups.forEach((g) => {
      const label = view === 'year' ? g.k : Number(g.k) ? g.k + (Number(g.k) > 1 ? ' stars' : ' star') : 'Unrated';
      body.appendChild(h('div.mp-group-head', null, label, h('span', null, g.items.length + (g.items.length > 1 ? ' items' : ' item'))));
      const rows = h('div.mp-rows.flat');
      const sorted = sortItems(P, g.items);
      sorted.forEach((it, i) => rows.appendChild(trackRow(P, it, i, true, () => P.playFromList(sorted, i))));
      body.appendChild(rows);
    });
  }

  function showProperties(P, it) {
    const path = it.kind === 'track' ? vfsPathFor(it.id) : it.kind === 'video' ? '/Videos/Sample Videos/' + it.title + '.wmv' : it.fileName || it.title;
    const st = path && A.fs.exists(path) ? A.fs.stat(path) : null;
    const rows = [
      ['Title', it.title], ['Artist', it.artist], ['Album', it.album], ['Genre', it.genre], ['Year', it.year || 'Unknown'],
      ['Length', it.duration ? fmt(it.duration) : 'Unknown'], ['Rating', P.rating(it.key) ? P.rating(it.key) + ' of 5 stars' : 'Unrated'],
      ['Bit rate', it.kind === 'file' ? 'Whatever your file says' : it.kind === 'video' ? '1,500 Kbps (very high quality)' : '128 Kbps'],
      ['Size', st ? A.util.fmtBytes(st.size) : it.size ? A.util.fmtBytes(it.size) : 'Unknown'],
      ['Location', it.kind === 'file' ? 'Your computer (local file)' : path || 'Unknown'],
    ];
    const grid = h('div.mp-props', null, rows.map(([k, v]) => [h('div.mp-props-k', null, k + ':'), h('div.mp-props-v', null, String(v))]));
    const top = h('div.mp-props-top', null, h('img.mp-props-art', { src: artFor(it, 96).url, alt: '' }), h('div', null, h('div.mp-props-title', null, it.title), h('div.ae-muted', null, it.artist)));
    A.ui.dialog({ parent: P.win, title: it.title + ' Properties', icon: 'icons/mediaplayer', width: 400, content: h('div.mp-props-wrap', null, top, grid), buttons: [{ label: 'OK', default: true }] });
  }

  // ---------------------------------------------------------------- Rip, Burn, Sync
  function discEl(kind) {
    return h('div.mp-disc-wrap', null, h('div.mp-disc', { class: 'mp-disc-' + kind }, h('div.mp-disc-rings'), h('div.mp-disc-shine'), h('div.mp-disc-hole')), h('div.mp-disc-shadow'));
  }
  // A little synthesized disc drive spinning up.
  function driveWhirr(secs) {
    const sd = A.sound;
    if (!sd.ctx || !A.store.get('sound.enabled')) return;
    const ctx = sd.ctx, t = ctx.currentTime + 0.02;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(60, t);
    o.frequency.exponentialRampToValueAtTime(420, t + secs * 0.7);
    o.frequency.exponentialRampToValueAtTime(140, t + secs);
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.018, t + 0.3);
    g.gain.setValueAtTime(0.018, t + secs * 0.75);
    g.gain.linearRampToValueAtTime(0, t + secs);
    o.connect(f).connect(g).connect(sd.sfx);
    o.start(t); o.stop(t + secs + 0.05);
    sd.noise(t, { dur: secs, vel: 0.02, type: 'bandpass', f1: 2500, f2: 5000, q: 0.7, shape: 'swell', rev: 0 });
    sd.noise(t + 0.15, { dur: 0.05, vel: 0.08, type: 'highpass', f1: 2000, rev: 0 });
  }

  function dropList(P, arr, kind, emptyText) {
    const items = h('div.mp-dl-items');
    const capFill = A.ui.progress({ value: 0, tone: kind === 'burn' ? 'aqua' : 'grass' });
    const capText = h('div.mp-dl-cap-text');
    const box = h('div.mp-dl', { dataset: { kind } }, h('div.mp-dl-head', null, h('span', null, kind === 'burn' ? 'Burn list' : 'Sync list'), h('button.ae-link.mp-dl-clear', { type: 'button', onclick: () => { arr.length = 0; render(); A.sound.play('recycle'); } }, 'Clear list')), items, h('div.mp-dl-cap', null, capFill, capText));
    const total = kind === 'burn' ? 80 * 60 : 1024;
    function render() {
      items.innerHTML = '';
      if (!arr.length) items.appendChild(h('div.mp-dl-empty', null, G.note(), h('div', null, emptyText)));
      arr.forEach((it, i) => {
        const row = h('div.mp-dl-row', null, h('img', { src: artFor(it, 48).url, alt: '' }), h('span.mp-dl-title', null, it.title), h('span.mp-dl-len', null, fmt(it.duration)),
          h('button.mp-dl-x', { type: 'button', 'aria-label': 'Remove ' + it.title, 'data-tip': 'Remove from list', onclick: () => { arr.splice(i, 1); render(); } }, '×'));
        items.appendChild(row);
      });
      if (kind === 'burn') {
        const used = arr.reduce((a, it) => a + (it.duration || 0), 0);
        capFill.set((used / total) * 100);
        capText.textContent = fmt(used) + ' of 80:00 used (CD-R)';
      } else {
        const mb = arr.length * 4.2;
        capFill.set((mb / total) * 100);
        capText.textContent = Math.max(0, Math.round(total - mb)) + ' MB free of 1 GB. Room for about ' + Math.max(0, Math.floor((total - mb) / 4.2)) + ' more songs.';
      }
    }
    box.addEventListener('dragover', (e) => { if (Array.from(e.dataTransfer.types).includes('text/x-mp-item')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; box.classList.add('over'); } });
    box.addEventListener('dragleave', (e) => { if (!box.contains(e.relatedTarget)) box.classList.remove('over'); });
    box.addEventListener('drop', (e) => {
      e.preventDefault();
      box.classList.remove('over');
      const it = P.findItem(e.dataTransfer.getData('text/x-mp-item'));
      if (it) { arr.push(it); render(); A.sound.play('plop'); }
    });
    box.render = render;
    render();
    return box;
  }

  function buildDiscViews(P) {
    // Rip
    const rDisc = discEl('audio');
    const rTitle = h('div.mp-disc-title', null, 'Insert an audio CD');
    const rText = h('div.mp-disc-text', null, 'Put a CD in the drive and Media Player will copy its songs to your Music folder. Tip: the drive tray is not a cup holder.');
    const fmtName = () => ({ wma: 'Aerium Audio (.wma)', mp3: 'MP3', wav: 'WAV (Lossless)' })[A.store.get('mediaplayer.rip.format', 'wma')];
    const rInfo = h('div.mp-disc-foot');
    const updRip = () => { rInfo.textContent = 'Rip to: Music folder · Format: ' + fmtName() + ' · ' + A.store.get('mediaplayer.rip.quality', 128) + ' Kbps'; };
    updRip();
    P.ripMenu = () => [
      { header: 'Format' },
      ...[['wma', 'Aerium Audio (.wma)'], ['mp3', 'MP3'], ['wav', 'WAV (Lossless, about 50 MB per song!)']].map(([v, l]) => ({ label: l, radio: true, checked: A.store.get('mediaplayer.rip.format', 'wma') === v, onClick: () => { A.store.set('mediaplayer.rip.format', v); updRip(); } })),
      { header: 'Audio quality' },
      ...[[64, 'Smallest size'], [128, 'Recommended'], [192, 'Better'], [320, 'Best quality']].map(([q, l]) => ({ label: q + ' Kbps (' + l + ')', radio: true, checked: A.store.get('mediaplayer.rip.quality', 128) === q, onClick: () => { A.store.set('mediaplayer.rip.quality', q); updRip(); } })),
      { separator: true },
      { label: 'Eject', shortcut: 'Ctrl+J', onClick: () => P.eject() },
    ];
    let busy = false;
    P.eject = () => {
      if (busy) return;
      busy = true;
      rDisc.classList.add('eject');
      A.sound.play('whooshOut');
      P.later(() => { rDisc.classList.remove('eject'); A.sound.play('whooshIn'); busy = false; }, 1400);
    };
    const spinUp = () => {
      if (busy) return;
      busy = true;
      rDisc.classList.add('fast');
      driveWhirr(2.4);
      rTitle.textContent = 'Reading the disc...';
      rText.textContent = 'Spinning up the drive. This is the part where the computer sounds like a tiny jet engine.';
      P.later(() => {
        rDisc.classList.remove('fast');
        rTitle.textContent = 'No disc in the drive';
        rText.textContent = 'Media Player could not find an audio CD. Check that the shiny side is facing down, then close the tray.';
        A.sound.play('exclamation');
        busy = false;
        P.later(() => { rTitle.textContent = 'Insert an audio CD'; rText.textContent = 'Put a CD in the drive and Media Player will copy its songs to your Music folder. Tip: the drive tray is not a cup holder.'; }, 6000);
      }, 2500);
    };
    rDisc.addEventListener('click', spinUp);
    rDisc.setAttribute('data-tip', 'Click to check the drive');
    const ripBtn = A.ui.button('Start rip', { tone: 'aqua', disabled: true });
    const setBtn = A.ui.button('Rip settings', { onClick: (e) => { const r = e.currentTarget.getBoundingClientRect(); A.ui.menu(P.ripMenu(), r.left, r.bottom + 4); } });
    P.el.rip = h('div.mp-view.mp-view-disc', { dataset: { view: 'rip' } }, h('div.mp-disc-pane', null, rDisc, rTitle, rText, h('div.mp-disc-actions', null, ripBtn, setBtn), rInfo));

    // Burn
    const bDisc = discEl('blank');
    const bTitle = h('div.mp-disc-title', null, 'Insert a blank CD');
    const bText = h('div.mp-disc-text', null, 'Drag songs to the burn list, then press Start burn to make a mix for the car.');
    const bProg = A.ui.progress({ value: 0, tone: 'grass' });
    bProg.hidden = true;
    const burnList = dropList(P, P.burn, 'burn', 'Drag items here to create a burn list');
    P.addBurn = (items) => { P.burn.push(...items); burnList.render(); A.sound.play('plop'); };
    const burnBtn = A.ui.button('Start burn', { tone: 'aqua', icon: 'icons/disc' });
    let burning = false;
    burnBtn.addEventListener('click', async () => {
      if (burning) return;
      if (!P.burn.length) { A.ui.messageBox({ parent: P.win, title: 'Media Player', icon: 'info', instruction: 'Your burn list is empty', message: 'Drag some songs from the Library to the burn list first.' }); return; }
      const r = await A.ui.messageBox({ parent: P.win, title: 'Media Player', icon: 'icons/disc', instruction: 'Insert a blank disc', message: 'Media Player needs a blank CD-R in the drive to burn your list.', buttons: [{ label: 'Pretend I have one', value: 'go', default: true }, { label: 'Cancel', value: null, cancel: true }] });
      if (r !== 'go' || P.closed) return;
      burning = true;
      bDisc.classList.add('fast', 'laser');
      bProg.hidden = false;
      driveWhirr(1.6);
      let pct = 0;
      const step = () => {
        if (P.closed) return;
        pct = Math.min(100, pct + 3 + Math.random() * 6);
        bProg.set(pct);
        bTitle.textContent = pct < 100 ? 'Burning... ' + Math.floor(pct) + '%' : 'Finishing the disc...';
        bText.textContent = pct < 100 ? 'Please do not bump the computer. Seriously. Not even a little.' : 'Almost there.';
        if (pct < 100) P.later(step, 220);
        else P.later(() => {
          burning = false;
          bDisc.classList.remove('fast', 'laser');
          bProg.hidden = true;
          bTitle.textContent = 'Burn complete';
          bText.textContent = 'Label your disc with a marker so you remember it is SUMMER MIX 07.';
          A.sound.play('ding');
          P.later(() => { bTitle.textContent = 'Insert a blank CD'; bText.textContent = 'Drag songs to the burn list, then press Start burn to make a mix for the car.'; }, 7000);
        }, 900);
      };
      step();
    });
    P.el.burn = h('div.mp-view.mp-view-disc.two', { dataset: { view: 'burn' } }, h('div.mp-disc-pane', null, bDisc, bTitle, bText, bProg, h('div.mp-disc-actions', null, burnBtn)), burnList);

    // Sync
    const device = h('div.mp-device', null, h('div.mp-device-screen', null, G.note(), h('span', null, 'Pocket')), h('div.mp-device-pad', null, h('i')), h('div.mp-device-shine'));
    const sTitle = h('div.mp-disc-title', null, 'Connect a device');
    const sText = h('div.mp-disc-text', null, 'Plug in your pocket music player to fill it with songs. Media Player finds it automatically.');
    const sLook = h('div.mp-sync-look', null, A.ui.spinner({ size: 18 }), h('span', null, 'Looking for devices...'));
    const syncList = dropList(P, P.sync, 'sync', 'Drag items here to create a sync list');
    P.lookForDevices = () => {
      sLook.lastChild.textContent = 'Looking for devices...';
      sLook.classList.remove('done');
      P.later(() => { sLook.lastChild.textContent = 'No device found. Is it charged? Is the cable plugged in all the way?'; sLook.classList.add('done'); }, 3800);
    };
    P.el.sync = h('div.mp-view.mp-view-disc.two', { dataset: { view: 'sync' } }, h('div.mp-disc-pane', null, h('div.mp-device-wrap', null, device, h('div.mp-disc-shadow')), sTitle, sText, sLook,
      h('div.mp-disc-actions', null, A.ui.button('Start sync', { tone: 'aqua', disabled: true }), A.ui.button('Shuffle sync', { onClick: () => { P.sync.splice(0, P.sync.length, ...A.util.shuffle(P.libItems()).slice(0, 4)); syncList.render(); A.sound.play('shuffle'); } }))), syncList);
  }

  // ---------------------------------------------------------------- Now Playing list pane
  function buildList(P) {
    const title = h('button.mp-list-title', { type: 'button', 'data-tip': 'List options' }, h('span', null, 'Now Playing'), G.down());
    title.addEventListener('click', () => { const r = title.getBoundingClientRect(); A.ui.menu(listMenu(P), r.left, r.bottom + 2); });
    const hide = h('button.mp-list-hide', { type: 'button', 'aria-label': 'Hide the list pane', 'data-tip': 'Hide the list pane' }, '×');
    hide.addEventListener('click', () => P.toggleList());
    const artImg = h('img.mp-list-art-img', { alt: '', draggable: false });
    const artTitle = h('div.mp-list-art-title'), artSub = h('div.mp-list-art-sub');
    const art = h('div.mp-list-art', null, artImg, h('div.mp-list-art-text', null, artTitle, artSub));
    const items = h('div.mp-list-items', { tabIndex: 0, role: 'listbox', 'aria-label': 'Now Playing list' });
    const foot = h('div.mp-list-foot');
    const drop = h('div.mp-li-drop');
    P.el.list = h('aside.mp-list', { class: P.showList ? '' : 'hidden' }, h('div.mp-list-head', null, title, hide), art, items, foot);

    P.renderList = () => {
      const cur = P.M.current, q = P.queue;
      const ci = P.qi;
      const showing = cur ? cur : null;
      const it = ci >= 0 ? q[ci] : q[0];
      const artSrc = cur ? (P.current() && P.matches(P.current(), cur) ? P.current() : cur.file ? { kind: 'file', album: cur.album, artist: cur.artist } : cur) : it;
      artImg.src = artSrc ? artFor(artSrc.kind ? artSrc : { kind: 'track', album: artSrc.album, artist: artSrc.artist }, 160).url : '';
      artTitle.textContent = showing ? showing.title : it ? it.title : 'Nothing queued';
      artSub.textContent = showing ? (P.M.state === 'playing' ? 'Now playing' : P.M.state === 'paused' ? 'Paused' : 'Stopped') + ' · ' + showing.artist : it ? 'Up first · ' + it.artist : '';
      items.innerHTML = '';
      if (!q.length) {
        items.appendChild(h('div.mp-list-empty', null, G.note(), h('div', null, 'Drag items here to build a list of songs to play.'), A.ui.button('Add all music', { size: 'sm', onClick: () => P.enqueue(P.libItems()) })));
      }
      q.forEach((x, i) => {
        const isCur = i === ci && cur && P.matches(x, cur);
        const row = h('div.mp-li', { role: 'option', dataset: { i }, class: [isCur && 'current', isCur && P.M.state === 'playing' && 'live', i === P.listSel && 'selected'], 'aria-selected': String(i === P.listSel) },
          h('span.mp-li-mark', null, isCur ? (P.M.state === 'playing' ? G.eq() : G.play()) : String(i + 1)),
          h('span.mp-li-text', null, h('span.mp-li-title', null, x.title), h('span.mp-li-sub', null, x.artist)),
          h('span.mp-li-dur', null, x.duration ? fmt(x.duration) : ''));
        items.appendChild(row);
      });
      const total = q.reduce((a, x) => a + (x.duration || 0), 0);
      foot.textContent = q.length ? q.length + (q.length > 1 ? ' items, ' : ' item, ') + fmtLong(total) : 'No items';
    };

    const rowAt = (e) => { const r = e.target.closest && e.target.closest('.mp-li'); return r ? Number(r.dataset.i) : -1; };
    items.addEventListener('click', (e) => { const i = rowAt(e); if (i < 0) return; P.listSel = i; P.renderList(); items.focus({ preventScroll: true }); });
    items.addEventListener('dblclick', (e) => { const i = rowAt(e); if (i >= 0) { A.sound.play('click'); P.playIndex(i); } });
    items.addEventListener('contextmenu', (e) => {
      const i = rowAt(e);
      if (i < 0) return;
      e.preventDefault();
      P.listSel = i;
      P.renderList();
      const it = P.queue[i];
      A.ui.menu([
        { label: 'Play', bold: true, icon: 'icons/play', onClick: () => P.playIndex(i) },
        { label: 'Remove from list', shortcut: 'Del', onClick: () => P.removeAt(i) },
        { separator: true },
        { label: 'Move up', disabled: i === 0, onClick: () => P.moveItem(i, i - 1) },
        { label: 'Move down', disabled: i >= P.queue.length - 1, onClick: () => P.moveItem(i, i + 2) },
        { separator: true },
        { label: 'Properties', onClick: () => showProperties(P, it) },
      ], e.clientX, e.clientY);
    });
    items.addEventListener('keydown', (e) => {
      const n = P.queue.length;
      if (!n) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); P.listSel = clamp((P.listSel < 0 ? -1 : P.listSel) + (e.key === 'ArrowDown' ? 1 : -1), 0, n - 1); P.renderList(); const r = items.children[P.listSel]; if (r) r.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' && P.listSel >= 0) { e.preventDefault(); e.stopPropagation(); P.playIndex(P.listSel); }
      else if (e.key === 'Delete' && P.listSel >= 0) { e.preventDefault(); e.stopPropagation(); P.removeAt(P.listSel); }
    });
    // Drag to reorder (pointer based) with an insertion line.
    const indexFromY = (y) => {
      const rows = Array.from(items.querySelectorAll('.mp-li'));
      for (let k = 0; k < rows.length; k++) { const r = rows[k].getBoundingClientRect(); if (y < r.top + r.height / 2) return k; }
      return rows.length;
    };
    const showDrop = (k) => {
      const rows = items.querySelectorAll('.mp-li');
      const ir = items.getBoundingClientRect();
      let y = 0;
      if (rows.length) { const r = k < rows.length ? rows[k].getBoundingClientRect() : rows[rows.length - 1].getBoundingClientRect(); y = (k < rows.length ? r.top : r.bottom) - ir.top + items.scrollTop; }
      drop.style.top = (y - 1) + 'px';
      if (!drop.parentNode) items.appendChild(drop);
    };
    A.util.drag(items, {
      threshold: 5,
      filter: (e) => !!(e.target.closest && e.target.closest('.mp-li')),
      onStart: (e) => {
        const i = rowAt(e);
        if (i < 0) return false;
        items._drag = { from: i, to: i };
        const r = items.querySelector('.mp-li[data-i="' + i + '"]');
        if (r) r.classList.add('dragging');
        return true;
      },
      onMove: (e) => {
        const d = items._drag;
        if (!d) return;
        d.to = indexFromY(e.clientY);
        showDrop(d.to);
        const ir = items.getBoundingClientRect();
        if (e.clientY < ir.top + 18) items.scrollTop -= 8; else if (e.clientY > ir.bottom - 18) items.scrollTop += 8;
      },
      onEnd: () => {
        const d = items._drag;
        items._drag = null;
        drop.remove();
        if (!d) return;
        if (d.to !== d.from && d.to !== d.from + 1) { P.moveItem(d.from, d.to); A.sound.play('snap'); }
        else P.renderList();
      },
    });
    // Drops from the Library.
    items.addEventListener('dragover', (e) => {
      if (!Array.from(e.dataTransfer.types).includes('text/x-mp-item')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      P.el.list.classList.add('over');
      showDrop(indexFromY(e.clientY));
    });
    items.addEventListener('dragleave', (e) => { if (!items.contains(e.relatedTarget)) { P.el.list.classList.remove('over'); drop.remove(); } });
    items.addEventListener('drop', (e) => {
      e.preventDefault();
      P.el.list.classList.remove('over');
      const at = indexFromY(e.clientY);
      drop.remove();
      const it = P.findItem(e.dataTransfer.getData('text/x-mp-item'));
      if (it) { P.insertAt(at, [it]); A.sound.play('plop'); }
    });
  }

  function listMenu(P) {
    return [
      { label: 'Clear list', onClick: () => P.clearList() },
      { label: 'Shuffle list now', disabled: P.queue.length < 2, onClick: () => P.shuffleList() },
      { label: 'Sort by', submenu: [['title', 'Title'], ['artist', 'Artist'], ['album', 'Album'], ['duration', 'Length'], ['rating', 'Rating']].map(([k, l]) => ({ label: l, onClick: () => P.sortList(k) })) },
      { separator: true },
      { label: 'Add all music', onClick: () => P.enqueue(P.libItems()) },
      { label: 'Add sample videos', onClick: () => P.enqueue([videoItem('aquarium'), videoItem('clouds')]) },
      { separator: true },
      { label: 'Hide list pane', onClick: () => P.toggleList() },
    ];
  }

  // ---------------------------------------------------------------- playback controller
  function wirePlayback(P) {
    const M = P.M;
    P.durNow = () => M.duration || (P.current() ? P.current().duration : 0) || 0;

    P.setTab = (id, fromHistory) => {
      if (!TABS.some((t) => t[0] === id)) id = 'nowplaying';
      if (P.fs && id !== 'nowplaying') exitFull(P);
      const changed = P.tab !== id;
      if (changed && !fromHistory && !P.booting) { P.history.push(P.tab); if (P.history.length > 20) P.history.shift(); P.future.length = 0; }
      P.tab = id;
      A.store.set('mediaplayer.tab', id);
      Object.keys(P.el.tabs).forEach((k) => { const b = P.el.tabs[k]; b.classList.toggle('active', k === id); b.setAttribute('aria-selected', String(k === id)); });
      [P.el.np, P.el.lib, P.el.rip, P.el.burn, P.el.sync].forEach((v) => { v.hidden = v.dataset.view !== id; });
      P.root.dataset.tab = id;
      P.el.list.classList.toggle('na', id === 'rip' || id === 'burn' || id === 'sync');
      if (id === 'nowplaying') P.ensureVis();
      if (id === 'library') P.renderLibrary();
      if (id === 'sync' && (changed || P.booting)) P.lookForDevices();
      if (id === 'nowplaying' && changed) P.cycleTip();
      P.syncVisVisibility();
      P.el.back.disabled = !P.history.length;
      P.el.fwd.disabled = !P.future.length;
      if (changed && !P.booting) A.sound.play('navigate');
    };

    // ---- UI sync
    let subN = 0;
    const setSub = () => {
      const c = M.current;
      const lines = c ? [c.artist, c.album + (c.year ? ' (' + c.year + ')' : ''), c.genre].filter(Boolean) : [M.state === 'stopped' ? 'Ready' : ''];
      P.el.sub.textContent = lines[subN % lines.length] || '';
    };
    const cycleSub = () => {
      subN++;
      P.el.sub.classList.add('fade');
      P.later(() => { setSub(); P.el.sub.classList.remove('fade'); }, 250);
      P.later(cycleSub, 4200);
    };
    P.later(cycleSub, 4200);
    const marquee = () => {
      const wrap = P.el.titleWrap, t = P.el.title;
      wrap.classList.remove('scroll');
      const over = t.scrollWidth - wrap.clientWidth;
      if (over > 4) { t.style.setProperty('--mp-dist', -(over + 24) + 'px'); t.style.setProperty('--mp-dur', Math.max(6, over / 18) + 's'); wrap.classList.add('scroll'); }
    };
    P.updateNow = () => {
      if (P.closed) return;
      const c = M.current, st = M.state, it = P.current(), playing = st === 'playing';
      const g = P.el.orbGlyph;
      g.innerHTML = '';
      g.appendChild(playing ? G.pause() : G.play());
      const lbl = playing ? 'Pause (Space)' : 'Play (Space)';
      P.el.orb.setAttribute('aria-label', lbl);
      P.el.orb.setAttribute('data-tip', lbl);
      P.root.classList.toggle('playing', playing);
      P.root.classList.toggle('paused', st === 'paused');
      const mine = it && c && P.matches(it, c);
      const artSrc = c ? (mine ? it : c.file ? { kind: 'file', album: c.album, artist: c.artist } : c) : null;
      P.el.thumb.src = artSrc ? artFor(artSrc.kind ? artSrc : { kind: String(c.id).startsWith('video:') ? 'video' : 'track', id: String(c.id).replace('video:', ''), album: c.album, artist: c.artist }, 80).url : A.icon('mediaplayer');
      const newTitle = c ? c.title : 'Media Player';
      if (P.el.title.textContent !== newTitle) { P.el.title.textContent = newTitle; subN = 0; requestAnimationFrame(marquee); }
      setSub();
      P.win.setTitle(c && st !== 'stopped' ? c.title + ' - Media Player' : 'Media Player');
      const vid = c && st !== 'stopped' && String(c.id).startsWith('video:') ? String(c.id).slice(6) : null;
      P.setVideo(vid);
      if (P.video) { if (playing && !P.minimized) P.video.resume(); else P.video.pause(); }
      P.el.idle.hidden = !!(c && st !== 'stopped');
      P.el.idleTitle.textContent = c && st === 'stopped' ? 'Stopped' : 'Nothing is playing yet';
      P.setNpInfo(mine ? it : null, c);
      P.renderList();
      if (P.tab === 'library') P.refreshLibRows();
      if (P.fs) {
        P.fs.title.textContent = c ? c.title + ' · ' + c.artist : 'Media Player';
        P.fs.play.innerHTML = '';
        P.fs.play.appendChild(playing ? G.pause() : G.play());
      }
      P.updateTime();
      P.syncButtons();
      if (playing) P.kickUi();
    };
    P.updateTime = () => {
      const d = P.durNow(), pos = M.current ? M.position : 0;
      if (!P.el.seek.dragging()) P.el.seek.set(d ? pos / d : 0);
      if (!P.el.seek.dragging()) P.el.time.textContent = (P.remaining && d ? '-' + fmt(Math.max(0, d - pos)) : fmt(pos)) + ' / ' + fmt(d);
      P.el.seek.classList.toggle('disabled', !M.current);
    };
    P.refreshLibRows = () => {
      const c = M.current;
      P.el.libBody.querySelectorAll('.mp-row').forEach((r) => {
        const it = P.findItem(r.dataset.key);
        const on = !!(c && it && P.matches(it, c));
        r.classList.toggle('playing', on);
        r.classList.toggle('live', on && M.state === 'playing');
        const no = r.firstChild, has = !!no.querySelector('.mp-eq');
        if (on && !has) { no.textContent = ''; no.appendChild(G.eq()); } else if (!on && has) no.textContent = r.dataset.no || '';
      });
    };
    P.syncButtons = () => {
      const e = P.el;
      e.shuffle.classList.toggle('on', P.shuffle);
      e.shuffle.setAttribute('data-tip', P.shuffle ? 'Turn shuffle off (Ctrl+H)' : 'Turn shuffle on (Ctrl+H)');
      e.repeat.classList.toggle('on', P.repeat !== 'off');
      e.repeat.classList.toggle('one', P.repeat === 'one');
      e.repeat.setAttribute('data-tip', P.repeat === 'off' ? 'Turn repeat on (Ctrl+T)' : P.repeat === 'all' ? 'Repeat one song' : 'Turn repeat off');
      e.listBtn.classList.toggle('on', P.showList);
      e.stop.disabled = M.state === 'stopped';
    };
    P.syncVolume = () => {
      const v = M.volume, m = M.muted;
      P.el.mute.innerHTML = '';
      P.el.mute.appendChild(m ? G.mute() : G.vol(v <= 0.001 ? 0 : v < 0.34 ? 1 : v < 0.67 ? 2 : 3));
      P.el.mute.classList.toggle('on', m);
      P.el.mute.setAttribute('data-tip', m ? 'Sound (M)' : 'Mute (M)');
      P.el.mute.setAttribute('aria-label', m ? 'Sound' : 'Mute');
      P.el.vol.set(v);
      P.el.vol.classList.toggle('muted', m);
    };
    // Smooth seek bar and a play orb that breathes with the music.
    let raf = 0, glow = 0;
    const buf = new Uint8Array(1024);
    const ui = () => {
      raf = 0;
      if (P.closed || P.minimized) return;
      if (M.state !== 'playing') { P.el.orb.style.setProperty('--mp-glow', '0'); return; }
      P.updateTime();
      const an = M.analyser;
      if (an) {
        an.getByteTimeDomainData(buf);
        let acc = 0;
        for (let i = 0; i < buf.length; i += 2) { const x = (buf[i] - 128) / 128; acc += x * x; }
        glow += (clamp(Math.sqrt(acc / (buf.length / 2)) * 5, 0, 1) - glow) * 0.18;
        P.el.orb.style.setProperty('--mp-glow', glow.toFixed(3));
      }
      raf = requestAnimationFrame(ui);
    };
    P.kickUi = () => { if (!raf && !P.closed) raf = requestAnimationFrame(ui); };
    P.stopUi = () => { cancelAnimationFrame(raf); raf = 0; };

    // ---- queue and transport
    P.buildOrder = () => {
      P.order = A.util.shuffle(P.queue.map((_, i) => i));
      if (P.qi >= 0) { P.order.splice(P.order.indexOf(P.qi), 1); P.order.unshift(P.qi); }
      P.oi = 0;
    };
    P.nextIndex = (dir, auto) => {
      const n = P.queue.length;
      if (!n) return -1;
      if (P.shuffle) {
        if (!P.order || P.order.length !== n) P.buildOrder();
        let k = (P.oi || 0) + dir;
        if (k >= n) { if (auto && P.repeat !== 'all') return -1; P.buildOrder(); k = n > 1 ? 1 : 0; }
        if (k < 0) k = 0;
        P.oi = k;
        return P.order[k];
      }
      let k = P.qi + dir;
      if (k >= n) { if (auto && P.repeat !== 'all') return -1; k = 0; }
      if (k < 0) k = P.repeat === 'all' ? n - 1 : 0;
      return k;
    };
    P.playIndex = async (i) => {
      if (i < 0 || i >= P.queue.length || P.closed) return false;
      P.qi = i;
      P.listSel = i;
      const it = P.queue[i];
      P.owned = true;
      if (P.shuffle && P.order) P.oi = Math.max(0, P.order.indexOf(i));
      let ok = false;
      if (it.kind === 'track') ok = await M.play(it.id);
      else if (it.kind === 'video') ok = await M.play('video:' + it.id);
      else ok = await M.playFile(it.url, { name: it.fileName, title: it.title, artist: it.artist, album: it.album, color: it.color });
      if (P.closed) return false;
      if (ok && it.kind === 'video' && P.tab !== 'nowplaying') P.setTab('nowplaying');
      P.updateNow();
      return ok;
    };
    P.next = (auto) => {
      const k = P.nextIndex(1, auto);
      if (k < 0) { P.updateNow(); return; }
      P.playIndex(k);
    };
    P.prev = () => {
      if (M.current && M.state !== 'stopped' && M.position > 3) { M.seek(0); return; }
      const k = P.nextIndex(-1);
      if (k >= 0) P.playIndex(k);
    };
    P.togglePlay = () => {
      if (M.state === 'playing') { M.pause(); return; }
      if (M.state === 'paused' && M.current) { M.resume(); return; }
      if (!P.queue.length) { P.playAll(); return; }
      P.playIndex(P.qi >= 0 && P.qi < P.queue.length ? P.qi : P.listSel >= 0 ? P.listSel : 0);
    };
    P.stop = () => { if (M.state !== 'stopped') M.stop(); P.updateNow(); };
    P.setQueue = (items, start) => {
      P.queue = items.slice();
      P.qi = -1;
      P.order = null;
      P.saveList();
      if (P.shuffle) { P.qi = start; P.buildOrder(); }
      return P.playIndex(start || 0);
    };
    P.playFromList = (items, index) => P.setQueue(items, clamp(index || 0, 0, Math.max(0, items.length - 1)));
    P.playAll = () => {
      const all = P.libItems();
      P.setQueue(all, P.shuffle ? Math.floor(Math.random() * all.length) : 0);
    };
    P.playView = () => {
      const items = P.viewItems();
      if (!items.length) return;
      P.playFromList(sortItems(P, items), 0);
    };
    P.insertAt = (at, items) => {
      at = clamp(at, 0, P.queue.length);
      P.queue.splice(at, 0, ...items);
      if (P.qi >= at) P.qi += items.length;
      P.order = null;
      P.saveList();
      P.renderList();
    };
    P.enqueue = (items, next) => {
      P.insertAt(next ? P.qi + 1 : P.queue.length, items);
      A.sound.play('plop');
      if (!P.showList) P.toggleList();
    };
    P.removeAt = (i) => {
      if (i < 0 || i >= P.queue.length) return;
      P.queue.splice(i, 1);
      if (i === P.qi) P.qi = -1; else if (i < P.qi) P.qi--;
      P.listSel = Math.min(P.listSel, P.queue.length - 1);
      P.order = null;
      P.saveList();
      P.renderList();
      A.sound.play('click');
    };
    P.moveItem = (from, to) => {
      const it = P.queue.splice(from, 1)[0];
      const at = to > from ? to - 1 : to;
      P.queue.splice(at, 0, it);
      if (from === P.qi) P.qi = at;
      else if (from < P.qi && at >= P.qi) P.qi--;
      else if (from > P.qi && at <= P.qi) P.qi++;
      P.listSel = at;
      P.order = null;
      P.saveList();
      P.renderList();
    };
    const reindex = () => { const c = M.current; P.qi = c ? P.queue.findIndex((x) => P.matches(x, c)) : -1; P.order = null; P.saveList(); P.renderList(); };
    P.clearList = () => { P.queue = []; P.qi = -1; P.listSel = -1; reindex(); A.sound.play('recycle'); };
    P.shuffleList = () => { P.queue = A.util.shuffle(P.queue); reindex(); A.sound.play('shuffle'); };
    P.sortList = (k) => { P.queue = P.queue.slice().sort((a, b) => (k === 'rating' ? P.rating(b.key) - P.rating(a.key) : k === 'duration' ? a.duration - b.duration : String(a[k]).localeCompare(String(b[k])))); reindex(); };
    P.toggleShuffle = () => {
      P.shuffle = !P.shuffle;
      A.store.set('mediaplayer.shuffle', P.shuffle);
      if (P.shuffle) P.buildOrder(); else P.order = null;
      A.sound.play(P.shuffle ? 'shuffle' : 'click');
      P.syncButtons();
    };
    P.cycleRepeat = () => {
      P.repeat = P.repeat === 'off' ? 'all' : P.repeat === 'all' ? 'one' : 'off';
      A.store.set('mediaplayer.repeat', P.repeat);
      A.sound.play('click');
      P.syncButtons();
    };
    P.toggleMute = () => { M.muted = !M.muted; A.sound.play('click'); P.syncVolume(); };
    P.toggleList = () => {
      P.showList = !P.showList;
      A.store.set('mediaplayer.showList', P.showList);
      P.el.list.classList.toggle('hidden', !P.showList);
      A.sound.play(P.showList ? 'whooshIn' : 'whooshOut');
      P.syncButtons();
    };
    P.enterFull = () => enterFull(P);
    P.toggleFull = () => (P.fs ? exitFull(P) : enterFull(P));
    P.setVideo = (id) => {
      const cur = P.video ? P.video.id : null;
      if (cur === id) return;
      if (P.video) { P.video.destroy(); P.video = null; }
      if (id) P.video = mountVideo(P, id);
      P.root.classList.toggle('video', !!P.video);
      P.syncVisVisibility();
    };

    // ---- your own files (local only: nothing leaves the computer)
    P.openFiles = () => {
      const input = h('input', { type: 'file', accept: 'audio/*', multiple: true });
      input.addEventListener('change', () => {
        const list = Array.from(input.files || []);
        if (!list.length || P.closed) return;
        const items = list.map((f) => {
          const url = URL.createObjectURL(f);
          const base = f.name.replace(/\.[^.]+$/, '');
          const m = /^(.+?)\s+-\s+(.+)$/.exec(base);
          const it = { kind: 'file', id: url, url, key: 'file:' + url, fileName: f.name, title: m ? m[2] : base, artist: m ? m[1] : 'Unknown Artist', album: 'My Files', genre: 'Unknown', year: '', duration: 0, color: '#5b89b4', size: f.size, no: 0 };
          P.files.push({ item: it, url });
          probeDuration(P, it);
          return it;
        });
        const at = P.queue.length;
        P.queue.push(...items);
        P.order = null;
        P.saveList();
        P.playIndex(at);
        if (P.tab === 'library') P.renderLibrary();
      });
      input.click();
    };

    // ---- events from the music engine
    P.offs.push(M.on('play', (tr) => {
      if (P.closed) return;
      if (!P.matches(P.current(), tr)) {
        P.owned = false;
        const k = P.queue.findIndex((x) => P.matches(x, tr));
        if (k >= 0) P.qi = k;
      }
      P.updateNow();
      P.showInfo(true);
    }));
    P.offs.push(M.on('pause', () => P.updateNow()));
    P.offs.push(M.on('stop', () => P.updateNow()));
    P.offs.push(M.on('time', () => { if (M.state !== 'playing') P.updateTime(); }));
    P.offs.push(M.on('meta', (tr) => {
      const it = P.current();
      if (it && it.kind === 'file' && P.matches(it, tr)) it.duration = tr.duration;
      P.updateNow();
    }));
    P.offs.push(M.on('end', () => {
      if (P.closed) return;
      if (!P.owned) { P.updateNow(); return; }
      if (P.repeat === 'one' && P.qi >= 0) { P.playIndex(P.qi); return; }
      const k = P.nextIndex(1, true);
      if (k >= 0) P.playIndex(k); else P.updateNow();
    }));
    P.offs.push(M.on('error', (e) => {
      if (P.closed) return;
      P.updateNow();
      if (P.owned) A.ui.messageBox({ parent: P.win, title: 'Media Player', icon: 'error', instruction: 'Media Player cannot play this file', message: (e && e.message) || 'The file might be damaged.' });
    }));
    P.offs.push(M.on('volume', () => P.syncVolume()));
    P.offs.push(A.bus.on('mediaplayer:art', () => { if (P.closed) return; P.updateNow(); if (P.tab === 'library') P.renderLibrary(); }));

    // Explorer sends { path, playlist: [paths], folder, play: true }; a double-click sends { path }.
    P.handleArgs = (a) => {
      if (!a) return false;
      if (a.action === 'playall') { P.playAll(); return true; }
      if (a.action === 'shuffle') { if (!P.shuffle) P.toggleShuffle(); P.playAll(); return true; }
      if (Array.isArray(a.playlist) && a.playlist.length) { openPlaylist(P, a.playlist, a.path); return true; }
      if (a.path) { openPath(P, a.path); return true; }
      if (a.folder) { openPlaylist(P, A.fs.list(a.folder).filter((x) => x.type === 'file').map((x) => x.path), null); return true; }
      return false;
    };
  }

  function probeDuration(P, it) {
    const a = new Audio();
    a.preload = 'metadata';
    const done = () => { a.removeAttribute('src'); try { a.load(); } catch (e) { /* ignore */ } };
    a.addEventListener('loadedmetadata', () => {
      if (isFinite(a.duration)) it.duration = a.duration;
      done();
      if (!P.closed) { P.renderList(); if (P.tab === 'library') P.renderLibrary(); }
    }, { once: true });
    a.addEventListener('error', done, { once: true });
    a.src = it.url;
  }

  function itemForPath(path) {
    const data = String(A.fs.read(path) || '');
    return data.startsWith('track:') || data.startsWith('video:') ? itemFromKey(data) : null;
  }
  function openPlaylist(P, paths, start) {
    const items = [], skipped = [];
    let idx = 0;
    paths.forEach((p) => {
      const it = itemForPath(p);
      if (!it) { skipped.push(A.fs.basename(p)); return; }
      if (start && A.fs.normalize(p) === A.fs.normalize(start)) idx = items.length;
      items.push(it);
    });
    if (!items.length) { if (start) openPath(P, start); else unplayable(P, skipped[0] || 'This folder'); return; }
    if (items[idx].kind === 'video') P.setTab('nowplaying');
    P.playFromList(items, idx);
  }
  function unplayable(P, name) {
    A.ui.messageBox({
      parent: P.win, title: 'Media Player', icon: 'error',
      instruction: 'Media Player cannot play the file',
      message: name + '\n\nThe file might be damaged, or it might use a codec that is not installed on this computer.',
      detail: 'To play music from your real computer, choose Open file in the Library.',
    });
  }
  function openPath(P, path) {
    const name = A.fs.basename(path);
    const data = String(A.fs.read(path) || '');
    if (data.startsWith('track:')) {
      const id = data.slice(6);
      const dir = A.fs.dirname(path);
      const list = A.fs.list(dir).map((x) => itemFromKey(String(A.fs.read(x.path) || ''))).filter((x) => x && x.kind === 'track');
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) { P.playFromList(list, idx); return; }
      const t = itemFromKey(data);
      if (t) { P.playFromList([t], 0); return; }
    } else if (data.startsWith('video:')) {
      const v = videoItem(data.slice(6));
      if (v) { P.setTab('nowplaying'); P.playFromList([v], 0); return; }
    }
    unplayable(P, name);
  }

  // ---------------------------------------------------------------- menus and dialogs
  function tabMenu(P, id, anchor) {
    const r = anchor.getBoundingClientRect();
    let items;
    if (id === 'nowplaying') {
      items = visMenuItems(P).concat([
        { separator: true },
        { label: 'Player color', submenu: TINTS.map(([v, l]) => ({ label: l, radio: true, checked: P.tint === v, onClick: () => { applyTint(P, v); A.store.set('mediaplayer.tint', v); A.sound.play('select'); } })) },
        { label: 'Enhancements', submenu: [{ label: 'Graphic equalizer...', onClick: () => eqDialog(P) }] },
        { separator: true },
        { label: 'Show list pane', checked: P.showList, onClick: () => P.toggleList() },
        { label: 'Full screen', shortcut: 'F11', onClick: () => { P.setTab('nowplaying'); P.enterFull(); } },
      ]);
    } else if (id === 'library') {
      items = [{ header: 'View' }].concat(LIB_VIEWS.map(([v, l]) => ({ label: l, radio: true, checked: P.libView === v && !P.libFilter, onClick: () => { P.libFilter = null; P.libView = v; A.store.set('mediaplayer.libView', v); P.setTab('library'); P.renderLibrary(); } })), [
        { separator: true },
        { label: 'Play all', onClick: () => P.playAll() },
        { label: 'Open file...', shortcut: 'Ctrl+O', onClick: () => P.openFiles() },
      ]);
    } else if (id === 'rip') items = P.ripMenu();
    else if (id === 'burn') {
      const mode = A.store.get('mediaplayer.burn.mode', 'audio');
      items = [
        { label: 'Audio CD', radio: true, checked: mode === 'audio', onClick: () => A.store.set('mediaplayer.burn.mode', 'audio') },
        { label: 'Data CD or DVD', radio: true, checked: mode === 'data', onClick: () => A.store.set('mediaplayer.burn.mode', 'data') },
        { separator: true },
        { label: 'Eject disc after burning', checked: A.store.get('mediaplayer.burn.eject', true), onClick: () => A.store.set('mediaplayer.burn.eject', !A.store.get('mediaplayer.burn.eject', true)) },
      ];
    } else {
      items = [
        { label: 'Set up sync...', onClick: () => A.ui.messageBox({ parent: P.win, title: 'Media Player', icon: 'info', instruction: 'Connect a device first', message: 'Plug in your pocket player, then come back to set up sync.' }) },
        { label: 'Refresh devices', onClick: () => P.lookForDevices() },
      ];
    }
    A.ui.menu(items, r.left, r.bottom + 2);
  }

  function eqDialog(P) {
    const M = P.M, labels = ['60 Hz', '250 Hz', '1 kHz', '4 kHz', '12 kHz'];
    const presets = { Flat: [0, 0, 0, 0, 0], 'Aerium glow': [3, 1, 0, 2, 4], Rock: [5, 2, -1, 3, 5], Pop: [-1, 2, 4, 2, -1], Jazz: [3, 1, -1, 1, 3], Classical: [4, 2, 0, 2, 4], Dance: [6, 3, 0, 2, 3], 'Tiny speakers': [-6, 2, 3, 2, 1] };
    let gains = M.eq;
    const bands = labels.map((l, i) => {
      const sl = A.ui.slider({ min: -12, max: 12, step: 1, value: gains[i], vertical: true, label: l, onInput: (v) => { gains[i] = v; M.setEQ(gains); } });
      return h('div.mp-eq-band', null, sl, h('div.mp-eq-l', null, l));
    });
    const setAll = (g) => { gains = g.slice(); M.setEQ(gains); bands.forEach((b, i) => b.firstChild.setValue(gains[i])); };
    const cur = Object.keys(presets).find((k) => presets[k].every((x, i) => x === gains[i])) || 'Flat';
    const sel = A.ui.select({ options: Object.keys(presets), value: cur, onChange: (v) => setAll(presets[v]) });
    const content = h('div.mp-eqd', null,
      h('div.mp-eqd-top', null, h('span', null, 'Preset:'), sel, A.ui.button('Reset', { size: 'sm', onClick: () => { sel.value = 'Flat'; setAll(presets.Flat); } })),
      h('div.mp-eqd-bands', null, bands),
      h('div.mp-eqd-note', null, 'Changes apply right away, to every song.'));
    A.ui.dialog({ parent: P.win, title: 'Graphic Equalizer', icon: 'icons/mediaplayer', width: 380, content, buttons: [{ label: 'Close', default: true }] });
  }

  // ---------------------------------------------------------------- keyboard
  function wireKeys(P) {
    const M = P.M;
    P.win.el.addEventListener('keydown', (e) => {
      if (A.util.isTyping(e)) return;
      const k = e.key, lk = k.length === 1 ? k.toLowerCase() : k, ctrl = e.ctrlKey || e.metaKey;
      const onControl = !!(e.target.closest && e.target.closest('button, [role="slider"], select, .mp-list-items'));
      if (k === ' ') { if (onControl && !e.target.closest('.mp-list-items')) return; e.preventDefault(); P.togglePlay(); }
      else if (ctrl && lk === 'o') { e.preventDefault(); P.openFiles(); }
      else if (ctrl && (lk === 'f' || k === 'ArrowRight')) { e.preventDefault(); P.next(); }
      else if (ctrl && (lk === 'b' || k === 'ArrowLeft')) { e.preventDefault(); P.prev(); }
      else if (ctrl && lk === 'p') { e.preventDefault(); P.togglePlay(); }
      else if (ctrl && lk === 's') { e.preventDefault(); P.stop(); }
      else if (ctrl && lk === 'h') { e.preventDefault(); P.toggleShuffle(); }
      else if (ctrl && lk === 't') { e.preventDefault(); P.cycleRepeat(); }
      else if (ctrl && lk === 'j') { e.preventDefault(); P.eject(); }
      else if (ctrl && /^[1-5]$/.test(k)) { e.preventDefault(); P.setTab(TABS[Number(k) - 1][0]); }
      else if (k === 'F11' || (e.altKey && k === 'Enter')) { e.preventDefault(); P.toggleFull(); }
      else if (k === 'Escape' && P.fs) { e.preventDefault(); exitFull(P); }
      else if (ctrl) return;
      else if (k === 'ArrowLeft' || k === 'ArrowRight') {
        if (onControl && e.target.closest('[role="slider"]')) return;
        e.preventDefault();
        if (M.current && M.state !== 'stopped') M.seek(M.position + (k === 'ArrowLeft' ? -5 : 5));
      } else if ((k === 'ArrowUp' || k === 'ArrowDown') && P.tab === 'nowplaying') { e.preventDefault(); P.stepVis(k === 'ArrowUp' ? -1 : 1); }
      else if ((k === 'ArrowUp' || k === 'ArrowDown') && P.tab === 'library') {
        const rows = Array.from(P.el.libBody.querySelectorAll('.mp-row'));
        if (!rows.length) return;
        e.preventDefault();
        let i = rows.findIndex((r) => r.dataset.key === P.selKey);
        i = clamp(i + (k === 'ArrowDown' ? 1 : -1), 0, rows.length - 1);
        rows.forEach((r) => r.classList.remove('selected'));
        rows[i].classList.add('selected');
        rows[i].scrollIntoView({ block: 'nearest' });
        P.selKey = rows[i].dataset.key;
      } else if (k === 'Enter' && P.tab === 'library' && P.selKey && !onControl) {
        const row = P.el.libBody.querySelector('.mp-row.selected');
        if (row && row.playNow) { e.preventDefault(); row.playNow(); }
      } else if (lk === 'm') P.toggleMute();
      else if (lk === 'f' && P.tab === 'nowplaying') P.toggleFull();
      else if (k === '+' || k === '=') M.volume = Math.min(1, M.volume + 0.05);
      else if (k === '-' || k === '_') M.volume = Math.max(0, M.volume - 0.05);
    });
  }

  // ================================================================ app
  A.apps.register({
    id: 'mediaplayer',
    name: 'Media Player',
    icon: 'icons/mediaplayer',
    color: '#3fa9f5',
    category: 'media',
    description: 'Plays music and videos, shows dreamy visualizations, and pretends to burn CDs.',
    keywords: ['music', 'video', 'songs', 'mp3', 'player', 'visualization', 'audio', 'wmv', 'playlist'],
    fileTypes: ['mp3', 'wma', 'wav', 'ogg', 'm4a', 'wmv', 'avi', 'mp4'],
    single: true,
    window: { width: 980, height: 620, minWidth: 600, minHeight: 440, glassBody: true },
    tasks: [
      { label: 'Play all music', icon: 'icons/play', onClick() { A.apps.launch('mediaplayer', { action: 'playall' }); } },
      { label: 'Shuffle all music', icon: 'icons/sync', onClick() { A.apps.launch('mediaplayer', { action: 'shuffle' }); } },
    ],
    launch(win, args) {
      const P = createPlayer(win, args);
      const M = P.M;
      P.booting = true;
      P.setTab(P.tab);
      P.booting = false;
      if (M.current) { const k = P.queue.findIndex((x) => P.matches(x, M.current)); if (k >= 0) P.qi = k; }
      P.syncVolume();
      P.syncButtons();
      P.updateNow();
      P.handleArgs(args);
      win.on('minimize', () => { P.minimized = true; P.syncVisVisibility(); if (P.video) P.video.pause(); });
      win.on('restore', () => { P.minimized = false; P.syncVisVisibility(); if (P.video && M.state === 'playing') P.video.resume(); P.kickUi(); });
      setTimeout(() => { if (!P.closed) P.root.focus({ preventScroll: true }); }, 60);
      return {
        onArgs(a) { P.handleArgs(a); },
        keepAwake() { return M.state === 'playing' && (!!P.video || !!P.fs); },
        onClose() {
          P.closed = true;
          if (P.fs) exitFull(P);
          const c = M.current;
          if (M.state !== 'stopped' && (P.owned || (c && P.queue.some((x) => P.matches(x, c))))) M.stop({ fadeOut: 0.25 });
          P.offs.forEach((off) => { try { off(); } catch (e) { /* ignore */ } });
          P.timers.forEach((t) => clearTimeout(t));
          P.stopUi();
          if (P.vis) P.vis.destroy();
          if (P.video) P.video.destroy();
          const urls = P.files.map((f) => f.url);
          if (urls.length) setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 1500);
        },
      };
    },
  });
})();
