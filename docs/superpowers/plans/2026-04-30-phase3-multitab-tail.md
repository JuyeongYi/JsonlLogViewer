# JsonlLogViewer Phase 3 — 멀티파일 탭 + 실시간 Tail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠ 실행 전 필수 확인:** Phase 2 구현 완료 후 이 플랜을 검토하라. 실제 IPC 채널명, 컴포넌트 Props, 상태 구조가 Phase 1~2 구현과 일치하는지 확인하고 수정할 것.

**Goal:** 여러 JSONL 파일을 탭으로 동시에 열고, 각 탭이 독립 상태를 가지며, 파일 변경 시 실시간으로 새 줄을 추가한다.

**Architecture:** Electron main의 chokidar가 열린 파일들을 감시. 새 줄 감지 시 `file:append` IPC로 renderer에 전송. Renderer는 탭 ID별로 독립된 LogFileState를 관리.

**Tech Stack:** chokidar, Phase 1~2와 동일

---

## File Map

```
src/
├── main/
│   ├── ipc.ts              # Modify: file:watch, file:unwatch, file:append 추가
│   └── fileWatcher.ts      # Create: chokidar 감시 관리자
├── preload/
│   └── index.ts            # Modify: fileApi에 watch/unwatch/onAppend 추가
├── renderer/
│   ├── types.ts            # Modify: Tab 타입 추가
│   ├── components/
│   │   └── TabBar.tsx      # Create: 탭 바 컴포넌트
│   ├── hooks/
│   │   ├── useTabManager.ts    # Create: 탭 목록 + 활성 탭 관리
│   │   └── useLogFile.ts       # Modify: tail append 지원
│   └── App.tsx             # Modify: TabBar 통합, 탭별 상태 분리
tests/
└── renderer/
    └── useTabManager.test.ts   # Create
```

---

## Task 1: fileWatcher + IPC (chokidar)

**Files:**
- Create: `src/main/fileWatcher.ts`
- Modify: `src/main/ipc.ts`

- [ ] **Step 1: chokidar 설치**

```bash
npm install chokidar
```

- [ ] **Step 2: fileWatcher.ts 작성**

```typescript
// src/main/fileWatcher.ts
import chokidar, { FSWatcher } from 'chokidar'
import { readFileSync, statSync } from 'fs'
import { WebContents } from 'electron'

interface WatchEntry {
  watcher: FSWatcher
  lastSize: number
}

const watchers = new Map<string, WatchEntry>()

export function watchFile(filePath: string, sender: WebContents): void {
  if (watchers.has(filePath)) return

  let lastSize = (() => {
    try { return statSync(filePath).size } catch { return 0 }
  })()

  const watcher = chokidar.watch(filePath, { persistent: true, usePolling: false })

  watcher.on('change', () => {
    try {
      const newSize = statSync(filePath).size
      if (newSize <= lastSize) return  // truncate 무시

      const content = readFileSync(filePath, 'utf-8')
      const newContent = content.slice(lastSize)
      lastSize = newSize

      if (newContent.trim()) {
        sender.send('file:append', filePath, newContent)
      }
    } catch {
      // 파일 접근 오류 무시
    }
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
  for (const [path] of watchers) unwatchFile(path)
}
```

- [ ] **Step 3: ipc.ts에 watch 핸들러 추가**

```typescript
// src/main/ipc.ts — 기존 핸들러 아래에 추가
import { watchFile, unwatchFile } from './fileWatcher'
import { BrowserWindow } from 'electron'

ipcMain.handle('file:watch', (_event, filePath: string) => {
  const win = BrowserWindow.fromWebContents(_event.sender)
  if (win) watchFile(filePath, _event.sender)
  return { ok: true }
})

ipcMain.handle('file:unwatch', (_event, filePath: string) => {
  unwatchFile(filePath)
  return { ok: true }
})
```

- [ ] **Step 4: app 종료 시 감시 해제**

`src/main/index.ts`의 `app.on('before-quit')` 또는 `app.on('window-all-closed')` 핸들러에 추가:

```typescript
import { unwatchAll } from './fileWatcher'
app.on('before-quit', () => unwatchAll())
```

- [ ] **Step 5: preload/index.ts에 watch API 추가**

```typescript
// src/preload/index.ts 의 fileApi에 추가:
watch: (path: string) => ipcRenderer.invoke('file:watch', path),
unwatch: (path: string) => ipcRenderer.invoke('file:unwatch', path),
onAppend: (callback: (path: string, newContent: string) => void) => {
  const handler = (_event: Electron.IpcRendererEvent, path: string, content: string) =>
    callback(path, content)
  ipcRenderer.on('file:append', handler)
  return () => ipcRenderer.removeListener('file:append', handler)
},
```

