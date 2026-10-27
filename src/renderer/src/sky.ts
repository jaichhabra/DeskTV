/**
 * SundarTV's weather sky (WeatherSky.java), drawn the same way: small (320 × 180) and soft, then scaled up with
 * grain, stars, the moon and, when it rains, drops on the glass. Precip moves the rain, snow and lightning on top.
 */
export type SkyKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'heavy' | 'snow' | 'storm';
export type Look = 'day' | 'dusk' | 'night';

export const SW = 320;
export const SH = 180;

export function skyKind(code: number | null): SkyKind {
  if (code === null || code < 0) return 'clear';
  const c = code;
  if (c <= 1) return 'clear';
  if (c === 2) return 'partly';
  if (c === 3) return 'cloudy';
  if (c === 45 || c === 48) return 'fog';
  if (c >= 51 && c <= 57) return 'drizzle';
  if (c === 65 || c === 67 || c === 82) return 'heavy';
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if (c >= 95) return 'storm';
  return 'cloudy';
}

/** Around sunset (70 minutes before to 50 after) and sunrise (40 before to 50 after): dusk. Without times, the hour. */
export function skyLook(now: number, sunrise: number | null, sunset: number | null): Look {
  const m = 60_000;
  if (sunrise && sunset) {
    // Today's times move to the same day as `now`, so a cached forecast keeps working.
    const day = 86_400_000;
    const shift = (t: number): number => t + Math.round((now - t) / day) * day;
    const rise = shift(sunrise);
    const set = shift(sunset);
    if ((now > set - 70 * m && now < set + 50 * m) || (now > rise - 40 * m && now < rise + 50 * m)) return 'dusk';
    return now > rise && now < set ? 'day' : 'night';
  }
  const h = new Date(now).getHours();
  if (h === 6 || h === 18) return 'dusk';
  return h > 6 && h < 18 ? 'day' : 'night';
}

const wet = (k: SkyKind): boolean => k === 'drizzle' || k === 'rain' || k === 'heavy' || k === 'storm';

function colors(kind: SkyKind, look: Look): string[] {
  if (look === 'dusk') {
    switch (kind) {
      case 'clear':
      case 'partly':
        return ['#26356A', '#4C5490', '#8A7EA9', '#D3A38E'];
      case 'cloudy':
        return ['#353C5C', '#5E5F82', '#8C7F95', '#B98F8A'];
      case 'fog':
        return ['#555B74', '#7B7891', '#A295A3', '#C4A6A2'];
      case 'snow':
        return ['#485274', '#6F7299', '#9C93B2', '#C7A9AF'];
      case 'storm':
        return ['#20263A', '#353A52', '#4E4D63', '#6A5F6C'];
      default:
        return ['#303750', '#474E68', '#625F79', '#85737F'];
    }
  }
  if (look === 'night') {
    switch (kind) {
      case 'clear':
        return ['#0A0F27', '#171D40', '#2A305E'];
      case 'partly':
        return ['#0E1433', '#1D2350', '#323868'];
      case 'cloudy':
        return ['#161A2E', '#242942', '#353A57'];
      case 'fog':
        return ['#20242D', '#2E333D', '#40454F'];
      case 'snow':
        return ['#1A2236', '#2A344E', '#3D4965'];
      case 'storm':
        return ['#0C101C', '#171C2C', '#232A3B'];
      default:
        return ['#121826', '#1D2536', '#2B3446'];
    }
  }
  switch (kind) {
    case 'clear':
      return ['#2C5BA4', '#4A81C3', '#9DC1E5'];
    case 'partly':
      return ['#3762A4', '#5889C2', '#A2BFDD'];
    case 'cloudy':
      return ['#4B5E76', '#6C8097', '#9AACBE'];
    case 'fog':
      return ['#636E7C', '#85909E', '#AEB7C1'];
    case 'drizzle':
      return ['#465469', '#5D6B80', '#7C899B'];
    case 'rain':
      return ['#3A4557', '#4F5B6E', '#6B7788'];
    case 'heavy':
      return ['#303A4A', '#445062', '#5D697A'];
    case 'snow':
      return ['#5A6D87', '#7D90A9', '#AEBED0'];
    default:
      return ['#242C39', '#374152', '#4E5969'];
  }
}

/** The glass on this sky: its top color a shade deeper, as SundarTV's (and Apple's) cards. */
export function glassTint(kind: SkyKind, look: Look): string {
  const top = colors(kind, look)[0];
  const n = parseInt(top.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.85);
  const g = Math.round(((n >> 8) & 255) * 0.85);
  const b = Math.round((n & 255) * 0.9);
  return `${r}, ${g}, ${b}`;
}

