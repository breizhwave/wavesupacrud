# Supacrud — setup tutorial

Every step to get Supacrud running against a Supabase project, in the order
you actually do them. Examples use project ref `pzfnptbybosooctbhljt` —
replace with your own everywhere it appears.

## 1. Create the local config

```sh
cp supacrud.config.example.js supacrud.config.js
```

Edit `supacrud.config.js` and fill in your project's values (Supabase
dashboard → Settings → API):

```js
export default {
  supabaseUrl: 'https://pzfnptbybosooctbhljt.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi…',   // the ANON key — never service_role
  oauthProviders: ['github'],       // optional: OAuth buttons on login
  // …
};
```

> ⚠️ **Pitfall:** this is a JavaScript *object literal* — properties use
> `key: value,` (colon and comma), **not** `key = value;`. A syntax error
> here makes the app say "No configuration found" (check the browser
> console for the real error).

`supacrud.config.js` is gitignored — it never gets committed.

## 2. Serve the app

Any static server, started **from the project root** (the folder with
`index.html`):

- WebStorm / VS Code **Live Server**: open `index.html` → "Open with Live
  Server" (usually `http://127.0.0.1:5500`)
- or `npx serve .`, or `python3 -m http.server`

No build step. After changing the config, **hard-reload** the page
(Cmd+Shift+R) so the browser drops cached modules.

## 3. Install the SQL functions

Supacrud ships two `security definer` functions in [`supabase/`](supabase/).
Both are executable by signed-in (`authenticated`) users only, reveal
*structure* only (never table data), and are safe to re-run any time —
they are `create or replace`. Install each the same way:

1. Supabase dashboard → **SQL Editor**
2. Paste the full contents of the file
3. **Run**

### 3.1 Schema introspection — `supacrud_schema.sql` (required)

Newer Supabase projects restrict the PostgREST OpenAPI endpoint
(`GET /rest/v1/`) to the `service_role` key, so Supacrud can't discover
your tables with the anon key alone. Symptom when missing:

> `Schema introspection failed (HTTP 401)`

Install [`supabase/supacrud_schema.sql`](supabase/supacrud_schema.sql).
It returns tables, columns, primary/foreign keys, enum values, and the
per-table RLS facts behind the "🔒 Access denied by Row Level Security"
empty states.

### 3.2 Backup metadata — `supacrud_backup.sql` (required for backups)

Powers the **⬇ Backup** header button (see step 6). Symptom when missing —
a red toast on clicking Backup:

> `Backup needs the metadata function — run supabase/supacrud_backup.sql…`

Install [`supabase/supacrud_backup.sql`](supabase/supacrud_backup.sql).
It returns what PostgREST can't expose to the browser: role attributes
(never passwords), full RLS policy definitions, and column default
expressions.

## 4. GitHub login (optional)

Symptom when skipped: `{"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`

### 4a. Create a GitHub OAuth App

