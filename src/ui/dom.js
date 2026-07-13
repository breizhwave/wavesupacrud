/**
 * Tiny hyperscript helper — the only way components create DOM.
 * `el('a', { href: '#/', class: 'x', onclick: fn }, child1, [more])`
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);
    } else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value != null) node.setAttribute(key, value);
  }
  node.append(...children.flat(Infinity).filter((c) => c != null));
  return node;
}
