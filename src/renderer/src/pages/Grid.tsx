import type { ReactNode } from 'react';
import { useDeskContext } from '../context';

/** Items laid out in rows of the layout's column count, each a focus row, so up and down move straight. */
export function Grid({ children }: { children: ReactNode[] }) {
  const { layout } = useDeskContext();
  const rows: ReactNode[][] = [];
  for (let i = 0; i < children.length; i += layout.columns) rows.push(children.slice(i, i + layout.columns));
  return (
    <div className="grid">
      {rows.map((r, i) => (
        <div className="grid-row" data-row key={i}>
          {r}
        </div>
      ))}
    </div>
  );
}
