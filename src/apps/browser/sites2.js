/* The pretend web, part 2: MySpot (profiles), TubeView (video site with
   canvas "videos"), SkyCast (weather) and Glossr (a Web 2.0 startup).
   Sites register into Aerium.web; see sites.js for the kit helpers. */
(function () {
  'use strict';
  const A = window.Aerium;
  const W = A.web || (A.web = { sites: [], kit: {}, register(def) { this.sites.push(def); return def; } });
  const K = W.kit || (W.kit = {});
  const esc = A.util.escapeHTML;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ================================================================ www.myspot.com
  const MS_USERS = {
    marty: { short: 'Marty', avatar: 'avatars/avatar-globe' },
    kayla: { short: '~*Kayla*~', avatar: 'avatars/avatar-flower' },
    tyler: { short: 'tyler [rawr]', avatar: 'avatars/avatar-music' },
    jess: { short: 'jess xoxo', avatar: 'avatars/avatar-butterfly' },
    ashley: { short: 'Ashley :)', avatar: 'avatars/avatar-sun' },
    mike: { short: 'Mike', avatar: 'avatars/avatar-dolphin' },
    brittany: { short: 'Brittany!!', avatar: 'avatars/avatar-leaf' },
    sk8rjake: { short: 'jake (sk8r)', avatar: 'icons/gamepad', link: 'http://www.geoplace.com/~sk8rjake/' },
    crystallagoon: { short: 'Crystal Lagoon', avatar: 'avatars/avatar-fish', band: true },
    djhydrate: { short: 'DJ Hydrate', avatar: 'icons/droplet', band: true },
    theglassmen: { short: 'The Glassmen', avatar: 'icons/disc', band: true },
    aquapura: { short: 'Aqua Pura', avatar: 'icons/headphones', band: true },
    skymall: { short: 'Sky Mall Orchestra', avatar: 'icons/cart', band: true },
  };
  const H = 3600000, D = 86400000;
  const MS_PROFILES = {
    kayla: {
      name: '~*~Kayla~*~', theme: 'kayla', age: 16, gender: 'Female', loc: 'Sunnyvale Heights', mood: 'bored', face: 'bored',
      headline: '"life is short. pop the bubble wrap."',
      song: { track: 'bubble-garden', title: 'Bubble Garden', artist: 'Crystal Lagoon' },
      marquee: '~*~ welcome 2 my page!!! leave me a comment!! ~*~ PC4PC ~*~ ur the best ~*~',
      about: 'omg hiii!! im kayla :) i love my friends, the mall, my goldfish Mr. Bubbles and changing my layout every week. i am obsessed with lime green glass right now. if u dont know what that means u need to get a computer lol.<br><br>fav quote: "be yourself, everyone else is already taken"<br><br>i type in all lowercase bc it looks cuter.',
      meet: 'whoever invented the glass window color thing. u r a genius!!<br>also the person who makes the bubbles screensaver. we should hang out.',
      interests: [['General', 'shopping, sleepovers, bubble tea, glitter, quizzes, my fish, IMing til 2am'], ['Music', 'Crystal Lagoon!!!, DJ Hydrate, anything u can dance to'], ['Movies', 'anything with a makeover montage'], ['Television', 'the one with the talent show'], ['Heroes', 'my mom. and Marty i guess since hes in everyones top 8']],
      details: [['Status', 'Busy being awesome'], ['Here for', 'Friends'], ['Hometown', 'Sunnyvale Heights'], ['Zodiac Sign', 'Virgo'], ['Education', 'High school (sophomore!!)'], ['Occupation', 'professional bubble popper']],
      top8: ['marty', 'tyler', 'jess', 'ashley', 'brittany', 'mike', 'crystallagoon', 'djhydrate'], friends: 214,
      blog: [
        ['new layout!!!', 'bored', 2 * D, 'ok so i spent like 4 hours on my new layout. do u like it?? the glitter took forever and my brother kept trying to use the computer. leave me a comment if u like it!! (PC4PC)'],
        ['ugh school', 'annoyed', 5 * D, 'we have a science project due friday and my partner is tyler and all he wants to do is make a volcano AGAIN. i said we should do bubbles. BUBBLES ARE SCIENCE. i even found an article on aeropedia. he said "rawr." what does that even mean.'],
        ['quiz results: i got LIME!!', 'bubbly', 9 * D, 'i took the which glass color are you quiz and got LIME!! "you are bright, fresh and a little bit zesty." sooo true lol. take it here: <a href="http://www.quizbubble.com/">quizbubble.com</a> and post ur results!!'],
      ],
      comments: [['jess', 'OMG ur layout is soooo cute!! did u make it urself?? PC4PC?', 3 * H], ['tyler', 'thanks 4 the comment!! c u at band practice fri. bring snacks', 7 * H], ['ashley', 'hey gurl!!! call me l8r we need 2 talk about u know what', 20 * H], ['crystallagoon', 'Thanks for listening, Kayla! See you at the Bubble Garden show!!', 30 * H], ['mike', 'thanks 4 the add!!', 2 * D], ['brittany', '~*~happy friday~*~ luv ya!! mwah', 3 * D], ['djhydrate', 'Thanks for the add! Check out our new track "Hydration Station" on our page!!', 4 * D], ['marty', 'Thanks for joining MySpot! Let me know if you have any questions.', 60 * D]],
    },
    tyler: {
      name: 'tyler [rawr]', theme: 'tyler', age: 17, gender: 'Male', loc: 'Glass Harbor', mood: 'contemplative', face: 'meh',
      headline: '"RAWR means I love you in dinosaur"',
      song: { track: 'glass-city', title: 'Glass City', artist: 'The Glassmen' },
      marquee: 'RAWR means I love you in dinosaur ::: band practice FRIDAY ::: new kickflip video on tubeview!!! :::',
      about: 'skater. drummer. professional night owl. i play drums in a band called Transparent Tuesday. we have 3 songs and one of them is just the word "glass" over and over. it slaps.<br><br>i watch too many videos on tubeview. my kickflip is getting better (see video. dont watch the end).',
      meet: 'someone who can land a heelflip. or someone with a drum kit i can borrow. or jake from the skate park.',
      interests: [['General', 'skateboarding, drums, staying up late, shoes with checkers on them'], ['Music', 'The Glassmen, anything loud, anything sad, anything loud AND sad'], ['Movies', 'skate videos, the one with the dinosaurs'], ['Books', 'does the back of a cereal box count'], ['Heroes', 'whoever invented the kickflip']],
      details: [['Status', 'Skating'], ['Here for', 'Friends, Networking'], ['Hometown', 'Glass Harbor'], ['Zodiac Sign', 'Scorpio'], ['Education', 'High school'], ['Occupation', 'drummer (unpaid)']],
      top8: ['sk8rjake', 'kayla', 'mike', 'theglassmen', 'marty', 'jess', 'djhydrate', 'brittany'], friends: 87,
      blog: [
        ['new kickflip video!!', 'accomplished', 1 * D, 'posted a video of my kickflip on tubeview. watch til the end. (im ok.) <a href="http://www.tubeview.com/watch?v=skate">watch it here</a>'],
        ['my band', 'creative', 6 * D, 'my band is called Transparent Tuesday. we practice in mikes garage. our first show is at the skate park if they let us plug in the amp. tell ur friends!!'],
      ],
      comments: [['sk8rjake', 'sick kickflip in ur video man!! the ending tho lol', 2 * H], ['kayla', 'hiii!! ur so random lol. thx 4 the add', 9 * H], ['mike', 'dude we should jam this weekend. my garage is free', D], ['jess', 'rawr!! xD', 2 * D], ['theglassmen', 'Thanks for rocking with us! Glass City forever', 5 * D], ['marty', 'Thanks for joining MySpot! Let me know if you have any questions.', 120 * D]],
    },
    marty: {
      name: 'Marty', theme: 'default', age: 31, gender: 'Male', loc: 'Aerium City', mood: 'excited', face: 'happy',
      headline: '"Welcome to MySpot!"',
      song: { track: 'sky-mall', title: 'Escalator Sunrise', artist: 'Sky Mall Orchestra' },
      about: 'Hi! I\'m Marty, and I\'m here to help you get the most out of MySpot. Customize your profile, add your friends, share your music and write a blog.<br><br>If you have any questions, send me a message. I read every single one. (There are a lot.)',
      meet: 'Everyone! I\'m already friends with all of you.',
      interests: [['General', 'Helping people, the internet, rounded corners'], ['Music', 'Everything on MySpot Music'], ['Movies', 'Documentaries about the internet'], ['Heroes', 'All of our users']],
      details: [['Status', 'Working on MySpot'], ['Here for', 'Friends, Networking, Helping'], ['Hometown', 'Aerium City'], ['Zodiac Sign', 'Aquarius'], ['Occupation', 'Co-founder, everyone\'s first friend']],
      top8: ['kayla', 'tyler', 'jess', 'crystallagoon', 'ashley', 'mike', 'brittany', 'djhydrate'], friends: 184203955,
      blog: [
        ['New feature: profile songs!', 'excited', 3 * D, 'You can now add a song to your profile! Visit MySpot Music, find a band you like and click "Add to profile." Please remember that not everyone wants to hear a song the second they open your page, so be kind.'],
        ['Welcome to MySpot!', 'happy', 400 * D, 'MySpot is a spot for friends. Make a profile, add your friends, customize your layout and share what you love. We\'re so glad you\'re here.'],
      ],
      comments: [['kayla', 'hi marty!!! thx 4 the add', 5 * H], ['tyler', 'why r u in everyones top 8 lol', 11 * H], ['mike', 'thanks 4 the add!!', D], ['jess', 'Marty ur the best!!! can u make it so i can have a top 12', 2 * D], ['brittany', 'thanks 4 the add!!', 3 * D], ['ashley', 'how do i put glitter on my page', 4 * D], ['sk8rjake', 'thanks 4 the add marty', 6 * D]],
    },
    crystallagoon: {
      name: 'Crystal Lagoon', theme: 'band', band: true, genre: 'Chillout / Ambient / Aquatic', loc: 'Aerium City', mood: 'grateful', face: 'happy',
      headline: '"Music you can float in."',
      song: { track: 'bubble-garden', title: 'Bubble Garden', artist: 'Crystal Lagoon' },
      tracks: [['bubble-garden', 'Bubble Garden', '4:12', 1022981], ['dolphin-dreams', 'Dolphin Dreams', '3:48', 845530], [null, 'Lagoon Nights (demo)', '2:59', 120044]],
      shows: [[7, 'The Glass Dome', 'Aerium City'], [14, 'Seaside Pavilion', 'Crystal Bay'], [21, 'Bubble Fest (outdoor stage)', 'Sunnyvale Heights'], [30, 'The Aquarium Lounge', 'Glass Harbor']],
      about: 'Crystal Lagoon is a two-piece from Aerium City making warm, glassy music with electric pianos, soft pads and the occasional recorded bubble. Our debut album "Bubble Garden" is out now.<br><br>Members: Coral (keys, bubbles) and Finn (synths, more bubbles).',
      meet: 'Influences: rain on a skylight, screensavers, aquariums at night, the ocean. Sounds like: floating.',
      interests: [['Record label', 'Unsigned (for now!)'], ['Type of label', 'None'], ['Influences', 'water, glass, sunsets']],
      details: [['Genre', 'Chillout / Ambient / Aquatic'], ['Location', 'Aerium City'], ['Profile views', '2,410,882'], ['Last login', 'Today']],
      top8: ['djhydrate', 'aquapura', 'theglassmen', 'skymall', 'marty', 'kayla', 'jess', 'tyler'], friends: 38211,
      blog: [
        ['Bubble Garden tour dates announced!', 'excited', 2 * D, 'We are going on tour! Every show ends with a bubble machine, and possibly a second, backup bubble machine. See the dates on this page.'],
        ['Thank you!!', 'grateful', 12 * D, 'We just passed 1 million plays. We honestly do not know what to say except: glub glub. Thank you.'],
      ],
      comments: [['kayla', 'OMG i love Bubble Garden!!! its my profile song!!!', 4 * H], ['ashley', 'when r u coming 2 sunnyvale?? oh wait bubble fest!! yay', 10 * H], ['mike', 'this song is my ringtone now lol', D], ['jess', 'thanks 4 the add!!', 2 * D], ['djhydrate', 'Tour buddies!! See you on the road', 3 * D]],
    },
  };
  const MS_BULLETINS = [
    ['kayla', '~*~TAKE THIS QUIZ~*~ which glass color are u??', 2 * H, 'http://www.quizbubble.com/'],
    ['tyler', 'band practice cancelled (drummer broke his stick) (i am the drummer)', 6 * H, 'http://www.myspot.com/tyler'],
    ['crystallagoon', 'NEW TOUR DATES!! Bubble Garden tour hits 4 cities', 20 * H, 'http://www.myspot.com/crystallagoon'],
    ['jess', 'repost this if u think fish are cute', D, 'http://www.fishpals.com/'],
    ['marty', 'New feature: profile songs are here!', 3 * D, 'http://www.myspot.com/blog/marty'],
  ];
  const MS_LAYOUTS = [['default', 'MySpot classic'], ['kayla', 'Sparkle pink'], ['tyler', 'Midnight stars'], ['band', 'Aqua lagoon']];
  const MS_MOODS = [['bored', 'bored', 'bored'], ['happy', 'happy', 'happy'], ['bubbly', 'bubbly', 'happy'], ['excited', 'excited', 'happy'], ['sleepy', 'sleepy', 'meh'], ['hungry', 'hungry', 'meh'], ['artistic', 'artistic', 'happy'], ['contemplative', 'contemplative', 'meh']];
  const MS_SONGS = [['bubble-garden', 'Crystal Lagoon - Bubble Garden'], ['dolphin-dreams', 'Crystal Lagoon - Dolphin Dreams'], ['aurora-drift', 'Aqua Pura - Aurora Drift'], ['hydration-station', 'DJ Hydrate - Hydration Station'], ['glass-city', 'The Glassmen - Glass City'], ['sky-mall', 'Sky Mall Orchestra - Escalator Sunrise']];

  const msStamp = (ms) => { const d = new Date(Date.now() - ms); return K.shortDate(d) + ' ' + A.util.fmtTime(d); };
  const msUser = (id) => MS_USERS[id] || { short: id, avatar: 'icons/user' };
  const msHref = (id) => (msUser(id).link || 'http://www.myspot.com/' + id);
  const msFace = (kind) => `<span class="web-ms-face web-ms-face-${kind}" aria-hidden="true"></span>`;

  function msHeader(active) {
    const nav = [['Home', '/'], ['Browse', '/browse'], ['Search', '/search'], ['Invite', '#invite'], ['Mail', '#mail'], ['Blog', '/blog/marty'], ['Favorites', '#favorites'], ['Groups', '#groups'], ['Videos', 'http://www.tubeview.com/'], ['Music', '/music'], ['Games', 'http://www.minigames.com/']];
    return `<div class="web-ms-head"><div class="web-ms-headin">
      <a class="web-ms-logo" href="http://www.myspot.com/"><span class="web-ms-people"><i></i><i></i></span><span>MySpot<small>.com</small></span><em>a spot for friends</em></a>
      <form class="web-ms-search" action="/search"><select name="type" aria-label="Search type"><option>People</option><option>Music</option></select><input name="q" type="text" autocomplete="off" aria-label="Search MySpot"><button type="submit">Search</button></form>
    </div></div>
    <div class="web-ms-nav">${nav.map(([t, u]) => `<a href="${u}"${t === active ? ' class="on"' : ''}${u[0] === '#' ? ' data-joke="' + u.slice(1) + '"' : ''}>${t}</a>`).join('<span>|</span>')}</div>`;
  }
  function msWire(ctx, root) {
    root.querySelectorAll('[data-joke]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const k = a.dataset.joke;
      const msg = { invite: ['Invite your friends!', 'Type their e-mail addresses here... just kidding. Tell them in person, it is more fun.'], mail: ['Your MySpot inbox', 'You have 1 new message from Marty: "Welcome to MySpot!" You have also read it 400 times.'], favorites: ['Favorites', 'You have not added any favorites yet. Kayla is a great place to start.'], groups: ['MySpot Groups', 'Popular groups: "I Love Glass (The Window Kind)", "People Who Pop Bubble Wrap", "Lime Green Forever".'] }[k] || ['MySpot', 'Coming soon!'];
      ctx.dialog({ title: 'MySpot', icon: 'icons/users', instruction: msg[0], message: msg[1] });
    }));
  }
  function msFrame(ctx, active, theme, inner) {
    return `<div class="web-ms web-ms-t-${theme}">${msHeader(active)}<div class="web-ms-body">${inner}</div><div class="web-ms-foot"><a href="#" data-joke="about">About</a> | <a href="#" data-joke="faq">FAQ</a> | <a href="#" data-joke="terms">Terms</a> | <a href="#" data-joke="privacy">Privacy</a> | <a href="#" data-joke="safety">Safety Tips</a> | <a href="http://www.bubblesearch.com/">Search the web</a><br>&copy; 2003-2007 MySpot.com. All Rights Reserved.</div></div>`;
  }

  // Friend requests: pending, then accepted a few seconds later.
  function msFriendState(ctx, id) {
    if (id === 'marty') return 'friends';
    const all = ctx.store.get('myspot.friends', {});
    const f = all[id];
    if (f && f.state === 'pending' && Date.now() - f.t > 6000) { all[id] = { state: 'friends', t: Date.now() }; ctx.store.set('myspot.friends', all); return 'accepted-now'; }
    return f ? f.state : 'none';
  }
  function msAddFriend(ctx, id, onChange) {
    const u = msUser(id);
    const st = msFriendState(ctx, id);
    if (st === 'friends' || st === 'accepted-now') {
      ctx.dialog({ title: 'MySpot', icon: 'icons/users', instruction: id === 'marty' ? 'Marty is already your friend' : u.short + ' is already your friend', message: id === 'marty' ? 'Everyone\'s first friend is Marty. It is kind of his whole thing.' : 'You are in their extended network! Getting into their Top 8 is a whole other thing. Do not push it.' });
      return;
    }
    if (st === 'pending') { ctx.dialog({ title: 'MySpot', icon: 'icons/clock', instruction: 'Friend request pending', message: u.short + ' has not responded yet. They are probably changing their layout again.' }); return; }
    ctx.dialog({ title: 'MySpot', icon: 'icons/users', instruction: 'Add ' + u.short + ' to your friends?', message: u.short + ' will have to confirm that you are friends.', buttons: [{ label: 'Add to Friends', default: true, value: 'add' }, { label: 'Cancel', cancel: true, value: null }] }).then((r) => {
      if (r !== 'add') return;
      const all = ctx.store.get('myspot.friends', {});
      all[id] = { state: 'pending', t: Date.now() };
      ctx.store.set('myspot.friends', all);
      ctx.sound('ding');
      if (onChange) onChange('pending');
      setTimeout(() => {
        const cur = ctx.store.get('myspot.friends', {});
        if (!cur[id] || cur[id].state !== 'pending') return;
        cur[id] = { state: 'friends', t: Date.now() };
        ctx.store.set('myspot.friends', cur);
        A.notify.toast({ title: u.short + ' approved your friend request!', text: u.band ? 'Thanks for the add! Now go listen to our songs.' : 'thanks 4 the add!! (you are not in the Top 8 yet. dont push it.)', avatar: u.avatar.startsWith('avatars/') ? u.avatar : null, app: 'MySpot', appIcon: 'icons/users' });
        if (onChange && ctx.alive()) onChange('friends');
      }, 6000);
    });
  }

  // Profile song: plays through Aerium.music when it exists; otherwise a tiny synth tune.
  function msPlayer(ctx, root, song) {
    const el = root.querySelector('.web-ms-player');
    if (!el || !song) return;
    const btn = el.querySelector('.web-ms-playbtn');
    const bar = el.querySelector('.web-ms-pfill');
    const time = el.querySelector('.web-ms-ptime');
    const M = A.music;
    let mine = false, fallback = null, fT = 0;
    const setUI = (playing) => { el.classList.toggle('playing', playing); btn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); btn.setAttribute('data-tip', playing ? 'Pause' : 'Play ' + song.title); };
    const isOurs = () => M && M.current && M.current.id === song.track;
    function tick() {
      if (M && typeof M.play === 'function') {
        const ours = isOurs();
        const playing = ours && M.state === 'playing';
        setUI(playing);
        if (ours) {
          const dur = M.duration || (M.current && M.current.duration) || 240;
          const pos = M.position || 0;
          bar.style.width = clamp((pos / dur) * 100, 0, 100) + '%';
          time.textContent = A.util.fmtDuration(pos) + ' / ' + A.util.fmtDuration(dur);
        }
      } else if (fallback) {
        fT += 0.5;
        bar.style.width = clamp((fT / 40) * 100, 0, 100) + '%';
        time.textContent = A.util.fmtDuration(fT) + ' / 0:40';
        if (fT >= 40) stopFallback();
      }
    }
    function playFallback() {
      const dest = ctx.audio();
      if (!dest || !A.sound.ctx) { ctx.dialog({ title: 'MySpot', icon: 'icons/music', instruction: 'Click to allow sound', message: 'Turn on "Play sounds in webpages" in Internet Options (Advanced tab) to hear profile songs.' }); return; }
      dest.gain.value = 0.7;
      const notes = ['C5', 'E5', 'G5', 'B5', 'A5', 'G5', 'E5', 'D5', 'F5', 'A5', 'C6', 'A5', 'G5', 'E5', 'C5', 'D5'];
      let i = 0;
      const step = () => {
        if (!fallback) return;
        const t = A.sound.ctx.currentTime + 0.02;
        A.sound.bell(notes[i % notes.length], t, { vel: 0.05, dur: 1.2, dest, rev: 0.4 });
        if (i % 4 === 0) A.sound.pad([['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']][(i / 4) % 4].slice(), t, { dur: 2.4, vel: 0.025, dest });
        i++;
      };
      fallback = setInterval(step, 600);
      fT = 0;
      step();
      setUI(true);
    }
    function stopFallback() { if (fallback) clearInterval(fallback); fallback = null; setUI(false); }
    btn.addEventListener('click', () => {
      if (M && typeof M.play === 'function') {
        if (isOurs() && M.state === 'playing') { M.pause(); setUI(false); return; }
        if (isOurs() && M.state === 'paused' && M.resume) { M.resume(); setUI(true); mine = true; return; }
        try { const p = M.play(song.track, { fadeIn: true }); if (p && p.catch) p.catch(() => {}); mine = true; setUI(true); } catch (e) { playFallback(); }
      } else if (fallback) stopFallback();
      else playFallback();
    });
    ctx.every(500, tick);
    ctx.onUnload(() => {
      stopFallback();
      try { if (mine && isOurs() && M.state !== 'stopped') M.stop({ fadeOut: true }); } catch (e) { /* ignore */ }
    });
    tick();
  }
  const msPlayerHTML = (song, big) => `<div class="web-ms-player${big ? ' big' : ''}"><button type="button" class="web-ms-playbtn" aria-label="Play" data-tip="Play ${esc(song.title)}"><i></i></button><div class="web-ms-pinfo"><b>${esc(song.artist)}</b> - ${esc(song.title)}<div class="web-ms-pbar"><i class="web-ms-pfill"></i></div></div><span class="web-ms-ptime">0:00</span><span class="web-ms-plogo">MySpot<br>Music</span></div>`;

  function msCommentsData(ctx, id, P) {
    const mine = ctx.store.get('myspot.comments.' + id, []);
    const base = (P && P.comments) || [];
    return mine.map((c) => ({ from: null, name: c.name, avatar: c.avatar, text: c.text, when: K.shortDate(c.t) + ' ' + A.util.fmtTime(new Date(c.t)), mine: true }))
      .concat(base.map(([from, text, ms]) => ({ from, name: msUser(from).short, avatar: msUser(from).avatar, text, when: msStamp(ms) })));
  }
  function msCommentsHTML(list) {
    if (!list.length) return '<p class="web-ms-empty">No comments yet. Be the first!</p>';
    return `<table class="web-ms-comments">${list.map((c) => `<tr><td class="web-ms-cfrom">${c.from ? `<a href="${msHref(c.from)}">${esc(c.name)}</a><a href="${msHref(c.from)}">${K.img(c.avatar, 'web-ms-cpic', c.name)}</a>` : `<a href="/me">${esc(c.name)}</a><a href="/me">${K.img(c.avatar, 'web-ms-cpic', c.name)}</a>`}</td><td class="web-ms-ctext"><span class="web-ms-cdate">${esc(c.when)}</span><p>${c.from ? c.text.replace(/\b(tubeview\.com\/watch\?v=\w+)/g, '<a href="http://www.$1">$1</a>') : esc(c.text)}</p></td></tr>`).join('')}</table>`;
  }
  function msWireComments(ctx, root, id, P, label) {
    const box = root.querySelector('.web-ms-cbox');
    const count = root.querySelector('.web-ms-ccount');
    const form = root.querySelector('.web-ms-post');
    if (!box || !form) return;
    const extra = (P && P.friends) ? Math.round(P.friends * 3.7) : 0;
    const paint = () => {
      const list = msCommentsData(ctx, id, P);
      box.innerHTML = msCommentsHTML(list);
      if (count) count.textContent = `Displaying ${list.length} of ${K.num(list.length + extra)} comments`;
    };
    paint();
    const ta = form.querySelector('textarea');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = ta.value.trim();
      if (!text) { ctx.dialog({ title: 'MySpot', icon: 'warning', message: 'Your comment is empty! Try "thanks 4 the add!!"' }); return; }
      const user = ctx.user();
      const mine = ctx.store.get('myspot.comments.' + id, []);
      mine.unshift({ name: user.name, avatar: user.avatar, text: text.slice(0, 400), t: Date.now() });
      ctx.store.set('myspot.comments.' + id, mine.slice(0, 30));
      ta.value = '';
      paint();
      ctx.sound('pop');
      const ok = form.querySelector('.web-ms-posted');
      ok.textContent = 'Comment posted! ' + (label || '') ;
      ctx.after(4000, () => { ok.textContent = ''; });
    });
  }

  function msProfile(ctx, id, P) {
    const u = msUser(id);
    const name = P.name;
    ctx.title((P.band ? name : name) + "'s MySpot profile");
    const st = msFriendState(ctx, id);
    const views = ctx.store.get('myspot.views.' + id, 0) + 1;
    ctx.store.set('myspot.views.' + id, views);
    const friendCount = P.friends + (st === 'friends' || st === 'accepted-now' ? 1 : 0);
    const glitter = P.theme === 'kayla';
    const hdr = (t) => (glitter ? `<span class="web-ms-glitter">${t}</span>` : t);
    const contact = [['icons/mail', 'Send Message', 'msg'], ['icons/users', 'Add to Friends', 'add'], ['icons/chat', 'Instant Message', 'im'], ['icons/star', 'Add to Favorites', 'fav'], ['icons/sync', 'Forward to Friend', 'fwd'], ['icons/folder', 'Add to Group', 'grp'], ['icons/shield', 'Block User', 'block'], ['icons/heart', 'Rank User', 'rank']];
    const left = `
      <div class="web-ms-namebox"><h1 class="web-ms-name">${glitter ? `<span class="web-ms-glitter big">${esc(name)}</span>` : esc(name)}</h1>
        <div class="web-ms-idrow">${K.img(u.avatar, 'web-ms-pic', name)}<div class="web-ms-idtext"><i>${esc(P.headline)}</i><br><br>${P.band ? esc(P.genre) + '<br>' : esc(P.gender) + '<br>' + P.age + ' years old<br>'}${esc(P.loc)}<br><br><span class="web-ms-online"><i></i>Online Now!</span><br><small>Last Login: ${esc(A.util.fmtDate(new Date()))}</small></div></div>
        <div class="web-ms-mood"><b>Mood:</b> ${esc(P.mood)} ${msFace(P.face)}</div>
        <div class="web-ms-viewmy">View My: <a href="http://www.glossr.com/explore">Pics</a> | <a href="http://www.tubeview.com/">Videos</a>${P.band ? ' | <a href="/music">Music</a>' : ''}</div></div>
      <div class="web-ms-box"><div class="web-ms-boxh">Contacting ${esc(u.short)}</div><div class="web-ms-contact">${contact.map(([ic, label, k]) => `<a href="#" data-act="${k}">${K.img(ic, 'web-ms-ci')}<span>${label}</span></a>`).join('')}</div></div>
      <div class="web-ms-urlbox"><b>MySpot URL:</b><br>http://www.myspot.com/${id}</div>
      <div class="web-ms-box"><div class="web-ms-boxh">${esc(u.short)}'s ${P.band ? 'Info' : 'Interests'}</div><table class="web-ms-table">${P.interests.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></div>
      <div class="web-ms-box"><div class="web-ms-boxh">${esc(u.short)}'s Details</div><table class="web-ms-table">${P.details.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}<tr><th>Profile views</th><td>${K.num(views + 1200 + (K.hash(id) % 9000))}</td></tr></table></div>`;
    const shows = P.shows ? `<div class="web-ms-box"><div class="web-ms-boxh">Upcoming Shows</div><table class="web-ms-shows">${P.shows.map(([d, venue, city]) => `<tr><td>${esc(K.shortDate(Date.now() + d * D))}</td><td><b>${esc(venue)}</b><br>${esc(city)}</td><td><a href="#" data-act="tix">Tickets</a></td></tr>`).join('')}</table></div>` : '';
    const tracks = P.tracks ? `<div class="web-ms-box web-ms-tracks"><div class="web-ms-boxh">${esc(name)} - Songs</div>${P.tracks.map(([tr, t, len, plays]) => `<div class="web-ms-track${tr ? '' : ' off'}"><button type="button" data-track="${tr || ''}" aria-label="Play ${esc(t)}" ${tr ? '' : 'disabled'}><i></i></button><b>${esc(t)}</b><span>${len}</span><small>Plays: ${K.num(plays)}</small><a href="#" data-act="addsong">Add to profile</a></div>`).join('')}</div>` : '';
    const right = `
      ${P.song ? msPlayerHTML(P.song) : ''}
      ${tracks}
      <div class="web-ms-ext">${st === 'friends' || st === 'accepted-now' ? `<b>${esc(u.short)} is your friend.</b>` : st === 'pending' ? `<b>Friend request sent to ${esc(u.short)}.</b>` : `<b>${esc(u.short)} is in your extended network.</b>`}</div>
      ${st === 'accepted-now' ? `<div class="web-ms-accepted">${K.img(u.avatar, 'web-ms-accpic')} ${esc(u.short)} approved your friend request! You are now friends.</div>` : ''}
      ${P.blog && P.blog.length ? `<div class="web-ms-box"><div class="web-ms-boxh">${hdr(esc(u.short) + "'s Latest Blog Entries")} <a href="/blog/${id}" class="web-ms-subscribe">[Subscribe to this Blog]</a></div><ul class="web-ms-blogs">${P.blog.map(([t], i) => `<li>${esc(t)} (<a href="/blog/${id}#entry-${i}">view more</a>)</li>`).join('')}</ul><div class="web-ms-boxfoot">[<a href="/blog/${id}">View All Blog Entries</a>]</div></div>` : ''}
      ${shows}
      <div class="web-ms-box"><div class="web-ms-boxh">${hdr(esc(u.short) + "'s Blurbs")}</div><div class="web-ms-boxb"><div class="web-ms-orange">About me:</div><p>${P.about}</p><div class="web-ms-orange">${P.band ? 'Influences:' : "Who I'd like to meet:"}</div><p>${P.meet}</p></div></div>
      <div class="web-ms-box"><div class="web-ms-boxh">${hdr(esc(u.short) + "'s Friend Space")}</div><div class="web-ms-boxb"><div class="web-ms-orange">${esc(u.short)} has <span class="web-ms-red">${K.num(friendCount)}</span> friends.</div>
        <div class="web-ms-top8">${P.top8.map((f) => `<a href="${msHref(f)}" class="web-ms-t8"><span>${esc(msUser(f).short)}</span>${K.img(msUser(f).avatar, 'web-ms-t8img', msUser(f).short)}</a>`).join('')}</div>
        <div class="web-ms-allf"><a href="/browse">View All of ${esc(u.short)}'s Friends</a></div></div></div>
      <div class="web-ms-box"><div class="web-ms-boxh">${hdr(esc(u.short) + "'s Friends Comments")}</div><div class="web-ms-boxb"><div class="web-ms-orange"><span class="web-ms-ccount"></span> ( <a href="#add-comment">Add Comment</a> )</div>
        <div class="web-ms-cbox"></div>
        <form class="web-ms-post" id="add-comment"><b>Add a comment for ${esc(u.short)}:</b><textarea maxlength="400" placeholder="thanks 4 the add!!" aria-label="Comment"></textarea><div><button type="submit" class="web-ms-btn">Post a comment</button> <span class="web-ms-posted"></span></div></form></div></div>`;
    const inner = `${P.marquee ? `<div class="web-ms-marquee wk-marquee" style="--wk-speed:16s"><span>${esc(P.marquee)}</span></div>` : ''}<div class="web-ms-prof"><div class="web-ms-left">${left}</div><div class="web-ms-right">${right}</div></div>`;
    const root = ctx.html(msFrame(ctx, '', P.theme, inner));
    msWire(ctx, root);
    msPlayer(ctx, root, P.song);
    msWireComments(ctx, root, id, P);
    const ext = root.querySelector('.web-ms-ext');
    root.querySelectorAll('[data-act]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const k = a.dataset.act;
      if (k === 'add') msAddFriend(ctx, id, (s) => { ext.innerHTML = s === 'friends' ? `<b>${esc(u.short)} is your friend.</b>` : `<b>Friend request sent to ${esc(u.short)}.</b>`; });
      else if (k === 'msg') ctx.dialog({ title: 'MySpot Mail', icon: 'icons/mail', instruction: 'Message sent to ' + u.short, message: 'Your message is on its way. Expect a reply in about 3 to 5 business minutes, or whenever they get off the phone.' });
      else if (k === 'im') { if (!ctx.openApp('messenger')) ctx.dialog({ title: 'MySpot IM', icon: 'icons/chat', message: 'MySpot IM is not installed. Try Bubble Messenger!' }); }
      else if (k === 'fav') ctx.dialog({ title: 'MySpot', icon: 'icons/star', instruction: u.short + ' was added to your favorites', message: 'Now you can find them again in about four clicks.' });
      else if (k === 'fwd') ctx.dialog({ title: 'MySpot', icon: 'icons/sync', message: 'Profile forwarded to all 1 of your friends. (Marty says thanks.)' });
      else if (k === 'grp') ctx.dialog({ title: 'MySpot Groups', icon: 'icons/folder', message: 'Added ' + u.short + ' to the group "People With Excellent Layouts".' });
      else if (k === 'block') ctx.dialog({ title: 'MySpot', icon: 'icons/shield', instruction: 'Block ' + u.short + '?', message: 'Are you sure? They seem nice. They have a goldfish.', buttons: [{ label: 'Never mind', default: true }] });
      else if (k === 'rank') ctx.dialog({ title: 'Rank User', icon: 'icons/heart', instruction: 'You gave ' + u.short + ' a 10 out of 10', message: 'That is the only option. MySpot believes in everyone.' });
      else if (k === 'tix') ctx.dialog({ title: 'Tickets', icon: 'icons/music', instruction: 'Sold out!', message: 'Tickets sold out in 11 seconds. Maybe refresh a few hundred times?' });
      else if (k === 'addsong') ctx.dialog({ title: 'MySpot Music', icon: 'icons/music', instruction: 'Song added to your profile!', message: 'Visit your profile to hear it. Please remember: not everyone wants music the second they open your page.' });
    }));
    root.querySelectorAll('.web-ms-track button[data-track]').forEach((b) => b.addEventListener('click', () => {
      const tr = b.dataset.track;
      if (!tr) return;
      if (A.music && A.music.play) { try { const p = A.music.play(tr, { fadeIn: true }); if (p && p.catch) p.catch(() => {}); } catch (err) { /* ignore */ } root.querySelectorAll('.web-ms-track').forEach((x) => x.classList.remove('playing')); b.parentElement.classList.add('playing'); }
      else root.querySelector('.web-ms-playbtn').click();
    }));
    if (glitter) msSparkles(ctx, root);
  }

  // A sparkly cursor trail, strictly for Kayla's page.
  function msSparkles(ctx, root) {
    let last = 0;
    root.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - last < 45) return;
      last = now;
      if (root.querySelectorAll('.web-ms-spark').length > 24) return;
      const r = root.getBoundingClientRect();
      const s = document.createElement('i');
      s.className = 'web-ms-spark';
      s.style.left = (e.clientX - r.left + (Math.random() * 12 - 6)) + 'px';
      s.style.top = (e.clientY - r.top + (Math.random() * 12 - 6)) + 'px';
      s.style.setProperty('--hue', String(Math.round(Math.random() * 60 + 290)));
      s.addEventListener('animationend', () => s.remove());
      root.appendChild(s);
    });
  }

  function msPrivate(ctx, id) {
    const u = msUser(id);
    ctx.title(u.short + "'s MySpot profile");
    const st = msFriendState(ctx, id);
    const inner = `<div class="web-ms-private"><div class="web-ms-namebox"><h1 class="web-ms-name">${esc(u.short)}</h1><div class="web-ms-idrow">${K.img(u.avatar, 'web-ms-pic', u.short)}<div class="web-ms-idtext">${u.band ? 'Band' : ''}<br><span class="web-ms-online"><i></i>Online Now!</span></div></div></div>
      <div class="web-ms-box"><div class="web-ms-boxh">This profile is set to private</div><div class="web-ms-boxb"><p>${st === 'friends' || st === 'accepted-now' ? `You and ${esc(u.short)} are friends! Their profile is still under construction, though. Check back after they pick a layout.` : `To see ${esc(u.short)}'s profile, you must be their friend.`}</p><p><button type="button" class="web-ms-btn web-ms-addpriv">Add to Friends</button></p><p class="web-ms-ext"></p></div></div></div>`;
    const root = ctx.html(msFrame(ctx, '', 'default', inner));
    msWire(ctx, root);
    root.querySelector('.web-ms-addpriv').addEventListener('click', () => msAddFriend(ctx, id, (s) => { root.querySelector('.web-ms-ext').textContent = s === 'friends' ? 'You are now friends!' : 'Friend request sent!'; }));
  }

  function msMe(ctx) {
    const user = ctx.user();
    const me = Object.assign({ layout: 'default', mood: 'happy', about: 'hi!! this is my MySpot. i am still figuring out how to put glitter on it.', song: 'bubble-garden' }, ctx.store.get('myspot.me', {}));
    const friends = ctx.store.get('myspot.friends', {});
    const mine = ['marty'].concat(Object.keys(friends).filter((k) => friends[k].state === 'friends'));
    const moodDef = MS_MOODS.find((m) => m[0] === me.mood) || MS_MOODS[1];
    const songDef = MS_SONGS.find((s) => s[0] === me.song) || MS_SONGS[0];
    const song = { track: songDef[0], title: songDef[1].split(' - ')[1], artist: songDef[1].split(' - ')[0] };
    ctx.title(user.name + "'s MySpot profile");
    const glitter = me.layout === 'kayla';
    const inner = `<div class="web-ms-editbar"><b>Edit your profile:</b>
        <label>Layout <select class="web-ms-e-layout">${MS_LAYOUTS.map(([v, l]) => `<option value="${v}" ${v === me.layout ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Mood <select class="web-ms-e-mood">${MS_MOODS.map(([v, l]) => `<option value="${v}" ${v === me.mood ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Profile song <select class="web-ms-e-song">${MS_SONGS.map(([v, l]) => `<option value="${v}" ${v === me.song ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div class="web-ms-prof"><div class="web-ms-left">
        <div class="web-ms-namebox"><h1 class="web-ms-name">${glitter ? `<span class="web-ms-glitter big">${esc(user.name)}</span>` : esc(user.name)}</h1>
          <div class="web-ms-idrow">${K.img(user.avatar, 'web-ms-pic', user.name)}<div class="web-ms-idtext"><i>"new to MySpot!!"</i><br><br>Aerium City<br><br><span class="web-ms-online"><i></i>Online Now!</span></div></div>
          <div class="web-ms-mood"><b>Mood:</b> ${esc(moodDef[1])} ${msFace(moodDef[2])}</div></div>
        <div class="web-ms-urlbox"><b>MySpot URL:</b><br>http://www.myspot.com/me</div>
        <div class="web-ms-box"><div class="web-ms-boxh">Your Details</div><table class="web-ms-table"><tr><th>Here for</th><td>Friends</td></tr><tr><th>Member since</th><td>${esc(A.util.fmtDate(new Date()))}</td></tr><tr><th>Friends</th><td>${mine.length}</td></tr></table></div>
      </div><div class="web-ms-right">
        ${msPlayerHTML(song)}
        <div class="web-ms-box"><div class="web-ms-boxh">About me</div><div class="web-ms-boxb"><textarea class="web-ms-e-about" maxlength="600" aria-label="About me">${esc(me.about)}</textarea><div class="web-ms-small">Changes save automatically when you click away.</div></div></div>
        <div class="web-ms-box"><div class="web-ms-boxh">Your Friend Space</div><div class="web-ms-boxb"><div class="web-ms-orange">You have <span class="web-ms-red">${mine.length}</span> friend${mine.length === 1 ? '' : 's'}.</div>
          <div class="web-ms-top8">${mine.slice(0, 8).map((f) => `<a href="${msHref(f)}" class="web-ms-t8"><span>${esc(msUser(f).short)}</span>${K.img(msUser(f).avatar, 'web-ms-t8img', msUser(f).short)}</a>`).join('')}</div>
          ${mine.length < 2 ? '<p class="web-ms-small">Tip: visit <a href="/kayla">Kayla</a> or <a href="/tyler">Tyler</a> and click "Add to Friends".</p>' : ''}</div></div>
        <div class="web-ms-box"><div class="web-ms-boxh">Your Friends Comments</div><div class="web-ms-boxb"><p class="web-ms-empty">No comments yet. Leave some on your friends' pages and they might leave some back!</p></div></div>
      </div></div>`;
    const root = ctx.html(msFrame(ctx, '', me.layout, inner));
    msWire(ctx, root);
    msPlayer(ctx, root, song);
    const save = (patch) => { ctx.store.set('myspot.me', Object.assign(me, patch)); };
    root.querySelector('.web-ms-e-layout').addEventListener('change', (e) => { save({ layout: e.target.value }); ctx.reload(); });
    root.querySelector('.web-ms-e-mood').addEventListener('change', (e) => { save({ mood: e.target.value }); ctx.reload(); });
    root.querySelector('.web-ms-e-song').addEventListener('change', (e) => { save({ song: e.target.value }); ctx.reload(); });
    root.querySelector('.web-ms-e-about').addEventListener('change', (e) => { save({ about: e.target.value.slice(0, 600) }); ctx.status('Profile saved.'); });
    if (glitter) msSparkles(ctx, root);
  }

  function msHome(ctx) {
    ctx.title('MySpot.com | Home');
    const user = ctx.user();
    const friends = ctx.store.get('myspot.friends', {});
    const count = 1 + Object.keys(friends).filter((k) => friends[k].state === 'friends').length;
    const views = ctx.store.get('myspot.homeviews', 56) + 1;
    ctx.store.set('myspot.homeviews', views);
    const cool = ['kayla', 'tyler', 'jess', 'crystallagoon'];
    const inner = `<div class="web-ms-home">
      <div class="web-ms-hleft"><div class="web-ms-box"><div class="web-ms-boxh">Hello, ${esc(user.name)}!</div><div class="web-ms-boxb web-ms-me">${K.img(user.avatar, 'web-ms-pic')}<div><a href="/me">View My Profile</a><br><a href="/me">Edit Profile</a><br><a href="#" data-joke="mail">My Mail</a><br><a href="/browse">Find Friends</a><br><br><small>Profile views: ${K.num(views)}<br>Last login: just now</small></div></div></div>
        <div class="web-ms-box"><div class="web-ms-boxh">MySpot Announcements</div><div class="web-ms-boxb"><ul class="web-ms-blogs"><li><b>New!</b> Add a song to your profile with <a href="/music">MySpot Music</a>.</li><li>Customize your layout on <a href="/me">your profile</a>.</li><li>Watch videos on <a href="http://www.tubeview.com/">TubeView</a>.</li></ul></div></div></div>
      <div class="web-ms-hmid"><div class="web-ms-box"><div class="web-ms-boxh">Bulletin Space</div><table class="web-ms-bulletins"><tr><th>From</th><th>Date</th><th>Bulletin</th></tr>${MS_BULLETINS.map(([f, t, ms, u]) => `<tr><td><a href="${msHref(f)}">${K.img(msUser(f).avatar, 'web-ms-bpic')}<br>${esc(msUser(f).short)}</a></td><td>${esc(msStamp(ms))}</td><td><a href="${u}">${esc(t)}</a></td></tr>`).join('')}</table></div>
        <div class="web-ms-box"><div class="web-ms-boxh">Cool New People</div><div class="web-ms-boxb web-ms-cool">${cool.map((f) => `<a href="${msHref(f)}" class="web-ms-t8"><span>${esc(msUser(f).short)}</span>${K.img(msUser(f).avatar, 'web-ms-t8img')}</a>`).join('')}</div></div></div>
      <div class="web-ms-hright"><div class="web-ms-box"><div class="web-ms-boxh">Your Friend Space</div><div class="web-ms-boxb">You have <b class="web-ms-red">${count}</b> friend${count === 1 ? '' : 's'}.<br><a href="/marty">Marty</a> is always first.<br><br><a href="/browse">Browse people &raquo;</a></div></div>
        <div class="web-ms-box"><div class="web-ms-boxh">Featured Band</div><div class="web-ms-boxb web-ms-feat"><a href="/crystallagoon">${K.img('avatars/avatar-fish', 'web-ms-pic')}</a><div><a href="/crystallagoon"><b>Crystal Lagoon</b></a><br>Chillout / Aquatic<br><small>"Music you can float in."</small></div></div>${msPlayerHTML({ track: 'bubble-garden', title: 'Bubble Garden', artist: 'Crystal Lagoon' })}</div>
        <div class="web-ms-box web-ms-ad"><a href="http://www.quizbubble.com/">${K.burst('Quiz!', { size: 58, font: 12 })}<span><b>Which glass color are YOU?</b><br>Take the quiz and post it on your profile!</span></a></div></div>
    </div>`;
    const root = ctx.html(msFrame(ctx, 'Home', 'default', inner));
    msWire(ctx, root);
    msPlayer(ctx, root, { track: 'bubble-garden', title: 'Bubble Garden', artist: 'Crystal Lagoon' });
  }

  function msBrowse(ctx, q) {
    const ids = Object.keys(MS_USERS).filter((id) => !q || msUser(id).short.toLowerCase().includes(q.toLowerCase()) || id.includes(q.toLowerCase()));
    ctx.title(q ? 'MySpot Search: ' + q : 'MySpot | Browse Users');
    const inner = `<div class="web-ms-browse"><div class="web-ms-box"><div class="web-ms-boxh">${q ? 'Search results for "' + esc(q) + '"' : 'Browse Users'}</div><div class="web-ms-boxb">
      ${q ? '' : '<div class="web-ms-filter">Show: <select><option>Everyone</option><option>Bands only</option></select> between ages <select><option>14</option></select> and <select><option>99</option></select> who are <select><option>Online now</option><option>Anywhere</option></select> located within <select><option>any</option></select> miles of <input type="text" value="12345" size="6" aria-label="ZIP code"> <button type="button" class="web-ms-btn">Update</button></div>'}
      ${ids.length ? `<div class="web-ms-grid">${ids.map((id) => `<a href="${msHref(id)}" class="web-ms-t8"><span>${esc(msUser(id).short)}</span>${K.img(msUser(id).avatar, 'web-ms-t8img')}<small>${MS_PROFILES[id] ? '<span class="web-ms-online"><i></i>Online Now!</span>' : msUser(id).band ? 'Band' : 'Private'}</small></a>`).join('')}</div>` : `<p>No people found for "${esc(q)}". Try <a href="/search?q=kayla">kayla</a> or <a href="/search?q=tyler">tyler</a>.</p>`}
    </div></div></div>`;
    const root = ctx.html(msFrame(ctx, q ? 'Search' : 'Browse', 'default', inner));
    msWire(ctx, root);
    const upd = root.querySelector('.web-ms-filter button');
    if (upd) upd.addEventListener('click', () => ctx.dialog({ title: 'MySpot', icon: 'icons/users', message: 'Results updated. Somehow they look exactly the same.' }));
  }

  function msMusic(ctx) {
    ctx.title('MySpot Music');
    const bands = [['crystallagoon', 'Chillout / Aquatic', 'bubble-garden', 'Bubble Garden'], ['aquapura', 'Ambient', 'aurora-drift', 'Aurora Drift'], ['djhydrate', 'Electronic / Dance', 'hydration-station', 'Hydration Station'], ['theglassmen', 'Indie / Glass Rock', 'glass-city', 'Glass City'], ['skymall', 'Easy Listening', 'sky-mall', 'Escalator Sunrise']];
    const inner = `<div class="web-ms-box"><div class="web-ms-boxh">MySpot Music: Top Artists</div><div class="web-ms-boxb"><table class="web-ms-musictable">${bands.map(([id, genre, tr, title], i) => `<tr><td class="web-ms-rank">${i + 1}</td><td><a href="${msHref(id)}">${K.img(msUser(id).avatar, 'web-ms-bpic')}</a></td><td><a href="${msHref(id)}"><b>${esc(msUser(id).short)}</b></a><br>${esc(genre)}</td><td><button type="button" class="web-ms-btn" data-track="${tr}">Play "${esc(title)}"</button></td></tr>`).join('')}</table><p class="web-ms-small">Songs play in the Aerium music player. Pause them any time from the taskbar or the media player.</p></div></div>`;
    const root = ctx.html(msFrame(ctx, 'Music', 'default', inner));
    msWire(ctx, root);
    root.querySelectorAll('[data-track]').forEach((b) => b.addEventListener('click', () => {
      if (A.music && A.music.play) { try { const p = A.music.play(b.dataset.track, { fadeIn: true }); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } ctx.status('Now playing: ' + b.textContent.replace(/^Play /, '')); }
      else ctx.dialog({ title: 'MySpot Music', icon: 'icons/music', message: 'The music player is warming up. Try again in a moment.' });
    }));
  }

  function msBlog(ctx, id) {
    const P = MS_PROFILES[id];
    if (!P || !P.blog) return ctx.notFound();
    const u = msUser(id);
    ctx.title(u.short + "'s Blog | MySpot");
    const inner = `<div class="web-ms-prof"><div class="web-ms-left"><div class="web-ms-namebox"><h1 class="web-ms-name">${esc(u.short)}'s Blog</h1><div class="web-ms-idrow">${K.img(u.avatar, 'web-ms-pic')}<div class="web-ms-idtext"><a href="/${id}">View profile</a><br><a href="#" class="web-ms-sub">Subscribe</a></div></div></div></div>
      <div class="web-ms-right">${P.blog.map(([t, mood, ms, body], i) => `<div class="web-ms-box web-ms-entry" id="entry-${i}"><div class="web-ms-boxh">${esc(K.shortDate(Date.now() - ms))}</div><div class="web-ms-boxb"><h2 class="web-ms-etitle">${esc(t)}</h2><div class="web-ms-small">Current mood: ${esc(mood)} ${msFace(mood === 'annoyed' || mood === 'bored' ? 'bored' : 'happy')}</div><p>${body}</p><div class="web-ms-small">Posted by ${esc(u.short)} at ${A.util.fmtTime(new Date(Date.now() - ms))} | ${2 + (K.hash(t) % 9)} Comments | <a href="/${id}#add-comment">Add Comment</a></div></div></div>`).join('')}</div></div>`;
    const root = ctx.html(msFrame(ctx, 'Blog', P.theme, inner));
    msWire(ctx, root);
    root.querySelector('.web-ms-sub').addEventListener('click', (e) => { e.preventDefault(); ctx.dialog({ title: 'MySpot', icon: 'icons/bell', message: 'Subscribed! You will be notified of new entries, probably all at once, at 2am.' }); });
  }

  function msRender(ctx) {
    const p = ctx.parts;
    if (!p.length) return msHome(ctx);
    const id = p[0].toLowerCase();
    if (id === 'browse') return msBrowse(ctx, '');
    if (id === 'search') return msBrowse(ctx, ctx.q('q').trim());
    if (id === 'music') return msMusic(ctx);
    if (id === 'me') return msMe(ctx);
    if (id === 'blog') return msBlog(ctx, (p[1] || '').toLowerCase());
    if (MS_PROFILES[id]) return msProfile(ctx, id, MS_PROFILES[id]);
    if (MS_USERS[id] && !MS_USERS[id].link) return msPrivate(ctx, id);
    return ctx.notFound();
  }

  const MS_HEART_TILE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Cpath d='M16 26 C16 20 24 18 26 24 C28 18 36 20 36 26 C36 32 26 38 26 38 C26 38 16 32 16 26 Z' fill='%23ff7fd0' opacity='.55'/%3E%3Cpath d='M48 50 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z' fill='%23fff' opacity='.9'/%3E%3Ccircle cx='52' cy='14' r='2' fill='%23fff' opacity='.8'/%3E%3Ccircle cx='8' cy='52' r='1.5' fill='%23fff' opacity='.8'/%3E%3C/svg%3E";
  const MS_SPARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z' fill='%23fff'/%3E%3C/svg%3E";
  W.register({
    id: 'myspot', host: 'www.myspot.com', aliases: ['myspot.com'],
    title: 'MySpot.com', shortTitle: 'MySpot', icon: 'icons/users', weight: 1.2,
    pictures: ['images/glitter_bg.gif', 'images/top8_frame.png', 'images/online_now.gif', 'images/spacer.gif', 'images/myspot_logo.png'],
    favicon: '<svg viewBox="0 0 16 16"><rect x=".5" y=".5" width="15" height="15" rx="3" fill="#1d63b8" stroke="#0e3f88"/><circle cx="6" cy="6" r="2.3" fill="#fff"/><path d="M2.4 13 C2.6 9.6 9.4 9.6 9.6 13 Z" fill="#fff"/><circle cx="11" cy="6.6" r="1.8" fill="#9fd0ff"/><path d="M8.6 12.6 C9 10 13.6 10 13.8 12.6 Z" fill="#9fd0ff"/></svg>',
    pages: () => [{ path: '/', title: 'MySpot.com | Home', text: 'MySpot a spot for friends. profiles friends bulletins top 8 comments music blogs cool new people' }]
      .concat(Object.keys(MS_PROFILES).map((id) => { const P = MS_PROFILES[id]; return { path: '/' + id, title: P.name + "'s MySpot profile", text: (P.band ? 'band music songs shows ' : 'profile ') + P.headline + ' mood ' + P.mood + ' ' + P.about.replace(/<[^>]+>/g, ' ') + ' ' + P.interests.map((x) => x[1]).join(' ') }; }))
      .concat([{ path: '/music', title: 'MySpot Music', text: 'MySpot Music top artists bands Crystal Lagoon Aqua Pura DJ Hydrate The Glassmen Sky Mall Orchestra songs play' }, { path: '/browse', title: 'MySpot | Browse Users', text: 'browse users find friends people online now' }])
      .concat(Object.keys(MS_PROFILES).filter((id) => MS_PROFILES[id].blog).map((id) => ({ path: '/blog/' + id, title: msUser(id).short + "'s Blog | MySpot", text: MS_PROFILES[id].blog.map((b) => b[0] + ' ' + b[3].replace(/<[^>]+>/g, ' ')).join(' ') }))),
    render: msRender,
    css: `
.web-ms { min-height: 100%; background: #e5e5e5; color: #000; font: calc(11px * var(--hz-text, 1))/1.4 Verdana, Arial, sans-serif; position: relative; overflow: hidden; }
.web-ms a { color: #0033cc; text-decoration: none; }
.web-ms a:hover { text-decoration: underline; }
.web-ms-head { background: linear-gradient(to bottom, #2f76cf 0, #1a57ad 50%, #0f448f 51%, #16509f 100%); border-bottom: 1px solid #0a2f66; }
.web-ms-headin { width: 800px; margin: 0 auto; height: 60px; display: flex; align-items: center; justify-content: space-between; }
.web-ms-logo { display: flex; align-items: center; gap: 8px; color: #fff !important; text-decoration: none !important; font: italic 700 2.4em/1 Arial, sans-serif; letter-spacing: -1px; text-shadow: 0 2px 2px rgba(0,0,0,.35); }
.web-ms-logo small { font-size: .55em; font-style: normal; }
.web-ms-logo em { font: italic 400 .36em Verdana, sans-serif; color: #cfe3ff; letter-spacing: 0; align-self: flex-end; margin: 0 0 6px 2px; }
.web-ms-people { position: relative; width: 34px; height: 30px; }
.web-ms-people i { position: absolute; bottom: 0; width: 18px; height: 12px; border-radius: 9px 9px 2px 2px; background: linear-gradient(#fff, #cfe3ff); }
.web-ms-people i::before { content: ""; position: absolute; left: 4px; top: -12px; width: 10px; height: 10px; border-radius: 50%; background: inherit; }
.web-ms-people i:first-child { left: 0; } .web-ms-people i:last-child { left: 14px; background: linear-gradient(#bfe0ff, #7fb8f0); transform: scale(.85); transform-origin: bottom; }
.web-ms-search { display: flex; gap: 4px; align-items: center; }
.web-ms-search select, .web-ms-search input { font: inherit; font-size: 1em; padding: 2px; border: 1px solid #0a2f66; }
.web-ms-search input { width: 170px; }
.web-ms-search button, .web-ms-btn { font: inherit; font-weight: 700; padding: 3px 10px; color: #fff; border: 1px solid #0a2f66; border-radius: 3px; cursor: pointer; background: linear-gradient(#6fa6e6, #2a63b0 50%, #1d4f95 51%, #3a74c4); }
.web-ms-btn:hover, .web-ms-search button:hover { filter: brightness(1.1); }
.web-ms-nav { text-align: center; padding: 5px 0; background: linear-gradient(#8ab6e6, #5b8fd0); border-bottom: 1px solid #2f5f99; font-weight: 700; }
.web-ms-nav a { color: #fff; padding: 0 3px; }
.web-ms-nav a.on { color: #ffea7a; }
.web-ms-nav span { color: #cfe3ff; margin: 0 3px; }
.web-ms-body { width: 800px; margin: 0 auto; padding: 10px; background: #fff; min-height: 420px; }
.web-ms-foot { width: 800px; margin: 0 auto 20px; padding: 10px; text-align: center; font-size: .92em; color: #666; }
.web-ms-marquee { margin: -2px 0 10px; padding: 4px 0; font-weight: 700; color: #ff2fa6; background: rgba(255,255,255,.7); border: 1px dashed #ff66cc; }
.web-ms-prof { display: grid; grid-template-columns: 300px 1fr; gap: 14px; }
.web-ms-namebox { margin-bottom: 10px; }
.web-ms-name { margin: 0 0 6px; font: 700 1.9em/1.1 Arial, sans-serif; word-break: break-word; }
.web-ms-idrow { display: flex; gap: 10px; }
.web-ms-pic { width: 130px; height: 130px; flex: none; border: 1px solid #999; background: #fff; padding: 3px; object-fit: contain; }
.web-ms-idtext { font-size: .95em; }
.web-ms-online { display: inline-flex; align-items: center; gap: 4px; color: #0a0; font-weight: 700; }
.web-ms-online i { width: 10px; height: 10px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #cfffbf, #2fc62f 60%, #178a17); box-shadow: 0 0 3px #3f3; }
.web-ms-mood { margin: 8px 0 4px; }
.web-ms-face { position: relative; display: inline-block; width: 15px; height: 15px; border-radius: 50%; vertical-align: -3px; background: radial-gradient(circle at 40% 35%, #fff6a0, #ffd21e 60%, #e0a800); border: 1px solid #a87a00; }
.web-ms-face::before { content: ""; position: absolute; left: 3px; top: 4px; width: 2px; height: 3px; border-radius: 1px; background: #5a3a00; box-shadow: 5px 0 0 #5a3a00; }
.web-ms-face::after { content: ""; position: absolute; left: 4px; top: 9px; width: 6px; height: 1.5px; background: #5a3a00; border-radius: 1px; }
.web-ms-face-happy::after { top: 7px; height: 3px; border: 1.5px solid #5a3a00; border-top: 0; background: none; border-radius: 0 0 4px 4px; width: 5px; left: 4px; }
.web-ms-face-meh::after { transform: rotate(-12deg); }
.web-ms-viewmy { margin-top: 6px; }
.web-ms-box { border: 1px solid #6699cc; margin-bottom: 10px; background: #fff; }
.web-ms-boxh { padding: 3px 6px; color: #fff; font-weight: 700; background: #6699cc; }
.web-ms-boxb { padding: 7px; }
.web-ms-boxfoot { padding: 2px 6px 6px; text-align: right; }
.web-ms-subscribe { color: #fff !important; font-weight: 400; font-size: .9em; }
.web-ms-contact { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; padding: 7px; }
.web-ms-contact a { display: flex; align-items: center; gap: 5px; font-weight: 700; font-size: .95em; }
.web-ms-ci { width: 18px; height: 18px; }
.web-ms-urlbox { border: 1px solid #6699cc; padding: 5px 7px; margin-bottom: 10px; font-size: .95em; background: #fff; }
.web-ms-table { width: 100%; border-collapse: separate; border-spacing: 3px; }
.web-ms-table th { width: 90px; text-align: left; vertical-align: top; padding: 3px; color: #336; background: #b1d0f0; font-size: .95em; }
.web-ms-table td { padding: 3px; vertical-align: top; background: #d5e8fb; word-break: break-word; }
.web-ms-orange { color: #f60; font-weight: 700; margin: 2px 0 4px; }
.web-ms-red { color: #c00; }
.web-ms-ext { border: 1px solid #6699cc; padding: 12px; margin-bottom: 10px; font-size: 1.25em; text-align: center; background: #fff; }
.web-ms-accepted { display: flex; align-items: center; gap: 8px; padding: 6px 8px; margin-bottom: 10px; border: 1px solid #3a3; background: #efffea; color: #070; font-weight: 700; }
.web-ms-accpic { width: 28px; height: 28px; }
.web-ms-blogs { margin: 4px 0; padding-left: 20px; }
.web-ms-blogs li { margin: 3px 0; }
.web-ms-top8 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 4px; margin: 8px 0; }
.web-ms-t8 { display: flex; flex-direction: column; align-items: center; text-align: center; font-weight: 700; font-size: .92em; gap: 3px; }
.web-ms-t8 span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.web-ms-t8img { width: 78px; height: 78px; object-fit: contain; border: 1px solid #999; background: #fff; padding: 2px; }
.web-ms-t8 small { font-weight: 400; }
.web-ms-allf { text-align: right; }
.web-ms-comments { width: 100%; border-collapse: separate; border-spacing: 0 5px; }
.web-ms-comments td { vertical-align: top; }
.web-ms-cfrom { width: 110px; text-align: center; padding: 6px; background: #b1d0f0; font-weight: 700; font-size: .95em; }
.web-ms-cfrom a { display: block; word-break: break-word; }
.web-ms-cpic { width: 72px; height: 72px; margin-top: 4px; object-fit: contain; background: #fff; border: 1px solid #999; padding: 2px; }
.web-ms-ctext { padding: 6px 8px; background: #d5e8fb; }
.web-ms-cdate { font-weight: 700; font-size: .92em; }
.web-ms-ctext p { margin: 6px 0 0; word-break: break-word; }
.web-ms-empty { color: #666; font-style: italic; }
.web-ms-post { margin-top: 10px; padding: 8px; border: 1px dashed #6699cc; background: #f3f8fe; display: flex; flex-direction: column; gap: 6px; }
.web-ms-post textarea, .web-ms-e-about { width: 100%; min-height: 60px; resize: vertical; font: inherit; padding: 4px; border: 1px solid #7f9db9; }
.web-ms-posted { color: #080; font-weight: 700; }
.web-ms-player { display: flex; align-items: center; gap: 8px; padding: 6px 8px; margin-bottom: 10px; border-radius: 6px; color: #eaf3ff; background: linear-gradient(to bottom, #3b4a5c 0, #1c2632 50%, #0e151e 51%, #1d2733 100%); border: 1px solid #000; box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 2px 5px rgba(0,0,0,.3); }
.web-ms-playbtn { flex: none; position: relative; width: 30px; height: 30px; padding: 0; border-radius: 50%; cursor: pointer; border: 1px solid #0b3a70; background: radial-gradient(circle at 50% 115%, #c8f7ff, #3aa6f5 45%, #0c3f82); box-shadow: inset 0 1px 0 rgba(255,255,255,.5); }
.web-ms-playbtn::before { content: ""; position: absolute; left: 18%; right: 18%; top: 4%; height: 45%; border-radius: 50%; background: linear-gradient(rgba(255,255,255,.9), rgba(255,255,255,.1)); }
.web-ms-playbtn i { position: absolute; left: 11px; top: 8px; border-style: solid; border-width: 7px 0 7px 11px; border-color: transparent transparent transparent #fff; filter: drop-shadow(0 1px 1px rgba(0,0,0,.4)); }
.web-ms-player.playing .web-ms-playbtn i { left: 9px; top: 9px; width: 12px; height: 12px; border: 0; border-left: 4px solid #fff; border-right: 4px solid #fff; }
.web-ms-pinfo { flex: 1; min-width: 0; font-size: .95em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.web-ms-pbar { height: 5px; margin-top: 4px; border-radius: 3px; background: #0a0f15; border: 1px solid #45556a; overflow: hidden; }
.web-ms-pfill { display: block; height: 100%; width: 0; background: linear-gradient(#9ff08a, #2fb52f); }
.web-ms-ptime { font: .9em Tahoma, sans-serif; color: #9fb4cc; }
.web-ms-plogo { font: 700 .75em/1 Arial, sans-serif; color: #7fb8f0; text-align: center; }
.web-ms-tracks .web-ms-track { display: grid; grid-template-columns: 26px 1fr auto auto auto; gap: 8px; align-items: center; padding: 5px 7px; border-bottom: 1px solid #d5e8fb; }
.web-ms-track button { position: relative; width: 22px; height: 22px; padding: 0; border-radius: 50%; border: 1px solid #0b3a70; cursor: pointer; background: radial-gradient(circle at 50% 115%, #c8f7ff, #3aa6f5 45%, #0c3f82); }
.web-ms-track button i { position: absolute; left: 8px; top: 5px; border-style: solid; border-width: 5px 0 5px 8px; border-color: transparent transparent transparent #fff; }
.web-ms-track.off { opacity: .5; }
.web-ms-track.playing { background: #eaf6ff; }
.web-ms-shows { width: 100%; border-collapse: collapse; }
.web-ms-shows td { padding: 5px 7px; border-bottom: 1px solid #d5e8fb; vertical-align: top; }
.web-ms-spark { position: absolute; z-index: 20; width: 14px; height: 14px; margin: -7px 0 0 -7px; pointer-events: none; background: url("${MS_SPARK}") center / contain no-repeat; filter: drop-shadow(0 0 3px hsl(var(--hue), 100%, 70%)) drop-shadow(0 0 6px hsl(var(--hue), 100%, 60%)); animation: web-ms-spark .8s ease-out forwards; }
@keyframes web-ms-spark { from { transform: scale(1) rotate(0); opacity: 1; } to { transform: translateY(26px) scale(.2) rotate(120deg); opacity: 0; } }
.web-ms-glitter { position: relative; display: inline-block; background: linear-gradient(100deg, #ff3fbf 0%, #fff 10%, #ff9de2 18%, #c42cff 32%, #fff 42%, #ff58c8 52%, #ffe3f7 62%, #b400ff 78%, #fff 88%, #ff3fbf 100%); background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: web-ms-glitter 2.4s linear infinite; filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 2px #ff6ad5); }
.web-ms-glitter::after { content: ""; position: absolute; right: -8px; top: -6px; width: 12px; height: 12px; background: url("${MS_SPARK}") center / contain no-repeat; animation: web-ms-twinkle 1.3s ease-in-out infinite; }
.web-ms-glitter.big { font-family: "Comic Sans MS", "Chalkboard SE", Verdana, sans-serif; }
@keyframes web-ms-glitter { to { background-position: -250% 0; } }
@keyframes web-ms-twinkle { 0%, 100% { transform: scale(.3) rotate(0); opacity: .3; } 50% { transform: scale(1.1) rotate(45deg); opacity: 1; } }
.web-ms-t-kayla { background: #ffc3ea url("${MS_HEART_TILE}") repeat; font-family: "Comic Sans MS", "Chalkboard SE", Verdana, sans-serif; }
.web-ms-t-kayla .web-ms-body { background: rgba(255,255,255,.62); border: 3px dotted #ff4fbf; border-radius: 16px; margin-top: 10px; }
.web-ms-t-kayla .web-ms-box, .web-ms-t-kayla .web-ms-urlbox, .web-ms-t-kayla .web-ms-ext { border: 2px solid #ff66cc; border-radius: 10px; overflow: hidden; background: rgba(255,245,252,.9); }
.web-ms-t-kayla .web-ms-boxh { background: linear-gradient(#ff9ee0, #e84ab8); text-shadow: 0 1px 1px #a0006a; }
.web-ms-t-kayla .web-ms-table th, .web-ms-t-kayla .web-ms-cfrom { background: #ffc6ec; color: #8a0060; }
.web-ms-t-kayla .web-ms-table td, .web-ms-t-kayla .web-ms-ctext { background: #ffe3f5; }
.web-ms-t-kayla .web-ms-orange { color: #d4148f; }
.web-ms-t-kayla a { color: #9b00c9; }
.web-ms-t-kayla .web-ms-foot { color: #a0006a; }
.web-ms-t-tyler { color: #c9d6ff; font-family: "Trebuchet MS", Verdana, sans-serif; background-color: #050b1f; background-image: radial-gradient(1px 1px at 20px 30px, #fff, transparent), radial-gradient(1px 1px at 90px 120px, #9cf, transparent), radial-gradient(1.5px 1.5px at 150px 60px, #fff, transparent), radial-gradient(1px 1px at 180px 170px, #cdf, transparent), radial-gradient(1px 1px at 60px 180px, #fff, transparent), radial-gradient(1.2px 1.2px at 130px 10px, #fff, transparent); background-size: 200px 200px; }
.web-ms-t-tyler .web-ms-body { background: rgba(0,0,0,.55); border: 1px solid #2a58ff; box-shadow: 0 0 18px rgba(40,90,255,.5); margin-top: 10px; }
.web-ms-t-tyler .web-ms-box, .web-ms-t-tyler .web-ms-urlbox, .web-ms-t-tyler .web-ms-ext { border-color: #2a58ff; background: rgba(5,12,40,.9); color: #c9d6ff; }
.web-ms-t-tyler .web-ms-boxh { background: linear-gradient(#2a4cff, #0a1a8f); text-shadow: 0 0 6px #6cf6ff; }
.web-ms-t-tyler .web-ms-table th, .web-ms-t-tyler .web-ms-cfrom { background: #0d1d5c; color: #6cf6ff; }
.web-ms-t-tyler .web-ms-table td, .web-ms-t-tyler .web-ms-ctext { background: #07123b; }
.web-ms-t-tyler .web-ms-orange { color: #6cf6ff; text-shadow: 0 0 6px #1b8cff; }
.web-ms-t-tyler a { color: #6cf6ff; }
.web-ms-t-tyler .web-ms-marquee { color: #6cf6ff; background: rgba(0,0,0,.6); border-color: #2a58ff; }
.web-ms-t-tyler .web-ms-name { color: #fff; text-shadow: 0 0 8px #2a8cff; }
.web-ms-t-tyler .web-ms-post { background: rgba(10,20,60,.8); border-color: #2a58ff; }
.web-ms-t-tyler .web-ms-foot { color: #7f8fbf; }
.web-ms-t-band { color: #eaffff; background: linear-gradient(to bottom, #0a3d6b 0, #0f6fa0 360px, #1a9fbe 900px, #26b5c9 100%); }
.web-ms-t-band .web-ms-body { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.5); border-radius: 12px; margin-top: 10px; box-shadow: inset 0 1px 0 rgba(255,255,255,.5); }
.web-ms-t-band .web-ms-box, .web-ms-t-band .web-ms-urlbox, .web-ms-t-band .web-ms-ext { border-color: rgba(190,240,255,.7); border-radius: 8px; overflow: hidden; background: rgba(4,40,70,.55); color: #eaffff; }
.web-ms-t-band .web-ms-boxh { background: linear-gradient(rgba(140,230,255,.55), rgba(20,120,170,.7)); }
.web-ms-t-band .web-ms-table th, .web-ms-t-band .web-ms-cfrom { background: rgba(120,220,255,.25); color: #fff; }
.web-ms-t-band .web-ms-table td, .web-ms-t-band .web-ms-ctext { background: rgba(0,30,60,.45); }
.web-ms-t-band .web-ms-orange { color: #9ff0ff; }
.web-ms-t-band a { color: #bff6ff; }
.web-ms-t-band .web-ms-track { border-color: rgba(190,240,255,.25); }
.web-ms-t-band .web-ms-track.playing { background: rgba(120,220,255,.2); }
.web-ms-t-band .web-ms-post { background: rgba(0,30,60,.4); }
.web-ms-t-band .web-ms-foot { color: #cff6ff; }
.web-ms-home { display: grid; grid-template-columns: 200px 1fr 220px; gap: 12px; }
.web-ms-me { display: flex; gap: 8px; }
.web-ms-me .web-ms-pic { width: 70px; height: 70px; }
.web-ms-bulletins { width: 100%; border-collapse: collapse; }
.web-ms-bulletins th { background: #d5e8fb; text-align: left; padding: 3px 5px; }
.web-ms-bulletins td { padding: 5px; border-bottom: 1px solid #d5e8fb; vertical-align: top; font-size: .95em; }
.web-ms-bulletins td:first-child { width: 80px; text-align: center; }
.web-ms-bpic { width: 40px; height: 40px; object-fit: contain; }
.web-ms-cool { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.web-ms-feat { display: flex; gap: 8px; align-items: center; }
.web-ms-feat .web-ms-pic { width: 60px; height: 60px; }
.web-ms-hright .web-ms-player { margin: 0 6px 6px; }
.web-ms-ad a { display: flex; align-items: center; gap: 8px; padding: 8px; background: linear-gradient(#fffbe0, #ffe98a); text-decoration: none !important; color: #6b4200 !important; }
.web-ms-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px 6px; margin-top: 10px; }
.web-ms-filter { padding: 6px; background: #d5e8fb; }
.web-ms-filter select, .web-ms-filter input { font: inherit; }
.web-ms-musictable { width: 100%; border-collapse: collapse; }
.web-ms-musictable td { padding: 6px; border-bottom: 1px solid #d5e8fb; }
.web-ms-rank { font: 700 1.8em Arial, sans-serif; color: #6699cc; width: 36px; text-align: center; }
.web-ms-small { font-size: .9em; color: #666; }
.web-ms-t-tyler .web-ms-small, .web-ms-t-band .web-ms-small { color: inherit; opacity: .8; }
.web-ms-etitle { margin: 0 0 4px; font-size: 1.3em; }
.web-ms-editbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 6px 8px; margin-bottom: 10px; background: #fffbe0; border: 1px solid #e0c060; color: #000; }
.web-ms-editbar select { font: inherit; }
.web-ms-private { max-width: 460px; }
`,
  });

  // @@PART2
})();
