import { execFile } from 'node:child_process';
import { networkInterfaces } from 'node:os';

/**
 * The network's name for the top capsule, as SundarTV shows it: the Wi-Fi's SSID (from `netsh wlan show
 * interfaces`), "Ethernet" on a cable, or null when offline.
 */
export function networkName(): Promise<string | null> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(null);
    execFile('netsh', ['wlan', 'show', 'interfaces'], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      const ssid = !err && /^\s*SSID\s*:\s*(.+?)\s*$/m.exec(stdout)?.[1];
      const connected = !err && /^\s*State\s*:\s*connected/im.test(stdout);
      if (ssid && connected) return resolve(ssid.slice(0, 40));
      const wired = Object.entries(networkInterfaces()).some(
        ([name, addrs]) => /ethernet/i.test(name) && addrs?.some((a) => !a.internal && a.family === 'IPv4')
      );
      resolve(wired ? 'Ethernet' : null);
    });
  });
}
