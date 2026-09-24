/* The pretend web, part 1: the shared site registry and "web kit" helpers,
   plus Aerium Live (home.aerium.net), Bubble Search and Aeropedia.
   Every site registers { host, title, favicon, css, pages, render(ctx) } and
   renders plain DOM with its own prefixed CSS. Horizon (browser.js) does the rest. */
(function () {
  'use strict';
  const A = window.Aerium;
  const W = A.web || (A.web = { sites: [], kit: {}, register(def) { this.sites.push(def); return def; } });
  const esc = A.util.escapeHTML;

  // ------------------------------------------------------------ web kit
  let uidN = 0;
  function hash(str) {
    let x = 2166136261;
    str = String(str);
    for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  const rng = (seed) => A.util.seeded(typeof seed === 'number' ? seed : hash(seed));
  const dayNumber = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const num = (n) => Math.round(n).toLocaleString('en-US');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function ago(t) {
    const s = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (s < 60) return s + ' second' + (s === 1 ? '' : 's') + ' ago';
    const m = Math.round(s / 60);
    if (m < 60) return m + ' minute' + (m === 1 ? '' : 's') + ' ago';
    const hr = Math.round(m / 60);
    if (hr < 24) return hr + ' hour' + (hr === 1 ? '' : 's') + ' ago';
    const d = Math.round(hr / 24);
    if (d < 30) return d + ' day' + (d === 1 ? '' : 's') + ' ago';
    const mo = Math.round(d / 30);
    if (mo < 12) return mo + ' month' + (mo === 1 ? '' : 's') + ' ago';
    const y = Math.round(mo / 12);
    return y + ' year' + (y === 1 ? '' : 's') + ' ago';
  }
  const shortDate = (d) => { d = new Date(d); return MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); };
  const img = (key, cls, alt, extra) => `<img class="${cls || ''}" src="${A.asset(key)}" data-asset="${key}" alt="${esc(alt || '')}"${extra ? ' ' + extra : ''}>`;
  const stars = (r, big) => `<span class="wk-rate${big ? ' wk-big' : ''}" title="${(+r).toFixed(1)} out of 5 stars"><i style="width:${Math.max(0, Math.min(100, (r / 5) * 100))}%"></i></span>`;
  function burst(text, o = {}) {
    const size = o.size || 80, pts = o.points || 18;
    const id = 'wkb' + ++uidN;
    const p = [];
    for (let i = 0; i < pts * 2; i++) { const a = (Math.PI * i) / pts, r = i % 2 ? 38 : 50; p.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (50 + r * Math.sin(a)).toFixed(1)); }
    return `<span class="wk-burst${o.spin ? ' wk-burst-spin' : ''} ${o.cls || ''}" style="width:${size}px;height:${size}px;font-size:${o.font || Math.round(size / 5.2)}px;transform:rotate(${o.rotate == null ? 15 : o.rotate}deg);color:${o.color || '#fff'}"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="${o.c1 || '#fff45c'}"/><stop offset="1" stop-color="${o.c2 || '#ff8a00'}"/></radialGradient></defs><polygon points="${p.join(' ')}" fill="url(#${id})" stroke="${o.rim || '#d86400'}" stroke-width="1.6"/><ellipse cx="44" cy="33" rx="25" ry="12" fill="#fff" opacity=".42"/></svg><span>${text}</span></span>`;
  }
  const reflect = (inner, cls) => `<span class="wk-reflect ${cls || ''}">${inner}<span class="wk-refl-copy" aria-hidden="true">${inner}</span></span>`;
  const titleCase = (s) => String(s).trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

  // Weather that every site agrees on: seeded by city name and today's date.
  const CONDS = {
    sunny: { label: 'Sunny', icon: 'icons/sun', night: 'icons/moon' },
    partly: { label: 'Partly cloudy', icon: 'icons/sun', icon2: 'icons/cloud', night: 'icons/moon' },
    cloudy: { label: 'Cloudy', icon: 'icons/cloud' },
    showers: { label: 'Showers', icon: 'icons/rain' },
    breezy: { label: 'Breezy', icon: 'icons/wind' },
    snow: { label: 'Snow flurries', icon: 'icons/snow' },
    rainbow: { label: 'Sun showers', icon: 'icons/rainbow' },
  };
  const REGIONS = ['CA', 'WA', 'OR', 'FL', 'TX', 'CO', 'MN', 'NY', 'ME', 'AZ', 'IL', 'GA'];
  function weather(city) {
    const name = titleCase(city || 'Springfield') || 'Springfield';
    const h0 = hash(name.toLowerCase());
    const r = rng(h0 ^ Math.imul(dayNumber(), 2654435761));
    const month = new Date().getMonth();
    const climate = 48 + (h0 % 34);
    const season = Math.cos(((month - 6.5) / 12) * Math.PI * 2) * 15;
    const days = [];
    let base = climate - 6 + season + (r() * 8 - 4);
    for (let i = 0; i < 5; i++) {
      base += r() * 8 - 4;
      const hi = Math.round(base + 6);
      const lo = Math.round(hi - 9 - r() * 9);
      let pool = hi < 36 ? ['snow', 'snow', 'cloudy', 'partly', 'sunny'] : ['sunny', 'sunny', 'partly', 'partly', 'cloudy', 'showers', 'breezy', 'rainbow'];
      const cond = pool[Math.floor(r() * pool.length)];
      const d = new Date(Date.now() + i * 86400000);
      days.push({ cond, ...CONDS[cond], hi, lo, pop: cond === 'showers' || cond === 'snow' ? 50 + Math.round(r() * 40) : cond === 'rainbow' ? 30 + Math.round(r() * 20) : Math.round(r() * 20), date: d, name: i === 0 ? 'Today' : A.util.DAYS[d.getDay()], short: A.util.DAYS[d.getDay()].slice(0, 3) });
    }
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const t0 = days[0];
    const frac = Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI * 2 - 0.3) * 0.5 + 0.5);
    const temp = Math.round(t0.lo + (t0.hi - t0.lo) * frac);
    const night = hour < 6.5 || hour > 19.5;
    return {
      city: name, region: REGIONS[h0 % REGIONS.length], days, night,
      now: { temp, cond: t0.cond, label: t0.label, icon: night && t0.night ? t0.night : t0.icon, icon2: night ? null : t0.icon2 || null, feels: temp + Math.round(r() * 4 - 2), humidity: 30 + Math.round(r() * 55), wind: Math.round(3 + r() * 16), windDir: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(r() * 8)], uv: Math.round(r() * 9), pressure: (29.6 + r() * 0.8).toFixed(2), visibility: 6 + Math.round(r() * 4), bubbles: ['Low', 'Moderate', 'High', 'Very high', 'Extreme'][Math.floor(r() * 5)] },
      sunrise: '6:' + String(10 + Math.floor(r() * 40)).padStart(2, '0') + ' AM', sunset: '7:' + String(5 + Math.floor(r() * 50)).padStart(2, '0') + ' PM',
    };
  }
  const toC = (f) => Math.round(((f - 32) * 5) / 9);

  W.kit = Object.assign(W.kit || {}, { esc, hash, rng, dayNumber, num, ago, shortDate, img, stars, burst, reflect, titleCase, weather, toC, CONDS, MON });
  const K = W.kit;

  // ================================================================ home.aerium.net
  const STORIES = [
    { id: 'aurora-season', cat: 'Science', img: 'imagery/aurora', title: 'Aurora season arrives early as skywatchers report an "extra green" glow',
      blurb: 'Clear nights and a lively Sun painted ribbons of light across the northern sky this week.',
      body: ['Skywatchers in northern towns stayed up late this week as ribbons of green light rolled across the sky. Local astronomy clubs say the displays arrived earlier than usual this year.', 'Auroras happen when charged particles from the Sun meet the upper atmosphere. Oxygen high above the ground glows green, and on the best nights a little red and purple join in.', '"We set up folding chairs, a thermos of cocoa and three cameras," said one photographer. "Then we mostly just stared. You forget to press the button."'],
      links: [['Read about auroras on Aeropedia', 'http://www.aeropedia.org/wiki/Aurora'], ['Check tonight\'s forecast on SkyCast', 'http://www.skycast.com/']] },
    { id: 'goldfish-memory', cat: 'Science', img: 'icons/fish', title: 'Study: goldfish remember things for months, not three seconds',
      blurb: 'Researchers say the famous "three second memory" is a myth. Your goldfish knows it is dinner time.',
      body: ['The idea that goldfish forget everything in three seconds is one of the most repeated pet facts of all time. It is also not true.', 'Researchers have trained goldfish to respond to sounds, colors and even little levers, and found they remember what they learned for months.', 'Fish keepers were not surprised. "Mine waits at the front of the tank every evening at six," said one reader. "He knows."'],
      links: [['Goldfish on Aeropedia', 'http://www.aeropedia.org/wiki/Goldfish'], ['Adopt a virtual fish at FishPals', 'http://www.fishpals.com/']] },
    { id: 'rooftop-garden', cat: 'Green living', img: 'imagery/vectorgarden', title: 'City opens a glass rooftop garden with 4,000 plants and one very proud gardener',
      blurb: 'The greenhouse on top of the library collects rainwater and grows tomatoes for the school cafeteria.',
      body: ['A new glass greenhouse on top of the downtown library opened to visitors on Saturday. It holds about 4,000 plants, a small pond and a lot of very happy bees.', 'The garden collects rainwater from the roof and uses it for its drip irrigation. Tomatoes and herbs grown here will go to the school cafeteria next door.', 'Visitors can take the glass elevator up any day except Monday, when the gardener says the plants "need their quiet time."'],
      links: [['See the forecast before you visit', 'http://www.skycast.com/']] },
    { id: 'giant-bubble', cat: 'Local', img: 'icons/bubble', title: 'Local kid blows a soap bubble "about the size of a minivan"',
      blurb: 'Witnesses say it floated across the park for eleven seconds before popping over the duck pond.',
      body: ['Nine-year-old Maya brought a homemade bubble wand made of two sticks and a piece of string to the park on Sunday afternoon. Then things got big.', '"It was about the size of a minivan," said one witness. "Maybe a small minivan." The bubble drifted across the lawn for eleven seconds before popping over the duck pond.', 'Maya says the secret is a little glycerin in the soap mix and "being very, very patient."'],
      links: [['The science of bubbles', 'http://www.aeropedia.org/wiki/Bubble'], ['Watch bubble wrap get popped on TubeView', 'http://www.tubeview.com/watch?v=bubblewrap']] },
    { id: 'screensavers', cat: 'Tech', img: 'icons/monitor', title: 'Are screensavers the new art galleries? Office workers say yes',
      blurb: 'A survey found that most people have watched a screensaver for longer than they would like to admit.',
      body: ['Screensavers were invented to protect monitors from burn-in. These days, many people keep them around just because they are nice to look at.', 'In a recent survey, 64 percent of office workers admitted they had watched the bubbles screensaver for "at least a full minute" instead of wiggling the mouse.', 'Want to try a new one? Aerium comes with several, and the pretend web has more. We cannot promise they are all a good idea.'],
      links: [['Download free screensavers (proceed with caution)', 'http://www.free-screensavers-4u.com/'], ['Screensaver on Aeropedia', 'http://www.aeropedia.org/wiki/Screensaver']] },
    { id: 'touch-phones', cat: 'Tech', img: 'icons/phone', title: 'Phones with no buttons? Experts are split on the touch-screen future',
      blurb: 'Some say the keyboard is here to stay. Others are already typing on glass.',
      body: ['A new wave of phones has almost no buttons at all, just one big glossy sheet of glass. Everyone seems to have an opinion.', '"People love their keyboards," said one analyst. "Nobody wants to type an e-mail on a window." Another analyst replied by typing a long e-mail on a window.', 'Whatever happens, the ringtones are not going anywhere.'],
      links: [['Get new ringtones at Ringtonez4U', 'http://www.ringtonez4u.com/']] },
    { id: 'hard-drive', cat: 'Tech', img: 'icons/disc', title: 'Tech tips: what to do with all 160 GB of your brand-new hard drive',
      blurb: 'Our experts suggest organizing your photos, backing up your music and never deleting anything ever again.',
      body: ['Hard drives keep getting bigger, and 160 gigabytes sounds like it will last forever. (It will not.)', 'Start with folders: Documents, Pictures, Music, Videos. Then make a folder called "Stuff" and put everything else in it, like everyone does.', 'And remember to empty the Recycle Bin once in a while. Some of those files have been in there since 2004.'],
      links: [['Share photos on Glossr', 'http://www.glossr.com/']] },
    { id: 'dolphins', cat: 'Local', img: 'icons/dolphin', title: 'Dolphin pod spotted playing near the pier for the third day in a row',
      blurb: 'The pod of about a dozen dolphins has become the most popular attraction on the waterfront.',
      body: ['A pod of about twelve dolphins has been leaping and splashing near the pier every morning this week, drawing crowds of early risers.', 'Marine biologists remind visitors to watch from a distance and to keep boats slow in the area.', '"They seem to be having a great time," said a volunteer. "Honestly, same."'],
      links: [['Dolphins on Aeropedia', 'http://www.aeropedia.org/wiki/Dolphin']] },
    { id: 'shiny-poll', cat: 'Web', img: 'icons/globe', title: 'Poll: seven in ten people say the internet feels "shinier" this year',
      blurb: 'Glossy buttons, reflections and starbursts are everywhere. Designers say it is only getting started.',
      body: ['If websites seem glossier lately, you are not imagining it. Rounded corners, gradients and reflections have taken over.', 'In our poll, 71 percent said the web feels "shinier" than last year, 18 percent said "about the same," and 11 percent asked what a web browser is.', 'Startups are leading the way. One new site even has "Beta!" written in a spinning starburst, which experts say is legally required now.'],
      links: [['Visit Glossr (beta!)', 'http://www.glossr.com/'], ['What is Web 2.0?', 'http://www.aeropedia.org/wiki/Web_2.0']] },
    { id: 'crystal-lagoon', cat: 'Entertainment', img: 'icons/music', title: 'Crystal Lagoon announce the "Bubble Garden" tour, and fans refresh MySpot all night',
      blurb: 'Tickets go on sale Friday. The band says every show will end with a bubble machine.',
      body: ['Chillout duo Crystal Lagoon announced a new tour on their MySpot page late Tuesday night, and fans crashed the comments within minutes.', 'The "Bubble Garden" tour visits eleven cities this fall. The band promises that every show will end with a bubble machine "and possibly a second, backup bubble machine."', 'Can\'t wait? Their songs are playing right now on their profile.'],
      links: [['Crystal Lagoon on MySpot', 'http://www.myspot.com/crystallagoon']] },
    { id: 'dramatic-goldfish', cat: 'Entertainment', img: 'icons/video', title: '"Dramatic Goldfish" clip passes 48 million views on TubeView',
      blurb: 'Eight seconds, one goldfish, three zooms. Nobody can explain why it is so funny.',
      body: ['A short video of a goldfish turning to face the camera has become the most watched clip of the month on TubeView.', 'The whole thing lasts eight seconds. The goldfish turns. The camera zooms in three times. That is it.', '"I have watched it 400 times," said one viewer. "I will watch it 400 more."'],
      links: [['Watch "Dramatic Goldfish" on TubeView', 'http://www.tubeview.com/watch?v=dramatic']] },
    { id: 'weekend', cat: 'Weather', img: 'icons/rainbow', title: 'Weekend forecast: sunshine, soft breezes and a real chance of rainbows',
      blurb: 'Pack a picnic. Meteorologists say this might be the nicest weekend of the season.',
      body: ['Good news for picnic fans: the weekend is shaping up to be warm, bright and breezy across most of the region.', 'A few passing showers on Sunday afternoon could bring sun showers, which forecasters say are "excellent rainbow weather."', 'Check the five-day forecast for your town before you head out, and bring a kite.'],
      links: [['Five-day forecast on SkyCast', 'http://www.skycast.com/']] },
  ];
  const SIGNS = [
    ['aries', 'Aries', 'Mar 21 - Apr 19'], ['taurus', 'Taurus', 'Apr 20 - May 20'], ['gemini', 'Gemini', 'May 21 - Jun 20'], ['cancer', 'Cancer', 'Jun 21 - Jul 22'],
    ['leo', 'Leo', 'Jul 23 - Aug 22'], ['virgo', 'Virgo', 'Aug 23 - Sep 22'], ['libra', 'Libra', 'Sep 23 - Oct 22'], ['scorpio', 'Scorpio', 'Oct 23 - Nov 21'],
    ['sagittarius', 'Sagittarius', 'Nov 22 - Dec 21'], ['capricorn', 'Capricorn', 'Dec 22 - Jan 19'], ['aquarius', 'Aquarius', 'Jan 20 - Feb 18'], ['pisces', 'Pisces', 'Feb 19 - Mar 20'],
  ];
  const HORO = {
    a: ['Today is a great day to change your glass color.', 'A friend is about to nudge you. Nudge back, gently.', 'Something shiny catches your eye this afternoon.', 'Your inbox is calmer than you think.', 'A song you forgot about will come back on shuffle.', 'The stars suggest you finally organize your desktop icons.'],
    b: ['Say yes to the small adventure.', 'Clear skies mean clear thinking.', 'Be patient with slow downloads; good things are buffering.', 'A new friend request brings good news.', 'Water brings you luck, so refill your glass.', 'Take the scenic route, even online.'],
    c: ['Lucky color: lime.', 'Lucky color: sky blue.', 'Lucky number: 7.', 'Lucky screensaver: bubbles.', 'Lucky ringtone: the default one.', 'Lucky snack: anything crunchy.'],
  };
  const QUIZ = [
    { q: 'Why are free-floating soap bubbles round?', o: ['A sphere holds the most air with the least surface', 'Wind presses them into shape', 'Soap molecules are round'], a: 0, f: 'Surface tension pulls the film into the shape with the smallest area for its volume: a sphere.' },
    { q: 'What causes the green glow of an aurora?', o: ['Oxygen high in the atmosphere', 'Reflections off sea ice', 'Moonlight on clouds'], a: 0, f: 'Charged particles from the Sun excite oxygen atoms about 100 to 300 km up, and they give off green light.' },
    { q: 'How long can a well cared for goldfish live?', o: ['About 1 year', '10 years or more', 'About 3 months'], a: 1, f: 'Goldfish can live well over a decade in a big, filtered tank. Some have passed 30!' },
    { q: 'What is a group of dolphins called?', o: ['A flock', 'A pod', 'A crew'], a: 1, f: 'Dolphins live in pods, and some pods team up into groups of hundreds.' },
    { q: 'About how much of Earth\'s surface is covered by water?', o: ['About 50%', 'About 71%', 'About 90%'], a: 1, f: 'Roughly 71 percent of the planet is ocean, lakes and rivers. No wonder the style loves water.' },
    { q: 'Which gas makes up most of the air we breathe?', o: ['Oxygen', 'Nitrogen', 'Carbon dioxide'], a: 1, f: 'Air is about 78 percent nitrogen and about 21 percent oxygen.' },
    { q: 'Roughly how many megabytes are in a gigabyte?', o: ['100', '1,024', '1,000,000'], a: 1, f: 'Computers count in powers of two, so a gigabyte is 1,024 megabytes (or 1,000, if you ask a hard drive box).' },
    { q: 'What makes the colors swirl on a soap bubble?', o: ['Thin-film interference', 'Food coloring in the soap', 'The bubble spinning'], a: 0, f: 'Light bouncing off the inner and outer surfaces of the film interferes, and the colors change as the film thins.' },
  ];

  function aliveRender(ctx) {
    const p = ctx.parts;
    if (!p.length) return alHome(ctx);
    if (p[0] === 'news' && p[1]) {
      const s = STORIES.find((x) => x.id === p[1]);
      return s ? alStory(ctx, s) : ctx.notFound();
    }
    if (p[0] === 'news') return alNewsIndex(ctx);
    if (p[0] === 'horoscope') return alHoroscope(ctx, p[1]);
    if (p[0] === 'mail') return alMail(ctx);
    return ctx.notFound();
  }

  function alFrame(ctx, inner) {
    const user = ctx.user();
    return `<div class="web-al"><div class="web-al-strip"><div class="web-al-wrap web-al-striprow">
      <nav><a href="http://home.aerium.net/">Aerium Live</a><a href="http://home.aerium.net/mail">Mail</a><a href="#" class="web-al-msgr">Messenger</a><a href="http://www.myspot.com/">Spaces</a><a href="http://www.glossr.com/">Photos</a><a href="http://www.minigames.com/">Games</a><a href="http://www.skycast.com/">Weather</a></nav>
      <span class="web-al-hello">Hello, <b>${esc(user.name)}</b> | <a href="#" class="web-al-signout">Sign out</a></span></div></div>
      <div class="web-al-wrap">
        <div class="web-al-head">
          <a class="web-al-logo" href="http://home.aerium.net/">${K.reflect(`${K.img('icons/aerium', 'web-al-orb')}<span class="web-al-word">Aerium</span><span class="web-al-live">Live</span>`, 'web-al-refl')}</a>
          <form class="web-al-search" action="http://www.bubblesearch.com/search"><input name="q" type="text" placeholder="Search the web" autocomplete="off"><button type="submit" class="wk-gbtn web-al-go">Search</button><span class="web-al-by">powered by <b>Bubble</b></span></form>
        </div>
        ${inner}
        <div class="web-al-foot"><a href="http://home.aerium.net/news">All news</a> | <a href="http://www.aeropedia.org/wiki/Aerium">About Aerium</a> | <a href="#" class="web-al-privacy">Privacy</a> | <a href="#" class="web-al-privacy">Legal</a> | <a href="http://www.bubblesearch.com/">Search</a> | <a href="http://www.free-screensavers-4u.com/">Advertise</a><div>&copy; 2007 Aerium. Made of glass and good intentions.</div></div>
      </div></div>`;
  }
  function alWire(ctx, root) {
    const m = root.querySelector('.web-al-msgr');
    if (m) m.addEventListener('click', (e) => { e.preventDefault(); if (!ctx.openApp('messenger')) ctx.dialog({ title: 'Aerium Live', icon: 'icons/chat', instruction: 'Messenger is signing in...', message: 'Bubble Messenger could not be found on this computer.' }); });
    const so = root.querySelector('.web-al-signout');
    if (so) so.addEventListener('click', (e) => { e.preventDefault(); ctx.dialog({ title: 'Aerium Live', icon: 'info', instruction: 'You cannot sign out of Aerium Live', message: 'Aerium Live likes you too much. Also, there is no sign-in page. Enjoy the headlines!' }); });
    root.querySelectorAll('.web-al-privacy').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); ctx.dialog({ title: 'Aerium Live', icon: 'shield', instruction: 'Our privacy promise', message: 'Aerium Live does not collect anything. It does not even know how. Your data stays right here in this computer, next to the fish.' }); }));
  }

  function alHome(ctx) {
    ctx.title('Aerium Live - Home');
    const user = ctx.user();
    const hr = new Date().getHours();
    const greet = hr < 5 ? 'Up late' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const day = K.dayNumber();
    const order = STORIES.slice().sort((a, b) => K.hash(a.id + day) - K.hash(b.id + day));
    const feature = STORIES.find((s) => s.id === 'aurora-season');
    const headlines = order.filter((s) => s !== feature).slice(0, 7);
    const city = ctx.store.get('skycast.city', 'Springfield');
    const wx = K.weather(city);
    const unitsC = ctx.store.get('skycast.units', 'F') === 'C';
    const T = (f) => (unitsC ? K.toC(f) : f) + '&deg;';
    const signIdx = ctx.store.get('aerium.sign', 5);
    const quiz = QUIZ[day % QUIZ.length];
    const qState = ctx.store.get('aerium.quiz', null);
    const answered = qState && qState.day === day ? qState.choice : null;
    const popular = [
      ['Watch: a goldfish gets dramatic (48 million views)', 'http://www.tubeview.com/watch?v=dramatic'],
      ['Kayla has the most glittery profile on MySpot', 'http://www.myspot.com/kayla'],
      ['Play Bubble Copter: can you beat 2,000?', 'http://www.minigames.com/game/copter'],
      ['Quiz: Which glass color are you?', 'http://www.quizbubble.com/'],
      ['Adopt a virtual fish and keep it happy', 'http://www.fishpals.com/'],
      ['10 free screensavers (what could go wrong?)', 'http://www.free-screensavers-4u.com/'],
      ['Forum: What is your favorite glass color?', 'http://forums.aerofans.net/viewtopic?t=1'],
      ['Send a free e-card to someone nice', 'http://www.bubblecards.com/'],
    ];
    const inner = `
      <div class="web-al-date">${esc(A.util.fmtLongDate())} <span class="web-al-dot"></span> ${greet}, ${esc(user.name)}! You have <a href="http://home.aerium.net/mail">0 new messages</a>.</div>
      <div class="web-al-cols">
        <div class="web-al-left">
          <div class="web-al-box"><div class="web-al-boxh">Today's headlines</div><ul class="web-al-heads">
            ${headlines.map((s) => `<li><a href="/news/${s.id}">${K.img(s.img, 'web-al-hthumb')}<span><b>${esc(s.title)}</b><small>${esc(s.cat)}</small></span></a></li>`).join('')}
          </ul><div class="web-al-more"><a href="/news">More headlines &raquo;</a></div></div>
          <div class="web-al-box web-al-ad"><div class="web-al-adlabel">Advertisement</div><a href="http://www.fishpals.com/" class="web-al-adbox">${K.img('icons/fish', 'web-al-adfish')}<b>Adopt a fish today!</b><span>Your new best friend is waiting at FishPals.</span><span class="wk-gbtn web-al-adbtn">Adopt now</span></a></div>
        </div>
        <div class="web-al-mid">
          <a class="web-al-feature" href="/news/${feature.id}">${K.img(feature.img, 'web-al-fimg', 'Aurora over the northern sky')}<span class="web-al-fcap"><small>${esc(feature.cat)}</small><b>${esc(feature.title)}</b><span>${esc(feature.blurb)}</span></span></a>
          <div class="web-al-box"><div class="web-al-boxh">Top stories</div>
            <div class="web-al-stories">${order.slice(0, 4).map((s) => `<a class="web-al-story" href="/news/${s.id}">${K.img(s.img, 'web-al-sthumb')}<b>${esc(s.title)}</b><span>${esc(s.blurb)}</span></a>`).join('')}</div></div>
          <div class="web-al-box web-al-channels"><div class="web-al-chtext"><div class="web-al-chtitle">Aerium Channels</div><p>All your favorite things, laid out like TV channels. Weather, photos, music and a very calm fish tank.</p><button type="button" class="wk-gbtn web-al-chbtn">Open Channels</button></div><div class="web-al-chtiles"><span>${K.img('icons/aquarium')}</span><span>${K.img('icons/photo')}</span><span>${K.img('icons/music')}</span><span>${K.img('icons/cloud')}</span><span>${K.img('icons/gamepad')}</span><span>${K.img('icons/globe')}</span></div></div>
          <div class="web-al-two">
            <div class="web-al-box"><div class="web-al-boxh">Entertainment</div><ul class="web-al-list">${STORIES.filter((s) => s.cat === 'Entertainment' || s.cat === 'Web').map((s) => `<li><a href="/news/${s.id}">${esc(s.title)}</a></li>`).join('')}<li><a href="http://www.tubeview.com/">Today on TubeView: bubble wrap, sunsets and a very brave stick figure</a></li></ul></div>
            <div class="web-al-box"><div class="web-al-boxh">Tech and science</div><ul class="web-al-list">${STORIES.filter((s) => s.cat === 'Tech' || s.cat === 'Science').map((s) => `<li><a href="/news/${s.id}">${esc(s.title)}</a></li>`).join('')}</ul></div>
          </div>
        </div>
        <div class="web-al-right">
          <div class="web-al-box web-al-wx ${wx.night ? 'night' : ''}"><div class="web-al-boxh">Weather <a href="http://www.skycast.com/forecast?city=${encodeURIComponent(wx.city)}" class="web-al-boxlink">Change</a></div>
            <div class="web-al-wxnow"><span class="web-al-wxicons">${K.img(wx.now.icon, 'web-al-wxi')}${wx.now.icon2 ? K.img(wx.now.icon2, 'web-al-wxi2') : ''}</span><span class="web-al-wxt">${T(wx.now.temp)}</span><span class="web-al-wxc"><b>${esc(wx.city)}, ${wx.region}</b>${esc(wx.now.label)}<br>High ${T(wx.days[0].hi)} Low ${T(wx.days[0].lo)}</span></div>
            <div class="web-al-wxdays">${wx.days.slice(1, 4).map((d) => `<span>${d.short}${K.img(d.icon)}<b>${T(d.hi)}</b> ${T(d.lo)}</span>`).join('')}</div>
            <div class="web-al-wxfoot"><a href="http://www.skycast.com/forecast?city=${encodeURIComponent(wx.city)}">Full forecast on SkyCast &raquo;</a></div></div>
          <div class="web-al-box"><div class="web-al-boxh">Horoscope</div><div class="web-al-horo"><select class="web-al-sign">${SIGNS.map((s, i) => `<option value="${i}" ${i === signIdx ? 'selected' : ''}>${s[1]} (${s[2]})</option>`).join('')}</select><p class="web-al-reading"></p><a href="#" class="web-al-horolink">Read your full horoscope &raquo;</a></div></div>
          <div class="web-al-box"><div class="web-al-boxh">Quiz of the day</div><div class="web-al-quiz"><p class="web-al-q">${esc(quiz.q)}</p>${quiz.o.map((o, i) => `<button type="button" class="web-al-qo${answered != null ? (i === quiz.a ? ' right' : i === answered ? ' wrong' : '') : ''}" data-i="${i}" ${answered != null ? 'disabled' : ''}>${esc(o)}</button>`).join('')}<p class="web-al-qres">${answered != null ? (answered === quiz.a ? '<b>Correct!</b> ' : '<b>Not quite.</b> ') + esc(quiz.f) : ''}</p></div></div>
          <div class="web-al-box"><div class="web-al-boxh">Most popular</div><ol class="web-al-pop">${popular.map(([t, u], i) => `<li><span>${i + 1}</span><a href="${u}">${esc(t)}</a></li>`).join('')}</ol></div>
        </div>
      </div>`;
    const root = ctx.html(alFrame(ctx, inner));
    alWire(ctx, root);
    const sel = root.querySelector('.web-al-sign');
    const reading = root.querySelector('.web-al-reading');
    const link = root.querySelector('.web-al-horolink');
    const paintHoro = () => {
      const i = Number(sel.value);
      const r = K.rng(SIGNS[i][0] + day);
      const pk = (arr) => arr[Math.floor(r() * arr.length)];
      reading.textContent = pk(HORO.a) + ' ' + pk(HORO.b) + ' ' + pk(HORO.c);
      link.setAttribute('data-href', '/horoscope/' + SIGNS[i][0]);
    };
    sel.addEventListener('change', () => { ctx.store.set('aerium.sign', Number(sel.value)); paintHoro(); });
    paintHoro();
    root.querySelectorAll('.web-al-qo').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.i);
      ctx.store.set('aerium.quiz', { day, choice: i });
      root.querySelectorAll('.web-al-qo').forEach((x) => { x.disabled = true; const j = Number(x.dataset.i); if (j === quiz.a) x.classList.add('right'); else if (j === i) x.classList.add('wrong'); });
      root.querySelector('.web-al-qres').innerHTML = (i === quiz.a ? '<b>Correct!</b> ' : '<b>Not quite.</b> ') + esc(quiz.f);
      ctx.sound(i === quiz.a ? 'win' : 'ding');
    }));
    root.querySelector('.web-al-chbtn').addEventListener('click', () => { if (!ctx.openApp('channels')) ctx.go('http://www.aeropedia.org/wiki/Aerium'); });
  }

  function alStory(ctx, s) {
    ctx.title(s.title + ' - Aerium Live News');
    const idx = STORIES.indexOf(s);
    const rel = [STORIES[(idx + 1) % STORIES.length], STORIES[(idx + 3) % STORIES.length], STORIES[(idx + 5) % STORIES.length]];
    const hours = 1 + (K.hash(s.id) % 9);
    const inner = `<div class="web-al-cols web-al-article">
      <div class="web-al-mid web-al-wide">
        <div class="web-al-box web-al-storybox">
          <div class="web-al-crumb"><a href="http://home.aerium.net/">Home</a> &raquo; <a href="/news">News</a> &raquo; ${esc(s.cat)}</div>
          <h1 class="web-al-h1">${esc(s.title)}</h1>
          <div class="web-al-byline">By the Aerium Live news team <span class="web-al-dot"></span> Updated ${hours} hour${hours > 1 ? 's' : ''} ago</div>
          <div class="web-al-storyimg">${K.img(s.img, s.img.startsWith('imagery') ? 'web-al-photo' : 'web-al-iconart', s.title)}</div>
          <p class="web-al-lede">${esc(s.blurb)}</p>
          ${s.body.map((p) => `<p>${esc(p)}</p>`).join('')}
          <div class="web-al-links">${s.links.map(([t, u]) => `<a href="${u}">${esc(t)} &raquo;</a>`).join('')}</div>
          <div class="web-al-rate">Rate this story: <span class="web-al-rstars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} stars"></button>`).join('')}</span><span class="web-al-rthanks"></span></div>
          <div class="web-al-share">Share: <a href="#" class="web-al-sh" data-w="E-mail">E-mail</a> <a href="#" class="web-al-sh" data-w="Glossr">Glossr it!</a> <a href="#" class="web-al-sh" data-w="MySpot">Post to MySpot</a> <a href="#" class="web-al-sh" data-w="Print">Print</a></div>
        </div>
      </div>
      <div class="web-al-right"><div class="web-al-box"><div class="web-al-boxh">Related stories</div><ul class="web-al-heads">${rel.map((r) => `<li><a href="/news/${r.id}">${K.img(r.img, 'web-al-hthumb')}<span><b>${esc(r.title)}</b><small>${esc(r.cat)}</small></span></a></li>`).join('')}</ul></div>
        <div class="web-al-box web-al-ad"><div class="web-al-adlabel">Advertisement</div><a href="http://www.tubeview.com/" class="web-al-adbox">${K.img('icons/video', 'web-al-adfish')}<b>Broadcast your bubbles</b><span>Millions of videos. All of them about eight seconds long.</span><span class="wk-gbtn web-al-adbtn">Watch now</span></a></div></div>
    </div>`;
    const root = ctx.html(alFrame(ctx, inner));
    alWire(ctx, root);
    const btns = root.querySelectorAll('.web-al-rstars button');
    const saved = ctx.store.get('aerium.rate.' + s.id, 0);
    const paint = (n) => btns.forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= n));
    paint(saved);
    btns.forEach((b) => {
      b.addEventListener('mouseenter', () => paint(Number(b.dataset.n)));
      b.addEventListener('mouseleave', () => paint(ctx.store.get('aerium.rate.' + s.id, 0)));
      b.addEventListener('click', () => { ctx.store.set('aerium.rate.' + s.id, Number(b.dataset.n)); paint(Number(b.dataset.n)); root.querySelector('.web-al-rthanks').textContent = 'Thanks for rating!'; ctx.sound('click'); });
    });
    root.querySelectorAll('.web-al-sh').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const w = a.dataset.w;
      if (w === 'Glossr') ctx.go('http://www.glossr.com/');
      else if (w === 'MySpot') ctx.go('http://www.myspot.com/');
      else ctx.dialog({ title: 'Aerium Live', icon: w === 'Print' ? 'warning' : 'icons/mail', instruction: w === 'Print' ? 'The printer is out of cyan' : 'Story sent!', message: w === 'Print' ? 'It is always out of cyan.' : 'We sent this story to your friends. (We did not. But it is the thought that counts.)' });
    }));
  }

  function alNewsIndex(ctx) {
    ctx.title('Aerium Live News');
    const cats = Array.from(new Set(STORIES.map((s) => s.cat)));
    const inner = `<div class="web-al-cols web-al-article"><div class="web-al-mid web-al-wide"><div class="web-al-box web-al-storybox"><h1 class="web-al-h1">All the news that fits in a bubble</h1>
      ${cats.map((c) => `<h2 class="web-al-h2">${esc(c)}</h2><ul class="web-al-heads web-al-headsbig">${STORIES.filter((s) => s.cat === c).map((s) => `<li><a href="/news/${s.id}">${K.img(s.img, 'web-al-hthumb')}<span><b>${esc(s.title)}</b><small>${esc(s.blurb)}</small></span></a></li>`).join('')}</ul>`).join('')}
      </div></div><div class="web-al-right"><div class="web-al-box"><div class="web-al-boxh">Elsewhere</div><ul class="web-al-list"><li><a href="http://www.skycast.com/">Weather on SkyCast</a></li><li><a href="http://www.tubeview.com/">Videos on TubeView</a></li><li><a href="http://www.aeropedia.org/wiki/Main_Page">Look it up on Aeropedia</a></li></ul></div></div></div>`;
    alWire(ctx, ctx.html(alFrame(ctx, inner)));
  }

  function alHoroscope(ctx, id) {
    const i = Math.max(0, SIGNS.findIndex((s) => s[0] === id));
    const s = SIGNS[i];
    ctx.title(s[1] + ' horoscope - Aerium Live');
    const day = K.dayNumber();
    const block = (off, label) => {
      const r = K.rng(s[0] + (day + off));
      const pk = (arr) => arr[Math.floor(r() * arr.length)];
      return `<h2 class="web-al-h2">${label}</h2><p>${pk(HORO.a)} ${pk(HORO.b)} ${pk(HORO.b)} ${pk(HORO.c)}</p>`;
    };
    const inner = `<div class="web-al-cols web-al-article"><div class="web-al-mid web-al-wide"><div class="web-al-box web-al-storybox"><h1 class="web-al-h1">${s[1]} <small>${s[2]}</small></h1>${block(0, 'Today')}${block(1, 'Tomorrow')}<h2 class="web-al-h2">Other signs</h2><div class="web-al-signs">${SIGNS.map((x) => `<a href="/horoscope/${x[0]}">${x[1]}</a>`).join('')}</div><p class="web-al-fine">Horoscopes are for entertainment only. The fish, however, are always right.</p></div></div></div>`;
    alWire(ctx, ctx.html(alFrame(ctx, inner)));
  }

  function alMail(ctx) {
    ctx.title('Aerium Live Mail - Inbox');
    const inner = `<div class="web-al-cols web-al-article"><div class="web-al-mid web-al-wide"><div class="web-al-box web-al-storybox web-al-mail">
      <h1 class="web-al-h1">Inbox <small>(0 unread)</small></h1>
      <div class="web-al-mailbar"><button type="button" class="wk-gbtn web-al-new">New message</button><span>Your inbox is squeaky clean. Enjoy the quiet.</span></div>
      <table class="web-al-mailtable"><tr><th>From</th><th>Subject</th><th>Date</th></tr>
      <tr><td>Aerium Live team</td><td><b>Welcome to Aerium Live Mail!</b> You have 2 GB of free storage. That is like a million e-mails.</td><td>${K.shortDate(Date.now() - 86400000 * 12)}</td></tr>
      <tr><td>Kayla</td><td>FW: FW: FW: send this to 10 ppl or ur glass turns beige!!!</td><td>${K.shortDate(Date.now() - 86400000 * 3)}</td></tr>
      <tr><td>MySpot</td><td>You have 1 new friend request</td><td>${K.shortDate(Date.now() - 86400000 * 2)}</td></tr>
      <tr><td>Glossr</td><td>Your invite to the Glossr beta is here</td><td>${K.shortDate(Date.now() - 86400000)}</td></tr></table>
    </div></div></div>`;
    const root = ctx.html(alFrame(ctx, inner));
    alWire(ctx, root);
    root.querySelector('.web-al-new').addEventListener('click', () => { if (!ctx.openApp('messenger')) ctx.dialog({ title: 'Aerium Live Mail', icon: 'icons/mail', message: 'Composing is not available right now. Try again in 2007.' }); });
  }

  W.register({
    id: 'aerium-live', host: 'home.aerium.net', aliases: ['aerium.net', 'www.aerium.net', 'live.aerium.net'],
    title: 'Aerium Live', shortTitle: 'Aerium Live', icon: 'icons/aerium', favicon: 'icons/aerium',
    pages: () => [{ path: '/', title: 'Aerium Live - Home', text: 'Aerium Live home page portal headlines news weather horoscope quiz of the day most popular channels search the web mail messenger' }]
      .concat(STORIES.map((s) => ({ path: '/news/' + s.id, title: s.title + ' - Aerium Live News', text: s.blurb + ' ' + s.body.join(' ') })))
      .concat([{ path: '/horoscope/leo', title: 'Daily horoscope - Aerium Live', text: 'horoscope zodiac signs aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces lucky color lucky number' }]),
    render: aliveRender,
    css: `
