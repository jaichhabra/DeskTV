import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { AppEntry, MediaItem } from '../../../shared/types';
import { desk, report } from '../api';
import { isAvailable, useDeskContext } from '../context';
import { BrandMark, Glyph, brandIcon, type GlyphName } from './Icon';

/** A picture the person chose for a tile, through the dtv: scheme. */
function useChosenImage(path: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (path) desk.imageUrl(path).then((u) => live && setUrl(u), report);
    else setUrl(null);
    return () => {
      live = false;
    };
  }, [path]);
  return url;
}

/** Bumped when the main process has read installed apps' icons again. */
let iconGeneration = 0;
const iconListeners = new Set<() => void>();
desk?.onIcons(() => {
  iconGeneration++;
  iconListeners.forEach((l) => l());
});

/** The app's own icon from Windows, for services without a bundled logo. */
function useWindowsIcon(appId: string, wanted: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const [gen, setGen] = useState(iconGeneration);
  useEffect(() => {
    const l = (): void => setGen(iconGeneration);
    iconListeners.add(l);
    return () => void iconListeners.delete(l);
  }, []);
  useEffect(() => {
    let live = true;
    if (wanted) desk.appIcon(appId).then((u) => live && setUrl(u), report);
    return () => {
      live = false;
    };
  }, [appId, wanted, gen]);
  return wanted ? url : null;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number): number => Math.round(Math.min(255, Math.max(0, ((n >> s) & 255) * f)));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

export function AppTile({
  app,
  list,
  dock = false,
  autoFocus = false
}: {
  app: AppEntry;
  /** The ids of the row it's in, for moving it. */
  list: string[];
  dock?: boolean;
  autoFocus?: boolean;
}) {
  const d = useDeskContext();
  const image = useChosenImage(app.image);
  const ready = isAvailable(d.config, app);
  const b = brandIcon(app.icon);
  const winIcon = useWindowsIcon(app.id, !app.image && !b);
  const color = app.color || b?.hex || '#3a3a3c';
  const style = {
    '--tile-color': color,
    '--tile-deep': shade(color, 0.45)
  } as CSSProperties;
  return (
    <button
      className={`tile app-tile${dock ? ' dock-tile' : ''}${d.moving === app.id ? ' moving' : ''}${ready ? '' : ' unavailable'}`}
      data-item
      data-key={`app:${app.id}`}
      data-autofocus={autoFocus || undefined}
      style={style}
      onClick={() => d.openApp(app)}
      onContextMenu={(e) => {
        e.preventDefault();
        d.appMenu(app, list);
      }}
      aria-label={ready ? app.name : `${app.name}, not installed`}
    >
      <span className="tile-face">
        {image ? (
          <img className="tile-image" src={image} alt="" draggable={false} />
        ) : winIcon ? (
          <img className="tile-icon" src={winIcon} alt="" draggable={false} />
        ) : (
          <BrandMark slug={app.icon} name={app.name} size="2.6em" />
        )}
        <span className="tile-sheen" />
      </span>
      <span className="tile-label">{ready ? app.name : `${app.name} · not installed`}</span>
    </button>
  );
}

const KIND_GLYPH: Record<MediaItem['kind'], GlyphName> = { movies: 'play', shows: 'tv', music: 'music', photos: 'photo' };

export function MediaTile({ item }: { item: MediaItem }) {
  const d = useDeskContext();
  const ref = useRef<HTMLButtonElement>(null);
  const [thumb, setThumb] = useState<string | null>(null);

  // Thumbnails only for tiles that come into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          desk.thumbnail(item.id).then((u) => live && setThumb(u), report);
        }
      },
      { rootMargin: '50%' }
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [item.id]);

  const meta =
    item.kind === 'shows' && item.season !== null
      ? `S${String(item.season).padStart(2, '0')} · E${String(item.episode).padStart(2, '0')}`
      : item.year
        ? String(item.year)
        : item.kind === 'music'
          ? 'Music'
          : item.kind === 'photos'
            ? 'Photo'
            : 'Movie';
  return (
    <button
      ref={ref}
      className="tile media-tile"
      data-item
      data-key={`media:${item.id}`}
      onClick={() => d.openMedia(item)}
      aria-label={`${item.show ?? item.title}, ${meta}`}
    >
      <span className="tile-face">
        {thumb ? (
          <img className="tile-image" src={thumb} alt="" draggable={false} />
        ) : (
          <span className="poster">
            <Glyph name={KIND_GLYPH[item.kind]} size="2em" />
          </span>
        )}
        <span className="tile-sheen" />
      </span>
      <span className="tile-caption">
        <span className="tile-title">{item.show ?? item.title}</span>
        <span className="tile-meta">{meta}</span>
      </span>
    </button>
  );
}

/** A plain tile with a glyph, for "Add app" and "Add folder". */
export function ActionTile({ label, glyph, onClick, keyName }: { label: string; glyph: GlyphName; onClick(): void; keyName: string }) {
  return (
    <button className="tile action-tile" data-item data-key={keyName} onClick={onClick}>
      <span className="tile-face">
        <Glyph name={glyph} size="2.2em" />
      </span>
      <span className="tile-label">{label}</span>
    </button>
  );
}
