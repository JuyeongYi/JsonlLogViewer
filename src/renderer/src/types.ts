export interface LogRow {
  _lineNumber: number
  _raw: string
  _parseError?: string   // 설정 시 경고 아이콘 표시
  timestamp?: string | number
  level?: string
  msg?: string
  [key: string]: unknown
}

export interface FilterState {
  text: string
  level: string  // '' = 전체
}

// window.fileApi 타입 선언 (preload contextBridge)
declare global {
  interface Window {
    fileApi: {
      openFile: () => Promise<string | null>
      readFile: (path: string) => Promise<{ content: string; error?: string }>
    }
  }
}
