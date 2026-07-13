# Dependencies — what they are and how they load

Supacrud has a strict dependency policy (see [CLAUDE.md](CLAUDE.md)):
**the browser never downloads anything from a CDN or npm at runtime.**
Everything the app loads is a file committed to this repository.

A common misconception, addressed up front: `node_modules/` is **not**
created or used dynamically by the app. It only exists on a developer's
machine after `npm install`, it is gitignored, and deleting it changes
nothing about a deployed Supacrud. It's a *workshop*, not a *warehouse*:
tools used to produce two committed artifacts, then out of the picture.

## What the browser actually loads (runtime)

Everything below ships in the repo — a deploy is `cp -r` to any static host.

```
index.html
 ├─ styles/main.css              ← committed artifact (compiled by Tailwind at dev time)
 └─ src/main.js                  ← native ES module, no bundler
     ├─ src/**  (imports)        ← ~25 hand-written ESM files, loaded by the
     │                             browser's own module loader
     ├─ supacrud.config.js       ← optional dynamic import(); per-deployment
     │                             file, gitignored; 404 ⇒ setup screen
     └─ vendor/supabase-js.js    ← committed artifact (bundled by esbuild at
                                    dev time); dynamic import() inside
                                    initClient(), so it loads only after a
                                    valid config exists
```

Loading characteristics:

- **`src/**` modules** — plain `import` statements resolved by the browser.
  No transpilation; the code that runs is the code in the repo.
- **`vendor/supabase-js.js`** — the *only* third-party runtime code
  (@supabase/supabase-js v2 plus its transitive deps: auth-js,
  postgrest-js, realtime-js, storage-js, functions-js) flattened into one
  ~700 KB ESM file. Lazily imported in `src/core/client.js` so pure
  data-layer modules stay importable in tests without it.
- **`styles/main.css`** — the compiled Tailwind output (~20 KB minified),
  containing only the classes actually used in `index.html` and `src/**`.
- **`supacrud.config.js`** — dynamic `import()` wrapped in try/catch;
  absence or a syntax error is handled (setup screen + console warning).
- **No other network access** happens except calls to the configured
  Supabase project (`/auth/v1/*`, `/rest/v1/*`). No fonts, no analytics,
  no CDNs — the app works on an intranet or fully air-gapped against a
  self-hosted Supabase.

## Dev-time dependencies (npm, gitignored `node_modules/`)

Installed with `npm install`; needed only to *develop* Supacrud, never to
run or deploy it.

| Package | Role | Used by |
|---|---|---|
| `@supabase/supabase-js` | **Source** for the vendored bundle — never imported directly by app code | `npm run vendor` |
| `esbuild` | Flattens supabase-js + transitive deps into `vendor/supabase-js.js` (ESM, browser platform, es2022) | `npm run vendor` |
| `tailwindcss` | Compiles `styles/input.css` → `styles/main.css`, scanning `index.html` + `src/**/*.js` for used classes (TailAdmin tokens live in `tailwind.config.js`) | `npm run css:build` / `css:watch` |
| `vitest` | Unit tests for the pure modules (parsers, query builders) | `npm test` |
| `serve` | Convenience static server; any static server works | `npm run dev` |

## The two committed artifacts

Two files in the repo are *generated*, not hand-written. They are committed
precisely so that cloning ⇒ deployable, with no build step:

| Artifact | Source of truth | Regenerate with | When |
|---|---|---|---|
| `vendor/supabase-js.js` | `@supabase/supabase-js` in package.json | `npm run vendor` | Only when upgrading supabase-js |
| `styles/main.css` | `styles/input.css` + Tailwind classes in markup | `npm run css:build` | Whenever markup classes or input.css change |

Don't edit either by hand — changes will be overwritten on the next build.

### Upgrading supabase-js

```sh
npm update @supabase/supabase-js
npm run vendor
# smoke-test, then commit vendor/supabase-js.js together with package*.json
```

## Adding a new dependency (policy)

1. **Runtime dependency?** Think twice — the bar is high (see CLAUDE.md:
   no frameworks; small, vendorable libraries only). If accepted: add it
   as a devDependency, bundle it into `vendor/` with its own esbuild
   script line, commit the artifact, and dynamic-import it where needed.
2. **Dev tool?** Regular devDependency; make sure its output (if any) is
   either committed (artifact) or gitignored (cache), never half-tracked.
3. Never introduce a CDN `<script>`/`@import` — it would break the
   offline/air-gapped guarantee and add a supply-chain trust dependency.
