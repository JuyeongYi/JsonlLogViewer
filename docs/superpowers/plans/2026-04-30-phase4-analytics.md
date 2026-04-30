# JsonlLogViewer Phase 4 — 분석 기능

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠ 실행 전 필수 확인:** Phase 3 구현 완료 후 이 플랜을 검토하라. 실제 컴포넌트 구조, 탭 상태 타입, App 레이아웃이 Phase 1~3 구현과 일치하는지 확인하고 수정할 것.

**Goal:** 통계/집계 대시보드, Diff 뷰, 타임라인, 커스텀 컬럼, 내보내기, 키보드 단축키, 세션 복원으로 풀 기능 뷰어 완성.

**Architecture:** 모든 분석 기능은 renderer-only 로직. 기존 `filteredRows`를 입력으로 파생 뷰를 렌더링. 세션 복원은 `localStorage` 사용. 내보내기는 Blob/File API.

**Tech Stack:** diff2html, Phase 1~3와 동일

---

## File Map

```
src/renderer/
├── types.ts                      # Modify: ColumnDef 타입 추가
├── components/
│   ├── ViewSwitcher.tsx          # Create: 리스트/통계/타임라인/Diff 탭 전환 버튼
│   ├── StatsView.tsx             # Create: 집계 대시보드
│   ├── TimelineView.tsx          # Create: 시간대별 로그 분포 차트 (SVG)
│   ├── DiffView.tsx              # Create: 두 탭 나란히 비교
│   ├── LogList.tsx               # Modify: 커스텀 컬럼 지원
│   └── LogRow.tsx                # Modify: 커스텀 컬럼 렌더링
├── hooks/
│   ├── useStats.ts               # Create: filteredRows → 집계 계산
│   ├── useKeyboardShortcuts.ts   # Create: 키보드 단축키 관리
│   └── useSessionRestore.ts      # Create: localStorage 세션 저장/복원
├── utils/
│   └── exporter.ts               # Create: CSV/JSON 내보내기
└── App.tsx                       # Modify: 모든 뷰 통합
tests/renderer/
├── useStats.test.ts
├── exporter.test.ts
└── useSessionRestore.test.ts
```

---

## Task 1: 통계/집계 뷰 (TDD)

**Files:**
- Create: `src/renderer/hooks/useStats.ts`
- Create: `src/renderer/components/StatsView.tsx`
- Test: `tests/renderer/useStats.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// tests/renderer/useStats.test.ts
import { describe, it, expect } from 'vitest'
import { computeStats } from '@renderer/hooks/useStats'
import type { LogRow } from '@renderer/types'

const makeRow = (level: string, ts: string, extra = {}): LogRow => ({
  _lineNumber: 1, _raw: '', timestamp: ts, level, msg: 'test', ...extra
})

describe('computeStats', () => {
  it('레벨별 카운트를 집계한다', () => {
    const rows = [makeRow('error', 't'), makeRow('error', 't'), makeRow('info', 't')]
    const stats = computeStats(rows)
    expect(stats.levelCounts.error).toBe(2)
    expect(stats.levelCounts.info).toBe(1)
  })

  it('에러율을 계산한다 (error + warn / 전체)', () => {
    const rows = [makeRow('error', 't'), makeRow('warn', 't'), makeRow('info', 't'), makeRow('info', 't')]
    const stats = computeStats(rows)
    expect(stats.errorRate).toBe(0.5)
  })

  it('특정 필드의 값 분포를 집계한다', () => {
    const rows = [
      makeRow('info', 't', { host: 'a' }),
      makeRow('info', 't', { host: 'a' }),
      makeRow('info', 't', { host: 'b' }),
    ]
    const stats = computeStats(rows, 'host')
    expect(stats.fieldDistribution?.['a']).toBe(2)
    expect(stats.fieldDistribution?.['b']).toBe(1)
  })

  it('빈 배열이면 에러율 0', () => {
    expect(computeStats([]).errorRate).toBe(0)
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npx vitest run tests/renderer/useStats.test.ts
```

Expected: `FAIL`

- [ ] **Step 3: computeStats 구현**