- [ ] **Step 6: types.ts Window 인터페이스 업데이트**

```typescript
// window.fileApi 에 추가:
watch: (path: string) => Promise<{ ok: boolean }>
unwatch: (path: string) => Promise<{ ok: boolean }>
onAppend: (callback: (path: string, newContent: string) => void) => () => void
```

- [ ] **Step 7: 커밋**

```bash
git add src/main/fileWatcher.ts src/main/ipc.ts src/main/index.ts src/preload/index.ts src/renderer/types.ts
git commit -m "feat: add chokidar file watcher with IPC append notification"
```

---

## Task 2: Tab 타입 + useTabManager (TDD)

**Files:**
- Modify: `src/renderer/types.ts`
- Create: `src/renderer/hooks/useTabManager.ts`
- Test: `tests/renderer/useTabManager.test.ts`

- [ ] **Step 1: Tab 타입 추가**

```typescript
// src/renderer/types.ts 에 추가
export interface Tab {
  id: string        // crypto.randomUUID()
  path: string
  label: string     // 파일명 (경로 마지막 세그먼트)
}
```

- [ ] **Step 2: 실패 테스트 작성**

```typescript
// tests/renderer/useTabManager.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTabManager } from '@renderer/hooks/useTabManager'

describe('useTabManager', () => {
  it('초기 탭 목록이 비어 있다', () => {
    const { result } = renderHook(() => useTabManager())
    expect(result.current.tabs).toHaveLength(0)
    expect(result.current.activeTabId).toBeNull()
  })

  it('openTab은 탭을 추가하고 활성화한다', () => {
    const { result } = renderHook(() => useTabManager())
    act(() => result.current.openTab('/logs/server.jsonl'))
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].label).toBe('server.jsonl')
    expect(result.current.activeTabId).toBe(result.current.tabs[0].id)
  })

  it('같은 경로를 다시 열면 기존 탭을 활성화한다', () => {
    const { result } = renderHook(() => useTabManager())
    act(() => result.current.openTab('/logs/server.jsonl'))
    act(() => result.current.openTab('/logs/server.jsonl'))
    expect(result.current.tabs).toHaveLength(1)
  })

  it('closeTab은 탭을 제거하고 인접 탭을 활성화한다', () => {
    const { result } = renderHook(() => useTabManager())
    act(() => result.current.openTab('/logs/a.jsonl'))
    act(() => result.current.openTab('/logs/b.jsonl'))
    const firstId = result.current.tabs[0].id
    const secondId = result.current.tabs[1].id
    act(() => result.current.closeTab(firstId))
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.activeTabId).toBe(secondId)
  })
})
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

```bash
npx vitest run tests/renderer/useTabManager.test.ts
```

Expected: `FAIL`

- [ ] **Step 4: useTabManager 구현**

```typescript
// src/renderer/hooks/useTabManager.ts
import { useState, useCallback } from 'react'
import type { Tab } from '../types'

export function useTabManager() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  const openTab = useCallback((path: string) => {
    setTabs(prev => {
      const existing = prev.find(t => t.path === path)
      if (existing) {
        setActiveTabId(existing.id)
        return prev
      }
      const newTab: Tab = {
        id: crypto.randomUUID(),
        path,
        label: path.split(/[\\/]/).pop() ?? path,
      }
      setActiveTabId(newTab.id)
      return [...prev, newTab]
    })
  }, [])

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id)
      const next = prev.filter(t => t.id !== id)
      setActiveTabId(current => {
        if (current !== id) return current
        return next[Math.min(idx, next.length - 1)]?.id ?? null
      })
      return next
    })
  }, [])

  return { tabs, activeTabId, setActiveTabId, openTab, closeTab }
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

```bash
npx vitest run tests/renderer/useTabManager.test.ts
```

Expected: `4 passed`

- [ ] **Step 6: 커밋**

```bash
git add src/renderer/types.ts src/renderer/hooks/useTabManager.ts tests/renderer/useTabManager.test.ts
git commit -m "feat: add Tab type and useTabManager hook"
```

---

## Task 3: useLogFile에 tail append 지원

**Files:**
- Modify: `src/renderer/hooks/useLogFile.ts`

- [ ] **Step 1: appendRows 함수 추가**

`useLogFile.ts`의 상태에 `appendRows` 함수를 추가하고, 파일 로드 후 watch를 시작:

```typescript
// useLogFile.ts — openFile 성공 후 watch 시작 추가
await window.fileApi.watch(path)

// appendRows 함수 추가
const appendRows = useCallback((newContent: string) => {
  const newRows = parseJsonlContent(newContent)
  if (newRows.length === 0) return
  setState(s => {
    const combined = [...s.rows, ...newRows]
    return {
      ...s,
      rows: combined,
      filteredRows: applyFilter(combined, s.filter),
    }
  })
}, [])

return { ...state, openFile, setFilter, appendRows }
```

