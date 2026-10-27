# DeskTV

A cinematic, full-screen home screen for a Windows PC on a TV, monitor or projector. Turn the PC on and it feels
like a smart TV: a calm, Apple TV-like home screen with your streaming apps, your own movies and music, the time and
weather, and a quote screensaver, all driven by a remote, keyboard, mouse or controller.

It looks and feels like [SundarTV](https://github.com/jaichhabra/sundartv), the ad-free Android TV home screen, on a
Windows PC: the same weather sky (ported from SundarTV's `WeatherSky`: clear, cloudy, fog, rain on the glass, snow,
storms, by day, at dusk and at night), the date, the large clock, the weather and prices on the left, round glass
buttons at the top right, the glass shelf of apps that rises to open the drawer (library, shortcuts, the weather and
prices cards), SundarTV's settings and its quote screensaver. Everything is laid out on SundarTV's 1920 × 1080 stage
and scaled to the screen, as a TV would. The screen handling
follows the HY300 projector work: measure the screen first, decide the layout after, settle changes before acting,
and always keep a fallback and a manual override.

Made by JC.

## What it does

- **Home screen.** SundarTV's: the date, a large clock, the weather and prices over a live weather sky, round glass
  buttons (network, search, library, all apps, settings, power), and the glass shelf of apps. Down from the shelf
  opens the drawer: the library, shortcuts, an hourly weather card and a prices card. Soft navigation sounds.
- **Opens the real apps.** Netflix, Prime Video, YouTube, Spotify, YouTube Music, Apple TV, JioHotstar, Plex, VLC,
  a browser, Steam and Xbox come set up. Each opens its installed Windows app when the Start menu has it, and
  otherwise its official website in your default browser. Add any website or program, rename apps, change their
  picture, color and row, pin, hide and reorder them.
- **Logos.** Bundled marks from Simple Icons (CC0) where it has them; otherwise the installed app's own icon from
  Windows; otherwise the name as a wordmark. Any tile can use a picture you choose.
- **Your library.** Only the folders you add (movies, TV shows, music, photos), read in the background, with Windows'
  own thumbnails. Files play in VLC or Windows' default app.
- **Search** across apps, the library and recently opened.
- **Widgets, all optional:** the clock, weather (Open-Meteo, no account), crypto prices (Binance's public prices,
  with the time they were updated), network status and system information.
- **Screensaver** after a delay you choose: slow light or your photos, a large clock and date, the weather and a
  quote every 45 seconds. It only starts while DeskTV is in front, never over a film in another app.
- **TV mode.** Borderless full screen on the screen you pick, optionally when Windows starts.
- **Works offline.** Nothing waits for the network; weather and prices show their last values and their age.

## Using it

| | Keyboard / remote | Controller |
| --- | --- | --- |
| Move | Arrow keys | D-pad or left stick |
| Open | Enter | A |
| Menu for an app (pin, move, edit, hide) | Hold Enter, or the Menu key | Hold A, or Y |
| Back | Esc, Backspace or Back | B |
| Search | `/` or Ctrl + F | |
| TV mode on or off | F11 | |
| Bring DeskTV back from any app | Ctrl + Alt + Home | |
| Open the drawer | ↓ from the shelf | ↓ |

The mouse works too: pointing focuses, clicking opens, right-click opens an app's menu.

**Getting out:** Esc on the home screen (or the power button at the top right) offers *Show the desktop*, *Leave TV
mode* and *Quit*. DeskTV never blocks Alt + Tab, the Windows key or Ctrl + Alt + Delete. If it ever misbehaves,
start it with `--windowed` and it won't go full screen, whatever the settings say.

**Websites open in a normal browser window.** Edge and Chrome ignore a "start full screen" request when they're
already running, so DeskTV doesn't pretend to control it: press F11 in the browser, or install the service's Windows
app (Netflix, Prime Video, Apple TV and others are in the Microsoft Store), which DeskTV then opens instead.

## Install

### From the installer

GitHub Actions builds `DeskTV-Setup-<version>.exe` on every push to `main` (Actions → Build → artifact
*DeskTV-Setup*). It isn't code-signed yet, so Windows SmartScreen warns about it, and on a PC with **Smart App
Control** on, Windows blocks it outright. On those PCs, use the next way.

### From the source (works with Smart App Control)

Needs [Node.js](https://nodejs.org) 22.

```powershell
npm install
npm run build
powershell -ExecutionPolicy Bypass -File tools\shortcut.ps1
```

The last line adds *DeskTV* to the Start menu and the desktop. It runs DeskTV with Electron's own signed runtime from
this folder, so Smart App Control allows it. *Start with Windows* in Settings works this way too.

## Developing

```powershell
npm run dev        # live-reloading app
npm test           # unit tests (Vitest)
npm run typecheck
npm run dist       # typecheck, test, build and make the installer in dist\
```

Smart App Control also blocks Rollup's native module, so `package.json` uses Rollup's WebAssembly build
(`overrides`). `npm run dist` needs a PC without Smart App Control (electron-builder runs the uninstaller it makes);
CI does this.

### How it's built

Electron + React + TypeScript + Vite (electron-vite), packaged by electron-builder.

- `src/main/`: the system side. `launcher.ts` finds installed apps with `Get-StartApps` and opens them through
  `shell:AppsFolder`; programs start detached without a shell; websites go to the default browser. `display.ts`
  measures the screens and moves the window when they change (settled for half a second). `library.ts` walks the
  added folders a few files at a time. `feeds.ts` fetches weather and prices only while a widget needs them and the
  window is showing. `store.ts` saves settings atomically with a backup. `files.ts` serves pictures to the screen
  through the `dtv:` scheme, never as paths.
- `src/preload/`: the screen's only door to the system, a typed list of calls.
- `src/renderer/`: the screen. `focus.ts` and `input.ts` are the remote-style focus (rows of items, nearest item
  up and down, remembered per page) and the keyboard, mouse and Gamepad input. `hooks.ts` turns the window's
  measured size into the layout.
- `src/shared/`: what both sides use, and what the tests cover: settings and their validation (`config.ts`), the
  screen-aware layout and its settler (`layout.ts`), launch rules (`launch.ts`), file names to titles and episodes
  (`media.ts`), focus movement (`nav.ts`).

**Layout.** Everything is in rem, and the root size follows the window's real size in CSS pixels (so Windows'
scaling is already applied): text grows with the screen's height but slower than it (a 4K TV at 100% gets about
1.75× the text, not 2×), very wide screens keep the content to a readable width, tiles keep 16:9, and the number of
tiles across follows the width. Settings → *Screen and TV mode* has the manual size, an edge margin for TVs that crop
the picture, and the screen to use; it lists what was measured.

