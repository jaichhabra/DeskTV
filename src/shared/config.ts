import type {
  AppEntry,
  Category,
  Config,
  HeroMode,
  LaunchTarget,
  LibraryFolder,
  MediaKind,
  Motion,
  RecentItem,
  RowKind,
  RowSetting,
  TileSize
} from './types';
import { checkTarget } from './launch';

export const CONFIG_VERSION = 1;

/**
 * The services DeskTV starts with. Each opens its installed Windows app when the Start menu has one by that name,
 * then its official website. Spotify also has its documented spotify: URI scheme.
 */
export const DEFAULT_APPS: AppEntry[] = [
  app('netflix', 'Netflix', 'netflix', '#E50914', 'streaming', [
    { kind: 'startApp', match: 'Netflix' },
    { kind: 'url', url: 'https://www.netflix.com/' }
  ]),
  app('prime', 'Prime Video', 'primevideo', '#1F2E3E', 'streaming', [
    { kind: 'startApp', match: 'Prime Video' },
    { kind: 'url', url: 'https://www.primevideo.com/' }
  ]),
  app('youtube', 'YouTube', 'youtube', '#FF0000', 'streaming', [{ kind: 'url', url: 'https://www.youtube.com/' }]),
  app('appletv', 'Apple TV', 'appletv', '#1C1C1E', 'streaming', [
    { kind: 'startApp', match: 'Apple TV' },
    { kind: 'url', url: 'https://tv.apple.com/' }
  ]),
  app('hotstar', 'JioHotstar', 'jiohotstar', '#0F1F5C', 'streaming', [
    { kind: 'startApp', match: 'JioHotstar' },
    { kind: 'url', url: 'https://www.hotstar.com/' }
  ]),
  app('plex', 'Plex', 'plex', '#1F1F1F', 'streaming', [
    { kind: 'startApp', match: 'Plex HTPC' },
    { kind: 'startApp', match: 'Plex' },
    { kind: 'url', url: 'https://app.plex.tv/' }
  ]),
  app('spotify', 'Spotify', 'spotify', '#1DB954', 'music', [
    { kind: 'startApp', match: 'Spotify' },
    { kind: 'url', url: 'https://open.spotify.com/' }
  ]),
  app('ytmusic', 'YouTube Music', 'youtubemusic', '#FF0033', 'music', [
    { kind: 'url', url: 'https://music.youtube.com/' }
  ]),
  app('vlc', 'VLC', 'vlcmediaplayer', '#FF8800', 'apps', [{ kind: 'startApp', match: 'VLC media player' }]),
  app('browser', 'Browser', null, '#3A3A3C', 'apps', [{ kind: 'url', url: 'https://www.google.com/' }]),
  app('steam', 'Steam', 'steam', '#1B2838', 'games', [{ kind: 'startApp', match: 'Steam' }]),
  app('xbox', 'Xbox', 'xbox', '#107C10', 'games', [{ kind: 'startApp', match: 'Xbox' }])
].map((a, i) => ({ ...a, pinned: i < 8 }));

function app(
  id: string,
  name: string,
  icon: string | null,
  color: string,
  category: Category,
  launch: LaunchTarget[]
): AppEntry {
  return { id, name, icon, image: null, color, category, launch, pinned: false, hidden: false, builtin: true };
}

export const ROW_KINDS: RowKind[] = ['favorites', 'recent', 'streaming', 'music', 'movies', 'shows', 'apps', 'games'];

export const ROW_TITLES: Record<RowKind, string> = {
  favorites: 'Favorites',
  recent: 'Recently Opened',
  streaming: 'Streaming',
  music: 'Music',
  movies: 'Local Movies',
  shows: 'TV Shows',
  apps: 'My Apps',
  games: 'Games'
};

export function defaultConfig(): Config {
  return {
    version: CONFIG_VERSION,
    apps: DEFAULT_APPS.map((a) => ({ ...a, launch: a.launch.map((t) => ({ ...t })) })),
    rows: ROW_KINDS.map((kind) => ({ kind, visible: true })),
    hero: { mode: 'greeting', featuredAppId: null, image: null },
    widgets: { clock: true, weather: true, network: false, crypto: false, system: false },
    weather: { city: '', lat: null, lon: null, fahrenheit: false },
    crypto: { coins: ['BTC', 'ETH'] },
    screensaver: { enabled: true, idleMinutes: 5, quotes: true, weather: true, photoFolder: null },
    display: { preferredDisplayId: null, scale: 'auto', safeArea: 0 },
    tv: { startWithWindows: false, startInTvMode: true },
    appearance: { accent: '#0A84FF', motion: 'full', tileSize: 'medium' },
    library: { folders: [], player: 'system' },
    recent: []
  };
}

