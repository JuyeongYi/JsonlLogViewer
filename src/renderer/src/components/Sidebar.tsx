import React, { useState, useRef, useEffect } from 'react'
import type { SchemaEntry } from '../types'

interface SidebarProps {
  schemas: SchemaEntry[]
  onOpenSchemaManagement: () => void
  onEditSchema: (schema: SchemaEntry) => void
  onDeleteSchema: (id: string) => void
  onReorder: (newOrder: string[]) => void
}

export function Sidebar({ schemas, onOpenSchemaManagement, onEditSchema, onDeleteSchema, onReorder }: SidebarProps): React.ReactElement {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; schema: SchemaEntry } | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [contextMenu])

  const filtered = search
    ? schemas.filter(s => s.displayName.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()))
    : schemas

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null); setDragOverIndex(null); return
    }
    const newOrder = [...schemas.map(s => s.id)]
    const [removed] = newOrder.splice(dragIndex, 1)
    newOrder.splice(index, 0, removed)
    onReorder(newOrder)
    setDragIndex(null); setDragOverIndex(null)
  }

  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null) }

  return (
    <div style={{ width: 180, borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px 6px 12px', gap: 6 }}>
        <span style={{ fontSize: 11, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>스키마</span>
        <button
          onClick={onOpenSchemaManagement}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 11, padding: '2px 8px', flexShrink: 0 }}
        >
          관리
        </button>
      </div>

      {/* 검색 (스키마 3개 이상일 때) */}
      {schemas.length >= 3 && (
        <div style={{ padding: '0 8px 6px' }}>
          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: 11, padding: '3px 6px', outline: 'none' }}
          />
        </div>
      )}

      {/* 스키마 목록 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '4px 12px', fontSize: 12, opacity: 0.3 }}>
            {search ? '검색 결과 없음' : '등록된 스키마 없음'}
          </div>
        ) : filtered.map((s, i) => {
          // 검색 중에는 드래그 비활성
          const draggable = !search
          const globalIndex = schemas.indexOf(s)
          const isOver = dragOverIndex === globalIndex && dragIndex !== globalIndex
          return (
            <div
              key={s.id}
              draggable={draggable}
              onDragStart={draggable ? e => handleDragStart(e, globalIndex) : undefined}
              onDragOver={draggable ? e => handleDragOver(e, globalIndex) : undefined}
              onDrop={draggable ? () => handleDrop(globalIndex) : undefined}
              onDragEnd={draggable ? handleDragEnd : undefined}
              onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, schema: s }) }}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                cursor: draggable ? 'grab' : 'context-menu',
                borderRadius: 4,
                margin: '1px 4px',
                background: isOver ? 'rgba(99,102,241,0.15)' : 'transparent',
                borderTop: isOver ? '2px solid #818cf8' : '2px solid transparent',
                opacity: dragIndex === globalIndex ? 0.4 : 1,
                userSelect: 'none',
              }}
              title="우클릭: 편집/삭제 | 드래그: 순서 변경"
            >
              <div style={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ opacity: 0.3, fontSize: 10 }}>⠿</span>
                {s.displayName}
              </div>
              {s.hasViewer && <div style={{ fontSize: 10, color: '#818cf8', opacity: 0.7, paddingLeft: 14 }}>HTML 뷰어</div>}
            </div>
          )
        })}
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 0', zIndex: 1000, minWidth: 140, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
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
