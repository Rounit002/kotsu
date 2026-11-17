# Design system

What the interface uses, and why. Every value below lives in [`src/styles/tokens.css`](../src/styles/tokens.css);
components only reference token names, so changing a value there changes it everywhere.

## The idea

**Glass over a painted place.** Every surface is a pane of glass — a translucent fill, a bright rim, a soft
shadow — and behind them all is a picture of a place: snow peaks under the aurora, a lighthouse over the
sea, dunes under the Milky Way. The glass has no colour of its own; it takes its mood from the place behind
it. There are five places, each painted by day and by night, and you choose which one you work in front of.

Four rules follow from that:

1. **Glass is the structure.** The bar, the date rail, the day, the legend and every box are panes.
2. **The picture carries the colour.** Inside a pane the only colours are the blue accent and four status
   tints, so the interface never competes with the place behind it.
3. **One typeface.** Hierarchy comes from size and weight.
4. **The page builds itself.** Nothing fades or slides in — things are drawn, poured, printed and typed.

## What the research said

Checked on X, the wider design web and Apple's Human Interface Guidelines (November 2026):

- **Liquid Glass is the dominant look**, and the most criticised one — always for legibility on busy
  backgrounds. So panes here are fairly opaque and the scene behind them is quiet.
- **What sits behind well-received glass**: on X, the glass work people share sits over a calm scene or a
  tonal wallpaper — a soft sky and a hill, dunes, a single-colour abstract — not over multi-colour blobs.
- **Apple's guidance on colour**: Liquid Glass "has no inherent color" and takes its colour from what is
  behind it; apply colour sparingly and reserve it for what needs emphasis. Use the system colours.
- **Apple's guidance on glass**: larger panes are more opaque; avoid glass on glass. Panes set inside other
  panes are therefore filled, not frosted.
- **Lucide icons are called out as the "AI-built app" default.** That is why they were replaced.

How the background got here, in order: soft multi-colour fields (too much gradient); a dot grid (dated); a
plain page (too plain — glass with nothing behind it is just a card); a single flat horizon (better, but
simple); and now painted places, which give the glass something worth looking through.

## Glass

| Part | How it is made |
| --- | --- |
| Pane | Translucent fill (`--glass`) with `backdrop-filter: blur(20px) saturate(180%)` (`--frost`) |
| Rim | 1px bright edge (`--edge`) plus an inner top highlight (`--shine`), so the pane catches light |
| Depth | One soft, wide, neutral shadow (`--shadow`); only the primary button adds a glow |
| Fill inside a pane | `--well`: Apple's translucent grey fill, for rows, inputs, buttons and the note window |
| Thick pane | `--glass-strong` for things that float above the page: menus and boxes |

The pane and its rim are separate layers of the `.glass` class, which is what lets the opening sequence draw
the rim first and pour the pane in afterwards.

**Light-bending edges.** In Chrome-based browsers a pane is a real lens
([`src/ui/Lens.tsx`](../src/ui/Lens.tsx)): its rim shows what is behind it clear but bent inwards, like the
edge of thick glass, and only the middle is frosted and tinted. Other browsers get the normal frosted pane.
A lens is two to three times the cost of a blur whenever what is behind it changes, so it is used only where
the backdrop holds still: after a pane has finished building, and for the page's own panes only on the wide
layout (where the page does not scroll). Boxes get it at every size.

**Safeguards.** People who ask their device for less transparency get solid panes (`--solid`) and no blur.

## Colour

The accent, status tints and fills are Apple's current system colours (Human Interface Guidelines, Color →
Specifications), adjusted only where text contrast required it. The pictures are our own.

### The backgrounds

Each background is a place, painted twice — by day for light mode, by night for dark mode. The land stays
the same between the two; only the light changes.

| Place | By night | By day |
| --- | --- | --- |
| **Himalaya** | Aurora over snow peaks, a lone walker on the ridge looking up | Dawn alpenglow, pink and gold on the snow |
| **Blue Ridge** | Full moon over ranges fading into blue mist | Clear morning, heaped clouds, pines |
| **Dunes** | The Milky Way over a sea of sand | Golden hour, a low sun |
| **Still Lake** | Moon and mountains doubled in still water | Misty morning, pale sun |
| **Lighthouse** | A beam sweeping out over a moonlit sea | Bright day, a sail on the horizon |

