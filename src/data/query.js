import { primaryKey } from '../core/schema.js';

/** 1-based page → PostgREST range bounds. Pure, unit-tested. */
export function buildRange(page, pageSize) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

/** Free-text columns worth matching a search term against. */
export function searchableColumns(table) {
  return table.columns
    .filter(
      (c) =>
        c.type === 'string' &&
        !c.enumValues &&
        c.format !== 'uuid' &&
        !c.format.includes('json'),
    )
    .map((c) => c.name);
}

/**
 * Builds a PostgREST `or=` filter matching the term against every
 * searchable column. Pure, unit-tested. Returns null when there is
 * nothing to search.
 */
export function buildSearchFilter(table, term) {
  const cleaned = String(term ?? '')
    .replace(/[,%()]/g, ' ') // strip PostgREST filter syntax
    .trim();
  if (!cleaned) return null;
  const columns = searchableColumns(table);
  if (columns.length === 0) return null;
  return columns.map((c) => `${c}.ilike.*${cleaned}*`).join(',');
}

/**
 * Turns per-column filter terms ({ columnName: term }) into PostgREST
 * filter triples, choosing the operator from the column type. Pure,
 * unit-tested. Unknown columns, blank terms, and unfilterable types
 * (json) are skipped.
 *
 * Term syntax: free text → ilike; enum → exact; boolean → is;
 * numbers and dates accept an optional `>`, `>=`, `<`, `<=`, `=` prefix.
 * A plain YYYY-MM-DD on a timestamp column matches that whole day.
 */
export function buildColumnFilters(table, filters = {}) {
  const out = [];
  for (const [name, raw] of Object.entries(filters)) {
    const column = table.columns.find((c) => c.name === name);
    const term = String(raw ?? '').trim();
    if (!column || !term) continue;
    out.push(...columnFilter(column, term));
  }
  return out;
}

function columnFilter(column, term) {
  const { name, format } = column;
  if (format.includes('json')) return [];
  if (column.type === 'boolean') {
    return term === 'true' || term === 'false' ? [{ column: name, op: 'is', value: term }] : [];
  }
  if (column.enumValues) return [{ column: name, op: 'eq', value: term }];
  if (column.type === 'integer' || column.type === 'number') {
    const m = term.match(/^(>=|<=|>|<|=)?\s*(-?\d+(?:\.\d+)?)$/);
    if (!m) return [];
    return [{ column: name, op: COMPARE_OPS[m[1] ?? '='], value: m[2] }];
  }
  if (format.startsWith('timestamp') || format === 'date') {
    const m = term.match(/^(>=|<=|>|<|=)?\s*(\d{4}-\d{2}-\d{2})$/);
    if (!m) return [];
    const [, prefix, day] = m;
    if (prefix && prefix !== '=') return [{ column: name, op: COMPARE_OPS[prefix], value: day }];
    if (format === 'date') return [{ column: name, op: 'eq', value: day }];
    // Equality on a timestamp column means "that calendar day".
    return [
      { column: name, op: 'gte', value: day },
      { column: name, op: 'lt', value: nextDay(day) },
    ];
  }
  if (format === 'uuid') return [{ column: name, op: 'eq', value: term }];
  const escaped = term.replace(/[%,()]/g, ' ').trim();
  return escaped ? [{ column: name, op: 'ilike', value: `%${escaped}%` }] : [];
}

const COMPARE_OPS = { '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte', '=': 'eq' };

function nextDay(isoDay) {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function fetchList(table, { page = 1, pageSize = 25, sort = null, search = '', filters = {} } = {}) {
  const { getClient } = await import('../core/client.js');
  const { from, to } = buildRange(page, pageSize);
  let query = getClient()
    .from(table.name)
    .select('*', { count: 'exact' })
    .range(from, to);
  if (sort) query = query.order(sort.column, { ascending: sort.ascending });
  const orFilter = buildSearchFilter(table, search);
  if (orFilter) query = query.or(orFilter);
  for (const f of buildColumnFilters(table, filters)) {
    query = query.filter(f.column, f.op, f.value);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0 };
}

export async function fetchRow(table, id) {
  const { getClient } = await import('../core/client.js');
  const { data, error } = await getClient()
    .from(table.name)
    .select('*')
    .eq(primaryKey(table), id)
    .single();
  if (error) throw error;
  return data;
}

export async function countRows(tableName) {
  const { getClient } = await import('../core/client.js');
  const { count, error } = await getClient()
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}
