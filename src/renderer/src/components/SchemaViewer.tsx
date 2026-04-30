import React, { useEffect, useRef, useState } from 'react'
import type { LogRow, SchemaEntry } from '../types'

interface SchemaViewerProps {
  row: LogRow
  schema: SchemaEntry
  onFallback: () => void
}

export function SchemaViewer({ row, schema, onFallback }: SchemaViewerProps): React.ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!schema.viewerPath) { onFallback(); return }

    window.schemaApi.readViewer(schema.viewerPath).then(({ html, error: readError }) => {
      if (readError || !html) { onFallback(); return }

      const iframe = iframeRef.current
      if (!iframe) return

      const onLoad = () => {
        try {
          iframe.contentWindow?.postMessage(
            { type: 'LOG_DATA', payload: Object.fromEntries(
              Object.entries(row).filter(([k]) => !k.startsWith('_'))
            )},
            '*'
          )
        } catch { setError('데이터 주입 실패') }
      }

      iframe.addEventListener('load', onLoad, { once: true })
      iframe.srcdoc = html
    })
  }, [row, schema, onFallback])

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
      {error} — <button onClick={onFallback} style={{ color: '#a5b4fc', background: 'none', border: 'none', cursor: 'pointer' }}>JSON 트리로 보기</button>
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
