/**
 * Supacrud configuration.
 * Copy this file to `supacrud.config.js` and fill in your project details.
 *
 * SECURITY: only ever use the *anon* key here. It ships to every browser —
 * access control is enforced by Row Level Security policies on your
 * Supabase project. Never use the service_role key.
 */
export default {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-KEY',

  // Shown in the sidebar and on the login screen.
  title: 'Supacrud',

  // OAuth providers offered on the login screen, e.g. ['github'].
  // Enable each one in the Supabase dashboard under Authentication → Providers.
  oauthProviders: [],

  // Rows per page in list views.
  pageSize: 25,

  // Tables to hide from the admin entirely.
  hiddenTables: [],

  // Per-table overrides — every key is optional, tables not listed here
  // get sensible defaults derived from the schema.
  tables: {
    // posts: {
    //   label: 'Blog posts',
    //   listColumns: ['id', 'title', 'status', 'created_at'],
    //   hiddenColumns: ['internal_notes'],
    //   fields: {
    //     body: { widget: 'textarea', label: 'Content' },
    //     metadata: { widget: 'json' },
    //   },
    // },
  },
};
