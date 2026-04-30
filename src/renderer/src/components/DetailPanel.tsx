import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  const handleFallback = useCallback(() => setUseFallback(true), [])

  // 드래그 리사이즈
  const [panelHeight, setPanelHeight] = useState(280)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  const onDragStart = (e: React.MouseEvent) => {
    dragRef.current = { startY: e.clientY, startH: panelHeight }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - ev.clientY
      setPanelHeight(Math.max(120, Math.min(window.innerHeight * 0.75, dragRef.current.startH + delta)))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

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

  // 스키마 매칭 (캐시 우선)
  let matchedSchema: SchemaEntry | null = null
  if (!useFallback && !row._parseError) {
    if (row._schemaId === null) {
      // 미검증: 탐색 후 캐시
      const result = findMatchingSchema(schemas, displayData)
      row._schemaId = result?.id ?? ''
      matchedSchema = result
    } else if (row._schemaId === '') {
      // 캐시됨: 매칭 없음
      matchedSchema = null
    } else {
      // 캐시됨: ID로 조회
      matchedSchema = schemas.find(s => s.id === row._schemaId) ?? null
      if (!matchedSchema) {
        // 스키마가 삭제된 경우: 재탐색
        const result = findMatchingSchema(schemas, displayData)
        row._schemaId = result?.id ?? ''
        matchedSchema = result
      }
    }
  }

  const showViewer = !!(matchedSchema?.hasViewer && !useFallback)

  return (
    <div style={{ height: panelHeight, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      {/* 드래그 핸들 */}
      <div
        onMouseDown={onDragStart}
        style={{ height: 4, cursor: 'ns-resize', background: 'transparent', flexShrink: 0, borderTop: '2px solid rgba(255,255,255,0.06)' }}
        title="드래그해서 패널 높이 조절"
      />
      {/* 헤더 */}
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

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {row._parseError === 'Invalid JSON' ? (
          <pre style={{ flex: 1, padding: 12, margin: 0, color: '#f87171', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: 13, fontFamily: 'monospace', overflow: 'auto' }}>
            {row._raw}
          </pre>
        ) : showViewer ? (
          // 스키마 매칭: 좌측 iframe 뷰어 + 우측 JSON 트리
          <>
            <div style={{ flex: 1, overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
              <SchemaViewer row={row} schema={matchedSchema!} onFallback={handleFallback} />
            </div>
            <div style={{ width: 280, overflow: 'auto', padding: 10, fontSize: 12, fontFamily: 'monospace', flexShrink: 0 }}>
              <JsonTree data={displayData} />
            </div>
          </>
        ) : (
          // 폴백: JSON 트리만
          <div style={{ flex: 1, overflow: 'auto', padding: 12, fontSize: 13, fontFamily: 'monospace' }}>
            <JsonTree data={displayData} />
          </div>
        )}
      </div>
    </div>
  )
}
