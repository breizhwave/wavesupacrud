import { el } from '../ui/dom.js';

/**
 * Rich text widget: contenteditable + a small formatting toolbar,
 * storing HTML in a text column. No dependencies.
 * execCommand is deprecated but universally supported; swap for a
 * Selection/Range implementation if browsers ever actually remove it.
 *
 * Values are sanitized on load AND on save, but treat stored HTML as
 * untrusted anyway wherever your own site renders it.
 */

const ACTIONS = [
  { cmd: 'bold', label: 'B', class: 'font-bold' },
  { cmd: 'italic', label: 'I', class: 'italic' },
  { cmd: 'underline', label: 'U', class: 'underline' },
  { cmd: 'insertUnorderedList', label: '• List' },
  { cmd: 'insertOrderedList', label: '1. List' },
  { cmd: 'createLink', label: '🔗 Link' },
  { cmd: 'removeFormat', label: 'Clear' },
];

export function create(column, value) {
  const editor = el('div', {
    class:
      'sc-input min-h-36 max-h-96 overflow-y-auto [&_a]:text-primary [&_a]:underline ' +
      '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
    contenteditable: 'true',
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-label': column.name,
  });
  editor.innerHTML = sanitizeHtml(value ?? '');

  const toolbar = el('div', { class: 'mb-2 flex flex-wrap gap-1' },
    ACTIONS.map((action) =>
      el('button', {
        type: 'button',
        class: `sc-btn-ghost px-2.5 py-1 text-xs ${action.class ?? ''}`,
        'aria-label': action.cmd,
        onmousedown: (e) => e.preventDefault(), // keep the editor selection
        onclick: () => {
          if (action.cmd === 'createLink') {
            const url = prompt('Link URL (https://…)');
            if (url && /^https?:\/\//i.test(url)) document.execCommand('createLink', false, url);
          } else {
            document.execCommand(action.cmd, false, null);
          }
          editor.focus();
        },
      }, action.label),
    ),
  );

  return {
    el: el('div', {}, toolbar, editor),
    getValue() {
      const html = sanitizeHtml(editor.innerHTML).trim();
      return html === '' || html === '<br>' ? null : html;
    },
  };
}

/**
 * Conservative allow-nothing-dangerous sanitizer: parses into an inert
 * document (no scripts run, no resources load), removes active elements
 * and event-handler/javascript: attributes, returns the remaining HTML.
 */
export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  for (const node of doc.body.querySelectorAll(
    'script,style,iframe,object,embed,link,meta,form,input,button,svg',
  )) node.remove();
  for (const node of doc.body.querySelectorAll('*')) {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) node.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(attr.value)) {
        node.removeAttribute(attr.name);
      }
    }
  }
  return doc.body.innerHTML;
}
