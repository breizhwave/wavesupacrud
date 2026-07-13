# Roadmap

Direction for Supacrud after the v0.1 foundation. Order within a section
is rough priority; everything obeys the hard constraints in
[CLAUDE.md](CLAUDE.md) (pure JS, static files, anon key + RLS only,
no runtime dependencies beyond the vendored supabase-js).

## Shipped (v0.1)

- Schema-driven CRUD from runtime introspection (RPC + OpenAPI fallback)
- Supabase Auth: email/password + GitHub OAuth
- List views: pagination, sorting, global search, typed per-column
  filters, RLS-aware empty states
- Field widgets: text, textarea, number, boolean, datetime, enum, json
  (+ `registerWidget()` extension point)
- Per-table config overrides incl. date/datetime display formatting
- Zipped modular backups (roles / schema+policies / data)
- Glass UI theme (Tailwind, dev-time only), dark mode

## Next

- **Foreign-key lookup widgets.** Replace the raw FK text input with a
  searchable select that queries the referenced table and shows a human
  label column instead of the id (`fields.author_id.labelColumn:
  'name'`). List views render the related label (linked to the related
  row) instead of the bare key. The schema RPC already reports every
  FK's target table and column, so this is purely a widget/UI effort.
- **Date filter formatting.** The per-column filter for date/timestamp
  columns is currently a free-text input (`YYYY-MM-DD`, optional
  `>` / `>=` / `<` / `<=` prefix). Replace with a native date input plus
  a small operator dropdown (on / after / before / between), keeping the
  pure `buildColumnFilters()` contract and its tests.
- **Detail (read-only) view.** `#/tables/:table/view/:id` showing all
  columns, with related child rows (reverse FKs) listed underneath.

## Later

- **Supabase Storage fields** — file/image upload widgets bound to a
  bucket, with thumbnail display in list views.
- **Export per table** — CSV/JSON download of the current filtered list.
- **Restore/import** — replay a Supacrud backup zip (data first, schema
  diff warning), within what RLS permits.
- **Page-size selector & saved views** — persist per-table page size,
  sort, and filters in localStorage.
- **Multi-admin RLS pattern** — documented `profiles.is_admin` setup
  with copy-paste policies, replacing per-UUID policies (INIT.md §5).
- **Theming presets** — alternative token packs (solid/flat, high
  contrast) selectable in config; document custom theming.
- **Custom widget guide** — document `registerWidget()` with a worked
  example (e.g. a color picker or markdown editor).
- **Relation-aware forms** — inline creation of related rows from an FK
  widget ("+ new author" inside the post form).
- **i18n** — externalise UI strings once the surface stabilises.

## Non-goals

Server-side anything (the "hostable everywhere" promise), service_role
key usage in any form, framework rewrites, CDN dependencies. Features
that can't be built within those constraints get documented as
recipes (e.g. cron'd `supabase db dump` for exact backups) instead.
