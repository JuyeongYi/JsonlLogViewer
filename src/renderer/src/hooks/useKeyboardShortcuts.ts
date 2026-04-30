import { useEffect } from 'react'

export interface ShortcutHandlers {
  onNextRow: () => void
  onPrevRow: () => void
  onSearch: () => void
  onCloseDetail: () => void
  onOpenFile: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (!isInput) {
        if (e.key === 'j') { e.preventDefault(); handlers.onNextRow() }
        if (e.key === 'k') { e.preventDefault(); handlers.onPrevRow() }
        if (e.key === 'Escape') { e.preventDefault(); handlers.onCloseDetail() }
      }
      if (e.key === '/' && !isInput) { e.preventDefault(); handlers.onSearch() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); handlers.onOpenFile() }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [handlers])
}
