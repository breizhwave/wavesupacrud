# ⚡ Supacrud

An open-source admin/CRUD interface for [Supabase](https://supabase.com) —
think Laravel Nova or Backpack, but for Supabase, and **pure JavaScript static
files** you can host anywhere: GitHub Pages, Netlify, S3, a shared FTP host,
or an `/admin` folder next to an existing site.

Point it at your Supabase URL + anon key and get a full admin panel — table
browsing, create/edit/delete, search, sorting, and pagination — generated at
runtime from your database schema. UI styled after the
[TailAdmin](https://tailadmin.com) dashboard design (Tailwind CSS, dark mode
included).

## Quickstart

```sh
git clone <this repo> && cd supacrud
cp supacrud.config.example.js supacrud.config.js
# edit supacrud.config.js: set supabaseUrl + supabaseAnonKey
npx serve .        # or python3 -m http.server — any static server works
```

Then install the schema introspection function: open the Supabase dashboard →
SQL Editor, paste the contents of
[`supabase/supacrud_schema.sql`](supabase/supacrud_schema.sql) and run it.
(Older projects that still expose the PostgREST OpenAPI endpoint to the anon
key work without this, but newer projects restrict that endpoint.)

Sign in with a Supabase Auth user of your project. That's it — no build step,
no backend, no npm needed to deploy (just copy the files).

For the full walkthrough — GitHub OAuth login, redirect URLs, and granting
table access to a specific user with RLS — see [INIT.md](INIT.md).

## Security model

Supacrud runs entirely in the browser and only ever uses your project's
**anon key**. What an admin can see and change is decided by your
**Row Level Security policies** — exactly like any other Supabase client app.
Never put a `service_role` key in the config.

## Configuration

Everything is optional except the credentials. Per-table overrides mirror how
Nova/Backpack resources work, as plain objects:

```js
export default {
  supabaseUrl: 'https://xyz.supabase.co',
  supabaseAnonKey: '...',
  title: 'My Admin',
  pageSize: 25,
  hiddenTables: ['private_stuff'],
  tables: {
    posts: {
      label: 'Blog posts',
      listColumns: ['id', 'title', 'status', 'created_at'],
      hiddenColumns: ['internal_notes'],
      fields: { body: { widget: 'textarea' }, meta: { widget: 'json' } },
    },
  },
};
```

## Development

Node is dev tooling only (the shipped app never needs it):

```sh
npm install
npm run vendor      # bundle @supabase/supabase-js into vendor/ (committed)
npm run css:watch   # recompile Tailwind while developing
npm test            # vitest unit tests
npm run dev         # static server
```

See [ROADMAP.md](ROADMAP.md) for what's planned,
[CLAUDE.md](CLAUDE.md) for architecture notes and hard constraints, and
[DEPENDENCIES.md](DEPENDENCIES.md) for how dependencies are loaded (spoiler:
no CDN, no runtime npm — two committed artifacts).

## License

MIT
