import { el } from '../ui/dom.js';
import { appStore } from '../core/store.js';
import { getTable, primaryKey } from '../core/schema.js';
import { tableOptions } from '../core/config.js';
import { fetchRow } from '../data/query.js';
import { insertRow, updateRow } from '../data/mutations.js';
import { buildForm } from '../ui/form.js';
import { toast } from '../ui/toast.js';
import { navigate } from '../router.js';

/**
 * Create/edit form shared by the routed page and the drawer (per-table
 * `editIn: 'drawer'`). Editing when `row` is set, creating otherwise.
 */
export function buildFormView({ table, cfg, row = null, onSaved, onCancel }) {
  const isEdit = !!row;
  const { el: fieldsEl, getValues } = buildForm({ table, cfg, row });
  const save = el('button', { type: 'submit', class: 'sc-btn' }, isEdit ? 'Save changes' : 'Create');

  return el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      save.disabled = true;
      try {
        const values = getValues();
        if (isEdit) await updateRow(table, row[primaryKey(table)], values);
        else await insertRow(table, values);
        toast(isEdit ? 'Row updated.' : 'Row created.');
        onSaved();
      } catch (err) {
        toast(err.message ?? String(err), 'error');
        save.disabled = false;
      }
    },
  },
    fieldsEl,
    el('div', { class: 'mt-8 flex items-center gap-3' },
      save,
      el('button', { type: 'button', class: 'sc-btn-ghost', onclick: onCancel }, 'Cancel'),
    ),
  );
}

/** Routed page version: `/tables/:table/new` and `/tables/:table/edit/:id`. */
export async function renderForm(params) {
  const { config, schema } = appStore.get();
  const table = getTable(schema, params.table);
  if (!table) {
    return el('p', { class: 'text-danger' }, `Unknown table “${params.table}”.`);
  }
  const cfg = tableOptions(config, table.name);
  const isEdit = params.id !== undefined;
  const row = isEdit ? await fetchRow(table, params.id) : null;
  const backToList = () => navigate(`/tables/${table.name}`);

  return el('div', {},
    el('h1', { class: 'sc-page-title mb-6' }, `${isEdit ? 'Edit' : 'New'} — ${cfg.label}`),
    el('div', { class: 'sc-card p-6 sm:p-8' },
      buildFormView({ table, cfg, row, onSaved: backToList, onCancel: backToList }),
    ),
  );
}