```typescript
// src/renderer/hooks/useStats.ts
import type { LogRow } from '../types'

export interface LogStats {
  total: number
  levelCounts: Record<string, number>
  errorRate: number
  fieldDistribution: Record<string, number> | null
}

export function computeStats(rows: LogRow[], distributionField?: string): LogStats {
  const levelCounts: Record<string, number> = {}
  const fieldDistribution: Record<string, number> = {}

  for (const row of rows) {
    const level = String(row.level ?? 'unknown').toLowerCase()
    levelCounts[level] = (levelCounts[level] ?? 0) + 1

    if (distributionField) {
      const val = String(row[distributionField] ?? '(없음)')
      fieldDistribution[val] = (fieldDistribution[val] ?? 0) + 1
    }
  }

  const errorCount = (levelCounts['error'] ?? 0) + (levelCounts['warn'] ?? 0) + (levelCounts['warning'] ?? 0)
  const errorRate = rows.length > 0 ? errorCount / rows.length : 0

  return {
    total: rows.length,
    levelCounts,
    errorRate,
    fieldDistribution: distributionField ? fieldDistribution : null,
  }
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
npx vitest run tests/renderer/useStats.test.ts
```

Expected: `4 passed`

- [ ] **Step 5: StatsView 컴포넌트 작성**

```tsx
// src/renderer/components/StatsView.tsx
import React, { useState } from 'react'
import type { LogRow } from '../types'
import { computeStats } from '../hooks/useStats'

const LEVEL_COLORS: Record<string, string> = {
  error: '#f87171', warn: '#fbbf24', warning: '#fbbf24',
  info: '#4ade80', debug: '#94a3b8',
}

interface StatsViewProps {
  rows: LogRow[]
}

export function StatsView({ rows }: StatsViewProps): React.ReactElement {
  const [distributionField, setDistributionField] = useState('')
  const stats = computeStats(rows, distributionField || undefined)

  // 모든 필드 키 추출 (내부 _ 필드 제외)
  const allFields = [...new Set(
    rows.flatMap(r => Object.keys(r).filter(k => !k.startsWith('_')))
  )].sort()

  return (
    <div style={{ padding: 20, overflow: 'auto', height: '100%' }}>
      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="전체 줄" value={stats.total.toLocaleString()} />
        <StatCard label="에러율" value={`${(stats.errorRate * 100).toFixed(1)}%`} color={stats.errorRate > 0.1 ? '#f87171' : '#4ade80'} />
      </div>

      {/* 레벨별 분포 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>레벨별 분포</div>
        {Object.entries(stats.levelCounts).sort(([, a], [, b]) => b - a).map(([level, count]) => (
          <LevelBar key={level} level={level} count={count} total={stats.total} color={LEVEL_COLORS[level] ?? '#e2e8f0'} />
        ))}
      </div>

      {/* 필드 분포 */}
      <div>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>필드 분포</div>
        <select
          value={distributionField}
          onChange={e => setDistributionField(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#e2e8f0', fontSize: 12, padding: '3px 8px', marginBottom: 12 }}
        >
          <option value="">필드 선택...</option>
          {allFields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {stats.fieldDistribution && Object.entries(stats.fieldDistribution)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .map(([val, count]) => (
            <LevelBar key={val} level={val} count={count} total={stats.total} color="#818cf8" />
          ))
        }
      </div>
    </div>
  )
}

function StatCard({ label, value, color = '#e2e8f0' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '12px 16px', minWidth: 100 }}>
      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function LevelBar({ level, count, total, color }: { level: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
        <span style={{ color }}>{level}</span>
        <span style={{ opacity: 0.6 }}>{count.toLocaleString()} ({pct.toFixed(1)}%)</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 2, height: 6 }}>
        <div style={{ background: color, borderRadius: 2, height: 6, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/renderer/hooks/useStats.ts src/renderer/components/StatsView.tsx tests/renderer/useStats.test.ts
git commit -m "feat: add stats aggregation and StatsView dashboard"
```

---

## Task 2: 타임라인 뷰 (SVG)

**Files:**
- Create: `src/renderer/components/TimelineView.tsx`

- [ ] **Step 1: TimelineView 작성**

