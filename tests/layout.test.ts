import { describe, expect, it, vi } from 'vitest';
import { computeLayout, sanitizeViewport, Settler, FALLBACK_VIEWPORT } from '../src/shared/layout';

const auto = { scale: 'auto' as const, safeArea: 0, tileSize: 'medium' as const };

describe('layout', () => {
  it("draws SundarTV's 1920 × 1080 stage one to one on a 1080p screen, five grid tiles across", () => {
    const l = computeLayout({ width: 1920, height: 1080, dpr: 1 }, auto);
    expect(l.k).toBe(1);
    expect(l.insetX).toBe(80);
    expect(l.shape).toBe('wide');
    expect(l.columns).toBe(5);
  });

  it('shows the same picture on a 4K TV at 100% scaling, twice as sharp', () => {
    const l = computeLayout({ width: 3840, height: 2160, dpr: 1 }, auto);
    expect(l.k).toBe(2);
    expect(l.columns).toBe(5);
  });

  it('treats a 4K TV at 200% scaling like 1080p, since Windows already scaled it', () => {
    expect(computeLayout({ width: 1920, height: 1080, dpr: 2 }, auto).k).toBe(1);
  });

  it('follows the height on an ultrawide, with more tiles across', () => {
    const l = computeLayout({ width: 3440, height: 1440, dpr: 1 }, auto);
    expect(l.shape).toBe('ultrawide');
    expect(l.k).toBeCloseTo(1.333, 2);
    expect(l.columns).toBeGreaterThan(5);
  });

  it('follows the width on a 4:3 projector so nothing runs off the side', () => {
    const l = computeLayout({ width: 1024, height: 768, dpr: 1 }, auto);
    expect(l.shape).toBe('standard');
    expect(l.k).toBeCloseTo(1024 / 1440, 3);
    expect(1920 * l.k).toBeLessThanOrEqual(1366);
  });

  it('applies the manual size and the edge margin', () => {
    expect(computeLayout({ width: 1920, height: 1080, dpr: 1 }, { ...auto, scale: 1.5 }).k).toBe(1.5);
    expect(computeLayout({ width: 1920, height: 1080, dpr: 1 }, { ...auto, safeArea: 5 }).insetX).toBe(80 + 96);
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
