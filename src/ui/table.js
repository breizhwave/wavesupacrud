import { el } from './dom.js';

/**
 * TailAdmin-styled data table.
 * @param {object} opts
 * @param {object[]} opts.columns schema columns to show
 * @param {object[]} opts.rows
 * @param {{column: string, ascending: boolean}|null} opts.sort
 * @param {(columnName: string) => void} [opts.onSort]
 * @param {(row: object) => Node[]} [opts.actions] per-row action buttons
 * @param {Node|string} [opts.empty] what to show when there are no rows
 * @param {{values: object, onFilter: (name: string|null, value: string, immediate: boolean) => void}} [opts.filters]
 *   per-column filter row; onFilter(null, …) means "clear all"
 */
export function dataTable({ columns, rows, sort = null, onSort = null, actions = null, empty = 'No rows found.', filters = null }) {
  const headCells = columns.map((column) => {
    const isSorted = sort?.column === column.name;
    const label = el('span', { class: 'inline-flex items-center gap-1' },
      column.name,
      isSorted ? el('span', { 'aria-hidden': 'true' }, sort.ascending ? '↑' : '↓') : null,
    );
    return el('th', { class: 'whitespace-nowrap px-4 py-4 text-left font-medium text-black dark:text-white' },
      onSort
        ? el('button', {
            class: 'hover:text-primary',
            'aria-sort': isSorted ? (sort.ascending ? 'ascending' : 'descending') : 'none',
            onclick: () => onSort(column.name),
          }, label)
        : label,
    );
  });
  if (actions) headCells.push(el('th', { class: 'px-4 py-4 text-right font-medium text-black dark:text-white' }, 'Actions'));

  const bodyRows = rows.length === 0
    ? [el('tr', {}, el('td', { class: 'px-4 py-10 text-center', colspan: headCells.length }, empty))]
    : rows.map((row) =>
        el('tr', { class: 'hover:bg-white/40 dark:hover:bg-white/[0.04]' },
          columns.map((column) =>
            el('td', { class: 'border-b border-black/5 px-4 py-3 dark:border-white/10' },
              formatCell(row[column.name], column)),
          ),
          actions
            ? el('td', { class: 'border-b border-black/5 px-4 py-3 dark:border-white/10' },
                el('div', { class: 'flex justify-end gap-2' }, actions(row)))
            : null,
        ),
      );

  const filterRow = filters
    ? el('tr', { class: 'border-b border-black/5 dark:border-white/10' },
        columns.map((column) =>
          el('th', { class: 'px-4 pb-3 pt-1 font-normal' }, filterControl(column, filters)),
        ),
        actions
          ? el('th', { class: 'px-4 pb-3 pt-1 text-right font-normal' },
              Object.keys(filters.values).length > 0
                ? el('button', {
                    class: 'text-xs font-medium text-danger hover:underline',
                    onclick: () => filters.onFilter(null, '', true),
                  }, '✕ Clear filters')
                : null)
          : null,
      )
    : null;

  return el('div', { class: 'overflow-x-auto rounded-t-2xl' },
    el('table', { class: 'w-full table-auto text-sm' },
      el('thead', {},
        el('tr', { class: 'bg-black/[0.03] dark:bg-white/[0.04]' }, headCells),
        filterRow,
      ),
      el('tbody', {}, bodyRows),
    ),
  );
}

const FILTER_INPUT = 'sc-input min-w-24 px-2 py-1.5 text-xs font-normal';

function filterControl(column, { values, onFilter }) {
  const current = values[column.name] ?? '';
  if (column.format.includes('json')) return '';
  if (column.type === 'boolean') {
    return el('select', {
      class: FILTER_INPUT,
      'data-filter': column.name,
      'aria-label': `Filter ${column.name}`,
      onchange: (e) => onFilter(column.name, e.target.value, true),
    },
      el('option', { value: '' }, 'any'),
      el('option', { value: 'true', selected: current === 'true' }, 'true'),
      el('option', { value: 'false', selected: current === 'false' }, 'false'),
    );
  }
  if (column.enumValues) {
    return el('select', {
      class: FILTER_INPUT,
      'data-filter': column.name,
      'aria-label': `Filter ${column.name}`,
      onchange: (e) => onFilter(column.name, e.target.value, true),
    },
      el('option', { value: '' }, 'all'),
      column.enumValues.map((v) => el('option', { value: v, selected: v === current }, v)),
    );
  }
  const numeric = column.type === 'integer' || column.type === 'number';
  const temporal = column.format.startsWith('timestamp') || column.format === 'date';
  return el('input', {
    type: 'search',
    class: FILTER_INPUT,
    'data-filter': column.name,
    value: current,
    placeholder: numeric ? '= 10, >5, <=9…' : temporal ? 'YYYY-MM-DD, >…' : 'Filter…',
    'aria-label': `Filter ${column.name}`,
    oninput: (e) => onFilter(column.name, e.target.value, false),
  });
}

function formatCell(value, column) {
  if (value === null || value === undefined) {
    return el('span', { class: 'text-bodydark2' }, '—');
  }
  if (column.type === 'boolean') {
    return el('span', {
      class: `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        value ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
      }`,
    }, String(value));
  }
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return el('span', { class: 'block max-w-xs truncate', title: text }, text);
}
