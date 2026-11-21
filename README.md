# Kotsu

*Kotsu-kotsu* (コツコツ) is Japanese for doing something steadily, a little at a time — which is how days
add up to a year.

A daily planner: goals and to-dos per date, notes, carrying unfinished goals forward, and yearly / monthly /
weekly goals. No sign-in needed — everything is saved on the device; with an ID it is also kept in a
database and follows you to any device.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

The visual system (fonts, colours, spacing and the reasons for each) is in [docs/DESIGN.md](docs/DESIGN.md).

## Deploying

The app is a static site: `npm run build` writes everything to `dist/`. [`render.yaml`](render.yaml) tells
Render how to build and serve it — including the one rule a single-page app needs (every address serves
`index.html`) and the security and caching headers. `.node-version` pins the Node version used to build.

## The desktop app (Mac and Windows)

[`desktop/`](desktop) wraps the same built site in a window of its own (Electron). It is not a second app:
there is no desktop-only screen or store, and an ID and its data are the same ones the website uses.

- **`main.js`** opens the window and serves `dist/` at a fixed address, `app://kotsu`. The fixed address is
  what lets data saved on the computer be found on the next launch, and the files travel inside the program,
  so it opens without a connection. Other addresses open in the browser, never in this window.
- **`preload.cjs`** — on a Mac the picture runs to the top edge; this leaves a strip for the window buttons.
- **`build/icon.svg`** is the icon; `icon.png` is the same drawing at 1024px, which the installers are made from.
- **Signing in** works as on the website. The emailed confirmation link opens the website (a link cannot open
  a desktop program); after confirming, sign in inside the app. `DESKTOP` in `config/features.ts` is the one
  place the site knows it is running inside the program.

```bash
npm run desktop
```

runs it from source. Installers are written to `desktop/release/`:

```bash
npm run desktop:pack -- --mac
```

```bash
npm run desktop:pack -- --win
```

The first run needs `npm install` inside `desktop/`, then `node node_modules/electron/install.js` there if npm
skipped Electron's download.

**Not signed.** Apple and Microsoft only trust installers signed with a paid developer certificate. Without
one the app still works, but the first launch is blocked with a warning: on a Mac, open
*System Settings → Privacy & Security* and choose *Open Anyway*; on Windows, *More info → Run anyway*.
Updates are not automatic either — a new version is a new download.

## Measuring speed

Measure the production build, never the dev server. `npm run dev` serves unminified code with React's
development checks (several megabytes), so a Lighthouse run against port 5173 says nothing about what users get.

```bash
npm run build
```

```bash
npm run preview -- --port 4173
```

Then run Lighthouse against `http://localhost:4173`. On the emulated phone with slow 4G it scores
99 / 100 / 100 / 100 (performance, accessibility, best practices, SEO), with no layout shift.

What keeps it there:

- **First paint is set in `index.html`**, before any stylesheet or script: the remembered theme and the
  colour of the remembered background. A refresh never flashes white.
- **The font is preloaded**, so text never appears in a fallback and then jumps.
- **Typed text is laid out once** and only revealed (see `Typed` in `src/ui/build.tsx`); it never re-wraps.
- **Icons are a small local file** (`src/ui/icons.tsx`), not an icon package.
- **The background is one flat image**, painted once.

## How the code is organised

```
src/
  config/features.ts   Feature flags and which plan gets what
  domain/              Plain types and date maths — no React, no storage
  data/persist.ts      The copy on the device, and whose it is
  data/sync.ts         Keeps a signed-in person's stores and their database tables in step
  data/supabase.ts     The connection to the database
  ui/                  Reusable pieces: Dialog, Menu, AddInput, Stepper, Chips, icons, build
  styles/              Design tokens, glass and shared CSS, the opening sequence
  app/                 Top bar and page frame
  app/scenes/          The backgrounds: a painting kit, the five places, the picker, day/night
  features/
    home/              Life lessons: lessons.json and the page that writes them out
    planner/           Daily view: date rail, goal list, note window, carry
    goals/             Year / month / week goals box
    content/           Content Planner: categories (YouTube, X…) and the ideas kept for each
    account/           Profile, and sign-in (Supabase, behind an AuthGateway)
desktop/               The Mac and Windows program: a window around the built site
```

Rules that keep it clean:

- A **feature** owns its screens, its store and its CSS. Features never import from each other;
  only `app/` composes them.
- **`domain/`** has no dependencies, so the same types and rules can be reused by a server later.
- **Stores** (Zustand) hold state and the actions that change it. Components only read and call actions.
- **CSS** uses token names only — no raw colours or sizes in components.

## Whose data is it

Every person's planner and goals are kept apart under their own owner id.