```tsx
// src/renderer/components/TimelineView.tsx
import React, { useMemo } from 'react'
import type { LogRow } from '../types'

const LEVEL_COLORS: Record<string, string> = {
  error: '#f87171', warn: '#fbbf24', info: '#4ade80', debug: '#94a3b8',
}
const BUCKET_COUNT = 60

interface TimelineViewProps {
  rows: LogRow[]
}

export function TimelineView({ rows }: TimelineViewProps): React.ReactElement {
  const { buckets, minTs, maxTs } = useMemo(() => {
    const parsed = rows
      .map(r => ({ ts: new Date(r.timestamp as string).getTime(), level: String(r.level ?? 'info').toLowerCase() }))
      .filter(r => !isNaN(r.ts))
      .sort((a, b) => a.ts - b.ts)

    if (parsed.length === 0) return { buckets: [], minTs: 0, maxTs: 0 }

    const minTs = parsed[0].ts
    const maxTs = parsed[parsed.length - 1].ts
    const range = maxTs - minTs || 1

    const buckets: Array<Record<string, number>> = Array.from({ length: BUCKET_COUNT }, () => ({}))

    for (const { ts, level } of parsed) {
      const idx = Math.min(Math.floor(((ts - minTs) / range) * BUCKET_COUNT), BUCKET_COUNT - 1)
      buckets[idx][level] = (buckets[idx][level] ?? 0) + 1
    }

    return { buckets, minTs, maxTs }
  }, [rows])

  if (buckets.length === 0) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, fontSize: 14 }}>timestamp 필드가 있는 줄이 없습니다</div>
  }

  const maxCount = Math.max(...buckets.map(b => Object.values(b).reduce((a, c) => a + c, 0)), 1)
  const levels = ['error', 'warn', 'info', 'debug']
  const H = 120, W_BUCKET = 8, GAP = 1
  const totalW = BUCKET_COUNT * (W_BUCKET + GAP)

  return (
    <div style={{ padding: 20, overflow: 'auto' }}>
      <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8 }}>
        {new Date(minTs).toLocaleString()} — {new Date(maxTs).toLocaleString()}
        <span style={{ marginLeft: 16, opacity: 0.7 }}>{rows.length.toLocaleString()}줄 / {BUCKET_COUNT}구간</span>
      </div>
      <svg width={totalW} height={H} style={{ display: 'block' }}>
        {buckets.map((bucket, i) => {
          let yOffset = H
          return (
            <g key={i}>
              {levels.map(level => {
                const count = bucket[level] ?? 0
                if (!count) return null
                const h = (count / maxCount) * H
                yOffset -= h
                return <rect key={level} x={i * (W_BUCKET + GAP)} y={yOffset} width={W_BUCKET} height={h} fill={LEVEL_COLORS[level] ?? '#818cf8'} opacity={0.8} />
              })}
            </g>
          )
        })}
      </svg>
      {/* 범례 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {levels.map(l => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: LEVEL_COLORS[l] }} />
            <span style={{ opacity: 0.7 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/renderer/components/TimelineView.tsx
git commit -m "feat: add SVG timeline view with per-level bucket histogram"
```

---

## Task 3: Diff 뷰

**Files:**
- Create: `src/renderer/components/DiffView.tsx`

- [ ] **Step 1: diff2html 설치**

```bash
npm install diff2html diff
npm install --save-dev @types/diff
```

- [ ] **Step 2: DiffView 작성**

```tsx
// src/renderer/components/DiffView.tsx
import React, { useMemo, useState } from 'react'
import { createTwoFilesPatch } from 'diff'
import { html as diff2html } from 'diff2html'
import 'diff2html/bundles/css/diff2html.min.css'
import type { LogRow } from '../types'

interface DiffViewProps {
  leftRows: LogRow[]
  leftLabel: string
  rightRows: LogRow[]
  rightLabel: string
}

export function DiffView({ leftRows, leftLabel, rightRows, rightLabel }: DiffViewProps): React.ReactElement {
  const [maxLines, setMaxLines] = useState(200)

  const diffHtml = useMemo(() => {
    const left = leftRows.slice(0, maxLines).map(r => r._raw).join('\n')
    const right = rightRows.slice(0, maxLines).map(r => r._raw).join('\n')
    const patch = createTwoFilesPatch(leftLabel, rightLabel, left, right)
    return diff2html(patch, { drawFileList: false, matching: 'lines', outputFormat: 'side-by-side' })
  }, [leftRows, rightRows, leftLabel, rightLabel, maxLines])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, fontSize: 12 }}>
        <span style={{ opacity: 0.6 }}>비교 최대</span>
        <select value={maxLines} onChange={e => setMaxLines(Number(e.target.value))}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, color: '#e2e8f0', fontSize: 12, padding: '2px 6px' }}>
          {[100, 200, 500, 1000].map(n => <option key={n} value={n}>{n}줄</option>)}
        </select>
        <span style={{ opacity: 0.4 }}>| 좌: {leftLabel} ({leftRows.length}줄) · 우: {rightLabel} ({rightRows.length}줄)</span>
      </div>
      <div
        style={{ flex: 1, overflow: 'auto', fontSize: 12 }}
        dangerouslySetInnerHTML={{ __html: diffHtml }}
      />
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/renderer/components/DiffView.tsx
git commit -m "feat: add side-by-side DiffView using diff2html"
```

