import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('fileApi', {
  openFile: (): Promise<string | null> =>
    ipcRenderer.invoke('file:open'),
  readFile: (path: string): Promise<{ content: string; error?: string }> =>
    ipcRenderer.invoke('file:read', path),
  watch: (path: string) => ipcRenderer.invoke('file:watch', path),
  unwatch: (path: string) => ipcRenderer.invoke('file:unwatch', path),
  onAppend: (callback: (path: string, newContent: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, path: string, content: string) =>
      callback(path, content)
    ipcRenderer.on('file:append', handler)
    return () => ipcRenderer.removeListener('file:append', handler)
  },
})

contextBridge.exposeInMainWorld('windowApi', {
  setTitle: (title: string) => ipcRenderer.send('window:setTitle', title),
})

contextBridge.exposeInMainWorld('schemaApi', {
  list: () => ipcRenderer.invoke('schema:list'),
  save: (id: string, schemaJson: string, configJson: string, viewerHtml: string | null) =>
    ipcRenderer.invoke('schema:save', id, schemaJson, configJson, viewerHtml),
  delete: (id: string) => ipcRenderer.invoke('schema:delete', id),
  readViewer: (viewerPath: string) => ipcRenderer.invoke('schema:readViewer', viewerPath),
  saveOrder: (order: string[]) => ipcRenderer.invoke('schema:saveOrder', order),
  exportSchemas: () => ipcRenderer.invoke('schema:export'),
  importSchemas: () => ipcRenderer.invoke('schema:import'),
})
