import { el } from './dom.js';

let container = null;

function getContainer() {
  if (!container || !container.isConnected) {
    container = el('div', {
      class: 'fixed right-5 top-5 z-9999 flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-3',
      'aria-live': 'polite',
    });
    document.body.append(container);
  }
  return container;
}

const ACCENT = { success: 'border-l-success', error: 'border-l-danger', warning: 'border-l-warning' };

/**
 * @param {string} message
 * @param {'success'|'error'|'warning'} type
 */
export function toast(message, type = 'success') {
  const node = el('div', {
    class: `sc-card cursor-pointer border-l-4 px-4 py-3 text-sm text-black dark:text-white ${ACCENT[type] ?? ACCENT.success}`,
    role: 'alert',
    onclick: () => node.remove(),
  }, message);
  getContainer().append(node);
  setTimeout(() => node.remove(), 4500);
}
