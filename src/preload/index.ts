import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { Channel, DeskApi } from '../shared/ipc';

/** The screen's only door to the system: named calls, no raw ipcRenderer, no Node. */
const call =
  (channel: Channel) =>
  (...args: unknown[]): Promise<any> =>
    ipcRenderer.invoke(channel, ...args);

const listen =
  (event: string) =>
  (cb: (payload: any) => void): (() => void) => {
    const fn = (_e: IpcRendererEvent, payload: unknown): void => cb(payload);
    ipcRenderer.on(event, fn);
    return () => ipcRenderer.removeListener(event, fn);
  };

const api: DeskApi = {
  getConfig: call('config:get'),
  setConfig: call('config:set'),
  resetConfig: call('config:reset'),
  exportConfig: call('config:export'),
  importConfig: call('config:import'),
  installedApps: call('apps:installed'),
  launchApp: call('apps:launch'),
  appIcon: call('apps:icon'),
  openMedia: call('media:open'),
  pickExecutable: call('pick:exe'),
  pickImage: call('pick:image'),
  pickFolder: call('pick:folder'),
  library: call('library:get'),
  rescanLibrary: call('library:rescan'),
  addLibraryFolder: call('library:add'),
  thumbnail: call('library:thumb'),
  saverPhotos: call('saver:photos'),
  imageUrl: call('image:url'),
  feeds: call('feeds:get'),
  refreshFeeds: call('feeds:refresh'),
  systemInfo: call('system:info'),
  display: call('display:get'),
  setTvMode: call('window:tv'),
  minimize: call('window:minimize'),
  quit: call('app:quit'),
  log: (level, message) => ipcRenderer.send('log', level, message),
  onConfig: listen('config'),
  onDisplay: listen('display'),
  onLibrary: listen('library'),
  onFeeds: listen('feeds'),
  onReturn: listen('return'),
  onIcons: listen('icons')
};

contextBridge.exposeInMainWorld('desk', api);
