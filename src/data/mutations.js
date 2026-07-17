import { primaryKey } from '../core/schema.js';

export async function insertRow(table, values) {
  const { getClient } = await import('../core/client.js');
  const { data, error } = await getClient()
    .from(table.name)
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, values) {
  const { getClient } = await import('../core/client.js');
  const { data, error } = await getClient()
    .from(table.name)
    .update(values)
    .eq(primaryKey(table), id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Values for inserting a copy of `row`: every column except primary
 * keys, which the database re-generates. Pure, unit-tested.
 */
export function duplicateValues(table, row) {
  const values = {};
  for (const column of table.columns) {
    if (column.isPrimaryKey) continue;
    if (column.name in row) values[column.name] = row[column.name];
  }
  return values;
}

export async function duplicateRow(table, row) {
  return insertRow(table, duplicateValues(table, row));
}

export async function deleteRow(table, id) {
  const { getClient } = await import('../core/client.js');
  const { error } = await getClient()
    .from(table.name)
    .delete()
    .eq(primaryKey(table), id);
  if (error) throw error;
}
