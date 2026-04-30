import React, { useState, useCallback, useEffect, useRef } from 'react'
import './styles/app.css'
import type { LogRow, SchemaEntry } from './types'
import { applyFilter, type LogFileState } from './hooks/useLogFile'
import { parseJsonlContent } from './utils/parser'
import { useTabManager } from './hooks/useTabManager'
import { useSchemaRegistry } from './hooks/useSchemaRegistry'
import { FilterBar } from './components/FilterBar'
import { LogList } from './components/LogList'
import { DetailPanel } from './components/DetailPanel'
import { Sidebar } from './components/Sidebar'
import { SchemaManagement } from './components/SchemaManagement'
import { TabBar } from './components/TabBar'
import { ViewSwitcher, type ViewMode } from './components/ViewSwitcher'
import { StatsView } from './components/StatsView'
import { TimelineView } from './components/TimelineView'
import { DiffView } from './components/DiffView'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { saveSession, loadSession } from './hooks/useSessionRestore'
import { rowsToCsv, rowsToJsonl, downloadBlob } from './utils/exporter'

import type { FilterState } from './types'

const INITIAL_FILTER: FilterState = { levels: [], sortOrder: 'asc', msgRegex: '', categoryRegex: '' }

const toggleLevel = (levels: string[], level: string): string[] =>
  levels.includes(level) ? levels.filter(l => l !== level) : [...levels, level]

function makeEmptyState(): LogFileState {
  return {
    path: null,
    rows: [],
    filteredRows: [],
    filter: { ...INITIAL_FILTER },
    isLoading: false,
    error: null,
  }
}

