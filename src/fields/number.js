import { el } from '../ui/dom.js';

export function create(column, value) {
  const input = el('input', {
    type: 'number',
    step: column.type === 'integer' ? '1' : 'any',
    class: 'sc-input',
    value: value ?? '',
    required: column.required,
  });
  return {
    el: input,
    getValue: () => (input.value === '' ? null : Number(input.value)),
  };
}
