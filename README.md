# Habiba Akter: QA Engineer Portfolio

A personal portfolio for a Software Quality Assurance engineer. It comes with a built-in CMS admin panel, so every word on the site can be edited, added to or hidden without touching code.

The design follows a **test-runner / GitHub** look: a live "release check" terminal in the hero, `*.spec.ts` section labels, PASS badges, coverage checklists and a green-for-passing accent. A recruiter can tell the role and the seniority within the first few seconds.

## Features

**Public site** (`/`)
- **Hero** with a strong tagline, an availability badge, CTAs and an animated test-suite terminal
- **Key stats** strip showing years in QA, products shipped, test layers and domains
- **About** with a QA lifecycle strip, highlight cards and soft skills
- **Case studies**: 3 featured projects, each laid out as *Risk → My approach → Coverage*, plus a grid of other products and automation labs
- **Experience** timeline with the current role highlighted
- **Toolchain** with skill groups and proficiency meters
- **Education & training**
- **Custom sections** that you create from the CMS (certifications, awards and so on)
- **Contact** card with a copy-email button
- **Two mini-games**, started from the floating **"Play while you browse"** launcher:
  - **Island Quest**: every section becomes an island on an animated ocean. Visitors walk a small QA bot (arrow keys / WASD / on-screen pad, Shift to sprint) or sail between islands, collect coins and earn a bonus for each island they clear. The panel shows coins, islands cleared and a clickable island map, and finishing every island brings up a "Voyage complete" screen.
  - **Bug Hunt**: 1 to 18 bugs (set in the admin) hide across the sections. Visitors squash them against the clock with hints, sound effects, a QA rank and a best time.
  - Progress survives a refresh, and both games can be configured or switched off in **Admin → Mini-games**.
- Cursor spotlight glow on cards
- Dark mode by default plus a light mode toggle, fully responsive, subtle scroll reveals and hover effects, and respect for `prefers-reduced-motion`

**CMS admin** (`/admin`)
- Password-protected dashboard with a sidebar for every section
- Edit any field, and add, delete, duplicate or reorder items in every list
- Tag inputs, multi-line lists, toggles and nested lists (for example, tools inside skill groups)
- Mark projects as **featured**, and show or hide whole sections
- **Mini-games** panel: switch each game on or off, set the bug count with −/+ (1–18), and set coins per island and the island bonus
- Create **new custom sections**, which appear on the site and in the navigation automatically
- Unsaved-changes indicator, **Ctrl/Cmd + S** to save, and a Discard button
- Change the password, and export or import all content as JSON

## Tech stack

- Next.js 16 (App Router) and React 19
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
  game/                   GameLauncher, Island Quest (world, bot, HUD), Bug Hunt (provider, Bug, HUD), shared sfx
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

- Accent colour: the `pass` palette in `tailwind.config.js`
- Neutrals: the `ink` palette in `tailwind.config.js`
- Shared component classes (`.card`, `.chip`, `.btn-primary`…): `app/globals.css`
