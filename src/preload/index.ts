import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('fileApi', {
  openFile: (): Promise<string | null> =>
    ipcRenderer.invoke('file:open'),
  readFile: (path: string): Promise<{ content: string; error?: string }> =>
    ipcRenderer.invoke('file:read', path),
})
