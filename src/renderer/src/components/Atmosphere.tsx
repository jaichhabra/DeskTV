import { useEffect, useState } from 'react';
import { moodFor, type Mood } from '../../../shared/weather';
import { desk, report } from '../api';
import { useDeskContext } from '../context';

/** Colors for each mood, from SundarTV's weather sky: muted, cinematic, never neon. */
const MOODS: Record<Mood, { top: string; bottom: string; glow: string; glow2: string }> = {
  clear: { top: '#0a1724', bottom: '#050608', glow: '#2f6fae', glow2: '#c48a4a' },
  cloudy: { top: '#121418', bottom: '#060607', glow: '#5b6676', glow2: '#3a4250' },
  rain: { top: '#0a1118', bottom: '#040506', glow: '#30516b', glow2: '#22303d' },
  storm: { top: '#0b0b12', bottom: '#040405', glow: '#3d3760', glow2: '#24263a' },
  snow: { top: '#11161d', bottom: '#060708', glow: '#8ea2b8', glow2: '#4c5a6a' },
  fog: { top: '#131416', bottom: '#060607', glow: '#7a7f86', glow2: '#3c3f44' },
  night: { top: '#05070d', bottom: '#020203', glow: '#1c2c4f', glow2: '#2a1f3d' }
};

/**
 * The background: slow light behind everything, tinted by the weather and the hour, or the person's own picture.
 * Only transforms animate, and not at all with motion off.
 */
export function Atmosphere({ dim = false }: { dim?: boolean }) {
  const d = useDeskContext();
  const [image, setImage] = useState<string | null>(null);
  const w = d.feeds?.weather;
  const fresh = w && Date.now() - w.at < 3 * 3600_000;
  const mood = moodFor(fresh ? w.code : null, fresh ? w.isDay : null, new Date().getHours());
  const m = MOODS[mood];

  useEffect(() => {
    let live = true;
    const path = d.config.hero.image;
    if (path) desk.imageUrl(path).then((u) => live && setImage(u), report);
    else setImage(null);
    return () => {
      live = false;
    };
  }, [d.config.hero.image]);

  return (
    <div className={`atmosphere${dim ? ' dim' : ''}`} data-mood={mood} aria-hidden="true" style={{ background: `linear-gradient(180deg, ${m.top}, ${m.bottom} 70%)` }}>
      <div className="glow glow-a" style={{ background: `radial-gradient(closest-side, ${m.glow}, transparent)` }} />
      <div className="glow glow-b" style={{ background: `radial-gradient(closest-side, ${m.glow2}, transparent)` }} />
      <div className="glow glow-c" style={{ background: `radial-gradient(closest-side, var(--accent), transparent)` }} />
      {image && <img className="hero-image" src={image} alt="" draggable={false} />}
      <div className="scrim" />
      <div className="grain" />
    </div>
  );
}
