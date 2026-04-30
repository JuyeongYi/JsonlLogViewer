import chokidar, { FSWatcher } from 'chokidar'
import { statSync, readFileSync } from 'fs'
import type { WebContents } from 'electron'

interface WatchEntry {
  watcher: FSWatcher
  lastSize: number
}

const watchers = new Map<string, WatchEntry>()

export function watchFile(filePath: string, sender: WebContents): void {
  if (watchers.has(filePath)) return
  let lastSize = (() => { try { return statSync(filePath).size } catch { return 0 } })()
  const watcher = chokidar.watch(filePath, { persistent: true, usePolling: false })
  watcher.on('change', () => {
    try {
      const newSize = statSync(filePath).size
      if (newSize <= lastSize) return
      const content = readFileSync(filePath, 'utf-8')
      const newContent = content.slice(lastSize)
      lastSize = newSize
      if (newContent.trim()) sender.send('file:append', filePath, newContent)
    } catch { /* ignore */ }
  })
  watchers.set(filePath, { watcher, lastSize })
}

export function unwatchFile(filePath: string): void {
  const entry = watchers.get(filePath)
  if (!entry) return
  entry.watcher.close()
  watchers.delete(filePath)
}

export function unwatchAll(): void {
  for (const [p] of watchers) unwatchFile(p)
}
