import { useState } from 'react';
import type { MediaKind } from '../../../shared/types';
import { desk, report } from '../api';
import { useDeskContext } from '../context';
import { Glyph } from '../components/Icon';
import { ActionTile, MediaTile } from '../components/Tiles';
import { Grid } from './Grid';
import { Sheet } from './Sheet';

const TABS: { kind: MediaKind; label: string }[] = [
  { kind: 'movies', label: 'Movies' },
  { kind: 'shows', label: 'TV Shows' },
  { kind: 'music', label: 'Music' },
  { kind: 'photos', label: 'Photos' }
];

/** The files from the folders the person added, by kind, under tabs like SundarTV's. */
export function LibrarySheet() {
  const d = useDeskContext();
  const [tab, setTab] = useState<MediaKind>(d.libraryTab);
  const [az, setAz] = useState(false);
  const lib = d.library;
  const items = lib.items
    .filter((m) => m.kind === tab)
    .sort((a, b) =>
      az
        ? (a.show ?? a.title).localeCompare(b.show ?? b.title) || (a.season ?? 0) - (b.season ?? 0) || (a.episode ?? 0) - (b.episode ?? 0)
        : b.modified - a.modified
    );

  const addFolder = (): void => {
    desk.pickFolder().then((path) => {
      if (!path) return;
      d.menu(
        'What is in this folder?',
        TABS.map((t) => ({
          label: t.label,
          run: () =>
            void desk.addLibraryFolder(path, t.kind).then(() => {
              setTab(t.kind);
              d.toast('Adding the folder. Files appear as they are found.');
            }, report)
        }))
      );
    }, report);
  };

  return (
    <Sheet scope="library" title="Library">
      <div className="tabs" data-row>
        {TABS.map((t) => (
          <button
            key={t.kind}
            className={`tab${tab === t.kind ? ' on' : ''}`}
            data-item
            data-key={`tab:${t.kind}`}
            data-autofocus={tab === t.kind || undefined}
            onClick={() => setTab(t.kind)}
          >
            {t.label}
          </button>
        ))}
        <span className="tabs-gap" />
        <button className="tab" data-item data-key="lib:sort" onClick={() => setAz(!az)}>
          {az ? 'A to Z' : 'Newest'}
        </button>
        <button className="tab" data-item data-key="lib:add" onClick={addFolder}>
          <Glyph name="folder" /> Add Folder
        </button>
        <button className="tab" data-item data-key="lib:rescan" onClick={() => desk.rescanLibrary().catch(report)}>
          <Glyph name="refresh" /> {lib.scanning ? 'Scanning…' : 'Rescan'}
        </button>
      </div>
      {lib.error && <p className="sheet-note warn">{lib.error}</p>}
      {items.length ? (
        <Grid>{items.map((m) => <MediaTile key={m.id} item={m} />)}</Grid>
      ) : (
        <div className="empty">
          <h2>{d.config.library.folders.length ? `No ${TABS.find((t) => t.kind === tab)?.label.toLowerCase()} yet` : 'Your library is empty'}</h2>
          <p>
            {lib.scanning
              ? 'Still looking through your folders…'
              : 'Add the folders that hold your movies, shows, music or photos. DeskTV only reads the folders you add, never the whole drive.'}
          </p>
          <Grid>{[<ActionTile key="add" keyName="lib:add-empty" label="Add Folder" glyph="folder" onClick={addFolder} />]}</Grid>
        </div>
      )}
    </Sheet>
  );
}
