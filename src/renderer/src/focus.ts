import { moveFocus, type Dir } from '../../shared/nav';

/**
 * Remote-style focus over the DOM. The topmost [data-scope] (a page, or an overlay above it) holds rows
 * ([data-row]) of items ([data-item]); arrows move between them with shared/nav, and each scope remembers its last
 * item (by data-key) so coming back lands where you left.
 */
const memory = new Map<string, string>();

export function activeScope(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>('[data-scope]');
  return all.length ? all[all.length - 1] : null;
}

function own(el: Element, attr: string, owner: Element): boolean {
  return el.parentElement?.closest(attr) === owner || el.closest(attr) === owner;
}

export function rowsIn(scope: HTMLElement): HTMLElement[][] {
  const rows: HTMLElement[][] = [];
  for (const row of scope.querySelectorAll<HTMLElement>('[data-row]')) {
    if (row.closest('[data-scope]') !== scope) continue;
    const items = [...row.querySelectorAll<HTMLElement>('[data-item]')].filter(
      (i) => own(i, '[data-row]', row) && i.closest('[data-row]') === row && !i.hasAttribute('disabled')
    );
    rows.push(items);
  }
  return rows;
}

export function focusItem(el: HTMLElement, smooth = true): void {
  el.focus({ preventScroll: true });
  const row = el.closest<HTMLElement>('[data-row]');
  const scroller = el.closest<HTMLElement>('[data-scroller]');
  const behavior: ScrollBehavior = smooth && document.documentElement.dataset.motion === 'full' ? 'smooth' : 'auto';
  if (row?.hasAttribute('data-row-top') && scroller) scroller.scrollTo({ top: 0, behavior });
  else el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior });
  const scope = el.closest<HTMLElement>('[data-scope]');
  if (scope?.dataset.scope && el.dataset.key) memory.set(scope.dataset.scope, el.dataset.key);
}

/** Focuses the scope's remembered item, or the one marked data-autofocus, or the first. */
export function focusScope(scope: HTMLElement | null = activeScope()): void {
  if (!scope) return;
  const rows = rowsIn(scope);
  const all = rows.flat();
  const key = scope.dataset.scope ? memory.get(scope.dataset.scope) : undefined;
  const target =
    (key && all.find((i) => i.dataset.key === key)) ||
    all.find((i) => i.hasAttribute('data-autofocus')) ||
    all[0];
  if (target) focusItem(target, false);
}

export function forget(scope: string): void {
  memory.delete(scope);
}

export function move(dir: Dir): boolean {
  const scope = activeScope();
  if (!scope) return false;
  const rows = rowsIn(scope);
  const active = document.activeElement as HTMLElement | null;
  let at: { row: number; col: number } | null = null;
  rows.forEach((items, r) => {
    const c = active ? items.indexOf(active) : -1;
    if (c >= 0) at = { row: r, col: c };
  });
  if (!at) {
    focusScope(scope);
    return true;
  }
  const centers = rows.map((items) => ({
    centers: items.map((i) => {
      const b = i.getBoundingClientRect();
      return b.left + b.width / 2;
    })
  }));
  const next = moveFocus(centers, at, dir);
  if (!next) return false;
  focusItem(rows[next.row][next.col]);
  return true;
}

export function isTyping(el: Element | null): boolean {
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}