**How they are made.** Nothing is a photo or a downloaded image. [`src/app/scenes/paint.ts`](../src/app/scenes/paint.ts)
is a small painting kit — sky, stars, aurora, mountain ranges, snow, pines, water, cloud — and
[`src/app/scenes/places.ts`](../src/app/scenes/places.ts) composes those brushes into each picture, listed
back to front the way it would be painted. Adding a background means painting two pictures there.

**What makes them read as painted rather than generated:**

- **One light.** The sun or moon always hangs upper right. Every slope facing it is lit and every slope
  facing away is in shade — mountain faces, snow, dune crests, the rim of each ridge.
- **Depth by air.** Far ranges are paler and bluer and sink into mist; near ones are darker and sharper.
- **Real terrain shapes.** Skylines are built from layered waves, each half the size of the last, which is
  how actual ridgelines are structured.
- **A story where there is room for one**: the walker on the Himalayan ridge, the sail, the lighthouse beam.
- **Darkened corners**, so the eye rests in the middle where the work is.

**How they stay out of the way.** A picture is drawn once into a flat image and never changes afterwards, so
it costs nothing while you work. A new one is poured in over the old when you switch.

### Panes and fills

| Token | Light | Dark |
| --- | --- | --- |
| `--glass` (pane) | white at 76% | smoked: near-black blue at 50% |
| `--glass-strong` (menus, boxes, the month band) | white at 84% | blue-charcoal at 86% |
| `--well` (rows, inputs, buttons inside a pane) | grey at 8% | blue-grey at 16% |
| `--hairline` | `rgb(60 60 67 / 13%)` | white at 10% |

Night glass is *smoked* — it darkens what is behind it — so white text stays readable even with a bright
aurora or a full moon directly behind a pane. Day glass is milky for the same reason in reverse.

### Day and night

The sun/moon button in the bar switches between day (light mode) and night (dark mode); the picture button
beside it chooses the place. Until someone presses the first, the app follows the device; after that both
choices are remembered on that device ([`src/app/scenes/useScene.ts`](../src/app/scenes/useScene.ts)). Dark
mode is one attribute on the page and a second set of token values — no component has dark-specific code.

### Ink

`--ink` near-black `#111113` / near-white `#F5F5F7`, `--ink-2` for secondary text, `--ink-3` for labels and
placeholders, chosen to pass WCAG AA (4.5:1) on a pane in both modes.

### Accent — one, blue

Blue is Apple's default tint. It is split into two tokens so both uses stay readable:

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--accent` | `#0071E3` | `#0071E3` | Fills: the primary button, the selected date, chosen chips (white text, 4.7:1) |
| `--accent-ink` | `#0066CC` | `#4AA8FF` | Text and lines on a pane: links, today's ring, focus, the caret, traced outlines |

It marks three things only — **where you are, what to press, and what has focus.**

### Status tints — the only other colour

Each goal has exactly one tone, and the legend under the planner lists them all.

| Tone | Apple colour | Meaning |
| --- | --- | --- |
| Done | Green `52 199 89` | Marked done |
| Not done | Red `255 56 60` | Marked not done |
| Carried | Indigo `97 85 245` | Moved to a later date |
| Carried in | Orange `255 141 40` | Arrived from an earlier date — needs attention today |

They are used at 14–24% strength over the pane, so they stay pastel, with a darker partner (`--done-ink`, …)
for text and icons. Colour is never the only signal: done goals are struck through, carried goals carry a
"→ 18 Nov" tag, and the ✓ / ✕ marks fill in.

## Typography

**Google Sans Flex**, one variable family, with its roundness axis turned all the way up.

- **Why it fits.** Rounded letterforms echo the capsule buttons and soft corners, the way Apple pairs SF
  Rounded with its glass. Rounded type also reads as friendly rather than corporate, which suits a personal
  planner.
- **Why it reads well on glass.** It was drawn for interfaces: open shapes, a tall x-height, and steady
  numerals for dates. Body text is set slightly heavier than usual (450) because thin strokes get lost on a
  translucent surface.
- **Why only one.** A second typeface would compete with the glass for attention.

It is bundled with the app, so nothing is fetched from a font server.

