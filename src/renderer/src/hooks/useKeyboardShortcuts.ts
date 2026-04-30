import { useEffect } from 'react'

export interface ShortcutHandlers {
  onNextRow: () => void
  onPrevRow: () => void
  onSearchMsg: () => void      // i → msg 정규식 포커스
  onSearchCategory: () => void // u → 카테고리 정규식 포커스
  onNextTab: () => void        // Ctrl+j → 다음 탭
  onPrevTab: () => void        // Ctrl+k → 이전 탭
  onCloseDetail: () => void
  onOpenFile: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (!isInput) {
        if (e.key === 'j' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); handlers.onNextRow() }
        if (e.key === 'k' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); handlers.onPrevRow() }
        if (e.key === 'i') { e.preventDefault(); handlers.onSearchMsg() }
        if (e.key === 'u') { e.preventDefault(); handlers.onSearchCategory() }
        if (e.key === 'Escape') { e.preventDefault(); handlers.onCloseDetail() }
      }

      // Ctrl+j/k → 탭 이동 (입력 중에도 동작)
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') { e.preventDefault(); handlers.onNextTab() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); handlers.onPrevTab() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); handlers.onOpenFile() }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [handlers])
}
