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

export async function deleteRow(table, id) {
  const { getClient } = await import('../core/client.js');
  const { error } = await getClient()
    .from(table.name)
    .delete()
    .eq(primaryKey(table), id);
  if (error) throw error;
}
