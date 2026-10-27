import { useEffect, useState } from 'react';
import { QUOTES } from '../../../shared/quotes';
import { describeWeather } from '../../../shared/weather';
import { desk, report } from '../api';
import { useDeskContext } from '../context';
import { dateFormat, timeFormat, useNow } from '../hooks';

const QUOTE_MS = 45_000;
const PHOTO_MS = 20_000;

/**
 * The idle screen: slow light or the person's photos, a large clock and date, the weather and a quote every 45
 * seconds (SundarTV's list). Any key, click or controller button closes it, and that press does nothing else.
 */
export function Screensaver() {
  const d = useDeskContext();
  const s = d.config.screensaver;
  const now = useNow();
  const [photos, setPhotos] = useState<string[]>([]);
  const slot = Math.floor(now.getTime() / QUOTE_MS);
  const [quoteSlot, setQuoteSlot] = useState(() => Math.floor(Date.now() / QUOTE_MS));
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    desk.saverPhotos().then(setPhotos, report);
  }, [s.photoFolder]);

  // The quote follows the clock, checked every few seconds so it changes on time without a timer per second.
  useEffect(() => {
    const t = setInterval(() => setQuoteSlot(Math.floor(Date.now() / QUOTE_MS)), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setPhoto((p) => (p + 1) % photos.length), PHOTO_MS);
    return () => clearInterval(t);
  }, [photos.length]);

  const q = QUOTES[(Math.max(slot, quoteSlot) * 7) % QUOTES.length];
  const w = s.weather ? d.feeds?.weather : null;
  return (
    <div className="saver" role="dialog" aria-label="Screensaver">
      <div className="saver-sky">
        <div className="saver-blob a" />
        <div className="saver-blob b" />
        <div className="saver-blob c" />
      </div>
      {photos.map((p, i) => (
        <img key={p} className={`saver-photo${i === photo ? ' on' : ''}`} src={p} alt="" draggable={false} />
      ))}
      <div className="saver-shade" />
      <div className="saver-clock">
        <div className="saver-time">{timeFormat.format(now)}</div>
        <div className="saver-date">
          {dateFormat.format(now)}
          {w ? ` · ${w.temperature}° ${describeWeather(w.code).text}` : ''}
        </div>
      </div>
      {s.quotes && (
        <figure className="saver-quote" key={q[0]}>
          <blockquote>{q[0]}</blockquote>
          <figcaption>{q[1]}</figcaption>
        </figure>
      )}
    </div>
  );
}
