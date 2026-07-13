import { el } from '../ui/dom.js';

export function create(column, value) {
  const input = el('textarea', {
    rows: 6,
    class: 'sc-input font-mono text-sm',
    spellcheck: 'false',
  }, value === undefined || value === null ? '' : JSON.stringify(value, null, 2));
  return {
    el: input,
    getValue() {
      const text = input.value.trim();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`“${column.name}” is not valid JSON.`);
      }
    },
  };
}
