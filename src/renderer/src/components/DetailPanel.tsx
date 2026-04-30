// src/renderer/src/components/DetailPanel.tsx
import React from 'react'
import type { LogRow } from '../types'
import { JsonTree } from './JsonTree'

interface DetailPanelProps {
  row: LogRow | null
  onClose: () => void
}

export function DetailPanel({ row, onClose }: DetailPanelProps): React.ReactElement {
  if (!row) {
    return (
      <div
        style={{
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.4,
          fontSize: 13,
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        행을 클릭하면 상세 내용을 볼 수 있습니다
      </div>
    )
  }

  const displayData = Object.fromEntries(
    Object.entries(row).filter(([k]) => !k.startsWith('_'))
  )

  return (
    <div
      style={{
        height: 200,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 12px',
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, opacity: 0.5, flex: 1 }}>
          줄 #{row._lineNumber}
          {row._parseError && (
            <span style={{ color: '#f87171', marginLeft: 8 }}>⚠ {row._parseError}</span>
          )}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 4px',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12, fontSize: 13, fontFamily: 'monospace' }}>
        {row._parseError === 'Invalid JSON' ? (
          <pre style={{ margin: 0, color: '#f87171', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
            {row._raw}
          </pre>
        ) : (
          <JsonTree data={displayData} />
        )}
      </div>
    </div>
  )
}
