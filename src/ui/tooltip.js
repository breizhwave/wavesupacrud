import { el } from './dom.js';

/**
 * Hover tooltip for long cell text — a singleton glass popover that
 * shows the full value (scrollable), instead of the browser's native
 * title tooltip which is slow, tiny, and often suppressed.
 */

let tip = null;

function getTip() {
  if (!tip || !tip.isConnected) {
    // Solid background — glass translucency is unreadable floating
    // over arbitrary content (same reasoning as toasts).
    tip = el('div', {
      class:
        'fixed z-9999 hidden max-h-64 w-max max-w-md overflow-y-auto rounded-xl ' +
        'border border-stroke bg-white shadow-glass dark:border-strokedark dark:bg-boxdark ' +
        'whitespace-pre-wrap break-words p-3 text-sm text-black dark:text-white',
      role: 'tooltip',
    });
    document.body.append(tip);
    // Any scroll invalidates the anchored position — just hide.
    document.addEventListener('scroll', hideTip, true);
  }
  return tip;
}

function hideTip() {
  if (tip) tip.classList.add('hidden');
}

export function attachTooltip(target, text) {
  target.addEventListener('mouseenter', () => {
    const node = getTip();
    node.textContent = text;
    node.style.left = '0px';
    node.style.top = '0px';
    node.classList.remove('hidden');
    const rect = target.getBoundingClientRect();
    const { width, height } = node.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 16));
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 8);
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
  });
  target.addEventListener('mouseleave', hideTip);
  target.addEventListener('click', hideTip);
}
