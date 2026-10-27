import { ROW_TITLES } from '../../../shared/config';
import { greeting } from '../../../shared/weather';
import type { AppEntry, MediaItem, RowKind } from '../../../shared/types';
import { isAvailable, useDeskContext } from '../context';
import { dateFormat, timeFormat, useNow } from '../hooks';
import { Glyph } from '../components/Icon';
import { AppTile, MediaTile } from '../components/Tiles';
import { SmallClock, Widgets } from '../components/Widgets';
import { TopBar } from './TopBar';

const ROW_LIMIT = 24;

export function Home() {
  const d = useDeskContext();
  const c = d.config;
  const shown = c.apps.filter((a) => !a.hidden && isAvailable(c, a));
  const dock = shown.filter((a) => a.pinned);

  return (
    <div className="page home" data-scope="home" data-scroller>
      <TopBar />
      <Hero dockFirst={dock[0] ?? shown[0] ?? null} />
      <section className="dock-wrap" aria-label="Dock">
        <div className="dock glass" data-row>
          {dock.map((a, i) => (
            <AppTile key={a.id} app={a} list={dock.map((x) => x.id)} dock autoFocus={i === 0} />
          ))}
          {!dock.length && <div className="card-note">Pin apps here from their menu (hold Enter).</div>}
        </div>
      </section>
      <div className="rows">
        {c.rows
          .filter((r) => r.visible)
          .map((r) => (
            <Row key={r.kind} kind={r.kind} apps={shown} />
          ))}
      </div>
    </div>
  );
}

function Hero({ dockFirst }: { dockFirst: AppEntry | null }) {
  const d = useDeskContext();
  const c = d.config;
  const now = useNow();
  const featured = c.apps.find((a) => a.id === c.hero.featuredAppId) ?? dockFirst;
  const recent = c.recent[0];
  const recentApp = recent?.kind === 'app' ? c.apps.find((a) => a.id === recent.id) : undefined;
  const recentMedia = recent?.kind === 'media' ? d.library.items.find((m) => m.id === recent.id) : undefined;

  let eyebrow = dateFormat.format(now);
  let title = `${greeting(now.getHours())}.`;
  let subtitle = 'Your entertainment, all in one place.';
  let primary: { label: string; run(): void } | null = featured ? { label: `Open ${featured.name}`, run: () => d.openApp(featured) } : null;

  if (c.hero.mode === 'featured' && featured) {
    eyebrow = 'Featured';
    title = featured.name;
    subtitle = `${greeting(now.getHours())}. Pick up your evening with ${featured.name}.`;
  } else if (c.hero.mode === 'recent' && (recentApp || recentMedia)) {
    eyebrow = 'Recently opened';
    title = recentApp?.name ?? recentMedia?.show ?? recentMedia?.title ?? '';
    subtitle = recentMedia ? 'From your library.' : `${greeting(now.getHours())}.`;
    primary = recentApp
      ? { label: `Open ${recentApp.name}`, run: () => d.openApp(recentApp) }
      : recentMedia
        ? { label: 'Play', run: () => d.openMedia(recentMedia) }
        : primary;
  }

  return (
    <section className="hero" aria-label="Welcome">
      <div className="hero-copy">
        {c.widgets.clock && <div className="hero-clock">{timeFormat.format(now)}</div>}
        <div className="hero-eyebrow">{eyebrow}</div>
        <h1 className="hero-title">{title}</h1>
        <p className="hero-sub">{subtitle}</p>
        <div className="hero-actions" data-row>
          {primary && (
            <button className="pill primary" data-item data-key="hero:primary" onClick={primary.run}>
              <Glyph name="play" /> {primary.label}
            </button>
          )}
          <button className="pill" data-item data-key="hero:apps" onClick={() => d.go('apps')}>
            <Glyph name="apps" /> Browse apps
          </button>
          <button className="pill" data-item data-key="hero:library" onClick={() => d.go('library')}>
            <Glyph name="library" /> Library
          </button>
        </div>
      </div>
      <Widgets />
      {!c.widgets.clock && <div className="hero-corner-clock"><SmallClock /></div>}
    </section>
  );
}

function Row({ kind, apps }: { kind: RowKind; apps: AppEntry[] }) {
  const d = useDeskContext();
  const c = d.config;
  let appList: AppEntry[] = [];
  let media: MediaItem[] = [];

  switch (kind) {
    case 'streaming':
    case 'music':
    case 'apps':
    case 'games':
      appList = apps.filter((a) => a.category === kind);
      break;
    case 'favorites':
      appList = apps.filter((a) => a.pinned);
      // The dock already shows favorites; this row only appears when there are more than fit there.
      if (appList.length <= 8) appList = [];
      break;
    case 'recent':
      for (const r of c.recent) {
        if (r.kind === 'app') {
          const a = apps.find((x) => x.id === r.id);
          if (a) appList.push(a);
        } else {
          const m = d.library.items.find((x) => x.id === r.id);
          if (m) media.push(m);
        }
      }
      break;
    case 'movies':
      media = d.library.items.filter((m) => m.kind === 'movies');
      break;
    case 'shows':
      media = latestEpisodes(d.library.items);
      break;
  }

  if (!appList.length && !media.length) return null;
  const ids = appList.map((a) => a.id);
  return (
    <section className="row" aria-label={ROW_TITLES[kind]}>
      <h2 className="row-title">{ROW_TITLES[kind]}</h2>
      <div className="row-track" data-row>
        {appList.slice(0, ROW_LIMIT).map((a) => (
          <AppTile key={`a-${a.id}`} app={a} list={ids} />
        ))}
        {media.slice(0, ROW_LIMIT).map((m) => (
          <MediaTile key={`m-${m.id}`} item={m} />
        ))}
      </div>
    </section>
  );
}

/** One tile per show: its newest file. */
function latestEpisodes(items: MediaItem[]): MediaItem[] {
  const byShow = new Map<string, MediaItem>();
  for (const m of items) {
    if (m.kind !== 'shows') continue;
    const key = (m.show ?? m.title).toLowerCase();
    const prev = byShow.get(key);
    if (!prev || m.modified > prev.modified) byShow.set(key, m);
  }
  return [...byShow.values()];
}
