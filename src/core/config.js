const defaults = {
  title: 'Supacrud',
  supabaseUrl: '',
  supabaseAnonKey: '',
  pageSize: 25,
  hiddenTables: [],
  tables: {},
  // OAuth providers to offer on the login screen (must be enabled in the
  // Supabase dashboard under Authentication → Providers), e.g. ['github'].
  oauthProviders: [],
};

/**
 * Loads the optional per-deployment `supacrud.config.js` from the project
 * root and merges it over the defaults. Missing config is not an error —
 * the setup screen handles that case.
 */
export async function loadConfig() {
  let user = {};
  try {
    const mod = await import('../../supacrud.config.js');
    user = mod.default ?? {};
    if (!mod.default) {
      console.warn('Supacrud: supacrud.config.js loaded but has no `export default { … }`.');
    }
  } catch (err) {
    // A 404 (no config yet) and a broken config both land here — tell them apart.
    console.warn(
      'Supacrud: could not load supacrud.config.js — either the file is missing ' +
        '(copy supacrud.config.example.js) or it has an error:',
      err,
    );
  }
  return { ...defaults, ...user };
}

/**
 * Per-table options with defaults applied.
 * @param {object} config app config
 * @param {string} name table name
 */
export function tableOptions(config, name) {
  return {
    label: humanize(name),
    hiddenColumns: [],
    listColumns: null,
    // { column: 'created_at', ascending: false } — initial list order;
    // clicking a header still overrides it for the session.
    defaultSort: null,
    fields: {},
    ...(config.tables?.[name] ?? {}),
  };
}

/** "blog_posts" → "Blog Posts" */
export function humanize(name) {
  return name.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
