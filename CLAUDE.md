# CLAUDE.md

This file guides Claude Code (claude.ai/code) when working in this repository.

## Project: Supacrud

Supacrud is an open-source admin/CRUD interface for Supabase — think Laravel Nova
or Backpack, but for Supabase projects. Users point it at their Supabase URL +
anon key and get a full admin panel: browse tables, create/edit/delete rows,
manage relations, filter, search, and paginate — driven by the database schema
itself, with optional per-table configuration.

## Hard constraints (never violate these)

1. **Pure JavaScript, client-side only.** No server runtime, no PHP/Node backend,
   no server-side rendering. The entire app is static files (HTML/CSS/JS) that
   talk directly to Supabase via `@supabase/supabase-js`. It must be deployable
   by copying files to any static host: GitHub Pages, Netlify, S3, an FTP shared
   host, or a `/admin` folder next to an existing site.
2. **No mandatory build step.** The app must run by opening `index.html` from a
   static server. Use native ES modules (`<script type="module">`) and load
   dependencies as ESM (vendored into `vendor/` — no CDN dependency at runtime,
   so it works offline/air-gapped). A bundler may be added later as an *optional*
   optimization, never as a requirement to develop or deploy.
3. **No framework lock-in.** Vanilla JS (ES2022+) and web platform APIs. Small
   focused libraries are acceptable if vendorable as a single ESM file; React/
   Vue/Angular/Svelte are not.
4. **Secrets stay client-safe.** Only the Supabase URL and **anon key** are ever
   configured. Never accept, store, or document use of the `service_role` key —
   security is enforced by Postgres RLS on the user's Supabase project, and the
   docs must make that explicit. Auth is Supabase Auth (the admin logs in; RLS
   policies decide what they can do).
5. **No telemetry, no external calls** other than the user's own Supabase project.

## Architecture

- **Schema-driven UI.** Table and column metadata is introspected at runtime
  (via a `pg_meta`-style RPC/SQL function the user installs, or the PostgREST
  OpenAPI description at `/rest/v1/` as fallback). CRUD screens are generated
  from that metadata; nothing is hardcoded per table.
- **Config over code.** An optional `supacrud.config.js` lets users override
  labels, hide tables/columns, choose field widgets, define relations, and set
  list-view columns — mirroring how Nova/Backpack resources work, but as plain
  JS objects, not classes.
- **Layered modules** (planned layout):
  ```
  index.html
  supacrud.config.example.js
  tailwind.config.js      # TailAdmin design tokens (colors, shadows, z-index)
  src/
    main.js            # bootstrap: load config, init client, mount router
    core/              # supabase client, schema introspection, auth/session
    data/              # query building: filters, sorting, pagination, mutations
    ui/                # reusable components (table, form, modal, toast) — vanilla JS
    fields/            # field widgets: text, number, boolean, date, enum, fk, json, file
    views/             # screens: login, dashboard, list, create, edit, detail
    router.js          # hash-based router (works on any static host, no rewrites)
  styles/              # input.css (Tailwind source) + main.css (compiled, committed)
  vendor/              # vendored ESM deps (@supabase/supabase-js, etc.)
  tests/
  ```
- **Hash-based routing** (`#/tables/posts/edit/42`) — no server rewrite rules,
  keeps the "hostable everywhere" promise.
- **UI components are plain functions/classes returning DOM nodes** (or `<template>`
  clones). No virtual DOM. Keep components small and composable; state lives in
  small observable stores in `core/`, not in the DOM.

## Conventions

- ES modules everywhere; one concern per file; named exports (default export only
  for view entry points).
- JSDoc type annotations on public functions (we get type checking via
  `tsc --checkJs` without a TS build step).
- Styling is Tailwind CSS following the **TailAdmin** dashboard design language
  (its palette, shadows, and layout patterns live in `tailwind.config.js`).
  Tailwind runs at **dev time only**: `npm run css:build` compiles
  `styles/input.css` → `styles/main.css`, and `main.css` is **committed**, so
  deploying still requires no build. Shared component classes (`.sc-card`,
  `.sc-btn`, `.sc-input`, …) are defined via `@layer components` in `input.css`;
  dark mode uses the `class` strategy (toggle persists in `localStorage`).
- Errors from Supabase are surfaced to the user (toast + inline), never swallowed.
- Every data-layer function is unit-testable without a live Supabase instance:
  keep query building pure, isolate the client behind `core/client.js`.
- Accessibility is not optional: semantic HTML, keyboard navigation, focus
  management in modals, labels on all form fields.

## Development

- Tests: Vitest (dev dependency only — remember, no build step for the app itself).
  Run with `npm test`.
- `npm run css:watch` recompiles Tailwind while developing; `npm run css:build`
  produces the minified `styles/main.css` to commit.
- `npm run vendor` re-bundles `@supabase/supabase-js` into `vendor/supabase-js.js`
  (esbuild, one-off — the vendored file is committed).
- Local dev: any static server, e.g. `npx serve .` or `python3 -m http.server`.
- A local Supabase instance (`supabase start`) with a seed schema in
  `supabase/seed.sql` is the integration-test target.
- Node/npm are **development tooling only** (tests, linting); the shipped artifact
  never requires them.

## Roadmap anchors (build in this order)

1. Bootstrap: config loading, Supabase client, auth screen, session handling.
2. Schema introspection + table list navigation.
3. List view: pagination, sorting, column type rendering.
4. Create/edit forms with core field widgets (text, number, boolean, date, enum).
5. Delete with confirmation; filters and search.
6. Foreign-key widgets (select with lookup), relation display.
7. JSON editor, Supabase Storage file/image fields.
8. Config overrides (`supacrud.config.js`), theming, README + docs.
