import { el } from '../ui/dom.js';
import { appStore } from '../core/store.js';
import { getTable, primaryKey } from '../core/schema.js';
import { tableOptions } from '../core/config.js';
import { fetchList } from '../data/query.js';
import { deleteRow, duplicateRow, updateRow } from '../data/mutations.js';
import { attachTooltip } from '../ui/tooltip.js';
import { openDrawer } from '../ui/drawer.js';
import { widgetFor, inferWidget } from '../fields/registry.js';
import { buildFormView } from './form.js';
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
  const saved = loadListState(table);
  const state = {
    page: saved?.page ?? 1,
    pageSize: config.pageSize,
    sort: saved?.sort ?? initialSort(table, cfg),
    search: saved?.search ?? '',
    filters: saved?.filters ?? {},
  };

  const body = el('div', { class: 'sc-card' });

  /** Opens create/edit — routed page by default, slide-over when editIn: 'drawer'. */
  function openForm(row) {
    if (cfg.editIn !== 'drawer') {
      navigate(row
        ? `/tables/${table.name}/edit/${encodeURIComponent(row[pk])}`
        : `/tables/${table.name}/new`);
      return;
    }
    let close;
    const form = buildFormView({
      table, cfg, row,
      onSaved: () => { close(); refresh(); },
      onCancel: () => close(),
    });
    close = openDrawer({ title: `${row ? 'Edit' : 'New'} — ${cfg.label}`, content: form });
  }

  const INLINE_WIDGETS = new Set(['text', 'textarea', 'number', 'boolean', 'datetime', 'enum']);
  const inline = cfg.inlineEdit
    ? {
        canEdit: (column) =>
          !column.isPrimaryKey &&
          INLINE_WIDGETS.has(cfg.fields?.[column.name]?.widget ?? inferWidget(column)),
        createField: (column, value) => {
          const overrides = cfg.fields?.[column.name] ?? {};
          return widgetFor(column, overrides).create(column, value, overrides);
        },
        save: async (row, column, value) => {
          try {
            await updateRow(table, row[pk], { [column.name]: value });
            toast('Saved.');
            refresh();
          } catch (err) {
            toast(err.message ?? String(err), 'error');
          }
        },
      }
    : null;

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
    saveListState(table, state);
    body.replaceChildren(spinner());
    try {
      const { rows, count } = await fetchList(table, state);
      // A restored page can be past the end if data changed meanwhile.
      if (rows.length === 0 && count > 0 && state.page > 1) {
        state.page = 1;
        return refresh();
      }
      body.replaceChildren(
        dataTable({
          columns,
          rows,
          inline,
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
            actionButton('✎', 'Edit', 'sc-btn-ghost', () => openForm(row)),
            actionButton('⧉', 'Duplicate', 'sc-btn-ghost', async () => {
              try {
                await duplicateRow(table, row);
                toast('Row duplicated.');
                refresh();
              } catch (err) {
                toast(err.message, 'error');
              }
            }),
            actionButton('🗑', 'Delete', 'sc-btn-danger', async () => {
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
            }),
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
    value: state.search,
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
          onclick: () => openForm(null),
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

/**
 * Per-table list state (page, sort, search, filters) survives navigation
 * within the session, so editing a row and coming back keeps the view.
 */
function loadListState(table) {
  try {
    const raw = sessionStorage.getItem(`sc-list:${table.name}`);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.sort && !table.columns.some((c) => c.name === s.sort.column)) s.sort = null;
    return s;
  } catch {
    return null;
  }
}

function saveListState(table, state) {
  try {
    sessionStorage.setItem(`sc-list:${table.name}`, JSON.stringify({
      page: state.page,
      sort: state.sort,
      search: state.search,
      filters: state.filters,
    }));
  } catch { /* storage full/blocked — persistence is best-effort */ }
}

/** Compact icon button with an accessible label and hover tooltip. */
function actionButton(icon, label, cls, onclick) {
  const btn = el('button', { class: `${cls} px-2.5 py-1.5`, 'aria-label': label, onclick }, icon);
  attachTooltip(btn, label);
  return btn;
}

/** Validates cfg.defaultSort against the schema; ascending by default. */
function initialSort(table, cfg) {
  const ds = cfg.defaultSort;
  if (!ds?.column || !table.columns.some((c) => c.name === ds.column)) return null;
  return { column: ds.column, ascending: ds.ascending !== false };
}

function visibleColumns(table, cfg) {
  // Carry display-affecting field overrides onto the column objects the
  // table renders from (e.g. display: 'date'|'paragraph', and the widget
  // so richtext HTML gets stripped in cells).
  const withOverrides = (column) => {
    const field = cfg.fields?.[column.name];
    if (!field?.display && !field?.widget) return column;
    return { ...column, display: field.display, fieldWidget: field.widget };
  };
  if (cfg.listColumns) {
    return cfg.listColumns
      .map((name) => table.columns.find((c) => c.name === name))
      .filter(Boolean)
      .map(withOverrides);
  }
  return table.columns.filter((c) => !cfg.hiddenColumns?.includes(c.name)).map(withOverrides);
}
