import { useEffect, useState } from 'react';
import { describeWeather } from '../../../shared/weather';
import type { SystemInfo } from '../../../shared/types';
import { desk, report } from '../api';
import { useDeskContext } from '../context';
import { ago, timeFormat, useOnline } from '../hooks';
import { Glyph } from './Icon';

/** The optional cards beside the hero: weather, prices, network and system. None is on by default except weather. */
export function Widgets() {
  const d = useDeskContext();
  const w = d.config.widgets;
  if (!w.weather && !w.crypto && !w.network && !w.system) return null;
  return (
    <aside className="widgets" aria-label="Widgets">
      {w.weather && <WeatherCard />}
      {w.crypto && <CryptoCard />}
      {(w.network || w.system) && <StatusCard network={w.network} system={w.system} />}
    </aside>
  );
}

function WeatherCard() {
  const d = useDeskContext();
  const f = d.feeds;
  const unit = d.config.weather.fahrenheit ? '°F' : '°C';
  if (!d.config.weather.city && d.config.weather.lat === null) {
    return (
      <div className="card">
        <div className="card-label">Weather</div>
        <div className="card-note">Add your city in Settings to see the weather.</div>
      </div>
    );
  }
  const now = f?.weather;
  if (!now) {
    return (
      <div className="card">
        <div className="card-label">Weather</div>
        <div className="card-note">{f?.weatherError ?? (f?.online === false ? 'Offline' : 'Loading…')}</div>
      </div>
    );
  }
  const desc = describeWeather(now.code);
  return (
    <div className="card weather-card">
      <div className="card-label">{now.city}</div>
      <div className="weather-now">
        <span className="weather-temp">{now.temperature}°</span>
        <span className="weather-desc">
          {desc.text}
          <span className="card-note">
            H {now.high}{unit} · L {now.low}{unit}
          </span>
        </span>
      </div>
      {(f.weatherError || Date.now() - now.at > 3600_000) && <div className="card-note stale">Updated {ago(now.at)}</div>}
    </div>
  );
}

const money = (n: number): string =>
  n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 4 : 2 });

function CryptoCard() {
  const d = useDeskContext();
  const f = d.feeds;
  return (
    <div className="card">
      <div className="card-label">Prices · USDT</div>
      {f?.coins.length ? (
        <ul className="coins">
          {f.coins.map((c) => (
            <li key={c.symbol}>
              <span className="coin-symbol">{c.symbol}</span>
              <span className="coin-price">{money(c.price)}</span>
              <span className={`coin-change ${c.change >= 0 ? 'up' : 'down'}`}>
                {c.change >= 0 ? '+' : ''}
                {c.change.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="card-note">
        {f?.coinsError ? `${f.coinsError}. ` : ''}
        {f?.coinsAt ? `Updated ${ago(f.coinsAt)}` : f?.coinsError ? '' : 'Loading…'}
      </div>
    </div>
  );
}

function StatusCard({ network, system }: { network: boolean; system: boolean }) {
  const d = useDeskContext();
  const online = useOnline() && d.feeds?.online !== false;
  const [info, setInfo] = useState<SystemInfo | null>(null);
  useEffect(() => {
    if (!system) return;
    const load = (): void => void desk.systemInfo().then(setInfo, report);
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [system]);
  const screen = d.display?.current;
  return (
    <div className="card status-card">
      {network && (
        <div className="status-line">
          <Glyph name={online ? 'wifi' : 'offline'} />
          <span>{online ? 'Online' : 'Offline'}</span>
        </div>
      )}
      {system && info && (
        <>
          <div className="status-line">
            <span className="card-label">Memory</span>
            <span>
              {Math.round((info.totalMemoryMb - info.freeMemoryMb) / 1024)} / {Math.round(info.totalMemoryMb / 1024)} GB
            </span>
          </div>
          {screen && (
            <div className="status-line">
              <span className="card-label">Screen</span>
              <span>
                {screen.physicalWidth} × {screen.physicalHeight} · {Math.round(screen.scaleFactor * 100)}%
              </span>
            </div>
          )}
          <div className="status-line">
            <span className="card-label">DeskTV</span>
            <span>{info.appMemoryMb} MB</span>
          </div>
        </>
      )}
    </div>
  );
}

export function SmallClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return <span className="small-clock">{timeFormat.format(now)}</span>;
}
