import { loadConfig } from './core/config.js';
import { initClient } from './core/client.js';
import { getSession, onAuthChange } from './core/auth.js';
import { loadSchema } from './core/schema.js';
import { appStore } from './core/store.js';
import { startRouter } from './router.js';
import { renderLayout } from './ui/layout.js';
import { renderLogin } from './views/login.js';
import { renderSetupNotice } from './views/setup.js';
import { el } from './ui/dom.js';

const root = document.getElementById('app');

async function boot() {
  const config = await loadConfig();
  appStore.set({ config });

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    root.replaceChildren(renderSetupNotice());
    return;
  }

  await initClient(config);
  appStore.set({ session: await getSession() });

  onAuthChange((session) => {
    const hadSession = !!appStore.get().session;
    appStore.set({ session });
    // Only re-render on sign-in/sign-out, not on token refreshes.
    if (hadSession !== !!session) renderApp();
  });

  await renderApp();
}

async function renderApp() {
  const { session, config } = appStore.get();
  if (!session) {
    root.replaceChildren(renderLogin());
    return;
  }
  appStore.set({ schema: await loadSchema(config) });
  const layout = renderLayout();
  root.replaceChildren(layout.el);
  startRouter(layout.outlet);
}

boot().catch((err) => {
  console.error(err);
  root.replaceChildren(
    el('div', { class: 'flex min-h-screen items-center justify-center p-4' },
      el('div', { class: 'sc-card w-full max-w-md border-l-4 border-l-danger p-8' },
        el('h1', { class: 'mb-2 text-lg font-semibold text-black dark:text-white' }, 'Supacrud failed to start'),
        el('p', { class: 'text-sm' }, err.message ?? String(err)),
      ),
    ),
  );
});