.web-al { background: #eaf5fd linear-gradient(to bottom, #9fd3f7 0, #d6edfc 170px, #f1f8fe 420px, #f7fbfe 100%) no-repeat; color: #16293d; font: 400 calc(12px * var(--hz-text, 1))/1.45 "Segoe UI", Tahoma, Verdana, sans-serif; }
.web-al a { color: #0a57b0; text-decoration: none; }
.web-al a:hover { text-decoration: underline; }
.web-al-wrap { width: 980px; margin: 0 auto; }
.web-al-strip { background: linear-gradient(to bottom, #3a7cc4, #1d4f92); border-bottom: 1px solid #143a6e; color: #cfe6ff; font-size: .95em; }
.web-al-striprow { display: flex; justify-content: space-between; align-items: center; height: 26px; }
.web-al-strip nav a { color: #fff; margin-right: 14px; }
.web-al-strip a { color: #fff; }
.web-al-head { display: flex; align-items: center; gap: 34px; padding: 18px 8px 22px; }
.web-al-logo { display: inline-flex; text-decoration: none !important; }
.web-al-refl { display: inline-flex; align-items: center; gap: 8px; }
.web-al-refl > .wk-refl-copy { display: flex; align-items: center; gap: 8px; }
.web-al-orb { width: 46px; height: 46px; }
.web-al-word { font: 300 2.9em/1 "Segoe UI", Selawik, sans-serif; color: #0d3f78; letter-spacing: -.02em; }
.web-al-live { font: 700 1.25em/1 "Trebuchet MS", sans-serif; color: #fff; padding: 5px 11px; border-radius: 999px; border: 1px solid #2f8a1c; background: linear-gradient(to bottom, #b7f39a 0, #62cc3f 50%, #3aaa22 51%, #5fcf3c 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.7); text-shadow: 0 1px 1px rgba(0,60,0,.5); align-self: flex-start; margin-top: 2px; }
.web-al-search { display: flex; align-items: center; gap: 8px; flex: 1; }
.web-al-search input { flex: 1; max-width: 420px; height: 30px; padding: 0 12px; font: 1.15em "Segoe UI", Tahoma, sans-serif; border: 1px solid #7fa9cf; border-radius: 15px; background: #fff; box-shadow: inset 0 2px 3px rgba(0,40,90,.15), 0 0 0 3px rgba(255,255,255,.5); outline: none; }
.web-al-search input:focus { border-color: #2e86de; box-shadow: inset 0 2px 3px rgba(0,40,90,.15), 0 0 8px rgba(46,134,222,.6); }
.web-al-go { --c1: #9fd8ff; --c2: #2f8fe0; --c3: #1466b8; }
.web-al-by { color: #4a6a8a; font-size: .92em; }
.web-al-date { padding: 7px 12px; margin-bottom: 12px; background: rgba(255,255,255,.65); border: 1px solid #bcd9f0; border-radius: 6px; color: #33506d; }
.web-al-dot { display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #7fa9cf; vertical-align: middle; margin: 0 6px; }
.web-al-cols { display: grid; grid-template-columns: 250px minmax(0, 1fr) 264px; gap: 14px; align-items: start; }
.web-al-article { grid-template-columns: minmax(0, 1fr) 264px; }
.web-al-box { background: #fff; border: 1px solid #b9d4ea; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,50,110,.1); margin-bottom: 14px; overflow: hidden; }
.web-al-boxh { position: relative; padding: 6px 10px; font-weight: 700; font-size: 1.05em; color: #0d3f78; background: linear-gradient(to bottom, #fbfdff 0, #e6f2fc 50%, #d6e9f9 51%, #e9f4fd 100%); border-bottom: 1px solid #c3dbef; }
.web-al-boxlink { position: absolute; right: 10px; top: 6px; font-weight: 400; font-size: .9em; }
.web-al-heads { list-style: none; margin: 0; padding: 4px 0; }
.web-al-heads li a { display: flex; gap: 9px; align-items: flex-start; padding: 6px 10px; color: #16293d; }
.web-al-heads li a:hover { background: #eef6fd; text-decoration: none; }
.web-al-heads b { display: block; font-weight: 600; color: #0a57b0; line-height: 1.3; }
.web-al-heads small { color: #6c8298; }
.web-al-hthumb { width: 36px; height: 36px; flex: none; object-fit: cover; border-radius: 4px; }
.web-al-headsbig .web-al-hthumb { width: 44px; height: 44px; }
.web-al-more { padding: 4px 10px 8px; text-align: right; }
.web-al-feature { position: relative; display: block; height: 250px; border-radius: 8px; overflow: hidden; margin-bottom: 14px; border: 1px solid #0d3f78; box-shadow: 0 3px 10px rgba(0,40,90,.3); text-decoration: none !important; }
.web-al-fimg { width: 100%; height: 100%; object-fit: cover; display: block; }
.web-al-fcap { position: absolute; left: 0; right: 0; bottom: 0; padding: 40px 16px 14px; color: #fff; background: linear-gradient(to bottom, rgba(0,20,50,0), rgba(0,20,50,.85)); }
.web-al-fcap small { display: inline-block; padding: 1px 8px; border-radius: 9px; background: #37b24d; font-weight: 700; margin-bottom: 5px; }
.web-al-fcap b { display: block; font: 300 1.75em/1.15 "Segoe UI", Selawik, sans-serif; margin-bottom: 4px; text-shadow: 0 1px 3px rgba(0,0,0,.5); }
.web-al-fcap span { color: #d9ecff; }
.web-al-stories { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #e2eef8; }
.web-al-story { display: grid; grid-template-columns: 44px 1fr; gap: 3px 10px; padding: 10px; background: #fff; color: #33506d; }
.web-al-story:hover { background: #f3f9fe; text-decoration: none !important; }
.web-al-sthumb { grid-row: span 2; width: 44px; height: 44px; object-fit: cover; border-radius: 5px; }
.web-al-story b { color: #0a57b0; line-height: 1.3; }
.web-al-channels { display: flex; align-items: center; gap: 10px; padding: 14px; background: repeating-linear-gradient(to bottom, #fff 0 2px, #f1f5f9 2px 4px); }
.web-al-chtext { flex: 1; }
.web-al-chtitle { font: 500 1.6em/1.2 "M PLUS Rounded 1c", "Segoe UI", sans-serif; color: #3a4a58; }
.web-al-chtext p { margin: 4px 0 10px; color: #56636e; }
.web-al-chbtn { --c1: #e8f6ff; --c2: #9fd0f5; --c3: #5ea7dd; color: #1e3a52 !important; text-shadow: 0 1px 0 rgba(255,255,255,.7); }
.web-al-chtiles { display: grid; grid-template-columns: repeat(3, 52px); gap: 6px; }
.web-al-chtiles span { display: grid; place-items: center; height: 40px; border-radius: 8px; border: 1px solid #b8c6d2; background: #fff; box-shadow: 0 1px 2px rgba(30,42,53,.12); }
.web-al-chtiles img { width: 28px; height: 28px; }
.web-al-two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.web-al-list { margin: 0; padding: 8px 10px 8px 26px; }
.web-al-list li { margin: 3px 0; }
.web-al-wx .web-al-wxnow { display: flex; align-items: center; gap: 8px; padding: 12px 10px 6px; background: linear-gradient(to bottom, #6fc0f5, #cdebfd); color: #0d2a4a; }
.web-al-wx.night .web-al-wxnow { background: linear-gradient(to bottom, #0d2f63, #3b6fa9); color: #eaf5ff; }
.web-al-wxicons { position: relative; width: 58px; height: 58px; flex: none; }
.web-al-wxi { width: 54px; height: 54px; }
.web-al-wxi2 { position: absolute; left: 14px; top: 20px; width: 44px; height: 44px; }
.web-al-wxt { font: 300 2.6em/1 "Segoe UI", Selawik, sans-serif; }
.web-al-wxc { font-size: .92em; line-height: 1.35; }
.web-al-wxc b { display: block; font-size: 1.1em; }
.web-al-wxdays { display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; padding: 6px 4px; border-top: 1px solid #d6e9f9; }
.web-al-wxdays span { display: flex; flex-direction: column; align-items: center; font-size: .92em; color: #4a6680; }
.web-al-wxdays img { width: 30px; height: 30px; margin: 2px 0; }
.web-al-wxdays b { color: #16293d; }
.web-al-wxfoot { padding: 4px 10px 8px; text-align: right; font-size: .92em; }
.web-al-horo { padding: 10px; }
.web-al-sign { width: 100%; padding: 3px; font: inherit; border: 1px solid #9bbad6; border-radius: 3px; }
.web-al-reading { margin: 8px 0; color: #33506d; min-height: 54px; }
.web-al-quiz { padding: 10px; }
.web-al-q { margin: 0 0 8px; font-weight: 600; }
.web-al-qo { display: block; width: 100%; margin: 4px 0; padding: 5px 8px; text-align: left; font: inherit; border: 1px solid #a9c7e2; border-radius: 5px; background: linear-gradient(#fff, #e8f2fb); cursor: pointer; color: #16293d; }
.web-al-qo:hover:not(:disabled) { border-color: #2e86de; background: linear-gradient(#fff, #d4e9fb); }
.web-al-qo.right { border-color: #2f9e2f; background: linear-gradient(#f0fff0, #c9f2c0); }
.web-al-qo.wrong { border-color: #c8412a; background: linear-gradient(#fff5f3, #f9d4cc); }
.web-al-qo:disabled { cursor: default; }
.web-al-qres { margin: 8px 0 0; color: #33506d; }
.web-al-pop { list-style: none; margin: 0; padding: 6px 10px; }
.web-al-pop li { display: flex; gap: 8px; align-items: flex-start; padding: 4px 0; border-bottom: 1px dotted #d3e3f1; }
.web-al-pop li:last-child { border: 0; }
.web-al-pop span { flex: none; width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; font-size: .85em; font-weight: 700; color: #fff; background: radial-gradient(circle at 50% 30%, #8fd3ff, #1f7fd6 70%); box-shadow: inset 0 1px 1px rgba(255,255,255,.6); }
.web-al-ad { background: #fffdf0; border-color: #e7d98a; }
.web-al-adlabel { font-size: .8em; color: #9a8a3a; padding: 3px 8px; text-transform: uppercase; letter-spacing: .08em; }
.web-al-adbox { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 12px 14px; text-align: center; color: #5a4a10 !important; text-decoration: none !important; }
.web-al-adbox b { font-size: 1.2em; color: #d35400; }
.web-al-adfish { width: 64px; height: 64px; animation: web-al-bob 3s ease-in-out infinite; }
.web-al-adbtn { --c1: #ffe38a; --c2: #ffb300; --c3: #e08a00; margin-top: 4px; }
@keyframes web-al-bob { 50% { transform: translateY(-6px) rotate(-4deg); } }
.web-al-foot { margin: 10px 0 0; padding: 14px 0 24px; text-align: center; color: #6c8298; border-top: 1px solid #c9dff1; }
.web-al-foot a { margin: 0 4px; }
.web-al-foot div { margin-top: 6px; }
.web-al-storybox { padding: 16px 22px 20px; font-size: 1.08em; line-height: 1.6; }
.web-al-crumb { font-size: .88em; color: #6c8298; margin-bottom: 8px; }
.web-al-h1 { font: 300 2em/1.2 "Segoe UI", Selawik, sans-serif; color: #0d3f78; margin: 0 0 6px; }
.web-al-h1 small { font-size: .5em; color: #6c8298; }
.web-al-h2 { font: 400 1.3em "Segoe UI", sans-serif; color: #0d3f78; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #d6e9f9; }
.web-al-byline { color: #6c8298; font-size: .88em; margin-bottom: 12px; }
.web-al-storyimg { text-align: center; margin: 4px 0 12px; }
.web-al-photo { width: 100%; height: 260px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,40,90,.25); }
.web-al-iconart { width: 140px; height: 140px; padding: 14px; border-radius: 16px; background: radial-gradient(circle at 50% 30%, #fff, #d9eefc); border: 1px solid #c3dbef; }
.web-al-lede { font-size: 1.12em; color: #33506d; font-weight: 600; }
.web-al-links { display: flex; flex-direction: column; gap: 4px; margin: 14px 0; padding: 10px 12px; border-radius: 6px; background: #f0f7fd; border: 1px solid #d3e6f6; }
.web-al-rate { display: flex; align-items: center; gap: 8px; margin: 10px 0 4px; font-size: .92em; color: #4a6680; }
.web-al-rstars { display: inline-flex; gap: 2px; }
.web-al-rstars button { width: 18px; height: 18px; padding: 0; border: 0; cursor: pointer; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M10 1.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L10 14.6l-5.2 2.9L6 11.6 1.6 7.6l5.9-.7z' fill='%23e3e3e3' stroke='%23aaa'/%3E%3C/svg%3E") center / contain no-repeat; }
.web-al-rstars button.on { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23fff3a8'/%3E%3Cstop offset='.5' stop-color='%23ffd62e'/%3E%3Cstop offset='.51' stop-color='%23ffb300'/%3E%3Cstop offset='1' stop-color='%23f08a12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M10 1.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L10 14.6l-5.2 2.9L6 11.6 1.6 7.6l5.9-.7z' fill='url(%23g)' stroke='%23b86a00'/%3E%3C/svg%3E"); }
.web-al-rthanks { color: #2f9e2f; font-weight: 600; }
.web-al-share { font-size: .92em; color: #4a6680; }
.web-al-share a { margin-right: 10px; }
.web-al-signs { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.web-al-fine { color: #8aa0b5; font-size: .85em; margin-top: 18px; }
.web-al-mailbar { display: flex; align-items: center; gap: 12px; margin: 10px 0; color: #4a6680; }
.web-al-mailtable { width: 100%; border-collapse: collapse; font-size: .95em; }
.web-al-mailtable th { text-align: left; padding: 5px 8px; background: linear-gradient(#f7fbfe, #e3f0fb); border-bottom: 1px solid #c3dbef; }
.web-al-mailtable td { padding: 6px 8px; border-bottom: 1px solid #e3eef8; vertical-align: top; }
.web-al-mailtable tr:hover td { background: #f3f9fe; }
`,
  });

  // ================================================================ www.bubblesearch.com
  const LOGO_COLORS = [['#6ec2ff', '#1a7fd9', '#0b4f9c'], ['#8ff08a', '#2fb52f', '#16741c'], ['#ffd17a', '#f58a0b', '#b35a00'], ['#6ec2ff', '#1a7fd9', '#0b4f9c'], ['#7fe8f5', '#15b0cc', '#0a6f86'], ['#8ff08a', '#2fb52f', '#16741c']];
  function bsLogo(small) {
    const letters = 'Bubble'.split('').map((c, i) => `<span style="--l1:${LOGO_COLORS[i][0]};--l2:${LOGO_COLORS[i][1]};--l3:${LOGO_COLORS[i][2]}">${c}</span>`).join('');
    const inner = `<span class="web-bs-letters">${letters}</span>`;
    return `<a class="web-bs-logo${small ? ' small' : ''}" href="http://www.bubblesearch.com/">${small ? inner : K.reflect(inner, 'web-bs-refl')}${small ? '' : '<i class="web-bs-b1"></i><i class="web-bs-b2"></i><i class="web-bs-b3"></i><i class="web-bs-b4"></i>'}</a>`;
  }
  function allPages() {
    const out = [];
    W.sites.forEach((site) => {
      let pages = [];
      try { pages = typeof site.pages === 'function' ? site.pages() : site.pages || []; } catch (e) { pages = []; }
      pages.forEach((p) => out.push({ url: 'http://' + site.host + p.path, title: p.title, text: p.text || '', site }));
    });
    return out;
  }
  const tokenize = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter((w) => w && w.length > 1 && !STOP.has(w));
  const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'for', 'is', 'it', 'at', 'by', 'with', 'what', 'how', 'my', 'your', 'you', 'i', 'are', 'be', 'do', 'www', 'com', 'http']);
  const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '').replace(/'$/, '');
  function searchIndex(q) {
    const words = tokenize(q);
    if (!words.length) return [];
    const stems = words.map(stem);
    const phrase = q.trim().toLowerCase();
    return allPages().map((p) => {
      const title = p.title.toLowerCase(), text = p.text.toLowerCase(), host = p.site.host.toLowerCase();
      let score = 0, hits = 0;
      stems.forEach((w) => {
        let hit = false;
        if (title.includes(w)) { score += 10; hit = true; }
        if (host.includes(w)) { score += 6; hit = true; }
        const m = text.split(w).length - 1;
        if (m) { score += Math.min(6, m) * 1.2; hit = true; }
        if (hit) hits++;
      });
      if (hits < Math.min(stems.length, 2) && stems.length > 1) score *= 0.35;
      if (phrase.length > 3 && (title.includes(phrase) || text.includes(phrase))) score += 8;
      if (p.url.endsWith('.com/') || p.url.endsWith('.net/') || p.url.endsWith('.org/')) score += hits ? 1.5 : 0;
      return { p, score };
    }).filter((x) => x.score > 1.5).sort((a, b) => b.score - a.score).map((x) => x.p);
  }
  function snippet(text, q) {
    const words = tokenize(q).map(stem);
    const lower = text.toLowerCase();
    let at = -1;
    words.forEach((w) => { const i = lower.indexOf(w); if (i >= 0 && (at < 0 || i < at)) at = i; });
    let start = Math.max(0, at - 60);
    if (start > 0) { const sp = text.indexOf(' ', start); if (sp > 0 && sp < at) start = sp + 1; }
    let s = text.slice(start, start + 170);
    const cut = s.lastIndexOf(' ');
    if (start + 170 < text.length && cut > 120) s = s.slice(0, cut);
    let html = esc(s);
    words.forEach((w) => { if (w.length > 1) html = html.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z]*)', 'gi'), '<b>$1</b>'); });
    return (start > 0 ? '... ' : '') + html + (start + 170 < text.length ? ' ...' : '');
  }
  function vocab() {
    const set = new Set();
    allPages().forEach((p) => tokenize(p.title + ' ' + p.text).forEach((w) => { if (w.length > 3) set.add(w); }));
    return Array.from(set);
  }
  function lev(a, b) {
    const m = a.length, n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function didYouMean(q) {
    const words = q.trim().toLowerCase().split(/\s+/);
    const v = vocab();
    let changed = false;
    const out = words.map((w) => {
      if (w.length < 4 || v.includes(w)) return w;
      let best = w, bd = w.length > 6 ? 3 : 2;
      v.forEach((c) => { if (Math.abs(c.length - w.length) <= 2) { const d = lev(w, c); if (d < bd) { bd = d; best = c; } } });
      if (best !== w) changed = true;
      return best;
    });
    return changed ? out.join(' ') : null;
  }
  const ADS = [
    ['Free Screensavers!!', 'www.free-screensavers-4u.com', 'Download 100% FREE screensavers now! Bubbles, fish, starfields. No catch*', 'http://www.free-screensavers-4u.com/'],
    ['Glossr: Share Your Gloss', 'www.glossr.com', 'The shiniest way to share photos with friends. Now in beta!', 'http://www.glossr.com/'],
    ['Adopt a Virtual Fish', 'www.fishpals.com', 'Feed it, name it, love it. Free forever. Fish not included (it is virtual).', 'http://www.fishpals.com/'],
    ['Hot New Ringtones', 'www.ringtonez4u.com', 'Polyphonic ringtones for your phone. Text TONE to 55-555. Seriously.', 'http://www.ringtonez4u.com/'],
    ['Play Free Games', 'www.minigames.com', 'Hundreds of free online games. Bubble Copter! Fish Food Frenzy!', 'http://www.minigames.com/'],
  ];

  function bsRender(ctx) {
    const p = ctx.parts;
    if (!p.length) return bsHome(ctx);
    if (p[0] === 'search') return bsResults(ctx);
    if (p[0] === 'lucky') return bsLucky(ctx);
    if (p[0] === 'cache') return bsCache(ctx);
    if (p[0] === 'images') return bsImages(ctx);
    if (p[0] === 'about') return bsAbout(ctx);
    if (p[0] === 'prefs') return bsPrefs(ctx);
    if (p[0] === 'advanced') return bsAdvanced(ctx);
    return ctx.notFound();
  }
  function bsTopbar(active) {
    const l = [['web', 'Web', '/'], ['images', 'Images', '/images'], ['videos', 'Videos', 'http://www.tubeview.com/'], ['news', 'News', 'http://home.aerium.net/news'], ['maps', 'Weather', 'http://www.skycast.com/']];
    return `<div class="web-bs-top"><nav>${l.map(([id, t, u]) => (id === active ? `<b>${t}</b>` : `<a href="${u}">${t}</a>`)).join('')}<a href="http://www.aeropedia.org/wiki/Main_Page">more &raquo;</a></nav><span><a href="/prefs">Preferences</a> | <a href="/about">About Bubble</a></span></div>`;
  }
  function bsHome(ctx) {
    ctx.title('Bubble');
    const root = ctx.html(`<div class="web-bs web-bs-home">${bsTopbar('web')}
      <div class="web-bs-center">
        ${bsLogo(false)}
        <form class="web-bs-form" action="/search"><div class="web-bs-boxrow"><input class="web-bs-q" name="q" type="text" autocomplete="off" spellcheck="false" aria-label="Search"><a class="web-bs-adv" href="/advanced">Advanced Search</a></div>
          <div class="web-bs-btns"><button type="submit" class="web-bs-btn">Bubble Search</button><button type="button" class="web-bs-btn web-bs-lucky">I'm Feeling Bubbly</button></div></form>
        <p class="web-bs-promo">New! Search the whole pretend web in under 0.2 seconds. <a href="/about">Learn more</a></p>
        <p class="web-bs-links"><a href="/about">About Bubble</a> <span></span> <a href="http://home.aerium.net/">Aerium Live</a> <span></span> <a href="/images">Image Search</a> <span></span> <a href="/prefs">Preferences</a></p>
        <p class="web-bs-copy">&copy;2007 Bubble. Made of 100% air.</p>
      </div></div>`);
    const q = root.querySelector('.web-bs-q');
    setTimeout(() => { if (ctx.visible()) q.focus(); }, 50);
    root.querySelector('.web-bs-lucky').addEventListener('click', () => ctx.go('/lucky?q=' + encodeURIComponent(q.value.trim())));
  }
  function bsHeader(q, active) {
    return `${bsTopbar(active || 'web')}<div class="web-bs-rhead">${bsLogo(true)}<form class="web-bs-rform" action="${active === 'images' ? '/images' : '/search'}"><input class="web-bs-q" name="q" type="text" value="${esc(q)}" autocomplete="off" spellcheck="false" aria-label="Search"><button type="submit" class="web-bs-btn">Search</button><span class="web-bs-rlinks"><a href="/advanced">Advanced Search</a><br><a href="/prefs">Preferences</a></span></form></div>`;
  }
  function bsResults(ctx) {
    const q = ctx.q('q').trim();
    if (!q) { ctx.go('/', { replace: true, noSound: true }); ctx.html('<div class="web-bs"></div>'); return; }
    ctx.title(q + ' - Bubble Search');
    const per = ctx.store.get('bubble.per', 10);
    const start = Math.max(0, parseInt(ctx.q('start'), 10) || 0);
    const results = searchIndex(q);
    const page = results.slice(start, start + per);
    const total = results.length ? (K.hash(q.toLowerCase()) % 9000 + 400) * 1000 + results.length * 137 : 0;
    const secs = (0.08 + (K.hash(q) % 30) / 100).toFixed(2);
    const dym = didYouMean(q);
    const bubbly = /bubbl/i.test(q);
    const pages = Math.ceil(results.length / per);
    const cur = Math.floor(start / per);
    const adPick = ADS.slice().sort((a, b) => K.hash(a[0] + q) - K.hash(b[0] + q)).slice(0, 3);
    const size = (url) => (8 + (K.hash(url) % 40)) + 'k';
    const body = page.length ? page.map((r) => `<div class="web-bs-r">
        <a class="web-bs-rt" href="${r.url}">${esc(r.title)}</a>
        <div class="web-bs-rs">${snippet(r.text || r.title, q)}</div>
        <div class="web-bs-ru"><span class="web-bs-green">${esc(r.url.replace(/^http:\/\//, ''))}</span> - ${size(r.url)} - <a href="/cache?u=${encodeURIComponent(r.url)}&amp;q=${encodeURIComponent(q)}">Cached</a> - <a href="/search?q=${encodeURIComponent('site:' + r.site.host)}">Similar pages</a></div>
      </div>`).join('') : `<div class="web-bs-none"><p>Your search - <b>${esc(q)}</b> - did not match any documents.</p><p>Suggestions:</p><ul><li>Make sure all words are spelled correctly.</li><li>Try different keywords.</li><li>Try more general keywords.</li><li>Or float over to one of these popular sites:</li></ul>
        <div class="web-bs-sugg">${W.sites.filter((s) => !s.hidden).slice(0, 10).map((s) => `<a href="http://${s.host}/">${K.img(s.icon || 'icons/globe')}<b>${esc(s.shortTitle || s.title)}</b><span>${esc(s.host)}</span></a>`).join('')}</div></div>`;
    const siteQ = /^site:(\S+)$/i.exec(q);
    const siteResults = siteQ ? allPages().filter((pp) => pp.site.host === siteQ[1].toLowerCase()) : null;
    const listHTML = siteResults ? siteResults.slice(start, start + per).map((r) => `<div class="web-bs-r"><a class="web-bs-rt" href="${r.url}">${esc(r.title)}</a><div class="web-bs-rs">${esc((r.text || '').slice(0, 160))}...</div><div class="web-bs-ru"><span class="web-bs-green">${esc(r.url.replace(/^http:\/\//, ''))}</span> - <a href="/cache?u=${encodeURIComponent(r.url)}">Cached</a></div></div>`).join('') : body;
    const count = siteResults ? siteResults.length : total;
    const nPages = siteResults ? Math.ceil(siteResults.length / per) : pages;
    const pager = nPages > 1 ? `<div class="web-bs-pager"><span class="web-bs-pword">Bu</span>${Array.from({ length: nPages }, (_, i) => (i === cur ? `<span class="web-bs-pb cur"><i></i>${i + 1}</span>` : `<a class="web-bs-pb" href="/search?q=${encodeURIComponent(q)}&amp;start=${i * per}"><i></i>${i + 1}</a>`)).join('')}<span class="web-bs-pword">ble</span>${cur < nPages - 1 ? `<a class="web-bs-next" href="/search?q=${encodeURIComponent(q)}&amp;start=${(cur + 1) * per}">Next &raquo;</a>` : ''}</div>` : '';
    const root = ctx.html(`<div class="web-bs web-bs-results">${bubbly ? '<div class="web-bs-float">' + Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i * 0.7) % 6}s;width:${10 + (i * 7) % 26}px;height:${10 + (i * 7) % 26}px"></i>`).join('') + '</div>' : ''}
      ${bsHeader(q)}
      <div class="web-bs-bar"><b>Web</b><span>${count ? `Results <b>${start + 1}</b> - <b>${Math.min(start + per, siteResults ? siteResults.length : start + page.length)}</b> of about <b>${K.num(count)}</b> for <b>${esc(q)}</b>. (<b>${secs}</b> seconds)` : ''}</span></div>
      <div class="web-bs-main">
        <div class="web-bs-list">${dym && !siteQ ? `<p class="web-bs-dym">Did you mean: <a href="/search?q=${encodeURIComponent(dym)}"><b><i>${esc(dym)}</i></b></a></p>` : ''}${listHTML}${pager}
          <form class="web-bs-rform web-bs-bottomform" action="/search"><input class="web-bs-q" name="q" type="text" value="${esc(q)}" autocomplete="off"><button type="submit" class="web-bs-btn">Search</button></form>
          <p class="web-bs-foot"><a href="/">Bubble Home</a> - <a href="/about">About Bubble</a> - <a href="/prefs">Search Preferences</a></p></div>
        <div class="web-bs-ads"><div class="web-bs-adsh">Sponsored Links</div>${adPick.map(([t, h, d, u]) => `<div class="web-bs-ad"><a href="${u}">${esc(t)}</a><div>${esc(d)}</div><span class="web-bs-green">${esc(h)}</span></div>`).join('')}</div>
      </div></div>`);
    return root;
  }
  function bsLucky(ctx) {
    const q = ctx.q('q').trim();
    let target;
    if (!q) {
      const all = allPages();
      target = all[Math.floor(Math.random() * all.length)].url;
    } else {
      const r = searchIndex(q);
      target = r.length ? r[0].url : '/search?q=' + encodeURIComponent(q);
    }
    ctx.title('Bubble');
    ctx.html('<div class="web-bs"><p class="web-bs-redirect">Floating you there...</p></div>');
    ctx.after(0, () => ctx.go(target, { replace: true, noSound: true }));
  }
  function bsCache(ctx) {
    const url = ctx.q('u');
    const q = ctx.q('q');
    ctx.title((url || 'Cache') + ' - Bubble Cache');
    const when = new Date(Date.now() - (2 + (K.hash(url) % 20)) * 86400000);
    const root = ctx.html(`<div class="web-bs-cache"><div class="web-bs-cachebar">This is <b>Bubble</b>'s cache of <a href="${esc(url)}">${esc(url)}</a> as retrieved on ${esc(K.shortDate(when))} 14:${String(K.hash(url) % 60).padStart(2, '0')}:07 GMT.<br>Bubble's cache is the snapshot that we took of the page as we floated through the web. The page may have changed since that time. <a href="${esc(url)}">Click here for the current page</a>.${q ? `<br>These search terms have been highlighted: <span class="web-bs-hl">${esc(q)}</span>` : ''}</div><div class="web-bs-cachebody"></div></div>`);
    const body = root.querySelector('.web-bs-cachebody');
    if (!url || !ctx.embed(url, body)) body.innerHTML = '<p style="padding:20px">This page is not in the cache. It floated away.</p>';
  }
  const IMAGE_TAGS = {
    'imagery/aurora': 'aurora night sky northern lights green', 'imagery/meadow': 'meadow grass green hills sky field', 'imagery/ocean': 'ocean sea water waves blue beach',
    'imagery/water': 'water underwater bubbles blue sea', 'imagery/sunrise': 'sunrise sun morning sky orange', 'imagery/clear-sky': 'sky clouds blue clear',
    'imagery/bokeh-day': 'bokeh lights blur bubbles', 'imagery/vectorgarden': 'garden flowers vector swirls butterfly', 'imagery/deep-sea': 'deep sea ocean fish dark',
    'imagery/bokeh-night': 'bokeh night lights city', 'imagery/dark-ribbons': 'ribbons dark lights abstract', 'imagery/technozen': 'white pearl calm clean',
    'icons/fish': 'fish goldfish pet orange', 'icons/dolphin': 'dolphin ocean sea animal', 'icons/bubble': 'bubble soap round', 'icons/butterfly': 'butterfly insect blue nature',
    'icons/flower': 'flower pink bloom nature', 'icons/tree': 'tree green nature', 'icons/leaf': 'leaf green nature', 'icons/sun': 'sun sunny weather', 'icons/rainbow': 'rainbow weather colors',
    'icons/cloud': 'cloud weather sky', 'icons/globe': 'globe earth world planet', 'icons/music': 'music note song', 'icons/heart': 'heart love red', 'icons/star': 'star gold favorite',
    'avatars/avatar-fish': 'goldfish bowl fish pet', 'avatars/avatar-dolphin': 'dolphin jump sea', 'avatars/avatar-flower': 'flower pink', 'avatars/avatar-butterfly': 'butterfly',
    'avatars/avatar-sun': 'sun summer', 'avatars/avatar-leaf': 'leaf green', 'avatars/avatar-globe': 'globe earth', 'avatars/avatar-music': 'music note',
    'icons/aquarium': 'aquarium fish tank bowl goldfish', 'icons/droplet': 'water drop droplet', 'icons/snow': 'snow winter weather', 'icons/mountain': 'mountain snow peak',
  };
  function bsImages(ctx) {
    const q = ctx.q('q').trim();
    ctx.title((q ? q + ' - ' : '') + 'Bubble Image Search');
    const words = tokenize(q).map(stem);
    const hits = Object.entries(IMAGE_TAGS).filter(([k, t]) => !words.length || words.some((w) => t.includes(w) || k.includes(w)));
    const list = (q ? hits : Object.entries(IMAGE_TAGS)).map(([k]) => {
      const name = k.split('/').pop().replace(/^avatar-/, '') + (k.startsWith('imagery') ? '_wallpaper.jpg' : '.png');
      const dims = k.startsWith('imagery') ? '1600 x 1000 - 312k' : k.startsWith('avatars') ? '96 x 96 - 9k' : '64 x 64 - 6k';
      return `<div class="web-bs-img"><a href="#" data-k="${k}">${K.img(k, '', name)}</a><span>${esc(name)}</span><small>${dims}</small></div>`;
    }).join('');
    const root = ctx.html(`<div class="web-bs web-bs-results">${bsHeader(q, 'images')}<div class="web-bs-bar"><b>Images</b><span>${q ? `Showing ${hits.length} images for <b>${esc(q)}</b>` : 'Popular images on the pretend web'}</span></div>
      <div class="web-bs-imgs">${list || `<p class="web-bs-none">Your search - <b>${esc(q)}</b> - did not match any images. Try "fish", "sky" or "bubble".</p>`}</div>
      <p class="web-bs-foot">Tip: right-click an image and choose "Set as Background" to make it your wallpaper.</p></div>`);
    root.querySelectorAll('.web-bs-img a').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const k = a.dataset.k;
      ctx.dialog({ title: 'Bubble Image Search', icon: k, instruction: k.split('/').pop(), message: 'Right-click the picture and choose "Save Picture As..." to keep it, or "Set as Background" to put it on your desktop.' });
    }));
  }
  function bsAbout(ctx) {
    ctx.title('About Bubble');
    ctx.html(`<div class="web-bs web-bs-results">${bsHeader('')}<div class="web-bs-page"><h1>About Bubble</h1>
      <p>Bubble's mission is to organize the pretend web and make it universally floaty. We index every page on the Aerium web, which takes us about 0.2 seconds, and then we have the rest of the day off.</p>
      <h2>Ten things we know to be true</h2><ol><li>Focus on the user and the bubbles will follow.</li><li>It is best to do one thing really, really well. We float.</li><li>Fast is better than slow, unless you picked Dial-up in Internet Options.</li><li>You can make money without being annoying. (See: not every site on this web.)</li><li>There is always more information out there. Well, not here. We have about sixty pages.</li><li>You can be serious without a suit. Or with a very shiny one.</li><li>Great just isn't good enough. It should also be glossy.</li><li>The need for information crosses all borders, and all windows.</li><li>Democracy on the web works: every link counts as a tiny bubble vote.</li><li>You don't need to be at your desk to need an answer. But it helps if the desk has a computer.</li></ol>
      <h2>Bubble tips</h2><ul><li>Type <b>site:www.myspot.com</b> to see every page on one website.</li><li>Click <b>I'm Feeling Bubbly</b> with an empty box to visit a random page.</li><li>Search for anything with "bubble" in it. Just trust us.</li></ul></div></div>`);
  }
  function bsPrefs(ctx) {
    ctx.title('Bubble Preferences');
    const per = ctx.store.get('bubble.per', 10);
    const root = ctx.html(`<div class="web-bs web-bs-results">${bsHeader('')}<div class="web-bs-page"><h1>Preferences</h1>
      <table class="web-bs-prefs"><tr><th>Interface language</th><td><select><option>English</option><option>Bubble (glub glub)</option></select></td></tr>
      <tr><th>SafeSearch filtering</th><td><label><input type="radio" name="ss" checked> Use moderate filtering</label><br><label><input type="radio" name="ss"> Use strict filtering (removes anything too shiny)</label></td></tr>
      <tr><th>Number of results</th><td>Bubble's default (10 results) provides the fastest results.<br>Display <select class="web-bs-per">${[10, 20, 30].map((n) => `<option ${n === per ? 'selected' : ''}>${n}</option>`).join('')}</select> results per page.</td></tr></table>
      <p><button type="button" class="web-bs-btn web-bs-save">Save Preferences</button> <span class="web-bs-saved"></span></p></div></div>`);
    root.querySelector('.web-bs-save').addEventListener('click', () => { ctx.store.set('bubble.per', Number(root.querySelector('.web-bs-per').value)); root.querySelector('.web-bs-saved').textContent = 'Your preferences have been saved.'; ctx.sound('ding'); });
  }
  function bsAdvanced(ctx) {
    ctx.title('Bubble Advanced Search');
    const root = ctx.html(`<div class="web-bs web-bs-results">${bsHeader('')}<div class="web-bs-page"><h1>Advanced Search</h1>
      <form class="web-bs-advform"><table class="web-bs-prefs">
        <tr><th>Find results</th><td>with <b>all</b> of the words <input name="all" type="text"></td></tr>
        <tr><th></th><td>with the <b>exact phrase</b> <input name="exact" type="text"></td></tr>
        <tr><th></th><td>with <b>at least one</b> of the words <input name="any" type="text"></td></tr>
        <tr><th>Shininess</th><td><select><option>any shininess</option><option>matte</option><option>glossy</option><option>extremely glossy</option></select></td></tr>
        <tr><th>Bubble count</th><td><select><option>any number of bubbles</option><option>1 - 10 bubbles</option><option>more bubbles than you can count</option></select></td></tr>
      </table><p><button type="submit" class="web-bs-btn">Advanced Search</button></p></form></div></div>`);
    root.querySelector('.web-bs-advform').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const q = [f.all.value, f.exact.value, f.any.value].filter((x) => x.trim()).join(' ');
      ctx.go('/search?q=' + encodeURIComponent(q || 'bubbles'));
    });
  }

  W.register({
    id: 'bubblesearch', host: 'www.bubblesearch.com', aliases: ['bubble.com', 'www.bubble.com', 'search.bubble.com'],
    title: 'Bubble', shortTitle: 'Bubble Search', icon: 'icons/search',
    favicon: '<svg viewBox="0 0 16 16"><circle cx="6" cy="9.5" r="5" fill="#2a8fe6" stroke="#0b4f9c" stroke-width=".7"/><circle cx="11.3" cy="5.6" r="3.9" fill="#3cc83c" stroke="#16741c" stroke-width=".7"/><circle cx="12" cy="12.2" r="2.9" fill="#f39a12" stroke="#b35a00" stroke-width=".7"/><ellipse cx="4.6" cy="7.4" rx="2" ry="1.3" fill="#fff" opacity=".8"/><ellipse cx="10.4" cy="4.2" rx="1.5" ry=".9" fill="#fff" opacity=".8"/></svg>',
    pages: [{ path: '/', title: 'Bubble', text: 'Bubble search engine. Search the pretend web. I\'m Feeling Bubbly. Image search. Advanced search. Preferences.' }, { path: '/about', title: 'About Bubble', text: 'About Bubble search: our mission is to organize the pretend web and make it universally floaty. Ten things we know to be true. Search tips.' }, { path: '/images', title: 'Bubble Image Search', text: 'image search pictures wallpapers photos icons fish sky aurora ocean meadow' }],
    render: bsRender,
    css: `
.web-bs { min-height: 100%; background: #fff; color: #000; font: calc(13px * var(--hz-text, 1)) Arial, "Helvetica Neue", Helvetica, Selawik, sans-serif; position: relative; overflow: hidden; }
.web-bs a { color: #1a44c2; }
.web-bs-home { background: #fff linear-gradient(to bottom, #e9f5ff 0, #fff 300px) no-repeat; }
.web-bs-top { display: flex; justify-content: space-between; padding: 6px 10px; font-size: .95em; }
.web-bs-top nav b, .web-bs-top nav a { margin-right: 12px; }
.web-bs-top a { color: #1a44c2; }
.web-bs-center { text-align: center; padding-top: 70px; }
.web-bs-logo { position: relative; display: inline-block; text-decoration: none !important; margin-bottom: 44px; }
.web-bs-letters { display: inline-flex; gap: 1px; font: 800 5.2em/1 "Arial Rounded MT Bold", "VAG Rounded", "Trebuchet MS", Verdana, sans-serif; letter-spacing: -.02em; }
.web-bs-letters span { background: linear-gradient(to bottom, #fff 0%, var(--l1) 18%, var(--l2) 50%, var(--l3) 52%, var(--l2) 88%, var(--l1) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 2px 1px rgba(0,30,80,.28)); -webkit-text-stroke: 1px rgba(0,30,80,.15); }
.web-bs-logo i { position: absolute; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff 0, rgba(255,255,255,.4) 25%, rgba(140,210,255,.25) 60%, rgba(60,160,230,.5) 100%); border: 1px solid rgba(80,160,230,.55); animation: web-bs-bob 4s ease-in-out infinite; }
.web-bs-b1 { width: 22px; height: 22px; right: -26px; top: 2px; }
.web-bs-b2 { width: 13px; height: 13px; right: -38px; top: 30px; animation-delay: -1.3s !important; }
.web-bs-b3 { width: 16px; height: 16px; left: -22px; top: 44px; animation-delay: -2.1s !important; }
.web-bs-b4 { width: 9px; height: 9px; left: -12px; top: 18px; animation-delay: -.6s !important; }
@keyframes web-bs-bob { 50% { transform: translateY(-7px); } }
.web-bs-refl .wk-refl-copy { opacity: .22; }
.web-bs-logo.small { margin: 0; }
.web-bs-logo.small .web-bs-letters { font-size: 2.3em; }
.web-bs-form { display: inline-block; }
.web-bs-boxrow { position: relative; }
.web-bs-q { width: 480px; height: 28px; padding: 2px 8px; font: 1.25em Arial, sans-serif; border: 1px solid #7f9db9; border-top-color: #5b7b9c; border-radius: 3px; box-shadow: inset 0 1px 2px rgba(0,0,0,.12); outline: none; }
.web-bs-q:focus { border-color: #3a8ee6; box-shadow: inset 0 1px 2px rgba(0,0,0,.12), 0 0 6px rgba(58,142,230,.5); }
.web-bs-adv { position: absolute; left: 100%; top: 6px; margin-left: 10px; font-size: .85em; white-space: nowrap; }
.web-bs-btns { margin-top: 14px; }
.web-bs-btn { margin: 0 4px; padding: 5px 14px; font: 1em Arial, sans-serif; color: #1c2c3c; border: 1px solid #8aa7c4; border-radius: 4px; cursor: pointer; background: linear-gradient(to bottom, #fff 0, #eef5fb 50%, #dce9f5 51%, #eaf3fb 100%); box-shadow: inset 0 1px 0 #fff; }
.web-bs-btn:hover { border-color: #3a8ee6; box-shadow: inset 0 1px 0 #fff, 0 0 5px rgba(58,142,230,.5); }
.web-bs-btn:active { background: linear-gradient(#dce9f5, #eef5fb); }
.web-bs-promo { margin-top: 28px; font-size: .95em; }
.web-bs-links { margin-top: 40px; font-size: .92em; }
.web-bs-links span { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #9cc6ec; margin: 0 6px; vertical-align: middle; }
.web-bs-copy { color: #777; font-size: .85em; }
.web-bs-rhead { display: flex; align-items: center; gap: 18px; padding: 8px 12px 10px; }
.web-bs-rform { display: flex; align-items: center; gap: 6px; }
.web-bs-rform .web-bs-q { width: 420px; height: 24px; font-size: 1.1em; }
.web-bs-rlinks { font-size: .75em; line-height: 1.3; margin-left: 4px; }
.web-bs-bar { display: flex; justify-content: space-between; align-items: center; padding: 4px 10px; border-top: 1px solid #5b95d6; background: linear-gradient(to bottom, #eef6fe, #d9ebfb); font-size: .95em; }
.web-bs-bar > b { font-size: 1.1em; }
.web-bs-main { display: flex; gap: 20px; padding: 0 12px; }
.web-bs-list { flex: 1; max-width: 620px; }
.web-bs-dym { color: #c00; font-size: 1.05em; margin: 12px 0 4px; }
.web-bs-r { margin: 16px 0; }
.web-bs-rt { font-size: 1.2em; text-decoration: underline; }
.web-bs-rs { font-size: .95em; line-height: 1.35; margin: 2px 0; }
.web-bs-ru { font-size: .92em; color: #676767; }
.web-bs-ru a { color: #7777cc; }
.web-bs-green { color: #008000; }
.web-bs-none { padding: 10px 0; }
.web-bs-sugg { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 10px; }
.web-bs-sugg a { display: grid; grid-template-columns: 32px 1fr; grid-template-rows: auto auto; gap: 0 8px; align-items: center; padding: 6px 8px; border: 1px solid #d6e6f5; border-radius: 6px; text-decoration: none !important; background: linear-gradient(#fff, #f3f8fd); }
.web-bs-sugg a:hover { border-color: #7fb2e6; }
.web-bs-sugg img { grid-row: span 2; width: 32px; height: 32px; }
.web-bs-sugg span { color: #008000; font-size: .9em; }
.web-bs-pager { display: flex; align-items: flex-end; gap: 4px; margin: 26px 0 16px; justify-content: center; }
.web-bs-pword { font: 800 2em/1 "Arial Rounded MT Bold", "Trebuchet MS", sans-serif; color: #1a7fd9; }
.web-bs-pb { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: .95em; text-decoration: none !important; }
.web-bs-pb i { width: 20px; height: 20px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff, #9fd3ff 45%, #2a8fe6 100%); border: 1px solid #1a6fc0; box-shadow: inset 0 -2px 3px rgba(255,255,255,.5); }
.web-bs-pb.cur { color: #c00; font-weight: 700; }
.web-bs-pb.cur i { width: 28px; height: 28px; background: radial-gradient(circle at 35% 30%, #fff, #ffd17a 45%, #f58a0b 100%); border-color: #b35a00; }
.web-bs-next { margin-left: 12px; font-weight: 700; align-self: center; }
.web-bs-bottomform { margin: 10px 0; padding: 12px; background: #eef6fe; border-top: 1px solid #c9ddf1; justify-content: center; }
.web-bs-foot { text-align: center; font-size: .85em; color: #777; margin-bottom: 20px; }
.web-bs-ads { width: 260px; flex: none; padding-top: 12px; }
.web-bs-adsh { font-size: .8em; color: #777; text-align: right; padding-bottom: 4px; border-bottom: 1px solid #eee; margin-bottom: 8px; }
.web-bs-ad { font-size: .9em; margin-bottom: 14px; padding: 6px 8px; background: #fffbe6; border: 1px solid #f3e7a8; border-radius: 4px; }
.web-bs-ad a { font-weight: 700; text-decoration: underline; }
.web-bs-float { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.web-bs-float i { position: absolute; bottom: -40px; border-radius: 50%; border: 1px solid rgba(80,160,230,.6); background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.95), rgba(160,220,255,.25) 40%, rgba(60,160,230,.35)); animation: web-bs-rise 7s linear infinite; }
@keyframes web-bs-rise { from { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } to { transform: translateY(-900px) translateX(30px); opacity: 0; } }
.web-bs-redirect { padding: 30px; color: #666; }
.web-bs-cache { min-height: 100%; background: #fff; }
.web-bs-cachebar { padding: 8px 12px; background: #fffbe6; border-bottom: 1px solid #d6c26b; color: #000; font: 12px/1.45 Arial, sans-serif; }
.web-bs-cachebar a { color: #1a44c2; }
.web-bs-hl { background: #ffff66; font-weight: 700; padding: 0 3px; }
.web-bs-cachebody { position: relative; }
.web-bs-imgs { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 14px; padding: 16px 12px; }
.web-bs-img { display: flex; flex-direction: column; align-items: center; text-align: center; font-size: .85em; }
.web-bs-img a { display: grid; place-items: center; width: 120px; height: 90px; border: 1px solid #c9ddf1; background: #f7fbff; }
.web-bs-img a:hover { border-color: #3a8ee6; }
.web-bs-img img { max-width: 112px; max-height: 82px; object-fit: cover; }
.web-bs-img small { color: #008000; }
.web-bs-page { max-width: 720px; padding: 10px 20px 30px; line-height: 1.5; }
.web-bs-page h1 { font-size: 1.6em; color: #1a44c2; font-weight: 400; }
.web-bs-page h2 { font-size: 1.15em; margin-top: 18px; }
.web-bs-prefs { border-collapse: collapse; width: 100%; }
.web-bs-prefs th { width: 170px; text-align: left; vertical-align: top; padding: 8px; background: #eef6fe; border-bottom: 1px solid #fff; }
.web-bs-prefs td { padding: 8px; border-bottom: 1px solid #eef3f8; }
.web-bs-prefs input[type=text] { width: 260px; padding: 2px 4px; }
.web-bs-saved { color: #080; }
`,
  });

  // ================================================================ www.aeropedia.org
  const ref = (n) => `<sup class="web-ap-ref"><a href="#cite-${n}">[${n}]</a></sup>`;
  const ART = {
    Main_Page: { title: 'Main Page', main: true },
    Frutiger_Aero: {
      title: 'Frutiger Aero',
      box: { caption: 'Glossy orbs, clear water and blue sky: the three staples of the style', img: 'imagery/water', rows: [['Years active', 'about 2004 - 2013'], ['Named', 'January 18, 2018'], ['Named by', 'Sofi Xian and Froyo Tam (CARI)'], ['Key motifs', 'Glass, water, sky, bubbles, fish, auroras'], ['Typefaces', 'Humanist sans-serifs'], ['Succeeded by', '<a href="/wiki/Frutiger_Metro">Frutiger Metro</a>, flat design']] },
      lead: `<b>Frutiger Aero</b> is an aesthetic that dominated consumer technology, advertising and user interface design from roughly 2004 to 2013.${ref(1)} It is recognized by glossy and translucent materials, <a href="/wiki/Skeuomorphism">skeuomorphic</a> interface elements, humanist sans-serif typefaces and imagery of nature, especially blue skies, water, grass, <a href="/wiki/Bubble">bubbles</a>, <a href="/wiki/Goldfish">goldfish</a>, <a href="/wiki/Dolphin">dolphins</a> and <a href="/wiki/Aurora">auroras</a>. Its underlying idea is technology that fits into nature instead of pushing it out; one popular summary calls it "a utopia where efficiency and the environment coexist."`,
      sections: [
        ['Name', `The name joins <i>Frutiger</i>, a humanist sans-serif typeface designed by Adrian Frutiger, with <i>Aero</i>, the name of a translucent glass window theme of the period. The term was coined by Sofi Xian (also credited as Sofi Lee) and named together with Froyo Tam of the Consumer Aesthetics Research Institute (CARI). It was launched publicly in an online group on January 18, 2018.${ref(2)} CARI dates the style to about 2004 to 2013.${ref(1)}`],
        ['Characteristics', `Designs in the style are usually built from four "materials": air (open skies with soft clouds and lens flare), water (clear, cool and moving, with bubbles, droplets and caustic light), glass (translucent panels and gel buttons you can see into) and light (a single light source from above that creates the shine on every surface).<ul><li><b>Gloss.</b> Buttons and orbs look like solid glass or candy, with a hard white highlight across the upper half and a soft glow rising from the bottom edge.</li><li><b>Transparency.</b> Window frames and panels are tinted glass that softly blur what is behind them.</li><li><b>Skeuomorphism.</b> Interface elements imitate real materials and objects.</li><li><b>Type.</b> Light, humanist sans-serifs, often very large for headlines.</li><li><b>Imagery.</b> Saturated photographs of polarized blue skies, backlit grass, flowers, water, auroras and long exposures, plus macro shots of dew drops and soap bubbles.</li><li><b>Web 2.0 details.</b> <a href="/wiki/Wet_floor_effect">Wet floor reflections</a>, <a href="/wiki/Starburst">starbursts</a>, gradients and rounded corners.</li></ul>`],
        ['Sub-styles', `Fans describe several branches of the style:${ref(6)}<ul><li><b>Frutiger Eco</b>: renewable energy, glass globes, seedlings and green hills.</li><li><b>Dark Aero</b>: black or obsidian glass with bokeh, glows and neon accents.</li><li><b>Technozen</b>: white, calm and rounded, described as "cold, sterile, professional... yet cozy, friendly, cute," and associated with Japanese home electronics and game consoles.</li><li><b>Frutiger Aurora</b>: flowing ribbons of colored light.</li><li><b>Vectorgarden</b>: vector swirls, flowers, butterflies and bubbles with heavy gradients.</li><li><b>Helvetica Aqua Aero</b>: ocean and beach imagery with tropical fish, coral, bubbles and <a href="/wiki/Dolphin">dolphins</a>.</li><li><b><a href="/wiki/Frutiger_Metro">Frutiger Metro</a></b>: vivid flat silhouettes, the flat turn that marked the end of the era around 2011 to 2013.</li></ul>`],
        ['Revival', `Interest in the aesthetic grew online in the late 2010s and early 2020s. A forum devoted to it grew by more than 400 percent in a single month in early 2023,${ref(3)} and in December 2023 a newspaper reported that the related hashtag had about 270 million views on a short-video platform.${ref(4)} Commentators have described the revival as a reaction against "the coldness of modern design"${ref(5)} and as nostalgia for a more hopeful vision of technology. "There's a lot of hopefulness in this aesthetic that Y2K doesn't have," one researcher told a magazine.${ref(3)}`],
        ['Criticism', `Archivists note that much of the era's utopian stock imagery came from the Korean stock agency Asadal, and that images of "green grassy plains with tall buildings" were often a form of greenwashing.${ref(7)}`],
        ['In software', `Many hobby projects recreate the look, including CSS libraries, design kits and entire pretend operating systems such as <a href="/wiki/Aerium">Aerium</a>.`],
      ],
      refs: [
        ['Consumer Aesthetics Research Institute. "Frutiger Aero."', 'https://cari.institute/aesthetics/frutiger-aero'],
        ['Consumer Aesthetics Research Institute. "History."', 'https://cari.institute/history'],
        ['"What is Frutiger Aero?" Dazed, February 2023.', 'https://www.dazeddigital.com/life-culture/article/58103/1/what-is-frutiger-aero-aesthetic-tiktok-msn-messenger-windows-vista-noughties'],
        ['"Frutiger Aero" design trend feature. The Guardian, December 2023 (via inkl).', 'https://www.inkl.com/news/frutiger-aero-the-windows-screen-saver-design-trend-taking-tiktok-by-storm'],
        ['Creative Bloq, January 2024.', 'https://www.creativebloq.com/news/frutiger-aero-aesthetic-resurgance'],
        ['Aesthetics Wiki. "Frutiger Aero."', 'https://aesthetics.fandom.com/wiki/Frutiger_Aero'],
        ['Frutiger Aero Archive. "History."', 'https://frutigeraeroarchive.org/history'],
      ],
      cats: ['Design styles', 'Aesthetics', '2000s in technology', 'Things that are very shiny'],
    },
    Aerium: {
      title: 'Aerium',
      box: { caption: 'The Aerium logo orb', img: 'icons/aerium', rows: [['Type', 'Operating system playground'], ['Style', '<a href="/wiki/Frutiger_Aero">Frutiger Aero</a>'], ['Runs on', 'Any modern web browser'], ['Schemes', 'Light, Dark, Technozen'], ['Web browser', '<a href="/wiki/Horizon_(web_browser)">Horizon</a>'], ['License', 'Just for fun']] },
      lead: `<b>Aerium</b> is a pretend desktop operating system in the <a href="/wiki/Frutiger_Aero">Frutiger Aero</a> style. It runs entirely inside a web browser as a handful of static files, with no installation, no network connection and no build step. It is designed as a nostalgia playground for people who grew up on the family computer around 2007: fun first, then partly functional.`,
      sections: [
        ['Features', `<ul><li>Tinted glass windows that drag, snap to screen edges, shake to minimize others and flip through in a 3D stack.</li><li>A taskbar with live previews and jump lists, a start menu with search, and desktop gadgets.</li><li>Three color schemes (Light, Dark and <a href="/wiki/Frutiger_Aero#Sub-styles">Technozen</a>) and sixteen glass colors.</li><li>A synthesized sound scheme: every click, chime and startup sound is generated live, and no recorded audio ships with the system.</li><li>A small virtual file system that lives in the browser, with Documents, Pictures, Music and a Recycle Bin that hides a secret.</li><li>Apps including the <a href="/wiki/Horizon_(web_browser)">Horizon</a> web browser, Bubble Messenger, a media player, Paint, games, Channels and a living aquarium.</li><li><a href="/wiki/Screensaver">Screensavers</a>, of course.</li></ul>`],
        ['The pretend web', `Horizon connects to a tiny made-up internet that lives inside Aerium. It includes a portal (Aerium Live), a search engine (<a href="http://www.bubblesearch.com/">Bubble</a>), a profile site (<a href="http://www.myspot.com/">MySpot</a>), a video site (<a href="http://www.tubeview.com/">TubeView</a>), this encyclopedia and several personal homepages that are still under construction.`],
        ['Reception', `Users have praised Aerium's bubbles, its fish and the fact that nothing in it can hurt a real computer. Several reviewers admitted to watching the screensaver for longer than they would like to say.`],
      ],
      refs: [],
      cats: ['Operating systems', 'Pretend software', 'Things with fish in them'],
    },
    'Horizon_(web_browser)': {
      title: 'Horizon (web browser)',
      box: { caption: 'Horizon\'s globe icon', img: 'icons/globe', rows: [['Developer', '<a href="/wiki/Aerium">Aerium</a>'], ['Version', '7'], ['Engine', 'Bubbles'], ['Type', 'Web browser'], ['Websites reachable', 'About two dozen']] },
      lead: `<b>Horizon</b> is the web browser included with <a href="/wiki/Aerium">Aerium</a>. It features glass tabs, round Back and Forward buttons, a search box, favorites, a pop-up blocker and a connection speed setting that can make pages load like it is 1999.`,
      sections: [
        ['Features', `<ul><li>Tabbed browsing, with middle-click to close a tab.</li><li>An Information Bar that tells you when a <a href="/wiki/Pop-up_ad">pop-up</a> was blocked.</li><li>A "Dial-up" connection option described in its settings as "recommended for maximum nostalgia."</li><li>A View Source command that turns anyone into a hacker.</li></ul>`],
        ['Limitations', `Horizon can only visit the pretend web. When you type a real address, it offers to open the page in your real browser instead.`],
      ],
      refs: [], cats: ['Web browsers', 'Pretend software'],
    },
    Bubble: {
      title: 'Bubble',
      box: { caption: 'A soap bubble catching the light', img: 'icons/bubble', rows: [['Made of', 'Gas inside a liquid film'], ['Shape', 'Sphere (when floating freely)'], ['Colors from', 'Thin-film interference'], ['Lifespan', 'Seconds to minutes'], ['Pop sound', 'Yes']] },
      lead: `A <b>bubble</b> is a globule of one substance inside another, usually gas inside a liquid. A <b>soap bubble</b> is a thin film of soapy water that encloses air. Bubbles are a signature motif of <a href="/wiki/Frutiger_Aero">Frutiger Aero</a> design.`,
      sections: [
        ['Why bubbles are round', `A free-floating soap bubble is a sphere because a sphere encloses a given volume of air with the smallest possible surface area. Surface tension in the film constantly pulls it toward that shape. When bubbles touch, their walls meet in flat or gently curved faces, forming foams.`],
        ['Colors', `The swirling colors on a soap bubble come from thin-film interference. Light reflects from both the outer and inner surfaces of the film, and the two reflections interfere with each other. As the film drains and gets thinner, the colors shift, and just before popping the film can look almost clear or black.`],
        ['Bubble wrap', `Bubble wrap was invented in 1957 by two engineers who were trying to make a textured wallpaper. It did not catch on as wallpaper, but it became a very popular packing material and an even more popular thing to pop. See the <a href="http://www.tubeview.com/watch?v=bubblewrap">famous popping video</a>.`],
        ['In design', `In <a href="/wiki/Frutiger_Aero">Frutiger Aero</a> designs, bubbles appear in wallpapers, screensavers, icons and logos. Design guides of the style warn that bubbles work best as one hero moment per screen, "never as confetti."`],
      ],
      refs: [], cats: ['Physics', 'Things that pop', 'Frutiger Aero motifs'],
    },
    Goldfish: {
      title: 'Goldfish',
      box: { caption: 'A common goldfish in a round bowl', img: 'avatars/avatar-fish', rows: [['Scientific name', '<i>Carassius auratus</i>'], ['Family', 'Cyprinidae'], ['Origin', 'East Asia'], ['Lifespan', '10 to 20+ years with good care'], ['Memory', 'Months (not three seconds)']] },
      lead: `The <b>goldfish</b> (<i>Carassius auratus</i>) is a freshwater fish in the carp family Cyprinidae. It was one of the first fish to be domesticated and is one of the most popular pet fish in the world. A goldfish in a round bowl is one of the most recognizable images of the <a href="/wiki/Frutiger_Aero">Frutiger Aero</a> era.`,
      sections: [
        ['History', `Goldfish were bred from wild carp in China more than a thousand years ago, first for their color in ponds and later as indoor pets. Over the centuries breeders developed dozens of varieties.`],
        ['Varieties', `Well-known varieties include the common goldfish, the comet with its long forked tail, the fancy fantail, the oranda with its bumpy head growth, the telescope eye and the bubble eye, which has two large fluid-filled sacs under its eyes.`],
        ['Memory', `The popular idea that goldfish have a three-second memory is a myth. Experiments have trained goldfish to respond to sounds, colors and levers, and they remember what they have learned for months.`],
        ['Care', `Goldfish grow much larger than many people expect and produce a lot of waste. They do best in a large, filtered aquarium or a pond rather than a small bowl. With good care they can live for well over a decade. You can practice with a virtual goldfish at <a href="http://www.fishpals.com/">FishPals</a>.`],
      ],
      refs: [], cats: ['Fish', 'Pets', 'Frutiger Aero motifs'],
    },
    Aurora: {
      title: 'Aurora',
      box: { caption: 'Green aurora over a northern landscape', img: 'imagery/aurora', rows: [['Also called', 'Northern lights, southern lights'], ['Caused by', 'Charged particles from the Sun'], ['Height', 'About 100 to 300 km'], ['Common color', 'Green (oxygen)']] },
      lead: `An <b>aurora</b> is a natural display of light in the sky, seen most often in high-latitude regions near the Arctic and Antarctic. In the north it is called the <i>aurora borealis</i> or northern lights, and in the south the <i>aurora australis</i> or southern lights.`,
      sections: [
        ['Cause', `Auroras happen when charged particles from the solar wind are guided by Earth's magnetic field into the upper atmosphere. There they collide with oxygen and nitrogen, which give off light. Most auroras occur in a ring-shaped zone around each magnetic pole called the auroral oval.`],
        ['Colors', `The most common color is green, produced by oxygen at altitudes of roughly 100 to 250 kilometers. Oxygen higher up can glow a rare deep red, and nitrogen adds touches of blue and purple along the lower edges.`],
        ['In design', `Flowing ribbons of blue-green light became a popular wallpaper and screensaver motif in the 2000s. Fans of <a href="/wiki/Frutiger_Aero">Frutiger Aero</a> call this branch "Frutiger Aurora." Check the aurora forecast on <a href="http://www.skycast.com/">SkyCast</a>.`],
      ],
      refs: [], cats: ['Atmospheric optics', 'Night sky', 'Frutiger Aero motifs'],
    },
    'Web_2.0': {
      title: 'Web 2.0',
      box: { caption: 'A typical Web 2.0 starburst', img: 'icons/star', rows: [['Era', 'about 2004 - 2010'], ['Known for', 'User content, tagging, AJAX, RSS'], ['Signature look', 'Gloss, reflections, starbursts'], ['Status', 'Permanently in beta']] },
      lead: `<b>Web 2.0</b> describes the websites of the mid-2000s that put users at the center: blogs, wikis, profile sites, video sharing, photo sharing, tagging and social bookmarking. The term became popular around 2004.`,
      sections: [
        ['Design', `Web 2.0 sites shared a recognizable look: centered layouts, big friendly type, bold logos, strong colors, gradients, <a href="/wiki/Wet_floor_effect">reflections</a>, glossy pill-shaped buttons, cute icons and <a href="/wiki/Starburst">starbursts</a> that said "Beta!" or "New!". Company names often dropped vowels or ended in -r, -ster or -ly. See <a href="http://www.glossr.com/">Glossr</a> for a textbook example.`],
        ['Features', `<ul><li>User-generated content such as profiles, videos and photos (<a href="http://www.myspot.com/">MySpot</a>, <a href="http://www.tubeview.com/">TubeView</a>).</li><li>Tags and tag clouds.</li><li>RSS feeds and "syndication."</li><li>AJAX, which let pages update without reloading.</li><li>Comments on everything.</li></ul>`],
      ],
      refs: [], cats: ['Internet culture', '2000s in technology'],
    },
    Skeuomorphism: {
      title: 'Skeuomorphism',
      box: null,
      lead: `<b>Skeuomorphism</b> is a design approach in which digital objects imitate their real-world counterparts: calendars with stitched leather, notes on lined paper, buttons made of glass or gel, bookshelves made of wood.`,
      sections: [
        ['History', `Skeuomorphic interfaces were common through the 2000s and early 2010s, when they helped people understand new devices by making them look familiar. Around 2012 and 2013 many companies moved to flat design, which uses simple shapes and solid colors instead.`],
        ['Relation to Frutiger Aero', `<a href="/wiki/Frutiger_Aero">Frutiger Aero</a> is one of the best-known skeuomorphic styles. Its glass panels, water droplets and glossy orbs are all imitations of real materials, lit by a single light source.`],
      ],
      refs: [], cats: ['Design styles'],
    },
    Wet_floor_effect: {
      title: 'Wet floor effect',
      box: null,
      lead: `The <b>wet floor effect</b> is a reflection effect in which an object appears to stand on a glossy, wet surface. A flipped copy of the object is placed underneath it and faded out, usually at about 30 percent opacity, over part of its height.`,
      sections: [
        ['Use', `The effect was everywhere in <a href="/wiki/Web_2.0">Web 2.0</a> logos, product photos and banners. Many sites on the pretend web still use it, including <a href="http://www.bubblesearch.com/">Bubble</a>, <a href="http://www.glossr.com/">Glossr</a> and Aerium Live.`],
      ],
      refs: [], cats: ['Graphic design techniques', 'Web 2.0'],
    },
    Starburst: {
      title: 'Starburst',
      box: null,
      lead: `A <b>starburst</b> is a star-shaped badge with many points, used to grab attention with words like "New!", "Sale!" or "Beta!". In <a href="/wiki/Web_2.0">Web 2.0</a> design it was traditionally rotated about 15 degrees and filled with a bright yellow or orange gradient.`,
      sections: [['Usage notes', `Experts recommend no more than one starburst per page. Almost nobody follows this advice. See <a href="http://www.free-screensavers-4u.com/">this page</a> for a cautionary example.`]],
      refs: [], cats: ['Graphic design', 'Web 2.0'],
    },
    Screensaver: {
      title: 'Screensaver',
      box: { caption: 'A monitor waiting patiently', img: 'icons/monitor', rows: [['Original purpose', 'Preventing burn-in on CRT screens'], ['Modern purpose', 'Looking nice'], ['Famous examples', 'Bubbles, ribbons, auroras, 3D text']] },
      lead: `A <b>screensaver</b> is a program that fills the screen with moving images or patterns when a computer has not been used for a while. Screensavers were first created to prevent phosphor burn-in on CRT monitors.`,
      sections: [
        ['Styles', `Popular screensavers of the 2000s included glass bubbles floating over the desktop, glowing ribbons, auroras, 3D text, maze-like pipes and photo slideshows. Many people set their own name to scroll across the screen.`],
        ['Downloads', `Many websites offered "free" screensavers, some of which came with unwanted toolbars. Aeropedia recommends the ones that come with <a href="/wiki/Aerium">Aerium</a>.`],
      ],
      refs: [], cats: ['Computer graphics', 'Things people watch at work'],
    },
    Dolphin: {
      title: 'Dolphin',
      box: { caption: 'A dolphin leaping from clear water', img: 'avatars/avatar-dolphin', rows: [['Group name', 'Pod'], ['Senses', 'Echolocation'], ['Diet', 'Fish and squid'], ['Mood', 'Usually excellent']] },
      lead: `<b>Dolphins</b> are highly intelligent marine mammals known for their playful behavior. They live in social groups called pods and find food and navigate using echolocation. Dolphins leaping from bright blue water are a classic image of the "Helvetica Aqua Aero" branch of <a href="/wiki/Frutiger_Aero">Frutiger Aero</a>.`,
      sections: [['Behavior', `Dolphins are known to surf waves, blow bubble rings and play with seaweed. Many species live in pods of a few dozen animals, and pods sometimes join together into groups of hundreds.`]],
      refs: [], cats: ['Marine mammals', 'Frutiger Aero motifs'],
    },
    Lens_flare: {
      title: 'Lens flare',
      box: null,
      lead: `A <b>lens flare</b> is light scattered inside a camera lens, appearing as bright circles, rings and streaks when the lens points toward a strong light like the Sun. In 2000s graphic design, lens flares were often added on purpose to suggest a bright, sunny sky.`,
      sections: [['In design', `A single soft flare in the upper corner became a shorthand for optimism in <a href="/wiki/Frutiger_Aero">Frutiger Aero</a> wallpapers and advertising.`]],
      refs: [], cats: ['Optics', 'Graphic design'],
    },
    Hit_counter: {
      title: 'Hit counter',
      box: null,
      lead: `A <b>hit counter</b> is a small image or script on a website that shows how many times the page has been visited, often drawn as the digits of a car odometer. Hit counters were a fixture of personal homepages in the late 1990s and 2000s.`,
      sections: [['Culture', `Visitors were encouraged to reload pages to push the number higher, and milestone visitors were sometimes congratulated. See a working example at <a href="http://www.geoplace.com/~sk8rjake/">Jake's Skate Zone</a>.`]],
      refs: [], cats: ['Web culture', 'Personal homepages'],
    },
    Webring: {
      title: 'Webring',
      box: null,
      lead: `A <b>webring</b> is a group of websites about a shared topic, linked together in a circle. Each member page carries a small navigation bar with Previous, Next and Random links, so visitors can travel around the ring.`,
      sections: [['Example', `The Skate Webring connects several homepages on GeoPlace. Start at <a href="http://www.geoplace.com/~sk8rjake/">Jake's Skate Zone</a> and follow the links.`]],
      refs: [], cats: ['Web culture', 'Personal homepages'],
    },
  };
  const REDIRECTS = { soap_bubble: 'Bubble', bubbles: 'Bubble', northern_lights: 'Aurora', aurora_borealis: 'Aurora', horizon: 'Horizon_(web_browser)', web_2: 'Web_2.0', 'web2.0': 'Web_2.0', frutiger: 'Frutiger_Aero', aero: 'Frutiger_Aero', goldfishes: 'Goldfish', skeuomorphic: 'Skeuomorphism', 'dolphins': 'Dolphin', reflection: 'Wet_floor_effect', webrings: 'Webring', screensavers: 'Screensaver' };
  const artKey = (s) => {
    const k = String(s || '').trim().replace(/\s+/g, '_');
    const direct = Object.keys(ART).find((x) => x.toLowerCase() === k.toLowerCase());
    return direct || REDIRECTS[k.toLowerCase()] || null;
  };
  const plain = (html) => html.replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<\/?(i|b|a|em|strong|span|small)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/\(\s+/g, '(').replace(/\s+/g, ' ').trim();

  function apRender(ctx) {
    const p = ctx.parts;
    if (!p.length) return ctx.go('/wiki/Main_Page', { replace: true, noSound: true }) || ctx.html('<div class="web-ap"></div>');
    if (p[0] === 'wiki') {
      const name = p.slice(1).join('/') || 'Main_Page';
      if (name === 'Special:Random') { const keys = Object.keys(ART).filter((k) => k !== 'Main_Page'); ctx.after(0, () => ctx.go('/wiki/' + keys[Math.floor(Math.random() * keys.length)], { replace: true, noSound: true })); return ctx.html('<div class="web-ap"></div>'); }
      if (name === 'Special:AllPages') return apAll(ctx);
      const key = artKey(name);
      if (key === 'Main_Page') return apMain(ctx);
      if (key) return apArticle(ctx, key, name !== key && name.toLowerCase() !== key.toLowerCase() ? name : null);
      return apMissing(ctx, name);
    }
    if (p[0] === 'w') return apSearch(ctx);
    return ctx.notFound();
  }
  function apFrame(ctx, title, content, tab) {
    const art = tab !== 'special';
    return `<div class="web-ap"><div class="web-ap-side">
      <a class="web-ap-logo" href="/wiki/Main_Page"><span class="web-ap-globe">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}<b>A</b></span><span class="web-ap-name">Aeropedia</span><span class="web-ap-tag">The bubbly encyclopedia</span></a>
      <div class="web-ap-portlet"><h5>navigation</h5><ul><li><a href="/wiki/Main_Page">Main page</a></li><li><a href="/wiki/Special:AllPages">Contents</a></li><li><a href="/wiki/Frutiger_Aero">Featured content</a></li><li><a href="http://home.aerium.net/news">Current events</a></li><li><a href="/wiki/Special:Random">Random article</a></li></ul></div>
      <div class="web-ap-portlet"><h5>search</h5><form class="web-ap-search" action="/w/index.php"><input name="search" type="text" autocomplete="off" aria-label="Search Aeropedia"><div><button type="submit" name="go" value="Go">Go</button><button type="submit" name="fulltext" value="1">Search</button></div></form></div>
      <div class="web-ap-portlet"><h5>interaction</h5><ul><li><a href="/wiki/Aerium">About Aeropedia</a></li><li><a href="#" class="web-ap-joke">Community portal</a></li><li><a href="#" class="web-ap-joke">Recent changes</a></li><li><a href="#" class="web-ap-joke">Donate</a></li></ul></div>
      <div class="web-ap-portlet"><h5>toolbox</h5><ul><li><a href="#" class="web-ap-joke">What links here</a></li><li><a href="#" class="web-ap-print">Printable version</a></li><li><a href="#" class="web-ap-joke">Permanent link</a></li></ul></div>
    </div><div class="web-ap-main">
      <div class="web-ap-user"><a href="#" class="web-ap-joke">Log in / create account</a></div>
      <div class="web-ap-tabs"><a class="on" href="${esc(ctx.path)}">${art ? 'article' : 'special page'}</a>${art ? '<a href="#" class="web-ap-joke">discussion</a><a href="#" class="web-ap-edit">edit this page</a><a href="#" class="web-ap-joke">history</a>' : ''}</div>
      <div class="web-ap-content"><h1 class="web-ap-h1">${title}</h1>${content}</div>
      <div class="web-ap-foot">This page was last modified on ${K.shortDate(Date.now() - 86400000 * ((K.hash(ctx.path) % 40) + 1))}. All text is available under the terms of the Bubble Free Documentation License. Aeropedia is a registered trademark of nobody, because it is pretend.<br><a href="/wiki/Aerium">About Aeropedia</a> - <a href="#" class="web-ap-joke">Disclaimers</a></div>
    </div></div>`;
  }
  function apWire(ctx, root) {
    root.querySelectorAll('.web-ap-joke').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); ctx.dialog({ title: 'Aeropedia', icon: 'info', instruction: 'This page is resting', message: 'Aeropedia is a very small encyclopedia. This part of it is taking a nap. Try the Random article link instead.' }); }));
    root.querySelectorAll('.web-ap-edit').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); ctx.dialog({ title: 'Aeropedia', icon: 'icons/lock', instruction: 'This page is protected', message: 'This page has been protected from editing because it is already shiny enough. Please discuss any polishing on the talk page.' }); }));
    root.querySelectorAll('.web-ap-print').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); ctx.dialog({ title: 'Print', icon: 'warning', instruction: 'The printer is out of cyan', message: 'Aeropedia would print this, but the printer is out of cyan.' }); }));
    root.querySelectorAll('.web-ap-content a[href^="/wiki/"], .web-ap-content a[data-href^="/wiki/"]').forEach((a) => {
      const href = a.getAttribute('data-href') || a.getAttribute('href') || '';
      const name = decodeURIComponent(href.slice(6).split('#')[0]);
      if (!name.startsWith('Special:') && !artKey(name)) a.classList.add('web-ap-new');
    });
  }
  function apArticle(ctx, key, from) {
    const a = ART[key];
    ctx.title(a.title + ' - Aeropedia, the bubbly encyclopedia');
    const toc = a.sections.length > 2 ? `<table class="web-ap-toc"><tr><td><div class="web-ap-toctitle">Contents <span>[<a href="#" class="web-ap-hide">hide</a>]</span></div><ol>${a.sections.map((s, i) => `<li><a href="#${s[0].replace(/\s+/g, '_')}"><span>${i + 1}</span> ${esc(s[0])}</a></li>`).join('')}${a.refs && a.refs.length ? `<li><a href="#References"><span>${a.sections.length + 1}</span> References</a></li>` : ''}</ol></td></tr></table>` : '';
    const box = a.box ? `<table class="web-ap-box"><tr><th colspan="2" class="web-ap-boxtitle">${esc(a.title)}</th></tr><tr><td colspan="2" class="web-ap-boximg">${K.img(a.box.img, a.box.img.startsWith('imagery') ? 'photo' : 'art', a.box.caption)}<div>${esc(a.box.caption)}</div></td></tr>${a.box.rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>` : '';
    const refs = a.refs && a.refs.length ? `<h2 id="References">References <span class="web-ap-editsec">[<a href="#" class="web-ap-edit">edit</a>]</span></h2><ol class="web-ap-refs">${a.refs.map(([t, u], i) => `<li id="cite-${i + 1}"><a href="#" class="web-ap-up">^</a> ${esc(t)} <a class="web-ap-ext" href="${esc(u)}">${esc(u.replace(/^https?:\/\//, '').split('/')[0])}</a></li>`).join('')}</ol>` : '';
    const content = `<div class="web-ap-sub">From Aeropedia, the bubbly encyclopedia</div>${from ? `<div class="web-ap-redir">(Redirected from ${esc(from.replace(/_/g, ' '))})</div>` : ''}
      ${box}<p>${a.lead}</p>${toc}
      ${a.sections.map((s) => `<h2 id="${s[0].replace(/\s+/g, '_')}">${esc(s[0])} <span class="web-ap-editsec">[<a href="#" class="web-ap-edit">edit</a>]</span></h2><div>${s[1].startsWith('<ul') ? s[1] : '<p>' + s[1] + '</p>'}</div>`).join('')}
      ${refs}
      <div class="web-ap-cats"><a href="/wiki/Special:AllPages">Categories</a>: ${a.cats.map((c) => `<a href="/w/index.php?search=${encodeURIComponent(c)}">${esc(c)}</a>`).join(' | ')}</div>`;
    const root = ctx.html(apFrame(ctx, esc(a.title), content));
    apWire(ctx, root);
    const hide = root.querySelector('.web-ap-hide');
    if (hide) hide.addEventListener('click', (e) => { e.preventDefault(); const ol = root.querySelector('.web-ap-toc ol'); ol.hidden = !ol.hidden; hide.textContent = ol.hidden ? 'show' : 'hide'; });
    root.querySelectorAll('.web-ap-up').forEach((x) => x.addEventListener('click', (e) => { e.preventDefault(); ctx.scrollTop(); }));
  }
  function apMain(ctx) {
    ctx.title('Aeropedia, the bubbly encyclopedia');
    const n = Object.keys(ART).length - 1;
    const fa = ART.Frutiger_Aero;
    const content = `<div class="web-ap-welcome"><div><b>Welcome to Aeropedia,</b><br>the bubbly encyclopedia that anyone can polish.<br><small>${n} articles in English</small></div><ul><li><a href="/wiki/Frutiger_Aero">Design</a></li><li><a href="/wiki/Goldfish">Nature</a></li><li><a href="/wiki/Aurora">Science</a></li><li><a href="/wiki/Web_2.0">Internet</a></li><li><a href="/wiki/Special:AllPages">All portals</a></li></ul></div>
      <div class="web-ap-cols"><div class="web-ap-panel green"><h2>Today's featured article</h2><div>${K.img('imagery/water', 'web-ap-faimg', 'Clear water')}<p>${fa.lead.replace(/<sup[\s\S]*?<\/sup>/g, '')} (<a href="/wiki/Frutiger_Aero">more...</a>)</p><p class="web-ap-small">Recently featured: <a href="/wiki/Goldfish">Goldfish</a> - <a href="/wiki/Aurora">Aurora</a> - <a href="/wiki/Bubble">Bubble</a></p></div></div>
        <div class="web-ap-panel blue"><h2>In the news</h2><ul><li>Skywatchers report an early start to <a href="/wiki/Aurora">aurora</a> season. <a href="http://home.aerium.net/news/aurora-season">(story)</a></li><li>A study confirms <a href="/wiki/Goldfish">goldfish</a> remember things for months.</li><li>A local kid blows a <a href="/wiki/Bubble">bubble</a> "about the size of a minivan."</li><li>"Dramatic Goldfish" passes 48 million views on <a href="http://www.tubeview.com/">TubeView</a>.</li></ul></div></div>
      <div class="web-ap-cols"><div class="web-ap-panel green"><h2>Did you know...</h2><ul><li>...that <a href="/wiki/Bubble">bubble wrap</a> was first invented as wallpaper?</li><li>...that the green of an <a href="/wiki/Aurora">aurora</a> comes from oxygen high in the sky?</li><li>...that a <a href="/wiki/Starburst">starburst</a> is traditionally rotated 15 degrees?</li><li>...that <a href="/wiki/Dolphin">dolphins</a> can blow bubble rings for fun?</li></ul></div>
        <div class="web-ap-panel blue"><h2>On this day</h2><p><b>January 18, 2018</b>: the name <a href="/wiki/Frutiger_Aero">Frutiger Aero</a> was launched publicly in an online group.</p><p><b>1957</b>: <a href="/wiki/Bubble">bubble wrap</a> is invented by two engineers who wanted to make wallpaper.</p><p>More anniversaries: <a href="/wiki/Special:Random">random article</a></p></div></div>`;
    apWire(ctx, ctx.html(apFrame(ctx, 'Main Page', content)));
  }
  function apAll(ctx) {
    ctx.title('All pages - Aeropedia');
    const keys = Object.keys(ART).filter((k) => k !== 'Main_Page').sort();
    apWire(ctx, ctx.html(apFrame(ctx, 'All pages', `<div class="web-ap-sub">Every article in Aeropedia. It will not take long.</div><ul class="web-ap-allpages">${keys.map((k) => `<li><a href="/wiki/${k}">${esc(ART[k].title)}</a></li>`).join('')}</ul>`, 'special')));
  }
  function apMissing(ctx, name) {
    const title = name.replace(/_/g, ' ');
    ctx.title(title + ' - Aeropedia, the bubbly encyclopedia');
    const content = `<div class="web-ap-missing"><p><b>Aeropedia does not have an article with this exact name.</b></p><ul><li><a href="/w/index.php?search=${encodeURIComponent(title)}&amp;fulltext=1">Search for "${esc(title)}"</a> in Aeropedia.</li><li>Look for pages that <a href="#" class="web-ap-joke">link to this page</a>.</li><li>Start the <b>${esc(title)}</b> article. <i>(Article creation is closed while everyone polishes the existing ones.)</i></li></ul></div>`;
    apWire(ctx, ctx.html(apFrame(ctx, esc(title), content, 'special')));
  }
  function apSearch(ctx) {
    const q = (ctx.q('search') || '').trim();
    if (q && !ctx.q('fulltext')) {
      const key = artKey(q);
      if (key) { ctx.after(0, () => ctx.go('/wiki/' + key, { replace: true, noSound: true })); ctx.html('<div class="web-ap"></div>'); return; }
    }
    ctx.title('Search results - Aeropedia');
    const words = tokenize(q).map(stem);
    const hits = Object.keys(ART).filter((k) => k !== 'Main_Page').map((k) => {
      const a = ART[k];
      const text = plain(a.lead + ' ' + a.sections.map((s) => s[1]).join(' ') + ' ' + (a.cats || []).join(' '));
      const t = a.title.toLowerCase();
      let score = 0;
      words.forEach((w) => { if (t.includes(w)) score += 10; score += Math.min(5, text.toLowerCase().split(w).length - 1); });
      return { k, a, text, score };
    }).filter((x) => x.score > 0).sort((x, y) => y.score - x.score);
    const content = `<div class="web-ap-sub">You searched for <b>${esc(q)}</b></div>${hits.length ? `<ul class="web-ap-results">${hits.map((x) => `<li><a href="/wiki/${x.k}">${esc(x.a.title)}</a><div>${snippet(x.text, q)}</div><small>${Math.round(x.text.length / 6)} words</small></li>`).join('')}</ul>` : `<p>There were no results matching the query.</p><p>You can <b>create the page "${esc(q)}"</b> on this wiki... just kidding. Try <a href="/wiki/Special:Random">a random article</a>.</p>`}`;
    apWire(ctx, ctx.html(apFrame(ctx, 'Search results', content, 'special')));
  }

  W.register({
    id: 'aeropedia', host: 'www.aeropedia.org', aliases: ['aeropedia.org', 'en.aeropedia.org'],
    title: 'Aeropedia, the bubbly encyclopedia', shortTitle: 'Aeropedia', icon: 'icons/document', homePath: '/wiki/Main_Page',
    favicon: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#f4f9ff" stroke="#6f8fb0"/><circle cx="5" cy="5" r="2" fill="#bfe2ff" opacity=".8"/><path d="M4.6 12.4 L8 3.4 L11.4 12.4 M5.9 9.2 H10.1" stroke="#1d3050" stroke-width="1.5" fill="none" stroke-linejoin="round"/></svg>',
    pages: () => Object.keys(ART).filter((k) => k !== 'Main_Page').map((k) => ({ path: '/wiki/' + k, title: ART[k].title + ' - Aeropedia, the bubbly encyclopedia', text: plain(ART[k].lead + ' ' + ART[k].sections.map((s) => s[1]).join(' ')) }))
      .concat([{ path: '/wiki/Main_Page', title: 'Aeropedia, the bubbly encyclopedia', text: 'Welcome to Aeropedia, the bubbly encyclopedia that anyone can polish. Featured article, in the news, did you know, on this day.' }]),
    render: apRender,
    css: `
.web-ap { display: flex; min-height: 100%; background: #f6f9fc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ccircle cx='40' cy='50' r='18' fill='none' stroke='%23dfeaf5'/%3E%3Ccircle cx='150' cy='140' r='26' fill='none' stroke='%23e3eef8'/%3E%3Ccircle cx='120' cy='40' r='8' fill='none' stroke='%23e3eef8'/%3E%3C/svg%3E"); color: #000; font: calc(12.7px * var(--hz-text, 1))/1.5 "Segoe UI", Tahoma, Verdana, sans-serif; }
.web-ap a { color: #0645ad; text-decoration: none; }
.web-ap a:hover { text-decoration: underline; }
.web-ap a.web-ap-new { color: #cc2200; }
.web-ap-side { width: 164px; flex: none; padding: 8px 8px 20px 10px; }
.web-ap-logo { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 14px; text-decoration: none !important; }
.web-ap-globe { position: relative; width: 104px; height: 104px; border-radius: 50%; margin-bottom: 4px; background: radial-gradient(circle at 36% 30%, #fff 0, #eaf5ff 30%, #b8d9f3 70%, #7fb3dc 100%); border: 1px solid #7ea6c9; box-shadow: inset 0 -8px 14px rgba(255,255,255,.7), 0 3px 8px rgba(40,90,140,.25); overflow: hidden; }
.web-ap-globe i { position: absolute; width: 24px; height: 24px; border-radius: 50%; border: 1px solid rgba(60,120,180,.55); background: radial-gradient(circle at 35% 30%, #fff, rgba(255,255,255,.2) 45%, rgba(120,180,230,.3)); left: calc(8px + (var(--i) * 27px) % 81px); top: calc(10px + (var(--i) * 31px) % 78px); }
.web-ap-globe b { position: absolute; inset: 0; display: grid; place-items: center; font: 400 54px/1 Georgia, "Times New Roman", serif; color: #203450; text-shadow: 0 2px 0 #fff; }
.web-ap-globe::after { content: ""; position: absolute; left: 16%; right: 16%; top: 4%; height: 38%; border-radius: 50%; background: linear-gradient(rgba(255,255,255,.9), rgba(255,255,255,0)); }
.web-ap-name { font: 400 1.5em/1.1 Georgia, "Times New Roman", serif; color: #000; letter-spacing: .02em; }
.web-ap-tag { font: italic .9em Georgia, serif; color: #444; }
.web-ap-portlet { margin-bottom: 10px; }
.web-ap-portlet h5 { margin: 0 0 0 6px; font-weight: 400; font-size: .92em; color: #333; text-transform: lowercase; }
.web-ap-portlet ul, .web-ap-search { margin: 0; padding: 5px 8px; list-style: square; background: #fff; border: 1px solid #aaa; border-top-color: #fabd23; font-size: .92em; }
.web-ap-portlet ul { padding-left: 22px; }
.web-ap-portlet li { margin: 2px 0; }
.web-ap-search input { width: 100%; font: inherit; padding: 1px 3px; }
.web-ap-search div { display: flex; gap: 4px; margin-top: 4px; }
.web-ap-search button { flex: 1; font: inherit; font-size: .95em; padding: 1px; border: 1px solid #aaa; background: linear-gradient(#fff, #e6e6e6); border-radius: 2px; cursor: pointer; }
.web-ap-main { flex: 1; min-width: 0; padding: 4px 14px 0 4px; }
.web-ap-user { text-align: right; font-size: .9em; padding: 2px 4px 6px; }
.web-ap-tabs { display: flex; gap: 4px; padding-left: 10px; }
.web-ap-tabs a { padding: 2px 12px; font-size: .92em; background: #fff; border: 1px solid #aaa; border-bottom: 0; text-transform: lowercase; margin-bottom: -1px; }
.web-ap-tabs a.on { font-weight: 700; padding-bottom: 3px; position: relative; z-index: 1; }
.web-ap-content { position: relative; background: #fff; border: 1px solid #aaa; padding: 12px 20px 20px; min-height: 400px; }
.web-ap-h1 { font: 400 1.9em/1.25 Georgia, "Times New Roman", serif; margin: 0 0 2px; padding-bottom: 2px; border-bottom: 1px solid #aaa; }
.web-ap-sub { font-size: .92em; color: #555; margin-bottom: 10px; }
.web-ap-redir { font-size: .88em; color: #555; margin: -8px 0 10px; }
.web-ap-content h2 { font: 400 1.4em/1.3 Georgia, "Times New Roman", serif; border-bottom: 1px solid #aaa; margin: 18px 0 6px; padding-bottom: 1px; }
.web-ap-editsec { float: right; font: .6em "Segoe UI", sans-serif; }
.web-ap-content p { margin: .4em 0 .6em; }
.web-ap-content ul { margin: .3em 0 .6em; padding-left: 22px; list-style: square; }
.web-ap-ref { font-size: .75em; line-height: 1; }
.web-ap-box { float: right; clear: right; width: 250px; margin: 0 0 12px 16px; border: 1px solid #aaa; background: #f9f9f9; font-size: .9em; border-collapse: collapse; }
.web-ap-box th, .web-ap-box td { padding: 3px 6px; text-align: left; vertical-align: top; border-top: 1px solid #e3e3e3; }
.web-ap-box th { width: 42%; }
.web-ap-boxtitle { text-align: center !important; font-size: 1.25em; background: linear-gradient(#e6f2fc, #cfe4f7); border-top: 0 !important; }
.web-ap-boximg { text-align: center !important; }
.web-ap-boximg img.photo { width: 236px; height: 150px; object-fit: cover; border: 1px solid #ccc; }
.web-ap-boximg img.art { width: 110px; height: 110px; margin: 6px 0; }
.web-ap-boximg div { font-size: .9em; color: #333; }
.web-ap-toc { display: table; border: 1px solid #aaa; background: #f9f9f9; padding: 5px 12px 5px 5px; margin: 10px 0; font-size: .95em; }
.web-ap-toctitle { text-align: center; font-weight: 700; }
.web-ap-toctitle span { font-weight: 400; font-size: .9em; }
.web-ap-toc ol { list-style: none; margin: 4px 0 0; padding: 0 8px 0 4px; }
.web-ap-toc li span { color: #000; margin-right: 4px; }
.web-ap-refs { font-size: .9em; }
.web-ap-refs li { margin-bottom: 4px; }
.web-ap-ext { padding-right: 13px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cpath d='M1 3 H6 V9 H1 Z' fill='none' stroke='%2306a' stroke-width='1'/%3E%3Cpath d='M5 1 H9 V5 M9 1 L4.5 5.5' fill='none' stroke='%2306a' stroke-width='1.2'/%3E%3C/svg%3E") right center no-repeat; }
.web-ap-cats { clear: both; margin-top: 20px; padding: 5px 8px; border: 1px solid #aaa; background: #f9f9f9; font-size: .9em; }
.web-ap-foot { font-size: .82em; color: #444; padding: 10px 6px 24px; }
.web-ap-welcome { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 14px; margin: 6px 0 12px; border: 1px solid #aaa; border-radius: 6px; background: linear-gradient(#f7fbff, #e2effb); font-size: 1.05em; }
.web-ap-welcome b { font: 400 1.5em Georgia, serif; }
.web-ap-welcome ul { columns: 2; margin: 0; }
.web-ap-cols { display: grid; grid-template-columns: 1.15fr 1fr; gap: 12px; margin-bottom: 12px; }
.web-ap-panel { border: 1px solid #aaa; border-radius: 6px; overflow: hidden; }
.web-ap-panel h2 { margin: 0 !important; padding: 3px 8px !important; font-size: 1.1em !important; border: 0 !important; }
.web-ap-panel > div, .web-ap-panel > ul, .web-ap-panel > p { margin: 0; padding: 6px 10px; }
.web-ap-panel > ul { padding-left: 26px; }
.web-ap-panel.green { background: #f5fffa; border-color: #a3bfb1; } .web-ap-panel.green h2 { background: #cef2e0; }
.web-ap-panel.blue { background: #f5faff; border-color: #a3b0bf; } .web-ap-panel.blue h2 { background: #cedff2; }
.web-ap-faimg { float: left; width: 110px; height: 80px; object-fit: cover; margin: 4px 10px 4px 0; border: 1px solid #ccc; }
.web-ap-small { font-size: .9em; clear: both; }
.web-ap-allpages { columns: 3; }
.web-ap-results { list-style: none; padding: 0 !important; }
.web-ap-results li { margin-bottom: 12px; }
.web-ap-results li > a { font-size: 1.1em; }
.web-ap-results small { color: #080; }
.web-ap-missing { padding: 8px 12px; border: 1px solid #c0c090; background: #ffffe8; }
`,
  });
})();
