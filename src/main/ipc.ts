import { ipcMain, dialog } from 'electron'
import { readFileSync, mkdirSync, writeFileSync, rmSync, promises as fsPromises } from 'fs'
import { join } from 'path'
import { loadSchemas, getSchemaDir } from './schemaRegistry'

export function registerIpcHandlers(): void {
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
}
