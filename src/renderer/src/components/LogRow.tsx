import React from 'react'
import type { LogRow as LogRowType } from '../types'

const LEVEL_COLORS: Record<string, string> = {
  error: '#f87171',
  warn: '#fbbf24',
  warning: '#fbbf24',
  info: '#4ade80',
  debug: '#94a3b8',
}

interface LogRowProps {
  row: LogRowType
  isSelected: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

export function LogRow({ row, isSelected, onClick, onContextMenu }: LogRowProps): React.ReactElement {
  const levelColor = LEVEL_COLORS[String(row.level ?? '').toLowerCase()] ?? '#e2e8f0'
  const ts = row.timestamp ? String(row.timestamp) : '—'
  const displayTs = ts.length > 19 ? ts.slice(11, 19) : ts

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 60px 110px 1fr auto',
        gap: 8,
        padding: '3px 12px',
        cursor: 'pointer',
        background: isSelected ? 'var(--accent-dim)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        fontSize: 13,
        fontFamily: 'monospace',
        alignItems: 'center',
      }}
    >
      <span style={{ opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {displayTs}
      </span>
      <span style={{ color: levelColor, fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>
        {String(row.level ?? '—')}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.65, fontSize: 11 }}>
        {row.category != null ? String(row.category) : ''}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {String(row.msg ?? row._raw)}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {row._schemaPinned && (
          <span title="스키마 수동 지정됨" style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>📌</span>
        )}
        {row._parseError && (
          <span title={row._parseError} style={{ color: '#f87171', fontSize: 14 }}>⚠</span>
        )}
      </span>
    </div>
  )
}
