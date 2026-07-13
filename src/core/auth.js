import { getClient } from './client.js';

export async function getSession() {
  const { data, error } = await getClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

/**
 * Starts an OAuth sign-in (redirects to the provider, then back here).
 * @param {string} provider e.g. 'github'
 */
export async function signInWithOAuth(provider) {
  const { error } = await getClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

/**
 * @param {(session: object|null) => void} fn called on every auth state change
 * @returns {() => void} unsubscribe
 */
export function onAuthChange(fn) {
  const { data } = getClient().auth.onAuthStateChange((_event, session) => fn(session));
  return () => data.subscription.unsubscribe();
}
