import { el } from '../ui/dom.js';
import { appStore } from '../core/store.js';
import { getTable, primaryKey } from '../core/schema.js';
import { tableOptions } from '../core/config.js';
import { fetchList } from '../data/query.js';
import { deleteRow } from '../data/mutations.js';
import { dataTable } from '../ui/table.js';
import { pagination } from '../ui/pagination.js';
import { spinner } from '../ui/spinner.js';
import { toast } from '../ui/toast.js';
import { confirmDialog } from '../ui/modal.js';
import { navigate } from '../router.js';

export async function renderList(params) {
  const { config, schema } = appStore.get();
  const table = getTable(schema, params.table);
  if (!table) {
    return el('p', { class: 'text-danger' }, `Unknown table “${params.table}”.`);
  }
  const cfg = tableOptions(config, table.name);
  const pk = primaryKey(table);
  const columns = visibleColumns(table, cfg);
  const state = { page: 1, pageSize: config.pageSize, sort: initialSort(table, cfg), search: '', filters: {} };

  const body = el('div', { class: 'sc-card' });

  let filterTimer;
  let focusedFilter = null;

  function onFilter(name, value, immediate) {
    if (name === null) state.filters = {};
    else if (value === '') delete state.filters[name];
    else state.filters[name] = value;
    state.page = 1;
    focusedFilter = immediate ? null : name;
    clearTimeout(filterTimer);
    if (immediate) refresh();
    else filterTimer = setTimeout(refresh, 300);
  }

  // Refreshing replaces the table DOM; put the caret back in the filter
  // input the user was typing in.
  function restoreFilterFocus() {
    if (!focusedFilter) return;
    const input = body.querySelector(`[data-filter="${CSS.escape(focusedFilter)}"]`);
    if (!input) return;
    input.focus();
    const end = input.value.length;
    try { input.setSelectionRange(end, end); } catch { /* not a text input */ }
  }

  async function refresh() {
    body.replaceChildren(spinner());
    try {
      const { rows, count } = await fetchList(table, state);
      body.replaceChildren(
        dataTable({
          columns,
          rows,
          empty: emptyMessage(table, state.search !== '' || Object.keys(state.filters).length > 0),
          filters: { values: state.filters, onFilter },
          sort: state.sort,
          onSort(column) {
            state.sort =
              state.sort?.column === column
                ? { column, ascending: !state.sort.ascending }
                : { column, ascending: true };
            state.page = 1;
            refresh();
          },
          actions: (row) => [
            el('button', {
              class: 'sc-btn-ghost px-3 py-1',
              onclick: () => navigate(`/tables/${table.name}/edit/${encodeURIComponent(row[pk])}`),
            }, 'Edit'),
            el('button', {
              class: 'sc-btn-danger px-3 py-1',
              onclick: async () => {
                const ok = await confirmDialog({
                  title: `Delete row ${row[pk]}?`,
                  message: 'This cannot be undone.',
                  confirmLabel: 'Delete',
                });
                if (!ok) return;
                try {
                  await deleteRow(table, row[pk]);
                  toast('Row deleted.');
                  refresh();
                } catch (err) {
                  toast(err.message, 'error');
                }
              },
            }, 'Delete'),
          ],
        }),
        pagination({
          page: state.page,
          pageSize: state.pageSize,
          count,
          onPage(p) {
            state.page = p;
            refresh();
          },
        }),
      );
      restoreFilterFocus();
    } catch (err) {
      body.replaceChildren(
        el('p', { class: 'p-6 text-danger' }, err.message ?? String(err)),
      );
    }
  }

  let searchTimer;
  const search = el('input', {
    type: 'search',
    class: 'sc-input max-w-xs',
    placeholder: 'Search…',
    'aria-label': `Search ${cfg.label}`,
    oninput: (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value;
        state.page = 1;
        refresh();
      }, 300);
    },
  });

  refresh();

  return el('div', {},
    el('div', { class: 'mb-6 flex flex-wrap items-center justify-between gap-4' },
      el('h1', { class: 'sc-page-title' }, cfg.label),
      el('div', { class: 'flex items-center gap-3' },
        search,
        el('button', {
          class: 'sc-btn',
          onclick: () => navigate(`/tables/${table.name}/new`),
        }, '+ Add row'),
      ),
    ),
    body,
  );
}

/**
 * Zero rows is ambiguous: the table may be empty or RLS may be filtering.
 * Say exactly which one whenever the schema RPC lets us prove it.
 */
function emptyMessage(table, searching) {
  if (table.rlsEnabled && table.hasSelectPolicy === false) {
    return el('span', { class: 'font-medium text-warning' },
      '🔒 Access denied by Row Level Security: RLS is enabled on this table and no SELECT policy covers signed-in users, so every read returns zero rows. Add a policy (see INIT.md, step 5).');
  }
  if (searching) return 'No rows match your search or filters.';
  if (table.rlsEnabled) {
    return 'No rows found — the table may be empty, or its RLS policies may hide rows from your user (see INIT.md, step 5).';
  }
  return 'No rows found.';
}

/** Validates cfg.defaultSort against the schema; ascending by default. */
function initialSort(table, cfg) {
  const ds = cfg.defaultSort;
  if (!ds?.column || !table.columns.some((c) => c.name === ds.column)) return null;
  return { column: ds.column, ascending: ds.ascending !== false };
}

function visibleColumns(table, cfg) {
  // Carry display-affecting field overrides onto the column objects the
  // table renders from (e.g. fields.created_at.display: 'date').
  const withOverrides = (column) => {
    const display = cfg.fields?.[column.name]?.display;
    return display ? { ...column, display } : column;
  };
  if (cfg.listColumns) {
    return cfg.listColumns
      .map((name) => table.columns.find((c) => c.name === name))
      .filter(Boolean)
      .map(withOverrides);
  }
  return table.columns.filter((c) => !cfg.hiddenColumns?.includes(c.name)).map(withOverrides);
}
