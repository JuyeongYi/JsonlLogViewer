import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, promises as fsPromises } from 'fs'
import { join } from 'path'
import AdmZip from 'adm-zip'
import { loadSchemas, getSchemaDir, saveSchemaOrder } from './schemaRegistry'
import { watchFile, unwatchFile } from './fileWatcher'

export function registerIpcHandlers(): void {
  ipcMain.on('window:setTitle', (_event, title: string) => {
    const win = BrowserWindow.fromWebContents(_event.sender)
    if (win) win.setTitle(title)
  })

  ipcMain.on('window:minimize', (_event) => {
    BrowserWindow.fromWebContents(_event.sender)?.minimize()
  })

  ipcMain.on('window:toggleMaximize', (_event) => {
    const win = BrowserWindow.fromWebContents(_event.sender)
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })

  ipcMain.on('window:toggleFullscreen', (_event) => {
    const win = BrowserWindow.fromWebContents(_event.sender)
    if (!win) return
    win.setFullScreen(!win.isFullScreen())
  })

  ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'JSONL Files', extensions: ['jsonl', 'ndjson'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const content = await fsPromises.readFile(filePath, 'utf-8')
      return { content }
    } catch (err) {
      return { content: '', error: String(err) }
    }
  })

  ipcMain.handle('file:watch', (_event, filePath: string) => {
    watchFile(filePath, _event.sender)
    return { ok: true }
  })

  ipcMain.handle('file:unwatch', (_event, filePath: string) => {
    unwatchFile(filePath)
    return { ok: true }
  })

  ipcMain.handle('schema:list', () => loadSchemas())

  ipcMain.handle('schema:save', (_event, id: string, schemaJson: string, configJson: string, viewerHtml: string | null) => {
    const dir = join(getSchemaDir(), id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'schema.json'), schemaJson, 'utf-8')
    writeFileSync(join(dir, 'config.json'), configJson, 'utf-8')
    if (viewerHtml !== null) {
      writeFileSync(join(dir, 'viewer.html'), viewerHtml, 'utf-8')
    }
    return { ok: true }
  })

  ipcMain.handle('schema:delete', (_event, id: string) => {
    const dir = join(getSchemaDir(), id)
    rmSync(dir, { recursive: true, force: true })
    return { ok: true }
  })

  ipcMain.handle('schema:readViewer', (_event, viewerPath: string) => {
    try {
      return { html: readFileSync(viewerPath, 'utf-8') }
    } catch {
      return { html: null, error: 'viewer.html 읽기 실패' }
    }
  })

  ipcMain.handle('schema:saveOrder', (_event, order: string[]) => {
    saveSchemaOrder(order)
    return { ok: true }
  })

  // 내보내기: schemas/ 디렉토리 구조를 그대로 ZIP으로 압축
  ipcMain.handle('schema:export', async () => {
    const schemaDir = getSchemaDir()
    if (!existsSync(schemaDir)) return { ok: false, count: 0 }

    const zip = new AdmZip()
    const schemaDirs = readdirSync(schemaDir, { withFileTypes: true })
      .filter(d => d.isDirectory())

    let count = 0
    for (const d of schemaDirs) {
      const schemaPath = join(schemaDir, d.name, 'schema.json')
      if (!existsSync(schemaPath)) continue  // schema.json 없으면 건너뜀

      for (const file of ['schema.json', 'config.json', 'viewer.html']) {
        const filePath = join(schemaDir, d.name, file)
        if (existsSync(filePath)) {
          zip.addLocalFile(filePath, d.name)  // ZIP 내 경로: <schema-id>/file
        }
      }
      count++
    }

    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: 'schemas-export.zip',
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    })
    if (canceled || !filePath) return { ok: false, count: 0 }
    zip.writeZip(filePath)
    return { ok: true, count }
  })

  // 가져오기: ZIP에서 <schema-id>/ 폴더 구조 그대로 추출
  ipcMain.handle('schema:import', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      properties: ['openFile'],
    })
    if (canceled || !filePaths[0]) return { ok: false, count: 0 }
    try {
      const zip = new AdmZip(filePaths[0])
      const entries = zip.getEntries()
      const schemaDir = getSchemaDir()
      const seen = new Set<string>()

      for (const entry of entries) {
        if (entry.isDirectory) continue
        // entryName 예: game-event/schema.json
        const parts = entry.entryName.replace(/\\/g, '/').split('/')
        if (parts.length !== 2) continue
        const [schemaId, fileName] = parts
        if (!['schema.json', 'config.json', 'viewer.html'].includes(fileName)) continue

        const destDir = join(schemaDir, schemaId)
        mkdirSync(destDir, { recursive: true })
        writeFileSync(join(destDir, fileName), entry.getData())
        seen.add(schemaId)
      }
      return { ok: true, count: seen.size }
    } catch (e) {
      return { ok: false, error: String(e), count: 0 }
    }
  })
}
