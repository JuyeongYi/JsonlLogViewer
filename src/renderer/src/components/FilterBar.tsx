import React, { useState, useEffect, useRef } from 'react'
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
  const [localRegex, setLocalRegex] = useState(filter.msgRegex)
  const [regexError, setRegexError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state if parent resets filter externally
  useEffect(() => {
    setLocalRegex(filter.msgRegex)
  }, [filter.msgRegex])

  const handleMsgRegex = (value: string) => {
    setLocalRegex(value)

    let valid = true
    try { if (value) new RegExp(value) } catch { valid = false }
    setRegexError(!valid)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (valid) onChange({ ...filter, msgRegex: value })
    }, 500)
  }

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const toggleLevel = (level: string) => {
    const next = filter.levels.includes(level)
      ? filter.levels.filter(l => l !== level)
      : [...filter.levels, level]
    onChange({ ...filter, levels: next })
  }

  const toggleSort = () => {
    onChange({ ...filter, sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc' })
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '5px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.03)',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      {/* 시간 정렬 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 11, opacity: 0.4 }}>시간:</span>
        <button
          onClick={toggleSort}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 4,
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px 8px',
          }}
        >
          {filter.sortOrder === 'asc' ? '↑ 오름차순' : '↓ 내림차순'}
        </button>
      </div>

      {/* 레벨 체크박스 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, opacity: 0.4, whiteSpace: 'nowrap' }}>레벨:</span>
        {LEVELS.map(level => (
          <label key={level} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
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
      </div>

      {/* msg 정규식 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 160 }}>
        <span style={{ fontSize: 11, opacity: 0.4, whiteSpace: 'nowrap' }}>msg 정규식:</span>
        <input
          type="text"
          placeholder="예: error|fail|timeout"
          value={localRegex}
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
        {regexError && <span style={{ fontSize: 11, color: '#f87171', whiteSpace: 'nowrap' }}>잘못된 정규식</span>}
      </div>

      {/* 카운트 */}
      <span style={{ opacity: 0.4, fontSize: 12, whiteSpace: 'nowrap' }}>
        {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}줄
      </span>
    </div>
  )
}
