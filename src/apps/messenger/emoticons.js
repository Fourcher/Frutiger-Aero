/* Bubble Messenger art: glossy gel emoticons (SVG) with their text codes and
   a picker, drawn display pictures, the spinning sign-in buddies, and the
   full-window wink animations (canvas). Loaded before bots.js and messenger.js;
   everything is shared through Aerium.bubbleMessenger. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;
  const NS = (A.bubbleMessenger = A.bubbleMessenger || {});

  // ------------------------------------------------------------ SVG helpers
  const stops = (list) => list.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('');
  const radial = (id, list, o = {}) => `<radialGradient id="${id}" cx="${o.cx != null ? o.cx : 0.36}" cy="${o.cy != null ? o.cy : 0.3}" r="${o.r || 0.8}"${o.user ? ' gradientUnits="userSpaceOnUse"' : ''}>${stops(list)}</radialGradient>`;
  const linear = (id, list, o = {}) => `<linearGradient id="${id}" x1="${o.x1 || 0}" y1="${o.y1 || 0}" x2="${o.x2 != null ? o.x2 : 0}" y2="${o.y2 != null ? o.y2 : 1}">${stops(list)}</linearGradient>`;
  const SHINE = linear('s', [[0, '#fff', 0.95], [1, '#fff', 0.05]]);
  const TEAR = linear('t', [[0, '#e4f7ff'], [0.5, '#5cc6ff'], [1, '#1f7fd6']]);
  const caustic = (col) => radial('c', [[0, col || '#fffbd0', 0.9], [1, col || '#fffbd0', 0]], { cx: 0.5, cy: 1, r: 0.62 });
  const floor = (col, rx) => `<ellipse cx="20" cy="38.4" rx="${rx || 10}" ry="1.45" fill="${col || '#5a3a00'}" opacity=".22"/>`;
  const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">${inner}</svg>`;

  // ------------------------------------------------------------ faces
  const YELLOW = ['#fffce8', '#ffec7a', '#ffc628', '#f0960a'];
  const INK = '#3d1f00', LIP = '#5a2a00', MOUTH = '#7a2208', TONGUE = '#ff6d86';
  function face(features, o = {}) {
    const b = o.body || YELLOW;
    return `<defs>${radial('b', [[0, b[0]], [0.3, b[1]], [0.72, b[2]], [1, b[3]]])}${caustic(o.caustic)}${SHINE}${TEAR}${o.defs || ''}<clipPath id="k"><circle cx="20" cy="20" r="16.6"/></clipPath></defs>
      ${floor('#6a4200')}${o.behind || ''}
      <circle cx="20" cy="20" r="17" fill="url(#b)"/>
      <g clip-path="url(#k)"><ellipse cx="20" cy="34" rx="13" ry="8.5" fill="url(#c)"/>${o.under || ''}</g>
      <circle cx="20" cy="20" r="16.55" fill="none" stroke="${o.rim || '#c07000'}" stroke-width="1.1"/>
      ${features}
      <ellipse cx="18.2" cy="9.3" rx="10.2" ry="5.2" fill="url(#s)"/>${o.over || ''}`;
  }
  const eye = (x, y, rx = 2.2, ry = 3.2, col = INK) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${col}"/><circle cx="${x - 0.8}" cy="${y - ry * 0.38}" r="${Math.max(0.6, rx * 0.4)}" fill="#fff"/>`;
  const EYES = eye(14.3, 16.2) + eye(25.7, 16.2);
  const arc = (d, w = 2.2, col = INK) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const happyEyes = arc('M11.6 17.2 Q14.3 14.2 17 17.2', 2.1) + arc('M23 17.2 Q25.7 14.2 28.4 17.2', 2.1);
  const closedEyes = arc('M11.4 17.2 Q14.3 19.6 17.2 17.2', 2.1) + arc('M22.8 17.2 Q25.7 19.6 28.6 17.2', 2.1);
  const sadBrows = arc('M10.8 13.4 L16.2 11.3', 1.7) + arc('M29.2 13.4 L23.8 11.3', 1.7);
  const cheeks = '<ellipse cx="10.4" cy="22.6" rx="3.4" ry="2.1" fill="#ff5c7c" opacity=".35"/><ellipse cx="29.6" cy="22.6" rx="3.4" ry="2.1" fill="#ff5c7c" opacity=".35"/>';
  const bigGrin = (top, bottom) => `<path d="M10.6 ${top} Q20 ${top + 1.8} 29.4 ${top} Q28.6 ${bottom} 20 ${bottom} Q11.4 ${bottom} 10.6 ${top} Z" fill="${MOUTH}" stroke="${LIP}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M11.5 ${top + 0.7} Q20 ${top + 2.3} 28.5 ${top + 0.7} L28.1 ${top + 3.3} Q20 ${top + 4.7} 11.9 ${top + 3.3} Z" fill="#fff"/>
      <path d="M14.6 ${bottom - 2.6} Q20 ${bottom - 6.4} 25.4 ${bottom - 2.6} Q23 ${bottom - 0.6} 20 ${bottom - 0.6} Q17 ${bottom - 0.6} 14.6 ${bottom - 2.6} Z" fill="${TONGUE}"/>`;

  const ART = {
    smile: () => face(EYES + arc('M11.8 23.2 Q20 31.2 28.2 23.2', 2.3, LIP)),
    grin: () => face(EYES + bigGrin(21.6, 32.8)),
    wink: () => face(eye(14.3, 16.2) + arc('M22.6 17 Q25.7 13.6 28.8 17', 2.2) + arc('M12.4 23.6 Q20.5 30.8 28 22.6', 2.3, LIP)),
    tongue: () => face(EYES + arc('M12 23.6 Q20 27.4 28 23.6', 2.2, LIP) +
      `<path d="M16.4 25.1 Q16.6 32.8 20.8 32.8 Q25 32.8 25.2 25.1 Q20.8 26.5 16.4 25.1 Z" fill="${TONGUE}" stroke="#b8324e" stroke-width=".9"/>
       <path d="M20.8 26.4 V30.4" stroke="#cf4a66" stroke-width=".9" stroke-linecap="round"/><ellipse cx="18.6" cy="28" rx=".9" ry="1.6" fill="#fff" opacity=".55"/>`),
    sad: () => face(sadBrows + eye(14.5, 17.4, 2.1, 2.9) + eye(25.5, 17.4, 2.1, 2.9) + arc('M13.2 29.2 Q20 22.6 26.8 29.2', 2.3, LIP)),
    crying: () => face(sadBrows + closedEyes +
      `<path d="M13.8 30 Q20 21.8 26.2 30 Q20 28.2 13.8 30 Z" fill="${MOUTH}" stroke="${LIP}" stroke-width="1.2" stroke-linejoin="round"/>
       <path d="M12.2 18.8 C10.4 22.8 9.6 26 11.6 27.4 C13.6 28.6 15 25.8 13.4 21.8 Z" fill="url(#t)" stroke="#1566b8" stroke-width=".6"/>
       <path d="M27.8 18.8 C29.6 22.8 30.4 26 28.4 27.4 C26.4 28.6 25 25.8 26.6 21.8 Z" fill="url(#t)" stroke="#1566b8" stroke-width=".6"/>
       <ellipse cx="11.4" cy="24.2" rx=".6" ry="1.2" fill="#fff" opacity=".8"/><ellipse cx="27.4" cy="24.2" rx=".6" ry="1.2" fill="#fff" opacity=".8"/>`),
    angry: () => face(arc('M10.2 12 L17.2 14.6', 2.4, '#3d1300') + arc('M29.8 12 L22.8 14.6', 2.4, '#3d1300') + eye(14.6, 18, 2, 2.5, '#3d1300') + eye(25.4, 18, 2, 2.5, '#3d1300') +
      `<path d="M13 27.4 Q20 24 27 27.4 L26.4 30.2 Q20 27.8 13.6 30.2 Z" fill="#fff" stroke="#5a1800" stroke-width="1.2" stroke-linejoin="round"/>
       <path d="M16.5 26.1 V29.2 M20 25.4 V28.4 M23.5 26.1 V29.2" stroke="#5a1800" stroke-width=".7"/>`,
      { body: ['#ffe9d4', '#ffa35e', '#f25a2a', '#c2301a'], rim: '#9a220e', caustic: '#ffe2c4' }),
    surprised: () => face(arc('M11 10.8 Q14 8.9 17 10.6', 1.6) + arc('M29 10.8 Q26 8.9 23 10.6', 1.6) + eye(14.3, 16, 2.6, 3.7) + eye(25.7, 16, 2.6, 3.7) +
      `<ellipse cx="20" cy="27.6" rx="3.8" ry="4.6" fill="${MOUTH}" stroke="${LIP}" stroke-width="1.2"/><ellipse cx="20" cy="29.4" rx="2.1" ry="1.5" fill="${TONGUE}" opacity=".8"/>`),
    cool: () => face(
      `<path d="M7.6 14 L4.2 12.6 M32.4 14 L35.8 12.6" stroke="#0a0f14" stroke-width="1.3" stroke-linecap="round"/>
       <path d="M7.6 13.2 H32.4 V14.6 Q32.4 21.2 26 21.2 Q21.6 21.2 20.9 16 H19.1 Q18.4 21.2 14 21.2 Q7.6 21.2 7.6 14.6 Z" fill="url(#g)" stroke="#0a0f14" stroke-width=".8" stroke-linejoin="round"/>
       <path d="M10.2 15 L13 18.4 M12.8 14.6 L15.2 17.4 M22.6 15 L25.4 18.4 M25.2 14.6 L27.6 17.4" stroke="#fff" stroke-opacity=".75" stroke-width="1" stroke-linecap="round"/>` +
      arc('M13 25.2 Q21 30.6 28.4 23.8', 2.3, LIP),
      { defs: linear('g', [[0, '#6b85a0'], [0.45, '#1b2838'], [1, '#05080d']]) }),
    confused: () => face(arc('M10.8 12.4 L16.4 12.9', 1.6) + arc('M23.2 11.2 Q26 9.4 29 10.8', 1.6) + eye(14.1, 16.6, 2.1, 3) + eye(25.6, 15.8, 2.4, 3.4) +
      arc('M12.4 26.4 Q14.9 23.9 17.4 26.4 T22.4 26.4 T27.4 25.6', 2.2, LIP) +
      '<path d="M32.6 12.6 C31.2 15.2 31 17.2 32.6 17.8 C34.2 17.2 34 15.2 32.6 12.6 Z" fill="url(#t)" stroke="#1566b8" stroke-width=".5"/>'),
    embarrassed: () => face(eye(13.4, 17.4, 2, 2.7) + eye(24.8, 17.4, 2, 2.7) +
      `<path d="M14.6 25.2 Q20 27.6 25.4 25.2 L25 27.8 Q20 29.8 15 27.8 Z" fill="#fff" stroke="${LIP}" stroke-width="1.1" stroke-linejoin="round"/>
       <path d="M17.2 26.2 V28.6 M20 26.8 V29.2 M22.8 26.2 V28.6" stroke="${LIP}" stroke-width=".55" opacity=".6"/>`,
      { under: '<ellipse cx="20" cy="25" rx="16" ry="9" fill="#ff6a6a" opacity=".2"/><ellipse cx="9.8" cy="22.6" rx="4.4" ry="2.8" fill="#ff4d70" opacity=".5"/><ellipse cx="30.2" cy="22.6" rx="4.4" ry="2.8" fill="#ff4d70" opacity=".5"/>' }),
    angel: () => face(happyEyes + cheeks + arc('M13.2 23.4 Q20 29.8 26.8 23.4', 2.3, LIP), {
      defs: linear('h', [[0, '#fffde8'], [1, '#ffc81f']]),
      behind: '<path d="M10.6 4.2 A9.4 2.9 0 0 1 29.4 4.2" fill="none" stroke="#d99a00" stroke-width="2.6"/>',
      over: '<path d="M10.6 4.2 A9.4 2.9 0 0 0 29.4 4.2" fill="none" stroke="#e8a800" stroke-width="3.8" opacity=".35"/><path d="M10.6 4.2 A9.4 2.9 0 0 0 29.4 4.2" fill="none" stroke="url(#h)" stroke-width="2.3"/><path d="M13 5.8 Q20 7.4 27 5.8" fill="none" stroke="#fff" stroke-width=".8" opacity=".8"/>',
    }),
    devil: () => face(arc('M10.6 12.2 L16.8 14.6', 2.2) + arc('M29.4 12.2 L23.2 14.6', 2.2) + eye(14.6, 17.6, 2.1, 2.6) + eye(25.4, 17.6, 2.1, 2.6) +
      `<path d="M11.4 22.4 Q20 33 28.6 22.4 Q20 26.4 11.4 22.4 Z" fill="${MOUTH}" stroke="${LIP}" stroke-width="1.1" stroke-linejoin="round"/>
       <path d="M14.4 23.9 L15.7 26.9 L17 24.5 Z M25.6 23.9 L24.3 26.9 L23 24.5 Z" fill="#fff"/>`, {
      defs: linear('r', [[0, '#ff9484'], [1, '#b5140a']]),
      behind: '<path d="M7.6 11.4 Q4.8 5.4 8.2 1.6 Q9.4 6.4 13.8 7.6 Z" fill="url(#r)" stroke="#7a0c04" stroke-width=".8" stroke-linejoin="round"/><path d="M32.4 11.4 Q35.2 5.4 31.8 1.6 Q30.6 6.4 26.2 7.6 Z" fill="url(#r)" stroke="#7a0c04" stroke-width=".8" stroke-linejoin="round"/>',
    }),
    sleepy: () => face(closedEyes + `<ellipse cx="20.6" cy="27.4" rx="3" ry="3.6" fill="${MOUTH}" stroke="${LIP}" stroke-width="1.1"/>`, {
      over: '<path d="M26.8 4.6 H32 L26.8 10 H32" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M26.8 4.6 H32 L26.8 10 H32" fill="none" stroke="#1f8fe6" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/><path d="M33.4 0.9 H36.6 L33.4 4.2 H36.6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><path d="M33.4 0.9 H36.6 L33.4 4.2 H36.6" fill="none" stroke="#1f8fe6" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>',
    }),
    laughing: () => face(arc('M11.2 13.8 L16.6 16.4 L11.2 19', 2.1) + arc('M28.8 13.8 L23.4 16.4 L28.8 19', 2.1) + bigGrin(21, 34.2) +
      '<path d="M8.6 15.6 C6.6 16.6 5.4 18.6 6.6 19.8 C7.8 20.8 9.4 19.6 9.2 17.6 Z" fill="url(#t)"/><path d="M31.4 15.6 C33.4 16.6 34.6 18.6 33.4 19.8 C32.2 20.8 30.6 19.6 30.8 17.6 Z" fill="url(#t)"/>'),
  };

  // ------------------------------------------------------------ objects
  const HEART = 'M20 34.6 C9.6 27.4 3.6 20.6 5.6 13.2 C7.4 6.6 15.4 5.2 20 11.4 C24.6 5.2 32.6 6.6 34.4 13.2 C36.4 20.6 30.4 27.4 20 34.6 Z';
  function starPoints(cx, cy, R, r, n = 5, rot = -90) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = ((rot + (i * 180) / n) * Math.PI) / 180, rad = i % 2 ? r : R;
      pts.push((cx + rad * Math.cos(a)).toFixed(2) + ',' + (cy + rad * Math.sin(a)).toFixed(2));
    }
    return pts.join(' ');
  }
  function object(body, parts, o = {}) {
    return `<defs>${radial('b', body, o.bodyOpts)}${caustic(o.caustic || '#ffffff')}${SHINE}${o.defs || ''}</defs>${floor(o.floorCol || '#0b2a4a', o.floorRx)}${parts}`;
  }
  const hand = (rot) => {
    const shapes = `<rect x="4.2" y="19.6" width="7.2" height="15.4" rx="1.6" fill="url(#q)" stroke="#0a5f9c" stroke-width=".8"/>
      <rect x="10.6" y="19.4" width="21.2" height="15.8" rx="4.6" fill="url(#b)" stroke="#b06a00" stroke-width="1"/>
      <path d="M23.4 23.9 H30.8 M23.4 27.5 H31.2 M23.4 31.1 H30.6" stroke="#c07a08" stroke-width=".9" stroke-linecap="round" opacity=".8"/>
      <path d="M12.4 21 Q11.4 12.6 14.6 7.4 Q16.8 4.4 19.4 5.8 Q21.2 7 20.4 11 L19.4 20.4 Z" fill="url(#b)" stroke="#b06a00" stroke-width="1" stroke-linejoin="round"/>
      <path d="M15.4 8.8 Q17.4 6.9 18.9 8.4" fill="none" stroke="#fff" stroke-width="1" opacity=".75"/>`;
    const shine = rot
      ? '<ellipse cx="18.4" cy="8.8" rx="8.4" ry="2.2" fill="url(#s)"/><ellipse cx="22.2" cy="28.6" rx=".9" ry="3.2" fill="#fff" opacity=".45"/>'
      : '<ellipse cx="16.4" cy="12" rx="1.6" ry="4.4" fill="#fff" opacity=".6"/><ellipse cx="22.6" cy="21.8" rx="8" ry="1.9" fill="url(#s)"/>';
    return object([[0, '#fff6d0'], [0.4, '#ffe07a'], [0.8, '#ffc22e'], [1, '#f09a10']],
      `<g${rot ? ' transform="rotate(180 20 20.4)"' : ''}>${shapes}</g>${shine}`,
      { defs: linear('q', [[0, '#d4f0ff'], [0.5, '#6cc0f5'], [0.5, '#3aa6f5'], [1, '#0a6fd1']]), floorCol: '#6a4200', floorRx: 11 });
  };

  Object.assign(ART, {
    heart: () => object([[0, '#ffe0e4'], [0.35, '#ff6477'], [0.75, '#e0243c'], [1, '#a30d22']],
      `<clipPath id="k"><path d="${HEART}"/></clipPath><path d="${HEART}" fill="url(#b)"/>
       <g clip-path="url(#k)"><ellipse cx="20" cy="31" rx="11" ry="6.5" fill="url(#c)" opacity=".55"/></g>
       <path d="${HEART}" fill="none" stroke="#8c0a1c" stroke-width="1.1" stroke-linejoin="round"/>
       <ellipse cx="12.8" cy="12.6" rx="4.8" ry="2.9" transform="rotate(-38 12.8 12.6)" fill="url(#s)"/>
       <ellipse cx="27.8" cy="11.9" rx="2.6" ry="1.5" transform="rotate(32 27.8 11.9)" fill="#fff" opacity=".55"/>`,
      { floorCol: '#6a0010' }),
    brokenheart: () => {
      const zig = 'L18 30 L21 25.2 L18.2 20.4 L21.2 15.8 Z';
      const left = 'M20 11.4 C15.4 5.2 7.4 6.6 5.6 13.2 C3.6 20.6 9.6 27.4 20 34.6 ' + zig;
      const right = 'M20 11.4 C24.6 5.2 32.6 6.6 34.4 13.2 C36.4 20.6 30.4 27.4 20 34.6 ' + zig;
      return object([[0, '#ffd0d6'], [0.35, '#f0506a'], [0.75, '#c21a34'], [1, '#85081a']],
        `<g transform="translate(-1.8 1) rotate(-8 12 20)"><path d="${left}" fill="url(#b)" stroke="#6e0614" stroke-width="1" stroke-linejoin="round"/><ellipse cx="12.4" cy="12.8" rx="4.4" ry="2.6" transform="rotate(-38 12.4 12.8)" fill="url(#s)"/></g>
         <g transform="translate(1.8 .4) rotate(7 28 20)"><path d="${right}" fill="url(#b)" stroke="#6e0614" stroke-width="1" stroke-linejoin="round"/><ellipse cx="27.4" cy="12" rx="2.4" ry="1.4" transform="rotate(32 27.4 12)" fill="#fff" opacity=".5"/></g>`,
        { floorCol: '#6a0010' });
    },
    star: () => {
      const pts = starPoints(20, 21, 18, 7.6);
      return object([[0, '#fffde8'], [0.3, '#fff06a'], [0.7, '#ffc61a'], [1, '#e88a00']],
        `<clipPath id="k"><polygon points="${pts}"/></clipPath><polygon points="${pts}" fill="url(#b)" stroke="#b56200" stroke-width="1.1" stroke-linejoin="round"/>
         <g clip-path="url(#k)"><ellipse cx="20" cy="31" rx="10" ry="6" fill="url(#c)" opacity=".6"/><ellipse cx="16.4" cy="12.6" rx="8" ry="4.6" fill="url(#s)"/></g>`,
        { floorCol: '#6a4200' });
    },
    note: () => {
      const shapes = '<ellipse cx="11.6" cy="31" rx="5.4" ry="3.9" transform="rotate(-22 11.6 31)"/><ellipse cx="28.2" cy="27" rx="5.4" ry="3.9" transform="rotate(-22 28.2 27)"/><rect x="15.4" y="8.6" width="2.4" height="22"/><rect x="32" y="4.6" width="2.4" height="22"/><polygon points="15.4,8.6 34.4,4.6 34.4,9.8 15.4,13.8"/>';
      return object([[0, '#e4f6ff'], [0.4, '#5cc0ff'], [0.8, '#1f86e0'], [1, '#0b4f9c']],
        `<g fill="#0a3f7a" stroke="#0a3f7a" stroke-width="1.8" stroke-linejoin="round">${shapes}</g><g fill="url(#b)">${shapes}</g>
         <ellipse cx="10.2" cy="29.6" rx="2.6" ry="1.2" transform="rotate(-22 10.2 29.6)" fill="#fff" opacity=".75"/><ellipse cx="26.8" cy="25.6" rx="2.6" ry="1.2" transform="rotate(-22 26.8 25.6)" fill="#fff" opacity=".75"/>
         <polygon points="16.4,9.4 33.4,5.8 33.4,7.2 16.4,10.8" fill="#fff" opacity=".7"/>`,
        { bodyOpts: { cx: 0.3, cy: 0.2, r: 0.9 } });
    },
    sun: () => {
      let rays = '';
      for (let i = 0; i < 12; i++) {
        const a = (i * 30 * Math.PI) / 180, a1 = a - 0.16, a2 = a + 0.16;
        const p = (ang, r) => (20 + r * Math.cos(ang)).toFixed(2) + ' ' + (20 + r * Math.sin(ang)).toFixed(2);
        rays += `<path d="M${p(a1, 11.6)} L${p(a, 18.8)} L${p(a2, 11.6)} Z"/>`;
      }
      return object([[0, '#fffce0'], [0.35, '#ffe45c'], [0.75, '#ffb81a'], [1, '#f08c00']],
        `<g fill="url(#y)" stroke="#d27400" stroke-width=".8" stroke-linejoin="round">${rays}</g>
         <circle cx="20" cy="20" r="10.6" fill="url(#b)" stroke="#c86a00" stroke-width="1"/>
         <ellipse cx="20" cy="26" rx="7.4" ry="4" fill="url(#c)" opacity=".6"/><ellipse cx="18" cy="15.4" rx="6.4" ry="3.6" fill="url(#s)"/>`,
        { defs: linear('y', [[0, '#ffe66a'], [1, '#ff9a00']]), floorCol: '#6a4200' });
    },
    rainbow: () => {
      const bands = [['#ff5a5a', 16.2], ['#ffa53a', 13.9], ['#ffe14a', 11.6], ['#5ad46a', 9.3], ['#3aa6f5', 7]];
      const arcs = bands.map(([c, r]) => `<path d="M${20 - r} 30 A${r} ${r} 0 0 1 ${20 + r} 30" fill="none" stroke="${c}" stroke-width="2.5"/>`).join('');
      const cloud = (x) => `<g transform="translate(${x} 0)"><path d="M-6.2 33.6 Q-8.6 33.6 -8.6 31.2 Q-8.6 28.6 -5.8 28.8 Q-5 25.4 -1.2 25.8 Q2.2 24.6 4 27.6 Q7.8 27.4 7.8 30.8 Q7.8 33.6 5 33.6 Z" fill="url(#w)" stroke="#8fb4d6" stroke-width=".8"/><ellipse cx="-1.6" cy="28" rx="3.2" ry="1.3" fill="#fff"/></g>`;
      return object([[0, '#ffffff'], [1, '#ffffff']],
        `<path d="M3.2 30 A16.8 16.8 0 0 1 36.8 30" fill="none" stroke="#b5452a" stroke-opacity=".35" stroke-width="1"/>${arcs}
         <path d="M5.6 26 A15 15 0 0 1 20 13.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".75"/>
         ${cloud(7.6)}${cloud(32.4)}`,
        { defs: linear('w', [[0, '#ffffff'], [1, '#d3e9fa']]), floorRx: 14 });
    },
    cake: () => object([[0, '#ffe8c2'], [1, '#f2b560']],
      `<ellipse cx="20" cy="35" rx="15.6" ry="2.9" fill="url(#p)" stroke="#8aa4bc" stroke-width=".7"/>
       <path d="M7.4 22 V31.4 Q7.4 34.2 20 34.2 Q32.6 34.2 32.6 31.4 V22 Z" fill="url(#k)" stroke="#a8641e" stroke-width=".9"/>
       <path d="M7.4 28.2 Q20 31 32.6 28.2" stroke="#fff4e0" stroke-width="1.6" fill="none"/>
       <path d="M7.4 22 Q7.4 26.6 9.2 26.4 Q10.8 26.2 11 24.4 Q12.2 28.6 14.2 28 Q15.6 27.4 15.6 25.2 Q17 27 18.6 26.2 Q20 25.6 20.4 25 Q21.6 28.4 23.6 27.6 Q25 27 25.2 25.2 Q26.6 27.2 28.4 26.4 Q29.8 25.6 30 24.6 Q31.2 26.4 32.6 25 V22 Z" fill="url(#f)" stroke="#d63c7a" stroke-width=".8" stroke-linejoin="round"/>
       <ellipse cx="20" cy="22" rx="12.6" ry="3.7" fill="url(#f)" stroke="#d63c7a" stroke-width=".8"/>
       <ellipse cx="16" cy="21.4" rx="6" ry="1.4" fill="#fff" opacity=".7"/>
       <rect x="18.6" y="10.4" width="2.8" height="11" rx=".9" fill="url(#cn)" stroke="#1d6fb8" stroke-width=".6"/>
       <path d="M18.6 13 L21.4 11.8 M18.6 16 L21.4 14.8 M18.6 19 L21.4 17.8" stroke="#fff" stroke-width=".9"/>
       <circle cx="20" cy="7.4" r="4.8" fill="url(#gl)"/>
       <path d="M20 3.4 C22.6 6.6 22.4 9.4 20 10 C17.6 9.4 17.4 6.6 20 3.4 Z" fill="url(#fl)" stroke="#e06a00" stroke-width=".5"/>`,
      {
        defs: linear('p', [[0, '#ffffff'], [1, '#c8d6e3']]) + linear('k', [[0, '#ffe7b8'], [1, '#e8a650']]) + linear('f', [[0, '#ffd6e6'], [0.5, '#ff8fbd'], [1, '#f0588f']]) +
          linear('cn', [[0, '#bfe6ff'], [1, '#3aa6f5']], { x2: 1, y2: 0 }) + linear('fl', [[0, '#fffbd0'], [0.5, '#ffc21a'], [1, '#ff7a00']]) + radial('gl', [[0, '#fff3a0', 0.8], [1, '#fff3a0', 0]], { cx: 0.5, cy: 0.5, r: 0.5 }),
        floorRx: 14,
      }),
    gift: () => object([[0, '#c8f0ff'], [0.5, '#3aa6f5'], [1, '#0a6fd1']],
      `<rect x="7" y="18.4" width="26" height="16.6" rx="2" fill="url(#g2)" stroke="#0a5f9c" stroke-width=".9"/>
       <rect x="18" y="18.4" width="4" height="16.6" fill="url(#r)"/>
       <rect x="5.4" y="13.4" width="29.2" height="6.2" rx="1.8" fill="url(#g1)" stroke="#0a5f9c" stroke-width=".9"/>
       <rect x="17.8" y="13.4" width="4.4" height="6.2" fill="url(#r)"/>
       <rect x="7" y="14.2" width="26" height="2.2" rx="1.1" fill="#fff" opacity=".6"/>
       <path d="M20 13.4 C16 6.2 9.4 8 11 11.6 C12.2 14 16.6 13.8 20 13.4 Z" fill="url(#r)" stroke="#a3102e" stroke-width=".8"/>
       <path d="M20 13.4 C24 6.2 30.6 8 29 11.6 C27.8 14 23.4 13.8 20 13.4 Z" fill="url(#r)" stroke="#a3102e" stroke-width=".8"/>
       <ellipse cx="20" cy="13.2" rx="2.5" ry="1.9" fill="#ff5a7a" stroke="#a3102e" stroke-width=".7"/>
       <ellipse cx="13.6" cy="10.2" rx="1.8" ry=".8" transform="rotate(-25 13.6 10.2)" fill="#fff" opacity=".7"/>
       <ellipse cx="12" cy="23.4" rx="3.2" ry="1.2" fill="#fff" opacity=".45"/>`,
      { defs: linear('g1', [[0, '#e4f7ff'], [0.5, '#7cd0ff'], [0.5, '#3aa6f5'], [1, '#1f8fe6']]) + linear('g2', [[0, '#7cd0ff'], [1, '#0a6fd1']]) + linear('r', [[0, '#ffc2d0'], [0.5, '#ff5a7a'], [1, '#d4143e']], { x2: 1, y2: 0 }), floorRx: 14 }),
    coffee: () => object([[0, '#fff'], [1, '#fff']],
      `<ellipse cx="18" cy="35.3" rx="14.4" ry="2.5" fill="url(#p)" stroke="#8aa4bc" stroke-width=".7"/>
       <path d="M14.6 10.4 Q12.6 7.9 14.6 5.6 Q16.6 3.2 15 1.2 M21.4 10.4 Q19.4 7.9 21.4 5.6 Q23.4 3.2 21.8 1.2" fill="none" stroke="#b9cbdc" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>
       <path d="M27.2 17.6 Q33.8 17.6 33.8 22.8 Q33.8 28.4 27.2 28.4" fill="none" stroke="#7d95ad" stroke-width="3.8" stroke-linecap="round"/>
       <path d="M27.2 17.6 Q33.8 17.6 33.8 22.8 Q33.8 28.4 27.2 28.4" fill="none" stroke="#eef4f9" stroke-width="1.8" stroke-linecap="round"/>
       <path d="M8.6 13.8 H27.4 V29.6 Q27.4 34.4 22.4 34.4 H13.6 Q8.6 34.4 8.6 29.6 Z" fill="url(#m)" stroke="#6f8aa6" stroke-width=".9"/>
       <rect x="8.6" y="21.4" width="18.8" height="3.2" fill="url(#bd)"/>
       <ellipse cx="18" cy="13.8" rx="9.4" ry="2.5" fill="url(#cf)" stroke="#6f8aa6" stroke-width=".8"/>
       <ellipse cx="15.6" cy="13.4" rx="3.6" ry=".8" fill="#e8b890" opacity=".6"/>
       <rect x="10.4" y="16.4" width="2.4" height="14.6" rx="1.2" fill="#fff" opacity=".9"/>`,
      {
        defs: linear('p', [[0, '#ffffff'], [1, '#c8d6e3']]) + linear('m', [[0, '#ffffff'], [0.55, '#e8f0f6'], [1, '#b3c5d6']], { x2: 1, y2: 0 }) +
          linear('cf', [[0, '#a8683a'], [1, '#5a2e10']]) + linear('bd', [[0, '#8fd3ff'], [1, '#1f8fe6']]),
      }),
    flower: () => {
      let petals = '';
      for (let i = 0; i < 12; i++) petals += `<ellipse cx="20" cy="10.4" rx="3.3" ry="8.2" transform="rotate(${i * 30} 20 19)"/>`;
      return object([[0, '#fff5b0'], [0.5, '#ffc21a'], [1, '#d98200']],
        `<path d="M13.4 31.6 Q6.4 29.2 4.6 35.6 Q11 38 13.4 31.6 Z M26.6 31.6 Q33.6 29.2 35.4 35.6 Q29 38 26.6 31.6 Z" fill="url(#l)" stroke="#157a1f" stroke-width=".8"/>
         <g fill="url(#pt)" stroke="#b5245e" stroke-width=".6">${petals}</g>
         <circle cx="20" cy="19" r="5.2" fill="url(#b)" stroke="#9a5a00" stroke-width=".8"/>
         <g fill="#b86a00" opacity=".55"><circle cx="18.4" cy="18" r=".7"/><circle cx="21.4" cy="17.6" r=".7"/><circle cx="20" cy="20.6" r=".7"/><circle cx="22.2" cy="20.2" r=".6"/><circle cx="17.6" cy="20.4" r=".6"/></g>
         <ellipse cx="18.6" cy="17.2" rx="2.4" ry="1.2" fill="#fff" opacity=".7"/>
         <ellipse cx="13.6" cy="9.6" rx="5" ry="2.4" transform="rotate(-30 13.6 9.6)" fill="url(#s)" opacity=".8"/>`,
        { defs: radial('pt', [[0, '#ffe2ef'], [0.45, '#ff85b3'], [1, '#e0357f']], { cx: 20, cy: 19, r: 13, user: true }) + linear('l', [[0, '#b4f08a'], [1, '#2f9e2a']]) });
    },
    fish: () => {
      const body = 'M5 20.5 C9.5 12 21 9.6 28.4 16.4 L35.6 11 C33.8 16.6 33.8 24.6 35.6 30 L28.4 24.6 C21 31.4 9.5 29 5 20.5 Z';
      return object([[0, '#fff3c0'], [0.5, '#ffb13a'], [0.85, '#f06a12'], [1, '#c8450a']],
        `<clipPath id="k"><path d="${body}"/></clipPath>
         <path d="M13.4 13.4 Q18 6.8 24 12.2 Q19 11.6 13.4 13.4 Z" fill="#ff9a2a" stroke="#b8480c" stroke-width=".7"/>
         <path d="${body}" fill="url(#b)" stroke="#b8480c" stroke-width="1" stroke-linejoin="round"/>
         <g clip-path="url(#k)"><ellipse cx="18" cy="27" rx="12" ry="4" fill="url(#c)" opacity=".6"/><ellipse cx="16.4" cy="14.8" rx="8" ry="2.8" fill="url(#s)"/></g>
         <path d="M30.6 17.2 L34 13.8 M30.9 20.5 L34.2 20.5 M30.6 23.8 L34 27.2" stroke="#fff0c8" stroke-opacity=".7" stroke-width=".8"/>
         <path d="M15.6 15.8 Q17.4 20.5 15.6 25.2" stroke="#fff3c8" stroke-opacity=".7" stroke-width="1" fill="none"/>
         <circle cx="11.4" cy="18.6" r="2.5" fill="#fff" stroke="#8a3a08" stroke-width=".5"/><circle cx="11" cy="18.6" r="1.5" fill="#1b2a3a"/><circle cx="10.5" cy="18" r=".5" fill="#fff"/>
         <circle cx="4.6" cy="10.2" r="2.2" fill="#e8f7ff" fill-opacity=".45" stroke="#5aa8d8" stroke-width=".6"/><circle cx="4" cy="9.6" r=".6" fill="#fff"/><circle cx="7.4" cy="4.8" r="1.4" fill="#e8f7ff" fill-opacity=".45" stroke="#5aa8d8" stroke-width=".5"/>`,
        { floorCol: '#6a2a00' });
    },
    thumbsup: () => hand(false),
    thumbsdown: () => hand(true),
    soccer: () => {
      const pent = (cx, cy, r, rot) => `<polygon points="${starPoints(cx, cy, r, r * 0.809, 5, rot).split(' ').filter((_, i) => i % 2 === 0).join(' ')}"/>`;
      return object([[0, '#ffffff'], [0.5, '#f2f6f9'], [0.85, '#c9d4de'], [1, '#98a8b8']],
        `<clipPath id="k"><circle cx="20" cy="20" r="16.6"/></clipPath>
         <circle cx="20" cy="20" r="17" fill="url(#b)"/>
         <g clip-path="url(#k)">
           <g stroke="#6b7a88" stroke-width=".8"><path d="M20 14.2 L20 6.6 M25.6 18.4 L32.8 16 M23.4 25 L27.8 31.4 M16.6 25 L12.2 31.4 M14.4 18.4 L7.2 16"/></g>
           <g fill="url(#d)">${pent(20, 19.6, 5.8, -90)}${pent(20, 2.4, 5.6, 90)}${pent(36.4, 14.4, 5.6, 162)}${pent(30.2, 34.6, 5.6, 234)}${pent(9.8, 34.6, 5.6, 306)}${pent(3.6, 14.4, 5.6, 18)}</g>
           <ellipse cx="20" cy="34" rx="13" ry="7" fill="url(#c)" opacity=".5"/>
         </g>
         <circle cx="20" cy="20" r="16.55" fill="none" stroke="#56687a" stroke-width="1.1"/>
         <ellipse cx="17.6" cy="9.4" rx="9.6" ry="5" fill="url(#s)"/>`,
        { defs: linear('d', [[0, '#5a6674'], [1, '#0d1217']]) });
    },
    pizza: () => object([[0, '#fff6c0'], [0.6, '#ffc93a'], [1, '#f0a020']],
      `<path d="M5.6 11.6 Q20 6.4 34.4 11.6 L20 36.4 Z" fill="url(#b)" stroke="#c07a10" stroke-width="1" stroke-linejoin="round"/>
       <path d="M11 21 Q10.6 24 12.2 24.2 Q13.4 24.2 13.2 21.8 Z M27.4 20 Q27.6 23.2 26.2 23.4 Q25 23.4 25.4 21 Z" fill="#ffc93a" stroke="#c07a10" stroke-width=".6"/>
       <g fill="url(#pp)" stroke="#8e1a0a" stroke-width=".6"><circle cx="14.4" cy="15.4" r="2.8"/><circle cx="24.8" cy="14.8" r="2.7"/><circle cx="19.6" cy="22.8" r="2.6"/><circle cx="20.6" cy="30" r="1.8"/></g>
       <g fill="#fff" opacity=".6"><circle cx="13.6" cy="14.6" r=".7"/><circle cx="24" cy="14" r=".7"/><circle cx="18.8" cy="22" r=".7"/></g>
       <path d="M4.4 8.8 Q20 2.4 35.6 8.8 L34.4 12 Q20 6.4 5.6 12 Z" fill="url(#cr)" stroke="#8a5210" stroke-width="1" stroke-linejoin="round"/>
       <path d="M8 8.4 Q20 4.6 32 8.4" fill="none" stroke="#fff" stroke-width=".9" opacity=".6"/>
       <path d="M9 14.6 L17.6 29.8" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>`,
      { defs: linear('cr', [[0, '#f9d894'], [1, '#c98530']]) + radial('pp', [[0, '#ff9a7a'], [1, '#c8321a']]), floorCol: '#6a4200' }),
    moon: () => object([[0, '#fffbe0'], [0.5, '#ffe066'], [1, '#f0b400']],
      `<path d="M25 4 C14 5.5 8.6 14.6 10.6 23.6 C12.6 32.4 22.4 37.8 31.6 34.2 C22.8 33.6 16.8 26.4 17.6 18.2 C18.2 11.6 21.6 7 25 4 Z" fill="url(#b)" stroke="#b88400" stroke-width="1" stroke-linejoin="round"/>
       <path d="M12.6 21 Q14.4 22.6 16.2 21.4" stroke="#6a4a00" stroke-width="1.3" fill="none" stroke-linecap="round"/>
       <ellipse cx="13.2" cy="24.6" rx="1.6" ry="1" fill="#ff7a8a" opacity=".45"/>
       <path d="M14.4 10.6 Q16.4 7.2 20.4 5.6" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".75" fill="none"/>
       <polygon points="${starPoints(30.4, 11, 3.4, 1.1, 4, 0)}" fill="#fff6c0" stroke="#e0b000" stroke-width=".5"/>
       <polygon points="${starPoints(34, 21.4, 2.2, 0.7, 4, 0)}" fill="#fff6c0" stroke="#e0b000" stroke-width=".4"/>`,
      { bodyOpts: { cx: 0.3, cy: 0.25, r: 0.9 }, floorCol: '#6a4200' }),
    idea: () => object([[0, '#fffff4'], [0.5, '#fff08a'], [1, '#ffc82a']],
      `<circle cx="20" cy="15.4" r="15" fill="url(#gl)"/>
       <path d="M20 3.4 C12.6 3.4 8.6 8.8 8.6 14.6 C8.6 19.4 11.6 21.8 13.4 24.4 C14.4 25.8 14.6 27.2 14.6 28.4 H25.4 C25.4 27.2 25.6 25.8 26.6 24.4 C28.4 21.8 31.4 19.4 31.4 14.6 C31.4 8.8 27.4 3.4 20 3.4 Z" fill="url(#b)" stroke="#c28a00" stroke-width=".9"/>
       <path d="M16.6 22 Q17.2 15.6 20 17.8 Q22.8 15.6 23.4 22" fill="none" stroke="#f08a00" stroke-width="1.1" stroke-linecap="round"/>
       <rect x="14.6" y="28.4" width="10.8" height="7.2" rx="1.6" fill="url(#m)" stroke="#5a6a7a" stroke-width=".7"/>
       <path d="M14.8 30.8 H25.2 M14.8 33.2 H25.2" stroke="#6a7a8a" stroke-width=".8"/>
       <path d="M17.4 35.6 H22.6 Q22 37.8 20 37.8 Q18 37.8 17.4 35.6 Z" fill="#4a5a6a"/>
       <ellipse cx="15.4" cy="10" rx="3.4" ry="4.6" transform="rotate(25 15.4 10)" fill="url(#s)"/>`,
      { defs: radial('gl', [[0, '#fff5a0', 0.75], [1, '#fff5a0', 0]], { cx: 0.5, cy: 0.5, r: 0.5 }) + linear('m', [[0, '#f0f4f7'], [0.5, '#b8c6d2'], [1, '#7c8c9c']], { x2: 1, y2: 0 }), floorCol: '#5a4a00', floorRx: 6 }),
    cat: () => object([[0, '#fff1d8'], [0.4, '#ffc07a'], [0.8, '#f5902e'], [1, '#d06a14']],
      `<path d="M6.6 16 L8.4 3.6 L17 10 Z M33.4 16 L31.6 3.6 L23 10 Z" fill="url(#b)" stroke="#b0560e" stroke-width=".9" stroke-linejoin="round"/>
       <path d="M9 12.6 L9.8 6.8 L14 9.8 Z M31 12.6 L30.2 6.8 L26 9.8 Z" fill="#ffb3c6"/>
       <ellipse cx="20" cy="22" rx="15.6" ry="13.6" fill="url(#b)" stroke="#b0560e" stroke-width="1"/>
       <ellipse cx="20" cy="31" rx="10" ry="4.4" fill="url(#c)" opacity=".5"/>
       <path d="M20 9 V13 M16.2 9.8 L17 13.2 M23.8 9.8 L23 13.2" stroke="#c8641a" stroke-width="1.2" stroke-linecap="round"/>
       <ellipse cx="13.8" cy="20.6" rx="2.7" ry="3.3" fill="#6ee07e" stroke="#1f6a2a" stroke-width=".6"/><ellipse cx="13.8" cy="20.8" rx="1" ry="2.6" fill="#10240f"/><circle cx="13" cy="19.4" r=".7" fill="#fff"/>
       <ellipse cx="26.2" cy="20.6" rx="2.7" ry="3.3" fill="#6ee07e" stroke="#1f6a2a" stroke-width=".6"/><ellipse cx="26.2" cy="20.8" rx="1" ry="2.6" fill="#10240f"/><circle cx="25.4" cy="19.4" r=".7" fill="#fff"/>
       <path d="M18.3 25 H21.7 L20 26.8 Z" fill="#ff7a9a" stroke="#c0485f" stroke-width=".4"/>
       <path d="M20 26.8 Q18.4 29 16.6 28 M20 26.8 Q21.6 29 23.4 28" stroke="#6a3a10" stroke-width="1" fill="none" stroke-linecap="round"/>
       <path d="M3.4 23.6 L11.6 25 M3.6 28 L11.6 27.2 M36.6 23.6 L28.4 25 M36.4 28 L28.4 27.2" stroke="#6a3a10" stroke-width=".7" opacity=".7"/>
       <ellipse cx="16.4" cy="12.6" rx="7.4" ry="3.4" fill="url(#s)"/>`,
      { floorCol: '#6a3000', floorRx: 12 }),
    dog: () => object([[0, '#fff4e0'], [0.4, '#f5d2a0'], [0.8, '#d9a066'], [1, '#b07a40']],
      `<ellipse cx="20" cy="21.4" rx="13.8" ry="13.4" fill="url(#b)" stroke="#8a5a2a" stroke-width="1"/>
       <ellipse cx="25.8" cy="17.8" rx="4.6" ry="4.2" fill="#b07a40" opacity=".55"/>
       <path d="M9 9.4 C3.4 10.6 2.4 20.6 4.8 25.6 C6.6 29 10.2 26.2 10.6 21 Z M31 9.4 C36.6 10.6 37.6 20.6 35.2 25.6 C33.4 29 29.8 26.2 29.4 21 Z" fill="url(#e)" stroke="#5a3010" stroke-width=".9" stroke-linejoin="round"/>
       <ellipse cx="20" cy="27.6" rx="7.8" ry="5.8" fill="#fff6ea" stroke="#c89060" stroke-width=".6"/>
       <path d="M20 26.8 V28.8 M20 28.8 Q17.6 30.8 15.8 29.4 M20 28.8 Q22.4 30.8 24.2 29.4" stroke="#5a3010" stroke-width=".9" fill="none" stroke-linecap="round"/>
       <path d="M18.4 30.1 Q18.4 33.6 20.2 33.6 Q22 33.6 21.8 30.3 Z" fill="${TONGUE}" stroke="#b8324e" stroke-width=".5"/>
       <ellipse cx="20" cy="24.8" rx="3.1" ry="2.2" fill="url(#n)"/><ellipse cx="19.2" cy="24.2" rx="1" ry=".6" fill="#fff" opacity=".8"/>
       ${eye(14.6, 19, 2, 2.6, '#2a1a0a')}${eye(25.4, 19, 2, 2.6, '#2a1a0a')}
       <ellipse cx="17" cy="11.6" rx="7" ry="3.2" fill="url(#s)"/>`,
      { defs: linear('e', [[0, '#b8784a'], [1, '#6a3a14']]) + radial('n', [[0, '#6a7480'], [1, '#10151a']]), floorCol: '#5a3000', floorRx: 12 }),
    brb: () => object([[0, '#fff'], [1, '#fff']],
      `<rect x="2.6" y="10" width="34.8" height="20" rx="10" fill="url(#g)" stroke="#0a5f9c" stroke-width="1"/>
       <ellipse cx="20" cy="29" rx="13" ry="4" fill="url(#c)" opacity=".7"/>
       <text x="20" y="24.4" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="12.5" fill="#fff" stroke="#0b3d73" stroke-width="2.2" paint-order="stroke">brb</text>
       <rect x="5.4" y="11.3" width="29.2" height="7.2" rx="3.6" fill="url(#s)" opacity=".85"/>`,
      { defs: linear('g', [[0, '#d4f0ff'], [0.5, '#7cc8ff'], [0.5, '#3aa6f5'], [1, '#0a6fd1']]), floorRx: 14 }),
  });

  // ------------------------------------------------------------ catalog
  // [id, name, codes]. The first code is the one the picker inserts.
  const LIST = [
    ['smile', 'Smile', [':)', ':-)', '=)', ':]']],
    ['grin', 'Big smile', [':D', ':-D', '=D']],
    ['wink', 'Wink', [';)', ';-)']],
    ['tongue', 'Tongue out', [':P', ':-P', '=P']],
    ['sad', 'Sad', [':(', ':-(', '=(', ':[']],
    ['crying', 'Crying', [":'(", ':,(']],
    ['angry', 'Angry', [':@', ':-@']],
    ['surprised', 'Surprised', [':O', ':-O']],
    ['cool', 'Cool', ['(H)', '8-)', 'B-)']],
    ['confused', 'Confused', [':S', ':-S']],
    ['embarrassed', 'Embarrassed', [':$', ':-$']],
    ['angel', 'Angel', ['(A)', 'O:)', '0:)']],
    ['devil', 'Little devil', ['(6)', '>:)']],
    ['sleepy', 'Sleepy', ['|-)', '(zzz)']],
    ['laughing', 'Laughing', [':))', '(lol)']],
    ['heart', 'Heart', ['(L)']],
    ['brokenheart', 'Broken heart', ['(U)']],
    ['star', 'Star', ['(*)']],
    ['note', 'Music note', ['(8)']],
    ['sun', 'Sun', ['(#)']],
    ['rainbow', 'Rainbow', ['(R)']],
    ['cake', 'Birthday cake', ['(^)']],
    ['gift', 'Gift', ['(G)']],
    ['coffee', 'Hot drink', ['(C)']],
    ['flower', 'Flower', ['(F)']],
    ['fish', 'Goldfish', ['(fish)', '<><']],
    ['thumbsup', 'Thumbs up', ['(Y)']],
    ['thumbsdown', 'Thumbs down', ['(N)']],
    ['soccer', 'Soccer ball', ['(so)']],
    ['pizza', 'Pizza', ['(pi)']],
    ['moon', 'Sleepy moon', ['(S)']],
    ['idea', 'Bright idea', ['(I)']],
    ['cat', 'Cat', ['(@)']],
    ['dog', 'Dog', ['(&)']],
    ['brb', 'Be right back', ['(brb)']],
  ];
  const list = LIST.map(([id, name, codes]) => ({ id, name, codes }));
  const byId = {};
  list.forEach((e) => (byId[e.id] = e));

  const svgText = (id) => wrap(ART[id]());
  const urls = new Map();
  function url(id) {
    if (!urls.has(id)) urls.set(id, URL.createObjectURL(new Blob([svgText(id)], { type: 'image/svg+xml' })));
    return urls.get(id);
  }

  // ------------------------------------------------------------ parsing
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const codeMap = new Map();
  list.forEach((e) => e.codes.forEach((c) => codeMap.set(c.toLowerCase(), e.id)));
  const allCodes = Array.from(codeMap.keys()).sort((a, b) => b.length - a.length);
  const CODE_RE = new RegExp(allCodes.map(esc).join('|'), 'gi');
  const isWord = (ch) => !!ch && /[a-z0-9]/i.test(ch);

  // Splits text into [{t:'text', v}] and [{t:'emo', id, code}] tokens. Codes that
  // end in a letter (:D, :P, :S) are skipped when glued to a word (":Dude").
  function parse(text) {
    const out = [];
    const s = String(text == null ? '' : text);
    let last = 0, m;
    CODE_RE.lastIndex = 0;
    while ((m = CODE_RE.exec(s))) {
      const code = m[0], i = m.index;
      const before = s[i - 1], after = s[i + code.length];
      if ((isWord(code[code.length - 1]) && isWord(after)) || (isWord(code[0]) && isWord(before))) {
        CODE_RE.lastIndex = i + 1;
        continue;
      }
      if (i > last) out.push({ t: 'text', v: s.slice(last, i) });
      out.push({ t: 'emo', id: codeMap.get(code.toLowerCase()), code });
      last = i + code.length;
    }
    if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
    return out;
  }

  function img(id, size, code) {
    const e = byId[id];
    if (!e) return document.createTextNode(code || '');
    const px = size || 19;
    return h('img.bm-emo', { src: url(id), alt: code || e.codes[0], 'data-tip': e.name + '   ' + e.codes[0], width: px, height: px, draggable: false });
  }

  // Renders text with emoticon images. o.size (px), o.breaks (newlines to <br>).
  function render(text, o = {}) {
    const frag = document.createDocumentFragment();
    for (const tok of parse(text)) {
      if (tok.t === 'emo') { frag.appendChild(img(tok.id, o.size, tok.code)); continue; }
      tok.v.split('\n').forEach((part, i) => {
        if (i) frag.appendChild(o.breaks === false ? document.createTextNode(' ') : h('br'));
        if (part) frag.appendChild(document.createTextNode(part));
      });
    }
    return frag;
  }

  // Strips emoticon codes (for toasts, titles and the bot brain).
  const strip = (text) => parse(text).filter((t) => t.t === 'text').map((t) => t.v).join('').replace(/\s{2,}/g, ' ').trim();
  const codesIn = (text) => parse(text).filter((t) => t.t === 'emo').map((t) => t.id);

  const quiet = (el) => { el.removeAttribute('data-tip'); return el; };
  function picker(onPick) {
    const grid = h('div.bm-emo-grid', { role: 'group', 'aria-label': 'Emoticons' });
    list.forEach((e) => {
      grid.appendChild(h('button.bm-emo-cell', {
        type: 'button', 'aria-label': e.name + ' ' + e.codes[0], 'data-tip': e.name + '   ' + e.codes[0],
        onclick: () => onPick(e),
      }, quiet(img(e.id, 24, e.codes[0]))));
    });
    return grid;
  }

  NS.emoticons = { list, byId, url, img, render, parse, strip, codesIn, picker, svg: svgText };

  // ------------------------------------------------------------ display pictures
  // Drawn pictures share the pearl frame of the built-in avatars so they crop the same way.
  function avatarSVG(bg, inner) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96"><defs>
      <radialGradient id="avb" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient>
      <linearGradient id="avf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#dfe8f0"/><stop offset=".5" stop-color="#c3d2e0"/><stop offset="1" stop-color="#eef3f7"/></linearGradient>
      <linearGradient id="avg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="avc"><rect x="7" y="7" width="82" height="82" rx="10"/></clipPath></defs>
      <rect x="1" y="1" width="94" height="94" rx="15" fill="url(#avf)" stroke="#5b89b4" stroke-opacity=".7"/>
      <g clip-path="url(#avc)"><rect x="7" y="7" width="82" height="82" fill="url(#avb)"/>${inner}<path d="M7 7 H89 V40 Q48 52 7 40 Z" fill="url(#avg)" opacity=".75"/></g>
      <rect x="7" y="7" width="82" height="82" rx="10" fill="none" stroke="#0b3d73" stroke-opacity=".35"/></svg>`;
  }
  const nest = (id, x = 16, y = 14, s = 64) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 40 40">${ART[id]()}</svg>`;
  const iconInner = (key, fallback) => {
    const src = A.ASSET_SVG && A.ASSET_SVG[key];
    if (!src) return fallback;
    const open = src.slice(0, src.indexOf('>')).replace(/\s(width|height|x|y)="[^"]*"/g, '');
    return open.replace('<svg', '<svg x="16" y="14" width="64" height="64"') + src.slice(src.indexOf('>'));
  };
  const MASCOT = `<svg x="12" y="10" width="72" height="72" viewBox="0 0 72 72"><defs>
      <radialGradient id="mb" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff" stop-opacity=".8"/><stop offset=".55" stop-color="#a8ecff" stop-opacity=".7"/><stop offset=".86" stop-color="#2cb0ec" stop-opacity=".9"/><stop offset="1" stop-color="#0a64b4"/></radialGradient>
      <linearGradient id="mr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8ffd8"/><stop offset=".5" stop-color="#ffd0f0"/><stop offset="1" stop-color="#8fd3ff"/></linearGradient></defs>
      <ellipse cx="36" cy="67.5" rx="18" ry="2.6" fill="#0b2a4a" opacity=".2"/>
      <circle cx="36" cy="36" r="27" fill="url(#mb)" stroke="#0a5fa8" stroke-opacity=".55"/><circle cx="36" cy="36" r="25.8" fill="none" stroke="url(#mr)" stroke-width="1.6" opacity=".9"/>
      <ellipse cx="28.5" cy="36" rx="3.4" ry="4.6" fill="#0b3d73"/><ellipse cx="43.5" cy="36" rx="3.4" ry="4.6" fill="#0b3d73"/>
      <circle cx="27.4" cy="34.2" r="1.4" fill="#fff"/><circle cx="42.4" cy="34.2" r="1.4" fill="#fff"/>
      <ellipse cx="22.6" cy="43.4" rx="3.6" ry="2.2" fill="#ff7aa0" opacity=".45"/><ellipse cx="49.4" cy="43.4" rx="3.6" ry="2.2" fill="#ff7aa0" opacity=".45"/>
      <path d="M30.5 44 Q36 49.5 41.5 44" fill="none" stroke="#0b3d73" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="27" cy="20.5" rx="11" ry="6" transform="rotate(-24 27 20.5)" fill="#fff" opacity=".85"/><circle cx="50" cy="52" r="2.2" fill="#fff" opacity=".7"/>
      <circle cx="62" cy="14" r="5" fill="url(#mb)"/><circle cx="62" cy="14" r="4.6" fill="none" stroke="url(#mr)" stroke-width=".9"/><ellipse cx="60.6" cy="12.4" rx="1.8" ry="1" fill="#fff" opacity=".85"/>
      <circle cx="8.5" cy="20" r="3.2" fill="url(#mb)"/><circle cx="8.5" cy="20" r="2.9" fill="none" stroke="url(#mr)" stroke-width=".7"/></svg>`;
  const AVATARS = {
    askbubbles: () => avatarSVG(['#fffbe0', '#ffc93a'], MASCOT),
    gamepad: () => avatarSVG(['#e2ffd0', '#35b83a'], iconInner('icons/gamepad', nest('star'))),
    smile: () => avatarSVG(['#e4f6ff', '#3aa6f5'], nest('grin')),
    cool: () => avatarSVG(['#ffe8c8', '#ff8a3a'], nest('cool')),
    star: () => avatarSVG(['#5a7fb4', '#0b2a5a'], nest('star')),
    heart: () => avatarSVG(['#fff0f4', '#ff8fb0'], nest('heart')),
    rainbow: () => avatarSVG(['#ffffff', '#8fd3ff'], nest('rainbow')),
    soccer: () => avatarSVG(['#c8f5a8', '#2f9e2a'], nest('soccer')),
    cat: () => avatarSVG(['#fff4d6', '#ffb347'], nest('cat')),
    dog: () => avatarSVG(['#e8f7ff', '#5ab8e8'], nest('dog')),
    cake: () => avatarSVG(['#fff0f8', '#ff9ec7'], nest('cake')),
    moon: () => avatarSVG(['#3a5f9a', '#071a3a'], nest('moon')),
  };
  const avatarUrls = new Map();
  // Resolves a picture key: 'bm:<name>' for drawn pictures, otherwise an Aerium asset key or URL.
  function pictureUrl(key) {
    if (key && key.startsWith('bm:')) {
      const name = key.slice(3);
      if (!AVATARS[name]) return A.asset('avatars/avatar-fish');
      if (!avatarUrls.has(name)) avatarUrls.set(name, URL.createObjectURL(new Blob([AVATARS[name]()], { type: 'image/svg+xml' })));
      return avatarUrls.get(name);
    }
    return A.asset(key || 'avatars/avatar-fish');
  }
  // Pictures with the built-in pearl frame get cropped so the status frame can replace it.
  const pictureFramed = (key) => !!key && (key.startsWith('bm:') || key.startsWith('avatars/'));
  const PICTURES = ['avatars/avatar-fish', 'avatars/avatar-flower', 'avatars/avatar-butterfly', 'avatars/avatar-dolphin', 'avatars/avatar-sun',
    'avatars/avatar-globe', 'avatars/avatar-leaf', 'avatars/avatar-music'].concat(Object.keys(AVATARS).map((k) => 'bm:' + k));

  // ------------------------------------------------------------ buddies
  function buddySVG(tone) {
    const c = tone === 'blue' ? ['#e4f6ff', '#3aa6f5', '#0a5fb0', '#0a4a8c'] : ['#e8ffd8', '#45c93a', '#157a1f', '#12661a'];
    const id = 'bd' + tone;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" class="bm-buddy-svg" aria-hidden="true"><defs>
      <radialGradient id="${id}" cx=".36" cy=".26" r=".85"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient>
      <radialGradient id="${id}c" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <circle cx="20" cy="12.5" r="10" fill="url(#${id})" stroke="${c[3]}" stroke-opacity=".6"/>
      <path d="M3.5 46 Q3.5 25.5 20 25.5 Q36.5 25.5 36.5 46 Z" fill="url(#${id})" stroke="${c[3]}" stroke-opacity=".6"/>
      <ellipse cx="20" cy="44" rx="12" ry="5" fill="url(#${id}c)"/>
      <ellipse cx="17.6" cy="7.6" rx="5.6" ry="3.4" fill="url(#${id}s)"/>
      <ellipse cx="16" cy="30" rx="8" ry="3" fill="url(#${id}s)" opacity=".8"/></svg>`;
  }
  // A logo mark: green and blue buddies side by side.
  function buddiesLogo(cls) {
    return h('span.bm-logo', { class: cls, html: `<span class="bm-logo-b bm-logo-blue">${buddySVG('blue')}</span><span class="bm-logo-b bm-logo-green">${buddySVG('green')}</span>` });
  }
  // The signing-in spinner: two glossy buddies orbiting each other in 3D.
  function buddiesSpinner() {
    return h('div.bm-spin', { role: 'img', 'aria-label': 'Signing in' },
      h('div.bm-spin-stage', null,
        h('div.bm-spin-orbit', null,
          h('div.bm-spin-slot.bm-spin-a', null, h('div.bm-spin-face', { html: buddySVG('green') })),
          h('div.bm-spin-slot.bm-spin-b', null, h('div.bm-spin-face', { html: buddySVG('blue') })))),
      h('div.bm-spin-floor'));
  }

  NS.art = { pictureUrl, pictureFramed, PICTURES, buddySVG, buddiesLogo, buddiesSpinner };

  // ------------------------------------------------------------ winks
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function drawBubble(ctx, x, y, r, hue) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.14)');
    g.addColorStop(0.72, 'rgba(190,235,255,0.10)');
    g.addColorStop(0.93, `hsla(${hue},95%,72%,0.5)`);
    g.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const rg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    rg.addColorStop(0, 'rgba(160,255,200,.85)'); rg.addColorStop(0.5, 'rgba(255,190,235,.65)'); rg.addColorStop(1, 'rgba(120,200,255,.95)');
    ctx.strokeStyle = rg; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.36, y - r * 0.44, r * 0.34, r * 0.17, -0.62, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.arc(x + r * 0.45, y + r * 0.44, r * 0.08, 0, TAU); ctx.fill();
  }
  function heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.62);
    ctx.bezierCurveTo(x - s * 0.52, y + s * 0.26, x - s * 0.82, y - s * 0.08, x - s * 0.72, y - s * 0.42);
    ctx.bezierCurveTo(x - s * 0.62, y - s * 0.76, x - s * 0.2, y - s * 0.84, x, y - s * 0.46);
    ctx.bezierCurveTo(x + s * 0.2, y - s * 0.84, x + s * 0.62, y - s * 0.76, x + s * 0.72, y - s * 0.42);
    ctx.bezierCurveTo(x + s * 0.82, y - s * 0.08, x + s * 0.52, y + s * 0.26, x, y + s * 0.62);
    ctx.closePath();
  }
  function drawHeart(ctx, x, y, s, rot, hue) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    heartPath(ctx, 0, 0, s);
    const g = ctx.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.05, 0, 0, s * 0.9);
    g.addColorStop(0, `hsl(${hue},100%,92%)`); g.addColorStop(0.35, `hsl(${hue},100%,66%)`); g.addColorStop(0.8, `hsl(${hue},85%,48%)`); g.addColorStop(1, `hsl(${hue},85%,34%)`);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(0.8, s * 0.04); ctx.strokeStyle = `hsl(${hue},80%,28%)`; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.ellipse(-s * 0.4, -s * 0.42, s * 0.2, s * 0.11, -0.7, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function starPath(ctx, x, y, R, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot - Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r : R;
      ctx.lineTo(x + rad * Math.cos(a), y + rad * Math.sin(a));
    }
    ctx.closePath();
  }
  function drawStar(ctx, x, y, R, rot, hue, alpha) {
    ctx.save(); ctx.globalAlpha *= alpha == null ? 1 : alpha;
    starPath(ctx, x, y, R, R * 0.45, rot);
    const g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.05, x, y, R);
    g.addColorStop(0, '#fffef0'); g.addColorStop(0.4, `hsl(${hue},100%,65%)`); g.addColorStop(1, `hsl(${hue},90%,42%)`);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(0.6, R * 0.06); ctx.strokeStyle = `hsl(${hue},80%,32%)`; ctx.stroke();
    ctx.restore();
  }
  function drawCloud(ctx, x, y, s, alpha) {
    ctx.save(); ctx.globalAlpha *= alpha;
    const g = ctx.createLinearGradient(0, y - s, 0, y + s * 0.6);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfe6f8');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(110,160,210,.6)'; ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath();
    ctx.arc(x - s * 0.55, y, s * 0.42, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x - s * 0.15, y - s * 0.35, s * 0.5, Math.PI, Math.PI * 1.85);
    ctx.arc(x + s * 0.4, y - s * 0.12, s * 0.42, Math.PI * 1.3, Math.PI * 0.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.ellipse(x - s * 0.2, y - s * 0.55, s * 0.3, s * 0.1, -0.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function sparkle(ctx, x, y, s, alpha) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = s * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill(); ctx.restore();
  }
  function drawFish(ctx, x, y, L, tail, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    const H = L * 0.56;
    // tail
    ctx.save(); ctx.translate(L * 0.36, 0); ctx.rotate(Math.sin(tail) * 0.35);
    const tg = ctx.createLinearGradient(0, -H * 0.6, L * 0.4, H * 0.6);
    tg.addColorStop(0, 'rgba(255,190,90,.95)'); tg.addColorStop(1, 'rgba(240,90,20,.85)');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(L * 0.18, -H * 0.5, L * 0.38, -H * 0.8, L * 0.44, -H * 0.62);
    ctx.bezierCurveTo(L * 0.3, -H * 0.2, L * 0.3, H * 0.2, L * 0.44, H * 0.62);
    ctx.bezierCurveTo(L * 0.38, H * 0.8, L * 0.18, H * 0.5, 0, 0);
    ctx.fill(); ctx.strokeStyle = 'rgba(180,70,10,.7)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    // dorsal fin
    ctx.fillStyle = 'rgba(255,150,50,.9)';
    ctx.beginPath(); ctx.moveTo(-L * 0.1, -H * 0.42); ctx.quadraticCurveTo(L * 0.05, -H * 0.95 + Math.sin(tail * 0.7) * 3, L * 0.25, -H * 0.32); ctx.closePath(); ctx.fill();
    // body
    const bg = ctx.createRadialGradient(-L * 0.18, -H * 0.2, L * 0.04, -L * 0.05, 0, L * 0.55);
    bg.addColorStop(0, '#fff6c8'); bg.addColorStop(0.45, '#ffb13a'); bg.addColorStop(0.85, '#f06a12'); bg.addColorStop(1, '#c8450a');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(-L * 0.05, 0, L * 0.45, H * 0.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(170,60,10,.75)'; ctx.lineWidth = 1.4; ctx.stroke();
    // shine & caustic
    ctx.save(); ctx.clip();
    const sg = ctx.createLinearGradient(0, -H * 0.5, 0, 0);
    sg.addColorStop(0, 'rgba(255,255,255,.85)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(-L * 0.1, -H * 0.24, L * 0.32, H * 0.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,190,.35)'; ctx.beginPath(); ctx.ellipse(-L * 0.05, H * 0.42, L * 0.36, H * 0.16, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // gill and pectoral fin
    ctx.strokeStyle = 'rgba(255,240,200,.75)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(-L * 0.16, 0, H * 0.34, -1.1, 1.1); ctx.stroke();
    ctx.fillStyle = 'rgba(255,170,70,.85)';
    ctx.beginPath(); ctx.ellipse(-L * 0.02, H * 0.2, L * 0.1, H * 0.1, 0.6 + Math.sin(tail * 1.3) * 0.3, 0, TAU); ctx.fill();
    // eye
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-L * 0.32, -H * 0.08, H * 0.13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b2a3a'; ctx.beginPath(); ctx.arc(-L * 0.335, -H * 0.08, H * 0.08, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-L * 0.35, -H * 0.12, H * 0.03, 0, TAU); ctx.fill();
    ctx.restore();
  }

  const WINKS = [
    {
      id: 'bubbles', name: 'Bubble Burst', icon: 'icons/bubble', duration: 5200,
      init(W, H) {
        const n = Math.round(Math.min(46, 20 + W * H / 9000));
        return {
          bubbles: Array.from({ length: n }, () => ({ x: rnd(0, W), y: H + rnd(10, H * 0.7), r: rnd(7, 30), v: rnd(60, 150), ph: rnd(0, TAU), f: rnd(1.2, 2.6), hue: rnd(170, 330), pop: rnd(0.35, 0.85) })),
        };
      },
      draw(ctx, t, W, H, st, sec) {
        const wash = ctx.createLinearGradient(0, H, 0, 0);
        wash.addColorStop(0, 'rgba(90,200,245,.22)'); wash.addColorStop(1, 'rgba(90,200,245,0)');
        ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
        st.bubbles.forEach((b) => {
          const y = b.y - b.v * sec, x = b.x + Math.sin(sec * b.f + b.ph) * 14;
          const popSec = b.pop * 5.2;
          if (sec < popSec) { if (y > -b.r) drawBubble(ctx, x, y, b.r, b.hue); return; }
          const k = (sec - popSec) / 0.35;
          if (k > 1) return;
          const py = b.y - b.v * popSec;
          ctx.save(); ctx.globalAlpha *= 1 - k;
          ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, py, b.r * (1 + k * 0.6), 0, TAU); ctx.stroke();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + b.ph;
            ctx.fillStyle = 'rgba(210,245,255,.95)';
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * b.r * (1 + k * 1.4), py + Math.sin(a) * b.r * (1 + k * 1.4), 2, 0, TAU); ctx.fill();
          }
          ctx.restore();
        });
        // Finale: one big bubble swells in the middle and pops into sparkles.
        const big = Math.min(W, H) * 0.3;
        if (t > 0.5 && t < 0.86) {
          const k = ease((t - 0.5) / 0.3);
          const wob = 1 + Math.sin(sec * 9) * 0.035;
          ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(wob, 2 - wob);
          drawBubble(ctx, 0, 0, big * k, 200 + Math.sin(sec) * 60);
          ctx.restore();
        } else if (t >= 0.86) {
          const k = (t - 0.86) / 0.14;
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * TAU;
            sparkle(ctx, W / 2 + Math.cos(a) * big * (1 + k * 1.2), H / 2 + Math.sin(a) * big * (1 + k * 1.2), 6 + (i % 3) * 3, 1 - k);
          }
        }
      },
      sound(S, t) {
        for (let i = 0; i < 14; i++) S.blip(650 + Math.random() * 600, 1500 + Math.random() * 900, t + 0.3 + Math.random() * 3.4, { dur: 0.05, vel: 0.05, glide: 0.035 });
        S.blip(260, 1300, t + 4.45, { dur: 0.12, vel: 0.2, glide: 0.06 });
        S.noise(t + 4.45, { dur: 0.08, vel: 0.12, type: 'highpass', f1: 2500, rev: 0.2 });
        S.bell('C7', t + 4.5, { vel: 0.05, dur: 1.2, index: 0.6, rev: 0.6 });
      },
    },
    {
      id: 'hearts', name: 'Heart Shower', icon: 'icons/heart', duration: 5000,
      init(W, H) {
        return { hearts: Array.from({ length: 38 }, () => ({ x: rnd(0, W), y: -rnd(20, H * 1.1), s: rnd(10, 30), v: rnd(55, 120), rot: rnd(-0.5, 0.5), vr: rnd(-1.2, 1.2), sw: rnd(8, 26), ph: rnd(0, TAU), hue: rnd(335, 362) % 360 })) };
      },
      draw(ctx, t, W, H, st, sec) {
        st.hearts.forEach((p) => {
          const y = p.y + p.v * sec;
          if (y > H + 40) return;
          drawHeart(ctx, p.x + Math.sin(sec * 1.6 + p.ph) * p.sw, y, p.s, p.rot + p.vr * sec * 0.6, p.hue);
        });
        if (t > 0.45) {
          const k = ease((t - 0.45) / 0.3);
          const s = Math.min(W, H) * 0.22 * k * (1 + Math.sin(sec * 8) * 0.06);
          ctx.save(); ctx.shadowColor = 'rgba(255,80,120,.6)'; ctx.shadowBlur = 30;
          drawHeart(ctx, W / 2, H / 2, s, 0, 350);
          ctx.restore();
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU + sec * 0.8;
            sparkle(ctx, W / 2 + Math.cos(a) * s * 1.4, H / 2 + Math.sin(a) * s * 1.2, 5 + (i % 2) * 3, k * (0.5 + 0.5 * Math.sin(sec * 6 + i)));
          }
        }
      },
      sound(S, t) {
        ['C6', 'E6', 'G6', 'C7', 'E7'].forEach((n, i) => S.bell(n, t + 0.2 + i * 0.16, { vel: 0.06, dur: 1.4, index: 1, rev: 0.5 }));
        ['F4', 'A4', 'C5', 'E5'].forEach((n) => S.epiano(n, t + 2.3, { vel: 0.07, dur: 2.4 }));
        ['G6', 'C7'].forEach((n, i) => S.bell(n, t + 2.4 + i * 0.2, { vel: 0.05, dur: 1.6, index: 0.8, rev: 0.6 }));
      },
    },
    {
      id: 'fish', name: 'Goldfish Glide', icon: 'icons/fish', duration: 6000,
      init(W, H) {
        return { bubbles: [], blown: 0, weeds: Array.from({ length: 7 }, (_, i) => ({ x: (i + 0.5) * (W / 7) + rnd(-15, 15), h: rnd(H * 0.12, H * 0.28), ph: rnd(0, TAU) })) };
      },
      draw(ctx, t, W, H, st, sec) {
        const wash = ctx.createLinearGradient(0, 0, 0, H);
        wash.addColorStop(0, 'rgba(120,220,250,.30)'); wash.addColorStop(1, 'rgba(20,130,190,.38)');
        ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
        // caustic light and rays
        ctx.save(); ctx.globalAlpha *= 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 12) ctx.lineTo(x, H * (0.12 + i * 0.05) + Math.sin(x * 0.03 + sec * 1.6 + i) * 6);
          ctx.stroke();
        }
        ctx.restore();
        ctx.save(); ctx.globalAlpha *= 0.18; ctx.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) {
          const x0 = W * (0.15 + i * 0.25) + Math.sin(sec * 0.5 + i) * 20;
          ctx.beginPath(); ctx.moveTo(x0 - 18, 0); ctx.lineTo(x0 + 18, 0); ctx.lineTo(x0 + 70, H); ctx.lineTo(x0 + 20, H); ctx.fill();
        }
        ctx.restore();
        // seaweed
        st.weeds.forEach((w) => {
          const g = ctx.createLinearGradient(0, H - w.h, 0, H);
          g.addColorStop(0, '#9ff07a'); g.addColorStop(1, '#1f8a29');
          ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(w.x, H + 4);
          for (let k = 1; k <= 6; k++) ctx.lineTo(w.x + Math.sin(sec * 1.4 + w.ph + k * 0.6) * k * 2.4, H - (w.h * k) / 6);
          ctx.stroke();
        });
        // the fish
        const L = Math.min(W * 0.4, H * 0.5, 240);
        const p = easeInOut(Math.min(1, t / 0.92));
        const fx = -L * 0.7 + (W + L * 1.4) * p, fy = H * 0.46 + Math.sin(sec * 1.8) * H * 0.06;
        // seven bubbles, one every ~0.6s while crossing
        if (st.blown < 7 && sec > 0.9 + st.blown * 0.62) {
          st.blown++;
          st.bubbles.push({ x: fx + L * 0.4, y: fy - L * 0.05, r: rnd(5, 11), t0: sec, ph: rnd(0, TAU) });
        }
        drawFish(ctx, fx, fy, L, sec * 9, -1);
        st.bubbles.forEach((b) => {
          const age = sec - b.t0, y = b.y - age * 70;
          if (y < -20) return;
          drawBubble(ctx, b.x + Math.sin(age * 3 + b.ph) * 6, y, b.r * (1 + age * 0.12), 190);
        });
      },
      sound(S, t) {
        S.noise(t, { dur: 5.2, vel: 0.018, type: 'lowpass', f1: 380, shape: 'swell', rev: 0.4 });
        for (let i = 0; i < 7; i++) S.blip(500 + i * 40, 1400 + i * 60, t + 0.95 + i * 0.62, { dur: 0.06, vel: 0.06, glide: 0.04 });
        ['E5', 'G5', 'B5'].forEach((n, i) => S.pluck(n, t + 0.2 + i * 0.22, { vel: 0.07, dur: 0.8, rev: 0.5 }));
      },
    },
    {
      id: 'sunrise', name: 'Sunrise', icon: 'icons/sun', duration: 5600,
      init(W, H) { return { clouds: [{ x: -0.2, y: 0.62, s: 0.14, v: 0.06 }, { x: 0.75, y: 0.72, s: 0.11, v: -0.04 }, { x: 0.35, y: 0.3, s: 0.08, v: 0.03 }] }; },
      draw(ctx, t, W, H, st, sec) {
        const k = ease(t / 0.75);
        const sky = ctx.createLinearGradient(0, H, 0, 0);
        sky.addColorStop(0, `rgba(255,${Math.round(150 + 60 * k)},90,${0.45 * k + 0.1})`);
        sky.addColorStop(0.45, `rgba(255,230,160,${0.3 * k})`);
        sky.addColorStop(1, `rgba(140,205,255,${0.25 * k})`);
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        const R = Math.min(W, H) * 0.15;
        const sx = W * 0.5, sy = H + R * 1.2 - (H * 0.62 + R * 1.2) * k;
        const glow = ctx.createRadialGradient(sx, sy, R * 0.5, sx, sy, R * 4.5);
        glow.addColorStop(0, 'rgba(255,245,190,.75)'); glow.addColorStop(1, 'rgba(255,245,190,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(sec * 0.25);
        for (let i = 0; i < 14; i++) {
          ctx.rotate(TAU / 14);
          const rg = ctx.createLinearGradient(0, R, 0, R * 3.2);
          rg.addColorStop(0, 'rgba(255,230,120,.55)'); rg.addColorStop(1, 'rgba(255,230,120,0)');
          ctx.fillStyle = rg;
          ctx.beginPath(); ctx.moveTo(-R * 0.18, R * 1.05); ctx.lineTo(0, R * (3 + (i % 2) * 0.6)); ctx.lineTo(R * 0.18, R * 1.05); ctx.fill();
        }
        ctx.restore();
        const g = ctx.createRadialGradient(sx - R * 0.3, sy - R * 0.35, R * 0.1, sx, sy, R);
        g.addColorStop(0, '#fffde8'); g.addColorStop(0.4, '#ffe45c'); g.addColorStop(0.85, '#ffac1a'); g.addColorStop(1, '#f08000');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(200,100,0,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(sx - R * 0.2, sy - R * 0.45, R * 0.5, R * 0.26, -0.2, 0, TAU); ctx.fill();
        if (t > 0.45) {
          const f = Math.min(1, (t - 0.45) / 0.2);
          [[0.35, 0.2, 'rgba(255,255,255,.25)'], [0.62, 0.12, 'rgba(160,230,255,.3)'], [0.85, 0.06, 'rgba(255,220,160,.35)']].forEach(([d, r, c]) => {
            ctx.fillStyle = c; ctx.globalAlpha *= f;
            ctx.beginPath(); ctx.arc(sx + (W * 0.12 - sx) * d, sy + (H * 0.1 - sy) * d, R * r * 2, 0, TAU); ctx.fill();
            ctx.globalAlpha /= f;
          });
        }
        st.clouds.forEach((c) => drawCloud(ctx, W * (c.x + c.v * sec), H * c.y, Math.min(W, H) * c.s * 1.6, 0.92));
        if (t > 0.35) {
          ctx.strokeStyle = 'rgba(40,60,90,.7)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const bx = W * (0.1 + (t - 0.35) * 0.9) + i * 22, by = H * (0.25 + i * 0.04) + Math.sin(sec * 3 + i) * 3, wing = Math.sin(sec * 10 + i) * 4;
            ctx.beginPath(); ctx.moveTo(bx - 7, by - wing); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 3, bx + 7, by - wing); ctx.stroke();
          }
        }
      },
      sound(S, t) {
        S.pad(['C4', 'E4', 'G4', 'B4', 'D5'], t, { dur: 5, vel: 0.06, attack: 1.8, release: 2.2, cutoff: 600, cutoffEnd: 2600 });
        ['C5', 'E5', 'G5', 'C6', 'D6'].forEach((n, i) => S.bell(n, t + 1.4 + i * 0.28, { vel: 0.06, dur: 1.8, index: 1, rev: 0.6 }));
      },
    },
    {
      id: 'rainbow', name: 'Rainbow Glow', icon: 'icons/rainbow', duration: 5200,
      init(W, H) { return { sparks: Array.from({ length: 26 }, () => ({ a: rnd(Math.PI * 1.05, Math.PI * 1.95), d: rnd(-0.08, 0.08), ph: rnd(0, TAU), s: rnd(3, 7) })) }; },
      draw(ctx, t, W, H, st, sec) {
        const cx = W / 2, cy = H * 0.86, R = Math.min(W * 0.44, H * 0.72);
        const bands = ['#ff5a5a', '#ffa53a', '#ffe14a', '#5ad46a', '#3aa6f5', '#5a8cf0'];
        const bw = R * 0.075, sweep = ease(t / 0.42);
        const end = Math.PI + Math.PI * sweep;
        bands.forEach((c, i) => {
          ctx.strokeStyle = c; ctx.lineWidth = bw; ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.arc(cx, cy, R - i * bw, Math.PI, end); ctx.stroke();
        });
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = bw * 0.5;
        ctx.beginPath(); ctx.arc(cx, cy, R + bw * 0.1, Math.PI, end); ctx.stroke();
        if (t > 0.42) {
          const pos = Math.PI + ((sec * 0.9) % 1.2) / 1.2 * Math.PI;
          ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = bw * 5.5; ctx.globalAlpha *= 0.35;
          ctx.beginPath(); ctx.arc(cx, cy, R - bw * 2.5, pos - 0.12, pos + 0.12); ctx.stroke(); ctx.restore();
          st.sparks.forEach((p) => sparkle(ctx, cx + Math.cos(p.a) * R * (0.82 + p.d), cy + Math.sin(p.a) * R * (0.82 + p.d), p.s, 0.5 + 0.5 * Math.sin(sec * 5 + p.ph)));
        }
        const cs = R * 0.3;
        drawCloud(ctx, cx - R + bw * 2.5, cy + cs * 0.1, cs * ease(t / 0.15), 1);
        drawCloud(ctx, cx + R - bw * 2.5, cy + cs * 0.1, cs * ease((t - 0.35) / 0.15), 1);
      },
      sound(S, t) {
        ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'].forEach((n, i) => S.bell(n, t + 0.1 + i * 0.2, { vel: 0.05, dur: 1.4, index: 0.9, rev: 0.55 }));
        S.noise(t + 2.2, { dur: 2.4, vel: 0.012, type: 'highpass', f1: 7000, shape: 'swell', rev: 0.6 });
      },
    },
    {
      id: 'stars', name: 'Star Sparkler', icon: 'icons/star', duration: 5400,
      init(W, H) {
        const rockets = Array.from({ length: 6 }, (_, i) => ({ x: rnd(W * 0.15, W * 0.85), ty: rnd(H * 0.18, H * 0.45), t0: 0.2 + i * 0.62 + rnd(0, 0.2), hue: [48, 190, 330, 120, 28, 205][i] }));
        rockets.forEach((r) => (r.parts = Array.from({ length: 40 }, () => ({ a: rnd(0, TAU), v: rnd(80, 200), s: rnd(4, 9) }))));
        return { rockets };
      },
      draw(ctx, t, W, H, st, sec) {
        const night = ctx.createLinearGradient(0, 0, 0, H);
        night.addColorStop(0, 'rgba(6,18,60,.78)'); night.addColorStop(1, 'rgba(18,60,110,.42)');
        ctx.fillStyle = night; ctx.fillRect(0, 0, W, H);
        st.rockets.forEach((r) => {
          const age = sec - r.t0;
          if (age < 0) return;
          const rise = 0.7;
          if (age < rise) {
            const k = ease(age / rise), y = H + 10 - (H + 10 - r.ty) * k;
            ctx.save(); ctx.strokeStyle = `hsla(${r.hue},100%,75%,.7)`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x, y + 30); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.shadowColor = `hsl(${r.hue},100%,70%)`; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(r.x, y, 3, 0, TAU); ctx.fill(); ctx.restore();
            return;
          }
          const e = age - rise;
          if (e > 1.8) return;
          const fade = 1 - e / 1.8;
          r.parts.forEach((p, i) => {
            const x = r.x + Math.cos(p.a) * p.v * e, y = r.ty + Math.sin(p.a) * p.v * e + 40 * e * e;
            if (i % 3 === 0) drawStar(ctx, x, y, p.s * 1.6, sec * 3 + p.a, r.hue, fade);
            else { ctx.save(); ctx.globalAlpha *= fade; ctx.fillStyle = `hsl(${r.hue},100%,${70 + (i % 2) * 15}%)`; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x, y, p.s * 0.45, 0, TAU); ctx.fill(); ctx.restore(); }
          });
          if (e < 0.25) { ctx.save(); ctx.globalAlpha *= 1 - e / 0.25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r.x, r.ty, 26 * (1 - e * 2), 0, TAU); ctx.fill(); ctx.restore(); }
        });
      },
      sound(S, t) {
        const starts = [0.2, 0.82, 1.44, 2.06, 2.68, 3.3];
        starts.forEach((s, i) => {
          S.noise(t + s, { dur: 0.6, vel: 0.03, f1: 400, f2: 2600, q: 1.2, shape: 'swell', rev: 0.2 });
          S.noise(t + s + 0.72, { dur: 0.3, vel: 0.12, type: 'lowpass', f1: 400, rev: 0.4 });
          for (let k = 0; k < 6; k++) S.noise(t + s + 0.8 + Math.random() * 0.8, { dur: 0.02, vel: 0.05 + Math.random() * 0.06, type: 'highpass', f1: 4000, rev: 0.3 });
          S.bell(['G6', 'E6', 'C7', 'A6', 'D7', 'G6'][i], t + s + 0.74, { vel: 0.03, dur: 1, index: 0.6, rev: 0.6 });
        });
      },
    },
  ];
  const winkById = {};
  WINKS.forEach((w) => (winkById[w.id] = w));

  // Plays a wink over `host` (positioned). Returns { stop() }. opts: { sound, onDone }.
  function playWink(host, id, opts = {}) {
    const def = winkById[id] || WINKS[0];
    const canvas = h('canvas.bm-wink-canvas', { 'aria-hidden': 'true' });
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, raf = 0, done = false;
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = host.clientWidth || 300; H = host.clientHeight || 200;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    const st = def.init ? def.init(W, H) : {};
    const t0 = performance.now();
    if (opts.sound !== false && A.sound.ctx && A.store.get('sound.enabled')) {
      try { def.sound(A.sound, A.sound.ctx.currentTime + 0.05); } catch (e) { /* audio is optional */ }
    }
    function frame(now) {
      if (done) return;
      const sec = (now - t0) / 1000, t = sec * 1000 / def.duration;
      if (t >= 1) { finish(); return; }
      if (host.clientWidth !== W || host.clientHeight !== H) size();
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 10, (1 - t) * 7);
      def.draw(ctx, t, W, H, st, sec);
      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      canvas.remove();
      if (opts.onDone) opts.onDone();
    }
    raf = requestAnimationFrame(frame);
    return { stop: finish, def };
  }

  NS.winks = { list: WINKS.map(({ id, name, icon, duration }) => ({ id, name, icon, duration })), byId: winkById, play: playWink };
})();
