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

export interface SchemaEntry {
  id: string               // 디렉토리 이름 (예: "game-event")
  displayName: string      // config.json의 name 필드
  schema: Record<string, unknown>  // JSON Schema 객체
  hasViewer: boolean       // viewer.html 존재 여부
  viewerPath: string | null // viewer.html 절대 경로
}
