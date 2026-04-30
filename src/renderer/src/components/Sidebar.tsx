import React, { useState, useRef, useEffect } from 'react'
import type { SchemaEntry } from '../types'

interface SidebarProps {
  schemas: SchemaEntry[]
  onOpenSchemaManagement: () => void
  onEditSchema: (schema: SchemaEntry) => void
  onDeleteSchema: (id: string) => void
}

export function Sidebar({ schemas, onOpenSchemaManagement, onEditSchema, onDeleteSchema }: SidebarProps): React.ReactElement {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; schema: SchemaEntry } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [contextMenu])

  return (
    <div style={{ width: 180, borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
      <div style={{ padding: '10px 12px', fontSize: 11, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>스키마</div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {schemas.length === 0 ? (
          <div style={{ padding: '4px 12px', fontSize: 12, opacity: 0.3 }}>등록된 스키마 없음</div>
        ) : schemas.map(s => (
          <div
            key={s.id}
            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, schema: s }) }}
            style={{ padding: '4px 12px', fontSize: 12, cursor: 'context-menu', borderRadius: 4, margin: '1px 4px' }}
            title="우클릭으로 편집/삭제"
          >
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

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#1e1e2e',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '4px 0',
            zIndex: 1000,
            minWidth: 140,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ padding: '4px 12px', fontSize: 11, opacity: 0.4, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 2 }}>
            {contextMenu.schema.displayName}
          </div>
          <button
            onClick={() => { onEditSchema(contextMenu.schema); setContextMenu(null) }}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            ✏️ 편집
          </button>
          <button
            onClick={() => { onDeleteSchema(contextMenu.schema.id); setContextMenu(null) }}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            🗑 삭제
          </button>
        </div>
      )}
    </div>
  )
}
