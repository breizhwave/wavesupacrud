import { el } from '../ui/dom.js';

export function create(column, value) {
  const dateOnly = column.format === 'date';
  const input = el('input', {
    type: dateOnly ? 'date' : 'datetime-local',
    class: 'sc-input',
    value: toInputValue(value, dateOnly),
    required: column.required,
  });
  return {
    el: input,
    getValue() {
      if (input.value === '') return null;
      return dateOnly ? input.value : new Date(input.value).toISOString();
    },
  };
}

function toInputValue(value, dateOnly) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return dateOnly ? date : `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
