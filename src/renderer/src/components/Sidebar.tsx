import React from 'react'
import type { SchemaEntry } from '../types'

interface SidebarProps {
  schemas: SchemaEntry[]
  onOpenSchemaManagement: () => void
}

export function Sidebar({ schemas, onOpenSchemaManagement }: SidebarProps): React.ReactElement {
  return (
    <div style={{ width: 180, borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ padding: '10px 12px', fontSize: 11, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>스키마</div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {schemas.length === 0 ? (
          <div style={{ padding: '4px 12px', fontSize: 12, opacity: 0.3 }}>등록된 스키마 없음</div>
        ) : schemas.map(s => (
          <div key={s.id} style={{ padding: '4px 12px', fontSize: 12 }}>
            <div style={{ opacity: 0.8 }}>{s.displayName}</div>
            {s.hasViewer && <div style={{ fontSize: 10, color: '#818cf8', opacity: 0.7 }}>HTML 뷰어</div>}
          </div>
        ))}
      </div>
      <button
        onClick={onOpenSchemaManagement}
        style={{ margin: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: '5px 0' }}
      >
        + 스키마 관리
      </button>
    </div>
  )
}
