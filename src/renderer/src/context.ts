import { createContext, useContext } from 'react';
import type { Layout } from '../../shared/layout';
import type { AppEntry, Config, DisplayState, Feeds, LibraryState, MediaItem } from '../../shared/types';
import type { LiveConfig } from './api';

export type Page = 'home' | 'apps' | 'library' | 'search' | 'settings';

export interface MenuItem {
  label: string;
  run(): void;
  danger?: boolean;
}

export interface Desk {
  config: LiveConfig;
  library: LibraryState;
  feeds: Feeds | null;
  display: DisplayState | null;
  layout: Layout;
  page: Page;
  save(fn: (c: Config) => Config): Promise<void>;
  go(page: Page): void;
  openApp(app: AppEntry): void;
  openMedia(item: MediaItem): void;
  menu(title: string, items: MenuItem[]): void;
  appMenu(app: AppEntry, list: string[]): void;
  editApp(app: AppEntry | null): void;
  toast(text: string): void;
  /** The app being moved with the arrows, if any. */
  moving: string | null;
  startSaver(): void;
  power(): void;
}

export const DeskContext = createContext<Desk | null>(null);

export function useDeskContext(): Desk {
  const d = useContext(DeskContext);
  if (!d) throw new Error('No DeskTV context');
  return d;
}

export function isAvailable(config: LiveConfig, app: AppEntry): boolean {
  return !config.available || config.available.includes(app.id);
}
