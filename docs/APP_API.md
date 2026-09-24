# Aerium app guide

Aerium is a Frutiger Aero operating system playground that runs as static files in the browser. It opens straight from disk (`file://`), so there is **no build step, no ES modules, no fetch of local files, no network, and no external libraries**. Every file is a classic script wrapped in an IIFE that talks to the global `window.Aerium`.

Read these first:
- `design-system/docs/README.md`: the Frutiger Aero design system (tokens, materials, rules).
- `docs/FEEL.md`: research notes on the era's details, sounds and culture.
- `src/apps/notepad/notepad.js`: the reference app. Copy its structure.

## Running and testing

Open `index.html` in a browser. Handy URL options:

- `index.html?boot=skip` goes straight to the desktop (no power button, no logon).
- `index.html?boot=skip&open=paint` also launches an app. `&open=paint,calculator` launches several.
- `&path=/Documents/Welcome%20to%20Aerium.txt` passes `{path}` to the opened app; `&url=`, `&page=`, `&q=` work too.
- `&theme=dark` or `&theme=technozen` switches the scheme. `&reset` wipes saved state.

Screenshot helper (headless Chromium, fresh profile each run, prints console errors):

```
node tools/shoot.mjs --query "boot=skip&open=paint" --out /tmp/paint.png
node tools/shoot.mjs --query "boot=skip&open=paint" --eval "Aerium.sound.play('win')" --click ".some-button" --out /tmp/p2.png --wait 800
```

`--eval` and `--click` steps run in order with `--wait` ms between them. Look at your screenshots and iterate. Ship with zero console errors.

## Registering an app

```js
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;

  A.apps.register({
    id: 'calculator',               // unique id, also used by ?open= and the Run dialog
    name: 'Calculator',             // shown in the start menu and taskbar tooltip
    icon: 'icons/calculator',       // asset key (see Assets) or a data: URL
    color: '#3aa6f5',               // taskbar hot-track glow color (the icon's main hue)
    category: 'accessories',        // accessories | games | internet | media | system | settings
    description: 'Performs basic arithmetic.',  // start menu tooltip
    keywords: ['math', 'calc'],     // start menu search
    fileTypes: ['txt'],             // extensions this app opens (double-click in Explorer/desktop)
    single: false,                  // true: launching again focuses the existing window
    hidden: false,                  // true: not listed in the start menu
    noWindow: false,                // true: launch(null, args) and draw your own UI (overlays, desktop items)
    window: { width: 320, height: 420, minWidth: 260, minHeight: 300, resizable: true, maximizable: true, glassBody: false },
    tasks: [{ label: 'New game', icon: 'icons/play', onClick() {} }],   // optional taskbar jump-list tasks
    launch(win, args) {
      // Build UI into win.body. args comes from Aerium.apps.launch(id, args) (for example {path}).
      win.body.appendChild(h('div.my-app', null, 'Hello'));
      return {
        beforeClose() { return true; },   // optional; return false (or Promise<false>) to veto closing
        onClose() {},                      // optional; stop timers, rAF loops and audio here
        onResize() {},                     // optional
        onFocus() {}, onBlur() {},         // optional
        onArgs(args) {},                   // optional; for single apps launched again with new args
        keepAwake() { return false; },     // optional; true stops the screensaver (games, video)
      };
    },
  });
})();
```

`glassBody: true` removes the white client area so your content sits directly on the window glass (use it for media players and chat windows, then paint your own panes).

## Window object (`win`)

| Member | What it does |
| --- | --- |
| `win.body` | The client area element. Fill it. It is `position: relative; overflow: hidden`. |
| `win.el` | The whole window element (listen for `keydown` here for app shortcuts). |
| `win.setTitle(text)`, `win.setIcon(assetKey)` | Title bar text and icon. |
| `win.close(force)`, `win.minimize()`, `win.maximize()`, `win.restoreSize()`, `win.toggleMaximize()`, `win.focus()` | Window state. |
| `win.resizeTo(w, h)`, `win.moveTo(x, y)`, `win.center()` | Geometry. |
| `win.flash()` | Taskbar button pulses orange until the user focuses the window. |
| `win.shake()` | Nudge animation (Messenger nudges). |
| `win.setBusy(bool)`, `win.setNotResponding(bool)` | Busy cursor; "(Not Responding)" white wash. |
| `win.on('close' | 'resize' | 'focus' | 'blur' | 'minimize' | 'restore' | 'maximize', fn)` | Events. |
| `win.state` | `'normal' | 'maximized' | 'minimized'`. |