const CATEGORIES: Category[] = ['streaming', 'music', 'apps', 'games'];
const HERO_MODES: HeroMode[] = ['greeting', 'featured', 'recent'];
const MOTIONS: Motion[] = ['full', 'reduced', 'off'];
const TILE_SIZES: TileSize[] = ['small', 'medium', 'large'];
const MEDIA_KINDS: MediaKind[] = ['movies', 'shows', 'music', 'photos'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z0-9-]{1,40}$/;

type Raw = Record<string, unknown>;

function obj(v: unknown): Raw {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {};
}
function bool(v: unknown, d: boolean): boolean {
  return typeof v === 'boolean' ? v : d;
}
function str(v: unknown, d: string, max = 200): string {
  return typeof v === 'string' && v.length <= max ? v : d;
}
function num(v: unknown, d: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
}
function oneOf<T extends string>(v: unknown, all: readonly T[], d: T): T {
  return typeof v === 'string' && (all as readonly string[]).includes(v) ? (v as T) : d;
}
function pathOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 2 && v.length < 1024 && !v.includes('\0') ? v : null;
}

function cleanTarget(v: unknown): LaunchTarget | null {
  const t = obj(v);
  let out: LaunchTarget | null = null;
  if (t.kind === 'startApp' && typeof t.match === 'string') out = { kind: 'startApp', match: t.match };
  else if (t.kind === 'exe' && typeof t.path === 'string') {
    const args = Array.isArray(t.args) ? t.args.filter((a): a is string => typeof a === 'string').slice(0, 16) : [];
    out = { kind: 'exe', path: t.path, args };
  } else if (t.kind === 'uri' && typeof t.uri === 'string') out = { kind: 'uri', uri: t.uri };
  else if (t.kind === 'url' && typeof t.url === 'string') out = { kind: 'url', url: t.url };
  return out && checkTarget(out) === null ? out : null;
}

function cleanApp(v: unknown): AppEntry | null {
  const a = obj(v);
  if (typeof a.id !== 'string' || !ID.test(a.id)) return null;
  const launch = (Array.isArray(a.launch) ? a.launch : []).map(cleanTarget).filter((t): t is LaunchTarget => !!t);
  if (!launch.length) return null;
  const name = str(a.name, '', 60).trim();
  if (!name) return null;
  return {
    id: a.id,
    name,
    icon: typeof a.icon === 'string' && /^[a-z0-9]{1,40}$/.test(a.icon) ? a.icon : null,
    image: pathOrNull(a.image),
    color: typeof a.color === 'string' && HEX.test(a.color) ? a.color : '#3A3A3C',
    category: oneOf(a.category, CATEGORIES, 'apps'),
    launch: launch.slice(0, 6),
    pinned: bool(a.pinned, false),
    hidden: bool(a.hidden, false),
    builtin: bool(a.builtin, false)
  };
}

/**
 * Settings read from disk or an imported file, made safe: anything missing, of the wrong type or out of range takes
 * its default, so a damaged file never stops DeskTV from opening. Older versions are carried forward here.
 */
