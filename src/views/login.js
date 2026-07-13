import { el } from '../ui/dom.js';
import { appStore } from '../core/store.js';
import { signIn, signInWithOAuth } from '../core/auth.js';

const PROVIDER_LABELS = { github: 'GitHub', google: 'Google', gitlab: 'GitLab', azure: 'Azure' };

const PROVIDER_ICONS = {
  github:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
};

function providerIcon(provider) {
  const markup = PROVIDER_ICONS[provider];
  if (!markup) return null;
  const span = el('span', { class: 'inline-flex', 'aria-hidden': 'true' });
  span.innerHTML = markup;
  return span;
}

/** Sign-in screen. Success is picked up by the auth listener in main.js. */
export function renderLogin() {
  const { config } = appStore.get();

  const email = el('input', {
    type: 'email', class: 'sc-input', placeholder: 'you@example.com',
    autocomplete: 'email', required: true, id: 'sc-email',
  });
  const password = el('input', {
    type: 'password', class: 'sc-input', placeholder: '••••••••',
    autocomplete: 'current-password', required: true, id: 'sc-password',
  });
  const error = el('p', { class: 'mb-4 hidden text-sm text-danger', role: 'alert' });
  const submit = el('button', { type: 'submit', class: 'sc-btn w-full py-3' }, 'Sign in');

  const form = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      error.classList.add('hidden');
      submit.disabled = true;
      try {
        await signIn(email.value, password.value);
      } catch (err) {
        error.textContent = err.message ?? 'Sign-in failed.';
        error.classList.remove('hidden');
        submit.disabled = false;
      }
    },
  },
    el('div', { class: 'mb-4' }, el('label', { class: 'sc-label', for: 'sc-email' }, 'Email'), email),
    el('div', { class: 'mb-6' }, el('label', { class: 'sc-label', for: 'sc-password' }, 'Password'), password),
    error,
    submit,
  );

  const providers = (config.oauthProviders ?? []).map((provider) =>
    el('button', {
      type: 'button',
      class: 'sc-btn-ghost w-full py-3',
      onclick: async () => {
        error.classList.add('hidden');
        try {
          await signInWithOAuth(provider);
        } catch (err) {
          error.textContent = err.message ?? 'Sign-in failed.';
          error.classList.remove('hidden');
        }
      },
    },
      providerIcon(provider),
      `Continue with ${PROVIDER_LABELS[provider] ?? provider}`,
    ),
  );

  return el('div', { class: 'flex min-h-screen items-center justify-center p-4' },
    el('div', { class: 'sc-card w-full max-w-md p-8 sm:p-10' },
      el('h1', { class: 'mb-1 text-2xl font-bold text-black dark:text-white' },
        '⚡ ' + (config.title || 'Supacrud')),
      el('p', { class: 'mb-8 text-sm' }, 'Sign in with your Supabase Auth account.'),
      providers.length > 0
        ? el('div', { class: 'mb-6' },
            el('div', { class: 'flex flex-col gap-3' }, providers),
            el('div', { class: 'mt-6 flex items-center gap-3' },
              el('span', { class: 'h-px flex-1 bg-stroke dark:bg-strokedark' }),
              el('span', { class: 'text-xs uppercase text-bodydark2' }, 'or with email'),
              el('span', { class: 'h-px flex-1 bg-stroke dark:bg-strokedark' }),
            ),
          )
        : null,
      form,
    ),
  );
}
