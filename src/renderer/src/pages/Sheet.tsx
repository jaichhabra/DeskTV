import type { ReactNode } from 'react';

/**
 * A full-screen sheet over the frosted, dimmed sky, as SundarTV's All Apps: a title at the top left, then the
 * content, which scrolls. Back returns home.
 */
export function Sheet({ scope, title, aside, children }: { scope: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="sheet" data-scope={scope}>
      <div className="sheet-scroll" data-scroller>
        <header className="sheet-head">
          <h1 className="sheet-title">{title}</h1>
          {aside}
        </header>
        {children}
      </div>
    </div>
  );
}
