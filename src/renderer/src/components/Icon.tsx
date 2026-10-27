import brand from '../assets/brand-icons.json';

/** DeskTV's own interface glyphs: simple 24-unit strokes. */
const GLYPHS = {
  search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm4.7 11.2L20 20',
  settings:
    'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0-6v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8',
  power: 'M12 3v8M7 6.3a7 7 0 1 0 10 0',
  library: 'M4 5h16v14H4zM4 9h16M8 5v4M12 5v4M16 5v4',
  apps: 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
  plus: 'M12 5v14M5 12h14',
  play: 'M8 5.5v13l10.5-6.5z',
  wifi: 'M3.5 9.5a12 12 0 0 1 17 0M6.5 12.5a8 8 0 0 1 11 0M9.5 15.5a4 4 0 0 1 5 0M12 19h.01',
  offline: 'M3.5 9.5a12 12 0 0 1 17 0M9.5 15.5a4 4 0 0 1 5 0M12 19h.01M4 4l16 16',
  folder: 'M3.5 6.5h6l2 2h9v10h-17z',
  refresh: 'M19 8a7.5 7.5 0 1 0 .5 6M19 3.5V8h-4.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  music: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm10-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  tv: 'M3.5 6h17v11h-17zM9 20h6',
  photo: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9h.01',
  globe: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5Z',
  game: 'M6 9h12a3 3 0 0 1 3 3v2a3 3 0 0 1-5.4 1.8L14.5 14h-5l-1.1 1.8A3 3 0 0 1 3 14v-2a3 3 0 0 1 3-3ZM8 10.5v3M6.5 12h3M15.5 11.5h.01M17.5 13h.01'
} as const;

export type GlyphName = keyof typeof GLYPHS;

export function Glyph({ name, size = '1.25em' }: { name: GlyphName; size?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="glyph">
      <path d={GLYPHS[name]} fill={name === 'play' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Brand = { title: string; hex: string; path: string };
const BRANDS = brand as Record<string, Brand>;

export function brandIcon(slug: string | null): Brand | null {
  if (!slug) return null;
  return BRANDS[slug] ?? (slug === 'jiohotstar' ? (BRANDS.hotstar ?? null) : null);
}

/**
 * A service's mark from Simple Icons (CC0), in white. Without one, its name set as a wordmark (short names) or its
 * first letter.
 */
export function BrandMark({ slug, name, size }: { slug: string | null; name: string; size: string }) {
  const b = brandIcon(slug);
  if (!b) {
    const n = name.trim();
    return n.length <= 12 && n.length > 1 ? (
      <span className="wordmark-tile" style={{ fontSize: `calc(${size} * 0.42)` }} aria-hidden="true">
        {n.toLowerCase()}
      </span>
    ) : (
      <span className="monogram" style={{ fontSize: size }} aria-hidden="true">
        {n.charAt(0).toUpperCase() || '•'}
      </span>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="brand-mark">
      <path d={b.path} fill="currentColor" />
    </svg>
  );
}