- [ ] **Step 2: App.tsx에서 file:append 이벤트 구독**

```typescript
// App.tsx 안에 useEffect로 추가
// 탭별 useLogFile 인스턴스를 Map으로 관리하는 구조로 리팩터링 필요
// (아래 Task 4에서 상세 구현)
```

- [ ] **Step 3: 커밋**

```bash
git add src/renderer/hooks/useLogFile.ts
git commit -m "feat: add appendRows to useLogFile for real-time tail support"
```

---

## Task 4: TabBar 컴포넌트 + App 리팩터링

**Files:**
- Create: `src/renderer/components/TabBar.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: TabBar 컴포넌트 작성**

```tsx
// src/renderer/components/TabBar.tsx
import React from 'react'
import type { Tab } from '../types'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onOpen: () => void
}

export function TabBar({ tabs, activeTabId, onSelect, onClose, onOpen }: TabBarProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: '#13132a', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, overflowX: 'auto' }}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            background: tab.id === activeTabId ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: tab.id === activeTabId ? '#a5b4fc' : '#94a3b8',
            fontSize: 12,
          }}
        >
          <span>{tab.label}</span>
          <button
            onClick={e => { e.stopPropagation(); onClose(tab.id) }}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.5, fontSize: 12, padding: '0 2px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={onOpen}
        style={{ padding: '6px 12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
      >
        + 파일 열기
      </button>
    </div>
  )
}
```

- [ ] **Step 2: App.tsx를 탭 기반으로 리팩터링**

각 탭이 독립적인 LogFileState를 가져야 하므로 `useLogFile`을 탭별로 인스턴스화하거나, App 레벨에서 탭 ID별 상태 Map을 관리:

```tsx
// App.tsx — 탭별 상태를 Map으로 관리하는 접근
const [tabStates, setTabStates] = useState<Map<string, LogFileState>>(new Map())

// 활성 탭 상태
const activeState = activeTabId ? tabStates.get(activeTabId) : undefined

// 파일 열기 → openTab(path) → 해당 탭 ID로 fileApi.readFile → tabStates 업데이트
const handleOpenFile = async () => {
  const path = await window.fileApi.openFile()
  if (!path) return
  openTab(path)
  // tabStates에 로딩 상태 추가 후 파일 읽기...
}

// file:append 이벤트 → 해당 path의 탭 상태 업데이트
useEffect(() => {
  const unsubscribe = window.fileApi.onAppend((path, newContent) => {
    const tab = tabs.find(t => t.path === path)
    if (!tab) return
    const newRows = parseJsonlContent(newContent)
    setTabStates(prev => {
      const state = prev.get(tab.id)
      if (!state) return prev
      const combined = [...state.rows, ...newRows]
      return new Map(prev).set(tab.id, {
        ...state,
        rows: combined,
        filteredRows: applyFilter(combined, state.filter),
      })
    })
  })
  return unsubscribe
}, [tabs])
```

- [ ] **Step 3: 탭 닫기 시 watch 해제**

```typescript
const handleCloseTab = async (id: string) => {
  const tab = tabs.find(t => t.id === id)
  if (tab) await window.fileApi.unwatch(tab.path)
  closeTab(id)
  setTabStates(prev => { const next = new Map(prev); next.delete(id); return next })
}
```

- [ ] **Step 4: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add src/renderer/components/TabBar.tsx src/renderer/App.tsx
git commit -m "feat: add TabBar and refactor App to per-tab state management"
```

---

## Task 5: 스모크 테스트

- [ ] **Step 1: 앱 기동**

```bash
npm run dev
```

- [ ] **Step 2: 확인 체크리스트**

  - [ ] "+ 파일 열기" 클릭 → 파일 다이얼로그 → 탭 생성
  - [ ] 두 번째 파일 열기 → 두 번째 탭 생성, 독립 상태 유지
  - [ ] 탭 전환 시 각 탭의 필터/선택 상태가 독립적임
  - [ ] 탭 ✕ 클릭 → 탭 닫힘, 인접 탭 활성화
  - [ ] 열린 파일에 새 줄 추가 시 자동으로 리스트에 추가됨 (tail)
  - [ ] 같은 파일을 두 번 열면 기존 탭이 활성화됨

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "feat: Phase 3 complete — multi-tab and real-time tail"
```

---

## Phase 3 완료 기준

- 여러 JSONL 파일을 탭으로 동시에 열 수 있다
- 각 탭의 필터·선택 상태가 완전히 독립적이다
- 파일에 새 줄이 추가되면 열린 탭의 리스트에 실시간으로 반영된다
