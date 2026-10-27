import { useState, type ReactNode } from 'react';
import { ROW_TITLES } from '../../../shared/config';
import type { Config, HeroMode, Motion, TileSize } from '../../../shared/types';
import { desk, report } from '../api';
import { useDeskContext } from '../context';
import { Cycler } from '../components/Overlays';
import { TopBar } from './TopBar';

const ACCENTS: { hex: string; name: string }[] = [
  { hex: '#0A84FF', name: 'Blue' },
  { hex: '#64D2FF', name: 'Sky' },
  { hex: '#30D158', name: 'Green' },
  { hex: '#FFD60A', name: 'Gold' },
  { hex: '#FF9F0A', name: 'Amber' },
  { hex: '#FF453A', name: 'Red' },
  { hex: '#E5E5EA', name: 'Silver' }
];
const IDLE = [1, 2, 5, 10, 15, 30, 60];
const SCALES: Config['display']['scale'][] = ['auto', 0.8, 0.9, 1, 1.1, 1.2, 1.35, 1.5];
const SAFE = [0, 2.5, 5, 7.5, 10];
const COIN_SETS = [['BTC', 'ETH'], ['BTC'], ['BTC', 'ETH', 'SOL'], ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE']];

function step<T>(all: readonly T[], v: T, dir: 1 | -1): T {
  const i = all.findIndex((x) => JSON.stringify(x) === JSON.stringify(v));
  return all[(Math.max(0, i) + dir + all.length) % all.length];
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="setting" data-row>
      <div className="setting-text">
        <span className="setting-label">{label}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

function Toggle({ on, set, k }: { on: boolean; set(v: boolean): void; k: string }) {
  return (
    <button className={`toggle${on ? ' on' : ''}`} data-item data-key={k} role="switch" aria-checked={on} onClick={() => set(!on)}>
      <span className="toggle-knob" />
      <span className="toggle-text">{on ? 'On' : 'Off'}</span>
    </button>
  );
}

function Action({ label, run, k, danger }: { label: string; run(): void; k: string; danger?: boolean }) {
  return (
    <button className={`pill${danger ? ' danger' : ''}`} data-item data-key={k} onClick={run}>
      {label}
    </button>
  );
}

/** Every setting, reachable with arrows and Enter; left and right change a value in place. */
export function SettingsPage() {
  const d = useDeskContext();
  const c = d.config;
  const set = (fn: (c: Config) => void): void =>
    void d.save((x) => {
      fn(x);
      return x;
    });
  const [city, setCity] = useState(c.weather.city);
  const displays = d.display?.displays ?? [];
  const screen = d.display?.current;
  const L = d.layout;

  return (
    <div className="page settings" data-scope="settings" data-scroller>
      <TopBar title="Settings" />
      <div className="page-body settings-body">
        <Section title="Home screen">
          <Row label="Top of the screen" hint="What the big area above the dock shows.">
            <Cycler k="hero" value={{ greeting: 'Greeting', featured: 'A featured app', recent: 'Last opened' }[c.hero.mode]} onStep={(s) => set((x) => void (x.hero.mode = step<HeroMode>(['greeting', 'featured', 'recent'], x.hero.mode, s)))} />
          </Row>
          {c.hero.mode !== 'recent' && (
            <Row label="Featured app">
              <Cycler
                k="featured"
                value={c.apps.find((a) => a.id === c.hero.featuredAppId)?.name ?? 'First in the dock'}
                onStep={(s) => set((x) => void (x.hero.featuredAppId = step([null, ...x.apps.filter((a) => !a.hidden).map((a) => a.id)], x.hero.featuredAppId, s)))}
              />
            </Row>
          )}
          <Row label="Background picture" hint={c.hero.image ? c.hero.image.split(/[\\/]/).pop() : 'Light that follows the weather and the hour.'}>
            <Action k="hero:image" label="Choose…" run={() => desk.pickImage().then((p) => p && set((x) => void (x.hero.image = p)), report)} />
            {c.hero.image && <Action k="hero:noimage" label="Remove" run={() => set((x) => void (x.hero.image = null))} />}
          </Row>
          <Row label="Tile size">
            <Cycler k="tiles" value={{ small: 'Small', medium: 'Medium', large: 'Large' }[c.appearance.tileSize]} onStep={(s) => set((x) => void (x.appearance.tileSize = step<TileSize>(['small', 'medium', 'large'], x.appearance.tileSize, s)))} />
          </Row>
          <Row label="Accent color">
            <Cycler
              k="accent"
              value={
                <>
                  <span className="swatch" style={{ background: c.appearance.accent }} /> {ACCENTS.find((a) => a.hex.toLowerCase() === c.appearance.accent.toLowerCase())?.name ?? 'Custom'}
                </>
              }
              onStep={(s) => set((x) => void (x.appearance.accent = step(ACCENTS.map((a) => a.hex), x.appearance.accent.toUpperCase(), s)))}
            />
          </Row>
          <Row label="Motion" hint="Reduced keeps focus and fades, without the travel.">
            <Cycler k="motion" value={{ full: 'Full', reduced: 'Reduced', off: 'Off' }[c.appearance.motion]} onStep={(s) => set((x) => void (x.appearance.motion = step<Motion>(['full', 'reduced', 'off'], x.appearance.motion, s)))} />
          </Row>
          {c.rows.map((r, i) => (
            <Row key={r.kind} label={`Row: ${ROW_TITLES[r.kind]}`} hint={i === 0 ? 'Rows with nothing in them stay hidden.' : undefined}>
              <Toggle k={`row:${r.kind}`} on={r.visible} set={(v) => set((x) => void (x.rows[i].visible = v))} />
              <Action k={`row:${r.kind}:up`} label="Move up" run={() => set((x) => {
                if (i > 0) [x.rows[i - 1], x.rows[i]] = [x.rows[i], x.rows[i - 1]];
              })} />
            </Row>
          ))}
        </Section>

        <Section title="Widgets">
          <Row label="Large clock">
            <Toggle k="w:clock" on={c.widgets.clock} set={(v) => set((x) => void (x.widgets.clock = v))} />
          </Row>
          <Row label="Weather" hint="From Open-Meteo. No account needed.">
            <Toggle k="w:weather" on={c.widgets.weather} set={(v) => set((x) => void (x.widgets.weather = v))} />
          </Row>
          <Row label="City" hint={c.weather.lat !== null ? `Found: ${c.weather.city}` : 'Type your city, then Save.'}>
            <input className="text-input" data-item data-key="city" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" />
            <Action
              k="city:save"
              label="Save"
              run={() => {
                set((x) => {
                  x.weather.city = city.trim();
                  x.weather.lat = null;
                  x.weather.lon = null;
                });
                setTimeout(() => void desk.refreshFeeds().catch(report), 300);
              }}
            />
          </Row>
          <Row label="Temperature">
            <Cycler k="units" value={c.weather.fahrenheit ? 'Fahrenheit' : 'Celsius'} onStep={() => set((x) => void (x.weather.fahrenheit = !x.weather.fahrenheit))} />
          </Row>
          <Row label="Crypto prices" hint="From Binance's public prices, every 5 minutes, in USDT.">
            <Toggle k="w:crypto" on={c.widgets.crypto} set={(v) => set((x) => void (x.widgets.crypto = v))} />
            {c.widgets.crypto && <Cycler k="coins" value={c.crypto.coins.join(', ')} onStep={(s) => set((x) => void (x.crypto.coins = step(COIN_SETS, x.crypto.coins, s)))} />}
          </Row>
          <Row label="Network status">
            <Toggle k="w:network" on={c.widgets.network} set={(v) => set((x) => void (x.widgets.network = v))} />
          </Row>
          <Row label="System information">
            <Toggle k="w:system" on={c.widgets.system} set={(v) => set((x) => void (x.widgets.system = v))} />
          </Row>
        </Section>

        <Section title="Screensaver">
          <Row label="Screensaver">
            <Toggle k="s:on" on={c.screensaver.enabled} set={(v) => set((x) => void (x.screensaver.enabled = v))} />
            <Action k="s:preview" label="Preview" run={d.startSaver} />
          </Row>
          <Row label="Starts after">
            <Cycler k="s:idle" value={`${c.screensaver.idleMinutes} min`} onStep={(s) => set((x) => void (x.screensaver.idleMinutes = step(IDLE, x.screensaver.idleMinutes, s)))} />
          </Row>
          <Row label="Quotes">
            <Toggle k="s:quotes" on={c.screensaver.quotes} set={(v) => set((x) => void (x.screensaver.quotes = v))} />
          </Row>
          <Row label="Weather on the screensaver">
            <Toggle k="s:weather" on={c.screensaver.weather} set={(v) => set((x) => void (x.screensaver.weather = v))} />
          </Row>
          <Row label="Photos" hint={c.screensaver.photoFolder ?? 'Slow light, or pictures from a folder you choose.'}>
            <Action k="s:photos" label="Choose folder…" run={() => desk.pickFolder().then((p) => p && set((x) => void (x.screensaver.photoFolder = p)), report)} />
            {c.screensaver.photoFolder && <Action k="s:nophotos" label="Remove" run={() => set((x) => void (x.screensaver.photoFolder = null))} />}
          </Row>
        </Section>

        <Section title="Apps">
          <Row label="All apps" hint="Open, pin, move, edit or hide any app.">
            <Action k="apps:open" label="Manage apps" run={() => d.go('apps')} />
            <Action k="apps:add" label="Add an app" run={() => d.editApp(null)} />
          </Row>
        </Section>

        <Section title="Library">
          {c.library.folders.map((f) => (
            <Row key={f.path} label={f.path} hint={{ movies: 'Movies', shows: 'TV shows', music: 'Music', photos: 'Photos' }[f.kind]}>
              <Action
                k={`lib:rm:${f.path}`}
                label="Remove"
                run={() => {
                  set((x) => void (x.library.folders = x.library.folders.filter((y) => y.path !== f.path)));
                  setTimeout(() => void desk.rescanLibrary().catch(report), 300);
                }}
              />
            </Row>
          ))}
          <Row label="Folders" hint="DeskTV only reads the folders you add.">
            <Action k="lib:manage" label="Open Library" run={() => d.go('library')} />
          </Row>
          <Row label="Play files with" hint="VLC when it's installed; otherwise Windows' default app.">
            <Cycler k="player" value={c.library.player === 'vlc' ? 'VLC' : "Windows' default app"} onStep={() => set((x) => void (x.library.player = x.library.player === 'vlc' ? 'system' : 'vlc'))} />
          </Row>
        </Section>

        <Section title="Screen and TV mode">
          <Row label="TV mode" hint="Full screen, without the taskbar. F11 switches it too.">
            <Toggle k="tv:now" on={!!d.display?.fullscreen} set={(v) => void desk.setTvMode(v).catch(report)} />
          </Row>
          <Row label="Open in TV mode">
            <Toggle k="tv:start" on={c.tv.startInTvMode} set={(v) => set((x) => void (x.tv.startInTvMode = v))} />
          </Row>
          <Row label="Start with Windows" hint="Opens DeskTV when you sign in to Windows.">
            <Toggle k="tv:login" on={c.tv.startWithWindows} set={(v) => set((x) => void (x.tv.startWithWindows = v))} />
          </Row>
          <Row label="Screen" hint="DeskTV moves to the main screen while this one is off.">
            <Cycler
              k="display"
              value={c.display.preferredDisplayId === null ? 'Main screen' : (displays.find((x) => x.id === c.display.preferredDisplayId)?.label ?? 'Not connected')}
              onStep={(s) => set((x) => void (x.display.preferredDisplayId = step([null, ...displays.map((y) => y.id)], x.display.preferredDisplayId, s)))}
            />
          </Row>
          <Row label="Size" hint="Automatic follows the screen; change it if text looks too big or small from your seat.">
            <Cycler k="scale" value={c.display.scale === 'auto' ? 'Automatic' : `${Math.round(c.display.scale * 100)}%`} onStep={(s) => set((x) => void (x.display.scale = step(SCALES, x.display.scale, s)))} />
          </Row>
          <Row label="Edge margin" hint="For TVs that cut off the edges of the picture.">
            <Cycler k="safe" value={`${c.display.safeArea}%`} onStep={(s) => set((x) => void (x.display.safeArea = step(SAFE, x.display.safeArea, s)))} />
          </Row>
          {screen && (
            <div className="setting info" data-row>
              <div className="setting-text">
                <span className="setting-label">{screen.label}</span>
                <span className="setting-hint">
                  {screen.physicalWidth} × {screen.physicalHeight} pixels · Windows scaling {Math.round(screen.scaleFactor * 100)}% · {screen.refreshRate} Hz
                  {d.display?.fallback ? ' · measured size unavailable, using 1920 × 1080' : ''}
                  <br />
                  Layout: {L.shape}, {L.columns} tiles across, text {L.rem}px
                </span>
              </div>
            </div>
          )}
        </Section>

        <Section title="DeskTV">
          <Row label="Settings file" hint="Move your setup to another PC.">
            <Action k="cfg:export" label="Export…" run={() => desk.exportConfig().then((ok) => ok && d.toast('Settings exported'), report)} />
            <Action k="cfg:import" label="Import…" run={() => desk.importConfig().then((cfg) => cfg && d.toast('Settings imported'), report)} />
          </Row>
          <Row label="Start over" hint="Back to the original apps and settings.">
            <Action
              k="cfg:reset"
              label="Reset…"
              danger
              run={() => d.menu('Reset all settings?', [{ label: 'Reset', danger: true, run: () => void desk.resetConfig().then(() => d.toast('Settings reset'), report) }, { label: 'Cancel', run: () => undefined }])}
            />
          </Row>
          <Row label="Leave DeskTV" hint="Ctrl + Alt + Home brings it back from any app. The log is in %APPDATA%\DeskTV\logs.">
            <Action k="exit:min" label="Show the desktop" run={() => void desk.minimize()} />
            <Action k="exit:quit" label="Quit" run={() => void desk.quit()} />
          </Row>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h2 className="row-title">{title}</h2>
      <div className="settings-panel">{children}</div>
    </section>
  );
}
