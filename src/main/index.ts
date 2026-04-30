import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc'
import { unwatchAll } from './fileWatcher'
import { parseArgv, runSchemaCommand, printHelp } from './cli'

// ── 단일 인스턴스 lock ──────────────────────────────────
let mainWindow: BrowserWindow | null = null

function loadWindowBounds(): { width: number; height: number; x?: number; y?: number; maximized: boolean } {
  try {
    const store = join(app.getPath('userData'), 'window-state.json')
    if (require('fs').existsSync(store)) {
      return JSON.parse(require('fs').readFileSync(store, 'utf-8'))
    }
  } catch { /* 무시 */ }
  return { width: 1400, height: 900, maximized: false }
}

function saveWindowBounds(): void {
  if (!mainWindow) return
  try {
    const maximized = mainWindow.isMaximized()
    const bounds = maximized ? {} : mainWindow.getBounds()
    const store = join(app.getPath('userData'), 'window-state.json')
    require('fs').writeFileSync(store, JSON.stringify({ ...bounds, maximized }), 'utf-8')
  } catch { /* 무시 */ }
}

function createWindow(): void {
  const saved = loadWindowBounds()

  mainWindow = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    ...(saved.x !== undefined ? { x: saved.x, y: saved.y } : {}),
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    if (saved.maximized) mainWindow!.maximize()
  })

  // 크기/위치 변경 시 저장 (300ms 디바운스)
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(saveWindowBounds, 300)
  }
  mainWindow.on('resize', scheduleSave)
  mainWindow.on('move', scheduleSave)
  mainWindow.on('maximize', saveWindowBounds)
  mainWindow.on('unmaximize', saveWindowBounds)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── CLI 진입점 ──────────────────────────────────────────
const cliArgs = process.argv.slice(app.isPackaged ? 1 : 2)
const parsed = parseArgv(cliArgs)

if (parsed.cmd === 'help') {
  printHelp()
  process.exit(0)
}
if (parsed.cmd === 'schema') {
  process.exit(runSchemaCommand(parsed))
}
if (parsed.cmd === 'error') {
  process.stderr.write(parsed.message + '\n')
  process.stderr.write('도움말: jllv --help\n')
  process.exit(1)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// OS 다크/라이트 모드 자동 추적
nativeTheme.themeSource = 'system'

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', (_event, secondArgv) => {
  const secondArgs = secondArgv.slice(app.isPackaged ? 1 : 2)
  const secondParsed = parseArgv(secondArgs)
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    if (secondParsed.cmd === 'open' && secondParsed.paths.length > 0) {
      mainWindow.webContents.send('cli:openFiles', secondParsed.paths, secondParsed.tail)
    }
  }
})

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  registerIpcHandlers()
  createWindow()

  // 첫 인스턴스가 open 명령으로 실행된 경우
  if (parsed.cmd === 'open' && parsed.paths.length > 0 && mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow!.webContents.send('cli:openFiles', parsed.paths, parsed.tail)
    })
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => unwatchAll())

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
