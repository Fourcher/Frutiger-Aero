Frutiger Aero is the look of consumer technology from about 2004 to 2013. It shows up in Vista and 7, in Aqua and Leopard, the first iPhone, the Wii and DSi, Windows Live and the Xbox 360 dashboard. Under the gloss is one idea: technology that fits into nature instead of pushing it out. Skies are clean, water is clear, grass is lit by sun, and the machine is made of glass so you can see through it. This system builds with that feeling, not with any one operating system's chrome.

## The four materials

Every screen is made from four materials. If a design uses none of them, it isn't Aero.

- **Air.** Open sky from `sky-top` through `sky-mid` to `sky-bottom`, with soft clouds, light ribbons and lens flare. Build it with the `Scene` component or the Imagery wallpapers. Leave sky showing: layouts are centered and airy, with `space-12` around hero content.
- **Water.** Clear, cool and moving. Use `water-300` to `water-700`, bubbles, droplets and caustic light. Bubbles are the system's signature motif: use them in scenes, on the cover and as decoration, never as confetti.
- **Glass.** Controls and panels are materials you can see into. Glass panels use `glass`, `blur-glass` and a lit `glass-edge`. Gel buttons and orbs are solid glass: a lit top half, a saturated lower half and a caustic glow bouncing up from the bottom.
- **Light.** One light source, above and to the left. It makes the shine on every surface (`shine-height`), the flare in the sky (`sun-300`, `sun-500`) and colored glow on hover (`glow-aqua`, `glow-grass`). Glow replaces gray drop shadows.

## Color schemes

Every color token has a value in all three themes. Components only use tokens, so switching theme changes the whole system.

- **Light** (default). Daylight Aero and Frutiger Eco. Deep blue sky fading to pale haze, green hills, sun flare, clear glass, bright gloss.
- **Dark.** Dark Aero at night. Navy-black sky with a teal horizon, aurora ribbons, glass tinted blue, and smoked pearl for neutral controls. Gloss tones get brighter here so they glow, and labels on gloss stay dark.
- **Technozen.** The white, calm, family-friendly branch (Wii, DSi, Japanese home tech). White and pale grey, pinstripes, rounded type (`zen-title`, `zen-clock`), channel `Tile` grids. Keep gloss restrained and let white space lead.

Use the semantic roles, not raw hues, for anything structural:

| Role | Tokens | Rule |
| --- | --- | --- |
| Backdrop | `sky-top`, `sky-mid`, `sky-bottom`, `horizon-glow` | The page's sky, top to bottom at 0 / 55 / 100%. `horizon-glow` is the light source (sun, aurora or daylight). |
| Surfaces | `surface-sunken`, `surface`, `surface-raised`, `surface-overlay` | Four elevation steps, from wells up to menus and dialogs. `surface-hover` and `surface-selected` are the row states. `scrim` dims behind modals. |
| Glass | `glass`, `glass-strong`, `glass-edge`, `glass-shine` | Translucent layers over a backdrop. Use `glass-strong` over busy imagery. |
| Text | `ink`, `ink-muted`, `ink-subtle`, `ink-inverse` | `ink` for primary text, `ink-muted` for secondary, `ink-subtle` only for placeholders, timestamps and disabled text. |
| On-fills | `on-gloss`, `on-pearl`, `on-accent` | Labels on gloss tones, on pearl (which flips in Dark), and on solid accent. |
| Lines | `hairline`, `border-strong`, `divider` | `hairline` bounds controls (3:1). `divider` is decorative only. |
| Interactive | `accent`, `accent-hover`, `accent-pressed`, `accent-subtle`, `link`, `link-hover`, `focus`, `selection` | Solid blue for checks, sliders and markers. `accent-subtle` is the selected wash. |
| Status | `success`, `warning`, `danger`, `info`, each with `-bg` and `-fg` | The base color is the icon or marker. `-fg` text sits on `-bg`. Always pair status with an icon or word. |
| Gloss tones | `aqua-*`, `water-*`, `grass-*`, `sun-*`, `pearl-*`, `aurora-*` | Highlight, body and rim stops for gel surfaces and imagery. |

