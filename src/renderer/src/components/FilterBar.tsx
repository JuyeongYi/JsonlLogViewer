// src/renderer/src/components/FilterBar.tsx
import React, { useState } from 'react'
import type { FilterState } from '../types'

const LEVELS = ['error', 'warn', 'info', 'debug']
const LEVEL_COLORS: Record<string, string> = {
  error: '#f87171', warn: '#fbbf24', info: '#4ade80', debug: '#94a3b8',
}

interface FilterBarProps {
  filter: FilterState
  totalCount: number
  filteredCount: number
  onChange: (filter: FilterState) => void
}

export function FilterBar({ filter, totalCount, filteredCount, onChange }: FilterBarProps): React.ReactElement {
  const [regexError, setRegexError] = useState(false)

  const toggleLevel = (level: string) => {
    const next = filter.levels.includes(level)
      ? filter.levels.filter(l => l !== level)
      : [...filter.levels, level]
    onChange({ ...filter, levels: next })
  }

  const toggleSort = () => {
    onChange({ ...filter, sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc' })
  }

  const handleMsgRegex = (value: string) => {
    try {
      if (value) new RegExp(value)
      setRegexError(false)
    } catch {
      setRegexError(true)
    }
    onChange({ ...filter, msgRegex: value })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }}>
      {/* 상단: 텍스트 검색 + 정렬 + 카운트 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px' }}>
        <span style={{ opacity: 0.4, fontSize: 14 }}>🔍</span>
        <input
          type="text"
          placeholder="텍스트 검색 (_raw 전체)..."
          value={filter.text}
          onChange={e => onChange({ ...filter, text: e.target.value })}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace' }}
        />
        <button
          onClick={toggleSort}
          title="타임스탬프 정렬 방향"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#e2e8f0', cursor: 'pointer', fontSize: 12, padding: '2px 8px', whiteSpace: 'nowrap' }}
        >
          {filter.sortOrder === 'asc' ? '↑ 오름차순' : '↓ 내림차순'}
        </button>
        <span style={{ opacity: 0.4, fontSize: 12, whiteSpace: 'nowrap' }}>
          {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}줄
        </span>
      </div>

      {/* 하단: 레벨 체크박스 + msg 정규식 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px 6px' }}>
        <span style={{ fontSize: 11, opacity: 0.4, whiteSpace: 'nowrap' }}>레벨:</span>
        {LEVELS.map(level => (
          <label
            key={level}
            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}
          >
            <input
              type="checkbox"
              checked={filter.levels.includes(level)}
              onChange={() => toggleLevel(level)}
              style={{ accentColor: LEVEL_COLORS[level], cursor: 'pointer' }}
            />
            <span style={{ color: LEVEL_COLORS[level], fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>
              {level}
            </span>
          </label>
        ))}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <span style={{ fontSize: 11, opacity: 0.4, whiteSpace: 'nowrap' }}>msg 정규식:</span>
          <input
            type="text"
            placeholder="예: error|fail|timeout"
            value={filter.msgRegex}
            onChange={e => handleMsgRegex(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: `1px solid ${regexError ? '#f87171' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 4,
              outline: 'none',
              color: regexError ? '#f87171' : '#e2e8f0',
              fontSize: 12,
              fontFamily: 'monospace',
              padding: '2px 6px',
            }}
          />
          {regexError && <span style={{ fontSize: 11, color: '#f87171' }}>잘못된 정규식</span>}
        </div>
      </div>
    </div>
  )
}
