import React, { useEffect, useRef, useState } from 'react'
import type { LogRow, SchemaEntry } from '../types'
import { getViewerHtml } from '../utils/viewerCache'

interface SchemaViewerProps {
  row: LogRow
  schema: SchemaEntry
  onFallback: () => void
}

export function SchemaViewer({ row, schema, onFallback }: SchemaViewerProps): React.ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState<string | null>(null)
  // onFallback은 매 렌더마다 바뀔 수 있으므로 ref로 최신 값 유지
  const onFallbackRef = useRef(onFallback)
  useEffect(() => { onFallbackRef.current = onFallback }, [onFallback])

  useEffect(() => {
    let cancelled = false

    getViewerHtml(schema).then(html => {
      if (cancelled) return
      if (!html) { onFallbackRef.current(); return }

      const iframe = iframeRef.current
      if (!iframe) return

      const onLoad = () => {
        if (cancelled) return
        try {
          const payload = Object.fromEntries(
            Object.entries(row).filter(([k]) => !k.startsWith('_'))
          )
          iframe.contentWindow?.postMessage({ type: 'LOG_DATA', payload }, '*')
        } catch {
          setError('데이터 주입 실패')
        }
      }

      iframe.addEventListener('load', onLoad, { once: true })
      iframe.srcdoc = html
    })

    return () => { cancelled = true }
  }, [row, schema]) // onFallback 제외 — ref로 항상 최신값 사용

  // 뷰어 → 앱 메시지 수신 (Phase 3에서 확장)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return
      console.debug('[SchemaViewer] message from viewer:', e.data)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (error) return (
    <div style={{ padding: 12, color: '#f87171', fontSize: 13 }}>
      {error} — <button onClick={() => onFallbackRef.current()} style={{ color: '#a5b4fc', background: 'none', border: 'none', cursor: 'pointer' }}>JSON 트리로 보기</button>
    </div>
  )

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts"
      style={{ width: '100%', height: '100%', border: 'none', background: '#0f0f1a' }}
      title={`${schema.displayName} viewer`}
    />
  )
}
