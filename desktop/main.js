// Kotsu for Mac and Windows: one window showing the same app as the website.
// The built site travels inside the program, so it opens without a connection;
// signing in and syncing talk to Supabase exactly as they do in a browser.
import { app, BrowserWindow, nativeTheme, net, protocol, session, shell } from 'electron'
import { extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** The app's own address. A fixed one, so what is saved on this computer is found again on the next launch. */
const HOME = 'app://kotsu'
const FILES = join(import.meta.dirname, app.isPackaged ? 'dist' : '../dist')
const MAC = process.platform === 'darwin'

// Layers of glass over a full-window picture need more graphics memory than Chromium allows by default;
// without this it drops parts of a frame while the page is being built, which shows as flicker.
app.commandLine.appendSwitch('force-gpu-mem-available-mb', '1024')

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }])

/** A path with an extension is a file; anything else (/daily) is a page, and every page is index.html. */
const serve = ({ url }) => {
  const file = join(FILES, decodeURIComponent(new URL(url).pathname))
  return net.fetch(pathToFileURL(extname(file) && file.startsWith(FILES) ? file : join(FILES, 'index.html')).href)
}

/** Kotsu is all this window shows; any other address belongs in the browser. */
const outside = (url) => {
  if (url.startsWith('https:')) shell.openExternal(url)
  return { action: 'deny' }
}

function open() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#06122b' : '#f1b9cf', // index.html's first-paint colours
    autoHideMenuBar: true,
    // On a Mac the picture runs to the top edge, with the window buttons floating over it (see preload.cjs).
    ...(MAC && { titleBarStyle: 'hidden', trafficLightPosition: { x: 16, y: 8 } }),
    webPreferences: { preload: join(import.meta.dirname, 'preload.cjs') },
  })
  win.once('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => outside(url))
  win.webContents.on('will-navigate', (event, url) => url.startsWith(HOME) || (event.preventDefault(), outside(url)))
  win.loadURL(HOME)
}

// One copy at a time: two would write over each other's saved data.
if (!app.requestSingleInstanceLock()) app.exit()

app.on('second-instance', () => BrowserWindow.getAllWindows()[0]?.show())
app.on('activate', () => BrowserWindow.getAllWindows().length || open())
app.on('window-all-closed', () => MAC || app.quit())

app.whenReady().then(() => {
  protocol.handle('app', serve)
  // A planner needs no camera, microphone, location or notifications.
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, answer) => answer(false))
  open()
})
