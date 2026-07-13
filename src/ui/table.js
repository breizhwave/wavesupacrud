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
 */
export function dataTable({ columns, rows, sort = null, onSort = null, actions = null, empty = 'No rows found.' }) {
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
        el('tr', { class: 'hover:bg-gray-2 dark:hover:bg-meta-4/30' },
          columns.map((column) =>
            el('td', { class: 'border-b border-stroke px-4 py-3 dark:border-strokedark' },
              formatCell(row[column.name], column)),
          ),
          actions
            ? el('td', { class: 'border-b border-stroke px-4 py-3 dark:border-strokedark' },
                el('div', { class: 'flex justify-end gap-2' }, actions(row)))
            : null,
        ),
      );

  return el('div', { class: 'overflow-x-auto' },
    el('table', { class: 'w-full table-auto text-sm' },
      el('thead', {}, el('tr', { class: 'bg-gray-2 dark:bg-meta-4' }, headCells)),
      el('tbody', {}, bodyRows),
    ),
  );
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
