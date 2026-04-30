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

  // 드래그 중 iframe 이벤트 가로채기 방지용 오버레이
  const [dragCursor, setDragCursor] = useState<'ns-resize' | 'ew-resize' | null>(null)

  function startDrag(
    cursor: 'ns-resize' | 'ew-resize',
    onMove: (ev: MouseEvent) => void,
    onDone: () => void
  ) {
    setDragCursor(cursor)
    const handleMove = (ev: MouseEvent) => onMove(ev)
    const handleUp = () => {
      setDragCursor(null)
      onDone()
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  // 세로 드래그 (패널 높이)
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem('detailPanelHeight')
    return saved ? parseInt(saved, 10) : Math.floor(window.innerHeight / 2)
  })
  const vDragRef = useRef<{ startY: number; startH: number } | null>(null)

  const onVDragStart = (e: React.MouseEvent) => {
    vDragRef.current = { startY: e.clientY, startH: panelHeight }
    startDrag(
      'ns-resize',
      (ev) => {
        if (!vDragRef.current) return
        const next = Math.max(120, Math.min(window.innerHeight * 0.75, vDragRef.current.startH + (vDragRef.current.startY - ev.clientY)))
        setPanelHeight(next)
        localStorage.setItem('detailPanelHeight', String(next))
      },
      () => { vDragRef.current = null }
    )
  }

  // 가로 드래그 (뷰어|JSON 트리 너비)
  const [jsonTreeWidth, setJsonTreeWidth] = useState(() => {
    const saved = localStorage.getItem('jsonTreeWidth')
    return saved ? parseInt(saved, 10) : 280
  })
  const hDragRef = useRef<{ startX: number; startW: number } | null>(null)

  const onHDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    hDragRef.current = { startX: e.clientX, startW: jsonTreeWidth }
    startDrag(
      'ew-resize',
      (ev) => {
        if (!hDragRef.current) return
        const next = Math.max(100, Math.min(600, hDragRef.current.startW + (hDragRef.current.startX - ev.clientX)))
        setJsonTreeWidth(next)
        localStorage.setItem('jsonTreeWidth', String(next))
      },
      () => { hDragRef.current = null }
    )
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

  // 스키마 탐색 — useFallback과 무관하게 항상 수행 (캐시 우선)
  let matchedSchema: SchemaEntry | null = null
  if (!row._parseError) {
    if (row._schemaId === null) {
      const result = findMatchingSchema(schemas, displayData)
      row._schemaId = result?.id ?? ''
      matchedSchema = result
    } else if (row._schemaId !== '') {
      matchedSchema = schemas.find(s => s.id === row._schemaId) ?? null
      if (!matchedSchema) {
        // 스키마 삭제된 경우: 재탐색
        const result = findMatchingSchema(schemas, displayData)
        row._schemaId = result?.id ?? ''
        matchedSchema = result
      }
    }
  }

  // useFallback은 렌더링 모드만 제어 — 스키마 탐색 결과와 분리
  const showViewer = !!(matchedSchema?.hasViewer && !useFallback)

  return (
    <>
    {/* 드래그 중 iframe 이벤트 차단 오버레이 */}
    {dragCursor && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        cursor: dragCursor,
        // 투명하지만 포인터 이벤트는 받음 → iframe이 이벤트를 가로채지 못함
      }} />
    )}
    <div style={{ height: panelHeight, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      {/* 드래그 핸들 (세로) */}
      <div
        onMouseDown={onVDragStart}
        style={{ height: 5, cursor: 'ns-resize', background: 'var(--border-2)', flexShrink: 0 }}
        title="드래그해서 패널 높이 조절"
      />
      {/* 헤더: 타임스탬프 레벨 카테고리 메시지 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, gap: 8, minWidth: 0 }}>
        {/* 타임스탬프 */}
        {row.timestamp && (
          <span style={{ fontSize: 11, opacity: 0.5, flexShrink: 0, fontFamily: 'monospace' }}>
            {(() => { const ts = String(row.timestamp); return ts.length > 19 ? ts.slice(11, 19) : ts })()}
          </span>
        )}
        {/* 레벨 */}
        {row.level && (
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0,
            color: ({ error: '#f87171', warn: '#fbbf24', warning: '#fbbf24', info: '#4ade80', debug: '#94a3b8' } as Record<string,string>)[String(row.level).toLowerCase()] ?? 'var(--text-2)'
          }}>
            {String(row.level)}
          </span>
        )}
        {/* 카테고리 */}
        {row.category != null && (
          <span style={{ fontSize: 11, opacity: 0.5, flexShrink: 0 }}>{String(row.category)}</span>
        )}
        {/* 메시지 */}
        <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {String(row.msg ?? row._raw)}
        </span>
        {/* 스키마 / 에러 뱃지 */}
        {matchedSchema && <span style={{ fontSize: 10, color: 'var(--accent)', flexShrink: 0 }}>● {matchedSchema.displayName}</span>}
        {row._parseError && <span style={{ fontSize: 10, color: '#f87171', flexShrink: 0 }}>⚠ {row._parseError}</span>}
        {/* 뷰어 전환 + 닫기 */}
        {matchedSchema?.hasViewer && (
          <button onClick={() => setUseFallback(f => !f)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}>
            {useFallback ? '↩ 뷰어' : 'JSON 트리'}
          </button>
        )}
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: '0 4px', flexShrink: 0 }}>✕</button>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {row._parseError === 'Invalid JSON' ? (
          <pre style={{ flex: 1, padding: 12, margin: 0, color: '#f87171', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: 13, fontFamily: 'monospace', overflow: 'auto' }}>
            {row._raw}
          </pre>
        ) : showViewer ? (
          // 스키마 매칭: 좌측 iframe 뷰어 + 드래그 구분선 + 우측 JSON 트리
          <>
            <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
              <SchemaViewer row={row} schema={matchedSchema!} onFallback={handleFallback} />
            </div>
            {/* 가로 드래그 핸들 */}
            <div
              onMouseDown={onHDragStart}
              style={{ width: 5, cursor: 'ew-resize', flexShrink: 0, background: 'var(--border-2)' }}
            />
            <div style={{ width: jsonTreeWidth, overflow: 'auto', padding: 10, fontSize: 12, fontFamily: 'monospace', flexShrink: 0 }}>
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
    </>
  )
}
