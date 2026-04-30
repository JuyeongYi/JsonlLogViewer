import { ipcMain, dialog } from 'electron'
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync, promises as fsPromises } from 'fs'
import { join } from 'path'
import { loadSchemas, getSchemaDir, saveSchemaOrder } from './schemaRegistry'

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

  ipcMain.handle('schema:saveOrder', (_event, order: string[]) => {
    saveSchemaOrder(order)
    return { ok: true }
  })

  ipcMain.handle('schema:export', async () => {
    const schemas = loadSchemas()
    const data = schemas.map(s => {
      const dir = join(getSchemaDir(), s.id)
      const viewerPath = join(dir, 'viewer.html')
      return {
        id: s.id,
        displayName: s.displayName,
        schema: s.schema,
        viewerHtml: existsSync(viewerPath) ? readFileSync(viewerPath, 'utf-8') : null,
      }
    })
    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: 'schemas-export.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (canceled || !filePath) return { ok: false }
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { ok: true, count: data.length }
  })

  ipcMain.handle('schema:import', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (canceled || !filePaths[0]) return { ok: false, count: 0 }
    try {
      const raw = readFileSync(filePaths[0], 'utf-8')
      const entries = JSON.parse(raw)
      let count = 0
      for (const entry of entries) {
        if (!entry.id || !entry.schema) continue
        const dir = join(getSchemaDir(), entry.id)
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'schema.json'), JSON.stringify(entry.schema), 'utf-8')
        writeFileSync(join(dir, 'config.json'), JSON.stringify({ name: entry.displayName ?? entry.id }), 'utf-8')
        if (entry.viewerHtml) writeFileSync(join(dir, 'viewer.html'), entry.viewerHtml, 'utf-8')
        count++
      }
      return { ok: true, count }
    } catch (e) {
      return { ok: false, error: String(e), count: 0 }
    }
  })
}
