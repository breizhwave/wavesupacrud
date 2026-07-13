import { el } from '../ui/dom.js';

export function create(column, value) {
  const input = el('textarea', {
    rows: 4,
    class: 'sc-input',
    required: column.required,
  }, value ?? '');
  return {
    el: input,
    getValue: () => (input.value === '' ? null : input.value),
  };
}
