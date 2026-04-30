// src/renderer/src/App.tsx
import React, { useState } from 'react'
import './styles/app.css'
import { useLogFile } from './hooks/useLogFile'
import { FilterBar } from './components/FilterBar'
import { LogList } from './components/LogList'
import { DetailPanel } from './components/DetailPanel'

export default function App(): React.ReactElement {
  const { path, rows, filteredRows, filter, isLoading, error, openFile, setFilter } = useLogFile()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const selectedRow = selectedIndex !== null ? filteredRows[selectedIndex] ?? null : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 툴바 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: '#16162a',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, color: '#818cf8' }}>JsonlLogViewer</span>
        <button
          onClick={openFile}
          disabled={isLoading}
          style={{
            background: 'rgba(99,102,241,0.2)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: 4,
            color: '#a5b4fc',
            cursor: 'pointer',
            fontSize: 12,
            padding: '3px 10px',
          }}
        >
          {isLoading ? '로딩 중...' : '파일 열기'}
        </button>
        {path && (
          <span style={{ fontSize: 12, opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {path}
          </span>
        )}
        {error && (
          <span style={{ fontSize: 12, color: '#f87171' }}>오류: {error}</span>
        )}
      </div>

      {/* 필터 바 */}
      <FilterBar
        filter={filter}
        totalCount={rows.length}
        filteredCount={filteredRows.length}
        onChange={newFilter => {
          setFilter(newFilter)
          setSelectedIndex(null)
        }}
      />

      {/* 리스트 뷰 */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <LogList
          rows={filteredRows}
          selectedIndex={selectedIndex}
          onSelect={i => setSelectedIndex(i === selectedIndex ? null : i)}
        />
      </div>

      {/* 디테일 패널 */}
      <DetailPanel
        row={selectedRow}
        onClose={() => setSelectedIndex(null)}
      />
    </div>
  )
}
