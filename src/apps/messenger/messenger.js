/* Bubble Messenger: sign in, see who's online, chat with friends and family,
   and send nudges, winks and glossy emoticons, like after school in 2007.
   One contact list window (sign-in, signing in, contact list) plus one
   conversation window per friend. While you're signed in the buddies live in
   the notification area, friends sign in and out, change their personal
   messages and sometimes message you first. Art lives in emoticons.js, the
   friends and their chat brains in bots.js. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;
  const NS = A.bubbleMessenger;
  const E = NS.emoticons, ART = NS.art, WINKS = NS.winks, BOTS = NS.bots, ST = NS.status;

  // ------------------------------------------------------------ settings
  const get = (k, d) => A.store.get('messenger.' + k, d);
  const set = (k, v) => { try { A.store.set('messenger.' + k, v); } catch (e) { /* storage full: keep going */ } };
  const play = (name) => { if (get('sounds', true)) A.sound.play(name); };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const rand = (a, b) => a + Math.random() * (b - a);

  const userName = () => String(A.store.get('user.name') || 'User').trim() || 'User';
  const firstName = () => userName().split(/\s+/)[0];
  const emailFor = (name) => (String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'user') + '@aerium.net';
  const myPicture = () => get('picture', null) || A.store.get('user.avatar') || 'avatars/avatar-fish';

  const STATUS_IDS = NS.STATUSES.map((s) => s.id);
  const MENU_STATUSES = ['online', 'busy', 'brb', 'away', 'phone', 'lunch', 'offline'];

  const FONTS = {
    aero: ['Selawik', 'var(--font-aero)'],
    comic: ['Comic Sans MS', '"Comic Sans MS", "Comic Neue", "Chalkboard SE", var(--font-aero)'],
    arial: ['Arial', 'Arial, "Liberation Sans", Helvetica, sans-serif'],
    verdana: ['Verdana', 'Verdana, "DejaVu Sans", sans-serif'],
    tahoma: ['Tahoma', 'Tahoma, Verdana, "DejaVu Sans", sans-serif'],
    trebuchet: ['Trebuchet MS', '"Trebuchet MS", "Lucida Grande", var(--font-aero)'],
    georgia: ['Georgia', 'Georgia, "DejaVu Serif", serif'],
    times: ['Times New Roman', '"Times New Roman", "Liberation Serif", Times, serif'],
    courier: ['Courier New', '"Courier New", "Liberation Mono", monospace'],
    rounded: ['M PLUS Rounded', 'var(--font-zen)'],
  };
  const COLORS = ['#0b2a4a', '#000000', '#5a6470', '#c8102e', '#e0621a', '#c79100', '#2f9e2a', '#6ab04c',
    '#0e8a8a', '#35b8e8', '#0a6fd1', '#1a3f9c', '#7a4fbf', '#d4237a', '#ff4fa0', '#8a4a1a'];
  const myFont = () => Object.assign({ color: '#0b2a4a', family: 'aero' }, get('font', null) || {});

  // Friend and user colors stay readable on light and dark conversation panes.
  function readable(hex) {
    let hh = 210, ss = 60, ll = 30;
    try { const [r, g, b] = A.util.hexToRgb(hex); [hh, ss, ll] = A.util.rgbToHsl(r, g, b); } catch (e) { /* keep defaults */ }
    return { light: `hsl(${hh}, ${ss}%, ${Math.min(ll, 42)}%)`, dark: `hsl(${hh}, ${Math.min(ss, 90)}%, ${Math.max(ll, 68)}%)` };
  }
  function colorVars(hex, family) {
    const c = readable(hex);
    return { '--c': c.light, '--cd': c.dark, fontFamily: (FONTS[family] || FONTS.aero)[1] };
  }

  const SCENES = ['imagery/clear-sky', 'imagery/meadow', 'imagery/sunrise', 'imagery/ocean', 'imagery/water', 'imagery/bokeh-day',
    'imagery/vectorgarden', 'imagery/technozen', 'imagery/aurora', 'imagery/bokeh-night', 'imagery/dark-ribbons', 'imagery/deep-sea'];
  const THEME_SCENE = { light: 'imagery/clear-sky', dark: 'imagery/aurora', technozen: 'imagery/technozen' };
  const myScene = () => { const sc = get('scene', 'auto'); return sc === 'auto' || !SCENES.includes(sc) ? THEME_SCENE[A.theme.current] || THEME_SCENE.light : sc; };
  const sceneUrl = (key) => `url("${A.asset(key)}")`;

  // ------------------------------------------------------------ small UI pieces
  const ORB_COLORS = { online: ['#e2ffd6', '#35c93a', '#157a1f'], busy: ['#ffd9cf', '#e5391c', '#8e1a08'], away: ['#fff4bf', '#f5a623', '#b35f00'], offline: ['#f4f7fa', '#a9b6c3', '#627282'] };
  const orbCache = new Map();
  // A glossy status orb as an image URL (menus, tray, rows). Busy gets a bar, away a clock.
  function orbUrl(status) {
    const key = status === 'blocked' ? 'blocked' : status;
    if (orbCache.has(key)) return orbCache.get(key);
    const kind = key === 'blocked' ? 'offline' : ST.orb(key);
    const [hi, body, rim] = ORB_COLORS[kind];
    let glyph = '';
    if (key === 'busy' || key === 'phone') glyph = '<rect x="4.4" y="7.1" width="7.2" height="1.9" rx=".95" fill="#fff"/>';
    else if (kind === 'away') glyph = '<path d="M8 4.7 V8.3 L10.4 9.5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    else if (key === 'blocked') glyph = '<circle cx="8" cy="8" r="4.1" fill="none" stroke="#d4321a" stroke-width="1.6"/><path d="M5.2 10.8 L10.8 5.2" stroke="#d4321a" stroke-width="1.6"/>';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><defs><radialGradient id="o" cx=".5" cy="1.05" r=".95"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${body}"/><stop offset="1" stop-color="${rim}"/></radialGradient><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></linearGradient></defs><circle cx="8" cy="8" r="6.6" fill="url(#o)" stroke="${rim}" stroke-width=".9"/><ellipse cx="8" cy="5.3" rx="4.3" ry="2.6" fill="url(#s)"/>${glyph}</svg>`;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    orbCache.set(key, url);
    return url;
  }
  const orb = (status, cls) => h('span.bm-orb', { class: cls, style: { backgroundImage: `url("${orbUrl(status)}")` }, 'aria-hidden': 'true' });
  const frameKind = (status) => (status === 'blocked' ? 'offline' : ST.orb(status));

  // A display picture in a glossy frame that takes the status color.
  function dp(key, size, status, cls) {
    const img = h('img', { src: ART.pictureUrl(key), alt: '', draggable: false, class: ART.pictureFramed(key) ? 'bm-crop' : 'bm-full' });
    const el = h('span.bm-dp', { class: ['bm-f-' + frameKind(status), cls], style: { '--dp': size + 'px' } }, h('span.bm-dp-pic', null, img));
    el.update = (k, st) => {
      if (k) { img.src = ART.pictureUrl(k); img.className = ART.pictureFramed(k) ? 'bm-crop' : 'bm-full'; }
      if (st) el.className = el.className.replace(/\bbm-f-\w+/, 'bm-f-' + frameKind(st));
    };
    return el;
  }

  const svgEl = (markup, cls) => h('span', { class: cls, 'aria-hidden': 'true', html: markup });
  const GLYPH = {
    menu: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 4.5h10M3 8h10M3 11.5h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    note: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M6 12.2V3.6l7-1.6v8.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="4.4" cy="12.3" rx="2.2" ry="1.7" fill="currentColor"/><ellipse cx="11.4" cy="10.6" rx="2.2" ry="1.7" fill="currentColor"/></svg>',
    pencil: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 13l1-3.2 7.4-7.4 2.2 2.2L6.2 12z" fill="#ffd65a" stroke="#8a6200" stroke-width=".9" stroke-linejoin="round"/><path d="M11.4 2.4l2.2 2.2 1-1a1.1 1.1 0 0 0 0-1.6l-.6-.6a1.1 1.1 0 0 0-1.6 0z" fill="#ff8aa0" stroke="#a3334d" stroke-width=".8"/><path d="M3 13l1-3.2 2.2 2.2z" fill="#3d2a10"/></svg>',
    nudge: '<svg viewBox="0 0 20 16" width="18" height="14"><circle cx="10" cy="8" r="5" fill="#ffd23a" stroke="#c07000" stroke-width="1"/><circle cx="8.3" cy="7.2" r=".9" fill="#3d1f00"/><circle cx="11.7" cy="7.2" r=".9" fill="#3d1f00"/><ellipse cx="10" cy="10" rx="1.3" ry="1.1" fill="#7a2208"/><path d="M2.6 4.6q-1.6 3.4 0 6.8M17.4 4.6q1.6 3.4 0 6.8M4.6 6q-.8 2 0 4M15.4 6q.8 2 0 4" fill="none" stroke="#3aa6f5" stroke-width="1.2" stroke-linecap="round"/></svg>',
    caret: '<svg viewBox="0 0 8 6" width="8" height="6"><path d="M0 0h8L4 6z" fill="currentColor"/></svg>',
  };

  // Plain-text version of a name or message for titles, toasts and tooltips.
  const plain = (text) => E.strip(text) || String(text || '');

  // ------------------------------------------------------------ session state
  const S = {
    active: false,          // signed in
    sid: 0,                 // increments every sign-in so stale timers and plans bail out
    status: 'online',
    contacts: new Map(),
    convs: new Map(),
    timers: new Set(),
    offs: [],
    tray: null,
    np: null,
    lastOpener: 0,
    startedAt: 0,
  };
  const M = { win: null, ctrl: null, view: null };

  function later(ms, fn) {
    const sid = S.sid;
    const t = setTimeout(() => { S.timers.delete(t); if (sid === S.sid) fn(); }, Math.max(0, ms));
    S.timers.add(t);
    return t;
  }
  const cancel = (t) => { if (t) { clearTimeout(t); S.timers.delete(t); } };
  const wait = (ms) => new Promise((resolve) => later(ms, resolve));
  function clearTimers() { S.timers.forEach((t) => clearTimeout(t)); S.timers.clear(); }

  // Friends remember a thing or two about you between sessions.
  let memory = get('memory', {}) || {};
  const saveMemory = A.util.debounce(() => set('memory', memory), 800);
  const host = {
    userName: () => firstName(),
    memory: (id) => (memory[id] = memory[id] || {}),
    saveMemory,
    nowPlaying: () => (S.np ? { title: S.np.title, artist: S.np.artist } : null),
    onlineFriends: () => Array.from(S.contacts.values()).filter((c) => c.status !== 'offline' && !c.removed).map((c) => c.id),
    friendName: (id) => (NS.friendById[id] || { name: id }).name,
  };

  function listState() {
    const st = get('friends', null) || {};
    return { removed: Array.isArray(st.removed) ? st.removed : [], blocked: Array.isArray(st.blocked) ? st.blocked : [], collapsed: st.collapsed || {} };
  }
  function saveList() {
    const cs = Array.from(S.contacts.values());
    const prev = listState();
    set('friends', {
      removed: cs.length ? cs.filter((c) => c.removed).map((c) => c.id) : prev.removed,
      blocked: cs.length ? cs.filter((c) => c.blocked).map((c) => c.id) : prev.blocked,
      collapsed: M.collapsed || prev.collapsed,
    });
  }

  function makeContact(def, ls) {
    return {
      id: def.id, def, status: 'offline', pm: def.pms[0], song: null,
      blocked: ls.blocked.includes(def.id), removed: ls.removed.includes(def.id),
      bot: BOTS.create(def, host), queue: [], statusTimer: null, lastSignIn: 0,
    };
  }
  const contact = (id) => S.contacts.get(id);
  const visibleContacts = () => Array.from(S.contacts.values()).filter((c) => !c.removed);
  const friendStatusLabel = (c) => (c.blocked ? 'Blocked' : ST.label(c.status, true));
  const songText = (song) => '♫ ' + song[0] + ' - ' + song[1];
  const myPmText = () => {
    if (get('listening', true) && S.np) return '♫ ' + S.np.title + ' - ' + S.np.artist;
    return get('pm', '');
  };

  // ------------------------------------------------------------ main window
  const MAIN_OPTS = { width: 316, height: 600, minWidth: 272, minHeight: 460, glassBody: true, maximizable: false };
  M.signToken = 0;
  M.signTimers = [];

  function mountMain(win, args) {
    M.win = win;
    win.body.classList.add('bm-main');
    M.root = h('div.bm-main-root');
    win.body.appendChild(M.root);
    ensureAppListeners();
    const layer = A.wm.layer;
    if (layer && layer.clientWidth > 700) win.moveTo(Math.max(10, layer.clientWidth - win.rect.w - 30), Math.max(0, Math.min(24, layer.clientHeight - win.rect.h)));
    if (S.active) showList();
    else if (S.signingIn) showSigning();
    else showSignIn();
    if (!S.active && !S.signingIn && get('auto', false) && get('remember', true) && !M.autoTried) {
      M.autoTried = true;
      setTimeout(() => { if (M.win === win && !S.active && !S.signingIn) beginSignIn(get('status', 'online')); }, 700);
    }
    win.el.addEventListener('keydown', mainKeys);
    const ctrl = {
      onClose() {
        if (M.win !== win) return;
        M.win = null; M.view = null; M.refs = null;
        if (S.signingIn) cancelSignIn(true);
        if (S.active) {
          if (!get('tipShown', false)) {
            set('tipShown', true);
            A.notify({ title: 'Bubble Messenger is still running', text: 'Click the buddies in the notification area to open your contact list. Right-click them to sign out.', icon: 'icons/users' });
          }
        } else appIdle();
      },
      onArgs(a) {
        if (win.closed) return;
        win.focus();
        if (a && a.contact && S.active && contact(a.contact)) openConversation(a.contact, { focus: true });
      },
      onResize() { if (M.view === 'list') layoutList(); },
    };
    M.ctrl = ctrl;
    if (args && args.contact) M.pendingContact = args.contact;
    return ctrl;
  }

  // Opens (or focuses) the contact list, even when the app was launched from a conversation.
  function showMain() {
    if (M.win && !M.win.closed) {
      if (M.win.state === 'minimized') M.win.restore(); else M.win.focus();
      return M.win;
    }
    const def = A.apps.get('messenger');
    const win = A.wm.create(Object.assign({}, def.window, { app: 'messenger', title: def.name, icon: def.icon }));
    const ctrl = mountMain(win, {});
    win.ctrl = ctrl;
    win.on('close', () => { try { ctrl.onClose(); } catch (e) { console.error(e); } });
    win.on('resize', () => ctrl.onResize());
    return win;
  }

  function swap(view) {
    if (!M.root) return;
    M.root.innerHTML = '';
    M.root.appendChild(view);
    view.classList.add('bm-enter');
    requestAnimationFrame(() => requestAnimationFrame(() => view.classList.remove('bm-enter')));
  }

  function mainKeys(e) {
    if (M.view !== 'list' || A.util.isTyping(e)) return;
    const rows = M.refs ? Array.from(M.refs.list.querySelectorAll('.bm-row')) : [];
    if (!rows.length) return;
    let i = rows.findIndex((r) => r.classList.contains('selected'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      i = e.key === 'ArrowDown' ? Math.min(rows.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
      selectRow(rows[i]);
    } else if (e.key === 'Enter' && i >= 0) {
      e.preventDefault();
      openConversation(rows[i].dataset.id, { focus: true });
    } else if (e.key === 'Delete' && i >= 0) {
      e.preventDefault();
      deleteContact(rows[i].dataset.id);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      M.refs.search.focus();
    }
  }

  // ------------------------------------------------------------ sign in
  function showSignIn() {
    M.view = 'signin';
    M.refs = null;
    const name = userName();
    const remember = get('remember', true);
    const startStatus = STATUS_IDS.includes(get('status', 'online')) ? get('status', 'online') : 'online';
    const email = h('input.bm-si-input', { type: 'text', value: (remember && get('email', null)) || emailFor(name), spellcheck: false, 'aria-label': 'Email address', autocomplete: 'off', maxLength: 64 });
    const selOrb = orb(startStatus, 'bm-si-orb');
    const picture = dp(myPicture(), 104, startStatus, 'bm-si-dp');
    const statusSel = A.ui.select({
      options: MENU_STATUSES.map((id) => [id, ST.label(id)]), value: startStatus, label: 'Sign in as',
      onChange: (v) => { picture.update(null, v); selOrb.style.backgroundImage = `url("${orbUrl(v)}")`; },
    });
    statusSel.classList.add('bm-si-select');
    const rememberBox = A.ui.checkbox({ label: 'Remember me', checked: remember });
    const autoBox = A.ui.checkbox({ label: 'Sign me in automatically', checked: get('auto', false) });
    const go = () => {
      const rem = rememberBox.checked;
      set('remember', rem);
      set('auto', rem && autoBox.checked);
      set('email', rem ? email.value.trim() || null : null);
      set('status', statusSel.value);
      beginSignIn(statusSel.value);
    };
    const btn = A.ui.button('Sign in', { tone: 'aqua', size: 'lg', className: 'bm-si-btn', onClick: go });
    email.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    const picBtn = h('button.bm-si-picbtn', { type: 'button', 'aria-label': 'Change your display picture', 'data-tip': 'Change your display picture', onclick: () => changePicture() }, picture);
    const bubbles = h('div.bm-si-bubbles', { 'aria-hidden': 'true' },
      [[12, 16, 0, 9], [30, 10, -3, 7], [62, 22, -6, 11], [78, 12, -1.5, 8], [88, 18, -8, 10], [46, 9, -4.5, 6.5], [20, 13, -7, 9.5]].map(([x, s, d, t]) =>
        h('span.bm-si-bubble', { style: { left: x + '%', width: s + 'px', height: s + 'px', animationDelay: d + 's', animationDuration: t + 's' } }, A.img('decorative/bubble-single'))));
    const view = h('div.bm-view.bm-signin', null,
      h('div.bm-si-brand', null, ART.buddiesLogo('bm-si-logo'), h('span.bm-si-title', null, 'Bubble Messenger')),
      h('div.bm-si-hero', null, bubbles, h('div.bm-si-glow'), picBtn),
      h('div.bm-si-name', null, name),
      h('div.bm-si-card', null,
        h('label.bm-si-field', null, h('span.bm-si-label', null, 'Email address:'), email),
        h('div.bm-si-field', null, h('span.bm-si-label', null, 'Sign in as:'), h('span.bm-si-status', null, selOrb, statusSel)),
        h('div.bm-si-checks', null, rememberBox, autoBox)),
      h('div.bm-si-actions', null, btn),
      h('div.bm-si-foot', null,
        h('button.ae-link', { type: 'button', onclick: () => changePicture() }, 'Change display picture'),
        h('span.bm-si-dot', null, '•'),
        h('button.ae-link', { type: 'button', onclick: about }, 'About')));
    swap(view);
    setTimeout(() => { if (M.view === 'signin' && btn.isConnected) btn.focus(); }, 80);
  }

  const SIGN_STEPS = ['Connecting to the Bubble network...', 'Finding your friends...', 'Getting your contact list...', 'Blowing a few bubbles...'];
  function beginSignIn(status) {
    if (S.active || S.signingIn) return;
    S.signingIn = true;
    M.signStatus = status;
    M.signStep = 0;
    const token = ++M.signToken;
    if (M.win) showSigning();
    const t = (ms, fn) => M.signTimers.push(setTimeout(() => { if (token === M.signToken) fn(); }, ms));
    SIGN_STEPS.forEach((_, i) => t(i * 650, () => { M.signStep = i; if (M.refs && M.refs.step) M.refs.step.textContent = SIGN_STEPS[i]; }));
    t(SIGN_STEPS.length * 650 + 350, () => {
      S.signingIn = false;
      M.signTimers = [];
      startSession(status);
    });
  }
  function cancelSignIn(silent) {
    S.signingIn = false;
    M.signToken++;
    M.signTimers.forEach(clearTimeout);
    M.signTimers = [];
    if (!silent && M.win) showSignIn();
  }
  function showSigning() {
    M.view = 'signing';
    const step = h('div.bm-sg-step', { role: 'status' }, SIGN_STEPS[M.signStep || 0]);
    const view = h('div.bm-view.bm-signing', null,
      h('div.bm-si-brand', null, ART.buddiesLogo('bm-si-logo'), h('span.bm-si-title', null, 'Bubble Messenger')),
      h('div.bm-sg-center', null,
        ART.buddiesSpinner(),
        h('div.bm-sg-title', null, 'Signing in...'),
        h('div.bm-sg-email', null, (get('remember', true) && get('email', null)) || emailFor(userName())),
        step),
      h('div.bm-si-actions', null, A.ui.button('Cancel', { onClick: () => cancelSignIn() })));
    M.refs = { step };
    swap(view);
  }

  // ------------------------------------------------------------ contact list
  const TIPS = [
    ['icons/help', 'Say hi to AskBubbles to learn what Aerium can do.', () => openConversation('askbubbles', { focus: true })],
    ['icons/users', 'Right-click a friend to send a nudge or see their profile.', null],
    ['icons/music', 'Play a song in Media Player and friends will see what you\'re listening to.', () => { if (A.apps.get('mediaplayer')) A.apps.launch('mediaplayer'); }],
    ['icons/star', 'Winks are little animations. Find them in any conversation.', null],
    ['icons/photo', 'Decorate your contact list with a new scene.', () => changeScene()],
    ['icons/heart', 'Grandma loves winks. Send her one!', () => { if (contact('grandma') && !contact('grandma').removed) openConversation('grandma', { focus: true }); }],
  ];

  function showList() {
    M.view = 'list';
    M.collapsed = listState().collapsed;
    const pic = dp(myPicture(), 64, S.status, 'bm-me-dp');
    const picBtn = h('button.bm-me-picbtn', { type: 'button', 'aria-label': 'Change your display picture', 'data-tip': 'Change your display picture', onclick: () => changePicture() }, pic);
    const statusText = h('span.bm-me-status');
    const nameBtn = h('button.bm-me-name', { type: 'button', 'aria-haspopup': 'menu', 'data-tip': 'Change your status' },
      h('span.bm-me-nick'), statusText, svgEl(GLYPH.caret, 'bm-caret'));
    nameBtn.addEventListener('click', () => statusMenu(nameBtn));
    const pmInput = h('input.bm-pm', { type: 'text', placeholder: 'Share a quick message', maxLength: 90, spellcheck: false, 'aria-label': 'Personal message', value: get('pm', '') });
    const pmSong = h('button.bm-pm-song', { type: 'button', 'data-tip': 'Click to type a personal message instead' });
    pmSong.addEventListener('click', () => { M.editingPm = true; updateMe(); pmInput.focus(); pmInput.select(); });
    const savePm = () => {
      const v = pmInput.value.trim();
      if (v !== get('pm', '')) {
        set('pm', v);
        friendsNoticePm(v);
      }
      M.editingPm = false;
      updateMe();
    };
    pmInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); pmInput.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); pmInput.value = get('pm', ''); pmInput.blur(); }
    });
    pmInput.addEventListener('blur', savePm);
    pmInput.addEventListener('focus', () => { M.editingPm = true; });
    const listenBtn = h('button.bm-me-tool.bm-listen', { type: 'button', 'aria-label': 'Show what I\'m listening to', 'data-tip': 'Show what I\'m listening to' }, svgEl(GLYPH.note));
    listenBtn.addEventListener('click', toggleListening);
    const menuBtn = h('button.bm-me-tool', { type: 'button', 'aria-label': 'Menu', 'data-tip': 'Menu' }, svgEl(GLYPH.menu));
    menuBtn.addEventListener('click', () => mainMenu(menuBtn));
    const me = h('div.bm-me', null,
      h('div.bm-me-scene', { 'aria-hidden': 'true' }),
      h('div.bm-me-row', null, picBtn,
        h('div.bm-me-info', null, nameBtn, h('div.bm-pm-wrap', null, pmInput, pmSong, listenBtn))),
      h('div.bm-me-tools', null, menuBtn));

    const search = h('input.bm-search-input', { type: 'search', placeholder: 'Find a contact...', 'aria-label': 'Find a contact', spellcheck: false, autocomplete: 'off' });
    search.addEventListener('input', renderList);
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && search.value) { e.preventDefault(); e.stopPropagation(); search.value = ''; renderList(); }
      else if (e.key === 'Enter') { const first = list.querySelector('.bm-row'); if (first) openConversation(first.dataset.id, { focus: true }); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); const first = list.querySelector('.bm-row'); if (first) { selectRow(first); M.win.el.focus(); } }
    });
    const addBtn = h('button.bm-add-btn', { type: 'button', 'aria-label': 'Add a contact', 'data-tip': 'Add a contact' }, svgEl(GLYPH.plus));
    addBtn.addEventListener('click', addContact);
    const bar = h('div.bm-bar', null, h('label.bm-search', null, svgEl('<svg viewBox="0 0 16 16" width="13" height="13"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 10l4 4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>', 'bm-search-glyph'), search), addBtn);
    const list = h('div.bm-contacts', { role: 'list', 'aria-label': 'Contacts' });
    const tipIcon = h('img.bm-today-icon', { alt: '' });
    const tipText = h('span.bm-today-text');
    const today = h('button.bm-today', { type: 'button' }, tipIcon, tipText);
    today.addEventListener('click', () => { const tip = TIPS[M.tip % TIPS.length]; if (tip[2]) tip[2](); else nextTip(); });
    const view = h('div.bm-view.bm-list', null, me, bar, list, today);
    M.refs = { pic, nameBtn, statusText, pmInput, pmSong, listenBtn, me, search, list, tipIcon, tipText, today };
    swap(view);
    M.tip = Math.floor(Math.random() * TIPS.length) - 1;
    nextTip();
    updateMe();
    renderList();
    if (M.pendingContact && contact(M.pendingContact)) { openConversation(M.pendingContact, { focus: true }); M.pendingContact = null; }
  }
  function layoutList() { /* the list is pure flexbox; nothing to measure */ }

  function nextTip() {
    if (!M.refs || !M.refs.today) return;
    M.tip = (M.tip + 1) % TIPS.length;
    const [icon, text] = TIPS[M.tip];
    M.refs.tipIcon.src = A.asset(icon);
    M.refs.tipText.textContent = text;
    M.refs.today.classList.remove('bm-tip-in');
    void M.refs.today.offsetWidth;
    M.refs.today.classList.add('bm-tip-in');
    cancel(M.tipTimer);
    M.tipTimer = later(15000, nextTip);
  }

  function updateMe() {
    const r = M.refs;
    if (!r || M.view !== 'list') return;
    r.me.style.setProperty('--bm-scene', sceneUrl(myScene()));
    r.pic.update(myPicture(), S.status);
    const nick = r.nameBtn.querySelector('.bm-me-nick');
    nick.innerHTML = '';
    nick.appendChild(E.render(userName(), { size: 16, breaks: false }));
    r.statusText.textContent = '(' + ST.label(S.status) + ')';
    const listening = get('listening', true);
    r.listenBtn.classList.toggle('active', listening);
    r.listenBtn.setAttribute('aria-pressed', String(listening));
    const song = listening && S.np && !M.editingPm;
    r.pmSong.hidden = !song;
    r.pmInput.hidden = !!song;
    if (song) r.pmSong.textContent = myPmText();
    if (document.activeElement !== r.pmInput) r.pmInput.value = get('pm', '');
  }

  function byName(a, b) { return a.def.name.localeCompare(b.def.name); }
  function renderList() {
    const r = M.refs;
    if (!r || M.view !== 'list') return;
    const q = r.search.value.trim().toLowerCase();
    const cs = visibleContacts().filter((c) => !q || [c.def.name, c.def.full, c.def.screen, c.def.email, c.pm].some((v) => String(v || '').toLowerCase().includes(q)));
    const on = cs.filter((c) => c.status !== 'offline').sort(byName);
    const off = cs.filter((c) => c.status === 'offline').sort(byName);
    const sel = r.list.querySelector('.bm-row.selected');
    const selId = sel && sel.dataset.id;
    const scroll = r.list.scrollTop;
    r.list.innerHTML = '';
    [['online', 'Online', on], ['offline', 'Offline', off]].forEach(([key, label, arr]) => {
      const collapsed = !!M.collapsed[key];
      const head = h('button.bm-group-head', { type: 'button', 'aria-expanded': String(!collapsed) }, h('span.bm-group-arrow', null, collapsed ? '▸' : '▾'), h('span', null, label + ' (' + arr.length + ')'));
      head.addEventListener('click', () => { M.collapsed[key] = !collapsed; saveList(); renderList(); });
      const body = h('div.bm-group-body', { hidden: collapsed });
      arr.forEach((c) => body.appendChild(contactRow(c)));
      r.list.appendChild(h('div.bm-group', { dataset: { group: key } }, head, body));
    });
    if (q && !cs.length) r.list.appendChild(h('div.bm-empty', null, 'No contacts match "' + r.search.value.trim() + '".'));
    if (selId) { const row = r.list.querySelector('.bm-row[data-id="' + selId + '"]'); if (row) row.classList.add('selected'); }
    r.list.scrollTop = scroll;
  }

  function contactRow(c) {
    const st = c.blocked ? 'blocked' : c.status;
    const song = c.song && c.status !== 'offline';
    const line2 = song ? h('span.bm-row-pm.bm-song', null, songText(c.song)) : c.pm ? h('span.bm-row-pm', null, E.render(c.pm, { size: 14, breaks: false })) : null;
    const el = h('div.bm-row', { class: 'bm-rs-' + frameKind(st), dataset: { id: c.id }, tabIndex: -1, role: 'listitem', 'data-tip-title': c.def.name, 'data-tip': c.def.email + ' ' + friendStatusLabel(c) },
      dp(c.def.picture, 34, st, 'bm-row-dp'),
      h('div.bm-row-text', null,
        h('div.bm-row-line1', null, orb(st, 'bm-row-orb'), h('span.bm-row-name', null, E.render(c.def.screen, { size: 16, breaks: false })),
          c.status !== 'online' || c.blocked ? h('span.bm-row-status', null, '(' + friendStatusLabel(c) + ')') : null),
        line2));
    el.addEventListener('click', () => selectRow(el));
    el.addEventListener('dblclick', () => openConversation(c.id, { focus: true }));
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); selectRow(el); contactMenu(c.id, e.clientX, e.clientY); });
    return el;
  }
  function selectRow(el) {
    if (!el || !M.refs) return;
    M.refs.list.querySelectorAll('.bm-row.selected').forEach((r) => r.classList.remove('selected'));
    el.classList.add('selected');
    el.scrollIntoView({ block: 'nearest' });
  }

  // Refreshes every place a friend appears: list, open conversation, profile orbs.
  function refreshContact(c) {
    renderList();
    const conv = S.convs.get(c.id);
    if (conv && conv.win) updateConvHeader(conv);
  }

  function statusMenu(anchor) {
    const r = anchor.getBoundingClientRect();
    const items = MENU_STATUSES.map((id) => ({ label: ST.label(id), icon: orbUrl(id), bold: id === S.status, onClick: () => setMyStatus(id) }));
    items.push({ separator: true },
      { label: 'Change display picture...', onClick: () => changePicture() },
      { label: 'Change scene...', onClick: () => changeScene() },
      { separator: true },
      { label: 'Sign out', onClick: () => signOut() });
    A.ui.menu(items, r.left, r.bottom + 2);
  }

  function mainMenu(anchor) {
    const r = anchor.getBoundingClientRect();
    A.ui.menu([
      { label: 'Add a contact...', icon: 'icons/plus', onClick: addContact },
      { label: 'Change display picture...', icon: 'icons/photo', onClick: () => changePicture() },
      { label: 'Change scene...', icon: 'icons/mountain', onClick: () => changeScene() },
      { separator: true },
      { label: 'Show what I\'m listening to', checked: get('listening', true), onClick: toggleListening },
      { label: 'Play sounds', checked: get('sounds', true), onClick: () => set('sounds', !get('sounds', true)) },
      { label: 'Show alerts when friends sign in', checked: get('alerts', true), onClick: () => set('alerts', !get('alerts', true)) },
      { separator: true },
      { label: 'About Bubble Messenger', onClick: about },
      { label: 'Sign out', onClick: () => signOut() },
      { label: 'Exit', onClick: exitApp },
    ], r.right - 200, r.bottom + 2);
  }

  function contactMenu(id, x, y) {
    const c = contact(id);
    if (!c) return;
    A.ui.menu([
      { label: 'Send an instant message', bold: true, icon: 'icons/chat', onClick: () => openConversation(id, { focus: true }) },
      { label: 'Send a nudge', disabled: c.status === 'offline' || c.blocked, onClick: () => { const conv = openConversation(id, { focus: true }); if (conv) setTimeout(() => sendNudge(conv), 250); } },
      { label: 'View profile', icon: 'icons/user', onClick: () => viewProfile(id) },
      { separator: true },
      { label: c.blocked ? 'Unblock' : 'Block', icon: 'icons/shield', onClick: () => toggleBlock(id) },
      { label: 'Delete contact', icon: 'icons/trash', onClick: () => deleteContact(id) },
    ], x, y);
  }

  function toggleListening() {
    set('listening', !get('listening', true));
    M.editingPm = false;
    updateMe();
  }

  // ------------------------------------------------------------ dialogs
  function about() {
    A.ui.messageBox({
      parent: M.win || undefined, title: 'About Bubble Messenger', icon: 'icons/users', instruction: 'Bubble Messenger',
      message: 'Version 8.5 (Build 2008)\n\nStay close to the people you care about. Chat, send nudges and winks, and share what you\'re listening to.\n\nThis product is licensed to:\n' + userName(),
      sound: false,
    });
  }

  function viewProfile(id, parent) {
    const c = contact(id);
    if (!c) return;
    const d = c.def, st = c.blocked ? 'blocked' : c.status;
    const rows = [['Email', d.email], ['Friends since', d.since]].concat(d.favorites || []);
    const content = h('div.bm-profile', null,
      h('div.bm-pf-head', { style: { '--bm-scene': sceneUrl(d.scene) } },
        dp(d.picture, 88, st, 'bm-pf-dp'),
        h('div.bm-pf-who', null,
          h('div.bm-pf-name', null, E.render(d.screen, { size: 18, breaks: false })),
          h('div.bm-pf-real', null, d.full + '  ·  ' + d.role),
          h('div.bm-pf-status', null, orb(st), h('span', null, friendStatusLabel(c))))),
      h('div.bm-pf-body', null,
        c.song && c.status !== 'offline' ? h('div.bm-pf-pm.bm-song', null, songText(c.song)) : c.pm ? h('div.bm-pf-pm', null, E.render(c.pm, { size: 16 })) : null,
        h('p.bm-pf-about', null, d.about),
        h('table.bm-pf-table', null, h('tbody', null, rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v)))))));
    A.ui.dialog({
      title: d.name + '\'s profile', icon: 'icons/user', content, width: 400, parent: parent || M.win || undefined,
      buttons: [{ label: 'Send a message', default: true, value: 'msg' }, { label: 'Close', cancel: true, value: null }],
    }).then((v) => { if (v === 'msg') openConversation(id, { focus: true }); });
  }

  function changePicture(parent) {
    let chosen = get('picture', null);
    const own = A.store.get('user.avatar') || 'avatars/avatar-fish';
    const preview = dp(myPicture(), 96, S.active ? S.status : 'online', 'bm-picdlg-dp');
    const grid = h('div.bm-pic-grid', { role: 'listbox', 'aria-label': 'Display pictures' });
    [null].concat(ART.PICTURES).forEach((key) => {
      const k = key || own;
      const b = h('button.bm-pic-opt', { type: 'button', role: 'option', class: key === chosen ? 'selected' : '', 'aria-label': key ? 'Picture' : 'My Aerium picture', 'data-tip': key ? null : 'Use my Aerium account picture' },
        h('img', { src: ART.pictureUrl(k), alt: '' }), key ? null : h('span.bm-pic-badge', null, 'Mine'));
      b.addEventListener('click', () => {
        chosen = key;
        grid.querySelectorAll('.bm-pic-opt').forEach((x) => x.classList.toggle('selected', x === b));
        preview.update(k);
      });
      b.addEventListener('dblclick', () => { const ok = b.closest('.win') && b.closest('.win').querySelector('.ae-default'); if (ok) ok.click(); });
      grid.appendChild(b);
    });
    const content = h('div.bm-picdlg', null,
      h('div.bm-picdlg-side', null, preview, h('div.bm-picdlg-note', null, 'This is how your friends will see you.')),
      h('div.bm-picdlg-main', null, h('div.bm-picdlg-title', null, 'Pick a display picture'), grid));
    A.ui.dialog({ title: 'Display picture', icon: 'icons/photo', content, width: 540, parent: parent || M.win || undefined, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] })
      .then((v) => { if (v === 'ok') { set('picture', chosen); refreshMyPicture(); } });
  }
  function refreshMyPicture() {
    if (M.view === 'list') updateMe();
    else if (M.view === 'signin' && M.win) showSignIn();
    S.convs.forEach((conv) => { if (conv.win) updateConvSelf(conv); });
  }

  function changeScene() {
    let chosen = get('scene', 'auto');
    const grid = h('div.bm-scene-grid', { role: 'listbox', 'aria-label': 'Scenes' });
    ['auto'].concat(SCENES).forEach((key) => {
      const k = key === 'auto' ? THEME_SCENE[A.theme.current] || THEME_SCENE.light : key;
      const b = h('button.bm-scene-opt', { type: 'button', role: 'option', class: key === chosen ? 'selected' : '', style: { backgroundImage: sceneUrl(k) }, 'aria-label': key === 'auto' ? 'Match my theme' : key.split('/')[1] },
        key === 'auto' ? h('span.bm-scene-badge', null, 'Match my theme') : null);
      b.addEventListener('click', () => { chosen = key; grid.querySelectorAll('.bm-scene-opt').forEach((x) => x.classList.toggle('selected', x === b)); });
      grid.appendChild(b);
    });
    const content = h('div.bm-scenedlg', null, h('div.bm-picdlg-title', null, 'Pick a scene for the top of your contact list'), grid);
    A.ui.dialog({ title: 'Scene', icon: 'icons/mountain', content, width: 520, parent: M.win || undefined, buttons: [{ label: 'OK', default: true, value: 'ok' }, { label: 'Cancel', cancel: true, value: null }] })
      .then((v) => { if (v === 'ok') { set('scene', chosen); updateMe(); } });
  }

  function addContact() {
    if (!S.active) return;
    const removed = Array.from(S.contacts.values()).filter((c) => c.removed);
    const field = A.ui.textField({ label: 'Their email address:', placeholder: 'name@aerium.net' });
    field.classList.add('bm-add-field');
    const msg = h('div.bm-add-msg', { role: 'status' });
    const chips = removed.length
      ? h('div.bm-add-list', null, h('div.bm-add-sub', null, 'Friends you deleted:'), removed.map((c) => {
        const b = h('button.bm-add-chip', { type: 'button' }, dp(c.def.picture, 26, 'offline'), h('span.bm-add-name', null, c.def.name), h('span.bm-add-mail', null, c.def.email));
        b.addEventListener('click', () => { field.input.value = c.def.email; field.input.focus(); msg.textContent = ''; });
        return b;
      }))
      : h('div.bm-add-sub', null, 'Everyone you know is already on your list. Nice!');
    const content = h('div.bm-add', null, h('div.bm-add-intro', null, 'Type the email address of a friend or family member you want to chat with.'), field, msg, chips);
    A.ui.dialog({
      title: 'Add a contact', icon: 'icons/users', content, width: 420, parent: M.win || undefined,
      buttons: [{
        label: 'Add contact', default: true, value: 'add',
        onClick: () => {
          const v = field.input.value.trim().toLowerCase();
          const c = Array.from(S.contacts.values()).find((x) => x.def.email === v || x.def.name.toLowerCase() === v);
          if (!v) { msg.textContent = 'Type an email address first.'; return false; }
          if (c && !c.removed) { msg.textContent = c.def.name + ' is already on your contact list.'; return false; }
          if (!c) { msg.textContent = 'Nobody on the Bubble network uses that address. Check the spelling and try again.'; return false; }
          c.removed = false;
          saveList();
          renderList();
          play('ding');
          return true;
        },
      }, { label: 'Cancel', cancel: true, value: null }],
    });
  }

  async function toggleBlock(id) {
    const c = contact(id);
    if (!c) return;
    const conv = S.convs.get(id);
    if (c.blocked) {
      c.blocked = false;
      saveList();
      if (c.pm === c.bot.blockedPm()) c.pm = pick(c.def.pms);
      refreshContact(c);
      if (conv) { addSystem(conv, 'You unblocked ' + c.def.name + '. You can chat again.', 'info'); updateCompose(conv); }
      return;
    }
    const r = await A.ui.messageBox({
      parent: M.win || undefined, title: 'Bubble Messenger', icon: 'icons/shield', instruction: 'Block ' + c.def.name + '?',
      message: c.def.name + ' won\'t be able to see when you\'re online or send you messages. Bubble Messenger won\'t tell them.\n\n(They\'ll probably notice anyway. They always do.)',
      buttons: [{ label: 'Block', value: 'block', default: true }, { label: 'Cancel', value: null, cancel: true }],
    });
    if (r !== 'block' || !S.active) return;
    c.blocked = true;
    saveList();
    refreshContact(c);
    if (conv) { conv.token++; setTyping(conv, false); addSystem(conv, 'You blocked ' + c.def.name + '. Unblock them to chat again.', 'block'); updateCompose(conv); }
    // The joke: a few seconds later their personal message gets a little dramatic.
    later(rand(6000, 11000), () => { if (c.blocked && c.status !== 'offline') { c.pm = c.bot.blockedPm(); c.song = null; refreshContact(c); } });
  }

  async function deleteContact(id) {
    const c = contact(id);
    if (!c) return;
    const r = await A.ui.messageBox({
      parent: M.win || undefined, title: 'Delete contact', icon: 'question', instruction: 'Delete ' + c.def.name + ' from your contact list?',
      message: 'You can add them back any time with "Add a contact".',
      buttons: [{ label: 'Delete contact', value: 'del', default: true }, { label: 'Cancel', value: null, cancel: true }],
    });
    if (r !== 'del' || !S.active) return;
    c.removed = true;
    saveList();
    const conv = S.convs.get(id);
    if (conv && conv.win) conv.win.close();
    renderList();
  }

  // ------------------------------------------------------------ session
  function startSession(status) {
    S.sid++;
    S.active = true;
    S.status = STATUS_IDS.includes(status) ? status : 'online';
    S.startedAt = Date.now();
    S.lastOpener = Date.now();
    S.ritualDone = false;
    memory = get('memory', {}) || {};
    const ls = listState();
    S.contacts = new Map();
    NS.friends.forEach((def) => {
      const c = makeContact(def, ls);
      c.status = BOTS.pickStart(def);
      c.pm = chance(0.7) ? def.pms[0] : pick(def.pms);
      if (def.songs.length && c.status !== 'offline' && chance(0.35)) c.song = pick(def.songs);
      S.contacts.set(def.id, c);
    });
    S.convs = new Map();
    ensureAppListeners();
    const cur = A.music && A.music.state === 'playing' && A.music.current;
    if (cur && !String(cur.id || '').startsWith('video:')) S.np = { title: cur.title, artist: cur.artist || 'Unknown artist', id: cur.id };
    addTray();
    play('signin');
    if (M.win && !M.win.closed) showList();
    scriptOpening();
    scheduleTick();
  }

  function signOut(o = {}) {
    if (S.signingIn) cancelSignIn(true);
    if (!S.active) return;
    S.active = false;
    S.sid++;
    clearTimers();
    const convs = Array.from(S.convs.values());
    S.convs = new Map();
    convs.forEach((conv) => { stopPlans(conv); if (conv.win && !conv.win.closed) conv.win.close(true); });
    if (S.tray) { S.tray.remove(); S.tray = null; }
    saveMemory();
    if (!o.silent) play('signout');
    if (M.win && !M.win.closed) showSignIn();
    else appIdle();
  }

  function exitApp() {
    signOut();
    if (M.win && !M.win.closed) M.win.close();
    appIdle();
  }

  // App-wide listeners live while the contact list is open or you're signed in.
  function ensureAppListeners() {
    if (M.appOffs) return;
    M.appOffs = [
      A.bus.on('media:nowplaying', onNowPlaying),
      A.bus.on('media:stopped', () => { S.np = null; updateMe(); }),
      A.bus.on('theme:change', () => { updateMe(); S.convs.forEach((cv) => { if (cv.win) updateConvHeader(cv); }); }),
      A.store.on('user.name', () => { if (M.view === 'list') updateMe(); else if (M.view === 'signin' && M.win) showSignIn(); }),
      A.store.on('user.avatar', () => refreshMyPicture()),
      A.bus.on('shell:stop', () => { if (S.active) signOut({ silent: true }); }),
    ];
  }
  function appIdle() {
    if (S.active || S.signingIn || (M.win && !M.win.closed)) return;
    (M.appOffs || []).forEach((off) => { try { off(); } catch (e) { /* already gone */ } });
    M.appOffs = null;
  }

  // ------------------------------------------------------------ tray
  const trayTip = () => 'Bubble Messenger - ' + ST.label(S.status);
  function addTray() {
    if (S.tray || !A.taskbar || !A.taskbar.addTrayIcon) return;
    S.trayEl = h('span.bm-tray', null, A.img('icons/users'), h('i.bm-tray-orb'));
    S.tray = A.taskbar.addTrayIcon({ id: 'messenger', icon: S.trayEl, tip: trayTip(), onClick: () => showMain(), onContext: (btn) => trayMenu(btn) });
    updateTray();
  }
  function updateTray() {
    if (!S.tray) return;
    S.trayEl.querySelector('.bm-tray-orb').style.backgroundImage = `url("${orbUrl(S.status)}")`;
    S.tray.setTip(trayTip());
    if (S.tray.el) S.tray.el.setAttribute('aria-label', trayTip());
  }
  function trayMenu(btn) {
    const r = btn.getBoundingClientRect();
    A.ui.menu([
      { label: 'Open Bubble Messenger', bold: true, icon: 'icons/users', onClick: () => showMain() },
      { label: 'My status', submenu: MENU_STATUSES.map((id) => ({ label: ST.label(id), icon: orbUrl(id), bold: id === S.status, onClick: () => setMyStatus(id) })) },
      { separator: true },
      { label: 'Sign out', onClick: () => signOut() },
      { label: 'Exit', onClick: exitApp },
    ], r.left - 80, r.top, { anchorTop: r.top - 2 });
  }

  function setMyStatus(id) {
    if (!S.active || !STATUS_IDS.includes(id)) return;
    const prev = S.status;
    if (prev === id) return;
    S.status = id;
    set('status', id);
    updateMe();
    updateTray();
    S.convs.forEach((conv) => { if (conv.win) updateConvSelf(conv); });
    if (prev === 'offline') friendsNoticeYou();
  }

  // ------------------------------------------------------------ the living contact list
  const canMessageYou = () => S.active && S.status !== 'offline' && A.shellReady !== false;
  const isChatting = (c) => { const cv = S.convs.get(c.id); return !!(cv && (cv.replying || (cv.win && Date.now() - cv.lastActivity < 90000))); };
  function weighted(list) {
    const total = list.reduce((s, x) => s + x[1], 0);
    let r = Math.random() * total;
    for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; }
    return list.length ? list[list.length - 1][0] : null;
  }

  function scriptOpening() {
    later(rand(6500, 9000), () => {
      const k = contact('kayla');
      if (canMessageYou() && k && k.status !== 'offline' && !k.blocked && !k.removed) friendOpens(k);
    });
    later(rand(15000, 21000), () => { const j = contact('jordan'); if (j && j.status === 'offline' && !j.removed) friendSignsIn(j, 'online'); });
    later(rand(36000, 46000), () => {
      const g = contact('grandma');
      if (!g || g.removed || g.status !== 'offline') return;
      friendSignsIn(g, 'online');
      later(rand(11000, 16000), () => { if (canMessageYou() && g.status !== 'offline' && !g.blocked && !isChatting(g)) friendOpens(g); });
    });
  }

  function scheduleTick() { later(rand(22000, 42000), () => { tick(); scheduleTick(); }); }
  function tick() {
    if (!S.active || A.shellReady === false) return;
    const cs = visibleContacts().filter((c) => !c.def.bot);
    const offline = cs.filter((c) => c.status === 'offline');
    const online = cs.filter((c) => c.status !== 'offline');
    const quiet = online.filter((c) => !isChatting(c));
    const events = [];
    if (offline.length && online.length < 8) events.push(['signin', 3]);
    if (quiet.length > 3 && Date.now() - S.startedAt > 90000) events.push(['signout', 1]);
    if (quiet.length) events.push(['status', 3], ['pm', 2]);
    const openerW = S.status === 'offline' ? 0 : S.status === 'busy' || S.status === 'phone' ? 0.6 : 2.2;
    const openers = quiet.filter((c) => c.status === 'online' && !c.blocked && c.def.opener);
    if (openerW && openers.length && Date.now() - S.lastOpener > 80000) events.push(['opener', openerW]);
    const marcus = contact('marcus');
    if (!S.ritualDone && marcus && !marcus.removed && !marcus.blocked && marcus.status !== 'offline' && !isChatting(marcus) && Date.now() - S.startedAt > 120000) events.push(['ritual', 0.4]);
    const ev = weighted(events);
    if (ev === 'signin') friendSignsIn(pick(offline));
    else if (ev === 'signout') friendSignsOut(pick(quiet.filter((c) => c.id !== 'kayla' || Date.now() - S.startedAt > 300000)) || quiet[0]);
    else if (ev === 'status') {
      const c = pick(quiet);
      if (c.status === 'online') setFriendStatus(c, weighted([['away', 3], ['brb', 2], ['busy', 2], ['lunch', 1], ['phone', c.id === 'mom' ? 3 : 0.3]]), rand(40000, 150000));
      else friendReturns(c);
    } else if (ev === 'pm') {
      const c = pick(quiet);
      if (c.def.songs.length && chance(0.5)) c.song = c.song ? null : pick(c.def.songs);
      else if (!c.blocked) { c.pm = pick(c.def.pms.filter((p) => p !== c.pm)) || c.pm; c.song = null; }
      refreshContact(c);
    } else if (ev === 'opener') {
      friendOpens(weighted(openers.map((c) => [c, c.def.opener])));
    } else if (ev === 'ritual') ritual();
  }

  function toastSignIn(c) {
    if (!get('alerts', true) || c.blocked || A.shellReady === false) return;
    A.notify.toast({
      title: plain(c.def.screen), text: 'has just signed in.', avatar: ART.pictureUrl(c.def.picture), app: 'Bubble Messenger', appIcon: 'icons/users',
      sound: get('sounds', true) ? 'signin' : false, onClick: () => openConversation(c.id, { focus: true }),
    });
  }

  function friendSignsIn(c, status) {
    if (!S.active || !c || c.status !== 'offline' || c.removed) return;
    c.status = status || (chance(0.8) ? 'online' : pick(['away', 'busy']));
    c.lastSignIn = Date.now();
    c.song = c.def.songs.length && chance(0.3) ? pick(c.def.songs) : null;
    if (!c.blocked && c.pm === c.bot.blockedPm()) c.pm = pick(c.def.pms);
    refreshContact(c);
    toastSignIn(c);
    const conv = S.convs.get(c.id);
    if (conv) { conv.notices.offline = false; addSystem(conv, c.def.name + ' has signed in.', 'info'); }
    // Messages you sent while they were offline get delivered, and answered.
    if (c.queue.length && !c.blocked) {
      const text = c.queue.splice(0).join('\n');
      later(rand(3500, 6500), () => {
        if (c.status === 'offline') { c.queue.unshift(text); return; }
        const cv = getConv(c.id);
        runPlan(cv, c.bot.reply(text, replyCtx()));
      });
    }
  }

  function friendSignsOut(c) {
    if (!c || c.status === 'offline') return;
    cancel(c.statusTimer);
    c.statusTimer = null;
    c.status = 'offline';
    c.song = null;
    c.saidAway = false;
    const conv = S.convs.get(c.id);
    if (conv) {
      stopPlans(conv);
      if (conv.pending.length) { c.queue.push(...conv.pending); conv.pending = []; }
      addSystem(conv, c.def.name + ' has signed out. Messages you send will be delivered when they sign back in.', 'info');
    }
    refreshContact(c);
  }

  function setFriendStatus(c, status, backAfter) {
    if (!c || c.status === 'offline') return;
    cancel(c.statusTimer);
    c.statusTimer = null;
    c.status = status;
    refreshContact(c);
    if (backAfter) c.statusTimer = later(backAfter, () => friendReturns(c));
    if (status === 'online') flushAfterReturn(c);
  }

  function friendReturns(c) {
    if (!S.active || !c || c.status === 'offline') return;
    cancel(c.statusTimer);
    c.statusTimer = null;
    c.status = 'online';
    refreshContact(c);
    flushAfterReturn(c);
  }
  function flushAfterReturn(c) {
    const conv = S.convs.get(c.id);
    if (!conv) return;
    conv.notices.status = null;
    if (!conv.pending.length && !c.saidAway) return;
    let acts = c.saidAway || conv.pending.length ? c.bot.returnLine() : [];
    c.saidAway = false;
    if (conv.pending.length) acts = acts.concat(c.bot.reply(conv.pending.splice(0).join('\n'), replyCtx()));
    runPlan(conv, acts);
  }
  // A friend who's away comes back sooner when you message them.
  function ensureReturn(c, conv) {
    if (c.status === 'phone' && !conv.notices.phoneReply) {
      conv.notices.phoneReply = true;
      runPlan(conv, c.bot.plan(c.def.style === 'mom' ? 'On a call, sweetie! Give me five minutes. :-)' : c.def.style === 'grandma' ? 'on the telephone dear, one minute' : 'on the phone, one sec!'));
    }
    if (conv.returnSoon) return;
    conv.returnSoon = true;
    const back = chance(0.8) ? rand(15000, 40000) : rand(50000, 90000);
    cancel(c.statusTimer);
    c.statusTimer = later(back, () => { conv.returnSoon = false; friendReturns(c); });
  }

  function friendOpens(c) {
    if (!c || !canMessageYou() || c.blocked || c.removed || c.status === 'offline') return;
    const conv = getConv(c.id);
    if (conv.replying || conv.pending.length) return;
    // No "hey, you're on!" when you're already talking.
    if (conv.history.some((it) => it.kind === 'msg') && Date.now() - conv.lastActivity < 300000) return;
    S.lastOpener = Date.now();
    runPlan(conv, c.bot.opener());
  }

  // Marcus signs out and back in to get noticed, then brags about it.
  function ritual() {
    const m = contact('marcus');
    if (!m) return;
    S.ritualDone = true;
    const step = (i) => {
      if (!S.active || m.removed || m.blocked) return;
      if (i >= 3) {
        later(3500, () => { if (canMessageYou() && m.status !== 'offline') runPlan(getConv('marcus'), m.bot.plan(['lol did u see me sign in like 5 times', 'i was testing the pop-up thingy XD'])); });
        return;
      }
      friendSignsOut(m);
      later(2200, () => { friendSignsIn(m, 'online'); later(3000, () => step(i + 1)); });
    };
    step(0);
  }

  function friendsNoticeYou() {
    const k = contact('kayla');
    if (!k || k.blocked || k.removed || k.status === 'offline' || !chance(0.6)) return;
    later(rand(2500, 5000), () => { const acts = k.bot.onUserSignedIn(); if (acts && canMessageYou()) runPlan(getConv('kayla'), acts); });
  }
  function friendsNoticePm(pm) {
    if (!pm || !S.active || S.status === 'offline' || Date.now() - (S.lastPmNotice || 0) < 120000 || !chance(0.35)) return;
    const k = contact('kayla');
    if (!k || k.blocked || k.removed || k.status !== 'online') return;
    S.lastPmNotice = Date.now();
    later(rand(4000, 8000), () => runPlan(getConv('kayla'), k.bot.plan(pick(['ooh whats ur personal message about?? :D', 'omg i love ur new personal message lol', 'wait what does ur personal message mean?? lol']))));
  }

  function onNowPlaying(t) {
    if (!t || !t.title || String(t.id || '').startsWith('video:')) return;
    const prev = S.np;
    S.np = { title: t.title, artist: t.artist || 'Unknown artist', id: t.id };
    M.editingPm = false;
    updateMe();
    if (!S.active || S.status === 'offline' || !get('listening', true)) return;
    if ((prev && prev.title === S.np.title) || /^(channels|shop)$/.test(String(t.id))) return;
    const open = Array.from(S.convs.values()).filter((cv) => cv.win && !cv.c.blocked && cv.c.status === 'online' && !cv.c.def.bot);
    const cv = open.sort((a, b) => b.lastActivity - a.lastActivity)[0];
    if (cv && chance(0.75)) {
      later(rand(3000, 6000), () => { const acts = cv.c.bot.onSong(S.np); if (acts && S.np) runPlan(cv, acts); });
      return;
    }
    if (Date.now() - (S.lastSongOpener || 0) < 150000 || !chance(0.5)) return;
    const fans = visibleContacts().filter((c) => c.status === 'online' && !c.blocked && !c.def.bot && c.def.lines.nowplaying && !isChatting(c));
    if (!fans.length) return;
    const c = pick(fans);
    S.lastSongOpener = Date.now();
    later(rand(4000, 9000), () => { const acts = S.np && c.bot.onSong(S.np); if (acts && canMessageYou()) runPlan(getConv(c.id), acts); });
  }

  // ------------------------------------------------------------ conversations
  const replyCtx = () => ({ appearOffline: S.status === 'offline', userBusy: S.status === 'busy' || S.status === 'phone' });
  const SAFETY = 'Never share your password or personal info in a chat, even with friends.';

  function getConv(id) {
    let conv = S.convs.get(id);
    if (!conv) {
      conv = {
        id, c: contact(id), win: null, els: null, history: [], pending: [], planQueue: [], replyTimer: null, replying: false, token: 0,
        typing: false, lastReceived: 0, lastActivity: 0, notices: {}, toastAt: 0, lastNudgeSent: 0, wink: null, fly: null, closedAt: 0,
      };
      conv.history.push({ kind: 'sys', text: SAFETY, icon: 'info', time: Date.now(), hint: true });
      S.convs.set(id, conv);
    }
    return conv;
  }

  function openConversation(id, o = {}) {
    if (!S.active) return null;
    const c = contact(id);
    if (!c || c.removed) return null;
    const conv = getConv(id);
    if (conv.win && !conv.win.closed) {
      if (o.focus) {
        if (conv.win.state === 'minimized') conv.win.restore(); else conv.win.focus();
        focusInput(conv);
      }
      return conv;
    }
    const prev = A.wm.active;
    const prevFocus = document.activeElement;
    const n = Array.from(S.convs.values()).filter((x) => x.win).length;
    const layer = A.wm.layer;
    const W = layer ? layer.clientWidth : 1200, H = layer ? layer.clientHeight : 700;
    const w = Math.min(510, W - 30), hh = Math.min(490, H - 16);
    const x = Math.max(8, Math.min(W - w - 8, Math.round(W * 0.12) + (n % 6) * 32));
    const y = Math.max(0, Math.min(H - hh - 8, 28 + (n % 6) * 28));
    const win = A.wm.create({
      app: 'messenger', title: c.def.name + ' - Conversation', icon: 'icons/chat', width: w, height: hh, minWidth: 390, minHeight: 380,
      glassBody: true, sound: o.background ? false : undefined, x, y,
    });
    conv.win = win;
    conv.justOpened = !!o.background;
    // Launching the app again from a conversation brings back the contact list.
    win.ctrl = { onArgs: () => showMain() };
    buildConvUI(conv);
    win.on('close', () => closeConvWindow(conv, win));
    win.on('minimize', () => { if (conv.wink) conv.wink.stop(); if (conv.fly) conv.fly.close(); });
    win.on('resize', () => scrollDown(conv, true));
    if (o.background && prev && !prev.closed && prev !== win) {
      // Open behind whatever you're doing, and keep your caret where it was.
      prev.focus();
      if (prevFocus && prevFocus !== document.body && prev.el.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
    } else setTimeout(() => focusInput(conv), 60);
    if (c.def.bot && !conv.welcomed && !conv.history.some((it) => it.kind === 'msg')) {
      conv.welcomed = true;
      runPlan(conv, BOTS.askWelcome(c.bot));
    }
    return conv;
  }

  function focusInput(conv) {
    if (conv.els && !conv.els.input.disabled && conv.win && conv.win.state !== 'minimized') conv.els.input.focus({ preventScroll: true });
  }

  // An emoticon image without its own tooltip, for use inside labelled buttons.
  const quietEmo = (id, size) => { const i = E.img(id, size); i.removeAttribute('data-tip'); return i; };
  function tool(content, tip, cls) {
    return h('button.bm-tool', { type: 'button', class: cls, 'aria-label': tip, 'data-tip': tip }, content);
  }

  function buildConvUI(conv) {
    const { c, win } = conv;
    win.body.classList.add('bm-conv-body');
    const headDp = dp(c.def.picture, 78, c.blocked ? 'blocked' : c.status, 'bm-cv-dp');
    const headDpBtn = h('button.bm-cv-dpbtn', { type: 'button', 'aria-label': 'View ' + c.def.name + '\'s profile', 'data-tip': 'View profile' }, headDp);
    headDpBtn.addEventListener('click', () => viewProfile(c.id, win));
    const name = h('div.bm-cv-name');
    const status = h('div.bm-cv-status');
    const pm = h('div.bm-cv-pm');
    const mail = h('div.bm-cv-mail', null, '<' + c.def.email + '>');
    const head = h('div.bm-cv-head', null, h('div.bm-cv-scene', { 'aria-hidden': 'true' }), headDpBtn, h('div.bm-cv-who', null, name, status, pm, mail));
    const history = h('div.bm-cv-history', { role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation with ' + c.def.name, tabIndex: 0 });
    const typing = h('div.bm-cv-typing', { role: 'status' });
    const fontBtn = tool(h('span.bm-tool-font', null, 'A', h('i.bm-tool-swatch')), 'Change your font and color', 'bm-tool-fontbtn');
    const emoBtn = tool([quietEmo('smile', 18), svgEl(GLYPH.caret, 'bm-caret')], 'Emoticons');
    const winkBtn = tool([quietEmo('wink', 18), h('span', null, 'Winks'), svgEl(GLYPH.caret, 'bm-caret')], 'Send a wink');
    const nudgeBtn = tool([svgEl(GLYPH.nudge, 'bm-tool-svg'), h('span', null, 'Nudge')], 'Send a nudge');
    fontBtn.addEventListener('click', () => fontFlyout(conv));
    emoBtn.addEventListener('click', () => emoticonFlyout(conv));
    winkBtn.addEventListener('click', () => winkFlyout(conv));
    nudgeBtn.addEventListener('click', () => sendNudge(conv));
    const input = h('textarea.bm-cv-input', { rows: 3, maxLength: 400, spellcheck: true, 'aria-label': 'Type a message to ' + c.def.name });
    const sendBtn = A.ui.button('Send', { tone: 'aqua', className: 'bm-cv-send', onClick: () => sendFromInput(conv) });
    const selfDp = dp(myPicture(), 72, S.status, 'bm-cv-selfdp');
    const selfBtn = h('button.bm-cv-selfbtn', { type: 'button', 'aria-label': 'Change your display picture', 'data-tip': 'Change your display picture' }, selfDp);
    selfBtn.addEventListener('click', () => changePicture(win));
    const root = h('div.bm-conv', null,
      head,
      h('div.bm-cv-main', null,
        history,
        typing,
        h('div.bm-cv-bottom', null,
          h('div.bm-cv-compose', null,
            h('div.bm-cv-tools', null, fontBtn, emoBtn, h('span.bm-tool-sep'), winkBtn, nudgeBtn),
            h('div.bm-cv-inputrow', null, input, sendBtn)),
          selfBtn)));
    win.body.appendChild(root);
    conv.els = { root, head, headDp, name, status, pm, mail, history, typing, input, sendBtn, selfDp, fontBtn, emoBtn, winkBtn, nudgeBtn };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendFromInput(conv); }
    });
    win.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !win.modalChild && !document.querySelector('.ae-flyout, .ae-menu')) { e.preventDefault(); win.close(); }
    });
    applyMyFont(conv);
    updateConvHeader(conv);
    updateConvSelf(conv);
    updateCompose(conv);
    renderHistory(conv);
    setTyping(conv, conv.typing);
  }

  function closeConvWindow(conv, win) {
    if (conv.win !== win) return;
    stopPlans(conv);
    cancel(conv.replyTimer);
    conv.replyTimer = null;
    if (conv.wink) conv.wink.stop();
    if (conv.fly) conv.fly.close();
    conv.win = null;
    conv.els = null;
    conv.closedAt = conv.history.length;
    conv.returnSoon = false;
  }

  function stopPlans(conv) {
    conv.token++;
    conv.planQueue = [];
    conv.replying = false;
    setTyping(conv, false);
  }

  function updateConvHeader(conv) {
    const { c, els, win } = conv;
    if (!els || !win) return;
    const st = c.blocked ? 'blocked' : c.status;
    els.head.style.setProperty('--bm-scene', sceneUrl(c.def.scene));
    els.headDp.update(null, st);
    els.name.innerHTML = '';
    els.name.appendChild(E.render(c.def.screen, { size: 18, breaks: false }));
    els.status.innerHTML = '';
    els.status.append(orb(st, 'bm-cv-orb'), h('span', null, friendStatusLabel(c)));
    els.pm.innerHTML = '';
    if (c.song && c.status !== 'offline') els.pm.append(h('span.bm-song', null, songText(c.song)));
    else if (c.pm) els.pm.append(E.render(c.pm, { size: 16, breaks: false }));
  }
  function updateConvSelf(conv) { if (conv.els) conv.els.selfDp.update(myPicture(), S.status); }
  function updateCompose(conv) {
    if (!conv.els) return;
    const blocked = conv.c.blocked;
    conv.els.input.disabled = blocked;
    conv.els.input.placeholder = blocked ? 'You blocked ' + conv.c.def.name + '. Unblock them to chat.' : '';
    [conv.els.sendBtn, conv.els.nudgeBtn, conv.els.winkBtn].forEach((b) => { b.disabled = blocked; });
  }
  function applyMyFont(conv) {
    if (!conv.els) return;
    const f = myFont();
    const vars = colorVars(f.color, f.family);
    conv.els.input.style.setProperty('--c', vars['--c']);
    conv.els.input.style.setProperty('--cd', vars['--cd']);
    conv.els.input.style.fontFamily = vars.fontFamily;
    conv.els.fontBtn.querySelector('.bm-tool-swatch').style.background = f.color;
  }

  // ------------------------------------------------------------ history
  function renderHistory(conv) {
    const hist = conv.els.history;
    hist.innerHTML = '';
    conv.lastBlock = null;
    const items = conv.history.slice(-80);
    const offset = conv.history.length - items.length;
    items.forEach((item, i) => {
      const old = offset + i < conv.closedAt && !item.hint;
      appendItem(conv, item, old);
      if (old && offset + i === conv.closedAt - 1) { hist.appendChild(h('div.bm-divider', null, h('span', null, 'Earlier today'))); conv.lastBlock = null; }
    });
    scrollDown(conv, true);
  }

  function appendItem(conv, item, old) {
    const hist = conv.els.history;
    if (item.kind === 'sys') {
      const el = sysEl(conv, item);
      if (old) el.classList.add('bm-old');
      hist.appendChild(el);
      conv.lastBlock = null;
      return el;
    }
    let block = conv.lastBlock;
    if (!block || block.from !== item.from || item.time - block.time > 180000 || block.old !== !!old) {
      const who = item.from === 'me' ? userName() : conv.c.def.screen;
      const says = h('div.bm-says', null, E.render(who, { size: 15, breaks: false }), ' says:');
      const lines = h('div.bm-lines');
      const el = h('div.bm-msg', { class: ['bm-from-' + item.from, old && 'bm-old'] }, says, lines);
      hist.appendChild(el);
      block = conv.lastBlock = { from: item.from, time: item.time, lines, old: !!old };
    }
    block.time = item.time;
    const font = item.from === 'me' ? item.font || myFont() : { color: conv.c.def.color, family: conv.c.def.font };
    const line = h('div.bm-line', { style: colorVars(font.color, font.family) }, E.render(item.text, { size: 19 }));
    block.lines.appendChild(line);
    return line;
  }

  function sysEl(conv, item) {
    let icon;
    if (item.icon === 'nudge') icon = svgEl(GLYPH.nudge, 'bm-sys-svg');
    else if (item.icon === 'wink') icon = E.img('wink', 16);
    else if (item.icon === 'block') icon = h('img.bm-sys-img', { src: orbUrl('blocked'), alt: '' });
    else icon = h('img.bm-sys-img', { src: A.asset('icons/info'), alt: '' });
    const el = h('div.bm-sys', { class: ['bm-sys-' + (item.icon || 'info'), item.hint && 'bm-sys-hint'] }, icon, h('span', null, item.text));
    if (item.wink) {
      const link = h('button.ae-link.bm-sys-link', { type: 'button' }, 'Play again');
      link.addEventListener('click', () => playWink(conv, item.wink));
      el.appendChild(link);
    }
    return el;
  }

  function scrollDown(conv, force) {
    if (!conv.els) return;
    const hist = conv.els.history;
    const near = hist.scrollHeight - hist.scrollTop - hist.clientHeight < 90;
    if (force || near) requestAnimationFrame(() => { hist.scrollTop = hist.scrollHeight; });
  }

  function remember(conv, item) {
    conv.history.push(item);
    if (conv.history.length > 240) {
      const cut = conv.history.length - 200;
      conv.history.splice(1, cut);
      conv.closedAt = Math.max(0, conv.closedAt - cut);
    }
  }
  function addMessage(conv, from, text) {
    const item = { kind: 'msg', from, text, time: Date.now(), font: from === 'me' ? myFont() : null };
    remember(conv, item);
    conv.lastActivity = item.time;
    if (conv.els) { appendItem(conv, item); scrollDown(conv, from === 'me'); }
    return item;
  }
  function addSystem(conv, text, icon, extra) {
    const item = Object.assign({ kind: 'sys', text, icon: icon || 'info', time: Date.now() }, extra || {});
    remember(conv, item);
    if (conv.els) { appendItem(conv, item); scrollDown(conv); }
    return item;
  }

  function setTyping(conv, on) {
    conv.typing = !!on;
    if (!conv.els) return;
    const t = conv.els.typing;
    t.innerHTML = '';
    t.classList.toggle('bm-is-typing', !!on);
    if (on) t.append(svgEl(GLYPH.pencil, 'bm-typing-pencil'), h('span', null, conv.c.def.name + ' is typing a message...'));
    else if (conv.lastReceived) {
      const d = new Date(conv.lastReceived);
      t.append(h('span', null, 'Last message received at ' + A.util.fmtTime(d) + ' on ' + A.util.fmtDate(d) + '.'));
    }
  }

  // ------------------------------------------------------------ sending
  function sendFromInput(conv) {
    if (!conv.els) return;
    const input = conv.els.input;
    const text = input.value.replace(/\s+$/, '').replace(/^\n+/, '');
    if (!text.trim()) { input.focus(); return; }
    input.value = '';
    addMessage(conv, 'me', text);
    deliver(conv, text);
    input.focus();
  }

  function deliver(conv, text) {
    const c = conv.c;
    if (c.blocked) { addSystem(conv, 'You blocked ' + c.def.name + '. Unblock them to send messages.', 'block'); return; }
    if (c.status === 'offline') {
      c.queue.push(text);
      if (!conv.notices.offline) { conv.notices.offline = true; addSystem(conv, c.def.name + ' is offline. Messages you send will be delivered when they sign in.', 'info'); }
      return;
    }
    if ((ST.awayish(c.status) || c.status === 'busy' || c.status === 'phone') && conv.notices.status !== c.status) {
      conv.notices.status = c.status;
      addSystem(conv, c.def.name + ' might not reply right away because their status is set to ' + ST.label(c.status, true) + '.', 'info');
    }
    conv.pending.push(text);
    scheduleReply(conv);
  }

  function scheduleReply(conv) {
    const c = conv.c;
    if (conv.replying || !conv.pending.length) return;
    cancel(conv.replyTimer);
    if (ST.awayish(c.status) || c.status === 'phone') { ensureReturn(c, conv); return; }
    const read = c.def.bot ? rand(250, 500) : rand(600, 1500) * (c.status === 'busy' ? 2.2 : 1);
    conv.replyTimer = later(read, () => {
      conv.replyTimer = null;
      if (!conv.pending.length || conv.replying) return;
      const text = conv.pending.splice(0).join('\n');
      runPlan(conv, c.bot.reply(text, replyCtx()));
    });
  }

  // ------------------------------------------------------------ friends typing back
  function runPlan(conv, acts) {
    if (!acts || !acts.length || !S.active) return;
    conv.planQueue.push(acts);
    if (!conv.replying) pump(conv);
  }
  async function pump(conv) {
    const token = conv.token, sid = S.sid;
    conv.replying = true;
    while (conv.planQueue.length) {
      const acts = conv.planQueue.shift();
      const ok = await playActs(conv, acts, sid, token);
      if (sid !== S.sid || token !== conv.token) return;
      if (!ok) { stopPlans(conv); return; }
    }
    conv.replying = false;
    setTyping(conv, false);
    if (conv.pending.length) scheduleReply(conv);
  }
  async function playActs(conv, acts, sid, token) {
    const c = conv.c, def = c.def;
    const alive = () => sid === S.sid && token === conv.token && S.active && !c.blocked && !c.removed && c.status !== 'offline';
    for (const a of acts) {
      if (!alive()) return false;
      if (a.pause) { await wait(a.pause); continue; }
      if (a.say != null) {
        await wait(a.quick ? rand(250, 700) : BOTS.thinkMs(def));
        if (!alive()) return false;
        if (!a.quick && def.hesitate && chance(def.hesitate) && conv.win) {
          setTyping(conv, true);
          await wait(rand(900, 1800));
          if (!alive()) return false;
          setTyping(conv, false);
          await wait(rand(700, 1400));
          if (!alive()) return false;
        }
        setTyping(conv, true);
        await wait(BOTS.typingMs(def, a.say, a.quick));
        if (!alive()) return false;
        receive(conv, a.say);
        if (a.launch || a.theme || a.flip) { await wait(700); if (!alive()) return false; doAction(a); }
        continue;
      }
      if (a.nudge) { await wait(400); if (!alive()) return false; receiveNudge(conv); await wait(900); continue; }
      if (a.wink) { receiveWink(conv, a.wink); await wait(1200); continue; }
      if (a.away) {
        const ok = await playActs(conv, c.bot.awayLine(), sid, token);
        if (!ok || !alive()) return false;
        c.saidAway = true;
        setFriendStatus(c, pick(['brb', 'brb', 'away']), rand(35000, 90000));
        return true;
      }
    }
    return true;
  }

  function doAction(a) {
    try {
      if (a.launch && A.apps.get(a.launch)) A.apps.launch(a.launch);
      if (a.theme && A.theme.THEMES[a.theme]) A.theme.set(a.theme);
      if (a.flip && A.effects && A.effects.flip3d) A.effects.flip3d();
    } catch (e) { console.warn('[Bubble Messenger] action failed', e); }
  }

  const preview = (text) => { const p = plain(text).replace(/\s+/g, ' '); return p.length > 90 ? p.slice(0, 88) + '...' : p; };
  function receive(conv, text) {
    if (!conv.win || conv.win.closed) openConversation(conv.id, { background: true });
    conv.lastReceived = Date.now();
    addMessage(conv, 'them', text);
    setTyping(conv, false);
    play('message');
    const win = conv.win;
    if (win && (A.wm.active !== win || win.state === 'minimized')) {
      win.flash();
      if (conv.justOpened || Date.now() - conv.toastAt > 20000) {
        conv.toastAt = Date.now();
        conv.justOpened = false;
        if (A.shellReady !== false) {
          A.notify.toast({
            title: plain(conv.c.def.screen) + ' says:', text: preview(text), avatar: ART.pictureUrl(conv.c.def.picture), app: 'Bubble Messenger', appIcon: 'icons/users',
            sound: false, onClick: () => openConversation(conv.id, { focus: true }),
          });
        }
      }
    }
  }

  // ------------------------------------------------------------ nudges
  function sendNudge(conv) {
    const c = conv.c;
    if (!conv.win) return;
    if (c.blocked) { addSystem(conv, 'You blocked ' + c.def.name + '. Unblock them to send nudges.', 'block'); return; }
    if (c.status === 'offline') { addSystem(conv, 'You can\'t send a nudge to someone who is offline.', 'info'); return; }
    const now = Date.now();
    if (now - conv.lastNudgeSent < 3000) { addSystem(conv, 'Slow down! Wait a moment before sending another nudge.', 'info'); return; }
    conv.lastNudgeSent = now;
    addSystem(conv, 'You have just sent a nudge!', 'nudge');
    play('nudge');
    conv.win.shake();
    if (conv.nudgeReply) return;
    conv.nudgeReply = true;
    later(rand(1600, 3200), () => {
      conv.nudgeReply = false;
      if (ST.awayish(c.status) || c.status === 'phone' || c.status === 'offline') return;
      runPlan(conv, c.def.bot ? [{ say: 'Whoa, that tickles! :D A nudge shakes your friend\'s window. Use your powers wisely.' }] : c.bot.onNudge());
    });
  }
  function receiveNudge(conv) {
    if (!conv.win || conv.win.closed) openConversation(conv.id, { background: true });
    addSystem(conv, conv.c.def.name + ' just sent you a nudge!', 'nudge');
    play('nudge');
    const win = conv.win;
    if (!win) return;
    if (win.state !== 'minimized') win.focus();
    win.shake();
  }

  // ------------------------------------------------------------ winks
  function playWink(conv, id) {
    if (!conv.win || conv.win.state === 'minimized' || !conv.els) return;
    if (conv.wink) conv.wink.stop();
    conv.wink = WINKS.play(conv.els.root, id, { sound: get('sounds', true), onDone: () => { conv.wink = null; } });
  }
  function sendWink(conv, id) {
    const c = conv.c, w = WINKS.byId[id];
    if (!w) return;
    if (c.blocked) { addSystem(conv, 'You blocked ' + c.def.name + '. Unblock them to send winks.', 'block'); return; }
    if (c.status === 'offline') { addSystem(conv, 'You can\'t send a wink to someone who is offline.', 'info'); return; }
    addSystem(conv, 'You sent a wink: ' + w.name + '.', 'wink', { wink: id });
    playWink(conv, id);
    later(w.duration + rand(500, 1400), () => {
      if (ST.awayish(c.status) || c.status === 'phone' || c.status === 'offline') return;
      runPlan(conv, c.def.bot ? [{ say: 'Ooh, ' + w.name + '! Winks are little animations that play for both of you. (*)' }] : c.bot.onWink(id));
    });
  }
  function receiveWink(conv, id) {
    const w = WINKS.byId[id];
    if (!w) return;
    if (!conv.win || conv.win.closed) openConversation(conv.id, { background: true });
    addSystem(conv, conv.c.def.name + ' sent you a wink: ' + w.name + '.', 'wink', { wink: id });
    if (conv.win && conv.win.state !== 'minimized') playWink(conv, id);
    else if (conv.win) conv.win.flash();
  }

  // ------------------------------------------------------------ pickers
  function toggleFly(conv, anchor, build, cls) {
    if (conv.fly) { const same = conv.fly.anchor === anchor; conv.fly.close(); if (same) return; }
    const fly = A.ui.flyout(anchor, build(), { placement: 'top', align: 'left', className: 'bm-flyout ' + (cls || ''), onClose: () => { if (conv.fly === fly) conv.fly = null; } });
    fly.anchor = anchor;
    conv.fly = fly;
  }
  function insertText(conv, str) {
    const input = conv.els && conv.els.input;
    if (!input || input.disabled) return;
    input.focus();
    const s = input.selectionStart == null ? input.value.length : input.selectionStart;
    const e = input.selectionEnd == null ? s : input.selectionEnd;
    const before = input.value.slice(0, s), after = input.value.slice(e);
    const text = (before && !/\s$/.test(before) ? ' ' : '') + str + (after.startsWith(' ') ? '' : ' ');
    if (input.value.length + text.length > 400) return;
    input.setRangeText(text, s, e, 'end');
  }
  function emoticonFlyout(conv) {
    toggleFly(conv, conv.els.emoBtn, () => h('div.bm-fly', null,
      h('div.bm-fly-title', null, 'Emoticons'),
      E.picker((e) => { insertText(conv, e.codes[0]); if (conv.fly) conv.fly.close(); play('click'); }),
      h('div.bm-fly-hint', null, 'Tip: you can also type codes like :) (L) or (fish).')), 'bm-fly-emo');
  }
  function winkFlyout(conv) {
    toggleFly(conv, conv.els.winkBtn, () => h('div.bm-fly', null,
      h('div.bm-fly-title', null, 'Winks'),
      h('div.bm-wink-grid', null, WINKS.list.map((w) => {
        const b = h('button.bm-wink-opt', { type: 'button', 'aria-label': 'Send ' + w.name }, A.img(w.icon), h('span', null, w.name));
        b.addEventListener('click', () => { if (conv.fly) conv.fly.close(); sendWink(conv, w.id); });
        return b;
      }))), 'bm-fly-wink');
  }
  function fontFlyout(conv) {
    toggleFly(conv, conv.els.fontBtn, () => {
      const cur = myFont();
      const sample = h('div.bm-font-sample');
      const drawSample = () => {
        sample.innerHTML = '';
        const vars = colorVars(cur.color, cur.family);
        sample.style.setProperty('--c', vars['--c']);
        sample.style.setProperty('--cd', vars['--cd']);
        sample.style.fontFamily = vars.fontFamily;
        sample.appendChild(E.render('This is how your messages look :)', { size: 19 }));
      };
      const sw = h('div.bm-swatches', { role: 'group', 'aria-label': 'Font color' });
      COLORS.forEach((col) => {
        const b = h('button.bm-swatch', { type: 'button', class: col === cur.color ? 'selected' : '', style: { background: col }, 'aria-label': 'Color ' + col });
        b.addEventListener('click', () => { cur.color = col; sw.querySelectorAll('.bm-swatch').forEach((x) => x.classList.toggle('selected', x === b)); save(); });
        sw.appendChild(b);
      });
      const fam = A.ui.select({ options: Object.keys(FONTS).map((k) => [k, FONTS[k][0]]), value: cur.family, label: 'Font', onChange: (v) => { cur.family = v; save(); } });
      function save() { set('font', Object.assign({}, cur)); drawSample(); S.convs.forEach((cv) => applyMyFont(cv)); }
      drawSample();
      return h('div.bm-fly.bm-fontfly', null,
        h('div.bm-fly-title', null, 'Font and color'),
        h('label.bm-font-row', null, h('span', null, 'Font:'), fam),
        sw, sample);
    }, 'bm-fly-font');
  }

  // ------------------------------------------------------------ app
  function quickStatus(id) {
    if (S.active) setMyStatus(id);
    else { set('status', id); A.apps.launch('messenger'); }
  }

  A.apps.register({
    id: 'messenger',
    name: 'Bubble Messenger',
    icon: 'icons/users',
    color: '#45c93a',
    category: 'internet',
    description: 'Chat with your friends and family. Send nudges, winks and emoticons.',
    keywords: ['chat', 'instant message', 'im', 'friends', 'buddies', 'nudge', 'wink', 'emoticons', 'contacts'],
    single: true,
    window: MAIN_OPTS,
    tasks: [
      { label: 'Online', icon: orbUrl('online'), onClick: () => quickStatus('online') },
      { label: 'Busy', icon: orbUrl('busy'), onClick: () => quickStatus('busy') },
      { label: 'Away', icon: orbUrl('away'), onClick: () => quickStatus('away') },
      { label: 'Appear Offline', icon: orbUrl('offline'), onClick: () => quickStatus('offline') },
    ],
    launch(win, args) { return mountMain(win, args || {}); },
  });

  // Hooks for the screenshot helper and curious tinkerers (Aerium.bubbleMessenger.debug).
  NS.debug = {
    state: S,
    signIn: (status) => beginSignIn(status || 'online'),
    signOut: () => signOut(),
    open: (id) => openConversation(id, { focus: true }),
    say: (id, text) => { const conv = openConversation(id, { focus: true }); if (conv && conv.els) { conv.els.input.value = text; sendFromInput(conv); } },
    opener: (id) => { const c = contact(id); if (!c) return; if (c.status === 'offline') friendSignsIn(c, 'online'); friendOpens(c); },
    friendSignIn: (id) => { const c = contact(id); if (!c) return; if (c.status !== 'offline') friendSignsOut(c); friendSignsIn(c, 'online'); },
    friendStatus: (id, st) => { const c = contact(id); if (c) { if (st === 'offline') friendSignsOut(c); else if (c.status === 'offline') friendSignsIn(c, st); else setFriendStatus(c, st); } },
    nudge: (id) => { const conv = S.active && getConv(id); if (conv) receiveNudge(conv); },
    wink: (id, w) => { const conv = S.active && getConv(id); if (conv) receiveWink(conv, w || 'hearts'); },
    sendWink: (id, w) => { const conv = openConversation(id, { focus: true }); if (conv) sendWink(conv, w || 'bubbles'); },
    sendNudge: (id) => { const conv = openConversation(id, { focus: true }); if (conv) sendNudge(conv); },
  };
})();
