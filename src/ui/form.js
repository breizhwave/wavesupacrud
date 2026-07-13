import { el } from './dom.js';
import { widgetFor } from '../fields/registry.js';

/**
 * Builds an edit/create form from schema columns + per-table config.
 * @param {object} opts
 * @param {object} opts.table schema table
 * @param {object} opts.cfg tableOptions() result
 * @param {object|null} opts.row existing row when editing
 * @returns {{ el: HTMLElement, getValues: () => object }}
 */
export function buildForm({ table, cfg, row = null }) {
  const fields = [];
  const grid = el('div', { class: 'grid grid-cols-1 gap-6 md:grid-cols-2' });

  for (const column of table.columns) {
    if (cfg.hiddenColumns?.includes(column.name)) continue;

    // DB-managed primary keys: show read-only when editing, skip when creating.
    if (column.isPrimaryKey && column.hasDefault) {
      if (row) {
        grid.append(
          el('div', {},
            el('label', { class: 'sc-label' }, column.name),
            el('input', { class: 'sc-input opacity-60', value: String(row[column.name]), disabled: true }),
          ),
        );
      }
      continue;
    }

    const overrides = cfg.fields?.[column.name] ?? {};
    const widget = widgetFor(column, overrides);
    const field = widget.create(column, row ? row[column.name] : undefined, overrides);
    fields.push({ column, field });

    const wide = overrides.widget === 'json' || overrides.widget === 'textarea' ||
      overrides.widget === 'richtext' ||
      column.format === 'json' || column.format === 'jsonb' || column.format === 'text';
    grid.append(
      el('div', { class: wide ? 'md:col-span-2' : '' },
        el('label', { class: 'sc-label' },
          overrides.label ?? column.name,
          column.required ? el('span', { class: 'ml-1 text-danger', 'aria-hidden': 'true' }, '*') : null,
        ),
        field.el,
      ),
    );
  }

  return {
    el: grid,
    /** May throw (e.g. invalid JSON) — callers surface the message. */
    getValues() {
      const values = {};
      for (const { column, field } of fields) {
        values[column.name] = field.getValue();
      }
      return values;
    },
  };
}
