// Copies the brand icons DeskTV uses out of Simple Icons (CC0) into one small file, so the app doesn't bundle all
// 3,000. A slug Simple Icons no longer has just gets a monogram tile.
import { writeFileSync } from 'node:fs';
import * as icons from 'simple-icons';

const WANTED = [
  'netflix', 'primevideo', 'youtube', 'appletv', 'jiohotstar', 'hotstar', 'plex', 'spotify', 'youtubemusic',
  'vlcmediaplayer', 'steam', 'xbox', 'twitch', 'disneyplus', 'hbomax', 'crunchyroll', 'jellyfin', 'kodi',
  'soundcloud', 'applemusic', 'deezer', 'tidal', 'googlechrome', 'firefoxbrowser', 'microsoftedge', 'epicgames',
  'mubi', 'zee5', 'sonyliv', 'jiocinema'
];

const out = {};
const all = Object.values(icons).filter((i) => i && typeof i === 'object' && 'slug' in i);
for (const slug of WANTED) {
  const icon = all.find((i) => i.slug === slug);
  if (icon) out[slug] = { title: icon.title, hex: `#${icon.hex}`, path: icon.path };
}
writeFileSync(new URL('../src/renderer/src/assets/brand-icons.json', import.meta.url), JSON.stringify(out) + '\n');
console.log(`Brand icons: ${Object.keys(out).length} of ${WANTED.length} (missing: ${WANTED.filter((s) => !out[s]).join(', ') || 'none'})`);