Shadows and glows are themed too: `shadow-panel`, `shadow-popover`, `shadow-card`, `shadow-gloss`, `shadow-orb`, `shadow-inset`, `glow-aqua`, `glow-grass` and `glow-aurora`. In Dark, shadows get deeper and glows get stronger.

The **Y2K layer** is an accent from the years just before Aero (about 1997 to 2004): chrome stripes (`chrome-100`, `chrome-500`, or the chrome-stripes texture), candy plastic (`bondi`), extended techno type (`y2k-tag`). Use it for stamps and small details. Frutiger Metro (the flat turn around 2011) is where the style ended. Don't design toward it.

## Content fundamentals

- Voice is calm, warm and hopeful, like a good setup wizard: "Your photos are backed up and ready to share." No irony and no hype.
- Sentence case for titles, buttons and labels ("Start backup", "Photo Channel").
- Speak to "you". The product never says "I".
- Keep it short and plain. One idea per line, big light type for the headline, `lead` for the one sentence under it.
- No emoji. The icons and imagery carry the mood.
- Nature words are fine when they're literal (sky, fresh, clear). Don't make eco claims for decoration: the era's "green city on a grass plain" imagery was often greenwashing, so pair eco imagery with something true.

## Visual foundations

**Color.** Two signature hues lead: `aqua-500` sky blue and `grass-500` green. `water-500` and `sun-500` support them. Every hue has a highlight (`-100` or `-300`) and a rim (`-700`), and gloss is built from those three stops. Neutrals are cool and slightly blue (`surface`, `pearl-*`), never warm grey. `danger` is for destructive actions and errors only. Never go blue to purple: Aero skies fade blue to white, and night skies go navy to teal.

**Type.** UI is set in the `aero` stack: Segoe UI where it's installed, otherwise Selawik, Microsoft's open-source metric match for Segoe UI, which ships in this system (SIL OFL 1.1). Headlines are light (300) and big: `display` on a Scene, `title` on panels. `lead` uses Semilight (350), the most recognizable weight of the era. `body` for running text, `label` for controls, `caption` in `ink-muted` for metadata. Technozen screens use the rounded `zen` family (M PLUS Rounded 1c) for `zen-title` and the ambient `zen-clock`. `y2k-tag` (Michroma) is for short uppercase stamps only.

**Gloss.** Pill surfaces use a four-stop gradient with a hard break at `gloss-line`: highlight, lighter mid, saturated body, then a bright caustic bloom rising from the bottom edge. A white shine layer sits inset from the top at `shine-height`. Add `shadow-gloss`. Don't blur the break, and don't put white labels on gloss: labels are `on-gloss`.

**Glass.** Panels are `glass` with `blur-glass` and a 1px `glass-edge` rim, plus a soft curved shine across the top 44%. Keep the frost light. Glass needs something behind it, so place panels over a Scene or wallpaper, not on flat `surface`. Body text goes on a `surface-raised` layer inside the panel (GlassPanel does this for you). Large `display` or `title` type may sit directly on the sky.

**Depth.** Floating panels get `shadow-panel`. Orbs and knobs get `shadow-orb`, which lights the sphere from inside. Hover adds colored glow. Pressed states recess with `shadow-inset`.

**Shape.** Everything is soft. Gel buttons, toggles, search fields, badges and orbs are pills or circles (`radius-pill`). Glass panels use `radius-lg`, tiles `radius-md`, fields `radius-sm`. Nothing has a sharp corner.

**Imagery.** Use saturated landscape photography: polarized blue skies, backlit grass, flowers, water, auroras and long exposures (the style of the Vista wallpapers). Add macro shots of droplets on leaves, soap bubbles, goldfish and tropical fish, dandelions and bokeh. One big photo sits behind the glass. When there is no photo, use a Scene (`sky`, `meadow`, `water`) or a wallpaper from Imagery. People are optional. If you show them, show them outdoors and small in the frame.

