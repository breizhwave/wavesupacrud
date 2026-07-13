import { el } from './dom.js';

/**
 * @param {object} opts
 * @param {number} opts.page 1-based current page
 * @param {number} opts.pageSize
 * @param {number} opts.count total row count
 * @param {(page: number) => void} opts.onPage
 */
export function pagination({ page, pageSize, count, onPage }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);

  const windowStart = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = [];
  for (let p = windowStart; p <= Math.min(pages, windowStart + 4); p++) {
    numbers.push(
      el('button', {
        class: `flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm ${
          p === page
            ? 'bg-primary/90 text-white shadow-lg shadow-primary/25'
            : 'text-black hover:bg-white/50 dark:text-white dark:hover:bg-white/10'
        }`,
        'aria-current': p === page ? 'page' : false,
        onclick: () => p !== page && onPage(p),
      }, String(p)),
    );
  }

  return el('div', { class: 'flex flex-wrap items-center justify-between gap-4 border-t border-black/5 px-4 py-4 dark:border-white/10' },
    el('p', { class: 'text-sm' }, `Showing ${from}–${to} of ${count}`),
    el('nav', { class: 'flex items-center gap-1', 'aria-label': 'Pagination' },
      el('button', { class: 'sc-btn-ghost px-3 py-1.5', disabled: page <= 1, onclick: () => onPage(page - 1) }, 'Prev'),
      numbers,
      el('button', { class: 'sc-btn-ghost px-3 py-1.5', disabled: page >= pages, onclick: () => onPage(page + 1) }, 'Next'),
    ),
  );
}
