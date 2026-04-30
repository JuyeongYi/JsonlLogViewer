export interface LogRow {
  _lineNumber: number
  _raw: string
  _parseError?: string   // 설정 시 경고 아이콘 표시
  _schemaId: string | null  // null=미검증, ''=미발견(fallback), '<id>'=매칭된 스키마
  _schemaPinned?: boolean   // true=수동 지정, 스키마 변경 시 초기화 안 함
  timestamp?: string | number
  level?: string
  msg?: string
  [key: string]: unknown
}

export interface FilterState {
  levels: string[]       // 선택된 레벨 목록 (빈 배열 = 전체)
  sortOrder: 'asc' | 'desc'  // timestamp 기준 정렬
  msgRegex: string       // msg 필드 정규식 필터
  categoryRegex: string  // category 필드 정규식 필터
}

export interface Tab {
  id: string
  path: string
  label: string
}

// window.fileApi 타입 선언 (preload contextBridge)
declare global {
  interface Window {
    windowApi: {
      setTitle: (title: string) => void
    }
    fileApi: {
      openFile: () => Promise<string | null>
      readFile: (path: string) => Promise<{ content: string; error?: string }>
      watch: (path: string) => Promise<{ ok: boolean }>
      unwatch: (path: string) => Promise<{ ok: boolean }>
      onAppend: (callback: (path: string, newContent: string) => void) => () => void
    }
    schemaApi: {
      list: () => Promise<SchemaEntry[]>
      save: (id: string, schemaJson: string, configJson: string, viewerHtml: string | null) => Promise<{ ok: boolean }>
      delete: (id: string) => Promise<{ ok: boolean }>
      readViewer: (viewerPath: string) => Promise<{ html: string | null; error?: string }>
      saveOrder: (order: string[]) => Promise<{ ok: boolean }>
      exportSchemas: () => Promise<{ ok: boolean; count?: number }>
      importSchemas: () => Promise<{ ok: boolean; count?: number; error?: string }>
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
