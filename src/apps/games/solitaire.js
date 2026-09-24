/* Solitaire (Klondike): draw one or three, smooth drag and drop, double-click
   to the foundations, undo, hints, auto-complete, statistics, eight glossy
   card backs, four felts and the bouncing win cascade with trails. */
(function () {
  'use strict';
  const A = window.Aerium;
  const K = A.gameKit;
  const { h, clamp } = A.util;
  const ID = 'solitaire';
  const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RANK_NAMES = ['', 'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'];
  const SUITS = ['S', 'H', 'D', 'C'];
  const BACKS = [['fish', 'Goldfish'], ['bubbles', 'Bubbles'], ['aurora', 'Aurora'], ['meadow', 'Meadow'], ['dolphins', 'Dolphins'], ['sunburst', 'Sunburst'], ['pearl', 'Pearl'], ['garden', 'Garden']];
  const FELTS = [['green', 'Meadow', '#38a84a', '#0f4f27'], ['blue', 'Ocean', '#2f88d8', '#0b3366'], ['teal', 'Lagoon', '#23b0a2', '#094e49'], ['night', 'Night', '#40546d', '#0f1824']];
  const DEFAULTS = { draw: 1, scoring: 'standard', timed: true, sound: true, animations: true, back: 'fish', felt: 'green', autoSave: false, autoContinue: false };

  // ================================================================ drawing
  const pathCache = {};
  const suitPath = (s) => pathCache[s] || (pathCache[s] = new Path2D(K.SUITS[s].path));
  function rr(c, x, y, w, hh, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + hh, r);
    c.arcTo(x + w, y + hh, x, y + hh, r);
    c.arcTo(x, y + hh, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  let FONT = 'Selawik, "Segoe UI", sans-serif';
  const refreshFont = () => { FONT = getComputedStyle(document.body).fontFamily || FONT; };

  // A glossy suit symbol centered at (cx, cy); flip turns it upside down.
  function drawPip(c, suit, cx, cy, size, flip) {
    const red = K.SUITS[suit].red, p = suitPath(suit);
    c.save();
    c.translate(cx, cy);
    if (flip) c.rotate(Math.PI);
    c.scale(size / 100, size / 100);
    c.translate(-50, -50);
    const g = c.createLinearGradient(0, flip ? 100 : 0, 0, flip ? 0 : 100);
    if (red) { g.addColorStop(0, '#ff7f6b'); g.addColorStop(0.5, '#e0301f'); g.addColorStop(1, '#a3140b'); }
    else { g.addColorStop(0, '#687486'); g.addColorStop(0.5, '#222b37'); g.addColorStop(1, '#05080c'); }
    c.fillStyle = g;
    c.fill(p);
    c.lineWidth = 3;
    c.strokeStyle = red ? 'rgba(110,8,4,.45)' : 'rgba(0,0,0,.55)';
    c.stroke(p);
    c.save();
    c.clip(p);
    c.fillStyle = 'rgba(255,255,255,.42)';
    c.beginPath();
    c.ellipse(flip ? 58 : 42, flip ? 77 : 23, 36, 16, -0.25, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.restore();
  }

  const PL = 74, PC = 125, PR = 176;
  const LAYOUT = {
    2: [[PC, 72], [PC, 278]],
    3: [[PC, 72], [PC, 175], [PC, 278]],
    4: [[PL, 72], [PR, 72], [PL, 278], [PR, 278]],
    5: [[PL, 72], [PR, 72], [PC, 175], [PL, 278], [PR, 278]],
    6: [[PL, 72], [PR, 72], [PL, 175], [PR, 175], [PL, 278], [PR, 278]],
    7: [[PL, 72], [PR, 72], [PC, 123], [PL, 175], [PR, 175], [PL, 278], [PR, 278]],
    8: [[PL, 72], [PR, 72], [PC, 123], [PL, 175], [PR, 175], [PC, 227], [PL, 278], [PR, 278]],
    9: [[PL, 70], [PR, 70], [PL, 140], [PR, 140], [PC, 175], [PL, 210], [PR, 210], [PL, 280], [PR, 280]],
    10: [[PL, 70], [PR, 70], [PC, 105], [PL, 140], [PR, 140], [PL, 210], [PR, 210], [PC, 245], [PL, 280], [PR, 280]],
  };
  const ROBE = { H: ['#ff9a86', '#d9321f', '#99150b'], D: ['#ffc76e', '#ef7c12', '#a84606'], S: ['#86b6ff', '#2f63c8', '#132c66'], C: ['#96e37e', '#2e9a39', '#12561d'] };

  function drawCard(c, suit, rank, W, H) {
    const red = K.SUITS[suit].red, ink = red ? '#cc2417' : '#131a25';
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    c.scale(W / 250, H / 350);
    rr(c, 2, 2, 246, 346, 18);
    const bg = c.createLinearGradient(0, 0, 0, 350);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.62, '#f6f9fc'); bg.addColorStop(1, '#e3ecf5');
    c.fillStyle = bg; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#8391a0'; c.stroke();
    // soft glossy sheen on the card stock, under the ink so ranks stay crisp
    c.save();
    rr(c, 2, 2, 246, 346, 18); c.clip();
    const sh = c.createLinearGradient(0, 0, 0, 150);
    sh.addColorStop(0, 'rgba(220,238,252,.55)'); sh.addColorStop(1, 'rgba(220,238,252,0)');
    c.fillStyle = sh;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(250, 0); c.lineTo(250, 96); c.quadraticCurveTo(125, 138, 0, 96); c.closePath(); c.fill();
    c.restore();
    const label = RANKS[rank];
    const txt = (x, y, rot) => {
      c.save(); c.translate(x, y); if (rot) c.rotate(Math.PI); if (label === '10') c.scale(0.76, 1);
      c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.font = '700 52px ' + FONT;
      c.fillText(label, 0, 0);
      c.restore();
    };
    txt(31, 60, false); drawPip(c, suit, 31, 86, 30, false);
    txt(219, 290, true); drawPip(c, suit, 219, 264, 30, true);
    if (rank === 1) drawAce(c, suit);
    else if (rank > 10) drawCourt(c, suit, rank);
    else LAYOUT[rank].forEach(([x, y]) => drawPip(c, suit, x, y, rank <= 3 ? 56 : rank >= 9 ? 46 : 50, y > 176));
    // a thin bright edge along the top, like light catching laminated card
    c.save();
    rr(c, 2, 2, 246, 346, 18); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(20, 5.5); c.lineTo(230, 5.5); c.stroke();
    c.restore();
  }

  function drawAce(c, suit) {
    if (suit === 'S') {
      c.save();
      c.strokeStyle = 'rgba(19,26,37,.28)'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(125, 175, 84, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(125, 175, 76, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2, x = 125 + Math.cos(a) * 80, y = 175 + Math.sin(a) * 80;
        const g = c.createRadialGradient(x - 2, y - 2, 0.5, x, y, 6);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#9fdcff'); g.addColorStop(1, '#2f7fd0');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, 5.5, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      drawPip(c, suit, 125, 172, 104, false);
    } else drawPip(c, suit, 125, 175, 118, false);
  }

  function drawCourt(c, suit, rank) {
    const [r1, r2, r3] = ROBE[suit];
    rr(c, 46, 48, 158, 254, 12);
    const fg = c.createLinearGradient(0, 48, 0, 302);
    fg.addColorStop(0, '#fffdf5'); fg.addColorStop(0.5, '#eef6ff'); fg.addColorStop(1, '#fffdf5');
    c.fillStyle = fg; c.fill();
    c.save();
    rr(c, 46, 48, 158, 254, 12); c.clip();
    courtHalf(c, rank, r1, r2, r3);
    c.save(); c.translate(250, 350); c.rotate(Math.PI); courtHalf(c, rank, r1, r2, r3); c.restore();
    c.strokeStyle = 'rgba(11,42,74,.16)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(46, 175); c.lineTo(204, 175); c.stroke();
    c.restore();
    rr(c, 46, 48, 158, 254, 12);
    c.lineWidth = 3; c.strokeStyle = r2; c.stroke();
    drawPip(c, suit, 68, 72, 26, false);
    drawPip(c, suit, 182, 278, 26, true);
  }

  function courtHalf(c, rank, r1, r2, r3) {
    const circle = (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); };
    // long hair behind the head
    if (rank === 12) {
      const hg = c.createLinearGradient(0, 80, 0, 160);
      hg.addColorStop(0, '#f7c56a'); hg.addColorStop(1, '#c47a22');
      c.fillStyle = hg;
      c.beginPath(); c.moveTo(98, 104); c.bezierCurveTo(94, 70, 156, 70, 152, 104); c.bezierCurveTo(156, 130, 160, 150, 150, 168); c.lineTo(100, 168); c.bezierCurveTo(90, 150, 94, 130, 98, 104); c.fill();
    }
    // robe
    const g = c.createLinearGradient(0, 128, 0, 178);
    g.addColorStop(0, r1); g.addColorStop(0.5, r2); g.addColorStop(1, r3);
    c.fillStyle = g;
    c.beginPath(); c.moveTo(62, 178); c.bezierCurveTo(64, 148, 86, 134, 108, 132); c.lineTo(142, 132); c.bezierCurveTo(164, 134, 186, 148, 188, 178); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.32)';
    c.beginPath(); c.ellipse(100, 147, 24, 7, -0.35, 0, Math.PI * 2); c.fill();
    // gold collar
    c.strokeStyle = '#f5b82e'; c.lineWidth = 5; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(104, 133); c.lineTo(125, 162); c.lineTo(146, 133); c.stroke();
    c.fillStyle = '#fff3b0'; circle(125, 150, 4); c.fill();
    // neck and head
    c.fillStyle = '#f3c9a0'; c.fillRect(117, 120, 16, 16);
    const sk = c.createRadialGradient(118, 98, 3, 125, 106, 26);
    sk.addColorStop(0, '#fff3e6'); sk.addColorStop(1, '#efbf94');
    c.fillStyle = sk; circle(125, 106, 22); c.fill();
    c.strokeStyle = 'rgba(150,90,40,.35)'; c.lineWidth = 1.2; circle(125, 106, 22); c.stroke();
    // hair
    if (rank === 13) {
      c.fillStyle = '#eef2f6';
      c.beginPath(); c.moveTo(104, 104); c.bezierCurveTo(104, 132, 118, 146, 125, 146); c.bezierCurveTo(132, 146, 146, 132, 146, 104); c.bezierCurveTo(140, 118, 110, 118, 104, 104); c.fill();
      c.strokeStyle = 'rgba(120,135,150,.6)'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#e2e8ee'; c.beginPath(); c.ellipse(118, 117, 8, 3, 0.3, 0, Math.PI * 2); c.ellipse(132, 117, 8, 3, -0.3, 0, Math.PI * 2); c.fill();
    } else if (rank === 11) {
      c.fillStyle = '#8a5424';
      c.beginPath(); c.moveTo(103, 102); c.bezierCurveTo(104, 84, 146, 84, 147, 102); c.bezierCurveTo(136, 94, 114, 94, 103, 102); c.fill();
    } else {
      c.fillStyle = '#e8a94a';
      c.beginPath(); c.moveTo(103, 104); c.bezierCurveTo(104, 82, 146, 82, 147, 104); c.bezierCurveTo(138, 92, 112, 92, 103, 104); c.fill();
    }
    // face
    c.fillStyle = '#25303c'; circle(117, 104, 2.5); c.fill(); circle(133, 104, 2.5); c.fill();
    c.fillStyle = 'rgba(255,110,110,.32)'; circle(111, 113, 4.5); c.fill(); circle(139, 113, 4.5); c.fill();
    if (rank !== 13) { c.strokeStyle = '#b8574a'; c.lineWidth = 1.8; c.beginPath(); c.arc(125, 112, 5, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
    // headwear
    const gold = c.createLinearGradient(0, 58, 0, 92);
    gold.addColorStop(0, '#fff3b0'); gold.addColorStop(0.5, '#ffcf3a'); gold.addColorStop(1, '#d88a0a');
    if (rank === 13) {
      c.fillStyle = gold;
      c.beginPath(); c.moveTo(101, 90); c.lineTo(103, 64); c.lineTo(114, 78); c.lineTo(125, 58); c.lineTo(136, 78); c.lineTo(147, 64); c.lineTo(149, 90); c.closePath(); c.fill();
      c.strokeStyle = '#a86400'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = r2; circle(125, 80, 4); c.fill();
      c.fillStyle = '#7fe6ff'; circle(111, 84, 2.6); c.fill(); circle(139, 84, 2.6); c.fill();
      // scepter
      c.strokeStyle = '#d88a0a'; c.lineWidth = 5; c.beginPath(); c.moveTo(78, 178); c.lineTo(88, 122); c.stroke();
      c.fillStyle = gold; circle(89, 118, 7); c.fill();
    } else if (rank === 12) {
      c.fillStyle = gold;
      c.beginPath(); c.moveTo(104, 88); c.quadraticCurveTo(125, 76, 146, 88); c.lineTo(146, 82); c.quadraticCurveTo(125, 70, 104, 82); c.closePath(); c.fill();
      [110, 125, 140].forEach((x, i) => { c.fillStyle = gold; circle(x, i === 1 ? 70 : 76, 5); c.fill(); c.fillStyle = i === 1 ? r2 : '#7fe6ff'; circle(x, i === 1 ? 70 : 76, 2.2); c.fill(); });
      // flower
      c.fillStyle = '#ff8cc6';
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; circle(86 + Math.cos(a) * 6, 128 + Math.sin(a) * 6, 5); c.fill(); }
      c.fillStyle = '#ffe066'; circle(86, 128, 4); c.fill();
      c.strokeStyle = '#2f9a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(86, 136); c.lineTo(80, 178); c.stroke();
    } else {
      c.fillStyle = r2;
      c.beginPath(); c.ellipse(125, 86, 26, 10, -0.08, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(118, 82, 12, 4, -0.1, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#f5b82e'; c.lineWidth = 3; c.beginPath(); c.moveTo(101, 90); c.quadraticCurveTo(125, 96, 149, 90); c.stroke();
      // feather
      c.strokeStyle = '#3ecf5a'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(142, 82); c.quadraticCurveTo(160, 62, 170, 60); c.stroke();
      c.lineCap = 'butt';
      // leaf token
      c.fillStyle = '#52c43c'; c.beginPath(); c.ellipse(166, 132, 9, 15, 0.6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#1f7a1a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(158, 142); c.lineTo(174, 122); c.stroke();
    }
  }

  // ---------------------------------------------------------------- backs
  function sheenAndFrame(c) {
    const sh = c.createLinearGradient(0, 14, 0, 170);
    sh.addColorStop(0, 'rgba(255,255,255,.48)'); sh.addColorStop(1, 'rgba(255,255,255,.03)');
    c.fillStyle = sh;
    c.beginPath(); c.moveTo(14, 14); c.lineTo(236, 14); c.lineTo(236, 126); c.quadraticCurveTo(125, 166, 14, 126); c.closePath(); c.fill();
  }
  function bubble(c, x, y, r, a = 1) {
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); g.addColorStop(0.45, `rgba(255,255,255,${0.12 * a})`); g.addColorStop(0.9, `rgba(200,240,255,${0.35 * a})`); g.addColorStop(1, `rgba(255,255,255,${0.85 * a})`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  function vgrad(c, y0, y1, stops) { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
  const DOLPHIN = new Path2D('M4 44 C18 30 40 20 66 20 C72 12 76 8 81 5 C81 11 80 16 79 21 C92 23 104 28 112 33 L119 36 C112 39 104 41 96 41 C88 44 80 46 72 46 C70 52 66 58 59 62 C60 56 60 51 58 47 C44 48 30 48 18 50 C12 56 7 61 1 64 C4 57 6 52 7 48 C2 46 -2 42 -5 36 C0 39 2 42 4 44 Z');
  const BACK_ART = {
    fish(c) {
      c.fillStyle = vgrad(c, 14, 336, [[0, '#8ff0ff'], [0.5, '#22b8dc'], [1, '#08588f']]); c.fillRect(0, 0, 250, 350);
      c.fillStyle = 'rgba(255,255,255,.1)';
      [[40, 90], [120, 170], [190, 230]].forEach(([a, b]) => { c.beginPath(); c.moveTo(a, 14); c.lineTo(a + 30, 14); c.lineTo(b + 20, 336); c.lineTo(b - 20, 336); c.fill(); });
      c.fillStyle = '#0a6b4a';
      for (let i = 0; i < 4; i++) { const x = 30 + i * 60; c.beginPath(); c.moveTo(x, 340); c.quadraticCurveTo(x - 14, 300, x + 4, 262); c.quadraticCurveTo(x + 4, 300, x + 12, 340); c.fill(); }
      // goldfish
      const body = c.createLinearGradient(0, 140, 0, 214);
      body.addColorStop(0, '#ffe08a'); body.addColorStop(0.5, '#ff8f24'); body.addColorStop(1, '#d9520a');
      c.fillStyle = body;
      c.beginPath(); c.moveTo(78, 176); c.bezierCurveTo(44, 132, 30, 150, 40, 176); c.bezierCurveTo(30, 204, 44, 220, 78, 176); c.fill();
      c.beginPath(); c.moveTo(108, 146); c.bezierCurveTo(122, 116, 152, 122, 158, 148); c.fill();
      c.beginPath(); c.ellipse(128, 178, 56, 36, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(122, 160, 34, 12, -0.1, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(200,80,10,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(150, 178, 22, -1.1, 1.1); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(160, 170, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#132030'; c.beginPath(); c.arc(162, 170, 4.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(163.5, 168.5, 1.5, 0, Math.PI * 2); c.fill();
      [[190, 140, 8], [204, 108, 6], [196, 80, 10], [214, 56, 5], [60, 90, 7], [48, 60, 5]].forEach(([x, y, r]) => bubble(c, x, y, r));
    },
    bubbles(c) {
      const g = c.createRadialGradient(125, 150, 10, 125, 175, 220);
      g.addColorStop(0, '#9ff2ff'); g.addColorStop(0.5, '#2a9ae8'); g.addColorStop(1, '#0a3a78');
      c.fillStyle = g; c.fillRect(0, 0, 250, 350);
      const rnd = A.util.seeded(7);
      for (let i = 0; i < 26; i++) bubble(c, 20 + rnd() * 210, 20 + rnd() * 310, 6 + rnd() * rnd() * 34, 0.7 + rnd() * 0.3);
    },
    aurora(c) {
      c.fillStyle = vgrad(c, 14, 336, [[0, '#020a1e'], [0.6, '#062347'], [1, '#0b4a5e']]); c.fillRect(0, 0, 250, 350);
      const rnd = A.util.seeded(3);
      c.fillStyle = '#fff';
      for (let i = 0; i < 40; i++) { c.globalAlpha = 0.3 + rnd() * 0.6; c.fillRect(14 + rnd() * 222, 14 + rnd() * 200, 1.6, 1.6); }
      c.globalAlpha = 1;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.filter = 'blur(7px)';
      [['#3ee6a0', 60, 150, 0.55], ['#2aceda', 90, 190, 0.45], ['#7cffb0', 40, 120, 0.3]].forEach(([col, y0, y1, a]) => {
        c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = 34;
        c.beginPath(); c.moveTo(-10, y1); c.bezierCurveTo(60, y0, 150, y1 + 40, 260, y0 + 10); c.stroke();
      });
      c.restore();
      c.fillStyle = '#021026';
      c.beginPath(); c.moveTo(0, 350); c.lineTo(0, 290); c.lineTo(40, 258); c.lineTo(80, 284); c.lineTo(130, 240); c.lineTo(180, 280); c.lineTo(215, 262); c.lineTo(250, 286); c.lineTo(250, 350); c.fill();
    },
    meadow(c) {
      c.fillStyle = vgrad(c, 14, 240, [[0, '#1f8fe6'], [0.6, '#7cc8ff'], [1, '#e6f7ff']]); c.fillRect(0, 0, 250, 350);
      const sun = c.createRadialGradient(70, 80, 4, 70, 80, 70);
      sun.addColorStop(0, 'rgba(255,255,240,1)'); sun.addColorStop(0.25, 'rgba(255,243,168,.8)'); sun.addColorStop(1, 'rgba(255,243,168,0)');
      c.fillStyle = sun; c.fillRect(0, 0, 250, 200);
      c.fillStyle = 'rgba(255,255,255,.9)';
      [[160, 80, 30], [185, 72, 22], [140, 86, 20]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); });
      c.fillStyle = vgrad(c, 200, 336, [[0, '#9fe86a'], [0.5, '#3cc43c'], [1, '#157a1f']]);
      c.beginPath(); c.moveTo(0, 240); c.bezierCurveTo(70, 190, 140, 250, 250, 210); c.lineTo(250, 350); c.lineTo(0, 350); c.fill();
      c.fillStyle = vgrad(c, 250, 336, [[0, '#6fd84a'], [1, '#0f5a1c']]);
      c.beginPath(); c.moveTo(0, 290); c.bezierCurveTo(90, 250, 170, 300, 250, 270); c.lineTo(250, 350); c.lineTo(0, 350); c.fill();
      const rnd = A.util.seeded(11);
      for (let i = 0; i < 14; i++) { c.fillStyle = rnd() < 0.5 ? '#fff' : '#ffe066'; c.beginPath(); c.arc(20 + rnd() * 210, 280 + rnd() * 50, 2.5, 0, Math.PI * 2); c.fill(); }
    },
    dolphins(c) {
      c.fillStyle = vgrad(c, 14, 170, [[0, '#6cc4ff'], [1, '#e6f7ff']]); c.fillRect(0, 0, 250, 175);
      c.fillStyle = vgrad(c, 170, 336, [[0, '#22b8dc'], [1, '#07407a']]); c.fillRect(0, 170, 250, 180);
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.5;
      for (let i = 0; i < 5; i++) { const y = 186 + i * 30; c.beginPath(); c.moveTo(14, y); for (let x = 14; x <= 236; x += 20) c.quadraticCurveTo(x + 5, y - 6, x + 10, y); c.stroke(); }
      const dg = c.createLinearGradient(0, 0, 0, 64);
      dg.addColorStop(0, '#bfe6ff'); dg.addColorStop(0.5, '#4f9be0'); dg.addColorStop(1, '#1d5aa6');
      [[84, 142, -0.42, 1], [166, 142, 0.42, -1]].forEach(([x, y, rot, dir]) => {
        c.save(); c.translate(x, y); c.rotate(rot * dir); c.scale(dir * 0.72, 0.72); c.translate(-57, -34);
        c.fillStyle = dg; c.fill(DOLPHIN);
        c.strokeStyle = 'rgba(10,50,110,.5)'; c.lineWidth = 1.5; c.stroke(DOLPHIN);
        c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(60, 26, 26, 5, 0.05, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#0b2a4a'; c.beginPath(); c.arc(100, 32, 2.2, 0, Math.PI * 2); c.fill();
        c.restore();
      });
      c.fillStyle = 'rgba(255,255,255,.35)';
      [[70, 176, 26], [180, 176, 26]].forEach(([x, y, r]) => { c.beginPath(); c.ellipse(x, y, r, 5, 0, 0, Math.PI * 2); c.fill(); });
      c.fillStyle = '#fff';
      [[125, 64], [104, 46], [146, 48]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 2, y - 2); c.lineTo(x + 7, y); c.lineTo(x + 2, y + 2); c.lineTo(x, y + 7); c.lineTo(x - 2, y + 2); c.lineTo(x - 7, y); c.lineTo(x - 2, y - 2); c.fill(); });
    },
    sunburst(c) {
      c.fillStyle = '#ffb21e'; c.fillRect(0, 0, 250, 350);
      c.save(); c.translate(125, 175);
      for (let i = 0; i < 28; i++) {
        c.fillStyle = i % 2 ? '#ffd24a' : '#ff9f1a';
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 260, (i / 28) * Math.PI * 2, ((i + 1) / 28) * Math.PI * 2); c.closePath(); c.fill();
      }
      const glow = c.createRadialGradient(0, 0, 10, 0, 0, 120);
      glow.addColorStop(0, 'rgba(255,255,230,.95)'); glow.addColorStop(1, 'rgba(255,240,180,0)');
      c.fillStyle = glow; c.beginPath(); c.arc(0, 0, 120, 0, Math.PI * 2); c.fill();
      const orb = c.createRadialGradient(-12, -14, 4, 0, 0, 46);
      orb.addColorStop(0, '#fffbe0'); orb.addColorStop(0.5, '#ffd84a'); orb.addColorStop(1, '#f08a12');
      c.fillStyle = orb; c.beginPath(); c.arc(0, 0, 44, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#d0700a'; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-8, -22, 26, 12, -0.2, 0, Math.PI * 2); c.fill();
      c.restore();
    },
    pearl(c) {
      c.fillStyle = '#f4f7fa'; c.fillRect(0, 0, 250, 350);
      c.fillStyle = '#e4ebf1';
      for (let y = 14; y < 340; y += 4) c.fillRect(0, y, 250, 2);
      c.strokeStyle = 'rgba(58,166,245,.35)'; c.lineWidth = 10; c.lineCap = 'round';
      c.beginPath(); c.moveTo(40, 230); c.bezierCurveTo(90, 170, 150, 270, 210, 190); c.stroke();
      c.strokeStyle = 'rgba(143,224,90,.4)'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(40, 256); c.bezierCurveTo(100, 206, 150, 290, 210, 220); c.stroke();
      c.lineCap = 'butt';
      const orb = c.createRadialGradient(118, 108, 3, 125, 118, 34);
      orb.addColorStop(0, '#ffffff'); orb.addColorStop(0.5, '#8fd0ff'); orb.addColorStop(1, '#1a7fcf');
      c.fillStyle = orb; c.beginPath(); c.arc(125, 120, 32, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(119, 106, 18, 9, -0.2, 0, Math.PI * 2); c.fill();
    },
    garden(c) {
      c.fillStyle = vgrad(c, 14, 336, [[0, '#d8fbe0'], [0.5, '#8fe0a0'], [1, '#2aa86a']]); c.fillRect(0, 0, 250, 350);
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 4; c.lineCap = 'round';
      const swirl = (x, y, r, dir) => { c.beginPath(); for (let t = 0; t < 11; t += 0.2) { const rr2 = r * (1 - t / 12); const px = x + Math.cos(t * dir) * rr2, py = y + Math.sin(t * dir) * rr2; if (t === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.stroke(); };
      swirl(70, 100, 44, 1); swirl(180, 250, 50, -1); swirl(190, 90, 26, -1); swirl(60, 270, 30, 1);
      c.strokeStyle = 'rgba(30,120,60,.5)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(20, 330); c.bezierCurveTo(90, 250, 160, 190, 230, 30); c.stroke();
      c.lineCap = 'butt';
      [[125, 175, '#ff82c4'], [88, 196, '#ffd84a'], [168, 150, '#b58cff']].forEach(([x, y, col]) => {
        c.fillStyle = col;
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; c.beginPath(); c.ellipse(x + Math.cos(a) * 11, y + Math.sin(a) * 11, 9, 6, a, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#fff6c2'; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
      });
    },
  };
  function drawBack(c, id, W, H) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    c.scale(W / 250, H / 350);
    rr(c, 2, 2, 246, 346, 18);
    c.fillStyle = '#ffffff'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#8391a0'; c.stroke();
    c.save();
    rr(c, 14, 14, 222, 322, 12); c.clip();
    (BACK_ART[id] || BACK_ART.fish)(c);
    sheenAndFrame(c);
    c.restore();
    rr(c, 14, 14, 222, 322, 12);
    c.lineWidth = 2; c.strokeStyle = 'rgba(11,42,74,.35)'; c.stroke();
  }
  function backURL(id, w) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(10, Math.round(w)); cv.height = Math.round(cv.width * 1.4);
    drawBack(cv.getContext('2d'), id, cv.width, cv.height);
    return cv.toDataURL();
  }
  function backPreview(id) {
    return h('img.sol-back-preview', { src: backURL(id, 150), alt: '' });
  }
  let feltNoise = null;
  function noiseURL() {
    if (feltNoise) return feltNoise;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 160;
    const c = cv.getContext('2d');
    const img = c.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.random() * 16;
    }
    c.putImageData(img, 0, 0);
    return (feltNoise = cv.toDataURL());
  }

  // ================================================================ app
  A.apps.register({
    id: ID,
    name: 'Solitaire',
    icon: 'icons/cards',
    color: '#2f86e0',
    category: 'games',
    description: 'The classic card game. Build every suit from Ace to King.',
    keywords: ['cards', 'klondike', 'patience', 'sol', 'card game', 'game'],
    window: { width: 800, height: 600, minWidth: 460, minHeight: 380 },
    tasks: [{ label: 'New game', icon: 'icons/play', onClick: () => A.apps.launch(ID) }],
    launch(win) {
      let opts = K.options(ID, DEFAULTS);
      const level = () => (opts.draw === 3 ? 'three' : 'one');

      // ---------------------------------------------------------- state
      const cards = [];
      let stock = [], waste = [], found = [[], [], [], []], tab = [[], [], [], [], [], [], []];
      let score = 0, moves = 0, passes = 0, started = false, over = false, busy = false, penaltyAt = 0, penalties = 0;
      let history = [];
      let geo = null;
      let drag = null;
      let hintIdx = 0, hintTimer = 0;
      let cascade = null;
      let pending = [];

      const timer = new K.Timer((s) => {
        timeEl.textContent = K.fmt(s);
        if (opts.timed && opts.scoring === 'standard' && started && !over && s > 0 && s % 10 === 0 && s !== penaltyAt) {
          penaltyAt = s;
          penalties += 2;
          score = Math.max(0, score - 2);
          updateStatus();
        }
      });

      // ---------------------------------------------------------- DOM
      const table = h('div.sol-table');
      const stage = h('div.gk-stage.sol-stage', null, table);
      const scoreEl = h('span', null, '0'), timeEl = h('span', null, '0:00'), movesEl = h('span', null, '0');
      const status = h('div.ae-statusbar.sol-status', null,
        h('span.sol-status-tip', null, 'Double-click a card to send it home. Right-click the table to move every card you can.'),
        h('span.ae-status-cell', null, 'Score: ', scoreEl),
        h('span.ae-status-cell', null, 'Time: ', timeEl),
        h('span.ae-status-cell', null, 'Moves: ', movesEl));
      const menubar = K.menubar({
        name: 'Solitaire',
        newGame: () => newGame(), stats: showStats, options: showOptions, appearance: showAppearance, help: showHelp,
        about: () => K.about(win, { name: 'Solitaire', icon: 'icons/cards', blurb: 'For the bravest procrastinators.' }),
        exit: () => win.close(),
        items: () => [
          { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !history.length || busy || over, onClick: undo },
          { label: 'Hint', shortcut: 'H', disabled: busy || over, onClick: hint },
          { label: 'Deal', shortcut: 'Space', disabled: busy || over, onClick: dealStock },
          { label: 'Move cards home', shortcut: 'Right-click', disabled: busy || over, onClick: autoHome },
        ],
      });
      win.body.classList.add('gk-app', 'sol');
      win.body.append(menubar, stage, status);
      const fx = new K.Particles(stage);

      // slots
      const slot = (kind, extra) => { const el = h('div.sol-slot', { class: 'sol-slot-' + kind }, extra || null); table.appendChild(el); return el; };
      const stockSlot = slot('stock', h('span.sol-redeal', { html: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 7a13 13 0 1 1-12.3 8.8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M4 8 L9 17 L15 9 Z" fill="currentColor"/></svg>' }));
      stockSlot.setAttribute('data-tip', 'Click to turn the pile over');
      const wasteSlot = slot('waste');
      const foundSlots = [0, 1, 2, 3].map(() => slot('found', h('span.sol-slot-a', null, 'A')));
      const tabSlots = [0, 1, 2, 3, 4, 5, 6].map(() => slot('tab', h('span.sol-slot-k', null, 'K')));

      // cards
      SUITS.forEach((suit) => {
        for (let rank = 1; rank <= 13; rank++) {
          const id = cards.length;
          const front = h('canvas.sol-front');
          const el = h('div.sol-card', { dataset: { id }, 'aria-label': RANK_NAMES[rank] + ' of ' + K.SUITS[suit].name },
            h('div.sol-inner', null, front, h('div.sol-back')));
          const card = { id, suit, rank, red: K.SUITS[suit].red, up: false, el, front, x: 0, y: 0, z: 0 };
          cards.push(card);
          table.appendChild(el);
        }
      });

      // ---------------------------------------------------------- geometry
      function measure() {
        const W = table.clientWidth, H = table.clientHeight;
        if (!W || !H) return null;
        const gap = clamp(Math.round(W * 0.016), 6, 18);
        let cw = Math.floor((W - gap * 8) / 7);
        cw = Math.min(cw, Math.floor(((H - gap * 3) / 3.6) / 1.4), 150);
        cw = Math.max(34, cw);
        const ch = Math.round(cw * 1.4);
        const left = Math.round((W - (cw * 7 + gap * 6)) / 2);
        const top = gap + 2;
        const tabTop = top + ch + Math.round(gap * 1.6);
        return { W, H, gap, cw, ch, left, top, tabTop, colX: (i) => left + i * (cw + gap) };
      }
      let renderedSize = 0;
      function layout() {
        const g = measure();
        if (!g) return;
        geo = g;
        table.style.setProperty('--cw', g.cw + 'px');
        table.style.setProperty('--ch', g.ch + 'px');
        const px = Math.round(g.cw * K.dpr());
        if (Math.abs(px - renderedSize) > 2) { renderedSize = px; paintFaces(); }
        const place = (el, x, y) => { el.style.transform = `translate(${x}px, ${y}px)`; };
        place(stockSlot, g.colX(0), g.top);
        place(wasteSlot, g.colX(1), g.top);
        foundSlots.forEach((s, i) => place(s, g.colX(3 + i), g.top));
        tabSlots.forEach((s, i) => place(s, g.colX(i), g.tabTop));
        table.classList.add('sol-instant');
        render();
        void table.offsetWidth;
        table.classList.remove('sol-instant');
      }
      function paintFaces() {
        refreshFont();
        const w = renderedSize, hh = Math.round(w * 1.4);
        cards.forEach((c) => {
          if (c.front.width !== w || c.front.height !== hh) { c.front.width = w; c.front.height = hh; }
          drawCard(c.front.getContext('2d'), c.suit, c.rank, w, hh);
        });
        applyBack();
      }
      function applyBack() {
        if (!renderedSize) return;
        table.style.setProperty('--sol-back', `url("${backURL(opts.back, renderedSize)}")`);
      }
      function applyFelt() {
        const f = FELTS.find((x) => x[0] === opts.felt) || FELTS[0];
        stage.style.setProperty('--sol-felt-a', f[2]);
        stage.style.setProperty('--sol-felt-b', f[3]);
        stage.style.setProperty('--sol-noise', `url("${noiseURL()}")`);
      }

      // Where every card belongs right now.
      function positions() {
        const g = geo, out = [];
        let z = 1;
        stock.forEach((c, i) => { const d = Math.max(0, 2 - (stock.length - 1 - i)); out.push([c, g.colX(0) + d, g.top + d, z++]); });
        const wx = g.colX(1), fan = Math.round(g.cw * 0.24);
        const shown = opts.draw === 3 ? Math.min(3, waste.length) : 1;
        waste.forEach((c, i) => {
          const k = i - (waste.length - shown);
          out.push([c, wx + (k > 0 ? k * fan : 0), g.top, z++]);
        });
        found.forEach((p, fi) => p.forEach((c) => out.push([c, g.colX(3 + fi), g.top, z++])));
        const avail = g.H - g.tabTop - g.gap - g.ch;
        tab.forEach((col, ci) => {
          let down = Math.round(g.ch * 0.11), up = Math.round(g.ch * 0.26);
          const nd = col.filter((c) => !c.up).length, nu = col.length - nd;
          const need = nd * down + Math.max(0, nu - 1) * up;
          if (need > avail && col.length > 1) {
            const k = Math.max(0.3, avail / need);
            down = Math.max(4, Math.floor(down * k)); up = Math.max(8, Math.floor(up * k));
          }
          let y = g.tabTop;
          col.forEach((c) => { out.push([c, g.colX(ci), y, 100 + z++]); y += c.up ? up : down; });
        });
        return out;
      }

      // Cards deep inside a pile are hidden: dozens of stacked edges would darken the rim.
      function buriedSet() {
        const out = new Set();
        stock.slice(0, -3).forEach((c) => out.add(c));
        waste.slice(0, -(opts.draw === 3 ? 4 : 2)).forEach((c) => out.add(c));
        found.forEach((p) => p.slice(0, -2).forEach((c) => out.add(c)));
        return out;
      }
      function render() {
        if (!geo) return;
        const buried = buriedSet();
        cards.forEach((c) => c.el.classList.toggle('sol-buried', buried.has(c)));
        positions().forEach(([c, x, y, z]) => {
          const moved = c.x !== x || c.y !== y;
          c.x = x; c.y = y;
          if (drag && drag.cards.includes(c)) return;
          c.z = z;
          if (moved) {
            c.el.style.transform = `translate(${x}px, ${y}px)`;
            if (!table.classList.contains('sol-instant')) {
              c.flying = true;
              c.el.style.zIndex = 1000 + z;
              clearTimeout(c.flyT);
              c.flyT = setTimeout(() => { c.flying = false; c.el.style.zIndex = c.z; }, 380);
            }
          }
          if (!c.flying) c.el.style.zIndex = z;
          c.el.classList.toggle('up', c.up);
        });
        stockSlot.classList.toggle('empty', !stock.length);
        stockSlot.classList.toggle('done', !stock.length && !waste.length);
        updateStatus();
      }

      function updateStatus() {
        scoreEl.textContent = opts.scoring === 'standard' ? String(score) : 'Off';
        movesEl.textContent = String(moves);
      }

      // ---------------------------------------------------------- rules
      const top = (arr) => arr[arr.length - 1] || null;
      const canTab = (c, col) => { const t = top(col); return t ? t.up && t.red !== c.red && t.rank === c.rank + 1 : c.rank === 13; };
      const canFound = (c, pile) => { const t = top(pile); return t ? t.suit === c.suit && t.rank === c.rank - 1 : c.rank === 1; };
      function locate(c) {
        if (stock.includes(c)) return { pile: 'stock', arr: stock };
        if (waste.includes(c)) return { pile: 'waste', arr: waste };
        for (let i = 0; i < 4; i++) if (found[i].includes(c)) return { pile: 'found', i, arr: found[i] };
        for (let i = 0; i < 7; i++) if (tab[i].includes(c)) return { pile: 'tab', i, arr: tab[i] };
        return null;
      }

      // ---------------------------------------------------------- history
      function snap() {
        history.push({
          stock: stock.map((c) => c.id), waste: waste.map((c) => c.id),
          found: found.map((p) => p.map((c) => c.id)), tab: tab.map((p) => p.map((c) => [c.id, c.up])),
          score, moves, passes, penalties,
        });
        if (history.length > 400) history.shift();
      }
      function restore(s) {
        stock = s.stock.map((id) => cards[id]); stock.forEach((c) => { c.up = false; });
        waste = s.waste.map((id) => cards[id]); waste.forEach((c) => { c.up = true; });
        found = s.found.map((p) => p.map((id) => cards[id])); found.forEach((p) => p.forEach((c) => { c.up = true; }));
        tab = s.tab.map((p) => p.map(([id, up]) => { cards[id].up = up; return cards[id]; }));
        // Undo never refunds the time penalty that has ticked away since.
        score = Math.max(0, s.score - (s.penalties != null ? penalties - s.penalties : 0)); moves = s.moves; passes = s.passes;
      }
      function undo() {
        if (!history.length || busy || over) return;
        restore(history.pop());
        clearHint();
        render();
        sfx('whoosh', false);
      }

      // ---------------------------------------------------------- sounds
      const snd = (name) => { if (opts.sound) A.sound.play(name); };
      const sfx = (name, arg, gap) => { if (opts.sound) K.sfx(name, arg, gap); };

      // ---------------------------------------------------------- moves
      function begin() {
        if (!started) { started = true; timer.start(); }
      }
      const addScore = (n) => { if (opts.scoring === 'standard') score = Math.max(0, score + n); };

      function moveCards(list, fromLoc, toPile, toIndex) {
        snap();
        begin();
        const from = fromLoc.arr;
        from.splice(from.indexOf(list[0]), list.length);
        const dest = toPile === 'found' ? found[toIndex] : tab[toIndex];
        list.forEach((c) => { c.up = true; dest.push(c); });
        if (toPile === 'found') addScore(fromLoc.pile === 'found' ? 0 : 10);
        else if (fromLoc.pile === 'waste') addScore(5);
        else if (fromLoc.pile === 'found') addScore(-15);
        moves++;
        // turn over the newly exposed card
        if (fromLoc.pile === 'tab') {
          const t = top(from);
          if (t && !t.up) { t.up = true; addScore(5); later(() => snd('card'), 150); }
        }
        clearHint();
        render();
        snd('card');
        if (toPile === 'found') {
          const c = list[0];
          later(() => sparkleAt(c), 240);
        }
        checkDone();
      }

      function sparkleAt(c) {
        if (!opts.animations) return;
        fx.burst(c.x + geo.cw / 2, c.y + geo.ch / 2, { count: 7, shape: 'star', colors: ['#ffffff', '#fff6c2', '#bfe9ff'], speed: 90, life: 0.6, size: geo.cw * 0.05 });
      }

      function dealStock() {
        if (busy || over) return;
        clearHint();
        if (!stock.length) {
          if (!waste.length) return;
          snap(); begin();
          while (waste.length) { const c = waste.pop(); c.up = false; stock.push(c); }
          passes++;
          addScore(opts.draw === 3 ? -20 : -100);
          moves++;
          render();
          snd('shuffle');
          return;
        }
        snap(); begin();
        const n = Math.min(opts.draw, stock.length);
        for (let i = 0; i < n; i++) { const c = stock.pop(); c.up = true; waste.push(c); }
        moves++;
        render();
        snd('card');
      }

      function toFoundation(c) {
        const loc = locate(c);
        if (!loc || !c.up || top(loc.arr) !== c || loc.pile === 'found' || loc.pile === 'stock') return false;
        for (let i = 0; i < 4; i++) if (canFound(c, found[i])) { moveCards([c], loc, 'found', i); return true; }
        return false;
      }

      // Every card that can go home right now, one after another.
      async function autoHome() {
        if (busy || over) return;
        busy = true;
        let movedAny = false;
        for (let guard = 0; guard < 60; guard++) {
          const cands = [top(waste)].concat(tab.map(top)).filter((c) => c && c.up);
          const c = cands.find((x) => found.some((p) => canFound(x, p)));
          if (!c) break;
          busy = false; toFoundation(c); busy = true;
          movedAny = true;
          if (over) break;
          await A.util.sleep(opts.animations ? 110 : 10);
          if (win.closed) return;
        }
        busy = false;
        if (!movedAny) sfx('deny');
        checkDone();
      }

      function checkDone() {
        if (over) return;
        if (found.every((p) => p.length === 13)) { winGame(); return; }
        if (!stock.length && !waste.length && tab.every((col) => col.every((c) => c.up)) && !busy) {
          later(() => { if (!over && !busy) autoComplete(); }, 350);
        }
      }
      async function autoComplete() {
        busy = true;
        clearHint();
        for (let guard = 0; guard < 60 && !over; guard++) {
          const cands = tab.map(top).filter(Boolean);
          let best = null;
          cands.forEach((c) => { if (found.some((p) => canFound(c, p)) && (!best || c.rank < best.rank)) best = c; });
          if (!best) break;
          busy = false; toFoundation(best); busy = true;
          await A.util.sleep(opts.animations ? 90 : 5);
          if (win.closed) return;
        }
        busy = false;
      }

      // ---------------------------------------------------------- hints
      function findMoves() {
        const out = [];
        const w = top(waste);
        // to foundation
        [w].concat(tab.map(top)).forEach((c) => { if (c && c.up) { const fi = found.findIndex((p) => canFound(c, p)); if (fi >= 0) out.push({ cards: [c], to: ['found', fi], pri: 5 }); } });
        // tableau runs that uncover a card or free a column
        tab.forEach((col, ci) => {
          const first = col.findIndex((c) => c.up);
          if (first < 0) return;
          for (let k = first; k < col.length; k++) {
            const c = col[k];
            for (let ti = 0; ti < 7; ti++) {
              if (ti === ci || !canTab(c, tab[ti])) continue;
              if (c.rank === 13 && k === 0) continue;
              if (!tab[ti].length && k === 0) continue;
              const uncovers = k === first && first > 0;
              out.push({ cards: col.slice(k), to: ['tab', ti], pri: uncovers ? 4 : k === first ? 2 : 1 });
            }
          }
        });
        if (w) tab.forEach((col, ti) => { if (canTab(w, col)) out.push({ cards: [w], to: ['tab', ti], pri: 3 }); });
        out.sort((a, b) => b.pri - a.pri);
        return out;
      }
      function clearHint() {
        clearTimeout(hintTimer);
        table.querySelectorAll('.hint, .hint-dst').forEach((el) => el.classList.remove('hint', 'hint-dst'));
      }
      function hint() {
        if (busy || over) return;
        clearHint();
        const list = findMoves();
        if (!list.length) {
          if (stock.length || waste.length) {
            stockSlot.classList.add('hint-dst');
            if (stock.length) top(stock).el.classList.add('hint');
            sfx('select');
            hintTimer = setTimeout(clearHint, 1400);
          } else {
            A.ui.messageBox({ parent: win, title: 'Solitaire', icon: 'info', instruction: 'There are no more moves', message: 'Try Undo, or start a new game.' });
          }
          return;
        }
        const m = list[hintIdx++ % list.length];
        m.cards.forEach((c) => c.el.classList.add('hint'));
        const dest = m.to[0] === 'found' ? top(found[m.to[1]]) || foundSlots[m.to[1]] : top(tab[m.to[1]]) || tabSlots[m.to[1]];
        (dest.el || dest).classList.add('hint-dst');
        sfx('select');
        hintTimer = setTimeout(clearHint, 1500);
      }

      // ---------------------------------------------------------- drag and drop
      function onDown(e) {
        if (e.button !== 0 || busy || over || cascade) return;
        const el = e.target.closest('.sol-card');
        if (!el) return;
        const c = cards[Number(el.dataset.id)];
        const loc = locate(c);
        if (!loc || loc.pile === 'stock' || !c.up) return;
        if ((loc.pile === 'waste' || loc.pile === 'found') && top(loc.arr) !== c) return;
        const list = loc.pile === 'tab' ? loc.arr.slice(loc.arr.indexOf(c)) : [c];
        drag = null;
        const start = { x: e.clientX, y: e.clientY, list, loc, started: false, pid: e.pointerId };
        const move = (ev) => {
          if (ev.pointerId !== start.pid) return;
          const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
          if (!start.started) {
            if (Math.hypot(dx, dy) < 4) return;
            start.started = true;
            drag = { cards: list, loc, dx: 0, dy: 0 };
            clearHint();
            list.forEach((cc, i) => { cc.el.classList.add('dragging'); cc.el.style.zIndex = 2000 + i; });
            snd('card');
          }
          drag.dx = dx; drag.dy = dy;
          const tilt = clamp(dx * 0.02, -4, 4);
          list.forEach((cc) => { cc.el.style.transform = `translate(${cc.x + dx}px, ${cc.y + dy}px) rotate(${tilt}deg)`; });
          highlightTarget(findTarget());
        };
        const up = (ev) => {
          if (ev.pointerId !== start.pid) return;
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          offDrag = null;
          if (!start.started) return;
          const tgt = findTarget();
          highlightTarget(null);
          const d = drag;
          drag = null;
          d.cards.forEach((cc) => cc.el.classList.remove('dragging'));
          if (tgt) moveCards(d.cards, d.loc, tgt[0], tgt[1]);
          else {
            d.cards.forEach((cc, i) => { cc.el.style.transform = `translate(${cc.x}px, ${cc.y}px)`; cc.flying = true; cc.el.style.zIndex = 1500 + i; clearTimeout(cc.flyT); cc.flyT = setTimeout(() => { cc.flying = false; cc.el.style.zIndex = cc.z; }, 380); });
            sfx('thud', 0.6);
          }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        offDrag = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
      }
      let offDrag = null;

      function findTarget() {
        if (!drag) return null;
        const c = drag.cards[0];
        const r = { x: c.x + drag.dx, y: c.y + drag.dy, w: geo.cw, h: geo.ch };
        let best = null, bestArea = 0;
        const consider = (kind, i, x, y, hh) => {
          const ox = Math.max(0, Math.min(r.x + r.w, x + geo.cw) - Math.max(r.x, x));
          const oy = Math.max(0, Math.min(r.y + r.h, y + hh) - Math.max(r.y, y));
          const area = ox * oy;
          if (area > bestArea) { bestArea = area; best = [kind, i]; }
        };
        if (drag.cards.length === 1) {
          found.forEach((p, i) => { if (!(drag.loc.pile === 'found' && drag.loc.i === i) && canFound(c, p)) consider('found', i, geo.colX(3 + i), geo.top, geo.ch); });
        }
        tab.forEach((col, i) => {
          if (drag.loc.pile === 'tab' && drag.loc.i === i) return;
          if (!canTab(c, col)) return;
          const t = top(col);
          consider('tab', i, geo.colX(i), t ? t.y : geo.tabTop, geo.ch);
        });
        return bestArea > geo.cw * geo.ch * 0.06 ? best : null;
      }
      let lastHi = null;
      function highlightTarget(t) {
        const el = !t ? null : t[0] === 'found' ? (top(found[t[1]]) ? top(found[t[1]]).el : foundSlots[t[1]]) : (top(tab[t[1]]) ? top(tab[t[1]]).el : tabSlots[t[1]]);
        if (el === lastHi) return;
        if (lastHi) lastHi.classList.remove('drop-ok');
        lastHi = el;
        if (el) el.classList.add('drop-ok');
      }

      table.addEventListener('pointerdown', onDown);
      table.addEventListener('click', (e) => {
        if (busy || over || cascade) return;
        const el = e.target.closest('.sol-card');
        if (el) {
          const c = cards[Number(el.dataset.id)];
          if (stock.includes(c)) dealStock();
          return;
        }
        if (e.target.closest('.sol-slot-stock')) dealStock();
      });
      table.addEventListener('dblclick', (e) => {
        if (busy || over || cascade) return;
        const el = e.target.closest('.sol-card');
        if (!el) return;
        const c = cards[Number(el.dataset.id)];
        if (!toFoundation(c)) sfx('deny');
      });
      table.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!cascade) autoHome();
      });

      // ---------------------------------------------------------- new game & deal
      function later(fn, ms) { const t = setTimeout(() => { pending = pending.filter((x) => x !== t); if (!win.closed) fn(); }, ms); pending.push(t); return t; }
      function cancelPending() { pending.forEach(clearTimeout); pending = []; }

      function shuffleDeck() {
        const deck = A.util.shuffle(cards);
        stock = []; waste = []; found = [[], [], [], []]; tab = [[], [], [], [], [], [], []];
        deck.forEach((c) => { c.up = false; c.el.style.visibility = ''; });
        let k = 0;
        for (let row = 0; row < 7; row++) for (let col = row; col < 7; col++) tab[col].push(deck[k++]);
        stock = deck.slice(k);
        tab.forEach((col) => { top(col).up = true; });
      }

      function deal(animate) {
        cancelPending();
        stopCascade();
        clearHint();
        history = [];
        score = 0; moves = 0; passes = 0; penaltyAt = 0; penalties = 0; started = false; over = false; busy = false; hintIdx = 0;
        timer.reset();
        timeEl.textContent = '0:00';
        shuffleDeck();
        if (!geo) { render(); return; }
        if (!animate || !opts.animations) { table.classList.add('sol-instant'); cards.forEach((c) => { c.x = -1; }); render(); void table.offsetWidth; table.classList.remove('sol-instant'); updateStatus(); return; }
        // Gather everything on the stock, then fly the cards out one by one.
        busy = true;
        table.classList.add('sol-instant');
        const all = cards.slice();
        const wanted = new Map(positions().map(([c, x, y, z]) => [c, [x, y, z]]));
        all.forEach((c) => { c.el.classList.remove('up', 'sol-buried'); c.flying = false; clearTimeout(c.flyT); c.x = geo.colX(0); c.y = geo.top; c.el.style.transform = `translate(${c.x}px, ${c.y}px)`; c.el.style.zIndex = 1; });
        void table.offsetWidth;
        table.classList.remove('sol-instant');
        snd('shuffle');
        let k = 0;
        for (let row = 0; row < 7; row++) {
          for (let col = row; col < 7; col++) {
            const c = tab[col][row];
            const [x, y, z] = wanted.get(c);
            later(() => {
              c.x = x; c.y = y; c.z = z;
              c.el.style.zIndex = 500 + z;
              c.el.style.transform = `translate(${x}px, ${y}px)`;
              snd('card');
            }, 120 + k * 45);
            k++;
          }
        }
        later(() => {
          busy = false;
          table.classList.add('sol-instant');
          cards.forEach((c) => { c.x = -1; });
          render();
          void table.offsetWidth;
          table.classList.remove('sol-instant');
        }, 120 + k * 45 + 320);
      }

      async function newGame(force) {
        if (!force && started && !over) {
          const r = await K.choose(win, {
            title: 'Game in progress', icon: 'icons/cards',
            instruction: 'What do you want to do with the game in progress?',
            options: [
              { value: 'new', label: 'Quit and start a new game', note: 'This counts as a loss in your statistics.' },
              { value: 'keep', label: 'Keep playing' },
            ],
          });
          if (r !== 'new') return;
          K.record(ID, level(), { won: false });
        }
        K.set(ID, 'saved', null);
        deal(true);
      }

      // ---------------------------------------------------------- winning
      function winGame() {
        over = true;
        busy = true;
        timer.stop();
        const secs = Math.max(1, Math.floor(timer.seconds));
        let bonus = 0;
        if (opts.scoring === 'standard' && opts.timed && secs > 30) bonus = Math.round(700000 / secs);
        const finalScore = opts.scoring === 'standard' ? score + bonus : null;
        score = finalScore == null ? score : finalScore;
        updateStatus();
        const res = K.record(ID, level(), { won: true, time: secs, score: finalScore, entry: { t: secs } });
        K.set(ID, 'saved', null);
        snd('win');
        later(() => runCascade(() => winDialog(secs, bonus, finalScore, res)), 500);
      }

      // The famous bouncing cards: gravity, damped bounces and trails that stay.
      function runCascade(done) {
        stopCascade();
        cards.forEach((c) => c.el.classList.remove('sol-buried'));
        const cv = h('canvas.sol-cascade', { 'aria-hidden': 'true' });
        stage.appendChild(cv);
        const W = stage.clientWidth, H = stage.clientHeight, dpr = K.dpr();
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        const ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const off = table.getBoundingClientRect(), so = stage.getBoundingClientRect();
        const ox = off.left - so.left, oy = off.top - so.top;
        const u = geo.cw / 71;
        const queue = [];
        for (let r = 12; r >= 0; r--) for (let f = 0; f < 4; f++) if (found[f][r]) queue.push(found[f][r]);
        const flying = [];
        let frame = 0, lastLaunch = -99, raf = 0, acc = 0, last = performance.now();
        const skip = h('div.sol-skip', null, 'Click anywhere to skip');
        stage.appendChild(skip);
        const finish = () => {
          if (!cascade) return;
          cancelAnimationFrame(raf);
          cv.removeEventListener('pointerdown', finish);
          skip.remove();
          cascade.ended = true;
          later(done, 350);
        };
        cv.addEventListener('pointerdown', finish);
        cascade = { cv, stop: () => { cancelAnimationFrame(raf); cv.remove(); skip.remove(); } };
        const step = () => {
          frame++;
          if (queue.length && (frame - lastLaunch > 16 || !flying.length) && flying.length < 4) {
            const c = queue.shift();
            c.el.style.visibility = 'hidden';
            let vx = (Math.random() * 5 + 2.2) * u * (Math.random() < 0.5 ? -1 : 1);
            flying.push({ c, x: ox + c.x, y: oy + c.y, vx, vy: -(Math.random() * 7 + 1) * u, bounces: 0 });
            lastLaunch = frame;
          }
          for (let i = flying.length - 1; i >= 0; i--) {
            const p = flying[i];
            p.vy += 0.62 * u;
            p.x += p.vx; p.y += p.vy;
            if (p.y > H - geo.ch) {
              p.y = H - geo.ch;
              p.vy = -p.vy * 0.76;
              p.bounces++;
              if (Math.abs(p.vy) > 2 * u) sfx('thud', 0.4, 50);
            }
            ctx.drawImage(p.c.front, p.x, p.y, geo.cw, geo.ch);
            if (p.x < -geo.cw - 4 || p.x > W + 4) flying.splice(i, 1);
          }
          if (!queue.length && !flying.length) { finish(); return false; }
          return true;
        };
        const loop = (t) => {
          acc += Math.min(0.1, (t - last) / 1000);
          last = t;
          let alive = true;
          while (acc >= 1 / 60 && alive) { acc -= 1 / 60; alive = step(); }
          if (alive && !cascade.ended) raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }
      function stopCascade() {
        if (!cascade) return;
        cascade.stop();
        cascade = null;
        cards.forEach((c) => { c.el.style.visibility = ''; });
      }

      async function winDialog(secs, bonus, finalScore, res) {
        const s = res.stats;
        const high = s.scores.length ? s.scores[0].s : 0;
        const rows = [['Time', K.fmt(secs)]];
        if (finalScore != null) rows.push(['Score', finalScore.toLocaleString()], ['Time bonus', bonus.toLocaleString()], ['High score', high.toLocaleString()]);
        rows.push(['Games played', String(s.played)], ['Games won', String(s.won)], ['Win percentage', K.pct(s)]);
        const r = await K.resultDialog(win, {
          won: true, title: 'Game won', icon: 'icons/cards',
          instruction: 'Congratulations, you won!',
          message: opts.draw === 3 ? 'And you did it drawing three. Impressive.' : null,
          badge: finalScore != null && res.scoreRank === 0 ? 'New high score!' : res.timeRank === 0 ? 'New best time!' : null,
          rows,
          buttons: [{ label: 'Exit', value: 'exit' }, { label: 'Play again', value: 'again', default: true }],
          cancelValue: 'again',
        });
        stopCascade();
        if (r === 'exit') { win.close(true); return; }
        deal(true);
      }

      // ---------------------------------------------------------- save / resume
      function snapshotSave() {
        return {
          draw: opts.draw, stock: stock.map((c) => c.id), waste: waste.map((c) => c.id),
          found: found.map((p) => p.map((c) => c.id)), tab: tab.map((p) => p.map((c) => [c.id, c.up])),
          score, moves, passes, time: timer.seconds,
        };
      }
      function resume(st) {
        cancelPending(); stopCascade(); clearHint();
        opts.draw = st.draw;
        restore({ stock: st.stock, waste: st.waste, found: st.found, tab: st.tab, score: st.score, moves: st.moves, passes: st.passes });
        history = [];
        started = true; over = false; busy = false;
        table.classList.add('sol-instant');
        cards.forEach((c) => { c.x = -1; c.el.style.visibility = ''; });
        render();
        void table.offsetWidth;
        table.classList.remove('sol-instant');
        timer.start(st.time || 0);
        penaltyAt = Math.floor(st.time || 0);
      }

      // ---------------------------------------------------------- dialogs
      function showStats() {
        K.statsDialog(win, {
          name: 'Solitaire', icon: 'icons/cards', levels: [['one', 'Draw one'], ['three', 'Draw three']], level: level(),
          onReset: () => K.resetStats(ID),
          render(lv) {
            const s = K.stats(ID, lv);
            return h('div', null,
              h('div.gk-stats-h', null, lv === 'three' ? 'Draw three' : 'Draw one'),
              h('div.gk-stats-sub', null, 'High scores'),
              s.scores.length ? h('ol.gk-best-list', null, s.scores.slice(0, 5).map((e, i) => h('li', null, h('span', null, (i + 1) + '.'), h('span', null, A.util.fmtDate(new Date(e.d)) + (e.t ? '  ·  ' + K.fmt(e.t) : '')), h('span', null, e.s.toLocaleString())))) : h('div.gk-best-empty', null, 'Win a game to set your first high score.'),
              h('div.gk-stats-sub', null, 'Games'),
              K.statRows([
                ['Games played', String(s.played)], ['Games won', String(s.won)], ['Win percentage', K.pct(s)],
                ['Fastest win', s.times.length ? K.fmt(s.times[0].t) : 'None yet'],
                ['Longest winning streak', String(s.bestWin)], ['Longest losing streak', String(s.bestLose)], ['Current streak', K.streakText(s)],
              ]));
          },
        });
      }

      async function showOptions() {
        const drawRg = A.ui.radioGroup({ options: [[1, 'Draw one'], [3, 'Draw three']], value: opts.draw });
        const scoreRg = A.ui.radioGroup({ options: [['standard', 'Standard scoring'], ['none', 'No scoring']], value: opts.scoring });
        const cb = (label, key) => { const c = A.ui.checkbox({ label, checked: !!opts[key] }); c.key = key; return c; };
        const checks = [cb('Timed game', 'timed'), cb('Play sounds', 'sound'), cb('Show animations', 'animations'), cb('Always save a game in progress when you exit', 'autoSave'), cb('Always continue saved games', 'autoContinue')];
        const r = await K.optionsDialog(win, {
          title: 'Options', icon: 'icons/cards',
          groups: [
            { legend: 'Draw', content: h('div', null, drawRg, h('div.gk-note', { style: { marginTop: '6px' } }, 'Changing the draw starts a new game.')) },
            { legend: 'Scoring', content: scoreRg },
            { legend: 'Other', content: h('div.gk-options-checks', null, checks) },
          ],
        });
        if (r !== 'ok') return;
        const newDraw = Number(drawRg.value);
        checks.forEach((c) => { opts[c.key] = c.checked; });
        opts.scoring = scoreRg.value;
        if (newDraw !== opts.draw) {
          if (started && !over) {
            const ch = await K.choose(win, {
              title: 'Game in progress', icon: 'icons/cards', instruction: 'Changing the draw starts a new game.',
              options: [{ value: 'new', label: 'Start a new game', note: 'The game in progress counts as a loss.' }, { value: 'keep', label: 'Keep playing with the current draw' }],
            });
            if (ch === 'new') { K.record(ID, level(), { won: false }); opts.draw = newDraw; K.saveOptions(ID, opts); deal(true); return; }
          } else { opts.draw = newDraw; K.saveOptions(ID, opts); deal(true); return; }
        }
        K.saveOptions(ID, opts);
        render();
      }

      async function showAppearance() {
        let back = opts.back, felt = opts.felt;
        const backs = K.chooser({ className: 'sol-backs', value: back, onChange: (v) => { back = v; }, items: BACKS.map(([v, label]) => ({ value: v, label, preview: backPreview(v) })) });
        const felts = K.chooser({
          className: 'sol-felts', value: felt, onChange: (v) => { felt = v; },
          items: FELTS.map(([v, label, a, b]) => ({ value: v, label, preview: h('span.sol-felt-swatch', { style: { background: `radial-gradient(circle at 35% 30%, ${a}, ${b})` } }) })),
        });
        const r = await K.optionsDialog(win, { title: 'Change appearance', icon: 'icons/personalize', width: 520, groups: [{ legend: 'Card back', content: backs }, { legend: 'Table', content: felts }] });
        if (r !== 'ok') return;
        opts.back = back; opts.felt = felt;
        K.saveOptions(ID, opts);
        applyBack();
        applyFelt();
      }

      function showHelp() {
        K.helpDialog(win, {
          name: 'Solitaire', icon: 'icons/cards',
          intro: 'Move every card onto the four foundations, from Ace up to King.',
          sections: [
            ['The goal', 'Build four piles in the top right, one for each suit, in order from Ace to King.'],
            ['The tableau', ['Stack cards on the seven columns in descending order, alternating red and black (a black 6 on a red 7).', 'You can move a whole run of face-up cards together.', 'Only a King (or a run starting with a King) can move into an empty column.', 'When you uncover a face-down card, it turns over by itself.']],
            ['The stock', 'Click the pile in the top left to deal one card (or three) onto the waste. When it runs out, click the empty spot to turn the waste over again.'],
            ['Shortcuts', ['Double-click a card to send it to a foundation.', 'Right-click the table to move every card that can go home.', 'Ctrl+Z undoes a move, H shows a hint, Space deals.', 'F2 starts a new game, F4 shows statistics, F5 opens Options, F7 changes the card back.']],
            ['Scoring', ['Waste to tableau: 5 points. Card to a foundation: 10 points. Turning over a card: 5 points.', 'Foundation back to tableau: minus 15. Turning the waste over: minus 100 (minus 20 when drawing three).', 'In a timed game you lose 2 points every 10 seconds, but a fast win earns a big time bonus.']],
          ],
        });
      }

      // ---------------------------------------------------------- keys
      K.keys(win, {
        newGame: () => newGame(), stats: showStats, options: showOptions, appearance: showAppearance, help: showHelp,
        key: (e) => {
          const k = e.key.toLowerCase();
          if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); }
          else if (k === 'h' && !e.ctrlKey) { e.preventDefault(); hint(); }
          else if (k === ' ' || k === 'd') { e.preventDefault(); dealStock(); }
          else if (k === 'escape' && cascade && !cascade.ended) { e.preventDefault(); cascade.cv.dispatchEvent(new PointerEvent('pointerdown')); }
        },
      });

      // ---------------------------------------------------------- life
      const offResize = K.observe(table, () => {
        const before = geo && geo.cw;
        layout();
        if (cascade && geo && geo.cw !== before) { /* keep the trails; the dialog follows */ }
      });
      win.on('minimize', () => timer.pause('min'));
      win.on('restore', () => timer.resume('min'));
      document.fonts && document.fonts.ready.then(() => { if (!win.closed && renderedSize) paintFaces(); });

      applyFelt();
      shuffleDeck();
      layout();
      later(() => deal(true), 60);

      const saved = K.get(ID, 'saved', null);
      if (saved && saved.tab) {
        const go = () => { cancelPending(); resume(saved); K.set(ID, 'saved', null); };
        if (opts.autoContinue) later(go, 120);
        else {
          later(async () => {
            const r = await K.choose(win, {
              title: 'Saved game', icon: 'icons/cards', sound: false,
              instruction: 'Do you want to continue your saved game?',
              options: [
                { value: 'yes', label: 'Continue the saved game', note: saved.draw === 3 ? 'Draw three' : 'Draw one' },
                { value: 'no', label: 'Start a new game', note: 'The saved game counts as a loss in your statistics.' },
              ],
            });
            if (r === 'yes') go();
            else if (r === 'no') { K.record(ID, saved.draw === 3 ? 'three' : 'one', { won: false }); K.set(ID, 'saved', null); }
          }, 500);
        }
      }

      // Test hook (harmless): finish the game instantly to see the cascade.
      K.debug = K.debug || {};
      K.debug.solitaire = {
        win() {
          cancelPending(); busy = false; started = true;
          if (!timer.running) timer.start(95);
          stock = []; waste = []; tab = [[], [], [], [], [], [], []];
          found = SUITS.map((s) => cards.filter((c) => c.suit === s).sort((a, b) => a.rank - b.rank));
          cards.forEach((c) => { c.up = true; });
          render();
          later(() => checkDone(), 450);
        },
        nearWin() {
          cancelPending(); busy = false; started = true; timer.start(60);
          stock = []; waste = [];
          found = SUITS.map((s) => cards.filter((c) => c.suit === s && c.rank <= 10).sort((a, b) => a.rank - b.rank));
          const rest = cards.filter((c) => c.rank > 10);
          tab = [[], [], [], [], [], [], []];
          rest.sort((a, b) => b.rank - a.rank).forEach((c, i) => tab[i % 7].push(c));
          cards.forEach((c) => { c.up = true; });
          render();
        },
        state: () => ({ stock: stock.length, waste: waste.length, found: found.map((p) => p.length), tab: tab.map((p) => p.length), score, moves }),
      };

      return {
        async beforeClose() {
          if (!started || over) return true;
          if (opts.autoSave) { K.set(ID, 'saved', snapshotSave()); return true; }
          const r = await K.choose(win, {
            title: 'Exit game', icon: 'icons/cards', instruction: 'Do you want to save this game?',
            options: [
              { value: 'save', label: 'Save', note: 'Continue this game next time you open Solitaire.' },
              { value: 'nosave', label: "Don't save", note: 'This counts as a loss in your statistics.' },
            ],
            cancelLabel: 'Cancel',
          });
          if (r === 'save') { K.set(ID, 'saved', snapshotSave()); return true; }
          if (r === 'nosave') { K.record(ID, level(), { won: false }); K.set(ID, 'saved', null); return true; }
          return false;
        },
        onClose() {
          cancelPending();
          clearTimeout(hintTimer);
          stopCascade();
          timer.destroy();
          fx.destroy();
          offResize();
          if (offDrag) offDrag();
          cards.forEach((c) => clearTimeout(c.flyT));
          if (K.debug && K.debug.solitaire) delete K.debug.solitaire;
        },
        keepAwake: () => ((started && !over) || !!cascade) && win.state !== 'minimized',
      };
    },
  });
})();
