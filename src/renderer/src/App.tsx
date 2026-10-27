import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dir } from '../../shared/nav';
import type { AppEntry, MediaItem } from '../../shared/types';
import { desk, report } from './api';
import { DeskContext, type Desk, type MenuItem, type Page } from './context';
import { focusScope, focusItem } from './focus';
import { useDesk, useLayout } from './hooks';
import { attachInput } from './input';
import { Atmosphere } from './components/Atmosphere';
import { AppEditor, MenuOverlay, Toast } from './components/Overlays';
import { Screensaver } from './components/Screensaver';
import { Home } from './pages/Home';
import { AppsPage } from './pages/AppsPage';
import { LibraryPage } from './pages/LibraryPage';
import { SearchPage } from './pages/SearchPage';
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
  const [page, setPage] = useState<Page>('home');
  const [layer, setLayer] = useState<Layer>(null);
  const [saver, setSaver] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [moving, setMoving] = useState<{ id: string; list: string[] } | null>(null);
  const lastInput = useRef(Date.now());
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Accent and motion live on the root so every component follows them.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', config.appearance.accent);
    root.dataset.motion = config.appearance.motion;
  }, [config.appearance.accent, config.appearance.motion]);

  const toast = useCallback((text: string) => {
    setToastText(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(null), 4000);
  }, []);

  const go = useCallback((p: Page) => {
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
      items.push(app.pinned ? { label: 'Remove from dock', run: () => set((a) => ({ ...a, pinned: false })) } : { label: 'Add to dock', run: () => set((a) => ({ ...a, pinned: true, hidden: false })) });
      if (list.length > 1) items.push({ label: 'Move', run: () => setMoving({ id: app.id, list }) });
      items.push({ label: 'Edit…', run: () => setLayer({ kind: 'editor', app }) });
      if (app.hidden) items.push({ label: 'Show on the home screen', run: () => set((a) => ({ ...a, hidden: false })) });
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
        { label: 'Show the desktop', run: () => void desk.minimize() },
        props.display?.fullscreen
          ? { label: 'Leave TV mode', run: () => void desk.setTvMode(false) }
          : { label: 'Enter TV mode', run: () => void desk.setTvMode(true) },
        { label: 'Screensaver', run: () => setSaver(true) },
        { label: 'Quit DeskTV', danger: true, run: () => void desk.quit() },
        { label: 'Cancel', run: () => undefined }
      ]
    });
  }, [props.display?.fullscreen]);

  const back = useCallback(() => {
    if (moving) setMoving(null);
    else if (layer) setLayer(null);
    else if (page !== 'home') go('home');
    else power();
  }, [moving, layer, page, go, power]);

  // Input: arrows, Enter, back, controller; and the idle timer for the screensaver.
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
      go,
      // Enter on a tile being moved puts it down instead of opening it.
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
    [props, layout, page, go, openApp, openMedia, appMenu, toast, moving, power]
  );

  return (
    <DeskContext.Provider value={value}>
      <div className={`shell${layer ? ' layered' : ''}`}>
        <Atmosphere dim={page !== 'home'} />
        {page === 'home' && <Home />}
        {page === 'apps' && <AppsPage />}
        {page === 'library' && <LibraryPage />}
        {page === 'search' && <SearchPage />}
        {page === 'settings' && <SettingsPage />}
        {moving && <div className="move-hint glass">Use ← → to move, then Enter or Back</div>}
        {layer?.kind === 'menu' && <MenuOverlay title={layer.title} items={layer.items} close={() => setLayer(null)} />}
        {layer?.kind === 'editor' && <AppEditor app={layer.app} close={() => setLayer(null)} />}
        {toastText && <Toast text={toastText} />}
        {saver && <Screensaver />}
      </div>
    </DeskContext.Provider>
  );
}
