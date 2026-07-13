import { el } from '../ui/dom.js';

export function create(column, value) {
  const input = el('input', {
    type: 'text',
    class: 'sc-input',
    value: value ?? '',
    required: column.required,
  });
  return {
    el: input,
    getValue: () => (input.value === '' ? null : input.value),
  };
}