---

## Task 4: 커스텀 컬럼

**Files:**
- Modify: `src/renderer/types.ts`
- Modify: `src/renderer/components/LogList.tsx`
- Modify: `src/renderer/components/LogRow.tsx`

- [ ] **Step 1: ColumnDef 타입 추가**

```typescript
// src/renderer/types.ts 에 추가
export interface ColumnDef {
  field: string      // LogRow의 키
  label: string      // 컬럼 헤더
  width: number      // px
}

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { field: 'timestamp', label: 'Timestamp', width: 90 },
  { field: 'level',     label: 'Level',     width: 60 },
  { field: 'msg',       label: 'Message',   width: -1 },  // -1 = flex: 1
]
```

- [ ] **Step 2: LogRow에 columns prop 추가**

```tsx
// src/renderer/components/LogRow.tsx 수정
interface LogRowProps {
  row: LogRowType
  isSelected: boolean
  columns: ColumnDef[]   // ← 추가
  onClick: () => void
}

// gridTemplateColumns를 columns로부터 동적 생성
const gridCols = columns.map(c => c.width === -1 ? '1fr' : `${c.width}px`).join(' ')
```

- [ ] **Step 3: LogList에 columns prop 전파**

```tsx
// LogList.tsx — props에 columns 추가하고 LogRow에 전달
```

- [ ] **Step 4: App.tsx에 컬럼 편집 UI 추가**

스키마에 `config.json`의 `columns` 배열이 있으면 자동 적용, 없으면 기본 컬럼 사용. 사용자가 직접 편집하는 UI는 Phase 4 완료 기준에서 제외 (config.json으로 설정).

- [ ] **Step 5: 커밋**

```bash
git add src/renderer/types.ts src/renderer/components/LogRow.tsx src/renderer/components/LogList.tsx src/renderer/App.tsx
git commit -m "feat: add custom column support via ColumnDef"
```

---

## Task 5: 내보내기 (TDD)

**Files:**
- Create: `src/renderer/utils/exporter.ts`
- Test: `tests/renderer/exporter.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// tests/renderer/exporter.test.ts
import { describe, it, expect } from 'vitest'
import { rowsToCsv, rowsToJsonl } from '@renderer/utils/exporter'
import type { LogRow } from '@renderer/types'

const rows: LogRow[] = [
  { _lineNumber: 1, _raw: '', timestamp: 't1', level: 'info', msg: 'hello', extra: 1 },
  { _lineNumber: 2, _raw: '', timestamp: 't2', level: 'error', msg: 'fail,with,comma' },
]

describe('rowsToCsv', () => {
  it('헤더 + 데이터 행을 CSV로 변환한다', () => {
    const csv = rowsToCsv(rows, ['timestamp', 'level', 'msg'])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('timestamp,level,msg')
    expect(lines[1]).toBe('t1,info,hello')
  })

  it('쉼표 포함 값을 따옴표로 감싼다', () => {
    const csv = rowsToCsv(rows, ['msg'])
    expect(csv).toContain('"fail,with,comma"')
  })
})

describe('rowsToJsonl', () => {
  it('_ 내부 필드를 제외하고 JSONL로 변환한다', () => {
    const jsonl = rowsToJsonl(rows)
    const lines = jsonl.split('\n').filter(Boolean)
    const parsed = JSON.parse(lines[0])
    expect(parsed.timestamp).toBe('t1')
    expect(parsed._lineNumber).toBeUndefined()
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npx vitest run tests/renderer/exporter.test.ts
```

Expected: `FAIL`

- [ ] **Step 3: exporter 구현**

```typescript
// src/renderer/utils/exporter.ts
import type { LogRow } from '../types'

export function rowsToCsv(rows: LogRow[], fields: string[]): string {
  const escape = (val: unknown) => {
    const s = String(val ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const header = fields.join(',')
  const data = rows.map(r => fields.map(f => escape(r[f])).join(','))
  return [header, ...data].join('\n')
}

export function rowsToJsonl(rows: LogRow[]): string {
  return rows
    .map(r => JSON.stringify(
      Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_')))
    ))
    .join('\n')
}

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
npx vitest run tests/renderer/exporter.test.ts
```