/** Java's Random isn't needed, only a repeatable one: the same sky for the same weather and hour. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.45, rgba(color, a * 0.35));
  g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function clouds(c: CanvasRenderingContext2D, rnd: () => number, count: number, color: string, a: number, y0: number, y1: number): void {
  for (let i = 0; i < count; i++) {
    const cx = SW * (rnd() * 1.2 - 0.1);
    const cy = SH * (y0 + rnd() * (y1 - y0));
    const size = SW * (0.12 + rnd() * 0.12);
    for (let j = 0; j < 8; j++) {
      const dx = (rnd() - 0.5) * size * 1.8;
      const dy = -rnd() * size * 0.45;
      const r = size * (0.35 + rnd() * 0.35) * (1 - Math.abs(dx) / (size * 1.6));
      glow(c, cx + dx, cy + dy, Math.max(4, r), color, a);
    }
  }
}

function cirrus(c: CanvasRenderingContext2D, rnd: () => number, color: string, a: number): void {
  for (let i = 0; i < 16; i++) {
    const cx = rnd() * SW * 1.1 - SW * 0.05;
    const cy = SH * (0.04 + rnd() * 0.55);
    const len = SW * (0.12 + rnd() * 0.3);
    const thick = 1.2 + rnd() * 2.4;
    const angle = ((-8 - rnd() * 8) * Math.PI) / 180;
    const alpha = a * (0.5 + rnd() * 0.5);
    c.save();
    c.translate(cx, cy);
    c.rotate(angle);
    c.fillStyle = rgba(color, alpha);
    c.beginPath();
    c.ellipse(0, 0, len / 2, thick / 2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = rgba(color, a * 0.25);
    c.beginPath();
    c.ellipse(0, 0, len * 0.6, thick * 2, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

const CITY_LIGHTS = ['#FFA94D', '#FF5E5B', '#4FD1C5', '#FFE8C2', '#5B8CFF', '#FFC857'];

/** The small sky: gradient, the sun's glow, cirrus, clouds, fog, city lights in the rain at night. */
function paintSmall(kind: SkyKind, look: Look, rnd: () => number): HTMLCanvasElement {
  const small = document.createElement('canvas');
  small.width = SW;
  small.height = SH;
  const c = small.getContext('2d')!;
  const night = look === 'night';
  const dusk = look === 'dusk';
  const sky = colors(kind, look);
  const g = c.createLinearGradient(0, 0, 0, SH);
  sky.forEach((col, i) => g.addColorStop(i / (sky.length - 1), col));
  c.fillStyle = g;
  c.fillRect(0, 0, SW, SH);
  const cloud = dusk ? '#B9A3C6' : night ? '#474A75' : '#FFFFFF';

  if (kind === 'clear' || kind === 'partly') {
    if (dusk) glow(c, SW * 0.7, SH * 1.02, SW * 0.6, '#FFC9A2', 0.45);
    else if (!night) {
      glow(c, SW * 0.84, SH * 0.06, SW * 0.5, '#FFF4DC', 0.5);
      glow(c, SW * 0.84, SH * 0.06, SW * 0.1, '#FFFFFF', 0.8);
    }
    cirrus(c, rnd, night ? '#8A8FC0' : dusk ? '#E8D4E4' : '#FFFFFF', night ? 0.14 : 0.26);
  }
  if (kind === 'partly') clouds(c, rnd, 4, cloud, night ? 0.75 : 0.8, 0.05, 0.45);
  if (kind === 'cloudy') {
    clouds(c, rnd, 5, night ? '#2A2F48' : dusk ? '#6E6788' : '#8597AA', 0.8, -0.05, 0.35);
    clouds(c, rnd, 6, cloud, night ? 0.55 : 0.6, 0.1, 0.7);
  }
  if (kind === 'snow') clouds(c, rnd, 6, cloud, 0.5, -0.05, 0.4);
  if (kind === 'storm') {
    clouds(c, rnd, 7, night ? '#161A28' : '#2A303C', 0.85, -0.08, 0.4);
    clouds(c, rnd, 4, night ? '#2A3044' : '#566170', 0.6, 0.15, 0.6);
  }
  if (kind === 'fog') {
    for (let i = 0; i < 7; i++) {
      const y = SH * (0.2 + i * 0.12 + rnd() * 0.05);
      const fg = c.createLinearGradient(0, y - SH * 0.08, 0, y + SH * 0.08);
      const col = night ? '#5A626E' : '#D5DAE0';
      fg.addColorStop(0, rgba(col, 0));
      fg.addColorStop(0.5, rgba(col, 0.4));
      fg.addColorStop(1, rgba(col, 0));
      c.fillStyle = fg;
      c.fillRect(0, y - SH * 0.08, SW, SH * 0.16);
    }
  }
  if (wet(kind)) {
    clouds(c, rnd, 5, night ? '#2A3548' : dusk ? '#5E5A72' : '#6F7B8C', 0.55, -0.05, 0.5);
    if (night) {
      for (let i = 0; i < 40; i++) {
        const x = rnd() * SW;
        const y = SH * (0.35 + rnd() * 0.65);
        const r = 3 + rnd() * 11;
        glow(c, x, y, r, CITY_LIGHTS[Math.floor(rnd() * CITY_LIGHTS.length)], 0.45 + rnd() * 0.4);
      }
    }
  }
  return small;
}

