/* Channels: a calm, living-room home screen. White pinstripes, rounded TV
   tiles with live previews, a big friendly clock, a message board, and a
   shop where everything costs 0 points. It is a full-screen overlay drawn
   entirely here; Esc or the round Aerium button goes back to the desktop. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, clamp } = A.util;

  const Z_INDEX = 150000;
  let S = null; // the open session, or null

  // ------------------------------------------------------------ helpers
  function sfx(name, opts) { try { A.sound.play(name, opts); } catch (e) { /* audio is optional */ } }
  // The music engine is built in parallel, so every call is guarded.
  function music(id) {
    try { if (A.music && A.music.play) Promise.resolve(A.music.play(id, { loop: true, fadeIn: true })).catch(() => {}); } catch (e) { /* no music yet */ }
  }
  function ensureMusic(id) {
    try {
      const m = A.music;
      if (m && m.state === 'playing' && m.current && m.current.id === id) return;
    } catch (e) { /* no music yet */ }
    music(id);
  }
  function musicStop() {
    try { if (A.music && A.music.stop) A.music.stop({ fadeOut: true }); } catch (e) { /* no music yet */ }
  }
  function node(markup) {
    const t = document.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstElementChild;
  }
  const esc = A.util.escapeHTML;
  const uid = () => A.util.uid('ch');
  const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  function pictureUrls() {
    const user = [], samples = [];
    (function walk(dir, depth) {
      if (depth > 4) return;
      for (const it of A.fs.list(dir)) {
        if (it.type === 'folder') walk(it.path, depth + 1);
        else {
          const url = A.fs.thumbFor(it.path);
          if (url) (it.path.includes('/Sample Pictures/') ? samples : user).push({ url, name: A.fs.stem(it.path) });
        }
      }
    })('/Pictures', 0);
    const liked = ['Meadow', 'Sunrise', 'Ocean', 'Clear Sky', 'Bokeh', 'Underwater', 'Aurora'];
    samples.sort((a, b) => (liked.indexOf(a.name) + 1 || 99) - (liked.indexOf(b.name) + 1 || 99));
    const out = user.concat(samples).map((p) => p.url);
    ['imagery/meadow', 'imagery/sunrise', 'imagery/ocean', 'imagery/bokeh-day'].forEach((k) => { if (out.length < 4) out.push(A.asset(k)); });
    return out;
  }
  function headlines() {
    try { if (A.gadgets && A.gadgets.headlines) { const list = A.gadgets.headlines(); if (list && list.length) return list; } } catch (e) { /* fall back */ }
    return [
      { title: 'Sunny weekend ahead, experts recommend kites', summary: 'Gentle breezes and clear skies from Saturday morning.' },
      { title: 'Scientists confirm bubbles are still very fun', summary: 'The study reached the same happy conclusion as every summer before it.' },
      { title: 'Community garden grows 500 pounds of tomatoes', summary: 'Volunteers credit sunshine, patience and good music.' },
      { title: 'Families discover video calling, grandparents delighted', summary: 'Tip from experts: sit near a lamp, and remember to smile.' },
    ];
  }

  // A glossy white glove pointer with a blue cuff, used everywhere inside Channels.
  const HAND_PATH = 'M9.5 1.6C10.9 1.6 12 2.7 12 4.1V12.4C12.5 11.7 13.4 11.3 14.3 11.4C15.4 11.5 16.1 12.3 16.2 13.3C16.8 12.6 17.7 12.3 18.6 12.5C19.7 12.8 20.3 13.6 20.3 14.6C21 14.1 21.9 14 22.7 14.4C23.6 14.9 24 15.8 24 16.8V21.2C24 25 21.6 27.6 17.8 27.6H14C11.2 27.6 9.4 26.3 8.1 24.2L4.2 18.3C3.6 17.3 3.9 16.1 4.8 15.6C5.8 15 6.6 15.4 7 16.4V4.1C7 2.7 8.1 1.6 9.5 1.6Z';
  const HAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f1f5f8"/><stop offset="1" stop-color="#d3dde6"/></linearGradient>
    <linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fe2ff"/><stop offset=".5" stop-color="#3fb0ee"/><stop offset=".5" stop-color="#1f94dc"/><stop offset="1" stop-color="#4fb8f0"/></linearGradient></defs>
    <path d="${HAND_PATH}" transform="translate(1.3 1.7)" fill="#001a33" opacity=".26"/>
    <path d="${HAND_PATH}" fill="url(#g)" stroke="#6d8192" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M13.6 14.2v2.6M17.4 14.8v2.4M20.9 16.2v2" stroke="#a7b6c3" stroke-width=".9" stroke-linecap="round"/>
    <path d="M8.5 3.9c.3-1 1.7-1 2 0v6.5" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".9"/>
    <rect x="9.6" y="26.4" width="13.2" height="4.4" rx="1.6" fill="url(#c)" stroke="#0a6fa8" stroke-width=".8"/>
    <rect x="10.6" y="26.9" width="11.2" height="1.4" rx=".7" fill="#fff" opacity=".6"/></svg>`;
  const CURSOR = `url("${svgUrl(HAND_SVG)}") 9 2, pointer`;

  // ============================================================ tile previews
  // Each preview draws into a TV "screen" at any size (tile or full screen)
  // and returns an optional { pause, resume, destroy } controller. Moving
  // parts are CSS transforms, so the compositor does the work.

  function pvAquarium(el, ctx) {
    if (A.aquarium && A.aquarium.create) {
      try {
        const c = A.aquarium.create(el, { mode: 'tank', preview: !ctx.large, interactive: !!ctx.large });
        if (ctx.large && c.pointer) {
          el.addEventListener('pointerdown', (e) => { if (e.button === 0) c.pointer('click', e.clientX, e.clientY); });
          el.addEventListener('pointermove', (e) => c.pointer('move', e.clientX, e.clientY));
        }
        return { pause: () => c.pause && c.pause(), resume: () => c.resume && c.resume(), destroy: () => c.destroy && c.destroy() };
      } catch (e) { el.replaceChildren(); }
    }
    // Our own little tank, if the aquarium is not available.
    const fish = (cls, hue) => `<div class="ch-aq-fish ${cls}"><svg viewBox="0 0 60 36"><defs><radialGradient id="${cls}g" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff0c8"/><stop offset=".6" stop-color="${hue}"/><stop offset="1" stop-color="#c8440c"/></radialGradient></defs>
      <path d="M44 18L58 6l-3 12 3 12z" fill="${hue}" opacity=".85"/><ellipse cx="26" cy="18" rx="20" ry="13" fill="url(#${cls}g)"/><path d="M19 6q9-6 15 1" fill="${hue}"/>
      <circle cx="14" cy="15" r="3" fill="#fff"/><circle cx="13.4" cy="15" r="1.6" fill="#1e2a35"/><ellipse cx="24" cy="11" rx="10" ry="3.5" fill="#fff" opacity=".45"/></svg></div>`;
    el.innerHTML = `<div class="ch-aq"><div class="ch-aq-rays"></div>${fish('f1', '#ff8a2a')}${fish('f2', '#ffb13a')}${fish('f3', '#ff6a3c')}
      <div class="ch-aq-bubbles">${'<i></i>'.repeat(8)}</div><div class="ch-aq-sand"></div></div>`;
    return null;
  }

  function pvPhoto(el) {
    const urls = pictureUrls().slice(0, 4);
    const wrap = h('div.ch-ph');
    urls.forEach((u, i) => wrap.appendChild(h('div.ch-ph-img', { style: { backgroundImage: `url("${u}")`, animationDelay: (i * 5 - 1) + 's' } })));
    wrap.appendChild(h('div.ch-ph-frame'));
    el.appendChild(wrap);
    return null;
  }

  function pvMusic(el, ctx) {
    const n = ctx.large ? 24 : 12;
    const bars = [];
    for (let i = 0; i < n; i++) bars.push(h('i', { style: { animationDuration: (0.46 + ((i * 37) % 9) / 14).toFixed(2) + 's', animationDelay: (-((i * 13) % 9) / 10).toFixed(2) + 's' } }));
    const title = h('b'), artist = h('span');
    const cover = h('div.ch-mu-cover', null, node('<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M27 7v17.5a5 5 0 1 1-2.6-4.4V12l-10 2.4v12.1a5 5 0 1 1-2.6-4.4V10.2z" fill="#fff" opacity=".95"/></svg>'));
    const root = h('div.ch-mu', null,
      h('div.ch-mu-bokeh', null, h('i'), h('i'), h('i'), h('i'), h('i')),
      h('div.ch-mu-art', null, h('div.ch-mu-disc'), cover),
      h('div.ch-mu-eq', null, bars),
      h('div.ch-mu-info', null, h('small', null, 'Now playing'), title, artist));
    el.appendChild(root);
    const data = new Uint8Array(128);
    let live = false, shown = '';
    const info = () => {
      const m = A.music, cur = m && m.state === 'playing' && m.current;
      const t = cur ? cur.title : 'Channels theme', a = cur ? cur.artist || '' : 'Aerium Sound Studio';
      if (t + a === shown) return;
      shown = t + a;
      title.textContent = t;
      artist.textContent = a;
      cover.style.setProperty('--c', (cur && cur.color) || '#3aa6f5');
    };
    info();
    ctx.every(1000, info);
    ctx.loop(() => {
      const m = A.music;
      const on = !!(m && m.analyser && m.state === 'playing');
      if (on !== live) { live = on; root.classList.toggle('ch-mu-live', on); if (!on) bars.forEach((b) => { b.style.transform = ''; }); }
      if (!on) return;
      try { m.analyser.getByteFrequencyData(data); } catch (e) { return; }
      for (let i = 0; i < n; i++) {
        const v = data[1 + Math.floor((i * 56) / n)] / 255;
        bars[i].style.transform = `scaleY(${(0.1 + v * 0.9).toFixed(3)})`;
      }
    });
    return null;
  }

  // The weather globe: a flat map scrolling behind a round window looks like a spinning planet.
  const MAP_URL = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" preserveAspectRatio="none"><defs>
    <linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ce86a"/><stop offset="1" stop-color="#3fb13a"/></linearGradient>
    <linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dea0"/><stop offset="1" stop-color="#d6b36a"/></linearGradient></defs>
    <path d="M18 26c10-9 30-8 36 1 5 7-4 12-6 20-2 9-10 13-15 7-5-5-2-10-9-14-7-4-11-8-6-14z" fill="url(#l)"/>
    <path d="M40 60c7-3 12 3 11 11-1 9-5 18-10 17-5-1-6-10-7-16-1-6 1-10 6-12z" fill="url(#l)"/>
    <path d="M86 22c9-7 24-6 28 2 3 6-5 8-6 14-2 7 6 10 3 16-3 7-9 3-12 10-3 8 1 16-5 17-6 1-9-8-10-16-1-9-6-12-4-20 2-9-2-15 6-23z" fill="url(#l)"/>
    <path d="M98 44c6-2 11 2 11 8s-5 8-10 7-7-13-1-15z" fill="url(#d)"/>
    <path d="M122 20c14-7 38-6 46 4 5 7-3 12-10 15-8 3-13 0-19 4-6 5-13 3-17-3-5-7-9-15 0-20z" fill="url(#l)"/>
    <path d="M160 64c7-4 17-2 19 5 2 7-6 10-12 9-7-1-13-9-7-14z" fill="url(#d)"/>
    <path d="M150 50c3-2 6 0 5 3s-5 2-5-3z" fill="url(#l)"/>
    <ellipse cx="100" cy="2" rx="100" ry="5" fill="#f4fbff"/><ellipse cx="100" cy="98" rx="100" ry="6" fill="#f4fbff"/></svg>`);
  const CLOUD_URL = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" preserveAspectRatio="none"><g fill="#fff">
    <ellipse cx="30" cy="30" rx="16" ry="4" opacity=".85"/><ellipse cx="40" cy="27" rx="9" ry="4" opacity=".85"/><ellipse cx="70" cy="62" rx="20" ry="4.5" opacity=".8"/>
    <ellipse cx="110" cy="40" rx="14" ry="3.5" opacity=".85"/><ellipse cx="120" cy="37" rx="8" ry="3.5" opacity=".85"/><ellipse cx="150" cy="75" rx="18" ry="4" opacity=".75"/>
    <ellipse cx="175" cy="22" rx="13" ry="3.5" opacity=".8"/><ellipse cx="18" cy="80" rx="14" ry="3.5" opacity=".7"/></g></svg>`);

  function pvWeather(el, ctx) {
    const globe = h('div.ch-wx-globe', null,
      h('div.ch-wx-map', { style: { backgroundImage: `url("${MAP_URL}")` } }),
      h('div.ch-wx-clouds', { style: { backgroundImage: `url("${CLOUD_URL}")` } }),
      h('div.ch-wx-shade'), h('div.ch-wx-gloss'));
    const root = h('div.ch-wx', { class: ctx.large ? 'ch-wx-large' : '' }, h('div.ch-wx-stars'), h('div.ch-wx-halo'), globe);
    if (ctx.large && A.gadgets && A.gadgets.weather) {
      const cards = h('div.ch-wx-cards');
      const home = A.gadgets.weather();
      const picks = [null, 'tokyo', 'paris', 'honolulu', 'newyork', 'sydney'].map((id) => (id ? A.gadgets.weather(id) : home))
        .filter((w, i, arr) => arr.findIndex((x) => x.city === w.city) === i).slice(0, 4);
      picks.forEach((w, i) => {
        const icon = h('span.ch-wx-icon');
        icon.innerHTML = A.gadgets.weatherIcon ? A.gadgets.weatherIcon(w.cond) : '';
        cards.appendChild(h('div.ch-wx-card', { style: { animationDelay: (0.25 + i * 0.12) + 's' } }, icon,
          h('div.ch-wx-card-text', null, h('b', null, w.city), h('span', null, w.text)),
          h('div.ch-wx-temp', null, w.temp + '°' + w.unit)));
      });
      root.appendChild(cards);
    }
    el.appendChild(root);
    return null;
  }

  function pvNews(el, ctx) {
    const items = headlines();
    const rnd = A.util.seeded(Math.floor(Date.now() / 86400000));
    const top = A.util.shuffle(items, rnd).slice(0, 4);
    const cards = h('div.ch-nw-cards', null, top.map((it, i) => h('div.ch-nw-card', { style: { animationDelay: (i * 5 - 1) + 's' } },
      h('span.ch-nw-tag', null, i === 0 ? 'Top story' : 'Headline'),
      h('div.ch-nw-title', null, it.title),
      ctx.large ? h('div.ch-nw-sum', null, it.summary) : null)));
    const text = items.slice(0, 12).map((it) => esc(it.title)).join('<i></i>');
    const track = h('div.ch-nw-track', { html: `<span>${text}<i></i></span><span>${text}<i></i></span>`, style: { animationDuration: Math.max(40, items.length * 7) + 's' } });
    el.appendChild(h('div.ch-nw', null,
      h('div.ch-nw-head', null, A.img('icons/globe', { class: 'ch-nw-globe' }), h('b', null, 'Aerium News'), h('span.ch-nw-live', null, 'Today')),
      cards,
      h('div.ch-nw-ticker', null, track)));
    return null;
  }

  function pvPaint(el) {
    const p = (d, color, delay, w) => `<path d="${d}" pathLength="1" stroke="${color}" stroke-width="${w || 3.2}" style="animation-delay:${delay}s"/>`;
    el.innerHTML = `<div class="ch-pt"><svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="200" fill="#fdfdfb"/>
      <g class="ch-pt-lines" fill="none" stroke-linecap="round" stroke-linejoin="round">
        ${p('M8 164Q90 150 170 160T314 158', '#3fb13a', 0, 3.6)}
        ${p('M72 160V112h58v48', '#b0703a', 0.7)}
        ${p('M62 114l39-33 39 33', '#e8453c', 1.3)}
        ${p('M93 160v-24h16v24', '#2f86d6', 1.8)}
        ${p('M112 120h12v11h-12z', '#2f86d6', 2.1, 2.4)}
        ${p('M262 36m-15 0a15 15 0 1 0 30 0a15 15 0 1 0-30 0', '#ffc21a', 2.5)}
        ${p('M262 12v-6M262 66v-6M238 36h-6M292 36h-6M245 19l-4-4M279 53l4 4M279 19l4-4M245 53l-4 4', '#ffc21a', 3.1, 2.6)}
        ${p('M196 160v-32', '#8a5a2a', 3.5, 4)}
        ${p('M196 131c-22 0-25-30-7-34 2-17 23-17 25 0 18 4 15 34-6 34z', '#3fb13a', 3.9)}
        ${p('M240 160v-18', '#3fb13a', 4.5, 2.6)}
        ${p('M240 136m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M240 131v-4M240 145v-4M235 136h-4M249 136h-4', '#f06aa8', 4.8, 2.6)}
        ${p('M34 54c0-9 14-11 18-5 4-10 21-8 21 3 10 0 10 13 0 13H38c-8 0-9-11-4-11z', '#7cc8ff', 5.3, 2.8)}
      </g>
      <g class="ch-pt-palette">${['#e8453c', '#ffc21a', '#3fb13a', '#2f86d6', '#f06aa8', '#8a5a2a'].map((c, i) => `<circle cx="${22 + i * 16}" cy="186" r="6" fill="${c}" stroke="#fff" stroke-width="1.5"/>`).join('')}</g>
      </svg></div>`;
    return null;
  }

  function pvGames(el) {
    const icons = ['icons/cards', 'icons/mine', 'icons/gamepad', 'icons/pairs', 'icons/bubble'];
    el.appendChild(h('div.ch-gm', null, h('div.ch-gm-floor'),
      icons.map((k, i) => h('div.ch-gm-slot', { style: { left: (10 + i * 17.5) + '%', animationDelay: (-i * 0.23).toFixed(2) + 's' } },
        h('div.ch-gm-ic', { style: { animationDelay: (-i * 0.23).toFixed(2) + 's' } }, A.img(k)),
        h('div.ch-gm-shadow', { style: { animationDelay: (-i * 0.23).toFixed(2) + 's' } })))));
    return null;
  }

  const CHAT = [
    ['a', 'hey!! r u there?'],
    ['b', 'yep, just feeding my fish'],
    ['a', 'lol what are their names'],
    ['b', 'Captain Bubbles and Goldie'],
    ['a', 'cute!! brb, mom needs the phone'],
    ['b', 'ok ttyl'],
    ['a', 'back! did u see the aurora pics?'],
    ['b', 'SO pretty. its my wallpaper now'],
    ['a', 'nudge war later?'],
    ['b', 'u r ON'],
  ];
  function pvMessenger(el, ctx) {
    const list = h('div.ch-ms-list');
    el.appendChild(h('div.ch-ms', null,
      h('div.ch-ms-head', null, h('span.ch-ms-dot'), h('b', null, 'Bubble Messenger'), h('span', null, '2 friends online')),
      h('div.ch-ms-body', null,
        h('div.ch-ms-av.a', null, A.img('avatars/avatar-flower'), h('span', null, 'Daisy')),
        list,
        h('div.ch-ms-av.b', null, A.img('avatars/avatar-dolphin'), h('span', null, 'Marco')))));
    const max = ctx.large ? 7 : 3;
    let i = 0, typing = null;
    const trim = () => { while (list.children.length > max) list.firstElementChild.remove(); };
    function step() {
      const [who, text] = CHAT[i % CHAT.length];
      if (!typing) {
        typing = h('div.ch-ms-msg.ch-ms-typing', { class: who }, h('i'), h('i'), h('i'));
        list.appendChild(typing);
        trim();
        return;
      }
      typing.remove();
      typing = null;
      list.appendChild(h('div.ch-ms-msg', { class: who }, text));
      trim();
      i++;
    }
    step(); step(); step(); step();
    ctx.every(1150, step);
    return null;
  }

  const BURST = (() => {
    const pts = [];
    for (let i = 0; i < 32; i++) { const a = (Math.PI * 2 * i) / 32, r = i % 2 ? 41 : 50; pts.push((50 + r * Math.cos(a)).toFixed(1) + '% ' + (50 + r * Math.sin(a)).toFixed(1) + '%'); }
    return `polygon(${pts.join(',')})`;
  })();
  function pvBrowser(el) {
    const icons = ['photo', 'music', 'globe'].map((k) => `<div><img src="${A.icon(k)}" alt=""><span></span><span></span></div>`).join('');
    const page = `<div class="ch-br-pg">
      <div class="ch-br-top"><b>Aerium<i>Home</i></b><span></span><span></span><span></span></div>
      <div class="ch-br-hero"><div class="ch-br-hero-text"><b>Welcome to the web!</b><span></span><span></span></div><div class="ch-br-burst" style="clip-path:${BURST}"><span>New!</span></div></div>
      <div class="ch-br-cols">${icons}</div>
      <div class="ch-br-text"><span></span><span></span><span></span><span></span></div>
      <div class="ch-br-list"><b>Top sites</b><span></span><span></span><span></span></div>
      <div class="ch-br-counter">Visitors: <b>004217</b></div></div>`;
    el.innerHTML = `<div class="ch-br"><div class="ch-br-chrome"><i></i><i></i><div class="ch-br-url"><span>http://home.aerium.net</span></div><i class="go"></i></div>
      <div class="ch-br-view"><div class="ch-br-scroll">${page}${page}</div></div></div>`;
    return null;
  }

  function gearSVG(teeth, u, hub, phase) {
    const R = 47, r = 38.5, step = (Math.PI * 2) / teeth;
    const pol = (rad, a) => (rad * Math.cos(a)).toFixed(2) + ' ' + (rad * Math.sin(a)).toFixed(2);
    let d = '';
    for (let i = 0; i < teeth; i++) {
      const a = i * step;
      d += (i ? 'L' : 'M') + pol(r, a - step * 0.3) + 'L' + pol(R, a - step * 0.15) + 'L' + pol(R, a + step * 0.15) + 'L' + pol(r, a + step * 0.3);
    }
    let holes = '';
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; holes += `<circle cx="${(24 * Math.cos(a)).toFixed(1)}" cy="${(24 * Math.sin(a)).toFixed(1)}" r="6.5" fill="${hub}" opacity=".9"/>`; }
    return `<svg viewBox="-52 -52 104 104" aria-hidden="true"><defs>
      <linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#dfe6ec"/><stop offset=".55" stop-color="#b9c5cf"/><stop offset="1" stop-color="#8e9ba7"/></linearGradient>
      <radialGradient id="${u}h" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#e3f5ff"/><stop offset=".5" stop-color="#4aaef2"/><stop offset="1" stop-color="#1a7fcf"/></radialGradient></defs>
      <path d="${d}Z" fill="url(#${u}m)" stroke="#6d7a86" stroke-width="1.4" stroke-linejoin="round" transform="rotate(${phase || 0})"/>
      <circle r="30" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>${holes}
      <circle r="13" fill="url(#${u}h)" stroke="#1a6fb0" stroke-width="1"/><circle r="4.5" fill="#0b4f86"/><ellipse cx="-3" cy="-6" rx="7" ry="3.5" fill="#fff" opacity=".7"/></svg>`;
  }
  function pvSettings(el) {
    const u = uid();
    el.appendChild(h('div.ch-st', null,
      h('div.ch-st-grid'),
      h('div.ch-st-g.g1', { html: gearSVG(12, u + 'a', '#c3ced8', 0) }),
      h('div.ch-st-g.g2', { html: gearSVG(8, u + 'b', '#c3ced8', 0) }),
      h('div.ch-st-g.g3', { html: gearSVG(10, u + 'c', '#c3ced8', 9) }),
      h('div.ch-spark.s1'), h('div.ch-spark.s2')));
    return null;
  }

  function bagSVG(u) {
    return `<svg viewBox="0 0 120 132" aria-hidden="true"><defs>
      <linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8f3ff"/><stop offset=".48" stop-color="#52c2f2"/><stop offset=".5" stop-color="#1f9ae0"/><stop offset="1" stop-color="#46b8f0"/></linearGradient>
      <linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a7fc8" stop-opacity="0"/><stop offset="1" stop-color="#0b5fa0" stop-opacity=".55"/></linearGradient>
      <radialGradient id="${u}f" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1e2a35" stop-opacity=".3"/><stop offset="1" stop-color="#1e2a35" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}t" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff6c2"/><stop offset=".55" stop-color="#ffd84a"/><stop offset="1" stop-color="#f09a12"/></radialGradient></defs>
      <ellipse cx="60" cy="125" rx="46" ry="6" fill="url(#${u}f)"/>
      <path d="M40 42C40 12 80 12 80 42" fill="none" stroke="#0b5fa0" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M40 42C40 16 80 16 80 42" fill="none" stroke="#7fd0ff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <path d="M18 40h84l-6 80H24z" fill="url(#${u}b)" stroke="#0a6fa8" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M82 40h20l-6 80H80z" fill="url(#${u}s)"/>
      <path d="M22 44h76l-1 20c-26-7-48-7-74 0z" fill="#fff" opacity=".5"/>
      <circle cx="40" cy="42" r="3.6" fill="#0b5fa0"/><circle cx="80" cy="42" r="3.6" fill="#0b5fa0"/>
      <path d="M60 70l5.6 11.3 12.4 1.8-9 8.8 2.1 12.4L60 98.4l-11.1 5.9 2.1-12.4-9-8.8 12.4-1.8z" fill="url(#${u}t)" stroke="#e08a12" stroke-width="1.2" stroke-linejoin="round"/>
      <ellipse cx="57" cy="80" rx="5" ry="2.6" fill="#fff" opacity=".7"/></svg>`;
  }
  function pvShop(el, ctx) {
    el.appendChild(h('div.ch-sh', null,
      h('div.ch-sh-rays'),
      h('div.ch-sh-bag', { html: bagSVG(uid()) }),
      h('div.ch-spark.s1'), h('div.ch-spark.s2'), h('div.ch-spark.s3'), h('div.ch-spark.s4'),
      h('div.ch-sh-coin.c1'), h('div.ch-sh-coin.c2'), h('div.ch-sh-coin.c3'),
      ctx.large ? h('div.ch-sh-note', null, 'Everything is free today, and every day.') : null));
    return null;
  }

  const FORTUNES = [
    'A pleasant surprise is waiting in your inbox.',
    'Today is a wonderful day to change your glass color.',
    'Someone you know is about to say brb.',
    'The fish are very proud of you.',
    'Your next mix CD will have zero skips.',
    'A gentle breeze will bring good news.',
    'You will find something lovely in your Pictures folder.',
    'An old friend will sign in soon.',
    'Stretch your arms. Something great is on its way.',
    'Your screensaver will make someone smile today.',
    'Good ideas arrive like bubbles. Catch one today.',
    'You are the sunshine on somebody\'s desktop.',
  ];
  function cookieSVG(u, side) {
    const d = side === 'l' ? 'M60 30C35 24 11 40 14 63c2 16 21 24 39 17-7-11-6-31 7-50z' : 'M60 30c25-6 49 10 46 33-2 16-21 24-39 17 7-11 6-31-7-50z';
    return `<svg viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id="${u}${side}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a8"/><stop offset=".55" stop-color="#f5b94a"/><stop offset="1" stop-color="#d98a22"/></linearGradient></defs>
      <path d="${d}" fill="url(#${u}${side})" stroke="#b86e14" stroke-width="1.2"/>
      <path d="${side === 'l' ? 'M52 36c-14-2-28 6-31 18' : 'M68 36c14-2 28 6 31 18'}" stroke="#fff6d8" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/></svg>`;
  }
  function pvFortune(el, ctx) {
    const day = Math.floor(Date.now() / 86400000);
    let n = 0, open = false, busy = false;
    const u = uid();
    const text = h('div.ch-ft-text');
    const lucky = h('div.ch-ft-lucky');
    const root = h('div.ch-ft', { class: ctx.large ? 'ch-ft-large' : '' },
      h('div.ch-ft-glow'),
      h('div.ch-ft-cookie', null,
        h('div.ch-ft-half.l', { html: cookieSVG(u, 'l') }),
        h('div.ch-ft-slip', null, h('span')),
        h('div.ch-ft-half.r', { html: cookieSVG(u, 'r') })),
      h('div.ch-ft-paper', null, text, lucky),
      h('div.ch-spark.s1'), h('div.ch-spark.s2'), h('div.ch-spark.s3'));
    el.appendChild(root);
    function fill() {
      text.textContent = FORTUNES[(day * 7 + n * 5) % FORTUNES.length];
      const rnd = A.util.seeded(day * 31 + n);
      const nums = new Set();
      while (nums.size < 5) nums.add(1 + Math.floor(rnd() * 49));
      lucky.textContent = 'Lucky numbers: ' + Array.from(nums).sort((a, b) => a - b).join('  ');
    }
    fill();
    return {
      crack() {
        if (busy) return;
        busy = true;
        const go = () => { fill(); root.classList.add('open'); open = true; sfx('pop'); setTimeout(() => sfx('ding'), 380); setTimeout(() => { busy = false; }, 700); };
        if (open) { root.classList.remove('open'); open = false; n++; setTimeout(go, 650); } else go();
      },
    };
  }

  function pvBubbles(el, ctx) {
    const rnd = A.util.seeded(5);
    let dots = '';
    for (let i = 0; i < 10; i++) dots += `<i style="left:${(5 + rnd() * 88).toFixed(1)}%;--s:${(0.5 + rnd() * 0.9).toFixed(2)};animation-duration:${(6 + rnd() * 6).toFixed(1)}s;animation-delay:-${(rnd() * 10).toFixed(1)}s"></i>`;
    const root = h('div.ch-bb', { html: `<div class="ch-bb-big"></div>${dots}` });
    el.appendChild(root);
    let playing = false, score = 0, scoreEl = null;
    function pop(e) {
      e.stopPropagation();
      const b = e.currentTarget;
      if (b.classList.contains('popped')) return;
      b.classList.add('popped');
      sfx('pop', { minGap: 10 });
      score++;
      scoreEl.textContent = score === 1 ? '1 bubble popped' : score + ' bubbles popped';
      setTimeout(() => b.remove(), 320);
    }
    function spawn() {
      if (root.querySelectorAll('.ch-bb-pop').length > 16) return;
      const b = h('button.ch-bb-pop', {
        type: 'button', 'aria-label': 'Pop this bubble',
        style: { left: A.util.rand(4, 88).toFixed(1) + '%', '--d': A.util.rand(5, 9).toFixed(1) + 's', '--s': A.util.rand(0.7, 1.35).toFixed(2), '--x': A.util.rand(-50, 50).toFixed(0) + 'px' },
      }, h('span'));
      b.addEventListener('pointerdown', pop);
      b.addEventListener('animationend', (e) => { if (e.target === b) b.remove(); });
      root.appendChild(b);
    }
    return {
      play() {
        if (playing) return;
        playing = true;
        root.classList.add('ch-bb-play');
        scoreEl = h('div.ch-bb-score', null, 'Pop as many bubbles as you can!');
        root.appendChild(scoreEl);
        spawn();
        ctx.every(480, spawn);
        sfx('bubble');
      },
    };
  }

  // ============================================================ channel list
  // start: an app id to launch, or an in-Channels action.
  const CHANNELS = [
    { id: 'aquarium', title: 'Aquarium Channel', app: 'aquarium', preview: pvAquarium },
    { id: 'photo', title: 'Photo Channel', app: 'photos', preview: pvPhoto },
    { id: 'music', title: 'Music Channel', app: 'mediaplayer', preview: pvMusic },
    { id: 'shop', title: 'Shop Channel', action: 'shop', preview: pvShop },
    { id: 'weather', title: 'Weather Channel', action: 'gadget', gadget: 'weather', preview: pvWeather },
    { id: 'news', title: 'News Channel', action: 'gadget', gadget: 'feed', preview: pvNews },
    { id: 'messenger', title: 'Messenger Channel', app: 'messenger', preview: pvMessenger },
    { id: 'browser', title: 'Internet Channel', app: 'browser', args: { url: 'home.aerium.net' }, preview: pvBrowser },
    { id: 'paint', title: 'Paint Channel', app: 'paint', preview: pvPaint },
    { id: 'games', title: 'Games Channel', app: 'games', preview: pvGames },
    { id: 'settings', title: 'Settings Channel', app: 'controlpanel', preview: pvSettings },
    { id: 'fortune', title: 'Fortune Channel', action: 'fortune', preview: pvFortune },
    { id: 'bubbles', title: 'Bubble Channel', action: 'bubbles', preview: pvBubbles },
  ];
  const PER_PAGE = 12;
  const PAGES = Math.max(2, Math.ceil(CHANNELS.length / PER_PAGE));

  const NOTICE_ICON = `<svg class="ch-notice-icon" viewBox="0 0 96 88" aria-hidden="true"><defs>
    <linearGradient id="chnt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7c8"/><stop offset=".5" stop-color="#ffdc55"/><stop offset=".5" stop-color="#ffc41c"/><stop offset="1" stop-color="#ffd55e"/></linearGradient>
    <linearGradient id="chnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b4f4ff"/><stop offset="1" stop-color="#1f9be0"/></linearGradient></defs>
    <path d="M48 5c3.1 0 5.7 1.6 7.1 4.2l35.3 62.4c2.8 5-.8 11.4-6.6 11.4H12.2c-5.8 0-9.4-6.4-6.6-11.4L40.9 9.2C42.3 6.6 44.9 5 48 5z" fill="url(#chnt)" stroke="#e3a414" stroke-width="2" stroke-linejoin="round"/>
    <path d="M48 11c1.6 0 3 .9 3.8 2.3L70 45c-12-4-32-4-44 0l18.2-31.7C45 11.9 46.4 11 48 11z" fill="#fff" opacity=".55"/>
    <path d="M48 25c5.6 8.6 8.6 13.8 8.6 19a8.6 8.6 0 0 1-17.2 0c0-5.2 3-10.4 8.6-19z" fill="url(#chnd)" stroke="#0f7cb0" stroke-width="1.3"/>
    <ellipse cx="45" cy="42" rx="2.4" ry="4" fill="#fff" opacity=".85"/>
    <circle cx="48" cy="67" r="6" fill="url(#chnd)" stroke="#0f7cb0" stroke-width="1.3"/><circle cx="46.2" cy="65.3" r="1.7" fill="#fff" opacity=".9"/></svg>`;
  const ENVELOPE_SVG = `<svg class="ch-env-ic" viewBox="0 0 48 36" aria-hidden="true"><defs><linearGradient id="chev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dde4ea"/></linearGradient></defs>
    <rect x="3" y="4" width="42" height="28" rx="4" fill="url(#chev)" stroke="currentColor" stroke-width="2.4"/><path d="M5 7l19 14L43 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  const ARROW_SVG = (dir) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function pill(label, onClick, cls) {
    const b = h('button.ch-pill', { type: 'button', class: cls, onclick: (e) => { e.stopPropagation(); onClick(e); } }, h('span', null, label));
    b.addEventListener('pointerenter', () => sfx('hover'));
    return b;
  }

  // ------------------------------------------------------------ preview contexts
  // Every preview gets a context: loop callbacks and timers run from one shared
  // loop, and only while the preview is on screen.
  function makeCtx(large) {
    const ctx = {
      large, active: true, fns: [], timers: [], ctrl: null,
      loop(fn) { ctx.fns.push(fn); },
      every(ms, fn, first) { ctx.timers.push({ ms, fn, next: performance.now() + (first == null ? ms : first) }); },
    };
    S.ctxs.add(ctx);
    return ctx;
  }
  function setActive(ctx, on) {
    if (!ctx || ctx.active === on) return;
    ctx.active = on;
    const c = ctx.ctrl;
    try { if (c && c[on ? 'resume' : 'pause']) c[on ? 'resume' : 'pause'](); } catch (e) { /* ignore */ }
    if (on) { const now = performance.now(); ctx.timers.forEach((t) => { t.next = now + Math.min(t.ms, 500); }); }
  }
  function destroyCtx(ctx) {
    if (!ctx) return;
    try { if (ctx.ctrl && ctx.ctrl.destroy) ctx.ctrl.destroy(); } catch (e) { /* ignore */ }
    ctx.fns = []; ctx.timers = []; ctx.active = false;
    if (S) S.ctxs.delete(ctx);
  }
  function makePreview(ch, el, large) {
    const ctx = makeCtx(large);
    try { ctx.ctrl = ch.preview(el, ctx) || null; } catch (e) { console.error('[Aerium] channel preview failed', ch.id, e); }
    return ctx;
  }

  // ============================================================ session
  function open() {
    if (S) return;
    const root = h('div.ch-root', { 'data-theme': 'technozen', role: 'application', 'aria-label': 'Channels', tabIndex: -1, style: { zIndex: String(Z_INDEX), '--ch-cursor': CURSOR } });
    S = { root, screen: 'notice', page: 0, ctxs: new Set(), tiles: [], pageEls: [], zoom: null, shop: null, board: null, busy: false, closing: false, raf: 0, last: 0, clockAt: 0, offs: [] };
    buildNotice();
    buildMenu();
    document.body.appendChild(root);
    layout();
    S.tiles.forEach((t) => { t.ctx = makePreview(t.ch, t.screen, false); setActive(t.ctx, false); });
    S.menu.classList.add('ch-off');
    S.menu.inert = true;
    root.focus({ preventScroll: true });
    try { A.ui.closeMenus(); } catch (e) { /* ignore */ }
    try { if (A.startmenu && A.startmenu.close) A.startmenu.close(); } catch (e) { /* ignore */ }
    try { A.theme.pause(); } catch (e) { /* ignore */ }
    A.bus.emit('channels:open');
    music('channels');

    const onKey = (e) => keydown(e);
    const onKeyUp = (e) => { if (e.key === 'Meta' || e.key === 'OS') e.stopPropagation(); };
    const onResize = A.util.debounce(() => { if (S) layout(); }, 60);
    const onVis = () => {
      if (!S) return;
      S.root.classList.toggle('ch-hidden', document.hidden);
      if (document.hidden) { cancelAnimationFrame(S.raf); S.raf = 0; } else startLoop();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    S.offs.push(() => window.removeEventListener('keydown', onKey, true), () => window.removeEventListener('keyup', onKeyUp, true),
      () => window.removeEventListener('resize', onResize), () => document.removeEventListener('visibilitychange', onVis));
    requestAnimationFrame(() => root.classList.add('ch-in'));
    drawClock();
    startLoop();
  }

  function buildNotice() {
    const el = h('div.ch-notice', null,
      h('div.ch-notice-card', null,
        node(NOTICE_ICON),
        h('div.ch-notice-title', null, 'Health and comfort'),
        h('div.ch-notice-rule'),
        h('p.ch-notice-text', null, 'Take a break every now and then. Stretch, drink some water, feed the fish.'),
        h('p.ch-notice-small', null, 'Sit a comfy distance from the screen and remember to blink. Your eyes will thank you.')),
      h('div.ch-notice-press', null, 'Press anywhere to continue.'));
    el.addEventListener('pointerdown', (e) => { if (e.button === 0) enterMenu(); });
    S.notice = el;
    S.root.appendChild(el);
  }

  function enterMenu() {
    if (!S || S.screen !== 'notice') return;
    S.screen = 'menu';
    sfx('select');
    S.notice.classList.add('out');
    const n = S.notice;
    setTimeout(() => n.remove(), 650);
    S.menu.classList.remove('ch-off');
    S.menu.classList.add('show', 'enter');
    activatePages();
    setTimeout(() => { if (S) S.menu.classList.remove('enter'); }, 1500);
    ensureMusic('channels');
  }

  function buildMenu() {
    const pages = h('div.ch-pages');
    for (let p = 0; p < PAGES; p++) {
      const page = h('div.ch-page', { dataset: { page: String(p) } });
      for (let i = 0; i < PER_PAGE; i++) {
        const ch = CHANNELS[p * PER_PAGE + i];
        page.appendChild(ch ? tile(ch, i, p) : h('div.ch-tile.ch-empty', { style: { '--i': String(i) }, 'aria-hidden': 'true' }, h('div.ch-screen'), h('span.ch-glass')));
      }
      pages.appendChild(page);
      S.pageEls.push(page);
    }
    S.arrowL = h('button.ch-arrow.l', { type: 'button', 'aria-label': 'Previous page', 'data-tip': 'Previous page', onclick: () => flip(-1) }, node(ARROW_SVG(-1)));
    S.arrowR = h('button.ch-arrow.r', { type: 'button', 'aria-label': 'Next page', 'data-tip': 'Next page', onclick: () => flip(1) }, node(ARROW_SVG(1)));
    [S.arrowL, S.arrowR].forEach((b) => b.addEventListener('pointerenter', () => sfx('hover')));
    S.menu = h('div.ch-menu', null,
      h('div.ch-stripes', { style: { backgroundImage: `url("${A.asset('textures/pinstripe-light')}")` } }),
      h('div.ch-menu-inner', null, pages, S.arrowL, S.arrowR),
      buildBar());
    S.root.appendChild(S.menu);
    updatePages(false);
  }

  function tile(ch, i, page) {
    const screen = h('div.ch-screen');
    const el = h('button.ch-tile', { type: 'button', style: { '--i': String(i) }, 'aria-label': ch.title, dataset: { ch: ch.id } },
      screen, h('span.ch-glass'), h('span.ch-label', null, ch.title));
    const t = { ch, el, screen, page, ctx: null };
    el.addEventListener('pointerenter', () => { if (S && S.screen === 'menu' && !S.busy) sfx('hover'); });
    el.addEventListener('click', () => zoomIn(t));
    S.tiles.push(t);
    return el;
  }

  function updatePages(animate) {
    S.pageEls.forEach((pg, i) => {
      pg.style.transition = animate ? '' : 'none';
      pg.style.transform = `translateX(${(i - S.page) * 100}%)`;
    });
    S.arrowL.classList.toggle('gone', S.page === 0);
    S.arrowR.classList.toggle('gone', S.page >= PAGES - 1);
    S.arrowL.disabled = S.page === 0;
    S.arrowR.disabled = S.page >= PAGES - 1;
  }
  // Only the page on screen animates.
  function activatePages(also) {
    const menuOn = S.screen === 'menu';
    S.menu.inert = !menuOn; // nothing behind a zoomed channel, the shop or the board can take focus
    S.pageEls.forEach((pg, i) => {
      const on = menuOn && (i === S.page || i === also);
      pg.classList.toggle('ch-off', !on);
      pg.inert = !(menuOn && i === S.page);
    });
    S.tiles.forEach((t) => setActive(t.ctx, menuOn && (t.page === S.page || t.page === also)));
  }
  function flip(dir) {
    if (!S || S.screen !== 'menu' || S.busy) return;
    const next = clamp(S.page + dir, 0, PAGES - 1);
    if (next === S.page) return;
    const prev = S.page;
    S.page = next;
    activatePages(prev);
    updatePages(true);
    sfx('whooshOut', { minGap: 10 });
    clearTimeout(S.flipT);
    S.flipT = setTimeout(() => { if (S && S.screen === 'menu') activatePages(); }, 700);
  }

  function buildBar() {
    S.barSvg = node(`<svg class="ch-bar-svg" aria-hidden="true"><defs>
      <linearGradient id="chbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f9fa"/><stop offset=".45" stop-color="#e9edf0"/><stop offset="1" stop-color="#cfd6dc"/></linearGradient>
      <linearGradient id="chedge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8fd8ff"/><stop offset=".5" stop-color="#bfeaff"/><stop offset="1" stop-color="#8fd8ff"/></linearGradient></defs>
      <path class="ch-bar-shape" fill="url(#chbar)"/><path class="ch-bar-edge" fill="none" stroke="url(#chedge)" stroke-width="3"/><path class="ch-bar-hi" fill="none" stroke="#fff" stroke-width="1.5" transform="translate(0 2.5)"/></svg>`);
    S.hh = h('span.ch-hh');
    S.mm = h('span.ch-mm');
    S.ampm = h('span.ch-ampm');
    S.clock = h('div.ch-clock.t-zen-clock', { role: 'timer', 'aria-live': 'off' }, S.hh, h('span.ch-colon', null, ':'), S.mm, S.ampm);
    S.date = h('div.ch-date');
    const home = h('button.ch-round.ch-home', { type: 'button', 'aria-label': 'Back to the desktop', 'data-tip': 'Back to the desktop', onclick: () => close() }, h('span', null, 'Aerium'));
    S.mail = h('button.ch-round.ch-mail', { type: 'button', 'aria-label': 'Message board', 'data-tip': 'Message board', onclick: openBoard }, node(ENVELOPE_SVG), h('span.ch-mail-light'));
    [home, S.mail].forEach((b) => b.addEventListener('pointerenter', () => sfx('hover')));
    updateMail();
    return h('div.ch-bar', null, S.barSvg, h('div.ch-bar-center', null, S.clock, S.date), home, S.mail);
  }

  function layout() {
    const W = window.innerWidth, H = window.innerHeight;
    const bar = clamp(Math.round(H * 0.2), 112, 168);
    const top = clamp(Math.round(H * 0.07), 22, 70);
    const side = clamp(Math.round(W * 0.075), 56, 124);
    const gap = clamp(Math.round(Math.min(W, H * 1.6) * 0.017), 10, 26);
    const availW = W - side * 2, availH = H - bar - top - clamp(Math.round(H * 0.03), 10, 30);
    let tw = (availW - gap * 3) / 4, th = tw / 1.5;
    if (th * 3 + gap * 2 > availH) { th = (availH - gap * 2) / 3; tw = th * 1.5; }
    const st = S.root.style;
    st.setProperty('--ch-tw', Math.floor(tw) + 'px');
    st.setProperty('--ch-th', Math.floor(th) + 'px');
    st.setProperty('--ch-gap', gap + 'px');
    st.setProperty('--ch-top', top + 'px');
    st.setProperty('--ch-bar', bar + 'px');
    st.setProperty('--ch-side', side + 'px');
    st.setProperty('--ch-grid-h', Math.floor(th * 3 + gap * 2) + 'px');
    drawBar(W, bar);
  }

  // The curved bottom bar: raised bays around the two round buttons, a low flat middle for the clock.
  function drawBar(W, bh) {
    const rr = Math.round(bh * 0.29), cx = Math.round(bh * 0.68), cy = Math.round(bh * 0.57);
    const R = rr + Math.round(bh * 0.075), mid = Math.round(bh * 0.44), dip = Math.round(bh * 0.04);
    const f = (v) => Math.round(v * 10) / 10;
    const topY = cy - R, x1 = cx + R * 1.25, x2 = cx + R * 2.15;
    const edge = `M0 ${f(cy - R * 0.35)}C0 ${f(cy - R * 0.95)} ${f(cx - R * 0.85)} ${topY} ${cx} ${topY}`
      + `C${f(cx + R * 0.62)} ${topY} ${f(cx + R * 0.98)} ${f(cy - R * 0.62)} ${f(x1)} ${mid - dip}`
      + `C${f(cx + R * 1.45)} ${mid + 1} ${f(cx + R * 1.72)} ${mid} ${f(x2)} ${mid}`
      + `L${f(W - x2)} ${mid}C${f(W - cx - R * 1.72)} ${mid} ${f(W - cx - R * 1.45)} ${mid + 1} ${f(W - x1)} ${mid - dip}`
      + `C${f(W - cx - R * 0.98)} ${f(cy - R * 0.62)} ${f(W - cx - R * 0.62)} ${topY} ${W - cx} ${topY}`
      + `C${f(W - cx + R * 0.85)} ${topY} ${W} ${f(cy - R * 0.95)} ${W} ${f(cy - R * 0.35)}`;
    S.barSvg.setAttribute('viewBox', `0 0 ${W} ${bh}`);
    S.barSvg.querySelector('.ch-bar-shape').setAttribute('d', edge + `L${W} ${bh}L0 ${bh}Z`);
    S.barSvg.querySelector('.ch-bar-edge').setAttribute('d', edge);
    S.barSvg.querySelector('.ch-bar-hi').setAttribute('d', edge);
    const st = S.root.style;
    st.setProperty('--ch-rd', rr * 2 + 'px');
    st.setProperty('--ch-rx', cx + 'px');
    st.setProperty('--ch-ry', cy + 'px');
    st.setProperty('--ch-mid', mid + 'px');
  }

  function drawClock() {
    if (!S) return;
    const d = new Date();
    const hr = d.getHours() % 12 || 12;
    S.hh.textContent = String(hr);
    S.mm.textContent = A.util.pad2(d.getMinutes());
    S.ampm.textContent = d.getHours() < 12 ? 'AM' : 'PM';
    S.date.textContent = A.util.DAYS[d.getDay()].slice(0, 3) + ' ' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  function startLoop() { if (S && !S.raf && !document.hidden) S.raf = requestAnimationFrame(frame); }
  function frame(now) {
    if (!S) return;
    S.raf = requestAnimationFrame(frame);
    if (now - S.last < 30) return;
    S.last = now;
    if (now - S.clockAt > 1000) { S.clockAt = now; drawClock(); }
    for (const c of S.ctxs) {
      if (!c.active) continue;
      for (const fn of c.fns) { try { fn(now); } catch (e) { console.error('[Aerium] channel loop failed', e); c.fns = []; break; } }
      for (const t of c.timers) {
        if (now < t.next) continue;
        t.next = now + t.ms;
        try { t.fn(now); } catch (e) { console.error('[Aerium] channel timer failed', e); t.ms = 1e9; }
      }
    }
  }

  function keydown(e) {
    if (!S || S.closing) return;
    const k = e.key;
    let handled = true;
    if (S.screen === 'notice') {
      if (k === 'Escape') close();
      else if (!['Shift', 'Control', 'Alt', 'Meta', 'OS', 'Tab'].includes(k)) enterMenu();
      else handled = k !== 'Tab';
    } else if (k === 'Escape') back();
    else if (S.screen === 'menu' && /^Arrow/.test(k)) navigate(k);
    else if (S.screen === 'menu' && (k === 'PageDown' || k === 'PageUp')) flip(k === 'PageDown' ? 1 : -1);
    else handled = false;
    if (handled || k === 'Meta' || k === 'OS' || (e.ctrlKey && k === 'Escape')) { e.preventDefault(); e.stopPropagation(); }
  }
  function back() {
    if (S.busy) return;
    if (S.screen === 'zoom') zoomOut();
    else if (S.screen === 'shop') { if (S.shop && S.shop.modalOpen()) S.shop.closeModal(); else leaveShop(); }
    else if (S.screen === 'board') { if (S.board && S.board.letterOpen()) S.board.closeLetter(); else closeBoard(); }
    else close();
  }
  // Arrow keys move between tiles, and past the edge to the next page.
  function navigate(k) {
    const pageTiles = Array.from(S.pageEls[S.page].children);
    const cur = pageTiles.indexOf(document.activeElement);
    if (cur < 0) {
      if (k === 'ArrowRight' && S.page < PAGES - 1 && document.activeElement === S.root) { flip(1); return; }
      if (k === 'ArrowLeft' && S.page > 0 && document.activeElement === S.root) { flip(-1); return; }
      const first = pageTiles.find((el) => !el.classList.contains('ch-empty'));
      if (first) first.focus({ preventScroll: true });
      return;
    }
    const col = cur % 4, row = Math.floor(cur / 4);
    let target = cur;
    if (k === 'ArrowLeft') {
      if (col === 0) { if (S.page > 0) { flip(-1); focusTile(S.page, row * 4 + 3); } return; }
      target = cur - 1;
    } else if (k === 'ArrowRight') {
      if (col === 3) { if (S.page < PAGES - 1) { flip(1); focusTile(S.page, row * 4); } return; }
      target = cur + 1;
    } else if (k === 'ArrowUp') target = row > 0 ? cur - 4 : cur;
    else if (k === 'ArrowDown') target = row < 2 ? cur + 4 : cur;
    focusTile(S.page, target);
  }
  function focusTile(page, idx) {
    const tiles = Array.from(S.pageEls[page].children);
    let el = tiles[idx];
    if (!el || el.classList.contains('ch-empty')) el = tiles.slice(0, idx + 1).reverse().find((t) => !t.classList.contains('ch-empty')) || tiles.find((t) => !t.classList.contains('ch-empty'));
    if (el) { el.focus({ preventScroll: true }); sfx('hover'); }
  }

  // ------------------------------------------------------------ zoom
  function insetFor(r) {
    const W = window.innerWidth, H = window.innerHeight;
    return `inset(${Math.round(r.top)}px ${Math.round(W - r.right)}px ${Math.round(H - r.bottom)}px ${Math.round(r.left)}px round 18px)`;
  }
  function xformFor(r) {
    const W = window.innerWidth, H = window.innerHeight;
    const s = Math.max(r.width / W, r.height / H);
    return `translate(${Math.round(r.left + r.width / 2 - W / 2)}px, ${Math.round(r.top + r.height / 2 - H / 2)}px) scale(${s.toFixed(4)})`;
  }
  const EASE_IN = 'cubic-bezier(.3,.7,.2,1)', EASE_OUT = 'cubic-bezier(.45,0,.25,1)';

  function zoomIn(t) {
    if (!S || S.screen !== 'menu' || S.busy) return;
    S.busy = true;
    S.screen = 'zoom';
    sfx('select');
    setTimeout(() => sfx('whooshIn'), 40);
    const r = t.el.getBoundingClientRect();
    const screen = h('div.ch-zoom-screen');
    const inner = h('div.ch-zoom-inner', null, screen);
    const startBtn = pill('Start', () => startChannel(), 'ch-pill-go');
    const menuBtn = pill('Menu', () => zoomOut());
    const layer = h('div.ch-zoom', { dataset: { ch: t.ch.id } }, inner,
      h('div.ch-banner', null, h('span', null, t.ch.title)),
      h('div.ch-zbar', null, menuBtn, startBtn));
    S.root.appendChild(layer);
    const z = { t, layer, inner, screen, startBtn, ctx: null };
    S.zoom = z;
    z.ctx = makePreview(t.ch, screen, true);
    S.root.classList.add('ch-zoomed');
    const opts = { duration: 520, easing: EASE_IN, fill: 'both' };
    const a1 = layer.animate([{ clipPath: insetFor(r) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], opts);
    const a2 = inner.animate([{ transform: xformFor(r) }, { transform: 'none' }], opts);
    a1.finished.then(() => {
      a1.cancel(); a2.cancel();
      if (!S || S.zoom !== z) return;
      layer.classList.add('ready');
      S.busy = false;
      activatePages();
      startBtn.focus({ preventScroll: true });
    }).catch(() => {});
  }

  function zoomOut() {
    const z = S && S.zoom;
    if (!z || S.busy) return;
    S.busy = true;
    z.layer.classList.remove('ready', 'notready');
    sfx('back');
    setTimeout(() => sfx('whooshOut'), 30);
    // Measure the tile where it will land, without the zoomed-menu transform.
    S.root.classList.add('ch-notrans');
    S.root.classList.remove('ch-zoomed');
    const r = z.t.el.getBoundingClientRect();
    S.root.classList.add('ch-zoomed');
    void S.root.offsetWidth;
    S.root.classList.remove('ch-notrans');
    S.root.classList.remove('ch-zoomed');
    S.screen = 'menu';
    activatePages();
    const opts = { duration: 440, easing: EASE_OUT, fill: 'both' };
    const a1 = z.layer.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }, { clipPath: insetFor(r), opacity: 1, offset: 0.86 }, { clipPath: insetFor(r), opacity: 0 }], opts);
    z.inner.animate([{ transform: 'none' }, { transform: xformFor(r) }], Object.assign({}, opts, { duration: 380 }));
    const done = () => {
      destroyCtx(z.ctx);
      z.layer.remove();
      if (S && S.zoom === z) { S.zoom = null; S.busy = false; z.t.el.focus({ preventScroll: true }); }
    };
    a1.finished.then(done).catch(done);
  }

  function startChannel() {
    const z = S && S.zoom;
    if (!z || S.busy) return;
    const ch = z.t.ch;
    sfx('select');
    const ctrl = z.ctx && z.ctx.ctrl;
    if (ch.action === 'shop') { openShop(); return; }
    if (ch.action === 'fortune') { if (ctrl && ctrl.crack) ctrl.crack(); return; }
    if (ch.action === 'bubbles') { if (ctrl && ctrl.play) { ctrl.play(); z.layer.classList.add('playing'); } return; }
    if (ch.action === 'gadget') {
      if (!(A.gadgets && A.gadgets.add)) { notReady(z); return; }
      close(() => A.gadgets.add(ch.gadget, { unique: true }), true);
      return;
    }
    if (!ch.app || !A.apps.get(ch.app)) { notReady(z); return; }
    close(() => A.apps.launch(ch.app, ch.args || {}), true);
  }

  // A friendly note when the app behind a channel is not installed yet.
  function notReady(z) {
    if (z.layer.querySelector('.ch-nr')) return;
    sfx('ding');
    const note = h('div.ch-nr', { role: 'alertdialog', 'aria-label': 'Channel not ready' },
      h('div.ch-nr-card', null,
        h('div.ch-nr-title', null, 'This channel is not quite ready yet.'),
        h('p', null, 'Please check back a little later.'),
        pill('OK', () => { note.classList.add('out'); setTimeout(() => note.remove(), 250); z.startBtn.focus({ preventScroll: true }); })));
    z.layer.appendChild(note);
    setTimeout(() => { const b = note.querySelector('.ch-pill'); if (b) b.focus({ preventScroll: true }); }, 60);
  }

  // ------------------------------------------------------------ shop
  const SHOP_ITEMS = [
    { id: 'bubbles', name: 'Extra bubbles', icon: 'icons/bubble', desc: 'A fresh batch of bubbles, ready to float.' },
    { id: 'goldfish', name: 'Goldfish friend', icon: 'icons/fish', desc: 'A cheerful new friend who is very good at swimming.' },
    { id: 'lime', name: 'Lime glass', icon: 'icons/personalize', desc: 'The glass color everybody picked. Your windows turn Lime right away.', lime: true },
    { id: 'clouds', name: 'Cloud pack', icon: 'icons/cloud', desc: 'Twelve fluffy clouds, picked by hand.' },
    { id: 'rainbow', name: 'Pocket rainbow', icon: 'icons/rainbow', desc: 'For rainy afternoons. Fits in any folder.' },
    { id: 'polish', name: 'Glass polish', icon: 'icons/star', desc: 'Makes every window a little shinier. Probably.' },
    { id: 'butterflies', name: 'Butterfly garden', icon: 'icons/butterfly', desc: 'Six gentle butterflies to keep you company.' },
    { id: 'sunshine', name: 'Extra sunshine', icon: 'icons/sun', desc: 'Guaranteed to brighten your whole week.' },
    { id: 'bossa', name: 'Bossa nova loop', icon: 'icons/music', desc: 'The tune you are hearing right now, yours to keep.' },
  ];

  function openShop() {
    if (!S || S.busy || S.shop) return;
    S.busy = true;
    S.screen = 'shop';
    sfx('whooshIn');
    const shop = buildShop();
    S.shop = shop;
    S.root.appendChild(shop.el);
    requestAnimationFrame(() => shop.el.classList.add('in'));
    setTimeout(() => {
      if (!S || S.shop !== shop) return;
      shop.el.classList.add('ready');
      if (S.zoom) setActive(S.zoom.ctx, false);
      music('shop');
      sfx('ding');
      S.busy = false;
      const b = shop.el.querySelector('.ch-shop-card .ch-pill');
      if (b) b.focus({ preventScroll: true });
    }, 1500);
  }

  function leaveShop() {
    if (!S || !S.shop || S.busy) return;
    S.busy = true;
    const shop = S.shop;
    S.shop = null;
    sfx('whooshOut');
    shop.el.classList.remove('in');
    music('channels');
    if (S.zoom) { const z = S.zoom; S.zoom = null; destroyCtx(z.ctx); z.layer.remove(); }
    S.root.classList.remove('ch-zoomed');
    S.screen = 'menu';
    activatePages();
    setTimeout(() => { shop.el.remove(); if (S) S.busy = false; }, 450);
  }

  function buildShop() {
    const owned = new Set(A.store.get('channels.owned', []) || []);
    const modal = h('div.ch-modal', { hidden: true });
    const grid = h('div.ch-shop-grid');
    const card = (it, i) => {
      const has = owned.has(it.id);
      const btn = pill(has ? 'Owned' : 'Buy', () => buy(it, el, btn), has ? 'ch-pill-done' : 'ch-pill-go');
      btn.disabled = has;
      const el = h('div.ch-shop-card', { class: has && 'owned', style: { '--i': String(i) } },
        h('div.ch-shop-icon', null, A.img(it.icon)),
        h('div.ch-shop-text', null, h('div.ch-shop-name', null, it.name), h('div.ch-shop-desc', null, it.desc)),
        h('div.ch-shop-row', null, h('span.ch-shop-price', null, '0 points'), btn));
      return el;
    };
    SHOP_ITEMS.forEach((it, i) => grid.appendChild(card(it, i)));
    const spinner = h('div.ch-dots', null, h('i'), h('i'), h('i'), h('i'), h('i'), h('i'), h('i'), h('i'));
    const el = h('div.ch-shop', { role: 'dialog', 'aria-label': 'Shop Channel' },
      h('div.ch-shop-connect', null, spinner, h('span', null, 'Connecting to the Shop Channel...')),
      h('div.ch-shop-page', null,
        h('header.ch-shop-head', null,
          h('div.ch-shop-logo', { html: bagSVG(uid()) }),
          h('div.ch-shop-hello', null, h('b', null, 'Welcome to the Shop Channel!'), h('span', null, 'Everything here is free today, and every day.')),
          h('div.ch-shop-points', null, h('span', null, 'Aerium Points'), h('b', null, '0'))),
        h('div.ch-shop-section', null, h('span', null, 'Popular items')),
        grid,
        h('div.ch-shop-foot', null, pill('Back', () => leaveShop()))),
      modal);

    let open = false;
    function showModal(content) {
      modal.replaceChildren(h('div.ch-modal-card', null, content));
      modal.hidden = false;
      open = true;
      requestAnimationFrame(() => modal.classList.add('on'));
      setTimeout(() => { const b = modal.querySelector('.ch-pill-go') || modal.querySelector('.ch-pill'); if (b) b.focus({ preventScroll: true }); }, 60);
    }
    function closeModal() {
      open = false;
      modal.classList.remove('on');
      setTimeout(() => { if (!open) modal.hidden = true; }, 220);
    }
    function buy(it, cardEl, btn) {
      if (owned.has(it.id)) return;
      showModal([
        h('div.ch-modal-icon', null, A.img(it.icon)),
        h('div.ch-modal-title', null, 'Buy ' + it.name + '?'),
        h('p', null, 'This costs 0 Aerium Points. You will have 0 points left, which is exactly what you started with.'),
        h('div.ch-modal-btns', null, pill('Not now', closeModal), pill('Buy', () => download(it, cardEl, btn), 'ch-pill-go')),
      ]);
    }
    function download(it, cardEl, btn) {
      const blocks = h('div.ch-blocks', null, Array.from({ length: 12 }, (_, i) => h('i', { style: { animationDelay: (i * 0.13).toFixed(2) + 's' } })));
      showModal([h('div.ch-modal-title', null, 'Downloading...'), blocks, h('p.ch-modal-small', null, 'Please keep the power on. This will only take a moment.')]);
      sfx('connect');
      setTimeout(() => {
        if (!S || S.shop !== api) return;
        owned.add(it.id);
        A.store.set('channels.owned', Array.from(owned));
        cardEl.classList.add('owned');
        btn.disabled = true;
        btn.classList.remove('ch-pill-go');
        btn.classList.add('ch-pill-done');
        btn.firstElementChild.textContent = 'Owned';
        let extra = '';
        if (it.lime) {
          try { A.theme.setGlass({ color: 'lime' }); extra = ' Your windows are Lime now.'; } catch (e) { /* ignore */ }
        }
        showModal([
          h('div.ch-modal-icon.win', null, A.img(it.icon), h('i.ch-spark.s1'), h('i.ch-spark.s2'), h('i.ch-spark.s3')),
          h('div.ch-modal-title', null, 'Thank you!'),
          h('p', null, it.name + ' is now yours.' + extra),
          h('div.ch-modal-btns', null, pill('OK', closeModal, 'ch-pill-go')),
        ]);
        sfx('coin');
      }, 1900);
    }
    const api = { el, modalOpen: () => open, closeModal };
    return api;
  }

  // ------------------------------------------------------------ message board
  const NOTES = [
    { id: 'welcome', from: 'Aerium', icon: 'icons/aerium', subject: 'Welcome to Channels!', text: 'Hello, and welcome! Each tile here is a little window into something fun. Point at one to wake it up, then click it to take a closer look. Press Start to jump in, or Menu to come back.\n\nMake yourself at home.' },
    { id: 'tip', from: 'Helpful Tips', icon: 'icons/lightbulb', subject: 'A little tip', text: 'You can flip between pages with the arrows at the sides of the screen, or with the arrow keys on your keyboard.\n\nPress Esc to go back, and the round Aerium button takes you home to your desktop.' },
    { id: 'fish', from: 'The Fish', icon: 'icons/fish', subject: 'blub', text: 'blub blub. thank you for the food yesterday. the flakes were very crunchy.\n\nwe built a new bubble tower in the corner of the tank. please come visit soon.\n\nlove,\nthe fish' },
  ];
  const readNotes = () => new Set(A.store.get('channels.read', []) || []);
  function updateMail() {
    if (!S || !S.mail) return;
    const read = readNotes();
    const unread = NOTES.filter((n) => !read.has(n.id)).length;
    S.mail.classList.toggle('unread', unread > 0);
    S.mail.setAttribute('aria-label', unread ? `Message board, ${unread} new` : 'Message board');
  }

  function openBoard() {
    if (!S || S.screen !== 'menu' || S.busy) return;
    S.busy = true;
    S.screen = 'board';
    sfx('select');
    setTimeout(() => sfx('whooshIn'), 40);
    const read = readNotes();
    const d = new Date();
    const letter = h('div.ch-letter', { hidden: true });
    let letterOpen = false;
    const list = h('div.ch-board-notes', null, NOTES.map((n, i) => {
      const card = h('button.ch-note-card', { type: 'button', class: !read.has(n.id) && 'unread', style: { '--i': String(i) }, 'aria-label': n.subject + ', from ' + n.from },
        h('span.ch-env', null, node(ENVELOPE_SVG)), A.img(n.icon, { class: 'ch-note-icon' }),
        h('b', null, n.from), h('span', null, n.subject), h('i.ch-note-new', null, 'New'));
      card.addEventListener('pointerenter', () => sfx('hover'));
      card.addEventListener('click', () => openLetter(n, card));
      return card;
    }));
    function openLetter(n, card) {
      sfx('select');
      letter.replaceChildren(h('div.ch-letter-paper', null,
        h('div.ch-letter-head', null, A.img(n.icon), h('div', null, h('b', null, n.subject), h('span', null, 'From ' + n.from))),
        h('div.ch-letter-body', null, n.text),
        h('div.ch-modal-btns', null, pill('Close', closeLetter, 'ch-pill-go'))));
      letter.hidden = false;
      letterOpen = true;
      requestAnimationFrame(() => letter.classList.add('on'));
      const r = readNotes();
      r.add(n.id);
      A.store.set('channels.read', Array.from(r));
      card.classList.remove('unread');
      updateMail();
      setTimeout(() => { const b = letter.querySelector('.ch-pill'); if (b) b.focus({ preventScroll: true }); }, 60);
    }
    function closeLetter() {
      letterOpen = false;
      letter.classList.remove('on');
      sfx('back');
      setTimeout(() => { if (!letterOpen) letter.hidden = true; }, 240);
    }
    const el = h('div.ch-board', { role: 'dialog', 'aria-label': 'Message board' },
      h('div.ch-board-page', null,
        h('div.ch-board-head', null, h('span.ch-board-day', null, A.util.DAYS[d.getDay()]), h('span.ch-board-date', null, A.util.MONTHS[d.getMonth()] + ' ' + d.getDate())),
        h('div.ch-board-sub', null, 'Message board'),
        list,
        h('div.ch-board-foot', null, pill('Back', () => closeBoard()))),
      letter);
    S.board = { el, letterOpen: () => letterOpen, closeLetter };
    S.root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => {
      if (!S || !S.board || S.board.el !== el) return;
      S.busy = false;
      activatePages();
      const first = el.querySelector('.ch-note-card');
      if (first) first.focus({ preventScroll: true });
    }, 420);
  }

  function closeBoard() {
    if (!S || !S.board || S.busy) return;
    const b = S.board;
    S.board = null;
    sfx('whooshOut');
    b.el.classList.remove('in');
    S.screen = 'menu';
    activatePages();
    setTimeout(() => b.el.remove(), 420);
    S.mail.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------ closing
  function close(then, launching) {
    if (!S || S.closing) return;
    const s = S;
    s.closing = true;
    musicStop();
    if (!launching) sfx('whooshOut');
    s.root.classList.add(launching ? 'ch-launch' : 'ch-out');
    if (launching) {
      setTimeout(() => { teardown(s); if (then) { try { then(); } catch (e) { console.error(e); } } }, 520);
    } else {
      setTimeout(() => { teardown(s); if (then) then(); }, 460);
    }
  }

  function teardown(s) {
    if (s.torn) return;
    s.torn = true;
    cancelAnimationFrame(s.raf);
    s.raf = 0;
    clearTimeout(s.flipT);
    Array.from(s.ctxs).forEach((c) => { try { if (c.ctrl && c.ctrl.destroy) c.ctrl.destroy(); } catch (e) { /* ignore */ } });
    s.ctxs.clear();
    s.offs.forEach((off) => off());
    s.root.remove();
    if (S === s) S = null;
    try { A.theme.resume(); } catch (e) { /* ignore */ }
    A.bus.emit('channels:close');
  }

  // Keep the desktop asleep behind Channels, and never outlive the session.
  A.bus.on('screensaver:stop', () => { if (S) { try { A.theme.pause(); } catch (e) { /* ignore */ } } });
  A.bus.on('shell:stop', () => { if (S) { musicStop(); teardown(S); } });

  A.apps.register({
    id: 'channels',
    name: 'Channels',
    icon: 'icons/channels',
    color: '#48d2dd',
    category: 'media',
    description: 'A calm home screen of living channels for photos, music, weather, news and a shop where everything is free.',
    keywords: ['channels', 'tv', 'home', 'menu', 'console', 'shop', 'relax', 'living room'],
    noWindow: true,
    launch() { open(); return null; },
  });
})();
