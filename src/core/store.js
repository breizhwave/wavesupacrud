/**
 * Minimal observable store. State lives here, not in the DOM.
 */
export function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();
  return {
    get() {
      return state;
    },
    /** Shallow-merges a patch and notifies subscribers. */
    set(patch) {
      state = { ...state, ...patch };
      for (const listener of listeners) listener(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** App-wide state: config, session, schema. */
export const appStore = createStore({
  config: null,
  session: null,
  schema: null,
});
