import type { TileSize } from './types';

/**
 * The screen-aware layout, kept apart from measuring the screen (as on the HY300: measure first, decide after).
 * It takes the window's real size and returns the sizes the interface uses, so a 1080p TV, a 4K TV, a 4:3 projector
 * and an ultrawide monitor all keep the same proportions without stretching anything.
 */
export interface Viewport {
  width: number;
  height: number;
  /** Device pixels per CSS pixel (Windows' scaling × zoom). */
  dpr: number;
}

export interface LayoutOptions {
  scale: 'auto' | number;
  safeArea: number;
  tileSize: TileSize;
}

export interface Layout {
  /** Screen pixels per design pixel: the interface is designed on SundarTV's 1920 × 1080 stage. */
  k: number;
  /** Clear margin on each side, in CSS pixels (SundarTV's 80 plus the edge margin). */
  insetX: number;
  insetY: number;
  width: number;
  height: number;
  /** Tiles across in the All Apps and Library grids. */
  columns: number;
  shape: 'standard' | 'wide' | 'ultrawide' | 'tall';
}

export const FALLBACK_VIEWPORT: Viewport = { width: 1920, height: 1080, dpr: 1 };

const GRID_TILE: Record<TileSize, number> = { small: 260, medium: 300, large: 360 };

export function sanitizeViewport(v: Partial<Viewport> | null | undefined): Viewport {
  const ok = (n: unknown, min: number, max: number): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  if (!v || !ok(v.width, 320, 16384) || !ok(v.height, 240, 16384)) return FALLBACK_VIEWPORT;
  return { width: v.width, height: v.height, dpr: ok(v.dpr, 0.5, 8) ? v.dpr : 1 };
}

/**
 * Like a TV, the whole interface follows the screen's height: 1080 lines of design on any screen, so a 4K TV shows
 * the same picture sharper and a 720p projector the same picture smaller. Narrow screens (4:3 and taller) follow the
 * width instead, so nothing runs off the side. Sizes are CSS pixels, so Windows' scaling is already in them.
 */
export function computeLayout(input: Partial<Viewport> | null | undefined, opts: LayoutOptions): Layout {
  const v = sanitizeViewport(input);
  const ratio = v.width / v.height;
  const shape = ratio >= 2.1 ? 'ultrawide' : ratio >= 1.7 ? 'wide' : ratio >= 1.2 ? 'standard' : 'tall';
  let k = Math.min(v.height / 1080, v.width / 1440);
  if (opts.scale !== 'auto') k *= clamp(opts.scale, 0.6, 1.6);
  k = clamp(Math.round(k * 1000) / 1000, 0.3, 6);
  const safe = clamp(opts.safeArea, 0, 10) / 100;
  const insetX = Math.round(v.width * safe + 80 * k);
  const insetY = Math.round(v.height * safe);
  const tile = GRID_TILE[opts.tileSize] * k;
  const gap = 40 * k;
  const columns = clamp(Math.floor((v.width - insetX * 2 + gap) / (tile + gap)), 3, 8);
  return { k, insetX, insetY, width: v.width, height: v.height, columns, shape };
}

/**
 * Settles a stream of measurements before the layout changes, so a window being dragged between screens or a
 * projector warming up doesn't make the interface jump: a new size counts only once it's held for `delayMs`,
 * and changes smaller than `threshold` (a fraction) are ignored.
 */
export class Settler {
  private current: Viewport;
  private pending: Viewport | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    initial: Viewport,
    private readonly apply: (v: Viewport) => void,
    private readonly delayMs = 250,
    private readonly threshold = 0.02
  ) {
    this.current = initial;
  }

  offer(next: Viewport): void {
    const changed =
      Math.abs(next.width - this.current.width) / this.current.width > this.threshold ||
      Math.abs(next.height - this.current.height) / this.current.height > this.threshold ||
      next.dpr !== this.current.dpr;
    if (!changed) {
      this.pending = null;
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      return;
    }
    this.pending = next;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.pending) return;
      this.current = this.pending;
      this.pending = null;
      this.apply(this.current);
    }, this.delayMs);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
