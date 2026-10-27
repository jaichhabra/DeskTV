import type { CSSProperties, ReactNode } from 'react';
import type { AppEntry } from '../../../shared/types';
import { BrandMark, Glyph } from './Icon';

/**
 * A service's tile art, like the TV banners on SundarTV's shelf: the brand's colors and its mark and name, drawn
 * here (no images to fetch). Sizes are in cqh, so the art scales with the tile.
 */
interface Art {
  bg: string;
  content: ReactNode;
}

const ART: Record<string, () => Art> = {
  netflix: () => ({
    bg: 'linear-gradient(160deg, #161616, #000)',
    content: <span className="ba-netflix">NETFLIX</span>
  }),
  youtube: () => ({
    bg: 'linear-gradient(160deg, #232323, #0f0f0f)',
    content: (
      <span className="ba-row">
        <svg className="ba-yt" viewBox="0 0 28 20" aria-hidden="true">
          <rect width="28" height="20" rx="5.5" fill="#FF0000" />
          <path d="M11.2 5.6v8.8l7.4-4.4z" fill="#fff" />
        </svg>
        <span className="ba-youtube">YouTube</span>
      </span>
    )
  }),
  prime: () => ({
    bg: 'linear-gradient(180deg, #25A3FF, #0B6BDA)',
    content: (
      <span className="ba-prime">
        prime video
        <svg viewBox="0 0 60 12" aria-hidden="true">
          <path d="M4 3c14 8 36 9 50 1" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M48 1.5l7 2.2-3.6 6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }),
  spotify: () => ({
    bg: 'linear-gradient(160deg, #1d1d1d, #121212)',
    content: (
      <span className="ba-row ba-spotify">
        <BrandMark slug="spotify" size="1.25em" color="#1ED760" />
        Spotify
      </span>
    )
  }),
  hotstar: () => ({
    bg: 'linear-gradient(115deg, #0091FF 0%, #4C4BEA 42%, #B51FE0 72%, #FF1A7E 100%)',
    content: (
      <span className="ba-row ba-hotstar">
        <Glyph name="sparkles" size="1.1em" />
        JioHotstar
      </span>
    )
  }),
  appletv: () => ({
    bg: 'linear-gradient(160deg, #1c1c1e, #000)',
    content: <BrandMark slug="appletv" size="46cqh" color="#fff" />
  }),
  plex: () => ({
    bg: 'linear-gradient(160deg, #282828, #151515)',
    content: <span className="ba-plex">plex</span>
  }),
  ytmusic: () => ({
    bg: 'linear-gradient(160deg, #232323, #0f0f0f)',
    content: (
      <span className="ba-row ba-ytmusic">
        <BrandMark slug="youtubemusic" size="1.3em" color="#FF0033" />
        Music
      </span>
    )
  }),
  vlc: () => ({
    bg: 'linear-gradient(170deg, #FF9A1F, #E86A00)',
    content: (
      <span className="ba-row ba-vlc">
        <BrandMark slug="vlcmediaplayer" size="1.25em" color="#fff" />
        VLC
      </span>
    )
  }),
  browser: () => ({
    bg: 'linear-gradient(160deg, #3a3a3c, #1c1c1e)',
    content: (
      <span className="ba-row ba-plain">
        <Glyph name="globe" size="1.15em" />
        Browser
      </span>
    )
  }),
  steam: () => ({
    bg: 'linear-gradient(160deg, #213448, #0f1922)',
    content: (
      <span className="ba-row ba-steam">
        <BrandMark slug="steam" size="1.2em" color="#fff" />
        STEAM
      </span>
    )
  }),
  xbox: () => ({
    bg: 'radial-gradient(circle at 30% 20%, #1DB01D, #0B5E0B 75%)',
    content: <span className="ba-xbox">XBOX</span>
  })
};

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number): number => Math.round(Math.min(255, Math.max(0, ((n >> s) & 255) * f)));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** The face of an app tile: the person's picture, the brand art, the installed app's own icon, or its name. */
export function Banner({ app, image, winIcon }: { app: AppEntry; image: string | null; winIcon: string | null }) {
  if (image) {
    return <img className="banner-image" src={image} alt="" draggable={false} />;
  }
  const art = app.builtin ? ART[app.id]?.() : undefined;
  if (art) {
    return (
      <span className="banner" style={{ background: art.bg }}>
        {art.content}
      </span>
    );
  }
  const style = { background: `linear-gradient(160deg, ${shade(app.color, 1.15)}, ${shade(app.color, 0.6)})` } as CSSProperties;
  return (
    <span className="banner" style={style}>
      {winIcon ? (
        <span className="ba-row ba-plain">
          <img className="ba-icon" src={winIcon} alt="" draggable={false} />
          {app.name.length <= 14 ? app.name : ''}
        </span>
      ) : app.icon ? (
        <span className="ba-row ba-plain">
          <BrandMark slug={app.icon} size="1.2em" color="#fff" />
          {app.name}
        </span>
      ) : (
        <span className="ba-name">{app.name}</span>
      )}
    </span>
  );
}
