import React, { useState, useEffect, useRef } from 'react'
import './styles/app.css'
import { useLogFile } from './hooks/useLogFile'
import { useSchemaRegistry } from './hooks/useSchemaRegistry'
import { FilterBar } from './components/FilterBar'
import { LogList } from './components/LogList'
import { DetailPanel } from './components/DetailPanel'
import { Sidebar } from './components/Sidebar'
import { SchemaManagement } from './components/SchemaManagement'

export default function App(): React.ReactElement {
  const { path, rows, filteredRows, filter, isLoading, error, openFile, setFilter, resetFallbackSchemaIds } = useLogFile()
  const { schemas, saveSchema, deleteSchema } = useSchemaRegistry()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showSchemaManagement, setShowSchemaManagement] = useState(false)
  const [editTarget, setEditTarget] = useState<import('./types').SchemaEntry | undefined>(undefined)

  // 스키마가 추가됐을 때만 fallback 행들 재탐색 초기화
  const prevSchemaCountRef = useRef(schemas.length)
  useEffect(() => {
    if (schemas.length > prevSchemaCountRef.current) {
      resetFallbackSchemaIds()
    }
    prevSchemaCountRef.current = schemas.length
  }, [schemas.length, resetFallbackSchemaIds])

  const selectedRow = selectedIndex !== null ? filteredRows[selectedIndex] ?? null : null

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
          onDeleteSchema={deleteSchema}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <LogList
              rows={filteredRows}
              selectedIndex={selectedIndex}
              onSelect={i => setSelectedIndex(i === selectedIndex ? null : i)}
            />
          </div>
          <DetailPanel
            row={selectedRow}
            schemas={schemas}
            onClose={() => setSelectedIndex(null)}
          />
        </div>
      </div>

      {/* 스키마 관리 모달 */}
      {showSchemaManagement && (
        <SchemaManagement
          schemas={schemas}
          onSave={saveSchema}
          onDelete={deleteSchema}
          onClose={() => { setShowSchemaManagement(false); setEditTarget(undefined) }}
          editTarget={editTarget}
        />
      )}
    </div>
  )
}
