import React, { useState, useEffect } from 'react'
import type { LogRow, SchemaEntry } from '../types'
import { JsonTree } from './JsonTree'
import { SchemaViewer } from './SchemaViewer'
import { findMatchingSchema } from '../utils/schemaValidator'

interface DetailPanelProps {
  row: LogRow | null
  schemas: SchemaEntry[]
  onClose: () => void
}

export function DetailPanel({ row, schemas, onClose }: DetailPanelProps): React.ReactElement {
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => { setUseFallback(false) }, [row])

  if (!row) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        행을 클릭하면 상세 내용을 볼 수 있습니다
      </div>
    )
  }

  const displayData = Object.fromEntries(
    Object.entries(row).filter(([k]) => !k.startsWith('_'))
  )

  const matchedSchema = !useFallback && !row._parseError
    ? findMatchingSchema(schemas, displayData)
    : null

  const showViewer = !!(matchedSchema?.hasViewer && !useFallback)

  return (
    <div style={{ height: 200, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, opacity: 0.5, flex: 1 }}>
          줄 #{row._lineNumber}
          {matchedSchema && <span style={{ color: '#818cf8', marginLeft: 8 }}>● {matchedSchema.displayName}</span>}
          {row._parseError && <span style={{ color: '#f87171', marginLeft: 8 }}>⚠ {row._parseError}</span>}
        </span>
        {showViewer && (
          <button onClick={() => setUseFallback(true)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11, marginRight: 8 }}>
            JSON 트리로 보기
          </button>
        )}
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {showViewer ? (
          <SchemaViewer row={row} schema={matchedSchema!} onFallback={() => setUseFallback(true)} />
        ) : row._parseError === 'Invalid JSON' ? (
          <pre style={{ padding: 12, margin: 0, color: '#f87171', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: 13, fontFamily: 'monospace' }}>{row._raw}</pre>
        ) : (
          <div style={{ padding: 12, fontSize: 13, fontFamily: 'monospace' }}>
            <JsonTree data={displayData} />
          </div>
        )}
      </div>
    </div>
  )
}
