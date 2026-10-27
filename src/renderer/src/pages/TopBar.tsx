import { useDeskContext, type Page } from '../context';
import { Glyph, type GlyphName } from '../components/Icon';
import { useOnline } from '../hooks';

const BUTTONS: { page: Page; glyph: GlyphName; label: string }[] = [
  { page: 'search', glyph: 'search', label: 'Search' },
  { page: 'library', glyph: 'library', label: 'Library' },
  { page: 'apps', glyph: 'apps', label: 'All apps' },
  { page: 'settings', glyph: 'settings', label: 'Settings' }
];

/** Small round glass buttons at the top right, as on Apple TV; the page title at the left. */
export function TopBar({ title }: { title?: string }) {
  const d = useDeskContext();
  const online = useOnline();
  return (
    <header className="topbar">
      <div className="topbar-title">{title ?? <span className="wordmark">DeskTV</span>}</div>
      <div className="topbar-status">
        {!online && (
          <span className="status-chip">
            <Glyph name="offline" /> Offline
          </span>
        )}
      </div>
      <nav className="topbar-buttons" data-row data-row-top aria-label="Menu">
        {BUTTONS.map((b) => (
          <button
            key={b.page}
            className={`round-button${d.page === b.page ? ' current' : ''}`}
            data-item
            data-key={`top:${b.page}`}
            aria-label={b.label}
            title={b.label}
            onClick={() => d.go(d.page === b.page ? 'home' : b.page)}
          >
            <Glyph name={b.glyph} />
            <span className="round-label">{b.label}</span>
          </button>
        ))}
        <button className="round-button" data-item data-key="top:power" aria-label="Exit or minimize" title="Exit or minimize" onClick={d.power}>
          <Glyph name="power" />
          <span className="round-label">Power</span>
        </button>
      </nav>
    </header>
  );
}
