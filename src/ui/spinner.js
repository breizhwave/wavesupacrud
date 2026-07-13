import { el } from './dom.js';

export function spinner() {
  return el('div', { class: 'flex items-center justify-center py-16', role: 'status', 'aria-label': 'Loading' },
    el('div', { class: 'h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent' }),
  );
}
