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

  // ================================================================ www.tubeview.com
  // Every "video" is a pure function of time, drawn at 480x360, so seeking just works.
  const seeded = (n) => A.util.seeded(n);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const mixc = (c1, c2, t) => `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;
  function grad(list, u) {
    for (let i = 1; i < list.length; i++) if (u <= list[i][0]) { const a = list[i - 1], b = list[i]; return mixc(a[1], b[1], (u - a[0]) / (b[0] - a[0] || 1)); }
    const last = list[list.length - 1][1];
    return mixc(last, last, 0);
  }
  function rrect(g, x, y, w, hh, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + hh - r); g.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
    g.lineTo(x + r, y + hh); g.quadraticCurveTo(x, y + hh, x, y + hh - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function tvBubble(g, x, y, r, a) {
    g.save();
    g.globalAlpha = a == null ? 1 : a;
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.35, 'rgba(255,255,255,.15)'); gr.addColorStop(1, 'rgba(170,225,255,.5)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(0.6, r * 0.08); g.stroke();
    g.restore();
  }
  function tvFish(g, x, y, s, dir, c1, c2, t, stripes) {
    g.save();
    g.translate(x, y);
    g.scale(dir * s, s);
    const wag = Math.sin(t * 7) * 0.3;
    g.fillStyle = c2;
    g.beginPath(); g.moveTo(-16, 0); g.quadraticCurveTo(-26, -4, -34, -12 + wag * 8); g.quadraticCurveTo(-29, 0, -34, 12 + wag * 8); g.quadraticCurveTo(-26, 4, -16, 0); g.fill();
    g.beginPath(); g.moveTo(-9, -8); g.quadraticCurveTo(-1, -21, 9, -9); g.closePath(); g.fill();
    const gr = g.createLinearGradient(0, -12, 0, 12);
    gr.addColorStop(0, '#fff7d6'); gr.addColorStop(0.35, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2); g.fill();
    if (stripes) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; [-5, 5].forEach((sx) => { g.beginPath(); g.moveTo(sx, -10); g.quadraticCurveTo(sx + 3, 0, sx, 10); g.stroke(); }); }
    g.globalAlpha = 0.75; g.fillStyle = c2;
    g.beginPath(); g.ellipse(2, 5, 6, 3, 0.6 + wag, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(11, -3, 3.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(12, -3, 1.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(2, -6, 12, 3.5, -0.1, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function tvText(g, text, x, y, size, fill, opts = {}) {
    g.save();
    g.font = `${opts.weight || 'bold'} ${size}px ${opts.font || '"Trebuchet MS", Verdana, sans-serif'}`;
    g.textAlign = opts.align || 'center';
    g.textBaseline = 'middle';
    if (opts.rot) { g.translate(x, y); g.rotate(opts.rot); x = 0; y = 0; }
    g.lineJoin = 'round';
    if (opts.stroke !== false) { g.strokeStyle = opts.stroke || 'rgba(0,0,0,.75)'; g.lineWidth = opts.lw || Math.max(3, size / 6); g.strokeText(text, x, y); }
    g.fillStyle = fill;
    g.fillText(text, x, y);
    g.restore();
  }

  // --- aquarium
  const AQ = (() => {
    const r = seeded(101);
    return {
      fish: Array.from({ length: 7 }, (_, i) => ({ y: 70 + r() * 190, v: (16 + r() * 24) * (r() < 0.5 ? -1 : 1), x0: r() * 640, s: 0.7 + r() * 0.6, fy: 0.3 + r() * 0.5, p: r() * 6, amp: 6 + r() * 16, kind: i % 4 })),
      plants: Array.from({ length: 9 }, () => ({ x: r() * 480, h: 60 + r() * 110, c: r() < 0.5 ? '#2fa84a' : '#5bc23a', p: r() * 6, n: 3 + Math.floor(r() * 3) })),
      pebbles: Array.from({ length: 80 }, () => ({ x: r() * 480, y: 326 + r() * 34, rx: 2 + r() * 4.5, c: ['#d9c49a', '#c2a878', '#efe3c6', '#a9906a', '#8fa5b5', '#e0b0a0'][Math.floor(r() * 6)] })),
    };
  })();
  const FISH_COLORS = [['#ff9a2e', '#e0560f'], ['#ffd84a', '#f09a12'], ['#5cc8ff', '#1a6fd1'], ['#ff82a2', '#d63a6a']];
  function drawAquarium(g, t, Wd, Ht) {
    const bg = g.createLinearGradient(0, 0, 0, Ht);
    bg.addColorStop(0, '#3aaae8'); bg.addColorStop(0.55, '#0f5fa3'); bg.addColorStop(1, '#083b6b');
    g.fillStyle = bg; g.fillRect(0, 0, Wd, Ht);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const x = i * 95 - 40 + Math.sin(t * 0.25 + i * 1.7) * 25;
      g.fillStyle = `rgba(190,235,255,${0.045 + 0.03 * Math.sin(t * 0.6 + i)})`;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 50, 0); g.lineTo(x + 150, Ht); g.lineTo(x + 60, Ht); g.fill();
    }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x <= Wd; x += 10) g.lineTo(x, 6 + Math.sin(x * 0.05 + t * 2) * 3);
    g.stroke();
    g.lineCap = 'round';
    AQ.plants.forEach((p) => {
      for (let k = 0; k < p.n; k++) {
        const bx = p.x + (k - p.n / 2) * 6, sway = Math.sin(t * 0.9 + p.p + k) * 11;
        g.strokeStyle = p.c; g.lineWidth = 5;
        g.beginPath(); g.moveTo(bx, 330); g.quadraticCurveTo(bx + sway * 0.4, 330 - p.h * 0.5, bx + sway, 330 - p.h + k * 9); g.stroke();
      }
    });
    const sand = g.createLinearGradient(0, 315, 0, Ht);
    sand.addColorStop(0, '#ecdcaf'); sand.addColorStop(1, '#b9985f');
    g.fillStyle = sand; g.beginPath(); g.moveTo(0, Ht);
    for (let x = 0; x <= Wd; x += 16) g.lineTo(x, 322 + Math.sin(x * 0.03) * 5);
    g.lineTo(Wd, Ht); g.fill();
    AQ.pebbles.forEach((p) => { g.fillStyle = p.c; g.beginPath(); g.ellipse(p.x, p.y, p.rx, p.rx * 0.7, 0, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#93a3b3'; g.fillRect(356, 262, 72, 64); g.fillRect(346, 238, 22, 88); g.fillRect(416, 238, 22, 88);
    g.fillStyle = '#7d8e9f';
    for (let i = 0; i < 3; i++) { g.fillRect(346 + i * 8, 230, 5, 9); g.fillRect(416 + i * 8, 230, 5, 9); }
    g.fillStyle = '#2b3440'; g.beginPath(); g.moveTo(380, 326); g.lineTo(380, 296); g.arc(392, 296, 12, Math.PI, 0); g.lineTo(404, 326); g.fill();
    g.fillStyle = '#b8c6d4'; g.fillRect(352, 250, 8, 10); g.fillRect(424, 250, 8, 10);
    for (let i = 0; i < 16; i++) {
      const ph = (t * 0.32 + i / 16) % 1;
      tvBubble(g, 300 + Math.sin(ph * 14 + i) * 5, 330 - ph * 330, 2 + (i % 4) * 1.3, ph < 0.95 ? 1 : (1 - ph) * 20);
    }
    AQ.fish.forEach((f, i) => {
      const span = Wd + 160;
      const x = (((f.x0 + f.v * t) % span) + span) % span - 80;
      const [c1, c2] = FISH_COLORS[f.kind];
      tvFish(g, x, f.y + Math.sin(t * f.fy + f.p) * f.amp, f.s, Math.sign(f.v), c1, c2, t + i, f.kind === 2);
    });
  }

  // --- bubble wrap
  const BW = (() => {
    const cells = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) cells.push({ x: 54 + c * 53 + (r % 2) * 26, y: 56 + r * 50, r });
    const order = [];
    for (let r = 0; r < 6; r++) { const row = cells.filter((q) => q.r === r); if (r % 2) row.reverse(); order.push(...row); }
    const rr = seeded(202);
    order.forEach((q, i) => { q.pop = i < 30 ? 2 + i * 0.6 : 22.5 + (i - 30) * 0.18; q.crinkle = Array.from({ length: 9 }, () => 0.55 + rr() * 0.5); });
    return order;
  })();
  function drawFinger(g, x, y, lift) {
    g.save();
    g.fillStyle = `rgba(40,20,0,${0.2 - lift * 0.1})`;
    g.beginPath(); g.ellipse(x + 10 + lift * 16, y + 12 + lift * 16, 20, 15, 0.6, 0, Math.PI * 2); g.fill();
    g.translate(x - lift * 5, y - lift * 12);
    g.rotate(-0.62);
    const gr = g.createLinearGradient(-18, 0, 18, 0);
    gr.addColorStop(0, '#dd9a78'); gr.addColorStop(0.5, '#f8caa9'); gr.addColorStop(1, '#cf8866');
    g.fillStyle = gr; rrect(g, -17, -15, 34, 190, 17); g.fill();
    g.strokeStyle = 'rgba(150,80,50,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-10, 48); g.quadraticCurveTo(0, 52, 10, 48); g.moveTo(-9, 54); g.quadraticCurveTo(0, 58, 9, 54); g.stroke();
    g.fillStyle = 'rgba(255,238,228,.95)'; rrect(g, -10, -11, 20, 25, 9); g.fill();
    g.strokeStyle = 'rgba(200,120,100,.55)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-4, -3, 3, 6, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function drawBubblewrap(g, t, Wd, Ht) {
    const wood = g.createLinearGradient(0, 0, Wd, Ht);
    wood.addColorStop(0, '#d8b98a'); wood.addColorStop(1, '#b8915c');
    g.fillStyle = wood; g.fillRect(0, 0, Wd, Ht);
    g.strokeStyle = 'rgba(120,80,30,.18)'; g.lineWidth = 2;
    for (let y = 8; y < Ht; y += 22) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(160, y + 6, 320, y - 6, Wd, y + 3); g.stroke(); }
    g.fillStyle = 'rgba(228,244,255,.55)'; rrect(g, 20, 20, 440, 316, 6); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.stroke();
    BW.forEach((q) => {
      if (t < q.pop) {
        const press = q.pop - t < 0.12 ? 0.86 : 1;
        const R = 20 * press;
        const gr = g.createRadialGradient(q.x - 7, q.y - 7, 2, q.x, q.y, R);
        gr.addColorStop(0, 'rgba(255,255,255,.98)'); gr.addColorStop(0.3, 'rgba(235,248,255,.55)'); gr.addColorStop(1, 'rgba(150,200,235,.55)');
        g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, R, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(90,150,200,.45)'; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(q.x - 7, q.y - 8, 6, 3.5, -0.6, 0, Math.PI * 2); g.fill();
      } else {
        g.strokeStyle = 'rgba(120,170,210,.55)'; g.fillStyle = 'rgba(210,235,250,.35)'; g.lineWidth = 1;
        g.beginPath();
        q.crinkle.forEach((k, i) => { const a = (i / q.crinkle.length) * Math.PI * 2; const px = q.x + Math.cos(a) * 17 * k, py = q.y + Math.sin(a) * 17 * k; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
        g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(q.x - 8, q.y - 3); g.lineTo(q.x + 2, q.y + 1); g.lineTo(q.x + 9, q.y - 4); g.stroke();
        const since = t - q.pop;
        if (since < 0.16) {
          g.strokeStyle = `rgba(255,255,255,${1 - since / 0.16})`; g.lineWidth = 2.5;
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(q.x + Math.cos(a) * 22, q.y + Math.sin(a) * 22); g.lineTo(q.x + Math.cos(a) * (30 + since * 80), q.y + Math.sin(a) * (30 + since * 80)); g.stroke(); }
        }
      }
    });
    const next = BW.findIndex((q) => q.pop > t);
    let fx, fy, lift = 0;
    if (next === 0) { const u = ease((t - 0.4) / 1.6); fx = lerp(560, BW[0].x, u); fy = lerp(440, BW[0].y, u); lift = 1 - u; }
    else if (next > 0) { const a = BW[next - 1], b = BW[next]; const u = clamp((t - a.pop) / (b.pop - a.pop), 0, 1); const e = ease(u); fx = lerp(a.x, b.x, e); fy = lerp(a.y, b.y, e); lift = Math.sin(u * Math.PI) * (b.pop - a.pop > 1 ? 1.2 : 0.7); }
    else { const last = BW[BW.length - 1]; const u = ease((t - last.pop) / 1.4); fx = lerp(last.x, 580, u); fy = lerp(last.y, 460, u); lift = u; }
    if (fx < 560) drawFinger(g, fx, fy, lift);
    if (t < 1.9) tvText(g, 'satisfying bubble wrap popping!!!', 240, 180, 24, '#fff');
    if (t > 19.8 && t < 22.3) tvText(g, 'ok now the rest...', 240, 180, 26, '#fff');
    if (t > 26.5) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, Wd, Ht); tvText(g, 'SO SATISFYING', 240, 160, 44, '#ffe34a', { rot: -0.05 }); tvText(g, 'rate 5 stars plz :)', 240, 215, 20, '#fff'); }
  }

  // --- sunset timelapse
  const SUN = (() => {
    const r = seeded(303);
    const city = [];
    let x = 262;
    while (x < 480) { const w = 16 + r() * 28, hh = 36 + r() * 88; const cols = Math.floor((w - 4) / 8), rows = Math.floor((hh - 8) / 11); city.push({ x, w, h: hh, cols, rows, wins: Array.from({ length: cols * rows }, () => 0.5 + r() * 0.42) }); x += w + 2; }
    return {
      clouds: Array.from({ length: 7 }, () => ({ x: r() * 700, y: 34 + r() * 140, s: 0.6 + r() * 0.9, v: 0.6 + r() * 0.8 })),
      city,
      stars: Array.from({ length: 70 }, () => ({ x: r() * 480, y: r() * 210, tw: r() * 6, th: 0.66 + r() * 0.26 })),
    };
  })();
  function cloud(g, x, y, s, color) {
    g.fillStyle = color;
    g.beginPath();
    [[0, 0, 22], [20, -10, 26], [44, -2, 22], [64, 4, 16], [26, 8, 20]].forEach(([dx, dy, r]) => { g.moveTo(x + dx * s + r * s, y + dy * s); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); });
    g.fill();
  }
  function drawSunset(g, t, Wd, Ht) {
    const u = clamp(t / 45, 0, 1);
    const top = grad([[0, [40, 120, 215]], [0.45, [70, 90, 170]], [0.7, [40, 30, 90]], [1, [6, 8, 30]]], u);
    const hor = grad([[0, [190, 225, 255]], [0.35, [255, 190, 120]], [0.55, [255, 120, 80]], [0.72, [150, 60, 110]], [1, [20, 20, 60]]], u);
    const sky = g.createLinearGradient(0, 0, 0, 252);
    sky.addColorStop(0, top); sky.addColorStop(1, hor);
    g.fillStyle = sky; g.fillRect(0, 0, Wd, 252);
    if (u > 0.6) SUN.stars.forEach((s) => { const a = clamp((u - s.th) * 8, 0, 1) * (0.6 + 0.4 * Math.sin(t * 3 + s.tw)); if (a > 0) { g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(s.x, s.y, 1.6, 1.6); } });
    const sx = 120 + u * 110, sy = 70 + u * 240, sr = 24 + u * 6;
    if (sy - sr < 252) {
      const glow = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 5);
      glow.addColorStop(0, `rgba(255,230,160,${0.55 * (1 - u * 0.6)})`); glow.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = glow; g.fillRect(0, 0, Wd, 252);
      g.save(); g.beginPath(); g.rect(0, 0, Wd, 250); g.clip();
      g.fillStyle = grad([[0, [255, 250, 220]], [0.4, [255, 205, 95]], [0.65, [255, 125, 60]], [1, [220, 60, 50]]], u);
      g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    if (u > 0.78) { const mu = (u - 0.78) / 0.22; const mx = 60 + mu * 50, my = 230 - mu * 150; g.fillStyle = '#f4f1d8'; g.beginPath(); g.arc(mx, my, 12, 0, Math.PI * 2); g.fill(); g.fillStyle = top; g.beginPath(); g.arc(mx + 5, my - 3, 10.5, 0, Math.PI * 2); g.fill(); }
    const cc = grad([[0, [255, 255, 255]], [0.4, [255, 212, 175]], [0.6, [240, 145, 135]], [0.8, [90, 70, 110]], [1, [30, 30, 55]]], u);
    SUN.clouds.forEach((c) => cloud(g, ((c.x - t * c.v * 22) % 700 + 700) % 700 - 110, c.y, c.s, cc));
    const sea = g.createLinearGradient(0, 250, 0, Ht);
    sea.addColorStop(0, hor); sea.addColorStop(1, grad([[0, [20, 70, 140]], [0.6, [60, 40, 80]], [1, [5, 8, 25]]], u));
    g.fillStyle = sea; g.fillRect(0, 250, Wd, Ht - 250);
    if (sy < 262) {
      const fade = 1 - Math.max(0, (sy - 225) / 37);
      for (let i = 0; i < 14; i++) { const w = (30 - i) * (1 + 0.3 * Math.sin(t * 4 + i)) * fade; g.fillStyle = `rgba(255,${200 - i * 6},${120 - i * 4},${0.5 - i * 0.03})`; g.fillRect(sx - w / 2 + Math.sin(t * 3 + i) * 3, 254 + i * 7, w, 2); }
    }
    const bcol = grad([[0, [70, 90, 120]], [0.6, [30, 25, 45]], [1, [8, 8, 16]]], u);
    SUN.city.forEach((b) => {
      g.fillStyle = bcol; g.fillRect(b.x, 250 - b.h, b.w, b.h);
      g.fillStyle = 'rgba(255,222,130,.92)';
      for (let ry = 0; ry < b.rows; ry++) for (let cx = 0; cx < b.cols; cx++) if (u > b.wins[ry * b.cols + cx]) g.fillRect(b.x + 3 + cx * 8, 250 - b.h + 5 + ry * 11, 4, 5);
    });
    const mins = 17 * 60 + 38 + Math.floor(u * 170);
    const hh = Math.floor(mins / 60) % 12 || 12, mm = String(mins % 60).padStart(2, '0');
    tvText(g, 'PM ' + hh + ':' + mm, 462, 322, 17, '#ffb000', { align: 'right', font: '"Courier New", monospace', lw: 3 });
    tvText(g, 'SEP 24 2007', 462, 342, 13, '#ffb000', { align: 'right', font: '"Courier New", monospace', lw: 3 });
  }

  // --- claymation (8 frames per second, with a little jitter on every frame)
  const CLAY = (() => { const r = seeded(404); return { weeds: Array.from({ length: 6 }, () => ({ x: 20 + r() * 440, h: 60 + r() * 80 })), rocks: Array.from({ length: 7 }, () => ({ x: r() * 480, rx: 14 + r() * 20, c: ['#8f8f9a', '#a3927e', '#7f8a96'][Math.floor(r() * 3)] })) }; })();
  function clayFish(g, x, y, dir, n, mouth, s) {
    g.save();
    g.translate(x, y);
    g.scale(dir * (s || 1), s || 1);
    const r = seeded(n * 31 + 7);
    const w = () => (r() - 0.5) * 1.8;
    g.lineWidth = 3; g.strokeStyle = '#a8400c'; g.fillStyle = '#e8641c';
    g.beginPath(); g.moveTo(-38, 0); g.lineTo(-64 + w(), -25 + w()); g.lineTo(-56 + w(), 0); g.lineTo(-64 + w(), 25 + w()); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-14, -24); g.quadraticCurveTo(0 + w(), -44 + w(), 16, -24); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff8a2a';
    g.beginPath(); g.ellipse(0, 0, 44 + w(), 28 + w(), 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(160,60,10,.35)'; g.lineWidth = 1;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(-12 + k * 3, 8, 7 + k * 3, 3.7, 5.3); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(-4, -12, 20, 6, -0.1, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.strokeStyle = '#333'; g.lineWidth = 2;
    g.beginPath(); g.arc(20, -8, 11, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#111'; g.beginPath(); g.arc(22 + w() * 2, -6 + w() * 2, 5, 0, Math.PI * 2); g.fill();
    if (mouth) { g.fillStyle = '#7a2a08'; g.beginPath(); g.ellipse(41, 6, 4, 5, 0, 0, Math.PI * 2); g.fill(); }
    else { g.strokeStyle = '#7a2a08'; g.lineWidth = 2; g.beginPath(); g.arc(33, 5, 6, 0.2, 1.3); g.stroke(); }
    g.restore();
  }
  function clayBubble(g, x, y, r) {
    g.fillStyle = 'rgba(200,238,255,.5)'; g.strokeStyle = '#6fb8e0'; g.lineWidth = 3;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x - r * 0.4, y - r * 0.4, r * 0.22, r * 0.12, -0.7, 0, Math.PI * 2); g.fill();
  }
  function drawClay(g, tt, Wd, Ht) {
    const n = Math.floor(tt * 8), t = n / 8;
    const jr = seeded(n * 7919 + 1);
    const j = () => (jr() - 0.5) * 2.4;
    g.fillStyle = '#a8dcf5'; g.fillRect(0, 0, Wd, Ht);
    [['#86c9ee', 70], ['#63b2e3', 130], ['#4598d2', 190], ['#2f7fbf', 250]].forEach(([c, y], i) => {
      g.fillStyle = c; g.beginPath(); g.moveTo(0, Ht);
      for (let x = 0; x <= Wd; x += 20) g.lineTo(x, y + Math.sin(x * 0.03 + i * 1.3) * 8 + j() * 0.4);
      g.lineTo(Wd, Ht); g.fill();
    });
    g.fillStyle = '#e9c98b'; g.beginPath(); g.moveTo(0, Ht);
    for (let x = 0; x <= Wd; x += 24) g.lineTo(x, 322 + Math.sin(x * 0.05) * 6 + j() * 0.3);
    g.lineTo(Wd, Ht); g.fill();
    CLAY.rocks.forEach((rk) => { g.fillStyle = rk.c; g.beginPath(); g.ellipse(rk.x + j() * 0.3, 338, rk.rx, rk.rx * 0.6, 0, 0, Math.PI * 2); g.fill(); });
    g.lineCap = 'round';
    CLAY.weeds.forEach((w, i) => {
      g.strokeStyle = '#3e9a3a'; g.lineWidth = 10;
      g.beginPath(); g.moveTo(w.x, 332); g.quadraticCurveTo(w.x + Math.sin(t * 1.5 + i) * 12 + j(), 332 - w.h / 2, w.x + Math.sin(t * 1.5 + i + 1) * 16 + j(), 332 - w.h); g.stroke();
      g.strokeStyle = '#62c457'; g.lineWidth = 3; g.stroke();
    });
    if (t >= 30) {
      g.fillStyle = '#f2e2c0'; g.fillRect(0, 0, Wd, Ht);
      g.strokeStyle = 'rgba(160,120,70,.15)';
      for (let i = 0; i < 40; i++) { const r = seeded(i + 5); g.beginPath(); g.arc(r() * Wd, r() * Ht, 1 + r() * 3, 0, Math.PI * 2); g.stroke(); }
      'THE END'.split('').forEach((ch, i) => tvText(g, ch, 110 + i * 44 + j(), 150 + j() + Math.sin(i) * 4, 56, i % 2 ? '#ff7a1a' : '#f25c3a', { font: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif', stroke: '#8a3a10', lw: 5 }));
      tvText(g, 'by clayboy_animations', 240, 215, 16, '#6a4a2a', { stroke: false, weight: 'normal' });
      clayFish(g, 240 + j(), 285, 1, n, false, 0.7);
      return;
    }
    let fx = 230, fy = 200, look = 1, mouth = false, br = 0;
    if (t < 8) { fx = lerp(-70, 230, ease(t / 8)); fy = 200 + Math.sin(t * 2) * 8; }
    else if (t < 14) { fy = 200 + Math.sin(t * 2) * 5; look = t < 11 ? -1 : 1; const bt = t - 8; clayBubble(g, 150 + bt * 6 + j(), 290 - bt * 38, 9); }
    else if (t < 22) { mouth = true; br = lerp(3, 50, (t - 14) / 8); }
    else { mouth = true; br = 52; fy = 200 - ease((t - 22) / 8) * 330; }
    if (t < 22) clayFish(g, fx + j(), fy + j(), look, n, mouth);
    if (br > 0 && t < 22) clayBubble(g, fx + 41 + br * 0.9 + j(), fy + 4 - br * 0.2, br);
    if (t >= 22) { clayFish(g, fx + j(), fy + j(), 1, n, true, 0.85); clayBubble(g, fx + 4, fy, 62); }
  }

  // --- stick figure skateboarding (12 drawings per second on notebook paper)
  function drawSkate(g, tt, Wd, Ht) {
    const n = Math.floor(tt * 12), t = n / 12;
    const r = seeded(n * 104729 + 3);
    const wob = () => (r() - 0.5) * 1.5;
    g.fillStyle = '#fbfbf2'; g.fillRect(0, 0, Wd, Ht);
    g.strokeStyle = '#b9d4ee'; g.lineWidth = 1;
    for (let y = 40; y < Ht; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(Wd, y); g.stroke(); }
    g.strokeStyle = '#f0a4a4'; g.beginPath(); g.moveTo(46, 0); g.lineTo(46, Ht); g.stroke();
    g.fillStyle = '#e2e2d8'; [60, 180, 300].forEach((y) => { g.beginPath(); g.arc(20, y, 8, 0, Math.PI * 2); g.fill(); });
    g.strokeStyle = '#3a3a3a'; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
    const line = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1 + wob(), y1 + wob()); g.lineTo(x2 + wob(), y2 + wob()); g.stroke(); };
    const circle = (x, y, rad) => { g.beginPath(); g.arc(x + wob(), y + wob(), rad, 0, Math.PI * 2); g.stroke(); };
    const GROUND = 300;
    line(46, GROUND, Wd, GROUND);
    line(150, GROUND, 215, 262); line(215, 262, 215, GROUND);
    line(360, GROUND, 440, 205); line(440, 205, 440, GROUND);
    let x = 0, y = GROUND, board = 0, pose = 'ride', rot = 0, text = null, sub = null, bx = null, by = 0, brot = 0;
    if (t < 5) x = lerp(-30, 150, t / 5);
    else if (t < 6.5) { const u = (t - 5) / 1.5; x = lerp(150, 215, u); y = lerp(GROUND, 262, u); board = -Math.atan2(38, 65); }
    else if (t < 9) { const u = (t - 6.5) / 2.5; x = lerp(215, 300, u); y = lerp(262, GROUND, u) - Math.sin(u * Math.PI) * 95; board = u * Math.PI * 2; pose = 'air'; }
    else if (t < 13) { x = lerp(300, 318, (t - 9) / 4); if (t > 9.5) text = 'SICK!!!'; }
    else if (t < 16) { x = lerp(318, 360, (t - 13) / 3); text = t < 15.4 ? 'now the big one...' : null; }
    else if (t < 18) { const u = (t - 16) / 2; x = lerp(360, 440, u); y = lerp(GROUND, 205, u); board = -Math.atan2(95, 80); }
    else if (t < 21) { const u = (t - 18) / 3; x = 440 - u * 34; y = 205 - Math.sin(Math.min(1, u * 1.5) * Math.PI) * 44 + u * u * 95; pose = 'flail'; rot = u * Math.PI * 1.35; bx = 440 + u * 150; by = 205 - Math.sin(u * Math.PI) * 70 + u * 110; brot = u * 9; }
    else { x = 400; pose = 'splat'; text = t > 23 ? 'EPIC FAIL' : null; sub = t > 25 ? '(im ok)' : null; }
    const drawBoard = (cx, cy, a) => { g.save(); g.translate(cx, cy); g.rotate(a); line(-20, 0, 20, 0); circle(-12, 5, 3); circle(12, 5, 3); g.restore(); };
    if (pose === 'splat') {
      circle(x + 34, GROUND - 9, 9); line(x + 25, GROUND - 7, x - 10, GROUND - 5); line(x - 10, GROUND - 5, x - 30, GROUND - 14); line(x - 10, GROUND - 5, x - 32, GROUND - 2);
      line(x + 12, GROUND - 6, x + 4, GROUND - 20); line(x + 12, GROUND - 6, x + 24, GROUND - 22);
      for (let i = 0; i < 3; i++) { const a = t * 4 + (i * Math.PI * 2) / 3; const sx = x + 34 + Math.cos(a) * 18, sy = GROUND - 30 + Math.sin(a) * 6; g.beginPath(); for (let k = 0; k < 10; k++) { const aa = (k * Math.PI) / 5, rr = k % 2 ? 2.5 : 6; g.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); } g.closePath(); g.stroke(); }
    } else {
      g.save(); g.translate(x, y);
      if (pose === 'flail') { g.translate(0, -34); g.rotate(-rot); g.translate(0, 34); }
      if (pose !== 'flail') drawBoard(0, -4, board);
      const knee = pose === 'air' ? 8 : 3;
      line(-8, -8, -4, -20 + knee); line(-4, -20 + knee, 0, -32); line(8, -8, 5, -20 + knee); line(5, -20 + knee, 0, -32);
      line(0, -32, 0, -56);
      circle(0, -66, 10);
      if (pose === 'ride') { line(0, -50, -16, -44); line(0, -50, 16, -46); }
      else { const f = Math.sin(t * 20) * 6; line(0, -50, -14, -66 + f); line(0, -50, 14, -68 - f); }
      g.restore();
    }
    if (bx != null) drawBoard(bx, by, brot);
    if (text) tvText(g, text, 240, 110, 40, '#3a3a3a', { stroke: false, font: '"Comic Sans MS", "Chalkboard SE", cursive', rot: -0.06 + wob() * 0.01 });
    if (sub) tvText(g, sub, 250, 150, 20, '#3a3a3a', { stroke: false, weight: 'normal', font: '"Comic Sans MS", cursive' });
  }

  // --- dramatic goldfish
  function frontFish(g, x, y, stage) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#f07d1e';
    g.beginPath(); g.ellipse(-30, 6, 12, 7, 0.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(30, 6, 12, 7, -0.5, 0, Math.PI * 2); g.fill();
    const gr = g.createRadialGradient(-6, -10, 4, 0, 0, 30);
    gr.addColorStop(0, '#ffc46a'); gr.addColorStop(0.6, '#ff8a22'); gr.addColorStop(1, '#d9590c');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 26, 22, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-5, -20); g.quadraticCurveTo(0, -34, 5, -20); g.fillStyle = '#e46a14'; g.fill();
    [-11, 11].forEach((ex) => {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, -6, 7.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(ex, -5, 4.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - 1.5, -7, 1.3, 0, Math.PI * 2); g.fill();
    });
    if (stage > 0) { g.strokeStyle = '#7a2a08'; g.lineWidth = 2; g.beginPath(); g.moveTo(-17, -16); g.lineTo(-6, -13); g.moveTo(17, -16); g.lineTo(6, -13); g.stroke(); }
    g.fillStyle = '#8a2a08'; g.beginPath(); g.ellipse(0, 9, 4, stage > 1 ? 5 : 3, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function drawDramatic(g, t, Wd, Ht) {
    const zooms = [[3.0, 1.9], [4.4, 3.3], [5.8, 6.2]];
    let z = 1, stage = 0, since = 9;
    zooms.forEach(([at, zz], i) => { if (t >= at) { z = zz; stage = i + 1; since = t - at; } });
    const shake = since < 0.25 ? (0.25 - since) * 10 : 0;
    const facing = t >= 2.2;
    const fishX = facing ? 240 : 240 + Math.sin(t * 1.3) * 40, fishY = 176;
    g.save();
    g.translate(Wd / 2 + Math.sin(t * 90) * shake, Ht / 2 + Math.cos(t * 77) * shake);
    g.scale(z, z);
    g.translate(-(stage ? 240 : 240), -(stage ? 172 : 190));
    const wall = g.createLinearGradient(0, 0, 0, 280);
    wall.addColorStop(0, '#f3e6c8'); wall.addColorStop(1, '#e2cfa6');
    g.fillStyle = wall; g.fillRect(-200, -200, 900, 480);
    g.fillStyle = '#8a5a32'; g.fillRect(-200, 280, 900, 300);
    g.fillStyle = '#a06c3e'; g.fillRect(-200, 280, 900, 8);
    g.save(); g.beginPath(); g.arc(240, 196, 96, 0, Math.PI * 2); g.clip();
    const water = g.createLinearGradient(0, 120, 0, 290);
    water.addColorStop(0, '#bfe9ff'); water.addColorStop(1, '#5ab6e8');
    g.fillStyle = 'rgba(230,245,255,.4)'; g.fillRect(140, 90, 200, 50);
    g.fillStyle = water; g.fillRect(140, 128, 200, 170);
    g.fillStyle = '#d9a86a'; g.beginPath(); g.ellipse(240, 288, 90, 20, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 5; i++) { const ph = (t * 0.4 + i / 5) % 1; tvBubble(g, 280 + Math.sin(ph * 9 + i) * 4, 270 - ph * 130, 2.5 + (i % 3)); }
    if (facing) frontFish(g, fishX, fishY, stage);
    else tvFish(g, fishX, fishY + 10, 1.5, Math.cos(t * 1.3) > 0 ? 1 : -1, '#ff9a2e', '#e0560f', t);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(240, 196, 96, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 6; g.beginPath(); g.arc(240, 196, 84, 3.6, 4.4); g.stroke();
    g.restore();
    if (stage) {
      const vg = g.createRadialGradient(Wd / 2, Ht / 2, 60, Wd / 2, Ht / 2, 300);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.25 * stage})`);
      g.fillStyle = vg; g.fillRect(0, 0, Wd, Ht);
    }
    if (stage === 3) { g.fillStyle = 'rgba(140,0,0,.16)'; g.fillRect(0, 0, Wd, Ht); g.fillStyle = '#000'; g.fillRect(0, 0, Wd, 34); g.fillRect(0, Ht - 34, Wd, 34); }
  }

  // --- the bouncing logo that finally hits the corner
  const COR = { Lx: 370, Ly: 310, x0: 140, y0: 60, T: 36 };
  COR.vx = (7 * COR.Lx - COR.x0) / COR.T;
  COR.vy = (5 * COR.Ly - COR.y0) / COR.T;
  const bounce = (u, L) => { const m = ((u % (2 * L)) + 2 * L) % (2 * L); return m <= L ? m : 2 * L - m; };
  const CONFETTI = (() => { const r = seeded(707); return Array.from({ length: 90 }, () => ({ x: r() * 480, v: 60 + r() * 120, d: r() * 0.8, c: ['#ffd62e', '#35c93a', '#3aa6f5', '#ff5a7a', '#fff'][Math.floor(r() * 5)], s: 3 + r() * 4, sp: r() * 6 })); })();
  function drawCorner(g, t, Wd, Ht) {
    g.fillStyle = '#050505'; g.fillRect(0, 0, Wd, Ht);
    const tc = Math.min(t, COR.T);
    const ux = COR.x0 + COR.vx * tc, uy = COR.y0 + COR.vy * tc;
    const x = bounce(ux, COR.Lx), y = bounce(uy, COR.Ly);
    const hits = Math.floor(ux / COR.Lx) + Math.floor(uy / COR.Ly);
    const hues = [200, 120, 45, 330, 270, 170, 20];
    const hue = hues[hits % hues.length];
    const gr = g.createLinearGradient(0, y, 0, y + 50);
    gr.addColorStop(0, `hsl(${hue},90%,78%)`); gr.addColorStop(0.5, `hsl(${hue},85%,52%)`); gr.addColorStop(0.52, `hsl(${hue},85%,42%)`); gr.addColorStop(1, `hsl(${hue},90%,60%)`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x + 55, y + 25, 55, 25, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x + 55, y + 14, 42, 9, 0, 0, Math.PI * 2); g.fill();
    tvText(g, 'HORIZON', x + 55, y + 27, 19, '#fff', { stroke: `hsl(${hue},80%,25%)`, lw: 3 });
    tvText(g, 'video', x + 55, y + 42, 9, '#fff', { stroke: false, weight: 'normal' });
    g.fillStyle = 'rgba(255,255,255,.035)';
    for (let yy = 0; yy < Ht; yy += 3) g.fillRect(0, yy, Wd, 1);
    if (t < 3) tvText(g, 'hour 3. still waiting.', 240, 330, 16, '#bbb', { stroke: false, weight: 'normal' });
    if (t > COR.T - 6 && t < COR.T) tvText(g, 'ITS GONNA HIT', 240, 40, 18, '#fff', { stroke: false });
    if (t >= COR.T) {
      const s = t - COR.T;
      if (s < 0.25) { g.fillStyle = `rgba(255,255,255,${1 - s * 4})`; g.fillRect(0, 0, Wd, Ht); }
      CONFETTI.forEach((c) => { const cy = -10 + (s - c.d) * c.v; if (cy > -10 && cy < Ht + 10) { g.fillStyle = c.c; g.save(); g.translate(c.x + Math.sin(s * 3 + c.sp) * 12, cy); g.rotate(s * 4 + c.sp); g.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2); g.restore(); } });
      const pulse = 1 + Math.sin(s * 10) * 0.05;
      g.save(); g.translate(240, 150); g.scale(pulse, pulse);
      tvText(g, 'IT HIT THE CORNER!!!', 0, 0, 34, '#ffe34a', { stroke: '#000', lw: 6 });
      g.restore();
    }
  }

  const TV_USERS = {
    fishfacts: 'avatars/avatar-fish', aquadreamer: 'icons/aquarium', popmaster3000: 'icons/bubble', skyguy_mike: 'avatars/avatar-sun', clayboy_animations: 'icons/paint',
    tyler_rawr: 'avatars/avatar-music', screensaverwatcher: 'icons/monitor', firstfisher: 'icons/star', bubblefan99: 'icons/bubble', kayla: 'avatars/avatar-flower',
    skeptic_steve: 'icons/help', mike: 'avatars/avatar-dolphin', studybuddy: 'icons/lightbulb', jess: 'avatars/avatar-butterfly', calm_carl: 'avatars/avatar-leaf',
    impatient_ian: 'icons/clock', grandpa_joe: 'icons/user', photog_pam: 'icons/camera', night_owl: 'icons/moon', tyler: 'avatars/avatar-music', art_teacher_ann: 'icons/paint',
    sk8rjake: 'icons/gamepad', office_dave: 'icons/laptop',
  };
  const VIDEOS = [
    { id: 'dramatic', title: 'Dramatic Goldfish', user: 'fishfacts', dur: 8, views: 48213554, rating: 4.9, ratings: 91234, added: 34, cat: 'Comedy', thumbT: 6.4, draw: drawDramatic,
      desc: 'He just turned around. That is all. Original video, please do not re-upload.', tags: 'goldfish dramatic funny zoom fish comedy',
      events: [[1.2, 'bloop'], [3.0, 'dun'], [4.4, 'dun2'], [5.8, 'dunn']],
      comments: [['firstfisher', 'first!!', 5 * H], ['bubblefan99', 'lol the 3rd zoom gets me every time', 7 * H], ['kayla', 'OMG i cant stop watching this', D], ['skeptic_steve', 'this is staged. fish cant act.', 2 * D], ['fishfacts', 'He is a very talented fish. Thank you all for 48 million views!', 3 * D], ['mike', 'dun dun DUNNNN', 4 * D]] },
    { id: 'aquarium', title: 'relaxing aquarium ~ calm fish for studying (HQ)', user: 'aquadreamer', dur: 60, views: 1204332, rating: 4.7, ratings: 5402, added: 14, cat: 'Pets & Animals', thumbT: 12, draw: drawAquarium,
      desc: 'Put this on while you study, work or fall asleep. Seven fish, one castle, zero stress. 10 hour version coming soon.', tags: 'aquarium fish relaxing calm study sleep water',
      events: [[4, 'bloop'], [11, 'bloop'], [19, 'bloop'], [27, 'bloop'], [36, 'bloop'], [44, 'bloop'], [53, 'bloop']],
      comments: [['studybuddy', 'i fell asleep 2 minutes in. 10/10', 3 * H], ['firstfisher', 'first!!', 9 * H], ['aquadreamer', 'Thanks for watching! 10 hour version coming soon', D], ['jess', 'the orange one is my favorite', 2 * D], ['calm_carl', 'better than my actual fish tank, which is empty', 5 * D]] },
    { id: 'bubblewrap', title: 'SATISFYING bubble wrap popping!!!', user: 'popmaster3000', dur: 32, views: 3322910, rating: 4.6, ratings: 12880, added: 21, cat: 'Howto & Style', thumbT: 12.4, draw: drawBubblewrap,
      desc: '48 bubbles. One finger. Watch until the end for the speed round!! Please rate and subscribe for more popping.', tags: 'bubble wrap popping satisfying pop',
      events: BW.map((q) => [q.pop, 'pop']),
      comments: [['popmaster3000', 'Thanks for 3 million views!! More popping coming soon', 4 * H], ['impatient_ian', 'just skip to 0:22 trust me', 8 * H], ['bubblefan99', 'the speed round is so satisfying', D], ['kayla', 'i want to pop them sooo bad', 2 * D], ['grandpa_joe', 'In my day we popped bubble wrap for free. Now it is on the computer.', 6 * D]] },
    { id: 'sunset', title: 'Sunset timelapse from my roof (HD)', user: 'skyguy_mike', dur: 45, views: 876003, rating: 4.8, ratings: 3120, added: 9, cat: 'Travel & Places', thumbT: 26, draw: drawSunset,
      desc: 'Three hours of sunset in 45 seconds. Shot from my roof with a camera taped to a lawn chair. Watch the city lights come on!', tags: 'sunset timelapse sky city night stars hd',
      events: [],
      comments: [['night_owl', 'the part where the city lights come on gave me chills', 2 * H], ['photog_pam', 'what camera did u use??', 10 * H], ['skyguy_mike', 'Just a regular camcorder and a lot of patience!', D], ['tyler', 'this would be a good music video for my band', 3 * D], ['firstfisher', 'first!!', 7 * D]] },
    { id: 'clayfish', title: 'Claymation: Gerald the Fish (my first stop motion!!)', user: 'clayboy_animations', dur: 36, views: 412998, rating: 4.5, ratings: 2210, added: 45, cat: 'Film & Animation', thumbT: 18, draw: drawClay,
      desc: 'My first stop motion ever! Took 3 weeks and 288 frames. Gerald is made of modeling clay and googly eyes. He says hi.', tags: 'claymation stop motion clay fish animation gerald',
      events: [[16, 'bloop'], [19, 'bloop'], [22.5, 'boing']],
      comments: [['clayboy_animations', 'my first stop motion!! took 3 weeks. gerald says hi', 6 * H], ['art_teacher_ann', 'Wonderful work! Keep going!', D], ['bubblefan99', 'GERALD!!!!', 2 * D], ['jess', 'his googly eyes lol', 4 * D], ['firstfisher', 'first!!', 9 * D]] },
    { id: 'skate', title: 'SICK KICKFLIP (stick figure edition) epic fail at end', user: 'tyler_rawr', dur: 30, views: 99875, rating: 4.2, ratings: 640, added: 2, cat: 'Sports', thumbT: 7.8, draw: drawSkate,
      desc: 'drew this in science class. kickflip is real. the fail is also real. im ok.', tags: 'skateboard kickflip skate fail stick figure animation',
      events: [[6.5, 'swoosh'], [9, 'land'], [18, 'swoosh'], [20.6, 'crash']],
      comments: [['sk8rjake', 'sick kickflip man!! the ending tho', 3 * H], ['kayla', 'omg tyler r u ok', 5 * H], ['tyler_rawr', 'im ok. the ramp is not', 6 * H], ['mike', 'epic fail at 0:21 lmao', D], ['firstfisher', 'first!!', 2 * D]] },
    { id: 'corner', title: 'IT HIT THE CORNER!!! (finally, after 3 hours)', user: 'screensaverwatcher', dur: 40, views: 2458712, rating: 4.8, ratings: 10233, added: 60, cat: 'Entertainment', thumbT: 37, draw: drawCorner,
      desc: 'We left the screensaver on in the break room and waited. And waited. Then this happened.', tags: 'screensaver corner logo bounce hit epic',
      events: [[COR.T, 'cheer']],
      comments: [['screensaverwatcher', 'I waited 3 hours for this. It was worth it.', 5 * H], ['bubblefan99', 'I SCREAMED', 9 * H], ['office_dave', 'the whole office stopped working to watch this', D], ['firstfisher', 'first!!', 3 * D], ['skeptic_steve', 'fake. logos cant hit corners.', 5 * D]] },
  ];
  const tvVideo = (id) => VIDEOS.find((v) => v.id === id);
  W.tubeview = { videos: VIDEOS, thumb: (id) => (tvVideo(id) ? tvThumb(tvVideo(id)) : '') };
  const THUMBS = new Map();
  function tvThumb(v) {
    if (THUMBS.has(v.id)) return THUMBS.get(v.id);
    const c = document.createElement('canvas');
    c.width = 160; c.height = 120;
    const g = c.getContext('2d');
    g.scale(160 / 480, 120 / 360);
    try { v.draw(g, v.thumbT, 480, 360); } catch (e) { g.fillStyle = '#123'; g.fillRect(0, 0, 480, 360); }
    let url = '';
    try { url = c.toDataURL('image/png'); } catch (e) { url = ''; }
    THUMBS.set(v.id, url);
    return url;
  }
  function tvSound(kind, dest) {
    const S = A.sound;
    if (!S.ctx || !dest) return;
    const t = S.ctx.currentTime + 0.01;
    if (kind === 'pop') { S.noise(t, { dur: 0.05, vel: 0.35, type: 'bandpass', f1: 1700 + Math.random() * 600, q: 1.3, dest, rev: 0.03 }); S.blip(700, 260, t, { dur: 0.05, vel: 0.06, dest, rev: 0 }); }
    else if (kind === 'bloop') S.blip(260 + Math.random() * 120, 720, t, { dur: 0.13, vel: 0.06, type: 'sine', dest });
    else if (kind === 'boing') S.blip(180, 620, t, { dur: 0.22, vel: 0.07, type: 'triangle', dest });
    else if (kind === 'dun') S.pad(['C3', 'Eb3', 'G3'], t, { dur: 0.9, vel: 0.14, attack: 0.01, release: 0.5, dest });
    else if (kind === 'dun2') S.pad(['B2', 'D3', 'F3'], t, { dur: 0.9, vel: 0.15, attack: 0.01, release: 0.5, dest });
    else if (kind === 'dunn') { S.pad(['C2', 'C3', 'Eb3', 'Gb3'], t, { dur: 2.4, vel: 0.2, attack: 0.01, release: 1.2, dest }); S.noise(t, { dur: 0.3, vel: 0.12, type: 'lowpass', f1: 300, dest }); }
    else if (kind === 'swoosh') S.noise(t, { dur: 0.35, vel: 0.14, type: 'bandpass', f1: 500, f2: 2600, dest, shape: 'swell' });
    else if (kind === 'land') S.noise(t, { dur: 0.08, vel: 0.2, type: 'lowpass', f1: 900, dest });
    else if (kind === 'crash') { S.noise(t, { dur: 0.45, vel: 0.3, type: 'lowpass', f1: 1200, dest }); S.blip(220, 70, t, { dur: 0.3, vel: 0.1, type: 'triangle', dest }); }
    else if (kind === 'cheer') { S.noise(t, { dur: 2.8, vel: 0.2, type: 'bandpass', f1: 1400, q: 0.4, shape: 'swell', dest }); S.noise(t + 0.2, { dur: 2.2, vel: 0.12, type: 'bandpass', f1: 2600, q: 0.6, shape: 'swell', dest }); }
  }

  // The player: canvas + gloss control bar, seek, volume, "full screen" inside the window.
  function tvPlayer(ctx, holder, v, onEnd) {
    const P = { t: 0, playing: false, ended: false, full: false, buffering: true, bufT: 0.7, loaded: 0, dirty: true, vol: ctx.store.get('tube.vol', 0.7), muted: ctx.store.get('tube.muted', false) };
    const speed = ctx.speed();
    const loadRate = speed === 'dialup' ? 0.05 : speed === 'broadband' ? 5 : 0.35;
    const cv = ctx.canvas(480, 360, 'web-tv-canvas');
    holder.innerHTML = `<div class="web-tv-player" tabindex="0" aria-label="Video player">
      <div class="web-tv-screen"><div class="web-tv-over"><button type="button" class="web-tv-big" aria-label="Play"><i></i></button><div class="web-tv-buf"><span></span>Loading...</div><div class="web-tv-endscr" hidden></div></div></div>
      <div class="web-tv-ctrl"><button type="button" class="web-tv-pp" aria-label="Play" data-tip="Play"><i></i></button>
        <div class="web-tv-seek" role="slider" aria-label="Seek" tabindex="-1"><div class="web-tv-loaded"></div><div class="web-tv-played"></div><div class="web-tv-knob"></div></div>
        <span class="web-tv-time">0:00 / ${A.util.fmtDuration(v.dur)}</span>
        <button type="button" class="web-tv-vol" aria-label="Mute" data-tip="Mute"><i></i></button><input type="range" class="web-tv-volr" min="0" max="100" aria-label="Volume">
        <button type="button" class="web-tv-fs" aria-label="Full screen" data-tip="Full screen"><i></i></button></div></div>`;
    const el = holder.querySelector('.web-tv-player');
    const screen = el.querySelector('.web-tv-screen');
    screen.prepend(cv.c);
    const $ = (s) => el.querySelector(s);
    const big = $('.web-tv-big'), buf = $('.web-tv-buf'), endscr = $('.web-tv-endscr'), pp = $('.web-tv-pp'), seek = $('.web-tv-seek'), played = $('.web-tv-played'), loaded = $('.web-tv-loaded'), knob = $('.web-tv-knob'), time = $('.web-tv-time'), volb = $('.web-tv-vol'), volr = $('.web-tv-volr'), fs = $('.web-tv-fs');
    volr.value = String(Math.round(P.vol * 100));
    const dest = () => { const d = ctx.audio(); if (d) d.gain.value = P.muted ? 0 : P.vol; return d; };
    function paintUI() {
      el.classList.toggle('playing', P.playing);
      el.classList.toggle('muted', P.muted || P.vol === 0);
      pp.setAttribute('aria-label', P.playing ? 'Pause' : 'Play'); pp.setAttribute('data-tip', P.playing ? 'Pause' : 'Play');
      big.hidden = P.playing || P.buffering || P.ended;
      buf.hidden = !P.buffering;
      endscr.hidden = !P.ended;
      const f = P.t / v.dur;
      played.style.width = f * 100 + '%';
      knob.style.left = f * 100 + '%';
      loaded.style.width = P.loaded * 100 + '%';
      time.textContent = A.util.fmtDuration(P.t) + ' / ' + A.util.fmtDuration(v.dur);
      ctx.keepAwake(P.playing);
    }
    function draw() {
      const g = cv.g;
      g.fillStyle = '#000'; g.fillRect(0, 0, cv.w, cv.h);
      const s = Math.min(cv.w / 480, cv.h / 360);
      g.save(); g.translate((cv.w - 480 * s) / 2, (cv.h - 360 * s) / 2); g.scale(s, s);
      g.beginPath(); g.rect(0, 0, 480, 360); g.clip();
      v.draw(g, P.t, 480, 360);
      g.restore();
    }
    function play() { if (P.ended) { P.t = 0; P.ended = false; } P.playing = true; dest(); paintUI(); }
    function pause() { P.playing = false; paintUI(); }
    function toggle() { if (P.playing) pause(); else play(); }
    function seekTo(t) { P.t = clamp(t, 0, v.dur - 0.01); P.ended = false; P.dirty = true; paintUI(); }
    function end() {
      P.playing = false; P.ended = true; P.t = v.dur;
      const rel = VIDEOS.filter((x) => x.id !== v.id).slice(0, 4);
      endscr.innerHTML = `<div class="web-tv-endrow"><button type="button" class="web-tv-again">Watch again</button><button type="button" class="web-tv-share">Share</button></div><div class="web-tv-endgrid">${rel.map((x) => `<button type="button" class="web-tv-endv" data-v="${x.id}"><img src="${tvThumb(x)}" alt=""><span>${esc(x.title)}</span></button>`).join('')}</div>`;
      endscr.querySelector('.web-tv-again').addEventListener('click', (e) => { e.stopPropagation(); P.t = 0; P.ended = false; play(); });
      endscr.querySelector('.web-tv-share').addEventListener('click', (e) => { e.stopPropagation(); ctx.dialog({ title: 'TubeView', icon: 'icons/mail', instruction: 'Video shared!', message: 'We sent "' + v.title + '" to all your friends. They will say "lol" in about five minutes.' }); });
      endscr.querySelectorAll('.web-tv-endv').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (P.full) setFull(false); ctx.go('/watch?v=' + b.dataset.v); }));
      paintUI();
      if (onEnd) onEnd();
    }
    function setFull(on) {
      P.full = on;
      ctx.fullscreen(el, on);
      el.classList.toggle('web-tv-full', on);
      if (!on) cv.resize(480, 360);
      P.dirty = true;
      el.focus({ preventScroll: true });
    }
    big.addEventListener('click', (e) => { e.stopPropagation(); play(); });
    pp.addEventListener('click', toggle);
    screen.addEventListener('click', (e) => { if (e.target.closest('.web-tv-endscr')) return; if (!P.buffering) toggle(); });
    screen.addEventListener('dblclick', () => setFull(!P.full));
    fs.addEventListener('click', () => setFull(!P.full));
    volb.addEventListener('click', () => { P.muted = !P.muted; ctx.store.set('tube.muted', P.muted); dest(); paintUI(); });
    volr.addEventListener('input', () => { P.vol = Number(volr.value) / 100; P.muted = false; ctx.store.set('tube.vol', P.vol); ctx.store.set('tube.muted', false); dest(); paintUI(); });
    seek.addEventListener('pointerdown', (e) => {
      const r = seek.getBoundingClientRect();
      const at = (ev) => seekTo(((ev.clientX - r.left) / r.width) * v.dur);
      at(e);
      seek.setPointerCapture(e.pointerId);
      const move = (ev) => at(ev);
      const up = () => { seek.removeEventListener('pointermove', move); seek.removeEventListener('pointerup', up); };
      seek.addEventListener('pointermove', move);
      seek.addEventListener('pointerup', up);
    });
    el.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === ' ' || k === 'k' || k === 'K') { e.preventDefault(); toggle(); }
      else if (k === 'ArrowLeft') { e.preventDefault(); seekTo(P.t - 5); }
      else if (k === 'ArrowRight') { e.preventDefault(); seekTo(P.t + 5); }
      else if (k === 'm' || k === 'M') volb.click();
      else if (k === 'f' || k === 'F') setFull(!P.full);
      else if (k === 'Escape' && P.full) { e.preventDefault(); e.stopPropagation(); setFull(false); }
    });
    ctx.loop((dt) => {
      if (P.full) {
        const w = Math.max(160, screen.clientWidth), hh = Math.max(120, screen.clientHeight);
        if (cv.resize(w, hh)) P.dirty = true;
      }
      P.loaded = Math.min(1, P.loaded + dt * loadRate * (8 / v.dur));
      if (P.buffering) {
        P.bufT -= dt;
        if (P.bufT <= 0 && P.loaded * v.dur >= Math.min(v.dur, P.t + 1.5)) { P.buffering = false; if (!P.started) { P.started = true; play(); } paintUI(); }
      } else if (P.playing) {
        const prev = P.t;
        P.t = Math.min(v.dur, P.t + dt);
        if (P.t > P.loaded * v.dur + 0.05 && P.loaded < 1) { P.t = prev; P.buffering = true; P.bufT = 0.3; paintUI(); }
        (v.events || []).forEach(([et, kind]) => { if (et > prev && et <= P.t) tvSound(kind, dest()); });
        if (P.t >= v.dur) end();
        P.dirty = true;
      }
      if (P.dirty) { draw(); P.dirty = false; paintUI(); }
      else if (P.buffering || P.loaded < 1) loaded.style.width = P.loaded * 100 + '%';
    });
    paintUI();
    draw();
    return { el, pause, play };
  }

  const tvStars = (r) => K.stars(r);
  function tvRow(v) {
    return `<div class="web-tv-row"><a class="web-tv-thumb" href="/watch?v=${v.id}"><img src="${tvThumb(v)}" alt=""><span>${A.util.fmtDuration(v.dur)}</span></a>
      <div class="web-tv-rowtext"><a class="web-tv-vtitle" href="/watch?v=${v.id}">${esc(v.title)}</a><p>${esc(v.desc)}</p>
      <div class="web-tv-meta">Added: ${K.ago(Date.now() - v.added * D)}<br>From: <a href="/user/${v.user}">${esc(v.user)}</a><br>Views: ${K.num(v.views)}</div>
      <div class="web-tv-rate">${tvStars(v.rating)} <span>${K.num(v.ratings)} ratings</span></div></div></div>`;
  }
  function tvSmall(v) {
    return `<a class="web-tv-small" href="/watch?v=${v.id}"><span class="web-tv-thumb sm"><img src="${tvThumb(v)}" alt=""><span>${A.util.fmtDuration(v.dur)}</span></span><span class="web-tv-smalltext"><b>${esc(v.title)}</b><small>From: ${esc(v.user)}<br>Views: ${K.num(v.views)}</small></span></a>`;
  }
  function tvFrame(ctx, tab, inner) {
    const tabs = [['videos', 'Videos', '/'], ['categories', 'Categories', '/categories'], ['channels', 'Channels', '/user/fishfacts'], ['community', 'Community', '#community']];
    return `<div class="web-tv"><div class="web-tv-wrap">
      <div class="web-tv-top"><a class="web-tv-logo" href="http://www.tubeview.com/"><span class="web-tv-set"><i></i></span><span class="web-tv-word">Tube<b>View</b></span><span class="web-tv-tag">Watch it. Share it. Bubble it.</span></a>
        <div class="web-tv-links"><a href="#" data-j="signup">Sign Up</a> | <a href="#" data-j="quick">QuickList (0)</a> | <a href="#" data-j="help">Help</a> | <a href="#" data-j="login">Log In</a></div></div>
      <div class="web-tv-bar"><div class="web-tv-tabs">${tabs.map(([id, t, u]) => `<a href="${u}" class="${id === tab ? 'on' : ''}"${u[0] === '#' ? ' data-j="' + id + '"' : ''}>${t}</a>`).join('')}</div>
        <form class="web-tv-search" action="/results"><input name="search_query" type="text" autocomplete="off" aria-label="Search videos"><button type="submit">Search</button></form>
        <a class="web-tv-upload" href="/upload">Upload</a></div>
      ${inner}
      <div class="web-tv-foot"><a href="#" data-j="help">Help</a> | <a href="#" data-j="about">About</a> | <a href="#" data-j="dev">Developers</a> | <a href="#" data-j="terms">Terms of Use</a> | <a href="#" data-j="privacy">Privacy Policy</a><div>&copy; 2007 TubeView. All videos are about eight seconds long, except the ones that are not.</div></div>
    </div></div>`;
  }
  function tvWire(ctx, root) {
    root.querySelectorAll('[data-j]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const k = a.dataset.j;
      const m = { signup: ['Sign up for TubeView', 'Sign-ups are free! We just need your e-mail, your favorite color and a video of your cat. (We are kidding. You are already signed in.)'], login: ['You are already logged in', 'Welcome back! Your QuickList is empty. Fill it with goldfish.'], quick: ['Your QuickList', 'Your QuickList is empty. Add videos with the plus button... which we have not built yet.'], community: ['TubeView Community', 'Contests, groups and the famous comment section. Mostly the comment section.'] }[k] || ['TubeView', 'This page is being uploaded. Please check back in a few minutes.'];
      ctx.dialog({ title: 'TubeView', icon: 'icons/video', instruction: m[0], message: m[1] });
    }));
  }

  function tvHome(ctx) {
    ctx.title('TubeView - Watch it. Share it. Bubble it.');
    const order = VIDEOS.slice();
    const watching = VIDEOS.slice().sort((a, b) => K.hash(a.id + K.dayNumber()) - K.hash(b.id + K.dayNumber()));
    const inner = `<div class="web-tv-now"><div class="web-tv-nowh">Videos being watched right now...</div><div class="web-tv-nowstrip">${watching.concat(watching).map((v) => `<a href="/watch?v=${v.id}" class="web-tv-nowv" title="${esc(v.title)}"><img src="${tvThumb(v)}" alt=""></a>`).join('')}</div></div>
      <div class="web-tv-cols"><div class="web-tv-main"><div class="web-tv-box"><div class="web-tv-boxh">Featured Videos</div>${order.map(tvRow).join('')}</div></div>
      <div class="web-tv-side"><div class="web-tv-box web-tv-promo"><b>Want to customize this homepage?</b><p><a href="#" data-j="login">Sign In</a> or <a href="#" data-j="signup">Sign Up</a> now!</p></div>
        <div class="web-tv-box"><div class="web-tv-boxh">Promoted Videos</div>${[tvVideo('corner'), tvVideo('dramatic')].map(tvSmall).join('')}</div>
        <div class="web-tv-box"><div class="web-tv-boxh">Most Viewed Today</div><ol class="web-tv-most">${VIDEOS.slice().sort((a, b) => b.views - a.views).map((v) => `<li><a href="/watch?v=${v.id}">${esc(v.title)}</a> <small>${K.num(Math.round(v.views / 400))} views today</small></li>`).join('')}</ol></div>
        <div class="web-tv-box web-tv-ad"><div class="web-tv-adlabel">Advertisement</div><a href="http://www.minigames.com/">${K.burst('FREE!', { size: 54, font: 12 })}<span><b>Play free games!</b><br>Bubble Copter, Fish Food Frenzy and more at MiniGames.com</span></a></div></div></div>`;
    const root = ctx.html(tvFrame(ctx, 'videos', inner));
    tvWire(ctx, root);
    const strip = root.querySelector('.web-tv-nowstrip');
    let off = 0;
    ctx.every(3200, () => { if (!ctx.visible()) return; off = (off + 1) % watching.length; strip.style.transform = `translateX(${-off * 124}px)`; });
  }

  function tvWatch(ctx) {
    const v = tvVideo(ctx.q('v'));
    if (!v) {
      ctx.title('TubeView - Video not available');
      const root = ctx.html(tvFrame(ctx, 'videos', `<div class="web-tv-box web-tv-gone"><div class="web-tv-boxh">This video is not available.</div><p>This video has been removed, or it floated away. Try one of these instead:</p><div class="web-tv-gonegrid">${VIDEOS.slice(0, 4).map(tvSmall).join('')}</div></div>`));
      tvWire(ctx, root);
      return;
    }
    ctx.title('TubeView - ' + v.title);
    const views = v.views + ctx.store.get('tube.views.' + v.id, 0) + 1;
    ctx.store.set('tube.views.' + v.id, ctx.store.get('tube.views.' + v.id, 0) + 1);
    const myRate = ctx.store.get('tube.rate.' + v.id, 0);
    const related = VIDEOS.filter((x) => x.id !== v.id);
    const more = VIDEOS.filter((x) => x.user === v.user && x.id !== v.id);
    const inner = `<h1 class="web-tv-title">${esc(v.title)}</h1>
      <div class="web-tv-watch"><div class="web-tv-wl">
        <div class="web-tv-playerhold"></div>
        <div class="web-tv-ratebar"><div class="web-tv-rateme"><span class="web-tv-ratelabel">${myRate ? 'Thanks for rating!' : 'Rate:'}</span><span class="web-tv-stars" role="radiogroup" aria-label="Rate this video">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} star${n > 1 ? 's' : ''}"></button>`).join('')}</span><span class="web-tv-ratecount">${K.num(v.ratings + (myRate ? 1 : 0))} ratings</span></div><div class="web-tv-views">Views: <b>${K.num(views)}</b></div></div>
        <div class="web-tv-actions"><a href="#" data-a="share">Share</a><a href="#" data-a="fav">Favorite</a><a href="#" data-a="list">Add to Playlists</a><a href="#" data-a="flag">Flag</a></div>
        <div class="web-tv-box"><div class="web-tv-boxh">Comments &amp; Responses</div><div class="web-tv-cwrap"><form class="web-tv-cform"><textarea maxlength="500" placeholder="first!!" aria-label="Comment"></textarea><button type="submit">Post Comment</button><span class="web-tv-cmsg"></span></form><div class="web-tv-clist"></div></div></div>
      </div><div class="web-tv-wr">
        <div class="web-tv-box web-tv-about"><div class="web-tv-uprow">${K.img(TV_USERS[v.user] || 'icons/user', 'web-tv-upic')}<div>From: <a href="/user/${v.user}"><b>${esc(v.user)}</b></a><br>Added: ${K.shortDate(Date.now() - v.added * D)}<br><button type="button" class="web-tv-sub">Subscribe</button></div></div><p>${esc(v.desc)}</p><div class="web-tv-small2">Category: <a href="/results?search_query=${encodeURIComponent(v.cat)}">${esc(v.cat)}</a><br>Tags: ${v.tags.split(' ').map((t) => `<a href="/results?search_query=${t}">${t}</a>`).join(' ')}</div>
          <label class="web-tv-field">URL <input type="text" readonly value="http://www.tubeview.com/watch?v=${v.id}"></label>
          <label class="web-tv-field">Embed <input type="text" readonly value="&lt;object width=&quot;425&quot; height=&quot;344&quot;&gt;&lt;param name=&quot;movie&quot; value=&quot;http://www.tubeview.com/v/${v.id}&quot;&gt;&lt;/param&gt;&lt;/object&gt;"></label></div>
        ${more.length ? `<div class="web-tv-box"><div class="web-tv-boxh">More From: ${esc(v.user)}</div>${more.map(tvSmall).join('')}</div>` : ''}
        <div class="web-tv-box"><div class="web-tv-boxh">Related Videos</div><div class="web-tv-related">${related.map(tvSmall).join('')}</div></div>
      </div></div>`;
    const root = ctx.html(tvFrame(ctx, 'videos', inner));
    tvWire(ctx, root);
    tvPlayer(ctx, root.querySelector('.web-tv-playerhold'), v);
    root.querySelectorAll('.web-tv-field input').forEach((i) => i.addEventListener('focus', () => i.select()));
    const btns = root.querySelectorAll('.web-tv-stars button');
    const paintStars = (n) => btns.forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= n));
    const current = () => ctx.store.get('tube.rate.' + v.id, 0) || Math.round(v.rating);
    paintStars(current());
    const labels = ['', 'Poor', 'Nothing special', 'Worth watching', 'Pretty cool', 'Awesome!'];
    btns.forEach((b) => {
      b.addEventListener('mouseenter', () => { paintStars(Number(b.dataset.n)); root.querySelector('.web-tv-ratelabel').textContent = labels[Number(b.dataset.n)]; });
      b.addEventListener('mouseleave', () => { paintStars(current()); root.querySelector('.web-tv-ratelabel').textContent = ctx.store.get('tube.rate.' + v.id, 0) ? 'Thanks for rating!' : 'Rate:'; });
      b.addEventListener('click', () => { const n = Number(b.dataset.n); ctx.store.set('tube.rate.' + v.id, n); paintStars(n); root.querySelector('.web-tv-ratelabel').textContent = 'Thanks for rating!'; root.querySelector('.web-tv-ratecount').textContent = K.num(v.ratings + 1) + ' ratings'; ctx.sound('click'); });
    });
    root.querySelectorAll('[data-a]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const k = a.dataset.a;
      const m = { share: ['Share this video', 'Copy the URL on the right and paste it into an e-mail, an IM or your MySpot profile.'], fav: ['Added to your Favorites', 'You can find it later under My Account > Favorites > Page 7.'], list: ['Add to Playlists', 'You do not have any playlists yet. Try naming one "videos to watch instead of homework".'], flag: ['Thank you for flagging', 'This video has been reported to a very serious goldfish, who will review it shortly.'] }[k];
      ctx.dialog({ title: 'TubeView', icon: k === 'flag' ? 'icons/shield' : 'icons/video', instruction: m[0], message: m[1] });
    }));
    root.querySelector('.web-tv-sub').addEventListener('click', (e) => { e.target.textContent = 'Subscribed!'; e.target.disabled = true; ctx.sound('ding'); });
    const list = root.querySelector('.web-tv-clist');
    const hidden = new Set(ctx.store.get('tube.spam', []));
    const paint = () => {
      const mine = ctx.store.get('tube.comments.' + v.id, []);
      const all = mine.map((c) => ({ user: c.name, pic: c.avatar, text: c.text, when: K.ago(c.t), key: 'm' + c.t, mine: true })).concat(v.comments.map(([u, text, ms], i) => ({ user: u, pic: TV_USERS[u] || 'icons/user', text, when: K.ago(Date.now() - ms), key: v.id + i })));
      list.innerHTML = all.map((c) => hidden.has(c.key) ? `<div class="web-tv-c spam">Comment marked as spam.</div>` : `<div class="web-tv-c">${K.img(c.pic, 'web-tv-cpic')}<div><div class="web-tv-chead"><a href="${c.mine ? '#' : '/user/' + c.user}">${esc(c.user)}</a> <span>(${esc(c.when)})</span></div><p>${esc(c.text)}</p><div class="web-tv-cacts"><a href="#" data-reply="${esc(c.user)}">Reply</a> <a href="#" data-spam="${c.key}">Spam</a></div></div></div>`).join('');
      list.querySelectorAll('[data-spam]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); hidden.add(a.dataset.spam); ctx.store.set('tube.spam', Array.from(hidden).slice(-60)); paint(); ctx.status('Marked as spam. Thank you, internet hero.'); }));
      list.querySelectorAll('[data-reply]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const ta = root.querySelector('.web-tv-cform textarea'); ta.value = '@' + a.dataset.reply + ' '; ta.focus(); }));
    };
    paint();
    root.querySelector('.web-tv-cform').addEventListener('submit', (e) => {
      e.preventDefault();
      const ta = e.target.querySelector('textarea');
      const text = ta.value.trim();
      if (!text) { root.querySelector('.web-tv-cmsg').textContent = 'Type a comment first!'; return; }
      const user = ctx.user();
      const mine = ctx.store.get('tube.comments.' + v.id, []);
      mine.unshift({ name: user.name.replace(/\s+/g, '_').toLowerCase(), avatar: user.avatar, text: text.slice(0, 500), t: Date.now() });
      ctx.store.set('tube.comments.' + v.id, mine.slice(0, 30));
      ta.value = '';
      root.querySelector('.web-tv-cmsg').textContent = text.toLowerCase().startsWith('first') ? 'Posted! (You were not first.)' : 'Comment posted!';
      ctx.sound('pop');
      paint();
    });
  }

  function tvResults(ctx) {
    const q = ctx.q('search_query').trim();
    ctx.title('TubeView - ' + (q || 'Search'));
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = VIDEOS.filter((v) => words.some((w) => (v.title + ' ' + v.tags + ' ' + v.user + ' ' + v.cat + ' ' + v.desc).toLowerCase().includes(w)));
    const inner = `<div class="web-tv-cols"><div class="web-tv-main"><div class="web-tv-box"><div class="web-tv-boxh">Search results for "${esc(q)}" <span class="web-tv-count">${hits.length ? 'Results 1 - ' + hits.length + ' of ' + hits.length : ''}</span></div>${hits.length ? hits.map(tvRow).join('') : `<p class="web-tv-none">No videos found for "${esc(q)}". Try "fish", "bubble" or "sunset".</p>`}</div></div>
      <div class="web-tv-side"><div class="web-tv-box"><div class="web-tv-boxh">Popular searches</div><div class="wk-tags web-tv-tagc">${['goldfish', 'bubble wrap', 'sunset', 'claymation', 'kickflip', 'corner', 'relaxing', 'funny'].map((t, i) => `<a href="/results?search_query=${encodeURIComponent(t)}" style="font-size:${1 + (i % 3) * 0.25}em">${t}</a>`).join(' ')}</div></div></div></div>`;
    tvWire(ctx, ctx.html(tvFrame(ctx, 'videos', inner)));
  }
  function tvCategories(ctx) {
    ctx.title('TubeView - Categories');
    const cats = [['Comedy', 'icons/star'], ['Pets & Animals', 'icons/fish'], ['Film & Animation', 'icons/paint'], ['Sports', 'icons/gamepad'], ['Travel & Places', 'icons/globe'], ['Howto & Style', 'icons/lightbulb'], ['Entertainment', 'icons/monitor'], ['Music', 'icons/music']];
    const inner = `<div class="web-tv-box"><div class="web-tv-boxh">Categories</div><div class="web-tv-cats">${cats.map(([c, ic]) => `<a href="/results?search_query=${encodeURIComponent(c)}">${K.img(ic)}<span>${esc(c)}</span></a>`).join('')}</div></div>`;
    tvWire(ctx, ctx.html(tvFrame(ctx, 'categories', inner)));
  }
  function tvUser(ctx, name) {
    const list = VIDEOS.filter((v) => v.user === name);
    ctx.title('TubeView - ' + name + "'s Channel");
    const subs = 1200 + (K.hash(name) % 90000);
    const inner = `<div class="web-tv-channel"><div class="web-tv-box web-tv-chbox">${K.img(TV_USERS[name] || 'icons/user', 'web-tv-chpic')}<div><h2>${esc(name)}</h2><p>Subscribers: <b>${K.num(subs)}</b><br>Channel views: <b>${K.num(subs * 37)}</b><br>Joined: ${K.shortDate(Date.now() - (200 + (K.hash(name) % 500)) * D)}</p><button type="button" class="web-tv-sub">Subscribe</button></div></div>
      <div class="web-tv-box"><div class="web-tv-boxh">Videos (${list.length})</div>${list.length ? list.map(tvRow).join('') : '<p class="web-tv-none">This user has not uploaded any videos yet. They mostly leave comments.</p>'}</div></div>`;
    const root = ctx.html(tvFrame(ctx, 'channels', inner));
    tvWire(ctx, root);
    root.querySelector('.web-tv-sub').addEventListener('click', (e) => { e.target.textContent = 'Subscribed!'; e.target.disabled = true; ctx.sound('ding'); });
  }
  function tvUpload(ctx) {
    ctx.title('TubeView - Upload Video');
    const inner = `<div class="web-tv-box web-tv-uploadbox"><div class="web-tv-boxh">Upload a video</div><div class="web-tv-upin">
      <p><b>Step 1:</b> Pick a video from your computer. We accept WMV, AVI and videos of goldfish.</p>
      <p><button type="button" class="web-tv-browse">Browse...</button> <span class="web-tv-file">No file chosen</span></p>
      <p><b>Step 2:</b> Title <input type="text" class="web-tv-utitle" value="my awesome video" maxlength="80"></p>
      <p><button type="button" class="web-tv-go" disabled>Upload Video</button></p>
      <div class="web-tv-uprog" hidden><div class="web-tv-ubar"><i></i></div><span class="web-tv-utext"></span></div></div></div>`;
    const root = ctx.html(tvFrame(ctx, 'videos', inner));
    tvWire(ctx, root);
    let picked = null;
    root.querySelector('.web-tv-browse').addEventListener('click', async () => {
      const p = await A.ui.fileDialog({ mode: 'open', parent: ctx.win, title: 'Choose a video to upload', folder: '/Videos/Sample Videos', exts: ['wmv', 'avi', 'mp4'], filterLabel: 'Video files (*.wmv; *.avi; *.mp4)' });
      if (!p || !ctx.alive()) return;
      picked = p;
      root.querySelector('.web-tv-file').textContent = A.fs.basename(p);
      root.querySelector('.web-tv-go').disabled = false;
    });
    root.querySelector('.web-tv-go').addEventListener('click', (e) => {
      if (!picked) return;
      e.target.disabled = true;
      const box = root.querySelector('.web-tv-uprog'), bar = box.querySelector('i'), txt = box.querySelector('.web-tv-utext');
      box.hidden = false;
      let p = 0;
      const id = ctx.every(120, () => {
        p = Math.min(100, p + (p < 60 ? 3 : p < 95 ? 1 : 0.2));
        bar.style.width = p + '%';
        txt.textContent = p < 100 ? `Uploading ${A.fs.basename(picked)}: ${Math.floor(p)}% (about ${Math.max(1, Math.round((100 - p) * 2.4))} minutes remaining)` : '';
        if (p >= 99.6) {
          clearInterval(id);
          txt.textContent = 'Upload complete!';
          ctx.dialog({ title: 'TubeView', icon: 'icons/upload', instruction: 'Your video is processing', message: '"' + root.querySelector('.web-tv-utitle').value + '" has been uploaded and is now processing. This usually takes 5 to 10 business years. We will send you an e-mail.' });
        }
      });
    });
  }

  function tvRender(ctx) {
    const p = ctx.parts;
    if (!p.length) return tvHome(ctx);
    if (p[0] === 'watch') return tvWatch(ctx);
    if (p[0] === 'results') return tvResults(ctx);
    if (p[0] === 'categories') return tvCategories(ctx);
    if (p[0] === 'user' && p[1]) return tvUser(ctx, p[1]);
    if (p[0] === 'upload') return tvUpload(ctx);
    if (p[0] === 'v' && p[1]) return ctx.go('/watch?v=' + encodeURIComponent(p[1]), { replace: true, noSound: true }) || ctx.html('<div class="web-tv"></div>');
    return ctx.notFound();
  }

  const TV_STAR_ON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23fff3a8'/%3E%3Cstop offset='.5' stop-color='%23ffd62e'/%3E%3Cstop offset='.51' stop-color='%23ffb300'/%3E%3Cstop offset='1' stop-color='%23f08a12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M10 1.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L10 14.6l-5.2 2.9L6 11.6 1.6 7.6l5.9-.7z' fill='url(%23g)' stroke='%23b86a00'/%3E%3C/svg%3E";
  const TV_STAR_OFF = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M10 1.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L10 14.6l-5.2 2.9L6 11.6 1.6 7.6l5.9-.7z' fill='%23e3e3e3' stroke='%23aaa'/%3E%3C/svg%3E";
  W.register({
    id: 'tubeview', host: 'www.tubeview.com', aliases: ['tubeview.com'],
    title: 'TubeView - Watch it. Share it. Bubble it.', shortTitle: 'TubeView', icon: 'icons/video', weight: 1.35,
    pictures: ['images/player_skin.png', 'images/thumb_default.jpg', 'images/upload_btn.gif', 'images/stars.gif', 'images/logo_tv.png'],
    favicon: '<svg viewBox="0 0 16 16"><path d="M5 1.5 L7.6 4.2 M11 1.5 L8.4 4.2" stroke="#555" stroke-width="1.2" stroke-linecap="round"/><rect x=".8" y="4" width="14.4" height="10.5" rx="3" fill="#1a8fe0" stroke="#0b4f9c"/><rect x="2.4" y="5.5" width="11.2" height="7.5" rx="1.6" fill="#dff4ff"/><path d="M6.6 7 L10.4 9.25 L6.6 11.5 Z" fill="#1a8fe0"/><rect x="2.4" y="5.5" width="11.2" height="3" rx="1.4" fill="#fff" opacity=".6"/></svg>',
    pages: () => [{ path: '/', title: 'TubeView - Watch it. Share it. Bubble it.', text: 'TubeView video sharing: featured videos, videos being watched right now, most viewed today, upload your videos, broadcast your bubbles' }]
      .concat(VIDEOS.map((v) => ({ path: '/watch?v=' + v.id, title: 'TubeView - ' + v.title, text: v.desc + ' ' + v.tags + ' From: ' + v.user + '. Category: ' + v.cat + '. Views: ' + K.num(v.views) }))),
    render: tvRender,
    css: `
