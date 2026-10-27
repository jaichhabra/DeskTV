import { app, net } from 'electron';
import { join } from 'node:path';
import type { CoinPrice, Config, Feeds } from '../shared/types';
import { JsonFile } from './store';
import { log } from './log';

const WEATHER_EVERY = 30 * 60_000;
const COINS_EVERY = 5 * 60_000;

/**
 * Weather (Open-Meteo, no key) and optional crypto prices (Binance's public ticker), as SundarTV has them. Fetched
 * only while a widget needs them and the window is showing; the last values stay on disk with their time, so the
 * home screen opens with them even offline. Nothing here can stop the home screen from opening.
 */
export class FeedService {
  private file = new JsonFile<Feeds>(join(app.getPath('userData'), 'feeds.json'));
  private state: Feeds = { weather: null, weatherError: null, coins: [], coinsAt: null, coinsError: null, online: true };
  private timer: ReturnType<typeof setInterval> | null = null;
  private weatherAt = 0;
  private coinsTriedAt = 0;
  private active = true;

  constructor(
    private readonly config: () => Config,
    private readonly saveLocation: (lat: number, lon: number, city: string) => void,
    private readonly emit: (f: Feeds) => void
  ) {
    const raw = this.file.read() as Feeds | null;
    if (raw && typeof raw === 'object') {
      this.state = { ...this.state, weather: raw.weather ?? null, coins: Array.isArray(raw.coins) ? raw.coins : [], coinsAt: raw.coinsAt ?? null };
    }
  }

  get(): Feeds {
    return this.state;
  }

  start(): void {
    this.timer = setInterval(() => void this.tick(), 60_000);
    void this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Paused while DeskTV is minimized or behind a full-screen app. */
  setActive(on: boolean): void {
    this.active = on;
    if (on) void this.tick();
  }

  async refresh(): Promise<Feeds> {
    this.weatherAt = 0;
    this.coinsTriedAt = 0;
    await this.tick(true);
    return this.state;
  }

  private async tick(force = false): Promise<void> {
    if (!this.active && !force) return;
    const c = this.config();
    this.state.online = net.isOnline();
    if (!this.state.online) {
      this.emit(this.state);
      return;
    }
    const now = Date.now();
    const wantWeather = c.widgets.weather || (c.screensaver.enabled && c.screensaver.weather);
    if (wantWeather && (c.weather.city || c.weather.lat !== null) && now - this.weatherAt > WEATHER_EVERY) {
      this.weatherAt = now;
      await this.fetchWeather(c);
    }
    if (c.widgets.crypto && c.crypto.coins.length && now - this.coinsTriedAt > COINS_EVERY) {
      this.coinsTriedAt = now;
      await this.fetchCoins(c.crypto.coins);
    }
    void this.file.write(this.state);
    this.emit(this.state);
  }

  private async fetchWeather(c: Config): Promise<void> {
    try {
      let { lat, lon } = c.weather;
      let city = c.weather.city;
      if (lat === null || lon === null) {
        const geo = await json(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`);
        const hit = (geo as { results?: { latitude: number; longitude: number; name: string }[] }).results?.[0];
        if (!hit) throw new Error(`Couldn't find "${city}"`);
        lat = hit.latitude;
        lon = hit.longitude;
        city = hit.name;
        this.saveLocation(lat, lon, city);
      }
      const unit = c.weather.fahrenheit ? '&temperature_unit=fahrenheit' : '';
      const data = (await json(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto${unit}`
      )) as {
        current: { temperature_2m: number; weather_code: number; is_day: number };
        daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
      };
      this.state.weather = {
        temperature: Math.round(data.current.temperature_2m),
        code: data.current.weather_code,
        isDay: data.current.is_day === 1,
        high: Math.round(data.daily.temperature_2m_max[0]),
        low: Math.round(data.daily.temperature_2m_min[0]),
        city,
        at: Date.now()
      };
      this.state.weatherError = null;
    } catch (e) {
      this.state.weatherError = e instanceof Error ? e.message : 'Weather unavailable';
      log('warn', 'Weather failed', e);
    }
  }

  private async fetchCoins(coins: string[]): Promise<void> {
    const symbols = JSON.stringify(coins.map((c) => `${c}USDT`));
    for (const host of ['https://api.binance.com', 'https://api.binance.us']) {
      try {
        const data = (await json(`${host}/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`)) as {
          symbol: string;
          lastPrice: string;
          priceChangePercent: string;
        }[];
        this.state.coins = data.map(
          (d): CoinPrice => ({ symbol: d.symbol.replace(/USDT$/, ''), price: Number(d.lastPrice), change: Number(d.priceChangePercent) })
        );
        this.state.coinsAt = Date.now();
        this.state.coinsError = null;
        return;
      } catch (e) {
        log('warn', `Prices from ${host} failed`, e);
      }
    }
    this.state.coinsError = 'Prices unavailable';
  }
}

async function json(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await net.fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}
