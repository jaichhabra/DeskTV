import type { DeskApi } from '../../shared/ipc';
import type { Config } from '../../shared/types';

declare global {
  interface Window {
    desk: DeskApi;
  }
}

export const desk: DeskApi = window.desk;

/** Settings as the main process sends them: with the ids of the apps that can open on this PC. */
export type LiveConfig = Config & { available?: string[] };

export function report(e: unknown): void {
  desk?.log('error', e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e));
}
