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

export async function fetchList(table, { page = 1, pageSize = 25, sort = null, search = '' } = {}) {
  const { getClient } = await import('../core/client.js');
  const { from, to } = buildRange(page, pageSize);
  let query = getClient()
    .from(table.name)
    .select('*', { count: 'exact' })
    .range(from, to);
  if (sort) query = query.order(sort.column, { ascending: sort.ascending });
  const orFilter = buildSearchFilter(table, search);
  if (orFilter) query = query.or(orFilter);
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