Expected: `3 passed`

- [ ] **Step 5: FilterBar에 내보내기 버튼 추가**

```tsx
// FilterBar.tsx props에 추가:
onExportCsv: () => void
onExportJsonl: () => void

// JSX에 버튼 추가:
<button onClick={onExportCsv} style={...}>CSV</button>
<button onClick={onExportJsonl} style={...}>JSONL</button>
```

- [ ] **Step 6: App.tsx에서 내보내기 핸들러 연결**

```typescript
const handleExportCsv = () => {
  if (!activeState) return
  const fields = columns.map(c => c.field)
  downloadBlob(rowsToCsv(activeState.filteredRows, fields), 'export.csv', 'text/csv')
}
const handleExportJsonl = () => {
  if (!activeState) return
  downloadBlob(rowsToJsonl(activeState.filteredRows), 'export.jsonl', 'application/jsonl')
}
```

- [ ] **Step 7: 커밋**

```bash
git add src/renderer/utils/exporter.ts tests/renderer/exporter.test.ts src/renderer/components/FilterBar.tsx src/renderer/App.tsx
git commit -m "feat: add CSV and JSONL export"
```

---

## Task 6: 키보드 단축키

**Files:**
- Create: `src/renderer/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: useKeyboardShortcuts 작성**

```typescript
// src/renderer/hooks/useKeyboardShortcuts.ts
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
      // 텍스트 입력 중이면 j/k/Escape 무시
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
```

- [ ] **Step 2: App.tsx에 단축키 연결**

```typescript
// App.tsx 안에서
const searchInputRef = useRef<HTMLInputElement>(null)

useKeyboardShortcuts({
  onNextRow: () => setSelectedIndex(i => i === null ? 0 : Math.min(i + 1, filteredRows.length - 1)),
  onPrevRow: () => setSelectedIndex(i => i === null ? 0 : Math.max(i - 1, 0)),
  onSearch: () => searchInputRef.current?.focus(),
  onCloseDetail: () => setSelectedIndex(null),
  onOpenFile: handleOpenFile,
})
```

- [ ] **Step 3: FilterBar의 input에 ref 전달**

```tsx
// FilterBar.tsx props에 추가:
inputRef?: React.Ref<HTMLInputElement>

// input에 추가:
<input ref={inputRef} ... />
```

- [ ] **Step 4: 커밋**

```bash
git add src/renderer/hooks/useKeyboardShortcuts.ts src/renderer/components/FilterBar.tsx src/renderer/App.tsx
git commit -m "feat: add keyboard shortcuts (j/k, /, Escape, Ctrl+O)"
```

---

## Task 7: 세션 복원 (TDD)

**Files:**
- Create: `src/renderer/hooks/useSessionRestore.ts`
- Test: `tests/renderer/useSessionRestore.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// tests/renderer/useSessionRestore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { saveSession, loadSession } from '@renderer/hooks/useSessionRestore'

beforeEach(() => localStorage.clear())