function blurred(src: HTMLCanvasElement, px: number, tint?: [string, number]): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = SW;
  out.height = SH;
  const c = out.getContext('2d')!;
  // Edges blur against themselves, not transparency.
  c.filter = `blur(${px}px)`;
  c.drawImage(src, -px * 2, -px * 2, SW + px * 4, SH + px * 4);
  c.filter = 'none';
  if (tint) {
    c.fillStyle = rgba(tint[0], tint[1]);
    c.fillRect(0, 0, SW, SH);
  }
  return out;
}

function grain(c: CanvasRenderingContext2D, w: number, h: number, amount: number, rnd: () => number): void {
  // A small tile of noise repeated: enough to break up banding in the gradients.
  const n = 128;
  const tile = document.createElement('canvas');
  tile.width = n;
  tile.height = n;
  const tc = tile.getContext('2d')!;
  const img = tc.createImageData(n, n);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd() < 0.5 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.round(rnd() * amount * 2);
  }
  tc.putImageData(img, 0, 0);
  c.fillStyle = c.createPattern(tile, 'repeat')!;
  c.fillRect(0, 0, w, h);
}

/** Where the clock, the date and the weather sit (left, middle): little detail there. */
const quiet = (x: number, y: number): boolean => x < 0.42 && y > 0.24 && y < 0.7;

