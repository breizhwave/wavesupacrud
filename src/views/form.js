import { el } from '../ui/dom.js';
import { appStore } from '../core/store.js';
import { getTable } from '../core/schema.js';
import { tableOptions } from '../core/config.js';
import { fetchRow } from '../data/query.js';
import { insertRow, updateRow } from '../data/mutations.js';
import { buildForm } from '../ui/form.js';
import { toast } from '../ui/toast.js';
import { navigate } from '../router.js';

/** Create (`/tables/x/new`) and edit (`/tables/x/edit/:id`) screen. */
export async function renderForm(params) {
  const { config, schema } = appStore.get();
  const table = getTable(schema, params.table);
  if (!table) {
    return el('p', { class: 'text-danger' }, `Unknown table “${params.table}”.`);
  }
  const cfg = tableOptions(config, table.name);
  const isEdit = params.id !== undefined;
  const row = isEdit ? await fetchRow(table, params.id) : null;

  const { el: fieldsEl, getValues } = buildForm({ table, cfg, row });
  const save = el('button', { type: 'submit', class: 'sc-btn' }, isEdit ? 'Save changes' : 'Create');

  const form = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      save.disabled = true;
      try {
        const values = getValues();
        if (isEdit) await updateRow(table, params.id, values);
        else await insertRow(table, values);
        toast(isEdit ? 'Row updated.' : 'Row created.');
        navigate(`/tables/${table.name}`);
      } catch (err) {
        toast(err.message ?? String(err), 'error');
        save.disabled = false;
      }
    },
  },
    fieldsEl,
    el('div', { class: 'mt-8 flex items-center gap-3' },
      save,
      el('button', {
        type: 'button',
        class: 'sc-btn-ghost',
        onclick: () => navigate(`/tables/${table.name}`),
      }, 'Cancel'),
    ),
  );

  return el('div', {},
    el('h1', { class: 'sc-page-title mb-6' },
      `${isEdit ? 'Edit' : 'New'} — ${cfg.label}`),
    el('div', { class: 'sc-card p-6 sm:p-8' }, form),
  );
}
