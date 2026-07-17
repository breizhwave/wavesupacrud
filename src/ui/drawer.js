import { el } from './dom.js';

/**
 * Slide-over panel from the right (TailAdmin-style). Solid background —
 * forms need full readability. Closes on ✕, Escape, or overlay click.
 * @returns {() => void} close
 */
export function openDrawer({ title, content, onClose = () => {} }) {
  const previouslyFocused = document.activeElement;

  function close() {
    panel.classList.add('translate-x-full');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => root.remove(), 200);
    previouslyFocused?.focus?.();
    onClose();
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  const closeBtn = el('button', { class: 'sc-btn-ghost px-2.5 py-1.5', 'aria-label': 'Close', onclick: close }, '✕');
  const panel = el('div', {
    class:
      'fixed right-0 top-0 flex h-screen w-full max-w-2xl translate-x-full flex-col ' +
      'bg-white shadow-glass transition-transform duration-200 ease-out dark:bg-boxdark',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  },
    el('div', { class: 'flex items-center justify-between gap-4 border-b border-stroke px-6 py-4 dark:border-strokedark' },
      el('h2', { class: 'text-lg font-semibold text-black dark:text-white' }, title),
      closeBtn,
    ),
    el('div', { class: 'flex-1 overflow-y-auto p-6' }, content),
  );
  const root = el('div', { class: 'fixed inset-0 z-9999' },
    el('div', { class: 'absolute inset-0 bg-black/30 backdrop-blur-sm', onclick: close }),
    panel,
  );

  document.body.append(root);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => panel.classList.remove('translate-x-full'));
  closeBtn.focus();
  return close;
}
