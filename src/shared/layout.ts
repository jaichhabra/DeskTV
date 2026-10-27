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
  /** The root font size in CSS pixels; everything else is in rem. */
  rem: number;
  /** Clear margin on each side, in CSS pixels. */
  insetX: number;
  insetY: number;
  /** The width the content may use, centered on very wide screens. */
  contentWidth: number;
  tileWidth: number;
  tileHeight: number;
  tileGap: number;
  /** Tiles that fit across. */
  columns: number;
  shape: 'standard' | 'wide' | 'ultrawide' | 'tall';
  heroHeight: number;
}

export const FALLBACK_VIEWPORT: Viewport = { width: 1920, height: 1080, dpr: 1 };

const TILE_REM: Record<TileSize, number> = { small: 13, medium: 16, large: 20 };

export function sanitizeViewport(v: Partial<Viewport> | null | undefined): Viewport {
  const ok = (n: unknown, min: number, max: number): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  if (!v || !ok(v.width, 320, 16384) || !ok(v.height, 240, 16384)) return FALLBACK_VIEWPORT;
  return { width: v.width, height: v.height, dpr: ok(v.dpr, 0.5, 8) ? v.dpr : 1 };
}

export function computeLayout(input: Partial<Viewport> | null | undefined, opts: LayoutOptions): Layout {
  const v = sanitizeViewport(input);
  const ratio = v.width / v.height;
  const shape = ratio >= 2.1 ? 'ultrawide' : ratio >= 1.7 ? 'wide' : ratio >= 1.2 ? 'standard' : 'tall';

  // Text follows the screen's height (what sets viewing distance on a TV), but grows slower than the screen so a
  // 4K TV at 100% scaling gets larger text, not four times larger. Physical pixels don't matter: Windows' scaling
  // already turned them into CSS pixels.
  const reference = Math.min(v.height, v.width / (16 / 9));
  let rem = 16 * Math.pow(reference / 1080, 0.82);
  rem = clamp(rem, 11, 34);
  if (opts.scale !== 'auto') rem = clamp(rem * clamp(opts.scale, 0.6, 1.6), 9, 48);
  rem = Math.round(rem * 4) / 4;

  const safe = clamp(opts.safeArea, 0, 10) / 100;
  const insetX = Math.round(v.width * safe + rem * 4);
  const insetY = Math.round(v.height * safe + rem * 2.5);

  // Very wide screens keep a readable line length: the content stops a little past 16:9, centered.
  const usable = v.width - insetX * 2;
  const contentWidth = Math.round(Math.min(usable, (v.height - insetY * 2) * 2.1));

  const tileGap = Math.round(rem * 1.5);
  const target = TILE_REM[opts.tileSize] * rem;
  const columns = clamp(Math.floor((contentWidth + tileGap) / (target + tileGap)), 3, 10);
  const tileWidth = Math.floor((contentWidth - tileGap * (columns - 1)) / columns);
  const tileHeight = Math.round((tileWidth * 9) / 16);
  const heroHeight = Math.round(v.height * (shape === 'tall' ? 0.5 : 0.62));

  return { rem, insetX, insetY, contentWidth, tileWidth, tileHeight, tileGap, columns, shape, heroHeight };
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
