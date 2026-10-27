import type { MediaKind } from './types';

export const VIDEO_EXT = ['.mp4', '.mkv', '.avi', '.mov', '.m4v', '.wmv', '.webm', '.ts', '.m2ts', '.mpg', '.mpeg'];
export const AUDIO_EXT = ['.mp3', '.flac', '.m4a', '.aac', '.wav', '.ogg', '.opus', '.wma'];
export const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic'];

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i).toLowerCase();
}

/** What a file is in a folder of the given kind, or null to skip it. */
export function classify(name: string, folderKind: MediaKind): MediaKind | null {
  const ext = extOf(name);
  if (/^\./.test(name) || /sample/i.test(name)) return null;
  if (VIDEO_EXT.includes(ext)) {
    if (folderKind === 'shows' || parseEpisode(name)) return 'shows';
    return folderKind === 'music' || folderKind === 'photos' ? null : 'movies';
  }
  if (AUDIO_EXT.includes(ext)) return folderKind === 'music' ? 'music' : null;
  if (IMAGE_EXT.includes(ext)) return folderKind === 'photos' ? 'photos' : null;
  return null;
}

/** "The.Office.S02E05.720p.mkv" → show, season 2, episode 5. Also "2x05". */
export function parseEpisode(name: string): { show: string; season: number; episode: number } | null {
  const base = stripExt(name);
  const m = /^(.*?)[\s._-]*[Ss](\d{1,2})[\s._-]*[Ee](\d{1,3})/.exec(base) ?? /^(.*?)[\s._-]+(\d{1,2})x(\d{2,3})\b/.exec(base);
  if (!m) return null;
  return { show: tidy(m[1]) || 'Unknown show', season: Number(m[2]), episode: Number(m[3]) };
}

/** "Blade.Runner.2049.2017.2160p.BluRay.x265.mkv" → "Blade Runner 2049", 2017. */
export function cleanTitle(name: string): { title: string; year: number | null } {
  let base = stripExt(name).replace(/[._]+/g, ' ');
  let year: number | null = null;
  const years = [...base.matchAll(/[([\s](19\d{2}|20\d{2})(?=[)\]\s]|$)/g)];
  const last = years[years.length - 1];
  if (last && last.index !== undefined && last.index > 0) {
    year = Number(last[1]);
    base = base.slice(0, last.index);
  }
  base = base.replace(/\b(2160p|1080p|720p|480p|4k|uhd|hdr|bluray|brrip|web-?dl|webrip|x26[45]|h26[45]|hevc|aac|dts)\b.*$/i, '');
  return { title: tidy(base) || stripExt(name), year };
}

function stripExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

function tidy(s: string): string {
  return s.replace(/[._]+/g, ' ').replace(/[\s\-([]+$/, '').replace(/\s+/g, ' ').trim();
}
