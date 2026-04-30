import { useEffect } from 'react'

export interface ShortcutHandlers {
  onNextRow: () => void
  onPrevRow: () => void
  onSearchMsg: () => void      // i → msg 입력 포커스
  onSearchCategory: () => void // u → 카테고리 입력 포커스
  onClearMsg: () => void       // Ctrl+i → msg 입력 비우기
  onClearCategory: () => void  // Ctrl+u → 카테고리 입력 비우기
  onNextTab: () => void        // Ctrl+j → 다음 탭
  onPrevTab: () => void        // Ctrl+k → 이전 탭
  onToggleError: () => void    // Ctrl+q → error 토글
  onToggleWarn: () => void     // Ctrl+w → warn 토글
  onToggleInfo: () => void     // Ctrl+e → info 토글
  onToggleDebug: () => void    // Ctrl+r → debug 토글
  onNextView: () => void       // Shift+j → 다음 뷰
  onPrevView: () => void       // Shift+k → 이전 뷰
  onCloseDetail: () => void
  onOpenFile: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (!isInput) {
        if (e.key === 'j' && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); handlers.onNextRow() }
        if (e.key === 'k' && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); handlers.onPrevRow() }
        if (e.key === 'J' || (e.key === 'j' && e.shiftKey)) { e.preventDefault(); handlers.onNextView() }
        if (e.key === 'K' || (e.key === 'k' && e.shiftKey)) { e.preventDefault(); handlers.onPrevView() }
        if (e.key === 'i' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); handlers.onSearchMsg() }
        if (e.key === 'u' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); handlers.onSearchCategory() }
        if (e.key === 'Escape') { e.preventDefault(); handlers.onCloseDetail() }
      }

      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'i') { e.preventDefault(); handlers.onClearMsg() }
      if (ctrl && e.key === 'u') { e.preventDefault(); handlers.onClearCategory() }
      if (ctrl && e.key === 'j') { e.preventDefault(); handlers.onNextTab() }
      if (ctrl && e.key === 'k') { e.preventDefault(); handlers.onPrevTab() }
      if (ctrl && e.key === 'q') { e.preventDefault(); handlers.onToggleError() }
      if (ctrl && e.key === 'w') { e.preventDefault(); handlers.onToggleWarn() }
      if (ctrl && e.key === 'e') { e.preventDefault(); handlers.onToggleInfo() }
      if (ctrl && e.key === 'r') { e.preventDefault(); handlers.onToggleDebug() }
      if (ctrl && e.key === 'o') { e.preventDefault(); handlers.onOpenFile() }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [handlers])
}
