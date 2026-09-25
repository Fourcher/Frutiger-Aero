/* Aquarium: look after the fish on your desktop. Name them, add new ones,
   change their colors, feed them, switch the lights and throw a party. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;

  const SPECIES_ORDER = ['betta', 'goldfish', 'angelfish', 'guppy', 'cory', 'tetra'];
  const BLURB = {
    betta: 'Curious and elegant. Hold your cursor still and it comes to say hello.',
    goldfish: 'Round, golden and always hungry. The friendliest fish in the tank.',
    angelfish: 'Tall, striped and graceful. Glides slowly through the middle of the tank.',
    guppy: 'Small and speedy with a bright fan tail.',
    cory: 'A little catfish that scoots along the sand looking for crumbs.',
    tetra: 'A school of tiny fish with a glowing blue stripe. They glow at night.',
  };

  // Draws one fish into a small canvas for lists and cards (again once its
  // photo has decoded, if it hadn't yet).
  function fishPortrait(species, palette, w = 72, hgt = 48) {
    const c = h('canvas.aqa-portrait', { width: w * 2, height: hgt * 2, style: { width: w + 'px', height: hgt + 'px' } });
    const f = A.fish.makeFish(species, { palette });
    f.phase = 0.8; f.finPhase = 0.5;
    const paint = () => {
      const ctx = c.getContext('2d');
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, w, hgt);
      const e = A.fish.extent(f);
      const scale = Math.min((w * 0.9) / (e.x1 - e.x0), (hgt * 0.88) / (e.y1 - e.y0));
      ctx.translate(w / 2 - ((e.x0 + e.x1) / 2) * scale, hgt / 2 - ((e.y0 + e.y1) / 2) * scale);
      ctx.scale(scale, scale);
      A.fish.draw(ctx, f, 1.2);
    };
    if (A.fish.ready(f)) paint(); else A.fish.whenReady(f, paint);
    return c;
  }

  A.apps.register({
    id: 'aquarium',
    name: 'Aquarium',
    icon: 'icons/aquarium',
    color: '#1fb4d8',
    category: 'accessories',
    single: true,
    description: 'Look after the fish that live on your desktop.',
    keywords: ['fish', 'tank', 'wallpaper', 'betta', 'pets'],
    window: { width: 820, height: 560, minWidth: 640, minHeight: 440, glassBody: true },
    launch(win) {
      const stage = h('div.aqa-stage');
      const list = h('div.aqa-list');
      const count = h('span.aqa-count');
      const tankCtl = A.aquarium.create(stage, { mode: 'tank', preview: true });
      stage.addEventListener('click', (e) => tankCtl.pointer('click', e.clientX, e.clientY));
      stage.addEventListener('pointermove', (e) => tankCtl.pointer('move', e.clientX, e.clientY));
      stage.addEventListener('pointerleave', () => tankCtl.pointer('leave', 0, 0));

      function roster() { return A.aquarium.roster().map((e) => Object.assign({}, e)); }
      function save(r) { A.aquarium.setRoster(r); render(); }

      function render() {
        const r = roster();
        list.innerHTML = '';
        let fishCount = 0;
        r.forEach((e) => {
          fishCount += e.count || 1;
          const sp = A.fish.SPECIES[e.species];
          const pal = sp.palettes[(e.palette || 0) % sp.palettes.length];
          const nameEl = h('input.aqa-name', { value: e.name, maxLength: 28, spellcheck: false, 'aria-label': 'Fish name' });
          nameEl.addEventListener('change', () => { const rr = roster(); const it = rr.find((x) => x.id === e.id); if (it) { it.name = nameEl.value.trim() || it.name; save(rr); A.sound.play('click'); } });
          nameEl.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') nameEl.blur(); });
          const row = h('div.aqa-row', null,
            fishPortrait(e.species, e.palette || 0),
            h('div.aqa-row-text', null, nameEl, h('span.aqa-sub', null, (e.count ? e.count + ' x ' : '') + sp.name + ' · ' + pal.name + (e.hero ? ' · Tank star' : ''))),
            h('div.aqa-row-actions', null,
              sp.palettes.length > 1 ? h('button.ae-tool', { type: 'button', 'data-tip': 'Change color', onclick: () => { const rr = roster(); const it = rr.find((x) => x.id === e.id); it.palette = ((it.palette || 0) + 1) % sp.palettes.length; save(rr); A.sound.play('bubble'); } }, A.img('icons/rainbow')) : null,
              h('button.ae-tool', { type: 'button', 'data-tip': 'Release to the ocean', onclick: () => release(e) }, A.img('icons/wind'))));
          list.appendChild(row);
        });
        count.textContent = fishCount === 1 ? '1 fish' : fishCount + ' fish';
      }

      async function release(e) {
        const ok = await A.ui.confirm(`Release ${e.name} back to the ocean? ${e.count ? 'The whole school will swim away together.' : 'It will swim off the side of the tank.'}`, { title: 'Aquarium', icon: 'question', parent: win });
        if (!ok) return;
        save(roster().filter((x) => x.id !== e.id));
        A.sound.play('whooshOut');
      }

      function addFish(species, palette) {
        const r = roster();
        const names = A.aquarium.NAMES[species] || ['Bubbles'];
        const used = new Set(r.map((x) => x.name));
        const name = names.find((n) => !used.has(n)) || names[0] + ' ' + (r.length + 1);
        const entry = { id: 'f' + Date.now().toString(36), species, palette, name };
        if (species === 'tetra') entry.count = 8;
        r.push(entry);
        save(r);
        A.sound.play('plop');
        A.notify({ title: 'Welcome, ' + name + '!', text: 'Your new ' + A.fish.SPECIES[species].name.toLowerCase() + ' is swimming into the tank.', icon: 'icons/aquarium', sound: false });
      }

      function addDialog() {
        let chosen = SPECIES_ORDER[0], palette = 0;
        const grid = h('div.aqa-species');
        const detail = h('div.aqa-detail');
        const swatches = h('div.aqa-swatches');
        function renderDetail() {
          const sp = A.fish.SPECIES[chosen];
          detail.innerHTML = '';
          detail.append(fishPortrait(chosen, palette, 200, 120), h('div', null, h('b', null, sp.name), h('p', null, BLURB[chosen])));
          swatches.innerHTML = '';
          sp.palettes.forEach((p, i) => {
            const b = h('button.aqa-swatch', { type: 'button', class: i === palette && 'on', 'data-tip': p.name, style: { background: `linear-gradient(135deg, ${(p.swatch || [p.body])[0]}, ${(p.swatch || [0, p.fin])[1]})` } });
            b.addEventListener('click', () => { palette = i; renderDetail(); A.sound.play('hover'); });
            swatches.appendChild(b);
          });
        }
        SPECIES_ORDER.forEach((id) => {
          const sp = A.fish.SPECIES[id];
          const card = h('button.aqa-card', { type: 'button', class: id === chosen && 'on' }, fishPortrait(id, 0, 96, 60), h('span', null, sp.name));
          card.addEventListener('click', () => {
            chosen = id; palette = 0;
            grid.querySelectorAll('.aqa-card').forEach((c) => c.classList.remove('on'));
            card.classList.add('on');
            renderDetail();
            A.sound.play('hover');
          });
          grid.appendChild(card);
        });
        renderDetail();
        A.ui.dialog({
          parent: win, title: 'Add a fish', icon: 'icons/aquarium', width: 560,
          content: h('div.aqa-add', null, grid, h('div.aqa-add-side', null, detail, h('div.aqa-sw-label', null, 'Color'), swatches)),
          buttons: [{ label: 'Add to tank', tone: 'grass', default: true, onClick: () => { addFish(chosen, palette); } }, { label: 'Cancel', cancel: true }],
        });
      }

      // Who took the photographs the tank is made of.
      function creditsDialog() {
        const seen = new Set(), rows = [];
        Object.keys(A.PHOTOS || {}).sort().forEach((k) => {
          const c = A.PHOTOS[k].credit;
          if (!c || seen.has(c.source)) return;
          seen.add(c.source);
          rows.push(h('li', null, h('a', { href: c.source, target: '_blank', rel: 'noopener' }, c.title || 'Photo'), ` by ${c.author}, ${c.license}`));
        });
        A.ui.dialog({
          parent: win, title: 'Photo credits', icon: 'icons/aquarium', width: 540,
          content: h('div.aqa-credits', null,
            h('p', null, 'The fish, plants, stones and wood in the tank are real photographs, cut out and color-matched, used under open licenses. Thank you to everyone who shared them.'),
            h('ul', null, rows)),
          buttons: [{ label: 'Close', default: true, cancel: true }],
        });
      }

      function feed() {
        tankCtl.feed();
        const wc = A.store.get('wallpaper') === 'aquarium' ? A.theme.wallpaperController() : null;
        if (wc && wc.feed) wc.feed();
        const n = A.store.get('aquarium.fed', 0) + 1;
        A.store.set('aquarium.fed', n);
        mood.textContent = moodText();
      }
      function tap() {
        tankCtl.tap();
        const wc = A.store.get('wallpaper') === 'aquarium' ? A.theme.wallpaperController() : null;
        if (wc && wc.tap) wc.tap();
      }
      const moodText = () => { const n = A.store.get('aquarium.fed', 0); return n > 20 ? 'Mood: very full and very happy' : n > 5 ? 'Mood: happy' : n > 0 ? 'Mood: content' : 'Mood: a little hungry'; };
      const mood = h('span.aqa-mood', null, moodText());

      const lights = A.ui.select({
        options: [['auto', 'Lights: follow theme'], ['day', 'Lights: day'], ['night', 'Lights: night']],
        value: A.store.get('aquarium.lights', 'auto'),
        onChange: (v) => { A.store.set('aquarium.lights', v); tankCtl.setLights(null); },
      });
      const feedClick = A.ui.checkbox({ label: 'Feed the fish when I click the desktop', checked: A.store.get('aquarium.feedOnClick') !== false, onChange: (v) => A.store.set('aquarium.feedOnClick', v) });

      const toolbar = h('div.aqa-toolbar', null,
        A.ui.button('Feed', { tone: 'grass', icon: 'icons/gift', onClick: feed }),
        A.ui.button('Tap the glass', { icon: 'icons/bell', onClick: tap }),
        A.ui.button('Add a fish', { tone: 'aqua', icon: 'icons/plus', onClick: addDialog }),
        h('span.aqa-spacer'),
        lights);
      const foot = h('div.aqa-foot', null,
        feedClick,
        h('span.aqa-spacer'),
        A.ui.button('Fish party', { size: 'sm', icon: 'icons/star', onClick: () => { const wc = A.theme.wallpaperController(); if (A.store.get('wallpaper') !== 'aquarium') A.theme.setWallpaper('aquarium'); setTimeout(() => { const c = A.theme.wallpaperController(); c && c.party && c.party(); }, 300); tankCtl.party(); A.sound.play('win'); void wc; } }),
        A.ui.button('Use as wallpaper', { size: 'sm', onClick: () => { A.theme.setWallpaper('aquarium'); A.notify({ title: 'Aquarium wallpaper', text: 'Your fish tank is now your desktop.', icon: 'icons/aquarium', sound: false }); } }),
        A.ui.button('Betta wallpaper', { size: 'sm', onClick: () => A.theme.setWallpaper('betta') }),
        A.PHOTOS ? A.ui.button('Photo credits', { size: 'sm', onClick: creditsDialog }) : null);

      win.body.classList.add('aqa');
      win.body.append(
        toolbar,
        h('div.aqa-main', null,
          h('div.aqa-stage-wrap', null, stage, h('div.aqa-stage-caption', null, count, ' · ', mood, h('span.aqa-hint', null, 'Click the water to drop food'))),
          h('div.aqa-side', null, h('div.aqa-side-title', null, 'Your fish'), list)),
        foot);
      render();
      const off = A.bus.on('store:aquarium.fish', render);
      win.on('minimize', () => tankCtl.pause());
      win.on('restore', () => tankCtl.resume());
      return {
        onClose() { off(); tankCtl.destroy(); },
      };
    },
  });
})();
