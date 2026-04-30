import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { LogRow, SchemaEntry } from './types'
import './styles/app.css'
import { useLogFile } from './hooks/useLogFile'
import { useSchemaRegistry } from './hooks/useSchemaRegistry'
import { FilterBar } from './components/FilterBar'
import { LogList } from './components/LogList'
import { DetailPanel } from './components/DetailPanel'
import { Sidebar } from './components/Sidebar'
import { SchemaManagement } from './components/SchemaManagement'

export default function App(): React.ReactElement {
  const { path, rows, filteredRows, filter, isLoading, error, openFile, setFilter, resetFallbackSchemaIds, resetAllSchemaCache, forceSchemaRerender } = useLogFile()
  const { schemas, saveSchema, deleteSchema, reorderSchemas, reload: reloadSchemas } = useSchemaRegistry()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showSchemaManagement, setShowSchemaManagement] = useState(false)
  const [editTarget, setEditTarget] = useState<import('./types').SchemaEntry | undefined>(undefined)

  // 스키마가 추가됐을 때만 fallback 행들 재탐색 초기화
  // 스키마 저장: 신규 추가면 fallback 초기화, 수정이면 해당 ID 매칭 행 초기화
  const handleSaveSchema = useCallback(async (
    id: string, schemaJson: string, displayName: string, viewerHtml: string | null
  ) => {
    const isNew = !schemas.find(s => s.id === id)
    await saveSchema(id, schemaJson, displayName, viewerHtml)
    resetFallbackSchemaIds(isNew ? null : id)
  }, [schemas, saveSchema, resetFallbackSchemaIds])

  // 스키마 삭제: 해당 ID 매칭 행 초기화
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

  const selectedRow = selectedIndex !== null ? filteredRows[selectedIndex] ?? null : null

  // 로그 행 우클릭 메뉴
  const [rowMenu, setRowMenu] = useState<{ x: number; y: number; row: LogRow } | null>(null)
  const rowMenuRef = useRef<HTMLDivElement>(null)

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

  const handleAssignSchema = useCallback((row: LogRow, schemaId: string | null) => {
    row._schemaId = schemaId
    row._schemaPinned = schemaId !== null
    forceSchemaRerender()
    setRowMenu(null)
    // 해당 행이 선택 중이 아니면 선택해서 디테일 패널에 반영
    const idx = filteredRows.indexOf(row)
    if (idx !== -1) setSelectedIndex(idx)
  }, [filteredRows, forceSchemaRerender])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#16162a', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#818cf8' }}>JsonlLogViewer</span>
        <button
          onClick={openFile}
          disabled={isLoading}
          style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 4, color: '#a5b4fc', cursor: 'pointer', fontSize: 12, padding: '3px 10px' }}
        >
          {isLoading ? '로딩 중...' : '파일 열기'}
        </button>
        {path && <span style={{ fontSize: 12, opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>}
        {error && <span style={{ fontSize: 12, color: '#f87171' }}>오류: {error}</span>}
      </div>

      {/* 필터 바 */}
      <FilterBar
        filter={filter}
        totalCount={rows.length}
        filteredCount={filteredRows.length}
        onChange={newFilter => { setFilter(newFilter); setSelectedIndex(null) }}
      />

      {/* 메인 영역: Sidebar + 리스트 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          schemas={schemas}
          onOpenSchemaManagement={() => { setEditTarget(undefined); setShowSchemaManagement(true) }}
          onEditSchema={s => { setEditTarget(s); setShowSchemaManagement(true) }}
          onDeleteSchema={handleDeleteSchema}
          onReorder={handleReorderSchemas}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <LogList
              rows={filteredRows}
              selectedIndex={selectedIndex}
              onSelect={i => setSelectedIndex(i === selectedIndex ? null : i)}
              onRowContextMenu={handleRowContextMenu}
            />
          </div>
          <DetailPanel
            row={selectedRow}
            schemas={schemas}
            onClose={() => setSelectedIndex(null)}
          />
        </div>
      </div>

      {/* 로그 행 우클릭 — 스키마 지정 메뉴 */}
      {rowMenu && (
        <div
          ref={rowMenuRef}
          style={{
            position: 'fixed',
            top: rowMenu.y,
            left: rowMenu.x,
            background: '#1e1e2e',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '4px 0',
            zIndex: 1000,
            minWidth: 180,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ padding: '4px 12px 6px', fontSize: 10, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            스키마 지정
          </div>

          {schemas.map(s => {
            const isCurrent = rowMenu.row._schemaId === s.id
            const isPinned = isCurrent && rowMenu.row._schemaPinned
            return (
              <button
                key={s.id}
                onClick={() => handleAssignSchema(rowMenu.row, s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none', color: isCurrent ? '#a5b4fc' : '#e2e8f0', cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ width: 14, textAlign: 'center', fontSize: 11 }}>
                  {isPinned ? '📌' : isCurrent ? '●' : ''}
                </span>
                {s.displayName}
              </button>
            )
          })}

          {schemas.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 2, paddingTop: 2 }} />
          )}

          <button
            onClick={() => handleAssignSchema(rowMenu.row, null)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ width: 14, textAlign: 'center', fontSize: 11 }}>
              {!rowMenu.row._schemaPinned && (rowMenu.row._schemaId === null || rowMenu.row._schemaId === '') ? '●' : ''}
            </span>
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
