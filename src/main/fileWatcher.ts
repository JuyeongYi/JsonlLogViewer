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

  const watcher = chokidar.watch(filePath, {
    persistent: true,
    usePolling: true,   // Windows에서 native watcher 불안정 → polling 사용
    interval: 500,      // 500ms 간격
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  })

  watcher.on('change', () => {
    try {
      const newSize = statSync(filePath).size
      if (newSize <= lastSize) return

      // Buffer 슬라이싱으로 바이트 정확히 읽기 (멀티바이트 문자 안전)
      const buf = readFileSync(filePath)
      const newContent = buf.slice(lastSize).toString('utf-8')
      lastSize = newSize

      if (newContent.trim() && !sender.isDestroyed()) {
        sender.send('file:append', filePath, newContent)
      }
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
