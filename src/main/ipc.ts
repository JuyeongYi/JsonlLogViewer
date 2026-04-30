import { ipcMain, dialog } from 'electron'
import { readFileSync } from 'fs'

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

  ipcMain.handle('file:read', (_event, filePath: string) => {
    try {
      const content = readFileSync(filePath, 'utf-8')
      return { content }
    } catch (err) {
      return { content: '', error: String(err) }
    }
  })
}
