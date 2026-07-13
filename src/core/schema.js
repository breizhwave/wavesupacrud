import { appStore } from './store.js';

/**
 * Introspects the database schema. Preferred source is the
 * `supacrud_schema()` RPC (see supabase/supacrud_schema.sql); when that
 * function isn't installed we fall back to the PostgREST OpenAPI
 * description at `/rest/v1/` — which newer Supabase projects restrict
 * to service_role, hence the RPC.
 */
export async function loadSchema(config) {
  const fromRpc = await loadViaRpc(config);
  if (fromRpc) return fromRpc;
  return loadViaOpenApi(config);
}

async function loadViaRpc(config) {
  const { getClient } = await import('./client.js');
  const { data, error } = await getClient().rpc('supacrud_schema');
  if (error) {
    // PGRST202 = function does not exist → caller falls back to OpenAPI.
    if (error.code === 'PGRST202') return null;
    throw new Error(`Schema introspection failed: ${error.message}`);
  }
  return parseRpcSchema(data, config);
}

async function loadViaOpenApi(config) {
  const { supabaseUrl, supabaseAnonKey } = config;
  const session = appStore.get().session;
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: supabaseAnonKey,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      'Schema introspection failed: this Supabase project restricts the OpenAPI ' +
        'endpoint. Install the introspection function by running ' +
        'supabase/supacrud_schema.sql in the Supabase SQL editor, then reload.',
    );
  }
  if (!res.ok) {
    throw new Error(`Schema introspection failed (HTTP ${res.status}). Check the Supabase URL and anon key.`);
  }
  const spec = await res.json();
  return parseOpenApi(spec, config);
}

/**
 * Pure parser for the supacrud_schema() RPC payload — normalises it to the
 * same shape parseOpenApi() produces.
 */
export function parseRpcSchema(rpcTables, config = {}) {
  const hidden = new Set(config.hiddenTables ?? []);
  const tables = [];
  for (const t of rpcTables ?? []) {
    if (hidden.has(t.name)) continue;
    const columns = (t.columns ?? []).map((c) => {
      const format = normalizeFormat(c.format);
      return {
        name: c.name,
        type: jsonTypeOf(format),
        format,
        required: !c.is_nullable && !c.has_default,
        hasDefault: !!c.has_default,
        isPrimaryKey: !!c.is_pk,
        enumValues: c.enum_values ?? null,
        references: c.references ?? null,
      };
    });
    tables.push({
      name: t.name,
      columns,
      primaryKey: columns.filter((c) => c.isPrimaryKey).map((c) => c.name),
      rlsEnabled: t.rls_enabled ?? null,
      hasSelectPolicy: t.has_select_policy ?? null,
    });
  }
  tables.sort((a, b) => a.name.localeCompare(b.name));
  return { tables };
}

/** 'character varying(255)' → 'character varying' */
function normalizeFormat(format) {
  return (format ?? '').replace(/\(.+\)/, '').trim();
}

/** Maps a Postgres type name to the JSON type PostgREST would report. */
function jsonTypeOf(format) {
  if (['smallint', 'integer', 'bigint'].includes(format)) return 'integer';
  if (['numeric', 'decimal', 'real', 'double precision', 'money'].includes(format)) return 'number';
  if (format === 'boolean') return 'boolean';
  if (format.endsWith('[]')) return 'array';
  return 'string';
}

/**
 * Pure parser for a PostgREST OpenAPI (swagger 2.0) document.
 * @returns {{ tables: Array<{name: string, columns: object[], primaryKey: string[]}> }}
 */
export function parseOpenApi(spec, config = {}) {
  const hidden = new Set(config.hiddenTables ?? []);
  const tables = [];
  for (const [name, def] of Object.entries(spec.definitions ?? {})) {
    if (hidden.has(name)) continue;
    const required = new Set(def.required ?? []);
    const columns = Object.entries(def.properties ?? {}).map(([col, prop]) =>
      parseColumn(col, prop, required),
    );
    tables.push({
      name,
      columns,
      primaryKey: columns.filter((c) => c.isPrimaryKey).map((c) => c.name),
      // Unknown via OpenAPI — only the supacrud_schema() RPC reports these.
      rlsEnabled: null,
      hasSelectPolicy: null,
    });
  }
  tables.sort((a, b) => a.name.localeCompare(b.name));
  return { tables };
}

/**
 * PostgREST encodes PK/FK facts in the column description, e.g.
 * "Note:\nThis is a Primary Key.<pk/>" and
 * "Note:\nThis is a Foreign Key to `authors.id`.<fk .../>".
 */
export function parseColumn(name, prop, required) {
  const desc = prop.description ?? '';
  const fk = desc.match(/Foreign Key to `([^.`]+)\.([^`]+)`/);
  return {
    name,
    type: prop.type ?? 'string',
    format: prop.format ?? '',
    required: required.has(name) && prop.default === undefined,
    hasDefault: prop.default !== undefined,
    isPrimaryKey: desc.includes('<pk/>'),
    enumValues: prop.enum ?? null,
    references: fk ? { table: fk[1], column: fk[2] } : null,
  };
}

export function getTable(schema, name) {
  return schema.tables.find((t) => t.name === name);
}

export function primaryKey(table) {
  return table.primaryKey[0] ?? 'id';
}
