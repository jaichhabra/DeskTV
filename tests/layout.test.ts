import { describe, expect, it, vi } from 'vitest';
import { computeLayout, sanitizeViewport, Settler, FALLBACK_VIEWPORT } from '../src/shared/layout';

const auto = { scale: 'auto' as const, safeArea: 0, tileSize: 'medium' as const };

describe('layout', () => {
  it('gives a 1080p TV 16px text and a sensible number of tiles', () => {
    const l = computeLayout({ width: 1920, height: 1080, dpr: 1 }, auto);
    expect(l.rem).toBe(16);
    expect(l.shape).toBe('wide');
    expect(l.columns).toBeGreaterThanOrEqual(5);
    expect(l.columns).toBeLessThanOrEqual(7);
    expect(l.tileHeight / l.tileWidth).toBeCloseTo(9 / 16, 1);
  });

  it('grows text on a 4K TV at 100% scaling, but far less than 2×', () => {
    const hd = computeLayout({ width: 1920, height: 1080, dpr: 1 }, auto);
    const uhd = computeLayout({ width: 3840, height: 2160, dpr: 1 }, auto);
    expect(uhd.rem).toBeGreaterThan(hd.rem * 1.4);
    expect(uhd.rem).toBeLessThan(hd.rem * 2);
  });

  it('treats a 4K TV at 200% scaling like 1080p, since Windows already scaled it', () => {
    expect(computeLayout({ width: 1920, height: 1080, dpr: 2 }, auto).rem).toBe(16);
  });

  it('keeps an ultrawide readable: content capped and centered', () => {
    const l = computeLayout({ width: 3440, height: 1440, dpr: 1 }, auto);
    expect(l.shape).toBe('ultrawide');
    expect(l.contentWidth).toBeLessThan(3440 - l.insetX * 2);
  });

  it('fits a 4:3 projector with no more columns than a wide screen', () => {
    const wide = computeLayout({ width: 1920, height: 1080, dpr: 1 }, auto);
    const square = computeLayout({ width: 1024, height: 768, dpr: 1 }, auto);
    expect(square.shape).toBe('standard');
    expect(square.columns).toBeLessThanOrEqual(wide.columns);
    expect(square.tileWidth * square.columns).toBeLessThanOrEqual(1024);
  });

  it('applies the manual size and the edge margin', () => {
    const base = computeLayout({ width: 1920, height: 1080, dpr: 1 }, auto);
    expect(computeLayout({ width: 1920, height: 1080, dpr: 1 }, { ...auto, scale: 1.5 }).rem).toBe(24);
    expect(computeLayout({ width: 1920, height: 1080, dpr: 1 }, { ...auto, safeArea: 5 }).insetX).toBe(base.insetX + 96);
  });

  it('falls back to 1920 × 1080 when the measurement is nonsense', () => {
    expect(sanitizeViewport({ width: 0, height: 0, dpr: 1 })).toEqual(FALLBACK_VIEWPORT);
    expect(sanitizeViewport({ width: NaN, height: 1080 })).toEqual(FALLBACK_VIEWPORT);
    expect(sanitizeViewport(null)).toEqual(FALLBACK_VIEWPORT);
    expect(sanitizeViewport({ width: 1280, height: 720, dpr: -1 }).dpr).toBe(1);
  });

  it('settles: ignores tiny changes and applies a size only once it holds', () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    const s = new Settler({ width: 1920, height: 1080, dpr: 1 }, apply, 250, 0.02);
    s.offer({ width: 1925, height: 1082, dpr: 1 });
    vi.advanceTimersByTime(500);
    expect(apply).not.toHaveBeenCalled();
    s.offer({ width: 1280, height: 720, dpr: 1 });
    vi.advanceTimersByTime(100);
    s.offer({ width: 1366, height: 768, dpr: 1 });
    vi.advanceTimersByTime(300);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({ width: 1366, height: 768, dpr: 1 });
    s.offer({ width: 1366, height: 768, dpr: 1.5 });
    vi.advanceTimersByTime(300);
    expect(apply).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
