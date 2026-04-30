# JsonlLogViewer Phase 2 — 스키마 플러그인 시스템

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠ 실행 전 필수 확인:** Phase 1 구현 완료 후 이 플랜을 검토하라. 실제 파일 경로, 타입 이름, IPC 채널명이 Phase 1 구현과 일치하는지 확인하고 필요 시 수정한 뒤 실행할 것.

**Goal:** JSON Schema + HTML 뷰어 파일을 등록하면, 행 클릭 시 해당 스키마의 커스텀 HTML 뷰어(iframe)를 보여주고 미등록 시 JSON 트리로 폴백.

**Architecture:** Main 프로세스가 `%APPDATA%/JsonlLogViewer/schemas/` 디렉토리를 스캔해 스키마를 로드. Renderer에서 Ajv로 lazy 검증 후 매칭 스키마의 viewer.html을 `<iframe sandbox>` 안에서 실행. postMessage로 데이터 주입.

**Tech Stack:** Ajv, Phase 1과 동일 (Electron, React, TypeScript, electron-vite)

---

## File Map

```
src/
├── main/
│   ├── ipc.ts              # Modify: schema IPC 핸들러 추가
│   └── schemaRegistry.ts   # Create: 디스크 스키마 로드/저장/삭제
├── renderer/
│   ├── types.ts            # Modify: SchemaEntry 타입 추가
│   ├── utils/
│   │   └── schemaValidator.ts  # Create: Ajv lazy 검증
│   ├── components/
│   │   ├── DetailPanel.tsx     # Modify: SchemaViewer 통합
│   │   ├── SchemaViewer.tsx    # Create: iframe sandbox + postMessage
│   │   ├── Sidebar.tsx         # Create: 사이드바 (스키마 목록 + 관리 버튼)
│   │   └── SchemaManagement.tsx # Create: 스키마 등록/편집/삭제 UI
│   ├── hooks/
│   │   └── useSchemaRegistry.ts # Create: 스키마 상태 + IPC 연동
│   └── App.tsx             # Modify: Sidebar 추가, 레이아웃 조정
tests/
└── renderer/
    ├── schemaValidator.test.ts  # Create
    └── schemaRegistry.test.ts  # Create (main 로직 단위 테스트)
```

---

## Task 1: SchemaEntry 타입 + main 스키마 레지스트리

**Files:**
- Modify: `src/renderer/types.ts`
- Create: `src/main/schemaRegistry.ts`

- [ ] **Step 1: SchemaEntry 타입 추가**

`src/renderer/types.ts` 하단에 추가:

```typescript
export interface SchemaEntry {
  id: string               // 디렉토리 이름 (예: "game-event")
  displayName: string      // config.json의 name 필드
  schema: Record<string, unknown>  // JSON Schema 객체
  hasViewer: boolean       // viewer.html 존재 여부
  viewerPath: string | null // viewer.html 절대 경로
}
```

- [ ] **Step 2: 스키마 레지스트리 작성 (실패 테스트 먼저)**