**Motion.** Slow and ambient. Ribbons drift over 24 seconds, bubbles rise in the Water scene, the progress sheen travels, and glows fade in over 200ms. Knobs overshoot slightly as they settle. All decorative motion stops under `prefers-reduced-motion`.

**States and focus.** Hover brightens and blooms. Pressed darkens and recesses. Disabled is desaturated at 55% opacity. Every control shows a 2px solid `focus` ring offset 2px. The ring is at least 3:1 on every backdrop stop and surface of its theme.

**Accessibility.** Every pairing below passes in all three themes, and was checked by script. `ink` meets 4.5:1 on every surface, `sky-bottom` and `accent-subtle`. `ink-muted` meets 4.5:1 on every surface and row state. `link` meets 4.5:1 on surfaces. `on-gloss` meets 4.5:1 on every gloss body, `on-pearl` on every pearl stop and `on-accent` on every accent state. Each status `-fg` meets 4.5:1 on its `-bg`. `hairline`, `border-strong`, `accent` and `focus` meet 3:1 as non-text marks. `ink-subtle` meets 3:1 and is never used for essential text.

## Iconography

The Icons group has 65 original glossy icons, each drawn as a lit object rather than a glyph. Each has:

- a body gradient lit from the top left
- a darker rim
- a white shine clipped to the upper half
- a caustic glow at the base
- a soft floor shadow

The set covers:

- **System:** home, folder, document, settings, search, lock, key, shield, trash, sync, download, upload
- **Status orbs:** check, info, warning, error, help, plus, close, play, pause
- **Communication:** mail, chat, phone, user, users, bell, calendar, clock
- **Media and devices:** music, photo, camera, video, disc, headphones, speaker, laptop, monitor, gamepad, battery, wifi, lightbulb
- **Commerce:** cart, gift, star, heart, pin
- **Weather:** sun, cloud, rain, snow, moon, rainbow, wind
- **Nature:** globe, leaf, flower, tree, mountain, butterfly, fish, dolphin, droplet, bubble, solar

Use them at 32px or larger. 48 to 96px is best, where the gloss reads. They're full color, so they work on every theme. Place them freely, inside an `Orb` (about 66% of its size), in a `Tile`, or in an `Alert`. To add icons, follow the same recipe and keep to the aqua, water, grass and sun palette. Don't use flat line icons, emoji, or any company's logo or mark.

## Asset library

- **Imagery.** Twelve 1600×1000 wallpapers for `background-size: cover` behind glass.
  - Light: clear-sky, meadow, sunrise, ocean, water, bokeh-day, vectorgarden (Vectorgarden flourishes) and technozen.
  - Dark: aurora, bokeh-night, dark-ribbons and deep-sea.
  - Match the wallpaper to the theme. For backdrops that follow the theme, use `Scene`.
- **Textures.** Tileable backgrounds:
  - pinstripe-light and pinstripe-dark (Technozen and Aqua panels)
  - caustics (water surfaces)
  - chrome-stripes (Y2K layer)
  - dot-grid
  - honeycomb-glass (an overlay for glass)
- **Decorative.** Transparent overlays to place over a backdrop:
  - three swooshes: white for Light, aurora for Dark, aqua for Technozen
  - lens-flare, light-rays, sparkles, a bubble cluster and a single bubble
  - a vector flourish
  - a reflection floor to set under hero objects
  - an animated loader
  - Use one or two per screen.
- **Avatars.** Eight framed user pictures in the style of the era's messenger apps: fish, flower, butterfly, dolphin, sun, globe, leaf and music. Use them with `Avatar` as default profile pictures.

## Don'ts

- Don't design flat. If it could pass for Windows 8, it's wrong.
- Don't use blue-to-purple gradients, neon-on-black cyberpunk, or grey drop shadows.
- Don't use heavy frosted blur. That's 2025 Liquid Glass, not 2007 Aero.
- Don't copy a real OS window: no fake title bars, caption buttons or Start orbs.
- Don't put white text on gloss, or body text straight on glass.
- Don't scatter bubbles, flares and ribbons everywhere at once. Pick one hero moment per screen.