**Security.** Context isolation, sandboxed renderer without Node, a strict Content Security Policy (no network from
the screen at all), validated IPC from the one window only, navigation and new windows refused, all permissions
denied, only https/http websites and a short list of documented app schemes (`spotify:`, `steam:`, `xbox:`), only
`.exe` programs the person picked, and settings re-validated on every load and import.

### Settings and logs

`%APPDATA%\DeskTV\`: `config.json` (with `config.backup.json`), the library index, cached weather and prices,
thumbnails, and `logs\desktv.log`.

## Testing it by hand

1. Start it windowed (`npm run dev`, or `electron . --windowed` after a build). The home screen should show at once,
   even offline.
2. Arrows move focus without it ever disappearing; Enter on Netflix opens the Netflix app if installed, else
   netflix.com. Ctrl + Alt + Home brings DeskTV back.
3. Hold Enter on a tile: pin, move (arrows, then Enter), edit, hide. Restart: the changes stay.
4. Settings → Widgets → City, Save: the weather appears. Turn on prices.
5. Library → Add folder → choose a folder of videos: tiles with thumbnails appear; Enter plays.
6. Settings → Screensaver → Preview; any key closes it.
7. Drag the window to another screen, or change Windows' scaling: the layout settles to the new size. F11 switches
   TV mode.

## License

MIT (see `LICENSE`). Inter is under the SIL Open Font License; brand marks come from Simple Icons (CC0) and belong to
their owners; see `NOTICE.md`.
