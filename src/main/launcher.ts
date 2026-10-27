import { app, shell } from 'electron';
import { execFile, spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkAppId, checkTarget, findStartApp } from '../shared/launch';
import type { AppEntry, InstalledApp, LaunchResult, LaunchTarget } from '../shared/types';
import { JsonFile } from './store';
import { log } from './log';

/**
 * Finds installed apps through Windows' own Get-StartApps (the Start menu's list: Store apps and desktop programs)
 * and opens them through explorer's shell:AppsFolder, the supported way to start a Store app by its id.
 * The list is cached, so the home screen never waits for PowerShell.
 */
let installed: InstalledApp[] = [];
let loading: Promise<InstalledApp[]> | null = null;
let cache: JsonFile<InstalledApp[]>;
/** Store apps' own logos (their manifest's tile image), by app id. */
let logos: Record<string, string> = {};
let logoCache: JsonFile<Record<string, string>>;

export function initInstalled(): void {
  cache = new JsonFile(join(app.getPath('userData'), 'start-apps.json'));
  const raw = cache.read();
  if (Array.isArray(raw)) installed = raw.filter(isInstalledApp);
  logoCache = new JsonFile(join(app.getPath('userData'), 'app-logos.json'));
  const l = logoCache.read();
  if (l && typeof l === 'object') logos = l as Record<string, string>;
}

// Reads each Store app's manifest for its tile logo, picking the largest scale Windows ships.
const LOGO_SCRIPT = `$r=@{}; foreach($p in Get-AppxPackage){ try { $m=[xml](Get-Content (Join-Path $p.InstallLocation 'AppxManifest.xml') -Raw -ErrorAction Stop); foreach($a in @($m.Package.Applications.Application)){ $ve=$a.VisualElements; if(-not $ve){continue}; $logo=$ve.Square150x150Logo; if(-not $logo){$logo=$ve.Square44x44Logo}; if(-not $logo){continue}; $base=Join-Path $p.InstallLocation $logo; $dir=Split-Path $base; $stem=[IO.Path]::GetFileNameWithoutExtension($base); $ext=[IO.Path]::GetExtension($base); $f=Get-ChildItem $dir -Filter "$stem*$ext" -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch 'contrast|altform' } | Sort-Object Length -Descending | Select-Object -First 1; if($f){ $r["$($p.PackageFamilyName)!$($a.Id)"]=$f.FullName } } } catch {} }; $r | ConvertTo-Json -Compress`;

export function refreshLogos(): Promise<void> {
  if (process.platform !== 'win32') return Promise.resolve();
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', LOGO_SCRIPT],
      { windowsHide: true, timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout) => {
        if (err) log('warn', 'Reading app logos failed', err);
        else {
          try {
            const parsed: unknown = JSON.parse(stdout || '{}');
            if (parsed && typeof parsed === 'object') {
              logos = Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
              void logoCache.write(logos);
            }
          } catch (e) {
            log('warn', 'Could not read the app logos', e);
          }
        }
        resolve();
      }
    );
  });
}

// Known-folder ids that Get-StartApps puts in front of desktop programs' paths.
const KNOWN_FOLDERS: Record<string, string | undefined> = {
  '{6D809377-6AF0-444B-8957-A3773F02200E}': process.env.ProgramW6432 ?? process.env.ProgramFiles,
  '{7C5A40EF-A0FB-4BFC-874A-C0F2E0B9FA8E}': process.env['ProgramFiles(x86)'],
  '{F38BF404-1D43-42F2-9305-67DE0B28FC23}': process.env.SystemRoot,
  '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}': process.env.SystemRoot ? join(process.env.SystemRoot, 'System32') : undefined
};

/**
 * Where an app's own icon is on this PC: a Store app's logo image, or a desktop program's .exe (Windows draws its
 * icon). Null when it isn't installed or has neither.
 */
