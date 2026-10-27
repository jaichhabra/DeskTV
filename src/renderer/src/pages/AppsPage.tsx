import { desk, report } from '../api';
import { isAvailable, useDeskContext } from '../context';
import { ActionTile, AppTile } from '../components/Tiles';
import { Grid } from './Grid';
import { TopBar } from './TopBar';

/** Every app, including hidden and not-installed ones, to open, edit, pin or add. */
export function AppsPage() {
  const d = useDeskContext();
  const c = d.config;
  const ready = c.apps.filter((a) => !a.hidden && isAvailable(c, a));
  const others = c.apps.filter((a) => a.hidden || !isAvailable(c, a));
  const ids = ready.map((a) => a.id);
  return (
    <div className="page" data-scope="apps" data-scroller>
      <TopBar title="All apps" />
      <div className="page-body">
        <p className="page-hint">Hold Enter (or press the menu key) on an app to pin, move, edit or hide it.</p>
        <Grid>
          {[
            ...ready.map((a) => <AppTile key={a.id} app={a} list={ids} />),
            <ActionTile key="add" keyName="apps:add" label="Add an app" glyph="plus" onClick={() => d.editApp(null)} />,
            <ActionTile
              key="refresh"
              keyName="apps:refresh"
              label="Look for installed apps"
              glyph="refresh"
              onClick={() =>
                desk.installedApps(true).then(async () => {
                  await d.save((x) => x);
                  d.toast('Updated the list of installed apps');
                }, report)
              }
            />
          ]}
        </Grid>
        {others.length > 0 && (
          <>
            <h2 className="row-title">Hidden or not installed</h2>
            <Grid>{others.map((a) => <AppTile key={a.id} app={a} list={[]} />)}</Grid>
          </>
        )}
      </div>
    </div>
  );
}
