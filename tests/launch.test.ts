import { describe, expect, it } from 'vitest';
import { checkTarget, checkUrl, findStartApp } from '../src/shared/launch';

describe('launching', () => {
  it('opens only http and https websites', () => {
    expect(checkUrl('https://www.netflix.com/')).toBeNull();
    expect(checkUrl('http://192.168.1.10:32400/web')).toBeNull();
    for (const bad of ['javascript:alert(1)', 'file:///C:/Windows/system32/cmd.exe', 'https://user:pw@evil.com', 'nonsense']) {
      expect(checkUrl(bad)).not.toBeNull();
    }
  });

  it('allows only documented app schemes', () => {
    expect(checkTarget({ kind: 'uri', uri: 'spotify:' })).toBeNull();
    expect(checkTarget({ kind: 'uri', uri: 'ms-msdt:/id x' })).not.toBeNull();
    expect(checkTarget({ kind: 'uri', uri: 'search-ms:query=x' })).not.toBeNull();
  });

  it('takes only absolute .exe paths', () => {
    expect(checkTarget({ kind: 'exe', path: 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe' })).toBeNull();
    expect(checkTarget({ kind: 'exe', path: 'vlc.exe' })).not.toBeNull();
    expect(checkTarget({ kind: 'exe', path: 'C:\\x\\run.bat' })).not.toBeNull();
    expect(checkTarget({ kind: 'exe', path: 'C:\\x\\a.exe\0.txt' })).not.toBeNull();
  });

  it('matches Start menu apps by exact name first, never an uninstaller', () => {
    const apps = [
      { name: 'Plex HTPC', appId: 'a' },
      { name: 'Plex', appId: 'b' },
      { name: 'Spotify Uninstall', appId: 'c' },
      { name: 'Spotify', appId: 'd' },
      { name: 'Netflix Party', appId: 'e' }
    ];
    expect(findStartApp(apps, 'Plex')?.appId).toBe('b');
    expect(findStartApp(apps, 'Spotify')?.appId).toBe('d');
    expect(findStartApp([{ name: 'Spotify Uninstall', appId: 'c' }], 'Spotify')).toBeUndefined();
    expect(findStartApp(apps, 'Netflix')?.appId).toBe('e');
    expect(findStartApp(apps, 'Apple TV')).toBeUndefined();
  });
});