.web-tv { min-height: 100%; background: #fff; color: #000; font: calc(12px * var(--hz-text, 1))/1.35 Arial, Helvetica, Selawik, sans-serif; }
.web-tv a { color: #0033cc; text-decoration: none; }
.web-tv a:hover { text-decoration: underline; }
.web-tv-wrap { width: 900px; margin: 0 auto; padding-bottom: 20px; }
.web-tv-top { display: flex; justify-content: space-between; align-items: flex-end; padding: 12px 4px 8px; }
.web-tv-logo { display: grid; grid-template-columns: auto auto; grid-template-rows: auto auto; column-gap: 8px; align-items: center; text-decoration: none !important; }
.web-tv-set { grid-row: span 2; position: relative; width: 50px; height: 42px; margin-top: 8px; border-radius: 10px; border: 2px solid #0b4f9c; background: linear-gradient(to bottom, #9fd8ff 0, #2f95e6 50%, #1a74c8 51%, #3aa3ea 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 2px 3px rgba(0,0,0,.25); }
.web-tv-set::before, .web-tv-set::after { content: ""; position: absolute; top: -12px; width: 2px; height: 13px; background: #666; }
.web-tv-set::before { left: 16px; transform: rotate(-25deg); } .web-tv-set::after { right: 16px; transform: rotate(25deg); }
.web-tv-set i { position: absolute; left: 19px; top: 11px; border-style: solid; border-width: 9px 0 9px 14px; border-color: transparent transparent transparent #fff; filter: drop-shadow(0 1px 1px rgba(0,40,90,.5)); }
.web-tv-word { font: 700 2.7em/1 "Arial Black", Arial, sans-serif; color: #333; letter-spacing: -2px; }
.web-tv-word b { background: linear-gradient(to bottom, #6ec2ff 0, #1a7fd9 50%, #0b5fb0 52%, #2b8fe0 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.web-tv-tag { font-size: .95em; color: #666; }
.web-tv-links { font-size: .95em; color: #666; padding-bottom: 6px; }
.web-tv-bar { display: flex; align-items: flex-end; gap: 12px; border-bottom: 3px solid #1a74c8; }
.web-tv-tabs { display: flex; gap: 3px; }
.web-tv-tabs a { padding: 6px 16px; font-weight: 700; font-size: 1.1em; color: #fff !important; border-radius: 6px 6px 0 0; background: linear-gradient(to bottom, #8cc8f2, #4b9ee0); text-decoration: none !important; }
.web-tv-tabs a.on, .web-tv-tabs a:hover { background: linear-gradient(to bottom, #3a9aea, #1a74c8); }
.web-tv-search { flex: 1; display: flex; gap: 4px; padding-bottom: 5px; justify-content: flex-end; }
.web-tv-search input { width: 240px; padding: 3px 5px; font: inherit; border: 1px solid #7f9db9; }
.web-tv-search button, .web-tv-cform button, .web-tv-sub, .web-tv-browse, .web-tv-go { font: inherit; font-weight: 700; padding: 3px 10px; border: 1px solid #8aa0b8; border-radius: 3px; cursor: pointer; background: linear-gradient(#fff, #dde6ee); color: #222; }
.web-tv-upload { margin-bottom: 5px; padding: 5px 16px; font-weight: 700; font-size: 1.1em; color: #3a2a00 !important; border: 1px solid #c79200; border-radius: 4px; text-decoration: none !important; background: linear-gradient(to bottom, #fff3a8 0, #ffd84a 50%, #f5b400 51%, #ffcf3a 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.8); }
.web-tv-upload:hover { filter: brightness(1.06); }
.web-tv-now { margin: 12px 0; border: 1px solid #b8cfe0; border-radius: 6px; overflow: hidden; background: #f4f9fd; }
.web-tv-nowh { padding: 5px 8px; font-weight: 700; color: #333; background: linear-gradient(#f2f7fb, #dde9f3); border-bottom: 1px solid #b8cfe0; }
.web-tv-nowstrip { display: flex; gap: 4px; padding: 8px; transition: transform .8s ease; }
.web-tv-nowv { flex: none; width: 120px; height: 90px; border: 1px solid #999; }
.web-tv-nowv img { width: 100%; height: 100%; display: block; }
.web-tv-cols { display: grid; grid-template-columns: 1fr 290px; gap: 14px; }
.web-tv-box { border: 1px solid #b8cfe0; border-radius: 6px; margin-bottom: 12px; overflow: hidden; background: #fff; }
.web-tv-boxh { padding: 5px 8px; font-weight: 700; font-size: 1.05em; color: #333; background: linear-gradient(#f2f7fb, #dde9f3); border-bottom: 1px solid #b8cfe0; }
.web-tv-row { display: flex; gap: 12px; padding: 10px; border-bottom: 1px solid #e5eef5; }
.web-tv-thumb { position: relative; flex: none; display: block; width: 130px; height: 97px; border: 1px solid #999; padding: 2px; background: #fff; }
.web-tv-thumb img { width: 100%; height: 100%; display: block; background: #000; }
.web-tv-thumb > span { position: absolute; right: 4px; bottom: 4px; padding: 0 4px; font-size: .9em; font-weight: 700; color: #fff; background: rgba(0,0,0,.75); border-radius: 2px; }
.web-tv-thumb.sm { width: 96px; height: 72px; }
.web-tv-rowtext { flex: 1; min-width: 0; display: grid; grid-template-columns: 1fr 160px; column-gap: 12px; }
.web-tv-vtitle { grid-column: 1 / -1; font-weight: 700; font-size: 1.15em; }
.web-tv-rowtext p { margin: 3px 0; color: #333; }
.web-tv-meta { grid-column: 2; grid-row: 2 / 4; color: #666; font-size: .95em; }
.web-tv-rate { color: #666; font-size: .92em; }
.web-tv-promo { padding: 10px; background: #fffbe6; border-color: #e7d98a; text-align: center; }
.web-tv-promo p { margin: 4px 0 0; }
.web-tv-small { display: flex; gap: 8px; padding: 6px 8px; border-bottom: 1px solid #e5eef5; color: #333 !important; text-decoration: none !important; }
.web-tv-small:hover { background: #f4f9fd; }
.web-tv-smalltext { min-width: 0; }
.web-tv-smalltext b { display: block; color: #0033cc; font-size: .95em; }
.web-tv-smalltext small { color: #777; }
.web-tv-most { margin: 6px 0; padding-left: 28px; }
.web-tv-most li { margin: 4px 0; }
.web-tv-most small { color: #777; }
.web-tv-ad a { display: flex; align-items: center; gap: 8px; padding: 8px; background: linear-gradient(#fffbe0, #ffe98a); text-decoration: none !important; color: #5a3a00 !important; }
.web-tv-adlabel { font-size: .8em; color: #999; padding: 2px 6px; }
.web-tv-title { font: 700 1.5em Arial, sans-serif; margin: 14px 0 8px; }
.web-tv-watch { display: grid; grid-template-columns: 490px 1fr; gap: 16px; }
.web-tv-player { position: relative; width: 482px; background: #000; border: 1px solid #000; outline: none; user-select: none; }
.web-tv-player:focus-visible { box-shadow: 0 0 0 2px #3a8ee6; }
.web-tv-screen { position: relative; width: 480px; height: 360px; background: #000; cursor: pointer; overflow: hidden; }
.web-tv-canvas { display: block; }
.web-tv-over { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
.web-tv-over > * { pointer-events: auto; }
.web-tv-big { position: relative; width: 72px; height: 72px; border-radius: 50%; border: 2px solid rgba(255,255,255,.85); cursor: pointer; background: radial-gradient(circle at 50% 115%, #bff4ff, #2f9be8 45%, #0b3d7e); box-shadow: 0 4px 14px rgba(0,0,0,.5), inset 0 -4px 8px rgba(160,240,255,.6); }
.web-tv-big::before { content: ""; position: absolute; left: 16%; right: 16%; top: 4%; height: 46%; border-radius: 50%; background: linear-gradient(rgba(255,255,255,.9), rgba(255,255,255,.1)); }
.web-tv-big i { position: absolute; left: 27px; top: 20px; border-style: solid; border-width: 16px 0 16px 25px; border-color: transparent transparent transparent #fff; filter: drop-shadow(0 2px 2px rgba(0,30,70,.5)); }
.web-tv-big:hover { filter: brightness(1.1); }
.web-tv-buf { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #fff; font-weight: 700; text-shadow: 0 1px 2px #000; }
.web-tv-buf span { width: 34px; height: 34px; border-radius: 50%; border: 4px solid rgba(255,255,255,.2); border-top-color: #6ec2ff; border-right-color: #9ff08a; animation: web-tv-spin .8s linear infinite; }
@keyframes web-tv-spin { to { transform: rotate(360deg); } }
.web-tv-endscr { position: absolute; inset: 0; padding: 18px; background: rgba(0,0,0,.78); display: flex; flex-direction: column; gap: 12px; align-items: center; justify-content: center; }
.web-tv-endrow { display: flex; gap: 10px; }
.web-tv-endrow button { font: 700 1em Arial, sans-serif; padding: 6px 16px; border-radius: 4px; border: 1px solid #fff; background: linear-gradient(#5aaeea, #1a6fc0); color: #fff; cursor: pointer; }
.web-tv-endgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.web-tv-endv { display: flex; gap: 6px; align-items: center; width: 200px; padding: 4px; text-align: left; border: 1px solid #666; background: #111; color: #fff; cursor: pointer; font: .85em Arial, sans-serif; }
.web-tv-endv:hover { border-color: #6ec2ff; }
.web-tv-endv img { width: 64px; height: 48px; flex: none; }
.web-tv-ctrl { display: flex; align-items: center; gap: 6px; height: 28px; padding: 0 6px; color: #eee; background: linear-gradient(to bottom, #5a5a5a 0, #2e2e2e 50%, #1a1a1a 51%, #2a2a2a 100%); border-top: 1px solid #777; font: 11px Arial, sans-serif; }
.web-tv-ctrl button { position: relative; flex: none; width: 24px; height: 20px; padding: 0; border: 1px solid #111; border-radius: 3px; cursor: pointer; background: linear-gradient(#6a6a6a, #333 50%, #222 51%, #3a3a3a); }
.web-tv-ctrl button:hover { background: linear-gradient(#7fb8f0, #2f7fd0 50%, #1a5fb0 51%, #3a8ee6); }
.web-tv-pp i { position: absolute; left: 8px; top: 4px; border-style: solid; border-width: 5.5px 0 5.5px 8px; border-color: transparent transparent transparent #fff; }
.web-tv-player.playing .web-tv-pp i { left: 7px; top: 5px; width: 8px; height: 9px; border: 0; border-left: 3px solid #fff; border-right: 3px solid #fff; }
.web-tv-seek { position: relative; flex: 1; height: 8px; border-radius: 4px; background: #111; border: 1px solid #555; cursor: pointer; }
.web-tv-loaded { position: absolute; left: 0; top: 0; bottom: 0; background: #666; border-radius: 4px; }
.web-tv-played { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: linear-gradient(#9fd8ff, #1a7fd9); }
.web-tv-knob { position: absolute; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff, #cfd8e2 60%, #8a98a8); border: 1px solid #222; }
.web-tv-time { flex: none; min-width: 72px; text-align: center; }
.web-tv-vol i { position: absolute; left: 5px; top: 5px; width: 5px; height: 8px; background: #fff; }
.web-tv-vol i::after { content: ""; position: absolute; left: 3px; top: -3px; border-style: solid; border-width: 7px 7px 7px 0; border-color: transparent #fff transparent transparent; }
.web-tv-player.muted .web-tv-vol { background: linear-gradient(#b85a5a, #7a2222 50%, #5a1a1a 51%, #8a3030); }
.web-tv-volr { width: 56px; accent-color: #3a8ee6; }
.web-tv-fs i { position: absolute; left: 5px; top: 4px; width: 12px; height: 10px; border: 2px solid #fff; border-radius: 1px; }
.web-tv-full { flex: 1; display: flex; flex-direction: column; width: auto; border: 0; }
.web-tv-full .web-tv-screen { flex: 1; width: auto; height: auto; }
.web-tv-ratebar { display: flex; justify-content: space-between; align-items: center; margin: 8px 0 4px; padding: 6px 8px; border: 1px solid #b8cfe0; border-radius: 6px; background: #f4f9fd; }
.web-tv-rateme { display: flex; align-items: center; gap: 8px; }
.web-tv-ratelabel { font-weight: 700; min-width: 110px; }
.web-tv-stars { display: inline-flex; gap: 2px; }
.web-tv-stars button { width: 20px; height: 20px; padding: 0; border: 0; cursor: pointer; background: url("${TV_STAR_OFF}") center / contain no-repeat; }
.web-tv-stars button.on { background-image: url("${TV_STAR_ON}"); }
.web-tv-ratecount { color: #666; }
.web-tv-views b { font-size: 1.2em; }
.web-tv-actions { display: flex; gap: 16px; padding: 6px 8px; margin-bottom: 10px; font-weight: 700; }
.web-tv-cwrap { padding: 8px; }
.web-tv-cform { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.web-tv-cform textarea { width: 100%; min-height: 50px; resize: vertical; font: inherit; padding: 4px; border: 1px solid #7f9db9; }
.web-tv-cform button { align-self: flex-start; }
.web-tv-cmsg { color: #080; font-weight: 700; }
.web-tv-c { display: flex; gap: 8px; padding: 7px 0; border-top: 1px solid #e5eef5; }
.web-tv-c.spam { color: #999; font-style: italic; }
.web-tv-cpic { width: 36px; height: 36px; flex: none; object-fit: contain; }
.web-tv-chead span { color: #777; font-size: .92em; }
.web-tv-c p { margin: 2px 0; }
.web-tv-cacts { font-size: .9em; }
.web-tv-cacts a { margin-right: 8px; color: #777 !important; }
.web-tv-about { padding: 8px; }
.web-tv-uprow { display: flex; gap: 10px; align-items: center; }
.web-tv-upic { width: 48px; height: 48px; border: 1px solid #ccc; padding: 2px; }
.web-tv-sub { margin-top: 4px; background: linear-gradient(#fff3a8, #ffd84a 50%, #f5b400 51%, #ffcf3a) !important; border-color: #c79200 !important; }
.web-tv-sub:disabled { filter: grayscale(.6); cursor: default; }
.web-tv-small2 { font-size: .92em; color: #555; margin: 6px 0; }
.web-tv-field { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-weight: 700; color: #555; }
.web-tv-field input { flex: 1; min-width: 0; font: .92em Arial, sans-serif; padding: 2px 4px; border: 1px solid #aaa; background: #f7f7f7; }
.web-tv-related { max-height: 520px; overflow: auto; }
.web-tv-gone { padding-bottom: 10px; }
.web-tv-gone p { padding: 0 10px; }
.web-tv-gonegrid { display: grid; grid-template-columns: 1fr 1fr; }
.web-tv-count { float: right; font-weight: 400; color: #666; }
.web-tv-none { padding: 14px; color: #666; }
.web-tv-tagc { padding: 8px; }
.web-tv-cats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 12px; }
.web-tv-cats a { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px; border: 1px solid #d6e4ef; border-radius: 8px; background: linear-gradient(#fff, #f0f6fb); font-weight: 700; }
.web-tv-cats a:hover { border-color: #3a8ee6; text-decoration: none !important; }
.web-tv-cats img { width: 48px; height: 48px; }
.web-tv-channel { margin-top: 12px; }
.web-tv-chbox { display: flex; gap: 14px; padding: 12px; align-items: center; }
.web-tv-chpic { width: 88px; height: 88px; border: 1px solid #ccc; padding: 3px; }
.web-tv-chbox h2 { margin: 0 0 4px; }
.web-tv-uploadbox { margin-top: 12px; }
.web-tv-upin { padding: 12px; }
.web-tv-utitle { width: 260px; font: inherit; padding: 2px 4px; }
.web-tv-go:disabled { opacity: .5; cursor: default; }
.web-tv-ubar { height: 16px; border: 1px solid #7f9db9; background: #fff; margin-bottom: 6px; }
.web-tv-ubar i { display: block; height: 100%; width: 0; background: repeating-linear-gradient(to right, #35c43a 0 8px, #2aa52a 8px 10px); transition: width .2s; }
.web-tv-foot { margin-top: 10px; padding-top: 10px; border-top: 1px solid #b8cfe0; text-align: center; color: #777; font-size: .92em; }
.web-tv-foot div { margin-top: 6px; }
`,
  });

  // ================================================================ www.skycast.com
  const SC_CITIES = ['Springfield', 'Aerium City', 'Crystal Bay', 'Glass Harbor', 'Sunnyvale Heights', 'Bubbleton', 'Maple Falls', 'Seaside Heights', 'Reykjavik', 'Tokyo'];
  function scIcon(d, cls) {
    return `<span class="web-sc-ic ${cls || ''}">${K.img(d.icon, 'a')}${d.icon2 ? K.img(d.icon2, 'b') : ''}</span>`;
  }
  function scRadar(ctx, holder, city, big) {
    const Wd = big ? 700 : 430, Ht = big ? 420 : 250, cell = 5;
    const cv = ctx.canvas(Wd, Ht, 'web-sc-cv');
    holder.innerHTML = `<div class="web-sc-radarbox"><div class="web-sc-screen"></div><div class="web-sc-rctrl"><button type="button" class="web-sc-rplay" aria-label="Pause">Pause</button><span class="web-sc-rtime"></span><span class="web-sc-legend"><i style="background:#43c43f"></i>Light<i style="background:#e8d83a"></i><i style="background:#f39a1f"></i><i style="background:#e0352a"></i>Heavy</span></div></div>`;
    holder.querySelector('.web-sc-screen').appendChild(cv.c);
    const r = A.util.seeded(K.hash(city.toLowerCase()) + 17);
    const cols = Math.ceil(Wd / cell), rows = Math.ceil(Ht / cell);
    const waves = Array.from({ length: 6 }, () => [r() * 6.28, r() * 6.28, 0.006 + r() * 0.014, 0.006 + r() * 0.014]);
    const base = document.createElement('canvas');
    base.width = Wd; base.height = Ht;
    const bg = base.getContext('2d');
    const tilt = r() * 1.6 - 0.8;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let v = 0;
      waves.forEach(([a, b, fx, fy]) => { v += Math.sin(x * cell * fx + a) * Math.cos(y * cell * fy + b); });
      v += (x / cols - 0.35) * 2.2 * tilt + 0.5;
      const landish = v > -0.35;
      bg.fillStyle = landish ? (v > 1.2 ? '#7fae5c' : v > 0.4 ? '#8fbd69' : '#a3c97a') : v > -0.7 ? '#79b3de' : '#5f9fd2';
      bg.fillRect(x * cell, y * cell, cell, cell);
    }
    bg.strokeStyle = 'rgba(60,70,50,.25)'; bg.lineWidth = 1;
    for (let x = 0; x < Wd; x += 70) { bg.beginPath(); bg.moveTo(x + 0.5, 0); bg.lineTo(x + 0.5, Ht); bg.stroke(); }
    for (let y = 0; y < Ht; y += 60) { bg.beginPath(); bg.moveTo(0, y + 0.5); bg.lineTo(Wd, y + 0.5); bg.stroke(); }
    bg.strokeStyle = 'rgba(200,60,40,.55)'; bg.lineWidth = 2;
    for (let i = 0; i < 3; i++) { bg.beginPath(); bg.moveTo(0, r() * Ht); bg.bezierCurveTo(Wd * 0.3, r() * Ht, Wd * 0.6, r() * Ht, Wd, r() * Ht); bg.stroke(); }
    const others = Array.from({ length: 4 }, (_, i) => ({ x: 40 + r() * (Wd - 80), y: 30 + r() * (Ht - 60), name: SC_CITIES[(K.hash(city) + i + 1) % SC_CITIES.length] })).filter((o) => o.name.toLowerCase() !== city.toLowerCase());
    const wx = K.weather(city);
    const wet = wx.days[0].pop / 100;
    const storms = Array.from({ length: 6 }, () => ({ x: r() * Wd, y: r() * Ht, vx: 14 + r() * 18, vy: -4 + r() * 8, rad: (big ? 50 : 34) + r() * 40, k: 0.4 + r() * 0.5 + wet * 0.5 }));
    let playing = true, t = 0, lastFrame = -1;
    const frames = 8;
    const btn = holder.querySelector('.web-sc-rplay'), label = holder.querySelector('.web-sc-rtime');
    btn.addEventListener('click', () => { playing = !playing; btn.textContent = playing ? 'Pause' : 'Play'; btn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); });
    const now = new Date();
    function render(frame) {
      const g = cv.g;
      g.drawImage(base, 0, 0, Wd, Ht);
      const tt = frame * 0.9;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const px = x * cell + cell / 2, py = y * cell + cell / 2;
        let v = 0;
        storms.forEach((s) => {
          const sx = ((s.x + s.vx * tt) % (Wd + 200) + Wd + 200) % (Wd + 200) - 100, sy = s.y + s.vy * tt;
          const dx = px - sx, dy = (py - sy) * 1.3;
          v += s.k * Math.exp(-(dx * dx + dy * dy) / (s.rad * s.rad));
        });
        if (v < 0.28) continue;
        g.fillStyle = v < 0.5 ? 'rgba(60,196,60,.72)' : v < 0.7 ? 'rgba(232,216,58,.78)' : v < 0.9 ? 'rgba(243,154,31,.82)' : 'rgba(224,53,42,.85)';
        g.fillRect(x * cell, y * cell, cell, cell);
      }
      g.font = 'bold 11px Arial, sans-serif';
      others.forEach((o) => { g.fillStyle = '#333'; g.fillRect(o.x - 2, o.y - 2, 4, 4); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(o.name, o.x + 5, o.y + 4); });
      const cx = Wd / 2, cy = Ht / 2;
      g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill(); g.stroke();
      g.font = 'bold 13px Arial, sans-serif'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(wx.city, cx + 9, cy + 5); g.fillStyle = '#fff'; g.fillText(wx.city, cx + 9, cy + 5);
      const stamp = new Date(now.getTime() - (frames - 1 - frame) * 15 * 60000);
      label.textContent = (frame === frames - 1 ? 'Now: ' : '') + A.util.fmtTime(stamp);
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(Wd - 118, 6, 112, 20);
      g.fillStyle = '#fff'; g.font = 'bold 12px Arial, sans-serif'; g.fillText('SkyCast Radar', Wd - 110, 20);
    }
    ctx.loop((dt) => {
      if (playing) t += dt;
      const cycle = t % (frames * 0.5 + 1.2);
      const frame = Math.min(frames - 1, Math.floor(cycle / 0.5));
      if (frame !== lastFrame) { lastFrame = frame; render(frame); }
    });
    render(0);
  }
  function scFrame(ctx, inner, city) {
    const units = ctx.store.get('skycast.units', 'F');
    return `<div class="web-sc"><div class="web-sc-sky"><div class="web-sc-wrap web-sc-head">
      <a class="web-sc-logo" href="http://www.skycast.com/">${K.reflect(`<span class="web-sc-logoic">${K.img('icons/sun', 'a')}${K.img('icons/cloud', 'b')}</span><span class="web-sc-word">SkyCast</span>`, 'web-sc-refl')}<span class="web-sc-tag">Your weather, crystal clear</span></a>
      <form class="web-sc-form" action="/forecast"><input name="city" type="text" placeholder="Enter city or ZIP" value="${esc(city || '')}" autocomplete="off" aria-label="City"><button type="submit" class="wk-gbtn web-sc-go">Get forecast</button></form>
      <div class="web-sc-units"><a href="#" data-u="F" class="${units === 'F' ? 'on' : ''}">&deg;F</a><a href="#" data-u="C" class="${units === 'C' ? 'on' : ''}">&deg;C</a></div>
    </div><div class="web-sc-nav"><div class="web-sc-wrap"><a href="/forecast?city=${encodeURIComponent(city || 'Springfield')}">Local forecast</a><a href="/radar?city=${encodeURIComponent(city || 'Springfield')}">Radar</a><a href="#travel">Travel</a><a href="#" class="web-sc-joke" data-j="pollen">Pollen</a><a href="#" class="web-sc-joke" data-j="toolbar">Weather on your desktop</a></div></div></div>
      <div class="web-sc-wrap">${inner}<div class="web-sc-foot">&copy; 2007 SkyCast. Forecasts are seeded by city name and are 100% pretend, 0% chance of being wrong. <a href="http://home.aerium.net/news/weekend">Weekend outlook</a></div></div></div>`;
  }
  function scWire(ctx, root) {
    root.querySelectorAll('[data-u]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); ctx.store.set('skycast.units', a.dataset.u); ctx.reload(); }));
    root.querySelectorAll('.web-sc-joke').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      if (a.dataset.j === 'toolbar') ctx.dialog({ title: 'SkyCast', icon: 'icons/cloud', instruction: 'WeatherPal Buddy is already installed', message: 'Good news: the WeatherPal Buddy toolbar is already installed in your browser. It has always been installed. Nobody remembers installing it. (Check Tools > Manage Add-ons.)' });
      else ctx.dialog({ title: 'SkyCast', icon: 'icons/flower', instruction: 'Pollen: Low', message: 'Tree pollen: low. Grass pollen: low. Bubble pollen: surprisingly high. Enjoy the outdoors!' });
    }));
  }
  function scForecast(ctx, cityIn) {
    const city = K.titleCase(cityIn || 'Springfield') || 'Springfield';
    if (ctx.q('city')) ctx.store.set('skycast.city', city);
    const wx = K.weather(city);
    const C = ctx.store.get('skycast.units', 'F') === 'C';
    const T = (f) => (C ? K.toC(f) : f) + '&deg;';
    ctx.title('SkyCast - ' + wx.city + ' weather forecast');
    const d0 = wx.days[0];
    const tonight = `Tonight: ${wx.now.cond === 'showers' ? 'Scattered showers ending by midnight' : wx.now.cond === 'snow' ? 'Light flurries' : 'Mostly clear skies'} with a low around ${T(d0.lo)}. ${wx.now.wind > 12 ? 'Breezy' : 'Light winds'} from the ${wx.now.windDir}.`;
    const travel = SC_CITIES.filter((c) => c.toLowerCase() !== wx.city.toLowerCase()).slice(0, 7).map((c) => { const w = K.weather(c); return `<li><a href="/forecast?city=${encodeURIComponent(c)}">${K.img(w.days[0].icon, 'web-sc-tic')}<span>${esc(c)}</span><b>${T(w.days[0].hi)}</b><small>${T(w.days[0].lo)}</small></a></li>`; }).join('');
    const bub = ['Low', 'Moderate', 'High', 'Very high', 'Extreme'].indexOf(wx.now.bubbles);
    const inner = `<div class="web-sc-grid"><div class="web-sc-main">
      <div class="web-sc-now ${wx.night ? 'night' : ''}"><div class="web-sc-nowtop"><h1>${esc(wx.city)}, ${wx.region}</h1><span>Updated ${A.util.fmtTime(new Date())}</span></div>
        <div class="web-sc-nowbody">${scIcon({ icon: wx.now.icon, icon2: wx.now.icon2 }, 'big')}<div class="web-sc-temp">${T(wx.now.temp)}<small>${esc(wx.now.label)}</small></div>
          <dl class="web-sc-details"><dt>Feels like</dt><dd>${T(wx.now.feels)}</dd><dt>Humidity</dt><dd>${wx.now.humidity}%</dd><dt>Wind</dt><dd>${wx.now.windDir} ${C ? Math.round(wx.now.wind * 1.6) + ' km/h' : wx.now.wind + ' mph'}</dd><dt>Pressure</dt><dd>${wx.now.pressure} in</dd><dt>Visibility</dt><dd>${wx.now.visibility} mi</dd><dt>UV index</dt><dd>${wx.now.uv} ${wx.now.uv > 6 ? 'High' : wx.now.uv > 3 ? 'Moderate' : 'Low'}</dd><dt>Sunrise</dt><dd>${wx.sunrise}</dd><dt>Sunset</dt><dd>${wx.sunset}</dd></dl></div>
        <p class="web-sc-tonight">${tonight}</p></div>
      <h2 class="web-sc-h2">5-day forecast</h2>
      <div class="web-sc-days">${wx.days.map((d) => `<div class="web-sc-day"><b>${d.name}</b><small>${A.util.MONTHS[d.date.getMonth()].slice(0, 3)} ${d.date.getDate()}</small>${scIcon(d)}<span class="web-sc-cond">${esc(d.label)}</span><span class="web-sc-hilo"><b>${T(d.hi)}</b> ${T(d.lo)}</span><span class="web-sc-pop">${d.pop}% chance of ${d.cond === 'snow' ? 'snow' : 'rain'}</span></div>`).join('')}</div>
      <h2 class="web-sc-h2">Radar <a href="/radar?city=${encodeURIComponent(wx.city)}" class="web-sc-more">Larger map &raquo;</a></h2><div class="web-sc-radarhold"></div>
    </div><div class="web-sc-side">
      <div class="web-sc-box"><div class="web-sc-boxh">Weather alerts</div><p class="web-sc-ok">${K.img('icons/check', 'web-sc-okic')} No alerts for ${esc(wx.city)}. Enjoy the ${wx.night ? 'quiet night' : 'day'}!</p></div>
      <div class="web-sc-box"><div class="web-sc-boxh">Bubble index</div><div class="web-sc-meter"><i style="width:${(bub + 1) * 20}%"></i></div><p><b>${esc(wx.now.bubbles)}</b>. ${bub >= 2 ? 'An excellent day for blowing bubbles outside.' : 'Bubbles may pop a little sooner than usual today.'}</p></div>
      <div class="web-sc-box" id="travel"><div class="web-sc-boxh">Travel forecast</div><ul class="web-sc-travel">${travel}</ul></div>
      <div class="web-sc-box web-sc-ad"><div class="web-sc-adlabel">Advertisement</div><a href="#" class="web-sc-joke" data-j="toolbar">${K.img('icons/cloud', 'web-sc-adic')}<b>Get SkyCast on your desktop!</b><span>Install the WeatherPal Buddy toolbar. Free!*</span><small>*Already installed.</small></a></div>
    </div></div>`;
    const root = ctx.html(scFrame(ctx, inner, wx.city));
    scWire(ctx, root);
    scRadar(ctx, root.querySelector('.web-sc-radarhold'), wx.city, false);
  }
  function scRadarPage(ctx) {
    const city = K.titleCase(ctx.q('city') || ctx.store.get('skycast.city', 'Springfield'));
    ctx.title('SkyCast Radar - ' + city);
    const root = ctx.html(scFrame(ctx, `<h1 class="web-sc-h1">Doppler radar: ${esc(city)}</h1><div class="web-sc-radarhold big"></div><p class="web-sc-note">Radar images update every 15 minutes. Colors show how hard it is raining: green is a drizzle, red means stay inside and watch TubeView.</p>`, city));
    scWire(ctx, root);
    scRadar(ctx, root.querySelector('.web-sc-radarhold'), city, true);
  }
  W.register({
    id: 'skycast', host: 'www.skycast.com', aliases: ['skycast.com', 'weather.skycast.com'],
    title: 'SkyCast Weather', shortTitle: 'SkyCast', icon: 'icons/sun',
    pictures: ['images/sky_header.jpg', 'images/radar_base.gif', 'images/forecast_card.png', 'images/icons_weather.png'],
    favicon: '<svg viewBox="0 0 16 16"><circle cx="6" cy="6" r="4" fill="#ffd62e" stroke="#e0a000"/><path d="M4 13.5 H13 A2.5 2.5 0 0 0 12.6 8.6 A3.4 3.4 0 0 0 6.2 9.5 A2 2 0 0 0 4 13.5 Z" fill="#fff" stroke="#6f9cc4"/></svg>',
    pages: () => [{ path: '/', title: 'SkyCast Weather - local forecast', text: 'SkyCast weather: current conditions, 5-day forecast, doppler radar, travel forecast, bubble index, pollen. Your weather, crystal clear.' }]
      .concat(SC_CITIES.slice(0, 6).map((c) => ({ path: '/forecast?city=' + encodeURIComponent(c), title: 'SkyCast - ' + c + ' weather forecast', text: c + ' weather forecast today tonight 5-day radar temperature rain sunny cloudy' }))),
    render(ctx) {
      const p = ctx.parts;
      if (!p.length || p[0] === 'forecast') return scForecast(ctx, ctx.q('city') || ctx.store.get('skycast.city', 'Springfield'));
      if (p[0] === 'radar') return scRadarPage(ctx);
      return ctx.notFound();
    },
    css: `
.web-sc { min-height: 100%; background: #eef6fd; color: #1b2f45; font: calc(12px * var(--hz-text, 1))/1.45 "Trebuchet MS", Verdana, sans-serif; }
.web-sc a { color: #0a60b8; text-decoration: none; }
.web-sc a:hover { text-decoration: underline; }
.web-sc-wrap { width: 960px; margin: 0 auto; }
.web-sc-sky { position: relative; background: radial-gradient(ellipse 220px 90px at 18% 30%, rgba(255,255,255,.7), transparent 70%), radial-gradient(ellipse 260px 80px at 72% 40%, rgba(255,255,255,.55), transparent 70%), radial-gradient(circle at 88% 10%, rgba(255,246,190,.9), transparent 22%), linear-gradient(to bottom, #1f8fe6, #6dc0fb 75%, #9fd6fb); border-bottom: 1px solid #3a86c8; }
.web-sc-head { display: flex; align-items: center; gap: 24px; padding: 16px 0 26px; }
.web-sc-logo { display: flex; flex-direction: column; text-decoration: none !important; }
.web-sc-refl { display: inline-flex; align-items: center; gap: 8px; }
.web-sc-refl > .wk-refl-copy { display: flex; align-items: center; gap: 8px; }
.web-sc-logoic { position: relative; width: 58px; height: 50px; }
.web-sc-logoic .a { position: absolute; left: 0; top: 0; width: 44px; height: 44px; }
.web-sc-logoic .b { position: absolute; right: 0; bottom: 0; width: 40px; height: 40px; }
.web-sc-word { font: 700 2.8em/1 "Trebuchet MS", Verdana, sans-serif; color: #fff; text-shadow: 0 2px 4px rgba(0,50,110,.45); letter-spacing: -1px; }
.web-sc-tag { color: #eaf6ff; font-style: italic; margin-top: 14px; text-shadow: 0 1px 2px rgba(0,40,90,.4); }
.web-sc-form { flex: 1; display: flex; gap: 8px; justify-content: flex-end; }
.web-sc-form input { width: 250px; height: 30px; padding: 0 12px; font: 1.1em "Trebuchet MS", sans-serif; border: 1px solid #2f78b8; border-radius: 15px; box-shadow: inset 0 2px 3px rgba(0,40,90,.2); outline: none; }
.web-sc-go { --c1: #fff3a8; --c2: #ffc21a; --c3: #e08a00; color: #4a2a00 !important; text-shadow: 0 1px 0 rgba(255,255,255,.6); }
.web-sc-units { display: flex; border: 1px solid #2f78b8; border-radius: 12px; overflow: hidden; background: rgba(255,255,255,.35); }
.web-sc-units a { padding: 3px 10px; color: #fff !important; font-weight: 700; text-decoration: none !important; }
.web-sc-units a.on { background: linear-gradient(#fff, #d6ecff); color: #0a4f8f !important; }
.web-sc-nav { background: rgba(10,60,120,.35); border-top: 1px solid rgba(255,255,255,.4); }
.web-sc-nav a { display: inline-block; padding: 6px 14px; color: #fff !important; font-weight: 700; }
.web-sc-nav a:hover { background: rgba(255,255,255,.2); text-decoration: none !important; }
.web-sc-grid { display: grid; grid-template-columns: 1fr 280px; gap: 18px; padding-top: 16px; }
.web-sc-now { border-radius: 14px; padding: 14px 18px; color: #0d2a4a; background: linear-gradient(to bottom, rgba(255,255,255,.95), rgba(214,236,252,.95)); border: 1px solid #9cc6ea; box-shadow: 0 4px 14px rgba(0,60,120,.15), inset 0 1px 0 #fff; }
.web-sc-now.night { background: linear-gradient(to bottom, #1c3f78, #0d2350); color: #eaf5ff; border-color: #0a2a5a; }
.web-sc-nowtop { display: flex; justify-content: space-between; align-items: baseline; }
.web-sc-nowtop h1 { margin: 0; font: 400 1.9em/1.2 Selawik, "Segoe UI", "Trebuchet MS", sans-serif; }
.web-sc-nowtop span { opacity: .75; }
.web-sc-nowbody { display: flex; align-items: center; gap: 20px; margin: 8px 0; }
.web-sc-ic { position: relative; display: inline-block; width: 60px; height: 60px; flex: none; }
.web-sc-ic img.a { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.web-sc-ic img.b { position: absolute; left: 30%; top: 36%; width: 76%; height: 76%; }
.web-sc-ic.big { width: 110px; height: 110px; filter: drop-shadow(0 6px 8px rgba(0,40,90,.25)); }
.web-sc-temp { font: 300 4.4em/1 Selawik, "Segoe UI", sans-serif; display: flex; flex-direction: column; }
.web-sc-temp small { font-size: .26em; font-weight: 600; margin-top: 6px; }
.web-sc-details { flex: 1; display: grid; grid-template-columns: auto auto auto auto; gap: 3px 10px; margin: 0; font-size: .95em; }
.web-sc-details dt { opacity: .7; }
.web-sc-details dd { margin: 0; font-weight: 700; }
.web-sc-tonight { margin: 6px 0 0; padding-top: 8px; border-top: 1px solid rgba(100,150,200,.3); }
.web-sc-h2 { font: 400 1.4em Selawik, "Segoe UI", sans-serif; color: #0d3f78; margin: 20px 0 10px; }
.web-sc-more { font-size: .65em; margin-left: 10px; }
.web-sc-days { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.web-sc-day { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 6px 12px; text-align: center; border-radius: 12px; border: 1px solid #8fbde6; overflow: hidden; background: linear-gradient(to bottom, #ffffff 0, #eaf5fe 48%, #cfe6fa 50%, #e3f1fd 100%); box-shadow: 0 3px 8px rgba(0,60,120,.15), inset 0 1px 0 #fff; -webkit-box-reflect: below 3px linear-gradient(transparent 70%, rgba(255,255,255,.28)); }
.web-sc-day > b { font-size: 1.1em; color: #0d3f78; }
.web-sc-day > small { color: #5a7a9a; }
.web-sc-day .web-sc-ic { width: 58px; height: 58px; margin: 4px 0; }
.web-sc-cond { font-size: .92em; color: #33506d; min-height: 2.6em; }
.web-sc-hilo { font-size: 1.1em; color: #5a7a9a; }
.web-sc-hilo b { color: #c2410c; font-size: 1.15em; }
.web-sc-pop { font-size: .85em; color: #2f78b8; }
.web-sc-radarbox { display: inline-block; border: 1px solid #5f8fb8; border-radius: 8px; overflow: hidden; background: #0d2a4a; box-shadow: 0 3px 10px rgba(0,40,90,.25); margin-top: 22px; }
.web-sc-screen { line-height: 0; }
.web-sc-rctrl { display: flex; align-items: center; gap: 10px; padding: 5px 8px; color: #dbeeff; font-size: .92em; background: linear-gradient(#26476f, #102b4d); }
.web-sc-rplay { font: 700 1em "Trebuchet MS", sans-serif; padding: 2px 10px; border: 1px solid #0a1a30; border-radius: 10px; color: #fff; cursor: pointer; background: linear-gradient(#5aaeea, #1a6fc0); }
.web-sc-rtime { font-weight: 700; min-width: 90px; }
.web-sc-legend { margin-left: auto; display: flex; align-items: center; gap: 3px; }
.web-sc-legend i { display: inline-block; width: 14px; height: 10px; }
.web-sc-radarhold.big .web-sc-radarbox { margin-top: 6px; }
.web-sc-box { background: #fff; border: 1px solid #b6d3ec; border-radius: 10px; margin-bottom: 14px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,60,120,.08); }
.web-sc-box > p { margin: 8px 10px; }
.web-sc-boxh { padding: 6px 10px; font-weight: 700; color: #fff; background: linear-gradient(to bottom, #5fb2ee 0, #2f8fe0 50%, #1f7ad0 51%, #3a95e4 100%); text-shadow: 0 1px 1px rgba(0,40,90,.5); }
.web-sc-ok { display: flex; align-items: center; gap: 8px; }
.web-sc-okic { width: 24px; height: 24px; }
.web-sc-meter { margin: 10px; height: 14px; border-radius: 7px; background: #e3eef8; border: 1px solid #9cc6ea; overflow: hidden; }
.web-sc-meter i { display: block; height: 100%; background: linear-gradient(to right, #8fe05a, #ffd62e, #f08a12); }
.web-sc-travel { list-style: none; margin: 0; padding: 4px 0; }
.web-sc-travel a { display: grid; grid-template-columns: 28px 1fr auto auto; gap: 8px; align-items: center; padding: 4px 10px; color: #1b2f45 !important; }
.web-sc-travel a:hover { background: #eef6fd; text-decoration: none !important; }
.web-sc-tic { width: 26px; height: 26px; }
.web-sc-travel b { color: #c2410c; }
.web-sc-travel small { color: #5a7a9a; }
.web-sc-ad { background: #fffdf0; border-color: #e7d98a; }
.web-sc-adlabel { font-size: .8em; color: #9a8a3a; padding: 3px 8px; }
.web-sc-ad a { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 4px 10px 12px; color: #5a4a10 !important; text-decoration: none !important; }
.web-sc-adic { width: 56px; height: 56px; }
.web-sc-ad small { color: #9a8a3a; margin-top: 4px; }
.web-sc-h1 { font: 400 1.8em Selawik, "Segoe UI", sans-serif; color: #0d3f78; margin: 16px 0 4px; }
.web-sc-note { color: #4a6680; }
.web-sc-foot { margin: 24px 0; padding-top: 12px; border-top: 1px solid #c9dff1; text-align: center; color: #6c8298; font-size: .92em; }
`,
  });

  // ================================================================ www.glossr.com
  const GL_PHOTOS = [
    ['aurora', 'imagery/aurora', 'northern lights from the cabin', 'skyguy_mike', ['aurora', 'night', 'sky']], ['meadow', 'imagery/meadow', 'the hill behind my house', 'kayla', ['meadow', 'summer', 'grass']],
    ['ocean', 'imagery/ocean', 'beach day!!', 'jess', ['ocean', 'water', 'summer']], ['water', 'imagery/water', 'underwater with my new camera', 'aquadreamer', ['water', 'bubbles', 'aqua']],
    ['sunrise', 'imagery/sunrise', 'woke up at 5am for this', 'photog_pam', ['sunrise', 'sky', 'orange']], ['clearsky', 'imagery/clear-sky', 'not a cloud in the sky (almost)', 'marty', ['sky', 'clouds', 'blue']],
    ['bokeh', 'imagery/bokeh-day', 'bokeh experiment #3', 'photog_pam', ['bokeh', 'lights', 'glossy']], ['garden', 'imagery/vectorgarden', 'made this in Paint!!', 'brittany', ['vector', 'flowers', 'swirls']],
    ['deepsea', 'imagery/deep-sea', 'aquarium trip', 'mike', ['fish', 'water', 'aqua']], ['citynight', 'imagery/bokeh-night', 'city lights', 'night_owl', ['night', 'lights', 'bokeh']],
    ['ribbons', 'imagery/dark-ribbons', 'long exposure fun', 'tyler', ['lights', 'night', 'glossy']], ['pearl', 'imagery/technozen', 'minimalism', 'zen_zoe', ['white', 'calm', 'clean']],
  ];
  const GL_TAGS = { sky: 9, bubbles: 7, glossy: 10, beta: 6, water: 8, fish: 5, aurora: 6, summer: 7, sparkle: 4, friends: 5, 'web2.0': 9, reflections: 6, gradients: 8, orbs: 4, lime: 5, aqua: 7, sunset: 5, night: 4, bokeh: 6, vector: 3, flowers: 4, clouds: 5, calm: 3, lights: 5 };
  function glLogo(small) {
    const inner = `<span class="web-gl-word"><span class="g1">gloss</span><span class="g2">r</span></span>`;
    return `<a class="web-gl-logo${small ? ' small' : ''}" href="http://www.glossr.com/">${small ? inner : K.reflect(inner, 'web-gl-refl')}${K.burst('Beta!', { size: small ? 40 : 58, font: small ? 10 : 13, cls: 'web-gl-beta', spin: !small })}</a>`;
  }
  function glFrame(ctx, active, inner) {
    const acct = ctx.store.get('glossr.account', null);
    const nav = [['home', 'Home', 'http://www.glossr.com/'], ['tour', 'Tour', 'http://www.glossr.com/tour'], ['explore', 'Explore', 'http://www.glossr.com/explore'], ['blog', 'Blog', 'http://www.glossr.com/blog'], ['about', 'About', 'http://www.glossr.com/about']];
    return `<div class="web-gl"><div class="web-gl-top"><div class="web-gl-wrap web-gl-toprow">${glLogo(true)}<nav>${nav.map(([id, t, u]) => `<a href="${u}" class="${id === active ? 'on' : ''}">${t}</a>`).join('')}${acct ? `<span class="web-gl-hi">Hi, ${esc(acct.name)}!</span>` : '<a class="web-gl-navsign" href="https://www.glossr.com/signup">Sign up</a>'}</nav></div></div>
      ${inner}
      <div class="web-gl-foot"><div class="web-gl-wrap"><div class="web-gl-badges">${[['WEB 2.0', 'COMPLIANT', '#3aa6f5'], ['AJAX', 'INSIDE', '#35c93a'], ['RSS', 'FEED', '#f08a12'], ['XHTML', 'VALID', '#8e44ad'], ['BETA', 'FOREVER', '#e0457b'], ['MADE IN', 'A GARAGE', '#16a085']].map(([a, b, c]) => `<span class="web-gl-badge"><i>${a}</i><b style="background:${c}">${b}</b></span>`).join('')}</div>
        <p><a href="http://www.glossr.com/about">About</a> &middot; <a href="http://www.glossr.com/blog">Blog</a> &middot; <a href="#" class="web-gl-joke" data-j="jobs">Jobs (we're hiring interns!)</a> &middot; <a href="#" class="web-gl-joke" data-j="api">API</a> &middot; <a href="#" class="web-gl-joke" data-j="terms">Terms</a></p><p class="web-gl-copy">Glossr &copy; 2007. Proudly shiny since last Tuesday.</p></div></div></div>`;
  }
  function glWire(ctx, root) {
    root.querySelectorAll('.web-gl-joke').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const m = { jobs: ['We are hiring!', 'Glossr is looking for interns who can drop vowels, round corners and add reflections to anything. Pay: exposure (to gloss).'], api: ['Glossr API', 'Our API is RESTful, AJAXy and 100% mashup-ready. Documentation coming soon, right after the logo redesign.'], terms: ['Terms of Service', 'By using Glossr you agree to be at least 12% glossier than before. That is the whole agreement.'] }[a.dataset.j];
      ctx.dialog({ title: 'Glossr', icon: 'icons/photo', instruction: m[0], message: m[1] });
    }));
  }
  function glHome(ctx) {
    ctx.title('Glossr: Share your gloss (beta!)');
    const acct = ctx.store.get('glossr.account', null);
    const count = 12408 + (K.dayNumber() % 500) * 17;
    const tiles = GL_PHOTOS.slice(0, 6).map(([id, key]) => `<a href="/photo?id=${id}" class="web-gl-tile">${K.img(key, '', id)}</a>`).join('');
    const inner = `<div class="web-gl-hero"><div class="web-gl-wrap web-gl-herorow">
      <div class="web-gl-pitch">${glLogo(false)}
        <h1>Share your gloss.</h1>
        <p class="web-gl-lead">Glossr is the shiniest way to share photos, links and little bits of joy with the people you love. Upload it, tag it, gloss it.</p>
        ${acct ? `<div class="web-gl-welcome">Welcome back, <b>${esc(acct.name)}</b>! <a href="https://www.glossr.com/signup">Check on your account</a></div>` : ''}
        <div class="web-gl-cta"><a class="web-gl-big" href="https://www.glossr.com/signup">Sign up, it's free!</a><a class="web-gl-tourlink" href="/tour">Take the tour &raquo;</a></div>
        <p class="web-gl-count">Already <b class="web-gl-num">${K.num(count)}</b> glossy people and counting!</p>
      </div>
      <div class="web-gl-shot"><div class="web-gl-frame"><div class="web-gl-framebar"><i></i><i></i><i></i><span>glossr.com/explore</span></div><div class="web-gl-tiles">${tiles}</div></div><div class="web-gl-frame web-gl-framerefl" aria-hidden="true"><div class="web-gl-framebar"><i></i><i></i><i></i></div><div class="web-gl-tiles">${tiles}</div></div></div>
    </div></div>
    <div class="web-gl-wrap"><div class="web-gl-feats">
      <div>${K.img('icons/photo', 'web-gl-fic')}<h3>Upload anything shiny</h3><p>Photos, drawings, screenshots of your desktop. If it sparkles, it belongs on Glossr.</p></div>
      <div>${K.img('icons/users', 'web-gl-fic')}<h3>Tag it with friends</h3><p>Add tags, leave comments and mark your faves. Your friends get a bubble every time.</p></div>
      <div>${K.img('icons/sync', 'web-gl-fic')}<h3>Syndicate your sparkle</h3><p>Every gloss has an RSS feed. We are not totally sure what that means, but it is very Web 2.0.</p></div></div>
      <div class="web-gl-lower"><div class="web-gl-cloudbox"><h2>Popular tags</h2><div class="wk-tags web-gl-cloud">${Object.entries(GL_TAGS).map(([t, w]) => `<a href="/tags/${encodeURIComponent(t)}" style="font-size:${0.85 + w * 0.13}em;opacity:${0.6 + w * 0.04}">${esc(t)}</a>`).join(' ')}</div></div>
        <div class="web-gl-quotes"><h2>People love Glossr</h2>${[['avatars/avatar-flower', 'kayla', '"omg glossr is sooo shiny. i uploaded 400 pictures of my fish."'], ['avatars/avatar-sun', 'photog_pam', '"Finally, a place where my bokeh gets the attention it deserves."'], ['avatars/avatar-globe', 'marty', '"I am friends with everyone on here too."']].map(([a, n, q]) => `<div class="web-gl-quote">${K.img(a)}<p>${esc(q)}<br><small>- ${esc(n)}</small></p></div>`).join('')}</div></div></div>`;
    const root = ctx.html(glFrame(ctx, 'home', inner));
    glWire(ctx, root);
    const numEl = root.querySelector('.web-gl-num');
    let n = count;
    ctx.every(2600, () => { n += 1 + Math.floor(Math.random() * 3); numEl.textContent = K.num(n); });
  }
  function glTour(ctx) {
    ctx.title('Glossr - Take the tour');
    const steps = [['icons/upload', 'Upload your gloss', 'Pick a photo from your computer. Glossr automatically adds 30% more shine and a subtle reflection. You can turn this off, but nobody ever has.'], ['icons/star', 'Tag it and fave it', 'Tags help people find your gloss. Popular tags get bigger in the tag cloud. Big tags are good tags.'], ['icons/users', 'Share it with friends', 'Your friends see your new gloss in their Glossr stream, and they can comment with words like "nice!" and "awesome!!"']];
    const inner = `<div class="web-gl-wrap web-gl-page"><h1 class="web-gl-h1">Take the tour</h1><div class="web-gl-steps">${steps.map(([ic, t, d], i) => `<div class="web-gl-step"><span class="web-gl-stepn">${i + 1}</span>${K.img(ic, 'web-gl-stepic')}<h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div><div class="web-gl-cta center"><a class="web-gl-big" href="https://www.glossr.com/signup">Sign up, it's free!</a></div></div>`;
    glWire(ctx, ctx.html(glFrame(ctx, 'tour', inner)));
  }
  function glExplore(ctx, tag) {
    const list = tag ? GL_PHOTOS.filter((p) => p[4].includes(tag)) : GL_PHOTOS;
    ctx.title(tag ? 'Glossr - Tagged with ' + tag : 'Glossr - Explore');
    const faves = ctx.store.get('glossr.faves', {});
    const inner = `<div class="web-gl-wrap web-gl-page"><h1 class="web-gl-h1">${tag ? `Tagged with <span class="web-gl-tagname">${esc(tag)}</span>` : 'Explore the gloss'}</h1>
      <div class="web-gl-explore"><div class="web-gl-grid">${list.length ? list.map(([id, key, title, user]) => `<a href="/photo?id=${id}" class="web-gl-card">${K.img(key, '', title)}<b>${esc(title)}</b><small>by ${esc(user)} &middot; ${12 + (K.hash(id) % 300) + (faves[id] ? 1 : 0)} faves</small></a>`).join('') : `<p>No gloss is tagged with "${esc(tag)}" yet. Be the first! (Sign up first.)</p>`}</div>
      <div class="web-gl-cloudbox small"><h2>Tags</h2><div class="wk-tags web-gl-cloud">${Object.entries(GL_TAGS).map(([t, w]) => `<a href="/tags/${encodeURIComponent(t)}" style="font-size:${0.8 + w * 0.1}em">${esc(t)}</a>`).join(' ')}</div><p class="web-gl-tip">Tip: right-click any photo and choose "Set as Background".</p></div></div></div>`;
    glWire(ctx, ctx.html(glFrame(ctx, 'explore', inner)));
  }
  function glPhoto(ctx) {
    const ph = GL_PHOTOS.find((p) => p[0] === ctx.q('id'));
    if (!ph) return ctx.notFound();
    const [id, key, title, user, tags] = ph;
    ctx.title(title + ' on Glossr');
    const faves = ctx.store.get('glossr.faves', {});
    const comments = [['kayla', 'sooo pretty!!!'], ['marty', 'Nice gloss!'], ['photog_pam', 'great composition. is this HDR?'], ['bubblefan99', 'faved!!']].filter((_, i) => (K.hash(id) >> i) & 1 || i === 1);
    const inner = `<div class="web-gl-wrap web-gl-page"><div class="web-gl-photo"><div class="web-gl-photol"><h1 class="web-gl-h1">${esc(title)}</h1><div class="web-gl-big-photo">${K.img(key, '', title)}</div>
      <div class="web-gl-pactions"><button type="button" class="web-gl-fave ${faves[id] ? 'on' : ''}">${faves[id] ? 'Faved!' : 'Add to faves'}</button><span class="web-gl-small">Right-click the photo to set it as your wallpaper.</span></div>
      <h2>Comments</h2>${comments.map(([u, c]) => `<div class="web-gl-comment"><b>${esc(u)}</b> says: ${esc(c)}</div>`).join('')}</div>
      <div class="web-gl-photor"><div class="web-gl-cloudbox small"><h2>Uploaded by</h2><p><b>${esc(user)}</b><br>${K.shortDate(Date.now() - (K.hash(id) % 60) * D)}</p><h2>Tags</h2><p>${tags.map((t) => `<a href="/tags/${t}" class="web-gl-tagpill">${t}</a>`).join(' ')}</p><h2>Gloss level</h2><p>Ultra glossy (${70 + (K.hash(id) % 30)}%)</p></div></div></div></div>`;
    const root = ctx.html(glFrame(ctx, 'explore', inner));
    glWire(ctx, root);
    root.querySelector('.web-gl-fave').addEventListener('click', (e) => {
      const f = ctx.store.get('glossr.faves', {});
      f[id] = !f[id];
      ctx.store.set('glossr.faves', f);
      e.target.classList.toggle('on', f[id]);
      e.target.textContent = f[id] ? 'Faved!' : 'Add to faves';
      ctx.sound(f[id] ? 'ding' : 'click');
    });
  }
  function glAbout(ctx) {
    ctx.title('About Glossr');
    const team = [['avatars/avatar-sun', 'Skyler', 'Chief Gloss Officer'], ['avatars/avatar-leaf', 'Rory', 'VP of Rounded Corners'], ['avatars/avatar-butterfly', 'Dana', 'Head of Reflections'], ['avatars/avatar-music', 'Jules', 'Director of Gradients'], ['avatars/avatar-dolphin', 'Pat', 'Intern (drops the vowels)'], ['icons/fish', 'Bubbles', 'Office goldfish, advisor']];
    const inner = `<div class="web-gl-wrap web-gl-page"><h1 class="web-gl-h1">About Glossr</h1><p class="web-gl-lead">Glossr started in a garage with one simple idea: what if sharing photos was shinier? We have been polishing ever since.</p><div class="web-gl-team">${team.map(([a, n, r]) => `<div class="web-gl-member">${K.img(a)}<b>${esc(n)}</b><span>${esc(r)}</span></div>`).join('')}</div></div>`;
    glWire(ctx, ctx.html(glFrame(ctx, 'about', inner)));
  }
  function glBlog(ctx) {
    ctx.title('The Glossr Blog');
    const posts = [['Now with 40% more gloss', 2, 'We heard you. Every button on Glossr is now 40% glossier. Some of you asked for less gloss. We are thinking about it (we are not).'], ['Introducing tags!', 9, 'You can now add tags to your gloss. Popular tags get bigger. Nobody knows why this is so satisfying, but it is.'], ['We raised $0 in seed funding!', 20, 'Thanks to our amazing community, Glossr is fully bootstrapped, which means we bought the servers with our allowance.'], ['Hello, world!', 40, 'Welcome to the Glossr blog. Glossr is in beta, which means it is new, shiny and occasionally a little broken. We think you are going to love it.']];
    const inner = `<div class="web-gl-wrap web-gl-page"><h1 class="web-gl-h1">The Glossr Blog</h1>${posts.map(([t, d, b]) => `<div class="web-gl-post"><h2>${esc(t)}</h2><div class="web-gl-small">Posted ${K.shortDate(Date.now() - d * D)} by Skyler &middot; ${3 + (K.hash(t) % 40)} comments &middot; <a href="#" class="web-gl-joke" data-j="api">RSS</a></div><p>${esc(b)}</p></div>`).join('')}</div>`;
    glWire(ctx, ctx.html(glFrame(ctx, 'blog', inner)));
  }
  function glSignup(ctx) {
    ctx.title('Sign up for Glossr');
    const acct = ctx.store.get('glossr.account', null);
    const user = ctx.user();
    const state = { step: acct ? 5 : 1, name: acct ? acct.name : '', email: '', level: 3, avatar: user.avatar, friends: [] };
    const root = ctx.html(glFrame(ctx, 'signup', '<div class="web-gl-wrap web-gl-page"><div class="web-gl-signup"></div></div>'));
    glWire(ctx, root);
    const box = root.querySelector('.web-gl-signup');
    const levels = ['Matte', 'Satin', 'Glossy', 'Ultra glossy', 'Blinding'];
    const avatars = ['avatars/avatar-fish', 'avatars/avatar-flower', 'avatars/avatar-butterfly', 'avatars/avatar-dolphin', 'avatars/avatar-sun', 'avatars/avatar-globe', 'avatars/avatar-leaf', 'avatars/avatar-music'];
    const stepsBar = (n) => `<ol class="web-gl-progress">${['Account', 'Gloss level', 'Friends', 'Finish'].map((l, i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''}"><span>${i + 1}</span>${l}</li>`).join('')}</ol>`;
    function paint() {
      if (state.step === 1) {
        box.innerHTML = `${stepsBar(1)}<h1 class="web-gl-h1">Create your Glossr account</h1><form class="web-gl-form"><label>Username <input name="u" type="text" maxlength="20" value="${esc(state.name)}" autocomplete="off"></label><div class="web-gl-hint"></div><label>E-mail <input name="e" type="text" value="${esc(state.email)}" placeholder="you@example.com" autocomplete="off"></label><label>Password <input name="p" type="password" autocomplete="off"></label><div class="web-gl-err"></div><button type="submit" class="web-gl-big">Next step &raquo;</button></form>`;
        const f = box.querySelector('form'), hint = box.querySelector('.web-gl-hint'), err = box.querySelector('.web-gl-err');
        const suggest = () => {
          const v = f.u.value.trim();
          const dropped = v.replace(/[aeiou]/gi, '');
          hint.innerHTML = v.length > 2 && /[aeiou]/i.test(v) && dropped.length > 1 ? `Pro tip: drop the vowels for extra Web 2.0 points. How about <a href="#" class="web-gl-use">${esc(dropped.toLowerCase())}r</a>?` : '';
          const use = hint.querySelector('.web-gl-use');
          if (use) use.addEventListener('click', (e) => { e.preventDefault(); f.u.value = dropped.toLowerCase() + 'r'; suggest(); });
        };
        f.u.addEventListener('input', suggest);
        suggest();
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          const u = f.u.value.trim();
          if (u.length < 3) { err.textContent = 'Usernames need at least 3 characters. Even glossy ones.'; return; }
          if (!/@/.test(f.e.value)) { err.textContent = 'That e-mail looks a little matte. Try one with an @ in it.'; return; }
          if (f.p.value.length < 4) { err.textContent = 'Your password needs at least 4 characters. "gloss" is a great choice. (It is not.)'; return; }
          state.name = u; state.email = f.e.value.trim(); state.step = 2; paint(); ctx.sound('click');
        });
      } else if (state.step === 2) {
        box.innerHTML = `${stepsBar(2)}<h1 class="web-gl-h1">Pick your gloss level</h1><div class="web-gl-levelrow"><input type="range" min="0" max="4" value="${state.level}" class="web-gl-level" aria-label="Gloss level"><b class="web-gl-levelname"></b></div><div class="web-gl-preview"><span class="web-gl-pbtn">This is you on Glossr</span></div><h2>Pick a picture</h2><div class="web-gl-avatars">${avatars.map((a) => `<button type="button" data-a="${a}" class="${a === state.avatar ? 'on' : ''}">${K.img(a)}</button>`).join('')}</div><div class="web-gl-nav"><a href="#" class="web-gl-back">&laquo; Back</a><button type="button" class="web-gl-big web-gl-next">Next step &raquo;</button></div>`;
        const lv = box.querySelector('.web-gl-level'), nm = box.querySelector('.web-gl-levelname'), pb = box.querySelector('.web-gl-pbtn');
        const upd = () => { state.level = Number(lv.value); nm.textContent = levels[state.level]; pb.dataset.level = String(state.level); };
        lv.addEventListener('input', upd); upd();
        box.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => { state.avatar = b.dataset.a; box.querySelectorAll('[data-a]').forEach((x) => x.classList.toggle('on', x === b)); }));
        box.querySelector('.web-gl-back').addEventListener('click', (e) => { e.preventDefault(); state.step = 1; paint(); });
        box.querySelector('.web-gl-next').addEventListener('click', () => { state.step = 3; paint(); ctx.sound('click'); });
      } else if (state.step === 3) {
        const people = [['kayla', 'Kayla'], ['tyler', 'Tyler'], ['marty', 'Marty'], ['jess', 'Jess'], ['mike', 'Mike']];
        box.innerHTML = `${stepsBar(3)}<h1 class="web-gl-h1">Find your friends</h1><p>We found these people in your Bubble Messenger contacts. Invite them to Glossr? (We promise not to e-mail them more than 11 times.)</p><div class="web-gl-friends">${people.map(([id, n]) => `<label><input type="checkbox" value="${id}" checked> ${esc(n)}</label>`).join('')}</div><div class="web-gl-nav"><a href="#" class="web-gl-back">&laquo; Back</a><a href="#" class="web-gl-skip">Skip this step</a><button type="button" class="web-gl-big web-gl-next">Invite and continue &raquo;</button></div>`;
        box.querySelector('.web-gl-back').addEventListener('click', (e) => { e.preventDefault(); state.step = 2; paint(); });
        const go = () => { state.friends = Array.from(box.querySelectorAll('input:checked')).map((i) => i.value); state.step = 4; paint(); ctx.sound('click'); };
        box.querySelector('.web-gl-skip').addEventListener('click', (e) => { e.preventDefault(); box.querySelectorAll('input').forEach((i) => { i.checked = false; }); go(); });
        box.querySelector('.web-gl-next').addEventListener('click', go);
      } else if (state.step === 4) {
        box.innerHTML = `${stepsBar(4)}<h1 class="web-gl-h1">Almost there, ${esc(state.name)}!</h1><div class="web-gl-summary">${K.img(state.avatar)}<div><b>${esc(state.name)}</b><br>${esc(state.email)}<br>Gloss level: ${levels[state.level]}<br>Friends invited: ${state.friends.length}</div></div><label class="web-gl-terms"><input type="checkbox" class="web-gl-agree"> I agree to the Terms of Service, which I have definitely read.</label><div class="web-gl-err"></div><div class="web-gl-nav"><a href="#" class="web-gl-back">&laquo; Back</a><button type="button" class="web-gl-big web-gl-create">Create my account</button></div>`;
        box.querySelector('.web-gl-back').addEventListener('click', (e) => { e.preventDefault(); state.step = 3; paint(); });
        box.querySelector('.web-gl-create').addEventListener('click', () => {
          if (!box.querySelector('.web-gl-agree').checked) { box.querySelector('.web-gl-err').textContent = 'Please agree to the terms. They are only one sentence long.'; return; }
          box.innerHTML = `<div class="web-gl-working"><span class="web-gl-spin"></span><b class="web-gl-wtext">Creating your account...</b></div>`;
          const msgs = ['Creating your account...', 'Adding gloss...', 'Rounding corners...', 'Generating reflections...', 'Dropping vowels...', 'Almost done...'];
          let i = 0;
          const tick = () => {
            i++;
            if (i < msgs.length) { box.querySelector('.web-gl-wtext').textContent = msgs[i]; ctx.after(650, tick); return; }
            ctx.store.set('glossr.account', { name: state.name, level: state.level, avatar: state.avatar, t: Date.now() });
            state.step = 5; paint(); ctx.sound('win');
          };
          ctx.after(650, tick);
        });
      } else {
        const name = state.name || (acct && acct.name) || 'friend';
        box.innerHTML = `<div class="web-gl-done"><h1 class="web-gl-h1">Welcome to Glossr, ${esc(name)}!</h1><p class="web-gl-lead">Your account is ready and extremely shiny.</p>
          <div class="web-gl-news"><div class="web-gl-newsh">${K.burst('News!', { size: 50, font: 11, c1: '#fff6a0', c2: '#ffb300' })}<b>An exciting update from the Glossr team</b></div>
          <p>Today we are thrilled to announce that Glossr has been acquired by <b>MegaPortal Online</b>!</p>
          <p>As part of this exciting next chapter, Glossr will be shutting down on Friday. Your gloss will be carefully archived in a very large, very dark warehouse.</p>
          <p>Thank you for being part of our incredible journey.</p>
          <p class="web-gl-sign">- Skyler, Rory, Dana, Jules, Pat and Bubbles the goldfish</p>
          <div class="web-gl-nav"><button type="button" class="web-gl-big web-gl-export">Export my gloss</button><a href="http://www.glossr.com/" class="web-gl-home">Back to the homepage</a></div></div></div>`;
        box.querySelector('.web-gl-export').addEventListener('click', () => {
          ctx.download({ name: 'glossr-export.txt', type: 'Text Document', icon: 'icons/photo', content: `GLOSSR ACCOUNT EXPORT\r\n=====================\r\n\r\nUsername: ${name}\r\nGloss level: ${levels[state.level] || 'Glossy'}\r\nPhotos uploaded: 0\r\nFaves: ${Object.values(ctx.store.get('glossr.faves', {})).filter(Boolean).length}\r\nRounded corners enjoyed: all of them\r\n\r\nThank you for being part of our incredible journey.\r\n\r\n(Glossr was never real. Your real photos are safe on your real computer.)\r\n` });
        });
      }
    }
    paint();
  }
  W.register({
    id: 'glossr', host: 'www.glossr.com', aliases: ['glossr.com'],
    title: 'Glossr: Share your gloss', shortTitle: 'Glossr', icon: 'icons/photo', ev: 'Glossr Inc. [US]',
    pictures: ['images/logo_reflection.png', 'images/beta_burst.png', 'images/signup_btn.png', 'images/tagcloud_bg.gif'],
    favicon: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#35c93a" stroke="#157a1f"/><circle cx="8" cy="8" r="7" fill="url(#g)"/><text x="8" y="11.6" font-family="Arial" font-weight="bold" font-size="10" text-anchor="middle" fill="#fff">g</text><ellipse cx="8" cy="4.6" rx="5" ry="2.4" fill="#fff" opacity=".5"/><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe8f5" stop-opacity=".0"/><stop offset="1" stop-color="#15b0cc" stop-opacity=".6"/></linearGradient></defs></svg>',
    pages: () => [
      { path: '/', title: 'Glossr: Share your gloss (beta!)', text: 'Glossr share your gloss photo sharing web 2.0 beta sign up free tags tag cloud RSS AJAX reflections glossy buttons starburst' },
      { path: '/tour', title: 'Glossr - Take the tour', text: 'upload your gloss, tag it and fave it, share it with friends' },
      { path: '/explore', title: 'Glossr - Explore', text: 'explore photos aurora meadow ocean underwater sunrise bokeh garden city lights tags' },
      { path: '/about', title: 'About Glossr', text: 'about the glossr team chief gloss officer VP of rounded corners head of reflections intern office goldfish' },
      { path: '/blog', title: 'The Glossr Blog', text: 'glossr blog now with 40% more gloss introducing tags seed funding hello world beta' },
    ],
    render(ctx) {
      const p = ctx.parts;
      if (!p.length) return glHome(ctx);
      if (p[0] === 'tour') return glTour(ctx);
      if (p[0] === 'explore') return glExplore(ctx, '');
      if (p[0] === 'tags') return glExplore(ctx, (p[1] || '').toLowerCase());
      if (p[0] === 'photo') return glPhoto(ctx);
      if (p[0] === 'about') return glAbout(ctx);
      if (p[0] === 'blog') return glBlog(ctx);
      if (p[0] === 'signup') { if (ctx.u.protocol !== 'https:') return ctx.go('https://www.glossr.com/signup', { replace: true, noSound: true }) || ctx.html('<div class="web-gl"></div>'); return glSignup(ctx); }
      return ctx.notFound();
    },
    css: `
.web-gl { min-height: 100%; background: #fff; color: #333; font: calc(13px * var(--hz-text, 1))/1.5 "Lucida Grande", Selawik, "Segoe UI", Tahoma, Verdana, sans-serif; }
.web-gl a { color: #0a8fc2; text-decoration: none; }
.web-gl a:hover { text-decoration: underline; }
.web-gl-wrap { width: 920px; margin: 0 auto; }
.web-gl-top { background: linear-gradient(#fff, #f2f7f9); border-bottom: 1px solid #dde7ec; }
.web-gl-toprow { display: flex; justify-content: space-between; align-items: center; height: 54px; }
.web-gl-top nav { display: flex; align-items: center; gap: 4px; }
.web-gl-top nav a { padding: 5px 12px; border-radius: 14px; color: #555; font-weight: 600; }
.web-gl-top nav a.on, .web-gl-top nav a:hover { background: #e8f6fb; color: #0a8fc2; text-decoration: none; }
.web-gl-navsign { background: linear-gradient(#b7f39a, #4fc22f) !important; color: #fff !important; text-shadow: 0 1px 0 rgba(0,80,0,.4); }
.web-gl-hi { margin-left: 8px; font-weight: 700; color: #3a8a1c; }
.web-gl-logo { position: relative; display: inline-flex; align-items: flex-start; gap: 4px; text-decoration: none !important; }
.web-gl-word { font: 800 3.6em/1 "Arial Rounded MT Bold", "VAG Rounded", "Trebuchet MS", Verdana, sans-serif; letter-spacing: -.04em; }
.web-gl-word .g1 { background: linear-gradient(to bottom, #c8f7ff 0, #3cc6e8 45%, #0a9ac2 52%, #2cc0e0 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.web-gl-word .g2 { background: linear-gradient(to bottom, #e4ffc8 0, #7ed83a 45%, #3faa14 52%, #6fd03a 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.web-gl-logo.small .web-gl-word { font-size: 1.9em; }
.web-gl-refl { filter: drop-shadow(0 2px 2px rgba(0,60,90,.15)); }
.web-gl-beta { margin: -8px 0 0 -6px; }
.web-gl-hero { background: linear-gradient(to bottom, #f2fbff, #fff); border-bottom: 1px solid #e3eef2; }
.web-gl-herorow { display: flex; align-items: center; gap: 30px; padding: 30px 0 46px; }
.web-gl-pitch { flex: 1; }
.web-gl-pitch h1 { font: 300 3.2em/1.1 Selawik, "Segoe UI", "Lucida Grande", sans-serif; color: #222; margin: 34px 0 10px; letter-spacing: -.02em; }
.web-gl-lead { font-size: 1.2em; color: #555; margin: 0 0 18px; }
.web-gl-welcome { margin-bottom: 14px; padding: 8px 12px; border-radius: 8px; background: #effbe6; border: 1px solid #b8e39a; }
.web-gl-cta { display: flex; align-items: center; gap: 18px; }
.web-gl-cta.center { justify-content: center; margin: 24px 0; }
.web-gl-big { position: relative; display: inline-block; overflow: hidden; padding: 12px 30px; border-radius: 30px; border: 1px solid #2f8a14; cursor: pointer; font: 700 1.35em/1.2 "Arial Rounded MT Bold", "Trebuchet MS", sans-serif; color: #fff !important; text-shadow: 0 -1px 0 rgba(0,70,0,.4); text-decoration: none !important; background: linear-gradient(to bottom, #c9f7a8 0, #72d545 48%, #3fae1c 50%, #5cc934 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 4px 10px rgba(40,120,20,.35); }
.web-gl-big::before { content: ""; position: absolute; left: 8%; right: 8%; top: 2px; height: 45%; border-radius: 30px; background: linear-gradient(rgba(255,255,255,.8), rgba(255,255,255,.1)); }
.web-gl-big:hover { filter: brightness(1.07) saturate(1.1); }
.web-gl-tourlink { font-weight: 700; font-size: 1.05em; }
.web-gl-count { color: #777; margin-top: 16px; }
.web-gl-count b { color: #3aa60f; font-size: 1.15em; }
.web-gl-shot { position: relative; width: 380px; height: 330px; }
.web-gl-frame { position: absolute; left: 0; top: 10px; width: 380px; border-radius: 10px; overflow: hidden; border: 1px solid #b9cbd3; background: #fff; box-shadow: 0 10px 30px rgba(0,60,90,.2); transform: perspective(900px) rotateY(-10deg); }
.web-gl-framerefl { top: 262px; transform: perspective(900px) rotateY(-10deg) scaleY(-1); opacity: .22; box-shadow: none; -webkit-mask-image: linear-gradient(to bottom, transparent 55%, #000); mask-image: linear-gradient(to bottom, transparent 55%, #000); pointer-events: none; }
.web-gl-framebar { display: flex; align-items: center; gap: 5px; height: 22px; padding: 0 8px; background: linear-gradient(#f4f7f9, #dce4e8); border-bottom: 1px solid #c5d2d8; font-size: .8em; color: #789; }
.web-gl-framebar i { width: 9px; height: 9px; border-radius: 50%; background: #c3d0d6; }
.web-gl-framebar span { margin-left: 8px; }
.web-gl-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 8px; }
.web-gl-tile { display: block; height: 104px; border-radius: 6px; overflow: hidden; }
.web-gl-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.web-gl-feats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; padding: 30px 0 10px; text-align: center; }
.web-gl-fic { width: 64px; height: 64px; filter: drop-shadow(0 4px 4px rgba(0,60,90,.2)); }
.web-gl-feats h3 { margin: 6px 0 4px; color: #0a8fc2; font-size: 1.2em; }
.web-gl-feats p { color: #666; margin: 0; }
.web-gl-lower { display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px; padding: 20px 0; }
.web-gl-cloudbox { padding: 14px 18px; border-radius: 12px; background: #f6fbfd; border: 1px solid #dde9ee; }
.web-gl-cloudbox h2, .web-gl-quotes h2, .web-gl-photol h2 { font: 400 1.25em Selawik, "Segoe UI", sans-serif; color: #444; margin: 0 0 8px; }
.web-gl-cloudbox.small h2 { font-size: 1.05em; margin-top: 6px; }
.web-gl-cloud a { color: #0a8fc2; }
.web-gl-cloud a:nth-child(3n) { color: #3aa60f; } .web-gl-cloud a:nth-child(5n) { color: #e0457b; }
.web-gl-quote { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.web-gl-quote img { width: 44px; height: 44px; flex: none; }
.web-gl-quote p { margin: 0; font-style: italic; color: #555; }
.web-gl-quote small { font-style: normal; color: #999; }
.web-gl-foot { margin-top: 20px; padding: 16px 0 30px; background: #f6f9fa; border-top: 1px solid #e3eef2; text-align: center; color: #888; font-size: .92em; }
.web-gl-badges { display: flex; justify-content: center; gap: 6px; margin-bottom: 10px; }
.web-gl-badge { display: inline-flex; height: 15px; font: 700 8px/15px Verdana, sans-serif; border: 1px solid #555; letter-spacing: .02em; }
.web-gl-badge i { font-style: normal; padding: 0 4px; color: #fff; background: #555; }
.web-gl-badge b { padding: 0 4px; color: #fff; }
.web-gl-copy { color: #aaa; }
.web-gl-page { padding: 20px 0 30px; min-height: 380px; }
.web-gl-h1 { font: 300 2.2em/1.2 Selawik, "Segoe UI", sans-serif; color: #222; margin: 0 0 14px; }
.web-gl-tagname { color: #3aa60f; }
.web-gl-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.web-gl-step { position: relative; padding: 20px; text-align: center; border-radius: 14px; background: linear-gradient(#fff, #f2fbff); border: 1px solid #d6e8ef; box-shadow: 0 4px 12px rgba(0,60,90,.08); }
.web-gl-stepn { position: absolute; left: 12px; top: 10px; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; color: #fff; background: radial-gradient(circle at 40% 30%, #9fe8ff, #0a9ac2 70%); }
.web-gl-stepic { width: 72px; height: 72px; }
.web-gl-explore { display: grid; grid-template-columns: 1fr 240px; gap: 20px; }
.web-gl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; align-content: start; }
.web-gl-card { display: flex; flex-direction: column; gap: 3px; padding: 6px; border-radius: 10px; border: 1px solid #e0ebef; background: #fff; box-shadow: 0 2px 6px rgba(0,60,90,.06); color: #333 !important; text-decoration: none !important; }
.web-gl-card:hover { border-color: #7fd0ea; box-shadow: 0 4px 12px rgba(10,143,194,.2); }
.web-gl-card img { width: 100%; height: 120px; object-fit: cover; border-radius: 6px; }
.web-gl-card small { color: #999; }
.web-gl-tip { font-size: .9em; color: #888; }
.web-gl-photo { display: grid; grid-template-columns: 1fr 260px; gap: 24px; }
.web-gl-big-photo img { width: 100%; max-height: 420px; object-fit: cover; border-radius: 8px; box-shadow: 0 6px 18px rgba(0,40,60,.25); }
.web-gl-pactions { display: flex; align-items: center; gap: 12px; margin: 12px 0 18px; }
.web-gl-fave { font: 700 1em "Lucida Grande", sans-serif; padding: 6px 16px; border-radius: 16px; border: 1px solid #d8a800; cursor: pointer; background: linear-gradient(#fff6c4, #ffd84a); color: #5a4200; }
.web-gl-fave.on { background: linear-gradient(#ffe3f0, #ff8ab8); border-color: #c83a7a; color: #fff; }
.web-gl-small { color: #999; font-size: .9em; }
.web-gl-comment { padding: 6px 0; border-bottom: 1px solid #eef3f5; }
.web-gl-tagpill { display: inline-block; padding: 1px 8px; margin: 2px 0; border-radius: 10px; background: #e8f6fb; }
.web-gl-team { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.web-gl-member { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px; border-radius: 12px; border: 1px solid #e0ebef; }
.web-gl-member img { width: 72px; height: 72px; }
.web-gl-member span { color: #888; }
.web-gl-post { padding: 12px 0; border-bottom: 1px solid #eef3f5; }
.web-gl-post h2 { margin: 0; color: #0a8fc2; font-weight: 400; }
.web-gl-signup { max-width: 620px; margin: 0 auto; }
.web-gl-progress { display: flex; gap: 6px; list-style: none; padding: 0; margin: 0 0 20px; }
.web-gl-progress li { flex: 1; display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 16px; background: #eef3f5; color: #999; font-weight: 600; }
.web-gl-progress li span { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: #ccd8dc; color: #fff; font-size: .85em; }
.web-gl-progress li.on { background: #e8f6fb; color: #0a8fc2; } .web-gl-progress li.on span { background: #0a9ac2; }
.web-gl-progress li.done { color: #3aa60f; } .web-gl-progress li.done span { background: #3aa60f; }
.web-gl-form { display: flex; flex-direction: column; gap: 10px; }
.web-gl-form label { display: flex; flex-direction: column; gap: 3px; font-weight: 600; color: #555; }
.web-gl-form input { font: 1.1em "Lucida Grande", sans-serif; padding: 7px 10px; border: 1px solid #b9cbd3; border-radius: 6px; box-shadow: inset 0 1px 2px rgba(0,0,0,.08); outline: none; }
.web-gl-form input:focus { border-color: #0a9ac2; box-shadow: 0 0 6px rgba(10,154,194,.4); }
.web-gl-form .web-gl-big { align-self: flex-start; margin-top: 6px; }
.web-gl-hint { color: #3aa60f; min-height: 1em; margin-top: -6px; }
.web-gl-err { color: #c8412a; font-weight: 600; min-height: 1.2em; }
.web-gl-levelrow { display: flex; align-items: center; gap: 14px; }
.web-gl-level { width: 300px; accent-color: #0a9ac2; }
.web-gl-levelname { font-size: 1.2em; color: #0a8fc2; }
.web-gl-preview { margin: 18px 0; padding: 26px; text-align: center; border-radius: 12px; background: #f6fbfd; border: 1px dashed #b9d8e3; }
.web-gl-pbtn { display: inline-block; padding: 12px 26px; border-radius: 26px; font-weight: 700; color: #fff; border: 1px solid #0a7fa8; background: #3cb8dc; transition: all .3s; }
.web-gl-pbtn[data-level="1"] { background: linear-gradient(#7fd6ee, #2aaad2); }
.web-gl-pbtn[data-level="2"] { background: linear-gradient(to bottom, #c8f4ff 0, #58c8ea 48%, #1aa0cc 51%, #3ab8e0 100%); box-shadow: inset 0 1px 0 #fff; }
.web-gl-pbtn[data-level="3"] { background: linear-gradient(to bottom, #fff 0, #8fe0f7 45%, #0a98c8 51%, #34c2ea 100%); box-shadow: inset 0 1px 0 #fff, 0 0 14px rgba(40,190,240,.6); }
.web-gl-pbtn[data-level="4"] { background: linear-gradient(to bottom, #fff 0, #fff 30%, #9ff0ff 48%, #00a8e0 51%, #7fe6ff 100%); box-shadow: 0 0 30px 8px rgba(255,255,255,.95), 0 0 50px rgba(40,200,255,.9); color: #fff; text-shadow: 0 0 6px #0a7fa8; }
.web-gl-avatars { display: flex; gap: 8px; flex-wrap: wrap; }
.web-gl-avatars button { padding: 3px; border: 2px solid transparent; border-radius: 10px; background: none; cursor: pointer; }
.web-gl-avatars button.on { border-color: #3aa60f; background: #effbe6; }
.web-gl-avatars img { width: 54px; height: 54px; display: block; }
.web-gl-nav { display: flex; align-items: center; gap: 18px; margin-top: 18px; }
.web-gl-friends { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 10px; background: #f6fbfd; border: 1px solid #dde9ee; }
.web-gl-summary { display: flex; gap: 14px; align-items: center; padding: 14px; border-radius: 12px; background: #f6fbfd; border: 1px solid #dde9ee; margin-bottom: 12px; }
.web-gl-summary img { width: 64px; height: 64px; }
.web-gl-terms { display: flex; gap: 8px; align-items: center; }
.web-gl-working { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 60px 0; font-size: 1.2em; color: #0a8fc2; }
.web-gl-spin { width: 44px; height: 44px; border-radius: 50%; border: 5px solid #d8eef5; border-top-color: #3aa60f; border-right-color: #0a9ac2; animation: web-gl-spin .8s linear infinite; }
@keyframes web-gl-spin { to { transform: rotate(360deg); } }
.web-gl-done { text-align: left; }
.web-gl-news { margin-top: 18px; padding: 16px 20px; border-radius: 12px; background: #fffbe6; border: 1px solid #ecd67a; box-shadow: 0 4px 12px rgba(120,90,0,.12); }
.web-gl-newsh { display: flex; align-items: center; gap: 12px; font-size: 1.15em; color: #6b4200; }
.web-gl-sign { color: #8a6a20; font-style: italic; }
.web-gl-home { font-weight: 700; }
`,
  });
})();
