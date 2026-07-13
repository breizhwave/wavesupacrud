import { el } from '../ui/dom.js';
import { appStore } from '../core/store.js';
import { tableOptions } from '../core/config.js';
import { countRows } from '../data/query.js';

/** Overview: one card per table with its row count. */
export async function renderDashboard() {
  const { config, schema } = appStore.get();

  const counts = await Promise.allSettled(
    schema.tables.map((t) => countRows(t.name)),
  );

  const cards = schema.tables.map((table, i) => {
    const result = counts[i];
    const count = result.status === 'fulfilled' ? String(result.value) : '—';
    return el('a', {
      href: `#/tables/${table.name}`,
      class: 'sc-card block p-6 transition hover:border-primary dark:hover:border-primary',
    },
      el('p', { class: 'text-3xl font-bold text-black dark:text-white' }, count),
      el('p', { class: 'mt-1 text-sm font-medium' }, tableOptions(config, table.name).label),
      result.status === 'rejected'
        ? el('p', { class: 'mt-1 text-xs text-danger' }, 'count unavailable')
        : null,
      table.rlsEnabled && table.hasSelectPolicy === false
        ? el('p', { class: 'mt-2 inline-flex rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning' },
            '🔒 RLS: no read policy')
        : null,
    );
  });

  return el('div', {},
    el('h1', { class: 'sc-page-title mb-6' }, 'Dashboard'),
    schema.tables.length === 0
      ? el('p', {}, 'No tables visible. Check your RLS policies and exposed schema.')
      : el('div', { class: 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4' }, cards),
  );
}
