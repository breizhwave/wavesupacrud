import { el } from '../ui/dom.js';

/** Shown when supacrud.config.js is missing or lacks credentials. */
export function renderSetupNotice() {
  return el('div', { class: 'flex min-h-screen items-center justify-center p-4' },
    el('div', { class: 'sc-card w-full max-w-xl p-8 sm:p-10' },
      el('h1', { class: 'mb-4 text-2xl font-bold text-black dark:text-white' }, '⚡ Supacrud setup'),
      el('p', { class: 'mb-4' },
        'No configuration found. Copy the example config and fill in your Supabase project details:'),
      el('pre', { class: 'mb-4 overflow-x-auto rounded-xl bg-black/5 p-4 font-mono text-sm text-black dark:bg-black/30 dark:text-bodydark' },
        'cp supacrud.config.example.js supacrud.config.js\n# then edit supabaseUrl + supabaseAnonKey'),
      el('p', { class: 'text-sm' },
        'Only the anon key is ever used — access control is enforced by Row Level Security on your Supabase project. Never put a service_role key here.'),
    ),
  );
}
