import { el } from './ui/dom.js';
import { spinner } from './ui/spinner.js';
import { renderDashboard } from './views/dashboard.js';
import { renderList } from './views/list.js';
import { renderForm } from './views/form.js';

const routes = [
  { pattern: '/', handler: renderDashboard },
  { pattern: '/tables/:table', handler: renderList },
  { pattern: '/tables/:table/new', handler: renderForm },
  { pattern: '/tables/:table/edit/:id', handler: renderForm },
];

let outlet = null;
let started = false;

export function startRouter(outletEl) {
  outlet = outletEl;
  if (!started) {
    window.addEventListener('hashchange', render);
    started = true;
  }
  render();
}

export function navigate(path) {
  if (currentPath() === path) render();
  else location.hash = '#' + path;
}

export function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

function match(path) {
  for (const route of routes) {
    const keys = [];
    const rx = new RegExp(
      '^' +
        route.pattern.replace(/:[^/]+/g, (m) => {
          keys.push(m.slice(1));
          return '([^/]+)';
        }) +
        '$',
    );
    const m = path.match(rx);
    if (m) {
      const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      return { handler: route.handler, params };
    }
  }
  return null;
}

async function render() {
  if (!outlet) return;
  const path = currentPath();
  const matched = match(path);
  outlet.replaceChildren(spinner());
  try {
    const node = matched
      ? await matched.handler(matched.params)
      : el('p', { class: 'text-danger' }, `No screen for “${path}”.`);
    outlet.replaceChildren(node);
  } catch (err) {
    console.error(err);
    outlet.replaceChildren(
      el('div', { class: 'sc-card border-l-4 border-l-danger p-6' },
        el('h2', { class: 'mb-1 font-semibold text-black dark:text-white' }, 'Something went wrong'),
        el('p', {}, err.message ?? String(err)),
      ),
    );
  }
  document.dispatchEvent(new CustomEvent('sc:navigated', { detail: { path } }));
}
