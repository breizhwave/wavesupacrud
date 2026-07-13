import { el } from './dom.js';

/**
 * Confirmation dialog. Resolves true on confirm, false on cancel/escape.
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm' } = {}) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;

    function close(result) {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
      resolve(result);
    }
    function onKey(e) {
      if (e.key === 'Escape') close(false);
    }

    const confirmBtn = el('button', { class: 'sc-btn-danger', onclick: () => close(true) }, confirmLabel);
    const cancelBtn = el('button', { class: 'sc-btn-ghost', onclick: () => close(false) }, 'Cancel');

    const overlay = el('div', {
      class: 'fixed inset-0 z-9999 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm dark:bg-black/50',
      onclick: (e) => { if (e.target === overlay) close(false); },
    },
      el('div', { class: 'sc-card w-full max-w-md p-6 sm:p-8', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        el('h3', { class: 'mb-2 text-lg font-semibold text-black dark:text-white' }, title),
        message ? el('p', { class: 'mb-6' }, message) : null,
        el('div', { class: 'flex justify-end gap-3' }, cancelBtn, confirmBtn),
      ),
    );

    document.addEventListener('keydown', onKey);
    document.body.append(overlay);
    confirmBtn.focus();
  });
}