describe('session restore', () => {
  it('경로 목록을 저장하고 복원한다', () => {
    saveSession({ openPaths: ['/a.jsonl', '/b.jsonl'], activeIndex: 1 })
    const session = loadSession()
    expect(session?.openPaths).toEqual(['/a.jsonl', '/b.jsonl'])
    expect(session?.activeIndex).toBe(1)
  })

  it('저장된 세션 없으면 null 반환', () => {
    expect(loadSession()).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npx vitest run tests/renderer/useSessionRestore.test.ts
```

Expected: `FAIL`

- [ ] **Step 3: useSessionRestore 구현**

```typescript
// src/renderer/hooks/useSessionRestore.ts
const SESSION_KEY = 'jlv_session'

interface SessionData {
  openPaths: string[]
  activeIndex: number
}

export function saveSession(data: SessionData): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch { /* 무시 */ }
}

export function loadSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
npx vitest run tests/renderer/useSessionRestore.test.ts
```

Expected: `2 passed`

- [ ] **Step 5: App.tsx에 세션 복원 통합**

```typescript
// App.tsx — 마운트 시 복원
useEffect(() => {
  const session = loadSession()
  if (!session) return
  session.openPaths.forEach(path => openTab(path))
  // 파일 로드는 openTab 이후 처리
}, [])

// 탭 변경 시 저장
useEffect(() => {
  saveSession({
    openPaths: tabs.map(t => t.path),
    activeIndex: tabs.findIndex(t => t.id === activeTabId),
  })
}, [tabs, activeTabId])
```

- [ ] **Step 6: 커밋**

```bash
git add src/renderer/hooks/useSessionRestore.ts tests/renderer/useSessionRestore.test.ts src/renderer/App.tsx
git commit -m "feat: add session restore via localStorage"
```

---

## Task 8: ViewSwitcher + 전체 조립

**Files:**
- Create: `src/renderer/components/ViewSwitcher.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: ViewSwitcher 작성**

```tsx
// src/renderer/components/ViewSwitcher.tsx
import React from 'react'

export type ViewMode = 'list' | 'stats' | 'timeline' | 'diff'

interface ViewSwitcherProps {
  current: ViewMode
  onChange: (mode: ViewMode) => void
  hasTwoTabs: boolean
}

const VIEWS: Array<{ id: ViewMode; label: string }> = [
  { id: 'list',     label: '로그' },
  { id: 'stats',    label: '통계' },
  { id: 'timeline', label: '타임라인' },
  { id: 'diff',     label: 'Diff' },
]

export function ViewSwitcher({ current, onChange, hasTwoTabs }: ViewSwitcherProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: 2, padding: '4px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
      {VIEWS.map(v => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          disabled={v.id === 'diff' && !hasTwoTabs}
          style={{
            background: current === v.id ? 'rgba(99,102,241,0.25)' : 'transparent',
            border: 'none',
            borderRadius: 4,
            color: current === v.id ? '#a5b4fc' : '#64748b',
            cursor: v.id === 'diff' && !hasTwoTabs ? 'not-allowed' : 'pointer',
            fontSize: 12,
            padding: '3px 10px',
          }}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: App.tsx에 ViewSwitcher + 모든 뷰 통합**

```tsx
// App.tsx 최종 구조:
const [viewMode, setViewMode] = useState<ViewMode>('list')

// 메인 콘텐츠 영역:
<ViewSwitcher current={viewMode} onChange={setViewMode} hasTwoTabs={tabs.length >= 2} />

{viewMode === 'list' && (
  <>
    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <LogList rows={filteredRows} columns={columns} selectedIndex={selectedIndex} onSelect={...} />
    </div>
    <DetailPanel row={selectedRow} schemas={schemas} onClose={...} />
  </>
)}
{viewMode === 'stats' && <StatsView rows={filteredRows} />}
{viewMode === 'timeline' && <TimelineView rows={filteredRows} />}
{viewMode === 'diff' && tabs.length >= 2 && (
  <DiffView
    leftRows={tabStates.get(tabs[0].id)?.filteredRows ?? []}
    leftLabel={tabs[0].label}
    rightRows={tabStates.get(tabs[1].id)?.filteredRows ?? []}
    rightLabel={tabs[1].label}
  />
)}
```

- [ ] **Step 3: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: 모든 테스트 통과

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat: Phase 4 complete — analytics views, export, shortcuts, session restore"
```

---

## Task 9: 최종 스모크 테스트

- [ ] **앱 기동 후 확인 체크리스트**

  - [ ] 두 탭 열기 → Diff 뷰 버튼 활성화됨
  - [ ] Diff 뷰 → 두 파일 나란히 비교 표시
  - [ ] 통계 뷰 → 레벨별 바 차트 + 필드 분포 표시
  - [ ] 타임라인 뷰 → SVG 히스토그램 표시
  - [ ] CSV 내보내기 → 파일 다운로드됨
  - [ ] JSONL 내보내기 → 필터링된 결과만 포함
  - [ ] j/k 단축키 → 리스트 행 이동
  - [ ] / 단축키 → 검색 인풋 포커스
  - [ ] Ctrl+O → 파일 열기 다이얼로그
  - [ ] 앱 재시작 → 이전에 열었던 파일들이 복원됨

---

## Phase 4 완료 기준 = 풀 기능 완성

- 통계, 타임라인, Diff 뷰가 동작한다
- 필터링된 결과를 CSV/JSONL로 내보낼 수 있다
- 키보드 단축키(j/k, /, Escape, Ctrl+O)가 동작한다
- 앱 재시작 시 이전 세션(열린 파일들)이 복원된다
- 스키마 config.json으로 커스텀 컬럼을 설정할 수 있다
