import { el } from './dom.js';
import { appStore } from '../core/store.js';
import { signOut } from '../core/auth.js';
import { tableOptions } from '../core/config.js';
import { runBackup } from '../data/backup.js';
import { createZip } from '../data/zip.js';
import { toast } from './toast.js';

// Text color lives on the <ul> (inherited) so NAV_ACTIVE's color utilities
// can override it on the link without specificity fights.
const NAV_LINK =
  'group flex items-center gap-2.5 rounded-xl px-4 py-2 font-medium duration-200 ease-in-out hover:bg-white/50 dark:hover:bg-white/10';
const NAV_ACTIVE = 'bg-primary/15 text-primary dark:bg-white/10 dark:text-white';

/**
 * App shell: TailAdmin dark sidebar + sticky header + content outlet.
 * @returns {{ el: HTMLElement, outlet: HTMLElement }}
 */
export function renderLayout() {
  const { config, schema, session } = appStore.get();

  const outlet = el('main', { class: 'mx-auto w-full max-w-screen-2xl p-4 md:p-6 2xl:p-10' });

  const navLinks = schema.tables.map((table) =>
    el('li', {},
      el('a', {
        href: `#/tables/${table.name}`,
        'data-table': table.name,
        class: NAV_LINK,
      }, tableOptions(config, table.name).label),
    ),
  );

  const sidebar = el('aside', {
    id: 'sc-sidebar',
    class:
      'sc-glassbar absolute left-0 top-0 z-9999 flex h-screen w-72 -translate-x-full flex-col overflow-y-auto border-r duration-300 ease-linear lg:static lg:translate-x-0',
  },
    el('div', { class: 'flex items-center gap-2 px-6 py-5 lg:py-6' },
      el('a', { href: '#/', class: 'text-xl font-bold text-black dark:text-white' }, '⚡ ' + (config.title || 'Supacrud')),
    ),
    el('nav', { class: 'mt-4 px-4 lg:px-6' },
      el('h3', { class: 'mb-4 ml-4 text-sm font-semibold text-body/60 dark:text-bodydark2' }, 'TABLES'),
      el('ul', { class: 'mb-6 flex flex-col gap-1.5 text-body dark:text-bodydark' }, navLinks),
    ),
  );

  const burger = el('button', {
    class: 'sc-btn-ghost px-2.5 py-1.5 lg:hidden',
    'aria-label': 'Toggle navigation',
    onclick: () => {
      sidebar.classList.toggle('-translate-x-full');
      sidebar.classList.toggle('translate-x-0');
    },
  }, '☰');

  const header = el('header', {
    class: 'sc-glassbar sticky top-0 z-999 flex w-full items-center justify-between gap-4 border-b px-4 py-4 md:px-6',
  },
    burger,
    el('div', { class: 'ml-auto flex items-center gap-3 sm:gap-4' },
      backupButton(),
      themeToggle(),
      el('span', { class: 'hidden text-sm font-medium text-black dark:text-white sm:block' },
        session?.user?.email ?? ''),
      el('button', {
        class: 'sc-btn-ghost',
        onclick: async () => {
          try {
            await signOut();
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      }, 'Sign out'),
    ),
  );

  const root = el('div', { class: 'flex h-screen overflow-hidden' },
    sidebar,
    el('div', { class: 'relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden' }, header, outlet),
  );

  function updateActive() {
    const path = location.hash.replace(/^#/, '') || '/';
    for (const a of sidebar.querySelectorAll('a[data-table]')) {
      const active = path.startsWith(`/tables/${a.dataset.table}`);
      for (const token of NAV_ACTIVE.split(' ')) a.classList.toggle(token, active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    // close mobile drawer after navigating
    if (!matchMedia('(min-width: 1024px)').matches) {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
    }
  }
  document.addEventListener('sc:navigated', updateActive);
  updateActive();

  return { el: root, outlet };
}

/**
 * Downloads a full backup as one zip holding three modular .sql files:
 * roles / schema+policies / data (data limited to what RLS lets this
 * user read). Needs supabase/supacrud_backup.sql installed.
 */
function backupButton() {
  const label = el('span', { class: 'hidden sm:inline' }, 'Backup');
  const btn = el('button', {
    class: 'sc-btn-ghost',
    'aria-label': 'Download database backup',
    onclick: async () => {
      btn.disabled = true;
      label.textContent = 'Backing up…';
      try {
        const { files, errors, zipName } = await runBackup((step) => { label.textContent = step; });
        label.textContent = 'Zipping…';
        const bytes = await createZip(files);
        downloadBlob(zipName, new Blob([bytes], { type: 'application/zip' }));
        if (errors.length > 0) {
          toast(`Backup done with ${errors.length} unreadable table(s) — see the header of 3-data.sql.`, 'warning');
        } else {
          toast(`Backup complete — ${zipName} downloaded.`);
        }
      } catch (err) {
        console.error('Supacrud backup failed:', err);
        toast(err.message ?? String(err), 'error');
      } finally {
        btn.disabled = false;
        label.textContent = 'Backup';
      }
    },
  }, '⬇', label);
  return btn;
}

function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function themeToggle() {
  const isDark = () => document.documentElement.classList.contains('dark');
  const btn = el('button', {
    class: 'sc-btn-ghost px-3',
    'aria-label': 'Toggle dark mode',
    onclick: () => {
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('sc-theme', isDark() ? 'dark' : 'light');
      btn.textContent = isDark() ? '☀' : '☾';
    },
  }, isDark() ? '☀' : '☾');
  return btn;
}
