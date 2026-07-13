import { el } from './dom.js';
import { appStore } from '../core/store.js';
import { signOut } from '../core/auth.js';
import { tableOptions } from '../core/config.js';
import { toast } from './toast.js';

const NAV_LINK =
  'group flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4';
const NAV_ACTIVE = 'bg-graydark dark:bg-meta-4';

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
      'absolute left-0 top-0 z-9999 flex h-screen w-72 -translate-x-full flex-col overflow-y-auto bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0',
  },
    el('div', { class: 'flex items-center gap-2 px-6 py-5 lg:py-6' },
      el('a', { href: '#/', class: 'text-xl font-bold text-white' }, '⚡ ' + (config.title || 'Supacrud')),
    ),
    el('nav', { class: 'mt-4 px-4 lg:px-6' },
      el('h3', { class: 'mb-4 ml-4 text-sm font-semibold text-bodydark2' }, 'TABLES'),
      el('ul', { class: 'mb-6 flex flex-col gap-1.5' }, navLinks),
    ),
  );

  const burger = el('button', {
    class: 'rounded border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-boxdark lg:hidden',
    'aria-label': 'Toggle navigation',
    onclick: () => {
      sidebar.classList.toggle('-translate-x-full');
      sidebar.classList.toggle('translate-x-0');
    },
  }, '☰');

  const header = el('header', {
    class: 'sticky top-0 z-999 flex w-full items-center justify-between gap-4 bg-white px-4 py-4 shadow-sm dark:bg-boxdark md:px-6',
  },
    burger,
    el('div', { class: 'ml-auto flex items-center gap-3 sm:gap-4' },
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