function stars(c: CanvasRenderingContext2D, rnd: () => number, w: number, h: number, k: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = Math.pow(rnd(), 1.6) * h * 0.75;
    if (quiet(x / w, y / h) && rnd() < 0.5) continue;
    const r = (0.6 + Math.pow(rnd(), 3) * 1.8) * k;
    c.fillStyle = `rgba(255, 255, 255, ${0.35 + rnd() * 0.6})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
}

function moon(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const halo = c.createRadialGradient(x, y, 0, x, y, r * 2.8);
  halo.addColorStop(0, 'rgba(230, 232, 242, 0.2)');
  halo.addColorStop(0.45, 'rgba(230, 232, 242, 0.06)');
  halo.addColorStop(1, 'rgba(230, 232, 242, 0)');
  c.fillStyle = halo;
  c.beginPath();
  c.arc(x, y, r * 2.8, 0, Math.PI * 2);
  c.fill();
  const body = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x - r * 0.3, y - r * 0.3, r * 1.4);
  body.addColorStop(0, '#F4F4F7');
  body.addColorStop(0.55, '#D9DBE3');
  body.addColorStop(1, '#AEB2C0');
  c.fillStyle = body;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function mist(c: CanvasRenderingContext2D, x: number, y: number, r: number, night: boolean): void {
  c.fillStyle = `rgba(6, 16, 28, ${night ? 0.3 : 0.12})`;
  c.beginPath();
  c.arc(x, y + r * 0.3, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = `rgba(255, 255, 255, ${night ? 0.35 : 0.65})`;
  c.beginPath();
  c.arc(x, y - r * 0.15, r * 0.75, 0, Math.PI * 2);
  c.fill();
}

/** A drop: a lens showing the sky behind it, flipped and sharper, dark at the edge, bright at the bottom. */
function drop(c: CanvasRenderingContext2D, sharp: HTMLCanvasElement, x: number, y: number, r: number, w: number, night: boolean): void {
  const ry = r * 1.06;
  const s = SW / w;
  const zoom = 0.4 / s;
  c.fillStyle = `rgba(0, 0, 0, ${night ? 0.22 : 0.07})`;
  c.beginPath();
  c.ellipse(x, y + r * 0.18, r, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.beginPath();
  c.ellipse(x, y, r, ry, 0, 0, Math.PI * 2);
  c.clip();
  c.translate(x, y);
  c.scale(zoom, -zoom);
  c.translate(-x * s, -y * s);
  c.drawImage(sharp, 0, 0);
  c.restore();
  const edge = c.createRadialGradient(x, y - ry * 0.1, 0, x, y - ry * 0.1, r * 1.05);
  edge.addColorStop(0, 'rgba(6, 16, 28, 0)');
  edge.addColorStop(0.6, 'rgba(6, 16, 28, 0)');
  edge.addColorStop(1, `rgba(6, 16, 28, ${night ? 0.55 : 0.32})`);
  c.fillStyle = edge;
  c.beginPath();
  c.ellipse(x, y, r, ry, 0, 0, Math.PI * 2);
  c.fill();
  const focus = c.createRadialGradient(x, y + ry * 0.55, 0, x, y + ry * 0.55, r * 0.55);
  focus.addColorStop(0, `rgba(255, 255, 255, ${night ? 0.35 : 0.5})`);
  focus.addColorStop(1, 'rgba(255, 255, 255, 0)');
  c.fillStyle = focus;
  c.beginPath();
  c.ellipse(x, y + ry / 2, r * 0.7, ry / 2, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = `rgba(255, 255, 255, ${night ? 0.8 : 0.9})`;
  c.beginPath();
  c.ellipse(x - r * 0.27, y - ry * 0.49, r * 0.15, ry * 0.13, 0, 0, Math.PI * 2);
  c.fill();
}

function windowGlass(c: CanvasRenderingContext2D, sharp: HTMLCanvasElement, rnd: () => number, w: number, h: number, k: number, night: boolean, drops: number): void {
  for (let i = 0; i < 450; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    if (quiet(x / w, y / h) && rnd() < 0.6) continue;
    mist(c, x, y, (1 + rnd() * 1.6) * k, night);
  }
  const sizes = Array.from({ length: drops }, () => (3.5 + Math.pow(rnd(), 2.4) * 15) * k).sort((a, b) => a - b);
  for (const r of sizes) {
    const x = rnd() * w;
    const y = rnd() * h;
    if (quiet(x / w, y / h) && rnd() < 0.85) continue;
    if (r > 10 * k && rnd() < 0.4) {
      const len = (80 + rnd() * 240) * k;
      const tw = r * 0.5;
      const tg = c.createLinearGradient(0, y - len, 0, y);
      tg.addColorStop(0, night ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)');
      tg.addColorStop(1, night ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)');
      c.fillStyle = tg;
      c.beginPath();
      c.roundRect(x - tw / 2, y - len, tw, len, tw / 2);
      c.fill();
      for (let by = y - len * 0.9; by < y - r * 2.5; by += len * (0.18 + rnd() * 0.2)) {
        mist(c, x + (rnd() - 0.5) * tw, by, r * (0.18 + rnd() * 0.15), night);
      }
    }
    drop(c, sharp, x, y, r, w, night);
  }
}

const SEEDS: Record<SkyKind, number> = { clear: 0, partly: 1, cloudy: 2, fog: 3, drizzle: 4, rain: 5, heavy: 6, snow: 7, storm: 8 };
const LOOKS: Record<Look, number> = { day: 0, dusk: 1, night: 2 };

/**
 * The whole sky at the screen's size. `frosted` is the screensaver's: the same sky behind heavy frosted glass,
 * dimmed a little for a dark room.
 */
export function makeSky(kind: SkyKind, look: Look, w: number, h: number, frosted = false): HTMLCanvasElement {
  const rnd = seeded(SEEDS[kind] * 31 + LOOKS[look] * 7 + 3);
  const night = look === 'night';
  const k = h / 1080;
  const small = paintSmall(kind, look, rnd);
  const out = document.createElement('canvas');
  out.width = Math.max(2, Math.round(w));
  out.height = Math.max(2, Math.round(h));
  const c = out.getContext('2d')!;
  c.imageSmoothingQuality = 'high';
  if (frosted) {
    c.drawImage(blurred(small, 9, ['#05070D', night ? 0.08 : 0.15]), 0, 0, out.width, out.height);
    grain(c, out.width, out.height, 5, rnd);
    return out;
  }
  const soft = blurred(small, 2.5);
  const shown = wet(kind) ? blurred(soft, 7, [night ? '#1A2638' : '#8E9AAA', night ? 0.1 : 0.12]) : soft;
  c.drawImage(shown, 0, 0, out.width, out.height);
  grain(c, out.width, out.height, wet(kind) ? (night ? 6 : 4.5) : 1.5, rnd);
  if (night && (kind === 'clear' || kind === 'partly')) stars(c, rnd, out.width, out.height, k, kind === 'clear' ? 220 : 90);
  if (look !== 'day' && (kind === 'clear' || kind === 'partly' || kind === 'cloudy')) moon(c, out.width * 0.075, out.height * 0.13, 46 * k);
  if (wet(kind)) windowGlass(c, soft, rnd, out.width, out.height, k, night, kind === 'drizzle' ? 60 : kind === 'rain' ? 85 : 110);
  return out;
}

/** Falling rain (slanted streaks), snow (drifting flakes) and lightning, over the sky. */
export class Precip {
  private x: Float32Array;
  private y: Float32Array;
  private v: Float32Array;
  private s: Float32Array;
  private n = 0;
  private len = 0;
  private last = 0;
  private flashAt = -1e9;
  private nextFlash: number;
  private k: number;

  constructor(
    private readonly kind: SkyKind,
    private readonly w: number,
    private readonly h: number
  ) {
    const MAX = 220;
    this.x = new Float32Array(MAX);
    this.y = new Float32Array(MAX);
    this.v = new Float32Array(MAX);
    this.s = new Float32Array(MAX);
    this.k = h / 1080;
    this.n = kind === 'drizzle' ? 70 : kind === 'rain' ? 130 : kind === 'heavy' || kind === 'storm' ? MAX : kind === 'snow' ? 120 : 0;
    this.len = (kind === 'drizzle' ? 16 : kind === 'rain' ? 30 : 44) * this.k;
    for (let i = 0; i < this.n; i++) {
      this.x[i] = Math.random() * w * 1.1;
      this.y[i] = Math.random() * h;
      this.s[i] = 0.6 + Math.random() * 0.8;
      this.v[i] = (kind === 'snow' ? 50 + 70 * this.s[i] : (kind === 'drizzle' ? 650 : 1250) * this.s[i]) * this.k;
    }
    this.nextFlash = performance.now() + 4000;
  }

  get active(): boolean {
    return this.n > 0;
  }

  draw(c: CanvasRenderingContext2D, now: number, night: number): void {
    c.clearRect(0, 0, this.w, this.h);
    if (!this.n) return;
    const dt = this.last === 0 ? 0 : Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const k = this.k;
    if (this.kind === 'snow') {
      for (let i = 0; i < this.n; i++) {
        this.y[i] += this.v[i] * dt;
        this.x[i] += Math.sin((now / 900) * this.s[i] + i) * 18 * k * dt;
        if (this.y[i] > this.h + 8 * k) {
          this.y[i] = -8 * k;
          this.x[i] = Math.random() * this.w;
        }
        const t = (this.s[i] - 0.6) / 0.8;
        c.fillStyle = `rgba(255, 255, 255, ${0.5 + 0.4 * t})`;
        c.beginPath();
        c.arc(this.x[i], this.y[i], (1.4 + 2.6 * t) * k, 0, Math.PI * 2);
        c.fill();
      }
      return;
    }
    const slant = 0.14;
    c.lineCap = 'round';
    c.lineWidth = (this.kind === 'drizzle' ? 1.4 : 1.8) * k;
    c.strokeStyle = `rgba(255, 255, 255, ${0.42 - 0.12 * night})`;
    c.beginPath();
    for (let i = 0; i < this.n; i++) {
      this.y[i] += this.v[i] * dt;
      this.x[i] -= this.v[i] * dt * slant;
      const l = this.len * this.s[i];
      if (this.y[i] - l > this.h) {
        this.y[i] = -Math.random() * this.h * 0.15;
        this.x[i] = Math.random() * this.w * 1.1;
      }
      c.moveTo(this.x[i], this.y[i]);
      c.lineTo(this.x[i] + l * slant, this.y[i] - l);
    }
    c.stroke();
    if (this.kind === 'storm') {
      if (now >= this.nextFlash) {
        this.flashAt = now;
        this.nextFlash = now + 7000 + Math.random() * 9000;
      }
      const t = now - this.flashAt;
      const a = t < 70 ? 1 : t < 150 ? 0.15 : t < 240 ? 0.75 : t < 900 ? 0.75 * (1 - (t - 240) / 660) : 0;
      if (a > 0) {
        c.fillStyle = `rgba(255, 255, 255, ${a * (0.3 + 0.25 * night)})`;
        c.fillRect(0, 0, this.w, this.h);
      }
    }
  }
}
