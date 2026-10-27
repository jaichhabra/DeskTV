/** Everything the main process and the screen share: the saved settings, the display, the library and the feeds. */

export type Category = 'streaming' | 'music' | 'apps' | 'games';

/**
 * One way to open an app, tried in order: an installed app found in the Start menu (by its name), an executable the
 * person picked, a documented URI scheme, or the service's official website.
 */
export type LaunchTarget =
  | { kind: 'startApp'; match: string }
  | { kind: 'exe'; path: string; args?: string[] }
  | { kind: 'uri'; uri: string }
  | { kind: 'url'; url: string };

export interface AppEntry {
  id: string;
  name: string;
  /** A brand icon bundled with the app (Simple Icons slug), or null for a monogram. */
  icon: string | null;
  /** A picture the person picked for the tile, as an absolute path. */
  image: string | null;
  /** The tile's color, #RRGGBB. */
  color: string;
  category: Category;
  launch: LaunchTarget[];
  pinned: boolean;
  hidden: boolean;
  builtin: boolean;
}

export type RowKind =
  | 'streaming'
  | 'music'
  | 'apps'
  | 'games'
  | 'movies'
  | 'shows'
  | 'favorites'
  | 'recent';

export interface RowSetting {
  kind: RowKind;
  visible: boolean;
}

export type HeroMode = 'greeting' | 'featured' | 'recent';
export type Motion = 'full' | 'reduced' | 'off';
export type TileSize = 'small' | 'medium' | 'large';
export type MediaKind = 'movies' | 'shows' | 'music' | 'photos';

export interface LibraryFolder {
  path: string;
  kind: MediaKind;
}

export interface Config {
  version: number;
  apps: AppEntry[];
  rows: RowSetting[];
  hero: { mode: HeroMode; featuredAppId: string | null; image: string | null };
  widgets: { clock: boolean; weather: boolean; network: boolean; crypto: boolean; system: boolean };
  weather: { city: string; lat: number | null; lon: number | null; fahrenheit: boolean };
  crypto: { coins: string[] };
  screensaver: { enabled: boolean; idleMinutes: number; quotes: boolean; weather: boolean; photoFolder: string | null };
  display: {
    preferredDisplayId: number | null;
    /** 'auto', or a multiplier on the automatic size (0.6 to 1.6). */
    scale: 'auto' | number;
    /** Margin kept clear on every side, in percent of the screen (TVs that crop the edges). */
    safeArea: number;
  };
  tv: { startWithWindows: boolean; startInTvMode: boolean };
  appearance: { accent: string; motion: Motion; tileSize: TileSize; sounds: boolean };
  library: { folders: LibraryFolder[]; player: 'system' | 'vlc' };
  recent: RecentItem[];
}

export interface RecentItem {
  kind: 'app' | 'media';
  id: string;
  at: number;
}

/** A screen as Windows reports it, in device-independent pixels unless named physical. */
export interface DisplayInfo {
  id: number;
  label: string;
  primary: boolean;
  width: number;
  height: number;
  workWidth: number;
  workHeight: number;
  scaleFactor: number;
  physicalWidth: number;
  physicalHeight: number;
  refreshRate: number;
  internal: boolean;
}

export interface DisplayState {
  displays: DisplayInfo[];
  /** The screen the window is on now. */
  current: DisplayInfo;
  /** True when Windows couldn't tell and a 1920 × 1080 stand-in is used. */
  fallback: boolean;
  fullscreen: boolean;
}

export interface MediaItem {
  id: string;
  kind: MediaKind;
  path: string;
  title: string;
  year: number | null;
  show: string | null;
  season: number | null;
  episode: number | null;
  size: number;
  modified: number;
}

export interface LibraryState {
  items: MediaItem[];
  scanning: boolean;
  scannedAt: number | null;
  error: string | null;
}

export interface HourForecast {
  at: number;
  temperature: number;
  code: number;
  isDay: boolean;
}

export interface WeatherNow {
  temperature: number;
  code: number;
  isDay: boolean;
  high: number;
  low: number;
  city: string;
  at: number;
  /** Today's sunrise and sunset (ms), for the dusk and night skies. */
  sunrise: number | null;
  sunset: number | null;
  /** The next six hours. */
  hourly: HourForecast[];
}

export interface CoinPrice {
  symbol: string;
  price: number;
  change: number;
}

export interface Feeds {
  weather: WeatherNow | null;
  weatherError: string | null;
  coins: CoinPrice[];
  coinsAt: number | null;
  coinsError: string | null;
  online: boolean;
}

export interface SystemInfo {
  appMemoryMb: number;
  freeMemoryMb: number;
  totalMemoryMb: number;
  uptimeHours: number;
  version: string;
}

/** An installed app found in the Start menu. */
export interface InstalledApp {
  name: string;
  appId: string;
}

export interface LaunchResult {
  ok: boolean;
  via?: LaunchTarget['kind'];
  error?: string;
}