[github.com/settings/developers](https://github.com/settings/developers) →
**OAuth Apps** → **New OAuth App**:

- **Homepage URL:** your app's address, e.g. `http://127.0.0.1:5500`
- **Authorization callback URL** (must be exact):
  `https://pzfnptbybosooctbhljt.supabase.co/auth/v1/callback`

Register, copy the **Client ID**, generate a **Client Secret**.

### 4b. Enable the provider in Supabase

Dashboard → **Authentication** → **Sign In / Providers** → **GitHub** →
enable, paste Client ID + Client Secret, save.

### 4c. Allow the redirect back to your app

Dashboard → **Authentication** → **URL Configuration** → add your app's
address (e.g. `http://127.0.0.1:5500`) to **Redirect URLs**. Without this,
GitHub logs you in but Supabase redirects to the wrong page afterwards.

Finally set `oauthProviders: ['github']` in `supacrud.config.js`.

> Signing in with GitHub creates a normal *end user* in your project
> (Authentication → Users) — it is unrelated to your Supabase dashboard
> account, even if both use the same GitHub identity.

## 5. Grant table access with RLS

A fresh login can authenticate but still see **no tables or no rows** —
that's Row Level Security doing its job. Supacrud has no permissions of
its own; whatever the signed-in user may do, RLS decides.

### 5a. Find your user's UUID

Dashboard → **Authentication** → **Users** → click the GitHub user →
copy the **User UID** (a UUID like `d0d54caa-…`).

### 5b. Enable RLS and add policies (SQL Editor)

Example: everyone signed-in may read `posts`, but only your GitHub user
may create/edit/delete:

```sql
-- Always enable RLS on tables the admin manages.
alter table public.posts enable row level security;

-- Read for any signed-in user.
create policy "authenticated can read posts"
on public.posts
for select
to authenticated
using (true);

-- Full write access for ONE selected user (paste the UUID from step 5a).
create policy "admin user can write posts"
on public.posts
for insert
to authenticated
with check (auth.uid() = 'PASTE-USER-UUID');

create policy "admin user can update posts"
on public.posts
for update
to authenticated
using (auth.uid() = 'PASTE-USER-UUID')
with check (auth.uid() = 'PASTE-USER-UUID');

create policy "admin user can delete posts"
on public.posts
for delete
to authenticated
using (auth.uid() = 'PASTE-USER-UUID');
```

Repeat per table (or write a `for all` policy if reads should also be
limited to that user):

```sql
create policy "admin only, everything"
on public.customers
for all
to authenticated
using (auth.uid() = 'PASTE-USER-UUID')
with check (auth.uid() = 'PASTE-USER-UUID');
```

### Alternative: match by email instead of UUID

Useful when the same policy should follow the account across environments:

```sql
using ((auth.jwt() ->> 'email') = 'you@example.com')
```

### Tips

- Test policies in the SQL editor with
  `select auth.uid();` while impersonating a role (dashboard → SQL editor
  → role dropdown), or just reload Supacrud and watch what appears.
- A table with RLS enabled and **no policies** is invisible/empty for
  everyone except `service_role` — that's the safe default.
- For a real multi-admin setup, prefer a `profiles` table with an
  `is_admin` flag or a custom JWT claim over hardcoding UUIDs into
  policies.

## 6. Database backups

With `supacrud_backup.sql` installed (step 3.2), the **⬇ Backup** button
in the top-right header downloads a single `supacrud-backup-YYYY-MM-DD.zip`
containing three modular files, separated like `supabase db dump`:

1. `1-roles.sql` — role names + attributes (never passwords)
2. `2-schema.sql` — enums, tables, PKs/FKs, `enable row level security`,
   and full `create policy` statements
3. `3-data.sql` — `insert` statements for every table

(The zip is built in the browser by Supacrud's own dependency-free writer,
compressed with the native `CompressionStream` API.)

Honest limitations (it's a browser, not pg_dump): data contains only rows
**your RLS lets you read**; DDL is reconstructed from introspection (no
varchar lengths, triggers, views, or grants). For byte-exact dumps use
`supabase db dump` or `pg_dump`.

## 7. UI styling (Tailwind generation)

The glass UI depends on **Tailwind CSS only**, and Tailwind runs at
**dev time only** — the deployed app just loads the committed
`styles/main.css`. No CDN, no fonts, no icon packs, no Tailwind plugins,
no runtime JS for styling; TailAdmin was a design reference, never a
dependency. Icons are unicode glyphs and inline SVG.

### How a style change flows

```
tailwind.config.js        design tokens: colors, shadow-glass, z-index
styles/input.css          gradient mesh background + .sc-* component
                          classes (@layer components)
src/**/*.js + index.html  Tailwind utility classes in the markup
        │
        ▼   npm run css:build   (or css:watch while developing)
styles/main.css           compiled, minified, COMMITTED — this is the
                          only stylesheet the browser ever loads
```

The Tailwind CLI scans `index.html` and `src/**/*.js` (the `content`
globs in `tailwind.config.js`) and emits only the classes actually
used — which is why `main.css` stays ~25 KB.

### Working on styles

```sh
npm install            # once — brings the Tailwind CLI (dev tooling only)
npm run css:watch      # recompiles on every change while you work
npm run css:build      # minified build — run before committing
```

Rules that keep the system coherent:

- **Change tokens, not views.** Colors, shadows, and the shared
  component recipes (`.sc-card`, `.sc-btn`, `.sc-input`, `.sc-glassbar`,
  …) live in `tailwind.config.js` + `styles/input.css`. Restyling the
  whole app (as the glass theme did) shouldn't require touching views.
- **Commit `styles/main.css`** together with the source change — it is a
  build artifact kept in git so deployments need no build step. Never
  edit it by hand.
- **Dark mode** uses the `class` strategy: the header toggle stamps
  `dark` on `<html>` and persists to `localStorage` (`sc-theme`); an
  inline script in `index.html` re-applies it before first paint.
- **Don't add `backdrop-blur` to tall/scrollable content.** Chromium
  paints very tall blurred elements as solid white (GPU texture limit).
  Frosted blur belongs only on viewport-bounded chrome: the sidebar and
  sticky header (`.sc-glassbar`) and the modal overlay. Cards are
  translucent without blur for exactly this reason.
- Dynamically composed class names must appear somewhere as complete
  strings, or the compiler won't see them and they'll silently be
  missing from `main.css`.

## Troubleshooting recap

| Symptom | Cause | Fix |
|---|---|---|
| "No configuration found" | `supacrud.config.js` missing **or has a JS syntax error** | step 1, check browser console |
| `Schema introspection failed (HTTP 401)` | OpenAPI endpoint restricted to service_role | step 3.1 |
| "Backup needs the metadata function" toast | `supacrud_backup_meta()` not installed | step 3.2 |
| `Unsupported provider: provider is not enabled` | GitHub provider not enabled in Supabase | step 4b |
| Login works, wrong page after GitHub redirect | app URL missing from Redirect URLs | step 4c |
| "🔒 Access denied by Row Level Security" on a table | RLS enabled, no SELECT policy for signed-in users | step 5 |
| Tables visible but empty / missing tables | RLS policies hide rows from your user | step 5 |
| Style/class change has no visual effect | `styles/main.css` not recompiled | step 7, `npm run css:build` |
