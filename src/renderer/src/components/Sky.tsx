import { useEffect, useRef, useState } from 'react';
import type { Feeds } from '../../../shared/types';
import { glassTint, makeSky, Precip, skyKind, skyLook, type Look, type SkyKind } from '../sky';

export interface SkyState {
  kind: SkyKind;
  look: Look;
}

/** The sky for now: the weather when it's fresh (three hours), else a clear sky; the look from sunrise and sunset. */
export function useSkyState(feeds: Feeds | null): SkyState {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const w = feeds?.weather;
  const fresh = w && now - w.at < 3 * 3600_000;
  // A preview of any sky: #sky=rain:dusk (for checking the art; the page has no address bar to type it in).
  const preview = /sky=([a-z]+):([a-z]+)/.exec(location.hash);
  const kind = (preview?.[1] as SkyKind | undefined) ?? skyKind(fresh ? w.code : null);
  const look = (preview?.[2] as Look | undefined) ?? skyLook(now, w?.sunrise ?? null, w?.sunset ?? null);
  // The glass takes the sky's color, as SundarTV's does.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--glass-tint', glassTint(kind, look));
    root.dataset.look = look;
  }, [kind, look]);
  return { kind, look };
}

/**
 * The sky behind everything: drawn once per weather, hour and size (off the first frame), with the rain or snow
 * moving on top only while DeskTV is showing and motion is on.
 */
export function Sky({ sky, frosted = false, moving = true }: { sky: SkyState; frosted?: boolean; moving?: boolean }) {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onResize = (): void => {
      clearTimeout(t);
      t = setTimeout(() => setSize({ w: window.innerWidth, h: window.innerHeight }), 250);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(size.w * dpr);
  const H = Math.round(size.h * dpr);

  useEffect(() => {
    const canvas = back.current;
    if (!canvas) return;
    const id = requestAnimationFrame(() => {
      const img = makeSky(sky.kind, sky.look, W, H, frosted);
      canvas.width = W;
      canvas.height = H;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      canvas.classList.add('on');
    });
    return () => cancelAnimationFrame(id);
  }, [sky.kind, sky.look, W, H, frosted]);

  useEffect(() => {
    const canvas = front.current;
    if (!canvas || !moving || frosted) return;
    const precip = new Precip(sky.kind, W, H);
    if (!precip.active) return;
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext('2d')!;
    const night = sky.look === 'night' ? 1 : sky.look === 'dusk' ? 0.5 : 0;
    let frame = 0;
    const loop = (t: number): void => {
      if (document.visibilityState === 'visible') precip.draw(c, t, night);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      c.clearRect(0, 0, W, H);
    };
  }, [sky.kind, sky.look, W, H, moving, frosted]);

  return (
    <div className="sky" aria-hidden="true">
      <canvas ref={back} className="sky-back" />
      <canvas ref={front} className="sky-front" />
    </div>
  );
}
