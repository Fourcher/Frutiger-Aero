/* Aerium Help and Support: a glossy blue header with back and forward,
   a search box, topic tiles on the home page and friendly articles:
   Getting started, Things to try (the easter eggs), Keyboard shortcuts,
   About Frutiger Aero, Programs and the FAQ. Also a printer joke and an
   "Ask someone" link that opens Bubble Messenger. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;
  const K = A.cpKit || {};
  const ic = (k) => (K.ic ? K.ic(k) : k && k.includes('/') ? k : 'icons/help');

  // ============================================================ articles (filled in below)
  const ART = {};
  const ORDER = ['getting-started', 'things', 'shortcuts', 'frutiger', 'programs', 'faq'];
  const TOPICS = {
    start: 'getting-started', basics: 'getting-started', 'getting-started': 'getting-started', welcome: 'getting-started', intro: 'getting-started',
    things: 'things', 'things-to-try': 'things', tricks: 'things', 'easter-eggs': 'things', eggs: 'things', secrets: 'things',
    shortcuts: 'shortcuts', keyboard: 'shortcuts', keys: 'shortcuts', hotkeys: 'shortcuts',
    frutiger: 'frutiger', 'frutiger-aero': 'frutiger', aero: 'frutiger', about: 'frutiger', style: 'frutiger',
    faq: 'faq', questions: 'faq', files: 'faq', storage: 'faq', programs: 'programs', apps: 'programs',
  };

  const app = (id, args) => () => {
    if (!A.apps.get(id)) { A.ui.messageBox({ title: 'Help and Support', icon: 'info', instruction: 'This program is still on its way', message: 'It will appear as soon as it is installed. Check back soon!' }); return; }
    A.apps.launch(id, args || {});
  };

  // Tiny inline markup: **bold**, [[Key]] for key caps, {{code}} for typed text.
  function rich(text) {
    const out = [];
    String(text).split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\{\{[^}]+\}\})/).forEach((part) => {
      if (!part) return;
      if (part.startsWith('**')) out.push(h('b', null, part.slice(2, -2)));
      else if (part.startsWith('[[')) out.push(h('kbd.hp-key', null, part.slice(2, -2)));
      else if (part.startsWith('{{')) out.push(h('code.hp-code', null, part.slice(2, -2)));
      else out.push(part);
    });
    return out;
  }
  const plain = (text) => String(text).replace(/\*\*|\[\[|\]\]|\{\{|\}\}/g, '');
  function textOf(art) {
    const bits = [art.title, art.lead || ''];
    (art.blocks || []).forEach((b) => {
      ['h', 'tip', 'note'].forEach((k) => b[k] && bits.push(b[k]));
      ['p', 'list', 'steps'].forEach((k) => (b[k] || []).forEach((x) => bits.push(x)));
      (b.eggs || []).forEach((e) => bits.push(e[1], e[2]));
      (b.keys || []).forEach((k) => bits.push(k[0].join(' '), k[1]));
      (b.faq || []).forEach((f) => bits.push(f[0], f[1]));
      (b.apps || []).forEach((a) => bits.push(a[1], a[3]));
    });
    return plain(bits.join(' \n '));
  }

  // ============================================================ app
  A.apps.register({
    id: 'help',
    name: 'Help and Support',
    icon: 'icons/help',
    color: '#3aa6f5',
    category: 'system',
    description: 'Find answers, keyboard shortcuts and things to try.',
    keywords: ['help', 'support', 'how to', 'faq', 'shortcuts', 'tips', 'tricks', 'easter eggs', 'frutiger aero'],
    single: true,
    window: { width: 820, height: 620, minWidth: 520, minHeight: 400 },
    launch(win, args) {
      const hist = [];
      let pos = -1;
      let size = A.store.get('help.textSize', 'medium');
      const timers = [];

      // ---------------------------------------------------- chrome
      const back = h('button.cp-nav-btn.cp-back', { type: 'button', 'aria-label': 'Back', 'data-tip': 'Back (Alt+Left)' }, arrow(-1));
      const fwd = h('button.cp-nav-btn.cp-fwd', { type: 'button', 'aria-label': 'Forward', 'data-tip': 'Forward (Alt+Right)' }, arrow(1));
      const tool = (icon, label, fn, tip) => h('button.hp-tool', { type: 'button', onclick: fn, 'data-tip': tip || label }, A.img(ic(icon)), h('span', null, label));
      const search = A.ui.searchField({ placeholder: 'Search Help', label: 'Search Help', onSearch: (q) => { q = q.trim(); if (q) go({ page: 'search', q }); } });
      search.classList.add('hp-search');
      const optionsBtn = tool('icons/settings', 'Options', () => options(), 'Options');
      const header = h('header.hp-head', null,
        h('div.hp-head-row', null,
          h('div.cp-navbtns', null, back, fwd),
          tool('icons/home', 'Home', () => go({ page: 'home' }), 'Help and Support home'),
          tool('printer', 'Print', () => print(), 'Print this topic'),
          tool('icons/document', 'Browse Help', () => go({ page: 'toc' }), 'Browse Help topics'),
          h('span.hp-spacer'),
          tool('icons/users', 'Ask someone', () => ask(), 'Ask a friend in Bubble Messenger'),
          optionsBtn),
        h('div.hp-head-search', null, search));
      const content = h('div.hp-content', { tabIndex: -1 });
      const status = h('div.ae-statusbar.hp-status', null, h('span.hp-status-left', null, A.img('icons/globe'), 'Offline Help'), h('span.hp-spacer'), h('span.ae-status-cell', null, 'Aerium Help and Support'));
      win.body.classList.add('hp');
      win.body.append(header, content, status);
      applySize();

      function arrow(dir) {
        return A.util.s('svg', { viewBox: '0 0 16 16', width: 15, height: 15, 'aria-hidden': 'true' },
          A.util.s('path', { d: dir < 0 ? 'M9 3L4 8l5 5M4.6 8H13' : 'M7 3l5 5-5 5M11.4 8H3', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      }
      function applySize() {
        win.body.classList.remove('hp-small', 'hp-large');
        if (size !== 'medium') win.body.classList.add('hp-' + size);
      }

      // ---------------------------------------------------- navigation
      function go(entry, o = {}) {
        if (hist[pos]) hist[pos].scroll = content.scrollTop;
        hist.splice(pos + 1);
        hist.push(entry);
        pos = hist.length - 1;
        if (!o.silent) A.sound.play('navigate');
        render();
      }
      function step(d) {
        const n = pos + d;
        if (n < 0 || n >= hist.length) return;
        hist[pos].scroll = content.scrollTop;
        pos = n;
        A.sound.play('navigate');
        render(true);
      }
      back.addEventListener('click', () => step(-1));
      fwd.addEventListener('click', () => step(1));
      win.el.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        else if (e.key === 'Backspace' && !A.util.isTyping(e)) { e.preventDefault(); step(-1); }
        else if ((e.ctrlKey && e.key.toLowerCase() === 'f') || e.key === 'F3') { e.preventDefault(); search.input.focus({ preventScroll: true }); search.input.select(); }
        else if (e.ctrlKey && e.key.toLowerCase() === 'p') { e.preventDefault(); print(); }
      });
      win.el.addEventListener('mouseup', (e) => { if (e.button === 3) { e.preventDefault(); step(-1); } if (e.button === 4) { e.preventDefault(); step(1); } });

      function render(restore) {
        const entry = hist[pos];
        content.innerHTML = '';
        let page;
        if (entry.page === 'article' && ART[entry.id]) page = articlePage(entry);
        else if (entry.page === 'search') page = searchPage(entry.q);
        else if (entry.page === 'toc') page = tocPage();
        else page = homePage();
        content.appendChild(h('div.hp-page', null, page));
        back.disabled = pos <= 0;
        fwd.disabled = pos >= hist.length - 1;
        win.setTitle(entry.page === 'article' && ART[entry.id] ? ART[entry.id].title + ' - Help and Support' : 'Help and Support');
        if (entry.page !== 'search' && document.activeElement !== search.input) search.input.value = '';
        requestAnimationFrame(() => {
          if (entry.anchor) {
            const el = content.querySelector('[data-anchor="' + entry.anchor + '"]');
            if (el) { content.scrollTop = el.offsetTop - 12; el.classList.add('hp-flash'); entry.anchor = null; return; }
          }
          content.scrollTop = restore ? entry.scroll || 0 : 0;
        });
      }
      const open = (id, anchor) => go({ page: 'article', id, anchor });
      const link = (label, fn, icon) => h('button.ae-link.hp-link', { type: 'button', onclick: fn }, icon ? A.img(ic(icon), { class: 'hp-link-icon' }) : null, label);

      // ---------------------------------------------------- pages
      function homePage() {
        const tiles = ORDER.filter((id) => ART[id]).map((id) => {
          const a = ART[id];
          return h('button.hp-tile', { type: 'button', onclick: () => open(id) }, A.img(ic(a.icon), { class: 'hp-tile-icon' }), h('span.hp-tile-text', null, h('b', null, a.short || a.title), h('span', null, a.blurb || '')));
        });
        return h('div.hp-home', null,
          h('div.hp-hero', null,
            h('div.hp-hero-text', null, h('h1.hp-title', null, 'Find an answer'), h('p.hp-lead', null, 'Pick a topic below, or type a question in the search box above. Every answer here was written by people who really, really like bubbles.')),
            h('div.hp-hero-art', { 'aria-hidden': 'true' }, A.img('icons/help', { class: 'hp-hero-orb' }), h('i'), h('i'), h('i'))),
          h('div.hp-tiles', null, tiles),
          h('div.hp-cols', null,
            h('section.hp-box', null, h('h2.hp-h2', null, 'Ask someone'),
              h('div.hp-links', null,
                link('Ask a friend in Bubble Messenger', ask, 'icons/chat'),
                link('Post a question on the Aerium fish forum', () => A.ui.messageBox({ parent: win, title: 'Aerium Fish Forum', icon: 'icons/fish', instruction: 'Your question was posted', message: '47 fish have read it. They are thinking about it very carefully. So far, the top answer is "blub".' }), 'icons/users'))),
            h('section.hp-box', null, h('h2.hp-h2', null, 'Information from Aerium'),
              h('div.hp-news', null,
                h('div.hp-news-item', null, h('b', null, 'Pointer trails are back'), h('span', null, 'Turn them on in Mouse Pointers. Wiggle responsibly.')),
                h('div.hp-news-item', null, h('b', null, 'New: the Technozen theme'), h('span', null, 'White, calm and rounded, like a living-room console.')),
                h('div.hp-news-item', null, h('b', null, 'Did you rate your computer?'), h('span', null, 'System has a shiny new Experience Index test.'))))));
      }
      function tocPage() {
        return h('div.hp-toc', null,
          h('h1.hp-title', null, 'Browse Help'),
          h('p.hp-lead', null, 'Every topic in Aerium Help and Support, all in one place.'),
          ORDER.filter((id) => ART[id]).map((id) => {
            const a = ART[id];
            const subs = (a.blocks || []).filter((b) => b.h).map((b, i) => link(b.h, () => open(id, anchorOf(b.h, i))));
            return h('div.hp-toc-item', null, h('button.hp-toc-title', { type: 'button', onclick: () => open(id) }, A.img(ic(a.icon)), a.title), subs.length ? h('div.hp-toc-subs', null, subs) : null);
          }));
      }
      const anchorOf = (text, i) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 's' + i;
      function searchPage(q) {
        const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
        const hits = [];
        ORDER.concat(Object.keys(ART).filter((k) => !ORDER.includes(k))).forEach((id) => {
          const a = ART[id];
          if (!a) return;
          const text = textOf(a);
          const low = text.toLowerCase();
          if (!words.every((w) => low.includes(w))) return;
          let score = 0;
          words.forEach((w) => { score += (low.split(w).length - 1) + (a.title.toLowerCase().includes(w) ? 10 : 0); });
          const i = low.indexOf(words[0]);
          let start = Math.max(0, i - 70);
          if (start > 0) { const sp = text.indexOf(' ', start); if (sp > 0 && sp < i) start = sp + 1; }
          let end = Math.min(text.length, i + 110);
          if (end < text.length) { const sp = text.lastIndexOf(' ', end); if (sp > i + 20) end = sp; }
          hits.push({ id, a, score, snip: (start > 0 ? '...' : '') + text.slice(start, end).replace(/\s+/g, ' ') + (end < text.length ? '...' : '') });
        });
        hits.sort((x, y) => y.score - x.score);
        const mark = (snip) => {
          const re = new RegExp('(' + words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'ig');
          return snip.split(re).map((part, i) => (i % 2 ? h('mark.hp-mark', null, part) : part));
        };
        search.input.value = q;
        return h('div.hp-results', null,
          h('h1.hp-title', null, hits.length ? 'Results for "' + q + '"' : 'No results for "' + q + '"'),
          hits.length ? h('p.hp-lead', null, 'Aerium found ' + hits.length + (hits.length === 1 ? ' topic.' : ' topics.')) : h('p.hp-lead', null, 'Try fewer words, or words like "glass", "fish", "files", "shortcuts" or "screen saver".'),
          hits.map((x) => h('div.hp-hit', null, h('button.hp-hit-title', { type: 'button', onclick: () => open(x.id) }, A.img(ic(x.a.icon)), x.a.title), h('div.hp-hit-snip', null, mark(x.snip)))),
          hits.length ? null : h('div.hp-links', null, link('Browse all Help topics', () => go({ page: 'toc' }), 'icons/document'), link('Ask someone instead', ask, 'icons/chat')));
      }
      function articlePage(entry) {
        const a = ART[entry.id];
        const body = h('article.hp-article');
        body.appendChild(h('div.hp-art-head', null, A.img(ic(a.icon), { class: 'hp-art-icon' }), h('div', null, h('h1.hp-title', null, a.title), a.lead ? h('p.hp-lead', null, rich(a.lead)) : null)));
        (a.blocks || []).forEach((b, i) => {
          const sec = h('section.hp-sec', { dataset: { anchor: b.h ? anchorOf(b.h, i) : '' } });
          if (b.h) sec.appendChild(h('h2.hp-h2', null, b.h));
          (b.p || []).forEach((t) => sec.appendChild(h('p', null, rich(t))));
          if (b.list) sec.appendChild(h('ul.hp-list', null, b.list.map((t) => h('li', null, rich(t)))));
          if (b.steps) sec.appendChild(h('ol.hp-steps', null, b.steps.map((t) => h('li', null, rich(t)))));
          if (b.keys) sec.appendChild(h('div.hp-keys', { role: 'table' }, b.keys.map(([combo, what]) => h('div.hp-keyrow', { role: 'row' }, h('span.hp-combo', null, combo.map((k, j) => [j && k !== 'or' && combo[j - 1] !== 'or' ? h('span.hp-plus', null, '+') : null, k === 'or' ? h('span.hp-or', null, 'or') : h('kbd.hp-key', null, k)])), h('span', null, rich(what))))));
          if (b.eggs) sec.appendChild(h('div.hp-eggs', null, b.eggs.map(([icon, title, text, act]) => h('div.hp-egg', null, A.img(ic(icon), { class: 'hp-egg-icon' }), h('div.hp-egg-text', null, h('b', null, title), h('span', null, rich(text)), act ? h('div', null, link(act[0], act[1])) : null)))));
          if (b.faq) sec.appendChild(h('div.hp-faq', null, b.faq.map(([q, ans, act]) => {
            const answer = h('div.hp-answer', { hidden: true }, h('p', null, rich(ans)), act ? link(act[0], act[1]) : null);
            const btn = h('button.hp-q', { type: 'button', 'aria-expanded': 'false' }, h('span.hp-q-tw', { 'aria-hidden': 'true' }), q);
            btn.addEventListener('click', () => { answer.hidden = !answer.hidden; btn.setAttribute('aria-expanded', String(!answer.hidden)); btn.classList.toggle('open', !answer.hidden); A.sound.play('click'); });
            return h('div.hp-faq-item', null, btn, answer);
          })));
          if (b.apps) sec.appendChild(h('div.hp-apps', null, b.apps.map(([id, name, icon, text]) => h('div.hp-app', { dataset: { anchor: id } }, A.img(ic((A.apps.get(id) && A.apps.get(id).icon) || icon), { class: 'hp-app-icon' }), h('div', null, h('b', null, name), h('span', null, rich(text)), A.apps.get(id) ? h('div', null, link('Open ' + name, app(id))) : null)))));
          if (b.tip) sec.appendChild(h('div.hp-tip', null, A.img('icons/lightbulb', { class: 'hp-tip-icon' }), h('div', null, h('b', null, 'Tip'), h('span', null, rich(b.tip)))));
          if (b.note) sec.appendChild(h('div.hp-note', null, A.img('icons/info', { class: 'hp-tip-icon' }), h('span', null, rich(b.note))));
          if (b.act) sec.appendChild(h('div.hp-acts', null, b.act.map(([label, fn]) => A.ui.button(label, { size: 'sm', onClick: fn }))));
          body.appendChild(sec);
        });
        if (a.related && a.related.length) body.appendChild(h('section.hp-sec.hp-related', null, h('h2.hp-h2', null, 'See also'), h('div.hp-links', null, a.related.filter((id) => ART[id]).map((id) => link(ART[id].title, () => open(id), ART[id].icon)))));
        const thanks = h('span.hp-thanks');
        const fb = (label, msg) => A.ui.button(label, { size: 'sm', onClick: () => { thanks.textContent = msg; fbRow.querySelectorAll('button').forEach((x) => { x.disabled = true; }); A.sound.play('ding'); } });
        const fbRow = h('div.hp-feedback', null, h('span', null, 'Was this information helpful?'), fb('Yes', 'Thanks! The fish will read your feedback at their next meeting.'), fb('Somewhat', 'Thanks! We\'ll add more bubbles.'), fb('No', 'Sorry about that. Try asking a friend in Bubble Messenger.'), thanks);
        body.appendChild(fbRow);
        return body;
      }

      // ---------------------------------------------------- actions
      function ask() {
        if (A.apps.get('messenger')) { A.apps.launch('messenger'); return; }
        A.ui.messageBox({ parent: win, title: 'Ask someone', icon: 'icons/chat', instruction: 'Bubble Messenger is still on its way', message: 'Once it is installed, you can ask your friends anything. They know a surprising amount about fish.' });
      }
      function currentText() {
        const entry = hist[pos];
        if (entry.page === 'article' && ART[entry.id]) {
          const a = ART[entry.id];
          const lines = [a.title.toUpperCase(), '='.repeat(Math.min(60, a.title.length)), '', plain(a.lead || ''), ''];
          (a.blocks || []).forEach((b) => {
            if (b.h) lines.push(b.h, '-'.repeat(Math.min(60, b.h.length)));
            (b.p || []).forEach((t) => lines.push(plain(t)));
            (b.list || []).forEach((t) => lines.push('  - ' + plain(t)));
            (b.steps || []).forEach((t, i) => lines.push('  ' + (i + 1) + '. ' + plain(t)));
            (b.keys || []).forEach(([c, w]) => lines.push('  ' + c.filter((k) => k !== 'or').join('+') + '   ' + plain(w)));
            (b.eggs || []).forEach(([, t, x]) => lines.push('  [ ] ' + t + ': ' + plain(x)));
            (b.faq || []).forEach(([q, ans]) => lines.push('  Q: ' + q, '  A: ' + plain(ans), ''));
            (b.apps || []).forEach(([, n, , t]) => lines.push('  ' + n + ': ' + plain(t)));
            if (b.tip) lines.push('  Tip: ' + plain(b.tip));
            lines.push('');
          });
          return { title: a.title, text: lines.join('\r\n') };
        }
        return { title: 'Help and Support', text: 'AERIUM HELP AND SUPPORT\r\n\r\nPress F1 anywhere to come back here. The fish say hi.\r\n' };
      }
      async function print() {
        const doc = currentText();
        const pr = A.ui.select({ options: [['fish', 'Aquarium LaserJet 3000 (the fish\'s printer)'], ['notepad', 'Print to Notepad']], value: 'fish', label: 'Printer' });
        const r = await A.ui.dialog({ parent: win, title: 'Print', icon: ic('printer'), width: 420,
          content: h('div.cp-dlg.hp-print', null, h('label.hp-print-row', null, h('span', null, 'Printer:'), pr), h('div.hp-print-row', null, h('span', null, 'Pages:'), h('span', null, 'All (1 page, printed with love)'))),
          buttons: [{ label: 'Print', default: true, value: 'print' }, { label: 'Cancel', cancel: true, value: null }] });
        if (r !== 'print') return;
        if (pr.value === 'fish') {
          const ok = K.progress ? await K.progress({ parent: win, title: 'Printing', icon: 'printer', instruction: 'Printing "' + doc.title + '"', steps: [{ text: 'Warming up the printer...', ms: 900 }, { text: 'Printing page 1 of 1...', ms: 1300 }, { text: 'Page 1 is a little wet...', ms: 700 }] }) : true;
          if (!ok) return;
          const v = await A.ui.messageBox({ parent: win, title: 'Aquarium LaserJet 3000', icon: 'warning', instruction: 'The printer is out of paper', message: 'The fish used the last sheet for origami. It is a very nice swan. Would you like a copy in Notepad instead?', buttons: [{ label: 'Open in Notepad', value: 'np', default: true }, { label: 'No thanks', value: 'no', cancel: true }] });
          if (v !== 'np') return;
        }
        try {
          const path = A.fs.join('/Documents', A.fs.uniqueName('/Documents', ('Help - ' + doc.title).replace(/[\\/:*?"<>|]/g, '') + '.txt'));
          A.fs.write(path, doc.text, { mime: 'text/plain' });
          if (A.apps.get('notepad')) A.apps.openFile(path);
          A.notify({ title: 'Printed to Notepad', text: 'Saved in Documents as ' + A.fs.basename(path) + '.', icon: 'icons/notepad', sound: false });
        } catch (e) {
          A.ui.messageBox({ parent: win, title: 'Print', icon: 'error', message: e.message });
        }
      }
      function options() {
        const r = optionsBtn.getBoundingClientRect();
        const setSize = (v) => { size = v; A.store.set('help.textSize', v); applySize(); };
        A.ui.menu([
          { label: 'Text Size', submenu: [
            { label: 'Larger', radio: true, checked: size === 'large', onClick: () => setSize('large') },
            { label: 'Medium', radio: true, checked: size === 'medium', onClick: () => setSize('medium') },
            { label: 'Smaller', radio: true, checked: size === 'small', onClick: () => setSize('small') }] },
          { label: 'Print...', shortcut: 'Ctrl+P', onClick: print },
          { label: 'Browse Help', onClick: () => go({ page: 'toc' }) },
          { separator: true },
          { label: 'Search Help', shortcut: 'Ctrl+F', onClick: () => { search.input.focus({ preventScroll: true }); search.input.select(); } },
          { label: 'Settings...', onClick: () => A.ui.messageBox({ parent: win, title: 'Help Settings', icon: 'icons/help', instruction: 'Include online Help: Yes', message: 'Aerium Help is always offline, but it likes to be asked. Everything here is stored right inside Aerium.' }) },
        ], r.left, r.bottom + 2);
      }

      // ---------------------------------------------------- start
      function entryFor(a) {
        if (a && a.q) return { page: 'search', q: String(a.q) };
        const t = a && a.topic ? String(a.topic).toLowerCase() : '';
        if (!t) return { page: 'home' };
        if (ART[t]) return { page: 'article', id: t };
        if (TOPICS[t]) return { page: 'article', id: TOPICS[t] };
        if (A.apps.get(t)) return { page: 'article', id: 'programs', anchor: A.apps.get(t).id };
        return { page: 'search', q: t };
      }
      go(entryFor(args), { silent: true });
      return {
        onArgs(a) { go(entryFor(a)); },
        onClose() { timers.forEach(clearTimeout); },
      };
    },
  });

  // ============================================================ article content
  const cp = (page) => app('controlpanel', { page });
  const pz = (page) => app('personalize', { page });

  ART['getting-started'] = {
    title: 'Getting started with Aerium', short: 'Getting started', icon: 'icons/welcome',
    blurb: 'The desktop, the Start menu, windows and making it yours.',
    lead: 'Aerium is a playground that looks and feels like a family computer from around 2007. Nothing here is for work. Click things, change things, and see what happens.',
    blocks: [
      { h: 'The desktop', p: ['The desktop is the big picture behind everything. Double-click an icon to open it, and right-click an empty spot for options like **Personalize**, **Refresh** and **Gadgets**.'], tip: 'Your background might be alive. Click the fish tank to drop in some food.' },
      { h: 'The Start menu', p: ['Click the round glass orb in the bottom-left corner, or press [[Ctrl]] + [[Esc]], to open the Start menu. Start typing to search for programs and files. Your favorite programs are on the left, and your folders and settings are on the right.'] },
      { h: 'Windows', list: [
        'Drag a window by its title bar to move it.',
        'Drag an edge or a corner to resize it.',
        'Double-click the title bar to maximize it, and double-click again to restore it.',
        'Drag a window against the left or right edge of the screen to fill that half.',
        'Shake a window by its title bar to tuck all the others away.',
      ] },
      { h: 'The taskbar', p: ['Every open program gets a glowing button on the taskbar. Point at a button to see a live preview of its window, and right-click it for recent files and tasks. On the right, the notification area holds the volume, network, power and the clock. Click any of them to see more.'] },
      { h: 'Make it yours', p: ['Right-click the desktop and choose **Personalize**. From there you can tint the glass, pick a background, choose a screen saver, listen to every sound and try new mouse pointers. Changes show up instantly, so play as much as you like.'], act: [['Open Personalization', app('personalize')], ['Open the Welcome Center', app('welcome')]] },
      { h: 'Your files', p: ['Your documents, pictures and music live in your user folder. Open **Computer** or your user folder on the desktop to find them. Aerium saves everything in this browser, so it will still be here next time.'], note: 'Want to know exactly where your files are kept? See "Where are my files saved?" in the frequently asked questions.' },
    ],
    related: ['things', 'shortcuts', 'faq'],
  };

  ART.things = {
    title: 'Things to try: tricks and easter eggs', short: 'Things to try', icon: 'icons/lightbulb',
    blurb: 'Secret codes, hidden features and a few surprises.',
    lead: 'Aerium hides a few surprises. Here are some of our favorites. Try them all, and don\'t tell anyone where you heard about them.',
    blocks: [
      { h: 'Secret tricks', eggs: [
        ['icons/aquarium', 'Throw a fish party', 'With the desktop showing, type [[Up]] [[Up]] [[Down]] [[Down]] [[Left]] [[Right]] [[Left]] [[Right]] [[B]] [[A]] on your keyboard. Everybody into the tank!', ['Start the party now', () => A.effects && A.effects.fishParty && A.effects.fishParty()]],
        ['icons/folder', 'Shake a window', 'Grab a window by its title bar and shake it quickly from side to side. Every other window tucks itself away. Shake it again to bring them all back.'],
        ['icons/sync', 'Refresh, refresh, refresh', 'Click an empty spot on the desktop and press [[F5]] over and over. Watch the icons blink. Everybody did this. Nobody knows why.'],
        ['icons/cmd', 'Hacker green', 'Open Command Prompt and type {{color a}} for classic hacker green. Try {{color 1f}} for deep blue or {{color rainbow}} if you are feeling brave, then {{color}} to go back.', ['Open Command Prompt', app('cmd')]],
        [K.icons ? K.icons.flip : 'icons/aerium', 'Flip 3D', 'Press [[Ctrl]] + [[Alt]] + [[Up]], or click the Flip 3D button next to the Start orb. Scroll or use the arrow keys to flip through your windows, then click one to open it.', ['Flip now', () => A.effects && A.effects.flip3d && A.effects.flip3d()]],
        ['icons/monitor', 'Peek at the desktop', 'Point at the glass strip at the far right end of the taskbar. Every window turns to glass so you can see your desktop. Pointing at a taskbar preview peeks at just that window.'],
        ['icons/computer', 'Snap to the edges', 'Drag a window to the left or right edge of the screen to fill that half, or to the top to fill the whole screen. A glass outline shows where it will land.'],
        [K.icons ? K.icons.mouse : 'icons/star', 'Mouse trails', 'Open Mouse Pointers and turn on **Display pointer trails**. Now wiggle the mouse. Beautiful.', ['Open Mouse Pointers', pz('mouse')]],
        ['icons/trash-full', 'The secret in the Recycle Bin', 'Somebody threw something away before you got here. Open the Recycle Bin and take a peek.', ['Open the Recycle Bin', app('explorer', { path: '/Recycle Bin' })]],
        ['icons/chat', 'Send a nudge', 'In Bubble Messenger, open a chat with a friend and send a nudge. The whole window shakes. Use this power wisely.', ['Open Bubble Messenger', app('messenger')]],
      ] },
      { h: 'More to discover', eggs: [
        [K.icons ? K.icons.gauge : 'icons/star', 'Rate this computer', 'Open System and click **Rate this computer** to see your Aerium Experience Index. It even assesses your bubbles.', ['Open System', app('system')]],
        ['icons/search', 'Get rid of that toolbar', 'Somebody installed a Search Toolbar without asking. Uninstall it in Programs and Features for a small celebration.', ['Open Programs and Features', cp('programs')]],
        [K.icons ? K.icons.palette : 'icons/personalize', 'Lime glass, full blast', 'Make the glass Lime green at full intensity. Then try Frost with transparency turned off. Then go back to Sky, like everyone does.', ['Change the glass color', pz('color')]],
        ['icons/shield', 'Scan for threats', 'Run a quick scan in Aerium Defender. The result is always good news for your fish.', ['Open Aerium Defender', cp('defender')]],
        ['icons/monitor', 'The giant number one', 'In Display Settings, click **Identify Monitors**. It never gets old.', ['Open Display Settings', pz('display')]],
      ] },
    ],
    related: ['shortcuts', 'getting-started', 'frutiger'],
  };

  ART.shortcuts = {
    title: 'Keyboard shortcuts', short: 'Keyboard shortcuts', icon: 'keyboard',
    blurb: 'Handy keys for the Start menu, windows and Flip 3D.',
    lead: 'Keyboard shortcuts are a quick way to do things without reaching for the mouse. Here are the ones Aerium knows.',
    blocks: [
      { h: 'Everywhere', keys: [
        [['Ctrl', 'Esc'], 'Open or close the Start menu'],
        [['Win'], 'Open the Start menu, if your keyboard has that key'],
        [['Ctrl', 'Shift', 'Esc'], 'Open Task Manager'],
        [['Ctrl', 'Alt', 'Up', 'or', 'Ctrl', 'Alt', 'F'], 'Flip 3D: see all your windows in a glassy stack'],
        [['Alt', 'F4'], 'Close the active window'],
        [['F1'], 'Open Help and Support (hello!)'],
        [['F5'], 'Refresh the desktop, when the desktop is selected'],
      ] },
      { h: 'In Flip 3D', keys: [
        [['Up', 'or', 'Down'], 'Flip through the windows (the mouse wheel and Tab work too)'],
        [['Enter'], 'Open the window at the front'],
        [['Esc'], 'Go back without changing anything'],
      ] },
      { h: 'In Control Panel, Personalization and Help', keys: [
        [['Alt', 'Left'], 'Go back to the previous page'],
        [['Alt', 'Right'], 'Go forward again'],
        [['Ctrl', 'F'], 'Jump to the search box'],
      ] },
      { h: 'In dialogs and menus', keys: [
        [['Enter'], 'Choose the highlighted button'],
        [['Esc'], 'Cancel and close'],
        [['Up', 'or', 'Down'], 'Move through menu items'],
      ] },
      { h: 'In Notepad', keys: [
        [['Ctrl', 'S'], 'Save'], [['Ctrl', 'O'], 'Open'], [['Ctrl', 'F'], 'Find'], [['F5'], 'Insert the time and date'],
      ], tip: 'Type {{.LOG}} as the very first line of a Notepad file. Every time you open it, Notepad adds the time and date, like a diary.' },
    ],
    related: ['things', 'getting-started'],
  };

  ART.frutiger = {
    title: 'About Frutiger Aero', short: 'About Frutiger Aero', icon: 'icons/aerium',
    blurb: 'Where the glossy, sky-blue look came from, and why it is back.',
    lead: 'Frutiger Aero is the name people now use for the look of consumer technology from about 2004 to 2013: glossy, see-through and full of sky, water and green grass. Aerium is a love letter to it.',
    blocks: [
      { h: 'Where the name comes from', p: [
        'The term joins **Frutiger**, a humanist typeface, with **Aero**, the name of the glass look in a popular 2007 desktop operating system.',
        'It was coined by Sofi Xian (also credited as Sofi Lee) and named together with Froyo Tam of the Consumer Aesthetics Research Institute (CARI). It was first shared publicly in an online group on January 18, 2018.',
      ] },
      { h: 'When it was everywhere', p: [
        'CARI dates the style to about 2004 to 2013. It turned up in desktop operating systems, the first touchscreen phones, music players, game consoles, messenger apps and web design.',
        'Its hallmarks were skeuomorphic interfaces, glossy and transparent materials, humanist sans-serif type, and photographs of auroras, bokeh and sunlit grass. One popular summary describes it as "a utopia where efficiency and the environment coexist."',
      ] },
      { h: 'The four materials', list: [
        '**Air:** open skies that fade from deep blue to white, with soft clouds and lens flare.',
        '**Water:** clear, cool and moving, with bubbles, droplets and caustic light.',
        '**Glass:** panels and buttons you can see into, lit from above.',
        '**Light:** one sun, up and to the left, making every shine and glow.',
      ] },
      { h: 'Sub-styles', list: [
        '**Frutiger Eco:** renewable energy, green Earths, seedlings and wind turbines.',
        '**Dark Aero:** black and indigo glass with cyan glows and bokeh.',
        '**Technozen:** white, calm and cute, from Japanese home technology.',
        '**Frutiger Aurora:** glowing ribbons of northern light.',
        '**Vectorgarden:** vector swirls, flowers and butterflies.',
        '**Four Colors:** bright silhouettes from music-player ads.',
        '**Helvetica Aqua Aero:** sea, bubbles, dolphins and tropical fish.',
        '**Frutiger Metro:** the flat turn, around 2011, where the style ended.',
      ] },
      { h: 'The revival', p: [
        'Around 2022 and 2023 the style came back online. The biggest forum for fans grew more than 400% in a single month in early 2023, and in December 2023 a British newspaper reported about 270 million views for the Frutiger Aero hashtag on a short-video app.',
        'Writers have read the comeback as a reaction to "the coldness of modern design" and to the rise of AI. Evan Collins of CARI links it to the moment technology became approachable, and trends expert Amanda Brennan put it simply: "There\'s a lot of hopefulness in this aesthetic that Y2K doesn\'t have." In 2025, a major phone maker\'s new glassy interface was widely compared to Aero.',
      ], note: 'A kind warning from the Frutiger Aero Archive: some of the era\'s utopian stock photos, like green grassy plains dotted with tall buildings, were greenwashing. Enjoy the sky, and keep an eye on the claims.' },
      { h: 'How Aerium was made', p: [
        'Aerium draws everything live. Every icon is a small illustration, every sound is synthesized the moment you hear it, and there is no borrowed art or music inside. The names are original too: Horizon Browser, Bubble Messenger, Aerium Media Player and friends.',
      ] },
    ],
    related: ['getting-started', 'things'],
  };

  ART.programs = {
    title: 'Programs in Aerium', short: 'Programs', icon: 'icons/folder',
    blurb: 'What each program does, with a tip or two for each.',
    lead: 'A quick tour of the programs that come with Aerium. Click "Open" to try one right now.',
    blocks: [
      { h: 'Accessories', apps: [
        ['notepad', 'Notepad', 'icons/notepad', 'Writes plain text. Press [[F5]] to add the time and date, and start a file with {{.LOG}} to turn it into a diary.'],
        ['paint', 'Paint', 'icons/paint', 'Draw with brushes, shapes and colors. Save your masterpiece to Pictures and make it your desktop background.'],
        ['calculator', 'Calculator', 'icons/calculator', 'Does the math, from simple sums to scientific functions.'],
        ['cmd', 'Command Prompt', 'icons/cmd', 'Type commands like the pros. Try {{help}}, {{dir}} and {{color a}}. Some secret commands are not listed. The fish know a few.'],
        ['stickynotes', 'Sticky Notes', 'icons/sticky', 'Little notes that stick to your desktop so you remember things.'],
      ] },
      { h: 'Internet and media', apps: [
        ['browser', 'Horizon Browser', 'icons/globe', 'Surf a glossy little web full of sites from a gentler time.'],
        ['messenger', 'Bubble Messenger', 'icons/chat', 'Chat with friends, send winks and nudges, and set a personal message.'],
        ['mediaplayer', 'Aerium Media Player', 'icons/mediaplayer', 'Plays the sample music with glowing visualizations.'],
        ['channels', 'Channels', 'icons/channels', 'Calm, rounded channels for photos, weather and more, with gentle menu music.'],
      ] },
      { h: 'Games and fun', apps: [
        ['games', 'Games', 'icons/gamepad', 'Solitaire, Minesweeper, Pairs, Bubble Pop and more. Win at Solitaire to watch the cards bounce.'],
        ['solitaire', 'Solitaire', 'icons/cards', 'The classic card game. The bouncing cards at the end are the best part.'],
        ['minesweeper', 'Minesweeper', 'icons/mine', 'Clear the field without setting off a mine. Right-click to plant a flag.'],
        ['aquarium', 'Aquarium', 'icons/aquarium', 'Your fish tank, up close. Click to drop food.'],
        ['gadgets', 'Gadgets', 'icons/gadgets', 'Clocks, weather and meters that live on your desktop.'],
      ] },
      { h: 'System tools', apps: [
        ['explorer', 'Computer and folders', 'icons/computer', 'Browse your files and folders. Pictures show up as thumbnails.'],
        ['taskmgr', 'Task Manager', 'icons/taskmgr', 'See what is running and end programs that stop responding. Press [[Ctrl]] + [[Shift]] + [[Esc]].'],
        ['controlpanel', 'Control Panel', 'icons/settings', 'Every setting in one place, from the network to the power plan.'],
        ['personalize', 'Personalization', 'icons/personalize', 'Glass colors, backgrounds, screen savers, sounds and pointers.'],
        ['system', 'System', 'icons/computer', 'Your computer\'s details and its Aerium Experience Index.'],
      ] },
    ],
    related: ['getting-started', 'shortcuts'],
  };

  ART.faq = {
    title: 'Frequently asked questions', short: 'Questions and answers', icon: 'icons/help',
    blurb: 'Where your files live, sound, starting over and more.',
    lead: 'Click a question to see its answer.',
    blocks: [
      { faq: [
        ['Where are my files saved?', 'In this browser\'s storage. Aerium keeps your documents, pictures and settings right here, in this browser on this computer, and nowhere else. Nothing is uploaded. If you clear your browsing data, or open Aerium in a different browser or a private window, you will start fresh. The space is small (about 5 MB), so keep your pictures modest.'],
        ['Why can\'t I hear anything?', 'Browsers wait for your first click before they play any sound. Click anywhere, then check the speaker icon in the notification area. You can also listen to every sound in Personalization.', ['Open Sounds', pz('sounds')]],
        ['How do I change the glass color?', 'Right-click the desktop, choose **Personalize**, then **Window Color and Appearance**. Pick a swatch, or open the color mixer to make your own.', ['Change the glass color', pz('color')]],
        ['Can I use my own pictures as the background?', 'Yes! Save a picture in your Pictures folder (Paint can do this), then open **Desktop Background** and choose **Pictures folder**.', ['Open Desktop Background', pz('background')]],
        ['How do I start over?', 'Add {{?reset}} to the end of Aerium\'s address in your browser and press [[Enter]]. Everything goes back to how it was on your very first day. This can\'t be undone, so save anything you love first.'],
        ['Is Aerium a real operating system?', 'No. It is a playground made of web pages. It runs entirely inside your browser and can\'t touch the rest of your computer.'],
        ['Do the fish need feeding?', 'They would love it. Click the fish tank to drop in some food. Don\'t worry, they never go hungry.'],
        ['What is my password?', 'There isn\'t one. Aerium never asks for a password and never stores one, even if you type one in User Accounts.'],
        ['Why does my screen go dark after a while?', 'That is the screen saver, or your power plan turning the display off to save energy. Move the mouse to wake up. You can change the timing in Screen Saver settings and Power Options.', ['Open Power Options', cp('power')]],
        ['How do I make text bigger?', 'Open the Ease of Access Center and turn on **large text**, or choose the larger scale in Display Settings.', ['Open Ease of Access', cp('accessibility')]],
      ] },
    ],
    related: ['getting-started', 'things'],
  };
})();
