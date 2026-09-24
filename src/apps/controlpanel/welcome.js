/* Aerium Welcome Center: the first thing you see after logging on. A sunny
   animated sky with your picture and a summary of the computer, "Get started"
   tiles that open the fun parts of Aerium, a few gentle "offers", and the
   classic "Run at startup" checkbox. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h, s } = A.util;
  const K = A.cpKit || {};
  const sys = K.sys || { edition: 'Aerium Home Premium', processor: 'AeroCore Duo CPU 2.40GHz', memory: '2.00 GB', graphics: 'AquaGlass 256 MB', computerName: 'AERIUM-PC', wei: { base: 5.9 } };
  const FLIP = (K.icons && K.icons.flip) || 'icons/aerium';

  const TIPS = [
    'Shake a window by its title bar to tuck all the others away.',
    'Drag a window to the top of the screen to make it fill the whole screen.',
    'Press Ctrl+Alt+Up to see every window in Flip 3D.',
    'Point at the glass strip at the far right of the taskbar to peek at your desktop.',
    'Click the fish tank to drop in some food. The fish will thank you.',
    'Right-click the desktop and choose Personalize to change the glass color.',
    'Turn on pointer trails in Mouse Pointers. It is very 2007.',
    'Leave the computer alone for a few minutes and watch the screen saver.',
  ];

  function launch(id, args, parent) {
    if (!A.apps.get(id)) {
      A.ui.messageBox({ parent, title: 'Welcome Center', icon: 'info', instruction: 'This program is still on its way', message: 'It will appear here as soon as it is installed. Check back soon!' });
      return;
    }
    A.apps.launch(id, args || {});
  }

  A.apps.register({
    id: 'welcome',
    name: 'Welcome Center',
    icon: 'icons/welcome',
    color: '#3aa6f5',
    category: 'system',
    description: 'Get started with Aerium: personalize, meet the fish, chat, play and more.',
    keywords: ['welcome', 'getting started', 'start', 'intro', 'tour', 'new'],
    single: true,
    window: { width: 820, height: 620, minWidth: 560, minHeight: 440 },
    launch(win) {
      const offs = [];
      const timers = [];

      // ---------------------------------------------------- header
      const pic = h('span.fa-avatar.fa-avatar-framed.wc-pic', { style: { '--size': '84px' } }, h('img', { alt: '' }));
      const hello = h('div.wc-hello');
      const facts = h('div.wc-facts');
      const tipText = h('span.wc-tip-text');
      function renderUser() {
        pic.querySelector('img').src = A.asset(A.store.get('user.avatar') || 'avatars/avatar-fish');
        hello.textContent = 'Welcome, ' + (A.store.get('user.name') || 'User');
        facts.innerHTML = '';
        const wei = sys.wei ? sys.wei.base : 5.9;
        [[sys.edition, ''], [sys.processor, 'Processor'], [sys.memory + ' RAM', 'Memory'], [sys.graphics, 'Graphics'], ['Experience Index: ' + (Math.round(wei * 10) / 10).toFixed(1), 'Rating'], [sys.computerName, 'Computer name']]
          .forEach(([v, k]) => facts.appendChild(h('div.wc-fact', { 'data-tip': k || null }, v)));
      }
      const clouds = [0, 1, 2, 3].map((i) => h('span.wc-cloud', { class: 'c' + i }));
      const bubbles = Array.from({ length: 12 }, (_, i) => h('span.wc-bubble', { style: { left: (4 + i * 8 + Math.random() * 4).toFixed(1) + '%', '--s': (6 + Math.random() * 16).toFixed(0) + 'px', '--d': (9 + Math.random() * 9).toFixed(1) + 's', animationDelay: (-Math.random() * 14).toFixed(1) + 's' } }));
      const hill = s('svg', { class: 'wc-hills', viewBox: '0 0 800 90', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
        s('defs', null,
          s('linearGradient', { id: 'wc-hill1', x1: 0, y1: 0, x2: 0, y2: 1 }, s('stop', { offset: 0, class: 'fa-hill-a' }), s('stop', { offset: 1, class: 'fa-hill-b' })),
          s('linearGradient', { id: 'wc-hill2', x1: 0, y1: 0, x2: 0, y2: 1 }, s('stop', { offset: 0, class: 'fa-hill-b' }), s('stop', { offset: 1, class: 'fa-hill-c' }))),
        s('path', { d: 'M0 62 C 120 30, 260 28, 380 52 C 480 72, 600 34, 800 44 L 800 90 L 0 90 Z', fill: 'url(#wc-hill1)', opacity: 0.9 }),
        s('path', { d: 'M0 78 C 160 52, 320 60, 470 74 C 600 86, 700 62, 800 66 L 800 90 L 0 90 Z', fill: 'url(#wc-hill2)' }));
      const header = h('header.wc-head', null,
        h('div.wc-sky', { 'aria-hidden': 'true' }, h('span.wc-sun'), h('span.wc-aurora'), ...clouds, ...bubbles, hill),
        h('div.wc-head-inner', null,
          pic,
          h('div.wc-head-text', null,
            hello,
            facts,
            h('button.wc-more', { type: 'button', onclick: () => launch('system', null, win) }, 'Show more details')),
          h('div.wc-tip', { role: 'status' }, A.img('icons/lightbulb', { class: 'wc-tip-icon' }), h('div', null, h('b', null, 'Did you know?'), tipText))));

      // ---------------------------------------------------- tiles
      const appIcon = (id, fb) => { const a = A.apps.get(id); return a && a.icon ? a.icon : fb; };
      function meetFish() {
        if (A.apps.get('aquarium')) { A.apps.launch('aquarium'); return; }
        if (A.theme.wallpapers.has('aquarium')) {
          A.theme.setWallpaper('aquarium');
          A.notify({ title: 'Your fish are on the desktop', text: 'Minimize a few windows and click the tank to drop in some food.', icon: 'icons/aquarium' });
          return;
        }
        A.ui.messageBox({ parent: win, title: 'Welcome Center', icon: 'icons/fish', instruction: 'The fish are still swimming over', message: 'They will be here soon. Fish take their time.' });
      }
      function tryFlip() {
        const open = A.wm.windows.filter((w) => w.taskbar && !w.closed);
        const extras = ['notepad', 'calculator', 'paint', 'explorer', 'mediaplayer'].filter((id) => A.apps.get(id) && !A.wm.byApp(id).length);
        const need = Math.max(0, 3 - open.length);
        extras.slice(0, need).forEach((id, i) => timers.push(setTimeout(() => A.apps.launch(id), i * 320)));
        timers.push(setTimeout(() => A.effects && A.effects.flip3d && A.effects.flip3d(), need * 320 + 700));
      }
      const TILES = [
        [appIcon('personalize', 'icons/personalize'), 'Personalize your desktop', 'Pick a glass color, a background and a screen saver.', () => launch('personalize', null, win)],
        [appIcon('aquarium', 'icons/aquarium'), 'Meet your fish', 'Say hello to the aquarium and drop in some food.', meetFish],
        [appIcon('messenger', 'icons/chat'), 'Chat with friends', 'Your buddies are waiting in Bubble Messenger.', () => launch('messenger', null, win)],
        [appIcon('mediaplayer', 'icons/mediaplayer'), 'Listen to music', 'Play the sample songs in Aerium Media Player.', () => launch('mediaplayer', null, win)],
        [appIcon('games', 'icons/gamepad'), 'Play a game', 'Solitaire, Minesweeper and more, all nice and glossy.', () => launch('games', null, win)],
        [appIcon('browser', 'icons/globe'), 'Explore the Web', 'Surf the glossy web with Horizon Browser.', () => launch('browser', null, win)],
        [appIcon('channels', 'icons/channels'), 'Visit Channels', 'Calm, rounded channels for photos, weather and more.', () => launch('channels', null, win)],
        [FLIP, 'Try Flip 3D', 'See every open window in a glassy 3D stack.', tryFlip],
        ['icons/lightbulb', 'Things to try', 'Secret tricks, hidden features and a few easter eggs.', () => launch('help', { topic: 'things' }, win)],
      ];
      const tiles = h('div.wc-tiles', null, TILES.map(([icon, title, desc, run]) => {
        const b = h('button.wc-tile', { type: 'button' }, h('span.wc-tile-icon', null, A.img(icon)), h('span.wc-tile-text', null, h('b', null, title), h('span', null, desc)));
        b.addEventListener('click', () => { A.sound.play('select'); run(); });
        return b;
      }));

      // ---------------------------------------------------- offers
      const OFFERS = [
        ['icons/mail', 'Aerium Mail Beta', 'Now with 2 GB of storage. That is enough for every email you will ever get, probably.', 'Aerium Mail is still in beta. It has been in beta for a while. It is very comfortable there.'],
        ['icons/shield', 'FishGuard Plus', 'Filters, heaters and peace of mind for your aquarium. Free for the first 90 bubbles.', 'Good news: your fish are already protected by Aerium Defender. No subscription needed.'],
        ['icons/photo', 'Glossr Photo Sharing', 'Share your photos with the whole web. Every picture gets a free reflection.', 'Glossr is coming soon. Until then, your photos look great in the Pictures folder.'],
      ];
      const offers = h('div.wc-offers', null, OFFERS.map(([icon, title, blurb, reply]) => h('button.wc-offer', { type: 'button', onclick: () => A.ui.messageBox({ parent: win, title, icon, instruction: title, message: reply }) },
        A.img(icon, { class: 'wc-offer-icon' }), h('span', null, h('b', null, title), h('span', null, blurb)))));

      // ---------------------------------------------------- footer
      const startup = A.ui.checkbox({ label: 'Run at startup', checked: A.store.get('welcome.atStartup', true), onChange: (v) => { A.store.set('welcome.atStartup', v); A.sound.play('click'); } });
      offs.push(A.store.on('welcome.atStartup', (v) => { startup.checked = !!v; }));
      const close = A.ui.button('Close', { onClick: () => win.close() });
      close.style.minWidth = '84px';

      win.body.classList.add('wc');
      win.body.append(header,
        h('div.wc-body', null,
          h('h2.wc-title', null, 'Get started with Aerium'),
          tiles,
          h('h2.wc-title', null, 'Offers'),
          offers),
        h('footer.wc-foot', null, startup, h('span.wc-foot-note', null, 'You can always find the Welcome Center in the Start menu.'), close));

      renderUser();
      ['user.name', 'user.avatar', 'system.wei', 'system.computerName'].forEach((k) => offs.push(A.store.on(k, renderUser)));
      let tip = Math.floor(Math.random() * TIPS.length);
      const showTip = () => {
        tipText.classList.remove('in');
        void tipText.offsetWidth;
        tipText.textContent = TIPS[tip % TIPS.length];
        tipText.classList.add('in');
        tip++;
      };
      showTip();
      const tipTimer = setInterval(showTip, 9000);
      const minOff = win.on('minimize', () => header.classList.add('wc-paused'));
      const resOff = win.on('restore', () => header.classList.remove('wc-paused'));
      return {
        onClose() {
          clearInterval(tipTimer);
          timers.forEach(clearTimeout);
          offs.forEach((off) => off && off());
          minOff(); resOff();
        },
      };
    },
  });
})();
