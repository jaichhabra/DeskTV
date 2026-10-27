import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dir } from '../../shared/nav';
import type { AppEntry, MediaItem, MediaKind } from '../../shared/types';
import { desk, report } from './api';
import { DeskContext, popBack, type Desk, type MenuItem, type Page } from './context';
import { focusItem, focusScope } from './focus';
import { useDesk, useLayout } from './hooks';
import { attachInput } from './input';
import { setSounds } from './sounds';
import { AppEditor, MenuOverlay, Toast } from './components/Overlays';
import { Screensaver } from './components/Screensaver';
import { Sky, useSkyState } from './components/Sky';
import { Home } from './pages/Home';
import { AppsSheet } from './pages/AppsSheet';
import { LibrarySheet } from './pages/LibrarySheet';
import { SearchSheet } from './pages/SearchSheet';
import { SettingsPage } from './pages/SettingsPage';

type Layer = { kind: 'menu'; title: string; items: MenuItem[] } | { kind: 'editor'; app: AppEntry | null } | null;

export function App() {
  const { config, library, feeds, display, save } = useDesk();
  if (!config) return <div className="boot" />;
  return <Shell config={config} library={library} feeds={feeds} display={display} save={save} />;
}

function Shell(props: Pick<Desk, 'config' | 'library' | 'feeds' | 'display' | 'save'>) {
  const { config, save } = props;
  const layout = useLayout({ scale: config.display.scale, safeArea: config.display.safeArea, tileSize: config.appearance.tileSize });
  const sky = useSkyState(props.feeds);
  const [page, setPage] = useState<Page>('home');
  const [libraryTab, setLibraryTab] = useState<MediaKind>('movies');
  const [layer, setLayer] = useState<Layer>(null);
  const [saver, setSaver] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [moving, setMoving] = useState<{ id: string; list: string[] } | null>(null);
  const [version, setVersion] = useState('');
  const lastInput = useRef(Date.now());
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    desk.systemInfo().then((i) => setVersion(i.version), report);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = config.appearance.motion;
    setSounds(config.appearance.sounds);
  }, [config.appearance.motion, config.appearance.sounds]);

  const toast = useCallback((text: string) => {
    setToastText(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(null), 4000);
  }, []);

  const go = useCallback((p: Page, tab?: MediaKind) => {
    if (tab) setLibraryTab(tab);
    setPage(p);
    setMoving(null);
  }, []);

  // Each page takes focus when it opens: where you left it, or its first item.
  useEffect(() => {
    if (!layer && !saver) requestAnimationFrame(() => focusScope());
  }, [page, layer, saver]);

  const openApp = useCallback(
    (app: AppEntry) => {
      desk.launchApp(app.id).then((r) => {
        if (!r.ok) toast(r.error ?? `Couldn't open ${app.name}`);
      }, report);
    },
    [toast]
  );

  const openMedia = useCallback(
    (item: MediaItem) => {
      desk.openMedia(item.id).then((r) => {
        if (!r.ok) toast(r.error ?? "Couldn't play that file");
      }, report);
    },
    [toast]
  );

  const reorder = useCallback(
    (id: string, list: string[], dir: -1 | 1) => {
      const i = list.indexOf(id);
      const other = list[i + dir];
      if (i < 0 || !other) return;
      void save((c) => {
        const a = c.apps.findIndex((x) => x.id === id);
        const b = c.apps.findIndex((x) => x.id === other);
        [c.apps[a], c.apps[b]] = [c.apps[b], c.apps[a]];
        return c;
      });
      setMoving((m) => (m ? { ...m, list: list.map((x) => (x === id ? other : x === other ? id : x)) } : m));
    },
    [save]
  );

  const appMenu = useCallback(
    (app: AppEntry, list: string[]) => {
      const set = (fn: (a: AppEntry) => AppEntry): void =>
        void save((c) => ({ ...c, apps: c.apps.map((a) => (a.id === app.id ? fn(a) : a)) }));
      const items: MenuItem[] = [{ label: 'Open', run: () => openApp(app) }];
      items.push(
        app.pinned
          ? { label: 'Remove from Shelf', run: () => set((a) => ({ ...a, pinned: false })) }
          : { label: 'Add to Shelf', run: () => set((a) => ({ ...a, pinned: true, hidden: false })) }
      );
      if (list.length > 1) items.push({ label: 'Move', run: () => setMoving({ id: app.id, list }) });
      items.push({ label: 'Edit…', run: () => setLayer({ kind: 'editor', app }) });
      if (app.hidden) items.push({ label: 'Show', run: () => set((a) => ({ ...a, hidden: false })) });
      else if (app.builtin) items.push({ label: 'Hide', run: () => set((a) => ({ ...a, hidden: true, pinned: false })) });
      if (!app.builtin)
        items.push({
          label: 'Remove',
          danger: true,
          run: () => void save((c) => ({ ...c, apps: c.apps.filter((a) => a.id !== app.id), recent: c.recent.filter((r) => r.id !== app.id) }))
        });
      setLayer({ kind: 'menu', title: app.name, items });
    },
    [openApp, save]
  );

  const power = useCallback(() => {
    setLayer({
      kind: 'menu',
      title: 'DeskTV',
      items: [
        { label: 'Show the Desktop', run: () => void desk.minimize() },
        props.display?.fullscreen
          ? { label: 'Leave TV Mode', run: () => void desk.setTvMode(false) }
          : { label: 'Enter TV Mode', run: () => void desk.setTvMode(true) },
        { label: 'Screensaver', run: () => setSaver(true) },
        { label: 'Quit DeskTV', danger: true, run: () => void desk.quit() },
        { label: 'Cancel', run: () => undefined }
      ]
    });
  }, [props.display?.fullscreen]);

  const back = useCallback(() => {
    if (moving) setMoving(null);
    else if (layer) setLayer(null);
    else if (popBack()) return;
    else if (page !== 'home') go('home');
    else if (document.querySelector('.home.drawer-open')) {
      // Back from the drawer returns to the shelf, as SundarTV's.
      const tile = document.querySelector<HTMLElement>('.shelf [data-item]');
      if (tile) focusItem(tile);
    } else power();
  }, [moving, layer, page, go, power]);

  // Input: arrows, OK, back, controller; and the idle timer for the screensaver.
  const state = useRef({ back, saver, moving, reorder, toggleTv: () => void desk.setTvMode(!props.display?.fullscreen) });
  state.current = { back, saver, moving, reorder, toggleTv: () => void desk.setTvMode(!props.display?.fullscreen) };
  useEffect(
    () =>
      attachInput({
        back: () => state.current.back(),
        poke: () => {
          lastInput.current = Date.now();
          if (state.current.saver) {
            setSaver(false);
            return true;
          }
          return false;
        },
        arrow: (dir: Dir) => {
          const m = state.current.moving;
          if (!m) return false;
          if (dir === 'left' || dir === 'right') state.current.reorder(m.id, m.list, dir === 'left' ? -1 : 1);
          return true;
        },
        toggleTv: () => state.current.toggleTv(),
        search: () => go('search')
      }),
    [go]
  );

  // Keep focus on a tile while it's being moved, through the re-render.
  useEffect(() => {
    if (!moving) return;
    const el = document.querySelector<HTMLElement>(`[data-scope] [data-key="app:${moving.id}"]`);
    if (el) focusItem(el);
  });

  useEffect(() => {
    const s = config.screensaver;
    if (!s.enabled) return;
    const t = setInterval(() => {
      const idle = Date.now() - lastInput.current > s.idleMinutes * 60_000;
      // Only while DeskTV is in front: never over someone watching in another app.
      if (idle && document.hasFocus() && document.visibilityState === 'visible' && !layer) setSaver(true);
    }, 10_000);
    return () => clearInterval(t);
  }, [config.screensaver, layer]);

  useEffect(() => desk.onReturn(() => (lastInput.current = Date.now())), []);

  const value = useMemo<Desk>(
    () => ({
      ...props,
      layout,
      page,
      libraryTab,
      version,
      go,
      // OK on a tile being moved puts it down instead of opening it.
      openApp: (app) => (moving ? setMoving(null) : openApp(app)),
      openMedia,
      menu: (title, items) => setLayer({ kind: 'menu', title, items }),
      appMenu,
      editApp: (app) => setLayer({ kind: 'editor', app }),
      toast,
      moving: moving?.id ?? null,
      startSaver: () => {
        lastInput.current = Date.now();
        setSaver(true);
      },
      power
    }),
    [props, layout, page, libraryTab, version, go, openApp, openMedia, appMenu, toast, moving, power]
  );

  return (
    <DeskContext.Provider value={value}>
      <div className={`shell page-${page}${layer ? ' layered' : ''}`}>
        <Sky sky={sky} moving={config.appearance.motion !== 'off' && !saver} />
        {page === 'home' && <Home />}
        {page === 'apps' && <AppsSheet />}
        {page === 'library' && <LibrarySheet />}
        {page === 'search' && <SearchSheet />}
        {page === 'settings' && <SettingsPage />}
        {moving && <div className="move-hint glass">← → to move, then OK</div>}
        {layer?.kind === 'menu' && <MenuOverlay title={layer.title} items={layer.items} close={() => setLayer(null)} />}
        {layer?.kind === 'editor' && <AppEditor app={layer.app} close={() => setLayer(null)} />}
        {toastText && <Toast text={toastText} />}
        {saver && <Screensaver sky={sky} />}
      </div>
    </DeskContext.Provider>
  );
}
