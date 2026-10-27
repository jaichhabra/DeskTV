import { app } from 'electron';
import { opendir, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { classify, cleanTitle, parseEpisode, IMAGE_EXT, extOf } from '../shared/media';
import type { LibraryFolder, LibraryState, MediaItem } from '../shared/types';
import { mediaId } from './files';
import { JsonFile } from './store';
import { log } from './log';

const MAX_ITEMS = 20_000;
const MAX_DEPTH = 6;

/**
 * The local library: only the folders the person added, walked in the background a few files at a time so the
 * home screen stays smooth, and kept on disk so it shows at once next time.
 */
export class Library {
  private file = new JsonFile<{ items: MediaItem[]; scannedAt: number | null }>(
    join(app.getPath('userData'), 'library.json')
  );
  private state: LibraryState = { items: [], scanning: false, scannedAt: null, error: null };
  private run = 0;

  constructor(private readonly emit: (s: LibraryState) => void) {
    const raw = this.file.read() as { items?: unknown; scannedAt?: unknown } | null;
    if (raw && Array.isArray(raw.items)) {
      this.state.items = raw.items as MediaItem[];
      this.state.scannedAt = typeof raw.scannedAt === 'number' ? raw.scannedAt : null;
    }
  }

  get(): LibraryState {
    return this.state;
  }

  find(id: string): MediaItem | undefined {
    return this.state.items.find((i) => i.id === id);
  }

  /** Walks the folders again; a newer scan cancels an older one. */
  async scan(folders: LibraryFolder[]): Promise<void> {
    const run = ++this.run;
    this.state = { ...this.state, scanning: true, error: null };
    this.emit(this.state);
    const items: MediaItem[] = [];
    const missing: string[] = [];
    for (const f of folders) {
      try {
        await this.walk(f.path, f, 0, items, run);
      } catch (e) {
        missing.push(f.path);
        log('warn', `Couldn't read ${f.path}`, e);
      }
      if (run !== this.run) return;
    }
    items.sort((a, b) => b.modified - a.modified);
    this.state = {
      items,
      scanning: false,
      scannedAt: Date.now(),
      error: missing.length ? `Couldn't open ${missing.join(', ')}` : null
    };
    void this.file.write({ items, scannedAt: this.state.scannedAt });
    log('info', `Library: ${items.length} items from ${folders.length} folders`);
    this.emit(this.state);
  }

  private async walk(dir: string, folder: LibraryFolder, depth: number, out: MediaItem[], run: number): Promise<void> {
    if (depth > MAX_DEPTH || out.length >= MAX_ITEMS) return;
    const handle = await opendir(dir);
    let n = 0;
    for await (const entry of handle) {
      if (run !== this.run || out.length >= MAX_ITEMS) break;
      if (entry.name.startsWith('.') || entry.name.startsWith('$')) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walk(path, folder, depth + 1, out, run).catch(() => undefined);
        continue;
      }
      if (!entry.isFile()) continue;
      const kind = classify(entry.name, folder.kind);
      if (!kind) continue;
      const s = await stat(path).catch(() => null);
      if (!s) continue;
      const ep = kind === 'shows' ? parseEpisode(entry.name) : null;
      const { title, year } = cleanTitle(entry.name);
      out.push({
        id: mediaId(path),
        kind,
        path,
        title,
        year,
        show: ep?.show ?? null,
        season: ep?.season ?? null,
        episode: ep?.episode ?? null,
        size: s.size,
        modified: s.mtimeMs
      });
      // Let other work run between batches.
      if (++n % 50 === 0) await new Promise((r) => setImmediate(r));
    }
  }
}

/** Pictures in the screensaver's folder (not its subfolders), at most 200. */
export async function photosIn(dir: string): Promise<string[]> {
  try {
    const names = await readdir(dir);
    return names
      .filter((n) => IMAGE_EXT.includes(extOf(n)) && extOf(n) !== '.heic')
      .slice(0, 200)
      .map((n) => join(dir, n));
  } catch (e) {
    log('warn', `Couldn't read the photo folder ${dir}`, e);
    return [];
  }
}
