# Habiba Akter: QA Engineer Portfolio

A personal portfolio for a Software Quality Assurance engineer. It comes with a built-in CMS admin panel, so every word on the site can be edited, added to or hidden without touching code.

The design follows a **test-runner / GitHub** look: a live "release check" terminal in the hero, `*.spec.ts` section labels, PASS badges, coverage checklists and a mauve-pink and blue palette. It opens as a 3D island world that a chubby cat explores, with a classic page one click away. A recruiter can tell the role and the seniority within the first few seconds.

## Features

**3D island world** (`/`, the default view)
- The portfolio opens as a dynamic 3D world, like a small RPG: a chain of floating islands joined by rope bridges on a pastel ocean, with cherry-blossom trees, blue pines, glowing crystals, drifting clouds and sparkles, in a **mauve, pink and blue** palette (dusk colours in dark mode).
- **Testy, a chubby 3D tabby cat**, walks on four legs with a real gait: diagonal legs move together, the body bobs and leans into turns, the tail sways, and when idle Testy breathes, blinks, twitches an ear and looks around.
- Every island is one section (Home, About, Projects, Experience, Skills, Education, custom sections, Contact). When the cat **arrives on an island, that section's details slide in**, with buttons to walk on to the next island.
- Controls: **WASD / arrow keys** to walk, **click or tap** anywhere to walk there (across the bridges), the island dock or floating island labels to travel, **drag** to look around, **scroll** to zoom, and click the cat to pet it.
- Gold coins on every island; the cat collects them as it walks. Progress is saved in the browser.
- A **Classic view** button switches to the regular page (the choice is remembered). The classic page is always rendered by the server underneath, so search engines, screen readers, no-JavaScript visitors and browsers without WebGL still get everything.

**Classic page**
- **Hero** with a strong tagline, an availability badge, CTAs and an animated test-suite terminal
- **Key stats** strip showing years in QA, products shipped, test layers and domains
- **About** with a QA lifecycle strip, highlight cards and soft skills
- **Case studies**: 3 featured projects, each laid out as *Risk → My approach → Coverage*, plus a grid of other products and automation labs
- **Experience** timeline with the current role highlighted
- **Toolchain** with skill groups and proficiency meters
- **Education & training**
- **Custom sections** that you create from the CMS (certifications, awards and so on)
- **Contact** card with a copy-email button
- **Coin Explorer, built into the page**: every section is an island on an animated ocean, with name signs and progress. Coins float on each island; tap one and **Testy, a chubby cat companion**, walks over on four paws to grab it. Click any empty spot to walk Testy there, or steer with the **arrow keys**; Testy picks up every coin it walks over. Left alone, the cat breathes, blinks, swishes its tail and wanders a little, and you can pet it on wide screens. Clearing an island pays a bonus. Visitors unlock 5 achievements, and a wallet panel (bottom-left) shows score, islands, achievements, sound and reset. Progress is saved in the browser.
- **Bug Hunt, its own button** (bottom-right): 1 to 18 hidden bugs to squash against the clock, with hints, sound, a QA rank and a best time.
- **Eye-catching touches**: scroll progress bar, typing "currently testing…" line, count-up stats, an infinite tools marquee, 3D tilt cards, an animated aurora hero and a re-runnable test terminal.
- Cursor spotlight glow on cards
- Dark mode by default plus a light mode toggle, fully responsive, subtle scroll reveals and hover effects, and respect for `prefers-reduced-motion`

**CMS admin** (`/admin`)
- Password-protected dashboard with a sidebar for every section
- Edit any field, and add, delete, duplicate or reorder items in every list
- Tag inputs, multi-line lists, toggles and nested lists (for example, tools inside skill groups)
- Mark projects as **featured**, and show or hide whole sections
- **Mini-games** panel controls every game setting:
  - *General*: sound on or off by default
  - *3D island world*: open the site as a 3D world or as the classic page
  - *Coin Explorer*: on/off, coins per island, coin value, island bonus, scenery, cat on/off and name, arrow-key and click-to-walk control, island greetings, achievements, completion title and message, and the name of each island
  - *Bug Hunt*: on/off, number of bugs (−/+), button label, intro text, hints, and the rank time limits
- Create **new custom sections**, which appear on the site and in the navigation automatically
- Unsaved-changes indicator, **Ctrl/Cmd + S** to save, and a Discard button
- Change the password, and export or import all content as JSON

## Tech stack

- Next.js 16 (App Router) and React 19
- three.js for the 3D island world (`components/world/`)
- Tailwind CSS 3
- TypeScript
- Geist Sans and Geist Mono fonts, bundled locally with no network fetch
- Storage is a file-based JSON file: no database and no environment variables

## Getting started

Requirements: Node.js 18.18 or newer.

```bash
npm install
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin
- Default admin password: **`admin123`**. Change it right away under **Admin → Settings**.

Production build:

```bash
npm run build
npm start
```

## How the CMS works

| File | Purpose |
| --- | --- |
| `data/content.json` | All site content. The admin panel reads and writes this file. |
| `data/auth.json` | Salted scrypt hash of the admin password. It is created on first login and git-ignored. |
| `components/admin/schema.ts` | Declares every editable field. The admin forms are generated from it. |
| `lib/types.ts` | TypeScript types for the content model. |

The public page reads `data/content.json` on every request, so changes appear as soon as you click **Save**.

> **Note:** Content is saved to the local filesystem. On hosts with a read-only or temporary filesystem, edits made in the admin will not persist. Edit locally, then commit the updated `data/content.json`. You can also use **Export JSON** to back up your content.

### Adding a new field type

1. Add the property to the type in `lib/types.ts`.
2. Add a value for it in `data/content.json`.
3. Add a field entry to the matching section in `components/admin/schema.ts`. The admin form appears automatically.
4. Render it in the matching component under `components/site/`.

For new *content blocks*, you don't need code. Use **Admin → Custom sections**.

## Project structure

```
app/
  layout.tsx              Root layout, fonts, theme bootstrapping
  page.tsx                Public portfolio (server component)
  globals.css             Tailwind layers and design tokens
  admin/page.tsx          CMS entry
  api/
    content/route.ts      GET content · PUT content (auth required)
    auth/login/route.ts   POST login · GET session status
    auth/logout/route.ts  POST logout
    auth/password/route.ts POST change password
components/
  world/                  3D island world: engine (three.js scene, cat, islands), World (HUD, panel), IslandPanel, WorldMode (3D / classic switch)
  game/                   CoinExplorer (islands, coins, cat), CoinHUD, Bug Hunt (provider, Bug, HUD), settings, sfx
  site/                   Hero, About, Projects, Experience, Skills, Credentials,
                          CustomSections, Contact, Nav, Footer, Terminal, Reveal, Icons…
  admin/                  AdminApp (shell, login, settings), FieldEditor, schema
lib/
  content.ts              Read/write content.json
  auth.ts                 Password hashing and session cookie
  types.ts                Content model
data/
  content.json            Your content
public/                   Static files (for example a résumé PDF linked from the CMS)
```

## Customising the look

- Accent colour: the `pass` palette (mauve pink) in `tailwind.config.js`, alongside `mauve` and `periwinkle`
- 3D world colours: `KIND_COLOR`, the sky gradients and materials in `components/world/engine.ts`
- Neutrals: the `ink` palette in `tailwind.config.js`
- Shared component classes (`.card`, `.chip`, `.btn-primary`…): `app/globals.css`
