# Frutiger Aero Feel Bible (2004–2013)

Key: ⚠ = trademark/copyright, build an original. [inf] = my own synthesis, not documented. Everything else is sourced.

## 1. Vocabulary and sub-styles
- **The name** combines the Frutiger typeface with Windows Aero ("Authentic, Energetic, Reflective, Open"). The core is nature fused with tech, "a utopia where efficiency and the environment coexist" ([Wikipedia](https://en.wikipedia.org/wiki/Frutiger_Aero)).
- **What makes it Aero rather than just glossy** [inf]:
  - Real materials (glass, water, light) that are translucent and show something alive behind them.
  - Daylight optics: a hard specular highlight at 45–50%, a soft glow at the bottom, bloom, caustics, wet-floor reflections.
  - High-key sky blue, aqua and leaf green on white.
  - Humanist sans typefaces in light weights.
  - Slow motion and glassy sound.
  - Not Aero: Y2K chrome, flat Metro, frosted cards with no specular highlight.
- **Technozen**: Japanese. "Cold, sterile, professional… yet cozy, friendly, cute". White, light wood and plants (Wii, DSi, MUJI). Music is synths, electric pianos and flutes ([Skeuoss](https://skeuoss.net/blogs/aesthetics/technozen)).
- **Dark Aero**: black or obsidian glass with bokeh, lasers, neon and spectrum accents, 2006–2015 (WMP11, Zune, Xbox 360) ([ref](https://frutiger-aero.org/dark-aero)).
- **Frutiger Eco**: glass globes, seedlings, wind turbines, bulbs with landscapes inside, ladybugs, grassy hills, solar panels.
- **Vectorgarden**: vector swirls, florals, butterflies, auroras and bubbles with heavy gradients. Its cousin Frutiger Metro uses vivid flat silhouettes.
- **Helvetica Aqua Aero**: ocean and beach. Tropical fish, coral, bubbles, clouds and rainbows, bridging Y2K and Aero.
- **Canonical imagery**: a goldfish in a round bowl, sunlit bubbles, dew on leaves, aurora ribbons, green hills under cumulus, dolphins, glossy globes, butterflies. Vista's default Aurora wallpaper is blue-green light designed to feel "peaceful, calm and open" ⚠.
- **Betta homage** (Windows 7 beta, by Britt Hansing; the fish was named "Bubbles"):
  - She "inverted" Vista's aurora bands to make the scene feel underwater, and added "directional diffused light… moving upward".
  - The fish is realistic CGI and blows exactly 7 bubbles, a nod to the version number ([hansingdesign](https://www.hansingdesign.com/windows7)).
  - The RC version moved the fish further left and brightened the "teal glow at the left".
  - Recipe [inf]: navy corners (#021A4A) fading to royal blue (#0A3FA8), with a teal glow (#20C4D6) along the left edge. Add 2–3 soft diagonal light bands rising up-right at 5–12% white.
  - Fish: left of centre, about 28% of the width. Iridescent cobalt body (#1C4FD6) with a turquoise sheen (#48D4FF). Translucent blue-violet veil fins (#2B2FA0→#5A78FF) with fine rays and bright rims.
  - Bubbles: seven rim-lit bubbles rising in an arc above the head.

## 2. Vista/7 glass chrome
- **Layer stack**: blur 6–12px with saturate 1.25 → colour tint at the intensity alpha → white sheen over the top half (30%→0) → faint diagonal streaks (3–8%) → 1px inner edge #FFFA, 1px outer edge #000000B3, a 2px 2px 10px shadow and a 6px radius ([7.css](https://github.com/khang-nd/7.css/blob/main/gui/_window.scss), [NameThatUI](https://namethatui.com/styles/windows-aero)).
- **Title**: black Segoe UI 9pt ⚠ on a white glow (`0 0 10px #fff` stacked eight times). Inactive windows are paler.
- **Caption buttons**: close is red (#E0A197→#D54F36) with a red halo; minimize and maximize get a cyan glow (`0 0 7px 3px #5DC4F0`).
- **Maximized windows**: opaque in Vista, still glass in Windows 7.
- **Taskbar**: black glass in Vista. In Windows 7 it is tinted and 40px tall.
- **Swatches** (alpha = intensity; [AeroThemePlasma](https://git.rintyuu.dev/rintyuu/aerothemeplasma/src/commit/67e6edbc47c1b37df9ca17d1321670b3e6ab3c6a/Documentation/Software/KWin/AeroColorMixer.md)):
  - **Windows 7**: Sky #74B8FC 42% (default) · Twilight #0046AD 66% · Sea #32CDCD 50% · Leaf #14A600 40% · Lime #97D937 40% · Sun #FADC0E 33% · Pumpkin #FF9C00 50% · Ruby #CE0F0F 66% · Fuchsia #FF0099 40% · Blush #FCC7F8 44% · Violet #6E3BA1 52% · Lavender #8D5A94 32% · Taupe #98844C 40% · Chocolate #4F1B1B 66% · Slate #555555 50% · Frost #FCFCFC 33%.
  - **Vista**: Default #409EFE 27% · Graphite #000000 64% · Blue #004ADE 66% · Teal #008CA5 51% · Red #CE0C0F 61% · Orange #FF7700 65% · Pink #F93EE7 29% · Frost #EFF7F7 80%.
- **Intensity slider**: alpha, clamped to 0x0D–0xD9 ([calc](https://github.com/ALTaleX531/dwm_colorization_calculator)). The colour mixer has Hue, Saturation and Brightness sliders.
- **Transparency off** (as AeroThemePlasma emulates it): the colour goes opaque, blended with rgb(235,235,235) by alpha, and the streaks disappear.
- **Hot-track (7)**: a running taskbar button lights up in the icon's predominant colour (black, white and gray ignored). The glow is centred on the cursor and follows it ([Chen](https://devblogs.microsoft.com/oldnewthing/?p=8963%2F)).
- **Taskbar progress**: green normally, yellow when paused, red on error.

## 3. Shell behaviors
- **Flip 3D**: live windows stacked "like the exploded view of a deck of cards", each rotated about 20° on Y [inf], with the desktop as one card. Tab or scroll cycles.
- **Peek**: hover the thin strip at the far right and all windows become glass outlines.
- **Shake**: shake a window to minimize the others; shake again to restore them.
- **Snap**: drag to an edge for half-screen, or the top to maximize. A glass preview outline and a cursor ripple show the target.
- **Opening a window**: scale 0.9→1 with a fade over ~220ms [inf].
- **Gadgets** ([Wikipedia](https://en.wikipedia.org/wiki/Windows_Desktop_Gadgets)): in Vista they sit in the Sidebar, a translucent strip on the right edge.
  - **Clock**: analog, with a choice of faces and time zone.
  - **Calendar**: a big date page that flips to a month view.
  - **Weather**: glossy condition icon over a sky that changes for day and night.
  - **CPU Meter**: two dials, CPU and RAM.
  - **Slide Show**: cycles pictures.
  - **Picture Puzzle**: sliding tiles with a timer.
  - **Feed Headlines**: RSS headlines.
  - **Currency**: two-currency converter.
  - Vista only: Notes, Stocks, Contacts. Microsoft killed gadgets in 2012 over a security flaw.
- **Vista Welcome Center**: opens at every startup and shows the edition. Links include View computer details, Transfer files and settings, Add new users, Connect to the Internet, Ultimate Extras, What's new, plus an "Offers from Microsoft" section. Windows 7's "Getting Started" has 9 links ([Wikipedia](https://en.wikipedia.org/wiki/Microsoft_Tips)).
- **Desktop right-click (7)**:
  - View ▸ Large/Medium/Small icons, Auto arrange, Align to grid, Show desktop icons
  - Sort by ▸ Name, Size, Item type, Date modified
  - Refresh, Paste, Paste shortcut, Undo Delete
  - New ▸ Folder, Shortcut, Bitmap image, Contact, Rich Text Document, Text Document, Compressed (zipped) Folder, Briefcase
  - Screen resolution, Gadgets, Personalize
  - Spamming Refresh makes the icons blink for ~100ms.
- **Screensavers**: Vista had 3D Text, Aurora, Bubbles, Mystify, Photos, Ribbons and Windows Energy. Windows 7 dropped Aurora and Energy.
  - **Bubbles**: glass spheres with colour-cycling rims and shadows, floating over a live desktop screenshot and bouncing off each other and the edges. Settings: MaterialGlass, ShowShadows, ShowBubbles, Radius, SphereDensity ([Winaero](https://winaero.com/customize-screen-savers-in-windows-10-using-secret-hidden-options/)).
  - **Ribbons**: glowing ribbons over black, each trailing its own colour.
  - **Aurora**: green, cyan, violet and teal rods of light scrolling across black, brightest at the centre.
  - **Mystify**: colour-cycling polylines with echo trails.
  - **3D Text**: Spin, See-Saw, Wobble or Tumble.
- **Start menu (7)**:
  - Search box: "Search programs and files" (Vista: "Start Search").
  - Right pane: glass, with a framed user picture that pokes above the menu and crossfades to the icon of the hovered item.
  - Items: Documents, Pictures, Music, Games, Computer, Control Panel, Devices and Printers, Default Programs, Help and Support.
  - Power: "Shut down" with a ▸ menu (Switch user, Log off, Lock, Restart, Sleep, Hibernate). Vista has an amber Sleep button and a padlock. ⚠ The orb logo.

## 4. Sound design
- **Vista startup**: Robert Fripp wrote the melody, Steve Ball the harmony, and Tucker Martine the "Win-dows Vis-ta" rhythm. Four seconds, four chords, one per logo colour: a "soft da-dum, da-dumm, with a lush fade-out". The 45 system sounds were "more muted, less jarring" than XP's ([NBC](https://www.nbcnews.com/id/wbna15656246)).
- **Windows 7 startup**: E major, 121 BPM, melody B5–B6, chords ii7(add11)→Isus2sus4 ([Hooktheory](https://www.hooktheory.com/theorytab/view/microsoft/windows-7-startup-sound)). Its rising two-note opening recurs in the logon and alert sounds ([20k](https://www.20k.org/episodes/tadaitswindows)).
- **Recipes** [inf]:
  - **Boot**: Gm9(11)→F/A→B♭maj9→F(add9). Detuned-saw pad (400ms attack, filter sweeping 1.2→3kHz) plus FM bells (ratio 1:3.5, index 3→0.2) playing a rising fourth as "da-dum… da-dummm". Reverse riser, 3.5s reverb with octave shimmer.
  - **Notify**: two tones rising a fourth, 5ms attack, 350ms decay.
  - **Error**: a soft mallet falling a minor third, low-passed at 2.5kHz.
  - **Navigation click**: 4ms of noise band-passed at 2–4kHz plus a 1.5kHz blip.
  - **Recycle Bin**: 8–15 noise grains over 800ms, then a thump.
  - **Messenger**: one Microsoft staffer said it "sounds like an ice cream van", with contacts that "bling online" and "optimistic bleeps" ([MS blog](https://learn.microsoft.com/en-us/archive/blogs/tristank/more-fiddling-emotion-free-quiet-msn-messenger-sound-scheme)).
    - New message: two marimba notes rising, 80ms apart.
    - Contact sign-in: a three-note rising arpeggio.
    - Nudge: a 120Hz square wave plus noise with 15Hz tremolo for 700ms, paired with a ±10px window shake.
  - **Wii**: the menu music is an ambient loop of "mellow, slowly modulating chords". Focus is a "light and slightly metallic click", select is a "quick zap", and moving in or out of a channel is a rising or falling whoosh ([beyondthebeep](https://www.tumblr.com/beyondthebeep/41170831979/the-nintendo-wiis-ui-sounds)).
    - Tick: 3kHz sine with FM ratio 2.7, 25ms. Zap: 900→2800Hz over 70ms. Whoosh: a band-passed noise sweep.
    - Ambient: 65 BPM maj9 pads shifting by thirds, with sparse electric piano.
  - **Shop jazz**:
    - Reference: the Wii Shop theme is G major at 149 BPM, using I9–IV9–iv9–♭VII7sus4, dim7 chords and tritone substitutions, then moves to E major. The Mii Channel theme is B Dorian at 114 BPM ([Hooktheory](https://www.hooktheory.com/theorytab/view/kazumi-totaka/wii-shop-channel-theme)).
    - Original version: 120–150 BPM bossa clave with rim clicks, root–fifth bass, Rhodes and vibraphone comping on the off-beats, and a flute lead. Chords like Imaj9–vi9–ii9–V13sus4–V7♭9 plus a borrowed iv6, modulating up a major third. ⚠ No melodies.

## 5. MSN culture
- **Statuses**: Online, Busy, Be Right Back, Away, In a Call, Out to Lunch, Appear Offline. The 2009 version cut these to four. Colours: green, red, amber, gray. WLM 2009 added status-coloured frames around display pictures ([Wikipedia](https://en.wikipedia.org/wiki/Windows_Live_Messenger)).
- **Personal message**: song lyrics (friends read them as SOS signals), "I <3 ???", ~*~ … ~*~, xXx, •°o.O … O.o°•, and "♫ Artist – Song" from the player.
- **Screen names**: surferboi76, flirtyguurl15, xX_Sk8erBoi_Xx.
- **Rituals**: nudge attacks, winks, signing in and out to get noticed, appearing offline, finding out you'd been blocked, "be online at 4:30pm" ([Punkee](https://archive.punkee.com.au/msn-messenger-teens-weird-memories/132749)).
- **Chat window**: "Name says:" before each message, "…is typing a message", colourful Comic Sans.
- **Sign-in toast**: slides up bottom-right saying "Name has just signed in." and fades after ~5s.
- **Slang**: lol, brb, g2g, ttyl, jk, kk, nm u?, wbu, ily, bff, n00b, pwned, <3, XD, ^_^, "hy wot up, r u gd?".
- **Emoticon codes** ([PC.net](https://pc.net/emoticons/shortcuts/live)): :) :D ;) :P :O :( :'( :@ :$ :S (H) cool (A) angel (6) devil (L) heart (U) broken heart (K) kiss (F) rose (Y)/(N) thumbs up/down (*) star (8) note (^) cake (C) coffee ({ (}) hugs (brb). ⚠ The emoticon and wink artwork.

## 6. Windows Media Player 11
- **Look**: glossy black glass with a big round Play button between Previous and Next "wings", blue hover glow, and tabs for Now Playing, Library, Rip, Burn and Sync. Suggested [inf]: #0B0F14→#2B3440 with a #3AA8FF glow.
- **Visualizations**:
  - **Alchemy** ("Random" preset): organic wireframe forms that grow and dissolve with soft glows.
  - **Bars and Waves**: Bars, Ocean Mist and Fire Storm are spectrum analyzers; Scope is an oscilloscope line.
  - **Battery**: 26 feedback presets with names like "my tornado is resting" ⚠ ([wmpvis](https://wmpvis.fandom.com/wiki/Battery)).

## 7. Wii / XMB
- **Wii Menu** ([Wikipedia](https://en.wikipedia.org/wiki/Wii_system_software)):
  - Four pages of 4×3 rounded "TV screen" tiles with animated previews; hovering shows a light-blue frame and plays a tick [inf].
  - Off-white background with faint pinstripes (Aqua reference: `repeating-linear-gradient(180deg,#f2f4f7 0 2px,#e7eaef 2px 4px)`).
  - Curved gray bottom bar with a big gray clock and the date ("Wed 9/23"), a round Wii button on the left and an envelope on the right.
  - Clicking a channel zooms it full screen, with "Menu"/"Start" pill buttons. The boot screen says "Press A".
  - Typeface: Rodin ⚠. Free alternatives: M PLUS Rounded 1c, Nunito.
- **Mii colours** ([Lospec](https://lospec.com/palette-list/mii-favorite-colors)): #D31E15 #FD6F19 #FFD920 #78D320 #007830 #0A49B3 #3CAADF #F55A7C #7428AE #483817 #E0E0E0 #181914.
- **Mii culture**: crowds in the Plaza, parades, celebrity lookalike Miis.
- **PS3 XMB**:
  - Horizontal categories with vertical items.
  - A layered translucent sine "ribbon" with sparkles; the background colour follows the month, and brightness peaks at noon.
  - Approximate months ([Wikipedia](https://en.wikipedia.org/wiki/XrossMediaBar)): Jan khaki→brown, Feb olive→green, Mar pink, Apr silver→green, May thistle→purple, Jun light blue→teal, Jul blue→dark blue, Aug purple→violet, Sep maroon→khaki, Oct #B87333→brown, Nov #CE2029→red, Dec #E0B0FF→silver.
  - Fan recipe: three sine-edged alpha layers scrolling at 30, 20 and 12s per cycle, with white crest highlights ([ref](https://github.com/barretstorck/es-theme-xmb-psp)).

## 8. Web 2.0 kit
- **Ben Hunt's style guide**: centered layout, bold logo, big text, strong colours, gradients, reflections, cute icons, "star flashes" ([ref](https://phpfour.com/web-20-how-to-design-style-guide/)).
- **Wet floor**: a flipped copy at 30% opacity, fading out over 40% of its height.
- **Starburst**: an 18-point star rotated 15° with "Beta!" or "New!".
- **Glossy pill**: white highlight on the top half with a hard horizon.
- **Names**: drop vowels (Flickr, Tumblr), -ster/-ify/-ly, .fm domains ([Time](https://time.com/70206/silly-tech-company-naming-trends/)). Original examples: Glossr, Bubblr.
- **MySpace**: autoplay song, Top 8, a default first friend, glitter text, sparkly backgrounds, "Mood: bored :(", "Thanks for the add!".
- **Old web**: "Under Construction" GIFs, hit counters, guestbooks, webrings, MIDI.
- **Flash portal**: thumbnail grid with star ratings and a "Loading 47%" bar.
- **2007 video site**: tagline, a yellow Upload button, a 425×344 player, 5-star ratings, "Videos Being Watched Right Now".

## 9. Nostalgia details
- **Boot and cursor**: Vista boots to black with a segmented green bar. The busy cursor is a spinning blue-green ring.
- **Wi-Fi list**: linksys, NETGEAR, default, belkin54g, dlink, 2WIRE###; "Unidentified network – No Internet access".
- **Balloons**: white gradient in Vista/7, pale yellow #FFFFE1 in XP. "Your computer might be at risk", "Device driver software installed successfully".
- **UAC**: the screen dims, and the banner colour shows who's asking: blue-green = Windows, gray = verified, orange = unknown, red = blocked ([Chen](https://devblogs.microsoft.com/oldnewthing/20070330-00/?p=27433)).
  - Vista: "An unidentified program wants access to your computer", with Cancel or Allow ("I trust this program…").
  - Windows 7: "Do you want to allow the following program to make changes to this computer?"
- **Hung apps**: after 5 seconds, "(Not Responding)" appears and the window washes white. Then "Windows is checking for a solution to the problem…" ([MS Learn](https://learn.microsoft.com/en-us/previous-versions/windows/win32/win7appqual/preventing-hangs-in-windows-applications)).
- **Experience Index**: the base score is the lowest of five subscores. Maximum 5.9 in Vista, 7.9 in Windows 7.
- **cmd**: `color 0a` gives hacker green. Legacy palette: 0 #000000, 1 #000080, 2 #008000, 3 #008080, 4 #800000, 5 #800080, 6 #808000, 7 #C0C0C0, 8 #808080, 9 #0000FF, A #00FF00, B #00FFFF, C #FF0000, D #FF00FF, E #FFFF00, F #FFFFFF. Tricks: `dir /s`, `tree`, `shutdown -s -t 60`.
- **Sample Pictures**:
  - Vista: Autumn Leaves, Creek, Desert Landscape, Dock, Forest, Forest Flowers, Frangipani Flowers, Garden, Green Sea Turtle, Humpback Whale, Oryx Antelope, Toco Toucan, Tree, Waterfall, Winter Leaves.
  - Windows 7: Chrysanthemum, Desert, Hydrangeas, Jellyfish, Koala, Lighthouse, Penguins, Tulips.
- **Sample Music**:
  - Windows 7: Kalimba, Maid with the Flaxen Hair, Sleep Away.
  - Vista: Amanda, Despertar, Din Din Wo, Distance, I Guess You're Right, I Ka Barra, Love Comes, Muita Bobeira, OAM's Blues, One Step Beyond, Symphony No. 3. ⚠ All licensed.
- **User pictures**: an orange gerbera (the default), a goldfish in a bowl, a kitten in a basket, beach chairs.
- **Games**:
  - **Purble Place**: Pairs, Comfy Cakes, Shop.
  - **Chess Titans**: glass, wood or marble 3D sets.
  - **Mahjong Titans**: Turtle, Dragon, Cat, Fortress, Crab, Spider.
  - **InkBall**: draw ink lines to guide coloured balls into matching holes.
  - **Minesweeper**: a Flower Garden skin. Openings ripple, mines chain-explode, and a win triggers a laser sweep ([article](https://minesweepergame.com/article/vista-has-changed-minesweeper-2007.pdf)).
  - **Solitaire** win cascade: constant horizontal velocity, gravity, damped bounces, trailing card copies.

## Trademark flags
- **Microsoft**: the logo and orb, Aero, Vista, Segoe fonts (use Selawik or Source Sans 3), all wallpapers, sample media, sounds, game and gadget art, emoticons.
- **Nintendo**: Wii, Mii, Totaka's music, Rodin.
- **Sony**: PlayStation and XMB.
- **Apple**: Aqua and the iPod silhouettes.
- **Websites**: YouTube, MySpace and Google logos.
- **Fonts**: Frutiger, Myriad and Helvetica are commercial.