export function iconSource(entry: AppEntry): { kind: 'image' | 'exe'; path: string } | null {
  for (const t of entry.launch) {
    if (t.kind === 'exe' && existsSync(t.path)) return { kind: 'exe', path: t.path };
    if (t.kind !== 'startApp') continue;
    const found = findStartApp(installed, t.match);
    if (!found) continue;
    if (logos[found.appId]) return { kind: 'image', path: logos[found.appId] };
    const m = /^(\{[0-9A-Fa-f-]+\})\\(.+\.exe)$/i.exec(found.appId);
    const root = m ? KNOWN_FOLDERS[m[1].toUpperCase()] : undefined;
    const exe = root && m ? join(root, m[2]) : /^[a-z]:\\.+\.exe$/i.test(found.appId) ? found.appId : null;
    if (exe && existsSync(exe)) return { kind: 'exe', path: exe };
  }
  return null;
}

function isInstalledApp(v: unknown): v is InstalledApp {
  const a = v as InstalledApp;
  return !!a && typeof a.name === 'string' && typeof a.appId === 'string';
}

export function installedApps(refresh = false): Promise<InstalledApp[]> {
  if (process.platform !== 'win32') return Promise.resolve([]);
  if (!refresh && installed.length) return Promise.resolve(installed);
  if (loading) return loading;
  loading = new Promise<InstalledApp[]>((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', 'Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Compress'],
      { windowsHide: true, timeout: 20_000, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout) => {
        loading = null;
        if (err) {
          log('warn', 'Get-StartApps failed', err);
          resolve(installed);
          return;
        }
        try {
          const parsed: unknown = JSON.parse(stdout || '[]');
          const list = (Array.isArray(parsed) ? parsed : [parsed])
            .map((x) => ({ name: String((x as { Name?: unknown }).Name ?? ''), appId: String((x as { AppID?: unknown }).AppID ?? '') }))
            .filter((x) => x.name && x.appId && checkAppId(x.appId) === null);
          installed = list;
          void cache.write(list);
          log('info', `Found ${list.length} Start menu apps`);
        } catch (e) {
          log('warn', 'Could not read Get-StartApps output', e);
        }
        resolve(installed);
      }
    );
  });
  return loading;
}

/** Whether any of an app's ways to open can work on this PC. */
export function available(entry: AppEntry): boolean {
  return entry.launch.some((t) => {
    if (t.kind === 'startApp') return !!findStartApp(installed, t.match);
    if (t.kind === 'exe') return existsSync(t.path);
    return true;
  });
}

export async function launch(entry: AppEntry): Promise<LaunchResult> {
  const errors: string[] = [];
  for (const t of entry.launch) {
    const problem = checkTarget(t);
    if (problem) {
      errors.push(problem);
      continue;
    }
    try {
      if (await open(t)) {
        log('info', `Opened ${entry.name} via ${t.kind}`);
        return { ok: true, via: t.kind };
      }
    } catch (e) {
      log('warn', `Couldn't open ${entry.name} via ${t.kind}`, e);
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  return { ok: false, error: errors[0] ?? `${entry.name} isn't installed on this PC` };
}

/** Opens one target; false when it doesn't apply here (say, the app isn't installed), so the next one is tried. */
async function open(t: LaunchTarget): Promise<boolean> {
  switch (t.kind) {
    case 'startApp': {
      const found = findStartApp(installed, t.match);
      if (!found) return false;
      detached('explorer.exe', [`shell:AppsFolder\\${found.appId}`]);
      return true;
    }
    case 'exe': {
      if (!existsSync(t.path) || !statSync(t.path).isFile()) return false;
      detached(t.path, t.args ?? [], dirname(t.path));
      return true;
    }
    case 'uri':
    case 'url':
      await shell.openExternal(t.kind === 'url' ? t.url : t.uri);
      return true;
  }
}

/** Starts a program on its own, without a shell, so DeskTV closing never takes it along. */
export function detached(file: string, args: string[], cwd?: string): void {
  const child = spawn(file, args, { cwd, detached: true, stdio: 'ignore', shell: false, windowsHide: false });
  child.on('error', (e) => log('warn', `Couldn't start ${file}`, e));
  child.unref();
}

/** VLC's usual places, for playing local files with it. */
export function findVlc(): string | null {
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean) as string[];
  for (const r of roots) {
    const p = join(r, 'VideoLAN', 'VLC', 'vlc.exe');
    if (existsSync(p)) return p;
  }
  return null;
}
