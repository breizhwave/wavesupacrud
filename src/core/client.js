let client = null;

/**
 * Creates the Supabase client from the deployment config. The vendored
 * bundle is imported lazily so pure data-layer modules stay testable
 * without it.
 */
export async function initClient({ supabaseUrl, supabaseAnonKey }) {
  const { createClient } = await import('../../vendor/supabase-js.js');
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { storageKey: 'supacrud-auth' },
  });
  return client;
}

export function getClient() {
  if (!client) throw new Error('Supabase client not initialised — call initClient() first.');
  return client;
}
