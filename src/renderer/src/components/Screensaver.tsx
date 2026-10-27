import { useEffect, useState } from 'react';
import { QUOTES } from '../../../shared/quotes';
import { describeWeather } from '../../../shared/weather';
import { desk, report } from '../api';
import { useDeskContext } from '../context';
import { useNow } from '../hooks';
import { clockText } from '../pages/Home';
import { Sky, type SkyState } from './Sky';
import { Symbol, weatherSymbol } from './Icon';

const QUOTE_MS = 45_000;
const PHOTO_MS = 20_000;
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

/**
 * SundarTV's screensaver: the sky behind frosted glass (or the person's photos), the time and date at the top left,
 * the weather at the top right, and a quote every 45 seconds. Any key, click or button closes it.
 */
export function Screensaver({ sky }: { sky: SkyState }) {
  const d = useDeskContext();
  const s = d.config.screensaver;
  const now = useNow();
  const [photos, setPhotos] = useState<string[]>([]);
  const [photo, setPhoto] = useState(0);
  const [slot, setSlot] = useState(() => Math.floor(Date.now() / QUOTE_MS));

  useEffect(() => {
    desk.saverPhotos().then(setPhotos, report);
  }, [s.photoFolder]);

  useEffect(() => {
    const t = setInterval(() => setSlot(Math.floor(Date.now() / QUOTE_MS)), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setPhoto((p) => (p + 1) % photos.length), PHOTO_MS);
    return () => clearInterval(t);
  }, [photos.length]);

  // Steps of 7 reach every quote (37 is prime), as SundarTV's.
  const q = QUOTES[(slot * 7) % QUOTES.length];
  const w = s.weather ? d.feeds?.weather : null;
  return (
    <div className="saver" role="dialog" aria-label="Screensaver">
      <Sky sky={sky} frosted />
      {photos.map((p, i) => (
        <img key={p} className={`saver-photo${i === photo ? ' on' : ''}`} src={p} alt="" draggable={false} />
      ))}
      <div className="saver-top">
        <div className="saver-when">
          <span className="saver-time">{clockText(now)}</span>
          <span className="saver-date">{dateFormat.format(now)}</span>
        </div>
        {w && (
          <div className="saver-weather">
            <Symbol name={weatherSymbol(w.code, w.isDay)} size="1.15em" />
            <span className="sw-temp">{w.temperature}°</span>
            <span className="sw-desc">{describeWeather(w.code).text}</span>
            <span className="sw-hl">
              H:{w.high}° L:{w.low}°
            </span>
          </div>
        )}
      </div>
      {s.quotes && (
        <figure className="saver-quote" key={q[0]}>
          <blockquote>“{q[0]}”</blockquote>
          <figcaption>
            <span className="dash">—</span>
            {q[1]}
          </figcaption>
        </figure>
      )}
    </div>
  );
}