Dialogs you open with `parent: win` are modal to that window.

Extra windows: `Aerium.wm.create({ app: 'myapp', title, icon, width, height, ... })` opens another window for your app (conversation windows, tool palettes). Pass `background: true` to open it just beneath the active window without stealing focus. The window `launch` created is marked `win.main`, so relaunching a `single` app focuses that one rather than an extra window.

## Global API

### `Aerium.util`
`h(tag, props, ...children)` builds DOM: `h('div.a.b#id', { class, style: {}, dataset: {}, onclick, text, html, ref }, children)`.
`s(tag, attrs, ...children)` builds SVG. Also: `$`, `$$`, `css(text, id)`, `escapeHTML`, `emitter()`, `clamp`, `lerp`, `rand(a, b)`, `randInt`, `pick`, `shuffle`, `seeded(seed)`, `sleep`, `uid`, `debounce`, `throttle`, `fmtBytes`, `fmtTime(date, seconds)`, `fmtDate`, `fmtDateTime`, `fmtLongDate`, `fmtDuration(sec)`, `drag(el, { onStart, onMove(e, dx, dy), onEnd, threshold })`, `isTyping(event)`, `downloadBlob(blob, name)`, `loadImage(src)`, `hexToRgb`, `rgbToHsl`.

### Assets
All icons and pictures are embedded; reference them by key. `Aerium.asset(key)` returns a URL, `Aerium.icon('fish')` is shorthand for `asset('icons/fish')`, `Aerium.img(key, props)` returns an `<img>`. URLs are `blob:` URLs, so they draw onto canvases without tainting them (`toDataURL` keeps working).

- Icons (64x64 glossy objects; use at 32px or larger, 48 to 96 is best): `icons/` + one of
  battery bell bubble butterfly calendar camera cart chat check clock close cloud disc document dolphin download droplet error fish flower folder gamepad gift globe headphones heart help home info key laptop leaf lightbulb lock mail monitor moon mountain music pause phone photo pin play plus rain rainbow search settings shield snow solar speaker star sun sync trash tree upload user users video warning wifi wind,
  and Aerium's own: aerium (the logo orb) calculator notepad paint cmd taskmgr cards mine pairs sticky gadgets trash-full run channels personalize aquarium mediaplayer photogallery defender welcome network computer folder-documents folder-pictures folder-music folder-videos folder-games folder-downloads folder-desktop folder-user.
- Wallpapers (1600x1000): `imagery/` + clear-sky meadow sunrise ocean water bokeh-day vectorgarden technozen aurora bokeh-night dark-ribbons deep-sea.
- Textures (tile them): `textures/` + caustics chrome-stripes dot-grid honeycomb-glass pinstripe-dark pinstripe-light.
- Decorative overlays: `decorative/` + bubble-cluster bubble-single flourish lens-flare light-rays loader reflection-floor sparkles swoosh-aqua swoosh-aurora swoosh-white.
- Avatars (96x96 framed messenger pictures): `avatars/avatar-` + butterfly dolphin fish flower globe leaf music sun.

Never use emoji. Draw anything else you need as inline SVG or canvas in the same glossy recipe (body gradient lit from the top left, darker rim, white shine clipped to the upper half, caustic glow at the base).

