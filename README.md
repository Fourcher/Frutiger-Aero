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
- A power button, a quick POST screen, a glowing boot animation and a logon screen where you pick your name and picture
- The living aquarium desktop: glossy fish that school, explore, eat the food you drop and come say hello when you hold the cursor still, with a moonlit mode at night
- Glass windows you can drag, resize, snap to the screen edges, shake to clear the desktop, minimize into the taskbar and flip through in 3D
- A taskbar with a glowing start orb, colored hover glow that follows your cursor, live window thumbnails, jump lists, a clock with a calendar, and volume, network and battery flyouts
- A start menu with search, All Programs, and the user picture that turns into whatever you hover
- Desktop icons with the blue selection box, rename, drag to the Recycle Bin, and a very satisfying Refresh
- Three looks from the Frutiger Aero design system (Light, Dark and Technozen), 16 glass colors with intensity and transparency, animated and still wallpapers, pointer schemes, mouse trails and screensavers

Apps
- Notepad, Calculator, Paint, Command Prompt, Task Manager and Sticky Notes
- Explorer, Photo Gallery and the Recycle Bin
- Aerium Media Player with original music and visualizations
- Bubble Messenger, with friends who sign in, chat, nudge and send winks
- Horizon, a browser with a whole fake Web 2.0 internet to wander
- Games: Minesweeper (with the flower garden), Solitaire (with the bouncing win), Pairs, Bubble Pop and more
- Desktop gadgets, Channels (a calm living-room home screen), the Aquarium, Personalization, Control Panel, Welcome Center and Help

## Things to try

- Click the fish tank to drop food. Hold your cursor still near the betta.
- Right-click the desktop, choose Personalize and make the glass Lime at full intensity.
- Grab a window by its title bar and shake it.
- Press the Flip 3D button next to the start orb with a few windows open.
- Spam F5 on the desktop.
- Type `color a` in the Command Prompt.
- Nudge a friend in Bubble Messenger.
- Win a game of Solitaire.
- Paint something and set it as your desktop background.
- Leave the computer alone for a few minutes.
- Up, up, down, down, left, right, left, right, B, A.

## Your stuff

Everything you save (files, paintings, settings, your fish) lives in your browser's local storage, so it stays on your computer and nowhere else. To start fresh, open `index.html?reset`.

Handy URL options for tinkering: `?boot=skip` goes straight to the desktop, `&open=paint` opens an app, and `&theme=dark` or `&theme=technozen` switches the look.

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