```typescript
// tests/renderer/schemaRegistry.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// main 프로세스 로직을 직접 import (Node 환경에서 실행)
// vitest.config.ts의 environment를 'node'로 별도 설정 필요 (아래 참고)
import { loadSchemas, schemaDir } from '../../src/main/schemaRegistry'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import os from 'os'

const TEST_SCHEMA_DIR = join(os.tmpdir(), 'jlv-test-schemas')

vi.mock('../../src/main/schemaRegistry', async (importActual) => {
  const actual = await importActual<typeof import('../../src/main/schemaRegistry')>()
  return { ...actual, schemaDir: TEST_SCHEMA_DIR }
})

beforeEach(() => {
  rmSync(TEST_SCHEMA_DIR, { recursive: true, force: true })
  mkdirSync(TEST_SCHEMA_DIR, { recursive: true })
})

describe('loadSchemas', () => {
  it('유효한 스키마 디렉토리를 로드한다', () => {
    const schemaId = 'test-schema'
    mkdirSync(join(TEST_SCHEMA_DIR, schemaId))
    writeFileSync(
      join(TEST_SCHEMA_DIR, schemaId, 'schema.json'),
      JSON.stringify({ type: 'object', required: ['level'] })
    )
    writeFileSync(
      join(TEST_SCHEMA_DIR, schemaId, 'config.json'),
      JSON.stringify({ name: 'Test Schema' })
    )

    const schemas = loadSchemas()
    expect(schemas).toHaveLength(1)
    expect(schemas[0].id).toBe(schemaId)
    expect(schemas[0].displayName).toBe('Test Schema')
    expect(schemas[0].hasViewer).toBe(false)
  })

  it('schema.json 없는 디렉토리는 건너뛴다', () => {
    mkdirSync(join(TEST_SCHEMA_DIR, 'no-schema'))
    expect(loadSchemas()).toHaveLength(0)
  })

  it('viewer.html 존재 시 hasViewer = true', () => {
    const schemaId = 'with-viewer'
    mkdirSync(join(TEST_SCHEMA_DIR, schemaId))
    writeFileSync(join(TEST_SCHEMA_DIR, schemaId, 'schema.json'), '{}')
    writeFileSync(join(TEST_SCHEMA_DIR, schemaId, 'config.json'), '{"name":"W"}')
    writeFileSync(join(TEST_SCHEMA_DIR, schemaId, 'viewer.html'), '<html></html>')
    const schemas = loadSchemas()
    expect(schemas[0].hasViewer).toBe(true)
    expect(schemas[0].viewerPath).toContain('viewer.html')
  })
})
```

vitest.config.ts에 Node 환경 테스트 파일 패턴 추가:

```typescript
// vitest.config.ts - test 섹션에 추가
environmentMatchGlobs: [
  ['tests/renderer/**', 'jsdom'],
  ['tests/main/**', 'node'],
],
```

- [ ] **Step 3: schemaRegistry.ts 구현**

```typescript
// src/main/schemaRegistry.ts
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { SchemaEntry } from '../renderer/types'

export const schemaDir = join(app.getPath('userData'), 'schemas')

export function loadSchemas(): SchemaEntry[] {
  if (!existsSync(schemaDir)) return []

  return readdirSync(schemaDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .flatMap(d => {
      const dir = join(schemaDir, d.name)
      const schemaPath = join(dir, 'schema.json')
      const configPath = join(dir, 'config.json')
      const viewerPath = join(dir, 'viewer.html')

      if (!existsSync(schemaPath)) return []

      try {
        const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
        const config = existsSync(configPath)
          ? JSON.parse(readFileSync(configPath, 'utf-8'))
          : {}
        const hasViewer = existsSync(viewerPath)

        return [{
          id: d.name,
          displayName: config.name ?? d.name,
          schema,
          hasViewer,
          viewerPath: hasViewer ? viewerPath : null,
        } satisfies SchemaEntry]
      } catch {
        return []
      }
    })
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
npx vitest run tests/renderer/schemaRegistry.test.ts
```

Expected: `3 passed`

- [ ] **Step 5: 커밋**

```bash
git add src/renderer/types.ts src/main/schemaRegistry.ts tests/renderer/schemaRegistry.test.ts
git commit -m "feat: add SchemaEntry type and schemaRegistry loader"
```

---

## Task 2: 스키마 IPC 핸들러

**Files:**
- Modify: `src/main/ipc.ts`

- [ ] **Step 1: ipc.ts에 스키마 핸들러 추가**

`src/main/ipc.ts`의 `registerIpcHandlers` 함수 안에 추가:

```typescript
import { loadSchemas } from './schemaRegistry'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { schemaDir } from './schemaRegistry'

// 기존 핸들러 아래에 추가:

ipcMain.handle('schema:list', () => loadSchemas())

ipcMain.handle('schema:save', (_event, id: string, schemaJson: string, configJson: string, viewerHtml: string | null) => {
  const dir = join(schemaDir, id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'schema.json'), schemaJson, 'utf-8')
  writeFileSync(join(dir, 'config.json'), configJson, 'utf-8')
  if (viewerHtml !== null) {
    writeFileSync(join(dir, 'viewer.html'), viewerHtml, 'utf-8')
  }
  return { ok: true }
})

ipcMain.handle('schema:delete', (_event, id: string) => {
  const dir = join(schemaDir, id)
  rmSync(dir, { recursive: true, force: true })
  return { ok: true }
})

ipcMain.handle('schema:readViewer', (_event, viewerPath: string) => {
  try {
    return { html: readFileSync(viewerPath, 'utf-8') }
  } catch {
    return { html: null, error: 'viewer.html 읽기 실패' }
  }
})
```

- [ ] **Step 2: preload/index.ts에 schemaApi 추가**

```typescript
// src/preload/index.ts 에 추가
contextBridge.exposeInMainWorld('schemaApi', {
  list: (): Promise<SchemaEntry[]> =>
    ipcRenderer.invoke('schema:list'),
  save: (id: string, schemaJson: string, configJson: string, viewerHtml: string | null) =>
    ipcRenderer.invoke('schema:save', id, schemaJson, configJson, viewerHtml),
  delete: (id: string) =>
    ipcRenderer.invoke('schema:delete', id),
  readViewer: (viewerPath: string): Promise<{ html: string | null; error?: string }> =>
    ipcRenderer.invoke('schema:readViewer', viewerPath),
})
```

- [ ] **Step 3: types.ts에 window.schemaApi 선언 추가**

```typescript
// src/renderer/types.ts의 Window 인터페이스에 추가
interface Window {
  fileApi: { ... }     // 기존 유지
  schemaApi: {
    list: () => Promise<SchemaEntry[]>
    save: (id: string, schemaJson: string, configJson: string, viewerHtml: string | null) => Promise<{ ok: boolean }>
    delete: (id: string) => Promise<{ ok: boolean }>
    readViewer: (viewerPath: string) => Promise<{ html: string | null; error?: string }>
  }
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/main/ipc.ts src/preload/index.ts src/renderer/types.ts
git commit -m "feat: add schema IPC handlers (list, save, delete, readViewer)"
```

---

## Task 3: Ajv 스키마 검증 유틸 (TDD)

**Files:**
- Create: `src/renderer/utils/schemaValidator.ts`
- Test: `tests/renderer/schemaValidator.test.ts`

- [ ] **Step 1: Ajv 설치**

```bash
npm install ajv
```

- [ ] **Step 2: 실패 테스트 작성**

```typescript
// tests/renderer/schemaValidator.test.ts
import { describe, it, expect } from 'vitest'
import { findMatchingSchema } from '@renderer/utils/schemaValidator'
import type { SchemaEntry } from '@renderer/types'

const makeSchema = (required: string[]): SchemaEntry => ({
  id: 'test',
  displayName: 'Test',
  schema: { type: 'object', required },
  hasViewer: false,
  viewerPath: null,
})

describe('findMatchingSchema', () => {
  it('매칭 스키마를 반환한다', () => {
    const schemas = [makeSchema(['level', 'msg', 'timestamp', 'event_type'])]
    const row = { level: 'info', msg: 'hi', timestamp: 't', event_type: 'login' }
    expect(findMatchingSchema(schemas, row)?.id).toBe('test')
  })

  it('매칭 없으면 null 반환', () => {
    const schemas = [makeSchema(['does_not_exist'])]
    const row = { level: 'info', msg: 'hi', timestamp: 't' }
    expect(findMatchingSchema(schemas, row)).toBeNull()
  })

  it('등록 순서상 첫 매칭을 반환한다', () => {
    const schemas = [
      { ...makeSchema(['level']), id: 'first' },
      { ...makeSchema(['level']), id: 'second' },
    ]
    expect(findMatchingSchema(schemas, { level: 'info' })?.id).toBe('first')
  })

  it('빈 스키마 목록이면 null', () => {
    expect(findMatchingSchema([], { level: 'info' })).toBeNull()
  })
})
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

```bash
npx vitest run tests/renderer/schemaValidator.test.ts
```

Expected: `FAIL`

- [ ] **Step 4: schemaValidator 구현**

```typescript
// src/renderer/utils/schemaValidator.ts
import Ajv from 'ajv'
import type { SchemaEntry, LogRow } from '../types'

