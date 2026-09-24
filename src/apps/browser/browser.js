/* Horizon: Aerium's web browser. Glass navigation bar with round Back and
   Forward orbs, glass tabs, favorites, pop-up blocker, a simulated connection
   (dial-up, DSL or broadband) and a whole pretend Web 2.0 internet that
   sites.js, sites2.js and sites3.js register into Aerium.web. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;
  const esc = A.util.escapeHTML;

  // Registry of the pretend web. sites.js normally creates it first.
  const W = A.web || (A.web = {
    sites: [], kit: {},
    register(def) { this.sites.push(def); return def; },
  });

  const DEFAULT_HOME = 'http://home.aerium.net/';
  const PROVIDERS = [
    { id: 'bubble', name: 'Bubble', url: 'http://www.bubblesearch.com/search?q=' },
    { id: 'aeropedia', name: 'Aeropedia', url: 'http://www.aeropedia.org/w/index.php?search=' },
    { id: 'tubeview', name: 'TubeView', url: 'http://www.tubeview.com/results?search_query=' },
    { id: 'skycast', name: 'SkyCast', url: 'http://www.skycast.com/forecast?city=' },
  ];
  const SPEEDS = {
    dialup: { label: 'Dial-up (56 Kbps)', wait: [1300, 2200], reveal: 1700, steps: 9 },
    dsl: { label: 'DSL (768 Kbps)', wait: [260, 560], reveal: 420, steps: 6 },
    broadband: { label: 'Broadband (T1 at the library)', wait: [60, 140], reveal: 150, steps: 3 },
  };
  const DEFAULTS = {
    home: DEFAULT_HOME, newTab: 'tabs', speed: 'dsl', sounds: true, transitions: true, popupBlocker: true, popupBar: true,
    friendlyErrors: true, smooth: false, zoom: 100, textSize: 'medium', provider: 'bubble', confirmCloseTabs: true,
    menuBar: false, linksBar: true, statusBar: true, offline: false,
  };
  const TEXT_SIZES = [['largest', 'Largest', 1.3], ['larger', 'Larger', 1.15], ['medium', 'Medium', 1], ['smaller', 'Smaller', 0.9], ['smallest', 'Smallest', 0.8]];
  const ZOOMS = [400, 200, 150, 125, 100, 75, 50];
  const DEFAULT_FAVORITES = [
    { title: 'Aerium Live', url: 'http://home.aerium.net/' },
    { title: 'Bubble Search', url: 'http://www.bubblesearch.com/' },
    { title: 'Aeropedia, the bubbly encyclopedia', url: 'http://www.aeropedia.org/wiki/Main_Page' },
    { title: 'SkyCast Weather', url: 'http://www.skycast.com/' },
    { title: 'MiniGames.com - Free online games!', url: 'http://www.minigames.com/' },
    { title: "Jake's Skate Zone", url: 'http://www.geoplace.com/~sk8rjake/' },
  ];
  const DEFAULT_LINKS = [
    { title: 'Aerium Live', url: 'http://home.aerium.net/' },
    { title: 'Bubble Search', url: 'http://www.bubblesearch.com/' },
    { title: 'TubeView', url: 'http://www.tubeview.com/' },
    { title: 'MySpot', url: 'http://www.myspot.com/' },
    { title: 'Aeropedia', url: 'http://www.aeropedia.org/wiki/Main_Page' },
    { title: 'Free Screensavers!!', url: 'http://www.free-screensavers-4u.com/' },
  ];

  // ------------------------------------------------------------ glyphs
  const G = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.2 12 L11.2 4.2 V8.8 H20.6 V15.2 H11.2 V19.8 Z" fill="#fff" stroke="#05305f" stroke-opacity=".6" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    fwd: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 12 L12.8 4.2 V8.8 H3.4 V15.2 H12.8 V19.8 Z" fill="#fff" stroke="#05305f" stroke-opacity=".6" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    caret: '<svg viewBox="0 0 8 5" aria-hidden="true"><path d="M0 0 H8 L4 5 Z" fill="currentColor"/></svg>',
    refresh: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12.6 6.2 A5 5 0 1 0 12.9 10.4" fill="none" stroke="#0f7f3a" stroke-width="3.2" stroke-linecap="round"/><path d="M12.6 6.2 A5 5 0 1 0 12.9 10.4" fill="none" stroke="#5fd36a" stroke-width="1.5" stroke-linecap="round"/><path d="M15.2 2.4 L14.6 8.1 L9.2 6.3 Z" fill="#1f9e3a" stroke="#0f6f2a" stroke-width=".8" stroke-linejoin="round"/></svg>',
    stop: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4 L12 12 M12 4 L4 12" stroke="#7a1a10" stroke-width="3.8" stroke-linecap="round"/><path d="M4 4 L12 12 M12 4 L4 12" stroke="#f0644c" stroke-width="2" stroke-linecap="round"/></svg>',
    go: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8 H11 M7.8 4.6 L11.3 8 L7.8 11.4" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.6" cy="6.6" r="4.3" fill="rgba(255,255,255,.35)" stroke="currentColor" stroke-width="2"/><path d="M9.8 9.8 L14 14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 V10.5 M1.5 6 H10.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    lock: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="#f2c233" stroke="#8a6200"/><path d="M5.2 7 V5.2 A2.8 2.8 0 0 1 10.8 5.2 V7" fill="none" stroke="#6b6b6b" stroke-width="1.6"/><rect x="4" y="8" width="8" height="2.5" rx="1" fill="#fff" opacity=".55"/></svg>',
    shield: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 L14 3.4 V8 C14 11.5 11.4 13.8 8 15 C4.6 13.8 2 11.5 2 8 V3.4 Z" fill="#3aa6f5" stroke="#0b3d73"/><path d="M8 2.2 L12.8 4.1 V7.5 C12.8 8 12.7 8.4 12.6 8.8 H3.4 C3.3 8.4 3.2 8 3.2 7.5 V4.1 Z" fill="#fff" opacity=".45"/></svg>',
    zoom: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="#fff" stroke="currentColor" stroke-width="1.6"/><path d="M4.4 6.5 H8.6 M6.5 4.4 V8.6" stroke="currentColor" stroke-width="1.4"/><path d="M10 10 L14 14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  };
  const glyph = (name, cls) => h('span.hz-g', { class: cls, html: G[name] });

  const BLANK_FAV = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M3.5 1.5 H10 L13 4.5 V14.5 H3.5 Z" fill="#fff" stroke="#6f8aa3"/><path d="M10 1.5 V4.5 H13" fill="#dfe9f3" stroke="#6f8aa3"/><path d="M5.5 7 H11 M5.5 9 H11 M5.5 11 H9" stroke="#b9c9d8"/></svg>');
  const ERROR_FAV = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M3.5 1.5 H10 L13 4.5 V14.5 H3.5 Z" fill="#fff" stroke="#6f8aa3"/><circle cx="10.5" cy="11" r="4" fill="#e0452c" stroke="#8a2412"/><path d="M8.8 9.3 L12.2 12.7 M12.2 9.3 L8.8 12.7" stroke="#fff" stroke-width="1.4"/></svg>');

  // ------------------------------------------------------------ settings & lists
  let S = loadSettings();
  function loadSettings() { return Object.assign({}, DEFAULTS, A.store.get('browser.settings', {}) || {}); }
  function saveSettings(patch) {
    Object.assign(S, patch);
    A.store.set('browser.settings', S);
  }
  A.bus.on('store:browser.settings', () => { S = loadSettings(); A.bus.emit('horizon:settings'); });

  const getFavorites = () => A.store.get('browser.favorites', null) || DEFAULT_FAVORITES.slice();
  const setFavorites = (list) => { A.store.set('browser.favorites', list); A.bus.emit('horizon:favorites'); };
  const getLinks = () => A.store.get('browser.links', null) || DEFAULT_LINKS.slice();
  const setLinks = (list) => { A.store.set('browser.links', list); A.bus.emit('horizon:favorites'); };
  const getHistory = () => A.store.get('browser.history', []) || [];
  function addHistory(url, title) {
    if (!url || /^about:/.test(url)) return;
    const list = getHistory();
    const prev = list.find((x) => x.url === url);
    const next = list.filter((x) => x.url !== url);
    next.unshift({ url, title: title || url, t: Date.now(), n: ((prev && prev.n) || 0) + 1 });
    A.store.set('browser.history', next.slice(0, 80));
  }

  // ------------------------------------------------------------ URLs and sites
  function findSite(host) {
    host = String(host || '').toLowerCase().replace(/\.$/, '');
    if (!host) return null;
    const match = (x) => W.sites.find((s) => [s.host].concat(s.aliases || []).some((hh) => String(hh).toLowerCase() === x));
    return match(host) || match(host.startsWith('www.') ? host.slice(4) : 'www.' + host) || null;
  }
  function siteId(site) { return site.id || String(site.host).replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-'); }
  function ensureCss(site) {
    if (!site || !site.css || site._cssOn) return;
    A.util.css(typeof site.css === 'function' ? site.css() : site.css, 'hz-site-' + siteId(site));
    site._cssOn = true;
  }
  function favSrc(f) {
    if (!f) return null;
    if (typeof f !== 'string') return null;
    if (f.startsWith('<svg')) {
      const svg = f.includes('xmlns') ? f : f.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    return A.asset(f);
  }
  function siteFavicon(site) {
    if (!site) return null;
    if (!site._fav) site._fav = favSrc(site.favicon) || A.asset('icons/globe');
    return site._fav;
  }
  function favForUrl(url) {
    try {
      const u = new URL(url);
      if (u.protocol === 'about:' || u.protocol === 'file:') return BLANK_FAV;
      return siteFavicon(findSite(u.hostname)) || BLANK_FAV;
    } catch (e) { return BLANK_FAV; }
  }
  function canon(str) {
    let u;
    try { u = new URL(str); } catch (e) { return null; }
    const site = findSite(u.hostname);
    if (site && u.hostname !== site.host) u.hostname = site.host;
    return u.href;
  }
  function searchHref(q, provider) {
    const p = PROVIDERS.find((x) => x.id === (provider || S.provider)) || PROVIDERS[0];
    return p.url + encodeURIComponent(q).replace(/%20/g, '+');
  }
  function fileHref(t) {
    let path = t.replace(/^file:\/*/i, '/');
    try { path = decodeURIComponent(path); } catch (e) { /* keep */ }
    return 'file://' + encodeURI(A.fs.normalize(path));
  }
  // Turns whatever was typed into a URL (or a special action object).
  function resolveInput(raw) {
    const t = String(raw == null ? '' : raw).trim();
    if (!t) return null;
    const lower = t.toLowerCase();
    if (lower.startsWith('about:')) return lower === 'about:' ? 'about:blank' : lower.replace(/\s+/g, '');
    if (/^(javascript|vbscript|data):/i.test(t)) return { kind: 'blocked', text: t };
    if (lower.startsWith('mailto:')) return { kind: 'mailto', to: t.slice(7) };
    if (lower.startsWith('file:')) return fileHref(t);
    if (t.startsWith('/') && A.fs.exists(t)) return fileHref(t);
    if (/^https?:\/\//i.test(t)) return canon(t);
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return { kind: 'protocol', text: t };
    if (!/\s/.test(t) && (/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/.test(t) || /^localhost(:\d+)?([/?#].*)?$/i.test(t))) return canon('http://' + t);
    return searchHref(t);
  }
  function resolveHref(href, base) {
    href = String(href || '');
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return /^https?:/i.test(href) ? (canon(href) || href) : href;
    if (!base || /^about:/.test(base)) { const r = resolveInput(href); return typeof r === 'string' ? r : href; }
    try { return canon(new URL(href, base).href) || href; } catch (e) { return href; }
  }
  function displayUrl(url) {
    if (!url) return '';
    if (/^file:/.test(url)) { try { return decodeURI(url); } catch (e) { return url; } }
    return url;
  }
  const REAL_TLD = /\.(com|net|org|edu|gov|io|co|uk|de|fr|jp|nl|es|it|ca|au|us|info|biz|tv|me|app|dev|ai|gg|fm|ly|xyz)$/i;
  const looksReal = (host) => !!host && REAL_TLD.test(host) && !findSite(host);
  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m || !n) return m + n;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function similarSite(host) {
    const bare = (x) => String(x).toLowerCase().replace(/^www\./, '');
    let best = null, bestD = 4;
    W.sites.forEach((s) => { const d = lev(bare(host), bare(s.host)); if (d < bestD) { bestD = d; best = s; } });
    return best;
  }
  function siteList() {
    return W.sites.filter((s) => !s.hidden).map((s) => ({ url: 'http://' + s.host + (s.homePath || '/'), title: s.title || s.host, site: s }));
  }

  // ------------------------------------------------------------ downloads (shared by all windows)
  function startDownload(o, parent) {
    const name = o.name || 'download.txt';
    const size = o.size || Math.max(1200, (o.content || '').length);
    const from = o.from || 'the Internet';
    const info = h('div.hz-dl', null,
      h('div.hz-dl-q', null, 'Do you want to save this file?'),
      h('div.hz-dl-file', null, A.img(o.icon || 'icons/document', { class: 'hz-dl-icon' }),
        h('div.hz-dl-meta', null,
          h('div', null, h('span.hz-dl-k', null, 'Name:'), h('b', null, name)),
          h('div', null, h('span.hz-dl-k', null, 'Type:'), (o.type || 'Text Document') + ', ' + A.util.fmtBytes(size)),
          h('div', null, h('span.hz-dl-k', null, 'From:'), from))),
      h('div.hz-dl-warn', null, A.img('icons/shield', { class: 'hz-dl-shield' }),
        h('span', null, 'While files from the Internet can be useful, some files can potentially harm your computer. This one is a text file from the pretend web, so it is perfectly safe.')));
    return A.ui.dialog({
      title: 'File Download', icon: 'icons/download', content: info, parent, width: 440,
      buttons: [{ label: 'Save', default: true, value: 'save' }, { label: 'Cancel', cancel: true, value: null }],
    }).then((r) => {
      if (r !== 'save') return null;
      const bar = A.ui.progress({ value: 0 });
      const line = h('div.hz-dlp-line', null, 'Estimated time left: calculating...');
      const rate = h('div.hz-dlp-line', null, 'Transfer rate: -');
      const head = h('div.hz-dlp-head', null, h('div.hz-dlp-anim', null, A.img('icons/globe'), h('span.hz-dlp-dots', null, h('i'), h('i'), h('i')), A.img('icons/folder-downloads')), h('div', null, h('b', null, name), h('div', null, 'from ' + from)));
      const content = h('div.hz-dlp', null, head, bar, line, h('div.hz-dlp-line', null, 'Download to: /Downloads'), rate);
      let finished = false, savedPath = null;
      const speed = S.speed === 'dialup' ? 5.1 : S.speed === 'broadband' ? 180 : 42;
      const total = Math.min(6000, Math.max(900, (size / 1024 / speed) * 1000));
      return A.ui.dialog({
        title: '0% of ' + name + ' Completed', icon: 'icons/download', content, parent, width: 420,
        buttons: [{ label: 'Open', value: 'open', onClick: () => finished }, { label: 'Open Folder', value: 'folder', onClick: () => finished }, { label: 'Close', cancel: true, value: 'close' }],
        onOpen(dwin) {
          const t0 = performance.now();
          const tick = () => {
            if (dwin.closed) return;
            const p = Math.min(1, (performance.now() - t0) / total);
            bar.set(p * 100);
            const pct = Math.round(p * 100);
            dwin.setTitle(pct + '% of ' + name + ' Completed');
            line.textContent = p < 1 ? `Estimated time left: ${Math.max(1, Math.ceil((total * (1 - p)) / 1000))} sec (${A.util.fmtBytes(Math.round(size * p))} of ${A.util.fmtBytes(size)} copied)` : 'Download complete.';
            rate.textContent = 'Transfer rate: ' + (speed * (0.8 + Math.random() * 0.4)).toFixed(1) + ' KB/Sec';
            if (p < 1) { setTimeout(tick, 120); return; }
            finished = true;
            dwin.setTitle('Download complete');
            try {
              const fname = A.fs.uniqueName('/Downloads', name);
              savedPath = A.fs.write('/Downloads/' + fname, o.content || '', { mime: o.mime || 'text/plain' });
              A.notify({ title: 'Download complete', text: fname + ' was saved to your Downloads folder.', icon: 'icons/download', onClick: () => A.apps.openFile(savedPath) });
            } catch (e) {
              A.ui.messageBox({ parent, icon: 'error', title: 'File Download', message: 'The file could not be saved. ' + e.message });
            }
          };
          setTimeout(tick, 200);
        },
      }).then((res) => {
        if (!savedPath) return null;
        if (res === 'open') A.apps.openFile(savedPath);
        if (res === 'folder') A.apps.launch('explorer', { path: '/Downloads' });
        return savedPath;
      });
    });
  }

  // ------------------------------------------------------------ app
  A.apps.register({
    id: 'browser',
    name: 'Horizon Browser',
    shortName: 'Horizon',
    icon: 'icons/globe',
    color: '#2f9be8',
    category: 'internet',
    description: 'Browse the pretend Web 2.0 internet that lives inside Aerium.',
    keywords: ['internet', 'web', 'browser', 'horizon', 'www', 'surf', 'explorer'],
    fileTypes: ['htm', 'html', 'url'],
    window: { width: 1060, height: 720, minWidth: 460, minHeight: 320, glassBody: true },
    tasks: [
      { label: 'Open a new window', icon: 'icons/globe', onClick: () => A.apps.launch('browser') },
      { label: 'Bubble Search', icon: 'icons/search', onClick: () => A.apps.launch('browser', { url: 'http://www.bubblesearch.com/' }) },
      { label: 'TubeView', icon: 'icons/video', onClick: () => A.apps.launch('browser', { url: 'http://www.tubeview.com/' }) },
    ],
    launch(win, args) { return createBrowser(win, args || {}); },
  });

  function createBrowser(win, args) {
    const popup = args.popup || null;
    const tabs = [];
    const closedTabs = [];
    let active = null;
    let destroyed = false;
    let minimized = false;
    let addrEdited = false;
    let hover = null;
    let fullscreen = false;
    let dropState = null;
    const popupAllowOnce = new Set();

    // ---------------------------------------------------------- chrome
    const backBtn = h('button.hz-orb.hz-back', { type: 'button', 'aria-label': 'Back', 'data-tip': 'Back (Alt+Left)', onclick: () => active && goBack(active) }, glyph('back'));
    const fwdBtn = h('button.hz-orb.hz-fwd', { type: 'button', 'aria-label': 'Forward', 'data-tip': 'Forward (Alt+Right)', onclick: () => active && goForward(active) }, glyph('fwd'));
    const recentBtn = h('button.hz-recent', { type: 'button', 'aria-label': 'Recent pages', 'data-tip': 'Recent Pages', onclick: recentMenu }, glyph('caret'));
    [backBtn, fwdBtn].forEach((b) => b.addEventListener('contextmenu', (e) => { e.preventDefault(); recentMenu(); }));

    const addrFav = h('img.hz-addr-fav', { alt: '', src: BLANK_FAV });
    const addrEv = h('span.hz-addr-ev', { hidden: true });
    const addrInput = h('input.hz-addr-input', { type: 'text', spellcheck: false, autocomplete: 'off', 'aria-label': 'Address', placeholder: 'Type an address or search' });
    const addrLock = h('button.hz-addr-lock', { type: 'button', hidden: true, 'aria-label': 'Security report', 'data-tip': 'Security Report', onclick: securityReport }, glyph('lock'));
    const addrDrop = h('button.hz-addr-drop', { type: 'button', 'aria-label': 'Show address bar history', 'data-tip': 'Show Address Bar History', onclick: () => toggleDrop('history') }, glyph('caret'));
    const goBtn = h('button.hz-go', { type: 'button', 'aria-label': 'Go', 'data-tip': 'Go to the address', onclick: () => submitAddress() }, glyph('go'));
    const addr = h('div.hz-addr', null, addrFav, addrEv, addrInput, addrLock, addrDrop, goBtn);
    const refreshBtn = h('button.hz-nbtn.hz-refresh', { type: 'button', 'aria-label': 'Refresh', 'data-tip': 'Refresh (F5)', onclick: () => active && reload(active) }, glyph('refresh'));
    const stopBtn = h('button.hz-nbtn.hz-stop', { type: 'button', 'aria-label': 'Stop', 'data-tip': 'Stop (Esc)', onclick: () => active && stopLoading(active, false) }, glyph('stop'));
    const searchInput = h('input.hz-search-input', { type: 'text', spellcheck: false, autocomplete: 'off', 'aria-label': 'Search' });
    const searchGo = h('button.hz-search-go', { type: 'button', 'aria-label': 'Search', 'data-tip': 'Search', onclick: () => submitSearch() }, glyph('search'));
    const searchDrop = h('button.hz-search-drop', { type: 'button', 'aria-label': 'Search options', 'data-tip': 'Search Options', onclick: providerMenu }, glyph('caret'));
    const search = h('div.hz-search', null, searchInput, searchGo, searchDrop);
    const nav = h('div.hz-nav', null, h('div.hz-orbs', null, backBtn, fwdBtn, recentBtn), addr, refreshBtn, stopBtn, search);

    const tabStrip = h('div.hz-tabstrip', { role: 'tablist' });
    const newTabBtn = h('button.hz-newtab', { type: 'button', 'aria-label': 'New Tab', 'data-tip': 'New Tab (Ctrl+T)', onclick: () => openTab(null) }, glyph('plus'));
    const tabRow = h('div.hz-tabrow', null, tabStrip, newTabBtn);
    tabRow.addEventListener('dblclick', (e) => { if (e.target === tabRow || e.target === tabStrip) openTab(null); });

    const favBtn = h('button.hz-cmd.hz-favbtn', { type: 'button', 'data-tip': 'Favorites Center', onclick: (e) => favoritesMenu(e.currentTarget) }, A.img('icons/star', { class: 'hz-cmd-icon' }), h('span', null, 'Favorites'), glyph('caret', 'hz-cmd-caret'));
    const addFavBtn = h('button.hz-cmd.hz-addfav', { type: 'button', 'aria-label': 'Add to Favorites', 'data-tip': 'Add to Favorites (Ctrl+D)', onclick: () => addFavorite() }, A.img('icons/star', { class: 'hz-cmd-icon' }), h('span.hz-addfav-plus', null, glyph('plus')));
    const linksEl = h('div.hz-links');
    const homeBtn = h('button.hz-cmd', { type: 'button', 'data-tip': 'Home (Alt+Home)', onclick: () => active && navigate(active, S.home || DEFAULT_HOME) }, A.img('icons/home', { class: 'hz-cmd-icon' }), h('span.hz-cmd-label', null, 'Home'));
    const pageBtn = h('button.hz-cmd', { type: 'button', 'data-tip': 'Page', onclick: (e) => menuAt(e.currentTarget, pageItems()) }, A.img('icons/document', { class: 'hz-cmd-icon' }), h('span.hz-cmd-label', null, 'Page'), glyph('caret', 'hz-cmd-caret'));
    const toolsBtn = h('button.hz-cmd', { type: 'button', 'data-tip': 'Tools', onclick: (e) => menuAt(e.currentTarget, toolsItems()) }, A.img('icons/settings', { class: 'hz-cmd-icon' }), h('span.hz-cmd-label', null, 'Tools'), glyph('caret', 'hz-cmd-caret'));
    const helpBtn = h('button.hz-cmd', { type: 'button', 'aria-label': 'Help', 'data-tip': 'Help', onclick: (e) => menuAt(e.currentTarget, helpItems()) }, A.img('icons/help', { class: 'hz-cmd-icon' }), glyph('caret', 'hz-cmd-caret'));
    const linksBar = h('div.hz-linksbar', null, favBtn, addFavBtn, h('span.hz-vsep'), linksEl, h('div.hz-cmds', null, homeBtn, pageBtn, toolsBtn, helpBtn));

    const menuBar = A.ui.menubar([
      { label: 'File', items: () => fileItems() },
      { label: 'Edit', items: () => editItems() },
      { label: 'View', items: () => viewItems() },
      { label: 'Favorites', items: () => favoritesItems() },
      { label: 'Tools', items: () => toolsItems() },
      { label: 'Help', items: () => helpItems() },
    ], { className: 'hz-menubar' });

    const view = h('div.hz-view');
    const statusText = h('span.hz-status-text', null, 'Done');
    const statusIcon = h('img.hz-status-icon', { alt: '', src: BLANK_FAV });
    const statusProg = h('div.hz-status-prog', { hidden: true }, h('div.hz-status-fill'));
    const zoneCell = h('button.hz-status-cell.hz-zone', { type: 'button', 'data-tip': 'Security zone. Double-click for Internet Options.', ondblclick: () => internetOptions('security') }, A.img('icons/globe', { class: 'hz-zone-icon' }), h('span.hz-zone-text', null, 'Internet | Protected Mode: On'));
    const zoomLabel = h('span', null, '100%');
    const zoomCell = h('button.hz-status-cell.hz-zoomcell', { type: 'button', 'data-tip': 'Change zoom level', onclick: cycleZoom }, glyph('zoom'), zoomLabel);
    const zoomDrop = h('button.hz-status-cell.hz-zoomdrop', { type: 'button', 'aria-label': 'Zoom levels', onclick: (e) => menuAt(e.currentTarget, zoomItems(), true) }, glyph('caret'));
    const statusBar = h('div.hz-status', null, statusIcon, statusText, statusProg, zoneCell, zoomCell, zoomDrop);

    const client = h('div.hz-client', null, linksBar, view, statusBar);
    const drop = h('div.hz-drop', { hidden: true, role: 'listbox' });
    const root = h('div.hz', { class: popup ? 'hz-popup' : '' }, nav, menuBar, tabRow, client, drop);
    win.body.classList.add('hz-body');
    win.body.appendChild(root);
    if (popup) { addrInput.readOnly = true; win.resizeTo(popup.width || 460, popup.height || 380); win.center(); }

    applyToolbars();
    applyZoom();
    renderLinks();
    updateSearchPlaceholder();

    // ---------------------------------------------------------- tabs
    function createTab() {
      const tab = {
        id: A.util.uid('hzt'), hist: [], idx: -1, url: '', title: '', favicon: null, site: null,
        loading: false, rendered: true, loadingUrl: '', loadTimers: [], cleanups: [], showFns: [], hideFns: [], resizeFns: [],
        token: 0, statusText: 'Done', progress: null, secure: false, ev: null, zone: 'internet', awake: false, doc: null, internal: false,
      };
      tab.page = h('div.hz-page', { tabIndex: -1 });
      tab.curtain = h('div.hz-curtain');
      tab.infoSlot = h('div.hz-info-slot');
      tab.wrap = h('div.hz-pagewrap', null, tab.page, tab.curtain);
      tab.frame = h('div.hz-frame', { hidden: true }, tab.infoSlot, tab.wrap);
      bindPage(tab);
      const fav = h('img.hz-tab-fav', { alt: '', src: BLANK_FAV });
      const spin = h('span.hz-tab-spin', { hidden: true });
      const title = h('span.hz-tab-title', null, 'Blank Page');
      const close = h('button.hz-tab-close', { type: 'button', 'aria-label': 'Close Tab', 'data-tip': 'Close Tab (Ctrl+W)' }, glyph('close'));
      const el = h('div.hz-tab', { role: 'tab', 'aria-selected': 'false' }, fav, spin, title, close);
      el.addEventListener('pointerdown', (e) => {
        if (e.button === 1) { e.preventDefault(); return; }
        if (e.button === 0 && !e.target.closest('.hz-tab-close')) activate(tab);
      });
      el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab); } });
      close.addEventListener('click', (e) => { e.stopPropagation(); closeTab(tab); });
      A.ui.contextMenu(el, () => tabMenu(tab));
      Object.assign(tab, { el, elFav: fav, elSpin: spin, elTitle: title });
      return tab;
    }

    function openTab(url, o = {}) {
      if (popup && tabs.length) { A.apps.launch('browser', { url: url || undefined }); return null; }
      const tab = createTab();
      let idx = tabs.length;
      if (o.afterActive && active) {
        idx = tabs.indexOf(active) + 1;
        while (idx < tabs.length && tabs[idx].openerId === active.id) idx++;
        tab.openerId = active.id;
      }
      tabs.splice(idx, 0, tab);
      tabStrip.insertBefore(tab.el, tabStrip.children[idx] || null);
      view.appendChild(tab.frame);
      if (!o.background || !active) activate(tab);
      navigate(tab, url || newTabUrl(), { noSound: o.noSound });
      layoutTabs();
      return tab;
    }
    const newTabUrl = () => (S.newTab === 'home' ? S.home || DEFAULT_HOME : S.newTab === 'blank' ? 'about:blank' : 'about:tabs');

    function activate(tab) {
      if (!tab || active === tab) return;
      const prev = active;
      active = tab;
      tabs.forEach((t) => {
        const on = t === tab;
        t.el.classList.toggle('active', on);
        t.el.setAttribute('aria-selected', String(on));
        t.frame.hidden = !on;
      });
      hideDrop();
      if (prev) fireVisibility(prev, false);
      fireVisibility(tab, true);
      addrEdited = false;
      updateChrome();
    }

    function closeTab(tab) {
      if (tabs.length <= 1) { win.close(); return; }
      stopLoading(tab, true);
      runCleanups(tab);
      if (tab.url && tab.url !== 'about:tabs' && tab.url !== 'about:blank') closedTabs.push({ url: tab.url, title: tab.title });
      if (closedTabs.length > 10) closedTabs.shift();
      const i = tabs.indexOf(tab);
      tabs.splice(i, 1);
      tab.el.remove();
      tab.frame.remove();
      if (active === tab) { active = null; activate(tabs[Math.min(i, tabs.length - 1)]); }
      layoutTabs();
    }
    function closeOthers(keep) { tabs.slice().forEach((t) => t !== keep && closeTab(t)); }
    function reopenClosed() { const c = closedTabs.pop(); if (c) openTab(c.url); }
    function layoutTabs() { root.classList.toggle('hz-manytabs', tabs.length > 6); }

    function refreshTab(tab) {
      const title = tab.loading && !tab.rendered ? 'Connecting...' : tab.title || 'Blank Page';
      tab.elTitle.textContent = title;
      tab.el.setAttribute('data-tip', tab.title || tab.url || 'Blank Page');
      tab.elSpin.hidden = !tab.loading;
      tab.elFav.hidden = tab.loading;
      tab.elFav.src = tab.favicon || BLANK_FAV;
      if (tab === active) updateChrome();
    }

    function fireVisibility(tab, on) {
      (on ? tab.showFns : tab.hideFns).slice().forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    }
    function runCleanups(tab) {
      const list = tab.cleanups.splice(0);
      list.forEach((fn) => { try { fn(); } catch (e) { console.error('[Horizon] cleanup failed', e); } });
      tab.showFns = []; tab.hideFns = []; tab.resizeFns = [];
      tab.awake = false;
      clearInfoBar(tab);
    }

    // ---------------------------------------------------------- page events
    function linkFrom(tab, e) {
      const path = e.composedPath ? e.composedPath() : [];
      for (const n of path) {
        if (n === tab.page) break;
        if (n.nodeType === 1 && n.tagName === 'A' && (n.dataset.href != null || n.hasAttribute('href'))) return n;
      }
      return null;
    }
    const hrefOf = (a) => (a.dataset.href != null ? a.dataset.href : a.getAttribute('href') || '');

    function bindPage(tab) {
      const pg = tab.page;
      pg.addEventListener('click', (e) => {
        const a = linkFrom(tab, e);
        if (!a || e.defaultPrevented) return;
        e.preventDefault();
        followLink(tab, a, e);
      });
      pg.addEventListener('auxclick', (e) => {
        if (e.button !== 1) return;
        const a = linkFrom(tab, e);
        if (!a || e.defaultPrevented) return;
        e.preventDefault();
        followLink(tab, a, e);
      });
      pg.addEventListener('mousedown', (e) => { if (e.button === 1 && linkFrom(tab, e)) e.preventDefault(); });
      pg.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || A.util.isTyping(e)) return;
        const a = linkFrom(tab, e);
        if (a) { e.preventDefault(); a.click(); }
      });
      pg.addEventListener('mouseover', (e) => {
        if (tab !== active) return;
        const a = linkFrom(tab, e);
        if (!a) { setHover(null); return; }
        const href = hrefOf(a);
        setHover(!href || href === '#' || /^javascript:/i.test(href) ? '' : href[0] === '#' ? displayUrl(tab.url.split('#')[0] + href) : displayUrl(resolveHref(href, tab.url)));
      });
      pg.addEventListener('mouseleave', () => setHover(null));
      pg.addEventListener('submit', (e) => {
        if (e.defaultPrevented) return;
        e.preventDefault();
        const form = e.target;
        const action = form.getAttribute('action');
        if (action == null) return;
        let u;
        try { u = new URL(resolveHref(action || tab.url, tab.url)); } catch (err) { return; }
        u.search = '';
        u.hash = '';
        new FormData(form).forEach((v, k) => { if (typeof v === 'string') u.searchParams.append(k, v); });
        navigate(tab, u.href);
      });
      pg.addEventListener('contextmenu', (e) => {
        if (e.defaultPrevented || A.util.isTyping(e)) return;
        e.preventDefault();
        const a = linkFrom(tab, e);
        const img = !a && e.target.closest && e.target.closest('img');
        A.ui.menu(a ? linkMenu(tab, a) : img ? imageMenu(tab, img) : pageContextItems(tab), e.clientX, e.clientY);
      });
      pg.addEventListener('pointerdown', () => { hideDrop(); if (!pg.contains(document.activeElement)) setTimeout(() => { if (!pg.contains(document.activeElement)) pg.focus({ preventScroll: true }); }, 0); });
    }

    function followLink(tab, a, e) {
      const href = hrefOf(a);
      if (!href || href === '#' || /^javascript:/i.test(href)) return;
      if (href[0] === '#') { scrollToAnchor(tab, href.slice(1)); return; }
      const url = resolveHref(href, tab.url);
      if (e.shiftKey && !e.ctrlKey) { A.apps.launch('browser', { url }); return; }
      const modified = e.button === 1 || e.ctrlKey || e.metaKey;
      if (modified || a.target === '_blank') { openTab(url, { background: modified && !e.shiftKey, afterActive: true }); return; }
      navigate(tab, url);
    }

    function scrollToAnchor(tab, id) {
      if (!tab.doc) return;
      let target = null;
      try { target = tab.doc.querySelector('#' + CSS.escape(id) + ', a[name="' + id.replace(/"/g, '') + '"]'); } catch (e) { target = null; }
      if (target) {
        const top = target.getBoundingClientRect().top - tab.page.getBoundingClientRect().top + tab.page.scrollTop - 6;
        tab.page.scrollTo({ top, behavior: S.smooth ? 'smooth' : 'auto' });
      } else if (!id) tab.page.scrollTop = 0;
    }

    function setHover(text) {
      hover = text;
      showStatus();
    }

    // Anchors keep their address in data-href so the host browser's own
    // link bubble never pops up over Aerium; Horizon shows it in its status bar.
    function linkify(node) {
      if (!node || node.nodeType !== 1) return;
      const list = node.matches('a[href]') ? [node] : [];
      node.querySelectorAll('a[href]').forEach((a) => list.push(a));
      list.forEach((a) => {
        a.dataset.href = a.getAttribute('href');
        a.removeAttribute('href');
        if (!a.hasAttribute('tabindex')) a.setAttribute('tabindex', '0');
        a.setAttribute('role', 'link');
      });
    }

    // ---------------------------------------------------------- page context (the API sites get)
    function makeCtx(tab, u, rootEl, parent) {
      const token = tab.token;
      const alive = () => !destroyed && tab.token === token;
      const visible = () => alive() && tab === active && !minimized;
      let path = u.pathname || '/';
      try { path = decodeURIComponent(path); } catch (e) { /* keep */ }
      const ctx = {
        url: u.href, u, host: u.hostname, path, query: u.searchParams, hash: u.hash, root: rootEl, win, tabId: tab.id,
        parts: path.split('/').filter(Boolean),
        q: (k) => u.searchParams.get(k) || '',
        alive, visible,
        title(t) {
          if (parent || !alive()) return ctx;
          tab.title = String(t);
          if (tab.hist[tab.idx]) tab.hist[tab.idx].title = tab.title;
          refreshTab(tab);
          if (tab === active) updateWindowTitle();
          return ctx;
        },
        favicon(f) { if (!parent && alive()) { tab.favicon = favSrc(f) || tab.favicon; refreshTab(tab); } },
        html(str) { rootEl.innerHTML = str; linkify(rootEl); return rootEl; },
        $: (sel) => rootEl.querySelector(sel),
        $$: (sel) => Array.from(rootEl.querySelectorAll(sel)),
        resolve: (href) => resolveHref(href, u.href),
        go(href, o) {
          if (!alive()) return;
          const target = resolveHref(href, u.href);
          const run = () => { if (!alive()) return; if (o && o.newTab) openTab(target, { afterActive: true }); else navigate(tab, target, o || {}); };
          if (tab.rendering) setTimeout(run, 0);
          else run();
        },
        reload: () => alive() && reload(tab),
        back: () => alive() && goBack(tab),
        status(text) { if (alive()) setStatus(tab, text == null ? 'Done' : text, tab.progress); },
        notFound() { renderError(ctx, '404'); },
        after(ms, fn) { const id = setTimeout(() => { if (alive()) fn(); }, ms); tab.cleanups.push(() => clearTimeout(id)); return id; },
        every(ms, fn) { const id = setInterval(() => { if (alive()) fn(); }, ms); tab.cleanups.push(() => clearInterval(id)); return id; },
        loop(fn) {
          let raf = 0, last = 0, stopped = false;
          const tick = (now) => {
            if (stopped) return;
            raf = requestAnimationFrame(tick);
            if (!visible()) { last = 0; return; }
            const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
            last = now;
            try { fn(dt, now / 1000); } catch (e) { stopped = true; cancelAnimationFrame(raf); console.error('[Horizon] page animation failed', e); }
          };
          raf = requestAnimationFrame(tick);
          const stop = () => { stopped = true; cancelAnimationFrame(raf); };
          tab.cleanups.push(stop);
          return stop;
        },
        onUnload(fn) { tab.cleanups.push(fn); },
        onShow(fn) { tab.showFns.push(fn); },
        onHide(fn) { tab.hideFns.push(fn); },
        onResize(fn) { tab.resizeFns.push(fn); },
        store: {
          get: (k, d) => A.store.get('web.' + k, d),
          set: (k, v) => A.store.set('web.' + k, v),
        },
        user: () => ({ name: A.store.get('user.name') || 'Guest', avatar: A.store.get('user.avatar') || 'avatars/avatar-fish' }),
        dialog: (o) => A.ui.messageBox(Object.assign({ parent: win, title: 'Message from webpage', icon: 'info' }, o)),
        ask: (o) => A.ui.prompt(Object.assign({ parent: win, title: 'Horizon User Prompt' }, o)),
        popup: (href, o) => requestPopup(tab, resolveHref(href, u.href), o || {}),
        download: (o) => startDownload(Object.assign({ from: u.hostname }, o), win),
        sound(name, opts) { if (S.sounds) A.sound.play(name, opts); },
        soundsOn: () => !!S.sounds,
        audio() {
          if (!S.sounds || !A.sound.ctx || !A.sound.sfx) return null;
          if (ctx._audio) return ctx._audio;
          const g = A.sound.ctx.createGain();
          g.connect(A.sound.sfx);
          ctx._audio = g;
          tab.cleanups.push(() => { try { g.disconnect(); } catch (e) { /* ignore */ } });
          return g;
        },
        embed(href, el) {
          let eu;
          try { eu = new URL(resolveHref(href, u.href)); } catch (e) { return false; }
          const site = findSite(eu.hostname);
          if (!site) return false;
          ensureCss(site);
          const sub = makeCtx(tab, eu, el, ctx);
          try { site.render(sub); } catch (e) { console.error('[Horizon] embed failed', e); return false; }
          linkify(el);
          return true;
        },
        keepAwake(on) { if (alive()) tab.awake = !!on; },
        // Lifts an element out of the page into a layer that covers the page viewport.
        fullscreen(el, on) {
          if (!alive() || !el) return false;
          if (on && !el._hzPh) {
            const ph = document.createComment('hz-fullscreen');
            el.parentNode.insertBefore(ph, el);
            const layer = h('div.hz-fs-layer');
            layer.appendChild(el);
            tab.wrap.appendChild(layer);
            el._hzPh = ph; el._hzLayer = layer;
            const undo = () => { if (el._hzPh) ctx.fullscreen(el, false); };
            el._hzUndo = undo;
            tab.cleanups.push(() => { if (el._hzLayer) { el._hzLayer.remove(); el._hzPh = null; el._hzLayer = null; } });
          } else if (!on && el._hzPh) {
            if (el._hzPh.parentNode) el._hzPh.parentNode.insertBefore(el, el._hzPh);
            el._hzPh.remove();
            el._hzLayer.remove();
            el._hzPh = null; el._hzLayer = null;
          }
          return true;
        },
        focus() { tab.page.focus({ preventScroll: true }); },
        scrollTop() { tab.page.scrollTop = 0; },
        canvas(w, hh, cls) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const c = h('canvas', { class: cls, width: Math.round(w * dpr), height: Math.round(hh * dpr) });
          c.style.width = w + 'px';
          c.style.height = hh + 'px';
          const g = c.getContext('2d');
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          const res = {
            c, g, w, h: hh, dpr,
            resize(nw, nh) {
              if (nw === res.w && nh === res.h) return false;
              res.w = nw; res.h = nh;
              c.width = Math.round(nw * dpr); c.height = Math.round(nh * dpr);
              c.style.width = nw + 'px'; c.style.height = nh + 'px';
              g.setTransform(dpr, 0, 0, dpr, 0, 0);
              return true;
            },
          };
          return res;
        },
        speed: () => S.speed,
        setting: (k) => S[k],
        openApp(id, a) { if (A.apps.get(id)) { A.apps.launch(id, a || {}); return true; } return false; },
        esc,
      };
      return ctx;
    }

    // ---------------------------------------------------------- navigation
    function navigate(tab, input, o = {}) {
      if (!tab || destroyed) return;
      const r = resolveInput(input);
      if (!r) return;
      if (typeof r === 'object') { special(r); return; }
      if (tab.hist[tab.idx]) tab.hist[tab.idx].scroll = tab.page.scrollTop;
      if (o.replace && tab.idx >= 0) tab.hist[tab.idx] = { url: r, title: '', scroll: 0 };
      else {
        tab.hist.splice(tab.idx + 1);
        tab.hist.push({ url: r, title: '', scroll: 0 });
        if (tab.hist.length > 50) tab.hist.shift();
        tab.idx = tab.hist.length - 1;
      }
      load(tab, r, o);
    }
    function goBack(tab) { go(tab, -1); }
    function goForward(tab) { go(tab, 1); }
    function go(tab, delta) {
      const idx = tab.idx + delta;
      if (idx < 0 || idx >= tab.hist.length) return;
      if (tab.hist[tab.idx]) tab.hist[tab.idx].scroll = tab.page.scrollTop;
      tab.idx = idx;
      load(tab, tab.hist[idx].url, { fromHistory: true, restoreScroll: true });
    }
    function reload(tab) {
      const url = tab.loading ? tab.loadingUrl : tab.url;
      if (!url) return;
      if (tab.hist[tab.idx]) tab.hist[tab.idx].scroll = tab.page.scrollTop;
      load(tab, url, { restoreScroll: true, reload: true });
    }

    function special(r) {
      if (r.kind === 'mailto') {
        A.ui.messageBox({ parent: win, title: 'Horizon', icon: 'error', message: 'Could not perform this operation because the default mail client is not properly installed.', detail: 'Tip: your friends are on Bubble Messenger. It is much faster than e-mail anyway.' });
      } else if (r.kind === 'blocked') {
        A.ui.messageBox({ parent: win, title: 'Horizon', icon: 'shield', instruction: 'Horizon blocked this script', message: 'Horizon does not run scripts typed into the address bar. It is safer that way, and the pretend web does not need them.' });
      } else if (r.kind === 'protocol') {
        A.ui.messageBox({ parent: win, title: 'Horizon', icon: 'warning', instruction: 'Horizon cannot open this address', message: 'The protocol in "' + r.text.split(':')[0] + ':" is not supported. Try an address that starts with http://.' });
      }
    }

    function load(tab, url, o = {}) {
      stopLoading(tab, true);
      tab.loadId = (tab.loadId || 0) + 1;
      let u = null;
      try { u = new URL(url); } catch (e) { u = null; }
      const internal = !u || u.protocol === 'about:' || u.protocol === 'file:';
      const site = u && !internal ? findSite(u.hostname) : null;
      tab.loading = true;
      tab.rendered = false;
      tab.loadingUrl = url;
      if (!o.noSound) A.sound.play('navigate');
      if (tab === active) { addrEdited = false; hideDrop(); }
      clearInfoBar(tab);
      refreshTab(tab);
      if (internal || S.offline) {
        finishRender(tab, url, o);
        done(tab);
        return;
      }
      const sp = SPEEDS[S.speed] || SPEEDS.dsl;
      const weight = (site && site.weight) || 1;
      const wait = A.util.rand(sp.wait[0], sp.wait[1]) * weight * (o.fromHistory ? 0.45 : 1);
      const loadId = tab.loadId;
      const T = (ms, fn) => tab.loadTimers.push(setTimeout(() => { if (tab.loadId === loadId && !destroyed) fn(); }, ms));
      const host = u.hostname;
      setStatus(tab, (site ? 'Finding site: ' : 'Looking up ') + host + '...', 4);
      T(wait * 0.3, () => setStatus(tab, site ? 'Website found. Waiting for reply...' : 'Connecting to ' + host + '...', 16));
      T(wait * 0.62, () => { setStatus(tab, 'Opening page ' + url + '...', 32); if (site) showCurtain(tab); });
      T(wait, () => {
        finishRender(tab, url, o);
        if (tab.loadId !== loadId) return;
        if (!site || !S.transitions) { done(tab); return; }
        const dur = sp.reveal * weight;
        reveal(tab, dur, sp.steps);
        const items = 2 + Math.floor(Math.random() * 4);
        let n = items;
        const step = dur / (items + 1);
        const pics = site.pictures || ['images/logo.gif', 'images/spacer.gif', 'images/header_bg.jpg', 'images/button_glossy.png', 'images/reflection.png', 'images/bullet.gif'];
        const tick = () => {
          if (n <= 0) { done(tab); return; }
          setStatus(tab, `(${n} item${n > 1 ? 's' : ''} remaining) Downloading picture http://${host}/${pics[n % pics.length]}...`, 40 + ((items - n) / items) * 56);
          n--;
          T(step, tick);
        };
        tick();
      });
    }

    function done(tab) {
      tab.loadTimers.forEach(clearTimeout);
      tab.loadTimers = [];
      tab.loading = false;
      hideCurtain(tab);
      setStatus(tab, 'Done', null);
      refreshTab(tab);
    }

    function stopLoading(tab, silent) {
      if (!tab.loading) return;
      tab.loadTimers.forEach(clearTimeout);
      tab.loadTimers = [];
      tab.loading = false;
      hideCurtain(tab);
      if (!silent) {
        if (!tab.rendered) finishRender(tab, tab.loadingUrl, { canceled: true });
        setStatus(tab, 'Done', null);
      }
      refreshTab(tab);
    }

    function showCurtain(tab) { tab.curtain.style.animation = ''; tab.curtain.classList.add('show'); }
    function reveal(tab, dur, steps) {
      tab.curtain.classList.add('show');
      tab.curtain.style.animation = 'none';
      void tab.curtain.offsetWidth;
      tab.curtain.style.animation = `hz-curtain ${Math.round(dur)}ms steps(${steps}, end) forwards`;
    }
    function hideCurtain(tab) { tab.curtain.classList.remove('show'); tab.curtain.style.animation = ''; }

    function finishRender(tab, url, o = {}) {
      runCleanups(tab);
      tab.token++;
      tab.rendered = true;
      tab.url = url;
      tab.site = null;
      tab.title = '';
      tab.favicon = null;
      tab.secure = false;
      tab.ev = null;
      tab.zone = 'internet';
      tab.internal = false;
      const doc = h('div.hz-doc');
      tab.doc = doc;
      tab.page.replaceChildren(doc);
      tab.page.scrollTop = 0;
      tab.page.scrollLeft = 0;
      let u = null;
      try { u = new URL(url); } catch (e) { u = null; }
      const ctx = makeCtx(tab, u || new URL('about:blank'), doc);
      let site = null;
      try {
        if (o.canceled) renderError(ctx, 'canceled');
        else if (!u) renderError(ctx, 'dns');
        else if (u.protocol === 'about:') { tab.zone = 'computer'; tab.internal = true; renderAbout(ctx, tab); }
        else if (u.protocol === 'file:') { tab.zone = 'computer'; renderFile(ctx, tab); }
        else if (S.offline) renderError(ctx, 'offline');
        else if ((site = findSite(u.hostname))) {
          tab.site = site;
          ensureCss(site);
          doc.dataset.site = siteId(site);
          tab.rendering = true;
          try { site.render(ctx); } finally { tab.rendering = false; }
        } else renderError(ctx, 'dns');
      } catch (e) {
        console.error('[Horizon] page failed to render', url, e);
        runCleanups(tab);
        tab.token++;
        doc.replaceChildren();
        renderError(makeCtx(tab, u || new URL('about:blank'), doc), 'crash', e);
      }
      const mo = new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => linkify(n))));
      mo.observe(doc, { childList: true, subtree: true });
      tab.cleanups.push(() => mo.disconnect());
      linkify(doc);
      if (!tab.title) tab.title = site ? site.title || site.host : u && u.protocol !== 'about:' ? displayUrl(url) : 'Blank Page';
      if (!tab.favicon) tab.favicon = site ? siteFavicon(site) : BLANK_FAV;
      if (u && u.protocol === 'https:' && site) { tab.secure = true; tab.ev = site.ev || null; }
      if (tab.hist[tab.idx]) tab.hist[tab.idx].title = tab.title;
      if (o.restoreScroll && tab.hist[tab.idx]) tab.page.scrollTop = tab.hist[tab.idx].scroll || 0;
      if (u && u.hash && u.hash.length > 1 && !o.restoreScroll) setTimeout(() => scrollToAnchor(tab, decodeURIComponent(u.hash.slice(1))), 0);
      if (!tab.internal && !/^about:/.test(url)) addHistory(url, tab.title);
      refreshTab(tab);
      if (tab === active) fireVisibility(tab, true);
    }

    // ---------------------------------------------------------- chrome state
    function setStatus(tab, text, progress) {
      tab.statusText = text;
      tab.progress = progress == null ? null : progress;
      if (tab === active) showStatus();
    }
    function showStatus() {
      const tab = active;
      if (!tab) return;
      statusText.textContent = hover != null && hover !== '' ? hover : hover === '' ? '' : tab.statusText;
      statusIcon.src = tab.loading ? A.asset('icons/globe') : tab.favicon || BLANK_FAV;
      const p = tab.progress;
      statusProg.hidden = p == null;
      if (p != null) statusProg.firstChild.style.width = Math.max(3, Math.min(100, p)) + '%';
    }

    function updateWindowTitle() {
      if (!active) return;
      win.setTitle((active.loading && !active.rendered ? 'Connecting...' : active.title || 'Blank Page') + ' - Horizon');
    }

    function updateChrome() {
      const tab = active;
      if (!tab) return;
      backBtn.disabled = tab.idx <= 0;
      fwdBtn.disabled = tab.idx >= tab.hist.length - 1;
      recentBtn.disabled = tab.hist.length <= 1;
      const url = tab.loading ? tab.loadingUrl : tab.url;
      if (!addrEdited) addrInput.value = url === 'about:tabs' || url === 'about:blank' ? '' : displayUrl(url);
      addrFav.src = (tab.loading && !tab.rendered ? favForUrl(tab.loadingUrl) : tab.favicon) || BLANK_FAV;
      const secure = tab.secure && !tab.loading;
      addr.classList.toggle('hz-secure', secure);
      addr.classList.toggle('hz-ev', secure && !!tab.ev);
      addrLock.hidden = !secure;
      addrEv.hidden = !(secure && tab.ev);
      addrEv.textContent = tab.ev || '';
      stopBtn.disabled = !tab.loading;
      root.classList.toggle('hz-loading', tab.loading);
      const zone = tab.zone === 'computer' ? 'Computer | Protected Mode: Off' : 'Internet | Protected Mode: On';
      zoneCell.lastChild.textContent = zone;
      zoneCell.firstChild.src = A.asset(tab.zone === 'computer' ? 'icons/computer' : 'icons/globe');
      showStatus();
      updateWindowTitle();
    }

    function applyToolbars() {
      menuBar.hidden = !S.menuBar || !!popup;
      linksBar.hidden = !S.linksBar || !!popup;
      statusBar.hidden = !S.statusBar || fullscreen;
      root.classList.toggle('hz-full', fullscreen);
      view.classList.toggle('hz-smooth', !!S.smooth);
    }
    function applyZoom() {
      const z = S.zoom || 100;
      view.style.setProperty('--hz-zoom', String(z / 100));
      zoomLabel.textContent = z + '%';
      const ts = TEXT_SIZES.find((t) => t[0] === S.textSize) || TEXT_SIZES[2];
      view.style.setProperty('--hz-text', String(ts[2]));
    }
    function setZoom(z) { saveSettings({ zoom: Math.max(10, Math.min(1000, Math.round(z))) }); applyZoom(); }
    function cycleZoom() { const z = S.zoom || 100; setZoom(z < 125 ? 125 : z < 150 ? 150 : 100); }
    function zoomStep(dir) {
      const levels = ZOOMS.slice().sort((a, b) => a - b);
      const z = S.zoom || 100;
      const next = dir > 0 ? levels.find((l) => l > z) : levels.slice().reverse().find((l) => l < z);
      if (next) setZoom(next);
    }
    function updateSearchPlaceholder() {
      const p = PROVIDERS.find((x) => x.id === S.provider) || PROVIDERS[0];
      searchInput.placeholder = 'Search with ' + p.name;
    }

    function renderLinks() {
      linksEl.replaceChildren();
      getLinks().forEach((l) => {
        const b = h('button.hz-link', { type: 'button', 'data-tip': l.url, 'data-tip-title': l.title }, h('img', { src: favForUrl(l.url), alt: '' }), h('span', null, l.title));
        b.addEventListener('click', (e) => { if (!active) return; if (e.ctrlKey || e.metaKey) openTab(l.url, { background: true }); else navigate(active, l.url); });
        b.addEventListener('auxclick', (e) => { if (e.button === 1) openTab(l.url, { background: true }); });
        A.ui.contextMenu(b, () => [
          { label: 'Open', bold: true, onClick: () => active && navigate(active, l.url) },
          { label: 'Open in New Tab', onClick: () => openTab(l.url) },
          { label: 'Open in New Window', onClick: () => A.apps.launch('browser', { url: l.url }) },
          { separator: true },
          { label: 'Rename...', onClick: () => renameLink(l) },
          { label: 'Delete', onClick: () => setLinks(getLinks().filter((x) => x.url !== l.url || x.title !== l.title)) },
        ]);
        linksEl.appendChild(b);
      });
    }
    async function renameLink(l) {
      const name = await A.ui.prompt({ parent: win, title: 'Rename', message: 'Type a new name for this link:', value: l.title });
      if (!name) return;
      setLinks(getLinks().map((x) => (x.url === l.url && x.title === l.title ? { title: name, url: x.url } : x)));
    }

    const offs = [
      A.bus.on('horizon:favorites', renderLinks),
      A.bus.on('horizon:settings', () => { applyToolbars(); applyZoom(); updateSearchPlaceholder(); }),
    ];

    // ---------------------------------------------------------- address bar
    function submitAddress(value) {
      if (!active) return;
      const v = value != null ? value : addrInput.value;
      if (!v.trim()) return;
      hideDrop();
      addrEdited = false;
      navigate(active, v);
      active.page.focus({ preventScroll: true });
    }
    addrInput.addEventListener('focus', () => { setTimeout(() => addrInput.select(), 0); });
    addrInput.addEventListener('input', () => { addrEdited = true; root.classList.add('hz-typing'); showSuggestions(); });
    addrInput.addEventListener('blur', () => { root.classList.remove('hz-typing'); setTimeout(() => { if (document.activeElement !== addrInput && !(dropState && dropState.kind === 'history')) hideDrop(); }, 150); });
    addrInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const hot = dropState && dropState.items[dropState.hot];
        if (hot && dropState.hot >= 0) submitAddress(hot.url);
        else if (e.ctrlKey && !/[./:]/.test(addrInput.value)) submitAddress('www.' + addrInput.value.trim() + '.com');
        else submitAddress();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (dropState) hideDrop();
        else { addrEdited = false; updateChrome(); addrInput.select(); }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!dropState) { toggleDrop(addrInput.value && addrEdited ? 'suggest' : 'history'); return; }
        const n = dropState.items.length;
        if (!n) return;
        dropState.hot = e.key === 'ArrowDown' ? (dropState.hot + 1) % n : (dropState.hot - 1 + n) % n;
        paintDrop();
        addrInput.value = displayUrl(dropState.items[dropState.hot].url);
      }
    });

    function suggestionItems(text) {
      const t = text.trim().toLowerCase().replace(/^https?:\/\//, '');
      const seen = new Set();
      const out = [];
      const add = (url, title) => {
        if (seen.has(url)) return;
        const bare = url.toLowerCase().replace(/^https?:\/\//, '');
        if (t && !bare.includes(t) && !String(title).toLowerCase().includes(t)) return;
        seen.add(url);
        out.push({ url, title });
      };
      getHistory().forEach((x) => add(x.url, x.title));
      getFavorites().forEach((x) => add(x.url, x.title));
      siteList().forEach((x) => add(x.url, x.title));
      return out.slice(0, t ? 8 : 14);
    }
    function showSuggestions() {
      const v = addrInput.value;
      if (!v.trim()) { hideDrop(); return; }
      const items = suggestionItems(v);
      if (!items.length) { hideDrop(); return; }
      openDrop('suggest', items);
    }
    function toggleDrop(kind) {
      if (dropState && dropState.kind === kind) { hideDrop(); return; }
      const items = kind === 'history' ? suggestionItems('') : suggestionItems(addrInput.value);
      if (!items.length) return;
      openDrop(kind, items);
      if (kind === 'history') addrInput.focus();
    }
    function openDrop(kind, items) {
      dropState = { kind, items, hot: -1 };
      const r = addr.getBoundingClientRect(), rr = root.getBoundingClientRect();
      drop.style.left = r.left - rr.left + 'px';
      drop.style.top = r.bottom - rr.top + 1 + 'px';
      drop.style.width = r.width + 'px';
      drop.hidden = false;
      paintDrop();
    }
    function paintDrop() {
      if (!dropState) return;
      drop.replaceChildren();
      if (dropState.kind === 'history') drop.appendChild(h('div.hz-drop-head', null, 'History, favorites and websites'));
      dropState.items.forEach((it, i) => {
        const row = h('div.hz-drop-row', { class: i === dropState.hot ? 'hot' : '', role: 'option' },
          h('img', { src: favForUrl(it.url), alt: '' }),
          h('span.hz-drop-url', null, displayUrl(it.url)),
          h('span.hz-drop-title', null, it.title || ''));
        row.addEventListener('pointerdown', (e) => { e.preventDefault(); submitAddress(it.url); });
        row.addEventListener('pointerenter', () => { dropState.hot = i; drop.querySelectorAll('.hz-drop-row').forEach((x, j) => x.classList.toggle('hot', j === i)); });
        drop.appendChild(row);
      });
    }
    function hideDrop() { dropState = null; drop.hidden = true; }
    const outsideDrop = (e) => { if (dropState && !drop.contains(e.target) && !addr.contains(e.target)) hideDrop(); };
    document.addEventListener('pointerdown', outsideDrop, true);

    // ---------------------------------------------------------- search box
    function submitSearch() {
      const q = searchInput.value.trim();
      if (!q || !active) { searchInput.focus(); return; }
      navigate(active, searchHref(q));
    }
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (e.altKey) { const q = searchInput.value.trim(); if (q) openTab(searchHref(q)); } else submitSearch(); }
    });
    function providerMenu() {
      menuAt(searchDrop, [
        { header: 'Search providers' },
        ...PROVIDERS.map((p) => ({ label: p.name + (p.id === 'bubble' ? ' (Default)' : ''), checked: S.provider === p.id, radio: true, onClick: () => { saveSettings({ provider: p.id }); updateSearchPlaceholder(); } })),
        { separator: true },
        { label: 'Find on this Page...', shortcut: 'Ctrl+F', onClick: findOnPage },
        { label: 'Find More Providers...', onClick: () => A.ui.messageBox({ parent: win, title: 'Horizon', icon: 'info', instruction: 'No more providers found', message: 'The pretend web is small and cozy. These four search providers are all of them.' }) },
      ], true);
    }

    // ---------------------------------------------------------- menus
    function menuAt(el, items, alignRight) {
      const r = el.getBoundingClientRect();
      const m = A.ui.menu(items, r.left, r.bottom + 1);
      if (alignRight && m && m.el) { const w = m.el.offsetWidth; m.el.style.left = Math.max(4, r.right - w) + 'px'; }
      return m;
    }
    function recentMenu() {
      const tab = active;
      if (!tab || tab.hist.length <= 1) return;
      const lo = Math.max(0, tab.idx - 8), hi = Math.min(tab.hist.length, tab.idx + 9);
      const items = [];
      for (let i = hi - 1; i >= lo; i--) {
        const e = tab.hist[i];
        items.push({ label: e.title || displayUrl(e.url), icon: favForUrl(e.url), checked: i === tab.idx, radio: true, onClick: () => go(tab, i - tab.idx) });
      }
      items.push({ separator: true }, { label: 'History', shortcut: 'Ctrl+H', onClick: () => navigate(tab, 'about:history') });
      menuAt(recentBtn, items);
    }

    function favoritesItems() {
      const favs = getFavorites();
      return [
        { label: 'Add to Favorites...', shortcut: 'Ctrl+D', icon: 'icons/star', onClick: () => addFavorite() },
        { label: 'Add to Links Bar', onClick: () => addFavorite('links') },
        { label: 'Add Tab Group to Favorites...', disabled: tabs.length < 2, onClick: addTabGroup },
        { label: 'Organize Favorites...', onClick: organizeFavorites },
        { separator: true },
        { label: 'Links', icon: 'icons/folder', submenu: () => getLinks().map((l) => ({ label: l.title, icon: favForUrl(l.url), onClick: () => active && navigate(active, l.url) })) },
        ...favs.map((f) => ({ label: f.title, icon: favForUrl(f.url), onClick: () => active && navigate(active, f.url) })),
        { separator: true },
        { label: 'History', icon: 'icons/clock', submenu: () => { const hl = getHistory().slice(0, 15); return hl.length ? hl.map((x) => ({ label: x.title, icon: favForUrl(x.url), onClick: () => active && navigate(active, x.url) })) : [{ label: '(Empty)', disabled: true }]; } },
      ];
    }
    function favoritesMenu(anchor) { menuAt(anchor, favoritesItems()); }

    function zoomItems() {
      return [
        { label: 'Zoom In', shortcut: 'Ctrl +', onClick: () => zoomStep(1) },
        { label: 'Zoom Out', shortcut: 'Ctrl -', onClick: () => zoomStep(-1) },
        { separator: true },
        ...ZOOMS.map((z) => ({ label: z + '%', checked: (S.zoom || 100) === z, radio: true, onClick: () => setZoom(z) })),
        { label: 'Custom...', onClick: async () => { const v = await A.ui.prompt({ parent: win, title: 'Custom Zoom', message: 'Percentage zoom (10 - 1000):', value: String(S.zoom || 100) }); const n = parseInt(v, 10); if (n >= 10 && n <= 1000) setZoom(n); } },
      ];
    }
    function textSizeItems() {
      return TEXT_SIZES.map(([id, label]) => ({ label, checked: S.textSize === id, radio: true, onClick: () => { saveSettings({ textSize: id }); applyZoom(); } }));
    }
    function encodingItems() {
      const cur = A.store.get('browser.encoding', 'auto');
      return [['auto', 'Auto-Select'], ['western', 'Western European (ISO)'], ['utf8', 'Unicode (UTF-8)'], ['bubble', 'Bubble (Aerated)']].map(([id, label]) => ({
        label, checked: cur === id, radio: true,
        onClick: () => { A.store.set('browser.encoding', id); if (id === 'bubble') A.ui.messageBox({ parent: win, title: 'Encoding', icon: 'info', instruction: 'Page encoding set to Bubble (Aerated)', message: 'Every character on this page now contains 20% more air. You will not notice the difference, but the page does feel lighter.' }); },
      }));
    }

    function pageItems() {
      const tab = active;
      const isWeb = tab && tab.site;
      return [
        { label: 'New Tab', shortcut: 'Ctrl+T', onClick: () => openTab(null) },
        { label: 'New Window', shortcut: 'Ctrl+N', onClick: () => A.apps.launch('browser', { url: tab ? tab.url : undefined }) },
        { separator: true },
        { label: 'Save As...', disabled: !isWeb, onClick: savePageAs },
        { label: 'Send Shortcut to Desktop', disabled: !tab || !tab.url || tab.internal, onClick: sendToDesktop },
        { separator: true },
        { label: 'Zoom', submenu: zoomItems },
        { label: 'Text Size', submenu: textSizeItems },
        { label: 'Encoding', submenu: encodingItems },
        { separator: true },
        { label: 'View Source', shortcut: 'Ctrl+U', disabled: !tab || !tab.doc, onClick: viewSource },
        { label: 'Security Report', disabled: !tab || !tab.secure, onClick: securityReport },
        { label: 'Web Page Privacy Policy...', onClick: privacyReport },
        { label: 'Properties', onClick: pageProperties },
      ];
    }
    function toolsItems() {
      return [
        { label: 'Delete Browsing History...', onClick: deleteHistory },
        { separator: true },
        { label: 'Pop-up Blocker', submenu: () => [
          { label: S.popupBlocker ? 'Turn Off Pop-up Blocker' : 'Turn On Pop-up Blocker', onClick: () => saveSettings({ popupBlocker: !S.popupBlocker }) },
          { label: 'Pop-up Blocker Settings', onClick: () => internetOptions('privacy') },
        ] },
        { label: 'Bubble Filter', submenu: () => [
          { label: 'Check This Website', disabled: !active || !active.site, onClick: bubbleFilter },
          { label: 'Report Unsafe Website...', onClick: () => A.ui.messageBox({ parent: win, title: 'Bubble Filter', icon: 'shield', instruction: 'Thank you for keeping the web shiny', message: 'Your report has been sent to the Bubble Filter team, which is one very dedicated goldfish.' }) },
        ] },
        { label: 'Manage Add-ons', submenu: () => [{ label: 'Enable or Disable Add-ons...', onClick: manageAddons }] },
        { separator: true },
        { label: 'Work Offline', checked: !!S.offline, onClick: () => { saveSettings({ offline: !S.offline }); if (active) reload(active); } },
        { label: 'Full Screen', shortcut: 'F11', checked: fullscreen, onClick: toggleFullscreen },
        { label: 'Toolbars', submenu: () => [
          { label: 'Menu Bar', checked: !!S.menuBar, onClick: () => { saveSettings({ menuBar: !S.menuBar }); applyToolbars(); } },
          { label: 'Links Bar', checked: !!S.linksBar, onClick: () => { saveSettings({ linksBar: !S.linksBar }); applyToolbars(); } },
          { label: 'Status Bar', checked: !!S.statusBar, onClick: () => { saveSettings({ statusBar: !S.statusBar }); applyToolbars(); } },
        ] },
        { separator: true },
        { label: 'History', shortcut: 'Ctrl+H', onClick: () => active && navigate(active, 'about:history') },
        { label: 'Internet Options', icon: 'icons/settings', onClick: () => internetOptions() },
      ];
    }
    function helpItems() {
      return [
        { label: 'Horizon Help', shortcut: 'F1', onClick: () => { if (A.apps.get('help')) A.apps.launch('help', { topic: 'browser' }); else A.ui.messageBox({ parent: win, title: 'Horizon Help', icon: 'help', instruction: 'Getting around Horizon', message: 'Type an address or a search in the address bar and press Enter.\n\nCtrl+T opens a new tab, Ctrl+W closes it. Alt+Left goes back. Ctrl+D adds a favorite. F5 refreshes.\n\nEvery website here is pretend, so click everything.' }); } },
        { label: "What's New in Horizon", onClick: () => openTab('about:tabs') },
        { label: 'Online Support', onClick: () => openTab('http://support.aerium.net/') },
        { separator: true },
        { label: 'About Horizon', icon: 'icons/globe', onClick: about },
      ];
    }
    function fileItems() {
      return [
        { label: 'New Tab', shortcut: 'Ctrl+T', onClick: () => openTab(null) },
        { label: 'Duplicate Tab', disabled: !active, onClick: () => active && openTab(active.url, { afterActive: true }) },
        { label: 'New Window', shortcut: 'Ctrl+N', onClick: () => A.apps.launch('browser') },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: openFileDialog },
        { label: 'Save As...', disabled: !active || !active.site, onClick: savePageAs },
        { label: 'Close Tab', shortcut: 'Ctrl+W', onClick: () => active && closeTab(active) },
        { separator: true },
        { label: 'Send', submenu: [{ label: 'Shortcut to Desktop', onClick: sendToDesktop }] },
        { label: 'Properties', onClick: pageProperties },
        { separator: true },
        { label: 'Exit', onClick: () => win.close() },
      ];
    }
    function editItems() {
      return [
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => document.execCommand('copy') },
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: selectAll },
        { separator: true },
        { label: 'Find on this Page...', shortcut: 'Ctrl+F', onClick: findOnPage },
      ];
    }
    function viewItems() {
      return [
        { label: 'Toolbars', submenu: () => toolsItems().find((x) => x.label === 'Toolbars').submenu() },
        { label: 'Status Bar', checked: !!S.statusBar, onClick: () => { saveSettings({ statusBar: !S.statusBar }); applyToolbars(); } },
        { separator: true },
        { label: 'Stop', shortcut: 'Esc', disabled: !active || !active.loading, onClick: () => active && stopLoading(active, false) },
        { label: 'Refresh', shortcut: 'F5', onClick: () => active && reload(active) },
        { separator: true },
        { label: 'Zoom', submenu: zoomItems },
        { label: 'Text Size', submenu: textSizeItems },
        { label: 'Encoding', submenu: encodingItems },
        { label: 'Source', shortcut: 'Ctrl+U', onClick: viewSource },
        { label: 'Full Screen', shortcut: 'F11', onClick: toggleFullscreen },
      ];
    }

    function tabMenu(tab) {
      return [
        { label: 'Refresh', onClick: () => reload(tab) },
        { label: 'Refresh All', onClick: () => tabs.forEach(reload) },
        { separator: true },
        { label: 'New Tab', shortcut: 'Ctrl+T', onClick: () => openTab(null) },
        { label: 'Duplicate Tab', onClick: () => openTab(tab.url, { afterActive: true }) },
        { label: 'Reopen Closed Tab', disabled: !closedTabs.length, onClick: reopenClosed },
        { separator: true },
        { label: 'Close Tab', shortcut: 'Ctrl+W', onClick: () => closeTab(tab) },
        { label: 'Close Other Tabs', disabled: tabs.length < 2, onClick: () => closeOthers(tab) },
      ];
    }
    function linkMenu(tab, a) {
      const href = hrefOf(a);
      const url = href && href[0] !== '#' && !/^javascript:/i.test(href) ? resolveHref(href, tab.url) : null;
      return [
        { label: 'Open', bold: true, disabled: !url, onClick: () => navigate(tab, url) },
        { label: 'Open in New Tab', disabled: !url, onClick: () => openTab(url, { afterActive: true, background: true }) },
        { label: 'Open in New Window', disabled: !url, onClick: () => A.apps.launch('browser', { url }) },
        { separator: true },
        { label: 'Copy Shortcut', disabled: !url, onClick: () => copyText(url) },
        { label: 'Add to Favorites...', disabled: !url, onClick: () => addFavorite(null, { url, title: a.textContent.trim() || url }) },
        { separator: true },
        { label: 'Properties', onClick: () => A.ui.messageBox({ parent: win, title: 'Properties', icon: 'icons/globe', instruction: a.textContent.trim().slice(0, 60) || 'Shortcut', message: 'Protocol: HyperText Transfer Protocol\nType: Shortcut\nAddress (URL): ' + (url || '(none)'), sound: false }) },
      ];
    }
    function imageMenu(tab, img) {
      const key = img.dataset.asset;
      return [
        { label: 'Save Picture As...', disabled: !key, onClick: () => savePicture(key, img, false) },
        { label: 'Set as Background', disabled: !key, onClick: () => savePicture(key, img, true) },
        { label: 'Copy', onClick: () => document.execCommand('copy') },
        { separator: true },
        ...pageContextItems(tab),
      ];
    }
    function pageContextItems(tab) {
      return [
        { label: 'Back', disabled: tab.idx <= 0, onClick: () => goBack(tab) },
        { label: 'Forward', disabled: tab.idx >= tab.hist.length - 1, onClick: () => goForward(tab) },
        { separator: true },
        { label: 'Select All', onClick: selectAll },
        { separator: true },
        { label: 'Create Shortcut', disabled: !tab.url || tab.internal, onClick: sendToDesktop },
        { label: 'Add to Favorites...', onClick: () => addFavorite() },
        { label: 'View Source', onClick: viewSource },
        { separator: true },
        { label: 'Print...', onClick: printPage },
        { label: 'Refresh', onClick: () => reload(tab) },
        { separator: true },
        { label: 'Properties', onClick: pageProperties },
      ];
    }

    // ---------------------------------------------------------- favorites
    async function addFavorite(where, target) {
      const tab = active;
      const url = (target && target.url) || (tab && tab.url);
      if (!url || url === 'about:tabs' || url === 'about:blank') { A.ui.messageBox({ parent: win, title: 'Add a Favorite', icon: 'info', message: 'Open a webpage first, then add it to your favorites.' }); return; }
      const name = A.ui.textField({ label: 'Name:', value: (target && target.title) || (tab && tab.title) || url });
      const folder = A.ui.select({ options: [['favorites', 'Favorites'], ['links', 'Links']], value: where || 'favorites' });
      const content = h('div.hz-fav-dialog', null,
        h('div.hz-fav-top', null, A.img('icons/star', { class: 'hz-fav-star' }), h('div', null, h('div.hz-fav-title', null, 'Add a Favorite'), h('div.ae-muted', null, 'Add this webpage as a favorite. To access your favorites, open the Favorites Center.'))),
        name, h('label.hz-fav-row', null, h('span', null, 'Create in:'), folder));
      const r = await A.ui.dialog({ parent: win, title: 'Add a Favorite', icon: 'icons/star', content, width: 420, buttons: [{ label: 'Add', default: true, value: 'add' }, { label: 'Cancel', cancel: true, value: null }] });
      if (r !== 'add') return;
      const entry = { title: name.input.value.trim() || url, url };
      if (folder.value === 'links') setLinks(getLinks().concat([entry]));
      else setFavorites(getFavorites().concat([entry]));
      A.sound.play('ding');
      addFavBtn.classList.remove('hz-pulse'); void addFavBtn.offsetWidth; addFavBtn.classList.add('hz-pulse');
    }
    async function addTabGroup() {
      const name = await A.ui.prompt({ parent: win, title: 'Add Tab Group to Favorites', message: 'Your open tabs will be added to Favorites. Group name:', value: 'Tab group' });
      if (!name) return;
      setFavorites(getFavorites().concat(tabs.filter((t) => t.url && !t.internal).map((t) => ({ title: name + ': ' + (t.title || t.url), url: t.url }))));
      A.sound.play('ding');
    }
    function organizeFavorites() {
      let which = 'favorites';
      let orgWin = win;
      const list = h('div.hz-org-list', { tabIndex: 0 });
      let sel = -1;
      const data = () => (which === 'favorites' ? getFavorites() : getLinks());
      const save = (arr) => (which === 'favorites' ? setFavorites(arr) : setLinks(arr));
      function paint() {
        list.replaceChildren();
        const arr = data();
        if (!arr.length) list.appendChild(h('div.ae-muted.hz-org-empty', null, 'This folder is empty.'));
        arr.forEach((f, i) => {
          const row = h('div.ae-list-item.hz-org-row', { class: i === sel ? 'selected' : '' }, h('img', { src: favForUrl(f.url), alt: '' }), h('div.hz-org-text', null, h('div', null, f.title), h('div.ae-muted', null, f.url)));
          row.addEventListener('click', () => { sel = i; paint(); });
          row.addEventListener('dblclick', () => { if (active) navigate(active, f.url); });
          list.appendChild(row);
        });
      }
      const folderSel = A.ui.select({ options: [['favorites', 'Favorites'], ['links', 'Links']], value: which, onChange: (v) => { which = v; sel = -1; paint(); } });
      const btn = (label, fn) => A.ui.button(label, { size: 'sm', onClick: fn });
      const actions = h('div.hz-org-actions', null,
        btn('Rename', async () => {
          const arr = data(); if (sel < 0 || !arr[sel]) return;
          const n = await A.ui.prompt({ parent: orgWin, title: 'Rename', message: 'New name:', value: arr[sel].title });
          if (n) { arr[sel] = { title: n, url: arr[sel].url }; save(arr); paint(); }
        }),
        btn('Move up', () => { const arr = data(); if (sel > 0) { [arr[sel - 1], arr[sel]] = [arr[sel], arr[sel - 1]]; sel--; save(arr); paint(); } }),
        btn('Move down', () => { const arr = data(); if (sel >= 0 && sel < arr.length - 1) { [arr[sel + 1], arr[sel]] = [arr[sel], arr[sel + 1]]; sel++; save(arr); paint(); } }),
        btn('Delete', () => { const arr = data(); if (sel < 0 || !arr[sel]) return; arr.splice(sel, 1); sel = Math.min(sel, arr.length - 1); save(arr); paint(); A.sound.play('recycle'); }),
        btn('Reset', () => { if (which === 'favorites') setFavorites(DEFAULT_FAVORITES.slice()); else setLinks(DEFAULT_LINKS.slice()); sel = -1; paint(); }));
      paint();
      A.ui.dialog({ parent: win, title: 'Organize Favorites', icon: 'icons/star', width: 520, content: h('div.hz-org', null, h('label.hz-fav-row', null, h('span', null, 'Folder:'), folderSel), list, actions), buttons: [{ label: 'Close', default: true, cancel: true }], onOpen: (w) => { orgWin = w; } });
    }

    // ---------------------------------------------------------- dialogs
    function about() {
      A.ui.messageBox({
        parent: win, title: 'About Horizon', icon: 'icons/globe', instruction: 'Horizon 7', sound: false,
        message: 'Version 7.0.2007.1024\nCipher strength: 128-bit\nProduct ID: 7AER-2007-BUBL-0042\nUpdate versions: 0\n\nHorizon only connects to the pretend web that lives inside Aerium. Every website you find here was made up, so feel free to click everything.',
        detail: 'Licensed to: ' + (A.store.get('user.name') || 'User') + '\nWarning: this browser is protected by bubble wrap. Please do not pop it.',
      });
    }
    function securityReport() {
      const tab = active;
      if (!tab || !tab.secure) return;
      A.ui.messageBox({
        parent: win, title: 'Security Report', icon: 'icons/lock', sound: false,
        instruction: tab.ev ? 'Horizon has verified the identity of this site' : 'This connection to the server is encrypted',
        message: (tab.ev ? tab.ev + '\nIdentified by BubbleTrust Certificate Authority.\n\n' : '') + 'Connection: SSL 3.0, RC4 with 128 bit encryption (High); RSA with 1024 bit exchange.\n\nYou should only enter personal information on this website if the address in the address bar is correct. Also, please do not enter real personal information on pretend websites.',
      });
    }
    function privacyReport() {
      A.ui.messageBox({ parent: win, title: 'Privacy Report', icon: 'icons/shield', instruction: 'Based on your privacy settings, no cookies were restricted or blocked', message: 'Show: All websites\n\n' + (active && active.site ? 'http://' + active.site.host + '/    Accepted\n' : '') + '\nThe only cookies on the pretend web are the kind you eat.', sound: false });
    }
    function pageProperties() {
      const tab = active;
      if (!tab) return;
      const size = tab.doc ? tab.doc.innerHTML.length : 0;
      const secure = tab.secure;
      const d = new Date(Date.now() - 86400000 * 3);
      A.ui.messageBox({
        parent: win, title: 'Properties', icon: 'icons/globe', instruction: tab.title || 'Blank Page', sound: false,
        message: `Protocol: ${tab.zone === 'computer' ? 'Aerium Page Protocol' : secure ? 'HyperText Transfer Protocol with Privacy' : 'HyperText Transfer Protocol'}\nType: HTML Document\nConnection: ${secure ? 'SSL 3.0, RC4 with 128 bit encryption (High)' : 'Not Encrypted'}\nAddress (URL): ${displayUrl(tab.url)}\nSize: ${size.toLocaleString()} bytes\nCreated: ${A.util.fmtDate(d)}\nModified: ${A.util.fmtDate(new Date())}`,
      });
    }
    function printPage() {
      A.ui.messageBox({ parent: win, title: 'Print', icon: 'warning', instruction: 'The printer is out of cyan', message: 'Horizon would love to print this page, but the printer is out of cyan. It is always out of cyan. Try again after someone buys a new cartridge.' });
    }
    function bubbleFilter() {
      const tab = active;
      if (!tab || !tab.site) return;
      const shady = tab.site.shady;
      A.ui.messageBox({
        parent: win, title: 'Bubble Filter', icon: shady ? 'warning' : 'shield',
        instruction: shady ? 'This is a suspicious website' : 'This is not a reported bubble-phishing website',
        message: shady ? tab.site.shady : 'Horizon checked ' + tab.site.host + ' against the list of reported websites and found nothing to worry about. It might still be a little silly.',
      });
    }
    function manageAddons() {
      const addons = [
        ['Bubble Toolbar 2.0', 'Bubble Inc.', true], ['Glitter Cursor Plus', 'SparkleWare', true], ['WeatherPal Buddy', 'SkyCast', true],
        ['Coupon Bubble Assistant', 'Unknown publisher', true], ['Research Helper (do not remove!!)', '(not verified)', true], ['BubblePlayer 9', 'MiniGames.com', true],
      ];
      const rows = addons.map(([name, pub, on]) => h('div.hz-addon', null, A.ui.checkbox({ label: name, checked: on }), h('span.ae-muted', null, pub)));
      const content = h('div.hz-addons', null, h('div.ae-muted', null, 'Add-ons that are currently loaded in Horizon (you probably did not install most of these):'), h('div.hz-addon-list', null, rows));
      let adWin = win;
      A.ui.dialog({
        parent: win, title: 'Manage Add-ons', icon: 'icons/settings', width: 460, content, onOpen: (w) => { adWin = w; },
        buttons: [{ label: 'Disable all', value: 'off', onClick: () => { rows.forEach((r) => { r.querySelector('input').checked = false; }); A.ui.messageBox({ parent: adWin, title: 'Manage Add-ons', icon: 'success', instruction: 'All add-ons disabled', message: 'Horizon feels 30% lighter already.' }); return false; } }, { label: 'OK', default: true, cancel: true }],
      });
    }
    async function deleteHistory(parent) {
      parent = parent && parent.el ? parent : win;
      const boxes = [['Temporary Internet files', true], ['Cookies', false], ['History', true], ['Form data', true], ['Passwords', false]].map(([l, c]) => A.ui.checkbox({ label: l, checked: c }));
      const r = await A.ui.dialog({
        parent, title: 'Delete Browsing History', icon: 'icons/trash', width: 420,
        content: h('div.hz-delhist', null, h('div.ae-muted', null, 'Choose what you would like to delete. Your favorites stay right where they are.'), boxes),
        buttons: [{ label: 'Delete', default: true, value: 'del' }, { label: 'Cancel', cancel: true, value: null }],
      });
      if (r !== 'del') return;
      if (boxes[2].checked) A.store.set('browser.history', []);
      A.sound.play('recycle');
      A.ui.messageBox({ parent, title: 'Delete Browsing History', icon: 'success', message: 'Your browsing history has been deleted. Nobody will ever know how many times you visited TubeView today.' });
    }
    function viewSource() {
      const tab = active;
      if (!tab || !tab.doc) return;
      const clone = tab.doc.cloneNode(true);
      clone.querySelectorAll('[data-href]').forEach((a) => { a.setAttribute('href', a.dataset.href); a.removeAttribute('data-href'); a.removeAttribute('role'); a.removeAttribute('tabindex'); });
      clone.querySelectorAll('img').forEach((im) => { im.setAttribute('src', 'images/' + (im.dataset.asset ? im.dataset.asset.split('/').pop() + '.gif' : 'spacer.gif')); im.removeAttribute('data-asset'); });
      let src = clone.innerHTML.replace(/blob:[^"')\s]+/g, 'images/spacer.gif').replace(/data:image\/[^"')\s]+/g, 'images/pic.gif');
      src = prettyHTML(src);
      const lines = src.split('\n');
      if (lines.length > 600) src = lines.slice(0, 600).join('\n') + '\n<!-- ...and ' + (lines.length - 600) + ' more lines. That is a lot of table tags. -->';
      const head = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">\n<!-- Source of ${tab.url} -->\n<!-- Fun fact: in 2007, everybody learned HTML by clicking View Source. -->\n<!-- If you can read this, congratulations: you are officially a hacker now. -->\n<html>\n<head>\n<title>${esc(tab.title)}</title>\n<meta name="generator" content="Notepad (and a lot of hope)">\n</head>\n<body>\n`;
      const ta = h('textarea.hz-src', { readOnly: true, spellcheck: false, wrap: 'off' });
      ta.value = head + src + '\n</body>\n</html>\n';
      A.ui.dialog({
        parent: win, title: 'Source of: ' + displayUrl(tab.url), icon: 'icons/notepad', width: 680, content: h('div.hz-srcwrap', null, ta),
        buttons: [{ label: 'Copy all', value: 'copy', onClick: () => { copyText(ta.value); return false; } }, { label: 'Close', default: true, cancel: true }],
      });
    }
    function prettyHTML(html) {
      const out = [];
      let depth = 0;
      html.replace(/>\s*</g, '>\n<').split('\n').forEach((raw) => {
        const line = raw.trim();
        if (!line) return;
        const closing = /^<\//.test(line);
        const selfish = /^<(br|hr|img|input|meta|link|source|col|area|wbr)\b/i.test(line) || /\/>$/.test(line) || /^<[^>]+>.*<\/[^>]+>$/.test(line) || !/^</.test(line);
        if (closing) depth = Math.max(0, depth - 1);
        out.push('  '.repeat(Math.min(depth, 14)) + line);
        if (!closing && !selfish && /^<[a-z]/i.test(line)) depth++;
      });
      return out.join('\n');
    }
    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
    }
    function selectAll() {
      if (!active || !active.doc) return;
      const range = document.createRange();
      range.selectNodeContents(active.doc);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    let lastFind = '';
    async function findOnPage() {
      if (!active || !active.doc) return;
      const term = await A.ui.prompt({ parent: win, title: 'Find', message: 'Find on this page:', value: lastFind, okLabel: 'Find Next' });
      if (!term) return;
      lastFind = term;
      findNext();
    }
    function findNext() {
      const tab = active;
      if (!tab || !tab.doc || !lastFind) return;
      const needle = lastFind.toLowerCase();
      const walker = document.createTreeWalker(tab.doc, NodeFilter.SHOW_TEXT);
      const sel = window.getSelection();
      const startNode = sel.rangeCount && tab.doc.contains(sel.anchorNode) ? sel.focusNode : null;
      let passed = !startNode, node, hit = null, first = null;
      while ((node = walker.nextNode())) {
        const i = node.nodeValue.toLowerCase().indexOf(needle, node === startNode ? sel.focusOffset : 0);
        if (i >= 0 && !first) first = { node, i };
        if (node === startNode) passed = true;
        if (passed && i >= 0 && (node !== startNode || i >= sel.focusOffset)) { hit = { node, i }; break; }
      }
      hit = hit || first;
      if (!hit) { A.ui.messageBox({ parent: win, title: 'Find', icon: 'info', message: 'Horizon has finished searching the page. "' + lastFind + '" was not found.' }); return; }
      const range = document.createRange();
      range.setStart(hit.node, hit.i);
      range.setEnd(hit.node, hit.i + lastFind.length);
      sel.removeAllRanges();
      sel.addRange(range);
      const rr = range.getBoundingClientRect(), pr = tab.page.getBoundingClientRect();
      tab.page.scrollTop += rr.top - pr.top - pr.height / 2;
    }
    function sendToDesktop() {
      const tab = active;
      if (!tab || !tab.url || tab.internal) return;
      const safe = (tab.title || 'Shortcut').replace(/[\\/:*?"<>|]/g, '').slice(0, 60).trim() || 'Shortcut';
      try {
        const name = A.fs.uniqueName('/Desktop', safe + '.url');
        A.fs.write('/Desktop/' + name, '[InternetShortcut]\r\nURL=' + tab.url + '\r\n', { mime: 'text/x-url' });
        A.notify({ title: 'Shortcut created', text: name + ' is on your desktop.', icon: 'icons/globe' });
      } catch (e) {
        A.ui.messageBox({ parent: win, icon: 'error', title: 'Horizon', message: e.message });
      }
    }
    async function savePageAs() {
      const tab = active;
      if (!tab || !tab.site || !tab.doc) return;
      const safe = (tab.title || 'Page').replace(/[\\/:*?"<>|]/g, '').slice(0, 50).trim() || 'Page';
      const p = await A.ui.fileDialog({ mode: 'save', parent: win, folder: '/Documents', filename: safe + '.htm', exts: ['htm'], filterLabel: 'Webpage, HTML only (*.htm)' });
      if (!p) return;
      const clone = tab.doc.cloneNode(true);
      clone.querySelectorAll('canvas, script, iframe').forEach((n) => n.remove());
      clone.querySelectorAll('[data-href]').forEach((a) => { a.setAttribute('href', resolveHref(a.dataset.href, tab.url)); a.removeAttribute('data-href'); });
      clone.querySelectorAll('img').forEach((im) => { if (im.dataset.asset) im.setAttribute('src', 'asset:' + im.dataset.asset); });
      const css = typeof tab.site.css === 'function' ? tab.site.css() : tab.site.css || '';
      const html = `<!DOCTYPE html>\n<html>\n<head>\n<title>${esc(tab.title)}</title>\n<base href="${esc(tab.url)}">\n<style>\n${css}\n</style>\n</head>\n<body>\n${clone.innerHTML}\n</body>\n</html>\n`;
      try { A.fs.write(p, html, { mime: 'text/html' }); A.notify({ title: 'Webpage saved', text: A.fs.basename(p) + ' was saved.', icon: 'icons/globe' }); } catch (e) { A.ui.messageBox({ parent: win, icon: 'error', title: 'Save Webpage', message: e.message }); }
    }
    async function openFileDialog() {
      const p = await A.ui.fileDialog({ mode: 'open', parent: win, folder: '/Documents', exts: ['htm', 'html', 'url', 'txt'], filterLabel: 'Web files (*.htm; *.html; *.url; *.txt)' });
      if (p && active) navigate(active, fileHref(p));
    }
    function savePicture(key, img, asBackground) {
      if (!key) return;
      const base = (img.alt || key.split('/').pop()).replace(/[\\/:*?"<>|]/g, '').slice(0, 40) || 'picture';
      if (asBackground && key.startsWith('imagery/') && A.theme.wallpapers && A.theme.wallpapers.has(key.slice(8))) {
        A.theme.setWallpaper(key.slice(8));
        A.notify({ title: 'Desktop background changed', text: 'Enjoy your new wallpaper.', icon: 'icons/personalize' });
        return;
      }
      try {
        const name = A.fs.uniqueName('/Pictures', base + '.png');
        const path = A.fs.write('/Pictures/' + name, 'asset:' + key, { mime: 'image/svg+xml' });
        if (asBackground) { A.theme.setWallpaper('file:' + path, 'center'); A.notify({ title: 'Desktop background changed', text: name + ' is now your wallpaper.', icon: 'icons/personalize' }); }
        else A.notify({ title: 'Picture saved', text: name + ' was saved to your Pictures folder.', icon: 'icons/photo' });
      } catch (e) {
        A.ui.messageBox({ parent: win, icon: 'error', title: 'Horizon', message: e.message });
      }
    }
    function toggleFullscreen() {
      fullscreen = !fullscreen;
      if (fullscreen && win.state !== 'maximized') { root.dataset.restoreMax = '1'; win.maximize(); }
      else if (!fullscreen && root.dataset.restoreMax) { delete root.dataset.restoreMax; win.restoreSize(); }
      applyToolbars();
    }

    function internetOptions(start) {
      const draft = Object.assign({}, S);
      let ioWin = win;
      const home = h('textarea.ae-input.hz-io-home', { rows: 2, spellcheck: false });
      home.value = draft.home;
      home.addEventListener('input', () => { draft.home = home.value.trim(); });
      const setHome = (v) => { draft.home = v; home.value = v; };
      const btn = (l, fn) => A.ui.button(l, { size: 'sm', onClick: fn });
      const group = (title, ...kids) => h('fieldset.hz-io-group', null, h('legend', null, title), kids);
      const general = h('div.hz-io-page', null,
        group('Home page', h('div.ae-muted', null, 'To create home page tabs, type each address on its own line.'), home,
          h('div.hz-io-row', null, btn('Use current', () => active && active.url && setHome(active.url)), btn('Use default', () => setHome(DEFAULT_HOME)), btn('Use blank', () => setHome('about:blank')))),
        group('Browsing history', h('div.ae-muted', null, 'Delete temporary files, history, cookies, saved passwords, and web form information.'), h('div.hz-io-row', null, btn('Delete...', () => deleteHistory(ioWin)))),
        group('Tabs', h('label.hz-io-line', null, 'When a new tab is opened, open: ', A.ui.select({ options: [['tabs', 'A new tab page'], ['home', 'Your home page'], ['blank', 'A blank page']], value: draft.newTab, onChange: (v) => { draft.newTab = v; } }))),
        group('Search', h('label.hz-io-line', null, 'Default search provider: ', A.ui.select({ options: PROVIDERS.map((p) => [p.id, p.name]), value: draft.provider, onChange: (v) => { draft.provider = v; } }))));
      const connections = h('div.hz-io-page', null,
        group('Connection speed', h('div.ae-muted', null, 'Choose how fast the pretend internet should feel.'),
          A.ui.radioGroup({ options: Object.entries(SPEEDS).map(([id, sp]) => [id, sp.label]), value: draft.speed, onChange: (v) => { draft.speed = v; } }),
          h('div.hz-io-note', null, 'Dial-up makes every page load like it is 1999. Recommended for maximum nostalgia.')),
        group('Offline', A.ui.checkbox({ label: 'Work offline', checked: draft.offline, onChange: (v) => { draft.offline = v; } })));
      const zoneRow = h('div.hz-io-zones', null, [['icons/globe', 'Internet'], ['icons/network', 'Local intranet'], ['icons/check', 'Trusted sites'], ['icons/error', 'Restricted sites']].map(([ic, l], i) => h('div.hz-io-zone', { class: i === 0 ? 'on' : '' }, A.img(ic), h('span', null, l))));
      const security = h('div.hz-io-page', null,
        h('div.ae-muted', null, 'Select a zone to view or change security settings.'), zoneRow,
        group('Security level for this zone', h('div.hz-io-level', null, h('b', null, 'Medium-high'), h('div.ae-muted', null, '- Appropriate for most websites\n- Prompts before downloading potentially unsafe content\n- Blocks pop-ups that are too excited'))),
        A.ui.checkbox({ label: 'Enable Protected Mode (always on for the pretend web)', checked: true, disabled: true }));
      const allowList = h('div.hz-io-allow');
      const paintAllow = () => {
        allowList.replaceChildren();
        const list = A.store.get('browser.popupAllow', []);
        if (!list.length) allowList.appendChild(h('div.ae-muted', null, 'No websites are allowed to show pop-ups.'));
        list.forEach((host) => allowList.appendChild(h('div.hz-io-allowrow', null, h('span', null, host), A.ui.button('Remove', { size: 'sm', onClick: () => { A.store.set('browser.popupAllow', list.filter((x) => x !== host)); paintAllow(); } }))));
      };
      paintAllow();
      const privacy = h('div.hz-io-page', null,
        group('Pop-up Blocker', A.ui.checkbox({ label: 'Turn on Pop-up Blocker', checked: draft.popupBlocker, onChange: (v) => { draft.popupBlocker = v; } }),
          A.ui.checkbox({ label: 'Show Information Bar when a pop-up is blocked', checked: draft.popupBar, onChange: (v) => { draft.popupBar = v; } }),
          h('div.ae-muted', null, 'Allowed sites:'), allowList),
        group('Cookies', h('div.ae-muted', null, 'Setting: Medium. Blocks third-party cookies that do not have a compact privacy policy. Accepts all cookies with chocolate chips.')));
      const advanced = h('div.hz-io-page', null,
        group('Multimedia', A.ui.checkbox({ label: 'Play sounds in webpages', checked: draft.sounds, onChange: (v) => { draft.sounds = v; } })),
        group('Browsing',
          A.ui.checkbox({ label: 'Enable page transitions (pages draw in as they load)', checked: draft.transitions, onChange: (v) => { draft.transitions = v; } }),
          A.ui.checkbox({ label: 'Show friendly HTTP error messages', checked: draft.friendlyErrors, onChange: (v) => { draft.friendlyErrors = v; } }),
          A.ui.checkbox({ label: 'Use smooth scrolling', checked: draft.smooth, onChange: (v) => { draft.smooth = v; } }),
          A.ui.checkbox({ label: 'Warn me when closing multiple tabs', checked: draft.confirmCloseTabs, onChange: (v) => { draft.confirmCloseTabs = v; } })));
      const tabsEl = A.ui.tabs({
        tabs: [
          { id: 'general', label: 'General', content: general },
          { id: 'security', label: 'Security', content: security },
          { id: 'privacy', label: 'Privacy', content: privacy },
          { id: 'connections', label: 'Connections', content: connections },
          { id: 'advanced', label: 'Advanced', content: advanced },
        ],
        value: start || 'general',
        className: 'hz-io',
      });
      A.ui.dialog({
        parent: win, title: 'Internet Options', icon: 'icons/settings', width: 470, content: h('div.hz-io-wrap', null, tabsEl),
        buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }],
        onOpen: (w) => { ioWin = w; },
      }).then((r) => {
        if (r !== 'ok') return;
        if (!draft.home) draft.home = DEFAULT_HOME;
        saveSettings(draft);
        applyToolbars();
        applyZoom();
        updateSearchPlaceholder();
      });
    }

    // ---------------------------------------------------------- pop-ups & information bar
    function requestPopup(tab, url, o) {
      const host = tab.site ? tab.site.host : '';
      const allowed = !S.popupBlocker || popupAllowOnce.has(host) || A.store.get('browser.popupAllow', []).includes(host);
      if (allowed) { openPopupWindow(url, o); return true; }
      tab.pendingPopups = (tab.pendingPopups || []).concat([{ url, o }]).slice(-3);
      if (S.popupBar) {
        showInfoBar(tab, 'Pop-up blocked. To see this pop-up or additional options click here...', () => [
          { label: 'Temporarily Allow Pop-ups', onClick: () => { popupAllowOnce.add(host); flushPopups(tab); clearInfoBar(tab); } },
          { label: 'Always Allow Pop-ups from This Site...', onClick: async () => {
            const ok = await A.ui.confirm('Would you like to allow pop-ups from ' + host + '?', { parent: win, title: 'Allow pop-ups from this site?' });
            if (ok) { A.store.set('browser.popupAllow', Array.from(new Set(A.store.get('browser.popupAllow', []).concat([host])))); flushPopups(tab); clearInfoBar(tab); }
          } },
          { separator: true },
          { label: 'Settings', submenu: [
            { label: 'Turn Off Pop-up Blocker', onClick: () => { saveSettings({ popupBlocker: false }); flushPopups(tab); clearInfoBar(tab); } },
            { label: 'Show Information Bar for Pop-ups', checked: true, onClick: () => { saveSettings({ popupBar: false }); clearInfoBar(tab); } },
            { label: 'More Settings', onClick: () => internetOptions('privacy') },
          ] },
          { label: 'Information Bar Help', onClick: () => A.ui.messageBox({ parent: win, title: 'Information Bar', icon: 'info', message: 'The Information Bar tells you when Horizon has blocked something, such as a pop-up window that a website tried to open. On the pretend web, pop-ups are usually about prizes nobody ever wins.' }) },
        ]);
      }
      A.sound.play('ding');
      return false;
    }
    function flushPopups(tab) {
      const list = tab.pendingPopups || [];
      tab.pendingPopups = [];
      list.forEach((p, i) => setTimeout(() => openPopupWindow(p.url, p.o), i * 250));
    }
    function openPopupWindow(url, o) {
      A.apps.launch('browser', { url, popup: { width: o.width || 440, height: o.height || 360 } });
    }
    function showInfoBar(tab, text, itemsFn) {
      clearInfoBar(tab);
      const close = h('button.hz-info-close', { type: 'button', 'aria-label': 'Close the Information Bar' }, glyph('close'));
      const bar = h('div.hz-info', { role: 'alert', tabIndex: 0 }, glyph('shield', 'hz-info-icon'), h('span.hz-info-text', null, text), close);
      bar.addEventListener('click', (e) => {
        if (e.target.closest('.hz-info-close')) { clearInfoBar(tab); return; }
        const r = bar.getBoundingClientRect();
        A.ui.menu(itemsFn(), e.clientX, r.bottom);
      });
      tab.infoSlot.appendChild(bar);
    }
    function clearInfoBar(tab) { tab.infoSlot.replaceChildren(); }

    // ---------------------------------------------------------- internal pages
    function renderAbout(ctx, tab) {
      const which = ctx.u.pathname || 'blank';
      if (which === 'blank') { ctx.title('Blank Page'); ctx.favicon(BLANK_FAV); ctx.html('<div class="hz-blank"></div>'); return; }
      if (which === 'home') { ctx.title('Home'); ctx.after(0, () => ctx.go(S.home || DEFAULT_HOME, { replace: true, noSound: true })); ctx.html('<div class="hz-blank"></div>'); return; }
      if (which === 'history') return renderHistoryPage(ctx);
      if (which === 'tabs') return renderNewTab(ctx);
      renderError(ctx, 'dns');
    }

    function renderNewTab(ctx) {
      ctx.title('New Tab');
      ctx.favicon(BLANK_FAV);
      const counts = getHistory().slice().sort((a, b) => (b.n || 1) - (a.n || 1) || b.t - a.t);
      const tiles = [];
      const seen = new Set();
      counts.forEach((x) => { if (tiles.length < 8 && !seen.has(x.url)) { seen.add(x.url); tiles.push({ url: x.url, title: x.title }); } });
      siteList().forEach((x) => { if (tiles.length < 8 && !seen.has(x.url)) { seen.add(x.url); tiles.push(x); } });
      const tileHTML = tiles.map((t) => {
        let site = null;
        try { site = findSite(new URL(t.url).hostname); } catch (e) { site = null; }
        const icon = site && site.icon ? A.asset(site.icon) : favForUrl(t.url);
        return `<a class="hz-nt-tile" href="${esc(t.url)}"><span class="hz-nt-thumb"><img src="${icon}" alt=""></span><span class="hz-nt-name">${esc(t.title || t.url)}</span><span class="hz-nt-host">${esc(site ? site.host : displayUrl(t.url))}</span></a>`;
      }).join('');
      const closed = closedTabs.slice().reverse().map((c) => `<li><img src="${favForUrl(c.url)}" alt=""><a href="${esc(c.url)}">${esc(c.title || c.url)}</a></li>`).join('');
      ctx.html(`<div class="hz-int hz-nt">
        <div class="hz-nt-inner">
          <h1 class="hz-nt-title">You have opened a new tab</h1>
          <p class="hz-nt-lead">Type an address in the bar above, search with Bubble, or jump to one of your favorite spots.</p>
          <h2 class="hz-nt-h">Most visited</h2>
          <div class="hz-nt-grid">${tileHTML}</div>
          <div class="hz-nt-cols">
            <div class="hz-nt-col"><h2 class="hz-nt-h">Reopen closed tabs</h2>${closed ? `<ul class="hz-nt-closed">${closed}</ul>` : '<p class="hz-nt-muted">Tabs you close will show up here, in case you change your mind.</p>'}</div>
            <div class="hz-nt-col"><h2 class="hz-nt-h">Tab tips</h2><ul class="hz-nt-tips"><li>Hold Ctrl while you click a link to open it in a new tab.</li><li>Middle-click a tab to close it.</li><li>Ctrl+Tab switches between your tabs.</li><li>Press Alt+Enter in the search box to show results in a new tab.</li></ul></div>
          </div>
        </div>
      </div>`);
    }

    function renderHistoryPage(ctx) {
      ctx.title('History');
      ctx.favicon(A.asset('icons/clock'));
      const paint = (filter) => {
        const f = (filter || '').toLowerCase();
        const list = getHistory().filter((x) => !f || x.title.toLowerCase().includes(f) || x.url.toLowerCase().includes(f));
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const groups = [['Today', list.filter((x) => x.t >= today.getTime())], ['Earlier', list.filter((x) => x.t < today.getTime())]];
        return groups.filter((g) => g[1].length).map(([label, items]) => `<h2 class="hz-nt-h">${label}</h2><ul class="hz-hist-list">${items.map((x) => `<li><img src="${favForUrl(x.url)}" alt=""><a href="${esc(x.url)}">${esc(x.title)}</a><span class="hz-hist-url">${esc(displayUrl(x.url))}</span><span class="hz-hist-time">${A.util.fmtTime(new Date(x.t))}</span></li>`).join('')}</ul>`).join('') || '<p class="hz-nt-muted">No history yet. Go visit some websites!</p>';
      };
      const root = ctx.html(`<div class="hz-int hz-nt"><div class="hz-nt-inner">
        <h1 class="hz-nt-title">History</h1>
        <form class="hz-hist-form"><input class="hz-hist-q" type="text" placeholder="Search history" spellcheck="false"><button type="submit" class="hz-int-btn">Search history</button><button type="button" class="hz-int-btn hz-hist-clear">Clear history</button></form>
        <div class="hz-hist-body">${paint('')}</div></div></div>`);
      const body = root.querySelector('.hz-hist-body');
      const q = root.querySelector('.hz-hist-q');
      root.querySelector('.hz-hist-form').addEventListener('submit', (e) => { e.preventDefault(); body.innerHTML = paint(q.value); });
      q.addEventListener('input', () => { body.innerHTML = paint(q.value); });
      root.querySelector('.hz-hist-clear').addEventListener('click', () => { A.store.set('browser.history', []); body.innerHTML = paint(''); A.sound.play('recycle'); });
    }

    function renderError(ctx, kind, err) {
      const tab = tabs.find((t) => t.id === ctx.tabId);
      const host = ctx.host || '';
      const url = ctx.url;
      if (kind === '404' && !S.friendlyErrors) {
        ctx.title('404 Not Found');
        ctx.favicon(ERROR_FAV);
        ctx.html(`<div class="hz-raw404"><h1>Not Found</h1><p>The requested URL ${esc(ctx.path)} was not found on this server.</p><hr><address>BubbleServer/2.2.3 (Aerium) Server at ${esc(host)} Port 80</address></div>`);
        return;
      }
      if (tab) tab.internal = kind !== '404';
      ctx.favicon(ERROR_FAV);
      const sites = siteList().slice(0, 8).map((s) => `<a href="${esc(s.url)}"><img src="${siteFavicon(s.site)}" alt="">${esc(s.site.shortTitle || s.title)}</a>`).join('');
      const similar = kind === 'dns' && host ? similarSite(host) : null;
      const real = kind === 'dns' && looksReal(host);
      const T = {
        dns: ['Horizon cannot display the webpage', ['You are not connected to the Internet.', 'The website is encountering problems.', 'There might be a typing error in the address.']],
        '404': ['The webpage cannot be found', ['The page may have moved, or the address has a typo in it.', 'The website still exists, but this page never did.', 'A mischievous goldfish rearranged the links.']],
        canceled: ['Navigation to the webpage was canceled', ['You pressed Stop before the page finished loading.', 'The page was taking its sweet time.']],
        offline: ['This webpage is not available offline', ['Horizon is set to work offline.', 'To see this page, turn off Work Offline in the Tools menu.']],
        crash: ['This page has a small problem', ['Part of this webpage stopped working.', 'Refreshing the page usually helps.']],
      }[kind] || [];
      ctx.title(T[0] || 'Error');
      const root = ctx.html(`<div class="hz-int hz-err">
        <div class="hz-err-card">
          <div class="hz-err-head"><span class="hz-err-icon"><img src="${A.asset(kind === 'offline' ? 'icons/wifi' : kind === '404' ? 'icons/search' : 'icons/globe')}" alt=""><img class="hz-err-badge" src="${A.asset(kind === 'canceled' ? 'icons/info' : 'icons/warning')}" alt=""></span><h1>${T[0]}</h1></div>
          ${similar ? `<div class="hz-err-mean">Did you mean <a href="http://${esc(similar.host)}/">${esc(similar.host)}</a>?</div>` : ''}
          <h3>Most likely causes:</h3>
          <ul>${T[1].map((x) => '<li>' + x + '</li>').join('')}</ul>
          <h3>What you can try:</h3>
          <div class="hz-err-try">
            ${kind === 'dns' ? '<button type="button" class="hz-int-btn hz-err-diag">Diagnose Connection Problems</button>' : ''}
            ${kind === 'offline' ? '<button type="button" class="hz-int-btn hz-err-online">Connect and go online</button>' : ''}
            ${kind === 'canceled' || kind === 'crash' ? '<button type="button" class="hz-int-btn hz-err-refresh">Refresh the page</button>' : ''}
            ${kind === '404' ? `<a class="hz-int-btn" href="http://${esc(host)}/">Go to the ${esc(host)} home page</a><button type="button" class="hz-int-btn hz-err-back">Go back to the previous page</button>` : ''}
            ${real ? `<p class="hz-err-real">This address looks like it lives on the real internet. <a class="hz-err-realbtn" href="#">Open ${esc(host)} in my real browser</a></p>` : ''}
          </div>
          <details class="hz-err-more"><summary>More information</summary>
            <p>${kind === 'dns' ? 'This problem can be caused by a variety of issues, including: Internet connectivity has been lost. The website is temporarily unavailable. The Domain Name Server (DNS) is not reachable. The Domain Name Server (DNS) does not have a listing for the website\'s domain.' : kind === '404' ? 'HTTP 404. The server was found, but the page at ' + esc(ctx.path) + ' was not.' : 'Horizon stopped before the page arrived.'}</p>
            <p>The Aerium web is a tiny pretend internet that lives inside this computer. It has a couple of dozen websites, and every one of them is a little bit shiny.</p>
            ${err ? `<p class="hz-err-tech">Technical details: ${esc(String(err && err.message || err))}</p>` : ''}
          </details>
          <div class="hz-err-sites"><h3>Places you can visit:</h3><div class="hz-err-sitelist">${sites}</div></div>
        </div>
      </div>`);
      const diag = root.querySelector('.hz-err-diag');
      if (diag) diag.addEventListener('click', () => diagnose(host, url, real));
      const online = root.querySelector('.hz-err-online');
      if (online) online.addEventListener('click', () => { saveSettings({ offline: false }); ctx.reload(); });
      const refresh = root.querySelector('.hz-err-refresh');
      if (refresh) refresh.addEventListener('click', () => ctx.reload());
      const back = root.querySelector('.hz-err-back');
      if (back) back.addEventListener('click', () => ctx.back());
      const realBtn = root.querySelector('.hz-err-realbtn');
      if (realBtn) realBtn.addEventListener('click', (e) => { e.preventDefault(); openReal(url); });
    }
    function openReal(url) {
      try { window.open(url.replace(/^http:\/\//, 'https://'), '_blank', 'noopener,noreferrer'); } catch (e) { /* ignore */ }
    }
    function diagnose(host, url, real) {
      const steps = [
        ['Checking your network adapter', 'Working'],
        ['Looking up the address ' + (host || url), 'Not found on the Aerium web'],
        ['Pinging the tubes', 'The tubes are clear'],
        ['Asking the fish', 'The fish have no idea'],
      ];
      const list = h('div.hz-diag-list');
      const result = h('div.hz-diag-result', { hidden: true },
        h('div.ae-td-instruction', null, 'Horizon found the problem'),
        h('div.ae-td-message', null, 'The website "' + (host || url) + '" is not part of the pretend web that lives inside Aerium.' + (real ? ' It probably exists on the real internet, though, and your real browser can take you there.' : ' Check the address for typos, or try Bubble Search to find what you are looking for.')));
      const content = h('div.hz-diag', null, h('div.hz-diag-top', null, A.img('icons/network', { class: 'hz-diag-icon' }), h('div', null, h('b', null, 'Horizon Network Diagnostics'), h('div.ae-muted', null, 'Identifying the problem...'))), list, result);
      const buttons = [];
      if (real) buttons.push({ label: 'Open in my real browser', value: 'real', onClick: () => { openReal(url); } });
      buttons.push({ label: 'Close', default: !real, cancel: true, value: null });
      A.ui.dialog({
        parent: win, title: 'Horizon Network Diagnostics', icon: 'icons/network', width: 440, content, buttons,
        onOpen(dwin) {
          let i = 0;
          const next = () => {
            if (dwin.closed) return;
            if (i >= steps.length) { result.hidden = false; A.sound.play('notify'); return; }
            const [label, res] = steps[i];
            const status = h('span.hz-diag-status', null, A.ui.spinner({ size: 16 }));
            list.appendChild(h('div.hz-diag-row', null, h('span', null, label + '...'), status));
            setTimeout(() => {
              if (dwin.closed) return;
              status.replaceChildren(A.img(i === 1 ? 'icons/warning' : 'icons/check', { class: 'hz-diag-ok' }), h('span', null, res));
              i++;
              next();
            }, 650 + Math.random() * 500);
          };
          next();
        },
      });
    }

    function renderFile(ctx, tab) {
      const path = ctx.path || '/';
      const fs = A.fs;
      if (!fs.exists(path)) { renderError(ctx, 'dns'); ctx.title('Cannot find ' + path); return; }
      if (fs.isDir(path)) {
        ctx.title('Index of ' + path);
        ctx.favicon(A.asset('icons/folder'));
        const items = fs.list(path);
        const up = path !== '/' ? `<li><img src="${A.asset('icons/folder')}" alt=""><a href="file://${encodeURI(fs.dirname(path))}">[Parent directory]</a></li>` : '';
        ctx.html(`<div class="hz-int hz-files"><div class="hz-nt-inner"><h1 class="hz-nt-title">Index of ${esc(path)}</h1><ul class="hz-hist-list">${up}${items.map((it) => `<li><img src="${A.asset(fs.iconFor(it.path))}" alt=""><a href="file://${encodeURI(it.path)}">${esc(it.name)}</a><span class="hz-hist-url">${it.type === 'folder' ? 'File folder' : esc(fs.typeName(it.path))}</span><span class="hz-hist-time">${it.type === 'folder' ? '' : A.util.fmtBytes(it.size)}</span></li>`).join('')}</ul></div></div>`);
        return;
      }
      const ext = fs.ext(path);
      const data = String(fs.read(path) || '');
      ctx.title(fs.basename(path));
      if (ext === 'url') {
        const m = /^URL=(.+)$/im.exec(data);
        if (m) { ctx.html('<div class="hz-blank"></div>'); ctx.after(0, () => ctx.go(m[1].trim(), { replace: true, noSound: true })); return; }
      }
      if (ext === 'htm' || ext === 'html') { renderHTMLFile(ctx, data); return; }
      const thumb = fs.thumbFor(path);
      if (thumb) {
        ctx.favicon(A.asset('icons/photo'));
        ctx.html(`<div class="hz-imgview"><img src="${thumb}" alt="${esc(fs.basename(path))}"></div>`);
        return;
      }
      if (['txt', 'log', 'ini', 'md', 'css', 'js', 'json', 'xml', 'csv'].includes(ext) || !/^(track|video|asset|app):/.test(data)) {
        ctx.favicon(A.asset('icons/notepad'));
        ctx.html(`<pre class="hz-textfile">${esc(data)}</pre>`);
        return;
      }
      ctx.html(`<div class="hz-int hz-err"><div class="hz-err-card"><div class="hz-err-head"><span class="hz-err-icon"><img src="${A.asset(fs.iconFor(path))}" alt=""></span><h1>Horizon cannot show this kind of file</h1></div><p>${esc(fs.basename(path))} is a ${esc(fs.typeName(path))}. Aerium knows another program that can open it.</p><div class="hz-err-try"><button type="button" class="hz-int-btn hz-file-open">Open with the default program</button></div></div></div>`);
      ctx.$('.hz-file-open').addEventListener('click', () => A.apps.openFile(path));
    }

    // Saved or hand-written .htm files render in a shadow root, with scripts and handlers removed.
    function renderHTMLFile(ctx, data) {
      const parsed = new DOMParser().parseFromString(data, 'text/html');
      parsed.querySelectorAll('script, iframe, object, embed, link, meta, frame, frameset, base').forEach((n) => n.remove());
      parsed.querySelectorAll('*').forEach((el) => {
        Array.from(el.attributes).forEach((at) => {
          if (/^on/i.test(at.name) || /^\s*(javascript|vbscript):/i.test(at.value)) el.removeAttribute(at.name);
        });
        if (el.tagName === 'IMG') {
          const src = el.getAttribute('src') || '';
          if (src.startsWith('asset:')) { el.dataset.asset = src.slice(6); el.setAttribute('src', A.asset(src.slice(6))); } else if (!/^data:image\//.test(src)) el.removeAttribute('src');
        }
        if (el.tagName === 'FORM') el.removeAttribute('action');
      });
      const title = parsed.querySelector('title');
      if (title && title.textContent.trim()) ctx.title(title.textContent.trim());
      const host = h('div.hz-shadowhost');
      ctx.root.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      const styles = Array.from(parsed.querySelectorAll('style')).map((s) => s.textContent).join('\n');
      shadow.innerHTML = `<style>:host{display:block;min-height:100%;background:#fff;color:#000;font:13px/1.4 "Times New Roman",serif}${styles}</style>` + parsed.body.innerHTML;
      shadow.querySelectorAll('a[href]').forEach((a) => { a.dataset.href = a.getAttribute('href'); a.removeAttribute('href'); a.setAttribute('tabindex', '0'); });
    }

    // ---------------------------------------------------------- keyboard
    let altAlone = false;
    function onKey(e) {
      const k = e.key;
      const lower = k.length === 1 ? k.toLowerCase() : k;
      const ctrl = e.ctrlKey || e.metaKey;
      const typing = A.util.isTyping(e);
      if (k === 'Alt') { altAlone = true; return; }
      altAlone = false;
      if (!active) return;
      if ((ctrl && lower === 'l') || (e.altKey && lower === 'd') || k === 'F6') { e.preventDefault(); addrInput.focus(); addrInput.select(); return; }
      if (ctrl && lower === 't' && !e.shiftKey) { e.preventDefault(); openTab(null); return; }
      if (ctrl && lower === 'w') { e.preventDefault(); closeTab(active); return; }
      if (ctrl && lower === 'n') { e.preventDefault(); A.apps.launch('browser'); return; }
      if (ctrl && k === 'Tab') { e.preventDefault(); const i = tabs.indexOf(active); activate(tabs[(i + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length]); return; }
      if (ctrl && /^[1-8]$/.test(k)) { e.preventDefault(); activate(tabs[Math.min(tabs.length - 1, Number(k) - 1)]); return; }
      if (ctrl && k === '9') { e.preventDefault(); activate(tabs[tabs.length - 1]); return; }
      if (e.altKey && k === 'ArrowLeft') { e.preventDefault(); goBack(active); return; }
      if (e.altKey && k === 'ArrowRight') { e.preventDefault(); goForward(active); return; }
      if (e.altKey && k === 'Home') { e.preventDefault(); navigate(active, S.home || DEFAULT_HOME); return; }
      if (k === 'Backspace' && !typing && !ctrl) { e.preventDefault(); if (e.shiftKey) goForward(active); else goBack(active); return; }
      if (k === 'F5' || (ctrl && lower === 'r')) { e.preventDefault(); reload(active); return; }
      if (k === 'Escape' && active.loading && !typing) { e.preventDefault(); stopLoading(active, false); return; }
      if (ctrl && lower === 'd') { e.preventDefault(); addFavorite(); return; }
      if (ctrl && lower === 'e') { e.preventDefault(); searchInput.focus(); searchInput.select(); return; }
      if (ctrl && lower === 'h') { e.preventDefault(); navigate(active, 'about:history'); return; }
      if (ctrl && lower === 'u') { e.preventDefault(); viewSource(); return; }
      if (ctrl && lower === 'o') { e.preventDefault(); openFileDialog(); return; }
      if (ctrl && lower === 'f') { e.preventDefault(); findOnPage(); return; }
      if (k === 'F3') { e.preventDefault(); findNext(); return; }
      if (ctrl && e.shiftKey && lower === 't') { e.preventDefault(); reopenClosed(); return; }
      if (ctrl && (k === '+' || k === '=')) { e.preventDefault(); zoomStep(1); return; }
      if (ctrl && k === '-') { e.preventDefault(); zoomStep(-1); return; }
      if (ctrl && k === '0') { e.preventDefault(); setZoom(100); return; }
      if (k === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
      if (k === 'F1') { e.preventDefault(); helpItems()[0].onClick(); }
    }
    function onKeyUp(e) {
      if (e.key === 'Alt' && altAlone && !popup) {
        altAlone = false;
        e.preventDefault();
        menuBar.hidden = !menuBar.hidden;
      }
    }
    win.el.addEventListener('keydown', onKey);
    win.el.addEventListener('keyup', onKeyUp);

    win.on('minimize', () => { minimized = true; if (active) fireVisibility(active, false); });
    win.on('restore', () => { minimized = false; if (active) fireVisibility(active, true); });

    // ---------------------------------------------------------- start
    function startUrl() {
      if (args.path) {
        const p = args.path;
        if (A.fs.ext(p) === 'url') {
          const m = /^URL=(.+)$/im.exec(String(A.fs.read(p) || ''));
          if (m) return m[1].trim();
        }
        return fileHref(p);
      }
      if (args.url) return args.url;
      if (args.q) return searchHref(args.q);
      const homes = String(S.home || DEFAULT_HOME).split(/\n+/).map((x) => x.trim()).filter(Boolean);
      return homes.length ? homes : [DEFAULT_HOME];
    }
    const first = startUrl();
    const list = Array.isArray(first) ? first : [first];
    list.forEach((u, i) => openTab(u, { background: i > 0, noSound: true }));
    if (tabs[0]) activate(tabs[0]);
    setTimeout(() => { if (!destroyed && active) active.page.focus({ preventScroll: true }); }, 60);

    return {
      async beforeClose() {
        if (tabs.length < 2 || !S.confirmCloseTabs || popup) return true;
        const cb = A.ui.checkbox({ label: 'Always close all tabs', checked: false });
        const content = h('div.ae-taskdialog', null, A.img('icons/help', { class: 'ae-td-icon' }),
          h('div.ae-td-text', null, h('div.ae-td-instruction', null, 'Do you want to close all tabs?'), h('div.ae-td-message', null, 'You have ' + tabs.length + ' tabs open in this window.'), h('div.hz-close-cb', null, cb)));
        A.sound.play('question');
        const r = await A.ui.dialog({ parent: win, title: 'Horizon', icon: 'icons/globe', content, width: 400, buttons: [{ label: 'Close tabs', default: true, value: 'close' }, { label: 'Cancel', cancel: true, value: null }] });
        if (r === 'close' && cb.checked) saveSettings({ confirmCloseTabs: false });
        return r === 'close';
      },
      onClose() {
        destroyed = true;
        tabs.forEach((t) => { t.loadTimers.forEach(clearTimeout); runCleanups(t); });
        offs.forEach((off) => off && off());
        document.removeEventListener('pointerdown', outsideDrop, true);
        win.el.removeEventListener('keydown', onKey);
        win.el.removeEventListener('keyup', onKeyUp);
      },
      onResize() {
        hideDrop();
        if (active) active.resizeFns.slice().forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
      },
      keepAwake: () => !!(active && active.awake && !minimized),
    };
  }

  W.horizon = { findSite, resolveInput, searchHref, favForUrl, siteFavicon, PROVIDERS };
})();