export default function App(): React.ReactElement {
  const { tabs, activeTabId, setActiveTabId, openTab, closeTab } = useTabManager()
  const { schemas, saveSchema, deleteSchema, reorderSchemas, reload: reloadSchemas } = useSchemaRegistry()

  // 탭별 로그 상태
  const [tabStates, setTabStates] = useState<Map<string, LogFileState>>(new Map())
  const [selectedIndexes, setSelectedIndexes] = useState<Map<string, number | null>>(new Map())

  const [newRowTabs, setNewRowTabs] = useState<Map<string, 'error'|'warn'|'info'>>(new Map())
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const msgInputRef = useRef<HTMLInputElement>(null)
  const categoryInputRef = useRef<HTMLInputElement>(null)

  // 새 행들의 최고 레벨 계산 (debug는 null 반환 → 점 표시 안 함)
  const calcDotLevel = (rows: import('./types').LogRow[]): 'error'|'warn'|'info'|null => {
    let level: 'error'|'warn'|'info'|null = null
    for (const r of rows) {
      const lv = String(r.level ?? '').toLowerCase()
      if (lv === 'error') return 'error'
      if (lv === 'warn' || lv === 'warning') level = 'warn'
      else if (lv !== 'debug' && !level) level = 'info'
    }
    return level
  }
  const [showSchemaManagement, setShowSchemaManagement] = useState(false)
  const [editTarget, setEditTarget] = useState<SchemaEntry | undefined>(undefined)
  const [rowMenu, setRowMenu] = useState<{ x: number; y: number; row: LogRow } | null>(null)
  const rowMenuRef = useRef<HTMLDivElement>(null)

  // 현재 활성 탭 상태
  const activeState = activeTabId ? (tabStates.get(activeTabId) ?? makeEmptyState()) : makeEmptyState()
  const selectedIndex = activeTabId ? (selectedIndexes.get(activeTabId) ?? null) : null
  const filteredRows = activeState.filteredRows

  const setSelectedIndex = useCallback((idx: number | null) => {
    if (!activeTabId) return
    setSelectedIndexes(prev => new Map(prev).set(activeTabId, idx))
  }, [activeTabId])

  const selectedRow = selectedIndex !== null ? filteredRows[selectedIndex] ?? null : null

  // 파일 열기
  const handleOpenFile = useCallback(async () => {
    const path = await window.fileApi.openFile()
    if (!path) return
    openTab(path)
  }, [openTab])

  // 세션 복원 (마운트 시 1회)
  useEffect(() => {
    const session = loadSession()
    if (!session) return
    session.openPaths.forEach(p => openTab(p))
  }, [])

  // 세션 저장 (탭 변경 시)
  useEffect(() => {
    const activeIndex = tabs.findIndex(t => t.id === activeTabId)
    saveSession({ openPaths: tabs.map(t => t.path), activeIndex: Math.max(0, activeIndex) })
  }, [tabs, activeTabId])

  // 키보드 단축키
  useKeyboardShortcuts({
    onNextRow: () => setSelectedIndex(selectedIndex === null ? 0 : Math.min(selectedIndex + 1, filteredRows.length - 1)),
    onPrevRow: () => setSelectedIndex(selectedIndex === null ? 0 : Math.max(selectedIndex - 1, 0)),
    onSearchMsg: () => msgInputRef.current?.focus(),
    onSearchCategory: () => categoryInputRef.current?.focus(),
    onClearMsg: () => { setFilter({ ...activeState.filter, msgRegex: '' }); msgInputRef.current?.focus() },
    onClearCategory: () => { setFilter({ ...activeState.filter, categoryRegex: '' }); categoryInputRef.current?.focus() },
    onToggleError: () => setFilter({ ...activeState.filter, levels: toggleLevel(activeState.filter.levels, 'error') }),
    onToggleWarn:  () => setFilter({ ...activeState.filter, levels: toggleLevel(activeState.filter.levels, 'warn') }),
    onToggleInfo:  () => setFilter({ ...activeState.filter, levels: toggleLevel(activeState.filter.levels, 'info') }),
    onToggleDebug: () => setFilter({ ...activeState.filter, levels: toggleLevel(activeState.filter.levels, 'debug') }),
    onToggleSort: () => setFilter({ ...activeState.filter, sortOrder: activeState.filter.sortOrder === 'asc' ? 'desc' : 'asc' }),
    onNextView: () => setViewMode(v => { const V: ViewMode[] = ['list','stats','timeline','diff']; return V[(V.indexOf(v)+1)%V.length] }),
    onPrevView: () => setViewMode(v => { const V: ViewMode[] = ['list','stats','timeline','diff']; return V[(V.indexOf(v)-1+V.length)%V.length] }),
    onNextTab: () => {  // ] → 다음 탭
      const idx = tabs.findIndex(t => t.id === activeTabId)
      const next = tabs[(idx + 1) % tabs.length]
      if (next) setActiveTabId(next.id)
    },
    onPrevTab: () => {  // [ → 이전 탭
      const idx = tabs.findIndex(t => t.id === activeTabId)
      const prev = tabs[(idx - 1 + tabs.length) % tabs.length]
      if (prev) setActiveTabId(prev.id)
    },
    onCloseDetail: () => setSelectedIndex(null),
    onOpenFile: handleOpenFile,
  })

  // 탭이 열릴 때 파일 로드
  useEffect(() => {
    for (const tab of tabs) {
      if (tabStates.has(tab.id)) continue
      // 새 탭 → 로딩 시작
      setTabStates(prev => new Map(prev).set(tab.id, { ...makeEmptyState(), isLoading: true }))
      window.fileApi.readFile(tab.path).then(({ content, error }) => {
        if (error) {
          setTabStates(prev => new Map(prev).set(tab.id, { ...makeEmptyState(), error }))
          return
        }
        const rows = parseJsonlContent(content)
        const filter = { ...INITIAL_FILTER }
        setTabStates(prev => new Map(prev).set(tab.id, {
          path: tab.path,
          rows,
          filteredRows: applyFilter(rows, filter),
          filter,
          isLoading: false,
          error: null,
        }))
      })
      // 실시간 tail 시작
      window.fileApi.watch(tab.path)
    }
  }, [tabs])

  // 탭 닫기
  const handleCloseTab = useCallback(async (id: string) => {
    const tab = tabs.find(t => t.id === id)
    if (tab) await window.fileApi.unwatch(tab.path)
    closeTab(id)
    setTabStates(prev => { const next = new Map(prev); next.delete(id); return next })
    setSelectedIndexes(prev => { const next = new Map(prev); next.delete(id); return next })
    setNewRowTabs(prev => { const next = new Map(prev); next.delete(id); return next })
  }, [tabs, closeTab])

  // 실시간 tail: file:append 이벤트 수신
  useEffect(() => {
    const unsubscribe = window.fileApi.onAppend((path, newContent) => {
      const tab = tabs.find(t => t.path === path)
      if (!tab) return
      const newRows = parseJsonlContent(newContent)
      if (!newRows.length) return
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
      // 비활성 탭에만 발광 점 표시 (debug 제외, 기존보다 높은 레벨로 업데이트)
      if (tab.id !== activeTabId) {
        const incoming = calcDotLevel(newRows)
        if (incoming) {
          setNewRowTabs(prev => {
            const PRIORITY = { error: 3, warn: 2, info: 1 } as const
            const existing = prev.get(tab.id)
            const keep = existing && PRIORITY[existing] >= PRIORITY[incoming] ? existing : incoming
            return new Map(prev).set(tab.id, keep)
          })
        }
      }
    })
    return unsubscribe
  }, [tabs, activeTabId])

  // 필터 변경
  const setFilter = useCallback((filter: typeof INITIAL_FILTER) => {
    if (!activeTabId) return
    setTabStates(prev => {
      const state = prev.get(activeTabId)
      if (!state) return prev
      return new Map(prev).set(activeTabId, {
        ...state,
        filter,
        filteredRows: applyFilter(state.rows, filter),
      })
    })
    setSelectedIndex(null)
  }, [activeTabId, setSelectedIndex])

  // 스키마 캐시 초기화 함수들 (모든 탭에 적용)
  const resetFallbackSchemaIds = useCallback((changedId: string | null) => {
    setTabStates(prev => {
      const next = new Map(prev)
      for (const [id, state] of next) {
        state.rows.forEach(r => {
          if (r._schemaPinned) return
          if (changedId === null) {
            if (r._schemaId === '') r._schemaId = null
          } else {
            if (r._schemaId === changedId || r._schemaId === '') r._schemaId = null
          }
        })
        next.set(id, { ...state })
      }
      return next
    })
  }, [])

  const resetAllSchemaCache = useCallback(() => {
    setTabStates(prev => {
      const next = new Map(prev)
      for (const [id, state] of next) {
        state.rows.forEach(r => { if (!r._schemaPinned) r._schemaId = null })
        next.set(id, { ...state })
      }
      return next
    })
  }, [])

  const forceSchemaRerender = useCallback(() => {
    if (!activeTabId) return
    setTabStates(prev => {
      const state = prev.get(activeTabId)
      if (!state) return prev
      return new Map(prev).set(activeTabId, { ...state })
    })
  }, [activeTabId])

  // 스키마 저장/삭제
  const handleSaveSchema = useCallback(async (id: string, schemaJson: string, displayName: string, viewerHtml: string | null) => {
    const isNew = !schemas.find(s => s.id === id)
    await saveSchema(id, schemaJson, displayName, viewerHtml)
    resetFallbackSchemaIds(isNew ? null : id)
  }, [schemas, saveSchema, resetFallbackSchemaIds])

  const handleDeleteSchema = useCallback(async (id: string) => {
    await deleteSchema(id)
    resetFallbackSchemaIds(id)
  }, [deleteSchema, resetFallbackSchemaIds])

  const handleReorderSchemas = useCallback(async (newOrder: string[]) => {
    await reorderSchemas(newOrder)
    resetAllSchemaCache()
  }, [reorderSchemas, resetAllSchemaCache])

  const handleExportSchemas = useCallback(async () => {
    await window.schemaApi.exportSchemas()
  }, [])

  const handleImportSchemas = useCallback(async () => {
    const result = await window.schemaApi.importSchemas()
    if (result.ok) {
      await reloadSchemas()
      resetAllSchemaCache()
    }
  }, [reloadSchemas, resetAllSchemaCache])

  // 행 우클릭 메뉴
  useEffect(() => {
    if (!rowMenu) return
    const close = (e: MouseEvent) => {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) setRowMenu(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [rowMenu])

  const handleRowContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault()
    const row = filteredRows[index]
    if (row) setRowMenu({ x: e.clientX, y: e.clientY, row })
  }, [filteredRows])

  // CSV/JSONL 내보내기
  const handleExportCsv = useCallback(() => {
    const fields: string[] = [...new Set(filteredRows.flatMap(r => Object.keys(r).filter(k => !k.startsWith('_'))))].sort()
    downloadBlob(rowsToCsv(filteredRows, fields), 'export.csv', 'text/csv')
  }, [filteredRows])

  const handleExportJsonl = useCallback(() => {
    downloadBlob(rowsToJsonl(filteredRows), 'export.jsonl', 'application/x-ndjson')
  }, [filteredRows])

  // Diff 뷰를 위한 두 번째 탭 상태
  const secondTab = tabs.find(t => t.id !== activeTabId)
  const secondState = secondTab ? (tabStates.get(secondTab.id) ?? makeEmptyState()) : makeEmptyState()

  const handleAssignSchema = useCallback((row: LogRow, schemaId: string | null) => {
    row._schemaId = schemaId
    row._schemaPinned = schemaId !== null
    forceSchemaRerender()
    setRowMenu(null)
    const idx = filteredRows.indexOf(row)
    if (idx !== -1) setSelectedIndex(idx)
  }, [filteredRows, forceSchemaRerender, setSelectedIndex])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-raised)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>JsonlLogViewer</span>
        {activeState.isLoading && <span style={{ fontSize: 12, opacity: 0.5 }}>로딩 중...</span>}
        {activeState.error && <span style={{ fontSize: 12, color: '#f87171' }}>오류: {activeState.error}</span>}
        <div style={{ flex: 1 }} />
        {filteredRows.length > 0 && (
          <>
            <button onClick={handleExportCsv} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 11, padding: '2px 8px' }}>
              CSV
            </button>
            <button onClick={handleExportJsonl} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 11, padding: '2px 8px' }}>
              JSONL
            </button>
          </>
        )}
      </div>

      {/* 탭 바 */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        newRowTabs={newRowTabs}
        onSelect={id => {
          setActiveTabId(id)
          setRowMenu(null)
          setNewRowTabs(prev => { const next = new Map(prev); next.delete(id); return next })
        }}
        onClose={handleCloseTab}
        onOpen={handleOpenFile}
      />

      {/* 필터 바 */}
      <FilterBar
        filter={activeState.filter}
        totalCount={activeState.rows.length}
        filteredCount={filteredRows.length}
        onChange={setFilter}
        msgInputRef={msgInputRef}
        categoryInputRef={categoryInputRef}
      />

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          schemas={schemas}
          onOpenSchemaManagement={() => { setEditTarget(undefined); setShowSchemaManagement(true) }}
          onEditSchema={s => { setEditTarget(s); setShowSchemaManagement(true) }}
          onDeleteSchema={handleDeleteSchema}
          onReorder={handleReorderSchemas}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 뷰 전환 */}
          <ViewSwitcher current={viewMode} onChange={setViewMode} hasTwoTabs={tabs.length >= 2} />

          {/* 메인 뷰 */}
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {tabs.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, opacity: 0.4 }}>
                <div style={{ fontSize: 14 }}>열린 파일이 없습니다</div>
                <button onClick={handleOpenFile} style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-2)', borderRadius: 4, color: 'var(--accent-text)', cursor: 'pointer', fontSize: 13, padding: '6px 16px' }}>
                  파일 열기
                </button>
              </div>
            ) : viewMode === 'list' ? (
              <LogList
                rows={filteredRows}
                selectedIndex={selectedIndex}
                onSelect={i => setSelectedIndex(i === selectedIndex ? null : i)}
                onRowContextMenu={handleRowContextMenu}
              />
            ) : viewMode === 'stats' ? (
              <StatsView rows={filteredRows} />
            ) : viewMode === 'timeline' ? (
              <TimelineView rows={filteredRows} />
            ) : viewMode === 'diff' && tabs.length >= 2 ? (
              <DiffView
                leftRows={activeState.filteredRows} leftLabel={tabs.find(t => t.id === activeTabId)?.label ?? ''}
                rightRows={secondState.filteredRows} rightLabel={secondTab?.label ?? ''}
              />
            ) : null}
          </div>
          {viewMode === 'list' && (
            <DetailPanel
              row={selectedRow}
              schemas={schemas}
              onClose={() => setSelectedIndex(null)}
            />
          )}
        </div>
      </div>

      {/* 행 우클릭 — 스키마 지정 */}
      {rowMenu && (
        <div
          ref={rowMenuRef}
          style={{ position: 'fixed', top: rowMenu.y, left: rowMenu.x, background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 0', zIndex: 1000, minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
        >
          <div style={{ padding: '4px 12px 6px', fontSize: 10, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            스키마 지정
          </div>
          {schemas.map(s => {
            const isCurrent = rowMenu.row._schemaId === s.id
            const isPinned = isCurrent && rowMenu.row._schemaPinned
            return (
              <button key={s.id} onClick={() => handleAssignSchema(rowMenu.row, s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none', color: isCurrent ? 'var(--accent-text)' : '#e2e8f0', cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ width: 14, textAlign: 'center', fontSize: 11 }}>{isPinned ? '📌' : isCurrent ? '●' : ''}</span>
                {s.displayName}
              </button>
            )
          })}
          {schemas.length > 0 && <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 2, paddingTop: 2 }} />}
          <button onClick={() => handleAssignSchema(rowMenu.row, null)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ width: 14, textAlign: 'center', fontSize: 11 }}>{!rowMenu.row._schemaPinned && (rowMenu.row._schemaId === null || rowMenu.row._schemaId === '') ? '●' : ''}</span>
            자동 감지 (초기화)
          </button>
        </div>
      )}

      {/* 스키마 관리 모달 */}
      {showSchemaManagement && (
        <SchemaManagement
          schemas={schemas}
          onSave={handleSaveSchema}
          onDelete={handleDeleteSchema}
          onClose={() => { setShowSchemaManagement(false); setEditTarget(undefined) }}
          editTarget={editTarget}
          onExport={handleExportSchemas}
          onImport={handleImportSchemas}
        />
      )}
    </div>
  )
}
