import { useState } from 'react';
import type { AppEntry, MediaItem } from '../../../shared/types';
import { isAvailable, useDeskContext } from '../context';
import { Glyph } from '../components/Icon';
import { AppTile, MediaTile } from '../components/Tiles';
import { Grid } from './Grid';
import { Sheet } from './Sheet';

function score(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.split(/[\s\-_.]+/).some((w) => w.startsWith(q))) return 60;
  if (t.includes(q)) return 40;
  return 0;
}

/** One search over apps, recently opened and the library. */
export function SearchSheet() {
  const d = useDeskContext();
  const c = d.config;
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const apps: AppEntry[] = q
    ? c.apps
        .filter((a) => !a.hidden && isAvailable(c, a))
        .map((a) => ({ a, s: score(a.name, q) + (a.pinned ? 5 : 0) }))
        .filter((x) => x.s > 5)
        .sort((x, y) => y.s - x.s)
        .map((x) => x.a)
    : c.recent
        .filter((r) => r.kind === 'app')
        .map((r) => c.apps.find((a) => a.id === r.id))
        .filter((a): a is AppEntry => !!a);
  const media: MediaItem[] = q
    ? d.library.items
        .map((m) => ({ m, s: Math.max(score(m.title, q), m.show ? score(m.show, q) : 0) }))
        .filter((x) => x.s > 0)
        .sort((x, y) => y.s - x.s)
        .slice(0, 40)
        .map((x) => x.m)
    : [];
  const ids = apps.map((a) => a.id);

  return (
    <Sheet scope="search" title="Search">
      <div className="search-row" data-row>
        <label className="search-field">
          <Glyph name="search" size="1.1em" />
          <input
            data-item
            data-key="search:input"
            data-autofocus
            placeholder="Apps, movies, shows, music"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            aria-label="Search"
          />
        </label>
      </div>
      {apps.length > 0 && (
        <>
          <h2 className="sheet-section">{q ? 'Apps' : 'Recently Opened'}</h2>
          <Grid>{apps.map((a) => <AppTile key={a.id} app={a} list={ids} variant="grid" />)}</Grid>
        </>
      )}
      {media.length > 0 && (
        <>
          <h2 className="sheet-section">Library</h2>
          <Grid>{media.map((m) => <MediaTile key={m.id} item={m} />)}</Grid>
        </>
      )}
      {q && !apps.length && !media.length && <p className="sheet-note">Nothing matches “{query.trim()}”.</p>}
    </Sheet>
  );
}
