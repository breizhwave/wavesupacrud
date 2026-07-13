import { appStore } from '../core/store.js';
import { primaryKey } from '../core/schema.js';

/**
 * Client-side backup, split into modular files like `supabase db dump`:
 * roles / schema (incl. RLS policies) / data. Honest limitations, stated
 * in each file header: data covers what the signed-in user's RLS allows;
 * DDL is reconstructed from introspection (no length modifiers, no
 * triggers/views/grants); roles have attributes but never passwords.
 * For byte-exact backups use pg_dump / `supabase db dump`.
 */
export async function runBackup(onProgress = () => {}) {
  const { schema } = appStore.get();
  onProgress('Fetching database metadata…');
  const meta = await fetchBackupMeta();

  const rowsByTable = {};
  const errors = [];
  for (const table of schema.tables) {
    onProgress(`Downloading ${table.name}…`);
    try {
      rowsByTable[table.name] = await fetchAllRows(table);
    } catch (err) {
      // One unreadable table must not sink the rest of the backup.
      console.error(`Supacrud backup: failed to read ${table.name}`, err);
      errors.push(`${table.name}: ${err.message ?? err}`);
      rowsByTable[table.name] = [];
    }
  }

  let dataSql = generateDataSql(schema, rowsByTable);
  if (errors.length > 0) {
    dataSql = `-- WARNING: some tables could not be read:\n${errors.map((e) => `--   ${e}`).join('\n')}\n\n${dataSql}`;
  }

  const files = [
    { name: '1-roles.sql', text: generateRolesSql(meta) },
    { name: '2-schema.sql', text: generateSchemaSql(schema, meta) },
    { name: '3-data.sql', text: dataSql },
  ];
  const zipName = `supacrud-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  return { files, errors, zipName };
}

async function fetchBackupMeta() {
  const { getClient } = await import('../core/client.js');
  const { data, error } = await getClient().rpc('supacrud_backup_meta');
  if (error) {
    if (error.code === 'PGRST202') {
      throw new Error(
        'Backup needs the metadata function — run supabase/supacrud_backup.sql in the Supabase SQL editor, then retry.',
      );
    }
    throw new Error(`Backup failed: ${error.message}`);
  }
  return data;
}

export async function fetchAllRows(table, pageSize = 1000) {
  const { getClient } = await import('../core/client.js');
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    let query = getClient().from(table.name).select('*').range(from, from + pageSize - 1);
    // Stable pagination needs an order, but only a real PK is safe to use.
    if (table.primaryKey.length > 0) {
      query = query.order(primaryKey(table), { ascending: true });
    }
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

/* ---------- pure generators (unit-tested) ---------- */

export function generateRolesSql(meta) {
  const lines = [
    '-- Supacrud backup: roles',
    '-- Attributes only — Postgres never exposes passwords, and Supabase-',
    '-- managed roles (anon, authenticated, service_role, …) already exist',
    '-- on every Supabase project. Review before replaying anywhere.',
    '',
  ];
  for (const role of meta.roles ?? []) {
    const attrs = [
      role.login ? 'login' : 'nologin',
      role.superuser ? 'superuser' : null,
      role.createdb ? 'createdb' : null,
      role.createrole ? 'createrole' : null,
      role.connection_limit >= 0 ? `connection limit ${role.connection_limit}` : null,
    ].filter(Boolean).join(' ');
    lines.push(`create role ${quoteIdent(role.name)} with ${attrs}; -- may already exist`);
  }
  return lines.join('\n') + '\n';
}

export function generateSchemaSql(schema, meta) {
  const defaults = {};
  for (const d of meta.defaults ?? []) {
    (defaults[d.table] ??= {})[d.column] = d.expression;
  }

  const lines = [
    '-- Supacrud backup: schema + RLS policies (public schema)',
    '-- Reconstructed from introspection: no length modifiers, triggers,',
    '-- views, or grants. Use pg_dump / `supabase db dump` for exact DDL.',
    '',
  ];

  for (const e of meta.enums ?? []) {
    const values = (e.values ?? []).map(sqlString).join(', ');
    lines.push(`create type public.${quoteIdent(e.name)} as enum (${values});`);
  }
  if ((meta.enums ?? []).length > 0) lines.push('');

  for (const table of schema.tables) {
    const cols = table.columns.map((c) => {
      const parts = [`  ${quoteIdent(c.name)} ${c.format || 'text'}`];
      if (c.nullable === false) parts.push('not null');
      const dflt = defaults[table.name]?.[c.name];
      if (dflt) parts.push(`default ${dflt}`);
      return parts.join(' ');
    });
    if (table.primaryKey.length > 0) {
      cols.push(`  primary key (${table.primaryKey.map(quoteIdent).join(', ')})`);
    }
    lines.push(`create table public.${quoteIdent(table.name)} (`, cols.join(',\n'), ');', '');
  }

  // FKs after all tables so creation order never matters.
  for (const table of schema.tables) {
    for (const c of table.columns) {
      if (!c.references) continue;
      lines.push(
        `alter table public.${quoteIdent(table.name)} add constraint ${quoteIdent(`${table.name}_${c.name}_fkey`)} ` +
          `foreign key (${quoteIdent(c.name)}) references public.${quoteIdent(c.references.table)} (${quoteIdent(c.references.column)});`,
      );
    }
  }
  lines.push('');

  for (const table of schema.tables) {
    if (table.rlsEnabled) {
      lines.push(`alter table public.${quoteIdent(table.name)} enable row level security;`);
    }
  }
  lines.push('');

  for (const p of meta.policies ?? []) {
    const roles = (p.roles ?? []).map((r) => (r === 'public' ? 'public' : quoteIdent(r))).join(', ');
    let stmt = `create policy ${quoteIdent(p.name)} on public.${quoteIdent(p.table)}`;
    stmt += ` as ${p.permissive ? 'permissive' : 'restrictive'} for ${p.command}`;
    if (roles) stmt += ` to ${roles}`;
    if (p.using) stmt += ` using (${p.using})`;
    if (p.with_check) stmt += ` with check (${p.with_check})`;
    lines.push(stmt + ';');
  }

  return lines.join('\n') + '\n';
}

export function generateDataSql(schema, rowsByTable) {
  const lines = [
    '-- Supacrud backup: data',
    '-- Contains only rows the signed-in user could read under RLS at',
    `-- backup time (${new Date().toISOString()}).`,
    '',
  ];
  for (const table of schema.tables) {
    const rows = rowsByTable[table.name] ?? [];
    lines.push(`-- ${table.name}: ${rows.length} row(s)`);
    if (rows.length === 0) {
      lines.push('');
      continue;
    }
    const columns = table.columns.filter((c) => c.name in rows[0]);
    const colList = columns.map((c) => quoteIdent(c.name)).join(', ');
    for (const row of rows) {
      const values = columns.map((c) => sqlLiteral(row[c.name], c)).join(', ');
      lines.push(`insert into public.${quoteIdent(table.name)} (${colList}) values (${values});`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function sqlLiteral(value, column = {}) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'object') {
    const cast = column.format === 'json' ? '::json' : '::jsonb';
    return sqlString(JSON.stringify(value)) + cast;
  }
  return sqlString(String(value));
}

export function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function sqlString(text) {
  return `'${text.replace(/'/g, "''")}'`;
}