- **Without an ID** the owner is `guest` and everything stays on the device. Nothing is sent anywhere.
- **Creating an ID** hands the guest's work to it: a brand-new ID, holding nothing yet, adopts what is on
  the device. Signing in to an ID that already has data shows that data instead; the guest's stays behind.
- **Signing out** switches back to an empty guest. The ID's data stays in the database and in a copy on
  that device, sealed off under its own id.

`userStore(...)` in `data/persist.ts` is for data that belongs to a person; `deviceStore(...)` is for the one
thing that belongs to the device (who is signed in).

## The database (Supabase)

Sign-in and storage for people with an ID run on Supabase.

- **Sign-in** — `features/account/auth/supabaseGateway.ts`, email and password, confirmed from an emailed
  link. The app learns who is signed in from one place only (`auth.watch` in `features/account/store.ts`),
  so a sign-in in another tab, an emailed link, or a session running out are all handled the same way.
- **Storage** — the device is always written first, so the app is instant and works offline.
  `data/sync.ts` mirrors each store to a table: it reads the table on sign-in, then sends every change a
  moment later. Unsent changes are listed on the device, so they survive a closed tab or lost connection.
  A store opts in with one `mirror({...})` call next to it (see `planner/store.ts`, `goals/store.ts`).
- **Privacy** — enforced by the database, not the app. Every row carries its owner, filled in by the
  database from the signed-in session, and row-level security only ever returns a person their own rows.
  A tampered client still cannot read or write anyone else's. `subscriptions` is read-only to its owner, so
  a plan can only be changed by the server (a payment webhook).
- **Schema** — [`supabase/migrations/`](supabase/migrations), run in order: `profiles`, `subscriptions`,
  `tasks`, `goals`, then `routines`, `content_categories`, `content_ideas`, mirroring `src/domain/types.ts`.
  A migration must only add (new tables, new nullable columns) so installed desktop apps keep syncing, and
  it must run before the code that uses it is pushed.
- **Checking privacy** — [`supabase/tests/privacy.sql`](supabase/tests/privacy.sql) acts as two users and a
  signed-out visitor and reports what each could reach, then rolls itself back. Run it after any change to
  the schema or its policies.
- **Keys** — `.env` holds the project URL and the *publishable* key. Both are public by design (they are
  sent to every browser) and are committed. The *secret* key bypasses row-level security: it must never be
  in this repository or in the app.

Not built yet: password reset, changing email, and deleting an ID.

## Life lessons

The home page writes out one lesson at a time and replaces it on its own; there is nothing to click.
The library is [`src/features/home/lessons.json`](src/features/home/lessons.json): short lessons **in our
own words** (not quotations), each with the person it was learned from and a source link. A web page cannot
search the internet by itself, so the library ships with the app. A `lessons` table fed by a scheduled
Supabase function would let it grow without a new release.

## Built to grow

| When you add… | You change… |
| --- | --- |
| **Phone or Google sign-in** | The `Credentials` type already has `phone` and `google` shapes and `User` already has `phone` and `providers`. Implement them in the gateway and add the buttons. |
| **Subscriptions** | `config/features.ts` — each feature lists the plans that include it, `User.plan` says which plan someone is on, and the UI asks `can(feature, plan)`. The `subscriptions` table is ready for a payment webhook to write to. |
| **Weekly / monthly views** | Add the page under `features/planner/`, a route in `main.tsx`, and flip `released` in `config/features.ts`. The menu entries already exist. |
| **A change to stored data** | Bump `version` in `data/persist.ts` and add a `migrate` function; add a new SQL migration alongside, and update the store's `toRow` / `fromRow`. |
| **A new kind of synced data** | A table with the same owner column and policy as `tasks`, and one `mirror({...})` call next to its store. |

## Data model

- **Task** — belongs to one date; has a title, note, status (`open` · `done` · `missed`) and an optional
  duration in minutes. The day shows those durations against its 24 hours. Carrying copies it (with its
  note) to a later date and links the two with `carriedTo` / `carriedFrom`.
- **Routine** — a task that repeats every day, or every week on the weekday it started. Its days are not
  stored ahead of time: `tasksOn` shows them, and one is saved only when it is touched (marked, noted,
  carried). That saved day gets an id derived from the routine and the date, so two devices filling in the
  same day write one row. Removing one day adds it to `skipped`; stopping it sets `ends`.
- **Content category / idea** — a place you post to, and the ideas kept for it (marked once posted).
- **Goal** — belongs to a `year`, `month` or `week` period.
- **Lesson** — a line in our own words, who it was learned from, and the page that documents it.
- **User** — name, email, sign-in providers and plan.