| Token | Size | Used for |
| --- | --- | --- |
| `--text-xs` | 12px | Labels (uppercase, letter-spaced), weekday names, tags |
| `--text-sm` | 13px | Buttons, hints, the legend |
| `--text-md` | 15px | Body: goals, notes, inputs |
| `--text-lg` | 18px | The open goal's title, box titles |
| `--text-xl` | 26px | The day's title, goal periods |
| `--text-display` | 28–46px, fluid | The life lesson |

Large text is set at weight 620–650 with tight letter-spacing (−0.02em), which is what makes a big sentence
feel designed rather than merely enlarged.

## Icons

**Hugeicons** (free set, MIT): rounded strokes, close in feel to Apple's SF Symbols and noticeably less
common than Lucide. Because they are strokes rather than filled shapes, each one can be drawn on line by line.

All icons are named once in [`src/ui/icons.tsx`](../src/ui/icons.tsx) by what they mean in this app
(`GoalIcon`, `CarryIcon`…). Changing icon set means changing that one file.

## Motion: the page builds itself

When a page opens it is constructed in front of you, in order, over about three seconds:

1. **The place is poured in** — the picture floods across from the top-left corner.
2. **Outlines are traced** — each pane's rim is drawn around its edge in accent blue, like a blueprint line.
3. **Glass pours in** — the pane floods from its top-left corner.
4. **Controls are stamped** into place and their **icons are inked** stroke by stroke.
5. **Content is printed** — rows and labels are laid down left to right in steps.
6. **Titles are typed** — the day's name and the life lesson appear letter by letter behind a caret.

There is no fading and no sliding anywhere. The same vocabulary is reused at smaller scale: a box traces and
floods when it opens, a new goal prints in, switching day retypes the title.

How it works is described at the top of [`src/styles/build.css`](../src/styles/build.css). In short, each
piece gets a kind and a beat with `build('frame' | 'print' | 'stamp', beat)`, and CSS turns the beat into a
delay. Animations never leave anything clipped or transformed behind, and people who ask for reduced motion
get the finished page immediately.

## Spacing, shape, size

- **Spacing** uses a 4px grid: `--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 16 · `--s-5` 24 · `--s-6` 32 · `--s-7` 48.
- **The page**: 24px gutters left and right, 16px above and below the bar, 16px between panes.
- **Inside a pane**: 24px padding on every pane, so the day's title, the goal list and the legend share one
  left edge. Related things sit 8–12px apart, groups 24px.
- **The date rail**: 16px above the "Dates" label; each day is a weekday label, 4px, then a 38px circle, with
  16px between days. The month name is a full-width band the days pass beneath, so a day is never half
  covered. Open goals show as a small badge on the day's corner, which leaves the spacing between days
  untouched.
- **Alignment**: the add field's text starts exactly where goal titles start (its + sits where the ✓ ✕ marks
  do).
- **Shape**: capsules (`--pill`) for every button and chip, 14px for rows and inputs, 26px for panes.
- **Controls** are 38px tall; goal rows are at least 48px so they are easy to hit on a phone.

## Layout

The planner follows the wireframe: **dates on the left, the day's goals in the middle, the note window on the
right, the colour key underneath**, under a floating capsule bar. Each pane scrolls on its own.

Below 860px the dates become a horizontal strip, the note window drops under the list, and the page scrolls
normally. Below 720px the bar wraps onto two rows.

## Interaction principles

- **Type and press Enter** to add anything. No "new item" boxes.
- **Everything saves as you type.**
- **One click to mark** done (✓) or not done (✕); click the same mark again to clear it.
- **Destructive actions ask once**: Delete needs a second click; a carry can be undone.
- **Keyboard and screen readers**: every control is a real button, link or input with a label, focus is always
  visible, and boxes trap focus and close on Escape.

## Shared building blocks

Defined once in [`src/styles/base.css`](../src/styles/base.css) and [`src/ui/`](../src/ui):
`.glass` (and `.glass.inset`), `.btn` (primary · tonal · outline · ghost · danger), `.icon-btn`, `.input`,
`.field`, `.label`, `.mark`, `.chip`, `AddInput`, `Stepper`, `Chips`, `Menu`, `Dialog`, `Typed`, `build()`.
A new screen should be buildable from these without writing new colours, sizes or font rules.
