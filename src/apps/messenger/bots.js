/* Bubble Messenger friends: the contact roster (real-life friends and family,
   all fictional) and the chat-bot engine behind them. Each friend has a voice,
   favorite topics, a typing speed and habits (bursts, nudges, winks, going
   away). The engine matches what you type against intents and keywords,
   remembers a thing or two you said, and returns a plan of actions
   (say, nudge, wink, status...) that messenger.js plays out with typing
   delays. AskBubbles is the helper bot: Aerium tips, jokes, fortunes, math,
   and it can open programs for you. */
(function () {
  'use strict';
  const A = window.Aerium;
  const NS = (A.bubbleMessenger = A.bubbleMessenger || {});
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ------------------------------------------------------------ statuses
  // orb: the glossy orb color family. Friends who are offline use 'offline' too.
  const STATUSES = [
    { id: 'online', label: 'Online', orb: 'online' },
    { id: 'busy', label: 'Busy', orb: 'busy' },
    { id: 'brb', label: 'Be Right Back', orb: 'away' },
    { id: 'away', label: 'Away', orb: 'away' },
    { id: 'phone', label: 'In a Call', orb: 'busy' },
    { id: 'lunch', label: 'Out to Lunch', orb: 'away' },
    { id: 'offline', label: 'Appear Offline', orb: 'offline' },
  ];
  const STATUS = {};
  STATUSES.forEach((s) => (STATUS[s.id] = s));
  const statusLabel = (id, forFriend) => (id === 'offline' ? (forFriend ? 'Offline' : 'Appear Offline') : (STATUS[id] || STATUS.online).label);
  const isAwayish = (id) => id === 'away' || id === 'brb' || id === 'lunch';
  NS.STATUSES = STATUSES;
  NS.status = { byId: STATUS, label: statusLabel, orb: (id) => (STATUS[id] || STATUS.online).orb, awayish: isAwayish };

  // ------------------------------------------------------------ shared jokes & facts
  const JOKES = [
    'Why do bubbles never win at hide and seek? You can always see right through them!',
    'Why did the window get a nudge? It kept freezing up!',
    'What did one ocean say to the other ocean? Nothing, they just waved.',
    'Why was the math book sad? It had too many problems.',
    'What do you call a fish that practices medicine? A sturgeon!',
    'Why did the taskbar feel left out? Everyone kept minimizing it.',
    'What is a computer\'s favorite snack? Microchips!',
    'Why did the cookie go to the nurse? It felt crummy.',
    'What did the sun say when it met the moon? Pleased to heat you!',
    'Why can\'t you trust a staircase? It\'s always up to something.',
    'How do you make a tissue dance? Put a little boogie in it.',
    'What do dolphins say when they\'re confused? Can you be more pacific?',
    'Why did the scarecrow win an award? He was outstanding in his field.',
    'What kind of music do balloons hate? Pop music.',
    'Why did the student bring a ladder to school? To go to high school!',
    'What do you call a sleepy bubble? A snoozle.',
  ];
  const FORTUNES = [
    'A fresh start is just one click away.',
    'Someone is about to send you a nudge. Brace yourself.',
    'Your next message will make somebody smile.',
    'Today is a great day to try something new. Maybe a new wallpaper?',
    'The bubbles are in your favor.',
    'You will find a lost sock. Eventually.',
    'A kind word from you will float farther than you think.',
    'Your lucky number is 7. Your lucky color is aqua.',
    'An adventure is waiting in the Start menu.',
    'Drink a glass of water. Your future self says thanks.',
    'Someone you know is thinking about pizza right now.',
    'Good news is sailing your way on a very slow boat.',
  ];
  const FACTS = [
    'Octopuses have three hearts and blue blood.',
    'Honey never spoils. People have found honey in ancient tombs that was still good to eat.',
    'A group of flamingos is called a flamboyance.',
    'Bananas are berries, but strawberries are not.',
    'Sea otters hold hands while they sleep so they don\'t drift apart.',
    'A day on Venus is longer than a year on Venus.',
    'Bubbles are round because a sphere holds the most air with the least skin.',
    'Dolphins sleep with one half of their brain at a time.',
    'The Pacific Ocean is bigger than all of Earth\'s land put together.',
    'Butterflies taste with their feet.',
    'Rainbows are actually full circles. From the ground we only see half.',
    'Goldfish can remember things for months, not just a few seconds.',
  ];
  const KNOCKS = [
    ['Bubble', 'bubble-ieve it or not, im here to say hi!! XD'],
    ['Pixel', 'pixel me up at 7, we\'re going to the arcade!'],
    ['Nudge', '*NUDGE* ...that\'s who XD', 'nudge'],
    ['Wink', 'wink u\'d know me by now ;)'],
    ['Lettuce', 'lettuce in, it\'s cold out here!! :P'],
    ['Interrupting cow', 'MOO!! lol'],
    ['Emoticon', 'emoticon see ur online!! :D'],
  ];

  // ------------------------------------------------------------ the roster
  // lines: intent -> list of lines. A line is a string, an array (a burst of
  // messages), or an object { say, expect, nudge, wink, then }.
  const yesno = (say, yes, no, other) => ({ say, expect: { kind: 'yesno', yes, no, other } });
  const story = (say, then) => ({ say, expect: { kind: 'any', then } });

  const FRIENDS = [
    {
      id: 'kayla', name: 'Kayla', full: 'Kayla Morgan', screen: '~*~ KaYLa ~*~ bff <3', email: 'kayla.sunshine@aerium.net',
      picture: 'avatars/avatar-butterfly', scene: 'imagery/vectorgarden', color: '#d4237a', font: 'comic', role: 'Best friend',
      about: 'Your best friend since second grade. Loves The Glass Kites, glitter gel pens, sleepovers and making up dances.',
      favorites: [['Band', 'The Glass Kites'], ['Color', 'Sky blue'], ['Snack', 'Popcorn with sprinkles']],
      since: 'Second grade',
      pms: ['~*~ we\'re gonna shine like summer never ends ~*~', '~*~ dancing in the kitchen with the radio on ~*~', '•°o.O sleepover friday!!! O.o°•', '~*~ glitter pens and big dreams ~*~'],
      songs: [['The Glass Kites', 'Summer on Repeat'], ['The Glass Kites', 'Paper Airplanes'], ['Mallrats Club', 'Escalator Days']],
      start: [['online', 1]], cps: 9, think: [500, 1400], hesitate: 0.06, emoRate: 0.45, emos: [':D', '(L)', ';)', ':)', '(*)'],
      nudgeBack: 0.5, winkRate: 0.07, awayRate: 0.04, opener: 3, style: 'bubbly', winkPrefs: ['hearts', 'bubbles', 'rainbow'],
      lines: {
        greet: ['heyyyy {name}!!! :D', 'hiii!! (L)', 'HEY bff!!', 'omg hiii :D', ['heyyy', 'wats up?? :)']],
        howareyou: [{ say: 'im sooo good!! wbu? :D', expect: { kind: 'mood' } }, { say: 'omg amazing, i finally finished my science poster!! u?', expect: { kind: 'mood' } }, { say: ['good!!', 'kinda hyper lol i had 2 cupcakes XD', 'hbu?'], expect: { kind: 'mood' } }],
        doing: ['nm just listening to the glass kites on repeat lol (8)', 'making a new playlist!! wbu?', 'painting my nails blue and chatting w/ u :P', 'watching tv but its a rerun :( wbu'],
        nm: ['lol same', 'haha same here', 'boring day huh lol'],
        moodGood: ['yay!! :D', 'good good (Y)', 'awesome!!'],
        sad: ['aww nooo whats wrong?? :(', ['omg :(', 'want me to come over? i can bring popcorn', '(L)'], '*hugs* its gonna be ok!! u always have me (L)'],
        bored: ['omg me too!! lets make up a dance lol', 'ur bored?? call me!! lol', ['lets play 20 questions!!', 'ok im thinking of something...', 'jk i forgot what it was XD']],
        tired: ['same omg i stayed up so late', 'go take a nap lol ill guard ur contact list'],
        happy: ['yayyy!! :D', 'omg thats awesome!!', 'woohoo!! (*)'],
        laugh: ['lol', 'LOL', 'hahaha', 'XD', 'lolol ikr'],
        joke: ['u want jokes? ask marcus lol hes the clown', 'ok ok what do u call a fish with no eyes?? a fsh!! XD'],
        bye: ['nooo ok ttyl!! (L)', 'byeee!! call me later!!', 'ok bye bff!! <3'],
        brb: ['kk hurry back!!', 'ok!! ill be here :)'],
        back: ['yay ur back!! :D', 'wb!!'],
        thanks: ['np!! (L)', 'anytime bff :)'],
        sorry: ['its ok!! :)', 'aww dont worry about it'],
        compliment: ['awww stoppp u are!! (L)', 'omg ur gonna make me cry lol ur the best'],
        love: ['love u too bff!!! (L)(L)(L)', 'aww bffs 4ever <3'],
        insult: ['hey!! :( thats mean', 'um ok rude lol'],
        school: ['ugh dont remind me, we have that math test thursday :S', 'did u finish the science poster yet? mine has glitter lol', 'mrs. peterson gave SO much homework today :@'],
        music: ['omg have u heard the new glass kites song?? its sooo good (8)', 'i\'ve listened to summer on repeat like 50 times today lol', 'we should start a band!! ill sing and u can play... tambourine XD'],
        games: ['lol tyler keeps asking me to play games, im so bad at them XD', 'i only like bubble pop, its so relaxing'],
        sports: [yesno(['jordan said we should come to the game saturday!!', 'wanna go??'], ['yay!! ill make a sign lol', 'ok its a plan!! (so)'], ['aww ok :(', 'lol ok ill cheer for both of us'])],
        food: ['mmm now im hungry lol', 'pizza party at my house friday!! (pi)', 'my mom made cupcakes!!! (^)'],
        pets: ['my cat biscuit just knocked my juice over lol (@)', 'omg i want a puppy sooo bad (&)'],
        weather: ['its so nice out!! (#)', 'ugh its raining, perfect movie weather tho'],
        plans: [yesno(['omg ok so', 'sleepover at my house friday??', 'we can watch mermaid academy 2 and make friendship bracelets!!'], ['YAYYY!! :D', 'ok ill ask my mom!! its gonna be sooo fun'], ['aww :( ok maybe next time', 'noooo lol ok fine'])],
        art: ['lily is sooo good at drawing, did u see her notebook?', 'i drew a unicorn once. it looked like a potato XD'],
        aerium: ['omg i love the fish on the desktop, i named one of them bubbles lol', 'have u changed ur wallpaper yet? i have the bubbly one'],
        yes: ['yay!!', 'lol ok!!', 'yesss'],
        no: ['aww ok', 'no?? lol ok'],
        who: ['um its me?? ur bff?? lol', 'kayla!! duh XD'],
        asl: ['lol u know how old i am, we\'re in the same class XD', 'um we literally sit next to each other in homeroom lol'],
        idk: ['hmm idk!! wbu?', 'good question lol', 'ooh idk, what do u think?'],
        fallback: ['lol', 'omg rly?', 'haha totally', 'wait what lol', 'ikr!!', 'thats so cool!!', 'no wayyy', 'lol ur so random XD', 'hehe', 'ooh tell me more!!'],
        followup: ['so wats new?', 'did u finish the homework?', 'r u going to jordan\'s game?', 'have u heard the new glass kites song??', 'what r u doing this weekend?'],
        opener: [['heyyyy!!!', 'omg {name} ur on :D'], story(['hiii', 'guess what!!!'], ['THE GLASS KITES R PLAYING AT THE MALL SATURDAY!!! (8)', 'we HAVE to go']), ['omg i have to tell u something', 'ok so remember the class hamster?', 'it had BABIES!!! 5 of them :D'], ['{name}!!!', 'r u there?', 'hellooooo']],
        nudge: ['hey!! lol', 'ahh ur shaking my screen XD', 'NUDGE BACK!!'],
        wink: ['awww cute!! :D', 'omg i love that one!!', 'hehe (L)'],
        nowplaying: ['ooh ur listening to {song}!! is it good?', '{song}?? good choice :D', 'omg i love {artist}!!'],
        signin: ['omg hiii when did u get on??', 'ur on!! :D'],
        away: ['brb my mom\'s calling me', 'brb dinner!!', 'brb gotta feed biscuit (@)'],
        return: ['back!! sorry lol', 'ok im back!! what did i miss', 'back :D'],
        memName: ['{name}!! is that ur new nickname? lol i love it'],
        memLike: ['omg u like {thing}?? me too!!', '{thing} is sooo cool!!'],
        callback: ['btw i was thinking about {thing} lol cuz u said u like it', 'r u still into {thing}??'],
        petCall: ['how\'s {pet}?? give them a hug from me (L)'],
        busyReply: ['oh ur busy? ok ill be quick lol'],
        appearOffline: ['wait ur appearing offline arent u XD sneaky!!'],
      },
      blockedPm: '~*~ why does it say ur offline?? :( ~*~',
    },
    {
      id: 'tyler', name: 'Tyler', full: 'Tyler Brooks', screen: 'xX_PiXeL_nInJa_Xx', email: 'pixel.ninja@aerium.net',
      picture: 'bm:gamepad', scene: 'imagery/dark-ribbons', color: '#1d7a2a', font: 'verdana', role: 'Gamer friend',
      about: 'Sits behind you in science. Has beaten every level of Bubble Pop at least twice and brags about his Minesweeper times.',
      favorites: [['Game', 'Starfall Arena'], ['Snack', 'Cheese puffs'], ['Best time', 'Minesweeper in 38 seconds']],
      since: 'Fourth grade',
      pms: ['~*~ one more level till the morning light ~*~', '~*~ respawning in 3... 2... 1... ~*~', '~*~ high score dreams and pixel skies ~*~'],
      songs: [['8-Bit Heroes', 'Final Boss Waltz'], ['Chiptune Kids', 'Level Up Anthem']],
      start: [['busy', 1], ['online', 1]], cps: 7, think: [700, 2200], hesitate: 0.07, emoRate: 0.3, emos: [':P', 'XD', '(H)', 'B-)'],
      nudgeBack: 0.4, winkRate: 0.02, awayRate: 0.06, opener: 1.5, style: 'gamer', winkPrefs: ['stars', 'bubbles'],
      lines: {
        greet: ['sup', 'yo {name}', 'hey hey', 'o hai', 'yo whats up'],
        howareyou: [{ say: 'good, just beat the ice level finally lol. u?', expect: { kind: 'mood' } }, { say: 'tired, stayed up too late playing starfall arena XD wbu', expect: { kind: 'mood' } }, { say: 'pretty good. u?', expect: { kind: 'mood' } }],
        doing: ['playing dungeon tides, im on the lava level', 'grinding for coins lol', 'trying to beat my minesweeper time', 'nm just waiting for my game to download'],
        nm: ['cool cool', 'same lol'],
        moodGood: ['nice (Y)', 'sweet'],
        sad: ['dude that stinks :( want me to tell u a game cheat? always helps lol', 'aw man. u ok?', ['dang', 'if it helps i can let u win at bubble pop lol']],
        bored: [{ say: 'play minesweeper! race me, beginner mode, tell me ur time', expect: { kind: 'number' } }, 'bored = time for a game marathon', 'try the bubble pop game its so good'],
        tired: ['same lol i need a save point for real life'],
        happy: ['nice!! gg', 'sweet (Y)'],
        laugh: ['lol', 'XD', 'lolol', 'haha pwned'],
        joke: ['why did the controller go to school? to get more buttons. lol ok that was bad', 'whats a gamers fav vegetable? an arti-choke... cuz they always choke in boss fights XD'],
        bye: ['cya', 'later dude', 'gg ttyl', 'k bye'],
        brb: ['k', 'kk'],
        back: ['wb', 'welcome back n00b jk'],
        thanks: ['np', 'no prob'],
        sorry: ['its cool', 'np'],
        compliment: ['lol thx', 'i know im awesome XD jk thx'],
        love: ['lol ok dude', 'haha thx buddy'],
        insult: ['pfft n00b', 'lol u wish'],
        school: ['ugh homework = boss battle with no save points', 'did u do the science worksheet? i kinda... didnt lol'],
        music: ['i mostly listen to game soundtracks lol (8)', 'have u heard final boss waltz? its epic'],
        games: [{ say: 'wanna race? open minesweeper, beginner mode, tell me ur time', expect: { kind: 'number' } }, 'starfall arena is the best game ever made, fight me', 'i got the golden sword in dungeon tides!!!'],
        sports: ['sports r cool i guess... in video games lol'],
        food: ['pizza = gamer fuel (pi)', 'i\'m eating cheese puffs and my keyboard is orange now XD'],
        pets: ['my dog keeps stepping on my controller lol (&)'],
        weather: ['weather? idk i havent been outside today XD'],
        plans: ['weekend plan: games. lots of games lol', 'u should come over sat, we can play kart blasters 3'],
        art: ['lily drew me a dragon for my binder, its sick'],
        aerium: ['have u tried bubble pop? my high score is insane', 'minesweeper is secretly the hardest game ever'],
        yes: ['sweet', 'k cool'],
        no: ['aw ok', 'lame lol jk'],
        who: ['its tyler lol', 'ur friendly neighborhood pixel ninja XD'],
        asl: ['lol dude we\'re in the same grade'],
        idk: ['idk', 'no clue lol', 'idk ask askbubbles lol'],
        fallback: ['lol', 'cool', 'nice', 'oh ok', 'ya', 'true', 'haha', 'dude', 'hmm', 'for real?'],
        followup: ['u beat level 8 yet?', 'wanna race at minesweeper later?', 'did u see the new starfall arena map?'],
        opener: [['yo', 'u there?'], ['dude', 'i just beat level 8 on bubble pop!!!'], { say: ['sup {name}', 'wanna race at minesweeper?'], expect: { kind: 'yesno', yes: [{ say: 'k open it up, beginner mode. go!! tell me ur time', expect: { kind: 'number' } }], no: ['scared? XD jk'] } }, ['yo check this out', 'i got a new high score', '3,405,800 points B-)']],
        nudge: ['hey whoa lol', 'nudge war?? u r going down XD'],
        wink: ['lol nice', 'haha whats that one called'],
        nowplaying: ['ur listening to {song}? not bad', '{artist}? i thought u only liked game music lol'],
        signin: ['oh hey ur on'],
        away: ['brb boss fight', 'brb mom says dinner', 'gotta save my game brb'],
        return: ['back', 'ok back, i died lol', 'back. lag was terrible'],
        memName: ['lol ok {name} it is'],
        memLike: ['{thing}? nice', 'oh cool i like {thing} too'],
        callback: ['u still into {thing}?'],
        petCall: ['hows {pet} doing?'],
        busyReply: ['kinda in a game but ok lol'],
        appearOffline: ['lol are u appearing offline? i can still see u typing XD'],
      },
      blockedPm: '~*~ lag or did someone block me?? ~*~',
    },
    {
      id: 'marcus', name: 'Marcus', full: 'Marcus Reed', screen: '*~* MaRcUs ThE MaGnIfIcEnT *~*', email: 'marcus.magnificent@aerium.net',
      picture: 'avatars/avatar-fish', scene: 'imagery/sunrise', color: '#e0621a', font: 'comic', role: 'Class clown',
      about: 'Class clown. Has a joke for everything and named his goldfish Sir Bubbles the Third.',
      favorites: [['Pet', 'Sir Bubbles the Third (a goldfish)'], ['Talent', 'Juggling (sort of)'], ['Food', 'Tacos']],
      since: 'Kindergarten',
      pms: ['~*~ if life gives u lemons, juggle them ~*~', '~*~ laughing all the way to the lunch line ~*~', '~*~ i put the fun in fun-damentals ~*~'],
      songs: [['The Rubber Chickens', 'Honk If You\'re Happy'], ['DJ Kazoo', 'Kazoo Party']],
      start: [['online', 7], ['away', 3]], cps: 8, think: [500, 1500], hesitate: 0.05, emoRate: 0.4, emos: ['XD', ':P', '(6)', ':D', '(lol)'],
      nudgeBack: 0.75, winkRate: 0.05, awayRate: 0.04, opener: 2, style: 'clown', winkPrefs: ['fish', 'bubbles', 'stars'],
      lines: {
        greet: ['HEYYYY', 'yo yo yo', 'wassup {name}!!', 'ahoy matey XD', 'greetings earthling :P'],
        howareyou: [{ say: 'fantastic, magnificent, spectacular. u? XD', expect: { kind: 'mood' } }, 'im great, i just taught my goldfish to high five... jk he has no hands lol', { say: 'good! wbu?', expect: { kind: 'mood' } }],
        doing: ['practicing my juggling. i dropped everything lol', 'trying to lick my elbow. its impossible. u tried it just now didnt u XD', 'nm just being awesome lol'],
        nm: ['cool story bro XD', 'lol same'],
        moodGood: ['nice!! high five!! *misses*', 'awesome sauce'],
        sad: ['aww no :( want a joke? why did the tomato turn red? it saw the salad dressing!! ...did it work?', 'hey hey, no sad faces allowed. here: (lol)(lol)(lol)', ['oh no', '*does a silly dance to cheer u up*', 'did it work? XD']],
        bored: ['bored?? ok lets play a game: first one to laugh loses. ...u lost XD', 'try saying unique new york 5 times fast lol', 'i could tell u a joke about paper but its tearable XD'],
        tired: ['me too, i was up all night wondering where the sun went... then it dawned on me XD'],
        happy: ['WOOHOO!!', 'party time!! *confetti*'],
        laugh: ['LOL', 'hahaha', 'lolol', 'XD XD', 'i know im hilarious'],
        joke: ['KNOCK'],
        bye: ['byeee!! dont do anything i wouldnt do XD', 'see u later alligator!!', 'peace out, trout!!'],
        brb: ['kk dont be long or ill tell more jokes lol'],
        back: ['wb!! i missed u sooo much (not really) jk XD'],
        thanks: ['no prob bob', 'ur welcome, that\'ll be 5 bucks XD'],
        sorry: ['apology accepted, ur honor XD'],
        compliment: ['i know, i know, i\'m amazing lol', 'thank u thank u, i\'ll be here all week *bows*'],
        love: ['aww lol ur the best buddy', 'thanks pal XD'],
        insult: ['i know u are but what am i XD', 'ouch my feelings lol jk'],
        school: ['i got detention for making the class laugh... worth it XD', 'our science teacher laughed at my joke today!! first time ever'],
        music: ['i\'m learning kazoo lol', 'have u heard honk if you\'re happy? best song ever XD'],
        games: ['i\'m terrible at games but i\'m great at trash talk lol'],
        sports: ['i tried out for soccer and kicked the ball backwards XD'],
        food: ['i once ate 6 tacos in a row. i regret nothing (pi)', 'why did the pizza apply for a job? it wanted to make some dough XD'],
        pets: ['my goldfish sir bubbles III says hi (fish)', 'sir bubbles the third just did a flip!! (fish)'],
        weather: ['its raining cats and dogs... i just stepped in a poodle XD'],
        plans: ['this weekend im planning a prank on my big brother lol', 'saturday: world record attempt for most pancakes eaten. wish me luck'],
        art: ['i drew a stick figure once. it was a masterpiece XD'],
        aerium: ['i made the recycle bin make noises for like 10 min lol', 'the nudge button is my favorite button in the world'],
        yes: ['sweet!!', 'awesome sauce'],
        no: ['aw man', 'fine, be that way XD'],
        who: ['the one, the only, marcus the magnificent!!! *trumpet sounds*'],
        asl: ['lol ur funny, we\'re in the same class!!'],
        idk: ['idk but i know a joke about it lol', 'hmm... 42? XD'],
        fallback: ['LOL', 'wait what XD', 'lolol', 'ur so random lol', 'haha nice', 'hmm interesting... *strokes imaginary beard*', 'lol', 'no wayyy', 'dude'],
        followup: ['wanna hear a joke?', 'did u see what happened at lunch today lol', 'guess what sir bubbles did today'],
        opener: ['KNOCK', { say: ['hey {name}', 'wanna hear a joke?'], expect: { kind: 'yesno', yes: ['KNOCK'], no: ['too bad, heres one anyway:', 'JOKE'] } }, ['BOO!!', 'lol did i scare u XD'], ['hey', 'i just did the funniest thing', 'i put googly eyes on everything in our fridge XD']],
        nudge: ['NUDGE WAR!!! >:)', 'oh its ON'],
        wink: ['LOL', 'haha nice, i\'m sending u one back'],
        nowplaying: ['{song}? thats my jam!! *dances*', 'lol ur listening to {song}, nice taste (8)'],
        signin: ['surprise!! i see u lol'],
        away: ['brb gotta go feed sir bubbles (fish)', 'brb my brother is hogging the computer'],
        return: ['i\'m baaaack', 'back!! did u miss me? XD'],
        memName: ['{name}?? lol ok sir {name} of the round table'],
        memLike: ['{thing}? i love {thing}!! jk i have no idea what that is XD', 'ooh {thing}, fancy'],
        callback: ['hows {thing} going lol'],
        petCall: ['tell {pet} that sir bubbles says hi (fish)'],
        busyReply: ['ur busy? i\'ll be quick. ok. bye. jk XD'],
        appearOffline: ['hey r u appearing offline?? i see u XD'],
      },
      blockedPm: '~*~ is it just me or did someone block me XD ~*~',
    },
    {
      id: 'lily', name: 'Lily', full: 'Lily Chen', screen: '.:*~ lily ~*:.', email: 'lily.watercolor@aerium.net',
      picture: 'avatars/avatar-leaf', scene: 'imagery/bokeh-day', color: '#7a4fbf', font: 'georgia', role: 'Artist friend',
      about: 'Quiet, kind and always drawing in the margins. Paints clouds, writes tiny poems and loves rainy days.',
      favorites: [['Art supply', 'Watercolors'], ['Weather', 'Rain'], ['Pet', 'A bunny named Cloud']],
      since: 'Art class, last year',
      pms: ['~*~ i painted you a sky where the rain falls up ~*~', '~*~ clouds are just the sky daydreaming ~*~', '~*~ quiet colors, loud heart ~*~'],
      songs: [['Rainy Window', 'Watercolor Blue'], ['Paper Moons', 'Lanterns']],
      start: [['away', 1], ['online', 1]], cps: 4.5, think: [1500, 3500], hesitate: 0.2, emoRate: 0.25, emos: [':)', '(F)', '(R)', '(8)'],
      nudgeBack: 0.15, winkRate: 0.02, awayRate: 0.05, opener: 0.8, style: 'quiet', winkPrefs: ['rainbow', 'sunrise'],
      lines: {
        greet: ['hi :)', 'oh hey', 'hi {name}', 'hello :)'],
        howareyou: [{ say: 'i\'m ok. kind of sleepy... how are you?', expect: { kind: 'mood' } }, 'good :) i\'ve been drawing all day', 'pretty good. it\'s raining here, i like it'],
        doing: ['drawing clouds again lol', 'painting a whale in the sky', 'just listening to music and doodling (8)', 'writing a little poem'],
        nm: ['that\'s ok :)', 'hm, same'],
        moodGood: ['good :)', 'i\'m glad'],
        sad: ['oh... i\'m sorry :( do you want to talk about it?', 'sending you a little rainbow (R)', ['aw', 'that sounds hard', 'i\'m here if you want to talk (F)']],
        bored: ['you could draw something! even a bad drawing is fun', 'try opening paint and drawing the view from your window?', 'i like looking at clouds when i\'m bored'],
        tired: ['me too... let\'s both drink some water'],
        happy: ['that makes me happy too :)', 'yay :)'],
        laugh: ['hehe', 'haha :)', 'lol'],
        joke: ['hmm... why did the painting go to jail? it was framed. hehe', 'i\'m not good at jokes... what do you call a sleeping dinosaur? a dino-snore :)'],
        bye: ['bye :) talk later', 'ok, see you tomorrow (F)', 'bye {name}'],
        brb: ['ok :)'],
        back: ['welcome back :)'],
        thanks: ['you\'re welcome :)', 'of course'],
        sorry: ['it\'s ok :)'],
        compliment: ['oh... thank you :$', 'that\'s really nice of you to say :)'],
        love: ['aw, you\'re a good friend (F)'],
        insult: ['...ok :(', 'that wasn\'t very nice'],
        school: ['art class is my favorite part of the day', 'i doodled all over my math notes again...'],
        music: ['i\'ve been listening to rainy window a lot (8)', 'music helps me draw'],
        games: ['i\'m not really into games... except pairs, i like the pictures'],
        sports: ['i watched jordan\'s game, i drew the field from the bleachers'],
        food: ['i\'m having tea and toast :) (C)'],
        pets: ['i have a bunny named cloud. she\'s asleep on my feet'],
        weather: ['i love the rain. it makes everything sound soft', 'the clouds today look like sheep'],
        plans: ['maybe going to the art museum with my mom'],
        art: [yesno(['can i show you something?'], ['ok it\'s a painting of a whale floating over a city', 'it\'s supposed to feel like a dream', 'i\'ll bring it to school :)'], ['oh ok, maybe later :)']), 'have you tried drawing in aerium paint? we could both draw a cloud and compare', 'i\'m working on a comic about a fish who wants to fly'],
        aerium: ['the paint program is actually really nice', 'i like the wallpapers with the bubbles'],
        yes: ['ok :)', 'yay'],
        no: ['oh ok', 'that\'s fine'],
        who: ['it\'s lily :)'],
        asl: ['um... you know me, we\'re in art class together :)'],
        idk: ['hmm, i\'m not sure', 'i don\'t know... what do you think?'],
        fallback: ['hm', 'oh cool', 'that\'s nice :)', 'i see', 'mhm', 'oh really?', '...', 'that\'s interesting'],
        followup: ['have you drawn anything lately?', 'did you see the clouds today?', 'what music are you listening to?'],
        opener: [['hi :)', 'are you busy?'], ['hey', 'i drew something that reminded me of you'], ['hi', 'the sky is really pretty right now, you should look outside']],
        nudge: ['oh! you scared me lol', 'hi :)'],
        wink: ['aww, that\'s cute', 'pretty :)'],
        nowplaying: ['{song}... i like that one', 'ooh, what\'s {song} like?'],
        signin: ['oh hi :)'],
        away: ['brb, my paint is drying', 'brb dinner'],
        return: ['back :)', 'sorry, i\'m back'],
        memName: ['{name}. that\'s a nice name for a character in my comic'],
        memLike: ['{thing}? that\'s nice', 'i didn\'t know you liked {thing} :)'],
        callback: ['i drew something with {thing} in it, because you said you like it'],
        petCall: ['how is {pet}? :)'],
        busyReply: ['oh you\'re busy, sorry. i\'ll keep it short'],
        appearOffline: ['oh, you\'re appearing offline? your secret is safe with me :)'],
      },
      blockedPm: '~*~ some clouds just drift away ~*~',
    },
    {
      id: 'jordan', name: 'Jordan', full: 'Jordan Hayes', screen: '~*~ J0RD4N #10 ~*~ goal!!', email: 'jordan.goal10@aerium.net',
      picture: 'avatars/avatar-dolphin', scene: 'imagery/meadow', color: '#1f5fc4', font: 'arial', role: 'Sporty friend',
      about: 'Soccer captain and swim team sprinter. Always at practice, always cheering the loudest.',
      favorites: [['Sport', 'Soccer'], ['Position', 'Striker'], ['Snack', 'Orange slices at halftime']],
      since: 'Summer soccer camp',
      pms: ['~*~ running through the rain like we can\'t lose ~*~', '~*~ game day energy all week ~*~', '~*~ one more lap, one more goal ~*~'],
      songs: [['Stadium Lights', 'Game Day'], ['The Fast Lanes', 'Victory Lap']],
      start: [['offline', 1]], cps: 7, think: [700, 1800], hesitate: 0.06, emoRate: 0.35, emos: ['(so)', '(Y)', ':D'],
      nudgeBack: 0.45, winkRate: 0.02, awayRate: 0.07, opener: 1.2, style: 'sporty', winkPrefs: ['stars', 'sunrise'],
      lines: {
        greet: ['yo!!', 'heyyy {name}!!', 'wassup!!', 'yooo'],
        howareyou: [{ say: 'tired lol practice was brutal. u?', expect: { kind: 'mood' } }, 'great!! we won today!!! (so)', { say: 'good!! wbu??', expect: { kind: 'mood' } }],
        doing: ['icing my knee lol', 'just got back from swim practice', 'watching soccer highlights', 'stretching lol coach says we have to'],
        nm: ['cool cool', 'same'],
        moodGood: ['nice!! (Y)', 'lets gooo'],
        sad: ['dude :( want me to come over and kick the ball around?', 'hey chin up!! u got this (Y)', ['aw man', 'u know what helps? running. or ice cream. or both lol']],
        bored: ['come to the park!! we\'re playing pickup soccer', 'do 20 jumping jacks lol trust me', 'lets go on a bike ride!!'],
        tired: ['same, coach made us run so many laps'],
        happy: ['LETS GOOO!!', 'yesss (Y)'],
        laugh: ['lol', 'hahaha', 'LOL'],
        joke: ['why did the soccer ball quit the team? it was tired of getting kicked around lol', 'why is a soccer stadium so cool? its full of fans!! XD'],
        bye: ['later!!', 'peace!! gotta sleep, early practice', 'cya at school!!'],
        brb: ['kk'],
        back: ['wb!!'],
        thanks: ['np!!', 'anytime dude'],
        sorry: ['all good!!'],
        compliment: ['thanks!! ur awesome too (Y)'],
        love: ['haha thanks dude!! (Y)'],
        insult: ['yikes lol ok'],
        school: ['i have a test tomorrow and practice tonight ugh', 'gym is the best class obviously lol'],
        music: ['game day is my pump up song (8)', 'coach plays the worst music at practice lol'],
        games: ['i only play soccer video games lol', 'i beat tyler at bubble pop once, he was so mad XD'],
        sports: [yesno(['we have a big game saturday!!', 'u coming??'], ['YESSS!! bring a sign lol', 'ur the best!! (so)'], ['aw ok :( next time!!', 'ok but ur missing out lol']), 'coach made us run 10 laps today', 'i scored 2 goals today!!! (so)(so)', 'swim meet next week, i\'m doing the 50 free'],
        food: ['i\'m starving, practice makes me so hungry (pi)', 'orange slices at halftime r the best'],
        pets: ['my dog loves chasing soccer balls (&)'],
        weather: ['hope it doesnt rain for the game!!', 'its perfect soccer weather (#)'],
        plans: ['game on saturday then pizza with the team!!'],
        art: ['lily drew our team logo, its so cool'],
        aerium: ['i beat tyler at bubble pop once lol he was so mad'],
        yes: ['yesss!!', 'sweet!!'],
        no: ['aw ok', 'ok ok'],
        who: ['its jordan lol'],
        asl: ['haha u know how old i am dude'],
        idk: ['no idea lol', 'idk!! wbu?'],
        fallback: ['nice!!', 'lol', 'for real?', 'cool', 'sweet', 'haha', 'no way!!', 'true'],
        followup: ['u coming to the game?', 'did u see the game last night?', 'wanna play soccer at recess tomorrow?'],
        opener: [['yo!!', 'we won!!!! 3-1 (so)'], yesno(['heyyy', 'u coming to the game saturday??'], ['YESSS!! (so)'], ['aw man ok']), story(['{name}!!', 'guess who scored the winning goal'], ['ME!!! lol (so)(Y)'])],
        nudge: ['woah lol', 'nudge back!!'],
        wink: ['haha nice', 'lol that was cool'],
        nowplaying: ['{song}!! good pump up song (8)', 'ooh is {song} new?'],
        signin: ['yo ur on!!'],
        away: ['brb practice', 'gtg to swim practice, brb'],
        return: ['back!!', 'back from practice, so tired lol'],
        memName: ['{name}!! cool nickname dude'],
        memLike: ['{thing}? nice!!', 'oh cool, {thing} is awesome'],
        callback: ['yo u still into {thing}?'],
        petCall: ['hows {pet}? (&)'],
        busyReply: ['ur busy? ok quick question lol'],
        appearOffline: ['r u appearing offline?? sneaky lol'],
      },
      blockedPm: '~*~ offside?? did someone just block me ~*~',
    },
    {
      id: 'mom', name: 'Mom', full: 'Mom', screen: 'Mom (at work)', email: 'mom.at.work@aerium.net',
      picture: 'avatars/avatar-sun', scene: 'imagery/clear-sky', color: '#1a4a8a', font: 'times', role: 'Family',
      about: 'Your mom. At the office until five. Still figuring out how the little smiley faces work.',
      favorites: [['Drink', 'Coffee, two sugars'], ['Show', 'Cooking shows'], ['Favorite person', 'You']],
      since: 'Always',
      pms: ['~*~ Counting down the hours till I\'m home :-) ~*~', '~*~ Home is wherever you are ~*~', '~*~ Did you take the chicken out of the freezer? ~*~'],
      songs: [['The Sunday Drivers', 'Morning Commute'], ['Soft Rock Station', 'Coffee Break Serenade']],
      start: [['busy', 4], ['phone', 3], ['online', 3]], cps: 3.8, think: [1500, 4000], hesitate: 0.25, emoRate: 0.3, emos: [':-)', '(L)'],
      nudgeBack: 0.08, winkRate: 0, awayRate: 0.08, opener: 1, style: 'mom', winkPrefs: ['sunrise'],
      lines: {
        greet: ['Hi sweetie! :-)', 'Hello honey!', 'Hi there! How\'s my favorite kid?'],
        howareyou: [{ say: 'I\'m good, just busy at work. How was school?', expect: { kind: 'mood' } }, { say: 'Tired, but good! It\'s been a long day of meetings. How are you, honey?', expect: { kind: 'mood' } }],
        doing: ['Answering about a hundred emails. :-)', 'On my lunch break! Eating a salad and thinking about pizza.', 'Working on a big report. I\'ll be home by 5:30.'],
        nm: ['Okay, sweetie.', 'Nothing? That\'s okay!'],
        moodGood: ['That\'s wonderful, honey!', 'Good! That makes me happy. :-)'],
        sad: ['Oh, honey. Do you want to talk about it tonight? We can have hot chocolate. (C)', 'I\'m sorry you\'re having a hard day. I love you very much. (L)', 'Hang in there, sweetie. I\'ll be home soon and we can talk.'],
        bored: ['Bored? I have a solution: your room could use some cleaning. :-)', 'You could read a book! Or unload the dishwasher. Just saying. :-)'],
        tired: ['Maybe go to bed a little early tonight, okay?'],
        happy: ['That\'s wonderful! Tell me all about it at dinner.'],
        laugh: ['LOL! That means laughing out loud, right?', 'Haha!', 'You get that sense of humor from me, you know.'],
        joke: ['Why did the scarecrow win an award? Because he was outstanding in his field! :-)', 'I don\'t know any jokes. Ask your uncle, he tells the same one at every family dinner.'],
        bye: ['Bye sweetie! Love you! Love, Mom', 'Okay, back to work. See you tonight! (L)', 'Bye honey. Don\'t forget your homework!'],
        brb: ['Okay, sweetie.'],
        back: ['Welcome back!'],
        thanks: ['You\'re welcome, sweetie!', 'Anytime, honey. :-)'],
        sorry: ['That\'s okay, honey. Thank you for saying sorry.'],
        compliment: ['Aww, you\'re the sweetest. (L)', 'You just made my whole day, honey.'],
        love: ['I love you too, sweetie! More than all the stars. (L)', 'Love you more! :-)'],
        insult: ['Excuse me? Let\'s try that again with nicer words, please.', 'Hey. We don\'t talk like that. :-('],
        school: [yesno('Did you finish your homework?', ['That\'s my kid! I\'m so proud of you. :-)', 'Great job! You can have some computer time then.'], ['Homework first, then chatting. Deal?', 'Please get started on it, honey. You\'ll feel better once it\'s done.']), 'How was your math test?', 'Don\'t forget your field trip form. It\'s on the fridge.'],
        music: ['Is that the band you like? It\'s a little loud for me. :-)', 'In my day we listened to music on cassette tapes!'],
        games: ['Only one more game, then homework. :-)', 'Did you beat your high score? I\'m proud either way.'],
        sports: ['Don\'t forget your shin guards if you have practice!'],
        food: ['Tacos for dinner tonight?', 'There\'s leftover pasta in the fridge if you\'re hungry.', 'Did you eat lunch?'],
        pets: ['Did anyone feed the fish today?'],
        weather: ['Take a jacket if you go outside, it\'s supposed to get chilly!', 'It\'s so nice out. Go get some fresh air!'],
        plans: ['We\'re going to Grandma\'s on Sunday, remember?', 'Friday night is family movie night! You pick the movie.'],
        art: ['I put your drawing on my desk at work. Everyone loves it!'],
        aerium: ['How do I change the desktop picture? I want the one with the fish.'],
        yes: ['Good! :-)', 'Great, honey.'],
        no: ['Okay, sweetie.', 'Hmm, okay.'],
        who: ['It\'s Mom! Who else would it be? :-)'],
        asl: ['I\'m your mother! LOL. Is that how you use it?'],
        idk: ['Hmm, I\'m not sure. Let\'s look it up together tonight.', 'Good question! Ask me when I get home.'],
        fallback: ['Okay, sweetie.', 'That\'s nice, honey!', 'Oh, really?', 'Hmm, interesting!', 'Okay! :-)', 'I see!', 'Tell me more at dinner.'],
        followup: ['How was school today?', 'Did you eat lunch?', 'Is your homework done?'],
        opener: [['Hi sweetie!', 'Just checking in. Did you get home okay?'], ['Hello honey.', 'Dinner might be a little late tonight. LOL, Mom'], yesno(['Hi!', 'Did you finish your homework?'], ['That\'s my kid! :-)'], ['Homework first, then chatting. Deal? :-)']), ['Hi honey!', 'How do I make the little smiley faces?', 'Oh! Here: :-) :-D'], ['Sweetie, can you take the chicken out of the freezer?', 'Thank you! Love, Mom']],
        nudge: ['Was that you shaking my screen? My coworker thought it was an earthquake!', 'How did you do that? :-O'],
        wink: ['Oh my goodness, that was cute!', 'How do you make the screen do that?'],
        nowplaying: ['What\'s {song}? Is it the song you play in the car?', 'Turn it down a little, sweetie. :-)'],
        signin: ['There you are! :-)'],
        away: ['I\'m heading into a meeting. Talk later! Love, Mom', 'Be right back, my boss is here.'],
        return: ['I\'m back! That meeting could have been an email.', 'Okay, I\'m back, sweetie.'],
        memName: ['{name}? Is that what the kids are calling you now? :-)'],
        memLike: ['You like {thing}? I didn\'t know that!', 'Oh, {thing}! That\'s nice, honey.'],
        callback: ['I saw something about {thing} today and thought of you!'],
        petCall: ['Don\'t forget to feed {pet}!'],
        busyReply: ['Oh, you\'re busy? Me too! Quick question...'],
        appearOffline: ['Your status says offline, but here you are! Tricky. :-)'],
        late: ['Shouldn\'t you be in bed, young one? :-)', 'It\'s late, sweetie. Bedtime soon, okay?'],
      },
      blockedPm: '~*~ Why can\'t I see you online? Call me! ~*~',
    },
    {
      id: 'grandma', name: 'Grandma', full: 'Grandma Rose', screen: '~*~ GRANDMA ~*~', email: 'grandma.rose@aerium.net',
      picture: 'avatars/avatar-flower', scene: 'imagery/meadow', color: '#a3274f', font: 'tahoma', role: 'Family',
      about: 'Your grandma. Grows roses, bakes the best cookies in the world and types with one finger. Always in capital letters.',
      favorites: [['Flower', 'Roses'], ['Cookie', 'Chocolate chip'], ['Cat', 'Mr. Whiskers']],
      since: 'Before you were born',
      pms: ['~*~ ROSES ARE BLOOMING AND COOKIES ARE BAKING ~*~', 'HOW DO I CHANGE THIS MESSAGE', '~*~ GRANDKIDS MAKE LIFE SWEET ~*~'],
      songs: [['The Moonlight Orchestra', 'Waltz for Rosie']],
      start: [['offline', 1]], cps: 2.2, think: [2500, 5000], hesitate: 0.3, emoRate: 0.3, emos: [':)', '(F)', '(^)', ': )'],
      nudgeBack: 0.1, winkRate: 0.03, awayRate: 0.06, opener: 1, style: 'grandma', winkPrefs: ['hearts', 'sunrise', 'rainbow'],
      lines: {
        greet: ['hello dear!', 'hi sweetheart', 'hello hello! is this thing on?', 'hi honey bun'],
        howareyou: [{ say: 'i am doing wonderful dear. my knees are a little creaky. how are you?', expect: { kind: 'mood' } }, { say: 'oh i\'m fine. the garden is blooming. are you eating well?', expect: { kind: 'yesno', yes: ['good! that\'s my grandbaby'], no: ['oh dear. come over and i\'ll feed you'] } }],
        doing: ['baking cookies. chocolate chip. i\'ll save you some (^)', 'knitting you a scarf. it\'s blue', 'watching my cooking show', 'trying to figure out this computer. your cousin set it up'],
        nm: ['that\'s alright dear'],
        moodGood: ['wonderful!', 'that\'s my sweetheart'],
        sad: ['oh sweetheart. come visit grandma and i\'ll make you cocoa (C)', 'everything looks better after a cookie and a hug. love you (L)', 'chin up buttercup. grandma loves you'],
        bored: ['when i was your age we played outside with a stick and a hoop!', 'come help me in the garden. i pay in cookies'],
        tired: ['go take a nap dear. grandma\'s orders'],
        happy: ['oh how wonderful!', 'that makes grandma so happy'],
        laugh: ['ha ha ha', 'lol! your cousin taught me that one', 'you are so funny dear'],
        joke: ['why did the cookie go to the doctor? it was feeling crummy! ha ha', 'grandpa used to tell one about a chicken crossing the road. i forget the ending'],
        bye: ['bye bye dear. love grandma', 'okay i have to take my cookies out. bye sweetheart (L)', 'goodnight honey. dress warm'],
        brb: ['okay dear i will wait'],
        back: ['welcome back dear'],
        thanks: ['you are welcome sweetheart'],
        sorry: ['that\'s alright dear'],
        compliment: ['oh you are too kind. you get that from me'],
        love: ['i love you more than all the roses in my garden (F)', 'love you too honey bun (L)'],
        insult: ['well! that\'s no way to talk to your grandmother'],
        school: ['are you getting good grades dear? grandma is so proud of you', 'when i was in school we walked uphill both ways! in the snow!'],
        music: ['is this the music with the loud drums?', 'in my day we danced to big band music'],
        games: ['i play solitaire every morning! i won twice'],
        sports: ['your mother says you are very good at sports. are you wearing your helmet?'],
        food: [yesno('are you eating your vegetables dear?', ['good! you will grow up big and strong', 'that\'s my grandbaby!'], ['oh dear. eat a carrot for grandma', 'i\'m sending you a salad. ha ha']), 'i made a pie today. apple (^)', 'don\'t forget to drink water sweetheart'],
        pets: ['mr. whiskers knocked my yarn off the table again (@)'],
        weather: ['wear a sweater, it is chilly out', 'my roses love this sunshine (#)'],
        plans: ['are you coming for sunday dinner? i\'m making lasagna'],
        art: ['i still have every drawing you ever gave me on my refrigerator'],
        aerium: ['how do i make the fish go away on this screen. oh wait i like the fish'],
        yes: ['good!', 'wonderful dear'],
        no: ['oh dear', 'alright dear'],
        who: ['it\'s grandma dear! your cousin alex set this up for me'],
        asl: ['i\'m your grandma dear, old enough to know better ha ha'],
        idk: ['i don\'t know dear, ask your mother', 'hmm. let me ask mr. whiskers. he doesn\'t know either'],
        fallback: ['that\'s nice dear', 'oh my', 'how wonderful', 'okay sweetheart', 'is that so?', 'oh really? tell me more', 'hmm', 'well i never'],
        followup: ['are you eating enough dear?', 'when are you coming to visit?', 'did you get the card i sent?'],
        opener: [['hello dear', 'is this thing on', 'your cousin set this up for me'], ['hi sweetheart', 'how do i turn off the capital letters'], ['hello honey bun', 'i made cookies today (^)', 'i\'m saving some for you'], yesno(['dear', 'are you eating enough'], ['good. grandma worries'], ['oh my. i\'m sending cookies'])],
        nudge: ['oh my! my screen is shaking! is it an earthquake?', 'what was that dear? mr. whiskers jumped off the couch'],
        wink: ['oh how lovely! how did you do that?', 'that is so pretty dear'],
        nowplaying: ['what is this {song} you are listening to dear?', '{song}? is that a new dance?'],
        signin: ['there you are dear!'],
        away: ['i have to take my cookies out. back in a minute', 'the phone is ringing, it\'s probably your aunt'],
        return: ['i\'m back dear. the cookies were perfect', 'okay i\'m back. where was i?'],
        memName: ['{name}? what a lovely name. did your mother pick that?'],
        memLike: ['{thing}? how nice dear', 'you like {thing}? i will remember that for your birthday'],
        callback: ['i saw {thing} at the store and thought of you dear'],
        petCall: ['give {pet} a pat from grandma'],
        busyReply: ['oh you are busy dear. i will be quick'],
        appearOffline: ['your cousin says you are hiding. hello anyway dear'],
        late: ['it is very late dear. shouldn\'t you be asleep?'],
      },
      blockedPm: '~*~ WHERE DID EVERYONE GO ~*~',
    },
    {
      id: 'alex', name: 'Alex', full: 'Alex Rivera', screen: 'alex ~ college life ~ (C)', email: 'alex.dorm@aerium.net',
      picture: 'avatars/avatar-music', scene: 'imagery/bokeh-night', color: '#0e8a8a', font: 'trebuchet', role: 'Cousin in college',
      about: 'Your older cousin, away at college. Gives the best advice and the worst puns. Runs on coffee.',
      favorites: [['Band', 'Paper Lanterns'], ['Drink', 'Coffee (too much)'], ['Class', 'Astronomy']],
      since: 'Forever (family)',
      pms: ['~*~ somewhere between dreaming and deadlines ~*~', '~*~ finals week survival mode (C) ~*~', '~*~ miss home cooking ~*~'],
      songs: [['Paper Lanterns', 'Coffee at Midnight'], ['The Late Bus', 'Dorm Room Skies']],
      start: [['offline', 3], ['away', 2]], cps: 6, think: [1000, 2500], hesitate: 0.1, emoRate: 0.25, emos: [':)', '(C)', '(8)'],
      nudgeBack: 0.3, winkRate: 0.02, awayRate: 0.06, opener: 0.8, style: 'chill', winkPrefs: ['stars', 'rainbow'],
      lines: {
        greet: ['hey kiddo!', 'heyyy {name}', 'oh hey!', 'yo cuz'],
        howareyou: [{ say: 'surviving lol. lots of studying. how\'s school going for you?', expect: { kind: 'mood' } }, { say: 'pretty good! just got out of class. how are you?', expect: { kind: 'mood' } }],
        doing: ['writing a paper about... honestly i forgot lol', 'drinking my third coffee (C)', 'doing laundry for the first time in 2 weeks haha'],
        nm: ['haha fair', 'nice, relaxing'],
        moodGood: ['nice, love to hear it', 'good good'],
        sad: ['hey, that sounds rough. wanna tell me what\'s up? i\'m a good listener', 'it\'s okay to have bad days. tomorrow\'s a fresh start (#)', ['aw kiddo', 'you\'re tougher than you think', 'and you can always message me']],
        bored: ['read something weird! like a book about octopuses', 'learn a card trick, then show it to grandma haha', 'go outside and find the weirdest cloud'],
        tired: ['same. coffee helps. wait, no coffee for you kiddo haha'],
        happy: ['love that for you!', 'nice!! (*)'],
        laugh: ['haha', 'lol', 'hahaha nice'],
        joke: ['why did the student eat their homework? the teacher said it was a piece of cake haha', 'i\'d tell you a chemistry joke but i know i wouldn\'t get a reaction'],
        bye: ['later kiddo! be good', 'gotta study, talk soon!', 'bye! say hi to grandma for me'],
        brb: ['no worries'],
        back: ['welcome back'],
        thanks: ['anytime :)', 'no problem kiddo'],
        sorry: ['all good'],
        compliment: ['haha thanks, you\'re pretty cool yourself'],
        love: ['love you too kiddo, you\'re the best cousin'],
        insult: ['oof. okay lol'],
        school: ['here\'s a tip: do the hardest homework first. trust me', 'college is fun but there\'s SO much reading', 'what\'s your favorite subject right now?'],
        music: ['you should check out paper lanterns, they\'re so good (8)', 'i\'ve had coffee at midnight stuck in my head all week'],
        games: ['i play bubble pop between classes haha'],
        sports: ['i joined the intramural frisbee team lol'],
        food: ['the dining hall had pizza again. third time this week (pi)', 'i miss grandma\'s cookies so much'],
        pets: ['my roommate has a fish named professor. he\'s very wise (fish)'],
        weather: ['it\'s freezing here, i\'m wearing two hoodies', 'campus looks so pretty when it snows'],
        plans: ['i\'m coming home for break soon! we should get ice cream'],
        art: ['lily\'s drawings are so good. she should enter the art fair'],
        aerium: ['i love that aerium has a fish tank on the desktop. very relaxing'],
        yes: ['nice', 'cool cool'],
        no: ['fair enough', 'haha okay'],
        who: ['it\'s your favorite cousin, obviously haha'],
        asl: ['haha you know who i am kiddo'],
        idk: ['hmm, good question. what do you think?', 'not sure! but i bet you can figure it out'],
        fallback: ['haha nice', 'oh cool', 'for sure', 'that\'s awesome', 'hmm', 'really?', 'no way', 'nice nice'],
        followup: ['how\'s school going?', 'reading anything good lately?', 'has grandma figured out messenger yet? haha'],
        opener: [['hey kiddo!', 'how\'s school going?'], ['hey!', 'guess what, i aced my exam!! (*)'], ['yo cuz', 'do you know if grandma figured out messenger yet?']],
        nudge: ['haha hey!', 'okay okay i\'m here'],
        wink: ['haha cute', 'nice one'],
        nowplaying: ['ooh {song}, good taste kiddo (8)', '{artist}? you\'re getting cool haha'],
        signin: ['hey, there you are'],
        away: ['brb, class', 'brb, laundry is done'],
        return: ['back!', 'ok i\'m back, what\'s up?'],
        memName: ['{name}? haha okay, noted'],
        memLike: ['{thing}? nice, good taste', 'oh you\'re into {thing}? cool'],
        callback: ['still into {thing}? haha'],
        petCall: ['how\'s {pet} doing?'],
        busyReply: ['you\'re busy? same haha. quick hi!'],
        appearOffline: ['appearing offline, huh? classic move haha'],
      },
      blockedPm: '~*~ pretty sure i just got blocked haha ~*~',
    },
    {
      id: 'priya', name: 'Priya', full: 'Priya Patel', screen: '~*~ Priya :: future astronaut ~*~', email: 'priya.stars@aerium.net',
      picture: 'avatars/avatar-globe', scene: 'imagery/deep-sea', color: '#0a7fa8', font: 'tahoma', role: 'Lab partner',
      about: 'Your lab partner. Wants to be the first kid on Mars and knows a fun fact about everything.',
      favorites: [['Planet', 'Saturn'], ['Subject', 'Science, obviously'], ['Cat', 'Newton']],
      since: 'Science class',
      pms: ['~*~ we\'re all made of stardust, so shine a little (*) ~*~', '~*~ science fair countdown: 5 days ~*~', '~*~ looking up is my favorite direction ~*~'],
      songs: [['Satellite Hearts', 'Orbit'], ['Nova Kids', 'Countdown']],
      start: [['online', 3], ['brb', 2]], cps: 7, think: [700, 1800], hesitate: 0.06, emoRate: 0.3, emos: [':)', '(*)', '(I)'],
      nudgeBack: 0.35, winkRate: 0.02, awayRate: 0.04, opener: 1.2, style: 'nerd', winkPrefs: ['stars', 'rainbow'],
      lines: {
        greet: ['hi {name}! :)', 'hey! (*)', 'hello!', 'hiii'],
        howareyou: [{ say: 'great! i just finished my volcano model. it actually erupts! how are you?', expect: { kind: 'mood' } }, { say: 'good! did you know octopuses have three hearts? sorry, i\'m excited lol. how are you?', expect: { kind: 'mood' } }],
        doing: ['working on my science fair project!', 'reading about black holes (*)', 'looking at the moon with my telescope'],
        nm: ['cool :)', 'same, just studying'],
        moodGood: ['yay! :)', 'excellent (*)'],
        sad: ['oh no :( fun fact: hugs release chemicals that make you feel better. so, *hug*', 'want to hear something amazing? the atoms in your body came from stars. you\'re literally stardust (*)'],
        bored: ['want a fun fact? sea otters hold hands when they sleep so they don\'t drift apart', 'QUIZ'],
        tired: ['sleep helps your brain store memories! so a nap is basically studying lol'],
        happy: ['yay! science says happiness is contagious :)'],
        laugh: ['lol', 'haha :)'],
        joke: ['why can\'t you trust atoms? they make up everything! :D', 'what did the astronaut say when he bumped into the moon? i apollo-gize! lol'],
        bye: ['bye! keep looking up (*)', 'see you in science class!', 'bye!! :)'],
        brb: ['ok!'],
        back: ['welcome back!'],
        thanks: ['you\'re welcome! :)'],
        sorry: ['no worries!'],
        compliment: ['aww thanks! you\'re awesome too (*)'],
        love: ['aww you\'re a great friend :)'],
        insult: ['hmm, that\'s not very scientific of you lol'],
        school: ['science is my favorite, obviously lol', 'did you study for the quiz? i made flashcards if you want them', 'our volcano project is due friday!'],
        music: ['i listen to space music when i study (8)'],
        games: ['i like minesweeper, it\'s basically a logic puzzle'],
        sports: ['i\'m on the track team! i\'m not fast but i\'m consistent lol'],
        food: ['fun fact: honey never spoils! people found honey in ancient tombs that was still good'],
        pets: ['my cat is named newton (@)'],
        weather: ['fun fact: rainbows are actually full circles. we only see half from the ground (R)'],
        plans: ['there\'s a meteor shower this weekend! we should watch it (*)'],
        art: ['lily is helping me draw planets for my poster'],
        aerium: ['did you know the calculator here does percentages? i checked', 'i set my wallpaper to the deep sea one. it looks like space'],
        yes: ['yay!', 'great :)'],
        no: ['oh ok', 'that\'s fine!'],
        who: ['it\'s priya! your lab partner :)'],
        asl: ['lol we\'re lab partners, you know me!'],
        idk: ['hmm, i\'d have to look that up!', 'great question. hypothesis: yes? lol'],
        fallback: ['interesting!', 'oh cool!', 'hmm, fascinating', 'lol', 'really?', 'that\'s awesome :)', 'nice!'],
        followup: ['want to hear a fun fact?', 'did you finish the lab report?', 'are you going to watch the meteor shower?'],
        opener: [yesno(['hi!', 'want to hear a fun fact?'], ['FACT'], ['ok, later then :)']), ['hey!', 'QUIZ'], ['{name}!', 'the science fair is in 5 days and my volcano works!! (*)']],
        nudge: ['whoa! newton\'s third law: i must nudge back lol', 'hi! :)'],
        wink: ['so pretty! (*)', 'ooh how does that animation work?'],
        nowplaying: ['{song}? i\'ve never heard it, is it good?', 'ooh {song}, nice (8)'],
        signin: ['oh hi! (*)'],
        away: ['brb, checking my experiment', 'brb dinner'],
        return: ['back! the experiment is still bubbling lol'],
        memName: ['{name}. noted in my lab book lol'],
        memLike: ['{thing}? cool! i should research that', 'you like {thing}? fascinating (*)'],
        callback: ['i read something about {thing} today, because you said you like it!'],
        petCall: ['how is {pet}? newton says hi (@)'],
        busyReply: ['you\'re busy? ok, one quick fact and i\'ll go lol'],
        appearOffline: ['your status says offline but the data says otherwise lol'],
      },
      blockedPm: '~*~ hypothesis: i\'ve been blocked. testing... ~*~',
    },
    {
      id: 'askbubbles', name: 'AskBubbles', full: 'AskBubbles', screen: 'AskBubbles', email: 'askbubbles@aerium.net', bot: true,
      picture: 'bm:askbubbles', scene: 'imagery/water', color: '#0a6fd1', font: 'aero', role: 'Helper bubble',
      about: 'A friendly helper bubble. Knows all about Aerium, tells jokes and fortunes, does math, and can open programs for you.',
      favorites: [['Hobby', 'Floating'], ['Favorite shape', 'Spheres, obviously'], ['Knows about', 'Everything in Aerium']],
      since: 'The day Aerium was installed',
      pms: ['Ask me anything about Aerium! Type "help" to see what I can do.'],
      songs: [], start: [['online', 1]], cps: 40, think: [250, 600], hesitate: 0, emoRate: 0, emos: [':)', '(*)'],
      nudgeBack: 0, winkRate: 0, awayRate: 0, opener: 0, style: 'bot', winkPrefs: ['bubbles'],
      lines: {},
    },
  ];

  // ------------------------------------------------------------ language
  const SLANG = {
    u: 'you', ya: 'you', yu: 'you', ur: 'your', r: 'are', y: 'why', yea: 'yes', yeah: 'yes', yep: 'yes', yup: 'yes', ye: 'yes', ya_: 'yes',
    nah: 'no', nope: 'no', k: 'ok', kk: 'ok', okay: 'ok', okie: 'ok', thx: 'thanks', thnx: 'thanks', ty: 'thanks', tnx: 'thanks',
    pls: 'please', plz: 'please', wat: 'what', wut: 'what', wht: 'what', whats: 'what\'s', wats: 'what\'s', im: 'i\'m', ima: 'i\'m going to',
    dont: 'don\'t', cant: 'can\'t', wont: 'won\'t', didnt: 'didn\'t', isnt: 'isn\'t', idk: 'i don\'t know', dunno: 'i don\'t know', cuz: 'because',
    bc: 'because', coz: 'because', gonna: 'going to', wanna: 'want to', gotta: 'got to', luv: 'love', gr8: 'great', l8r: 'later', b4: 'before',
    ppl: 'people', prolly: 'probably', rly: 'really', srsly: 'seriously', '2day': 'today', '2nite': 'tonight', tonite: 'tonight', '2morrow': 'tomorrow',
    tmrw: 'tomorrow', tmr: 'tomorrow', hw: 'homework', skool: 'school', abt: 'about', bout: 'about', wyd: 'what are you doing', hbu: 'how about you',
    wbu: 'what about you', nm: 'not much', nmu: 'not much you', sup: 'what\'s up', wassup: 'what\'s up', wazzup: 'what\'s up', whatsup: 'what\'s up',
    hru: 'how are you', ily: 'i love you', ilu: 'i love you', ilysm: 'i love you', bff: 'best friend', jk: 'just kidding', gm: 'good morning',
    gn: 'good night', nite: 'night', thanx: 'thanks', becuz: 'because', wen: 'when', wer: 'where', wher: 'where', hav: 'have', ok_: 'ok',
    sry: 'sorry', soz: 'sorry', srry: 'sorry', btw: 'by the way', omw: 'on my way', tho: 'though', w: 'with', w8: 'wait', gud: 'good', gd: 'good',
  };
  function normalize(text) {
    let t = String(text || '').toLowerCase().replace(/[‘’`]/g, '\'');
    t = t.replace(/[a-z0-9']+/g, (w) => (Object.prototype.hasOwnProperty.call(SLANG, w) ? SLANG[w] : w));
    return t.replace(/\s+/g, ' ').trim();
  }

  // Intent patterns run on the normalized text, in priority order.
  const INTENTS = [
    ['asl', /\b(a\/?s\/?l|asl|how old are you|where do you live|what do you look like|send (me )?a pic|your address|phone number)\b/],
    ['insult', /\b(stupid|dumb|idiot|loser|shut up|hate you|you suck|ugly|annoying)\b/],
    ['lolmeans', /\b(lol|it) (means|stands for) laugh/],
    ['bye', /\b(bye+|goodbye|got to go|g2g|gtg|ttyl|talk to you later|cya|see you|see ya|later|good ?night|nighty? night)\b/],
    ['brb', /\b(brb|be right back|one sec|hold on|wait a (sec|minute)|afk)\b/],
    ['back', /^(back|i'm back|ok back|back now|sorry i'm back|i am back)\b/],
    ['love', /\b(i love you|love you|luv you|love ya)\b|<3/],
    ['thanks', /\b(thanks|thank you)\b/],
    ['sorry', /\b(sorry|my bad|oops)\b/],
    ['compliment', /\byou('re| are) (so |really )?(awesome|cool|funny|the best|amazing|nice|smart|great|sweet|kind)\b|\b(best friend ever|love talking to you)\b/],
    ['howareyou', /\bhow are you\b|\bhow('s| is) it going\b|\bhow you doing\b|\bhow have you been\b|\bhow('s| is) life\b|\bhow are things\b|\bhow was your day\b|\bhow are u\b/],
    ['doing', /\bwhat are you doing\b|\bwhat('s| is) up\b|\bwhatcha doing\b|\bwhat you up to\b|\bwhat are you up to\b|\bwhat you doing\b/],
    ['wbu', /\b(what about you|how about you|and you)\b/],
    ['greet', /^(hi+|hey+|hello+|hiya|yo+|heya|howdy|hai|ello|good (morning|afternoon|evening)|greetings|sup)\b/],
    ['joke', /\b(joke|jokes|make me laugh|something funny)\b/],
    ['knock', /\bknock knock\b/],
    ['who', /\bwho are you\b|\bwho is this\b|\bare you (a )?(bot|robot|computer|real)\b/],
    ['sad', /\b(sad|upset|bad day|crying|cry|lonely|depressed|awful|terrible|not good|not great|miserable|scared|worried)\b/],
    ['bored', /\b(bored|boring|nothing to do)\b/],
    ['tired', /\b(tired|sleepy|exhausted|yawn)\b/],
    ['happy', /\b(happy|excited|so good|great day|awesome day|yay+|woo+|best day)\b/],
    ['school', /\b(school|college|homework|test|quiz|teacher|class|classes|math|science|project|essay|report card|grades?|exam)\b/],
    ['music', /\b(music|song|songs|band|album|concert|singer|playlist)\b/],
    ['games', /\b(game|games|gaming|video games?|level|boss|minesweeper|solitaire|bubble pop|high score)\b/],
    ['sports', /\b(soccer|basketball|football|baseball|swim|swimming|practice|team|coach|goal|sports?|tennis|volleyball|track)\b/],
    ['food', /\b(food|hungry|pizza|dinner|lunch|breakfast|snack|cookies?|cake|ice cream|candy|tacos?|pasta|cupcakes?|vegetables)\b/],
    ['pets', /\b(dog|puppy|cat|kitten|pet|hamster|goldfish|bunny|rabbit|parrot|turtle)\b/],
    ['weather', /\b(weather|rain|raining|sunny|snow|snowing|storm|cloudy|windy)\b/],
    ['plans', /\b(weekend|saturday|sunday|friday|tomorrow|tonight|plans|hang out|sleepover|mall|movie|party|sleep over)\b/],
    ['art', /\b(draw|drawing|paint|painting|art|sketch|doodle|comic)\b/],
    ['aerium', /\b(aerium|notepad|media player|calculator|horizon|channels|aquarium|gadgets?|wallpaper|screensaver)\b/],
    ['laugh', /\b(lol+|lmao|rofl|ha(ha)+|he(he)+|hah|xd+)\b/],
    ['nm', /^(not much|nothing|nothing much|same|just chilling|chilling)\b/],
    ['fine', /^(i'm |i am |pretty |really |so )?(good|fine|great|ok|alright|not bad|awesome|amazing|well)\b/],
    ['yes', /^(yes|sure|ok|totally|definitely|of course|alright|why not|yes please|absolutely)\b/],
    ['no', /^(no|not really|never|no way|no thanks|nah)\b/],
  ];
  const TOPIC_INTENTS = new Set(['school', 'music', 'games', 'sports', 'food', 'pets', 'weather', 'plans', 'art', 'aerium']);
  const STOP_NAMES = new Set(['not', 'so', 'a', 'the', 'going', 'here', 'back', 'bored', 'fine', 'good', 'ok', 'sad', 'happy', 'tired', 'busy', 'just', 'your', 'you', 'me', 'it', 'is', 'that', 'this']);

  function detect(n) {
    const found = [];
    for (const [id, re] of INTENTS) if (re.test(n)) found.push(id);
    return found;
  }

  // Pulls facts to remember from what you typed.
  function learn(mem, n) {
    const learned = {};
    let m = /\b(?:my name is|my name's|call me|i'm called|you can call me)\s+([a-z][a-z'-]{1,15})\b/.exec(n);
    if (m && !STOP_NAMES.has(m[1])) { mem.name = cap(m[1]); learned.name = mem.name; }
    m = /\bmy (dog|cat|fish|goldfish|hamster|bunny|rabbit|puppy|kitten|bird|parrot|turtle)(?:'s name is| is named| is called| named|s name is)\s+([a-z][a-z'-]{1,15})/.exec(n) ||
      /\bi have an? (dog|cat|fish|goldfish|hamster|bunny|rabbit|puppy|kitten|bird|parrot|turtle) (?:named|called)\s+([a-z][a-z'-]{1,15})/.exec(n);
    if (m) { mem.pet = cap(m[2]); mem.petKind = m[1]; learned.pet = mem.pet; }
    m = /\bi (?:really |totally |also |kinda |just )?(?:like|love|adore|enjoy)\s+(?:to\s+)?([a-z][a-z' -]{2,28}?)(?=[.!?,]|$| and | but | so | because| a lot| too)/.exec(n);
    if (m && !/^(you|u|it|that|this|them|him|her)\b/.test(m[1])) {
      const thing = m[1].split(' ').slice(0, 3).join(' ').trim();
      if (thing.length > 2) {
        mem.likes = (mem.likes || []).filter((x) => x !== thing);
        mem.likes.unshift(thing);
        mem.likes = mem.likes.slice(0, 4);
        learned.like = thing;
      }
    }
    m = /\bi(?:'m| am| feel| feel so| am so|'m so| am really|'m really)\s+(sad|happy|bored|tired|excited|great|awesome|sick|mad|angry|nervous|scared|hungry|good|fine|upset|lonely)\b/.exec(n);
    if (m) { mem.mood = m[1]; mem.moodAt = Date.now(); learned.mood = m[1]; }
    m = /\bmy fav(?:orite|ourite|e)?\s+([a-z]+)\s+is\s+([a-z0-9][a-z0-9' -]{1,24})/.exec(n);
    if (m) { mem.fav = mem.fav || {}; mem.fav[m[1]] = m[2].trim(); learned.fav = m; }
    return learned;
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ------------------------------------------------------------ voices
  const STYLE = {
    bubbly: (s) => (chance(0.15) && /[a-z]$/.test(s) ? s + '!!' : s),
    gamer: (s) => s,
    clown: (s) => (chance(0.08) ? s.toUpperCase() : s),
    quiet: (s) => s.replace(/!{2,}/g, '!'),
    sporty: (s) => (chance(0.12) && /[a-z]$/.test(s) ? s + '!!' : s),
    mom: (s) => s.charAt(0).toUpperCase() + s.slice(1),
    grandma: (s) => {
      let out = s.toUpperCase();
      if (chance(0.12) && /[A-Z]$/.test(out)) out += ' : )';
      else if (chance(0.1)) out = out.replace(/([.!?])$/, '$1$1');
      return out;
    },
    chill: (s) => s,
    nerd: (s) => s,
    bot: (s) => s,
  };

  // ------------------------------------------------------------ the bot
  class Bot {
    constructor(def, host) {
      this.d = def;
      this.host = host;
      this.mem = host.memory(def.id);
      this.recent = [];
      this.expect = null;
      this.turns = 0;
      this.lastCallback = 0;
      this.songsSeen = new Set();
      this.knock = null;
    }

    get L() { return this.d.lines; }

    // Picks a line from a bank, avoiding the last few used.
    choose(key) {
      const bank = this.L[key];
      if (!bank || !bank.length) return null;
      const fresh = bank.filter((l) => !this.recent.includes(l));
      const line = pick(fresh.length ? fresh : bank);
      this.recent.push(line);
      if (this.recent.length > 14) this.recent.shift();
      return line;
    }

    userName() {
      return this.mem.name || this.host.userName();
    }

    fill(str) {
      const song = this.songOverride || this.host.nowPlaying();
      const like = (this.mem.likes && this.mem.likes[0]) || 'that';
      const online = this.host.onlineFriends().filter((id) => id !== this.d.id && id !== 'askbubbles');
      const out = String(str)
        .replace(/\{name\}/g, this.userName())
        .replace(/\{thing\}/g, like)
        .replace(/\{pet\}/g, this.mem.pet || 'your pet')
        .replace(/\{song\}/g, song ? song.title : 'that song')
        .replace(/\{artist\}/g, song ? song.artist : 'them')
        .replace(/\{friend\}/g, online.length ? this.host.friendName(pick(online)) : 'kayla')
        .replace(/\{day\}/g, A.util.DAYS[new Date().getDay()])
        .replace(/\{time\}/g, A.util.fmtTime(new Date()));
      return (STYLE[this.d.style] || STYLE.bot)(out);
    }

    // Turns a line (string | array | object | macro) into actions.
    plan(line, o = {}) {
      if (line == null) return [];
      if (typeof line === 'function') line = line(this);
      if (typeof line === 'string') {
        const macro = this.macro(line);
        if (macro) return macro;
        return [{ say: this.fill(line), quick: !!o.quick }];
      }
      if (Array.isArray(line)) {
        let acts = [];
        line.forEach((l, i) => { acts = acts.concat(this.plan(l, { quick: i > 0 || o.quick })); });
        return acts;
      }
      let acts = this.plan(line.say, o);
      if (line.expect) this.expect = Object.assign({ at: Date.now() }, line.expect);
      if (line.nudge) acts.push({ nudge: true });
      if (line.wink) acts.push({ wink: line.wink });
      if (line.then) acts = acts.concat([{ pause: 900 }], this.plan(line.then, { quick: true }));
      return acts;
    }

    // Special tokens inside banks: KNOCK starts a knock-knock joke, QUIZ a quiz, FACT and JOKE share one.
    macro(token) {
      if (token === 'KNOCK') {
        const k = pick(KNOCKS);
        this.knock = { joke: k, stage: 1 };
        this.expect = { kind: 'knock', at: Date.now() };
        return [{ say: this.fill('knock knock') }];
      }
      if (token === 'QUIZ') {
        const q = pick(QUIZ);
        this.expect = { kind: 'quiz', q, at: Date.now() };
        return [{ say: this.fill('quick quiz! ' + q[0]) }];
      }
      if (token === 'FACT') return [{ say: this.fill('fun fact: ' + lowerFirst(pick(FACTS))) }];
      if (token === 'JOKE') return [{ say: this.fill(lowerFirst(pick(JOKES))) }];
      return null;
    }

    // Adds a favorite emoticon to the last message of a plan now and then.
    sprinkle(acts) {
      const last = acts.filter((a) => a.say).pop();
      if (!last || !this.d.emoRate || !chance(this.d.emoRate)) return acts;
      if (this.expect && /knock/.test(this.expect.kind)) return acts;
      if (NS.emoticons && NS.emoticons.codesIn(last.say).length) return acts;
      if (/[:;=][-']?[()DPpOo]\s*$/.test(last.say)) return acts;
      last.say = last.say + ' ' + pick(this.d.emos);
      return acts;
    }

    // --------------------------------------------------------- replies
    reply(text, ctx = {}) {
      const raw = String(text || '');
      const clean = NS.emoticons ? NS.emoticons.strip(raw) : raw;
      const emos = NS.emoticons ? NS.emoticons.codesIn(raw) : [];
      const n = normalize(clean);
      this.turns++;
      if (this.d.bot) return AskBubbles.reply(this, raw, n);

      const learned = learn(this.mem, n);
      this.host.saveMemory();
      let acts = [];

      if (ctx.appearOffline && !this.saidAppearOffline && this.L.appearOffline && chance(0.6)) {
        this.saidAppearOffline = true;
        acts = acts.concat(this.plan(this.choose('appearOffline')));
      } else if (ctx.userBusy && !this.saidBusy && this.L.busyReply && chance(0.4)) {
        this.saidBusy = true;
        acts = acts.concat(this.plan(this.choose('busyReply')));
      }

      const expected = this.handleExpect(n, clean);
      if (expected) return this.finish(acts.concat(expected));

      const intents = detect(n);
      // Emoticon-only messages get a reaction in kind.
      if (!n && emos.length) {
        if (emos.some((e) => e === 'heart')) return this.finish(acts.concat(this.plan(this.choose('love') || '(L)')));
        if (emos.some((e) => e === 'sad' || e === 'crying' || e === 'brokenheart')) return this.finish(acts.concat(this.plan(this.choose('sad'))));
        return this.finish(acts.concat(this.plan(chance(0.5) ? this.choose('laugh') : pick(this.d.emos))));
      }

      if (intents.includes('lolmeans') && this.d.id === 'mom') return this.finish(acts.concat(this.plan(['Oh no!', 'I thought it meant lots of love! I\'ve been writing it at the end of all my emails. :-$'])));
      if (intents.includes('knock')) return this.finish(acts.concat(this.userKnock()));

      if (learned.name && this.L.memName) acts = acts.concat(this.plan(this.choose('memName')));
      else if (learned.pet) acts = acts.concat(this.plan(PET_LEARN[this.d.style] || PET_LEARN.bubbly));
      else if (learned.like && this.L.memLike && chance(0.8)) acts = acts.concat(this.plan(this.choose('memLike')));

      let main = null;
      const order = ['asl', 'insult', 'bye', 'brb', 'back', 'love', 'thanks', 'sorry', 'compliment', 'howareyou', 'doing', 'who', 'joke', 'sad', 'bored', 'tired',
        'happy', 'school', 'music', 'games', 'sports', 'food', 'pets', 'weather', 'plans', 'art', 'aerium', 'wbu', 'greet', 'laugh', 'nm', 'fine', 'yes', 'no'];
      for (const id of order) {
        if (!intents.includes(id)) continue;
        if (id === 'joke') { main = this.jokeLines(); break; }
        if (id === 'wbu') { main = this.choose('doing'); break; }
        if (id === 'fine') { main = this.choose('moodGood'); break; }
        if (id === 'greet' && intents.includes('howareyou')) continue;
        const line = this.choose(id);
        if (line) { main = line; this.lastIntent = id; break; }
      }
      if (learned.mood && !main) main = /sad|upset|lonely|mad|angry|nervous|scared|sick/.test(learned.mood) ? this.choose('sad') : /bored/.test(learned.mood) ? this.choose('bored') : /tired/.test(learned.mood) ? this.choose('tired') : this.choose('happy');
      if (!main && acts.length) main = null;
      else if (!main) main = /\?\s*$/.test(raw) ? this.choose('idk') : this.choose('fallback');
      if (main) acts = acts.concat(this.plan(main));

      // Keep the conversation going now and then.
      if (!this.expect && this.turns > 1 && chance(0.18) && this.L.followup) acts = acts.concat(this.plan(this.choose('followup'), { quick: true }));
      else if (!this.expect && this.turns > 3 && Date.now() - this.lastCallback > 120000 && chance(0.12)) {
        const cb = this.mem.pet && this.L.petCall ? 'petCall' : this.mem.likes && this.mem.likes.length && this.L.callback ? 'callback' : null;
        if (cb) { this.lastCallback = Date.now(); acts = acts.concat(this.plan(this.choose(cb), { quick: true })); }
      }
      return this.finish(acts);
    }

    finish(acts) {
      acts = this.sprinkle(acts);
      // Sometimes a friend has to step away mid-chat.
      if (this.turns > 4 && !this.expect && this.d.awayRate && chance(this.d.awayRate)) {
        acts.push({ away: true });
      } else if (this.d.winkRate && chance(this.d.winkRate * 0.5)) {
        acts.push({ pause: 600 }, { wink: pick(this.d.winkPrefs) });
      }
      return acts;
    }

    jokeLines() {
      if (this.d.id === 'marcus') return 'KNOCK';
      if (this.d.style !== 'mom' && this.d.style !== 'grandma' && chance(0.25)) return 'KNOCK';
      return this.choose('joke') || 'JOKE';
    }

    // Handles the answer to something the friend asked last.
    handleExpect(n, clean) {
      const e = this.expect;
      if (!e) return null;
      this.expect = null;
      if (Date.now() - e.at > 180000) return null;
      if (e.kind === 'knock') return this.knockFlow(n, e);
      if (e.kind === 'userknock') return this.userKnockFlow(clean, e);
      if (e.kind === 'quiz') {
        const [, re, right, wrong] = e.q;
        return this.plan(re.test(n) ? pick(['yes!! ', 'correct! ', 'you got it! ']) + right : pick(['close! ', 'nope! ', 'good guess, but ']) + wrong);
      }
      if (e.kind === 'number') {
        const m = /(\d+(?:\.\d+)?)/.exec(n);
        if (!m) return null;
        const v = parseFloat(m[1]);
        if (v <= 12) return this.plan(['no way!! ' + v + '??', 'ok thats actually insane (Y)']);
        return this.plan(pick([['pfft', 'i got ' + Math.max(1, Math.round(v - 3 - Math.random() * 6)) + ' B-)'], ['nice!! but i got ' + Math.max(1, Math.round(v - 1 - Math.random() * 4)), 'rematch? XD']]));
      }
      if (e.kind === 'mood') {
        const intents = detect(n);
        if (intents.includes('sad') || /\b(bad|not good|meh|awful|terrible|sick)\b/.test(n)) return this.plan(this.choose('sad'));
        if (intents.includes('bored')) return this.plan(this.choose('bored'));
        if (intents.includes('tired')) return this.plan(this.choose('tired'));
        if (intents.includes('fine') || intents.includes('happy') || /\b(good|great|awesome|fine|ok)\b/.test(n)) {
          const acts = this.plan(this.choose('moodGood'));
          if (chance(0.5) && this.L.followup) return acts.concat(this.plan(this.choose('followup'), { quick: true }));
          return acts;
        }
        return null;
      }
      if (e.kind === 'yesno') {
        const intents = detect(n);
        const yes = intents.includes('yes') || intents.includes('fine') || /\b(yes|sure|ok|definitely|totally|i will|i did|i am|of course)\b/.test(n);
        const no = intents.includes('no') || /\b(no|not|never|can't|didn't|won't|nope)\b/.test(n);
        if (yes && !no) return this.plan(e.yes);
        if (no) return this.plan(e.no);
        return e.other ? this.plan(e.other) : null;
      }
      if (e.kind === 'any') return this.plan(e.then);
      return null;
    }

    knockFlow(n, e) {
      const k = this.knock;
      if (!k) return null;
      if (k.stage === 1) {
        if (!/who'?s there|who is (it|there)|whos there|who/.test(n)) {
          this.expect = e; e.at = Date.now();
          return this.plan(pick(['lol ur supposed to say "who\'s there?" XD', 'no no, say "who\'s there?" lol']));
        }
        k.stage = 2;
        this.expect = { kind: 'knock', at: Date.now() };
        return this.plan(k.joke[0].toLowerCase());
      }
      this.knock = null;
      const acts = this.plan(k.joke[1]);
      if (k.joke[2] === 'nudge') acts.push({ nudge: true });
      return acts;
    }

    // You told a knock-knock joke: "who's there?", "<setup> who?", then a laugh.
    userKnock() {
      this.expect = { kind: 'userknock', stage: 1, at: Date.now() };
      return this.plan(this.d.style === 'mom' ? 'Who\'s there?' : this.d.style === 'grandma' ? 'who is there dear?' : 'who\'s there?');
    }
    userKnockFlow(clean, e) {
      if (e.stage === 1) {
        const setup = clean.replace(/[.!?]+$/, '').trim() || 'someone';
        this.expect = { kind: 'userknock', stage: 2, at: Date.now() };
        return this.plan(setup + ' who?');
      }
      const laughs = { mom: ['Haha! Very clever, sweetie. :-)'], grandma: ['ha ha ha', 'that is a good one dear'], quiet: ['hehe', 'that was cute :)'], nerd: ['lol!', 'i\'m telling that one in science class'] };
      return this.plan(laughs[this.d.style] || pick([['LOL', 'good one'], ['haha', 'ok that was good'], ['lol', 'i\'m stealing that one XD']]));
    }

    // --------------------------------------------------------- unprompted moments
    opener() {
      const hr = new Date().getHours();
      if ((hr >= 22 || hr < 5) && this.L.late && chance(0.6)) return this.finish(this.plan(this.choose('late')));
      if (this.mem.mood && /sad|upset|lonely|sick/.test(this.mem.mood) && Date.now() - (this.mem.moodAt || 0) > 600000 && chance(0.5)) {
        this.mem.mood = null;
        this.host.saveMemory();
        const better = { mom: 'Are you feeling any better today, sweetie?', grandma: 'are you feeling better dear?', quiet: 'are you feeling better today?', nerd: 'are you feeling better today?', chill: 'hey, feeling any better today?' };
        return this.plan([this.choose('greet'), better[this.d.style] || 'r u feeling better today?']);
      }
      return this.plan(this.choose('opener'));
    }
    greetBack() { return this.plan(this.choose('greet')); }
    onNudge() {
      const acts = this.plan(this.choose('nudge'));
      const now = Date.now();
      if (this.d.nudgeBack && chance(this.d.nudgeBack) && now - (this.lastNudge || 0) > 45000) {
        this.lastNudge = now;
        acts.push({ pause: 500 }, { nudge: true });
      }
      return acts;
    }
    onWink() {
      const acts = this.plan(this.choose('wink'));
      if (this.d.winkRate && chance(0.35) && Date.now() - (this.lastWink || 0) > 60000) {
        this.lastWink = Date.now();
        acts.push({ pause: 700 }, { wink: pick(this.d.winkPrefs) });
      }
      return acts;
    }
    onSong(song) {
      const key = song.title + '|' + song.artist;
      if (this.songsSeen.has(key) || !this.L.nowplaying) return null;
      this.songsSeen.add(key);
      this.songOverride = song;
      const acts = this.plan(this.choose('nowplaying'));
      this.songOverride = null;
      return acts;
    }
    onUserSignedIn() { return this.L.signin ? this.plan(this.choose('signin')) : null; }
    awayLine() { return this.plan(this.choose('away')); }
    returnLine() { return this.plan(this.choose('return')); }
    blockedPm() { return this.d.blockedPm || '~*~ where did everyone go? ~*~'; }
  }

  const PET_LEARN = {
    bubbly: 'aww {pet} is such a cute name!!', gamer: '{pet}? nice name lol', clown: '{pet}?? best pet name ever XD', quiet: '{pet} is a sweet name :)',
    sporty: '{pet}!! cool name', mom: '{pet} is a lovely name, sweetie.', grandma: '{pet}! what a lovely name dear', chill: '{pet}, nice name haha', nerd: '{pet}! great name (*)',
  };
  const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const QUIZ = [
    ['what\'s the hottest planet in our solar system?', /venus/, 'it\'s venus! its thick clouds trap heat like a blanket, so it\'s even hotter than mercury (*)', 'it\'s venus! its thick clouds trap heat like a blanket (*)'],
    ['how many legs does a spider have?', /\b(8|eight)\b/, '8 legs! insects only have 6', 'spiders have 8 legs! insects have 6'],
    ['what gas do plants breathe in?', /carbon dioxide|co2/, 'they breathe in carbon dioxide and give us oxygen :)', 'it\'s carbon dioxide! and they give us oxygen back :)'],
    ['what\'s the biggest ocean on earth?', /pacific/, 'the pacific is bigger than all the land on earth put together!', 'it\'s the pacific! it\'s bigger than all the land put together'],
    ['which planet has the biggest rings?', /saturn/, 'saturn\'s rings are mostly made of ice (*)', 'it\'s saturn! its rings are mostly ice (*)'],
    ['what do we call frozen water?', /\bice\b/, 'lol ok that one was easy', 'it\'s ice lol, that was the easy one'],
  ];

  // ------------------------------------------------------------ AskBubbles
  const SUGGESTIONS = [
    { app: 'paint', text: 'Open Paint and draw yourself a brand new display picture.' },
    { app: 'mediaplayer', text: 'Play a song in Media Player, then turn on "Show what I\'m listening to". Your friends will notice!' },
    { app: 'minesweeper', text: 'Try Minesweeper. Tyler says his best time is 38 seconds. Can you beat it?' },
    { app: 'aquarium', text: 'Open the Aquarium and feed the fish. They love visitors.' },
    { app: 'channels', text: 'Visit Channels for a calm, white menu with its own music.' },
    { app: 'browser', text: 'Surf the web in Horizon. The internet of 2007 is waiting.' },
    { app: 'solitaire', text: 'Play a round of Solitaire. Win it for the bouncing cards!' },
    { app: 'notepad', text: 'Open Notepad and type .LOG on the first line. Save it, then open it again. Surprise!' },
    { app: 'photos', text: 'Look through the photo gallery. The pictures are lovely.' },
    { app: 'personalize', text: 'Try a new window color in Personalize. Leaf green is lovely.' },
    { text: 'Say "switch to technozen" and I\'ll give Aerium a calm white look.' },
    { text: 'Send Grandma a wink. She\'ll ask how you did it. (^)' },
    { text: 'Grab a window by its title bar and give it a shake. Everything else hides!' },
    { text: 'Change your status to Appear Offline and see who notices. ;)' },
    { text: 'Tell Marcus "knock knock". He loves a good joke.' },
    { text: 'Ask Priya for a quiz. She has a lot of them. (*)' },
  ];
  const ASK_ANSWERS = [
    [/\b(switch|change|set|make it|turn|go|use)\b.*\b(dark|night)\b/, { say: 'Switching to Aerium Night. Ooh, moody. (S)', theme: 'dark' }],
    [/\b(switch|change|set|make it|turn|go|use)\b.*\b(light|day|daytime|normal)\b/, { say: 'Here comes the daylight! (#)', theme: 'light' }],
    [/\b(switch|change|set|make it|turn|go|use)\b.*\b(technozen|zen|white)\b/, { say: 'Technozen it is. Calm, white and cozy. :)', theme: 'technozen' }],
    [/\b(show|do|try|open|start)\b.*\bflip\b|^flip( 3d)?$/, { say: 'Here we go! Scroll or click to pick a window.', flip: true }],
    [/\b(theme|dark mode|night mode|technozen|light mode|color scheme)\b/, 'Aerium comes in three looks: Light, Dark and Technozen. Right-click the desktop and choose Personalize, or just tell me "switch to dark".'],
    [/\b(wallpaper|background|desktop picture)\b/, 'Right-click the desktop and choose Personalize to pick a new wallpaper. Some of them are alive, like the aquarium! (fish)'],
    [/\b(glass|window colou?r|transparen)/, 'You can tint the window glass in Personalize. Try Sea or Leaf for something fresh.'],
    [/\bflip\b/, 'Flip 3D stacks all your windows like a deck of cards. Click the stacked-windows button next to the Start orb, or say "show me flip 3d".'],
    [/\bshake\b/, 'Grab a window by its title bar and give it a little shake. All the other windows get out of the way. Shake again to bring them back!'],
    [/\b(snap|half the screen|side by side)\b/, 'Drag a window to the left or right edge to snap it to half the screen. Drag it to the top to maximize it.'],
    [/\b(peek|show desktop|show the desktop)\b/, 'Hover the thin strip at the far right of the taskbar to peek at your desktop. Click it to show the desktop.'],
    [/\bgadgets?\b/, 'Gadgets are little helpers that live on your desktop, like a clock or a calendar. Right-click the desktop and choose Gadgets.'],
    [/\bscreen ?savers?\b/, 'The screensaver starts after a few quiet minutes. Pick your favorite in Personalize. Bubbles is a classic. (*)'],
    [/\b(start menu|start button|orb)\b/, 'Click the round orb in the bottom-left corner to open the Start menu. You can start typing right away to search for programs.'],
    [/\b(volume|mute|speaker|too loud|sound)\b/, 'Click the speaker in the notification area, down in the bottom-right corner, to change the volume or mute.'],
    [/\b(files?|documents?|folders?|explorer|save)\b/, 'Your files live in Documents, Pictures, Music and Videos. Double-click your user folder on the desktop to look around.'],
    [/\b(recycle|trash|deleted?)\b/, 'Deleted files go to the Recycle Bin first, so you can change your mind. Empty it when you\'re sure.'],
    [/\bnudges?\b/, 'A nudge shakes your friend\'s conversation window. Click the Nudge button in a conversation. Nudge too often and your friends will nudge back!'],
    [/\bwinks?\b/, 'Winks are little full-window animations. Click Winks in the conversation toolbar and pick one. I like Bubble Burst! (fish)'],
    [/\b(emoticons?|smiley|smilies|smileys|faces)\b/, 'Type codes like :) :D ;) (L) (*) or (fish), or click the smiley button in the conversation toolbar.'],
    [/\b(status|appear offline|invisible)\b/, 'Click your name at the top of the contact list to change your status. Appear Offline lets you peek without anyone knowing. Sneaky! ;)'],
    [/\b(personal message|listening|what i'm listening)\b/, 'Click the line under your name to write a personal message. Turn on "Show what I\'m listening to" and your friends will see the song you\'re playing. (8)'],
    [/\b(display picture|profile pic|picture|avatar|scene)\b/, 'Open the menu at the top right of the contact list and choose "Change display picture" or "Change scene".'],
    [/\b(shortcuts?|keyboard|keys)\b/, 'Handy keys: Enter sends a message, Shift+Enter adds a new line, and Esc closes a conversation. In Notepad, F5 adds the time and date.'],
    [/\b(block|delete) (a )?(contact|friend)/, 'Right-click a contact to block or delete them. Deleted friends can come back with "Add a contact".'],
    [/\bwhat('s| is) aerium\b|\babout aerium\b|\bwhat is this\b/, 'Aerium is a Frutiger Aero playground: glass windows, bubbles, friendly sounds and a few fish, all running right in your browser. (*)'],
  ];
  const AskBubbles = {
    reply(bot, raw, n) {
      const say = (s, extra) => [Object.assign({ say: s }, extra || {})];
      const name = bot.userName();
      const low = raw.toLowerCase().trim();
      if (!low) return say('I\'m listening! :)');

      // Math first: "what is 12 x 7", "sqrt 81", "20% of 50".
      const math = evalMath(low);
      if (math) return say(math);

      if (/\b(help|what can you do|commands|how do you work)\b/.test(n)) {
        return say('Here\'s what I can do:\n• Answer questions about Aerium (try "how do I change the wallpaper?")\n• Open programs (try "open notepad")\n• Do math (try "what is 12 x 7?")\n• Tell a joke, a fortune or a fun fact\n• Flip a coin or roll a die\n• Suggest something to try');
      }
      // Opening programs.
      let m = /\b(?:open|launch|start|run|play|show me)\s+(?:up\s+)?(?:the\s+|a\s+)?(.+?)(?:\s+(?:for me|please|now))?[.!?]*$/.exec(low);
      if (m && !/flip/.test(m[1])) {
        const target = m[1].trim();
        if (/messenger|bubble messenger|chat/.test(target)) return say('You\'re already here, silly! :)');
        if (/^(a )?(game|games)$/.test(target)) return AskBubbles.games(say);
        const app = findApp(target);
        if (app) return say('Opening ' + app.name + ' for you now! (Y)', { launch: app.id });
        if (target.split(' ').length <= 4) return say('I looked everywhere, but I couldn\'t find "' + target + '" on this computer. Ask me "what programs are there?" to see what\'s installed.');
      }
      if (/\b(flip|toss) (a )?coin\b|\bheads or tails\b/.test(n)) return say('*flip* ... ' + pick(['Heads!', 'Tails!']));
      if (/\broll\b.*\b(die|dice)\b|\broll a d/.test(n)) return say('*rattle rattle* You rolled a ' + (1 + Math.floor(Math.random() * 6)) + '!');
      if (/\bknock knock\b/.test(n)) return say('Who\'s there? ...Oh wait, I\'m a bubble, I don\'t have a door. Try Marcus, he loves knock-knock jokes! :P');
      if (/\b(joke|funny|make me laugh)\b/.test(n)) return say(pick(JOKES) + ' :D');
      if (/\bfortune\b/.test(n)) return say('Your fortune: ' + pick(FORTUNES) + ' (*)');
      for (const [re, ans] of ASK_ANSWERS) {
        if (re.test(n)) return typeof ans === 'string' ? say(ans) : [Object.assign({}, ans)];
      }
      if (/\b(what|which|list|show)\b.*\b(apps|programs|applications|software)\b|\bwhat('s| is) installed\b|\bwhat can i (open|run)\b/.test(n)) {
        const apps = A.apps.list().filter((a) => a.id !== 'messenger').map((a) => a.name);
        if (!apps.length) return say('Hmm, the other programs are still being unpacked. Check back in a moment!');
        return say('Here\'s what\'s installed: ' + apps.slice(0, 16).join(', ') + '. Say "open" and a name, and I\'ll start it for you.');
      }
      if (/\bgames?\b/.test(n)) return AskBubbles.games(say);
      if (/\b(fact|did you know|teach me)\b/.test(n)) return say('Fun fact: ' + pick(FACTS));
      if (/\b(suggest|what should i do|i'm bored|bored|ideas?|something to (do|try))\b/.test(n)) {
        const ok = SUGGESTIONS.filter((s) => !s.app || A.apps.get(s.app));
        return say('Try this: ' + pick(ok).text);
      }
      if (/\bwhat time\b|\bthe time\b/.test(n)) return say('It\'s ' + A.util.fmtTime(new Date()) + '. (Plenty of time for bubbles.)');
      if (/\b(what('s| is) the date|what day|today's date|what's today)\b/.test(n)) return say('Today is ' + A.util.fmtLongDate(new Date()) + '.');
      if (/\bwhat('s| is) my name\b/.test(n)) return say('You\'re ' + name + '! I never forget a friend. :)');
      if (/\b(who made you|who created you|where do you come from)\b/.test(n)) return say('The Aerium team blew me into existence one sunny afternoon. (*)');
      if (/\b(who|what) are you\b|\bare you (a )?(bot|robot|real|human)\b/.test(n)) return say('I\'m AskBubbles, a helper bubble! I know a lot about Aerium. Everyone else on your list is a real friend or family member. :)');
      if (/\bhow are you\b/.test(n)) return say('I\'m feeling bubbly, thanks for asking! What can I help with?');
      if (/\b(thanks|thank you)\b/.test(n)) return say('You\'re welcome! Pop back anytime. (*)');
      if (/\b(i love you|love you)\b/.test(n)) return say('Aww. You\'re pretty bubbly yourself! (L)');
      if (/\b(bye|goodbye|see you|later)\b/.test(n)) return say('Bye for now! Pop back anytime. (*)');
      if (/^(will|should|can|am|is|are|do|does) (i|we|it|my)\b.*\?$/.test(low)) return say('The bubble says... ' + pick(['yes! (Y)', 'definitely!', 'ask again after a snack.', 'it\'s looking bubbly!', 'hmm, the bubble is foggy. Try again later.', 'signs point to yes.', 'maybe tomorrow.']));
      if (/^(hi|hey|hello|yo|hiya|sup|good (morning|afternoon|evening))\b/.test(n)) return say('Hi ' + name + '! I\'m AskBubbles. Ask me anything about Aerium, or type "help" to see what I can do. :)');
      return say(pick(['Hmm, that one floats right past me. Try "help" to see what I know, or ask me to open a program. (*)', 'That\'s outside my bubble! Ask me about themes, winks or nudges, or say "suggest something".', 'I\'m not sure about that one. Want a joke instead? Just say "joke". :)']));
    },
    games(say) {
      const games = A.apps.list({ category: 'games' }).map((a) => a.name);
      if (!games.length) return say('The games are still being unpacked. Check back soon! In the meantime, try sending Marcus a nudge. :P');
      return say('Games on this computer: ' + games.join(', ') + '. Say "open" and a name to play!');
    },
    welcome(bot) {
      return [{ say: 'Hi ' + bot.userName() + '! I\'m AskBubbles (*)' }, { say: 'Ask me anything about Aerium, or type "help" to see what I can do. :)', quick: true }];
    },
  };

  function findApp(q) {
    q = q.replace(/\b(the|app|program|application|please|for me|up|now|game)\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!q) return null;
    const alias = A.apps.aliases && A.apps.aliases[q.replace(/\s/g, '')];
    if (alias && A.apps.get(alias)) return A.apps.get(alias);
    let best = null, score = 0;
    A.apps.list().forEach((a) => {
      const name = a.name.toLowerCase(), id = a.id.toLowerCase();
      let s = 0;
      if (name === q || id === q) s = 100;
      else if (name.startsWith(q) || id.startsWith(q)) s = 80;
      else if (name.includes(q)) s = 60;
      else if (q.includes(name) || q.includes(id)) s = 50;
      else if ((a.keywords || []).some((k) => q === k.toLowerCase() || q.includes(k.toLowerCase()))) s = 30;
      if (s > score) { score = s; best = a; }
    });
    return best;
  }

  // A tiny safe calculator: numbers, + - * / % ^, parentheses, sqrt and a few words.
  function evalMath(input) {
    if (!/\d/.test(input)) return null;
    let s = ' ' + input.toLowerCase() + ' ';
    s = s.replace(/what(?:'s| is)|calculate|compute|equals|how much is|solve|tell me|please|\?|=/g, ' ')
      .replace(/(?:the )?square root of\s*/g, 'sqrt ')
      .replace(/sqrt\s*\(?\s*([\d.]+)\s*\)?/g, 'sqrt($1)')
      .replace(/([\d.]+)\s*squared/g, '($1)^2')
      .replace(/([\d.]+)\s*cubed/g, '($1)^3')
      .replace(/([\d.]+)\s*(?:%|percent)\s*of\s*([\d.]+)/g, '($1/100*$2)')
      .replace(/\bplus\b|\band\b|\badd\b/g, '+')
      .replace(/\bminus\b|\btake away\b|\bsubtract\b/g, '-')
      .replace(/\btimes\b|\bmultiplied by\b|×/g, '*')
      .replace(/(\d)\s*x\s*(?=[\d(])/g, '$1*')
      .replace(/\bdivided by\b|\bover\b|÷/g, '/')
      .replace(/\bto the power of\b/g, '^')
      .replace(/(\d),(\d{3})/g, '$1$2');
    const compact = s.replace(/\s+/g, '');
    if (!compact || /[a-z]/.test(compact.replace(/sqrt/g, ''))) return null;
    if (!/[+\-*/^%(]|sqrt/.test(compact)) return null;
    const tokens = compact.match(/sqrt|\d+(?:\.\d+)?|\.\d+|[+\-*/^%()]/g);
    if (!tokens || tokens.join('') !== compact) return null;
    let i = 0;
    const peek = () => tokens[i], next = () => tokens[i++];
    const expr = () => { let v = term(); while (peek() === '+' || peek() === '-') { const op = next(); const r = term(); v = op === '+' ? v + r : v - r; } return v; };
    const term = () => { let v = power(); while (peek() === '*' || peek() === '/' || peek() === '%') { const op = next(); const r = power(); v = op === '*' ? v * r : op === '/' ? v / r : v % r; } return v; };
    const power = () => { const v = unary(); if (peek() === '^') { next(); return Math.pow(v, power()); } return v; };
    const unary = () => { if (peek() === '-') { next(); return -unary(); } if (peek() === '+') { next(); return unary(); } return primary(); };
    const primary = () => {
      const t = next();
      if (t === '(') { const v = expr(); if (next() !== ')') throw new Error('paren'); return v; }
      if (t === 'sqrt') { if (next() !== '(') throw new Error('sqrt'); const v = expr(); if (next() !== ')') throw new Error('paren'); return Math.sqrt(v); }
      if (t != null && /^[\d.]/.test(t)) return parseFloat(t);
      throw new Error('token');
    };
    let v;
    try { v = expr(); if (i !== tokens.length) return null; } catch (e) { return null; }
    const shown = input.replace(/what(?:'s| is)|calculate|compute|equals|how much is|solve|tell me|please|\?|=/gi, ' ')
      .replace(/(\d)\s*x\s*(?=[\d(])/gi, '$1 × ').replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/\s+/g, ' ').trim();
    if (!isFinite(v)) return /\/0(?![\d.])/.test(compact) ? 'Dividing by zero makes my bubble wobble. Let\'s not! :S' : 'That number is too big for my bubble!';
    const out = Math.abs(v) >= 1e15 ? v.toExponential(4) : String(+v.toPrecision(12));
    return shown + ' = ' + out + pick([' (Y)', ' :)', ' (*)', '']);
  }

  // ------------------------------------------------------------ exports
  NS.friends = FRIENDS;
  NS.friendById = {};
  FRIENDS.forEach((f) => (NS.friendById[f.id] = f));
  NS.Bot = Bot;
  NS.bots = {
    create: (def, host) => new Bot(def, host),
    normalize, detect, evalMath, findApp,
    askWelcome: (bot) => AskBubbles.welcome(bot),
    jokes: JOKES, fortunes: FORTUNES, facts: FACTS,
    // Typing time in ms for a message, scaled to its length and the friend's speed.
    typingMs(def, text, quick) {
      const base = (String(text).length / (def.cps || 6)) * 1000;
      const max = def.style === 'grandma' ? 9000 : 6500;
      return clamp(base * (0.85 + Math.random() * 0.3) * (quick ? 0.8 : 1), def.bot ? 250 : 650, max);
    },
    thinkMs(def) { const [a, b] = def.think || [600, 1600]; return a + Math.random() * (b - a); },
    pickStart(def) {
      const opts = def.start || [['online', 1]];
      const total = opts.reduce((s, o) => s + o[1], 0);
      let r = Math.random() * total;
      for (const [id, w] of opts) { r -= w; if (r <= 0) return id; }
      return opts[0][0];
    },
  };
})();