export function sanitizeConfig(input: unknown): Config {
  const d = defaultConfig();
  const r = obj(input);

  const apps: AppEntry[] = [];
  const seen = new Set<string>();
  for (const v of Array.isArray(r.apps) ? r.apps : d.apps) {
    const a = cleanApp(v);
    if (a && !seen.has(a.id)) {
      seen.add(a.id);
      apps.push(a);
    }
  }
  // Built-in services added in a later version show up for people who already have settings.
  if (Array.isArray(r.apps)) for (const a of d.apps) if (!seen.has(a.id)) apps.push({ ...a, pinned: false });

  const rows: RowSetting[] = [];
  for (const v of Array.isArray(r.rows) ? r.rows : []) {
    const row = obj(v);
    const kind = oneOf<RowKind>(row.kind, ROW_KINDS, 'favorites');
    if (row.kind === kind && !rows.some((x) => x.kind === kind)) rows.push({ kind, visible: bool(row.visible, true) });
  }
  for (const kind of ROW_KINDS) if (!rows.some((x) => x.kind === kind)) rows.push({ kind, visible: true });

  const hero = obj(r.hero);
  const widgets = obj(r.widgets);
  const weather = obj(r.weather);
  const crypto = obj(r.crypto);
  const saver = obj(r.screensaver);
  const display = obj(r.display);
  const tv = obj(r.tv);
  const look = obj(r.appearance);
  const library = obj(r.library);

  const folders: LibraryFolder[] = [];
  for (const v of Array.isArray(library.folders) ? library.folders : []) {
    const f = obj(v);
    const path = pathOrNull(f.path);
    if (path && !folders.some((x) => x.path === path)) {
      folders.push({ path, kind: oneOf(f.kind, MEDIA_KINDS, 'movies') });
    }
  }

  const recent: RecentItem[] = [];
  for (const v of Array.isArray(r.recent) ? r.recent : []) {
    const it = obj(v);
    if ((it.kind === 'app' || it.kind === 'media') && typeof it.id === 'string' && it.id.length < 200) {
      recent.push({ kind: it.kind, id: it.id, at: num(it.at, 0, 0, Number.MAX_SAFE_INTEGER) });
    }
  }

  const lat = typeof weather.lat === 'number' && Math.abs(weather.lat) <= 90 ? weather.lat : null;
  const lon = typeof weather.lon === 'number' && Math.abs(weather.lon) <= 180 ? weather.lon : null;
  const coins = (Array.isArray(crypto.coins) ? crypto.coins : d.crypto.coins)
    .filter((c): c is string => typeof c === 'string' && /^[A-Z0-9]{2,10}$/.test(c))
    .slice(0, 6);

  return {
    version: CONFIG_VERSION,
    apps,
    rows,
    hero: {
      mode: oneOf(hero.mode, HERO_MODES, d.hero.mode),
      featuredAppId: typeof hero.featuredAppId === 'string' && seen.has(hero.featuredAppId) ? hero.featuredAppId : null,
      image: pathOrNull(hero.image)
    },
    widgets: {
      clock: bool(widgets.clock, d.widgets.clock),
      weather: bool(widgets.weather, d.widgets.weather),
      network: bool(widgets.network, d.widgets.network),
      crypto: bool(widgets.crypto, d.widgets.crypto),
      system: bool(widgets.system, d.widgets.system)
    },
    weather: {
      city: str(weather.city, '', 80),
      lat: lat !== null && lon !== null ? lat : null,
      lon: lat !== null && lon !== null ? lon : null,
      fahrenheit: bool(weather.fahrenheit, false)
    },
    crypto: { coins },
    screensaver: {
      enabled: bool(saver.enabled, d.screensaver.enabled),
      idleMinutes: Math.round(num(saver.idleMinutes, d.screensaver.idleMinutes, 1, 120)),
      quotes: bool(saver.quotes, true),
      weather: bool(saver.weather, true),
      photoFolder: pathOrNull(saver.photoFolder)
    },
    display: {
      preferredDisplayId: typeof display.preferredDisplayId === 'number' ? display.preferredDisplayId : null,
      scale: display.scale === 'auto' ? 'auto' : num(display.scale, 1, 0.6, 1.6),
      safeArea: num(display.safeArea, 0, 0, 10)
    },
    tv: {
      startWithWindows: bool(tv.startWithWindows, false),
      startInTvMode: bool(tv.startInTvMode, true)
    },
    appearance: {
      accent: typeof look.accent === 'string' && HEX.test(look.accent) ? look.accent : d.appearance.accent,
      motion: oneOf(look.motion, MOTIONS, 'full'),
      tileSize: oneOf(look.tileSize, TILE_SIZES, 'medium')
    },
    library: { folders: folders.slice(0, 20), player: library.player === 'vlc' ? 'vlc' : 'system' },
    recent: recent.sort((a, b) => b.at - a.at).slice(0, 20)
  };
}

/** A new id for an app the person adds. */
export function newAppId(name: string, taken: Set<string>): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) || 'app';
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}
