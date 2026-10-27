/**
 * Directional focus for a remote: rows of items, each with its horizontal center. Left and right move within a row;
 * up and down go to the nearest item of the next row that has any, so focus never lands nowhere and never jumps
 * across the screen.
 */
export interface NavRow {
  /** The horizontal centers of the row's items, in order. */
  centers: number[];
}

export interface NavPos {
  row: number;
  col: number;
}

export type Dir = 'left' | 'right' | 'up' | 'down';

export function moveFocus(rows: NavRow[], at: NavPos, dir: Dir): NavPos | null {
  const row = rows[at.row];
  if (!row || !row.centers.length) return firstFocusable(rows);
  const col = Math.min(at.col, row.centers.length - 1);
  if (dir === 'left') return col > 0 ? { row: at.row, col: col - 1 } : null;
  if (dir === 'right') return col < row.centers.length - 1 ? { row: at.row, col: col + 1 } : null;
  const step = dir === 'down' ? 1 : -1;
  const x = row.centers[col];
  for (let r = at.row + step; r >= 0 && r < rows.length; r += step) {
    if (rows[r].centers.length) return { row: r, col: nearest(rows[r].centers, x) };
  }
  return null;
}

export function nearest(centers: number[], x: number): number {
  let best = 0;
  for (let i = 1; i < centers.length; i++) if (Math.abs(centers[i] - x) < Math.abs(centers[best] - x)) best = i;
  return best;
}

export function firstFocusable(rows: NavRow[]): NavPos | null {
  const r = rows.findIndex((row) => row.centers.length > 0);
  return r < 0 ? null : { row: r, col: 0 };
}

/** The horizontal scroll that keeps an item in view with a margin, Apple TV style (no scroll until needed). */
export function scrollToShow(scroll: number, viewWidth: number, itemStart: number, itemWidth: number, margin: number): number {
  if (itemStart - margin < scroll) return Math.max(0, itemStart - margin);
  if (itemStart + itemWidth + margin > scroll + viewWidth) return itemStart + itemWidth + margin - viewWidth;
  return scroll;
}
