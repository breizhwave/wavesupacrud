import { el } from './dom.js';

let container = null;

function getContainer() {
  if (!container || !container.isConnected) {
    // Below the sticky header so toasts never cover the top-right controls.
    container = el('div', {
      class: 'fixed right-5 top-20 z-9999 flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-3',
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
  // Solid background on purpose — .sc-card's glass translucency is
  // unreadable when floating over arbitrary page content.
  const node = el('div', {
    class:
      `cursor-pointer rounded-xl border border-stroke border-l-4 bg-white px-4 py-3 text-sm ` +
      `text-black shadow-glass dark:border-strokedark dark:bg-boxdark dark:text-white ` +
      (ACCENT[type] ?? ACCENT.success),
    role: 'alert',
    onclick: () => node.remove(),
  }, message);
  getContainer().append(node);
  setTimeout(() => node.remove(), 4500);
}
