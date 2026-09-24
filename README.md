# Aerium

A Frutiger Aero operating system playground that runs in your browser.

Aerium is not a real operating system. It's a love letter to the family computer of the late 2000s: glass windows, glossy buttons, bubbles, sky and water, the startup chord, the fish tank desktop, and all the little things we clicked on when the computer was for playing, not working. It's built to be poked at and gotten lost in.

## Run it

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari). That's it. There's nothing to install and no build step, and it works straight from your disk.

If you'd rather serve it, any static server works:

```
npx serve .
# or
python3 -m http.server 8000
```

Turn your sound on. Every sound and song is synthesized live in the browser.

## What's inside

The shell
- A power button, a quick POST screen, a glowing boot animation, the startup chord and a logon screen where you pick your name and picture
- The living aquarium desktop: lifelike glossy fish with scales, flexing bodies and see-through fins in a planted tank with gravel, driftwood, sunbeams and rippling light. They school, explore, eat the food you drop and come say hello when you hold the cursor still, with name tags, a snail on the glass and a moonlit mode at night
- Glass windows you can drag, resize, snap to the screen edges, shake to clear the desktop, minimize into the taskbar and flip through in 3D
- A taskbar with a glowing start orb, hover glow that follows your cursor, live window thumbnails, jump lists, a clock with a calendar, and volume, network and battery flyouts
- A start menu with search, All Programs and the user picture that turns into whatever you hover
- Desktop icons with the blue selection box, rename, drag to the Recycle Bin or into any folder, and a very satisfying Refresh
- Desktop gadgets: Clock, Calendar, Weather, CPU Meter, Slide Show, Picture Puzzle, Feed Headlines, Currency and Fish Food
- Three looks from the Frutiger Aero design system (Light, Dark and Technozen), 16 glass colors with intensity and transparency, live and still wallpapers, pointer schemes, mouse trails and eight screensavers
- The little nags of the family computer: balloon tips, "device driver software installed successfully", and a permission prompt when you poke at the registry

Apps
- Notepad, Calculator (standard, scientific and programmer, plus unit and date conversion), Command Prompt, Task Manager and Sticky Notes
- Paint, with brushes that paint bubbles, rainbows, sparkles and glass gel, 24 shapes, stickers and Set as desktop background
- Explorer with the glass address bar, instant search, seven views and the Recycle Bin, and Photo Gallery with ratings and a slide show
- Media Player with eight original songs synthesized live, eleven visualizations and two sample videos
- Bubble Messenger, where ten friends with their own personalities sign in, chat, nudge, send winks and remember what you tell them, plus AskBubbles, a helper bot
- Horizon, a browser with a whole fake Web 2.0 to wander: a portal with horoscopes, a search engine, profile pages with autoplay songs, a video site, a photo site, an encyclopedia, Flash-style mini games, personal home pages with guestbooks and webrings, and a free screensaver site full of pop-ups
- Games: Minesweeper (with the flower garden), Solitaire (with the bouncing win), Pairs, Bubble Pop and Tile Lagoon
- Channels, a calm living-room home screen with live tiles and a shop where everything costs 0 points
- Control Panel, Personalization, System (with an Experience Index you can re-run), Welcome Center, Help and the Aquarium, where you can name and feed your fish

## Things to try

- Click the fish tank to drop food. Hold your cursor still near the betta.
- Right-click the desktop, choose Personalize and make the glass Lime at full intensity.
- Grab a window by its title bar and shake it.
- Press the Flip 3D button next to the start orb with a few windows open.
- Spam F5 on the desktop.
- Type `color a`, `tree`, `fish` or `format c:` in the Command Prompt.
- Nudge a friend in Bubble Messenger, or ask AskBubbles for a joke.
- End aeroshell.exe in Task Manager.
- Double-click the Calculator display.
- Win a game of Solitaire.
- Paint something and set it as your desktop background.
- Visit the free screensaver site in Horizon and try to claim your prize.
- Buy the Lime glass in the Channels shop.
- Leave the computer alone for a few minutes.
- Up, up, down, down, left, right, left, right, B, A.

## Your stuff

Everything you save (files, paintings, settings, your fish) lives in your browser's local storage, so it stays on your computer and nowhere else. To start fresh, open `index.html?reset`.

Handy URL options for tinkering: `?boot=skip` goes straight to the desktop, `&open=paint` opens an app, and `&theme=dark` or `&theme=technozen` switches the look. `node tools/smoke.mjs` opens every app in every theme and reports any errors (it needs Playwright).

## Made of original parts

Aerium evokes the era without copying it. The names, icons, wallpapers, sounds and music are all original, and no real company's logos or product names appear in the interface. The look comes from the Frutiger Aero design system in `design-system/` (tokens, components, glossy icons, wallpapers and textures). Fonts are Selawik, M PLUS Rounded 1c and Michroma, all under the SIL Open Font License.

The research behind the details lives in `docs/FEEL.md`, and `docs/APP_API.md` explains how to build a new app.

## Project layout

```
index.html              entry point; loads everything in order
design-system/          Frutiger Aero tokens, component styles, fonts and assets
src/core/               runtime: DOM helpers, settings, sound, music, files, theming, UI kit, windows, apps
src/shell/              boot and logon, desktop, taskbar, start menu, effects, screensaver host
src/wallpapers/         the aquarium, the betta and the other animated wallpapers
src/apps/               every app, one folder each
tools/                  build scripts for tokens, icons and assets, plus a screenshot helper
```

After editing anything in `design-system/assets` or `src/icons`, run `node tools/build-icons.mjs && node tools/build-assets.mjs`. After editing `design-system/tokens.json`, run `node tools/build-tokens.mjs`.
