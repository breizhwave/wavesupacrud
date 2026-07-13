import { el } from '../ui/dom.js';

export function create(column, value) {
  const input = el('input', {
    type: 'checkbox',
    class: 'h-5 w-5 cursor-pointer rounded border-stroke accent-primary',
    checked: !!value,
  });
  const wrapper = el('label', { class: 'flex h-[46px] cursor-pointer items-center gap-3' },
    input,
    el('span', { class: 'text-sm' }, column.name),
  );
  return {
    el: wrapper,
    getValue: () => input.checked,
  };
}