### `Aerium.ui` (returns elements; styles already exist)
- `button(label, { tone: 'pearl'|'aqua'|'grass'|'water', size: 'sm'|'lg', onClick, icon, disabled, default })`: gel pill button. `aqua` is the one main action per view, `grass` means go/save, `pearl` is everything else.
- `orb({ icon, label, tone, size: 'sm'|'md'|'lg', onClick, glyph })`: round glass icon button.
- `toggle({ label, checked, onChange })`, `checkbox({ label, checked, onChange })`, `radio(...)`, `radioGroup({ options: [[value, label]], value, onChange })`.
- `slider({ min, max, step, value, onInput, onChange, vertical })` (an `input[type=range]`; call `.setValue(v)`).
- `select({ options: [[value, label]] | ['a', 'b'], value, onChange })`, `textField({ label, value, placeholder, onInput, onEnter, help })` (`.input` is the `<input>`), `searchField({ placeholder, onSearch, onInput })`.
- `progress({ value, tone: 'grass'|'aqua', marquee })` (`.set(v)`), `spinner({ size })`, `badge(text, tone, 'burst')`, `tabs({ tabs: [{ id, label, icon, content }], value, onChange })`.
- `menu(items, x, y)`: context menu. Items: `{ label, icon, shortcut, onClick, disabled, checked, radio, bold, submenu: [...] }`, `{ separator: true }`, `{ header: 'Title' }`.
- `contextMenu(el, (event) => items)`, `menubar([{ label: 'File', items: [...] | () => [...] }])`, `flyout(anchorEl, content, { placement: 'top'|'bottom', align })`.
- `messageBox({ title, icon: 'info'|'warning'|'error'|'question'|'success'|'shield'|assetKey, instruction, message, detail, buttons: ['OK'] | [{ label, value, default, cancel }], parent })` returns a Promise of the pressed button's value (or index). Vista task-dialog look: a blue main instruction, then text.
- `alert(message, opts)`, `confirm(message, opts)` (Promise of boolean), `prompt({ title, message, value, parent })` (Promise of string or null).
- `dialog({ title, icon, content: element, buttons, parent, width })`: your own modal content.
- `fileDialog({ mode: 'open'|'save', title, folder, filename, exts: ['txt'], filterLabel, parent })`: Promise of a path or null.
- Tooltips: put `data-tip="text"` (and optionally `data-tip-title`) on any element.

### CSS building blocks (already styled)
`.ae-toolbar` + `.ae-tool` (+ `.active`) + `.ae-tool-sep` (Vista command bar), `.ae-menubar`, `.ae-statusbar` + `.ae-status-cell`, `.ae-sidebar` (navigation pane), `.ae-pane`, `.ae-scroll`, `.ae-list-item` (+ `.selected`), `.ae-group-title`, `.ae-link`, `.ae-muted`, `.ae-heading` (light 22px blue page title), `.ae-subheading`, `.ae-hr`, `.ae-input`, `.ae-select`, `.ae-flyout-panel`.
Design system classes: `.fa-panel` (glass panel over imagery), `.fa-btn`, `.fa-orb`, `.fa-tile` (Technozen channel tile), `.fa-badge`, `.fa-avatar`, `.fa-alert`, `.fa-progress`, `.fa-spinner`, `.fa-y2k` (uppercase techno stamp). Type classes: `.t-display .t-title .t-heading .t-lead .t-body .t-label .t-caption .t-zen-title .t-zen-clock .t-y2k-tag`.

Use design tokens, never raw colors for structure: `var(--ink)`, `var(--ink-muted)`, `var(--surface-raised)`, `var(--surface)`, `var(--surface-sunken)`, `var(--surface-hover)`, `var(--surface-selected)`, `var(--hairline)`, `var(--divider)`, `var(--accent)`, `var(--link)`, `var(--aqua-500)`, `var(--grass-500)`, `var(--sun-500)`, `var(--water-500)`, `var(--pearl-100/300/500)`, `var(--shadow-panel)`, `var(--shadow-gloss)`, `var(--glow-aqua)`, `var(--radius-md)`, `var(--font-aero)`, `var(--font-zen)` and so on (full list in `design-system/tokens.css`). All of them switch with the Light, Dark and Technozen schemes, so test your app with `&theme=dark` and `&theme=technozen`. The window glass color comes from `hsla(var(--glass-h), var(--glass-s), var(--glass-l), var(--glass-a))`.

Prefix every class with your app's short name (`pt-` for Paint, `mp-` for Media Player...) so nothing collides.

