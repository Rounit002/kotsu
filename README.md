# Kotsu

*Kotsu-kotsu* (コツコツ) is Japanese for doing something steadily, a little at a time — which is how days
add up to a year.

A daily planner: goals and to-dos per date, notes, carrying unfinished goals forward, and yearly / monthly /
weekly goals. No sign-in needed — everything is saved on the device.

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
  data/persist.ts      The one place that decides where data is stored, and whose it is
  ui/                  Reusable pieces: Dialog, Menu, AddInput, Stepper, Chips, icons, build
  styles/              Design tokens, glass and shared CSS, the opening sequence
  app/                 Top bar and page frame
  app/scenes/          The backgrounds: a painting kit, the five places, the picker, day/night
  features/
    home/              Life lessons: lessons.json and the page that writes them out
    planner/           Daily view: date rail, goal list, note window, carry
    goals/             Year / month / week goals box
    account/           Profile, and sign-in behind an AuthGateway
```

Rules that keep it clean:

- A **feature** owns its screens, its store and its CSS. Features never import from each other;
  only `app/` composes them.
- **`domain/`** has no dependencies, so the same types and rules can be reused by a server later.
- **Stores** (Zustand) hold state and the actions that change it. Components only read and call actions.
- **CSS** uses token names only — no raw colours or sizes in components.

## Whose data is it

Every person's planner and goals are kept apart under their own owner id.

- Before sign-in the owner is `guest`. Creating an ID hands the guest's data to that ID.
- Signing in switches every user store to that person's data; signing out switches back to an empty guest.
- `userStore(...)` in `data/persist.ts` is for data that belongs to a person; `deviceStore(...)` is for the
  one thing that belongs to the device (who is signed in).

Today this separation is per browser. With Supabase it is enforced by the database — see below.

## Connecting Supabase

The app is shaped so the database slots in without touching screens or stores' logic.

1. **Schema** — run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). It creates
   `profiles`, `subscriptions`, `tasks`, `goals` and `lessons`, one-to-one with `src/domain/types.ts`.
   `lessons` is shared app content: everyone can read it, only the server can write it.
2. **Privacy** — every table has row-level security: a row is only visible to, and writable by, the user
   whose id is on it, and the database fills that id in from the session. A tampered client still cannot
   read or write anyone else's rows. `subscriptions` is read-only to its owner, so a plan can only be changed
   by the server (the payment webhook).
3. **Auth** — write `supabaseGateway.ts` implementing `AuthGateway` (`signUp` → `auth.signUp`,
   `signIn` → `signInWithPassword` / `signInWithOtp` / `signInWithOAuth`) and point `auth` at it in
   `features/account/store.ts`. The `Credentials` type already covers email, phone and Google.
4. **Data** — in `data/persist.ts`, mirror each user store to its table: load the user's rows after
   `switchOwner`, and write changes through. Local storage then acts as the offline cache.
5. **Keys** — only the project URL and the public *anon* key go in the app (`.env.local`, already
   git-ignored). The *service-role* key bypasses row-level security and must never ship to the browser.

## Life lessons

The home page writes out one lesson at a time and replaces it on its own; there is nothing to click.
The library is [`src/features/home/lessons.json`](src/features/home/lessons.json): short lessons **in our
own words** (not quotations), each with the person it was learned from and a source link. A web page cannot
search the internet by itself, so today the library ships with the app. Once Supabase is connected, a
scheduled function can add fresh rows to the `lessons` table and the page reads from there instead.

## Built to grow

| When you add… | You change… |
| --- | --- |
| **Phone or Google sign-in** | The `Credentials` type already has `phone` and `google` shapes and `User` already has `phone` and `providers`. Implement them in the gateway and add the buttons. |
| **Subscriptions** | `config/features.ts` — each feature lists the plans that include it, `User.plan` says which plan someone is on, and the UI asks `can(feature, plan)`. The `subscriptions` table is ready for a payment webhook to write to. |
| **Weekly / monthly views** | Add the page under `features/planner/`, a route in `main.tsx`, and flip `released` in `config/features.ts`. The menu entries already exist. |
| **A change to stored data** | Bump `version` in `data/persist.ts` and add a `migrate` function; add a new SQL migration alongside. |

## Data model

- **Task** — belongs to one date; has a title, note and status (`open` · `done` · `missed`).
  Carrying copies it (with its note) to a later date and links the two with `carriedTo` / `carriedFrom`.
- **Goal** — belongs to a `year`, `month` or `week` period.
- **Lesson** — a line in our own words, who it was learned from, and the page that documents it.
- **User** — name, email, sign-in providers and plan.
