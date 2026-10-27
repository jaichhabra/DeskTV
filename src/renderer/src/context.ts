import { createContext, useContext } from 'react';
import type { Layout } from '../../shared/layout';
import type { AppEntry, Config, DisplayState, Feeds, LibraryState, MediaItem, MediaKind } from '../../shared/types';
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
  /** The tab the Library opens on. */
  libraryTab: MediaKind;
  version: string;
  save(fn: (c: Config) => Config): Promise<void>;
  go(page: Page, tab?: MediaKind): void;
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

/**
 * Back goes to the newest of these first (a settings sub-screen, say), before the page or overlay closes.
 * Returns the function that removes it.
 */
const backStack: (() => void)[] = [];

export function pushBack(fn: () => void): () => void {
  backStack.push(fn);
  return () => {
    const i = backStack.lastIndexOf(fn);
    if (i >= 0) backStack.splice(i, 1);
  };
}

export function popBack(): boolean {
  const fn = backStack.pop();
  if (!fn) return false;
  fn();
  return true;
}
