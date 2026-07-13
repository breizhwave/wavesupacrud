import { el } from '../ui/dom.js';

export function create(column, value) {
  const select = el('select', { class: 'sc-input', required: column.required },
    column.required ? null : el('option', { value: '' }, '—'),
    (column.enumValues ?? []).map((v) =>
      el('option', { value: v, selected: v === value }, v),
    ),
  );
  return {
    el: select,
    getValue: () => (select.value === '' ? null : select.value),
  };
}
