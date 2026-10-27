import type { LaunchTarget } from './types';

/**
 * URI schemes DeskTV may hand to Windows: only ones the services document for their own apps. Anything else a
 * person adds must be a website or an executable they picked.
 */
export const ALLOWED_SCHEMES = ['spotify:', 'steam:', 'xbox:', 'ms-settings:'] as const;

/** Why a launch target isn't safe to use, or null when it is. */
export function checkTarget(t: LaunchTarget): string | null {
  switch (t.kind) {
    case 'url':
      return checkUrl(t.url);
    case 'uri': {
      const lower = t.uri.toLowerCase();
      if (t.uri.length > 500 || /[\s"<>]/.test(t.uri)) return 'Invalid address';
      return ALLOWED_SCHEMES.some((s) => lower.startsWith(s)) ? null : 'This kind of link is not allowed';
    }
    case 'exe':
      return checkExePath(t.path);
    case 'startApp':
      return t.match.trim().length > 0 && t.match.length <= 100 ? null : 'Invalid app name';
  }
}

export function checkUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return 'Not a web address';
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'Only http and https websites can be opened';
  if (u.username || u.password) return 'Addresses with passwords are not allowed';
  return url.length <= 2000 ? null : 'Address too long';
}

/** An absolute Windows path to an .exe, with no tricks in it. Whether it exists is checked when it's opened. */
export function checkExePath(path: string): string | null {
  if (path.length > 1024 || path.includes('\0')) return 'Invalid path';
  if (!/^[a-zA-Z]:\\/.test(path) && !path.startsWith('\\\\')) return 'Pick the program from its folder';
  if (!/\.exe$/i.test(path)) return 'Only .exe programs can be added';
  return null;
}

/** Start menu app ids are what Get-StartApps lists; only those, passed to explorer's shell:AppsFolder. */
export function checkAppId(appId: string): string | null {
  if (!appId || appId.length > 512 || /["\0\r\n]/.test(appId)) return 'Invalid app id';
  return null;
}

/** The installed app that a startApp target names: an exact name first, then one that starts with it. */
export function findStartApp<T extends { name: string }>(apps: T[], match: string): T | undefined {
  const m = match.toLowerCase();
  return (
    apps.find((a) => a.name.toLowerCase() === m) ??
    apps.find((a) => a.name.toLowerCase().startsWith(m + ' ') && !/uninstall/i.test(a.name))
  );
}