const ajv = new Ajv({ strict: false })
const compiledCache = new Map<string, ReturnType<typeof ajv.compile>>()

function getValidator(entry: SchemaEntry) {
  if (!compiledCache.has(entry.id)) {
    compiledCache.set(entry.id, ajv.compile(entry.schema))
  }
  return compiledCache.get(entry.id)!
}

export function findMatchingSchema(
  schemas: SchemaEntry[],
  row: Record<string, unknown>
): SchemaEntry | null {
  for (const entry of schemas) {
    try {
      if (getValidator(entry)(row)) return entry
    } catch {
      // 잘못된 스키마는 건너뜀
    }
  }
  return null
}

export function clearValidatorCache(): void {
  compiledCache.clear()
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

```bash
npx vitest run tests/renderer/schemaValidator.test.ts
```

Expected: `4 passed`

- [ ] **Step 6: 커밋**

```bash
git add src/renderer/utils/schemaValidator.ts tests/renderer/schemaValidator.test.ts
git commit -m "feat: add Ajv-based lazy schema validator with compile cache"
```

---

## Task 4: SchemaViewer 컴포넌트 (iframe sandbox)

**Files:**
- Create: `src/renderer/components/SchemaViewer.tsx`

- [ ] **Step 1: SchemaViewer 작성**

```tsx
// src/renderer/components/SchemaViewer.tsx
import React, { useEffect, useRef, useState } from 'react'
import type { LogRow, SchemaEntry } from '../types'

interface SchemaViewerProps {
  row: LogRow
  schema: SchemaEntry
  onFallback: () => void
}

export function SchemaViewer({ row, schema, onFallback }: SchemaViewerProps): React.ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!schema.viewerPath) {
      onFallback()
      return
    }

    window.schemaApi.readViewer(schema.viewerPath).then(({ html, error: readError }) => {
      if (readError || !html) {
        onFallback()
        return
      }

      const iframe = iframeRef.current
      if (!iframe) return

      // iframe 로드 완료 후 데이터 주입
      const onLoad = () => {
        try {
          iframe.contentWindow?.postMessage(
            { type: 'LOG_DATA', payload: Object.fromEntries(
              Object.entries(row).filter(([k]) => !k.startsWith('_'))
            )},
            '*'
          )
        } catch {
          setError('데이터 주입 실패')
        }
      }

      iframe.addEventListener('load', onLoad, { once: true })
      iframe.srcdoc = html
    })
  }, [row, schema, onFallback])

  // 뷰어 → 앱 메시지 수신 (필터 요청 등 — Phase 3에서 확장)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return
      // Phase 3에서 처리
      console.debug('[SchemaViewer] message from viewer:', e.data)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (error) return (
    <div style={{ padding: 12, color: '#f87171', fontSize: 13 }}>
      {error} — <button onClick={onFallback} style={{ color: '#a5b4fc', background: 'none', border: 'none', cursor: 'pointer' }}>JSON 트리로 보기</button>
    </div>
  )

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts"
      style={{ width: '100%', height: '100%', border: 'none', background: '#0f0f1a' }}
      title={`${schema.displayName} viewer`}
    />
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/renderer/components/SchemaViewer.tsx
git commit -m "feat: add iframe-sandboxed SchemaViewer with postMessage injection"
```

---

## Task 5: DetailPanel에 SchemaViewer 통합

**Files:**
- Modify: `src/renderer/components/DetailPanel.tsx`

- [ ] **Step 1: DetailPanel 수정 — 스키마 lazy 검증 + SchemaViewer 통합**

```tsx
// src/renderer/components/DetailPanel.tsx
// 기존 props에 schemas 추가
import { findMatchingSchema } from '../utils/schemaValidator'
import { SchemaViewer } from './SchemaViewer'
import type { SchemaEntry } from '../types'

interface DetailPanelProps {
  row: LogRow | null
  schemas: SchemaEntry[]   // ← 추가
  onClose: () => void
}

export function DetailPanel({ row, schemas, onClose }: DetailPanelProps): React.ReactElement {
  const [useFallback, setUseFallback] = useState(false)

  // 행이 바뀌면 fallback 리셋
  useEffect(() => { setUseFallback(false) }, [row])

  if (!row) { /* 기존 빈 상태 렌더링 유지 */ }

  const displayData = Object.fromEntries(
    Object.entries(row).filter(([k]) => !k.startsWith('_'))
  )

  const matchedSchema = !useFallback && !row._parseError
    ? findMatchingSchema(schemas, displayData)
    : null

  const showViewer = matchedSchema?.hasViewer && !useFallback

  return (
    <div style={{ height: 200, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 헤더 — 기존과 동일하되 스키마명 표시 추가 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, opacity: 0.5, flex: 1 }}>
          줄 #{row._lineNumber}
          {matchedSchema && <span style={{ color: '#818cf8', marginLeft: 8 }}>● {matchedSchema.displayName}</span>}
          {row._parseError && <span style={{ color: '#f87171', marginLeft: 8 }}>⚠ {row._parseError}</span>}
        </span>
        {showViewer && (
          <button onClick={() => setUseFallback(true)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11, marginRight: 8 }}>
            JSON 트리로 보기
          </button>
        )}
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>✕</button>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {showViewer ? (
          <SchemaViewer row={row} schema={matchedSchema!} onFallback={() => setUseFallback(true)} />
        ) : row._parseError === 'Invalid JSON' ? (
          <pre style={{ padding: 12, margin: 0, color: '#f87171', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: 13, fontFamily: 'monospace' }}>{row._raw}</pre>
        ) : (
          <div style={{ padding: 12, fontSize: 13, fontFamily: 'monospace' }}>
            <JsonTree data={displayData} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: App.tsx에 schemas 전달**

`useSchemaRegistry` (Task 6)를 구현한 후 App.tsx의 `<DetailPanel>`에 `schemas={schemas}` 추가.

- [ ] **Step 3: 커밋**

```bash
git add src/renderer/components/DetailPanel.tsx
git commit -m "feat: integrate lazy schema matching and SchemaViewer into DetailPanel"
```

---

## Task 6: useSchemaRegistry 훅 + Sidebar

**Files:**
- Create: `src/renderer/hooks/useSchemaRegistry.ts`
- Create: `src/renderer/components/Sidebar.tsx`
- Create: `src/renderer/components/SchemaManagement.tsx`

- [ ] **Step 1: useSchemaRegistry 훅 작성**

```typescript
// src/renderer/hooks/useSchemaRegistry.ts
import { useState, useEffect, useCallback } from 'react'
import type { SchemaEntry } from '../types'
import { clearValidatorCache } from '../utils/schemaValidator'

export function useSchemaRegistry() {
  const [schemas, setSchemas] = useState<SchemaEntry[]>([])

  const reload = useCallback(async () => {
    const list = await window.schemaApi.list()
    clearValidatorCache()
    setSchemas(list)
  }, [])

  useEffect(() => { reload() }, [reload])

  const saveSchema = useCallback(async (
    id: string,
    schemaJson: string,
    displayName: string,
    viewerHtml: string | null
  ) => {
    const configJson = JSON.stringify({ name: displayName })
    await window.schemaApi.save(id, schemaJson, configJson, viewerHtml)
    await reload()
  }, [reload])

  const deleteSchema = useCallback(async (id: string) => {
    await window.schemaApi.delete(id)
    await reload()
  }, [reload])

  return { schemas, saveSchema, deleteSchema, reload }
}
```

- [ ] **Step 2: SchemaManagement UI 작성**

```tsx
// src/renderer/components/SchemaManagement.tsx
import React, { useState } from 'react'

interface SchemaManagementProps {
  onSave: (id: string, schemaJson: string, displayName: string, viewerHtml: string | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
  schemas: Array<{ id: string; displayName: string; hasViewer: boolean }>
}

export function SchemaManagement({ onSave, onDelete, onClose, schemas }: SchemaManagementProps): React.ReactElement {
  const [id, setId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [schemaJson, setSchemaJson] = useState('{\n  "type": "object",\n  "required": ["timestamp", "level", "msg"]\n}')
  const [viewerHtml, setViewerHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    try {
      JSON.parse(schemaJson)  // 유효성 확인
    } catch {
      setError('JSON Schema가 유효하지 않습니다')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(id, schemaJson, displayName || id, viewerHtml || null)
      setId(''); setDisplayName(''); setSchemaJson('{}'); setViewerHtml('')
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4, color: '#e2e8f0', fontSize: 12, padding: '4px 8px', fontFamily: 'monospace',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 560, maxHeight: '80vh', overflow: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15 }}>스키마 관리</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* 등록된 스키마 목록 */}
        {schemas.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>등록된 스키마</div>
            {schemas.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{s.displayName}</span>
                <span style={{ fontSize: 11, opacity: 0.4 }}>{s.id}</span>
                {s.hasViewer && <span style={{ fontSize: 11, color: '#818cf8' }}>HTML 뷰어</span>}
                <button onClick={() => onDelete(s.id)} style={{ background: 'none', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 3, color: '#f87171', cursor: 'pointer', fontSize: 11, padding: '1px 6px' }}>삭제</button>
              </div>
            ))}
          </div>
        )}

        {/* 새 스키마 등록 폼 */}
        <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>새 스키마 등록</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input placeholder="ID (영문, 하이픈)" value={id} onChange={e => setId(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <input placeholder="표시 이름" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <textarea rows={6} placeholder="JSON Schema" value={schemaJson} onChange={e => setSchemaJson(e.target.value)} style={{ ...inputStyle, display: 'block', marginBottom: 8, resize: 'vertical' }} />
        <textarea rows={4} placeholder="viewer.html (선택사항)" value={viewerHtml} onChange={e => setViewerHtml(e.target.value)} style={{ ...inputStyle, display: 'block', marginBottom: 8, resize: 'vertical' }} />
        {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button onClick={handleSave} disabled={saving || !id} style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 4, color: '#a5b4fc', cursor: 'pointer', fontSize: 13, padding: '5px 16px' }}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Sidebar 컴포넌트 작성**

```tsx
// src/renderer/components/Sidebar.tsx
import React from 'react'
import type { SchemaEntry } from '../types'

interface SidebarProps {
  schemas: SchemaEntry[]
  onOpenSchemaManagement: () => void
}

export function Sidebar({ schemas, onOpenSchemaManagement }: SidebarProps): React.ReactElement {
  return (
    <div style={{ width: 180, borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ padding: '10px 12px', fontSize: 11, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>스키마</div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {schemas.length === 0 ? (
          <div style={{ padding: '4px 12px', fontSize: 12, opacity: 0.3 }}>등록된 스키마 없음</div>
        ) : schemas.map(s => (
          <div key={s.id} style={{ padding: '4px 12px', fontSize: 12 }}>
            <div style={{ opacity: 0.8 }}>{s.displayName}</div>
            {s.hasViewer && <div style={{ fontSize: 10, color: '#818cf8', opacity: 0.7 }}>HTML 뷰어</div>}
          </div>
        ))}
      </div>
      <button
        onClick={onOpenSchemaManagement}
        style={{ margin: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: '5px 0' }}
      >
        + 스키마 관리
      </button>
    </div>
  )
}
```

- [ ] **Step 4: App.tsx에 Sidebar + SchemaManagement 통합**

```tsx
// src/renderer/App.tsx 수정
import { useSchemaRegistry } from './hooks/useSchemaRegistry'
import { Sidebar } from './components/Sidebar'
import { SchemaManagement } from './components/SchemaManagement'

// App 컴포넌트 안에 추가:
const { schemas, saveSchema, deleteSchema } = useSchemaRegistry()
const [showSchemaManagement, setShowSchemaManagement] = useState(false)

// 레이아웃에서 Sidebar 추가 (툴바 아래, 필터 바와 리스트를 감싸는 flex row):
<div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
  <Sidebar schemas={schemas} onOpenSchemaManagement={() => setShowSchemaManagement(true)} />
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <FilterBar ... />
    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <LogList ... />
    </div>
  </div>
</div>

// DetailPanel에 schemas 전달:
<DetailPanel row={selectedRow} schemas={schemas} onClose={...} />

// SchemaManagement 모달:
{showSchemaManagement && (
  <SchemaManagement
    schemas={schemas}
    onSave={saveSchema}
    onDelete={deleteSchema}
    onClose={() => setShowSchemaManagement(false)}
  />
)}
```

- [ ] **Step 5: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: 모든 테스트 통과

- [ ] **Step 6: 커밋**

```bash
git add src/renderer/hooks/useSchemaRegistry.ts src/renderer/components/Sidebar.tsx src/renderer/components/SchemaManagement.tsx src/renderer/App.tsx
git commit -m "feat: add schema registry hook, sidebar, and schema management UI"
```

---

## Task 7: 스모크 테스트

- [ ] **Step 1: 테스트 스키마 + viewer.html 생성**

앱에서 스키마 관리 → 새 스키마 등록:
- ID: `game-event`
- 표시 이름: `게임 이벤트`
- JSON Schema:
  ```json
  { "type": "object", "required": ["timestamp", "level", "msg", "event_type"] }
  ```
- viewer.html:
  ```html
  <style>body{background:#0f0f1a;color:#e2e8f0;font-family:monospace;padding:12px}</style>
  <div id="root">로딩 중...</div>
  <script>
  window.addEventListener('message', e => {
    if (e.data.type !== 'LOG_DATA') return
    const d = e.data.payload
    document.getElementById('root').innerHTML =
      '<b style="color:#818cf8">' + d.event_type + '</b><br>' +
      'msg: ' + d.msg + '<br>' +
      'level: <span style="color:' + (d.level==='error'?'#f87171':'#4ade80') + '">' + d.level + '</span>'
  })
  </script>
  ```

- [ ] **Step 2: 확인 체크리스트**

  - [ ] 스키마 저장 후 Sidebar에 "게임 이벤트" 표시됨
  - [ ] `event_type` 필드 없는 행 클릭 → JSON 트리 표시 (스키마 미매칭)
  - [ ] `event_type` 필드 있는 행 클릭 → iframe에 커스텀 뷰어 표시
  - [ ] "JSON 트리로 보기" 버튼 클릭 → 폴백 동작
  - [ ] 스키마 삭제 후 해당 행 클릭 → JSON 트리로 폴백

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "feat: Phase 2 complete — schema plugin system with iframe viewer"
```

---

## Phase 2 완료 기준

- 스키마를 앱 UI에서 등록/삭제할 수 있다
- 행 클릭 시 매칭 스키마의 HTML 뷰어가 iframe에 표시된다
- 매칭 스키마 없음/뷰어 오류 시 JSON 트리로 폴백된다
- 여러 스키마가 혼재하는 JSONL 파일에서 행마다 다른 뷰어가 적용된다