### `Aerium.sound`
`play(name)` with name in: startup logon logoff shutdown notify ding error exclamation question navigate click menu open close minimize maximize message signin signout nudge recycle empty pop plop bubble hover zap whooshIn whooshOut select back win lose balloon snap card shuffle coin flag lock connect disconnect type.
Synthesis primitives for your own sounds (all times are `AudioContext` seconds; `sound.ctx` is null until the user's first click, so guard with `if (!A.sound.ctx) return`): `bell(freq|'C5', t, { dur, vel, ratio, index, rev, pan })`, `epiano(f, t, o)`, `pluck(f, t, o)`, `pad(['C4','E4'], t, { dur, vel, attack, release })`, `noise(t, { dur, vel, type, f1, f2, q })`, `blip(f1, f2, t, { dur, vel, type })`. Connect custom nodes to `A.sound.sfx` (effects) or `A.sound.musicBus` (music) so system volume and mute apply. `A.sound.freq('A4')` converts note names. `A.sound.register(name, (t) => { ... })` adds a named sound built from those primitives; after that `play(name)` works anywhere, with the usual rate limiting and mute.

### `Aerium.fs` (virtual file system, persisted in localStorage)
Paths look like `/Documents/notes.txt`. Standard folders: `/Desktop /Documents /Pictures /Music /Videos /Downloads /Recycle Bin`.
`list(dir)` (items: `{ path, name, type: 'file'|'folder', ext, size, modified, mime, readonly }`), `read(path)`, `write(path, data, { mime })`, `mkdir`, `rename(path, newName)`, `move(path, destDir)`, `copy`, `remove(path)` (to the Recycle Bin), `restore(recyclePath)`, `emptyRecycleBin()`, `exists`, `isDir`, `stat`, `uniqueName(dir, name)`, `join/dirname/basename/ext/stem`, `iconFor(path)`, `thumbFor(path)` (image URL for pictures), `typeName(path)`, `on(fn)` (change events `{ path, type, dir }`).
File contents are strings. Pictures are data URLs (`data:image/png;base64,...`) or references to built-in art (`asset:imagery/meadow`); music is `track:<id>`; video is `video:aquarium`; shortcuts (`.lnk`) hold `app:<appId>`. Storage is small (about 5 MB), so keep saved images modest and catch write errors. `room()` estimates the bytes left. Big writes (over 32 KB) are saved immediately, and if they don't fit, `write` and `copy` throw an error with `code: 'ENOSPC'` and a friendly message, leaving the old file untouched.

### Other services
- `Aerium.apps.launch(id, args)`, `apps.openFile(path)`, `apps.get(id)`, `apps.list({ category })`, `apps.aliases` (Run-dialog names like `calc`, `mspaint`, `cmd`).
- `Aerium.store.get(key, fallback)` / `set(key, value)` / `on(key, fn)`: persisted settings. Namespace your keys (`paint.lastColor`).
- `Aerium.bus.on(event, fn)` / `emit(event, ...args)`: app-to-app events. Known events: `media:nowplaying` `{ title, artist }`, `media:stopped`, `theme:change`, `glass:change`, `wallpaper:mounted`, `fs:change`, `win:open`, `win:close`, `screensaver:start`, `screensaver:stop`, `shell:start`.
- `Aerium.notify({ title, text, icon, onClick, timeout, sound })`: tray balloon. `Aerium.notify.toast({ title, text, avatar, app, appIcon, onClick })`: messenger-style toast from the corner.
- `Aerium.theme`: `set('light'|'dark'|'technozen')`, `current`, `THEMES`, `GLASS` (16 swatches `{ id, name, hex, h, s, l, intensity }`), `glassColor()`, `setGlass({ color, custom: { h, s, l }, intensity: 0-100, transparency })`, `wallpapers` (Map of `{ id, name, group, kind: 'image'|'animated', asset, theme }`), `setWallpaper(id | 'file:/Pictures/x.png', fit)`, `currentWallpaper()`, `thumb(id)` (preview element), `CURSORS`, `applyCursor()`. Settings live in the store: `glass.color`, `glass.intensity`, `glass.transparency`, `wallpaper`, `wallpaper.fit` (fill fit stretch tile center), `cursor.scheme`, `cursor.trails`, `sound.enabled`, `sound.volume`, `screensaver.id`, `screensaver.wait` (minutes), `screensaver.text`, `user.name`, `user.avatar`, `effects.level`.
- `Aerium.screensaver`: `register({ id, name, overDesktop, create(container, { preview, text, width, height }) -> { destroy() } })`, `list()`, `start(id)`, `stop()`, `preview(id, container) -> stopFn`.
- `Aerium.taskbar.addTrayIcon({ id, icon, tip, onClick(el), onContext(el) })` returns `{ setIcon, setTip, remove }`.
- `Aerium.wm.windows`, `wm.byApp(id)`, `wm.active`.
- `Aerium.effects.flip3d()`, `Aerium.startmenu.show()`, `Aerium.boot.shutdown()`, `boot.logoff()`, `boot.lock()`, `boot.sleep()`.
- `Aerium.music` (see below), `Aerium.aquarium` (see below), `Aerium.gadgets` (see below).

### `Aerium.music` (implemented in `src/core/music.js`)
A single global music player that synthesizes original tracks live.
- `tracks`: `[{ id, title, artist, album, genre, year, duration, bpm, color }]`. Required ids: `bubble-garden`, `sky-mall`, `aurora-drift`, `hydration-station`, `glass-city`, `dolphin-dreams` (sample music), plus the loops `channels` (calm Technozen menu music) and `shop` (bossa shop music).
- `getTrack(id)`, `play(id, { loop, fadeIn })` (Promise), `playFile(url, meta)` for a user-chosen audio file, `pause()`, `resume()`, `stop({ fadeOut })`, `seek(seconds)`, `state` (`stopped | playing | paused`), `current` (track), `position`, `duration`, `volume` (0 to 1, the player's own level), `analyser` (an `AnalyserNode` for visualizations), `on(event, fn)` with events `play pause stop end time`.
- Emits `media:nowplaying` and `media:stopped` on `Aerium.bus`.

### `Aerium.aquarium` (implemented in `src/wallpapers/aquarium.js`)
`create(container, { mode: 'tank' | 'betta', preview, interactive })` draws a live fish tank into `container` and returns `{ destroy(), pause(), resume() }`. Use it for previews (Channels, screensaver) instead of drawing your own fish.

### `Aerium.gadgets` (implemented in `src/apps/gadgets/gadgets.js`)
`init()` once at startup, `start()` when the desktop appears, `stop()` when it goes away, `gallery()` opens the gadget gallery, `add(id)`.

## Rules for every app

**Feel.** This is a nostalgia playground for people who grew up on the family computer around 2007. Fun first, then partly functional. Every app should have at least one delightful detail from the era (a sound, an animation, an in-joke, a setting to fiddle with). Glossy, lit, translucent, soft, airy. Humanist light type. Motion is slow and ambient. Hover brightens and blooms; pressed recesses.

**Originality.** Evoke the era, never copy it. No real company or product names or logos in the UI (no Windows, Microsoft, Apple, Nintendo, Wii, MySpace, YouTube, Google, MSN, Internet Explorer...). Invent names (Horizon browser, Bubble Messenger, Aerium Media Player). No copyrighted music, melodies, lyrics or artwork. No emoji anywhere; draw glossy icons instead.

**Copy.** Calm, warm, hopeful, like a good setup wizard. Sentence case. Speak to "you". Short. Avoid em dashes in UI text.

**Code.**
- One IIFE per file, `'use strict'`, modern JS (classes, arrow functions, template strings are fine), no `import`/`export`, no `fetch`/XHR of local files, no CDN or network, no libraries.
- Only touch the files you own. If you need a change in a shared file (`src/core`, `src/shell`, `src/css`, `index.html`, another app), don't make it; describe it in your final report.
- Stop every timer, `requestAnimationFrame` loop, `AudioContext` node and global listener when your window closes (`onClose`). Pause heavy animation when minimized (`win.on('minimize')` / `'restore'`).
- Canvas: scale for `devicePixelRatio` (cap at 2) and redraw on resize.
- Guard audio: `A.sound.ctx` is null until the first user gesture.
- No `alert()`, `confirm()` or `prompt()`; use `Aerium.ui`.
- Keyboard: give obvious shortcuts (Enter, Esc, arrows, Ctrl+S) where they fit. Buttons that are only icons need `aria-label` and `data-tip`.
- Zero console errors or warnings. Check with `tools/shoot.mjs` in all three themes.
