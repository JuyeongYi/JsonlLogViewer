import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('fileApi', {
  openFile: (): Promise<string | null> =>
    ipcRenderer.invoke('file:open'),
  readFile: (path: string): Promise<{ content: string; error?: string }> =>
    ipcRenderer.invoke('file:read', path),
})

contextBridge.exposeInMainWorld('schemaApi', {
  list: () => ipcRenderer.invoke('schema:list'),
  save: (id: string, schemaJson: string, configJson: string, viewerHtml: string | null) =>
    ipcRenderer.invoke('schema:save', id, schemaJson, configJson, viewerHtml),
  delete: (id: string) => ipcRenderer.invoke('schema:delete', id),
  readViewer: (viewerPath: string) => ipcRenderer.invoke('schema:readViewer', viewerPath),
})
