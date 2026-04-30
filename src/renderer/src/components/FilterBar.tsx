// src/renderer/src/components/FilterBar.tsx
import React from 'react'
import type { FilterState } from '../types'

const LEVELS = ['', 'error', 'warn', 'info', 'debug']

interface FilterBarProps {
  filter: FilterState
  totalCount: number
  filteredCount: number
  onChange: (filter: FilterState) => void
}

export function FilterBar({ filter, totalCount, filteredCount, onChange }: FilterBarProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
        flexShrink: 0,
      }}
    >
      <span style={{ opacity: 0.4, fontSize: 14 }}>🔍</span>
      <input
        type="text"
        placeholder="텍스트 검색..."
        value={filter.text}
        onChange={e => onChange({ ...filter, text: e.target.value })}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#e2e8f0',
          fontSize: 13,
          fontFamily: 'monospace',
        }}
      />
      <select
        value={filter.level}
        onChange={e => onChange({ ...filter, level: e.target.value })}
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4,
          color: '#e2e8f0',
          fontSize: 12,
          padding: '2px 6px',
        }}
      >
        {LEVELS.map(l => (
          <option key={l} value={l}>{l || '전체 레벨'}</option>
        ))}
      </select>
      <span style={{ opacity: 0.4, fontSize: 12, whiteSpace: 'nowrap' }}>
        {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}줄
      </span>
    </div>
  )
}
